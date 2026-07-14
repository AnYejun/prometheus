---
name: lyra
description: Turn a musical intent into a short playable piece — a melody, a mood, a chord idea. The user describes music in words (key, mood, tempo, "add a bassline") and you author a note DSL; a Tone.js backend plays it and draws a piano roll, self-corrected against an objective in-key metric. Use for "compose", "make a melody/tune", "write music", "a sad theme in A minor", MIDI-like sketches.
---

# LYRA

Intent → music, as a Prometheus capability. You (the LLM) author a **program**
(`dsl/GRAMMAR.md`); the executor (`engine/lyra.js`, backend = Tone.js) plays it and
draws a piano roll. You never synthesize a waveform. Same `window.PROM` contract
and critic loop as PYRE and PRISM — the medium is now **audio**.

## Run it
`python3 -m http.server 8778 --directory <repo-root>` then open
`http://localhost:8778/skills/lyra/engine/index.html`. Click **▶ play** for sound
(browsers need a user gesture to start audio). Drive it with `javascript_tool`.

`window.PROM`: `apply(program)` → render + score · `settle()` → static roll + score ·
`seek(beat)` → draw playhead at a beat · `score()` → `{ notes, inKey, voices, verdict }`.

## The loop (identical to every Prometheus capability)
1. **Author.** Turn the user's musical intent into a program (`dsl/GRAMMAR.md`).
   "a wistful theme in A minor with a slow bassline" → `key: A, scale: minor`,
   a lead track + a bass track two octaves down.
2. **In-key gate (objective).**
   `JSON.stringify(window.PROM.apply(<program>))` → read `inKey`. **Must be ≥ 0.98.**
   Below that the tune leaves its key → fix the offending `pitch` values. This is a
   real oracle: a melody that isn't in the key it claims *fails*.
3. **Shape (perceptual).** Screenshot the piano roll. Is the contour musical —
   steps not random leaps, a phrase that resolves, sensible range? Grade with the rubric.
4. **Correct** one thing, re-apply, re-shoot. Repeat.
5. **Commit** the winner to `data/current.json`.

## <a id="critic"></a>Critic rubric — symptom → fix
| What you see / hear | Fix |
|---|---|
| `inKey < 0.98` (notes on dark rows) | change those `pitch`es to scale tones |
| Melody leaps around randomly | prefer stepwise motion; keep within ~an octave |
| Feels aimless | end phrases on the root (`key`) note; repeat a motif |
| Too thin | add a `bass` track; or a harmony a third/sixth away |
| Wrong mood | swap `scale` (minor/phrygian = darker, major/lydian = brighter) |

## Why this exists
LYRA is the third flame — it takes the Prometheus Contract to a **non-visual**
medium (sound) by reusing **Tone.js**, and still runs the *same loop* with an
objective gate. Point cloud, chart, music — one framework. See `../../CONTRACT.md`.
