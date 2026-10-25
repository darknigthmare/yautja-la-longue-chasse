import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {archivePlaqueRouteV109} from './helpers/archive-plaque-v109-route.mjs';
const f=archivePlaqueRouteV109(),initial=structuredClone(f.state()),{api,schema,b,defs,owner}=f,reset=()=>f.restore(initial);
const refused=(action,patch={})=>api.applyArchivePlaqueV109(f.state().ledger,action,f.state().ledger.revision,f.context(f.state().actor,patch));
let completedA,completedB,carrying;
function a(){if(!completedA){reset();completedA=structuredClone(f.complete());}f.restore(completedA);return f.state();}
function broute(){if(!completedB){reset();completedB=structuredClone(f.complete('B'));}f.restore(completedB);return f.state();}
function carry(){if(!carrying){reset();f.start();f.walkTo(b.objects[0].stand);for(const a of ['observe-plaque','copy-plaque','take-plaque'])f.action(a);carrying=structuredClone(f.state());}f.restore(carrying);return f.state();}
function saveState(){const save=f.qa.load('app/game/save.ts').normalizeSave({}),loc=f.qa.load('app/game/systems/homeworldLocationV77.ts');save.createdAt=owner;save.homeworld.visitedDistrictIds=['port'];save.homeworld.archivePlaqueV109=f.state().ledger;save.homeworld.locationV77=loc.createHomeworldCheckpointV77(owner,'0',f.state().actor,null,f.state().actor);return save;}

test('ROLE03 exact source lines and three actual independent native regions are pinned, without fabricated art admission',()=>{
 const bytes=fs.readFileSync('public/game/dialogues/v85/bible-dialogues.json'),corpus=JSON.parse(bytes),source=defs.HOMEWORLD_ARCHIVE_PLAQUE_SOURCE_V109;
 assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sourceCorpusSha256);for(const sheet of source.sheets)for(const row of sheet.rows)assert.deepEqual(row,corpus.sheets.find(s=>s.name===sheet.name).rows.find(r=>r.number===row.number));
 const art=defs.HOMEWORLD_ARCHIVE_PLAQUE_ART_V109,png=fs.readFileSync('public'+art.src);assert.equal(createHash('sha256').update(png).digest('hex'),art.sha256);assert.equal(art.width,1254);assert.equal(art.height,1254);assert.equal(Object.keys(art.frames).length,3);
 const rects=Object.values(art.frames);for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const p=rects[i],q=rects[j];assert(p.x+p.width<=q.x||q.x+q.width<=p.x||p.y+p.height<=q.y||q.y+q.height<=p.y,'source regions never fuse separate objects');}
});
test('A walks, observes, copies provenance and carries three distinct pieces, retaining the missing edge and uncertain attribution',()=>{
 const {ledger}=a(),r=ledger.receipt;assert.equal(r.phase,'completed');assert.deepEqual(r.objects.map(o=>o.place),['support','support','support']);assert(r.walked>1000);assert.deepEqual([...r.observations].sort(),['fragment','plaque','trace']);assert.deepEqual([...r.provenances].sort(),['fragment','plaque','trace']);assert(r.edgeObserved&&r.mismatchObserved&&r.failureSpoken&&r.resumeSpoken&&r.fragmentCompared);assert.equal(r.interruptedCount,1);assert.equal(schema.normalizeHomeworldArchivePlaqueV109(ledger).receipt.objects.length,3);
 assert.deepEqual(r.lineIds.map(id=>defs.HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(l=>l.id===id).kind),['OUV','CHOIX','REPONSE','ECHEC','REPRISE','SUCCES']);assert(!Object.hasOwn(r,'repaired'));assert(!Object.hasOwn(r,'lineage'));
});
test('B physically keeps plaque and impression separated, without inventing a fragment comparison or failure',()=>{
 const r=broute().ledger.receipt;assert.deepEqual(r.objects.map(o=>o.place),['support','support','source']);assert(!r.mismatchObserved&&!r.failureSpoken&&!r.resumeSpoken&&!r.fragmentCompared);assert.deepEqual(r.lineIds.map(id=>defs.HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(l=>l.id===id).kind),['OUV','CHOIX','REPONSE','SUCCES']);
});
test('only actual visible post, consent, copied provenance and native walking can change the pieces',()=>{
 reset();for(const patch of [{artAvailable:false},{hostPresent:false},{active:false},{visitedDistrictIds:[]},{otherOperationActive:true}])assert.equal(refused('open',patch).ok,false);
 f.action('open');assert(!api.archivePlaqueActiveV109(f.state().ledger),'an unaccepted conversation does not reserve another activity');f.action('choose-a');f.action('reply');assert.equal(refused('start').ok,false);assert.equal(refused('authorize',{hostConsenting:false}).ok,false);f.action('authorize');f.action('start');assert.equal(refused('report').ok,false);assert.equal(refused('take-plaque').ok,false);f.walkTo(b.objects[0].stand);assert.equal(refused('take-plaque').ok,false);f.action('observe-plaque');assert.equal(refused('take-plaque').ok,false);f.action('copy-plaque');f.action('take-plaque');assert.equal(refused('take-trace').ok,false);assert.equal(refused('deposit').ok,false);
});
test('source failure and reprise require separately deposited pieces, real comparison, a walked return and voluntary interruption',()=>{
 reset();f.start();assert.equal(refused('report-mismatch').ok,false);assert.equal(refused('resume').ok,false);f.place('plaque');f.place('trace');f.walkTo(b.supports[0].stand);f.action('inspect-edge');f.action('compare-supports');assert.equal(refused('report-mismatch').ok,false);f.walkTo(b.post);f.action('report-mismatch');assert.equal(refused('report-mismatch').ok,false);assert.equal(refused('compare-fragment').ok,false);f.action('interrupt',{active:false});f.action('resume');assert(f.state().ledger.receipt.resumeSpoken);assert.equal(f.state().ledger.receipt.objects[2].place,'source');
});
test('an interruption after failure can return to the consenting post without losing its recorded objects or crediting paused walking',()=>{
 reset();f.beforeMismatch();f.walkTo(b.supports[0].stand);f.action('interrupt',{active:false});const before=structuredClone(f.state().ledger.receipt);assert.equal(refused('resume').ok,false);f.walkTo(b.post);assert.equal(refused('resume',{hostConsenting:false}).ok,false);f.action('resume');const after=f.state().ledger.receipt;assert(after.resumeSpoken);assert.equal(after.phase,'working');assert.equal(after.walked,before.walked);assert.deepEqual(after.objects,before.objects);assert.deepEqual(after.last,{x:f.state().actor.x,y:f.state().actor.y});assert.equal(after.lineIds.at(-1),'D6-W-PNJ-ROLE-03-REPRISE---01');f.place('fragment');f.walkTo(b.supports[0].stand);f.action('compare-fragment');f.action('conclude');f.walkTo(b.post);f.action('report');assert.equal(f.state().ledger.receipt.phase,'completed');
});
test('quota rejection, stale revisions, foreign owners and impossible movement preserve the confirmed receipt',()=>{
 carry();const old=structuredClone(f.state()),bytes=JSON.stringify(old.ledger),tx=api.createArchivePlaqueTransactionV109(()=>f.state().ledger,()=>f.context(),()=>false),out=tx('interrupt',old.ledger.revision);assert(out.writeRefused);assert.equal(JSON.stringify(out.ledger),bytes);assert.equal(JSON.stringify(f.state().ledger),bytes);
 assert.equal(api.applyArchivePlaqueV109(old.ledger,'interrupt',old.ledger.revision-1,f.context()).ok,false);assert.equal(refused('interrupt',{currentOwnerCreatedAt:'2026-10-24T10:00:00.000Z'}).ok,false);assert(api.sampleArchivePlaqueWalkV109(old.ledger,old.actor,{x:old.actor.x+500,y:old.actor.y},1/60,f.context()).invalid);
 f.action('interrupt',{active:false});assert.equal(f.state().ledger.receipt.carrier,'plaque');f.action('park');assert.equal(f.state().ledger.receipt.objects[0].place,'ground');f.action('resume');assert.equal(f.state().ledger.receipt.provenances[0],'plaque');
});
test('strict imports preserve live carries and reject future, foreign, duplicated, fabricated line or unsupported checkpoint states',()=>{
 const saves=f.qa.load('app/game/save.ts');carry();const save=saveState();assert(saves.parseSaveImport(JSON.stringify(save)).save);
 const patches=[s=>s.homeworld.archivePlaqueV109.version=2,s=>s.homeworld.archivePlaqueV109.ownerCreatedAt='2026-10-24T10:00:00.000Z',s=>s.homeworld.locationV77.exterior.x++,s=>s.homeworld.visitedDistrictIds=[],s=>s.homeworld.archivePlaqueV109.receipt.objects[1]={...s.homeworld.archivePlaqueV109.receipt.objects[0]},s=>s.homeworld.archivePlaqueV109.receipt.lineIds.push('D6-W-PNJ-ROLE-03-SUCCES---01'),s=>s.homeworld.archivePlaqueV109.receipt.artSha256='0'.repeat(64)];
 patches.forEach((patch,i)=>{const bad=structuredClone(save);patch(bad);assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,i===0?'future-version':'invalid-save','case '+i);});
 const cargo=f.qa.load('app/game/systems/homeworldCargoV108.ts'),def=f.qa.load('app/game/systems/homeworldCargoDefinitionV108.ts').HOMEWORLD_CARGO_V108,active=cargo.applyCargoActionV108(undefined,'choose-a',0,f.context(def.post));assert(active.ok);const bad=structuredClone(save);bad.homeworld.cargoV108=active.ledger;assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,'invalid-save');a();assert(saves.parseSaveImport(JSON.stringify(saveState())).save);
});
test('native scene and journal show exact source lines, independent pieces and no promised repair or campaign reward',()=>{
 a();const html=f.qa.render('app/game/HomeworldArchivePlaqueV109.tsx',{ledger:f.state().ledger,disabled:false,message:'',onAction:()=>false,onClose(){}});assert(html.includes('D6-W-PNJ-ROLE-03-SUCCES---01'));assert(html.includes('K-17'));assert(html.includes('aucune réparation certifiée'));assert(!html.includes('victoire de campagne'));
 const world=f.qa.render('app/game/HomeworldArchivePlaqueWorldV109.tsx',{levelId:'0',ledger:f.state().ledger,seconds:0});for(const id of ['plaque','trace','fragment'])assert(world.includes('data-plaque-object-v109="'+id+'"'));assert(world.includes('data-native-source-rect="627,0,627,750"'));
});
