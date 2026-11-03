import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

// Run from a task-specific temporary directory with the primary-runtime
// node_modules symlink. No network writes or Git mutations occur here.
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Missing value for ${name}`);
  return args[i + 1];
}
const inputPath = path.resolve(option('--input', path.join(here, 'consolidation-input.json')));
const inputBytes = await fs.readFile(inputPath);
const input = JSON.parse(inputBytes);
assert.equal(input.schemaVersion, 1);
const relative = p => path.isAbsolute(p) ? p : path.resolve(path.dirname(inputPath), p);
const inventoryPath = relative(option('--inventory', input.inventoryPath));
const inventoryBytes = await fs.readFile(inventoryPath);
const parsedInventory = JSON.parse(inventoryBytes);
const inventory = Array.isArray(parsedInventory) ? parsedInventory : parsedInventory.pullRequests;
assert.ok(Array.isArray(inventory) && inventory.length > 0);
assert.equal(new Set(inventory.map(pr => pr.number)).size, inventory.length, 'Duplicate PR number');
if (input.expectedPullRequestCount !== undefined) assert.equal(inventory.length, input.expectedPullRequestCount);
const repository = relative(option('--repo', input.repositoryPath));
const targetRef = option('--ref', input.targetRef);
const mainRef = option('--main-ref', input.mainRef ?? 'origin/main');
const outputDir = path.resolve(option('--output-dir', input.outputDir));
const outputName = input.outputName ?? 'YAUTJA_CONSOLIDATION_PR_20261103.xlsx';
assert.ok(outputName.endsWith('.xlsx') && path.basename(outputName) === outputName);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function git(args) {
  return spawnSync('git', ['-C', repository, ...args], {encoding: 'utf8', maxBuffer: 1024 * 1024});
}
function resolveCommit(ref) {
  const result = git(['rev-parse', '--verify', `${ref}^{commit}`]);
  if (result.status !== 0) return null;
  const value = result.stdout.trim();
  return /^[a-f0-9]{40}$/.test(value) ? value : null;
}
// Pin each moving reference once, before checking any PR. A concurrent merge
// cannot produce a mixed snapshot halfway through the ancestry checks.
const targetCommit = resolveCommit(input.targetCommit ?? targetRef);
assert.ok(targetCommit, 'Target Git commit is unavailable');
const mainCommit = resolveCommit(input.mainCommit ?? mainRef);
function ancestor(head, base) {
  if (!base || !/^[a-f0-9]{40}$/.test(head)) return 'À vérifier';
  const result = git(['merge-base', '--is-ancestor', head, base]);
  return result.status === 0 ? 'Oui' : result.status === 1 ? 'Non' : 'À vérifier';
}
function domain(pr) {
  return input.domainByNumber?.[String(pr.number)] ?? input.defaultDomain ?? 'À classer';
}
function remoteStatus(pr) {
  const raw = input.remote?.byNumber?.[String(pr.number)] ?? input.remote?.defaultState ?? 'UNKNOWN';
  const state = (typeof raw === 'object' && raw.merged === true)
    ? 'MERGED' : String(typeof raw === 'string' ? raw : raw.state).toUpperCase();
  const draft = typeof raw === 'object' && typeof raw.draft === 'boolean' ? raw.draft : pr.draft;
  if (state === 'MERGED') return 'Fusionnée';
  if (state === 'CLOSED') return 'Fermée';
  if (state === 'OPEN') return draft ? 'Ouverte (brouillon)' : 'Ouverte';
  assert.equal(state, 'UNKNOWN', `Unsupported remote state for PR ${pr.number}`);
  return 'Non recontrôlée';
}
const prs = inventory.toSorted((a, b) => a.number - b.number).map(pr => {
  assert.ok(Number.isInteger(pr.number) && typeof pr.title === 'string');
  assert.match(pr.headSha, /^[a-f0-9]{40}$/);
  assert.equal(pr.url, `${input.repositoryUrl}/pull/${pr.number}`);
  return {...pr, domain: domain(pr), presentOnTarget: ancestor(pr.headSha, targetCommit),
    presentOnMain: ancestor(pr.headSha, mainCommit), remoteStatus: remoteStatus(pr)};
});
const checks = input.checks ?? [];
assert.ok(Array.isArray(checks));
for (const check of checks) {
  assert.ok(check.label && check.group && check.scope && check.source);
  assert.ok(['Réussi', 'Échoué', 'Bloqué', 'Non exécuté', 'À compléter'].includes(check.status));
}
const expected = {
  total: prs.length,
  target: prs.filter(pr => pr.presentOnTarget === 'Oui').length,
  missing: prs.filter(pr => pr.presentOnTarget === 'Non').length,
  unknown: prs.filter(pr => pr.presentOnTarget === 'À vérifier').length,
  main: prs.filter(pr => pr.presentOnMain === 'Oui').length,
  merged: prs.filter(pr => pr.remoteStatus === 'Fusionnée').length,
  remoteUnknown: prs.filter(pr => pr.remoteStatus === 'Non recontrôlée').length,
};
const snapshot = {schemaVersion: 1, capturedAt: new Date().toISOString(), asOfDate: input.asOfDate,
  repositoryUrl: input.repositoryUrl, targetRef, targetCommit, mainRef, mainCommit,
  inventorySha256: sha256(inventoryBytes), inputSha256: sha256(inputBytes),
  remoteObservedAt: input.remote?.observedAt ?? null, counts: expected, prs, checks};

const wb = Workbook.create();
const summary = wb.worksheets.add('Synthèse');
const detail = wb.worksheets.add('PR');
const verification = wb.worksheets.add('Vérifications');
const palette = {ink: '#292534', muted: '#635E6F', header: '#423B57', rule: '#B8B1C8',
  alternate: '#F5F3F8', amber: '#FFF0CE', amberText: '#805300', red: '#FCE3E3', redText: '#952F36'};
const font = 'Arial';
const lastPrRow = 5 + prs.length;
function value(sheet, address, v) { sheet.getRange(address).values = [[v]]; }
function formula(sheet, address, v) { sheet.getRange(address).formulas = [[v]]; }
function setup(sheet, widths, lastRow) {
  sheet.showGridLines = false;
  const last = String.fromCharCode(64 + widths.length);
  sheet.getRange(`A1:${last}${lastRow}`).format = {font: {name: font, size: 10, color: palette.ink}, verticalAlignment: 'center'};
  sheet.getRange(`A1:${last}${lastRow}`).format.rowHeight = 20;
  widths.forEach((width, i) => {sheet.getRange(`${String.fromCharCode(65 + i)}1:${String.fromCharCode(65 + i)}${lastRow}`).format.columnWidth = width;});
  sheet.getRange(`A2:${last}2`).format.font = {name: font, size: 16, bold: true, color: palette.header};
  sheet.getRange(`A2:${last}2`).format.rowHeight = 30;
  sheet.getRange(`A3:${last}3`).format.borders = {bottom: {style: 'thin', color: palette.rule}};
  sheet.getRange(`A3:${last}3`).format.font = {name: font, size: 10, color: palette.muted, italic: true};
  sheet.getRange(`A3:${last}3`).format.rowHeight = 24;
}
function header(sheet, address) {
  sheet.getRange(address).format = {fill: palette.header, font: {name: font, size: 10, bold: true, color: '#FFFFFF'},
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true,
    borders: {insideVertical: {style: 'thin', color: '#FFFFFF'}}};
  sheet.getRange(address).format.rowHeight = 32;
}
function striped(sheet, first, last, lastCol) {
  for (let row = first; row <= last; row++) if ((row - first) % 2 === 1) sheet.getRange(`A${row}:${lastCol}${row}`).format.fill = palette.alternate;
}
function linesFor(text, chars) {
  return String(text ?? '').split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / chars)), 0);
}
setup(summary, [52, 14, 4, 32, 12, 14, 15, 12], 29);
summary.tabColor = palette.header;
value(summary, 'A2', 'Yautja — Consolidation des PR');
value(summary, 'A3', `${prs.length} demandes de fusion et leurs validations`);
value(summary, 'A4', 'Date du suivi');
value(summary, 'B4', new Date(`${input.asOfDate}T00:00:00Z`));
summary.getRange('B4').setNumberFormat('dd/mm/yyyy');
value(summary, 'A6', 'État de la branche');
formula(summary, 'B6', '=IF(B12>0,"Présence Git à vérifier",IF(B11>0,"Consolidation en cours","Têtes regroupées sur la branche"))');
summary.getRange('A6:H6').format.font = {name: font, size: 10, bold: true, color: palette.header};
summary.getRange('A8:B8').values = [['Indicateur', 'Nombre']];
header(summary, 'A8:B8');
summary.getRange('A9:A15').values = [
  ['PR suivies'], ['Têtes présentes dans la branche'], ['Têtes encore absentes'],
  ['Présence sur branche non vérifiée'], ['Têtes présentes sur main'],
  ['PR fusionnées confirmées par GitHub'], ['État GitHub non recontrôlé'],
];
const prRange = col => `'PR'!$${col}$6:$${col}$${lastPrRow}`;
summary.getRange('B9:B15').formulas = [
  [`=COUNTA(${prRange('A')})`], [`=COUNTIFS(${prRange('E')},"Oui")`],
  [`=COUNTIFS(${prRange('E')},"Non")`], [`=COUNTIFS(${prRange('E')},"À vérifier")`],
  [`=COUNTIFS(${prRange('F')},"Oui")`], [`=COUNTIFS(${prRange('G')},"Fusionnée")`],
  [`=COUNTIFS(${prRange('G')},"Non recontrôlée")`],
];
striped(summary, 9, 15, 'B');
summary.getRange('A9:B15').format.rowHeight = 27;
summary.getRange('B9:B15').setNumberFormat('#,##0');
summary.getRange('B9:B15').format.horizontalAlignment = 'right';
value(summary, 'A17', 'Part des têtes regroupées sur la branche');
formula(summary, 'B17', '=IF(B9=0,"n.a.",B10/B9)');
summary.getRange('B17').setNumberFormat('0%');
summary.getRange('A17:B17').format.font = {name: font, size: 10, bold: true, color: palette.ink};
summary.getRange('A17:B17').format.borders = {top: {style: 'thin', color: palette.rule}};
summary.getRange('B11:B12').conditionalFormats.add('cellIs', {operator: 'greaterThan', formula: 0, format: {fill: palette.amber, font: {color: palette.amberText}}});
const domains = [...new Set(prs.map(pr => pr.domain))].sort((a, b) => a.localeCompare(b, 'fr'));
summary.getRange('D8:G8').values = [['Domaine', 'PR', 'Présentes', 'À intégrer']];
header(summary, 'D8:G8');
domains.forEach((name, i) => {
  const row = 9 + i;
  value(summary, `D${row}`, name);
  formula(summary, `E${row}`, `=COUNTIFS(${prRange('B')},D${row})`);
  formula(summary, `F${row}`, `=COUNTIFS(${prRange('B')},D${row},${prRange('E')},"Oui")`);
  formula(summary, `G${row}`, `=COUNTIFS(${prRange('B')},D${row},${prRange('E')},"Non")`);
  summary.getRange(`D${row}:G${row}`).format.rowHeight = 27;
  if (i % 2 === 1) summary.getRange(`D${row}:G${row}`).format.fill = palette.alternate;
});
summary.getRange(`E9:G${8 + domains.length}`).setNumberFormat('#,##0');
summary.getRange(`E9:G${8 + domains.length}`).format.horizontalAlignment = 'right';
value(summary, 'A20', 'Une tête présente indique une ascendance Git sur le commit observé.');
value(summary, 'A21', 'L’état de la PR sur GitHub et sa présence dans main sont suivis séparément.');
value(summary, 'A22', 'Les résultats des tests et leurs limites sont détaillés dans Vérifications.');
value(summary, 'A24', 'Branche observée'); value(summary, 'B24', targetRef);
value(summary, 'A25', 'Commit de branche observé'); value(summary, 'B25', targetCommit);
value(summary, 'A26', `Commit ${mainRef} observé`); value(summary, 'B26', mainCommit ?? 'Indisponible');
value(summary, 'A28', 'La présence sur main est celle du dernier instantané Git disponible.');
summary.getRange('A20:H22').format.font = {name: font, size: 10, color: palette.muted};
summary.getRange('A28:H28').format.font = {name: font, size: 10, color: palette.muted, italic: true};

setup(detail, [10, 24, 76, 48, 18, 18, 22, 64], lastPrRow);
value(detail, 'A2', 'Pull requests');
value(detail, 'A3', `Branche : ${targetRef} · commit ${targetCommit}`);
value(detail, 'A4', `Source : ${input.repositoryUrl}/pulls · inventaire fourni, liens individuels à droite`);
detail.getRange('A5:H5').values = [['Référence', 'Domaine', 'Titre', 'SHA de tête', 'Sur branche', 'Sur main', 'État GitHub', 'URL GitHub']];
detail.getRange(`A6:H${lastPrRow}`).values = prs.map(pr => [pr.number, pr.domain, pr.title, pr.headSha, pr.presentOnTarget, pr.presentOnMain, pr.remoteStatus, pr.url]);
const table = detail.tables.add(`A5:H${lastPrRow}`, true, 'ConsolidationPR');
table.style = 'TableStyleLight9';
table.showFilterButton = true;
header(detail, 'A5:H5');
detail.getRange(`A6:A${lastPrRow}`).setNumberFormat('"PR #"0');
detail.getRange(`A6:B${lastPrRow}`).format.wrapText = true;
detail.getRange(`C6:C${lastPrRow}`).format.wrapText = true;
detail.getRange(`E6:H${lastPrRow}`).format.wrapText = true;
detail.getRange(`A6:H${lastPrRow}`).format.verticalAlignment = 'center';
detail.getRange(`H6:H${lastPrRow}`).format.font = {name: font, size: 10, color: '#3A4B96'};
prs.forEach((pr, i) => {
  const lines = Math.max(linesFor(pr.title, 72), linesFor(pr.domain, 22), linesFor(pr.remoteStatus, 20), linesFor(pr.url, 60));
  detail.getRange(`A${i + 6}:H${i + 6}`).format.rowHeight = Math.max(42, lines * 15 + 10);
});
detail.freezePanes.freezeRows(5);
detail.freezePanes.freezeColumns(2);
detail.getRange(`E6:F${lastPrRow}`).dataValidation = {rule: {type: 'list', values: ['Oui', 'Non', 'À vérifier']}};
detail.getRange(`G6:G${lastPrRow}`).dataValidation = {rule: {type: 'list', values: ['Ouverte', 'Ouverte (brouillon)', 'Fusionnée', 'Fermée', 'Non recontrôlée']}};
detail.getRange(`E6:F${lastPrRow}`).conditionalFormats.add('containsText', {text: 'À vérifier', format: {fill: palette.red, font: {color: palette.redText}}});
detail.getRange(`E6:E${lastPrRow}`).conditionalFormats.add('containsText', {text: 'Non', format: {fill: palette.amber, font: {color: palette.amberText}}});
detail.getRange(`G6:G${lastPrRow}`).conditionalFormats.add('containsText', {text: 'Non recontrôlée', format: {fill: palette.amber, font: {color: palette.amberText}}});

function shellArg(arg) {return /^[\w./:@=+-]+$/.test(arg) ? arg : "'" + arg.replaceAll("'", "'\\''") + "'";}
function commandText(command) {return Array.isArray(command) ? command.map(shellArg).join(' ') : command;}
function commandLines(command) {
  const text = commandText(command);
  if (!text) return ['Commande non enregistrée dans la source.'];
  const result = [];
  for (const sourceLine of String(text).split('\n')) {
    const words = sourceLine.split(/\s+/).filter(Boolean); let line = '';
    for (const word of words) {
      if (line && line.length + word.length + 1 > 132) {result.push(line + ' \\'); line = word;}
      else line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
  }
  return result;
}
const commandRows = checks.reduce((n, check) => n + commandLines(check.command).length + 4, 0);
const lastCheckRow = 5 + checks.length;
const lastVerificationRow = lastCheckRow + 6 + commandRows;
setup(verification, [22, 39, 18, 13, 10, 77], lastVerificationRow);
value(verification, 'A2', 'Vérifications de consolidation');
value(verification, 'A3', 'Chaque résultat s’applique au code et au périmètre indiqués.');
value(verification, 'A4', 'Les commandes et les références de preuve suivent le tableau.');
verification.getRange('A5:F5').values = [['Domaine', 'Contrôle', 'Résultat', 'Tests réussis', 'Code', 'Périmètre et limite']];
header(verification, 'A5:F5');
if (checks.length) {
  verification.getRange(`A6:F${lastCheckRow}`).values = checks.map(check => [check.group, check.label, check.status, check.passed ?? null, check.exitCode ?? null, check.scope]);
  verification.getRange(`A6:F${lastCheckRow}`).format.wrapText = true;
  verification.getRange(`D6:E${lastCheckRow}`).setNumberFormat('#,##0');
  verification.getRange(`D6:E${lastCheckRow}`).format.horizontalAlignment = 'right';
  striped(verification, 6, lastCheckRow, 'F');
  checks.forEach((check, i) => {
    const lines = Math.max(linesFor(check.group, 21), linesFor(check.label, 36), linesFor(check.scope, 73));
    verification.getRange(`A${i + 6}:F${i + 6}`).format.rowHeight = Math.max(42, lines * 15 + 12);
  });
  verification.getRange(`C6:C${lastCheckRow}`).conditionalFormats.add('containsText', {text: 'Bloqué', format: {fill: palette.amber, font: {color: palette.amberText}}});
  verification.getRange(`C6:C${lastCheckRow}`).conditionalFormats.add('containsText', {text: 'Échoué', format: {fill: palette.red, font: {color: palette.redText}}});
}
verification.freezePanes.freezeRows(5);
let row = lastCheckRow + 3;
value(verification, `A${row}`, 'Commandes et preuves');
verification.getRange(`A${row}:F${row}`).format.font = {name: font, size: 10, bold: true, color: palette.header};
row += 2;
checks.forEach((check, i) => {
  value(verification, `A${row}`, `${i + 1}. ${check.group} — ${check.label}`);
  verification.getRange(`A${row}:F${row}`).format.font = {name: font, size: 10, bold: true, color: palette.header};
  row++;
  for (const line of commandLines(check.command)) value(verification, `A${row++}`, line);
  value(verification, `A${row}`, `Preuve : ${check.source}`);
  verification.getRange(`A${row}:F${row}`).format.font = {name: font, size: 10, color: palette.muted, italic: true};
  row += 2;
});

wb.recalculate();
const actual = summary.getRange('B9:B15').values.map(row => row[0]);
assert.deepEqual(actual, [expected.total, expected.target, expected.missing, expected.unknown, expected.main, expected.merged, expected.remoteUnknown]);
// Exercise the input-driven counts, including a missing Git result, then
// restore the source cells before exporting the single final workbook.
const initialPresence = detail.getRange('E6').values[0][0];
value(detail, 'E6', 'À vérifier'); wb.recalculate();
assert.equal(summary.getRange('B12').values[0][0], expected.unknown + (initialPresence === 'À vérifier' ? 0 : 1));
value(detail, 'E6', initialPresence);
const initialRemote = detail.getRange('G6').values[0][0];
value(detail, 'G6', 'Fusionnée'); wb.recalculate();
assert.equal(summary.getRange('B14').values[0][0], expected.merged + (initialRemote === 'Fusionnée' ? 0 : 1));
value(detail, 'G6', initialRemote);
wb.recalculate();
assert.deepEqual(summary.getRange('B9:B15').values.map(row => row[0]), actual);
assert.deepEqual(detail.getRange(`H6:H${lastPrRow}`).values.map(row => row[0]), prs.map(pr => pr.url));
await fs.mkdir(outputDir, {recursive: true});
const inspection = await wb.inspect({kind: 'table', range: 'Synthèse!A6:G17', include: 'values,formulas', tableMaxRows: 12, tableMaxCols: 7, maxChars: 9000});
const errors = await wb.inspect({kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!|not implemented', options: {useRegex: true, maxResults: 100}, summary: 'Final formula error scan', maxChars: 5000});
await fs.writeFile(path.join(outputDir, 'consolidation-formula-inspection.ndjson'), inspection.ndjson + '\n' + errors.ndjson + '\n');
const previews = [
  ['Synthèse', 'A1:H29', '01-synthese.png'],
  ['PR', 'A1:H12', '02-pr.png'],
  ['Vérifications', `A1:F${Math.min(lastCheckRow, 16)}`, '03-verifications.png'],
  ['Vérifications', `A${lastCheckRow + 3}:F${Math.min(lastVerificationRow, lastCheckRow + 16)}`, '04-commandes.png'],
  ['PR', `A${Math.max(6, lastPrRow - 6)}:H${lastPrRow}`, '05-pr-finales.png'],
];
for (const [sheetName, range, file] of previews) {
  const blob = await wb.render({sheetName, range, scale: 1.5, format: 'png'});
  await fs.writeFile(path.join(outputDir, file), new Uint8Array(await blob.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(path.join(outputDir, outputName));
await fs.writeFile(path.join(outputDir, 'consolidation-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({output: path.join(outputDir, outputName), targetCommit, mainCommit, counts: expected,
  formulaCountsVerified: true, changedInputRecalculationVerified: true, sourceUrlsVerified: true, previews: previews.map(row => row[2]), errorScan: errors.ndjson}, null, 2));
