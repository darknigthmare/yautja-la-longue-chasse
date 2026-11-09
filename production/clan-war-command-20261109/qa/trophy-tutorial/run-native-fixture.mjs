/** Real-component browser recipe. Explicitly not the Next/GameClient recipe. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(base, '../../../..');
const folder = path.join(base, process.env.TROPHY_TUTORIAL_ATTEMPT ?? 'native-fixture/attempt-1');
await fs.mkdir(folder, { recursive: true });
const lock = await fs.open(path.join(folder, 'run.lock'), 'wx'); await lock.close();
const sha = data => createHash('sha256').update(data).digest('hex');
const { build } = await import(pathToFileURL(path.join(root, 'node_modules/esbuild/lib/main.js')).href);
const { chromium } = await import(pathToFileURL(path.join(root, 'node_modules/playwright-core/index.mjs')).href);
const built = await build({ entryPoints: [path.join(base, 'fixture.tsx')], bundle: true, write: false, outdir: folder,
  metafile: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'file', '.webp': 'file' },
  absWorkingDir: root, logLevel: 'warning' });
const outputs = new Map();
for (const item of built.outputFiles) { const name = path.basename(item.path); outputs.set('/' + name, item.contents); }
const js = [...outputs.keys()].find(n => n.endsWith('.js')), css = [...outputs.keys()].find(n => n.endsWith('.css'));
assert.ok(js && css);
const html = Buffer.from(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutoriel trophées — fixture réelle</title><link rel="stylesheet" href="${css}"><body style="margin:0"><div id="root"></div><script type="module" src="${js}"></script></body></html>`);
const sources = await Promise.all(Object.keys(built.metafile.inputs).filter(n => !n.startsWith('node_modules/')).map(async name => ({ path: name, sha256: sha(await fs.readFile(path.join(root, name))) })));
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), scope: 'Actual production component/reducer, controlled fixture persistence owner. No Next, full GameClient, physical controller, human art or complete BUILD5-09 admission claimed.',
  sourceBefore: sources, checks: [], errors: [], consoleErrors: [], requestFailures: [], httpErrors: [], screenshots: [], snapshots: [], fixtureOnly: true };
const check = (name, condition, detail) => { report.checks.push({ name, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) }); assert.ok(condition, name); };
const server = http.createServer(async (request, response) => {
  try {
    const name = new URL(request.url, 'http://local').pathname;
    if (name === '/' || name === '/index.html') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
    if (outputs.has(name)) { response.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : 'text/css'); response.end(outputs.get(name)); return; }
    if (name.startsWith('/game/')) {
      const file = path.resolve(root, 'public', '.' + name);
      assert.ok(file.startsWith(path.join(root, 'public/game/')));
      const data = await fs.readFile(file); response.setHeader('Content-Type', file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/svg+xml'); response.end(data); return;
    }
    if (name === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    response.writeHead(404); response.end();
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
page.on('requestfailed', r => report.requestFailures.push({ url: r.url(), error: r.failure() }));
page.on('response', r => { if (r.status() >= 400) report.httpErrors.push({ url: r.url(), status: r.status() }); });
const url = `http://127.0.0.1:${server.address().port}`;
const scene = page.locator('[data-trophy-tutorial-v6]');
const snapshot = async label => { const data = await page.evaluate(() => window.__trophyTutorialFixture()); report.snapshots.push({ label, ...data }); await fs.writeFile(path.join(folder, `${label}.json`), JSON.stringify(data, null, 2) + '\n'); return data; };
const shot = async filename => { await page.screenshot({ path: path.join(folder, filename), fullPage: true }); const data = await fs.readFile(path.join(folder, filename)); report.screenshots.push({ filename, bytes: data.length, sha256: sha(data) }); };
const stateStep = async () => Number(await scene.getAttribute('data-trophy-tutorial-step'));
const atStep = n => page.waitForFunction(n => document.querySelector('[data-trophy-tutorial-v6]')?.getAttribute('data-trophy-tutorial-step') === String(n), n);
const approach = async () => { const button = page.locator('[data-trophy-tutorial-approach]'); if (await button.count()) await button.click(); await page.locator('[data-trophy-tutorial-manipulation]').waitFor({ timeout: 20000 }); };
const panel = () => page.locator('[data-trophy-tutorial-manipulation]');
const tick = async label => panel().getByLabel(label, { exact: true }).check();
const choose = async label => panel().getByRole('button', { name: label, exact: true }).click();
const range = async (name, value) => {
  const slider = panel().getByRole('slider', { name, exact: true });
  await slider.focus(); await slider.press('Home');
  for (let i = 0; i < value; i++) await slider.press('ArrowRight');
  assert.equal(Number(await slider.inputValue()), value);
};
const finish = async n => { await page.locator('[data-trophy-tutorial-confirm]').click(); await atStep(n); };
const reload = async n => { await page.reload(); await atStep(n); await page.bringToFront(); };
try {
  await page.goto(url, { waitUntil: 'networkidle' }); await atStep(0); await page.bringToFront();
  check('Opening the component does not create a durable model checkpoint', (await snapshot('00-before')).ledger === undefined);
  check('First physical station requires walking', await page.locator('[data-trophy-tutorial-approach]').count() === 1);
  await shot('00-niche-start.png');
  await approach(); await tick('Ouvrir la niche'); await tick('Repérer les deux rails'); await range('Marge latérale', 20);
  await page.getByLabel('Refuser l’écriture du fixture', { exact: true }).check();
  await page.locator('[data-trophy-tutorial-confirm]').click();
  await page.locator('[data-trophy-tutorial-notice]').filter({ hasText: 'attend son enregistrement' }).waitFor();
  check('A refused writer leaves gesture and durable object unchanged', await stateStep() === 0 && (await snapshot('01-refused')).ledger === undefined);
  await shot('01-refused-write.png'); await page.getByLabel('Refuser l’écriture du fixture', { exact: true }).uncheck(); await finish(1);
  await approach(); await range('Cadrage horizontal', 50); await range('Cadrage vertical', 50); await range('Ouverture du cadre', 60);
  const framing = await page.locator('[data-trophy-tutorial-frame]').evaluate(node => {
    const frame = node.querySelector('i').getBoundingClientRect(), reference = node.querySelector('[data-trophy-frame-reference]').getBoundingClientRect(), model = node.querySelector('svg>path').getBoundingClientRect();
    const inside = box => box.left >= frame.left && box.top >= frame.top && box.right <= frame.right && box.bottom <= frame.bottom;
    return { modelInside: inside(model), referenceInside: inside(reference) };
  });
  check('Native framing includes the model, ground and fixed reference', framing.modelInside && framing.referenceInside, framing);
  await shot('02-observation-frame.png'); await finish(2);
  await approach(); await tick('Marque visible'); await tick('Repère du sol'); await tick('Supposer une victoire de chasse (non observée)');
  await page.locator('[data-trophy-tutorial-confirm]').click();
  await page.locator('[data-trophy-tutorial-notice]').filter({ hasText: 'aucune chasse' }).waitFor();
  check('Unobserved kill is rejected through the native form', await stateStep() === 2);
  await panel().getByLabel('Supposer une victoire de chasse (non observée)', { exact: true }).uncheck(); await finish(3);
  const first = await snapshot('03-discovery-before-reload'); await shot('03-discovery.png'); await reload(3);
  const resumed = await snapshot('03-discovery-after-reload');
  check('Discovery interruption reloads the same physical checkpoint and unique model', JSON.stringify(first.ledger) === JSON.stringify(resumed.ledger));
  await approach(); await choose('Berceau ajusté : appuis libres'); await finish(4);
  await approach(); await range('Attache gauche · appui 18–28', 23); await range('Attache droite · appui 72–82', 77); await finish(5);
  await approach(); await choose('Modèle de l’atelier · provenance locale'); await tick('Fermer le contenant et prendre sa poignée'); await finish(6);
  check('The packed model is visibly carried and has one location', await scene.getAttribute('data-trophy-tutorial-location') === 'carried-to-admission'); await shot('06-carry-container.png');
  await approach(); await range('Glisser la caisse jusqu’à la butée', 100); await tick('L’étiquette de source reste visible'); await finish(7);
  await approach(); await choose('Conserver le résultat inconnu'); await choose('Original fermé · travailler sur le modèle'); await finish(8);
  await approach(); await choose('Face');
  const face = await snapshot('09-face-before-reload'); await reload(8); const faceReloaded = await snapshot('09-face-after-reload');
  check('Face-only interruption retains the view without completing the nine-th gesture', JSON.stringify(face.ledger) === JSON.stringify(faceReloaded.ledger) && faceReloaded.ledger.completedSteps === 8 && faceReloaded.ledger.events.at(-1).values.view === 'face');
  check('Re-entry guidance names the preserved face and remaining views', (await page.locator('[data-trophy-tutorial-notice]').innerText()).includes('Reprenons le profil puis le revers'));
  await approach();
  for (const width of [390, 320]) { await page.setViewportSize({ width, height: 844 }); await page.locator('[data-trophy-tutorial-manipulation]').scrollIntoViewIfNeeded(); check(`${width}px has no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await shot(`09-face-${width}.png`); }
  await page.setViewportSize({ width: 1440, height: 1000 }); await choose('Profil'); await choose('Revers'); await finish(9);
  await approach(); await tick('Relever la fibre fragile sur l’arête'); await tick('Relever la marque centrale'); await choose('Conserver l’état initial'); await finish(10);
  await approach(); await choose('Soulever la fibre détachable prévue'); await tick('Conserver la fibre avec l’index du modèle'); await finish(11);
  await approach(); await range('Appuis · repère 25', 25); await range('Motif · repère 75', 75); await finish(12);
  await approach(); for (const piece of [1, 2, 3]) await choose(`Pièce ${piece}`); await finish(13);
  await approach(); await choose('Base adaptée aux appuis'); await range('Équilibre · centre 50', 50); await finish(14);
  await approach(); await range('Lumière rasante', 30); await finish(15);
  await approach(); await tick('Provenance : modèle de l’atelier'); await tick('Marque centrale observée'); await tick('Âge : question non résolue'); await finish(16);
  const plaque = await snapshot('16-plaque-before-reload'); await shot('16-plaque.png'); await reload(16); const plaqueReloaded = await snapshot('16-plaque-after-reload');
  check('Ready-plaque interruption keeps source, observations and carried cradle unchanged', JSON.stringify(plaque.ledger) === JSON.stringify(plaqueReloaded.ledger));
  await approach(); await tick('Verrouiller le rail gauche'); await tick('Verrouiller le rail droit'); await finish(17);
  await approach(); await choose('1 · Fermer'); await choose('2 · Vérifier la marge : 20'); await choose('3 · Rouvrir'); await tick('Confirmer l’exposition du modèle'); await finish(18);
  const final = await snapshot('18-exhibited'); await shot('18-cabinet-complete.png');
  check('18 gestures and all individual views finish through native controls', final.ledger.completedSteps === 18 && final.ledger.revision === 21 && final.inspection.status === 'valid');
  check('All six transports use the real continuous room motion', final.ledger.walked > 1800 && final.ledger.objectLocation === 'cabinet');
  check('The fixture campaign, real trophies, rank and inventory are unchanged', JSON.stringify(final.save) === JSON.stringify(report.snapshots[0].save));
  await page.getByRole('button', { name: 'Revenir au poste', exact: true }).click();
  await page.getByRole('button', { name: 'Revenir au tutoriel', exact: true }).click(); await atStep(18);
  check('Leaving and remounting does not duplicate the model or its gestures', JSON.stringify((await snapshot('18-remounted')).ledger) === JSON.stringify(final.ledger));
  await reload(18); check('Final exposed object survives browser reload', JSON.stringify((await snapshot('18-reloaded')).ledger) === JSON.stringify(final.ledger));
  check('No JavaScript, console, request or HTTP error occurred', !report.errors.length && !report.consoleErrors.length && !report.requestFailures.length && !report.httpErrors.length);
  report.passed = true;
} catch (error) { report.passed = false; report.failure = error.stack ?? String(error); await shot('failure.png').catch(() => undefined); }
finally {
  report.sourceAfter = await Promise.all(sources.map(async row => ({ path: row.path, sha256: sha(await fs.readFile(path.join(root, row.path))) })));
  report.sourceBeforeAfterEqual = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.passed = report.passed === true && report.sourceBeforeAfterEqual;
  report.browserVersion = browser.version(); report.finishedAt = new Date().toISOString();
  report.checksPassed = report.checks.filter(c => c.passed).length; report.checksFailed = report.checks.filter(c => !c.passed).length;
  report.bundle = { js: { sha256: sha(outputs.get(js)), bytes: outputs.get(js).length }, css: { sha256: sha(outputs.get(css)), bytes: outputs.get(css).length }, sourceInputs: sources.length };
  await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.copyFile(fileURLToPath(import.meta.url), path.join(folder, 'recipe-used.mjs'));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify({ passed: report.passed, checksPassed: report.checksPassed, checksFailed: report.checksFailed, folder: path.relative(root, folder), failure: report.failure }));
if (!report.passed) process.exitCode = 1;
