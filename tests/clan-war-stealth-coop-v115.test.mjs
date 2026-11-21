import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import {createWarStealthCoopServerV115, loadWarStealthCoopRulesV115} from '../scripts/serve-clan-war-stealth-coop-v115.mjs';

const game = await loadWarStealthCoopRulesV115();
const tokens = ['A', 'B', 'C', 'D'].map(letter => letter.repeat(43));
const times = (amount, command) => Array(amount).fill(command);

async function room(t, count = 2) {
  const server = createWarStealthCoopServerV115(game, {tokens: tokens.slice(0, count)});
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = player => ({Authorization: 'Bearer ' + tokens[player], Connection: 'close'});
  async function read(player) {
    const response = await fetch(origin + '/state', {headers: headers(player)});
    assert.equal(response.status, 200);
    return response.json();
  }
  let id = 0;
  const order = (snapshot, kind) => ({id: 'step-' + (++id), sequence: snapshot.nextSequence,
    revision: snapshot.revision, tick: snapshot.tick, kind, target: null});
  async function send(player, command) {
    const response = await fetch(origin + '/order', {method: 'POST',
      headers: {...headers(player), 'Content-Type': 'application/json'}, body: JSON.stringify(command)});
    return {status: response.status, ...await response.json()};
  }
  async function submit(player, kind) {
    const reply = await send(player, order(await read(player), kind));
    assert.equal(reply.status, 200, kind + ': ' + reply.error);
    return reply.state;
  }
  async function launch() {
    for (let player = 0; player < count; player++) await submit(player, 'ready');
    return submit(0, 'launch');
  }
  return {origin, read, order, send, submit, launch};
}

test('four infiltrators receive one physical briefing and a ready-gated start', async t => {
  const session = await room(t, 4);
  assert.equal((await fetch(session.origin + '/state')).status, 401);
  const leader = await session.read(0), wing = await session.read(3);
  assert.equal(leader.team.length, 4);
  assert.deepEqual(wing.briefing, leader.briefing);
  assert.equal(leader.phase, 'briefing');
  assert.equal(leader.contact, null);
  assert.equal((await session.send(0, session.order(leader, 'launch'))).status, 422);
  const started = await session.launch();
  assert.equal(started.phase, 'active');
  assert.equal(started.objective.needed, 4);
  assert.equal(started.team.every(player => player.ready), true);
  const calls = await Promise.all([session.read(0), session.read(3)]);
  assert.deepEqual(calls.map(view => view.revision), [started.revision, started.revision]);
  assert.equal((await session.send(3, session.order(calls[1], 'extract'))).status, 422);
  assert.equal((await session.send(0, {...session.order(calls[0], 'right'), target: {x: 7, y: 1}})).status, 400);
});

test('clues require actual sight and one actor’s detection, noise and position stay private', async t => {
  const session = await room(t);
  await session.launch();
  assert.equal((await session.send(0, session.order(await session.read(0), 'radio'))).status, 422);
  let privateDetection = false, clue = null;
  for (const kind of [...times(4, 'up'), ...times(6, 'right')]) {
    const actor = await session.submit(0, kind);
    const mate = await session.read(1);
    assert.deepEqual([mate.self.x, mate.self.y, mate.self.alarm, mate.self.detected, mate.self.noise],
      [1, 4, 0, false, []]);
    assert.equal(mate.contact, null);
    assert.deepEqual(Object.keys(mate.team[0]).sort(), ['extracted', 'id', 'leader', 'ready']);
    assert(mate.team[0].id !== mate.you);
    assert(actor.self.noise.some(trace => trace.kind === 'footsteps'));
    if (!clue && actor.contact && actor.phase === 'active') {
      const voiced = await session.submit(0, 'radio');
      clue = voiced.radio.at(-1);
      assert.deepEqual(Object.keys(clue).sort(), ['from', 'kind', 'sector', 'tick']);
      assert.match(clue.sector, /^(nord|sud)-(est|ouest)$/);
      assert.deepEqual((await session.read(1)).radio, voiced.radio);
    }
    if (actor.self.detected) privateDetection = true;
  }
  assert.equal(privateDetection, true);
  assert(clue);
  const failed = await session.read(1);
  assert.equal(failed.report.outcome, 'defeat');
  assert.equal(failed.report.reason, 'capture');
  assert.equal(failed.self.detected, false);
});

test('relay sabotage and both real exits are required for one collective immutable receipt', async t => {
  const session = await room(t);
  await session.launch();
  const outbound = [...times(4, 'up'), 'cloak', ...times(6, 'right'), 'sabotage', 'wait'];
  for (const kind of outbound) await session.submit(0, kind);
  const briefing = await session.read(1);
  assert.equal(briefing.objective.sabotaged, true);
  assert.equal(briefing.objective.extracted, 0);
  for (const kind of [...times(6, 'left'), ...times(4, 'down')]) await session.submit(0, kind);
  const first = await session.submit(0, 'extract');
  assert.equal(first.phase, 'active');
  assert.equal(first.report, null);
  assert.deepEqual(first.objective, {sabotaged: true, extracted: 1, needed: 2});
  assert.equal((await session.send(0, session.order(first, 'wait'))).status, 422);
  const away = await session.submit(1, 'down');
  assert.equal((await session.send(1, session.order(away, 'extract'))).status, 422);
  await session.submit(1, 'up');
  const before = await session.read(1);
  const order = session.order(before, 'extract');
  const last = await session.send(1, order);
  assert.equal(last.status, 200);
  assert.equal(last.state.report.outcome, 'victory');
  assert.equal(last.state.report.reason, 'collective-extraction');
  assert.equal(last.state.report.campaignMutation, false);
  assert.deepEqual((await session.read(0)).report, last.state.report);
  assert.equal((await session.send(1, order)).error, 'duplicate-order');
  assert.equal((await session.send(1, session.order(last.state, 'extract'))).status, 422);
  assert.deepEqual((await session.read(1)).report, last.state.report);
});
