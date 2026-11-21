import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID} from 'node:crypto';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createLegacySupplyDriverV109} from './helpers/clan-supply-route-v109-fixture.mjs';
import {createWarW3S14DuelServer, loadWarW3S14DuelRules} from '../scripts/serve-clan-war-w3-s14-duel.mjs';

const game = await loadWarW3S14DuelRules();
const tokens = ['A'.repeat(43), 'B'.repeat(43)];
const unknownToken = 'C'.repeat(43);
const challengerActor = 'operator:W3-S14';

function prepareRing() {
  const fixture = createLegacySupplyDriverV109(game);
  for (const actor of ['carrier', challengerActor, 'rival']) fixture.send({kind: 'hire', actor});
  fixture.wait(3);
  for (const actor of [challengerActor, 'rival']) {
    fixture.home(actor);
    fixture.send({kind: 'rav-load', actor, location: 'depot', amount: 6});
  }
  fixture.send({kind: 'rav-load', actor: 'carrier', location: 'depot', amount: 20});
  fixture.build('W3-S14');
  fixture.east('rival', 815, 320);
  fixture.walk('carrier', 800, 405);
  assert.equal(game.logisticsFunctionalV108(fixture.state, 'W3-S14'), true);
  assert.deepEqual(fixture.state.duel.signatures, []);
  const legacy = game.exportLogisticsV108(fixture.state);
  assert.ok(legacy);
  const imported = game.migrateSupplyArchiveV109(legacy);
  assert.ok(imported.state, imported.error);
  const checkpoint = game.exportSupplyV109(imported.state);
  assert.ok(checkpoint);
  return checkpoint;
}

const checkpoint = prepareRing();

async function newRoom(t) {
  const directory = await mkdtemp(join(tmpdir(), 'yautja-w3-s14-'));
  const databasePath = join(directory, 'duel.sqlite');
  const activeServers = new Set();
  t.after(async () => {
    for (const server of activeServers) {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    await rm(directory, {recursive: true, force: true});
  });
  return {
    databasePath,
    async open(seed, issuance) {
      const server = createWarW3S14DuelServer(game, {tokens, databasePath, checkpoint: seed, issuance});
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      activeServers.add(server);
      const base = 'http://127.0.0.1:' + server.address().port;
      async function request(path, token, order) {
        const headers = {connection: 'close'};
        if (token) headers.authorization = 'Bearer ' + token;
        if (order) headers['content-type'] = 'application/json';
        const response = await fetch(base + path, {
          method: order ? 'POST' : 'GET', headers,
          body: order ? JSON.stringify(order) : undefined,
        });
        return {status: response.status, body: await response.json()};
      }
      return {
        request,
        async read(index) {
          const response = await request('/state', tokens[index]);
          assert.equal(response.status, 200, JSON.stringify(response.body));
          return response.body;
        },
        post(index, order) {
          return request('/order', tokens[index], order);
        },
        async close() {
          await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
          activeServers.delete(server);
        },
      };
    },
  };
}

function orderFor(state, kind, target = null) {
  return {
    id: randomUUID(), sequence: state.nextSequence, revision: state.revision,
    tick: state.tick, kind, target,
  };
}

async function accept(room, index, kind, target = null) {
  const response = await room.post(index, orderFor(await room.read(index), kind, target));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.state;
}

async function refuse(room, index, order, status = null) {
  const before = await room.read(index);
  const response = await room.post(index, order);
  if (status === null) assert.ok(response.status >= 400 && response.status < 500, JSON.stringify(response));
  else assert.equal(response.status, status, JSON.stringify(response.body));
  assert.deepEqual(await room.read(index), before);
  return response.body;
}

function actor(state, role) {
  const participant = state.participants.find(entry => entry.role === role);
  assert.ok(participant, role);
  return participant;
}

async function startDuel(room) {
  await accept(room, 0, 'sign');
  await accept(room, 1, 'sign');
  return accept(room, 0, 'start');
}

test('W3-S14 authenticates two separate decisions to sign and start the duel', async t => {
  const room = await (await newRoom(t)).open(checkpoint);
  assert.equal((await room.request('/state')).status, 401);
  assert.equal((await room.request('/state', unknownToken)).status, 401);
  const initial = await room.read(0);
  const rivalView = await room.read(1);
  const challenger = actor(initial, 'challenger');
  const rival = actor(initial, 'rival');
  assert.equal(initial.you, 'challenger');
  assert.equal(rivalView.you, 'rival');
  assert.notEqual(challenger.memberId, rival.memberId);
  assert.equal(initial.duel.phase, 'unsigned');
  assert.deepEqual(initial.duel.signatures, []);
  assert.equal(initial.receipt, null);
  await refuse(room, 0, orderFor(initial, 'start'));
  await refuse(room, 0, orderFor(initial, 'sign', rival.memberId));
  await refuse(room, 0, {...orderFor(initial, 'sign'), actor: 'rival'});
  await refuse(room, 0, orderFor(initial, 'move', [48, 0]));

  const firstOrder = orderFor(initial, 'sign');
  const firstResponse = await room.post(0, firstOrder);
  assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.body));
  const first = firstResponse.body.state;
  assert.deepEqual(first.duel.signatures, [challenger.memberId]);
  assert.equal((await refuse(room, 0, firstOrder, 409)).error, 'duplicate-order');
  await refuse(room, 0, orderFor(first, 'sign'));
  await refuse(room, 0, orderFor(first, 'start'));
  await refuse(room, 1, orderFor(rivalView, 'sign'), 409);

  const both = await accept(room, 1, 'sign');
  assert.deepEqual(both.duel.signatures, [challenger.memberId, rival.memberId]);
  assert.equal(both.duel.phase, 'accepted');
  await refuse(room, 1, orderFor(both, 'start'));
  const playing = await accept(room, 0, 'start');
  assert.equal(playing.duel.phase, 'active');
  assert.equal((await room.read(1)).duel.phase, 'active');
  await refuse(room, 1, orderFor(await room.read(1), 'decline'));
  await refuse(room, 0, orderFor(playing, 'claim'));
});

test('W3-S14 keeps a signed refusal when the invited participant declines', async t => {
  const room = await (await newRoom(t)).open(checkpoint);
  await accept(room, 0, 'sign');
  const refused = await accept(room, 1, 'decline');
  assert.equal(refused.receipt.outcome, 'declined');
  assert.equal(refused.receipt.winner, null);
  assert.equal(refused.duel.chestHolder, 'site');
  const challenger = await room.read(0);
  assert.deepEqual(challenger.receipt, refused.receipt);
  await refuse(room, 0, orderFor(challenger, 'start'));
});

test('W3-S14 resolves contact and dodges, then persists one chest and one receipt across restarts', async t => {
  const league = await newRoom(t);
  let room = await league.open(checkpoint);
  const started = await startDuel(room);
  const champion = actor(started, 'challenger');
  const rival = actor(started, 'rival');
  assert.equal(started.duel.player, 3);
  assert.equal(started.duel.rival, 3);
  await refuse(room, 1, orderFor(await room.read(1), 'strike'));

  const distant = await accept(room, 0, 'move', [-24, 0]);
  assert.equal(actor(distant, 'challenger').x, champion.x - 24);
  assert.deepEqual(actor(distant, 'rival'), rival);
  await refuse(room, 0, orderFor(distant, 'strike'));
  await accept(room, 0, 'move', [24, 0]);

  let victory;
  for (let hit = 1; hit <= 3; hit++) {
    const contact = await accept(room, 0, 'strike');
    assert.equal(contact.duel.rival, 3 - hit);
    assert.equal(contact.duel.player, 3);
    if (hit === 3) {
      victory = contact;
      break;
    }
    await refuse(room, 0, orderFor(contact, 'strike'));
    await accept(room, 0, 'move', [-24, 0]);
    const reply = await accept(room, 1, 'strike');
    assert.equal(reply.duel.player, 3);
    assert.equal(reply.duel.round, hit * 2);
    await accept(room, 0, 'move', [24, 0]);
  }
  assert.equal(victory.duel.phase, 'won');
  assert.equal(victory.duel.winner, champion.memberId);
  assert.equal(victory.duel.chestHolder, 'site');
  assert.equal(victory.receipt.outcome, 'won');
  assert.equal(victory.receipt.winner, champion.memberId);
  const earnedReceipt = victory.receipt;
  const challengerAfterVictory = await room.read(0);
  const rivalAfterVictory = await room.read(1);
  assert.deepEqual(rivalAfterVictory.receipt, earnedReceipt);
  await room.close();

  room = await league.open();
  assert.deepEqual(await room.read(0), challengerAfterVictory);
  assert.deepEqual(await room.read(1), rivalAfterVictory);
  await refuse(room, 1, orderFor(rivalAfterVictory, 'claim'));
  const claim = orderFor(challengerAfterVictory, 'claim');
  const result = await room.post(0, claim);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.state.duel.chestHolder, champion.memberId);
  assert.deepEqual(result.body.state.receipt, earnedReceipt);
  const claimedState = await room.read(0);
  await room.close();

  room = await league.open();
  assert.deepEqual(await room.read(0), claimedState);
  assert.equal((await refuse(room, 0, claim, 409)).error, 'duplicate-order');
  await refuse(room, 0, orderFor(claimedState, 'claim'));
  const observed = await room.read(1);
  assert.equal(observed.duel.chestHolder, champion.memberId);
  assert.deepEqual(observed.receipt, earnedReceipt);
});

test('a challenger can return to service and renegotiate after leaving the ring', async t => {
  const league = await newRoom(t);
  let room = await league.open(checkpoint);
  await startDuel(room);
  for (let step = 0; step < 3; step++) await accept(room, 0, 'move', [-24, 0]);
  const paused = await room.read(0);
  assert.equal(paused.duel.phase, 'interrupted');
  assert.deepEqual(paused.duel.signatures, []);
  assert.equal(paused.serviceReady, false);
  await refuse(room, 0, orderFor(paused, 'renegotiate'));
  await room.close();
  room = await league.open();
  assert.deepEqual(await room.read(0), paused);
  for (let step = 0; step < 3; step++) await accept(room, 0, 'move', [24, 0]);
  await accept(room, 0, 'renegotiate');
  await accept(room, 0, 'sign');
  await accept(room, 1, 'sign');
  const restored = await accept(room, 0, 'start');
  assert.equal(restored.serviceReady, true);
  assert.equal(restored.duel.phase, 'active');
  assert.equal(restored.duel.round, 0);
});

test('three failed attacks and real counterattacks allow the rival to win and claim the same chest', async t => {
  const room = await (await newRoom(t)).open(checkpoint);
  const started = await startDuel(room);
  await refuse(room, 0, orderFor(started, 'miss'));
  await refuse(room, 1, orderFor(await room.read(1), 'miss'));
  let won;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await accept(room, 0, 'move', [-24, 0]);
    const missed = await accept(room, 0, 'miss');
    assert.equal(missed.duel.rival, 3);
    assert.equal(missed.duel.round, attempt * 2 - 1);
    await accept(room, 0, 'move', [24, 0]);
    won = await accept(room, 1, 'strike');
    assert.equal(won.duel.player, 3 - attempt);
  }
  const winner = actor(won, 'rival');
  assert.equal(won.duel.phase, 'lost');
  assert.equal(won.receipt.outcome, 'lost');
  assert.equal(won.receipt.winner, winner.memberId);
  await refuse(room, 0, orderFor(await room.read(0), 'claim'));
  const claimed = await accept(room, 1, 'claim');
  assert.equal(claimed.duel.chestHolder, winner.memberId);
  assert.deepEqual(claimed.receipt, won.receipt);
});

const owners = ['2026-11-21T09:00:00.000Z', '2026-11-21T12:00:00.000Z'];
function issuer() {
  const {publicKey, privateKey} = generateKeyPairSync('ed25519');
  return {
    trust: publicKey.export({type: 'spki', format: 'der'}).toString('base64url'),
    issuance: {privateKey: privateKey.export({type: 'pkcs8', format: 'pem'}), owners},
  };
}
const source = game.DEFAULT_WAR_RULES_V6.metadata.sha256;

test('two role-bound Ed25519 attestations are written with the real winner and survive restart', async t => {
  const selected = issuer();
  const other = issuer();
  const league = await newRoom(t);
  let room = await league.open(checkpoint, selected.issuance);
  const live = await startDuel(room);
  assert.equal(live.attestation, null);
  await refuse(room, 0, {...orderFor(live, 'claim'), attestation: {winner: 'local'}}, 400);
  let settled;
  for (let hit = 1; hit <= 3; hit++) {
    settled = await accept(room, 0, 'strike');
    if (hit < 3) {
      await accept(room, 0, 'move', [-24, 0]);
      await accept(room, 1, 'strike');
      await accept(room, 0, 'move', [24, 0]);
    }
  }
  const rival = await room.read(1);
  assert.equal(settled.receipt.outcome, 'won');
  assert.equal(settled.attestation.body.winner, settled.receipt.winner);
  assert.equal(settled.attestation.body.role, 'challenger');
  assert.equal(rival.attestation.body.role, 'rival');
  assert.notEqual(settled.attestation.body.ownerDigest, rival.attestation.body.ownerDigest);
  assert.notEqual(settled.attestation.signature, rival.attestation.signature);
  assert.deepEqual(await game.verifyW3S14Receipt(settled.attestation, selected.trust, owners[0], source), settled.attestation);
  assert.deepEqual(await game.verifyW3S14Receipt(rival.attestation, selected.trust, owners[1], source), rival.attestation);
  assert.equal(await game.verifyW3S14Receipt(rival.attestation, selected.trust, owners[0], source), null);
  const equivalentDate = '2026-11-21T09:00:00+00:00';
  assert.equal(Date.parse(equivalentDate), Date.parse(owners[0]));
  assert.ok(game.w3s14OwnerMaterial(equivalentDate).endsWith(equivalentDate));
  assert.equal(await game.verifyW3S14Receipt(settled.attestation, selected.trust, equivalentDate, source), null);
  assert.equal(await game.verifyW3S14Receipt(settled.attestation, other.trust, owners[0], source), null);
  assert.equal(await game.verifyW3S14Receipt(settled.attestation, selected.trust, owners[0], 'f'.repeat(64)), null);
  const forged = structuredClone(settled.attestation);
  forged.body.checkpointSha = 'a'.repeat(64);
  assert.equal(await game.verifyW3S14Receipt(forged, selected.trust, owners[0], source), null);
  assert.equal(await game.verifyW3S14Receipt({...settled.attestation, publicKey: selected.trust}, selected.trust, owners[0], source), null);
  assert.doesNotMatch(JSON.stringify(settled.attestation), new RegExp(tokens.join('|')));
  const taken = await accept(room, 0, 'claim');
  assert.deepEqual(taken.attestation, settled.attestation);
  await room.close();
  await assert.rejects(league.open(undefined, other.issuance), /journal W3-S14/);
  await assert.rejects(league.open(undefined, {...selected.issuance, owners: [...owners].reverse()}), /journal W3-S14/);
  room = await league.open(undefined, selected.issuance);
  assert.deepEqual((await room.read(0)).attestation, settled.attestation);
  assert.deepEqual((await room.read(1)).attestation, rival.attestation);
});

test('an unsigned historical room stays readable and cannot issue a retrospective campaign receipt', async t => {
  const league = await newRoom(t);
  const room = await league.open(checkpoint);
  const refused = await accept(room, 1, 'decline');
  assert.equal(refused.receipt.outcome, 'declined');
  assert.equal(refused.attestation, null);
  await room.close();
  await assert.rejects(league.open(undefined, issuer().issuance), /journal W3-S14/);
  const reopened = await league.open();
  assert.deepEqual((await reopened.read(1)).receipt, refused.receipt);
  assert.equal((await reopened.read(1)).attestation, null);
});
