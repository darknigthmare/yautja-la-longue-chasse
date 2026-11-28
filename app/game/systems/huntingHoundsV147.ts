/**
 * V147 hunting hounds: orders and bond (campaign bible, "Chiens de chasse :
 * commandes").
 *
 * - Bond 0..100 on the model of the V6 mount bond: thresholds 25 / 50 / 75 /
 *   100 and at most +5 per session (one hunt = one session, keyed by the
 *   mission id and its completion time so a replayed result never adds more).
 * - Orders: Revenir (0), Pister (25), Rabattre (50), Attaquer (75). A role
 *   signature unlocks at 100 for known catalogue aptitudes. Unidentified
 *   historical animals keep the four established commands.
 * - A wounded hound cannot join a hunt until healed at the Chenil des
 *   Pisteurs (CITY-28). A dead hound never comes back (rule CORE-R17): no
 *   heal, no bond, no recruitment under the same identity.
 * - Honour (proposed in the bible): a kill made by the hound counts as made by
 *   the player for the honour code, same event id, same rules.
 *
 * Pure module: no React, no browser globals, no save writes. Recruitment,
 * selection for the next hunt and care happen at the Chenil des Pisteurs
 * (`houndKennelV147.ts`); the hunt drives the field simulation below.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Bond and orders
// ---------------------------------------------------------------------------

export const HOUND_BOND_MAX_V147 = 100;
export const HOUND_BOND_THRESHOLDS_V147 = [25, 50, 75, 100] as const;
export const HOUND_SESSION_GAIN_CAP_V147 = 5;
export const HOUND_KENNEL_LOCATION_V147 = "CITY-28";
export const HOUND_KENNEL_NAME_V147 = "Chenil des Pisteurs";

export const HOUND_ORDER_IDS_V147 = ["recall", "track", "drive", "attack", "signature"] as const;
export type HoundOrderIdV147 = (typeof HOUND_ORDER_IDS_V147)[number];

export interface HoundOrderDefinitionV147 {
  readonly id: HoundOrderIdV147;
  readonly label: string;
  readonly bond: number;
  readonly effect: string;
  /** False for an old entry whose signature has not been identified. */
  readonly defined: boolean;
}

export const HOUND_ORDERS_V147: readonly HoundOrderDefinitionV147[] = Object.freeze([
  { id: "recall", label: "Revenir", bond: 0, effect: "Rappel : le chien revient au pied.", defined: true },
  { id: "track", label: "Pister", bond: 25, effect: "Suit la trace la plus fraîche et marque la proie.", defined: true },
  { id: "drive", label: "Rabattre", bond: 50, effect: "Pousse la proie vers le joueur ou un piège.", defined: true },
  { id: "attack", label: "Attaquer", bond: 75, effect: "Immobilise ou abat la proie désignée.", defined: true },
  { id: "signature", label: "Ordre signature (à définir)", bond: 100, effect: "Propre à la race du chien ; à définir.", defined: false },
] as const);

/** Playable roles assigned to the original catalogue art. They are gameplay roles. */
export const HOUND_APTITUDES_V147 = {
  tracker: {
    label: "Pisteur", description: "Se déplace vite et marque les traces de plus loin.",
    health: 52, speed: 304, markDistance: 175, pushSpeed: 60,
    mode: "track", signatureLabel: "Piste tenace",
    signatureEffect: "Marque la trace la plus fraîche de plus loin et garde le repère douze secondes.",
  },
  driver: {
    label: "Rabatteur", description: "Pousse plus vite les petites proies vers le chasseur.",
    health: 64, speed: 266, markDistance: 126, pushSpeed: 96,
    mode: "drive", signatureLabel: "Rabattage serré",
    signatureEffect: "Rabats une proie au sol plus près de toi que lors d’un rabattage ordinaire.",
  },
  guard: {
    label: "Gardien", description: "Encaisse davantage de dégâts et se déplace plus lentement.",
    health: 78, speed: 222, markDistance: 130, pushSpeed: 76,
    mode: "attack", signatureLabel: "Charge courte",
    signatureEffect: "Porte une seule attaque renforcée sur la proie au sol que tu désignes, puis revient.",
  },
} as const;

export type HoundAptitudeV147 = keyof typeof HOUND_APTITUDES_V147;

const CATALOGUE_APTITUDES: Readonly<Partial<Record<string, HoundAptitudeV147>>> = {
  "original-companion-01": "guard",
  "original-companion-02": "driver",
  "original-companion-03": "guard",
  "original-companion-04": "guard",
  "original-companion-05": "tracker",
  "original-companion-06": "tracker",
  "original-companion-07": "driver",
  "original-companion-08": "tracker",
  "original-companion-09": "driver",
  "original-companion-10": "driver",
  "user-preddog-2018": "guard",
  breche: "tracker",
};

export function houndAptitudeV147(catalogueId: string | null | undefined): HoundAptitudeV147 | undefined {
  return catalogueId && Object.hasOwn(CATALOGUE_APTITUDES, catalogueId) ? CATALOGUE_APTITUDES[catalogueId] : undefined;
}

function supportedOrdersV147(role: (typeof HOUND_APTITUDES_V147)[HoundAptitudeV147]): readonly HoundOrderDefinitionV147[] {
  return HOUND_ORDERS_V147.map(order => order.id === "signature"
    ? { ...order, defined: true, label: role.signatureLabel, effect: role.signatureEffect }
    : order);
}

const ordersByAptitude = {
  tracker: supportedOrdersV147(HOUND_APTITUDES_V147.tracker),
  driver: supportedOrdersV147(HOUND_APTITUDES_V147.driver),
  guard: supportedOrdersV147(HOUND_APTITUDES_V147.guard),
} satisfies Record<HoundAptitudeV147, readonly HoundOrderDefinitionV147[]>;

export function houndOrdersV147(aptitude?: HoundAptitudeV147): readonly HoundOrderDefinitionV147[] {
  return aptitude ? ordersByAptitude[aptitude] : HOUND_ORDERS_V147;
}

export function houndOrderModeV147(
  order: HoundOrderIdV147, aptitude?: HoundAptitudeV147,
): Exclude<HoundOrderIdV147, "signature"> | null {
  if (order !== "signature") return order;
  return aptitude ? HOUND_APTITUDES_V147[aptitude].mode : null;
}

export function clampBondV147(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(HOUND_BOND_MAX_V147, Math.floor(n)));
}

export function isOrderUnlockedV147(order: HoundOrderIdV147, bond: number, aptitude?: HoundAptitudeV147): boolean {
  const definition = houndOrdersV147(aptitude).find(entry => entry.id === order);
  return !!definition && definition.defined && clampBondV147(bond) >= definition.bond;
}

export function unlockedOrdersV147(bond: number, aptitude?: HoundAptitudeV147): HoundOrderIdV147[] {
  return houndOrdersV147(aptitude).filter(entry => entry.defined && clampBondV147(bond) >= entry.bond).map(entry => entry.id);
}

/** Next threshold still to reach, or null at 100. */
export function nextBondThresholdV147(bond: number): number | null {
  const value = clampBondV147(bond);
  return HOUND_BOND_THRESHOLDS_V147.find(threshold => threshold > value) ?? null;
}

// ---------------------------------------------------------------------------
// Campaign state
// ---------------------------------------------------------------------------

export type HoundConditionV147 = "ready" | "wounded" | "dead";

export interface HoundV147 {
  /** Stable identity; a dead identity is never recruited again. */
  id: string;
  name: string;
  /** Visual reference in companionCatalogueV56, when one was chosen. */
  catalogueId: string | null;
  bond: number;
  condition: HoundConditionV147;
  /** Last session that changed the bond and how much it already gave. */
  sessionId: string | null;
  sessionGain: number;
  woundedAt: string | null;
  diedAt: string | null;
}

export interface HuntingHoundsV147 {
  version: 1;
  hounds: HoundV147[];
  /**
   * Hound chosen at the kennel for the next hunt. Optional: absent when no
   * hound was chosen, so states written before the kennel keep their shape.
   */
  activeHoundId?: string;
}

export const HOUNDS_MAX_V147 = 12;

export function emptyHuntingHoundsV147(): HuntingHoundsV147 {
  return { version: 1, hounds: [] };
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

export function normalizeHoundV147(raw: unknown): HoundV147 | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id)) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : raw.id;
  const diedAt = isIso(raw.diedAt) ? raw.diedAt : null;
  // A recorded death is final even if the condition field was altered.
  const condition: HoundConditionV147 = diedAt || raw.condition === "dead"
    ? "dead" : raw.condition === "wounded" ? "wounded" : "ready";
  const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId.slice(0, 120) : null;
  const sessionGain = sessionId && typeof raw.sessionGain === "number" && Number.isFinite(raw.sessionGain)
    ? Math.max(0, Math.min(HOUND_SESSION_GAIN_CAP_V147, Math.floor(raw.sessionGain))) : 0;
  return {
    id: raw.id, name,
    catalogueId: typeof raw.catalogueId === "string" && ID_PATTERN.test(raw.catalogueId) ? raw.catalogueId : null,
    bond: clampBondV147(raw.bond),
    condition,
    sessionId, sessionGain,
    woundedAt: condition === "wounded" && isIso(raw.woundedAt) ? raw.woundedAt : null,
    diedAt: condition === "dead" ? diedAt ?? new Date(0).toISOString() : null,
  };
}

export function normalizeHuntingHoundsV147(source: unknown): HuntingHoundsV147 {
  const result = emptyHuntingHoundsV147();
  if (!isRecord(source) || source.version !== 1 || !Array.isArray(source.hounds)) return result;
  const seen = new Set<string>();
  for (const raw of source.hounds) {
    const hound = normalizeHoundV147(raw);
    if (!hound || seen.has(hound.id)) continue;
    seen.add(hound.id);
    result.hounds.push(hound);
    if (result.hounds.length >= HOUNDS_MAX_V147) break;
  }
  // The choice survives a wound (the kennel shows it as waiting for care) but
  // never a death or an unknown identity.
  if (typeof source.activeHoundId === "string" &&
      result.hounds.some(entry => entry.id === source.activeHoundId && entry.condition !== "dead"))
    result.activeHoundId = source.activeHoundId;
  return result;
}

/** Import guard: a newer hound format is refused rather than reduced. */
export function isFutureHuntingHoundsV147(source: unknown): boolean {
  return isRecord(source) && Number(source.version) > 1;
}

export type HoundRefusalV147 =
  | "unknown-hound" | "dead" | "wounded" | "not-wounded" | "not-at-kennel"
  | "already-recruited" | "fallen-identity" | "invalid-id" | "roster-full";

export type HoundChangeV147 =
  | { readonly ok: true; readonly state: HuntingHoundsV147 }
  | { readonly ok: false; readonly reason: HoundRefusalV147 };

const replaceHound = (state: HuntingHoundsV147, hound: HoundV147): HuntingHoundsV147 => {
  const next: HuntingHoundsV147 = { ...state, hounds: state.hounds.map(entry => entry.id === hound.id ? hound : entry) };
  // A dead hound cannot stay chosen for the next hunt.
  if (hound.condition === "dead" && next.activeHoundId === hound.id) delete next.activeHoundId;
  return next;
};

/** Entry point for a future recruitment flow; a fallen identity stays fallen. */
export function recruitHoundV147(
  state: HuntingHoundsV147,
  input: { id: string; name: string; catalogueId?: string | null },
): HoundChangeV147 {
  if (!ID_PATTERN.test(input.id)) return { ok: false, reason: "invalid-id" };
  const existing = state.hounds.find(entry => entry.id === input.id);
  if (existing) return { ok: false, reason: existing.condition === "dead" ? "fallen-identity" : "already-recruited" };
  if (state.hounds.length >= HOUNDS_MAX_V147) return { ok: false, reason: "roster-full" };
  const hound = normalizeHoundV147({ id: input.id, name: input.name, catalogueId: input.catalogueId ?? null, bond: 0 });
  return hound ? { ok: true, state: { ...state, hounds: [...state.hounds, hound] } } : { ok: false, reason: "invalid-id" };
}

export function canHoundJoinHuntV147(state: HuntingHoundsV147, houndId: string): HoundRefusalV147 | null {
  const hound = state.hounds.find(entry => entry.id === houndId);
  if (!hound) return "unknown-hound";
  if (hound.condition === "dead") return "dead";
  if (hound.condition === "wounded") return "wounded";
  return null;
}

/**
 * Chooses the hound that joins the next hunt, or none (`null`). Only a hound
 * able to join (known, alive, not wounded) can be chosen.
 */
export function selectHoundForHuntV147(state: HuntingHoundsV147, houndId: string | null): HoundChangeV147 {
  if (houndId === null) {
    if (state.activeHoundId === undefined) return { ok: true, state };
    const { activeHoundId: _dropped, ...rest } = state;
    void _dropped;
    return { ok: true, state: rest };
  }
  const refusal = canHoundJoinHuntV147(state, houndId);
  if (refusal) return { ok: false, reason: refusal };
  return state.activeHoundId === houndId ? { ok: true, state } : { ok: true, state: { ...state, activeHoundId: houndId } };
}

/** The chosen hound, only while it can really join a hunt (ready). */
export function activeHoundV147(state: HuntingHoundsV147 | null | undefined): HoundV147 | null {
  if (!state || !state.activeHoundId) return null;
  const hound = state.hounds.find(entry => entry.id === state.activeHoundId);
  return hound && hound.condition === "ready" ? hound : null;
}

/**
 * Adds bond for one session, never more than 5 in total for that session id.
 * Returns the state unchanged (ok) when the cap is already reached.
 */
export function gainBondV147(
  state: HuntingHoundsV147, houndId: string, sessionId: string, requested: number,
): HoundChangeV147 {
  const hound = state.hounds.find(entry => entry.id === houndId);
  if (!hound) return { ok: false, reason: "unknown-hound" };
  if (hound.condition === "dead") return { ok: false, reason: "dead" };
  const already = hound.sessionId === sessionId ? hound.sessionGain : 0;
  const wanted = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  const gain = Math.min(wanted, HOUND_SESSION_GAIN_CAP_V147 - already, HOUND_BOND_MAX_V147 - hound.bond);
  if (gain <= 0) return { ok: true, state };
  return { ok: true, state: replaceHound(state, {
    ...hound, bond: hound.bond + gain, sessionId, sessionGain: already + gain,
  }) };
}

export function woundHoundV147(state: HuntingHoundsV147, houndId: string, at: string): HoundChangeV147 {
  const hound = state.hounds.find(entry => entry.id === houndId);
  if (!hound) return { ok: false, reason: "unknown-hound" };
  if (hound.condition === "dead") return { ok: false, reason: "dead" };
  if (hound.condition === "wounded") return { ok: true, state };
  return { ok: true, state: replaceHound(state, { ...hound, condition: "wounded", woundedAt: isIso(at) ? at : null }) };
}

/** Heal only at the Chenil des Pisteurs (CITY-28). A dead hound is never healed. */
export function healHoundAtKennelV147(state: HuntingHoundsV147, houndId: string, locationId: string): HoundChangeV147 {
  const hound = state.hounds.find(entry => entry.id === houndId);
  if (!hound) return { ok: false, reason: "unknown-hound" };
  if (hound.condition === "dead") return { ok: false, reason: "dead" };
  if (hound.condition !== "wounded") return { ok: false, reason: "not-wounded" };
  if (locationId !== HOUND_KENNEL_LOCATION_V147) return { ok: false, reason: "not-at-kennel" };
  return { ok: true, state: replaceHound(state, { ...hound, condition: "ready", woundedAt: null }) };
}

/** Permanent death (CORE-R17). The record stays for the mausoleum and scenes. */
export function killHoundV147(state: HuntingHoundsV147, houndId: string, at: string): HoundChangeV147 {
  const hound = state.hounds.find(entry => entry.id === houndId);
  if (!hound) return { ok: false, reason: "unknown-hound" };
  if (hound.condition === "dead") return { ok: true, state };
  return { ok: true, state: replaceHound(state, {
    ...hound, condition: "dead", woundedAt: null, diedAt: isIso(at) ? at : new Date(0).toISOString(),
  }) };
}

// ---------------------------------------------------------------------------
// Hunt report (applied once per mission result)
// ---------------------------------------------------------------------------

export interface HoundHuntReportV147 {
  houndId: string;
  /** Orders the hound carried out to the end during this hunt. */
  ordersCompleted: number;
  wounded: boolean;
  died: boolean;
}

export function normalizeHoundHuntReportV147(raw: unknown): HoundHuntReportV147 | null {
  if (!isRecord(raw) || typeof raw.houndId !== "string" || !ID_PATTERN.test(raw.houndId)) return null;
  const orders = typeof raw.ordersCompleted === "number" && Number.isFinite(raw.ordersCompleted)
    ? Math.max(0, Math.min(99, Math.floor(raw.ordersCompleted))) : 0;
  return { houndId: raw.houndId, ordersCompleted: orders, wounded: raw.wounded === true, died: raw.died === true };
}

/**
 * Proposed gain rule: +1 per order carried out to the end, capped by the
 * session cap. A hound that died gains nothing.
 */
export function huntBondGainV147(report: HoundHuntReportV147): number {
  return report.died ? 0 : Math.min(HOUND_SESSION_GAIN_CAP_V147, report.ordersCompleted);
}

export function huntSessionIdV147(missionId: string, completedAt: string): string {
  return `hunt:${missionId}@${completedAt}`;
}

/**
 * Applies a hunt report. Only a hound that could join the hunt (ready) is
 * affected; a report for a wounded or dead hound is ignored. Idempotent for
 * the same session id.
 */
export function applyHoundHuntReportV147(
  state: HuntingHoundsV147, report: HoundHuntReportV147, sessionId: string, at: string,
): HuntingHoundsV147 {
  const hound = state.hounds.find(entry => entry.id === report.houndId);
  // Unknown, unable to join (wounded/dead) or already applied: unchanged.
  if (!hound || hound.condition !== "ready" || hound.sessionId === sessionId) return state;
  let next = state;
  const gained = gainBondV147(next, report.houndId, sessionId, huntBondGainV147(report));
  if (gained.ok) next = gained.state;
  // Mark the session even without gain so a replay is recognised.
  const after = next.hounds.find(entry => entry.id === report.houndId)!;
  if (after.sessionId !== sessionId) next = replaceHound(next, { ...after, sessionId, sessionGain: 0 });
  if (report.died) {
    const killed = killHoundV147(next, report.houndId, at);
    return killed.ok ? killed.state : next;
  }
  if (report.wounded) {
    const wounded = woundHoundV147(next, report.houndId, at);
    return wounded.ok ? wounded.state : next;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Honour: a hound kill is the player's kill (proposed in the bible)
// ---------------------------------------------------------------------------

export type KillSourceV147 = "melee" | "weapon" | "hound";

export interface KillHonorV147 {
  id: string;
  label: string;
  value: number;
  kind: "honorable-kill" | "duel";
  /** Always the player: the honour code makes no exception for the hound. */
  creditedTo: "player";
}

/**
 * Same event ids and values as the hunt (HuntCanvas `damageEnemy`): the
 * hound's kill uses the player's event id, so it is counted once, and it is
 * valued like a kill at range (it is not the hunter's own duel).
 */
export function killHonorV147(input: {
  enemyId: string; boss: boolean; targetName: string; source: KillSourceV147;
}): KillHonorV147 {
  const close = input.source === "melee";
  if (input.boss) {
    return { id: "boss-honorable-kill", creditedTo: "player",
      label: input.source === "hound" ? `Victoire sur ${input.targetName} (par ton chien)` : `Victoire sur ${input.targetName}`,
      value: close ? 18 : 10, kind: close ? "duel" : "honorable-kill" };
  }
  return { id: `kill-${input.enemyId}`, creditedTo: "player",
    label: close ? "Mise à mort rapprochée" : input.source === "hound" ? "Proie abattue par ton chien" : "Proie neutralisée",
    value: close ? 3 : 1, kind: "honorable-kill" };
}

// ---------------------------------------------------------------------------
// In-hunt controller (driven by HuntCanvas for the hound that joined the hunt)
// ---------------------------------------------------------------------------

export interface FieldPreyV147 {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
  /** Seconds since the prey left its trail; lower = fresher. */
  readonly trailAge?: number;
}

export interface HoundFieldV147 {
  houndId: string;
  aptitude?: HoundAptitudeV147;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  order: HoundOrderIdV147;
  targetId: string | null;
  biteCooldown: number;
  /** Order already carried out to the end (counted once). */
  orderDone: boolean;
  ordersCompleted: number;
  markedIds: string[];
  wounded: boolean;
  dead: boolean;
}

export type HoundFieldEventV147 =
  | { type: "returned" }
  | { type: "marked"; preyId: string; visibleSeconds?: number }
  | { type: "push"; preyId: string; dx: number; dy: number }
  | { type: "driven"; preyId: string }
  | { type: "bite"; preyId: string; damage: number }
  | { type: "attack-done"; preyId: string }
  | { type: "target-lost"; preyId: string };

export const HOUND_FIELD_V147 = Object.freeze({
  speed: 260, heelDistance: 48, markDistance: 140, flankOffset: 90,
  pushSpeed: 70, drivenDistance: 160, biteDistance: 36, biteDamage: 12, biteInterval: 0.9,
  /** At or below this share of health the hound is wounded and only obeys recall. */
  woundedShare: 0.4,
});

export function createHoundFieldV147(hound: HoundV147, at: { x: number; y: number }, maxHealth?: number): HoundFieldV147 {
  const aptitude = houndAptitudeV147(hound.catalogueId);
  const health = maxHealth ?? (aptitude ? HOUND_APTITUDES_V147[aptitude].health : 60);
  return { houndId: hound.id, ...(aptitude ? { aptitude } : {}), x: at.x, y: at.y,
    health, maxHealth: health, order: "recall", targetId: null,
    biteCooldown: 0, orderDone: true, ordersCompleted: 0, markedIds: [], wounded: false, dead: false };
}

export type HoundOrderRefusalV147 = "locked" | "undefined-order" | "wounded" | "dead" | "no-target";

export function issueHoundOrderV147(
  field: HoundFieldV147, order: HoundOrderIdV147, bond: number, targetId: string | null = null,
): { ok: true; field: HoundFieldV147 } | { ok: false; reason: HoundOrderRefusalV147 } {
  if (field.dead) return { ok: false, reason: "dead" };
  const mode = houndOrderModeV147(order, field.aptitude);
  if (!mode || !HOUND_ORDER_IDS_V147.includes(order)) return { ok: false, reason: "undefined-order" };
  if (!isOrderUnlockedV147(order, bond, field.aptitude)) return { ok: false, reason: "locked" };
  if (field.wounded && order !== "recall") return { ok: false, reason: "wounded" };
  if (mode === "attack" && !targetId) return { ok: false, reason: "no-target" };
  return { ok: true, field: { ...field, order, targetId, orderDone: false, markedIds: [...field.markedIds] } };
}

export function damageHoundFieldV147(field: HoundFieldV147, amount: number): HoundFieldV147 {
  if (field.dead) return field;
  const health = Math.max(0, field.health - Math.max(0, amount));
  const dead = health <= 0;
  const wounded = !dead && health <= field.maxHealth * HOUND_FIELD_V147.woundedShare;
  // A wounded hound drops its order and comes back to the hunter.
  return { ...field, health, dead, wounded: field.wounded || wounded,
    ...(wounded && !field.wounded ? { order: "recall" as const, targetId: null, orderDone: true } : {}) };
}

function moveToward(field: HoundFieldV147, x: number, y: number, dt: number): number {
  const dx = x - field.x, dy = y - field.y, distance = Math.hypot(dx, dy);
  const speed = field.aptitude ? HOUND_APTITUDES_V147[field.aptitude].speed : HOUND_FIELD_V147.speed;
  const step = Math.min(distance, speed * dt);
  if (distance > 0) { field.x += dx / distance * step; field.y += dy / distance * step; }
  return distance - step;
}

function freshestPrey(prey: readonly FieldPreyV147[], from: HoundFieldV147, skip: readonly string[]): FieldPreyV147 | null {
  const candidates = prey.filter(entry => entry.alive && !skip.includes(entry.id));
  candidates.sort((a, b) => (a.trailAge ?? Infinity) - (b.trailAge ?? Infinity) ||
    Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
  return candidates[0] ?? null;
}

/** One simulation step. The caller applies `push` moves and `bite` damage. */
export function stepHoundFieldV147(
  current: HoundFieldV147,
  input: { dt: number; player: { x: number; y: number }; prey: readonly FieldPreyV147[] },
): { field: HoundFieldV147; events: HoundFieldEventV147[] } {
  const field: HoundFieldV147 = { ...current, markedIds: [...current.markedIds] };
  const events: HoundFieldEventV147[] = [];
  if (field.dead) return { field, events };
  const dt = Math.max(0, Math.min(0.1, input.dt));
  field.biteCooldown = Math.max(0, field.biteCooldown - dt);
  const complete = () => { if (!field.orderDone) { field.orderDone = true; field.ordersCompleted += 1; } };
  const target = () => input.prey.find(entry => entry.id === field.targetId && entry.alive) ?? null;
  const heel = () => moveToward(field, input.player.x, input.player.y, dt) <= HOUND_FIELD_V147.heelDistance;

  const mode = houndOrderModeV147(field.order, field.aptitude);
  const role = field.aptitude ? HOUND_APTITUDES_V147[field.aptitude] : null;
  const signature = field.order === "signature";

  switch (mode) {
    case "recall": {
      const wasAway = Math.hypot(field.x - input.player.x, field.y - input.player.y) > HOUND_FIELD_V147.heelDistance;
      if (heel() && !field.orderDone) {
        // The first deliberate recall establishes contact even if the hound is close.
        if (wasAway || field.ordersCompleted === 0 && !field.wounded) complete();
        else field.orderDone = true;
        events.push({ type: "returned" });
      }
      break;
    }
    case "track": {
      if (field.orderDone) { heel(); break; }
      let prey = target();
      if (!prey) { prey = freshestPrey(input.prey, field, field.markedIds); field.targetId = prey?.id ?? null; }
      if (!prey) { heel(); break; }
      const markDistance = (role?.markDistance ?? HOUND_FIELD_V147.markDistance) + (signature ? 65 : 0);
      if (moveToward(field, prey.x, prey.y, dt) <= markDistance) {
        field.markedIds.push(prey.id);
        complete();
        events.push({ type: "marked", preyId: prey.id, ...(signature ? { visibleSeconds: 12 } : {}) });
      }
      break;
    }
    case "drive": {
      if (field.orderDone) { heel(); break; }
      let prey = target();
      if (!prey) { prey = freshestPrey(input.prey, field, []); field.targetId = prey?.id ?? null; }
      if (!prey) { heel(); break; }
      const away = Math.sign(prey.x - input.player.x) || 1;
      const flankX = prey.x + away * HOUND_FIELD_V147.flankOffset;
      if (moveToward(field, flankX, prey.y, dt) <= 20) {
        const dx = input.player.x - prey.x, dy = input.player.y - prey.y, distance = Math.hypot(dx, dy);
        const drivenDistance = signature ? 105 : HOUND_FIELD_V147.drivenDistance;
        if (distance <= drivenDistance) { complete(); events.push({ type: "driven", preyId: prey.id }); }
        else {
          const step = (role?.pushSpeed ?? HOUND_FIELD_V147.pushSpeed) * dt;
          events.push({ type: "push", preyId: prey.id, dx: dx / distance * step, dy: dy / distance * step });
        }
      }
      break;
    }
    case "attack": {
      const prey = target();
      if (!prey) {
        if (field.targetId && !field.orderDone) {
          if (input.prey.some(entry => entry.id === field.targetId && !entry.alive)) {
            complete();
            events.push({ type: "attack-done", preyId: field.targetId });
          } else {
            field.orderDone = true;
            events.push({ type: "target-lost", preyId: field.targetId });
          }
        }
        heel();
        break;
      }
      if (field.orderDone) { heel(); break; }
      if (moveToward(field, prey.x, prey.y, dt) <= HOUND_FIELD_V147.biteDistance && field.biteCooldown === 0) {
        field.biteCooldown = HOUND_FIELD_V147.biteInterval;
        const damage = HOUND_FIELD_V147.biteDamage + (signature ? 8 : 0);
        events.push({ type: "bite", preyId: prey.id, damage });
        if (signature) complete();
      }
      break;
    }
    case null:
      break;
  }
  return { field, events };
}

/** End-of-hunt report from the field state (for MissionResult.houndV147). */
export function houndHuntReportFromFieldV147(field: HoundFieldV147): HoundHuntReportV147 {
  return { houndId: field.houndId, ordersCompleted: field.ordersCompleted, wounded: field.wounded, died: field.dead };
}

// ---------------------------------------------------------------------------
// Hunt wiring helpers (input, target, checkpoint)
// ---------------------------------------------------------------------------

/** Orders that can be given by cycling, in bible order. */
const CYCLE_ORDERS_V147: readonly HoundOrderIdV147[] = HOUND_ORDER_IDS_V147;

/**
 * Next usable order after `current` for the "next order" key. Attack is
 * skipped without a designated prey, so the cycle never stalls on it.
 */
export function nextHoundOrderV147(
  current: HoundOrderIdV147, bond: number, hasTarget: boolean, aptitude?: HoundAptitudeV147,
): HoundOrderIdV147 {
  const usable = CYCLE_ORDERS_V147.filter(order => isOrderUnlockedV147(order, bond, aptitude) &&
    (houndOrderModeV147(order, aptitude) !== "attack" || hasTarget));
  if (usable.length === 0) return "recall";
  const index = usable.indexOf(current);
  return usable[(index + 1) % usable.length];
}

export const HOUND_STICK_THRESHOLD_V147 = 0.6;

/**
 * Right stick of the gamepad: up Pister, right Rabattre, left Attaquer, down
 * Revenir. Returns null inside the dead zone. The caller edge-detects.
 */
export function houndStickOrderV147(axisX: unknown, axisY: unknown): HoundOrderIdV147 | null {
  const x = typeof axisX === "number" && Number.isFinite(axisX) ? axisX : 0;
  const y = typeof axisY === "number" && Number.isFinite(axisY) ? axisY : 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < HOUND_STICK_THRESHOLD_V147) return null;
  if (Math.abs(y) >= Math.abs(x)) return y < 0 ? "track" : "recall";
  return x > 0 ? "drive" : "attack";
}

export const HOUND_TARGET_RANGE_V147 = 720;

/**
 * Prey designated for Attaquer: the closest live prey to `aim` when the hunter
 * aims, otherwise the closest one in front of the hunter, otherwise the
 * closest one, always within range of the hunter.
 */
export function pickHoundTargetV147(
  hunter: { x: number; y: number; facing: number; aim?: { x: number; y: number } | null },
  prey: readonly FieldPreyV147[], range = HOUND_TARGET_RANGE_V147,
): FieldPreyV147 | null {
  const near = prey.filter(entry => entry.alive && Math.hypot(entry.x - hunter.x, entry.y - hunter.y) <= range);
  if (near.length === 0) return null;
  const closestTo = (list: readonly FieldPreyV147[], x: number, y: number) =>
    [...list].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  if (hunter.aim) return closestTo(near, hunter.aim.x, hunter.aim.y);
  const ahead = near.filter(entry => (entry.x - hunter.x) * (hunter.facing < 0 ? -1 : 1) >= 0);
  return closestTo(ahead.length ? ahead : near, hunter.x, hunter.y);
}

export const HOUND_FIELD_SNAPSHOT_VERSION_V147 = 2 as const;

export interface HoundFieldSnapshotV147 extends HoundFieldV147 {
  version: typeof HOUND_FIELD_SNAPSHOT_VERSION_V147;
}

/** JSON form stored in a hunt checkpoint (optional field). */
export function snapshotHoundFieldV147(field: HoundFieldV147): HoundFieldSnapshotV147 {
  return { version: HOUND_FIELD_SNAPSHOT_VERSION_V147, ...field, markedIds: [...field.markedIds] };
}

/** A checkpoint written by a newer hound format is refused, never reduced. */
export function isFutureHoundFieldV147(raw: unknown): boolean {
  return isRecord(raw) && Number(raw.version) > HOUND_FIELD_SNAPSHOT_VERSION_V147;
}

/**
 * Strict reader for a checkpointed hound. Returns null for anything that is
 * not a coherent supported field (including a future version).
 */
export function restoreHoundFieldV147(raw: unknown): HoundFieldV147 | null {
  if (!isRecord(raw) || (raw.version !== 1 && raw.version !== HOUND_FIELD_SNAPSHOT_VERSION_V147)) return null;
  const aptitude = raw.aptitude;
  if (aptitude !== undefined && (
    raw.version === 1 || typeof aptitude !== "string" || !Object.hasOwn(HOUND_APTITUDES_V147, aptitude)
  )) return null;
  const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (typeof raw.houndId !== "string" || !ID_PATTERN.test(raw.houndId)) return null;
  if (![raw.x, raw.y, raw.health, raw.maxHealth, raw.biteCooldown, raw.ordersCompleted].every(finite)) return null;
  const maxHealth = raw.maxHealth as number, health = raw.health as number;
  if (maxHealth <= 0 || maxHealth > 10_000 || health < 0 || health > maxHealth) return null;
  if (typeof raw.order !== "string" || !(HOUND_ORDER_IDS_V147 as readonly string[]).includes(raw.order) ||
      (raw.order === "signature" && aptitude === undefined)) return null;
  if (raw.targetId !== null && (typeof raw.targetId !== "string" || raw.targetId.length > 160)) return null;
  if (!Array.isArray(raw.markedIds) || raw.markedIds.length > 512 ||
      raw.markedIds.some(id => typeof id !== "string" || id.length > 160)) return null;
  if (typeof raw.orderDone !== "boolean" || typeof raw.wounded !== "boolean" || typeof raw.dead !== "boolean") return null;
  const orders = raw.ordersCompleted as number;
  if (!Number.isInteger(orders) || orders < 0 || orders > 9_999) return null;
  const dead = raw.dead as boolean;
  if (dead !== (health <= 0)) return null;
  return {
    houndId: raw.houndId, ...(aptitude === undefined ? {} : { aptitude: aptitude as HoundAptitudeV147 }),
    x: raw.x as number, y: raw.y as number, health, maxHealth,
    order: raw.order as HoundOrderIdV147, targetId: raw.targetId as string | null,
    biteCooldown: Math.max(0, Math.min(HOUND_FIELD_V147.biteInterval, raw.biteCooldown as number)),
    orderDone: raw.orderDone, ordersCompleted: orders, markedIds: [...raw.markedIds as string[]],
    wounded: raw.wounded as boolean, dead,
  };
}
