---
name: __NAME__
description: TODO one-line trigger — when should an LLM reach for this capability? Name the medium (__MEDIUM__) and the user phrasings that should invoke it.
---

# __NAME__

A Prometheus capability for **__MEDIUM__**. You (the LLM) author a **program**
(`dsl/GRAMMAR.md`); the executor (`engine/`) renders it. You never compute the
low-level output — the backend library does. Same `window.PROM` contract and
critic loop as every capability.

## Run it
`python3 -m http.server 8779 --directory <repo-root>` then open
`http://localhost:8779/skills/__NAME__/engine/index.html`.

## The loop (universal — see ../../CONTRACT.md)
1. **Author** a program from the user's intent (`dsl/GRAMMAR.md`).
2. **Gate:** `window.PROM.apply(<program>)` → `settle()` → read `score()`; fix the
   obvious knob until the objective gate passes.
3. **Judge** a screenshot against the rubric below.
4. **Correct** one knob, re-apply, re-shoot.
5. **Commit** the winner to `seeds/current.json`.

## <a id="critic"></a>Critic rubric — symptom → fix
| What you see | Fix |
|---|---|
| TODO (gate failure) | TODO |
| TODO (taste issue) | TODO |
