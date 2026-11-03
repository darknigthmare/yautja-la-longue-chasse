import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const directory=await fs.mkdtemp(path.join(os.tmpdir(),'clan-assault-v106-'));
after(()=>fs.rm(directory,{recursive:true,force:true}));
const compiled=await build({stdin:{contents:`
export * from './app/game/systems/clanWarV85';
export * from './app/game/systems/clanWarAssaultV106';
export * from './app/game/systems/clanWarConvoyRouteV105';
export * from './app/game/systems/clanWarPlanetGeneratorV103';
export * from './app/game/systems/clanWarPlanetsV96';
`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const moduleFile=path.join(directory,'core.mjs');await fs.writeFile(moduleFile,compiled.outputFiles[0].text);
const api=await import(pathToFileURL(moduleFile));
const copy=value=>structuredClone(value);
const draft=(ids=['P07','P08','P09','P10','P11','P12','P13','P14'])=>({kind:'attack',fromId:'CON-T02',targetId:'CON-T08',combatantIds:ids,cargo:{s:0,m:0,i:0}});
const state=()=>{const current=api.createWarSimulationV85(10637);for(const person of current.combatants)if(person.factionId!=='CON-F01')person.garrison=true;return current;};
const accept=result=>{assert.equal(result.accepted,true,result.message);return result.state;};

test('the three exact source rows remain pinned without claiming any of the six physical structures',async()=>{
 const source=JSON.parse(await fs.readFile('app/game/clanWarV85Source.json','utf8'));
 const contract=api.WAR_ASSAULT_CONTRACT_V106;assert.equal(contract.sha256,source.sha256);
 for(const rule of contract.sources){const entry=source.entries.find(item=>item.id===rule.id);assert.equal(entry.sheet,contract.sheet);assert.equal(rule.cells,`C${entry.row}:H${entry.row}`);}
 assert.match(contract.scope,/no new structure/);
});

test('preparation is read-only, uses identified own people and leaves stocks and turn untouched',()=>{
 const current=state(),before=JSON.stringify(current),operation=draft();
 const plan=api.prepareWarAssaultV106(current,operation);
 assert.ok(plan);assert.equal(JSON.stringify(current),before);
 assert.deepEqual(plan.view.people.map(person=>person.id),operation.combatantIds);
 assert.deepEqual(plan.view.cost,{s:3,m:1,i:0});assert.equal(plan.view.intel.kind,'unknown');
 assert.equal(plan.view.losses,null);assert.deepEqual(plan.view.currentLossExposure,{lower:0,upper:8});
 operation.combatantIds.pop();assert.equal(plan.draft.combatantIds.length,8,'caller cannot alter the frozen column');
});

test('unseen roster, foreign stocks and the operation seed do not change any disclosed planning fact',()=>{
 const current=state(),operation=draft(),before=api.warAssaultViewV106(current,operation),changed=copy(current);
 changed.seed=0xffffffff;
 for(const person of changed.combatants)if(person.factionId!=='CON-F01'){person.status='dead';person.garrison=false;person.xp=100;}
 for(const id of Object.keys(changed.stocks))if(changed.territories[id].controller!=='CON-F01')changed.stocks[id]={s:999,m:888,i:777};
 assert.deepEqual(api.warAssaultViewV106(changed,operation),before);
 assert.equal(JSON.stringify(before).includes('10637'),false,'seed is absent from public view');
});

test('a dated report narrows only its conditional scenario, never the current loss exposure',()=>{
 const current=state(),operation=draft();current.observations.push({territoryId:'CON-T08',turn:1,lower:3,upper:5,sourceId:'P08'});
 const view=api.warAssaultViewV106(current,operation);
 assert.deepEqual(view.assumptions,{lower:3,upper:5,observedTurn:1,stale:false});
 assert.deepEqual(view.losses,{lower:1,upper:1,wins:9,cases:9});
 assert.deepEqual(view.currentLossExposure,{lower:0,upper:8});
 current.turn=4;const old=api.warAssaultViewV106(current,operation);
 assert.equal(old.assumptions.stale,true);assert.equal(old.assumptions.observedTurn,1);
 assert.deepEqual(old.losses,view.losses,'age does not invent a new observed force');
 assert.equal(api.warIntelMarkerV106(current,'CON-T08').short,'3–5 · T1');
});

test('future observations cannot disclose a force and own map markers use only live own people',()=>{
 const current=state();current.observations.push({territoryId:'CON-T08',turn:2,lower:55,upper:60,sourceId:'P08'});
 assert.equal(api.warAssaultViewV106(current,draft()).intel.kind,'unknown');
 assert.equal(api.warIntelMarkerV106(current,'CON-T08').short,'?');
 const own=api.warIntelMarkerV106(current,'CON-T02');assert.equal(own.kind,'own');assert.equal(own.short,'12 aptes');
});

test('a replacement archive with the same public facts, turn and revision cannot inherit a review',()=>{
 const current=state(),operation=draft(),plan=api.prepareWarAssaultV106(current,operation),replacement=copy(current);
 replacement.seed=10638;
 replacement.combatants.find(person=>person.factionId==='CON-F02').xp+=1;
 assert.deepEqual(api.warAssaultViewV106(replacement,operation),plan.view);
 assert.equal(JSON.stringify(plan).includes('10637'),false);
 const rejected=api.queuePreparedWarAssaultV106(replacement,operation,plan);
 assert.equal(rejected.accepted,false);assert.equal(rejected.state,replacement);
 assert.match(rejected.message,/remplacé/);
 assert.equal(api.queuePreparedWarAssaultV106(replacement,operation,api.prepareWarAssaultV106(replacement,operation)).accepted,true);
});

test('the isolated conditional range contains actual native resolutions and reservations are byte-identical to the old queue',()=>{
 for(const seed of [1,2,3,4,10637]){
  const current=state();current.seed=seed;current.observations.push({territoryId:'CON-T08',turn:1,lower:3,upper:5,sourceId:'P08'});
  const operation=draft(),plan=api.prepareWarAssaultV106(current,operation);
  const queued=accept(api.queuePreparedWarAssaultV106(current,operation,plan));
  assert.deepEqual(queued,accept(api.queueWarOrderV85(current,operation)));
  assert.equal(queued.version,1);assert.equal(Object.hasOwn(queued,'assaultV106'),false);
  const resolved=accept(api.advanceWarTurnV85(queued));
  const losses=resolved.combatants.filter(actor=>operation.combatantIds.includes(actor.id)&&actor.status!=='fit').length;
  assert(losses>=plan.view.losses.lower&&losses<=plan.view.losses.upper);
  assert.equal(losses,1);assert.equal(resolved.territories['CON-T08'].controller,'CON-F01');
  assert.equal(resolved.combatants.filter(actor=>operation.combatantIds.includes(actor.id)&&actor.status==='fit').length,7);
  assert.deepEqual(api.readWarSimulationV85(resolved),resolved);
 }
});

test('a missing, changed, forged or stale plan cannot reserve any order or resource',()=>{
 const current=state(),operation=draft(),plan=api.prepareWarAssaultV106(current,operation),before=JSON.stringify(current);
 assert.equal(api.queuePreparedWarAssaultV106(current,operation,null).accepted,false);
 const forged=copy(plan);forged.view.currentLossExposure.upper=0;
 assert.equal(api.queuePreparedWarAssaultV106(current,operation,forged).accepted,false);
 for(const edit of [s=>s.revision++,s=>s.turn++,s=>s.stocks['CON-T02'].s++,s=>s.combatants.find(actor=>actor.id==='P07').garrison=true,s=>s.observations.push({territoryId:'CON-T08',turn:1,lower:3,upper:5,sourceId:'P08'})]){
  const changed=copy(current);edit(changed);
  const result=api.queuePreparedWarAssaultV106(changed,operation,plan);assert.equal(result.accepted,false);assert.equal(result.state,changed);
 }
 assert.equal(api.queuePreparedWarAssaultV106(current,draft(['P07']),plan).accepted,false);
 assert.equal(JSON.stringify(current),before);
});

test('a real intervening reservation invalidates an assault review; refreshing uses remaining local stocks and people',()=>{
 const current=state(),operation=draft(['P07','P08']),plan=api.prepareWarAssaultV106(current,operation);
 const changed=accept(api.queueWarOrderV85(current,{kind:'recon',fromId:'CON-T03',targetId:'CON-T09',combatantIds:['P18'],cargo:{s:0,m:0,i:0}}));
 assert.equal(api.queuePreparedWarAssaultV106(changed,operation,plan).accepted,false);
 const updated=api.prepareWarAssaultV106(changed,operation);assert.ok(updated);
 assert.equal(accept(api.queuePreparedWarAssaultV106(changed,operation,updated)).orders.length,2);
});

test('archive and convoy revision limits also block preparation, while normal retirement margins stay unchanged',()=>{
 const current=state();current.revision=1000000;assert.equal(api.prepareWarAssaultV106(current,draft()),null);
 const planned=accept(api.planWarConvoyV105(state(),{territoryIds:['CON-T02','CON-T03'],combatantIds:['P15'],cargo:{s:0,m:1,i:0}}));
 planned.revision=999999;assert.equal(api.prepareWarAssaultV106(planned,draft()),null);
 const queued=accept(api.queueWarConvoyLegV105(accept(api.planWarConvoyV105(state(),{territoryIds:['CON-T02','CON-T03'],combatantIds:['P15'],cargo:{s:0,m:1,i:0}}))));
 queued.revision=999998;assert.equal(api.prepareWarAssaultV106(queued,draft()),null);
});

test('the visible supply route obeys headquarters, control, transit dates and roots without awarding cargo rights',()=>{
 const current=state();assert.deepEqual(api.warSupplyPathV106(current,'CON-T03'),['CON-T01','CON-T02','CON-T03']);
 assert.equal(api.warSupplyPathV106(current,'CON-T08'),null);
 current.territories['CON-T02'].controller='CON-F03';current.territories['CON-T02'].transitUntilTurn=1;
 assert.deepEqual(api.warSupplyPathV106(current,'CON-T03'),['CON-T01','CON-T02','CON-T03']);
 current.turn=2;assert.equal(api.warSupplyPathV106(current,'CON-T03'),null);
 current.territories['CON-T01'].installationIntact=false;assert.equal(api.warSupplyPathV106(current,'CON-T01'),null);
});

test('all thirty historical worlds and twenty-seven formats expose only real supply links',()=>{
 const generated=[];
 for(const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103)for(const regionCount of api.WAR_PLANET_REGION_COUNTS_V103){
  if(territoryCount<3*regionCount)continue;
  generated.push(api.encodeWarPlanetV103(api.normalizeWarPlanetRecipeV103({seed:10637,territoryCount,regionCount,regionBalance:'uneven'})));
 }
 assert.equal(generated.length,27);
 for(const id of [...api.WAR_PLANETS_V96.map(world=>world.id),...generated]){
  const current=api.createWarSimulationV85(undefined,id),supplied=api.warSuppliedV85(current);
  for(const [id,site] of Object.entries(current.territories))if(site.controller==='CON-F01'){
   const route=api.warSupplyPathV106(current,id);assert.equal(!!route,supplied.has(id),`${current.planetId ?? "korthas"}/${id}`);
   if(route){assert.equal(route.at(-1),id);for(let i=1;i<route.length;i++)assert(api.warTerritoryForSimulationV96(current,route[i-1]).neighbors.includes(route[i]));}
  }
 }
});
