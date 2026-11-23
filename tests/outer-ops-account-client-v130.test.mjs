import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import {build} from 'esbuild';
import {loadWarOuterOpsRulesV115} from '../scripts/serve-clan-war-outer-ops-v115.mjs';
import {createMemoryOuterOpsStoreV130, createWarOuterOpsAccountsServerV130} from '../scripts/serve-clan-war-outer-ops-accounts-v130.mjs';

const bundled = await build({stdin: {contents: 'export * from "./app/game/systems/outerOpsAccountClientV130";', resolveDir: process.cwd(), loader: 'ts'},
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const client = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const war = await loadWarOuterOpsRulesV115();
const user = '00000000-0000-4000-8000-00000000000a';
const session = {accessToken: 'header.payload.signature', refreshToken: 'refresh-token-long', expiresAt: 2e9, user: {id: user, email: 'qa@example.invalid'}};
const origin = 'https://yautja.example';

async function serve(t, now) {
  const server = createWarOuterOpsAccountsServerV130(war, {
    store: createMemoryOuterOpsStoreV130(), secret: Buffer.alloc(32, 3), clock: () => now.value, tickMs: 250,
    authenticate: async authorization => authorization === 'Bearer ' + session.accessToken ? {id: user} : undefined,
    allowedOrigins: [origin],
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('the account client is disabled without a configured server or a cloud session', () => {
  assert.equal(client.outerOpsAccountAvailableV130(null, session), false);
  assert.equal(client.outerOpsAccountAvailableV130('https://ops.example', null), false);
  assert.equal(client.outerOpsAccountAvailableV130('http://ops.example', session), false, 'remote plain HTTP is refused');
  assert.equal(client.outerOpsAccountAvailableV130('http://127.0.0.1:8790', session), true);
  assert.equal(client.outerOpsAccountAvailableV130('https://ops.example', session), true);
});

test('the account client reads the server state, dispatches, decides and recalls through the authority', async t => {
  const now = {value: 3_000_000_000};
  const url = await serve(t, now);
  const api = client.createOuterOpsAccountClientV130(url);
  const fresh = await api.state(session);
  assert.equal(fresh.clanId, user);
  assert.equal(fresh.operations.length, 0);
  const launched = await api.order(session, client.outerOpsOrderV130(fresh, 'start', fresh.suggestedDispatch, 'ui-launch'));
  assert.equal(launched.state.operations.length, 1);
  const operation = launched.state.operations[0];
  await assert.rejects(api.order(session, client.outerOpsOrderV130(fresh, 'start', fresh.suggestedDispatch, 'ui-launch')),
    error => error instanceof client.OuterOpsAccountErrorV130 && error.code === 'duplicate-order');
  const recalled = await api.order(session, client.outerOpsOrderV130(launched.state, 'recall', {operationId: operation.id}, 'ui-recall'));
  assert.ok(recalled.state.operations[0].recall);
  await assert.rejects(api.state({...session, accessToken: 'other.token.value'}),
    error => error instanceof client.OuterOpsAccountErrorV130 && error.status === 401);
});

test('the authority answers browser preflight and reads only for its allowed origin', async t => {
  const url = await serve(t, {value: 3_000_000_000});
  const preflight = await fetch(url + '/order', {method: 'OPTIONS', headers: {Origin: origin,
    'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type'}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i);
  const read = await fetch(url + '/state', {headers: {Origin: origin, Authorization: 'Bearer ' + session.accessToken}});
  assert.equal(read.headers.get('access-control-allow-origin'), origin);
  const foreign = await fetch(url + '/state', {headers: {Origin: 'https://evil.example', Authorization: 'Bearer ' + session.accessToken}});
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(url + '/order', {method: 'OPTIONS', headers: {Origin: 'https://evil.example'}})).status, 404);
});
