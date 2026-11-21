import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createWarRtsCoopServerV133, loadWarRtsCoopRulesV133} from '../scripts/serve-clan-war-rts-coop-v133.mjs';

const game = await loadWarRtsCoopRulesV133();
const rules = game.DEFAULT_WAR_RULES_V6;
const tokens = ['A', 'B', 'C', 'D'].map(c => c.repeat(43));

async function room(t, count, {stateDirectory, orderPrefix = 'order', time = {value: 40}} = {}) {
  const server = createWarRtsCoopServerV133(game, {
    tokens: tokens.slice(0, count), leaseMs: 500, now: () => time.value, stateDirectory,
  });
  const close = () => server.listening
    ? new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    : Promise.resolve();
  t.after(close);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  let id = 0;
  const authorization = player => ({Authorization: 'Bearer ' + tokens[player], Connection: 'close'});
  async function read(player) {
    const response = await fetch(url + '/state', {headers: authorization(player)});
    assert.equal(response.status, 200);
    return response.json();
  }
  const envelope = (state, kind, target = null) => ({
    id: orderPrefix + '-' + (++id), sequence: state.nextSequence, revision: state.revision,
    tick: state.tick, kind, target,
  });
  async function send(player, order) {
    const response = await fetch(url + '/order', {method: 'POST',
      headers: {...authorization(player), 'Content-Type': 'application/json'}, body: JSON.stringify(order)});
    return {status: response.status, ...await response.json()};
  }
  async function submit(player, kind, target) {
    const reply = await send(player, envelope(await read(player), kind, target));
    assert.equal(reply.status, 200, reply.error);
    return reply.state;
  }
  return {url, read, send, envelope, submit, close, advance: delta => {time.value += delta;}};
}

async function launch(session, count) {
  for (let player = 0; player < count; player++) await session.submit(player, 'ready');
  return session.submit(0, 'launch');
}

test('four commanders share an authoritative source roster and all four field squads', async t => {
  const session = await room(t, 4);
  assert.equal((await fetch(session.url + '/state')).status, 401);
  const initial = await session.read(0);
  assert.equal(initial.commanders.length, 4);
  assert.equal(initial.phase, 'planning');
  assert.equal(initial.intel.enemies.length, 0);
  assert.equal(initial.intel.objective, null);
  const source = game.createWarRtsSquadsV133(initial.missionId, rules);
  const draftable = rules.units.find(unit => game.draftWarRtsSquadV133(source, unit.id, rules).accepted);
  assert(draftable, 'the original W3 budget must allow a fourth squad for this source');
  const wing = await session.read(1);
  assert.equal((await session.send(1, session.envelope(wing, 'draft', {unitId: draftable.id}))).status, 422);
  await session.submit(0, 'ready');
  const drafted = await session.submit(0, 'draft', {unitId: draftable.id});
  assert.equal(drafted.squads.length, 4);
  assert.equal(drafted.resources.pc, initial.resources.pc + draftable.commandPoints);
  assert.equal(drafted.commanders.some(commander => commander.ready), false);
  const premature = await session.send(0, session.envelope(await session.read(0), 'launch'));
  assert.equal(premature.status, 422);
  const deployed = await launch(session, 4);
  assert.equal(deployed.phase, 'active');
  assert.equal(new Set(deployed.squads.map(squad => squad.x + ',' + squad.y)).size, 4);
  for (let player = 0; player < 4; player++) {
    const squadId = deployed.squads[player].id;
    const result = await session.submit(player, 'select', {squadId});
    assert.equal(result.squads.find(squad => squad.id === squadId).controller, result.you);
  }
  const wingState = await session.read(2);
  assert.deepEqual(wingState.resources, drafted.resources);
  assert.equal(wingState.squads.every(squad => squad.controller), true);
});

test('one shared selection survives a contradictory order and reconciles after expiry and reconnect', async t => {
  const session = await room(t, 2);
  const started = await launch(session, 2);
  const squadId = started.squads[0].id, target = {squadId};
  const versions = await Promise.all([session.read(0), session.read(1)]);
  const commands = versions.map(version => session.envelope(version, 'select', target));
  const attempts = await Promise.all(commands.map((command, player) => session.send(player, command)));
  assert.deepEqual(attempts.map(reply => reply.status).sort(), [200, 409]);
  const winner = attempts.findIndex(reply => reply.status === 200), other = 1 - winner;
  assert.equal(attempts[other].error, 'state-changed');
  const repeat = await session.send(winner, commands[winner]);
  assert.equal(repeat.error, 'duplicate-order');
  const informed = await session.read(other);
  const controller = informed.squads.find(squad => squad.id === squadId).controller;
  assert.equal(controller, attempts[winner].state.you);
  assert.equal((await session.send(other, session.envelope(informed, 'select', target))).error, 'squad-leased');
  const rival = await session.send(other, session.envelope(informed, 'move', {squadId, direction: 'left'}));
  assert.equal(rival.error, 'lease-required');
  const stale = session.envelope(await session.read(winner), 'wait', target);
  session.advance(501);
  const reconnected = await session.read(other);
  assert.equal(reconnected.squads.find(squad => squad.id === squadId).controller, null);
  assert.equal(reconnected.tick, 0);
  assert.equal((await session.send(winner, stale)).error, 'state-changed');
  const selected = await session.submit(other, 'select', target);
  assert.equal(selected.squads.find(squad => squad.id === squadId).controller, selected.you);
  const moved = await session.submit(other, 'wait', target);
  assert.equal(moved.tick, 1);
  const latest = await session.read(winner);
  assert.equal(latest.revision, moved.revision);
  assert.deepEqual(latest.squads, moved.squads);
  assert.deepEqual(latest.intel, moved.intel);
  assert.deepEqual(latest.resources, moved.resources);
  await session.submit(other, 'release', target);
  assert.equal((await session.read(winner)).squads.find(squad => squad.id === squadId).controller, null);
});

test('live V133 battle state comes from the real reducer, and fog does not expose or target hidden units', async t => {
  const session = await room(t, 2);
  const started = await launch(session, 2);
  const local = game.launchWarRtsSquadsV133(game.createWarRtsSquadsV133(started.missionId, rules)).state;
  const visible = game.visibleWarRtsEnemiesV133(local);
  const hidden = local.enemies.find(enemy => !visible.some(entry => entry.id === enemy.id));
  assert(hidden, 'the source must start with a hidden opponent');
  assert.deepEqual(started.intel.enemies.map(enemy => enemy.id), visible.map(enemy => enemy.id));
  assert(!JSON.stringify(started).includes(JSON.stringify(hidden.id)));
  const actor = started.squads[0];
  const chosen = await session.submit(0, 'select', {squadId: actor.id});
  const hiddenAttack = await session.send(0, session.envelope(chosen, 'attack', {squadId: actor.id, enemyId: hidden.id}));
  const missingAttack = await session.send(0, session.envelope(chosen, 'attack', {squadId: actor.id, enemyId: 'nonexistent'}));
  assert.deepEqual(hiddenAttack, {status: 422, error: 'order-refused'});
  assert.deepEqual(hiddenAttack, missingAttack);
  const forged = {...session.envelope(chosen, 'wait', {squadId: actor.id}), rav: 999999};
  assert.equal((await session.send(0, forged)).status, 400);
  assert.deepEqual(await session.read(0), chosen);
  const move = ['up', 'down', 'left', 'right'].map(direction => ({
    kind: 'move', squadId: actor.id, direction,
  })).find(command => game.commandWarRtsSquadsV133(local, command).accepted);
  assert(move, 'the deployed source squad must have a physically traversable neighboring tile');
  const predicted = game.commandWarRtsSquadsV133(local, move).state;
  const after = await session.submit(0, 'move', {squadId: actor.id, direction: move.direction});
  assert.equal(after.tick, predicted.turn);
  assert.equal(after.resources.rav, predicted.ravRemaining);
  assert.deepEqual(after.squads.map(({id, x, y, hp}) => [id, x, y, hp]),
    predicted.squads.map(({id, x, y, hp}) => [id, x, y, hp]));
  assert.deepEqual(after.intel.enemies.map(enemy => enemy.id),
    game.visibleWarRtsEnemiesV133(predicted).map(enemy => enemy.id));
  assert.equal(after.report, null);
});

test('durable RTS resumes units, accepted orders, authoritative lease expiry and one terminal report', async t => {
  const stateDirectory = await mkdtemp(join(tmpdir(), 'yautja-rts-coop-'));
  t.after(() => rm(stateDirectory, {recursive: true, force: true}));
  const time = {value: 100};
  let session = await room(t, 2, {stateDirectory, time});
  const started = await launch(session, 2);
  const target = {squadId: started.squads[0].id};
  const selected = await session.submit(0, 'select', target);
  const command = session.envelope(selected, 'wait', target);
  const admitted = await session.send(0, command);
  assert.equal(admitted.status, 200);
  assert.equal(admitted.state.tick, 1);
  const wing = await session.read(1);
  await session.close();

  session = await room(t, 2, {stateDirectory, time, orderPrefix: 'resumed'});
  assert.deepEqual(await session.read(0), admitted.state);
  assert.deepEqual(await session.read(1), wing);
  assert.equal((await session.send(0, command)).error, 'duplicate-order');
  session.advance(501);
  const expired = await session.read(0);
  assert.equal(expired.revision, admitted.state.revision + 1);
  assert.equal(expired.tick, admitted.state.tick);
  assert.equal(expired.squads.find(squad => squad.id === target.squadId).controller, null);
  await session.close();

  session = await room(t, 2, {stateDirectory, time, orderPrefix: 'after-expiry'});
  assert.deepEqual(await session.read(0), expired);
  await session.submit(0, 'select', target);
  const retreat = session.envelope(await session.read(0), 'retreat', target);
  const settled = await session.send(0, retreat);
  assert.equal(settled.status, 200);
  assert.ok(settled.state.report);
  assert.ok(settled.state.squads.every(squad => squad.controller === null));
  await session.close();

  session = await room(t, 2, {stateDirectory, time, orderPrefix: 'terminal'});
  assert.deepEqual(await session.read(0), settled.state);
  assert.deepEqual((await session.read(1)).report, settled.state.report);
  assert.equal((await session.send(0, retreat)).error, 'duplicate-order');
  await session.close();

  const journalFile = (await readdir(stateDirectory)).filter(name => /^\d{5}\.json$/.test(name)).sort().at(-1);
  const path = join(stateDirectory, journalFile);
  const edited = JSON.parse(await readFile(path, 'utf8'));
  edited.stateSha256 = '0'.repeat(64);
  await writeFile(path, JSON.stringify(edited));
  assert.throws(() => createWarRtsCoopServerV133(game, {
    tokens: tokens.slice(0, 2), leaseMs: 500, now: () => time.value, stateDirectory,
  }), /journal coopératif incohérent/);
});
