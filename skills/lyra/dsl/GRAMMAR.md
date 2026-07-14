# LYRA music language — v0

A **program** is JSON. The LLM writes it; the Tone.js executor plays it and draws
a piano roll. Optimized to be LLM-written and machine-verified (in-key).

```json
{
  "title": "Aeolian ember",
  "tempo": 92,
  "key": "A",
  "scale": "minor",
  "tracks": [
    { "name": "lead", "wave": "triangle", "notes": [
      { "t": 0, "dur": 1, "pitch": "A4" },
      { "t": 2, "dur": 2, "pitch": "E5" }
    ] }
  ]
}
```

## Fields
- `tempo` — BPM.
- `key` — root note: `C` `A` `F#` `Bb` … (letter + optional `#`/`b`).
- `scale` — `major` `minor` `dorian` `mixolydian` `phrygian` `lydian`
  `pentatonicMajor` `pentatonicMinor` `chromatic`. Defines what's *in key*.
- `tracks[]` — each has `wave` (`triangle` `sine` `square` `sawtooth`) and `notes[]`.
- `notes[]` — `t` (start, in beats), `dur` (length, in beats), `pitch`
  (scientific pitch, e.g. `A4`, `C#5`, `Eb3`).

## Natural language → program
- "sad / dark" → `scale: minor` or `phrygian` · "bright" → `major` / `lydian`
- "folky, safe" → `pentatonicMajor` (hard to hit a wrong note)
- "faster" → raise `tempo` · "add a bassline" → a second track an octave or two down

## Critic
`score()` → `{ notes, inKey, voices, verdict }`.
- **inKey** (0–1) — fraction of notes whose pitch class is in `key`+`scale`.
  **Gate ≥ 0.98.** Below that the melody wanders out of key → fix the offending
  `pitch` values (the piano roll shades in-key rows, so off-key notes sit on dark rows).

## Roadmap (same contract, not yet built)
chords/arpeggios, `swing`, per-note `vel`, drum track, `section` repeats, tempo curves.
