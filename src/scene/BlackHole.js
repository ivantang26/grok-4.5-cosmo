import * as THREE from 'three';
import { accretionVertex, accretionFragment } from '../shaders/accretion.js';

/**
 * Central supermassive black hole with event horizon, photon ring,
 * accretion disk, and polar jets.
 */
export class BlackHole {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'BlackHole';

    this.diskMaterial = null;
    this.jetMaterials = [];
    this.photonRing = null;
    this.horizon = null;

    this._buildHorizon();
    this._buildPhotonRing();
    this._buildAccretionDisk();
    this._buildJets();
    this._buildGlow();
  }

  _buildHorizon() {
    // Deep void sphere — pure absorber
    const geo = new THREE.SphereGeometry(3.2, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.horizon = new THREE.Mesh(geo, mat);
    this.horizon.renderOrder = 2;
    this.group.add(this.horizon);

    // Subtle dark corona for depth against bright disk
    const coronaGeo = new THREE.SphereGeometry(3.35, 48, 48);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x050810,
      transparent: true,
      opacity: 0.85,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.group.add(new THREE.Mesh(coronaGeo, coronaMat));
  }

  _buildPhotonRing() {
    const geo = new THREE.TorusGeometry(3.85, 0.06, 16, 128);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe4b5,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.photonRing = new THREE.Mesh(geo, mat);
    this.photonRing.rotation.x = Math.PI / 2;
    this.group.add(this.photonRing);

    // Soft outer halo of the photon sphere
    const haloGeo = new THREE.TorusGeometry(3.95, 0.22, 12, 96);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffaa55,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    this.group.add(halo);
  }

  _buildAccretionDisk() {
    const geo = new THREE.RingGeometry(4.2, 18, 128, 8);
    // RingGeometry UVs need remapping for radial effects
    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const a = Math.atan2(y, x);
      uvs.setXY(i, (a / (Math.PI * 2) + 0.5), (r - 4.2) / (18 - 4.2));
    }
    uvs.needsUpdate = true;

    this.diskMaterial = new THREE.ShaderMaterial({
      vertexShader: accretionVertex,
      fragmentShader: accretionFragment,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.15 },
        uInnerColor: { value: new THREE.Color(1.0, 0.92, 0.75) },
        uMidColor: { value: new THREE.Color(1.0, 0.55, 0.2) },
        uOuterColor: { value: new THREE.Color(0.85, 0.2, 0.08) },
        uCameraPos: { value: new THREE.Vector3() },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const disk = new THREE.Mesh(geo, this.diskMaterial);
    disk.rotation.x = -Math.PI / 2;
    disk.rotation.z = 0.12;
    disk.renderOrder = 1;
    this.group.add(disk);

    // Slightly tilted secondary thin disk for volume
    const disk2 = disk.clone();
    disk2.rotation.z = -0.08;
    disk2.scale.setScalar(0.97);
    disk2.material = this.diskMaterial.clone();
    disk2.material.uniforms.uIntensity.value = 0.55;
    this.group.add(disk2);
    this._disk2Mat = disk2.material;
  }

  _buildJets() {
    const makeJet = (dir) => {
      const geo = new THREE.CylinderGeometry(0.15, 1.4, 48, 16, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x7ec8ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = dir * 28;
      if (dir < 0) mesh.rotation.x = Math.PI;
      this.jetMaterials.push(mat);
      return mesh;
    };

    this.group.add(makeJet(1));
    this.group.add(makeJet(-1));

    // Core jet bright cores
    const coreGeo = new THREE.CylinderGeometry(0.05, 0.35, 36, 8, 1, true);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xcceeff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const up = new THREE.Mesh(coreGeo, coreMat);
    up.position.y = 22;
    const down = up.clone();
    down.position.y = -22;
    down.rotation.x = Math.PI;
    this.group.add(up, down);
    this.jetMaterials.push(coreMat);
  }

  _buildGlow() {
    // Soft volumetric glow sprite around the hole
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 180, 80, 0.55)');
    g.addColorStop(0.25, 'rgba(255, 100, 40, 0.2)');
    g.addColorStop(0.55, 'rgba(80, 40, 120, 0.08)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(42, 42, 1);
    this.group.add(sprite);
    this._glow = sprite;
  }

  update(time, camera) {
    if (this.diskMaterial) {
      this.diskMaterial.uniforms.uTime.value = time;
      this.diskMaterial.uniforms.uCameraPos.value.copy(camera.position);
    }
    if (this._disk2Mat) {
      this._disk2Mat.uniforms.uTime.value = time * 0.92;
      this._disk2Mat.uniforms.uCameraPos.value.copy(camera.position);
    }

    // Subtle photon ring pulse
    if (this.photonRing) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 2.4);
      this.photonRing.material.opacity = pulse;
      this.photonRing.scale.setScalar(1 + 0.01 * Math.sin(time * 3.1));
    }

    // Jet shimmer
    for (let i = 0; i < this.jetMaterials.length; i++) {
      const base = i < 2 ? 0.16 : 0.32;
      this.jetMaterials[i].opacity = base + 0.05 * Math.sin(time * 1.7 + i);
    }

    if (this._glow) {
      this._glow.material.opacity = 0.7 + 0.2 * Math.sin(time * 1.2);
    }

    // Slow precession of whole system
    this.group.rotation.y = time * 0.02;
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
