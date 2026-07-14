// PYRE engine — the deterministic executor.
// It knows nothing about "meaning". It takes:
//   1) a SOURCE image  -> a cloud of target points (weighted by luminance)
//   2) a SHOW (the choreography DSL) -> how those points scatter, assemble, breathe, swirl
// The LLM never computes a coordinate. The LLM only authors the SHOW.
//
// Critic loop (window.PYRE):  applyShow() -> settle() -> metrics() -> screenshot -> repeat.
// Renders are DETERMINISTIC (seeded RNG) so the critic's edits are the only variable.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- seeded RNG (mulberry32) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(1234);

// ---------- easing ----------
const EASE = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

// ---------- ember palette (luminance -> fire color) ----------
const RAMP = [
  [0.00, [0.10, 0.02, 0.03]], [0.30, [0.65, 0.10, 0.02]], [0.55, [0.98, 0.35, 0.05]],
  [0.78, [1.00, 0.62, 0.16]], [1.00, [1.00, 0.96, 0.78]],
];
function ember(l) {
  for (let i = 1; i < RAMP.length; i++) {
    if (l <= RAMP[i][0]) {
      const [a0, c0] = RAMP[i - 1], [a1, c1] = RAMP[i];
      const t = (l - a0) / (a1 - a0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

// ---------- glow sprite ----------
function glowTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,240,210,0.85)');
  grad.addColorStop(0.6, 'rgba(255,150,60,0.25)'); grad.addColorStop(1.0, 'rgba(255,120,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}

// ---------- source ----------
function drawWordmark(text = 'PYRE') {
  const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = '900 180px ui-monospace, "SF Mono", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 6);
  return c;
}
function imgToCanvas(img, maxW = 460) {
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h); return c;
}

let sourceCanvas = null;
let inkGrid = null;                 // {gw, gh, ink:Set<"gx,gy">} for the critic
const GRID = 72;

function computeInk(canvas) {
  const w = canvas.width, h = canvas.height;
  const gw = GRID, gh = Math.max(1, Math.round(GRID * h / w));
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const ink = new Set();
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let sum = 0, n = 0;
    const x0 = (gx * w / gw) | 0, x1 = ((gx + 1) * w / gw) | 0;
    const y0 = (gy * h / gh) | 0, y1 = ((gy + 1) * h / gh) | 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4; sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255; n++;
    }
    if (n && sum / n > 0.16) ink.add(gx + ',' + gy);
  }
  return { gw, gh, ink };
}

function extractTargets(canvas, N, depth = 2.6, jitter = 0.25) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const aspect = w / h;
  const spanX = 11 * Math.min(1, aspect), spanY = 11 / Math.max(1, aspect);
  const out = []; let tries = 0, cap = N * 60;
  while (out.length < N && tries < cap) {
    tries++;
    const px = (rng() * w) | 0, py = (rng() * h) | 0;
    const i = (py * w + px) * 4;
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    if (lum < 0.06) continue;
    if (rng() > lum * 0.95 + 0.05) continue;
    const x = (px / w - 0.5) * spanX, y = -(py / h - 0.5) * spanY;
    const z = (lum - 0.5) * depth + (rng() - 0.5) * jitter;
    const col = ember(lum);
    out.push({ x, y, z, r: col[0], g: col[1], b: col[2], lum, px, py, gw: w, gh: h });
  }
  return out;
}

// ---------- FORM mode: sample points on described 3D primitives ----------
// The LLM authors a scene of parts (sphere/capsule/box/cone). We fill their
// surfaces with points -> a real volumetric target, not a flattened photo.
function hexRgb(h) {
  h = (h || '#ffcf6a').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function unit() { const u = rng(), v = rng(), th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1); return [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)]; }
function perp(ax, ay, az) {           // two unit vectors perpendicular to axis
  let ux = ay, uy = -ax, uz = 0, ul = Math.hypot(ux, uy, uz);
  if (ul < 1e-4) { ux = 0; uy = az; uz = -ay; ul = Math.hypot(ux, uy, uz); }
  ux /= ul; uy /= ul; uz /= ul;
  const wx = ay * uz - az * uy, wy = az * ux - ax * uz, wz = ax * uy - ay * ux;
  return [ux, uy, uz, wx, wy, wz];
}
function densifyTube(part) {   // Catmull-Rom spline through path[] with a radius profile
  const path = part.path || [], R = Array.isArray(part.r) ? part.r : path.map(() => part.r || 0.5), seg = part.seg || 8, out = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[Math.max(0, i - 1)], p1 = path[i], p2 = path[i + 1], p3 = path[Math.min(path.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, tt = t * t, ttt = tt * t;
      const q = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * tt + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * ttt);
      out.push({ p: [q(0), q(1), q(2)], r: R[i] + (R[i + 1] - R[i]) * t });
    }
  }
  out.push({ p: path[path.length - 1], r: R[R.length - 1] });
  part._dense = out; return out;
}
function samplePart(part, n) {
  const out = [], col = hexRgb(part.color), lum = 0.35 + 0.65 * Math.max(...col);
  const add = (x, y, z) => out.push({ x, y, z, r: col[0], g: col[1], b: col[2], lum, px: 0, py: 0, gw: 1, gh: 1 });
  const S = part.shape;
  if (S === 'sphere') {
    const c = part.at, r = part.r || 1;
    for (let i = 0; i < n; i++) { const d = unit(), rr = r * (part.solid ? Math.cbrt(rng()) : 1); add(c[0] + d[0] * rr, c[1] + d[1] * rr, c[2] + d[2] * rr); }
  } else if (S === 'capsule') {
    const a = part.a, b = part.b, r = part.r || 0.5;
    let ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2]; const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
    const [ux, uy, uz, wx, wy, wz] = perp(ax, ay, az);
    for (let i = 0; i < n; i++) {
      const t = rng(), ang = 2 * Math.PI * rng(), rr = r * (part.solid ? Math.sqrt(rng()) : 1);
      const cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t, cz = a[2] + (b[2] - a[2]) * t;
      add(cx + (ux * Math.cos(ang) + wx * Math.sin(ang)) * rr, cy + (uy * Math.cos(ang) + wy * Math.sin(ang)) * rr, cz + (uz * Math.cos(ang) + wz * Math.sin(ang)) * rr);
    }
  } else if (S === 'box') {
    const c = part.at, s = part.size || [1, 1, 1];
    for (let i = 0; i < n; i++) add(c[0] + (rng() - 0.5) * s[0], c[1] + (rng() - 0.5) * s[1], c[2] + (rng() - 0.5) * s[2]);
  } else if (S === 'cone') {
    const base = part.at, h = part.h || 1, r = part.r || 0.4, dir = part.dir || [0, 1, 0];
    const dl = Math.hypot(...dir) || 1, dx = dir[0] / dl, dy = dir[1] / dl, dz = dir[2] / dl;
    const [ux, uy, uz, wx, wy, wz] = perp(dx, dy, dz);
    for (let i = 0; i < n; i++) {
      const t = rng(), ang = 2 * Math.PI * rng(), rr = r * (1 - t);
      const cx = base[0] + dx * h * t, cy = base[1] + dy * h * t, cz = base[2] + dz * h * t;
      add(cx + (ux * Math.cos(ang) + wx * Math.sin(ang)) * rr, cy + (uy * Math.cos(ang) + wy * Math.sin(ang)) * rr, cz + (uz * Math.cos(ang) + wz * Math.sin(ang)) * rr);
    }
  } else if (S === 'tube') {
    const segs = part._dense || densifyTube(part);
    let L = 0; const cum = [0];
    for (let i = 0; i < segs.length - 1; i++) { L += Math.hypot(segs[i + 1].p[0] - segs[i].p[0], segs[i + 1].p[1] - segs[i].p[1], segs[i + 1].p[2] - segs[i].p[2]); cum.push(L); }
    for (let i = 0; i < n; i++) {
      const u = rng() * L; let si = 0; while (si < cum.length - 2 && cum[si + 1] < u) si++;
      const t = (u - cum[si]) / ((cum[si + 1] - cum[si]) || 1);
      const a = segs[si].p, b = segs[si + 1].p, rr0 = segs[si].r + (segs[si + 1].r - segs[si].r) * t;
      let ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2]; const dl = Math.hypot(ax, ay, az) || 1; ax /= dl; ay /= dl; az /= dl;
      const [ux, uy, uz, wx, wy, wz] = perp(ax, ay, az);
      const ang = 2 * Math.PI * rng(), rr = rr0 * (part.solid ? Math.sqrt(rng()) : 1);
      const cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t, cz = a[2] + (b[2] - a[2]) * t;
      add(cx + (ux * Math.cos(ang) + wx * Math.sin(ang)) * rr, cy + (uy * Math.cos(ang) + wy * Math.sin(ang)) * rr, cz + (uz * Math.cos(ang) + wz * Math.sin(ang)) * rr);
    }
  }
  return out;
}
// ---- SDF field: merge parts into ONE smooth continuous surface (smooth union) ----
function smin(a, b, k) {           // polynomial smooth-min: the blend at joints
  if (k <= 1e-4) return Math.min(a, b);
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}
function sdSphere(p, c, r) { return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r; }
function sdCapsule(p, a, b, r) {
  const pax = p[0] - a[0], pay = p[1] - a[1], paz = p[2] - a[2];
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  let h = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz || 1);
  h = Math.max(0, Math.min(1, h));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
function sdBox(p, c, s) {
  const qx = Math.abs(p[0] - c[0]) - s[0] / 2, qy = Math.abs(p[1] - c[1]) - s[1] / 2, qz = Math.abs(p[2] - c[2]) - s[2] / 2;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
}
function partSdf(p, part) {
  const S = part.shape;
  if (S === 'sphere') return sdSphere(p, part.at, part.r || 1);
  if (S === 'capsule') return sdCapsule(p, part.a, part.b, part.r || 0.5);
  if (S === 'box') return sdBox(p, part.at, part.size || [1, 1, 1]);
  if (S === 'cone') { const dl = Math.hypot(...(part.dir || [0, 1, 0])) || 1, d = (part.dir || [0, 1, 0]).map(v => v / dl), h = part.h || 1; return sdCapsule(p, part.at, [part.at[0] + d[0] * h, part.at[1] + d[1] * h, part.at[2] + d[2] * h], (part.r || 0.4) * 0.6); }
  if (S === 'tube') { const segs = part._dense || densifyTube(part); let d = 1e9; for (let i = 0; i < segs.length - 1; i++) d = Math.min(d, sdCapsule(p, segs[i].p, segs[i + 1].p, (segs[i].r + segs[i + 1].r) / 2)); return d; }
  return 1e9;
}
function makeField(parts, kGlobal) {
  return p => {
    let d = 1e9;
    for (let i = 0; i < parts.length; i++) {
      const di = partSdf(p, parts[i]);
      d = i === 0 ? di : smin(d, di, parts[i].blend != null ? parts[i].blend : kGlobal);
    }
    return d;
  };
}

function sampleScene(scene) {
  const parts = scene.parts || [], w = parts.map(p => p.w || 1), tot = w.reduce((a, b) => a + b, 0) || 1;
  parts.forEach(p => { if (p.shape === 'tube') densifyTube(p); });   // precompute splines once
  const N = scene.points || 8000; let all = [];
  parts.forEach((p, i) => { all = all.concat(samplePart(p, Math.max(1, Math.round(N * w[i] / tot)))); });
  if (!all.length) return all;

  // smooth: project every seed point onto the merged isosurface (Newton on the SDF).
  // this welds primitives into one continuous surface — arms flow into torso, etc.
  const k = scene.blend || 0;
  if (k > 0) {
    const field = makeField(parts, k), e = 0.03, iters = scene.smoothIters || 4;
    for (const pt of all) {
      let x = pt.x, y = pt.y, z = pt.z;
      for (let it = 0; it < iters; it++) {
        const d = field([x, y, z]);
        const gx = field([x + e, y, z]) - field([x - e, y, z]);
        const gy = field([x, y + e, z]) - field([x, y - e, z]);
        const gz = field([x, y, z + e]) - field([x, y, z - e]);
        const gl = Math.hypot(gx, gy, gz); if (gl < 1e-5) break;
        x -= d * gx / gl; y -= d * gy / gl; z -= d * gz / gl;
      }
      if (isFinite(x) && isFinite(y) && isFinite(z)) { pt.x = x; pt.y = y; pt.z = z; }  // keep seed on divergence
    }
    all = all.filter(p => isFinite(p.x) && isFinite(p.y) && isFinite(p.z));
  }

  const xs = all.map(p => p.x), ys = all.map(p => p.y), zs = all.map(p => p.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const s = 11 / Math.max(Math.max(...ys) - Math.min(...ys), 1e-3);
  all.forEach(p => { p.x = (p.x - cx) * s; p.y = (p.y - cy) * s; p.z = (p.z - cz) * s; });
  return all;
}

// ---------- renderer ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.018);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 17);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
controls.enablePan = false; controls.minDistance = 8; controls.maxDistance = 40;
controls.addEventListener('start', () => { controls.autoRotate = false; });

const material = new THREE.PointsMaterial({
  size: 0.11, map: glowTexture(), vertexColors: true,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
});
let cloud = null, targets = [], starts = [], delays = null, N = 0;
const clock = new THREE.Clock();
let showStart = 0, forced = null;   // forced != null freezes time at `forced` sec

function scatterPoint(r = 13) {
  const u = rng(), v = rng();
  const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
  const rr = r * (0.8 + rng() * 0.5);
  return { x: rr * Math.sin(ph) * Math.cos(th), y: rr * Math.sin(ph) * Math.sin(th), z: rr * Math.cos(ph) };
}

function build() {
  rng = mulberry32((SHOW && SHOW.seed) || 1234);           // reseed -> deterministic
  if (SHOW && SHOW.parts) { inkGrid = null; targets = sampleScene(SHOW); }   // FORM mode
  else { inkGrid = computeInk(sourceCanvas); targets = extractTargets(sourceCanvas, (SHOW && SHOW.points) || 5000); }
  N = targets.length;
  starts = new Array(N); delays = new Float32Array(N);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    starts[i] = scatterPoint(); delays[i] = rng();
    pos[i * 3] = starts[i].x; pos[i * 3 + 1] = starts[i].y; pos[i * 3 + 2] = starts[i].z;
    col[i * 3] = targets[i].r; col[i * 3 + 1] = targets[i].g; col[i * 3 + 2] = targets[i].b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (cloud) { scene.remove(cloud); cloud.geometry.dispose(); }
  cloud = new THREE.Points(geo, material); scene.add(cloud);
  showStart = clock.getElapsedTime(); forced = null; controls.autoRotate = true;
}

// ---------- SHOW interpreter ----------
let SHOW = null;
function sceneOf(type) { return (SHOW.scenes || []).find(s => s.type === type); }
function assembleEnd() { const a = sceneOf('assemble'); return a ? (a.at || 0) + (a.dur || 3.5) : 3.5; }

function stepTo(t) {                 // compute point positions at time t
  if (!(cloud && SHOW)) return;
  const pos = cloud.geometry.attributes.position.array;
  const asm = sceneOf('assemble') || { at: 0, dur: 3.5, ease: 'outExpo', stagger: 0.5 };
  const ease = EASE[asm.ease] || EASE.outExpo;
  const spread = (asm.stagger ?? 0.5) * asm.dur, win = Math.max(0.001, asm.dur - spread);
  const br = sceneOf('breathe');
  const brNow = br ? Math.sin((t - (br.at || 0)) * (br.freq ?? 0.25) * Math.PI * 2) : 0;
  const brAmp = br ? (br.amp ?? 0.15) : 0;
  for (let i = 0; i < N; i++) {
    const T = targets[i], S = starts[i];
    const local = Math.min(1, Math.max(0, (t - asm.at - delays[i] * spread) / win));
    const e = ease(local);
    let x = S.x + (T.x - S.x) * e, y = S.y + (T.y - S.y) * e, z = S.z + (T.z - S.z) * e;
    if (brAmp && e > 0.98) { const k = 1 + brNow * brAmp * (0.4 + T.lum); x *= k; y *= k; z *= k; }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
  }
  cloud.geometry.attributes.position.needsUpdate = true;
  const sw = sceneOf('swirl');
  if (sw && t > (sw.at || 0)) controls.autoRotateSpeed = (sw.speed ?? 0.5) * 3;
}

function tick() {
  requestAnimationFrame(tick);
  const now = clock.getElapsedTime();
  stepTo(forced != null ? forced : now - showStart);
  controls.update();
  renderer.render(scene, camera);
}

// ---------- critic metric: legibility ----------
// Of the source's ink cells, what fraction has >=1 point? (low => raise `points` / lower jitter)
function metrics() {
  if (!targets.length) return null;
  if (!inkGrid) return { points: N, mode: 'form' };   // scene mode has no photo grid
  const { gw, gh, ink } = inkGrid;
  const covered = new Set();
  for (const T of targets) {
    const gx = Math.min(gw - 1, (T.px / T.gw * gw) | 0);
    const gy = Math.min(gh - 1, (T.py / T.gh * gh) | 0);
    covered.add(gx + ',' + gy);
  }
  let hit = 0; ink.forEach(k => { if (covered.has(k)) hit++; });
  const legibility = ink.size ? hit / ink.size : 0;
  return { points: N, inkCells: ink.size, legibility: +legibility.toFixed(3),
           verdict: legibility > 0.9 ? 'crisp' : legibility > 0.8 ? 'ok' : 'mushy (raise points)' };
}

// ---------- boot + public API ----------
const DEFAULT_SHOW = {
  points: 5200, seed: 1234,
  scenes: [
    { type: 'assemble', at: 0, dur: 3.6, ease: 'outExpo', stagger: 0.55, from: 'sphere' },
    { type: 'breathe', at: 3.6, amp: 0.16, freq: 0.22 },
    { type: 'swirl', at: 3.6, speed: 0.12, axis: 'y' },
  ],
};
async function tryJson(u) { try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (_) {} return null; }
function loadImg(u) { return new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = u; }); }

window.PYRE = {
  getShow: () => SHOW,
  metrics,
  // hot-swap the choreography (re-renders deterministically). No file write, no reload.
  applyShow(obj) { SHOW = obj; build(); return metrics(); },
  setSource(canvas) { sourceCanvas = canvas; build(); return metrics(); },
  // freeze the timeline at time t so screenshots are deterministic
  seek(t) { forced = t; controls.autoRotate = false; },
  settle() { forced = assembleEnd() + 0.15; controls.autoRotate = false; return metrics(); },
  play() { if (forced != null) { showStart = clock.getElapsedTime() - forced; forced = null; controls.autoRotate = true; } },
  replay() { build(); },
  // capture support: freeze at t, render one frontal frame synchronously
  frame(t) {
    forced = t; controls.autoRotate = false;
    camera.position.set(0, 0, 17); camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    stepTo(t);                        // recompute positions for t, THEN render
    renderer.render(scene, camera);
    return true;
  },
  frameCam(t, az, elev) {             // capture at time t from camera azimuth az (for rotate GIFs)
    forced = t; controls.autoRotate = false;
    const r = 17, e = elev || 0;
    camera.position.set(Math.sin(az) * r * Math.cos(e), Math.sin(e) * r, Math.cos(az) * r * Math.cos(e));
    camera.lookAt(0, 0, 0); controls.target.set(0, 0, 0);
    stepTo(t); renderer.render(scene, camera);
    return true;
  },
};

// ---------- Prometheus Contract: every capability exposes window.PROM ----------
// Same shape across all mediums, so ONE critic loop drives point clouds, charts, music...
window.PROM = {
  medium: 'point-cloud',
  apply: (program) => window.PYRE.applyShow(program), // render a program, return score
  score: () => window.PYRE.metrics(),                 // objective critic signals
  settle: () => window.PYRE.settle(),                 // freeze at natural end, return score
  seek: (t) => window.PYRE.seek(t),                   // freeze timeline at t sec
  play: () => window.PYRE.play(),
};

async function boot() {
  const qs = new URLSearchParams(location.search);
  SHOW = (qs.get('scene') && await tryJson(qs.get('scene')))     // FORM mode: a described 3D scene
      || (qs.get('show') && await tryJson(qs.get('show')))
      || await tryJson('../shows/current.json') || DEFAULT_SHOW;
  const img = await loadImg(qs.get('src') || '../shows/source.png');
  sourceCanvas = img ? imgToCanvas(img) : drawWordmark('PYRE');
  clock.start(); build(); tick();
  if (qs.has('t')) window.PYRE.seek(parseFloat(qs.get('t')));
  if (qs.get('settle') === '1') window.PYRE.settle();
}
boot();

// ---------- drag & drop ----------
const drop = document.getElementById('drop');
addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
addEventListener('dragleave', e => { if (e.target === drop) drop.classList.remove('on'); });
addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('on');
  const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return;
  const fr = new FileReader();
  fr.onload = () => loadImg(fr.result).then(img => { if (img) window.PYRE.setSource(imgToCanvas(img)); });
  fr.readAsDataURL(f);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
