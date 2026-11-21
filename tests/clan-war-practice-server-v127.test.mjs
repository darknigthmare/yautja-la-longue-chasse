import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {once} from 'node:events';
import {request} from 'node:http';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {createClanWarPracticeServer, loadClanWarPracticeRules} from '../scripts/serve-clan-war-practice-v127.mjs';

const game = await loadClanWarPracticeRules();
const launch = promisify(execFile);
const tokens = {hunter: 'H'.repeat(43), rival: 'R'.repeat(43)};

function fromSocket(url, token, options = {}) {
  const {body, contentType = 'application/json'} = options;
  const headers = {...(token ? {Authorization: 'Bearer ' + token} : {})};
  if (body !== undefined) headers['Content-Type'] = contentType;
  return new Promise((resolve, reject) => {
    const outgoing = request(url, {method: body === undefined ? 'GET' : 'POST', headers, agent: false}, incoming => {
      const data = [];
      incoming.on('data', chunk => data.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => {
        try {
          resolve({status: incoming.statusCode, headers: incoming.headers,
            body: JSON.parse(Buffer.concat(data).toString('utf8'))});
        } catch (error) {
          reject(error);
        }
      });
    });
    outgoing.on('error', reject);
    outgoing.setTimeout(3000, () => outgoing.destroy(new Error('Clan practice response timed out')));
    outgoing.end(body === undefined || typeof body === 'string' ? body : JSON.stringify(body));
  });
}

async function openPractice(t, options = {}) {
  const server = createClanWarPracticeServer(game, {
    hunterToken: tokens.hunter, rivalToken: tokens.rival, ...options,
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return 'http://127.0.0.1:' + server.address().port;
}

const move = (view, id, target) => ({
  id, sequence: view.nextSequence, revision: view.revision, tick: view.tick, kind: 'move', target,
});

test('the practice server requires two distinct provisioned credentials', () => {
  assert.throws(() => createClanWarPracticeServer(game, {hunterToken: tokens.hunter, rivalToken: tokens.hunter}));
  assert.throws(() => createClanWarPracticeServer(game, {hunterToken: '', rivalToken: tokens.rival}));
});

test('the HTTP authority authenticates simultaneous participants and preserves private state through a new socket', async t => {
  const origin = await openPractice(t, {seed: 42, tickMs: 4000});
  const read = token => fromSocket(origin + '/state', token);
  const post = (token, body, contentType) => fromSocket(origin + '/order', token, {body, contentType});
  async function againstCurrentState(token, draft) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await post(token, draft((await read(token)).body));
      if (response.body.error !== 'state-changed') return response;
    }
    throw new Error('Unable to obtain a stable revision for the test');
  }

  const anonymous = await read('');
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers['www-authenticate'], /^Bearer/);
  assert.equal((await read('X'.repeat(43))).status, 401);
  assert.equal((await fromSocket(origin + '/tick', tokens.hunter, {body: {}})).status, 404);

  const [initialHunter, initialRival] = await Promise.all([read(tokens.hunter), read(tokens.rival)]);
  assert.equal(initialHunter.status, 200);
  assert.equal(initialRival.status, 200);
  assert.equal(initialHunter.headers['cache-control'], 'no-store');
  assert.equal(initialHunter.body.stage, 'started');
  assert.equal(initialHunter.body.roomId, initialRival.body.roomId);
  assert.equal(initialHunter.body.scenarioId, initialRival.body.scenarioId);
  assert.deepEqual(initialHunter.body.fighters, [{side: 'hunter', x: 1, y: 1, hp: 12}]);
  assert.deepEqual(initialRival.body.fighters, [{side: 'rival', x: 7, y: 1, hp: 12}]);
  assert.equal('events' in initialHunter.body, false);

  let draft = move(initialHunter.body, 'shared-id', [2, 1]);
  assert.equal((await post(tokens.hunter, {...draft, actorId: 'exercise-rival'})).status, 400);
  assert.equal((await post(tokens.hunter, draft, 'text/plain')).status, 415);
  assert.equal((await post(tokens.hunter, '{invalid')).status, 400);
  assert.equal((await post(tokens.hunter, 'x'.repeat(1100))).status, 413);
  assert.equal((await againstCurrentState(tokens.hunter,
    hunter => move(hunter, 'illegal-move', [8, 5]))).status, 422);
  assert.equal((await read(tokens.hunter)).body.nextSequence, 1);

  // Both requests cite precisely the same confirmed revision. Exactly one can consume it.
  let simultaneous;
  for (let attempt = 0; attempt < 3; attempt++) {
    const base = (await read(tokens.hunter)).body;
    draft = move(base, 'shared-id', [2, 1]);
    simultaneous = await Promise.all([
      post(tokens.hunter, draft),
      post(tokens.rival, move({...base, nextSequence: 1}, 'shared-id', [6, 1])),
    ]);
    if (simultaneous.some(reply => reply.status === 200)) break;
  }
  assert.deepEqual(simultaneous.map(reply => reply.status).sort(), [200, 409]);
  const hunterWon = simultaneous[0].status === 200;
  const winnerToken = hunterWon ? tokens.hunter : tokens.rival;
  const otherToken = hunterWon ? tokens.rival : tokens.hunter;
  const expectedDestination = hunterWon ? [2, 1] : [6, 1];

  // Each call uses a fresh TCP connection. The same credential sees a persisted turn in this process.
  const again = (await read(winnerToken)).body;
  assert.deepEqual(again.fighters.map(fighter => [fighter.x, fighter.y]), [expectedDestination]);
  assert.equal(again.nextSequence, 2);
  assert.equal((await post(winnerToken, move(again, 'shared-id', expectedDestination))).body.error, 'duplicate-order');
  const otherAfter = (await read(otherToken)).body;
  assert.equal(otherAfter.nextSequence, 1);
  const otherReply = await againstCurrentState(otherToken,
    current => move(current, 'shared-id', hunterWon ? [6, 1] : [2, 1]));
  assert.equal(otherReply.status, 200, 'an independent actor can use its own command ID');
  assert.equal('hostTokenHash' in otherReply.body.state, false);
  assert.equal('receipts' in otherReply.body.state, false);

  const deadline = Date.now() + 5500;
  let after;
  do {
    await new Promise(resolve => setTimeout(resolve, 100));
    after = (await read(winnerToken)).body;
  } while (after.tick === again.tick && Date.now() < deadline);
  assert.ok(after.tick > again.tick, 'the server advances the clock without a client tick route');
  assert.ok(after.revision > again.revision);
  assert.equal((await post(winnerToken, {...draft, id: 'stale'})).body.error, 'state-changed');

  const clientPath = fileURLToPath(new URL('../scripts/play-clan-war-practice-v127.mjs', import.meta.url));
  const {stdout} = await launch(process.execPath, [clientPath, 'state'], {
    timeout: 5000,
    env: {...process.env, YAUTJA_CLAN_PRACTICE_URL: origin, YAUTJA_CLAN_PRACTICE_TOKEN: winnerToken},
  });
  const playerView = JSON.parse(stdout);
  assert.equal(playerView.side, hunterWon ? 'hunter' : 'rival');
  assert.deepEqual(playerView.fighters, after.fighters, 'the shipped client reads the authoritative board');
});

async function practiceView(origin, token) {
  const reply = await fromSocket(origin + '/state', token);
  assert.equal(reply.status, 200);
  return reply.body;
}

async function sendPracticeOrder(origin, token, command, deadline) {
  while (Date.now() < deadline) {
    const state = await practiceView(origin, token);
    assert.equal(state.stage, 'started');
    const reply = await fromSocket(origin + '/order', token, {body: command(state)});
    if (reply.status === 200) return reply.body.state;
    // A timer edge or a fighter's one-order-per-tick rule can postpone the next input.
    assert.ok(reply.status === 409 || reply.status === 422, JSON.stringify(reply.body));
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.fail('The requested legal order did not arrive before the test deadline');
}

test('an authenticated duel takes the real objective for three server ticks', async t => {
  const origin = await openPractice(t, {seed: 43, tickMs: 300});
  const deadline = Date.now() + 12_000;
  const view = token => practiceView(origin, token);
  const next = (token, command) => sendPracticeOrder(origin, token, command, deadline);

  await next(tokens.rival, state => ({...move(state, 'guard', null), kind: 'hold'}));
  let captured;
  for (const [index, point] of [[2, 1], [3, 1], [4, 1], [4, 2]].entries()) {
    captured = await next(tokens.hunter, state => move(state, 'cross-' + index, point));
  }
  assert.deepEqual(captured.map.capture, {x: 4, y: 2});
  assert.deepEqual(captured.fighters[0], {side: 'hunter', x: 4, y: 2, hp: 12});
  assert.equal(captured.winner, null);

  let finished;
  do {
    await new Promise(resolve => setTimeout(resolve, 40));
    finished = await view(tokens.rival);
  } while (!finished.winner && Date.now() < deadline);
  assert.equal(finished.winner, 'hunter');
  assert.equal(finished.stage, 'completed');
  assert.equal(finished.tick, captured.tick + 3);
  assert.deepEqual(finished.settlement, {winner: 'hunter', basis: 'objective',
    tick: finished.tick, revision: finished.revision, controlledTicks: {hunter: 3, rival: 0}});
  const closed = await fromSocket(origin + '/order', tokens.rival, {
    body: {...move(finished, 'after-victory', null), kind: 'hold'},
  });
  assert.equal(closed.status, 422);
  assert.equal((await view(tokens.hunter)).revision, finished.revision);
});

async function waitForSettlement(origin, token, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  do {
    const {body} = await fromSocket(origin + '/state', token);
    if (body.stage === 'completed') return body;
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  assert.fail('The authority did not settle the room before the test deadline');
}

test('the timeout settles identical draws for both sides and the clock cannot overwrite them', async t => {
  const origin = await openPractice(t, {seed: 44, turnLimit: 2, tickMs: 300});
  const draw = await waitForSettlement(origin, tokens.hunter);
  assert.equal(draw.remainingTicks, 0);
  assert.equal(draw.winner, null);
  assert.deepEqual(draw.settlement, {winner: null, basis: 'timeout-draw', tick: 2,
    revision: draw.revision, controlledTicks: {hunter: 0, rival: 0}});
  const refused = await fromSocket(origin + '/order', tokens.hunter, {body: move(draw, 'after-draw', [2, 1])});
  assert.equal(refused.status, 422);
  await new Promise(resolve => setTimeout(resolve, 350));
  const rival = (await fromSocket(origin + '/state', tokens.rival)).body;
  assert.deepEqual(rival.settlement, draw.settlement);
  assert.equal(rival.revision, draw.revision);
});

test('an authorized withdrawal produces a single victor even if both parties submit orders', async t => {
  const origin = await openPractice(t, {seed: 45, tickMs: 3000});
  const {body: waiting} = await fromSocket(origin + '/state', tokens.rival);
  const leave = {...move(waiting, 'leave', null), kind: 'retreat'};
  const results = await Promise.all([
    fromSocket(origin + '/order', tokens.rival, {body: leave}),
    fromSocket(origin + '/order', tokens.rival, {body: {...leave, id: 'second-retreat'}}),
  ]);
  assert.deepEqual(results.map(reply => reply.status).sort(), [200, 409]);
  const resolved = results.find(reply => reply.status === 200).body.state;
  assert.deepEqual(resolved.settlement, {winner: 'hunter', basis: 'withdrawal', tick: waiting.tick,
    revision: waiting.revision + 1, controlledTicks: {hunter: 0, rival: 0}});
  assert.deepEqual((await waitForSettlement(origin, tokens.hunter)).settlement, resolved.settlement);
  const replay = await fromSocket(origin + '/order', tokens.rival, {body: leave});
  assert.equal(replay.body.error, results[0].status === 200 ? 'duplicate-order' : 'state-changed');
});

test('at the deadline controlled ticks win without needing elimination or three consecutive ticks', async t => {
  const origin = await openPractice(t, {seed: 46, turnLimit: 9, tickMs: 400});
  const deadline = Date.now() + 6000;
  for (const [index, point] of [[2, 1], [3, 1], [4, 1]].entries()) {
    await sendPracticeOrder(origin, tokens.hunter, state => move(state, 'stage-' + index, point), deadline);
  }
  let before;
  do {
    before = await practiceView(origin, tokens.hunter);
    if (before.remainingTicks <= 2) break;
    await new Promise(resolve => setTimeout(resolve, 30));
  } while (Date.now() < deadline);
  const entered = await sendPracticeOrder(origin, tokens.hunter,
    state => move(state, 'touch-objective', [4, 2]), deadline);
  const timed = await waitForSettlement(origin, tokens.rival);
  assert.equal(entered.stage, 'started');
  assert.equal(timed.tick, 9);
  assert.equal(timed.settlement.basis, 'timeout-control');
  assert.equal(timed.settlement.winner, 'hunter');
  assert.equal(timed.settlement.controlledTicks.hunter, 9 - entered.tick);
  assert.equal(timed.settlement.controlledTicks.rival, 0);
  assert.equal(timed.fighters[0].hp, 12, 'the losing fighter stayed alive');
});
