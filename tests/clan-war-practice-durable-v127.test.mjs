import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {createClanWarPracticeServer, loadClanWarPracticeRules} from '../scripts/serve-clan-war-practice-v127.mjs';

const tokens = {hunter: 'H'.repeat(43), rival: 'R'.repeat(43)};
const moduleUrl = new URL('../scripts/serve-clan-war-practice-v127.mjs', import.meta.url);
const bootstrap = [
  'import {createClanWarPracticeServer, loadClanWarPracticeRules} from ' + JSON.stringify(moduleUrl.href) + ';',
  'const game = await loadClanWarPracticeRules();',
  'const server = createClanWarPracticeServer(game, JSON.parse(process.env.YAUTJA_TEST_PRACTICE_OPTIONS));',
  "server.listen(0, '127.0.0.1', () => process.send('http://127.0.0.1:' + server.address().port));",
].join('\n');

async function directoryFor(t) {
  const directory = await mkdtemp(join(tmpdir(), 'yautja-practice-restart-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

async function launch(t, stateDirectory, options = {}) {
  const child = spawn(process.execPath, ['--input-type=module', '--eval', bootstrap], {
    env: {...process.env, YAUTJA_TEST_PRACTICE_OPTIONS: JSON.stringify({
      hunterToken: tokens.hunter, rivalToken: tokens.rival, stateDirectory, tickMs: 60000, ...options,
    })},
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let errors = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { errors += chunk; });
  const ended = new Promise(resolve => child.once('close', (code, signal) => resolve({code, signal})));
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    return ended;
  };
  t.after(stop);
  const origin = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('message', resolve);
    void ended.then(({code}) => reject(new Error('Processus du duel arrêté (' + code + ')\n' + errors)));
  });
  return {origin, stop};
}

async function play(origin, side, order) {
  const response = await fetch(origin + (order ? '/order' : '/state'), {
    method: order ? 'POST' : 'GET',
    headers: {Authorization: 'Bearer ' + tokens[side], 'Content-Type': 'application/json', Connection: 'close'},
    ...(order ? {body: JSON.stringify(order)} : {}),
    signal: AbortSignal.timeout(4000),
  });
  return {status: response.status, ...(await response.json())};
}

function draft(state, id, kind, target) {
  return {id, kind, target, sequence: state.nextSequence, revision: state.revision, tick: state.tick};
}

test('both actors resume accepted orders across killed processes, preserving scoped IDs', {timeout: 30000}, async t => {
  const directory = await directoryFor(t);
  let service = await launch(t, directory, {seed: 127});
  const state = async side => {
    const reply = await play(service.origin, side);
    assert.equal(reply.status, 200);
    return reply;
  };
  const order = (side, request) => play(service.origin, side, request);

  const hunterMove = draft(await state('hunter'), 'same-id', 'move', [2, 1]);
  assert.equal((await order('hunter', {...hunterMove, clientTime: 0})).status, 400);
  assert.equal((await order('hunter', hunterMove)).status, 200);
  const rivalMove = draft(await state('rival'), 'same-id', 'move', [6, 1]);
  assert.equal((await order('rival', rivalMove)).status, 200);
  const hunterBefore = await state('hunter');
  const rivalBefore = await state('rival');
  assert.equal(hunterBefore.nextSequence, 2);
  assert.equal(rivalBefore.nextSequence, 2);

  assert.equal((await service.stop()).signal, 'SIGKILL');
  service = await launch(t, directory);
  assert.deepEqual(await state('hunter'), hunterBefore);
  assert.deepEqual(await state('rival'), rivalBefore);
  assert.deepEqual(await order('hunter', hunterMove), {status: 409, error: 'duplicate-order'});
  assert.deepEqual(await order('rival', rivalMove), {status: 409, error: 'duplicate-order'});
  assert.deepEqual(await order('hunter', {...hunterMove, id: 'stale-but-different'}), {status: 409, error: 'state-changed'});
  await service.stop();
  const names = await readdir(directory);
  assert.deepEqual(names.sort(), ['00000.json', '00001.json', '00002.json']);
  for (const name of names) {
    const bytes = await readFile(join(directory, name), 'utf8');
    for (const secret of Object.values(tokens)) {
      assert.equal(bytes.includes(secret), false);
      assert.equal(bytes.includes(createHash('sha256').update(secret).digest('hex')), false);
    }
  }
});

test('an immediate withdrawal is recorded in the same transaction as its order', {timeout: 30000}, async t => {
  const directory = await directoryFor(t);
  let service = await launch(t, directory);
  const start = await play(service.origin, 'hunter');
  assert.equal(start.status, 200);
  const retreat = draft(start, 'withdraw-now', 'retreat', null);
  const accepted = await play(service.origin, 'hunter', retreat);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.state.settlement.basis, 'withdrawal');
  assert.equal(accepted.state.settlement.winner, 'rival');
  const stored = JSON.parse(await readFile(join(directory, '00001.json'), 'utf8'));
  assert.equal(stored.order.id, retreat.id);
  assert.deepEqual(stored.result.settlement, accepted.state.settlement);

  assert.equal((await service.stop()).signal, 'SIGKILL');
  service = await launch(t, directory);
  const restored = await play(service.origin, 'hunter');
  assert.equal(restored.status, 200);
  assert.deepEqual(restored.settlement, accepted.state.settlement);
  assert.equal(restored.stage, 'completed');
  assert.equal(restored.nextSequence, 2);
  assert.deepEqual(await play(service.origin, 'hunter', retreat), {status: 409, error: 'duplicate-order'});
  await service.stop();
});

test('only server ticks settle a draw and the persisted terminal tick resumes without advancement', {timeout: 30000}, async t => {
  const directory = await directoryFor(t);
  let service = await launch(t, directory, {tickMs: 250, turnLimit: 2});
  let before;
  for (let attempt = 0; attempt < 80; attempt++) {
    before = await play(service.origin, 'hunter');
    if (before.stage === 'completed') break;
    await delay(50);
  }
  assert.equal(before.status, 200);
  assert.equal(before.stage, 'completed');
  assert.equal(before.tick, 2);
  assert.equal(before.settlement.basis, 'timeout-draw');
  assert.equal(before.settlement.winner, null);
  await service.stop();

  service = await launch(t, directory, {tickMs: 250});
  await delay(400);
  assert.deepEqual(await play(service.origin, 'hunter'), before);
});

test('a second writer cannot replace a durable order and invalid outcomes fail closed at startup', {timeout: 30000}, async t => {
  const directory = await directoryFor(t);
  const first = await launch(t, directory);
  const second = await launch(t, directory);
  const request = draft(await play(first.origin, 'hunter'), 'winner-of-commit', 'hold', null);
  assert.equal((await play(first.origin, 'hunter', request)).status, 200);
  assert.deepEqual(await play(second.origin, 'rival'), {status: 500, error: 'practice-unavailable'});
  assert.deepEqual(await play(second.origin, 'hunter', {...request, id: 'competing-write'}), {status: 500, error: 'practice-unavailable'});
  await first.stop();
  await second.stop();

  const record = join(directory, '00001.json');
  const persisted = JSON.parse(await readFile(record, 'utf8'));
  assert.equal(persisted.order.id, request.id);
  persisted.result.revision += 1;
  await writeFile(record, JSON.stringify(persisted));
  const game = await loadClanWarPracticeRules();
  assert.throws(() => createClanWarPracticeServer(game, {
    hunterToken: tokens.hunter, rivalToken: tokens.rival, stateDirectory: directory,
  }), /journal du duel incohérente/);
});
