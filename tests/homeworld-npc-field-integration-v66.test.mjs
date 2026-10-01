import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const api=homeworldQaModelV64(process.cwd(),['homeworldExpedition.ts','glassDesert.ts','homeworld.ts','homeworldInteriorsV64.ts','homeworldNpcMissionsV66.ts','../save.ts']);
const source=await readFile(new URL('../app/game/GameClient.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,environment){
 let implementation;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)implementation=node.initializer.arguments[0];ts.forEachChild(node,visit);}
 visit(tree);assert(implementation,'Actual GameClient callback '+name);
 const javascript=ts.transpileModule(`const handler=${implementation.getText(tree)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return runInNewContext(`(()=>{${javascript};return handler;})()`,environment);
}

// Input routes use the actual field engines. No actor/objective teleport or flag
// assignment is used. These are engine integrations, NOT browser expeditions.
function playAsh(secret=true,delay=0){
 let state=api.createAshExpedition();
 const step=(input={},ticks=1)=>{for(let i=0;i<ticks;i++)state=api.stepAshExpedition(state,i?{...input,jumpPressed:false}:input);};
 const walk=x=>{for(let i=0;i<700&&Math.abs(state.actor.x-x)>3;i++)step({moveX:Math.sign(x-state.actor.x)});assert(Math.abs(state.actor.x-x)<=3,'Ash walking target '+x);};
 const jump=x=>{step({jumpPressed:true,moveX:Math.sign(x-state.actor.x)});for(let i=0;i<150&&!state.actor.grounded;i++)step({moveX:Math.abs(x-state.actor.x)>3?Math.sign(x-state.actor.x):0});assert(state.actor.grounded);};
 step({},delay);walk(450);step({scanPressed:true,interactPressed:true});jump(470);walk(555);jump(690);walk(780);jump(980);
 if(secret)step({interactPressed:true});walk(1120);step({},80);walk(1080);step({scanPressed:true,interactPressed:true});
 walk(1390);step({interactPressed:true});walk(1450);jump(1640);jump(1740);step({},500);assert.equal(state.obstacleMoved,true);
 walk(2360);jump(2530);step({interactPressed:true});walk(2770);step({interactPressed:true});walk(3040);step({interactPressed:true});
 assert.equal(state.falls,0);assert.equal(api.nearestAshPoint(state)?.id,'extraction');const proof=api.ashMarchesCompletion(state);assert(proof);assert.equal(proof.secretFound,secret);return proof;
}
function playGlass(secret=false,previous=null){
 let state=api.createGlassDesertExpedition(previous);
 const tick=input=>{state=api.stepGlassDesert(state,input);};
 const walk=x=>{for(let n=0;n<8000;n++){if(Math.abs(state.actor.x-x)<3&&state.actor.grounded)return;tick({moveX:Math.abs(state.actor.x-x)<3?0:Math.sign(x-state.actor.x),careful:true});}throw Error('Glass walking target '+x);};
 const jump=()=>{tick({moveX:1,jumpPressed:true});for(let n=0;n<120;n++){if(state.actor.grounded)return;tick({moveX:1});}throw Error('Glass jump');};
 const inspect=()=>tick({scanPressed:true,interactPressed:true});
 walk(320);inspect();walk(1200);tick({interactPressed:true});state=api.chooseGlassRoute(state,'stepping-stones');
 walk(1350);jump();jump();walk(1740);tick({interactPressed:true});walk(2310);inspect();
 if(secret){walk(2340);jump();walk(2480);jump();walk(2640);tick({interactPressed:true});}
 walk(2760);inspect();state=api.chooseGlassBeacon(state,'disable');walk(2890);tick({interactPressed:true});walk(3450);tick({interactPressed:true});
 assert.equal(state.falls,0);assert.equal(api.nearestGlassPoint(state)?.id,'extraction');const proof=api.glassDesertCompletion(state);assert(proof);assert.equal(proof.secretFound,secret);return proof;
}
const oldAsh=playAsh(true),freshAsh=playAsh(false,80),oldGlass=playGlass(true),freshGlass=playGlass(false,oldGlass);
assert.notDeepEqual(oldAsh,freshAsh);assert.notDeepEqual(oldGlass,freshGlass);
const room=api.homeworldInteriorForBuildingV64('clan-lodge'),socket=room.points.find(p=>p.pointId==='medbay-service');
const giver={autonomousHunter:true,interiorId:room.buildingId,pointId:socket.pointId,npcId:'clan-healer',actor:{x:socket.x,y:socket.y+45}};
function fixture(){
 const original=api.defaultSave('2026-09-20T12:00:00.000Z');original.homeworld.evidenceIds=['suspect-trophy'];
 original.homeworld.expeditions={'ash-marches':oldAsh,'glass-desert':oldGlass};
 const values=new Map(),writes=[];let reject=false,durable;
 const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem(key,value){if(reject&&key==='field')throw new DOMException('QA refusal','QuotaExceededError');values.set(key,value);}};
 durable=api.writeSaveWithStatus(original,storage,'field').save;
 const env={...api,saveRef:{current:durable},expeditionOwnerRef:{current:durable.createdAt},setToast(){},
  persistHomeworldProgress(homeworld){const result=api.writeSaveWithStatus({...durable,homeworld},storage,'field');writes.push(result.persisted);if(result.persisted)durable=env.saveRef.current=result.save;return result.persisted;},
 };
 const submitNpc=action=>{const result=api.applyNpcMissionsV66(durable.homeworld.npcMissionsV66,action,giver);assert(result.ok);if(result.changed)assert(env.persistHomeworldProgress({...durable.homeworld,npcMissionsV66:result.state}));};
 return{env,storage,writes,submitNpc,setRejected(value){reject=value;},completeAsh:callback('completeHomeworldExpedition',env),completeGlass:callback('completeGlassDesert',env),get durable(){return durable;}};
}
for(const [region,method,proof]of [['ash-marches','completeAsh',freshAsh],['glass-desert','completeGlass',freshGlass]]){
 test(`${region}: actual GameClient completion does not credit a request that was not accepted`,()=>{
  const f=fixture(),before=structuredClone(f.durable.homeworld.npcMissionsV66);
  assert.equal(f[method](proof).persisted,true);assert.deepEqual(f.durable.homeworld.npcMissionsV66,before);
  assert.deepEqual(api.loadSave(f.storage,'field').homeworld.npcMissionsV66,before);
 });
 test(`${region}: fresh engine proof, not aggregate history, is atomically acknowledged once`,()=>{
  const f=fixture();f.submitNpc({kind:'accept',missionId:'return-paths-ash'});
  assert.equal(f.durable.homeworld.npcMissionsV66.ash.report,null,'Old campaign report cannot auto-fill the new request');
  if(region==='glass-desert'){
   assert.equal(f.completeAsh(freshAsh).persisted,true);f.submitNpc({kind:'debrief',missionId:'return-paths-ash',answer:'shortcut-confirmed'});
   f.submitNpc({kind:'accept',missionId:'return-paths-glass'});assert.equal(f.durable.homeworld.npcMissionsV66.glass.report,null);
  }
  const before=structuredClone(f.durable),bytes=f.storage.getItem('field');f.setRejected(true);
  assert.equal(f[method](proof).persisted,false);assert.equal(f.storage.getItem('field'),bytes);assert.deepEqual(f.durable,before);
  f.setRejected(false);assert.equal(f[method](proof).persisted,true);
  const key=region==='ash-marches'?'ash':'glass',mission=f.durable.homeworld.npcMissionsV66[key];
  assert.deepEqual(mission.report,proof,'Mission preserves this run, not the historical secret/timing union');assert.equal(mission.delivered,false);
  assert.equal(mission.report.secretFound,false);assert.equal(f.durable.homeworld.expeditions[region].secretFound,true,'Historical region discovery is retained separately');
  assert.deepEqual(api.loadSave(f.storage,'field').homeworld,f.durable.homeworld);
  assert.equal(f[method](region==='ash-marches'?oldAsh:oldGlass).persisted,true);
  assert.deepEqual(f.durable.homeworld.npcMissionsV66[key].report,proof,'Later revisit cannot replace the first accepted mission report');
  for(const field of ['profile','inventory','trophies','justice','loadout'])assert.deepEqual(f.durable[field],before[field]);
 });
 test(`${region}: stale owner and incomplete current proof cannot save or credit the mission`,()=>{
  const f=fixture();f.submitNpc({kind:'accept',missionId:'return-paths-ash'});const bytes=f.storage.getItem('field'),count=f.writes.length;
  f.env.expeditionOwnerRef.current='another-owner';assert.equal(f[method](proof).persisted,false);
  f.env.expeditionOwnerRef.current=f.durable.createdAt;
  assert.equal(f[method]({...proof,ticks:0}).persisted,false);
  assert.equal(f.storage.getItem('field'),bytes);assert.equal(f.writes.length,count);
 });
}
