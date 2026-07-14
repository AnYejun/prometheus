// PRISM executor — a Prometheus capability whose backend is D3.
// The LLM authors a chart PROGRAM (dsl/GRAMMAR.md). This turns it into an SVG
// chart. It never computes a pixel — D3 does. Same window.PROM contract as PYRE.

const svg = d3.select('#chart');
const M = { top: 60, right: 30, bottom: 66, left: 58 };
let W = 0, H = 0, last = null, state_ih = 0;

// ember ramp (value -> fire color), shared aesthetic with PYRE
const EMBER = [[0, [0.42, 0.07, 0.03]], [0.5, [0.98, 0.42, 0.06]], [1, [1, 0.86, 0.52]]];
function ember(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < EMBER.length; i++) {
    if (t <= EMBER[i][0]) {
      const [a, c0] = EMBER[i - 1], [b, c1] = EMBER[i], k = (t - a) / ((b - a) || 1);
      return `rgb(${[0, 1, 2].map(j => Math.round(255 * (c0[j] + (c1[j] - c0[j]) * k))).join(',')})`;
    }
  }
  return 'rgb(255,220,130)';
}
const EASES = { cubicOut: d3.easeCubicOut, expOut: d3.easeExpOut, backOut: d3.easeBackOut, linear: d3.easeLinear, sinOut: d3.easeSinOut };

function size() { W = innerWidth; H = innerHeight; svg.attr('width', W).attr('height', H); }

function render(program) {
  last = program; size(); svg.selectAll('*').remove();
  const ch = program.chart || {};
  const data = (program.data || []).slice();
  if (ch.sort === 'desc') data.sort((a, b) => b.value - a.value);
  if (ch.sort === 'asc') data.sort((a, b) => a.value - b.value);

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom; state_ih = ih;
  const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, iw]).padding(0.28);
  const maxV = d3.max(data, d => d.value) || 1;
  const y = d3.scaleLinear().domain([0, maxV]).nice().range([ih, 0]);
  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  if (program.title)
    svg.append('text').attr('x', M.left).attr('y', 36)
      .attr('fill', '#ffcf9e').attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', 22).attr('font-weight', 700).text(program.title);

  g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y).ticks(5));
  g.selectAll('.domain, .tick line').attr('stroke', '#5a4636');
  g.selectAll('.tick text').attr('fill', '#c9a98a').attr('font-family', 'ui-monospace, monospace').attr('font-size', 12);

  const a = ch.animate || {}, ease = EASES[a.ease] || d3.easeCubicOut;
  const dur = a.dur ?? 850, stag = a.stagger ?? 45;

  const bars = g.selectAll('rect.bar').data(data, d => d.label).enter().append('rect')
    .attr('class', 'bar').attr('x', d => x(d.label)).attr('width', x.bandwidth())
    .attr('y', ih).attr('height', 0)
    .attr('rx', 3).attr('fill', d => ember(d.value / maxV))
    .attr('data-value', d => d.value)
    .attr('data-final-h', d => ih - y(d.value));   // final geometry, for the critic
  bars.transition().duration(dur).delay((d, i) => i * stag).ease(ease)
    .attr('y', d => y(d.value)).attr('height', d => ih - y(d.value));

  g.selectAll('text.val').data(data).enter().append('text').attr('class', 'val')
    .attr('x', d => x(d.label) + x.bandwidth() / 2).attr('text-anchor', 'middle')
    .attr('fill', '#ffd9a3').attr('font-family', 'ui-monospace, monospace').attr('font-size', 12)
    .attr('y', d => y(d.value) - 8).attr('opacity', 0).text(d => d.value)
    .transition().delay((d, i) => i * stag + dur * 0.55).duration(300).attr('opacity', 1);
}

// ---------- critic ----------
// fidelity = how faithfully bar heights encode the numbers (Pearson corr of final
// pixel-height vs value). Catches wrong scales, clipping, NaN. Objective oracle.
function score() {
  const rects = [...svg.selectAll('rect.bar').nodes()];
  if (!rects.length) return { bars: 0, verdict: 'empty' };
  const vs = rects.map(r => +r.dataset.value);
  const hs = rects.map(r => +r.dataset.finalH);
  const n = hs.length, mh = d3.mean(hs), mv = d3.mean(vs);
  let cov = 0, sh = 0, sv = 0;
  for (let i = 0; i < n; i++) { const p = hs[i] - mh, q = vs[i] - mv; cov += p * q; sh += p * p; sv += q * q; }
  const fidelity = (sh && sv) ? +(cov / Math.sqrt(sh * sv)).toFixed(3) : 1;
  const clipped = hs.some(h => !isFinite(h) || h < 0 || h > state_ih + 1);
  const labels = svg.selectAll('.tick text').size();
  return {
    bars: n, fidelity, labels, clipped,
    verdict: (fidelity > 0.99 && !clipped) ? 'faithful' : fidelity > 0.9 ? 'ok' : 'distorted',
  };
}
function settle() {  // finish transitions -> final state, for a deterministic screenshot
  svg.selectAll('rect.bar').interrupt()
    .attr('y', function () { return state_ih - +this.dataset.finalH; })
    .attr('height', function () { return +this.dataset.finalH; });
  svg.selectAll('text.val').interrupt().attr('opacity', 1);
  return score();
}

// ---------- capture support ----------
// draw bars at reveal progress p (0..1) and rasterize the SVG to a PNG data URL
function frameProgress(p) {
  svg.selectAll('rect.bar').interrupt()
    .attr('height', function () { return +this.dataset.finalH * p; })
    .attr('y', function () { return state_ih - +this.dataset.finalH * p; });
  svg.selectAll('text.val').interrupt().attr('opacity', Math.max(0, p * 1.4 - 0.4));
}
function rasterize() {
  const node = svg.node().cloneNode(true);
  node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  node.setAttribute('width', W); node.setAttribute('height', H);
  const s = new XMLSerializer().serializeToString(node);
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
}

// ---------- Prometheus Contract ----------
window.PRISM = { render, score, settle, frameProgress, rasterize, getProgram: () => last };
window.PROM = {
  medium: 'data-visualization',
  apply(program) { render(program); return score(); },
  score, settle,
  seek() {}, play() {},           // static medium: no timeline to scrub
};

// ---------- boot ----------
const DEFAULT = {
  title: 'Prometheus demo — sample',
  data: [{ label: 'A', value: 30 }, { label: 'B', value: 62 }, { label: 'C', value: 45 }, { label: 'D', value: 18 }],
  chart: { type: 'bar', sort: 'desc', animate: { dur: 850, stagger: 60, ease: 'cubicOut' } },
};
(async function boot() {
  const qs = new URLSearchParams(location.search);
  let prog = DEFAULT;
  try { const u = qs.get('program') || '../data/current.json'; const r = await fetch(u, { cache: 'no-store' }); if (r.ok) prog = await r.json(); } catch (_) {}
  render(prog);
  if (qs.get('settle') === '1') settle();
})();
addEventListener('resize', () => { if (last) { const p = last; render(p); settle(); } });
