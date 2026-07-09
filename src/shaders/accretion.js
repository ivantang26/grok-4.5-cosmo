/** Vertex + fragment shaders for the black hole accretion disk */

export const accretionVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const accretionFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uInnerColor;
  uniform vec3 uMidColor;
  uniform vec3 uOuterColor;
  uniform vec3 uCameraPos;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // vUv.x = angle fraction (0–1), vUv.y = radial fraction (inner→outer)
    float angle = vUv.x * 6.28318530718;
    float r = vUv.y; // 0 at inner edge, 1 at outer edge

    // Soft annular falloff at both edges
    float inner = smoothstep(0.0, 0.08, r);
    float outer = 1.0 - smoothstep(0.82, 1.0, r);
    float ring = inner * outer;

    // Spiral arms in the disk
    float spiral = sin(angle * 3.0 - r * 14.0 + uTime * 1.8);
    spiral = spiral * 0.5 + 0.5;

    // Turbulent flow
    float flow = fbm(vec2(angle * 1.5 + uTime * 0.6, r * 6.0 - uTime * 0.9));
    float hot = fbm(vec2(angle * 4.0 - uTime * 2.2, r * 10.0));

    // Doppler-ish gradient: blueshift approaching side, redshift receding
    float side = sin(angle + uTime * 0.15);
    vec3 col = mix(uInnerColor, uMidColor, smoothstep(0.0, 0.45, r));
    col = mix(col, uOuterColor, smoothstep(0.4, 0.95, r));
    col = mix(col, uInnerColor, (1.0 - r) * hot * 0.55);
    col = mix(col, vec3(0.55, 0.75, 1.0), max(0.0, side) * 0.35 * (1.0 - r));
    col = mix(col, vec3(1.0, 0.35, 0.15), max(0.0, -side) * 0.4 * (1.0 - r));

    // Brightness
    float brightness = ring * (0.45 + 0.55 * spiral) * (0.6 + 0.8 * flow);
    brightness *= 0.7 + 0.9 * hot;
    brightness *= uIntensity;

    // Soft photon-ring boost near ISCO (inner edge)
    float photon = exp(-pow((r - 0.06) * 18.0, 2.0)) * 1.6;
    brightness += photon * ring;

    // Edge falloff for soft blend
    float alpha = brightness * ring;
    alpha = clamp(alpha, 0.0, 1.0);

    // Fresnel glow toward camera
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fres = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.5);
    col += vec3(1.0, 0.85, 0.6) * fres * 0.35 * ring;

    gl_FragColor = vec4(col * brightness * 1.4, alpha);
  }
`;
