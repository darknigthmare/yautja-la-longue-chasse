/**
 * V147 Chenil des Pisteurs (CITY-28): adoption, choice of the next hunting
 * hound and care of a wounded hound. Identities come from the companion
 * catalogue and a fallen identity is never offered again (CORE-R17).
 *
 * The campaign caller saves the roster and the clan-mark balance together.
 */
import catalogue from "../data/companionCatalogueV56.json";
import residentArt from "../../../public/game/companions/actors-v1/manifest.json";
import type { ShipId } from "../shipCatalogue";
import { companionResidencePresence, type CompanionCampaign } from "./companionResidence";
import {
  HOUND_KENNEL_LOCATION_V147, HOUNDS_MAX_V147, activeHoundV147, emptyHuntingHoundsV147,
  healHoundAtKennelV147, recruitHoundV147, selectHoundForHuntV147,
  type HoundChangeV147, type HoundRefusalV147, type HuntingHoundsV147,
} from "./huntingHoundsV147";

/** Street contacts (V84 cast) that stand at the kennel. */
export const HOUND_KENNEL_CONTACT_IDS_V147 = Object.freeze(["urban-v84:kennel-return", "urban-v84:kennel-care"] as const);

export function isHoundKennelContactV147(contactId: unknown): boolean {
  return typeof contactId === "string" && (HOUND_KENNEL_CONTACT_IDS_V147 as readonly string[]).includes(contactId);
}

export interface HoundCatalogueEntryV147 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imagePath: string;
  readonly facing: "left" | "right";
  readonly width: number;
  readonly height: number;
  /** [left, top, right, bottom] of the opaque drawing inside the image. */
  readonly alphaBounds: readonly [number, number, number, number];
}

export const HOUND_CATALOGUE_V147: readonly HoundCatalogueEntryV147[] = Object.freeze(catalogue.entries.map(entry => Object.freeze({
  id: entry.id, name: entry.name, description: entry.description, imagePath: entry.imagePath,
  facing: entry.facing === "right" ? "right" as const : "left" as const,
  width: entry.width, height: entry.height,
  alphaBounds: [entry.alphaBounds[0], entry.alphaBounds[1], entry.alphaBounds[2], entry.alphaBounds[3]] as const,
})));

export const BRECHE_HOUND_ID_V147 = "breche";
const BRECHE_ROSTER_ID = "resident-breche";

const brecheArt = residentArt.assets.find(asset => asset.key === BRECHE_HOUND_ID_V147)!;
const breche = Object.freeze<HoundCatalogueEntryV147>({
  id: BRECHE_HOUND_ID_V147, name: brecheArt.label, imagePath: brecheArt.src,
  description: "Hell-Hound recueilli à Oseris-IV, avec sa crête asymétrique et ses pointes dorsales.",
  facing: brecheArt.nativeFacing === "right" ? "right" : "left",
  width: brecheArt.sourceWidth, height: brecheArt.sourceHeight,
  alphaBounds: [brecheArt.alphaBounds.x, brecheArt.alphaBounds.y,
    brecheArt.alphaBounds.x + brecheArt.alphaBounds.width, brecheArt.alphaBounds.y + brecheArt.alphaBounds.height],
});

export function houndCatalogueEntryV147(catalogueId: unknown): HoundCatalogueEntryV147 | null {
  if (catalogueId === BRECHE_HOUND_ID_V147) return breche;
  return typeof catalogueId === "string" ? HOUND_CATALOGUE_V147.find(entry => entry.id === catalogueId) ?? null : null;
}

/** The actual rescue, completed refit and current personal hull authorize field registration. */
export function brecheAdmittedV147(save: CompanionCampaign, shipId: ShipId): boolean {
  return companionResidencePresence(save, { kind: "personal", shipId }).some(entry =>
    entry.id === BRECHE_HOUND_ID_V147 && (entry.availability === "ready" || entry.availability === "recovering"));
}

export function activeKennelHoundV147(save: CompanionCampaign, shipId: ShipId) {
  const hound = activeHoundV147(save.houndsV147);
  return hound?.catalogueId === BRECHE_HOUND_ID_V147 && !brecheAdmittedV147(save, shipId) ? null : hound;
}

export type KennelCandidateStatusV147 = "available" | "recruited" | "fallen";

export interface KennelCandidateV147 extends HoundCatalogueEntryV147 {
  readonly status: KennelCandidateStatusV147;
}

/** Every catalogue identity with what the kennel can still do with it. */
export function kennelCandidatesV147(
  state: HuntingHoundsV147 | null | undefined, brecheAdmitted = false,
): KennelCandidateV147[] {
  const hounds = state?.hounds ?? [];
  const entries = brecheAdmitted || hounds.some(hound => hound.catalogueId === BRECHE_HOUND_ID_V147)
    ? [...HOUND_CATALOGUE_V147, breche] : HOUND_CATALOGUE_V147;
  return entries.map(entry => {
    const id = entry.id === BRECHE_HOUND_ID_V147 ? BRECHE_ROSTER_ID : entry.id;
    const hound = hounds.find(candidate => candidate.id === id || candidate.catalogueId === entry.id);
    return { ...entry, status: !hound ? "available" : hound.condition === "dead" ? "fallen" : "recruited" };
  });
}

export type KennelRefusalV147 = HoundRefusalV147 | "unknown-identity" | "invalid-name" |
  "insufficient-clan-marks" | "breche-campaign-required";

export type HoundKennelActionV147 =
  | { type: "recruit"; catalogueId: string; name: string }
  | { type: "choose"; houndId: string | null }
  | { type: "heal"; houndId: string };

type KennelSaveChangeV147 =
  | { ok: true; houndsV147: HuntingHoundsV147; clanMarks: number; message: string }
  | { ok: false; reason: KennelRefusalV147 };

export const HOUND_KENNEL_ADOPTION_PRICE_V147 = 12;

export type KennelChangeV147 =
  | { readonly ok: true; readonly state: HuntingHoundsV147 }
  | { readonly ok: false; readonly reason: KennelRefusalV147 };

export const HOUND_NAME_MAX_V147 = 40;

/** Trimmed display name, or null when nothing usable was typed. */
export function normalizeHoundNameV147(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, HOUND_NAME_MAX_V147).trim();
  return name ? name : null;
}

/**
 * Recruits the catalogue identity `catalogueId` at the kennel. The first
 * recruited hound becomes the one chosen for the next hunt when none is.
 */
export function recruitAtKennelV147(
  state: HuntingHoundsV147 | null | undefined,
  input: { catalogueId: string; name?: string | null; locationId: string },
  brecheAdmitted = false,
): KennelChangeV147 {
  if (input.locationId !== HOUND_KENNEL_LOCATION_V147) return { ok: false, reason: "not-at-kennel" };
  if (input.catalogueId === BRECHE_HOUND_ID_V147 && !brecheAdmitted) {
    return { ok: false, reason: "breche-campaign-required" };
  }
  const entry = houndCatalogueEntryV147(input.catalogueId);
  if (!entry) return { ok: false, reason: "unknown-identity" };
  const name = entry.id === BRECHE_HOUND_ID_V147 || input.name == null || input.name === ""
    ? entry.name : normalizeHoundNameV147(input.name);
  if (!name) return { ok: false, reason: "invalid-name" };
  const base = state ?? emptyHuntingHoundsV147();
  const id = entry.id === BRECHE_HOUND_ID_V147 ? BRECHE_ROSTER_ID : entry.id;
  const existing = base.hounds.find(hound => hound.id === id || hound.catalogueId === entry.id);
  if (existing) return { ok: false, reason: existing.condition === "dead" ? "fallen-identity" : "already-recruited" };
  const recruited = recruitHoundV147(base, { id, name, catalogueId: entry.id });
  if (!recruited.ok) return recruited;
  if (recruited.state.activeHoundId !== undefined) return recruited;
  const chosen = selectHoundForHuntV147(recruited.state, id);
  return chosen.ok ? chosen : recruited;
}

/** Chooses the hound of the next hunt (or none) at the kennel. */
export function chooseAtKennelV147(
  state: HuntingHoundsV147 | null | undefined, houndId: string | null, locationId: string,
): KennelChangeV147 {
  if (locationId !== HOUND_KENNEL_LOCATION_V147) return { ok: false, reason: "not-at-kennel" };
  return selectHoundForHuntV147(state ?? emptyHuntingHoundsV147(), houndId);
}

/** Heals a wounded hound; refused anywhere else than the kennel. */
export function healAtKennelV147(
  state: HuntingHoundsV147 | null | undefined, houndId: string, locationId: string,
): HoundChangeV147 {
  return healHoundAtKennelV147(state ?? emptyHuntingHoundsV147(), houndId, locationId);
}

/** Calculate the complete change before the caller attempts a campaign write. */
export function applyKennelActionV147(
  save: { houndsV147?: HuntingHoundsV147 | null; profile: { clanMarks: number } },
  action: HoundKennelActionV147,
  locationId: string,
  brecheAdmitted = false,
): KennelSaveChangeV147 {
  if (locationId !== HOUND_KENNEL_LOCATION_V147) return { ok: false, reason: "not-at-kennel" };
  const current = save.houndsV147;
  const balance = save.profile.clanMarks;
  const id = action.type === "recruit" ? action.catalogueId : action.houndId;
  const needsAgreement = action.type === "recruit" ? id === BRECHE_HOUND_ID_V147
    : current?.hounds.some(hound => hound.id === id && hound.catalogueId === BRECHE_HOUND_ID_V147);
  if (needsAgreement && !brecheAdmitted) return { ok: false, reason: "breche-campaign-required" };
  const change = action.type === "recruit"
    ? recruitAtKennelV147(current, { ...action, locationId }, brecheAdmitted)
    : action.type === "choose"
      ? chooseAtKennelV147(current, action.houndId, locationId)
      : healAtKennelV147(current, action.houndId, locationId);
  if (!change.ok) return change;

  const price = action.type === "recruit" && id !== BRECHE_HOUND_ID_V147 ? HOUND_KENNEL_ADOPTION_PRICE_V147 : 0;
  if (price > 0 && (!Number.isSafeInteger(balance) || balance < price))
    return { ok: false, reason: "insufficient-clan-marks" };

  const houndsV147 = change.state;
  const recruitId = action.type === "recruit" && id === BRECHE_HOUND_ID_V147 ? BRECHE_ROSTER_ID : id;
  const hound = houndsV147.hounds.find(entry => entry.id === recruitId);
  if (action.type === "recruit") return {
    ok: true, houndsV147, clanMarks: balance - price,
    message: price ? `Adoption de ${hound!.name} confirmée. ${price} Marques de clan versées.`
      : "L’accord de Brèche est inscrit au registre de chasse.",
  };

  const message = action.type === "heal" ? `${hound!.name} est rétabli.`
    : hound ? `${hound.name} t’accompagnera à la prochaine chasse.` : "Aucun chien choisi pour la prochaine chasse.";
  return { ok: true, houndsV147, clanMarks: balance, message };
}

export function kennelRefusalTextV147(reason: KennelRefusalV147): string {
  switch (reason) {
    case "not-at-kennel": return "Rejoins le Chenil des Pisteurs pour cette demande.";
    case "unknown-identity": return "Cette créature ne figure pas au registre du chenil.";
    case "breche-campaign-required": return "Brèche doit avoir été recueilli et disposer de son habitat sur le vaisseau engagé.";
    case "invalid-name": return "Donne un nom lisible à ton chien.";
    case "insufficient-clan-marks": return `Cette adoption demande ${HOUND_KENNEL_ADOPTION_PRICE_V147} Marques de clan.`;
    case "already-recruited": return "Ce chien marche déjà avec toi.";
    case "fallen-identity": return "Ce chien est mort. Il ne revient pas.";
    case "roster-full": return `Le chenil ne te confie pas plus de ${HOUNDS_MAX_V147} chiens.`;
    case "dead": return "Ce chien est mort. Il ne revient pas.";
    case "wounded": return "Ce chien est blessé : fais-le soigner avant de l’emmener.";
    case "not-wounded": return "Ce chien n’a pas besoin de soins.";
    case "unknown-hound": return "Ce chien n’est pas des tiens.";
    case "invalid-id": return "Identité de chien invalide.";
  }
}
