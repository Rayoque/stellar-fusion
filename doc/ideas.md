# Ideas

Scratchpad for future directions not yet on the public roadmap. Nothing here is
committed scope. Build only after deliberate design.

## Scenario editor

A dev-facing tool for hand-authoring campaign boards instead of editing
`src/game/levels.ts` by hand.

- Click a face to cycle the element placed on it (empty → H → He → ... → Fe).
- Set star mass, turn budget, and objective in a form.
- Export the result as a `Level` object ready to paste into `levels.ts`.
- Gate it behind the existing debug mode (`localStorage.stellar_debug`), so it
  ships dark and never appears for normal players.
- Natural follow-on to Phase 1 debug mode: the panel already knows how to mutate
  game state; the editor extends that to per-face placement.

## Obstacle tiles — coronal mass ejection

Dead faces that block fusion and movement, adding spatial puzzle constraints.

- A face flagged as an obstacle (e.g. a solar prominence / coronal mass
  ejection) holds no element and cannot be slid onto.
- Tiles sliding toward it stop short, the same way iron's `slideDistance: 0`
  makes iron a wall — reuse that mechanism rather than inventing a new one.
- Could be permanent (fixed scenario geometry) or temporary (erupts for N
  turns, then clears), which changes the puzzle character significantly.
- Pairs well with the scenario editor: author boards where obstacles force
  specific routing of hydrogen around the sphere.
