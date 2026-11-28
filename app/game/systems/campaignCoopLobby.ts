import {
  campaignCoopExerciseActive, playCampaignCoopExercise, validCampaignCoopExercise,
  type CampaignCoopExercise, type CampaignCoopExerciseCommand, type CampaignCoopExerciseFailure,
} from "./campaignCoopExercise.ts";

const FORMAT = "yautja-campaign-coop-lobby" as const;
const VERSION = 1 as const;
const LIFETIME_MS = 24 * 60 * 60 * 1000;
const ROOM_ID = /^[0-9a-f]{32}$/;
const PROOF = /^[0-9a-f]{64}$/;

export const CAMPAIGN_COOP_LOBBY_KEY = "yautja-long-hunt.campaign-coop-lobby";
export const CAMPAIGN_COOP_MAX_PLAYERS = 3;

export interface CampaignCoopIdentity {
  slotId: number;
  ownerCreatedAt: string;
}

interface Seat extends CampaignCoopIdentity {
  proof: string;
}

interface GuestSeat extends Seat {
  ticket: string;
}

export interface CampaignCoopLobby {
  format: typeof FORMAT;
  version: typeof VERSION;
  id: string;
  revision: number;
  expiresAt: number;
  host: Seat;
  pending: GuestSeat[];
  guests: GuestSeat[];
  invitationHash: string | null;
  closed: boolean;
  exercise?: CampaignCoopExercise;
}

export type CampaignCoopLobbyCommand =
  | { type: "open"; roomId: string; owner: CampaignCoopIdentity }
  | { type: "invite"; roomId: string; invitationHash: string }
  | { type: "request"; roomId: string; owner: CampaignCoopIdentity; invitationHash: string }
  | { type: "admit" | "decline"; roomId: string; guest: CampaignCoopIdentity & { ticket: string } }
  | { type: "leave" | "close"; roomId: string }
  | CampaignCoopExerciseCommand;

export type CampaignCoopLobbyFailure =
  | "invalid" | "unavailable" | "occupied" | "stale" | "owner" | "host" | "guest" | "invitation" | "full" | "already"
  | CampaignCoopExerciseFailure;

export type CampaignCoopLobbyResult =
  | { ok: true; room: CampaignCoopLobby }
  | { ok: false; reason: CampaignCoopLobbyFailure };

export const sameCampaignCoopOwner = (a: CampaignCoopIdentity, b: CampaignCoopIdentity): boolean =>
  a.slotId === b.slotId && a.ownerCreatedAt === b.ownerCreatedAt;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validOwner(value: unknown): value is string {
  // Preserve the exact identifier of imported slots, including older date formats.
  return typeof value === "string" && value.length <= 128 && Number.isFinite(Date.parse(value));
}

function isSeat(value: unknown): value is Seat {
  return record(value) && typeof value.slotId === "number" && Number.isInteger(value.slotId) &&
    value.slotId >= 1 && value.slotId <= 5 && validOwner(value.ownerCreatedAt) &&
    typeof value.proof === "string" && PROOF.test(value.proof);
}

function isGuestSeat(value: unknown): value is GuestSeat {
  if (!isSeat(value)) return false;
  const ticket: unknown = Reflect.get(value, "ticket");
  return typeof ticket === "string" && PROOF.test(ticket);
}

export function parseCampaignCoopLobby(raw: string): CampaignCoopLobby | null {
  if (raw.length > 4096) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.format !== FORMAT || value.version !== VERSION ||
        typeof value.id !== "string" || !ROOM_ID.test(value.id) ||
        typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        typeof value.expiresAt !== "number" || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= 0 ||
        !isSeat(value.host) || !Array.isArray(value.pending) || !Array.isArray(value.guests) ||
        value.pending.length + value.guests.length >= CAMPAIGN_COOP_MAX_PLAYERS ||
        typeof value.closed !== "boolean" ||
        (value.invitationHash !== null && (typeof value.invitationHash !== "string" || !PROOF.test(value.invitationHash))) ||
        (value.closed && (value.invitationHash !== null || value.pending.length !== 0))) return null;
    const guests = [...value.pending, ...value.guests];
    if (!guests.every(isGuestSeat) || new Set(guests.map(seat => seat.ticket)).size !== guests.length) return null;
    const seats = [value.host, ...guests];
    if (new Set(seats.map(seat => seat.ownerCreatedAt)).size !== seats.length ||
        new Set(seats.map(seat => seat.slotId)).size !== seats.length ||
        new Set(seats.map(seat => seat.proof)).size !== seats.length) return null;
    if (value.exercise !== undefined) {
      if (!validCampaignCoopExercise(value.exercise) || value.exercise.roster[0] !== value.host.proof ||
          value.exercise.id > value.revision || (campaignCoopExerciseActive(value.exercise) &&
            (value.closed || !exerciseRosterAvailable(value.exercise, [value.host, ...value.guests])))) return null;
    }
    return value as unknown as CampaignCoopLobby;
  } catch {
    return null;
  }
}

export function exerciseRosterAvailable(exercise: CampaignCoopExercise, seats: readonly { proof: string }[]): boolean {
  return exercise.roster.every(proof => seats.some(seat => seat.proof === proof));
}

export function campaignCoopLobbyIsOpen(
  room: CampaignCoopLobby | null,
  owners: readonly CampaignCoopIdentity[],
  now: number,
): room is CampaignCoopLobby {
  return room !== null && !room.closed && room.expiresAt > now &&
    owners.some(owner => sameCampaignCoopOwner(owner, room.host));
}

export function advanceCampaignCoopLobby(
  room: CampaignCoopLobby | null,
  command: CampaignCoopLobbyCommand,
  actorProof: string,
  owners: readonly CampaignCoopIdentity[],
  now: number,
): CampaignCoopLobbyResult {
  const refuse = (reason: CampaignCoopLobbyFailure): CampaignCoopLobbyResult => ({ ok: false, reason });
  if (!ROOM_ID.test(command.roomId) || !PROOF.test(actorProof)) return refuse("invalid");
  const exists = (identity: CampaignCoopIdentity) => owners.some(owner => sameCampaignCoopOwner(owner, identity));
  if (command.type === "open") {
    if (campaignCoopLobbyIsOpen(room, owners, now)) return refuse("occupied");
    if (!exists(command.owner) || !validOwner(command.owner.ownerCreatedAt)) return refuse("owner");
    return { ok: true, room: {
      format: FORMAT, version: VERSION, id: command.roomId, revision: 0, expiresAt: now + LIFETIME_MS,
      host: { ...command.owner, proof: actorProof }, pending: [], guests: [], invitationHash: null, closed: false,
    } };
  }
  if (!campaignCoopLobbyIsOpen(room, owners, now) || command.roomId !== room.id) return refuse("stale");

  if (room.revision === Number.MAX_SAFE_INTEGER) return refuse("invalid");
  const pending = room.pending.filter(exists);
  const guests = room.guests.filter(exists);
  const update = (patch: Partial<Pick<CampaignCoopLobby, "pending" | "guests" | "invitationHash" | "closed" | "exercise">>): CampaignCoopLobbyResult => {
    const next = { ...room, pending, guests, ...patch, revision: room.revision + 1 };
    if (next.exercise && campaignCoopExerciseActive(next.exercise) &&
        (next.closed || !exerciseRosterAvailable(next.exercise, [next.host, ...next.guests]))) {
      next.exercise = { ...next.exercise, abandoned: true };
    }
    return { ok: true, room: next };
  };
  const exercise = room.exercise;
  const roster = [room.host, ...guests];
  const running = Boolean(exercise && campaignCoopExerciseActive(exercise) && exerciseRosterAvailable(exercise, roster));
  if (command.type === "exercise-start") {
    if (room.host.proof !== actorProof) return refuse("host");
    if (running || roster.length < 2) return refuse("exercise");
    return update({ exercise: { id: room.revision + 1, roster: roster.map(seat => seat.proof), journal: [], abandoned: false } });
  }
  if (command.type === "exercise-move" || command.type === "exercise-abandon") {
    if (!exercise || !running || command.exerciseId !== exercise.id) return refuse("exercise");
    if (command.type === "exercise-abandon") {
      return room.host.proof === actorProof ? update({ exercise: { ...exercise, abandoned: true } }) : refuse("host");
    }
    const move = playCampaignCoopExercise(exercise, actorProof, command.passage, command.move);
    return move.ok ? update({ exercise: move.exercise }) : refuse(move.reason);
  }
  const full = pending.length + guests.length + 1 >= CAMPAIGN_COOP_MAX_PLAYERS;
  if (command.type === "request") {
    if (!exists(command.owner) || !validOwner(command.owner.ownerCreatedAt)) return refuse("owner");
    const seats = [room.host, ...pending, ...guests];
    if (seats.some(seat => seat.proof === actorProof || seat.ownerCreatedAt === command.owner.ownerCreatedAt)) return refuse("already");
    if (full) return refuse("full");
    if (room.invitationHash === null || room.invitationHash !== command.invitationHash) return refuse("invitation");
    return update({ pending: [...pending, { ...command.owner, proof: actorProof, ticket: room.invitationHash }], invitationHash: null });
  }
  if (command.type === "leave") {
    if (![...pending, ...guests].some(seat => seat.proof === actorProof)) return refuse("guest");
    return update({ pending: pending.filter(seat => seat.proof !== actorProof), guests: guests.filter(seat => seat.proof !== actorProof) });
  }
  if (room.host.proof !== actorProof) return refuse("host");
  switch (command.type) {
    case "invite":
      if (!PROOF.test(command.invitationHash)) return refuse("invalid");
      if (full) return refuse("full");
      return update({ invitationHash: command.invitationHash });
    case "admit": {
      const seat = pending.find(member => sameCampaignCoopOwner(member, command.guest) && member.ticket === command.guest.ticket);
      if (!seat) return refuse("guest");
      return update({ pending: pending.filter(member => member !== seat), guests: [...guests, seat] });
    }
    case "decline": {
      const matches = (seat: GuestSeat) => sameCampaignCoopOwner(seat, command.guest) && seat.ticket === command.guest.ticket;
      if (![...pending, ...guests].some(matches)) return refuse("guest");
      return update({ pending: pending.filter(seat => !matches(seat)), guests: guests.filter(seat => !matches(seat)) });
    }
    case "close":
      return update({ closed: true, invitationHash: null, pending: [] });
  }
}
