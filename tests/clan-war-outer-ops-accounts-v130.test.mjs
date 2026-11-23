import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {once} from 'node:events';
import test from 'node:test';
import {loadWarOuterOpsRulesV115} from '../scripts/serve-clan-war-outer-ops-v115.mjs';
import {
  createMemoryOuterOpsStoreV130, createSupabaseIdentityV130, createSupabaseOuterOpsStoreV130,
  createWarOuterOpsAccountsServerV130, WarOuterOpsConflictV130,
} from '../scripts/serve-clan-war-outer-ops-accounts-v130.mjs';

const war = await loadWarOuterOpsRulesV115();
const secret = Buffer.alloc(32, 7);
const accounts = {
  'jwt-a.payload.sig': '00000000-0000-4000-8000-00000000000a',
  'jwt-b.payload.sig': '00000000-0000-4000-8000-00000000000b',
};
const authenticate = async authorization => {
  const id = accounts[/^Bearer (.+)$/.exec(authorization ?? '')?.[1]];
  return id ? {id} : undefined;
};
const command = (state, kind, id, fields = {}) => ({id, revision: state.revision, sequence: state.nextSequence, kind, ...fields});

async function open(t, store, clock) {
  const server = createWarOuterOpsAccountsServerV130(war, {store, authenticate, secret, clock, tickMs: 250});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  const stop = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  t.after(async () => { if (server.listening) await stop(); });
  async function request({order, token = 'jwt-a.payload.sig', date} = {}) {
    const response = await fetch(url + (order ? '/order' : '/state'), {
      method: order ? 'POST' : 'GET', signal: AbortSignal.timeout(3000),
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Connection: 'close',
        ...(date ? {Date: date} : {})},
      ...(order ? {body: JSON.stringify(order)} : {}),
    });
    return {status: response.status, body: await response.json()};
  }
  return {request, stop};
}

test('each Supabase account owns its Outer Ops campaign; the server clock settles a signed receipt once', async t => {
  const store = createMemoryOuterOpsStoreV130();
  const epoch = 1_000_000_000;
  let now = epoch;
  const first = await open(t, store, () => now);
  assert.equal((await first.request({token: 'forged.token.sig'})).status, 401);
  const fresh = (await first.request()).body;
  assert.equal(fresh.clanId, accounts['jwt-a.payload.sig']);
  assert.equal(fresh.revision, 0);
  assert.equal((await store.list()).length, 0, 'reading creates no campaign row');

  const launched = await first.request({order: command(fresh, 'start', 'launch-1', fresh.suggestedDispatch),
    date: 'Fri, 01 Jan 2100 00:00:00 GMT'});
  assert.equal(launched.status, 200);
  const operation = launched.body.state.operations[0];
  assert.equal(operation.startedAt, epoch, 'the server clock, not the client Date, starts the mandate');
  assert.equal((await first.request({token: 'jwt-b.payload.sig'})).body.operations.length, 0, 'another account sees nothing');
  assert.equal((await first.request({order: command(launched.body.state, 'start', 'launch-1', fresh.suggestedDispatch)})).body.error,
    'duplicate-order');
  assert.equal((await first.request({order: {...command(launched.body.state, 'recall', 'forged', {operationId: operation.id}), dueAt: 0}})).status, 400);

  await first.stop();
  const second = await open(t, store, () => now);
  const caught = (await second.request()).body;
  assert.deepEqual(caught.operations.map(item => item.id), [operation.id], 'a new server catches up from the stored snapshot');
  assert.equal(caught.revision, launched.body.state.revision);

  now = operation.dueAt;
  const until = Date.now() + 5000;
  let row;
  while (Date.now() < until) {
    row = await store.load(accounts['jwt-a.payload.sig']);
    if (row.receipts.length) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(row.receipts.length, 1, 'the server tick settles without a client request');
  const {signature, ...sealed} = row.receipts[0];
  assert.equal(signature, createHmac('sha256', secret).update(JSON.stringify(sealed)).digest('hex'));
  assert.equal(sealed.operationId, operation.id);
  assert.equal(sealed.settledAt, operation.dueAt);
  assert.deepEqual(row.commandIds, ['launch-1']);
  now += 100_000;
  assert.equal((await second.request()).body.receipts.length, 1, 'later reads add no receipt');
  assert.equal((await store.load(accounts['jwt-b.payload.sig'])), null);
});

test('two authority servers on the same account accept one order and one settlement only', async t => {
  const memory = createMemoryOuterOpsStoreV130();
  // Both authorities must read the same revision before either commits.
  let waiting = [];
  const store = {...memory, load: async id => {
    const row = await memory.load(id);
    await new Promise(resolve => {
      waiting.push(resolve);
      if (waiting.length === 2) { for (const release of waiting) release(); waiting = []; }
      setTimeout(resolve, 300);
    });
    return row;
  }};
  const epoch = 2_000_000_000;
  let now = epoch;
  const [left, right] = [await open(t, store, () => now), await open(t, store, () => now)];
  const state = (await left.request()).body;
  const order = command(state, 'start', 'race-1', state.suggestedDispatch);
  const answers = await Promise.all([left.request({order}), right.request({order})]);
  assert.deepEqual(answers.map(answer => answer.status).sort(), [200, 409]);
  const row = await memory.load(accounts['jwt-a.payload.sig']);
  assert.deepEqual(row.commandIds, ['race-1']);
  assert.equal(row.world.outer.length, 1, 'one mandate, no duplicated unit');
  now = row.world.outer[0].dueAt;
  await Promise.all([left.request(), right.request(), left.request(), right.request()]);
  const settled = await memory.load(accounts['jwt-a.payload.sig']);
  assert.equal(settled.receipts.length, 1, 'concurrent catch-up settles the loot once');
  assert.equal(settled.world.reports.filter(report => report.id === row.world.outer[0].id).length, 1);
});

test('the memory store refuses a stale revision and duplicate rows like the Postgres commit', async () => {
  const store = createMemoryOuterOpsStoreV130();
  const id = accounts['jwt-a.payload.sig'];
  const campaign = revision => ({revision, sequence: 1, previousTime: 1, sourceSha: 'v6', world: {outer: []}});
  await store.commit(id, 0, campaign(1), [{id: 'o', sequence: 1, kind: 'start', acceptedAt: 1}], []);
  await assert.rejects(store.commit(id, 0, campaign(1), [], []), WarOuterOpsConflictV130);
  await assert.rejects(store.commit(id, 1, campaign(2), [{id: 'o', sequence: 2, kind: 'recall', acceptedAt: 2}], []), WarOuterOpsConflictV130);
  assert.equal((await store.load(id)).revision, 1);
});

test('the Supabase store and identity speak PostgREST and GoTrue with the right keys', async () => {
  const calls = [];
  const user = '00000000-0000-4000-8000-00000000000a';
  const reply = (status, body) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
  const fetcher = async (url, init = {}) => {
    calls.push({url: String(url), method: init.method ?? 'GET', headers: init.headers, body: init.body});
    const path = new URL(url).pathname;
    if (path === '/auth/v1/user') return init.headers.Authorization === 'Bearer a.b.c' ? reply(200, {id: user}) : reply(401, {});
    if (path === '/rest/v1/yautja_war_campaigns') return reply(200, [{user_id: user, revision: 4, sequence: 2, previous_time: 9, source_sha: 'v6', world: {outer: []}}]);
    if (path === '/rest/v1/yautja_war_orders') return reply(200, [{order_id: 'o1'}, {order_id: 'o2'}]);
    if (path === '/rest/v1/yautja_war_receipts') return reply(200, [{body: {operationId: 'op'}, signature: 'f'.repeat(64)}]);
    if (path === '/rest/v1/rpc/yautja_war_commit_v130') {
      return JSON.parse(init.body).p_expected_revision === 4 ? reply(200, 5) : reply(400, {code: '40001', message: 'changed'});
    }
    return reply(404, {});
  };
  const base = 'https://example.supabase.co';
  const identity = createSupabaseIdentityV130({url: base, apiKey: 'publishable', fetcher});
  assert.deepEqual(await identity('Bearer a.b.c'), {id: user});
  assert.equal(await identity('Bearer x.y.z'), undefined);
  const before = calls.length;
  assert.equal(await identity('Bearer not a jwt'), undefined);
  assert.equal(calls.length, before, 'a malformed bearer never reaches Supabase');
  assert.equal(calls[0].headers.apikey, 'publishable');

  const store = createSupabaseOuterOpsStoreV130({url: base, serviceKey: 'service', fetcher});
  const loaded = await store.load(user);
  assert.deepEqual(loaded, {revision: 4, sequence: 2, previousTime: 9, world: {outer: []},
    commandIds: ['o1', 'o2'], receipts: [{operationId: 'op', signature: 'f'.repeat(64)}]});
  const campaignCall = calls.find(call => call.url.includes('yautja_war_campaigns'));
  assert.equal(campaignCall.headers.Authorization, 'Bearer service');
  assert.match(campaignCall.url, /user_id=eq\.00000000-0000-4000-8000-00000000000a/);
  const receipt = {operationId: 'op2', settledAt: 3, report: {}, signature: 'e'.repeat(64)};
  assert.equal(await store.commit(user, 4, {revision: 5, sequence: 3, previousTime: 3, sourceSha: 'v6', world: {}},
    [{id: 'o3', sequence: 3, kind: 'recall', acceptedAt: 3}], [receipt]), 5);
  const rpc = JSON.parse(calls.at(-1).body);
  assert.deepEqual(rpc.p_receipts, [{operationId: 'op2', settledAt: 3, signature: 'e'.repeat(64),
    body: {operationId: 'op2', settledAt: 3, report: {}}}]);
  await assert.rejects(store.commit(user, 3, {revision: 4, sequence: 3, previousTime: 3, sourceSha: 'v6', world: {}}, [], []),
    WarOuterOpsConflictV130);
  await assert.rejects(store.load('not-a-uuid'));
});
