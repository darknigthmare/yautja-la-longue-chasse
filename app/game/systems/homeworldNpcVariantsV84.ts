import manifest from '../data/homeworldNpcVariantsV84.json';
import castManifest from '../data/homeworldNpcCastV84.json';

export const HOMEWORLD_NPC_VARIANT_TARGET_V84 = 20;
export const HOMEWORLD_NPC_VARIANT_ROLES_V84 = [
  'chief', 'artisan', 'healer', 'archivist', 'guard', 'courier', 'instructor',
  'apprentice', 'dock-officer', 'forge-master', 'witness', 'herald', 'arena-steward',
  'rite-keeper', 'guide', 'porter', 'hunter', 'resident',
  'royal-court', 'elder-council', 'stable-keeper', 'kennel-handler',
  'tribe-desert-hydrologist', 'tribe-desert-quartermaster',
  'tribe-forest-builder', 'tribe-forest-archivist',
  'tribe-slums-mechanic', 'tribe-slums-trader',
  'tribe-lava-smelter', 'tribe-lava-medic',
  'tribe-darkjungle-botanist', 'tribe-darkjungle-guide',
] as const;
export type HomeworldNpcVariantRoleV84 = typeof HOMEWORLD_NPC_VARIANT_ROLES_V84[number];

/** Every entry describes one individually drawn transparent file. A static pose
 * remains the same identity during movement; it is not an animation clip. */
export interface HomeworldNpcVariantV84 {
  readonly id: string;
  readonly role: HomeworldNpcVariantRoleV84;
  readonly slot: number;
  readonly src: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly alphaBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly pivot: { readonly x: number; readonly y: number };
  readonly heightWorld: number;
  readonly nativeFacing: 1 | -1;
  readonly status: 'ready';
  readonly motionStatus: 'single-pose-static';
}
export interface HomeworldNpcCastV84 {
  readonly id: string;
  readonly role: HomeworldNpcVariantRoleV84;
  readonly groupId: string;
  readonly preserveOriginal?: boolean;
}
export interface HomeworldNpcVariantCoverageV84 {
  readonly role: HomeworldNpcVariantRoleV84;
  readonly ready: number;
  readonly target: 20;
  readonly missing: number;
  readonly status: 'complete' | 'partial' | 'not-started';
}
export interface HomeworldNpcVariantCatalogueV84 {
  readonly variants: readonly HomeworldNpcVariantV84[];
  readonly cast: readonly HomeworldNpcCastV84[];
  readonly byRole: ReadonlyMap<HomeworldNpcVariantRoleV84, readonly HomeworldNpcVariantV84[]>;
  readonly castById: ReadonlyMap<string, HomeworldNpcCastV84>;
  readonly assignments: ReadonlyMap<string, HomeworldNpcVariantV84 | null>;
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  readonly coverage: readonly HomeworldNpcVariantCoverageV84[];
}

const roleSet = new Set<string>(HOMEWORLD_NPC_VARIANT_ROLES_V84);
const preservedStoryIds = new Set(['hunt-king', 'terrace-instructor']);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const isRole = (value: unknown): value is HomeworldNpcVariantRoleV84 => typeof value === 'string' && roleSet.has(value);

function variantRefusal(value: unknown): string | null {
  if (!object(value)) return 'invalid-record';
  if (value.status !== 'ready') return 'not-ready';
  if (!nonEmpty(value.id) || !isRole(value.role)) return 'invalid-identity-or-role';
  if (!Number.isInteger(value.slot) || Number(value.slot) < 1 || Number(value.slot) > HOMEWORLD_NPC_VARIANT_TARGET_V84) return 'invalid-slot';
  if (typeof value.src !== 'string' || !/^\/game\/homeworld\/v84\/npcs\/[a-z0-9-]+\/[^/]+\.(png|webp)$/.test(value.src)) return 'invalid-source';
  if (!finite(value.sourceWidth) || !Number.isInteger(value.sourceWidth) || value.sourceWidth <= 0
    || !finite(value.sourceHeight) || !Number.isInteger(value.sourceHeight) || value.sourceHeight <= 0) return 'invalid-source-dimensions';
  const bounds = value.alphaBounds, pivot = value.pivot;
  if (!object(bounds) || !finite(bounds.x) || !finite(bounds.y) || !finite(bounds.width) || !finite(bounds.height)
    || bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0
    || bounds.x + bounds.width > value.sourceWidth || bounds.y + bounds.height > value.sourceHeight) return 'invalid-alpha-bounds';
  if (!object(pivot) || !finite(pivot.x) || !finite(pivot.y) || pivot.x < 0 || pivot.y < 0
    || pivot.x > value.sourceWidth || pivot.y > value.sourceHeight) return 'invalid-pivot';
  if (!finite(value.heightWorld) || value.heightWorld <= 0) return 'invalid-world-height';
  if (value.nativeFacing !== 1 && value.nativeFacing !== -1) return 'invalid-facing';
  return value.motionStatus === 'single-pose-static' ? null : 'unsupported-motion-status';
}

/** The importer verifies file pixels and existence before marking a record
 * ready. This portable module validates metadata without filesystem or network. */
export function isHomeworldNpcVariantReadyV84(value: unknown): value is HomeworldNpcVariantV84 {
  return variantRefusal(value) === null;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Regional principal IDs are reused by all ten villages. Ambient village IDs
 * already have a region prefix and must retain their existing saved identity. */
export function homeworldNpcKeyV84(id: string, regionId?: string): string {
  if (!regionId || id.startsWith(regionId + ':') || id.startsWith(regionId + '-')) return id;
  return `${regionId}:${id}`;
}

/** Compile against the complete authored cast, never the currently visible
 * actors. Culling, clock ticks, pause, movement and input order cannot reroll
 * appearances. A group uses each ready same-role file before reusing any. */
export function compileHomeworldNpcVariantsV84(
  records: readonly unknown[], castRecords: readonly unknown[],
): HomeworldNpcVariantCatalogueV84 {
  const rejected: { id: string; reason: string }[] = [];
  const candidates: HomeworldNpcVariantV84[] = [];
  for (const record of records) {
    const reason = variantRefusal(record);
    if (reason) { rejected.push({ id: object(record) && nonEmpty(record.id) ? record.id : '(unnamed)', reason }); continue; }
    candidates.push(record as HomeworldNpcVariantV84);
  }
  const identityCounts = new Map<string, number>();
  for (const variant of candidates) {
    for (const key of [`id:${variant.id}`, `slot:${variant.role}:${variant.slot}`, `src:${variant.src}`]) {
      identityCounts.set(key, (identityCounts.get(key) ?? 0) + 1);
    }
  }
  const variants = candidates.filter(variant => {
    const duplicate = [`id:${variant.id}`, `slot:${variant.role}:${variant.slot}`, `src:${variant.src}`]
      .some(key => identityCounts.get(key)! > 1);
    if (duplicate) rejected.push({ id: variant.id, reason: 'duplicate-id-slot-or-source' });
    return !duplicate;
  }).sort((a, b) => compareText(a.role, b.role) || a.slot - b.slot || compareText(a.id, b.id));
  const byRole = new Map<HomeworldNpcVariantRoleV84, readonly HomeworldNpcVariantV84[]>(
    HOMEWORLD_NPC_VARIANT_ROLES_V84.map(role => [role, variants.filter(variant => variant.role === role)]),
  );
  const castCandidates: HomeworldNpcCastV84[] = [];
  const castCounts = new Map<string, number>();
  for (const record of castRecords) {
    if (!object(record) || !nonEmpty(record.id) || !isRole(record.role) || !nonEmpty(record.groupId)
      || (record.preserveOriginal !== undefined && typeof record.preserveOriginal !== 'boolean')) {
      rejected.push({ id: object(record) && nonEmpty(record.id) ? record.id : '(unnamed-cast)', reason: 'invalid-cast' });
      continue;
    }
    castCandidates.push(record as unknown as HomeworldNpcCastV84);
    castCounts.set(record.id, (castCounts.get(record.id) ?? 0) + 1);
  }
  const cast = castCandidates.filter(actor => {
    if (castCounts.get(actor.id)! > 1) { rejected.push({ id: actor.id, reason: 'duplicate-cast-id' }); return false; }
    return true;
  }).sort((a, b) => compareText(a.groupId, b.groupId) || compareText(a.role, b.role) || compareText(a.id, b.id));
  const castById = new Map(cast.map(actor => [actor.id, actor]));
  const assignments = new Map<string, HomeworldNpcVariantV84 | null>();
  const groupCounts = new Map<string, number>();
  for (const actor of cast) {
    const pool = byRole.get(actor.role)!;
    if (actor.preserveOriginal || preservedStoryIds.has(actor.id) || pool.length === 0) {
      assignments.set(actor.id, null); continue;
    }
    const group = `${actor.groupId}\u0000${actor.role}`;
    const index = groupCounts.get(group) ?? 0;
    assignments.set(actor.id, pool[(stableHash(group) + index) % pool.length]);
    groupCounts.set(group, index + 1);
  }
  const coverage: HomeworldNpcVariantCoverageV84[] = HOMEWORLD_NPC_VARIANT_ROLES_V84.map(role => {
    const ready = byRole.get(role)!.length;
    return { role, ready, target: HOMEWORLD_NPC_VARIANT_TARGET_V84, missing: HOMEWORLD_NPC_VARIANT_TARGET_V84 - ready,
      status: ready === HOMEWORLD_NPC_VARIANT_TARGET_V84 ? 'complete' : ready > 0 ? 'partial' : 'not-started' };
  });
  return { variants, cast, byRole, castById, assignments, rejected, coverage };
}

export const HOMEWORLD_NPC_VARIANT_CATALOGUE_V84 = compileHomeworldNpcVariantsV84(manifest.variants, castManifest.cast);
export const HOMEWORLD_NPC_VARIANTS_V84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84.variants;
export const HOMEWORLD_NPC_CAST_V84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84.cast;
export const HOMEWORLD_NPC_VARIANT_COVERAGE_V84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84.coverage;

/** Authored cast roles win over renderer fallbacks, even when that role has no
 * ready files yet. Never replace an unavailable healer with an available guard. */
export function homeworldNpcVariantV84(
  id: string, fallbackRole?: HomeworldNpcVariantRoleV84,
  catalogue: HomeworldNpcVariantCatalogueV84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84,
): HomeworldNpcVariantV84 | null {
  if (!nonEmpty(id) || preservedStoryIds.has(id)) return null;
  if (catalogue.castById.has(id)) return catalogue.assignments.get(id) ?? null;
  const pool = fallbackRole ? catalogue.byRole.get(fallbackRole) : undefined;
  // Unregistered callers retain deterministic same-role selection. Register
  // them in the cast to receive the group-wide no-repeat allocation as well.
  return pool?.length ? pool[stableHash(id) % pool.length] : null;
}

const normalizeOccupation = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘]/g, "'").trim().toLowerCase();
const occupationGroups: Partial<Record<HomeworldNpcVariantRoleV84, readonly string[]>> = {
  chief: ['Souverain de la cité', 'Roi de la Chasse'],
  artisan: ['Artisane', 'Artisan', 'Acheteur de matériaux', 'Tailleur de parures', 'Polisseuse', 'Armurière',
    'Tisseuse de liens', 'Peseur de matériaux', 'Ajusteur de supports', 'Gardienne des outils',
    'Réparatrice des conduits', 'Réparateur des balises', 'Artisane des balises', 'Artisane des conduits',
    'Artisane du marché', 'Artisane des délégations'],
  healer: ['Soigneuse', 'Soigneur', 'Soigneuse des délégations', 'Soigneuse de relève'],
  archivist: ['Lecteur des marques', 'Archiviste', 'Conservatrice', 'Ancien des récits', 'Lectrice des rapports',
    'Copiste des trajets', 'Ancienne des retours', 'Gardienne des récits', 'Conservateur local',
    'Conservatrice des marques', 'Archiviste des registres locaux'],
  guard: ['Garde de patrouille', 'Garde du retour', 'Gardien des seuils', 'Guetteuse des ponts', 'Veilleur',
    'Veilleuse', 'Veilleuse de relève', 'Capitaine des Enforcers', 'Garde de l’aile publique', 'Garde des délégations'],
  courier: ['Courrier de clan', 'Messager des archives', 'Messagère des villages', 'Courrier des postes',
    'Porteuse des réponses', 'Courrier des corniches'],
  instructor: ['Instructrice des appuis', 'Observatrice du parcours', 'Accompagnateur des aspirants', 'Instructeur des terrasses'],
  apprentice: ['Apprenti de forge', 'Aspirant', 'Apprentie navigatrice', 'Apprentie graveuse', 'Aspirante à l’écoute',
    'Aspirant de la cohorte', 'Aspirante du foyer', 'Apprenti archiviste', 'Élève du duel', 'Apprenti convoyeur',
    'Apprenti accompagné', 'Apprentie accompagnée', 'Aspirant accompagné'],
  'dock-officer': ['Navigatrice', 'Éclaireuse des quais', 'Inspectrice des amarres', 'Vérificateur des scellés',
    'Officier des quais', 'Passeur de lave'],
  'forge-master': ['Maîtresse des parures', 'Maître de forge'],
  witness: ['Voisin des galeries', 'Témoin du conseil', 'Témoin des galeries'],
  herald: ['Émissaire de clan', 'Émissaire', 'Hôte des retrouvailles', 'Hôte des délégations',
    'Émissaire des hauts villages', 'Héraut des prises', 'Porte-parole de la cour locale', 'Représentant d’un clan allié'],
  'arena-steward': ['Arbitre des démonstrations', 'Intendant des arènes', 'Préposé à la halte des Chroniques'],
  'rite-keeper': ['Ancien du clan', 'Porteuse des braises', 'Témoin des rites', 'Gardienne des rites', 'Ancien observateur des rites locaux'],
  guide: ['Pisteur du clan', 'Guide du clan'],
  porter: ['Porteur de cargaisons', 'Convoyeur', 'Porteur de minerai', 'Porteur du retour', 'Porteur de lampes',
    'Porteuse des provisions', 'Porteuse des relais', 'Porteur', 'Convoyeuse', 'Porteur des réserves'],
  hunter: ['Chasseur de passage', 'Chasseur de retour', 'Chasseuse'],
  resident: ['Gardienne du foyer', 'Visiteuse des clans', 'Habitant des demeures', 'Visiteur du clan'],
  'tribe-desert-hydrologist': ['Hydrologue des citernes'],
  'tribe-desert-quartermaster': ['Intendante des citernes'],
  'tribe-forest-builder': ['Bâtisseur des hautes branches'],
  'tribe-forest-archivist': ['Archiviste des hautes branches'],
  'tribe-slums-mechanic': ['Mécanicienne des forges basses'],
  'tribe-slums-trader': ['Négociant des forges basses'],
  'tribe-lava-smelter': ['Fondeur de la caldeira'],
  'tribe-lava-medic': ['Médecin de la caldeira'],
  'tribe-darkjungle-botanist': ['Botaniste des veilleurs'],
  'tribe-darkjungle-guide': ['Guide des veilleurs'],
};
const occupationRoles = new Map(Object.entries(occupationGroups).flatMap(([role, labels]) =>
  labels.map(label => [normalizeOccupation(label), role as HomeworldNpcVariantRoleV84] as const)));
// Keep future callers consistent with the audited jobs in the shipped cast.
// The explicit V84 assignment also resolves older ambiguous labels such as
// armourers, dock scouts and clan elders without consulting age or district.
for (const actor of castManifest.cast) {
  if (isRole(actor.role) && typeof actor.occupation === 'string') {
    occupationRoles.set(normalizeOccupation(actor.occupation), actor.role);
  }
}
const namedRoles: Readonly<Record<string, HomeworldNpcVariantRoleV84>> = {
  'hunt-king': 'chief', 'market-artisan': 'artisan', 'forge-artisan': 'forge-master', 'clan-healer': 'healer',
  'memory-keeper': 'archivist', 'enforcer-captain': 'guard', 'terrace-instructor': 'instructor',
  'dock-officer': 'dock-officer', 'undercity-witness': 'witness', 'trophy-herald': 'herald',
  'arena-steward': 'arena-steward', 'rite-keeper': 'rite-keeper',
};
export interface HomeworldNpcOccupationV84 {
  readonly id: string; readonly role?: string; readonly regionId?: string;
  readonly districtId?: string; readonly morphId?: string;
}

export function homeworldNpcRoleV84(npc: HomeworldNpcOccupationV84, fallback: HomeworldNpcVariantRoleV84,
  catalogue?: HomeworldNpcVariantCatalogueV84): HomeworldNpcVariantRoleV84;
export function homeworldNpcRoleV84(npc: HomeworldNpcOccupationV84, fallback?: HomeworldNpcVariantRoleV84,
  catalogue?: HomeworldNpcVariantCatalogueV84): HomeworldNpcVariantRoleV84 | null;
/** Age, body morphology and district do not invent an occupation. Every shipped
 * V68/V69 job has an explicit mapping; unknown future jobs keep their caller's
 * existing art until their intended family is authored. */
export function homeworldNpcRoleV84(npc: HomeworldNpcOccupationV84, fallback?: HomeworldNpcVariantRoleV84,
  catalogue: HomeworldNpcVariantCatalogueV84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84): HomeworldNpcVariantRoleV84 | null {
  const key = homeworldNpcKeyV84(npc.id, npc.regionId);
  const assigned = catalogue.castById.get(key);
  if (assigned) return assigned.role;
  if (Object.hasOwn(namedRoles, key)) return namedRoles[key];
  if (npc.role && isRole(npc.role)) return npc.role;
  const occupation = npc.role ? occupationRoles.get(normalizeOccupation(npc.role)) : undefined;
  return occupation ?? fallback ?? null;
}

/** Return only files assigned to this scene's real cast. Metadata contains no
 * decoded-image cache, browser state or all-library eager preload. */
export function homeworldNpcVariantSourcesV84(ids?: readonly string[],
  catalogue: HomeworldNpcVariantCatalogueV84 = HOMEWORLD_NPC_VARIANT_CATALOGUE_V84) {
  const selected = ids ?? catalogue.cast.map(actor => actor.id);
  const sources = new Map<string, { src: string; sourceWidth: number; sourceHeight: number; kind: 'scene' }>();
  for (const id of selected) {
    const variant = homeworldNpcVariantV84(id, undefined, catalogue);
    if (variant) sources.set(variant.src, { src: variant.src, sourceWidth: variant.sourceWidth,
      sourceHeight: variant.sourceHeight, kind: 'scene' });
  }
  return [...sources.values()];
}
