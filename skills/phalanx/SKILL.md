---
name: phalanx
description: Turn a basketball situation into a designed set play. The user describes intent ("need a 3 vs drop coverage", "get the big a rim run", "ATO for a corner three") and you author a play — five routes, screens, passes, a shot — which a possession simulator runs against a reactive man defense and scores by expected points. Use for basketball plays, tactics, set plays, X's and O's, "draw up a play", pick-and-roll, ATO.
---

# PHALANX

Intent → a basketball play, as a Prometheus capability. You (the LLM) author a
**play** (`dsl/GRAMMAR.md`); the engine (`engine/phalanx.js`) simulates five
offensive routes against a **reactive man defense** and scores the possession's
expected value. You author offense; **the defense is the verifier** — a play that
doesn't beat it fails the gate. This is why it's Prometheus-shaped: designing a
play is hard, but simulating whether it gets an open shot is cheap and deterministic.

## Run it
`python3 -m http.server 8778 --directory <repo-root>` then open
`http://localhost:8778/skills/phalanx/engine/index.html`. Click **▶ run** to watch
the possession. Drive it with `javascript_tool`.

`window.PROM`: `apply(play)` → simulate + return score · `settle()` → jump to the
shot + score · `seek(t)` → draw the board at time t (seconds) · `score()` →
`{ ev, shotType, openness, turnoverRisk, violations, verdict }`.

## The loop (identical to every Prometheus capability)
1. **Author.** Turn the situation into a play (`dsl/GRAMMAR.md`). Court is in feet,
   basket at (25,5.25), offense attacks toward y=0. Space the floor (corners + wings),
   route a screener next to the ball-handler's defender, then move the ball-handler to
   open space and shoot.
2. **EV gate (objective).** `JSON.stringify(window.PROM.apply(<play>))` then
   `window.PROM.settle()`. Read `ev` — expected points. **Must be ≥ 1.05, `violations`
   empty, `openness` ≳ 4ft.** If not, the play doesn't beat the defense → fix it.
3. **Watch (perceptual).** `seek` a few times (or screenshot at the shot). Does the
   spacing look real? Is the screen actually contacting the defender? Grade with the rubric.
4. **Correct** one thing, re-apply, re-check. Repeat.
5. **Commit** the winner to `plays/current.json`.

## <a id="critic"></a>Critic rubric — symptom → fix
| What you see / read | Fix |
|---|---|
| `ev < 1.05`, low `openness` | the shooter is covered — sharpen the screen angle/timing, or move the shot to space |
| `violations: too fast` | a route covers too much ground too quickly — add a keyframe / more time |
| `violations: 3s` | an offensive player parked in the paint — route them out |
| `turnoverRisk` high | a pass goes through a defender — change the passing angle or add a screen |
| screen "misses" (defender not slowed) | route the screener *closer* to the defender's path, at the right `t` |
| contested at the rim | the help stepped up — kick to the open shooter their helper left |

## Boundary (honest)
This beats **this** defensive model, not an NBA defense — real-defense validity
needs proprietary tracking data. The moat is the sim + defense fidelity. See GRAMMAR.

## Why this exists
PHALANX takes the Prometheus Contract into **multi-agent spatiotemporal strategy** —
a thing natural language genuinely can't hold (coaches use diagrams for a reason) and
LLMs are notoriously bad at. The gate is a physics-ish simulation, not vibes. One
framework: point cloud, chart, music, and now a play that beats a defense.
