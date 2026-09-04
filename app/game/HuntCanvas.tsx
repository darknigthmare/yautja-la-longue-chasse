"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DIFFICULTY_BY_ID,
  GEAR_BY_ID,
  WEAPON_BY_ID,
} from "./data";
import { trophyHuntVisualForDefinitionId } from "./trophyVisualRegistry";
import { drawEnvironmentProp } from "./environmentPropDrawing";
import { ExplorationMap } from "./ExplorationMap";
import { drawPilotBackdrop, drawPilotPlatform, drawPilotDevices } from "./pilotRendering";
import { PilotExplorationMap } from "./PilotExplorationMap";
import { IceExplorationMap } from "./IceExplorationMap";
import { ExpansionExplorationMap } from "./ExpansionExplorationMap";
import { drawIceRegionBackdrop, drawIceRegionPlatform, drawIceRegionDevices, ICE_REGION_TEXTURE_PATHS, type IceRegionTextures } from "./iceExplorationRendering";
import { ICE_MISSION_ID } from "./systems/iceExplorationRegion";
import { isExpansionExplorationMission } from "./systems/expansionExplorationRegions";
import { applyExplorationWorld, discoverExplorationRooms, interactWithExplorationRegion, explorationRegionHint } from "./systems/explorationRegions";
import { defaultExplorationProgress, normalizeExplorationProgress, mergeExplorationProgress, explorationBonuses, isExplorationMission, explorationForMission } from "./systems/explorationProgress";
import { PILOT_MISSION_ID } from "./systems/metroidvaniaPilot";
import { resolvePlatformMotion, overlapsSolidPlatform } from "./systems/platformCollision";
import { freshJumpAssistState, stepJumpAssist, predictLandingWithinBuffer, type JumpAssistState, type JumpAssistResult } from "./systems/jumpAssist";
import { discoverWorldScreen, normalizeVisitedScreenIds } from "./systems/explorationMap";
import {
  HUNTER_RIG_CANVAS,
  relativeBoneMatrix,
  solveHunterRig,
  type AffineMatrix,
  type HunterRigBoneId,
  type HunterRigFrame,
  type HunterRigPose,
  type RigPoint,
} from "./hunterRig";
import {
  HUNTER_ARMOR_FIT_BY_MORPH,
  HUNTER_ARMOR_MODULES,
  HUNTER_BODY_PART_BONES,
  HUNTER_BODY_PART_IDS,
  HUNTER_EQUIPMENT_V3,
  HUNTER_GAUNTLET_FIT_BY_MORPH,
  HUNTER_GAUNTLET_HINGE,
  hunterArmorPath,
  hunterBodyPartHasNet,
  hunterBodyFullPath,
  hunterBodyPartPath,
  hunterDreadPath,
  hunterMaskRigPath,
  hunterNetPartPath,
  type HunterBodyPartId,
} from "./hunterVisuals";
import {
  ageTracks,
  GUARDIAN_ADAPTATION,
  advanceScentField,
  calculateLineOfSightOcclusion,
  createAiBrain,
  createBossMechanicState,
  createHuntTrap,
  createScentNode,
  createTrackMark,
  perceivedNoise,
  receiveAiAlert,
  resolveHunterWeaponAttack,
  resolveHunterSplashDamage,
  resolveAiCoordinationFaction,
  resolveAiMovementLeash,
  sampleScentAt,
  sampleTracksAt,
  sampleWind,
  stepAiBrain,
  stepBossMechanics,
  stepHuntTrap,
  stepMudState,
  stepRegularAttackTelegraph,
  stepSmartDiscFlight,
  sweptProjectileImpactTime,
  hunterWeaponChargeRatio,
  type AiBrain,
  type AiCoordinationGroup,
  type BossEffectKind,
  type BossMechanicState,
  type HunterProjectileRecovery,
  type HuntTrap,
  type MudState,
  type NoiseEvent,
  type ScentNode,
  type TrackMark,
} from "./systems/huntSystems";
import {
  createArsenalRuntime,
  effectiveArmorStats,
  effectiveWeaponStats,
  removeGearEffect,
  tickArsenalRuntime,
  useGearSlot as activateArsenalGearSlot,
  type ArsenalRuntimeState,
  type GearEffectEvent,
} from "./systems/arsenal";
import {
  HUNT_MELEE_DODGE_INVULNERABILITY_SECONDS,
  HUNT_MELEE_EXECUTION_HEALTH_RATIO,
  canHuntMeleeHitTarget,
  canHuntMeleeParry,
  cancelHuntMeleeAttack,
  consumeHuntMeleeParry,
  createHuntMeleeState,
  currentHuntMeleeAttack,
  huntMeleeDodgeVelocity,
  huntMeleeHitboxOverlaps,
  isHuntMeleeDodgeInvulnerable,
  huntMeleeMovementMultiplier,
  huntMeleePhaseLabel,
  huntMeleeStaminaMultiplier,
  normalizeHuntMeleeState,
  registerHuntMeleeTargetHit,
  requestHuntMeleeAttack,
  requestHuntMeleeDodge,
  requestHuntMeleeParry,
  requestHuntMeleeTechniqueAttack,
  resolveHuntMeleeHitbox,
  stepHuntMeleeCombat,
  stepHuntMeleeVerticalReaction,
  type HuntMeleeActionKind,
  type HuntMeleeState,
} from "./systems/huntMeleeCombat";
import {
  createDropShipArrival,
  createTrophyRitual,
  createTrophyVictory,
  dropShipVisual,
  isTrophyExtractionProtected,
  stepDropShip,
  stepTrophyRitual,
  stepTrophyVictory,
  trophyRitualProgress,
  trophyRitualReadyRemaining,
  trophyVictoryPose,
  TROPHY_RITUAL_TIMING,
  type DropShipState,
  type TrophyRitualAction,
  type TrophyRitualState,
  type TrophyVictoryState,
} from "./systems/trophyRitual";
import {
  hazardPhaseAt,
  isHazardActive,
  resolveNearestSafeGroundX,
  safeObjectiveGroundPositions,
  safeCheckpointPositions,
  worldBlueprintFor,
  type TrackSurface,
  type WorldBlueprint,
  type WorldClimbable,
  type WorldPlatform,
} from "./systems/worldBlueprints";
import {
  backgroundPathForBiome,
  getWorldScreenAtX,
  worldScreensFor,
  type WorldScreenSector,
} from "./worldScreens";
import {
  getV6Visual,
  resolveV6TrophyVisualId,
  V6_MISSION_VISUALS,
  type V6VisualId,
} from "./v6Visuals";
import {
  ENEMY_V7_BY_ID,
  enemyV7ForId,
  enemyV7ForWave,
  enemyV7IdsForMission,
  isEnemyV7RosterEncounter,
  type EnemyV7Id,
} from "./enemyRosterV7";
import {
  ECOLOGY_V8_BOSS_ENEMY_IDS,
  ecologyV8EnemyForId,
  type EcologyV8EnemyDefinition,
} from "./ecologyV8";
import {
  createEcologyEncounterDeck,
  ecologyEncounterEnemyAt,
  ecologyV8RuntimeProfile,
} from "./ecologyEncounterV8";
import { enemyTrophyGameplayForEnemyId } from "./enemyTrophyGameplayV18";
import { controlActionShortcut } from "./controlBindingLabels";
import {
  DEFAULT_CONTROL_BINDINGS,
  matchingControlActions,
  type ControlActionId,
  type ControlBindings,
} from "./systems/controlBindings";
import {
  isBoundedJsonValue,
  type JsonObject,
} from "./systems/activeHuntSave";
import {
  cullEnvironmentDecorPlacements,
  environmentDecorPlacementsForMission,
  environmentGameplayPropForGeometryId,
  environmentPropRuntimeUrlsForSector,
  type EnvironmentDecorPropPlacement,
  type EnvironmentPropRuntimeAsset,
} from "./environmentPropRegistry";
import {
  evaluateMissionHonorRules,
  honorRuleEventId,
} from "./honorRules";
import type { GameSfxId } from "./sound";
import type {
  DifficultyId,
  ExplorationProgress,
  GearId,
  HunterAppearance,
  HonorEvent,
  LaserColorId,
  Loadout,
  MissionDefinition,
  MissionResult,
  PlayerInventory,
  TrophyClaim,
  TrophyPartId,
  TrophyQuality,
  WeaponId,
} from "./types";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

interface HuntCanvasProps {
  mission: MissionDefinition;
  encounterRun: number;
  loadout: Loadout;
  inventory: PlayerInventory;
  difficulty: DifficultyId;
  controlBindings?: ControlBindings;
  appearance: HunterAppearance;
  reducedGore: boolean;
  screenShake: boolean;
  highContrastVision: boolean;
  onSound?(sound: GameSfxId): void;
  explorationProgress?: ExplorationProgress;
  onExplorationProgress?(progress: ExplorationProgress): void;
  onFinish(result: MissionResult): void;
  onAbort(result: MissionResult): void;
  resumeSnapshot?: JsonObject | null;
  resumeRetryCheckpoint?: JsonObject | null;
  onPersistHunt?(payload: HuntPersistencePayload): void;
  onSuspendHunt?(payload: HuntPersistencePayload): void;
  onInvalidateHunt?(): void;
  onResumeFailure?(): void;
}

export interface HuntPersistencePayload {
  snapshot: JsonObject;
  retryCheckpoint: JsonObject | null;
  elapsed: number;
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
  | "weaponOne"
  | "weaponTwo"
  | "weaponNext"
  | "aim"
  | "mask"
  | "scan"
  | "cloak"
  | "heal"
  | "gearOne"
  | "gearTwo"
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

type Platform = WorldPlatform;
type ClimbZone = WorldClimbable;

interface PlayerState extends Vec2 {
  previousY: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  facing: -1 | 1;
  grounded: boolean;
  aerialBoostUsed: boolean;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  energy: number;
  maxEnergy: number;
  medicomps: number;
  activeWeaponSlot: 0 | 1;
  weaponAmmo: [number, number];
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
  melee: HuntMeleeState;
  invulnerability: number;
  meleeCooldown: number;
  weaponCooldown: number;
  weaponChargeSeconds: number;
  scanCooldown: number;
  healCooldown: number;
}

interface EnemyState extends Vec2 {
  id: string;
  kind: EnemyKind;
  archetype: string;
  factionId: string;
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
  pendingAttackId: string | null;
  restrainedUntil: number;
  hitFlash: number;
  hitStunSeconds: number;
  knockbackVelocityX: number;
  knockbackVelocityY: number;
  knockbackRestY: number;
  scanned: boolean;
  alive: boolean;
  deathAnimation: number;
  boss: boolean;
  active: boolean;
  /** Scheduled wave activation; null for already materialised agents/bosses. */
  waveActivationAt: number | null;
  lastTrackX: number;
  lastTrackAt: number;
}

type TrackOwnerSpecies = "hunter" | EnemyKind;

/** TrackMark enriched for biomask identification and species-specific art. */
interface ObservedTrackMark extends TrackMark {
  ownerId: string;
  ownerLabel: string;
  ownerSpecies: TrackOwnerSpecies;
  strideIndex: number;
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
  coverGraceSeconds: number;
  weaponSlotIndex?: 0 | 1;
  maximumAmmo?: number;
  recovery?: HunterProjectileRecovery;
  spentPickup?: boolean;
  hitEnemyIds?: string[];
  maxTargetHits?: number;
  splashRadius?: number;
  returning?: boolean;
  outboundSeconds?: number;
  flightSpeed?: number;
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

/**
 * A secondary physical claim left by a regular enemy. Apex trophy state stays
 * separate because only the mission target can trigger victory and extraction.
 */
interface RegularTrophyDrop extends Vec2 {
  id: string;
  enemyRuntimeId: string;
  sourceEnemyId: string;
  name: string;
  claim: TrophyClaim;
  collected: boolean;
}

interface GearSlotSnapshot {
  gearId: GearId;
  name: string;
  charges: number;
  maxCharges: number;
  cooldownRemainingSeconds: number;
}

interface MissionCheckpointPayload {
  exploration?: ExplorationProgress;
  visitedScreenIds?: string[];
  phase: HuntPhase;
  elapsed: number;
  player: PlayerState;
  projectiles: ProjectileState[];
  scentNodes: ScentNode[];
  noiseEvents: NoiseEvent[];
  tracks: ObservedTrackMark[];
  enemies: EnemyState[];
  aiBrains: Record<string, AiBrain>;
  scanNodes: ScanNode[];
  recoveryNodes: RecoveryNode[];
  purgeConsoleNodes: RecoveryNode[];
  regularTrophyDrops: RegularTrophyDrop[];
  regularTrophyDropId: string | null;
  spawnedWaves: Set<string>;
  ecologySpawnIndex: number;
  completedObjectives: Set<string>;
  honorEvents: HonorEvent[];
  honor: number;
  kills: number;
  scans: number;
  supportKills: number;
  damageTaken: number;
  secondWindUsed: boolean;
  boss: EnemyState;
  bossMechanics: BossMechanicState;
  bossVulnerabilityMultiplier: number;
  bossThermalVisibility: number;
  energyWeaponsLocked: boolean;
  brokenPillarIds: Set<string>;
  mud: MudState;
  bossHitPillar: boolean;
  disabledConsoleId: string | null;
  playerUsedRangedWeapon: boolean;
  playerUsedEnergyWeapon: boolean;
  bossDefeatedAt: number | null;
  trophyClaimedAt: number | null;
  trophyQuality: TrophyQuality | null;
  trophyClaim: TrophyClaim | null;
  trophyExtracting: boolean;
  trophyExtraction: number;
  trophyCarried: boolean;
  trophyRitual: TrophyRitualState | null;
  trophyVictory: TrophyVictoryState | null;
  dropShip: DropShipState | null;
  rangedBossViolation: boolean;
  nextProjectileId: number;
  nextSignalId: number;
  arsenal: ArsenalRuntimeState;
  traps: HuntTrap[];
}

type HunterArmorAssetId =
  | "chest"
  | "shoulder"
  | "belt"
  | "bracer"
  | "thigh"
  | "knee"
  | "thighLower"
  | "shin";

type HunterPlasmaAssetId = keyof typeof HUNTER_EQUIPMENT_V3.plasma;
type HunterGauntletAssetId = keyof typeof HUNTER_EQUIPMENT_V3.gauntlet;
type HunterWristbladeAssetId =
  keyof typeof HUNTER_EQUIPMENT_V3.wristblades;

const HUNTER_LOADOUT_ASSET_ROOT =
  "/game/assets/v3/actors/yautja/hunter" as const;

const HUNTER_WEAPON_VISUAL_IDS = [
  "combistick",
  "combistick-folded",
  "smart-disc",
  "yautja-bow",
  "arrow",
] as const;

const HUNTER_TROPHY_VISUAL_IDS = [
  "trophy-spine",
  "trophy-skull",
  "trophy-bindings",
] as const;

type HunterWeaponVisualId = (typeof HUNTER_WEAPON_VISUAL_IDS)[number];
type HunterTrophyVisualId = (typeof HUNTER_TROPHY_VISUAL_IDS)[number];
const ENEMY_V4_SPRITE_IDS = [
  "scout",
  "rifle-soldier",
  "heavy",
  "cryostalker-runner",
  "cryostalker-brute",
  "bad-blood-initiate",
  "commandante-vey",
] as const;
type EnemyV4SpriteId = (typeof ENEMY_V4_SPRITE_IDS)[number];
type HunterHandWeaponId = Extract<
  WeaponId,
  "combistick" | "smart-disc" | "yautja-bow"
>;

function hunterRegisteredAssetPath(
  category: "weapons" | "gear" | "trophies",
  assetId: string,
): string {
  return `${HUNTER_LOADOUT_ASSET_ROOT}/${category}/registered/${assetId}.webp`;
}

function selectedHandWeapon(
  loadout: Loadout,
  slotIndex: 0 | 1,
): HunterHandWeaponId | null {
  const weaponId = loadout.weaponIds[slotIndex];
  return weaponId === "combistick" ||
    weaponId === "smart-disc" ||
    weaponId === "yautja-bow"
    ? weaponId
    : null;
}

interface AssetBank {
  background: HTMLImageElement | null;
  farLake: HTMLImageElement | null;
  hunterBodyFull: HTMLImageElement | null;
  hunterBodyParts: Record<HunterBodyPartId, HTMLImageElement | null>;
  hunterNetParts: Record<HunterBodyPartId, HTMLImageElement | null>;
  hunterDreads: HTMLImageElement | null;
  hunterMask: HTMLImageElement | null;
  hunterArmor: Record<HunterArmorAssetId, HTMLImageElement | null>;
  hunterPlasma: Record<HunterPlasmaAssetId, HTMLImageElement | null>;
  hunterGauntlet: Record<HunterGauntletAssetId, HTMLImageElement | null>;
  hunterWristblades: Record<HunterWristbladeAssetId, HTMLImageElement | null>;
  hunterWeapons: Record<HunterWeaponVisualId, HTMLImageElement | null>;
  hunterGear: Record<GearId, HTMLImageElement | null>;
  hunterTrophies: Record<HunterTrophyVisualId, HTMLImageElement | null>;
  treeTrunk: HTMLImageElement | null;
  vineLadder: HTMLImageElement | null;
  platformRoot: HTMLImageElement | null;
  platformStone: HTMLImageElement | null;
  pilotModule: HTMLImageElement | null;
  iceRegionTextures: IceRegionTextures;
  platformCrown: HTMLImageElement | null;
  platformExpedition: HTMLImageElement | null;
  foregroundFerns: HTMLImageElement | null;
  foregroundVines: HTMLImageElement | null;
  foregroundReeds: HTMLImageElement | null;
  enemyV4: Record<EnemyV4SpriteId, HTMLImageElement | null>;
  enemyV7: Partial<Record<EnemyV7Id, HTMLImageElement | null>>;
  enemyV8: Partial<Record<string, HTMLImageElement | null>>;
  enemyTrophies: Partial<Record<string, HTMLImageElement | null>>;
  campaignTrophies: Partial<Record<string, HTMLImageElement | null>>;
  mercenary: HTMLImageElement | null;
  cryostalker: HTMLImageElement | null;
  badBlood: HTMLImageElement | null;
  shipsAtlas: HTMLImageElement | null;
  preyAtlas: HTMLImageElement | null;
  masksTrophiesAtlas: HTMLImageElement | null;
  ranksLasersAtlas: HTMLImageElement | null;
  environmentProps: Partial<Record<string, HTMLImageElement | null>>;
}

type HuntDialogGamepadAction = "previous" | "next" | "activate";

interface InputHub {
  keyboardHeld: Set<Action>;
  touchHeld: Set<Action>;
  gamepadHeld: Set<Action>;
  pressed: Set<Action>;
  previousGamepadButtons: boolean[];
  activeGamepadIndex: number | null;
  gamepadNeedsNeutral: boolean;
  gamepadDialogActions: HuntDialogGamepadAction[];
  pointerScreen: Vec2 | null;
}

interface GameState {
  phase: HuntPhase;
  paused: boolean;
  elapsed: number;
  cameraX: number;
  worldScreenId: string;
  visitedScreenIds: string[];
  exploration: ExplorationProgress;
  jumpAssist: JumpAssistState;
  player: PlayerState;
  world: WorldBlueprint;
  arsenal: ArsenalRuntimeState;
  traps: HuntTrap[];
  enemies: EnemyState[];
  aiBrains: Record<string, AiBrain>;
  projectiles: ProjectileState[];
  goreParticles: GoreParticle[];
  scentNodes: ScentNode[];
  noiseEvents: NoiseEvent[];
  tracks: ObservedTrackMark[];
  mud: MudState;
  scanNodes: ScanNode[];
  recoveryNodes: RecoveryNode[];
  purgeConsoleNodes: RecoveryNode[];
  regularTrophyDrops: RegularTrophyDrop[];
  regularTrophyDropId: string | null;
  spawnedWaves: Set<string>;
  ecologyDeck: readonly EcologyV8EnemyDefinition[];
  ecologySpawnIndex: number;
  completedObjectives: Set<string>;
  honorEvents: HonorEvent[];
  honor: number;
  kills: number;
  scans: number;
  supportKills: number;
  damageTaken: number;
  secondWindUsed: boolean;
  boss: EnemyState;
  bossMechanics: BossMechanicState;
  bossVulnerabilityMultiplier: number;
  bossThermalVisibility: number;
  energyWeaponsLocked: boolean;
  bossHitPillar: boolean;
  brokenPillarIds: Set<string>;
  disabledConsoleId: string | null;
  playerUsedRangedWeapon: boolean;
  playerUsedEnergyWeapon: boolean;
  bossDefeatedAt: number | null;
  trophyClaimedAt: number | null;
  trophyQuality: TrophyQuality | null;
  trophyClaim: TrophyClaim | null;
  trophyExtracting: boolean;
  trophyExtraction: number;
  trophyCarried: boolean;
  trophyRitual: TrophyRitualState | null;
  trophyVictory: TrophyVictoryState | null;
  dropShip: DropShipState | null;
  scanPulse: number;
  message: string;
  messageTimer: number;
  screenShake: number;
  rangedBossViolation: boolean;
  failureReported: boolean;
  nextProjectileId: number;
  nextSignalId: number;
  lastTrackX: number;
  lastTrackAt: number;
  nextScentAt: number;
  environmentDamage: number;
  soundEvents: GameSfxId[];
  checkpointPositions: number[];
  nextCheckpointIndex: number;
  lastCheckpoint: MissionCheckpointPayload | null;
  reducedGore: boolean;
  screenShakeEnabled: boolean;
}

interface UiSnapshot {
  playerX: number;
  playerY: number;
  exploration: ExplorationProgress;
  pilotHint: string | null;
  aerialBoostUsed: boolean;
  grounded: boolean;
  visitedScreenIds: string[];
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
  activeWeaponSlot: 0 | 1;
  cloaked: boolean;
  maskOn: boolean;
  aiming: boolean;
  climbing: boolean;
  gearSlots: [GearSlotSnapshot, GearSlotSnapshot];
  checkpointLabel: string;
  trophyExtraction: number;
  trophyCue: TrophyRitualAction | null;
  trophyCueIndex: number;
  trophyCueCount: number;
  trophyCueTiming: number;
  trophyMistakes: number;
  dropShipPhase: DropShipState["phase"] | null;
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

const LASER_COLOR_HEX: Readonly<Record<LaserColorId, string>> = {
  crimson: "#ff302a",
  electric: "#2989ff",
  amber: "#ffb12b",
  violet: "#b847ff",
  cyan: "#40efff",
};
const FLOOR_Y = 624;
const GRAVITY = 1_850;

const HUNT_CONTROL_ACTIONS: Readonly<
  Partial<Record<ControlActionId, Action>>
> = {
  "hunt.moveLeft": "left",
  "hunt.moveRight": "right",
  "hunt.moveUp": "up",
  "hunt.moveDown": "down",
  "hunt.jump": "jump",
  "hunt.melee": "melee",
  "hunt.weaponPrimary": "weapon",
  "hunt.selectWeaponOne": "weaponOne",
  "hunt.selectWeaponTwo": "weaponTwo",
  "hunt.nextWeapon": "weaponNext",
  "hunt.aim": "aim",
  "hunt.toggleMask": "mask",
  "hunt.scan": "scan",
  "hunt.toggleCloak": "cloak",
  "hunt.heal": "heal",
  "hunt.useGearOne": "gearOne",
  "hunt.useGearTwo": "gearTwo",
  "hunt.interact": "interact",
  "hunt.pause": "pause",
};

function isHeldKeyboardAction(action: Action): boolean {
  return (
    action === "left" ||
    action === "right" ||
    action === "up" ||
    action === "down" ||
    action === "jump" ||
    action === "aim"
  );
}

const EMPTY_UI: UiSnapshot = {
  playerX: 0,
  playerY: 0,
  exploration: defaultExplorationProgress(),
  pilotHint: null,
  aerialBoostUsed: false,
  grounded: true,
  visitedScreenIds: [],
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
  activeWeaponSlot: 1,
  cloaked: false,
  maskOn: true,
  aiming: false,
  climbing: false,
  gearSlots: [
    {
      gearId: "motion-sensor",
      name: "Capteur",
      charges: 0,
      maxCharges: 0,
      cooldownRemainingSeconds: 0,
    },
    {
      gearId: "audio-decoy",
      name: "Leurre",
      charges: 0,
      maxCharges: 0,
      cooldownRemainingSeconds: 0,
    },
  ],
  checkpointLabel: "Insertion",
  trophyExtraction: 0,
  trophyCue: null,
  trophyCueIndex: 0,
  trophyCueCount: 0,
  trophyCueTiming: 0,
  trophyMistakes: 0,
  dropShipPhase: null,
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

const HUNTER_BIND_FRAME = solveHunterRig({
  pose: "idle",
  facing: 1,
  phase: 0,
  aimAngle: 0,
  scale: 1,
  worldX: 0,
  worldY: 0,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Maps simulation state to the canonical V3 rig without mutating gameplay.
 * Collision dimensions remain owned by PlayerState; the rig only resolves
 * visual bones and shared equipment anchors in world coordinates.
 */
function solvePlayerRigFrame(
  state: GameState,
  player: PlayerState = state.player,
  handAimAngle?: number,
): HunterRigFrame {
  let pose: HunterRigPose;
  let phase: number;
  let extractionProgress = state.trophyExtraction;

  if (state.trophyExtracting) {
    pose = "extract";
    phase = state.trophyExtraction;
  } else if (state.trophyVictory && !state.trophyVictory.complete) {
    pose = "extract";
    extractionProgress = trophyVictoryPose(state.trophyVictory);
    phase = extractionProgress;
  } else if (player.climbing) {
    pose = "climb";
    phase = state.elapsed * (0.55 + Math.abs(player.velocityY) / 280);
  } else if (!player.grounded) {
    if (player.velocityY < 0) {
      pose = "jump";
      phase = clamp((player.velocityY + 720) / 1_440, 0, 0.5);
    } else {
      pose = "fall";
      phase = state.elapsed * 0.18;
    }
  } else if (Math.abs(player.velocityX) > 24) {
    pose = "run";
    phase = state.elapsed * Math.max(0.7, Math.abs(player.velocityX) / 155);
  } else {
    pose = "idle";
    phase = state.elapsed * 0.24;
  }

  const scale = player.height / HUNTER_RIG_CANVAS.height;
  return solveHunterRig({
    pose,
    phase,
    facing: player.facing,
    speed: player.velocityX,
    verticalVelocity: player.velocityY,
    aimAngle: player.aiming ? player.aimAngle : undefined,
    handAimAngle,
    recoil: clamp(player.weaponCooldown * 8, 0, 1),
    extractionProgress,
    scale,
    worldX:
      player.x +
      player.width / 2 -
      HUNTER_RIG_CANVAS.width / 2,
    worldY:
      player.y +
      player.height -
      HUNTER_RIG_CANVAS.groundY,
  });
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
  const v8Enemy = ecologyV8EnemyForId(archetype);
  if (v8Enemy) return ecologyV8RuntimeProfile(v8Enemy).kind;
  const v7Enemy = enemyV7ForId(archetype);
  if (v7Enemy) return v7Enemy.runtimeKind;
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

const AUTOMATON_COORDINATION_MARKER =
  /(?:^|-)(?:automaton|construct|drone|exosuit|guardian|mech|security-synth|sentinel|synth)(?:-|$)/;

/** Keep shared alerts inside factions that can plausibly coordinate. */
function enemyCoordinationGroup(
  archetype: string,
  kind: EnemyKind,
): AiCoordinationGroup {
  const definition =
    ecologyV8EnemyForId(archetype) ?? enemyV7ForId(archetype);
  const category = definition?.category;
  const normalizedArchetype = archetype.toLocaleLowerCase("en");
  if (
    category === "bad-blood" ||
    kind === "yautja" ||
    normalizedArchetype.includes("bad-blood")
  ) {
    return "bad-blood";
  }
  if (normalizedArchetype.includes("xeno")) return "xeno";
  if (
    (category === "other" || category === "humanoid" || !category) &&
    AUTOMATON_COORDINATION_MARKER.test(normalizedArchetype)
  ) {
    return "automaton";
  }
  if (category === "humanoid" || kind === "human") return "human";
  if (category === "flora") return "flora";
  if (category === "fauna" || kind === "beast") return "fauna";
  return "other";
}

function enemyCoordinationFactionId(
  archetype: string,
  kind: EnemyKind,
  missionId: MissionDefinition["id"],
): string {
  return resolveAiCoordinationFaction({
    group: enemyCoordinationGroup(archetype, kind),
    archetype,
    missionId,
  });
}

function bossArchetype(mission: MissionDefinition): string {
  return ECOLOGY_V8_BOSS_ENEMY_IDS[mission.id] ?? `boss-${mission.id}`;
}

function backgroundPath(mission: MissionDefinition): string {
  return backgroundPathForBiome(mission.biome);
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

function equippedWeapon(loadout: Loadout, slotIndex: 0 | 1) {
  return WEAPON_BY_ID[loadout.weaponIds[slotIndex]];
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
  const v8BossId = ECOLOGY_V8_BOSS_ENEMY_IDS[mission.id];
  if (v8BossId && assets.enemyV8[v8BossId]) {
    return assets.enemyV8[v8BossId] ?? null;
  }
  if (mission.biome === "ice") return assets.cryostalker;
  if (mission.biome === "volcano") return assets.badBlood;
  return assets.enemyV4["commandante-vey"] ?? assets.mercenary;
}

function enemySprite(
  enemy: EnemyState,
  mission: MissionDefinition,
  assets: AssetBank,
): HTMLImageElement | null {
  if (enemy.boss) return bossSprite(mission, assets);
  if (ENEMY_V4_SPRITE_IDS.includes(enemy.archetype as EnemyV4SpriteId)) {
    return assets.enemyV4[enemy.archetype as EnemyV4SpriteId];
  }
  if (enemy.kind === "beast") {
    return assets.enemyV4["cryostalker-runner"] ?? assets.cryostalker;
  }
  if (enemy.kind === "yautja") {
    return assets.enemyV4["bad-blood-initiate"] ?? assets.badBlood;
  }
  return assets.enemyV4["rifle-soldier"] ?? assets.mercenary;
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
  missionId: MissionDefinition["id"],
  x: number,
  worldWidth: number,
  health: number,
  damage: number,
  moveSpeed: number,
  healthMultiplier: number,
  damageMultiplier: number,
): EnemyState {
  const kind = enemyKind(archetype);
  const v8Enemy = ecologyV8EnemyForId(archetype);
  const v8Profile = v8Enemy ? ecologyV8RuntimeProfile(v8Enemy) : null;
  const v7Enemy = enemyV7ForId(archetype);
  const beast = kind === "beast";
  const yautja = kind === "yautja";
  const width =
    v8Profile?.width ?? v7Enemy?.width ?? (beast ? 104 : yautja ? 74 : 66);
  const height =
    v8Profile?.height ?? v7Enemy?.height ?? (beast ? 84 : yautja ? 112 : 94);
  const baseY = FLOOR_Y - height;
  const spawnY =
    v8Profile?.mobility === "flying"
      ? baseY - 92 - (id.length % 4) * 14
      : baseY;
  const scaledHealth =
    health * healthMultiplier * (v8Profile?.healthScale ?? 1);
  return {
    id,
    archetype,
    kind,
    factionId: enemyCoordinationFactionId(archetype, kind, missionId),
    x,
    y: spawnY,
    width,
    height,
    velocityX: 0,
    facing: -1,
    health: scaledHealth,
    maxHealth: scaledHealth,
    damage: damage * damageMultiplier * (v8Profile?.damageScale ?? 1),
    moveSpeed: moveSpeed * (v8Profile?.speedScale ?? 1),
    patrolLeft: Math.max(120, x - 190),
    patrolRight: Math.min(worldWidth - 120, x + 190),
    attackCooldown: 0.55 + ((id.length * 0.17 + x * 0.013) % 0.85),
    telegraph: 0,
    pendingAttackId: null,
    restrainedUntil: 0,
    hitFlash: 0,
    hitStunSeconds: 0,
    knockbackVelocityX: 0,
    knockbackVelocityY: 0,
    knockbackRestY: spawnY,
    scanned: false,
    alive: true,
    deathAnimation: 0,
    boss: false,
    active: true,
    waveActivationAt: null,
    lastTrackX: x,
    lastTrackAt: 0,
  };
}

function makeGameState(
  mission: MissionDefinition,
  loadout: Loadout,
  inventory: PlayerInventory,
  difficulty: DifficultyId,
  appearance: HunterAppearance,
  reducedGore: boolean,
  screenShakeEnabled: boolean,
  ecologyRunSeed: string | number = `${Date.now()}-${Math.random()}`,
  explorationProgress?: ExplorationProgress,
): GameState {
  const exploration = normalizeExplorationProgress(explorationProgress);
  const world = applyExplorationWorld(worldBlueprintFor(mission.id), exploration);
  const armor = effectiveArmorStats(
    loadout.armorId,
    inventory.armorUpgrades[loadout.armorId] ?? 0,
  );
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  const weaponAmmo = loadout.weaponIds.map((weaponId) => {
    const weapon = effectiveWeaponStats(
      weaponId,
      inventory.weaponUpgrades[weaponId] ?? 0,
    );
    return weapon.ammo ?? -1;
  }) as [number, number];
  const scanCount = Math.max(
    1,
    objectiveByKind(mission, "scan")?.targetCount ?? 3,
  );
  const recoverCount = objectiveByKind(mission, "recover")?.targetCount ?? 0;
  const scanStartX = world.width * 0.11;
  const scanEndX = world.width * 0.37;
  const scanNodes = Array.from({ length: scanCount }, (_, index) => ({
    id: `trace-${index + 1}`,
    x:
      scanCount === 1
        ? (scanStartX + scanEndX) / 2
        : scanStartX + (scanEndX - scanStartX) * (index / (scanCount - 1)),
    y: index % 2 === 0 ? FLOOR_Y - 36 : 395,
    scanned: false,
  }));
  const recoveryStartX = world.width * 0.44;
  const recoveryEndX = Math.max(
    recoveryStartX,
    world.bossArena.x - 420,
  );
  const recoveryNodeXs = safeObjectiveGroundPositions(
    world,
    recoverCount,
    { minX: recoveryStartX, maxX: recoveryEndX },
  );
  const recoveryNodes = Array.from({ length: recoverCount }, (_, index) => ({
    id: `technology-${index + 1}`,
    x: recoveryNodeXs[index],
    y: FLOOR_Y - 34,
    recovered: false,
  }));
  const usesV7Roster = isEnemyV7RosterEncounter(
    mission.id,
    ecologyRunSeed,
  );
  const ecologyDeck = usesV7Roster
    ? []
    : createEcologyEncounterDeck(
        mission.id,
        ecologyRunSeed,
        mission.enemyWaves.reduce((total, wave) => total + wave.count, 0),
      );
  const bossIdentityId = bossArchetype(mission);
  const bossEcology = ecologyV8EnemyForId(bossIdentityId);
  const bossEcologyProfile = bossEcology
    ? ecologyV8RuntimeProfile(bossEcology)
    : null;
  const bossKind: EnemyKind =
    mission.boss.silhouette === "beast"
      ? "beast"
      : mission.boss.silhouette === "yautja"
        ? "yautja"
        : "human";
  const bossHeight = bossEcologyProfile
    ? Math.max(142, Math.round(bossEcologyProfile.height * 1.32))
    : bossKind === "beast"
      ? 142
      : 154;
  const bossWidth = bossEcologyProfile
    ? Math.max(156, Math.round(bossEcologyProfile.width * 1.38))
    : bossKind === "beast"
      ? 168
      : 106;
  const bossX = Math.min(
    world.bossArena.x + world.bossArena.width * 0.48,
    world.bossArena.x + world.bossArena.width - bossWidth - 60,
  );
  const bossPatrolLeft = world.bossArena.x + 30;
  const bossPatrolRight =
    world.bossArena.x + world.bossArena.width - bossWidth - 30;

  const state: GameState = {
    phase: "tracking",
    paused: false,
    elapsed: 0,
    cameraX: 0,
    worldScreenId: getWorldScreenAtX(mission.id, world.spawn.x).id,
    visitedScreenIds: discoverWorldScreen(mission.id, [], world.spawn.x),
    exploration,
    jumpAssist: freshJumpAssistState(),
    world,
    arsenal: createArsenalRuntime({
      loadout,
      inventory,
      difficultyId: difficulty,
    }),
    traps: [],
    player: {
      x: world.spawn.x,
      y: world.floorY - 116,
      previousY: world.floorY - 116,
      width: 72,
      height: 116,
      velocityX: 0,
      velocityY: 0,
      facing: 1,
      grounded: true,
      aerialBoostUsed: false,
      health: armor.maxHealth,
      maxHealth: armor.maxHealth,
      stamina: armor.maxStamina,
      maxStamina: armor.maxStamina,
      energy: armor.maxEnergy + explorationBonuses(exploration).maxEnergy,
      maxEnergy: armor.maxEnergy + explorationBonuses(exploration).maxEnergy,
      medicomps: Math.max(
        0,
        armor.medicompCharges + difficultyDef.medicompModifier,
      ),
      activeWeaponSlot: 1,
      weaponAmmo,
      cloaked: false,
      maskOn: appearance.biomaskId !== null,
      aiming: false,
      aimAngle: 0,
      aimPoint: { x: 650, y: FLOOR_Y - 90 },
      climbing: false,
      climbZoneId: null,
      gauntletOpen: 0,
      bladeExtension: 0,
      dreadAngles: [0, 0, 0, 0, 0, 0, 0],
      dreadVelocities: [0, 0, 0, 0, 0, 0, 0],
      attackFlash: 0,
      melee: createHuntMeleeState(),
      invulnerability: 0,
      meleeCooldown: 0,
      weaponCooldown: 0,
      weaponChargeSeconds: 0,
      scanCooldown: 0,
      healCooldown: 0,
    },
    enemies: [],
    aiBrains: {},
    projectiles: [],
    goreParticles: [],
    scentNodes: [],
    noiseEvents: [],
    tracks: [],
    mud: {
      coating: 0,
      wetness: 0,
      thermalVisibility: 1,
      cloakShimmer: 0.08,
      footprintMultiplier: 0.15,
      scentMultiplier: 1,
    },
    scanNodes,
    recoveryNodes,
    purgeConsoleNodes: [
      {
        id: "purge-a",
        x: world.bossArena.x + world.bossArena.width * 0.2,
        y: FLOOR_Y - 46,
        recovered: false,
      },
      {
        id: "purge-b",
        x: world.bossArena.x + world.bossArena.width * 0.5,
        y: FLOOR_Y - 46,
        recovered: false,
      },
      {
        id: "purge-c",
        x: world.bossArena.x + world.bossArena.width * 0.8,
        y: FLOOR_Y - 46,
        recovered: false,
      },
    ],
    regularTrophyDrops: [],
    regularTrophyDropId: null,
    spawnedWaves: new Set(),
    ecologyDeck,
    ecologySpawnIndex: 0,
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
      archetype: bossIdentityId,
      kind: bossKind,
      factionId: enemyCoordinationFactionId(
        bossIdentityId,
        bossKind,
        mission.id,
      ),
      x: bossX,
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
      patrolLeft: bossPatrolLeft,
      patrolRight: bossPatrolRight,
      attackCooldown: 1.5,
      telegraph: 0,
      pendingAttackId: null,
      restrainedUntil: 0,
      hitFlash: 0,
      hitStunSeconds: 0,
      knockbackVelocityX: 0,
      knockbackVelocityY: 0,
      knockbackRestY: FLOOR_Y - bossHeight,
      scanned: false,
      alive: true,
      deathAnimation: 0,
      boss: true,
      active: false,
      waveActivationAt: null,
      lastTrackX: bossX,
      lastTrackAt: 0,
    },
    bossMechanics: createBossMechanicState(mission.id),
    bossVulnerabilityMultiplier: 1,
    bossThermalVisibility: 1,
    energyWeaponsLocked: false,
    bossHitPillar: false,
    brokenPillarIds: new Set(),
    disabledConsoleId: null,
    playerUsedRangedWeapon: false,
    playerUsedEnergyWeapon: false,
    bossDefeatedAt: null,
    trophyClaimedAt: null,
    trophyQuality: null,
    trophyClaim: null,
    trophyExtracting: false,
    trophyExtraction: 0,
    trophyCarried: false,
    trophyRitual: null,
    trophyVictory: null,
    dropShip: null,
    scanPulse: 0,
    message: usesV7Roster
      ? "Écologie rare détectée : roster secondaire complet sur ce terrain."
      : "La chasse commence. Localise les signatures.",
    messageTimer: 4,
    screenShake: 0,
    rangedBossViolation: false,
    failureReported: false,
    nextProjectileId: 1,
    nextSignalId: 1,
    lastTrackX: world.spawn.x,
    lastTrackAt: 0,
    nextScentAt: 0,
    environmentDamage: 0,
    soundEvents: [],
    checkpointPositions: safeCheckpointPositions(
      world,
      difficultyDef.checkpointCount,
      { hazardMargin: 72 },
    ),
    nextCheckpointIndex: 0,
    lastCheckpoint: null,
    reducedGore,
    screenShakeEnabled,
  };

  spawnEligibleWaves(state, mission, difficulty, "start", null);
  return state;
}

function clonePlayerState(player: PlayerState): PlayerState {
  const melee = normalizeHuntMeleeState(
    (player as PlayerState & { melee?: unknown }).melee,
  );
  return {
    ...player,
    aimPoint: { ...player.aimPoint },
    weaponAmmo: [...player.weaponAmmo] as [number, number],
    dreadAngles: [...player.dreadAngles],
    dreadVelocities: [...player.dreadVelocities],
    melee,
  };
}

function cloneEnemyState(enemy: EnemyState): EnemyState {
  return {
    ...enemy,
    hitStunSeconds:
      Number.isFinite(enemy.hitStunSeconds) && enemy.hitStunSeconds > 0
        ? enemy.hitStunSeconds
        : 0,
    knockbackVelocityX: Number.isFinite(enemy.knockbackVelocityX)
      ? enemy.knockbackVelocityX
      : 0,
    knockbackVelocityY: Number.isFinite(enemy.knockbackVelocityY)
      ? enemy.knockbackVelocityY
      : 0,
    knockbackRestY: Number.isFinite(enemy.knockbackRestY)
      ? enemy.knockbackRestY
      : enemy.y,
  };
}

function cloneProjectileState(projectile: ProjectileState): ProjectileState {
  return {
    ...projectile,
    hitEnemyIds: projectile.hitEnemyIds
      ? [...projectile.hitEnemyIds]
      : undefined,
  };
}

function cloneTrophyRitual(
  ritual: TrophyRitualState | null,
): TrophyRitualState | null {
  return ritual
    ? { ...ritual, sequence: [...ritual.sequence] }
    : null;
}

function cloneAiBrains(
  brains: Record<string, AiBrain>,
): Record<string, AiBrain> {
  return Object.fromEntries(
    Object.entries(brains).map(([id, brain]) => [
      id,
      {
        ...brain,
        lastKnownTarget: brain.lastKnownTarget
          ? { ...brain.lastKnownTarget }
          : null,
        alertedAllyIds: [...brain.alertedAllyIds],
      },
    ]),
  );
}

function cloneBossMechanics(
  mechanics: BossMechanicState,
): BossMechanicState {
  return mechanics.missionId === "volcano-bad-blood"
    ? {
        ...mechanics,
        disabledConsoleIds: [...mechanics.disabledConsoleIds],
      }
    : mechanics.missionId === "ruins-ancient-guardian" && mechanics.guardianAdaptation
      ? { ...mechanics, guardianAdaptation: { ...mechanics.guardianAdaptation } }
      : { ...mechanics };
}

function cloneArsenalRuntime(
  arsenal: ArsenalRuntimeState,
): ArsenalRuntimeState {
  return {
    ...arsenal,
    slots: arsenal.slots.map((slot) => ({ ...slot })) as [
      ArsenalRuntimeState["slots"][0],
      ArsenalRuntimeState["slots"][1],
    ],
    activeEffects: arsenal.activeEffects.map((effect) => ({
      ...effect,
      origin: { ...effect.origin },
      target: { ...effect.target },
    })),
  };
}

function captureCheckpoint(
  state: GameState,
  mode: "retry" | "resume" = "retry",
): MissionCheckpointPayload {
  const checkpointPlayer = clonePlayerState(state.player);
  for (const projectile of mode === "retry" ? state.projectiles : []) {
    if (
      projectile.hostile ||
      projectile.recovery === "none" ||
      projectile.recovery === undefined ||
      projectile.weaponSlotIndex === undefined ||
      projectile.maximumAmmo === undefined
    ) {
      continue;
    }
    const slotIndex = projectile.weaponSlotIndex;
    checkpointPlayer.weaponAmmo[slotIndex] = Math.min(
      projectile.maximumAmmo,
      checkpointPlayer.weaponAmmo[slotIndex] + 1,
    );
  }
  return {
    exploration: normalizeExplorationProgress(state.exploration),
    visitedScreenIds: [...(state.visitedScreenIds ?? [])],
    phase: state.phase,
    elapsed: state.elapsed,
    player: checkpointPlayer,
    projectiles: state.projectiles.map(cloneProjectileState),
    scentNodes: state.scentNodes.map((node) => ({ ...node })),
    noiseEvents: state.noiseEvents.map((event) => ({ ...event })),
    tracks: state.tracks.map((track) => ({ ...track })),
    enemies: state.enemies.map(cloneEnemyState),
    aiBrains: cloneAiBrains(state.aiBrains),
    scanNodes: state.scanNodes.map((node) => ({ ...node })),
    recoveryNodes: state.recoveryNodes.map((node) => ({ ...node })),
    purgeConsoleNodes: state.purgeConsoleNodes.map((node) => ({ ...node })),
    regularTrophyDrops: state.regularTrophyDrops.map((drop) => ({
      ...drop,
      claim: { ...drop.claim },
    })),
    regularTrophyDropId: state.regularTrophyDropId,
    spawnedWaves: new Set(state.spawnedWaves),
    ecologySpawnIndex: state.ecologySpawnIndex,
    completedObjectives: new Set(state.completedObjectives),
    honorEvents: state.honorEvents.map((event) => ({ ...event })),
    honor: state.honor,
    kills: state.kills,
    scans: state.scans,
    supportKills: state.supportKills,
    damageTaken: state.damageTaken,
    secondWindUsed: state.secondWindUsed,
    boss: cloneEnemyState(state.boss),
    bossMechanics: cloneBossMechanics(state.bossMechanics),
    bossVulnerabilityMultiplier: state.bossVulnerabilityMultiplier,
    bossThermalVisibility: state.bossThermalVisibility,
    energyWeaponsLocked: state.energyWeaponsLocked,
    brokenPillarIds: new Set(state.brokenPillarIds),
    mud: { ...state.mud },
    bossHitPillar: state.bossHitPillar,
    disabledConsoleId: state.disabledConsoleId,
    playerUsedRangedWeapon: state.playerUsedRangedWeapon,
    playerUsedEnergyWeapon: state.playerUsedEnergyWeapon,
    bossDefeatedAt: state.bossDefeatedAt,
    trophyClaimedAt: state.trophyClaimedAt,
    trophyQuality: state.trophyQuality,
    trophyClaim: state.trophyClaim ? { ...state.trophyClaim } : null,
    trophyExtracting: state.trophyExtracting,
    trophyExtraction: state.trophyExtraction,
    trophyCarried: state.trophyCarried,
    trophyRitual: cloneTrophyRitual(state.trophyRitual),
    trophyVictory: state.trophyVictory ? { ...state.trophyVictory } : null,
    dropShip: state.dropShip ? { ...state.dropShip } : null,
    rangedBossViolation: state.rangedBossViolation,
    nextProjectileId: state.nextProjectileId,
    nextSignalId: state.nextSignalId,
    arsenal: cloneArsenalRuntime(state.arsenal),
    traps: state.traps.map((trap) => ({ ...trap })),
  };
}

const ACTIVE_HUNT_SNAPSHOT_VERSION = 1 as const;
const ACTIVE_HUNT_PHASES = new Set<HuntPhase>([
  "tracking",
  "target",
  "trophy",
  "extraction",
]);

interface RestoredActiveHuntSnapshot {
  checkpoint: MissionCheckpointPayload;
  nextCheckpointIndex: number;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteJsonNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function hasFiniteFields(
  value: JsonObject,
  fields: readonly string[],
): boolean {
  return fields.every((field) => isFiniteJsonNumber(value[field]));
}

function isValidSerializedHuntActor(value: JsonObject): boolean {
  return hasFiniteFields(value, ["x", "y", "width", "height", "health", "maxHealth"]) &&
    Math.abs(value.x as number) <= 1_000_000 && Math.abs(value.y as number) <= 1_000_000 &&
    (value.width as number) > 0 && (value.width as number) <= 2_048 &&
    (value.height as number) > 0 && (value.height as number) <= 2_048 &&
    (value.maxHealth as number) > 0 && (value.maxHealth as number) <= 1_000_000_000 &&
    (value.health as number) >= 0 && (value.health as number) <= (value.maxHealth as number);
}

function isValidSerializedHuntProjectile(value: JsonObject): boolean {
  return hasFiniteFields(value, ["x", "y", "velocityX", "velocityY", "radius", "damage", "life", "coverGraceSeconds"]) &&
    (value.radius as number) > 0 && (value.radius as number) <= 512 &&
    (value.damage as number) >= 0 && (value.life as number) >= 0 &&
    (value.coverGraceSeconds as number) >= 0 && typeof value.hostile === "boolean" &&
    (value.hitEnemyIds === undefined || isStringArray(value.hitEnemyIds));
}

function activeHuntSnapshotChecksum(serialized: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function isValidSerializedAiBrains(value: JsonObject): boolean {
  return Object.values(value).every((entry) => {
    if (!isJsonObject(entry) || !isStringArray(entry.alertedAllyIds)) {
      return false;
    }
    return (
      entry.lastKnownTarget === null ||
      (isJsonObject(entry.lastKnownTarget) &&
        hasFiniteFields(entry.lastKnownTarget, ["x", "y"]))
    );
  });
}

function isValidSerializedArsenal(value: JsonObject): boolean {
  if (
    !Array.isArray(value.slots) ||
    value.slots.length !== 2 ||
    !value.slots.every(isJsonObject) ||
    !Array.isArray(value.activeEffects)
  ) {
    return false;
  }
  return value.activeEffects.every(
    (effect) =>
      isJsonObject(effect) &&
      isJsonObject(effect.origin) &&
      isJsonObject(effect.target) &&
      hasFiniteFields(effect.origin, ["x", "y"]) &&
      hasFiniteFields(effect.target, ["x", "y"]),
  );
}

function serializeActiveHuntCheckpoint(
  checkpoint: MissionCheckpointPayload,
  nextCheckpointIndex: number,
): JsonObject | null {
  try {
    const checkpointSerialized = JSON.stringify({
      ...checkpoint,
      spawnedWaves: [...checkpoint.spawnedWaves],
      completedObjectives: [...checkpoint.completedObjectives],
      brokenPillarIds: [...checkpoint.brokenPillarIds],
    });
    const serializable = {
      version: ACTIVE_HUNT_SNAPSHOT_VERSION,
      nextCheckpointIndex,
      checksum: activeHuntSnapshotChecksum(checkpointSerialized),
      checkpoint: JSON.parse(checkpointSerialized) as unknown,
    };
    const detached: unknown = JSON.parse(JSON.stringify(serializable));
    return isJsonObject(detached) && isBoundedJsonValue(detached)
      ? detached
      : null;
  } catch {
    return null;
  }
}

function deserializeActiveHuntCheckpoint(
  snapshot: JsonObject | null | undefined,
): RestoredActiveHuntSnapshot | null {
  if (
    !snapshot ||
    snapshot.version !== ACTIVE_HUNT_SNAPSHOT_VERSION ||
    !Number.isSafeInteger(snapshot.nextCheckpointIndex) ||
    (snapshot.nextCheckpointIndex as number) < 0 ||
    (snapshot.nextCheckpointIndex as number) > 1_000 ||
    typeof snapshot.checksum !== "string" ||
    !isJsonObject(snapshot.checkpoint) ||
    !isBoundedJsonValue(snapshot) ||
    activeHuntSnapshotChecksum(JSON.stringify(snapshot.checkpoint)) !==
      snapshot.checksum
  ) {
    return null;
  }

  const checkpoint = snapshot.checkpoint;
  if (
    typeof checkpoint.phase !== "string" ||
    !ACTIVE_HUNT_PHASES.has(checkpoint.phase as HuntPhase) ||
    !isJsonObject(checkpoint.player) ||
    !isJsonObject(checkpoint.boss) ||
    !isJsonObject(checkpoint.aiBrains) ||
    !isJsonObject(checkpoint.bossMechanics) ||
    !isJsonObject(checkpoint.mud) ||
    !isJsonObject(checkpoint.arsenal) ||
    !isValidSerializedAiBrains(checkpoint.aiBrains) ||
    !isValidSerializedArsenal(checkpoint.arsenal) ||
    !hasFiniteFields(checkpoint.player, [
      "x",
      "y",
      "width",
      "height",
      "health",
      "maxHealth",
      "stamina",
      "maxStamina",
      "energy",
      "maxEnergy",
      "previousY",
      "velocityX",
      "velocityY",
      "facing",
      "medicomps",
      "activeWeaponSlot",
      "aimAngle",
      "gauntletOpen",
      "bladeExtension",
      "attackFlash",
      "invulnerability",
      "meleeCooldown",
      "weaponCooldown",
      "weaponChargeSeconds",
      "scanCooldown",
      "healCooldown",
    ]) ||
    !isValidSerializedHuntActor(checkpoint.player) ||
    (checkpoint.player.health as number) <= 0 ||
    (checkpoint.player.stamina as number) < 0 ||
    (checkpoint.player.stamina as number) > (checkpoint.player.maxStamina as number) ||
    (checkpoint.player.energy as number) < 0 ||
    (checkpoint.player.energy as number) > (checkpoint.player.maxEnergy as number) ||
    !isJsonObject(checkpoint.player.aimPoint) ||
    !hasFiniteFields(checkpoint.player.aimPoint, ["x", "y"]) ||
    !Array.isArray(checkpoint.player.weaponAmmo) ||
    checkpoint.player.weaponAmmo.length !== 2 ||
    !checkpoint.player.weaponAmmo.every(isFiniteJsonNumber) ||
    !Array.isArray(checkpoint.player.dreadAngles) ||
    !checkpoint.player.dreadAngles.every(isFiniteJsonNumber) ||
    !Array.isArray(checkpoint.player.dreadVelocities) ||
    checkpoint.player.dreadVelocities.length !==
      checkpoint.player.dreadAngles.length ||
    !checkpoint.player.dreadVelocities.every(isFiniteJsonNumber) ||
    typeof checkpoint.player.grounded !== "boolean" ||
    typeof checkpoint.player.cloaked !== "boolean" ||
    typeof checkpoint.player.maskOn !== "boolean" ||
    typeof checkpoint.player.aiming !== "boolean" ||
    typeof checkpoint.player.climbing !== "boolean" ||
    (checkpoint.player.facing !== -1 && checkpoint.player.facing !== 1) ||
    (checkpoint.player.activeWeaponSlot !== 0 &&
      checkpoint.player.activeWeaponSlot !== 1) ||
    (checkpoint.trophyRitual !== null &&
      (!isJsonObject(checkpoint.trophyRitual) ||
        !isStringArray(checkpoint.trophyRitual.sequence))) ||
    (checkpoint.bossMechanics.missionId === "volcano-bad-blood" &&
      !isStringArray(checkpoint.bossMechanics.disabledConsoleIds)) ||
    (checkpoint.bossMechanics.missionId === "ruins-ancient-guardian" &&
      checkpoint.bossMechanics.guardianAdaptation !== undefined &&
      (!isJsonObject(checkpoint.bossMechanics.guardianAdaptation) ||
        !hasFiniteFields(checkpoint.bossMechanics.guardianAdaptation, [
          "energyUses", "observationSeconds", "warningSeconds", "fieldSeconds",
        ]))) ||
    !isValidSerializedHuntActor(checkpoint.boss) ||
    !hasFiniteFields(checkpoint, [
      "elapsed",
      "ecologySpawnIndex",
      "honor",
      "kills",
      "scans",
      "supportKills",
      "damageTaken",
      "bossVulnerabilityMultiplier",
      "bossThermalVisibility",
      "trophyExtraction",
      "nextProjectileId",
      "nextSignalId",
    ]) ||
    !isStringArray(checkpoint.spawnedWaves) ||
    !isStringArray(checkpoint.completedObjectives) ||
    !isStringArray(checkpoint.brokenPillarIds) ||
    (checkpoint.visitedScreenIds !== undefined && !isStringArray(checkpoint.visitedScreenIds))
  ) {
    return null;
  }

  const requiredArrays = [
    "enemies",
    "projectiles",
    "scentNodes",
    "noiseEvents",
    "tracks",
    "scanNodes",
    "recoveryNodes",
    "purgeConsoleNodes",
    "regularTrophyDrops",
    "honorEvents",
    "traps",
  ] as const;
  const requiredBooleans = [
    "secondWindUsed",
    "energyWeaponsLocked",
    "bossHitPillar",
    "playerUsedRangedWeapon",
    "playerUsedEnergyWeapon",
    "trophyExtracting",
    "trophyCarried",
    "rangedBossViolation",
  ] as const;
  if (
    !requiredArrays.every((field) => Array.isArray(checkpoint[field]) &&
      (checkpoint[field] as unknown[]).every(isJsonObject)) ||
    !requiredBooleans.every(
      (field) => typeof checkpoint[field] === "boolean",
    )
  ) {
    return null;
  }

  if (
    !(checkpoint.enemies as JsonObject[]).every(enemy =>
      typeof enemy.id === "string" && typeof enemy.alive === "boolean" &&
      typeof enemy.active === "boolean" && isValidSerializedHuntActor(enemy)) ||
    !(checkpoint.projectiles as JsonObject[]).every(isValidSerializedHuntProjectile)
  ) return null;

  const {
    spawnedWaves,
    completedObjectives,
    brokenPillarIds,
    ...rest
  } = checkpoint;
  return {
    checkpoint: {
      ...rest,
      spawnedWaves: new Set(spawnedWaves),
      completedObjectives: new Set(completedObjectives),
      brokenPillarIds: new Set(brokenPillarIds),
    } as unknown as MissionCheckpointPayload,
    nextCheckpointIndex: snapshot.nextCheckpointIndex as number,
  };
}

function persistencePayloadFor(state: GameState): HuntPersistencePayload | null {
  if (state.phase === "dead" || state.phase === "finished") return null;
  const snapshot = serializeActiveHuntCheckpoint(
    captureCheckpoint(state, "resume"),
    state.nextCheckpointIndex,
  );
  if (!snapshot) return null;
  return {
    snapshot,
    retryCheckpoint: state.lastCheckpoint
      ? serializeActiveHuntCheckpoint(
          state.lastCheckpoint,
          state.nextCheckpointIndex,
        )
      : null,
    elapsed: state.elapsed,
  };
}

function restoreCheckpoint(
  state: GameState,
  checkpoint: MissionCheckpointPayload,
  mode: "retry" | "resume" = "retry",
): GameState {
  const player = clonePlayerState(checkpoint.player);
  // Permanent discoveries survive a retry and are merged with the current
  // campaign on resume. Recompute the bonus from its identity, never stack it.
  const exploration = mergeExplorationProgress(state.exploration,
    explorationForMission(state.world.missionId, checkpoint.exploration));
  const world = applyExplorationWorld(worldBlueprintFor(state.world.missionId), exploration);
  player.maxEnergy = state.player.maxEnergy - explorationBonuses(state.exploration).maxEnergy + explorationBonuses(exploration).maxEnergy;
  player.energy = Math.min(player.energy, player.maxEnergy);
  player.aerialBoostUsed = typeof player.aerialBoostUsed === "boolean" ? player.aerialBoostUsed : !player.grounded;
  // A legacy checkpoint may lie inside a newly authored wall. Keep objectives
  // and inventory intact, but explicitly return the hunter to safe insertion.
  const relocated = overlapsSolidPlatform(player, world.platforms);
  if (relocated) {
    player.x = world.spawn.x;
    player.y = world.floorY - player.height;
    player.previousY = player.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = true;
    player.aerialBoostUsed = false;
    player.climbing = false;
    player.climbZoneId = null;
  }
  if (player.climbing && !world.climbables.some(zone => zone.id === player.climbZoneId)) {
    player.climbing = false;
    player.climbZoneId = null;
  }
  const cloakWasActive = player.cloaked || state.player.cloaked;
  if (mode === "retry") {
    player.health = Math.max(player.health, player.maxHealth * 0.45);
    player.stamina = Math.max(player.stamina, player.maxStamina * 0.6);
    player.energy = Math.max(player.energy, player.maxEnergy * 0.4);
    player.velocityX = 0;
    player.velocityY = 0;
    player.climbing = false;
    player.climbZoneId = null;
  }
  player.invulnerability = mode === "retry" ? 2 : player.invulnerability;
  player.cloaked = mode === "resume" ? player.cloaked : false;
  player.aiming = false;
  player.weaponChargeSeconds = 0;
  if (mode === "retry") {
    player.melee = cancelHuntMeleeAttack(player.melee);
    player.attackFlash = 0;
    player.meleeCooldown = 0;
  }

  return {
    ...state,
    exploration,
    jumpAssist: freshJumpAssistState({ requireRelease: true }),
    world,
    phase: checkpoint.phase,
    paused: mode === "resume",
    elapsed: checkpoint.elapsed,
    // Retry retains knowledge discovered during this hunt; resume trusts only
    // authored ids from its saved checkpoint. Old saves reveal the current room.
    visitedScreenIds: discoverWorldScreen(
      state.world.missionId,
      normalizeVisitedScreenIds(state.world.missionId, [
        ...(checkpoint.visitedScreenIds ?? []),
        ...(mode === "retry" ? state.visitedScreenIds ?? [] : []),
      ]),
      player.x + player.width / 2,
    ),
    cameraX: clamp(
      player.x - VIEW_WIDTH * 0.38,
      0,
      state.world.width - VIEW_WIDTH,
    ),
    worldScreenId: getWorldScreenAtX(
      state.world.missionId,
      player.x + player.width / 2,
    ).id,
    player,
    enemies: checkpoint.enemies.map(cloneEnemyState),
    aiBrains: cloneAiBrains(checkpoint.aiBrains),
    projectiles:
      mode === "resume"
        ? checkpoint.projectiles.map(cloneProjectileState)
        : [],
    goreParticles: [],
    scentNodes:
      mode === "resume"
        ? checkpoint.scentNodes.map((node) => ({ ...node }))
        : [],
    noiseEvents:
      mode === "resume"
        ? checkpoint.noiseEvents.map((event) => ({ ...event }))
        : [],
    tracks:
      mode === "resume"
        ? checkpoint.tracks.map((track) => ({ ...track }))
        : [],
    scanNodes: checkpoint.scanNodes.map((node) => ({ ...node })),
    recoveryNodes: checkpoint.recoveryNodes.map((node) => ({ ...node })),
    purgeConsoleNodes: checkpoint.purgeConsoleNodes.map((node) => ({
      ...node,
    })),
    regularTrophyDrops: checkpoint.regularTrophyDrops.map((drop) => ({
      ...drop,
      claim: { ...drop.claim },
    })),
    regularTrophyDropId: checkpoint.regularTrophyDropId,
    spawnedWaves: new Set(checkpoint.spawnedWaves),
    ecologySpawnIndex: checkpoint.ecologySpawnIndex,
    completedObjectives: new Set(checkpoint.completedObjectives),
    honorEvents: checkpoint.honorEvents.map((event) => ({ ...event })),
    honor: checkpoint.honor,
    kills: checkpoint.kills,
    scans: checkpoint.scans,
    supportKills: checkpoint.supportKills,
    damageTaken: checkpoint.damageTaken,
    secondWindUsed: checkpoint.secondWindUsed,
    boss: cloneEnemyState(checkpoint.boss),
    bossMechanics: cloneBossMechanics(checkpoint.bossMechanics),
    bossVulnerabilityMultiplier: checkpoint.bossVulnerabilityMultiplier,
    bossThermalVisibility: checkpoint.bossThermalVisibility,
    // Older checkpoints may retain a field lock after the Apex has died.
    energyWeaponsLocked: checkpoint.boss.alive && checkpoint.energyWeaponsLocked,
    bossHitPillar: checkpoint.bossHitPillar,
    brokenPillarIds: new Set(checkpoint.brokenPillarIds),
    mud: { ...checkpoint.mud },
    arsenal: cloneArsenalRuntime(checkpoint.arsenal),
    traps: checkpoint.traps.map((trap) => ({ ...trap })),
    disabledConsoleId: checkpoint.disabledConsoleId,
    playerUsedRangedWeapon: checkpoint.playerUsedRangedWeapon,
    playerUsedEnergyWeapon: checkpoint.playerUsedEnergyWeapon,
    bossDefeatedAt: checkpoint.bossDefeatedAt,
    trophyClaimedAt: checkpoint.trophyClaimedAt,
    trophyQuality: checkpoint.trophyQuality,
    trophyClaim: checkpoint.trophyClaim
      ? { ...checkpoint.trophyClaim }
      : null,
    trophyExtracting: checkpoint.trophyExtracting,
    trophyExtraction: checkpoint.trophyExtraction,
    trophyCarried: checkpoint.trophyCarried,
    trophyRitual: cloneTrophyRitual(checkpoint.trophyRitual),
    trophyVictory: checkpoint.trophyVictory
      ? { ...checkpoint.trophyVictory }
      : null,
    dropShip: checkpoint.dropShip ? { ...checkpoint.dropShip } : null,
    scanPulse: 0,
    message:
      relocated ? "Géométrie actualisée : retour à l’insertion, progression conservée." : mode === "resume"
        ? "Chasse restaurée. Le biomask attend ta reprise."
        : `Relais ${state.nextCheckpointIndex} restauré. La chasse continue.`,
    messageTimer: 4,
    screenShake: 0,
    rangedBossViolation: checkpoint.rangedBossViolation,
    failureReported: false,
    nextProjectileId: checkpoint.nextProjectileId,
    nextSignalId: checkpoint.nextSignalId,
    lastTrackX: player.x,
    lastTrackAt: checkpoint.elapsed,
    nextScentAt: checkpoint.elapsed + 0.4,
    environmentDamage: 0,
    soundEvents:
      mode === "retry" && cloakWasActive
        ? ["cloak-off", "objective"]
        : ["objective"],
  };
}

function updateMissionCheckpoint(state: GameState): void {
  const checkpointX =
    state.checkpointPositions[state.nextCheckpointIndex];
  if (
    checkpointX === undefined ||
    state.phase === "dead" ||
    state.phase === "finished" ||
    state.player.x + state.player.width / 2 < checkpointX
  ) {
    return;
  }

  state.nextCheckpointIndex += 1;
  state.lastCheckpoint = captureCheckpoint(state);
  announce(
    state,
    `Relais de chasse ${state.nextCheckpointIndex}/${state.checkpointPositions.length} synchronisé.`,
    3.2,
  );
  queueSound(state, "objective");
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
      const v8Enemy = ecologyEncounterEnemyAt(
        state.ecologyDeck,
        state.ecologySpawnIndex,
      );
      state.ecologySpawnIndex += 1;
      const v7Enemy = v8Enemy ? null : enemyV7ForWave(wave.id, index);
      const base =
        trigger === "start"
          ? state.world.width * 0.17
          : trigger === "boss-phase"
            ? state.world.bossArena.x + state.world.bossArena.width * 0.12
            : state.world.width * 0.4;
      const spread =
        trigger === "boss-phase"
          ? state.world.bossArena.width * 0.55
          : state.world.width * 0.28;
      const desiredX = clamp(
        base +
          ((index + state.enemies.length * 0.61) %
            Math.max(1, wave.count)) *
            (spread / Math.max(1, wave.count)) +
          Math.random() * 120,
        120,
        state.world.width - 220,
      );
      const enemy = makeEnemy(
        `${wave.id}-${index}`,
        v8Enemy?.id ?? v7Enemy?.id ?? wave.archetype,
        mission.id,
        desiredX,
        state.world.width,
        wave.health,
        wave.damage,
        wave.moveSpeed,
        difficultyDef.enemyHealthMultiplier,
        difficultyDef.enemyDamageMultiplier,
      );
      const safeCenterX = resolveNearestSafeGroundX(
        state.world,
        desiredX + enemy.width / 2,
        {
          minX: state.world.spawn.x + enemy.width / 2,
          maxX: state.world.bossArena.x - enemy.width / 2 - 40,
        },
        enemy.width / 2 + 28,
      );
      if (safeCenterX !== null) {
        enemy.x = safeCenterX - enemy.width / 2;
        enemy.patrolLeft = Math.max(40, enemy.x - 190);
        enemy.patrolRight = Math.min(
          state.world.width - enemy.width - 40,
          enemy.x + 190,
        );
      }
      const activationDelay = index * wave.spawnDelaySeconds;
      if (activationDelay > 0) {
        enemy.active = false;
        enemy.waveActivationAt = state.elapsed + activationDelay;
      }
      state.enemies.push(enemy);
      state.aiBrains[enemy.id] = createAiBrain(enemy.id, enemy.kind);
    }
  }
}

function spawnExtractionThreat(
  state: GameState,
  mission: MissionDefinition,
): void {
  const template = mission.enemyWaves.at(-1);
  if (!template) return;
  const difficultyDef = DIFFICULTY_BY_ID[state.arsenal.difficultyId];
  const count = Math.max(2, Math.min(4, mission.threatLevel - 1));
  const corridorStart =
    state.world.bossArena.x + state.world.bossArena.width * 0.7;
  const corridorEnd = state.world.extraction.x - 140;

  for (let index = 0; index < count; index += 1) {
    const ecologyEnemy = ecologyEncounterEnemyAt(
      state.ecologyDeck,
      state.ecologySpawnIndex,
    );
    state.ecologySpawnIndex += 1;
    const desiredX =
      corridorStart +
      (corridorEnd - corridorStart) * ((index + 1) / (count + 1));
    const enemy = makeEnemy(
      `extraction-${mission.id}-${state.nextSignalId++}-${index}`,
      ecologyEnemy?.id ?? template.archetype,
      mission.id,
      desiredX,
      state.world.width,
      template.health,
      template.damage,
      template.moveSpeed,
      difficultyDef.enemyHealthMultiplier,
      difficultyDef.enemyDamageMultiplier,
    );
    const safeCenterX = resolveNearestSafeGroundX(
      state.world,
      desiredX + enemy.width / 2,
      {
        minX: corridorStart,
        maxX: corridorEnd,
      },
      enemy.width / 2 + 28,
    );
    if (safeCenterX !== null) {
      enemy.x = safeCenterX - enemy.width / 2;
    }
    enemy.patrolLeft = Math.max(corridorStart, enemy.x - 260);
    enemy.patrolRight = Math.min(
      corridorEnd,
      enemy.x + 260,
    );
    const activationDelay = index * Math.max(0.45, template.spawnDelaySeconds);
    if (activationDelay > 0) {
      enemy.active = false;
      enemy.waveActivationAt = state.elapsed + activationDelay;
    }
    state.enemies.push(enemy);
    state.aiBrains[enemy.id] = createAiBrain(enemy.id, enemy.kind);
  }
  announce(
    state,
    "Le sang de l’Apex attire une dernière menace sur la route d’extraction.",
    4,
  );
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

function recordPlasmaRestraintViolation(
  state: GameState,
  mission: MissionDefinition,
  enemy: EnemyState,
): void {
  if (enemy.boss) return;
  const restraintRule = mission.honorRules.find(
    (rule) => rule.condition === "no-plasma-on-regular-prey",
  );
  if (!restraintRule) return;
  addHonor(
    state,
    honorRuleEventId(restraintRule),
    `Code rompu : ${restraintRule.label}`,
    -restraintRule.violationPenalty,
    "violation",
  );
}

function announce(state: GameState, message: string, seconds = 3): void {
  state.message = message;
  state.messageTimer = seconds;
}

function queueSound(state: GameState, sound: GameSfxId): void {
  if (state.soundEvents.length < 24) {
    state.soundEvents.push(sound);
  }
}

function forceDecloak(state: GameState): boolean {
  if (!state.player.cloaked) return false;
  state.player.cloaked = false;
  queueSound(state, "cloak-off");
  return true;
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
    queueSound(state, "objective");
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

function trophyCueLabel(action: TrophyRitualAction): string {
  if (action === "left") return "GAUCHE";
  if (action === "right") return "DROITE";
  if (action === "melee") return "LAMES";
  return "VALIDER";
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
  const regularDrop = state.regularTrophyDropId
    ? state.regularTrophyDrops.find(
        (drop) => drop.id === state.regularTrophyDropId,
      )
    : null;
  if (regularDrop && state.trophyExtracting && state.trophyRitual) {
    const cue =
      state.trophyRitual.sequence[state.trophyRitual.cueIndex];
    return {
      title: `Prélever : ${regularDrop.name}`,
      detail:
        state.trophyRitual.phase === "ready"
          ? `Observe le premier glyphe · départ dans ${trophyRitualReadyRemaining(state.trophyRitual).toFixed(1)} s.`
          : cue
            ? `Rite secondaire ${state.trophyRitual.cueIndex + 1}/${state.trophyRitual.sequence.length} : ${trophyCueLabel(cue)}.`
            : "Scellement de la prise.",
    };
  }
  if (
    state.bossMechanics.missionId === "volcano-bad-blood" &&
    state.bossMechanics.purgeSeconds !== null &&
    !state.bossMechanics.purgeResolved
  ) {
    const disabled = state.purgeConsoleNodes.filter(
      (node) => node.recovered,
    ).length;
    return {
      title: "Interrompre la purge du sanctuaire",
      detail: `${Math.ceil(state.bossMechanics.purgeSeconds)} s — ${disabled}/3 consoles neutralisées avec [E].`,
    };
  }
  if (
    state.bossMechanics.missionId === "ruins-ancient-guardian" &&
    state.boss.active && state.boss.alive
  ) {
    const adaptation = state.bossMechanics.guardianAdaptation;
    if (adaptation && adaptation.warningSeconds > 0) {
      return {
        title: "Contre-mesure en préparation",
        detail: `${adaptation.warningSeconds.toFixed(1)} s : brise la ligne de vue, camoufle-toi ou quitte le cercle pour éviter le champ.`,
      };
    }
    if (adaptation && adaptation.fieldSeconds > 0) {
      return {
        title: state.energyWeaponsLocked ? "Champ du Gardien : plasma brouillé" : "À l'abri du champ du Gardien",
        detail: `${adaptation.fieldSeconds.toFixed(1)} s restantes. Les armes cinétiques et les lames restent disponibles ; couvert et distance protègent du brouillage.`,
      };
    }
    if (adaptation && adaptation.energyUses > 0) {
      return {
        title: `Le Gardien étudie le plasma : ${adaptation.energyUses}/${GUARDIAN_ADAPTATION.energyUsesBeforeWarning}`,
        detail: "Varie tes tirs ou laisse sa mémoire énergétique se dissiper. Trois tirs observés déclenchent une contre-mesure.",
      };
    }
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
    const cue = state.trophyRitual?.sequence[state.trophyRitual.cueIndex];
    const ritualReady = state.trophyRitual?.phase === "ready";
    return {
      title: `Réclamer : ${mission.trophy.name}`,
      detail:
        state.trophyExtracting && ritualReady && state.trophyRitual
          ? `Observe le premier glyphe · départ dans ${trophyRitualReadyRemaining(state.trophyRitual).toFixed(1)} s.`
          : state.trophyExtracting && cue
          ? `Rite ${state.trophyRitual!.cueIndex + 1}/${state.trophyRitual!.sequence.length} : ${trophyCueLabel(cue)} dans la fenêtre lumineuse.`
          : "Approche la dépouille et utilise [E] pour commencer le rite rythmé.",
    };
  }
  if (state.trophyVictory && !state.trophyVictory.complete) {
    return {
      title: "Trophée revendiqué",
      detail: "Le chasseur lève sa prise pendant que le vaisseau se place au-dessus de la balise.",
    };
  }
  if (state.dropShip?.phase === "approach") {
    return {
      title: "Vaisseau en approche",
      detail: "Rejoins la balise et attends que le transport se stabilise au-dessus du faisceau.",
    };
  }
  if (state.dropShip?.phase === "boarding") {
    return {
      title: "Hissage en cours",
      detail: "Le faisceau tracteur remonte le chasseur et son trophée vers la soute.",
    };
  }
  if (state.dropShip?.phase === "departure") {
    return {
      title: "Extraction confirmée",
      detail: "La soute est verrouillée. Le vaisseau quitte la zone de chasse.",
    };
  }
  return {
    title: extractObjective?.label ?? "Rejoindre l’extraction",
    detail: "Atteins la balise à l’est puis embarque avec [E] lorsque le vaisseau est en stationnaire.",
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
    playerX: state.player.x + state.player.width / 2,
    playerY: state.player.y + state.player.height / 2,
    exploration: normalizeExplorationProgress(state.exploration),
    pilotHint: explorationRegionHint(mission.id, state.exploration, state.player),
    aerialBoostUsed: state.player.aerialBoostUsed,
    grounded: state.player.grounded,
    visitedScreenIds: [...state.visitedScreenIds],
    phase: state.phase,
    paused: state.paused,
    health: Math.max(0, state.player.health),
    maxHealth: state.player.maxHealth,
    stamina: state.player.stamina,
    maxStamina: state.player.maxStamina,
    energy: state.player.energy,
    maxEnergy: state.player.maxEnergy,
    medicomps: state.player.medicomps,
    ammo: state.player.weaponAmmo[state.player.activeWeaponSlot],
    activeWeaponSlot: state.player.activeWeaponSlot,
    cloaked: state.player.cloaked,
    maskOn: state.player.maskOn,
    aiming: state.player.aiming,
    climbing: state.player.climbing,
    gearSlots: state.arsenal.slots.map((slot) => ({
      gearId: slot.gearId,
      name: GEAR_BY_ID[slot.gearId].name,
      charges: slot.charges,
      maxCharges: slot.maxCharges,
      cooldownRemainingSeconds: slot.cooldownRemainingSeconds,
    })) as [GearSlotSnapshot, GearSlotSnapshot],
    checkpointLabel:
      state.nextCheckpointIndex > 0
        ? `Relais ${state.nextCheckpointIndex}/${state.checkpointPositions.length}`
        : state.checkpointPositions.length > 0
          ? `Insertion · ${state.checkpointPositions.length} relais`
          : "Rite sans checkpoint",
    trophyExtraction: state.trophyExtraction,
    trophyCue:
      state.trophyRitual?.sequence[state.trophyRitual.cueIndex] ?? null,
    trophyCueIndex: state.trophyRitual?.cueIndex ?? 0,
    trophyCueCount: state.trophyRitual?.sequence.length ?? 0,
    trophyCueTiming: state.trophyRitual
      ? state.trophyRitual.phase === "ready"
        ? 0
        : clamp(
          state.trophyRitual.cueElapsedSeconds /
            TROPHY_RITUAL_TIMING.cueTimeoutSeconds,
          0,
          1,
        )
      : 0,
    trophyMistakes: state.trophyRitual?.mistakes ?? 0,
    dropShipPhase: state.dropShip?.phase ?? null,
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

function resolveMissionHonorRules(
  state: GameState,
  mission: MissionDefinition,
): void {
  const ruleEventWasViolation = (
    condition: MissionDefinition["honorRules"][number]["condition"],
  ): boolean =>
    mission.honorRules
      .filter((rule) => rule.condition === condition)
      .some((rule) =>
        state.honorEvents.some(
          (event) =>
            event.id === honorRuleEventId(rule) &&
            event.kind === "violation",
        ),
      );
  const purgeStopped =
    state.bossMechanics.missionId === "volcano-bad-blood" &&
    state.bossMechanics.purgeResolved &&
    state.bossMechanics.disabledConsoleIds.length >= 3;
  const resolutions = evaluateMissionHonorRules(mission, {
    completedObjectiveIds: state.completedObjectives,
    targetScannedBeforeStrike:
      state.boss.scanned && !state.rangedBossViolation,
    plasmaUsedOnRegularPrey: ruleEventWasViolation(
      "no-plasma-on-regular-prey",
    ),
    environmentalArmorBreaks:
      state.bossMechanics.missionId === "ice-cryostalker"
        ? Math.max(0, 3 - state.bossMechanics.armorPlates)
        : 0,
    duelViolated: ruleEventWasViolation("duel-kept"),
    purgeStopped,
    secondWindUsed: state.secondWindUsed,
  });

  for (const resolution of resolutions) {
    const rule = mission.honorRules.find(
      (entry) => entry.id === resolution.ruleId,
    );
    if (!rule || state.honorEvents.some(
      (event) => event.id === honorRuleEventId(rule),
    )) {
      continue;
    }
    addHonor(
      state,
      honorRuleEventId(rule),
      `${resolution.honored ? "Code respecté" : "Code rompu"} : ${
        resolution.label
      }`,
      resolution.value,
      resolution.honored ? "objective" : "violation",
    );
  }
}

function resultFor(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  outcome: MissionResult["outcome"],
): MissionResult {
  if (outcome === "success") {
    resolveMissionHonorRules(state, mission);
  }
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
    exploration: normalizeExplorationProgress(state.exploration),
    difficultyId: difficulty,
    outcome,
    score,
    elapsedSeconds: Math.round(state.elapsed),
    completedObjectiveIds: [...state.completedObjectives],
    honorEvents: [...state.honorEvents],
    trophyQuality: outcome === "success" ? state.trophyQuality : null,
    trophyClaims:
      outcome === "success"
        ? [
            ...(state.trophyClaim ? [state.trophyClaim] : []),
            ...state.regularTrophyDrops
              .filter((drop) => drop.collected)
              .map((drop) => ({ ...drop.claim })),
          ]
        : [],
    kills: state.kills,
    scans: state.scans,
    discoveredEnemyIds: [
      ...new Set([
        ...state.enemies
          .filter((enemy) => enemy.scanned)
          .map((enemy) => enemy.archetype),
        ...(state.boss.scanned ? [state.boss.archetype] : []),
      ]),
    ],
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

function drawEnemySheetFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
  facing: -1 | 1,
  alpha = 1,
): void {
  const frameWidth = image.naturalWidth / 6;
  const sourceX = clamp(frameIndex, 0, 5) * frameWidth;
  context.save();
  context.globalAlpha = alpha;
  if (facing < 0) {
    context.translate(x + width, y);
    context.scale(-1, 1);
    context.drawImage(
      image,
      sourceX,
      0,
      frameWidth,
      image.naturalHeight,
      0,
      0,
      width,
      height,
    );
  } else {
    context.drawImage(
      image,
      sourceX,
      0,
      frameWidth,
      image.naturalHeight,
      x,
      y,
      width,
      height,
    );
  }
  context.restore();
}

function enemyAnimationFrame(enemy: EnemyState, elapsed: number): number {
  if (!enemy.alive) return 5;
  if (enemy.hitFlash > 0 || enemy.hitStunSeconds > 0) return 4;
  if (enemy.telegraph > 0 || enemy.pendingAttackId) return 3;
  const v8Definition = ecologyV8EnemyForId(enemy.archetype);
  const v7Definition = enemyV7ForId(enemy.archetype);
  if (Math.abs(enemy.velocityX) > 18) {
    const fps = v8Definition
      ? ecologyV8RuntimeProfile(v8Definition).animationFps
      : (v7Definition?.animationFps ?? 8);
    return 1 + (Math.floor(elapsed * fps) % 2);
  }
  return 0;
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

interface RegisteredLayerOptions {
  alpha?: number;
  filter?: string;
  pivot?: RigPoint;
  rotation?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
}

const HUNTER_DREAD_ROOT = { x: 143, y: 43 } as const;
const HUNTER_HAND_WEAPON_PIVOT = { x: 218, y: 229 } as const;

const HUNTER_DREAD_STRANDS = [
  { x: -12, y: 3, rest: -0.209, scale: 0.88, mirror: false },
  { x: -8, y: -1, rest: -0.14, scale: 0.96, mirror: false },
  { x: -4, y: -4, rest: -0.07, scale: 1.04, mirror: false },
  { x: 0, y: -5, rest: 0, scale: 1.08, mirror: false },
  { x: 4, y: -3, rest: 0.07, scale: 1.02, mirror: false },
  { x: 8, y: 2, rest: -0.175, scale: 0.72, mirror: false },
  { x: 12, y: 7, rest: -0.279, scale: 0.62, mirror: false },
] as const;

const HUNTER_GEAR_SLOT_OFFSETS = [
  { x: -24, y: 5 },
  { x: 24, y: 7 },
] as const;

const HUNTER_TROPHY_LAYOUT = {
  "trophy-spine": {
    pivot: { x: 85, y: 216 },
    carry: { x: 130, y: 5, scale: 0.72 },
    belt: { x: -10, y: -4, scale: 0.62 },
  },
  "trophy-skull": {
    pivot: { x: 99, y: 210 },
    carry: { x: 119, y: 14, scale: 0.62 },
    belt: { x: 28, y: 2, scale: 0.58 },
  },
  "trophy-bindings": {
    pivot: { x: 85, y: 210 },
    carry: { x: 143, y: 18, scale: 0.45 },
    belt: { x: 68, y: 2, scale: 0.5 },
  },
} as const satisfies Record<
  HunterTrophyVisualId,
  {
    pivot: RigPoint;
    carry: RigPoint & { scale: number };
    belt: RigPoint & { scale: number };
  }
>;

type TrophyVisualIdentity = Pick<TrophyClaim, "definitionId" | "partId">;

function trophyAtomicLayerIds(
  partId?: TrophyPartId,
): readonly HunterTrophyVisualId[] {
  if (partId === "skull") {
    return ["trophy-skull", "trophy-bindings"];
  }
  if (partId === "mask" || partId === "insignia") return [];
  return HUNTER_TROPHY_VISUAL_IDS;
}

function v6TrophyAtlasImage(
  assets: AssetBank,
  visualId: V6VisualId,
): HTMLImageElement | null {
  const { atlasId } = getV6Visual(visualId);
  if (atlasId === "masks-trophies") return assets.masksTrophiesAtlas;
  if (atlasId === "ranks-lasers") return assets.ranksLasersAtlas;
  return null;
}

/** Draws the claimed campaign object; legacy mask/insignia fallback stays non-anatomical. */
function drawNamedTrophyAtAnchor(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  trophy: TrophyVisualIdentity,
  position: RigPoint,
  facing: -1 | 1,
  scale: number,
  rotation = 0,
): boolean {
  const exactVisual = trophyHuntVisualForDefinitionId(trophy.definitionId);
  const exactImage = exactVisual
    ? assets.campaignTrophies[exactVisual.definitionId]
    : null;
  if (exactVisual && exactImage) {
    const [left, top, right, bottom] = exactVisual.validation.bounds;
    const sourceWidth = right - left + 1;
    const sourceHeight = bottom - top + 1;
    const maximumSize = trophy.partId === "insignia" ? 115 : 185;
    const imageScale = maximumSize * scale / Math.max(sourceWidth, sourceHeight);
    const width = sourceWidth * imageScale;
    const height = sourceHeight * imageScale;
    context.save();
    context.translate(position.x, position.y);
    context.rotate(rotation);
    context.scale(facing, 1);
    context.drawImage(
      exactImage,
      left,
      top,
      sourceWidth,
      sourceHeight,
      -width * 0.5,
      -height * 0.58,
      width,
      height,
    );
    context.restore();
    return true;
  }
  if (trophy.partId !== "mask" && trophy.partId !== "insignia") {
    return false;
  }
  const visualId = resolveV6TrophyVisualId(trophy);
  const visual = getV6Visual(visualId);
  const atlas = v6TrophyAtlasImage(assets, visualId);
  if (!atlas) return true;

  const baseHeight = trophy.partId === "mask" ? 156 : 128;
  const height = baseHeight * scale;
  const width = height * (visual.crop.width / visual.crop.height);
  context.save();
  context.translate(position.x, position.y);
  context.rotate(rotation);
  context.scale(facing, 1);
  context.shadowColor = "#000000aa";
  context.shadowBlur = 8 * scale;
  context.drawImage(
    atlas,
    visual.crop.x,
    visual.crop.y,
    visual.crop.width,
    visual.crop.height,
    -width * 0.5,
    -height * 0.58,
    width,
    height,
  );
  context.restore();
  return true;
}

const HUNTER_BACK_PARTS: readonly HunterBodyPartId[] = [
  "foot-back",
  "shin-back",
  "thigh-back",
  "upper-arm-back",
  "lower-arm-back",
  "hand-back",
] as const;

const HUNTER_CORE_PARTS: readonly HunterBodyPartId[] = [
  "pelvis",
  "torso",
] as const;

const HUNTER_FRONT_PARTS: readonly HunterBodyPartId[] = [
  "thigh-front",
  "shin-front",
  "foot-front",
  "upper-arm-front",
  "lower-arm-front",
] as const;

function applyAffine(
  context: CanvasRenderingContext2D,
  matrix: AffineMatrix,
): void {
  context.transform(
    matrix.a,
    matrix.b,
    matrix.c,
    matrix.d,
    matrix.e,
    matrix.f,
  );
}

function drawRegisteredLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  frame: HunterRigFrame,
  boneId: HunterRigBoneId,
  options: RegisteredLayerOptions = {},
): boolean {
  if (!image) return false;
  const matrix = relativeBoneMatrix(frame, HUNTER_BIND_FRAME, boneId);
  context.save();
  context.globalAlpha *= options.alpha ?? 1;
  if (options.filter) context.filter = options.filter;
  applyAffine(context, matrix);
  context.translate(options.translateX ?? 0, options.translateY ?? 0);
  const scaleX = options.scaleX ?? options.scale ?? 1;
  const scaleY = options.scaleY ?? options.scale ?? 1;
  if (
    options.pivot &&
    (options.rotation || scaleX !== 1 || scaleY !== 1)
  ) {
    context.translate(options.pivot.x, options.pivot.y);
    if (options.rotation) context.rotate(options.rotation);
    context.scale(scaleX, scaleY);
    context.translate(-options.pivot.x, -options.pivot.y);
  }
  context.drawImage(
    image,
    0,
    0,
    HUNTER_RIG_CANVAS.width,
    HUNTER_RIG_CANVAS.height,
  );
  context.restore();
  return true;
}

function drawAtomicBodyPart(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  frame: HunterRigFrame,
  appearance: HunterAppearance,
  partId: HunterBodyPartId,
): void {
  const boneId = HUNTER_BODY_PART_BONES[partId];
  drawRegisteredLayer(
    context,
    assets.hunterBodyParts[partId],
    frame,
    boneId,
    { filter: bodyFilter(appearance) },
  );
  drawRegisteredLayer(
    context,
    assets.hunterNetParts[partId],
    frame,
    boneId,
    {
      alpha:
        appearance.armorStyleId === "feral"
          ? 0.28
          : appearance.bodyMorphId === "super"
            ? 0.58
            : 0.9,
    },
  );
}

function drawHunterBeltLoadout(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  frame: HunterRigFrame,
  loadout: Loadout,
): void {
  loadout.gearIds.forEach((gearId, slotIndex) => {
    const slot =
      HUNTER_GEAR_SLOT_OFFSETS[
        Math.min(slotIndex, HUNTER_GEAR_SLOT_OFFSETS.length - 1)
      ];
    drawRegisteredLayer(
      context,
      assets.hunterGear[gearId],
      frame,
      "pelvis",
      {
        translateX: slot.x,
        translateY: slot.y,
      },
    );
  });
}

function drawHunterHandWeapon(
  context: CanvasRenderingContext2D,
  state: GameState,
  loadout: Loadout,
  assets: AssetBank,
  frame: HunterRigFrame,
): void {
  const weaponId = selectedHandWeapon(
    loadout,
    state.player.activeWeaponSlot,
  );
  if (!weaponId) return;
  const weaponProjectileInFlight = state.projectiles.some(
    (projectile) =>
      !projectile.hostile &&
      projectile.life > 0 &&
      projectile.weaponId === weaponId,
  );

  const visualId: HunterWeaponVisualId =
    weaponId === "combistick" &&
    (state.player.climbing || state.trophyExtracting)
      ? "combistick-folded"
      : weaponId;
  const bowTransform =
    weaponId === "yautja-bow" && state.player.aiming
      ? {
          pivot: HUNTER_HAND_WEAPON_PIVOT,
          rotation:
            frame.facing > 0
              ? state.player.aimAngle
              : Math.PI - state.player.aimAngle,
        }
      : undefined;
  if (!(weaponId === "smart-disc" && weaponProjectileInFlight)) {
    drawRegisteredLayer(
      context,
      assets.hunterWeapons[visualId],
      frame,
      "handFront",
      bowTransform,
    );
  }

  if (
    weaponId === "yautja-bow" &&
    !weaponProjectileInFlight &&
    (state.player.aiming || state.player.weaponCooldown > 0.08)
  ) {
    drawRegisteredLayer(
      context,
      assets.hunterWeapons.arrow,
      frame,
      "handFront",
      bowTransform,
    );
  }
}

function drawHunterTrophyLayers(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  frame: HunterRigFrame,
  alpha = 1,
  carried = false,
  partId?: TrophyPartId,
): void {
  for (const trophyId of trophyAtomicLayerIds(partId)) {
    const image = assets.hunterTrophies[trophyId];
    const layout = HUNTER_TROPHY_LAYOUT[trophyId];
    if (!carried) {
      drawRegisteredLayer(
        context,
        image,
        frame,
        "pelvis",
        {
          alpha,
          translateX: layout.belt.x,
          translateY: layout.belt.y,
          pivot: layout.pivot,
          scale: layout.belt.scale,
        },
      );
      continue;
    }
    if (!image) continue;

    const rootScale = Math.hypot(
      frame.bones.root.a,
      frame.bones.root.b,
    );
    context.save();
    context.globalAlpha *= alpha;
    context.translate(
      frame.anchors.trophyCarry.x,
      frame.anchors.trophyCarry.y,
    );
    context.scale(frame.facing * rootScale, rootScale);
    context.translate(
      -HUNTER_BIND_FRAME.anchors.trophyCarry.x,
      -HUNTER_BIND_FRAME.anchors.trophyCarry.y,
    );
    context.translate(layout.carry.x, layout.carry.y);
    context.translate(layout.pivot.x, layout.pivot.y);
    context.scale(layout.carry.scale, layout.carry.scale);
    context.translate(-layout.pivot.x, -layout.pivot.y);
    context.drawImage(
      image,
      0,
      0,
      HUNTER_RIG_CANVAS.width,
      HUNTER_RIG_CANVAS.height,
    );
    context.restore();
  }
}

function drawClaimedTrophyLayers(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  frame: HunterRigFrame,
  trophy: TrophyVisualIdentity,
): void {
  const rootScale = Math.hypot(frame.bones.root.a, frame.bones.root.b);
  if (
    drawNamedTrophyAtAnchor(
      context,
      assets,
      trophy,
      frame.anchors.trophyCarry,
      frame.facing,
      rootScale,
    )
  ) {
    return;
  }
  drawHunterTrophyLayers(context, assets, frame, 1, true, trophy.partId);
}

function drawExtractingTrophyLayers(
  context: CanvasRenderingContext2D,
  assets: AssetBank,
  trophy: TrophyVisualIdentity,
  position: RigPoint,
  facing: -1 | 1,
  scale: number,
  rotation: number,
): void {
  if (
    drawNamedTrophyAtAnchor(
      context,
      assets,
      trophy,
      position,
      facing,
      scale,
      rotation,
    )
  ) {
    return;
  }
  const bindAnchor = HUNTER_BIND_FRAME.anchors.trophyCarry;
  context.save();
  context.translate(position.x, position.y);
  context.rotate(rotation);
  context.scale(facing * scale, scale);
  context.translate(-bindAnchor.x, -bindAnchor.y);
  for (const trophyId of trophyAtomicLayerIds(trophy.partId)) {
    const image = assets.hunterTrophies[trophyId];
    if (image) {
      const layout = HUNTER_TROPHY_LAYOUT[trophyId];
      context.save();
      context.translate(layout.carry.x, layout.carry.y);
      context.translate(layout.pivot.x, layout.pivot.y);
      context.scale(layout.carry.scale, layout.carry.scale);
      context.translate(-layout.pivot.x, -layout.pivot.y);
      context.drawImage(
        image,
        0,
        0,
        HUNTER_RIG_CANVAS.width,
        HUNTER_RIG_CANVAS.height,
      );
      context.restore();
    }
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
  const handWeaponId = selectedHandWeapon(
    loadout,
    player.activeWeaponSlot,
  );
  const frame = solvePlayerRigFrame(
    state,
    player,
    handWeaponId === "yautja-bow" && player.aiming
      ? player.aimAngle
      : undefined,
  );
  const atomicBodyReady = HUNTER_BODY_PART_IDS.every(
    (partId) => assets.hunterBodyParts[partId],
  );
  const armorTint = armorFilter(appearance);

  context.save();
  context.globalAlpha = alpha;

  // Calques arrière : dreadlocks et bras articulé du plasmacaster.
  if (assets.hunterDreads) {
    HUNTER_DREAD_STRANDS.forEach((strand, index) => {
      const dreadSwing =
        player.dreadAngles[index % Math.max(1, player.dreadAngles.length)] ?? 0;
      drawRegisteredLayer(
        context,
        assets.hunterDreads,
        frame,
        "head",
        {
          filter: dreadFilter(appearance.dreadTintId),
          pivot: HUNTER_DREAD_ROOT,
          rotation: strand.rest + dreadSwing * 0.55,
          scaleX: strand.mirror ? -strand.scale : strand.scale,
          scaleY: strand.scale,
          translateX: strand.x,
          translateY: strand.y,
        },
      );
    });
  }
  if (hasPlasmaCaster) {
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.mount,
      frame,
      "casterShoulderMount",
    );
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.upperArm,
      frame,
      "casterUpperArm",
    );
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.lowerArm,
      frame,
      "casterLowerArm",
    );
  }

  // Le trophée porté à la ceinture reste derrière l'anatomie. Un trophée
  // réellement arraché sera redessiné au premier plan dans la main.
  if (
    !state.trophyCarried &&
    appearance.trophyAdornmentId === "skull-spine"
  ) {
    drawHunterTrophyLayers(context, assets, frame, 0.82, false);
  }

  if (atomicBodyReady) {
    for (const partId of HUNTER_BACK_PARTS) {
      drawAtomicBodyPart(context, assets, frame, appearance, partId);
    }
    for (const partId of HUNTER_CORE_PARTS) {
      drawAtomicBodyPart(context, assets, frame, appearance, partId);
    }
  } else if (
    !drawRegisteredLayer(
      context,
      assets.hunterBodyFull,
      frame,
      "root",
      { filter: bodyFilter(appearance) },
    )
  ) {
    drawFallbackCharacter(
      context,
      player.x,
      player.y,
      player.width,
      player.height,
      "#8fd3ac",
      player.facing,
    );
  }

  // Armure centrale attachée au bassin et au torse.
  drawRegisteredLayer(
    context,
    assets.hunterArmor.belt,
    frame,
    "pelvis",
    { filter: armorTint },
  );
  drawRegisteredLayer(
    context,
    assets.hunterArmor.chest,
    frame,
    "torso",
    { filter: armorTint },
  );
  drawHunterBeltLoadout(context, assets, frame, loadout);

  if (atomicBodyReady) {
    drawAtomicBodyPart(context, assets, frame, appearance, "head");
    for (const partId of HUNTER_FRONT_PARTS) {
      drawAtomicBodyPart(context, assets, frame, appearance, partId);
    }
  }

  // L'arme secondaire suit la main avant. La main est redessinée ensuite
  // pour que la poignée reste réellement prise dans les doigts.
  drawHunterHandWeapon(context, state, loadout, assets, frame);
  if (atomicBodyReady) {
    drawAtomicBodyPart(context, assets, frame, appearance, "hand-front");
  }

  // Modules d'armure qui suivent réellement leur membre.
  drawRegisteredLayer(
    context,
    assets.hunterArmor.shoulder,
    frame,
    "armFrontUpper",
    {
      filter: armorTint,
      pivot: { x: 153, y: 110 },
      scale:
        HUNTER_ARMOR_FIT_BY_MORPH[appearance.bodyMorphId].shoulderScale,
    },
  );
  if (loadout.armorId !== "scout") {
    if (!hasWristblades) {
      drawRegisteredLayer(
        context,
        assets.hunterArmor.bracer,
        frame,
        "armFrontLower",
        { filter: armorTint },
      );
    }
    drawRegisteredLayer(
      context,
      assets.hunterArmor.thigh,
      frame,
      "legFrontUpper",
      { filter: armorTint },
    );
    drawRegisteredLayer(
      context,
      assets.hunterArmor.thighLower,
      frame,
      "legFrontLower",
      { filter: armorTint },
    );
    drawRegisteredLayer(
      context,
      assets.hunterArmor.knee,
      frame,
      "legFrontLower",
      { filter: armorTint },
    );
    drawRegisteredLayer(
      context,
      assets.hunterArmor.shin,
      frame,
      "legFrontLower",
      { filter: armorTint },
    );
  }

  // Gantelet : la base suit l'avant-bras arrière et le lid pivote sur sa
  // charnière canonique au lieu de fondre vers une seconde image complète.
  const gauntletFit =
    HUNTER_GAUNTLET_FIT_BY_MORPH[appearance.bodyMorphId];
  drawRegisteredLayer(
    context,
    assets.hunterGauntlet.base,
    frame,
    "armBackLower",
    {
      translateX: gauntletFit.translateX,
      translateY: gauntletFit.translateY,
    },
  );
  drawRegisteredLayer(
    context,
    assets.hunterGauntlet.lid,
    frame,
    "armBackLower",
    {
      pivot: HUNTER_GAUNTLET_HINGE,
      rotation: -1.12 * clamp(player.gauntletOpen, 0, 1),
      translateX: gauntletFit.translateX,
      translateY: gauntletFit.translateY,
    },
  );

  if (hasWristblades) {
    const extension = clamp(player.bladeExtension, 0, 1);
    drawRegisteredLayer(
      context,
      assets.hunterWristblades.blades,
      frame,
      "armFrontLower",
      {
        alpha: extension,
        translateX: -46 * (1 - extension),
      },
    );
    drawRegisteredLayer(
      context,
      assets.hunterWristblades.housing,
      frame,
      "armFrontLower",
    );
  }

  // Toute la tête du caster suit la chaîne yoke > cannon > barrel > muzzle.
  if (hasPlasmaCaster) {
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.yoke,
      frame,
      "casterYoke",
    );
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.cannon,
      frame,
      "casterCannon",
    );
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.barrel,
      frame,
      "casterBarrel",
    );
    drawRegisteredLayer(
      context,
      assets.hunterPlasma.muzzle,
      frame,
      "casterMuzzle",
    );
    if (player.aiming && player.maskOn && appearance.biomaskId) {
      drawRegisteredLayer(
        context,
        assets.hunterPlasma.laser,
        frame,
        "casterMuzzle",
        { alpha: 0.88 },
      );
    }
  }

  // Le biomask recouvre la tête du caster comme dans l'aperçu DOM
  // (mask z=70, caster z<=63).
  if (player.maskOn && appearance.biomaskId) {
    drawRegisteredLayer(
      context,
      assets.hunterMask,
      frame,
      "head",
    );
  }

  if (state.trophyCarried && state.trophyClaim) {
    drawClaimedTrophyLayers(context, assets, frame, state.trophyClaim);
  }
  context.restore();
}

function drawAimAssist(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  appearance: HunterAppearance,
): void {
  const player = state.player;
  if (!player.aiming) return;
  const target = player.aimPoint;
  const handWeaponId = selectedHandWeapon(
    loadout,
    player.activeWeaponSlot,
  );
  const frame = solvePlayerRigFrame(
    state,
    player,
    handWeaponId === "yautja-bow" ? player.aimAngle : undefined,
  );
  const origin = handWeaponId
    ? frame.anchors.handGrip
    : frame.anchors.muzzle;
  const color = LASER_COLOR_HEX[appearance.laserColorId ?? "crimson"] ?? mission.palette.accent;
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
  const activeWeaponId = equippedWeapon(
    loadout,
    player.activeWeaponSlot,
  ).id;
  const chargeRatio = hunterWeaponChargeRatio(
    activeWeaponId,
    player.weaponChargeSeconds,
  );
  if (chargeRatio > 0) {
    context.globalAlpha = 0.98;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(
      target.x,
      target.y,
      24,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * chargeRatio,
    );
    context.stroke();
  }
  context.restore();
}

function drawJunglePlatform(
  context: CanvasRenderingContext2D,
  platform: Platform,
  image: HTMLImageElement | null,
  surfaceRatio: number,
): void {
  if (!image) return;
  const drawWidth = platform.width + 24;
  const visualHeight =
    drawWidth * (image.naturalHeight / image.naturalWidth);
  context.drawImage(
    image,
    platform.x - 12,
    platform.y - visualHeight * surfaceRatio,
    drawWidth,
    visualHeight,
  );
}

function surfaceColor(material: TrackSurface["material"]): string {
  switch (material) {
    case "mud":
      return "#513b24";
    case "water":
      return "#388aa0";
    case "sand":
      return "#a98249";
    case "coral":
      return "#3f827c";
    case "mycelium":
      return "#674f76";
    case "obsidian":
      return "#252331";
    case "snow":
      return "#d6eff4";
    case "ice":
      return "#8dd9ed";
    case "ash":
      return "#716b68";
    case "metal":
      return "#72838a";
    case "basalt":
      return "#302d32";
    case "ruin":
      return "#665b4f";
    case "root":
      return "#604326";
    case "stone":
      return "#6d756e";
    default:
      return "#52633f";
  }
}

function trackSpeciesLabel(track: ObservedTrackMark): string {
  if (track.ownerSpecies === "human") return "HUMAIN";
  if (track.ownerSpecies === "beast") return "FAUNE";
  return "YAUTJA";
}

function drawObservedTrack(
  context: CanvasRenderingContext2D,
  state: GameState,
  track: ObservedTrackMark,
  accent: string,
): void {
  const freshness =
    1 -
    clamp(
      (state.elapsed - track.createdAtSeconds) / track.lifetimeSeconds,
      0,
      1,
    );
  const scale =
    track.ownerSpecies === "beast"
      ? 1.35
      : track.ownerSpecies === "yautja" || track.ownerSpecies === "hunter"
        ? 1.14
        : 0.92;
  const color =
    track.ownerId === "hunter"
      ? accent
      : track.ownerSpecies === "beast"
        ? "#ff735f"
        : track.ownerSpecies === "yautja"
          ? "#b99aff"
          : "#ffc15a";
  const lateralOffset = track.strideIndex % 2 === 0 ? -4 : 4;

  context.save();
  context.globalAlpha = (0.16 + freshness * 0.74) * track.intensity;
  context.translate(track.x, track.y - 3 + lateralOffset * 0.22);
  context.rotate(track.directionX * 0.22);
  context.scale(scale, scale);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 1.4;

  if (track.ownerSpecies === "beast") {
    context.beginPath();
    context.ellipse(0, 1, 6.5, 4.8, 0, 0, Math.PI * 2);
    context.fill();
    for (const toeX of [-6, -2, 2, 6]) {
      context.beginPath();
      context.ellipse(toeX, -5, 2.1, 3, toeX * 0.035, 0, Math.PI * 2);
      context.fill();
    }
  } else if (
    track.ownerSpecies === "yautja" ||
    track.ownerSpecies === "hunter"
  ) {
    context.beginPath();
    context.ellipse(-2.8, 0, 3.8, 7.6, -0.12, 0, Math.PI * 2);
    context.ellipse(3.2, -0.8, 3.2, 7, 0.14, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-6.5, -6);
    context.lineTo(-8.5, -10);
    context.moveTo(0, -7);
    context.lineTo(0, -11);
    context.moveTo(6.2, -6);
    context.lineTo(8.2, -10);
    context.stroke();
  } else {
    context.beginPath();
    context.ellipse(0, -2.5, 4.2, 7, 0, 0, Math.PI * 2);
    context.ellipse(0, 4.5, 5.4, 3.1, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  // A full scan annotates ownership, species and remaining lifetime rather
  // than showing anonymous marks that could be mistaken for player tracks.
  if (state.scanPulse > 0 && track.strideIndex % 4 === 0) {
    const remaining = Math.max(
      0,
      track.lifetimeSeconds - (state.elapsed - track.createdAtSeconds),
    );
    context.save();
    context.globalAlpha = 0.5 + freshness * 0.45;
    context.fillStyle = color;
    context.font = "700 9px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(
      `${track.ownerLabel.toUpperCase()} · ${trackSpeciesLabel(track)} · ${remaining.toFixed(1)} s`,
      track.x,
      track.y - 18,
    );
    context.restore();
  }
}

function drawDropShipExtraction(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  palette: MissionDefinition["palette"],
  assets: AssetBank,
): void {
  if (!state.dropShip) return;
  const extractionX = state.world.extraction.x;
  const visual = dropShipVisual(state.dropShip, extractionX);
  if (!visual.visible) return;

  if (visual.beamStrength > 0) {
    const beam = context.createLinearGradient(
      extractionX - 96,
      0,
      extractionX + 96,
      0,
    );
    beam.addColorStop(0, `${palette.accent}00`);
    beam.addColorStop(0.5, `${palette.accent}bb`);
    beam.addColorStop(1, `${palette.accent}00`);
    context.save();
    context.globalAlpha = visual.beamStrength;
    context.fillStyle = beam;
    context.fillRect(
      extractionX - 96,
      visual.y + 28,
      192,
      state.world.floorY - visual.y - 28,
    );
    context.strokeStyle = palette.accent;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(
      extractionX,
      state.world.floorY - 14,
      58,
      14,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  // Procedural silhouette keeps the transport readable even before a bespoke
  // sprite is available: hull, stabilisers, cockpit and open ventral hatch.
  context.save();
  context.translate(visual.x, visual.y);
  context.shadowColor = "#000000cc";
  context.shadowBlur = 24;
  if (assets.shipsAtlas) {
    const shipVisual = getV6Visual(
      V6_MISSION_VISUALS[mission.id].extractionShipId,
    );
    const shipWidth = 308;
    const shipHeight =
      shipWidth * (shipVisual.crop.height / shipVisual.crop.width);
    context.drawImage(
      assets.shipsAtlas,
      shipVisual.crop.x,
      shipVisual.crop.y,
      shipVisual.crop.width,
      shipVisual.crop.height,
      -shipWidth / 2,
      -shipHeight / 2,
      shipWidth,
      shipHeight,
    );
    context.globalAlpha = 0.24;
  }
  context.fillStyle = "#172521";
  context.strokeStyle = `${palette.accent}aa`;
  context.lineWidth = 2.4;
  context.beginPath();
  context.moveTo(-116, 4);
  context.lineTo(-72, -30);
  context.quadraticCurveTo(-18, -55, 58, -34);
  context.lineTo(116, -4);
  context.lineTo(70, 25);
  context.lineTo(-78, 28);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#263b34";
  context.beginPath();
  context.moveTo(-72, -24);
  context.lineTo(-132, -50);
  context.lineTo(-94, 4);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(64, -24);
  context.lineTo(124, -43);
  context.lineTo(92, 4);
  context.closePath();
  context.fill();
  context.fillStyle = `${palette.sky}dd`;
  context.beginPath();
  context.ellipse(34, -27, 28, 10, 0.13, Math.PI, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = "#030706";
  context.fillRect(-24, 19, 54, 8 + visual.doorOpen * 13);
  context.strokeStyle = palette.accent;
  context.strokeRect(-24, 19, 54, 8 + visual.doorOpen * 13);
  context.fillStyle = palette.accent;
  for (const engineX of [-82, 82]) {
    context.globalAlpha = 0.72 + Math.sin(state.elapsed * 13 + engineX) * 0.2;
    context.fillRect(engineX - 13, 24, 26, 5);
  }
  context.restore();
}

function drawAmbientFauna(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  screens: readonly WorldScreenSector[],
  assets: AssetBank,
): void {
  if (!assets.preyAtlas) return;

  const fauna = getV6Visual(V6_MISSION_VISUALS[mission.id].faunaId);
  const baseHeight = mission.biome === "ice" ? 112 : 126;
  const baseWidth = baseHeight * (fauna.crop.width / fauna.crop.height);

  for (const [index, screen] of screens.entries()) {
    // Ambient wildlife acts as a tracking clue. Keep the first tutorial room
    // and the extraction pad clear so objectives remain readable.
    if (index === 0 || index === screens.length - 1 || index % 2 === 0) {
      continue;
    }
    const x = screen.startX + (screen.endX - screen.startX) * 0.72;
    const bob = Math.sin(state.elapsed * 1.25 + index * 1.7) * 2;

    context.save();
    context.globalAlpha = 0.5;
    context.translate(x, state.world.floorY + bob);
    if (index % 4 === 3) context.scale(-1, 1);
    context.drawImage(
      assets.preyAtlas,
      fauna.crop.x,
      fauna.crop.y,
      fauna.crop.width,
      fauna.crop.height,
      -baseWidth / 2,
      -baseHeight,
      baseWidth,
      baseHeight,
    );
    context.restore();
  }
}

function hazardColor(kind: WorldBlueprint["hazards"][number]["kind"]): string {
  if (kind === "lava" || kind === "steam-vent") return "#ff6338";
  if (
    kind === "thin-ice" ||
    kind === "falling-ice" ||
    kind === "whiteout"
  ) {
    return "#b9efff";
  }
  if (kind === "flash-flood") return "#48b2d0";
  if (kind === "ash-squall") return "#c0a995";
  if (kind === "tidal-surge" || kind === "rogue-wave") return "#38b9d2";
  if (kind === "sand-collapse" || kind === "glass-storm") return "#d9a85f";
  if (kind === "heat-burst") return "#ff8c42";
  if (kind === "electrical-surge") return "#75f4ff";
  if (kind === "abyssal-vent") return "#49d9b8";
  if (
    kind === "spore-cloud" ||
    kind === "mycelial-snare" ||
    kind === "acid-bloom"
  ) {
    return "#bf70e8";
  }
  if (
    kind === "gravity-pulse" ||
    kind === "nanite-field" ||
    kind === "laser-grid"
  ) {
    return "#ff4fd8";
  }
  return "#d8ff5f";
}

function environmentPropImage(
  assets: AssetBank,
  asset: Pick<EnvironmentPropRuntimeAsset, "runtimeUrl">,
): HTMLImageElement | null {
  return assets.environmentProps[asset.runtimeUrl] ?? null;
}

function drawEnvironmentGameplayProp(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  role: EnvironmentPropRuntimeAsset["role"],
  bounds: { x: number; y: number; width: number; height: number },
  opacity = 1,
): void {
  drawEnvironmentProp(context, image, role, bounds, opacity);
}

function drawEnvironmentDecorPass(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  assets: AssetBank,
  renderPass: EnvironmentDecorPropPlacement["renderPass"],
  cameraX: number,
): void {
  const placements = cullEnvironmentDecorPlacements(
    environmentDecorPlacementsForMission(mission.id, renderPass),
    {
      left: cameraX,
      right: cameraX + VIEW_WIDTH,
      overscan: 220,
    },
  );

  for (const placement of placements) {
    const image = environmentPropImage(assets, placement.asset);
    if (!image) continue;
    const ratio =
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : 1;
    const width = placement.estimatedWidth;
    const height = width / ratio;
    const anchorY =
      placement.anchor === "floor"
        ? state.world.floorY
        : placement.anchorY;

    context.save();
    context.translate(placement.x, anchorY);
    if (placement.mirrored) context.scale(-1, 1);
    context.globalAlpha =
      placement.opacity *
      (placement.asset.role === "decoration" ? 1 : 0.3);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      -width / 2,
      placement.anchor === "floor" ? -height : 0,
      width,
      height,
    );
    context.restore();
  }
}

function drawWorldClimbable(
  context: CanvasRenderingContext2D,
  zone: ClimbZone,
  assets: AssetBank,
  mission: MissionDefinition,
  palette: MissionDefinition["palette"],
  encounterRun: number,
): void {
  const assignment = environmentGameplayPropForGeometryId(
    mission.id,
    zone.id,
    encounterRun,
  );
  const environmentImage = assignment
    ? environmentPropImage(assets, assignment.asset)
    : null;
  if (environmentImage && assignment) {
    drawEnvironmentGameplayProp(
      context,
      environmentImage,
      assignment.asset.role,
      zone,
      zone.kind === "vine" ? 0.92 : 0.98,
    );
    return;
  }
  const image =
    zone.kind === "tree"
      ? assets.treeTrunk
      : zone.kind === "vine"
        ? assets.vineLadder
        : null;
  if (image) {
    const drawWidth = zone.height * (image.naturalWidth / image.naturalHeight);
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
    return;
  }

  const flexible =
    zone.kind === "rope" || zone.kind === "chain" || zone.kind === "ladder";
  context.save();
  context.globalAlpha = 0.84;
  context.strokeStyle = flexible ? palette.accent : palette.platform;
  context.lineWidth = flexible ? 4 : Math.max(8, zone.width * 0.18);
  if (flexible) {
    const left = zone.x + zone.width * 0.28;
    const right = zone.x + zone.width * 0.72;
    context.beginPath();
    context.moveTo(left, zone.y);
    context.lineTo(left, zone.y + zone.height);
    context.moveTo(right, zone.y);
    context.lineTo(right, zone.y + zone.height);
    for (let y = zone.y + 16; y < zone.y + zone.height; y += 24) {
      context.moveTo(left, y);
      context.lineTo(right, y);
    }
    context.stroke();
  } else {
    context.fillStyle = `${palette.platform}cc`;
    context.fillRect(zone.x, zone.y, zone.width, zone.height);
    context.strokeStyle = `${palette.accent}99`;
    context.lineWidth = 3;
    for (let y = zone.y + 18; y < zone.y + zone.height; y += 34) {
      context.beginPath();
      context.moveTo(zone.x + 4, y);
      context.lineTo(zone.x + zone.width - 4, y - 12);
      context.stroke();
    }
  }
  context.restore();
}

function drawWorldSectorOverlay(
  context: CanvasRenderingContext2D,
  sector: WorldScreenSector,
  index: number,
  total: number,
  accent: string,
): void {
  context.save();
  context.fillStyle = "#020706dc";
  context.fillRect(20, 88, 420, 66);
  context.fillStyle = accent;
  context.font = "800 11px system-ui, sans-serif";
  context.letterSpacing = "1.5px";
  context.fillText(
    `SECTEUR ${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`,
    34,
    108,
  );
  context.fillStyle = "#f1e7cf";
  context.font = "900 18px system-ui, sans-serif";
  context.letterSpacing = "0px";
  context.fillText(sector.label.toUpperCase(), 34, 132, 382);
  context.fillStyle = "#8fa198";
  context.font = "500 11px system-ui, sans-serif";
  context.fillText(sector.objectiveCue, 34, 148, 382);
  context.restore();
}

function renderGame(
  context: CanvasRenderingContext2D,
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  appearance: HunterAppearance,
  assets: AssetBank,
  encounterRun: number,
  deviceScale: number,
): void {
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const shakeX =
    state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;
  const cameraX = state.cameraX + shakeX;
  const palette = mission.palette;
  const worldScreenLayout = worldScreensFor(mission.id);

  // Background and parallax atmosphere.
  const sky = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, palette.sky);
  sky.addColorStop(0.68, palette.haze);
  sky.addColorStop(1, palette.ground);
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (assets.background) {
    const image = assets.background;
    const activeSector = getWorldScreenAtX(
      mission.id,
      cameraX + VIEW_WIDTH / 2,
    );
    const usesStackedPanorama = mission.biome === "jungle";
    // The OpenAI panorama is deliberately composed as three unequal rooms:
    // 430 px surface, 206 px ruins and 305 px flooded understory. Equal thirds
    // sliced through the lake and duplicated the first room in later sectors.
    const jungleBand = {
      surface: { y: 0, height: 430 },
      "mid-depth": { y: 430, height: 206 },
      understory: { y: 636, height: 305 },
    }[activeSector.layers.background.band];
    const sourceHeight = usesStackedPanorama
      ? jungleBand.height
      : image.naturalHeight;
    const sourceY = usesStackedPanorama ? jungleBand.y : 0;
    const sourceRatio = image.naturalWidth / sourceHeight;
    const drawHeight = VIEW_HEIGHT;
    const drawWidth = Math.max(VIEW_WIDTH, drawHeight * sourceRatio);
    const offset = -((cameraX * activeSector.layers.background.parallax) % drawWidth);
    context.save();
    context.globalAlpha = 0.78;
    for (let x = offset - drawWidth; x < VIEW_WIDTH + drawWidth; x += drawWidth) {
      context.drawImage(
        image,
        0,
        sourceY,
        image.naturalWidth,
        sourceHeight,
        x,
        0,
        drawWidth,
        drawHeight,
      );
    }
    context.restore();
    context.fillStyle = `${palette.sky}55`;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  // Le panorama V4 contient déjà son lac en plans lointain, médian et proche.
  // L'ancien calque V2 reste un fallback, mais ne doit pas couper l'image V4.
  if (mission.biome === "jungle" && assets.farLake && !assets.background) {
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

  if (mission.id === PILOT_MISSION_ID) drawPilotBackdrop(context, cameraX);
  if (mission.id === ICE_MISSION_ID) drawIceRegionBackdrop(context, cameraX, assets.iceRegionTextures);

  // World geometry and mission markers.
  context.fillStyle = palette.ground;
  context.fillRect(
    0,
    state.world.floorY,
    state.world.width,
    VIEW_HEIGHT - state.world.floorY,
  );
  context.fillStyle = `${palette.accent}22`;
  for (let x = 0; x < state.world.width; x += 160) {
    context.fillRect(x, state.world.floorY + 6, 84, 3);
  }
  drawEnvironmentDecorPass(
    context,
    state,
    mission,
    assets,
    "world-back",
    cameraX,
  );
  context.save();
  context.globalAlpha = 0.34;
  context.strokeStyle = palette.accent;
  context.fillStyle = palette.accent;
  context.setLineDash([9, 13]);
  context.lineWidth = 2;
  context.font = "800 11px system-ui, sans-serif";
  for (const [index, connection] of worldScreenLayout.connections.entries()) {
    context.beginPath();
    context.moveTo(connection.transitionX, 76);
    context.lineTo(connection.transitionX, state.world.floorY);
    context.stroke();
    context.fillText(
      `PASSAGE ${String(index + 2).padStart(2, "0")}`,
      connection.transitionX + 10,
      98,
    );
  }
  context.restore();

  for (const surface of state.world.surfaces) {
    const assignment = environmentGameplayPropForGeometryId(
      mission.id,
      surface.id,
      encounterRun,
    );
    const image = assignment
      ? environmentPropImage(assets, assignment.asset)
      : null;
    if (image && assignment) {
      drawEnvironmentGameplayProp(
        context,
        image,
        assignment.asset.role,
        surface,
        surface.material === "water" ? 0.84 : 0.76,
      );
    } else {
      context.save();
      context.globalAlpha =
        surface.material === "water" ? 0.7 : 0.5;
      context.fillStyle = surfaceColor(surface.material);
      context.fillRect(surface.x, surface.y, surface.width, surface.height);
      context.restore();
    }
  }
  drawAmbientFauna(
    context,
    state,
    mission,
    worldScreenLayout.screens,
    assets,
  );
  for (const zone of state.world.climbables) {
    drawWorldClimbable(
      context,
      zone,
      assets,
      mission,
      palette,
      encounterRun,
    );
  }

  const junglePlatformImages = [
    assets.platformRoot,
    assets.platformStone,
    assets.platformCrown,
    assets.platformExpedition,
  ] as const;
  const junglePlatformSurfaceRatios = [0.2, 0.22, 0.38, 0.42] as const;
  for (let index = 0; index < state.world.platforms.length; index += 1) {
    const platform = state.world.platforms[index];
    if (platform.id.startsWith("ice-region-") || platform.id === "ice-mine-relay" || platform.id === "ice-return-hatch") {
      drawIceRegionPlatform(context, platform, assets.iceRegionTextures);
      continue;
    }
    if (platform.id.startsWith("jungle-pilot-") || platform.id === "jungle-resonance-seal" || platform.id === "jungle-canopy-hatch") {
      drawPilotPlatform(context, platform, assets.platformStone);
      continue;
    }
    const assignment = environmentGameplayPropForGeometryId(
      mission.id,
      platform.id,
      encounterRun,
    );
    const image = assignment
      ? environmentPropImage(assets, assignment.asset)
      : null;
    if (image && assignment) {
      drawEnvironmentGameplayProp(
        context,
        image,
        assignment.asset.role,
        platform,
      );
    } else if (mission.biome === "jungle") {
      const junglePlatformIndex =
        platform.material === "stone"
          ? 1
          : platform.material === "metal"
            ? 3
            : index % junglePlatformImages.length;
      drawJunglePlatform(
        context,
        platform,
        junglePlatformImages[junglePlatformIndex],
        junglePlatformSurfaceRatios[junglePlatformIndex],
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

  if (mission.id === PILOT_MISSION_ID) {
    drawPilotDevices(context, state.exploration, { stone: assets.platformStone, module: assets.pilotModule });
  }
  if (mission.id === ICE_MISSION_ID) {
    drawIceRegionDevices(context, state.exploration, assets.iceRegionTextures);
  }
  for (const cover of state.world.covers) {
    const broken = state.brokenPillarIds.has(cover.id);
    const assignment = environmentGameplayPropForGeometryId(
      mission.id,
      cover.id,
      encounterRun,
    );
    const image = assignment
      ? environmentPropImage(assets, assignment.asset)
      : null;
    if (image && assignment) {
      drawEnvironmentGameplayProp(
        context,
        image,
        assignment.asset.role,
        broken
          ? {
              ...cover,
              y: cover.y + cover.height * 0.62,
              height: cover.height * 0.38,
            }
          : cover,
        broken ? 0.28 : 0.9,
      );
    } else {
      context.save();
      context.globalAlpha = broken ? 0.28 : 0.78;
      roundedPanel(
        context,
        cover.x,
        broken ? cover.y + cover.height * 0.62 : cover.y,
        cover.width,
        broken ? cover.height * 0.38 : cover.height,
        5,
        `${palette.platform}dd`,
        `${palette.accent}77`,
      );
      context.restore();
    }
  }

  for (const hazard of state.world.hazards) {
    const assignment = environmentGameplayPropForGeometryId(
      mission.id,
      hazard.id,
      encounterRun,
    );
    const image = assignment
      ? environmentPropImage(assets, assignment.asset)
      : null;
    if (image && assignment) {
      drawEnvironmentGameplayProp(
        context,
        image,
        assignment.asset.role,
        hazard,
        0.88,
      );
    }
    const hazardPhase = hazardPhaseAt(hazard, state.elapsed);
    if (hazardPhase === "inactive") continue;
    const telegraphing = hazardPhase === "telegraph";
    const pulse = telegraphing
      ? 0.17 + Math.sin(state.elapsed * 11 + hazard.x * 0.01) * 0.07
      : 0.1 + Math.sin(state.elapsed * 7 + hazard.x * 0.01) * 0.035;
    context.save();
    context.globalAlpha = pulse;
    context.fillStyle = hazardColor(hazard.kind);
    context.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
    context.strokeStyle = hazardColor(hazard.kind);
    context.lineWidth = telegraphing ? 3 : 2;
    context.setLineDash(telegraphing ? [4, 5] : [10, 8]);
    context.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
    context.setLineDash([]);
    context.restore();
  }

  for (const effect of state.arsenal.activeEffects) {
    if (effect.kind !== "reveal") continue;
    const progress =
      1 - effect.remainingSeconds / Math.max(0.01, effect.durationSeconds);
    context.save();
    context.globalAlpha = 0.18 + (1 - progress) * 0.35;
    context.strokeStyle = palette.accent;
    context.lineWidth = 3;
    context.setLineDash([10, 12]);
    context.beginPath();
    context.arc(
      effect.origin.x,
      effect.origin.y,
      Math.max(20, effect.radiusPx * progress),
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }
  for (const trap of state.traps) {
    context.save();
    context.translate(trap.x, trap.y);
    const pulse = 0.72 + Math.sin(state.elapsed * 7 + trap.x) * 0.2;
    context.globalAlpha = trap.armed ? pulse : 0.25;
    context.strokeStyle =
      trap.kind === "audio-decoy"
        ? palette.accent
        : trap.kind === "netgun"
          ? "#a4f7d2"
          : "#d6bc78";
    context.fillStyle = "#07100ed9";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, trap.kind === "netgun" ? 15 : 12, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (trap.kind === "audio-decoy") {
      context.beginPath();
      context.arc(0, -8, 13 + Math.sin(state.elapsed * 5) * 4, Math.PI * 1.1, Math.PI * 1.9);
      context.stroke();
    } else if (trap.kind === "netgun") {
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(
        Math.cos(state.player.aimAngle) * 58,
        Math.sin(state.player.aimAngle) * 58,
      );
      context.stroke();
      context.setLineDash([]);
    }
    context.restore();
  }

  if (state.player.maskOn || state.scanPulse > 0) {
    for (const track of state.tracks) {
      drawObservedTrack(context, state, track, palette.accent);
    }
  }
  if (state.scanPulse > 0) {
    for (const scent of state.scentNodes) {
      context.save();
      context.globalAlpha = scent.strength * 0.18;
      context.strokeStyle = palette.accent;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(scent.x, scent.y, scent.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
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

  const purgeActive =
    state.bossMechanics.missionId === "volcano-bad-blood" &&
    state.bossMechanics.purgeSeconds !== null &&
    !state.bossMechanics.purgeResolved;
  if (purgeActive) {
    for (const consoleNode of state.purgeConsoleNodes) {
      context.save();
      context.translate(consoleNode.x, consoleNode.y);
      context.globalAlpha = consoleNode.recovered ? 0.3 : 1;
      roundedPanel(
        context,
        -20,
        -30,
        40,
        48,
        5,
        consoleNode.recovered ? "#314239" : "#4d1614",
        consoleNode.recovered ? "#79c99b" : "#ff594a",
      );
      context.fillStyle = consoleNode.recovered ? "#79c99b" : "#ff594a";
      context.fillRect(-12, -22, 24, 6);
      context.font = "700 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(
        consoleNode.recovered ? "COUPÉE" : "[E] PURGE",
        0,
        -38,
      );
      context.restore();
    }
  }

  if (!state.boss.active && state.phase !== "extraction") {
    context.save();
    context.globalAlpha = 0.75;
    context.fillStyle = `${palette.danger}66`;
    context.fillRect(
      state.world.bossArena.x - 35,
      250,
      18,
      state.world.floorY - 250,
    );
    context.strokeStyle = palette.danger;
    context.setLineDash([10, 10]);
    context.strokeRect(
      state.world.bossArena.x - 45,
      240,
      38,
      state.world.floorY - 230,
    );
    context.setLineDash([]);
    context.restore();
  }

  if (state.phase === "extraction") {
    drawDropShipExtraction(context, state, mission, palette, assets);
  }

  if (
    state.bossDefeatedAt !== null &&
    (state.phase === "trophy" || state.phase === "extraction")
  ) {
    const corpseImage = bossSprite(mission, assets);
    if (corpseImage) {
      const corpseAlpha = state.phase === "trophy" ? 0.82 : 0.48;
      if (ecologyV8EnemyForId(state.boss.archetype)) {
        drawEnemySheetFrame(
          context,
          corpseImage,
          5,
          state.boss.x,
          FLOOR_Y - state.boss.height,
          state.boss.width,
          state.boss.height,
          state.boss.facing,
          corpseAlpha,
        );
      } else {
        context.save();
        context.globalAlpha = corpseAlpha;
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
  }

  if (state.phase === "trophy" && state.bossDefeatedAt !== null) {
    const pulse = 0.7 + Math.sin(state.elapsed * 5) * 0.25;
    const ritualCue =
      state.trophyRitual?.sequence[state.trophyRitual.cueIndex];
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
      state.trophyExtracting && ritualCue
        ? `${trophyCueLabel(ritualCue)} · ${state.trophyRitual!.cueIndex + 1}/${state.trophyRitual!.sequence.length}`
        : "TROPHÉE [E]",
      state.boss.x + state.boss.width / 2,
      FLOOR_Y - 104,
    );
    if (state.trophyExtracting && state.trophyRitual) {
      const ritualReady = state.trophyRitual.phase === "ready";
      const timing = ritualReady
        ? 0
        : clamp(
            state.trophyRitual.cueElapsedSeconds /
              TROPHY_RITUAL_TIMING.cueTimeoutSeconds,
            0,
            1,
          );
      context.globalAlpha = 0.9;
      context.lineWidth = 6;
      context.strokeStyle = `${palette.sky}77`;
      context.beginPath();
      context.arc(
        state.boss.x + state.boss.width / 2,
        FLOOR_Y - 52,
        49,
        -Math.PI / 2,
        Math.PI * 1.5,
      );
      context.stroke();
      context.strokeStyle =
        state.trophyRitual.mistakes > 1 ? palette.danger : palette.accent;
      context.beginPath();
      context.arc(
        state.boss.x + state.boss.width / 2,
        FLOOR_Y - 52,
        49,
        -Math.PI / 2,
        -Math.PI / 2 + timing * Math.PI * 2,
      );
      context.stroke();
      context.font = "800 10px system-ui, sans-serif";
      context.fillText(
        ritualReady
          ? `OBSERVE · ${trophyRitualReadyRemaining(state.trophyRitual).toFixed(1)} S`
          : `ERREURS ${state.trophyRitual.mistakes}/${TROPHY_RITUAL_TIMING.maximumMistakes}`,
        state.boss.x + state.boss.width / 2,
        FLOOR_Y - 122,
      );
    }
    context.restore();

    if (state.trophyExtracting) {
      const eased =
        state.trophyExtraction *
        state.trophyExtraction *
        (3 - 2 * state.trophyExtraction);
      const startX = state.boss.x + state.boss.width * 0.52;
      const startY = FLOOR_Y - 66;
      const trophyCarry =
        solvePlayerRigFrame(state, state.player).anchors.trophyCarry;
      const endX = trophyCarry.x + state.player.facing * 18;
      const endY = trophyCarry.y;
      const trophyX = startX + (endX - startX) * eased;
      const trophyY =
        startY + (endY - startY) * eased - Math.sin(eased * Math.PI) * 54;
      drawExtractingTrophyLayers(
        context,
        assets,
        {
          definitionId: mission.trophy.id,
          partId: mission.trophy.partId,
        },
        { x: trophyX, y: trophyY },
        state.player.facing,
        state.player.height / HUNTER_RIG_CANVAS.height,
        (1 - eased) * 0.65 * state.player.facing,
      );
    }
  }

  drawGuardianAdaptiveField(context, state, palette);

  // Enemies, boss and projectiles.
  const visibleEnemies = [
    ...state.enemies.filter(
      (enemy) => enemy.active && (enemy.alive || enemy.deathAnimation > 0),
    ),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ];
  for (const enemy of visibleEnemies) {
    const v8Enemy = ecologyV8EnemyForId(enemy.archetype);
    const v7Enemy = enemyV7ForId(enemy.archetype);
    const sheetImage = v8Enemy
      ? (assets.enemyV8[v8Enemy.id] ?? null)
      : v7Enemy
        ? (assets.enemyV7[v7Enemy.id] ?? null)
        : null;
    const image = sheetImage ?? enemySprite(enemy, mission, assets);
    const telegraphAlpha =
      enemy.telegraph > 0 ? 0.72 + Math.sin(state.elapsed * 22) * 0.2 : 1;
    const alpha =
      telegraphAlpha *
      (enemy.boss ? Math.max(0.18, state.bossThermalVisibility) : 1);
    if (image && sheetImage) {
      drawEnemySheetFrame(
        context,
        image,
        enemyAnimationFrame(enemy, state.elapsed),
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height,
        enemy.facing,
        alpha * (enemy.alive ? 1 : clamp(enemy.deathAnimation / 0.85, 0, 1)),
      );
    } else if (image) {
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
    if (enemy.alive && (enemy.hitFlash > 0 || enemy.scanned)) {
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
    if (
      enemy.alive &&
      !enemy.boss &&
      (enemy.scanned || enemy.health < enemy.maxHealth)
    ) {
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

  // Secondary claims remain physical objects in the world until their short
  // field rite succeeds. V18 uses compact transparent exports so this does not
  // pull the bestiary-only V17 cutouts into the Canvas runtime.
  const activeRegularDrop = state.regularTrophyDropId
    ? state.regularTrophyDrops.find(
        (drop) => drop.id === state.regularTrophyDropId,
      )
    : null;
  const playerCenter = {
    x: state.player.x + state.player.width / 2,
    y: state.player.y + state.player.height / 2,
  };
  const regularDropTrophyCarry =
    solvePlayerRigFrame(state, state.player).anchors.trophyCarry;
  for (const drop of state.regularTrophyDrops) {
    if (drop.collected) continue;
    const isActive =
      state.trophyExtracting && activeRegularDrop?.id === drop.id;
    const eased = isActive
      ? state.trophyExtraction *
        state.trophyExtraction *
        (3 - 2 * state.trophyExtraction)
      : 0;
    const startX = drop.x;
    const startY = drop.y - 18;
    const trophyX = isActive
      ? startX + (regularDropTrophyCarry.x - startX) * eased
      : startX;
    const trophyY = isActive
      ? startY +
        (regularDropTrophyCarry.y - startY) * eased -
        Math.sin(eased * Math.PI) * 38
      : startY;
    const image = assets.enemyTrophies[drop.claim.definitionId] ?? null;
    const pulse = 0.72 + Math.sin(state.elapsed * 5 + drop.x * 0.01) * 0.18;

    context.save();
    context.globalAlpha = isActive ? 1 : pulse;
    context.strokeStyle = palette.accent;
    context.lineWidth = isActive ? 3 : 2;
    context.setLineDash(isActive ? [] : [5, 6]);
    context.beginPath();
    context.arc(trophyX, trophyY, isActive ? 38 : 34, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    if (image) {
      const trophySize = isActive ? 58 : 52;
      context.drawImage(
        image,
        trophyX - trophySize / 2,
        trophyY - trophySize / 2,
        trophySize,
        trophySize,
      );
    } else {
      context.translate(trophyX, trophyY);
      context.rotate(Math.PI / 4);
      context.fillStyle = palette.accent;
      context.fillRect(-10, -10, 20, 20);
    }
    context.restore();

    const nearby =
      !isActive && distance(playerCenter, drop) <= 110;
    const ritualCue = isActive
      ? state.trophyRitual?.sequence[state.trophyRitual.cueIndex]
      : null;
    if (nearby || ritualCue) {
      context.save();
      context.fillStyle = palette.accent;
      context.font = "800 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(
        ritualCue && state.trophyRitual
          ? `${trophyCueLabel(ritualCue)} · ${state.trophyRitual.cueIndex + 1}/${state.trophyRitual.sequence.length}`
          : `${drop.name.toUpperCase()} [E]`,
        isActive ? startX : trophyX,
        startY - 48,
        240,
      );
      if (isActive && state.trophyRitual) {
        const timing =
          state.trophyRitual.phase === "ready"
            ? 0
            : clamp(
                state.trophyRitual.cueElapsedSeconds /
                  TROPHY_RITUAL_TIMING.cueTimeoutSeconds,
                0,
                1,
              );
        context.lineWidth = 5;
        context.strokeStyle =
          state.trophyRitual.mistakes > 1
            ? palette.danger
            : palette.accent;
        context.beginPath();
        context.arc(
          startX,
          startY,
          43,
          -Math.PI / 2,
          -Math.PI / 2 + timing * Math.PI * 2,
        );
        context.stroke();
        context.font = "800 9px system-ui, sans-serif";
        context.fillText(
          state.trophyRitual.phase === "ready"
            ? `OBSERVE · ${trophyRitualReadyRemaining(state.trophyRitual).toFixed(1)} S`
            : `ERREURS ${state.trophyRitual.mistakes}/${TROPHY_RITUAL_TIMING.maximumMistakes}`,
          startX,
          startY - 61,
        );
      }
      context.restore();
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

  if (state.trophyVictory && !state.trophyVictory.complete) {
    const progress = clamp(
      state.trophyVictory.elapsedSeconds /
        state.trophyVictory.durationSeconds,
      0,
      1,
    );
    const centerX = state.player.x + state.player.width / 2;
    const centerY = state.player.y + state.player.height * 0.45;
    context.save();
    context.globalAlpha = 1 - progress * 0.45;
    context.strokeStyle = palette.accent;
    context.lineWidth = 3;
    context.setLineDash([8, 7]);
    context.beginPath();
    context.arc(centerX, centerY, 48 + progress * 95, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = palette.accent;
    context.font = "900 15px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("TROPHÉE REVENDIQUÉ", centerX, state.player.y - 18);
    context.restore();
  }

  // Chasseur assemblé en couches indépendantes.
  const hunterAlpha = state.player.cloaked
    ? 0.24 + Math.sin(state.elapsed * 8) * 0.07
    : 1;
  const boardingVisual = state.dropShip
    ? dropShipVisual(state.dropShip, state.world.extraction.x)
    : null;
  const hunterInsideShip =
    state.dropShip?.phase === "departure" ||
    state.dropShip?.phase === "complete" ||
    (state.dropShip?.phase === "boarding" &&
      (boardingVisual?.boardingProgress ?? 0) > 0.93);
  if (!hunterInsideShip) {
    drawHunterLayered(
      context,
      state,
      loadout,
      appearance,
      assets,
      hunterAlpha,
    );
    drawAimAssist(context, state, mission, loadout, appearance);
  }
  const meleePhaseLabel = huntMeleePhaseLabel(state.player.melee);
  if (!hunterInsideShip && meleePhaseLabel) {
    const meleeAttack = currentHuntMeleeAttack(state.player.melee);
    const centerX =
      state.player.x +
      state.player.width / 2 +
      state.player.melee.facing *
        Math.min(84, (meleeAttack?.reachPx ?? 108) * 0.48);
    const centerY = state.player.y + state.player.height * 0.48;
    context.save();
    if (state.player.melee.phase === "active") {
      context.strokeStyle =
        state.player.melee.comboIndex === 2 ? "#ffe29a" : "#e4fff5";
      context.lineWidth = state.player.melee.comboIndex === 2 ? 7 : 5;
      context.beginPath();
      context.arc(
        centerX,
        centerY,
        Math.min(76, 48 + (meleeAttack?.reachPx ?? 90) * 0.18),
        state.player.melee.facing < 0 ? Math.PI * 0.55 : -Math.PI * 0.45,
        state.player.melee.facing < 0 ? Math.PI * 1.45 : Math.PI * 0.45,
      );
      context.stroke();
    }
    context.fillStyle =
      state.player.melee.phase === "active" ? "#f4fff9" : "#a7c8bb";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    const comboSuffix =
      state.player.melee.actionKind === "light" &&
      state.player.melee.phase !== "idle"
        ? `  ${state.player.melee.comboIndex + 1}/3`
        : "";
    context.fillText(
      `${meleePhaseLabel}${comboSuffix}`,
      state.player.x + state.player.width / 2,
      state.player.y - 12,
    );
    context.restore();
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
  drawEnvironmentDecorPass(
    context,
    state,
    mission,
    assets,
    "actor-occluder",
    cameraX,
  );
  if (mission.biome === "jungle") {
    context.save();
    context.globalAlpha = 0.9;
    // Keep the initial spawn lane readable: the hunter starts at x=150 and
    // occupies x=150..222, while a foreground fern is 150 px wide. A fern at
    // x=120 therefore covered the complete modular rig before the first input.
    const fernPositions = worldScreenLayout.screens.map(
      (screen) => screen.startX + (screen.endX - screen.startX) * 0.28,
    );
    for (const x of fernPositions) {
      if (assets.foregroundFerns) {
        context.drawImage(assets.foregroundFerns, x, FLOOR_Y - 110, 150, 123);
      }
    }
    const reedPositions = worldScreenLayout.screens.map(
      (screen) => screen.startX + (screen.endX - screen.startX) * 0.68,
    );
    for (const x of reedPositions) {
      if (assets.foregroundReeds) {
        context.drawImage(assets.foregroundReeds, x, FLOOR_Y - 90, 112, 114);
      }
    }
    if (assets.foregroundVines) {
      for (const screen of worldScreenLayout.screens) {
        const x = screen.startX + (screen.endX - screen.startX) * 0.82;
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
  const activeSector = getWorldScreenAtX(
    worldScreenLayout,
    state.player.x + state.player.width / 2,
  );
  drawWorldSectorOverlay(
    context,
    activeSector,
    worldScreenLayout.screens.findIndex(({ id }) => id === activeSector.id),
    worldScreenLayout.screens.length,
    palette.accent,
  );
}

// ---------------------------------------------------------------------------
// Simulation and combat
// ---------------------------------------------------------------------------

function activeSurface(state: GameState, worldX: number): TrackSurface {
  for (let index = state.world.surfaces.length - 1; index >= 0; index -= 1) {
    const surface = state.world.surfaces[index];
    if (worldX >= surface.x && worldX <= surface.x + surface.width) {
      return surface;
    }
  }
  return state.world.surfaces[0];
}

function emitNoise(
  state: GameState,
  kind: NoiseEvent["kind"],
  loudness: number,
  radius: number,
  position: Vec2,
  sourceId = "hunter",
): void {
  state.noiseEvents.push({
    id: `noise-${state.nextSignalId++}`,
    sourceId,
    kind,
    x: position.x,
    y: position.y,
    loudness: clamp(loudness, 0, 1),
    radius,
    createdAtSeconds: state.elapsed,
    durationSeconds: kind === "weapon" ? 1.4 : 0.8,
    highFrequency:
      kind === "weapon" ? 0.85 : kind === "landing" ? 0.3 : 0.5,
  });
}

function nearestActiveEnemy(
  state: GameState,
  point: Vec2,
  maximumRange: number,
): EnemyState | null {
  return (
    [
      ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
      ...(state.boss.active && state.boss.alive ? [state.boss] : []),
    ]
      .map((enemy) => ({
        enemy,
        range: distance(point, {
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
        }),
      }))
      .filter(({ range }) => range <= maximumRange)
      .sort((left, right) => left.range - right.range)[0]?.enemy ?? null
  );
}

function trapPositionForEffect(
  state: GameState,
  event: GearEffectEvent,
): Vec2 {
  const trapKind =
    event.gearId === "audio-decoy"
      ? "audio-decoy"
      : event.gearId === "netgun"
        ? "netgun"
        : "snare";
  const socket = state.world.trapSockets
    .filter((candidate) => candidate.allowed.includes(trapKind))
    .map((candidate) => ({
      candidate,
      range: distance(candidate, event.target),
    }))
    .filter(({ range }) => range <= 190)
    .sort((left, right) => left.range - right.range)[0]?.candidate;
  if (socket) return { x: socket.x, y: socket.y };
  return {
    x: clamp(event.target.x, 24, state.world.width - 24),
    y:
      event.gearId === "netgun"
        ? clamp(event.target.y, 80, state.world.floorY - 40)
        : state.world.floorY - 8,
  };
}

function revealWithinEffect(
  state: GameState,
  event: GearEffectEvent,
): number {
  let revealed = 0;
  for (const enemy of [
    ...state.enemies,
    ...(state.boss.active ? [state.boss] : []),
  ]) {
    const enemyCenter = {
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
    };
    if (
      enemy.alive &&
      enemy.active &&
      distance(event.origin, enemyCenter) <= event.radiusPx &&
      !enemy.scanned
    ) {
      enemy.scanned = true;
      state.scans += 1;
      revealed += 1;
    }
  }
  for (const node of state.scanNodes) {
    if (
      !node.scanned &&
      distance(event.origin, node) <= event.radiusPx
    ) {
      node.scanned = true;
      state.scans += 1;
      revealed += 1;
    }
  }
  return revealed;
}

function updateRevealEffects(state: GameState): void {
  let revealed = 0;
  for (const effect of state.arsenal.activeEffects) {
    if (effect.kind === "reveal") {
      revealed += revealWithinEffect(state, effect);
    }
  }
  if (revealed <= 0) return;
  queueSound(state, "scan");
  announce(
    state,
    `Capteur actif : ${revealed} nouvelle${
      revealed === 1 ? "" : "s"
    } signature${revealed === 1 ? "" : "s"}.`,
    1.6,
  );
}

function activateGearSlot(
  state: GameState,
  slotIndex: 0 | 1,
): void {
  const player = state.player;
  const origin = {
    x: player.x + player.width / 2,
    y: player.y + player.height * 0.48,
  };
  const requestedTarget = player.aiming
    ? player.aimPoint
    : {
        x: origin.x + player.facing * 360,
        y: state.world.floorY - 18,
      };
  const slot = state.arsenal.slots[slotIndex];
  const targetEnemy = nearestActiveEnemy(
    state,
    requestedTarget,
    Math.max(180, GEAR_BY_ID[slot.gearId].rangePx),
  );
  const result = activateArsenalGearSlot(state.arsenal, slotIndex, {
    origin,
    aim: targetEnemy
      ? {
          x: targetEnemy.x + targetEnemy.width / 2,
          y: targetEnemy.y + targetEnemy.height / 2,
        }
      : requestedTarget,
    targetId: targetEnemy?.id ?? null,
  });
  state.arsenal = result.state;
  if (!result.ok) {
    announce(
      state,
      result.failure === "depleted"
        ? `${GEAR_BY_ID[slot.gearId].name} : charges épuisées.`
        : `${GEAR_BY_ID[slot.gearId].name} : recharge en cours.`,
      1.6,
    );
    return;
  }

  const event = result.event;
  if (event.kind === "reveal") {
    const revealed = revealWithinEffect(state, event);
    queueSound(state, "scan");
    announce(
      state,
      `${GEAR_BY_ID[event.gearId].name} : ${revealed} signature${
        revealed === 1 ? "" : "s"
      } révélée${revealed === 1 ? "" : "s"}.`,
      2.2,
    );
    return;
  }

  const trapKind =
    event.gearId === "audio-decoy"
      ? "audio-decoy"
      : event.gearId === "netgun"
        ? "netgun"
        : "snare";
  const position = trapPositionForEffect(state, event);
  state.traps.push(
    createHuntTrap({
      id: event.id,
      ownerId: "hunter",
      kind: trapKind,
      position,
      facing: player.facing,
      concealment: trapKind === "snare" ? 0.82 : 0.4,
      durationSeconds: event.durationSeconds,
    }),
  );
  queueSound(
    state,
    trapKind === "netgun"
      ? "netgun"
      : trapKind === "snare"
        ? "snare"
        : "enemy-alert",
  );
  announce(
    state,
    `${GEAR_BY_ID[event.gearId].name} déployé · ${slot.charges - 1 < 0 ? 0 : result.state.slots[slotIndex].charges} charge(s).`,
    2,
  );
}

function updateHuntTraps(state: GameState, delta: number): void {
  if (state.traps.length === 0) return;
  const targets = [
    ...state.enemies.filter((enemy) => enemy.active),
    ...(state.boss.active ? [state.boss] : []),
  ];
  const next: HuntTrap[] = [];
  for (const trap of state.traps) {
    const stepped = stepHuntTrap(
      trap,
      targets.map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        alive: enemy.alive,
        speed: Math.abs(enemy.velocityX),
        trapResistance: enemy.boss
          ? 0.82
          : enemy.kind === "beast"
            ? 0.48
            : enemy.kind === "yautja"
              ? 0.62
              : 0.22,
      })),
      delta,
      state.elapsed,
    );
    if (stepped.noise) state.noiseEvents.push(stepped.noise);
    if (stepped.restrainedTargetId) {
      const enemy = targets.find(
        (candidate) => candidate.id === stepped.restrainedTargetId,
      );
      if (enemy) {
        enemy.restrainedUntil = Math.max(
          enemy.restrainedUntil,
          state.elapsed + stepped.restraintSeconds,
        );
        enemy.velocityX = 0;
        announce(
          state,
          `${enemy.boss ? "Cible Apex" : "Proie"} entravée pendant ${stepped.restraintSeconds.toFixed(1)} s.`,
          2,
        );
      }
      state.arsenal = removeGearEffect(state.arsenal, trap.id);
    }
    if (stepped.trap.armed && stepped.trap.remainingSeconds > 0) {
      next.push(stepped.trap);
    } else {
      state.arsenal = removeGearEffect(state.arsenal, trap.id);
    }
  }
  state.traps = next;
}

function updateHuntSignals(
  state: GameState,
  mission: MissionDefinition,
  delta: number,
): void {
  const player = state.player;
  const centerX = player.x + player.width / 2;
  const footY = player.y + player.height;
  const surface = activeSurface(state, centerX);
  const heatIntensity = mission.biome === "volcano" ? 0.9 : 0;
  state.mud = stepMudState(state.mud, {
    deltaSeconds: delta,
    mudDepth: surface.mudDepth,
    inWater: surface.material === "water",
    heatIntensity,
    speedRatio: clamp(Math.abs(player.velocityX) / 300, 0, 1),
  });

  state.scentNodes = [
    ...advanceScentField(
      state.scentNodes,
      delta,
      (x) => sampleWind(state.world.wind, state.elapsed, x),
      surface.scentRetention,
    ),
  ].slice(-80);
  state.tracks = [
    ...(ageTracks(
      state.tracks,
      state.elapsed,
    ) as readonly ObservedTrackMark[]),
  ].slice(-240);
  state.noiseEvents = state.noiseEvents
    .filter(
      (noise) =>
        state.elapsed - noise.createdAtSeconds <= noise.durationSeconds,
    )
    .slice(-48);

  if (
    player.grounded &&
    Math.abs(player.velocityX) > 28 &&
    (Math.abs(centerX - state.lastTrackX) >= 30 ||
      state.elapsed - state.lastTrackAt >= 0.38)
  ) {
    if (surface.footprintPersistenceSeconds > 0) {
      const strideIndex = state.nextSignalId;
      const mark = createTrackMark({
        id: `track-${state.nextSignalId++}`,
        sourceId: "hunter",
        position: { x: centerX, y: footY },
        facing: player.facing,
        velocityX: player.velocityX,
        elapsedSeconds: state.elapsed,
        surface,
        mud: state.mud,
      });
      state.tracks.push({
        ...mark,
        ownerId: "hunter",
        ownerLabel: "Chasseur",
        ownerSpecies: "hunter",
        strideIndex,
      });
    }
    emitNoise(
      state,
      "footstep",
      clamp(
        surface.baseNoise + Math.abs(player.velocityX) / 780,
        0.08,
        1,
      ),
      170 + surface.baseNoise * 360,
      { x: centerX, y: footY },
    );
    queueSound(state, "footstep");
    state.lastTrackX = centerX;
    state.lastTrackAt = state.elapsed;
  }

  if (state.elapsed >= state.nextScentAt) {
    state.scentNodes.push(
      createScentNode({
        id: `scent-${state.nextSignalId++}`,
        sourceId: "hunter",
        position: {
          x: centerX,
          y: player.y + player.height * 0.55,
        },
        strength:
          (player.cloaked ? 0.38 : 0.62) * state.mud.scentMultiplier,
        radius: 85,
        lifetimeSeconds: 9 + surface.scentRetention * 9,
      }),
    );
    state.nextScentAt = state.elapsed + 0.42;
  }

  let activeHazardDamage = 0;
  for (const hazard of state.world.hazards) {
    if (
      !isHazardActive(hazard, state.elapsed) ||
      !overlaps(player, hazard)
    ) {
      continue;
    }
    activeHazardDamage += hazard.damagePerSecond;
    if (hazard.revealsCloak && player.cloaked) {
      forceDecloak(state);
      announce(state, "Le danger environnemental révèle le camouflage.", 1.8);
    }
    if (
      hazard.noisePerSecond > 0 &&
      Math.floor(state.elapsed) !== Math.floor(state.elapsed - delta)
    ) {
      emitNoise(
        state,
        "hazard",
        hazard.noisePerSecond,
        260 + hazard.noisePerSecond * 320,
        { x: centerX, y: footY },
      );
    }
  }
  const extractionProtected = trophyExtractionProtected(state);
  state.environmentDamage = extractionProtected
    ? 0
    : state.environmentDamage + activeHazardDamage * delta;
  if (
    !extractionProtected &&
    state.environmentDamage >= 1 &&
    player.invulnerability <= 0
  ) {
    const damage = state.environmentDamage;
    state.environmentDamage = 0;
    hurtPlayer(state, damage, mission);
  } else if (activeHazardDamage <= 0) {
    state.environmentDamage = Math.max(0, state.environmentDamage - delta * 3);
  }
}

/** Emit a persistent, identified footprint for every moving prey. */
function emitEnemyFootprint(state: GameState, enemy: EnemyState): void {
  if (!enemy.alive || !enemy.active || Math.abs(enemy.velocityX) < 20) return;
  const centerX = enemy.x + enemy.width / 2;
  const spacing = enemy.kind === "beast" ? 42 : 34;
  const interval = enemy.kind === "beast" ? 0.32 : 0.42;
  if (
    Math.abs(centerX - enemy.lastTrackX) < spacing &&
    state.elapsed - enemy.lastTrackAt < interval
  ) {
    return;
  }
  const surface = activeSurface(state, centerX);
  if (surface.footprintPersistenceSeconds <= 0) return;
  const strideIndex = state.nextSignalId;
  const mark = createTrackMark({
    id: `track-${enemy.id}-${state.nextSignalId++}`,
    sourceId: enemy.id,
    position: { x: centerX, y: enemy.y + enemy.height },
    facing: enemy.facing,
    velocityX: enemy.velocityX,
    elapsedSeconds: state.elapsed,
    surface,
    mud: {
      coating: clamp(
        surface.mudDepth * (enemy.kind === "beast" ? 0.72 : 0.5),
        0,
        1,
      ),
      wetness: surface.material === "water" ? 0.8 : surface.mudDepth,
      thermalVisibility: 1,
      cloakShimmer: 0,
      footprintMultiplier:
        enemy.kind === "beast" ? 0.92 : enemy.kind === "yautja" ? 0.72 : 0.58,
      scentMultiplier: 1,
    },
  });
  state.tracks.push({
    ...mark,
    lifetimeSeconds:
      mark.lifetimeSeconds *
      (enemy.kind === "beast" ? 1.24 : enemy.kind === "yautja" ? 1.12 : 1),
    intensity: clamp(
      mark.intensity *
        (enemy.kind === "beast" ? 1.25 : enemy.kind === "yautja" ? 1.1 : 0.95),
      0,
      1,
    ),
    ownerId: enemy.id,
    ownerLabel:
      ecologyV8EnemyForId(enemy.archetype)?.name ??
      enemyV7ForId(enemy.archetype)?.name ??
      enemy.archetype,
    ownerSpecies: enemy.kind,
    strideIndex,
  });
  if (state.tracks.length > 240) state.tracks.splice(0, state.tracks.length - 240);
  enemy.lastTrackX = centerX;
  enemy.lastTrackAt = state.elapsed;
}

function trophyExtractionProtected(state: GameState): boolean {
  return isTrophyExtractionProtected({
    phase: state.phase,
    trophySecured: state.trophyClaim !== null,
    victoryPoseActive: Boolean(
      state.trophyVictory && !state.trophyVictory.complete,
    ),
    dropShipPhase: state.dropShip?.phase ?? null,
  });
}

function hurtPlayer(
  state: GameState,
  amount: number,
  mission: MissionDefinition,
): void {
  const player = state.player;
  if (
    player.invulnerability > 0 ||
    state.phase === "dead" ||
    trophyExtractionProtected(state)
  ) {
    return;
  }
  player.health -= amount;
  player.invulnerability = 0.55;
  forceDecloak(state);
  state.damageTaken += amount;
  if (state.trophyExtracting) {
    state.trophyExtracting = false;
    state.trophyExtraction = 0;
    state.trophyRitual = null;
    state.regularTrophyDropId = null;
  }
  if (state.screenShakeEnabled) {
    state.screenShake = Math.min(18, 6 + amount * 0.24);
  }
  announce(state, `Impact subi : -${Math.round(amount)} intégrité`, 1.4);
  queueSound(state, "hit");

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
  forceDecloak(state);
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
  const ecologyDefinition = ecologyV8EnemyForId(enemy.archetype);
  const color =
    ecologyDefinition?.id.includes("xeno")
      ? "#d7ff4a"
      : ecologyDefinition?.id.includes("synth")
        ? "#edf2de"
        : ecologyDefinition?.category === "flora"
          ? "#7bc94e"
          : enemy.kind === "yautja"
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
  const appliedAmount =
    amount * (enemy.boss ? state.bossVulnerabilityMultiplier : 1);
  enemy.health -= appliedAmount;
  enemy.hitFlash = 0.12;
  spawnGore(state, enemy, "hit");

  if (enemy.boss && !enemy.scanned && !state.rangedBossViolation) {
    state.rangedBossViolation = true;
    const studyRule = mission.honorRules.find(
      (rule) => rule.condition === "target-scanned-before-strike",
    );
    if (studyRule) {
      addHonor(
        state,
        honorRuleEventId(studyRule),
        `Code rompu : ${studyRule.label}`,
        -studyRule.violationPenalty,
        "violation",
      );
    }
  }
  if (enemy.health > 0) return;

  enemy.health = 0;
  enemy.alive = false;
  enemy.deathAnimation =
    ecologyV8EnemyForId(enemy.archetype) || enemyV7ForId(enemy.archetype)
      ? 0.85
      : 0;
  spawnGore(state, enemy, "kill");
  state.kills += 1;
  if (enemy.boss) {
    state.energyWeaponsLocked = false;
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
    const trophy = enemyTrophyGameplayForEnemyId(enemy.archetype);
    const enemyDefinition =
      ecologyV8EnemyForId(enemy.archetype) ??
      enemyV7ForId(enemy.archetype);
    if (state.phase !== "extraction" && trophy && enemyDefinition) {
      const condition: TrophyClaim["condition"] = !enemy.scanned
        ? "damaged"
        : source === "melee"
          ? "pristine"
          : "intact";
      const threat = enemyDefinition.threat;
      const quality: TrophyQuality =
        condition === "damaged"
          ? "worthy"
          : condition === "pristine"
            ? threat >= 4
              ? "flawless"
              : threat >= 3
                ? "elite"
                : threat >= 2
                  ? "blooded"
                  : "worthy"
            : threat >= 4
              ? "elite"
              : threat >= 3
                ? "blooded"
                : "worthy";
      state.regularTrophyDrops.push({
        id: `regular-trophy-${enemy.id}`,
        enemyRuntimeId: enemy.id,
        sourceEnemyId: enemy.archetype,
        name: trophy.name,
        x: enemy.x + enemy.width / 2,
        // Flying and burrowing enemies must leave a reachable physical claim.
        y: state.world.floorY - 24,
        claim: {
          id: uniqueTrophyClaimId(state, mission, enemy.id),
          definitionId: trophy.id,
          sourceEnemyId: enemy.archetype,
          targetName: enemyDefinition.name,
          targetKind: enemy.kind,
          partId: trophy.partId,
          quality,
          condition,
        },
        collected: false,
      });
    }
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
  inventory: PlayerInventory,
): void {
  const player = state.player;
  const activeWeaponId = equippedWeapon(
    loadout,
    player.activeWeaponSlot,
  ).id;
  const meleeWeaponId: WeaponId =
    activeWeaponId === "combistick" &&
    player.weaponAmmo[player.activeWeaponSlot] > 0
      ? "combistick"
      : "wristblades";
  const meleeStats = effectiveWeaponStats(
    meleeWeaponId,
    inventory.weaponUpgrades[meleeWeaponId],
  );
  const meleeAttack = resolveHunterWeaponAttack(
    meleeWeaponId,
    meleeStats,
  );
  if (
    player.stamina < meleeAttack.staminaCost ||
    state.phase === "dead" ||
    state.phase === "finished"
  ) {
    return;
  }
  const armor = effectiveArmorStats(
    loadout.armorId,
    inventory.armorUpgrades[loadout.armorId],
  );
  const request = requestHuntMeleeAttack(
    normalizeHuntMeleeState(player.melee),
    {
      weaponId: meleeWeaponId,
      damage: meleeAttack.damage * armor.meleeDamageMultiplier,
      cooldownSeconds: meleeAttack.cooldownSeconds,
      reachPx: meleeAttack.meleeReachPx,
      maxTargetHits: meleeAttack.maxTargetHits,
      noiseLoudness: meleeAttack.noiseLoudness,
      noiseRadius: meleeAttack.noiseRadius,
    },
    player.facing,
  );
  if (!request.accepted) return;

  forceDecloak(state);
  player.stamina = Math.max(0, player.stamina - meleeAttack.staminaCost);
  player.melee = request.state;
  player.meleeCooldown = request.state.phaseRemainingSeconds;
}

function nearestHuntMeleeTarget(
  state: GameState,
  maximumGapPx: number,
): EnemyState | null {
  const player = state.player;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const candidates = [
    ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ]
    .map((enemy) => {
      const enemyCenterX = enemy.x + enemy.width / 2;
      const enemyCenterY = enemy.y + enemy.height / 2;
      const forwardDistance = (enemyCenterX - playerCenterX) * player.facing;
      const horizontalGap = Math.max(
        0,
        Math.abs(enemyCenterX - playerCenterX) -
          (player.width + enemy.width) / 2,
      );
      return {
        enemy,
        forwardDistance,
        horizontalGap,
        verticalDistance: Math.abs(enemyCenterY - playerCenterY),
      };
    })
    .filter(
      ({ enemy, forwardDistance, horizontalGap, verticalDistance }) =>
        forwardDistance >= -Math.min(18, enemy.width * 0.18) &&
        horizontalGap <= maximumGapPx &&
        verticalDistance <= (player.height + enemy.height) * 0.62,
    )
    .sort((left, right) => {
      if (left.horizontalGap !== right.horizontalGap) {
        return left.horizontalGap - right.horizontalGap;
      }
      return left.enemy.id < right.enemy.id
        ? -1
        : left.enemy.id > right.enemy.id
          ? 1
          : 0;
    });
  return candidates[0]?.enemy ?? null;
}

function playerMeleeTechnique(
  state: GameState,
  loadout: Loadout,
  inventory: PlayerInventory,
  actionKind: Exclude<HuntMeleeActionKind, "light">,
  target: EnemyState | null,
): void {
  const player = state.player;
  const activeWeaponId = equippedWeapon(
    loadout,
    player.activeWeaponSlot,
  ).id;
  const meleeWeaponId: WeaponId =
    activeWeaponId === "combistick" &&
    player.weaponAmmo[player.activeWeaponSlot] > 0
      ? "combistick"
      : "wristblades";
  const meleeStats = effectiveWeaponStats(
    meleeWeaponId,
    inventory.weaponUpgrades[meleeWeaponId],
  );
  const meleeAttack = resolveHunterWeaponAttack(
    meleeWeaponId,
    meleeStats,
  );
  const armor = effectiveArmorStats(
    loadout.armorId,
    inventory.armorUpgrades[loadout.armorId],
  );
  const staminaCost =
    meleeAttack.staminaCost * huntMeleeStaminaMultiplier(actionKind);
  if (
    player.stamina < staminaCost ||
    state.phase === "dead" ||
    state.phase === "finished"
  ) {
    if (player.stamina < staminaCost) {
      announce(state, "Endurance insuffisante pour cette technique.", 1.4);
    }
    return;
  }

  const request = requestHuntMeleeTechniqueAttack(
    player.melee,
    {
      weaponId: meleeWeaponId,
      damage: meleeAttack.damage * armor.meleeDamageMultiplier,
      cooldownSeconds: meleeAttack.cooldownSeconds,
      reachPx: meleeAttack.meleeReachPx,
      maxTargetHits: meleeAttack.maxTargetHits,
      noiseLoudness: meleeAttack.noiseLoudness,
      noiseRadius: meleeAttack.noiseRadius,
    },
    player.facing,
    actionKind,
    {
      grounded: player.grounded,
      targetId: target?.id ?? null,
      targetHealthRatio: target ? target.health / target.maxHealth : null,
      targetIsBoss: target?.boss ?? false,
      targetInRange: target !== null,
      targetTelegraphing: Boolean(
        target && (target.telegraph > 0 || target.pendingAttackId),
      ),
    },
  );
  if (!request.accepted) return;

  forceDecloak(state);
  player.stamina = Math.max(0, player.stamina - staminaCost);
  player.melee = request.state;
  player.meleeCooldown = request.state.phaseRemainingSeconds;
  if (actionKind === "aerial" && player.climbing) {
    player.climbing = false;
    player.climbZoneId = null;
    player.velocityY = Math.max(player.velocityY, 90);
  }
  const labels: Readonly<Record<Exclude<HuntMeleeActionKind, "light">, string>> = {
    heavy: "Attaque lourde armée.",
    aerial: "Frappe aérienne engagée.",
    "guard-break": "Garde adverse brisée.",
    throw: "Projection verrouillée.",
    execution: "Exécution rituelle engagée.",
  };
  announce(state, labels[actionKind], 1.1);
}

function playerMeleeParry(state: GameState): void {
  const staminaCost = 8;
  if (state.player.stamina < staminaCost) {
    announce(state, "Endurance insuffisante pour parer.", 1.2);
    return;
  }
  const request = requestHuntMeleeParry(state.player.melee);
  if (!request.accepted) return;
  forceDecloak(state);
  state.player.stamina -= staminaCost;
  state.player.weaponChargeSeconds = 0;
  state.player.melee = request.state;
  announce(state, "Parade armée : réponds pendant l'impact.", 1.1);
}

function playerMeleeDodge(
  state: GameState,
  direction: -1 | 1,
): void {
  const staminaCost = 10;
  if (state.player.stamina < staminaCost) {
    announce(state, "Endurance insuffisante pour esquiver.", 1.2);
    return;
  }
  const request = requestHuntMeleeDodge(state.player.melee, direction);
  if (!request.accepted) return;
  forceDecloak(state);
  state.player.stamina -= staminaCost;
  state.player.melee = request.state;
  state.player.invulnerability = Math.max(
    state.player.invulnerability,
    HUNT_MELEE_DODGE_INVULNERABILITY_SECONDS,
  );
  state.player.velocityX = huntMeleeDodgeVelocity(request.state);
  state.jumpAssist = freshJumpAssistState({ requireRelease: true });
  announce(state, "Esquive de chasse.", 0.8);
}

function resolvePlayerMeleeParry(
  state: GameState,
  attacker: EnemyState,
): boolean {
  if (!canHuntMeleeParry(state.player.melee)) return false;
  state.player.melee = consumeHuntMeleeParry(state.player.melee);
  const playerCenterX = state.player.x + state.player.width / 2;
  const attackerCenterX = attacker.x + attacker.width / 2;
  const pushDirection: -1 | 1 = attackerCenterX >= playerCenterX ? 1 : -1;
  const reactionScale = attacker.boss ? 0.55 : 1;
  attacker.hitStunSeconds = Math.max(
    attacker.hitStunSeconds,
    0.52 * reactionScale,
  );
  attacker.knockbackVelocityX = pushDirection * 340 * reactionScale;
  attacker.velocityX = attacker.knockbackVelocityX;
  attacker.hitFlash = Math.max(attacker.hitFlash, 0.18);
  attacker.telegraph = 0;
  attacker.pendingAttackId = null;
  attacker.attackCooldown = Math.max(attacker.attackCooldown, 0.65);
  queueSound(state, "slash");
  if (state.screenShakeEnabled) state.screenShake = Math.max(state.screenShake, 5);
  announce(state, attacker.boss ? "Parade Apex réussie." : "Parade parfaite.", 1.2);
  return true;
}

function updatePlayerMeleeCombat(
  state: GameState,
  mission: MissionDefinition,
  delta: number,
  cancelled: boolean,
): void {
  const player = state.player;
  if (cancelled) {
    player.melee = cancelHuntMeleeAttack(player.melee);
    player.meleeCooldown = 0;
    player.attackFlash = 0;
    return;
  }

  const meleeStep = stepHuntMeleeCombat(player.melee, delta);
  player.melee = meleeStep.state;
  if (isHuntMeleeDodgeInvulnerable(player.melee)) {
    player.invulnerability = Math.max(
      player.invulnerability,
      delta + Number.EPSILON * 8,
    );
  }
  player.meleeCooldown =
    player.melee.phase === "idle" ? 0 : player.melee.phaseRemainingSeconds;
  player.attackFlash =
    player.melee.phase === "active"
      ? Math.max(player.attackFlash, 0.045)
      : Math.max(0, player.attackFlash - delta);

  for (const comboIndex of meleeStep.startedComboIndexes) {
    announce(
      state,
      `Enchainement de lames ${comboIndex + 1}/3.`,
      0.7,
    );
  }

  if (player.melee.phase !== "active") return;

  const attack = currentHuntMeleeAttack(player.melee);
  const hitbox = resolveHuntMeleeHitbox(player.melee, player);
  if (!attack || !hitbox || !player.melee.profile) return;

  if (
    meleeStep.enteredActiveActionIds.includes(player.melee.actionSequence)
  ) {
    queueSound(state, "slash");
    emitNoise(
      state,
      "melee",
      player.melee.profile.noiseLoudness,
      player.melee.profile.noiseRadius,
      {
        x: hitbox.x + hitbox.width / 2,
        y: hitbox.y + hitbox.height / 2,
      },
    );
  }

  const playerCenterX = player.x + player.width / 2;
  const targets = [
    ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
    ...(state.boss.active && state.boss.alive ? [state.boss] : []),
  ]
    .filter(
      (enemy) =>
        canHuntMeleeHitTarget(player.melee, enemy.id) &&
        huntMeleeHitboxOverlaps(hitbox, enemy),
    )
    .sort((left, right) => {
      const leftDistance = Math.abs(left.x + left.width / 2 - playerCenterX);
      const rightDistance = Math.abs(right.x + right.width / 2 - playerCenterX);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });

  let connected = false;
  for (const enemy of targets) {
    if (!canHuntMeleeHitTarget(player.melee, enemy.id)) break;
    connected = true;
    const resolvedDamage = attack.isExecution
      ? Math.max(attack.damage, enemy.health)
      : attack.damage;
    damageEnemy(state, mission, enemy, resolvedDamage, "melee");
    player.melee = registerHuntMeleeTargetHit(player.melee, enemy.id);
    if (!enemy.alive) continue;

    const reactionScale = enemy.boss ? 0.48 : 1;
    enemy.hitStunSeconds = Math.max(
      enemy.hitStunSeconds,
      attack.hitStunSeconds * reactionScale,
    );
    enemy.knockbackVelocityX =
      player.melee.facing * attack.knockbackSpeed * reactionScale;
    if (Math.abs(enemy.knockbackVelocityY) <= 0.01) {
      enemy.knockbackRestY = enemy.y;
    }
    enemy.knockbackVelocityY =
      attack.verticalKnockbackSpeed * reactionScale;
    enemy.velocityX = enemy.knockbackVelocityX;
    enemy.hitFlash = Math.max(enemy.hitFlash, enemy.hitStunSeconds);
    enemy.telegraph = 0;
    enemy.pendingAttackId = null;
  }
  if (connected && attack.kind === "aerial") {
    player.velocityY = Math.min(player.velocityY, -285);
    player.aerialBoostUsed = false;
  }
  if (connected && attack.isExecution) {
    announce(state, "Exécution accomplie : prise honorable confirmée.", 1.8);
  }
  if (connected && state.screenShakeEnabled) {
    const impactShake =
      attack.isExecution || attack.isThrow
        ? 12
        : attack.kind === "heavy" || attack.breaksGuard
          ? 9
          : player.melee.comboIndex === 2
            ? 8
            : 5;
    state.screenShake = Math.max(state.screenShake, impactShake);
  }
}

function stepEnemyMeleeHitReaction(
  enemy: EnemyState,
  delta: number,
  minimumX: number,
  maximumX: number,
): boolean {
  const hitStunSeconds = Number.isFinite(enemy.hitStunSeconds)
    ? Math.max(0, enemy.hitStunSeconds)
    : 0;
  const knockbackVelocityX = Number.isFinite(enemy.knockbackVelocityX)
    ? enemy.knockbackVelocityX
    : 0;
  const knockbackVelocityY = Number.isFinite(enemy.knockbackVelocityY)
    ? enemy.knockbackVelocityY
    : 0;
  const knockbackRestY = Number.isFinite(enemy.knockbackRestY)
    ? enemy.knockbackRestY
    : enemy.y;
  const airborne = enemy.y < knockbackRestY - 0.01;
  if (
    hitStunSeconds <= 0 &&
    Math.abs(knockbackVelocityX) <= 0.01 &&
    Math.abs(knockbackVelocityY) <= 0.01 &&
    !airborne
  ) {
    enemy.hitStunSeconds = 0;
    enemy.knockbackVelocityX = 0;
    enemy.knockbackVelocityY = 0;
    enemy.y = knockbackRestY;
    return false;
  }

  const reactionDelta = Math.max(0, delta);
  enemy.x = clamp(
    enemy.x + knockbackVelocityX * reactionDelta,
    minimumX,
    maximumX,
  );
  enemy.knockbackVelocityX =
    knockbackVelocityX * Math.exp(-8.5 * reactionDelta);
  const verticalReaction = stepHuntMeleeVerticalReaction(
    {
      y: enemy.y,
      velocityY: knockbackVelocityY,
      restY: knockbackRestY,
    },
    reactionDelta,
  );
  enemy.y = verticalReaction.state.y;
  enemy.knockbackVelocityY = verticalReaction.state.velocityY;
  enemy.knockbackRestY = verticalReaction.state.restY;
  enemy.velocityX = enemy.knockbackVelocityX;
  enemy.hitStunSeconds = Math.max(0, hitStunSeconds - delta);
  enemy.telegraph = 0;
  enemy.pendingAttackId = null;
  enemy.attackCooldown = Math.max(
    Number.isFinite(enemy.attackCooldown) ? enemy.attackCooldown : 0,
    0.22,
  );
  return true;
}

function playerWeapon(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  inventory: PlayerInventory,
): void {
  const player = state.player;
  const slotIndex = player.activeWeaponSlot;
  const weaponDefinition = equippedWeapon(loadout, slotIndex);
  const weapon = effectiveWeaponStats(
    weaponDefinition.id,
    inventory.weaponUpgrades[weaponDefinition.id],
  );
  if (
    player.weaponCooldown > 0 ||
    state.phase === "dead" ||
    state.phase === "finished"
  ) {
    return;
  }
  if (weaponDefinition.attackType === "melee") {
    playerMelee(state, mission, loadout, inventory);
    return;
  }
  const attack = resolveHunterWeaponAttack(
    weapon.id,
    weapon,
    player.weaponChargeSeconds,
  );
  if (state.energyWeaponsLocked && attack.energyCost > 0) {
    announce(
      state,
      mission.id === "ruins-ancient-guardian"
        ? "Champ du Gardien : plasma brouillé. Utilise une arme cinétique, un couvert ou la distance."
        : "Impulsion du sanctuaire : arme énergétique verrouillée.",
      1.8,
    );
    return;
  }
  if (attack.energyCost > 0 && player.energy < attack.energyCost) {
    announce(state, "Énergie insuffisante.", 1.5);
    return;
  }
  if (attack.staminaCost > 0 && player.stamina < attack.staminaCost) {
    announce(state, "Endurance insuffisante.", 1.5);
    return;
  }
  if (attack.ammoCost > 0 && player.weaponAmmo[slotIndex] <= 0) {
    announce(state, "Munitions épuisées.", 1.5);
    return;
  }

  forceDecloak(state);
  player.weaponCooldown = attack.cooldownSeconds;
  player.weaponChargeSeconds = 0;
  player.energy = Math.max(0, player.energy - attack.energyCost);
  player.stamina = Math.max(0, player.stamina - attack.staminaCost);
  if (attack.ammoCost > 0) player.weaponAmmo[slotIndex] -= 1;
  const speed = Math.max(420, attack.projectileSpeedPx);
  const angle = player.aimAngle;
  const rigFrame = solvePlayerRigFrame(
    state,
    player,
    weapon.id === "yautja-bow" ? player.aimAngle : undefined,
  );
  const projectileOrigin =
    weapon.id === "plasma-caster"
      ? rigFrame.anchors.muzzle
      : rigFrame.anchors.handGrip;
  state.projectiles.push({
    id: state.nextProjectileId++,
    x: projectileOrigin.x,
    y: projectileOrigin.y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed + (weapon.id === "yautja-bow" ? -15 : 0),
    radius: attack.projectileRadius,
    damage: attack.damage,
    hostile: false,
    color: weaponDefinition.color,
    life:
      attack.recovery === "return"
        ? Math.max(4, (attack.rangePx / Math.max(1, speed)) * 3)
        : Math.max(0.8, attack.rangePx / Math.max(1, speed)),
    source: "weapon",
    weaponId: weapon.id,
    coverGraceSeconds: 0.14,
    weaponSlotIndex: slotIndex,
    maximumAmmo: weapon.ammo ?? undefined,
    recovery: attack.recovery,
    spentPickup: false,
    hitEnemyIds: [],
    maxTargetHits: attack.maxTargetHits,
    splashRadius: attack.splashRadius,
    returning: false,
    outboundSeconds:
      attack.recovery === "return"
        ? Math.max(0.5, (attack.rangePx / Math.max(1, speed)) * 0.72)
        : undefined,
    flightSpeed: speed,
  });
  queueSound(
    state,
    weapon.id === "plasma-caster" ? "plasma" : "weapon-switch",
  );
  state.playerUsedRangedWeapon = true;
  state.playerUsedEnergyWeapon = attack.energyCost > 0;
  emitNoise(
    state,
    "weapon",
    attack.noiseLoudness,
    attack.noiseRadius,
    projectileOrigin,
  );
  if (attack.chargeRatio >= 0.95) {
    announce(
      state,
      weapon.id === "plasma-caster"
        ? "Plasmacaster : charge maximale."
        : "Arc Yautja : tension maximale.",
      1.2,
    );
    if (state.screenShakeEnabled && weapon.id === "plasma-caster") {
      state.screenShake = Math.max(state.screenShake, 6);
    }
  }
}

function playerScan(state: GameState, mission: MissionDefinition): void {
  const player = state.player;
  if (player.scanCooldown > 0 || player.energy < 8) return;
  player.scanCooldown = 0.7;
  player.energy -= 8;
  state.scanPulse = 0.55;
  queueSound(state, "scan");
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
      enemy.active &&
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
        const studyRule = mission.honorRules.find(
          (rule) => rule.condition === "target-scanned-before-strike",
        );
        addHonor(
          state,
          studyRule ? honorRuleEventId(studyRule) : "scan-primary-target",
          studyRule?.label ?? `Analyse de ${mission.targetName}`,
          studyRule?.bonus ?? 5,
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
  forceDecloak(state);
  queueSound(state, "medicomp");
  announce(state, "Medicomp appliqué. Position révélée.", 2.5);
}

function uniqueTrophyClaimId(
  state: GameState,
  mission: MissionDefinition,
  sourceId = "apex",
): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${mission.id}-${sourceId}-${uuid}`;
  const sequence = state.nextSignalId++;
  return `${mission.id}-${sourceId}-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`.slice(0, 128);
}

function finishTrophyExtraction(
  state: GameState,
  mission: MissionDefinition,
): void {
  if (state.regularTrophyDropId) {
    const drop = state.regularTrophyDrops.find(
      (entry) => entry.id === state.regularTrophyDropId,
    );
    state.trophyExtracting = false;
    state.trophyExtraction = 0;
    state.trophyRitual = null;
    state.regularTrophyDropId = null;
    if (!drop || drop.collected) {
      announce(state, "Cette prise n’est plus disponible.", 1.6);
      return;
    }
    drop.collected = true;
    const sourceEnemy = state.enemies.find(
      (enemy) => enemy.id === drop.enemyRuntimeId,
    );
    if (
      sourceEnemy &&
      drop.claim.partId !== "mask" &&
      drop.claim.partId !== "insignia"
    ) spawnGore(state, sourceEnemy, "trophy");
    queueSound(state, "trophy");
    addHonor(
      state,
      `secondary-trophy-${drop.id}`,
      `Prise secondaire : ${drop.name}`,
      2,
      "objective",
    );
    announce(
      state,
      `${drop.name} prélevé et scellé. La chasse continue.`,
      3.2,
    );
    return;
  }

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
  state.trophyRitual = null;
  state.trophyVictory = createTrophyVictory();
  state.dropShip = createDropShipArrival();
  state.trophyClaim = {
    id: uniqueTrophyClaimId(state, mission),
    definitionId: mission.trophy.id,
    targetName: mission.targetName,
    targetKind: mission.targetKind,
    partId: mission.trophy.partId,
    quality,
    condition,
  };
  state.phase = "extraction";
  spawnExtractionThreat(state, mission);
  if (mission.trophy.partId !== "mask" && mission.trophy.partId !== "insignia") {
    spawnGore(state, state.boss, "trophy");
  }
  queueSound(state, "trophy");
  addHonor(
    state,
    "trophy-claimed",
    mission.trophy.name,
    12,
    "objective",
  );
  announce(
    state,
    `${mission.trophy.name} : prise récupérée et scellée. Le chasseur célèbre sa victoire ; vaisseau en approche.`,
    5,
  );
}

function interact(
  state: GameState,
  mission: MissionDefinition,
): void {
  if (isExplorationMission(mission.id) && !state.trophyExtracting) {
    const interaction = interactWithExplorationRegion(mission.id, state.exploration, state.player);
    if (interaction) {
      if (interaction.changed) {
        const previousBonus = explorationBonuses(state.exploration).maxEnergy;
        state.exploration = interaction.progress;
        const bonusGained = explorationBonuses(state.exploration).maxEnergy - previousBonus;
        state.player.maxEnergy += bonusGained;
        state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + bonusGained);
        state.world = applyExplorationWorld(state.world, state.exploration);
        queueSound(state, "objective");
      }
      announce(state, interaction.message, 4);
      return;
    }
  }
  const playerCenter = {
    x: state.player.x + state.player.width / 2,
    y: state.player.y + state.player.height / 2,
  };
  if (
    state.bossMechanics.missionId === "volcano-bad-blood" &&
    state.bossMechanics.purgeSeconds !== null &&
    !state.bossMechanics.purgeResolved
  ) {
    const purgeConsole = state.purgeConsoleNodes.find(
      (node) => !node.recovered && distance(playerCenter, node) <= 110,
    );
    if (purgeConsole) {
      purgeConsole.recovered = true;
      state.disabledConsoleId = purgeConsole.id;
      emitNoise(state, "melee", 0.42, 270, purgeConsole);
      announce(
        state,
        `Console ${purgeConsole.id.slice(-1).toUpperCase()} neutralisée.`,
        2,
      );
      return;
    }
  }
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
    (state.phase === "tracking" || state.phase === "target") &&
    !state.trophyExtracting
  ) {
    const nearbyDrop = state.regularTrophyDrops
      .filter(
        (drop) =>
          !drop.collected && distance(playerCenter, drop) <= 110,
      )
      .reduce<RegularTrophyDrop | null>(
        (nearest, drop) =>
          !nearest ||
          distance(playerCenter, drop) < distance(playerCenter, nearest)
            ? drop
            : nearest,
        null,
      );
    if (nearbyDrop) {
      state.regularTrophyDropId = nearbyDrop.id;
      state.trophyExtracting = true;
      state.trophyExtraction = 0;
      // Secondary claims use a shorter three-gesture field rite and never
      // trigger the Apex victory pose, shuttle or mission phase transition.
      state.trophyRitual = createTrophyRitual(
        `${mission.id}:${nearbyDrop.sourceEnemyId}:${nearbyDrop.id}`,
        3,
      );
      forceDecloak(state);
      announce(
        state,
        `Prise secondaire : ${nearbyDrop.name}. Observe puis suis les trois glyphes.`,
        3,
      );
      return;
    }
  }
  if (
    state.phase === "trophy" &&
    distance(playerCenter, {
      x: state.boss.x + state.boss.width / 2,
      y: state.world.floorY - 52,
    }) <= 125
  ) {
    if (
      state.bossMechanics.missionId === "volcano-bad-blood" &&
      !state.bossMechanics.purgeResolved &&
      (state.bossMechanics.purgeSeconds !== null ||
        state.boss.health / state.boss.maxHealth <= 0.18)
    ) {
      announce(
        state,
        "Le trophée sera détruit : neutralise d’abord les trois consoles.",
        2.5,
      );
      return;
    }
    if (!state.trophyExtracting) {
      state.regularTrophyDropId = null;
      state.trophyExtracting = true;
      state.trophyExtraction = 0;
      state.trophyRitual = createTrophyRitual(
        `${mission.id}:${mission.trophy.id}`,
      );
      forceDecloak(state);
      announce(
        state,
        "Rite du trophée : suis la séquence GAUCHE, DROITE, LAMES et VALIDER au rythme du cercle.",
        3.2,
      );
    }
    return;
  }
  if (
    state.phase === "extraction" &&
    Math.abs(playerCenter.x - state.world.extraction.x) <= 115
  ) {
    if (state.trophyVictory && !state.trophyVictory.complete) {
      announce(state, "Achève le rite de victoire avant l’embarquement.", 1.8);
      return;
    }
    state.dropShip ??= createDropShipArrival();
    const shipStep = stepDropShip(state.dropShip, {
      deltaSeconds: 0,
      playerAtBeacon: true,
      requestBoarding: true,
    });
    state.dropShip = shipStep.state;
    if (shipStep.boardingAccepted) {
      forceDecloak(state);
      state.player.invulnerability = Math.max(
        state.player.invulnerability,
        5,
      );
      announce(state, "Faisceau verrouillé. Hissage vers la soute.", 2.4);
    } else if (state.dropShip.phase === "approach") {
      announce(state, "Vaisseau en approche : maintiens la zone sûre.", 1.8);
    }
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
  const waveSpawnsPending = state.enemies.some(
    (enemy) => !enemy.active && enemy.waveActivationAt !== null,
  );
  if (supportReady && !waveSpawnsPending && !state.boss.active) {
    state.boss.active = true;
    announce(
      state,
      `Cible Apex détectée : ${mission.boss.name}.`,
      4,
    );
  }
}

function selectWeaponSlot(
  state: GameState,
  loadout: Loadout,
  slotIndex: 0 | 1,
): void {
  if (state.player.activeWeaponSlot === slotIndex) return;
  state.player.activeWeaponSlot = slotIndex;
  state.player.weaponChargeSeconds = 0;
  const weapon = equippedWeapon(loadout, slotIndex);
  queueSound(state, "weapon-switch");
  announce(state, `${weapon.name} sélectionné.`, 1.2);
}

function updateAimState(
  state: GameState,
  input: InputHub,
  loadout: Loadout,
  delta: number,
): void {
  const player = state.player;
  player.aiming = isHeld(input, "aim");
  const activeWeaponId = equippedWeapon(
    loadout,
    player.activeWeaponSlot,
  ).id;
  if (
    player.aiming &&
    player.weaponCooldown <= 0 &&
    (activeWeaponId === "plasma-caster" || activeWeaponId === "yautja-bow")
  ) {
    player.weaponChargeSeconds = Math.min(
      2,
      player.weaponChargeSeconds + Math.max(0, delta),
    );
  } else {
    player.weaponChargeSeconds = 0;
  }
  const handWeaponId = selectedHandWeapon(
    loadout,
    player.activeWeaponSlot,
  );
  const frame = solvePlayerRigFrame(
    state,
    player,
    handWeaponId === "yautja-bow" && player.aiming
      ? player.aimAngle
      : undefined,
  );
  const origin = handWeaponId
    ? frame.anchors.handGrip
    : frame.anchors.muzzle;
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

  // Controller assistance must not keep targeting the last mouse position.
  if (player.aiming && input.pointerScreen && !input.gamepadHeld.has("aim")) {
    player.aimPoint.x = clamp(
      input.pointerScreen.x + state.cameraX,
      0,
      state.world.width,
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
  if (
    player.aiming &&
    Math.abs(dx) > 18 &&
    (player.melee?.phase ?? "idle") === "idle"
  ) {
    player.facing = dx >= 0 ? 1 : -1;
  }
  player.aimAngle = Math.atan2(dy, dx);
}

function updateHunterRig(player: PlayerState, delta: number, extracting: boolean): void {
  const gauntletTarget = extracting ? 1 : 0;
  const bladesTarget =
    extracting ||
    player.attackFlash > 0 ||
    (player.melee?.phase ?? "idle") !== "idle"
      ? 1
      : 0;
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

/** Apply one decision from the shared jump controller to the live actor. */
function applyPlayerJump(state: GameState, result: JumpAssistResult): void {
  const player = state.player;
  state.jumpAssist = result.state;
  player.velocityY = result.velocityY;
  if (!result.jump) return;
  const origin = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
  player.grounded = false;
  if (result.jump === "climb") {
    player.climbing = false;
    player.climbZoneId = null;
    player.velocityX = player.facing * 270;
    emitNoise(state, "landing", 0.24, 210, origin);
  } else if (result.jump === "boost") {
    player.aerialBoostUsed = true;
    emitNoise(state, "landing", 0.42, 340, origin);
  } else emitNoise(state, "footstep", 0.3, 230, origin);
  queueSound(state, "jump");
}

function updatePlayerJump(state: GameState, input: InputHub, delta: number, actionLocked: boolean): void {
  const pressed = consume(input, "jump");
  const player = state.player;
  const canBoost = !player.aerialBoostUsed && state.exploration.abilityIds.includes("aerial-boost");
  const landingSoon = pressed && canBoost && !player.grounded && !player.climbing && player.velocityY >= 0 &&
    predictLandingWithinBuffer(player, state.world.platforms, state.world.floorY, GRAVITY);
  applyPlayerJump(state, stepJumpAssist(state.jumpAssist ?? freshJumpAssistState(), {
    deltaSeconds: delta, pressed, held: isHeld(input, "jump"), grounded: player.grounded,
    climbing: player.climbing, canBoost, velocityY: player.velocityY, landingSoon, actionLocked,
  }));
}

function updatePlayer(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  inventory: PlayerInventory,
  appearance: HunterAppearance,
  difficulty: DifficultyId,
  input: InputHub,
  delta: number,
  finish: (result: MissionResult) => void,
): void {
  const player = state.player;
  const armor = effectiveArmorStats(
    loadout.armorId,
    inventory.armorUpgrades[loadout.armorId],
  );
  const wasGrounded = player.grounded;
  const movementSurface = activeSurface(
    state,
    player.x + player.width / 2,
  );
  const hazardMovementMultiplier = state.world.hazards.reduce(
    (multiplier, hazard) =>
      isHazardActive(hazard, state.elapsed) && overlaps(player, hazard)
        ? Math.min(multiplier, hazard.movementMultiplier)
        : multiplier,
    1,
  );
  const moveAxis =
    (isHeld(input, "right") ? 1 : 0) - (isHeld(input, "left") ? 1 : 0);
  const climbAxis =
    (isHeld(input, "down") ? 1 : 0) - (isHeld(input, "up") ? 1 : 0);
  const meleeInputQueued = input.pressed.has("melee");
  const dodgeRequested =
    player.grounded &&
    isHeld(input, "down") &&
    input.pressed.has("jump");
  if (consume(input, "weaponOne")) {
    selectWeaponSlot(state, loadout, 0);
  }
  if (consume(input, "weaponTwo")) {
    selectWeaponSlot(state, loadout, 1);
  }
  if (consume(input, "weaponNext")) {
    selectWeaponSlot(
      state,
      loadout,
      player.activeWeaponSlot === 0 ? 1 : 0,
    );
  }
  updateAimState(state, input, loadout, delta);

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
      queueSound(state, player.maskOn ? "mask-on" : "mask-off");
    }
  }

  if (state.trophyExtracting && state.trophyRitual) {
    const ritualActions: readonly TrophyRitualAction[] = [
      "left",
      "right",
      "melee",
      "interact",
    ];
    const ritualAction =
      ritualActions.find((action) => input.pressed.has(action)) ?? null;
    // Consume every ritual key so a valid lunge cannot also move or attack.
    for (const action of ritualActions) input.pressed.delete(action);
    const ritualStep = stepTrophyRitual(
      state.trophyRitual,
      delta,
      ritualAction,
    );
    state.trophyRitual = ritualStep.state;
    state.trophyExtraction = trophyRitualProgress(ritualStep.state);
    player.velocityX *= Math.pow(0.0001, delta);
    forceDecloak(state);
    if (ritualStep.state.status === "complete") {
      finishTrophyExtraction(state, mission);
    } else if (ritualStep.state.status === "failed") {
      state.trophyExtracting = false;
      state.trophyExtraction = 0;
      state.trophyRitual = null;
      state.regularTrophyDropId = null;
      announce(
        state,
        "Rite rompu après trois erreurs. Reprends ton souffle puis relance [E].",
        3,
      );
    } else if (ritualStep.mistakeAdded) {
      announce(
        state,
        `Rythme manqué · ${ritualStep.state.mistakes}/${TROPHY_RITUAL_TIMING.maximumMistakes} erreurs.`,
        1.25,
      );
    }
  }
  if (!state.trophyExtracting) {
    input.pressed.delete("left");
    input.pressed.delete("right");
  }

  if (state.trophyVictory && !state.trophyVictory.complete) {
    state.trophyVictory = stepTrophyVictory(state.trophyVictory, delta);
    player.velocityX *= Math.pow(0.0001, delta);
    forceDecloak(state);
  }

  if (state.phase === "extraction" && state.dropShip) {
    const playerAtBeacon =
      Math.abs(
        player.x + player.width / 2 - state.world.extraction.x,
      ) <= 115;
    const shipStep = stepDropShip(state.dropShip, {
      deltaSeconds: delta,
      playerAtBeacon,
      requestBoarding: false,
    });
    state.dropShip = shipStep.state;
    if (shipStep.completed) {
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
  }

  const victoryLocked = Boolean(
    state.trophyVictory && !state.trophyVictory.complete,
  );
  const boardingLocked =
    state.dropShip?.phase === "boarding" ||
    state.dropShip?.phase === "departure";
  if (boardingLocked && state.dropShip) {
    const visual = dropShipVisual(
      state.dropShip,
      state.world.extraction.x,
    );
    player.x +=
      (state.world.extraction.x - player.width / 2 - player.x) *
      Math.min(1, delta * 7);
    player.y =
      state.world.floorY -
      player.height -
      visual.boardingProgress * 335;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = false;
    player.climbing = false;
    player.climbZoneId = null;
    state.jumpAssist = freshJumpAssistState({ requireRelease: true });
    updateHunterRig(player, delta, false);
    input.pressed.clear();
    return;
  }
  const actionLocked = state.trophyExtracting || victoryLocked;
  updatePlayerMeleeCombat(state, mission, delta, actionLocked);

  const dodgeVelocity = huntMeleeDodgeVelocity(player.melee);
  const targetVelocity =
    dodgeVelocity !== 0
      ? dodgeVelocity *
        armor.moveSpeedMultiplier *
        movementSurface.movementMultiplier *
        hazardMovementMultiplier
      : (actionLocked ? 0 : moveAxis) *
        300 *
        huntMeleeMovementMultiplier(player.melee) *
        armor.moveSpeedMultiplier *
        movementSurface.movementMultiplier *
        hazardMovementMultiplier;
  player.velocityX +=
    (targetVelocity - player.velocityX) * Math.min(1, delta * 13);
  if (
    !actionLocked &&
    moveAxis !== 0 &&
    !player.aiming &&
    player.melee.phase === "idle" &&
    player.melee.defensePhase === "neutral"
  ) {
    player.facing = moveAxis > 0 ? 1 : -1;
  }
  if (Math.abs(moveAxis) < 0.1) {
    player.velocityX *= Math.pow(0.0008, delta);
  }

  const playerCenter = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };
  const currentClimbZone = state.world.climbables.find(
    (zone) =>
      zone.id === player.climbZoneId ||
      (playerCenter.x >= zone.x - 24 &&
        playerCenter.x <= zone.x + zone.width + 24 &&
        playerCenter.y >= zone.y - 28 &&
        playerCenter.y <= zone.y + zone.height + 28),
  );
  if (
    !actionLocked &&
    !meleeInputQueued &&
    !dodgeRequested &&
    climbAxis !== 0 &&
    currentClimbZone &&
    Math.abs(moveAxis) < 0.5
  ) {
    player.climbing = true;
    player.climbZoneId = currentClimbZone.id;
    player.grounded = false;
  }
  if (
    player.climbing &&
    (Math.abs(moveAxis) > 0.5 || player.stamina <= 0)
  ) {
    player.climbing = false;
    player.climbZoneId = null;
  }

  if (!actionLocked && dodgeRequested) {
    consume(input, "jump");
    const dodgeDirection: -1 | 1 =
      moveAxis === 0 ? (player.facing === 1 ? -1 : 1) : moveAxis > 0 ? 1 : -1;
    playerMeleeDodge(state, dodgeDirection);
  } else {
    updatePlayerJump(state, input, delta, actionLocked);
  }

  if (consume(input, "melee") && !actionLocked) {
    if (player.aiming && player.grounded) {
      playerMeleeParry(state);
    } else if (!player.grounded) {
      playerMeleeTechnique(
        state,
        loadout,
        inventory,
        "aerial",
        null,
      );
    } else {
      const activeWeaponId = equippedWeapon(
        loadout,
        player.activeWeaponSlot,
      ).id;
      const meleeWeaponId: WeaponId =
        activeWeaponId === "combistick" &&
        player.weaponAmmo[player.activeWeaponSlot] > 0
          ? "combistick"
          : "wristblades";
      const contextualMeleeStats = effectiveWeaponStats(
        meleeWeaponId,
        inventory.weaponUpgrades[meleeWeaponId],
      );
      const contextualReach = resolveHunterWeaponAttack(
        meleeWeaponId,
        contextualMeleeStats,
      ).meleeReachPx;
      const closeTarget = nearestHuntMeleeTarget(
        state,
        contextualReach * 0.62,
      );
      const guardTarget = nearestHuntMeleeTarget(
        state,
        contextualReach * 0.96,
      );
      if (isHeld(input, "up")) {
        playerMeleeTechnique(
          state,
          loadout,
          inventory,
          "throw",
          closeTarget?.boss ? null : closeTarget,
        );
      } else if (isHeld(input, "down")) {
        if (
          closeTarget &&
          !closeTarget.boss &&
          closeTarget.health / closeTarget.maxHealth <=
            HUNT_MELEE_EXECUTION_HEALTH_RATIO
        ) {
          playerMeleeTechnique(
            state,
            loadout,
            inventory,
            "execution",
            closeTarget,
          );
        } else if (
          guardTarget &&
          (guardTarget.telegraph > 0 || guardTarget.pendingAttackId)
        ) {
          playerMeleeTechnique(
            state,
            loadout,
            inventory,
            "guard-break",
            guardTarget,
          );
        } else {
          playerMeleeTechnique(
            state,
            loadout,
            inventory,
            "heavy",
            null,
          );
        }
      } else {
        playerMelee(state, mission, loadout, inventory);
      }
    }
  }
  if (
    consume(input, "weapon") &&
    !actionLocked &&
    player.melee.phase === "idle" &&
    player.melee.defensePhase === "neutral"
  ) {
    playerWeapon(state, mission, loadout, inventory);
  }
  if (consume(input, "scan") && !actionLocked) playerScan(state, mission);
  if (consume(input, "heal") && !actionLocked) playerHeal(state);
  if (consume(input, "gearOne") && !actionLocked) {
    activateGearSlot(state, 0);
  }
  if (consume(input, "gearTwo") && !actionLocked) {
    activateGearSlot(state, 1);
  }
  if (consume(input, "cloak") && !actionLocked) {
    if (player.cloaked) {
      forceDecloak(state);
      announce(state, "Camouflage désactivé.", 1.2);
    } else if (player.energy >= 20) {
      player.cloaked = true;
      announce(state, "Camouflage actif.", 1.2);
      queueSound(state, "cloak-on");
    } else {
      announce(state, "Énergie insuffisante pour le camouflage.", 1.8);
    }
  }
  if (consume(input, "interact")) {
    interact(state, mission);
  }

  const motionStart = { x: player.x, y: player.y };
  player.previousY = player.y;
  if (player.climbing && currentClimbZone) {
    const flexibleClimb =
      currentClimbZone.kind === "vine" ||
      currentClimbZone.kind === "rope" ||
      currentClimbZone.kind === "chain";
    const climbCenterX =
      currentClimbZone.x + currentClimbZone.width / 2 - player.width / 2;
    player.x +=
      (climbCenterX - player.x) *
      Math.min(1, delta * (flexibleClimb ? 6 : 9));
    player.velocityX *= Math.pow(0.001, delta);
    player.velocityY +=
      (climbAxis * 235 * currentClimbZone.climbSpeedMultiplier -
        player.velocityY) *
      Math.min(1, delta * 14);
    player.stamina = Math.max(
      0,
      player.stamina - currentClimbZone.staminaPerSecond * delta,
    );
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

  const impactVelocity = player.velocityY;
  const motion = resolvePlatformMotion(
    { ...player, ...motionStart },
    { x: player.x, y: player.y },
    player.climbing ? state.world.platforms.filter(platform => platform.collision === "solid") : state.world.platforms,
    state.world.floorY,
  );
  player.x = motion.x;
  player.y = motion.y;
  player.velocityX = motion.velocityX;
  player.velocityY = motion.velocityY;
  player.grounded = motion.grounded;
  if (player.grounded) player.aerialBoostUsed = false;
  if (!wasGrounded && player.grounded && impactVelocity > 180) {
    emitNoise(
      state,
      "landing",
      clamp(impactVelocity / 900, 0.25, 1),
      260 + impactVelocity * 0.3,
      {
        x: player.x + player.width / 2,
        y: player.y + player.height,
      },
    );
  }

  if (player.grounded && state.jumpAssist.bufferSeconds > 0) {
    applyPlayerJump(state, stepJumpAssist(state.jumpAssist, {
      deltaSeconds: 0, pressed: false, held: isHeld(input, "jump"), grounded: true,
      climbing: false, canBoost: false, velocityY: player.velocityY, actionLocked,
    }));
  }

  let maximumX = state.world.width - player.width;
  if (!state.boss.active && state.phase !== "extraction") {
    maximumX = state.world.bossArena.x - 90;
  }
  player.x = clamp(player.x, 0, maximumX);
  updateHunterRig(player, delta, state.trophyExtracting);

  player.invulnerability = Math.max(0, player.invulnerability - delta);
  player.weaponCooldown = Math.max(0, player.weaponCooldown - delta);
  player.scanCooldown = Math.max(0, player.scanCooldown - delta);
  player.healCooldown = Math.max(0, player.healCooldown - delta);
  player.stamina = Math.min(
    player.maxStamina,
    player.stamina +
      (player.climbing ? 0 : player.grounded ? 24 : 14) * delta,
  );
  if (player.cloaked) {
    player.energy -= 16 * delta;
    if (player.energy <= 0) {
      player.energy = 0;
      forceDecloak(state);
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
    coverGraceSeconds: 0.14,
  });
  emitNoise(
    state,
    "weapon",
    source === "boss" ? 1 : 0.78,
    source === "boss" ? 860 : 640,
    { x: originX, y: originY },
    enemy.id,
  );
}

const REGULAR_RANGED_ATTACK_ID = "regular-ranged";
const REGULAR_MELEE_ATTACK_ID = "regular-melee";

function regularEnemyAttackRequest(
  enemy: EnemyState,
  attackId: typeof REGULAR_RANGED_ATTACK_ID | typeof REGULAR_MELEE_ATTACK_ID,
) {
  let signature = 0;
  for (const character of `${enemy.id}:${enemy.archetype}`) {
    signature = (signature * 31 + character.charCodeAt(0)) >>> 0;
  }
  const timingVariation = (signature % 5) * 0.035;
  const ranged = attackId === REGULAR_RANGED_ATTACK_ID;
  return {
    attackId,
    telegraphSeconds:
      (ranged ? 0.55 : enemy.kind === "beast" ? 0.42 : 0.48) +
      timingVariation,
    cooldownSeconds: ranged
      ? 1.35 + (signature % 8) * 0.09
      : enemy.kind === "beast"
        ? 1.05
        : 1.2,
  };
}

function updateRegularEnemy(
  state: GameState,
  enemy: EnemyState,
  mission: MissionDefinition,
  delta: number,
): void {
  if (!enemy.active) {
    if (
      enemy.waveActivationAt === null ||
      state.elapsed < enemy.waveActivationAt
    ) {
      return;
    }
    enemy.active = true;
    enemy.waveActivationAt = null;
  }
  if (!enemy.alive) {
    enemy.telegraph = 0;
    enemy.pendingAttackId = null;
    enemy.deathAnimation = Math.max(0, enemy.deathAnimation - delta);
    return;
  }
  enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
  if (
    ((enemy.hitStunSeconds ?? 0) > 0 ||
      Math.abs(enemy.knockbackVelocityX ?? 0) > 0.01 ||
      Math.abs(enemy.knockbackVelocityY ?? 0) > 0.01 ||
      enemy.y < (enemy.knockbackRestY ?? enemy.y) - 0.01) &&
    stepEnemyMeleeHitReaction(
      enemy,
      delta,
      Math.max(0, enemy.patrolLeft - 90),
      Math.min(state.world.width - enemy.width, enemy.patrolRight + 90),
    )
  ) {
    return;
  }
  if (enemy.restrainedUntil > state.elapsed) {
    const cancelledAttack = stepRegularAttackTelegraph(
      {
        cooldownSeconds: enemy.attackCooldown,
        telegraphSeconds: enemy.telegraph,
        pendingAttackId: enemy.pendingAttackId,
      },
      {
        deltaSeconds: delta,
        request: null,
        cancelled: true,
      },
    );
    enemy.attackCooldown = cancelledAttack.state.cooldownSeconds;
    enemy.telegraph = cancelledAttack.state.telegraphSeconds;
    enemy.pendingAttackId = cancelledAttack.state.pendingAttackId;
    enemy.velocityX = 0;
    return;
  }

  const player = state.player;
  const ecologyDefinition = ecologyV8EnemyForId(enemy.archetype);
  const ecologyProfile = ecologyDefinition
    ? ecologyV8RuntimeProfile(ecologyDefinition)
    : null;
  const selfPosition = {
    x: enemy.x + enemy.width / 2,
    y: enemy.y + enemy.height / 2,
  };
  const targetPosition = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };
  const targetDistance = distance(selfPosition, targetPosition);
  const detectionMultiplier =
    DIFFICULTY_BY_ID[state.arsenal.difficultyId].detectionMultiplier;
  const visionRange =
    (enemy.kind === "human" ? 590 : enemy.kind === "yautja" ? 680 : 440) *
    detectionMultiplier;
  const cloakVisibility = player.cloaked
    ? clamp(
        0.04 +
          state.mud.cloakShimmer +
          Math.abs(player.velocityX) / 1_350,
        0.04,
        0.68,
      )
    : 1;
  const coverOcclusion = calculateLineOfSightOcclusion(
    selfPosition,
    targetPosition,
    state.world.covers.filter(
      (cover) => !state.brokenPillarIds.has(cover.id),
    ),
  );
  const targetDirection =
    targetPosition.x >= selfPosition.x ? 1 : -1;
  const targetInFront = targetDirection === enemy.facing;
  const facingVisibility = targetInFront
    ? 1
    : targetDistance <= 145
      ? 0.52
      : 0.18;
  const visualContact =
    clamp(1 - targetDistance / visionRange, 0, 1) *
    cloakVisibility *
    facingVisibility *
    (1 - coverOcclusion * 0.9);
  const thermalContact =
    enemy.kind === "human"
      ? 0
      : clamp(1 - targetDistance / (visionRange * 1.15), 0, 1) *
        state.mud.thermalVisibility *
        (targetInFront ? 1 : 0.42) *
        (1 - coverOcclusion * 0.66);

  const wind = sampleWind(state.world.wind, state.elapsed, selfPosition.x);
  let heardNoise: ReturnType<typeof perceivedNoise> = null;
  for (const noise of state.noiseEvents) {
    if (noise.sourceId !== "hunter") continue;
    const perception = perceivedNoise(noise, {
      position: selfPosition,
      elapsedSeconds: state.elapsed,
      hearingMultiplier:
        (enemy.kind === "beast"
          ? 1.28
          : enemy.kind === "yautja"
            ? 1.15
            : 1) * detectionMultiplier,
      occlusion: coverOcclusion,
      wind,
    });
    if (
      perception &&
      (!heardNoise || perception.strength > heardNoise.strength)
    ) {
      heardNoise = perception;
    }
  }
  const scent = sampleScentAt(selfPosition, state.scentNodes);
  const track = sampleTracksAt(
    selfPosition,
    state.tracks.filter((candidate) => candidate.ownerId === "hunter"),
    enemy.kind === "beast" ? 280 : 190,
    state.elapsed,
  );
  const alliesInRange = state.enemies
    .filter(
      (ally) =>
        ally.id !== enemy.id &&
        ally.active &&
        ally.alive &&
        ally.factionId === enemy.factionId &&
        distance(selfPosition, {
          x: ally.x + ally.width / 2,
          y: ally.y + ally.height / 2,
        }) <= 540,
    )
    .map((ally) => ally.id);
  const nearbyCovers = state.world.covers
    .filter(
      (cover) =>
        !state.brokenPillarIds.has(cover.id) &&
        Math.abs(cover.x + cover.width / 2 - selfPosition.x) <= 620,
    )
    .map((cover) => {
      const position = {
        x: cover.x + cover.width / 2,
        y: cover.y + cover.height / 2,
      };
      return {
        id: cover.id,
        position,
        protection: cover.protection,
        distance: distance(selfPosition, position),
        occupied: state.enemies.some(
          (ally) =>
            ally.id !== enemy.id &&
            ally.active &&
            ally.alive &&
            ally.factionId === enemy.factionId &&
            Math.abs(ally.x + ally.width / 2 - position.x) < 42,
        ),
      };
    });
  const previousBrain =
    state.aiBrains[enemy.id] ?? createAiBrain(enemy.id, enemy.kind);
  const aiStep = stepAiBrain(previousBrain, {
    deltaSeconds: delta,
    elapsedSeconds: state.elapsed,
    self: selfPosition,
    target: targetPosition,
    healthRatio: enemy.health / enemy.maxHealth,
    visualContact,
    thermalContact,
    heardNoise,
    scentStrength: scent.strength,
    scentDirection: scent.direction,
    trackStrength: track.strength,
    trackPosition: track.newest
      ? { x: track.newest.x, y: track.newest.y }
      : null,
    underRangedThreat: state.projectiles.some(
      (projectile) =>
        !projectile.hostile &&
        Math.abs(projectile.x - selfPosition.x) < 260,
    ),
    alliesInRange,
    alliesEngaged: alliesInRange.filter(
      (allyId) => state.aiBrains[allyId]?.mode === "engage",
    ).length,
    nearbyCovers,
  });
  state.aiBrains[enemy.id] = aiStep.brain;

  if (aiStep.raisedAlert) {
    queueSound(state, "enemy-alert");
    emitNoise(
      state,
      "vocalization",
      0.62,
      520,
      selfPosition,
      enemy.id,
    );
    for (const allyId of aiStep.brain.alertedAllyIds) {
      const allyBrain = state.aiBrains[allyId];
      if (!allyBrain) continue;
      state.aiBrains[allyId] = receiveAiAlert(
        allyBrain,
        targetPosition,
        aiStep.brain.alertedAllyIds,
      );
    }
  }

  const moveIntent =
    ecologyProfile?.mobility === "stationary" ? 0 : aiStep.intent.moveX;
  if (moveIntent !== 0) {
    enemy.facing = moveIntent;
  }
  enemy.velocityX =
    moveIntent * enemy.moveSpeed * aiStep.intent.speedMultiplier;
  const rangedAttack =
    enemy.kind === "human" || ecologyProfile?.attackStyle === "ranged";
  const meleeRange = enemy.width * 0.8 + player.width * 0.55 + 52;
  const wantsAttack =
    aiStep.intent.action === "attack" ||
    aiStep.intent.action === "suppress";
  const requestedAttackId =
    wantsAttack && rangedAttack && targetDistance < 650
      ? REGULAR_RANGED_ATTACK_ID
      : wantsAttack && !rangedAttack && targetDistance < meleeRange
        ? REGULAR_MELEE_ATTACK_ID
        : null;
  const attackStep = stepRegularAttackTelegraph(
    {
      cooldownSeconds: enemy.attackCooldown,
      telegraphSeconds: enemy.telegraph,
      pendingAttackId: enemy.pendingAttackId,
    },
    {
      deltaSeconds: delta,
      request: requestedAttackId
        ? regularEnemyAttackRequest(enemy, requestedAttackId)
        : null,
    },
  );
  enemy.attackCooldown = attackStep.state.cooldownSeconds;
  enemy.telegraph = attackStep.state.telegraphSeconds;
  enemy.pendingAttackId = attackStep.state.pendingAttackId;
  if (attackStep.immobilized) {
    enemy.velocityX = 0;
  }

  if (attackStep.executedAttackId === REGULAR_RANGED_ATTACK_ID) {
    // Leaving the acquisition envelope during the warning produces a clean
    // whiff. The cooldown already started with the telegraph.
    if (targetDistance < 650) {
      const projectileColor =
        ecologyDefinition?.category === "flora"
          ? "#b8ff6a"
          : ecologyDefinition?.id.includes("xeno")
            ? "#d5ff8c"
            : ecologyDefinition?.category === "bad-blood"
              ? "#ff5f55"
              : ecologyDefinition?.category === "fauna"
                ? "#ffd36b"
                : "#78e5ff";
      fireHostileProjectile(
        state,
        enemy,
        enemy.damage,
        560,
        projectileColor,
        "enemy",
      );
    }
  } else if (
    attackStep.executedAttackId === REGULAR_MELEE_ATTACK_ID
  ) {
    if (targetDistance < meleeRange) {
      if (!resolvePlayerMeleeParry(state, enemy)) {
        hurtPlayer(state, enemy.damage, mission);
      }
      emitNoise(state, "melee", 0.6, 360, selfPosition, enemy.id);
    }
  }

  const movementLeash = resolveAiMovementLeash(
    aiStep.brain.mode,
    enemy.patrolLeft,
    enemy.patrolRight,
    state.world.width,
    enemy.width,
  );
  enemy.x = clamp(
    enemy.x + enemy.velocityX * delta,
    movementLeash.left,
    movementLeash.right,
  );
  if (ecologyProfile?.mobility === "flying") {
    const flightPhase = state.elapsed * 2.1 + enemy.id.length * 0.47;
    enemy.y =
      FLOOR_Y - enemy.height - 92 - (enemy.id.length % 4) * 14 +
      Math.sin(flightPhase) * 24;
  } else if (ecologyProfile?.mobility === "burrowing") {
    const burrowPhase = (state.elapsed * 0.7 + enemy.id.length * 0.13) % 4;
    const depth = burrowPhase < 1 ? Math.sin(burrowPhase * Math.PI) * 0.42 : 0;
    enemy.y = FLOOR_Y - enemy.height + enemy.height * depth;
  }
  if (!ecologyProfile || ecologyProfile.mobility === "ground") {
    emitEnemyFootprint(state, enemy);
  }
  if (
    (enemy.x <= movementLeash.left + 1 && aiStep.intent.moveX < 0) ||
    (enemy.x >= movementLeash.right - 1 && aiStep.intent.moveX > 0)
  ) {
    state.aiBrains[enemy.id] = {
      ...state.aiBrains[enemy.id],
      searchDirection: aiStep.intent.moveX < 0 ? 1 : -1,
    };
  }
}

function spawnBossSupport(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  count: number,
  groupId: string,
): void {
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  const support =
    mission.id === "jungle-vey"
      ? {
          archetype: "heavy",
          health: 150,
          damage: 14,
          moveSpeed: 90,
        }
      : mission.id === "ice-cryostalker"
        ? {
            archetype: "cryostalker-runner",
            health: 70,
            damage: 14,
            moveSpeed: 190,
          }
        : {
            archetype: "bad-blood-initiate",
            health: 130,
            damage: 18,
            moveSpeed: 150,
          };
  for (let index = 0; index < count; index += 1) {
    const enemy = makeEnemy(
      `${groupId}-${state.nextSignalId++}-${index}`,
      support.archetype,
      mission.id,
      clamp(
        state.boss.x + (index % 2 === 0 ? -260 : 270),
        state.world.bossArena.x + 30,
        state.world.bossArena.x + state.world.bossArena.width - 130,
      ),
      state.world.width,
      support.health,
      support.damage,
      support.moveSpeed,
      difficultyDef.enemyHealthMultiplier,
      difficultyDef.enemyDamageMultiplier,
    );
    enemy.patrolLeft = state.world.bossArena.x;
    enemy.patrolRight =
      state.world.bossArena.x + state.world.bossArena.width - enemy.width;
    state.enemies.push(enemy);
    state.aiBrains[enemy.id] = createAiBrain(enemy.id, enemy.kind);
  }
}

function executeBossAttack(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  attackId: string,
  damageMultiplier: number,
): void {
  const boss = state.boss;
  const player = state.player;
  const attack = mission.boss.attacks.find((entry) => entry.id === attackId);
  if (!attack) return;
  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  const bossCenter = {
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height / 2,
  };
  const playerCenter = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };
  const dx = playerCenter.x - bossCenter.x;
  const dy = playerCenter.y - bossCenter.y;
  const coverOcclusion = calculateLineOfSightOcclusion(
    bossCenter,
    playerCenter,
    state.world.covers.filter(
      (cover) => !state.brokenPillarIds.has(cover.id),
    ),
  );
  const damage =
    attack.damage *
    difficultyDef.enemyDamageMultiplier *
    damageMultiplier;
  emitNoise(
    state,
    attack.behavior === "area" ? "hazard" : "weapon",
    1,
    920,
    { x: boss.x + boss.width / 2, y: boss.y + boss.height / 2 },
    boss.id,
  );

  if (
    attack.behavior === "melee" &&
    Math.abs(dx) < 165 &&
    Math.abs(dy) < 135
  ) {
    if (!resolvePlayerMeleeParry(state, boss)) {
      hurtPlayer(state, damage, mission);
    }
  } else if (attack.behavior === "charge") {
    boss.velocityX = boss.facing * 760;
    if (Math.abs(dx) < 230 && Math.abs(dy) < 150) {
      hurtPlayer(state, damage, mission);
    }
  } else if (attack.behavior === "area") {
    const verticalReach = Math.max(
      155,
      Math.min(270, attack.rangePx * 0.45),
    );
    if (
      Math.abs(dx) < attack.rangePx &&
      Math.abs(dy) < verticalReach &&
      coverOcclusion < 0.8
    ) {
      hurtPlayer(
        state,
        damage * (1 - coverOcclusion * 0.7),
        mission,
      );
      forceDecloak(state);
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
      attack.behavior === "plasma" ? "#ff4838" : mission.boss.color,
      "boss",
    );
  }
}

function drawGuardianAdaptiveField(
  context: CanvasRenderingContext2D,
  state: GameState,
  palette: MissionDefinition["palette"],
): void {
  if (state.bossMechanics.missionId !== "ruins-ancient-guardian" ||
    !state.boss.active || !state.boss.alive) return;
  const adaptation = state.bossMechanics.guardianAdaptation;
  if (!adaptation || (adaptation.warningSeconds <= 0 && adaptation.fieldSeconds <= 0)) return;
  const warning = adaptation.warningSeconds > 0;
  const center = { x: state.boss.x + state.boss.width / 2, y: state.boss.y + state.boss.height / 2 };
  context.save();
  context.strokeStyle = warning ? palette.danger : palette.accent;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = warning ? 3 : 2;
  context.globalAlpha = warning ? 0.55 + Math.sin(state.elapsed * 10) * 0.2 : 0.28;
  context.setLineDash(warning ? [12, 8] : [4, 8]);
  context.beginPath();
  context.arc(center.x, center.y, GUARDIAN_ADAPTATION.rangePx, 0, Math.PI * 2);
  context.stroke();
  if (warning) {
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2);
    context.stroke();
  }
  context.setLineDash([]);
  context.globalAlpha = 1;
  context.font = "700 13px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(
    warning ? `CHAMP DANS ${adaptation.warningSeconds.toFixed(1)} S` : `CHAMP ${adaptation.fieldSeconds.toFixed(1)} S`,
    center.x, state.boss.y - 24,
  );
  context.restore();
}

const BOSS_EFFECTS_PRESERVED_DURING_HIT_STUN = new Set<BossEffectKind>([
  "purge-started",
  "purge-console-disabled",
  "purge-cancelled",
  "purge-detonated",
  "guardian-adaptive-warning",
  "guardian-adaptive-evaded",
  "guardian-adaptive-field",
]);

function updateBoss(
  state: GameState,
  mission: MissionDefinition,
  difficulty: DifficultyId,
  delta: number,
): void {
  const boss = state.boss;
  if (!boss.active) return;
  const pendingBadBloodPurge =
    mission.id === "volcano-bad-blood" &&
    state.bossMechanics.missionId === "volcano-bad-blood" &&
    !state.bossMechanics.purgeResolved &&
    (state.bossMechanics.purgeSeconds !== null ||
      boss.health / boss.maxHealth <= 0.18);
  if (!boss.alive && !pendingBadBloodPurge) return;

  // Resolve an interrupting melee reaction before advancing any boss decision.
  // Only an armed purge or an already-running Guardian field may keep ticking:
  // both are persistent world hazards that must not be frozen by hit chaining.
  boss.hitFlash = Math.max(0, boss.hitFlash - delta);
  const bossReacting =
    ((boss.hitStunSeconds ?? 0) > 0 ||
      Math.abs(boss.knockbackVelocityX ?? 0) > 0.01 ||
      Math.abs(boss.knockbackVelocityY ?? 0) > 0.01 ||
      boss.y < (boss.knockbackRestY ?? boss.y) - 0.01) &&
    stepEnemyMeleeHitReaction(
      boss,
      delta,
      boss.patrolLeft,
      boss.patrolRight,
    );
  const guardianAdaptation =
    state.bossMechanics.missionId === "ruins-ancient-guardian"
      ? state.bossMechanics.guardianAdaptation
      : null;
  const persistentHazardNeedsTick =
    pendingBadBloodPurge ||
    Boolean(
      guardianAdaptation &&
        (guardianAdaptation.warningSeconds > 0 ||
          guardianAdaptation.fieldSeconds > 0),
    );
  if (bossReacting && !persistentHazardNeedsTick) return;

  const difficultyDef = DIFFICULTY_BY_ID[difficulty];
  const bossRestrained = boss.restrainedUntil > state.elapsed;
  if (bossRestrained) {
    boss.velocityX = 0;
  }
  const player = state.player;
  const bossCenter = {
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height / 2,
  };
  const playerCenter = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
  };
  const dx = playerCenter.x - bossCenter.x;
  const bossCoverOcclusion = calculateLineOfSightOcclusion(
    bossCenter,
    playerCenter,
    state.world.covers.filter(
      (cover) => !state.brokenPillarIds.has(cover.id),
    ),
  );
  const bossMechanicsBeforeStep = state.bossMechanics;
  const mechanicStep = stepBossMechanics(state.bossMechanics, {
    deltaSeconds: delta,
    elapsedSeconds: state.elapsed,
    healthRatio: boss.health / boss.maxHealth,
    distanceToPlayer: distance(bossCenter, playerCenter),
    lineOfSight:
      Math.abs(dx) < 900 &&
      bossCoverOcclusion < 0.72 &&
      !player.cloaked,
    playerCloaked: player.cloaked,
    playerOnHighGround:
      player.y + player.height < state.world.floorY - 70,
    playerUsedRangedWeapon: state.playerUsedRangedWeapon,
    playerUsedEnergyWeapon: state.playerUsedEnergyWeapon,
    bossHitPillar: state.bossHitPillar,
    disabledConsoleId: state.disabledConsoleId,
    activeSupportCount: state.enemies.filter(
      (enemy) => enemy.alive && enemy.active,
    ).length,
  });
  state.bossMechanics = bossReacting
    ? ({
        ...mechanicStep.state,
        attackCooldownSeconds: Math.max(
          bossMechanicsBeforeStep.attackCooldownSeconds,
          0.35,
        ),
        sequence: bossMechanicsBeforeStep.sequence,
      } as BossMechanicState)
    : mechanicStep.state;
  state.bossVulnerabilityMultiplier =
    mechanicStep.decision.vulnerabilityMultiplier;
  state.bossThermalVisibility = mechanicStep.decision.thermalVisibility;
  state.energyWeaponsLocked = mechanicStep.decision.energyWeaponsLocked;
  state.bossHitPillar = false;
  state.disabledConsoleId = null;

  for (const effect of mechanicStep.effects) {
    if (
      bossReacting &&
      !BOSS_EFFECTS_PRESERVED_DURING_HIT_STUN.has(effect.kind)
    ) {
      continue;
    }
    switch (effect.kind) {
      case "spawn-support":
        spawnBossSupport(
          state,
          mission,
          difficulty,
          Math.max(1, Math.round(effect.value)),
          effect.id ?? "boss-support",
        );
        announce(state, "La cible appelle des renforts dans l’arène.", 3);
        break;
      case "reveal-cloak":
        forceDecloak(state);
        announce(state, "La fusée de Vey révèle ta signature.", 2.5);
        break;
      case "armor-plate-broken":
        {
          const armorRule = mission.honorRules.find(
            (rule) => rule.condition === "environmental-armor-break",
          );
          if (armorRule) {
            addHonor(
              state,
              honorRuleEventId(armorRule),
              armorRule.label,
              armorRule.bonus,
              "objective",
            );
          }
        }
        announce(state, "Impact réussi : une plaque de l’Alpha cède.", 2.4);
        break;
      case "burrow-warning":
        announce(state, "La glace se fissure sous tes pieds.", 1.4);
        break;
      case "falling-ice":
        if (
          player.x >= state.world.bossArena.x &&
          player.x <=
            state.world.bossArena.x + state.world.bossArena.width &&
          player.grounded
        ) {
          hurtPlayer(state, 8 * difficultyDef.enemyDamageMultiplier, mission);
        }
        break;
      case "energy-lock":
        announce(
          state,
          "Impulsion du sanctuaire : armes énergétiques verrouillées.",
          3,
        );
        break;
      case "duel-violation":
        {
          const duelRule = mission.honorRules.find(
            (rule) => rule.condition === "duel-kept",
          );
          addHonor(
            state,
            duelRule
              ? honorRuleEventId(duelRule)
              : effect.id ?? "bad-blood-duel-broken",
            duelRule
              ? `Code rompu : ${duelRule.label}`
              : "Duel final rompu par une arme à distance",
            -(duelRule?.violationPenalty ?? Math.abs(effect.value)),
            "violation",
          );
        }
        break;
      case "purge-started":
        announce(
          state,
          "AUTODESTRUCTION : neutralise les trois consoles avec [E].",
          5,
        );
        break;
      case "purge-console-disabled":
        announce(
          state,
          `Purge interrompue : ${Math.round(effect.value)}/3 consoles.`,
          2,
        );
        break;
      case "purge-cancelled":
        {
          const purgeRule = mission.honorRules.find(
            (rule) => rule.condition === "purge-stopped",
          );
          addHonor(
            state,
            purgeRule
              ? honorRuleEventId(purgeRule)
              : "bad-blood-purge-stopped",
            purgeRule?.label ?? "Purge du sanctuaire interrompue",
            purgeRule?.bonus ?? 20,
            "objective",
          );
        }
        announce(state, "Purge annulée. Le trophée est préservé.", 4);
        break;
      case "purge-detonated":
        addHonor(
          state,
          "bad-blood-purge-failed",
          "Purge du sanctuaire non interrompue",
          -25,
          "violation",
        );
        hurtPlayer(state, player.maxHealth * 2, mission);
        break;
      case "hydra-tidal-surge": {
        if (
          Math.abs(playerCenter.y - bossCenter.y) >= 205 ||
          bossCoverOcclusion >= 0.8
        ) {
          announce(
            state,
            "La marée de l’Hydre passe sous ton appui protégé.",
            2.2,
          );
          break;
        }
        const surgeDirection = dx >= 0 ? 1 : -1;
        player.stamina = Math.max(0, player.stamina - effect.value);
        player.velocityX = surgeDirection * 430;
        player.velocityY = Math.min(player.velocityY, -120);
        forceDecloak(state);
        if (state.screenShakeEnabled) state.screenShake = 11;
        announce(
          state,
          "La marée de l'Hydre arrache l'appui et épuise ton endurance.",
          3,
        );
        break;
      }
      case "sandmaw-burrow": {
        const emergeDirection = dx >= 0 ? -1 : 1;
        boss.x = clamp(
          player.x + emergeDirection * effect.value,
          boss.patrolLeft,
          boss.patrolRight,
        );
        boss.velocityX = 0;
        boss.telegraph = Math.max(boss.telegraph, 0.7);
        if (state.screenShakeEnabled) state.screenShake = 13;
        announce(
          state,
          "Le Sandmaw plonge puis émerge sur ton flanc.",
          2.6,
        );
        break;
      }
      case "leviathan-rogue-wave": {
        if (
          Math.abs(playerCenter.y - bossCenter.y) >= 225 ||
          bossCoverOcclusion >= 0.8
        ) {
          announce(
            state,
            "La vague du Léviathan se brise sous ta position.",
            2.2,
          );
          break;
        }
        const waveDirection = dx >= 0 ? 1 : -1;
        hurtPlayer(
          state,
          effect.value * difficultyDef.enemyDamageMultiplier,
          mission,
        );
        player.velocityX = waveDirection * 560;
        player.velocityY = -310;
        player.grounded = false;
        forceDecloak(state);
        announce(
          state,
          "La vague du Léviathan balaie la plateforme.",
          2.8,
        );
        break;
      }
      case "hivemind-spore-pulse":
        player.energy = Math.max(0, player.energy - effect.value);
        player.scanCooldown = Math.max(player.scanCooldown, 2.5);
        state.mud.cloakShimmer = Math.max(state.mud.cloakShimmer, 0.92);
        forceDecloak(state);
        announce(
          state,
          "Les spores-mémoires brouillent le masque et drainent l'énergie.",
          3.2,
        );
        break;
      case "guardian-adaptive-warning":
        boss.pendingAttackId = null;
        boss.telegraph = effect.value;
        boss.velocityX = 0;
        announce(
          state,
          `Le Gardien prépare son champ : ${effect.value.toFixed(1)} s pour rompre sa ligne de vue ou quitter le cercle.`,
          effect.value,
        );
        break;
      case "guardian-adaptive-evaded":
        boss.telegraph = 0;
        boss.pendingAttackId = null;
        announce(state, "Verrouillage déjoué : le Gardien a perdu ta signature.", 2.5);
        break;
      case "guardian-adaptive-field":
        // The persistent lock comes from bossMechanics, not a one-frame flag.
        // Preserve kinetic ammunition, returning discs and distant plasma shots.
        state.projectiles = state.projectiles.filter(
          (projectile) => projectile.hostile || projectile.weaponId !== "plasma-caster" ||
            distance(projectile, bossCenter) > GUARDIAN_ADAPTATION.rangePx ||
            calculateLineOfSightOcclusion(bossCenter, projectile, state.world.covers.filter(
              (cover) => !state.brokenPillarIds.has(cover.id),
            )) >= 0.72,
        );
        player.energy = Math.max(0, player.energy - 24);
        announce(
          state,
          `Champ adaptatif actif : plasma brouillé pendant ${effect.value.toFixed(1)} s. Les armes cinétiques restent utilisables.`,
          3,
        );
        break;
      case "suppression-zone":
        if (state.screenShakeEnabled) {
          state.screenShake = Math.max(state.screenShake, 3);
        }
        break;
      case "mud-camouflage":
        break;
    }
  }

  if (!boss.alive) return;
  if (bossReacting) return;
  if (bossRestrained) {
    boss.velocityX = 0;
    return;
  }
  const wasTelegraphing = boss.telegraph > 0;
  let executedAttackId: string | null = null;
  boss.telegraph = Math.max(0, boss.telegraph - delta);
  if (
    wasTelegraphing &&
    boss.telegraph <= 0 &&
    boss.pendingAttackId
  ) {
    executedAttackId = boss.pendingAttackId;
    executeBossAttack(
      state,
      mission,
      difficulty,
      boss.pendingAttackId,
      mechanicStep.decision.damageMultiplier,
    );
    boss.pendingAttackId = null;
  }
  if (
    mechanicStep.decision.attackId &&
    boss.telegraph <= 0 &&
    !boss.pendingAttackId
  ) {
    const attack = mission.boss.attacks.find(
      (entry) => entry.id === mechanicStep.decision.attackId,
    );
    if (attack) {
      boss.pendingAttackId = attack.id;
      boss.telegraph = Math.max(0.12, attack.telegraphMs / 1_000);
    }
  }

  boss.facing = dx >= 0 ? 1 : -1;
  if (boss.telegraph > 0) {
    boss.velocityX *= 0.78;
  } else if (
    executedAttackId &&
    mission.boss.attacks.find((attack) => attack.id === executedAttackId)
      ?.behavior === "charge"
  ) {
    // The charge velocity is set by executeBossAttack and must survive this tick.
  } else {
    const direction = dx >= 0 ? 1 : -1;
    switch (mechanicStep.decision.movement) {
      case "approach":
        boss.velocityX =
          direction *
          boss.moveSpeed *
          mechanicStep.decision.speedMultiplier;
        break;
      case "retreat":
        boss.velocityX =
          -direction *
          boss.moveSpeed *
          mechanicStep.decision.speedMultiplier *
          0.82;
        break;
      case "flank":
        boss.velocityX =
          (state.bossMechanics.sequence % 2 === 0 ? direction : -direction) *
          boss.moveSpeed *
          mechanicStep.decision.speedMultiplier;
        break;
      case "charge":
        if (Math.abs(boss.velocityX) < 500) {
          boss.velocityX =
            direction *
            boss.moveSpeed *
            mechanicStep.decision.speedMultiplier;
        }
        break;
      case "burrow":
        boss.velocityX =
          direction *
          boss.moveSpeed *
          mechanicStep.decision.speedMultiplier *
          1.25;
        break;
      case "hold":
        boss.velocityX *= 0.72;
        break;
    }
  }

  boss.x = clamp(
    boss.x + boss.velocityX * delta,
    boss.patrolLeft,
    boss.patrolRight,
  );
  emitEnemyFootprint(state, boss);
  if (
    mission.id === "ice-cryostalker" &&
    Math.abs(boss.velocityX) > 500
  ) {
    const pillar = state.world.covers.find(
      (cover) =>
        (cover.id.startsWith("i-pillar-") ||
          cover.id === "feature-i-nest-pillar") &&
        !state.brokenPillarIds.has(cover.id) &&
        overlaps(boss, cover),
    );
    if (pillar) {
      state.brokenPillarIds.add(pillar.id);
      state.bossHitPillar = true;
      boss.velocityX *= -0.18;
      if (state.screenShakeEnabled) state.screenShake = 16;
    }
  }
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

function restoreProjectileAmmo(
  state: GameState,
  projectile: ProjectileState,
  message: string,
): void {
  if (
    projectile.weaponSlotIndex === undefined ||
    projectile.maximumAmmo === undefined
  ) {
    return;
  }
  const slotIndex = projectile.weaponSlotIndex;
  const previousAmmo = state.player.weaponAmmo[slotIndex];
  state.player.weaponAmmo[slotIndex] = Math.min(
    projectile.maximumAmmo,
    previousAmmo + 1,
  );
  if (state.player.weaponAmmo[slotIndex] > previousAmmo) {
    queueSound(state, "weapon-switch");
    announce(state, message, 1.2);
  }
}

function settleRecoverableProjectile(
  state: GameState,
  projectile: ProjectileState,
): void {
  projectile.x = clamp(
    projectile.x,
    projectile.radius + 12,
    state.world.width - projectile.radius - 12,
  );
  projectile.y = state.world.floorY - projectile.radius;
  projectile.velocityX = 0;
  projectile.velocityY = 0;
  projectile.damage = 0;
  projectile.life = 120;
  projectile.coverGraceSeconds = 0;
  projectile.spentPickup = true;
}

function updateProjectiles(
  state: GameState,
  mission: MissionDefinition,
  delta: number,
): void {
  const next: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    if (projectile.spentPickup) {
      const pickupBox = {
        x: projectile.x - projectile.radius - 5,
        y: projectile.y - projectile.radius - 5,
        width: projectile.radius * 2 + 10,
        height: projectile.radius * 2 + 10,
      };
      if (overlaps(pickupBox, state.player)) {
        const recoveryMessage =
          projectile.weaponId === "yautja-bow"
            ? "Flèche Yautja récupérée."
            : "Combistick récupéré.";
        restoreProjectileAmmo(
          state,
          projectile,
          recoveryMessage,
        );
      } else {
        next.push(projectile);
      }
      continue;
    }

    const movementStart = { x: projectile.x, y: projectile.y };
    if (
      projectile.weaponId === "smart-disc" &&
      projectile.recovery === "return"
    ) {
      const hunterPosition = {
        x: state.player.x + state.player.width / 2,
        y: state.player.y + state.player.height * 0.45,
      };
      const flight = stepSmartDiscFlight(
        {
          x: projectile.x,
          y: projectile.y,
          velocityX: projectile.velocityX,
          velocityY: projectile.velocityY,
          outboundSeconds: projectile.outboundSeconds ?? 0,
          returning: projectile.returning ?? false,
        },
        {
          deltaSeconds: delta,
          hunterPosition,
          speedPxPerSecond:
            projectile.flightSpeed ??
            Math.hypot(projectile.velocityX, projectile.velocityY),
          catchRadius: state.player.width * 0.42,
        },
      );
      projectile.x = flight.state.x;
      projectile.y = flight.state.y;
      projectile.velocityX = flight.state.velocityX;
      projectile.velocityY = flight.state.velocityY;
      projectile.outboundSeconds = flight.state.outboundSeconds;
      projectile.returning = flight.state.returning;
      if (flight.caught) {
        restoreProjectileAmmo(state, projectile, "Smart Disc revenu au gant.");
        continue;
      }
    } else {
      projectile.x += projectile.velocityX * delta;
      projectile.y += projectile.velocityY * delta;
    }
    projectile.life -= delta;
    projectile.coverGraceSeconds = Math.max(
      0,
      projectile.coverGraceSeconds - delta,
    );
    let consumed = false;
    let turnedAfterHit = false;
    const movementEnd = { x: projectile.x, y: projectile.y };
    const placeAtImpact = (time: number) => {
      projectile.x = movementStart.x + (movementEnd.x - movementStart.x) * time;
      projectile.y = movementStart.y + (movementEnd.y - movementStart.y) * time;
    };
    // Sweep the complete fixed step and choose the first obstacle in space,
    // not the first entry in an authored array. Thin covers remain solid.
    const coverImpact = projectile.coverGraceSeconds <= 0
      ? [...state.world.covers,
          ...(state.world.platforms ?? []).filter(platform => platform.collision === "solid")
            .map(platform => ({ ...platform, protection: 1, destructible: false }))]
          .filter(cover => !state.brokenPillarIds.has(cover.id))
          .map(cover => ({ cover, time: sweptProjectileImpactTime(movementStart, movementEnd, projectile.radius, cover) }))
          .filter((hit): hit is { cover: typeof hit.cover; time: number } => hit.time !== null)
          .sort((a, b) => a.time - b.time)[0]
      : undefined;
    const blockingCover = coverImpact?.cover;
    const firstCoverTime = coverImpact?.time ?? Infinity;
    if (!consumed && projectile.hostile) {
      const playerImpact = sweptProjectileImpactTime(movementStart, movementEnd, projectile.radius, state.player);
      if (playerImpact !== null && playerImpact < firstCoverTime) {
        placeAtImpact(playerImpact);
        hurtPlayer(state, projectile.damage, mission);
        consumed = true;
      }
    } else if (!consumed) {
      const targets = [
        ...state.enemies.filter((enemy) => enemy.alive && enemy.active),
        ...(state.boss.active && state.boss.alive ? [state.boss] : []),
      ];
      const targetImpacts = targets
        .filter(enemy => !projectile.hitEnemyIds?.includes(enemy.id))
        .map(enemy => ({ enemy, time: sweptProjectileImpactTime(movementStart, movementEnd, projectile.radius, enemy) }))
        .filter((hit): hit is { enemy: EnemyState; time: number } => hit.time !== null && hit.time < firstCoverTime)
        .sort((a, b) => a.time - b.time);
      for (const { enemy, time } of targetImpacts) {
        if (enemy.alive) {
          placeAtImpact(time);
          if (projectile.weaponId === "plasma-caster") {
            recordPlasmaRestraintViolation(state, mission, enemy);
          }
          damageEnemy(state, mission, enemy, projectile.damage, "weapon");
          projectile.hitEnemyIds = [
            ...(projectile.hitEnemyIds ?? []),
            enemy.id,
          ];
          if (
            projectile.weaponId === "plasma-caster" &&
            (projectile.splashRadius ?? 0) > 0
          ) {
            const impact = { x: projectile.x, y: projectile.y };
            const activeCovers = state.world.covers.filter(
              (cover) => !state.brokenPillarIds.has(cover.id),
            );
            for (const nearby of targets) {
              if (nearby.id === enemy.id || !nearby.alive) continue;
              const nearbyCenter = {
                x: nearby.x + nearby.width / 2,
                y: nearby.y + nearby.height / 2,
              };
              if (
                distance(impact, nearbyCenter) <=
                (projectile.splashRadius ?? 0)
              ) {
                const splashOcclusion = calculateLineOfSightOcclusion(
                  impact,
                  nearbyCenter,
                  activeCovers,
                );
                const splashDamage = resolveHunterSplashDamage(
                  projectile.damage,
                  splashOcclusion,
                );
                if (splashDamage <= projectile.damage * 0.025) continue;
                recordPlasmaRestraintViolation(state, mission, nearby);
                damageEnemy(
                  state,
                  mission,
                  nearby,
                  splashDamage,
                  "weapon",
                );
              }
            }
          }
          const reachedHitLimit =
            projectile.hitEnemyIds.length >=
            (projectile.maxTargetHits ?? 1);
          if (projectile.recovery === "pickup" && reachedHitLimit) {
            settleRecoverableProjectile(state, projectile);
            next.push(projectile);
            consumed = true;
            break;
          }
          if (projectile.recovery === "return") {
            if (reachedHitLimit) {
              projectile.returning = true;
              projectile.outboundSeconds = 0;
              turnedAfterHit = true;
              break;
            }
            continue;
          }
          if (reachedHitLimit) {
            consumed = true;
            break;
          }
        }
      }
    }
    if (consumed) continue;
    if (!turnedAfterHit) {
      projectile.x = movementEnd.x;
      projectile.y = movementEnd.y;
    }
    if (blockingCover && !turnedAfterHit) {
      placeAtImpact(coverImpact!.time);
      const breakThreshold = 18 + blockingCover.protection * 34;
      if (
        blockingCover.destructible &&
        projectile.damage >= breakThreshold
      ) {
        state.brokenPillarIds.add(blockingCover.id);
        if (state.screenShakeEnabled) state.screenShake = 7;
      }
      if (projectile.recovery === "pickup") {
        settleRecoverableProjectile(state, projectile);
        next.push(projectile);
        continue;
      }
      if (projectile.recovery === "return") {
        if (projectile.returning) {
          restoreProjectileAmmo(
            state,
            projectile,
            "Smart Disc rappelé après trajectoire bloquée.",
          );
          continue;
        }
        projectile.returning = true;
        projectile.outboundSeconds = 0;
        projectile.coverGraceSeconds = 0.18;
        next.push(projectile);
        continue;
      } else {
        consumed = true;
      }
    }

    if (consumed) continue;

    const withinWorld =
      projectile.x > -50 &&
      projectile.x < state.world.width + 50 &&
      projectile.y > -100 &&
      projectile.y < VIEW_HEIGHT + 100;
    if (projectile.life <= 0 || !withinWorld) {
      if (projectile.recovery === "pickup") {
        settleRecoverableProjectile(state, projectile);
        next.push(projectile);
      } else if (projectile.recovery === "return") {
        if (projectile.returning) {
          restoreProjectileAmmo(
            state,
            projectile,
            "Smart Disc rappelé par sécurité.",
          );
        } else {
          projectile.returning = true;
          projectile.outboundSeconds = 0;
          projectile.life = 2.5;
          next.push(projectile);
        }
      }
      continue;
    }
    if (
      !consumed &&
      projectile.life > 0 &&
      withinWorld
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

function pollGamepad(input: InputHub): "focus-lost" | "gamepad-disconnected" | null {
  const previousDirections = new Set(input.gamepadHeld);
  input.gamepadHeld.clear();
  if (typeof document !== "undefined" && (document.hidden || !document.hasFocus())) {
    input.previousGamepadButtons = [];
    input.gamepadNeedsNeutral = true;
    return "focus-lost";
  }
  let pads: (Gamepad | null)[] = [];
  try {
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      pads = Array.from(navigator.getGamepads());
    }
  } catch {
    // A browser policy can deny the API; keyboard and touch must remain usable.
  }
  const previousIndex = input.activeGamepadIndex;
  const existing = previousIndex === null ? null : pads.find(pad => pad?.connected && pad.index === previousIndex);
  const gamepad = existing ?? pads.find(pad => pad?.connected) ?? null;
  const disconnected = previousIndex !== null && !existing;
  if (!gamepad) {
    input.activeGamepadIndex = null;
    input.previousGamepadButtons = [];
    input.gamepadNeedsNeutral = true;
    return disconnected ? "gamepad-disconnected" : null;
  }
  if (gamepad.index !== previousIndex) {
    input.activeGamepadIndex = gamepad.index;
    input.previousGamepadButtons = [];
    input.gamepadNeedsNeutral = true;
  }

  const left = gamepad.axes[0] < -0.25 || Boolean(gamepad.buttons[14]?.pressed);
  const right = gamepad.axes[0] > 0.25 || Boolean(gamepad.buttons[15]?.pressed);
  const up = gamepad.axes[1] < -0.3 || Boolean(gamepad.buttons[12]?.pressed);
  const down = gamepad.axes[1] > 0.3 || Boolean(gamepad.buttons[13]?.pressed);
  const aiming = (gamepad.buttons[6]?.value ?? 0) > 0.25;
  const current = gamepad.buttons.map(button => button.pressed);
  // A held button on reconnect/focus/retry must not become a fresh attack.
  if (input.gamepadNeedsNeutral) {
    input.previousGamepadButtons = current;
    if (!left && !right && !up && !down && !aiming && !current.some(Boolean)) {
      input.gamepadNeedsNeutral = false;
    }
    return disconnected ? "gamepad-disconnected" : null;
  }
  const setDirection = (action: Action, held: boolean) => {
    if (!held) return;
    input.gamepadHeld.add(action);
    if ((action === "left" || action === "right") && !previousDirections.has(action)) {
      input.pressed.add(action);
    }
  };
  setDirection("left", left);
  setDirection("right", right);
  setDirection("up", up);
  setDirection("down", down);
  if (aiming) input.gamepadHeld.add("aim");
  if (current[0]) input.gamepadHeld.add("jump");

  if (input.gamepadDialogActions.length < 4) {
    if (up && !previousDirections.has("up")) input.gamepadDialogActions.push("previous");
    if (down && !previousDirections.has("down")) input.gamepadDialogActions.push("next");
    if (current[0] && !input.previousGamepadButtons[0]) input.gamepadDialogActions.push("activate");
  }
  const actionButtons: ReadonlyArray<readonly [number, Action]> = [
    [0, "jump"], [2, "melee"], [7, "weapon"], [4, "scan"],
    [3, "cloak"], [5, "heal"], [1, "interact"], [8, "weaponNext"],
    [10, "gearOne"], [11, "gearTwo"], [9, "pause"],
  ];
  for (const [index, action] of actionButtons) {
    if (current[index] && !input.previousGamepadButtons[index]) input.pressed.add(action);
  }
  input.previousGamepadButtons = current;
  return disconnected ? "gamepad-disconnected" : null;
}

function navigateHuntDialogWithGamepad(
  dialog: HTMLElement | null,
  actions: readonly HuntDialogGamepadAction[],
): void {
  if (!dialog || actions.length === 0) return;
  const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  if (buttons.length === 0) return;
  let index = Math.max(0, buttons.indexOf(dialog.ownerDocument.activeElement as HTMLButtonElement));
  for (const action of actions) {
    if (action === "activate") {
      buttons[index].click();
      return; // The click may replace or close this dialog.
    }
    index = (index + (action === "next" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  }
}

function stepGame(
  state: GameState,
  mission: MissionDefinition,
  loadout: Loadout,
  inventory: PlayerInventory,
  appearance: HunterAppearance,
  difficulty: DifficultyId,
  input: InputHub,
  delta: number,
  finish: (result: MissionResult) => void,
): void {
  const wasPaused = state.paused;
  const interruption = pollGamepad(input);
  if (state.phase === "dead" || state.phase === "finished") {
    input.pressed.clear();
    return;
  }
  if (interruption) {
    state.paused = true;
    state.jumpAssist = freshJumpAssistState({ requireRelease: true });
    input.pressed.clear();
    if (!wasPaused) announce(state, interruption === "gamepad-disconnected"
      ? "Manette déconnectée — chasse en pause."
      : "Chasse en pause après perte de focus.", 3);
    return;
  }
  if (consume(input, "pause")) {
    state.paused = !state.paused;
    announce(state, state.paused ? "Chasse en pause." : "Chasse reprise.", 1.3);
  }
  if (state.paused) {
    state.jumpAssist = freshJumpAssistState({ requireRelease: true });
    input.pressed.clear();
    return;
  }
  if (wasPaused) {
    state.jumpAssist = freshJumpAssistState({ requireRelease: true });
    input.pressed.clear();
  }

  state.elapsed += delta;
  state.messageTimer = Math.max(0, state.messageTimer - delta);
  state.scanPulse = Math.max(0, state.scanPulse - delta);
  state.screenShake = Math.max(0, state.screenShake - delta * 30);
  state.arsenal = tickArsenalRuntime(state.arsenal, delta);
  updateRevealEffects(state);

  updatePlayer(
    state,
    mission,
    loadout,
    inventory,
    appearance,
    difficulty,
    input,
    delta,
    finish,
  );
  if (state.paused) return;
  updateHuntTraps(state, delta);
  updateHuntSignals(state, mission, delta);
  if (state.player.health <= 0) return;
  for (const enemy of state.enemies) {
    updateRegularEnemy(state, enemy, mission, delta);
  }
  updateBoss(state, mission, difficulty, delta);
  state.playerUsedRangedWeapon = false;
  state.playerUsedEnergyWeapon = false;
  updateProjectiles(state, mission, delta);
  updateGoreParticles(state, delta);
  updateObjectiveFlow(state, mission, difficulty);

  const currentWorldScreen = getWorldScreenAtX(
    mission.id,
    state.player.x + state.player.width / 2,
  );
  if (currentWorldScreen.id !== state.worldScreenId) {
    state.worldScreenId = currentWorldScreen.id;
    state.visitedScreenIds = discoverWorldScreen(
      mission.id, state.visitedScreenIds, state.player.x + state.player.width / 2,
    );
    announce(
      state,
      `${currentWorldScreen.label} — ${currentWorldScreen.objectiveCue}`,
      4.2,
    );
  }

  // Include a sector discovered on this frame in the same checkpoint.
  if (isExplorationMission(mission.id)) {
    state.exploration = discoverExplorationRooms(mission.id, state.exploration, state.player);
  }
  updateMissionCheckpoint(state);
  const desiredCamera = clamp(
    state.player.x - VIEW_WIDTH * 0.38,
    0,
    state.world.width - VIEW_WIDTH,
  );
  state.cameraX +=
    (desiredCamera - state.cameraX) * Math.min(1, delta * 6);
}

// ---------------------------------------------------------------------------
// React shell, semantic HUD and lifecycle
// ---------------------------------------------------------------------------

export default function HuntCanvas({
  mission,
  encounterRun,
  loadout,
  inventory,
  difficulty,
  controlBindings,
  appearance,
  reducedGore,
  screenShake,
  highContrastVision,
  onSound,
  explorationProgress,
  onExplorationProgress,
  onFinish,
  onAbort,
  resumeSnapshot,
  resumeRetryCheckpoint,
  onPersistHunt,
  onSuspendHunt,
  onInvalidateHunt,
  onResumeFailure,
}: HuntCanvasProps) {
  const activeBindings = controlBindings ?? DEFAULT_CONTROL_BINDINGS;
  const huntRootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const huntDialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const finishRef = useRef(onFinish);
  const abortRef = useRef(onAbort);
  const explorationProgressRef = useRef(onExplorationProgress);
  const persistHuntRef = useRef(onPersistHunt);
  const suspendHuntRef = useRef(onSuspendHunt);
  const invalidateHuntRef = useRef(onInvalidateHunt);
  const resumeFailureRef = useRef(onResumeFailure);
  const soundRef = useRef(onSound);
  const restartRef = useRef<() => void>(() => undefined);
  const togglePauseRef = useRef<() => void>(() => undefined);
  const reportFailureRef = useRef<() => void>(() => undefined);
  const requestAbortRef = useRef<() => void>(() => undefined);
  const requestSuspendRef = useRef<() => void>(() => undefined);
  const inputRef = useRef<InputHub>({
    keyboardHeld: new Set(),
    touchHeld: new Set(),
    gamepadHeld: new Set(),
    pressed: new Set(),
    previousGamepadButtons: [],
    activeGamepadIndex: null,
    gamepadNeedsNeutral: true,
    gamepadDialogActions: [],
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
    explorationProgressRef.current = onExplorationProgress;
  }, [onExplorationProgress]);

  useEffect(() => {
    persistHuntRef.current = onPersistHunt;
  }, [onPersistHunt]);

  useEffect(() => {
    suspendHuntRef.current = onSuspendHunt;
  }, [onSuspendHunt]);

  useEffect(() => {
    invalidateHuntRef.current = onInvalidateHunt;
  }, [onInvalidateHunt]);

  useEffect(() => {
    resumeFailureRef.current = onResumeFailure;
  }, [onResumeFailure]);

  useEffect(() => {
    soundRef.current = onSound;
  }, [onSound]);

  const huntDialogOpen =
    (ui.paused && ui.phase !== "dead" && ui.phase !== "finished") ||
    ui.phase === "dead";

  useEffect(() => {
    if (!huntDialogOpen) return;
    const dialog = huntDialogRef.current;
    const root = huntRootRef.current;
    if (!dialog || !root) return;
    const fallbackFocusTarget = canvasRef.current;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusableSelector =
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const backdrop = dialog.closest<HTMLElement>("[data-hunt-dialog-backdrop]");
    const inertTargets = [
      ...Array.from(root.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && !child.contains(backdrop),
      ),
      ...(backdrop?.parentElement
        ? Array.from(backdrop.parentElement.children).filter(
            (child): child is HTMLElement =>
              child instanceof HTMLElement && child !== backdrop,
          )
        : []),
    ];
    const newlyInert = inertTargets.filter(
      (target) => !target.hasAttribute("inert"),
    );
    newlyInert.forEach((target) => target.setAttribute("inert", ""));

    const frame = window.requestAnimationFrame(() => {
      focusables()[0]?.focus({ preventScroll: true });
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusables();
      if (controls.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trapFocus);
      newlyInert.forEach((target) => target.removeAttribute("inert"));
      const previous = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previous?.isConnected) {
        previous.focus({ preventScroll: true });
      } else {
        fallbackFocusTarget?.focus({ preventScroll: true });
      }
    };
  }, [huntDialogOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let alive = true;
    let assetsLoaded = false;
    let frameId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let lastUiPush = 0;
    let deviceScale = clamp(window.devicePixelRatio || 1, 1, 2);
    const ecologyRunSeed = encounterRun;
    let game = makeGameState(
      mission,
      loadout,
      inventory,
      difficulty,
      appearance,
      reducedGore,
      screenShake,
      ecologyRunSeed,
      explorationProgress,
    );
    const restoredHunt = deserializeActiveHuntCheckpoint(resumeSnapshot);
    const restoredRetry = deserializeActiveHuntCheckpoint(
      resumeRetryCheckpoint,
    );
    const invalidResume =
      (resumeSnapshot != null && !restoredHunt) ||
      (resumeRetryCheckpoint != null && !restoredRetry);
    if (restoredHunt && !invalidResume) {
      game = restoreCheckpoint(game, restoredHunt.checkpoint, "resume");
      game.nextCheckpointIndex = Math.min(
        restoredHunt.nextCheckpointIndex,
        game.checkpointPositions.length,
      );
      game.lastCheckpoint = restoredRetry?.checkpoint ?? null;
    } else if (invalidResume) {
      game.paused = true;
      window.queueMicrotask(() => resumeFailureRef.current?.());
    }
    let lastExplorationKey = JSON.stringify(normalizeExplorationProgress(explorationProgress));
    const emitExploration = () => {
      if (!isExplorationMission(mission.id)) return;
      const key = JSON.stringify(game.exploration);
      if (key === lastExplorationKey) return;
      lastExplorationKey = key;
      explorationProgressRef.current?.(normalizeExplorationProgress(game.exploration));
    };
    let lastPersistedElapsed = game.elapsed;
    let lastPersistedCheckpointIndex = game.nextCheckpointIndex;
    const assets: AssetBank = {
      background: null,
      farLake: null,
      hunterBodyFull: null,
      hunterBodyParts: Object.fromEntries(
        HUNTER_BODY_PART_IDS.map((partId) => [partId, null]),
      ) as Record<HunterBodyPartId, HTMLImageElement | null>,
      hunterNetParts: Object.fromEntries(
        HUNTER_BODY_PART_IDS.map((partId) => [partId, null]),
      ) as Record<HunterBodyPartId, HTMLImageElement | null>,
      hunterDreads: null,
      hunterMask: null,
      hunterArmor: {
        chest: null,
        shoulder: null,
        belt: null,
        bracer: null,
        thigh: null,
        knee: null,
        thighLower: null,
        shin: null,
      },
      hunterPlasma: {
        mount: null,
        upperArm: null,
        lowerArm: null,
        yoke: null,
        cannon: null,
        barrel: null,
        muzzle: null,
        laser: null,
      },
      hunterGauntlet: {
        base: null,
        lid: null,
      },
      hunterWristblades: {
        housing: null,
        blades: null,
      },
      hunterWeapons: Object.fromEntries(
        HUNTER_WEAPON_VISUAL_IDS.map((weaponId) => [weaponId, null]),
      ) as Record<HunterWeaponVisualId, HTMLImageElement | null>,
      hunterGear: {
        netgun: null,
        "motion-sensor": null,
        "audio-decoy": null,
        snare: null,
      },
      hunterTrophies: Object.fromEntries(
        HUNTER_TROPHY_VISUAL_IDS.map((trophyId) => [trophyId, null]),
      ) as Record<HunterTrophyVisualId, HTMLImageElement | null>,
      treeTrunk: null,
      vineLadder: null,
      platformRoot: null,
      platformStone: null,
      pilotModule: null,
      iceRegionTextures: { ice: null, metal: null, relay: null },
      platformCrown: null,
      platformExpedition: null,
      foregroundFerns: null,
      foregroundVines: null,
      foregroundReeds: null,
      enemyV4: Object.fromEntries(
        ENEMY_V4_SPRITE_IDS.map((spriteId) => [spriteId, null]),
      ) as Record<EnemyV4SpriteId, HTMLImageElement | null>,
      enemyV7: {},
      enemyV8: {},
      enemyTrophies: {},
      campaignTrophies: {},
      mercenary: null,
      cryostalker: null,
      badBlood: null,
      shipsAtlas: null,
      preyAtlas: null,
      masksTrophiesAtlas: null,
      ranksLasersAtlas: null,
      environmentProps: {},
    };
    const input = inputRef.current;
    input.keyboardHeld.clear();
    input.touchHeld.clear();
    input.gamepadHeld.clear();
    input.pressed.clear();
    input.previousGamepadButtons = [];
    input.activeGamepadIndex = null;
    input.gamepadNeedsNeutral = true;
    input.gamepadDialogActions = [];
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

    const loadTasks: Promise<void>[] = [];
    const queueImage = (
      path: string,
      assign: (image: HTMLImageElement | null) => void,
    ) => {
      loadTasks.push(
        loadImage(path).then((image) => {
          if (alive) assign(image);
        }),
      );
    };
    const environmentPropLoads = new Map<string, Promise<void>>();
    const worldScreenLayout = worldScreensFor(mission.id);
    let lastEnvironmentPreloadScreenId = "";
    const preloadEnvironmentAroundScreen = (screenId: string) => {
      if (lastEnvironmentPreloadScreenId === screenId) return;
      lastEnvironmentPreloadScreenId = screenId;
      const activeIndex = worldScreenLayout.screens.findIndex(
        (screen) => screen.id === screenId,
      );
      if (activeIndex < 0) return;
      const sectors = worldScreenLayout.screens.slice(
        Math.max(0, activeIndex - 1),
        Math.min(worldScreenLayout.screens.length, activeIndex + 2),
      );
      for (const sector of sectors) {
        for (const url of environmentPropRuntimeUrlsForSector(
          mission.id,
          sector.id,
          encounterRun,
        )) {
          if (
            Object.hasOwn(assets.environmentProps, url) ||
            environmentPropLoads.has(url)
          ) {
            continue;
          }
          const pending = loadImage(url).then((image) => {
            if (alive) assets.environmentProps[url] = image;
          });
          environmentPropLoads.set(url, pending);
        }
      }
    };
    preloadEnvironmentAroundScreen(game.worldScreenId);

    // Reuse the exact available V15 cutout for extraction and hand carry.
    const campaignTrophyVisual = trophyHuntVisualForDefinitionId(mission.trophy.id);
    if (campaignTrophyVisual) {
      queueImage(campaignTrophyVisual.runtimeUrl, (image) => {
        assets.campaignTrophies[campaignTrophyVisual.definitionId] = image;
      });
    }

    queueImage(backgroundPath(mission), (image) => {
      assets.background = image;
    });
    queueImage(
      "/game/assets/v2/environments/jungle/layers/far-lake.webp",
      (image) => {
        assets.farLake = image;
      },
    );

    queueImage(hunterBodyFullPath(appearance.bodyMorphId), (image) => {
      assets.hunterBodyFull = image;
    });
    for (const partId of HUNTER_BODY_PART_IDS) {
      queueImage(
        hunterBodyPartPath(appearance.bodyMorphId, partId),
        (image) => {
          assets.hunterBodyParts[partId] = image;
        },
      );
      if (hunterBodyPartHasNet(appearance.bodyMorphId, partId)) {
        queueImage(
          hunterNetPartPath(appearance.bodyMorphId, partId),
          (image) => {
            assets.hunterNetParts[partId] = image;
          },
        );
      }
    }
    queueImage(hunterDreadPath(appearance.dreadStyleId), (image) => {
      assets.hunterDreads = image;
    });
    if (appearance.biomaskId) {
      queueImage(hunterMaskRigPath(appearance.biomaskId), (image) => {
        assets.hunterMask = image;
      });
    }

    const armorModules = HUNTER_ARMOR_MODULES[appearance.armorStyleId];
    const armorPaths: Record<HunterArmorAssetId, string> = {
      chest: hunterArmorPath(armorModules.chest),
      shoulder: hunterArmorPath(armorModules.shoulder),
      belt: hunterArmorPath("belt"),
      bracer: hunterArmorPath("bracer"),
      thigh: hunterArmorPath("thigh"),
      knee: hunterArmorPath("knee"),
      thighLower: hunterArmorPath("thigh-lower"),
      shin: hunterArmorPath("shin"),
    };
    for (const [moduleId, path] of Object.entries(armorPaths) as Array<
      [HunterArmorAssetId, string]
    >) {
      queueImage(path, (image) => {
        assets.hunterArmor[moduleId] = image;
      });
    }

    for (const [moduleId, path] of Object.entries(
      HUNTER_EQUIPMENT_V3.plasma,
    ) as Array<[HunterPlasmaAssetId, string]>) {
      queueImage(path, (image) => {
        assets.hunterPlasma[moduleId] = image;
      });
    }
    for (const [moduleId, path] of Object.entries(
      HUNTER_EQUIPMENT_V3.gauntlet,
    ) as Array<[HunterGauntletAssetId, string]>) {
      queueImage(path, (image) => {
        assets.hunterGauntlet[moduleId] = image;
      });
    }
    for (const [moduleId, path] of Object.entries(
      HUNTER_EQUIPMENT_V3.wristblades,
    ) as Array<[HunterWristbladeAssetId, string]>) {
      queueImage(path, (image) => {
        assets.hunterWristblades[moduleId] = image;
      });
    }

    for (const slotIndex of [0, 1] as const) {
      const handWeaponId = selectedHandWeapon(loadout, slotIndex);
      if (!handWeaponId) continue;
      queueImage(
        hunterRegisteredAssetPath("weapons", handWeaponId),
        (image) => {
          assets.hunterWeapons[handWeaponId] = image;
        },
      );
      if (handWeaponId === "combistick") {
        queueImage(
          hunterRegisteredAssetPath("weapons", "combistick-folded"),
          (image) => {
            assets.hunterWeapons["combistick-folded"] = image;
          },
        );
      }
      if (handWeaponId === "yautja-bow") {
        queueImage(
          hunterRegisteredAssetPath("weapons", "arrow"),
          (image) => {
            assets.hunterWeapons.arrow = image;
          },
        );
      }
    }
    if (mission.id === ICE_MISSION_ID) {
      for (const key of ["ice", "metal", "relay"] as const) {
        queueImage(ICE_REGION_TEXTURE_PATHS[key], image => { assets.iceRegionTextures[key] = image; });
      }
    }
    if (mission.id === PILOT_MISSION_ID) {
      queueImage("/game/assets/v3/actors/yautja/hunter/gear/motion-sensor.webp", image => { assets.pilotModule = image; });
    }
    for (const gearId of loadout.gearIds) {
      queueImage(
        hunterRegisteredAssetPath("gear", gearId),
        (image) => {
          assets.hunterGear[gearId] = image;
        },
      );
    }
    for (const trophyId of HUNTER_TROPHY_VISUAL_IDS) {
      queueImage(
        hunterRegisteredAssetPath("trophies", trophyId),
        (image) => {
          assets.hunterTrophies[trophyId] = image;
        },
      );
    }
    const environmentAssets: Array<
      [string, (image: HTMLImageElement | null) => void]
    > = [
      [
        "/game/props/v4/tree-trunk.png",
        (image) => {
          assets.treeTrunk = image;
        },
      ],
      [
        "/game/assets/v2/environments/jungle/climbables/vine-ladder.webp",
        (image) => {
          assets.vineLadder = image;
        },
      ],
      [
        "/game/props/v4/root-platform.png",
        (image) => {
          assets.platformRoot = image;
        },
      ],
      [
        "/game/props/v4/ruin-platform.png",
        (image) => {
          assets.platformStone = image;
        },
      ],
      [
        "/game/props/v4/crown-platform.png",
        (image) => {
          assets.platformCrown = image;
        },
      ],
      [
        "/game/props/v4/expedition-platform.png",
        (image) => {
          assets.platformExpedition = image;
        },
      ],
      [
        "/game/props/v4/foreground-ferns.png",
        (image) => {
          assets.foregroundFerns = image;
        },
      ],
      [
        "/game/sprites/mercenary.webp",
        (image) => {
          assets.mercenary = image;
        },
      ],
      [
        "/game/sprites/cryostalker.webp",
        (image) => {
          assets.cryostalker = image;
        },
      ],
      [
        "/game/sprites/bad-blood.webp",
        (image) => {
          assets.badBlood = image;
        },
      ],
      [
        "/game/sprites/v6/ships-atlas.png",
        (image) => {
          assets.shipsAtlas = image;
        },
      ],
      [
        "/game/sprites/v6/prey-atlas.png",
        (image) => {
          assets.preyAtlas = image;
        },
      ],
      [
        "/game/sprites/v6/masks-trophies-atlas.png",
        (image) => {
          assets.masksTrophiesAtlas = image;
        },
      ],
      [
        "/game/sprites/v6/ranks-lasers-atlas.png",
        (image) => {
          assets.ranksLasersAtlas = image;
        },
      ],
    ];
    for (const [path, assign] of environmentAssets) {
      queueImage(path, assign);
    }
    for (const spriteId of ENEMY_V4_SPRITE_IDS) {
      queueImage(`/game/sprites/v4/${spriteId}.png`, (image) => {
        assets.enemyV4[spriteId] = image;
      });
    }
    const queuedEnemyTrophyIds = new Set<string>();
    const queueEnemyTrophy = (enemyId: string) => {
      const trophy = enemyTrophyGameplayForEnemyId(enemyId);
      if (!trophy || queuedEnemyTrophyIds.has(trophy.id)) return;
      queuedEnemyTrophyIds.add(trophy.id);
      queueImage(trophy.runtimeUrl, (image) => {
        assets.enemyTrophies[trophy.id] = image;
      });
    };
    if (game.ecologyDeck.length === 0) {
      for (const enemyId of enemyV7IdsForMission(mission.id)) {
        queueImage(ENEMY_V7_BY_ID[enemyId].sheetPath, (image) => {
          assets.enemyV7[enemyId] = image;
        });
        queueEnemyTrophy(enemyId);
      }
    }
    const plannedRegularSpawns = mission.enemyWaves.reduce(
      (total, wave) => total + wave.count,
      0,
    );
    const ecologyAssetIds = new Set(
      game.ecologyDeck
        .slice(0, plannedRegularSpawns)
        .map((enemy) => enemy.id),
    );
    const v8BossAssetId = ECOLOGY_V8_BOSS_ENEMY_IDS[mission.id];
    if (v8BossAssetId) ecologyAssetIds.add(v8BossAssetId);
    for (const enemyId of ecologyAssetIds) {
      const enemy = ecologyV8EnemyForId(enemyId);
      if (!enemy) continue;
      queueImage(enemy.sheetPath, (image) => {
        assets.enemyV8[enemy.id] = image;
      });
      queueEnemyTrophy(enemy.id);
    }
    Promise.all(loadTasks).then(() => {
      if (alive) {
        assetsLoaded = true;
        lastTime = performance.now();
        accumulator = 0;
        setAssetsReady(true);
      }
    });

    const restart = () => {
      const visitedBeforeRetry = game.visitedScreenIds;
      const explorationBeforeRetry = game.exploration;
      game = game.lastCheckpoint
        ? restoreCheckpoint(game, game.lastCheckpoint)
        : makeGameState(
            mission,
            loadout,
            inventory,
            difficulty,
            appearance,
            reducedGore,
            screenShake,
            ecologyRunSeed,
            explorationBeforeRetry,
          );
      game.jumpAssist = freshJumpAssistState({ requireRelease: true });
      game.visitedScreenIds = discoverWorldScreen(
        mission.id,
        [...visitedBeforeRetry, ...game.visitedScreenIds],
        game.player.x + game.player.width / 2,
      );
      lastTime = performance.now();
      accumulator = 0;
      input.pressed.clear();
      input.keyboardHeld.clear();
      input.touchHeld.clear();
      input.gamepadHeld.clear();
      input.previousGamepadButtons = [];
      input.gamepadNeedsNeutral = true;
      input.gamepadDialogActions = [];
      setUi(snapshot(game, mission));
      lastObservedPhase = game.phase;
      lastPersistedElapsed = game.elapsed;
      lastPersistedCheckpointIndex = game.nextCheckpointIndex;
      emitPersistence(persistHuntRef.current);
    };
    restartRef.current = restart;
    let lastObservedPaused = game.paused;
    let lastObservedPhase = game.phase;
    const emitPersistence = (
      handler: ((payload: HuntPersistencePayload) => void) | undefined,
    ) => {
      emitExploration();
      const payload = persistencePayloadFor(game);
      if (!payload) return;
      handler?.(payload);
      lastPersistedElapsed = game.elapsed;
      lastPersistedCheckpointIndex = game.nextCheckpointIndex;
    };
    if (resumeSnapshot == null && !restoredHunt) {
      emitPersistence(persistHuntRef.current);
    }
    togglePauseRef.current = () => {
      if (game.phase === "dead" || game.phase === "finished") return;
      input.pressed.clear();
      game.paused = !game.paused;
      game.jumpAssist = freshJumpAssistState({ requireRelease: true });
      lastObservedPaused = game.paused;
      setUi(snapshot(game, mission));
      emitPersistence(persistHuntRef.current);
    };
    reportFailureRef.current = () => {
      if (game.failureReported) return;
      game.failureReported = true;
      finishRef.current(resultFor(game, mission, difficulty, "failed"));
    };
    requestAbortRef.current = () => {
      input.pressed.clear();
      if (game.player.cloaked) {
        game.player.cloaked = false;
        soundRef.current?.("cloak-off");
      }
      abortRef.current(
        resultFor(game, mission, difficulty, "abandoned"),
      );
    };
    requestSuspendRef.current = () => {
      if (game.phase === "dead" || game.phase === "finished") return;
      input.pressed.clear();
      game.paused = true;
      game.jumpAssist = freshJumpAssistState({ requireRelease: true });
      lastObservedPaused = true;
      emitPersistence(suspendHuntRef.current);
    };

    const isInteractiveControl = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(
        target.closest(
          'button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"])',
        ),
      );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const modifierKey =
        event.code.startsWith("Control") ||
        event.code.startsWith("Alt") ||
        event.code.startsWith("Meta");
      if ((event.ctrlKey || event.metaKey || event.altKey) && !modifierKey) return;
      const actions = matchingControlActions(
        "hunt",
        event,
        activeBindings,
      )
        .map((actionId) => HUNT_CONTROL_ACTIONS[actionId])
        .filter((action): action is Action => action !== undefined);
      if (actions.length === 0) return;
      if (
        isInteractiveControl(event.target) &&
        (event.key === "Enter" || event.key === " ")
      ) {
        return;
      }
      if (
        isInteractiveControl(event.target) &&
        !actions.includes("pause")
      ) {
        return;
      }
      event.preventDefault();
      for (const action of actions) {
        if (isHeldKeyboardAction(action)) {
          input.keyboardHeld.add(action);
          if (
            !event.repeat &&
            (action === "left" || action === "right" || action === "jump")
          ) {
            input.pressed.add(action);
          }
        } else if (!event.repeat) {
          input.pressed.add(action);
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const actions = matchingControlActions(
        "hunt",
        event,
        activeBindings,
      )
        .map((actionId) => HUNT_CONTROL_ACTIONS[actionId])
        .filter((action): action is Action => action !== undefined);
      for (const action of actions) {
        if (isHeldKeyboardAction(action)) {
          input.keyboardHeld.delete(action);
        }
      }
    };
    const onBlur = () => {
      game.jumpAssist = freshJumpAssistState({ requireRelease: true });
      input.gamepadDialogActions = [];
      input.previousGamepadButtons = [];
      input.gamepadNeedsNeutral = true;
      input.keyboardHeld.clear();
      input.gamepadHeld.clear();
      input.touchHeld.clear();
      input.pressed.clear();
      if (
        game.phase !== "dead" &&
        game.phase !== "finished" &&
        !game.paused
      ) {
        game.paused = true;
        lastObservedPaused = true;
        setUi(snapshot(game, mission));
      }
      emitPersistence(persistHuntRef.current);
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    const onGamepadDisconnected = (event: GamepadEvent) => {
      if (event.gamepad.index !== input.activeGamepadIndex) return;
      input.activeGamepadIndex = null;
      announce(game, "Manette déconnectée — chasse en pause.", 3);
      onBlur();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onBlur);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    document.addEventListener("visibilitychange", onVisibility);

    const fixedStep = 1 / 60;
    const frame = (time: number) => {
      if (!alive) return;
      if (!assetsLoaded) {
        lastTime = time;
        frameId = requestAnimationFrame(frame);
        return;
      }
      const frameDelta = clamp((time - lastTime) / 1_000, 0, 0.05);
      lastTime = time;
      accumulator = Math.min(0.12, accumulator + frameDelta);
      while (accumulator >= fixedStep) {
        stepGame(
          game,
          mission,
          loadout,
          inventory,
          appearance,
          difficulty,
          input,
          fixedStep,
          (result) => finishRef.current(result),
        );
        for (const sound of game.soundEvents.splice(0)) {
          soundRef.current?.(sound);
        }
        accumulator -= fixedStep;
      }
      emitExploration();
      const dialogActions = input.gamepadDialogActions.splice(0);
      if (game.paused || game.phase === "dead") {
        navigateHuntDialogWithGamepad(huntDialogRef.current, dialogActions);
      }
      if (game.phase !== lastObservedPhase) {
        lastObservedPhase = game.phase;
        if (game.phase === "dead") {
          invalidateHuntRef.current?.();
        }
      }
      if (game.paused !== lastObservedPaused) {
        lastObservedPaused = game.paused;
        emitPersistence(persistHuntRef.current);
      } else if (
        game.nextCheckpointIndex !== lastPersistedCheckpointIndex ||
        game.elapsed - lastPersistedElapsed >= 15
      ) {
        emitPersistence(persistHuntRef.current);
      }
      preloadEnvironmentAroundScreen(game.worldScreenId);
      renderGame(
        context,
        game,
        mission,
        loadout,
        appearance,
        assets,
        encounterRun,
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
      window.removeEventListener("pagehide", onBlur);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
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
      requestAbortRef.current = () => undefined;
      requestSuspendRef.current = () => undefined;
    };
  }, [
    activeBindings,
    appearance,
    difficulty,
    encounterRun,
    explorationProgress,
    inventory,
    loadout,
    mission,
    reducedGore,
    resumeRetryCheckpoint,
    resumeSnapshot,
    screenShake,
  ]);

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
        if (action === "left" || action === "right" || action === "jump") {
          pressAction(action);
        }
        setTouchHeld(action, true);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setTouchHeld(action, false);
      },
      onPointerCancel: () => setTouchHeld(action, false),
      onLostPointerCapture: () => setTouchHeld(action, false),
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (event.repeat) return;
        if (action === "left" || action === "right" || action === "jump") {
          pressAction(action);
        }
        setTouchHeld(action, true);
      },
      onKeyUp: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        setTouchHeld(action, false);
      },
      onBlur: () => setTouchHeld(action, false),
    }),
    [pressAction, setTouchHeld],
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

  const weapon = equippedWeapon(loadout, ui.activeWeaponSlot);
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
      ref={huntRootRef}
      className="screen hunt-screen"
      data-screen-focus
      tabIndex={-1}
      aria-label={`Mission ${mission.title} sur ${mission.planetName}`}
      style={{
        ...styles.shell,
        "--hunt-accent": mission.palette.accent,
        "--hunt-danger": mission.palette.danger,
        "--hunt-sky": mission.palette.sky,
      } as CSSProperties}
    >
      {/* Bloc : statut de mission et ressources du biomask. */}
      <header className="hunt-top-bar" style={styles.topBar}>
        <div style={styles.identity}>
          <span style={{ ...styles.phaseTag, color: mission.palette.accent }}>
            {phaseLabel}
          </span>
          <strong style={styles.missionTitle}>{mission.title}</strong>
          <span style={styles.planet}>{mission.planetName}</span>
        </div>

        <div
          className="hunt-resource-grid"
          style={styles.resourceGrid}
          role="group"
          aria-label="État du chasseur"
        >
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
          className="hunt-pause-button"
          onClick={() => togglePauseRef.current()}
          style={styles.iconButton}
          aria-label={ui.paused ? "Reprendre la chasse" : "Mettre en pause et consulter la carte"}
        >
          {ui.paused ? "▶" : "Ⅱ"}
        </button>
      </header>

      {/* Bloc : objectif courant annoncé aux lecteurs d’écran. */}
      <div style={styles.objectiveBar}>
        <div aria-live="polite" aria-atomic="true">
          <span style={styles.objectiveKicker}>OBJECTIF ACTIF</span>
          <strong style={styles.objectiveTitle}>{ui.objective}</strong>
          <span style={styles.objectiveDetail}>{ui.objectiveDetail}</span>
          {ui.pilotHint && <span style={{ ...styles.objectiveDetail, color: "#d9f1ad" }}>
            {ui.pilotHint} · Interaction {controlActionShortcut("hunt.interact", activeBindings)}
          </span>}
        </div>
        <div style={styles.stats}>
          <span>Honneur {ui.honor >= 0 ? "+" : ""}{ui.honor}</span>
          <span>Éliminations {ui.kills}</span>
          <span>Scans {ui.scans}</span>
          <span>{ui.checkpointLabel}</span>
          <span>
            Masque{" "}
            {!appearance.biomaskId ? "AUCUN" : ui.maskOn ? "ACTIF" : "RETIRÉ"}
          </span>
          <span>{ui.aiming ? "VISÉE CADRÉE" : "VISÉE LIBRE"}</span>
          <span>{ui.climbing ? "GRIMPE" : ui.grounded ? "AU SOL" : "EN L’AIR"}</span>
          {ui.exploration.abilityIds.includes("aerial-boost") && <span>
            Impulsion {ui.aerialBoostUsed ? "À RECHARGER AU SOL" : "PRÊTE"} · {controlActionShortcut("hunt.jump", activeBindings)}
          </span>}
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
          className="hunt-canvas"
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
          style={{
            ...styles.canvas,
            filter: highContrastVision
              ? "contrast(1.38) saturate(1.26) brightness(1.06)"
              : undefined,
          }}
        >
          Jeu de chasse en vue latérale. Utilise {controlActionShortcut("hunt.moveLeft", activeBindings)}
          {" et "}{controlActionShortcut("hunt.moveRight", activeBindings)} pour te déplacer,
          {" "}{controlActionShortcut("hunt.jump", activeBindings)} pour sauter et
          {" "}{controlActionShortcut("hunt.melee", activeBindings)} pour les lames.
          Les directions et la visée combinées aux lames déclenchent les techniques avancées.
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
          <div style={styles.trophyTimer}>
            {ui.trophyCue ? (
              <>
                <span>
                  RITE {ui.trophyCueIndex + 1}/{ui.trophyCueCount} · ERREURS {ui.trophyMistakes}/{TROPHY_RITUAL_TIMING.maximumMistakes}
                </span>
                <strong style={styles.trophyCueLabel}>
                  {trophyCueLabel(ui.trophyCue)}
                </strong>
                <span style={styles.trophyRhythmTrack} aria-hidden="true">
                  <span
                    style={{
                      ...styles.trophyRhythmFill,
                      width: `${Math.round(ui.trophyCueTiming * 100)}%`,
                    }}
                  />
                </span>
              </>
            ) : (
              `FENÊTRE DE TROPHÉE · ${Math.ceil(ui.trophySeconds)} s`
            )}
          </div>
        ) : null}

        {ui.paused && ui.phase !== "dead" && ui.phase !== "finished" ? (
          <div style={styles.modalBackdrop} data-hunt-dialog-backdrop>
            <div
              ref={huntDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="hunt-pause-title"
              tabIndex={-1}
              style={{ ...styles.modal, width: "min(100%, 760px)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}
            >
              <span style={styles.modalKicker}>BIOMASK EN VEILLE</span>
              <h2 id="hunt-pause-title" style={styles.modalTitle}>Chasse en pause</h2>
              <p style={styles.modalCopy}>
                Les systèmes sont figés. Reprends quand tu es prêt à honorer le
                rite.
              </p>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => togglePauseRef.current()}
                  style={styles.primaryButton}
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={() => requestSuspendRef.current()}
                  style={styles.secondaryButton}
                >
                  Suspendre et sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => requestAbortRef.current()}
                  style={styles.ghostButton}
                >
                  Abandonner la chasse
                </button>
              </div>
              {mission.id === PILOT_MISSION_ID && (
                <PilotExplorationMap progress={ui.exploration} playerX={ui.playerX} playerY={ui.playerY} />
              )}
              {mission.id === ICE_MISSION_ID && (
                <IceExplorationMap progress={ui.exploration} playerX={ui.playerX} playerY={ui.playerY} />
              )}
              {isExpansionExplorationMission(mission.id) && (
                <ExpansionExplorationMap
                  missionId={mission.id}
                  progress={ui.exploration}
                  playerX={ui.playerX}
                  playerY={ui.playerY}
                />
              )}
              <ExplorationMap
                missionId={mission.id}
                playerX={ui.playerX}
                visitedScreenIds={ui.visitedScreenIds}
                objectiveLabel={ui.objective}
              />
            </div>
          </div>
        ) : null}

        {ui.phase === "dead" ? (
          <div style={styles.modalBackdrop} data-hunt-dialog-backdrop>
            <div
              ref={huntDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="hunt-dead-title"
              tabIndex={-1}
              style={styles.modal}
            >
              <span style={{ ...styles.modalKicker, color: mission.palette.danger }}>
                SIGNAL VITAL PERDU
              </span>
              <h2 id="hunt-dead-title" style={styles.modalTitle}>Le rite n’est pas terminé</h2>
              <p style={styles.modalCopy}>
                {ui.checkpointLabel.startsWith("Relais")
                  ? "Le dernier relais du biomask est intact. Reprends la chasse avec les objectifs, adversaires et charges enregistrés."
                  : "Reprends la chasse depuis l’insertion, ou accepte ce résultat dans les archives du clan."}
              </p>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => restartRef.current()}
                  style={styles.primaryButton}
                >
                  {ui.checkpointLabel.startsWith("Relais")
                    ? "Reprendre au relais"
                    : "Réessayer"}
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
                  onClick={() => requestAbortRef.current()}
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
        <div style={styles.moveControls} role="group" aria-label="Déplacement tactile">
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
            aria-label="Grimper — maintenir avec Lames pour projeter"
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
            aria-label="Descendre — maintenir avec Lames pour lourde ou exécution, avec Saut pour esquiver"
          >
            ⇩
          </button>
          <button
            type="button"
            {...makeHoldHandlers("jump")}
            style={styles.controlButton}
            aria-label="Sauter — maintenir pour monter plus haut"
          >
            ⤒
          </button>
        </div>

        <div style={styles.actionControls} role="group" aria-label="Actions tactiles">
          <ActionButton
            label="Lames / technique"
            shortcut={controlActionShortcut("hunt.melee", activeBindings)}
            onPress={() => pressAction("melee")}
          />
          {loadout.weaponIds.map((weaponId, index) => (
            <ActionButton
              key={`${weaponId}-${index}`}
              label={`Arme ${index + 1} · ${WEAPON_BY_ID[weaponId].shortName}`}
              shortcut={controlActionShortcut(
                index === 0
                  ? "hunt.selectWeaponOne"
                  : "hunt.selectWeaponTwo",
                activeBindings,
              )}
              active={ui.activeWeaponSlot === index}
              onPress={() =>
                pressAction(index === 0 ? "weaponOne" : "weaponTwo")
              }
            />
          ))}
          <ActionButton
            label={`${weapon.shortName}${ui.ammo >= 0 ? ` · ${ui.ammo}` : ""}`}
            shortcut={controlActionShortcut("hunt.weaponPrimary", activeBindings)}
            onPress={() => pressAction("weapon")}
          />
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
              <kbd style={styles.kbd}>
                {controlActionShortcut("hunt.aim", activeBindings)}/LT
              </kbd>
          </button>
          <ActionButton
            label={ui.maskOn ? "Retirer masque" : "Mettre masque"}
            shortcut={controlActionShortcut("hunt.toggleMask", activeBindings)}
            active={ui.maskOn}
            onPress={() => pressAction("mask")}
          />
          <ActionButton
            label="Scan"
            shortcut={controlActionShortcut("hunt.scan", activeBindings)}
            onPress={() => pressAction("scan")}
          />
          <ActionButton
            label={ui.cloaked ? "Visible" : "Camouflage"}
            shortcut={controlActionShortcut("hunt.toggleCloak", activeBindings)}
            active={ui.cloaked}
            onPress={() => pressAction("cloak")}
          />
          {ui.gearSlots.map((slot, index) => {
            const cooling = slot.cooldownRemainingSeconds > 0;
            return (
              <ActionButton
                key={`${slot.gearId}-${index}`}
                label={`${slot.name} ${slot.charges}/${slot.maxCharges}${
                  cooling
                    ? ` · ${slot.cooldownRemainingSeconds.toFixed(1)} s`
                    : ""
                }`}
                shortcut={controlActionShortcut(
                  index === 0 ? "hunt.useGearOne" : "hunt.useGearTwo",
                  activeBindings,
                )}
                disabled={slot.charges <= 0 || cooling}
                onPress={() =>
                  pressAction(index === 0 ? "gearOne" : "gearTwo")
                }
              />
            );
          })}
          <ActionButton
            label="Medicomp"
            shortcut={controlActionShortcut("hunt.heal", activeBindings)}
            onPress={() => pressAction("heal")}
          />
          <ActionButton
            label="Interagir"
            shortcut={controlActionShortcut("hunt.interact", activeBindings)}
            onPress={() => pressAction("interact")}
          />
        </div>
      </div>

      <footer style={styles.help}>
        <span>{controlActionShortcut("hunt.moveLeft", activeBindings)}/{controlActionShortcut("hunt.moveRight", activeBindings)} · déplacement</span>
        <span>{controlActionShortcut("hunt.moveUp", activeBindings)}/{controlActionShortcut("hunt.moveDown", activeBindings)} · grimpe</span>
        <span>{controlActionShortcut("hunt.jump", activeBindings)} · saut (maintenir : plus haut)</span>
        <span>{controlActionShortcut("hunt.melee", activeBindings)}/clic · lames légères ou aériennes</span>
        <span>{controlActionShortcut("hunt.moveDown", activeBindings)} + {controlActionShortcut("hunt.melee", activeBindings)} · lourde, brise-garde ou exécution contextuelle</span>
        <span>{controlActionShortcut("hunt.moveUp", activeBindings)} + {controlActionShortcut("hunt.melee", activeBindings)} · projection rapprochée</span>
        <span>{controlActionShortcut("hunt.aim", activeBindings)} + {controlActionShortcut("hunt.melee", activeBindings)} · parade</span>
        <span>{controlActionShortcut("hunt.moveDown", activeBindings)} + {controlActionShortcut("hunt.jump", activeBindings)} · esquive</span>
        <span>{controlActionShortcut("hunt.aim", activeBindings)}/clic droit/LT · viser</span>
        <span>{controlActionShortcut("hunt.selectWeaponOne", activeBindings)}/{controlActionShortcut("hunt.selectWeaponTwo", activeBindings)} · sélectionner l’arme</span>
        <span>{controlActionShortcut("hunt.weaponPrimary", activeBindings)}/RT · utiliser {weapon.name}</span>
        <span>{controlActionShortcut("hunt.toggleMask", activeBindings)} · biomask</span>
        <span>{controlActionShortcut("hunt.scan", activeBindings)} · scan</span>
        <span>{controlActionShortcut("hunt.toggleCloak", activeBindings)} · camouflage</span>
        <span>{controlActionShortcut("hunt.useGearOne", activeBindings)}/{controlActionShortcut("hunt.useGearTwo", activeBindings)} · équipements</span>
        <span>{controlActionShortcut("hunt.heal", activeBindings)} · soin ({ui.medicomps})</span>
        <span>{controlActionShortcut("hunt.interact", activeBindings)} · interaction</span>
        <span>{controlActionShortcut("hunt.pause", activeBindings)} · pause</span>
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
  disabled = false,
  onPress,
}: {
  label: string;
  shortcut: string;
  active?: boolean;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      style={{
        ...styles.actionButton,
        ...(active ? styles.actionButtonActive : null),
        ...(disabled ? styles.actionButtonDisabled : null),
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
    gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 1.5fr) auto",
    alignItems: "center",
    gap: "clamp(6px, 1.4vw, 18px)",
    padding: "clamp(8px, 1.2vw, 12px) clamp(8px, 1.2vw, 14px)",
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
    width: "min(100%, calc(177.7778svh - 298.6667px))",
    height: "auto",
    margin: "0 auto",
    aspectRatio: "16 / 9",
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
    minWidth: "min(82%, 320px)",
    display: "grid",
    gap: 4,
    padding: "8px 14px",
    border: "1px solid var(--hunt-accent)",
    borderRadius: 8,
    background: "#06100eee",
    color: "var(--hunt-accent)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textAlign: "center",
    pointerEvents: "none",
  },
  trophyCueLabel: {
    color: "#f4fff9",
    fontSize: 18,
    letterSpacing: "0.18em",
  },
  trophyRhythmTrack: {
    height: 6,
    overflow: "hidden",
    border: "1px solid #bcefdc66",
    borderRadius: 999,
    background: "#020504",
  },
  trophyRhythmFill: {
    display: "block",
    height: "100%",
    background:
      "linear-gradient(90deg, #d9664f 0 16%, #73d8a6 18% 78%, #d9664f 84%)",
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
    width: "min(100%, 580px)",
    maxHeight: "calc(100% - 16px)",
    overflowY: "auto",
    padding: "24px",
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
  actionButtonDisabled: {
    opacity: 0.48,
    cursor: "not-allowed",
    filter: "grayscale(0.45)",
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
