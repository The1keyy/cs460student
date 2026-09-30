/**
 * ============================================================================
 * CUBE GALAXY - XTK WebGL 3D Visualization
 * An interactive, kinetic 3D celestial system built with XTK (X.renderer3D + X.cube).
 * ============================================================================
 */

'use strict';

// ============================================================================
// CONFIGURATION CONSTANTS
// Cube counts, sizes, orbital radii, inclination angles, rotation speeds, colors
// ============================================================================
const CONFIG = {
  // Global animation speed multiplier
  SPEED: 1.0,

  // 1. Central Core: One large cube in the center (blue), slowly spinning on two axes
  CORE_COUNT: 1,
  CORE_SIZE: 52,
  CORE_SPIN_X: 0.35,              // Rotation speed around X-axis (rad/s)
  CORE_SPIN_Y: 0.55,              // Rotation speed around Y-axis (rad/s)
  CORE_BASE_HUE: 0.60,            // Base blue hue (~216 deg)
  CORE_COLOR_SPEED: 0.035,        // Core changes color more slowly than the rest

  // 2. Inner Cluster: 8 small cubes (gold/orange) in a tight ring around core, each spinning on its own
  INNER_COUNT: 8,
  INNER_SIZE: 13,
  INNER_RADIUS: 76,               // Tight ring around the core
  INNER_ORBIT_SPEED: 0.30,        // Orbital rotation around core (rad/s)
  INNER_SPIN_SPEED: 1.8,          // Individual spin speed multiplier
  INNER_BASE_HUE: 0.11,           // Base gold/orange hue (~40 deg)

  // 3. Main Ring: 12 medium cubes in a wide ring tilted about 15 degrees, orbiting the core
  MAIN_COUNT: 12,
  MAIN_SIZE: 22,
  MAIN_RADIUS: 195,               // Wide orbital ring
  MAIN_TILT_DEG: 15,              // Tilted ~15 degrees
  MAIN_ORBIT_SPEED: 0.45,         // Direction of travel (counter-clockwise)
  MAIN_SPIN_SPEED: 0.8,           // Self-rotation speed of medium cubes
  MAIN_BASE_HUE: 0.0,             // Rainbow wave starting hue

  // 4. Counter Ring: 6 smaller cubes (green/teal) on a narrower ring tilted opposite way (~25 deg)
  COUNTER_COUNT: 6,
  COUNTER_SIZE: 16,
  COUNTER_RADIUS: 135,            // Narrower ring than main ring
  COUNTER_TILT_DEG: -25,          // Tilted opposite way (~25 deg) so the rings cross
  COUNTER_ORBIT_SPEED: -0.65,     // Opposite orbital direction (clockwise)
  COUNTER_SPIN_SPEED: 1.1,        // Self-rotation speed
  COUNTER_BASE_HUE: 0.46,         // Base green/teal hue (~165 deg)

  // 5. Moons: 2 tiny white cubes, each orbiting one of the main-ring cubes
  MOON_COUNT: 2,
  MOON_SIZE: 7,
  MOON_COLOR: [1.0, 1.0, 1.0],    // Pure brilliant white
  MOON_ORBIT_RADIUS: 28,          // Orbit radius around host main-ring cube
  MOON_ORBIT_SPEED: 2.6,          // Orbit speed around host cube
  MOON_PARENT_INDICES: [0, 6],    // Attached to main-ring cubes at opposite sides

  // 6. Stars: A scattering of tiny dim cubes in the background
  STAR_COUNT: 80,
  STAR_SIZE: 3.5,
  STAR_MIN_RADIUS: 360,
  STAR_MAX_RADIUS: 660,
  STAR_BASE_COLOR: [0.35, 0.38, 0.48], // Dim silver-blue
  STAR_TWINKLE_SPEED: 1.6,

  // Rainbow ripple wave settings for rings
  RING_COLOR_SPEED: 0.12,         // Speed of rainbow ripple wave
  RING_SATURATION: 0.90,          // Vibrant color saturation
  RING_LIGHTNESS: 0.55,           // Rich lightness

  // Camera & Background
  BACKGROUND_COLOR: [5 / 255, 5 / 255, 15 / 255], // Near-black #05050f
  CAMERA_INITIAL_POS: [0, 150, 480],             // Slight isometric downward view
  CAMERA_INITIAL_FOCUS: [0, 0, 0]
};

// ============================================================================
// COLOR HELPER: HSL to RGB
// Converts hue [0..1], saturation [0..1], and lightness [0..1] to [r, g, b] (0..1)
// ============================================================================
function hslToRgb(h, s, l) {
  // Normalize hue into [0, 1)
  h = ((h % 1) + 1) % 1;

  if (s === 0) {
    return [l, l, l];
  }

  const hue2rgb = (p, q, t) => {
    let val = t;
    if (val < 0) val += 1;
    if (val > 1) val -= 1;
    if (val < 1 / 6) return p + (q - p) * 6 * val;
    if (val < 1 / 2) return q;
    if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return [r, g, b];
}

// ============================================================================
// MATRIX TRANSFORMATION HELPER
// Sets a 4x4 column-major transformation matrix from translation and Euler rotations (Z * Y * X)
// ============================================================================
function setMatrixTRS(matrix, tx, ty, tz, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Column 0
  matrix[0] = cz * cy;
  matrix[1] = sz * cy;
  matrix[2] = -sy;
  matrix[3] = 0;

  // Column 1
  matrix[4] = cz * sy * sx - sz * cx;
  matrix[5] = sz * sy * sx + cz * cx;
  matrix[6] = cy * sx;
  matrix[7] = 0;

  // Column 2
  matrix[8] = cz * sy * cx + sz * sx;
  matrix[9] = sz * sy * cx - cz * sx;
  matrix[10] = cy * cx;
  matrix[11] = 0;

  // Column 3 (Translation)
  matrix[12] = tx;
  matrix[13] = ty;
  matrix[14] = tz;
  matrix[15] = 1;
}

// ============================================================================
// SCENE STATE & OBJECT STORAGE
// ============================================================================
const SCENE = {
  renderer: null,
  time: 0,
  lastTimestamp: 0,

  // 1. Central Core
  core: null,

  // 2. Inner Cluster (8 cubes)
  innerCubes: [],

  // 3. Main Ring (12 cubes)
  mainCubes: [],

  // 4. Counter Ring (6 cubes)
  counterCubes: [],

  // 5. Moons (2 cubes)
  moons: [],

  // 6. Stars (80 cubes)
  stars: []
};

// ============================================================================
// INITIALIZATION
// ============================================================================
function initCubeGalaxy() {
  const XTK = (typeof window !== 'undefined' && window.X) ? window.X : (typeof globalThis !== 'undefined' && globalThis.X ? globalThis.X : null);
  if (!XTK) {
    console.error('XTK library failed to load!');
    return;
  }
  const X = XTK;

  // 1. Create and configure XTK 3D Renderer
  const renderer = new X.renderer3D();
  renderer.container = 'container';
  renderer.bgColor = CONFIG.BACKGROUND_COLOR;
  renderer.config.PROGRESSBAR_ENABLED = false;
  renderer.config.PICKING_ENABLED = false;
  renderer.init();
  SCENE.renderer = renderer;

  // 2. Build Component 1: Central Core (1 large cube, initial blue)
  {
    const coreCube = new X.cube();
    coreCube.lengthX = coreCube.lengthY = coreCube.lengthZ = CONFIG.CORE_SIZE;
    coreCube.center = [0, 0, 0];
    coreCube.color = hslToRgb(CONFIG.CORE_BASE_HUE, 0.85, 0.52);
    renderer.add(coreCube);

    setMatrixTRS(coreCube.transform.matrix, 0, 0, 0, 0, 0, 0);
    coreCube.transform.modified();

    SCENE.core = {
      cube: coreCube
    };
  }

  // 3. Build Component 2: Inner Cluster (8 small cubes, tight ring around core)
  for (let i = 0; i < CONFIG.INNER_COUNT; i++) {
    const cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.INNER_SIZE;
    cube.center = [0, 0, 0];

    const initialHue = (CONFIG.INNER_BASE_HUE + i / CONFIG.INNER_COUNT) % 1.0;
    cube.color = hslToRgb(initialHue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
    renderer.add(cube);

    const angle = (i / CONFIG.INNER_COUNT) * Math.PI * 2;
    const x = CONFIG.INNER_RADIUS * Math.cos(angle);
    const z = CONFIG.INNER_RADIUS * Math.sin(angle);
    setMatrixTRS(cube.transform.matrix, x, 0, z, 0, 0, 0);
    cube.transform.modified();

    SCENE.innerCubes.push({
      cube: cube,
      index: i,
      spinOffset: i * 0.7
    });
  }

  // 4. Build Component 3: Main Ring (12 medium cubes, wide ring tilted ~15 deg)
  const mainTiltRad = (CONFIG.MAIN_TILT_DEG * Math.PI) / 180;
  for (let i = 0; i < CONFIG.MAIN_COUNT; i++) {
    const cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.MAIN_SIZE;
    cube.center = [0, 0, 0];

    const initialHue = (CONFIG.MAIN_BASE_HUE + i / CONFIG.MAIN_COUNT) % 1.0;
    cube.color = hslToRgb(initialHue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
    renderer.add(cube);

    const angle = (i / CONFIG.MAIN_COUNT) * Math.PI * 2;
    const rawX = CONFIG.MAIN_RADIUS * Math.cos(angle);
    const rawZ = CONFIG.MAIN_RADIUS * Math.sin(angle);
    const x = rawX;
    const y = -rawZ * Math.sin(mainTiltRad);
    const z = rawZ * Math.cos(mainTiltRad);

    setMatrixTRS(cube.transform.matrix, x, y, z, 0, 0, 0);
    cube.transform.modified();

    SCENE.mainCubes.push({
      cube: cube,
      index: i,
      x: x,
      y: y,
      z: z
    });
  }

  // 5. Build Component 4: Counter Ring (6 smaller cubes, narrower ring tilted ~ -25 deg)
  const counterTiltRad = (CONFIG.COUNTER_TILT_DEG * Math.PI) / 180;
  for (let j = 0; j < CONFIG.COUNTER_COUNT; j++) {
    const cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.COUNTER_SIZE;
    cube.center = [0, 0, 0];

    const initialHue = (CONFIG.COUNTER_BASE_HUE + j / CONFIG.COUNTER_COUNT) % 1.0;
    cube.color = hslToRgb(initialHue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
    renderer.add(cube);

    const angle = (j / CONFIG.COUNTER_COUNT) * Math.PI * 2;
    const rawX = CONFIG.COUNTER_RADIUS * Math.cos(angle);
    const rawZ = CONFIG.COUNTER_RADIUS * Math.sin(angle);
    const x = rawX;
    const y = -rawZ * Math.sin(counterTiltRad);
    const z = rawZ * Math.cos(counterTiltRad);

    setMatrixTRS(cube.transform.matrix, x, y, z, 0, 0, 0);
    cube.transform.modified();

    SCENE.counterCubes.push({
      cube: cube,
      index: j
    });
  }

  // 6. Build Component 5: Moons (2 tiny white cubes orbiting selected main-ring cubes)
  for (let m = 0; m < CONFIG.MOON_COUNT; m++) {
    const cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.MOON_SIZE;
    cube.center = [0, 0, 0];
    cube.color = [...CONFIG.MOON_COLOR];
    renderer.add(cube);

    const parentIdx = CONFIG.MOON_PARENT_INDICES[m] || 0;
    const parentCube = SCENE.mainCubes[parentIdx];
    const initialX = parentCube ? parentCube.x + CONFIG.MOON_ORBIT_RADIUS : 0;
    const initialY = parentCube ? parentCube.y : 0;
    const initialZ = parentCube ? parentCube.z : 0;

    setMatrixTRS(cube.transform.matrix, initialX, initialY, initialZ, 0, 0, 0);
    cube.transform.modified();

    SCENE.moons.push({
      cube: cube,
      index: m,
      parentIndex: parentIdx,
      speedMultiplier: m === 0 ? 1.0 : 1.15,
      phaseOffset: m === 0 ? 0 : Math.PI / 2
    });
  }

  // 7. Build Component 6: Stars (Scattering of 80 tiny dim cubes in the background)
  for (let s = 0; s < CONFIG.STAR_COUNT; s++) {
    const cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CONFIG.STAR_SIZE;
    cube.center = [0, 0, 0];

    // Uniform random direction on a sphere with random radial depth
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.asin(2 * Math.random() - 1);
    const radius = CONFIG.STAR_MIN_RADIUS + Math.random() * (CONFIG.STAR_MAX_RADIUS - CONFIG.STAR_MIN_RADIUS);

    const baseX = radius * Math.cos(phi) * Math.cos(theta);
    const baseY = radius * Math.sin(phi);
    const baseZ = radius * Math.cos(phi) * Math.sin(theta);

    // Subtle variations of dim silver-blue / faint gold hues
    const tint = Math.random();
    let starColor;
    if (tint < 0.6) {
      starColor = [CONFIG.STAR_BASE_COLOR[0], CONFIG.STAR_BASE_COLOR[1], CONFIG.STAR_BASE_COLOR[2]];
    } else if (tint < 0.85) {
      starColor = [0.38, 0.42, 0.52]; // Soft ice-blue
    } else {
      starColor = [0.45, 0.42, 0.35]; // Warm faint amber
    }

    const brightness = 0.7 + Math.random() * 0.3;
    cube.color = [starColor[0] * brightness, starColor[1] * brightness, starColor[2] * brightness];
    renderer.add(cube);

    setMatrixTRS(cube.transform.matrix, baseX, baseY, baseZ, 0, 0, 0);
    cube.transform.modified();

    SCENE.stars.push({
      cube: cube,
      x0: baseX,
      y0: baseY,
      z0: baseZ,
      baseColor: starColor,
      baseBrightness: brightness,
      phase: Math.random() * Math.PI * 2
    });
  }

  // 8. Start WebGL Rendering loop
  renderer.render();

  // Set initial camera perspective (isometric framing of the Cube Galaxy)
  if (renderer.camera) {
    renderer.camera.position = [...CONFIG.CAMERA_INITIAL_POS];
    renderer.camera.focus = [...CONFIG.CAMERA_INITIAL_FOCUS];
  }

  // 9. Main Animation Loop: Updated inside renderer.onRender from one time variable
  renderer.onRender = onRenderFrame;

  // Window resize handler
  window.addEventListener('resize', () => {
    if (SCENE.renderer) {
      SCENE.renderer.resize();
    }
  });
}

// ============================================================================
// CONTINUOUS ANIMATION & COLOR UPDATE LOOP
// Everything is updated inside renderer.onRender from one time variable
// ============================================================================
function onRenderFrame() {
  const now = performance.now();
  const dt = SCENE.lastTimestamp === 0 ? 0.016 : Math.min((now - SCENE.lastTimestamp) / 1000, 0.1);
  SCENE.lastTimestamp = now;

  // Single global time variable driving all motions and color ripples
  SCENE.time += dt * CONFIG.SPEED;
  const t = SCENE.time;

  // --------------------------------------------------------------------------
  // 1. UPDATE CORE: Slowly spinning on two axes, slow color evolution
  // --------------------------------------------------------------------------
  if (SCENE.core) {
    const rx = t * CONFIG.CORE_SPIN_X;
    const ry = t * CONFIG.CORE_SPIN_Y;
    setMatrixTRS(SCENE.core.cube.transform.matrix, 0, 0, 0, rx, ry, 0);
    SCENE.core.cube.transform.modified();

    // The core changes color more slowly than the rest (base blue shifting gradually)
    const coreHue = (CONFIG.CORE_BASE_HUE + t * CONFIG.CORE_COLOR_SPEED) % 1.0;
    SCENE.core.cube.color = hslToRgb(coreHue, 0.85, 0.52);
  }

  // --------------------------------------------------------------------------
  // 2. UPDATE INNER CLUSTER: 8 cubes in tight ring, each spinning on its own, color ripple
  // --------------------------------------------------------------------------
  for (let i = 0; i < SCENE.innerCubes.length; i++) {
    const item = SCENE.innerCubes[i];
    const angle = (i / CONFIG.INNER_COUNT) * Math.PI * 2 + t * CONFIG.INNER_ORBIT_SPEED;

    const x = CONFIG.INNER_RADIUS * Math.cos(angle);
    const y = Math.sin(angle * 2) * 3; // subtle wave bob
    const z = CONFIG.INNER_RADIUS * Math.sin(angle);

    // Each cube spins on its own individual axes
    const rx = t * (1.6 + 0.3 * (i % 3)) + item.spinOffset;
    const ry = t * (2.0 - 0.2 * (i % 4)) + item.spinOffset * 1.5;
    const rz = t * (1.2 + 0.25 * (i % 2));

    setMatrixTRS(item.cube.transform.matrix, x, y, z, rx, ry, rz);
    item.cube.transform.modified();

    // Color ripples around ring like a wave
    const hue = (CONFIG.INNER_BASE_HUE + t * CONFIG.RING_COLOR_SPEED + (i / CONFIG.INNER_COUNT)) % 1.0;
    item.cube.color = hslToRgb(hue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
  }

  // --------------------------------------------------------------------------
  // 3. UPDATE MAIN RING: 12 cubes in wide ring tilted ~15 deg, orbiting core, color wave
  // --------------------------------------------------------------------------
  const mainTiltRad = (CONFIG.MAIN_TILT_DEG * Math.PI) / 180;
  for (let i = 0; i < SCENE.mainCubes.length; i++) {
    const item = SCENE.mainCubes[i];
    // Orbital motion in direction of travel (counter-clockwise)
    const angle = (i / CONFIG.MAIN_COUNT) * Math.PI * 2 + t * CONFIG.MAIN_ORBIT_SPEED;

    const rawX = CONFIG.MAIN_RADIUS * Math.cos(angle);
    const rawZ = CONFIG.MAIN_RADIUS * Math.sin(angle);

    // Tilted ring plane (rotation around X-axis by +15 degrees)
    const x = rawX;
    const y = -rawZ * Math.sin(mainTiltRad);
    const z = rawZ * Math.cos(mainTiltRad);

    // Store position so child moons can reference it
    item.x = x;
    item.y = y;
    item.z = z;

    // Self-spin of medium cubes as they orbit
    const rx = t * CONFIG.MAIN_SPIN_SPEED + i * 0.5;
    const ry = t * (CONFIG.MAIN_SPIN_SPEED * 1.2) + i * 0.3;
    const rz = t * 0.4;

    setMatrixTRS(item.cube.transform.matrix, x, y, z, rx, ry, rz);
    item.cube.transform.modified();

    // Rainbow ripples around the main ring
    const hue = (CONFIG.MAIN_BASE_HUE + t * CONFIG.RING_COLOR_SPEED + (i / CONFIG.MAIN_COUNT)) % 1.0;
    item.cube.color = hslToRgb(hue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
  }

  // --------------------------------------------------------------------------
  // 4. UPDATE COUNTER RING: 6 cubes on narrower ring tilted opposite way (~ -25 deg)
  //    Orbiting in opposite direction so the two rings cross
  // --------------------------------------------------------------------------
  const counterTiltRad = (CONFIG.COUNTER_TILT_DEG * Math.PI) / 180;
  for (let j = 0; j < SCENE.counterCubes.length; j++) {
    const item = SCENE.counterCubes[j];
    // Orbiting in opposite direction (clockwise)
    const angle = (j / CONFIG.COUNTER_COUNT) * Math.PI * 2 + t * CONFIG.COUNTER_ORBIT_SPEED;

    const rawX = CONFIG.COUNTER_RADIUS * Math.cos(angle);
    const rawZ = CONFIG.COUNTER_RADIUS * Math.sin(angle);

    // Oppositely tilted ring plane (rotation around X-axis by -25 degrees)
    const x = rawX;
    const y = -rawZ * Math.sin(counterTiltRad);
    const z = rawZ * Math.cos(counterTiltRad);

    // Self-spin
    const rx = -t * CONFIG.COUNTER_SPIN_SPEED + j * 0.6;
    const ry = t * (CONFIG.COUNTER_SPIN_SPEED * 1.3) + j * 0.4;
    const rz = -t * 0.5;

    setMatrixTRS(item.cube.transform.matrix, x, y, z, rx, ry, rz);
    item.cube.transform.modified();

    // Color ripples around counter ring like a wave
    const hue = (CONFIG.COUNTER_BASE_HUE + t * CONFIG.RING_COLOR_SPEED + (j / CONFIG.COUNTER_COUNT)) % 1.0;
    item.cube.color = hslToRgb(hue, CONFIG.RING_SATURATION, CONFIG.RING_LIGHTNESS);
  }

  // --------------------------------------------------------------------------
  // 5. UPDATE MOONS: 2 tiny white cubes, each orbiting one of the main-ring cubes
  // --------------------------------------------------------------------------
  for (let m = 0; m < SCENE.moons.length; m++) {
    const moon = SCENE.moons[m];
    const parent = SCENE.mainCubes[moon.parentIndex];
    if (!parent) continue;

    const moonAngle = t * CONFIG.MOON_ORBIT_SPEED * moon.speedMultiplier + moon.phaseOffset;
    let localX, localY, localZ;

    if (m === 0) {
      // Moon 0: Inclined local orbit
      localX = CONFIG.MOON_ORBIT_RADIUS * Math.cos(moonAngle);
      localY = CONFIG.MOON_ORBIT_RADIUS * Math.sin(moonAngle) * Math.cos(0.6);
      localZ = CONFIG.MOON_ORBIT_RADIUS * Math.sin(moonAngle) * Math.sin(0.6);
    } else {
      // Moon 1: Perpendicular / tilted local orbit
      localX = CONFIG.MOON_ORBIT_RADIUS * Math.cos(moonAngle) * 0.7;
      localY = CONFIG.MOON_ORBIT_RADIUS * Math.sin(moonAngle);
      localZ = CONFIG.MOON_ORBIT_RADIUS * Math.cos(moonAngle) * 0.7;
    }

    const worldX = parent.x + localX;
    const worldY = parent.y + localY;
    const worldZ = parent.z + localZ;

    const rx = t * 2.8 + m;
    const ry = t * 3.2;

    setMatrixTRS(moon.cube.transform.matrix, worldX, worldY, worldZ, rx, ry, 0);
    moon.cube.transform.modified();

    // Moons stay pure brilliant white
    moon.cube.color = [1.0, 1.0, 1.0];
  }

  // --------------------------------------------------------------------------
  // 6. UPDATE STARS: Scattering of tiny dim cubes in background with subtle twinkle
  // --------------------------------------------------------------------------
  const celestialDrift = t * 0.015; // Slow cosmic rotation of the starfield
  const cosDrift = Math.cos(celestialDrift);
  const sinDrift = Math.sin(celestialDrift);

  for (let s = 0; s < SCENE.stars.length; s++) {
    const star = SCENE.stars[s];

    // Slow celestial rotation around galaxy Y axis
    const worldX = cosDrift * star.x0 - sinDrift * star.z0;
    const worldZ = sinDrift * star.x0 + cosDrift * star.z0;
    const worldY = star.y0;

    setMatrixTRS(star.cube.transform.matrix, worldX, worldY, worldZ, 0, 0, 0);
    star.cube.transform.modified();

    // Subtle twinkle pulsation
    const twinkle = star.baseBrightness * (0.75 + 0.25 * Math.sin(t * CONFIG.STAR_TWINKLE_SPEED + star.phase));
    star.cube.color = [
      star.baseColor[0] * twinkle,
      star.baseColor[1] * twinkle,
      star.baseColor[2] * twinkle
    ];
  }
}

// ============================================================================
// BOOTSTRAP: Initialize when document is ready
// ============================================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCubeGalaxy);
} else {
  initCubeGalaxy();
}
