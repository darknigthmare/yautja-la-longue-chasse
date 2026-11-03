import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=await read('docs/v63-stage-open-work.json');
const extraction=await read('work-local/v60/workbook-source-cells.json');
const sourcePath='C:/Users/chuck/Downloads/THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx';
if(sha(await fs.readFile(sourcePath))!==extraction.sha256)throw Error('V54 source changed; re-extract rather than reusing stale cells.');
const built=await build({stdin:{contents:`export {PIT_ARENA_PRODUCTION_MANIFEST,resolvePitArenaProductionKit} from './app/game/pitArenaProduction';export {PIT_STAGE_COMPOSITION_V65} from './app/game/pitStageCompositionV65';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const defects={12:'Architecture gothique, loge de clan peu identifiable',20:'Arches et ruines médiévales, technologie du clan peu lisible',36:'Temple générique, original à rapprocher du vocabulaire matériel Yautja',50:'Forteresse et grands masques génériques, sas industriel peu lisible',69:'Autel lévitant sans dispositif technologique explicite',76:'Atrium ornemental générique, fonction de médiation peu lisible'};
const priority=Object.keys(defects).map(Number).map(number=>{
 const stage=api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.number===number);
 const dossier=baseline.dossiers.find(d=>d.targetStageId===stage.catalogueId);
 const sourceRow=extraction.sheets['09_STAGES'].find(row=>row.cells['A'+row.row]===dossier.stageKey);
 const override=api.PIT_STAGE_COMPOSITION_V65.stages.find(s=>s.stageId===stage.catalogueId);
 return {stageId:stage.catalogueId,number,name:stage.name,workbookKey:dossier.stageKey,cells:dossier.stageCells,sourceRow,
  before:'Runtime kit already present; this is a visual revision, not a missing arena.',visualFinding:defects[number],
  v65Status:override?'static-overlay-integrated-await-delivery-QA':'selected-art-in-progress',
  fullDossierCertifiedComplete:false,canonicalLocation:false,newAnimations:0,
  eventCellsStillNotDeliveredByThisStaticLot:dossier.events.map(e=>({cell:e.descriptionCell,description:e.description})),
  previousAssets:stage.planes.flatMap(p=>p.assets.map(a=>({plane:p.id,id:a.id,paths:a.frames.map(f=>f.path),sha256:a.frames.map(f=>f.generation.sha256)})))};
});
const dossiers=baseline.dossiers.map(d=>{
 const stage=api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.catalogueId===d.targetStageId),runtimeId=stage?.legacyRuntimeArenaId??stage?.runtimeExtension?.arenaId;
 return {stageKey:d.stageKey,name:d.name,targetStageId:d.targetStageId,workbookCells:d.stageCells,runtimeId:runtimeId??null,runtimeKitPresent:Boolean(runtimeId&&api.resolvePitArenaProductionKit(runtimeId)),staticVisualReviewV65:priority.some(p=>p.stageId===d.targetStageId)?'selected-six-originals':'not-audited-in-this-lot'};
});
const output={schemaVersion:1,release:'V65',checkedAt:new Date().toISOString(),source:{path:sourcePath,sha256:extraction.sha256,unchanged:true},
 counts:{workbookDossiers:dossiers.length,workbookTargets:new Set(dossiers.map(d=>d.targetStageId)).size,runtimeStages:api.PIT_ARENA_PRODUCTION_MANIFEST.stages.length,dossiersWithoutRuntimeKit:dossiers.filter(d=>!d.runtimeKitPresent).length,selectedStaticRevisions:priority.length,integratedStaticRevisions:priority.filter(p=>p.v65Status.startsWith('static-overlay')).length,newArenas:0,newAnimations:0,literalDossiersCertifiedComplete:0},priority,dossiers,
 limits:['No absence of a dedicated V60–V63 ambient registry is treated as absence of a backdrop.','This limited visual pass does not review the other181 arenas.','Eighteen requested animation descriptions for the six selected dossiers remain outside this static lot.','Original architecture guided by references does not become a canonical location or a certified1:1 reproduction.']};
await fs.writeFile('docs/v65-stage-static-workbook-audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.counts));
