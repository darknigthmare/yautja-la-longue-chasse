#!/usr/bin/env node
/** Reconcile current data exports with explicit, scoped delivery declarations.
 * Python's ZIP/XML standard library appends sheets without rewriting V63 data.
 * A test file's presence never changes a validation status. */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY = 'docs/v99-workstreams-source.json';
export const OUTPUTS = ['v99-workstreams.json', 'YAUTJA_V99_SUIVI.xlsx'];
const WRITER = 'scripts/build-excel-followup-v99.py';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const readJson = async relative => JSON.parse(await fs.readFile(path.join(ROOT, relative), 'utf8'));
const statuses = new Set(['EN_COURS', 'A_VALIDER', 'OUVERT', 'MANQUANT', 'LIVRE_PARTIEL', 'VALIDE_CIBLE']);
async function runPython(payload, inventory = false) {
  // File input also works in sandbox runtimes that retain a spawned pipe's EOF.
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v99-'));
  const request = path.join(directory, 'request.json');
  try {
    await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(inventory ? ['--inventory'] : []), '--request', request], {
      stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024, timeout: 30000,
    });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

function verifyRegistry(registry) {
  if (registry.schemaVersion !== 1 || registry.release !== 'V99' || !/^\d{4}-\d{2}-\d{2}$/.test(registry.asOf)) throw new Error('Registre V99 invalide');
  const ids = new Set();
  for (const item of registry.workstreams) {
    if (ids.has(item.id) || !statuses.has(item.status)) throw new Error(`Identifiant ou statut invalide : ${item.id}`);
    ids.add(item.id);
    if (item.status === 'VALIDE_CIBLE' && (!item.proof?.length || !item.tests.startsWith('PASS'))) throw new Error(`Validation sans preuve explicite : ${item.id}`);
    if (!item.remaining || !item.source) throw new Error(`Périmètre incomplet : ${item.id}`);
  }
}

export async function collectFollowupV99(registry = undefined) {
  registry ??= await readJson(REGISTRY);
  verifyRegistry(registry);
  const compiled = await build({
    stdin: { contents: `
      export { WAR_PLANETS_V96, warPlanetCoastDistanceV96 } from './app/game/systems/clanWarPlanetsV96';
      export { warWorksDefinitionsV6 } from './app/game/systems/clanWarWorksV6';
      export { WAR_BIBLE_V6, WAR_BIBLE_ENTRIES_V6, WAR_BIBLE_SECTIONS_V6 } from './app/game/systems/clanWarBibleV6';
      export { CLAN_WAR_WORKBOOK_V85, CLAN_WAR_ENTRIES_V85, CLAN_WAR_SECTIONS_V85 } from './app/game/systems/clanWarV85Data';
      export { PIT_VERSUS_FIGHTER_IDS } from './app/game/systems/pitRosterExpansion';
      export { PIT_ARENA_PRODUCTION_MANIFEST } from './app/game/pitArenaProduction';
      export { readBibleVoiceProfilesV88 } from './app/game/systems/bibleVoiceProfilesV88';
    `, resolveDir: ROOT },
    absWorkingDir: ROOT, bundle: true, write: false, metafile: true,
    platform: 'node', format: 'esm', logLevel: 'silent',
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
  const dialoguePath = 'public/game/dialogues/v85/bible-dialogues.json';
  const shipsPath = 'public/game/dialogues/v85/bible-ships.json';
  const rosterPath = 'docs/v63-workbook-roster-audit.json';
  const stagesPath = 'docs/v63-stage-open-work.json';
  const [dialogues, ships, roster, stages] = await Promise.all([dialoguePath, shipsPath, rosterPath, stagesPath].map(readJson));
  const workbookInventory = JSON.parse(await runPython({ root: ROOT, paths: registry.historicalWorkbooks }, true));
  const baseline = workbookInventory.find(item => item.path === registry.baseline.path);
  if (!baseline || baseline.sha256 !== registry.baseline.sha256) throw new Error('Le classeur de base V63 a changé ; refus de remplacer son historique.');
  for (const source of registry.absentOriginals) {
    for (const extraction of source.extractions) {
      const data = await readJson(extraction);
      const identity = data.source?.sha256 ?? data.sha256;
      if (identity !== source.sha256) throw new Error(`SHA source inattendu : ${extraction}`);
    }
  }
  const planets = api.WAR_PLANETS_V96.map(planet => {
    const definitions = new Map(planet.definitions.map(item => [item.id, item]));
    const territories = new Map(planet.territories.map(item => [item.id, item]));
    const visited = new Set(), queue = [planet.definitions[0]?.id];
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      const item = definitions.get(id);
      if (!item) throw new Error(`Route sans territoire : ${planet.id}/${id}`);
      visited.add(id); queue.push(...item.neighbors.filter(next => !visited.has(next)));
    }
    const routes = new Set(), crossings = [];
    for (const item of planet.definitions) for (const neighbor of item.neighbors) {
      if (!definitions.get(neighbor)?.neighbors.includes(item.id)) throw new Error(`Route non réciproque : ${planet.id}/${item.id}`);
      const edge = [item.id, neighbor].sort().join(':');
      if (routes.has(edge)) continue;
      routes.add(edge);
      const a = territories.get(item.id), b = territories.get(neighbor);
      if (a.regionId !== b.regionId) crossings.push(api.warPlanetCoastDistanceV96(a, b));
    }
    return {
      id: planet.id, name: planet.name, style: planet.style, biome: planet.landBiome,
      surface: planet.surface.name, surfaceKind: planet.surface.kind,
      baseColor: planet.surface.base, accentColor: planet.surface.accent,
      continents: planet.landmasses.length, regions: planet.regions.length,
      territories: planet.territories.length, landPercent: Number((planet.landFraction * 100).toFixed(2)),
      routes: routes.size, connected: visited.size === definitions.size,
      maximumCrossingDegrees: Number(Math.max(0, ...crossings).toFixed(2)),
      provenance: planet.id === 'korthas' ? 'Noms et règles V3 ; géographie originale V96/V97' : 'Carte originale du projet ; pas une planète canonique certifiée',
    };
  });
  const definitions = api.warWorksDefinitionsV6();
  const implemented = new Map(definitions.map(item => [item.id, item]));
  const structures = api.WAR_BIBLE_ENTRIES_V6.filter(item => item.sheet === 'Structures de guerre').map(item => ({
    id: item.id, name: String(item.title), sheet: item.sheet, row: item.row,
    cells: item.fields.map(cell => cell.cell), sourceSha256: api.WAR_BIBLE_V6.sha256,
    status: implemented.has(item.id) ? 'INTEGRE_LIBRE' : 'OUVERT',
    kind: implemented.get(item.id)?.kind ?? '',
    costRav: implemented.get(item.id)?.costRav ?? '',
    delayTurns: implemented.get(item.id)?.delayTurns ?? '',
    operator: implemented.get(item.id)?.operatorUnitId ?? '',
    remaining: implemented.has(item.id)
      ? 'Définition acceptée par le runtime libre actuel ; raccord campagne et certification globale non déduits.'
      : registry.openStructures[item.id] ?? 'Source à examiner ; aucune implémentation déclarée.',
  }));
  const voiceProfiles = api.readBibleVoiceProfilesV88(dialogues.sheets.find(sheet => sheet.name === 'Voix V6'));
  const names = new Map();
  for (const profile of voiceProfiles) names.set(profile.name, (names.get(profile.name) ?? 0) + 1);
  const countIds = (sheetName, prefix) => dialogues.sheets.find(sheet => sheet.name === sheetName)?.rows.filter(row => row.cells.some(cell => cell.address === `A${row.number}` && typeof cell.value === 'string' && cell.value.startsWith(prefix))).length ?? 0;
  const facts = {
    planets: planets.length, classicPlanets: planets.filter(item => item.style === 'classic').length,
    exoticPlanets: planets.filter(item => item.style === 'exotic').length,
    sourceStructures: structures.length, runtimeStructures: definitions.length,
    openStructures: structures.filter(item => item.status === 'OUVERT').length,
    warV3Sheets: api.CLAN_WAR_SECTIONS_V85.length, warV3Entries: api.CLAN_WAR_ENTRIES_V85.length,
    warV6Sheets: api.WAR_BIBLE_SECTIONS_V6.length, warV6Entries: api.WAR_BIBLE_ENTRIES_V6.length,
    dialogueSheets: dialogues.sheets.length, shipSheets: ships.sheets.length,
    dialogueScenes: countIds('Scènes de dialogue V6', 'D6-'),
    dialogueLines: countIds('Répliques V6', 'D6-'),
    dialogueChoices: countIds('Choix et actions V6', 'D6-'),
    dialogueVariants: countIds('Variantes V6', 'D6-'),
    dialogueReactions: countIds('Réactions et gestes V6', 'D6-'),
    voiceProfiles: voiceProfiles.length, distinctVoiceNames: names.size,
    ambiguousVoiceNames: [...names.values()].filter(count => count > 1).length,
    currentPitFighterIds: api.PIT_VERSUS_FIGHTER_IDS.length,
    currentPitRuntimeArenas: api.PIT_ARENA_PRODUCTION_MANIFEST.stages.filter(item => item.runtimeEnabled).length,
    historicalPitDossiers: roster.counts.workbookDossiers,
    historicalPitOpenDossiers: roster.dossiers.filter(item => !item.playable).length,
    historicalStageDossiers: stages.dossiers.length,
    historicalStageEvents: stages.dossiers.reduce((sum, item) => sum + item.events.length, 0),
    historicalLiteralStageDossiersCertified: stages.counts.literalDossiersCertifiedComplete,
  };
  const requiredFiles = [...new Set([
    ...Object.keys(compiled.metafile.inputs).filter(item => item !== '<stdin>'),
    REGISTRY, 'scripts/build-excel-followup-v99.mjs', WRITER,
    dialoguePath, shipsPath, rosterPath, stagesPath, ...registry.historicalWorkbooks,
  ])].sort();
  const inputs = await Promise.all(requiredFiles.map(async relative => ({
    path: relative, sha256: sha256(await fs.readFile(path.join(ROOT, relative))),
  })));
  return {
    schemaVersion: 1, release: registry.release, asOf: registry.asOf,
    method: 'Exports runtime compilés avec esbuild verrouillé ; déclarations de validation explicites ; archive V63 conservée et augmentée avec ZIP/XML standard.',
    baseline: registry.baseline, workbookInventory, absentOriginals: registry.absentOriginals,
    facts, workstreams: registry.workstreams, planets, structures,
    pitOpen: roster.dossiers.filter(item => !item.playable).map(item => ({ ...item, provenance: 'Historique V63 ; aucune recertification runtime V99', sourceSha256: registry.absentOriginals[2].sha256 })),
    stageEvents: stages.dossiers.flatMap(item => item.events.map(event => ({
      dossier: item.stageKey, name: item.name, work: item.work, targetStageId: item.targetStageId,
      id: event.id, cell: event.descriptionCell, description: event.description,
      historicalStatus: event.status, currentStatus: 'NON_RECERTIFIE_V99',
    }))),
    validations: registry.validations, inputs, limits: registry.limits,
  };
}

const column = (key, label, width) => ({ key, label, width });
const join = value => Array.isArray(value) ? value.join('\n') : value;
export function buildSheetsV99(snapshot) {
  const end = snapshot.workstreams.length + 4;
  const pEnd = snapshot.planets.length + 4, sEnd = snapshot.structures.length + 4;
  const count = status => snapshot.workstreams.filter(item => item.status === status).length;
  const metric = (label, cached, formula, scope) => ({ label, value: formula ? { formula, cached } : cached, scope });
  const summary = [
    metric('Chantiers suivis', snapshot.workstreams.length, `COUNTA('ChantiersV99'!A5:A${end})`, 'Des livraisons partielles et des travaux ouverts, pas un pourcentage de jeu terminé.'),
    ...['EN_COURS', 'A_VALIDER', 'OUVERT', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'].map(status => metric(status, count(status), `COUNTIF('ChantiersV99'!F5:F${end},"${status}")`, 'Statut explicite du registre ; modifier le statut du chantier actualise le compteur Excel.')),
    metric('Planètes dans le runtime', snapshot.facts.planets, `COUNTA('PlanetesV99'!A5:A${pEnd})`, 'Cartes du projet ; Korthas reprend ses noms et règles V3.'),
    metric('Biomes classiques', snapshot.facts.classicPlanets, `COUNTIF('PlanetesV99'!C5:C${pEnd},"classic")`, 'Direction artistique classique ; pas une certification canonique 1:1.'),
    metric('Biomes exotiques', snapshot.facts.exoticPlanets, `COUNTIF('PlanetesV99'!C5:C${pEnd},"exotic")`, 'Surfaces originales du projet, non jouables entre les terres.'),
    metric('Ouvrages source V6', snapshot.facts.sourceStructures, `COUNTA('OuvragesV6'!A5:A${sEnd})`, 'Une ligne par W3-S01 à W3-S18.'),
    metric('Ouvrages acceptés en contexte libre', snapshot.facts.runtimeStructures, `COUNTIF('OuvragesV6'!F5:F${sEnd},"INTEGRE_LIBRE")`, 'Exports actuels ; campagne et tests restent des dimensions séparées.'),
    metric('Ouvrages restant ouverts', snapshot.facts.openStructures, `COUNTIF('OuvragesV6'!F5:F${sEnd},"OUVERT")`, 'Transport, montures, énergie, duel, sons situés et route orbitale.'),
    metric('Fiches V3 embarquées', snapshot.facts.warV3Entries, '', `${snapshot.facts.warV3Sheets} feuilles contenant des fiches dans l'export runtime ; original annoncé à 39 feuilles par l'import V85, pas autant de fonctionnalités jouées.`),
    metric('Fiches guerre V6 embarquées', snapshot.facts.warV6Entries, '', `${snapshot.facts.warV6Sheets} feuilles extraites ; la source privée comprend davantage de domaines.`),
    metric('Scènes documentaires', snapshot.facts.dialogueScenes, '', `${snapshot.facts.dialogueLines} répliques, ${snapshot.facts.dialogueChoices} choix, ${snapshot.facts.dialogueVariants} variantes, ${snapshot.facts.dialogueReactions} réactions ; pas autant de missions incarnées.`),
    metric('Directions de voix textuelles', snapshot.facts.voiceProfiles, '', `${snapshot.facts.distinctVoiceNames} noms distincts / ${snapshot.facts.ambiguousVoiceNames} noms ambigus ; aucun nouvel enregistrement audio dans ce lot.`),
    metric('Feuilles du corpus navire', snapshot.facts.shipSheets, '', 'Corpus consultable ; inspection, acquisition et voyage ne sont pas le même état.'),
    metric('Identifiants combattants runtime actuels', snapshot.facts.currentPitFighterIds, '', 'Population distincte des 205 dossiers historiques du classeur V54.'),
    metric('Arènes runtime actuelles', snapshot.facts.currentPitRuntimeArenas, '', 'Un décor disponible ne certifie pas les événements littéraux du dossier source.'),
    metric('Dossiers personnages V54 ouverts en V63', snapshot.facts.historicalPitOpenDossiers, '', 'État historique repris explicitement ; pas recertifié V99.'),
    metric('Descriptions de vie des stages conservées', snapshot.facts.historicalStageEvents, '', `${snapshot.facts.historicalStageDossiers} dossiers historiques ; leurs cellules et statuts V63 restent visibles.`),
    metric('Dossiers stages littéralement certifiés par V99', 0, '', 'Aucune certification intégrale nouvelle de ces dossiers.'),
    metric('Originaux privés présents', 0, '', 'Les extractions et leurs empreintes sont conservées ; aucun original privé n’a été recréé.'),
    metric('Application Excel native vérifiée', 'NON', '', 'Vérification ZIP/XML et lecture indépendante ; Excel/LibreOffice natif non lancé.'),
  ];
  const sources = [
    ...snapshot.workbookInventory.map(item => ({ name: path.basename(item.path), state: 'PRESENT_CONSERVE', path: item.path, sha256: item.sha256, sheets: item.sheets.length, scope: item.sheets.join(' ; '), remaining: 'Original local conservé sans réécriture ; les cinq feuilles du V63 sont aussi présentes dans le nouveau suivi.' })),
    ...snapshot.absentOriginals.map(item => ({ name: item.name, state: 'ORIGINAL_MANQUANT', path: item.extractions.join('\n'), sha256: item.sha256, sheets: '', scope: item.scope, remaining: 'Les extractions ne remplacent pas le fichier privé original ; aucun chemin privé utilisateur n’est reproduit.' })),
  ];
  const sheets = [
    { name: 'SyntheseV99', title: 'YAUTJA · suivi consolidé V99', subtitle: `Arrêté au ${snapshot.asOf} · données runtime actuelles, preuves et travaux ouverts distingués`, columns: [column('label','Indicateur',46),column('value','Valeur',24),column('scope','Portée / limite',110)], rows: summary },
    { name: 'ChantiersV99', title: 'Sources → implémentation → preuve → reste', subtitle: 'Une livraison partielle, un test ciblé et une validation navigateur ont leur propre portée.', columns: [column('id','ID',30),column('domain','Domaine',22),column('title','Chantier',42),column('source','Source / cellules',62),column('implementation','Implémentation',65),column('status','Statut chantier',22),column('runtime','Comportement / portée',78),column('tests','Tests',25),column('browser','Navigateur',25),column('proof','Preuves / commandes',65),column('remaining','Reste à faire',100),column('owner','Responsable',20)], rows: snapshot.workstreams.map(item => Object.fromEntries(Object.entries(item).map(([key,value])=>[key,join(value)]))) },
    { name: 'SourcesV99', title: 'Inventaire des classeurs et des originaux manquants', subtitle: 'Empreinte du fichier local pour les présents ; empreinte de la source identifiée pour les originaux absents.', columns: [column('name','Classeur',60),column('state','Disponibilité',25),column('path','Fichier local / extractions disponibles',75),column('sha256','SHA-256',70),column('sheets','Feuilles présentes',20),column('scope','Contenu / portée',100),column('remaining','Limite',90)], rows: sources },
    { name: 'PlanetesV99', title: '30 planètes · données des cartes réellement exportées', subtitle: 'Continents physiques ≠ régions administratives. Les couleurs de surface ne sont pas celles du contrôle des clans.', columns: [column('id','ID',20),column('name','Planète',23),column('style','Famille',16),column('biome','Biome terrestre',20),column('surface','Surface non jouable',28),column('surfaceKind','Texture',18),column('baseColor','Couleur de fond',19),column('accentColor','Couleur de détail',19),column('continents','Continents',16),column('regions','Régions',14),column('territories','Territoires',16),column('landPercent','Terres (%)',16),column('routes','Routes',14),column('connected','Graphe connecté',20),column('maximumCrossingDegrees','Écart côtes interrégion max (°)',28),column('provenance','Provenance / fidélité',90)], rows: snapshot.planets },
    { name: 'OuvragesV6', title: '18 ouvrages V6 · état de consommation ligne par ligne', subtitle: 'Le nombre actuel 12/18 ne réécrit pas le suivi historique V88 à 8/18. Le contexte libre reste distinct de la campagne.', columns: [column('id','ID source',20),column('name','Ouvrage',30),column('sheet','Feuille',28),column('row','Ligne',12),column('cells','Cellules source',65),column('status','État runtime',23),column('kind','Adaptateur',20),column('costRav','Coût RAV',16),column('delayTurns','Délai tours',16),column('operator','Opérateur source',22),column('remaining','Périmètre / reste',105),column('sourceSha256','SHA-256 source V6',70)], rows: snapshot.structures.map(item=>({...item,cells:item.cells.join(', ')})) },
    { name: 'PitOuvertV99', title: 'The Pit · six dossiers personnages laissés ouverts', subtitle: 'Réconciliation V63 reprise avec ses cellules et limites ; les kits et identités ne sont pas recertifiés par le suivi V99.', columns: [column('workbookId','ID dossier',28),column('name','Identité / incarnation',45),column('sourceCells','Cellules personnages',38),column('missingSheetCells','Cellules manquants',38),column('status','Statut historique V63',35),column('note','Reste à faire',110),column('provenance','Portée',60),column('sourceSha256','SHA-256 source V54',70)], rows: snapshot.pitOpen },
    { name: 'StagesOuvertsV99', title: 'The Pit · 522 descriptions conservées et traçables', subtitle: 'Statut historique V63 conservé ; pas de recertification littérale V99. Une absence de registre moderne ne prouve pas une absence d’animation legacy.', columns: [column('dossier','Dossier',15),column('name','Stage',40),column('work','Œuvre',35),column('targetStageId','Cible runtime',70),column('id','Événement source',26),column('cell','Cellule exacte',40),column('description','Description originale',115),column('historicalStatus','État historique V63',65),column('currentStatus','Certification V99',28)], rows: snapshot.stageEvents },
    { name: 'ValidationsV99', title: 'Preuves et périmètres de validation', subtitle: 'Le statut HISTORIQUE garde sa version ; un chemin de test ne signifie pas que ce test a été exécuté.', columns: [column('id','ID preuve',35),column('scope','Périmètre vérifié',100),column('status','Résultat',24),column('command','Commande / mode opératoire',80),column('evidence','Fichiers de preuve',80),column('limit','Limites',100)], rows: snapshot.validations.map(item=>({...item,evidence:join(item.evidence)})) },
    { name: 'EntreesV99', title: 'Empreintes des entrées de génération', subtitle: 'Ces fichiers et leurs empreintes rendent le suivi vérifiable en CI ; --check refuse un suivi devenu périmé.', columns: [column('path','Entrée reproductible',100),column('sha256','SHA-256 actuel',75)], rows: snapshot.inputs },
    { name: 'JournalV99', title: 'Méthode, statut des données et limites', subtitle: 'Les cinq onglets V63 originaux restent présents avec leurs valeurs, formules et objets d’origine.', columns: [column('subject','Sujet',40),column('detail','Décision / limite',140)], rows: [
      {subject:'Méthode',detail:snapshot.method},
      {subject:'Registre humain',detail:REGISTRY},
      {subject:'Régénération',detail:'node scripts/build-excel-followup-v99.mjs'},
      {subject:'Vérification CI',detail:'node scripts/build-excel-followup-v99.mjs --check'},
      {subject:'Préservation',detail:`Base ${snapshot.baseline.path} · SHA-256 ${snapshot.baseline.sha256}`},
      ...snapshot.limits.map((detail,index)=>({subject:`Limite ${index+1}`,detail})),
      {subject:'Lecture des états',detail:'OUVERT : prérequis ou livraison manquants ; EN_COURS : modification en cours ; A_VALIDER : preuve à obtenir ; LIVRE_PARTIEL : périmètre limité livré ; VALIDE_CIBLE : cas explicitement prouvés, sans clôture globale.'},
      {subject:'Formules',detail:'Les formules de SyntheseV99 comptent les lignes et statuts des nouveaux onglets. Valeurs en cache générées ; recalcul demandé à l’ouverture. Les textes source, même commençant par =, restent des textes.'},
    ] },
  ];
  return sheets;
}

export async function generateFollowupV99({ outputDir = path.join(ROOT, 'docs'), check = false } = {}) {
  const snapshot = await collectFollowupV99();
  const json = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`);
  const payload = { root: ROOT, baseline: snapshot.baseline, sheets: buildSheetsV99(snapshot) };
  const workbook = await runPython(payload);
  await fs.mkdir(outputDir, { recursive: true });
  const products = [json, workbook];
  for (const [index, name] of OUTPUTS.entries()) {
    const target = path.join(outputDir, name);
    if (check) {
      const current = await fs.readFile(target);
      if (!current.equals(products[index])) throw new Error(`Suivi périmé : ${name}. Relancer node scripts/build-excel-followup-v99.mjs.`);
    } else await fs.writeFile(target, products[index]);
  }
  return { snapshot, workbookSha256: sha256(workbook), bytes: workbook.length, outputDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output-dir');
  const allowed = args.filter((_, index) => index !== outputIndex + 1 || outputIndex < 0);
  if (allowed.some(arg => !['--check', '--output-dir'].includes(arg)) || (outputIndex >= 0 && !args[outputIndex + 1])) throw new Error('Usage : node scripts/build-excel-followup-v99.mjs [--check] [--output-dir chemin]');
  const result = await generateFollowupV99({ check: args.includes('--check'), ...(outputIndex >= 0 ? { outputDir: path.resolve(args[outputIndex + 1]) } : {}) });
  console.log(JSON.stringify({ result: 'PASS', mode: args.includes('--check') ? 'check' : 'generate', bytes: result.bytes, sha256: result.workbookSha256, facts: result.snapshot.facts, inputs: result.snapshot.inputs.length }));
}
