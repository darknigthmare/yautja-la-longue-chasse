import data from './data/pitWorkbookThrowsV109.json';
import {validateHunterSpriteAtlas, type HunterSpriteAtlasClip, type HunterSpriteAtlasFrame} from './hunterSpriteAtlas';
import {PIT_WORKBOOK_AND_LEGACY_REGISTRY_V107, getPitWorkbookRuntimeBindingV107} from './pitWorkbookRegistryV107';
import {isPitWorkbookThrowFighterV109, type PitWorkbookThrowFighterV109} from './systems/pitWorkbookCombatV109';
import {getPitSpriteSheetAtlasReadiness, type PitSpriteSheetAnimationBank, type PitSpriteSheetAnimationDefinition} from './pitSpriteSheetAnimation';

export interface PitForwardThrowNativeAdmissionV109 {
  fighterId: PitWorkbookThrowFighterV109;
  role: 'attacker' | 'victim';
  facing: 'right' | 'left';
  sources: readonly {pageId: string; path: string; sha256: string; bytes: number; receiptPath: string}[];
  review: {status: 'validated'; scope: string; notes: string};
  definition: PitSpriteSheetAnimationDefinition;
}
const admissions = data.admissions as unknown as readonly PitForwardThrowNativeAdmissionV109[];
const timings = {attacker: [4, 4, 1, 2, 15, 15], victim: [4, 4, 2, 9, 24, 18]} as const;
const actionId = (hero: PitWorkbookThrowFighterV109) => hero === 'scar' ? 'M_F003_TH_F' : 'M_F006_TH_F';
const fullClipId = (admission: PitForwardThrowNativeAdmissionV109) =>
  admission.role === 'attacker' ? 'workbook.' + actionId(admission.fighterId) : 'workbook.forward-throw-v109.victim';

function accepted(item: PitForwardThrowNativeAdmissionV109): boolean {
  if (!item || !isPitWorkbookThrowFighterV109(item.fighterId) || !['attacker', 'victim'].includes(item.role) ||
    !['right', 'left'].includes(item.facing) || item.review?.status !== 'validated' ||
    !item.review.scope || !item.review.notes || !Array.isArray(item.sources) || !item.sources.length ||
    item.sources.some(source => !source || !source.pageId || !/^public\/.+\.png$/.test(source.path ?? '') ||
      !/^[a-f0-9]{64}$/.test(source.sha256) || !Number.isSafeInteger(source.bytes) || source.bytes <= 0 ||
      !/^docs\/.+\.json$/.test(source.receiptPath ?? ''))) return false;
  const definition = item.definition;
  if (!definition || definition.fighterId !== item.fighterId || definition.variantId !== undefined ||
    !definition.atlas || definition.atlas.characterId !== item.fighterId || definition.atlas.status !== 'validated' ||
    !validateHunterSpriteAtlas(definition.atlas).valid || definition.atlas.pages.length !== item.sources.length ||
    new Set(item.sources.map(source => source.pageId)).size !== item.sources.length ||
    definition.atlas.pages.some(page => !item.sources.some(source => source.pageId === page.id && source.path === 'public' + page.src)) || definition.atlas.clips.length !== 1 ||
    !Number.isFinite(definition.bodyHeightPx) || definition.bodyHeightPx <= 0) return false;
  const clip = definition.atlas.clips[0];
  if (clip.id !== fullClipId(item) || clip.facing !== item.facing || clip.loop || clip.status !== 'validated' ||
    clip.ticksPerSecond !== 60 || clip.frames.length !== 6 ||
    clip.frames.some((frame, index) => frame.durationTicks !== timings[item.role][index])) return false;
  return new Set(clip.frames.map(frame => JSON.stringify([frame.pageId, frame.rect]))).size === 6;
}

/** Review metadata is an explicit admission gate. The producer's actual PNG,
 * alpha, anatomy, independent facing and receipt checks happen before setting
 * it. Missing or rejected art never exposes a placeholder throw in the game. */
export const PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109 = admissions.filter(accepted);
export const PIT_FORWARD_THROW_REJECTED_ADMISSIONS_V109 = admissions.filter(item => !accepted(item));
const native = (hero: PitWorkbookThrowFighterV109, role: 'attacker' | 'victim', facing: 'right' | 'left') => {
  const rows = PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109.filter(item => item.fighterId === hero && item.role === role && item.facing === facing);
  return rows.length === 1 ? rows[0] : null;
};
export const PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109 =
  PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109.length === 8 && PIT_FORWARD_THROW_REJECTED_ADMISSIONS_V109.length === 0 &&
  new Set(PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109.flatMap(item => item.definition.atlas.clips[0].frames.map(frame =>
    JSON.stringify([item.sources.find(source => source.pageId === frame.pageId)?.sha256, frame.rect])))).size === 48 &&
  (['feral-hunter', 'scar'] as const).every(hero => (['attacker', 'victim'] as const).every(role =>
    (['right', 'left'] as const).every(facing => Boolean(native(hero, role, facing)))));

export const PIT_WORKBOOK_FORWARD_THROW_ADMITTED_IDS_V109: readonly string[] =
  PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109 ? ['M_F006_TH_F', 'M_F003_TH_F'] : [];

export function getPitWorkbookForwardThrowSupportV109(fighterId: string, targetId?: string, variants: readonly (string | null | undefined)[] = []) {
  const compatible = isPitWorkbookThrowFighterV109(fighterId) &&
    (targetId === undefined || isPitWorkbookThrowFighterV109(targetId) && targetId !== fighterId) && !variants.some(Boolean);
  return {
    status: !compatible ? 'unsupported-partner-or-costume' as const : PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109 ? 'admitted-duo' as const : 'awaiting-native-art' as const,
    supported: compatible && PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109,
    actionId: isPitWorkbookThrowFighterV109(fighterId) ? actionId(fighterId) : null,
    partnerScope: 'unvaried-feral-scar-duo' as const,
    sourceCompletion: false as const,
  };
}

export function getPitForwardThrowWorkbookFactsV109() {
  const count = (hero: PitWorkbookThrowFighterV109, role: 'attacker' | 'victim') =>
    new Set(PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109.filter(item => item.fighterId === hero && item.role === role)
      .flatMap(item => item.definition.atlas.clips[0].frames.map(frame =>
        JSON.stringify([item.sources.find(source => source.pageId === frame.pageId)?.sha256, frame.rect])))).size;
  const attackerDrawings = {'feral-hunter': count('feral-hunter', 'attacker'), scar: count('scar', 'attacker')};
  const victimDrawings = {'feral-hunter': count('feral-hunter', 'victim'), scar: count('scar', 'victim')};
  return {
    boundActionIds: [...PIT_WORKBOOK_FORWARD_THROW_ADMITTED_IDS_V109],
    nativeBodyDrawings: Object.values(attackerDrawings).reduce((sum, value) => sum + value, 0) +
      Object.values(victimDrawings).reduce((sum, value) => sum + value, 0),
    feralBound: PIT_WORKBOOK_FORWARD_THROW_ADMITTED_IDS_V109.includes('M_F006_TH_F'),
    scarBound: PIT_WORKBOOK_FORWARD_THROW_ADMITTED_IDS_V109.includes('M_F003_TH_F'),
    attackerDrawings, victimDrawings, partnerScope: 'unvaried-feral-scar-duo' as const, sourceCompletion: false as const,
  };
}

function remapClip(clip: HunterSpriteAtlasClip, id: string, frames: readonly HunterSpriteAtlasFrame[]): HunterSpriteAtlasClip {
  return {...clip, id, frames: frames.map(frame => ({...frame})), loop: false};
}
function phaseDefinition(item: PitForwardThrowNativeAdmissionV109): PitSpriteSheetAnimationDefinition {
  const full = item.definition.atlas.clips[0], frames = full.frames;
  const clips = item.role === 'attacker' ? [
    remapClip(full, 'pit.stand.workbook-v109.TH_F.startup', frames.slice(0, 2)),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.active', frames.slice(2, 4)),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.active.whiff', [{...frames[1], durationTicks: 3}]),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.recovery.connected', frames.slice(4)),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.recovery.whiff', [{...frames[1], durationTicks: 5}, {...frames[5], durationTicks: 25}]),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.recovery.teched', [{...frames[5], durationTicks: 12}]),
  ] : [
    remapClip(full, 'pit.stand.workbook-v109.TH_F.victim', frames),
    remapClip(full, 'pit.stand.workbook-v109.TH_F.victim.ko', [{...frames[4], durationTicks: 60}]),
  ];
  return {...item.definition, atlas: {...item.definition.atlas, id: item.definition.atlas.id + '-runtime-v109', clips}};
}
export const PIT_WORKBOOK_FORWARD_THROW_REGISTRY_V109: readonly PitSpriteSheetAnimationDefinition[] =
  PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109 ? PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109.map(phaseDefinition) : [];
export const PIT_WORKBOOK_AND_LEGACY_REGISTRY_V109: readonly PitSpriteSheetAnimationDefinition[] =
  [...PIT_WORKBOOK_FORWARD_THROW_REGISTRY_V109, ...PIT_WORKBOOK_AND_LEGACY_REGISTRY_V107];

/** Admission is necessary; the public mode also waits for every selected role
 * to decode successfully. A failed victim PNG never becomes an upright pose. */
export function getPitForwardThrowArtReadinessV109(bank: PitSpriteSheetAnimationBank | null | undefined): 'loading' | 'missing' | 'ready' {
  if (!PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109) return 'missing';
  const statuses = PIT_WORKBOOK_FORWARD_THROW_REGISTRY_V109.map(definition =>
    getPitSpriteSheetAtlasReadiness(bank, definition.atlas.id, definition.fighterId, undefined,
      definition.atlas.clips.map(clip => ({id: clip.id, facing: clip.facing}))));
  return statuses.includes('missing') ? 'missing' : statuses.includes('loading') ? 'loading' : 'ready';
}

export function getPitWorkbookRuntimeBindingV109(fighterId: string, sourceActionId: string) {
  return PIT_WORKBOOK_FORWARD_THROW_ADMITTED_IDS_V109.includes(sourceActionId) &&
    getPitWorkbookForwardThrowSupportV109(fighterId).actionId === sourceActionId ? 'conditional-move' as const :
    getPitWorkbookRuntimeBindingV107(fighterId, sourceActionId);
}
