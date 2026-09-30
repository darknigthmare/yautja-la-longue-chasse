import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {validateV55Plan,v55RuntimeProjection,V55_MODULE_PROFILES,composeV55Stage,measureVisibleAssetContact,measureV55FloorCoverage,validateV55Promotion,verifyV55StageBytes,writeV55Artifacts} from '../scripts/lib/pit-stage-plan-v55.mjs';
import {arenaCompositionDigest} from '../scripts/lib/pit-arena-composition-v42.mjs';

const historical=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json'));
const originalStages=historical.stages.filter(s=>s.number<=138);
const fixture=()=>({schemaVersion:1,release:'V55',stages:[{number:139,id:'arena-139-test-exhibition',name:'Exposition de recette',kind:'original',workId:'original-project-exhibition',workTitle:'Exposition originale du projet',setting:'Une scène de recette, sans revendication de lieu canonique.',palette:{sky:'#112233',ground:'#334455',accent:'#aabbcc'},moduleProfile:'forest',reference:{classification:'original-exhibition',claim:'Décor original non biographique explicite.',sources:[]},p0:{publicPath:'/game/sprites/v55/pit-arenas/arena-139-test-exhibition/p0-depth.png',sourceRecordId:'test-source'}}],associations:[{fighterId:'test-fighter',stageId:'arena-139-test-exhibition',classification:'original-exhibition',sourceStatus:'original-selected',reason:'Choix de scène original non biographique et sans nouvelle origine inventée.',sourceUrls:[]}]});
const validate=plan=>validateV55Plan(plan,{existingStages:originalStages,rosterIds:['test-fighter']});

test('V55 plan distinguishes explicit original exhibition from work and character evidence',()=>{
 const plan=fixture();assert.equal(validate(plan),plan);
 const runtime=v55RuntimeProjection(plan);assert.equal(runtime.stages[0].kind,'original');assert.equal(runtime.stages[0].sourceUrl,null);assert.deepEqual(runtime.stages[0].dedicatedFighters,[]);assert.equal(runtime.associations[0].sourceStatus,'original-selected');
 assert(!JSON.stringify(runtime).includes('toolSource'));
});
test('V55 catalogue cannot replace old stages, duplicate IDs or escape the exact P0 path',()=>{
 for(const mutate of [p=>p.stages[0].number=138,p=>p.stages.push(structuredClone(p.stages[0])),p=>p.stages[0].id='arena-140-test-exhibition',p=>p.stages[0].p0.publicPath='/game/sprites/v55/pit-arenas/../p0-depth.png']){const p=fixture();mutate(p);assert.throws(()=>validate(p));}
});
test('V55 associations reject missing, duplicate, unknown identities and unavailable venues',()=>{
 for(const mutate of [p=>p.associations=[],p=>p.associations.push(structuredClone(p.associations[0])),p=>p.associations[0].fighterId='unlisted',p=>p.associations[0].stageId='arena-999-fiction']){const p=fixture();mutate(p);assert.throws(()=>validate(p));}
});
test('a historical catalogue-only identity cannot masquerade as its different playable ID',()=>{
 const p=fixture();p.associations[0].stageId=originalStages[0].catalogueId;assert.throws(()=>validate(p));
 p.associations[0].stageId=originalStages[0].legacyRuntimeArenaId;validate(p);
});
test('V55 original artwork cannot silently become canon through its recommendation',()=>{
 for(const mutate of [p=>p.stages[0].kind='comic',p=>p.associations[0].sourceStatus='resolved',p=>{p.associations[0].classification='character-setting';p.associations[0].sourceStatus='resolved';p.associations[0].sourceUrls=['https://example.com/publisher'];}]){const p=fixture();mutate(p);assert.throws(()=>validate(p));}
});
test('V55 non-original claims require a primary reference and a separately qualified source status',()=>{
 const p=fixture();p.stages[0].kind='comic';p.stages[0].reference.classification='work-setting';assert.throws(()=>validate(p));
 p.stages[0].reference.sources=['https://example.com/publisher'];p.associations[0].classification='work-setting';p.associations[0].sourceStatus='primary-limited';assert.throws(()=>validate(p));
 p.associations[0].sourceUrls=['https://example.com/publisher'];validate(p);
 p.associations[0].sourceUrls=['https://secret:password@example.com/publisher'];assert.throws(()=>validate(p));
});
test('V55 does not call the dry earth module a sand texture, and unknown profiles fail closed',()=>{
 assert(!Object.hasOwn(V55_MODULE_PROFILES,'sand'));assert(V55_MODULE_PROFILES['dry-earth'].description.includes('pas'));
 const p=fixture();p.stages[0].moduleProfile='sand';assert.throws(()=>validate(p));
});
test('V55 floor aliases must retain an earlier original owner and the exact crop/material/receipt',()=>{
 const p=fixture(),first=p.stages[0];first.floor={publicPath:'/game/sprites/v55/pit-arenas/'+first.id+'/p4-floor.png',sourceRecordId:'native-floor',material:'sand',placement:{width:960,height:110}};
 const second={...structuredClone(first),number:140,id:'arena-140-test-exhibition',floor:{...structuredClone(first.floor),ownerStageId:first.id}};second.p0={publicPath:'/game/sprites/v55/pit-arenas/'+second.id+'/p0-depth.png',sourceRecordId:'other-p0'};p.stages.push(second);validate(p);
 second.floor.sourceCrop={x:0,y:0,width:100,height:30};assert.throws(()=>validate(p));delete second.floor.sourceCrop;second.floor.ownerStageId=second.id;assert.throws(()=>validate(p));
});

const compiled=await build({stdin:{contents:'export {isPitArenaAssetPathAuthorized} from "./app/game/pitArenaProduction";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('all module profiles preserve 138 historical stages, source ownership and measured contact',async()=>{
 const manifest=structuredClone(historical),baseline=JSON.stringify(manifest.stages),cache=new Map();
 for(const moduleProfile of Object.keys(V55_MODULE_PROFILES).filter(key=>!V55_MODULE_PROFILES[key].requiresNativeModules)){
  const spec={...fixture().stages[0],moduleProfile};
  // Reuse an actual reviewed frame only for the in-memory composition contract fixture.
  const p0=structuredClone(originalStages[0].planes[0].assets[0].frames[0]);p0.path=spec.p0.publicPath;
  const stage=await composeV55Stage(spec,manifest,p0,{measurementCache:cache});
  assert.equal(stage.runtimeEnabled,false);assert.deepEqual(stage.planes.map(p=>p.id),['P0','P1','P2','P3','P4','P5']);
  for(const asset of stage.planes.flatMap(p=>p.assets)){assert(api.isPitArenaAssetPathAuthorized(stage,asset,manifest),moduleProfile+'/'+asset.id);if(asset.mode==='repeat-x')assert.equal(asset.parallax,1);}
  assert(stage.contactMeasurements.length>0,'Every module profile exposes physical grounding measurements');
  for(const m of stage.contactMeasurements){const a=stage.planes.find(p=>p.id===m.plane).assets.find(a=>a.id===m.assetId);const crop=a.sourceCrop??a.frames[0].generation.contentBounds;
   a.placements.forEach((p,i)=>assert(Math.abs(p.y+p.height-(crop.y+crop.height-m.visibleBottomExclusive)*Math.min(p.width/crop.width,p.height/crop.height)-m.authoredBottoms[i])<.00001));
  }
  if(moduleProfile==='urban-roof')assert(stage.planes.flatMap(p=>p.assets).every(a=>!a.id.includes('case')&&!a.id.includes('pillar')));
  if(moduleProfile==='ice')assert(stage.planes.flatMap(p=>p.assets).every(a=>!a.id.includes('banner')&&!a.frames[0].path.includes('viking')||a.id.startsWith('p4-')));
 }assert.equal(JSON.stringify(manifest.stages),baseline,'No historical record changed');
});
test('mineral, clean and organic profiles require native modules, never substitute AVP columns or crates',()=>{
 for(const moduleProfile of['nature-mineral','clean-interior','organic']){const p=fixture();p.stages[0].moduleProfile=moduleProfile;assert.throws(()=>validate(p));assert.equal(V55_MODULE_PROFILES[moduleProfile].P2,null);assert.equal(V55_MODULE_PROFILES[moduleProfile].P3,null);}
});
test('native alpha measurement is crop-specific and retains the V54 case foot correction',async()=>{
 const a=structuredClone(originalStages.find(s=>s.number===104).planes[3].assets[0]);const m=await measureVisibleAssetContact(a);assert.equal(m.visibleBottomExclusive,672);
 const cache=new Map();await measureVisibleAssetContact(a,process.cwd(),cache);a.sourceCrop={x:44,y:224,width:1686,height:200};const cropped=await measureVisibleAssetContact(a,process.cwd(),cache);assert(cropped.visibleBottomExclusive<=424);assert.equal(cache.size,2);
 for(const sourceCrop of[{x:1818,y:223,width:1686,height:200},{x:-1,y:0,width:10,height:10},{x:0,y:0,width:10.5,height:10},{x:0,y:0,width:0,height:10}])await assert.rejects(()=>measureVisibleAssetContact({...a,sourceCrop}),/strictly inside/);
});
test('a promotion write failure restores both previous manifests and leaves no temporary files',async()=>{
 const files=new Map([['source','old-source'],['runtime','old-runtime']]);let failed=false;
 const io={writeFile:async(p,v)=>{files.set(p,v);},rename:async(from,to)=>{if(to==='runtime'&&from.endsWith('.tmp')&&!failed){failed=true;throw Object.assign(Error('disk failure'),{code:'EIO'});}if(!files.has(from))throw Object.assign(Error('missing'),{code:'ENOENT'});files.set(to,files.get(from));files.delete(from);},unlink:async p=>{if(!files.delete(p))throw Object.assign(Error('missing'),{code:'ENOENT'});}};
 await assert.rejects(()=>writeV55Artifacts([['source','new-source'],['runtime','new-runtime']],io),/disk failure/);assert.deepEqual([...files].sort(),[['runtime','old-runtime'],['source','old-source']]);
 await writeV55Artifacts([['source','new-source'],['runtime','new-runtime']],io);assert.deepEqual([...files].sort(),[['runtime','new-runtime'],['source','new-source']]);
});
test('native public bytes are re-hashed, so changing a source after assembly cannot inherit an old OpenAI receipt',async()=>{
 const stage=structuredClone(originalStages.at(-1)),proof=await verifyV55StageBytes(stage);assert(proof.length>=6);
 stage.planes[0].assets[0].frames[0].generation.sha256='0'.repeat(64);await assert.rejects(()=>verifyV55StageBytes(stage),/differs from its receipt/);
});
test('floor alpha audit catches transparent notches below a solid contact line',async()=>{
 const oldFloor=originalStages.find(s=>s.number===104).planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x');
 const oldEvidence=await measureV55FloorCoverage(oldFloor);assert(oldEvidence.topRowOpaqueRatio>=.98);assert(oldEvidence.minimumRowOpaqueRatio<.98);
 const nativeFloor=historical.stages.find(s=>s.number===139).planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x');
 const nativeEvidence=await measureV55FloorCoverage(nativeFloor);assert(nativeEvidence.minimumRowOpaqueRatio>=.98);
});
test('activation rejects missing views, stale composition, ungrounded props and absent visual review',()=>{
 const stage=originalStages.at(-1),digest=arenaCompositionDigest(stage);
 const report={result:'PASS',arenaId:stage.catalogueId,compositionDigest:digest,loaded:{independentKit:true,images:14,expectedImages:14,failed:[]},errors:[],failedRequests:[],mobileNoOverflow:true,floorEvidence:[{topRowOpaqueRatio:1,minimumRowOpaqueRatio:1}],scenarios:Array.from({length:8},(_,i)=>({name:'camera-'+i,planes:['P0','P1','P2','P3','P4','P5'],missing:[],unchangedState:true,unchangedCamera:true,fighters:[true,true],groundedPropsVerified:true,floorCoversScreen:true,hangingPropsAnchored:true}))};
 const visual={accepted:true,compositionDigest:digest,captures:['center.png','left.png','right.png'],notes:'Visuels du renderer examinés à la main et appuis confirmés.'};assert.equal(validateV55Promotion(stage,report,visual),digest);
 for(const mutate of [r=>r.compositionDigest='stale',r=>r.scenarios.pop(),r=>r.scenarios[0].groundedPropsVerified=false,r=>r.scenarios[0].floorCoversScreen=false,r=>r.scenarios[0].hangingPropsAnchored=false,r=>r.floorEvidence[0].minimumRowOpaqueRatio=.4,r=>r.loaded.images--,r=>r.failedRequests.push('/missing.png')]){const r=structuredClone(report);mutate(r);assert.throws(()=>validateV55Promotion(stage,r,visual));}
 assert.throws(()=>validateV55Promotion(stage,report,{...visual,accepted:false}));
});
