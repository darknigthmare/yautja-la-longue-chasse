import type { BiomaskId } from "./types";

export interface BiomaskImagePlacement { x: number; y: number; width: number; height: number }

export const REFERENCE_BIOMASKS_V62 = [
  {"id":"jungle","label":"Jungle Hunter","work":"Predator (1987)","placement":{"x":110.15825,"y":20.61292,"width":80.45338,"height":80.45338}},
  {"id":"city","label":"City Hunter","work":"Predator 2 (1990)","placement":{"x":105.625,"y":18.15278,"width":87.08333,"height":87.08333}},
  {"id":"scar","label":"Scar","work":"Alien vs. Predator (2004)","placement":{"x":111.11469,"y":20.14948,"width":80.79897,"height":80.79897}},
  {"id":"celtic","label":"Celtic","work":"Alien vs. Predator (2004)","placement":{"x":110.45116,"y":21.82368,"width":77.85596,"height":77.85596}},
  {"id":"chopper","label":"Chopper","work":"Alien vs. Predator (2004)","placement":{"x":111.28723,"y":20.94681,"width":80.04255,"height":80.04255}},
  {"id":"wolf","label":"Wolf","work":"Aliens vs. Predator: Requiem (2007)","placement":{"x":107.46644,"y":22.11577,"width":78.90101,"height":78.90101}},
  {"id":"feral","label":"Feral","work":"Prey (2022)","placement":{"x":116.99646,"y":15.92035,"width":64.3646,"height":64.3646}},
  {"id":"boar","label":"Boar","work":"Predator 2 · interprétation NECA","placement":{"x":107.00809,"y":18.04178,"width":84.50135,"height":84.50135}},
  {"id":"snake","label":"Snake","work":"Predator 2 · interprétation NECA","placement":{"x":107.74648,"y":19.40669,"width":82.79049,"height":82.79049}},
  {"id":"falconer","label":"Falconer","work":"Predators (2010)","placement":{"x":110.75,"y":22.125,"width":78.375,"height":78.375}},
  {"id":"berserker","label":"Berserker","work":"Predators (2010)","placement":{"x":107.375,"y":21.125,"width":78.375,"height":78.375}},
  {"id":"fugitive","label":"Fugitive","work":"The Predator (2018)","placement":{"x":109.28112,"y":20.98927,"width":80.72961,"height":80.72961}},
  {"id":"dek","label":"Dek · armure d’entraînement","work":"Predator: Badlands (2025) · NECA","placement":{"x":107.91153,"y":19.01056,"width":82.79049,"height":82.79049}},
  {"id":"enforcer","label":"Enforcer","work":"Predator: Bad Blood · interprétation NECA","placement":{"x":97.39138,"y":1.90643,"width":97.95281,"height":97.95281}},
] as const;

export function referenceBiomaskV62(maskId: BiomaskId) {
  return REFERENCE_BIOMASKS_V62.find((mask) => mask.id === maskId) ?? null;
}

export function referenceBiomaskPathV62(maskId: BiomaskId): string | null {
  return referenceBiomaskV62(maskId) ? `/game/sprites/v62/masks/${maskId}.png` : null;
}

/** Original project designs are retained under their own names, never canon identities. */
export const PRESERVED_BIOMASKS_V62 = [
  { id: "clan-voile-argent", label: "Voile d’argent", legacyMaskId: "jungle", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-cuivre-remparts", label: "Cuivre des Remparts", legacyMaskId: "city", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-entrelacs-forge", label: "Entrelacs de la Forge", legacyMaskId: "celtic", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-os-grave", label: "Os gravé", legacyMaskId: "feral", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-cendre-balafree", label: "Cendre balafrée", legacyMaskId: "scar", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-arete-acier", label: "Arête d’acier", legacyMaskId: "chopper", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-veilleur-cendres", label: "Veilleur des Cendres", legacyMaskId: "wolf", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-carapace-sombre", label: "Carapace sombre", legacyMaskId: "berserker", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-filigrane-cuivre", label: "Filigrane de cuivre", legacyMaskId: "fugitive", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-patine-dunes", label: "Patine des Dunes", legacyMaskId: "dek", detail: "Création originale du clan · ancienne coque V3 conservée" },
  { id: "clan-gardien-ivoire", label: "Gardien d’ivoire", legacyMaskId: "enforcer", detail: "Création originale du clan · ancienne coque V3 conservée" },
] as const;

export function preservedBiomaskV62(maskId: BiomaskId) {
  return PRESERVED_BIOMASKS_V62.find((mask) => mask.id === maskId) ?? null;
}

export const PRESERVED_FERAL_GALLERY_V62 = Object.freeze({
  id: "mask-feral-screen",
  name: "Crâne du Ravin · création originale",
  work: "La Longue Chasse · interprétation originale non canonique",
  runtimeUrl: "/game/assets/v14/hunter-kit/masks/mask-feral-screen.webp",
  note: "Ancienne étude V14 conservée intacte. Sa silhouette n’est pas celle du biomask de Feral dans Prey.",
});
