# Kinetic Voxel Art — XTK WebGL 3D Visualization

An interactive, high-performance 3D kinetic sculpture built using **The X Toolkit (XTK)** WebGL framework.

![XTK WebGL Cube Art](https://img.shields.io/badge/XTK-WebGL%203D-00f0ff?style=for-the-badge)
![60 FPS](https://img.shields.io/badge/Performance-60%20FPS%20GPU-00ff88?style=for-the-badge)
![Cyberpunk UI](https://img.shields.io/badge/UI-Cyberpunk%20Glassmorphism-ff007f?style=for-the-badge)

---

## 🌟 Key Features

### 1. 🪐 6 Morphing Kinetic Formations
- **Hypercube Tesseract**: A $5 \times 5 \times 5$ multi-dimensional lattice with expanding radial harmonics.
- **Cosmic DNA Double Helix**: Dual intertwined helical strands connected by ascending hydrogen rungs.
- **Voxel Metropolis (Skyline)**: An $11 \times 11$ city matrix oscillating like a live equalizer.
- **Saturnian Rings & Gyroscope**: Multi-axis tilted celestial rings counter-rotating around a singularity.
- **Parametric Torus Knot (Trefoil)**: A $(p=2, q=3)$ continuous 3D braided knot loop.
- **Galaxy Vortex**: A 3-arm logarithmic spiral swirling with galactic physics.
- *Smooth Morphing*: Transitioning between any two formations smoothly glides and interpolates every cube to its new target position.

### 2. 🚀 Flying Cubes & Swarm Mechanics
- **Dynamic Swarm**: Up to 80 independent flying cubes zooming through 3D space with continuous physics.
- **Gravitational Attractor**: Toggle centripetal orbital gravity where flying cubes swing around the core sculpture like comets.
- **Meteor Burst / Shower**: Press **`F`** or click **Meteor Burst** to erupt an explosive cluster of cubes outward from the center.
- **Click-to-Shockwave**: Clicking anywhere in space unleashes a kinetic shockwave displacing all nearby cubes with elastic restitution.

### 3. 🎨 6 Dynamic Color Themes & Shaders
- **Cyberpunk / Synthwave**: Neon Cyan (`#00f0ff`), Magenta (`#ff007f`), and Electric Purple.
- **Sunset Horizon**: Golden Amber, Coral Orange, and Crimson Flare.
- **Aurora Borealis**: Glacial Cyan, Emerald Green, and Midnight Violet.
- **Prismatic Spectrum**: Continuous 360° HSL chromatic wave traveling across space and time.
- **Obsidian & Gold**: 24K Gold sheen with obsidian charcoal accents.
- **XTK Magic Mode**: Utilizes XTK's native WebGL normal shader (`magicmode = true`) for prismatic chrome iridescent shading.

### 4. 🎵 Audio-Reactive Visualizer
- **Built-in Procedural Beat Synthesizer**: Generates a 124 BPM synthwave rhythm (kick, offbeat hi-hat, arpeggiated bass) via Web Audio API. Low bass drops dynamically modulate wave amplitude, and hi-hats trigger rotational acceleration.
- **Live Microphone Input**: Toggle your microphone to make the cubes pulse and dance to your voice or external music.
- **Mini-Oscilloscope / Spectrum Analyzer**: Real-time frequency canvas built into the HUD.

### 5. 🎥 Cinematic Camera Controls
- **Auto-Orbit**: Smooth orbital camera rotation with sinusoidal elevation changes.
- **Quick Angles**: Front, Isometric, Top-Down Birds-Eye, Macro Close-Up, and Dramatic Worm's Eye.
- **Interactive Mouse Controls**: Left-click drag to orbit, right-click/scroll to pan and zoom.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :---: | :--- |
| `Space` | **Play / Pause** animation |
| `1` – `6` | **Switch Formations** (Tesseract, Helix, Skyline, Rings, Trefoil, Vortex) |
| `C` | **Cycle Color Themes** |
| `M` | **Toggle XTK Magic Mode** (iridescent shader) |
| `F` | **Launch Flying Meteor Burst** |
| `B` | **Trigger Kinetic Shockwave** |
| `O` | **Toggle Cinematic Auto-Orbit** |
| `H` | **Toggle HUD / Controls Panel** (for clean view/recording) |
| `R` | **Reset Camera** to Isometric view |

---

## 🚀 Running the Project

You can run this project with any local HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node
npx serve
```

Then open your browser at `http://localhost:8000`.
You can also open `index.html` directly in any modern WebGL-compatible browser.
