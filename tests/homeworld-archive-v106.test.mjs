import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldArchiveV106.ts'),schema=qa.load('app/game/systems/homeworldArchiveLedgerV106.ts'),defs=qa.load('app/game/systems/homeworldArchiveDefinitionV106.ts');
const civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts'),nav=qa.load('app/game/systems/homeworldNavigationV77.ts'),solids=qa.load('app/game/systems/homeworldArchiveSolidsV106.ts');
const saves=qa.load('app/game/save.ts'),progress=qa.load('app/game/systems/homeworld.ts'),location=qa.load('app/game/systems/homeworldLocationV77.ts');
const b=defs.HOMEWORLD_ARCHIVE_V106,owner='2026-10-23T10:00:00.000Z';
const context=(p=b.post,patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:p.x,y:p.y},levelId:'0',visitedDistrictIds:['port'],active:true,...patch});
const act=(ledger,action,p=b.post,patch={})=>{const result=api.applyArchiveActionV106(ledger,action,ledger?.revision??0,context(p,patch));assert(result.ok,result.message+' '+action);return result.ledger;};
const started=()=>['choose-b','reply','start'].reduce((l,a)=>act(l,a),undefined);
const actorAt=p=>({...world.createHomeworldWorldActorV77(),...p,vx:0,vy:0});
function walk(ledger,actor,target){const route=nav.homeworldWalkRouteV77('0',actor,target);assert.equal(route.status,'reachable');for(const point of route.points.slice(1)){
 for(let i=0;i<1600&&Math.hypot(point.x-actor.x,point.y-actor.y)>5;i++){
  const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
  actor=api.stepHomeworldArchiveActorV106(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
  const sample=api.sampleArchiveWalkV106(ledger,before,actor,1/60,context(actor));assert.equal(sample.invalid,false,'real native path '+JSON.stringify({point,actor}));ledger=sample.ledger;
 }
 assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=5,'real motor reaches route node');
}assert(schema.normalizeHomeworldArchiveV106(ledger));return {ledger,actor};}
let first,complete;
function carried(){if(first)return structuredClone(first);let ledger=started(),actor=actorAt(b.post);({ledger,actor}=walk(ledger,actor,b.cases[0].stand));ledger=act(ledger,'take-a',actor);first={ledger,actor};return structuredClone(first);}
function completed(){if(complete)return structuredClone(complete);let {ledger,actor}=carried();({ledger,actor}=walk(ledger,actor,b.supports[0].stand));ledger=act(ledger,'deposit-a',actor);({ledger,actor}=walk(ledger,actor,b.cases[1].stand));ledger=act(ledger,'take-b',actor);({ledger,actor}=walk(ledger,actor,b.supports[1].stand));ledger=act(ledger,'deposit-b',actor);assert.equal(ledger.receipt.phase,'return');({ledger,actor}=walk(ledger,actor,b.post));ledger=act(ledger,'report',actor);complete={ledger,actor};return structuredClone(complete);}

test('V106 archive source extraction is byte-exact to the pinned V6 corpus and uses only represented B lines',()=>{
 const bytes=fs.readFileSync('public/game/dialogues/v85/bible-dialogues.json'),corpus=JSON.parse(bytes),source=defs.HOMEWORLD_ARCHIVE_SOURCE_V106;
 assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sourceCorpusSha256);
 assert.equal(source.source.sha256,'87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183');
 for(const sheet of source.sheets)for(const row of sheet.rows)assert.deepEqual(row,corpus.sheets.find(s=>s.name===sheet.name).rows.find(r=>r.number===row.number));
 assert.equal(defs.HOMEWORLD_ARCHIVE_OPTION_V106.address,'Choix et actions V6!A789:I789');
 assert.equal(defs.HOMEWORLD_ARCHIVE_OPTION_V106.action,'Déposer séparément les traces et conserver explicitement l’incertitude documentaire.');
 const html=qa.render('app/game/HomeworldArchiveV106.tsx',{ledger:act(undefined,'choose-b'),disabled:false,message:'',onAction:()=>false,onClose(){}});
 assert(html.includes('Je conserve les deux traces séparées pour l’instant.'));assert(!html.includes('Cette plaque porte un nom.'));
});

test('V106 native lectern hulls are shared by motor and route planner and leave every interaction point walkable',()=>{
 for(const p of[b.post,b.host,...b.cases.map(c=>c.stand),...b.supports.map(s=>s.stand)])assert(civic.homeworldCivicWalkableV80('0',p),JSON.stringify(p));
 assert(api.archivePostReachedV106(context()));
 for(const solid of solids.HOMEWORLD_ARCHIVE_SOLIDS_V106){const center={x:solid.polygon.reduce((v,p)=>v+p.x,0)/solid.polygon.length,y:solid.polygon.reduce((v,p)=>v+p.y,0)/solid.polygon.length};
  assert.equal(civic.homeworldCivicCollisionV80('0',center)?.id,solid.id);assert(!nav.homeworldRouteSegmentV77('0',{x:center.x-100,y:center.y},{x:center.x+100,y:center.y}));
  const route=nav.homeworldWalkRouteV77('0',{x:center.x-100,y:center.y+65},{x:center.x+100,y:center.y+65});assert.equal(route.status,'reachable');for(const p of route.points)assert(civic.homeworldCivicWalkableV80('0',p));
 }
});

test('V106 requires two actual one-at-a-time native carries and a walked return before recording uncertainty',()=>{
 const {ledger,actor}=completed();assert.equal(ledger.receipt.phase,'completed');assert.equal(ledger.receipt.uncertaintyRecorded,true);assert.equal(ledger.receipt.carrier,null);assert(ledger.receipt.walked>800);assert(ledger.receipt.cases.every(c=>c.place==='support'));
 for(let i=0;i<2;i++)assert.deepEqual({x:ledger.receipt.cases[i].x,y:ledger.receipt.cases[i].y},{x:b.supports[i].x,y:b.supports[i].y});
 assert(Math.hypot(actor.x-b.post.x,actor.y-b.post.y)<6);assert(schema.normalizeHomeworldArchiveV106(JSON.parse(JSON.stringify(ledger))));
 const html=qa.render('app/game/HomeworldArchiveWorldV106.tsx',{levelId:'0',seconds:0,ledger,active:true});assert.equal((html.match(/data-archive-case-place="support"/g)||[]).length,2);assert(html.includes('clan-lectern-right.png'));assert(html.includes('sealed-cargo-case-left.png'));
});

test('V106 refuses remote pickup, wrong support, two carried cases, a verbal completion, stale owner and revisions',()=>{
 const initial=started();for(const [action,ctx]of[['take-a',context()],['report',context()],['choose-b',context()],['take-a',context(b.cases[0].stand,{active:false})],['take-a',context(b.cases[0].stand,{otherOperationActive:true})]])assert.equal(api.applyArchiveActionV106(initial,action,initial.revision,ctx).changed,false);
 const {ledger,actor}=carried();assert.equal(ledger.receipt.carrier,'A');assert.equal(ledger.receipt.cases[0].place,'carried');assert.equal(api.applyArchiveActionV106(ledger,'take-b',ledger.revision,context(actor)).changed,false);assert.equal(api.applyArchiveActionV106(ledger,'deposit-b',ledger.revision,context(b.supports[1].stand)).changed,false);
 assert.equal(api.applyArchiveActionV106(ledger,'interrupt',ledger.revision-1,context(actor)).changed,false);assert.equal(api.applyArchiveActionV106(ledger,'interrupt',ledger.revision,context(actor,{currentOwnerCreatedAt:'2026-10-22T10:00:00.000Z'})).changed,false);
 assert.equal(api.sampleArchiveWalkV106(ledger,actor,b.post,1/60,context()).invalid,true);assert.equal(api.sampleArchiveWalkV106(ledger,actor,{x:actor.x+1,y:actor.y},2,context(actor)).invalid,true);
});

test('V106 carry interruption, explicit ground parking and reload conserve both distinct dossiers',()=>{
 const {ledger,actor}=carried(),paused=act(ledger,'interrupt',actor,{active:false});assert.equal(paused.receipt.phase,'interrupted');assert.equal(paused.receipt.carrier,'A');
 assert.equal(api.applyArchiveActionV106(paused,'resume',paused.revision,context(b.post)).changed,false);
 const resumed=act(schema.normalizeHomeworldArchiveV106(JSON.parse(JSON.stringify(paused))),'resume',actor);assert.equal(resumed.receipt.phase,'working');assert.deepEqual(resumed.receipt.cases,ledger.receipt.cases);
 const parked=act(paused,'park',actor);assert.equal(parked.receipt.carrier,null);assert.equal(parked.receipt.cases[0].place,'ground');assert.equal(parked.receipt.cases[0].x,actor.x);assert.deepEqual(parked.receipt.cases[1],ledger.receipt.cases[1]);
 const back=act(parked,'resume',actor),taken=act(back,'take-a',actor);assert.equal(taken.receipt.carrier,'A');
});

test('V106 refused durable actions remain atomic and expose recoverable refusal without fabricating placements',()=>{
 const {ledger,actor}=carried(),bytes=JSON.stringify(ledger),tx=api.createArchiveTransactionV106(()=>ledger,()=>context(actor),()=>false),out=tx('interrupt',ledger.revision);
 assert.equal(out.ok,false);assert.equal(out.writeRefused,true);assert.equal(JSON.stringify(out.ledger),bytes);assert.equal(JSON.stringify(ledger),bytes);
});

test('V106 optional save field stays absent on legacy saves and strictly rejects incompatible or foreign carried data',()=>{
 const save=saves.normalizeSave({}),{ledger,actor}=carried();assert(!Object.hasOwn(save.homeworld,'archiveV106'));save.createdAt=owner;save.homeworld.visitedDistrictIds=['port'];save.homeworld.archiveV106=ledger;save.homeworld.locationV77=location.createHomeworldCheckpointV77(owner,'0',actor,null,actor);
 assert(saves.parseSaveImport(JSON.stringify(save)).save,'carried state and ordinary checkpoint reload together');
 for(const coordinate of[null,'invalid',Infinity,NaN]){const malformed=structuredClone(save);malformed.homeworld.locationV77.exterior.x=coordinate;assert.equal(saves.parseSaveImport(JSON.stringify(malformed)).failure,'invalid-save');}
 const bad=structuredClone(save);bad.homeworld.locationV77.exterior.x+=30;assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,'invalid-save');
 for(const patch of[{version:2},{ownerCreatedAt:'2026-10-22T10:00:00.000Z'},{receipt:{...ledger.receipt,sourceCorpusSha256:'bad'}}]){const v=structuredClone(save);Object.assign(v.homeworld.archiveV106,patch);assert.equal(saves.parseSaveImport(JSON.stringify(v)).failure,patch.version===2?'future-version':'invalid-save');}
 assert(progress.normalizeHomeworldProgress(save.homeworld).archiveV106);
});


test('V106 archivist is discoverable only after visiting the port and the existing guide uses a real obstacle-aware walk',()=>{
 const atlas=qa.load('app/game/systems/homeworldAtlasLandmarksV83.ts'),guide=qa.load('app/game/systems/homeworldWayfindingV98.ts'),save=saves.normalizeSave({});save.homeworld.visitedDistrictIds=[];
 assert(!atlas.homeworldAtlasLandmarksV83(save).some(p=>p.id===b.npcId));save.homeworld.visitedDistrictIds=['port'];
 const target=atlas.homeworldAtlasLandmarksV83(save).find(p=>p.id===b.npcId);assert.deepEqual(target.position,b.post);assert.equal(target.levelId,'0');
 const plan=guide.homeworldRoutePlanV98(save,{actor:b.cases[0].stand,levelId:'0',interiorId:null},b.npcId);assert.equal(plan.status,'reachable');assert(plan.distance>150);
 for(const stage of plan.stages)for(let i=1;i<stage.points.length;i++)assert(nav.homeworldRouteSegmentV77('0',stage.points[i-1],stage.points[i]));
 assert(!Object.hasOwn(save.homeworld,'archiveV106'),'consulting the guide does not start or write the archive');
});


test('V106 local map keeps exact dossier positions readable and marks an out-of-frame parked dossier without revealing terrain',()=>{
 const {ledger,actor}=carried(),paused=act(ledger,'interrupt',actor),parked=act(paused,'park',actor);parked.receipt.cases[0].x=8000;parked.receipt.cases[0].y=5500;
 const html=qa.render('app/game/HomeworldArchiveV106.tsx',{ledger:parked,disabled:false,message:'',onAction:()=>false,onClose(){}});
 assert(html.includes('viewBox="7040 5040 700 400"'),'the local framing is preserved');assert(html.includes('data-archive-map-case="A" data-archive-map-outside="true"'));
 assert(html.includes('hors cadrage du quai'));assert(html.includes('Dossier A · au sol · position 8000'));assert(html.includes('5500'));
 assert(html.includes('Dossier B · au sol · position 7610'));assert(!html.includes('<image'),'no unknown district image is drawn');
});
