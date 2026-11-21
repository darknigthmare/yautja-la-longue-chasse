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

const move = (view, id, target) => ({
  id, sequence: view.nextSequence, revision: view.revision, tick: view.tick, kind: 'move', target,
});

test('the practice server requires two distinct provisioned credentials', () => {
  assert.throws(() => createClanWarPracticeServer(game, {hunterToken: tokens.hunter, rivalToken: tokens.hunter}));
  assert.throws(() => createClanWarPracticeServer(game, {hunterToken: '', rivalToken: tokens.rival}));
});

test('the HTTP authority authenticates simultaneous participants and preserves private state through a new socket', async t => {
  const server = createClanWarPracticeServer(game, {
    hunterToken: tokens.hunter, rivalToken: tokens.rival, seed: 42, tickMs: 4000,
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const {port} = server.address();
  const origin = 'http://127.0.0.1:' + port;
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

test('an authenticated duel takes the real objective for three server ticks', async t => {
  const server = createClanWarPracticeServer(game, {
    hunterToken: tokens.hunter, rivalToken: tokens.rival, seed: 43, tickMs: 300,
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  const deadline = Date.now() + 12_000;
  const view = async token => (await fromSocket(origin + '/state', token)).body;
  const next = async (token, command) => {
    while (Date.now() < deadline) {
      const reply = await fromSocket(origin + '/order', token, {body: command(await view(token))});
      if (reply.status === 200) return reply.body.state;
      // A timer edge or a fighter's one-order-per-tick rule can postpone the next input.
      assert.ok(reply.status === 409 || reply.status === 422, JSON.stringify(reply.body));
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    assert.fail('The requested legal order did not arrive before the deadline');
  };

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
  const closed = await fromSocket(origin + '/order', tokens.rival, {
    body: {...move(finished, 'after-victory', null), kind: 'hold'},
  });
  assert.equal(closed.status, 422);
  assert.equal((await view(tokens.hunter)).revision, finished.revision);
});
