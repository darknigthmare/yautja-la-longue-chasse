import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { inspectClanShipDocking } from "./clanShipDocking";
import type { ClanShipNpcId } from "./clanShipOperations";
import { tribunalAccessV147 } from "./honorTribunalV147";
import { shipAcquisitionOwnedHullV89 } from "./shipAcquisitionV89";

export type ClanHullPledgeV171 = "shared-watch" | "personal";
export type ClanHullProjectV171 = {
  version: 1;
  ownerCreatedAt: string;
  hullInstanceId: string;
  revision: number;
  inspected: boolean;
  consultations: number;
  pledge: ClanHullPledgeV171 | null;
};
export type ClanHullProjectCommandV171 = { expectedRevision: number } & (
  { type: "inspect" } | { type: "consult" } | { type: "pledge"; pledge: ClanHullPledgeV171 }
);
export type ClanHullProjectResponseV171 = { ok: boolean; message: string };
type Result = ({ ok: true; state: ClanHullProjectV171 } | { ok: false }) & { message: string };
type Inspection = { status: "absent" | "valid" | "invalid-save" | "future-version"; state: ClanHullProjectV171 | null };
type HullSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "tribunalV147" |
  "shipAcquisitionV89" | "clanShipDocking" | "clanHullProjectV171">;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const pledge = (value: unknown): value is ClanHullPledgeV171 => value === "shared-watch" || value === "personal";

export const CLAN_HULL_CONTACTS = [
  { id: "threshold-guard", roomId: "hangar", mask: 1, name: "Garde du Seuil",
    reply: "Les deux ponts resteront sous scellés jusqu’à leur réception. L’accès au hangar ne donne aucun droit sur eux." },
  { id: "star-watch", roomId: "conseil", mask: 2, name: "Veille des Astres",
    reply: "La Veille Partagée demande un équipage et un mandat. Tu peux aussi continuer sur la coque personnelle qui t’a été remise." },
] as const;

export const CLAN_HULL_PLEDGE_LABELS: Record<ClanHullPledgeV171, string> = {
  "shared-watch": "Viser la Veille Partagée",
  personal: "Conserver le vaisseau personnel",
};

export function inspectClanHullProject(raw: unknown, owner: string): Inspection {
  if (raw == null) return { status: "absent", state: null };
  const invalid = { status: "invalid-save", state: null } as const;
  if (!record(raw) || !owner || raw.ownerCreatedAt !== owner) return invalid;
  if (typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 1) return { status: "future-version", state: null };
  if (raw.version !== 1 || Object.keys(raw).length !== 7 || typeof raw.hullInstanceId !== "string" ||
      raw.hullInstanceId.length === 0 || raw.hullInstanceId.length > 256 || raw.inspected !== true ||
      (raw.consultations !== 0 && raw.consultations !== 1 && raw.consultations !== 2 && raw.consultations !== 3) ||
      (raw.pledge !== null && (!pledge(raw.pledge) || raw.consultations !== 3))) return invalid;
  const { consultations } = raw;
  const revision = 1 + Number((consultations & 1) !== 0) + Number((consultations & 2) !== 0) + Number(raw.pledge !== null);
  if (raw.revision !== revision) return invalid;
  return { status: "valid", state: { version: 1, ownerCreatedAt: owner, hullInstanceId: raw.hullInstanceId,
    revision, inspected: true, consultations, pledge: raw.pledge } };
}

export function clanHullProjectMatchesOwnedHull(raw: ClanHullProjectV171 | null, shipAcquisition: unknown, owner: string): boolean {
  return raw === null || shipAcquisitionOwnedHullV89(shipAcquisition, owner)?.instanceId === raw.hullInstanceId;
}

export function isClanHullProjectSuccessor(before: ClanHullProjectV171, next: ClanHullProjectV171): boolean {
  return before.ownerCreatedAt === next.ownerCreatedAt && before.hullInstanceId === next.hullInstanceId &&
    next.revision === before.revision + 1 && !before.pledge && (next.consultations & before.consultations) === before.consultations;
}

function currentHullAccess(save: HullSave) {
  const docking = inspectClanShipDocking(save.clanShipDocking, save.createdAt).state;
  const receipt = shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
  if (!receipt || docking?.status !== "aboard" || docking.personalShipId !== receipt.shipId) return null;
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  if (rank !== "elite" && rank !== "elder" && rank !== "ancient") return null;
  return tribunalAccessV147(save.tribunalV147).clanShip ? { room: docking.roomId, instanceId: receipt.instanceId } : null;
}

export function canReviewClanHullProject(save: HullSave): boolean {
  return currentHullAccess(save) !== null;
}

export function commitClanHullProject(save: HullSave, command: ClanHullProjectCommandV171, contact: ClanShipNpcId | null): Result {
  const fail = (message: string): Result => ({ ok: false, message });
  const access = currentHullAccess(save);
  if (!access) return fail("Le projet se consulte à bord après la reconnaissance Elite et l’acquisition de ta coque.");
  const inspected = inspectClanHullProject(save.clanHullProjectV171, save.createdAt);
  if (inspected.status !== "absent" && inspected.status !== "valid") return fail("Le registre du projet est incompatible.");
  const before = inspected.state;
  if (command.expectedRevision !== (before?.revision ?? 0) || before && before.hullInstanceId !== access.instanceId) {
    return fail("Relis le dernier état du projet avant de reprendre.");
  }
  if (before?.pledge) return fail("L’intention a déjà été consignée.");
  if (command.type === "inspect") {
    if (access.room !== "hangar" || before) return fail("Les scellés se lisent au poste du hangar.");
    return { ok: true, message: "Les deux ponts du chantier restent sous scellés.", state: {
      version: 1, ownerCreatedAt: save.createdAt, hullInstanceId: access.instanceId,
      revision: 1, inspected: true, consultations: 0, pledge: null,
    } };
  }
  if (!before) return fail("Consulte les scellés au poste du hangar.");
  if (command.type === "consult") {
    const holder = CLAN_HULL_CONTACTS.find(entry => entry.id === contact && entry.roomId === access.room);
    if (!holder || (before.consultations & holder.mask) !== 0) return fail("Présente-toi au détenteur des droits dans sa salle.");
    return { ok: true, message: holder.reply,
      state: { ...before, revision: before.revision + 1, consultations: before.consultations | holder.mask } };
  }
  if (command.type !== "pledge" || !pledge(command.pledge) || access.room !== "conseil" || before.consultations !== 3) {
    return fail("Après les deux entretiens, consigne ton intention au conseil.");
  }
  return { ok: true, message: "Le conseil a enregistré ton choix.",
    state: { ...before, revision: before.revision + 1, pledge: command.pledge } };
}
