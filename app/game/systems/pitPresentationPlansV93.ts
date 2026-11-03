import catalogData from '../data/pitPresentationPlansV93.json';
import { PIT_SPRITE_SHEET_REGISTRY } from '../pitSpriteSheetRegistry';
import type { PitSpriteSheetAnimationDefinition } from '../pitSpriteSheetAnimation';

/** Production planning only. These metadata never unlock a move or admit a PNG. */
export const PIT_PRESENTATION_CATEGORIES_V93 = ['idle', 'intro', 'round-victory', 'round-defeat', 'finisher-stunned', 'taunt'] as const;
export type PitPresentationCategoryV93 = typeof PIT_PRESENTATION_CATEGORIES_V93[number];
export type PitPresentationFacingV93 = 'left' | 'right';

export interface PitPresentationSourceV93 {
 readonly id: string; readonly title: string; readonly url: string;
 readonly scope: string; readonly supports: string; readonly doesNotEstablish: string;
 readonly accessStatus: 'primary-page-read' | 'primary-search-excerpt' | 'inherited-local-dossier';
 readonly checkedAt: string | null; readonly gestureEvidence: string; readonly oneToOneCertified: false;
}
export interface PitPresentationAppearanceV93 {
 readonly appearanceId: string; readonly variantId: string | null;
 readonly kind: 'supplied-variant' | 'runtime-default'; readonly label: string;
 readonly referenceSprites: readonly { readonly src: string; readonly width: number; readonly height: number; readonly sha256?: string; readonly nativeFacing: string }[];
 readonly provenance: { readonly sourceArchive: string; readonly sourceEntry: string };
 readonly visualReview: 'not-re-reviewed-v93'; readonly oneToOneCertified: false;
}
export interface PitPresentationCategoryDefinitionV93 {
 readonly id: PitPresentationCategoryV93; readonly clipId: string; readonly label: string;
 readonly loop: boolean; readonly suggestedTicks: number; readonly minimumDistinctDrawings: number;
 readonly keyPoses: readonly string[]; readonly terminal: string;
}
export interface PitPresentationNativeProofV93 {
 readonly fighterId: string; readonly variantId: string | null; readonly atlasId: string;
 readonly clipId: string; readonly facing: PitPresentationFacingV93;
 readonly frameCount: number; readonly registeredHeldPose: boolean;
 readonly pngsPresent: boolean; readonly rectsValid: boolean; readonly bordersClear: boolean;
 readonly cellsNonemptyTransparent: boolean; readonly distinctDrawings: number;
 readonly visualReview: 'not-re-reviewed-v93'; readonly canonOneToOneCertified: false;
 readonly registrationStatus: string; readonly loop: boolean; readonly ticksPerSecond: number;
 readonly frames: readonly { readonly pageId: string; readonly rect: readonly number[]; readonly pivot: readonly number[]; readonly durationTicks: number; readonly src: string }[];
 readonly sourcePages: readonly { readonly id: string; readonly src: string; readonly width: number; readonly height: number; readonly sourceSha256: string | null; readonly transparency: unknown }[];
}
export interface PitPresentationIdentityPlanV93 {
 readonly id: string; readonly category: PitPresentationCategoryV93; readonly clipId: string;
 readonly familyId: string; readonly fidelity: 'gameplay-adaptation'; readonly documentedGesture: false;
 readonly sourceIds: readonly string[]; readonly direction: string;
 readonly detailedDeliveryStatus: 'unproduced-or-partial'; readonly oneToOneCertified: false;
 readonly poseEvidence: readonly { readonly sourceId: string; readonly kind: 'documented-static-pose-only'; readonly locator: string; readonly limitation: string }[];
}
export interface PitPresentationCatalogEntryV93 {
 readonly fighterId: string; readonly name: string; readonly sourceWork: string;
 readonly identityStatus: string; readonly species: 'human' | 'yautja' | 'non-yautja' | 'unverified';
 readonly familyId: string; readonly sourceIds: readonly string[]; readonly sourceReviewNeeded: boolean;
 readonly identityNote: string; readonly oneToOneCertified: false; readonly defaultAppearanceId: string;
 readonly appearances: readonly PitPresentationAppearanceV93[];
 readonly nativeClips: readonly PitPresentationNativeProofV93[];
 readonly constraints: readonly string[]; readonly plans: readonly PitPresentationIdentityPlanV93[];
}
export interface PitPresentationCatalogV93 {
 readonly schemaVersion: 1; readonly version: 93; readonly sourceBaseline: string; readonly sourceSnapshot: string; readonly auditedAt: string;
 readonly status: string; readonly completeRosterAnimations: false; readonly oneToOneCertified: false; readonly limits: string;
 readonly snapshot: { readonly runtimeIdentities: number; readonly explicitVariants: number; readonly runtimeDefaultAppearances: number;
  readonly appearances: number; readonly registeredClips: number; readonly registryEntries: number; readonly pages: number;
  readonly uniquePngs: number; readonly pixelDistinctDrawings: number; readonly sourceHashes: Readonly<Record<string, string>> };
 readonly historicalSnapshot: { readonly sourceBaseline: string; readonly registryEntries: number; readonly registeredClips: number;
  readonly uniquePngs: number; readonly registrySha256: string; readonly atlasIds: readonly string[];
  readonly pages: readonly { readonly src: string; readonly sourceSha256: string }[] };
 readonly globalRules: readonly string[]; readonly categories: readonly PitPresentationCategoryDefinitionV93[];
 readonly families: readonly { readonly id: string; readonly label: string; readonly constraint: string; readonly cues: readonly string[] }[];
 readonly sources: readonly PitPresentationSourceV93[]; readonly entries: readonly PitPresentationCatalogEntryV93[];
}
function deepFreeze<T>(value: T): Readonly<T> {
 if (value && typeof value === 'object') {
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
 }
 return value as Readonly<T>;
}
export const PIT_PRESENTATION_CATALOG_V93: PitPresentationCatalogV93 = deepFreeze(catalogData as unknown as PitPresentationCatalogV93);
const entries = new Map(PIT_PRESENTATION_CATALOG_V93.entries.map(entry => [entry.fighterId, entry]));
const sourceById = new Map(PIT_PRESENTATION_CATALOG_V93.sources.map(source => [source.id, source]));
const categoryById = new Map(PIT_PRESENTATION_CATALOG_V93.categories.map(category => [category.id, category]));

export type PitPresentationCoverageStatusV93 = 'missing' | 'held-only' | 'partial-native' | 'pixel-review-required' | 'detailed-native-pending-visual-review';
export interface PitPresentationFacingCoverageV93 {
 readonly facing: PitPresentationFacingV93; readonly status: PitPresentationCoverageStatusV93;
 readonly registeredCandidates: number; readonly measuredDistinctDrawings: number | null;
 readonly declaredSourceCells: number; readonly filesPresentAtBaselineAudit: boolean | null;
 readonly rectsValidAtBaselineAudit: boolean | null; readonly anatomyReviewedV93: false;
 readonly detailedDeliveryComplete: false; readonly oneToOneCertified: false;
 readonly clips: readonly { readonly atlasId: string; readonly clipId: string; readonly sourcePaths: readonly string[];
  readonly frameCount: number; readonly measuredDistinctDrawings: number | null; readonly measured: boolean; readonly held: boolean }[];
}
function sameArray(a: readonly number[], b: readonly number[]) { return a.length === b.length && a.every((value, index) => value === b[index]); }
/** A measured old proof cannot silently validate a new or changed source declaration. */
function matchesMeasuredClip(proof: PitPresentationNativeProofV93, definition: PitSpriteSheetAnimationDefinition, clip: PitSpriteSheetAnimationDefinition['atlas']['clips'][number]) {
 return proof.frames.length === clip.frames.length && proof.loop === clip.loop && proof.ticksPerSecond === clip.ticksPerSecond &&
  clip.frames.every((frame, index) => {
   const old = proof.frames[index], page = definition.atlas.pages.find(candidate => candidate.id === frame.pageId);
   return old.pageId === frame.pageId && old.src === page?.src && sameArray(old.rect, frame.rect) &&
    sameArray(old.pivot, frame.pivot) && old.durationTicks === frame.durationTicks &&
    !!page && proof.sourcePages.some(source => source.id === page.id && source.src === page.src && source.width === page.width && source.height === page.height && JSON.stringify(source.transparency) === JSON.stringify(page.transparency));
  });
}
function facingCoverage(entry: PitPresentationCatalogEntryV93, appearance: PitPresentationAppearanceV93, category: PitPresentationCategoryDefinitionV93,
 facing: PitPresentationFacingV93, registry: readonly PitSpriteSheetAnimationDefinition[]): PitPresentationFacingCoverageV93 {
 const candidates = registry.filter(definition => definition.fighterId === entry.fighterId && (definition.variantId ?? null) === appearance.variantId)
  .flatMap(definition => definition.atlas.clips.filter(clip => clip.id === category.clipId && clip.facing === facing && clip.status === 'validated')
   .map(clip => ({ definition, clip })));
 const clips = candidates.map(({ definition, clip }) => {
  const old = entry.nativeClips.find(proof => proof.atlasId === definition.atlas.id && proof.clipId === clip.id && proof.facing === facing && proof.variantId === appearance.variantId);
  const measured = !!old && matchesMeasuredClip(old, definition, clip);
  const held = definition.heldPoseClips?.some(pose => pose.id === clip.id && pose.facing === facing) === true || clip.frames.length < 2;
  return { atlasId: definition.atlas.id, clipId: clip.id, sourcePaths: [...new Set(clip.frames.flatMap(frame => {
   const page = definition.atlas.pages.find(candidate => candidate.id === frame.pageId);
   return page ? [page.src] : [];
  }))],
   frameCount: clip.frames.length, measuredDistinctDrawings: measured ? old.distinctDrawings : null, measured, held };
 });
 const measuredProofs = entry.nativeClips.filter(proof => proof.variantId === appearance.variantId && clips.some(clip => clip.measured && clip.atlasId === proof.atlasId && proof.clipId === category.clipId && proof.facing === facing));
 const knownDrawings = clips.length ? Math.max(0, ...clips.filter(clip => clip.measured).map(clip => clip.measuredDistinctDrawings!)) : 0;
 const unknownPixels = clips.some(clip => !clip.measured);
 const status: PitPresentationCoverageStatusV93 = !clips.length ? 'missing' : clips.every(clip => clip.held) ? 'held-only' :
  unknownPixels ? 'pixel-review-required' : knownDrawings < category.minimumDistinctDrawings ? 'partial-native' : 'detailed-native-pending-visual-review';
 return { facing, status, registeredCandidates: clips.length, measuredDistinctDrawings: unknownPixels ? null : knownDrawings,
  declaredSourceCells: Math.max(0, ...candidates.map(({ clip }) => new Set(clip.frames.map(frame => frame.pageId + ':' + frame.rect.join(','))).size)),
  filesPresentAtBaselineAudit: clips.length && clips.every(clip => clip.measured) ? measuredProofs.every(proof => proof.pngsPresent) : null,
  rectsValidAtBaselineAudit: clips.length && clips.every(clip => clip.measured) ? measuredProofs.every(proof => proof.rectsValid) : null,
  anatomyReviewedV93: false, detailedDeliveryComplete: false, oneToOneCertified: false, clips };
}

/** Exact ownership only. Explicit null never borrows a supplied user's default costume. */
export function getPitPresentationPlanV93(fighterId: unknown, categoryId: unknown, variantId?: string | null,
 registry: readonly PitSpriteSheetAnimationDefinition[] = PIT_SPRITE_SHEET_REGISTRY) {
 if (typeof fighterId !== 'string' || typeof categoryId !== 'string') return null;
 const entry = entries.get(fighterId), category = categoryById.get(categoryId as PitPresentationCategoryV93);
 if (!entry || !category) return null;
 const appearance = variantId === undefined ? entry.appearances.find(candidate => candidate.appearanceId === entry.defaultAppearanceId) :
  entry.appearances.find(candidate => candidate.variantId === variantId);
 if (!appearance) return null;
 const plan = entry.plans.find(candidate => candidate.category === category.id)!;
 return { entry, appearance, plan, category, family: PIT_PRESENTATION_CATALOG_V93.families.find(family => family.id === entry.familyId)!,
  sources: entry.sourceIds.map(id => sourceById.get(id)!), globalRules: PIT_PRESENTATION_CATALOG_V93.globalRules,
  facings: (['left', 'right'] as const).map(facing => facingCoverage(entry, appearance, category, facing, registry)) };
}

/** Work queue, not a list of installed sprites. Generated candidates still require pixel and visual admission. */
export function getPitPresentationProductionQueueV93(fighterIds?: readonly string[], registry: readonly PitSpriteSheetAnimationDefinition[] = PIT_SPRITE_SHEET_REGISTRY) {
 const selected = fighterIds ? new Set(fighterIds) : null;
 return PIT_PRESENTATION_CATALOG_V93.entries.filter(entry => !selected || selected.has(entry.fighterId)).flatMap(entry =>
  entry.appearances.flatMap(appearance => PIT_PRESENTATION_CATALOG_V93.categories.flatMap(category => {
   const result = getPitPresentationPlanV93(entry.fighterId, category.id, appearance.variantId, registry)!;
   return result.facings.map(coverage => ({ fighterId: entry.fighterId, name: entry.name, appearanceId: appearance.appearanceId,
    variantId: appearance.variantId, category: category.id, clipId: category.clipId, facing: coverage.facing,
    task: entry.sourceReviewNeeded ? 'verify-identity-reference' : coverage.status === 'pixel-review-required' ? 'review-native-pixels-and-anatomy' :
     coverage.status === 'detailed-native-pending-visual-review' ? 'review-native-anatomy-and-lore' : coverage.status === 'partial-native' ? 'expand-partial-native-cycle' : 'draw-native-cycle',
    status: coverage.status, minimumDistinctDrawings: category.minimumDistinctDrawings,
    measuredDistinctDrawings: coverage.measuredDistinctDrawings,
    missingDistinctDrawings: coverage.measuredDistinctDrawings === null ? null : Math.max(0, category.minimumDistinctDrawings - coverage.measuredDistinctDrawings),
    referenceSprites: appearance.referenceSprites, sourceIds: entry.sourceIds, detailedDeliveryComplete: false as const, oneToOneCertified: false as const }));
  })));
}

export function auditPitPresentationPlansV93(registry: readonly PitSpriteSheetAnimationDefinition[] = PIT_SPRITE_SHEET_REGISTRY) {
 const queue = getPitPresentationProductionQueueV93(undefined, registry);
 return { version: 93 as const, sourceBaseline: PIT_PRESENTATION_CATALOG_V93.sourceBaseline,
  counts: { identities: entries.size, explicitVariants: PIT_PRESENTATION_CATALOG_V93.entries.reduce((sum, entry) => sum + entry.appearances.filter(appearance => appearance.kind === 'supplied-variant').length, 0),
   appearances: PIT_PRESENTATION_CATALOG_V93.snapshot.appearances, identityPlans: entries.size * PIT_PRESENTATION_CATEGORIES_V93.length,
   requestedFacingCategories: queue.length, baselineRegisteredClips: PIT_PRESENTATION_CATALOG_V93.snapshot.registeredClips,
   missingFacingCategories: queue.filter(task => task.status === 'missing').length,
   partialFacingCategories: queue.filter(task => task.status === 'partial-native').length,
   heldOnlyFacingCategories: queue.filter(task => task.status === 'held-only').length,
   pixelReviewRequiredFacingCategories: queue.filter(task => task.status === 'pixel-review-required').length,
   identitiesNeedingPrimaryReference: PIT_PRESENTATION_CATALOG_V93.entries.filter(entry => entry.sourceReviewNeeded).length,
   detailedDeliveryCertified: 0, canonOneToOneCertified: 0 },
  categoryCounts: PIT_PRESENTATION_CATEGORIES_V93.map(category => ({ category, requested: queue.filter(task => task.category === category).length,
   missing: queue.filter(task => task.category === category && task.status === 'missing').length,
   partial: queue.filter(task => task.category === category && task.status === 'partial-native').length })),
  limits: PIT_PRESENTATION_CATALOG_V93.limits };
}
