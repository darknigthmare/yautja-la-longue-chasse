/**
 * V155 · Mode Hardcore et mort définitive.
 *
 * Source : docs/campagne/BIBLE_DE_CAMPAGNE.md
 * - § « Mort et difficulté », ligne Hardcore : « mort définitive : la partie suivante hérite du masque et de
 *   la légende au mausolée » (mort en chasse ; « idem » pour la mort pendant un rite).
 * - § « Héritage vers la partie suivante » : « Décision : les quatre, après le sacrifice ou une mort en
 *   hardcore » (masque au mausolée, arme léguée, nom dans les légendes, bonus de départ).
 * - § « Mort et matériaux » : « Les modes réalisme et hardcore suivent les règles déjà fixées dans
 *   Mort et difficulté ».
 *
 * La bible ne fixe ni le moment du choix du mode, ni son caractère réversible, ni le sort des sauvegardes
 * antérieures, ni l'écran de clôture : ces points sont marqués « proposé » ci-dessous.
 */
import type { BiomaskId, MissionId, SaveGame, WeaponId } from "../types";
import { MISSION_BY_ID } from "../data";
import {
  isFutureHeritageV152, normalizeHeritageV152, sealHardcoreDeathTestamentV152, type HeritageStateV152,
} from "./heritageV152";

export const HARDCORE_V155_VERSION = 1 as const;

/** Lignes de la bible reprises telles quelles (affichées à la création et à la clôture). */
export const HARDCORE_SOURCE_V155 = {
  document: "docs/campagne/BIBLE_DE_CAMPAGNE.md · Mort et difficulté",
  rule: "Hardcore : mort définitive : la partie suivante hérite du masque et de la légende au mausolée.",
  heritage: "Héritage vers la partie suivante : les quatre, après le sacrifice ou une mort en hardcore.",
} as const;

export interface HardcoreDeathV155 {
  /** Chasse où la mort a eu lieu (la bible : « Mort en chasse »). */
  missionId: MissionId;
  diedAt: string;
  /** null : mort constatée, clôture pas encore confirmée par le joueur. */
  closedAt: string | null;
}
export interface HardcoreStateV155 {
  version: typeof HARDCORE_V155_VERSION;
  ownerCreatedAt: string;
  /** Proposé : le mode se choisit à la création et reste fixé ; chosenAt = date de création de la partie. */
  chosenAt: string;
  death: HardcoreDeathV155 | null;
}
export type HardcoreStatusV155 = "none" | "alive" | "death-pending" | "closed" | "future" | "invalid";
export type HardcoreChangeV155 =
  | { ok: true; hardcore: HardcoreStateV155; heritage: HeritageStateV152 | null; message: string }
  | { ok: false; reason: string };

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const isMission = (v: unknown): v is MissionId => typeof v === "string" && Object.hasOwn(MISSION_BY_ID, v);

export const isFutureHardcoreV155 = (value: unknown): boolean =>
  record(value) && typeof value.version === "number" && value.version > HARDCORE_V155_VERSION;

/** État neuf, créé une seule fois avec la partie (proposé : aucun passage ultérieur en Hardcore). */
export function createHardcoreStateV155(ownerCreatedAt: string): HardcoreStateV155 {
  return { version: HARDCORE_V155_VERSION, ownerCreatedAt, chosenAt: ownerCreatedAt, death: null };
}

/** null = document invalide, futur ou recopié depuis une autre partie. */
export function normalizeHardcoreV155(value: unknown, ownerCreatedAt: string): HardcoreStateV155 | null {
  if (!record(value) || value.version !== HARDCORE_V155_VERSION || value.ownerCreatedAt !== ownerCreatedAt ||
    value.chosenAt !== ownerCreatedAt || !iso(ownerCreatedAt)) return null;
  let death: HardcoreDeathV155 | null = null;
  if (value.death !== null) {
    const d = value.death;
    if (!record(d) || !isMission(d.missionId) || !iso(d.diedAt) || !(d.closedAt === null || iso(d.closedAt))) return null;
    death = { missionId: d.missionId, diedAt: d.diedAt, closedAt: d.closedAt as string | null };
  }
  return { version: HARDCORE_V155_VERSION, ownerCreatedAt, chosenAt: ownerCreatedAt, death };
}

export function hardcoreStatusV155(campaign: unknown): HardcoreStatusV155 {
  if (!record(campaign) || campaign.hardcoreV155 === undefined || campaign.hardcoreV155 === null) return "none";
  if (isFutureHardcoreV155(campaign.hardcoreV155)) return "future";
  const state = typeof campaign.createdAt === "string" ? normalizeHardcoreV155(campaign.hardcoreV155, campaign.createdAt) : null;
  if (!state) return "invalid";
  return state.death === null ? "alive" : state.death.closedAt === null ? "death-pending" : "closed";
}
/** Une mort constatée (en attente ou close) : la chronique ne reprend plus la chasse. */
export const hardcoreDeathRecordedV155 = (campaign: unknown): boolean => {
  const status = hardcoreStatusV155(campaign);
  return status === "death-pending" || status === "closed";
};

type HardcoreSource = Pick<SaveGame, "createdAt"> & { hardcoreV155?: unknown };
/**
 * Mort en chasse d'un chasseur Hardcore : la mort est constatée tout de suite (pas de reprise, pas de
 * point de contrôle). Rien n'est effacé ; la clôture reste à confirmer par le joueur. Idempotent.
 */
export function recordHardcoreDeathV155(save: HardcoreSource, missionId: MissionId, now: string): HardcoreChangeV155 {
  if (isFutureHardcoreV155(save.hardcoreV155)) return { ok: false, reason: "Mode Hardcore d’une version plus récente : rien n’est modifié." };
  if (save.hardcoreV155 === undefined || save.hardcoreV155 === null) return { ok: false, reason: "Cette partie n’est pas en mode Hardcore." };
  const state = normalizeHardcoreV155(save.hardcoreV155, save.createdAt);
  if (!state) return { ok: false, reason: "Registre Hardcore illisible : rien n’est modifié." };
  if (!isMission(missionId) || !iso(now)) return { ok: false, reason: "Chasse ou horodatage invalide." };
  if (state.death) return { ok: true, hardcore: state, heritage: null, message: "La mort de ce chasseur est déjà inscrite." };
  return { ok: true, hardcore: { ...state, death: { missionId, diedAt: now, closedAt: null } }, heritage: null,
    message: "Mort définitive (Hardcore). La chronique attend sa clôture." };
}

type CloseSource = Parameters<typeof sealHardcoreDeathTestamentV152>[0] & { hardcoreV155?: unknown };
/**
 * Clôture confirmée : la chronique devient close (lecture seule) et le legs de mort est scellé
 * (masque, arme, légende ; le bonus s'applique à la partie héritière). Un legs déjà scellé (retraite à
 * Elder, proposée en V152) est conservé tel quel : aucun second legs n'est créé.
 */
export function closeHardcoreChronicleV155(save: CloseSource, choice: { weaponId: WeaponId | null; maskId: BiomaskId | null }, now: string): HardcoreChangeV155 {
  if (isFutureHardcoreV155(save.hardcoreV155) || isFutureHeritageV152(save.heritageV152))
    return { ok: false, reason: "Registre d’une version plus récente : rien n’est modifié." };
  const state = save.hardcoreV155 === undefined || save.hardcoreV155 === null ? null : normalizeHardcoreV155(save.hardcoreV155, save.createdAt);
  if (!state) return { ok: false, reason: "Cette partie n’est pas en mode Hardcore." };
  if (!state.death) return { ok: false, reason: "Aucune mort n’est inscrite : la chronique continue." };
  if (state.death.closedAt) return { ok: false, reason: "La chronique est déjà close." };
  if (!iso(now)) return { ok: false, reason: "Horodatage invalide." };
  const existing = save.heritageV152 === undefined || save.heritageV152 === null ? null : normalizeHeritageV152(save.heritageV152, save.createdAt);
  if (save.heritageV152 !== undefined && save.heritageV152 !== null && !existing) return { ok: false, reason: "Registre d’héritage illisible : rien n’est modifié." };
  let heritage: HeritageStateV152 | null = null;
  if (!existing?.testament) {
    const sealed = sealHardcoreDeathTestamentV152(save, choice, now);
    if (!sealed.ok) return { ok: false, reason: sealed.reason };
    heritage = sealed.state;
  }
  return { ok: true, hardcore: { ...state, death: { ...state.death, closedAt: now } }, heritage,
    message: heritage ? "Chronique close. Le masque et la légende attendent la partie suivante au mausolée." : "Chronique close. Le legs déjà scellé reste le seul legs de ce chasseur." };
}
