import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {serializePitArenaRuntimeData,verifyPitArenaSourceReferences} from './build-pit-arena-runtime-v33.mjs';
import {V55_PLAN_PATH,V55_VISUAL_PATH,V55_RUNTIME_PATH,v55RuntimeProjection,validateV55Promotion,verifyV55StageBytes,writeV55Artifacts} from './lib/pit-stage-plan-v55.mjs';
const manifestPath='art-source/v33/pit-arenas/production-manifest.json',manifest=JSON.parse(await fs.readFile(manifestPath));
const baseline=JSON.stringify(manifest.stages.filter(s=>s.number<=138));
const plan=JSON.parse(await fs.readFile(V55_PLAN_PATH)),visual=JSON.parse(await fs.readFile(V55_VISUAL_PATH));
assert.deepEqual(JSON.parse(await fs.readFile(V55_RUNTIME_PATH)),v55RuntimeProjection(plan),'Reassemble when the stage plan or associations change');
for(const spec of plan.stages){
 const stage=manifest.stages.find(s=>s.catalogueId===spec.id&&s.number===spec.number);assert(stage);
 assert.equal(stage.authoringPlanDigest,createHash('sha256').update(JSON.stringify(spec)).digest('hex'),'Stage specification changed after assembly');
 const evidence=`docs/v55-${stage.catalogueId}-renderer-qa.json`,renderer=JSON.parse(await fs.readFile(evidence));
 assert.deepEqual(await verifyV55StageBytes(stage),renderer.nativeImageProof,'Public PNG bytes must still match the renderer qualification');
 const review=visual.compositions.find(r=>r.arenaId===stage.catalogueId),digest=validateV55Promotion(stage,renderer,review);
 for(const capture of review.captures){const bytes=await fs.readFile(capture);assert.equal(createHash('sha256').update(bytes).digest('hex'),renderer.captureHashes?.[path.basename(capture)],'Reviewed capture must be the exact renderer artifact');}
 stage.runtimeEnabled=true;stage.runtimeExtension={arenaId:stage.catalogueId,gameplayProfile:'neutral-duel-v1',rendererEvidence:evidence};stage.compositionVisualReview={evidence:V55_VISUAL_PATH,digest};
}
assert.equal(JSON.stringify(manifest.stages.filter(s=>s.number<=138)),baseline);
await verifyPitArenaSourceReferences(manifest);
await writeV55Artifacts([[manifestPath,JSON.stringify(manifest,null,2)+'\n'],['app/game/pitArenaProductionData.generated.json',serializePitArenaRuntimeData(manifest)]]);
console.log(JSON.stringify({enabled:plan.stages.length,historical138Unchanged:true,applicationFlowVerified:false}));
