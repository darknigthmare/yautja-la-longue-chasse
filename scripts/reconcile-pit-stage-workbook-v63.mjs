import fs from 'node:fs/promises';
import {build} from 'esbuild';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const baseline=await read('docs/v61-stage-open-work.json');
const compiled=await build({stdin:{contents:`export {resolvePitArenaProductionKit,PIT_ARENA_PRODUCTION_MANIFEST} from './app/game/pitArenaProduction';export {getPitStageLifeV60Stage} from './app/game/pitStageLifeV60';export {getPitStageLifeV61Stage} from './app/game/pitStageStoryV61';export {getPitStageLifeV62Stage} from './app/game/pitStageLifeV62';export {getPitStageLifeV63Stage} from './app/game/pitStageLifeV63';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const dossiers=baseline.dossiers.map(d=>{
 const targetStageId=['ST046','ST103'].includes(d.stageKey)?'arena-187-golgotha-uscm-airlock':d.targetStageId;
 const modern=api.getPitStageLifeV63Stage(targetStageId)??api.getPitStageLifeV62Stage(targetStageId)??api.getPitStageLifeV61Stage(targetStageId)??api.getPitStageLifeV60Stage(targetStageId);
 const production=api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.catalogueId===targetStageId);
 const runtimeArenaId=production?.legacyRuntimeArenaId??production?.runtimeExtension?.arenaId??targetStageId;
 const kit=api.resolvePitArenaProductionKit(runtimeArenaId);
 return {stageKey:d.stageKey,name:d.name,work:d.work,stageCells:d.stageCells,targetStageId,runtimeArenaId,runtimeKitResolved:Boolean(kit),nativeAmbientEvents:modern?.events.length??0,
  literalDossierCertifiedComplete:false,events:d.events.map(e=>({...e,status:['10_VIE_DES_STAGES!E503','10_VIE_DES_STAGES!E504','10_VIE_DES_STAGES!E505','10_VIE_DES_STAGES!E512','10_VIE_DES_STAGES!E513','10_VIE_DES_STAGES!E514'].includes(e.descriptionCell)?'V63-original-adaptation-integrated-not-canon-exact':e.descriptionCell==='10_VIE_DES_STAGES!E62'?'disabled-on-roof-contradicts-E505-separate-continuity-open':'not-recertified-by-V63'}))};
});
const missingRuntime=dossiers.filter(d=>!d.runtimeKitResolved),withoutNative=dossiers.filter(d=>d.nativeAmbientEvents===0);
const nativeTargets=new Map(dossiers.filter(d=>d.nativeAmbientEvents).map(d=>[d.targetStageId,d.nativeAmbientEvents]));
const result={schemaVersion:1,release:'V63',checkedAt:new Date().toISOString(),source:baseline.source,
 method:'Reconcile the existing read-only workbook extraction against current validated runtime kits and V63/V62/V61/V60 native registries in precedence order. A matching backdrop is not evidence of exact lore, literal event delivery or scenario conditions.',
 counts:{workbookDossiers:dossiers.length,workbookEvents:dossiers.reduce((n,d)=>n+d.events.length,0),uniqueTargets:new Set(dossiers.map(d=>d.targetStageId)).size,runtimeArenas:api.PIT_ARENA_PRODUCTION_MANIFEST.stages.filter(s=>s.runtimeEnabled).length,
  dossiersWithoutRuntime:missingRuntime.length,dossiersWithoutNativeAmbientRegistry:withoutNative.length,uniqueTargetsWithoutNativeAmbientRegistry:new Set(withoutNative.map(d=>d.targetStageId)).size,uniqueTargetsWithNativeAmbientRegistry:nativeTargets.size,activeNativeAmbientEventsOnWorkbookTargets:[...nativeTargets.values()].reduce((a,b)=>a+b,0),newWorkbookEventsAdaptedV63:6,newStagesV63:0,literalDossiersCertifiedComplete:0},
 missingRuntimeCorrespondences:missingRuntime,
 priorityOpen:[{stageKey:'ST103',targetStageId:'arena-187-golgotha-uscm-airlock',cells:['E311','E312','E313'],remaining:'Separate trio still unimplemented. E313 requires primary proof of scene presence before any silhouette.'},
 {stageKey:'ST020',targetStageId:'arena-126-avpr-2007-hospital-roof',cells:['E62'],remaining:'Evacuation sprite preserved but inactive on the roof. A distinct validated off-roof or narrative continuity is still required; Wolf equipment/chronology remains open.'},
 ...baseline.conditions178to180.items.map(i=>({stageNumber:i.stage,cells:i.cells,remaining:i.open+' The V61 adapter is present, but no verified narrative caller has been added by V63.'})),
 ...withoutNative.slice(0,10).map(d=>({stageKey:d.stageKey,targetStageId:d.targetStageId,cells:d.events.map(e=>e.descriptionCell),remaining:'Existing background has no V60–V63 dedicated native ambient registry. Audit primary references and exact conditions before generating its three events.'}))],
 dossiersWithoutNativeAmbientRegistry:withoutNative.map(d=>({stageKey:d.stageKey,name:d.name,targetStageId:d.targetStageId,cells:d.events.map(e=>e.descriptionCell)})),dossiers,
 limits:['A missing V60–V63 registry does not prove all legacy background motion absent.','No claim that the187 runtime arenas satisfy the174 workbook dossiers.','All522 original event descriptions remain in this reconciliation; only six V63 event adaptations are newly accounted for.','Other historical substitutions/conditional gestures remain subject to their V60–V62 evidence, not silently recertified.']};
await fs.writeFile('docs/v63-stage-open-work.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.counts));
