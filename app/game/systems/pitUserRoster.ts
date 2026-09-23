import manifest from '../data/pitUserHuntersV44.json';
import { PIT_FIRST_EDITION_FIGHTERS, type PitEditionFighterDefinition } from './pitFirstEdition';

/** Supplied identities are separate from the authored chronicle roster. */
export type PitUserFighterId = `user-${string}`;
export interface PitUserVariant {
 readonly id: string;
 readonly label: string;
 readonly src: string;
 readonly width: number;
 readonly height: number;
 readonly pivot: readonly [number, number];
 readonly bodyTopY: number;
 readonly nativeFacing: 'left' | 'right' | 'neutral';
 readonly sha256: string;
 readonly sourceArchive: string;
 readonly sourceEntry: string;
}
interface PitUserHunter { readonly id: string; readonly name: string; readonly sourceLabel: string; readonly variants: readonly PitUserVariant[] }
const hunters = manifest.fighters as unknown as readonly PitUserHunter[];
const byId = new Map(hunters.map(hunter => [hunter.id, hunter]));
export const PIT_USER_FIGHTER_IDS: readonly PitUserFighterId[] = Object.freeze(hunters.filter(hunter => hunter.id.startsWith('user-') && hunter.variants.length > 0).map(hunter => hunter.id as PitUserFighterId));
const userIds = new Set<string>(PIT_USER_FIGHTER_IDS);
export function isPitUserFighterId(id: unknown): id is PitUserFighterId { return typeof id === 'string' && userIds.has(id); }
export function getPitFighterVariants(id: string): readonly PitUserVariant[] { return byId.get(id)?.variants ?? []; }
export function getPitUserVariant(fighterId: string, variantId?: string | null): PitUserVariant | null {
 if (typeof variantId !== 'string') return null;
 return getPitFighterVariants(fighterId).find(variant => variant.id === variantId) ?? null;
}
/** Invalid/foreign variants never resolve to another hunter. New hunters have no legacy art. */
export function normalizePitUserVariant(fighterId: string, variantId?: unknown): string | undefined {
 const variant = typeof variantId === 'string' ? getPitUserVariant(fighterId, variantId) : null;
 return variant?.id ?? (isPitUserFighterId(fighterId) ? getPitFighterVariants(fighterId)[0]?.id : undefined);
}
export type PitUserFighterDefinition = Omit<PitEditionFighterDefinition, 'id' | 'rivalId'> & {
 readonly id: PitUserFighterId; readonly rivalId: null; readonly progressionAvailable: false;
 readonly gameplayAdaptation: 'shared-balanced-duel'; readonly canonicalIdentityVerified: false;
};
/** Shared balanced rules, explicitly an adaptation, never invented individual canon techniques. */
const basis = PIT_FIRST_EDITION_FIGHTERS['jungle-hunter'];
export const PIT_USER_FIGHTERS: Readonly<Record<PitUserFighterId, PitUserFighterDefinition>> = Object.fromEntries(PIT_USER_FIGHTER_IDS.map(id => {
 const source = byId.get(id)!;
 const definition: PitUserFighterDefinition = {
  ...basis, id, name: source.name, epithet: 'Chasseur fourni · profil partagé',
  sourcePresetId: id, sourceWork: source.sourceLabel, continuity: 'expanded',
  archetype: 'all-rounder', selectable: true, runtimeStatus: 'vertical-slice', rivalId: null,
  progressionAvailable: false, gameplayAdaptation: 'shared-balanced-duel', canonicalIdentityVerified: false,
  attacks: {
   light: {...basis.attacks.light, label: 'Frappe courte · adaptation'},
   medium: {...basis.attacks.medium, label: 'Frappe moyenne · adaptation'},
   heavy: {...basis.attacks.heavy, label: 'Frappe lourde · adaptation'},
   technique: {...basis.attacks.light, kind: 'technique', label: 'Riposte de duel · adaptation', startup: 8, active: 18, recovery: 24, damage: 78, range: 54},
  },
  technique: {id:'user-balanced-contact-counter',device:'code-parry',contactEffect:'strike',motion:'attached',trigger:'counter',lifetimeFrames:18,armFrames:0,speed:0,returnFrame:null,width:52,height:68,verticalOffset:28,damageScale:1,chipScale:0,hitstunBonus:2,blockstunBonus:0,pushbackScale:1,guardBreak:false,knockdown:false,ownerDashSpeed:0,maxHits:1,rehitFrames:0,status:null,statusFrames:0,movementScale:1,jumpLocked:false,cloakLocked:false},
  arcadeIntro: 'Visuel et nom fournis dans les packs utilisateur. Les clips validés animent uniquement leur apparence et leur orientation ; les autres actions gardent leur pose fixe. Aucun ensemble complet ni fidélité canon 1:1 certifiés. Profil équilibré partagé pour les duels ; les armes représentées ne définissent pas des techniques propres au personnage.',
  arcadeEnding: 'Chronique personnelle non produite : Arcade, Circuit et Descente indisponibles.',
 };
 return [id, definition];
})) as Record<PitUserFighterId, PitUserFighterDefinition>;