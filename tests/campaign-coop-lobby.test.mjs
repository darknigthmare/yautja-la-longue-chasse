import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCampaignCoopLobby, campaignCoopLobbyIsOpen, parseCampaignCoopLobby,
} from "../app/game/systems/campaignCoopLobby.ts";

const owners = [1, 2, 3, 4].map(slotId => ({
  slotId,
  ownerCreatedAt: "2026-11-28T0" + slotId + ":00:00.000Z",
}));
const [host, guest, peer, fourth] = owners;
const hash = digit => digit.repeat(64);
const [hostProof, guestProof, peerProof, fourthProof, code, freshCode] = ["1", "2", "3", "4", "a", "b"].map(hash);
const roomId = "c".repeat(32);
const now = Date.parse("2026-11-28T10:00:00.000Z");
const advance = (room, command, actor = hostProof, current = owners, at = now) =>
  advanceCampaignCoopLobby(room, { roomId, ...command }, actor, current, at);
function success(result) {
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(parseCampaignCoopLobby(JSON.stringify(result.room)), result.room);
  return result.room;
}
const open = () => success(advance(null, { type: "open", owner: host }));
const invite = (room, invitationHash = code) => success(advance(room, { type: "invite", invitationHash }));
const join = (room, owner = guest, actor = guestProof, invitationHash = code) =>
  advance(room, { type: "request", owner, invitationHash }, actor);

test("invitation consommable, approbation hôte et trois chroniques distinctes", () => {
  let room = invite(open());
  assert.deepEqual(advance(room, { type: "invite", invitationHash: freshCode }, guestProof), { ok: false, reason: "host" });
  assert.deepEqual(join(room, host), { ok: false, reason: "already" });
  assert.deepEqual(join(room, guest, hostProof), { ok: false, reason: "already" });
  assert.deepEqual(join(room, guest, guestProof, freshCode), { ok: false, reason: "invitation" });
  room = success(join(room));
  assert.equal(room.invitationHash, null);
  assert.deepEqual(join(room, peer, peerProof), { ok: false, reason: "invitation" });
  assert.deepEqual(advance(room, { type: "admit", guest: room.pending[0] }, guestProof), { ok: false, reason: "host" });
  room = success(advance(room, { type: "admit", guest: room.pending[0] }));
  room = success(join(invite(room, freshCode), peer, peerProof, freshCode));
  room = success(advance(room, { type: "admit", guest: room.pending[0] }));
  assert.deepEqual(room.guests.map(seat => seat.slotId), [2, 3]);
  assert.deepEqual(advance(room, { type: "invite", invitationHash: code }), { ok: false, reason: "full" });
  assert.deepEqual(join(room, fourth, fourthProof), { ok: false, reason: "full" });
  assert.deepEqual(advance(room, { type: "close" }, guestProof), { ok: false, reason: "host" });
  room = success(advance(room, { type: "leave" }, guestProof));
  assert.deepEqual(room.guests.map(seat => seat.slotId), [3]);
  room = success(advance(room, { type: "close" }));
  assert.deepEqual(join(room, fourth, fourthProof), { ok: false, reason: "stale" });
});

test("une demande retirée puis rejouée ne reçoit pas l’ancienne confirmation", () => {
  let room = success(join(invite(open())));
  const obsolete = room.pending[0];
  room = success(advance(room, { type: "leave" }, guestProof));
  room = success(join(invite(room, freshCode), guest, guestProof, freshCode));
  assert.deepEqual(advance(room, { type: "admit", guest: obsolete }), { ok: false, reason: "guest" });
  assert.deepEqual(advance(room, { type: "decline", guest: obsolete }), { ok: false, reason: "guest" });
  assert.equal(success(advance(room, { type: "admit", guest: room.pending[0] })).guests[0].ticket, freshCode);
});

test("une campagne remplacée et un salon expiré invalident les actions anciennes", () => {
  let room = success(join(invite(open())));
  const replaced = { ...guest, ownerCreatedAt: "2026-11-28T09:00:00.000Z" };
  const current = [host, replaced, peer, fourth];
  assert.deepEqual(advance(room, { type: "admit", guest: room.pending[0] }, hostProof, current), { ok: false, reason: "guest" });
  assert.equal(success(advance(room, { type: "invite", invitationHash: freshCode }, hostProof, current)).pending.length, 0);
  assert.equal(campaignCoopLobbyIsOpen(room, [guest, peer, fourth], now), false);
  assert.equal(campaignCoopLobbyIsOpen(room, owners, room.expiresAt), false);
  const nextRoomId = "d".repeat(32);
  room = success(advance(room, { type: "open", roomId: nextRoomId, owner: guest }, guestProof, owners, room.expiresAt));
  assert.deepEqual(advance(room, { type: "close" }, hostProof, owners, room.expiresAt - 1), { ok: false, reason: "stale" });
});

test("le registre invalide, inconnu ou ambigu est refusé avant usage", () => {
  const room = success(join(invite(open())));
  for (const broken of [
    { ...room, version: 2 },
    { ...room, pending: [room.pending[0], room.pending[0]] },
    { ...room, pending: [{ ...room.pending[0], ticket: null }] },
    { ...room, host: { ...room.host, ownerCreatedAt: "2026-02-30T00:00:00.000Z" } },
    { ...room, closed: true },
    { ...room, revision: -1 },
  ]) assert.equal(parseCampaignCoopLobby(JSON.stringify(broken)), null);
  assert.equal(parseCampaignCoopLobby("malformé"), null);
});
