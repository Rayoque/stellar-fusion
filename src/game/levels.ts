// src/game/levels.ts
import type { Level, LevelObjective, ElementSymbol } from './types';

export type { Level, LevelObjective };

export function formatScenarioNumber(levelId: number): string {
  if (levelId >= 1000) {
    return 'Custom';
  }
  if (levelId <= 10) {
    return `1-${levelId}`;
  } else {
    return `2-${levelId - 10}`;
  }
}

export const LEVELS: Level[] = [
  {
    id: 1,
    title: "First Light",
    author: "Protostar Core",
    description: "To ignite your star, you must establish basic nucleosynthesis. The convective layer has scattered four Hydrogen cores across opposite hemispheres. Maneuver and slide them along the curved hexagonal corridors to align them and spark your very first Helium fusion!",
    starMass: 1.5,
    maxTurns: 6,
    parMoves: 4,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 12, element: 'H' },
      { faceId: 16, element: 'H' },
      { faceId: 20, element: 'H' },
      { faceId: 25, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'He', 
        count: 1,
        hint: "Hydrogen tiles are separated by corridors. Rotate the sphere and slide them carefully into adjacent hexagon spots to fuse them. You must align and merge at least one pair to build Helium."
      }
    ]
  },
  {
    id: 2,
    title: "Pentagon Catalyst",
    author: "CNO Catalyst",
    description: "Under extreme stellar compression, pentagonal faces act as powerful catalytic nucleation sites, allowing instant self-fusion without a secondary tile. However, high-density Helium cores are currently blocking the direct avenues. Slide the blocking Helium aside, or navigate your Hydrogen around them to reach the pentagon catalyst!",
    starMass: 3.0,
    maxTurns: 5,
    parMoves: 3,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 28, element: 'H' },
      { faceId: 29, element: 'H' },
      { faceId: 15, element: 'He' },
      { faceId: 16, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_element_on_pentagon', 
        element: 'He',
        hint: "Maneuver the blocking Helium tiles out of the way first. Then, steer a single Hydrogen tile directly onto any of the empty pentagon catalyst sites (face IDs 0 to 11) to trigger a CNO self-fusion."
      }
    ]
  },
  {
    id: 3,
    title: "The Triple-Alpha Path",
    author: "Helium Bottleneck",
    description: "Arranging three Helium tiles in a tight triangle fuses them into Carbon. But raw Hydrogen tiles are sitting in the middle of the corridors, acting as highly reactive obstacles. Slide these Hydrogen tiles out of the way to clear paths, or use them as backstops, to combine your Helium nuclei into Carbon!",
    starMass: 6.5,
    maxTurns: 8,
    parMoves: 5,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 12, element: 'He' },
      { faceId: 14, element: 'He' },
      { faceId: 20, element: 'He' },
      { faceId: 13, element: 'H' },
      { faceId: 21, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'C', 
        count: 1,
        hint: "Slide the blocking Hydrogen tiles away to open up sliding avenues. Then, slide the three Helium tiles so they form a tight triangle (each sharing borders with the other two) to fuse them into Carbon."
      }
    ]
  },
  {
    id: 4,
    title: "Convective Capture",
    author: "Oxygen Synthesis",
    description: "Convective currents are pulling elements apart. Carbon has a short slide range (3 steps) and sits isolated. You have Helium tiles trapped in distant, opposite orbits, blocked by reactive Hydrogen. Guide the Helium safely around the blockers to capture the Carbon core!",
    starMass: 8.0,
    maxTurns: 7,
    parMoves: 5,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 22, element: 'C' },
      { faceId: 12, element: 'He' },
      { faceId: 31, element: 'He' },
      { faceId: 13, element: 'H' },
      { faceId: 29, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'O', 
        count: 1,
        hint: "Steer the Helium tiles around the Hydrogen blockers to avoid fusing them into unwanted extra Helium. Then, slide the Helium directly into the Carbon core to synthesize Oxygen."
      }
    ]
  },
  {
    id: 5,
    title: "The Neon Shell",
    author: "Neon Burning",
    description: "Extreme temperatures are building in the convective shell. Your heavy Oxygen core is locked in a tight corner of the sphere, surrounded by highly reactive Hydrogen walls. You must strategically maneuver the Hydrogen out of the way to clear a safe corridor, then slide your trapped Helium in to synthesize Neon!",
    starMass: 12.0,
    maxTurns: 10,
    parMoves: 6,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 17, element: 'O' },
      { faceId: 20, element: 'He' },
      { faceId: 23, element: 'He' },
      { faceId: 21, element: 'H' },
      { faceId: 22, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Ne', 
        count: 1,
        hint: "Maneuver the blocker Hydrogen tiles out of the way to open up a clear straight-line sliding corridor. Once open, guide your Helium directly into the Oxygen core."
      }
    ]
  },
  {
    id: 6,
    title: "Magnesium Resonance",
    author: "Neon Alpha-Capture",
    description: "Advanced alpha-capture requires exact resonance matching. The path to your Neon core (slide range 2) is heavily congested by a dense belt of floating Hydrogen cores. You must strategically fuse the Hydrogen belt into a Helium first, use them to clear the bottleneck, and trigger the final Magnesium fusion!",
    starMass: 15.0,
    maxTurns: 12,
    parMoves: 8,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 30, element: 'Ne' },
      { faceId: 15, element: 'He' },
      { faceId: 12, element: 'H' },
      { faceId: 13, element: 'H' },
      { faceId: 14, element: 'H' },
      { faceId: 16, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Mg', 
        count: 1,
        hint: "First, merge the adjacent Hydrogen tiles to synthesize a Helium and clear the congested belt. Once the path is clear, slide the Helium directly into the Neon core."
      }
    ]
  },
  {
    id: 7,
    title: "Silicon Synthesis",
    author: "Silicon Ash",
    description: "Your star is rapidly aging. Heavy Magnesium is extremely inert, moving only 1 step per swipe. The Helium is trapped on the extreme opposite side of the star behind winding, curved hexagonal ridges. Thread the Helium along the winding corridors to reach the Magnesium!",
    starMass: 18.0,
    maxTurns: 10,
    parMoves: 7,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 25, element: 'Mg' },
      { faceId: 12, element: 'He' },
      { faceId: 13, element: 'He' },
      { faceId: 17, element: 'H' },
      { faceId: 26, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Si', 
        count: 1,
        hint: "Since Magnesium only slides 1 step, it is highly stable. You must navigate the distant, lighter Helium tiles along the winding hexagonal corridors, using other tiles as backstops, to collide with the Magnesium."
      }
    ]
  },
  {
    id: 8,
    title: "The Silicon Trap",
    author: "Dual Core Shells",
    description: "To prepare for core collapse, you must synthesize two independent Silicon tiles. But because Silicon only slides 1 step, if you fuse them too close to each other, they will permanently jam the board! Space them out using Hydrogen and Helium tiles as pivot backstops.",
    starMass: 25.0,
    maxTurns: 15,
    parMoves: 10,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 18, element: 'Mg' },
      { faceId: 23, element: 'Mg' },
      { faceId: 12, element: 'He' },
      { faceId: 21, element: 'He' },
      { faceId: 26, element: 'He' },
      { faceId: 15, element: 'H' },
      { faceId: 27, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element_count', 
        element: 'Si', 
        count: 2,
        hint: "Magnesium and Helium fuse into Silicon. You must construct two Silicon tiles. Plan your straight-line paths well in advance and use the Hydrogen tiles as sliding walls to guide them."
      }
    ]
  },
  {
    id: 9,
    title: "Iron Core Collapse",
    author: "Supernova Threshold",
    description: "Iron fusion consumes energy, sealing the fate of the star. You have two heavy Silicon cores (slide range 1) on the board. But there is NO Helium! You only start with lightweight Hydrogen. You must first fuse the Hydrogen into a Helium, then navigate that Helium into the Silicon to ignite the supernova!",
    starMass: 29.5,
    maxTurns: 8,
    parMoves: 6,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 23, element: 'Si' },
      { faceId: 25, element: 'Si' },
      { faceId: 12, element: 'H' },
      { faceId: 13, element: 'H' },
      { faceId: 14, element: 'H' },
      { faceId: 15, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Fe', 
        count: 1,
        hint: "Combine the Hydrogen tiles into a Helium first. Then, guide the resulting Helium to slide directly into either Silicon core to synthesize Iron and trigger the supernova core collapse!"
      }
    ]
  },
  {
    id: 10,
    title: "Cosmic Equilibrium",
    author: "Grand Finale",
    description: "Maintain complete chemical balance in a highly convective star. You must unlock and possess all 8 stable elements on the board simultaneously (H, He, C, O, Ne, Mg, Si, Fe) before any core collapse occurs. A rich convective layer gives you a starting canvas—plan every merge with absolute care!",
    starMass: 20.0,
    maxTurns: 90,
    parMoves: 60,
    campaign: 'nursery',
    initialTiles: [
      { faceId: 13, element: 'C' },
      { faceId: 14, element: 'H' },
      { faceId: 15, element: 'H' },
      { faceId: 22, element: 'He' },
      { faceId: 28, element: 'He' },
      { faceId: 20, element: 'H' },
      { faceId: 21, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_all_elements',
        hint: "Have at least one of each of the 8 stable elements on the board at the same time: H, He, C, O, Ne, Mg, Si, Fe. Carefully manage the space so that you don't merge everything away or jam the board!"
      }
    ]
  },
  {
    id: 11,
    title: "Sling Gravitation",
    author: "Pivot Core",
    description: "Your star has formed a heavy Carbon core, but it sits out of direct reach of the distant Helium. You must use two light Hydrogen tiles as mobile pivot backstops. Position the Hydrogen in the sliding pathways, then launch Helium—it will strike the Hydrogen and stop, perfectly aligned to capture the Carbon into Oxygen!",
    starMass: 7.5,
    maxTurns: 8,
    parMoves: 5,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'C' },
      { faceId: 24, element: 'He' },
      { faceId: 15, element: 'H' },
      { faceId: 20, element: 'H' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'O',
        count: 1,
        hint: "Slide the Hydrogen tiles into position to act as physical blockers. Then slide the Helium so it hits a Hydrogen blocker and stops adjacent to the Carbon, allowing you to slide and merge them."
      }
    ]
  },
  {
    id: 12,
    title: "The Triple-Alpha Trap",
    author: "Resonance Block",
    description: "To synthesize Carbon, three Helium tiles must lock into a triangular cluster. However, a static Oxygen core blocks the central intersection. You cannot move the Oxygen easily. Navigate your Helium tiles around the obstacle and use the Oxygen core itself as a pivot to force the Helium into a triangle!",
    starMass: 9.0,
    maxTurns: 8,
    parMoves: 6,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 13, element: 'He' },
      { faceId: 28, element: 'He' },
      { faceId: 20, element: 'He' },
      { faceId: 15, element: 'O' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'C',
        count: 1,
        hint: "Slide the Helium tiles carefully around the central Oxygen. Use the Oxygen as a backstop to stop Helium slides in positions that form a triangle."
      }
    ]
  },
  {
    id: 13,
    title: "CNO Pinball",
    author: "Catalyst Loop",
    description: "Pentagonal nucleation sites automatically fuse a single Hydrogen into Helium. You have two Hydrogen tiles and one Carbon. But the pentagons are offset. You must slide the Hydrogen tiles onto the pentagons, harness the self-fusions to forge two Helium tiles, and slide them back into the core to synthesize Oxygen!",
    starMass: 8.0,
    maxTurns: 6,
    parMoves: 4,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 16, element: 'H' },
      { faceId: 20, element: 'H' },
      { faceId: 12, element: 'C' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'O',
        count: 1,
        hint: "Pentagons (face IDs 0-11) instantly turn H to He. Slide both Hydrogen tiles onto pentagons. Once they turn to Helium, slide them into the Carbon core."
      }
    ]
  },
  {
    id: 14,
    title: "The Confinement Shield",
    author: "Alpha Shield",
    description: "In the outer convective shell, elements are highly unstable. You must synthesize a stable Neon core directly on a pentagonal confinement site to lock it in place. The pentagon acts as a shield, but navigating the heavy, short-range Oxygen (slide range 2) onto the shield requires precise, indirect slides.",
    starMass: 10.5,
    maxTurns: 8,
    parMoves: 5,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 14, element: 'O' },
      { faceId: 25, element: 'He' },
      { faceId: 12, element: 'H' }
    ],
    objectives: [
      {
        type: 'has_element_on_pentagon',
        element: 'Ne',
        hint: "First navigate the Oxygen core onto a pentagon (face IDs 0-11). Then slide the Helium core into it to synthesize Neon directly on the pentagonal site."
      }
    ]
  },
  {
    id: 15,
    title: "Quantum Tunneling",
    author: "Corridor Squeeze",
    description: "Synthesize Magnesium on a board congested by short-range ash blocks. Your Neon core is separated from the Helium by static Carbon and Oxygen blockers. Since Neon and Helium slide at different speeds, you must strategically shift the blockers to open a narrow tunneling corridor, then shoot the Helium through!",
    starMass: 14.0,
    maxTurns: 10,
    parMoves: 7,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 22, element: 'Ne' },
      { faceId: 12, element: 'He' },
      { faceId: 13, element: 'C' },
      { faceId: 14, element: 'O' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Mg',
        count: 1,
        hint: "Neon slides 2, Carbon 3, Oxygen 2, and Helium indefinitely. Slide the Carbon and Oxygen blockers out of the central corridor to create a clear straight-line path for Helium to reach Neon."
      }
    ]
  },
  {
    id: 16,
    title: "Catalytic Cascade",
    author: "Nursery Fire",
    description: "The core is empty of Helium. You only start with three Hydrogen tiles. To forge Carbon, you must synthesize three Helium tiles and form a triangle. Slide each Hydrogen onto separate pentagon catalysts to generate the Helium, then carefully coordinate their positions to complete the triple-alpha reaction!",
    starMass: 9.5,
    maxTurns: 12,
    parMoves: 8,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 13, element: 'H' },
      { faceId: 14, element: 'H' },
      { faceId: 15, element: 'H' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'C',
        count: 1,
        hint: "Convert all three Hydrogen tiles into Helium by sliding them onto empty pentagons. Once you have three Helium tiles, slide them into a mutual triangular formation to fuse them into Carbon."
      }
    ]
  },
  {
    id: 17,
    title: "The Carbon Pivot",
    author: "Convective Brake",
    description: "Carbon is heavy and slow, sliding at most 3 steps. This range limitation is actually a valuable brake! The Helium is trapped on the opposite side of the star. Use the Carbon's 3-step slide to park it exactly at a junction point, then guide the Helium to collide with it and synthesize Oxygen!",
    starMass: 8.5,
    maxTurns: 6,
    parMoves: 4,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'C' },
      { faceId: 31, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'O',
        count: 1,
        hint: "Slide the Carbon core 3 steps to align it with the Helium's sliding path. Then, slide the Helium to collide and merge into Oxygen."
      }
    ]
  },
  {
    id: 18,
    title: "Magnesium Bottleneck",
    author: "Inertia Block",
    description: "Magnesium is extremely sluggish, sliding only 1 step per turn. You must navigate a distant, fast Helium into it. However, the Helium's straight-line paths overshoot the Magnesium. Slide the Magnesium 1 step to act as a solid pivot backstop, and use a Hydrogen tile to redirect the Helium's path!",
    starMass: 15.5,
    maxTurns: 8,
    parMoves: 5,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 26, element: 'Mg' },
      { faceId: 12, element: 'He' },
      { faceId: 13, element: 'H' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Si',
        count: 1,
        hint: "Slide the Hydrogen tile into a corridor to block the Helium, letting you steer it. Then slide the Magnesium into the intersection so Helium can slide directly into it."
      }
    ]
  },
  {
    id: 19,
    title: "Iron Forge",
    author: "Collapse Crucible",
    description: "To trigger a supernova, you must synthesize Iron. This requires fusing two Silicon cores. Since Silicon only slides 1 step, you cannot bridge large distances. You must synthesize the second Silicon core directly adjacent to or aligned with the first, utilizing Magnesium and Helium!",
    starMass: 28.0,
    maxTurns: 12,
    parMoves: 8,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 14, element: 'Si' },
      { faceId: 15, element: 'Mg' },
      { faceId: 12, element: 'He' },
      { faceId: 28, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Fe',
        count: 1,
        hint: "Combine the Magnesium and Helium to synthesize a second Silicon. Ensure the new Silicon lands directly adjacent to the starting Silicon, then slide them together to form Iron."
      }
    ]
  },
  {
    id: 20,
    title: "Stellar Gate",
    author: "Catalytic Core",
    description: "Your goal is to synthesize Silicon directly on a pentagon catalyst gate. Because Magnesium slides only 1 step, you must get it onto the pentagon first. But the path is empty and has no backstops. Slide Carbon into a bottleneck to act as a redirecting wall, then slide Magnesium onto the gate!",
    starMass: 18.0,
    maxTurns: 10,
    parMoves: 7,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 16, element: 'Mg' },
      { faceId: 25, element: 'He' },
      { faceId: 20, element: 'C' }
    ],
    objectives: [
      {
        type: 'has_element_on_pentagon',
        element: 'Si',
        hint: "Position the Carbon tile as a backstop. Slide Magnesium onto the pentagon (using the Carbon backstop to stop it). Then slide the Helium core into the Magnesium on the pentagon."
      }
    ]
  },
  {
    id: 21,
    title: "Equilibrium Gates",
    author: "Convection Storm",
    description: "Maintain a stable chemical balance in a highly convective star. You must synthesize and simultaneously possess 1 Carbon, 1 Oxygen, and 1 Neon on the board. The convective layer is active: Hydrogen rain (spawns) will fall after every move, threatening to jam your paths if you do not merge them quickly!",
    starMass: 12.0,
    maxTurns: 20,
    parMoves: 12,
    campaign: 'advanced',
    disableSpawns: false,
    initialTiles: [
      { faceId: 12, element: 'C' },
      { faceId: 14, element: 'He' },
      { faceId: 15, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Ne',
        count: 1,
        hint: "Combine Carbon + He to form Oxygen. Then combine Oxygen + He to form Neon. You must keep all three elements (C, O, Ne) on the board simultaneously."
      }
    ]
  },
  {
    id: 22,
    title: "The Double Triple-Alpha",
    author: "Triple Alpha Forge",
    description: "Forge two independent Carbon cores simultaneously from 6 Helium tiles. The challenge is layout coordination: if you slide Helium tiles together too early, they will merge into a single Carbon or lock the paths. Separate them, form two independent triangles, and ignite both cores!",
    starMass: 9.8,
    maxTurns: 12,
    parMoves: 8,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'He' },
      { faceId: 13, element: 'He' },
      { faceId: 14, element: 'He' },
      { faceId: 20, element: 'He' },
      { faceId: 21, element: 'He' },
      { faceId: 22, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element_count',
        element: 'C',
        count: 2,
        hint: "Keep the two groups of Helium separated while positioning them. Form two independent 3-Helium triangles to synthesize two Carbon cores."
      }
    ]
  },
  {
    id: 23,
    title: "Silicon Conundrum",
    author: "Alpha captures",
    description: "Ignite Silicon nucleosynthesis using only an Oxygen core and three Helium tiles. You must chain three consecutive alpha captures in a precise sequence: Oxygen captures Helium into Neon, Neon captures Helium into Magnesium, and Magnesium captures Helium into Silicon!",
    starMass: 17.0,
    maxTurns: 10,
    parMoves: 7,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'O' },
      { faceId: 14, element: 'He' },
      { faceId: 15, element: 'He' },
      { faceId: 16, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Si',
        count: 1,
        hint: "Merge Oxygen and Helium to make Neon. Then slide the next Helium in to make Magnesium, and finally the third Helium to synthesize Silicon."
      }
    ]
  },
  {
    id: 24,
    title: "Cosmic Crucible",
    author: "Supernova Forge",
    description: "Synthesize Iron under severe spatial limitations. You start with one Silicon core, one Magnesium core, and one Helium. You must fuse Magnesium and Helium into a second Silicon, then slide the two Silicons into each other. Since Silicon slides only 1 step, alignment is critical!",
    starMass: 25.0,
    maxTurns: 10,
    parMoves: 6,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'Si' },
      { faceId: 24, element: 'Mg' },
      { faceId: 25, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Fe',
        count: 1,
        hint: "Slide the Magnesium and Helium to fuse them into Silicon. Make sure it lands in a spot that has a clear, straight-line 1-step slide to the starting Silicon."
      }
    ]
  },
  {
    id: 25,
    title: "Supernova Ignition",
    author: "End of Fusion",
    description: "The ultimate synthesis challenge: ignite the supernova core collapse starting with one Silicon, one Oxygen, and three Helium tiles. You must guide the Oxygen through a complete alpha-capture chain to synthesize a second Silicon, and collide them to form Iron (total mass 56)!",
    starMass: 30.0,
    maxTurns: 15,
    parMoves: 10,
    campaign: 'advanced',
    disableSpawns: true,
    initialTiles: [
      { faceId: 12, element: 'Si' },
      { faceId: 20, element: 'O' },
      { faceId: 14, element: 'He' },
      { faceId: 15, element: 'He' },
      { faceId: 16, element: 'He' }
    ],
    objectives: [
      {
        type: 'has_element',
        element: 'Fe',
        count: 1,
        hint: "Chain the Oxygen and three Helium tiles into Neon, then Magnesium, and finally Silicon. Form this second Silicon in a position where it can slide directly into the starting Silicon core."
      }
    ]
  }
];
