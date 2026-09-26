import type { PitArenaId } from "./pitCombat";

/** Original exhibition links between existing modular art kits, not canonical geography.
 * All routes keep the existing 960x540 neutral collision floor, one transfer per round.
 * Never rename a published id: replay rules persist it verbatim.
 */
export const PIT_STAGE_JOURNEY_ROUTES = [
  { id: "reserve-passage-v1", entry: "arena-019-porte-des-reserves", destination: "arena-011-reserve-des-crocs",
    label: "Sas → cour des Réserves", entryLabel: "SAS", destinationLabel: "COUR DES RÉSERVES", release: "V42" },
  { id: "convoy-quay-passage-v1", entry: "arena-021-marche-du-convoi", destination: "arena-080-dernier-quai",
    label: "Convoi → Dernier Quai", entryLabel: "CONVOI", destinationLabel: "DERNIER QUAI", release: "V52" },
  { id: "shipyard-hold-passage-v1", entry: "arena-033-chantier-des-motherships", destination: "arena-048-cale-du-vaisseau-perdu",
    label: "Chantier → cale du Vaisseau Perdu", entryLabel: "CHANTIER", destinationLabel: "CALE DU VAISSEAU PERDU", release: "V52" },
  { id: "archive-echoes-passage-v1", entry: "arena-034-archive-interdite", destination: "arena-061-chambre-des-echos",
    label: "Archive Interdite → chambre des Échos", entryLabel: "ARCHIVE INTERDITE", destinationLabel: "CHAMBRE DES ÉCHOS", release: "V52" },
  { id: "marsh-mangrove-passage-v1", entry: "arena-037-ecluse-des-marais", destination: "arena-031-c-ur-de-mangrove",
    label: "Écluse des Marais → cœur de Mangrove", entryLabel: "ÉCLUSE DES MARAIS", destinationLabel: "CŒUR DE MANGROVE", release: "V52" },
  { id: "forge-foundry-passage-v1", entry: "arena-010-forge-des-lames-muettes", destination: "arena-040-fonderie-zero",
    label: "Forge des Lames Muettes → Fonderie Zéro", entryLabel: "FORGE DES LAMES MUETTES", destinationLabel: "FONDERIE ZÉRO", release: "V53" },
  { id: "ravine-nest-passage-v1", entry: "arena-023-ravin-des-planeurs", destination: "arena-026-nid-des-razorwings",
    label: "Ravin des Planeurs → nid des Razorwings", entryLabel: "RAVIN DES PLANEURS", destinationLabel: "NID DES RAZORWINGS", release: "V53" },
  { id: "steam-reactor-passage-v1", entry: "arena-024-caverne-des-vapeurs", destination: "arena-043-reacteur-de-basalte",
    label: "Caverne des Vapeurs → réacteur de Basalte", entryLabel: "CAVERNE DES VAPEURS", destinationLabel: "RÉACTEUR DE BASALTE", release: "V53" },
  { id: "crypt-necropolis-passage-v1", entry: "arena-029-crypte-du-disciple", destination: "arena-039-necropole-des-chasseurs",
    label: "Crypte du Disciple → nécropole des Chasseurs", entryLabel: "CRYPTE DU DISCIPLE", destinationLabel: "NÉCROPOLE DES CHASSEURS", release: "V53" },
  { id: "oath-mediation-passage-v1", entry: "arena-045-galerie-des-serments", destination: "arena-076-atrium-des-mediateurs",
    label: "Galerie des Serments → atrium des Médiateurs", entryLabel: "GALERIE DES SERMENTS", destinationLabel: "ATRIUM DES MÉDIATEURS", release: "V53" },
  { id: "beacon-ridge-passage-v1", entry: "arena-066-balise-de-rabattage", destination: "arena-032-dorsale-du-sandmaw",
    label: "Balise de Rabattage → dorsale du Sandmaw", entryLabel: "BALISE DE RABATTAGE", destinationLabel: "DORSALE DU SANDMAW", release: "V53" },
  { id: "navigator-starmap-passage-v1", entry: "arena-014-cour-des-navigateurs", destination: "arena-079-salle-des-routes-stellaires",
    label: "Cour des Navigateurs → salle des Routes Stellaires", entryLabel: "COUR DES NAVIGATEURS", destinationLabel: "SALLE DES ROUTES STELLAIRES", release: "V53" },
  { id: "audience-throne-passage-v1", entry: "arena-050-porte-de-l-audience", destination: "arena-020-trone-fracture",
    label: "Porte de l’Audience → Trône Fracturé", entryLabel: "PORTE DE L’AUDIENCE", destinationLabel: "TRÔNE FRACTURÉ", release: "V53" },
] as const satisfies readonly { id: string; entry: PitArenaId; destination: PitArenaId; label: string; entryLabel: string; destinationLabel: string; release: string }[];
export type PitStageJourneyId = typeof PIT_STAGE_JOURNEY_ROUTES[number]["id"];
export type PitStageJourneyDefinition = typeof PIT_STAGE_JOURNEY_ROUTES[number];
export function getPitStageJourneyDefinition(id: unknown): PitStageJourneyDefinition | undefined {
  return typeof id === "string" ? PIT_STAGE_JOURNEY_ROUTES.find(route => route.id === id) : undefined;
}
export function getPitStageJourneyForArena(arenaId: PitArenaId): PitStageJourneyDefinition | undefined {
  return PIT_STAGE_JOURNEY_ROUTES.find(route => route.entry === arenaId);
}
export function isPitStageJourneyForArena(id: unknown, arenaId: unknown): id is PitStageJourneyId {
  const route = getPitStageJourneyDefinition(id);
  return Boolean(route && route.entry === arenaId);
}
