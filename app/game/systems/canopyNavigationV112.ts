import {
  canopySegmentClearV112,
  canopySupportReachableV112,
  canopySwingPointV112,
  isFlexibleCanopySupportV112,
  type CanopySwingV112,
} from "./canopyTraversalV112";
import { overlapsSolidPlatform } from "./platformCollision";
import type {
  ClimbableKind,
  WorldClimbable,
  WorldHazard,
  WorldPlatform,
  WorldPoint,
  WorldRect,
} from "./worldBlueprints";

export type CanopyGripStateV112 = "held" | "ready" | "out-of-reach" | "blocked" |
  "exhausted" | "cooldown" | "low-stamina" | "locked";

export interface CanopyNavigationMarkerV112 {
  id: string;
  kind: "grip" | "rest";
  label: string;
  point: WorldPoint;
  distancePx: number;
  state: CanopyGripStateV112 | "resting" | "waypoint";
  reason: string;
  supportKind?: ClimbableKind;
  flexible?: boolean;
}

export interface CanopyGripNavigationV112 extends CanopyNavigationMarkerV112 {
  kind: "grip";
  supportKind: ClimbableKind;
  flexible: boolean;
  state: CanopyGripStateV112;
  /** Current field-load multiplier, applied to the real support's idle drain. */
  staminaPerSecond: number;
}

export interface CanopyNavigationPlayerV112 extends WorldRect {
  facing: -1 | 1;
  grounded: boolean;
  climbing: boolean;
  stamina: number;
  climbZoneId?: string | null;
  climbGripExhausted?: boolean;
  climbReattachSeconds?: number;
  canopySwing?: CanopySwingV112 | null;
}

export interface CanopyNavigationV112 {
  visible: boolean;
  mode: "distant" | "approach" | "ready" | "climbing" | "swinging" | "resting" | "exhausted" | "locked";
  heldGrip: CanopyGripNavigationV112 | null;
  nearbyGrip: CanopyGripNavigationV112 | null;
  availableGrip: CanopyGripNavigationV112 | null;
  nextGrip: CanopyGripNavigationV112 | null;
  rest: CanopyNavigationMarkerV112 | null;
  markers: CanopyNavigationMarkerV112[];
  stamina: number;
  minimumGripStamina: number;
  recoveryBlocked: boolean;
}

const SUPPORT_LABELS: Readonly<Record<ClimbableKind, string>> = {
  tree: "Arbre", vine: "Liane", rope: "Corde", chain: "Chaîne",
  "rock-face": "Paroi rocheuse", "ice-wall": "Paroi de glace",
  ladder: "Échelle", "basalt-column": "Colonne de basalte",
};
const VIEW_DISTANCE = 480;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const overlaps = (a: WorldRect, b: WorldRect) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;
const tieById = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Read-only navigation from the same geometry as the simulation. A distant
 * marker is a landmark, never a prediction that a jump will succeed. */
export function canopyNavigationV112(options: {
  player: CanopyNavigationPlayerV112;
  climbables: readonly WorldClimbable[];
  platforms: readonly WorldPlatform[];
  hazards?: readonly WorldHazard[];
  floorY: number;
  minimumGripStamina: number;
  staminaMultiplier?: number;
  actionLocked?: boolean;
}): CanopyNavigationV112 {
  const { player, climbables, platforms, floorY, minimumGripStamina } = options;
  if (!Number.isFinite(minimumGripStamina) || minimumGripStamina < 0)
    throw new RangeError("Canopy navigation requires the runtime grip threshold");
  const stamina = Number.isFinite(player.stamina) ? Math.max(0, player.stamina) : 0;
  const multiplier = clamp(Number.isFinite(options.staminaMultiplier) ? options.staminaMultiplier ?? 1 : 1, 1, 3);
  const center = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
  const hand = { x: center.x, y: player.y + player.height * 0.28 };
  const feet = { x: center.x, y: player.y + player.height };
  const recoveryBlocked = !!player.climbGripExhausted && !player.grounded;
  const cooldown = Number.isFinite(player.climbReattachSeconds) ? Math.max(0, player.climbReattachSeconds ?? 0) : 0;
  const hazards = options.hazards ?? [];
  const heldSupport = player.climbing && stamina > 0 && !player.climbGripExhausted
    ? climbables.find(s => s.id === player.climbZoneId && canopySupportReachableV112(player, s, platforms, player.canopySwing))
    : undefined;

  const describeGrip = (support: WorldClimbable, held = false): CanopyGripNavigationV112 => {
    const nearest = {
      x: clamp(center.x, support.x, support.x + support.width),
      y: clamp(center.y, support.y, support.y + support.height),
    };
    const point = held && player.canopySwing
      ? canopySwingPointV112(player.canopySwing, support)
      : { x: support.x + support.width / 2, y: clamp(hand.y, support.y, support.y + support.height) };
    let state: CanopyGripStateV112;
    let reason: string;
    if (held) { state = "held"; reason = "Prise tenue"; }
    else if (options.actionLocked) { state = "locked"; reason = "Termine ou annule le geste en cours"; }
    else if (recoveryBlocked) { state = "exhausted"; reason = "Atterris sur un appui avant une nouvelle prise"; }
    else if (cooldown > 0) { state = "cooldown"; reason = "Lâcher en cours : nouvelle prise après le délai de relâchement"; }
    else if (stamina < minimumGripStamina) { state = "low-stamina"; reason = `Endurance insuffisante : ${minimumGripStamina} points requis`; }
    else if (!canopySegmentClearV112(center, nearest, platforms)) { state = "blocked"; reason = "Obstacle solide entre le chasseur et la prise"; }
    else if (!canopySupportReachableV112(player, support, platforms)) { state = "out-of-reach"; reason = "Hors de portée : rapproche-toi de la vraie prise"; }
    else { state = "ready"; reason = "À portée : Haut pour prendre appui"; }
    return {
      id: support.id, kind: "grip", label: SUPPORT_LABELS[support.kind],
      point, distancePx: Math.hypot(nearest.x - center.x, nearest.y - center.y),
      state, reason, supportKind: support.kind, flexible: isFlexibleCanopySupportV112(support),
      staminaPerSecond: Math.max(0, support.staminaPerSecond) * multiplier,
    };
  };
  const heldGrip = heldSupport ? describeGrip(heldSupport, true) : null;
  const nearby = climbables.flatMap(support => {
    if (support.id === heldSupport?.id || Math.abs(support.x + support.width / 2 - center.x) > VIEW_DISTANCE) return [];
    const item = describeGrip(support);
    return item.distancePx <= VIEW_DISTANCE ? [item] : [];
  }).sort((a, b) => a.distancePx - b.distancePx || tieById(a, b));
  const nearbyGrip = nearby[0] ?? null;
  const availableGrip = nearby.find(grip => grip.state === "ready") ?? null;
  const nextGrip = nearby.filter(grip => (grip.point.x - center.x) * player.facing > 18)
    .sort((a, b) => Math.abs(a.point.x - center.x) - Math.abs(b.point.x - center.x) ||
      a.distancePx - b.distancePx || tieById(a, b))[0] ?? null;

  const standing = player.grounded && !player.climbing
    ? platforms.find(p => Math.abs(feet.y - p.y) <= 2 && player.x < p.x + p.width && player.x + player.width > p.x)
    : undefined;
  const restingOnFloor = player.grounded && !player.climbing && Math.abs(feet.y - floorY) <= 2;
  let rest: CanopyNavigationMarkerV112 | null = standing || restingOnFloor ? {
    id: standing?.id ?? "canopy-world-floor", kind: "rest", label: standing ? "Appui réel" : "Sol",
    point: { ...feet }, distancePx: 0, state: "resting",
    reason: hazards.some(h => h.damagePerSecond > 0 && overlaps(player, h))
      ? "Appui atteint, mais une zone dangereuse recouvre cet appui"
      : "Appui atteint : l’endurance récupère tant que tu restes posé",
  } : null;
  if (!rest) {
    const rests = platforms.flatMap(platform => {
      if (platform.routeId !== "canopy-transfer" && platform.routeId !== "canopy") return [];
      const point = { x: clamp(center.x, platform.x + Math.min(player.width / 2, platform.width / 2),
        platform.x + platform.width - Math.min(player.width / 2, platform.width / 2)), y: platform.y };
      const standingBody = { x: point.x - player.width / 2, y: point.y - player.height, width: player.width, height: player.height };
      const distancePx = Math.hypot(point.x - feet.x, point.y - feet.y);
      if (platform.width < player.width || distancePx > VIEW_DISTANCE || overlapsSolidPlatform(standingBody, platforms) ||
        hazards.some(h => h.damagePerSecond > 0 && overlaps(standingBody, h))) return [];
      return [{ id: platform.id, kind: "rest" as const, label: "Plateforme de repos", point, distancePx,
        state: "waypoint" as const, reason: "Repère de réception : rejoins la surface réelle pour récupérer" }];
    }).sort((a, b) => a.distancePx - b.distancePx || tieById(a, b));
    rest = rests[0] ?? null;
  }
  const markers = [heldGrip, availableGrip ?? nearbyGrip, nextGrip, rest].filter((item): item is CanopyNavigationMarkerV112 => item !== null)
    .filter((item, index, items) => items.findIndex(other => other.id === item.id) === index).slice(0, 4);
  const nearCanopy = !!heldGrip || nearby.length > 0 || !!rest && rest.state !== "resting";
  // A floor marker alone must not turn this into a permanent second HUD.
  const visible = nearCanopy || recoveryBlocked;
  const mode = options.actionLocked && visible ? "locked" : recoveryBlocked ? "exhausted" :
    heldGrip ? player.canopySwing ? "swinging" : "climbing" :
    rest?.state === "resting" && visible ? "resting" : availableGrip ? "ready" : visible ? "approach" : "distant";
  return { visible, mode, heldGrip, nearbyGrip, availableGrip, nextGrip, rest, markers: visible ? markers : [],
    stamina, minimumGripStamina, recoveryBlocked };
}
