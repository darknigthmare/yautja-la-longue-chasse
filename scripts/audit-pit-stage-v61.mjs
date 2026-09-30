import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {pitNativeShaV61,verifyPitNativeV61} from './lib/pit-stage-native-v61.mjs';

const sourcePaths=['app/game/data/pitStageLifeV61.json','app/game/data/pitStageStoryV61.json','app/game/data/pitStageLifeV60.json',
  'app/game/pitStageStoryV61.ts','app/game/pitStageStoryDirectorV61.ts','app/game/pitStageStoryRenderingV61.ts','app/game/pitStageLifeRenderingV61.ts','app/game/pitArenaRendering.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,pitNativeShaV61(await fs.readFile(p))])));
const compiled=await build({stdin:{contents:'export * from "./app/game/pitStageStoryV61";export {PIT_STAGE_LIFE_V60} from "./app/game/pitStageLifeV60";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const receipts=[];
for(const directory of ['docs/v61-generation','docs/v60-generation'])for(const file of (await fs.readdir(directory)).filter(f=>f.endsWith('.json'))) {
  const receipt=JSON.parse(await fs.readFile(path.join(directory,file),'utf8'));
  for(const item of receipt.assets??[receipt])if(item.sha256)receipts.push({...item,receiptFile:`${directory}/${file}`});
}
const ambient=api.PIT_STAGE_LIFE_V61.stages,story=api.PIT_STAGE_STORY_V61.stages;
assert(ambient.length||story.length,'No native V61 asset is registered; an empty manifest is not delivery');
const v60=api.PIT_STAGE_LIFE_V60.stages,existingHashes=new Set(v60.flatMap(s=>s.events.map(e=>e.sha256)));
const hashes=new Set(),sources=new Set(),checks=[];
for(const [kind,stages] of [['ambient',ambient],['story',story]])for(const stage of stages) {
  assert(kind==='ambient'?api.isPitStageLifeStageV61(stage):api.isPitStageStoryStageV61(stage),`Invalid ${kind}: ${stage.stageId}`);
  const validated=kind==='ambient'?api.getPitStageLifeV61Stage(stage.stageId):api.getPitStageStoryV61Stage(stage.stageId);assert.equal(validated,stage);
  if(kind==='ambient')api.validatePitStageLifeOverrideV61(stage,v60.find(s=>s.stageId===stage.stageId));
  for(const event of stage.events) {
    const reused=kind==='ambient'&&Boolean(event.reusedV60EventId);
    assert(!sources.has(event.src));sources.add(event.src);assert(!hashes.has(event.sha256)&&(!existingHashes.has(event.sha256)||reused),`${event.id}: undeclared renamed/recycled sheet`);hashes.add(event.sha256);
    if(event.replacesAmbientEventId)assert([...v60,...ambient].find(s=>s.stageId===stage.stageId)?.events.some(e=>e.id===event.replacesAmbientEventId),`${event.id}: no actor to replace`);
    const candidates=receipts.filter(r=>r.sha256===event.sha256&&['visually-accepted','accepted'].includes(r.status)
      &&r.receiptFile.startsWith(reused?'docs/v60-generation/':'docs/v61-generation/'));
    assert(candidates.length,`${event.id}: accepted producer receipt not found`);
    const native=await verifyPitNativeV61(event,candidates[0]);
    checks.push({stageId:stage.stageId,eventId:event.id,kind,reusedV60:reused,trigger:event.trigger??'ambient-bag',receipt:candidates[0].receiptFile,...native});
  }
}
for(const file of sourcePaths)assert.equal(pitNativeShaV61(await fs.readFile(file)),sourceHashes[file],`Source changed during audit: ${file}`);
const historical=JSON.parse(await fs.readFile('docs/v60-stage-pipeline-final-qa.json','utf8'));
assert.equal(sourceHashes['app/game/data/pitStageLifeV60.json'],historical.sourceHashes['app/game/data/pitStageLifeV60.json'],'Released V60 native data changed');
const report={result:'PASS',checkedAt:new Date().toISOString(),ambientStages:ambient.length,ambientSheets:ambient.reduce((n,s)=>n+s.events.length,0),
  conditionalStages:story.length,conditionalSheets:story.reduce((n,s)=>n+s.events.length,0),nativePngs:checks.length,nativeDrawings:checks.reduce((n,c)=>n+c.nativeDrawings,0),
  newlyIntegratedSheets:checks.filter(c=>!c.reusedV60).length,reusedV60Sheets:checks.filter(c=>c.reusedV60).length,
  bytes:checks.reduce((n,c)=>n+c.bytes,0),released75V60EventsUnchanged:true,sourceHashes,checks,
  applicationFlowVerified:false,visualCompositionAccepted:false,publicationPerformed:false,
  limit:'Verifies registered native assets only. Unregistered prepared art and absent narrative callers do not count as delivered scenes.'};
const output=process.env.V61_NATIVE_QA_OUTPUT??'docs/v61-native-assets-qa.json';await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,ambientStages:report.ambientStages,ambientSheets:report.ambientSheets,conditionalSheets:report.conditionalSheets,nativePngs:report.nativePngs,nativeDrawings:report.nativeDrawings,bytes:report.bytes,report:output}));
