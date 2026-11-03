/** Références Alien Base — instantané public limité aux films et identités.
 * Le registre privé fait autorité pour les ajouts validés ; aucune information
 * de gameplay, visuel tiers ou contenu d'un dépôt privé n'est importée.
 * Ne pas créer d'ennemis rencontrables à partir de ce registre documentaire.
 * Alignement identifiants: Alien_base PR #4 (entities.v1.json).
 */
export const ALIEN_BASE_ARCHIVE_SOURCE_V1 = "darknigthmare/alien_base@feat/alien-universe-registry-v1" as const;
export const ALIEN_BASE_ARCHIVE_V1 = Object.freeze([
  {
    "id": "bio.xenomorph.ovomorph",
    "name": "Ovomorphe / œuf",
    "work": "Alien (1979)",
    "role": "Cycle parasitaire",
    "description": "Contient le parasite. Le film montre son ouverture à proximité d’un hôte.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/alien",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  },
  {
    "id": "bio.xenomorph.facehugger",
    "name": "Facehugger",
    "work": "Alien (1979)",
    "role": "Parasite",
    "description": "Stade qui s’agrippe au visage pour implanter un embryon.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/alien",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  },
  {
    "id": "bio.xenomorph.chestburster",
    "name": "Chestburster",
    "work": "Alien (1979)",
    "role": "Stade juvénile",
    "description": "Émerge d’un hôte ; n’est pas une caste Burster de Fireteam Elite.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/alien",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  },
  {
    "id": "bio.xenomorph.drone",
    "name": "Adulte de 1979 · Big Chap",
    "work": "Alien (1979)",
    "role": "Morphologie adulte",
    "description": "Silhouette biomécanique à crâne lisse. L’identité centrale Drone reste à désambiguïser selon les œuvres.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/alien",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  },
  {
    "id": "bio.xenomorph.warrior",
    "name": "Adulte nervuré · guerrier",
    "work": "Aliens (1986)",
    "role": "Morphologie adulte",
    "description": "Morphologie nervurée de la couvée montrée dans Aliens ; pas une évolution obligatoire du Drone.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/aliens",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  },
  {
    "id": "bio.xenomorph.queen",
    "name": "Reine xénomorphe",
    "work": "Aliens (1986)",
    "role": "Reproduction",
    "description": "Reproductrice associée à une couvée mature ; ponte dans une chambre d’œufs.",
    "sourceUrl": "https://www.20thcenturystudios.com/movies/aliens",
    "status": "reference-only",
    "encounterId": null,
    "visualFidelity": "not-certified"
  }
] as const);
export function findAlienBaseArchiveRecord(id: string) {
  return ALIEN_BASE_ARCHIVE_V1.find(entry => entry.id === id) ?? null;
}
