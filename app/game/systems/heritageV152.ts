/**
 * V152 · Héritage vers la partie suivante.
 *
 * Source : docs/campagne/BIBLE_DE_CAMPAGNE.md, § « Héritage vers la partie
 * suivante » (décision : les quatre éléments, après le sacrifice ou une mort en
 * hardcore) et tableau « Mort et difficulté » (Hardcore : la partie suivante
 * hérite du masque et de la légende au mausolée). Classeur V6 : TR-R01
 * (un original, un seul emplacement), TR-R12 (une copie ne multiplie ni
 * trophées ni ressources), STATE5-31 objectOwnerId, STATE5-32 objectLocationId
 * (l'ancien emplacement est vidé dans la même validation), STATE5-08 (un
 * événement déjà consommé ne s'applique pas à nouveau), CITY-13 Archives des
 * Lignées, CITY-23 Mausolée des Chasseurs.
 *
 * Ce que les sources ne fixent pas est marqué « proposé » ci-dessous.
 */
import type { BiomaskId, RankId, SaveGame, WeaponId } from "../types";
import { WEAPONS } from "../data";
import { V6_MASK_VISUAL_BY_ID } from "../v6Visuals";
import { preservedBiomaskV62, referenceBiomaskPathV62, referenceBiomaskV62 } from "../biomaskCatalogueV62";
import { getChronicleRank, type ChronicleRankId } from "./clanChronicle";

export const HERITAGE_V152_VERSION = 1 as const;

/** Lignes de la bible reprises telles quelles (affichées dans le panneau). */
export const HERITAGE_SOURCE_V152 = {
  document: "docs/campagne/BIBLE_DE_CAMPAGNE.md · Héritage vers la partie suivante",
  decision: "Les quatre, après le sacrifice ou une mort en hardcore.",
  mask: "Masque au mausolée : visible et visitable dans la cité de la partie suivante (Mausolée des Chasseurs, CITY-23).",
  weapon: "Une arme léguée : le joueur la choisit avant la fin ; son descendant la trouve aux Archives des Lignées (CITY-13) et peut la porter quand son rang le permet (proposé).",
  legend: "Nom dans les légendes : les PNJ citent l’ancien Yautja ; une quête de lignée suit ses trophées et ses lieux (proposé : 3 missions).",
  bonus: "Bonus de départ (valeurs proposées) : 100 d’honneur et une réputation « descendant de » qui change quelques dialogues ; aucun rang n’est donné. Une fin Bad Blood BB-E2 ne transmet que la légende, sans masque.",
} as const;

/** Bible : « 100 d'honneur » (valeur elle-même marquée proposée dans la bible). */
export const HERITAGE_BONUS_HONOR_V152 = 100 as const;

export type HeritageTriggerV152 = "black-god-sacrifice" | "hardcore-death" | "bad-blood-e2" | "elder-retirement";
export interface HeritageTriggerDefinitionV152 {
  id: HeritageTriggerV152; label: string; origin: "bible" | "proposé";
  /** Un déclencheur sans écran ni règle dans le jeu actuel n'est pas proposé au joueur. */
  reachable: boolean; transmitsMask: boolean; transmitsWeapon: boolean;
}
export const HERITAGE_TRIGGERS_V152: readonly HeritageTriggerDefinitionV152[] = [
  // V162 : le sacrifice existe (systems/blackGodV162.ts, hors canon) ; il scelle le legs après la victoire de
  // l'épreuve finale et la confirmation du joueur, jamais depuis le panneau du Mausolée.
  { id: "black-god-sacrifice", label: "Sacrifice réclamé par le Black Warrior", origin: "bible", reachable: false, transmitsMask: true, transmitsWeapon: true },
  // V155 : la mort en Hardcore existe (systems/hardcoreV155.ts) ; elle scelle le legs à la clôture de la
  // chronique, jamais depuis le panneau. « reachable » désigne les déclencheurs choisis au Mausolée.
  { id: "hardcore-death", label: "Mort définitive en mode Hardcore", origin: "bible", reachable: false, transmitsMask: true, transmitsWeapon: true },
  // Bible : « BB-E2 ne transmet que la légende, sans masque ». L'absence d'arme est proposée (« que la légende »).
  { id: "bad-blood-e2", label: "Fin Bad Blood BB-E2 · La dernière traque", origin: "bible", reachable: false, transmitsMask: false, transmitsWeapon: false },
  // Proposé : ni le sacrifice ni le Hardcore n'existent dans le jeu. La retraite à Elder
  // (rang où la bible place la « transmission observée ») est le seul déclencheur jouable.
  { id: "elder-retirement", label: "Retraite d’un Elder · sceller le legs", origin: "proposé", reachable: true, transmitsMask: true, transmitsWeapon: true },
];

export interface HeritageLegendV152 {
  hunterName: string; rankId: RankId; chronicleRankId: ChronicleRankId | null;
  honor: number; trophyCount: number; missionsCompleted: number; storyCompleted: boolean;
}
export interface HeritageTestamentV152 {
  /** Un seul legs par lignée de sauvegarde : l'identifiant suit le propriétaire. */
  id: string; ownerCreatedAt: string; sealedAt: string; trigger: HeritageTriggerV152;
  maskId: BiomaskId | null; weaponId: WeaponId | null; legend: HeritageLegendV152;
}
/** Proposé : deux emplacements seulement, un original n'en occupe qu'un (TR-R01, STATE5-32). */
export type HeritageWeaponLocationV152 = "archives-des-lignees" | "porte-par-heritier";
export interface HeritageWeaponOriginalV152 {
  originalId: string; weaponId: WeaponId; ownerId: string; locationId: HeritageWeaponLocationV152;
}
export interface HeritageInheritanceV152 {
  testament: HeritageTestamentV152; heirOwnerCreatedAt: string; receivedAt: string;
  /** Appliqué une fois à la création ; jamais recalculé par la normalisation. */
  bonusHonorApplied: typeof HERITAGE_BONUS_HONOR_V152;
  reputation: "descendant-de";
  weapon: HeritageWeaponOriginalV152 | null;
}
export interface HeritageStateV152 {
  version: typeof HERITAGE_V152_VERSION;
  testament: HeritageTestamentV152 | null;
  inheritance: HeritageInheritanceV152 | null;
}
export type HeritageChangeV152 = { ok: true; state: HeritageStateV152; message: string } | { ok: false; reason: string };

const RANK_ORDER: readonly RankId[] = ["young-blood", "blooded", "elite", "elder"];
const CHRONICLE_ORDER: readonly ChronicleRankId[] = ["youngling", "unblooded", "young-blood", "blooded", "elite", "elder", "ancient"];
const WEAPON_IDS = WEAPONS.map(weapon => weapon.id);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const isMask = (v: unknown): v is BiomaskId => typeof v === "string" && Object.hasOwn(V6_MASK_VISUAL_BY_ID, v);
const isWeapon = (v: unknown): v is WeaponId => typeof v === "string" && WEAPON_IDS.includes(v as WeaponId);
const trigger = (id: unknown) => HERITAGE_TRIGGERS_V152.find(t => t.id === id);

export const testamentIdV152 = (ownerCreatedAt: string) => `testament:${ownerCreatedAt}`;
export const weaponOriginalIdV152 = (ancestorOwnerCreatedAt: string, weaponId: WeaponId) => `legs:${ancestorOwnerCreatedAt}:${weaponId}`;
export const emptyHeritageV152 = (): HeritageStateV152 => ({ version: HERITAGE_V152_VERSION, testament: null, inheritance: null });
export const isFutureHeritageV152 = (value: unknown): boolean => record(value) && typeof value.version === "number" && value.version > HERITAGE_V152_VERSION;

export function heritageMaskLabelV152(id: BiomaskId | null): string {
  if (!id) return "Aucun masque transmis";
  return referenceBiomaskV62(id)?.label ?? preservedBiomaskV62(id)?.label ?? id;
}
export const heritageMaskSrcV152 = (id: BiomaskId | null): string | null => id ? referenceBiomaskPathV62(id) : null;
export const heritageWeaponLabelV152 = (id: WeaponId | null): string => id ? WEAPONS.find(w => w.id === id)?.name ?? id : "Aucune arme léguée";

function normalizeLegend(v: unknown): HeritageLegendV152 | null {
  if (!record(v) || typeof v.hunterName !== "string" || v.hunterName.length > 48 || !RANK_ORDER.includes(v.rankId as RankId) ||
    !(v.chronicleRankId === null || CHRONICLE_ORDER.includes(v.chronicleRankId as ChronicleRankId)) ||
    !count(v.honor) || !count(v.trophyCount) || !count(v.missionsCompleted) || typeof v.storyCompleted !== "boolean") return null;
  return { hunterName: v.hunterName, rankId: v.rankId as RankId, chronicleRankId: v.chronicleRankId as ChronicleRankId | null,
    honor: v.honor, trophyCount: v.trophyCount, missionsCompleted: v.missionsCompleted, storyCompleted: v.storyCompleted };
}
function normalizeTestament(v: unknown): HeritageTestamentV152 | null {
  if (!record(v) || !iso(v.ownerCreatedAt) || v.id !== testamentIdV152(v.ownerCreatedAt) || !iso(v.sealedAt)) return null;
  const definition = trigger(v.trigger), legend = normalizeLegend(v.legend);
  if (!definition || !legend) return null;
  // Le contenu doit correspondre au déclencheur : BB-E2 n'a ni masque ni arme.
  if (definition.transmitsMask ? !isMask(v.maskId) : v.maskId !== null) return null;
  if (definition.transmitsWeapon ? !isWeapon(v.weaponId) : v.weaponId !== null) return null;
  return { id: v.id as string, ownerCreatedAt: v.ownerCreatedAt, sealedAt: v.sealedAt, trigger: definition.id,
    maskId: v.maskId as BiomaskId | null, weaponId: v.weaponId as WeaponId | null, legend };
}
function normalizeInheritance(v: unknown, owner: string): HeritageInheritanceV152 | null {
  if (!record(v) || v.heirOwnerCreatedAt !== owner || !iso(v.receivedAt) || v.reputation !== "descendant-de" ||
    v.bonusHonorApplied !== HERITAGE_BONUS_HONOR_V152) return null;
  const testament = normalizeTestament(v.testament);
  // Un chasseur n'hérite pas de son propre legs.
  if (!testament || testament.ownerCreatedAt === owner) return null;
  let weapon: HeritageWeaponOriginalV152 | null = null;
  if (testament.weaponId) {
    const w = v.weapon;
    if (!record(w) || w.weaponId !== testament.weaponId || w.originalId !== weaponOriginalIdV152(testament.ownerCreatedAt, testament.weaponId) ||
      w.ownerId !== owner || (w.locationId !== "archives-des-lignees" && w.locationId !== "porte-par-heritier")) return null;
    weapon = { originalId: w.originalId, weaponId: testament.weaponId, ownerId: owner, locationId: w.locationId };
  } else if (v.weapon !== null) return null;
  return { testament, heirOwnerCreatedAt: owner, receivedAt: v.receivedAt, bonusHonorApplied: HERITAGE_BONUS_HONOR_V152, reputation: "descendant-de", weapon };
}
/** null = document invalide ou futur ; un champ absent reste absent dans la sauvegarde. */
export function normalizeHeritageV152(value: unknown, ownerCreatedAt: string): HeritageStateV152 | null {
  if (!record(value) || value.version !== HERITAGE_V152_VERSION) return null;
  const testament = value.testament === null ? null : normalizeTestament(value.testament);
  const inheritance = value.inheritance === null ? null : normalizeInheritance(value.inheritance, ownerCreatedAt);
  if ((value.testament !== null && (!testament || testament.ownerCreatedAt !== ownerCreatedAt)) || (value.inheritance !== null && !inheritance)) return null;
  return { version: HERITAGE_V152_VERSION, testament, inheritance };
}

/** Proposé : Elder par l'honneur (rang V35) ou par la chronique narrative (Elder ou Ancient). */
export function heritageSealEligibilityV152(save: Pick<SaveGame, "profile" | "prologue">): { allowed: boolean; reason: string } {
  const chronicle = save.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  const elder = save.profile.rankId === "elder" || chronicle === "elder" || chronicle === "ancient";
  return elder ? { allowed: true, reason: "" } : { allowed: false, reason: "Rang Elder requis pour sceller un legs (proposé : la bible place la transmission au rang Elder)." };
}
/** Proposé : l'arme léguée se porte à partir de Blooded (la bible dit « quand son rang le permet » sans fixer le rang). */
export function heritageWeaponRankAllowedV152(save: Pick<SaveGame, "profile" | "prologue">): boolean {
  const chronicle = save.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  return RANK_ORDER.indexOf(save.profile.rankId) >= RANK_ORDER.indexOf("blooded") ||
    (chronicle !== null && CHRONICLE_ORDER.indexOf(chronicle) >= CHRONICLE_ORDER.indexOf("blooded"));
}

type SealSource = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "appearance" | "inventory" | "trophies" | "statistics" | "storyCompleted"> & { heritageV152?: unknown };
/** Scelle le legs dans la partie qui transmet. Irréversible ; un second scellement est refusé. */
export function sealHeritageTestamentV152(save: SealSource, choice: { trigger: HeritageTriggerV152; weaponId: WeaponId | null }, now: string): HeritageChangeV152 {
  const definition = trigger(choice.trigger);
  if (definition?.id === "black-god-sacrifice") return { ok: false, reason: "Le sacrifice scelle son legs au moment où il est accompli, pas depuis ce panneau." };
  if (definition?.id === "hardcore-death") return { ok: false, reason: "La mort en Hardcore scelle son legs à la clôture de la chronique, pas depuis ce panneau." };
  if (!definition?.reachable) return { ok: false, reason: "Ce déclencheur n’existe pas encore dans le jeu." };
  if (definition.id === "elder-retirement") { const gate = heritageSealEligibilityV152(save); if (!gate.allowed) return { ok: false, reason: gate.reason }; }
  return sealWith(save, definition, choice.weaponId, save.appearance.biomaskId, now);
}

/**
 * V155 · legs d'une mort en Hardcore. Appelé seulement par systems/hardcoreV155.ts, après la mort
 * constatée et la confirmation explicite du joueur. Le masque est celui porté ; à défaut, celui que le
 * joueur désigne (proposé). L'arme est choisie à la clôture (proposé : la bible dit « avant la fin »,
 * une mort en Hardcore n'est pas annoncée).
 */
export function sealHardcoreDeathTestamentV152(save: SealSource, choice: { weaponId: WeaponId | null; maskId: BiomaskId | null }, now: string): HeritageChangeV152 {
  const definition = trigger("hardcore-death")!;
  return sealWith(save, definition, choice.weaponId, isMask(save.appearance.biomaskId) ? save.appearance.biomaskId : choice.maskId, now);
}

/**
 * V162 · legs du sacrifice Black God (hors canon). Appelé seulement par systems/blackGodV162.ts, après la
 * victoire de l'épreuve finale et la confirmation explicite du joueur. L'arme est choisie avant la fin
 * (bible : « le joueur la choisit avant la fin ») ; masque porté, ou désigné s'il n'y en a pas (proposé).
 */
export function sealBlackGodSacrificeTestamentV152(save: SealSource, choice: { weaponId: WeaponId | null; maskId: BiomaskId | null }, now: string): HeritageChangeV152 {
  const definition = trigger("black-god-sacrifice")!;
  return sealWith(save, definition, choice.weaponId, isMask(save.appearance.biomaskId) ? save.appearance.biomaskId : choice.maskId, now);
}

function sealWith(save: SealSource, definition: HeritageTriggerDefinitionV152, weaponId: WeaponId | null, maskId: BiomaskId | null, now: string): HeritageChangeV152 {
  if (isFutureHeritageV152(save.heritageV152)) return { ok: false, reason: "Registre d’héritage d’une version plus récente : rien n’est modifié." };
  const state = save.heritageV152 === undefined || save.heritageV152 === null ? emptyHeritageV152() : normalizeHeritageV152(save.heritageV152, save.createdAt);
  if (!state) return { ok: false, reason: "Registre d’héritage illisible : rien n’est modifié." };
  if (state.testament) return { ok: false, reason: "Le legs est déjà scellé ; il ne peut être ni refait ni dupliqué." };
  if (definition.transmitsMask && !isMask(maskId)) return { ok: false, reason: "Aucun biomask porté : choisis d’abord un masque à déposer au mausolée." };
  if (definition.transmitsWeapon && (!isWeapon(weaponId) || !save.inventory.unlockedWeaponIds.includes(weaponId)))
    return { ok: false, reason: "Choisis une arme que ton chasseur possède réellement." };
  if (!iso(now)) return { ok: false, reason: "Horodatage invalide." };
  const testament: HeritageTestamentV152 = {
    id: testamentIdV152(save.createdAt), ownerCreatedAt: save.createdAt, sealedAt: now, trigger: definition.id,
    maskId: definition.transmitsMask ? maskId : null,
    weaponId: definition.transmitsWeapon ? weaponId : null,
    legend: { hunterName: save.profile.hunterName.slice(0, 48), rankId: save.profile.rankId,
      chronicleRankId: save.prologue ? getChronicleRank(save.prologue.chronicle) : null, honor: save.profile.honor,
      trophyCount: save.trophies.length, missionsCompleted: save.statistics.missionsCompleted, storyCompleted: save.storyCompleted },
  };
  return { ok: true, state: { ...state, testament }, message: `Legs scellé : ${heritageMaskLabelV152(testament.maskId)} au mausolée, ${heritageWeaponLabelV152(testament.weaponId)} aux Archives des Lignées.` };
}

/** Lit un legs offert par une autre partie (lecture seule). */
export function heritageTestamentOfCampaignV152(campaign: unknown): HeritageTestamentV152 | null {
  if (!record(campaign) || !iso(campaign.createdAt) || campaign.heritageV152 === undefined || campaign.heritageV152 === null) return null;
  return normalizeHeritageV152(campaign.heritageV152, campaign.createdAt)?.testament ?? null;
}
/** Identifiant du legs déjà reçu par une partie, pour refuser toute seconde réception. */
export function heritageClaimOfCampaignV152(campaign: unknown): string | null {
  if (!record(campaign) || !record(campaign.heritageV152) || !record(campaign.heritageV152.inheritance)) return null;
  const testament = campaign.heritageV152.inheritance.testament;
  // Lecture prudente : un document même partiellement invalide qui nomme un legs le réserve.
  return record(testament) && typeof testament.id === "string" ? testament.id : null;
}

/**
 * Applique l'héritage à une partie neuve (création dans un autre emplacement).
 * Le bonus d'honneur est appliqué une seule fois ; aucun rang n'est donné.
 */
export function receiveHeritageV152(save: SaveGame, testament: unknown, claimedTestamentIds: ReadonlySet<string>, now: string): { ok: true; save: SaveGame } | { ok: false; reason: string } {
  const legs = normalizeTestament(testament);
  if (!legs) return { ok: false, reason: "Legs illisible ou incomplet." };
  if (legs.ownerCreatedAt === save.createdAt) return { ok: false, reason: "Une partie n’hérite pas de son propre legs." };
  if (claimedTestamentIds.has(legs.id)) return { ok: false, reason: "Ce legs a déjà été reçu par une autre partie ; il n’est pas dupliqué." };
  if (save.heritageV152 !== undefined && save.heritageV152 !== null) return { ok: false, reason: "Cette partie a déjà un registre d’héritage." };
  // Bonus de départ : seulement sur une partie neuve, et sans changer de rang.
  if (save.profile.honor !== 0 || save.profile.rankId !== "young-blood" || save.statistics.missionsCompleted !== 0)
    return { ok: false, reason: "L’héritage se reçoit à la création d’une nouvelle partie." };
  if (!iso(now)) return { ok: false, reason: "Horodatage invalide." };
  const inheritance: HeritageInheritanceV152 = {
    testament: legs, heirOwnerCreatedAt: save.createdAt, receivedAt: now, bonusHonorApplied: HERITAGE_BONUS_HONOR_V152, reputation: "descendant-de",
    weapon: legs.weaponId ? { originalId: weaponOriginalIdV152(legs.ownerCreatedAt, legs.weaponId), weaponId: legs.weaponId, ownerId: save.createdAt, locationId: "archives-des-lignees" } : null,
  };
  return { ok: true, save: { ...save, profile: { ...save.profile, honor: save.profile.honor + HERITAGE_BONUS_HONOR_V152 },
    heritageV152: { version: HERITAGE_V152_VERSION, testament: null, inheritance } } };
}

/** Déplacement physique de l'original légué : un seul emplacement à la fois (TR-R01, STATE5-32). */
export function moveHeritageWeaponV152(save: Pick<SaveGame, "createdAt" | "profile" | "prologue"> & { heritageV152?: unknown }, to: HeritageWeaponLocationV152): HeritageChangeV152 {
  if (isFutureHeritageV152(save.heritageV152)) return { ok: false, reason: "Registre d’héritage d’une version plus récente : rien n’est modifié." };
  const state = normalizeHeritageV152(save.heritageV152, save.createdAt);
  const weapon = state?.inheritance?.weapon;
  if (!state || !state.inheritance || !weapon) return { ok: false, reason: "Aucune arme léguée dans cette partie." };
  if (weapon.locationId === to) return { ok: false, reason: to === "porte-par-heritier" ? "L’arme léguée est déjà portée." : "L’arme léguée est déjà aux Archives des Lignées." };
  if (to === "porte-par-heritier" && !heritageWeaponRankAllowedV152(save)) return { ok: false, reason: "Rang Blooded requis pour porter l’arme léguée (proposé)." };
  const next: HeritageStateV152 = { ...state, inheritance: { ...state.inheritance, weapon: { ...weapon, locationId: to } } };
  return { ok: true, state: next, message: to === "porte-par-heritier" ? `${heritageWeaponLabelV152(weapon.weaponId)} léguée retirée de sa niche : son emplacement aux Archives est vidé.` : `${heritageWeaponLabelV152(weapon.weaponId)} léguée reposée aux Archives des Lignées.` };
}
