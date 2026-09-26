import {
  countHunterSpriteAtlasCoverage,
  prepareHunterSpriteAtlasPage,
  resolveHunterSpriteAtlasFrame,
  type HunterSpriteAtlasFrameLookup,
  validateHunterSpriteAtlas,
  type HunterSpriteAtlas,
  type HunterSpriteAtlasPreparedPage,
} from "./hunterSpriteAtlas";
import {
  describePitHunterSpriteMotion,
  resolvePitHunterSpriteFrame,
  type PitHunterSpriteCursor,
  type PitHunterSpriteFrame,
} from "./hunterSpriteMotion";
import { PIT_FIGHTERS, type PitCombatState, type PitFighterId, type PitFighterState } from "./systems/pitCombat";
import { getPitUserVariant } from "./systems/pitUserRoster";
import { getPitFighterPresentationCue, getPitFighterPresentationTreatment,
  type PitFighterPresentationCue, type PitFighterPresentationOptions } from "./pitFighterPresentation";

/** Art review belongs to the registry. Successful decoding never approves art. */
export interface PitSpriteSheetAnimationDefinition {
  readonly fighterId: PitFighterId;
  /** Exact supplied appearance owner; omitted only for historical/default artwork. */
  readonly variantId?: string;
  /** One measured standing-body reference shared by every pose; never fit each pose. */
  readonly bodyHeightPx: number;
  /** Optional measured reference per page, still uniform in both axes. */
  readonly pageBodyHeightPx?: Readonly<Record<string, number>>;
  /** Explicitly reviewed single-drawing stances, held without inventing movement. */
  readonly heldPoseClips?: readonly { readonly id: "crouch"; readonly facing: "left" | "right" }[];
  /** Alpha-reviewed source bounds for camera framing only; draw rect/pivot stay untouched. */
  readonly visibleFrameBounds?: readonly {
    readonly pageId: string;
    readonly rect: readonly [number, number, number, number];
    readonly visibleRect: readonly [number, number, number, number];
  }[];
  readonly atlas: HunterSpriteAtlas;
}
export interface PitSpriteSheetAnimationBank {
  readonly requestedIds: ReadonlySet<PitFighterId>;
  readonly readyClipCount: number;
  readonly failedAtlasIds: readonly string[];
  readonly cancelled: boolean;
}
export interface PitSpriteSheetAnimationOptions extends PitFighterPresentationOptions {
  /** Actual simulation tick. Omitting it holds observed-entry clips at their start. */
  readonly simulationFrame?: number;
  readonly combat?: Pick<PitCombatState, "frame" | "pendingThrow" | "events">;
}
interface PreparedAnimation {
  readonly definition: PitSpriteSheetAnimationDefinition;
  readonly pages: ReadonlyMap<string, HTMLCanvasElement>;
  readonly readyClips: ReadonlySet<string>;
}
interface BankEvidence {
  readonly animations: readonly PreparedAnimation[];
  readonly selections: ReadonlySet<string>;
  readonly cursors: Map<0 | 1, { selection: string; cursor: PitHunterSpriteCursor }>;
  readonly signal?: AbortSignal;
}
export interface PitSpriteSheetAnimationFrame {
  readonly definition: PitSpriteSheetAnimationDefinition;
  readonly resolved: PitHunterSpriteFrame;
  readonly source: HTMLCanvasElement;
}
const evidence = new WeakMap<PitSpriteSheetAnimationBank, BankEvidence>();
const clipKey = (id: string, facing: string) => JSON.stringify([id, facing]);
const selectionKey = (id: PitFighterId, variantId?: string | null) => JSON.stringify([id, variantId ?? null]);
const ownsAppearance = (definition: PitSpriteSheetAnimationDefinition, fighter: PitFighterState) =>
  definition.fighterId === fighter.definitionId && definition.variantId === fighter.variantId;
const finite = (value: number) => Number.isFinite(value);

function hasValidVisibleBounds(definition: PitSpriteSheetAnimationDefinition): boolean {
  if (definition.visibleFrameBounds === undefined) return true;
  if (!Array.isArray(definition.visibleFrameBounds)) return false;
  const keys = new Set<string>();
  return definition.visibleFrameBounds.every(bound => {
    if (!bound || !Array.isArray(bound.rect) || !Array.isArray(bound.visibleRect) ||
      bound.rect.length !== 4 || bound.visibleRect.length !== 4 ||
      !bound.visibleRect.every(Number.isSafeInteger)) return false;
    const key = JSON.stringify([bound.pageId, bound.rect]);
    if (keys.has(key)) return false;
    keys.add(key);
    const original = definition.atlas.clips.flatMap(clip => clip.frames).find(frame =>
      frame.pageId === bound.pageId && frame.rect.every((value, index) => value === bound.rect[index]));
    if (!original) return false;
    const [x, y, width, height] = bound.visibleRect;
    return width > 0 && height > 0 && x >= original.rect[0] && y >= original.rect[1] &&
      x + width <= original.rect[0] + original.rect[2] && y + height <= original.rect[1] + original.rect[3];
  });
}

function hasValidHeldPoses(definition: PitSpriteSheetAnimationDefinition): boolean {
  if (definition.heldPoseClips === undefined) return true;
  if (!Array.isArray(definition.heldPoseClips)) return false;
  const keys = new Set<string>();
  return definition.heldPoseClips.every(pose => {
    if (!pose || pose.id !== "crouch" || (pose.facing !== "left" && pose.facing !== "right")) return false;
    const key = clipKey(pose.id, pose.facing);
    if (keys.has(key)) return false;
    keys.add(key);
    const clip = definition.atlas.clips.find(candidate => candidate.id === pose.id && candidate.facing === pose.facing);
    return clip?.status === "validated" && !clip.loop && clip.frames.length === 1;
  });
}

function isAcceptedDefinition(definition: PitSpriteSheetAnimationDefinition): boolean {
  const { atlas } = definition;
  return Object.hasOwn(PIT_FIGHTERS, definition.fighterId) && finite(definition.bodyHeightPx) &&
    definition.bodyHeightPx > 0 && validateHunterSpriteAtlas(atlas).valid && hasValidVisibleBounds(definition) && hasValidHeldPoses(definition) &&
    atlas.characterId === definition.fighterId && atlas.status === "validated" &&
    (definition.variantId === undefined || (typeof definition.variantId === "string" &&
      getPitUserVariant(definition.fighterId, definition.variantId) !== null && atlas.variantId === definition.variantId)) &&
    (!definition.pageBodyHeightPx || Object.entries(definition.pageBodyHeightPx).every(([id, value]) =>
      atlas.pages.some(page => page.id === id) && finite(value) && value > 0)) &&
    atlas.pages.every(page => page.width * page.height <= 16_777_216 &&
      /^\/game\/sprites\/[a-zA-Z0-9_./-]+$/.test(page.src) && !page.src.split("/").includes("..") &&
      (page.transparency.mode === "alpha" ||
        page.transparency.rgb[0] === 255 && page.transparency.rgb[1] === 0 && page.transparency.rgb[2] === 255));
}

function loadPage(src: string, timeoutMs: number, signal?: AbortSignal): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    let image: HTMLImageElement;
    try { image = new Image(); } catch { resolve(null); return; }
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      image.onload = null; image.onerror = null;
      if (!success) { try { image.src = ""; } catch { /* Best effort cancellation. */ } }
      resolve(success && !signal?.aborted ? image : null);
    };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { finish(false); return; }
    try { image.src = src; } catch { finish(false); }
  });
}

/** Only selected fighters are decoded; each clip is atomic across all its pages. */
export async function loadPitSpriteSheetAnimations(
  ids: readonly PitFighterId[],
  registry: readonly PitSpriteSheetAnimationDefinition[],
  options: { signal?: AbortSignal; timeoutMs?: number; variants?: readonly (string | null)[] } = {},
): Promise<PitSpriteSheetAnimationBank> {
  const requestedIds = new Set(ids);
  const selections = new Set(ids.map((id, index) => selectionKey(id, options.variants?.[index])));
  const failedAtlasIds: string[] = [];
  const animations: PreparedAnimation[] = [];
  const timeoutMs = finite(options.timeoutMs ?? NaN)
    ? Math.max(1, Math.min(30_000, Math.floor(options.timeoutMs!))) : 12_000;
  const candidates = registry.filter(entry => selections.has(selectionKey(entry.fighterId, entry.variantId)));
  if (!options.signal?.aborted && typeof Image !== "undefined" && typeof document !== "undefined") {
    await Promise.all(candidates.map(async original => {
      if (!isAcceptedDefinition(original)) { failedAtlasIds.push(original.atlas?.id ?? "invalid-atlas"); return; }
      // Keep a private snapshot: callers cannot swap metadata after pixel inspection.
      const definition = structuredClone(original);
      const { atlas } = definition;
      const prepared: HunterSpriteAtlasPreparedPage[] = [];
      const pages = new Map<string, HTMLCanvasElement>();
      const usedPages = new Set(atlas.clips.filter(clip => clip.status === "validated")
        .flatMap(clip => clip.frames.map(frame => frame.pageId)));
      await Promise.all(atlas.pages.filter(page => page.status === "validated" && usedPages.has(page.id)).map(async page => {
        const image = await loadPage(page.src, timeoutMs, options.signal);
        if (!image || options.signal?.aborted) return;
        let canvas: HTMLCanvasElement | null = null;
        const proof = prepareHunterSpriteAtlasPage(atlas, page.id, image, () => {
          canvas = document.createElement("canvas");
          return canvas;
        });
        if (proof && canvas && !options.signal?.aborted) { prepared.push(proof); pages.set(page.id, canvas); }
        else if (canvas) { (canvas as HTMLCanvasElement).width = 0; (canvas as HTMLCanvasElement).height = 0; }
      }));
      const requirements = atlas.clips.map(clip => ({ characterId: atlas.characterId,
        variantId: atlas.variantId, clipId: clip.id, facing: clip.facing, minimumDistinctFrames: 2 }));
      const coverage = countHunterSpriteAtlasCoverage([atlas], requirements, prepared);
      const readyClips = new Set(coverage.entries.filter(entry => entry.covered)
        .map(entry => clipKey(entry.requirement.clipId, entry.requirement.facing)));
      // One held drawing can represent a short phase only when its complete attack
      // has all three phases and at least three actually distinct pixel drawings.
      const attackGroups = new Map<string, typeof atlas.clips[number][]>();
      for (const clip of atlas.clips) {
        const match = /^(pit\.(?:stand|crouch|air)\.(?:light|medium|heavy|technique\..+))\.(startup|active|recovery)$/.exec(clip.id);
        if (!match || clip.loop || clip.status !== "validated") continue;
        const key = clipKey(match[1], clip.facing);
        attackGroups.set(key, [...(attackGroups.get(key) ?? []), clip]);
      }
      for (const clips of attackGroups.values()) {
        if (clips.length !== 3 || !["startup", "active", "recovery"].every(phase => clips.some(clip => clip.id.endsWith("." + phase)))) continue;
        const merged = { ...clips[0], id: "phase-group", frames: clips.flatMap(clip => clip.frames) };
        const groupedAtlas = { ...atlas, clips: [merged] };
        const accepted = countHunterSpriteAtlasCoverage([groupedAtlas], [{ characterId: atlas.characterId,
          variantId: atlas.variantId, clipId: merged.id, facing: merged.facing, minimumDistinctFrames: 3 }], prepared);
        if (accepted.coveredCount === 1) clips.forEach(clip => readyClips.add(clipKey(clip.id, clip.facing)));
      }
      // A jump can hold its tuck at the apex/descent. Require all three phases,
      // native-facing prepared pixels, and a genuinely changing two-drawing rise.
      // A lone static jump pose or a repeated/looped drawing never qualifies.
      for (const facing of ["right", "left"] as const) {
        const clips = ["rise", "apex", "fall"].map(phase => atlas.clips.find(clip =>
          clip.id === "pit.air.jump." + phase && clip.facing === facing));
        if (clips.some(clip => !clip || clip.status !== "validated" || clip.loop) ||
          !readyClips.has(clipKey("pit.air.jump.rise", facing))) continue;
        const completeClips = clips.filter((clip): clip is typeof atlas.clips[number] => Boolean(clip));
        const heldRequirements = completeClips.map(clip => ({ characterId: atlas.characterId,
          variantId: atlas.variantId, clipId: clip.id, facing, minimumDistinctFrames: 1 }));
        const heldCoverage = countHunterSpriteAtlasCoverage([atlas], heldRequirements, prepared);
        if (heldCoverage.coveredCount === 3) completeClips.forEach(clip => readyClips.add(clipKey(clip.id, facing)));
      }
      for (const pose of definition.heldPoseClips ?? []) {
        const held = countHunterSpriteAtlasCoverage([atlas], [{ characterId: atlas.characterId,
          variantId: atlas.variantId, clipId: pose.id, facing: pose.facing, minimumDistinctFrames: 1 }], prepared);
        if (held.coveredCount === 1) readyClips.add(clipKey(pose.id, pose.facing));
      }
      if (readyClips.size && !options.signal?.aborted) animations.push({ definition, pages, readyClips });
      else { pages.forEach(canvas => { canvas.width = 0; canvas.height = 0; }); failedAtlasIds.push(atlas.id); }
    }));
  } else candidates.forEach(entry => failedAtlasIds.push(entry.atlas.id));
  if (options.signal?.aborted) {
    animations.forEach(entry => entry.pages.forEach(canvas => { canvas.width = 0; canvas.height = 0; }));
    animations.length = 0;
  }
  // Resolution priority is authored registry order, never asynchronous decode order.
  animations.sort((a, b) => candidates.findIndex(entry => entry.atlas.id === a.definition.atlas.id) -
    candidates.findIndex(entry => entry.atlas.id === b.definition.atlas.id));
  const bank: PitSpriteSheetAnimationBank = Object.freeze({ requestedIds,
    readyClipCount: animations.reduce((sum, entry) => sum + entry.readyClips.size, 0),
    failedAtlasIds: Object.freeze(failedAtlasIds), cancelled: Boolean(options.signal?.aborted) });
  evidence.set(bank, { animations, selections, cursors: new Map(), signal: options.signal });
  return bank;
}

export interface PitSpriteSheetPresentationFrame {
  readonly definition: PitSpriteSheetAnimationDefinition;
  readonly frame: HunterSpriteAtlasFrameLookup;
  readonly source: HTMLCanvasElement;
  readonly status: "dedicated-animation" | "reused-idle-animation" | "staged-held-pose";
  readonly cue: PitFighterPresentationCue;
}

/** Presentation time never updates the simulation-motion cursor or fighter state. */
export function resolvePitSpriteSheetPresentation(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  options: PitSpriteSheetAnimationOptions = {},
): PitSpriteSheetPresentationFrame | null {
  const cue = getPitFighterPresentationCue(fighter.slot, options.presentation, options.reducedMotion);
  const proof = bank && evidence.get(bank);
  if (!cue || !proof || bank.cancelled || proof.signal?.aborted ||
      !proof.selections.has(selectionKey(fighter.definitionId, fighter.variantId)) ||
      (fighter.facing !== 1 && fighter.facing !== -1)) return null;
  const facing = fighter.facing === 1 ? "right" : "left";
  const choices: { id: string; mode: "play" | "first" | "last"; status: PitSpriteSheetPresentationFrame["status"] }[] = [];
  if (cue.kind === "intro" || cue.kind === "victory" || cue.kind === "defeat") {
    choices.push({ id: "pit.presentation." + cue.kind, mode: "play", status: "dedicated-animation" });
  } else if (cue.kind === "waiting" || cue.kind === "ready") {
    // Keep the exact reviewed entrance connected to its waiting/countdown pose.
    // This is a held drawing, not a new idle animation or a gameplay cursor.
    choices.push({ id: "pit.presentation.intro", mode: cue.kind === "waiting" ? "first" : "last",
      status: "staged-held-pose" });
  }
  if (cue.kind === "defeat") {
    // A crouched or idle drawing is a declared held fallback, not a death clip.
    choices.push({ id: "crouch", mode: "last", status: "staged-held-pose" },
      { id: "idle", mode: "last", status: "staged-held-pose" });
  } else {
    const held = cue.kind === "waiting" || cue.kind === "ready";
    choices.push({ id: "idle", mode: held ? "first" : "play",
      status: held ? "staged-held-pose" : "reused-idle-animation" });
  }
  // Search by semantic priority before registry order: a later dedicated atlas
  // must beat an older idle page without borrowing another costume or side.
  for (const choice of choices) for (const animation of proof.animations) {
    if (!ownsAppearance(animation.definition, fighter) ||
        !animation.readyClips.has(clipKey(choice.id, facing))) continue;
    const first = resolveHunterSpriteAtlasFrame(animation.definition.atlas, choice.id, facing, 0);
    if (!first) continue;
    if (choice.id.startsWith("pit.presentation.") && first.clip.loop) continue;
    const elapsed = choice.mode === "last" || (cue.reducedMotion && choice.status === "dedicated-animation")
      ? Math.max(0, first.totalTicks - 1)
      : choice.mode === "first" || cue.reducedMotion ? 0
        : Math.floor(cue.elapsedMs * first.clip.ticksPerSecond / 1000);
    const frame = resolveHunterSpriteAtlasFrame(animation.definition.atlas, choice.id, facing, elapsed);
    if (!frame) continue;
    const source = animation.pages.get(frame.page.id);
    if (source && source.width === frame.page.width && source.height === frame.page.height) {
      return { definition: animation.definition, frame, source, status: choice.status, cue };
    }
  }
  return null;
}

export function drawPitSpriteSheetPresentation(
  context: CanvasRenderingContext2D,
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  groundY: number,
  options: PitSpriteSheetAnimationOptions & { highContrast?: boolean; accent?: string } = {},
): boolean {
  if (![fighter.x, fighter.y, groundY].every(finite)) return false;
  const presentation = resolvePitSpriteSheetPresentation(bank, fighter, options);
  if (!presentation) return false;
  const { rect, pivot } = presentation.frame.frame;
  const bodyHeight = presentation.definition.pageBodyHeightPx?.[presentation.frame.page.id] ?? presentation.definition.bodyHeightPx;
  const treatment = getPitFighterPresentationTreatment(presentation.cue, presentation.status === "dedicated-animation");
  const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / bodyHeight * treatment.scale;
  context.save();
  try {
    context.filter = treatment.filter;
    context.globalAlpha *= treatment.alpha;
    context.imageSmoothingEnabled = false;
    context.shadowColor = treatment.glow ?? "transparent";
    context.shadowBlur = treatment.glowBlur;
    if (options.highContrast) { context.shadowColor = options.accent ?? "#eaffed"; context.shadowBlur = 4; }
    // Theatre drawings rest on the scene floor even when the final combat tick
    // had an airborne KO. This is a draw anchor, never a simulation y write.
    context.drawImage(presentation.source, ...rect,
      fighter.x - pivot[0] * scale, groundY - pivot[1] * scale, rect[2] * scale, rect[3] * scale);
    return true;
  } finally { context.restore(); }
}

/** Observes uncovered states too, keeping action-entry clocks honest on later coverage. */
export function resolvePitSpriteSheetAnimation(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  options: PitSpriteSheetAnimationOptions = {},
): PitSpriteSheetAnimationFrame | null {
  if (getPitFighterPresentationCue(fighter.slot, options.presentation, options.reducedMotion)) return null;
  const proof = bank && evidence.get(bank);
  const selection = selectionKey(fighter.definitionId, fighter.variantId);
  if (!proof || bank.cancelled || proof.signal?.aborted || !proof.selections.has(selection)) return null;
  const simulationFrame = options.simulationFrame ?? options.combat?.frame ?? 0;
  const previous = proof.cursors.get(fighter.slot);
  const motion = describePitHunterSpriteMotion(fighter, simulationFrame,
    previous?.selection === selection ? previous.cursor : undefined, options.combat);
  if (!motion) { proof.cursors.delete(fighter.slot); return null; }
  proof.cursors.set(fighter.slot, { selection, cursor: motion.cursor });
  for (const animation of proof.animations) {
    if (!ownsAppearance(animation.definition, fighter) ||
      !animation.readyClips.has(clipKey(motion.clipId, motion.facing))) continue;
    const resolved = resolvePitHunterSpriteFrame(animation.definition.atlas, motion);
    if (!resolved) continue;
    const source = animation.pages.get(resolved.frame.page.id);
    if (source && source.width === resolved.frame.page.width && source.height === resolved.frame.page.height)
      return { definition: animation.definition, resolved, source };
  }
  return null;
}

/** No pose stretching, mirroring, tweening or mutation of combat state. */
export function drawPitSpriteSheetAnimation(
  context: CanvasRenderingContext2D,
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  groundY: number,
  options: PitSpriteSheetAnimationOptions & { highContrast?: boolean; accent?: string } = {},
): boolean {
  if (![fighter.x, fighter.y, groundY].every(finite)) return false;
  if (getPitFighterPresentationCue(fighter.slot, options.presentation, options.reducedMotion)) {
    return drawPitSpriteSheetPresentation(context, bank, fighter, groundY, options);
  }
  const animation = resolvePitSpriteSheetAnimation(bank, fighter, options);
  if (!animation) return false;
  const { rect, pivot } = animation.resolved.frame.frame;
  const bodyHeight = animation.definition.pageBodyHeightPx?.[animation.resolved.frame.page.id] ?? animation.definition.bodyHeightPx;
  const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / bodyHeight;
  context.save();
  try {
    context.filter = "none";
    context.imageSmoothingEnabled = false;
    if (fighter.cloakPhase !== "inactive") context.globalAlpha *= fighter.cloakPhase === "active" ? .38 : .65;
    if (options.highContrast) { context.shadowColor = options.accent ?? "#eaffed"; context.shadowBlur = 4; }
    context.drawImage(animation.source, ...rect,
      fighter.x - pivot[0] * scale, groundY - fighter.y - pivot[1] * scale, rect[2] * scale, rect[3] * scale);
    return true;
  } finally { context.restore(); }
}

/** Stable metadata envelope for every accepted pose on the independently authored side. */
export function getPitSpriteSheetAnimationVisualBounds(
  fighter: PitFighterState,
  groundY: number,
  registry: readonly PitSpriteSheetAnimationDefinition[],
): { x: number; y: number; width: number; height: number } | null {
  if (![fighter.x, fighter.y, groundY].every(finite) || (fighter.facing !== 1 && fighter.facing !== -1)) return null;
  const facing = fighter.facing === 1 ? "right" : "left";
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const definition of registry) {
    if (!ownsAppearance(definition, fighter) || !isAcceptedDefinition(definition)) continue;
    for (const clip of definition.atlas.clips) {
      if (clip.status !== "validated" || clip.facing !== facing) continue;
      for (const frame of clip.frames) {
        if (!definition.atlas.pages.some(page => page.id === frame.pageId && page.status === "validated")) continue;
        const reference = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx;
        const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / reference;
        const visible = definition.visibleFrameBounds?.find(bound => bound.pageId === frame.pageId &&
          bound.rect.every((value, index) => value === frame.rect[index]))?.visibleRect ?? frame.rect;
        const x = fighter.x + (visible[0] - frame.rect[0] - frame.pivot[0]) * scale;
        const y = groundY - fighter.y + (visible[1] - frame.rect[1] - frame.pivot[1]) * scale;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + visible[2] * scale); bottom = Math.max(bottom, y + visible[3] * scale);
      }
    }
  }
  return finite(left) ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}

export interface PitSpriteSheetHoldFrame {
  readonly definition: PitSpriteSheetAnimationDefinition;
  readonly frame: HunterSpriteAtlasFrameLookup;
  readonly source: HTMLCanvasElement;
}

/**
 * Honest held pose on the same authored side. A blocked hit retains the final
 * matching guard drawing; it is never certified as a newly drawn impact clip.
 * An exact supplied costume may retain its reviewed final intro stance while
 * standing still. This is a held drawing, never new idle-animation coverage.
 * Other missing states keep the historical idle or the selected supplied plate.
 */
export function resolvePitSpriteSheetHold(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  options: PitSpriteSheetAnimationOptions = {},
): PitSpriteSheetHoldFrame | null {
  if (getPitFighterPresentationCue(fighter.slot, options.presentation, options.reducedMotion)) return null;
  const proof = bank && evidence.get(bank);
  const selection = selectionKey(fighter.definitionId, fighter.variantId);
  if (!proof || bank.cancelled || proof.signal?.aborted || !proof.selections.has(selection)) return null;
  const simulationFrame = options.simulationFrame ?? options.combat?.frame ?? 0;
  const previous = proof.cursors.get(fighter.slot);
  const motion = describePitHunterSpriteMotion(fighter, simulationFrame,
    previous?.selection === selection ? previous.cursor : undefined, options.combat);
  if (!motion) return null;
  proof.cursors.set(fighter.slot, { selection, cursor: motion.cursor });
  const heldClips: { id: string; finalDrawing: boolean }[] = [];
  // Capture/throw recovery can also use the simulation's blockstun phase.
  // Only the actual resolved block reaction may borrow its own guard pose.
  if (motion.phase === "blockstun") {
    heldClips.push({ id: motion.posture === "crouch" ? "low-guard" : "high-guard", finalDrawing: true });
  }
  if (fighter.variantId !== undefined && motion.clipId === "idle" &&
    motion.posture === "stand" && motion.phase === "hold" &&
    fighter.velocityX === 0 && fighter.velocityY === 0 && fighter.y === 0 &&
    fighter.cloakPhase === "inactive") {
    heldClips.push({ id: "pit.presentation.intro", finalDrawing: true });
  }
  if (fighter.variantId === undefined) heldClips.push({ id: "idle", finalDrawing: false });
  for (const held of heldClips) for (const animation of proof.animations) {
    if (!ownsAppearance(animation.definition, fighter) || !animation.readyClips.has(clipKey(held.id, motion.facing))) continue;
    const first = resolveHunterSpriteAtlasFrame(animation.definition.atlas, held.id, motion.facing, 0);
    if (!first) continue;
    if (held.id === "pit.presentation.intro" && first.clip.loop) continue;
    const frame = held.finalDrawing
      ? resolveHunterSpriteAtlasFrame(animation.definition.atlas, held.id, motion.facing, Math.max(0, first.totalTicks - 1))
      : first;
    if (!frame) continue;
    const source = animation.pages.get(frame.page.id);
    if (source && source.width === frame.page.width && source.height === frame.page.height)
      return { definition: animation.definition, frame, source };
  }
  return null;
}

/** Holding a drawing is never added to animation coverage or reported as a clip. */
export function drawPitSpriteSheetHold(
  context: CanvasRenderingContext2D,
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  groundY: number,
  options: PitSpriteSheetAnimationOptions & { highContrast?: boolean; accent?: string } = {},
): boolean {
  if (![fighter.x, fighter.y, groundY].every(finite)) return false;
  const hold = resolvePitSpriteSheetHold(bank, fighter, options);
  if (!hold) return false;
  const { rect, pivot } = hold.frame.frame;
  const bodyHeight = hold.definition.pageBodyHeightPx?.[hold.frame.page.id] ?? hold.definition.bodyHeightPx;
  const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / bodyHeight;
  context.save();
  try {
    context.filter = "none"; context.imageSmoothingEnabled = false;
    if (fighter.cloakPhase !== "inactive") context.globalAlpha *= fighter.cloakPhase === "active" ? .38 : .65;
    if (options.highContrast) { context.shadowColor = options.accent ?? "#eaffed"; context.shadowBlur = 4; }
    context.drawImage(hold.source, ...rect, fighter.x - pivot[0] * scale,
      groundY - fighter.y - pivot[1] * scale, rect[2] * scale, rect[3] * scale);
    return true;
  } finally { context.restore(); }
}
