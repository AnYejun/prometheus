// LYRA executor — a Prometheus capability whose backend is Tone.js.
// The LLM authors a musical PROGRAM (dsl/GRAMMAR.md). This draws a piano roll and
// plays it. It never writes a waveform. Same window.PROM contract as PYRE/PRISM.
// Objective critic = in-key ratio: a melody that wanders out of its declared
// key/scale fails the gate.

const cv = document.getElementById('roll');
const ctx = cv.getContext('2d');
const M = { top: 70, right: 26, bottom: 30, left: 54 };

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  pentatonicMajor: [0, 2, 4, 7, 9], pentatonicMinor: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function toMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) return null;
  let pc = PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 12 * (parseInt(m[3], 10) + 1) + pc;
}
function allowedPCs(key, scale) {
  const root = PC[(key || 'C')[0].toUpperCase()] + ((key || '')[1] === '#' ? 1 : (key || '')[1] === 'b' ? -1 : 0);
  return new Set((SCALES[scale] || SCALES.major).map(s => (root + s + 1200) % 12));
}

let PROG = null, notes = [], beats = 8, midiLo = 48, midiHi = 72;

function flatten(program) {
  const out = [];
  (program.tracks || []).forEach((tr, ti) => (tr.notes || []).forEach(n => {
    const midi = toMidi(n.pitch); if (midi == null) return;
    out.push({ t: +n.t, dur: +n.dur || 1, midi, track: ti });
  }));
  return out;
}

function size() { cv.width = innerWidth; cv.height = innerHeight; }

function ember(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [[0, [150, 26, 10]], [0.5, [240, 120, 20]], [1, [255, 216, 130]]];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [a, c0] = stops[i - 1], [b, c1] = stops[i], k = (t - a) / ((b - a) || 1);
    return `rgb(${[0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * k)).join(',')})`;
  }
  return 'rgb(255,216,130)';
}

function draw(playBeat) {
  size();
  const W = cv.width, H = cv.height, iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  ctx.fillStyle = '#08070d'; ctx.fillRect(0, 0, W, H);
  if (!notes.length) return;
  const colW = iw / beats, span = (midiHi - midiLo) || 1, rowH = ih / (span + 1);
  const x = b => M.left + b * colW;
  const y = midi => M.top + (midiHi - midi) * rowH;

  // scale-tone row shading + bar grid
  const inScale = allowedPCs(PROG.key, PROG.scale);
  for (let m = midiLo; m <= midiHi; m++) {
    if (inScale.has(((m % 12) + 12) % 12)) { ctx.fillStyle = 'rgba(255,180,90,0.045)'; ctx.fillRect(M.left, y(m), iw, rowH); }
  }
  ctx.strokeStyle = 'rgba(255,220,180,0.08)'; ctx.lineWidth = 1;
  for (let b = 0; b <= beats; b++) { ctx.globalAlpha = b % 4 === 0 ? 0.5 : 0.2; ctx.beginPath(); ctx.moveTo(x(b), M.top); ctx.lineTo(x(b), H - M.bottom); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // notes
  notes.forEach(n => {
    const lit = playBeat == null || n.t <= playBeat + 0.001;
    ctx.fillStyle = ember((n.midi - midiLo) / span);
    ctx.globalAlpha = lit ? (n.track === 0 ? 1 : 0.82) : 0.16;
    const nx = x(n.t) + 1, ny = y(n.midi) + 2, nw = Math.max(4, n.dur * colW - 3), nh = rowH - 4;
    ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 3); ctx.fill();
    if (lit && playBeat != null && n.t <= playBeat && n.t + n.dur > playBeat) {
      ctx.strokeStyle = '#fff3d0'; ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;

  // playhead
  if (playBeat != null) {
    ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x(playBeat), M.top - 8); ctx.lineTo(x(playBeat), H - M.bottom); ctx.stroke();
  }

  // header
  const sc = score();
  ctx.fillStyle = '#ffcf9e'; ctx.font = '700 22px Georgia, serif';
  ctx.fillText(PROG.title || 'untitled', M.left, 34);
  ctx.fillStyle = '#c9a98a'; ctx.font = '13px ui-monospace, monospace';
  ctx.fillText(`${PROG.key || 'C'} ${PROG.scale || 'major'}  ·  ${PROG.tempo || 100} BPM  ·  in-key ${sc.inKey}  ·  ${sc.verdict}`, M.left, 54);
}

// ---------- critic ----------
function score() {
  if (!notes.length) return { notes: 0, verdict: 'empty' };
  const inScale = allowedPCs(PROG.key, PROG.scale);
  const hits = notes.filter(n => inScale.has(((n.midi % 12) + 12) % 12)).length;
  const inKey = +(hits / notes.length).toFixed(3);
  return { notes: notes.length, inKey, voices: (PROG.tracks || []).length,
           verdict: inKey >= 0.98 ? 'in-key' : inKey >= 0.9 ? 'ok' : 'off-key (fix pitches)' };
}

function render(program) {
  PROG = program; notes = flatten(program);
  beats = Math.max(1, Math.ceil(Math.max(...notes.map(n => n.t + n.dur), 4)));
  if (notes.length) {
    midiLo = Math.min(...notes.map(n => n.midi)) - 1;
    midiHi = Math.max(...notes.map(n => n.midi)) + 1;
  }
  draw(null);
  return score();
}

// ---------- audio (Tone.js) ----------
let synths = [];
async function play() {
  if (!notes.length) return;
  await Tone.start();
  Tone.Transport.stop(); Tone.Transport.cancel(); Tone.Transport.position = 0;
  Tone.Transport.bpm.value = PROG.tempo || 100;
  synths.forEach(s => s.dispose()); synths = [];
  (PROG.tracks || []).forEach((tr, ti) => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: tr.wave || (ti === 0 ? 'triangle' : 'sine') },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.6 },
      volume: ti === 0 ? -8 : -14,
    }).toDestination();
    synths.push(synth);
    (tr.notes || []).forEach(n => {
      const midi = toMidi(n.pitch); if (midi == null) return;
      Tone.Transport.schedule(time => synth.triggerAttackRelease(
        Tone.Frequency(midi, 'midi').toNote(), (n.dur || 1) * 60 / (PROG.tempo || 100) * 0.95, time), `0:0:${n.t * 4}`);
    });
  });
  Tone.Transport.start();
  const b2s = beats * 60 / (PROG.tempo || 100);
  const t0 = Tone.now();
  (function loop() {
    const beat = (Tone.now() - t0) * (PROG.tempo || 100) / 60;
    if (beat <= beats + 0.2) { draw(beat); requestAnimationFrame(loop); }
    else { Tone.Transport.stop(); draw(null); }
  })();
}
document.getElementById('play').addEventListener('click', play);

// ---------- Prometheus Contract + capture ----------
window.LYRA = { render, score, draw, frameAt: (b) => draw(b), getProgram: () => PROG, get beats() { return beats; } };
window.PROM = {
  medium: 'music',
  apply(program) { return render(program); },
  score,
  settle() { draw(null); return score(); },
  seek(b) { draw(b); },
  play,
};

// ---------- boot ----------
(async function boot() {
  const qs = new URLSearchParams(location.search);
  let prog = { title: 'A minor sketch', tempo: 96, key: 'A', scale: 'minor',
    tracks: [{ name: 'lead', wave: 'triangle', notes: [
      { t: 0, dur: 1, pitch: 'A4' }, { t: 1, dur: 1, pitch: 'C5' }, { t: 2, dur: 2, pitch: 'E5' },
      { t: 4, dur: 1, pitch: 'D5' }, { t: 5, dur: 1, pitch: 'C5' }, { t: 6, dur: 2, pitch: 'B4' }] }] };
  try { const u = qs.get('program') || '../data/current.json'; const r = await fetch(u, { cache: 'no-store' }); if (r.ok) prog = await r.json(); } catch (_) {}
  render(prog);
  if (qs.get('settle') === '1') draw(null);
})();
addEventListener('resize', () => draw(null));
