import type { HomeworldRegionIdV68 } from "./homeworldRegionsV68";

type LocalName = { readonly name: string; readonly french: string };
type Clan = LocalName & { readonly communities: readonly LocalName[] };

const location = (name: string, french: string): LocalName => ({ name, french });

export const YAUTJA_HOME_CITY = location("Thar’kesh", "La Cité des Premiers Trophées");

// Bible de campagne, « Noms du classeur V6 ». Les dix noms de région ont été validés pour le jeu.
export const YAUTJA_HOME_REGIONS = {
  "ash-marches": location("Ash’kaar", "Marches de Cendre"),
  "glass-desert": location("Vhel-tor", "Désert de Verre"),
  "pillar-jungle": location("Dhu’saal", "Jungle des Piliers"),
  "luminous-marshes": location("Neth’yra", "Marais Luminescents"),
  "storm-chain": location("Krav’ul", "Chaîne des Orages"),
  "leviathan-coast": location("Thal-meq", "Côte des Léviathans"),
  "thermal-caves": location("Ghur’eth", "Grottes Thermiques"),
  "cold-crown": location("Ysk’aru", "Couronne Froide"),
  "first-city-ruins": location("Oth’kesar", "Ruines de la Première Cité"),
  "forbidden-reserve": location("Zhar’vos", "Réserve Interdite"),
} satisfies Record<HomeworldRegionIdV68, LocalName>;

// Les quartiers du classeur documentent les clans. Les hameaux visitables de V68 ont leur nom propre.
export const YAUTJA_CLANS = {
  CL1: { ...location("Kaar’dhun", "Maisons des Braises"), communities: [
    location("Vhor’akh", "La Cour des Fourneaux"), location("Ish’tuun", "Le Replat des Veilleurs"),
  ] },
  CL2: { ...location("Vhel’quaa", "Peuple des Citernes"), communities: [
    location("Quaa’tor", "Les Citernes Hautes"), location("Dhun’esh", "Le Seuil des Dunes"),
  ] },
  CL3: { ...location("Saal’veth", "Gardiens des Hautes Branches"), communities: [
    location("Nekh’ra", "Les Branches Entrelacées"), location("Arr’vigh", "La Couronne des Vigies"),
  ] },
  CL4: { ...location("Yra’thol", "Veilleurs des Eaux Calmes"), communities: [
    location("Oh’npiir", "Les Pilotis Calmes"), location("Thuq’lan", "La Confluence des Lanternes"),
  ] },
  CL5: { ...location("Krav’esh", "Veilleurs des Crêtes"), communities: [
    location("Ekh’ol", "Le Col des Échos"), location("Vhen’tar", "Les Tours du Vent"),
  ] },
  CL6: { ...location("Meq’tarr", "Maisons du Rivage"), communities: [
    location("Oss’ghaa", "La Jetée des Ossements"), location("Ek’umar", "Les Arches de l’Écume"),
  ] },
  CL7: { ...location("Ghur’aval", "Artisans de la Roche Chaude"), communities: [
    location("Unn’drak", "Les Forges Souterraines"), location("Sor’paal", "Le Palier des Sources"),
  ] },
  CL8: { ...location("Ysk’dhaan", "Maisons du Givre"), communities: [
    location("Kral’yth", "Le Cercle des Feux Bas"), location("Gl’ashar", "La Terrasse de Glace"),
  ] },
  CL9: { ...location("Oth’peyr", "Conservateurs des Anciennes Pierres"), communities: [
    location("Peyr’loth", "Les Pierres Levées"), location("Ogh’kerat", "La Cour des Cartographes"),
  ] },
  CL10: { ...location("Zhar’kenn", "Gardiens du Confinement"), communities: [
    location("Kenn’sul", "Le Seuil du Confinement"), location("Lhis’vhar", "Les Veilles de la Lisière"),
  ] },
  CL11: { ...location("Ruun’tal", "Flotte des Haltes Lointaines"), communities: [] },
  CL12: { ...location("Ekar’mand", "Pacte des Mandats Liés"), communities: [] },
  CL13: { ...location("Raq’nhom", "Cercle des Noms Rapportés"), communities: [] },
  CL14: { ...location("Ouhn’rhet", "Foyer des Retours"), communities: [] },
  CL15: { ...location("Gholl’ferr", "Ligue des Forges Fermées"), communities: [] },
} satisfies Record<string, Clan>;

export const YAUTJA_ORBITAL_CLANS: readonly LocalName[] = [
  YAUTJA_CLANS.CL11, YAUTJA_CLANS.CL12, YAUTJA_CLANS.CL13, YAUTJA_CLANS.CL14, YAUTJA_CLANS.CL15,
];

// Noms d’usage locaux créés pour les hameaux déjà jouables.
const settlements = {
  "ash-marches": { clan: "CL1", village: location("Vhor’taan", "Halte des Porte-Cendres") },
  "glass-desert": { clan: "CL2", village: location("Quaa’resh", "Village des Citernes") },
  "pillar-jungle": { clan: "CL3", village: location("Saal’nek", "Terrasses des Hautes Branches") },
  "luminous-marshes": { clan: "CL4", village: location("Yra’khen", "Veillée des Racines") },
  "storm-chain": { clan: "CL5", village: location("Vhen’kaal", "Refuge des Trois Vents") },
  "leviathan-coast": { clan: "CL6", village: location("Thal’korr", "Port des Marées Longues") },
  "thermal-caves": { clan: "CL7", village: location("Ghur’dran", "Enclave des Forges Basses") },
  "cold-crown": { clan: "CL8", village: location("Ysk’haal", "Halte des Hautes Neiges") },
  "first-city-ruins": { clan: "CL9", village: location("Oth’vaal", "Camp des Archives Scellées") },
  "forbidden-reserve": { clan: "CL10", village: location("Zhar’ghen", "Poste des Gardiens de Réserve") },
} satisfies Record<HomeworldRegionIdV68, { clan: keyof typeof YAUTJA_CLANS; village: LocalName }>;

const landmarks: Readonly<Partial<Record<string, LocalName>>> = {
  "throne-audience": location("Keth’var", "Citadelle · aile des audiences"),
  "training-hall": location("Rakh’taal", "Dojo des maîtres"),
  "memory-vault": location("Nhor’kesh", "Maison de la Mémoire"),
  "trophy-mausoleum": location("Dra’vok", "Mausolée des Grandes Chasses"),
  "rite-sanctum": location("Thesh’kar", "Sanctuaire des rites"),
  "enforcer-bastion": location("Vhar’keth", "Bastion des Enforcers"),
};

export const yautjaLocalLabel = ({ name, french }: LocalName) => `${name} · ${french}`;

export function homeworldRegionNames(regionId?: string | null) {
  if (!regionId || !Object.hasOwn(settlements, regionId)) return null;
  const id = regionId as HomeworldRegionIdV68;
  return { region: YAUTJA_HOME_REGIONS[id], village: settlements[id].village, clan: YAUTJA_CLANS[settlements[id].clan] };
}

export function homeworldLandmarkLabel(buildingId: string, fallback: string) {
  const landmark = Object.hasOwn(landmarks, buildingId) ? landmarks[buildingId] : undefined;
  return landmark ? yautjaLocalLabel(landmark) : fallback;
}
