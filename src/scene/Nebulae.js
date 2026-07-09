import * as THREE from 'three';
import { nebulaVertex, nebulaFragment } from '../shaders/nebula.js';

/**
 * Soft volumetric-style nebula clouds (billboard planes with fbm shaders).
 */
export class Nebulae {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Nebulae';
    this.clouds = [];

    const configs = [
      {
        position: [90, 25, -70],
        scale: 95,
        colorA: [0.45, 0.2, 0.75],
        colorB: [0.9, 0.35, 0.55],
        opacity: 0.22,
        seed: 1.2,
      },
      {
        position: [-110, -15, 60],
        scale: 110,
        colorA: [0.15, 0.35, 0.85],
        colorB: [0.4, 0.75, 0.95],
        opacity: 0.18,
        seed: 3.7,
      },
      {
        position: [40, -40, 120],
        scale: 80,
        colorA: [0.85, 0.4, 0.2],
        colorB: [0.95, 0.7, 0.3],
        opacity: 0.16,
        seed: 5.1,
      },
      {
        position: [-70, 50, -130],
        scale: 130,
        colorA: [0.25, 0.55, 0.45],
        colorB: [0.55, 0.3, 0.7],
        opacity: 0.14,
        seed: 8.4,
      },
      {
        position: [150, 10, 40],
        scale: 70,
        colorA: [0.7, 0.25, 0.4],
        colorB: [0.3, 0.2, 0.8],
        opacity: 0.15,
        seed: 2.9,
      },
    ];

    for (const cfg of configs) {
      this._addCloud(cfg);
    }
  }

  _addCloud(cfg) {
    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: nebulaFragment,
      uniforms: {
        uColorA: { value: new THREE.Color(...cfg.colorA) },
        uColorB: { value: new THREE.Color(...cfg.colorB) },
        uOpacity: { value: cfg.opacity },
        uTime: { value: 0 },
        uSeed: { value: cfg.seed },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...cfg.position);
    mesh.scale.setScalar(cfg.scale);
    // Random tilt
    mesh.rotation.set(
      Math.random() * 0.4,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.5
    );

    this.group.add(mesh);
    this.clouds.push({ mesh, mat, baseScale: cfg.scale });
  }

  update(time, camera) {
    for (const cloud of this.clouds) {
      cloud.mat.uniforms.uTime.value = time;
      // Gentle billboard toward camera for volume feel
      cloud.mesh.quaternion.copy(camera.quaternion);
      // Subtle breathe
      const s = cloud.baseScale * (1 + 0.03 * Math.sin(time * 0.15 + cloud.mat.uniforms.uSeed.value));
      cloud.mesh.scale.setScalar(s);
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
