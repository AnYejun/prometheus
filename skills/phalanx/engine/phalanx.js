// PHALANX executor — a Prometheus capability. The LLM authors a PLAY (5 offensive
// routes + screens + passes + a shot). The engine SIMULATES it against a reactive
// man defense and scores the possession's expected value. The defense is the
// verifier: a play that doesn't beat it fails the gate. three.js-free, canvas 2D.
//
// Court units are FEET. Basket at B. Half court 50 wide x 47 long, baseline at y=0.

const B = [25, 5.25];                       // rim
const CW = 50, CL = 47, PAINT = [17, 33, 0, 19], ARC = 23.75, CORNER = 22;
const cv = document.getElementById('court'), ctx = cv.getContext('2d');

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- play state ----------
let PLAY = null, off = [], screens = [], passes = [], shot = null, DEF = 'drop', DUR = 3.4;
let FRAMES = [], SCORE = null;

function routePos(route, t) {
  if (t <= route[0][0]) return route[0][1];
  for (let i = 0; i < route.length - 1; i++) {
    const [t0, p0] = route[i], [t1, p1] = route[i + 1];
    if (t <= t1) return lerp(p0, p1, (t - t0) / ((t1 - t0) || 1));
  }
  return route[route.length - 1][1];
}
const isScreener = id => screens.some(s => s.by === id);

// ball carrier timeline (start -> passes), shot leaves at shot.t
function carrierAt(t) {
  let c = PLAY.ball.start;
  for (const p of passes) if (t >= p.t) c = p.to;
  return c;
}
function ballPos(t, offAt) {
  if (shot && t >= shot.t) return lerp(offAt(shot.by, shot.t), B, clamp((t - shot.t) / 0.45, 0, 1));
  for (const p of passes) if (t >= p.t && t < p.t + 0.3) {
    const from = (passes.filter(q => q.t < p.t).slice(-1)[0] || { to: PLAY.ball.start }).to;
    return lerp(offAt(from, p.t), offAt(p.to, p.t), (t - p.t) / 0.3);
  }
  return offAt(carrierAt(t), t);
}

// ---------- simulate: reactive man defense (the verifier) ----------
function simulate() {
  const dt = 0.05, big = new Set(screens.map(s => s.by));   // screeners' defenders sag in drop
  const offAt = (id, t) => routePos(off.find(o => o.id === id).route, t);
  // init defenders between man and basket
  const defs = off.map(o => {
    const m = o.route[0][1], d = [B[0] - m[0], B[1] - m[1]], L = Math.hypot(...d) || 1;
    return { id: 'x' + o.id, mark: o.id, pos: [m[0] + d[0] / L * 4, m[1] + d[1] / L * 4], screenedUntil: 0 };
  });
  FRAMES = [];
  const paintTime = {};                                     // 3-second tracking
  for (let t = 0; t <= DUR + 1e-6; t += dt) {
    const offPos = {}; off.forEach(o => offPos[o.id] = offAt(o.id, t));
    const carrier = carrierAt(t);
    // defenders react
    for (const d of defs) {
      const m = offPos[d.mark], db = [B[0] - m[0], B[1] - m[1]], L = Math.hypot(...db) || 1;
      const onBall = d.mark === carrier;
      let cushion = onBall ? 2.6 : 4.6;
      if (DEF === 'drop' && big.has(d.mark)) cushion = 9.5;         // drop: big's man sags to paint
      const target = [m[0] + db[0] / L * cushion, m[1] + db[1] / L * cushion];
      let step = 22 * dt;
      // screen: contacting a non-mark offensive body costs the defender a beat
      for (const o of off) if (o.id !== d.mark && dist(offPos[o.id], d.pos) < 2.6) { d.screenedUntil = t + 0.6; break; }
      if (t < d.screenedUntil) step *= 0.22;
      const v = [target[0] - d.pos[0], target[1] - d.pos[1]], vl = Math.hypot(...v) || 1;
      d.pos = [d.pos[0] + v[0] / vl * Math.min(step, vl), d.pos[1] + v[1] / vl * Math.min(step, vl)];
    }
    // 3s violation tracking (offensive players, not the one about to shoot instantly)
    off.forEach(o => {
      const p = offPos[o.id], inPaint = p[0] > PAINT[0] && p[0] < PAINT[1] && p[1] > PAINT[2] && p[1] < PAINT[3];
      paintTime[o.id] = inPaint ? (paintTime[o.id] || 0) + dt : 0;
      o._paintMax = Math.max(o._paintMax || 0, paintTime[o.id]);
    });
    FRAMES.push({ t, off: { ...offPos }, def: defs.map(d => ({ id: d.id, mark: d.mark, pos: [...d.pos] })), ball: ballPos(t, offAt) });
  }
  SCORE = evaluate(offAt);
  return SCORE;
}

// ---------- critic: expected points of the possession ----------
function evaluate(offAt) {
  if (!shot) return { verdict: 'no shot' };
  const F = FRAMES[Math.min(FRAMES.length - 1, Math.round(shot.t / 0.05))];
  const sp = offAt(shot.by, shot.t);
  const openness = Math.min(...F.def.map(d => dist(sp, d.pos)));
  const d2b = dist(sp, B);
  const corner = (sp[0] <= 3.2 || sp[0] >= 46.8) && sp[1] <= 14.2;
  const three = corner ? d2b >= CORNER - 0.3 : d2b >= ARC - 0.3;
  const baseEV = d2b <= 4 ? 1.5 : three ? (corner ? 1.18 : 1.12) : d2b <= 14 ? 1.0 : 0.80;
  const contest = openness >= 6 ? 1 : openness >= 4 ? 0.82 : openness >= 2.5 ? 0.58 : 0.36;
  const shotEV = baseEV * contest;
  // turnovers: a defender sitting on a pass lane
  let toProb = 0;
  for (const p of passes) {
    const a = offAt((passes.filter(q => q.t < p.t).slice(-1)[0] || { to: PLAY.ball.start }).to, p.t), b = offAt(p.to, p.t);
    const fr = FRAMES[Math.min(FRAMES.length - 1, Math.round(p.t / 0.05))];
    let md = 99; for (const d of fr.def) { const t = clamp(((d.pos[0] - a[0]) * (b[0] - a[0]) + (d.pos[1] - a[1]) * (b[1] - a[1])) / (dist(a, b) ** 2 || 1), 0, 1); md = Math.min(md, dist(d.pos, lerp(a, b, t))); }
    toProb = 1 - (1 - toProb) * (1 - clamp(1 - md / 4, 0, 0.75));
  }
  // violations
  const V = [];
  off.forEach(o => { if ((o._paintMax || 0) > 3.0) V.push(`3s (${o.id})`); });
  FRAMES.forEach(f => off.forEach(o => { const p = f.off[o.id]; if (p[0] < -0.3 || p[0] > CW + 0.3 || p[1] < -0.3 || p[1] > CL + 0.3) { if (!V.includes('out of bounds')) V.push('out of bounds'); } }));
  // route speed legality
  off.forEach(o => { for (let i = 0; i < o.route.length - 1; i++) { const spd = dist(o.route[i][1], o.route[i + 1][1]) / ((o.route[i + 1][0] - o.route[i][0]) || 1); if (spd > 24 && !V.includes(`too fast (${o.id})`)) V.push(`too fast (${o.id})`); } });
  let ev = +(shotEV * (1 - toProb)).toFixed(3);
  if (V.length) ev = +(ev * 0.4).toFixed(3);
  const verdict = V.length ? 'illegal — ' + V.join(', ') : ev >= 1.05 ? 'quality look' : ev >= 0.85 ? 'ok' : 'poor look';
  return { ev, shotType: d2b <= 4 ? 'rim' : three ? '3pt' : d2b <= 14 ? 'paint' : 'mid', openness: +openness.toFixed(1), turnoverRisk: +toProb.toFixed(2), violations: V, verdict };
}

// ---------- render: top-down tactics board ----------
let TX, TY, S;
function fit() {
  cv.width = innerWidth; cv.height = innerHeight;
  S = Math.min((cv.width - 60) / CW, (cv.height - 60) / CL);
  TX = (cv.width - CW * S) / 2; TY = (cv.height - CL * S) / 2;
}
const px = p => [TX + p[0] * S, cv.height - TY - p[1] * S];      // court->screen (baseline at bottom)

function court() {
  ctx.fillStyle = '#0a0f0c'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#12180f'; const o = px([0, 0]), o2 = px([CW, CL]); ctx.fillRect(o[0], o2[1], CW * S, CL * S);
  ctx.strokeStyle = '#3a4a33'; ctx.lineWidth = 1.5;
  const line = (a, b) => { ctx.beginPath(); const A = px(a), Bp = px(b); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke(); };
  ctx.strokeRect(o[0], o2[1], CW * S, CL * S);                    // boundary
  line([0, 47], [50, 47]);                                        // half
  const pr = px([PAINT[0], PAINT[3]]); ctx.strokeRect(pr[0], pr[1], (PAINT[1] - PAINT[0]) * S, PAINT[3] * S);  // paint
  const ft = px([25, 19]); ctx.beginPath(); ctx.arc(ft[0], ft[1], 6 * S, 0, 2 * Math.PI); ctx.stroke();       // FT circle
  const rim = px(B); ctx.beginPath(); ctx.arc(rim[0], rim[1], 0.75 * S, 0, 2 * Math.PI); ctx.stroke();          // rim
  line([21, 4], [29, 4]);                                         // backboard
  // 3pt line
  ctx.beginPath(); line([3, 0], [3, 14.2]); line([47, 0], [47, 14.2]);
  ctx.beginPath(); let started = false;
  for (let a = -60; a <= 240; a += 3) { const x = B[0] + ARC * Math.cos(a * Math.PI / 180), y = B[1] + ARC * Math.sin(a * Math.PI / 180); if (x < 3 || x > 47 || y < 14.2) continue; const q = px([x, y]); if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); }
  ctx.stroke();
}
function disc(p, r, fill, stroke, label) {
  const q = px(p); ctx.beginPath(); ctx.arc(q[0], q[1], r * S, 0, 2 * Math.PI);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  if (label) { ctx.fillStyle = '#0a0f0c'; ctx.font = `700 ${Math.round(1.3 * S)}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, q[0], q[1]); }
}
function draw(t) {
  fit(); court();
  if (!FRAMES.length) return;
  const f = FRAMES[Math.min(FRAMES.length - 1, Math.max(0, Math.round(t / 0.05)))];
  // faint routes
  ctx.strokeStyle = 'rgba(255,207,106,0.18)'; ctx.lineWidth = 1;
  off.forEach(o => { ctx.beginPath(); o.route.forEach((k, i) => { const q = px(k[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); });
  f.def.forEach(d => disc(d.pos, 1.5, null, '#e2503a'));           // defense = red rings
  off.forEach(o => disc(f.off[o.id], 1.45, '#ffcf6a', '#8a6a2a', o.id));  // offense = gold
  disc(f.ball, 0.6, '#ff8a3a', '#7a3a10');                          // ball
  if (shot && t >= shot.t - 0.05) { const sp = px(routePos(off.find(o => o.id === shot.by).route, shot.t)); ctx.strokeStyle = '#7CDBA2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sp[0], sp[1], (SCORE ? SCORE.openness : 4) * S, 0, 2 * Math.PI); ctx.stroke(); }
  // header
  ctx.fillStyle = '#ffcf6a'; ctx.font = '700 20px Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(PLAY.title || 'play', 20, 34);
  if (SCORE) { ctx.fillStyle = '#cdb98a'; ctx.font = '13px ui-monospace, monospace'; ctx.fillText(`EV ${SCORE.ev} pts  ·  ${SCORE.shotType}  ·  open ${SCORE.openness}ft  ·  ${SCORE.verdict}`, 20, 54); }
}

// ---------- Prometheus contract ----------
function load(play) {
  PLAY = play; off = play.players.filter(p => p.o !== false); screens = play.screens || [];
  passes = (play.ball && play.ball.passes) || []; shot = play.ball && play.ball.shot; DEF = play.defense || 'drop';
  DUR = play.duration || (shot ? shot.t + 0.3 : 3.4);
  off.forEach(o => o._paintMax = 0);
  return simulate();
}
window.PHALANX = { load, simulate, draw, frameAt: t => draw(t), get dur() { return DUR; }, get shotT() { return shot ? shot.t : DUR; } };
window.PROM = {
  medium: 'basketball-tactics',
  apply(play) { const s = load(play); draw(0); return s; },
  score: () => SCORE,
  settle() { draw(shot ? shot.t : DUR); return SCORE; },
  seek(t) { draw(t); },
  play() {
    const t0 = performance.now();
    (function loop() {
      const t = (performance.now() - t0) / 1000;
      if (t <= DUR) { draw(t); requestAnimationFrame(loop); } else draw(shot ? shot.t : DUR);
    })();
  },
};
document.getElementById('play').addEventListener('click', () => window.PROM.play());

// ---------- boot ----------
(async function boot() {
  const qs = new URLSearchParams(location.search);
  let play = null;
  try { const r = await fetch(qs.get('play') || '../plays/current.json', { cache: 'no-store' }); if (r.ok) play = await r.json(); } catch (_) {}
  if (!play) play = { title: 'empty', players: [{ id: '1', route: [[0, [25, 28]]] }], ball: { start: '1' } };
  load(play); draw(0);
  if (qs.get('settle') === '1') window.PROM.settle();
})();
addEventListener('resize', () => draw(shot ? shot.t : 0));
