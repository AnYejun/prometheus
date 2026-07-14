---
name: prism
description: Turn data into an animated chart. The user gives numbers (or a comparison in words) and a vibe; you author a small chart DSL and a D3 backend renders it as glowing animated bars, self-corrected against an objective encoding-fidelity metric. Use for charts, graphs, data visualization, "visualize these numbers", "make a bar chart", "compare X".
---

# PRISM

Data → chart, as a Prometheus capability. You (the LLM) author a **program**
(`dsl/GRAMMAR.md`); the executor (`engine/prism.js`, backend = D3) renders it. You
never compute a pixel. Same `window.PROM` contract and same critic loop as PYRE —
only the medium changed.

## Run it
`python3 -m http.server 8778 --directory <repo-root>` then open
`http://localhost:8778/skills/prism/engine/index.html`. Drive it with the browser
`javascript_tool` + `screenshot`.

`window.PROM`:
- `apply(program)` → render + return score. `settle()` → finish animation, return score.
- `score()` → `{ bars, fidelity, labels, clipped, verdict }`.

## The loop (identical to every Prometheus capability)
1. **Author.** Turn the user's numbers + vibe into a program (`dsl/GRAMMAR.md`).
   "compare cities, hottest first, pop in one by one" → `sort: desc, stagger: 100`.
2. **Fidelity gate (objective).**
   `JSON.stringify(window.PROM.apply(<program>))`, then `window.PROM.settle()`.
   Read `fidelity` — it's the Pearson corr of bar height vs value. **Must be ≥ 0.98
   and `clipped: false`.** Below that the chart *misrepresents the data* → fix the
   program before anything else. This is a hard, honest oracle: a chart that lies fails.
3. **Taste (perceptual).** Screenshot the settled chart. Judge with the rubric.
4. **Correct** one knob, re-apply, re-shoot. Repeat.
5. **Commit** the winner to `data/current.json`.

## <a id="critic"></a>Critic rubric — symptom → fix
| What you see | Fix |
|---|---|
| `fidelity < 0.98` or `clipped: true` | bad scale/type — re-check the program against GRAMMAR |
| Order looks arbitrary | set `chart.sort` (`desc` for ranking) |
| Bars snap in lifelessly | `animate.stagger 80–120`, `ease: backOut` |
| Too slow / draggy | `animate.dur 500`, `ease: expOut` |
| Values hard to read | fewer bars, or shorten labels |

## Why this exists
PRISM is the second flame — it proves the Prometheus Contract generalizes to a
totally different medium **by reusing D3** as the executor. Point cloud (three.js)
and chart (D3) run the *same loop*. That's the framework. See `../../CONTRACT.md`.
