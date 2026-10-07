import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const routine=load('homeworldCivilianRoutinesV84'),world=load('homeworldWorldV77');
const interiors=load('homeworldInteriorsV64'),street=load('homeworldStreetDecorMountV84'),streetGeometry=load('homeworldStreetDecorV84');
const library=load('recentSpriteLibraryV85');
const body={halfWidth:28,halfDepth:18};
function reachableFloor(room){
 const origin=room.spawn,queue=[origin],seen=new Set(['0,0']);
 assert(interiors.isHomeworldInteriorWalkableV64(room,origin,body),'spawn obstructed '+room.id);
 for(let index=0;index<queue.length;index++){
  const p=queue[index],x=Math.round((p.x-origin.x)/4),y=Math.round((p.y-origin.y)/4);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const key=(x+dx)+','+(y+dy);if(seen.has(key))continue;
   if(![1,2,3,4].every(step=>interiors.isHomeworldInteriorWalkableV64(room,{x:p.x+dx*step,y:p.y+dy*step},body)))continue;
   seen.add(key);queue.push({x:p.x+dx*4,y:p.y+dy*4});
  }
 }
 return queue;
}

for(const buildingId of['dock-control','convoy-workshop','convoy-store'])test(buildingId+': V84 keeps exit, old services, five zones and authored passages reachable',()=>{
 const room=interiors.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId===buildingId);assert(room?.portComplexV84);
 const floor=reachableFloor(room);
 assert(floor.some(p=>interiors.nearestHomeworldInteriorTargetV64(room,p)?.kind==='exit'),'exit unreachable');
 for(const point of room.points)assert(floor.some(p=>interiors.nearestHomeworldInteriorTargetV64(room,p)?.pointId===point.pointId),'service unreachable '+point.pointId);
 assert.equal(room.zones.length,5);
 for(const zone of room.zones)assert(floor.some(p=>p.x-body.halfWidth>=zone.x&&p.x+body.halfWidth<=zone.x+zone.width&&p.y-body.halfDepth>=zone.y&&p.y+body.halfDepth<=zone.y+zone.depth),'zone unreachable '+zone.id);
 for(const passage of room.portComplexV84.passages){assert(interiors.isHomeworldInteriorWalkableV64(room,passage,body),'blocked passage '+passage.id);assert(floor.some(p=>Math.hypot(p.x-passage.x,p.y-passage.y)<7),'passage isolated '+passage.id);}
});

test('clan-lodge preserves the V77 hospitality host/table and a real walk from spawn to their approach',()=>{
 const room=interiors.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='clan-lodge'),physical=load('homeworldCntlipPhysicalV77');
 const host=physical.HOMEWORLD_CNTLIP_HOSTS_V77.find(host=>host.siteId==='clan-common'),floor=reachableFloor(room);
 assert.deepEqual({x:host.x,y:host.y,approach:host.approach},{x:330,y:130,approach:{x:404,y:130}});
 assert(interiors.isHomeworldInteriorWalkableV64(room,host.approach,body));
 assert(floor.some(p=>Math.hypot(p.x-host.approach.x,p.y-host.approach.y)<7),'hospitality approach isolated from spawn');
 assert(floor.some(p=>physical.homeworldCntlipReachedV77(room,p)?.id===host.id),'hospitality unavailable on all reachable floor');
 const table=room.furniture.find(f=>f.id===host.tableId);assert.deepEqual({x:table.x,y:table.y},{x:403.5,y:90});
 for(const zone of room.zones)assert(floor.some(p=>p.x-body.halfWidth>=zone.x&&p.x+body.halfWidth<=zone.x+zone.width&&p.y-body.halfDepth>=zone.y&&p.y+body.halfDepth<=zone.y+zone.depth),'public zone isolated '+zone.id);
 for(const passage of room.publicComplexV83.passages)assert(floor.some(p=>Math.hypot(p.x-passage.x,p.y-passage.y)<7),'public passage isolated '+passage.id);
});

test('V84 static geometry has finite contact polygons, separates candidates/refusals and uses mounted solids only',()=>{
 const candidates=streetGeometry.HOMEWORLD_STREET_DECOR_CANDIDATES_V84;
 assert.equal(candidates.length,12);
 const mounted=street.HOMEWORLD_STREET_DECOR_PROPS_V84,refused=street.HOMEWORLD_STREET_DECOR_REFUSALS_V84;
 assert.equal(mounted.length+refused.length,candidates.length);
 assert.equal(mounted.length,10);assert.equal(refused.length,2);
 const repeat=streetGeometry.compileHomeworldStreetDecorV84(street.HOMEWORLD_STREET_DECOR_INPUT_V84);
 assert.deepEqual(repeat.accepted,mounted,'compilation cannot reject its own mounted colliders');assert.deepEqual(repeat.refusals,refused);
 assert.equal(new Set([...mounted,...refused].map(p=>p.id)).size,candidates.length);
 for(const item of candidates){const polygon=streetGeometry.homeworldStreetDecorPolygonV84(item);assert(polygon.length>=3);assert(polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
 for(const item of mounted){const polygon=streetGeometry.homeworldStreetDecorPolygonV84(item),center={x:polygon.reduce((n,p)=>n+p.x,0)/polygon.length,y:polygon.reduce((n,p)=>n+p.y,0)/polygon.length};assert.equal(streetGeometry.homeworldStreetDecorCollisionV84(item.levelId,center,{halfWidth:0,halfDepth:0}),item.id);assert(world.homeworldCollisionV77(item.levelId,center,{halfWidth:0,halfDepth:0}));}
 console.log('V84 mounted/refused',JSON.stringify({mounted:mounted.map(p=>p.id),refused}));
});

test('V84 movement follows both polyline directions, shares its city clock and returns to the original start',()=>{
 const resident={id:'test-polyline',districtId:'forges',name:'Local test artisan',role:'Ajusteur',morphId:'classic',path:[{x:0,y:0},{x:80,y:0},{x:80,y:60}],speed:20,dwellSeconds:3,phaseSeconds:0};
 const timing=routine.homeworldCivilianRoutineV84(resident),travel=7,cycle=travel*2+timing.endHaltSeconds+timing.startHaltSeconds;
 const at=time=>routine.homeworldCivilianPoseV84(resident,time+cycle-timing.phaseSeconds);
 const outbound=at(2),end=at(travel+.5),back=at(travel+timing.endHaltSeconds+5),start=at(travel*2+timing.endHaltSeconds+.5);
 assert.equal(outbound.phase,'outbound');assert(Math.abs(outbound.x-40)<1e-8);assert.equal(outbound.y,0);assert.equal(outbound.facing,1);assert(Math.abs(outbound.motionSeconds-2)<1e-8);
 assert.equal(end.phase,'end-halt');assert.equal(end.moving,false);assert.equal(end.x,80);assert.equal(end.y,60);
 assert.equal(back.phase,'return');assert(Math.abs(back.x-40)<1e-8);assert.equal(back.y,0);assert.equal(back.facing,-1);assert(Math.abs(back.motionSeconds-5)<1e-8);
 assert.equal(start.phase,'start-halt');assert.equal(start.x,0);assert.equal(start.y,0);assert.equal(start.moving,false);
 assert.deepEqual(at(2),at(2),'the same paused clock cannot advance a routine');
 for(const r of world.HOMEWORLD_RESIDENTS_V77)assert.deepEqual(world.homeworldResidentPoseV77(r,42),routine.homeworldCivilianPoseV84(r,42));
 const still=routine.homeworldCivilianPoseV84({...resident,path:[{x:14,y:9}],speed:0},NaN);assert.deepEqual({x:still.x,y:still.y,moving:still.moving},{x:14,y:9,moving:false});
});

test('actual SSR mounts all ten accepted street props on their own floor and never draws the two refusals',()=>{
 const props={actor:world.createHomeworldWorldActorV77(),camera:{x:-2000,y:-5000,viewWidth:18000,viewHeight:20000},seconds:42,activeDoorId:null,activePointId:null};
 for(const levelId of['0','-1A','+1']){
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{...props,levelId});
  for(const item of street.HOMEWORLD_STREET_DECOR_PROPS_V84)assert.equal(html.includes('data-homeworld-prop-id="'+item.id+'"'),item.levelId===levelId,'renderer floor '+item.id);
  for(const refused of street.HOMEWORLD_STREET_DECOR_REFUSALS_V84)assert(!html.includes('data-homeworld-prop-id="'+refused.id+'"'));
 }
});

test('return walking renders the native left clip and reduced motion freezes its frame without fabricating art',()=>{
 const motion=load('homeworldCivilianMotionV74'),props={role:'artisan',facing:-1,moving:true,seconds:2.1,speed:34};
 const native=motion.homeworldCivilianMotionFrameV74('artisan',props.seconds,-1,undefined,props.speed),html=qa.render('app/game/HomeworldCivilianV72.tsx',props);
 assert(html.includes('data-native-clip="walk-left"'));assert(html.includes('data-native-frame="'+native.index+'"'));assert(html.includes(native.source.src));assert(!html.includes('scaleX('));
 const frozen=qa.render('app/game/HomeworldCivilianV72.tsx',{...props,reducedMotion:true}),first=motion.homeworldCivilianMotionFrameV74('artisan',0,-1,undefined,props.speed);
 assert(frozen.includes('data-native-frame="'+first.index+'"'));assert(frozen.includes(first.source.src));
});

test('V85 portrait matches cannot borrow a role from a clan label or assign a named local person at random',()=>{
 assert.equal(library.findImportedYautjaArtV85({}),null);
 assert.equal(library.findImportedYautjaArtV85({clanName:'Artisans de la Roche Chaude',role:'artisan'}),null,'clan name is not a documented occupation');
 assert.equal(library.findImportedYautjaArtV85({name:'Kesh'}),null);
 const guard=library.findImportedYautjaArtV85({clanName:'Maisons des Braises',role:'patrouille'});assert(guard);assert.equal(guard.groupId,'maisons-des-braises');assert.equal(guard.motionStatus,'single-pose-static');
 assert.equal(library.findImportedYautjaArtV85({clanName:'Maisons du Givre',role:'soigneur'}),null,'absence retains the old portrait');
 const approved=library.RECENT_SPRITE_ASSETS_V85.filter(a=>a.packId==='approved-hunters');assert.equal(approved.length,7);assert.equal(new Set(approved.map(a=>a.identityId)).size,7);
 assert(approved.every(a=>a.motionStatus==='single-pose-static'&&a.canonicalFidelity==='not-certified-1-to-1'));
 const historical=library.RECENT_SPRITE_ASSETS_V85.find(a=>a.kind==='npc'&&!a.preferredVersion);assert(historical);
 assert.equal(library.findImportedYautjaArtV85({assetId:historical.id}),null);
 assert.equal(library.findImportedYautjaArtV85({assetId:historical.id,includeHistorical:true})?.assetId,historical.id);
 assert(library.importedYautjaArtVariantsV85({identityId:historical.identityId,includeHistorical:true}).every(a=>a.identityId===historical.identityId));
});

test('ten exact village clans receive only documented watch references, never named-person or child substitutions',()=>{
 const portraits=load('homeworldVillagePortraitsV85'),regions=load('homeworldRegionsV68'),life=load('homeworldVillageLifeV69');let matches=0;
 assert.equal(portraits.HOMEWORLD_VILLAGE_PORTRAIT_REFERENCES_V85.length,10);
 for(const region of Object.values(regions.HOMEWORLD_REGIONS_V68)){
  for(const resident of[...region.residents,...life.HOMEWORLD_VILLAGE_LIFE_V69[region.id].residents]){
   const result=portraits.homeworldVillagePortraitReferenceV85(region.clan,resident);
   if(result){matches++;assert.equal(result.asset.groupLabel,region.clan);assert.equal(result.asset.role,'guetteur');assert.equal(result.identity,'reference-of-clan-job-not-named-person');assert.equal(result.residentId,resident.id);
    const original=library.recentSpriteByIdV85(result.asset.id);assert.equal(original?.sha256,result.asset.sha256);assert.equal(original?.src,result.asset.src);
   }else assert(!['Veilleur','Veilleuse','Veilleuse de relève'].includes(resident.role));
  }
  for(const role of['Soigneuse','Artisane des conduits','Aspirant accompagné','Porteur'])assert.equal(portraits.homeworldVillagePortraitReferenceV85(region.clan,{id:'private',name:'Kesh',role}),null);
 }
 assert.equal(matches,40);
 assert.equal(portraits.homeworldVillagePortraitReferenceV85('Unknown',{id:'private',name:'Kesh',role:'Veilleur'}),null);
});

test('actual village source card keeps the modular walking actor and labels its source as a job reference',()=>{
 const life=load('homeworldVillageLifeV69'),resident=life.HOMEWORLD_VILLAGE_LIFE_V69['ash-marches'].residents.find(n=>n.role==='Veilleuse de relève');
 const pose=life.homeworldVillageResidentPoseV69('ash-marches',resident,60),actor={x:pose.x+150,y:pose.y};
 const html=qa.render('app/game/HomeworldVillageLifeV69.tsx',{regionId:'ash-marches',tick:60,actor,rect:{left:0,top:0,right:5000,bottom:5000}});
 assert(html.includes('data-homeworld-portrait-reference-v85="'+resident.id+'"'));assert(html.includes('reference-of-clan-job-not-named-person'));
 assert(html.includes('data-region-village-resident-v69="'+resident.id+'"'),'original modular resident remains rendered');
 assert(html.includes('pas le visage identifié de cet habitant'));assert(html.includes('/game/imports/v85/library/'));
 const small=qa.render('app/game/HomeworldVillageLifeV69.tsx',{regionId:'ash-marches',tick:60,actor,rect:{left:actor.x-110,top:0,right:actor.x+110,bottom:5000}});
 assert(!small.includes('data-homeworld-portrait-reference-v85='),'a card that would cover the player is not mounted');
});
