import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import {loadWarAssaultReplayRulesV115} from '../scripts/replay-clan-war-assault-v115.mjs';
import {createWarCoopAssaultServerV115} from '../scripts/serve-clan-war-assault-coop-v115.mjs';

const game = await loadWarAssaultReplayRulesV115();
const keys = ['A', 'B', 'C', 'D'].map(letter => letter.repeat(43));

async function openRoom(t, teams, tickMs = 1800) {
  const server = createWarCoopAssaultServerV115(game, {tokens: keys.slice(0, teams), tickMs});
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  async function exchange(index, order) {
    const reply = await fetch(origin + (order ? '/order' : '/state'), {
      method: order ? 'POST' : 'GET', signal: AbortSignal.timeout(3000),
      headers: {Authorization: 'Bearer ' + keys[index], 'Content-Type': 'application/json', Connection: 'close'},
      ...(order ? {body: JSON.stringify(order)} : {}),
    });
    return {status: reply.status, body: await reply.json()};
  }
  const view = async index => {
    const response = await exchange(index);
    assert.equal(response.status, 200);
    return response.body;
  };
  return {exchange, view};
}

function order(view, kind, id = kind) {
  return {id, sequence: view.nextSequence, revision: view.revision, tick: view.tick, kind, target: null};
}

test('two to four distinct keys are required and three-player rosters use actual V6 squads', async t => {
  assert.throws(() => createWarCoopAssaultServerV115(game, {tokens: keys.slice(0, 1)}));
  assert.throws(() => createWarCoopAssaultServerV115(game, {tokens: [keys[0], keys[0]]}));
  assert.throws(() => createWarCoopAssaultServerV115(game, {tokens: [...keys, 'E'.repeat(43)]}));
  const {view} = await openRoom(t, 3);
  const state = await view(2);
  assert.equal(state.roster.length, 3);
  assert.equal(state.role, 'wing');
  assert.ok(state.roster.every(item => game.DEFAULT_WAR_RULES_V6.units.some(unit => unit.id === item.unitId)));
  assert.equal(new Set(state.roster.map(item => item.id)).size, 3);
});

test('four clients reserve separate V6 teams and their commander waits for all four', async t => {
  const {exchange, view} = await openRoom(t, 4);
  const initial = await view(0);
  assert.equal(initial.stage, 'planning');
  assert.equal((await exchange(0, order(initial, 'launch'))).status, 422);
  assert.equal((await exchange(1, {...order(await view(1), 'ready'), teamId: initial.teamId})).status, 400);
  const strangers = await openRoom(t, 2);
  assert.equal((await strangers.exchange(3)).status, 401);

  const ids = [];
  for (let index = 0; index < 4; index++) {
    const before = await view(index);
    ids.push(before.teamId);
    const marked = await exchange(index, order(before, 'ready'));
    assert.equal(marked.status, 200);
    assert.equal(marked.body.state.roster.filter(member => member.ready).length, index + 1);
  }
  assert.equal(new Set(ids).size, 4);
  assert.equal((await exchange(1, order(await view(1), 'launch'))).status, 422);
  const approved = await exchange(0, order(await view(0), 'launch'));
  assert.equal(approved.status, 200);
  const started = approved.body.state;
  const expenses = started.roster.map(member =>
    game.DEFAULT_WAR_RULES_V6.units.find(unit => unit.id === member.unitId).upkeepRav);
  assert.equal(started.requisition.rav, initial.requisition.rav - expenses.reduce((a, b) => a + b, 0));
  assert.equal(started.stage, 'started');
  assert.equal((await view(3)).revision, started.revision);
});

test('two authenticated allies share AP and cannot deploy twice into the one entry position', async t => {
  const {exchange, view} = await openRoom(t, 2, 2400);
  for (const player of [0, 1]) {
    assert.equal((await exchange(player, order(await view(player), 'ready'))).status, 200);
  }
  assert.equal((await exchange(0, order(await view(0), 'launch'))).status, 200);
  assert.equal((await exchange(1, order(await view(1), 'upgrade-ap'))).status, 422);

  let simultaneous;
  let inputs;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [first, second] = await Promise.all([view(0), view(1)]);
    if (first.revision !== second.revision) continue;
    inputs = [first, second];
    simultaneous = await Promise.all(inputs.map((entry, index) => exchange(index, order(entry, 'deploy'))));
    if (simultaneous.some(reply => reply.status === 200)) break;
  }
  assert.deepEqual(simultaneous.map(reply => reply.status).sort(), [200, 409]);
  const winner = simultaneous[0].status === 200 ? 0 : 1;
  const next = 1 - winner;
  const first = simultaneous[winner].body.state;
  const cost = inputs[winner].requisition.deployAp;
  assert.equal(first.requisition.ap, inputs[winner].requisition.ap - cost);
  assert.deepEqual(first.fighters.map(actor => [actor.teamId, actor.x]), [[inputs[winner].teamId, 5]]);
  const blockedByOwnAlly = await exchange(next, order(await view(next), 'deploy'));
  assert.equal(blockedByOwnAlly.status, 409);
  assert.equal(blockedByOwnAlly.body.error, 'deployment-occupied');
  const replay = await exchange(winner, order(await view(winner), 'deploy'));
  assert.equal(replay.body.error, 'duplicate-order');

  const deadline = Date.now() + 8000;
  let nextState;
  do {
    nextState = await view(next);
    if (nextState.deploymentAvailable && nextState.requisition.ap >= nextState.requisition.deployAp) break;
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  const second = await exchange(next, order(nextState, 'deploy'));
  assert.equal(second.status, 200);
  assert.equal(second.body.state.requisition.ap, nextState.requisition.ap - nextState.requisition.deployAp);
  assert.deepEqual(new Set(second.body.state.fighters.map(actor => actor.teamId)), new Set(inputs.map(input => input.teamId)));
  assert.equal(new Set(second.body.state.fighters.map(actor => actor.x)).size, 2);
});
