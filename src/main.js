import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { BlackHole } from './scene/BlackHole.js';
import { Galaxy } from './scene/Galaxy.js';
import { StarField } from './scene/StarField.js';
import { Nebulae } from './scene/Nebulae.js';
import { PlanetarySystem } from './scene/PlanetarySystem.js';

/* ─────────────────────────────────────────────
   Cosmos Engine — interactive universe simulation
   ───────────────────────────────────────────── */

const canvas = document.getElementById('cosmos');
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const hudEl = document.getElementById('hud');

// ── Renderer ─────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x04060c, 1);

// ── Scene & camera ───────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04060c, 0.00055);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2500
);
camera.position.set(80, 45, 110);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 700;
controls.maxPolarAngle = Math.PI * 0.92;
controls.target.set(0, 0, 0);
controls.zoomSpeed = 1.1;
controls.rotateSpeed = 0.7;
controls.panSpeed = 0.6;

// Soft ambient fill
scene.add(new THREE.AmbientLight(0x0a1020, 0.55));
const rim = new THREE.DirectionalLight(0x4a6fa5, 0.25);
rim.position.set(-80, 40, -60);
scene.add(rim);

// ── Progress helper ──────────────────────────
function setProgress(p) {
  if (loaderFill) loaderFill.style.width = `${Math.round(p * 100)}%`;
}

// ── Build cosmos ─────────────────────────────
setProgress(0.1);

const starField = new StarField({ count: 9000, radius: 950 });
scene.add(starField.group);
setProgress(0.25);

const galaxy = new Galaxy({ count: 32000, arms: 4, radius: 175 });
scene.add(galaxy.group);
setProgress(0.45);

const blackHole = new BlackHole();
scene.add(blackHole.group);
setProgress(0.6);

const nebulae = new Nebulae();
scene.add(nebulae.group);
setProgress(0.72);

const planetary = new PlanetarySystem();
scene.add(planetary.group);
setProgress(0.85);

// Distant companion galaxies (simple particle clusters)
function addDistantGalaxy(x, y, z, scale, hue) {
  const n = 1800;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color().setHSL(hue, 0.45, 0.65);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5) * 28 * scale;
    const h = (Math.random() - 0.5) * 4 * scale;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = h + (Math.random() - 0.5) * r * 0.15;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.55;
    const b = 0.4 + Math.random() * 0.6;
    col[i * 3] = c.r * b;
    col[i * 3 + 1] = c.g * b;
    col[i * 3 + 2] = c.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.9 * scale,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(x, y, z);
  pts.rotation.x = 0.4;
  pts.rotation.z = -0.3;
  scene.add(pts);
  return pts;
}

addDistantGalaxy(-320, 60, -280, 1.4, 0.08);
addDistantGalaxy(380, -40, 200, 1.0, 0.55);
addDistantGalaxy(-200, -80, 350, 0.8, 0.7);

// ── Post-processing bloom ────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,
  0.7,
  0.35
);
composer.addPass(bloom);
composer.addPass(new OutputPass());
setProgress(0.95);

// ── Simulation state ─────────────────────────
const state = {
  paused: false,
  timeScale: 1, // mapped from slider
  simYears: 0,
  showOrbits: true,
  showLabels: true,
  showGalaxy: true,
  showNebulae: true,
  focusId: 'blackhole',
  clock: new THREE.Clock(),
  elapsed: 0,
  frames: 0,
  fps: 60,
  lastFpsUpdate: 0,
};

/** Map slider 0–100 → time multiplier (non-linear, cinematic) */
function sliderToTimeScale(v) {
  if (v <= 0) return 0;
  // 0..100 → roughly 0.01x .. 1000x with nice midpoint at ~1x
  const t = v / 100;
  return Math.pow(10, t * 5 - 2); // 0.01 at t=0+, 1 at t=0.4, 1000 at t=1
}

function formatTimeScale(s) {
  if (s === 0) return 'Paused';
  if (s < 0.1) return `${s.toFixed(3)}×`;
  if (s < 10) return `${s.toFixed(2)}×`;
  if (s < 100) return `${s.toFixed(1)}×`;
  return `${Math.round(s)}×`;
}

function formatSimTime(years) {
  if (years < 1) return `T+${(years * 365.25).toFixed(1)} d`;
  if (years < 1000) return `T+${years.toFixed(2)} y`;
  if (years < 1e6) return `T+${(years / 1000).toFixed(2)} ky`;
  return `T+${(years / 1e6).toFixed(3)} My`;
}

// ── Focus targets ────────────────────────────
const focusTargets = [
  {
    id: 'blackhole',
    name: 'Sagittarius A*',
    kind: 'Supermassive black hole',
    mass: '4.3 × 10⁶ M☉',
    radius: '12.7 × 10⁶ km',
    getPosition: () => new THREE.Vector3(0, 0, 0),
    getVelocity: () => '—',
  },
  {
    id: 'galaxy',
    name: 'Spiral Host',
    kind: 'Barred spiral galaxy',
    mass: '1.5 × 10¹² M☉',
    radius: '50 kpc (scaled)',
    getPosition: () => new THREE.Vector3(40, 5, 0),
    getVelocity: () => '220 km/s (rot.)',
  },
  ...planetary.getFocusTargets(),
];

// ── HUD wiring ───────────────────────────────
const el = {
  focusName: document.getElementById('focus-name'),
  focusType: document.getElementById('focus-type'),
  tMass: document.getElementById('t-mass'),
  tRadius: document.getElementById('t-radius'),
  tDistance: document.getElementById('t-distance'),
  tVelocity: document.getElementById('t-velocity'),
  targetList: document.getElementById('target-list'),
  timeScale: document.getElementById('time-scale'),
  timeScaleValue: document.getElementById('time-scale-value'),
  btnPause: document.getElementById('btn-pause'),
  btnResetCam: document.getElementById('btn-reset-cam'),
  simTime: document.getElementById('sim-time'),
  fpsLabel: document.getElementById('fps-label'),
  statusDot: document.getElementById('status-dot'),
  statusLabel: document.getElementById('status-label'),
  labels: document.getElementById('labels'),
};

function buildTargetList() {
  el.targetList.innerHTML = '';
  for (const t of focusTargets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'target-btn' + (t.id === state.focusId ? ' active' : '');
    btn.dataset.id = t.id;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', t.id === state.focusId ? 'true' : 'false');
    btn.innerHTML = `${t.name}<span class="t-kind">${t.kind}</span>`;
    btn.addEventListener('click', () => setFocus(t.id, true));
    el.targetList.appendChild(btn);
  }
}

function setFocus(id, animate = false) {
  state.focusId = id;
  const t = focusTargets.find((x) => x.id === id);
  if (!t) return;

  el.focusName.textContent = t.name;
  el.focusType.textContent = t.kind;
  el.tMass.textContent = t.mass;
  el.tRadius.textContent = t.radius;
  el.tVelocity.textContent = typeof t.getVelocity === 'function' ? t.getVelocity() : '—';

  el.targetList.querySelectorAll('.target-btn').forEach((btn) => {
    const on = btn.dataset.id === id;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  if (animate) {
    const pos = t.getPosition();
    const offset = new THREE.Vector3(18, 10, 22);
    if (id === 'blackhole') offset.set(28, 16, 36);
    if (id === 'galaxy') offset.set(120, 70, 100);
    if (id === 'sol') offset.set(14, 8, 18);
    if (id === 'storm' || id === 'nimbus' || id === 'frost') offset.set(22, 12, 26);

    animateCamera(pos.clone().add(offset), pos.clone());
  }
}

// Smooth camera fly-to
let camAnim = null;
function animateCamera(toPos, toTarget, duration = 1.6) {
  camAnim = {
    fromPos: camera.position.clone(),
    toPos: toPos.clone(),
    fromTarget: controls.target.clone(),
    toTarget: toTarget.clone(),
    t: 0,
    duration,
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateCameraAnim(dt) {
  if (!camAnim) return;
  camAnim.t += dt / camAnim.duration;
  const k = easeInOutCubic(Math.min(1, camAnim.t));
  camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
  controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, k);
  if (camAnim.t >= 1) camAnim = null;
}

// Labels
const labelEls = new Map();
function ensureLabels() {
  el.labels.innerHTML = '';
  labelEls.clear();
  const labelTargets = focusTargets.filter(
    (t) => t.id !== 'galaxy' // galaxy label too large / center-ish
  );
  for (const t of labelTargets) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = t.name;
    el.labels.appendChild(div);
    labelEls.set(t.id, { el: div, target: t });
  }
}

const _proj = new THREE.Vector3();
function updateLabels() {
  if (!state.showLabels) {
    for (const { el: d } of labelEls.values()) d.classList.remove('visible');
    return;
  }
  for (const { el: d, target } of labelEls.values()) {
    const pos = target.getPosition();
    _proj.copy(pos);
    _proj.project(camera);
    const behind = _proj.z > 1;
    const x = (_proj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
    const onScreen =
      !behind && x > -40 && x < window.innerWidth + 40 && y > -40 && y < window.innerHeight + 40;
    if (onScreen) {
      d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -120%)`;
      d.classList.add('visible');
    } else {
      d.classList.remove('visible');
    }
  }
}

function updateTelemetry() {
  const t = focusTargets.find((x) => x.id === state.focusId);
  if (!t) return;
  const pos = t.getPosition();
  const dist = camera.position.distanceTo(pos);
  el.tDistance.textContent = `${dist.toFixed(1)} u`;
  el.tVelocity.textContent = typeof t.getVelocity === 'function' ? t.getVelocity() : '—';
}

// Time slider
function applyTimeSlider() {
  const v = parseFloat(el.timeScale.value);
  const pct = v;
  el.timeScale.style.setProperty('--pct', `${pct}%`);
  if (state.paused) {
    state.timeScale = 0;
    el.timeScaleValue.textContent = 'Paused';
  } else {
    state.timeScale = sliderToTimeScale(v);
    el.timeScaleValue.textContent = formatTimeScale(state.timeScale);
  }
}

el.timeScale.addEventListener('input', () => {
  if (state.paused) {
    state.paused = false;
    syncPauseUI();
  }
  applyTimeSlider();
});

function setPaused(p) {
  state.paused = p;
  applyTimeSlider();
  syncPauseUI();
}

function syncPauseUI() {
  el.btnPause.textContent = state.paused ? 'Resume' : 'Pause';
  el.btnPause.classList.toggle('paused', state.paused);
  el.btnPause.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
  el.statusDot.classList.toggle('paused', state.paused);
  el.statusLabel.textContent = state.paused ? 'Paused' : 'Live';
}

el.btnPause.addEventListener('click', () => setPaused(!state.paused));

el.btnResetCam.addEventListener('click', () => {
  animateCamera(new THREE.Vector3(80, 45, 110), new THREE.Vector3(0, 0, 0));
  setFocus('blackhole', false);
});

// Toggles
document.querySelectorAll('[data-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.toggle;
    const next = !btn.classList.contains('active');
    btn.classList.toggle('active', next);
    btn.setAttribute('aria-pressed', next ? 'true' : 'false');

    if (key === 'orbits') {
      state.showOrbits = next;
      planetary.setOrbitsVisible(next);
    } else if (key === 'labels') {
      state.showLabels = next;
    } else if (key === 'galaxy') {
      state.showGalaxy = next;
      galaxy.setVisible(next);
    } else if (key === 'nebulae') {
      state.showNebulae = next;
      nebulae.setVisible(next);
    }
  });
});

// Camera presets
const presets = {
  overview: {
    pos: new THREE.Vector3(80, 45, 110),
    target: new THREE.Vector3(0, 0, 0),
    focus: 'blackhole',
  },
  blackhole: {
    pos: new THREE.Vector3(18, 10, 24),
    target: new THREE.Vector3(0, 0, 0),
    focus: 'blackhole',
  },
  galaxy: {
    pos: new THREE.Vector3(20, 140, 30),
    target: new THREE.Vector3(0, 0, 0),
    focus: 'galaxy',
  },
  system: {
    pos: null,
    target: null,
    focus: 'sol',
  },
};

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const p = presets[btn.dataset.preset];
    if (!p) return;
    if (btn.dataset.preset === 'system') {
      const sol = focusTargets.find((t) => t.id === 'sol');
      const pos = sol.getPosition();
      animateCamera(pos.clone().add(new THREE.Vector3(22, 12, 28)), pos.clone());
      setFocus('sol', false);
      return;
    }
    animateCamera(p.pos.clone(), p.target.clone());
    setFocus(p.focus, false);
  });
});

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    setPaused(!state.paused);
  }
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= 9) {
    const t = focusTargets[num - 1];
    if (t) setFocus(t.id, true);
  }
});

// Resize
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  const pr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pr);
  starField.setPixelRatio(pr);
  galaxy.setPixelRatio(pr);
}
window.addEventListener('resize', onResize);

// ── Init UI ──────────────────────────────────
buildTargetList();
ensureLabels();
setFocus('blackhole', false);
applyTimeSlider();
setProgress(1);

// Reveal
requestAnimationFrame(() => {
  loaderEl.classList.add('done');
  hudEl.hidden = false;
  requestAnimationFrame(() => hudEl.classList.add('visible'));
});

// ── Animation loop ───────────────────────────
function tick() {
  requestAnimationFrame(tick);

  const rawDt = Math.min(state.clock.getDelta(), 0.05);
  state.elapsed += rawDt;

  updateCameraAnim(rawDt);
  controls.update();

  // Simulation time advance
  const scale = state.paused ? 0 : state.timeScale;
  // Base unit: 1 real second ≈ 0.02 sim years at 1× (tweak for cinematic feel)
  const dtYears = rawDt * 0.02 * scale;
  state.simYears += dtYears;

  // Visual time for shaders (always runs slowly for beauty, accelerates with scale)
  const visualTime = state.elapsed + state.simYears * 0.15;

  blackHole.update(visualTime, camera);
  galaxy.update(visualTime * 0.35);
  starField.update(state.elapsed);
  nebulae.update(visualTime * 0.5, camera);
  planetary.update(dtYears, visualTime);

  updateLabels();
  updateTelemetry();

  el.simTime.textContent = formatSimTime(state.simYears);

  // FPS
  state.frames++;
  if (state.elapsed - state.lastFpsUpdate > 0.5) {
    state.fps = Math.round(state.frames / (state.elapsed - state.lastFpsUpdate));
    state.frames = 0;
    state.lastFpsUpdate = state.elapsed;
    el.fpsLabel.textContent = `${state.fps} FPS`;
  }

  composer.render();
}

tick();
