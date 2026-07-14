# PYRE — FORM mode (describe an object in 3D)

The photo grammar (`SPEC.md`) samples a *flat* image by brightness — no real
depth. **FORM mode** is the Prometheus answer to that: the LLM (which can *see* the
photo) **describes the subject as 3D primitives**, and the engine fills their
surfaces with points. three.js is just the canvas; the *language* carries the 3D
structure. The result has real volume — orbit it and the chest bulges, limbs come
forward, a tail sits behind.

Open with `?scene=../shows/<file>.json`. A scene:

```json
{
  "points": 12000,
  "parts": [
    { "shape": "sphere",  "at": [0, 3.6, 0], "r": 1.15, "color": "#ffd23a", "w": 3 },
    { "shape": "capsule", "a": [-1.45, 2.55, 0], "b": [-2.55, 2.75, 0.25], "r": 0.56, "w": 2 },
    { "shape": "box",     "at": [0.72, -4.95, 0.35], "size": [0.85, 0.42, 1.35] }
  ],
  "scenes": [ { "type": "assemble", "at": 0, "dur": 3.2, "ease": "outExpo", "stagger": 0.4 } ]
}
```

## Primitives (Y is up)
| shape | fields | use for |
|-------|--------|---------|
| `sphere` | `at [x,y,z]`, `r`, `solid?` | heads, joints, pecs |
| `capsule` | `a [x,y,z]`, `b [x,y,z]`, `r`, `solid?` | limbs, torso — the workhorse |
| `box` | `at [x,y,z]`, `size [x,y,z]` | feet, slabs, blocky bits |
| `cone` | `at [x,y,z]` (base), `dir [x,y,z]`, `h`, `r` | ears, spikes, noses |

Common: `color` (hex, used directly — a yellow part glows yellow), `w` (point
weight; bigger/denser parts get more points). Points sit on the *surface* unless
`solid: true`. The whole scene is auto-centered and scaled to a standard height.
`scenes` is the same choreography as photo mode (assemble/breathe/swirl).

## How the LLM authors one
Look at the subject. Block it out as a stick-figure of primitives: a sphere for the
head, capsules for each limb segment (author the *pose* — a flexed arm is two
capsules meeting at the elbow), a fat capsule/box for the torso, boxes for feet.
Place them in 3D (give the chest a positive `z`, the tail a negative `z`). Colors
from the photo. That authored structure *is* the 3D model.

## Critic (the objective gate — designed, next to build)
`silhouetteIoU`: render the assembled scene from the front, compare its silhouette
to the source photo's subject mask (intersection-over-union). A description that
doesn't match the photo's outline fails the gate → adjust part positions/sizes and
re-render. Same author→gate→screenshot→fix loop as every capability; the gate here
is "does the 3D form project back to the photo?". (Today the loop runs on visual
judgment; the IoU gate lands when a source mask is provided.)

## Roadmap
`torus`, `tube`/spline limbs, mirror helper (author one arm → mirror), per-part
`noise`, and auto-authoring: a vision pass emits the parts from any photo.
