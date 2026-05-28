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
    title: "Deuterium Fusion",
    author: "",
    description: "Embark on a simple path. To ignite your star, you must establish basic nucleosynthesis by combining raw hydrogen cores under gentle gravity.",
    starMass: 1.5,
    maxTurns: 5,
    initialTiles: [
      { faceId: 0, element: 'H' },
      { faceId: 1, element: 'H' },
      { faceId: 10, element: 'H' },
      { faceId: 11, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'He', 
        count: 1,
        hint: "Combine two Hydrogen ('H') tiles to fuse them into a single Helium ('He') tile. Just drag/swipe Hydrogen tiles adjacent to each other."
      }
    ]
  },
  {
    id: 2,
    title: "Pentagon Catalyst",
    author: "",
    description: "In real astrophysics, the catalytic CNO cycle operates under extreme pressure, allowing rapid hydrogen burning. Locate the pentagon faces of your star's topology and slide a single hydrogen into a pentagon to trigger a rapid quantum shortcut!",
    starMass: 3.0,
    maxTurns: 4,
    initialTiles: [
      { faceId: 5, element: 'H' }, // hex neighbor to pentagon
      { faceId: 12, element: 'H' }, // hex neighbor to pentagon
      { faceId: 20, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element_on_pentagon', 
        element: 'He',
        hint: "Pentagons act as catalyst sites. Slide a Hydrogen tile directly onto any of the 12 pentagonal faces of the buckyball. This immediately triggers self-fusion into Helium ('He')."
      }
    ]
  },
  {
    id: 3,
    title: "The Triple-Alpha Path",
    author: "",
    description: "To burn helium, your star must navigate the triple-alpha bottleneck. Three helium nuclei must collide simultaneously to form carbon. Arrange three helium tiles in a tight triangle on the board to spark carbon ignition! Plan your moves carefully; one wrong slide blocks the path.",
    starMass: 6.5,
    maxTurns: 8,
    initialTiles: [
      { faceId: 4, element: 'He' },
      { faceId: 15, element: 'He' },
      { faceId: 16, element: 'He' },
      { faceId: 24, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'C', 
        count: 1,
        hint: "Fusing Helium ('He') requires the Triple-Alpha Process. You must arrange three Helium tiles in a tight triangle (so each shares a border with the other two). When they form a triangle, they instantly fuse into Carbon ('C')."
      }
    ]
  },
  {
    id: 4,
    title: "Convective Capture",
    author: "",
    description: "Convection currents inside the red giant shell are pulling elements apart. Feed your carbon core by capturing helium to synthesize oxygen before the core cools.",
    starMass: 8.0,
    maxTurns: 6,
    initialTiles: [
      { faceId: 14, element: 'C' },
      { faceId: 2, element: 'He' },
      { faceId: 21, element: 'He' },
      { faceId: 29, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'O', 
        count: 1,
        hint: "Synthesize Oxygen ('O') by guiding a Helium ('He') tile to slide directly into your Carbon ('C') tile. Avoid sliding them away from each other or getting blocked by convective currents."
      }
    ]
  },
  {
    id: 5,
    title: "The Neon Shell",
    author: "",
    description: "As the red giant reaches extreme temperatures, the neon shell begins to burn. Leverage the icosahedral grid's curvature to guide helium through tight pathways into your oxygen core.",
    starMass: 12.0,
    maxTurns: 10,
    initialTiles: [
      { faceId: 30, element: 'O' },
      { faceId: 3, element: 'He' },
      { faceId: 8, element: 'He' },
      { faceId: 18, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Ne', 
        count: 1,
        hint: "Synthesize Neon ('Ne') by merging Helium ('He') directly into your Oxygen ('O') tile. Guide the Helium tiles carefully through the curved sphere corridors."
      }
    ]
  },
  {
    id: 6,
    title: "Magnesium Resonance",
    author: "",
    description: "Advanced alpha-capture requires exact resonance matching. You must coordinate multiple merges concurrently to synthesize a Magnesium core without jamming the sphere's tight layout.",
    starMass: 15.0,
    maxTurns: 12,
    initialTiles: [
      { faceId: 13, element: 'Ne' },
      { faceId: 0, element: 'He' },
      { faceId: 19, element: 'He' },
      { faceId: 27, element: 'He' },
      { faceId: 6, element: 'H' },
      { faceId: 7, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Mg', 
        count: 1,
        hint: "Fuse Helium ('He') into Neon ('Ne') to synthesize Magnesium ('Mg'). You have some Hydrogen ('H') tiles on the board; use them to clear paths or build extra Helium as needed."
      }
    ]
  },
  {
    id: 7,
    title: "Silicon Synthesis",
    author: "",
    description: "Your star is rapidly aging. To build the silicon core, you must fuse heavy elements. Silicon has a high mass and moves half as far as Helium. Settle on a flawless, unique solution to slide the final Helium home.",
    starMass: 18.0,
    maxTurns: 10,
    initialTiles: [
      { faceId: 17, element: 'Mg' },
      { faceId: 22, element: 'He' },
      { faceId: 28, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Si', 
        count: 1,
        hint: "Fusing Magnesium ('Mg') and Helium ('He') synthesizes Silicon ('Si'). Remember, heavy elements have shorter slide distances: Silicon is extremely heavy and will only move 1 step when swiped, making it highly stable but harder to maneuver."
      }
    ]
  },
  {
    id: 8,
    title: "The Silicon Trap",
    author: "",
    description: "Silicon is highly resistant to movement. To prepare for the final collapse, you must synthesize two independent Silicon tiles. Be careful not to let them block each other's paths.",
    starMass: 25.0,
    maxTurns: 15,
    initialTiles: [
      { faceId: 8, element: 'Mg' },
      { faceId: 23, element: 'Mg' },
      { faceId: 2, element: 'He' },
      { faceId: 11, element: 'He' },
      { faceId: 26, element: 'He' },
      { faceId: 31, element: 'H' }
    ],
    objectives: [
      { 
        type: 'has_element_count', 
        element: 'Si', 
        count: 2,
        hint: "Synthesize and possess two Silicon ('Si') tiles on the board at the same time. Since Silicon only slides 1 step, they can easily get stuck or block each other, so plan your straight-line avenues well in advance."
      }
    ]
  },
  {
    id: 9,
    title: "Iron Core Collapse",
    author: "",
    description: "Iron fusion consumes energy rather than releasing it, sealing the fate of the star. Achieve the ultimate end state: synthesize a single Iron tile in the core to trigger a core collapse supernova.",
    starMass: 29.5,
    maxTurns: 8,
    initialTiles: [
      { faceId: 9, element: 'Si' },
      { faceId: 25, element: 'Si' }
    ],
    objectives: [
      { 
        type: 'has_element', 
        element: 'Fe', 
        count: 1,
        hint: "Merge Helium ('He') into Silicon ('Si') to synthesize Iron ('Fe'). Iron is the heaviest stable core ash and is completely immovable (slide distance of 0). Merging it instantly wins this supernova collapse scenario!"
      }
    ]
  },
  {
    id: 10,
    title: "Cosmic Equilibrium",
    author: "The Grand Finale",
    description: "Maintain complete chemical balance in a highly convective star. You must unlock and possess all 8 stable elements on the board simultaneously before any core collapse occurs.",
    starMass: 20.0,
    maxTurns: 90,
    initialTiles: [
      { faceId: 3, element: 'C' },
      { faceId: 14, element: 'H' },
      { faceId: 15, element: 'H' },
      { faceId: 22, element: 'He' },
      { faceId: 28, element: 'He' }
    ],
    objectives: [
      { 
        type: 'has_all_elements',
        hint: "Have exactly one (or more) of each of the 8 stable elements on the board at the same time: H, He, C, O, Ne, Mg, Si, Fe. Carefully manage the space so that you don't merge everything away or jam the board!"
      }
    ]
  }
];
