/** CW130-NET-006 / 012 · Browser client of the Outer Ops authority bound to cloud accounts.
 * The server owns time, dispatch, incidents, recall and receipts; the client only reads
 * snapshots and submits numbered orders with the player's Supabase access token. */
import config from "../data/outerOpsAccountConfigV130.json";
import type { CloudSessionV71 } from "./cloudAccountRestV71";

export type OuterOpsOrderKindV130 = "start" | "incident" | "recall";
export interface OuterOpsOperationV130 {
  id: string; targetId: string; startedAt: number; dueAt: number; remainingMs: number;
  recall?: boolean; incident?: { passageId: string } | null;
}
export interface OuterOpsReceiptV130 { operationId: string; settledAt: number; report: { outcome?: string }; signature: string }
export interface OuterOpsStateV130 {
  clanId: string; revision: number; nextSequence: number; serverTime: number; rav: number;
  suggestedDispatch: { targetId: string; teamIds: string[]; focus: string } | null;
  teams: Array<{ id: string; unitId: string; assigned: string | null }>;
  operations: OuterOpsOperationV130[]; receipts: OuterOpsReceiptV130[];
}
export interface OuterOpsOrderV130 { id: string; revision: number; sequence: number; kind: OuterOpsOrderKindV130; [field: string]: unknown }

/** Failure reported by the authority or the network; `code` is the server error id. */
export class OuterOpsAccountErrorV130 extends Error {
  constructor(message: string, readonly status = 0, readonly code = "network") { super(message); this.name = "OuterOpsAccountErrorV130"; }
}

/** The configured authority URL, or null when this build has none (local mode only). */
export const OUTER_OPS_ACCOUNT_URL_V130: string | null = typeof config.url === "string" && config.url ? config.url : null;

function authorityUrl(url: unknown): URL | null {
  if (typeof url !== "string" || !url) return null;
  try {
    const parsed = new URL(url);
    const local = parsed.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
    return (parsed.protocol === "https:" || local) && !parsed.username && !parsed.password ? parsed : null;
  } catch { return null; }
}

/** True only with a safe authority URL and a signed-in cloud session. */
export function outerOpsAccountAvailableV130(url: unknown, session: CloudSessionV71 | null): boolean {
  return Boolean(authorityUrl(url) && session?.accessToken);
}

/** Number a client order against the last snapshot the player saw. */
export function outerOpsOrderV130(state: OuterOpsStateV130, kind: OuterOpsOrderKindV130,
  fields: Record<string, unknown>, id: string): OuterOpsOrderV130 {
  return { id, revision: state.revision, sequence: state.nextSequence, kind, ...fields };
}

const messages: Record<string, string> = {
  unauthorized: "Session de compte refusée par le serveur des mandats. Reconnectez le compte cloud.",
  "duplicate-order": "Cet ordre a déjà été accepté par le serveur.",
  "state-changed": "Les mandats ont changé entre-temps. L'état du serveur vient d'être relu.",
  "order-refused": "Le serveur refuse cet ordre.",
  "invalid-order": "Ordre de mandat invalide.",
};

export function createOuterOpsAccountClientV130(url: string | null = OUTER_OPS_ACCOUNT_URL_V130, fetcher: typeof fetch = fetch) {
  const base = authorityUrl(url);
  async function call(path: string, session: CloudSessionV71, body?: unknown) {
    if (!base) throw new OuterOpsAccountErrorV130("Aucun serveur de mandats n'est configuré.", 0, "unconfigured");
    let response: Response;
    try {
      response = await fetcher(new URL(path, base), {
        method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(6000),
        headers: { Authorization: "Bearer " + session.accessToken, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new OuterOpsAccountErrorV130("Serveur des mandats injoignable. Le mode local reste disponible.");
    }
    let data: Record<string, unknown> | null = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const code = typeof data?.error === "string" ? data.error : "http-" + response.status;
      const reason = typeof data?.reason === "string" ? " " + data.reason : "";
      throw new OuterOpsAccountErrorV130((messages[code] ?? "Réponse inattendue du serveur des mandats.") + reason, response.status, code);
    }
    return data;
  }
  const isState = (value: unknown): value is OuterOpsStateV130 => {
    const v = value as OuterOpsStateV130 | null;
    return Boolean(v && typeof v.clanId === "string" && Number.isSafeInteger(v.revision) &&
      Number.isSafeInteger(v.nextSequence) && Array.isArray(v.operations) && Array.isArray(v.receipts) && Array.isArray(v.teams));
  };
  return {
    async state(session: CloudSessionV71): Promise<OuterOpsStateV130> {
      const data = await call("/state", session);
      if (!isState(data)) throw new OuterOpsAccountErrorV130("État de mandats illisible.", 0, "invalid-state");
      return data;
    },
    async order(session: CloudSessionV71, order: OuterOpsOrderV130): Promise<{ state: OuterOpsStateV130; message: string }> {
      const data = await call("/order", session, order);
      if (!data || !isState(data.state)) throw new OuterOpsAccountErrorV130("Réponse d'ordre illisible.", 0, "invalid-state");
      return { state: data.state, message: typeof data.message === "string" ? data.message : "" };
    },
  };
}
