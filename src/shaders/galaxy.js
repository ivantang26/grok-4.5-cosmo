export const galaxyVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aArm;

  varying vec3 vColor;
  varying float vAlpha;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uRotation;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;

    // Differential rotation: inner arms spin faster
    float omega = uRotation * (1.0 / (0.35 + aRadius * 0.012));
    float ang = aAngle + omega * uTime * (0.85 + aArm * 0.08);

    float x = cos(ang) * aRadius;
    float z = sin(ang) * aRadius;
    float y = position.y + sin(ang * 2.0 + aRadius * 0.05) * 0.8;

    vec3 pos = vec3(x, y, z);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = aSize * uPixelRatio * (220.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.4, 12.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const galaxyFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = exp(-d * d * 10.0);
    gl_FragColor = vec4(vColor, soft * vAlpha);
  }
`;
