export const W3_S14_RECEIPT_MAX_BYTES = 16 * 1024;
export const W3_S14_DOSSIER_PREFIX = "yautja:w3-s14:dossier-v1:";

export interface W3S14ReceiptBody {
  version: 1;
  siteId: "W3-S14";
  roomId: string;
  sourceSha: string;
  checkpointSha: string;
  revision: number;
  outcome: "won" | "lost" | "declined";
  winner: string | null;
  declinedBy: string | null;
  player: number;
  rival: number;
  round: number;
  signatures: string[];
  challenger: string;
  rivalMember: string;
  role: "challenger" | "rival";
  ownerDigest: string;
}

export interface W3S14SignedReceipt {
  body: W3S14ReceiptBody;
  signature: string;
}

const bodyKeys = [
  "version", "siteId", "roomId", "sourceSha", "checkpointSha", "revision", "outcome",
  "winner", "declinedBy", "player", "rival", "round", "signatures", "challenger", "rivalMember",
  "role", "ownerDigest",
] as const satisfies readonly (keyof W3S14ReceiptBody)[];
const hex = /^[a-f0-9]{64}$/;
const room = /^W3-S14-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const shortBase64 = /^[A-Za-z0-9_-]+$/;
const encoder = new TextEncoder();

export function w3s14OwnerMaterial(ownerCreatedAt: string): string {
  // Saved owners compare exact bytes. Older valid dates need not use current ISO formatting.
  if (!Number.isFinite(Date.parse(ownerCreatedAt))) {
    throw new Error("Identité temporelle du créneau de campagne illisible.");
  }
  return "yautja:w3-s14:campaign-owner/v1\0" + ownerCreatedAt;
}

export async function w3s14OwnerDigest(ownerCreatedAt: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(w3s14OwnerMaterial(ownerCreatedAt)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** An ordered tuple prevents key order, pretty printing or property aliases from changing the signed meaning. */
export function canonicalW3S14Receipt(body: W3S14ReceiptBody): string {
  return JSON.stringify(["yautja:w3-s14:receipt/v1", ...bodyKeys.map(key => body[key])]);
}

function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)));
}

function digest(value: unknown): value is string {
  return typeof value === "string" && hex.test(value);
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function validBody(body: unknown): body is W3S14ReceiptBody {
  if (!record(body, bodyKeys) || body.version !== 1 || body.siteId !== "W3-S14" ||
      typeof body.roomId !== "string" || !room.test(body.roomId) ||
      !digest(body.sourceSha) || !digest(body.checkpointSha) || !digest(body.ownerDigest) ||
      !integer(body.revision, 1, 2048) || !integer(body.round, 0, body.revision) ||
      !integer(body.player, 0, 3) || !integer(body.rival, 0, 3) ||
      (body.role !== "challenger" && body.role !== "rival") ||
      typeof body.challenger !== "string" || !/^operator:W3-S14:person-[1-9][0-9]*$/.test(body.challenger) ||
      typeof body.rivalMember !== "string" || !/^rival:person-[1-9][0-9]*$/.test(body.rivalMember) ||
      !Array.isArray(body.signatures) || body.signatures.length > 2 ||
      body.signatures.some(id => id !== body.challenger && id !== body.rivalMember) ||
      new Set(body.signatures).size !== body.signatures.length) return false;

  if (body.outcome === "declined") {
    return body.winner === null && body.player > 0 && body.rival > 0 &&
      (body.declinedBy === body.challenger || body.declinedBy === body.rivalMember);
  }
  if (body.declinedBy !== null || body.signatures.length !== 2) return false;
  if (body.outcome === "won") return body.winner === body.challenger && body.rival === 0 && body.player > 0 && body.round % 2 === 1;
  return body.outcome === "lost" && body.winner === body.rivalMember && body.player === 0 && body.rival > 0 &&
    body.round > 0 && body.round % 2 === 0;
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!shortBase64.test(value)) throw new Error("Base64url invalide.");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
  if (btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") !== value) {
    throw new Error("Base64url non canonique.");
  }
  return bytes;
}

/** The pinned SPKI key comes from the configured game, never from the submitted document. */
export async function verifyW3S14Receipt(raw: unknown, trustedKey: string, ownerCreatedAt: string,
  expectedSourceSha: string): Promise<W3S14SignedReceipt | null> {
  if (!record(raw, ["body", "signature"]) || !validBody(raw.body) || raw.body.sourceSha !== expectedSourceSha ||
      typeof raw.signature !== "string" || raw.signature.length !== 86 || trustedKey.length !== 59) return null;
  try {
    if (raw.body.ownerDigest !== await w3s14OwnerDigest(ownerCreatedAt)) return null;
    const key = await crypto.subtle.importKey("spki", decode(trustedKey), "Ed25519", false, ["verify"]);
    const valid = await crypto.subtle.verify("Ed25519", key, decode(raw.signature), encoder.encode(canonicalW3S14Receipt(raw.body)));
    return valid ? {body: raw.body, signature: raw.signature} : null;
  } catch {
    return null;
  }
}
