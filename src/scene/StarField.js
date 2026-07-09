import * as THREE from 'three';
import { starVertex, starFragment } from '../shaders/stars.js';

/**
 * Deep-space star field with color temperature variation and twinkle.
 */
export class StarField {
  constructor({ count = 8000, radius = 900 } = {}) {
    this.count = count;
    this.radius = radius;
    this.material = null;
    this.points = null;
    this.group = new THREE.Group();
    this.group.name = 'StarField';

    this._build();
  }

  _build() {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const twinkles = new Float32Array(this.count);

    // Approximate stellar color temperatures
    const palette = [
      new THREE.Color(0.6, 0.72, 1.0),   // blue O/B
      new THREE.Color(0.75, 0.85, 1.0),  // blue-white A
      new THREE.Color(1.0, 1.0, 0.95),   // white F
      new THREE.Color(1.0, 0.95, 0.8),   // yellow G
      new THREE.Color(1.0, 0.82, 0.55),  // orange K
      new THREE.Color(1.0, 0.65, 0.45),  // red M
    ];

    for (let i = 0; i < this.count; i++) {
      // Uniform-ish sphere shell distribution
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = this.radius * (0.35 + Math.pow(Math.random(), 0.4) * 0.65);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.55 + Math.random() * 0.45;
      colors[i * 3] = c.r * brightness;
      colors[i * 3 + 1] = c.g * brightness;
      colors[i * 3 + 2] = c.b * brightness;

      // Rare bright stars
      const isBright = Math.random() > 0.97;
      sizes[i] = isBright
        ? 2.5 + Math.random() * 3.5
        : 0.4 + Math.random() * 1.4;
      twinkles[i] = 0.5 + Math.random() * 3.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.group.add(this.points);
  }

  update(time) {
    if (this.material) {
      this.material.uniforms.uTime.value = time;
    }
  }

  setPixelRatio(pr) {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = Math.min(pr, 2);
    }
  }
}
