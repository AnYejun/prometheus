# The Prometheus Contract

A **capability** teaches an LLM to wield one medium (a point cloud, a chart, a
melody). Prometheus is the promise that *all* capabilities have the **same
shape**, so one critic loop, one harness, and one skill format drive every
medium. Adding a new world = filling four slots, nothing else.

## A capability = a directory

```
skills/<name>/
  manifest.json     # declares the four slots
  dsl/GRAMMAR.md    # 1. GRAMMAR  — the language the LLM writes
  engine/           # 2. EXECUTOR — turns the language into effect (reuse D3/three/Tone…)
  <seeds>/          # 4. SEED     — worked examples the LLM starts from
  SKILL.md          # how an LLM plugs in + the critic loop
```
The **CRITIC** (slot 3) is `manifest.critic` + the `score()` your executor exposes.

## manifest.json

```json
{
  "name": "prism",
  "medium": "data-visualization",
  "description": "...",
  "global": "PROM",
  "executor": "engine/index.html",
  "grammar": "dsl/GRAMMAR.md",
  "critic": { "gate": { "fidelity": 0.98 }, "rubric": "SKILL.md#critic" },
  "seeds": ["data/current.json"]
}
```

## The runtime contract: `window.PROM`

Every executor, whatever the medium, exposes one global with the same verbs. This
is what makes the loop universal — the loop never mentions points or bars.

```ts
window.PROM = {
  medium: string,
  apply(program): Score,   // render/run a program (validated against GRAMMAR). returns score.
  score(): Score,          // objective critic signals for the CURRENT output
  settle(): Score,         // reach the final/at-rest state (finish animation). for deterministic shots.
  seek(t?): void,          // freeze a time-based medium at t seconds (no-op for static media)
  play(): void,            // resume live motion (no-op for static media)
}
type Score = { verdict: string, [metric: string]: number | string | boolean }
```

Rules:
- **Deterministic.** Same program → same output (seed your RNG). The critic's
  edits must be the only variable.
- **Objective where you can.** `score()` must return at least one *measurable*
  signal (legibility, encoding fidelity, constraint satisfaction). That number is
  the gate; taste is judged from screenshots on top of it.
- **Reuse the world's best materials** as the executor. PYRE wraps three.js;
  PRISM wraps D3. You are not reinventing rendering — you are giving the LLM a
  language whose backend already exists.

## The universal critic loop (identical for every capability)

1. **Author** a `program` from the user's intent, valid against `dsl/GRAMMAR.md`.
2. **Gate (objective):** `PROM.apply(program)` → `PROM.settle()` → read `score()`.
   If it fails `manifest.critic.gate`, fix the obvious knob and retry. Don't judge
   taste until the gate passes.
3. **Judge (perceptual):** screenshot the at-rest state (and, for time-based
   media, a mid-motion frame via `seek`). Grade against the skill's rubric.
4. **Correct:** apply one rubric fix, re-apply, re-shoot. Repeat until it passes.
5. **Commit** the winning program to the capability's seed file.

Because the loop only speaks `PROM.apply/settle/seek/score` + screenshots, the
*exact same procedure* authored PYRE's drone show and PRISM's chart. That is the
framework: **new medium, same loop.**

## Add a capability
```
bin/prometheus-new <name> <medium>     # stamps skills/<name>/ from template/
```
Then fill the four slots and delete the TODOs. See `skills/prism` as a worked
second example (D3), and `skills/pyre` as the first (three.js).
