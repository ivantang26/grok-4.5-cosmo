# Cosmos Engine

An interactive, cinematic universe simulation built with **Three.js**. Explore a supermassive black hole, rotating spiral galaxy, planetary system with orbital dynamics, nebulae, and deep star fields — all with adjustable time scale and a polished mission-control HUD.

## Features

- **Supermassive black hole** with event horizon, photon ring, Doppler-tinted accretion disk, and polar jets
- **Spiral galaxy** with 30k+ particles and differential rotation
- **Planetary system** with Keplerian orbits, moons, rings, and atmospheric glow
- **Nebulae** with procedural volumetric-style shaders
- **Deep star field** with stellar color temperatures and twinkle
- **Time acceleration** from paused to ×1000
- **Camera presets** and focus targets with fly-to animation
- **Cinematic bloom** post-processing (ACES tone mapping)
- **Glass mission-control HUD** with live telemetry

## Quick start

```bash
cd universe-sim
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Controls

| Input | Action |
|-------|--------|
| Left mouse drag | Orbit camera |
| Right mouse drag | Pan |
| Scroll | Zoom |
| Space | Pause / resume |
| 1–9 | Jump to focus target |
| HUD sliders & buttons | Time scale, layers, presets |

## Build

```bash
npm run build
npm run preview
```

## Stack

- [Three.js](https://threejs.org/) — WebGL scene, shaders, post-processing
- [Vite](https://vitejs.dev/) — dev server and production build

## Notes

Scales are artistic, not to-scale. Orbits use simplified Keplerian mean motion for smooth, readable motion at high time acceleration.
