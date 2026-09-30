/**
 * ============================================================================
 * XTK CUBE ART VISUALIZATION - CORE ENGINE
 * Animated 3D Kinetic Sculpture, Morphing Formations, Flying Cubes,
 * Dynamic Color Spectrum & Audio Reactive Engine.
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Configuration & State
  // --------------------------------------------------------------------------
  const CONFIG = {
    CORE_CUBE_COUNT: 125,      // 5x5x5 lattice / dynamic formations
    CORE_CUBE_SIZE: 16,        // Size of core sculpture cubes
    MAX_FLYING_CUBES: 80,      // Max pool size for flying cubes
    FLYING_CUBE_SIZE: 10,      // Size of flying cubes
    BOUNDS_RADIUS: 480,        // Cosmic boundary
    DEFAULT_SPEED: 1.0,
    DEFAULT_WAVE_AMP: 22,
    DEFAULT_WAVE_FREQ: 0.04
  };

  const STATE = {
    renderer: null,
    isPlaying: true,
    speed: 1.0,
    waveAmp: 22,
    waveFreq: 0.04,
    rotationSpeed: 0.8,
    activeFormation: 'tesseract', // 'tesseract' | 'helix' | 'skyline' | 'rings' | 'trefoil' | 'vortex'
    activeColorTheme: 'cyberpunk', // 'cyberpunk' | 'sunset' | 'aurora' | 'prismatic' | 'gold' | 'magic'
    magicMode: false,
    autoOrbitCamera: true,
    cameraAngle: 0,
    cameraRadius: 420,
    cameraElevation: 120,
    attractorEnabled: true,
    activeFlyingCount: 40,
    shockwaveIntensity: 0,
    time: 0,
    fps: 60,
    lastFrameTime: performance.now(),
    frameCount: 0,
    fpsTimer: performance.now(),
    audioEnabled: false,
    audioBass: 0,
    audioMid: 0,
    audioTreble: 0
  };

  // Pools
  const coreCubes = [];
  const flyingCubes = [];

  // Color Palettes (RGB vectors in 0..1 range)
  const COLOR_THEMES = {
    cyberpunk: [
      [1.0, 0.0, 0.5],   // Neon Pink/Magenta
      [0.0, 0.94, 1.0],  // Cyber Cyan
      [0.62, 0.31, 0.87],// Electric Purple
      [0.08, 0.53, 1.0]  // Bright Azure
    ],
    sunset: [
      [1.0, 0.72, 0.01], // Golden Amber
      [0.98, 0.52, 0.0],  // Sunset Orange
      [0.90, 0.22, 0.27],// Crimson Flare
      [0.45, 0.08, 0.32] // Deep Plum
    ],
    aurora: [
      [0.0, 1.0, 0.53],  // Aurora Emerald
      [0.38, 0.94, 1.0], // Glacial Cyan
      [0.23, 0.05, 0.64],// Midnight Violet
      [0.44, 0.82, 0.32] // Moss Green
    ],
    prismatic: [
      [1.0, 0.2, 0.2],
      [1.0, 0.8, 0.2],
      [0.2, 1.0, 0.4],
      [0.2, 0.8, 1.0],
      [0.8, 0.2, 1.0]
    ],
    gold: [
      [1.0, 0.84, 0.0],  // 24k Gold
      [0.85, 0.65, 0.13],// Dark Goldenrod
      [0.95, 0.95, 0.98],// Silver Chromium
      [0.25, 0.25, 0.28] // Obsidian Charcoal
    ]
  };

  // --------------------------------------------------------------------------
  // Audio Synthesizer & Analyser (Procedural Beat & Mic Support)
  // --------------------------------------------------------------------------
  let audioContext = null;
  let analyserNode = null;
  let audioDataArray = null;
  let synthTimer = null;
  let audioCanvas = null;
  let audioCanvasCtx = null;

  function initAudioEngine() {
    if (audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 64;
      audioDataArray = new Uint8Array(analyserNode.frequencyBinCount);

      // Start procedural cyber beat
      startProceduralSynth();
      STATE.audioEnabled = true;
      showToast('Synth Beat Synthesizer Active');
    } catch (e) {
      console.warn('Audio engine not supported or blocked:', e);
    }
  }

  function startProceduralSynth() {
    if (!audioContext) return;
    let step = 0;
    const bpm = 124;
    const stepDuration = (60 / bpm) / 4; // 16th note

    synthTimer = setInterval(() => {
      if (!STATE.audioEnabled || audioContext.state !== 'running') return;
      const t = audioContext.currentTime;

      // 4-on-the-floor Kick Drum (steps 0, 4, 8, 12)
      if (step % 4 === 0) {
        playKick(t);
      }
      // Hi-hats on offbeats (steps 2, 6, 10, 14)
      if (step % 2 === 0) {
        playHiHat(t, step % 4 === 2 ? 0.35 : 0.15);
      }
      // Synth bass arpeggios
      if (step % 2 === 1) {
        const notes = [65.41, 77.78, 87.31, 98.00, 116.54]; // C2 minor pentatonic
        const note = notes[(Math.floor(step / 2)) % notes.length];
        playBass(t, note);
      }

      step = (step + 1) % 16;
    }, stepDuration * 1000);
  }

  function playKick(time) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(analyserNode);
    gain.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  function playHiHat(time, vol) {
    // Filtered noise for hi-hat
    const bufferSize = audioContext.sampleRate * 0.05;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(vol * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(analyserNode);
    gain.connect(audioContext.destination);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  function playBass(time, freq) {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.18);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyserNode);
    gain.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  function updateAudioAnalysis() {
    if (analyserNode && STATE.audioEnabled) {
      analyserNode.getByteFrequencyData(audioDataArray);

      // Extract frequency bands
      let bassSum = 0;
      let midSum = 0;
      let trebSum = 0;

      for (let i = 0; i < 4; i++) bassSum += audioDataArray[i];
      for (let i = 4; i < 16; i++) midSum += audioDataArray[i];
      for (let i = 16; i < 32; i++) trebSum += audioDataArray[i];

      STATE.audioBass = bassSum / (4 * 255);
      STATE.audioMid = midSum / (12 * 255);
      STATE.audioTreble = trebSum / (16 * 255);

      drawAudioVisualizer();
    } else {
      // Fallback synthetic rhythm pulse when audio is off
      const synthBeat = Math.pow(Math.sin(STATE.time * 4), 16);
      STATE.audioBass = synthBeat * 0.6;
      STATE.audioMid = Math.sin(STATE.time * 2) * 0.3 + 0.3;
      STATE.audioTreble = Math.cos(STATE.time * 5) * 0.2 + 0.2;
    }
  }

  function drawAudioVisualizer() {
    if (!audioCanvasCtx || !audioDataArray) return;
    const w = audioCanvas.width;
    const h = audioCanvas.height;
    audioCanvasCtx.clearRect(0, 0, w, h);

    const barCount = 24;
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const val = (audioDataArray[i] || 0) / 255;
      const barH = Math.max(3, val * h);
      const x = i * barWidth;
      const y = h - barH;

      const grad = audioCanvasCtx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(1, '#ff007f');

      audioCanvasCtx.fillStyle = grad;
      audioCanvasCtx.fillRect(x + 1, y, barWidth - 2, barH);
    }
  }

  // --------------------------------------------------------------------------
  // Formation Mathematics
  // --------------------------------------------------------------------------
  const FORMATION_GENERATORS = {
    /**
     * 1. Hypercube Tesseract (5x5x5 Grid Lattice)
     */
    tesseract: function (i, total) {
      const dim = 5;
      const spacing = 32;
      const xi = i % dim;
      const yi = Math.floor(i / dim) % dim;
      const zi = Math.floor(i / (dim * dim)) % dim;

      return [
        (xi - 2) * spacing,
        (yi - 2) * spacing,
        (zi - 2) * spacing
      ];
    },

    /**
     * 2. Cosmic DNA Double Helix
     */
    helix: function (i, total) {
      const turns = 3.5;
      const radius = 68;
      const heightSpan = 220;

      // Split into Strand A (50), Strand B (50), and Cross Rungs (25)
      if (i < 50) {
        const u = i / 50;
        const theta = u * Math.PI * 2 * turns;
        return [
          Math.cos(theta) * radius,
          (u - 0.5) * heightSpan,
          Math.sin(theta) * radius
        ];
      } else if (i < 100) {
        const u = (i - 50) / 50;
        const theta = u * Math.PI * 2 * turns + Math.PI; // 180° offset
        return [
          Math.cos(theta) * radius,
          (u - 0.5) * heightSpan,
          Math.sin(theta) * radius
        ];
      } else {
        // Connecting rungs bridging the two helices
        const rungIdx = i - 100;
        const u = rungIdx / 25;
        const theta = u * Math.PI * 2 * turns;
        const bridgeT = (rungIdx % 3 - 1) * 0.6; // step between strands
        return [
          Math.cos(theta) * radius * bridgeT,
          (u - 0.5) * heightSpan,
          Math.sin(theta) * radius * bridgeT
        ];
      }
    },

    /**
     * 3. Voxel Metropolis / Audio Skyline
     */
    skyline: function (i, total) {
      const cols = 11;
      const spacing = 26;
      const xi = i % cols;
      const zi = Math.floor(i / cols);

      const dx = (xi - 5) * spacing;
      const dz = (zi - 5) * spacing;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Skyline tower heights
      const baseHeight = Math.cos(dist * 0.05) * 35 + Math.sin(dx * 0.08) * 25;
      return [dx, baseHeight, dz];
    },

    /**
     * 4. Saturnian Rings & Gyroscope
     */
    rings: function (i, total) {
      if (i === 0) return [0, 0, 0]; // Center singularity

      if (i < 28) {
        // Equatorial inner ring
        const u = i / 28;
        const theta = u * Math.PI * 2;
        const r = 55;
        return [Math.cos(theta) * r, 0, Math.sin(theta) * r];
      } else if (i < 68) {
        // 45° tilted mid ring
        const u = (i - 28) / 40;
        const theta = u * Math.PI * 2;
        const r = 95;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r * 0.707;
        const z = Math.sin(theta) * r * 0.707;
        return [x, y, z];
      } else {
        // Polar outer ring (90° tilt)
        const u = (i - 68) / (total - 68);
        const theta = u * Math.PI * 2;
        const r = 135;
        return [0, Math.cos(theta) * r, Math.sin(theta) * r];
      }
    },

    /**
     * 5. Parametric Torus Knot (Trefoil)
     */
    trefoil: function (i, total) {
      const u = (i / total) * Math.PI * 2;
      const p = 2;
      const q = 3;
      const r = Math.cos(q * u) * 35 + 85;
      return [
        r * Math.cos(p * u),
        -Math.sin(q * u) * 55,
        r * Math.sin(p * u)
      ];
    },

    /**
     * 6. Cosmic Galaxy Vortex Spiral
     */
    vortex: function (i, total) {
      const arms = 3;
      const arm = i % arms;
      const k = Math.floor(i / arms);
      const maxK = total / arms;
      const r = 18 + Math.pow(k / maxK, 1.3) * 150;
      const theta = (k / maxK) * Math.PI * 4.5 + (arm * (Math.PI * 2 / arms));
      const y = (k - maxK * 0.5) * 2.8;

      return [
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r
      ];
    }
  };

  // --------------------------------------------------------------------------
  // Color Calculation Utility
  // --------------------------------------------------------------------------
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
  }

  function getPaletteColor(theme, ratio, timeOffset) {
    if (theme === 'prismatic') {
      const hue = (ratio + timeOffset * 0.12) % 1.0;
      return hslToRgb(hue, 0.95, 0.55);
    }

    const palette = COLOR_THEMES[theme] || COLOR_THEMES.cyberpunk;
    const count = palette.length;
    const scaled = ((ratio + timeOffset * 0.08) % 1.0 + 1.0) % 1.0 * count;
    const idx1 = Math.floor(scaled) % count;
    const idx2 = (idx1 + 1) % count;
    const mix = scaled - Math.floor(scaled);

    const c1 = palette[idx1];
    const c2 = palette[idx2];
    return [
      c1[0] * (1 - mix) + c2[0] * mix,
      c1[1] * (1 - mix) + c2[1] * mix,
      c1[2] * (1 - mix) + c2[2] * mix
    ];
  }

  // --------------------------------------------------------------------------
  // Initialize XTK Renderer & Cube Pools
  // --------------------------------------------------------------------------
  function initXTK() {
    const X_API = (typeof window !== 'undefined' && window.X) || (typeof X !== 'undefined' ? X : null);
    if (!X_API) {
      console.error('XTK library failed to load!');
      showToast('Error: XTK library not found');
      return;
    }
    if (typeof window !== 'undefined' && !window.X) {
      window.X = X_API;
    }
    const X = X_API;

    // 1. Create and configure 3D renderer
    STATE.renderer = new X.renderer3D();
    STATE.renderer.init();

    // 2. Build Core Kinetic Sculpture Cubes
    for (let i = 0; i < CONFIG.CORE_CUBE_COUNT; i++) {
      const cube = new X.cube();
      cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.CORE_CUBE_SIZE;

      // Initial position from current default formation
      const initialPos = FORMATION_GENERATORS[STATE.activeFormation](i, CONFIG.CORE_CUBE_COUNT);
      cube.center = [0, 0, 0];

      // Initial color
      const color = getPaletteColor(STATE.activeColorTheme, i / CONFIG.CORE_CUBE_COUNT, 0);
      cube.color = color;
      cube.opacity = 0.92;

      STATE.renderer.add(cube);

      // Translate via matrix
      cube.transform.matrix[12] = initialPos[0];
      cube.transform.matrix[13] = initialPos[1];
      cube.transform.matrix[14] = initialPos[2];
      cube.transform.modified();

      coreCubes.push({
        obj: cube,
        index: i,
        curPos: [...initialPos],
        targetPos: [...initialPos],
        rotSpeed: [
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        ],
        phase: Math.random() * Math.PI * 2
      });
    }

    // 3. Build Flying Cubes Particle Pool
    for (let i = 0; i < CONFIG.MAX_FLYING_CUBES; i++) {
      const fCube = new X.cube();
      fCube.lengthX = fCube.lengthY = fCube.lengthZ = CONFIG.FLYING_CUBE_SIZE;
      fCube.center = [0, 0, 0];

      const color = getPaletteColor(STATE.activeColorTheme, i / CONFIG.MAX_FLYING_CUBES, 0);
      fCube.color = color;
      fCube.opacity = 0.85;
      fCube.visible = i < STATE.activeFlyingCount;

      STATE.renderer.add(fCube);

      // Random initial trajectory in sphere
      const r = Math.random() * 250 + 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const pos = [
        r * Math.cos(phi) * Math.cos(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.sin(theta)
      ];

      fCube.transform.matrix[12] = pos[0];
      fCube.transform.matrix[13] = pos[1];
      fCube.transform.matrix[14] = pos[2];
      fCube.transform.modified();

      flyingCubes.push({
        obj: fCube,
        pos: pos,
        vel: [
          (Math.random() - 0.5) * 3.2,
          (Math.random() - 0.5) * 3.2,
          (Math.random() - 0.5) * 3.2
        ],
        rot: [
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ],
        speedMultiplier: Math.random() * 0.6 + 0.7,
        active: i < STATE.activeFlyingCount
      });
    }

    // 4. Initial Render
    STATE.renderer.render();

    // 5. Connect Main Animation Hook (r.onRender is called every frame by XTK)
    STATE.renderer.onRender = renderFrame;

    // Set initial camera perspective
    if (STATE.renderer.camera) {
      STATE.renderer.camera.position = [0, STATE.cameraElevation, STATE.cameraRadius];
      STATE.renderer.camera.focus = [0, 0, 0];
    }

    updateUIElements();
    showToast('XTK 3D Art Engine Initialized');
  }

  // --------------------------------------------------------------------------
  // Main Animation & Physics Frame Loop
  // --------------------------------------------------------------------------
  function renderFrame() {
    const now = performance.now();
    const dt = Math.min((now - STATE.lastFrameTime) / 1000, 0.1);
    STATE.lastFrameTime = now;

    // FPS Counter
    STATE.frameCount++;
    if (now - STATE.fpsTimer >= 500) {
      STATE.fps = Math.round((STATE.frameCount * 1000) / (now - STATE.fpsTimer));
      STATE.frameCount = 0;
      STATE.fpsTimer = now;
      const fpsEl = document.getElementById('fps-value');
      if (fpsEl) fpsEl.textContent = STATE.fps;
    }

    if (!STATE.isPlaying) return;

    // Advance global time with user speed & audio tempo boost
    const audioSpeedBoost = 1.0 + STATE.audioBass * 0.4;
    STATE.time += dt * STATE.speed * audioSpeedBoost;

    // Decay shockwave
    if (STATE.shockwaveIntensity > 0.01) {
      STATE.shockwaveIntensity *= 0.92;
    } else {
      STATE.shockwaveIntensity = 0;
    }

    // Process real-time audio analysis
    updateAudioAnalysis();

    // ------------------------------------------------------------------------
    // A. Animate Core Kinetic Sculpture Cubes
    // ------------------------------------------------------------------------
    const morphRate = 0.07; // Smooth interpolation speed between formations
    const totalCore = coreCubes.length;
    const waveAmpEffective = (STATE.waveAmp + STATE.audioBass * 35);
    const waveFreqEffective = STATE.waveFreq;

    for (let i = 0; i < totalCore; i++) {
      const cubeData = coreCubes[i];
      const cube = cubeData.obj;

      // 1. Smoothly interpolate base position toward target formation
      cubeData.curPos[0] += (cubeData.targetPos[0] - cubeData.curPos[0]) * morphRate;
      cubeData.curPos[1] += (cubeData.targetPos[1] - cubeData.curPos[1]) * morphRate;
      cubeData.curPos[2] += (cubeData.targetPos[2] - cubeData.curPos[2]) * morphRate;

      // 2. Compute 3D kinetic wave ripples
      const bx = cubeData.curPos[0];
      const by = cubeData.curPos[1];
      const bz = cubeData.curPos[2];
      const distFromCenter = Math.sqrt(bx * bx + by * by + bz * bz);

      // Kinetic harmonic displacement
      const waveOffset = Math.sin(distFromCenter * waveFreqEffective - STATE.time * 3.2) * waveAmpEffective;
      const swirlX = Math.cos(STATE.time * 1.5 + cubeData.phase) * (4 + STATE.audioMid * 8);
      const swirlZ = Math.sin(STATE.time * 1.5 + cubeData.phase) * (4 + STATE.audioMid * 8);

      // Shockwave explosive expansion
      let shockX = 0, shockY = 0, shockZ = 0;
      if (STATE.shockwaveIntensity > 0.01 && distFromCenter > 1) {
        const shockFactor = STATE.shockwaveIntensity * Math.sin(distFromCenter * 0.05 - STATE.time * 10) * 60;
        shockX = (bx / distFromCenter) * shockFactor;
        shockY = (by / distFromCenter) * shockFactor;
        shockZ = (bz / distFromCenter) * shockFactor;
      }

      // Assign position via transform matrix
      const finalX = bx + swirlX + shockX;
      const finalY = by + waveOffset + shockY;
      const finalZ = bz + swirlZ + shockZ;

      cube.transform.matrix[12] = finalX;
      cube.transform.matrix[13] = finalY;
      cube.transform.matrix[14] = finalZ;

      // 3. Local axis rotation (spin)
      const rotFactor = STATE.rotationSpeed * (1.0 + STATE.audioTreble * 1.5);
      cube.transform.rotateX(cubeData.rotSpeed[0] * rotFactor);
      cube.transform.rotateY(cubeData.rotSpeed[1] * rotFactor);
      cube.transform.rotateZ(cubeData.rotSpeed[2] * rotFactor);

      cube.transform.modified();

      // 4. Dynamic Color Cycling
      if (!STATE.magicMode) {
        const colorRatio = (distFromCenter / 200) + (i / totalCore) * 0.3;
        const col = getPaletteColor(STATE.activeColorTheme, colorRatio, STATE.time);

        // Flash on heavy audio bass hit
        if (STATE.audioBass > 0.6) {
          col[0] = Math.min(1.0, col[0] + 0.3);
          col[1] = Math.min(1.0, col[1] + 0.3);
          col[2] = Math.min(1.0, col[2] + 0.3);
        }
        cube.color = col;
      }
    }

    // ------------------------------------------------------------------------
    // B. Animate Flying Cubes (Physics & Swarm Mechanics)
    // ------------------------------------------------------------------------
    const flyingCount = STATE.activeFlyingCount;
    for (let i = 0; i < flyingCubes.length; i++) {
      const f = flyingCubes[i];
      if (!f.active || i >= flyingCount) {
        f.obj.visible = false;
        continue;
      }
      f.obj.visible = true;

      // Velocity physics
      const speedMult = f.speedMultiplier * (1.0 + STATE.audioBass * 0.8);
      f.pos[0] += f.vel[0] * speedMult;
      f.pos[1] += f.vel[1] * speedMult;
      f.pos[2] += f.vel[2] * speedMult;

      const dist = Math.sqrt(f.pos[0] * f.pos[0] + f.pos[1] * f.pos[1] + f.pos[2] * f.pos[2]);

      // Attractor gravitational mechanics
      if (STATE.attractorEnabled && dist > 10) {
        const gravity = 0.85;
        f.vel[0] -= (f.pos[0] / dist) * gravity;
        f.vel[1] -= (f.pos[1] / dist) * gravity;
        f.vel[2] -= (f.pos[2] / dist) * gravity;

        // Centrifugal swirl force
        f.vel[0] += (-f.pos[2] / dist) * 0.6;
        f.vel[2] += (f.pos[0] / dist) * 0.6;

        // Viscous damping
        f.vel[0] *= 0.992;
        f.vel[1] *= 0.992;
        f.vel[2] *= 0.992;
      }

      // Boundary loop / respawn
      if (dist > CONFIG.BOUNDS_RADIUS || dist < 15) {
        // Respawn from inner burst
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        const spawnR = 30 + Math.random() * 40;
        f.pos[0] = spawnR * Math.cos(phi) * Math.cos(theta);
        f.pos[1] = spawnR * Math.sin(phi);
        f.pos[2] = spawnR * Math.cos(phi) * Math.sin(theta);

        const launchSpeed = Math.random() * 4.5 + 2.5;
        f.vel[0] = (f.pos[0] / spawnR) * launchSpeed + (Math.random() - 0.5) * 2;
        f.vel[1] = (f.pos[1] / spawnR) * launchSpeed + (Math.random() - 0.5) * 2;
        f.vel[2] = (f.pos[2] / spawnR) * launchSpeed + (Math.random() - 0.5) * 2;
      }

      // Update position & tumble
      f.obj.transform.matrix[12] = f.pos[0];
      f.obj.transform.matrix[13] = f.pos[1];
      f.obj.transform.matrix[14] = f.pos[2];

      f.obj.transform.rotateX(f.rot[0]);
      f.obj.transform.rotateY(f.rot[1]);
      f.obj.transform.rotateZ(f.rot[2]);
      f.obj.transform.modified();

      // Color trail
      if (!STATE.magicMode) {
        const colorRatio = (dist / CONFIG.BOUNDS_RADIUS) + (i / flyingCount) * 0.5;
        f.obj.color = getPaletteColor(STATE.activeColorTheme, colorRatio, STATE.time * 1.5);
      }
    }

    // ------------------------------------------------------------------------
    // C. Cinematic Auto-Orbit Camera
    // ------------------------------------------------------------------------
    if (STATE.autoOrbitCamera && STATE.renderer && STATE.renderer.camera) {
      STATE.cameraAngle += dt * 0.28 * STATE.speed;
      const camX = Math.sin(STATE.cameraAngle) * STATE.cameraRadius;
      const camZ = Math.cos(STATE.cameraAngle) * STATE.cameraRadius;
      const camY = STATE.cameraElevation + Math.sin(STATE.cameraAngle * 0.7) * 45;

      STATE.renderer.camera.position = [camX, camY, camZ];
      STATE.renderer.camera.focus = [0, 0, 0];
    }
  }

  // --------------------------------------------------------------------------
  // Morph to Target Formation
  // --------------------------------------------------------------------------
  function setFormation(name) {
    if (!FORMATION_GENERATORS[name]) return;
    STATE.activeFormation = name;

    const generator = FORMATION_GENERATORS[name];
    for (let i = 0; i < coreCubes.length; i++) {
      const target = generator(i, coreCubes.length);
      coreCubes[i].targetPos = target;
    }

    // Update UI buttons
    document.querySelectorAll('[data-formation]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.formation === name);
    });

    const label = name.charAt(0).toUpperCase() + name.slice(1);
    const badgeEl = document.getElementById('active-formation-badge');
    if (badgeEl) badgeEl.textContent = label;
    showToast(`Formation: ${label}`);
  }

  // --------------------------------------------------------------------------
  // Color Theme & Magic Mode Controls
  // --------------------------------------------------------------------------
  function setColorTheme(themeName) {
    if (!COLOR_THEMES[themeName]) return;
    STATE.activeColorTheme = themeName;

    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });

    showToast(`Palette: ${themeName.toUpperCase()}`);
  }

  function toggleMagicMode() {
    STATE.magicMode = !STATE.magicMode;
    const allCubes = [...coreCubes.map(c => c.obj), ...flyingCubes.map(f => f.obj)];
    for (let i = 0; i < allCubes.length; i++) {
      allCubes[i].magicmode = STATE.magicMode;
    }

    const magicBtn = document.getElementById('magic-mode-btn');
    if (magicBtn) magicBtn.classList.toggle('active', STATE.magicMode);
    showToast(STATE.magicMode ? '✨ XTK Magic Mode: ON (Prismatic Normals)' : 'Color Shading Restored');
  }

  // --------------------------------------------------------------------------
  // Interactive Effects (Shockwaves, Bursts, Spawns)
  // --------------------------------------------------------------------------
  function triggerShockwave() {
    STATE.shockwaveIntensity = 1.0;
    if (audioContext && audioContext.state === 'running') {
      playKick(audioContext.currentTime);
    }
    showToast('💥 Kinetic Shockwave Blast!');
  }

  function launchMeteorBurst() {
    const burstCount = Math.min(25, flyingCubes.length);
    for (let i = 0; i < burstCount; i++) {
      const f = flyingCubes[i];
      f.pos = [0, 0, 0];
      const speed = Math.random() * 8 + 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      f.vel = [
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * speed,
        Math.cos(phi) * Math.sin(theta) * speed
      ];
      f.active = true;
      f.obj.visible = true;
    }
    showToast('🚀 Meteor Swarm Launched!');
  }

  function setCameraAngle(type) {
    if (!STATE.renderer || !STATE.renderer.camera) return;
    STATE.autoOrbitCamera = false;
    const orbitBtn = document.getElementById('auto-orbit-btn');
    if (orbitBtn) orbitBtn.classList.remove('active');

    switch (type) {
      case 'front':
        STATE.renderer.camera.position = [0, 40, 420];
        break;
      case 'iso':
        STATE.renderer.camera.position = [280, 240, 320];
        break;
      case 'top':
        STATE.renderer.camera.position = [0, 520, 10];
        break;
      case 'macro':
        STATE.renderer.camera.position = [0, 10, 140];
        break;
      case 'dramatic':
        STATE.renderer.camera.position = [220, -260, 220];
        break;
    }
    STATE.renderer.camera.focus = [0, 0, 0];
    showToast(`Camera: ${type.toUpperCase()}`);
  }

  // --------------------------------------------------------------------------
  // UI Bindings & Event Listeners
  // --------------------------------------------------------------------------
  function setupUIBindings() {
    // Canvas visualizer setup
    audioCanvas = document.getElementById('audio-canvas');
    if (audioCanvas) {
      audioCanvasCtx = audioCanvas.getContext('2d');
      audioCanvas.width = 280;
      audioCanvas.height = 40;
    }

    // Play / Pause
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        STATE.isPlaying = !STATE.isPlaying;
        playPauseBtn.classList.toggle('active', !STATE.isPlaying);
        playPauseBtn.innerHTML = STATE.isPlaying ? '<span>⏸</span> Pause' : '<span>▶</span> Play';
        showToast(STATE.isPlaying ? 'Animation Resumed' : 'Animation Paused');
      });
    }

    // Formation Switchers
    document.querySelectorAll('[data-formation]').forEach(btn => {
      btn.addEventListener('click', () => {
        setFormation(btn.dataset.formation);
      });
    });

    // Theme Switchers
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        setColorTheme(btn.dataset.theme);
      });
    });

    // Magic Mode
    const magicBtn = document.getElementById('magic-mode-btn');
    if (magicBtn) {
      magicBtn.addEventListener('click', toggleMagicMode);
    }

    // Sliders
    bindSlider('speed-slider', 'speed-val', (v) => { STATE.speed = parseFloat(v); return v + 'x'; });
    bindSlider('amp-slider', 'amp-val', (v) => { STATE.waveAmp = parseFloat(v); return v; });
    bindSlider('freq-slider', 'freq-val', (v) => { STATE.waveFreq = parseFloat(v); return v; });
    bindSlider('flying-slider', 'flying-val', (v) => {
      STATE.activeFlyingCount = parseInt(v);
      const flyingBadge = document.getElementById('flying-count-badge');
      if (flyingBadge) flyingBadge.textContent = v;
      return v;
    });

    // Action Triggers
    const shockwaveBtn = document.getElementById('shockwave-btn');
    if (shockwaveBtn) shockwaveBtn.addEventListener('click', triggerShockwave);

    const burstBtn = document.getElementById('burst-btn');
    if (burstBtn) burstBtn.addEventListener('click', launchMeteorBurst);

    // Attractor Toggle
    const attractorBtn = document.getElementById('attractor-btn');
    if (attractorBtn) {
      attractorBtn.addEventListener('click', () => {
        STATE.attractorEnabled = !STATE.attractorEnabled;
        attractorBtn.classList.toggle('active', STATE.attractorEnabled);
        showToast(`Gravity Attractor: ${STATE.attractorEnabled ? 'ON' : 'OFF'}`);
      });
    }

    // Auto Orbit
    const orbitBtn = document.getElementById('auto-orbit-btn');
    if (orbitBtn) {
      orbitBtn.addEventListener('click', () => {
        STATE.autoOrbitCamera = !STATE.autoOrbitCamera;
        orbitBtn.classList.toggle('active', STATE.autoOrbitCamera);
        showToast(`Cinematic Orbit: ${STATE.autoOrbitCamera ? 'ON' : 'OFF'}`);
      });
    }

    // Camera Presets
    document.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        setCameraAngle(btn.dataset.cam);
      });
    });

    // Audio Engine Toggle
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        if (!audioContext) {
          initAudioEngine();
          audioBtn.classList.add('active');
          audioBtn.innerHTML = '<span>🔊</span> Beat Synth: ON';
        } else {
          STATE.audioEnabled = !STATE.audioEnabled;
          audioBtn.classList.toggle('active', STATE.audioEnabled);
          audioBtn.innerHTML = STATE.audioEnabled ? '<span>🔊</span> Beat Synth: ON' : '<span>🔇</span> Beat Synth: OFF';
          showToast(`Sound Engine: ${STATE.audioEnabled ? 'ON' : 'MUTED'}`);
        }
      });
    }

    // Microphone Reactive Input Toggle
    const micBtn = document.getElementById('mic-toggle-btn');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast('Microphone not supported in this browser');
          return;
        }
        if (!audioContext) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          audioContext = new AudioCtx();
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const source = audioContext.createMediaStreamSource(stream);
          if (!analyserNode) {
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 64;
            audioDataArray = new Uint8Array(analyserNode.frequencyBinCount);
          }
          source.connect(analyserNode);
          STATE.audioEnabled = true;
          micBtn.classList.add('active');
          showToast('🎙️ Live Microphone Input Connected');
        }).catch(err => {
          console.warn('Mic permission error:', err);
          showToast('Microphone access denied');
        });
      });
    }

    // Sidebar Toggle
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.getElementById('controls-sidebar');
    if (toggleSidebarBtn && sidebar) {
      toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        toggleSidebarBtn.classList.toggle('active', !sidebar.classList.contains('hidden'));
      });
    }

    // Canvas Click / Fire Burst
    window.addEventListener('click', (e) => {
      // Ignore clicks on HUD interactive controls
      if (e.target.closest('.interactive')) return;
      // Resume audio if suspended by autoplay policy
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      triggerShockwave();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          const pBtn = document.getElementById('play-pause-btn');
          if (pBtn) pBtn.click();
          break;
        case '1': setFormation('tesseract'); break;
        case '2': setFormation('helix'); break;
        case '3': setFormation('skyline'); break;
        case '4': setFormation('rings'); break;
        case '5': setFormation('trefoil'); break;
        case '6': setFormation('vortex'); break;
        case 'c':
          cycleColorTheme();
          break;
        case 'm':
          toggleMagicMode();
          break;
        case 'f':
          launchMeteorBurst();
          break;
        case 'b':
          triggerShockwave();
          break;
        case 'o':
          const oBtn = document.getElementById('auto-orbit-btn');
          if (oBtn) oBtn.click();
          break;
        case 'h':
          const sBtn = document.getElementById('toggle-sidebar-btn');
          if (sBtn) sBtn.click();
          break;
        case 'r':
          setCameraAngle('iso');
          break;
      }
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
      if (STATE.renderer && STATE.renderer.onResize_) {
        STATE.renderer.onResize_();
      }
    });
  }

  function cycleColorTheme() {
    const themes = Object.keys(COLOR_THEMES);
    const curIdx = themes.indexOf(STATE.activeColorTheme);
    const nextTheme = themes[(curIdx + 1) % themes.length];
    setColorTheme(nextTheme);
  }

  function bindSlider(id, valId, callback) {
    const slider = document.getElementById(id);
    const display = document.getElementById(valId);
    if (!slider || !display) return;

    slider.addEventListener('input', (e) => {
      const res = callback(e.target.value);
      display.textContent = res;
    });
  }

  function updateUIElements() {
    const coreCountBadge = document.getElementById('core-count-badge');
    if (coreCountBadge) coreCountBadge.textContent = CONFIG.CORE_CUBE_COUNT;

    const flyingCountBadge = document.getElementById('flying-count-badge');
    if (flyingCountBadge) flyingCountBadge.textContent = STATE.activeFlyingCount;
  }

  let toastTimeout = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  // --------------------------------------------------------------------------
  // Bootstrapping
  // --------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    setupUIBindings();
    initXTK();
  });

})();
