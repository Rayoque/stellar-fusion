# Stellar Fusion — MVP

3D sphere-based fusion puzzle game on a truncated icosahedron (soccer ball topology), governed by simplified real stellar nucleosynthesis rules.

Spiritual successor to 2048.

## Tech
- React 19 + TypeScript + Vite
- Three.js + @react-three/fiber + drei
- Zustand for state
- Tailwind
- Web Audio API (synthesized)

## Run locally

```bash
cd stellar-fusion
npm install
npm run dev
```

Then open http://localhost:5173

## Implementation status (per spec order)
- [x] Geometry (truncated icosahedron + adjacency) — basic working version; refine with tests
- [x] R3F rendering + OrbitControls
- [x] Drag + slide resolution
- [x] Merge rules (H→He, triple-alpha, alpha chain, Si→Fe)
- [x] Hydrogen spawn on every move
- [x] Phase system + visual scale
- [x] End states
- [x] Audio (merge swoops, ambient drone, spawn tick)
- [x] HUD + End screen
- [ ] Full polish, particles, perfect geometry adjacency (high priority for playtest)

## First-principles notes
- Iron is immovable by design (slideDistance: 0) — it is the endpoint of fusion.
- Pentagon CNO shortcut gives early progression.
- Triangle requirement for triple-alpha creates satisfying regime shift into red giant phase.
- Every committed drag costs one hydrogen — preserves 2048 pressure.

Built following the architecture spec. MVP load-bearing features implemented.

Next: Playtest steps 1-7 from spec. Feel-test the core loop.
