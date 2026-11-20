/** Honor earned outside the eight campaign hunts is credited with its saved receipt. */
import type { SaveGame } from "../types";
import { HOMEWORLD_ALL_CONTRACTS_V69, normalizeHomeworldContractsV68 } from "./homeworldContractsV68";
import { CHRONICLE_EVIDENCE, normalizeClanChronicle, type ChronicleEvidenceId } from "./clanChronicle";
import { normalizeNpcMissionsV66 } from "./homeworldNpcMissionsV66";
import { normalizeHomeworldSideStoryV66 } from "./homeworldSideStoryV66";

const VERSION = 1 as const;
const kinds = ["chronicle", "solo", "contract", "npc-mission", "side-story"] as const;
type HonorSourceKindV169 = typeof kinds[number];
interface HonorSourceEventV169 { id: string; source: HonorSourceKindV169; label: string; delta: number }
interface HonorSourceReceiptV169 extends Omit<HonorSourceEventV169, "source" | "label"> {
  source: HonorSourceKindV169 | "justice" | "bad-blood";
  label?: string;
}
interface HonorSourceLedgerV169 { version: typeof VERSION; entries: HonorSourceReceiptV169[] }
const MAX_RECEIPTS = 256;

/**
 * Chronique (receipts `save.prologue.chronicle.evidence`).
 * - `intro-completed` : 100 — bible, Level 1 Unblooded, seuil 100 atteint à
 *   la « fin de l'intro (R2-M006) ».
 * - `first-queen-hunt` : 400 — bible, « reine Xénomorphe : base 400 » et
 *   « Contrat de ruche petite : 400 d'honneur ».
 * - Autres chapitres accomplis : 50 *(proposé)*. Calcul : la bible place
 *   Young Blood à 500 et dit que « le pack et les sorties d'entraînement
 *   rapportent assez pour atteindre 500 en une dizaine de missions » ;
 *   (500 − 100 de l'intro) / 8 chapitres de jeunesse et d'initiation
 *   (premières pistes, formation, piste sans guide, Quatza-Rij en triade,
 *   trois épreuves du temple, retour de la triade) = 50.
 * - Débuts, préparations, coordonnées et ellipses narratives : 0, ce ne sont
 *   pas des actes de chasse (non inscrits).
 */
const CHRONICLE_HONOR_V169: Readonly<Record<ChronicleEvidenceId, number>> = {
  "intro-begun": 0,
  "intro-completed": 100,
  "first-tracks": 50,
  "training-completed": 50,
  "unguided-hunt": 50,
  "quatza-rij-triad-hunt": 50,
  "temple-three-shadows-triad": 50,
  "temple-three-shadows-changing-layout": 50,
  "temple-three-shadows-no-energy": 50,
  "initiation-return": 50,
  "multiple-world-hunts": 50,
  "team-extraction": 50,
  "warp-module-quest": 50,
  "reserve-coordinates": 0,
  "queen-mission-briefing": 0,
  "first-queen-hunt": 400,
  "diverse-mastery": 50,
  "solitary-trial": 50,
  "long-hunt-history": 50,
  "next-generation": 50,
  "elder-time-passage": 0,
  "ancient-time-passage": 0,
  "lasting-legacy": 50,
  "forgotten-debt": 50,
};

/** Valeur d'un chapitre accompli *(proposé, voir CHRONICLE_HONOR_V169)*. */
const CHAPTER_HONOR_V169 = 50 as const;

/**
 * Campagnes solo terminées sans receipt de chronique propre (V68, V69, V70,
 * V90) : 50 chacune *(proposé, valeur d'un chapitre)*. V66 et V67 ne sont pas
 * listées : leur réussite est déjà le receipt `first-tracks` / `unguided-hunt`
 * de la chronique, compté une seule fois là.
 */
const SOLO_CAMPAIGN_KEYS_V169 = ["soloV68", "soloV69", "soloV70", "soloV90"] as const;

/**
 * Contrats V68/V69 remis : 1 honneur par marque de clan de la remise
 * *(proposé)*. 32 contrats, 18 à 78 marques, 1 142 au total ; chaque contrat
 * ne se remet qu'une fois (le registre V68 refuse une seconde remise).
 */
const CONTRACT_HONOR_PER_MARK_V169 = 1 as const;

/** Missions de PNJ V66 (2) et histoire annexe V66 (1) : 50 *(proposé, chapitre)*. */
const HOMEWORLD_STORY_HONOR_V169 = 50 as const;


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readHonorSources(raw: unknown): HonorSourceLedgerV169 | null {
  if (!isRecord(raw) || raw.version !== VERSION || !Array.isArray(raw.entries) || raw.entries.length > MAX_RECEIPTS) return null;
  const seen = new Set<string>();
  for (const entry of raw.entries) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id || entry.id.length > 128 ||
        seen.has(entry.id) ||
        (!kinds.includes(entry.source as HonorSourceKindV169) && entry.source !== "justice" && entry.source !== "bad-blood") ||
        (entry.label !== undefined && (typeof entry.label !== "string" || entry.label.length > 180)) ||
        typeof entry.delta !== "number" || !Number.isSafeInteger(entry.delta) || Math.abs(entry.delta) > 1_000_000) return null;
    seen.add(entry.id);
  }
  return raw as unknown as HonorSourceLedgerV169;
}

export function honorSourcesStatusV169(raw: unknown): "absent" | "future-version" | "invalid" | "ok" {
  if (raw === undefined || raw === null) return "absent";
  if (isRecord(raw) && Number(raw.version) > VERSION) return "future-version";
  return readHonorSources(raw) ? "ok" : "invalid";
}

function collectHonorSourceEventsV169(save: SaveGame): HonorSourceEventV169[] {
  const events: HonorSourceEventV169[] = [];
  if (save.prologue) {
    const chronicle = normalizeClanChronicle(save.prologue.chronicle);
    for (const definition of CHRONICLE_EVIDENCE) {
      const value = CHRONICLE_HONOR_V169[definition.id];
      if (value > 0 && chronicle.evidence.some(({ id }) => id === definition.id)) {
        events.push({ id: `chronicle:${definition.id}`, source: "chronicle", label: definition.label, delta: value });
      }
    }
  }
  for (const key of SOLO_CAMPAIGN_KEYS_V169) {
    const campaign = save[key] as unknown;
    if (isRecord(campaign) && campaign.status === "completed" && typeof campaign.completedAt === "string") {
      events.push({ id: `solo:${key}`, source: "solo", label: `Campagne solo ${key.slice(4)} terminée`, delta: CHAPTER_HONOR_V169 });
    }
  }
  const homeworld = save.homeworld;
  if (homeworld) {
    const contracts = normalizeHomeworldContractsV68(homeworld.contractsV68);
    for (const entry of contracts.entries) {
      if (entry.status !== "completed") continue;
      const definition = HOMEWORLD_ALL_CONTRACTS_V69.find(({ id }) => id === entry.id);
      if (definition) {
        events.push({ id: `contract:${definition.id}`, source: "contract", label: `Contrat remis : ${definition.title}`,
          delta: definition.rewardMarks * CONTRACT_HONOR_PER_MARK_V169 });
      }
    }
    const npc = normalizeNpcMissionsV66(homeworld.npcMissionsV66);
    if (npc.ash.delivered) events.push({ id: "npc-mission:ash", source: "npc-mission", label: "Mission de PNJ livrée : Marches de Cendre", delta: HOMEWORLD_STORY_HONOR_V169 });
    if (npc.glass.delivered) events.push({ id: "npc-mission:glass", source: "npc-mission", label: "Mission de PNJ livrée : Désert de Verre", delta: HOMEWORLD_STORY_HONOR_V169 });
    if (normalizeHomeworldSideStoryV66(homeworld.sideStoryV66).completed) {
      events.push({ id: "side-story:v66", source: "side-story", label: "Histoire annexe de la cité conclue", delta: HOMEWORLD_STORY_HONOR_V169 });
    }
  }
  return events;
}

/** The historical campaign ranks use their existing hunt thresholds. */
export function honorForCampaignRankV169(honor: number, raw: unknown): number {
  const outside = readHonorSources(raw)?.entries.reduce(
    (total, receipt) => total + Math.max(0, receipt.delta), 0,
  ) ?? 0;
  return Math.max(0, honor - outside);
}

/** Called only after the existing owner and conflict checks made previous authoritative. */
export function settleHonorSourcesV169(save: SaveGame, previous: SaveGame | null): SaveGame {
  const prior = previous ?? save;
  const raw = prior.honorSourcesV169;
  const ledger = readHonorSources(raw);
  if (raw != null && !ledger) return save;
  const entries = [...(ledger?.entries ?? [])];
  const known = new Set(entries.map(entry => entry.id));
  for (const entry of collectHonorSourceEventsV169(prior)) {
    if (!known.has(entry.id)) {
      known.add(entry.id);
      entries.push({ ...entry, delta: 0 });
    }
  }
  let honor = save.profile.honor;
  for (const entry of collectHonorSourceEventsV169(save)) {
    if (known.has(entry.id)) continue;
    known.add(entry.id);
    const after = honor + Math.max(0, Math.min(Number.MAX_SAFE_INTEGER - honor, entry.delta));
    entries.push({ ...entry, delta: after - honor });
    honor = after;
  }
  if (entries.length > MAX_RECEIPTS) return { ...save, honorSourcesV169: raw };
  if (!entries.length && !ledger) return save;
  if (entries.length === ledger?.entries.length && save.honorSourcesV169 === raw) return save;
  return { ...save, profile: { ...save.profile, honor }, honorSourcesV169: { ...ledger, version: VERSION, entries } };
}
