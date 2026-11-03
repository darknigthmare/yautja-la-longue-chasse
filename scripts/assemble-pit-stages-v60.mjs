import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {serializePitArenaRuntimeData,verifyPitArenaSourceReferences,PIT_ARENA_SOURCE_PATH,PIT_ARENA_RUNTIME_PATH} from './build-pit-arena-runtime-v33.mjs';
import {V60_PLAN,V60_LAYOUT,V60_LIFE,V60_CATALOGUE,validateV60Plan,normalizeV60Receipt,v60PendingReasons,composeV60Stage,v60CompositionDigest,writeV60Artifacts} from './lib/pit-stage-plan-v60.mjs';
const readJson=async(file,fallback)=>{try{return JSON.parse(await fs.readFile(file));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}};
const plan=validateV60Plan(await readJson(V60_PLAN));
const manifest=await readJson(PIT_ARENA_SOURCE_PATH),historical=JSON.stringify(manifest.stages.filter(s=>s.number<=161));
const registry=await readJson(V60_LIFE,{schemaVersion:1,release:'V60',stages:[]});
const catalogue=await readJson(V60_CATALOGUE,{schemaVersion:1,release:'V60',stages:[]});
const layouts=await readJson(V60_LAYOUT,{stages:{}}),requested=process.argv[2]??'all',numbers=requested==='all'?null:requested.split(',').map(Number);
const selected=plan.stages.filter(s=>!numbers||numbers.includes(s.number));assert(selected.length&&(!numbers||selected.length===numbers.length));
// Stage165 owns the shared native basalt used by several earlier-numbered scenes.
selected.sort((a,b)=>(a.number===165?-1:b.number===165?1:a.number-b.number));
const pending=[],prepared=[];
for(const spec of selected){
  const receipt=normalizeV60Receipt(await readJson(`docs/v60-generation/${spec.id}.json`,{})),layout=layouts.stages?.[spec.id]??{};
  const reasons=v60PendingReasons(spec,receipt,layout);
  if(reasons.length){pending.push({stageId:spec.id,reasons});continue;}
  try{
    const candidateManifest=structuredClone(manifest);
    const result=await composeV60Stage(spec,receipt,candidateManifest,layout),old=manifest.stages.find(s=>s.catalogueId===spec.id);
    const oldLife=registry.stages.find(s=>s.stageId===spec.id);
    if(old?.runtimeEnabled){
      const unchanged=v60CompositionDigest(old,oldLife)===v60CompositionDigest(result.stage,result.life);
      if(unchanged){
        // Source clarifications do not invalidate identical pixels and attachment proofs.
        Object.assign(old,{screenReference:result.stage.screenReference,sourceReceipt:result.stage.sourceReceipt,authoringPlanDigest:result.stage.authoringPlanDigest});
        const index=catalogue.stages.findIndex(s=>s.id===spec.id);assert(index>=0);catalogue.stages[index]=result.metadata;
        prepared.push({stageId:spec.id,status:'unchanged-enabled-metadata-refreshed'});continue;
      }
      assert(process.argv.includes('--invalidate-reviewed')&&typeof layout.reviewInvalidation==='string'&&layout.reviewInvalidation.length>=20,'Refuse to change an approved composition without explicit documented review invalidation');
      // The rebuilt entry below is a disabled concept until fresh screenshots are actually reviewed.
    }
    manifest.sharedLibrary=candidateManifest.sharedLibrary;
    for(const [array,key,entry] of [[manifest.stages,'catalogueId',result.stage],[registry.stages,'stageId',result.life],[catalogue.stages,'id',result.metadata]]){
      const index=array.findIndex(s=>s[key]===spec.id);if(index<0)array.push(entry);else array[index]=entry;
    }
    prepared.push({stageId:spec.id,status:'assembled-not-enabled',compositionDigest:v60CompositionDigest(result.stage,result.life)});
  }catch(error){pending.push({stageId:spec.id,reasons:[String(error)],invalid:true});}
}
assert.equal(JSON.stringify(manifest.stages.filter(s=>s.number<=161)),historical,'Historical161 scenes must remain exactly unchanged');
manifest.stages.sort((a,b)=>a.number-b.number);registry.stages.sort((a,b)=>a.stageId.localeCompare(b.stageId));catalogue.stages.sort((a,b)=>a.catalogueNumber-b.catalogueNumber);
const compiled=await build({stdin:{contents:'export {isPitStageLifeStageV60} from "./app/game/pitStageLifeV60";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {isPitStageLifeStageV60}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const stage of registry.stages)assert(isPitStageLifeStageV60(stage),'Invalid native life contract: '+stage.stageId);
await verifyPitArenaSourceReferences(manifest);
const report={result:pending.length?'PARTIAL':'PASS',checkedAt:new Date().toISOString(),historical161Unchanged:true,prepared,pending,declaredStages:registry.stages.length,applicationFlowVerified:false,publicationPerformed:false};
await writeV60Artifacts([[PIT_ARENA_SOURCE_PATH,JSON.stringify(manifest,null,2)+'\n'],[PIT_ARENA_RUNTIME_PATH,serializePitArenaRuntimeData(manifest)],
  [V60_LIFE,JSON.stringify(registry,null,2)+'\n'],[V60_CATALOGUE,JSON.stringify(catalogue,null,2)+'\n'],['docs/v60-assembly-report.json',JSON.stringify(report,null,2)+'\n']]);
console.log(JSON.stringify(report,null,2));
if(pending.some(p=>p.invalid))process.exitCode=1;
