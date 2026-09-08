import { PIT_FIGHTERS, type PitFighterId, type PitFighterState } from "./systems/pitCombat";

/** Existing, exact-ID V5 illustrations. These are fixed poses, not animation clips. */
export const PIT_COMBAT_BITMAP_FIGHTER_IDS = [
  "jungle-hunter", "city-hunter", "scar", "celtic", "wolf", "feral-hunter",
  "berserker", "falconer", "kok-warlord",
] as const satisfies readonly PitFighterId[];

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

// Measured on the delivered alpha PNGs and inspected as a nine-image montage.
// Feral and the Warlord face the viewer: do not invent a side or mirror them.
// Other plates have a rightward three-quarter presentation; mirroring is a
// provisional display convention, never a separately authored/canon side view.
const MEASUREMENTS: readonly [PitFighterId, number, number, number, number, number, "right" | "neutral"][] = [
  ["jungle-hunter", 775, 1514, 390, 1433, 81, "right"],
  ["city-hunter", 866, 1396, 500, 1320, 75, "right"],
  ["scar", 1139, 1356, 510, 1283, 142, "right"],
  ["celtic", 951, 1160, 382, 1098, 153, "right"],
  ["wolf", 804, 983, 396, 930, 68, "right"],
  ["feral-hunter", 1086, 1479, 587, 1400, 79, "neutral"],
  ["berserker", 1055, 1401, 531, 1326, 75, "right"],
  ["falconer", 974, 1009, 577, 955, 54, "right"],
  ["kok-warlord", 1102, 1219, 520, 1154, 65, "neutral"],
];
const DEFINITIONS: readonly PitCombatBitmapArtDefinition[] = MEASUREMENTS.map(([fighterId, width, height, px, py, bodyTopY, nativeFacing]) => Object.freeze({
  fighterId, src: "/game/sprites/v5/film-plates/" + fighterId + ".png",
  width, height, pivot: Object.freeze([px, py] as const), bodyTopY, nativeFacing,
  kind: "static-bitmap",
}));

export function getPitCombatBitmapArtDefinition(id: PitFighterId): PitCombatBitmapArtDefinition | null {
  return DEFINITIONS.find(definition => definition.fighterId === id) ?? null;
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
