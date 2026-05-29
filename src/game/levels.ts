// src/game/levels.ts
import type { ElementSymbol } from './types';

export interface LevelObjective {
  type: 'has_element' | 'has_element_on_pentagon' | 'has_element_count' | 'has_all_elements' | 'reach_turn';
  element?: ElementSymbol;
  count?: number;
  faceId?: number;
  hint?: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  author: string;
  starMass: number;
  maxTurns: number;
  initialTiles: Array<{ faceId: number; element: ElementSymbol }>;
  objectives: LevelObjective[];
}

export const LEVELS: Level[] = [
  {
    id: 1,
    title: "First Light",
    author: "Protostar Core",
    description: "To ignite your star, you must establish basic nucleosynthesis. The convective layer has scattered four Hydrogen cores across opposite hemispheres. Maneuver and slide them along the curved hexagonal corridors to align them and spark your very first Helium fusion!",
    starMass: 1.5,
    maxTurns: 6,
    initialTiles: [
      { faceId: 12, element: 'H' }, // Hexagon
      { faceId: 16, element: 'H' }, // Spaced far away: no immediate neighbor
      { faceId: 20, element: 'H' }, // Hexagon on opposite hemisphere
      { faceId: 25, element: 'H' }  // Hexagon
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
    initialTiles: [
      { faceId: 28, element: 'H' },  // Hydrogen
      { faceId: 29, element: 'H' },  // Hydrogen
      { faceId: 15, element: 'He' }, // Static Helium blocking path to pentagon 4/8
      { faceId: 16, element: 'He' }  // Static Helium blocking path to pentagon 10
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
    initialTiles: [
      { faceId: 12, element: 'He' }, // Spaced out Helium
      { faceId: 14, element: 'He' }, // Spaced out Helium
      { faceId: 20, element: 'He' }, // Spaced out Helium
      { faceId: 13, element: 'H' },  // Obstacle: Hydrogen in the corridor
      { faceId: 21, element: 'H' }   // Obstacle: Hydrogen in the corridor
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
    initialTiles: [
      { faceId: 22, element: 'C' },  // Carbon core (slide distance 3)
      { faceId: 12, element: 'He' }, // Trapped Helium
      { faceId: 31, element: 'He' }, // Trapped Helium
      { faceId: 13, element: 'H' },  // Blocker Hydrogen
      { faceId: 29, element: 'H' }   // Blocker Hydrogen
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
    initialTiles: [
      { faceId: 17, element: 'O' },  // Heavy Oxygen
      { faceId: 20, element: 'He' }, // Spaced out Helium
      { faceId: 23, element: 'He' }, // Spaced out Helium
      { faceId: 21, element: 'H' },  // Blocker Hydrogen
      { faceId: 22, element: 'H' }   // Blocker Hydrogen
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
    initialTiles: [
      { faceId: 30, element: 'Ne' }, // Neon core (slide distance 2)
      { faceId: 15, element: 'He' }, // Helium
      { faceId: 12, element: 'H' },  // Dense Hydrogen belt
      { faceId: 13, element: 'H' },  // Dense Hydrogen belt
      { faceId: 14, element: 'H' },  // Dense Hydrogen belt
      { faceId: 16, element: 'H' }   // Dense Hydrogen belt
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
    initialTiles: [
      { faceId: 25, element: 'Mg' }, // Ultra-heavy Magnesium (slide distance 1)
      { faceId: 12, element: 'He' }, // Extreme opposite side Helium
      { faceId: 13, element: 'He' }, // Extreme opposite side Helium
      { faceId: 17, element: 'H' },  // Ridges/Blocker
      { faceId: 26, element: 'H' }   // Ridges/Blocker
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
    initialTiles: [
      { faceId: 18, element: 'Mg' }, // Magnesium core 1
      { faceId: 23, element: 'Mg' }, // Magnesium core 2
      { faceId: 12, element: 'He' }, // Scattered Helium
      { faceId: 21, element: 'He' }, // Scattered Helium
      { faceId: 26, element: 'He' }, // Scattered Helium
      { faceId: 15, element: 'H' },  // Pivot Hydrogen
      { faceId: 27, element: 'H' }   // Pivot Hydrogen
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
    initialTiles: [
      { faceId: 23, element: 'Si' }, // Heavy Silicon (slide distance 1)
      { faceId: 25, element: 'Si' }, // Heavy Silicon (slide distance 1)
      { faceId: 12, element: 'H' },  // Lightweight Hydrogen gas
      { faceId: 13, element: 'H' },  // Lightweight Hydrogen gas
      { faceId: 14, element: 'H' },  // Lightweight Hydrogen gas
      { faceId: 15, element: 'H' }   // Lightweight Hydrogen gas
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
    initialTiles: [
      { faceId: 13, element: 'C' },  // Carbon
      { faceId: 14, element: 'H' },  // Hydrogen
      { faceId: 15, element: 'H' },  // Hydrogen
      { faceId: 22, element: 'He' }, // Helium
      { faceId: 28, element: 'He' }, // Helium
      { faceId: 20, element: 'H' },  // Hydrogen
      { faceId: 21, element: 'H' }   // Hydrogen
    ],
    objectives: [
      { 
        type: 'has_all_elements',
        hint: "Have at least one of each of the 8 stable elements on the board at the same time: H, He, C, O, Ne, Mg, Si, Fe. Carefully manage the space so that you don't merge everything away or jam the board!"
      }
    ]
  }
];
