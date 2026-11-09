#!/usr/bin/env node
/**
 * Author the single current tracker through the supported artifact-tool API.
 * Run a copy from a writable /tmp directory with bundled node_modules linked.
 * Source XLSX files are never rewritten. All source text stays in the workbook.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const arg = process.argv.indexOf('--repo-root');
if (arg < 0 || !process.argv[arg + 1]) throw new Error('--repo-root is required');
const root = path.resolve(process.argv[arg + 1]);
const outputDir = path.join(path.dirname(root), 'outputs', 'yautja-excel-bible-20261108');
const deliverableDir = path.join(root, 'production/excel-bible-20261108/suivi');
await fs.mkdir(outputDir, { recursive: true });
const read = async name => JSON.parse(await fs.readFile(path.join(deliverableDir, name), 'utf8'));
const [inventory, excel, bible, campaign, , qualification] = await Promise.all([
  read('excel-inventory.json'), read('excel-open-register.json'), read('bible-requirements.json'),
  read('bible-campagne-revisee.json'),
  read('register-summary.json'), read('qualification-courante.json'),
]);

for (const source of inventory.inventory) {
  const actual = crypto.createHash('sha256').update(await fs.readFile(path.join(root, source.path))).digest('hex');
  if (actual !== source.sha256) throw new Error(`Source changed: ${source.path}`);
}
for (const source of campaign.inventory) {
  if (crypto.createHash('sha256').update(await fs.readFile(path.join(root, source.path))).digest('hex') !== source.sha256) {
    throw new Error(`Campaign document/manifest changed; regenerate source blocks: ${source.path}`);
  }
}
const unique = (rows, key, name) => {
  if (new Set(rows.map(key)).size !== rows.length) throw new Error(`${name}: duplicate identifier`);
};
unique(excel.items, x => x.key, 'Excel subjects');
unique(bible.items, x => x.id, 'Bible cards');
unique(bible.annexCriteria, x => x.id, 'Annex criteria');
unique(campaign.items, x => x.id, 'Current campaign source blocks');
unique(qualification.deliveries, x => x.id, 'Delivery');
const states = ['Oui', 'Partiel', 'Non', 'À vérifier', 'Sans objet'];
for (const item of qualification.deliveries) {
  for (const phase of ['generated', 'integrated', 'behaviorTested', 'browserTested', 'humanArtReview']) {
    if (!states.includes(item[phase])) throw new Error(`Invalid ${phase} for ${item.id}: ${item[phase]}`);
  }
  for (const evidence of item.evidence ?? []) {
    const filename = evidence.split('#')[0];
    await fs.access(path.join(root, filename));
  }
}
const workbook = Workbook.create();
const names = ['Avancement', 'Livraison', 'Ouverts Excel', 'Bible V6', 'Bible campagne', 'Recettes bible', 'Sources', 'Méthode'];
const sheets = Object.fromEntries(names.map(n => [n, workbook.worksheets.add(n)]));
const color = { navy: '#153243', teal: '#21645D', ink: '#223544', muted: '#536877', pale: '#EAF0F4', amber: '#FFF0CC', line: '#D6E0E7', white: '#FFFFFF', source: '#34628A' };
const col = n => { let s = ''; for (let v = n; v > 0; v = Math.floor((v - 1) / 26)) s = String.fromCharCode(65 + (v - 1) % 26) + s; return s; };
const loc = s => `${s.path} | ${s.sheet}!${s.row}`;
const base = (sheet, title, subtitle, widths, endRow) => {
  const endCol = col(widths.length);
  sheet.showGridLines = false;
  sheet.tabColor = color.navy;
  sheet.getRange(`A1:${endCol}${endRow}`).format = { font: { name: 'Arial', size: 10, color: color.ink }, fill: color.white, verticalAlignment: 'center', wrapText: true };
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: color.navy };
  sheet.getRange('A2').format.wrapText = false;
  sheet.getRange('A2').format.rowHeightPx = 30;
  sheet.getRange('A3').values = [[subtitle]];
  sheet.getRange('A3').format.font = { name: 'Arial', size: 10, color: color.muted };
  sheet.getRange('A3').format.wrapText = false;
  sheet.getRange('A3').format.rowHeightPx = 28;
  widths.forEach((w, i) => { sheet.getRange(`${col(i + 1)}1:${col(i + 1)}${endRow}`).format.columnWidthPx = w; });
  sheet.freezePanes.freezeRows(5);
  sheet.freezePanes.freezeColumns(2);
};
const wrapLines = (value, width) => String(value ?? '').split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / Math.max(8, Math.floor((width - 20) / 6)))), 0);
const table = (name, title, subtitle, headers, rows, widths, tableName) => {
  const sheet = sheets[name];
  const last = Math.max(6, 5 + rows.length);
  base(sheet, title, subtitle, widths, last);
  sheet.getRange(`A5:${col(headers.length)}5`).values = [headers];
  if (rows.length) sheet.getRange(`A6:${col(headers.length)}${last}`).values = rows;
  const t = sheet.tables.add(`A5:${col(headers.length)}${last}`, true, tableName);
  t.showFilterButton = true;
  sheet.getRange(`A5:${col(headers.length)}5`).format = { fill: color.navy, font: { name: 'Arial', size: 10, bold: true, color: color.white }, wrapText: true, verticalAlignment: 'center' };
  sheet.getRange(`A5:${col(headers.length)}5`).format.rowHeightPx = 40;
  rows.forEach((row, i) => {
    const lines = Math.max(...row.map((v, j) => wrapLines(v, widths[j])));
    sheet.getRange(`A${i + 6}:${col(headers.length)}${i + 6}`).format.rowHeightPx = Math.min(510, Math.max(54, lines * 16 + 16));
  });
  return { sheet, last, count: rows.length };
};

const deliveryRows = qualification.deliveries.map(x => [
  x.id, x.domain, x.title, x.criterion, (x.requirementIds ?? []).join('\n'), x.scope,
  x.generated, x.integrated, x.behaviorTested, x.browserTested, x.humanArtReview,
  '', (x.evidence ?? []).join('\n'), x.remaining,
]);
const delivery = table('Livraison', 'Livraison qualifiée — 8 novembre 2026',
  'Chaque phase est indépendante. « Périmètre attesté » vaut uniquement pour le critère et les preuves indiqués.',
  ['ID livraison', 'Domaine', 'Élément livré', 'Critère du lot', 'IDs rapprochés', 'Portée des preuves', 'Produit', 'Intégré', 'Tests de comportement', 'Parcours navigateur', 'Revue artistique humaine', 'Qualification calculée', 'Preuves dans le dépôt', 'Limites / reste à réaliser'],
  deliveryRows, [130, 175, 310, 630, 220, 310, 115, 115, 145, 145, 160, 185, 630, 650], 'LivraisonCourante');
if (delivery.count) {
  delivery.sheet.getRange(`G6:K${delivery.last}`).dataValidation = { rule: { type: 'list', values: states } };
  delivery.sheet.getRange(`G6:K${delivery.last}`).format.fill = color.amber;
  delivery.sheet.getRange(`L6:L${delivery.last}`).formulas = deliveryRows.map((_, i) => {
    const r = i + 6;
    return [`=IF(COUNTIF(G${r}:K${r},"Non")>0,"Ouvert",IF(COUNTIF(G${r}:K${r},"Partiel")>0,"Partiel",IF(COUNTIF(G${r}:K${r},"À vérifier")>0,"À vérifier","Périmètre attesté")))`];
  });
  delivery.sheet.getRange(`L6:L${delivery.last}`).conditionalFormats.add('containsText', { text: 'Périmètre attesté', format: { fill: '#E1EFEA', font: { color: '#245849' } } });
  delivery.sheet.getRange(`L6:L${delivery.last}`).conditionalFormats.add('containsText', { text: 'Ouvert', format: { fill: color.amber, font: { color: '#805614' } } });
}

const sourceRows = excel.items.map(raw => {
  const x = { ...raw, ...(qualification.sourceOverrides[raw.key] ?? qualification.sourceOverrides[raw.id] ?? {}) };
  return [x.id, x.domain, x.scope, x.title, x.reconciliation, x.criterion, x.remaining, x.sourceStatus,
    (x.currentEvidence ?? []).join('\n'), x.sources.map(loc).join('\n'), x.sources.length,
    x.generated, x.integrated, x.tested, x.humanArtReview, x.kind, x.priority];
});
const sourceTable = table('Ouverts Excel', 'Déclarations Excel regroupées par sujet',
  'Filtrer le domaine et la portée. Un statut de la source reste daté ; sa présence ici ne prouve pas un manque dans le jeu actuel.',
  ['ID source', 'Domaine', 'Portée de la déclaration', 'Sujet', 'Rapprochement actuel', 'Critères sources conservés', 'Reste déclaré dans la source', 'Statut(s) source', 'Preuves actuelles repérées', 'Cellules d’origine', 'Observations regroupées', 'Produit', 'Intégré', 'Testé', 'Revue artistique humaine', 'Nature', 'Priorité source'],
  sourceRows, [225, 195, 235, 330, 330, 720, 650, 420, 650, 650, 130, 140, 140, 140, 175, 120, 110], 'OuvertsSources');
sourceTable.sheet.getRange(`K6:K${sourceTable.last}`).setNumberFormat('0');
sourceTable.sheet.getRange(`L6:O${sourceTable.last}`).format.fill = '#FFF8E8';

const bibleRows = bible.items.map(x => [x.id, x.domain, x.title, x.currentStatus, x.criterion,
  x.runtimeCodeReferences.join('\n'), x.runtimeDataReferences.join('\n'), `${x.source.sheet}!${x.source.range}`, x.source.path]);
const bibleTable = table('Bible V6', 'Bible V6 — cartes de conception et scènes',
  'Les occurrences d’ID dans le code ou les données servent à retrouver le contexte ; elles ne valident pas un parcours jouable.',
  ['ID bible', 'Domaine', 'Carte / scène', 'Qualification du repérage', 'Contenu de conception conservé', 'Références de code', 'Références de données', 'Feuille et cellules', 'Classeur source'],
  bibleRows, [155, 195, 320, 330, 850, 630, 630, 340, 650], 'CartesBibleV6');

const campaignRows = campaign.items.map(raw => {
  const x = { ...raw, ...(qualification.campaignOverrides?.[raw.nativeId] ?? qualification.criteriaOverrides[raw.nativeId] ?? {}) };
  return [x.id, x.nativeId, x.domain, x.section, x.kind, x.content, x.sourceDeclaration, x.currentStatus,
    (x.currentEvidence ?? x.evidence ?? []).concat(x.runtimeCodeReferences ?? []).join('\n'), x.remaining ?? 'Le texte courant conserve ses critères complets ; aucune clôture automatique par présence de code.',
    `${x.source}:${x.sourceLine}–${x.sourceEndLine}`];
});
const campaignTable = table('Bible campagne', 'Bible de campagne — texte et annexes',
  'Règles L, fiches R2, catalogues et rapports datés. Les blocs sont des unités de lecture et recoupent les cartes V6.',
  ['ID de repérage', 'ID natif', 'Domaine', 'Rubrique source', 'Type de bloc', 'Texte / critères conservés', 'Déclaration source', 'Rapprochement actuel', 'Preuves / références de code', 'Limites / reste à réaliser', 'Document et lignes'],
  campaignRows, [185, 130, 195, 500, 160, 1100, 330, 380, 650, 650, 650], 'CampagneRevisee');

const criteriaRows = bible.annexCriteria.map(raw => {
  const x = { ...raw, ...(qualification.criteriaOverrides[raw.id] ?? {}) };
  return [x.id, x.domain, x.kind, x.title, x.currentStatus, x.criterion,
    x.generated ?? 'À vérifier', x.integrated ?? 'À vérifier', x.behaviorTested ?? 'À vérifier', x.browserTested ?? 'À vérifier', x.humanArtReview ?? 'Selon critère',
    (x.evidence ?? []).join('\n'), x.remaining ?? 'Qualification spécifique au critère non encore attestée.', `${x.source}:${x.sourceLine}`];
});
const recipes = table('Recettes bible', 'Recettes et règles des annexes de campagne',
  'Compagnons, Warp Universe, Berceau enfoui et mobilité. Les critères sont conservés ; les preuves nouvelles sont datées séparément.',
  ['ID critère', 'Domaine', 'Nature', 'Scénario', 'Qualification actuelle', 'Critère complet', 'Produit', 'Intégré', 'Tests de comportement', 'Parcours navigateur', 'Revue artistique humaine', 'Preuves actuelles', 'Limites / reste à réaliser', 'Document et ligne source'],
  criteriaRows, [125, 185, 110, 330, 340, 800, 135, 135, 150, 150, 175, 680, 680, 650], 'RecettesCampagne');
recipes.sheet.getRange(`G6:K${recipes.last}`).format.fill = '#FFF8E8';

const sourceInventoryRows = inventory.inventory.map(x => [x.path, x.scope, x.scopeReason, x.sheetCount, x.sheets.reduce((n, s) => n + s.rowCount, 0), x.sheets.reduce((n, s) => n + s.cellCount, 0), x.bytes, x.sha256, x.sheets.map(s => s.name).join(' ; ')]);
const inventoryTable = table('Sources', '108 classeurs d’origine — inventaire et intégrité',
  'Tous les originaux sont préservés. Les empreintes de chaque feuille et leur contenu dédupliqué sont détaillés dans excel-inventory.json.',
  ['Chemin du classeur', 'Portée', 'Raison du classement', 'Feuilles', 'Lignes non vides', 'Cellules non vides', 'Taille (octets)', 'SHA-256 du classeur', 'Noms des feuilles'],
  sourceInventoryRows, [680, 220, 540, 100, 130, 140, 130, 520, 1000], 'InventaireSources');
inventoryTable.sheet.getRange(`D6:G${inventoryTable.last}`).setNumberFormat('#,##0');
inventoryTable.sheet.freezePanes.unfreeze();
inventoryTable.sheet.freezePanes.freezeRows(5);
inventoryTable.sheet.freezePanes.freezeColumns(1);

const methodRows = [
  ['Date et base', 'État du 8 novembre 2026 ; base Git ' + qualification.baseCommit + '. Les preuves de livraison de cette passe sont consignées dans Livraison.', 'qualification-courante.json'],
  ['Historique préservé', 'Les 108 fichiers XLSX d’origine sont lus en ZIP/XML et contrôlés par SHA-256. Aucun classeur historique n’est réécrit. Les observations originales conservent fichier, feuille, ligne, statut et empreinte.', 'excel-inventory.json'],
  ['Déduplication', 'Les feuilles identiques sont reconnues par leur contenu. Le registre groupe ensuite un même identifiant dans un même domaine ; il conserve toutes les observations et tous les critères distincts. Un cas de recette reste un objet distinct du développement qu’il contrôle.', 'excel-open-register.json'],
  ['Suivis de famille', 'La portée sélectionne les dernières familles documentaires identifiées et les avenants spécialisés. Les copies gelées et versions remplacées restent inventoriées. Le cumulatif V114 est limité à ses onglets de suivi courant ; ses vieux instantanés ne sont pas réadditionnés.', 'scripts/audit-excel-bible-20261108.py'],
  ['Sélection des ouverts', 'Les sujets du registre viennent des lignes portant un statut explicitement ouvert dans les colonnes de suivi. Les mentions textuelles hors statut et les anciens instantanés restent retrouvables par le script d’audit et les classeurs ; elles ne deviennent pas automatiquement une tâche active.', 'scripts/build-excel-bible-register-20261108.py'],
  ['Bible V6', 'Les cartes et scènes ayant un identifiant sont conservées. Index, lecteurs et exemples calculés ne deviennent pas des fonctionnalités séparées. Les répliques, choix, réactions et voix sont du contenu associé aux scènes, et ne sont pas ajoutés au nombre de cartes.', 'bible-requirements.json'],
  ['Bible et annexes de campagne', `${campaign.markdownDocuments} documents Markdown conservés par paragraphes, points de conception et entrées de tableau. ${campaign.documentsAndManifests} documents et manifestes inventoriés avec empreinte. Les règles L-01 à L-10 priment sur les anciens ordres de rang. Ces unités de lecture recoupent les cartes V6 et ne deviennent pas autant de fonctionnalités manquantes.`, 'bible-campagne-revisee.json'],
  ['Références statiques', 'Le repérage d’ID dans les fichiers TypeScript et JSON permet de naviguer vers une implémentation possible. Il ne démontre ni la disponibilité dans la campagne, ni l’exécution complète, ni la qualité artistique.', 'bible-requirements.json'],
  ['Critères des annexes', '118 règles, critères de production et recettes proviennent des documents de campagne Compagnons, Warp, Xeno Prime et Mobilité. Ils restent indépendants des cartes V6 et de leurs anciens statuts.', 'actions-prioritaires.json'],
  ['Produit', 'Le livrable décrit existe. Pour un élément visuel cela signifie candidat produit ; cela ne prouve pas son intégration ou sa validation artistique.', 'Livraison — colonne G'],
  ['Intégré', 'Le livrable est raccordé au périmètre annoncé et aux fichiers cités. Un modèle isolé et une scène accessible ne couvrent pas la même portée.', 'Livraison — colonne H'],
  ['Tests de comportement', 'Des scénarios exécutés contrôlent les transitions et invariants cités. Un build, une compilation ou une simple occurrence de code ne remplace pas ces tests.', 'Livraison — colonne I'],
  ['Parcours navigateur', 'Une interaction réellement exécutée dans le navigateur, avec son rapport, atteste uniquement le parcours décrit. Elle ne vaut pas session sur appareil physique ni revue artistique humaine.', 'Livraison — colonne J'],
  ['Revue artistique humaine', 'Seul un avis humain explicite sur les critères artistiques peut attester cette phase. Alpha, pivots, PNG, captures et tests automatiques restent des preuves techniques.', 'Livraison — colonne K'],
  ['Qualification calculée', 'Ouvert si une phase requise est Non ; Partiel si une phase est Partiel ; À vérifier si une phase est À vérifier ; Périmètre attesté si chaque phase est Oui ou Sans objet. Cette formule ne clôture pas les autres critères du jeu.', 'Livraison — colonne L'],
  ['Mise à jour', 'Modifier les preuves et qualifications dans qualification-courante.json, puis régénérer le classeur avec le script. Les cellules de phase sont aussi modifiables dans Excel via listes de choix ; une modification locale doit être reportée au JSON pour la prochaine génération.', 'scripts/build-excel-bible-workbook-20261108.mjs'],
  ...(qualification.sharedVerification ? [['Vérification commune', qualification.sharedVerification.summary, qualification.sharedVerification.reportPath]] : []),
  ...qualification.limitations.map((x, i) => [`Limite ${i + 1}`, x, 'Qualification actuelle']),
  ...bible.dialogueContent.map(x => [`Contenu associé — ${x.sheet}`, `${x.rows} lignes de contenu liées aux scènes ; elles ne sont pas additionnées aux cartes de conception. ${x.meaning}`, `${x.source} | ${x.sheet}`]),
];
table('Méthode', 'Méthode, statut des preuves et périmètre',
  'Lire cette feuille pour interpréter les volumes et mettre à jour le registre sans transformer une observation en validation.',
  ['Sujet', 'Règle appliquée', 'Référence'], methodRows, [285, 880, 650], 'MethodeSuivi');
sheets['Méthode'].freezePanes.unfreeze();
sheets['Méthode'].freezePanes.freezeRows(5);
sheets['Méthode'].freezePanes.freezeColumns(1);

const dashboard = sheets.Avancement;
base(dashboard, 'Yautja — suivi Excel et bible', 'État du 8 novembre 2026 • Sources préservées • Preuves de livraison séparées des déclarations historiques', [350, 130, 175, 175, 175, 175], 42);
dashboard.freezePanes.unfreeze();
dashboard.freezePanes.freezeRows(5);
dashboard.getRange('A5:F5').values = [['Périmètre des sources', 'Volume', 'Interprétation', '', '', '']];
dashboard.getRange('A5:F5').format = { fill: color.navy, font: { name: 'Arial', size: 10, bold: true, color: color.white } };
const facts = [
  ['Classeurs d’origine', '', 'Fichiers lus et empreintes vérifiées'],
  ['Feuilles, copies comprises', '', 'Toutes les feuilles des 108 classeurs'],
  ['Contenus de feuilles uniques', inventory.uniqueSheetContents, 'Contenus identiques regroupés'],
  ['Sujets Excel regroupés', '', 'Déclarations sources ; pas un total de fonctions manquantes'],
  ['Cartes et scènes de la bible V6', '', 'Conception ; repérage de code et de données séparé'],
  ['Critères des annexes de campagne', '', 'Compagnons, Warp, Berceau et mobilité'],
  ['Blocs de bible et annexes de campagne', '', `${campaign.markdownDocuments} documents ; unités de lecture qui recoupent les autres sources`],
];
dashboard.getRange('A6:C12').values = facts;
dashboard.getRange('B6').formulas = [[`=COUNTA('Sources'!A6:A${inventoryTable.last})`]];
dashboard.getRange('B7').formulas = [[`=SUM('Sources'!D6:D${inventoryTable.last})`]];
dashboard.getRange('B9').formulas = [[`=COUNTA('Ouverts Excel'!A6:A${sourceTable.last})`]];
dashboard.getRange('B10').formulas = [[`=COUNTA('Bible V6'!A6:A${bibleTable.last})`]];
dashboard.getRange('B11').formulas = [[`=COUNTA('Recettes bible'!A6:A${recipes.last})`]];
dashboard.getRange('B12').formulas = [[`=COUNTA('Bible campagne'!A6:A${campaignTable.last})`]];
dashboard.getRange('B6:B12').format.font = { name: 'Arial', size: 16, bold: true, color: color.teal };
dashboard.getRange('B6:B12').setNumberFormat('#,##0');
dashboard.getRange('A6:F12').format.rowHeightPx = 38;
dashboard.getRange('C6:C12').format.wrapText = false;
dashboard.getRange('A13:F13').values = [['Livraisons de cette passe', 'Lots', 'Produit', 'Intégré', 'Comportement testé', 'Parcours navigateur']];
dashboard.getRange('A13:F13').format = { fill: color.navy, font: { name: 'Arial', size: 10, bold: true, color: color.white }, rowHeightPx: 42 };
const deliveryDomains = [...new Set(qualification.deliveries.map(x => x.domain))];
deliveryDomains.forEach((domain, i) => {
  const r = 14 + i;
  dashboard.getRange(`A${r}`).values = [[domain]];
  dashboard.getRange(`B${r}:F${r}`).formulas = [[
    `=COUNTIF('Livraison'!$B$6:$B$${delivery.last},A${r})`,
    ...['G', 'H', 'I', 'J'].map(c => `=COUNTIFS('Livraison'!$B$6:$B$${delivery.last},A${r},'Livraison'!$${c}$6:$${c}$${delivery.last},"Oui")`),
  ]];
  dashboard.getRange(`A${r}:F${r}`).format.rowHeightPx = 40;
});
const noteRow = 15 + deliveryDomains.length;
dashboard.getRange(`A${noteRow}`).values = [['Comptages de « Oui » par phase ; les phases Sans objet restent visibles dans Livraison.']];
dashboard.getRange(`A${noteRow}`).format.wrapText = false;
dashboard.getRange(`A${noteRow}`).format.font = { name: 'Arial', size: 10, italic: true, color: color.muted };
dashboard.getRange('A23:F23').values = [['Lire le classeur', '', '', '', '', '']];
dashboard.getRange('A23:F23').format = { fill: color.navy, font: { name: 'Arial', size: 10, bold: true, color: color.white } };
const guide = [
  ['Livraison', 'Ce qui a été produit et ce que chaque preuve couvre réellement.'],
  ['Ouverts Excel', 'Sujets regroupés, critères complets et cellules d’origine. Filtrer domaine et portée.'],
  ['Bible V6 / Bible campagne', 'Cartes V6 et texte courant : rites, missions révisées, équipement, musique et besoins transverses.'],
  ['Recettes bible', 'Critères des quatre annexes et qualification actuelle de chaque recette.'],
  ['Sources / Méthode', '108 classeurs conservés, empreintes, sélection et règles de qualification.'],
];
dashboard.getRange('A24:B28').values = guide;
dashboard.getRange('B24:B28').format.wrapText = false;
dashboard.getRange('A24:F28').format.rowHeightPx = 34;
dashboard.getRange('A30').values = [['Ces volumes se chevauchent et ne constituent pas un taux de réalisation du jeu.']];
dashboard.getRange('A30').format.wrapText = false;
dashboard.getRange('A30').format.font = { name: 'Arial', size: 11, bold: true, color: '#805614' };
dashboard.getRange('A32').values = [[qualification.snapshotState]];
dashboard.getRange('A32').format.wrapText = false;
dashboard.getRange('A32').format.font = { name: 'Arial', size: 10, color: color.muted };

workbook.recalculate();
const expectedCounts = [inventory.workbooks, inventory.sheetsIncludingCopies, inventory.uniqueSheetContents, excel.items.length, bible.items.length, bible.annexCriteria.length, campaign.items.length];
const actualCounts = dashboard.getRange('B6:B12').values.map(r => r[0]);
if (JSON.stringify(expectedCounts) !== JSON.stringify(actualCounts)) throw new Error(`Formula count mismatch: ${JSON.stringify({ expectedCounts, actualCounts })}`);

// Exercise the phase formula with independent input changes, then restore data.
const original = delivery.sheet.getRange('G6:K6').values;
const scenarios = [
  { values: ['Oui', 'Oui', 'Oui', 'Sans objet', 'Sans objet'], expected: 'Périmètre attesté' },
  { values: ['Oui', 'Oui', 'Partiel', 'Sans objet', 'Sans objet'], expected: 'Partiel' },
  { values: ['Oui', 'Oui', 'Oui', 'À vérifier', 'Sans objet'], expected: 'À vérifier' },
  { values: ['Oui', 'Oui', 'Oui', 'Oui', 'Non'], expected: 'Ouvert' },
];
const phaseTests = [];
for (const s of scenarios) {
  delivery.sheet.getRange('G6:K6').values = [s.values];
  workbook.recalculate();
  const actual = delivery.sheet.getRange('L6').values[0][0];
  if (actual !== s.expected) throw new Error(`Phase formula failed: ${actual} != ${s.expected}`);
  phaseTests.push({ inputs: s.values, expected: s.expected, actual });
}
delivery.sheet.getRange('G6:K6').values = original;
workbook.recalculate();
const inspect = await workbook.inspect({ kind: 'region', sheetId: 'Avancement', range: 'A5:F18', maxChars: 6000, tableMaxRows: 20, tableMaxCols: 6 });
await fs.writeFile(path.join(outputDir, 'inspection.txt'), typeof inspect === 'string' ? inspect : JSON.stringify(inspect, null, 2));
const formulaErrors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#SPILL!', options: { useRegex: true, maxResults: 40 }, maxChars: 7000 });
await fs.writeFile(path.join(outputDir, 'formula-scan.txt'), typeof formulaErrors === 'string' ? formulaErrors : JSON.stringify(formulaErrors, null, 2));

const renderSpecs = [
  ['Avancement', 'A1:F32', '01-avancement'],
  ['Livraison', `A1:C${Math.min(delivery.last, 9)}`, '02-livraison'],
  ['Livraison', `G5:L${Math.min(delivery.last, 12)}`, '02b-phases-livraison'],
  ['Ouverts Excel', 'A1:D9', '03-ouverts-excel'],
  ['Bible V6', 'A1:D8', '04-bible-v6'],
  ['Bible V6', 'D5:E7', '04b-criteres-bible'],
  ['Bible campagne', 'A1:D9', '04c-campagne-revisee'],
  ['Recettes bible', 'A1:E9', '05-recettes-bible'],
  ['Sources', 'A1:D7', '06-sources'],
  ['Méthode', 'A1:B9', '07-methode'],
];
await fs.mkdir(path.join(deliverableDir, 'apercus'), { recursive: true });
for (const [sheetName, range, filename] of renderSpecs) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, `${filename}.png`), new Uint8Array(await preview.arrayBuffer()));
  await fs.copyFile(path.join(outputDir, `${filename}.png`), path.join(deliverableDir, 'apercus', `${filename}.png`));
}
const filename = 'Yautja_Suivi_Excel_Bible_20261108.xlsx';
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(path.join(outputDir, filename));
await fs.copyFile(path.join(outputDir, filename), path.join(deliverableDir, filename));
const report = {
  asOfDate: qualification.asOfDate,
  authoringRuntime: '@oai/artifact-tool',
  sourceWorkbooksVerifiedUnchanged: inventory.inventory.length,
  campaignDocumentsAndManifestsVerifiedUnchanged: campaign.inventory.length,
  sheets: names,
  dataRows: { Livraison: delivery.count, 'Ouverts Excel': sourceTable.count, 'Bible V6': bibleTable.count, 'Bible campagne': campaignTable.count, 'Recettes bible': recipes.count, Sources: inventoryTable.count },
  summaryFormulaExpected: expectedCounts, summaryFormulaActual: actualCounts, phaseTests,
  formulaScanFile: path.join(outputDir, 'formula-scan.txt'),
  previewFiles: renderSpecs.map(([, , file]) => `production/excel-bible-20261108/suivi/apercus/${file}.png`),
  artifactPath: path.join(deliverableDir, filename),
  artifactSha256: crypto.createHash('sha256').update(await fs.readFile(path.join(deliverableDir, filename))).digest('hex'),
  limits: ['La vérification des formules et le rendu du classeur ne valident aucun gameplay.', 'Les preuves de la passe sont limitées aux critères et fichiers cités dans Livraison.'],
};
await fs.writeFile(path.join(deliverableDir, 'verification-classeur.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
