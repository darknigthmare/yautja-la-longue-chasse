import { withArchiveTransferLock } from "./archiveTransaction";
import { loadCampaignSlots } from "./campaignSlots";
import {
  advanceCampaignCoopLobby, CAMPAIGN_COOP_LOBBY_KEY, parseCampaignCoopLobby,
  type CampaignCoopIdentity, type CampaignCoopLobby, type CampaignCoopLobbyCommand, type CampaignCoopLobbyResult,
} from "./campaignCoopLobby";

const ACTOR_KEY = "yautja-long-hunt.campaign-coop-tab";
const INVITATION = /^[0-9a-f]{24}$/;
const TAB_TOKEN = /^[0-9a-f]{64}$/;

interface LobbyCatalog {
  status?: string;
  workspaceRecoveryAvailable?: boolean;
  slots: readonly {
    id: number;
    status: string;
    ownerCreatedAt: string | null;
    hunterName: string | null;
    hardcoreV155?: string;
    blackGodV162?: string;
  }[];
}

export function campaignCoopCandidates(catalog: LobbyCatalog | null) {
  if (catalog?.status !== "ready" || catalog.workspaceRecoveryAvailable) return [];
  return catalog.slots.flatMap(slot => slot.status === "ready" && slot.ownerCreatedAt &&
    (!slot.hardcoreV155 || slot.hardcoreV155 === "alive") &&
    (!slot.blackGodV162 || slot.blackGodV162 === "victory")
    ? [{ slotId: slot.id, ownerCreatedAt: slot.ownerCreatedAt, hunterName: slot.hunterName || "Chasseur sans nom" }] : []);
}

type RoomSnapshot = { room: CampaignCoopLobby | null; unavailable: boolean };

export function readBrowserCampaignCoopLobby(): RoomSnapshot {
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_COOP_LOBBY_KEY);
    const room = raw === null ? null : parseCampaignCoopLobby(raw);
    return { room, unavailable: raw !== null && room === null };
  } catch {
    return { room: null, unavailable: true };
  }
}

const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const randomHex = (length: number) => hex(window.crypto.getRandomValues(new Uint8Array(length)));
const hash = async (value: string) => hex(new Uint8Array(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));

export function browserCampaignCoopAvailable(): boolean {
  try { return Boolean(window.isSecureContext && window.crypto?.subtle && window.navigator.locks?.request); }
  catch { return false; }
}

export async function browserCampaignCoopActor(prepare = false): Promise<string | null> {
  try {
    const storage = window.sessionStorage;
    const existing = storage.getItem(ACTOR_KEY);
    if (existing && TAB_TOKEN.test(existing)) return await hash(existing);
    if (!prepare || existing !== null) return null;
    const token = randomHex(32);
    storage.setItem(ACTOR_KEY, token);
    if (storage.getItem(ACTOR_KEY) !== token) return null;
    return await hash(token);
  } catch {
    return null;
  }
}

export type BrowserCampaignCoopAction =
  | { type: "open"; owner: CampaignCoopIdentity }
  | { type: "issue"; roomId: string }
  | { type: "join"; roomId: string; owner: CampaignCoopIdentity; code: string }
  | Extract<CampaignCoopLobbyCommand, { type: "admit" | "decline" | "leave" | "close" }>;

type BrowserLobbyResult = CampaignCoopLobbyResult & { inviteCode?: string; actorProof?: string };

export async function actOnBrowserCampaignCoopLobby(action: BrowserCampaignCoopAction): Promise<BrowserLobbyResult> {
  try {
    if (!browserCampaignCoopAvailable()) return { ok: false, reason: "unavailable" };
    const actorProof = await browserCampaignCoopActor(action.type === "open" || action.type === "join");
    if (!actorProof) return { ok: false, reason: "unavailable" };
    let command: CampaignCoopLobbyCommand;
    let inviteCode: string | undefined;
    switch (action.type) {
      case "open":
        command = { ...action, roomId: randomHex(16) };
        break;
      case "issue": {
        const code = randomHex(12);
        inviteCode = code.match(/.{6}/g)?.join("-") ?? code;
        command = { type: "invite", roomId: action.roomId, invitationHash: await hash(code) };
        break;
      }
      case "join": {
        const code = action.code.toLowerCase().replace(/[\s-]/g, "");
        if (!INVITATION.test(code)) return { ok: false, reason: "invitation" };
        command = { type: "request", roomId: action.roomId, owner: action.owner, invitationHash: await hash(code) };
        break;
      }
      default:
        command = action;
    }
    // Share the campaign archive lock so another tab cannot replace a picked
    // slot between identity validation and the local lobby write.
    const locked = await withArchiveTransferLock((): CampaignCoopLobbyResult => {
      const snapshot = readBrowserCampaignCoopLobby();
      if (snapshot.unavailable) return { ok: false, reason: "unavailable" };
      const catalog = loadCampaignSlots(window.localStorage);
      if (catalog.status !== "ready" || catalog.workspaceRecoveryAvailable) return { ok: false, reason: "owner" };
      const result = advanceCampaignCoopLobby(snapshot.room, command, actorProof, campaignCoopCandidates(catalog), Date.now());
      if (!result.ok) return result;
      const serialized = JSON.stringify(result.room);
      window.localStorage.setItem(CAMPAIGN_COOP_LOBBY_KEY, serialized);
      return window.localStorage.getItem(CAMPAIGN_COOP_LOBBY_KEY) === serialized
        ? result : { ok: false, reason: "unavailable" };
    });
    return locked.acquired
      ? { ...locked.value, actorProof, inviteCode: locked.value.ok ? inviteCode : undefined }
      : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
