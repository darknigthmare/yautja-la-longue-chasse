/**
 * V147 — Trophées : usages (bible de campagne, section « Trophées : usages »).
 *
 * Un trophée a quatre usages, dans le cadre des règles du classeur V6 (un
 * original unique à un seul emplacement, provenance complète) :
 * - Prestige : exposé à la maison, à la base ou au navire, il monte le respect
 *   de la communauté (0 à 100, règle HOME-R02) ;
 * - Porté : sur l'armure, il donne un bonus et change la réaction des proies ;
 * - Échange : cédé à un autre clan contre une faveur ou des matériaux ;
 *   l'original quitte alors la collection ;
 * - Révélation : étudié à l'atelier, il ouvre une piste (quête, époque du Warp
 *   ou lieu caché).
 * Règle proposée par la bible : un même trophée ne fait qu'un usage à la fois
 * (exposé ou porté) ; une fois échangé, il ne peut plus être étudié.
 *
 * Ce module est pur : il ne touche ni au stockage ni au rendu. L'état est
 * additif (`SaveGame.trophyUsagesV147`), écrit seulement après un premier
 * usage. Il ne retire jamais un trophée de la collection, sauf l'échange
 * explicite, qui garde la provenance complète dans le registre des échanges.
 * La couleur de la pièce V146 « trophies » (trophées portés) reste purement
 * esthétique : ce module ne la lit pas et ne la modifie pas.
 *
 * Toutes les valeurs chiffrées ci-dessous sont des PROPOSITIONS : ni la bible
 * ni les données V6 du dépôt ne les fixent (la règle HOME-R02 n'a que sa borne
 * 0-100 dans la bible ; le texte de la règle n'est pas dans le dépôt).
 */
import type { SaveGame, TrophyQuality, TrophyRecord } from "../types";
import { emptyHarvestInventoryV112 } from "./harvestInventoryV112";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const validIso = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export const TROPHY_USAGES_VERSION_V147 = 1 as const;

// ---------------------------------------------------------------------------
// Lieux d'exposition et clans (noms du classeur V6 repris par la bible)
// ---------------------------------------------------------------------------

export const TROPHY_DISPLAY_SITES_V147 = ["home", "base", "ship"] as const;
export type TrophyDisplaySiteV147 = (typeof TROPHY_DISPLAY_SITES_V147)[number];
export const TROPHY_DISPLAY_SITE_LABELS_V147: Readonly<Record<TrophyDisplaySiteV147, string>> = {
  home: "Maison",
  base: "Base",
  ship: "Navire",
};

/** Les 15 clans du classeur V6 (feuille « Doctrines des clans », W3-CL01 → CL15). */
export const TROPHY_EXCHANGE_CLANS_V147 = Object.freeze([
  { id: "CL1", name: "Maisons des Braises" },
  { id: "CL2", name: "Peuple des Citernes" },
  { id: "CL3", name: "Gardiens des Hautes Branches" },
  { id: "CL4", name: "Veilleurs des Eaux Calmes" },
  { id: "CL5", name: "Veilleurs des Crêtes" },
  { id: "CL6", name: "Maisons du Rivage" },
  { id: "CL7", name: "Artisans de la Roche Chaude" },
  { id: "CL8", name: "Maisons du Givre" },
  { id: "CL9", name: "Conservateurs des Anciennes Pierres" },
  { id: "CL10", name: "Gardiens du Confinement" },
  { id: "CL11", name: "Flotte des Haltes Lointaines" },
  { id: "CL12", name: "Pacte des Mandats Liés" },
  { id: "CL13", name: "Cercle des Noms Rapportés" },
  { id: "CL14", name: "Foyer des Retours" },
  { id: "CL15", name: "Ligue des Forges Fermées" },
] as const);
export type TrophyExchangeClanIdV147 = (typeof TROPHY_EXCHANGE_CLANS_V147)[number]["id"];
const CLAN_IDS = new Set<string>(TROPHY_EXCHANGE_CLANS_V147.map(clan => clan.id));
export const isTrophyExchangeClanIdV147 = (value: unknown): value is TrophyExchangeClanIdV147 =>
  typeof value === "string" && CLAN_IDS.has(value);

// ---------------------------------------------------------------------------
// Valeurs proposées (non fixées par la bible ni par le classeur V6)
// ---------------------------------------------------------------------------

/** Proposé : apport d'un trophée exposé au respect de la communauté (HOME-R02, borné 0-100). */
export const PRESTIGE_RESPECT_BY_QUALITY_V147: Readonly<Record<TrophyQuality, number>> = {
  worthy: 2, blooded: 4, elite: 6, flawless: 10,
};
/** Borne de la règle HOME-R02 citée par la bible : respect de 0 à 100. */
export const COMMUNITY_RESPECT_MAX_V147 = 100;
/** Proposé : nombre de trophées portés en même temps sur l'armure. */
export const MAX_WORN_TROPHIES_V147 = 3;
/**
 * Proposé : bonus d'un trophée porté, exprimé en pression sur le moral des
 * proies (la bible dit « bonus » sans le chiffrer ; la section « Équipement et
 * IA des humains » cite le moral et la panique des escouades).
 */
export const WORN_MORALE_PRESSURE_BY_QUALITY_V147: Readonly<Record<TrophyQuality, number>> = {
  worthy: 1, blooded: 2, elite: 3, flawless: 4,
};
/** Proposé : matériaux reçus quand un trophée est échangé contre des matériaux. */
export const EXCHANGE_MATERIAL_UNITS_BY_QUALITY_V147: Readonly<Record<TrophyQuality, number>> = {
  worthy: 1, blooded: 2, elite: 3, flawless: 5,
};
/** Proposé : exposer ou porter demande une prise déjà montée à l'atelier (étape « prepare »). */
export const USAGE_REQUIRES_PREPARED_V147 = true;
const MAX_EXCHANGES = 500;
/** Ligne du catalogue de réserve V112 où arrivent les matériaux d'échange. */
export const EXCHANGE_MATERIAL_SPECIES_V147 = "echange-clan-v147";
const HARVEST_ARCHIVE_LIMIT = 512;

// ---------------------------------------------------------------------------
// Réactions des proies (bible : « Équipement et IA des humains »)
// ---------------------------------------------------------------------------

export interface PreyReactionV147 {
  readonly id: "xeno-isolated-flee" | "soldiers-aggressive";
  readonly prey: "xenomorph" | "human-soldier";
  readonly reaction: "flee-when-isolated" | "more-aggressive";
  readonly label: string;
  /** Exemple de la bible, lui-même marqué « proposé ». */
  readonly source: string;
}

const QUEEN = /queen|reine/i;
type ReactionRule = PreyReactionV147 & { readonly matches: (trophy: TrophyRecord) => boolean };
const REACTION_RULES: readonly ReactionRule[] = Object.freeze([
  {
    id: "xeno-isolated-flee", prey: "xenomorph", reaction: "flee-when-isolated",
    label: "Les Xénomorphes isolés fuient",
    source: "Bible, Équipement et IA des humains (proposé) : un crâne de reine fait fuir les Xénomorphes isolés.",
    matches: (trophy: TrophyRecord) =>
      (trophy.partId === "skull" || trophy.partId === "skull-and-spine") &&
      QUEEN.test([trophy.definitionId, trophy.targetName, trophy.sourceEnemyId ?? ""].join(" ")),
  },
  {
    id: "soldiers-aggressive", prey: "human-soldier", reaction: "more-aggressive",
    label: "Les soldats humains deviennent plus agressifs",
    source: "Bible, Équipement et IA des humains (proposé) : des plaques d'unité humaines rendent les soldats plus agressifs.",
    matches: (trophy: TrophyRecord) => trophy.targetKind === "human" && trophy.partId === "insignia",
  },
]);

// ---------------------------------------------------------------------------
// Pistes de Révélation
// ---------------------------------------------------------------------------

export interface RevelationLeadV147 {
  readonly id: string;
  readonly kind: "quest" | "warp-epoch" | "hidden-place";
  readonly label: string;
  readonly source: string;
  /**
   * Trophées qui ouvrent la piste. Vide : ni la bible ni les données V6 du
   * dépôt ne disent quel trophée ouvre quelle piste. La piste est nommée, pas
   * encore reliée.
   */
  readonly trophyDefinitionIds: readonly string[];
}

/**
 * Registre alimenté uniquement par ce que la bible nomme (L-10 « Le Warp,
 * époques canon » et « Missions du Warp »). Aucune quête ni aucun lieu caché
 * n'est nommé comme piste de trophée : ces familles restent vides.
 */
export const REVELATION_LEADS_V147: readonly RevelationLeadV147[] = Object.freeze([
  { id: "W-01", kind: "warp-epoch", label: "Scandinavie viking, 841", source: "Bible L-10", trophyDefinitionIds: [] },
  { id: "W-02", kind: "warp-epoch", label: "Japon féodal, 1629", source: "Bible L-10", trophyDefinitionIds: [] },
  { id: "W-03", kind: "warp-epoch", label: "1715 (pistolet de Predator 2)", source: "Bible L-10", trophyDefinitionIds: [] },
  { id: "W-04", kind: "warp-epoch", label: "Grandes Plaines, 1719", source: "Bible L-10", trophyDefinitionIds: [] },
  { id: "W-05", kind: "warp-epoch", label: "1942", source: "Bible L-10", trophyDefinitionIds: [] },
  { id: "W-XVIII", kind: "warp-epoch", label: "Branche XVIIIe siècle, piste de Greyback", source: "Bible, Missions du Warp", trophyDefinitionIds: [] },
] as const);
const LEAD_BY_ID = new Map(REVELATION_LEADS_V147.map(lead => [lead.id, lead]));

/** Pistes qu'ouvre l'étude de ce trophée, d'après le registre. */
export function revelationLeadsForTrophyV147(
  trophy: Pick<TrophyRecord, "definitionId">,
  registry: readonly RevelationLeadV147[] = REVELATION_LEADS_V147,
): string[] {
  return registry.filter(lead => lead.trophyDefinitionIds.includes(trophy.definitionId)).map(lead => lead.id);
}

// ---------------------------------------------------------------------------
// État persistant
// ---------------------------------------------------------------------------

export type TrophyAssignmentV147 =
  | { usage: "displayed"; site: TrophyDisplaySiteV147; since: string }
  | { usage: "worn"; since: string };

export interface TrophyStudyV147 {
  studiedAt: string;
  /** Pistes ouvertes ; vide tant que le registre ne relie aucune piste à ce trophée. */
  leadIds: string[];
}

export type TrophyExchangeReturnV147 =
  | { kind: "favor" }
  | { kind: "materials"; units: number };

export interface TrophyExchangeV147 {
  /** Provenance complète de l'original, figée au moment de l'échange. */
  trophy: TrophyRecord;
  clanId: TrophyExchangeClanIdV147;
  exchangedAt: string;
  received: TrophyExchangeReturnV147;
}

export interface TrophyUsagesV147 {
  version: typeof TROPHY_USAGES_VERSION_V147;
  /** Un seul emplacement par original ; absent = en réserve. */
  assignments: Record<string, TrophyAssignmentV147>;
  studies: Record<string, TrophyStudyV147>;
  exchanges: TrophyExchangeV147[];
}

export function emptyTrophyUsagesV147(): TrophyUsagesV147 {
  return { version: TROPHY_USAGES_VERSION_V147, assignments: {}, studies: {}, exchanges: [] };
}

/** Vrai quand l'état stocké annonce une version que ce code ne connaît pas. */
export function isFutureTrophyUsagesV147(source: unknown): boolean {
  return isRecord(source) && Number(source.version) > TROPHY_USAGES_VERSION_V147;
}

/**
 * Normalise l'état lu dans une sauvegarde. Les affectations ne gardent que les
 * trophées présents dans la collection ; un trophée de la collection n'est
 * jamais retiré ici. `normalizeTrophy` est fourni par save.ts (mêmes règles
 * que la collection) pour relire la provenance des échanges.
 */
export function normalizeTrophyUsagesV147(
  source: unknown,
  trophies: readonly Pick<TrophyRecord, "id">[],
  normalizeTrophy: (raw: unknown) => TrophyRecord | null,
): TrophyUsagesV147 {
  const result = emptyTrophyUsagesV147();
  if (!isRecord(source) || source.version !== TROPHY_USAGES_VERSION_V147) return result;
  const owned = new Set(trophies.map(trophy => trophy.id));

  if (Array.isArray(source.exchanges)) {
    const seen = new Set<string>();
    for (const raw of source.exchanges.slice(-MAX_EXCHANGES)) {
      if (!isRecord(raw) || !isTrophyExchangeClanIdV147(raw.clanId) || !validIso(raw.exchangedAt)) continue;
      const trophy = normalizeTrophy(raw.trophy);
      if (!trophy || seen.has(trophy.id)) continue;
      const received = isRecord(raw.received) ? raw.received : null;
      let normalizedReturn: TrophyExchangeReturnV147 | null = null;
      if (received?.kind === "favor") normalizedReturn = { kind: "favor" };
      else if (received?.kind === "materials" && Number.isSafeInteger(received.units) && (received.units as number) > 0)
        normalizedReturn = { kind: "materials", units: received.units as number };
      if (!normalizedReturn) continue;
      seen.add(trophy.id);
      result.exchanges.push({ trophy, clanId: raw.clanId, exchangedAt: raw.exchangedAt, received: normalizedReturn });
    }
  }
  const exchanged = new Set(result.exchanges.map(entry => entry.trophy.id));

  if (isRecord(source.assignments)) {
    const worn: [string, TrophyAssignmentV147][] = [];
    for (const [id, raw] of Object.entries(source.assignments)) {
      if (!owned.has(id) || !isRecord(raw) || !validIso(raw.since)) continue;
      if (raw.usage === "displayed" && (TROPHY_DISPLAY_SITES_V147 as readonly unknown[]).includes(raw.site)) {
        result.assignments[id] = { usage: "displayed", site: raw.site as TrophyDisplaySiteV147, since: raw.since };
      } else if (raw.usage === "worn") {
        worn.push([id, { usage: "worn", since: raw.since }]);
      }
    }
    // Au-delà du nombre porté, les plus récents retournent en réserve (le trophée reste dans la collection).
    worn.sort((a, b) => Date.parse(a[1].since) - Date.parse(b[1].since))
      .slice(0, MAX_WORN_TROPHIES_V147)
      .forEach(([id, assignment]) => { result.assignments[id] = assignment; });
  }

  if (isRecord(source.studies)) {
    for (const [id, raw] of Object.entries(source.studies)) {
      if ((!owned.has(id) && !exchanged.has(id)) || !isRecord(raw) || !validIso(raw.studiedAt)) continue;
      const leadIds = Array.isArray(raw.leadIds)
        ? [...new Set(raw.leadIds.filter((lead): lead is string => typeof lead === "string" && LEAD_BY_ID.has(lead)))]
        : [];
      result.studies[id] = { studiedAt: raw.studiedAt, leadIds };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Usage courant et transitions
// ---------------------------------------------------------------------------

export type TrophyUsageV147 = "reserve" | "displayed" | "worn" | "traded";

export type TrophyUsageActionV147 =
  | { kind: "display"; trophyId: string; site: TrophyDisplaySiteV147 }
  | { kind: "wear"; trophyId: string }
  | { kind: "store"; trophyId: string }
  | { kind: "study"; trophyId: string }
  | { kind: "exchange"; trophyId: string; clanId: TrophyExchangeClanIdV147; receive: "favor" | "materials" };

export type TrophyUsageCheckV147 = { ok: true } | { ok: false; reason: string };

type UsageSave = Pick<SaveGame, "trophies" | "inventory"> & { trophyUsagesV147?: TrophyUsagesV147 | null };

const stateOf = (save: UsageSave): TrophyUsagesV147 => save.trophyUsagesV147 ?? emptyTrophyUsagesV147();

/** Usage courant ; null pour un identifiant ni possédé ni échangé. */
export function trophyUsageV147(save: UsageSave, trophyId: string): TrophyUsageV147 | null {
  const state = stateOf(save);
  if (!save.trophies.some(trophy => trophy.id === trophyId)) {
    return state.exchanges.some(entry => entry.trophy.id === trophyId) ? "traded" : null;
  }
  return state.assignments[trophyId]?.usage ?? "reserve";
}

const isPrepared = (trophy: TrophyRecord): boolean =>
  !USAGE_REQUIRES_PREPARED_V147 || (trophy.workshop?.completedActions ?? []).includes("prepare");

function harvestArchiveAccepts(save: UsageSave, clanId: string): boolean {
  const archive = save.inventory.harvestV112?.archive ?? [];
  return archive.some(entry => entry.speciesId === EXCHANGE_MATERIAL_SPECIES_V147 && entry.partId === clanId) ||
    archive.length < HARVEST_ARCHIVE_LIMIT;
}

/** Dit si une transition est permise, et sinon pourquoi (texte affichable). */
export function checkTrophyUsageV147(save: UsageSave, action: TrophyUsageActionV147): TrophyUsageCheckV147 {
  const state = stateOf(save);
  const trophy = save.trophies.find(entry => entry.id === action.trophyId);
  const refuse = (reason: string): TrophyUsageCheckV147 => ({ ok: false, reason });
  if (!trophy) {
    return state.exchanges.some(entry => entry.trophy.id === action.trophyId)
      ? refuse(action.kind === "study"
        ? "Ce trophée a été échangé : il ne peut plus être étudié."
        : "Ce trophée a été échangé : l'original a quitté la collection.")
      : refuse("Trophée introuvable dans la collection.");
  }
  const current = state.assignments[trophy.id] ?? null;
  switch (action.kind) {
    case "display":
      if (!(TROPHY_DISPLAY_SITES_V147 as readonly string[]).includes(action.site)) return refuse("Lieu d'exposition inconnu.");
      if (!isPrepared(trophy)) return refuse("Montez d'abord la prise à l'atelier (étape « Monter »).");
      if (current?.usage === "displayed" && current.site === action.site) return refuse("Ce trophée est déjà exposé ici.");
      return { ok: true };
    case "wear": {
      if (!isPrepared(trophy)) return refuse("Montez d'abord la prise à l'atelier (étape « Monter »).");
      if (current?.usage === "worn") return refuse("Ce trophée est déjà porté.");
      const worn = Object.values(state.assignments).filter(entry => entry.usage === "worn").length;
      if (worn >= MAX_WORN_TROPHIES_V147) return refuse(`L'armure porte déjà ${MAX_WORN_TROPHIES_V147} trophées.`);
      return { ok: true };
    }
    case "store":
      return current ? { ok: true } : refuse("Ce trophée est déjà en réserve.");
    case "study": {
      if (current) return refuse("Rangez d'abord le trophée : il est " + (current.usage === "worn" ? "porté." : "exposé."));
      const study = state.studies[trophy.id];
      if (study && study.leadIds.length > 0) return refuse("Ce trophée a déjà révélé sa piste.");
      return { ok: true };
    }
    case "exchange":
      if (!isTrophyExchangeClanIdV147(action.clanId)) return refuse("Clan inconnu.");
      if (action.receive !== "favor" && action.receive !== "materials") return refuse("Contrepartie inconnue.");
      if (current) return refuse("Rangez d'abord le trophée : il est " + (current.usage === "worn" ? "porté." : "exposé."));
      if (action.receive === "materials" && !harvestArchiveAccepts(save, action.clanId))
        return refuse("Le catalogue de réserve est plein : impossible de recevoir des matériaux.");
      return { ok: true };
  }
}

/**
 * Applique une transition. Renvoie null quand elle est refusée (contrat du
 * commit durable V146). Seul « exchange » retire un trophée de la collection.
 */
export function applyTrophyUsageV147<T extends UsageSave>(
  save: T, action: TrophyUsageActionV147, now = new Date().toISOString(),
): T | null {
  if (!checkTrophyUsageV147(save, action).ok) return null;
  const state = stateOf(save);
  const trophy = save.trophies.find(entry => entry.id === action.trophyId)!;
  const assignments = { ...state.assignments };
  switch (action.kind) {
    case "display":
      assignments[trophy.id] = { usage: "displayed", site: action.site, since: now };
      return { ...save, trophyUsagesV147: { ...state, assignments } } as T;
    case "wear":
      assignments[trophy.id] = { usage: "worn", since: now };
      return { ...save, trophyUsagesV147: { ...state, assignments } } as T;
    case "store":
      delete assignments[trophy.id];
      return { ...save, trophyUsagesV147: { ...state, assignments } } as T;
    case "study":
      return {
        ...save,
        trophyUsagesV147: {
          ...state,
          studies: { ...state.studies, [trophy.id]: { studiedAt: now, leadIds: revelationLeadsForTrophyV147(trophy) } },
        },
      } as T;
    case "exchange": {
      const received: TrophyExchangeReturnV147 = action.receive === "favor"
        ? { kind: "favor" }
        : { kind: "materials", units: EXCHANGE_MATERIAL_UNITS_BY_QUALITY_V147[trophy.quality] };
      let inventory = save.inventory;
      if (received.kind === "materials") {
        const clan = TROPHY_EXCHANGE_CLANS_V147.find(entry => entry.id === action.clanId)!;
        const harvest = save.inventory.harvestV112 ?? emptyHarvestInventoryV112();
        const existing = harvest.archive.find(entry =>
          entry.speciesId === EXCHANGE_MATERIAL_SPECIES_V147 && entry.partId === clan.id);
        const quality = Math.max(0, Math.min(100, Math.round(trophy.score)));
        const archive = existing
          ? harvest.archive.map(entry => entry === existing
            ? { ...entry, count: entry.count + received.units, qualityTotal: entry.qualityTotal + quality * received.units }
            : entry)
          : [...harvest.archive, {
            speciesId: EXCHANGE_MATERIAL_SPECIES_V147, partId: clan.id,
            label: `Matériaux d'échange · ${clan.name}`, count: received.units, qualityTotal: quality * received.units,
          }];
        inventory = { ...save.inventory, harvestV112: { ...harvest, archive } };
      }
      return {
        ...save,
        inventory,
        trophies: save.trophies.filter(entry => entry.id !== trophy.id),
        trophyUsagesV147: {
          ...state,
          assignments,
          exchanges: [...state.exchanges, {
            trophy: structuredClone(trophy), clanId: action.clanId, exchangedAt: now, received,
          }].slice(-MAX_EXCHANGES),
        },
      } as T;
    }
  }
}

// ---------------------------------------------------------------------------
// Effets
// ---------------------------------------------------------------------------

export interface CommunityRespectV147 {
  /** 0 à 100 (HOME-R02). */
  value: number;
  bySite: Record<TrophyDisplaySiteV147, number>;
  displayedCount: number;
}

/** Respect de la communauté apporté par les trophées exposés (Prestige). */
export function communityRespectV147(save: UsageSave): CommunityRespectV147 {
  const state = stateOf(save);
  const bySite: Record<TrophyDisplaySiteV147, number> = { home: 0, base: 0, ship: 0 };
  let total = 0;
  let displayedCount = 0;
  for (const trophy of save.trophies) {
    const assignment = state.assignments[trophy.id];
    if (assignment?.usage !== "displayed") continue;
    const value = PRESTIGE_RESPECT_BY_QUALITY_V147[trophy.quality];
    bySite[assignment.site] += value;
    total += value;
    displayedCount += 1;
  }
  return { value: Math.max(0, Math.min(COMMUNITY_RESPECT_MAX_V147, total)), bySite, displayedCount };
}

export interface WornTrophyEffectsV147 {
  wornTrophyIds: string[];
  /** Bonus proposé (voir WORN_MORALE_PRESSURE_BY_QUALITY_V147). */
  moralePressure: number;
  reactions: (PreyReactionV147 & { trophyIds: string[] })[];
}

/** Bonus et réactions des proies dus aux trophées portés (Porté). */
export function wornTrophyEffectsV147(save: UsageSave): WornTrophyEffectsV147 {
  const state = stateOf(save);
  const worn = save.trophies.filter(trophy => state.assignments[trophy.id]?.usage === "worn");
  const reactions: WornTrophyEffectsV147["reactions"] = [];
  for (const { matches, ...rule } of REACTION_RULES) {
    const trophyIds = worn.filter(matches).map(trophy => trophy.id);
    if (trophyIds.length) reactions.push({ ...rule, trophyIds });
  }
  return {
    wornTrophyIds: worn.map(trophy => trophy.id),
    moralePressure: worn.reduce((sum, trophy) => sum + WORN_MORALE_PRESSURE_BY_QUALITY_V147[trophy.quality], 0),
    reactions,
  };
}

/** Pistes ouvertes par les études (Révélation), dans l'ordre du registre. */
export function openedRevelationLeadsV147(save: UsageSave): RevelationLeadV147[] {
  const opened = new Set(Object.values(stateOf(save).studies).flatMap(study => study.leadIds));
  return REVELATION_LEADS_V147.filter(lead => opened.has(lead.id));
}

/** Faveurs obtenues par échange (Échange). Leur dépense n'existe pas encore. */
export function exchangeFavorsV147(save: UsageSave): TrophyExchangeV147[] {
  return stateOf(save).exchanges.filter(entry => entry.received.kind === "favor");
}
