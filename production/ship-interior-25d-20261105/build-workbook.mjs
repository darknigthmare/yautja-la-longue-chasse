#!/usr/bin/env node
// Run with CODEX_PRIMARY_RUNTIME_NODE from an OS tmp directory whose
// node_modules symlink points to CODEX_PRIMARY_RUNTIME_NODE_MODULES.
// Arguments: absolute catalogue.json, optional absolute deliverables directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

if (!process.argv[2]) throw new Error('Provide the absolute catalogue path.');
if (path.resolve(process.execPath) !== path.resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE ?? '')) throw new Error('Use the primary Node runtime.');
const inputPath = path.resolve(process.argv[2]);
const deliverablesDir = path.resolve(process.argv[3] ?? path.join(path.dirname(inputPath), 'deliverables'));
const outputDir = path.join(path.dirname(path.dirname(inputPath)), 'outputs/ship-final-workbook-20261105');
const inputBytes = await fs.readFile(inputPath);
const catalogue = JSON.parse(inputBytes.toString('utf8'));
const inputSha256 = createHash('sha256').update(inputBytes).digest('hex');
if (catalogue.features.length !== 23 || catalogue.rooms.length !== 8 || catalogue.assets.length !== 13 || catalogue.qa.length !== 17) throw new Error('Unexpected catalogue counts.');
if (catalogue.assets.some(a => a.humanArtValidation !== false)) throw new Error('Human artistic approval must remain open.');
if (!catalogue.verification.finalVisualReview?.inspected || catalogue.verification.finalVisualReview.captureCount !== 14) throw new Error('Expected the updated fourteen-capture agent review.');
await fs.mkdir(deliverablesDir, { recursive: true });
await fs.mkdir(path.join(deliverablesDir, 'qa'), { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

// Display updates follow the integrator's completed agent review. The source
// catalogue is never written by this builder. Global base results stay contextual.
const displayUpdates = {
  'SHIP25-02': 'Quatorze captures finales inspectées par les agents. Comparaison humaine 1:1 ouverte.',
  'SHIP25-05': 'Revoir les contacts précis pendant le mouvement. Les captures observées sont plausibles.',
  'SHIP25-11': 'Captures et ressources contrôlées par les agents. Comparaison humaine des silhouettes ouverte.',
  'SHIP25-14': 'Occlusion et captures vérifiées par les agents. Perspectives et pivots précis restent à qualifier.',
  'SHIP25-22': 'Recette 17/17 et revue des captures par les agents effectuées. Qualification globale ouverte.',
  'SHIP25-23': 'PR 115 en revue sur 114. Consulter la PR 114 pour sa qualification globale.',
};
const features = catalogue.features.map(row => ({ ...row, ...(displayUpdates[row.id] ? { next: displayUpdates[row.id] } : {}) }));
const qaRows = catalogue.qa.map(row => ({ ...row, ...(row.id === 'QA25-13' ? { level: 'Captures finales inspectées par agents. Comparaison humaine 1:1 ouverte.' } : {}) }));
const wb = Workbook.create();
const sheets = Object.fromEntries(['Suivi', 'Salles', 'Ressources', 'QA'].map(name => [name, wb.worksheets.add(name)]));
const palette = { ink: '#27332E', head: '#35433B', rule: '#A28A61', muted: '#65716B', neutral: '#F3F5F3', amber: '#FFF2D9', red: '#FBE7E4' };
function put(sheet, cell, values) { sheet.getRange(cell).writeValues(values); }
function formula(sheet, cell, value) { sheet.getRange(cell).formulas = [[value]]; }
function setup(sheet, title, widths, lastRow) {
  const lastCol = String.fromCharCode(64 + widths.length);
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}${lastRow}`).format = { font: { name: 'Arial', size: 11, color: palette.ink }, verticalAlignment: 'center', rowHeight: 22 };
  widths.forEach((width, col) => { sheet.getRangeByIndexes(0, col, lastRow, 1).format.columnWidthPx = width; });
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 10;
  put(sheet, 'A2', [[title]]);
  sheet.getRange(`A2:${lastCol}2`).format = { font: { name: 'Arial', size: 16, bold: true, color: palette.ink }, rowHeight: 30 };
  sheet.getRange(`A3:${lastCol}3`).format = { rowHeight: 8, borders: { bottom: { style: 'thin', color: palette.rule } } };
  sheet.getRange(`A4:${lastCol}5`).format = { font: { name: 'Arial', size: 11, color: palette.muted }, rowHeight: 24 };
}
function table(sheet, address, name, headers, rows, rowHeight = 44) {
  const r = sheet.getRange(address);
  r.values = [headers, ...rows];
  const t = sheet.tables.add(address, true, name);
  t.style = 'TableStyleLight1'; t.showFilterButton = true;
  r.format = { font: { name: 'Arial', size: 11, color: palette.ink }, verticalAlignment: 'center', wrapText: true, rowHeight };
  r.getRow(0).format = { fill: palette.head, font: { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeight: 30, borders: { insideVertical: { style: 'thin', color: '#FFFFFF' } } };
  return t;
}
function statusRules(range) {
  for (const text of ['À faire', 'Prévu', 'Partiel', 'Partielle', 'À vérifier', 'À exécuter', 'En cours', 'En attente', 'À contrôler', 'À revoir', 'Revue ouverte']) {
    range.conditionalFormats.add('cellIs', { operator: 'equal', formula: '"' + text + '"', format: { fill: palette.amber, font: { color: '#80591A' } } });
  }
  range.conditionalFormats.add('cellIs', { operator: 'equal', formula: '"Échec"', format: { fill: palette.red, font: { color: '#A42A23', bold: true } } });
}
function validation(range, values) { range.dataValidation = { rule: { type: 'list', values } }; }

const follow = sheets.Suivi, featureStart = 12, featureEnd = 34, assetStart = 8, assetEnd = 20;
setup(follow, 'Yautja — Intérieur du vaisseau en 2,5D', [112, 128, 340, 135, 155, 400, 100], 44);
follow.tabColor = palette.head;
put(follow, 'A4', [[`Version ${catalogue.release}. État du 5 novembre 2026. Vaisseau personnel, huit salles et deux ponts.`]]);
put(follow, 'A5', [['Ce classeur suit les résultats et actions. Les essais sont prouvés par les reçus et journaux cités dans QA.']]);
for (const [cell, label] of [['A7', 'Actions suivies'], ['C7', 'Intégrées au code'], ['E7', 'À faire ou prévu'], ['A8', 'Images créées'], ['C8', 'Images intégrées'], ['E8', 'Revues 1:1 ouvertes']]) put(follow, cell, [[label]]);
formula(follow, 'B7', `=COUNTA(A${featureStart}:A${featureEnd})`);
formula(follow, 'D7', `=COUNTIFS(D${featureStart}:D${featureEnd},"Intégré")`);
formula(follow, 'F7', `=COUNTIFS(D${featureStart}:D${featureEnd},"À faire")+COUNTIFS(D${featureStart}:D${featureEnd},"Prévu")`);
formula(follow, 'B8', `=COUNTIFS('Ressources'!D${assetStart}:D${assetEnd},"Généré")`);
formula(follow, 'D8', `=COUNTIFS('Ressources'!D${assetStart}:D${assetEnd},"Généré",'Ressources'!E${assetStart}:E${assetEnd},"Intégré")`);
formula(follow, 'F8', `=COUNTA('Ressources'!A${assetStart}:A${assetEnd})-COUNTIFS('Ressources'!G${assetStart}:G${assetEnd},"Validé humainement")`);
for (const cell of ['B7', 'D7', 'F7', 'B8', 'D8', 'F8']) { follow.getRange(cell).format.font = { name: 'Arial', size: 14, bold: true, color: palette.ink }; follow.getRange(cell).setNumberFormat('#,##0'); }
put(follow, 'A9', [['Version']]); put(follow, 'B9', [[catalogue.release]]); put(follow, 'C9', [['Runtime testé']]); put(follow, 'D9', [[catalogue.publication.runtimeCommit.slice(0, 8)]]); put(follow, 'E9', [['Revue des captures']]); put(follow, 'F9', [['14 PNG inspectés par les agents. Comparaison humaine 1:1 ouverte.']]);
follow.getRange('F9').format.wrapText = true; follow.getRange('A9:G9').format.rowHeight = 32;
table(follow, 'A11:G34', 'ShipActions', ['ID', 'Domaine', 'Fonction ou action', 'Implémentation', 'Validation', 'Prochaine étape', 'Sources'], features.map(r => [r.id, r.domain, r.feature, r.implementation, r.validation, r.next, r.sources]), 46);
validation(follow.getRange('D12:D34'), ['Intégré', 'Partiel', 'À faire', 'Prévu']);
validation(follow.getRange('E12:E34'), ['Tests verts', 'À vérifier', 'Partielle', 'Revue ouverte']);
statusRules(follow.getRange('D12:E34'));
table(follow, 'A38:E42', 'ShipEvidenceGroups', ['Exécution', 'Réussis', 'Périmètre', 'Source', 'Portée du compte'], [
  ['CI3 unitaires', 14, '11 géométrie et 3 chargement différé', 'S16', 'Runtime 86f593ba'],
  ['CI3 navigateur', 17, 'Contrôles natifs de l’intérieur', 'S16', 'Groupe distinct'],
  ['Local final', 34, 'Géométrie, prévol et sauvegarde', 'S15', 'Recouvre le socle'],
  ['Socle historique', 168, '150 + 18 tests distincts, 11 fichiers', 'S06', 'Checkpoint antérieur'],
], 45);
follow.getRange('B39:B42').setNumberFormat('#,##0');
follow.getRange('B39:B42').format.horizontalAlignment = 'center';
put(follow, 'A44', [['Les groupes se recouvrent. Ils ne doivent pas être additionnés. Les journaux locaux historiques n’ont pas été récupérés.']]);
follow.freezePanes.freezeRows(11); follow.freezePanes.freezeColumns(1);

const rooms = sheets.Salles, connections = catalogue.rooms.flatMap(room => room.doors.map(door => ({ ...door, origin: room.id })));
setup(rooms, 'Salles et passages du vaisseau personnel', [190, 240, 106, 96, 96, 340, 92, 156], 38);
put(rooms, 'A4', [['Coordonnées physiques du sol. Une salle mesure 1 200 × 800 unités. La projection du rendu est de 35 degrés.']]);
put(rooms, 'A5', [['Empreinte du chasseur : 48 × 28 unités. Un changement de salle exige une interaction au seuil.']]);
table(rooms, 'A7:H15', 'ShipRooms', ['Salle ID', 'Salle', 'Pont', 'Approche X', 'Approche Y', 'Salles voisines', 'Meubles', 'Contrôle'], catalogue.rooms.map(r => [r.id, r.label, r.deck === 'upper' ? 'Supérieur' : 'Inférieur', r.station.approach.x, r.station.approach.y, r.doors.map(d => catalogue.rooms.find(t => t.id === d.targetRoomId).label + (d.kind === 'lift' ? ' (autre pont)' : '')).join('\n'), r.fixtures.length, 'CI3 réussie']), 43);
rooms.getRange('D8:E15').setNumberFormat('#,##0'); rooms.getRange('G8:G15').setNumberFormat('#,##0');
rooms.getRange('G8:G15').format.horizontalAlignment = 'center';
put(rooms, 'A17', [['Six passages de coursive et deux liaisons entre ponts. Seize seuils directionnels avec retours appariés.']]);
table(rooms, 'A19:H35', 'ShipDoors', ['Origine', 'Destination', 'Passage', 'Seuil X', 'Seuil Y', 'Seuil de retour', 'Arrivée X', 'Arrivée Y'], connections.map(d => { const reverse = catalogue.rooms.find(r => r.id === d.targetRoomId).doors.find(r => r.id === d.targetDoorId); return [d.origin, d.targetRoomId, d.kind === 'lift' ? 'Liaison' : 'Coursive', d.x, d.y, d.targetDoorId, reverse.entry.x, reverse.entry.y]; }), 28);
for (const r of ['D20:E35', 'G20:H35']) rooms.getRange(r).setNumberFormat('#,##0');
put(rooms, 'A37', [['Sources S02, S15 et S16. La position reste conservée sous une interface. Le rechargement revient à la passerelle.']]);
rooms.freezePanes.freezeRows(7); rooms.freezePanes.freezeColumns(1);

const assets = sheets.Ressources;
setup(assets, 'Ressources individuelles et états de production', [184, 205, 265, 115, 124, 145, 165, 280, 80], 36);
put(assets, 'A4', [['Sept images générées et intégrées. Six ressources historiques réemployées. Le sol utilise le PNG original.']]);
put(assets, 'A5', [['Les captures ont été inspectées par les agents. Contrôle technique partiel et comparaison humaine 1:1 ouverte.']]);
table(assets, 'A7:I20', 'ShipResources', ['ID', 'Élément', 'Fichier', 'Génération', 'Intégration', 'Contrôle technique', 'Revue humaine 1:1', 'Prochaine étape', 'Source'], catalogue.assets.map(a => [a.id, a.label, a.file, a.generation, a.integration, a.technical, a.humanReview, null, a.source]), 43);
formula(assets, 'H8', '=IF(OR(D8="",E8="",F8="",G8=""),"Compléter les statuts",IF(D8="En cours","Terminer la génération",IF(E8="En attente","Intégrer au rendu",IF(F8<>"Contrôlé","Vérifier perspective et pivot",IF(G8<>"Validé humainement","Comparer aux références 1:1","Revue renseignée")))))');
assets.getRange('H8:H20').fillDown(); assets.getRange('H8:H20').format.fill = palette.neutral;
validation(assets.getRange('D8:D20'), ['En cours', 'Généré', 'Existant']); validation(assets.getRange('E8:E20'), ['En attente', 'Intégré', 'Réemployé']); validation(assets.getRange('F8:F20'), ['À contrôler', 'Partiel', 'Contrôlé']); validation(assets.getRange('G8:G20'), ['À revoir', 'Validé humainement']); statusRules(assets.getRange('D8:G20'));
put(assets, 'A22', [['Racine des fichiers : public/game/ship-interior/. Les statuts sont indépendants et modifiables. Sources détaillées dans QA.']]);
put(assets, 'A23', [['Une validation humaine exige une référence retenue et une décision documentée. Aucun statut artistique n’est validé ici.']]);
put(assets, 'A25', [['Calibrage actuel : mêmes dimensions et empreintes pour chaque répétition d’un modèle. Unités de jeu. Source S02.']]);
table(assets, 'A27:F34', 'ShipCalibration', ['Modèle', 'Image L', 'Image H', 'Empreinte L', 'Empreinte P', 'Occurrences'], catalogue.modelCalibration.map(m => [m.artKey, m.width, m.height, m.footprintWidth, m.footprintDepth, m.instances]), 27);
assets.getRange('B28:F34').setNumberFormat('#,##0');
assets.freezePanes.freezeRows(7); assets.freezePanes.freezeColumns(2);

const qa = sheets.QA, sourceHeader = 28, sourceEnd = sourceHeader + catalogue.sources.length;
setup(qa, 'Contrôles et références du lot', [105, 310, 420, 135, 270, 155], sourceEnd + 3);
put(qa, 'A4', [['Captures finales inspectées par agents. Comparaison humaine 1:1 ouverte. Manette matérielle non mesurée.']]);
put(qa, 'A5', [['Qualification globale de la base ouverte : consulter la PR 114. Ses anciens résultats restent contextuels et historiques.']]);
table(qa, 'A7:F24', 'ShipQuality', ['ID', 'Contrôle', 'Résultat attendu', 'Résultat constaté', 'Niveau de preuve', 'Sources'], qaRows.map(q => [q.id, q.criterion, q.expected, q.result, q.level, q.sources]), 50);
validation(qa.getRange('D8:D24'), ['Réussi', 'Partiel', 'En cours', 'À exécuter', 'À revoir', 'Documenté', 'Échec']); statusRules(qa.getRange('D8:D24'));
put(qa, 'A26', [['Références complètes. Les chemins sont relatifs au dépôt Yautja The Long Hunt. Aucun test n’est exécuté par ce classeur.']]);
const details = {
  S01: 'Reprise initiale, puis base 1951 et suivi QA 8cee. Base distincte du runtime testé.', S02: '17 meubles, 8 approches et 16 seuils, rapprochés du code publié.',
  S03: 'Scène personnelle, commandes et sol PNG projeté une seule fois.', S04: 'Observation ship-ground-v1. Compatibilité du contrat et des reçus historiques.',
  S05: 'Sept générations, intégrations et mesures. HumanArtValidation reste false.', S06: 'Historique : 168 tests distincts. Journaux locaux 150/18 non récupérés.',
  S07: 'CI3 : 14 tests et 17 contrôles réussis. Quatorze PNG inspectés par les agents.', S08: 'Arrivées, triade et réserve énergétique conservées.',
  S09: 'Clan Ship hors conversion actuelle. Projection et sept décors à adapter.', S10: 'Génération, intégration et revue humaine sont des étapes distinctes.',
  S11: 'Six ressources V21/V22 réemployées. Revue artistique toujours ouverte.', S12: 'Publication du runtime 86f593ba et des sept ressources.',
  S13: 'Ancienne recette partielle : pivot 0×0 et favicon. Corrections intégrées.', S14: 'Ancienne recette : cinq contrôles réussis, puis deux sprites absents. Corrigé.',
  S15: '34 tests locaux rejoués et lint strict. Journal local non récupéré.', S16: 'CI3 réussie : 14 unitaires et 17 navigateur. Captures revues par agents.',
  S17: 'Bilan de 1951 historique. Le suivi 8cee ne vaut pas qualification globale. Consulter la PR 114.',
};
table(qa, `A${sourceHeader}:F${sourceEnd}`, 'ShipReferences', ['Réf.', 'Source', 'Référence complète', 'Révision', 'Portée', 'Nature'], catalogue.sources.map(s => [s.id, s.label, s.id === 'S06' ? `Journaux non récupérés :\n${s.reference}` : s.reference, s.id === 'S01' ? catalogue.base.commit : s.revision, details[s.id] ?? s.detail, ['S06', 'S07', 'S13', 'S14', 'S15', 'S16'].includes(s.id) ? 'Vérification' : s.id === 'S17' ? 'Contexte historique' : 'Projet']), 76);
const historicSourceRow = sourceHeader + 1 + catalogue.sources.findIndex(s => s.id === 'S17');
qa.getRange(`A${historicSourceRow}:F${historicSourceRow}`).format.rowHeight = 112;
put(qa, `A${sourceEnd + 2}`, [[catalogue.repository]]);
qa.freezePanes.freezeRows(7); qa.freezePanes.freezeColumns(1);

// Exercise the editable status workflow and restore source values.
const originalStatuses = assets.getRange('D8:G8').values;
const recalculationChecks = [];
for (const [values, expected] of [
  [['Généré', 'En attente', 'Partiel', 'À revoir'], 'Intégrer au rendu'],
  [['Généré', 'Intégré', 'Partiel', 'À revoir'], 'Vérifier perspective et pivot'],
  [['Généré', 'Intégré', 'Contrôlé', 'À revoir'], 'Comparer aux références 1:1'],
  [['Généré', 'Intégré', 'Contrôlé', ''], 'Compléter les statuts'],
]) {
  assets.getRange('D8:G8').values = [values]; wb.recalculate();
  const actual = assets.getRange('H8').values[0][0];
  if (actual !== expected) throw new Error(`Recalculation mismatch: ${actual}`);
  if (follow.getRange('F8').values[0][0] !== 13) throw new Error('An open or missing human review was incorrectly hidden.');
  recalculationChecks.push({ values, expected, actual, passed: true });
}
assets.getRange('D8:G8').values = originalStatuses;
wb.recalculate();
const expectedCounts = { B7: 23, D7: features.filter(f => f.implementation === 'Intégré').length, F7: features.filter(f => ['À faire', 'Prévu'].includes(f.implementation)).length, B8: 7, D8: 7, F8: 13 };
const actualCounts = Object.fromEntries(Object.keys(expectedCounts).map(cell => [cell, follow.getRange(cell).values[0][0]]));
for (const [cell, expected] of Object.entries(expectedCounts)) if (actualCounts[cell] !== expected) throw new Error(`Counter mismatch ${cell}`);
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 40 }, summary: 'Final formula error scan', maxChars: 4000 });
await fs.writeFile(path.join(deliverablesDir, 'qa/formula-scan.ndjson'), errors.ndjson + '\n');
if (!errors.ndjson.includes('Cell search matched 0 entries.')) throw new Error('Nonempty formula-error scan.');
const inspection = await wb.inspect({ kind: 'table', range: 'Suivi!A7:G9', include: 'values,formulas', tableMaxRows: 3, tableMaxCols: 7, maxChars: 6000 });
await fs.writeFile(path.join(deliverablesDir, 'qa/counters.ndjson'), inspection.ndjson + '\n');
const previews = [
  ['Suivi', 'A1:G20', 'suivi.png'], ['Suivi', 'A21:G44', 'suivi-suite.png'],
  ['Salles', 'A1:H16', 'salles.png'], ['Salles', 'A17:H38', 'passages.png'],
  ['Ressources', 'A1:I20', 'ressources.png'], ['Ressources', 'A22:I34', 'calibrage.png'],
  ['QA', 'A1:F24', 'qa.png'], ['QA', 'A26:F36', 'references-1.png'], ['QA', `A37:F${sourceEnd + 2}`, 'references-2.png'],
];
for (const [sheetName, range, name] of previews) {
  const blob = await wb.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(deliverablesDir, 'qa', name), new Uint8Array(await blob.arrayBuffer()));
}
const filename = 'yautja-interieur-25d-v1.6.0.xlsx';
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(path.join(outputDir, filename));
await fs.copyFile(path.join(outputDir, filename), path.join(deliverablesDir, filename));
const bytes = await fs.readFile(path.join(deliverablesDir, filename));
if (createHash('sha256').update(await fs.readFile(inputPath)).digest('hex') !== inputSha256) throw new Error('Input catalogue changed during generation; rerun with the completed source.');
const report = {
  createdAt: new Date().toISOString(), engine: '@oai/artifact-tool', runtime: process.execPath,
  input: { path: inputPath, bytes: inputBytes.length, sha256: inputSha256, modified: false },
  workbook: { path: path.join(deliverablesDir, filename), outputPath: path.join(outputDir, filename), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), gitBlobSha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') },
  worksheets: Object.keys(sheets), records: { actions: 23, rooms: 8, thresholds: 16, resources: 13, criteria: 17, sources: catalogue.sources.length },
  expectedCounts, actualCounts, recalculationChecks, sourceStatusesRestored: true, formulaErrors: 0,
  evidenceGroups: { ciUnitTests: 14, browserControls: 17, localRerun: 34, historicalDistinct: 168, addedTogether: false },
  agentCaptureReview: { captures: 14, inspected: true, humanArtValidation: false, technicalArtStatus: 'Partiel' },
  displayUpdates, parentBaseQualification: 'Open; consult PR 114. Historical figures are not current overall qualification.',
  sourceDisplayUpdates: { S01: 'Revision shows catalogue.base.commit, the current 8cee QA synchronization; the scope preserves prior history.', S06: 'Historical paths explicitly prefixed as unrecovered logs; no hyperlinks created.' },
  renders: previews.map(([sheet, range, name]) => ({ sheet, range, path: path.join(deliverablesDir, 'qa', name) })),
  visualReview: 'Pending inspection of exported previews', nativeExcelExecuted: false,
};
await fs.writeFile(path.join(deliverablesDir, 'workbook-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ workbook: report.workbook, counts: actualCounts, formulaErrors: 0, renders: previews.length, inputUnchanged: true }, null, 2));
