import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const world=load('homeworldWorldV77'),urban=load('homeworldUrbanLayoutV78'),city=load('homeworldCity');
const civic=load('homeworldCivicWorldV80'),geometry=load('homeworldGeometryV64'),recovery=load('homeworldGeometryRecoveryV112');
const helper=load('homeworldMarshGroundJointsV113'),natural=load('homeworldNaturalPlacementsV112');
const retained=[...world.HOMEWORLD_RETAINED_GROUND_V113,...world.HOMEWORLD_CONNECTOR_PADS_V82,...urban.HOMEWORLD_URBAN_GROUND_V78];
const prior=retained.filter(row=>row.levelId==='0'),joints=world.HOMEWORLD_MARSH_GROUND_JOINTS_V113;
// An independent module cache disables only the new additive provider before
// floor/collision registries initialize. This is a declared unit fixture,
// never a browser move, a historical runtime or a gameplay-source mutation.
const beforeQa=homeworldSceneSsrV78();
beforeQa.load('app/game/systems/homeworldMarshGroundJointsV113.ts').HOMEWORLD_MARSH_GROUND_JOINT_LIMITS_V113.maxGap=0;
const beforeLoad=name=>beforeQa.load('app/game/systems/'+name+'.ts');
const inside=(p,rows)=>rows.some(row=>city.pointInHomeworldPolygon(p,row.polygon));
const nearEdge=(p,polygon)=>polygon.some((a,i)=>{
 const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<1e-6;
});

test('the three same-level fissures produce bounded real joints without removing or changing retained support',()=>{
 const before=JSON.stringify(retained),plan=helper.planHomeworldMarshGroundJointsV113(retained);
 assert.equal(JSON.stringify(retained),before);assert.deepEqual(plan.joints,joints);
 assert.deepEqual(helper.compileHomeworldMarshGroundJointsV113(retained),joints);
 assert.throws(()=>helper.compileHomeworldMarshGroundJointsV113([...retained,...joints]),/once/);
 assert.equal(joints.length,13);assert(joints.every(row=>row.levelId==='0'&&row.kind==='passage'&&row.maxGapWidth<=64+1e-6));
 const area=joints.reduce((sum,row)=>sum+row.area,0);assert(area>37000&&area<40000,{area});
 assert.deepEqual(world.HOMEWORLD_GROUND_V77.filter(row=>!row.id.startsWith('ground-joint-v113:')),world.HOMEWORLD_RETAINED_GROUND_V113);
 let sampled=0;
 for(const row of joints){
  const [lt,rt,rb,lb]=row.polygon;
  for(let yi=1;yi<20;yi++)for(let xi=1;xi<10;xi++){
   const t=yi/20,left=lt.x+(lb.x-lt.x)*t,right=rt.x+(rb.x-rt.x)*t,p={x:left+(right-left)*xi/10,y:lt.y+(lb.y-lt.y)*t};sampled++;
   assert(!prior.some(g=>inside(p,[g])&&!nearEdge(p,g.polygon)),JSON.stringify({id:row.id,p}));
   assert(inside(p,world.HOMEWORLD_GROUND_V77));
  }
 }
 assert(sampled>2000);
 assert(!inside({x:6133,y:2800},joints),'the retained rampart court is not a new joint');
 const widerGap={x:6653,y:2800};
 assert(!inside(widerGap,joints),'the wider eastern exterior gap is explicitly outside this repair');
 assert(!world.homeworldTerrainV77('0',widerGap,{halfWidth:0,halfDepth:0}));
 for(const p of [{x:6133,y:2414.5102914591153},{x:6133,y:3092.5198227981664},{x:6653,y:2685.7141039947355}]){
  assert(!inside(p,prior));assert(inside(p,joints));assert(world.homeworldTerrainV77('0',p));
  assert(!recovery.homeworldBeforePublicPlacesWalkableV112(p),'new V113 support must never be attributed to the old layout');
 }
});

test('a full native actor can cross each repaired fissure and return through the actual civic controller',()=>{
 const routes=[{from:{x:6175,y:2500},to:{x:6080,y:2500}},{from:{x:6175,y:3250},to:{x:6050,y:3250}},
  {from:{x:6600,y:2700},to:{x:6750,y:2700}}];
 for(const {from,to}of routes){
  let actor={...world.createHomeworldWorldActorV77(),...from,vx:0,vy:0};
  for(const target of [to,from]){
   let steps=0;
   for(;steps<600&&Math.hypot(actor.x-target.x,actor.y-target.y)>3;steps++){
    const moveX=Math.sign(target.x-actor.x);
    actor=civic.stepHomeworldCivicActorV80(actor,{moveX,climb:0,jumpPressed:false},1/120,'0');
    assert(civic.homeworldCivicWalkableV80('0',actor));
   }
   assert(Math.hypot(actor.x-target.x,actor.y-target.y)<=3,JSON.stringify({from,to,target,actor,steps}));
  }
 }
 const dock=world.HOMEWORLD_BUILDINGS_V77.find(row=>row.id==='dock-control'),door=geometry.homeworldBuildingDoorwayV64(dock);
 assert(civic.homeworldCivicWalkableV80('0',door.approach));
 assert.equal(world.nearestHomeworldDoorV77('0',door.approach)?.id,'dock-control');
 assert.equal(natural.HOMEWORLD_NATURAL_MODULES_V112.length,315);assert.equal(natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.length,39);
});

test('the existing paving renderer and native exclusion mask consume every physical joint once',()=>{
 const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:{x:6473,y:2800},levelId:'0',camera:{x:5800,y:1000,viewWidth:1500,viewHeight:1200},seconds:0,activeDoorId:null,activePointId:null});
 for(const row of joints){
  assert.equal([...html.matchAll(new RegExp('data-world-ground-id-v77="'+row.id+'"','g'))].length,1);
  assert(html.includes('data-ecotone-public-exclusion-v112="'+row.id+'"'));
 }
 assert(!html.includes('data-homeworld-marsh-bank-v113='),'there is no independent visual-only bridge or stone strip');
});

test('retained objects, door approaches, solids and all sampled former support survive the added joints',()=>{
 const oldWorld=beforeLoad('homeworldWorldV77'),oldCivic=beforeLoad('homeworldCivicWorldV80'),oldGeometry=beforeLoad('homeworldGeometryV64');
 assert.equal(oldWorld.HOMEWORLD_MARSH_GROUND_JOINTS_V113.length,0);
 for(const key of ['HOMEWORLD_BUILDINGS_V77','HOMEWORLD_PROPS_V77','HOMEWORLD_FRONTAGE_V77','HOMEWORLD_EXTERIOR_V77','HOMEWORLD_CONNECTORS_V77','HOMEWORLD_POINTS_V77','HOMEWORLD_CONNECTIONS_V77'])assert.deepEqual(world[key],oldWorld[key],key);
 assert.deepEqual(load('homeworldStreetModulesV78').HOMEWORLD_CITY_GENERATED_PROPS_V78,beforeLoad('homeworldStreetModulesV78').HOMEWORLD_CITY_GENERATED_PROPS_V78);
 assert.deepEqual(natural.HOMEWORLD_NATURAL_MODULES_V112,beforeLoad('homeworldNaturalPlacementsV112').HOMEWORLD_NATURAL_MODULES_V112);
 for(const building of world.HOMEWORLD_BUILDINGS_V77)assert.deepEqual(geometry.homeworldBuildingDoorwayV64(building),oldGeometry.homeworldBuildingDoorwayV64(oldWorld.HOMEWORLD_BUILDINGS_V77.find(row=>row.id===building.id)));
 for(const body of [{halfWidth:24,halfDepth:14},{halfWidth:36,halfDepth:26}])for(let x=6000;x<=6800;x+=20)for(let y=2150;y<=3460;y+=30){
  const p={x,y};if(oldWorld.homeworldTerrainV77('0',p,body))assert(world.homeworldTerrainV77('0',p,body));
  assert.deepEqual(civic.homeworldCivicCollisionV80('0',p,body),oldCivic.homeworldCivicCollisionV80('0',p,body));
 }
});
