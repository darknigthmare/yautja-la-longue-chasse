import planData from './data/pitWorkbookAnimationPlanV100.json';
import admissionData from './data/pitWorkbookAnimationsV100.json';
import { validateHunterSpriteAtlas, type HunterSpriteAtlasClip } from './hunterSpriteAtlas';
import { PIT_SPRITE_SHEET_REGISTRY } from './pitSpriteSheetRegistry';
import { resolvePitSpriteSheetInspectionV100, type PitSpriteSheetAnimationBank, type PitSpriteSheetAnimationDefinition } from './pitSpriteSheetAnimation';
import { PIT_FIGHTERS, type PitFighterId } from './systems/pitCombat';
import { getSpriteContact } from './spriteContact';

export type PitWorkbookFighterV100 = 'feral-hunter' | 'scar';
export interface PitWorkbookActionV100 {
  readonly id: string; readonly cell: string; readonly sheet: string; readonly category: 'move' | 'presentation';
  readonly key: string; readonly label: string; readonly sourceText: string; readonly command?: string; readonly weapon?: string;
  /** Proposed Excel durations only; never applied to the combat engine. */
  readonly phaseTicks?: { readonly startup: number; readonly active: number; readonly recovery: number };
}
export interface PitWorkbookFighterPlanV100 {
  readonly fighterId: PitWorkbookFighterV100; readonly sourceRow: number; readonly appearanceId: 'runtime-default';
  readonly referenceSprites: readonly string[]; readonly actions: readonly PitWorkbookActionV100[];
}
export interface PitWorkbookNativeAdmissionV100 {
  readonly fighterId: PitWorkbookFighterV100; readonly actionId: string; readonly appearanceId: 'runtime-default';
  readonly atlasId: string; readonly clipIds: readonly string[];
  /** Story condition shown to the viewer; never unlocks or changes a scene. */
  readonly contextLabel?: string;
  /** Explicitly reviewed visual bindings only; workbook clips stay out of combat. */
  readonly combatClipIds?: readonly string[];
  /** New pixels may be inspected here without being registered as a move. */
  readonly definition?: PitSpriteSheetAnimationDefinition;
  readonly review: { readonly status: 'validated'; readonly scope: string; readonly notes: string;
    readonly sourceSha256?: string; readonly sourceHashes?: Readonly<Record<string, string>> };
}
export const PIT_WORKBOOK_PLAN_V100 = planData as unknown as {
  readonly schemaVersion: 1; readonly source: { readonly extractionPath: string; readonly extractionSha256: string;
    readonly workbookName: string; readonly workbookSha256: string; readonly originalAvailable: false };
  readonly fighters: readonly PitWorkbookFighterPlanV100[];
};
export const PIT_WORKBOOK_ADMISSIONS_V100 = admissionData as unknown as readonly PitWorkbookNativeAdmissionV100[];

export function getPitWorkbookFighterV100(id: unknown): PitWorkbookFighterPlanV100 | null {
  return PIT_WORKBOOK_PLAN_V100.fighters.find(fighter => fighter.fighterId === id) ?? null;
}
export function getPitWorkbookActionV100(fighterId: unknown, actionId: unknown): PitWorkbookActionV100 | null {
  return getPitWorkbookFighterV100(fighterId)?.actions.find(action => action.id === actionId) ?? null;
}

/** Source command existence is separate from source choreography/mechanics.
 * The old inputs and values remain authoritative, including their limitations. */
export function getPitWorkbookCombatLinkV100(fighterId: PitWorkbookFighterV100, action: PitWorkbookActionV100) {
  const admitted = PIT_WORKBOOK_ADMISSIONS_V100.find(item => item.fighterId === fighterId && item.actionId === action.id &&
    item.appearanceId === 'runtime-default' && item.review.status === 'validated');
  const normal = /^([52j])([LMH])$/.exec(action.key);
  if (normal) {
    const posture = normal[1] === '5' ? 'stand' : normal[1] === '2' ? 'crouch' : 'air';
    const attack = ({ L: 'light', M: 'medium', H: 'heavy' } as const)[normal[2] as 'L' | 'M' | 'H'];
    const incompatible = posture === 'stand' && (fighterId === 'scar' && attack !== 'light' || fighterId === 'feral-hunter' && attack === 'medium');
    const clipIds = ['startup', 'active', 'recovery'].map(phase => `pit.${posture}.${attack}.${phase}`);
    const bound = !incompatible && !!admitted && clipIds.every(id =>
      (admitted.combatClipIds?.includes(id) || fighterId === 'feral-hunter' && action.key === '5H' && admitted.clipIds.includes(id)) &&
      PIT_SPRITE_SHEET_REGISTRY.some(entry => entry.fighterId === fighterId && entry.variantId === undefined &&
        entry.atlas.id === admitted.atlasId && entry.atlas.clips.some(clip => clip.id === id)));
    return { status: bound ? 'existing-input-visual' as const : 'source-choreography-not-linked' as const,
      label: bound ? 'Action actuelle · images raccordées' : incompatible ? 'Chorégraphie source distincte du coup actuel' : 'Geste source · images non raccordées au duel',
      clipIds: bound ? clipIds : [],
      limitation: 'Les chiffres, hauteurs de garde et règles du classeur restent des propositions ; ils ne remplacent pas les valeurs historiques du combat.' };
  }
  if (fighterId === 'feral-hunter' && action.key === 'S1') return {
    status: 'existing-input-visual' as const, label: 'Technique actuelle : salve de carreaux',
    clipIds: ['startup', 'active', 'recovery'].map(phase => 'pit.stand.technique.feral-guided-bolts-v58.' + phase),
    limitation: 'La bouche physique et les replays V59 sont conservés ; les durées proposées du classeur ne remplacent pas les durées actuelles.' };
  return { status: 'source-choreography-not-linked' as const,
    label: action.category === 'presentation' ? 'Séquence source · inspection indépendante' : 'Geste source · mécanique distincte non raccordée', clipIds: [] as string[],
    limitation: 'La lecture dessine le geste ; elle ne crée aucune projection, arme, super, victime synchronisée, récompense ou état de combat.' };
}

export function getPitWorkbookNativeV100(fighterId: PitWorkbookFighterV100, actionId: string,
  admissions: readonly PitWorkbookNativeAdmissionV100[] = PIT_WORKBOOK_ADMISSIONS_V100,
  registry: readonly PitSpriteSheetAnimationDefinition[] = PIT_SPRITE_SHEET_REGISTRY) {
  const action = getPitWorkbookActionV100(fighterId, actionId);
  if (!action) return null;
  const admission = admissions.find(item => item.fighterId === fighterId && item.actionId === actionId &&
    item.appearanceId === 'runtime-default' && item.review?.status === 'validated');
  const definition = admission?.definition ?? registry.find(item => item.fighterId === fighterId && item.variantId === undefined && item.atlas.id === admission?.atlasId);
  if (!admission || !definition || definition.fighterId !== fighterId || definition.variantId !== undefined ||
    definition.atlas.id !== admission.atlasId || definition.atlas.characterId !== fighterId || definition.atlas.status !== 'validated' ||
    !Number.isFinite(definition.bodyHeightPx) || definition.bodyHeightPx <= 0 ||
    Object.values(definition.pageBodyHeightPx ?? {}).some(value => !Number.isFinite(value) || value <= 0) ||
    !validateHunterSpriteAtlas(definition.atlas).valid || !admission.clipIds.length || new Set(admission.clipIds).size !== admission.clipIds.length) return null;
  const selectedIds = new Set([...admission.clipIds, ...(admission.combatClipIds ?? [])]);
  const clips = definition.atlas.clips.filter(clip => selectedIds.has(clip.id));
  const pages = new Set(clips.flatMap(clip => clip.frames.map(frame => frame.pageId)));
  const frameKeys = new Set(clips.flatMap(clip => clip.frames.map(frame => JSON.stringify([frame.pageId, frame.rect]))));
  const selectedDefinition: PitSpriteSheetAnimationDefinition = { ...definition,
    pageBodyHeightPx: definition.pageBodyHeightPx ? Object.fromEntries(Object.entries(definition.pageBodyHeightPx).filter(([id]) => pages.has(id))) : undefined,
    heldPoseClips: definition.heldPoseClips?.filter(clip => selectedIds.has(clip.id)),
    visibleFrameBounds: definition.visibleFrameBounds?.filter(bound => frameKeys.has(JSON.stringify([bound.pageId, bound.rect]))),
    atlas: { ...definition.atlas, clips, pages: definition.atlas.pages.filter(page => pages.has(page.id)) } };
  return { action, admission, definition: selectedDefinition };
}

export interface PitWorkbookTimelineFrameV100 {
  readonly clipId: string; readonly clipFrameIndex: number; readonly nativeTick: number; readonly durationTicks60: number;
  readonly clip: HunterSpriteAtlasClip;
}
export function getPitWorkbookTimelineV100(native: NonNullable<ReturnType<typeof getPitWorkbookNativeV100>>, facing: 'left' | 'right'): readonly PitWorkbookTimelineFrameV100[] {
  const sequence: PitWorkbookTimelineFrameV100[] = [];
  for (const clipId of native.admission.clipIds) {
    const clip = native.definition.atlas.clips.find(candidate => candidate.id === clipId && candidate.facing === facing && candidate.status === 'validated');
    if (!clip) return [];
    let elapsed = 0;
    clip.frames.forEach((frame, index) => { sequence.push({ clipId, clipFrameIndex: index, nativeTick: elapsed, durationTicks60: frame.durationTicks * 60 / clip.ticksPerSecond, clip }); elapsed += frame.durationTicks; });
  }
  return sequence;
}

/** One camera for the entire action and both authored directions. This frames
 * long weapons and study partners without fitting individual body poses. */
export function getPitWorkbookCameraV100(native: NonNullable<ReturnType<typeof getPitWorkbookNativeV100>>,
  bank: PitSpriteSheetAnimationBank | null, width: number, height: number, maxZoom: number, preferredGroundY: number) {
  const padding = 24;
  if (![width, height, maxZoom, preferredGroundY].every(Number.isFinite) || width <= padding * 2 || height <= padding * 2 || maxZoom <= 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const facing of ['right', 'left'] as const) for (const selected of getPitWorkbookTimelineV100(native, facing)) {
    const inspected = resolvePitSpriteSheetInspectionV100(bank, { fighterId: native.admission.fighterId as PitFighterId,
      atlasId: native.definition.atlas.id, clipId: selected.clipId, facing, elapsedTicks: selected.nativeTick });
    if (!inspected) continue;
    const { rect, pivot } = inspected.frame.frame;
    const visible = native.definition.visibleFrameBounds?.find(bound => bound.pageId === inspected.frame.page.id && bound.rect.every((value, index) => value === rect[index]))?.visibleRect ?? rect;
    const reference = inspected.definition.pageBodyHeightPx?.[inspected.frame.page.id] ?? inspected.definition.bodyHeightPx;
    const scale = PIT_FIGHTERS[native.admission.fighterId].bodyHeight / reference;
    const contact = getSpriteContact(inspected.source, rect, pivot[1])?.offsetY ?? 0;
    const left = (visible[0] - rect[0] - pivot[0]) * scale;
    const top = (visible[1] - rect[1] - pivot[1] + contact) * scale;
    minX = Math.min(minX, left); minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + visible[2] * scale); maxY = Math.max(maxY, top + visible[3] * scale);
  }
  if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) return null;
  const zoom = Math.min(maxZoom, (width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  return { zoom, x: width / 2 - (minX + maxX) / 2 * zoom,
    groundY: Math.max(padding - minY * zoom, Math.min(preferredGroundY, height - padding - maxY * zoom)) };
}

export function drawPitWorkbookFrameV100(context: CanvasRenderingContext2D, bank: PitSpriteSheetAnimationBank | null,
  native: NonNullable<ReturnType<typeof getPitWorkbookNativeV100>>, facing: 'left' | 'right', index: number,
  x: number, groundY: number): boolean {
  if (![x, groundY].every(Number.isFinite) || !Number.isSafeInteger(index) || index < 0) return false;
  const sequence = getPitWorkbookTimelineV100(native, facing), selected = sequence[index];
  if (!selected) return false;
  const inspected = resolvePitSpriteSheetInspectionV100(bank, { fighterId: native.admission.fighterId as PitFighterId,
    atlasId: native.definition.atlas.id, clipId: selected.clipId, facing, elapsedTicks: selected.nativeTick });
  if (!inspected || inspected.frame.frameIndex !== selected.clipFrameIndex) return false;
  const { rect, pivot } = inspected.frame.frame;
  const reference = inspected.definition.pageBodyHeightPx?.[inspected.frame.page.id] ?? inspected.definition.bodyHeightPx;
  const scale = PIT_FIGHTERS[native.admission.fighterId].bodyHeight / reference;
  context.save();
  try {
    context.imageSmoothingEnabled = false;
    context.drawImage(inspected.source, ...rect, x - pivot[0] * scale,
      groundY - (pivot[1] - (getSpriteContact(inspected.source, rect, pivot[1])?.offsetY ?? 0)) * scale, rect[2] * scale, rect[3] * scale);
    return true;
  } finally { context.restore(); }
}
