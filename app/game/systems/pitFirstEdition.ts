/**
 * Content contract for THE PIT first edition.
 *
 * This registry stays independent from campaign progression and from browser
 * storage. It is intentionally data-only so the deterministic combat engine,
 * replay codec and presentation can adopt the roster in separate migrations.
 */

export const PIT_FIRST_EDITION_CONTENT_VERSION = 1 as const;

export const PIT_FIRST_EDITION_FIGHTER_IDS = [
  "jungle-hunter",
  "city-hunter",
  "scar",
  "celtic",
  "wolf",
  "feral-hunter",
  "berserker",
  "falconer",
  "scarface",
  "valkyrie",
  "witch",
  "enforcer",
] as const;

export type PitFirstEditionFighterId = (typeof PIT_FIRST_EDITION_FIGHTER_IDS)[number];

export const PIT_CHRONICLE_BOSS_IDS = ["kok-warlord", "stone-heart"] as const;
export type PitChronicleBossId = (typeof PIT_CHRONICLE_BOSS_IDS)[number];
export type PitFirstEditionCombatantId = PitFirstEditionFighterId | PitChronicleBossId;

export const PIT_FIRST_EDITION_ARENA_IDS = [
  "the-pit",
  "trophy-hall",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "glass-terrace",
  "abyssal-bridge",
  "ruins-tribunal",
] as const;

export type PitFirstEditionArenaId = (typeof PIT_FIRST_EDITION_ARENA_IDS)[number];
export type PitFighterContinuity = "canon" | "crossover" | "expanded";
export type PitFighterArchetype =
  | "all-rounder"
  | "rushdown"
  | "duelist"
  | "bruiser"
  | "specialist"
  | "juggernaut"
  | "air-control"
  | "comeback"
  | "reach"
  | "trapper"
  | "punisher"
  | "boss";
export type PitEditionAttackKind = "light" | "medium" | "heavy" | "technique";
export type PitEditionHitLevel = "high" | "mid" | "low";

/**
 * Runtime recipe for a fighter's authored technique. The combat engine reads
 * only these fields: adding a hunter does not require a fighter-specific code
 * branch. Technique entities remain local to THE PIT and never carry campaign
 * currency, honour or trophy rewards.
 */
export type PitTechniqueDevice =
  | "disc"
  | "net"
  | "plasma"
  | "shoulder"
  | "whip"
  | "bolt-trap"
  | "shockwave"
  | "drone"
  | "counter-blade"
  | "spear"
  | "bow-snare"
  | "code-parry"
  | "warlord-wave"
  | "stone-heart-charge";
export type PitTechniqueMotion =
  | "linear"
  | "returning"
  | "homing"
  | "stationary"
  | "attached";
export type PitTechniqueTrigger = "contact" | "counter";
export type PitTechniqueStatusKind = "netted" | "pinned" | "tracked" | "staggered";

export interface PitEditionTechniqueDefinition {
  readonly id: string;
  readonly device: PitTechniqueDevice;
  readonly motion: PitTechniqueMotion;
  readonly trigger: PitTechniqueTrigger;
  readonly lifetimeFrames: number;
  readonly armFrames: number;
  readonly speed: number;
  readonly returnFrame: number | null;
  readonly width: number;
  readonly height: number;
  readonly verticalOffset: number;
  readonly damageScale: number;
  readonly chipScale: number;
  readonly hitstunBonus: number;
  readonly blockstunBonus: number;
  readonly pushbackScale: number;
  readonly guardBreak: boolean;
  readonly knockdown: boolean;
  readonly ownerDashSpeed: number;
  readonly maxHits: 1 | 2;
  readonly rehitFrames: number;
  readonly status: PitTechniqueStatusKind | null;
  readonly statusFrames: number;
  readonly movementScale: number;
  readonly jumpLocked: boolean;
  readonly cloakLocked: boolean;
}

export interface PitEditionMoveDefinition {
  readonly kind: PitEditionAttackKind;
  readonly label: string;
  readonly startup: number;
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  readonly chipDamage: number;
  readonly hitstun: number;
  readonly blockstun: number;
  readonly range: number;
  readonly height: number;
  readonly hitLevel: PitEditionHitLevel;
  readonly pushback: number;
  readonly knockdown: boolean;
  readonly antiAir: boolean;
  readonly launchY: number;
}

export interface PitEditionFighterDefinition {
  readonly id: PitFirstEditionCombatantId;
  readonly name: string;
  readonly epithet: string;
  readonly sourcePresetId: string;
  readonly sourceWork: string;
  readonly continuity: PitFighterContinuity;
  readonly archetype: PitFighterArchetype;
  readonly selectable: boolean;
  readonly runtimeStatus: "vertical-slice" | "authored" | "chronicle-boss";
  readonly rivalId: PitFirstEditionFighterId | null;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly maxHealth: number;
  readonly walkSpeed: number;
  readonly airSpeed: number;
  readonly jumpSpeed: number;
  readonly power: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly crouchHeight: number;
  readonly palette: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
  };
  readonly attacks: Readonly<Record<PitEditionAttackKind, PitEditionMoveDefinition>>;
  readonly technique: PitEditionTechniqueDefinition;
  readonly arcadeIntro: string;
  readonly arcadeEnding: string;
}

export interface PitArenaLayerDefinition {
  readonly id: string;
  readonly depth: "far" | "mid" | "near" | "foreground";
  readonly parallax: number;
}

export interface PitFirstEditionArenaDefinition {
  readonly id: PitFirstEditionArenaId;
  readonly name: string;
  readonly width: 960;
  readonly height: 540;
  readonly groundY: 430;
  readonly leftWall: 54;
  readonly rightWall: 906;
  readonly spawnX: readonly [300, 660];
  /** First-edition ranked geometry is fixed; scene hazards remain visual. */
  readonly competitiveHazards: false;
  readonly setting: string;
  readonly palette: {
    readonly sky: string;
    readonly ground: string;
    readonly accent: string;
  };
  readonly layers: readonly PitArenaLayerDefinition[];
}

export interface PitClanCircuitChapter {
  readonly index: 1 | 2 | 3 | 4 | 5;
  readonly id:
    | "call-of-the-circle"
    | "three-paths"
    | "stolen-trophies"
    | "desecrated-pit"
    | "judgment";
  readonly name: string;
  readonly objective: string;
  readonly format: "duel" | "route" | "investigation" | "survival" | "boss";
  readonly cosmeticRewardId: string;
}

type MoveNumbers = readonly [
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  hitstun: number,
  blockstun: number,
  range: number,
  height: number,
  pushback: number,
];

function move(
  kind: PitEditionAttackKind,
  label: string,
  numbers: MoveNumbers,
  hitLevel: PitEditionHitLevel,
  options: { readonly knockdown?: boolean; readonly antiAir?: boolean; readonly launchY?: number } = {},
): PitEditionMoveDefinition {
  const [startup, active, recovery, damage, hitstun, blockstun, range, height, pushback] = numbers;
  return {
    kind,
    label,
    startup,
    active,
    recovery,
    damage,
    chipDamage: kind === "heavy" || kind === "technique" ? Math.ceil(damage * 0.08) : 0,
    hitstun,
    blockstun,
    range,
    height,
    hitLevel,
    pushback,
    knockdown: options.knockdown === true,
    antiAir: options.antiAir === true,
    launchY: options.launchY ?? 0,
  };
}

function moves(
  labels: readonly [string, string, string, string],
  profile: {
    readonly light: MoveNumbers;
    readonly medium: MoveNumbers;
    readonly heavy: MoveNumbers;
    readonly technique: MoveNumbers;
    readonly techniqueLevel?: PitEditionHitLevel;
    readonly heavyLaunchY?: number;
    readonly techniqueAntiAir?: boolean;
  },
): Readonly<Record<PitEditionAttackKind, PitEditionMoveDefinition>> {
  return {
    light: move("light", labels[0], profile.light, "high"),
    medium: move("medium", labels[1], profile.medium, "mid"),
    heavy: move("heavy", labels[2], profile.heavy, "high", {
      knockdown: true,
      antiAir: true,
      launchY: profile.heavyLaunchY ?? 8,
    }),
    technique: move(
      "technique",
      labels[3],
      profile.technique,
      profile.techniqueLevel ?? "low",
      { knockdown: true, antiAir: profile.techniqueAntiAir },
    ),
  };
}

const BALANCE = {
  allRounder: {
    light: [5, 3, 10, 55, 15, 8, 62, 38, 14],
    medium: [8, 4, 15, 80, 20, 11, 82, 46, 20],
    heavy: [14, 5, 24, 125, 30, 17, 70, 60, 34],
    technique: [11, 4, 20, 95, 24, 14, 90, 26, 26],
    heavyLaunchY: 8.5,
  },
  rushdown: {
    light: [4, 3, 9, 50, 14, 7, 58, 36, 12],
    medium: [7, 4, 13, 74, 19, 10, 76, 44, 18],
    heavy: [13, 5, 22, 116, 28, 16, 68, 58, 31],
    technique: [9, 5, 18, 88, 22, 12, 92, 28, 24],
    heavyLaunchY: 8.8,
  },
  duelist: {
    light: [5, 3, 9, 53, 15, 8, 66, 38, 13],
    medium: [7, 4, 14, 78, 20, 11, 88, 44, 19],
    heavy: [13, 4, 23, 121, 29, 17, 78, 58, 32],
    technique: [8, 3, 18, 84, 26, 15, 70, 50, 22],
    techniqueLevel: "mid" as const,
    techniqueAntiAir: true,
    heavyLaunchY: 8.2,
  },
  bruiser: {
    light: [6, 3, 11, 61, 17, 9, 64, 42, 16],
    medium: [9, 4, 16, 88, 22, 13, 80, 50, 24],
    heavy: [15, 6, 25, 136, 33, 19, 74, 64, 38],
    technique: [12, 4, 21, 102, 27, 15, 84, 30, 30],
    heavyLaunchY: 9.2,
  },
  specialist: {
    light: [5, 3, 10, 52, 15, 8, 64, 38, 13],
    medium: [9, 4, 15, 79, 21, 12, 92, 46, 20],
    heavy: [14, 5, 24, 122, 30, 18, 76, 60, 34],
    technique: [13, 5, 22, 100, 25, 15, 112, 28, 27],
    heavyLaunchY: 8.6,
  },
  juggernaut: {
    light: [5, 3, 11, 58, 16, 8, 64, 40, 15],
    medium: [9, 4, 15, 84, 21, 12, 78, 48, 22],
    heavy: [15, 5, 25, 132, 32, 18, 72, 62, 36],
    technique: [12, 4, 20, 98, 25, 14, 86, 28, 28],
    heavyLaunchY: 9,
  },
  airControl: {
    light: [5, 3, 9, 51, 14, 7, 64, 38, 12],
    medium: [8, 5, 14, 76, 19, 10, 96, 48, 18],
    heavy: [13, 5, 23, 117, 29, 16, 82, 60, 31],
    technique: [10, 5, 18, 91, 24, 13, 104, 52, 25],
    techniqueLevel: "mid" as const,
    techniqueAntiAir: true,
    heavyLaunchY: 9.4,
  },
  trickster: {
    light: [5, 3, 10, 52, 15, 8, 60, 36, 12],
    medium: [8, 4, 14, 77, 20, 11, 84, 44, 18],
    heavy: [14, 5, 23, 119, 29, 17, 72, 58, 32],
    technique: [12, 6, 22, 93, 25, 15, 108, 26, 25],
    heavyLaunchY: 8.4,
  },
  boss: {
    light: [5, 4, 10, 64, 18, 10, 68, 44, 18],
    medium: [9, 5, 15, 94, 24, 14, 92, 54, 27],
    heavy: [16, 6, 25, 146, 35, 20, 84, 68, 42],
    technique: [13, 6, 23, 112, 29, 17, 116, 34, 34],
    heavyLaunchY: 9.6,
  },
} as const;

const BASE_TECHNIQUE: Omit<PitEditionTechniqueDefinition, "id" | "device"> = {
  motion: "linear",
  trigger: "contact",
  lifetimeFrames: 36,
  armFrames: 0,
  speed: 10,
  returnFrame: null,
  width: 42,
  height: 34,
  verticalOffset: 18,
  damageScale: 1,
  chipScale: 1,
  hitstunBonus: 0,
  blockstunBonus: 0,
  pushbackScale: 1,
  guardBreak: false,
  knockdown: false,
  ownerDashSpeed: 0,
  maxHits: 1,
  rehitFrames: 0,
  status: null,
  statusFrames: 0,
  movementScale: 1,
  jumpLocked: false,
  cloakLocked: false,
};

function technique(
  id: string,
  device: PitTechniqueDevice,
  options: Partial<Omit<PitEditionTechniqueDefinition, "id" | "device">>,
): PitEditionTechniqueDefinition {
  return { ...BASE_TECHNIQUE, ...options, id, device };
}

function fighter(
  definition: PitEditionFighterDefinition,
): PitEditionFighterDefinition {
  return definition;
}

export const PIT_FIRST_EDITION_FIGHTERS: Readonly<
  Record<PitFirstEditionFighterId, PitEditionFighterDefinition>
> = {
  "jungle-hunter": fighter({
    id: "jungle-hunter", name: "Jungle Hunter", epithet: "The First Hunter",
    sourcePresetId: "jungle-hunter", sourceWork: "Predator (1987)", continuity: "canon",
    archetype: "all-rounder", selectable: true, runtimeStatus: "vertical-slice",
    rivalId: "city-hunter", difficulty: 2, maxHealth: 1_000, walkSpeed: 4.7,
    airSpeed: 3.2, jumpSpeed: 12.4, power: 1, bodyWidth: 54, bodyHeight: 116,
    crouchHeight: 82, palette: { primary: "#66714f", secondary: "#30291f", accent: "#d7b45b" },
    attacks: moves(["Estoc aux lames de poignet", "Balayage au combistick", "Fracas vertical", "Feinte basse au disque"], BALANCE.allRounder),
    technique: technique("jungle-disc-return", "disc", {
      motion: "returning", lifetimeFrames: 48, speed: 12, returnFrame: 20,
      width: 38, height: 30, verticalOffset: 46, damageScale: 1,
      chipScale: 1, knockdown: true, maxHits: 2, rehitFrames: 12,
    }),
    arcadeIntro: "Le premier chasseur répond à l’appel du Cercle sans témoin ni concession.",
    arcadeEnding: "Jungle Hunter grave une nouvelle marque et disparaît avant que le clan ne rompe le silence.",
  }),
  "city-hunter": fighter({
    id: "city-hunter", name: "City Hunter", epithet: "Urban Stalker",
    sourcePresetId: "city-hunter", sourceWork: "Predator 2 (1990)", continuity: "canon",
    archetype: "rushdown", selectable: true, runtimeStatus: "authored",
    rivalId: "jungle-hunter", difficulty: 3, maxHealth: 970, walkSpeed: 5,
    airSpeed: 3.45, jumpSpeed: 12.8, power: 0.98, bodyWidth: 52, bodyHeight: 114,
    crouchHeight: 80, palette: { primary: "#84724d", secondary: "#28231d", accent: "#d46f35" },
    attacks: moves(["Entaille urbaine", "Fente au combistick", "Revers montant au disque", "Filet de capture"], BALANCE.rushdown),
    technique: technique("city-capture-net", "net", {
      lifetimeFrames: 42, speed: 8, width: 58, height: 54, verticalOffset: 20,
      damageScale: 0.7, chipScale: 0.5, status: "netted", statusFrames: 120,
      movementScale: 0.34, jumpLocked: true, cloakLocked: true,
    }),
    arcadeIntro: "City Hunter entre dans l’arène pour prouver que la vitesse peut devenir une loi.",
    arcadeEnding: "La ville n’était qu’un prélude : sa victoire impose un nouveau rite de poursuite.",
  }),
  scar: fighter({
    id: "scar", name: "Scar", epithet: "Marked Initiate", sourcePresetId: "scar",
    sourceWork: "Alien vs. Predator (2004)", continuity: "crossover", archetype: "duelist",
    selectable: true, runtimeStatus: "authored", rivalId: "celtic", difficulty: 2,
    maxHealth: 1_010, walkSpeed: 4.65, airSpeed: 3.2, jumpSpeed: 12.3, power: 1.01,
    bodyWidth: 55, bodyHeight: 118, crouchHeight: 83,
    palette: { primary: "#75684c", secondary: "#322d27", accent: "#c6a348" },
    attacks: moves(["Lames du marqué", "Percée au combistick", "Ascension au plasma", "Riposte d’honneur"], BALANCE.duelist),
    technique: technique("scar-plasma-riposte", "plasma", {
      lifetimeFrames: 28, speed: 15, width: 40, height: 40, verticalOffset: 42,
      damageScale: 1.05, chipScale: 1.35, hitstunBonus: 4, guardBreak: true,
      knockdown: true, status: "staggered", statusFrames: 42, movementScale: 0.78,
    }),
    arcadeIntro: "Scar accepte le Circuit comme une seconde initiation, cette fois sans guide.",
    arcadeEnding: "La marque qu’il porte n’est plus un passage : elle devient serment de gardien.",
  }),
  celtic: fighter({
    id: "celtic", name: "Celtic", epithet: "Arena Breaker", sourcePresetId: "celtic",
    sourceWork: "Alien vs. Predator (2004)", continuity: "crossover", archetype: "bruiser",
    selectable: true, runtimeStatus: "authored", rivalId: "scar", difficulty: 2,
    maxHealth: 1_060, walkSpeed: 4.3, airSpeed: 2.85, jumpSpeed: 11.7, power: 1.05,
    bodyWidth: 59, bodyHeight: 122, crouchHeight: 87,
    palette: { primary: "#5f665c", secondary: "#232829", accent: "#acb7b5" },
    attacks: moves(["Revers celtique", "Fracas au filet", "Fendoir briseur", "Écrasement d’épaule"], BALANCE.bruiser),
    technique: technique("celtic-shoulder-crush", "shoulder", {
      motion: "attached", lifetimeFrames: 6, width: 72, height: 66,
      verticalOffset: 10, damageScale: 1.12, hitstunBonus: 5,
      pushbackScale: 1.3, knockdown: true, ownerDashSpeed: 7,
    }),
    arcadeIntro: "Celtic revient au Cercle pour transformer l’épreuve interrompue en victoire entière.",
    arcadeEnding: "Le masque celtique domine les gradins ; aucune chute passée ne définit plus son nom.",
  }),
  wolf: fighter({
    id: "wolf", name: "Wolf", epithet: "Veteran Cleaner", sourcePresetId: "wolf",
    sourceWork: "Aliens vs. Predator: Requiem (2007)", continuity: "crossover",
    archetype: "specialist", selectable: true, runtimeStatus: "authored", rivalId: "berserker",
    difficulty: 4, maxHealth: 1_000, walkSpeed: 4.65, airSpeed: 3.15, jumpSpeed: 12.2,
    power: 1.02, bodyWidth: 55, bodyHeight: 118, crouchHeight: 83,
    palette: { primary: "#596158", secondary: "#242729", accent: "#83b6c8" },
    attacks: moves(["Taille du nettoyeur", "Croix aux doubles lames", "Interception au canon", "Rappel du fouet"], BALANCE.specialist),
    technique: technique("wolf-whip-recall", "whip", {
      motion: "attached", lifetimeFrames: 8, width: 136, height: 48,
      verticalOffset: 32, damageScale: 0.82, hitstunBonus: 8,
      pushbackScale: -0.72, status: "staggered", statusFrames: 54,
      movementScale: 0.72,
    }),
    arcadeIntro: "Wolf traite la profanation du Cercle comme toute contamination : vite et sans erreur.",
    arcadeEnding: "Le vétéran ferme la Fosse, efface ses traces et laisse un Tribunal enfin silencieux.",
  }),
  "feral-hunter": fighter({
    id: "feral-hunter", name: "Feral", epithet: "First Blood", sourcePresetId: "feral-hunter",
    sourceWork: "Prey (2022)", continuity: "canon", archetype: "rushdown", selectable: true,
    runtimeStatus: "authored", rivalId: "falconer", difficulty: 3, maxHealth: 960,
    walkSpeed: 5.1, airSpeed: 3.55, jumpSpeed: 13, power: 1, bodyWidth: 53,
    bodyHeight: 119, crouchHeight: 82,
    palette: { primary: "#74634c", secondary: "#332a21", accent: "#d2b56a" },
    attacks: moves(["Lacération férale", "Ruée à la lance scindée", "Charge au bouclier", "Piège à carreaux"], BALANCE.rushdown),
    technique: technique("feral-bolt-trap", "bolt-trap", {
      motion: "stationary", lifetimeFrames: 180, armFrames: 7, speed: 0,
      width: 70, height: 24, verticalOffset: 0, damageScale: 0.8,
      status: "pinned", statusFrames: 90, movementScale: 0.48,
      jumpLocked: true,
    }),
    arcadeIntro: "Feral refuse les usages figés et chasse chaque adversaire comme un territoire inconnu.",
    arcadeEnding: "Sa voie brutale survit au Jugement et force les anciens à reconnaître un rite plus ancien encore.",
  }),
  berserker: fighter({
    id: "berserker", name: "Berserker / Mr. Black", epithet: "Super Predator",
    sourcePresetId: "berserker", sourceWork: "Predators (2010)", continuity: "canon",
    archetype: "juggernaut", selectable: true, runtimeStatus: "vertical-slice",
    rivalId: "wolf", difficulty: 2, maxHealth: 1_040, walkSpeed: 4.35,
    airSpeed: 2.9, jumpSpeed: 11.8, power: 1.04, bodyWidth: 58, bodyHeight: 122,
    crouchHeight: 86, palette: { primary: "#5b1f1c", secondary: "#171311", accent: "#bfc5b5" },
    attacks: moves(["Revers sauvage", "Crochet au fendoir", "Coup écraseur", "Brise-cheville"], BALANCE.juggernaut),
    technique: technique("berserker-ground-shock", "shockwave", {
      lifetimeFrames: 24, speed: 6, width: 64, height: 30,
      verticalOffset: 0, damageScale: 1.08, chipScale: 1.2,
      hitstunBonus: 3, pushbackScale: 1.4, guardBreak: true, knockdown: true,
    }),
    arcadeIntro: "Berserker voit le Circuit comme un territoire à prendre, pas comme un rite à respecter.",
    arcadeEnding: "Le Jugement ne l’absout pas ; il confirme seulement que nul ne pouvait l’arrêter dans la Fosse.",
  }),
  falconer: fighter({
    id: "falconer", name: "Falconer", epithet: "Sky Tracker", sourcePresetId: "falconer",
    sourceWork: "Predators (2010)", continuity: "canon", archetype: "air-control",
    selectable: true, runtimeStatus: "authored", rivalId: "feral-hunter", difficulty: 4,
    maxHealth: 965, walkSpeed: 4.75, airSpeed: 3.7, jumpSpeed: 13.2, power: 0.99,
    bodyWidth: 53, bodyHeight: 117, crouchHeight: 81,
    palette: { primary: "#55463c", secondary: "#1f1b19", accent: "#bd694d" },
    attacks: moves(["Estoc du faucon", "Balayage du fauconnier", "Fendoir céleste", "Interception du drone"], BALANCE.airControl),
    technique: technique("falconer-drone-intercept", "drone", {
      motion: "homing", lifetimeFrames: 72, armFrames: 8, speed: 7,
      width: 46, height: 34, verticalOffset: 66, damageScale: 0.92,
      hitstunBonus: 4, status: "tracked", statusFrames: 150,
      movementScale: 0.9, cloakLocked: true,
    }),
    arcadeIntro: "Falconer cartographie les arènes avant le premier gong et referme chaque échappatoire.",
    arcadeEnding: "Vu d’en haut, le Circuit achevé dessine la marque exacte de sa victoire.",
  }),
  scarface: fighter({
    id: "scarface", name: "Scarface", epithet: "Exiled Veteran", sourcePresetId: "scarface",
    sourceWork: "Predator: Concrete Jungle (2005)", continuity: "expanded", archetype: "comeback",
    selectable: true, runtimeStatus: "authored", rivalId: "enforcer", difficulty: 4,
    maxHealth: 1_020, walkSpeed: 4.55, airSpeed: 3.05, jumpSpeed: 12, power: 1.03,
    bodyWidth: 56, bodyHeight: 120, crouchHeight: 84,
    palette: { primary: "#4f5648", secondary: "#24201d", accent: "#c35a3b" },
    attacks: moves(["Entaille de l’exilé", "Retour du glaive", "Frappe de rédemption", "Riposte balafrée"], BALANCE.duelist),
    technique: technique("scarface-revenge-counter", "counter-blade", {
      motion: "attached", trigger: "counter", lifetimeFrames: 14,
      width: 92, height: 76, verticalOffset: 18, damageScale: 1.22,
      hitstunBonus: 8, pushbackScale: 1.18, knockdown: true,
    }),
    arcadeIntro: "Scarface avance dans le Circuit comme dans un exil : chaque duel rapproche le retour.",
    arcadeEnding: "Devant le Tribunal, le vétéran ne réclame rien ; son parcours a déjà rendu son nom.",
  }),
  valkyrie: fighter({
    id: "valkyrie", name: "Valkyrie", epithet: "Spear of the North", sourcePresetId: "valkyrie",
    sourceWork: "Predator: Hunting Grounds", continuity: "expanded", archetype: "reach",
    selectable: true, runtimeStatus: "authored", rivalId: "witch", difficulty: 3,
    maxHealth: 990, walkSpeed: 4.7, airSpeed: 3.25, jumpSpeed: 12.5, power: 1.01,
    bodyWidth: 54, bodyHeight: 118, crouchHeight: 82,
    palette: { primary: "#77808a", secondary: "#292d34", accent: "#78b9d4" },
    attacks: moves(["Pommeau de Valkyrie", "Arc à la longue lance", "Descente du givre", "Interception ailée"], BALANCE.airControl),
    technique: technique("valkyrie-spear-intercept", "spear", {
      motion: "attached", lifetimeFrames: 9, width: 118, height: 54,
      verticalOffset: 30, damageScale: 0.96, hitstunBonus: 6,
      pushbackScale: 1.12, knockdown: true, ownerDashSpeed: 5.5,
    }),
    arcadeIntro: "Valkyrie choisit la voie la plus exposée, là où chaque pas peut être jugé.",
    arcadeEnding: "Sa lance plantée dans le basalte devient le repère d’une voie désormais reconnue par le clan.",
  }),
  witch: fighter({
    id: "witch", name: "Witch", epithet: "Mist Stalker", sourcePresetId: "witch",
    sourceWork: "Predator: Hunting Grounds", continuity: "expanded", archetype: "trapper",
    selectable: true, runtimeStatus: "authored", rivalId: "valkyrie", difficulty: 5,
    maxHealth: 955, walkSpeed: 4.85, airSpeed: 3.4, jumpSpeed: 12.7, power: 0.99,
    bodyWidth: 52, bodyHeight: 115, crouchHeight: 79,
    palette: { primary: "#51435f", secondary: "#211b29", accent: "#9bd1bd" },
    attacks: moves(["Griffe camouflée", "Frappe à l’arc yautja", "Tir plongeant", "Piège à collet"], BALANCE.trickster),
    technique: technique("witch-bow-snare", "bow-snare", {
      lifetimeFrames: 54, speed: 13, width: 34, height: 18,
      verticalOffset: 38, damageScale: 0.74, status: "pinned",
      statusFrames: 105, movementScale: 0.42, jumpLocked: true,
      cloakLocked: true,
    }),
    arcadeIntro: "Witch brouille les pistes du Circuit et oblige chaque rival à combattre ses propres certitudes.",
    arcadeEnding: "Quand la brume quitte le Tribunal, seule sa marque demeure sur la pierre froide.",
  }),
  enforcer: fighter({
    id: "enforcer", name: "Enforcer", epithet: "Keeper of the Code", sourcePresetId: "enforcer",
    sourceWork: "Predator: Bad Blood", continuity: "expanded", archetype: "punisher",
    selectable: true, runtimeStatus: "authored", rivalId: "scarface", difficulty: 4,
    maxHealth: 1_045, walkSpeed: 4.4, airSpeed: 3, jumpSpeed: 11.9, power: 1.04,
    bodyWidth: 57, bodyHeight: 121, crouchHeight: 85,
    palette: { primary: "#58636b", secondary: "#1d2328", accent: "#b9a46a" },
    attacks: moves(["Estoc du Code", "Balayage du justicier", "Coup de sentence", "Riposte du Code"], BALANCE.bruiser),
    technique: technique("enforcer-code-parry", "code-parry", {
      motion: "attached", trigger: "counter", lifetimeFrames: 18,
      width: 86, height: 82, verticalOffset: 14, damageScale: 1.08,
      blockstunBonus: 8, pushbackScale: 1.55, knockdown: true, status: "staggered",
      statusFrames: 48, movementScale: 0.7,
    }),
    arcadeIntro: "Enforcer ne cherche pas le prestige : il entre pour mesurer chaque faute et chaque dette.",
    arcadeEnding: "Le dernier gong prononce une sentence simple : le Code tient encore.",
  }),
};

export const PIT_CHRONICLE_BOSSES: Readonly<
  Record<PitChronicleBossId, PitEditionFighterDefinition>
> = {
  "kok-warlord": fighter({
    id: "kok-warlord", name: "Warlord", epithet: "Chronicle Tyrant", sourcePresetId: "kok-warlord",
    sourceWork: "Predator: Killer of Killers", continuity: "canon", archetype: "boss",
    selectable: false, runtimeStatus: "chronicle-boss", rivalId: null, difficulty: 5,
    maxHealth: 1_150, walkSpeed: 4.2, airSpeed: 2.8, jumpSpeed: 11.4, power: 1.08,
    bodyWidth: 62, bodyHeight: 126, crouchHeight: 90,
    palette: { primary: "#5e493b", secondary: "#1b1715", accent: "#d09345" },
    attacks: moves(["Griffe du seigneur", "Balayage du conquérant", "Fracas du tyran", "Décret de la Chronique"], BALANCE.boss),
    technique: technique("warlord-chronicle-wave", "warlord-wave", {
      lifetimeFrames: 30, speed: 7, width: 82, height: 42,
      verticalOffset: 0, damageScale: 1.12, guardBreak: true,
      pushbackScale: 1.5, knockdown: true,
    }),
    arcadeIntro: "Warlord attend au terme du Circuit.",
    arcadeEnding: "Le tyran tombe, mais sa Chronique reste scellée hors du roster principal.",
  }),
  "stone-heart": fighter({
    id: "stone-heart", name: "Stone Heart", epithet: "Chronicle Colossus", sourcePresetId: "stone-heart",
    sourceWork: "Predator: Concrete Jungle (2005)", continuity: "expanded", archetype: "boss",
    selectable: false, runtimeStatus: "chronicle-boss", rivalId: null, difficulty: 5,
    maxHealth: 1_220, walkSpeed: 3.85, airSpeed: 2.5, jumpSpeed: 10.8, power: 1.1,
    bodyWidth: 66, bodyHeight: 130, crouchHeight: 94,
    palette: { primary: "#4d565d", secondary: "#181d20", accent: "#d6503e" },
    attacks: moves(["Poing de pierre", "Lariat de fer", "Chute du colosse", "Onde du cœur blindé"], BALANCE.boss),
    technique: technique("stone-heart-armored-charge", "stone-heart-charge", {
      motion: "attached", lifetimeFrames: 10, width: 96, height: 90,
      verticalOffset: 8, damageScale: 1.18, hitstunBonus: 6,
      pushbackScale: 1.65, knockdown: true, ownerDashSpeed: 4.5,
    }),
    arcadeIntro: "Stone Heart garde une branche interdite de la Descente.",
    arcadeEnding: "Le colosse brisé retourne à sa Chronique sans devenir un déverrouillage jouable.",
  }),
};

function arena(
  id: PitFirstEditionArenaId,
  name: string,
  setting: string,
  palette: PitFirstEditionArenaDefinition["palette"],
  layerIds: readonly [string, string, string, string],
): PitFirstEditionArenaDefinition {
  return {
    id,
    name,
    width: 960,
    height: 540,
    groundY: 430,
    leftWall: 54,
    rightWall: 906,
    spawnX: [300, 660],
    competitiveHazards: false,
    setting,
    palette,
    layers: [
      { id: layerIds[0], depth: "far", parallax: 0.08 },
      { id: layerIds[1], depth: "mid", parallax: 0.24 },
      { id: layerIds[2], depth: "near", parallax: 0.52 },
      { id: layerIds[3], depth: "foreground", parallax: 0.86 },
    ],
  };
}

export const PIT_FIRST_EDITION_ARENAS: Readonly<
  Record<PitFirstEditionArenaId, PitFirstEditionArenaDefinition>
> = {
  "the-pit": arena("the-pit", "Cercle de basalte", "Vaisseau clanique · cercle rituel central", { sky: "#10171a", ground: "#282722", accent: "#c66e3b" }, ["smoke-vault", "clan-pillars", "basalt-ring", "ritual-chain"]),
  "trophy-hall": arena("trophy-hall", "Salle des trophées", "Vaisseau clanique · galerie des prises", { sky: "#14120f", ground: "#29231d", accent: "#c9a55b" }, ["trophy-vault", "skull-gallery", "display-dais", "hanging-tokens"]),
  "canopy-causeway": arena("canopy-causeway", "Passerelle de canopée", "Monde-jungle · pont suspendu sous l’orage", { sky: "#0e2220", ground: "#28372c", accent: "#79b57a" }, ["storm-canopy", "distant-trunks", "causeway-deck", "hanging-vines"]),
  "frost-chamber": arena("frost-chamber", "Chambre du givre", "Complexe polaire · chambre cryogénique", { sky: "#111d28", ground: "#263644", accent: "#86d1eb" }, ["ice-vault", "frozen-machinery", "frost-dais", "cold-vapor"]),
  "ash-courtyard": arena("ash-courtyard", "Cour des cendres", "Sanctuaire incendié · cour rituelle", { sky: "#241512", ground: "#342621", accent: "#e06f3e" }, ["ember-sky", "charred-gates", "ash-stones", "falling-cinders"]),
  "glass-terrace": arena("glass-terrace", "Terrasse de verre", "Vaisseau en orbite · baie panoramique", { sky: "#111c20", ground: "#243238", accent: "#8ad0c5" }, ["planet-horizon", "ship-ribs", "glass-deck", "reflection-shards"]),
  "abyssal-bridge": arena("abyssal-bridge", "Pont abyssal", "Pelagos-M · océan, coque exposée et silhouettes abyssales", { sky: "#071b24", ground: "#24363a", accent: "#54aeb7" }, ["pelagos-m-ocean", "exposed-hull", "abyssal-silhouettes", "pressure-mist"]),
  "ruins-tribunal": arena("ruins-tribunal", "Tribunal des ruines", "Ruines des anciens · enceinte du Jugement", { sky: "#201d18", ground: "#373128", accent: "#d2bb78" }, ["ruin-horizon", "elder-statues", "tribunal-floor", "verdict-banners"]),
};

export const PIT_CLAN_CIRCUIT_CHAPTERS: readonly PitClanCircuitChapter[] = [
  {
    index: 1,
    id: "call-of-the-circle",
    name: "L’Appel du cercle",
    objective: "Répondre au rite d’ouverture et remporter le premier duel.",
    format: "duel",
    cosmeticRewardId: "pit-emblem-circle-call",
  },
  {
    index: 2,
    id: "three-paths",
    name: "Les Trois Voies",
    objective: "Choisir une voie de maîtrise et vaincre ses trois gardiens.",
    format: "route",
    cosmeticRewardId: "pit-banner-three-paths",
  },
  {
    index: 3,
    id: "stolen-trophies",
    name: "Les Trophées volés",
    objective: "Identifier le profanateur sans rompre le Code du duel.",
    format: "investigation",
    cosmeticRewardId: "pit-title-trophy-keeper",
  },
  {
    index: 4,
    id: "desecrated-pit",
    name: "La Fosse profanée",
    objective: "Survivre à la fosse altérée et fermer ses voies interdites.",
    format: "survival",
    cosmeticRewardId: "pit-palette-ashen-circle",
  },
  {
    index: 5,
    id: "judgment",
    name: "Le Jugement",
    objective: "Affronter Warlord devant le Tribunal des ruines.",
    format: "boss",
    cosmeticRewardId: "pit-intro-elder-verdict",
  },
];

const FIRST_EDITION_FIGHTER_ID_SET: ReadonlySet<string> = new Set(PIT_FIRST_EDITION_FIGHTER_IDS);
const CHRONICLE_BOSS_ID_SET: ReadonlySet<string> = new Set(PIT_CHRONICLE_BOSS_IDS);
const ARENA_ID_SET: ReadonlySet<string> = new Set(PIT_FIRST_EDITION_ARENA_IDS);

export function isPitFirstEditionFighterId(value: unknown): value is PitFirstEditionFighterId {
  return typeof value === "string" && FIRST_EDITION_FIGHTER_ID_SET.has(value);
}

export function isPitChronicleBossId(value: unknown): value is PitChronicleBossId {
  return typeof value === "string" && CHRONICLE_BOSS_ID_SET.has(value);
}

export function isPitFirstEditionCombatantId(value: unknown): value is PitFirstEditionCombatantId {
  return isPitFirstEditionFighterId(value) || isPitChronicleBossId(value);
}

export function isPitFirstEditionArenaId(value: unknown): value is PitFirstEditionArenaId {
  return typeof value === "string" && ARENA_ID_SET.has(value);
}

export function getPitFirstEditionFighter(
  id: PitFirstEditionCombatantId,
): PitEditionFighterDefinition {
  return isPitFirstEditionFighterId(id)
    ? PIT_FIRST_EDITION_FIGHTERS[id]
    : PIT_CHRONICLE_BOSSES[id];
}

export function getPitFirstEditionArena(
  id: PitFirstEditionArenaId,
): PitFirstEditionArenaDefinition {
  return PIT_FIRST_EDITION_ARENAS[id];
}
