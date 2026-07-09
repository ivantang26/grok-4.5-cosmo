import * as THREE from 'three';
import { galaxyVertex, galaxyFragment } from '../shaders/galaxy.js';

/**
 * Spiral galaxy particle system with differential rotation.
 */
export class Galaxy {
  constructor({ count = 28000, arms = 4, radius = 160 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Galaxy';
    this.count = count;
    this.arms = arms;
    this.radius = radius;
    this.material = null;
    this.points = null;

    this._build();
  }

  _build() {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const alphas = new Float32Array(this.count);
    const angles = new Float32Array(this.count);
    const radii = new Float32Array(this.count);
    const armIds = new Float32Array(this.count);

    const coreColor = new THREE.Color(1.0, 0.92, 0.75);
    const armColor = new THREE.Color(0.55, 0.72, 1.0);
    const dustColor = new THREE.Color(0.95, 0.45, 0.55);
    const blueColor = new THREE.Color(0.4, 0.65, 1.0);
    const tmp = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const arm = i % this.arms;
      // Power distribution denser near center
      const t = Math.pow(Math.random(), 0.55);
      const r = t * this.radius;

      // Logarithmic spiral
      const spiralTightness = 0.32;
      const armOffset = (arm / this.arms) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * (1.2 + r * 0.018);
      const angle = armOffset + r * spiralTightness + spread;

      // Vertical thickness (thinner arms, thicker bulge)
      const bulge = Math.exp(-r * r / (this.radius * this.radius * 0.08));
      const thickness = 2.5 + bulge * 14 + (1 - bulge) * 3;
      const y = (Math.random() - 0.5) * thickness * (0.3 + Math.random() * 0.7);

      // Store base angle/radius for GPU rotation; position.y used for height
      positions[i * 3] = 0;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;

      angles[i] = angle;
      radii[i] = r;
      armIds[i] = arm;

      // Color mix: core yellow-white, arms blue, dust lanes pink
      const dustLane = Math.abs(spread) < 0.35 && r > 20 ? 1 : 0;
      if (r < 18) {
        tmp.copy(coreColor);
      } else if (dustLane) {
        tmp.copy(dustColor).lerp(armColor, Math.random() * 0.4);
      } else if (Math.random() > 0.65) {
        tmp.copy(blueColor);
      } else {
        tmp.copy(armColor).lerp(coreColor, Math.random() * 0.35);
      }

      // Brightness falloff
      const bright = 0.55 + 0.45 * Math.exp(-r / (this.radius * 0.45));
      colors[i * 3] = tmp.r * bright;
      colors[i * 3 + 1] = tmp.g * bright;
      colors[i * 3 + 2] = tmp.b * bright;

      sizes[i] = (0.6 + Math.random() * 1.8) * (r < 12 ? 1.6 : 1);
      alphas[i] = (0.25 + Math.random() * 0.55) * (0.4 + 0.6 * bright);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('aArm', new THREE.BufferAttribute(armIds, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: galaxyVertex,
      fragmentShader: galaxyFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uRotation: { value: 0.18 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.group.add(this.points);

    // Galactic bulge glow
    this._addBulge();
  }

  _addBulge() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 230, 180, 0.7)');
    g.addColorStop(0.3, 'rgba(255, 160, 90, 0.25)');
    g.addColorStop(0.7, 'rgba(120, 80, 160, 0.06)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(48, 48, 1);
    this.group.add(sprite);
    this._bulge = sprite;
  }

  update(time) {
    if (this.material) {
      this.material.uniforms.uTime.value = time;
    }
    if (this._bulge) {
      this._bulge.material.opacity = 0.75 + 0.15 * Math.sin(time * 0.4);
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }

  setPixelRatio(pr) {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = Math.min(pr, 2);
    }
  }
}
