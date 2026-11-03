import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {V60_COMPOSITION_PROFILES,validateV60Plan,normalizeV60Receipt,isV60AssetAccepted,v60PendingReasons,v60SourceMetadata,v60CompositionDigest,validateV60Promotion,resolveV60Destination,measureV60Life} from '../scripts/lib/pit-stage-plan-v60.mjs';
const plan=JSON.parse(await fs.readFile('docs/v60-stage-plan.json'));
const clone=value=>structuredClone(value);

test('V60 workbook plan keeps25 distinct immutable162–186 IDs and three event specifications each',()=>{
  assert.equal(validateV60Plan(plan),plan);assert.equal(new Set(plan.stages.map(s=>s.id)).size,25);
  for(const mutate of [p=>p.stages.pop(),p=>p.stages[0].number=161,p=>p.stages[0].id=p.stages[1].id,p=>p.stages[0].events.pop()]){const copy=clone(plan);mutate(copy);assert.throws(()=>validateV60Plan(copy));}
});

test('material profiles do not silently use roof tiles for a maritime deck or industrial props for bare geology',()=>{
  assert.equal(V60_COMPOSITION_PROFILES[176].P4,'native-deck');assert.equal(V60_COMPOSITION_PROFILES[176].material,'wood');
  assert.equal(V60_COMPOSITION_PROFILES[176].P2,'native-maritime');assert.equal(V60_COMPOSITION_PROFILES[176].P3,'native-maritime');
  for(const id of [162,164,174,175])assert.equal(V60_COMPOSITION_PROFILES[id].P2,143);
  assert.equal(V60_COMPOSITION_PROFILES[173].P4,139,'Japanese court uses pavement, not tiled rooftop gameplay floor');
  assert.equal(V60_COMPOSITION_PROFILES[168].P4,157,'Organic front uses its own organic floor family');
  for(const id of [172,186])assert.equal(V60_COMPOSITION_PROFILES[id].P4,141);
});

test('producer receipts normalise exact native roles without treating measured metadata as visual review',()=>{
  const raw={arenaId:'arena-170-gotham-bloodties',sources:[{url:'https://example.com/source'}],events:[{asset:'life-01.png',description:'Anonymous adult'}],assets:[{key:'life01',file:'life-01.png',path:'work-local/v60/generated/arena-170-gotham-bloodties/life-01.png',sourcePath:'native',cells:[{rect:[0,0,512,512]}],status:'measured-awaiting-visual-acceptance'}]};
  const normal=normalizeV60Receipt(raw);assert.equal(normal.stageId,raw.arenaId);assert.equal(normal.assets[0].id,'life-01');assert.equal(normal.assets[0].name,'Anonymous adult');assert.equal(normal.assets[0].workspacePath,raw.assets[0].path);assert.equal(normal.assets[0].frames,raw.assets[0].cells);assert.deepEqual(normal.sourceUrls,['https://example.com/source']);
  assert.equal(isV60AssetAccepted(normal.assets[0]),false);
  for(const status of ['accepted','visually-accepted','reviewed'])assert(isV60AssetAccepted({...normal.assets[0],status,visualNotes:'Actual sheet inspected; anatomy and all cells accepted.'}));
  assert.equal(isV60AssetAccepted({...normal.assets[0],status:'visually-accepted'}),false);
});

test('a stage remains pending until all four accepted native images and three authored placements exist',()=>{
  const spec=plan.stages[0],assets=['p0-depth','life-01','life-02','life-03'].map(id=>({id,status:'visually-accepted',visualNotes:'Actual native drawing inspected and accepted.'}));
  assert.equal(v60PendingReasons(spec,{assets}).length,3);
  const layout={events:Object.fromEntries(assets.slice(1).map(a=>[a.id,{placement:{x:1,bottom:2,height:3}}]))};
  assert.deepEqual(v60PendingReasons(spec,{assets},layout),[]);
  assert(v60PendingReasons(spec,{assets:assets.slice(0,3)},layout).some(reason=>reason.includes('life-03')));
  assert(v60PendingReasons(spec,{assets:[...assets,assets[0]]},layout).some(reason=>reason.includes('duplicate')));
});

test('source metadata keeps invented exhibitions separate from attested works and rejects false exactness',()=>{
  for(const number of [164,165,166,167,168,172,173,174,175,176,177,182,183,184,185,186]){
    const spec=plan.stages.find(s=>s.number===number),meta=v60SourceMetadata(spec,{},V60_COMPOSITION_PROFILES[number]);
    assert.equal(meta.kind,'original');assert.equal(meta.referenceStatus,'original-exhibition');assert.deepEqual(meta.dedicatedFighters,[]);assert.match(meta.sourceClaim,/non certifiée/);
  }
  const spec=plan.stages.find(s=>s.number===170),meta=v60SourceMetadata(spec,{sourceUrls:['https://www.dc.com/collection','https://github.com/example','https://en.wikipedia.org/example']},V60_COMPOSITION_PROFILES[170]);
  assert.equal(meta.kind,'comic');assert.equal(meta.referenceStatus,'work-setting');assert(!meta.sourceUrls.some(url=>url.includes('github')||url.includes('wikipedia')));
});

test('V60 output rejects unrelated public paths before touching either disk junction',async()=>{
  for(const file of ['/game/sprites/v55/pit-arenas/arena-162-x/p0.png','/game/sprites/v60/pit-life/../../secret.png','C:/secret.png','/game/sprites/v60/pit-life/arena-162-x/file.jpg'])await assert.rejects(()=>resolveV60Destination(file));
});

test('source caveats retain arrays and conditional-event limits instead of losing provenance',()=>{
  const receipt={sourceClaims:['Setting confirmed.','Geometry adapted.'],sourceEvidence:'Primary source names the tournament only.',loreLimits:['Named Hydra not reproduced.','Victory reaction remains conditional and unimplemented.']};
  const meta=v60SourceMetadata(plan.stages[0],receipt,V60_COMPOSITION_PROFILES[162]);
  assert.deepEqual(meta.sourceClaims,receipt.sourceClaims);assert.deepEqual(meta.sourceEvidence,[receipt.sourceEvidence]);assert.deepEqual(meta.loreLimits,receipt.loreLimits);
  for(const statement of [...receipt.sourceClaims,receipt.sourceEvidence,...receipt.loreLimits])assert(meta.sourceClaim.includes(statement));
  assert(!meta.sourceClaim.includes('[object Object]'));
  const ceremonial=v60SourceMetadata(plan.stages.find(s=>s.number===165),{},V60_COMPOSITION_PROFILES[165]);
  assert(ceremonial.sourceClaim.includes('E77'));assert(ceremonial.sourceClaim.includes('n’est pas implémenté'));
});

test('faint edge exceptions need measured local review and never hide strong clipped pixels',async()=>{
  const directory='work-local/v60/test-fixtures';await fs.mkdir(directory,{recursive:true});
  const fixture=async(alpha)=>{
    const raw=Buffer.alloc(1536*1024*4);
    for(let i=0;i<6;i++){
      const left=i%3*512,top=Math.floor(i/3)*512;
      for(let y=100;y<110;y++)for(let x=100;x<110+i;x++){const offset=((top+y)*1536+left+x)*4;raw[offset]=180;raw[offset+3]=255;}
      const edge=(top*1536+left+255)*4;raw[edge]=80;raw[edge+3]=alpha;
    }
    const file=`${directory}/synthetic-edge-${alpha}.png`;
    await sharp(raw,{raw:{width:1536,height:1024,channels:4}}).png().toFile(file);return file;
  };
  const faint=await fixture(3),strong=await fixture(17),review={maxAlpha:3,silhouetteAlpha32Reviewed:true,notes:'Synthetic measured halo review for regression test only.'};
  await assert.rejects(()=>measureV60Life({},faint));
  const frames=await measureV60Life({},faint,review);assert(frames.every(frame=>frame.alphaBounds[1]===0),'Keep raw alpha>2 bounds, do not erase faint pixels');
  await assert.rejects(()=>measureV60Life({},faint,{...review,silhouetteAlpha32Reviewed:false}));
  await assert.rejects(()=>measureV60Life({},strong,{...review,maxAlpha:16}));
  await assert.rejects(()=>measureV60Life({},strong,{...review,maxAlpha:17}),'Cannot relax global limit by supplying a larger local number');
});

test('promotion requires18 distinct actual native drawings and review tied to exact pixels and placements',()=>{
  const stage={number:162,catalogueId:'arena-162-test',planes:[]},life={stageId:stage.catalogueId,events:[]},digest=v60CompositionDigest(stage,life);
  const scenario={planes:['P0','P1','P2','P3','P4','P5'],missing:[],unchangedState:true,unchangedCamera:true,fighters:[true,true],groundedPropsVerified:true,floorCoversScreen:true,hangingPropsAnchored:true,lifeActors:3,lifeAttachmentsStable:true};
  const renderer={result:'PASS',arenaId:stage.catalogueId,compositionDigest:digest,loaded:{independentKit:true,images:7,expectedImages:7,failed:[]},errors:[],failedRequests:[],mobileNoOverflow:true,
    scenarios:Array.from({length:8},(_,i)=>({name:'view-'+i,...scenario})),nativeEventFrames:Array.from({length:18},(_,i)=>({eventId:'life-'+Math.floor(i/6),nativeFrame:i%6})),floorEvidence:[{minimumRowOpaqueRatio:1}]};
  const review={accepted:true,compositionDigest:digest,captures:['center.png','wide.png','left.png'],notes:'Three exact composed screenshots visually inspected and accepted.'};
  assert.equal(validateV60Promotion(stage,life,renderer,review),digest);
  for(const mutate of [r=>r.nativeEventFrames.pop(),r=>r.nativeEventFrames[1]=r.nativeEventFrames[0],r=>r.scenarios[0].lifeActors=2,r=>r.scenarios[1].lifeAttachmentsStable=false,r=>r.scenarios[2].floorCoversScreen=false,r=>r.compositionDigest='old',r=>r.loaded.failed.push('native.png')]){const copy=clone(renderer);mutate(copy);assert.throws(()=>validateV60Promotion(stage,life,copy,review));}
  assert.throws(()=>validateV60Promotion(stage,life,renderer,{...review,accepted:false}));
  assert.notEqual(v60CompositionDigest(stage,{...life,events:[{src:'changed.png'}]}),digest);
});
