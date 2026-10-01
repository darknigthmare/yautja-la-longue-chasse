import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const bundle=await build({stdin:{contents:"export * from './app/game/systems/homeworldInteriorsV64.ts'; export * from './app/game/systems/homeworldCity.ts'; export * from './app/game/systems/homeworldArtV64.ts'; export * from './app/game/systems/homeworldSpatialCodex.ts'; export * from './app/game/systems/homeworldCharacterPlacementV64.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
// Optional identical model artifact for the browser recipe, when its dependency
// resolver cannot inspect parent directories. No fixture or runtime is changed.
if(process.env.V64_QA_MODEL_FILE)await fs.writeFile(process.env.V64_QA_MODEL_FILE,bundle.outputFiles[0].text);
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const envelopes=JSON.parse(await fs.readFile(new URL('../app/game/data/homeworldInteriorEnvelopesV64.json',import.meta.url),'utf8'));
const rooms=api.HOMEWORLD_INTERIORS_V64;
test('native hero and all twelve modular head/body measurements produce finite visible rectangles',()=>{
  const plate=api.homeworldHeroPlate('jungle-hunter');
  const rect=api.homeworldPortraitPlacementV64(plate.plateId,plate.src);
  assert(rect,'current Jungle Hunter source matches its measurement');
  assert(rect.width>0&&rect.height>0);assert(Object.values(rect).every(Number.isFinite));
  for(const morph of ['classic','elder','super','feral','huntress','young'])for(const head of ['reference','legacy-clan']){
    const placement=api.homeworldModularPlacementV64(morph,head);
    assert(placement,`${morph}/${head}`);assert(placement.width>0&&placement.height>0);assert(Object.values(placement).every(Number.isFinite));
  }
});
test('43 unique bounded rooms preserve 19 civic and 24 domestic entries without invented domestic services',()=>{
  assert.equal(rooms.length,43);assert.equal(new Set(rooms.map(room=>room.buildingId)).size,43);
  assert.equal(rooms.filter(room=>room.kind==='civic').length,19);
  for(const variant of ['rest','meal','storage'])assert.equal(rooms.filter(room=>room.kind==='domestic'&&room.variant===variant).length,8);
  assert.equal(rooms.reduce((sum,room)=>sum+room.points.length,0),15);
  for(const room of rooms){
    const envelope=envelopes.find(item=>item.buildingId===room.buildingId);
    assert.equal(room.width,envelope.width-32);assert.equal(room.depth,envelope.depth-32);
    if(room.kind==='domestic')assert.deepEqual(room.points,[]);
    assert(api.HOMEWORLD_BUILDINGS.some(building=>building.id===room.buildingId));
  }
});
for(const room of rooms)test(`${room.buildingId}: whole-body paths reach physical exit and every existing point`,()=>{
  assert(api.isHomeworldInteriorWalkableV64(room,room.spawn),'spawn clear');
  assert(api.isHomeworldInteriorWalkableV64(room,room.exit),'exit clear');
  assert.equal(api.nearestHomeworldInteriorTargetV64(room,room.spawn),null,'held entry cannot immediately activate an exit or point');
  for(const prop of room.props){
    const art=api.HOMEWORLD_PROP_ART_V64[api.homeworldInteriorPropArtIdV64(prop.kind)];
    const ratio=prop.height/art.heightWorld;
    assert(Math.abs(prop.halfWidth-art.footprintWorld.width*ratio/2)<1e-8);
    assert(Math.abs(prop.halfDepth-art.footprintWorld.depth*ratio/2)<1e-8);
    assert(prop.x-prop.halfWidth>=10&&prop.x+prop.halfWidth<=room.width-10,'full furniture width remains inside walls');
    assert(prop.y-prop.halfDepth*2>=10&&prop.y<=room.depth-10,'front-pivot footprint stays on floor');
    assert.equal(api.isHomeworldInteriorWalkableV64(room,{x:prop.x,y:prop.y-prop.halfDepth}),false,'painted furniture has a real collider');
  }
  for(const p of [{x:0,y:room.depth/2},{x:room.width,y:room.depth/2},{x:room.width/2,y:0},{x:room.width/2,y:room.depth},{x:NaN,y:0}])assert.equal(api.isHomeworldInteriorWalkableV64(room,p),false);
  const targets=['exit',...room.points.map(point=>point.pointId)],reached=new Set(),queue=[room.spawn],seen=new Set();
  for(let cursor=0;cursor<queue.length;cursor++){
    const p=queue[cursor],key=p.x+','+p.y;
    if(seen.has(key))continue;seen.add(key);
    if(!api.isHomeworldInteriorWalkableV64(room,p))continue;
    const target=api.nearestHomeworldInteriorTargetV64(room,p);
    if(target)reached.add(target.kind==='exit'?'exit':target.pointId);
    for(const [dx,dy]of[[8,0],[-8,0],[0,8],[0,-8],[8,8],[-8,8],[8,-8],[-8,-8]]){
      const q={x:p.x+dx,y:p.y+dy};
      if(seen.has(q.x+','+q.y)||!api.isHomeworldInteriorWalkableV64(room,q)||!api.isHomeworldInteriorWalkableV64(room,{x:p.x+dx/2,y:p.y+dy/2}))continue;
      queue.push(q);
    }
  }
  for(const target of targets)assert(reached.has(target),'unreachable '+target);
});
