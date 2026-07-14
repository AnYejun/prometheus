# PRISM chart language — v0

A **program** is JSON. The LLM authors it; the D3 executor renders it. Optimized
to be LLM-written and machine-verified, not hand-tuned.

```json
{
  "title": "City heat (°C), hottest first",
  "data": [
    { "label": "Daegu", "value": 36 },
    { "label": "Seoul", "value": 33 }
  ],
  "chart": {
    "type": "bar",
    "sort": "desc",
    "animate": { "dur": 850, "stagger": 60, "ease": "cubicOut" }
  }
}
```

## Fields
- `title` — string, drawn top-left.
- `data[]` — `{ label: string, value: number }`. Values drive bar height + color.
- `chart.type` — `bar` (v0). `line` / `scatter` on the roadmap.
- `chart.sort` — `desc` | `asc` | omit (source order).
- `chart.animate` — `dur` (ms), `stagger` (ms between bars), `ease`
  (`cubicOut` `expOut` `backOut` `sinOut` `linear`).

## Natural language → program
- "compare X across Y, biggest first" → `sort: desc`
- "let them pop in one by one" → `stagger: 80–120`
- "snappy" → `dur: 500, ease: expOut` · "playful overshoot" → `ease: backOut`

## Critic
`score()` returns `{ bars, fidelity, labels, clipped, verdict }`.
- **fidelity** (0–1) — Pearson corr of rendered bar height vs value. **Gate ≥ 0.98.**
  Below that the chart lies about the data → fix the program.
- **clipped** — any bar out of frame (bad scale). Must be `false`.
- **labels** — axis ticks present (legibility).

## Roadmap (verbs/types not yet built — same contract, PRs welcome)
`line`, `scatter`, `stack`, `group`, `annotate`, live data `morph` (dataset A→B).
