import { getPitStageLifeV66Stage, getPitStageLifeV66Paths, type PitStageLifeManifestV66 } from "./pitStageLifeV66";
import { getPitStageLifeV63Stage, getPitStageV63Paths, type PitStageLifeManifestV63, type PitStageLifeStageV63 } from "./pitStageLifeV63";
import { drawPitStageLifeV63 } from "./pitStageLifeRenderingV63";
import { getPitArenaAmbientOffset } from "./pitArenaAmbience";
import { getPitArenaLifePaths, isPitArenaLifeSheetSize } from "./pitArenaLife";
import { drawPitArenaLife, type PitArenaLifeReport } from "./pitArenaLifeRendering";
import { getPitStageLifeV60Paths, getPitStageLifeV60Stage, isPitStageLifeV60ImageSize, type PitStageLifeManifestV60, type PitStageLifeStageV60 } from "./pitStageLifeV60";
import { drawPitStageLifeV60, type PitStageLifeReportV60 } from "./pitStageLifeRenderingV60";
import { drawPitStageLifeV61, type PitStageLifeReportV61 } from "./pitStageLifeRenderingV61";
import { getPitStageLifeV62Stage, getPitStageV62Paths, type PitStageLifeManifestV62, type PitStageLifeStageV62 } from "./pitStageLifeV62";
import { getPitStageLifeV61Stage, getPitStageStoryV61Stage, getPitStageV61Paths, validatePitStageLifeOverrideV61, getPitStageLifeExclusionsV61, type PitStageLifeStageV61, type PitStageLifeManifestV61, type PitStageStoryManifestV61, type PitStageStoryStageV61 } from "./pitStageStoryV61";
import { createPitStageStoryContextV61, type PitStageNarrativeCuesV61 } from "./pitStageStoryDirectorV61";
import { drawPitStageStoryV61, getPitStageStoryReplacementsV61, type PitStageStoryReportV61 } from "./pitStageStoryRenderingV61";
import type { PitRoundPresentationView } from "./systems/pitRoundPresentation";
import { PIT_ARENAS, PIT_FIGHTERS, PIT_ROUND_FRAMES, type PitArenaId, type PitCombatState } from "./systems/pitCombat";
import type { PitPresentationCamera } from "./systems/pitCamera";
import { resolvePitArenaProductionKit, type PitArenaProductionKit, type PitArenaProductionPlane, type PitArenaProductionManifest } from "./pitArenaProduction";
import { getPitFloorTileSizeV79, getPitStageRearGroundBandV79, getPitStageRearGroundMaterialSizeV79 } from "./pitStageLayoutV79";

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
  /** No complete independent kit and no historical art for this extension. */
  readonly unavailable?: boolean;
  readonly productionKit?: PitArenaProductionKit;
  /** The selected stage's three native events, validated separately from the historical V54 cast. */
  readonly stageLifeV60?: PitStageLifeStageV60;
  readonly stageLifeV66?: PitStageLifeStageV60;
  readonly stageLifeV61?: PitStageLifeStageV61;
  readonly stageLifeV62?: PitStageLifeStageV62;
  readonly stageLifeV63?: PitStageLifeStageV63;
  readonly stageStoryV61?: PitStageStoryStageV61;
}
export interface PitArenaRenderOptions {
  readonly stageLifeSeed?: number;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly sceneArenaId?: PitArenaId;
  /** Only the terminal result needs presentation time: the finished simulation no longer ticks. */
  readonly lifeResultElapsedMs?: number;
  readonly roundPresentation?: PitRoundPresentationView;
  readonly narrativeCuesV61?: PitStageNarrativeCuesV61;
}
export interface PitArenaLayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }
export interface PitArenaDrawReport {
  readonly drawnPlanes: readonly PitArenaPlaneId[];
  readonly missingPaths: readonly string[];
  readonly life?: PitArenaLifeReport;
  readonly stageLifeV60?: PitStageLifeReportV60;
  readonly stageLifeV66?: PitStageLifeReportV60;
  readonly stageLifeV61?: PitStageLifeReportV61;
  readonly stageLifeV62?: PitStageLifeReportV61;
  readonly stageLifeV63?: PitStageLifeReportV61;
  readonly stageStoryV61?: PitStageStoryReportV61;
}

/** A preview succeeding does not make a separate failed combat bank ready. */
export function isPitArenaArtBankReady(bank: PitArenaArtBank | null | undefined, arenaId?: PitArenaId): boolean {
  return Boolean(bank && (!arenaId || bank.arenaId === arenaId) && !bank.cancelled && !bank.unavailable
    && bank.failedPaths.size === 0 && bank.requestedPaths.size > 0 && [...bank.requestedPaths].every(src => bank.images.has(src)));
}

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
export const PIT_ARENA_ART_DEFINITIONS: Readonly<Partial<Record<PitArenaId, PitArenaArtDefinition>>> = {
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

function getLegacyPitArenaArtPaths(arenaId: PitArenaId): readonly string[] {
  const art = PIT_ARENA_ART_DEFINITIONS[arenaId];
  if (!art) return [];
  return [...new Set([art.backdrop, art.floor.src, ...Object.values(art.planes).flatMap(plane => plane.map(item => item.src))])];
}

export function getPitArenaArtPaths(arenaId: PitArenaId): readonly string[] {
  const productionKit = resolvePitArenaProductionKit(arenaId);
  const catalogueId = productionKit?.catalogueId ?? arenaId;
  return [...new Set([...(productionKit?.paths ?? getLegacyPitArenaArtPaths(arenaId)),
    ...(getPitStageLifeV61Stage(catalogueId) || getPitStageLifeV62Stage(catalogueId) || getPitStageLifeV63Stage(catalogueId) || getPitStageLifeV66Stage(catalogueId) ? [] : [...getPitArenaLifePaths(catalogueId), ...getPitStageLifeV60Paths(catalogueId)]),
    ...getPitStageLifeV66Paths(catalogueId), ...getPitStageV61Paths(catalogueId), ...(getPitStageLifeV63Stage(catalogueId) ? getPitStageV63Paths(catalogueId) : getPitStageV62Paths(catalogueId))])];
}

/** A grounded floor must follow the exact gameplay camera, despite the concept P4 factor. */
export function getPitArenaLayerTransform(
  arenaId: PitArenaId, planeId: PitArenaPlaneId, camera: PitPresentationCamera, reducedMotion = false,
): PitArenaLayerTransform {
  return getPitArenaSubplanTransform(arenaId, PIT_ARENA_PARALLAX[planeId], camera, reducedMotion);
}

export function getPitArenaSubplanTransform(
  arenaId: PitArenaId, parallax: number, camera: PitPresentationCamera, reducedMotion = false,
): PitArenaLayerTransform {
  const arena = PIT_ARENAS[arenaId];
  const factor = reducedMotion ? 1 : Number.isFinite(parallax) ? Math.max(0, Math.min(2, parallax)) : 1;
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
export async function loadPitArenaArt(arenaId: PitArenaId, options: {
  signal?: AbortSignal; timeoutMs?: number; productionManifest?: PitArenaProductionManifest; stageLifeManifestV60?: PitStageLifeManifestV60;
  stageLifeManifestV61?: PitStageLifeManifestV61; stageStoryManifestV61?: PitStageStoryManifestV61;
  stageLifeManifestV66?: PitStageLifeManifestV66;
  stageLifeManifestV62?: PitStageLifeManifestV62; stageLifeManifestV63?: PitStageLifeManifestV63;
} = {}): Promise<PitArenaArtBank> {
  let productionKit = resolvePitArenaProductionKit(arenaId, options.productionManifest) ?? undefined;
  const stageLifeV66 = getPitStageLifeV66Stage(productionKit?.catalogueId ?? arenaId, options.stageLifeManifestV66) ?? undefined;
  const stageLifeV61 = getPitStageLifeV61Stage(productionKit?.catalogueId ?? arenaId, options.stageLifeManifestV61) ?? undefined;
  const stageLifeV63 = getPitStageLifeV63Stage(productionKit?.catalogueId ?? arenaId, options.stageLifeManifestV63) ?? undefined;
  const stageLifeV62 = stageLifeV63 ? undefined : getPitStageLifeV62Stage(productionKit?.catalogueId ?? arenaId, options.stageLifeManifestV62) ?? undefined;
  const stageStoryV61 = getPitStageStoryV61Stage(productionKit?.catalogueId ?? arenaId, options.stageStoryManifestV61) ?? undefined;
  const lifePaths = new Set(stageLifeV61 || stageLifeV62 || stageLifeV63 || stageLifeV66 ? [] : getPitArenaLifePaths(productionKit?.catalogueId ?? arenaId));
  const historicalLifeV60 = getPitStageLifeV60Stage(productionKit?.catalogueId ?? arenaId, options.stageLifeManifestV60) ?? undefined;
  if (stageLifeV66 && (stageLifeV61 || stageLifeV62 || stageLifeV63 || historicalLifeV60)) throw new Error(`V66 ambience cannot duplicate an existing native stage: ${stageLifeV66.stageId}`);
  if ((stageLifeV62 || stageLifeV63) && (stageLifeV61 || historicalLifeV60)) throw new Error(`V62 stage cannot duplicate an existing native ambience: ${stageLifeV62?.stageId ?? stageLifeV63?.stageId}`);
  if (stageLifeV61) validatePitStageLifeOverrideV61(stageLifeV61, historicalLifeV60);
  const stageLifeV60 = stageLifeV61?.replacesV60Stage ? undefined : historicalLifeV60;
  for (const event of stageStoryV61?.events ?? []) if (event.replacesAmbientEventId &&
    ![...(stageLifeV60?.events ?? []), ...(stageLifeV61?.events ?? [])].some(ambient => ambient.id === event.replacesAmbientEventId)) {
    throw new Error(`V61 gesture replacement has no native actor: ${event.id}`);
  }
  const nativeEvents = new Map([...(stageLifeV66?.events ?? []), ...(stageLifeV60?.events ?? []), ...(stageLifeV61?.events ?? []), ...(stageLifeV62?.events ?? []), ...(stageLifeV63?.events ?? []), ...(stageStoryV61?.events ?? [])].map(event => [event.src, event]));
  const requestedPaths = new Set([...(productionKit?.paths ?? getLegacyPitArenaArtPaths(arenaId)), ...lifePaths, ...nativeEvents.keys()]);
  const expectedFrames = new Map(productionKit?.planes.flatMap(plane => plane.assets.flatMap(asset => asset.frames.map(frame => [frame.path, frame] as const))) ?? []);
  const images = new Map<string, HTMLImageElement>();
  const failedPaths = new Set<string>();
  const signal = options.signal;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.min(30_000, options.timeoutMs!)) : 12_000;
  if (signal?.aborted || typeof Image === "undefined") {
    return { arenaId, images, requestedPaths, failedPaths: requestedPaths, cancelled: Boolean(signal?.aborted) };
  }
  const loadPaths = async (paths: readonly string[]) => Promise.all(paths.map(src => new Promise<void>(resolve => {
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
    image.onload = () => {
      const expected = expectedFrames.get(src)?.generation;
      const nativeEvent = nativeEvents.get(src);
      finish(image.naturalWidth > 0 && image.naturalHeight > 0
        && (!lifePaths.has(src) || isPitArenaLifeSheetSize(image.naturalWidth, image.naturalHeight))
        && (!nativeEvent || isPitStageLifeV60ImageSize(nativeEvent, image.naturalWidth, image.naturalHeight))
        && (!expected || (image.naturalWidth === expected.width && image.naturalHeight === expected.height)));
    };
    image.onerror = () => finish(false);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { finish(false); return; }
    try { image.src = src; } catch { finish(false); }
  })));
  await loadPaths([...requestedPaths]);
  if (productionKit && !signal?.aborted && productionKit.requiredPaths.some(src => !images.has(src))) {
    // A failed independent kit cannot leave a partly replaced arena. Recover the complete legacy kit.
    productionKit = undefined;
    const fallback = getLegacyPitArenaArtPaths(arenaId);
    fallback.forEach(src => requestedPaths.add(src));
    await loadPaths(fallback.filter(src => !images.has(src)));
  }
  if (signal?.aborted) { images.clear(); requestedPaths.forEach(src => failedPaths.add(src)); }
  return { arenaId, images, requestedPaths, failedPaths, cancelled: Boolean(signal?.aborted), productionKit, stageLifeV66, stageLifeV60, stageLifeV61, stageLifeV62, stageLifeV63, stageStoryV61,
    unavailable: !productionKit && !PIT_ARENA_ART_DEFINITIONS[arenaId] };
}

function drawProps(context: CanvasRenderingContext2D, plane: "P1" | "P2" | "P3" | "P5", state: PitCombatState,
  camera: PitPresentationCamera, bank: PitArenaArtBank, options: PitArenaRenderOptions): boolean {
  const transform = getPitArenaLayerTransform(state.arenaId, plane, camera, options.reducedMotion);
  let drawn = false;
  for (const item of PIT_ARENA_ART_DEFINITIONS[state.arenaId]?.planes[plane] ?? []) {
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


/** Independent bitmaps preserve their aspect ratio and retain authored world placements. */
function drawProductionPlane(context: CanvasRenderingContext2D, plane: PitArenaProductionPlane,
  state: PitCombatState, camera: PitPresentationCamera, bank: PitArenaArtBank, options: PitArenaRenderOptions): boolean {
  const arena = PIT_ARENAS[state.arenaId];
  let drawn = false;
  for (const asset of plane.assets) {
    const completeLoop = asset.animation && asset.frames.length > 1 && asset.frames.every(frame => bank.images.has(frame.path));
    const frameIndex = completeLoop && !options.reducedMotion
      ? Math.floor(Math.max(0, state.frame) * asset.animation!.fps / 60) % asset.frames.length
      : completeLoop && options.reducedMotion ? Math.min(asset.frames.length - 1, Math.max(0, asset.animation!.reducedMotionFrame)) : 0;
    const frame = asset.frames[frameIndex];
    if (!frame?.generation) continue;
    const image = bank.images.get(frame.path);
    if (!image) continue;
    const source = asset.sourceCrop ?? frame.generation.contentBounds;
    // The actual contact tile is always world-locked, even when a draft data factor is wrong.
    const factor = asset.mode === "repeat-x" ? 1 : asset.parallax;
    const transform = getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion);
    const driftX = plane.id === "P0" && asset.mode === "module" && asset.alphaRequired
      ? getPitArenaAmbientOffset(asset.ambientMotion, state.frame, options.reducedMotion) : 0;
    for (const placement of asset.placements) {
      context.save();
      try {
        context.globalAlpha *= asset.opacity * (options.highContrast ? .45 : 1);
        if (asset.mode === "repeat-x" || asset.mode === "strip-x") {
          const size = getPitFloorTileSizeV79(asset, placement, source, bank.productionKit);
          if (!size) continue;
          const width = size.width * transform.scale;
          const height = size.height * transform.scale;
          const origin = placement.x * transform.scale + transform.translateX;
          const floorY = (asset.mode === "repeat-x" ? arena.groundY : placement.y) * transform.scale + transform.translateY;
          const first = Math.floor(-origin / width) - 1;
          const last = Math.ceil((arena.width - origin) / width) + 1;
          for (let index = first; index <= last; index++) context.drawImage(image, source.x, source.y, source.width, source.height, origin + index * width, floorY, width + .5, height);
        } else if (asset.mode === "cover") {
          const left = Math.min(placement.x, -transform.translateX / transform.scale - 2);
          const top = Math.min(placement.y, -transform.translateY / transform.scale - 2);
          const right = Math.max(placement.x + placement.width, (arena.width - transform.translateX) / transform.scale + 2);
          const bottom = Math.max(placement.y + placement.height, (arena.height - transform.translateY) / transform.scale + 2);
          const cover = Math.max((right - left) / source.width, (bottom - top) / source.height);
          const width = source.width * cover;
          const height = source.height * cover;
          context.translate(transform.translateX, transform.translateY);
          context.scale(transform.scale, transform.scale);
          context.drawImage(image, source.x, source.y, source.width, source.height, (left + right - width) / 2, (top + bottom - height) / 2, width, height);
        } else {
          const fit = Math.min(placement.width / source.width, placement.height / source.height);
          const width = source.width * fit * transform.scale;
          const height = source.height * fit * transform.scale;
          const bounds = {
            x: (placement.x + placement.width / 2 + driftX) * transform.scale + transform.translateX - width / 2,
            y: asset.anchorToGround
              ? (() => {
                const ground = getPitArenaLayerTransform(state.arenaId, "P4", camera);
                return arena.groundY * ground.scale + ground.translateY
                  + (placement.y + placement.height - arena.groundY) * transform.scale - height;
              })()
              : asset.verticalAlign === "top" ? placement.y * transform.scale + transform.translateY
                : (placement.y + placement.height) * transform.scale + transform.translateY - height,
            width, height,
          };
          if (plane.id === "P5") context.globalAlpha *= getPitArenaForegroundOpacity(bounds, state, camera);
          context.drawImage(image, source.x, source.y, source.width, source.height, bounds.x, bounds.y, bounds.width, bounds.height);
        }
        drawn = true;
      } finally { context.restore(); }
    }
  }
  return drawn;
}

/** Draw before every P1/P2/P3 native actor. Only repeat-x material participates;
 * a front fascia is never reused as a rear surface or painted over a fighter. */
function drawProductionRearGroundV79(context: CanvasRenderingContext2D, state: PitCombatState,
  camera: PitPresentationCamera, bank: PitArenaArtBank, options: PitArenaRenderOptions): void {
  const arena = PIT_ARENAS[state.arenaId], ground = getPitArenaLayerTransform(state.arenaId, "P4", camera);
  const band = getPitStageRearGroundBandV79(arena, ground);
  if (!band || band.clip.height <= 0) return;
  for (const asset of bank.productionKit!.planes.find(p => p.id === "P4")?.assets ?? []) {
    if (asset.mode !== "repeat-x") continue;
    const completeLoop = asset.animation && asset.frames.length > 1 && asset.frames.every(f => bank.images.has(f.path));
    const index = completeLoop && !options.reducedMotion ? Math.floor(Math.max(0, state.frame) * asset.animation!.fps / 60) % asset.frames.length
      : completeLoop && options.reducedMotion ? Math.min(asset.frames.length - 1, Math.max(0, asset.animation!.reducedMotionFrame)) : 0;
    const frame = asset.frames[index], image = frame && bank.images.get(frame.path);
    if (!image || !frame.generation) continue;
    const source = asset.sourceCrop ?? frame.generation.contentBounds, size = getPitStageRearGroundMaterialSizeV79(source, band.height);
    if (!size) continue;
    for (const placement of asset.placements) {
      const origin = placement.x * ground.scale + ground.translateX;
      const first = Math.floor(-origin / size.width) - 1, last = Math.ceil((arena.width - origin) / size.width) + 1;
      context.save();
      try {
        context.beginPath(); context.rect(band.clip.x, band.clip.y, band.clip.width, band.clip.height); context.clip();
        context.globalAlpha *= asset.opacity * (options.highContrast ? .45 : 1);
        for (let tile = first; tile <= last; tile++) context.drawImage(image, source.x, source.y, source.width, source.height,
          origin + tile * size.width, band.top, size.width + .5, size.height);
      } finally { context.restore(); }
    }
  }
}

function drawProductionBackdrop(context: CanvasRenderingContext2D, state: PitCombatState,
  camera: PitPresentationCamera, bank: PitArenaArtBank, options: PitArenaRenderOptions): PitArenaDrawReport {
  const arena = PIT_ARENAS[state.arenaId];
  const drawnPlanes: PitArenaPlaneId[] = [];
  let life: PitArenaLifeReport | undefined;
  const nativeLifePasses: PitStageLifeReportV60[] = [];
  const nativeLifePassesV66: PitStageLifeReportV60[] = [];
  const nativeLifePassesV61: PitStageLifeReportV61[] = [];
  const nativeLifePassesV62: PitStageLifeReportV61[] = [];
  const nativeLifePassesV63: PitStageLifeReportV61[] = [];
  const storyPassesV61: PitStageStoryReportV61[] = [];
  const storyInput = bank.stageStoryV61 ? {
    stage: bank.stageStoryV61, groundY: arena.groundY, images: bank.images,
    transform: (factor: number) => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
    reducedMotion: options.reducedMotion, highContrast: options.highContrast,
    eventContext: createPitStageStoryContextV61(state, options.roundPresentation, options.narrativeCuesV61),
  } : undefined;
  const replacements = storyInput ? getPitStageStoryReplacementsV61(storyInput) : undefined;
  const ambientV61Excluded = bank.stageLifeV61 ? getPitStageLifeExclusionsV61(bank.stageLifeV61, state.fighters.map(fighter => fighter.definitionId), replacements) : undefined;
  const ambientV62Excluded = bank.stageLifeV62 ? getPitStageLifeExclusionsV61(bank.stageLifeV62, state.fighters.map(fighter => fighter.definitionId), replacements) : undefined;
  const ambientV63Excluded = bank.stageLifeV63 ? getPitStageLifeExclusionsV61(bank.stageLifeV63, state.fighters.map(fighter => fighter.definitionId), replacements) : undefined;
  const ground = getPitArenaLayerTransform(state.arenaId, "P4", camera);
  const floorY = arena.groundY * ground.scale + ground.translateY;
  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.fillStyle = options.highContrast ? "#06100e" : arena.palette.sky;
    context.fillRect(0, 0, arena.width, arena.height);
    for (const plane of bank.productionKit!.planes.filter(entry => entry.id !== "P5")) {
      if (plane.id === "P1") drawProductionRearGroundV79(context, state, camera, bank, options);
      if (plane.id === "P4") {
        context.fillStyle = options.highContrast ? "#06100e" : arena.palette.ground;
        context.fillRect(0, floorY, arena.width, Math.max(0, arena.height - floorY));
      }
      if (drawProductionPlane(context, plane, state, camera, bank, options)) drawnPlanes.push(plane.id);
      if (plane.id === "P3" && !bank.stageLifeV61 && !bank.stageLifeV62 && !bank.stageLifeV63 && !bank.stageLifeV66) life = drawPitArenaLife(context, {
        arenaId: bank.productionKit!.catalogueId, frame: state.frame, groundY: arena.groundY, images: bank.images,
        transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
        reducedMotion: options.reducedMotion, highContrast: options.highContrast,
        eventContext: {
          round: state.round, phase: state.phase,
          roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining,
          resultElapsedFrames: state.phase === "match-over" && options.lifeResultElapsedMs !== undefined
            ? options.lifeResultElapsedMs * .06
            : state.lastRoundResult?.round === state.round ? state.frame - state.lastRoundResult.frame : undefined,
        },
      });
      if (bank.stageLifeV66 && (plane.id === "P1" || plane.id === "P2" || plane.id === "P3")) nativeLifePassesV66.push(drawPitStageLifeV60(context, {
        stage: bank.stageLifeV66, pass: plane.id, groundY: arena.groundY, images: bank.images,
        transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
        reducedMotion: options.reducedMotion, highContrast: options.highContrast,
        eventContext: { launchSeed: options.stageLifeSeed, round: state.round, phase: state.phase,
          roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining },
      }));
      if (bank.stageLifeV60 && (plane.id === "P1" || plane.id === "P2" || plane.id === "P3")) {
        nativeLifePasses.push(drawPitStageLifeV60(context, {
          stage: bank.stageLifeV60, pass: plane.id, groundY: arena.groundY, images: bank.images,
          transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
          reducedMotion: options.reducedMotion, highContrast: options.highContrast,
          excludedEventIds: replacements,
          eventContext: { launchSeed: options.stageLifeSeed, round: state.round, phase: state.phase,
            roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining },
        }));
      }
      if (plane.id === "P1" || plane.id === "P2" || plane.id === "P3") {
        if (bank.stageLifeV61) nativeLifePassesV61.push(drawPitStageLifeV61(context, {
          stage: bank.stageLifeV61, pass: plane.id, groundY: arena.groundY, images: bank.images,
          transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
          reducedMotion: options.reducedMotion, highContrast: options.highContrast, excludedEventIds: ambientV61Excluded,
          eventContext: { launchSeed: options.stageLifeSeed, round: state.round, phase: state.phase,
            roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining },
        }));
        if (bank.stageLifeV62) nativeLifePassesV62.push(drawPitStageLifeV61(context, {
          stage: bank.stageLifeV62, pass: plane.id, groundY: arena.groundY, images: bank.images,
          transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
          reducedMotion: options.reducedMotion, highContrast: options.highContrast, excludedEventIds: ambientV62Excluded,
          eventContext: { launchSeed: options.stageLifeSeed, round: state.round, phase: state.phase,
            roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining },
        }));
        if (bank.stageLifeV63) nativeLifePassesV63.push(drawPitStageLifeV63(context, {
          stage: bank.stageLifeV63, pass: plane.id, groundY: arena.groundY, images: bank.images,
          transform: factor => getPitArenaSubplanTransform(state.arenaId, factor, camera, options.reducedMotion),
          reducedMotion: options.reducedMotion, highContrast: options.highContrast, excludedEventIds: ambientV63Excluded,
          eventContext: { launchSeed: options.stageLifeSeed, round: state.round, phase: state.phase,
            roundFrame: state.rules.mode === "training" ? state.frame : PIT_ROUND_FRAMES - state.roundFramesRemaining },
        }));
        if (storyInput) storyPassesV61.push(drawPitStageStoryV61(context, { ...storyInput, pass: plane.id }));
      }
    }
    context.globalAlpha = options.highContrast ? .9 : .36;
    context.fillStyle = options.highContrast ? "#c4ffed" : arena.palette.accent;
    context.fillRect(0, floorY, arena.width, options.highContrast ? 2 : 1);
  } finally { context.restore(); }
  const stageLifeV66 = bank.stageLifeV66 ? {
    stageId: bank.stageLifeV66.stageId, actorsDrawn: nativeLifePassesV66.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: nativeLifePassesV66.flatMap(pass => pass.events), missingPaths: [...new Set(nativeLifePassesV66.flatMap(pass => pass.missingPaths))],
  } : undefined;
  const stageLifeV60 = bank.stageLifeV60 ? {
    stageId: bank.stageLifeV60.stageId, actorsDrawn: nativeLifePasses.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: nativeLifePasses.flatMap(pass => pass.events), missingPaths: [...new Set(nativeLifePasses.flatMap(pass => pass.missingPaths))],
  } : undefined;
  const stageLifeV61 = bank.stageLifeV61 ? {
    stageId: bank.stageLifeV61.stageId, actorsDrawn: nativeLifePassesV61.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: nativeLifePassesV61.flatMap(pass => pass.events), missingPaths: [...new Set(nativeLifePassesV61.flatMap(pass => pass.missingPaths))],
  } : undefined;
  const stageStoryV61 = bank.stageStoryV61 ? {
    stageId: bank.stageStoryV61.stageId, actorsDrawn: storyPassesV61.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: storyPassesV61.flatMap(pass => pass.events), missingPaths: [...new Set(storyPassesV61.flatMap(pass => pass.missingPaths))],
    replacedAmbientEventIds: [...new Set(storyPassesV61.flatMap(pass => pass.replacedAmbientEventIds))],
  } : undefined;
  const stageLifeV62 = bank.stageLifeV62 ? {
    stageId: bank.stageLifeV62.stageId, actorsDrawn: nativeLifePassesV62.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: nativeLifePassesV62.flatMap(pass => pass.events), missingPaths: [...new Set(nativeLifePassesV62.flatMap(pass => pass.missingPaths))],
  } : undefined;
  const stageLifeV63 = bank.stageLifeV63 ? {
    stageId: bank.stageLifeV63.stageId, actorsDrawn: nativeLifePassesV63.reduce((sum, pass) => sum + pass.actorsDrawn, 0),
    events: nativeLifePassesV63.flatMap(pass => pass.events), missingPaths: [...new Set(nativeLifePassesV63.flatMap(pass => pass.missingPaths))],
  } : undefined;
  return { drawnPlanes, missingPaths: [...new Set([
    ...[...bank.requestedPaths].filter(src => !bank.images.has(src)), ...(stageLifeV60?.missingPaths ?? []), ...(stageLifeV66?.missingPaths ?? []),
    ...(stageLifeV61?.missingPaths ?? []), ...(stageLifeV62?.missingPaths ?? []), ...(stageLifeV63?.missingPaths ?? []), ...(stageStoryV61?.missingPaths ?? []),
  ])], life, stageLifeV66, stageLifeV60, stageLifeV61, stageLifeV62, stageLifeV63, stageStoryV61 };
}

/** Called on an untransformed canvas, before the combat world transform. */
export function drawPitArenaBackdrop(context: CanvasRenderingContext2D, state: PitCombatState, camera: PitPresentationCamera,
  bank: PitArenaArtBank | null, options: PitArenaRenderOptions = {}): PitArenaDrawReport {
  if (options.sceneArenaId && options.sceneArenaId !== state.arenaId) {
    return drawPitArenaBackdrop(context, { ...state, arenaId: options.sceneArenaId },
      { ...camera, arenaId: options.sceneArenaId }, bank, { ...options, sceneArenaId: undefined });
  }
  const arena = PIT_ARENAS[state.arenaId];
  const art = PIT_ARENA_ART_DEFINITIONS[state.arenaId];
  const validBank = bank && bank.arenaId === state.arenaId && !bank.cancelled ? bank : null;
  if (validBank?.productionKit) return drawProductionBackdrop(context, state, camera, validBank, options);
  const drawnPlanes: PitArenaPlaneId[] = [];
  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.fillStyle = options.highContrast ? "#06100e" : arena.palette.sky;
    context.fillRect(0, 0, arena.width, arena.height);
    const backdrop = art && validBank?.images.get(art.backdrop);
    if (backdrop && art) {
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
    // Legacy banks use the same rear band, before their background props.
    const rearFloor = art && validBank?.images.get(art.floor.src);
    const rearGround = getPitArenaLayerTransform(state.arenaId, "P4", camera);
    const rearBand = getPitStageRearGroundBandV79(arena, rearGround);
    if (rearFloor && art && rearBand && rearBand.clip.height > 0) {
      const [sx, sy, sw, sh] = art.floor.crop;
      const size = getPitStageRearGroundMaterialSizeV79({x:sx,y:sy,width:sw,height:sh}, rearBand.height);
      if (size) {
        context.save();
        try {
          context.beginPath(); context.rect(rearBand.clip.x, rearBand.clip.y, rearBand.clip.width, rearBand.clip.height); context.clip();
          const first = Math.floor(-rearGround.translateX / size.width) - 1, last = Math.ceil((arena.width - rearGround.translateX) / size.width) + 1;
          for (let tile = first; tile <= last; tile++) context.drawImage(rearFloor, sx, sy, sw, sh,
            rearGround.translateX + tile * size.width, rearBand.top, size.width + .5, size.height);
        } finally { context.restore(); }
      }
    }
    if (validBank) for (const plane of ["P1", "P2", "P3"] as const) {
      if (drawProps(context, plane, state, camera, validBank, options)) drawnPlanes.push(plane);
    }
    const ground = getPitArenaLayerTransform(state.arenaId, "P4", camera);
    const floorY = arena.groundY * ground.scale + ground.translateY;
    context.fillStyle = options.highContrast ? "#06100e" : arena.palette.ground;
    context.fillRect(0, floorY, arena.width, Math.max(0, arena.height - floorY));
    const floor = art && validBank?.images.get(art.floor.src);
    if (floor && art) {
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
  return { drawnPlanes, missingPaths: [...(validBank?.requestedPaths ?? getPitArenaArtPaths(state.arenaId))].filter(src => !validBank?.images.has(src)) };
}

/** Called after restoring the world transform. P5 never covers the HUD or changes collision. */
export function drawPitArenaForeground(context: CanvasRenderingContext2D, state: PitCombatState, camera: PitPresentationCamera,
  bank: PitArenaArtBank | null, options: PitArenaRenderOptions = {}): PitArenaDrawReport {
  if (options.sceneArenaId && options.sceneArenaId !== state.arenaId) {
    return drawPitArenaForeground(context, { ...state, arenaId: options.sceneArenaId },
      { ...camera, arenaId: options.sceneArenaId }, bank, { ...options, sceneArenaId: undefined });
  }
  if (!bank || bank.cancelled || bank.arenaId !== state.arenaId) return { drawnPlanes: [], missingPaths: [] };
  if (bank.productionKit) {
    const plane = bank.productionKit.planes.find(entry => entry.id === "P5");
    const drawn = plane ? drawProductionPlane(context, plane, state, camera, bank, options) : false;
    return { drawnPlanes: drawn ? ["P5"] : [], missingPaths: plane?.assets.flatMap(asset => asset.frames.map(frame => frame.path)).filter(src => !bank.images.has(src)) ?? [] };
  }
  const drawn = drawProps(context, "P5", state, camera, bank, options);
  return { drawnPlanes: drawn ? ["P5"] : [], missingPaths: (PIT_ARENA_ART_DEFINITIONS[state.arenaId]?.planes.P5 ?? []).filter(item => !bank.images.has(item.src)).map(item => item.src) };
}
