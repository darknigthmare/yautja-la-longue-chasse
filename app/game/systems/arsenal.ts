import {
  ARMOR_BY_ID,
  DIFFICULTY_BY_ID,
  GEAR_BY_ID,
  WEAPON_BY_ID,
} from "../data";
import type {
  ArmorId,
  DifficultyId,
  GameSettings,
  GearId,
  Loadout,
  PlayerInventory,
  SaveGame,
  UpgradeLevel,
  WeaponId,
} from "../types";

/**
 * Runtime autonome de l'arsenal.
 *
 * Ce module ne dépend ni de React, ni du Canvas, ni de l'horloge système. Les
 * appels reçoivent un temps de simulation explicite, ce qui rend les charges,
 * cooldowns, achats et sauvegardes reproductibles dans les tests.
 */

export const ARSENAL_RUNTIME_SCHEMA_VERSION = 1 as const;
export const ARSENAL_GEAR_SLOT_COUNT = 2 as const;

const GEAR_IDS = Object.keys(GEAR_BY_ID) as GearId[];
const WEAPON_IDS = Object.keys(WEAPON_BY_ID) as WeaponId[];
const ARMOR_IDS = Object.keys(ARMOR_BY_ID) as ArmorId[];
const GEAR_ID_SET = new Set<GearId>(GEAR_IDS);
const WEAPON_ID_SET = new Set<WeaponId>(WEAPON_IDS);
const ARMOR_ID_SET = new Set<ArmorId>(ARMOR_IDS);

const GEAR_COOLDOWN_SECONDS: Readonly<Record<GearId, number>> = {
  "motion-sensor": 4,
  "audio-decoy": 3,
  netgun: 2.5,
  snare: 2,
};

const GEAR_EFFECT_KIND: Readonly<Record<GearId, GearEffectKind>> = {
  "motion-sensor": "reveal",
  "audio-decoy": "lure",
  netgun: "restrain",
  snare: "trap",
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function nonNegative(value: unknown, fallback = 0): number {
  return Math.max(0, finiteNumber(value, fallback));
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(finiteNumber(value, fallback)));
}

function stableNumber(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function upgradeLevel(value: unknown): UpgradeLevel {
  const normalized = Math.floor(finiteNumber(value, 0));
  return clamp(normalized, 0, 2) as UpgradeLevel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function point(value: unknown, fallback: ArsenalPoint): ArsenalPoint {
  if (!isRecord(value)) return { ...fallback };
  return {
    x: stableNumber(finiteNumber(value.x, fallback.x)),
    y: stableNumber(finiteNumber(value.y, fallback.y)),
  };
}

function distance(a: ArsenalPoint, b: ArsenalPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointWithinRange(
  origin: ArsenalPoint,
  requested: ArsenalPoint,
  rangePx: number,
): ArsenalPoint {
  const separation = distance(origin, requested);
  if (separation <= rangePx || separation <= 0.000_001) {
    return { ...requested };
  }
  const ratio = rangePx / separation;
  return {
    x: stableNumber(origin.x + (requested.x - origin.x) * ratio),
    y: stableNumber(origin.y + (requested.y - origin.y) * ratio),
  };
}

// ---------------------------------------------------------------------------
// Difficulté et statistiques améliorées
// ---------------------------------------------------------------------------

export interface DifficultyRuntimeTuning {
  id: DifficultyId;
  enemyHealthMultiplier: number;
  playerDamageTakenMultiplier: number;
  enemyDetectionMultiplier: number;
  rewardMultiplier: number;
  checkpointCount: number;
  medicompModifier: number;
  /**
   * Aide réservée aux outils de lecture/placement. Elle ne modifie pas les
   * dégâts des armes et ne remplace pas la perception des ennemis.
   */
  gearAssistMultiplier: number;
}

export function resolveDifficultyTuning(
  difficultyId: DifficultyId,
): DifficultyRuntimeTuning {
  const definition =
    DIFFICULTY_BY_ID[difficultyId] ?? DIFFICULTY_BY_ID.hunter;
  return {
    id: definition.id,
    enemyHealthMultiplier: definition.enemyHealthMultiplier,
    playerDamageTakenMultiplier: definition.enemyDamageMultiplier,
    enemyDetectionMultiplier: definition.detectionMultiplier,
    rewardMultiplier: definition.rewardMultiplier,
    checkpointCount: definition.checkpointCount,
    medicompModifier: definition.medicompModifier,
    gearAssistMultiplier: stableNumber(
      clamp(1 / Math.max(0.01, definition.detectionMultiplier), 0.72, 1.18),
    ),
  };
}

export interface EffectiveWeaponStats {
  id: WeaponId;
  upgradeLevel: UpgradeLevel;
  damage: number;
  heavyDamage: number;
  cooldownSeconds: number;
  rangePx: number;
  projectileSpeedPx: number;
  staminaCost: number;
  energyCost: number;
  ammo: number | null;
}

export function effectiveWeaponStats(
  weaponId: WeaponId,
  level: UpgradeLevel,
): EffectiveWeaponStats {
  const definition = WEAPON_BY_ID[weaponId];
  const resolvedLevel = upgradeLevel(level);
  const damageMultiplier = 1 + resolvedLevel * 0.12;
  const heavyMultiplier = 1 + resolvedLevel * 0.15;
  const cooldownMultiplier = 1 - resolvedLevel * 0.08;
  const costMultiplier = 1 - resolvedLevel * 0.06;
  return {
    id: weaponId,
    upgradeLevel: resolvedLevel,
    damage: stableNumber(definition.damage * damageMultiplier),
    heavyDamage: stableNumber(definition.heavyDamage * heavyMultiplier),
    cooldownSeconds: stableNumber(
      Math.max(0.08, (definition.cooldownMs / 1_000) * cooldownMultiplier),
    ),
    rangePx: stableNumber(definition.rangePx * (1 + resolvedLevel * 0.06)),
    projectileSpeedPx: stableNumber(
      definition.projectileSpeedPx * (1 + resolvedLevel * 0.04),
    ),
    staminaCost: stableNumber(definition.staminaCost * costMultiplier),
    energyCost: stableNumber(definition.energyCost * costMultiplier),
    ammo:
      definition.ammo === null
        ? null
        : definition.ammo + (resolvedLevel === 2 ? 2 : resolvedLevel),
  };
}

export interface EffectiveArmorStats {
  id: ArmorId;
  upgradeLevel: UpgradeLevel;
  maxHealth: number;
  maxStamina: number;
  maxEnergy: number;
  moveSpeedMultiplier: number;
  energyRegenMultiplier: number;
  meleeDamageMultiplier: number;
  carryingCapacity: number;
  medicompCharges: number;
}

export function effectiveArmorStats(
  armorId: ArmorId,
  level: UpgradeLevel,
): EffectiveArmorStats {
  const definition = ARMOR_BY_ID[armorId];
  const resolvedLevel = upgradeLevel(level);
  const durabilityMultiplier = 1 + resolvedLevel * 0.1;
  return {
    id: armorId,
    upgradeLevel: resolvedLevel,
    maxHealth: stableNumber(definition.maxHealth * durabilityMultiplier),
    maxStamina: stableNumber(definition.maxStamina * durabilityMultiplier),
    maxEnergy: stableNumber(definition.maxEnergy * durabilityMultiplier),
    moveSpeedMultiplier: stableNumber(
      definition.moveSpeedMultiplier * (1 + resolvedLevel * 0.02),
    ),
    energyRegenMultiplier: stableNumber(
      definition.energyRegenMultiplier * (1 + resolvedLevel * 0.06),
    ),
    meleeDamageMultiplier: stableNumber(
      definition.meleeDamageMultiplier * (1 + resolvedLevel * 0.05),
    ),
    carryingCapacity: definition.carryingCapacity + resolvedLevel,
    medicompCharges:
      definition.medicompCharges + (resolvedLevel === 2 ? 1 : 0),
  };
}

export interface EffectiveGearStats {
  id: GearId;
  upgradeLevel: UpgradeLevel;
  maxCharges: number;
  cooldownSeconds: number;
  durationSeconds: number;
  rangePx: number;
}

export function effectiveGearStats(
  gearId: GearId,
  level: UpgradeLevel,
  difficultyId: DifficultyId,
): EffectiveGearStats {
  const definition = GEAR_BY_ID[gearId];
  const resolvedLevel = upgradeLevel(level);
  const difficulty = resolveDifficultyTuning(difficultyId);
  return {
    id: gearId,
    upgradeLevel: resolvedLevel,
    maxCharges: definition.charges + resolvedLevel,
    cooldownSeconds: stableNumber(
      Math.max(
        0.4,
        GEAR_COOLDOWN_SECONDS[gearId] * (1 - resolvedLevel * 0.12),
      ),
    ),
    durationSeconds: stableNumber(
      definition.durationSeconds * (1 + resolvedLevel * 0.15),
    ),
    rangePx: stableNumber(
      definition.rangePx *
        (1 + resolvedLevel * 0.1) *
        difficulty.gearAssistMultiplier,
    ),
  };
}

// ---------------------------------------------------------------------------
// Achats d'améliorations
// ---------------------------------------------------------------------------

export type UpgradePurchaseRequest =
  | { domain: "weapon"; id: WeaponId }
  | { domain: "gear"; id: GearId }
  | { domain: "armor"; id: ArmorId };

export type UpgradePurchaseFailure =
  | "invalid-request"
  | "locked"
  | "max-level"
  | "insufficient-clan-marks";

export interface UpgradeQuote {
  request: UpgradePurchaseRequest;
  currentLevel: UpgradeLevel;
  nextLevel: UpgradeLevel | null;
  cost: number | null;
  availableClanMarks: number;
  unlocked: boolean;
  affordable: boolean;
  canPurchase: boolean;
  failure: UpgradePurchaseFailure | null;
}

function validUpgradeRequest(
  request: UpgradePurchaseRequest,
): boolean {
  if (request.domain === "weapon") return WEAPON_ID_SET.has(request.id);
  if (request.domain === "gear") return GEAR_ID_SET.has(request.id);
  if (request.domain === "armor") return ARMOR_ID_SET.has(request.id);
  return false;
}

function requestLevel(
  inventory: PlayerInventory,
  request: UpgradePurchaseRequest,
): UpgradeLevel {
  if (request.domain === "weapon") {
    return upgradeLevel(inventory.weaponUpgrades[request.id]);
  }
  if (request.domain === "gear") {
    return upgradeLevel(inventory.gearUpgrades[request.id]);
  }
  return upgradeLevel(inventory.armorUpgrades[request.id]);
}

function requestUnlocked(
  inventory: PlayerInventory,
  request: UpgradePurchaseRequest,
): boolean {
  if (request.domain === "weapon") {
    return inventory.unlockedWeaponIds.includes(request.id);
  }
  if (request.domain === "gear") {
    return inventory.unlockedGearIds.includes(request.id);
  }
  return inventory.unlockedArmorIds.includes(request.id);
}

function requestCosts(
  request: UpgradePurchaseRequest,
): readonly [number, number] {
  if (request.domain === "weapon") {
    return WEAPON_BY_ID[request.id].upgradeCosts;
  }
  if (request.domain === "gear") {
    return GEAR_BY_ID[request.id].upgradeCosts;
  }
  return ARMOR_BY_ID[request.id].upgradeCosts;
}

export function quoteUpgrade(
  save: SaveGame,
  request: UpgradePurchaseRequest,
): UpgradeQuote {
  const availableClanMarks = nonNegativeInteger(save.profile.clanMarks);
  if (!validUpgradeRequest(request)) {
    return {
      request,
      currentLevel: 0,
      nextLevel: null,
      cost: null,
      availableClanMarks,
      unlocked: false,
      affordable: false,
      canPurchase: false,
      failure: "invalid-request",
    };
  }

  const currentLevel = requestLevel(save.inventory, request);
  const unlocked = requestUnlocked(save.inventory, request);
  const nextLevel =
    currentLevel >= 2 ? null : ((currentLevel + 1) as UpgradeLevel);
  const cost =
    nextLevel === null
      ? null
      : requestCosts(request)[currentLevel as 0 | 1];
  const affordable = cost !== null && availableClanMarks >= cost;
  const failure: UpgradePurchaseFailure | null = !unlocked
    ? "locked"
    : nextLevel === null
      ? "max-level"
      : !affordable
        ? "insufficient-clan-marks"
        : null;

  return {
    request,
    currentLevel,
    nextLevel,
    cost,
    availableClanMarks,
    unlocked,
    affordable,
    canPurchase: failure === null,
    failure,
  };
}

export interface UpgradePurchaseResult {
  ok: boolean;
  save: SaveGame;
  quote: UpgradeQuote;
  spentClanMarks: number;
  newLevel: UpgradeLevel | null;
}

/**
 * Ne touche ni à localStorage ni à updatedAt. GameClient peut transmettre la
 * sauvegarde renvoyée à writeSave(), qui reste l'unique propriétaire du temps.
 */
export function purchaseUpgrade(
  save: SaveGame,
  request: UpgradePurchaseRequest,
): UpgradePurchaseResult {
  const quote = quoteUpgrade(save, request);
  if (
    !quote.canPurchase ||
    quote.cost === null ||
    quote.nextLevel === null
  ) {
    return {
      ok: false,
      save,
      quote,
      spentClanMarks: 0,
      newLevel: null,
    };
  }

  let inventory: PlayerInventory;
  if (request.domain === "weapon") {
    inventory = {
      ...save.inventory,
      weaponUpgrades: {
        ...save.inventory.weaponUpgrades,
        [request.id]: quote.nextLevel,
      },
    };
  } else if (request.domain === "gear") {
    inventory = {
      ...save.inventory,
      gearUpgrades: {
        ...save.inventory.gearUpgrades,
        [request.id]: quote.nextLevel,
      },
    };
  } else {
    inventory = {
      ...save.inventory,
      armorUpgrades: {
        ...save.inventory.armorUpgrades,
        [request.id]: quote.nextLevel,
      },
    };
  }

  return {
    ok: true,
    save: {
      ...save,
      profile: {
        ...save.profile,
        clanMarks: quote.availableClanMarks - quote.cost,
      },
      inventory,
    },
    quote,
    spentClanMarks: quote.cost,
    newLevel: quote.nextLevel,
  };
}

// ---------------------------------------------------------------------------
// Deux slots d'équipement et événements de simulation
// ---------------------------------------------------------------------------

export interface ArsenalPoint {
  x: number;
  y: number;
}

export type GearEffectKind = "reveal" | "lure" | "restrain" | "trap";

export interface GearRuntimeSlot {
  slotIndex: 0 | 1;
  gearId: GearId;
  upgradeLevel: UpgradeLevel;
  charges: number;
  maxCharges: number;
  cooldownRemainingSeconds: number;
}

export interface GearEffectEvent {
  id: string;
  sequence: number;
  slotIndex: 0 | 1;
  gearId: GearId;
  kind: GearEffectKind;
  startedAtSeconds: number;
  durationSeconds: number;
  remainingSeconds: number;
  origin: ArsenalPoint;
  target: ArsenalPoint;
  radiusPx: number;
  rangePx: number;
  projectileSpeedPx: number;
  targetId: string | null;
}

export interface ArsenalRuntimeState {
  schemaVersion: typeof ARSENAL_RUNTIME_SCHEMA_VERSION;
  difficultyId: DifficultyId;
  elapsedSeconds: number;
  sequence: number;
  slots: [GearRuntimeSlot, GearRuntimeSlot];
  activeEffects: GearEffectEvent[];
}

export interface ArsenalRuntimeConfiguration {
  loadout: Loadout;
  inventory: PlayerInventory;
  difficultyId: DifficultyId;
}

export interface UseGearContext {
  origin: ArsenalPoint;
  aim?: ArsenalPoint;
  targetId?: string | null;
}

export type UseGearFailure =
  | "invalid-slot"
  | "depleted"
  | "cooldown-active";

export type UseGearResult =
  | {
      ok: true;
      state: ArsenalRuntimeState;
      event: GearEffectEvent;
      failure: null;
    }
  | {
      ok: false;
      state: ArsenalRuntimeState;
      event: null;
      failure: UseGearFailure;
    };

function validGearId(value: unknown): value is GearId {
  return typeof value === "string" && GEAR_ID_SET.has(value as GearId);
}

function resolveGearPair(
  loadout: Loadout,
  inventory: PlayerInventory,
): [GearId, GearId] {
  const candidates: unknown[] = [
    ...loadout.gearIds,
    ...inventory.unlockedGearIds,
    ...GEAR_IDS,
  ];
  const resolved: GearId[] = [];
  for (const candidate of candidates) {
    if (validGearId(candidate) && !resolved.includes(candidate)) {
      resolved.push(candidate);
    }
    if (resolved.length === ARSENAL_GEAR_SLOT_COUNT) break;
  }
  return [
    resolved[0] ?? "motion-sensor",
    resolved[1] ?? "audio-decoy",
  ];
}

function initialSlot(
  slotIndex: 0 | 1,
  gearId: GearId,
  inventory: PlayerInventory,
  difficultyId: DifficultyId,
): GearRuntimeSlot {
  const level = upgradeLevel(inventory.gearUpgrades[gearId]);
  const stats = effectiveGearStats(gearId, level, difficultyId);
  return {
    slotIndex,
    gearId,
    upgradeLevel: level,
    charges: stats.maxCharges,
    maxCharges: stats.maxCharges,
    cooldownRemainingSeconds: 0,
  };
}

export function createArsenalRuntime(
  configuration: ArsenalRuntimeConfiguration,
): ArsenalRuntimeState {
  const pair = resolveGearPair(
    configuration.loadout,
    configuration.inventory,
  );
  return {
    schemaVersion: ARSENAL_RUNTIME_SCHEMA_VERSION,
    difficultyId:
      DIFFICULTY_BY_ID[configuration.difficultyId]?.id ?? "hunter",
    elapsedSeconds: 0,
    sequence: 0,
    slots: [
      initialSlot(
        0,
        pair[0],
        configuration.inventory,
        configuration.difficultyId,
      ),
      initialSlot(
        1,
        pair[1],
        configuration.inventory,
        configuration.difficultyId,
      ),
    ],
    activeEffects: [],
  };
}

export function createArsenalRuntimeFromSave(
  save: SaveGame,
): ArsenalRuntimeState {
  return createArsenalRuntime({
    loadout: save.loadout,
    inventory: save.inventory,
    difficultyId: save.settings.difficultyId,
  });
}

function effectRadius(gearId: GearId, rangePx: number): number {
  if (gearId === "motion-sensor") return rangePx;
  if (gearId === "audio-decoy") return rangePx * 0.72;
  if (gearId === "netgun") return 18;
  return rangePx;
}

function effectProjectileSpeed(gearId: GearId): number {
  return gearId === "netgun" ? 860 : 0;
}

export function useGearSlot(
  state: ArsenalRuntimeState,
  slotIndex: 0 | 1,
  context: UseGearContext,
): UseGearResult {
  const slot = state.slots[slotIndex];
  if (!slot) {
    return {
      ok: false,
      state,
      event: null,
      failure: "invalid-slot",
    };
  }
  if (slot.charges <= 0) {
    return {
      ok: false,
      state,
      event: null,
      failure: "depleted",
    };
  }
  if (slot.cooldownRemainingSeconds > 0) {
    return {
      ok: false,
      state,
      event: null,
      failure: "cooldown-active",
    };
  }

  const stats = effectiveGearStats(
    slot.gearId,
    slot.upgradeLevel,
    state.difficultyId,
  );
  const origin = point(context.origin, { x: 0, y: 0 });
  const requestedTarget = point(context.aim, origin);
  const target =
    slot.gearId === "motion-sensor"
      ? origin
      : pointWithinRange(origin, requestedTarget, stats.rangePx);
  const event: GearEffectEvent = {
    id: `${slot.gearId}:${state.sequence}`,
    sequence: state.sequence,
    slotIndex,
    gearId: slot.gearId,
    kind: GEAR_EFFECT_KIND[slot.gearId],
    startedAtSeconds: state.elapsedSeconds,
    durationSeconds: stats.durationSeconds,
    remainingSeconds: stats.durationSeconds,
    origin,
    target,
    radiusPx: stableNumber(effectRadius(slot.gearId, stats.rangePx)),
    rangePx: stats.rangePx,
    projectileSpeedPx: effectProjectileSpeed(slot.gearId),
    targetId:
      typeof context.targetId === "string"
        ? context.targetId.slice(0, 128)
        : null,
  };
  const slots = state.slots.map((candidate, index) =>
    index === slotIndex
      ? {
          ...candidate,
          charges: candidate.charges - 1,
          cooldownRemainingSeconds: stats.cooldownSeconds,
        }
      : candidate,
  ) as [GearRuntimeSlot, GearRuntimeSlot];

  return {
    ok: true,
    state: {
      ...state,
      sequence: state.sequence + 1,
      slots,
      activeEffects: [...state.activeEffects, event],
    },
    event,
    failure: null,
  };
}

export function tickArsenalRuntime(
  state: ArsenalRuntimeState,
  deltaSeconds: number,
): ArsenalRuntimeState {
  const delta = nonNegative(deltaSeconds);
  if (delta === 0) return state;
  return {
    ...state,
    elapsedSeconds: stableNumber(state.elapsedSeconds + delta),
    slots: state.slots.map((slot) => ({
      ...slot,
      cooldownRemainingSeconds: stableNumber(
        Math.max(0, slot.cooldownRemainingSeconds - delta),
      ),
    })) as [GearRuntimeSlot, GearRuntimeSlot],
    activeEffects: state.activeEffects.flatMap((effect) => {
      const remainingSeconds = stableNumber(
        Math.max(0, effect.remainingSeconds - delta),
      );
      return remainingSeconds > 0
        ? [{ ...effect, remainingSeconds }]
        : [];
    }),
  };
}

export function removeGearEffect(
  state: ArsenalRuntimeState,
  effectId: string,
): ArsenalRuntimeState {
  const activeEffects = state.activeEffects.filter(
    (effect) => effect.id !== effectId,
  );
  return activeEffects.length === state.activeEffects.length
    ? state
    : { ...state, activeEffects };
}

export function resupplyArsenal(
  state: ArsenalRuntimeState,
): ArsenalRuntimeState {
  return {
    ...state,
    slots: state.slots.map((slot) => ({
      ...slot,
      charges: slot.maxCharges,
      cooldownRemainingSeconds: 0,
    })) as [GearRuntimeSlot, GearRuntimeSlot],
    activeEffects: [],
  };
}

// ---------------------------------------------------------------------------
// Sérialisation déterministe d'une mission en cours
// ---------------------------------------------------------------------------

function normalizeSlot(
  value: unknown,
  fallback: GearRuntimeSlot,
  difficultyId: DifficultyId,
): GearRuntimeSlot {
  if (!isRecord(value) || value.gearId !== fallback.gearId) {
    return fallback;
  }
  const stats = effectiveGearStats(
    fallback.gearId,
    fallback.upgradeLevel,
    difficultyId,
  );
  return {
    ...fallback,
    charges: clamp(
      nonNegativeInteger(value.charges, fallback.charges),
      0,
      stats.maxCharges,
    ),
    maxCharges: stats.maxCharges,
    cooldownRemainingSeconds: stableNumber(
      clamp(
        nonNegative(value.cooldownRemainingSeconds),
        0,
        stats.cooldownSeconds,
      ),
    ),
  };
}

function normalizeEffect(
  value: unknown,
  state: ArsenalRuntimeState,
): GearEffectEvent | null {
  if (!isRecord(value) || !validGearId(value.gearId)) return null;
  const slot = state.slots.find(
    (candidate) => candidate.gearId === value.gearId,
  );
  if (!slot) return null;
  const stats = effectiveGearStats(
    slot.gearId,
    slot.upgradeLevel,
    state.difficultyId,
  );
  const sequence = nonNegativeInteger(value.sequence);
  const durationSeconds = stableNumber(
    clamp(
      nonNegative(value.durationSeconds, stats.durationSeconds),
      0.01,
      stats.durationSeconds,
    ),
  );
  const remainingSeconds = stableNumber(
    clamp(
      nonNegative(value.remainingSeconds, durationSeconds),
      0,
      durationSeconds,
    ),
  );
  if (remainingSeconds <= 0) return null;
  const origin = point(value.origin, { x: 0, y: 0 });
  const target = pointWithinRange(
    origin,
    point(value.target, origin),
    stats.rangePx,
  );
  return {
    id: `${slot.gearId}:${sequence}`,
    sequence,
    slotIndex: slot.slotIndex,
    gearId: slot.gearId,
    kind: GEAR_EFFECT_KIND[slot.gearId],
    startedAtSeconds: stableNumber(
      clamp(nonNegative(value.startedAtSeconds), 0, state.elapsedSeconds),
    ),
    durationSeconds,
    remainingSeconds,
    origin,
    target,
    radiusPx: stableNumber(effectRadius(slot.gearId, stats.rangePx)),
    rangePx: stats.rangePx,
    projectileSpeedPx: effectProjectileSpeed(slot.gearId),
    targetId:
      typeof value.targetId === "string"
        ? value.targetId.slice(0, 128)
        : null,
  };
}

export function normalizeArsenalRuntime(
  value: unknown,
  configuration: ArsenalRuntimeConfiguration,
): ArsenalRuntimeState {
  const fallback = createArsenalRuntime(configuration);
  if (!isRecord(value)) return fallback;
  const sourceSlots = Array.isArray(value.slots) ? value.slots : [];
  const elapsedSeconds = stableNumber(nonNegative(value.elapsedSeconds));
  const base: ArsenalRuntimeState = {
    ...fallback,
    elapsedSeconds,
    sequence: nonNegativeInteger(value.sequence),
    slots: [
      normalizeSlot(sourceSlots[0], fallback.slots[0], fallback.difficultyId),
      normalizeSlot(sourceSlots[1], fallback.slots[1], fallback.difficultyId),
    ],
  };
  const sourceEffects = Array.isArray(value.activeEffects)
    ? value.activeEffects
    : [];
  const effectsById = new Map<string, GearEffectEvent>();
  for (const sourceEffect of sourceEffects) {
    const effect = normalizeEffect(sourceEffect, base);
    if (effect) effectsById.set(effect.id, effect);
  }
  const activeEffects = [...effectsById.values()].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  );
  return {
    ...base,
    sequence: Math.max(
      base.sequence,
      activeEffects.reduce(
        (maximum, effect) => Math.max(maximum, effect.sequence + 1),
        0,
      ),
    ),
    activeEffects,
  };
}

export function serializeArsenalRuntime(
  state: ArsenalRuntimeState,
): string {
  return JSON.stringify({
    schemaVersion: ARSENAL_RUNTIME_SCHEMA_VERSION,
    difficultyId: state.difficultyId,
    elapsedSeconds: stableNumber(nonNegative(state.elapsedSeconds)),
    sequence: nonNegativeInteger(state.sequence),
    slots: state.slots.map((slot) => ({
      slotIndex: slot.slotIndex,
      gearId: slot.gearId,
      upgradeLevel: upgradeLevel(slot.upgradeLevel),
      charges: nonNegativeInteger(slot.charges),
      maxCharges: nonNegativeInteger(slot.maxCharges),
      cooldownRemainingSeconds: stableNumber(
        nonNegative(slot.cooldownRemainingSeconds),
      ),
    })),
    activeEffects: [...state.activeEffects]
      .sort(
        (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
      )
      .map((effect) => ({
        id: effect.id,
        sequence: nonNegativeInteger(effect.sequence),
        slotIndex: effect.slotIndex,
        gearId: effect.gearId,
        kind: effect.kind,
        startedAtSeconds: stableNumber(
          nonNegative(effect.startedAtSeconds),
        ),
        durationSeconds: stableNumber(
          nonNegative(effect.durationSeconds),
        ),
        remainingSeconds: stableNumber(
          nonNegative(effect.remainingSeconds),
        ),
        origin: {
          x: stableNumber(effect.origin.x),
          y: stableNumber(effect.origin.y),
        },
        target: {
          x: stableNumber(effect.target.x),
          y: stableNumber(effect.target.y),
        },
        radiusPx: stableNumber(nonNegative(effect.radiusPx)),
        rangePx: stableNumber(nonNegative(effect.rangePx)),
        projectileSpeedPx: stableNumber(
          nonNegative(effect.projectileSpeedPx),
        ),
        targetId: effect.targetId,
      })),
  });
}

export function deserializeArsenalRuntime(
  serialized: string,
  configuration: ArsenalRuntimeConfiguration,
): ArsenalRuntimeState {
  try {
    return normalizeArsenalRuntime(JSON.parse(serialized), configuration);
  } catch {
    return createArsenalRuntime(configuration);
  }
}

// ---------------------------------------------------------------------------
// Audio et accessibilité applicables par adaptateur
// ---------------------------------------------------------------------------

export interface ResolvedRuntimeSettings {
  audio: {
    muted: boolean;
    masterGain: number;
    musicGain: number;
    effectsGain: number;
  };
  accessibility: {
    screenShakeScale: 0 | 1;
    goreIntensity: 0.25 | 1;
    highContrastVision: boolean;
    canvasFilter: string;
  };
}

export function resolveRuntimeSettings(
  settings: GameSettings,
): ResolvedRuntimeSettings {
  const masterGain = clamp(finiteNumber(settings.masterVolume, 0.8), 0, 1);
  const music = clamp(finiteNumber(settings.musicVolume, 0.65), 0, 1);
  const effects = clamp(
    finiteNumber(settings.effectsVolume, 0.85),
    0,
    1,
  );
  const highContrastVision = Boolean(settings.highContrastVision);
  return {
    audio: {
      muted: masterGain <= 0,
      masterGain: stableNumber(masterGain),
      // Music and effects are child buses of master in GameAudio. Returning
      // their local gain avoids applying the master volume a second time.
      musicGain: stableNumber(music),
      effectsGain: stableNumber(effects),
    },
    accessibility: {
      screenShakeScale: settings.screenShake ? 1 : 0,
      goreIntensity: settings.reducedGore ? 0.25 : 1,
      highContrastVision,
      canvasFilter: highContrastVision
        ? "contrast(1.28) saturate(1.12) brightness(1.04)"
        : "none",
    },
  };
}

export interface RuntimeSettingsAdapter {
  setMuted?(muted: boolean): void;
  setMasterGain?(gain: number): void;
  setMusicGain?(gain: number): void;
  setEffectsGain?(gain: number): void;
  setScreenShakeScale?(scale: 0 | 1): void;
  setGoreIntensity?(intensity: 0.25 | 1): void;
  setHighContrastVision?(enabled: boolean, canvasFilter: string): void;
}

/**
 * Pont impératif volontairement minuscule. GameAudio peut immédiatement fournir
 * setMuted ; le Canvas et un futur bus musique/effets peuvent brancher les
 * autres méthodes sans que ce module connaisse leurs implémentations.
 */
export function applyRuntimeSettings(
  settings: GameSettings,
  adapter: RuntimeSettingsAdapter,
): ResolvedRuntimeSettings {
  const resolved = resolveRuntimeSettings(settings);
  adapter.setMuted?.(resolved.audio.muted);
  adapter.setMasterGain?.(resolved.audio.masterGain);
  adapter.setMusicGain?.(resolved.audio.musicGain);
  adapter.setEffectsGain?.(resolved.audio.effectsGain);
  adapter.setScreenShakeScale?.(
    resolved.accessibility.screenShakeScale,
  );
  adapter.setGoreIntensity?.(resolved.accessibility.goreIntensity);
  adapter.setHighContrastVision?.(
    resolved.accessibility.highContrastVision,
    resolved.accessibility.canvasFilter,
  );
  return resolved;
}
