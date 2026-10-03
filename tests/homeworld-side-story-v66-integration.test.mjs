import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';
import {homeworldInteriorPointFixture} from './helpers/homeworld-interior-point-fixture.mjs';

const bundle=await build({stdin:{contents:`
 export * from './app/game/systems/homeworld';
 export * from './app/game/systems/homeworldWorldV77';
 export * from './app/game/systems/homeworldInteriorsV64';
 export * from './app/game/systems/homeworldSideStoryV66';
 export * from './app/game/systems/homeworldNpcMissionsV66';
 export * from './app/game/systems/clanChronicle';
 export * from './app/game/save';
`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source=await readFile(new URL('../app/game/HomeworldHub.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('HomeworldHub.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,environment){
 let implementation;
 function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name?.getText(tree)===name)implementation=node;
  if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name){
   implementation=ts.isCallExpression(node.initializer)?node.initializer.arguments[0]:node.initializer;
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);assert.ok(implementation,'Execute actual Hub implementation: '+name);
 const compiled=ts.transpileModule(`const handler=${implementation.getText(tree)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return runInNewContext(`(()=>{${compiled};return handler;})()`,environment);
}
function fixture(){
 const values=new Map(),writes=[],notices=[];let reject=false,dialog;
 const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem(key,value){
  if(reject&&key==='v66')throw new DOMException('QA write refusal','QuotaExceededError');values.set(key,value);
 }};
 let durable=api.writeSaveWithStatus(api.defaultSave('2026-09-20T12:00:00.000Z'),storage,'v66').save;
 const env={...api,save:durable,saveRef:{current:durable},progressRef:{current:durable.homeworld},
  actorRef:{current:api.createHomeworldWorldActorV77()},interiorRef:{current:null},dialogStateRef:{current:null},levelRefV77:{current:'0'},
  suspendedRef:{current:false},pausedRef:{current:false},clearInputs(){},setAnnouncement(){},onNotify(value){notices.push(value);},
  setDialog(update){dialog=update(dialog);},onProgress(progress){
   const result=api.writeSaveWithStatus({...durable,homeworld:progress},storage,'v66');writes.push(result.persisted);
   if(result.persisted){durable=result.save;env.saveRef.current=durable;env.save=durable;env.progressRef.current=durable.homeworld;}return result.persisted;
  },
 };
 env.pointInCurrentSpace=callback('pointInCurrentSpace',env);
 env.submitNarrativeV66=callback('submitNarrativeV66',env);
 const select=pointId=>{
  const room=api.homeworldInteriorForPointV64(pointId),socket=room?.points.find(p=>p.pointId===pointId);
  assert.ok(socket,'Real interior socket for '+pointId);env.interiorRef.current=room;
  env.levelRefV77.current=api.HOMEWORLD_BUILDINGS_V77.find(building=>building.id===room.buildingId).levelId;
  // Unit fixture only. Separate browser QA reaches doors and NPCs by walking.
  env.actorRef.current={...env.actorRef.current,...homeworldInteriorPointFixture(api,room,pointId)};
  assert.equal(api.isHomeworldInteriorWalkableV64(room,env.actorRef.current),true);
  const point=env.pointInCurrentSpace(env.actorRef.current,room,env.levelRefV77.current);assert.equal(point?.id,pointId);
  env.dialogStateRef.current=dialog={point};
 };
 return{env,storage,values,writes,notices,select,setRejected(value){reject=value;},get durable(){return durable;},get dialog(){return dialog;}};
}
const sideActions=branch=>[
 {kind:'accept'},...api.SIDE_STORY_CLUES_V66.map(clue=>({kind:'inspect',clueId:clue.id})),
 {kind:'read-archive'},{kind:'sequence',order:['claimed-return','blank-issued','mark-requested']},
 {kind:'deduce',conclusion:'unverified-claim'},{kind:'listen'},{kind:'choose',resolution:branch},
 branch==='supervised-correction'?{kind:'correct',origin:'training',status:'unverified'}:{kind:'file',scope:'documented-claim-only'},
 {kind:'close'},
];
const stableCampaign=save=>Object.fromEntries(Object.entries(save).filter(([key])=>!['updatedAt','homeworld'].includes(key)));
const withoutNarrative=progress=>Object.fromEntries(Object.entries(progress).filter(([key])=>!['sideStoryV66','npcMissionsV66'].includes(key)));

for(const branch of ['supervised-correction','recorded-review'])test(`live Hub and real storage complete ${branch} only after durable acknowledgments`,()=>{
 const f=fixture(),initial=structuredClone(f.durable);f.select('training-service');
 const serialized=f.storage.getItem('v66');f.setRejected(true);
 assert.equal(f.env.submitNarrativeV66('side',{kind:'accept'}).ok,false);
 assert.match(f.dialog.message,/Écriture non confirmée/);assert.deepEqual(f.writes,[false]);
 assert.equal(f.storage.getItem('v66'),serialized);assert.deepEqual(f.env.progressRef.current,initial.homeworld);
 f.setRejected(false);
 for(const [index,action]of sideActions(branch).entries()){
  f.select(api.homeworldSideStoryV66Journal(f.env.progressRef.current.sideStoryV66).pointId);
  assert.equal(f.env.submitNarrativeV66('side',action).ok,true);
  assert.equal(api.homeworldSideStoryV66Journal(f.env.progressRef.current.sideStoryV66).completed,index+1);
  assert.deepEqual(api.loadSave(f.storage,'v66').homeworld,structuredClone(f.env.progressRef.current),'Reload after every checkpoint, across VM prototypes');
 }
 assert.equal(f.writes.length,12);assert.equal(f.durable.homeworld.sideStoryV66.completed,true);
 assert.equal(f.durable.homeworld.sideStoryV66.resolution,branch);
 assert.deepEqual(stableCampaign(f.durable),stableCampaign(initial));
 assert.deepEqual(withoutNarrative(f.durable.homeworld),withoutNarrative(initial.homeworld));
 assert.deepEqual(f.durable.homeworld.npcMissionsV66,initial.homeworld.npcMissionsV66);
 f.env.submitNarrativeV66('side',{kind:'close'});assert.equal(f.writes.length,12);
});

for(const [kind,pointId,action]of[
 ['side','training-service',{kind:'accept'}],
 ['npc','medbay-service',{kind:'accept',missionId:'return-paths-ash'}],
]){
 test(`live ${kind} Hub callback refuses stale, remote, paused, suspended and replaced-owner contexts`,()=>{
  const scenarios={
   wrongNpc:f=>f.select('market-service'),remote:f=>{f.env.actorRef.current.x+=1000;},
   paused:f=>{f.env.pausedRef.current=true;},suspended:f=>{f.env.suspendedRef.current=true;},
   owner:f=>{f.env.save={...f.env.save,createdAt:'another-owner'};},
   noDialog:f=>{f.env.dialogStateRef.current=null;},
   youth:f=>{f.env.saveRef.current={...f.env.saveRef.current,prologue:{chronicle:null}};},
   oldOutside:f=>{const old=api.HOMEWORLD_POINTS.find(p=>p.id===pointId);f.env.interiorRef.current=null;f.env.actorRef.current={...f.env.actorRef.current,x:old.x,y:old.y+45};},
   otherRoom:f=>{const stale=f.env.dialogStateRef.current;f.select('enforcer-point');f.env.dialogStateRef.current=stale;},
  };
  for(const [name,mutate]of Object.entries(scenarios)){
   const f=fixture();f.select(pointId);const initial=structuredClone(f.env.progressRef.current),bytes=f.storage.getItem('v66');mutate(f);
   assert.equal(f.env.submitNarrativeV66(kind,action).ok,false,name);assert.equal(f.writes.length,0,name);
   assert.deepEqual(f.env.progressRef.current,initial,name);assert.equal(f.storage.getItem('v66'),bytes,name);
  }
 });
}

test('live NPC acceptance uses the same durable acknowledgement, does not acquire an old report, and remains independent of the side story',()=>{
 const f=fixture();f.select('medbay-service');const before=structuredClone(f.durable);
 const action={kind:'accept',missionId:'return-paths-ash'};
 f.setRejected(true);assert.equal(f.env.submitNarrativeV66('npc',action).ok,false);
 assert.deepEqual(f.env.progressRef.current,before.homeworld);f.setRejected(false);
 assert.equal(f.env.submitNarrativeV66('npc',action).ok,true);
 assert.deepEqual(f.writes,[false,true]);const loaded=api.loadSave(f.storage,'v66');
 assert.deepEqual(loaded.homeworld.npcMissionsV66.ash,{accepted:true,report:null,delivered:false});
 assert.deepEqual(loaded.homeworld.sideStoryV66,before.homeworld.sideStoryV66);
 assert.deepEqual(stableCampaign(loaded),stableCampaign(before));
 assert.equal(f.env.submitNarrativeV66('npc',{kind:'debrief',missionId:'return-paths-ash',answer:'shortcut-confirmed'}).ok,false);
 f.env.submitNarrativeV66('npc',action);assert.equal(f.writes.length,2);
});

test('live NPC debriefs persist only supported answers and never change the side story or campaign rewards',()=>{
 const f=fixture();f.select('medbay-service');const before=structuredClone(f.durable);
 const reports=[
  {expeditionId:'ash-marches',trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:false,ticks:7250},
  {expeditionId:'glass-desert',terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,crossingRoute:'stepping-stones',beaconDisposition:'preserve',secretFound:false,ticks:11200},
 ];
 for(const [index,missionId]of ['return-paths-ash','return-paths-glass'].entries()){
  assert.equal(f.env.submitNarrativeV66('npc',{kind:'accept',missionId}).ok,true);
  // Validated proof fixture: this test covers the physical debrief callback, not a played expedition.
  const next=api.recordNpcMissionReportV66(f.env.progressRef.current.npcMissionsV66,reports[index]);assert.equal(next.changed,true);
  assert.equal(f.env.onProgress({...f.env.progressRef.current,npcMissionsV66:next.state}),true);
  f.env.progressRef.current=f.durable.homeworld;
  const reportState=structuredClone(f.durable.homeworld.npcMissionsV66),count=f.writes.length;
  assert.equal(f.env.submitNarrativeV66('npc',{kind:'debrief',missionId,answer:'region-harmless'}).ok,false);
  assert.deepEqual(f.durable.homeworld.npcMissionsV66,reportState);assert.equal(f.writes.length,count);
  const action={kind:'debrief',missionId,answer:index?'rock-cornices':'shortcut-confirmed'};
  f.setRejected(true);assert.equal(f.env.submitNarrativeV66('npc',action).ok,false);
  assert.deepEqual(f.durable.homeworld.npcMissionsV66,reportState);f.setRejected(false);
  assert.equal(f.env.submitNarrativeV66('npc',action).ok,true);
  assert.deepEqual(api.loadSave(f.storage,'v66').homeworld.npcMissionsV66,f.durable.homeworld.npcMissionsV66);
 }
 assert.equal(f.durable.homeworld.npcMissionsV66.glass.delivered,true);
 assert.deepEqual(stableCampaign(f.durable),stableCampaign(before));
 assert.deepEqual(f.durable.homeworld.sideStoryV66,before.homeworld.sideStoryV66);
 assert.deepEqual(withoutNarrative(f.durable.homeworld),withoutNarrative(before.homeworld));
});

test('future narrative subversions preserve primary and backup bytes during load, autosave and import',()=>{
 for(const field of ['sideStoryV66','npcMissionsV66']){
  const future=api.defaultSave('2026-09-20T12:00:00.000Z');future.homeworld[field].version=2;
  future.homeworld[field].futureFacts={retain:['exact','bytes']};
  const serialized=JSON.stringify(future),backup=JSON.stringify(api.defaultSave(future.createdAt));
  const values=new Map([['future',serialized],['future.backup',backup]]),writes=[];
  const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem(key,value){writes.push(key);values.set(key,value);}};
  const before=[...values],loaded=api.loadSaveWithStatus(storage,'future');
  assert.equal(loaded.loaded,false);assert.equal(loaded.failure,'future-version');
  assert.equal(api.writeSaveWithStatus(loaded.save,storage,'future').failure,'protected-save');
  assert.equal(api.parseSaveImport(serialized).failure,'future-version');
  assert.equal(api.importSaveWithStatus(serialized,storage,'future').persisted,false);
  assert.deepEqual(writes,[]);assert.deepEqual([...values],before);
 }
});
