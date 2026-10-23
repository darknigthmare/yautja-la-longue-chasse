import admissionData from './data/pitWorkbookAnimationsV100.json';
import scopeData from './data/pitWorkbookScopeV105.json';
import suppliedArt from './data/pitUserHuntersV44.json';
import { PIT_SPRITE_SHEET_REGISTRY } from './pitSpriteSheetRegistry';
import { validateHunterSpriteAtlas } from './hunterSpriteAtlas';
import type { PitSpriteSheetAnimationDefinition } from './pitSpriteSheetAnimation';
import type { PitWorkbookNativeAdmissionV100 } from './pitWorkbookAnimationV100';

export type PitWorkbookCapabilityFighterV107 = 'feral-hunter' | 'scar';
export interface PitWorkbookMeasuredPageV107 {
  readonly src: string; readonly sha256: string; readonly width: number; readonly height: number;
}
export interface PitWorkbookNativeCapabilityV107 {
  readonly id: string; readonly atlasId: string; readonly clipIds: readonly string[];
  readonly nativeFacings: readonly ('right' | 'left')[];
  readonly pages: readonly PitWorkbookMeasuredPageV107[];
}
/** SHA values measured from the actual historical native pages, not from the
 * static V44 portrait. No page here admits a V54 attack for that costume. */
const scarMaskedPageHashes: Readonly<Record<string, string>> = {
  '/game/sprites/v93/pit/scar/003-scar-masked-dizzy-r2-v93.png': 'f990b64ecbf5d4848a13c7c24d8bf2ed89371fff3f3ccfab18f377ea5709e0dd',
  '/game/sprites/v93/pit/scar/004-scar-masked-taunt-r2-v93.png': '4740d5b1a51d70173fb9237c975fc228f387c077254934313975a3405a671beb',
  '/game/sprites/v93/pit/scar/006-scar-masked-idle-r2-v93.png': '7f6ab1620ce5e7caf5cedece02819b38b39f885e9751087de36e9730d9345407',
  '/game/sprites/v52/pit/scar/scar-masked-intro-v52.png': 'fd6ba211249e342e79836d8983c6f12fa35f1f34c3863fe22c41cfba32b2a6a6',
  '/game/sprites/v52/pit/scar/scar-masked-victory-v52.png': 'fac53084c1da72d7c541d75ff5da7e013a8825402214f5b04feac11a72ef29f8',
  '/game/sprites/v52/pit/scar/scar-masked-defeat-v52.png': '8d946288c60186538416f6773c963db7e6bdc32cdc3ec2cb18b92b1af5f6146a',
  '/game/sprites/v53/pit/scar/scar-masked-forward-shuffle-v53.png': '388dadab26a8b506627b3c2ebc537a6457c3079f401cc78a8b0307b0c18d6f8a',
};
const supported = (id: string): id is PitWorkbookCapabilityFighterV107 => id === 'feral-hunter' || id === 'scar';
const admissions = admissionData as unknown as readonly PitWorkbookNativeAdmissionV100[];
/** Existing right-facing reference portraits, deliberately never an action
 * admission. File hashes/dimensions are independently checked by V107 tests. */
export const PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107 = suppliedArt.fighters
  .filter(fighter => supported(fighter.id)).flatMap(fighter => fighter.variants.map(variant => ({
    fighterId: fighter.id, variantId: variant.id, src: variant.src, sha256: variant.sha256,
    width: variant.width, height: variant.height, nativeFacing: variant.nativeFacing,
    frameCount: variant.frameCount, animated: variant.animated, canonicalFidelityCertified: false as const,
  })));


function measure(definition: PitSpriteSheetAnimationDefinition | undefined, id: string,
  ids: readonly string[], hashes: Readonly<Record<string, string>>): PitWorkbookNativeCapabilityV107 | null {
  if (!definition || definition.bodyHeightPx <= 0 || !validateHunterSpriteAtlas(definition.atlas).valid ||
    definition.atlas.status !== 'validated' || !ids.length) return null;
  const clips = definition.atlas.clips.filter(clip => ids.includes(clip.id));
  if (ids.some(clipId => !(['right', 'left'] as const).every(facing => clips.some(clip =>
    clip.id === clipId && clip.facing === facing && clip.status === 'validated' && clip.frames.length > 0)))) return null;
  const pages = definition.atlas.pages.filter(page => clips.some(clip => clip.frames.some(frame => frame.pageId === page.id)));
  if (!pages.length || pages.some(page => !/^[a-f0-9]{64}$/.test(hashes[page.src] ?? ''))) return null;
  return {id, atlasId: definition.atlas.id, clipIds: [...ids], nativeFacings: ['right', 'left'],
    pages: [...new Map(pages.map(page => [page.src, {src: page.src, sha256: hashes[page.src], width: page.width, height: page.height}])).values()]};
}

/** Source constraints stay open. Coverage below measures drawings only: it
 * cannot promote an action binding, weapon inventory, campaign or full kit. */
export const PIT_WORKBOOK_VARIANT_CONSTRAINTS_V107 = scopeData.fighters.flatMap(fighter =>
  fighter.variantConstraints.map(row => ({...row, fighterId: fighter.fighterId, status: 'OPEN_SOURCE_CONSTRAINT' as const})));

export function getPitWorkbookVariantCapabilitiesV107(fighterId: string, variantId?: string | null) {
  const fighter = supported(fighterId) ? fighterId : null;
  const defaultAppearance = variantId === undefined || variantId === null;
  const source = suppliedArt.fighters.find(item => item.id === fighter);
  const reference = !defaultAppearance ? source?.variants.find(item => item.id === variantId) ?? null : null;
  const nativeActions: PitWorkbookNativeCapabilityV107[] = [];
  const nativeClips: PitWorkbookNativeCapabilityV107[] = [];
  if (fighter && defaultAppearance) {
    for (const entry of admissions.filter(item => item.fighterId === fighter && item.appearanceId === 'runtime-default' && item.review.status === 'validated')) {
      const definition: PitSpriteSheetAnimationDefinition | undefined = entry.definition ?? PIT_SPRITE_SHEET_REGISTRY.find(item => item.fighterId === fighter && item.variantId === undefined && item.atlas.id === entry.atlasId);
      if (definition?.variantId !== undefined || definition?.fighterId !== fighter) continue;
      const hashes = entry.review.sourceHashes ?? Object.fromEntries((definition?.atlas.pages ?? []).map(page => [page.src, entry.review.sourceSha256 ?? '']));
      const measured = measure(definition, entry.actionId, entry.clipIds, hashes);
      if (measured) nativeActions.push(measured);
    }
  } else if (fighter === 'scar' && variantId === 'scar-avec-casque-6a0a69930d') {
    for (const definition of PIT_SPRITE_SHEET_REGISTRY.filter(item => item.fighterId === fighter && item.variantId === variantId)) {
      for (const clipId of [...new Set(definition.atlas.clips.map(clip => clip.id))]) {
        const measured = measure(definition, clipId, [clipId], scarMaskedPageHashes);
        if (measured) nativeClips.push(measured);
      }
    }
  }
  return {
    fighterId, variantId: variantId ?? null, supportedFighter: fighter !== null,
    appearanceKnown: fighter !== null && (defaultAppearance || reference !== null),
    sourceIncarnation: fighter === 'feral-hunter' ? 'Prey (2022)' : fighter === 'scar' ? 'AVP (2004)' : null,
    sourceRecipeOwnershipAllowed: fighter !== null && defaultAppearance,
    staticReference: reference ? {src: reference.src, sha256: reference.sha256, width: reference.width, height: reference.height,
      nativeFacing: reference.nativeFacing, frameCount: reference.frameCount, animated: reference.animated} : null,
    nativeActions, nativeClips,
    functionalEquipmentStatesAdmitted: false as const, damagedArmorStatesAdmitted: false as const,
    maskTransitionsAdmitted: false as const, canonicalFidelityCertified: false as const, fullKitComplete: false as const,
    constraints: PIT_WORKBOOK_VARIANT_CONSTRAINTS_V107.filter(row => row.fighterId === fighter),
  };
}
export interface PitWorkbookVariantGuardRequestV107 {
  readonly fighterId: string; readonly variantId?: string | null;
  readonly purpose: 'native-action-drawing' | 'native-clip' | 'cloak-effect';
  readonly id?: string; readonly facing?: 'right' | 'left';
  readonly equipment?: 'source-equipped' | 'lost' | 'stowed' | 'broken';
  readonly armor?: 'source-intact' | 'damaged'; readonly mask?: 'source-default' | 'masked' | 'unmasked';
  /** True only when the actual runtime equipment/chapter permits this effect. */
  readonly equipmentAllowsCloak?: boolean;
}
/** Fail closed for unsupported changed states. Callers keep their historical
 * recipe for other costumes; a static portrait never acquires workbook moves. */
export function guardPitWorkbookVariantCapabilityV107(request: PitWorkbookVariantGuardRequestV107) {
  const capability = getPitWorkbookVariantCapabilitiesV107(request.fighterId, request.variantId);
  let reason: string | null = null;
  if (!['native-action-drawing', 'native-clip', 'cloak-effect'].includes(request.purpose)) reason = 'UNKNOWN_CAPABILITY_PURPOSE';
  else if (!capability.appearanceKnown) reason = 'UNKNOWN_APPEARANCE';
  else if (request.equipment && request.equipment !== 'source-equipped') reason = 'EQUIPMENT_STATE_NOT_ADMITTED';
  else if (request.armor && request.armor !== 'source-intact') reason = 'DAMAGED_ARMOR_NOT_ADMITTED';
  else if (request.mask && request.mask !== 'source-default') reason = 'MASK_TRANSITION_NOT_ADMITTED';
  else if (request.purpose === 'cloak-effect') {
    if (request.fighterId !== 'scar' || !request.equipmentAllowsCloak) reason = 'INCARNATION_OR_EQUIPMENT_DISALLOWS_CLOAK';
  } else {
    const entries = request.purpose === 'native-action-drawing' ? capability.nativeActions : capability.nativeClips;
    const entry = entries.find(item => item.id === request.id);
    if (!entry || !request.facing || !entry.nativeFacings.includes(request.facing)) reason = 'EXACT_NATIVE_SEQUENCE_NOT_ADMITTED';
  }
  return {available: reason === null, reason, mechanicsCertified: false as const, fullKitComplete: false as const};
}
