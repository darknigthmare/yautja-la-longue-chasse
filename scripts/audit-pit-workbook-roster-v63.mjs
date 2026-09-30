import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const previous=await read('docs/v62-workbook-roster-audit.json');
const art=await read('docs/v63-generation/fighters-art.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(await fs.readFile(previous.source.path)),previous.source.sha256,'Original V54 must remain unchanged.');
const built=await build({stdin:{contents:"export * from './app/game/systems/pitUserRoster';export * from './app/game/systems/pitRosterExpansion';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const map={
  'variant-elder-phg':{fighterId:'greyback',variantId:'elder-phg-official-unmasked-v63',note:'Apparence Elder du jeu PHG ajoutée comme variante distincte de Greyback : portrait et deux gardes natives de six poses. Source PS4 Pro PlayStation juin2020. Le visage et équipement du jeu ne sont pas confondus avec les anciens visuels du film.'},
  'variant-captured-phg':{fighterId:'user-classic-2010',variantId:'captured-phg-official-mask-v63',note:'Apparence Captured du jeu PHG ajoutée à Classic2010 : masque endommagé et tenue propres au DLC Hunting Party, portrait et deux gardes de six poses. Pas de réattribution de la silhouette anonyme, ni fusion avec Captive des comics.'},
};
const ids=new Set(api.PIT_VERSUS_FIGHTER_IDS);
const dossiers=previous.dossiers.map(row=>{
  const added=map[row.workbookId];if(!added)return{...row,variantCount:row.playable?api.getPitFighterVariants(row.resolvedId).length:0};
  assert(ids.has(added.fighterId));const variant=api.getPitUserVariant(added.fighterId,added.variantId);assert(variant);assert.match(variant.src,/\/v63\//);
  return{...row,resolvedId:added.fighterId,resolvedVariantId:added.variantId,playable:true,status:'game-appearance-playable-partial-kit',variantCount:api.getPitFighterVariants(added.fighterId).length,note:added.note,completeNativeKitCertified:false};
});
const historicalRows=previous.historicalRows.map(row=>({...row,variantCount:api.getPitFighterVariants(row.resolvedId).length}));
const resolved=[...historicalRows,...dossiers].filter(row=>row.playable).length;
assert.equal(resolved,199);assert.equal(ids.size,199);assert.equal(dossiers.filter(row=>!row.playable).length,6);
const report={schemaVersion:1,release:'V63',checkedAt:new Date().toISOString(),source:{...previous.source,unchanged:true},
  counts:{workbookDossiers:205,workbookHistoricalIdentities:195,runtimeSelectableIdentities:ids.size,workbookDossiersResolvedToPlayable:resolved,
    openIdentityOrAppearanceDossiers:6,newFightersThisPass:0,newAppearancesThisPass:2,nativePngs:art.pngs,nativeDrawings:art.nativeDrawings,nativeIdleCycles:4},
  coveredRows:dossiers.filter(row=>map[row.workbookId]),dossiers,historicalRows,
  primarySources:art.characters.flatMap(c=>c.referenceUrls.map(url=>({url,appearance:c.key}))),
  limitations:['199 resolved workbook dossiers and199 runtime tiles count different populations; historical duplicate appearances and three V56 originals remain explicit.',
    'Presence and native idle only: no full eighteen-action kit, walking, attacks, intro or round result delivery is inferred.',
    'Hidden shins/back, lighting and microdetails reconstructed; exact1:1 fidelity not certified.',
    'Bloodshed, Last Hunt Super Predator, Jaguar, Classic2000 and Blood Ties father/son remain open.',
    'All historical V44 appearances remain first, unchanged. No stage chapter, campaign unlock or exclusive weapon mechanics added.']};
await fs.writeFile('docs/v63-workbook-roster-audit.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('docs/v63-workbook-roster-audit.md',`# THE PIT — variantes du classeur V63\n\nDeux apparences PHG ajoutées sans nouvelle case. Le roster reste à199 identités.199 des205 dossiers V54 ont une correspondance jouable ; les deux nombres décrivent des populations différentes. Le fichier V54 est intact (SHA256 ${previous.source.sha256}).\n\n| Dossier | Cellules V54 | Case conservée | Variante ajoutée |\n|---|---|---|---|\n${report.coveredRows.map(r=>`|${r.name}|${r.sourceCells} / ${r.missingSheetCells}|${r.resolvedId}|${r.resolvedVariantId}|`).join('\n')}\n\nChaque apparence reçoit un portrait et deux gardes de six dessins. Six PNG /26 dessins natifs au total. Les autres actions utilisent une pose native tenue : aucun kit complet n’est prétendu. Les surfaces invisibles des références sont reconstruites.\n\nRestent ouverts : ${dossiers.filter(r=>!r.playable).map(r=>r.name).join(', ')}. Les exigences d’animation et de campagne restent ouvertes indépendamment de la présence au roster. Références primaires, poses acceptées et essais rejetés figurent dans docs/v63-generation/fighters-art.json.\n`);
console.log(JSON.stringify(report.counts));
