/** Original OpenAI environment kit. Pixels are retained; cells are cropped only
 * at runtime. Upright sprites are already projected, unlike the ground tile. */
const atlas = {
  src: '/game/homeworld/v71/outskirts-kit.png', sourceWidth: 1536, sourceHeight: 1024,
  sha256: '9041169d7769db7cfb655a9166a87eab91332b508527a3cf16a7a8f7cfe306f4',
};
export const HOMEWORLD_OUTSKIRTS_ART_V71 = {
  basalt: { ...atlas, label: 'Affleurement de basalte', sourceRect: { x: 0, y: 0, width: 530, height: 512 },
    alphaBounds: { x: 20, y: 28, width: 494, height: 465 }, pivot: { x: 267, y: 487 },
    heightWorld: 250, footprintWorld: { width: 245, depth: 95 } },
  resinwood: { ...atlas, label: 'Arbre résineux du plateau', sourceRect: { x: 535, y: 0, width: 489, height: 512 },
    alphaBounds: { x: 12, y: 18, width: 468, height: 484 }, pivot: { x: 245, y: 494 },
    heightWorld: 238, footprintWorld: { width: 160, depth: 80 } },
  vent: { ...atlas, label: 'Évent géothermique', sourceRect: { x: 1024, y: 0, width: 512, height: 512 },
    alphaBounds: { x: 30, y: 130, width: 459, height: 359 }, pivot: { x: 260, y: 481 },
    heightWorld: 125, footprintWorld: { width: 150, depth: 65 } },
  retaining: { ...atlas, label: 'Muret de soutènement ancien', sourceRect: { x: 0, y: 512, width: 580, height: 512 },
    alphaBounds: { x: 15, y: 159, width: 559, height: 248 }, pivot: { x: 294, y: 401 },
    heightWorld: 94, footprintWorld: { width: 200, depth: 45 } },
  thicket: { ...atlas, label: 'Fourré de feuilles cuirassées', sourceRect: { x: 584, y: 512, width: 456, height: 512 },
    alphaBounds: { x: 9, y: 73, width: 430, height: 357 }, pivot: { x: 206, y: 423 },
    heightWorld: 112, footprintWorld: { width: 135, depth: 70 } },
  marker: { ...atlas, label: 'Borne ancienne érodée', sourceRect: { x: 1040, y: 512, width: 496, height: 512 },
    alphaBounds: { x: 49, y: 2, width: 401, height: 450 }, pivot: { x: 249, y: 445 },
    heightWorld: 205, footprintWorld: { width: 145, depth: 78 } },
} as const;
export type HomeworldOutskirtsArtIdV71 = keyof typeof HOMEWORLD_OUTSKIRTS_ART_V71;
export const HOMEWORLD_OUTSKIRTS_GROUND_V71 = {
  src: '/game/homeworld/v71/cinder-ground.png', sourceWidth: 1254, sourceHeight: 1254,
  sha256: 'a8e5811e20dc9ff00c472d2cfeca9a50d81931db56210be0b4129387f531e4a3',
  tileWorldSize: 240, projection: 'top-down-project-ground-once',
  seamlessStatus: 'requested-native-repeat-requires-visual-check', lore: 'original-adaptation',
} as const;
