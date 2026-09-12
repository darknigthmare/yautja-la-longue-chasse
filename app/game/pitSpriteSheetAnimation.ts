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

/** Art review belongs to the registry. Successful decoding never approves art. */
export interface PitSpriteSheetAnimationDefinition {
  readonly fighterId: PitFighterId;
  /** One measured standing-body reference shared by every pose; never fit each pose. */
  readonly bodyHeightPx: number;
  /** Optional measured reference per page, still uniform in both axes. */
  readonly pageBodyHeightPx?: Readonly<Record<string, number>>;
  readonly atlas: HunterSpriteAtlas;
}
export interface PitSpriteSheetAnimationBank {
  readonly requestedIds: ReadonlySet<PitFighterId>;
  readonly readyClipCount: number;
  readonly failedAtlasIds: readonly string[];
  readonly cancelled: boolean;
}
export interface PitSpriteSheetAnimationOptions {
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
  readonly cursors: Map<0 | 1, PitHunterSpriteCursor>;
  readonly signal?: AbortSignal;
}
export interface PitSpriteSheetAnimationFrame {
  readonly definition: PitSpriteSheetAnimationDefinition;
  readonly resolved: PitHunterSpriteFrame;
  readonly source: HTMLCanvasElement;
}
const evidence = new WeakMap<PitSpriteSheetAnimationBank, BankEvidence>();
const clipKey = (id: string, facing: string) => JSON.stringify([id, facing]);
const finite = (value: number) => Number.isFinite(value);

function isAcceptedDefinition(definition: PitSpriteSheetAnimationDefinition): boolean {
  const { atlas } = definition;
  return Object.hasOwn(PIT_FIGHTERS, definition.fighterId) && finite(definition.bodyHeightPx) &&
    definition.bodyHeightPx > 0 && validateHunterSpriteAtlas(atlas).valid &&
    atlas.characterId === definition.fighterId && atlas.status === "validated" &&
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
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PitSpriteSheetAnimationBank> {
  const requestedIds = new Set(ids);
  const failedAtlasIds: string[] = [];
  const animations: PreparedAnimation[] = [];
  const timeoutMs = finite(options.timeoutMs ?? NaN)
    ? Math.max(1, Math.min(30_000, Math.floor(options.timeoutMs!))) : 12_000;
  const candidates = registry.filter(entry => requestedIds.has(entry.fighterId));
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
  evidence.set(bank, { animations, cursors: new Map(), signal: options.signal });
  return bank;
}

/** Observes uncovered states too, keeping action-entry clocks honest on later coverage. */
export function resolvePitSpriteSheetAnimation(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  options: PitSpriteSheetAnimationOptions = {},
): PitSpriteSheetAnimationFrame | null {
  const proof = bank && evidence.get(bank);
  if (!proof || bank.cancelled || proof.signal?.aborted || !bank.requestedIds.has(fighter.definitionId)) return null;
  const simulationFrame = options.simulationFrame ?? options.combat?.frame ?? 0;
  const motion = describePitHunterSpriteMotion(fighter, simulationFrame, proof.cursors.get(fighter.slot), options.combat);
  if (!motion) { proof.cursors.delete(fighter.slot); return null; }
  proof.cursors.set(fighter.slot, motion.cursor);
  for (const animation of proof.animations) {
    if (animation.definition.fighterId !== fighter.definitionId ||
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
    if (definition.fighterId !== fighter.definitionId || !isAcceptedDefinition(definition)) continue;
    for (const clip of definition.atlas.clips) {
      if (clip.status !== "validated" || clip.facing !== facing) continue;
      for (const frame of clip.frames) {
        if (!definition.atlas.pages.some(page => page.id === frame.pageId && page.status === "validated")) continue;
        const reference = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx;
        const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / reference;
        const x = fighter.x - frame.pivot[0] * scale;
        const y = groundY - fighter.y - frame.pivot[1] * scale;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + frame.rect[2] * scale); bottom = Math.max(bottom, y + frame.rect[3] * scale);
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

/** Honest static fallback from the first idle drawing of the same authored side. */
export function resolvePitSpriteSheetHold(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighter: PitFighterState,
  options: PitSpriteSheetAnimationOptions = {},
): PitSpriteSheetHoldFrame | null {
  const proof = bank && evidence.get(bank);
  if (!proof || bank.cancelled || proof.signal?.aborted || !bank.requestedIds.has(fighter.definitionId)) return null;
  const simulationFrame = options.simulationFrame ?? options.combat?.frame ?? 0;
  const motion = describePitHunterSpriteMotion(fighter, simulationFrame, proof.cursors.get(fighter.slot), options.combat);
  if (!motion) return null;
  proof.cursors.set(fighter.slot, motion.cursor);
  for (const animation of proof.animations) {
    if (animation.definition.fighterId !== fighter.definitionId || !animation.readyClips.has(clipKey("idle", motion.facing))) continue;
    const frame = resolveHunterSpriteAtlasFrame(animation.definition.atlas, "idle", motion.facing, 0);
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
