/**
 * Shared game contracts.
 *
 * These interfaces deliberately contain serializable values only. React owns
 * menus and persistence, while the Canvas runtime can freely copy the mission
 * definitions into its own mutable simulation state.
 */

// ---------------------------------------------------------------------------
// Stable content identifiers
// ---------------------------------------------------------------------------

export type MissionId =
  | "jungle-vey"
  | "ice-cryostalker"
  | "volcano-bad-blood"
  | "swamp-hydra"
  | "desert-sandmaw"
  | "ocean-leviathan"
  | "fungal-hivemind"
  | "ruins-ancient-guardian";

export type BiomeId =
  | "jungle"
  | "ice"
  | "volcano"
  | "swamp"
  | "desert"
  | "ocean"
  | "fungal"
  | "ruins";

export type WeaponId =
  | "wristblades"
  | "combistick"
  | "plasma-caster"
  | "smart-disc"
  | "yautja-bow";

export type GearId =
  | "netgun"
  | "motion-sensor"
  | "audio-decoy"
  | "snare";

export type ArmorId = "scout" | "hunter" | "berserker";

export type DifficultyId = "young-blood" | "hunter" | "elite" | "elder";

export type RankId = "young-blood" | "blooded" | "elite" | "elder";

export type CodexEntryId =
  | "yautja-honor"
  | "biomask"
  | "cloaking-device"
  | "osiris-jungle"
  | "commandante-vey"
  | "nivalis-ice"
  | "cryostalker"
  | "cinder-volcano"
  | "bad-blood"
  | "naraka-swamp"
  | "mire-hydra"
  | "serekh-desert"
  | "sandmaw"
  | "pelagos-ocean"
  | "abyss-leviathan"
  | "mycora-fungal"
  | "hivemind"
  | "acheron-ruins"
  | "ancient-guardian";

export type TrophyQuality = "worthy" | "blooded" | "elite" | "flawless";

export type MissionOutcome = "success" | "failed" | "abandoned";

export type MissionProgressStatus = "locked" | "available" | "completed";

export type UpgradeLevel = 0 | 1 | 2;

export type HunterSkinId =
  | "ochre-mottle"
  | "ashen-mottle"
  | "dark-mottle";

export type HunterBodyMorphId =
  | "classic"
  | "elder"
  | "super"
  | "feral"
  | "huntress"
  | "young";

export type HunterArmorStyleId =
  | "classic"
  | "city"
  | "avp"
  | "super"
  | "feral";

export type HunterPresetId =
  | "custom"
  | "jungle-hunter"
  | "city-hunter"
  | "greyback"
  | "boar"
  | "shaman"
  | "lost-borg"
  | "snake"
  | "warrior"
  | "guardian"
  | "lost-scout"
  | "lost-stalker"
  | "scar"
  | "celtic"
  | "chopper"
  | "avp-elder"
  | "ancient-warrior"
  | "temple-guard"
  | "youngblood"
  | "wolf"
  | "bull"
  | "bonegrill"
  | "classic-captive"
  | "berserker"
  | "falconer"
  | "tracker"
  | "fugitive"
  | "assassin"
  | "emissary-one"
  | "emissary-two"
  | "feral-hunter"
  | "kok-jotun"
  | "kok-oni"
  | "kok-pilot"
  | "kok-warlord"
  | "kok-captive"
  | "kok-arena-guard"
  | "dek"
  | "kwei"
  | "dek-father"
  | "scarface"
  | "stone-heart"
  | "alpha"
  | "samurai"
  | "valkyrie"
  | "cleopatra"
  | "bionic"
  | "witch"
  | "broken-tusk"
  | "ahab"
  | "big-mama"
  | "enforcer"
  | "bad-blood-comic"
  | "hashori";

export type BiomaskId =
  | "jungle"
  | "city"
  | "elder"
  | "scar"
  | "celtic"
  | "chopper"
  | "wolf"
  | "feral"
  | "berserker"
  | "fugitive"
  | "dek"
  | "enforcer";

export type DreadStyleId =
  | "classic"
  | "ringed"
  | "braided"
  | "veteran"
  | "elder"
  | "temple"
  | "feral"
  | "huntress";

export type DreadTintId = "obsidian" | "umber" | "ashen";

export type ArmorTintId = "gunmetal" | "bronze" | "obsidian";

export type LaserColorId = "crimson" | "electric" | "amber" | "violet" | "cyan";

export type TrophyAdornmentId = "none" | "skull-spine";

export type TrophyPartId =
  | "skull"
  | "skull-and-spine"
  | "mask"
  | "insignia";

export type TrophyCondition = "damaged" | "intact" | "pristine";

// ---------------------------------------------------------------------------
// Player loadout and equipment definitions
// ---------------------------------------------------------------------------

export interface Loadout {
  armorId: ArmorId;
  weaponIds: [WeaponId, WeaponId];
  gearIds: [GearId, GearId];
}

export interface HunterAppearance {
  presetId: HunterPresetId;
  bodyMorphId: HunterBodyMorphId;
  skinId: HunterSkinId;
  biomaskId: BiomaskId | null;
  dreadStyleId: DreadStyleId;
  dreadTintId: DreadTintId;
  armorStyleId: HunterArmorStyleId;
  armorTintId: ArmorTintId;
  trophyAdornmentId: TrophyAdornmentId;
  /** Optional on legacy/preset objects; persistence always supplies a value. */
  laserColorId?: LaserColorId;
}

export interface ContentUnlock {
  minimumHonor: number;
  requiredMissionId: MissionId | null;
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  shortName: string;
  description: string;
  attackType: "melee" | "ranged" | "hybrid";
  role: string;
  weight: number;
  honorPower: 1 | 2 | 3;
  damage: number;
  heavyDamage: number;
  cooldownMs: number;
  rangePx: number;
  projectileSpeedPx: number;
  staminaCost: number;
  energyCost: number;
  ammo: number | null;
  color: string;
  unlock: ContentUnlock;
  upgradeCosts: [number, number];
}

export interface GearDefinition {
  id: GearId;
  name: string;
  description: string;
  role: string;
  weight: number;
  charges: number;
  durationSeconds: number;
  rangePx: number;
  color: string;
  unlock: ContentUnlock;
  upgradeCosts: [number, number];
}

export interface ArmorDefinition {
  id: ArmorId;
  name: string;
  description: string;
  maxHealth: number;
  maxStamina: number;
  maxEnergy: number;
  moveSpeedMultiplier: number;
  energyRegenMultiplier: number;
  meleeDamageMultiplier: number;
  carryingCapacity: number;
  medicompCharges: number;
  color: string;
  unlock: ContentUnlock;
  upgradeCosts: [number, number];
}

export interface DifficultyDefinition {
  id: DifficultyId;
  name: string;
  description: string;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  detectionMultiplier: number;
  rewardMultiplier: number;
  checkpointCount: number;
  medicompModifier: number;
  unlockedByDefault: boolean;
}

// ---------------------------------------------------------------------------
// Mission content consumed by the Canvas runtime
// ---------------------------------------------------------------------------

export interface MissionReward {
  honor: number;
  clanMarks: number;
}

export interface MissionPalette {
  sky: string;
  haze: string;
  ground: string;
  platform: string;
  accent: string;
  danger: string;
}

export type ObjectiveKind =
  | "scan"
  | "hunt"
  | "recover"
  | "survive"
  | "boss"
  | "extract";

export interface MissionObjectiveDefinition {
  id: string;
  label: string;
  description: string;
  kind: ObjectiveKind;
  required: boolean;
  targetCount: number;
  honorBonus: number;
}

export type HonorRuleKind =
  | "scan-target"
  | "no-collateral"
  | "weapon-restraint"
  | "recover-technology"
  | "accept-duel"
  | "no-second-wind";

export interface HonorRuleDefinition {
  id: string;
  label: string;
  description: string;
  kind: HonorRuleKind;
  bonus: number;
  violationPenalty: number;
}

export type EnemyArchetype =
  | "rifle-soldier"
  | "scout"
  | "heavy"
  | "cryostalker-runner"
  | "cryostalker-brute"
  | "razor-hound"
  | "bad-blood-initiate";

export interface EnemyWaveDefinition {
  id: string;
  trigger: "start" | "objective" | "boss-phase";
  triggerId: string | null;
  archetype: EnemyArchetype;
  count: number;
  health: number;
  damage: number;
  moveSpeed: number;
  threatLevel: 1 | 2 | 3;
  spawnDelaySeconds: number;
}

export interface BossAttackDefinition {
  id: string;
  label: string;
  damage: number;
  cooldownSeconds: number;
  rangePx: number;
  telegraphMs: number;
  behavior:
    | "projectile"
    | "burst"
    | "charge"
    | "melee"
    | "disc"
    | "plasma"
    | "area";
}

export interface BossPhaseDefinition {
  id: string;
  label: string;
  startsAtHealthRatio: number;
  behavior: string;
  hazard: string;
  speedMultiplier: number;
  damageMultiplier: number;
}

export interface BossDefinition {
  name: string;
  title: string;
  maxHealth: number;
  moveSpeed: number;
  threatLevel: 4;
  color: string;
  silhouette: "human" | "beast" | "yautja";
  attacks: BossAttackDefinition[];
  phases: BossPhaseDefinition[];
  trophyWindowSeconds: number;
}

export interface TrophyDefinition {
  id: string;
  name: string;
  description: string;
  targetName: string;
  /** Physical object removed during the mission and carried to extraction. */
  partId: TrophyPartId;
  icon: string;
}

export interface MissionDefinition {
  id: MissionId;
  order: number;
  title: string;
  subtitle: string;
  planetName: string;
  biome: BiomeId;
  targetName: string;
  targetKind: "human" | "beast" | "yautja";
  briefing: string;
  threatLevel: 1 | 2 | 3 | 4;
  prerequisiteMissionId: MissionId | null;
  recommendedArmorId: ArmorId;
  recommendedWeaponIds: WeaponId[];
  parTimeSeconds: number;
  baseRewards: MissionReward;
  palette: MissionPalette;
  objectives: MissionObjectiveDefinition[];
  honorRules: HonorRuleDefinition[];
  enemyWaves: EnemyWaveDefinition[];
  boss: BossDefinition;
  trophy: TrophyDefinition;
  codexUnlockIds: CodexEntryId[];
}

// ---------------------------------------------------------------------------
// Runtime-to-meta result contract
// ---------------------------------------------------------------------------

export interface HonorEvent {
  id: string;
  label: string;
  value: number;
  kind: "honorable-kill" | "scan" | "objective" | "violation" | "duel";
}

export interface TrophyClaim {
  /** Unique physical-claim identifier supplied by the mission runtime. */
  id: string;
  /** Stable content definition used to select the trophy artwork/model. */
  definitionId: string;
  targetName: string;
  targetKind: "human" | "beast" | "yautja";
  partId: TrophyPartId;
  condition: TrophyCondition;
  quality: TrophyQuality;
}

export interface MissionResult {
  missionId: MissionId;
  difficultyId: DifficultyId;
  outcome: MissionOutcome;
  score: number;
  elapsedSeconds: number;
  completedObjectiveIds: string[];
  honorEvents: HonorEvent[];
  /** Legacy aggregate quality remains authoritative for scoring. */
  trophyQuality: TrophyQuality | null;
  /** Empty when no removable trophy part was claimed. */
  trophyClaims: TrophyClaim[];
  kills: number;
  scans: number;
  secondWindUsed: boolean;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Versioned persistence model
// ---------------------------------------------------------------------------

export interface TrophyRecord extends TrophyClaim {
  missionId: MissionId;
  difficultyId: DifficultyId;
  score: number;
  claimedAt: string;
  /** Ritual work is persisted only after at least one workshop mini-game. */
  workshop?: {
    completedActions: Array<"clean" | "prepare" | "display" | "rite">;
    bestScore: number;
    lastCompletedAt: string;
  };
}

export interface MissionProgress {
  status: MissionProgressStatus;
  attempts: number;
  completions: number;
  bestScore: number;
  bestTimeSeconds: number | null;
  bestDifficultyId: DifficultyId | null;
  completedObjectiveIds: string[];
  lastPlayedAt: string | null;
}

export interface PlayerProfile {
  hunterName: string;
  rankId: RankId;
  honor: number;
  clanMarks: number;
  playTimeSeconds: number;
}

export interface PlayerInventory {
  unlockedWeaponIds: WeaponId[];
  unlockedGearIds: GearId[];
  unlockedArmorIds: ArmorId[];
  weaponUpgrades: Record<WeaponId, UpgradeLevel>;
  gearUpgrades: Record<GearId, UpgradeLevel>;
  armorUpgrades: Record<ArmorId, UpgradeLevel>;
}

export interface CodexProgress {
  unlockedEntryIds: CodexEntryId[];
  scanCounts: Partial<Record<CodexEntryId, number>>;
}

export interface GameStatistics {
  missionsStarted: number;
  missionsCompleted: number;
  missionsFailed: number;
  totalKills: number;
  totalScans: number;
  secondWindsUsed: number;
  bestHuntStreak: number;
  currentHuntStreak: number;
}

export interface GameSettings {
  difficultyId: DifficultyId;
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  screenShake: boolean;
  reducedGore: boolean;
  highContrastVision: boolean;
}

export interface SaveGame {
  version: number;
  createdAt: string;
  updatedAt: string;
  profile: PlayerProfile;
  inventory: PlayerInventory;
  loadout: Loadout;
  appearance: HunterAppearance;
  missionProgress: Record<MissionId, MissionProgress>;
  trophies: TrophyRecord[];
  codex: CodexProgress;
  statistics: GameStatistics;
  settings: GameSettings;
  storyCompleted: boolean;
}
