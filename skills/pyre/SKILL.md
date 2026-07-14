---
name: pyre
description: Turn any photo into a drone-show-style 3D point cloud that scatters and assembles into the image, choreographed by a tiny motion DSL and rendered as glowing embers in the browser. Use when the user wants to convert an image/photo/portrait into animated glowing points, a "particle portrait", a "drone show", or a point-cloud animation — and wants to direct the motion in natural language.
---

# PYRE

Photo → a cloud of glowing points that scatter in space and **assemble into the
photo**, then breathe and swirl. You (the LLM) are the **choreographer**, never
the geometry engine. You do exactly two things:

1. Put the user's photo at `engine/shows/source.png` (or pass `?src=<url>`).
2. Author/edit the **show** at `engine/shows/current.json` — the motion DSL.

The deterministic engine (`engine/engine.js`) does everything else: it samples
points from the image by brightness, and executes your show. **Never emit point
coordinates yourself** — that's the engine's job and it does it in milliseconds.

## Run it

1. Serve the skill directory statically (any static server; port is yours):
   `python3 -m http.server 8777 --directory <this-skill>/engine`
2. Open `http://localhost:8777/index.html` in the preview browser.
3. With no photo and no show, it renders the **PYRE** wordmark assembling — that
   proves the engine is alive. Drag any image onto the canvas to become it.

## Natural language → show + critic self-correction loop

This is the core of PYRE. The engine exposes a `window.PYRE` API so you iterate
**without reloading or writing files** — hot-swap a show, freeze a frame, and read
a numeric legibility score. Drive it with the browser `javascript_tool` +
`screenshot`. Renders are deterministic (seeded), so your edits are the only
variable.

`window.PYRE` API:
- `applyShow(obj)` → render this show now; returns metrics. **No reload.**
- `settle()` → freeze at the moment assembly completes; returns metrics.
- `seek(t)` → freeze the timeline at `t` seconds (use `t≈0.8·dur` for a mid-flight shot).
- `metrics()` → `{ points, inkCells, legibility (0–1), verdict }`.
- `play()` → resume live motion.  `getShow()` → current show.

### The loop
1. **Author.** Translate the user's vibe into a show object (read `dsl/SPEC.md`).
   - "dreamy, drifts in slowly" → `assemble.stagger 0.7, ease outExpo, dur 5`
   - "crisp snap into place" → `assemble.stagger 0.05, ease outBack, dur 2.2`
   - "alive, pulsing embers" → `breathe.amp 0.22, freq 0.3`
   - "slow cinematic turn" → `swirl.speed 0.1`
2. **Legibility gate (objective).** `javascript_tool`:
   `JSON.stringify(window.PYRE.applyShow(<show>))` then `window.PYRE.settle()`.
   Read `legibility`. If `< 0.85` the image is mush → raise `points` (up to ~10k)
   or lower `jitter`, and retry. Don't judge motion until this passes.
3. **Motion judgment (perceptual).** Two screenshots:
   `window.PYRE.seek(<0.8·dur>)` → shot (is the in-flight sweep graceful?);
   `window.PYRE.settle()` → shot (is it clean & alive?). Grade with the rubric below.
4. **Correct.** Apply one fix from the table, `applyShow` again, re-shoot. Repeat
   until it passes. You are grading your own choreography — this loop IS the skill.
5. **Commit.** Write the winning show to `shows/current.json` so it persists on reload.

### Critic rubric — symptom → knob
| What you see | Fix |
|---|---|
| Image unreadable / too sparse (legibility < 0.85) | `points` ↑, `jitter` ↓ |
| Cloud looks frozen, dead | add/raise `breathe` (`amp 0.15–0.25`) |
| Motion jumpy / abrupt | `dur` ↑, `ease` → `outExpo`/`inOutSine` |
| Arrival feels mechanical, all-at-once | `stagger` ↑ (0.4–0.7) |
| Too smeary / never resolves | `stagger` ↓, `dur` ↓ |
| Static / no life over time | add `swirl` (`speed 0.1–0.2`) |
| Feels weightless | `ease` → `outBack` for a slight overshoot |

## What makes it look good
- More `points` (up to ~10k) = denser, more legible image.
- `stagger` is the signature knob: low = precise, high = ethereal trailing sweep.
- Portraits and high-contrast images read best; the engine keeps bright pixels.

## This is a Prometheus skill
PYRE is one instance of a pattern: **Grammar** (`dsl/SPEC.md`) + **Executor**
(`engine/`) + **Critic** (your screenshot loop) + **Seed** (`shows/current.json`).
Swap those four and you get an LLM that can drive a new medium. See the repo README.
