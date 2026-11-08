#!/usr/bin/env node
/** C-37 supplemental tracker. Run a copy from an OS temp folder with the
 * primary runtime Node and primary node_modules. Source workbooks are read-only. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return path.resolve(process.argv[index + 1]);
}
const root = argument('--repo-root'), outputDir = argument('--output-dir');
if (!outputDir.startsWith(path.join(root, 'outputs') + path.sep)) throw new Error('Use a conversation-specific repository outputs/ directory.');
const current = 'production/excel-bible-witnesses-20261108/suivi';
const previous = 'production/excel-bible-20261108/suivi';
const targetDir = path.join(root, current);
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const [qualification, inventory, register] = await Promise.all([
  readJson(`${current}/qualification-audience.json`), readJson(`${previous}/excel-inventory.json`), readJson(`${previous}/excel-open-register.json`),
]);
if (!qualification.readyForWorkbook) throw new Error('Wait for the final verification report and explicit export signal before authoring this workbook.');
const verification = await readJson(qualification.runtimeReport);
if (verification.tests?.exitCode !== 0 || verification.tests?.failed !== 0 || !Number.isInteger(verification.tests?.passed) || verification.tests.passed < 1 ||
    verification.build?.exitCode !== 0 || verification.lint?.exitCode !== 0) throw new Error('Final tests, build and lint must be present and passing.');
if (verification.browser?.validated !== false || verification.controller?.physicalDeviceValidated !== false || verification.humanArtValidated !== false)
  throw new Error('This dated qualification expects browser, real controller and human art review to remain unvalidated. Requalify changed evidence explicitly.');
if (inventory.inventory.length !== 108 || qualification.rows.length !== 12 || new Set(qualification.rows.map(row => row.id)).size !== qualification.rows.length)
  throw new Error('Unexpected historical source or criterion count.');
const phases = qualification.phases;
const states = ['Oui', 'Partiel', 'Non', 'À vérifier', 'Bloqué', 'Sans objet'];
for (const row of qualification.rows) {
  for (const phase of phases) if (!states.includes(row[phase])) throw new Error(`Unknown ${phase} for ${row.id}`);
  for (const id of row.evidence) if (!qualification.sourceReferences.some(source => source.id === id)) throw new Error(`Missing evidence ${id}`);
  if (!register.items.some(item => item.key === row.sourceKey)) throw new Error(`Missing original criterion ${row.sourceKey}`);
}
const sourceCriteria = ['Clan Ship:OPS-B03', 'Clan Ship:OPS-Q26'].map(key => register.items.find(item => item.key === key));
const historical = [];
for (const source of inventory.inventory) {
  const bytes = await fs.readFile(path.join(root, source.path));
  if (hash(bytes) !== source.sha256 || bytes.length !== source.bytes) throw new Error(`Historical workbook changed: ${source.path}`);
  historical.push({ ...source, bytes: bytes.length });
}
// Compare both earlier production lots with their exact baseline Git blobs.
const tree = execFileSync('git', ['ls-tree', '-r', '-z', qualification.baseCommit, '--', 'production/excel-bible-20261108', 'production/excel-bible-suite-20261108'],
  { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const protectedPrevious = [];
for (const entry of tree) {
  const [metadata, filename] = entry.split('\t'), [, type, objectId] = metadata.split(' ');
  if (type !== 'blob') throw new Error(`Unexpected prior object ${filename}`);
  const bytes = await fs.readFile(path.join(root, filename));
  const actualId = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (actualId !== objectId) throw new Error(`Earlier lot changed: ${filename}`);
  protectedPrevious.push({ path: filename, sha256: hash(bytes), bytes: bytes.length, gitBlob: objectId });
}
if (protectedPrevious.length < 100) throw new Error('Both prior lots must be protected.');
const sourceRows = [];
for (const source of qualification.sourceReferences) {
  const bytes = await fs.readFile(path.join(root, source.path));
  sourceRows.push({ ...source, sha256: hash(bytes), bytes: bytes.length });
}
sourceRows.push(...historical.map((source, index) => ({ kind: 'Classeur historique', id: `H${String(index + 1).padStart(3, '0')}`,
  path: source.path, sha256: source.sha256, bytes: source.bytes, detail: `${source.scope} · ${source.sheetCount} feuille(s) · original inchangé` })));
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.join(targetDir, 'apercus'), { recursive: true });
await fs.writeFile(path.join(targetDir, 'historique-preserve.json'), JSON.stringify({ version: 1, baseCommit: qualification.baseCommit,
  sourceWorkbooks: historical.map(({ path, sha256, bytes }) => ({ path, sha256, bytes })), previousFiles: protectedPrevious }, null, 2) + '\n');

const workbook = Workbook.create(), audience = workbook.worksheets.add('Audience'), sources = workbook.worksheets.add('Sources');
const colors = { navy: '#153243', ink: '#223544', muted: '#536877', white: '#FFFFFF', amber: '#FFF0CC', teal: '#21645D', pale: '#E9F1EF' };
const column = value => { let result = ''; for (let n = value; n; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result; return result; };
function setup(sheet, title, widths, last) {
  sheet.showGridLines = false;
  const end = column(widths.length);
  sheet.getRange(`A1:${end}${last}`).format = { font: { name: 'Arial', size: 10, color: colors.ink }, fill: colors.white, wrapText: true, verticalAlignment: 'center' };
  widths.forEach((width, index) => { sheet.getRange(`${column(index + 1)}1:${column(index + 1)}${last}`).format.columnWidthPx = width; });
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format = { font: { name: 'Arial', size: 16, bold: true, color: colors.navy }, wrapText: false, rowHeightPx: 34 };
}
function note(sheet, cell, text, height = 28) {
  sheet.getRange(cell).values = [[text]];
  sheet.getRange(cell).format = { wrapText: false, rowHeightPx: height, font: { name: 'Arial', size: 10, color: colors.muted } };
}
function header(sheet, range, values) {
  sheet.getRange(range).values = [values];
  sheet.getRange(range).format = { fill: colors.navy, font: { name: 'Arial', size: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeightPx: 48 };
}
const dataStart = 13, dataEnd = dataStart + qualification.rows.length - 1, sourceEnd = 5 + sourceRows.length;
setup(audience, 'Yautja — audience commune C-37', [90, 335, 105, 105, 105, 125, 115, 115, 160, 215, 345], dataEnd + 5);
audience.tabColor = colors.navy;
note(audience, 'A3', 'Complément du 8 novembre 2026 · OPS-B03 / OPS-Q26 · Les 108 originaux et les deux suivis antérieurs restent conservés.');
audience.getRange('A5:J5').values = [['Critères', '', 'Logique', '', 'Rendus SSR', '', 'Navigateur', '', 'Clôtures attestées', '']];
audience.getRange('B5').formulas = [[`=COUNTA(A${dataStart}:A${dataEnd})`]];
audience.getRange('D5').formulas = [[`=COUNTIFS(D${dataStart}:D${dataEnd},"Oui")`]];
audience.getRange('F5').formulas = [[`=COUNTIFS(E${dataStart}:E${dataEnd},"Oui")`]];
audience.getRange('H5').formulas = [[`=COUNTIFS(F${dataStart}:F${dataEnd},"Oui")`]];
audience.getRange('J5').formulas = [[`=COUNTIFS(I${dataStart}:I${dataEnd},"Attesté")`]];
audience.getRange('A6:J6').values = [['XLSX originaux', '', 'Tests suite', verification.tests.passed, 'Échecs', verification.tests.failed, 'Manette réelle', 'À vérifier', 'Art humain', 'À vérifier']];
audience.getRange('B6').formulas = [[`=COUNTIFS('Sources'!A6:A${sourceEnd},"Classeur historique")`]];
audience.getRange('A5:J6').format.rowHeightPx = 38;
for (const cell of ['B5', 'D5', 'F5', 'H5', 'J5', 'B6', 'D6', 'F6']) audience.getRange(cell).format.font = { name: 'Arial', size: 14, bold: true, color: colors.teal };
note(audience, 'A7', `Critère OPS-B03 d'origine : ${sourceCriteria[0].criterion}`);
note(audience, 'A8', `${verification.tests.passed} tests réussis / 0 échec ; build et lint validés. Le SSR vérifie la structure rendue. Le parcours navigateur n'est pas validé.`);
note(audience, 'A9', `OPS-Q26 : ${sourceCriteria[1].criterion} Son périmètre reste partiellement ouvert.`);
note(audience, 'A10', 'Phases modifiables en jaune. « Partiel » ou « À vérifier » conserve une validation ouverte ; aucune estimation de jeu terminé.', 32);
header(audience, 'A12:K12', ['Critère', 'Résultat attendu dans cette tranche', 'Intégré', 'Logique testée', 'Rendu SSR', 'Navigateur', 'Manette réelle', 'Art humain', 'Qualification', 'Références de preuve', 'Vérification restante / portée']);
const rows = qualification.rows.map(row => [row.id, row.criterion, ...phases.map(phase => row[phase]), '', row.evidence.join(' · '), row.remaining]);
audience.getRange(`A${dataStart}:K${dataEnd}`).values = rows;
audience.tables.add(`A12:K${dataEnd}`, true, 'AudienceC37').showFilterButton = true;
audience.getRange(`C${dataStart}:H${dataEnd}`).dataValidation = { rule: { type: 'list', values: states } };
audience.getRange(`C${dataStart}:H${dataEnd}`).format.fill = colors.amber;
audience.getRange(`C${dataStart}:I${dataEnd}`).format.horizontalAlignment = 'center';
audience.getRange(`I${dataStart}:I${dataEnd}`).formulas = rows.map((_, index) => {
  const r = dataStart + index;
  return [`=IF(COUNTIFS(C${r}:H${r},"Bloqué")>0,"Bloqué",IF(COUNTIFS(C${r}:H${r},"Non")>0,"Ouvert",IF(COUNTIFS(C${r}:H${r},"Partiel")>0,"Partiel",IF(COUNTIFS(C${r}:H${r},"À vérifier")>0,"À vérifier","Attesté"))))`];
});
for (const status of ['Bloqué', 'Ouvert', 'Partiel', 'À vérifier']) audience.getRange(`I${dataStart}:I${dataEnd}`).conditionalFormats.add('containsText',
  { text: status, format: { fill: status === 'Bloqué' ? '#F8E3DD' : '#F7F0DD', font: { color: status === 'Bloqué' ? '#8D3B2A' : '#805614' } } });
audience.getRange(`I${dataStart}:I${dataEnd}`).conditionalFormats.add('containsText', { text: 'Attesté', format: { fill: colors.pale, font: { color: colors.teal } } });
audience.freezePanes.freezeRows(12); audience.freezePanes.freezeColumns(2);
for (let index = 0; index < rows.length; index++) {
  const criterionLines = Math.ceil(qualification.rows[index].criterion.length / 43);
  const remainingLines = Math.ceil(qualification.rows[index].remaining.length / 46);
  audience.getRange(`A${dataStart + index}:K${dataStart + index}`).format.rowHeightPx = Math.max(100, Math.max(criterionLines, remainingLines) * 17 + 20);
}
note(audience, `A${dataEnd + 2}`, 'La recette Chromium échoue avant page (AF_UNIX / EPERM). La recette CI préparée reste à exécuter et à inspecter.', 30);
note(audience, `A${dataEnd + 3}`, 'Les 12 critères sont dérivés pour cette audience. Sources B03/Q26 et anciens suivis : feuille Sources ; aucune cellule historique modifiée.', 30);

setup(sources, 'Sources — critères, preuves et originaux conservés', [155, 110, 690, 535, 115, 480], sourceEnd + 2);
sources.tabColor = colors.teal;
note(sources, 'A3', 'SHA-256 vérifié avant export : 108 classeurs d’origine et tous les fichiers des lots 04eb4ca / 5d0c8d9. Les références de preuve sont datées.');
header(sources, 'A5:F5', ['Nature', 'Référence', 'Chemin dans le dépôt', 'SHA-256', 'Octets', 'Portée / cellule d’origine']);
sources.getRange(`A6:F${sourceEnd}`).values = sourceRows.map(source => [source.kind, source.id, source.path, source.sha256, source.bytes, source.detail]);
sources.tables.add(`A5:F${sourceEnd}`, true, 'SourcesAudienceC37').showFilterButton = true;
sources.getRange(`A6:F${sourceEnd}`).format.rowHeightPx = 64;
sources.getRange(`E6:E${sourceEnd}`).setNumberFormat('#,##0');
sources.freezePanes.freezeRows(5); sources.freezePanes.freezeColumns(2);

workbook.recalculate();
const expectedSummary = { criteria: qualification.rows.length, domain: qualification.rows.filter(row => row.domainTested === 'Oui').length,
  ssr: qualification.rows.filter(row => row.ssrTested === 'Oui').length, browser: 0, closed: 0, historical: 108, tests: verification.tests.passed, failed: 0 };
const summaryCells = { criteria: 'B5', domain: 'D5', ssr: 'F5', browser: 'H5', closed: 'J5', historical: 'B6', tests: 'D6', failed: 'F6' };
const actualSummary = Object.fromEntries(Object.entries(summaryCells).map(([key, cell]) => [key, audience.getRange(cell).values[0][0]]));
if (JSON.stringify(actualSummary) !== JSON.stringify(expectedSummary)) throw new Error(`Summary mismatch: ${JSON.stringify({ expectedSummary, actualSummary })}`);
const phaseTests = [], original = audience.getRange(`C${dataStart}:H${dataStart}`).values;
for (const scenario of [
  { values: ['Oui', 'Oui', 'Oui', 'Oui', 'Sans objet', 'Sans objet'], expected: 'Attesté' },
  { values: ['Oui', 'Partiel', 'Oui', 'Oui', 'Sans objet', 'Sans objet'], expected: 'Partiel' },
  { values: ['Oui', 'Oui', 'Oui', 'À vérifier', 'Sans objet', 'Sans objet'], expected: 'À vérifier' },
  { values: ['Oui', 'Oui', 'Oui', 'Non', 'Sans objet', 'Sans objet'], expected: 'Ouvert' },
  { values: ['Oui', 'Oui', 'Oui', 'Bloqué', 'Sans objet', 'Sans objet'], expected: 'Bloqué' },
]) {
  audience.getRange(`C${dataStart}:H${dataStart}`).values = [scenario.values]; workbook.recalculate();
  const actual = audience.getRange(`I${dataStart}`).values[0][0];
  if (actual !== scenario.expected) throw new Error(`Qualification formula failed: ${actual}`);
  phaseTests.push({ ...scenario, actual });
}
audience.getRange(`C${dataStart}:H${dataStart}`).values = original; workbook.recalculate();
const inspection = await workbook.inspect({ kind: 'table', range: 'Audience!A5:J6', include: 'values,formulas', tableMaxRows: 2, tableMaxCols: 10, maxChars: 8000 });
const inspectionText = typeof inspection === 'string' ? inspection : inspection.ndjson;
await fs.writeFile(path.join(targetDir, 'inspection-formules.ndjson'), inspectionText);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 40 }, maxChars: 4000 });
const errorsText = typeof errors === 'string' ? errors : errors.ndjson;
await fs.writeFile(path.join(targetDir, 'controle-formules.ndjson'), errorsText);
const previews = [['Audience', 'A1:K18', '01-audience'], ['Audience', 'A19:K27', '02-suite-criteres'],
  ['Audience', 'C12:I24', '03-phases'], ['Sources', 'A1:F18', '04-sources'], ['Sources', `A${sourceEnd - 4}:F${sourceEnd}`, '05-fin-index']];
for (const [sheetName, range, name] of previews) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' }), bytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(outputDir, `${name}.png`), bytes); await fs.writeFile(path.join(targetDir, 'apercus', `${name}.png`), bytes);
}
const filename = 'Yautja_Audience_C37_20261108.xlsx', xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, filename)); await fs.copyFile(path.join(outputDir, filename), path.join(targetDir, filename));
const report = {
  schemaVersion: 1, asOfDate: qualification.asOfDate, baseCommit: qualification.baseCommit, authoringRuntime: '@oai/artifact-tool',
  qualificationSha256: hash(await fs.readFile(path.join(root, current, 'qualification-audience.json'))),
  runtimeReport: { path: qualification.runtimeReport, sha256: hash(await fs.readFile(path.join(root, qualification.runtimeReport))) },
  sourceWorkbooksVerifiedUnchanged: 108, previousFilesVerifiedUnchanged: protectedPrevious.length,
  protectedSourcesManifest: `${current}/historique-preserve.json`, sourceCriteria,
  sheets: ['Audience', 'Sources'], dataStart, dataEnd, sourceStart: 6, sourceEnd, phases,
  rows: qualification.rows.map((row, index) => ({ row: dataStart + index, id: row.id, sourceKey: row.sourceKey, criterion: row.criterion,
    expectedPhases: phases.map(phase => row[phase]), evidence: row.evidence.join(' · '), remaining: row.remaining,
    expectedQualification: audience.getRange(`I${dataStart + index}`).values[0][0] })),
  sourceRows, summaryCells, expectedSummary, actualSummary, phaseTests,
  browserValidated: false, physicalControllerValidated: false, humanArtValidated: false,
  previewsInspected: false, previewFiles: previews.map(([, , name]) => `${current}/apercus/${name}.png`),
  artifactPath: `${current}/${filename}`, artifactSha256: hash(await fs.readFile(path.join(targetDir, filename))),
  limits: ['React SSR ne valide pas le navigateur, les pixels ou le tactile.', 'Aucune validation avec manette physique.', 'Aucune revue artistique humaine de cette audience.'],
};
await fs.writeFile(path.join(targetDir, 'verification-classeur.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ artifact: path.join(targetDir, filename), summary: actualSummary, previousFiles: protectedPrevious.length, browserValidated: false }));
