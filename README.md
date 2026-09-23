# Stellar Fusion

A 3D nucleosynthesis puzzle played on the surface of a soccer ball. Slide hydrogen into hydrogen to build helium, then carbon, then heavier elements, all the way to iron. A spiritual successor to 2048, with real stellar physics as the rule set.

![Stellar Fusion gameplay](./doc/img/hero-gameplay.png)

## Play it

Play the live web version directly here: **[https://rayoque.github.io/stellar-fusion/](https://rayoque.github.io/stellar-fusion/)**

Or run it locally:

```bash
git clone https://github.com/Rayoque/stellar-fusion.git
cd stellar-fusion
npm install
npm run dev
```

Open http://localhost:5173.

## Modes

Three ways to play, selectable from the start screen:

![Start screen](./doc/img/start-screen.png)

- **Stellar Life** — choose a star and burn it. Mass decides how long it lives, how far its core can fuse, and how it dies. Start with a Sunlike star; each ending you witness unlocks a heavier one.
- **Stellar Campaign** — 25 hand-built puzzles in two chapters, each with a fixed layout, a move limit, and an objective. Every par is the true minimum, checked by an exhaustive solver.
- **Astrophysicist Mode** — unlocks once all 25 scenarios are complete. It swaps in the full isotope chain of [Fe26](https://dimit.me/Fe26/) (see Credits), rule for rule.

## How fusion works

The board is a truncated icosahedron: 12 pentagons and 20 hexagons, the same shape as a soccer ball or a C60 buckminsterfullerene molecule. Tiles live on each face. Drag a tile and it slides across the sphere until it hits something or runs out of range; heavier nuclei travel less far, and iron cannot move at all. Every move rains in new hydrogen.

Fusion rules follow the actual physics, simplified:

- H + H → He (proton–proton chain)
- 3 He on a triangle → C (triple-alpha process)
- C + He → O, O + He → Ne, Ne + He → Mg, Mg + He → Si (alpha ladder)
- Si + Si → Fe (silicon burning)
- A lone H that stops on a pentagon fuses into He by itself (a stand-in for the CNO cycle)
- Stars under 8 M☉ never get hot enough to burn carbon, so their cores stop at oxygen

The star evolves through main sequence, red giant and supergiant as its core fills with heavier elements. Forging iron ends fusion: the core collapses.

## Stellar Life

| Star | Mass | Lifetime | Burns to | Fate |
|---|---|---|---|---|
| Sunlike | 1 M☉ | 60 moves | oxygen | white dwarf |
| Massive | 15 M☉ | 50 moves | iron | neutron star |
| Very massive | 30 M☉ | 42 moves | iron | black hole |

Lifetimes shrink with mass, as in real stars (τ ∝ M^-2.5, compressed to a playable range). Your score is the mass you fuse. Forge iron before time runs out and you trigger the supernova yourself, for a bonus. The final silicon + silicon fusion is the big decision: collapse now, or squeeze in more fusion first.

## Campaign

Each scenario sets the stellar mass, a move limit, and an objective, then drops you into a tailored board. The first chapter teaches one idea per level; the second combines them, with tempting wrong moves.

![Stellar Campaign scenario select](./doc/img/campaign.png)

The scenario editor (from the campaign screen) lets anyone build and share their own puzzles, and its **Solve** button reports the fewest moves, how many optimal lines exist, and how many first moves can reach one.

## Astrophysicist Mode

The unlockable advanced mode plays Fe26's fusion, decay and scoring tables exactly: deuterium and the helium isotopes, the fleeting beryllium bottleneck, magnesium-24 as a dead end, and the alpha ladder from silicon up to nickel-56, which decays into iron-56. Every move adds a tile and only fusion makes room, so the run ends when the sphere is full; if an iron-56 core is on the board by then, it ends in a supernova.

![Astrophysicist Mode](./doc/img/astrophysicist-mode.png)

## Codex & menu

A Stellar Codex tracks each element synthesized so far, with a short physics note and the slide rules for every tile. The in-game menu covers resume, how-to-play, the codex, reset, and settings (drone, sound effects, haptics).

![Stellar Codex](./doc/img/codex.png)

![Game menu](./doc/img/pause-menu.png)

## Stack

React 19, TypeScript, Vite, Three.js via @react-three/fiber and drei, Zustand for state, Tailwind for UI, Web Audio API for synthesized sound.

## Development tools

- `npm run verify:levels` — solves every campaign level and fails if a par isn't the true minimum.
- `npm run simulate [runs]` — plays thousands of Stellar Life and Astrophysicist runs with simple bots through the real rules, to tune lifetimes and bonuses.

The move pipeline lives in `src/game/engine.ts` and is shared by the game, the solver (`src/game/solver.ts`) and the simulator, so they can never disagree about the rules.

## Design notes

The original architecture spec is in [doc/stellar-fusion-architecture.pdf](doc/stellar-fusion-architecture.pdf).

Core design decisions:

- Iron's `slideDistance: 0` makes it a permanent dead tile. This is the entire reason iron exists as an endpoint in real stars too.
- The pentagon CNO shortcut gives a way out of the early-game grind, mirroring how massive stars use catalytic carbon-nitrogen-oxygen cycles to burn hydrogen faster.
- The triple-alpha requirement (three He on a triangular neighborhood) creates a clean regime shift, from filling the board with helium to reorganizing it. That shift is the red giant phase.
- One hydrogen per move keeps the board pressured, but a full sphere can always fuse, so the board alone never ends a run. The lifetime is what gives each run its stakes.

## Status

Playable and in active development, with three modes and a 25-level campaign.

## Future plans

- More puzzles, built with the solver in the loop.
- Haptic feedback in a native build, with a no-ads release on the Apple App Store.
- Broader compatibility across devices.

Feedback is very much appreciated — open an issue or reach out.

## Credits & Inspiration

The advanced unlockable **Astrophysicist Mode** is directly inspired by and modeled after the nucleosynthesis browser game **[Fe26](https://dimit.me/Fe26/)** by [Dimitri](https://dimit.me/). The original is well worth a look for anyone interested in stellar core fusion puzzle logic.

## License

MIT. See [LICENSE](LICENSE).
