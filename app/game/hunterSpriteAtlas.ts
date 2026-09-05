/**
 * Authored sprite cells only. This module does not import combat, rigs or replays.
 * "validated" is a human art-review decision, never an automatic consequence of
 * a successful decode. Readback additionally checks actual alpha and dimensions.
 */
export type HunterSpriteAtlasStatus = "draft" | "rejected" | "validated";
export type HunterSpriteFacing = "left" | "right";
export type HunterSpriteRect = readonly [x: number, y: number, width: number, height: number];
export type HunterSpritePivot = readonly [x: number, y: number];

export type HunterSpriteTransparency =
  | { readonly mode: "alpha" }
  | { readonly mode: "color-key"; readonly rgb: readonly [red: number, green: number, blue: number]; readonly tolerance: number };

export interface HunterSpriteAtlasPage {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly status: HunterSpriteAtlasStatus;
  readonly grid?: { readonly columns: number; readonly rows: number };
  readonly transparency: HunterSpriteTransparency;
}
export interface HunterSpriteAtlasFrame {
  readonly pageId: string;
  readonly rect: HunterSpriteRect;
  /** Pixel offset from this cell's top-left to the actor placement anchor. */
  readonly pivot: HunterSpritePivot;
  readonly durationTicks: number;
}
export interface HunterSpriteAtlasClip {
  readonly id: string;
  readonly facing: HunterSpriteFacing;
  readonly status: HunterSpriteAtlasStatus;
  readonly loop: boolean;
  readonly ticksPerSecond: number;
  readonly frames: readonly HunterSpriteAtlasFrame[];
}
export interface HunterSpriteAtlas {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly characterId: string;
  readonly variantId: string;
  readonly sourceKind: "authored-frames";
  readonly status: HunterSpriteAtlasStatus;
  readonly pages: readonly HunterSpriteAtlasPage[];
  readonly clips: readonly HunterSpriteAtlasClip[];
}
export interface HunterSpriteAtlasIssue {
  readonly path: string;
  readonly code: string;
}
export interface HunterSpriteAtlasValidation {
  readonly valid: boolean;
  readonly issues: readonly HunterSpriteAtlasIssue[];
}
export interface HunterSpriteAtlasFrameLookup {
  readonly atlasId: string;
  readonly clip: HunterSpriteAtlasClip;
  readonly page: HunterSpriteAtlasPage;
  readonly frame: HunterSpriteAtlasFrame;
  readonly frameIndex: number;
  readonly totalTicks: number;
  readonly localTick: number;
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const validStatus = (value: unknown): value is HunterSpriteAtlasStatus =>
  value === "draft" || value === "rejected" || value === "validated";
const validFacing = (value: unknown): value is HunterSpriteFacing =>
  value === "left" || value === "right";

/** Validate untrusted JSON; a valid draft is still never renderable. */
export function validateHunterSpriteAtlas(value: unknown): HunterSpriteAtlasValidation {
  const issues: HunterSpriteAtlasIssue[] = [];
  const report = (path: string, code: string) => { issues.push({ path, code }); };
  if (!isRecord(value)) return { valid: false, issues: [{ path: "", code: "atlas-object-required" }] };
  if (value.schemaVersion !== 1) report("schemaVersion", "unsupported-version");
  for (const field of ["id", "characterId", "variantId"]) {
    if (!nonempty(value[field])) report(field, "identifier-required");
  }
  if (value.sourceKind !== "authored-frames") report("sourceKind", "authored-frames-required");
  if (!validStatus(value.status)) report("status", "invalid-status");
  const pages = new Map<string, HunterSpriteAtlasPage>();
  if (!Array.isArray(value.pages) || value.pages.length === 0) report("pages", "pages-required");
  else value.pages.forEach((page: unknown, index: number) => {
    const path = "pages." + index;
    if (!isRecord(page)) { report(path, "page-object-required"); return; }
    if (!nonempty(page.id)) report(path + ".id", "identifier-required");
    else if (pages.has(page.id)) report(path + ".id", "duplicate-page");
    if (!nonempty(page.src)) report(path + ".src", "source-required");
    if (!validStatus(page.status)) report(path + ".status", "invalid-status");
    if (!positiveInteger(page.width) || !positiveInteger(page.height)) report(path, "invalid-page-size");
    const transparency = page.transparency;
    if (!isRecord(transparency) || (transparency.mode !== "alpha" && transparency.mode !== "color-key")) {
      report(path + ".transparency", "explicit-transparency-required");
    } else if (transparency.mode === "color-key") {
      if (!Array.isArray(transparency.rgb) || transparency.rgb.length !== 3 ||
        !transparency.rgb.every((channel: unknown) => typeof channel === "number" &&
          Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
        report(path + ".transparency.rgb", "invalid-color-key");
      }
      if (!finite(transparency.tolerance) || transparency.tolerance < 0 ||
        transparency.tolerance > 64 || !Number.isInteger(transparency.tolerance)) {
        report(path + ".transparency.tolerance", "invalid-color-key-tolerance");
      }
    }
    if (page.grid !== undefined) {
      if (!isRecord(page.grid) || !positiveInteger(page.grid.columns) || !positiveInteger(page.grid.rows)) {
        report(path + ".grid", "invalid-grid");
      } else if (!positiveInteger(page.width) || !positiveInteger(page.height) ||
        page.width % page.grid.columns !== 0 || page.height % page.grid.rows !== 0) {
        report(path + ".grid", "page-not-divisible-by-grid");
      }
    }
    if (nonempty(page.id)) pages.set(page.id, page as unknown as HunterSpriteAtlasPage);
  });
  const clipKeys = new Set<string>();
  if (!Array.isArray(value.clips) || value.clips.length === 0) report("clips", "clips-required");
  else value.clips.forEach((clip: unknown, index: number) => {
    const path = "clips." + index;
    if (!isRecord(clip)) { report(path, "clip-object-required"); return; }
    if (!nonempty(clip.id)) report(path + ".id", "identifier-required");
    if (!validFacing(clip.facing)) report(path + ".facing", "explicit-facing-required");
    const key = JSON.stringify([clip.id, clip.facing]);
    if (clipKeys.has(key)) report(path, "duplicate-clip-facing");
    clipKeys.add(key);
    if (!validStatus(clip.status)) report(path + ".status", "invalid-status");
    if (typeof clip.loop !== "boolean") report(path + ".loop", "loop-flag-required");
    if (!positiveInteger(clip.ticksPerSecond)) report(path + ".ticksPerSecond", "invalid-timebase");
    if (!Array.isArray(clip.frames) || clip.frames.length === 0) {
      report(path + ".frames", "frames-required"); return;
    }
    let totalTicks = 0;
    clip.frames.forEach((frame: unknown, frameIndex: number) => {
      const framePath = path + ".frames." + frameIndex;
      if (!isRecord(frame)) { report(framePath, "frame-object-required"); return; }
      const page = typeof frame.pageId === "string" ? pages.get(frame.pageId) : undefined;
      if (!page) report(framePath + ".pageId", "missing-page");
      if (!positiveInteger(frame.durationTicks)) report(framePath + ".durationTicks", "invalid-duration");
      else totalTicks += frame.durationTicks;
      if (!Array.isArray(frame.pivot) || frame.pivot.length !== 2 || !frame.pivot.every(finite)) {
        report(framePath + ".pivot", "invalid-pivot");
      }
      const rect = frame.rect;
      if (!Array.isArray(rect) || rect.length !== 4 ||
        !rect.every((entry: unknown) => typeof entry === "number" && Number.isSafeInteger(entry)) ||
        rect[0] < 0 || rect[1] < 0 || rect[2] <= 0 || rect[3] <= 0) {
        report(framePath + ".rect", "invalid-rect"); return;
      }
      if (page && (rect[0] + rect[2] > page.width || rect[1] + rect[3] > page.height)) {
        report(framePath + ".rect", "rect-outside-page");
      }
      if (page?.grid && positiveInteger(page.grid.columns) && positiveInteger(page.grid.rows)) {
        const cellWidth = page.width / page.grid.columns;
        const cellHeight = page.height / page.grid.rows;
        if (rect[0] % cellWidth !== 0 || rect[1] % cellHeight !== 0 ||
          rect[2] !== cellWidth || rect[3] !== cellHeight) {
          report(framePath + ".rect", "rect-outside-grid-cell");
        }
      }
    });
    if (!Number.isSafeInteger(totalTicks)) report(path + ".frames", "duration-overflow");
  });
  return { valid: issues.length === 0, issues };
}

/** Half-open frame intervals; terminal one-shots hold their last authored cell. */
export function resolveHunterSpriteAtlasFrame(
  atlas: HunterSpriteAtlas,
  clipId: string,
  facing: HunterSpriteFacing,
  elapsedTicks: number,
): HunterSpriteAtlasFrameLookup | null {
  if (!validateHunterSpriteAtlas(atlas).valid || atlas.status !== "validated" ||
    !validFacing(facing) || !finite(elapsedTicks) || elapsedTicks < 0) return null;
  const clip = atlas.clips.find((entry) => entry.id === clipId && entry.facing === facing);
  if (!clip || clip.status !== "validated") return null;
  // Reject the whole clip if a later page is missing/unreviewed; never pop in a
  // partial animation after displaying its first few frames.
  if (clip.frames.some((frame) => atlas.pages.find((page) => page.id === frame.pageId)?.status !== "validated")) return null;
  const totalTicks = clip.frames.reduce((total, frame) => total + frame.durationTicks, 0);
  const localTick = clip.loop ? elapsedTicks % totalTicks : Math.min(elapsedTicks, totalTicks);
  let end = 0;
  let frameIndex = clip.frames.length - 1;
  for (let index = 0; index < clip.frames.length; index++) {
    end += clip.frames[index].durationTicks;
    if (localTick < end) { frameIndex = index; break; }
  }
  const frame = clip.frames[frameIndex];
  const page = atlas.pages.find((entry) => entry.id === frame.pageId)!;
  return { atlasId: atlas.id, clip, page, frame, frameIndex, totalTicks, localTick };
}

export const HUNTER_LOCOMOTION_DEFENSE_ROWS = [
  "idle", "walk", "run", "crouch-transition", "jump", "high-guard", "low-guard", "backstep",
] as const;

/** Import layout only: no image generation, approval, guessed size or mirroring. */
export function createHunterLocomotionDefenseAtlas(options: {
  readonly id: string;
  readonly characterId: string;
  readonly variantId: string;
  readonly facing: HunterSpriteFacing;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly durationTicks?: number;
  readonly pivot?: HunterSpritePivot;
}): HunterSpriteAtlas {
  if (!positiveInteger(options.width) || !positiveInteger(options.height) ||
    options.width % 8 !== 0 || options.height % 8 !== 0 || !validFacing(options.facing)) {
    throw new RangeError("Decoded atlas dimensions must form an exact 8 by 8 grid with explicit facing.");
  }
  const width = options.width / 8;
  const height = options.height / 8;
  const atlas: HunterSpriteAtlas = {
    schemaVersion: 1, id: options.id, characterId: options.characterId,
    variantId: options.variantId, sourceKind: "authored-frames", status: "draft",
    pages: [{ id: "locomotion-defense", src: options.src, width: options.width,
      height: options.height, status: "draft", grid: { columns: 8, rows: 8 }, transparency: { mode: "alpha" } }],
    clips: HUNTER_LOCOMOTION_DEFENSE_ROWS.map((id, row) => ({
      id, facing: options.facing, status: "draft", loop: row <= 2, ticksPerSecond: 60,
      frames: Array.from({ length: 8 }, (_, column) => ({
        pageId: "locomotion-defense", rect: [column * width, row * height, width, height],
        pivot: options.pivot ?? [width / 2, height * 366 / 384],
        durationTicks: options.durationTicks ?? 6,
      })),
    })),
  };
  if (!validateHunterSpriteAtlas(atlas).valid) throw new RangeError("Invalid atlas import metadata.");
  return atlas;
}

export interface HunterSpriteGridClip {
  readonly id: string;
  readonly startCell: number;
  readonly frameCount: number;
  readonly loop: boolean;
  readonly durationTicks: number;
}

/** Generic one-orientation import, including an eight-pose 4 by 2 clip sheet. */
export function createHunterSpriteGridAtlas(options: {
  readonly id: string;
  readonly characterId: string;
  readonly variantId: string;
  readonly facing: HunterSpriteFacing;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly rows: number;
  readonly transparency: HunterSpriteTransparency;
  readonly clips: readonly HunterSpriteGridClip[];
  readonly ticksPerSecond?: number;
  readonly pivot?: HunterSpritePivot;
}): HunterSpriteAtlas {
  if (!positiveInteger(options.width) || !positiveInteger(options.height) ||
    !positiveInteger(options.columns) || !positiveInteger(options.rows) ||
    options.width % options.columns !== 0 || options.height % options.rows !== 0 ||
    !validFacing(options.facing)) throw new RangeError("Invalid decoded grid dimensions or facing.");
  const width = options.width / options.columns;
  const height = options.height / options.rows;
  const cellCount = options.columns * options.rows;
  const atlas: HunterSpriteAtlas = {
    schemaVersion: 1, id: options.id, characterId: options.characterId,
    variantId: options.variantId, sourceKind: "authored-frames", status: "draft",
    pages: [{ id: "sheet", src: options.src, width: options.width, height: options.height,
      status: "draft", grid: { columns: options.columns, rows: options.rows },
      transparency: options.transparency }],
    clips: options.clips.map((clip) => {
      if (!Number.isSafeInteger(clip.startCell) || clip.startCell < 0 ||
        !positiveInteger(clip.frameCount) || clip.startCell + clip.frameCount > cellCount) {
        throw new RangeError("Clip extends outside its declared grid.");
      }
      return {
        id: clip.id, facing: options.facing, status: "draft", loop: clip.loop,
        ticksPerSecond: options.ticksPerSecond ?? 60,
        frames: Array.from({ length: clip.frameCount }, (_, index) => {
          const cell = clip.startCell + index;
          return { pageId: "sheet",
            rect: [cell % options.columns * width, Math.floor(cell / options.columns) * height, width, height] as HunterSpriteRect,
            pivot: options.pivot ?? [width / 2, height * 366 / 384],
            durationTicks: clip.durationTicks };
        }),
      };
    }),
  };
  if (!validateHunterSpriteAtlas(atlas).valid) throw new RangeError("Invalid atlas import metadata.");
  return atlas;
}

export type HunterSpriteDecodedImage = HTMLImageElement | ImageBitmap;
export type HunterSpriteReadbackCanvas = HTMLCanvasElement | OffscreenCanvas;
export interface HunterSpriteAtlasPreparedPage {
  readonly atlasId: string;
  readonly pageId: string;
  readonly width: number;
  readonly height: number;
}
interface PreparedEvidence {
  readonly atlasKey: string;
  readonly pageKey: string;
  readonly frameDigests: ReadonlyMap<string, string>;
  readonly drawable: HunterSpriteReadbackCanvas;
}
const evidence = new WeakMap<HunterSpriteAtlasPreparedPage, PreparedEvidence>();
const rectKey = (rect: HunterSpriteRect): string => rect.join(",");
const atlasKey = (atlas: HunterSpriteAtlas): string =>
  JSON.stringify([atlas.id, atlas.characterId, atlas.variantId, atlas.sourceKind]);
const defaultReadbackCanvas = (): HunterSpriteReadbackCanvas => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined") return document.createElement("canvas");
  throw new Error("Canvas readback unavailable.");
};

/** Require a transparent outer border and visible content in every reviewed cell. */
function reviewedCellDigest(
  pixels: Uint8ClampedArray, pageWidth: number, rect: HunterSpriteRect,
): string | null {
  const [x, y, width, height] = rect;
  let visible = false;
  let first = 2166136261;
  let second = 5381;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const offset = ((y + row) * pageWidth + x + column) * 4;
    const alpha = pixels[offset + 3];
    if ((row === 0 || column === 0 || row === height - 1 || column === width - 1) && alpha !== 0) return null;
    if (alpha > 0) visible = true;
    for (let channel = 0; channel < 4; channel++) {
      // Hidden RGB beneath alpha zero is not a distinct drawing.
      const value = alpha === 0 ? 0 : pixels[offset + channel];
      first = Math.imul(first ^ value, 16777619) >>> 0;
      second = (Math.imul(second, 33) ^ value) >>> 0;
    }
  }
  return visible ? [width, height, first, second].join(":") : null;
}

/**
 * Reads decoded pixels once. Alpha mode rejects opaque cells. Explicit color-key
 * mode removes only matching RGB pixels in this private in-memory Canvas; the
 * source file is never modified. Tainted readback and clipped cells return null.
 * createCanvas is injectable for headless tests; production should omit it.
 */
export function prepareHunterSpriteAtlasPage(
  atlas: HunterSpriteAtlas,
  pageId: string,
  image: HunterSpriteDecodedImage,
  createCanvas: () => HunterSpriteReadbackCanvas = defaultReadbackCanvas,
): HunterSpriteAtlasPreparedPage | null {
  if (!validateHunterSpriteAtlas(atlas).valid || atlas.status !== "validated") return null;
  const page = atlas.pages.find((entry) => entry.id === pageId);
  if (!page || page.status !== "validated") return null;
  const imageWidth = "naturalWidth" in image ? image.naturalWidth : image.width;
  const imageHeight = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (("complete" in image && !image.complete) || imageWidth !== page.width || imageHeight !== page.height) return null;
  try {
    const canvas = createCanvas();
    canvas.width = page.width;
    canvas.height = page.height;
    const context = canvas.getContext("2d", { willReadFrequently: true }) as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!context) return null;
    context.clearRect(0, 0, page.width, page.height);
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, page.width, page.height);
    const pixels = imageData.data;
    if (pixels.length !== page.width * page.height * 4) return null;
    if (page.transparency.mode === "color-key") {
      const { rgb, tolerance } = page.transparency;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (Math.abs(pixels[offset] - rgb[0]) <= tolerance &&
          Math.abs(pixels[offset + 1] - rgb[1]) <= tolerance &&
          Math.abs(pixels[offset + 2] - rgb[2]) <= tolerance) pixels[offset + 3] = 0;
      }
      context.putImageData(imageData, 0, 0);
    }
    const frameDigests = new Map<string, string>();
    for (const clip of atlas.clips) {
      if (clip.status !== "validated") continue;
      for (const frame of clip.frames) {
        if (frame.pageId !== pageId) continue;
        const key = rectKey(frame.rect);
        if (frameDigests.has(key)) continue;
        const digest = reviewedCellDigest(pixels, page.width, frame.rect);
        if (!digest) return null;
        frameDigests.set(key, digest);
      }
    }
    if (frameDigests.size === 0) return null;
    const prepared = Object.freeze({ atlasId: atlas.id, pageId, width: page.width, height: page.height });
    evidence.set(prepared, { atlasKey: atlasKey(atlas), pageKey: JSON.stringify(page), frameDigests, drawable: canvas });
    return prepared;
  } catch {
    return null;
  }
}

function findPreparedPage(
  atlas: HunterSpriteAtlas,
  page: HunterSpriteAtlasPage,
  frame: HunterSpriteAtlasFrame,
  preparedPages: readonly HunterSpriteAtlasPreparedPage[],
): HunterSpriteAtlasPreparedPage | undefined {
  return preparedPages.find((prepared) => {
    const proof = evidence.get(prepared);
    if (!proof || proof.atlasKey !== atlasKey(atlas) || proof.pageKey !== JSON.stringify(page) ||
      !proof.frameDigests.has(rectKey(frame.rect))) return false;
    return prepared.width === page.width && prepared.height === page.height;
  });
}

export interface HunterSpriteAtlasDrawRequest {
  readonly clipId: string;
  readonly facing: HunterSpriteFacing;
  readonly elapsedTicks: number;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
}

/** Draw exactly one authored alpha cell. Null is the only fallback, never a rig. */
export function drawHunterSpriteAtlasFrame(
  context: CanvasRenderingContext2D,
  atlas: HunterSpriteAtlas,
  preparedPages: readonly HunterSpriteAtlasPreparedPage[],
  request: HunterSpriteAtlasDrawRequest,
): HunterSpriteAtlasFrameLookup | null {
  const scale = request.scale ?? 1;
  if (!finite(request.x) || !finite(request.y) || !finite(scale) || scale <= 0) return null;
  const resolved = resolveHunterSpriteAtlasFrame(atlas, request.clipId, request.facing, request.elapsedTicks);
  if (!resolved) return null;
  // Every cell must be ready, even if this tick currently refers to another page.
  for (const frame of resolved.clip.frames) {
    const page = atlas.pages.find((entry) => entry.id === frame.pageId)!;
    if (!findPreparedPage(atlas, page, frame, preparedPages)) return null;
  }
  const prepared = findPreparedPage(atlas, resolved.page, resolved.frame, preparedPages)!;
  const [sx, sy, width, height] = resolved.frame.rect;
  const [px, py] = resolved.frame.pivot;
  context.save();
  try {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.filter = "none";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowColor = "transparent";
    context.imageSmoothingEnabled = false;
    context.drawImage(evidence.get(prepared)!.drawable, sx, sy, width, height,
      request.x - px * scale, request.y - py * scale, width * scale, height * scale);
    return resolved;
  } finally {
    context.restore();
  }
}

export interface HunterSpriteAtlasRequirement {
  readonly characterId: string;
  readonly variantId: string;
  readonly clipId: string;
  readonly facing: HunterSpriteFacing;
  readonly minimumDistinctFrames: number;
}
export type HunterSpriteAtlasMissingReason =
  "invalid-requirement" | "missing-clip" | "missing-orientation" |
  "unvalidated" | "unprepared-page" | "insufficient-distinct-frames";
export interface HunterSpriteAtlasCoverageEntry {
  readonly requirement: HunterSpriteAtlasRequirement;
  readonly distinctFrames: number;
  readonly covered: boolean;
  readonly missingReason: HunterSpriteAtlasMissingReason | null;
}
export interface HunterSpriteAtlasCoverage {
  /** This is never a claim about the whole game or the unimplemented postulate. */
  readonly scope: "supplied-requirements-only";
  readonly requiredCount: number;
  readonly coveredCount: number;
  readonly missingCount: number;
  readonly entries: readonly HunterSpriteAtlasCoverageEntry[];
}

/** Only reviewed clips with inspected alpha/color-key pixels contribute coverage. */
export function countHunterSpriteAtlasCoverage(
  atlases: readonly HunterSpriteAtlas[],
  requirements: readonly HunterSpriteAtlasRequirement[],
  preparedPages: readonly HunterSpriteAtlasPreparedPage[] = [],
): HunterSpriteAtlasCoverage {
  const entries: HunterSpriteAtlasCoverageEntry[] = requirements.map((requirement) => {
    let missingReason: HunterSpriteAtlasMissingReason = "missing-clip";
    let distinctFrames = 0;
    if (!positiveInteger(requirement.minimumDistinctFrames) || !validFacing(requirement.facing)) {
      return { requirement, distinctFrames, covered: false, missingReason: "invalid-requirement" };
    }
    for (const atlas of atlases) {
      if (atlas.characterId !== requirement.characterId || atlas.variantId !== requirement.variantId ||
        !validateHunterSpriteAtlas(atlas).valid) continue;
      if (!atlas.clips.some((clip) => clip.id === requirement.clipId)) continue;
      if (!atlas.clips.some((clip) => clip.id === requirement.clipId && clip.facing === requirement.facing)) {
        if (missingReason === "missing-clip") missingReason = "missing-orientation";
        continue;
      }
      const resolved = resolveHunterSpriteAtlasFrame(atlas, requirement.clipId, requirement.facing, 0);
      if (!resolved) { if (missingReason !== "unprepared-page" && missingReason !== "insufficient-distinct-frames") missingReason = "unvalidated"; continue; }
      const digests = new Set<string>();
      let allPrepared = true;
      for (const frame of resolved.clip.frames) {
        const page = atlas.pages.find((entry) => entry.id === frame.pageId)!;
        const prepared = findPreparedPage(atlas, page, frame, preparedPages);
        if (!prepared) { allPrepared = false; break; }
        digests.add(evidence.get(prepared)!.frameDigests.get(rectKey(frame.rect))!);
      }
      if (!allPrepared) { if (missingReason !== "insufficient-distinct-frames") missingReason = "unprepared-page"; continue; }
      distinctFrames = Math.max(distinctFrames, digests.size);
      if (distinctFrames >= requirement.minimumDistinctFrames) {
        return { requirement, distinctFrames, covered: true, missingReason: null };
      }
      missingReason = "insufficient-distinct-frames";
    }
    return { requirement, distinctFrames, covered: false, missingReason };
  });
  const coveredCount = entries.filter((entry) => entry.covered).length;
  return { scope: "supplied-requirements-only", requiredCount: entries.length,
    coveredCount, missingCount: entries.length - coveredCount, entries };
}
