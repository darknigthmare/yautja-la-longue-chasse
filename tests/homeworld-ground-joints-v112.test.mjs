import test from 'node:test';
import assert from 'node:assert/strict';
import {scanHomeworldGroundJointsV112} from '../scripts/audit-homeworld-spatial-v112.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const joints=load('homeworldGroundJointsV112'),world=load('homeworldWorldV77');
const city=load('homeworldCity'),urban=load('homeworldUrbanLayoutV78'),geometry=load('homeworldGeometryV64');
const patches=joints.HOMEWORLD_GROUND_JOINTS_V112,ids=new Set(patches.map(item=>item.id));
const grounds=[...world.HOMEWORLD_GROUND_V77,...world.HOMEWORLD_CONNECTOR_PADS_V82,...urban.HOMEWORLD_URBAN_GROUND_V78];
const prior=grounds.filter(item=>!ids.has(item.id));
const contains=(rows,p)=>rows.some(item=>item.levelId==='0'&&city.pointInHomeworldPolygon(p,item.polygon));
const bodies=[{halfWidth:24,halfDepth:14},{halfWidth:36,halfDepth:26}];
const oldFaceIds=['forecourt-v76:trophy-mausoleum:2:12','coast-west:0:2:2'];

// An independent module cache removes only these two additive polygons before
// the real floor index, collision providers and exposed-face extractor load.
// No historical source, terrain algorithm or shared runtime is modified.
const beforeQa=homeworldSceneSsrV78();
beforeQa.load('app/game/systems/homeworldGroundJointsV112.ts').HOMEWORLD_GROUND_JOINTS_V112.splice(0);
const beforeLoad=name=>beforeQa.load('app/game/systems/'+name+'.ts');
const beforeWorld=beforeLoad('homeworldWorldV77');

test('the two exact joints occupy measured unsupported pockets between retained same-floor pavements',()=>{
  assert.deepEqual(patches.map(item=>item.id),[
    'foundation-v112:joint-mausoleum-western-promenade','foundation-v112:joint-mausoleum-coast-west',
  ]);
  assert.deepEqual(patches.map(item=>item.polygon),[
    [{x:410,y:2100.650957121848},{x:440,y:2113.0457741844666},{x:440,y:2135.4804326965245},{x:410,y:2137.8241826965245}],
    [{x:410,y:1930},{x:432.5123533000317,y:1930},{x:410,y:1984.488145778108}],
  ]);
  let interiorSamples=0;
  for(const joint of patches){
    assert.equal(joint.levelId,'0');
    assert.equal(world.HOMEWORLD_GROUND_V77.filter(item=>item.id===joint.id).length,1);
    assert.equal(contains(prior,joint.witness),false,'the observed crack must exist before repair');
    assert.equal(contains(grounds,joint.witness),true);
    for(const sourceId of joint.sourceIds)assert(prior.some(item=>item.id===sourceId&&item.levelId==='0'),sourceId);
    const left=Math.min(...joint.polygon.map(p=>p.x)),right=Math.max(...joint.polygon.map(p=>p.x));
    const top=Math.min(...joint.polygon.map(p=>p.y)),bottom=Math.max(...joint.polygon.map(p=>p.y));
    for(let x=left+.25;x<right;x+=.5)for(let y=top+.25;y<bottom;y+=.5){
      const p={x,y};if(!city.pointInHomeworldPolygon(p,joint.polygon))continue;
      assert.equal(contains(prior,p),false,'the exact joint must not grow a lip over retained paving');interiorSamples++;
    }
  }
  assert(interiorSamples>5000,'test the whole tiny gaps rather than only their witness pixels');
});

test('the full bounded unit-grid sweep removes both enclosed cracks while preserving open relief',()=>{
  const bounds=joints.HOMEWORLD_GROUND_JOINT_SCAN_V112;
  assert.deepEqual(bounds,{left:100,right:1200,top:1800,bottom:2500,step:1});
  const before=scanHomeworldGroundJointsV112(prior,city.pointInHomeworldPolygon,bounds);
  const after=scanHomeworldGroundJointsV112(grounds,city.pointInHomeworldPolygon,bounds);
  assert.deepEqual(before.enclosed.map(item=>item.samples).sort((a,b)=>a-b),[612,895]);
  assert.deepEqual(after.enclosed,[]);
  assert.equal(before.exteriorSamples,34485);assert.equal(after.exteriorSamples,before.exteriorSamples);
  for(const p of [{x:100,y:2500},{x:80,y:2120},{x:0,y:1800},{x:2000,y:6400}]){
    assert.equal(beforeWorld.homeworldTerrainV77('0',p),false);
    assert.equal(world.homeworldTerrainV77('0',p),false,'a local seam repair must not open a broad outside route');
  }
});

test('native and enlarged bodies gain continuous support across the joints without bypassing a solid',()=>{
  const civic=load('homeworldCivicWorldV80'),beforeCivic=beforeLoad('homeworldCivicWorldV80');
  for(const body of bodies){
    for(const joint of patches){
      assert.equal(beforeWorld.homeworldTerrainV77('0',joint.witness,body),false);
      assert.equal(world.homeworldTerrainV77('0',joint.witness,body),true);
      assert.deepEqual(civic.homeworldCivicCollisionV80('0',joint.witness,body),beforeCivic.homeworldCivicCollisionV80('0',joint.witness,body));
    }
    for(const y of [1930,2122])for(let x=370;x<=470;x++){
      assert.equal(world.homeworldTerrainV77('0',{x,y},body),true,`${x},${y}: all nine body contacts need floor`);
      assert.equal(civic.homeworldCivicCollisionV80('0',{x,y},body),null);
    }
    const start={...world.createHomeworldWorldActorV77(),x:375,y:2122,vx:0,vy:0};
    const drive=provider=>{let actor={...start};for(let step=0;step<20&&actor.x<465;step++)actor=city.stepHomeworldActorOnFloor(actor,{moveX:1,climb:0,jumpPressed:false},1/60,p=>provider.homeworldCivicWalkableV80('0',p,body),()=>({...start}));return actor;};
    assert(drive(beforeCivic).x<410,'the retained integrator previously stopped at the crack');
    assert(drive(civic).x>=465,'the same integrator now crosses on continuous full-body floor');
  }
});

test('retained solids, thresholds, floor ownership and recovery history stay unchanged',()=>{
  const civic=load('homeworldCivicWorldV80'),beforeCivic=beforeLoad('homeworldCivicWorldV80');
  const beforeGeometry=beforeLoad('homeworldGeometryV64');
  for(const key of ['HOMEWORLD_BUILDINGS_V77','HOMEWORLD_PROPS_V77','HOMEWORLD_FRONTAGE_V77','HOMEWORLD_EXTERIOR_V77','HOMEWORLD_CONNECTORS_V77','HOMEWORLD_POINTS_V77','HOMEWORLD_CONNECTIONS_V77'])assert.deepEqual(world[key],beforeWorld[key],key);
  for(const building of world.HOMEWORLD_BUILDINGS_V77){
    const original=beforeWorld.HOMEWORLD_BUILDINGS_V77.find(item=>item.id===building.id);
    assert.deepEqual(geometry.homeworldBuildingDoorwayV64(building),beforeGeometry.homeworldBuildingDoorwayV64(original));
  }
  for(const body of bodies)for(let x=375;x<=925;x+=25)for(let y=1750;y<=2250;y+=25){
    assert.deepEqual(civic.homeworldCivicCollisionV80('0',{x,y},body),beforeCivic.homeworldCivicCollisionV80('0',{x,y},body),`retained collision at ${x},${y}`);
  }
  assert.equal(civic.homeworldCivicCollisionV80('0',patches[1].witness,bodies[0])?.id,'v75-frontage:trophy-mausoleum:1','repairing floor does not remove the real nearby frontage');
  for(const joint of patches)for(const level of world.HOMEWORLD_LEVELS_V77.filter(item=>item.id!=='0'))for(const body of bodies)assert.equal(world.homeworldTerrainV77(level.id,joint.witness,body),beforeWorld.homeworldTerrainV77(level.id,joint.witness,body));
  const recovery=load('homeworldGeometryRecoveryV112');
  for(const joint of patches)assert.equal(recovery.homeworldBeforePublicPlacesWalkableV112(joint.witness,undefined,{halfWidth:0,halfDepth:0}),false,'new joints must not be claimed as historical floor');
});

test('physical floor, actual paving, rock mask, atlas and codex share exactly the same joint polygons',()=>{
  const camera={x:0,y:1200,viewWidth:1800,viewHeight:1800};
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:{x:500,y:2120},levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null});
  const atlas=qa.render('app/game/HomeworldWorldMapV77.tsx',{actor:{x:500,y:2120},levelId:'0',open:true,onOpenChange:()=>{}});
  const records=load('homeworldSpatialCodexV112').HOMEWORLD_SPATIAL_CODEX_V112;
  const natural=load('homeworldNaturalPlacementsV112').HOMEWORLD_NATURAL_PUBLIC_GROUND_V112;
  const mask=html.match(/<mask\b[^>]*>[\s\S]*?<\/mask>/)?.[0];assert(mask);
  for(const joint of patches){
    const projected=joint.polygon.map(p=>`${p.x},${p.y*geometry.HOMEWORLD_GEOMETRY_V64.depthScale}`).join(' ');
    const polygon=[...html.matchAll(/<polygon\b[^>]*>/g)].find(match=>match[0].includes(`data-world-ground-id-v77="${joint.id}"`))?.[0];
    assert(polygon?.includes(`points="${projected}"`));assert(polygon.includes('opacity="1"'));
    assert(mask.includes(`points="${projected}" fill="black"`),'native rock must stay behind the same new paving');
    assert.deepEqual(natural.find(item=>item.id===joint.id)?.polygon,joint.polygon);
    assert(atlas.includes(`points="${joint.polygon.map(p=>`${p.x},${p.y}`).join(' ')}" fill="#39362a" stroke="#706146" stroke-width="5"><title>${joint.id}</title>`));
    const record=records.find(item=>item.id===joint.id);assert(record);assert.equal(record.category,'street');
    assert.deepEqual(record.footprint.polygon,joint.polygon);assert.deepEqual(record.associatedElementIds,joint.sourceIds);
    assert.equal(record.door,null);assert.equal(record.asset,null);
  }
});

test('only the two false interior cliff faces disappear and every true exposed face keeps its exact geometry',()=>{
  const before=beforeLoad('homeworldBackdropV81'),after=load('homeworldBackdropV81');
  const signature=edge=>[edge.a,edge.b].map(p=>`${p.x.toFixed(8)},${p.y.toFixed(8)}`).sort().join('|');
  const oldEdges=before.HOMEWORLD_EXPOSED_EDGES_V81['0'];
  for(const id of oldFaceIds)assert(oldEdges.some(item=>item.id===id),'the old actual extractor must reproduce the false interior cliff');
  assert.equal(oldEdges.length,155);assert.equal(after.HOMEWORLD_EXPOSED_EDGES_V81['0'].length,153);
  for(const level of world.HOMEWORLD_LEVELS_V77){
    const expected=before.HOMEWORLD_EXPOSED_EDGES_V81[level.id].filter(item=>!oldFaceIds.includes(item.id));
    assert.deepEqual(after.HOMEWORLD_EXPOSED_EDGES_V81[level.id].map(signature).sort(),expected.map(signature).sort(),'outer cliff geometry must neither grow nor leave new seams');
  }
  const html=qa.render('app/game/HomeworldBackdropV81.tsx',{camera:{x:-2000,y:-2000,viewWidth:18000,viewHeight:16000},levelId:'0',paintedLevels:['0'],seconds:0,reducedMotion:true});
  for(const id of oldFaceIds)assert(!html.includes(`data-homeworld-exposed-ground-edge-v81="${id}"`));
  for(const joint of patches)assert(!after.HOMEWORLD_EXPOSED_EDGES_V81['0'].some(edge=>edge.id.startsWith(joint.id+':')),'an enclosed joint has no new freestanding cliff');
  for(const edge of after.HOMEWORLD_EXPOSED_EDGES_V81['0']){
    const group=[...html.matchAll(/<g\b[^>]*data-homeworld-exposed-ground-edge-v81="([^"]+)"[^>]*>[\s\S]*?<\/g>/g)].find(match=>match[1]===edge.id)?.[0];assert(group,edge.id);
    const [a,b]=after.homeworldProjectEdgeV81(edge),drop=after.homeworldFoundationDepthV81('0');
    const quad=`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y+drop} ${a.x},${a.y+drop}`;
    assert.equal(group.split(`points="${quad}"`).length-1,2,'the painted face and opaque backing must meet the exact same floor edge');
    assert(group.includes('fill="#1c1510"'));assert(group.includes(`d="M${a.x} ${a.y}L${b.x} ${b.y}"`));
  }
});
