// __NAME__ executor — a Prometheus capability (medium: __MEDIUM__).
// Fill the two TODOs. Everything below the line is the fixed Prometheus Contract
// (see ../../CONTRACT.md) — do not rename the verbs; the universal critic loop
// depends on window.PROM.apply / score / settle / seek / play.

const state = { program: null };

function render(program) {
  state.program = program;
  // TODO(executor): turn `program` (defined in dsl/GRAMMAR.md) into effect —
  // pixels, sound, geometry — using your backend library. Be DETERMINISTIC
  // (seed any randomness) so the critic's edits are the only variable.
}

function score() {
  // TODO(critic): return at least one OBJECTIVE, measurable signal so the loop
  // has a gate (not just taste). e.g. { fidelity: 1, verdict: 'ok' }.
  if (!state.program) return { verdict: 'empty' };
  return { verdict: 'no-critic-yet' };
}

// ---------------- Prometheus Contract (do not rename) ----------------
window.PROM = {
  medium: '__MEDIUM__',
  apply(program) { render(program); return score(); },
  score,
  settle() { return score(); }, // finish any animation to the at-rest state, then score
  seek() {},                    // freeze a time-based medium at t sec (no-op if static)
  play() {},                    // resume live motion (no-op if static)
};

// boot: load the seed program if present
(async function () {
  try { const r = await fetch('../seeds/current.json', { cache: 'no-store' }); if (r.ok) render(await r.json()); } catch (_) {}
})();
