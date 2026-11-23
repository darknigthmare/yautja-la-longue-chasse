#!/usr/bin/env node
/** CW130 browser proof: the real OuterOpsAccountPanelV130 against the account authority
 * (memory store, test identity, server-owned clock). Real clicks; captures retained. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {loadWarOuterOpsRulesV115} from './serve-clan-war-outer-ops-v115.mjs';
import {createMemoryOuterOpsStoreV130, createWarOuterOpsAccountsServerV130} from './serve-clan-war-outer-ops-accounts-v130.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const out = path.resolve(root, option('--output', 'production/qa/evidence/cw130-outer-ops-account-20261123'));
const executablePath = option('--chromium', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome');
await mkdir(out, {recursive: true});

const user = '00000000-0000-4000-8000-0000000000c1';
const token = 'qa-header.qa-payload.qa-signature';
const clock = {value: 1_800_000_000_000};
const store = createMemoryOuterOpsStoreV130();
const war = await loadWarOuterOpsRulesV115();

const page$ = createServer();
page$.listen(0, '127.0.0.1');
await once(page$, 'listening');
const pageOrigin = 'http://127.0.0.1:' + page$.address().port;
const authority = createWarOuterOpsAccountsServerV130(war, {store, secret: Buffer.alloc(32, 9), clock: () => clock.value, tickMs: 250,
  authenticate: async authorization => authorization === 'Bearer ' + token ? {id: user} : undefined, allowedOrigins: [pageOrigin]});
authority.listen(0, '127.0.0.1');
await once(authority, 'listening');
const authorityUrl = 'http://127.0.0.1:' + authority.address().port;

const entry = `import {createRoot} from "react-dom/client";import Panel from "./app/game/OuterOpsAccountPanelV130";
import styles from "./app/game/ClanWarOperationsV115.module.css";
createRoot(document.getElementById("root")).render(<div className={styles.root}><Panel url=${JSON.stringify(authorityUrl)} refreshMs={500}/></div>);`;
const bundle = await build({stdin: {contents: entry, resolveDir: root, loader: 'tsx'}, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic', outfile: 'panel.js', logLevel: 'silent', loader: {'.module.css': 'local-css'},
  define: {'process.env.NODE_ENV': '"production"'}});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css'))?.contents ?? Buffer.alloc(0);
page$.on('request', (request, response) => {
  const files = {'/': ['text/html', '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Outer Ops compte</title><link rel="stylesheet" href="/panel.css"><body style="margin:0;background:#0b1512"><div id="root"></div><script src="/panel.js"></script></body></html>'],
    '/panel.js': ['text/javascript', js], '/panel.css': ['text/css', css]};
  const file = files[request.url];
  response.writeHead(file ? 200 : 404, {'Content-Type': (file?.[0] ?? 'text/plain') + '; charset=utf-8'});
  response.end(file?.[1] ?? '');
});

const report = {schema: 1, scope: 'Real OuterOpsAccountPanelV130 in Chromium against the CW130 account authority with an in-memory store and a test identity. Not the Supabase project, not GameClient.', captures: [], steps: []};
const browser = await chromium.launch({executablePath, args: ['--no-sandbox']});
try {
  const context = await browser.newContext({viewport: {width: 900, height: 760}, deviceScaleFactor: 2});
  await context.addInitScript(([key, value]) => window.localStorage.setItem(key, value),
    ['yautja-long-hunt.cloud.session-v71', JSON.stringify({accessToken: token, refreshToken: 'qa-refresh-token', expiresAt: 4e9, user: {id: user, email: 'qa@example.invalid'}})]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const capture = async name => {
    const buffer = await page.locator('[data-outer-ops-account-v130]').screenshot();
    await writeFile(path.join(out, name + '.png'), buffer);
    report.captures.push({file: name + '.png', sha256: createHash('sha256').update(buffer).digest('hex')});
  };
  await page.goto(pageOrigin + '/');
  const panel = page.locator('[data-outer-ops-account-v130]');
  await panel.getByText(/RAV \d+ · révision 0/).waitFor();
  await capture('01-account-state');

  await panel.getByRole('button', {name: /^Confier /}).click();
  await panel.getByText(/1 mandat\(s\) en cours/).waitFor();
  const launched = await store.load(user);
  assert.equal(launched.world.outer.length, 1);
  assert.equal(launched.world.outer[0].startedAt, clock.value, 'the mandate starts on the server clock');
  report.steps.push({step: 'dispatch', revision: launched.revision, startedAt: launched.world.outer[0].startedAt, dueAt: launched.world.outer[0].dueAt});
  await capture('02-dispatched');

  await panel.getByRole('button', {name: 'Rappeler'}).click();
  await panel.getByText('Retour au clan', {exact: false}).waitFor();
  const recalled = await store.load(user);
  assert.ok(recalled.world.outer[0].recall);
  report.steps.push({step: 'recall', revision: recalled.revision, dueAt: recalled.world.outer[0].dueAt});
  await capture('03-recalled');

  clock.value = recalled.world.outer[0].dueAt;
  await panel.getByRole('list', {name: 'Derniers reçus signés'}).waitFor({timeout: 10000});
  const settled = await store.load(user);
  assert.equal(settled.receipts.length, 1);
  assert.equal(settled.receipts[0].report.outcome, 'retreat');
  report.steps.push({step: 'settled', revision: settled.revision, receipt: {operationId: settled.receipts[0].operationId, settledAt: settled.receipts[0].settledAt, outcome: settled.receipts[0].report.outcome}});
  await capture('04-signed-receipt');

  const mobile = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
  await mobile.addInitScript(([key, value]) => window.localStorage.setItem(key, value),
    ['yautja-long-hunt.cloud.session-v71', JSON.stringify({accessToken: token, refreshToken: 'qa-refresh-token', expiresAt: 4e9, user: {id: user, email: 'qa@example.invalid'}})]);
  const narrow = await mobile.newPage();
  await narrow.goto(pageOrigin + '/');
  await narrow.locator('[data-outer-ops-account-v130]').getByText(/reçu\(s\) signé\(s\)/).waitFor();
  const overflow = await narrow.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, 'no horizontal scroll at phone width');
  const buffer = await narrow.locator('[data-outer-ops-account-v130]').screenshot();
  await writeFile(path.join(out, '05-phone-width.png'), buffer);
  report.captures.push({file: '05-phone-width.png', sha256: createHash('sha256').update(buffer).digest('hex')});

  const signedOut = await browser.newContext();
  const local = await signedOut.newPage();
  await local.goto(pageOrigin + '/');
  await local.waitForTimeout(500);
  assert.equal(await local.locator('[data-outer-ops-account-v130]').count(), 0, 'without a cloud session the local mode stays alone');
  report.steps.push({step: 'signed-out', panelRendered: false});
  assert.deepEqual(errors, []);
  report.result = 'PASS';
} finally {
  await browser.close();
  authority.close();
  page$.close();
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({result: report.result ?? 'FAIL', captures: report.captures.length, output: path.relative(root, out)}));
