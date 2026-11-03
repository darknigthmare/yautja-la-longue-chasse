import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const workbookPath = 'C:/Users/chuck/Downloads/THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx';
const cells = JSON.parse(await fs.readFile('work-local/v60/workbook-source-cells.json', 'utf8'));
const source = await fs.readFile(workbookPath);
const sha256 = createHash('sha256').update(source).digest('hex');
assert.equal(sha256, cells.sha256, 'Workbook changed: refresh the cell extraction before auditing.');
const bundle = await build({ stdin: { contents: [
  "export * from './app/game/systems/pitRosterExpansion';",
  "export * from './app/game/systems/pitUserRoster';",
].join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false,
platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const runtimeIds = new Set(api.PIT_VERSUS_FIGHTER_IDS);
const decisions = {
  'add-bloodshed': ['missing-named-fighter', null, 'Identité du tournoi attestée par Marvel ; apparence native et kit jouable manquants. Les dessins anonymes fournis ne permettent pas une attribution certaine.'],
  'add-last-hunt-super': ['missing-named-fighter', null, 'Dossier distinct de Mr. Black. Référence de tenue et arsenal à verrouiller ; aucun ajout par simple renommage.'],
  'add-jaguar': ['missing-game-incarnation', null, 'Incarnation AVP Jaguar absente ; ne pas substituer Dark, Prince ou Jungle Hunter.'],
  'add-avp-classic': ['missing-game-incarnation', null, 'Incarnation AVP Classic 2000 absente ; user-classic-2010 appartient au film Predators.'],
  'add-blood-ties-father': ['candidate-needs-identification', null, 'Père de Blood Ties : attribution visuelle à établir avant création ou réaffectation.'],
  'add-blood-ties-son': ['candidate-needs-identification', null, 'Fils de Blood Ties : identité distincte à établir, sans fusion avec les cycles I et II.'],
  'variant-elder-phg': ['game-appearance-missing', null, 'Elder de Hunting Grounds existe selon IllFonic ; ni Greyback du film ni Elder AVP ne certifient cette apparence.'],
  'variant-emissary-phg': ['game-appearance-missing', 'user-emissary-phg', 'Biographie Hunting Grounds confirmée par IllFonic. Les deux Emissaries du concept supprimé du film restent séparés.'],
  'variant-captured-phg': ['game-appearance-unverified', null, 'Le dessin anonyme capturé n’a pas de source primaire attribuée ; ni Captive comics ni Classic 2010 ne ferment ce dossier.'],
  'variant-samurai-phg': ['already-playable-clarified', 'user-samurai', 'Deux apparences NECA Hunting Grounds déjà présentes ; identité précisée en V62 sans nouvelle case. Kit natif complet toujours non livré.'],
};
const rows = cells.sheets['02_PERSONNAGES'].filter(row => row.row >= 5).map(row => {
  const read = column => row.cells[column + row.row];
  const id = read('B');
  const decision = decisions[id];
  const resolvedId = runtimeIds.has(id) ? id : decision?.[1];
  const playable = !!resolvedId && runtimeIds.has(resolvedId);
  return { workbookId: id, name: read('C'), sourceCells: `02_PERSONNAGES!A${row.row}:V${row.row}`,
    missingSheetCells: decision ? `03_MANQUANTS!A${row.row - 195}:L${row.row - 195}` : null,
    resolvedId: playable ? resolvedId : null, playable,
    status: id === 'variant-emissary-phg' && playable ? 'new-game-incarnation-playable-partial-kit' : decision?.[0] ?? 'historical-roster-present',
    note: decision?.[2] ?? 'Présence dans le roster seulement ; ni kit complet ni fidélité 1:1 ne sont déduits de cette correspondance.',
    variantCount: playable ? api.getPitFighterVariants(resolvedId).length : 0,
    completeNativeKitCertified: false };
});
assert.equal(rows.length, 205);
const dossiers = rows.filter(row => decisions[row.workbookId]);
const report = { schemaVersion: 1, release: 'V62', checkedAt: new Date().toISOString(),
  source: { path: workbookPath, sha256, mode: 'read-only', extraction: 'work-local/v60/workbook-source-cells.json' },
  counts: { workbookDossiers: rows.length, workbookHistoricalIdentities: 195, runtimeSelectableIdentities: runtimeIds.size,
    workbookDossiersResolvedToPlayable: rows.filter(row => row.playable).length,
    openIdentityOrAppearanceDossiers: dossiers.filter(row => !row.playable).length,
    newFightersThisPass: runtimeIds.has('user-emissary-phg') ? 1 : 0,
    alreadyPresentSamuraiNotRecounted: 1 },
  primarySources: [
    { url: 'https://forum.predator.illfonic.com/t/patch-notes-2-39/27316', supports: 'Emissary Hunting Grounds biography and class, distinct attribution from removed film designs.' },
    { url: 'https://store.playstation.com/en-us/product/UP3095-PPSA24179_00-PHGD17PDLC000000/', supports: 'Official Emissary artwork and description.' },
    { url: 'https://blog.playstation.com/2020/06/30/the-samurai-predator-arrives-in-predator-hunting-grounds/', supports: 'Samurai game class and level-150 Elder class.' },
    { url: 'https://store.necaonline.com/products/predator-hunting-grounds-ultimate-samurai-predator-7-inch-scale-action-figure', supports: 'Existing user-samurai archive attribution.' },
    { url: 'https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/', supports: 'Golden Angel historical incarnation of Elder; separate appearance labels, same identity.' },
  ], dossiers, historicalRows: rows.filter(row => !decisions[row.workbookId]),
  limitations: ['Runtime presence is not a complete native 18-action kit.', 'All V44 PNGs, their IDs and source receipts remain unchanged.', 'No canonical 1:1 artwork certification.', 'No candidate identity is inferred from an anonymous costume.'] };
await fs.writeFile('docs/v62-workbook-roster-audit.json', JSON.stringify(report, null, 2) + '\n');
const table = dossiers.map(row => `| ${row.name} | ${row.sourceCells} | ${row.status} | ${row.resolvedId ?? '—'} | ${row.note} |`).join('\n');
await fs.writeFile('docs/v62-workbook-roster-audit.md', `# V62 — roster du classeur\n\nClasseur source lu sans modification, SHA-256 \`${sha256}\`. Les 205 dossiers comprennent 195 entrées historiques, six ajouts/candidats et quatre dossiers d’apparence. Le runtime comporte ${runtimeIds.size} identités sélectionnables, dont trois créations utilisateur V56 hors de ces 195 entrées historiques. Une apparence masquée/démasquée n’est pas un personnage supplémentaire.\n\n| Dossier | Cellules | État | Identité jouable | Limite |\n|---|---|---|---|---|\n${table}\n\nLes corrections de libellé séparent Golden Angel/Predator 2, Samurai/Oni, film/jeu Emissary, Classic 2010/Classic 2000 et Captive/Captured. Aucun dessin historique n’est supprimé. La présence au roster n’atteste ni 18 actions natives, ni campagne, ni fidélité 1:1.\n\nSources primaires et données vérifiables dans le JSON associé.\n`);
console.log(JSON.stringify(report.counts));
