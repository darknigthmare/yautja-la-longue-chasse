import {
  ECOLOGY_V8_BOSS_ENEMY_IDS,
  ECOLOGY_V8_PLANETS,
  ecologyV8EnemyForId,
  type EcologyV8EnemyDefinition,
  type EcologyV8MissionId,
} from "./ecologyV8";

export type EcologyV8RuntimeKind = "human" | "beast" | "yautja";
export type EcologyV8Mobility =
  | "ground"
  | "flying"
  | "stationary"
  | "burrowing";
export type EcologyV8AttackStyle = "melee" | "ranged";

export interface EcologyV8RuntimeProfile {
  kind: EcologyV8RuntimeKind;
  mobility: EcologyV8Mobility;
  attackStyle: EcologyV8AttackStyle;
  width: number;
  height: number;
  animationFps: number;
  healthScale: number;
  damageScale: number;
  speedScale: number;
}

const MACHINE_MARKERS = [
  "automaton",
  "construct",
  "drone",
  "exosuit",
  "guardian",
  "mech",
  "security-synth",
  "sentinel",
  "synth",
];

const FLYING_MARKERS = [
  "aérien",
  "bat",
  "drone",
  "floating",
  "manta",
  "moth",
  "plane",
  "planeur",
  "skygull",
  "volant",
  "wing",
  "wyvern",
];

const AQUATIC_MARKERS = [
  "abyss*",
  "aquatique",
  "eel",
  "leviathan",
  "marin",
  "nage*",
  "octopus",
  "skimmer",
  "swimmer",
];

const BURROWING_MARKERS = [
  "bore",
  "burrow",
  "burrower",
  "fouiss*",
  "sous la vase",
  "sous les dunes",
  "souterrain",
];

const RANGED_MARKERS = [
  "acide",
  "bile",
  "dard*",
  "électri*",
  "fusil",
  "grenade*",
  "grille laser",
  "harpon*",
  "plasma",
  "projectile*",
  "projette*",
  "rafale*",
  "rayon*",
  "tire*",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesMarker(value: string, markers: readonly string[]): boolean {
  return markers.some((marker) => {
    const prefix = marker.endsWith("*");
    const literal = prefix ? marker.slice(0, -1) : marker;
    const suffix = prefix ? "[\\p{L}\\p{N}]*" : "";
    return new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(literal)}${suffix}(?=$|[^\\p{L}\\p{N}])`,
      "u",
    ).test(value);
  });
}

function runtimeProfile(
  enemy: EcologyV8EnemyDefinition,
  kind: EcologyV8RuntimeKind,
  width: number,
  height: number,
  animationFps: number,
  mobility: EcologyV8Mobility,
  attackStyle: EcologyV8AttackStyle,
): EcologyV8RuntimeProfile {
  return {
    kind,
    mobility,
    attackStyle,
    width,
    height,
    animationFps,
    healthScale: 0.75 + enemy.threat * 0.12,
    damageScale: 0.78 + enemy.threat * 0.08,
    speedScale:
      mobility === "stationary"
        ? 0
        : mobility === "flying"
          ? 1.12
          : mobility === "burrowing"
            ? 1.04
            : 0.9 + enemy.threat * 0.04,
  };
}

/**
 * Converts ecological identity into the three AI families already understood
 * by the side-scroller. This keeps visuals/content independent from combat AI.
 */
export function ecologyV8RuntimeProfile(
  enemy: EcologyV8EnemyDefinition,
): EcologyV8RuntimeProfile {
  const semantic =
    `${enemy.id} ${enemy.name} ${enemy.role} ${enemy.behavior}`.toLocaleLowerCase(
      "fr",
    );
  const ranged = includesMarker(semantic, RANGED_MARKERS);
  if (enemy.category === "bad-blood") {
    return runtimeProfile(
      enemy,
      "yautja",
      72 + enemy.threat * 3,
      104 + enemy.threat * 4,
      6 + enemy.threat,
      "ground",
      ranged ? "ranged" : "melee",
    );
  }
  if (enemy.category === "humanoid") {
    return runtimeProfile(
      enemy,
      "human",
      62 + enemy.threat * 2,
      88 + enemy.threat * 3,
      6 + enemy.threat,
      "ground",
      "ranged",
    );
  }
  if (enemy.category === "other" && enemy.id.includes("xeno")) {
    const mobility = includesMarker(semantic, AQUATIC_MARKERS)
      ? "flying"
      : includesMarker(semantic, BURROWING_MARKERS)
        ? "burrowing"
        : "ground";
    return runtimeProfile(
      enemy,
      "beast",
      82 + enemy.threat * 8,
      68 + enemy.threat * 7,
      6 + enemy.threat,
      mobility,
      "melee",
    );
  }
  if (
    enemy.category === "other" &&
    includesMarker(enemy.id, MACHINE_MARKERS)
  ) {
    return runtimeProfile(
      enemy,
      "human",
      70 + enemy.threat * 6,
      86 + enemy.threat * 7,
      5 + enemy.threat,
      enemy.id.includes("drone") || enemy.id.includes("swarm")
        ? "flying"
        : "ground",
      "ranged",
    );
  }
  if (enemy.category === "flora") {
    const mobile = includesMarker(semantic, ["marche", "mobile", "walking"]);
    return runtimeProfile(
      enemy,
      "beast",
      78 + enemy.threat * 10,
      70 + enemy.threat * 10,
      4 + enemy.threat,
      mobile ? "ground" : "stationary",
      ranged ? "ranged" : "melee",
    );
  }
  const mobility = includesMarker(semantic, BURROWING_MARKERS)
    ? "burrowing"
    : includesMarker(semantic, FLYING_MARKERS) ||
        includesMarker(semantic, AQUATIC_MARKERS)
      ? "flying"
      : "ground";
  return runtimeProfile(
    enemy,
    "beast",
    82 + enemy.threat * 8,
    68 + enemy.threat * 7,
    6 + enemy.threat,
    mobility,
    ranged ? "ranged" : "melee",
  );
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: readonly T[], seed: string): T[] {
  const random = seededRandom(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const start = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

const COMMON_SLOTS = new Set([3, 7, 11, 16, 21, 27]);

/**
 * Builds the ordinary encounter deck for one hunt. Expansion bosses remain
 * part of their planet's 30-species ecology, but are reserved for the boss
 * arena instead of appearing early as disposable minions.
 */
export function createEcologyEncounterDeck(
  missionId: EcologyV8MissionId,
  runSeed: string | number,
  plannedSpawnCount = 12,
): readonly EcologyV8EnemyDefinition[] {
  const planet = ECOLOGY_V8_PLANETS.find(
    (candidate) => candidate.missionId === missionId,
  );
  if (!planet) return [];

  const reservedBossId = ECOLOGY_V8_BOSS_ENEMY_IDS[missionId] ?? null;

  const runIndex =
    typeof runSeed === "number" && Number.isFinite(runSeed)
      ? Math.max(0, Math.floor(runSeed))
      : null;
  const endemicPool = shuffle(
    planet.endemicEnemyIds
      .filter((id) => id !== reservedBossId)
      .map((id) => ecologyV8EnemyForId(id))
      .filter(Boolean),
    runIndex === null
      ? `${missionId}:${runSeed}:endemic`
      : `${missionId}:persistent-endemic-order`,
  ) as EcologyV8EnemyDefinition[];
  const commonPool = shuffle(
    planet.commonEnemyIds.map((id) => ecologyV8EnemyForId(id)).filter(Boolean),
    runIndex === null
      ? `${missionId}:${runSeed}:common`
      : `${missionId}:persistent-common-order`,
  ) as EcologyV8EnemyDefinition[];
  const visibleSlots = Math.min(
    endemicPool.length + commonPool.length,
    Math.max(1, Math.floor(plannedSpawnCount)),
  );
  const visibleCommonCount = [...COMMON_SLOTS].filter(
    (slot) => slot < visibleSlots,
  ).length;
  const visibleEndemicCount = visibleSlots - visibleCommonCount;
  const endemics =
    runIndex === null
      ? endemicPool
      : rotate(endemicPool, runIndex * Math.max(1, visibleEndemicCount));
  const common =
    runIndex === null
      ? commonPool
      : rotate(commonPool, runIndex * Math.max(1, visibleCommonCount));

  let endemicIndex = 0;
  let commonIndex = 0;
  return Array.from(
    { length: endemics.length + common.length },
    (_, index) => {
      if (COMMON_SLOTS.has(index)) return common[commonIndex++];
      return endemics[endemicIndex++];
    },
  );
}

export function ecologyEncounterEnemyAt(
  deck: readonly EcologyV8EnemyDefinition[],
  spawnIndex: number,
): EcologyV8EnemyDefinition | null {
  if (deck.length === 0) return null;
  return deck[((spawnIndex % deck.length) + deck.length) % deck.length] ?? null;
}
