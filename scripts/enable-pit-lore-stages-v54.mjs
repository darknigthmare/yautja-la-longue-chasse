import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildPitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';
import {arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';
const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const baseline=JSON.stringify(manifest.stages.filter(s=>s.number<=136));
const visualPath='docs/v54-stage-composition-visual-review.json';
const visual=JSON.parse(await fs.readFile(visualPath,'utf8'));
for(const number of [137,138]){
 const stage=manifest.stages.find(s=>s.number===number);assert(stage&&!stage.runtimeEnabled);
 const digest=arenaCompositionDigest(stage),review=visual.compositions.find(r=>r.arenaId===stage.catalogueId);
 assert(review?.accepted&&review.compositionDigest===digest&&review.captures.length>=3&&review.notes.length>20);
 const evidence=`docs/v54-${stage.catalogueId}-renderer-qa.json`,qa=JSON.parse(await fs.readFile(evidence,'utf8'));
 assert.equal(qa.result,'PASS');assert.equal(qa.compositionDigest,digest);assert(qa.loaded.independentKit);
 assert.equal(qa.loaded.images,qa.loaded.expectedImages);assert.deepEqual(qa.loaded.failed,[]);assert.deepEqual(qa.errors,[]);assert.deepEqual(qa.failedRequests,[]);
 assert(qa.mobileNoOverflow&&qa.scenarios.length>=8&&qa.scenarios.every(s=>s.planes.length===6&&!s.missing.length&&s.unchangedState&&s.unchangedCamera&&s.fighters.every(Boolean)));
 if(number===138)assert(qa.lifeProof?.passed&&qa.lifeProof.nativeFrames===6&&qa.lifeProof.reducedMotionHolds&&qa.lifeProof.pausedClockHolds);
 stage.runtimeEnabled=true;stage.runtimeExtension={arenaId:stage.catalogueId,gameplayProfile:'neutral-duel-v1',rendererEvidence:evidence};
 stage.compositionVisualReview={evidence:visualPath,digest};
}
assert.equal(JSON.stringify(manifest.stages.filter(s=>s.number<=136)),baseline);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');await buildPitArenaRuntimeData();
console.log(JSON.stringify({enabled:[137,138],historical136Unchanged:true,applicationFlowVerified:false}));
