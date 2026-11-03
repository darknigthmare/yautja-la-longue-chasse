#!/usr/bin/env node
/** Read-only A4 companion for the original V112 review and outstanding criteria. */
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {buildHuntMechanicsWorkbook, resolveHuntReviewV112, sourceUrl} from './build-hunt-mechanics-workbook-v112.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);

export function buildHuntPrintableV112(source) {
  if (![2,3].includes(source.schemaVersion)) throw new TypeError('The printable companion requires the V112 review source');
  // Reuse the workbook's validation of the original identities, criteria and evidence.
  buildHuntMechanicsWorkbook(source);
  const selected = ['Cloture', 'Restant'].map(name => source.sheets.find(sheet => sheet.name === name));
  if (selected[0].rows.length !== 219 || selected[1].rows.length !== 8) throw new TypeError('All 219 reviews and eight outstanding criteria are required');
  const hash = sha256(canonical(source));
  const effective = resolveHuntReviewV112(source);
  const journal = source.sheets.find(sheet => sheet.name === 'Reprise');
  const fields = (columns,row,className='field') => columns.map(column => {
    const value = row[column.key] ?? '';
    const href = column.key === 'source' && value ? sourceUrl(source, row) : null;
    return `<div class="${className}" data-key="${escapeHtml(column.key)}"><dt>${escapeHtml(column.label)}</dt><dd>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(value)}</a>` : escapeHtml(value)}</dd></div>`;
  }).join('\n');
  const currentReview = row => {
    const target = row.target ?? row.id, entries = journal?.rows.filter(entry => entry.target === target) ?? [];
    if (!entries.length) return '';
    return `<aside class="current-state" data-current-target="${escapeHtml(target)}"><h4>État courant : <span data-effective-status>${escapeHtml(effective.get(target))}</span></h4>
<p>Les champs historiques ci-dessus sont conservés. Le journal suivant explique l’état courant.</p>
${entries.map(entry => `<section class="transition" data-transition="${escapeHtml(entry.id)}"><h5>${escapeHtml(entry.id)}</h5><dl>${fields(journal.columns,entry,'field transition-field')}</dl></section>`).join('\n')}</aside>`;
  };
  const sections = selected.map(sheet => `<section class="review-section" aria-labelledby="section-${sheet.name}">
<h2 id="section-${sheet.name}">${escapeHtml(sheet.title)}</h2>
<p>${sheet.rows.length} fiches · chaque champ reprend sa valeur dans la source JSON.</p>
${sheet.rows.map(row => `<article id="${escapeHtml(row.id)}" class="record" data-sheet="${sheet.name}" data-record="${escapeHtml(row.id)}">
<h3>${escapeHtml(row.id)}${row.target ? ' · ' + escapeHtml(row.target) : ''}</h3>
<dl>${fields(sheet.columns,row)}</dl>
${currentReview(row)}
</article>`).join('\n')}
</section>`).join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Chasse V112 — revues et critères restants, version imprimable</title>
<style>
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
html { color: #172b23; background: white; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.35; }
body { margin: 0 auto; max-width: 178mm; padding: 12mm 0; }
h1 { margin: 0 0 5mm; font-size: 22pt; line-height: 1.15; }
h2 { margin: 0 0 3mm; font-size: 16pt; line-height: 1.2; }
h3 { margin: 0 0 2.5mm; font-size: 12pt; line-height: 1.25; }
h4 { margin: 0 0 2.5mm; font-size: 11pt; line-height: 1.25; }
h5 { margin: 0 0 2.5mm; font-size: 10.5pt; line-height: 1.25; }
p { margin: 0 0 3mm; }
a { color: #174b86; text-decoration: underline; overflow-wrap: anywhere; }
nav { margin: 6mm 0; }
nav a { margin-right: 8mm; }
.metadata { margin: 5mm 0; }
.metadata div { margin-bottom: 2mm; overflow-wrap: anywhere; }
.legend { margin: 6mm 0; }
.legend div { margin-bottom: 2.5mm; }
.legend dt { font-weight: bold; }
.legend dd { margin: 0; }
.review-section { margin-top: 10mm; }
.record { margin: 5mm 0 6mm; padding-top: 3mm; border-top: 0.5pt solid #587466; break-inside: avoid-page; page-break-inside: avoid; }
.record dl { margin: 0; }
.field { display: grid; grid-template-columns: 43mm minmax(0, 1fr); gap: 3mm; margin-bottom: 1.3mm; }
.field dt { font-weight: bold; }
.field dd { margin: 0; min-height: 1.35em; overflow-wrap: anywhere; white-space: pre-wrap; }
.current-state { margin-top: 3mm; padding: 3mm; border-left: 1pt solid #587466; }
.transition { margin-top: 3mm; break-inside: avoid-page; }
@media screen { body { padding: 10mm 6mm; } }
@media (max-width: 620px) { .field { grid-template-columns: 1fr; gap: 0.5mm; } }
@media print { body { max-width: none; padding: 0; } .review-section { break-before: page; margin-top: 0; } h2, h3 { break-after: avoid; } a { color: inherit; } }
</style></head><body>
<header><h1>Chasse V112<br>Revues et critères restants</h1>
<p>Compagnon imprimable du suivi : 219 revues historiques et huit critères restants, présentés en fiches A4.</p>
<p>Le classeur comporte ${source.sheets.length} onglets. Ce document reprend les champs des feuilles Cloture et Restant${journal ? ' et les décisions du journal Reprise dans les fiches concernées' : ''} ; il n’ajoute aucune qualification.</p>
<div class="metadata"><div><strong>Date de la source :</strong> ${escapeHtml(source.asOf)}</div>
<div><strong>Source :</strong> docs/hunt-mechanics-v112.json</div>
<div><strong>Référence des liens :</strong> ${escapeHtml(source.reviewRef)}</div>
<div><strong>SHA256 des données JSON canoniques :</strong> ${hash}</div></div>
<nav aria-label="Sommaire"><a href="#section-Cloture">219 revues</a><a href="#section-Restant">8 critères restants</a></nav>
<h2>Légende des statuts de la source</h2><dl class="legend">${Object.entries(source.legend).map(([status, meaning]) => `<div><dt>${escapeHtml(status)}</dt><dd>${escapeHtml(meaning)}</dd></div>`).join('\n')}</dl>
</header><main>${sections}</main>
</body></html>\n`;
}

async function cli() {
  const options = {source:'docs/hunt-mechanics-v112.json', html:'outputs/qa-v112-printable/hunt-review-v112.html', pdf:null, chromium:process.env.AUDIT_CHROME_PATH || '/usr/bin/chromium'};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    if (!args[i].startsWith('--') || !Object.hasOwn(options, key) || !args[i + 1]) throw new Error('Usage: node scripts/build-hunt-printable-v112.mjs [--source JSON] [--html HTML] [--pdf PDF] [--chromium PATH]');
    options[key] = args[i + 1];
  }
  const sourcePath = resolve(root, options.source), htmlPath = resolve(root, options.html);
  const pdfPath = options.pdf ? resolve(root, options.pdf) : null;
  if (!htmlPath.endsWith('.html') || (pdfPath && !pdfPath.endsWith('.pdf')) || sourcePath === htmlPath || sourcePath === pdfPath) throw new Error('Use distinct .html and .pdf output files');
  const raw = await readFile(sourcePath, 'utf8'), source = JSON.parse(raw);
  const html = buildHuntPrintableV112(source);
  await mkdir(dirname(htmlPath), {recursive:true});
  await writeFile(htmlPath, html);
  let browserVersion = null;
  if (pdfPath) {
    const {chromium} = await import('playwright-core');
    const browser = await chromium.launch({executablePath:options.chromium, headless:true, args:['--no-sandbox']});
    try {
      browserVersion = browser.version();
      const page = await browser.newPage();
      await page.setContent(html, {waitUntil:'load'});
      await page.emulateMedia({media:'print'});
      const minimum = await page.locator('body, h1, h2, h3, h4, h5, p, dt, dd, a').evaluateAll(nodes => Math.min(...nodes.map(node => parseFloat(getComputedStyle(node).fontSize) * 72 / 96)));
      if (minimum < 10) throw new Error('Printable text must remain at least 10 pt');
      await mkdir(dirname(pdfPath), {recursive:true});
      await page.pdf({path:pdfPath, format:'A4', preferCSSPageSize:true, printBackground:true, displayHeaderFooter:false, tagged:true, outline:true});
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify({result:'GENERATED_PRINTABLE_COMPANION', scope:'219_HISTORICAL_REVIEWS_AND_8_OUTSTANDING_CRITERIA', sourceSha256:sha256(raw), canonicalDataSha256:sha256(canonical(source)), html:htmlPath, htmlSha256:sha256(html), pdf:pdfPath, pdfSha256:pdfPath ? sha256(await readFile(pdfPath)) : null, browserVersion, microsoftExcelNativeExecuted:false}, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await cli();
