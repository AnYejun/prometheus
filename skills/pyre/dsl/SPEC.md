# PYRE choreography DSL — v0

A **show** is a JSON object. It is the *only* thing the LLM writes. The engine
(`engine/engine.js`) is deterministic: it samples points from the photo and
executes the scenes below. Design rule: this language is optimized to be the
**output of an LLM and the input of a renderer** — not for human hand-writing.

```json
{
  "points": 5200,
  "scenes": [ ... ]
}
```

`points` — how many motes to sample from the source image (2000–12000).

## Scenes

Scenes run on one timeline (seconds). `assemble` runs once; `breathe` and
`swirl` are continuous modifiers that start at `at` and persist.

### `assemble` — the birth
Points fly from a scattered start into the photo.

| field   | type   | meaning |
|---------|--------|---------|
| `at`    | sec    | when it begins |
| `dur`   | sec    | total flight time |
| `ease`  | enum   | `outExpo` `outCubic` `inOutSine` `outBack` `linear` |
| `stagger` | 0–1  | how spread-out the arrivals are. **0** = all land together (crisp), **0.7** = long trailing sweep (dreamy). This one knob is 80% of the "drone-show" feel. |
| `from`  | enum   | `sphere` (current) |

### `breathe` — the life
A slow radial pulse so the cloud looks alive, not frozen.

| field  | type | meaning |
|--------|------|---------|
| `at`   | sec  | when it starts (usually = assemble end) |
| `amp`  | 0–0.4| pulse depth. 0.1 subtle, 0.3 dramatic |
| `freq` | Hz   | pulses per second. 0.2 = calm |

### `swirl` — the drift
Cinematic rotation.

| field   | type | meaning |
|---------|------|---------|
| `at`    | sec  | when it starts |
| `speed` | 0–1  | rotation rate. 0.1 calm, 0.5 lively |
| `axis`  | enum | `y` (current) |

## Natural-language → show (LLM's job)
- "crisp and sudden" → `stagger: 0.05`, `ease: outBack`, short `dur`
- "dreamy, drifts in" → `stagger: 0.7`, `ease: outExpo`, `dur: 5`
- "alive and pulsing" → `breathe.amp: 0.22`, `freq: 0.3`
- "slow cinematic turn" → `swirl.speed: 0.1`

## Roadmap (verbs not yet in the engine — PRs welcome)
`dissolve` (points drift to dust), `morph` (photo A → photo B), `explode`,
`text` (assemble into a word), real `depth` via a depth map.
