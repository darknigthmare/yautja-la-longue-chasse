import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// These checks exercise the local carnet, never the game or physical hardware.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/qa/v112-validation-kit/r3');
const inputPaths = ['public/aide/qualification-chasse.html', 'scripts/qa-qualification-kit-v112.mjs', 'docs/hunt-mechanics-v112.json', 'docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx', 'docs/qa/v112-hunt-continuation/hunt-review-v112.pdf', 'public/aide/YAUTJA_V112_MECANIQUES_CHASSE.xlsx', 'public/aide/YAUTJA_V112_REVUES_IMPRIMABLE.pdf'];
async function inputFingerprints() {
  return Promise.all(inputPaths.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return { path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
}
const frozenInputs = await inputFingerprints();
const html = await readFile(path.join(root, 'public/aide/qualification-chasse.html'));
const downloads = await Promise.all([
  ['YAUTJA_V112_MECANIQUES_CHASSE.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['YAUTJA_V112_REVUES_IMPRIMABLE.pdf', 'application/pdf'],
].map(async ([filename, contentType]) => ({ filename, contentType, url: '/aide/' + filename, bytes: await readFile(path.join(root, 'public/aide', filename)) })));
const source = JSON.parse(await readFile(path.join(root, 'docs/hunt-mechanics-v112.json'), 'utf8'));
const originals = source.sheets.find(sheet => sheet.name === 'Restant').rows;
const decisionRows = source.sheets.find(sheet => sheet.name === 'Reprise').rows;
const reviewedDecisions = decisionRows.map(row => ({ target: row.target, status: row.status }));
assert.deepEqual(reviewedDecisions.map(row => row.target).sort(), ['CHA112-02', 'CHA112-05', 'ROU112-05', 'ROU112-06'], 'The reference journal contains exactly the four reviewed decisions');
assert.ok(reviewedDecisions.every(row => row.status === 'VALIDE_AUTOMATISE'));
for (const decision of decisionRows) {
  const original = source.sheets.flatMap(sheet => sheet.rows).find(row => row.id === decision.target && typeof row.rule === 'string');
  assert.equal(decision.criterion, `${original.rule} | ${original.acceptance}`, 'Every reviewed decision preserves its exact original rule and acceptance');
}
assert.equal(originals.length, 8);
assert.ok(originals.every(row => row.status === 'NON_QUALIFIE'), 'All eight remaining qualifications stay open');
const workbookHash = createHash('sha256').update(await readFile(path.join(root, 'docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx'))).digest('hex');
assert.equal(createHash('sha256').update(downloads[0].bytes).digest('hex'), workbookHash, 'The public workbook must be the delivered workbook');
assert.deepEqual(downloads[1].bytes, await readFile(path.join(root, 'docs/qa/v112-hunt-continuation/hunt-review-v112.pdf')), 'The public printable must be the delivered PDF');
await mkdir(output, { recursive: true });
const serverRequests = [];
const server = createServer((request, response) => {
  serverRequests.push({ path: request.url, method: request.method, referrer: request.headers.referer ?? null });
  if (request.url === '/aide/qualification-chasse.html') { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html); return; }
  const download = downloads.find(file => file.url === request.url);
  if (download) { response.writeHead(200, { 'content-type': download.contentType }).end(download.bytes); return; }
  response.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/aide/qualification-chasse.html`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const requests = [];
  const downloadChecks = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  async function checkReviewedDecisions(targetPage) {
    const displayed = await targetPage.locator('#current-reviewed-decisions [data-reviewed-target]').evaluateAll(nodes => nodes.map(node => ({ target: node.textContent.trim(), status: node.dataset.reviewedStatus })));
    assert.deepEqual(displayed, reviewedDecisions, 'Displayed reference decisions must match the Reprise journal exactly');
    assert.match(await targetPage.locator('#current-reviewed-decisions').textContent(), /Ces quatre décisions ne proviennent pas de ce carnet/);
  }
  await checkReviewedDecisions(page);
  assert.equal(await page.title(), 'Qualification de la chasse — carnet local du validateur');
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  assert.equal(await page.locator('#collect-browser').isDisabled(), true);
  assert.equal(await page.locator('#export-report').isDisabled(), true);
  assert.equal(await page.locator('select[name$="-status"]').count(), 51);
  assert.equal(await page.locator('select[name$="-status"]').evaluateAll(nodes => nodes.every(node => node.value === 'NON_EXECUTE')), true);
  assert.equal(await page.locator('input, select, textarea').evaluateAll(nodes => nodes.every(node => node.labels.length > 0)), true, 'Every field has a programmatic label');
  const sharedTasks = await page.locator('#novice-objective-source > li').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.taskId,
    objective: node.querySelector('[data-task-objective]').textContent.trim(),
    observation: node.querySelector('[data-task-observation]').textContent.trim(),
  })));
  assert.deepEqual(sharedTasks.map(task => task.id), Array.from({ length: 9 }, (_, i) => `NOV112-${String(i + 1).padStart(2, '0')}`));
  assert.ok(sharedTasks.every(task => task.objective && task.observation));
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'carnet');
  await page.locator('#preview-report').click();
  let report = JSON.parse(await page.locator('#report-preview').textContent());
  assert.equal(report.optionalBrowserRecord, null);
  assert.equal(report.scope.automaticPass, false);
  assert.deepEqual(report.scope.criteriaClosedByThisReport, []);
  assert.equal(report.referenceWorkbook.sha256, workbookHash, 'Reference fingerprint must follow the delivered workbook');
  assert.equal(report.beginners.participants.length, 5);
  assert.ok(report.beginners.participants.every(participant => participant.tasks.length === 9 && !participant.noviceDeclaredByValidator));
  for (const criterion of report.criteria) {
    const original = originals.find(row => row.id === criterion.id);
    assert.equal(criterion.originalRule, original.rule);
    assert.equal(criterion.originalAcceptance, original.acceptance);
    assert.equal(criterion.status, 'NON_EXECUTE');
    assert.equal(criterion.personallyAttested, false);
  }
  await page.locator('#configuration details summary').click();
  await page.locator('#browser-consent').check();
  await page.locator('#collect-browser').click();
  const browserRecord = JSON.parse(await page.locator('#browser-preview').textContent());
  assert.equal(browserRecord.physicalDeviceQualified, false);
  assert.deepEqual(browserRecord.viewportCss.width, 390);
  await page.locator('#preview-report').click();
  report = JSON.parse(await page.locator('#report-preview').textContent());
  assert.equal(report.optionalBrowserRecord.scope, 'PAGE_D_AIDE_UNIQUEMENT');
  await page.locator('#browser-consent').uncheck();
  assert.equal(await page.locator('#browser-preview').isHidden(), true);
  await page.locator('#preview-report').click();
  report = JSON.parse(await page.locator('#report-preview').textContent());
  assert.equal(report.optionalBrowserRecord, null, 'Revocation removes the optional data');
  await page.locator('#REM112-04-status').selectOption('ATTESTE_PAR_VALIDATEUR');
  await page.locator('#preview-report').click();
  assert.equal(await page.locator('#export-error').isVisible(), true);
  assert.match(await page.locator('#export-error').textContent(), /manette physique/);
  assert.equal(await page.locator('#export-report').isDisabled(), true);
  await page.locator('#REM112-04-status').selectOption('NON_EXECUTE');
  await page.locator('#REM112-07-status').selectOption('ATTESTE_PAR_VALIDATEUR');
  await page.locator('#REM112-07-office').selectOption('LIBREOFFICE_COMPATIBILITE');
  await page.locator('#preview-report').click();
  assert.match(await page.locator('#export-error').textContent(), /Excel réellement utilisé/);
  await page.locator('#REM112-07-status').selectOption('NON_EXECUTE');
  await page.locator('#REM112-01-status').selectOption('ATTESTE_PAR_VALIDATEUR');
  await page.locator('#preview-report').click();
  assert.match(await page.locator('#export-error').textContent(), /Participant 1/);
  await page.locator('#REM112-01-status').selectOption('NON_EXECUTE');
  await page.locator('#REM112-02-status').selectOption('PARTIEL');
  await page.locator('#REM112-02-notes').fill('DONNEE SYNTHETIQUE : vérification du carnet uniquement. <script>alert("x")</script>');
  await page.locator('#review-consent').check();
  await page.locator('#preview-report').click();
  assert.equal(await page.locator('#export-error').isHidden(), true);
  assert.equal(await page.locator('#export-report').isEnabled(), true);
  const preview = await page.locator('#report-preview').textContent();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-report').click()]);
  assert.equal(await readFile(await download.path(), 'utf8'), preview, 'The exported report exactly matches the reviewed JSON');
  assert.match(download.suggestedFilename(), /^qualification-chasse-v112-\d{4}-\d{2}-\d{2}\.json$/);
  await page.locator('#REM112-02-notes').fill('Modification après relecture');
  assert.equal(await page.locator('#export-report').isDisabled(), true, 'Any edit requires a fresh review');
  await page.locator('#review-consent').uncheck();
  await page.locator('#REM112-02-status').selectOption('NON_EXECUTE');
  await page.locator('#REM112-02-notes').fill('');
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.locator('#preview-report').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
    await page.locator('#report-preview').evaluate(node => node.hidden = true);
    await page.locator('#configuration details').evaluate(node => node.open = false);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `carnet-${viewport.width}.png`), fullPage: false });
    await page.locator('#documents').screenshot({ path: path.join(output, `carnet-documents-${viewport.width}.png`) });
  }
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie })), { local: 0, session: 0, cookies: '' });
  assert.deepEqual(requests, [url], 'No request follows the single page load');
  assert.deepEqual(errors, []);
  await page.reload();
  await page.locator('#preview-report').click();
  report = JSON.parse(await page.locator('#report-preview').textContent());
  assert.ok(report.criteria.every(c => c.status === 'NON_EXECUTE' && !c.observations));
  assert.equal(report.optionalBrowserRecord, null);
  async function checkDownloads(targetPage, javaScriptEnabled) {
    for (const [index, file] of downloads.entries()) {
      const link = targetPage.locator(index === 0 ? '#download-workbook' : '#download-printable');
      assert.equal(await link.getAttribute('href'), file.url);
      assert.equal(await link.getAttribute('download'), file.filename);
      const [download] = await Promise.all([targetPage.waitForEvent('download'), link.click()]);
      const bytes = await readFile(await download.path());
      assert.equal(download.suggestedFilename(), file.filename);
      assert.deepEqual(bytes, file.bytes, 'A voluntary download must preserve the published artifact byte for byte');
      downloadChecks.push({ javaScriptEnabled, path: file.url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  assert.deepEqual(requests, [url, url], 'Reload is the only additional automatic request');
  assert.deepEqual(serverRequests.map(request => request.path), ['/aide/qualification-chasse.html', '/aide/qualification-chasse.html']);
  await checkDownloads(page, true);
  assert.deepEqual(requests, [url, url], 'Downloads are handled outside the page request stream');
  assert.deepEqual(serverRequests.map(request => request.path), ['/aide/qualification-chasse.html', '/aide/qualification-chasse.html', ...downloads.map(file => file.url)], 'Only the two explicit download clicks add server requests');
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  try {
    const noScript = await noScriptContext.newPage();
    const staticRequests = [];
    noScript.on('request', request => staticRequests.push(request.url()));
    await noScript.goto(url, { waitUntil: 'load' });
    await checkReviewedDecisions(noScript);
    assert.equal(await noScript.locator('noscript').isVisible(), true);
    assert.equal(await noScript.locator('#criteria > article').count(), 6);
    assert.equal(await noScript.locator('#criteria [data-criterion-protocol][open]').count(), 6, 'Every detailed protocol is expanded without JavaScript');
    for (const criterion of report.criteria) {
      assert.equal(await noScript.locator(`#${criterion.id} [data-criterion-rule]`).textContent(), criterion.originalRule);
      assert.equal(await noScript.locator(`#${criterion.id} [data-criterion-acceptance]`).textContent(), criterion.originalAcceptance);
      assert.equal(await noScript.locator(`#${criterion.id} [data-criterion-steps]`).isVisible(), true);
      assert.ok(await noScript.locator(`#${criterion.id} [data-criterion-steps] > li`).count() >= 3);
    }
    const staticTasks = await noScript.locator('#novice-objective-source > li').evaluateAll(nodes => nodes.map(node => ({
      id: node.dataset.taskId,
      objective: node.querySelector('[data-task-objective]').textContent.trim(),
      observation: node.querySelector('[data-task-observation]').textContent.trim(),
    })));
    assert.deepEqual(staticTasks, sharedTasks, 'All nine objectives and observation instructions remain readable from the same HTML source');
    assert.equal(await noScript.locator('#novice-objective-source').isVisible(), true);
    assert.equal(await noScript.locator('select[name$="-status"]').count(), 0, 'No human result is manufactured by the fallback');
    assert.equal(await noScript.locator('#export-report').isDisabled(), true);
    assert.equal(await noScript.locator('#reference-workbook-sha256').textContent(), workbookHash);
    assert.equal(await noScript.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await noScript.screenshot({ path: path.join(output, 'carnet-sans-js-1280.png'), fullPage: true });
    assert.deepEqual(await noScript.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie })), { local: 0, session: 0, cookies: '' });
    assert.deepEqual(staticRequests, [url]);
    await checkDownloads(noScript, false);
    assert.deepEqual(staticRequests, [url]);
    assert.deepEqual(serverRequests.map(request => request.path), ['/aide/qualification-chasse.html', '/aide/qualification-chasse.html', ...downloads.map(file => file.url), '/aide/qualification-chasse.html', ...downloads.map(file => file.url)]);
    assert.ok(serverRequests.every(request => request.method === 'GET' && !request.path.includes('?')));
    assert.ok(serverRequests.filter(request => downloads.some(file => file.url === request.path)).every(request => request.referrer === null), 'Voluntary downloads do not transmit carnet fields or a referrer');
  } finally { await noScriptContext.close(); }
  assert.deepEqual(await inputFingerprints(), frozenInputs, 'Frozen carnet, runner, criteria and download inputs remain unchanged during the run');
  const summary = { result: 'OK', scope: 'LOCAL_CARNET_SOFTWARE_ONLY', chromeVersion: browser.version(), nodeVersion: process.version, viewports: ['390x844', '1280x900'], criteriaAutomaticallyClosed: [], referenceReviewedDecisions: reviewedDecisions, remainingCriteriaOpen: originals.map(row => row.id), sourceGuard: { result: 'UNCHANGED_DURING_RUN', files: frozenInputs }, checks: ['source criteria unchanged', 'four reference decisions match Reprise with and without JavaScript', 'all eight remaining qualifications stay open', '45 novice observations empty by default', 'manual consent and revocation', 'invalid attestations rejected', 'Excel / LibreOffice distinction', 'reviewed JSON equals download', 'edit invalidates review', 'field labels and keyboard skip link', 'no horizontal page overflow', 'no automatic follow-up network requests', 'no browser storage', 'reload clears report', 'JavaScript disabled: six complete protocols expanded', 'JavaScript disabled: nine shared novice objectives and observations', 'JavaScript disabled: no result or export fabricated', 'voluntary XLSX/PDF downloads preserve exact bytes with and without JavaScript'], downloadChecks, htmlSha256: createHash('sha256').update(html).digest('hex'), workbookSha256: workbookHash };
  await writeFile(path.join(output, 'carnet-software-report.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
