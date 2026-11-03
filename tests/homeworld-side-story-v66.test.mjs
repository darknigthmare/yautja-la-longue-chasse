import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './app/game/systems/homeworldSideStoryV66';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const fresh=api.defaultHomeworldSideStoryV66;
const journal=s=>api.homeworldSideStoryV66Journal(s);
const apply=(s,a,point=journal(s).pointId,eligible=true)=>api.applyHomeworldSideStoryV66(s,a,{pointId:point,eligible});
const branchActions=resolution=>[{kind:'accept'},...api.SIDE_STORY_CLUES_V66.map(clue=>({kind:'inspect',clueId:clue.id})),{kind:'read-archive'},
 {kind:'sequence',order:api.SIDE_STORY_RECORDS_V66.map(record=>record.id)},{kind:'deduce',conclusion:'unverified-claim'},{kind:'listen'},
 {kind:'choose',resolution},resolution==='supervised-correction'?{kind:'correct',origin:'training',status:'unverified'}:{kind:'file',scope:'documented-claim-only'},
 {kind:'close'}];
function reach(count,resolution='supervised-correction') {let state=fresh();for(const action of branchActions(resolution).slice(0,count)){const result=apply(state,action);assert(result.ok&&result.changed);state=result.state;}return state;}

test('old saves start empty, cloned normalization never invents rewards or mutates its source',()=>{
 const a=fresh(),b=fresh();a.clues.push('casting-seam');assert.deepEqual(b.clues,[]);
 assert.deepEqual(api.normalizeHomeworldSideStoryV66(undefined),b);
 const valid=reach(4),serialized=JSON.stringify(valid),normalized=api.normalizeHomeworldSideStoryV66(valid);
 assert.deepEqual(normalized,valid);assert.notStrictEqual(normalized,valid);assert.notStrictEqual(normalized.clues,valid.clues);
 assert.equal(JSON.stringify(valid),serialized);assert.deepEqual(api.HOMEWORLD_SIDE_STORY_V66.rewards,[]);
 assert.equal(api.HOMEWORLD_SIDE_STORY_V66.loreStatus,'original-project-story');
});

for(const resolution of ['supervised-correction','recorded-review'])test(`${resolution}: all11 checkpoints require their actual interlocutor; closure and revisits persist`,()=>{
 let state=fresh();const states=[state];
 for(const action of branchActions(resolution)){
  const before=JSON.stringify(state),destination=journal(state).pointId;
  for(const wrong of [...api.HOMEWORLD_SIDE_STORY_V66.pointIds,null,'memory-service'].filter(id=>id!==destination)){
   const denied=apply(state,action,wrong);assert(!denied.ok&&!denied.changed);assert.deepEqual(denied.state,state);
  }
  for(const eligible of [false,null,undefined,'true',1]){const denied=api.applyHomeworldSideStoryV66(state,action,{pointId:destination,eligible});assert(!denied.ok&&!denied.changed);}
  const result=apply(state,action);assert(result.ok&&result.changed);assert.equal(JSON.stringify(state),before);state=result.state;
  assert(api.isHomeworldSideStoryV66State(state));assert.deepEqual(api.normalizeHomeworldSideStoryV66(JSON.parse(JSON.stringify(state))),state);
  states.push(state);
 }
 assert.equal(journal(state).completed,11);assert.equal(journal(state).step,'complete');assert.equal(state.resolution,resolution);
 assert.match(journal(state).objective,resolution==='supervised-correction'?/reclassée/:/dossier d’examen/);
 for(const action of branchActions(resolution)){const repeated=apply(state,action,'training-service');assert(!repeated.changed);assert.deepEqual(repeated.state,state);}
 assert.equal(journal(states[9]).pointId,resolution==='supervised-correction'?'temple-point':'enforcer-point');
 assert.equal(journal(states[10]).step,'closure');assert.equal(states[10].completed,false,'A branch receipt alone never closes the story');
});

test('out-of-order, unknown and cross-branch actions cannot award any checkpoint',()=>{
 for(const resolution of ['supervised-correction','recorded-review']){
  const actions=branchActions(resolution);for(let i=0;i<actions.length;i++){
   const state=reach(i,resolution);for(const action of actions.slice(i+1).filter(a=>a.kind!==actions[i].kind)){const result=apply(state,action);assert(!result.ok&&!result.changed);assert.deepEqual(result.state,state);}
  }
 }
 const correction=reach(9),review=reach(9,'recorded-review');
 assert(!apply(correction,{kind:'file',scope:'documented-claim-only'}).changed);
 assert(!apply(review,{kind:'correct',origin:'training',status:'unverified'}).changed);
 for(const raw of [null,[],{},'accept',{kind:'teleport'},{kind:'close',grantTrophy:true}])assert(!apply(fresh(),raw).changed);
});

test('inspection can be revisited without duplicate progress and in any order',()=>{
 let state=reach(1);for(const clueId of ['fresh-cut','casting-seam']){const result=apply(state,{kind:'inspect',clueId});assert(result.changed);state=result.state;const repeated=apply(state,{kind:'inspect',clueId});assert(repeated.ok&&!repeated.changed);assert.deepEqual(repeated.state,state);}
 state=apply(state,{kind:'inspect',clueId:'buried-stamp'}).state;assert.deepEqual(state,reach(4));
 assert(!apply(reach(1),{kind:'inspect',clueId:'invented'}).changed);
});

test('chronology, inference and final dossier require correct evidence rather than an arbitrary submit',()=>{
 const order=api.SIDE_STORY_RECORDS_V66.map(record=>record.id),chronology=reach(5);
 for(const candidate of [[],order.slice(0,2),[...order].reverse(),[order[0],order[0],order[2]],null]){const result=apply(chronology,{kind:'sequence',order:candidate});assert(!result.ok&&!result.changed);assert.deepEqual(result.state,chronology);}
 const deduction=reach(6);for(const conclusion of ['artisan-guilty','automatic-bad-blood','unknown'])assert(!apply(deduction,{kind:'deduce',conclusion}).changed);
 const correction=reach(9);for(const [origin,status] of [['hunt','unverified'],['training','earned-trophy'],['hunt','earned-trophy']])assert(!apply(correction,{kind:'correct',origin,status}).changed);
 const review=reach(9,'recorded-review');for(const scope of ['condemn-novice','erase-admission','unknown'])assert(!apply(review,{kind:'file',scope}).changed);
});

test('unknown versions and contradictory imported states are rejected as mutation bases',()=>{
 const bad=[null,{},[],{...fresh(),version:2},{...fresh(),version:0},{...fresh(),clues:['casting-seam']},{...fresh(),archiveRead:true},
  {...fresh(),resolution:'recorded-review'},{...reach(4),clues:['casting-seam','casting-seam','fresh-cut']},{...reach(10),completed:'yes'},
  {...reach(10),unlockedTrophy:'forged'},JSON.parse('{"__proto__":{},"version":1}')];
 for(const state of bad){assert(!api.isHomeworldSideStoryV66State(state));const result=apply(state,{kind:'accept'},'training-service');assert(!result.ok&&!result.changed);assert.deepEqual(api.normalizeHomeworldSideStoryV66(state),fresh());}
});

test('every state accepted by the import validator is reachable by real authored actions',()=>{
 const reachable=new Set(),queue=[fresh()],key=state=>JSON.stringify(api.normalizeHomeworldSideStoryV66(state));
 const actions=[...branchActions('supervised-correction'),...branchActions('recorded-review')];
 while(queue.length){const state=queue.shift(),encoded=key(state);if(reachable.has(encoded))continue;reachable.add(encoded);for(const action of actions){const result=apply(state,action);if(result.changed)queue.push(result.state);}}
 const flags=['accepted','archiveRead','chronologyVerified','deductionVerified','testimonyHeard','branchVerified','completed'];
 for(let bits=0;bits<128;bits++)for(let clueBits=0;clueBits<8;clueBits++)for(const resolution of [null,'supervised-correction','recorded-review']){
  const state={...fresh(),...Object.fromEntries(flags.map((flag,index)=>[flag,Boolean(bits&(1<<index))])),clues:api.SIDE_STORY_CLUES_V66.filter((_,index)=>clueBits&(1<<index)).map(clue=>clue.id),resolution};
  assert.equal(api.isHomeworldSideStoryV66State(state),reachable.has(JSON.stringify(state)),JSON.stringify(state));
 }
 assert.equal(reachable.size,19,'Empty, eight inspection subsets, four shared deductions and three checkpoints per branch');
});
