import type { BiomeId, MissionId } from "./types";

/**
 * Narrative screen plan layered over the 8,400 px simulation space.
 *
 * The Canvas runtime remains responsible for collisions, but every traversal
 * feature declared here is materialised by worldBlueprints into playable
 * geometry (platform, climbable, surface, cover or hazard). Keeping the room
 * plan serialisable also lets it drive maps, transitions and future streaming.
 */

export const WORLD_SCREEN_WORLD_WIDTH = 8_400 as const;
const SOURCE_WORLD_WIDTH = 5_600;

export type WorldScreenBand = "surface" | "mid-depth" | "understory";
export type WorldScreenTransitionMode =
  | "walk"
  | "climb"
  | "jump"
  | "wade"
  | "hazard-gate";

export type WorldScreenFeatureKind =
  | "platform"
  | "tree"
  | "vine"
  | "rock-face"
  | "water"
  | "mud"
  | "sand"
  | "coral"
  | "mycelium"
  | "obsidian"
  | "ruin"
  | "ladder"
  | "ice-wall"
  | "rope"
  | "snowdrift"
  | "thin-ice"
  | "metal-gantry"
  | "basalt-column"
  | "chain"
  | "lava"
  | "steam-vent"
  | "tidal-surge"
  | "sand-collapse"
  | "glass-storm"
  | "heat-burst"
  | "rogue-wave"
  | "electrical-surge"
  | "abyssal-vent"
  | "spore-cloud"
  | "mycelial-snare"
  | "acid-bloom"
  | "gravity-pulse"
  | "nanite-field"
  | "laser-grid";

export type WorldScreenGameplayRole =
  | "platform"
  | "climb"
  | "water"
  | "hazard"
  | "cover"
  | "tracking";

export interface WorldScreenLayerPlan {
  /** Absolute public path, or null when the layer is drawn procedurally. */
  assetPath: string | null;
  band: WorldScreenBand;
  parallax: number;
  motifs: readonly string[];
}

export interface WorldScreenFeature {
  id: string;
  kind: WorldScreenFeatureKind;
  role: WorldScreenGameplayRole;
  /** World-space anchor, not a coordinate local to the room. */
  x: number;
  description: string;
}

export interface WorldScreenSector {
  id: string;
  order: number;
  startX: number;
  endX: number;
  label: string;
  mood: string;
  ambientCue: string;
  objectiveId: string | null;
  objectiveCue: string;
  layers: {
    background: WorldScreenLayerPlan;
    foreground: WorldScreenLayerPlan;
  };
  features: readonly WorldScreenFeature[];
}

export interface WorldScreenConnection {
  id: string;
  fromScreenId: string;
  toScreenId: string;
  /** Shared world-space boundary between both rooms. */
  transitionX: number;
  mode: WorldScreenTransitionMode;
  cue: string;
}

export interface MissionWorldScreens {
  missionId: MissionId;
  biome: BiomeId;
  worldWidth: number;
  screens: readonly WorldScreenSector[];
  connections: readonly WorldScreenConnection[];
}

export const BIOME_BACKGROUND_PATHS: Readonly<Record<BiomeId, string>> = {
  jungle: "/game/backgrounds/jungle-multiscreen-v6.png",
  ice: "/game/backgrounds/ice-depth-v4.webp",
  volcano: "/game/backgrounds/volcanic-depth-v4.webp",
  swamp: "/game/backgrounds/swamp-depth-v8.png",
  desert: "/game/backgrounds/desert-depth-v8.png",
  ocean: "/game/backgrounds/ocean-depth-v8.png",
  fungal: "/game/backgrounds/fungal-depth-v8.png",
  ruins: "/game/backgrounds/ruins-depth-v8.png",
};

const FOREGROUNDS: Readonly<Record<BiomeId, string | null>> = {
  jungle: "/game/props/v4/foreground-ferns.png",
  ice: null,
  volcano: null,
  swamp: "/game/props/v4/foreground-ferns.png",
  desert: null,
  ocean: null,
  fungal: "/game/props/v4/foreground-ferns.png",
  ruins: null,
};

export function backgroundPathForBiome(biome: BiomeId): string {
  return BIOME_BACKGROUND_PATHS[biome];
}

function layers(
  biome: BiomeId,
  band: WorldScreenBand,
  backgroundMotifs: readonly string[],
  foregroundMotifs: readonly string[],
): WorldScreenSector["layers"] {
  return {
    background: {
      assetPath: BIOME_BACKGROUND_PATHS[biome],
      band,
      parallax: band === "surface" ? 0.18 : band === "mid-depth" ? 0.3 : 0.42,
      motifs: backgroundMotifs,
    },
    foreground: {
      assetPath: FOREGROUNDS[biome],
      band,
      parallax: 1.12,
      motifs: foregroundMotifs,
    },
  };
}

function feature(
  id: string,
  kind: WorldScreenFeatureKind,
  role: WorldScreenGameplayRole,
  x: number,
  description: string,
): WorldScreenFeature {
  return { id, kind, role, x, description };
}

function connectSequentially(
  screens: readonly WorldScreenSector[],
  modes: readonly WorldScreenTransitionMode[],
): readonly WorldScreenConnection[] {
  return screens.slice(0, -1).map((screen, index) => ({
    id: `${screen.id}--${screens[index + 1].id}`,
    fromScreenId: screen.id,
    toScreenId: screens[index + 1].id,
    transitionX: screen.endX,
    mode: modes[index] ?? "walk",
    cue: `Passage de ${screen.label} vers ${screens[index + 1].label}`,
  }));
}

const JUNGLE_SCREENS: readonly WorldScreenSector[] = [
  {
    id: "jungle-lisiere",
    order: 0,
    startX: 0,
    endX: 900,
    label: "Lisière des eaux noires",
    mood: "Pluie chaude, appels lointains et reflets trompeurs sur le lac.",
    ambientCue: "pluie-fine-eau-insectes",
    objectiveId: "scan-vanguard",
    objectiveCue: "Lire les premières empreintes avant de quitter la berge.",
    layers: layers(
      "jungle",
      "surface",
      ["lac brumeux", "canopée profonde", "éclairs silencieux"],
      ["fougères ruisselantes", "roseaux", "racines noyées"],
    ),
    features: [
      feature("j-lisiere-root", "platform", "platform", 430, "Racine basse pour apprendre le saut."),
      feature("j-lisiere-tree", "tree", "climb", 760, "Tronc menant au premier itinéraire de canopée."),
      feature("j-lisiere-mud", "mud", "tracking", 210, "Boue conservant les traces humaines."),
    ],
  },
  {
    id: "jungle-canopy",
    order: 1,
    startX: 900,
    endX: 1_820,
    label: "Canopée des guetteurs",
    mood: "Hauteur étouffante où les silhouettes se découpent entre les feuilles.",
    ambientCue: "feuillage-haut-branches-patrouille",
    objectiveId: "scan-vanguard",
    objectiveCue: "Scanner la patrouille depuis plusieurs altitudes sans être marqué.",
    layers: layers(
      "jungle",
      "mid-depth",
      ["arbres géants", "pont naturel", "camp voilé"],
      ["lianes pendantes", "feuilles proches", "branches cassées"],
    ),
    features: [
      feature("j-canopy-stone", "platform", "platform", 1_270, "Dalle humide sous la route haute."),
      feature("j-canopy-vine", "vine", "climb", 1_565, "Liane reliant le sol et la couronne."),
      feature("j-canopy-tree", "tree", "cover", 1_030, "Tronc large brisant les lignes de vue."),
    ],
  },
  {
    id: "jungle-ruins",
    order: 2,
    startX: 1_820,
    endX: 2_800,
    label: "Ruines du transpondeur",
    mood: "Pierres cyclopéennes, signaux rouges et pluie absorbée par la mousse.",
    ambientCue: "ruines-signal-yautja-gouttes",
    objectiveId: "recover-transponder",
    objectiveCue: "Isoler le signal volé et ouvrir une route discrète vers l'appareil.",
    layers: layers(
      "jungle",
      "understory",
      ["temple englouti", "balises rouges", "brume verte"],
      ["statues fendues", "racines épaisses", "mousse brillante"],
    ),
    features: [
      feature("j-ruins-slab", "ruin", "platform", 2_110, "Terrasse brisée servant de poste d'observation."),
      feature("j-ruins-ladder", "ladder", "climb", 2_480, "Échelle d'expédition fixée au sanctuaire."),
      feature("j-ruins-tree", "tree", "climb", 2_590, "Arbre traversant le toit en ruine."),
    ],
  },
  {
    id: "jungle-flooded-cut",
    order: 3,
    startX: 2_800,
    endX: 3_780,
    label: "Lac des traques croisées",
    mood: "L'eau coupe les pistes tandis que la cible utilise la rive comme piège.",
    ambientCue: "eau-profonde-grenouilles-tonnerre",
    objectiveId: "recover-transponder",
    objectiveCue: "Choisir entre la traversée lente du lac et les plateformes exposées.",
    layers: layers(
      "jungle",
      "surface",
      ["cascade éloignée", "lac noir", "arbres noyés"],
      ["eau au premier plan", "roseaux remués", "troncs flottants"],
    ),
    features: [
      feature("j-lake-water", "water", "water", 3_280, "Bassin ralentissant le chasseur et effaçant les traces."),
      feature("j-lake-root", "platform", "platform", 3_030, "Racine au-dessus de la ligne d'eau."),
      feature("j-lake-vine", "vine", "climb", 3_650, "Sortie verticale vers la rive orientale."),
    ],
  },
  {
    id: "jungle-camp",
    order: 4,
    startX: 3_780,
    endX: 4_660,
    label: "Camp avancé de Vey",
    mood: "Projecteurs, bâches battues par la pluie et défenses préparées contre le camouflage.",
    ambientCue: "generateur-radio-pluie-lourde",
    objectiveId: "defeat-vey",
    objectiveCue: "Saboter les révélateurs et transformer le camp en terrain de duel.",
    layers: layers(
      "jungle",
      "mid-depth",
      ["tentes militaires", "tour de guet", "faisceaux lumineux"],
      ["caisses", "filets", "fougères écrasées"],
    ),
    features: [
      feature("j-camp-deck", "platform", "platform", 4_020, "Passerelle d'expédition dominant le camp."),
      feature("j-camp-ladder", "ladder", "climb", 4_300, "Échelle de la tour de guet."),
      feature("j-camp-tree", "tree", "cover", 4_520, "Tronc d'arène utilisable comme couverture."),
    ],
  },
  {
    id: "jungle-arena",
    order: 5,
    startX: 4_660,
    endX: SOURCE_WORLD_WIDTH,
    label: "Clairière de l'orage",
    mood: "Une arène ouverte où la pluie, la boue et les fusées révèlent chaque erreur.",
    ambientCue: "orage-fusees-extraction",
    objectiveId: "extract-jungle-trophy",
    objectiveCue: "Vaincre Vey, accomplir le rite puis tenir la balise d'extraction.",
    layers: layers(
      "jungle",
      "surface",
      ["clairière battue", "vaisseau masqué", "front de tempête"],
      ["boue éclaboussée", "herbes couchées", "brume de faisceau"],
    ),
    features: [
      feature("j-arena-crown", "platform", "platform", 4_980, "Couronne haute pour le duel vertical."),
      feature("j-arena-tree", "tree", "climb", 4_780, "Dernier accès à la canopée."),
      feature("j-arena-mud", "mud", "tracking", 5_260, "Sol détrempé lisible avant l'arrivée du vaisseau."),
    ],
  },
];

const ICE_SCREENS: readonly WorldScreenSector[] = [
  {
    id: "ice-landing",
    order: 0,
    startX: 0,
    endX: 900,
    label: "Plateau du blizzard",
    mood: "Vent horizontal et neige vierge où chaque pas devient une information.",
    ambientCue: "blizzard-glace-lointaine",
    objectiveId: "scan-ice-traces",
    objectiveCue: "Calibrer le biomask sur les premières empreintes bioélectriques.",
    layers: layers("ice", "surface", ["banquise", "aurore froide", "montagnes"], ["neige soufflée", "cristaux", "cordages gelés"]),
    features: [
      feature("i-landing-shelf", "platform", "platform", 390, "Corniche d'initiation balayée par le vent."),
      feature("i-landing-wall", "ice-wall", "climb", 760, "Mur givré vers la route supérieure."),
      feature("i-landing-snow", "snowdrift", "tracking", 210, "Congère enregistrant les trajectoires de la meute."),
    ],
  },
  {
    id: "ice-rift",
    order: 1,
    startX: 900,
    endX: 1_820,
    label: "Faille aux échos",
    mood: "La glace répond aux mouvements par des craquements difficiles à localiser.",
    ambientCue: "craquements-echo-sous-glace",
    objectiveId: "scan-ice-traces",
    objectiveCue: "Distinguer les fausses pistes des vibrations de l'Alpha.",
    layers: layers("ice", "mid-depth", ["faille bleue", "stalactites", "brume froide"], ["éclats de glace", "neige en corniche", "câbles rompus"]),
    features: [
      feature("i-rift-thin", "thin-ice", "hazard", 1_120, "Pont fragile signalant les déplacements lourds."),
      feature("i-rift-platform", "platform", "platform", 1_400, "Éperon rocheux au-dessus de la fissure."),
      feature("i-rift-ladder", "ladder", "climb", 1_720, "Échelle de mine menant aux galeries."),
    ],
  },
  {
    id: "ice-mine",
    order: 2,
    startX: 1_820,
    endX: 2_800,
    label: "Mine abandonnée",
    mood: "Métal contracté, lampes mortes et chaleur résiduelle des foreuses.",
    ambientCue: "metal-tendu-foreuse-inerte",
    objectiveId: "hunt-cryorunners",
    objectiveCue: "Séparer les Cryorunners entre le sol et les passerelles.",
    layers: layers("ice", "understory", ["tunnel minier", "foreuses", "lampes d'urgence"], ["rails", "caisses givrées", "vapeur froide"]),
    features: [
      feature("i-mine-gantry", "metal-gantry", "platform", 2_120, "Passerelle sonore mais rapide."),
      feature("i-mine-rope", "rope", "climb", 2_590, "Corde de maintenance entre deux niveaux."),
      feature("i-mine-cover", "snowdrift", "cover", 2_340, "Accumulation sous une foreuse renversée."),
    ],
  },
  {
    id: "ice-whiteout",
    order: 3,
    startX: 2_800,
    endX: 3_780,
    label: "Couloir blanc",
    mood: "La visibilité disparaît; seules les traces et les pulsations du masque orientent la chasse.",
    ambientCue: "whiteout-souffle-capteurs",
    objectiveId: "hunt-cryorunners",
    objectiveCue: "Traverser la tempête en suivant la meute plutôt que la ligne d'horizon.",
    layers: layers("ice", "surface", ["rideau de neige", "crêtes effacées", "lueurs sous-glace"], ["poudre dense", "stalagmites", "plaques mobiles"]),
    features: [
      feature("i-whiteout-bridge", "thin-ice", "hazard", 3_020, "Plaque qui cède après un passage lourd."),
      feature("i-whiteout-wall", "ice-wall", "climb", 3_360, "Paroi protégée du vent."),
      feature("i-whiteout-shelf", "platform", "platform", 3_570, "Corniche dominant la sortie de tunnel."),
    ],
  },
  {
    id: "ice-nest",
    order: 4,
    startX: 3_780,
    endX: 4_660,
    label: "Nid sous-glaciaire",
    mood: "Galeries organiques où les parois vibrent avec la meute restante.",
    ambientCue: "respiration-meute-chute-glace",
    objectiveId: "defeat-cryostalker",
    objectiveCue: "Utiliser les piliers fissurés pour dépouiller l'Alpha de sa carapace.",
    layers: layers("ice", "understory", ["caverne profonde", "œufs minéraux", "piliers translucides"], ["griffures", "os gelés", "stalactites basses"]),
    features: [
      feature("i-nest-pillar", "ice-wall", "cover", 4_260, "Pilier destructible qui interrompt une charge."),
      feature("i-nest-platform", "platform", "platform", 4_050, "Plateau de duel à mi-hauteur."),
      feature("i-nest-ladder", "ladder", "climb", 4_520, "Ancien accès de forage vers la voûte."),
    ],
  },
  {
    id: "ice-collapse",
    order: 5,
    startX: 4_660,
    endX: SOURCE_WORLD_WIDTH,
    label: "Caverne en rupture",
    mood: "Le plafond tombe par vagues tandis que la balise perce la neige.",
    ambientCue: "effondrement-balise-reacteurs",
    objectiveId: "extract-ice-trophy",
    objectiveCue: "Achever le rite et gagner l'extraction avant la rupture finale.",
    layers: layers("ice", "mid-depth", ["voûte fendue", "balise cyan", "silhouette du vaisseau"], ["blocs tombés", "neige pulvérisée", "cristaux brisés"]),
    features: [
      feature("i-collapse-platform", "platform", "platform", 5_050, "Dernière corniche stable."),
      feature("i-collapse-rope", "rope", "climb", 4_930, "Câble de secours de la colonie."),
      feature("i-collapse-snow", "snowdrift", "tracking", 5_340, "Zone de réception de la balise."),
    ],
  },
];

const VOLCANO_SCREENS: readonly WorldScreenSector[] = [
  {
    id: "volcano-ash-plain",
    order: 0,
    startX: 0,
    endX: 900,
    label: "Plaine des cendres",
    mood: "Cendres silencieuses, chaleur sèche et marques de clan à demi ensevelies.",
    ambientCue: "vent-cendre-grondement",
    objectiveId: "scan-fallen-hunters",
    objectiveCue: "Identifier la première marque sans troubler le lieu de mort.",
    layers: layers("volcano", "surface", ["caldeira", "pluie de cendre", "lunes rouges"], ["dunes noires", "ossements", "braises"]),
    features: [
      feature("v-plain-platform", "platform", "platform", 400, "Dalle de basalte sur la piste principale."),
      feature("v-plain-column", "basalt-column", "climb", 750, "Colonne refroidie vers l'aqueduc."),
      feature("v-plain-ash", "mud", "tracking", 220, "Cendre fine gardant les pas du Paria."),
    ],
  },
  {
    id: "volcano-lava-cut",
    order: 1,
    startX: 900,
    endX: 1_820,
    label: "Entaille de lave",
    mood: "La route basse brûle; les ruines offrent un passage plus lent mais honorable.",
    ambientCue: "lave-bulles-pierre",
    objectiveId: "scan-fallen-hunters",
    objectiveCue: "Franchir l'entaille et retrouver la seconde marque sur la hauteur.",
    layers: layers("volcano", "mid-depth", ["rivière de lave", "pont ruiné", "fumées rouges"], ["scories", "chaînes anciennes", "statues brûlées"]),
    features: [
      feature("v-cut-lava", "lava", "hazard", 1_100, "Coulée infranchissable sans la route haute."),
      feature("v-cut-ruin", "ruin", "platform", 1_460, "Fragment d'aqueduc au-dessus de la lave."),
      feature("v-cut-ladder", "ladder", "climb", 1_710, "Échelle rituelle vers le sanctuaire."),
    ],
  },
  {
    id: "volcano-sanctum",
    order: 2,
    startX: 1_820,
    endX: 2_800,
    label: "Sanctuaire profané",
    mood: "Trophées volés, balises étrangères et glyphes rayés par défi.",
    ambientCue: "glyphes-balises-metal",
    objectiveId: "recover-stolen-beacons",
    objectiveCue: "Désactiver les balises sans endommager les reliques du clan.",
    layers: layers("volcano", "understory", ["temple yautja", "glyphes ambre", "statues brisées"], ["trophées profanés", "câbles", "poussière chaude"]),
    features: [
      feature("v-sanctum-platform", "ruin", "platform", 2_110, "Autel surélevé contenant une balise."),
      feature("v-sanctum-chain", "chain", "climb", 2_540, "Chaîne suspendue vers la galerie haute."),
      feature("v-sanctum-cover", "basalt-column", "cover", 2_350, "Idole protégeant des tirs croisés."),
    ],
  },
  {
    id: "volcano-vents",
    order: 3,
    startX: 2_800,
    endX: 3_780,
    label: "Galerie des évents",
    mood: "Jets de vapeur cycliques et rafales de cendres révèlent le camouflage.",
    ambientCue: "vapeur-cycle-alarme",
    objectiveId: "recover-stolen-beacons",
    objectiveCue: "Lire le rythme des évents pour atteindre la dernière balise.",
    layers: layers("volcano", "mid-depth", ["cheminées volcaniques", "aqueduc", "tempête de cendre"], ["vapeur", "chaînes oscillantes", "roche vitreuse"]),
    features: [
      feature("v-vents-steam", "steam-vent", "hazard", 3_000, "Évent chronométré révélant le camouflage."),
      feature("v-vents-aqueduct", "platform", "platform", 3_450, "Aqueduc offrant une route haute."),
      feature("v-vents-column", "basalt-column", "climb", 3_100, "Colonne entre le flanc et l'aqueduc."),
    ],
  },
  {
    id: "volcano-gate",
    order: 4,
    startX: 3_780,
    endX: 4_660,
    label: "Porte du jugement",
    mood: "La tempête s'arrête devant une porte gravée des noms des chasseurs tombés.",
    ambientCue: "porte-pierre-chant-grave",
    objectiveId: "defeat-bad-blood",
    objectiveCue: "Restituer les marques puis ouvrir l'arène au Paria.",
    layers: layers("volcano", "understory", ["porte monumentale", "braseros", "silhouettes sculptées"], ["piliers", "cendres suspendues", "armes brisées"]),
    features: [
      feature("v-gate-platform", "ruin", "platform", 4_080, "Corniche de la porte du sanctuaire."),
      feature("v-gate-ladder", "ladder", "climb", 4_320, "Accès de service au mécanisme ancien."),
      feature("v-gate-cover", "basalt-column", "cover", 4_530, "Pilier marquant l'entrée de l'arène."),
    ],
  },
  {
    id: "volcano-judgement",
    order: 5,
    startX: 4_660,
    endX: SOURCE_WORLD_WIDTH,
    label: "Arène du jugement",
    mood: "Lave, cendres et architecture sacrée enferment le duel final.",
    ambientCue: "duel-lave-extraction",
    objectiveId: "escape-self-destruct",
    objectiveCue: "Juger le Bad Blood, accomplir le rite et rappeler le vaisseau.",
    layers: layers("volcano", "surface", ["arène rituelle", "lave en contrebas", "vaisseau masqué"], ["braises", "chaînes", "faisceau d'extraction"]),
    features: [
      feature("v-arena-platform", "platform", "platform", 5_060, "Plateforme haute pour le duel aux lames."),
      feature("v-arena-chain", "chain", "climb", 4_930, "Chaîne permettant un changement d'altitude risqué."),
      feature("v-arena-lava", "lava", "hazard", 5_090, "Bord de lave sous la plateforme haute, en amont de la balise d'extraction."),
    ],
  },
];

type ExpansionScreenProfile = {
  prefix: string;
  labels: readonly [string, string, string, string, string, string];
  horizon: string;
  landmark: string;
  foreground: string;
  climbKind: WorldScreenFeatureKind;
  coverKind: WorldScreenFeatureKind;
  trackingKind: WorldScreenFeatureKind;
  hazardKind: WorldScreenFeatureKind;
  terminalKind: WorldScreenFeatureKind;
  transitionModes: readonly [
    WorldScreenTransitionMode,
    WorldScreenTransitionMode,
    WorldScreenTransitionMode,
    WorldScreenTransitionMode,
    WorldScreenTransitionMode,
  ];
};

const EXPANSION_SCREEN_BOUNDS = [0, 900, 1_800, 2_750, 3_700, 4_650, SOURCE_WORLD_WIDTH] as const;

/**
 * Produce six real streaming sectors for expansion planets. Coordinates and
 * objective anchors remain authored in the 5,600 source grid, then are scaled
 * by missionScreens exactly like the three original hunts.
 */
function expansionScreenPlan(
  missionId: MissionId,
  biome: BiomeId,
  profile: ExpansionScreenProfile,
): readonly WorldScreenSector[] {
  const bands: readonly WorldScreenBand[] = [
    "surface",
    "mid-depth",
    "understory",
    "mid-depth",
    "understory",
    "surface",
  ];
  const objectiveIds = [
    `${missionId}-scan`,
    `${missionId}-scan`,
    `${missionId}-hunt`,
    `${missionId}-recover`,
    `${missionId}-boss`,
    `${missionId}-extract`,
  ] as const;
  const objectiveCues = [
    "Observer les premières traces endémiques avant de pénétrer dans le territoire.",
    "Comparer les signatures depuis la route haute sans alerter la chaîne alimentaire.",
    "Isoler les chasseurs territoriaux et ouvrir une route vers le cœur du biome.",
    "Sécuriser les prélèvements sans abandonner de technologie du clan.",
    "Préparer l'arène, ses hauteurs et ses pièges avant d'appeler la proie dominante.",
    "Réclamer le trophée puis rejoindre la balise sous le vaisseau d'extraction.",
  ] as const;

  return profile.labels.map((label, index) => {
    const startX = EXPANSION_SCREEN_BOUNDS[index];
    const endX = EXPANSION_SCREEN_BOUNDS[index + 1];
    const span = endX - startX;
    const platformX = startX + span * 0.38;
    const traversalX = startX + span * 0.68;
    const thirdRole: WorldScreenGameplayRole =
      index === 0
        ? "tracking"
        : index === 1 || index === 4
          ? "cover"
          : index === 2
            ? "hazard"
            : index === 3
              ? "tracking"
              : profile.terminalKind === "water"
                ? "water"
                : "tracking";
    const thirdKind =
      thirdRole === "cover"
        ? profile.coverKind
        : thirdRole === "hazard"
          ? profile.hazardKind
          : index === 5
            ? profile.terminalKind
            : thirdRole === "water"
              ? "water"
            : profile.trackingKind;
    return {
      id: `${profile.prefix}-${index + 1}`,
      order: index,
      startX,
      endX,
      label,
      mood: `${profile.horizon}, ${profile.landmark} et signes d'une écologie qui réagit au passage du chasseur.`,
      ambientCue: `${profile.prefix}-${index + 1}-endemic-ambience`,
      objectiveId: objectiveIds[index],
      objectiveCue: objectiveCues[index],
      layers: layers(
        biome,
        bands[index],
        [profile.horizon, profile.landmark, `${label} dans la profondeur`],
        [profile.foreground, "particules proches", "traces de faune endémique"],
      ),
      features: [
        feature(
          `${profile.prefix}-${index + 1}-platform`,
          "platform",
          "platform",
          platformX,
          `Appui principal traversant ${label}.`,
        ),
        feature(
          `${profile.prefix}-${index + 1}-climb`,
          profile.climbKind,
          "climb",
          traversalX,
          `Route verticale propre au biome de ${label}.`,
        ),
        feature(
          `${profile.prefix}-${index + 1}-ecology`,
          thirdKind,
          thirdRole,
          startX + span * 0.18,
          `Interaction écologique locale de ${label}.`,
        ),
      ],
    } satisfies WorldScreenSector;
  });
}

const SWAMP_SCREENS = expansionScreenPlan("swamp-hydra", "swamp", {
  prefix: "swamp",
  labels: [
    "Vasière des œufs",
    "Mangrove suspendue",
    "Chenaux des chasseurs",
    "Nourricerie noyée",
    "Fosse aux trois remous",
    "Balise de la marée noire",
  ],
  horizon: "pluie lourde sur des eaux opaques",
  landmark: "racines-cathédrales et mangroves géantes",
  foreground: "roseaux luisants et nappes de vase",
  climbKind: "tree",
  coverKind: "tree",
  trackingKind: "mud",
  hazardKind: "tidal-surge",
  terminalKind: "water",
  transitionModes: ["wade", "climb", "wade", "hazard-gate", "walk"],
});

const DESERT_SCREENS = expansionScreenPlan("desert-sandmaw", "desert", {
  prefix: "desert",
  labels: [
    "Balises sous le sable",
    "Arches du vent rouge",
    "Mer de silice chantante",
    "Mine vitrifiée",
    "Canyon des mandibules",
    "Plateau de l'extraction",
  ],
  horizon: "dunes de silice sous deux soleils voilés",
  landmark: "canyons noirs et arches érodées",
  foreground: "cristaux brisés et traînées de sable",
  climbKind: "rock-face",
  coverKind: "ruin",
  trackingKind: "sand",
  hazardKind: "sand-collapse",
  terminalKind: "sand",
  transitionModes: ["climb", "hazard-gate", "jump", "climb", "walk"],
});

const OCEAN_SCREENS = expansionScreenPlan("ocean-leviathan", "ocean", {
  prefix: "ocean",
  labels: [
    "Récif des harpons",
    "Arches au-dessus du vide",
    "Station battue par les vagues",
    "Cheminées abyssales",
    "Fosse bioluminescente",
    "Aire d'amerrissage",
  ],
  horizon: "tempête océanique et éclairs bleu-vert",
  landmark: "arches coralliennes dressées au-dessus de l'abîme",
  foreground: "embruns, algues suspendues et corail proche",
  climbKind: "rope",
  coverKind: "coral",
  trackingKind: "water",
  hazardKind: "rogue-wave",
  terminalKind: "water",
  transitionModes: ["wade", "climb", "hazard-gate", "jump", "wade"],
});

const FUNGAL_SCREENS = expansionScreenPlan("fungal-hivemind", "fungal", {
  prefix: "fungal",
  labels: [
    "Lisière des spores-mémoires",
    "Tours mycéliennes",
    "Territoire des relais",
    "Archives sous les racines",
    "Cavité du Cœur-Mère",
    "Clairière de stérilisation",
  ],
  horizon: "forêt violette parcourue d'impulsions bioluminescentes",
  landmark: "champignons-tours reliés par un réseau vivant",
  foreground: "filaments, capsules de spores et membranes humides",
  climbKind: "vine",
  coverKind: "tree",
  trackingKind: "mycelium",
  hazardKind: "spore-cloud",
  terminalKind: "mycelium",
  transitionModes: ["climb", "hazard-gate", "walk", "climb", "hazard-gate"],
});

const RUINS_SCREENS = expansionScreenPlan("ruins-ancient-guardian", "ruins", {
  prefix: "ruins",
  labels: [
    "Seuil de la cité noire",
    "Pont des sentinelles",
    "Galerie mimétique",
    "Chambre des prismes",
    "Noyau gravitationnel",
    "Terrasse du vaisseau",
  ],
  horizon: "ciel sans atmosphère et géante gazeuse à l'horizon",
  landmark: "cité d'obsidienne aux mécanismes encore actifs",
  foreground: "stèles fracturées et poussière en suspension",
  climbKind: "ladder",
  coverKind: "ruin",
  trackingKind: "obsidian",
  hazardKind: "gravity-pulse",
  terminalKind: "obsidian",
  transitionModes: ["climb", "hazard-gate", "jump", "climb", "hazard-gate"],
});

function missionScreens(
  missionId: MissionId,
  biome: BiomeId,
  screens: readonly WorldScreenSector[],
  modes: readonly WorldScreenTransitionMode[],
): MissionWorldScreens {
  const scale = WORLD_SCREEN_WORLD_WIDTH / SOURCE_WORLD_WIDTH;
  const expandedScreens = screens.map((screen) => ({
    ...screen,
    startX: screen.startX * scale,
    endX: screen.endX * scale,
    features: screen.features.map((item) => ({
      ...item,
      x: item.x * scale,
    })),
  }));
  return {
    missionId,
    biome,
    worldWidth: WORLD_SCREEN_WORLD_WIDTH,
    screens: expandedScreens,
    connections: connectSequentially(expandedScreens, modes),
  };
}

export const WORLD_SCREENS_BY_MISSION: Readonly<
  Record<MissionId, MissionWorldScreens>
> = {
  "jungle-vey": missionScreens("jungle-vey", "jungle", JUNGLE_SCREENS, [
    "climb",
    "jump",
    "wade",
    "climb",
    "walk",
  ]),
  "ice-cryostalker": missionScreens(
    "ice-cryostalker",
    "ice",
    ICE_SCREENS,
    ["climb", "hazard-gate", "walk", "climb", "hazard-gate"],
  ),
  "volcano-bad-blood": missionScreens(
    "volcano-bad-blood",
    "volcano",
    VOLCANO_SCREENS,
    ["hazard-gate", "climb", "climb", "hazard-gate", "walk"],
  ),
  "swamp-hydra": missionScreens(
    "swamp-hydra",
    "swamp",
    SWAMP_SCREENS,
    ["wade", "climb", "wade", "hazard-gate", "walk"],
  ),
  "desert-sandmaw": missionScreens(
    "desert-sandmaw",
    "desert",
    DESERT_SCREENS,
    ["climb", "hazard-gate", "jump", "climb", "walk"],
  ),
  "ocean-leviathan": missionScreens(
    "ocean-leviathan",
    "ocean",
    OCEAN_SCREENS,
    ["wade", "climb", "hazard-gate", "jump", "wade"],
  ),
  "fungal-hivemind": missionScreens(
    "fungal-hivemind",
    "fungal",
    FUNGAL_SCREENS,
    ["climb", "hazard-gate", "walk", "climb", "hazard-gate"],
  ),
  "ruins-ancient-guardian": missionScreens(
    "ruins-ancient-guardian",
    "ruins",
    RUINS_SCREENS,
    ["climb", "hazard-gate", "jump", "climb", "hazard-gate"],
  ),
};

export function worldScreensFor(missionId: MissionId): MissionWorldScreens {
  return WORLD_SCREENS_BY_MISSION[missionId];
}

/**
 * Resolve a world coordinate to a room. Coordinates beyond the simulation are
 * clamped to the first/last room, which makes camera overscan deterministic.
 * Exact internal boundaries belong to the room on their right.
 */
export function getWorldScreenAtX(
  missionOrLayout: MissionId | MissionWorldScreens,
  worldX: number,
): WorldScreenSector {
  const layout =
    typeof missionOrLayout === "string"
      ? worldScreensFor(missionOrLayout)
      : missionOrLayout;
  const safeX = Number.isFinite(worldX) ? worldX : 0;
  const clampedX = Math.max(0, Math.min(layout.worldWidth, safeX));

  return (
    layout.screens.find(
      (screen, index) =>
        clampedX >= screen.startX &&
        (clampedX < screen.endX || index === layout.screens.length - 1),
    ) ?? layout.screens[layout.screens.length - 1]
  );
}

/** Validate room coverage and the undirected connection graph without I/O. */
export function validateWorldScreens(
  layout: MissionWorldScreens,
  expectedWorldWidth = WORLD_SCREEN_WORLD_WIDTH,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (layout.worldWidth !== expectedWorldWidth) {
    errors.push(
      `${layout.missionId}: world width ${layout.worldWidth} != ${expectedWorldWidth}`,
    );
  }
  if (layout.screens.length < 5) {
    errors.push(`${layout.missionId}: fewer than five screens`);
  }
  if (layout.screens[0]?.startX !== 0) {
    errors.push(`${layout.missionId}: coverage must start at x=0`);
  }
  if (layout.screens[layout.screens.length - 1]?.endX !== layout.worldWidth) {
    errors.push(`${layout.missionId}: coverage must end at worldWidth`);
  }

  layout.screens.forEach((screen, index) => {
    if (ids.has(screen.id)) errors.push(`${layout.missionId}: duplicate ${screen.id}`);
    ids.add(screen.id);
    if (screen.order !== index) {
      errors.push(`${screen.id}: order ${screen.order} != ${index}`);
    }
    if (screen.startX >= screen.endX) {
      errors.push(`${screen.id}: empty or inverted bounds`);
    }
    if (index > 0 && layout.screens[index - 1].endX !== screen.startX) {
      errors.push(`${screen.id}: gap or overlap before x=${screen.startX}`);
    }
    if (!screen.label || !screen.mood || !screen.objectiveCue) {
      errors.push(`${screen.id}: missing narrative metadata`);
    }
    if (!screen.layers.background.assetPath?.startsWith("/game/")) {
      errors.push(`${screen.id}: invalid background asset path`);
    }
    if (
      screen.layers.background.motifs.length === 0 ||
      screen.layers.foreground.motifs.length === 0
    ) {
      errors.push(`${screen.id}: foreground/background motifs required`);
    }
    if (screen.features.length === 0) {
      errors.push(`${screen.id}: traversal feature required`);
    }
    for (const item of screen.features) {
      if (item.x < screen.startX || item.x >= screen.endX) {
        errors.push(`${screen.id}: feature ${item.id} is outside its bounds`);
      }
    }
  });

  const adjacency = new Map<string, Set<string>>(
    layout.screens.map((screen) => [screen.id, new Set<string>()]),
  );
  const connectionIds = new Set<string>();
  for (const connection of layout.connections) {
    if (connectionIds.has(connection.id)) {
      errors.push(`${layout.missionId}: duplicate connection ${connection.id}`);
    }
    connectionIds.add(connection.id);
    const fromIndex = layout.screens.findIndex(
      (screen) => screen.id === connection.fromScreenId,
    );
    const toIndex = layout.screens.findIndex(
      (screen) => screen.id === connection.toScreenId,
    );
    if (fromIndex < 0 || toIndex < 0) {
      errors.push(`${connection.id}: dangling screen reference`);
      continue;
    }
    if (Math.abs(fromIndex - toIndex) !== 1) {
      errors.push(`${connection.id}: connection must join adjacent screens`);
    }
    const left = layout.screens[Math.min(fromIndex, toIndex)];
    const right = layout.screens[Math.max(fromIndex, toIndex)];
    if (
      connection.transitionX !== left.endX ||
      connection.transitionX !== right.startX
    ) {
      errors.push(`${connection.id}: transition does not match shared boundary`);
    }
    adjacency.get(connection.fromScreenId)?.add(connection.toScreenId);
    adjacency.get(connection.toScreenId)?.add(connection.fromScreenId);
  }

  const firstId = layout.screens[0]?.id;
  const visited = new Set<string>();
  if (firstId) {
    const pending = [firstId];
    while (pending.length > 0) {
      const id = pending.pop();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      for (const neighbor of adjacency.get(id) ?? []) pending.push(neighbor);
    }
  }
  if (visited.size !== layout.screens.length) {
    errors.push(`${layout.missionId}: disconnected screen graph`);
  }

  return errors;
}
