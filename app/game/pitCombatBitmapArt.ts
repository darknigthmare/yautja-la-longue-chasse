import { PIT_FIGHTERS, type PitFighterId, type PitFighterState } from "./systems/pitCombat";

/** All 14 exact-ID PIT fighters: six V31 and eight preserved V5 plates. Fixed poses only. */
export const PIT_COMBAT_BITMAP_FIGHTER_IDS = [
  "jungle-hunter", "city-hunter", "scar", "celtic", "wolf", "feral-hunter",
  "berserker", "falconer", "kok-warlord",
  "scarface", "stone-heart", "valkyrie", "witch", "enforcer",
] as const satisfies readonly PitFighterId[];

export const PIT_V31_BITMAP_FIGHTER_IDS: readonly PitFighterId[] = [
  "city-hunter", "scarface", "stone-heart", "valkyrie", "witch", "enforcer",
];

export interface PitCombatBitmapArtDefinition {
  readonly fighterId: PitFighterId;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Constant midpoint of the illustrated feet, followed by the lowest support. */
  readonly pivot: readonly [number, number];
  /** Head/crown reference; weapon tips do not determine the body's scale. */
  readonly bodyTopY: number;
  readonly nativeFacing: "right" | "neutral";
  readonly kind: "static-bitmap";
}

// Measured on all delivered alpha PNGs; V31 identities and orientations visually reviewed.
// Feral and the Warlord face the viewer: do not invent a side or mirror them.
// Other plates have a rightward three-quarter presentation; mirroring is a
// provisional display convention, never a separately authored/canon side view.
const MEASUREMENTS: readonly [PitFighterId, number, number, number, number, number, "right" | "neutral"][] = [
  ["jungle-hunter", 775, 1514, 390, 1433, 81, "right"],
  ["city-hunter", 987, 1568, 560, 1484, 84, "right"],
  ["scar", 1139, 1356, 510, 1283, 142, "right"],
  ["celtic", 951, 1160, 382, 1098, 153, "right"],
  ["wolf", 804, 983, 396, 930, 68, "right"],
  ["feral-hunter", 1086, 1479, 587, 1400, 79, "neutral"],
  ["berserker", 1055, 1401, 531, 1326, 75, "right"],
  ["falconer", 974, 1009, 577, 955, 54, "right"],
  ["kok-warlord", 1102, 1219, 520, 1154, 65, "neutral"],
  ["scarface", 1083, 1568, 490, 1484, 84, "right"],
  ["stone-heart", 1038, 1568, 478, 1484, 84, "right"],
  ["valkyrie", 1047, 1568, 567, 1484, 84, "right"],
  ["witch", 1014, 1568, 399, 1484, 84, "right"],
  ["enforcer", 1095, 1568, 513, 1484, 84, "right"],
];
const DEFINITIONS: readonly PitCombatBitmapArtDefinition[] = MEASUREMENTS.map(([fighterId, width, height, px, py, bodyTopY, nativeFacing]) => Object.freeze({
  fighterId, src: "/game/sprites/" + (PIT_V31_BITMAP_FIGHTER_IDS.includes(fighterId) ? "v31" : "v5") + "/film-plates/" + fighterId + ".png",
  width, height, pivot: Object.freeze([px, py] as const), bodyTopY, nativeFacing,
  kind: "static-bitmap",
}));

export function getPitCombatBitmapArtDefinition(id: PitFighterId): PitCombatBitmapArtDefinition | null {
  return DEFINITIONS.find(definition => definition.fighterId === id) ?? null;
}
/** Full source rectangle after the same pivot, body scale and facing as draw.
 * Transparent padding is intentionally retained: framing must never cut a plate.
 * Available before image loading, so a late bitmap cannot change the camera.
 */
export function getPitCombatBitmapVisualBounds(
  fighter: PitFighterState,
  groundY: number,
): { x: number; y: number; width: number; height: number } | null {
  const art = getPitCombatBitmapArtDefinition(fighter.definitionId);
  if (!art || ![fighter.x, fighter.y, groundY].every(Number.isFinite) ||
    (fighter.facing !== 1 && fighter.facing !== -1)) return null;
  const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / (art.pivot[1] - art.bodyTopY);
  const direction = art.nativeFacing === "right" ? fighter.facing : 1;
  return {
    x: fighter.x - (direction === 1 ? art.pivot[0] : art.width - art.pivot[0]) * scale,
    y: groundY - fighter.y - art.pivot[1] * scale,
    width: art.width * scale,
    height: art.height * scale,
  };
}

export interface PitCombatBitmapArtBank {
  readonly images: ReadonlyMap<PitFighterId, HTMLImageElement>;
  readonly requestedIds: ReadonlySet<PitFighterId>;
  readonly readyIds: ReadonlySet<PitFighterId>;
  readonly failedIds: ReadonlySet<PitFighterId>;
  readonly cancelled: boolean;
}
export type PitCombatBitmapArtStatus = "static-bitmap" | "loading" | "missing";

export function getPitCombatBitmapArtStatus(bank: PitCombatBitmapArtBank | null, id: PitFighterId): PitCombatBitmapArtStatus {
  const definition = getPitCombatBitmapArtDefinition(id);
  if (!definition) return "missing";
  if (!bank || !bank.requestedIds.has(id)) return "loading";
  const image = bank.images.get(id);
  return !bank.cancelled && bank.readyIds.has(id) && image?.complete &&
    image.naturalWidth === definition.width && image.naturalHeight === definition.height
    ? "static-bitmap" : "missing";
}

function hasExpectedAlpha(image: HTMLImageElement, definition: PitCombatBitmapArtDefinition): boolean {
  if (!image.complete || image.naturalWidth !== definition.width || image.naturalHeight !== definition.height) return false;
  // Inspect once at load time. No color key, crop, deformation or source edit.
  const canvas = document.createElement("canvas");
  canvas.width = definition.width; canvas.height = definition.height;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    if (pixels.length !== canvas.width * canvas.height * 4) return false;
    let visible = false, transparent = false;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 16) visible = true;
      if (alpha === 0) transparent = true;
      if ((x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) && alpha > 8) return false;
    }
    return visible && transparent;
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
}

/** Load only the selected IDs; an abandoned selection cannot publish late images. */
export async function loadPitCombatBitmapArt(
  ids: readonly PitFighterId[],
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PitCombatBitmapArtBank> {
  const requestedIds = new Set(ids);
  const readyIds = new Set<PitFighterId>();
  const failedIds = new Set<PitFighterId>();
  const images = new Map<PitFighterId, HTMLImageElement>();
  const { signal } = options;
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1, Math.min(30_000, Math.floor(options.timeoutMs!))) : 12_000;
  const bank = (): PitCombatBitmapArtBank => ({ images, requestedIds, readyIds, failedIds, cancelled: Boolean(signal?.aborted) });
  if (signal?.aborted || typeof Image === "undefined" || typeof document === "undefined") {
    requestedIds.forEach(id => failedIds.add(id));
    return bank();
  }
  await Promise.all([...requestedIds].map(async id => {
    const definition = getPitCombatBitmapArtDefinition(id);
    if (!definition) { failedIds.add(id); return; }
    const image = await new Promise<HTMLImageElement | null>(resolve => {
      let candidate: HTMLImageElement;
      try { candidate = new Image(); } catch { resolve(null); return; }
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        candidate.onload = null; candidate.onerror = null;
        if (!success) { try { candidate.src = ""; } catch { /* Best-effort request cancellation. */ } }
        resolve(success && !signal?.aborted ? candidate : null);
      };
      const abort = () => finish(false);
      const timer = setTimeout(() => finish(false), timeoutMs);
      candidate.onload = () => {
        if (settled) return;
        try { finish(!signal?.aborted && hasExpectedAlpha(candidate, definition)); }
        catch { finish(false); }
      };
      candidate.onerror = () => finish(false);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) { finish(false); return; }
      try { candidate.src = definition.src; } catch { finish(false); }
    });
    if (image && !signal?.aborted) { images.set(id, image); readyIds.add(id); }
    else failedIds.add(id);
  }));
  if (signal?.aborted) {
    images.clear(); readyIds.clear();
    requestedIds.forEach(id => failedIds.add(id));
  }
  return bank();
}

/** Static presentation only: never write combat, action timers, hitboxes or saves. */
export function drawPitCombatBitmapFighter(
  context: CanvasRenderingContext2D,
  bank: PitCombatBitmapArtBank | null,
  fighter: PitFighterState,
  groundY: number,
  options: { highContrast?: boolean; accent?: string } = {},
): boolean {
  if (!bank || getPitCombatBitmapArtStatus(bank, fighter.definitionId) !== "static-bitmap" ||
    !Number.isFinite(fighter.x) || !Number.isFinite(fighter.y) || !Number.isFinite(groundY) ||
    (fighter.facing !== -1 && fighter.facing !== 1)) return false;
  const art = getPitCombatBitmapArtDefinition(fighter.definitionId)!;
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const scale = definition.bodyHeight / (art.pivot[1] - art.bodyTopY);
  const direction = art.nativeFacing === "right" ? fighter.facing : 1;
  context.save();
  try {
    context.translate(fighter.x, groundY - fighter.y);
    context.scale(scale * direction, scale);
    context.imageSmoothingEnabled = false;
    context.filter = "none";
    if (fighter.cloakPhase !== "inactive") context.globalAlpha *= fighter.cloakPhase === "active" ? .38 : .65;
    if (options.highContrast) {
      context.shadowColor = options.accent ?? "#eaffed";
      context.shadowBlur = 4 / scale;
    }
    context.drawImage(bank.images.get(fighter.definitionId)!, -art.pivot[0], -art.pivot[1], art.width, art.height);
    return true;
  } finally { context.restore(); }
}
