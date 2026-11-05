import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Run with CODEX_PRIMARY_RUNTIME_NODE from a temporary directory whose
// node_modules points to CODEX_PRIMARY_RUNTIME_NODE_MODULES. No repository
// package participates in workbook authoring.
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES is required');
const require = createRequire(path.join(process.cwd(), 'package.json'));
const resolved = require.resolve('@oai/artifact-tool');
if (!resolved.startsWith(path.resolve(runtimeModules) + path.sep)) throw new Error('Artifact Tool must resolve from the primary runtime');
const { Workbook, SpreadsheetFile } = await import(resolved);

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const outputDir = process.env.CLAN_OPERATIONS_OUTPUT || path.join(root, 'outputs', 'clan-operations-20261105');
await fs.mkdir(outputDir, { recursive: true });
const catalogue = JSON.parse(await fs.readFile(path.join(directory, 'operations-catalogue.json'), 'utf8'));
const data = JSON.parse(await fs.readFile(path.join(directory, 'operations-production.json'), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(JSON.stringify(catalogue.sourceFiles)), catalogue.sourceDigest, 'catalogue source digest');
for (const item of catalogue.sourceFiles) {
  const bytes = await fs.readFile(path.join(root, item.path));
  assert.equal(sha256(bytes), item.sha256, `Source changed: re-run export-operations-catalogue.mjs (${item.path})`);
}
for (const record of data.qa) {
  if (record.result === 'Réussi') assert.ok(record.evidence && record.sourceDigest, `A successful recipe needs evidence and source: ${record.id}`);
}
const contracts = catalogue.contracts;
const steps = contracts.flatMap(contract => contract.steps.map((step, index) => ({ ...step, contractId: contract.id, index: index + 1, next: contract.steps[index + 1] })));
const roomName = id => catalogue.rooms.find(room => room.id === id)?.label ?? id;
const kindName = { onboarding: 'Accueil', interior: 'À bord', field: 'Chasse', space: 'Espace' };
const qualified = id => data.qa.filter(row => row.id === id).every(row => row.result === 'Réussi') && data.qa.some(row => row.id === id) ? 'Vérifié' : 'À vérifier';
const sourceDate = new Date(`${data.asOf}T12:00:00Z`);

const wb = Workbook.create();
const names = ['Opérations', 'Contrats', 'Étapes à bord', 'Équipage', 'Espace', 'Ressources', 'Recette', 'Lore'];
const sheets = Object.fromEntries(names.map(name => [name, wb.worksheets.add(name)]));
const colors = { header: '#25353B', bronze: '#74583C', paper: '#F3F5F5', line: '#BFC7C8', ink: '#1E2C32', note: '#5D6B71', input: '#FFF4D9', pending: '#FFF1CC', error: '#FDE8E8', plan: '#EAF0F5' };
const letters = index => {
  let result = ''; let value = index + 1;
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
};
const previews = [];
function base(name, title, subtitle, widths, lastRow) {
  const sheet = sheets[name];
  sheet.showGridLines = false;
  const lastCol = letters(widths.length - 1);
  sheet.getRange(`A1:${lastCol}${lastRow}`).format = { font: { name: 'Arial', size: 11, color: colors.ink }, verticalAlignment: 'center' };
  widths.forEach((width, index) => { sheet.getRange(`${letters(index)}1:${letters(index)}${lastRow}`).format.columnWidth = width; });
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: colors.header };
  sheet.getRange(`A2:${lastCol}2`).format.rowHeight = 29;
  sheet.getRange(`A2:${lastCol}2`).format.borders = { bottom: { style: 'thin', color: colors.line } };
  sheet.getRange('A3').values = [[subtitle]];
  sheet.getRange('A3').format.font = { name: 'Arial', size: 10, color: colors.note, italic: true };
  sheet.getRange(`A3:${lastCol}3`).format.rowHeight = 23;
  return sheet;
}
function rowHeight(values, widths) {
  return Math.max(33, ...values.map((value, index) => {
    if (value === null || value === undefined || typeof value !== 'string') return 30;
    const usable = Math.max(8, widths[index] - 2);
    const lines = value.split('\n').reduce((total, part) => total + Math.max(1, Math.ceil(part.length / usable)), 0);
    return lines * 14 + 12;
  }));
}
function table(sheet, name, headerRow, headers, rows, widths, freeze = true) {
  const lastCol = letters(headers.length - 1), lastRow = headerRow + rows.length;
  sheet.getRange(`A${headerRow}:${lastCol}${lastRow}`).values = [headers, ...rows];
  const range = sheet.getRange(`A${headerRow}:${lastCol}${lastRow}`);
  range.format.wrapText = true;
  range.format.verticalAlignment = 'top';
  const native = sheet.tables.add(`A${headerRow}:${lastCol}${lastRow}`, true, name);
  native.style = 'TableStyleLight1';
  native.showFilterButton = true;
  sheet.getRange(`A${headerRow}:${lastCol}${headerRow}`).format = {
    fill: colors.header, font: { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center', verticalAlignment: 'center', rowHeight: 37, wrapText: true,
    borders: { insideVertical: { style: 'thin', color: '#FFFFFF' } },
  };
  rows.forEach((row, index) => { sheet.getRange(`A${headerRow + index + 1}:${lastCol}${headerRow + index + 1}`).format.rowHeight = rowHeight(row, widths); });
  if (freeze) { sheet.freezePanes.freezeRows(headerRow); sheet.freezePanes.freezeColumns(Math.min(3, headers.length)); }
  return { first: headerRow + 1, last: lastRow, lastCol };
}
function statuses(sheet, range, values, editable = true) {
  const target = sheet.getRange(range);
  target.dataValidation = { rule: { type: 'list', values } };
  if (editable) target.format.fill = colors.input;
  for (const value of ['À revoir', 'À vérifier', 'À exécuter', 'À développer', 'Prévu', 'À produire', 'Réemploi à étudier']) {
    target.conditionalFormats.add('containsText', { text: value, format: { fill: colors.pending, font: { color: '#6C471A' } } });
  }
  target.conditionalFormats.add('containsText', { text: 'Échec', format: { fill: colors.error, font: { color: '#9F2424', bold: true } } });
}
function metricBlock(sheet, labels, formulas) {
  const end = letters(labels.length - 1);
  sheet.getRange(`A5:${end}5`).values = [labels];
  sheet.getRange(`A5:${end}5`).format = { fill: colors.paper, font: { name: 'Arial', size: 10, color: colors.note }, wrapText: true, rowHeight: 31, horizontalAlignment: 'center' };
  sheet.getRange(`A6:${end}6`).formulas = [formulas];
  sheet.getRange(`A6:${end}6`).format = { font: { name: 'Arial', size: 16, bold: true, color: colors.header }, horizontalAlignment: 'center', rowHeight: 31 };
  sheet.getRange(`A6:${end}6`).setNumberFormat('#,##0');
}

// Primary tracker: code, evidence and artistic review have separate editable inputs.
const featureWidths = [15, 21, 34, 62, 10, 20, 20, 22, 31, 54, 46, 24];
const featureSheet = base('Opérations', 'Clan Ship — Opérations', '5 novembre 2026 · campagne, table holo et équipage', featureWidths, data.features.length + 15);
featureSheet.tabColor = colors.header;
const featureRows = data.features.map(item => [item.id, item.area, item.name, item.acceptance, item.priority, item.implementation, item.verification, item.artReview, null, item.nextAction, item.source, item.qa]);
const f = table(featureSheet, 'ClanOperationsTracker', 9, ['ID', 'Domaine', 'Fonction', 'Critère observable', 'Priorité', 'Réalisation', 'Vérification', 'Revue artistique', 'État de livraison', 'Prochaine action', 'Source du projet', 'Recette'], featureRows, featureWidths);
featureSheet.getRange(`I${f.first}:I${f.last}`).formulas = data.features.map((item, index) => {
  const row = f.first + index;
  return [`=IF(F${row}="Prévu","À développer",IF(G${row}<>"Vérifié","À vérifier",IF(OR(H${row}="Validé",H${row}="Sans revue"),"Qualifié","Revue artistique attendue")))`];
});
statuses(featureSheet, `F${f.first}:F${f.last}`, ['Code présent', 'Prévu']);
statuses(featureSheet, `G${f.first}:G${f.last}`, ['À vérifier', 'Vérifié', 'Échec']);
statuses(featureSheet, `H${f.first}:H${f.last}`, ['À revoir', 'Validé', 'Sans revue']);
featureSheet.getRange(`E${f.first}:E${f.last}`).dataValidation = { rule: { type: 'list', values: ['P0', 'P1', 'P2'] } };
featureSheet.getRange(`I${f.first}:I${f.last}`).conditionalFormats.add('containsText', { text: 'Revue artistique attendue', format: { fill: colors.pending, font: { color: '#6C471A' } } });
metricBlock(featureSheet, ['Fonctions et suites', 'Code présent', 'Vérifiées', 'À développer', 'Art à revoir', 'Qualifiées'], [
  `=COUNTA(A${f.first}:A${f.last})`, `=COUNTIFS(F${f.first}:F${f.last},"Code présent")`, `=COUNTIFS(G${f.first}:G${f.last},"Vérifié")`,
  `=COUNTIFS(F${f.first}:F${f.last},"Prévu")`, `=COUNTIFS(H${f.first}:H${f.last},"À revoir")`, `=COUNTIFS(I${f.first}:I${f.last},"Qualifié")`,
]);
featureSheet.getRange(`A${f.last + 3}`).values = [['Code présent : intégration observée dans la source. La preuve et la revue artistique sont renseignées séparément.']];
featureSheet.getRange(`A${f.last + 4}`).values = [['Champs de suivi modifiables : cellules ambrées. Le catalogue chiffré se régénère depuis les définitions du jeu.']];

const contractWidths = [27, 18, 36, 65, 29, 30, 13, 12, 12, 12, 28, 20, 20, 26];
const contractSheet = base('Contrats', 'Douze dossiers du clan', 'Un accueil, quatre parcours à bord, quatre chasses et trois opérations spatiales', contractWidths, contracts.length + 12);
const c = table(contractSheet, 'ClanContracts', 9,
  ['ID', 'Catégorie', 'Titre', 'Briefing', 'Contrats préalables', 'Destination', 'Étapes à bord', 'Score minimal', 'Scans minimaux', 'Marques', 'Recrue éligible', 'Réalisation', 'Vérification', 'Source'],
  contracts.map(item => [item.id, kindName[item.kind], item.name, item.briefing, item.prerequisiteIds.join('\n') || (item.kind === 'onboarding' ? 'Accès au Clan Ship ; aucun mandat requis' : 'Mandat du conseil'),
    item.missionId || (item.spaceKind ? catalogue.space.scenarios.find(s => s.id === item.spaceKind).title : roomName(item.roomId)), item.steps.length,
    item.kind === 'field' ? item.minimumScore : null, item.kind === 'field' ? item.minimumScans : null, item.clanMarksReward,
    catalogue.crew.filter(npc => npc.requiredContractIds.includes(item.id)).map(npc => npc.name).join('\n') || 'Aucune',
    'Code présent', 'À vérifier', 'clanShipOperations.ts']), contractWidths);
contractSheet.getRange(`G${c.first}:J${c.last}`).setNumberFormat('#,##0');
contractSheet.getRange(`G${c.first}:J${c.last}`).format.horizontalAlignment = 'right';
metricBlock(contractSheet, ['Dossiers', 'À bord', 'Chasses', 'Espace', 'Marques possibles'], [
  `=COUNTA(A${c.first}:A${c.last})`, `=COUNTIFS(B${c.first}:B${c.last},"À bord")`, `=COUNTIFS(B${c.first}:B${c.last},"Chasse")`, `=COUNTIFS(B${c.first}:B${c.last},"Espace")`, `=SUM(J${c.first}:J${c.last})`,
]);
statuses(contractSheet, `M${c.first}:M${c.last}`, ['À vérifier', 'Vérifié', 'Échec']);

const stepWidths = [28, 10, 27, 43, 67, 42, 38, 20, 20];
const stepSheet = base('Étapes à bord', 'Seize interactions intérieures', 'Chaque validation dépend du contrat, de l’ordre et de la salle réelle', stepWidths, steps.length + 11);
const s = table(stepSheet, 'ClanInteriorSteps', 7, ['Contrat', 'Ordre', 'Salle', 'Action', 'Description', 'Étape suivante', 'Reprise et récompense', 'Réalisation', 'Vérification'],
  steps.map(item => [item.contractId, item.index, roomName(item.roomId), item.label, item.description,
    item.next ? `${roomName(item.next.roomId)} : ${item.next.label}` : item.contractId === 'welcome-aboard' ? 'Audience de mandat au conseil' : 'Reçu unique du contrat',
    item.next ? 'Conserver l’étape ; aucun paiement intermédiaire' : item.contractId === 'welcome-aboard' ? 'Accueil conservé ; 0 marque' : 'Dernière étape et reçu enregistrés avec le gain',
    'Code présent', qualified('OPS-Q06')]), stepWidths);
stepSheet.getRange(`B${s.first}:B${s.last}`).setNumberFormat('0');
statuses(stepSheet, `I${s.first}:I${s.last}`, ['À vérifier', 'Vérifié', 'Échec']);

const crewWidths = [26, 27, 28, 28, 29, 63, 65, 27, 65, 20, 20, 22];
const crewSheet = base('Équipage', 'Six membres visibles à bord', 'Accord après preuve, poste permanent, compétence active au prochain départ spatial', crewWidths, catalogue.crew.length + 11);
const n = table(crewSheet, 'ClanCrew', 7, ['ID', 'Nom original', 'Rôle', 'Poste', 'Preuve requise', 'Contribution tactique', 'Réplique d’accord', 'Variante réemployée', 'Dessin individuel', 'Réalisation', 'Vérification', 'Revue artistique'],
  catalogue.crew.map(item => [item.id, item.name, item.role, roomName(item.roomId), item.requiredContractIds.join('\n'), item.tacticalEffect.effect, item.joinLine,
    item.art.variantId, `public${item.art.src}`, 'Code présent', qualified('OPS-Q09'), 'À revoir']), crewWidths);
statuses(crewSheet, `K${n.first}:K${n.last}`, ['À vérifier', 'Vérifié', 'Échec']);
statuses(crewSheet, `L${n.first}:L${n.last}`, ['À revoir', 'Validé']);
crewSheet.getRange(`A${n.last + 3}`).values = [['Les six dessins sont réemployés. Les routines, gestes animés et dialogues de retour sont suivis dans les suites à développer.']];

const spaceWidths = [21, 31, 16, 67, 63, 43, 20, 20];
const spaceSheet = base('Espace', 'Commandement spatial', 'Jauges originales de gameplay. L’écran défensif représente une formation de couverture.', spaceWidths, 43);
const scenarioRows = catalogue.space.scenarios.map(item => [item.id, item.title, item.assetLabel, item.briefing, item.objective, 'Victoire / défaite / retrait', 'Code présent', qualified('OPS-Q11')]);
table(spaceSheet, 'ClanSpaceScenarios', 7, ['Type', 'Scénario', 'Élément protégé', 'Situation', 'Objectif réel', 'Issues', 'Réalisation', 'Vérification'], scenarioRows, spaceWidths);
spaceSheet.getRange('A13').values = [['Neuf ordres tactiques']];
spaceSheet.getRange('A13').format.font = { name: 'Arial', size: 14, bold: true, color: colors.header };
const orderRules = {
  scan: ['Analyse incomplète ; énergie disponible', 'Signature puis solution d’abordage'],
  manoeuvre: ['Énergie disponible', 'Portée + couverture ; segment en escorte'],
  recharge: ['Réserve non pleine', 'Récupération avec exposition accrue'],
  brace: ['Engagement actif', 'Protection ; segment après identification'],
  disrupt: ['Contact identifié, à portée et encore actif', 'Propulsion affaiblie, sans victoire seule'],
  fire: ['Contact identifié, à portée et encore actif', 'Neutralisation décisive en interception'],
  board: ['Hors escorte ; analyse 2 ; portée proche ; propulsion ≤ 20 ou intégrité ≤ 35', 'Interception gagnée ou capsule récupérée'],
  extract: ['Escorte : 3 segments ; récupération : équipe prête ; énergie suffisante', 'Victoire sur extraction explicite'],
  withdraw: ['Engagement actif', 'Retrait sans reçu ni marques'],
};
const o = table(spaceSheet, 'ClanSpaceOrders', 15, ['ID', 'Ordre', 'Coût nominal', 'Effet', 'Condition', 'Résultat', 'Réalisation', 'Vérification'],
  catalogue.space.orders.map(item => [item.id, item.label, item.id === 'recharge' ? -4 : item.id === 'brace' ? -2 : item.cost,
    item.detail, orderRules[item.id][0], orderRules[item.id][1], 'Code présent', qualified('OPS-Q14')]), spaceWidths, false);
spaceSheet.getRange(`C${o.first}:C${o.last}`).setNumberFormat('0;[Red](0);0');
spaceSheet.getRange('A27').values = [['Coût négatif : énergie récupérée, limitée au plafond. L’abordage coûte 1 avec le gardien, 2 sans lui.']];
spaceSheet.getRange('A29:C29').values = [['Tours maximum', 'Énergie au départ', 'Plafond énergie']];
spaceSheet.getRange('A30:C30').values = [[catalogue.space.maxTurns, catalogue.space.initialEnergy, catalogue.space.maxEnergy]];
spaceSheet.getRange('A29:C29').format = { fill: colors.paper, font: { name: 'Arial', size: 11, bold: true }, horizontalAlignment: 'center', wrapText: true, rowHeight: 32 };
spaceSheet.getRange('A30:C30').format = { horizontalAlignment: 'center', rowHeight: 30 };
spaceSheet.getRange('A32').values = [['Source : app/game/systems/clanShipSpaceEncounter.ts. Les valeurs ne sont pas des performances filmiques du vaisseau AVP.']];

const resources = [
  ...catalogue.backgrounds.map(item => ({ id: item.id, category: 'Décor', name: roomName(item.roomId), production: 'Réemployé et raccordé', source: `public${item.src}`, bytes: item.bytes, width: null, height: null,
    use: 'Fond propre à la salle ; aucune collision déduite du décor.', artReview: 'À revoir', nextAction: 'Comparer aux références et au rendu réel.' })),
  ...catalogue.props.map(item => ({ id: item.id, category: 'Prop dédié', name: item.id, production: 'Réemployé et raccordé', source: `public${item.src}`, bytes: item.bytes, width: item.sourceWidth, height: item.sourceHeight,
    use: item.id === 'council-table' ? '560 × 325 unités affichées ; empreinte et accès définis séparément.' : 'Installation existante ; identité et point d’usage conservés.', artReview: 'À revoir', nextAction: 'Relire l’asset dans sa nouvelle fonction.' })),
  ...catalogue.crew.map(item => ({ id: item.id, category: 'PNJ individuel', name: item.name, production: 'Réemployé et raccordé', source: `public${item.art.src}`, bytes: item.art.bytes, width: item.art.sourceWidth, height: item.art.sourceHeight,
    use: `Poste ${roomName(item.roomId)} ; pose fixe ${item.art.motionStatus}.`, artReview: 'À revoir', nextAction: 'Valider silhouette, rôle et lisibilité à l’échelle.' })),
  ...catalogue.sharedArt.map(item => ({ id: item.id, category: 'Art partagé', name: item.name, production: 'Réemployé et raccordé', source: `public${item.src}`, bytes: item.bytes, width: item.sourceWidth ?? null, height: item.sourceHeight ?? null,
    use: item.use, artReview: 'À revoir', nextAction: 'Conserver les références et l’identité de l’installation.' })),
  { id: 'OPS-CODE-01', category: 'Projection SVG', name: 'Projection au-dessus de la table', production: 'Rendu en code', source: 'app/game/ClanShipInterior.tsx', bytes: null, width: null, height: null, use: 'Calque distinct du prop et de la collision.', artReview: 'À revoir', nextAction: 'Contrôler lisibilité et portée visuelle.' },
  { id: 'OPS-CODE-02', category: 'Projection SVG', name: 'Situation tactique spatiale', production: 'Rendu en code', source: 'app/game/ClanShipSpaceEncounter.tsx', bytes: null, width: null, height: null, use: 'Symboles abstraits, portée, cible et progression.', artReview: 'À revoir', nextAction: 'Contrôler les états et la version mobile.' },
  ...data.futureResources.map(item => ({ id: item.id, category: item.kind, name: item.name, production: item.production, source: 'À définir après référence', bytes: null, width: null, height: null, use: item.need, artReview: item.humanReview, nextAction: item.nextAction })),
];
const resourceWidths = [29, 25, 38, 27, 72, 14, 13, 13, 65, 22, 58];
const resourceSheet = base('Ressources', 'Ressources de l’extension', 'Réemplois existants, projections en code et besoins futurs sont comptés séparément', resourceWidths, resources.length + 14);
const a = table(resourceSheet, 'ClanOperationAssets', 9, ['ID', 'Catégorie', 'Nom / usage', 'Production', 'Fichier ou source', 'Octets', 'Largeur px', 'Hauteur px', 'Usage et contrainte', 'Revue artistique', 'Prochaine action'],
  resources.map(item => [item.id, item.category, item.name, item.production, item.source, item.bytes, item.width, item.height, item.use, item.artReview, item.nextAction]), resourceWidths);
resourceSheet.getRange(`F${a.first}:H${a.last}`).setNumberFormat('#,##0');
resourceSheet.getRange(`F${a.first}:H${a.last}`).format.horizontalAlignment = 'right';
statuses(resourceSheet, `D${a.first}:D${a.last}`, ['Réemployé et raccordé', 'Rendu en code', 'Réemploi à étudier', 'À produire']);
statuses(resourceSheet, `J${a.first}:J${a.last}`, ['À revoir', 'Validé']);
metricBlock(resourceSheet, ['Réemplois de fichiers', 'Rendus en code', 'À produire', 'Réemploi à étudier', 'Octets réemployés'], [
  `=COUNTIFS(D${a.first}:D${a.last},"Réemployé et raccordé")`, `=COUNTIFS(D${a.first}:D${a.last},"Rendu en code")`, `=COUNTIFS(D${a.first}:D${a.last},"À produire")`, `=COUNTIFS(D${a.first}:D${a.last},"Réemploi à étudier")`, `=SUM(F${a.first}:F${a.last})`,
]);
resourceSheet.getRange(`A${a.last + 3}`).values = [['Les dimensions laissées vides ne sont pas affirmées par le catalogue. Les besoins futurs ne sont pas des fichiers générés.']];

const qaWidths = [17, 28, 38, 76, 22, 76, 72, 25, 70];
const qaSheet = base('Recette', 'Recette des opérations', 'Les critères sont distincts des résultats. Une preuve doit identifier sa version.', qaWidths, data.qa.length + 12);
const q = table(qaSheet, 'ClanOperationRecipes', 9, ['ID', 'Type de preuve', 'Parcours', 'Résultat attendu', 'État', 'Preuve obtenue', 'Source vérifiée', 'Responsable', 'Scénario / point d’entrée'],
  data.qa.map(item => [item.id, item.type, item.name, item.criterion, item.result, item.evidence || 'Non renseignée', item.sourceDigest || 'Non renseignée', item.reviewer || 'Non renseigné', item.source]), qaWidths);
statuses(qaSheet, `E${q.first}:E${q.last}`, ['À exécuter', 'Réussi', 'Échec', 'À développer']);
qaSheet.getRange(`F${q.first}:H${q.last}`).format.fill = colors.input;
metricBlock(qaSheet, ['Critères', 'Réussis', 'À exécuter', 'À développer', 'Échecs'], [
  `=COUNTA(A${q.first}:A${q.last})`, `=COUNTIFS(E${q.first}:E${q.last},"Réussi")`, `=COUNTIFS(E${q.first}:E${q.last},"À exécuter")`, `=COUNTIFS(E${q.first}:E${q.last},"À développer")`, `=COUNTIFS(E${q.first}:E${q.last},"Échec")`,
]);
qaSheet.getRange(`A${q.last + 3}`).values = [['Les validations historiques Clan Ship restent dans le dossier du lot précédent. Elles ne sont pas attribuées à cette extension.']];

const loreWidths = [19, 31, 29, 79, 43, 28, 73, 34, 85];
const loreSheet = base('Lore', 'Lore et décisions de production', 'Œuvre précise, adaptation et création originale gardent une provenance distincte', loreWidths, data.loreReviews.length + data.references.length + 22);
const l = table(loreSheet, 'ClanLoreDecisions', 7, ['ID', 'Sujet', 'Nature', 'Décision', 'Références', 'Avis humain', 'Action de revue'],
  data.loreReviews.map(item => [item.id, item.subject, item.status, item.decision, item.reference, item.humanReview, item.action]), loreWidths.slice(0, 7));
statuses(loreSheet, `F${l.first}:F${l.last}`, ['À revoir', 'Validé']);
const refsTitle = l.last + 3, refsHeader = refsTitle + 2;
loreSheet.getRange(`A${refsTitle}`).values = [['Références consultées']];
loreSheet.getRange(`A${refsTitle}`).format.font = { name: 'Arial', size: 14, bold: true, color: colors.header };
const lr = table(loreSheet, 'ClanLoreReferences', refsHeader, ['ID', 'Œuvre', 'Source', 'Élément documenté', 'Limite', 'Usage dans le projet', 'Consultation', 'État de lecture', 'URL'],
  data.references.map(item => [item.id, item.work, item.nature, item.claim, item.limitation, item.application, new Date(`${item.checked}T12:00:00Z`), item.review, item.url]), loreWidths, false);
loreSheet.getRange(`G${lr.first}:G${lr.last}`).setNumberFormat('dd/mm/yyyy');
loreSheet.getRange(`G${lr.first}:G${lr.last}`).format.horizontalAlignment = 'right';

// Verify editable workflow prerequisites with a reversible input change.
const artIndex = data.features.findIndex(item => item.implementation === 'Code présent' && item.artReview === 'À revoir');
assert.ok(artIndex >= 0, 'one visually reviewed feature is expected');
const artRow = f.first + artIndex;
const oldVerification = featureSheet.getRange(`G${artRow}`).values[0][0];
const oldArt = featureSheet.getRange(`H${artRow}`).values[0][0];
featureSheet.getRange(`G${artRow}`).values = [['Vérifié']];
assert.equal(featureSheet.getRange(`I${artRow}`).values[0][0], 'Revue artistique attendue', 'technical proof must not imply human art approval');
featureSheet.getRange(`H${artRow}`).values = [['Validé']];
assert.equal(featureSheet.getRange(`I${artRow}`).values[0][0], 'Qualifié', 'both prerequisites produce a qualified status');
featureSheet.getRange(`G${artRow}`).values = [[oldVerification]];
featureSheet.getRange(`H${artRow}`).values = [[oldArt]];

// One final recalculation after all edits and restored verification inputs.
wb.recalculate();
const expectedReward = contracts.reduce((sum, item) => sum + item.clanMarksReward, 0);
assert.equal(contractSheet.getRange('E6').values[0][0], expectedReward, 'total unique contract rewards');
assert.equal(featureSheet.getRange('A6').values[0][0], data.features.length, 'feature count');
assert.equal(featureSheet.getRange('B6').values[0][0], data.features.filter(item => item.implementation === 'Code présent').length, 'observed code count');
assert.equal(resourceSheet.getRange('A6').values[0][0], resources.filter(item => item.production === 'Réemployé et raccordé').length, 'reused file count');
assert.equal(qaSheet.getRange('B6').values[0][0], data.qa.filter(item => item.result === 'Réussi').length, 'recorded verification count');
const errorScan = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan', maxChars: 5000 });
await fs.writeFile(path.join(outputDir, 'formula-errors.ndjson'), errorScan.ndjson);
const errorRecords = errorScan.ndjson.split('\n').filter(Boolean).map(line => JSON.parse(line));
assert.ok(!errorRecords.some(record => record.kind === 'match' || record.cell || (record.matches?.length ?? 0) > 0), 'unexpected formula error');
const summary = await wb.inspect({ kind: 'table', range: 'Opérations!A5:I13', include: 'values,formulas', tableMaxRows: 9, tableMaxCols: 9, maxChars: 5000 });
await fs.writeFile(path.join(outputDir, 'summary-inspection.ndjson'), summary.ndjson);

const renderRanges = [
  ['Opérations', 'A1:I15', '01-operations'], ['Opérations', `A${f.last - 5}:L${f.last}`, '01b-suites'],
  ['Contrats', 'A1:J14', '02-contracts'], ['Contrats', 'K9:N16', '02b-contract-controls'],
  ['Étapes à bord', 'A1:I11', '03-interior-steps'],
  ['Équipage', 'A1:F13', '04-crew'], ['Équipage', 'G7:L13', '04b-crew-art'],
  ['Espace', 'A1:H10', '05-space'], ['Espace', 'A13:H24', '05b-space-orders'],
  ['Ressources', 'A1:H14', '06-assets'], ['Ressources', `A${a.last - 6}:K${a.last}`, '06b-asset-needs'],
  ['Recette', 'A1:F15', '07-recipes'], ['Recette', 'A30:F34', '07b-recipe-evidence'],
  ['Lore', 'A1:G12', '08-lore'], ['Lore', `A${refsTitle}:I${refsHeader + 4}`, '08b-references'],
];
for (const [sheetName, range, stem] of renderRanges) {
  const blob = await wb.render({ sheetName, range, scale: 1.2, format: 'png' });
  const filename = `${stem}.png`;
  await fs.writeFile(path.join(outputDir, filename), new Uint8Array(await blob.arrayBuffer()));
  previews.push({ sheetName, range, filename });
  console.log(`Rendered ${sheetName} ${range}`);
}
const target = path.join(outputDir, 'clan-ship-operations-20261105.xlsx');
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(target);
const bytes = await fs.readFile(target);
const result = {
  generatedAt: new Date().toISOString(), asOf: sourceDate.toISOString(), timezone: 'Europe/Paris',
  catalogueSourceDigest: catalogue.sourceDigest, checkoutCommit: catalogue.checkoutCommit, sourceHasUncommittedChanges: catalogue.sourceHasUncommittedChanges,
  worksheets: names, features: data.features.length, observedCode: data.features.filter(item => item.implementation === 'Code présent').length,
  futureFeatures: data.features.filter(item => item.implementation === 'Prévu').length, contracts: contracts.length, interiorSteps: steps.length, crew: catalogue.crew.length,
  uniquePossibleClanMarks: expectedReward, sourceResources: resources.filter(item => item.production === 'Réemployé et raccordé').length,
  codeResources: resources.filter(item => item.production === 'Rendu en code').length, futureResourceRows: data.futureResources.length,
  recipeCriteria: data.qa.length, passedRecipeCriteria: data.qa.filter(item => item.result === 'Réussi').length,
  changedInputCheck: 'Technical verification leaves art approval pending; qualified only after both inputs, then inputs restored',
  formulaErrorScan: errorRecords, workbook: { filename: path.basename(target), bytes: bytes.length, sha256: sha256(bytes) },
  renders: previews, visualReview: 'Pending inspection of rendered files',
};
await fs.writeFile(path.join(outputDir, 'operations-workbook-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ target, sheets: names.length, features: data.features.length, contracts: contracts.length, steps: steps.length, crew: catalogue.crew.length, marks: expectedReward, sha256: result.workbook.sha256 }));
