# 🔥 Prometheus

**Give an LLM a language, and it can wield the world that language describes.**

Language is a lossy compression of reality. An LLM is a language engine. So the
way to hand an LLM a *new* ability is not to retrain it — it's to give it a
**small language for a domain**, plus a deterministic engine that turns that
language into effect, plus a way to tell good output from bad.

Prometheus is a pattern (and a growing set of ready-to-plug **skills**) for doing
exactly that. Every skill is four pieces:

| Piece | What it is | Compiler analogy |
|-------|-----------|------------------|
| **Grammar** | what can be expressed (the DSL) | front-end |
| **Executor** | what the language *means* — renders/runs it | back-end |
| **Critic** | how to tell good from bad (the feedback signal) | test suite |
| **Seed** | a few worked examples | fixtures |

The twist that makes this new: in classic language-oriented programming, a
*human* writes the DSL. Here the **LLM writes it and a critic grades it**. So the
languages are designed to be the **output of a probabilistic generator and the
input of a deterministic verifier** — optimized for LLM-generability and
machine-verifiability, not human ergonomics.

The LLM is the **director**, never the pixel/geometry engine. That split is the
only version of "infinitely extensible LLM" that actually works.

## Skills

### 🔥 [PYRE](skills/pyre) — photo → drone-show point cloud
Drop a photo; it shatters into thousands of glowing embers that assemble into the
image, then breathe and swirl. The LLM authors a tiny **choreography DSL**; a
three.js engine renders it in the browser. Zero install — open one HTML file.

```
skills/pyre/
  SKILL.md            # plug this into your LLM
  dsl/SPEC.md         # the choreography grammar
  engine/             # deterministic executor (three.js)
  shows/current.json  # the seed show — the LLM edits this
```

*More flames coming: music (ABC → sound), diagrams (SVG), 3D form (OpenSCAD).*

## Try PYRE now
```
python3 -m http.server 8777 --directory skills/pyre/engine
open http://localhost:8777/index.html      # drag a photo onto it
```
