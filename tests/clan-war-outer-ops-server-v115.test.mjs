import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {createWarOuterOpsServerV115, loadWarOuterOpsRulesV115} from '../scripts/serve-clan-war-outer-ops-v115.mjs';

const war = await loadWarOuterOpsRulesV115();
const clans = [{id: 'clan-a', token: 'A'.repeat(43)}, {id: 'clan-b', token: 'B'.repeat(43)}];
const api = fileURLToPath(new URL('../scripts/serve-clan-war-outer-ops-v115.mjs', import.meta.url));
const exec = promisify(execFile);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'yautja-outer-qa-'));
  const databasePath = join(directory, 'outer.sqlite');
  const close = server => new Promise((resolve, reject) =>
    server.close(error => error ? reject(error) : resolve()));
  const servers = [];
  t.after(async () => {
    for (const server of servers) if (server.listening) await close(server);
    await rm(directory, {recursive: true, force: true});
  });
  async function open(options = {}) {
    const server = createWarOuterOpsServerV115(war, {databasePath, clans, tickMs: 250, ...options});
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port;
    async function request({order, token = clans[0].token, path, date} = {}) {
      const response = await fetch(url + (path ?? (order ? '/order' : '/state')), {
        method: order ? 'POST' : 'GET', signal: AbortSignal.timeout(3000),
        headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Connection: 'close',
          ...(date ? {Date: date} : {})},
        ...(order ? {body: JSON.stringify(order)} : {}),
      });
      return {status: response.status, body: await response.json()};
    }
    return {url, request, stop: () => close(server)};
  }
  return {open, databasePath};
}

function diskState(databasePath, clanId = clans[0].id) {
  const db = new DatabaseSync(databasePath, {readOnly: true});
  try {
    const saved = JSON.parse(db.prepare('SELECT state FROM outer_ops_clans WHERE id=?').get(clanId).state);
    const secret = Buffer.from(db.prepare('SELECT secret FROM outer_ops_authority WHERE id=1').get().secret, 'hex');
    return {saved, secret};
  } finally {
    db.close();
  }
}

async function waitForReceiptOnDisk(databasePath, timeout = 5000) {
  const until = Date.now() + timeout;
  do {
    const disk = diskState(databasePath);
    if (disk.saved.receipts.length) return disk;
    await delay(50);
  } while (Date.now() < until);
  assert.fail('Le travailleur Outer Ops n’a pas réglé le mandat sans requête client.');
}

function command(state, kind, id, fields = {}) {
  return {id, revision: state.revision, sequence: state.nextSequence, kind, ...fields};
}

function eligibleIncidentScenario(epoch) {
  const rules = war.DEFAULT_WAR_RULES_V6;
  const seed = war.createWarOperationsV115(rules);
  const teamIds = [seed.teams[0].id];
  const focus = 'recon';
  for (const site of rules.territories) {
    const launched = war.beginWarOperationV115(seed, 'outer', site.id, teamIds, rules, epoch, focus);
    if (launched.accepted && war.warOuterIncidentV143(launched.state.outer[0], epoch + 1000, rules)) {
      return {targetId: site.id, teamIds, focus};
    }
  }
  assert.fail('Aucun passage V6 avec incident natif n’est accessible.');
}

test('the server owns dispatch, incident, deadline and a signed settlement even with a forged client clock', async t => {
  const {open, databasePath} = await setup(t);
  const epoch = 1000000000;
  let now = epoch;
  const {url, request, stop} = await open({clock: () => now});
  assert.equal((await request({token: 'X'.repeat(43)})).status, 401);
  const scenario = eligibleIncidentScenario(epoch);
  const futureClock = 'data:text/javascript,Date.now%20%3D%20()%20%3D%3E%204102444800000';
  const {stdout} = await exec(process.execPath, ['--import', futureClock, api, 'start',
    scenario.targetId, scenario.teamIds[0], scenario.focus], {
    timeout: 5000, env: {...process.env, YAUTJA_CLAN_OUTER_URL: url, YAUTJA_CLAN_OUTER_TOKEN: clans[0].token},
  });
  const dispatch = JSON.parse(stdout).state;
  const operation = dispatch.operations[0];
  assert.equal(operation.startedAt, epoch);
  assert.ok(operation.dueAt > epoch);
  assert.equal(dispatch.teams.find(team => team.id === scenario.teamIds[0]).assigned, operation.id);
  assert.equal((await request({token: clans[1].token})).body.operations.length, 0);

  const early = await request({order: command(dispatch, 'incident', 'early',
    {operationId: operation.id, decision: 'detour'})});
  assert.equal(early.status, 422);
  assert.equal((await request({order: {...command(dispatch, 'recall', 'false-time', {operationId: operation.id}),
    now: 4102444800000, dueAt: 0}})).status, 400);
  assert.equal((await request({order: command(dispatch, 'settle', 'settle-now')})).status, 400);
  assert.equal((await request({path: '/tick'})).status, 404);
  assert.equal((await request({date: 'Fri, 01 Jan 2100 00:00:00 GMT'})).body.operations[0].dueAt, operation.dueAt);

  now = epoch + 1000;
  const crossing = (await request()).body;
  assert.ok(crossing.operations[0].incident?.passageId);
  const decision = command(crossing, 'incident', 'detour-once', {operationId: operation.id, decision: 'detour'});
  const detour = await request({order: decision});
  assert.equal(detour.status, 200);
  assert.equal(detour.body.state.operations[0].dueAt, operation.dueAt + 10000);
  assert.equal(detour.body.state.operations[0].routeIncident.passageId, crossing.operations[0].incident.passageId);
  assert.equal(detour.body.state.rav, dispatch.rav);
  assert.equal((await request({order: decision})).body.error, 'duplicate-order');
  assert.equal((await request({order: command((await request({token: clans[1].token})).body, 'recall', 'foreign',
    {operationId: operation.id}), token: clans[1].token})).status, 422);
  const stillDue = detour.body.state.operations[0].dueAt;
  now = stillDue - 1;
  const before = (await request()).body;
  assert.equal(before.receipts.length, 0);
  assert.equal(before.operations[0].remainingMs, 1);
  now = stillDue;
  const {saved, secret} = await waitForReceiptOnDisk(databasePath);
  assert.equal(saved.world.outer.length, 0);
  assert.equal(saved.receipts.length, 1);
  const receipt = saved.receipts[0];
  const {signature, ...sealed} = receipt;
  assert.equal(signature, createHmac('sha256', secret).update(JSON.stringify(sealed)).digest('hex'));
  assert.equal(receipt.dueAt, stillDue);
  assert.equal(receipt.settledAt, stillDue);
  assert.deepEqual(receipt.report, saved.world.reports[0]);
  assert.equal(receipt.report.mode, 'outer');
  assert.notEqual(receipt.report.outcome, 'retreat');

  await stop();
  const restarted = await open({clock: () => now});
  assert.deepEqual((await restarted.request()).body.receipts, [receipt]);
  assert.equal((await restarted.request({order: decision})).body.error, 'duplicate-order');
  now += 100000;
  assert.equal((await restarted.request()).body.receipts.length, 1);
});

test('on the real server clock, recall holds the same squad until its delayed retreat receipt', async t => {
  const {open, databasePath} = await setup(t);
  const {request} = await open();
  const before = (await request()).body;
  const launched = await request({order: command(before, 'start', 'one-launch', before.suggestedDispatch)});
  assert.equal(launched.status, 200);
  const active = launched.body.state;
  const operation = active.operations[0];
  const called = await request({order: command(active, 'recall', 'one-recall', {operationId: operation.id}),
    date: 'Fri, 01 Jan 2100 00:00:00 GMT'});
  assert.equal(called.status, 200);
  const recalled = called.body.state;
  assert.ok(recalled.operations[0].remainingMs >= 10000);
  assert.equal(recalled.rav, active.rav, 'a recall creates no refund');
  assert.equal(recalled.teams.find(team => team.id === operation.teamIds[0]).assigned, operation.id);
  assert.equal((await request({order: command(recalled, 'recall', 'repeat-recall', {operationId: operation.id})})).status, 422);

  await delay(100);
  assert.equal(diskState(databasePath).saved.receipts.length, 0);
  const {saved} = await waitForReceiptOnDisk(databasePath, 16000);
  assert.equal(saved.receipts.length, 1);
  assert.equal(saved.receipts[0].report.outcome, 'retreat');
  assert.equal(saved.receipts[0].operationId, operation.id);
  assert.ok(saved.receipts[0].settledAt >= recalled.operations[0].dueAt);
  assert.equal(saved.world.assignments[operation.teamIds[0]], undefined);
  assert.equal(saved.world.rav, active.rav);
});
