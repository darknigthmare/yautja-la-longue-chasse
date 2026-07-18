"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ARMOR_BY_ID,
  DIFFICULTY_BY_ID,
  WEAPON_BY_ID,
} from "./data";
import type {
  DifficultyId,
  HunterAppearance,
  HonorEvent,
  Loadout,
  MissionDefinition,
  MissionResult,
  TrophyClaim,
  TrophyQuality,
  WeaponId,
} from "./types";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

interface HuntCanvasProps {
  mission: MissionDefinition;
  loadout: Loadout;
  difficulty: DifficultyId;
  appearance: HunterAppearance;
  reducedGore: boolean;
  screenShake: boolean;
  onFinish(result: MissionResult): void;
  onAbort(): void;
}

// ---------------------------------------------------------------------------
// Runtime model
// ---------------------------------------------------------------------------

type Action =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "melee"
  | "weapon"
  | "aim"
  | "mask"
  | "scan"
  | "cloak"
  | "heal"
  | "interact"
  | "pause";

type HuntPhase =
  | "tracking"
  | "target"
  | "trophy"
  | "extraction"
  | "dead"
  | "finished";

type EnemyKind = "human" | "beast" | "yautja";

interface Vec2 {
  x: number;
  y: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClimbZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "tree" | "vine";
}

interface PlayerState extends Vec2 {
  previousY: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  facing: -1 | 1;
  grounded: boolean;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  energy: number;
  maxEnergy: number;
  medicomps: number;
  ammo: number;
  cloaked: boolean;
  maskOn: boolean;
  aiming: boolean;
  aimAngle: number;
  aimPoint: Vec2;
  climbing: boolean;
  climbZoneId: string | null;
  gauntletOpen: number;
  bladeExtension: number;
  dreadAngles: number[];
  dreadVelocities: number[];
  attackFlash: number;
  invulnerability: number;
  meleeCooldown: number;
  weaponCooldown: number;
  scanCooldown: number;
  healCooldown: number;
}

interface EnemyState extends Vec2 {
  id: string;
  kind: EnemyKind;
  archetype: string;
  width: number;
  height: number;
  velocityX: number;
  facing: -1 | 1;
  health: number;
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  patrolLeft: number;
  patrolRight: number;
  attackCooldown: number;
  telegraph: number;
  hitFlash: number;
  scanned: boolean;
  alive: boolean;
  boss: boolean;
  active: boolean;
}

interface ProjectileState extends Vec2 {
  id: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  hostile: boolean;
  color: string;
  life: number;
  source: "melee" | "weapon" | "enemy" | "boss";
  weaponId: WeaponId | null;
}

interface GoreParticle extends Vec2 {
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

interface ScanNode extends Vec2 {
  id: string;
  scanned: boolean;
}

interface RecoveryNode extends Vec2 {
  id: string;
  recovered: boolean;
}

interface AssetBank {
  background: HTMLImageElement | null;
  farLake: HTMLImageElement | null;
  hunterBody: HTMLImageElement | null;
  hunterDreads: HTMLImageElement | null;
  hunterMask: HTMLImageElement | null;
  hunterArmor: HTMLImageElement | null;
  plasmaCaster: HTMLImageElement | null;
  gauntletClosed: HTMLImageElement | null;
  gauntletOpen: HTMLImageElement | null;
  wristbladesRetracted: HTMLImageElement | null;
  wristbladesExtended: HTMLImageElement | null;
  trophy: HTMLImageElement | null;
  treeTrunk: HTMLImageElement | null;
  vineLadder: HTMLImageElement | null;
  platformRoot: HTMLImageElement | null;
  platformStone: HTMLImageElement | null;
  platformCrown: HTMLImageElement | null;
  platformExpedition: HTMLImageElement | null;
  foregroundFerns: HTMLImageElement | null;
  foregroundVines: HTMLImageElement | null;
  foregroundReeds: HTMLImageElement | null;
  mercenary: HTMLImageElement | null;
  cryostalker: HTMLImageElement | null;
  badBlood: HTMLImageElement | null;
}

interface InputHub {
  keyboardHeld: Set<Action>;
  touchHeld: Set<Action>;
  gamepadHeld: Set<Action>;
  pressed: Set<Action>;
  previousGamepadButtons: boolean[];
  pointerScreen: Vec2 | null;
}

interface GameState {
  phase: HuntPhase;
  paused: boolean;
  elapsed: number;
  cameraX: number;
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  goreParticles: GoreParticle[];
  scanNodes: ScanNode[];
  recoveryNodes: RecoveryNode[];
  spawnedWaves: Set<string>;
  completedObjectives: Set<string>;
  honorEvents: HonorEvent[];
  honor: number;
  kills: number;
  scans: number;
  supportKills: number;
  damageTaken: number;
  secondWindUsed: boolean;
  boss: EnemyState;
  bossDefeatedAt: number | null;
  trophyClaimedAt: number | null;
  trophyQuality: TrophyQuality | null;
  trophyClaim: TrophyClaim | null;
  trophyExtracting: boolean;
  trophyExtraction: number;
  trophyCarried: boolean;
  scanPulse: number;
  message: string;
  messageTimer: number;
  screenShake: number;
  rangedBossViolation: boolean;
  failureReported: boolean;
  nextProjectileId: number;
  reducedGore: boolean;
  screenShakeEnabled: boolean;
}

interface UiSnapshot {
  phase: HuntPhase;
  paused: boolean;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  energy: number;
  maxEnergy: number;
  medicomps: number;
  ammo: number;
  cloaked: boolean;
  maskOn: boolean;
  aiming: boolean;
  climbing: boolean;
  trophyExtraction: number;
  objective: string;
  objectiveDetail: string;
  honor: number;
  kills: number;
  scans: number;
  bossName: string;
  bossHealth: number;
  bossMaxHealth: number;
  bossPhase: string;
  message: string;
  trophySeconds: number | null;
  elapsed: number;
}

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 5_600;
const FLOOR_Y = 624;
const GRAVITY = 1_850;
const EXTRACTION_X = WORLD_WIDTH - 250;
const BOSS_X = 4_500;

const PLATFORMS: readonly Platform[] = [
  { x: 420, y: 515, width: 270, height: 24 },
  { x: 810, y: 430, width: 235, height: 24 },
  { x: 1_210, y: 505, width: 330, height: 24 },
  { x: 1_690, y: 390, width: 250, height: 24 },
  { x: 2_080, y: 500, width: 290, height: 24 },
  { x: 2_520, y: 418, width: 260, height: 24 },
  { x: 2_930, y: 520, width: 310, height: 24 },
  { x: 3_390, y: 405, width: 245, height: 24 },
  { x: 3_770, y: 510, width: 250, height: 24 },
  { x: 4_170, y: 425, width: 260, height: 24 },
  { x: 4_720, y: 510, width: 285, height: 24 },
  { x: 5_100, y: 420, width: 230, height: 24 },
] as const;

const JUNGLE_CLIMB_ZONES: readonly ClimbZone[] = [
  { id: "tree-west", x: 770, y: 250, width: 128, height: 374, kind: "tree" },
  { id: "vine-west", x: 1_775, y: 170, width: 72, height: 244, kind: "vine" },
  { id: "tree-center", x: 2_430, y: 205, width: 134, height: 419, kind: "tree" },
  { id: "vine-east", x: 3_470, y: 150, width: 74, height: 260, kind: "vine" },
  { id: "tree-east", x: 4_080, y: 215, width: 132, height: 409, kind: "tree" },
] as const;

const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: "left",
  KeyA: "left",
  KeyQ: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  KeyZ: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyJ: "melee",
  KeyK: "weapon",
  ShiftLeft: "aim",
  ShiftRight: "aim",
  KeyM: "mask",
  KeyV: "scan",
  KeyC: "cloak",
  KeyH: "heal",
  KeyE: "interact",
  Escape: "pause",
};

const EMPTY_UI: UiSnapshot = {
  phase: "tracking",
  paused: false,
  health: 1,
  maxHealth: 1,
  stamina: 1,
  maxStamina: 1,
  energy: 1,
  maxEnergy: 1,
  medicomps: 0,
  ammo: -1,
  cloaked: false,
  maskOn: true,
  aiming: false,
  climbing: false,
  trophyExtraction: 0,
  objective: "Initialisation de la chasse",
  objectiveDetail: "Synchronisation du biomask…",
  honor: 0,
  kills: 0,
  scans: 0,
  bossName: "",
  bossHealth: 0,
  bossMaxHealth: 1,
  bossPhase: "",
  message: "",
  trophySeconds: null,
  elapsed: 0,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function isHeld(input: InputHub, action: Action): boolean {
  return (
    input.keyboardHeld.has(action) ||
    input.touchHeld.has(action) ||
    input.gamepadHeld.has(action)
  );
}

function consume(input: InputHub, action: Action): boolean {
  if (!input.pressed.has(action)) return false;
  input.pressed.delete(action);
  return true;
}

function enemyKind(archetype: string): EnemyKind {
  if (
    archetype.includes("cryo") ||
    archetype.includes("hound") ||
    archetype.includes("beast")
  ) {
    return "beast";
  }
  if (archetype.includes("bad-blood") || archetype.includes("yautja")) {
    return "yautja";
  }
  return "human";
}

function backgroundPath(mission: MissionDefinition): string {
  return `/game/backgrounds/${
    mission.biome === "volcano" ? "volcanic" : mission.biome
  }.webp`;
}

function loadImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

function equippedWeapon(loadout: Loadout) {
  return WEAPON_BY_ID[loadout.weaponIds[1] ?? loadout.weaponIds[0]];
}

function dreadFilter(tint: HunterAppearance["dreadTintId"]): string {
  if (tint === "umber") return "sepia(0.72) saturate(0.9) brightness(0.85)";
  if (tint === "ashen") return "grayscale(0.78) brightness(1.12)";
  return "saturate(0.72) brightness(0.72)";
}

function bodyFilter(appearance: HunterAppearance): string {
  return appearance.skinId === "ashen-mottle"
    ? "grayscale(0.44) brightness(1.08)"
    : appearance.skinId === "dark-mottle"
      ? "brightness(0.72) saturate(0.9)"
      : "saturate(1.04)";
}

function armorFilter(appearance: HunterAppearance): string {
  return appearance.armorTintId === "bronze"
    ? "sepia(0.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)"
    : appearance.armorTintId === "obsidian"
      ? "saturate(0.68) brightness(0.58) contrast(1.2)"
      : "brightness(1)";
}

function bossSprite(
  mission: MissionDefinition,
  assets: AssetBank,
): HTMLImageElement | null {
  if (mission.biome === "ice") return assets.cryostalker;
  if (mission.biome === "volcano") return assets.badBlood;
  return assets.mercenary;
}

function objectiveByKind(
  mission: MissionDefinition,
  kind: "scan" | "hunt" | "recover" | "boss" | "extract",
) {
  return mission.objectives.find((objective) => objective.kind === kind);
}

function makeEnemy(
  id: string,
  archetype: string,
  x: number,
  health: number,
  damage: number,
  moveSpeed: number,
  healthMultiplier: number,
  damageMultiplier: number,
): EnemyState {
  const kind = enemyKind(archetype);
  const beast = kind === "beast";
  const yautja = kind === "yautja";
  return {
    id,
    archetype,
    kind,
    x,
    y: FLOOR_Y - (beast ? 84 : yautja ? 112 : 94),
    width: beast ? 104 : yautja ? 74 : 66,
    height: beast ? 84 : yautja ? 112 : 94,
    velocityX: 0,
    facing: -1,
    health: health * healthMultiplier,
    maxHealth: health * healthMultiplier,
    damage: damage * damageMultiplier,
    moveSpeed,
    patrolLeft: Math.max(120, x - 190),
    patrolRight: Math.min(WORLD_WIDTH - 120, x + 190),
    attackCooldown: 0.5 + Math.random(),
    telegraph: 0,
    hitFlash: 0,
    scanned: false,
    alive: true,
    boss: false,
    active: true,
  };
}

function makeGameState(
  mission: MissionDefinition,
  loadout: Loadout,
  difficulty: DifficultyId,
  appearance: HunterAppearance,
  reducedGore: boolean,
  screenShakeEnabled: boolean,
): GameState {
  const armor = ARMOR_BY_ID[loadout.armorId];
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  const weapon = equippedWeapon(loadout);
  const scanCount = Math.max(
    1,
    objectiveByKind(mission, "scan")?.targetCount ?? 3,
  );
  const recoverCount = objectiveByKind(mission, "recover")?.targetCount ?? 0;
  const scanNodes = Array.from({ length: scanCount }, (_, index) => ({
    id: `trace-${index + 1}`,
    x: 720 + index * 590,
    y: index % 2 === 0 ? FLOOR_Y - 36 : 395,
    scanned: false,
  }));
  const recoveryNodes = Array.from({ length: recoverCount }, (_, index) => ({
    id: `technology-${index + 1}`,
    x: 2_250 + index * 520,
    y: index % 2 === 0 ? FLOOR_Y - 34 : 380,
    recovered: false,
  }));
  const bossKind: EnemyKind =
    mission.boss.silhouette === "beast"
      ? "beast"
      : mission.boss.silhouette === "yautja"
        ? "yautja"
        : "human";
  const bossHeight = bossKind === "beast" ? 142 : 154;
  const bossWidth = bossKind === "beast" ? 168 : 106;

  const state: GameState = {
    phase: "tracking",
    paused: false,
    elapsed: 0,
    cameraX: 0,
    player: {
      x: 150,
      y: FLOOR_Y - 116,
      previousY: FLOOR_Y - 116,
      width: 72,
      height: 116,
      velocityX: 0,
      velocityY: 0,
      facing: 1,
      grounded: true,
      health: armor.maxHealth,
      maxHealth: armor.maxHealth,
      stamina: armor.maxStamina,
      maxStamina: armor.maxStamina,
      energy: armor.maxEnergy,
      maxEnergy: armor.maxEnergy,
      medicomps: Math.max(
        0,
        armor.medicompCharges + difficultyDef.medicompModifier,
      ),
      ammo: weapon.ammo ?? -1,
      cloaked: false,
      maskOn: appearance.biomaskId !== null,
      aiming: false,
      aimAngle: 0,
      aimPoint: { x: 650, y: FLOOR_Y - 90 },
      climbing: false,
      climbZoneId: null,
      gauntletOpen: 0,
      bladeExtension: 0,
      dreadAngles: [0, 0, 0, 0, 0],
      dreadVelocities: [0, 0, 0, 0, 0],
      attackFlash: 0,
      invulnerability: 0,
      meleeCooldown: 0,
      weaponCooldown: 0,
      scanCooldown: 0,
      healCooldown: 0,
    },
    enemies: [],
    projectiles: [],
    goreParticles: [],
    scanNodes,
    recoveryNodes,
    spawnedWaves: new Set(),
    completedObjectives: new Set(),
    honorEvents: [],
    honor: 0,
    kills: 0,
    scans: 0,
    supportKills: 0,
    damageTaken: 0,
    secondWindUsed: false,
    boss: {
      id: "mission-boss",
      archetype: `boss-${mission.id}`,
      kind: bossKind,
      x: BOSS_X,
      y: FLOOR_Y - bossHeight,
      width: bossWidth,
      height: bossHeight,
      velocityX: 0,
      facing: -1,
      health:
        mission.boss.maxHealth * difficultyDef.enemyHealthMultiplier,
      maxHealth:
        mission.boss.maxHealth * difficultyDef.enemyHealthMultiplier,
      damage: 0,
      moveSpeed: mission.boss.moveSpeed,
      patrolLeft: 4_150,
      patrolRight: 5_050,
      attackCooldown: 1.5,
      telegraph: 0,
      hitFlash: 0,
      scanned: false,
      alive: true,
      boss: true,
      active: false,
    },
    bossDefeatedAt: null,
    trophyClaimedAt: null,
    trophyQuality: null,
    trophyClaim: null,
    trophyExtracting: false,
    trophyExtraction: 0,
    trophyCarried: false,
    scanPulse: 0,
    message: "La chasse commence. Localise les signatures.",
    messageTimer: 4,
    screenShake: 0,
    rangedBossViolation: false,
    failureReported: false,
    nextProjectileId: 1,
    reducedGore,
    screenShakeEnabled,
  };

  spawnEligibleWaves(state, mission, difficulty, "start", null);
  return state;
}

function spawnEligibleWaves(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  trigger: "start" | "objective" | "boss-phase",
  triggerId: string | null,
): void {
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  for (const wave of mission.enemyWaves) {
    if (
      wave.trigger !== trigger ||
      wave.triggerId !== triggerId ||
      state.spawnedWaves.has(wave.id)
    ) {
      continue;
    }
    state.spawnedWaves.add(wave.id);
    for (let index = 0; index < wave.count; index += 1) {
      const base =
        trigger === "start"
          ? 950
          : trigger === "boss-phase"
            ? 4_250
            : 2_100;
      const spread = trigger === "boss-phase" ? 620 : 1_550;
      const x =
        base +
        ((index + state.enemies.length * 0.61) %
          Math.max(1, wave.count)) *
          (spread / Math.max(1, wave.count)) +
        Math.random() * 120;
      state.enemies.push(
        makeEnemy(
          `${wave.id}-${index}`,
          wave.archetype,
          x,
          wave.health,
          wave.damage,
          wave.moveSpeed,
          difficultyDef.enemyHealthMultiplier,
          difficultyDef.enemyDamageMultiplier,
        ),
      );
    }
  }
}

function addHonor(
  state: GameState,
  id: string,
  label: string,
  value: number,
  kind: HonorEvent["kind"],
): void {
  if (state.honorEvents.some((event) => event.id === id)) return;
  state.honorEvents.push({ id, label, value, kind });
  state.honor += value;
}

function announce(state: GameState, message: string, seconds = 3): void {
  state.message = message;
  state.messageTimer = seconds;
}

function completeObjective(
  state: GameState,
  mission: MissionDefinition,
  objectiveId: string | undefined,
): void {
  if (!objectiveId || state.completedObjectives.has(objectiveId)) return;
  const objective = mission.objectives.find((entry) => entry.id === objectiveId);
  state.completedObjectives.add(objectiveId);
  if (objective) {
    addHonor(
      state,
      `objective-${objective.id}`,
      objective.label,
      objective.honorBonus,
      "objective",
    );
    announce(state, `Objectif accompli : ${objective.label}`, 4);
  }
}

function activeBossPhase(
  mission: MissionDefinition,
  boss: EnemyState,
): MissionDefinition["boss"]["phases"][number] | undefined {
  const ratio = boss.maxHealth > 0 ? boss.health / boss.maxHealth : 0;
  return [...mission.boss.phases]
    .sort((a, b) => a.startsAtHealthRatio - b.startsAtHealthRatio)
    .find((phase) => ratio <= phase.startsAtHealthRatio);
}

function currentObjective(
  state: GameState,
  mission: MissionDefinition,
): { title: string; detail: string } {
  const scanObjective = objectiveByKind(mission, "scan");
  const huntObjective = objectiveByKind(mission, "hunt");
  const recoverObjective = objectiveByKind(mission, "recover");
  const bossObjective = objectiveByKind(mission, "boss");
  const extractObjective = objectiveByKind(mission, "extract");

  if (state.phase === "dead") {
    return {
      title: "Chasseur à terre",
      detail: "Réessaie le rite ou transmets un rapport d’échec.",
    };
  }
  if (state.phase === "finished") {
    return {
      title: "Chasse terminée",
      detail: "Le vaisseau récupère le chasseur et son trophée.",
    };
  }
  if (state.phase === "tracking") {
    const done = state.scanNodes.filter((node) => node.scanned).length;
    return {
      title: scanObjective?.label ?? "Analyser la zone",
      detail: `${done}/${state.scanNodes.length} signature${
        state.scanNodes.length > 1 ? "s" : ""
      } — approche puis utilise le scan [V].`,
    };
  }
  if (state.phase === "target") {
    if (
      recoverObjective &&
      !state.completedObjectives.has(recoverObjective.id)
    ) {
      const done = state.recoveryNodes.filter(
        (node) => node.recovered,
      ).length;
      return {
        title: recoverObjective.label,
        detail: `${done}/${state.recoveryNodes.length} — interaction [E] à proximité.`,
      };
    }
    if (huntObjective && !state.completedObjectives.has(huntObjective.id)) {
      return {
        title: huntObjective.label,
        detail: `${Math.min(state.supportKills, huntObjective.targetCount)}/${
          huntObjective.targetCount
        } adversaires éliminés.`,
      };
    }
    return {
      title: bossObjective?.label ?? `Traquer ${mission.targetName}`,
      detail: state.boss.active
        ? `${mission.boss.title} — observe les signaux d’attaque.`
        : "Franchis la porte de l’arène pour provoquer la cible.",
    };
  }
  if (state.phase === "trophy") {
    return {
      title: `Réclamer : ${mission.trophy.name}`,
      detail: state.trophyExtracting
        ? `Extraction en cours : ${Math.round(state.trophyExtraction * 100)} % — reste immobile.`
        : "Approche la dépouille, utilise [E], puis reste immobile 1,4 s.",
    };
  }
  return {
    title: extractObjective?.label ?? "Rejoindre l’extraction",
    detail: "Atteins la balise à l’est et confirme avec [E].",
  };
}

function snapshot(state: GameState, mission: MissionDefinition): UiSnapshot {
  const objective = currentObjective(state, mission);
  const bossPhase = activeBossPhase(mission, state.boss);
  const trophySeconds =
    state.phase === "trophy" && state.bossDefeatedAt !== null
      ? Math.max(
          0,
          mission.boss.trophyWindowSeconds -
            (state.elapsed - state.bossDefeatedAt),
        )
      : null;
  return {
    phase: state.phase,
    paused: state.paused,
    health: Math.max(0, state.player.health),
    maxHealth: state.player.maxHealth,
    stamina: state.player.stamina,
    maxStamina: state.player.maxStamina,
    energy: state.player.energy,
    maxEnergy: state.player.maxEnergy,
    medicomps: state.player.medicomps,
    ammo: state.player.ammo,
    cloaked: state.player.cloaked,
    maskOn: state.player.maskOn,
    aiming: state.player.aiming,
    climbing: state.player.climbing,
    trophyExtraction: state.trophyExtraction,
    objective: objective.title,
    objectiveDetail: objective.detail,
    honor: state.honor,
    kills: state.kills,
    scans: state.scans,
    bossName: state.boss.active ? mission.boss.name : "",
    bossHealth: Math.max(0, state.boss.health),
    bossMaxHealth: state.boss.maxHealth,
    bossPhase: bossPhase?.label ?? "",
    message: state.messageTimer > 0 ? state.message : "",
    trophySeconds,
    elapsed: state.elapsed,
  };
}

function resultFor(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  outcome: MissionResult["outcome"],
): MissionResult {
  const timeRatio = clamp(mission.parTimeSeconds / Math.max(1, state.elapsed), 0, 1);
  const healthRatio = clamp(state.player.health / state.player.maxHealth, 0, 1);
  const objectiveRatio =
    state.completedObjectives.size / Math.max(1, mission.objectives.length);
  const honorRatio = clamp(
    (state.honor + mission.baseRewards.honor * 0.4) /
      Math.max(1, mission.baseRewards.honor * 1.4),
    0,
    1,
  );
  const score =
    outcome === "success"
      ? Math.round(
          clamp(
            objectiveRatio * 45 +
              healthRatio * 20 +
              timeRatio * 15 +
              honorRatio * 20,
            0,
            100,
          ),
        )
      : Math.round(clamp(objectiveRatio * 35 + honorRatio * 15, 0, 49));

  return {
    missionId: mission.id,
    difficultyId: difficulty,
    outcome,
    score,
    elapsedSeconds: Math.round(state.elapsed),
    completedObjectiveIds: [...state.completedObjectives],
    honorEvents: [...state.honorEvents],
    trophyQuality: outcome === "success" ? state.trophyQuality : null,
    trophyClaims:
      outcome === "success" && state.trophyClaim ? [state.trophyClaim] : [],
    kills: state.kills,
    scans: state.scans,
    secondWindUsed: state.secondWindUsed,
    completedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

function roundedPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 1.5;
    context.stroke();
  }
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  facing: -1 | 1,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  if (facing < 0) {
    context.translate(x + width, y);
    context.scale(-1, 1);
    if (image) context.drawImage(image, 0, 0, width, height);
  } else if (image) {
    context.drawImage(image, x, y, width, height);
  }
  context.restore();
}

function drawFallbackCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  facing: -1 | 1,
): void {
  context.save();
  context.translate(x + width / 2, y);
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(-width * 0.28, height * 0.2, width * 0.56, height * 0.68, 12);
  context.fill();
  context.beginPath();
  context.arc(0, height * 0.14, width * 0.24, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = Math.max(5, width * 0.1);
  context.beginPath();
  context.moveTo(facing * width * 0.15, height * 0.45);
  context.lineTo(facing * width * 0.48, height * 0.58);
  context.stroke();
  context.restore();
}

function drawDreadSlices(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  player: PlayerState,
  tint: HunterAppearance["dreadTintId"],
): void {
  const slices = player.dreadAngles.length;
  const sourceWidth = image.naturalWidth / slices;
  const destinationWidth = 67;
  const destinationHeight = 94;
  const sliceWidth = destinationWidth / slices;
  context.save();
  context.filter = dreadFilter(tint);
  for (let index = 0; index < slices; index += 1) {
    const sourceX = sourceWidth * index;
    const localX = -31 + sliceWidth * index;
    const pivotY = 8 + index * 1.2;
    context.save();
    context.translate(localX + sliceWidth / 2, pivotY);
    context.rotate(player.dreadAngles[index] ?? 0);
    context.drawImage(
      image,
      sourceX,
      0,
      sourceWidth + 1,
      image.naturalHeight,
      -sliceWidth / 2,
      -pivotY,
      sliceWidth + 1,
      destinationHeight,
    );
    context.restore();
  }
  context.restore();
}

function drawHunterLayered(
  context: CanvasRenderingContext2D,
  state: GameState,
  loadout: Loadout,
  appearance: HunterAppearance,
  assets: AssetBank,
  alpha: number,
): void {
  const player = state.player;
  const hasPlasmaCaster = loadout.weaponIds.includes("plasma-caster");
  const hasWristblades = loadout.weaponIds.includes("wristblades");
  const bodyWidth = 84;
  const bodyHeight = 122;

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    player.x + player.width / 2,
    player.y + player.height / 2,
  );
  context.scale(player.facing, 1);
  context.translate(0, -player.height / 2);

  // Les dreadlocks et les trophées sont derrière le corps, puis chaque pièce
  // d'équipement est dessinée indépendamment pour pouvoir l'animer.
  if (assets.hunterDreads) {
    drawDreadSlices(
      context,
      assets.hunterDreads,
      player,
      appearance.dreadTintId,
    );
  }
  if (
    assets.trophy &&
    (state.trophyCarried || appearance.trophyAdornmentId === "skull-spine")
  ) {
    context.save();
    context.rotate(-0.08);
    context.drawImage(
      assets.trophy,
      -43,
      state.trophyCarried ? 46 : 67,
      state.trophyCarried ? 34 : 22,
      state.trophyCarried ? 60 : 39,
    );
    context.restore();
  }

  if (assets.hunterBody) {
    context.save();
    context.filter = bodyFilter(appearance);
    context.drawImage(
      assets.hunterBody,
      -bodyWidth / 2,
      -4,
      bodyWidth,
      bodyHeight,
    );
    context.restore();
  } else {
    drawFallbackCharacter(
      context,
      -player.width / 2,
      0,
      player.width,
      player.height,
      "#8fd3ac",
      1,
    );
  }

  if (assets.hunterArmor) {
    context.save();
    context.filter = armorFilter(appearance);
    context.drawImage(
      assets.hunterArmor,
      -bodyWidth / 2,
      -4,
      bodyWidth,
      bodyHeight,
    );
    context.restore();
  }

  if (hasPlasmaCaster && assets.plasmaCaster) {
    const localAim =
      player.facing > 0 ? player.aimAngle : Math.PI - player.aimAngle;
    context.save();
    context.translate(24, 23);
    context.rotate(clamp(localAim, -0.72, 0.58) * (player.aiming ? 0.48 : 0.08));
    context.drawImage(assets.plasmaCaster, -8, -17, 32, 48);
    context.restore();
  }

  if (player.maskOn && appearance.biomaskId && assets.hunterMask) {
    context.drawImage(assets.hunterMask, 15, 1, 30, 54);
  }

  const gauntletOpen = clamp(player.gauntletOpen, 0, 1);
  if (assets.gauntletClosed && gauntletOpen < 1) {
    context.save();
    context.globalAlpha *= 1 - gauntletOpen;
    context.drawImage(assets.gauntletClosed, 19, 57, 39, 30);
    context.restore();
  }
  if (assets.gauntletOpen && gauntletOpen > 0) {
    context.save();
    context.globalAlpha *= gauntletOpen;
    context.drawImage(assets.gauntletOpen, 18, 53, 41, 34);
    context.restore();
  }

  if (hasWristblades) {
    const extension = clamp(player.bladeExtension, 0, 1);
    if (assets.wristbladesRetracted && extension < 1) {
      context.save();
      context.globalAlpha *= 1 - extension;
      context.drawImage(assets.wristbladesRetracted, 21, 57, 40, 31);
      context.restore();
    }
    if (assets.wristbladesExtended && extension > 0) {
      context.save();
      context.globalAlpha *= extension;
      context.drawImage(assets.wristbladesExtended, 21, 51, 58, 47);
      context.restore();
    }
  }
  context.restore();
}

function drawAimAssist(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  appearance: HunterAppearance,
): void {
  const player = state.player;
  if (!player.aiming) return;
  const target = player.aimPoint;
  const origin = {
    x: player.x + player.width / 2 + player.facing * 23,
    y: player.y + 31,
  };
  const color = mission.palette.accent;
  context.save();
  if (player.maskOn && appearance.biomaskId) {
    context.strokeStyle = `${color}c8`;
    context.lineWidth = 1.25;
    context.globalAlpha = 0.76;
    for (const offset of [-7, 0, 7]) {
      context.beginPath();
      context.moveTo(origin.x, origin.y + offset * 0.32);
      context.lineTo(target.x + offset, target.y + offset * 0.3);
      context.stroke();
    }
  }
  context.globalAlpha = 0.95;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(target.x, target.y, 18, 0, Math.PI * 2);
  context.moveTo(target.x - 29, target.y);
  context.lineTo(target.x - 9, target.y);
  context.moveTo(target.x + 9, target.y);
  context.lineTo(target.x + 29, target.y);
  context.moveTo(target.x, target.y - 29);
  context.lineTo(target.x, target.y - 9);
  context.moveTo(target.x, target.y + 9);
  context.lineTo(target.x, target.y + 29);
  context.stroke();
  context.restore();
}

function drawJunglePlatform(
  context: CanvasRenderingContext2D,
  platform: Platform,
  image: HTMLImageElement | null,
): void {
  if (!image) return;
  const visualHeight = clamp(platform.width * 0.48, 82, 148);
  context.drawImage(
    image,
    platform.x - 12,
    platform.y - visualHeight * 0.43,
    platform.width + 24,
    visualHeight,
  );
}

function renderGame(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  appearance: HunterAppearance,
  assets: AssetBank,
  deviceScale: number,
): void {
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const shakeX =
    state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;
  const cameraX = state.cameraX + shakeX;
  const palette = mission.palette;

  // Background and parallax atmosphere.
  const sky = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, palette.sky);
  sky.addColorStop(0.68, palette.haze);
  sky.addColorStop(1, palette.ground);
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (assets.background) {
    const image = assets.background;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const drawHeight = VIEW_HEIGHT;
    const drawWidth = Math.max(VIEW_WIDTH, drawHeight * sourceRatio);
    const offset = -((cameraX * 0.16) % drawWidth);
    context.save();
    context.globalAlpha = 0.78;
    for (let x = offset - drawWidth; x < VIEW_WIDTH + drawWidth; x += drawWidth) {
      context.drawImage(image, x, 0, drawWidth, drawHeight);
    }
    context.restore();
    context.fillStyle = `${palette.sky}55`;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  if (mission.biome === "jungle" && assets.farLake) {
    const lake = assets.farLake;
    const lakeHeight = 560;
    const lakeWidth = lakeHeight * (lake.naturalWidth / lake.naturalHeight);
    const lakeOffset = -((cameraX * 0.07) % lakeWidth);
    context.save();
    context.globalAlpha = 0.86;
    for (
      let x = lakeOffset - lakeWidth;
      x < VIEW_WIDTH + lakeWidth;
      x += lakeWidth
    ) {
      context.drawImage(lake, x, 128, lakeWidth, lakeHeight);
    }
    context.restore();
  }

  context.save();
  context.translate(-cameraX, 0);

  // World geometry and mission markers.
  context.fillStyle = palette.ground;
  context.fillRect(0, FLOOR_Y, WORLD_WIDTH, VIEW_HEIGHT - FLOOR_Y);
  context.fillStyle = `${palette.accent}22`;
  for (let x = 0; x < WORLD_WIDTH; x += 160) {
    context.fillRect(x, FLOOR_Y + 6, 84, 3);
  }
  if (mission.biome === "jungle") {
    for (const zone of JUNGLE_CLIMB_ZONES) {
      const image =
        zone.kind === "tree" ? assets.treeTrunk : assets.vineLadder;
      if (!image) continue;
      const drawWidth = zone.kind === "tree" ? zone.width + 74 : zone.width;
      context.save();
      context.globalAlpha = zone.kind === "tree" ? 0.97 : 0.9;
      context.drawImage(
        image,
        zone.x - (drawWidth - zone.width) / 2,
        zone.y,
        drawWidth,
        zone.height,
      );
      context.restore();
    }
  }
  const junglePlatformImages = [
    assets.platformRoot,
    assets.platformStone,
    assets.platformCrown,
    assets.platformExpedition,
  ] as const;
  for (let index = 0; index < PLATFORMS.length; index += 1) {
    const platform = PLATFORMS[index];
    if (mission.biome === "jungle") {
      drawJunglePlatform(
        context,
        platform,
        junglePlatformImages[index % junglePlatformImages.length],
      );
    } else {
      roundedPanel(
        context,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        6,
        palette.platform,
        `${palette.accent}55`,
      );
      context.fillStyle = `${palette.haze}aa`;
      context.fillRect(
        platform.x + 18,
        platform.y + platform.height,
        platform.width - 36,
        8,
      );
    }
  }

  if (state.phase === "tracking" || state.phase === "target") {
    for (const node of state.scanNodes) {
      if (node.scanned) continue;
      const pulse = 0.55 + Math.sin(state.elapsed * 4 + node.x) * 0.25;
      context.save();
      context.globalAlpha = pulse;
      context.strokeStyle = palette.accent;
      context.lineWidth = 2;
      context.setLineDash([5, 7]);
      context.beginPath();
      context.arc(node.x, node.y, 24, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.restore();
    }
  }

  for (const node of state.recoveryNodes) {
    if (node.recovered) continue;
    context.save();
    context.translate(node.x, node.y);
    context.rotate(state.elapsed * 0.35);
    context.fillStyle = palette.accent;
    context.fillRect(-13, -13, 26, 26);
    context.fillStyle = palette.sky;
    context.fillRect(-7, -7, 14, 14);
    context.restore();
  }

  if (!state.boss.active && state.phase !== "extraction") {
    context.save();
    context.globalAlpha = 0.75;
    context.fillStyle = `${palette.danger}66`;
    context.fillRect(4_035, 250, 18, FLOOR_Y - 250);
    context.strokeStyle = palette.danger;
    context.setLineDash([10, 10]);
    context.strokeRect(4_025, 240, 38, FLOOR_Y - 230);
    context.setLineDash([]);
    context.restore();
  }

  if (state.phase === "extraction") {
    const beam = context.createLinearGradient(
      EXTRACTION_X - 90,
      0,
      EXTRACTION_X + 90,
      0,
    );
    beam.addColorStop(0, `${palette.accent}00`);
    beam.addColorStop(0.5, `${palette.accent}77`);
    beam.addColorStop(1, `${palette.accent}00`);
    context.fillStyle = beam;
    context.fillRect(EXTRACTION_X - 90, 110, 180, FLOOR_Y - 110);
    context.strokeStyle = palette.accent;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(EXTRACTION_X, FLOOR_Y - 18, 54, Math.PI, Math.PI * 2);
    context.stroke();
  }

  if (
    state.bossDefeatedAt !== null &&
    (state.phase === "trophy" || state.phase === "extraction")
  ) {
    const corpseImage = bossSprite(mission, assets);
    if (corpseImage) {
      context.save();
      context.globalAlpha = state.phase === "trophy" ? 0.82 : 0.48;
      context.translate(
        state.boss.x + state.boss.width * 0.5,
        FLOOR_Y - state.boss.width * 0.22,
      );
      context.rotate(Math.PI * 0.47);
      context.drawImage(
        corpseImage,
        -state.boss.width * 0.5,
        -state.boss.height * 0.5,
        state.boss.width,
        state.boss.height,
      );
      context.restore();
    }
  }

  if (state.phase === "trophy" && state.bossDefeatedAt !== null) {
    const pulse = 0.7 + Math.sin(state.elapsed * 5) * 0.25;
    context.save();
    context.globalAlpha = pulse;
    context.strokeStyle = palette.accent;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(
      state.boss.x + state.boss.width / 2,
      FLOOR_Y - 52,
      38,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.fillStyle = palette.accent;
    context.font = "700 14px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(
      state.trophyExtracting
        ? `EXTRACTION ${Math.round(state.trophyExtraction * 100)} %`
        : "TROPHÉE [E]",
      state.boss.x + state.boss.width / 2,
      FLOOR_Y - 104,
    );
    context.restore();

    if (assets.trophy && state.trophyExtracting) {
      const eased =
        state.trophyExtraction *
        state.trophyExtraction *
        (3 - 2 * state.trophyExtraction);
      const startX = state.boss.x + state.boss.width * 0.52;
      const startY = FLOOR_Y - 66;
      const endX =
        state.player.x + state.player.width / 2 - state.player.facing * 18;
      const endY = state.player.y + 66;
      const trophyX = startX + (endX - startX) * eased;
      const trophyY =
        startY + (endY - startY) * eased - Math.sin(eased * Math.PI) * 54;
      context.save();
      context.translate(trophyX, trophyY);
      context.rotate((1 - eased) * 0.65 * state.player.facing);
      context.drawImage(assets.trophy, -14, -25, 28, 50);
      context.restore();
    }
  }

  // Enemies, boss and projectiles.
  const visibleEnemies = [
    ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ];
  for (const enemy of visibleEnemies) {
    const image = enemy.boss
      ? bossSprite(mission, assets)
      : enemy.kind === "beast"
        ? assets.cryostalker
        : enemy.kind === "yautja"
          ? assets.badBlood
          : assets.mercenary;
    const alpha = enemy.telegraph > 0 ? 0.72 + Math.sin(state.elapsed * 22) * 0.2 : 1;
    if (image) {
      drawSprite(
        context,
        image,
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height,
        enemy.facing,
        alpha,
      );
    } else {
      drawFallbackCharacter(
        context,
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height,
        enemy.boss ? mission.boss.color : palette.danger,
        enemy.facing,
      );
    }
    if (enemy.hitFlash > 0 || enemy.scanned) {
      context.strokeStyle =
        enemy.hitFlash > 0 ? "#ffffff" : `${palette.accent}cc`;
      context.lineWidth = enemy.boss ? 4 : 2;
      context.strokeRect(
        enemy.x - 4,
        enemy.y - 4,
        enemy.width + 8,
        enemy.height + 8,
      );
    }
    if (!enemy.boss && (enemy.scanned || enemy.health < enemy.maxHealth)) {
      context.fillStyle = "#090d0ccc";
      context.fillRect(enemy.x, enemy.y - 12, enemy.width, 5);
      context.fillStyle = palette.danger;
      context.fillRect(
        enemy.x,
        enemy.y - 12,
        enemy.width * clamp(enemy.health / enemy.maxHealth, 0, 1),
        5,
      );
    }
  }

  for (const projectile of state.projectiles) {
    context.save();
    context.shadowColor = projectile.color;
    context.shadowBlur = 14;
    context.fillStyle = projectile.color;
    context.beginPath();
    context.arc(
      projectile.x,
      projectile.y,
      projectile.radius,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  }
  for (const particle of state.goreParticles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = state.reducedGore ? 3 : 7;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Chasseur assemblé en couches indépendantes.
  const hunterAlpha = state.player.cloaked
    ? 0.24 + Math.sin(state.elapsed * 8) * 0.07
    : 1;
  drawHunterLayered(
    context,
    state,
    loadout,
    appearance,
    assets,
    hunterAlpha,
  );
  drawAimAssist(context, state, mission, appearance);
  if (state.player.attackFlash > 0) {
    const centerX =
      state.player.x +
      state.player.width / 2 +
      state.player.facing * 58;
    context.strokeStyle = "#e4fff5";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(
      centerX,
      state.player.y + 55,
      54,
      state.player.facing < 0 ? Math.PI * 0.55 : -Math.PI * 0.45,
      state.player.facing < 0 ? Math.PI * 1.45 : Math.PI * 0.45,
    );
    context.stroke();
  }

  if (state.scanPulse > 0) {
    const radius = (1 - state.scanPulse / 0.55) * 420;
    context.strokeStyle = `${palette.accent}cc`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(
      state.player.x + state.player.width / 2,
      state.player.y + state.player.height / 2,
      radius,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  if (mission.biome === "jungle") {
    context.save();
    context.globalAlpha = 0.9;
    const fernPositions = [120, 980, 2_040, 3_180, 4_720, 5_260];
    for (const x of fernPositions) {
      if (assets.foregroundFerns) {
        context.drawImage(assets.foregroundFerns, x, FLOOR_Y - 110, 150, 123);
      }
    }
    const reedPositions = [450, 1_420, 2_820, 3_920, 5_050];
    for (const x of reedPositions) {
      if (assets.foregroundReeds) {
        context.drawImage(assets.foregroundReeds, x, FLOOR_Y - 90, 112, 114);
      }
    }
    if (assets.foregroundVines) {
      for (const x of [620, 2_230, 3_760, 5_090]) {
        context.drawImage(assets.foregroundVines, x, -8, 178, 145);
      }
    }
    context.restore();
  }
  context.restore();

  // Canvas-only atmospheric overlays; actionable UI remains semantic DOM.
  if (state.player.cloaked) {
    context.fillStyle = `${palette.accent}0d`;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  if (state.scanPulse > 0) {
    context.fillStyle = `${palette.accent}12`;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  const vignette = context.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_HEIGHT * 0.25,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_WIDTH * 0.68,
  );
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, "#00000099");
  context.fillStyle = vignette;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

// ---------------------------------------------------------------------------
// Simulation and combat
// ---------------------------------------------------------------------------

function hurtPlayer(
  state: GameState,
  amount: number,
  mission: MissionDefinition,
): void {
  const player = state.player;
  if (player.invulnerability > 0 || state.phase === "dead") return;
  player.health -= amount;
  player.invulnerability = 0.55;
  player.cloaked = false;
  state.damageTaken += amount;
  if (state.trophyExtracting) {
    state.trophyExtracting = false;
    state.trophyExtraction = 0;
  }
  if (state.screenShakeEnabled) {
    state.screenShake = Math.min(18, 6 + amount * 0.24);
  }
  announce(state, `Impact subi : -${Math.round(amount)} intégrité`, 1.4);

  if (player.health > 0) return;
  if (!state.secondWindUsed && player.medicomps > 0) {
    state.secondWindUsed = true;
    player.medicomps -= 1;
    player.health = player.maxHealth * 0.3;
    player.energy = Math.max(player.energy, player.maxEnergy * 0.2);
    player.invulnerability = 2;
    addHonor(
      state,
      "second-wind",
      "Second Wind déclenché",
      -10,
      "violation",
    );
    announce(state, "SECOND WIND — le Medicomp te maintient dans la chasse.", 4);
    return;
  }

  player.health = 0;
  state.phase = "dead";
  state.paused = true;
  player.cloaked = false;
  addHonor(state, "hunt-failed", `Défaite sur ${mission.planetName}`, -15, "violation");
}

function spawnGore(
  state: GameState,
  enemy: EnemyState,
  intensity: "hit" | "kill" | "trophy",
): void {
  const base =
    intensity === "trophy" ? 18 : intensity === "kill" ? 12 : 5;
  const count = state.reducedGore ? Math.max(2, Math.round(base * 0.25)) : base;
  const color =
    enemy.kind === "yautja"
      ? "#9cff47"
      : enemy.kind === "beast"
        ? "#72d9ef"
        : "#a61f24";
  const centerX = enemy.x + enemy.width * 0.5;
  const centerY = enemy.y + enemy.height * 0.48;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI * (0.12 + Math.random() * 0.76);
    const speed =
      (intensity === "trophy" ? 120 : 80) + Math.random() * 190;
    const life = 0.35 + Math.random() * (state.reducedGore ? 0.25 : 0.65);
    state.goreParticles.push({
      x: centerX + (Math.random() - 0.5) * enemy.width * 0.35,
      y: centerY + (Math.random() - 0.5) * enemy.height * 0.22,
      velocityX: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      velocityY: Math.sin(angle) * speed,
      life,
      maxLife: life,
      radius: state.reducedGore ? 1.5 : 2 + Math.random() * 3.2,
      color: state.reducedGore ? `${color}aa` : color,
    });
  }
}

function damageEnemy(
  state: GameState,
  mission: MissionDefinition,
  enemy: EnemyState,
  amount: number,
  source: "melee" | "weapon",
): void {
  if (!enemy.alive || !enemy.active) return;
  enemy.health -= amount;
  enemy.hitFlash = 0.12;
  spawnGore(state, enemy, "hit");

  if (enemy.boss && !enemy.scanned && !state.rangedBossViolation) {
    state.rangedBossViolation = true;
    addHonor(
      state,
      "unscanned-target",
      "Cible attaquée avant analyse",
      -12,
      "violation",
    );
  }
  const bossRatio = enemy.boss ? enemy.health / enemy.maxHealth : 1;
  if (
    enemy.boss &&
    mission.id === "volcano-bad-blood" &&
    bossRatio <= 0.58 &&
    source === "weapon"
  ) {
    addHonor(
      state,
      "bad-blood-duel-broken",
      "Duel final rompu par une arme à distance",
      -30,
      "violation",
    );
  }
  if (enemy.health > 0) return;

  enemy.health = 0;
  enemy.alive = false;
  spawnGore(state, enemy, "kill");
  state.kills += 1;
  if (enemy.boss) {
    state.bossDefeatedAt = state.elapsed;
    state.phase = "trophy";
    completeObjective(
      state,
      mission,
      objectiveByKind(mission, "boss")?.id,
    );
    addHonor(
      state,
      "boss-honorable-kill",
      `Victoire sur ${mission.targetName}`,
      source === "melee" ? 18 : 10,
      source === "melee" ? "duel" : "honorable-kill",
    );
    announce(
      state,
      `${mission.targetName} est vaincu. Réclame le trophée avec [E].`,
      6,
    );
  } else {
    state.supportKills += 1;
    addHonor(
      state,
      `kill-${enemy.id}`,
      source === "melee" ? "Mise à mort rapprochée" : "Proie neutralisée",
      source === "melee" ? 3 : 1,
      "honorable-kill",
    );
  }
}

function playerMelee(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
): void {
  const player = state.player;
  if (
    player.meleeCooldown > 0 ||
    player.stamina < 8 ||
    state.phase === "dead" ||
    state.phase === "finished"
  ) {
    return;
  }
  const armor = ARMOR_BY_ID[loadout.armorId];
  player.cloaked = false;
  player.stamina -= 8;
  player.meleeCooldown = 0.26;
  player.attackFlash = 0.16;
  const center = {
    x: player.x + player.width / 2 + player.facing * 56,
    y: player.y + player.height * 0.48,
  };
  const targets = [
    ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ];
  let connected = false;
  for (const enemy of targets) {
    const enemyCenter = {
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
    };
    if (distance(center, enemyCenter) <= 94) {
      connected = true;
      damageEnemy(
        state,
        mission,
        enemy,
        25 * armor.meleeDamageMultiplier,
        "melee",
      );
    }
  }
  if (connected && state.screenShakeEnabled) state.screenShake = 5;
}

function playerWeapon(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
): void {
  const player = state.player;
  const weapon = equippedWeapon(loadout);
  if (
    player.weaponCooldown > 0 ||
    state.phase === "dead" ||
    state.phase === "finished"
  ) {
    return;
  }
  if (weapon.attackType === "melee") {
    playerMelee(state, mission, loadout);
    return;
  }
  if (weapon.energyCost > 0 && player.energy < weapon.energyCost) {
    announce(state, "Énergie insuffisante.", 1.5);
    return;
  }
  if (weapon.ammo !== null && player.ammo <= 0) {
    announce(state, "Munitions épuisées.", 1.5);
    return;
  }

  player.cloaked = false;
  player.weaponCooldown = weapon.cooldownMs / 1_000;
  player.energy = Math.max(0, player.energy - weapon.energyCost);
  if (weapon.ammo !== null) player.ammo -= 1;
  const speed = Math.max(620, weapon.projectileSpeedPx);
  const angle = player.aimAngle;
  state.projectiles.push({
    id: state.nextProjectileId++,
    x:
      player.x +
      player.width / 2 +
      player.facing * (player.width * 0.55),
    y: player.y + player.height * 0.38,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed + (weapon.id === "yautja-bow" ? -15 : 0),
    radius:
      weapon.id === "smart-disc" ? 12 : weapon.id === "plasma-caster" ? 9 : 6,
    damage: weapon.damage,
    hostile: false,
    color: weapon.color,
    life: Math.max(0.8, weapon.rangePx / Math.max(1, weapon.projectileSpeedPx)),
    source: "weapon",
    weaponId: weapon.id,
  });
}

function playerScan(state: GameState, mission: MissionDefinition): void {
  const player = state.player;
  if (player.scanCooldown > 0 || player.energy < 8) return;
  player.scanCooldown = 0.7;
  player.energy -= 8;
  state.scanPulse = 0.55;
  let discovered = 0;
  const center = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };

  for (const node of state.scanNodes) {
    if (!node.scanned && distance(center, node) <= 430) {
      node.scanned = true;
      state.scans += 1;
      discovered += 1;
      addHonor(
        state,
        `scan-${node.id}`,
        "Signature étudiée",
        3,
        "scan",
      );
    }
  }
  for (const enemy of [
    ...state.enemies,
    ...(state.boss.active ? [state.boss] : []),
  ]) {
    if (
      enemy.alive &&
      !enemy.scanned &&
      distance(center, {
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
      }) <= 470
    ) {
      enemy.scanned = true;
      state.scans += 1;
      discovered += 1;
      if (enemy.boss) {
        addHonor(
          state,
          "scan-primary-target",
          `Analyse de ${mission.targetName}`,
          15,
          "scan",
        );
      }
    }
  }
  announce(
    state,
    discovered > 0
      ? `${discovered} signature${discovered > 1 ? "s" : ""} analysée${
          discovered > 1 ? "s" : ""
        }.`
      : "Aucune nouvelle signature dans la portée du biomask.",
    2,
  );
}

function playerHeal(state: GameState): void {
  const player = state.player;
  if (
    player.healCooldown > 0 ||
    player.medicomps <= 0 ||
    player.health >= player.maxHealth
  ) {
    announce(
      state,
      player.medicomps <= 0
        ? "Aucune charge de Medicomp."
        : "Le Medicomp n’est pas nécessaire.",
      1.5,
    );
    return;
  }
  player.medicomps -= 1;
  player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.46);
  player.healCooldown = 2;
  player.cloaked = false;
  announce(state, "Medicomp appliqué. Position révélée.", 2.5);
}

function finishTrophyExtraction(
  state: GameState,
  mission: MissionDefinition,
): void {
  const elapsedSinceBoss =
    state.bossDefeatedAt === null
      ? Number.POSITIVE_INFINITY
      : state.elapsed - state.bossDefeatedAt;
  const healthRatio = state.player.health / state.player.maxHealth;
  const quality: TrophyQuality =
    elapsedSinceBoss <= mission.boss.trophyWindowSeconds * 0.45 &&
    healthRatio >= 0.75 &&
    !state.secondWindUsed
      ? "flawless"
      : elapsedSinceBoss <= mission.boss.trophyWindowSeconds &&
          healthRatio >= 0.5
        ? "elite"
        : healthRatio >= 0.25
          ? "blooded"
          : "worthy";
  const condition: TrophyClaim["condition"] =
    quality === "flawless"
      ? "pristine"
      : quality === "elite"
        ? "intact"
        : "damaged";

  state.trophyQuality = quality;
  state.trophyClaimedAt = state.elapsed;
  state.trophyExtracting = false;
  state.trophyExtraction = 1;
  state.trophyCarried = true;
  state.trophyClaim = {
    id: `${mission.id}-${Math.round(state.elapsed * 1_000)}`,
    definitionId: mission.trophy.id,
    targetName: mission.targetName,
    targetKind: mission.targetKind,
    partId: mission.targetKind === "yautja" ? "mask" : "skull-and-spine",
    quality,
    condition,
  };
  state.phase = "extraction";
  spawnGore(state, state.boss, "trophy");
  addHonor(
    state,
    "trophy-claimed",
    mission.trophy.name,
    12,
    "objective",
  );
  announce(state, `${mission.trophy.name} arraché. Rejoins l’extraction.`, 5);
}

function interact(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  finish: (result: MissionResult) => void,
): void {
  const playerCenter = {
    x: state.player.x + state.player.width / 2,
    y: state.player.y + state.player.height / 2,
  };
  if (state.phase === "target") {
    const nearby = state.recoveryNodes.find(
      (node) => !node.recovered && distance(playerCenter, node) <= 105,
    );
    if (nearby) {
      nearby.recovered = true;
      addHonor(
        state,
        `recover-${nearby.id}`,
        "Technologie du clan sécurisée",
        5,
        "objective",
      );
      announce(state, "Technologie récupérée.", 2);
      return;
    }
  }
  if (
    state.phase === "trophy" &&
    distance(playerCenter, {
      x: state.boss.x + state.boss.width / 2,
      y: FLOOR_Y - 52,
    }) <= 125
  ) {
    if (!state.trophyExtracting) {
      state.trophyExtracting = true;
      state.trophyExtraction = 0;
      state.player.cloaked = false;
      announce(
        state,
        "Extraction du trophée : maintiens ta position pendant 1,4 s.",
        2,
      );
    }
    return;
  }
  if (
    state.phase === "extraction" &&
    Math.abs(playerCenter.x - EXTRACTION_X) <= 115
  ) {
    completeObjective(
      state,
      mission,
      objectiveByKind(mission, "extract")?.id,
    );
    state.phase = "finished";
    state.paused = true;
    finish(resultFor(state, mission, difficulty, "success"));
    return;
  }
  announce(state, "Rien à activer à portée.", 1.4);
}

function updateObjectiveFlow(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
): void {
  const scanObjective = objectiveByKind(mission, "scan");
  const recoverObjective = objectiveByKind(mission, "recover");
  const huntObjective = objectiveByKind(mission, "hunt");

  if (
    state.phase === "tracking" &&
    state.scanNodes.every((node) => node.scanned)
  ) {
    completeObjective(state, mission, scanObjective?.id);
    state.phase = "target";
    spawnEligibleWaves(
      state,
      mission,
      difficulty,
      "objective",
      scanObjective?.id ?? null,
    );
    announce(state, `${mission.targetName} peut désormais être pisté.`, 4);
  }

  if (state.phase !== "target") return;
  if (
    recoverObjective &&
    state.recoveryNodes.length > 0 &&
    state.recoveryNodes.every((node) => node.recovered)
  ) {
    completeObjective(state, mission, recoverObjective.id);
    spawnEligibleWaves(
      state,
      mission,
      difficulty,
      "objective",
      recoverObjective.id,
    );
  }
  if (
    huntObjective &&
    state.supportKills >= huntObjective.targetCount
  ) {
    completeObjective(state, mission, huntObjective.id);
    spawnEligibleWaves(
      state,
      mission,
      difficulty,
      "objective",
      huntObjective.id,
    );
  }

  const supportReady =
    (!recoverObjective || state.completedObjectives.has(recoverObjective.id)) &&
    (!huntObjective || state.completedObjectives.has(huntObjective.id));
  if (supportReady && !state.boss.active) {
    state.boss.active = true;
    announce(
      state,
      `Cible Apex détectée : ${mission.boss.name}.`,
      4,
    );
  }
}

function updateAimState(state: GameState, input: InputHub): void {
  const player = state.player;
  player.aiming = isHeld(input, "aim");
  const origin = {
    x: player.x + player.width / 2,
    y: player.y + player.height * 0.38,
  };
  const targets = [
    ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ];
  const nearest = targets
    .map((enemy) => ({
      enemy,
      range: distance(origin, {
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
      }),
    }))
    .filter((entry) => entry.range <= 920)
    .sort((a, b) => a.range - b.range)[0]?.enemy;

  if (player.aiming && input.pointerScreen) {
    player.aimPoint.x = clamp(
      input.pointerScreen.x + state.cameraX,
      0,
      WORLD_WIDTH,
    );
    player.aimPoint.y = clamp(input.pointerScreen.y, 18, VIEW_HEIGHT - 18);
  } else if (nearest) {
    player.aimPoint.x = nearest.x + nearest.width / 2;
    player.aimPoint.y = nearest.y + nearest.height * 0.42;
  } else {
    player.aimPoint.x = origin.x + player.facing * 780;
    player.aimPoint.y = origin.y;
  }

  const dx = player.aimPoint.x - origin.x;
  const dy = player.aimPoint.y - origin.y;
  if (player.aiming && Math.abs(dx) > 18) {
    player.facing = dx >= 0 ? 1 : -1;
  }
  player.aimAngle = Math.atan2(dy, dx);
}

function updateHunterRig(player: PlayerState, delta: number, extracting: boolean): void {
  const gauntletTarget = extracting ? 1 : 0;
  const bladesTarget = extracting || player.attackFlash > 0 ? 1 : 0;
  player.gauntletOpen +=
    (gauntletTarget - player.gauntletOpen) * Math.min(1, delta * 11);
  player.bladeExtension +=
    (bladesTarget - player.bladeExtension) * Math.min(1, delta * 18);

  const localSpeed = player.velocityX * player.facing;
  const jumpForce = clamp(player.velocityY / 1_300, -0.42, 0.42);
  for (let index = 0; index < player.dreadAngles.length; index += 1) {
    const weight = 0.7 + index * 0.13;
    const target =
      clamp(-localSpeed / 860, -0.42, 0.42) * weight +
      jumpForce * (0.45 + index * 0.1) +
      Math.sin(index * 1.7 + player.x * 0.008) * 0.025;
    const velocity =
      (player.dreadVelocities[index] ?? 0) +
      (target - (player.dreadAngles[index] ?? 0)) * (19 - index * 1.2) * delta;
    player.dreadVelocities[index] = velocity * Math.exp(-7.2 * delta);
    player.dreadAngles[index] =
      (player.dreadAngles[index] ?? 0) +
      player.dreadVelocities[index] * delta;
  }
}

function updatePlayer(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  appearance: HunterAppearance,
  difficulty: DifficultyId,
  input: InputHub,
  delta: number,
  finish: (result: MissionResult) => void,
): void {
  const player = state.player;
  const armor = ARMOR_BY_ID[loadout.armorId];
  const moveAxis =
    (isHeld(input, "right") ? 1 : 0) - (isHeld(input, "left") ? 1 : 0);
  const climbAxis =
    (isHeld(input, "down") ? 1 : 0) - (isHeld(input, "up") ? 1 : 0);
  updateAimState(state, input);

  if (consume(input, "mask")) {
    if (!appearance.biomaskId) {
      announce(state, "Aucun biomask dans cette apparence.", 1.8);
    } else {
      player.maskOn = !player.maskOn;
      announce(
        state,
        player.maskOn ? "Biomask verrouillé." : "Biomask retiré.",
        1.4,
      );
    }
  }

  if (state.trophyExtracting) {
    const interrupted =
      moveAxis !== 0 ||
      climbAxis !== 0 ||
      input.pressed.has("jump") ||
      input.pressed.has("melee") ||
      input.pressed.has("weapon");
    if (interrupted) {
      state.trophyExtracting = false;
      state.trophyExtraction = 0;
      announce(state, "Extraction interrompue : la dépouille est conservée.", 2);
    } else {
      state.trophyExtraction = clamp(
        state.trophyExtraction + delta / 1.4,
        0,
        1,
      );
      player.velocityX *= Math.pow(0.0001, delta);
      player.cloaked = false;
      if (state.trophyExtraction >= 1) {
        finishTrophyExtraction(state, mission);
      }
    }
  }

  const targetVelocity =
    (state.trophyExtracting ? 0 : moveAxis) *
    300 *
    armor.moveSpeedMultiplier;
  player.velocityX +=
    (targetVelocity - player.velocityX) * Math.min(1, delta * 13);
  if (moveAxis !== 0 && !player.aiming) player.facing = moveAxis > 0 ? 1 : -1;
  if (Math.abs(moveAxis) < 0.1) {
    player.velocityX *= Math.pow(0.0008, delta);
  }

  const playerCenter = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };
  const currentClimbZone =
    mission.biome === "jungle"
      ? JUNGLE_CLIMB_ZONES.find(
          (zone) =>
            zone.id === player.climbZoneId ||
            (playerCenter.x >= zone.x - 24 &&
              playerCenter.x <= zone.x + zone.width + 24 &&
              playerCenter.y >= zone.y - 28 &&
              playerCenter.y <= zone.y + zone.height + 28),
        )
      : undefined;
  if (
    !state.trophyExtracting &&
    climbAxis !== 0 &&
    currentClimbZone &&
    Math.abs(moveAxis) < 0.5
  ) {
    player.climbing = true;
    player.climbZoneId = currentClimbZone.id;
    player.grounded = false;
  }
  if (player.climbing && (mission.biome !== "jungle" || Math.abs(moveAxis) > 0.5)) {
    player.climbing = false;
    player.climbZoneId = null;
  }

  const jumpPressed = consume(input, "jump");
  if (jumpPressed && player.climbing) {
    player.climbing = false;
    player.climbZoneId = null;
    player.velocityY = -560;
    player.velocityX = player.facing * 270;
  } else if (jumpPressed && player.grounded && !state.trophyExtracting) {
    player.velocityY = -720;
    player.grounded = false;
  }
  if (consume(input, "melee") && !state.trophyExtracting) {
    playerMelee(state, mission, loadout);
  }
  if (consume(input, "weapon") && !state.trophyExtracting) {
    playerWeapon(state, mission, loadout);
  }
  if (consume(input, "scan")) playerScan(state, mission);
  if (consume(input, "heal")) playerHeal(state);
  if (consume(input, "cloak")) {
    if (player.cloaked) {
      player.cloaked = false;
      announce(state, "Camouflage désactivé.", 1.2);
    } else if (player.energy >= 20) {
      player.cloaked = true;
      announce(state, "Camouflage actif.", 1.2);
    } else {
      announce(state, "Énergie insuffisante pour le camouflage.", 1.8);
    }
  }
  if (consume(input, "interact")) {
    interact(state, mission, difficulty, finish);
  }

  player.previousY = player.y;
  if (player.climbing && currentClimbZone) {
    const climbCenterX =
      currentClimbZone.x + currentClimbZone.width / 2 - player.width / 2;
    player.x +=
      (climbCenterX - player.x) *
      Math.min(1, delta * (currentClimbZone.kind === "vine" ? 6 : 9));
    player.velocityX *= Math.pow(0.001, delta);
    player.velocityY +=
      (climbAxis * 235 - player.velocityY) * Math.min(1, delta * 14);
    player.y = clamp(
      player.y + player.velocityY * delta,
      currentClimbZone.y - player.height * 0.38,
      currentClimbZone.y + currentClimbZone.height - player.height * 0.58,
    );
    player.grounded = false;
  } else {
    player.velocityY += GRAVITY * delta;
    player.x += player.velocityX * delta;
    player.y += player.velocityY * delta;
    player.grounded = false;
  }

  const previousBottom = player.previousY + player.height;
  const currentBottom = player.y + player.height;
  if (!player.climbing && player.velocityY >= 0) {
    for (const platform of PLATFORMS) {
      if (
        previousBottom <= platform.y + 7 &&
        currentBottom >= platform.y &&
        player.x + player.width > platform.x + 6 &&
        player.x < platform.x + platform.width - 6
      ) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.grounded = true;
        break;
      }
    }
  }
  if (player.y + player.height >= FLOOR_Y) {
    player.y = FLOOR_Y - player.height;
    player.velocityY = 0;
    player.grounded = true;
  }

  let maximumX = WORLD_WIDTH - player.width;
  if (!state.boss.active && state.phase !== "extraction") maximumX = 3_950;
  player.x = clamp(player.x, 0, maximumX);
  updateHunterRig(player, delta, state.trophyExtracting);

  player.invulnerability = Math.max(0, player.invulnerability - delta);
  player.meleeCooldown = Math.max(0, player.meleeCooldown - delta);
  player.weaponCooldown = Math.max(0, player.weaponCooldown - delta);
  player.scanCooldown = Math.max(0, player.scanCooldown - delta);
  player.healCooldown = Math.max(0, player.healCooldown - delta);
  player.attackFlash = Math.max(0, player.attackFlash - delta);
  player.stamina = Math.min(
    player.maxStamina,
    player.stamina + (player.grounded ? 24 : 14) * delta,
  );
  if (player.cloaked) {
    player.energy -= 16 * delta;
    if (player.energy <= 0) {
      player.energy = 0;
      player.cloaked = false;
      announce(state, "Camouflage rompu : réserve épuisée.", 2);
    }
  } else {
    player.energy = Math.min(
      player.maxEnergy,
      player.energy + 10 * armor.energyRegenMultiplier * delta,
    );
  }
}

function fireHostileProjectile(
  state: GameState,
  enemy: EnemyState,
  damage: number,
  speed: number,
  color: string,
  source: "enemy" | "boss",
  vertical = 0,
): void {
  const originX = enemy.x + enemy.width / 2;
  const originY = enemy.y + enemy.height * 0.35;
  const targetX = state.player.x + state.player.width / 2;
  const targetY = state.player.y + state.player.height * 0.4;
  const angle = Math.atan2(targetY - originY, targetX - originX);
  state.projectiles.push({
    id: state.nextProjectileId++,
    x: originX,
    y: originY,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed + vertical,
    radius: source === "boss" ? 9 : 5,
    damage,
    hostile: true,
    color,
    life: 2.2,
    source,
    weaponId: null,
  });
}

function updateRegularEnemy(
  state: GameState,
  enemy: EnemyState,
  mission: MissionDefinition,
  delta: number,
): void {
  if (!enemy.alive || !enemy.active) return;
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
  enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
  enemy.telegraph = Math.max(0, enemy.telegraph - delta);

  const player = state.player;
  const enemyCenter = enemy.x + enemy.width / 2;
  const playerCenter = player.x + player.width / 2;
  const dx = playerCenter - enemyCenter;
  const detected =
    Math.abs(dx) <
    (player.cloaked ? 105 : enemy.kind === "human" ? 560 : 410);

  if (detected) {
    enemy.facing = dx >= 0 ? 1 : -1;
    const desiredRange = enemy.kind === "human" ? 250 : 58;
    if (Math.abs(dx) > desiredRange) {
      enemy.velocityX =
        Math.sign(dx) * enemy.moveSpeed * (player.cloaked ? 0.35 : 1);
    } else {
      enemy.velocityX *= 0.75;
    }
    if (enemy.attackCooldown <= 0) {
      if (enemy.kind === "human" && Math.abs(dx) < 620) {
        fireHostileProjectile(
          state,
          enemy,
          enemy.damage,
          560,
          "#ff8d64",
          "enemy",
        );
        enemy.attackCooldown = 1.4 + Math.random() * 0.8;
      } else if (
        enemy.kind !== "human" &&
        Math.abs(dx) < enemy.width * 0.8 + player.width * 0.55
      ) {
        hurtPlayer(state, enemy.damage, mission);
        enemy.attackCooldown = 1.15;
      }
    }
  } else {
    if (enemy.x <= enemy.patrolLeft) enemy.facing = 1;
    if (enemy.x >= enemy.patrolRight) enemy.facing = -1;
    enemy.velocityX = enemy.facing * enemy.moveSpeed * 0.42;
  }
  enemy.x = clamp(
    enemy.x + enemy.velocityX * delta,
    enemy.patrolLeft,
    enemy.patrolRight,
  );
}

function updateBoss(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  delta: number,
): void {
  const boss = state.boss;
  if (!boss.active || !boss.alive) return;
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  boss.attackCooldown = Math.max(0, boss.attackCooldown - delta);
  boss.hitFlash = Math.max(0, boss.hitFlash - delta);
  boss.telegraph = Math.max(0, boss.telegraph - delta);
  const phase = activeBossPhase(mission, boss);
  const phaseSpeed = phase?.speedMultiplier ?? 1;
  const phaseDamage = phase?.damageMultiplier ?? 1;
  const player = state.player;
  const dx =
    player.x + player.width / 2 - (boss.x + boss.width / 2);
  boss.facing = dx >= 0 ? 1 : -1;

  if (boss.attackCooldown <= 0 && boss.telegraph <= 0) {
    const attacks = mission.boss.attacks;
    const closeAttack = attacks.find((attack) => attack.behavior === "melee");
    const rangedAttacks = attacks.filter(
      (attack) => attack.behavior !== "melee",
    );
    const attack =
      Math.abs(dx) < 145 && closeAttack
        ? closeAttack
        : rangedAttacks[
            Math.floor(state.elapsed / 2.7) % Math.max(1, rangedAttacks.length)
          ] ?? attacks[0];
    if (attack) {
      boss.telegraph = Math.max(0.12, attack.telegraphMs / 1_000);
      boss.attackCooldown =
        attack.cooldownSeconds + boss.telegraph;
    }
  }

  const wasTelegraphing = boss.telegraph > 0;
  if (wasTelegraphing) {
    boss.velocityX *= 0.82;
    const remaining = Math.max(0, boss.telegraph - delta);
    if (remaining <= 0) {
      const attacks = mission.boss.attacks;
      const closeAttack = attacks.find((attack) => attack.behavior === "melee");
      const rangedAttacks = attacks.filter(
        (attack) => attack.behavior !== "melee",
      );
      const attack =
        Math.abs(dx) < 145 && closeAttack
          ? closeAttack
          : rangedAttacks[
              Math.floor(state.elapsed / 2.7) %
                Math.max(1, rangedAttacks.length)
            ] ?? attacks[0];
      if (attack) {
        const damage =
          attack.damage *
          difficultyDef.enemyDamageMultiplier *
          phaseDamage;
        if (attack.behavior === "melee" && Math.abs(dx) < 165) {
          hurtPlayer(state, damage, mission);
        } else if (attack.behavior === "charge") {
          boss.velocityX = boss.facing * 720;
          if (Math.abs(dx) < 240) hurtPlayer(state, damage, mission);
        } else if (attack.behavior === "area") {
          if (Math.abs(dx) < attack.rangePx) {
            hurtPlayer(state, damage, mission);
            player.cloaked = false;
          }
          if (state.screenShakeEnabled) state.screenShake = 14;
        } else if (attack.behavior === "burst") {
          for (let burst = 0; burst < 3; burst += 1) {
            fireHostileProjectile(
              state,
              boss,
              damage * 0.6,
              620,
              mission.palette.danger,
              "boss",
              (burst - 1) * 38,
            );
          }
        } else {
          fireHostileProjectile(
            state,
            boss,
            damage,
            attack.behavior === "disc" ? 720 : 650,
            attack.behavior === "plasma"
              ? "#ff4838"
              : mission.boss.color,
            "boss",
          );
        }
      }
    }
    boss.telegraph = remaining;
  } else {
    const desiredRange =
      mission.biome === "ice" ? 90 : mission.biome === "volcano" ? 220 : 260;
    if (Math.abs(dx) > desiredRange) {
      boss.velocityX =
        Math.sign(dx) * boss.moveSpeed * phaseSpeed;
    } else if (Math.abs(dx) < desiredRange * 0.65) {
      boss.velocityX =
        -Math.sign(dx) * boss.moveSpeed * phaseSpeed * 0.75;
    } else {
      boss.velocityX *= 0.75;
    }
  }

  boss.x = clamp(
    boss.x + boss.velocityX * delta,
    boss.patrolLeft,
    boss.patrolRight,
  );
  if (
    Math.abs(dx) < (boss.width + player.width) * 0.45 &&
    Math.abs(boss.velocityX) > 500
  ) {
    hurtPlayer(
      state,
      24 * difficultyDef.enemyDamageMultiplier,
      mission,
    );
  }
}

function updateProjectiles(
  state: GameState,
  mission: MissionDefinition,
  delta: number,
): void {
  const next: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    projectile.x += projectile.velocityX * delta;
    projectile.y += projectile.velocityY * delta;
    projectile.life -= delta;
    let consumed = false;

    if (projectile.hostile) {
      const hitBox = {
        x: projectile.x - projectile.radius,
        y: projectile.y - projectile.radius,
        width: projectile.radius * 2,
        height: projectile.radius * 2,
      };
      if (overlaps(hitBox, state.player)) {
        hurtPlayer(state, projectile.damage, mission);
        consumed = true;
      }
    } else {
      const targets = [
        ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
        ...(state.boss.active && state.boss.alive ? [state.boss] : []),
      ];
      for (const enemy of targets) {
        const hitBox = {
          x: projectile.x - projectile.radius,
          y: projectile.y - projectile.radius,
          width: projectile.radius * 2,
          height: projectile.radius * 2,
        };
        if (overlaps(hitBox, enemy)) {
          if (projectile.weaponId === "plasma-caster" && !enemy.boss) {
            addHonor(
              state,
              "plasma-restraint",
              "Plasmacaster employé contre une proie ordinaire",
              -10,
              "violation",
            );
          }
          damageEnemy(state, mission, enemy, projectile.damage, "weapon");
          consumed = true;
          break;
        }
      }
    }
    if (
      !consumed &&
      projectile.life > 0 &&
      projectile.x > -50 &&
      projectile.x < WORLD_WIDTH + 50 &&
      projectile.y > -100 &&
      projectile.y < VIEW_HEIGHT + 100
    ) {
      next.push(projectile);
    }
  }
  state.projectiles = next;
}

function updateGoreParticles(state: GameState, delta: number): void {
  const next: GoreParticle[] = [];
  for (const particle of state.goreParticles) {
    particle.life -= delta;
    if (particle.life <= 0) continue;
    particle.velocityY += 720 * delta;
    particle.x += particle.velocityX * delta;
    particle.y += particle.velocityY * delta;
    if (particle.y >= FLOOR_Y - particle.radius) {
      particle.y = FLOOR_Y - particle.radius;
      particle.velocityY *= -0.18;
      particle.velocityX *= 0.72;
    }
    next.push(particle);
  }
  state.goreParticles = next;
}

function pollGamepad(input: InputHub): void {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  const gamepad = navigator.getGamepads()[0];
  input.gamepadHeld.clear();
  if (!gamepad) {
    input.previousGamepadButtons = [];
    return;
  }

  const left =
    gamepad.axes[0] < -0.25 || Boolean(gamepad.buttons[14]?.pressed);
  const right =
    gamepad.axes[0] > 0.25 || Boolean(gamepad.buttons[15]?.pressed);
  const up =
    gamepad.axes[1] < -0.3 || Boolean(gamepad.buttons[12]?.pressed);
  const down =
    gamepad.axes[1] > 0.3 || Boolean(gamepad.buttons[13]?.pressed);
  if (left) input.gamepadHeld.add("left");
  if (right) input.gamepadHeld.add("right");
  if (up) input.gamepadHeld.add("up");
  if (down) input.gamepadHeld.add("down");
  if ((gamepad.buttons[6]?.value ?? 0) > 0.25) {
    input.gamepadHeld.add("aim");
  }

  const actionButtons: ReadonlyArray<readonly [number, Action]> = [
    [0, "jump"],
    [2, "melee"],
    [7, "weapon"],
    [4, "scan"],
    [3, "cloak"],
    [5, "heal"],
    [1, "interact"],
    [9, "pause"],
  ];
  const current = gamepad.buttons.map((button) => button.pressed);
  for (const [index, action] of actionButtons) {
    if (current[index] && !input.previousGamepadButtons[index]) {
      input.pressed.add(action);
    }
  }
  input.previousGamepadButtons = current;
}

function stepGame(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  appearance: HunterAppearance,
  difficulty: DifficultyId,
  input: InputHub,
  delta: number,
  finish: (result: MissionResult) => void,
): void {
  pollGamepad(input);
  if (consume(input, "pause")) {
    state.paused = !state.paused;
    announce(state, state.paused ? "Chasse en pause." : "Chasse reprise.", 1.3);
  }
  if (state.paused || state.phase === "dead" || state.phase === "finished") {
    return;
  }

  state.elapsed += delta;
  state.messageTimer = Math.max(0, state.messageTimer - delta);
  state.scanPulse = Math.max(0, state.scanPulse - delta);
  state.screenShake = Math.max(0, state.screenShake - delta * 30);

  updatePlayer(
    state,
    mission,
    loadout,
    appearance,
    difficulty,
    input,
    delta,
    finish,
  );
  for (const enemy of state.enemies) {
    updateRegularEnemy(state, enemy, mission, delta);
  }
  updateBoss(state, mission, difficulty, delta);
  updateProjectiles(state, mission, delta);
  updateGoreParticles(state, delta);
  updateObjectiveFlow(state, mission, difficulty);

  const desiredCamera = clamp(
    state.player.x - VIEW_WIDTH * 0.38,
    0,
    WORLD_WIDTH - VIEW_WIDTH,
  );
  state.cameraX +=
    (desiredCamera - state.cameraX) * Math.min(1, delta * 6);
}

// ---------------------------------------------------------------------------
// React shell, semantic HUD and lifecycle
// ---------------------------------------------------------------------------

export default function HuntCanvas({
  mission,
  loadout,
  difficulty,
  appearance,
  reducedGore,
  screenShake,
  onFinish,
  onAbort,
}: HuntCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const finishRef = useRef(onFinish);
  const abortRef = useRef(onAbort);
  const restartRef = useRef<() => void>(() => undefined);
  const togglePauseRef = useRef<() => void>(() => undefined);
  const reportFailureRef = useRef<() => void>(() => undefined);
  const inputRef = useRef<InputHub>({
    keyboardHeld: new Set(),
    touchHeld: new Set(),
    gamepadHeld: new Set(),
    pressed: new Set(),
    previousGamepadButtons: [],
    pointerScreen: null,
  });
  const [ui, setUi] = useState<UiSnapshot>(EMPTY_UI);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    abortRef.current = onAbort;
  }, [onAbort]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let alive = true;
    let frameId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let lastUiPush = 0;
    let deviceScale = clamp(window.devicePixelRatio || 1, 1, 2);
    let game = makeGameState(
      mission,
      loadout,
      difficulty,
      appearance,
      reducedGore,
      screenShake,
    );
    const assets: AssetBank = {
      background: null,
      farLake: null,
      hunterBody: null,
      hunterDreads: null,
      hunterMask: null,
      hunterArmor: null,
      plasmaCaster: null,
      gauntletClosed: null,
      gauntletOpen: null,
      wristbladesRetracted: null,
      wristbladesExtended: null,
      trophy: null,
      treeTrunk: null,
      vineLadder: null,
      platformRoot: null,
      platformStone: null,
      platformCrown: null,
      platformExpedition: null,
      foregroundFerns: null,
      foregroundVines: null,
      foregroundReeds: null,
      mercenary: null,
      cryostalker: null,
      badBlood: null,
    };
    const input = inputRef.current;
    input.keyboardHeld.clear();
    input.touchHeld.clear();
    input.gamepadHeld.clear();
    input.pressed.clear();
    input.previousGamepadButtons = [];
    input.pointerScreen = null;
    setAssetsReady(false);
    setUi(snapshot(game, mission));

    const resize = () => {
      deviceScale = clamp(window.devicePixelRatio || 1, 1, 2);
      const width = Math.round(VIEW_WIDTH * deviceScale);
      const height = Math.round(VIEW_HEIGHT * deviceScale);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const assetPaths: Record<keyof AssetBank, string> = {
      background: backgroundPath(mission),
      farLake: "/game/assets/v2/environments/jungle/layers/far-lake.webp",
      hunterBody: "/game/assets/v2/actors/yautja/hunter/body/base.webp",
      hunterDreads: `/game/assets/v2/actors/yautja/hunter/dreads/${appearance.dreadStyleId}.webp`,
      hunterMask: `/game/assets/v2/actors/yautja/hunter/masks/${appearance.biomaskId ?? "hunter"}.webp`,
      hunterArmor: `/game/assets/v2/actors/yautja/hunter/armor/${loadout.armorId}.webp`,
      plasmaCaster:
        "/game/assets/v2/actors/yautja/hunter/equipment/plasma-caster.webp",
      gauntletClosed:
        "/game/assets/v2/actors/yautja/hunter/equipment/gauntlet-closed.webp",
      gauntletOpen:
        "/game/assets/v2/actors/yautja/hunter/equipment/gauntlet-open.webp",
      wristbladesRetracted:
        "/game/assets/v2/actors/yautja/hunter/equipment/wristblades-retracted.webp",
      wristbladesExtended:
        "/game/assets/v2/actors/yautja/hunter/equipment/wristblades-extended.webp",
      trophy:
        "/game/assets/v2/actors/yautja/hunter/trophies/skull-spine.webp",
      treeTrunk:
        "/game/assets/v2/environments/jungle/climbables/tree-trunk.webp",
      vineLadder:
        "/game/assets/v2/environments/jungle/climbables/vine-ladder.webp",
      platformRoot:
        "/game/assets/v2/environments/jungle/platforms/root-branch.webp",
      platformStone:
        "/game/assets/v2/environments/jungle/platforms/stone-slab.webp",
      platformCrown:
        "/game/assets/v2/environments/jungle/platforms/tree-crown.webp",
      platformExpedition:
        "/game/assets/v2/environments/jungle/platforms/expedition-platform.webp",
      foregroundFerns:
        "/game/assets/v2/environments/jungle/foreground/ferns.webp",
      foregroundVines:
        "/game/assets/v2/environments/jungle/foreground/hanging-vines.webp",
      foregroundReeds:
        "/game/assets/v2/environments/jungle/foreground/lake-reeds.webp",
      mercenary: "/game/sprites/mercenary.webp",
      cryostalker: "/game/sprites/cryostalker.webp",
      badBlood: "/game/sprites/bad-blood.webp",
    };
    Promise.all(
      (Object.entries(assetPaths) as Array<[keyof AssetBank, string]>).map(
        async ([key, path]) => [key, await loadImage(path)] as const,
      ),
    ).then((loadedAssets) => {
      if (!alive) return;
      for (const [key, image] of loadedAssets) assets[key] = image;
      setAssetsReady(true);
    });

    const restart = () => {
      game = makeGameState(
        mission,
        loadout,
        difficulty,
        appearance,
        reducedGore,
        screenShake,
      );
      lastTime = performance.now();
      accumulator = 0;
      input.pressed.clear();
      input.keyboardHeld.clear();
      input.touchHeld.clear();
      input.gamepadHeld.clear();
      setUi(snapshot(game, mission));
    };
    restartRef.current = restart;
    togglePauseRef.current = () => {
      if (game.phase === "dead" || game.phase === "finished") return;
      game.paused = !game.paused;
      setUi(snapshot(game, mission));
    };
    reportFailureRef.current = () => {
      if (game.failureReported) return;
      game.failureReported = true;
      finishRef.current(resultFor(game, mission, difficulty, "failed"));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (
        action === "left" ||
        action === "right" ||
        action === "up" ||
        action === "down" ||
        action === "aim"
      ) {
        input.keyboardHeld.add(action);
      } else if (!event.repeat) {
        input.pressed.add(action);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const action = KEY_ACTIONS[event.code];
      if (
        action === "left" ||
        action === "right" ||
        action === "up" ||
        action === "down" ||
        action === "aim"
      ) {
        input.keyboardHeld.delete(action);
      }
    };
    const onBlur = () => {
      input.keyboardHeld.clear();
      input.gamepadHeld.clear();
      input.touchHeld.clear();
      if (
        game.phase !== "dead" &&
        game.phase !== "finished" &&
        !game.paused
      ) {
        game.paused = true;
        setUi(snapshot(game, mission));
      }
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    const fixedStep = 1 / 60;
    const frame = (time: number) => {
      if (!alive) return;
      const frameDelta = clamp((time - lastTime) / 1_000, 0, 0.05);
      lastTime = time;
      accumulator = Math.min(0.12, accumulator + frameDelta);
      while (accumulator >= fixedStep) {
        stepGame(
          game,
          mission,
          loadout,
          appearance,
          difficulty,
          input,
          fixedStep,
          (result) => finishRef.current(result),
        );
        accumulator -= fixedStep;
      }
      renderGame(
        context,
        game,
        mission,
        loadout,
        appearance,
        assets,
        deviceScale,
      );
      if (time - lastUiPush >= 100) {
        lastUiPush = time;
        setUi(snapshot(game, mission));
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      input.keyboardHeld.clear();
      input.touchHeld.clear();
      input.gamepadHeld.clear();
      input.pressed.clear();
      input.previousGamepadButtons = [];
      input.pointerScreen = null;
      restartRef.current = () => undefined;
      togglePauseRef.current = () => undefined;
      reportFailureRef.current = () => undefined;
    };
  }, [appearance, difficulty, loadout, mission, reducedGore, screenShake]);

  const pressAction = useCallback((action: Action) => {
    inputRef.current.pressed.add(action);
  }, []);

  const setTouchHeld = useCallback((action: Action, held: boolean) => {
    if (held) inputRef.current.touchHeld.add(action);
    else inputRef.current.touchHeld.delete(action);
  }, []);

  const makeHoldHandlers = useCallback(
    (action: Action) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setTouchHeld(action, true);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setTouchHeld(action, false);
      },
      onPointerCancel: () => setTouchHeld(action, false),
      onLostPointerCapture: () => setTouchHeld(action, false),
    }),
    [setTouchHeld],
  );

  const updatePointerScreen = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      inputRef.current.pointerScreen = {
        x: clamp(
          ((event.clientX - rect.left) / Math.max(1, rect.width)) * VIEW_WIDTH,
          0,
          VIEW_WIDTH,
        ),
        y: clamp(
          ((event.clientY - rect.top) / Math.max(1, rect.height)) * VIEW_HEIGHT,
          0,
          VIEW_HEIGHT,
        ),
      };
    },
    [],
  );

  const weapon = equippedWeapon(loadout);
  const phaseLabel =
    ui.phase === "tracking"
      ? "TRAQUE"
      : ui.phase === "target"
        ? "CIBLE"
        : ui.phase === "trophy"
          ? "TROPHÉE"
          : ui.phase === "extraction"
            ? "EXTRACTION"
            : ui.phase === "dead"
              ? "CHASSE INTERROMPUE"
              : "RITE ACCOMPLI";

  return (
    <section
      aria-label={`Mission ${mission.title} sur ${mission.planetName}`}
      style={{
        ...styles.shell,
        "--hunt-accent": mission.palette.accent,
        "--hunt-danger": mission.palette.danger,
        "--hunt-sky": mission.palette.sky,
      } as CSSProperties}
    >
      {/* Bloc : statut de mission et ressources du biomask. */}
      <header style={styles.topBar}>
        <div style={styles.identity}>
          <span style={{ ...styles.phaseTag, color: mission.palette.accent }}>
            {phaseLabel}
          </span>
          <strong style={styles.missionTitle}>{mission.title}</strong>
          <span style={styles.planet}>{mission.planetName}</span>
        </div>

        <div style={styles.resourceGrid} aria-label="État du chasseur">
          <ResourceMeter
            label="Intégrité"
            value={ui.health}
            maximum={ui.maxHealth}
            color={mission.palette.danger}
          />
          <ResourceMeter
            label="Endurance"
            value={ui.stamina}
            maximum={ui.maxStamina}
            color="#e4cf84"
          />
          <ResourceMeter
            label="Énergie"
            value={ui.energy}
            maximum={ui.maxEnergy}
            color={mission.palette.accent}
          />
        </div>

        <button
          type="button"
          onClick={() => togglePauseRef.current()}
          style={styles.iconButton}
          aria-label={ui.paused ? "Reprendre la chasse" : "Mettre en pause"}
        >
          {ui.paused ? "▶" : "Ⅱ"}
        </button>
      </header>

      {/* Bloc : objectif courant annoncé aux lecteurs d’écran. */}
      <div style={styles.objectiveBar} aria-live="polite" aria-atomic="true">
        <div>
          <span style={styles.objectiveKicker}>OBJECTIF ACTIF</span>
          <strong style={styles.objectiveTitle}>{ui.objective}</strong>
          <span style={styles.objectiveDetail}>{ui.objectiveDetail}</span>
        </div>
        <div style={styles.stats}>
          <span>Honneur {ui.honor >= 0 ? "+" : ""}{ui.honor}</span>
          <span>Éliminations {ui.kills}</span>
          <span>Scans {ui.scans}</span>
          <span>
            Masque{" "}
            {!appearance.biomaskId ? "AUCUN" : ui.maskOn ? "ACTIF" : "RETIRÉ"}
          </span>
          <span>{ui.aiming ? "VISÉE CADRÉE" : "VISÉE LIBRE"}</span>
          <span>{ui.climbing ? "GRIMPE" : "AU SOL"}</span>
          <span>{formatTime(ui.elapsed)}</span>
        </div>
      </div>

      {ui.bossName ? (
        <div style={styles.bossBar} aria-label={`Cible Apex ${ui.bossName}`}>
          <div style={styles.bossLabels}>
            <strong>{ui.bossName}</strong>
            <span>{ui.bossPhase}</span>
          </div>
          <meter
            min={0}
            max={ui.bossMaxHealth}
            value={ui.bossHealth}
            aria-label={`Santé de ${ui.bossName}`}
            style={{ ...styles.meter, accentColor: mission.palette.danger }}
          />
        </div>
      ) : null}

      {/* Bloc : scène Canvas. Toute action reste doublée par un bouton DOM. */}
      <div style={styles.canvasFrame}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Vue latérale de la chasse sur ${mission.planetName}. ${ui.objective}`}
          tabIndex={0}
          onPointerMove={updatePointerScreen}
          onPointerDown={(event) => {
            event.currentTarget.focus();
            updatePointerScreen(event);
            if (event.button === 0) pressAction("melee");
            if (event.button === 2) {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setTouchHeld("aim", true);
            }
          }}
          onPointerUp={(event) => {
            updatePointerScreen(event);
            if (event.button === 2) setTouchHeld("aim", false);
          }}
          onPointerCancel={() => setTouchHeld("aim", false)}
          onLostPointerCapture={() => setTouchHeld("aim", false)}
          onAuxClick={(event) => {
            if (event.button === 2) event.preventDefault();
          }}
          onContextMenu={(event) => event.preventDefault()}
          style={styles.canvas}
        >
          Jeu de chasse en vue latérale. Utilise A et D pour te déplacer,
          Espace pour sauter, J pour attaquer, Maj ou clic droit pour viser et
          V pour scanner.
        </canvas>

        {!assetsReady ? (
          <div style={styles.loading} role="status" aria-live="polite">
            Synchronisation du biomask…
          </div>
        ) : null}

        {ui.message ? (
          <div style={styles.message} aria-live="polite">
            {ui.message}
          </div>
        ) : null}

        {ui.trophySeconds !== null ? (
          <div style={styles.trophyTimer} aria-live="polite">
            {ui.trophyExtraction > 0
              ? `EXTRACTION DU TROPHÉE · ${Math.round(ui.trophyExtraction * 100)} %`
              : `FENÊTRE DE TROPHÉE · ${Math.ceil(ui.trophySeconds)} s`}
          </div>
        ) : null}

        {ui.paused && ui.phase !== "dead" && ui.phase !== "finished" ? (
          <div style={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Chasse en pause">
            <div style={styles.modal}>
              <span style={styles.modalKicker}>BIOMASK EN VEILLE</span>
              <h2 style={styles.modalTitle}>Chasse en pause</h2>
              <p style={styles.modalCopy}>
                Les systèmes sont figés. Reprends quand tu es prêt à honorer le
                rite.
              </p>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  autoFocus
                  onClick={() => togglePauseRef.current()}
                  style={styles.primaryButton}
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={() => abortRef.current()}
                  style={styles.secondaryButton}
                >
                  Retour au vaisseau
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {ui.phase === "dead" ? (
          <div style={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Chasseur à terre">
            <div style={styles.modal}>
              <span style={{ ...styles.modalKicker, color: mission.palette.danger }}>
                SIGNAL VITAL PERDU
              </span>
              <h2 style={styles.modalTitle}>Le rite n’est pas terminé</h2>
              <p style={styles.modalCopy}>
                Reprends la chasse depuis l’insertion, ou accepte ce résultat
                dans les archives du clan.
              </p>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  autoFocus
                  onClick={() => restartRef.current()}
                  style={styles.primaryButton}
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={() => reportFailureRef.current()}
                  style={styles.secondaryButton}
                >
                  Rapport d’échec
                </button>
                <button
                  type="button"
                  onClick={() => abortRef.current()}
                  style={styles.ghostButton}
                >
                  Abandonner
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bloc : contrôles tactiles et aide clavier/manette. */}
      <div style={styles.controls}>
        <div style={styles.moveControls} aria-label="Déplacement tactile">
          <button
            type="button"
            {...makeHoldHandlers("left")}
            style={styles.controlButton}
            aria-label="Aller à gauche"
          >
            ◀
          </button>
          <button
            type="button"
            {...makeHoldHandlers("up")}
            style={styles.controlButton}
            aria-label="Grimper"
          >
            ⇧
          </button>
          <button
            type="button"
            {...makeHoldHandlers("right")}
            style={styles.controlButton}
            aria-label="Aller à droite"
          >
            ▶
          </button>
          <button
            type="button"
            {...makeHoldHandlers("down")}
            style={styles.controlButton}
            aria-label="Descendre d’un arbre ou d’une liane"
          >
            ⇩
          </button>
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              pressAction("jump");
            }}
            style={styles.controlButton}
            aria-label="Sauter"
          >
            ⤒
          </button>
        </div>

        <div style={styles.actionControls} aria-label="Actions tactiles">
          <ActionButton label="Lames" shortcut="J" onPress={() => pressAction("melee")} />
          <ActionButton label={weapon.shortName} shortcut="K" onPress={() => pressAction("weapon")} />
          <button
            type="button"
            {...makeHoldHandlers("aim")}
            style={{
              ...styles.actionButton,
              ...(ui.aiming ? styles.actionButtonActive : null),
            }}
            aria-pressed={ui.aiming}
            aria-label="Maintenir la visée cadrée"
          >
            <span>Viser</span>
            <kbd style={styles.kbd}>MAJ/LT</kbd>
          </button>
          <ActionButton
            label={ui.maskOn ? "Retirer masque" : "Mettre masque"}
            shortcut="M"
            active={ui.maskOn}
            onPress={() => pressAction("mask")}
          />
          <ActionButton label="Scan" shortcut="V" onPress={() => pressAction("scan")} />
          <ActionButton
            label={ui.cloaked ? "Visible" : "Camouflage"}
            shortcut="C"
            active={ui.cloaked}
            onPress={() => pressAction("cloak")}
          />
          <ActionButton label="Medicomp" shortcut="H" onPress={() => pressAction("heal")} />
          <ActionButton label="Interagir" shortcut="E" onPress={() => pressAction("interact")} />
        </div>
      </div>

      <footer style={styles.help}>
        <span>A/D ou flèches · déplacement</span>
        <span>W/S ou ↑/↓ · grimpe</span>
        <span>Espace · saut</span>
        <span>J/clic · lames</span>
        <span>Maj/clic droit/LT · viser</span>
        <span>K/RT · {weapon.name}</span>
        <span>M · biomask</span>
        <span>V · scan</span>
        <span>C · camouflage</span>
        <span>H · soin ({ui.medicomps})</span>
        <span>E · interaction</span>
        <span>Échap · pause</span>
        <span>Manette compatible</span>
      </footer>
    </section>
  );
}

function ResourceMeter({
  label,
  value,
  maximum,
  color,
}: {
  label: string;
  value: number;
  maximum: number;
  color: string;
}) {
  return (
    <label style={styles.resource}>
      <span style={styles.resourceLabel}>
        {label}
        <span>{Math.ceil(value)}/{Math.ceil(maximum)}</span>
      </span>
      <meter
        min={0}
        max={maximum}
        value={value}
        aria-label={label}
        style={{ ...styles.meter, accentColor: color }}
      />
    </label>
  );
}

function ActionButton({
  label,
  shortcut,
  active = false,
  onPress,
}: {
  label: string;
  shortcut: string;
  active?: boolean;
  onPress(): void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      style={{
        ...styles.actionButton,
        ...(active ? styles.actionButtonActive : null),
      }}
      aria-pressed={active || undefined}
      aria-label={`${label}, raccourci ${shortcut}`}
    >
      <span>{label}</span>
      <kbd style={styles.kbd}>{shortcut}</kbd>
    </button>
  );
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Self-contained presentation: the component can be integrated before the
// global game stylesheet without exposing an unstyled or inaccessible build.
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  shell: {
    width: "100%",
    maxWidth: 1440,
    margin: "0 auto",
    color: "#e8f7f1",
    fontFamily:
      '"Arial Narrow", "Roboto Condensed", "Segoe UI", system-ui, sans-serif',
    userSelect: "none",
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) minmax(320px, 1.5fr) auto",
    alignItems: "center",
    gap: 18,
    padding: "12px 14px",
    background: "linear-gradient(180deg, #07100fcc, #030706f2)",
    border: "1px solid #7ab79e44",
    borderBottom: 0,
    borderRadius: "16px 16px 0 0",
  },
  identity: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },
  phaseTag: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.2em",
  },
  missionTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 17,
    letterSpacing: "0.04em",
  },
  planet: {
    color: "#a7bbb4",
    fontSize: 12,
    letterSpacing: "0.1em",
  },
  resourceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(76px, 1fr))",
    gap: 10,
  },
  resource: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  resourceLabel: {
    display: "flex",
    justifyContent: "space-between",
    gap: 6,
    color: "#b5c8c1",
    fontSize: 10,
    letterSpacing: "0.04em",
  },
  meter: {
    width: "100%",
    height: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    border: "1px solid #8ed1b766",
    borderRadius: 10,
    background: "#11201bcc",
    color: "#e8f7f1",
    fontSize: 18,
    cursor: "pointer",
  },
  objectiveBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    minHeight: 62,
    padding: "9px 14px",
    background: "#08110ff2",
    borderInline: "1px solid #7ab79e44",
    borderTop: "1px solid #7ab79e24",
  },
  objectiveKicker: {
    display: "block",
    marginBottom: 2,
    color: "var(--hunt-accent)",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.18em",
  },
  objectiveTitle: {
    display: "block",
    fontSize: 14,
    letterSpacing: "0.03em",
  },
  objectiveDetail: {
    display: "block",
    maxWidth: 720,
    marginTop: 2,
    color: "#9eb2aa",
    fontSize: 11,
    lineHeight: 1.35,
  },
  stats: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "4px 14px",
    color: "#c8d9d3",
    fontSize: 10,
    letterSpacing: "0.04em",
  },
  bossBar: {
    display: "grid",
    gridTemplateColumns: "minmax(170px, auto) 1fr",
    alignItems: "center",
    gap: 16,
    padding: "7px 16px",
    background: "#160b0be8",
    borderInline: "1px solid #ff655944",
    borderTop: "1px solid #ff655933",
  },
  bossLabels: {
    display: "grid",
    gap: 1,
    fontSize: 12,
    letterSpacing: "0.06em",
  },
  canvasFrame: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    background: "#020504",
    border: "1px solid #7ab79e44",
    boxShadow: "0 22px 70px #00000099",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "auto",
    aspectRatio: "16 / 9",
    outline: "none",
    touchAction: "none",
    cursor: "crosshair",
  },
  loading: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "#020706cc",
    color: "var(--hunt-accent)",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.16em",
    pointerEvents: "none",
  },
  message: {
    position: "absolute",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    maxWidth: "min(84%, 760px)",
    padding: "9px 14px",
    border: "1px solid #9de8ca55",
    borderRadius: 9,
    background: "#06100ee8",
    color: "#eafbf4",
    boxShadow: "0 10px 30px #00000088",
    textAlign: "center",
    fontSize: 12,
    letterSpacing: "0.03em",
    pointerEvents: "none",
  },
  trophyTimer: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 14px",
    border: "1px solid var(--hunt-accent)",
    borderRadius: 8,
    background: "#06100eee",
    color: "var(--hunt-accent)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
  },
  modalBackdrop: {
    position: "absolute",
    inset: 0,
    zIndex: 5,
    display: "grid",
    placeItems: "center",
    padding: 22,
    background: "#010302d9",
    backdropFilter: "blur(5px)",
  },
  modal: {
    width: "min(100%, 460px)",
    padding: "28px",
    border: "1px solid #9de8ca55",
    borderRadius: 16,
    background:
      "linear-gradient(155deg, #11211df7, #050908f7 72%)",
    boxShadow: "0 24px 70px #000000cc",
    textAlign: "center",
  },
  modalKicker: {
    color: "var(--hunt-accent)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.18em",
  },
  modalTitle: {
    margin: "8px 0 7px",
    color: "#f1fff9",
    fontSize: "clamp(22px, 4vw, 34px)",
    lineHeight: 1.05,
  },
  modalCopy: {
    margin: "0 auto 20px",
    color: "#afc1ba",
    fontSize: 13,
    lineHeight: 1.55,
  },
  modalActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9,
  },
  primaryButton: {
    minHeight: 42,
    padding: "9px 18px",
    border: "1px solid var(--hunt-accent)",
    borderRadius: 9,
    background: "var(--hunt-accent)",
    color: "#04100c",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 42,
    padding: "9px 18px",
    border: "1px solid #9de8ca77",
    borderRadius: 9,
    background: "#12241ed9",
    color: "#e6f7f0",
    fontWeight: 800,
    cursor: "pointer",
  },
  ghostButton: {
    minHeight: 42,
    padding: "9px 14px",
    border: 0,
    borderRadius: 9,
    background: "transparent",
    color: "#a8bbb3",
    cursor: "pointer",
  },
  controls: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
  },
  moveControls: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 52px)",
    gap: 7,
  },
  controlButton: {
    minWidth: 48,
    minHeight: 48,
    border: "1px solid #9de8ca55",
    borderRadius: 12,
    background: "#0b1714e8",
    color: "#eafff7",
    fontSize: 19,
    fontWeight: 900,
    touchAction: "none",
    cursor: "pointer",
  },
  actionControls: {
    display: "flex",
    flex: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 7,
  },
  actionButton: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    border: "1px solid #769e8e55",
    borderRadius: 10,
    background: "#0a1311e8",
    color: "#dcebe5",
    fontSize: 11,
    fontWeight: 800,
    touchAction: "manipulation",
    cursor: "pointer",
  },
  actionButtonActive: {
    borderColor: "var(--hunt-accent)",
    background: "#15342b",
    color: "var(--hunt-accent)",
    boxShadow: "inset 0 0 18px #5ee8b822",
  },
  kbd: {
    minWidth: 22,
    padding: "3px 5px",
    border: "1px solid #9de8ca44",
    borderRadius: 5,
    background: "#020504",
    color: "#9eb2aa",
    fontFamily: "inherit",
    fontSize: 9,
    textAlign: "center",
  },
  help: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "5px 15px",
    padding: "8px 12px 16px",
    color: "#859991",
    fontSize: 10,
    letterSpacing: "0.03em",
  },
};
