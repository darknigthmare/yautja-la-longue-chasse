import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldCartographyV105.ts');
const schema=qa.load('app/game/systems/homeworldCartographyLedgerV105.ts'),defs=qa.load('app/game/systems/homeworldCartographyDefinitionV105.ts');
const old=qa.load('app/game/systems/homeworldCartographyV104.ts'),oldSchema=qa.load('app/game/systems/homeworldCartographyLedgerV104.ts');
const civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts'),nav=qa.load('app/game/systems/homeworldNavigationV77.ts');
const saveApi=qa.load('app/game/save.ts'),progressApi=qa.load('app/game/systems/homeworld.ts');
const b=defs.HOMEWORLD_CARTOGRAPHY_V105,owner='2026-10-23T10:00:00.000Z',observation='2026-10-23T10:16:30.000Z';
const context=(actor=b.post,levelId='0',patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:actor.x,y:actor.y},levelId,visitedDistrictIds:['port'],active:true,now:observation,...patch});
const act=(ledger,action,ctx=context())=>{const r=api.applyCartographyActionV105(ledger,action,ledger?.revision??0,ctx);assert(r.ok,r.message);return r.ledger;};
const started=()=>['choose-a','reply','start'].reduce((l,a)=>act(l,a),undefined);
const actorAt=p=>({...world.createHomeworldWorldActorV77(),...p,vx:0,vy:0});
function walk(ledger,actor,level,target){
 const route=nav.homeworldWalkRouteV77(level,actor,target);assert.equal(route.status,'reachable','real route exists');
 for(const point of route.points.slice(1)){
  for(let i=0;i<1600&&Math.hypot(point.x-actor.x,point.y-actor.y)>6;i++){
   const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
   actor=civic.stepHomeworldCivicActorV80(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,level);
   const sample=api.sampleCartographyWalkV105(ledger,before,actor,1/60,context(actor,level));assert.equal(sample.invalid,false,'real native movement '+JSON.stringify({point,actor}));ledger=sample.ledger;
  }
  assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=6,'native route approach '+JSON.stringify({point,actor}));
 }
 assert(schema.normalizeHomeworldCartographyV105(ledger),'walk ledger remains importable');return{ledger,actor};
}
function stairs(ledger,actor,level){
 let ride=world.beginHomeworldTransitV77(level,actor);assert(ride&&ride.connectorId===b.connectorId);
 for(let i=0;i<600;i++){
  const before=ride,out=world.stepHomeworldTransitV77(ride,actor,1/60);actor=out.actor;ride=out.transit;
  if(out.done){const sample=api.sampleCartographyTransitV105(ledger,before,{x:actor.x,y:actor.y,levelId:out.levelId},1/60,context(actor,out.levelId));assert.equal(sample.invalid,false);ledger=sample.ledger;assert(schema.normalizeHomeworldCartographyV105(ledger));return{ledger,actor,level:out.levelId};}
 }
 throw Error('real stairs must arrive');
}
let shared;
function reached(){
 if(shared)return structuredClone(shared);
 let ledger=started(),actor=actorAt(b.post),level='0';
 ({ledger,actor}=walk(ledger,actor,level,b.lower));({ledger,actor,level}=stairs(ledger,actor,level));({ledger,actor}=walk(ledger,actor,level,b.highPoint));
 shared={ledger,actor,level};return structuredClone(shared);
}
function dated(){let{ledger,actor,level}=reached();for(const a of['compare-first','compare-second','date'])ledger=act(ledger,a,context(actor,level));return{ledger,actor,level};}
let completed;
function returned(){
 if(completed)return structuredClone(completed);
 let{ledger,actor,level}=dated();({ledger,actor}=walk(ledger,actor,level,b.upper));({ledger,actor,level}=stairs(ledger,actor,level));({ledger,actor}=walk(ledger,actor,level,b.post));
 ledger=act(ledger,'report',context(actor,level));completed={ledger,actor,level};return structuredClone(completed);
}

test('V105 binds the exact source A action, choice and response while retaining the eight-line V104 extraction',()=>{
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_OPTION_V105.address,'Choix et actions V6!A806:I806');
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_OPTION_V105.action,'Atteindre le point haut, comparer les deux repères puis dater le relevé.');
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_LINES_V105.find(l=>l.kind==='CHOIX').text,'Je complète le relevé depuis le point haut.');
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_LINES_V105.find(l=>l.kind==='REPONSE').text,'Garde l’heure de ton observation. Une route peut changer après ton passage.');
 assert(!defs.HOMEWORLD_CARTOGRAPHY_LINES_V105.some(l=>l.kind==='OUV'),'unrepresented original ridge is not quoted as a visible local feature');
 assert.equal(old.cartographyServicePresentV104(),true);assert(civic.homeworldCivicWalkableV80('+1',b.highPoint));
 const bearings=defs.cartographyBearingsV105();assert(bearings.every(p=>p.distance>1400&&p.distance<2000));assert.notEqual(bearings[0].bearing,bearings[1].bearing);
});

test('V105 walks the real city, the eight-second Council stairs and the actual upper viaduct before earning observation',()=>{
 const {ledger,actor,level}=reached();assert.equal(level,'+1');assert.equal(ledger.receipt.phase,'observing');assert(ledger.receipt.walked>8000);
 assert.equal(ledger.receipt.crossings.length,1);assert.equal(ledger.receipt.crossings[0].reverse,false);assert.equal(ledger.receipt.compared,0);assert.equal(ledger.receipt.observedAt,null);
 assert(api.cartographyHighPointReachedV105(context(actor,level)));assert(schema.normalizeHomeworldCartographyV105(JSON.parse(JSON.stringify(ledger))));
});

test('V105 comparison is ordered, requires the physical high point and retains the actual observation time',()=>{
 let {ledger,actor,level}=reached();const initial=JSON.stringify(ledger);
 for(const [action,ctx]of[['compare-second',context(actor,level)],['date',context(actor,level)],['compare-first',context(b.post)],['compare-first',context(actor,level,{active:false})],['compare-first',context(actor,level,{currentOwnerCreatedAt:'2026-10-22T10:00:00.000Z'})]])assert.equal(api.applyCartographyActionV105(ledger,action,ledger.revision,ctx).changed,false);
 assert.equal(JSON.stringify(ledger),initial);
 ledger=act(ledger,'compare-first',context(actor,level));assert.equal(ledger.receipt.compared,1);
 assert.equal(api.applyCartographyActionV105(ledger,'date',ledger.revision,context(actor,level)).changed,false);
 ledger=act(ledger,'compare-second',context(actor,level));assert.equal(ledger.receipt.observedAt,null);
 ledger=act(ledger,'date',context(actor,level));assert.equal(ledger.receipt.observedAt,observation);assert.equal(ledger.receipt.phase,'return');
 assert.equal(api.applyCartographyActionV105(ledger,'report',ledger.revision,context(actor,level)).changed,false);
});

test('V105 a completed survey requires the real descent and walked return to the source speaker',()=>{
 const{ledger,actor}=returned();assert.equal(ledger.receipt.phase,'completed');assert(ledger.receipt.walked>16000);assert.equal(ledger.receipt.observedAt,observation);
 assert.equal(ledger.receipt.crossings.length,2);assert.equal(ledger.receipt.crossings[1].reverse,true);assert.equal(ledger.receipt.crossings[1].afterObservation,true);assert(Math.hypot(actor.x-b.post.x,actor.y-b.post.y)<8);
 assert.equal(api.applyCartographyActionV105(ledger,'report',ledger.revision,context(actor)).changed,false);assert.equal(api.applyCartographyActionV105(ledger,'choose-a',ledger.revision,context(actor)).changed,false);
});

test('V105 movement and stairs reject floor swaps, teleports, fabricated duration and a stale source endpoint',()=>{
 const ledger=started(),before={...b.post},after={x:before.x+2,y:before.y};
 for(const [p,dt,patch]of[[b.highPoint,1/60,{}],[after,1,{}],[after,1/60,{levelId:'+1'}],[after,1/60,{active:false}],[after,1/60,{ownerCreatedAt:'2026-10-22T10:00:00.000Z',currentOwnerCreatedAt:'2026-10-22T10:00:00.000Z'}],[after,1/60,{otherOperationActive:true}],[{x:NaN,y:5190},1/60,{}]])assert.equal(api.sampleCartographyWalkV105(ledger,before,p,dt,context(p,'0',patch)).invalid,true);
 const reachedLedger=reached().ledger,ride={connectorId:b.connectorId,reverse:true,elapsed:7.99,sourceLevel:'+1',source:b.upper};
 assert.equal(api.sampleCartographyTransitV105(reachedLedger,ride,{...b.lower,levelId:'0'},1/60,context(b.lower)).invalid,true,'being on another floor cannot stand in for a complete walk to the stair socket');
 const fake=structuredClone(ledger);fake.receipt.last={...b.lower,levelId:'0'};
 for(const patch of[{elapsed:0},{connectorId:'clan-lift'},{sourceLevel:'+1'},{source:{x:4500,y:3000}}])assert.equal(api.sampleCartographyTransitV105(fake,{connectorId:b.connectorId,reverse:false,elapsed:7.99,sourceLevel:'0',source:b.lower,...patch},{...b.upper,levelId:'+1'},1/60,context(b.upper,'+1')).invalid,true);
 assert.equal(api.sampleCartographyWalkV105(ledger,before,before,0,context()).invalid,false);
});

test('V105 interruption and reload preserve comparison, time and last safe floor without replaying actions',()=>{
 for(const original of[reached(),dated()]){
  const {actor,level}=original,pause=act(original.ledger,'interrupt',context(actor,level,{active:false})),bytes=JSON.stringify(pause),parsed=schema.normalizeHomeworldCartographyV105(JSON.parse(bytes));assert(parsed);
  assert.equal(parsed.receipt.phase,'interrupted');assert.equal(parsed.receipt.compared,original.ledger.receipt.compared);assert.equal(parsed.receipt.observedAt,original.ledger.receipt.observedAt);
  assert.equal(api.applyCartographyActionV105(parsed,'resume',parsed.revision-1,context(actor,level)).changed,false);
  assert.equal(api.applyCartographyActionV105(parsed,'resume',parsed.revision,context(b.post)).changed,false);
  const resumed=act(parsed,'resume',context(actor,level));assert.equal(resumed.receipt.phase,original.ledger.receipt.phase);assert.equal(resumed.receipt.walked,original.ledger.receipt.walked);assert.equal(JSON.stringify(pause),bytes);
 }
});

test('V105 a refused durable action never publishes choice, comparison, date or success and stale callbacks cannot overwrite it',()=>{
 for(const [original,action,ctx]of[[undefined,'choose-a',context()],[reached().ledger,'compare-first',context(reached().actor,'+1')],[act(act(reached().ledger,'compare-first',context(reached().actor,'+1')),'compare-second',context(reached().actor,'+1')),'date',context(reached().actor,'+1')]]){
  let ledger=original,allow=false,writes=0;const transact=api.createCartographyTransactionV105(()=>ledger,()=>ctx,next=>{writes++;if(!allow)return false;ledger=next;return true;}),before=JSON.stringify(ledger);
  const result=transact(action,ledger?.revision??0);assert.equal(result.writeRefused,true);assert.equal(JSON.stringify(ledger),before);assert.equal(writes,1);
  allow=true;assert(transact(action,ledger?.revision??0).ok);assert.equal(transact(action,(ledger?.revision??0)-1).changed,false);assert.equal(writes,2);
 }
 assert.equal(api.applyCartographyActionV105(undefined,'choose-a',0,context(b.post,'0',{otherOperationActive:true})).changed,false);
});

test('V105 the optional save ledger preserves old saves and V104 B and grants no rewards or permissions',()=>{
 const legacy=saveApi.defaultSave(owner);assert.equal(Object.hasOwn(legacy.homeworld,'cartographyV105'),false);assert.equal(Object.hasOwn(progressApi.defaultHomeworldProgress(),'cartographyV105'),false);assert(saveApi.parseSaveImport(saveApi.exportSave(legacy)).save);
 const save=saveApi.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];save.homeworld.cartographyV105=returned().ledger;
 const baseline=saveApi.normalizeSave(save),parsed=saveApi.parseSaveImport(saveApi.exportSave(save));assert(parsed.save,parsed.failure);assert.deepEqual(parsed.save.homeworld.cartographyV105,save.homeworld.cartographyV105);
 for(const key of['profile','inventory','loadout','appearance','trophies','missionProgress'])assert.deepEqual(parsed.save[key],baseline[key]);
 const visit=progressApi.applyHomeworldAction(parsed.save.homeworld,{type:'visit',districtId:'market'},{rankId:parsed.save.profile.rankId,ownedTrophyCount:0});assert(visit.ok);assert.deepEqual(visit.progress.cartographyV105,save.homeworld.cartographyV105);
 const bSave=saveApi.defaultSave(owner);bSave.homeworld.visitedDistrictIds=['port'];bSave.homeworld.cartographyV104=old.applyCartographyActionV104(oldSchema.defaultHomeworldCartographyV104(owner),'choose-b',0,context()).ledger;
 const before=JSON.stringify(bSave.homeworld.cartographyV104),bParsed=saveApi.parseSaveImport(saveApi.exportSave(bSave));assert(bParsed.save);assert.equal(JSON.stringify(bParsed.save.homeworld.cartographyV104),before);assert.equal(Object.hasOwn(bParsed.save.homeworld,'cartographyV105'),false);
 const aThenB=structuredClone(save);aThenB.homeworld.cartographyV104=bSave.homeworld.cartographyV104;const two=saveApi.parseSaveImport(saveApi.exportSave(aThenB));assert(two.save,two.failure);assert.equal(two.save.homeworld.cartographyV105.receipt.phase,'completed');assert.equal(two.save.homeworld.cartographyV104.receipt.phase,'choice');assert.deepEqual(two.save.homeworld.cartographyV105,save.homeworld.cartographyV105);
});

test('V105 strict import rejects future, foreign, extra, contradictory, missing-high-point and forged-completion receipts without replacing bytes',()=>{
 const good=saveApi.defaultSave(owner);good.homeworld.visitedDistrictIds=['port'];good.homeworld.cartographyV105=reached().ledger;
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};assert(saveApi.writeSaveWithStatus(good,storage,'high-point').persisted);const before=[...values];
 const invalid=[s=>s.homeworld.cartographyV105=null,s=>s.homeworld.cartographyV105.ownerCreatedAt='2026-10-22T10:00:00.000Z',s=>s.homeworld.cartographyV105.receipt.reward=1,s=>s.homeworld.cartographyV105.receipt.highPoint=null,s=>s.homeworld.cartographyV105.receipt.crossings=[],s=>s.homeworld.cartographyV105.receipt.compared='1',s=>s.homeworld.cartographyV105.receipt.phase='completed',s=>s.homeworld.cartographyV105.receipt.sourceSha256='0'.repeat(64),s=>s.homeworld.visitedDistrictIds=[]];
 for(const change of invalid){const bad=structuredClone(good);change(bad);assert.equal(saveApi.parseSaveImport(JSON.stringify(bad)).failure,'invalid-save');assert.equal(saveApi.writeSaveWithStatus(bad,storage,'high-point').persisted,false);assert.deepEqual([...values],before);}
 const future=structuredClone(good);future.homeworld.cartographyV105.version=2;assert.equal(saveApi.parseSaveImport(JSON.stringify(future)).failure,'future-version');
 const contradictory=structuredClone(good);contradictory.homeworld.cartographyV104=old.applyCartographyActionV104(undefined,'choose-b',0,context()).ledger;assert.equal(saveApi.parseSaveImport(JSON.stringify(contradictory)).failure,'invalid-save');
});

test('V105 real React dialogs expose exact source A, two known objects, date, preserved B and retry outside all pre-walk phases',()=>{
 const ui=qa.load('app/game/HomeworldCartographyV105.tsx');
 const props={disabled:false,message:'',legacyMessage:'',onAction(){},onLegacyAction(){},onClose(){}};
 const choice=act(undefined,'choose-a'),html=qa.render('app/game/HomeworldCartographyV105.tsx',{...props,ledger:choice});assert(html.includes('D6-W-PNJ-ROLE-12-CHOIX-A-01'));
 const observationHtml=renderToStaticMarkup(createElement(ui.HomeworldCartographyObservationV105,{...props,ledger:reached().ledger}));assert.equal((observationHtml.match(/data-cartography-known-object=/g)??[]).length,2);assert(observationHtml.includes('Comparer le bac de basalte'));assert(!observationHtml.includes('Dater l’observation'));
 const completedHtml=qa.render('app/game/HomeworldCartographyV105.tsx',{...props,ledger:returned().ledger});assert(completedHtml.includes(observation));assert(completedHtml.includes('D6-W-PNJ-ROLE-12-SUCCES---01'));
 assert(completedHtml.includes('Tracer une route entre les points connus'),'A completed exposes the ordinary B choice');assert(!completedHtml.includes('Le point haut reste à explorer'));
 const legacy=old.applyCartographyActionV104(undefined,'choose-b',0,context()).ledger,bHtml=qa.render('app/game/HomeworldCartographyV105.tsx',{...props,legacy});assert(bHtml.includes('D6-W-PNJ-ROLE-12-CHOIX-B-01'));assert(!bHtml.includes('data-cartography-scene-v105'));
 const bAfterAHtml=qa.render('app/game/HomeworldCartographyV105.tsx',{...props,legacy,ledger:returned().ledger});assert(bAfterAHtml.includes('D6-W-PNJ-ROLE-12-CHOIX-B-01'));assert(!bAfterAHtml.includes('data-cartography-scene-v105'));
 for(const ledger of[undefined,choice,act(choice,'reply')]){const journal=renderToStaticMarkup(createElement(ui.HomeworldCartographyJournalV105,{ledger,blocked:true,message:'Écriture indisponible.',writePaused:true,onResume(){},onRetry(){},onObserve(){},canObserve:false}));assert(journal.includes('Réessayer l’enregistrement du point haut'));assert(!journal.includes('disabled=""'));assert(!journal.includes('Deux repères comparés'));}
});
