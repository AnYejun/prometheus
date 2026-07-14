# __NAME__ language — v0

A **program** is JSON. The LLM writes it; `engine/executor.js` renders it.
Design rule: optimize for **LLM-generability + machine-verifiability**, not human
hand-tuning. Keep it small and total (no ambiguous constructs).

```json
{
  "TODO": "define the smallest set of fields that describes your world"
}
```

## Fields
- TODO: name each field, its type, and what it controls.

## Natural language → program
- TODO: "user says X" → `field: value`. Give 3–5 concrete mappings so the LLM
  can translate intent reliably.

## Critic
`score()` returns TODO. Name the objective gate (a number the loop checks) and
the perceptual things judged from a screenshot.

## Roadmap
- TODO: verbs you haven't built yet. Same contract — add them later.
