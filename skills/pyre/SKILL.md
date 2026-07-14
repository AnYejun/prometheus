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

## Author a show from natural language

Read `dsl/SPEC.md` for the full grammar. The core loop:

1. Translate the user's vibe into `shows/current.json`. Examples:
   - "dreamy, drifts in slowly" → `assemble.stagger: 0.7, ease: outExpo, dur: 5`
   - "crisp snap into place" → `assemble.stagger: 0.05, ease: outBack, dur: 2.2`
   - "alive, pulsing embers" → `breathe.amp: 0.22, freq: 0.3`
2. Reload the engine page.
3. **Screenshot it mid-assemble and once settled.** Judge like a critic:
   - Is the photo *recognizable* when settled? (too much `stagger`/`jitter` = mush)
   - Is the motion *smooth*? (too-short `dur` = jumpy)
   - Does it feel *alive*? (add/raise `breathe`)
4. Edit `current.json` and repeat until it's beautiful. This screenshot→judge→edit
   loop is the whole point — you are grading your own choreography.

## What makes it look good
- More `points` (up to ~10k) = denser, more legible image.
- `stagger` is the signature knob: low = precise, high = ethereal trailing sweep.
- Portraits and high-contrast images read best; the engine keeps bright pixels.

## This is a Prometheus skill
PYRE is one instance of a pattern: **Grammar** (`dsl/SPEC.md`) + **Executor**
(`engine/`) + **Critic** (your screenshot loop) + **Seed** (`shows/current.json`).
Swap those four and you get an LLM that can drive a new medium. See the repo README.
