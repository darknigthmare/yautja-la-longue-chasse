import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78();
const routes=qa.load('app/game/systems/spaceRoutesV159.ts');
const saves=qa.load('app/game/save.ts');
const catalogue=qa.load('app/game/shipCatalogue.ts');
const owner='2026-11-20T10:00:00.000Z', key=saves.SAVE_STORAGE_KEY;
const SHIP=catalogue.DEFAULT_SHIP_ID, fleet={selectedShipId:SHIP,unlockedShipIds:[SHIP]};

function store(){
 const data=new Map();
 return {data,get length(){return data.size;},key(i){return [...data.keys()][i]??null;},
  getItem(n){return data.get(n)??null;},setItem(n,v){data.set(n,v);},removeItem(n){data.delete(n);}};
}
function blooded(){const s=saves.defaultSave(owner);s.profile.honor=250;s.profile.rankId='blooded';return s;}
const ctx=(save,f=fleet)=>({ownerCreatedAt:owner,ship:routes.spacePersonalShipV159(save,f)});
function act(state,action,save=blooded()){
 const r=routes.actSpaceRoutesV159(state,action,ctx(save));assert(r.accepted,r.message);return r;
}

test('source : 36 incidents V6, 10 bases, STATE5-17 à 20, empreinte du classeur',()=>{
 assert.equal(routes.SPACE_ROUTES_SOURCE_V159.source.sha256,'87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183');
 assert.equal(routes.SPACE_INCIDENTS_V159.length,36);
 assert.deepEqual(routes.SPACE_INCIDENTS_V159.map(i=>i.id),Array.from({length:36},(_,i)=>`SPACE-E${String(i+1).padStart(2,'0')}`));
 const e01=routes.spaceIncidentV159('SPACE-E01');
 assert.equal(e01.title,'Trois balises, deux routes');assert.equal(e01.baseId,'SPACE-BASE-01');
 assert.deepEqual([...e01.choices],['route courte coûteuse','escale réparatrice']);
 assert.equal(e01.address,'Incidents des routes!A6:L6');
 for(const i of routes.SPACE_INCIDENTS_V159){assert(routes.spaceBaseV159(i.baseId),i.id);assert(i.choices.every(Boolean),i.id);}
 assert.equal(routes.SPACE_BASES_V159.length,10);
 assert.deepEqual(routes.SPACE_STATE_RULES_V159.map(r=>r.key),['personalShipOwned','personalShipLocation','currentWorldId','travelManifest']);
 assert.match(routes.SPACE_WORLD_ACCESS_V159.text,/vaisseau réellement acquis/);
});

test('routes typées : chaque incident dans un seul type, réseau sur les systèmes existants',()=>{
 const pools=Object.values(routes.SPACE_INCIDENT_POOLS_V159).flat();
 assert.equal(pools.length,36);assert.equal(new Set(pools).size,36);
 const reg=qa.load('app/game/galaxyRegistry.ts').GALAXY_SYSTEM_REGISTRY.map(s=>s.id);
 for(const r of routes.SPACE_ROUTES_V159){
  assert(r.systems.every(id=>reg.includes(id)),r.id);
  assert.equal(r.legs,routes.PROPOSED_ROUTE_LEGS_V159[r.type]);
  assert(routes.SPACE_INCIDENT_POOLS_V159[r.type].length>0);
 }
 assert.deepEqual(new Set(routes.SPACE_ROUTES_V159.map(r=>r.type)),new Set(['clan','humaine','sauvage','interdite']));
 assert.equal(routes.SPACE_ROUTE_TYPES_V159.clan.incidentEvery,2);
 assert.equal(routes.SPACE_ROUTE_TYPES_V159.sauvage.incidentEvery,1);
 assert.equal(routes.SPACE_ROUTE_TYPES_V159.interdite.incidentEvery,1);
});

test('refus sans vaisseau possédé (STATE5-17) et vaisseau amarré',()=>{
 const young=saves.defaultSave(owner);
 const r1=routes.actSpaceRoutesV159(null,{kind:'engage',routeId:'route-oseris-nivalis'},ctx(young));
 assert.equal(r1.accepted,false);assert.equal(r1.state,null);assert.match(r1.message,/Blooded/);
 const r2=routes.actSpaceRoutesV159(null,{kind:'engage',routeId:'route-oseris-nivalis'},ctx(blooded(),{selectedShipId:SHIP,unlockedShipIds:[]}));
 assert.equal(r2.accepted,false);
 const docked={...blooded(),clanShipDocking:{status:'aboard'}};
 const r3=routes.actSpaceRoutesV159(null,{kind:'engage',routeId:'route-oseris-nivalis'},ctx(docked));
 assert.equal(r3.accepted,false);assert.match(r3.message,/amarré/);
 // advancing a trip after the ship stops being owned is refused too
 const started=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 const r4=routes.actSpaceRoutesV159(started,{kind:'advance'},ctx(young));
 assert.equal(r4.accepted,false);assert.deepEqual(r4.state,started);
 // a route that does not leave the current system is refused
 assert.equal(routes.actSpaceRoutesV159(null,{kind:'engage',routeId:'route-umbra-tempest'},ctx(blooded())).accepted,false);
});

test('incident déterministe par identifiant de voyage, sans hasard caché',()=>{
 const a=routes.drawSpaceIncidentV159('voyage-v159-1','route-oseris-nivalis');
 assert.deepEqual(a,routes.drawSpaceIncidentV159('voyage-v159-1','route-oseris-nivalis'));
 assert.deepEqual(a,{incidentId:'SPACE-E33',atLeg:2});
 assert(routes.SPACE_INCIDENT_POOLS_V159.clan.includes(a.incidentId));
 const s1=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 const s2=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 assert.deepEqual(s1,s2);assert.deepEqual(s1.trip.incident,{...a,option:null});
 for(const r of routes.SPACE_ROUTES_V159.filter(r=>r.type==='sauvage'||r.type==='interdite'))
  for(let i=1;i<=8;i++){const d=routes.drawSpaceIncidentV159(routes.spaceTripIdV159(i),r.id);
   assert(d,`${r.id} ${i}`);assert(routes.SPACE_INCIDENT_POOLS_V159[r.type].includes(d.incidentId));assert(d.atLeg>=1&&d.atLeg<=r.legs);}
 const src=fs.readFileSync('app/game/systems/spaceRoutesV159.ts','utf8');
 assert.doesNotMatch(src,/Math\.random|Date\.now/);
});

test('boucle complète : incident bloquant, conséquence appliquée une seule fois, arrivée (STATE5-18/19)',()=>{
 let s=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 assert.deepEqual(s.location,{kind:'route',routeId:'route-oseris-nivalis',fromSystemId:'system-oseris',toSystemId:'system-nivalis'});
 assert.equal(s.currentSystemId,'system-oseris');assert.equal(s.trip.manifest.shipId,SHIP);
 assert.equal(routes.actSpaceRoutesV159(s,{kind:'choose',option:0},ctx(blooded())).accepted,false);
 s=act(s,{kind:'advance'}).state;assert.equal(routes.pendingSpaceIncidentV159(s),null);
 const hit=act(s,{kind:'advance'});s=hit.state;assert.equal(hit.incidentTriggered,'SPACE-E33');
 assert.equal(routes.pendingSpaceIncidentV159(s).id,'SPACE-E33');
 assert.equal(routes.actSpaceRoutesV159(s,{kind:'advance'},ctx(blooded())).accepted,false);
 const chosen=act(s,{kind:'choose',option:1});s=chosen.state;
 assert.equal(s.trip.legsTotal,3);assert.equal(s.incidentLog.length,1);
 assert.deepEqual(s.incidentLog[0],{tripId:'voyage-v159-1',incidentId:'SPACE-E33',option:1,delayLegs:1});
 const again=routes.actSpaceRoutesV159(s,{kind:'choose',option:0},ctx(blooded()));
 assert.equal(again.accepted,false);assert.equal(again.state.trip.legsTotal,3);assert.equal(again.state.incidentLog.length,1);
 const arrived=act(s,{kind:'advance'});s=arrived.state;
 assert.equal(arrived.arrivedAt,'system-nivalis');
 assert.equal(s.currentSystemId,'system-nivalis');assert.deepEqual(s.location,{kind:'system',systemId:'system-nivalis'});
 assert.equal(s.trip,null);assert.equal(s.arrivals.length,1);assert.equal(s.incidentLog.length,1);
 // a forged duplicate of the consequence is refused on read
 const forged=structuredClone(s);forged.incidentLog.push({...forged.incidentLog[0]});
 assert.equal(routes.inspectSpaceRoutesV159(forged,owner).status,'invalid-save');
 // a forged incident (not the deterministic draw) is refused
 const started=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;started.trip.incident.incidentId='SPACE-E01';
 assert.equal(routes.inspectSpaceRoutesV159(started,owner).status,'invalid-save');
});

test('reprise de sauvegarde en plein voyage, incident en attente',()=>{
 let s=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 s=act(s,{kind:'advance'}).state;s=act(s,{kind:'advance'}).state;
 const save={...blooded(),spaceRoutesV159:s},storage=store();
 assert(saves.writeSaveWithStatus(save,storage,key).persisted);
 const loaded=saves.loadSaveWithStatus(storage,key);assert(loaded.loaded,loaded.failure);
 assert.deepEqual(loaded.save.spaceRoutesV159,s);
 const imported=saves.parseSaveImport(saves.exportSave(loaded.save));assert(imported.save,imported.failure);
 assert.deepEqual(imported.save.spaceRoutesV159,s);
 assert.equal(routes.pendingSpaceIncidentV159(imported.save.spaceRoutesV159).id,'SPACE-E33');
 let resumed=act(imported.save.spaceRoutesV159,{kind:'choose',option:0},imported.save).state;
 assert.equal(resumed.trip.legsTotal,2);
 const done=act(resumed,{kind:'advance'},imported.save);
 assert.equal(done.arrivedAt,'system-nivalis');
});

test('ancienne sauvegarde intacte, version future et propriétaire étranger refusés',()=>{
 const old=saves.defaultSave(owner);
 assert.equal(Object.hasOwn(old,'spaceRoutesV159'),false);
 for(const raw of [JSON.stringify(old),saves.exportSave(old)]){
  const r=saves.parseSaveImport(raw);assert(r.save,r.failure);assert.equal(Object.hasOwn(r.save,'spaceRoutesV159'),false);
 }
 assert.equal(saves.parseSaveImport(JSON.stringify({...old,spaceRoutesV159:null})).save.spaceRoutesV159,null);
 const s=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;
 const storage=store();assert(saves.writeSaveWithStatus({...blooded(),spaceRoutesV159:s},storage,key).persisted);
 const bytes=[...storage.data];
 for(const [change,failure] of [
  [x=>{x.spaceRoutesV159.version=2;},'future-version'],
  [x=>{x.spaceRoutesV159.ownerCreatedAt='2026-01-01T00:00:00.000Z';},'invalid-save'],
  [x=>{x.spaceRoutesV159.currentSystemId='system-umbra';},'invalid-save'],
  [x=>{x.spaceRoutesV159.trip.legsTotal=1;},'invalid-save'],
 ]){
  const bad={...blooded(),spaceRoutesV159:structuredClone(s)};change(bad);
  assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,failure);
  assert.equal(saves.writeSaveWithStatus(bad,storage,key).persisted,false);
  assert.deepEqual([...storage.data],bytes);
 }
 const future=routes.actSpaceRoutesV159({...s,version:2},{kind:'advance'},ctx(blooded()));
 assert.equal(future.accepted,false);assert.match(future.message,/version future/);
});

test('rendu SSR du poste de route et intégration à la carte',()=>{
 const props=(state,save=blooded())=>({ownerCreatedAt:owner,state,ship:routes.spacePersonalShipV159(save,fleet),onAction:()=>({accepted:false,changed:false,state,message:''})});
 const idle=qa.render('app/game/SpaceRoutesPanelV159.tsx',props(null));
 assert.match(idle,/Vaisseau à Système Oseris/);
 assert.match(idle,/data-route-id="route-oseris-nivalis"/);assert.match(idle,/data-route-type="clan"/);
 assert.match(idle,/Route humaine/);assert.doesNotMatch(idle,/disabled=""/);
 const refused=qa.render('app/game/SpaceRoutesPanelV159.tsx',props(null,saves.defaultSave(owner)));
 assert.match(refused,/data-ship-owned="false"/);assert.match(refused,/Blooded/);assert.match(refused,/disabled=""/);
 let s=act(null,{kind:'engage',routeId:'route-oseris-nivalis'}).state;s=act(s,{kind:'advance'}).state;s=act(s,{kind:'advance'}).state;
 const incident=qa.render('app/game/SpaceRoutesPanelV159.tsx',props(s));
 assert.match(incident,/data-incident-id="SPACE-E33"/);assert.match(incident,/La relève volontaire/);
 assert.match(incident,/transfert maintenant/);assert.match(incident,/apprentissage prolongé/);
 assert.match(incident,/SPACE-BASE-03/);assert.doesNotMatch(incident,/Parcourir l’étape suivante/);
 const map=fs.readFileSync('app/game/GalaxyMapPanel.tsx','utf8'),client=fs.readFileSync('app/game/GameClient.tsx','utf8');
 assert.match(map,/\{routesPanel\}/);
 assert.match(client,/routesPanel=\{\s*<SpaceRoutesPanelV159/);
 assert.match(client,/persistSocialProgress\(\{ spaceRoutesV159: result\.state \}\)/);
});
