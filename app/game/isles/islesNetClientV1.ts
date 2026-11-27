/** The Isles V1 · browser side of the test-island room (scripts/serve-isles-room-v1.mjs). */
import {ISLES_PROTOCOL_V1, interpolatePlayerV1, type IslesNetPlayerV1, type IslesNetPreyV1, type IslesServerMessageV1} from "./islesRoomV1";

export type IslesNetStatusV1 = "connecting" | "open" | "full" | "closed" | "error";

/** Accepts the optional loopback room at its exact path. */
export function islesRoomUrlV1(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (!local || url.protocol !== "ws:" || url.username || url.password || url.search || url.hash || url.pathname !== "/isles") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export interface IslesNetClientV1 {
  readonly status: IslesNetStatusV1;
  readonly id: string | null;
  readonly spawn: {x: number; z: number} | null;
  readonly feed: string[];
  /** Position to adopt after the server refused a move. Read once. */
  takeCorrection(): {x: number; y: number; z: number} | null;
  sendInput(actor: {x: number; y: number; z: number; facing: number; cloaked: boolean}): void;
  strike(target: string): void;
  /** Remote players and the prey, interpolated `delayMs` in the past. */
  view(delayMs: number): {players: IslesNetPlayerV1[]; self: IslesNetPlayerV1 | null; prey: IslesNetPreyV1 | null; serverTime: number};
  close(): void;
}

export function createIslesNetClientV1(url: string, name: string, onChange: () => void): IslesNetClientV1 {
  let status: IslesNetStatusV1 = "connecting", id: string | null = null, spawn: {x: number; z: number} | null = null;
  let correction: {x: number; y: number; z: number} | null = null, seq = 0;
  const feed: string[] = [];
  const buffer: {time: number; receivedAt: number; players: IslesNetPlayerV1[]; prey: IslesNetPreyV1}[] = [];
  const path = islesRoomUrlV1(url);
  if (!path) throw new TypeError("Adresse locale de la salle The Isles requise.");
  const socket = new WebSocket(path);
  const note = (text: string) => { feed.push(text); if (feed.length > 6) feed.shift(); onChange(); };
  socket.addEventListener("open", () => socket.send(JSON.stringify({t: "hello", name, protocol: ISLES_PROTOCOL_V1})));
  socket.addEventListener("message", event => {
    let message: IslesServerMessageV1;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message || typeof message !== "object") return;
    if (message.t === "welcome") { status = "open"; id = message.id; spawn = message.spawn; note("Connecté à la salle (" + message.maxPlayers + " places)."); }
    else if (message.t === "full") { status = "full"; note("Salle complète : " + message.maxPlayers + " chasseurs au plus."); }
    else if (message.t === "snapshot") {
      buffer.push({time: message.time, receivedAt: performance.now(), players: message.players, prey: message.prey});
      while (buffer.length > 30) buffer.shift();
    } else if (message.t === "correction") correction = {x: message.x, y: message.y, z: message.z};
    else if (message.t === "kill") note((message.by === id ? "Vous abattez" : message.name + " abat") + " le sanglier.");
    else if (message.t === "strike-result" && !message.ok && message.reason) note("Coup refusé : " + message.reason + ".");
    else if (message.t === "left") note("Un chasseur quitte l’île.");
  });
  socket.addEventListener("close", () => { if (status !== "full") status = "closed"; onChange(); });
  socket.addEventListener("error", () => { status = "error"; onChange(); });
  return {
    get status() { return status; },
    get id() { return id; },
    get spawn() { return spawn; },
    feed,
    takeCorrection() { const value = correction; correction = null; return value; },
    sendInput(actor) {
      if (status !== "open" || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({t: "input", seq: ++seq, x: actor.x, y: actor.y, z: actor.z, facing: actor.facing, cloaked: actor.cloaked}));
    },
    strike(target) {
      if (status === "open" && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({t: "strike", seq: ++seq, target}));
    },
    view(delayMs) {
      const last = buffer[buffer.length - 1];
      if (!last) return {players: [], self: null, prey: null, serverTime: 0};
      const serverTime = last.time + (performance.now() - last.receivedAt) / 1000;
      const renderTime = serverTime - delayMs / 1000;
      const players = last.players.filter(p => p.id !== id).map(p => interpolatePlayerV1(buffer, p.id, renderTime) ?? p);
      return {players, self: last.players.find(p => p.id === id) ?? null, prey: last.prey, serverTime};
    },
    close() { socket.close(); },
  };
}
