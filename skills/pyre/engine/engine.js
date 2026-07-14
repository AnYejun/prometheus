// PYRE engine — the deterministic executor.
// It knows nothing about "meaning". It takes:
//   1) a SOURCE image  -> a cloud of target points (weighted by luminance)
//   2) a SHOW (the choreography DSL) -> how those points scatter, assemble, breathe, swirl
// The LLM never computes a coordinate. The LLM only authors the SHOW.
//
// Load order:
//   - tries ./shows/current.json   (the show the LLM authored)   else built-in DEFAULT_SHOW
//   - tries ./shows/source.png     (the user's photo)            else built-in "PYRE" wordmark
//   - ?show=<url> and ?src=<url>   override both

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  [0.00, [0.10, 0.02, 0.03]],
  [0.30, [0.65, 0.10, 0.02]],
  [0.55, [0.98, 0.35, 0.05]],
  [0.78, [1.00, 0.62, 0.16]],
  [1.00, [1.00, 0.96, 0.78]],
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

// ---------- glow sprite (soft round point) ----------
function glowTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,240,210,0.85)');
  grad.addColorStop(0.6, 'rgba(255,150,60,0.25)');
  grad.addColorStop(1.0, 'rgba(255,120,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}

// ---------- source -> targets ----------
function drawWordmark(text = 'PYRE') {
  const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff';
  g.font = '900 180px ui-monospace, "SF Mono", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 6);
  return c;
}

function extractTargets(canvas, N, depth = 2.6, jitter = 0.25) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const aspect = w / h;
  const spanX = 11 * Math.min(1, aspect), spanY = 11 / Math.max(1, aspect);
  const out = [];
  let tries = 0, cap = N * 60;
  while (out.length < N && tries < cap) {
    tries++;
    const px = (Math.random() * w) | 0, py = (Math.random() * h) | 0;
    const i = (py * w + px) * 4;
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    if (lum < 0.06) continue;              // skip near-black
    if (Math.random() > lum * 0.95 + 0.05) continue; // denser where brighter
    const x = (px / w - 0.5) * spanX;
    const y = -(py / h - 0.5) * spanY;
    const z = (lum - 0.5) * depth + (Math.random() - 0.5) * jitter;
    const col = ember(lum);
    out.push({ x, y, z, r: col[0], g: col[1], b: col[2], lum });
  }
  return out;
}

// ---------- scene / renderer ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});
let cloud = null;

// per-point state kept in JS
let targets = [], starts = [], delays = [], N = 0;
const clock = new THREE.Clock();
let showStart = 0;

function scatterPoint(r = 13) {
  // random point on a fuzzy sphere shell
  const u = Math.random(), v = Math.random();
  const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
  const rr = r * (0.8 + Math.random() * 0.5);
  return { x: rr * Math.sin(ph) * Math.cos(th), y: rr * Math.sin(ph) * Math.sin(th), z: rr * Math.cos(ph) };
}

function build(tgts) {
  targets = tgts; N = tgts.length;
  starts = new Array(N); delays = new Float32Array(N);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    starts[i] = scatterPoint();
    delays[i] = Math.random();
    pos[i * 3] = starts[i].x; pos[i * 3 + 1] = starts[i].y; pos[i * 3 + 2] = starts[i].z;
    col[i * 3] = targets[i].r; col[i * 3 + 1] = targets[i].g; col[i * 3 + 2] = targets[i].b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (cloud) { scene.remove(cloud); cloud.geometry.dispose(); }
  cloud = new THREE.Points(geo, material);
  scene.add(cloud);
  showStart = clock.getElapsedTime();
  controls.autoRotate = true;
}

// ---------- SHOW interpreter ----------
let SHOW = null;
function sceneOf(type) { return (SHOW.scenes || []).find(s => s.type === type); }

function tick() {
  requestAnimationFrame(tick);
  const now = clock.getElapsedTime();
  const t = now - showStart;

  if (cloud && SHOW) {
    const pos = cloud.geometry.attributes.position.array;
    const asm = sceneOf('assemble') || { at: 0, dur: 3.5, ease: 'outExpo', stagger: 0.5 };
    const ease = EASE[asm.ease] || EASE.outExpo;
    const spread = (asm.stagger ?? 0.5) * asm.dur;
    const win = Math.max(0.001, asm.dur - spread);

    const br = sceneOf('breathe');
    const brNow = br ? Math.sin((t - (br.at || 0)) * (br.freq ?? 0.25) * Math.PI * 2) : 0;
    const brAmp = br ? (br.amp ?? 0.15) : 0;

    for (let i = 0; i < N; i++) {
      const T = targets[i], S = starts[i];
      const local = Math.min(1, Math.max(0, (t - asm.at - delays[i] * spread) / win));
      const e = ease(local);
      let x = S.x + (T.x - S.x) * e;
      let y = S.y + (T.y - S.y) * e;
      let z = S.z + (T.z - S.z) * e;
      if (brAmp && e > 0.98) {           // breathe = radial pulse, only once assembled
        const k = 1 + brNow * brAmp * (0.4 + T.lum);
        x *= k; y *= k; z *= k;
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    cloud.geometry.attributes.position.needsUpdate = true;

    const sw = sceneOf('swirl');
    if (sw && t > (sw.at || 0)) controls.autoRotateSpeed = (sw.speed ?? 0.5) * 3;
  }

  controls.update();
  renderer.render(scene, camera);
}

// ---------- boot ----------
const DEFAULT_SHOW = {
  points: 5200,
  scenes: [
    { type: 'assemble', at: 0.0, dur: 3.6, ease: 'outExpo', stagger: 0.55, from: 'sphere' },
    { type: 'breathe', at: 3.6, amp: 0.16, freq: 0.22 },
    { type: 'swirl', at: 3.6, speed: 0.12, axis: 'y' },
  ],
};

async function tryJson(url) { try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (_) {} return null; }
function loadImg(url) {
  return new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
}
function imgToCanvas(img, maxW = 460) {
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

async function boot() {
  const qs = new URLSearchParams(location.search);
  SHOW = (qs.get('show') && await tryJson(qs.get('show'))) || await tryJson('./shows/current.json') || DEFAULT_SHOW;

  let srcCanvas = null;
  const srcUrl = qs.get('src') || './shows/source.png';
  const img = await loadImg(srcUrl);
  if (img) srcCanvas = imgToCanvas(img);
  if (!srcCanvas) srcCanvas = drawWordmark('PYRE');

  build(extractTargets(srcCanvas, SHOW.points || 5000));
  clock.start(); tick();
}
boot();

// ---------- drag & drop a photo ----------
const drop = document.getElementById('drop');
addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
addEventListener('dragleave', e => { if (e.target === drop) drop.classList.remove('on'); });
addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('on');
  const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return;
  const fr = new FileReader();
  fr.onload = () => loadImg(fr.result).then(img => {
    if (!img) return;
    build(extractTargets(imgToCanvas(img), (SHOW && SHOW.points) || 5000));
  });
  fr.readAsDataURL(f);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
