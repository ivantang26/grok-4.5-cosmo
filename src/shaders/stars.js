export const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aTwinkle;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vTwinkle;

  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vTwinkle = aTwinkle;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.75 + 0.25 * sin(uTime * aTwinkle + position.x * 0.01);
    gl_PointSize = aSize * uPixelRatio * tw * (280.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 28.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float core = exp(-d * d * 28.0);
    float halo = exp(-d * d * 6.0) * 0.35;
    float alpha = core + halo;
    vec3 col = vColor * (0.85 + 0.25 * core);

    gl_FragColor = vec4(col, alpha);
  }
`;
