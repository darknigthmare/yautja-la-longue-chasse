import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PIT_ARENA_SOURCE_PATH,PIT_ARENA_RUNTIME_PATH,serializePitArenaRuntimeData,verifyPitArenaSourceReferences} from './build-pit-arena-runtime-v33.mjs';
import {V60_VISUAL,V60_LIFE,validateV60Promotion,verifyV60StageBytes,writeV60Artifacts} from './lib/pit-stage-plan-v60.mjs';
const manifest=JSON.parse(await fs.readFile(PIT_ARENA_SOURCE_PATH)),baseline=JSON.stringify(manifest.stages.filter(s=>s.number<=161));
const registry=JSON.parse(await fs.readFile(V60_LIFE)),visual=JSON.parse(await fs.readFile(V60_VISUAL));
const requested=(process.argv[2]??'reviewed').split(','),stages=manifest.stages.filter(s=>s.number>=162&&s.number<=186&&(requested.includes('all')||requested.includes('reviewed')&&visual.compositions.some(v=>v.arenaId===s.catalogueId&&v.accepted)||requested.includes(s.catalogueId)||requested.includes(String(s.number))));
assert(stages.length);if(!requested.includes('all')&&!requested.includes('reviewed'))assert.equal(stages.length,requested.length);
for(const stage of stages){
  const life=registry.stages.find(s=>s.stageId===stage.catalogueId),evidence=`docs/v60-${stage.catalogueId}-renderer-qa.json`,renderer=JSON.parse(await fs.readFile(evidence));
  const review=visual.compositions.find(r=>r.arenaId===stage.catalogueId),digest=validateV60Promotion(stage,life,renderer,review);
  assert.deepEqual(await verifyV60StageBytes(stage,life),renderer.nativeImageProof,'Native images changed after renderer qualification');
  for(const file of review.captures){const bytes=await fs.readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),renderer.captureHashes[path.basename(file)],'Visual approval must refer to the exact rendered capture');}
  stage.runtimeEnabled=true;stage.runtimeExtension={arenaId:stage.catalogueId,gameplayProfile:'neutral-duel-v1',rendererEvidence:evidence};stage.compositionVisualReview={evidence:V60_VISUAL,digest};
}
assert.equal(JSON.stringify(manifest.stages.filter(s=>s.number<=161)),baseline);await verifyPitArenaSourceReferences(manifest);
await writeV60Artifacts([[PIT_ARENA_SOURCE_PATH,JSON.stringify(manifest,null,2)+'\n'],[PIT_ARENA_RUNTIME_PATH,serializePitArenaRuntimeData(manifest)]]);
console.log(JSON.stringify({enabled:stages.map(s=>s.catalogueId),historical161Unchanged:true,applicationFlowVerified:false,publicationPerformed:false}));
