import * as THREE from 'three';

/**
 * Multi-body planetary system with Keplerian orbital motion,
 * orbital path rings, moons, and atmospheric glow.
 */

function makePlanetTexture(baseColor, opts = {}) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const c = new THREE.Color(baseColor);
  ctx.fillStyle = `#${c.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  // Banding / noise for gas giants or rocky detail
  if (opts.bands) {
    for (let y = 0; y < size; y++) {
      const n = Math.sin(y * 0.12 + Math.sin(y * 0.03) * 2) * 0.5 + 0.5;
      const shade = 0.75 + n * 0.35;
      ctx.fillStyle = `rgba(0,0,0,${0.15 * (1 - n)})`;
      ctx.fillRect(0, y, size, 1);
      if (n > 0.7) {
        ctx.fillStyle = `rgba(255,255,255,${0.06 * n})`;
        ctx.fillRect(0, y, size, 1);
      }
      void shade;
    }
  }

  // Spot noise
  for (let i = 0; i < (opts.spots || 80); i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * (opts.spotSize || 6);
    const a = 0.05 + Math.random() * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,255,255,${a})`
      : `rgba(0,0,0,${a})`;
    ctx.fill();
  }

  // Soft polar shade
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, 'rgba(0,0,0,0.25)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeOrbitLine(radius, color = 0x5eead4, opacity = 0.22) {
  const segments = 128;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}

const BODIES = [
  {
    id: 'sol',
    name: 'Helios',
    kind: 'Host star',
    mass: '1.0 M☉',
    radiusKm: '696,000 km',
    isStar: true,
    size: 4.2,
    color: 0xffd27a,
    emissive: 0xffaa44,
    orbitRadius: 0,
    period: 1,
    tilt: 0,
    info: 'Yellow main-sequence star anchoring the local system.',
  },
  {
    id: 'ember',
    name: 'Ember',
    kind: 'Terrestrial planet',
    mass: '0.38 M⊕',
    radiusKm: '2,440 km',
    size: 0.55,
    color: 0xc47a4a,
    orbitRadius: 12,
    period: 0.24,
    tilt: 0.05,
    spots: 120,
  },
  {
    id: 'azure',
    name: 'Azure',
    kind: 'Ocean world',
    mass: '1.0 M⊕',
    radiusKm: '6,371 km',
    size: 0.85,
    color: 0x3a7bd5,
    orbitRadius: 20,
    period: 1.0,
    tilt: 0.4,
    atmosphere: 0x6eb5ff,
    spots: 100,
    moons: [{ name: 'Selene', size: 0.22, dist: 2.1, period: 0.08, color: 0xc8cdd8 }],
  },
  {
    id: 'rust',
    name: 'Rust',
    kind: 'Desert planet',
    mass: '0.11 M⊕',
    radiusKm: '3,390 km',
    size: 0.62,
    color: 0xc45c3a,
    orbitRadius: 28,
    period: 1.88,
    tilt: 0.25,
    spots: 140,
  },
  {
    id: 'storm',
    name: 'Storm',
    kind: 'Gas giant',
    mass: '318 M⊕',
    radiusKm: '69,911 km',
    size: 2.4,
    color: 0xd4a574,
    orbitRadius: 48,
    period: 11.9,
    tilt: 0.05,
    bands: true,
    spots: 40,
    spotSize: 12,
    rings: true,
    moons: [
      { name: 'Io-α', size: 0.18, dist: 3.8, period: 0.05, color: 0xe8c060 },
      { name: 'Euro', size: 0.2, dist: 5.0, period: 0.1, color: 0xcde8f0 },
    ],
  },
  {
    id: 'frost',
    name: 'Frost',
    kind: 'Ice giant',
    mass: '17 M⊕',
    radiusKm: '25,362 km',
    size: 1.6,
    color: 0x6ec6d9,
    orbitRadius: 68,
    period: 29.5,
    tilt: 0.5,
    bands: true,
    atmosphere: 0xa8e6ff,
    spots: 50,
  },
  {
    id: 'nimbus',
    name: 'Nimbus',
    kind: 'Ice giant',
    mass: '14 M⊕',
    radiusKm: '24,622 km',
    size: 1.5,
    color: 0x4a6fd4,
    orbitRadius: 88,
    period: 84,
    tilt: 0.9,
    bands: true,
    rings: true,
    spots: 40,
  },
];

export class PlanetarySystem {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PlanetarySystem';
    // Offset system from galactic center / black hole
    this.group.position.set(55, 8, 40);

    this.bodies = [];
    this.orbitLines = [];
    this.showOrbits = true;
    this.simAngle = 0;

    this._build();
  }

  _build() {
    for (const def of BODIES) {
      const bodyGroup = new THREE.Group();
      bodyGroup.name = def.name;

      let mesh;
      if (def.isStar) {
        mesh = this._buildStar(def);
      } else {
        mesh = this._buildPlanet(def);
      }

      bodyGroup.add(mesh);

      // Atmosphere shell
      if (def.atmosphere) {
        const atm = new THREE.Mesh(
          new THREE.SphereGeometry(def.size * 1.08, 32, 32),
          new THREE.MeshBasicMaterial({
            color: def.atmosphere,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
            depthWrite: false,
          })
        );
        bodyGroup.add(atm);
      }

      // Rings
      if (def.rings) {
        const ring = this._buildRings(def.size);
        bodyGroup.add(ring);
      }

      // Moons
      const moons = [];
      if (def.moons) {
        for (const m of def.moons) {
          const moonMesh = new THREE.Mesh(
            new THREE.SphereGeometry(m.size, 16, 16),
            new THREE.MeshStandardMaterial({
              color: m.color,
              roughness: 0.9,
              metalness: 0.05,
            })
          );
          const moonGroup = new THREE.Group();
          moonGroup.add(moonMesh);
          bodyGroup.add(moonGroup);
          moons.push({
            group: moonGroup,
            mesh: moonMesh,
            dist: m.dist,
            period: m.period,
            angle: Math.random() * Math.PI * 2,
            name: m.name,
          });

          const mOrbit = makeOrbitLine(m.dist, 0xffffff, 0.12);
          bodyGroup.add(mOrbit);
          this.orbitLines.push(mOrbit);
        }
      }

      // Orbital path around star
      if (def.orbitRadius > 0) {
        const orbit = makeOrbitLine(def.orbitRadius, 0x5eead4, 0.2);
        this.group.add(orbit);
        this.orbitLines.push(orbit);
      }

      // Axial tilt
      bodyGroup.rotation.z = def.tilt || 0;

      const angle0 = Math.random() * Math.PI * 2;
      this.group.add(bodyGroup);

      this.bodies.push({
        def,
        group: bodyGroup,
        mesh,
        moons,
        angle: angle0,
        meanMotion: (Math.PI * 2) / def.period, // rad per year unit
      });
    }

    // Soft system light from star
    const light = new THREE.PointLight(0xffd2a0, 2.2, 200, 1.4);
    light.position.set(0, 0, 0);
    this.group.add(light);

    // Subtle ambient for the system
    this.group.add(new THREE.AmbientLight(0x1a2235, 0.35));
  }

  _buildStar(def) {
    const geo = new THREE.SphereGeometry(def.size, 48, 48);
    const mat = new THREE.MeshBasicMaterial({ color: def.color });
    const mesh = new THREE.Mesh(geo, mat);

    // Glow sprite
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.9)');
    g.addColorStop(0.25, 'rgba(255, 180, 80, 0.4)');
    g.addColorStop(0.6, 'rgba(255, 120, 40, 0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.95,
      })
    );
    sprite.scale.set(def.size * 8, def.size * 8, 1);
    mesh.add(sprite);

    // Corona
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(def.size * 1.15, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    mesh.add(corona);

    return mesh;
  }

  _buildPlanet(def) {
    const geo = new THREE.SphereGeometry(def.size, 48, 48);
    const map = makePlanetTexture(def.color, {
      bands: def.bands,
      spots: def.spots,
      spotSize: def.spotSize,
    });
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness: def.bands ? 0.7 : 0.85,
      metalness: 0.05,
      emissive: new THREE.Color(def.color).multiplyScalar(0.05),
    });
    return new THREE.Mesh(geo, mat);
  }

  _buildRings(planetSize) {
    const inner = planetSize * 1.4;
    const outer = planetSize * 2.4;
    const geo = new THREE.RingGeometry(inner, outer, 96);
    // Fix ring UVs and face orientation
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = (Math.sqrt(x * x + y * y) - inner) / (outer - inner);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      color: 0xc9b896,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = 0.15;
    return ring;
  }

  /**
   * @param {number} dtYears - simulated years advanced this frame
   */
  update(dtYears, time) {
    for (const body of this.bodies) {
      const def = body.def;
      if (def.orbitRadius > 0) {
        body.angle += body.meanMotion * dtYears;
        body.group.position.set(
          Math.cos(body.angle) * def.orbitRadius,
          0,
          Math.sin(body.angle) * def.orbitRadius
        );
      }

      // Axial spin
      if (body.mesh && !def.isStar) {
        body.mesh.rotation.y += dtYears * 8;
      } else if (def.isStar && body.mesh) {
        body.mesh.rotation.y += dtYears * 2;
        // Pulse glow slightly
        const sprite = body.mesh.children.find((c) => c.isSprite);
        if (sprite) {
          sprite.material.opacity = 0.85 + 0.1 * Math.sin(time * 2);
        }
      }

      // Moons
      for (const moon of body.moons) {
        moon.angle += ((Math.PI * 2) / moon.period) * dtYears;
        moon.group.position.set(
          Math.cos(moon.angle) * moon.dist,
          Math.sin(moon.angle * 0.3) * 0.15,
          Math.sin(moon.angle) * moon.dist
        );
      }
    }
  }

  setOrbitsVisible(v) {
    this.showOrbits = v;
    for (const line of this.orbitLines) {
      line.visible = v;
    }
  }

  getFocusTargets() {
    return this.bodies.map((b) => ({
      id: b.def.id,
      name: b.def.name,
      kind: b.def.kind,
      mass: b.def.mass,
      radius: b.def.radiusKm,
      getPosition: () => {
        const wp = new THREE.Vector3();
        b.group.getWorldPosition(wp);
        return wp;
      },
      getVelocity: () => {
        if (b.def.orbitRadius <= 0) return '—';
        // Relative orbital speed indicator
        const v = (2 * Math.PI * b.def.orbitRadius) / b.def.period;
        return `${v.toFixed(1)} u/y`;
      },
    }));
  }

  getWorldPosition() {
    const v = new THREE.Vector3();
    this.group.getWorldPosition(v);
    return v;
  }
}
