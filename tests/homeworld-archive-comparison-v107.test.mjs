import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {archiveComparisonRouteV107} from './helpers/archive-comparison-v107-route.mjs';
const f=archiveComparisonRouteV107(),{qa,api,schema,defs,b,owner}=f;
let baseCache,carryCache,completeCache;
const base=()=>{if(!baseCache)baseCache=structuredClone(f.baseCompleted());f.restore(baseCache);return f.state();};
const carried=()=>{if(!carryCache){base();for(const a of['choose-a','reply','start'])f.action(a);f.walkTo(b.evidence.stand);f.action('discover');f.action('copy-provenance');f.action('take');carryCache=structuredClone(f.state());}f.restore(carryCache);return f.state();};
const complete=()=>{if(!completeCache){carried();f.walkTo(b.table.stand);f.action('deposit');for(const s of b.references){f.walkTo(s.stand);f.action(s.caseId==='A'?'observe-a':'observe-b');}f.walkTo(b.table.stand);f.action('compare');f.walkTo(b.post);f.action('report');completeCache=structuredClone(f.state());}f.restore(completeCache);return f.state();};
const refused=(action,patch={})=>api.applyArchiveComparisonV107(f.state().ledger,action,f.state().ledger?.revision??0,f.context(f.state().actor,patch));
const saveState=state=>{const saves=qa.load('app/game/save.ts'),loc=qa.load('app/game/systems/homeworldLocationV77.ts'),save=saves.normalizeSave({});save.createdAt=owner;save.homeworld.visitedDistrictIds=['port'];save.homeworld.archiveV106=state.legacyArchive;if(state.ledger)save.homeworld.archiveComparisonV107=state.ledger;save.homeworld.locationV77=loc.createHomeworldCheckpointV77(owner,'0',state.actor,null,state.actor);return save;};

test('V107 exact A lines retain pinned source, announced action and no automatic reward',()=>{
 const bytes=fs.readFileSync('public/game/dialogues/v85/bible-dialogues.json'),source=defs.HOMEWORLD_ARCHIVE_COMPARISON_SOURCE_V107,corpus=JSON.parse(bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sourceCorpusSha256);
 assert.equal(source.source.sha256,'87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183');for(const s of source.sheets)for(const r of s.rows)assert.deepEqual(r,corpus.sheets.find(x=>x.name===s.name).rows.find(x=>x.number===r.number));
 assert.equal(defs.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107.address,'Choix et actions V6!A788:I788');assert.equal(defs.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107.action,'Retrouver une preuve située et la comparer aux supports existants.');assert(defs.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107.consequence.includes('Aucun objet, grade, soin, trophée ou territoire'));
 base();f.action('choose-a');const html=qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:f.state().ledger,disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});assert(html.includes('Je cherche l’objet qui relie les deux.'));assert(!html.includes('Cette plaque porte un nom.'));assert(!html.includes('Un fragment arraché à son histoire'));
 f.action('reply');const reply=qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:f.state().ledger,disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});assert(reply.includes('Apporte-le avec son lieu de découverte.'));assert.equal(defs.HOMEWORLD_ARCHIVE_COMPARISON_LINES_V107.length,3);
});

test('V107 prerequisite is the preserved completed B operation and choice cannot mutate B',()=>{
 const initial=api.applyArchiveComparisonV107(undefined,'choose-a',0,{...f.context(b.post),legacyArchive:undefined});assert.equal(initial.ok,false);base();const bytes=JSON.stringify(f.state().legacyArchive);for(const a of['choose-a','reply','start'])f.action(a);assert.equal(JSON.stringify(f.state().legacyArchive),bytes);assert.equal(f.state().ledger.receipt.phase,'search');
 assert.equal(refused('report').ok,false);assert.equal(refused('take').ok,false);assert.equal(refused('compare').ok,false);assert.equal(refused('choose-a').ok,false);
});

test('V107 motor carries a discovered object with provenance, observes both supports and requires explicit confrontation and walked report',()=>{
 const {ledger,legacyArchive}=complete();assert.equal(ledger.receipt.phase,'completed');assert.equal(ledger.receipt.evidence.place,'table');assert.equal(ledger.receipt.provenanceCopied,true);assert.equal(ledger.receipt.observations.length,2);assert(ledger.receipt.walked>1000);assert.deepEqual(ledger.receipt.discovery.position,b.evidence.origin);assert.deepEqual(ledger.receipt.comparison,{sourcePosition:b.evidence.origin,verdict:'context-kept-link-undetermined'});assert(schema.normalizeHomeworldArchiveComparisonV107(JSON.parse(JSON.stringify(ledger))));assert.equal(JSON.stringify(legacyArchive),JSON.stringify(baseCache.legacyArchive));
 const html=qa.render('app/game/HomeworldArchiveComparisonWorldV107.tsx',{levelId:'0',seconds:0,ledger,active:true});assert(html.includes('data-evidence-place="table"'));assert(html.includes('clan-lectern-right.png'));assert(html.includes('sealed-cargo-case-left.png'));
 const measured=api.archiveComparisonMeasurementsV107();for(let i=0;i<2;i++)assert.equal(measured[i].distance,Math.hypot(b.references[i].x-b.evidence.origin.x,b.references[i].y-b.evidence.origin.y));
});

test('V107 discovery and provenance are separate durable gates, and table does not infer a result',()=>{
 base();for(const a of['choose-a','reply','start'])f.action(a);f.walkTo(b.evidence.stand);assert.equal(refused('take').ok,false);assert.equal(api.archiveComparisonNearbyV107(f.state().ledger,f.context()).action,'discover');f.action('discover');assert.equal(refused('take').ok,false);f.action('copy-provenance');f.action('take');f.walkTo(b.table.stand);f.action('deposit');assert.equal(f.state().ledger.receipt.phase,'compare');assert.equal(f.state().ledger.receipt.comparison,null);assert.equal(refused('compare').ok,false);assert.equal(refused('report').ok,false);
 f.walkTo(b.references[0].stand);f.action('observe-a');assert.equal(refused('observe-a').ok,false);assert.equal(refused('observe-b').ok,false);f.walkTo(b.references[1].stand);f.action('observe-b');assert.equal(refused('compare').ok,false);f.walkTo(b.table.stand);assert.equal(api.archiveComparisonNearbyV107(f.state().ledger,f.context()).action,'compare');
 const html=qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:f.state().ledger,mode:'table',disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});assert(html.includes('Confronter les relevés conservés'));assert(!html.includes('Apporte-le avec son lieu de découverte.'));f.action('compare');assert.equal(f.state().ledger.receipt.phase,'return');assert.equal(refused('report').ok,false);
});

test('V107 interruption, parking, imports and pickup retain original discovery and copied provenance',()=>{
 carried();f.walkTo({x:7150,y:5524});const before=structuredClone(f.state());f.action('interrupt',{active:false});assert.equal(f.state().ledger.receipt.evidence.place,'carried');assert.equal(refused('resume',{actor:b.post}).ok,false);f.action('park');assert.equal(f.state().ledger.receipt.evidence.place,'ground');assert.deepEqual(f.state().ledger.receipt.discovery,before.ledger.receipt.discovery);assert.equal(f.state().ledger.receipt.provenanceCopied,true);f.action('resume');f.action('take');assert.equal(f.state().ledger.receipt.evidence.place,'carried');assert.deepEqual(f.state().ledger.receipt.discovery.position,b.evidence.origin);assert.notDeepEqual({x:f.state().ledger.receipt.evidence.x,y:f.state().ledger.receipt.evidence.y},b.evidence.origin);
});

test('V107 refused durable discovery, carry, comparison and report are atomic and stale owners/revisions cannot write',()=>{
 const scenarios=[
  ['discover',()=>{base();for(const a of['choose-a','reply','start'])f.action(a);f.walkTo(b.evidence.stand);}],
  ['interrupt',carried],
  ['compare',()=>{carried();f.walkTo(b.table.stand);f.action('deposit');for(const s of b.references){f.walkTo(s.stand);f.action(s.caseId==='A'?'observe-a':'observe-b');}f.walkTo(b.table.stand);}],
  ['report',()=>{f.action('compare');f.walkTo(b.post);}]
 ];
 for(const [action,prepare]of scenarios){prepare();const previous=f.state().ledger,bytes=JSON.stringify(previous),tx=api.createArchiveComparisonTransactionV107(()=>previous,()=>f.context(),()=>false),out=tx(action,previous.revision);assert.equal(out.writeRefused,true,action);assert.equal(out.ok,false);assert.equal(JSON.stringify(out.ledger),bytes);assert.equal(JSON.stringify(previous),bytes);}
 carried();assert.equal(api.applyArchiveComparisonV107(f.state().ledger,'interrupt',f.state().ledger.revision-1,f.context()).ok,false);assert.equal(refused('interrupt',{currentOwnerCreatedAt:'2026-10-22T10:00:00.000Z'}).ok,false);assert.equal(refused('interrupt',{otherOperationActive:true}).ok,false);
});

test('V107 strict optional Save import enforces completed B, ownership, exact carried checkpoints and immutable source',()=>{
 const saves=qa.load('app/game/save.ts'),empty=saves.normalizeSave({});assert(!Object.hasOwn(empty.homeworld,'archiveComparisonV107'));carried();const save=saveState(f.state());assert(saves.parseSaveImport(JSON.stringify(save)).save);assert(qa.load('app/game/systems/homeworld.ts').normalizeHomeworldProgress(save.homeworld).archiveComparisonV107);
 const patches=[s=>s.homeworld.archiveComparisonV107.version=2,s=>s.homeworld.archiveComparisonV107.ownerCreatedAt='2026-10-22T10:00:00.000Z',s=>delete s.homeworld.archiveV106,s=>s.homeworld.archiveV106.receipt.phase='return',s=>s.homeworld.archiveComparisonV107.receipt.discovery.position.x++,s=>s.homeworld.locationV77.exterior.x++,s=>s.homeworld.locationV77.exterior.x='invalid',s=>s.homeworld.visitedDistrictIds=[]];
 for(let i=0;i<patches.length;i++){const malformed=structuredClone(save);patches[i](malformed);assert.equal(saves.parseSaveImport(JSON.stringify(malformed)).failure,i===0?'future-version':'invalid-save','strict import case '+i);}
 const malformed=structuredClone(save.homeworld.archiveComparisonV107);malformed.receipt.evidence.x=NaN;assert.equal(schema.normalizeHomeworldArchiveComparisonV107(malformed),null);complete();assert(saves.parseSaveImport(JSON.stringify(saveState(f.state()))).save);
});

test('V107 new native lectern collision is shared by motor, routes and conditional atlas guides',()=>{
 const civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts'),solids=qa.load('app/game/systems/homeworldArchiveComparisonSolidsV107.ts'),atlas=qa.load('app/game/systems/homeworldAtlasLandmarksV83.ts'),guide=qa.load('app/game/systems/homeworldWayfindingV98.ts');for(const p of[b.post,b.evidence.stand,b.table.stand,...b.references.map(s=>s.stand)])assert(civic.homeworldCivicWalkableV80('0',p),JSON.stringify(p));
 for(const s of [solids.HOMEWORLD_ARCHIVE_COMPARISON_SOLID_V107]){const center={x:s.polygon.reduce((n,p)=>n+p.x,0)/s.polygon.length,y:s.polygon.reduce((n,p)=>n+p.y,0)/s.polygon.length};assert.equal(civic.homeworldCivicCollisionV80('0',center)?.id,s.id);assert(!f.nav.homeworldRouteSegmentV77('0',{x:center.x-100,y:center.y},{x:center.x+100,y:center.y}));}
 base();const save=saveState(f.state());assert(atlas.homeworldAtlasLandmarksV83(save).some(p=>p.id===b.table.id));for(const id of['archive-study-zone-v107',b.table.id,'archive-reference-a-v107','archive-reference-b-v107']){const plan=guide.homeworldRoutePlanV98(save,{actor:b.post,levelId:'0',interiorId:null},id);assert.equal(plan.status,'reachable',id);for(const stage of plan.stages)for(let i=1;i<stage.points.length;i++)assert(f.nav.homeworldRouteSegmentV77('0',stage.points[i-1],stage.points[i]));}
 delete save.homeworld.archiveV106;assert(!atlas.homeworldAtlasLandmarksV83(save).some(p=>p.id===b.table.id));save.homeworld.visitedDistrictIds=[];assert(!atlas.homeworldAtlasLandmarksV83(save).some(p=>p.id==='archive-study-zone-v107'));
});

test('V107 strict discriminants reject arrays and lookalike objects before Save import can lock a carried operation',()=>{
 const saves=qa.load('app/game/save.ts');carried();const carry=saveState(f.state());for(const value of[['carrying'],{0:'carrying',length:1},true,1]){const s=structuredClone(carry);s.homeworld.archiveComparisonV107.receipt.phase=value;assert.equal(schema.normalizeHomeworldArchiveComparisonV107(s.homeworld.archiveComparisonV107),null);assert.equal(saves.parseSaveImport(JSON.stringify(s)).failure,'invalid-save');}
 const invalidPlace=structuredClone(carry);invalidPlace.homeworld.archiveComparisonV107.receipt.evidence.place=['carried'];assert.equal(saves.parseSaveImport(JSON.stringify(invalidPlace)).failure,'invalid-save');f.action('interrupt');const paused=saveState(f.state());paused.homeworld.archiveComparisonV107.receipt.resumePhase=['carrying'];assert.equal(saves.parseSaveImport(JSON.stringify(paused)).failure,'invalid-save');complete();const observed=saveState(f.state());observed.homeworld.archiveComparisonV107.receipt.observations[0].supportId=['A'];assert.equal(saves.parseSaveImport(JSON.stringify(observed)).failure,'invalid-save');
});

test('V107 physically valid foreground walking preserves save/pause/resume but never allows hidden interaction',()=>{
 const visibility=qa.load('app/game/systems/homeworldResidentVisibilityV100.ts'),saves=qa.load('app/game/save.ts');carried();let hidden=null;f.walkTo({x:7000,y:3000},false,s=>{if(!hidden&&visibility.homeworldResidentOccludedV100('0',s.actor))hidden=structuredClone(s);});assert(hidden);f.restore(hidden);assert(saves.parseSaveImport(JSON.stringify(saveState(f.state()))).save);f.action('interrupt',{active:false});assert(saves.parseSaveImport(JSON.stringify(saveState(f.state()))).save);assert.equal(refused('park').ok,false);assert.equal(api.archiveComparisonNearbyV107(f.state().ledger,f.context()),null);f.action('resume');assert(saves.parseSaveImport(JSON.stringify(saveState(f.state()))).save);f.walkTo({x:7000,y:3000});assert(saves.parseSaveImport(JSON.stringify(saveState(f.state()))).save);
});

test('V107 local map preserves source C, displayed placements and uncertainty without claiming a plaque or contents',()=>{
 complete();const html=qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:f.state().ledger,disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});assert(html.includes('7100'));assert(html.includes('5480'));assert(html.includes('Objet C et contexte'));assert(html.includes('Non inspecté'));assert(!html.includes('Cette plaque porte un nom.'));assert(html.includes('lien de lignée non établi'));const altered=structuredClone(f.state().ledger);altered.receipt.phase='interrupted';altered.receipt.resumePhase='search';altered.receipt.interruptedCount=1;altered.receipt.evidence={x:9000,y:5900,place:'ground'};const map=qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:altered,disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});assert(map.includes('hors cadrage du quai'));assert(map.includes('9000'));
});
