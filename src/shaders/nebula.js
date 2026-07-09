export const nebulaVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const nebulaFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSeed;

  varying vec2 vUv;
  varying float vDist;

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
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float r = length(uv) * 2.0;
    float mask = 1.0 - smoothstep(0.2, 1.0, r);

    float n = fbm(uv * 3.5 + uSeed + uTime * 0.02);
    float n2 = fbm(uv * 6.0 - uTime * 0.015 + uSeed * 2.1);

    vec3 col = mix(uColorA, uColorB, n);
    col += vec3(0.15, 0.1, 0.25) * n2 * 0.4;

    float alpha = mask * (0.25 + 0.75 * n) * uOpacity;
    alpha *= smoothstep(1.0, 0.35, r);

    // Distance fade so distant clouds stay soft
    alpha *= clamp(180.0 / vDist, 0.35, 1.0);

    gl_FragColor = vec4(col, alpha);
  }
`;
