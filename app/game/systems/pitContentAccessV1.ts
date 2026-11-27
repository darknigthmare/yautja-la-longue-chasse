/**
 * THE PIT — optional content access presentation, Combat Games Extension 02.
 *
 * Existing roster, stages and modes retain their existing rules. The initial
 * catalogue projects rewards already granted by pitSave. It neither awards
 * items nor mutates a save, combat or replay. No local subscription flag can
 * grant a commercial right. Temporary grants require a future trusted adapter;
 * only non-granting external check states are supported in this version.
 */
import { PIT_ARCADE_LADDERS, PIT_DESCENT_FLOOR_COUNT } from "./pitArcade";
import { PIT_CLAN_CIRCUITS } from "./pitCircuit";
import { PIT_FIRST_EDITION_FIGHTER_IDS, PIT_FIRST_EDITION_FIGHTERS } from "./pitFirstEdition";
import { buildPitHonors, type PitHonorEntry, type PitHonors } from "./pitHonors";
import { PIT_SAVE_ALLOWED_COSMETIC_IDS, validateCanonicalPitSave, type PitSaveV5 } from "./pitSave";

export type PitContentDiscoveryV1 = "secret" | "hinted" | "identified";
export type PitContentCategoryV1 = "fighter" | "partner" | "costume" | "palette" | "stage" | "mode" | "collection";

/** ALL and ANY preserve explicit groups and authored labels in the UI. */
export type PitUnlockConditionV1 =
  | { readonly kind: "always"; readonly label: string }
  | { readonly kind: "fact"; readonly factId: string; readonly label: string }
  | { readonly kind: "counter"; readonly counterId: string; readonly minimum: number; readonly label: string }
  | { readonly kind: "all" | "any"; readonly conditions: readonly PitUnlockConditionV1[]; readonly label: string };

export interface PitUnlockEvaluationV1 {
  readonly kind: PitUnlockConditionV1["kind"];
  readonly label: string;
  readonly valid: boolean;
  readonly satisfied: boolean;
  readonly current?: number;
  readonly total?: number;
  readonly children?: readonly PitUnlockEvaluationV1[];
}

export interface PitContentEvidenceV1 {
  readonly status: PitHonors["status"];
  readonly permanentIds: readonly string[];
  readonly facts: readonly string[];
  readonly counters: Readonly<Record<string, number>>;
}

export interface PitContentDefinitionV1 {
  readonly id: string;
  readonly category: PitContentCategoryV1;
  readonly label: string;
  readonly loreStatus: "canon-attested" | "playable-adaptation" | "original-compatible" | "alternative" | "unconfirmed";
  readonly discovery: {
    readonly initial: PitContentDiscoveryV1;
    readonly secretLabel: string;
    readonly hintedLabel?: string;
    readonly hintedWhen?: PitUnlockConditionV1;
    readonly identifiedWhen?: PitUnlockConditionV1;
    /** Must not contain the hidden identity or its spoiler. */
    readonly hiddenConditionLabel?: string;
  };
  readonly access:
    | { readonly kind: "included" }
    | {
        readonly kind: "reward";
        readonly grantId: string;
        readonly condition: PitUnlockConditionV1;
        readonly claimRequired?: boolean;
        /** Metadata only: no external provider or paid offer is enabled. */
        readonly externalBenefitId?: string;
      };
  readonly lockedPreview: "silhouette" | "revealed";
}

export type PitExternalCheckV1 = "not-configured" | "pending" | "unavailable" | "expired" | "revoked";
export interface PitContentReadinessV1 {
  readonly installation: "ready" | "missing" | "unavailable";
  readonly installationReason?: string;
  readonly compatibility: "compatible" | "incompatible";
  readonly compatibilityReason?: string;
  readonly externalCheck?: PitExternalCheckV1;
}

export const PIT_CONTENT_READY_V1: PitContentReadinessV1 = Object.freeze({
  installation: "ready", compatibility: "compatible",
});

export type PitContentRightV1 = "included" | "permanent" | "locked" | "claimable"
  | "verification-pending" | "verification-unavailable" | "expired" | "revoked";

export interface PitContentAccessV1 {
  readonly id: string;
  readonly discovery: PitContentDiscoveryV1;
  readonly right: PitContentRightV1;
  readonly installation: PitContentReadinessV1["installation"];
  readonly compatibility: PitContentReadinessV1["compatibility"];
  readonly label: string;
  readonly statusLabel: string;
  readonly accessibleLabel: string;
  readonly conditionLabel: string;
  readonly visual: "neutral-emblem" | "silhouette" | "revealed";
  /** Decorative interface clasp, not a newly asserted canonical Yautja object. */
  readonly mark: "none" | "sealed-clasp" | "open-clasp";
  readonly canInspect: true;
  readonly canPreview: boolean;
  readonly canSelect: boolean;
  readonly reasons: readonly string[];
  readonly nextAction: "select" | "inspect-condition" | "claim" | "install" | "retry" | "choose-compatible";
  readonly condition: PitUnlockEvaluationV1 | null;
}

const emptyEvidence = (status: PitContentEvidenceV1["status"]): PitContentEvidenceV1 => ({
  status, permanentIds: [], facts: [], counters: {},
});

/** No new save format: only canonical, owner-matched, already settled PIT facts. */
export function buildPitContentEvidenceV1(save: PitSaveV5 | null, owner: string): PitContentEvidenceV1 {
  if (typeof owner !== "string" || owner.length === 0 || owner.length > 128 || Number.isNaN(Date.parse(owner))) {
    return emptyEvidence("invalid");
  }
  if (save === null) return emptyEvidence("empty");
  let canonical: PitSaveV5 | null;
  try {
    if (!save || typeof save.ownerSaveCreatedAt !== "string") return emptyEvidence("invalid");
    if (save.ownerSaveCreatedAt !== owner) return emptyEvidence("owner-conflict");
    if (!Array.isArray(save.unlockedCosmeticIds) || save.unlockedCosmeticIds.some(id => typeof id !== "string")) return emptyEvidence("invalid");
    // Preserve the existing honors display contract: ignore unknown reward IDs
    // in this read-only view, without deleting them from the source archive.
    // Every known reward must still be supported by canonical saved progress.
    canonical = validateCanonicalPitSave({
      ...save,
      unlockedCosmeticIds: save.unlockedCosmeticIds.filter(id => PIT_SAVE_ALLOWED_COSMETIC_IDS.includes(id)),
    });
  } catch { return emptyEvidence("invalid"); }
  if (!canonical) return emptyEvidence("invalid");
  const counters: Record<string, number> = {};
  const facts = canonical.unlockedCosmeticIds.map(id => `cosmetic:${id}`);
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    counters[`arcade:${fighterId}:encounters`] = canonical.arcadeProgress[fighterId].bestEncounter;
    counters[`circuit:${fighterId}:fights`] = canonical.circuitProgress[fighterId].bestFight;
    counters[`descent:${fighterId}:floors`] = canonical.descentProgress[fighterId].bestFloor;
    if (canonical.arcadeProgress[fighterId].completions > 0) facts.push(`arcade-completed:${fighterId}`);
    if (canonical.circuitProgress[fighterId].completions > 0) facts.push(`circuit-completed:${fighterId}`);
    if (canonical.descentProgress[fighterId].completions > 0) facts.push(`descent-completed:${fighterId}`);
  }
  for (const [mode, stats] of Object.entries(canonical.stats)) {
    for (const [field, value] of Object.entries(stats)) counters[`stats:${mode}:${field}`] = value;
  }
  return { status: "ready", permanentIds: [...canonical.unlockedCosmeticIds], facts, counters };
}

/** Empty, malformed or cyclic groups cannot accidentally unlock a reward. */
export function evaluatePitUnlockConditionV1(
  condition: PitUnlockConditionV1,
  evidence: Pick<PitContentEvidenceV1, "facts" | "counters">,
): PitUnlockEvaluationV1 {
  let remainingNodes = 256;
  function visit(rule: PitUnlockConditionV1, depth: number): PitUnlockEvaluationV1 {
    const invalid = (): PitUnlockEvaluationV1 => ({ kind: rule?.kind ?? "all", label: "Condition indisponible", valid: false, satisfied: false });
    if (!rule || typeof rule !== "object" || depth > 16 || --remainingNodes < 0 || typeof rule.label !== "string" || !rule.label.trim()) return invalid();
    const base = { kind: rule.kind, label: rule.label, valid: true };
    if (rule.kind === "always") return { ...base, satisfied: true };
    if (rule.kind === "fact") {
      if (typeof rule.factId !== "string" || !rule.factId) return invalid();
      return { ...base, satisfied: evidence.facts.includes(rule.factId) };
    }
    if (rule.kind === "counter") {
      if (typeof rule.counterId !== "string" || !rule.counterId || !Number.isSafeInteger(rule.minimum) || rule.minimum < 1) return invalid();
      const value = Object.hasOwn(evidence.counters, rule.counterId) ? evidence.counters[rule.counterId] : 0;
      const current = Number.isSafeInteger(value) && value >= 0 ? value : 0;
      return { ...base, current: Math.min(current, rule.minimum), total: rule.minimum, satisfied: current >= rule.minimum };
    }
    if ((rule.kind !== "all" && rule.kind !== "any") || !Array.isArray(rule.conditions) || rule.conditions.length === 0 || rule.conditions.length > 64) return invalid();
    const children = rule.conditions.map(child => visit(child, depth + 1));
    const valid = children.every(child => child.valid);
    return {
      ...base, children, valid,
      satisfied: valid && (rule.kind === "all" ? children.every(child => child.satisfied) : children.some(child => child.satisfied)),
    };
  }
  return visit(condition, 0);
}

const RIGHT_LABELS: Readonly<Record<PitContentRightV1, string>> = {
  included: "Disponible", permanent: "Acquis", locked: "À débloquer", claimable: "Récompense disponible",
  "verification-pending": "Vérification en cours", "verification-unavailable": "Vérification indisponible",
  expired: "Accès terminé", revoked: "Accès retiré",
};

/**
 * Each axis remains observable when another blocks selection. Unknown asset
 * readiness must be passed as unavailable. The caller rechecks before a match;
 * an active match keeps its frozen setup until its normal result boundary.
 */
export function resolvePitContentAccessV1(
  definition: PitContentDefinitionV1,
  evidence: PitContentEvidenceV1,
  readiness: PitContentReadinessV1,
): PitContentAccessV1 {
  const sourceValid = evidence.status === "ready" || evidence.status === "empty";
  const condition = definition.access.kind === "reward"
    ? evaluatePitUnlockConditionV1(definition.access.condition, evidence) : null;
  let right: PitContentRightV1 = definition.access.kind === "included" ? "included" : "locked";
  if (definition.access.kind === "reward") {
    if (!sourceValid) right = "verification-unavailable";
    else if (evidence.permanentIds.includes(definition.access.grantId)) right = "permanent";
    else if (condition?.valid && condition.satisfied && definition.access.claimRequired) right = "claimable";
    else if (definition.access.externalBenefitId) {
      const check = readiness.externalCheck;
      if (check === "pending") right = "verification-pending";
      else if (check === "unavailable") right = "verification-unavailable";
      else if (check === "expired" || check === "revoked") right = check;
    }
  }
  const entitled = right === "included" || right === "permanent";
  let discovery = definition.discovery.initial;
  if (sourceValid && definition.discovery.hintedWhen && evaluatePitUnlockConditionV1(definition.discovery.hintedWhen, evidence).satisfied && discovery === "secret") discovery = "hinted";
  if (entitled || (sourceValid && definition.discovery.identifiedWhen && evaluatePitUnlockConditionV1(definition.discovery.identifiedWhen, evidence).satisfied)) discovery = "identified";
  const label = discovery === "identified" ? definition.label
    : discovery === "hinted" ? definition.discovery.hintedLabel ?? definition.discovery.secretLabel
      : definition.discovery.secretLabel;
  const conditionLabel = discovery === "identified" ? condition?.label ?? "Inclus dans THE PIT."
    : definition.discovery.hiddenConditionLabel ?? "Poursuivre les épreuves de l’arène.";
  const visual = discovery === "secret" ? "neutral-emblem"
    : discovery === "hinted" || (!entitled && definition.lockedPreview === "silhouette") ? "silhouette" : "revealed";
  const reasons: string[] = [];
  if (!entitled) reasons.push(RIGHT_LABELS[right]);
  if (condition && !condition.valid && !entitled) reasons.push("Condition indisponible");
  if (readiness.installation !== "ready") reasons.push(
    (discovery === "identified" ? readiness.installationReason : undefined)
      ?? (readiness.installation === "missing" ? "Installation nécessaire" : "Contenu temporairement indisponible"),
  );
  if (readiness.compatibility !== "compatible") reasons.push(
    (discovery === "identified" ? readiness.compatibilityReason : undefined) ?? "Indisponible dans cette configuration",
  );
  const canSelect = entitled && readiness.installation === "ready" && readiness.compatibility === "compatible";
  const statusParts = [RIGHT_LABELS[right]];
  if (readiness.installation !== "ready") statusParts.push(readiness.installation === "missing" ? "installation nécessaire" : "contenu indisponible");
  if (readiness.compatibility !== "compatible") statusParts.push("configuration incompatible");
  const statusLabel = discovery === "secret" ? `Non révélé · ${statusParts.join(" — ")}` : statusParts.join(" — ");
  const nextAction: PitContentAccessV1["nextAction"] = canSelect ? "select"
    : right === "claimable" ? "claim"
      : right === "verification-pending" || right === "verification-unavailable" ? "retry"
        : !entitled ? "inspect-condition"
          : readiness.installation === "missing" ? "install"
            : readiness.installation === "unavailable" ? "retry" : "choose-compatible";
  return {
    id: definition.id, discovery, right, installation: readiness.installation, compatibility: readiness.compatibility,
    label, statusLabel, accessibleLabel: `${label} · ${statusLabel} · ${conditionLabel}`,
    conditionLabel, visual, mark: right === "included" ? "none" : entitled ? "open-clasp" : "sealed-clasp", canInspect: true,
    canPreview: visual === "revealed" && readiness.installation === "ready", canSelect, reasons, nextAction,
    // Rule leaves may name a hidden chapter/opponent; omit them until identified.
    condition: discovery === "identified" ? condition : null,
  };
}

export interface PitRewardSlotV1 {
  readonly honor: PitHonorEntry;
  readonly definition: PitContentDefinitionV1;
  readonly access: PitContentAccessV1;
}

function rewardCondition(entry: PitHonorEntry): PitUnlockConditionV1 {
  const fighterId = PIT_FIRST_EDITION_FIGHTER_IDS.find(id => PIT_ARCADE_LADDERS[id].cosmeticRewardId === entry.id);
  if (fighterId) return {
    kind: "counter", counterId: `arcade:${fighterId}:encounters`,
    minimum: PIT_ARCADE_LADDERS[fighterId].encounters.length, label: entry.condition,
  };
  const chapter = PIT_CLAN_CIRCUITS[PIT_FIRST_EDITION_FIGHTER_IDS[0]].chapters.find(plan => plan.chapter.cosmeticRewardId === entry.id);
  const finalFight = chapter?.fights.at(-1)?.index;
  return {
    kind: "any", label: entry.condition,
    conditions: PIT_FIRST_EDITION_FIGHTER_IDS.map(id => ({
      kind: "counter", counterId: finalFight === undefined ? `descent:${id}:floors` : `circuit:${id}:fights`,
      minimum: finalFight ?? PIT_DESCENT_FLOOR_COUNT,
      label: `${finalFight === undefined ? "Terminer la Descente" : "Terminer ce chapitre"} avec ${PIT_FIRST_EDITION_FIGHTERS[id].name}.`,
    })),
  };
}

/** Ready here means the existing distinction card/palette, never a finished costume. */
export function buildPitRewardSlotsV1(
  save: PitSaveV5 | null,
  owner: string,
  readinessById: Readonly<Record<string, PitContentReadinessV1>> = {},
): { readonly status: PitHonors["status"]; readonly earnedCount: number; readonly totalCount: number; readonly entries: readonly PitRewardSlotV1[] } {
  const evidence = buildPitContentEvidenceV1(save, owner);
  const honors = buildPitHonors(save, owner);
  if (evidence.status === "invalid" || evidence.status === "owner-conflict") {
    return { status: evidence.status, earnedCount: 0, totalCount: honors.totalCount, entries: [] };
  }
  return {
    status: honors.status, earnedCount: honors.earnedCount, totalCount: honors.totalCount,
    entries: honors.entries.map(honor => {
      const definition: PitContentDefinitionV1 = {
        id: honor.id, category: honor.palette ? "palette" : "collection", label: honor.label,
        loreStatus: "original-compatible", lockedPreview: "silhouette",
        discovery: { initial: "identified", secretLabel: "Distinction non révélée" },
        access: { kind: "reward", grantId: honor.id, condition: rewardCondition(honor) },
      };
      return { honor, definition, access: resolvePitContentAccessV1(definition, evidence, readinessById[honor.id] ?? PIT_CONTENT_READY_V1) };
    }),
  };
}

/** Locked cards remain inspectable; random selection uses only this eligible set. */
export function selectablePitContentIdsV1(states: readonly PitContentAccessV1[]): string[] {
  return [...new Set(states.filter(state => state.canSelect).map(state => state.id))];
}

/** Preserve the requested preference; only the effective selection changes. */
export function resolvePitContentFallbackV1(preferredId: string, fallbackId: string, states: readonly PitContentAccessV1[]) {
  const eligible = new Set(selectablePitContentIdsV1(states));
  const selectedId = eligible.has(preferredId) ? preferredId : eligible.has(fallbackId) ? fallbackId : null;
  return { preferredId, selectedId, substituted: selectedId !== preferredId };
}
