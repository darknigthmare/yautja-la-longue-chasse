/**
 * V147 hunting hounds: orders and bond (campaign bible, "Chiens de chasse :
 * commandes").
 *
 * - Bond 0..100 on the model of the V6 mount bond: thresholds 25 / 50 / 75 /
 *   100 and at most +5 per session (one hunt = one session, keyed by the
 *   mission id and its completion time so a replayed result never adds more).
 * - Orders: Revenir (0), Pister (25), Rabattre (50), Attaquer (75). The
 *   signature order at 100 is not defined by the bible yet: it stays locked
 *   with the label "à définir", whatever the bond.
 * - A wounded hound cannot join a hunt until healed at the Chenil des
 *   Pisteurs (CITY-28). A dead hound never comes back (rule CORE-R17): no
 *   heal, no bond, no recruitment under the same identity.
 * - Honour (proposed in the bible): a kill made by the hound counts as made by
 *   the player for the honour code, same event id, same rules.
 *
 * Pure module: no React, no browser globals, no save writes. Recruitment is not
 * produced in the campaign; `recruitHoundV147` is the entry point a future
 * recruitment flow must call.
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
  /** False while the bible leaves the order undefined: never usable. */
  readonly defined: boolean;
}

export const HOUND_ORDERS_V147: readonly HoundOrderDefinitionV147[] = Object.freeze([
  { id: "recall", label: "Revenir", bond: 0, effect: "Rappel : le chien revient au pied.", defined: true },
  { id: "track", label: "Pister", bond: 25, effect: "Suit la trace la plus fraîche et marque la proie.", defined: true },
  { id: "drive", label: "Rabattre", bond: 50, effect: "Pousse la proie vers le joueur ou un piège.", defined: true },
  { id: "attack", label: "Attaquer", bond: 75, effect: "Immobilise ou abat la proie désignée.", defined: true },
  { id: "signature", label: "Ordre signature (à définir)", bond: 100, effect: "Propre à la race du chien ; à définir.", defined: false },
] as const);

export function clampBondV147(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(HOUND_BOND_MAX_V147, Math.floor(n)));
}

export function isOrderUnlockedV147(order: HoundOrderIdV147, bond: number): boolean {
  const definition = HOUND_ORDERS_V147.find(entry => entry.id === order);
  return !!definition && definition.defined && clampBondV147(bond) >= definition.bond;
}

export function unlockedOrdersV147(bond: number): HoundOrderIdV147[] {
  return HOUND_ORDERS_V147.filter(entry => isOrderUnlockedV147(entry.id, bond)).map(entry => entry.id);
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

const replaceHound = (state: HuntingHoundsV147, hound: HoundV147): HuntingHoundsV147 =>
  ({ ...state, hounds: state.hounds.map(entry => entry.id === hound.id ? hound : entry) });

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
// In-hunt controller (ready for a hound rendered in the hunt; none is yet)
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
  | { type: "marked"; preyId: string }
  | { type: "push"; preyId: string; dx: number; dy: number }
  | { type: "driven"; preyId: string }
  | { type: "bite"; preyId: string; damage: number }
  | { type: "attack-done"; preyId: string };

export const HOUND_FIELD_V147 = Object.freeze({
  speed: 260, heelDistance: 48, markDistance: 140, flankOffset: 90,
  pushSpeed: 70, drivenDistance: 160, biteDistance: 36, biteDamage: 12, biteInterval: 0.9,
  /** At or below this share of health the hound is wounded and only obeys recall. */
  woundedShare: 0.4,
});

export function createHoundFieldV147(hound: HoundV147, at: { x: number; y: number }, maxHealth = 60): HoundFieldV147 {
  return { houndId: hound.id, x: at.x, y: at.y, health: maxHealth, maxHealth, order: "recall", targetId: null,
    biteCooldown: 0, orderDone: false, ordersCompleted: 0, markedIds: [], wounded: false, dead: false };
}

export type HoundOrderRefusalV147 = "locked" | "undefined-order" | "wounded" | "dead" | "no-target";

export function issueHoundOrderV147(
  field: HoundFieldV147, order: HoundOrderIdV147, bond: number, targetId: string | null = null,
): { ok: true; field: HoundFieldV147 } | { ok: false; reason: HoundOrderRefusalV147 } {
  if (field.dead) return { ok: false, reason: "dead" };
  const definition = HOUND_ORDERS_V147.find(entry => entry.id === order);
  if (!definition || !definition.defined) return { ok: false, reason: "undefined-order" };
  if (!isOrderUnlockedV147(order, bond)) return { ok: false, reason: "locked" };
  if (field.wounded && order !== "recall") return { ok: false, reason: "wounded" };
  if (order === "attack" && !targetId) return { ok: false, reason: "no-target" };
  return { ok: true, field: { ...field, order, targetId, orderDone: false, markedIds: [...field.markedIds] } };
}

export function damageHoundFieldV147(field: HoundFieldV147, amount: number): HoundFieldV147 {
  if (field.dead) return field;
  const health = Math.max(0, field.health - Math.max(0, amount));
  const dead = health <= 0;
  const wounded = !dead && health <= field.maxHealth * HOUND_FIELD_V147.woundedShare;
  // A wounded hound drops its order and comes back to the hunter.
  return { ...field, health, dead, wounded: field.wounded || wounded,
    ...(wounded && !field.wounded ? { order: "recall" as const, targetId: null, orderDone: false } : {}) };
}

function moveToward(field: HoundFieldV147, x: number, y: number, dt: number): number {
  const dx = x - field.x, dy = y - field.y, distance = Math.hypot(dx, dy);
  const step = Math.min(distance, HOUND_FIELD_V147.speed * dt);
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

  switch (field.order) {
    case "recall":
      if (heel() && !field.orderDone) { complete(); events.push({ type: "returned" }); }
      break;
    case "track": {
      if (field.orderDone) { heel(); break; }
      let prey = target();
      if (!prey) { prey = freshestPrey(input.prey, field, field.markedIds); field.targetId = prey?.id ?? null; }
      if (!prey) { heel(); break; }
      if (moveToward(field, prey.x, prey.y, dt) <= HOUND_FIELD_V147.markDistance) {
        field.markedIds.push(prey.id); complete(); events.push({ type: "marked", preyId: prey.id });
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
        if (distance <= HOUND_FIELD_V147.drivenDistance) { complete(); events.push({ type: "driven", preyId: prey.id }); }
        else {
          const step = HOUND_FIELD_V147.pushSpeed * dt;
          events.push({ type: "push", preyId: prey.id, dx: dx / distance * step, dy: dy / distance * step });
        }
      }
      break;
    }
    case "attack": {
      const prey = target();
      if (!prey) {
        if (field.targetId && !field.orderDone) { complete(); events.push({ type: "attack-done", preyId: field.targetId }); }
        heel(); break;
      }
      if (moveToward(field, prey.x, prey.y, dt) <= HOUND_FIELD_V147.biteDistance && field.biteCooldown === 0) {
        field.biteCooldown = HOUND_FIELD_V147.biteInterval;
        events.push({ type: "bite", preyId: prey.id, damage: HOUND_FIELD_V147.biteDamage });
      }
      break;
    }
    case "signature":
      break;
  }
  return { field, events };
}

/** End-of-hunt report from the field state (for MissionResult.houndV147). */
export function houndHuntReportFromFieldV147(field: HoundFieldV147): HoundHuntReportV147 {
  return { houndId: field.houndId, ordersCompleted: field.ordersCompleted, wounded: field.wounded, died: field.dead };
}
