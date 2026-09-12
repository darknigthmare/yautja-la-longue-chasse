import { PIT_ARENAS, PIT_FIGHTERS, type PitArenaId, type PitCombatState } from "./systems/pitCombat";
import type { PitPresentationCamera } from "./systems/pitCamera";

/** These six bitmap passes are presentation only. They never alter the arena or replay. */
export type PitArenaPlaneId = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
export interface PitArenaProp {
  readonly src: string;
  readonly x: number;
  readonly bottom: number;
  readonly height: number;
  readonly opacity?: number;
  readonly mirror?: boolean;
}
export interface PitArenaArtDefinition {
  readonly arenaId: PitArenaId;
  readonly provenance: "existing-openai-project-bitmaps";
  readonly backdrop: string;
  readonly backdropCropBottom: number;
  readonly planes: Readonly<Record<"P1" | "P2" | "P3" | "P5", readonly PitArenaProp[]>>;
  readonly floor: { readonly src: string; readonly crop: readonly [number, number, number, number]; readonly tileWidth: number };
}
export interface PitArenaArtBank {
  readonly arenaId: PitArenaId;
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly requestedPaths: ReadonlySet<string>;
  readonly failedPaths: ReadonlySet<string>;
  readonly cancelled: boolean;
}
export interface PitArenaRenderOptions { readonly reducedMotion?: boolean; readonly highContrast?: boolean }
export interface PitArenaLayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }
export interface PitArenaDrawReport { readonly drawnPlanes: readonly PitArenaPlaneId[]; readonly missingPaths: readonly string[] }

const biome = (name: string, category: string, asset: string) => `/game/assets/v19/biome-decor/${name}/${category}/${asset}.webp`;
const interior = (version: number, asset: string) => `/game/ship-interior/v${version}/${asset}.webp`;
const trophy = (name: string) => `/game/assets/v15/trophies/trophy-${name}.webp`;
const prop = (src: string, x: number, bottom: number, height: number, opacity = 1, mirror = false): PitArenaProp =>
  ({ src, x, bottom, height, opacity, mirror });

const stela = biome("ruins", "cov", "cov-reactive-stela-01-narrow");
const pylon = biome("volcano", "cov", "cov-obsidian-pylon-01-narrow");
const brazier = biome("volcano", "orn", "orn-ember-brazier-01-single");
const rib = interior(21, "foreground-rib");
const glass = biome("desert", "cov", "cov-obsidian-glass-fin-01-narrow");
const coral = biome("ocean", "cov", "cov-coral-pillar-01-narrow");
const icePillar = biome("ice", "cov", "cov-fractured-ice-pillar-01-narrow");
const tree = "/game/props/v4/tree-trunk.png";
const fern = "/game/props/v4/foreground-ferns.png";

/** Cropped center strips keep repeated floors horizontal; source pixels remain untouched.
 * Existing biome panoramas are the P0 image only, never counted again as extra planes.
 * The crop removes their original ground so that only P4 supplies the contact surface.
 */
export const PIT_ARENA_ART_DEFINITIONS: Readonly<Record<PitArenaId, PitArenaArtDefinition>> = {
  "the-pit": {
    arenaId: "the-pit", provenance: "existing-openai-project-bitmaps",
    backdrop: interior(21, "wall-machinery"), backdropCropBottom: 1,
    planes: {
      P1: [prop(stela, 110, 410, 270, .45), prop(stela, 850, 410, 270, .45)],
      P2: [prop(pylon, 60, 433, 320), prop(pylon, 900, 433, 320, 1, true)],
      P3: [prop(brazier, 208, 425, 85), prop(brazier, 752, 425, 85)],
      P5: [prop(rib, -30, 540, 480), prop(rib, 990, 540, 480, 1, true)],
    },
    floor: { src: biome("volcano", "plt", "plt-basalt-slab-01-low-wide"), crop: [192, 24, 384, 162], tileWidth: 360 },
  },
  "trophy-hall": {
    arenaId: "trophy-hall", provenance: "existing-openai-project-bitmaps",
    backdrop: interior(21, "wall-sanctum"), backdropCropBottom: 1,
    planes: {
      P1: [prop(interior(21, "door-frame"), 480, 432, 405, .5)],
      P2: [prop(stela, 122, 430, 282), prop(stela, 838, 430, 282)],
      P3: [prop(trophy("cryostalker"), 205, 275, 78), prop(trophy("ocean-leviathan"), 490, 284, 96), prop(trophy("desert-sandmaw"), 775, 275, 78)],
      P5: [prop(rib, -40, 540, 480), prop(rib, 1000, 540, 480, 1, true)],
    },
    floor: { src: interior(22, "floor-edge"), crop: [384, 408, 768, 186], tileWidth: 450 },
  },
  "canopy-causeway": {
    arenaId: "canopy-causeway", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/jungle-depth-v4.webp", backdropCropBottom: .76,
    planes: {
      P1: [prop(tree, 142, 440, 405, .45), prop(tree, 795, 440, 365, .42)],
      P2: [prop(biome("jungle", "cov", "cov-strangler-root-wall-01-narrow"), 38, 430, 345), prop(biome("jungle", "cov", "cov-ruined-idol-01-narrow"), 904, 430, 240)],
      P3: [prop(biome("jungle", "orn", "orn-storm-flower-01-single"), 192, 430, 82), prop(biome("jungle", "orn", "orn-lake-reeds-01-single"), 782, 432, 88)],
      P5: [prop(fern, 0, 545, 166), prop(fern, 970, 550, 178, 1, true)],
    },
    floor: { src: biome("jungle", "plt", "plt-expedition-deck-01-low-wide"), crop: [192, 41, 384, 132], tileWidth: 420 },
  },
  "frost-chamber": {
    arenaId: "frost-chamber", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/ice-depth-v4.webp", backdropCropBottom: .76,
    planes: {
      P1: [prop(icePillar, 155, 430, 285, .48), prop(icePillar, 805, 430, 350, .48, true)],
      P2: [prop(biome("ice", "cov", "cov-frozen-cargo-stack-01-narrow"), 54, 430, 142), prop(biome("ice", "cov", "cov-overturned-drill-01-narrow"), 890, 430, 142)],
      P3: [prop(biome("ice", "orn", "orn-emergency-beacon-01-single"), 200, 426, 64), prop(biome("ice", "orn", "orn-mineral-nodule-01-single"), 760, 432, 70)],
      P5: [prop(icePillar, -55, 580, 365), prop(icePillar, 1025, 590, 375, 1, true)],
    },
    floor: { src: biome("ice", "plt", "plt-frozen-wreck-deck-01-low-wide"), crop: [192, 32, 384, 174], tileWidth: 390 },
  },
  "ash-courtyard": {
    arenaId: "ash-courtyard", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/volcanic-depth-v4.webp", backdropCropBottom: .75,
    planes: {
      P1: [prop(pylon, 172, 430, 284, .45), prop(pylon, 790, 430, 330, .45, true)],
      P2: [prop(biome("volcano", "cov", "cov-charred-idol-01-narrow"), 46, 430, 258), prop(biome("volcano", "cov", "cov-charred-idol-01-narrow"), 914, 430, 258, 1, true)],
      P3: [prop(brazier, 226, 429, 84), prop(biome("volcano", "orn", "orn-fallen-hunter-marker-01-single"), 772, 429, 92)],
      P5: [prop(pylon, -64, 566, 340), prop(pylon, 1034, 566, 340, 1, true)],
    },
    floor: { src: biome("volcano", "plt", "plt-basalt-slab-01-low-wide"), crop: [192, 24, 384, 162], tileWidth: 360 },
  },
  "glass-terrace": {
    arenaId: "glass-terrace", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/desert-depth-v8.png", backdropCropBottom: .74,
    planes: {
      P1: [prop(glass, 195, 430, 300, .45), prop(glass, 760, 430, 230, .45, true)],
      P2: [prop(stela, 52, 430, 240), prop(glass, 912, 430, 330, 1, true)],
      P3: [prop(biome("desert", "cov", "cov-buried-cargo-01-narrow"), 236, 430, 60), prop(biome("desert", "cov", "cov-obsidian-glass-fin-04-fallen"), 735, 432, 70)],
      P5: [prop(glass, -48, 555, 300), prop(glass, 1012, 555, 300, 1, true)],
    },
    floor: { src: biome("desert", "plt", "plt-vitrified-glass-slab-01-low-wide"), crop: [192, 24, 384, 173], tileWidth: 400 },
  },
  "abyssal-bridge": {
    arenaId: "abyssal-bridge", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/ocean-depth-v8.png", backdropCropBottom: .77,
    planes: {
      P1: [prop(coral, 172, 440, 280, .4), prop(coral, 794, 440, 330, .4, true)],
      P2: [prop(biome("ocean", "cov", "cov-coral-pillar-02-broad"), 12, 433, 305), prop(interior(21, "foreground-rib"), 940, 434, 345, .9, true)],
      P3: [prop(biome("ocean", "cov", "cov-coral-pillar-04-fallen"), 204, 430, 80), prop(biome("ocean", "plt", "plt-clan-harpoon-perch-01-low-wide"), 767, 430, 84)],
      P5: [prop(coral, -56, 572, 320), prop(coral, 1024, 578, 342, 1, true)],
    },
    floor: { src: biome("ocean", "plt", "plt-drowned-station-deck-01-low-wide"), crop: [192, 51, 384, 166], tileWidth: 420 },
  },
  "ruins-tribunal": {
    arenaId: "ruins-tribunal", provenance: "existing-openai-project-bitmaps",
    backdrop: "/game/backgrounds/ruins-depth-v8.png", backdropCropBottom: .76,
    planes: {
      P1: [prop(stela, 182, 430, 340, .48), prop(stela, 778, 430, 340, .48)],
      P2: [prop(biome("ruins", "cov", "cov-reactive-stela-03-pierced"), 36, 430, 278), prop(biome("ruins", "cov", "cov-reactive-stela-02-broad"), 928, 430, 305)],
      P3: [prop(biome("ruins", "cov", "cov-reactive-stela-04-fallen"), 238, 430, 84), prop(trophy("vey"), 735, 305, 70)],
      P5: [prop(stela, -46, 570, 315), prop(stela, 1010, 570, 315, 1, true)],
    },
    floor: { src: biome("ruins", "plt", "plt-gravity-slab-01-low-wide"), crop: [192, 24, 384, 173], tileWidth: 410 },
  },
};

export const PIT_ARENA_PARALLAX = { P0: .05, P1: .12, P2: .24, P3: .43, P4: 1, P5: 1.08 } as const;
export const PIT_ARENA_BITMAP_PLANES: readonly PitArenaPlaneId[] = ["P0", "P1", "P2", "P3", "P4", "P5"];

export function getPitArenaArtPaths(arenaId: PitArenaId): readonly string[] {
  const art = PIT_ARENA_ART_DEFINITIONS[arenaId];
  return [...new Set([art.backdrop, art.floor.src, ...Object.values(art.planes).flatMap(plane => plane.map(item => item.src))])];
}

/** A grounded floor must follow the exact gameplay camera, despite the concept P4 factor. */
export function getPitArenaLayerTransform(
  arenaId: PitArenaId, planeId: PitArenaPlaneId, camera: PitPresentationCamera, reducedMotion = false,
): PitArenaLayerTransform {
  const arena = PIT_ARENAS[arenaId];
  const factor = reducedMotion ? 1 : PIT_ARENA_PARALLAX[planeId];
  const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  const x = Number.isFinite(camera.centerX) ? camera.centerX : arena.width / 2;
  const y = Number.isFinite(camera.centerY) ? camera.centerY : arena.height / 2;
  const scale = Math.max(.1, 1 + (zoom - 1) * factor);
  return {
    scale,
    translateX: arena.width / 2 - (arena.width / 2 + (x - arena.width / 2) * factor) * scale,
    translateY: arena.height / 2 - (arena.height / 2 + (y - arena.height / 2) * factor) * scale,
  };
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Fade decorative foreground when it overlaps either fighter; all bounds are screen-space. */
export function getPitArenaForegroundOpacity(
  bounds: { x: number; y: number; width: number; height: number }, state: PitCombatState, camera: PitPresentationCamera,
): number {
  const arena = PIT_ARENAS[state.arenaId];
  const transform = getPitArenaLayerTransform(state.arenaId, "P4", camera);
  return state.fighters.some(fighter => {
    const definition = PIT_FIGHTERS[fighter.definitionId];
    return overlaps(bounds, {
      x: (fighter.x - definition.bodyWidth * 1.25 - 36) * transform.scale + transform.translateX,
      y: (arena.groundY - fighter.y - definition.bodyHeight - 42) * transform.scale + transform.translateY,
      width: (definition.bodyWidth * 2.5 + 72) * transform.scale,
      height: (definition.bodyHeight + 60) * transform.scale,
    });
  }) ? .08 : .78;
}

/** Load only the selected stage and abandon the whole bank on cancellation. */
export async function loadPitArenaArt(arenaId: PitArenaId, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<PitArenaArtBank> {
  const requestedPaths = new Set(getPitArenaArtPaths(arenaId));
  const images = new Map<string, HTMLImageElement>();
  const failedPaths = new Set<string>();
  const signal = options.signal;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.min(30_000, options.timeoutMs!)) : 12_000;
  if (signal?.aborted || typeof Image === "undefined") {
    return { arenaId, images, requestedPaths, failedPaths: requestedPaths, cancelled: Boolean(signal?.aborted) };
  }
  await Promise.all([...requestedPaths].map(src => new Promise<void>(resolve => {
    let image: HTMLImageElement;
    try { image = new Image(); } catch { failedPaths.add(src); resolve(); return; }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      image.onload = null; image.onerror = null;
      if (ok && !signal?.aborted) images.set(src, image);
      else { failedPaths.add(src); try { image.src = ""; } catch { /* Best effort on an abandoned image. */ } }
      resolve();
    };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { finish(false); return; }
    try { image.src = src; } catch { finish(false); }
  })));
  if (signal?.aborted) { images.clear(); requestedPaths.forEach(src => failedPaths.add(src)); }
  return { arenaId, images, requestedPaths, failedPaths, cancelled: Boolean(signal?.aborted) };
}

function drawProps(context: CanvasRenderingContext2D, plane: "P1" | "P2" | "P3" | "P5", state: PitCombatState,
  camera: PitPresentationCamera, bank: PitArenaArtBank, options: PitArenaRenderOptions): boolean {
  const transform = getPitArenaLayerTransform(state.arenaId, plane, camera, options.reducedMotion);
  let drawn = false;
  for (const item of PIT_ARENA_ART_DEFINITIONS[state.arenaId].planes[plane]) {
    const image = bank.images.get(item.src);
    if (!image) continue;
    const width = item.height * image.naturalWidth / image.naturalHeight;
    const bounds = { x: (item.x - width / 2) * transform.scale + transform.translateX,
      y: (item.bottom - item.height) * transform.scale + transform.translateY, width: width * transform.scale, height: item.height * transform.scale };
    context.save();
    try {
      context.globalAlpha *= (item.opacity ?? 1) * (options.highContrast ? .45 : 1)
        * (plane === "P5" ? getPitArenaForegroundOpacity(bounds, state, camera) : 1);
      context.translate(item.x * transform.scale + transform.translateX, item.bottom * transform.scale + transform.translateY);
      context.scale(transform.scale * (item.mirror ? -1 : 1), transform.scale);
      context.drawImage(image, -width / 2, -item.height, width, item.height);
      drawn = true;
    } finally { context.restore(); }
  }
  return drawn;
}

/** Called on an untransformed canvas, before the combat world transform. */
export function drawPitArenaBackdrop(context: CanvasRenderingContext2D, state: PitCombatState, camera: PitPresentationCamera,
  bank: PitArenaArtBank | null, options: PitArenaRenderOptions = {}): PitArenaDrawReport {
  const arena = PIT_ARENAS[state.arenaId];
  const art = PIT_ARENA_ART_DEFINITIONS[state.arenaId];
  const validBank = bank && bank.arenaId === state.arenaId && !bank.cancelled ? bank : null;
  const drawnPlanes: PitArenaPlaneId[] = [];
  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.fillStyle = options.highContrast ? "#06100e" : arena.palette.sky;
    context.fillRect(0, 0, arena.width, arena.height);
    const backdrop = validBank?.images.get(art.backdrop);
    if (backdrop) {
      const transform = getPitArenaLayerTransform(state.arenaId, "P0", camera, options.reducedMotion);
      const sourceHeight = backdrop.naturalHeight * art.backdropCropBottom;
      // Overscan each edge; camera extrema never expose an empty sky strip.
      const left = Math.min(-150, -transform.translateX / transform.scale - 2);
      const top = Math.min(-110, -transform.translateY / transform.scale - 2);
      const right = Math.max(arena.width + 150, (arena.width - transform.translateX) / transform.scale + 2);
      const bottom = Math.max(arena.height + 110, (arena.height - transform.translateY) / transform.scale + 2);
      context.save();
      context.globalAlpha *= options.highContrast ? .46 : .86;
      context.translate(transform.translateX, transform.translateY);
      context.scale(transform.scale, transform.scale);
      const coverScale = Math.max((right - left) / backdrop.naturalWidth, (bottom - top) / sourceHeight);
      const coverWidth = backdrop.naturalWidth * coverScale;
      const coverHeight = sourceHeight * coverScale;
      context.drawImage(backdrop, 0, 0, backdrop.naturalWidth, sourceHeight,
        (left + right - coverWidth) / 2, (top + bottom - coverHeight) / 2, coverWidth, coverHeight);
      context.restore();
      drawnPlanes.push("P0");
    }
    if (validBank) for (const plane of ["P1", "P2", "P3"] as const) {
      if (drawProps(context, plane, state, camera, validBank, options)) drawnPlanes.push(plane);
    }
    const ground = getPitArenaLayerTransform(state.arenaId, "P4", camera);
    const floorY = arena.groundY * ground.scale + ground.translateY;
    context.fillStyle = options.highContrast ? "#06100e" : arena.palette.ground;
    context.fillRect(0, floorY, arena.width, Math.max(0, arena.height - floorY));
    const floor = validBank?.images.get(art.floor.src);
    if (floor) {
      const [sx, sy, sw, sh] = art.floor.crop;
      const tileWidth = art.floor.tileWidth * ground.scale;
      const tileHeight = sh / sw * tileWidth;
      const first = Math.floor(-ground.translateX / tileWidth) - 1;
      const last = Math.ceil((arena.width - ground.translateX) / tileWidth) + 1;
      for (let tile = first; tile <= last; tile++) {
        context.drawImage(floor, sx, sy, sw, sh, ground.translateX + tile * tileWidth, floorY, tileWidth + .5, tileHeight);
      }
      drawnPlanes.push("P4");
    }
    // One stable contact line assists foot and projectile reading in every palette.
    context.globalAlpha = options.highContrast ? .9 : .36;
    context.fillStyle = options.highContrast ? "#c4ffed" : arena.palette.accent;
    context.fillRect(0, floorY, arena.width, options.highContrast ? 2 : 1);
  } finally { context.restore(); }
  return { drawnPlanes, missingPaths: getPitArenaArtPaths(state.arenaId).filter(src => !validBank?.images.has(src)) };
}

/** Called after restoring the world transform. P5 never covers the HUD or changes collision. */
export function drawPitArenaForeground(context: CanvasRenderingContext2D, state: PitCombatState, camera: PitPresentationCamera,
  bank: PitArenaArtBank | null, options: PitArenaRenderOptions = {}): PitArenaDrawReport {
  if (!bank || bank.cancelled || bank.arenaId !== state.arenaId) return { drawnPlanes: [], missingPaths: [] };
  const drawn = drawProps(context, "P5", state, camera, bank, options);
  return { drawnPlanes: drawn ? ["P5"] : [], missingPaths: PIT_ARENA_ART_DEFINITIONS[state.arenaId].planes.P5.filter(item => !bank.images.has(item.src)).map(item => item.src) };
}
