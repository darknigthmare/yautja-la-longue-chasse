/** Clan archive museum. Its architecture and reconstruction technology are a project interpretation, not franchise canon. */
import type { SaveGame } from "../types";
import { getChronicleFunctions, getChronicleRank, type ChronicleRankId } from "./clanChronicle";

export const MAUSOLEUM_SOURCE = "6abc3138-4254-83eb-aff2-19352afcb596";
const mask = (id: string) => `/game/assets/v3/actors/yautja/hunter/masks/${id}.webp`;
export interface MausoleumMask { id: string; name: string; src: string | null; note: string }
export interface MausoleumChronicle {
  id: string; title: string; gallery: "first" | "great" | "forbidden" | "temporal";
  era: string; summary: string; masks: readonly MausoleumMask[]; archive: readonly string[];
  production: "not-produced"; unavailableReason: string;
}
const m = (id: string, name: string, src: string | null = mask(id)): MausoleumMask => ({ id, name, src, note: src ? "Bitmap du projet ; fidélité intégrale non certifiée." : "Représentation propre à produire ; aucun autre masque ne lui est substitué." });
const entry = (value: Omit<MausoleumChronicle, "production" | "unavailableReason">): MausoleumChronicle => ({ ...value, production: "not-produced", unavailableReason: "Campagne DLC non produite et non installée. Les arènes THE PIT ne constituent pas cette campagne." });
export const MAUSOLEUM_CHRONICLES: readonly MausoleumChronicle[] = [
  entry({ id: "prey", title: "Prey", gallery: "first", era: "Chasses anciennes", summary: "Dossier de Naru et du Feral Predator. La consultation reste distincte d’une future campagne humaine et Yautja.", masks: [m("feral", "Feral Predator", "/game/assets/v14/hunter-kit/masks/mask-feral-screen.webp")], archive: ["Biomask osseux", "Reconstitution de la proie à produire", "Journal du chasseur à produire"] }),
  entry({ id: "predator", title: "Predator", gallery: "first", era: "1987 · jungle", summary: "La chasse de Jungle Hunter et le groupe de Dutch. Le lieu précis et les faits de la campagne devront être documentés lors de sa production.", masks: [m("jungle", "Jungle Hunter")], archive: ["Dutch et son groupe", "Données du biomask", "Traces environnementales à reconstituer"] }),
  entry({ id: "predator-2", title: "Predator 2", gallery: "first", era: "Chasse urbaine", summary: "Le dossier de City Hunter et de Harrigan, séparé de la collection des trophées réellement acquis par ton chasseur.", masks: [m("city", "City Hunter")], archive: ["Harrigan", "Équipement de City Hunter", "Archives du vaisseau à produire"] }),
  entry({ id: "avp", title: "Alien vs. Predator", gallery: "great", era: "Rite antarctique", summary: "Trois niches pour Scar, Celtic et Chopper autour de la même chronique ; aucun des trois n’est réduit à une variante de l’autre.", masks: [m("celtic", "Celtic"), m("scar", "Scar"), m("chopper", "Chopper")], archive: ["Lex", "Épreuve du temple", "Les trois chasseurs"] }),
  entry({ id: "avp-requiem", title: "AVP Requiem", gallery: "great", era: "Intervention de Wolf", summary: "Le dossier de Wolf distingue les traces récupérées d’une reconstitution humaine. Aucun trophée n’est accordé par cette consultation.", masks: [m("wolf", "Wolf")], archive: ["Équipement de nettoyage", "Données du biomask", "Reconstitution de l’incident à produire"] }),
  entry({ id: "the-predator", title: "The Predator", gallery: "great", era: "Fugitive et Upgrade", summary: "Le masque de Fugitive accompagne un dossier séparé sur l’Upgrade Predator. Aucun biomask inconnu n’est inventé pour ce dernier.", masks: [m("fugitive", "Fugitive Predator"), m("upgrade", "Upgrade Predator · dossier sans masque", null)], archive: ["Fugitive Predator", "Upgrade Predator", "Pièces du laboratoire à documenter"] }),
  entry({ id: "predators", title: "Predators", gallery: "forbidden", era: "Réserve des Super Predators", summary: "Une galerie séparée conserve les traces des Super Predators ; elle ne les présente pas comme des héros honorés du clan.", masks: [m("berserker", "Berserker"), m("falconer", "Falconer", "/game/assets/v14/hunter-kit/masks/mask-falconer.webp"), m("tracker", "Tracker", null)], archive: ["Royce et les captifs", "Berserker, Falconer, Tracker", "Réserve de chasse à produire"] }),
  entry({ id: "badlands", title: "Badlands", gallery: "great", era: "Chronique de Dek", summary: "Le dossier de Dek possède sa propre alcôve. Sa place sur une chronologie interne n’est pas déduite de l’année de sortie du film.", masks: [m("dek", "Dek")], archive: ["Dek", "Campagne à produire", "Chronologie interne à documenter"] }),
  entry({ id: "jim-hopper", title: "Jim Hopper", gallery: "first", era: "Expédition antérieure", summary: "Projet de reconstitution de l’expédition de Hopper. Le responsable précis et le masque doivent être établis avant une illustration ou un lancement.", masks: [m("hopper-hunter", "Chasseur de l’expédition · attribution à vérifier", null)], archive: ["Jim Hopper et son expédition", "Reconstitution cérémonielle à documenter", "Aucun masque attribué par supposition"] }),
];
export const MAUSOLEUM_GALLERIES = [
  { id: "first", name: "Premières galeries", requiredRank: "unblooded", description: "Consultation des premiers dossiers ; le rang Young Blood ouvre l’étude rituelle." },
  { id: "great", name: "Grandes Chasses", requiredRank: "blooded", description: "Le véritable mausolée s’ouvre aux chasseurs reconnus." },
  { id: "forbidden", name: "Galerie interdite", requiredRank: "elite", description: "Archives adverses et réserves des Super Predators." },
  { id: "temporal", name: "Archives temporelles", requiredRank: "adjutant", description: "Extension Warp Universe à produire. Aucune campagne ni technologie canonique n’est affirmée ici." },
] as const;
const rankOrder: readonly ChronicleRankId[] = ["youngling", "unblooded", "young-blood", "blooded", "elite", "elder", "ancient"];
export interface MausoleumAccess { rank: ChronicleRankId; adjutant: boolean; preview: boolean }
export function mausoleumAccess(save: SaveGame | null): MausoleumAccess {
  return save ? { rank: save.prologue ? getChronicleRank(save.prologue.chronicle) ?? "youngling" : save.profile.rankId, adjutant: !!save.prologue && getChronicleFunctions(save.prologue.chronicle).includes("adjutant"), preview: false } : { rank: "youngling", adjutant: false, preview: true };
}
export function canVisitMausoleumGallery(access: MausoleumAccess, galleryId: string): boolean {
  const gallery = MAUSOLEUM_GALLERIES.find(value => value.id === galleryId);
  if (!gallery) return false;
  if (access.preview) return true;
  return gallery.requiredRank === "adjutant" ? access.adjutant : rankOrder.indexOf(access.rank) >= rankOrder.indexOf(gallery.requiredRank);
}
export function canConsultMausoleum(access: MausoleumAccess, entryId: string): boolean {
  const chronicle = MAUSOLEUM_CHRONICLES.find(value => value.id === entryId);
  return !!chronicle && !access.preview && canVisitMausoleumGallery(access, chronicle.gallery) && rankOrder.indexOf(access.rank) >= rankOrder.indexOf("young-blood");
}
export interface MausoleumProgress { version: 1; examinedIds: string[]; consultedIds: string[] }
export const defaultMausoleumProgress = (): MausoleumProgress => ({ version: 1, examinedIds: [], consultedIds: [] });
export function normalizeMausoleumProgress(value: unknown): MausoleumProgress {
  const clean = defaultMausoleumProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return clean;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return clean;
  const ids = new Set(MAUSOLEUM_CHRONICLES.map(entry => entry.id));
  for (const key of ["examinedIds", "consultedIds"] as const) if (Array.isArray(v[key])) clean[key] = [...new Set(v[key].filter((id): id is string => typeof id === "string" && ids.has(id)))];
  clean.examinedIds = [...new Set([...clean.examinedIds, ...clean.consultedIds])];
  return clean;
}
export function recordMausoleumVisit(progress: unknown, id: string, kind: "examined" | "consulted", access: MausoleumAccess): MausoleumProgress {
  const next = normalizeMausoleumProgress(progress), chronicle = MAUSOLEUM_CHRONICLES.find(value => value.id === id);
  if (!chronicle || access.preview || !canVisitMausoleumGallery(access, chronicle.gallery) || kind === "consulted" && !canConsultMausoleum(access, id)) return next;
  if (!next.examinedIds.includes(id)) next.examinedIds.push(id);
  if (kind === "consulted" && !next.consultedIds.includes(id)) next.consultedIds.push(id);
  return next;
}

/** Installed content must supply its own executable adapter and durable run; Pit duels never satisfy this contract. */
export interface MausoleumDlcAdapter {
  chronicleId: string; installed: boolean; owned: boolean; campaignVersion: string;
  status: "ready" | "completed" | "mastered";
  start(ticket: MausoleumReturnTicket): Promise<{ started: boolean; reason?: string }>;
}
export interface MausoleumReturnTicket { ownerCreatedAt: string; chronicleId: string; galleryId: string; actorX: number; source: "homeworld" | "menu" }
export const MAUSOLEUM_INSTALLED_CAMPAIGNS: readonly MausoleumDlcAdapter[] = [];
export function mausoleumDlcState(id: string, adapters: readonly MausoleumDlcAdapter[] = MAUSOLEUM_INSTALLED_CAMPAIGNS): "unavailable" | "ready" | "completed" | "mastered" {
  const adapter = adapters.find(item => item.chronicleId === id);
  return MAUSOLEUM_CHRONICLES.some(item => item.id === id) && adapter?.installed && adapter.owned && adapter.campaignVersion.trim() && typeof adapter.start === "function" ? adapter.status : "unavailable";
}
export async function launchMausoleumChronicle(ticket: MausoleumReturnTicket, access: MausoleumAccess, persistReturn: (ticket: MausoleumReturnTicket) => boolean, adapters: readonly MausoleumDlcAdapter[] = MAUSOLEUM_INSTALLED_CAMPAIGNS) {
  const chronicle = MAUSOLEUM_CHRONICLES.find(item => item.id === ticket.chronicleId);
  if (!chronicle || ticket.galleryId !== chronicle.gallery || !ticket.ownerCreatedAt || !Number.isFinite(ticket.actorX) || ticket.actorX < 40 || ticket.actorX > 860 || !canConsultMausoleum(access, ticket.chronicleId)) return { started: false, reason: "Accès ou point de retour invalide." };
  const adapter = adapters.find(item => item.chronicleId === ticket.chronicleId);
  if (!adapter || mausoleumDlcState(ticket.chronicleId, adapters) === "unavailable") return { started: false, reason: chronicle.unavailableReason };
  if (!persistReturn({ ...ticket })) return { started: false, reason: "Point de retour non sauvegardé. Aucun DLC lancé." };
  try { return await adapter.start({ ...ticket }); } catch { return { started: false, reason: "Démarrage non confirmé. Le retour au piédestal reste conservé." }; }
}
export const MAUSOLEUM_RITUAL_PHASES = ["take", "inspect", "wear", "boot", "archive", "remove", "replace"] as const;
export type MausoleumRitualPhase = typeof MAUSOLEUM_RITUAL_PHASES[number];
export const MAUSOLEUM_PHASE_LABELS: Record<MausoleumRitualPhase, string> = { take: "Saisie de la reproduction d’étude", inspect: "Examen du biomask", wear: "Connexion au masque d’étude", boot: "Initialisation des archives de chasse", archive: "Consultation du dossier · aucune campagne lancée", remove: "Déconnexion du masque", replace: "Repose de la reproduction d’étude" };
