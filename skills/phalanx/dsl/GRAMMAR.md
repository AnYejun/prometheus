# PHALANX play language — v0

A **play** is JSON. The LLM authors 5 offensive routes + screens + passes + a shot.
The engine simulates it against a **reactive man defense** and scores the
possession's expected value. You author offense; the defense is the engine's
adversary (the verifier).

Court is in **feet**. Half court is 50 wide (x: 0–50) × 47 long (y: 0–47). The
**basket is at (25, 5.25)** and the offense attacks toward y=0. 3pt arc ≈ 23.75ft
from the rim (22 in the corners). Paint is x 17–33, y 0–19.

```json
{
  "title": "Horns PnR — pull-up 3",
  "defense": "drop",
  "duration": 3.4,
  "players": [
    { "id": "1", "route": [[0,[25,31]], [1.15,[25.6,27.6]], [2.2,[30,29.5]], [3.2,[31,30.6]]] },
    { "id": "5", "route": [[0,[25,22]], [1.1,[25.9,26.9]], [3.2,[19,12]]] }
  ],
  "screens": [ { "by": "5", "on": "1", "t": 1.3 } ],
  "ball": { "start": "1", "passes": [], "shot": { "t": 3.0, "by": "1" } }
}
```

## Fields
- `players[]` — five, `id` "1"–"5". `route` = `[[t, [x,y]], …]` keyframes (t in
  seconds). Positions interpolate; **> ~24 ft/s is illegal** (players can't teleport).
- `screens[]` — `{ by, on, t }`: player `by` screens `on`'s defender near time `t`.
  The screen effect is *geometric*: standing a screener next to a defender slows him.
- `ball.start` — who has it. `passes` — `[{ t, to }]`. `shot` — `{ t, by }`.
- `defense` — `drop` (screener's man sags to the paint), `tight` (everyone pressures).

## Natural language → play
- "screen creates an open pull-up" → route the ball-handler off a screener, then to
  space; the on-ball defender lags → openness.
- "vs drop" → `defense: "drop"` — the big won't hedge, so the ball-handler has a
  window before the drop defender recovers.
- "skip to the corner" → a `pass` to a corner shooter once his defender helps in.

## Critic — the expected-value gate
`score()` → `{ ev, shotType, openness, turnoverRisk, violations, verdict }`.
- **ev** — expected points of the possession = shot value × (contest from
  `openness`) × (1 − turnover risk). **Gate ≥ 1.05** for a quality look.
- **openness** — nearest defender to the shooter at release (ft). < ~4 = contested.
- **violations** — 3-second, out of bounds, or an illegal (too-fast) route → EV tanks.
- A play that doesn't beat the defense (low EV, or a stolen pass) **fails** — fix the
  timing, the screen angle, or the shot choice and re-run.

## Boundary (honest)
This beats **this** defensive model, not necessarily an NBA defense — real-defense
validity needs tracking data. The moat is the fidelity of the sim + defense policy.

## Roadmap
switch/zone coverage, help+rotations, off-ball reads (conditional routes), a
possession-EV table from real data, defender-AI difficulty tiers.
