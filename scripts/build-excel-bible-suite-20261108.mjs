#!/usr/bin/env node
/** Focused continuation tracker. The previous consolidated register is read-only.
 * Run a copy in an OS temporary directory using the primary runtime's Node and
 * node_modules. Existing XLSX sources and evidence are never rewritten. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return path.resolve(process.argv[index + 1]);
}
const root = argument('--repo-root');
const outputDir = argument('--output-dir');
const current = 'production/excel-bible-suite-20261108/suivi';
const previous = 'production/excel-bible-20261108/suivi';
const targetDir = path.join(root, current);
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const [qualification, inventory, register, campaign, history] = await Promise.all([
  readJson(`${current}/qualification-suite.json`), readJson(`${previous}/excel-inventory.json`),
  readJson(`${previous}/excel-open-register.json`), readJson(`${previous}/bible-campagne-revisee.json`),
  readJson(`${current}/historique-preserve.json`),
]);
if (!qualification.readyForWorkbook || qualification.validation.status !== 'complete') {
  throw new Error('The implementation and its verification must be qualified before exporting the continuation workbook.');
}
if (!qualification.validation.runtimeReport || !Number.isInteger(qualification.validation.testsPassed) ||
    qualification.validation.testsPassed < 1 || qualification.validation.testsFailed !== 0) {
  throw new Error('The completed continuation requires an existing runtime report and passing test counts.');
}
if (inventory.inventory.length !== 108 || new Set(qualification.rows.map(row => row.id)).size !== qualification.rows.length) {
  throw new Error('Unexpected source inventory or duplicate continuation IDs.');
}
const states = ['Oui', 'Partiel', 'Non', 'À vérifier', 'Sans objet'];
const phases = ['generated', 'integrated', 'behaviorTested', 'browserTested', 'humanArtReview'];
const evidenceFingerprints = [];
async function recordEvidence(evidence) {
  const filename = evidence.split('#')[0];
  const bytes = await fs.readFile(path.join(root, filename));
  if (!evidenceFingerprints.some(item => item.path === filename)) evidenceFingerprints.push({ path: filename, sha256: hash(bytes), bytes: bytes.length });
}
for (const row of qualification.rows) {
  for (const phase of phases) if (!states.includes(row[phase])) throw new Error(`Unknown ${phase} for ${row.id}`);
  for (const evidence of row.evidence) await recordEvidence(evidence);
}
await recordEvidence(qualification.validation.runtimeReport);
await recordEvidence(qualification.validation.browserReport);
const protectedSources = [
  ...inventory.inventory.map(source => ({ kind: 'Classeur historique', path: source.path, sha256: source.sha256, bytes: source.bytes, detail: source.scope })),
  ...history.files.map(source => ({ kind: 'Suivi précédent', ...source, detail: 'Conservé depuis la reprise 04eb4ca' })),
];
for (const source of protectedSources) {
  const bytes = await fs.readFile(path.join(root, source.path));
  if (hash(bytes) !== source.sha256 || bytes.length !== source.bytes) throw new Error(`Historical source changed: ${source.path}`);
}
const resolved = qualification.rows.map(row => {
  if (row.sourceKind === 'excel') {
    const source = register.items.find(item => item.key === row.sourceKey);
    if (!source) throw new Error(`Missing consolidated requirement ${row.sourceKey}`);
    return { ...row, criterion: source.criterion, sourceDeclaration: source.sourceStatus,
      sourceRefs: source.sources.map(item => `${item.path} | ${item.sheet}!${item.row}`) };
  }
  const sources = campaign.items.filter(item => item.nativeId === row.sourceKey && item.kind === 'Paragraphe');
  if (!sources.length) throw new Error(`Missing campaign requirement ${row.sourceKey}`);
  return { ...row, criterion: sources.map(item => item.content).join('\n'),
    sourceDeclaration: sources.map(item => item.sourceDeclaration).join('\n'),
    sourceRefs: sources.map(item => `${item.source}:${item.sourceLine}–${item.sourceEndLine}`) };
});
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.join(targetDir, 'apercus'), { recursive: true });
const workbook = Workbook.create();
const suite = workbook.worksheets.add('Suite');
const sources = workbook.worksheets.add('Sources');
const colors = { navy: '#153243', ink: '#223544', muted: '#536877', white: '#FFFFFF', amber: '#FFF0CC', teal: '#21645D' };
const column = value => {
  let result = '';
  for (let n = value; n; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
};
function setup(sheet, title, widths, last) {
  const end = column(widths.length);
  sheet.showGridLines = false;
  sheet.getRange(`A1:${end}${last}`).format = { font: { name: 'Arial', size: 10, color: colors.ink }, fill: colors.white, wrapText: true, verticalAlignment: 'center' };
  widths.forEach((width, index) => { sheet.getRange(`${column(index + 1)}1:${column(index + 1)}${last}`).format.columnWidthPx = width; });
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format = { font: { name: 'Arial', size: 16, bold: true, color: colors.navy }, wrapText: false, rowHeightPx: 32 };
}
function header(sheet, range, values) {
  sheet.getRange(range).values = [values];
  sheet.getRange(range).format = { fill: colors.navy, font: { name: 'Arial', size: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeightPx: 42 };
}
const dataStart = 13, dataEnd = dataStart + resolved.length - 1;
setup(suite, 'Yautja — suite Excel et bible du 8 novembre 2026',
  [125, 140, 275, 640, 640, 100, 110, 140, 140, 155, 180, 650, 650, 650], dataEnd + 8);
suite.tabColor = colors.navy;
suite.getRange('A3').values = [['Trophée contesté et retour du Berceau. Les autres sujets restent dans le suivi consolidé.']];
suite.getRange('A3').format = { wrapText: false, font: { name: 'Arial', size: 10, color: colors.muted }, rowHeightPx: 28 };
suite.getRange('A5').values = [['Raccords suivis']];
suite.getRange('B5').formulas = [[`=COUNTIFS(B${dataStart}:B${dataEnd},"Raccord")`]];
suite.getRange('C5').values = [['Avec tests de comportement']];
suite.getRange('D5').formulas = [[`=COUNTIFS(B${dataStart}:B${dataEnd},"Raccord",H${dataStart}:H${dataEnd},"Oui")`]];
suite.getRange('A6').values = [['Classeurs historiques']];
suite.getRange('B6').formulas = [[`=COUNTIFS('Sources'!A6:A${5 + protectedSources.length},"Classeur historique")`]];
suite.getRange('C6').values = [['Parcours navigateur exécutés']];
suite.getRange('D6').formulas = [[`=COUNTIFS(B${dataStart}:B${dataEnd},"Raccord",I${dataStart}:I${dataEnd},"Oui")`]];
suite.getRange('B5:B6').format.font = { name: 'Arial', size: 14, bold: true, color: colors.teal };
suite.getRange('D5:D6').format.font = { name: 'Arial', size: 14, bold: true, color: colors.teal };
suite.getRange('A5:D6').format.rowHeightPx = 34;
suite.getRange('A8').values = [[qualification.validation.summary]];
suite.getRange('A8').format.wrapText = false;
suite.getRange('A8:N8').format.rowHeightPx = 30;
suite.getRange('A9').values = [[qualification.validation.browserSummary]];
suite.getRange('A9').format.wrapText = false;
suite.getRange('A9:N9').format.rowHeightPx = 28;
suite.getRange('A10').values = [['Phases modifiables en jaune. Reporter les changements dans qualification-suite.json avant la prochaine génération.']];
suite.getRange('A10').format = { wrapText: false, font: { name: 'Arial', size: 10, italic: true, color: colors.muted }, rowHeightPx: 28 };
const rows = resolved.map(row => [row.id, row.kind, row.title, row.criterion, row.implementation,
  ...phases.map(phase => row[phase]), '', row.remaining, row.evidence.join('\n'), row.sourceRefs.join('\n')]);
header(suite, 'A12:N12', ['Référence', 'Nature', 'Sujet', 'Critère source conservé', 'Avancée réelle',
  'Produit', 'Intégré', 'Tests de comportement', 'Parcours navigateur', 'Revue artistique humaine', 'Clôture de toutes les phases', 'Reste à réaliser', 'Preuves dans le dépôt', 'Document ou cellules d’origine']);
suite.getRange(`A${dataStart}:N${dataEnd}`).values = rows;
suite.tables.add(`A12:N${dataEnd}`, true, 'SuiteExcelBible').showFilterButton = true;
suite.getRange(`F${dataStart}:J${dataEnd}`).dataValidation = { rule: { type: 'list', values: states } };
suite.getRange(`F${dataStart}:J${dataEnd}`).format.fill = colors.amber;
suite.getRange(`K${dataStart}:K${dataEnd}`).formulas = rows.map((_, index) => {
  const r = dataStart + index;
  return [`=IF(COUNTIFS(F${r}:J${r},"Non")>0,"Ouvert",IF(COUNTIFS(F${r}:J${r},"Partiel")>0,"Partiel",IF(COUNTIFS(F${r}:J${r},"À vérifier")>0,"À vérifier","Périmètre attesté")))`];
});
suite.getRange(`K${dataStart}:K${dataEnd}`).conditionalFormats.add('containsText', { text: 'Ouvert', format: { fill: '#FFF0CC', font: { color: '#805614' } } });
suite.getRange(`K${dataStart}:K${dataEnd}`).conditionalFormats.add('containsText', { text: 'Partiel', format: { fill: '#F7F0DD', font: { color: '#805614' } } });
suite.freezePanes.freezeRows(12);
suite.freezePanes.freezeColumns(1);
for (let index = 0; index < rows.length; index++) {
  const wrapped = Math.max(...rows[index].map((text, j) => String(text ?? '').split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / Math.max(15, [18, 22, 43, 100, 100, 15, 15, 21, 21, 23, 26, 100, 100, 100][j]))), 0)));
  suite.getRange(`A${dataStart + index}:N${dataStart + index}`).format.rowHeightPx = Math.min(510, Math.max(108, wrapped * 16 + 16));
}
suite.getRange(`A${dataEnd + 2}`).values = [['« Ouvert » signifie qu’au moins une phase requise reste non validée. Aucun pourcentage de jeu terminé n’est calculé.']];
suite.getRange(`A${dataEnd + 2}`).format.wrapText = false;
suite.getRange(`A${dataEnd + 3}`).values = [['Le retour individuel R2-M027 ne réalise pas le retour de groupe OPS-B04. OPS-Q26 reste partielle.']];
suite.getRange(`A${dataEnd + 3}`).format.wrapText = false;
suite.getRange(`A${dataEnd + 5}`).values = [[`Suivi consolidé précédent : ${qualification.previousWorkbook}`]];
suite.getRange(`A${dataEnd + 5}`).format.wrapText = false;

setup(sources, 'Sources préservées et références du suivi', [185, 680, 535, 130, 430], protectedSources.length + 5);
sources.getRange('A3').values = [['Les SHA-256 sont comparés aux fichiers présents avant chaque export. Aucun original n’est écrit par ce builder.']];
sources.getRange('A3').format = { wrapText: false, font: { name: 'Arial', size: 10, color: colors.muted }, rowHeightPx: 28 };
header(sources, 'A5:E5', ['Type de source', 'Chemin dans le dépôt', 'SHA-256 de référence', 'Taille en octets', 'Portée']);
sources.getRange(`A6:E${protectedSources.length + 5}`).values = protectedSources.map(source => [source.kind, source.path, source.sha256, source.bytes, source.detail]);
sources.tables.add(`A5:E${protectedSources.length + 5}`, true, 'SourcesSuiteExcelBible').showFilterButton = true;
sources.getRange(`A6:E${protectedSources.length + 5}`).format.rowHeightPx = 54;
sources.getRange(`D6:D${protectedSources.length + 5}`).setNumberFormat('#,##0');
sources.freezePanes.freezeRows(5);
sources.freezePanes.freezeColumns(1);

workbook.recalculate();
const expected = { raccords: resolved.filter(row => row.kind === 'Raccord').length,
  tests: resolved.filter(row => row.kind === 'Raccord' && row.behaviorTested === 'Oui').length,
  historical: 108, browser: resolved.filter(row => row.kind === 'Raccord' && row.browserTested === 'Oui').length };
const actual = { raccords: suite.getRange('B5').values[0][0], tests: suite.getRange('D5').values[0][0],
  historical: suite.getRange('B6').values[0][0], browser: suite.getRange('D6').values[0][0] };
if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Summary mismatch: ${JSON.stringify({ expected, actual })}`);
const original = suite.getRange(`F${dataStart}:J${dataStart}`).values;
const phaseTests = [];
for (const scenario of [
  { values: ['Oui', 'Oui', 'Oui', 'Sans objet', 'Sans objet'], expected: 'Périmètre attesté' },
  { values: ['Oui', 'Partiel', 'Oui', 'Sans objet', 'Sans objet'], expected: 'Partiel' },
  { values: ['Oui', 'Oui', 'À vérifier', 'Sans objet', 'Sans objet'], expected: 'À vérifier' },
  { values: ['Oui', 'Oui', 'Oui', 'Non', 'Sans objet'], expected: 'Ouvert' },
]) {
  suite.getRange(`F${dataStart}:J${dataStart}`).values = [scenario.values];
  workbook.recalculate();
  const value = suite.getRange(`K${dataStart}`).values[0][0];
  if (value !== scenario.expected) throw new Error(`Phase formula mismatch: ${value}`);
  phaseTests.push({ ...scenario, actual: value });
}
suite.getRange(`F${dataStart}:J${dataStart}`).values = original;
workbook.recalculate();
const inspection = await workbook.inspect({ kind: 'table', range: 'Suite!A5:D6', include: 'values,formulas', tableMaxRows: 2, tableMaxCols: 4, maxChars: 4000 });
const inspectionText = typeof inspection === 'string' ? inspection : inspection.ndjson;
await fs.writeFile(path.join(outputDir, 'inspection.txt'), inspectionText);
await fs.writeFile(path.join(targetDir, 'inspection-formules.ndjson'), inspectionText);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 40 }, maxChars: 4000 });
const errorsText = typeof errors === 'string' ? errors : errors.ndjson;
await fs.writeFile(path.join(outputDir, 'formula-scan.txt'), errorsText);
await fs.writeFile(path.join(targetDir, 'controle-formules.ndjson'), errorsText);
const previews = [
  ['Suite', 'A1:E16', '01-suite'], ['Suite', 'F12:K16', '02-phases'],
  ['Suite', 'L12:N14', '03-preuves-et-sources'], ['Sources', 'A1:E9', '04-sources'],
];
for (const [sheetName, range, name] of previews) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  const bytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(outputDir, `${name}.png`), bytes);
  await fs.writeFile(path.join(targetDir, 'apercus', `${name}.png`), bytes);
}
const filename = 'Yautja_Suite_Excel_Bible_20261108.xlsx';
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, filename));
await fs.copyFile(path.join(outputDir, filename), path.join(targetDir, filename));
const report = {
  asOfDate: qualification.asOfDate, baseCommit: qualification.baseCommit, authoringRuntime: '@oai/artifact-tool',
  qualificationSha256: hash(await fs.readFile(path.join(root, current, 'qualification-suite.json'))),
  runtimeValidation: qualification.validation,
  sourceWorkbooksVerifiedUnchanged: 108, previousFilesVerifiedUnchanged: history.files.length,
  rows: resolved.map(row => ({ id: row.id, kind: row.kind, criterion: row.criterion, sourceRefs: row.sourceRefs,
    expectedPhases: phases.map(phase => row[phase]) })),
  sheets: ['Suite', 'Sources'], expectedSummary: expected, actualSummary: actual, phaseTests,
  evidenceFingerprints, browserStatus: 'blocked-before-page-load',
  previewFiles: previews.map(([, , name]) => `${current}/apercus/${name}.png`),
  artifactPath: `${current}/${filename}`, artifactSha256: hash(await fs.readFile(path.join(targetDir, filename))),
  limits: ['Les formules et aperçus ne valident pas le gameplay.', 'La fidélité artistique humaine et le parcours navigateur restent ouverts.'],
};
await fs.writeFile(path.join(targetDir, 'verification-classeur.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ artifact: path.join(targetDir, filename), sources: 108, previousFiles: history.files.length, rows: resolved.length, summary: actual }));
