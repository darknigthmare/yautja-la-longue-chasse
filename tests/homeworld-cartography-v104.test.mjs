import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldCartographyV104.ts');
const schema=qa.load('app/game/systems/homeworldCartographyLedgerV104.ts'),defs=qa.load('app/game/systems/homeworldCartographyDefinitionV104.ts');
const civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts');
const geometry=qa.load('app/game/systems/homeworldNavigationV77.ts'),visibility=qa.load('app/game/systems/homeworldResidentVisibilityV100.ts');
const saveApi=qa.load('app/game/save.ts'),progressApi=qa.load('app/game/systems/homeworld.ts');
const b=defs.HOMEWORLD_CARTOGRAPHY_V104,owner='2026-10-22T18:00:00.000Z';
const context=(actor=b.post,patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor,levelId:'0',visitedDistrictIds:['port'],active:true,...patch});
function advance(ledger,action,ctx=context()){
 const out=api.applyCartographyActionV104(ledger,action,ledger?.revision??0,ctx);assert(out.ok,out.message);return out.ledger;
}
const started=()=>['choose-b','reply','start'].reduce((ledger,action)=>advance(ledger,action),undefined);
function walkTo(ledger,actor,target){
 for(let i=0;i<1000&&Math.hypot(target.x-actor.x,target.y-actor.y)>8;i++){
  const before=actor;
  const span=Math.max(Math.abs(target.x-actor.x)/330,Math.abs(target.y-actor.y)/260,1/60);
  actor=civic.stepHomeworldCivicActorV80(actor,{moveX:(target.x-actor.x)/(330*span),climb:(target.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
  const out=api.sampleCartographyWalkV104(ledger,before,actor,1/60,context(actor));assert.equal(out.invalid,false,JSON.stringify({actor,target}));ledger=out.ledger;
 }
 assert(Math.hypot(target.x-actor.x,target.y-actor.y)<=8,'real movement must reach this approach '+JSON.stringify({actor,target}));
 return{ledger,actor};
}
function played(){
 let ledger=started(),actor={...b.post,vx:0,vy:0,grounded:true,facing:1};
 for(const point of [...b.waypoints,b.post])({ledger,actor}=walkTo(ledger,actor,point));
 return{ledger,actor};
}

test('V104 cartographer source is an exact authorized V6 extraction, including all eight lines and both distinct options',()=>{
 const bytes=fs.readFileSync('public/game/dialogues/v85/bible-dialogues.json'),corpus=JSON.parse(bytes),source=defs.HOMEWORLD_CARTOGRAPHY_SOURCE_V104;
 assert.equal(source.sourceCorpusSha256,createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(source.source,corpus.source);
 for(const sheet of source.sheets){
  const expected=corpus.sheets.find(s=>s.name===sheet.name).rows.filter(row=>row.cells.some(c=>c.value===b.sceneId));
  assert.deepEqual(sheet.rows,expected);
 }
 assert.deepEqual(source.sheets.map(s=>[s.name,s.rows.length]),[['Scènes de dialogue V6',1],['Répliques V6',8],['Choix et actions V6',2]]);
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_SCENE_V104.address,'Scènes de dialogue V6!A392:Q392');
 assert.equal(defs.HOMEWORLD_CARTOGRAPHY_OPTION_V104.address,'Choix et actions V6!A807:H807');
});

test('V104 cartographer and three approaches use existing native objects and connected visible ground without replacing residents',()=>{
 assert.equal(api.cartographyServicePresentV104(),true);
 assert(!world.HOMEWORLD_RESIDENTS_V77.some(p=>p.id===b.npcId));
 for(const p of[b.host,b.post,...b.waypoints]){
  assert.equal(civic.homeworldCivicWalkableV80('0',p),true);assert.equal(visibility.homeworldResidentOccludedV100('0',p),false);
 }
 const points=[b.post,...b.waypoints,b.post];for(let i=1;i<points.length;i++)assert(geometry.homeworldRouteSegmentV77('0',points[i-1],points[i]));
 assert.equal(world.nearestHomeworldDoorV77('0',b.post),null);assert.equal(world.nearestHomeworldConnectorV77('0',b.post),null);
 assert.equal(api.cartographyPostReachedV104(context()),true);
});

test('V104 cartographer gates the live owner, floor, known district, supported foot approach, availability and scene state',()=>{
 const bad=[{currentOwnerCreatedAt:'2026-10-21T18:00:00.000Z'},{levelId:'+1'},{visitedDistrictIds:[]},{interiorId:'dock-control'},
  {inTransit:true},{active:false},{hostPresent:false},{hostAvailable:false},{servicePresent:false},{actor:{x:NaN,y:5190}},{actor:{x:6200,y:5300}}];
 for(const patch of bad){assert.equal(api.cartographyPostReachedV104(context(b.post,patch)),false,JSON.stringify(patch));assert.equal(api.applyCartographyActionV104(undefined,'choose-b',0,context(b.post,patch)).changed,false);}
});

test('V104 complete option B requires actual movement through both physical approaches and return to the source speaker',()=>{
 const {ledger,actor}=played();assert.equal(ledger.receipt.phase,'return');assert.equal(ledger.receipt.nextWaypoint,2);
 assert(ledger.receipt.walked>650);assert(ledger.receipt.trail.length>20);
 const out=api.applyCartographyActionV104(ledger,'report',ledger.revision,context(actor));assert(out.ok,out.message);assert.equal(out.ledger.receipt.phase,'completed');
 assert(schema.normalizeHomeworldCartographyV104(JSON.parse(JSON.stringify(out.ledger))));
 assert.equal(api.applyCartographyActionV104(out.ledger,'choose-b',out.ledger.revision,context(actor)).changed,false);
 assert.equal(api.applyCartographyActionV104(out.ledger,'report',out.ledger.revision,context(actor)).changed,false);
});

test('V104 buttons cannot grant a waypoint, teleport a route, cross floors, bypass a pause or report from afar',()=>{
 const ledger=started(),frozen=JSON.stringify(ledger);
 for(const [after,seconds,patch] of[[b.waypoints[0],1/60,{}],[b.post,5,{}],[{x:Infinity,y:5190},1/60,{}],[{x:5922,y:5190},1/60,{levelId:'+1'}],[{x:5922,y:5190},1/60,{active:false}]]){
  const out=api.sampleCartographyWalkV104(ledger,b.post,after,seconds,context(after,patch));assert.equal(out.invalid,true);assert.deepEqual(out.ledger,ledger);
 }
 assert.equal(api.sampleCartographyWalkV104(ledger,b.post,b.post,0,context()).invalid,false,'zero initial frame is inert');
 assert.equal(api.applyCartographyActionV104(ledger,'report',ledger.revision,context()).changed,false);
 assert.equal(JSON.stringify(ledger),frozen);
});

test('V104 interruptions preserve the walked prefix and resume only at the recorded safe position for the same owner and revision',()=>{
 const first=walkTo(started(),{...b.post,vx:0,vy:0,grounded:true,facing:1},b.waypoints[0]);
 const paused=advance(first.ledger,'interrupt',context(first.actor,{active:false}));assert.equal(paused.receipt.phase,'interrupted');assert.equal(paused.receipt.nextWaypoint,1);
 const before=JSON.stringify(paused);
 assert.equal(api.applyCartographyActionV104(paused,'resume',paused.revision,context(b.post)).changed,false);
 assert.equal(api.applyCartographyActionV104(paused,'resume',paused.revision-1,context(first.actor)).changed,false);
 assert.equal(api.applyCartographyActionV104(paused,'resume',paused.revision,context(first.actor,{currentOwnerCreatedAt:'2026-10-21T18:00:00.000Z'})).changed,false);
 assert.equal(JSON.stringify(paused),before);
 const resumed=advance(paused,'resume',context(first.actor));assert.equal(resumed.receipt.phase,'walking');assert.equal(resumed.receipt.nextWaypoint,1);assert.equal(resumed.receipt.walked,paused.receipt.walked);
 const near=advance(paused,'resume',context({...first.actor,x:first.actor.x-5}));assert(schema.normalizeHomeworldCartographyV104(near));assert.equal(near.receipt.walked,paused.receipt.walked);assert.equal(near.receipt.trailBreaks.length,1,'unobserved movement near the safe point is not painted as a continuous walked segment');
});

test('V104 the return leg also interrupts safely and resumes as return without losing its two approaches',()=>{
 const {ledger,actor}=played(),interrupted=advance(ledger,'interrupt',context(actor,{active:false}));
 assert.equal(interrupted.receipt.phase,'interrupted');assert.equal(interrupted.receipt.nextWaypoint,2);
 assert(schema.normalizeHomeworldCartographyV104(interrupted));
 const resumed=advance(interrupted,'resume',context(actor));assert.equal(resumed.receipt.phase,'return');assert.equal(resumed.receipt.walked,ledger.receipt.walked);
 const invalid=api.sampleCartographyWalkV104(resumed,actor,{x:actor.x+2,y:actor.y},1/60,context(actor,{levelId:'+1'}));assert.equal(invalid.invalid,true);
 const html=qa.render('app/game/HomeworldCartographyV104.tsx',{ledger:interrupted,disabled:false,message:'',onAction(){},onClose(){}});assert(html.includes('2/2 repères'));
 assert.equal(advance(resumed,'report',context(actor)).receipt.phase,'completed');
});

test('V104 long real walks compact the drawn trace without locking progress, inventing shortcuts or losing the earned approaches',()=>{
 let ledger=started(),actor={...b.post,vx:0,vy:0,grounded:true,facing:1};
 for(let i=0;i<300;i++)({ledger,actor}=walkTo(ledger,actor,{x:i%2===0?6000:5920,y:5190}));
 assert(ledger.receipt.trimmedCount>0);assert(ledger.receipt.trail.length<480);assert.equal(ledger.receipt.nextWaypoint,0);
 assert(schema.normalizeHomeworldCartographyV104(ledger));
 const paused=advance(ledger,'interrupt',context(actor));ledger=advance(paused,'resume',context(actor));
 for(const point of[...b.waypoints,b.post])({ledger,actor}=walkTo(ledger,actor,point));
 assert.equal(advance(ledger,'report',context(actor)).receipt.phase,'completed');
 // Reaching the numeric distance ceiling is inert for progression, too.
 const capped=started();capped.receipt.walked=1_000_000_000;capped.receipt.legWalked=1_000_000_000;
 const next=civic.stepHomeworldCivicActorV80({...b.post,vx:0,vy:0,grounded:true,facing:1},{moveX:1,climb:0,jumpPressed:false},1/60,'0');
 const out=api.sampleCartographyWalkV104(capped,b.post,next,1/60,context(next));assert.equal(out.invalid,false);assert.equal(out.ledger.receipt.walked,1_000_000_000);assert(schema.normalizeHomeworldCartographyV104(out.ledger));
});

test('V104 the actual city transaction cannot publish a choice after a refused write or a stale callback',()=>{
 let ledger,allowed=false,writes=0,ctx=context();
 const transact=api.createCartographyTransactionV104(()=>ledger,()=>ctx,next=>{writes++;if(!allowed)return false;ledger=next;return true;});
 const failed=transact('choose-b',0);assert.equal(failed.ok,false);assert.equal(failed.changed,false);assert.equal(ledger,undefined);assert.equal(writes,1);
 allowed=true;assert(transact('choose-b',0).ok);const before=JSON.stringify(ledger);
 assert.equal(transact('reply',0).changed,false);assert.equal(writes,2);assert.equal(JSON.stringify(ledger),before);
 ctx={...ctx,currentOwnerCreatedAt:'2026-10-21T18:00:00.000Z'};assert.equal(transact('reply',1).changed,false);assert.equal(writes,2);
});

test('V104 imported receipts reject forged waypoint counts, missing paths, future versions, foreign sources and extra fields',()=>{
 const good=started();
 const changes=[l=>{l.version=2;},l=>{l.receipt.nextWaypoint=2;},l=>{l.receipt.trail=[];},l=>{l.receipt.sourceSha256='0'.repeat(64);},l=>{l.receipt.sourceCorpusSha256='0'.repeat(64);},l=>{l.receipt.phase='completed';},l=>{l.receipt.last.x=1;},l=>{l.receipt.reward=100;},l=>{l.revision=0;}];
 for(const change of changes){const bad=structuredClone(good);change(bad);assert.equal(schema.normalizeHomeworldCartographyV104(bad),null);}
});

test('V104 ledger is additive to the normal save, survives ordinary city actions and gives no marks, trophies, items or campaign permission',()=>{
 const legacy=saveApi.defaultSave(owner);assert.equal(Object.hasOwn(legacy.homeworld,'cartographyV104'),false);assert.equal(Object.hasOwn(progressApi.defaultHomeworldProgress(),'cartographyV104'),false);
 const legacyParsed=saveApi.parseSaveImport(saveApi.exportSave(legacy));assert(legacyParsed.save);assert.equal(Object.hasOwn(legacyParsed.save.homeworld,'cartographyV104'),false);
 const save=saveApi.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];save.homeworld.cartographyV104=started();
 const baseline=saveApi.normalizeSave(save),parsed=saveApi.parseSaveImport(saveApi.exportSave(save));assert(parsed.save,parsed.failure);
 assert.deepEqual(parsed.save.homeworld.cartographyV104,save.homeworld.cartographyV104);
 for(const key of['profile','inventory','loadout','appearance','trophies','missionProgress'])assert.deepEqual(parsed.save[key],baseline[key]);
 const visit=progressApi.applyHomeworldAction(parsed.save.homeworld,{type:'visit',districtId:'market'},{rankId:parsed.save.profile.rankId,ownedTrophyCount:0});assert(visit.ok);assert.deepEqual(visit.progress.cartographyV104,save.homeworld.cartographyV104);
});

test('V104 main-save inspection rejects incompatible present ledgers before they can replace stored bytes',()=>{
 const good=saveApi.defaultSave(owner);good.homeworld.visitedDistrictIds=['port'];good.homeworld.cartographyV104=started();
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert(saveApi.writeSaveWithStatus(good,storage,'cartography-test').persisted);const before=[...values];
 for(const[change,failure]of[[s=>{s.homeworld.cartographyV104=null;},'invalid-save'],[s=>{s.homeworld.cartographyV104.version=2;},'future-version'],[s=>{s.homeworld.cartographyV104.ownerCreatedAt='2026-10-21T18:00:00.000Z';},'invalid-save'],[s=>{s.homeworld.visitedDistrictIds=[];},'invalid-save']]){
  const bad=structuredClone(good);change(bad);assert.equal(saveApi.parseSaveImport(JSON.stringify(bad)).failure,failure);assert.equal(saveApi.writeSaveWithStatus(bad,storage,'cartography-test').persisted,false);assert.deepEqual([...values],before);
 }
 const loaded=saveApi.loadSaveWithStatus(storage,'cartography-test');assert(loaded.loaded);assert.deepEqual(loaded.save.homeworld.cartographyV104,good.homeworld.cartographyV104);
});

test('V104 actual React source host, conversation, recorded map and interruption controls render with bounded scope',()=>{
 const host=qa.render('app/game/HomeworldCartographerV104.tsx',{levelId:'0',seconds:0,active:true});assert(host.includes(`data-homeworld-cartographer-v104="${b.npcId}"`));assert(host.includes('Cartographe · relevé du port'));
 assert.equal(qa.render('app/game/HomeworldCartographerV104.tsx',{levelId:'+1',seconds:0,active:true}),'');
 const html=qa.render('app/game/HomeworldCartographyV104.tsx',{ledger:started(),disabled:true,message:'',onAction(){throw Error('SSR must not dispatch');},onClose(){}});
 assert(html.includes('D6-W-PNJ-ROLE-12-REPONSE-B-01'));assert(html.includes('Les zones non observées restent hors du relevé'));assert(!html.includes('D6-W-PNJ-ROLE-12-CHOIX-A-01'));
 const paused=advance(started(),'interrupt');const journal=qa.render('app/game/HomeworldCartographyV104.tsx',{ledger:paused,disabled:false,message:'',onAction(){},onClose(){}});assert(journal.includes('dernier point enregistré'));
});

test('V104 storage retry stays available after closing every pre-walk phase without advertising an earned waypoint or resume',()=>{
 const Journal=qa.load('app/game/HomeworldCartographyV104.tsx').HomeworldCartographyJournalV104;
 const choice=advance(undefined,'choose-b'),ready=advance(choice,'reply');
 for(const ledger of[undefined,choice,ready]){
  const props={ledger,blocked:true,message:'L’enregistrement reste indisponible ; le relevé est conservé ici.',writePaused:true,onResume(){throw Error('pre-walk resume must remain unavailable');},onRetry(){}};
  const html=renderToStaticMarkup(createElement(Journal,props));
  assert(html.includes('Réessayer l’enregistrement du relevé'));
  assert(html.includes('role="status"'));
  assert(!html.includes('disabled=""'),'writePaused blocks movement, not its own recovery action');
  assert(!html.includes('Prochaine approche'));
  assert(!html.includes('Reprendre au dernier point sûr'));
  assert.equal(renderToStaticMarkup(createElement(Journal,{...props,writePaused:false})), '');
 }
});
