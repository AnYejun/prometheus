# 🚀 Prometheus — launch kit

Everything needed to make this a legendary repo. Copy is paste-ready. **You post
it** — this file just prepares the shots.

Live demo: https://anyejun.github.io/prometheus/ · Repo: https://github.com/AnYejun/prometheus

## The one-liner (memorize this)
> **Give an LLM a language, and it wields the world that language describes.**
> Prometheus is a framework for LLM-authored DSLs — photo→drone-show, data→chart,
> text→music — all driven by one self-correcting critic loop.

## Why it can spread
1. **Instant wow** — the three GIFs (embers assembling, bars growing, a playhead sweeping) do the pitch in 2 seconds.
2. **Zero install** — one click runs each demo in the browser (GitHub Pages).
3. **A real idea, not a toy** — "the LLM is the director, not the pixel engine" +
   "languages designed as the output of a generator and input of a verifier." Devs argue about ideas → engagement.
4. **Hackable hook** — `prometheus-new <name> <medium>` invites PRs (add music verbs, a shader lang, etc.).

## The hook assets
- `assets/pyre.gif`, `assets/prism.gif`, `assets/lyra.gif` (drop these directly into posts)
- `assets/hero.png` (the woodcut medallion — banner / social card)
- 30-sec screen recording idea: run the PYRE loop live (author → screenshot → fix), then PRISM, then LYRA.

## Channel plan (order matters)
1. **Show HN** (Tue–Thu, ~8–10am ET). Highest-signal audience for a framework idea.
2. **X/Twitter thread** the same morning; pin it. Lead with the PYRE gif.
3. **Reddit**: r/proceduralgeneration + r/creativecoding (the art), r/LocalLLaMA (the LLM idea). Space them a day apart, tailor the intro.
4. **Product Hunt** (optional, later) once you have stars + a couple testimonials.
5. **LinkedIn** for the "here's the idea" essay version.

---

### Show HN — title
`Show HN: Prometheus – give an LLM a language and it wields that medium (3 demos)`

### Show HN — body
```
I kept hitting the same wall: an LLM "can't" do 3D, or music, or charts — but it
can write any language fluently. So instead of retraining, I give it a small DSL
for a domain + a deterministic engine that runs the DSL + a critic that scores the
output, and let it self-correct in a loop.

Three capabilities, all on the same contract and the same loop:
- PYRE: a photo becomes a drone-show point cloud (backend: three.js)
- PRISM: data becomes an animated chart (backend: D3). The critic gate is encoding
  fidelity — a chart that misrepresents the numbers fails.
- LYRA: text becomes music (backend: Tone.js). The critic gate is in-key ratio.

The LLM is the director, never the pixel/geometry engine. The DSLs are designed to
be the output of a probabilistic generator and the input of a deterministic
verifier — not for human ergonomics. Adding a new medium = filling four slots
(grammar, executor, critic, seed); there's a one-command scaffolder.

Live (runs in your browser): https://anyejun.github.io/prometheus/
Code: https://github.com/AnYejun/prometheus

Would love feedback on the critic design — the objective gate per medium is the
part I think generalizes.
```
Reply fast to the first comments; that's what decides HN ranking.

---

### X / Twitter thread
```
1/ LLMs "can't" compose music or build 3D — wrong framing.

An LLM is a language engine. Give it a *language* for a world, and it wields that
world. I built a framework for exactly this. 3 demos 🧵🔥
[attach pyre.gif]

2/ PYRE: drop a photo → it shatters into embers that assemble into the image.
The LLM writes a tiny choreography DSL; three.js renders it; a critic scores
legibility and the LLM self-corrects. It never touches a coordinate.
[attach pyre.gif]

3/ Same framework, new medium: PRISM. Data → an animated chart (backend: D3).
The critic gate is *encoding fidelity* — a chart that lies about the numbers fails
the gate. Not taste; math.
[attach prism.gif]

4/ Non-visual too: LYRA. Text → music (backend: Tone.js). The gate is in-key
ratio. A melody that wanders out of key fails and gets fixed.
[attach lyra.gif]

5/ The trick: the LLM is the *director*, never the pixel engine. And the DSLs are
built to be the output of a generator + the input of a verifier.
Add a medium = 4 slots + one command. Runs in your browser:
anyejun.github.io/prometheus · ★ github.com/AnYejun/prometheus
```

---

### Reddit — r/proceduralgeneration / r/creativecoding
Title: `Prometheus: an LLM writes a tiny DSL, and a critic loop makes it draw/animate/compose (3 browser demos)`
Body: short intro + the 3 gifs + live link. Ask: "what medium should be the 4th capability?"

### Reddit — r/LocalLLaMA
Title: `Extending LLMs to new mediums via authored DSLs + an objective critic gate (open source)`
Lead with the *idea* (director not engine; generator-output/verifier-input DSLs), then the demos.

---

### Product Hunt
- Tagline: `Give an LLM a language, and it wields that medium`
- First comment: the Show HN body, trimmed.

## Pre-launch checklist
- [ ] GitHub Pages live + all 3 demos load (three.js/D3/Tone from CDN OK on Pages)
- [ ] README hero + 3 GIFs render on GitHub
- [ ] Repo topics + description set
- [ ] A 20–30s screen-recording of the live critic loop (optional but huge)
- [ ] Pin the X thread; have HN + Reddit tabs ready to reply for the first 2 hours
```
```
