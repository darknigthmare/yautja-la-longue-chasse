import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildPitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';
import {parseArenaNumbers,arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';
const get=name=>process.argv[process.argv.indexOf(name)+1];
const ids=parseArenaNumbers(get('--ids'));
const mode=process.argv.includes('--integrate')?'integrate':'enable';
const visualPath=get('--visual-review');
assert(/^docs\/v42-[a-z0-9/-]+[.]json$/.test(visualPath??'')&&!visualPath.includes('..'),'An actual committed composition visual review is required');
const visual=JSON.parse(await fs.readFile(visualPath,'utf8'));
const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const oldTwenty=JSON.stringify(manifest.stages.slice(0,20));
let appProof=null,appProofPath=null;
if(mode==='integrate'){
 appProofPath=get('--application-proof');
 assert(/^docs\/v42-[a-z0-9/-]+[.]json$/.test(appProofPath??'')&&!appProofPath.includes('..'));
 appProof=JSON.parse(await fs.readFile(appProofPath,'utf8'));
 assert.equal(appProof.passed,true);assert.equal(appProof.surface,'full-application-play-pit-training');
 assert.deepEqual(appProof.errors,[]);assert.deepEqual(appProof.failedRequests,[]);assert.equal(appProof.mobileNoOverflow,true);
}
const promoted=[];
for(const number of ids){
 const stage=manifest.stages.find(s=>s.number===number);assert(stage);
 const digest=arenaCompositionDigest(stage);
 const reviewed=visual.compositions?.find(r=>r.arenaId===stage.catalogueId);
 assert(reviewed?.accepted===true&&reviewed.compositionDigest===digest,'Missing/stale visual inspection '+stage.catalogueId);
 assert(reviewed.captures?.length>=3&&typeof reviewed.notes==='string'&&reviewed.notes.length>20,'Review needs actual captures and visual observations');
 const evidence=`docs/v42-${stage.catalogueId}-renderer-qa.json`;
 const qa=JSON.parse(await fs.readFile(evidence,'utf8'));
 assert.equal(qa.result,'PASS');assert.equal(qa.arenaId,stage.catalogueId);assert.equal(qa.compositionDigest,digest);
 const images=[...new Set(stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path))))];
 const modules=stage.planes.reduce((n,p)=>n+p.assets.length,0);
 assert.equal(qa.loaded.independentKit,true);assert.equal(qa.loaded.images,images.length);
 assert.deepEqual(qa.loaded.failed,[]);assert.deepEqual(qa.errors,[]);assert.deepEqual(qa.failedRequests,[]);
 assert.equal(qa.mobileNoOverflow,true);
 if(stage.planes.flatMap(p=>p.assets).some(a=>a.animation||a.ambientMotion))assert(qa.ambienceProof?.passed&&qa.ambienceProof.reducedMotionHolds&&qa.ambienceProof.floorUnchanged,'Real atmosphere drawing proof required');
 assert(qa.scenarios.length>=8&&qa.scenarios.every(s=>s.planes.length===6&&s.missing.length===0&&s.unchangedState&&s.unchangedCamera&&s.fighters.every(Boolean)));
 if(mode==='integrate'){
  assert.equal(stage.runtimeEnabled,true,'First run renderer-approved enable, compile, and exercise the full app');
  const check=appProof.checks.find(c=>c.arena===stage.catalogueId);
  assert(check&&check.loadedImages===images.length&&check.subplans===modules&&check.missing===0);
  assert.equal(check.compositionDigest,digest,'Application proof must name the compiled composition');
  assert(images.every(p=>appProof.loadedImageFiles.includes(p)),'Actual app loading proof lacks an image');
  stage.runtimeExtension.applicationEvidence=appProofPath;
  for(const plane of stage.planes){plane.status='integrated';for(const asset of plane.assets)for(const frame of asset.frames){frame.status='integrated';frame.integration={evidence:appProofPath};}}
 }else{
  assert(!stage.runtimeEnabled,'Already enabled; do not overwrite approval');
  stage.runtimeEnabled=true;
  stage.runtimeExtension={arenaId:stage.catalogueId,gameplayProfile:'neutral-duel-v1',rendererEvidence:evidence};
  stage.compositionVisualReview={evidence:visualPath,digest};
 }
 promoted.push({number,arenaId:stage.catalogueId,mode,images:images.length,modules,digest});
}
assert.equal(JSON.stringify(manifest.stages.slice(0,20)),oldTwenty,'Historical twenty changed');
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');await buildPitArenaRuntimeData();
console.log(JSON.stringify({promoted}));
