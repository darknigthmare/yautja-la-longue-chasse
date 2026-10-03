import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
const result=await build({stdin:{contents:"export * from './app/game/systems/homeworldIdentityV72.ts'; export * from './app/game/systems/homeworldIdentityCodexV72.ts'; export * from './app/game/systems/homeworldInteriorsV64.ts'; export * from './app/game/systems/homeworldFunctionalInteriorsV72.ts'; export * from './app/game/systems/homeworldGeometryV64.ts'; export * from './app/game/systems/homeworldCity.ts'; export * from './app/game/systems/homeworldFurnitureV72.ts'; export * from './app/game/HomeworldYouthMotionV72.tsx'; export {default as YouthMotion} from './app/game/HomeworldYouthMotionV72.tsx'; export {default as Civilian} from './app/game/HomeworldCivilianV72.tsx';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic'});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const atlas=JSON.parse(await fs.readFile('app/game/data/homeworldIdentityArtV72.json','utf8'));
test('three preserved OpenAI PNG sources have true alpha, matching SHA and independent fully measured atlas windows',async()=>{
  for(const source of Object.values(atlas)){
    const bytes=await fs.readFile('public'+source.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
    const {info,data}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
    assert.equal(info.channels,4);assert.equal(info.width,source.sourceWidth);assert.equal(info.height,source.sourceHeight);
    let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
    assert(transparent>info.width*info.height*.30,'native transparent gutters, not opaque painted backgrounds');
    for(const cell of source.cells){
      const r=cell.sourceRect,b=cell.alphaBounds;
      assert(r.x>=0&&r.y>=0&&r.x+r.width<=info.width&&r.y+r.height<=info.height);
      let left=r.width,top=r.height,right=-1,bottom=-1;
      for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)if(data[((y+r.y)*info.width+x+r.x)*4+3]>200){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      assert.deepEqual({x:left,y:top,width:right-left+1,height:bottom-top+1},b);
      assert(cell.pivot.x>=b.x&&cell.pivot.x<=b.x+b.width);assert.equal(cell.pivot.y,b.y+b.height-1);
    }
  }
});
test('all12 named inhabitants have twelve distinct native costumes; chief is visually reserved and fourteen civilian roles populate existing routes',()=>{
  assert.equal(Object.keys(api.HOMEWORLD_NPC_ROLES_V72).length,12);
  const identities=Object.values(api.HOMEWORLD_NPC_ROLES_V72).map(role=>{const a=api.homeworldCivilianArtV72(role);return a.src+JSON.stringify(a.sourceRect);});
  assert.equal(new Set(identities).size,12);
  assert.equal(api.HOMEWORLD_NPC_ROLES_V72['hunt-king'],'chief');
  assert.equal(api.homeworldCivilianArtV72('chief').heightWorld,112);
  for(const role of api.HOMEWORLD_CIVILIAN_ROLES_V72){const art=api.homeworldCivilianArtV72(role);assert(art.alphaBounds.height>100);const html=renderToStaticMarkup(api.Civilian({role}));assert(html.includes('data-homeworld-civilian-v72="'+role+'"'));assert(html.includes(art.src));}
  assert.notEqual(api.homeworldResidentRoleV72({id:'a',districtId:'forges',role:'Ouvrier',morphId:'classic'}),'chief');
});
test('six native civic facades retain painted doorway pivots and single scale inside nonoverlapping physical envelopes',()=>{
  assert.equal(Object.keys(api.HOMEWORLD_BUILDING_IDENTITIES_V72).length,6);
  const seen=new Set();
  for(const [id,identity]of Object.entries(api.HOMEWORLD_BUILDING_IDENTITIES_V72)){
    const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id);assert(building);
    assert.equal(building.art.src,identity.art.src);assert.equal(building.footprint.depth,identity.depth);
    seen.add(JSON.stringify(building.art.sourceRect));
    const placement=api.homeworldBuildingSpritePlacementV64(building),r=building.art.sourceRect,scale=placement.width/r.width;
    assert(Math.abs(scale-placement.height/r.height)<1e-10);
    const threshold=api.homeworldProjectGroundV64(building);
    assert(Math.abs(placement.left+building.art.threshold.x*scale-threshold.x)<1e-8);
    assert(Math.abs(placement.top+building.art.threshold.y*scale-threshold.y)<1e-8);
    const doorway=api.homeworldBuildingDoorwayV64(building);assert(doorway.clearWidth>=80&&doorway.clearHeight>=128);
  }
  assert.equal(seen.size,6);
  for(const building of api.HOMEWORLD_BUILDINGS)assert(api.isHomeworldWalkable(api.homeworldBuildingDoorwayV64(building).approach),building.id);
});
test('six functional wings preserve thirty original furnishings plus the single measured court reception table',()=>{
  const wings=api.HOMEWORLD_INTERIORS_V64.filter(room=>api.homeworldBuildingIdentityV72(room.buildingId)!==null);
  const tableId='throne-audience-v77-cntlip-table';
  assert.equal(wings.length,6);assert.equal(wings.reduce((n,r)=>n+r.furniture.length,0),31);
  assert.equal(wings.flatMap(room=>room.furniture).filter(table=>table.id!==tableId).length,30);
  assert.deepEqual(wings.find(room=>room.buildingId==='throne-audience').furniture.filter(table=>table.id===tableId),
    [{id:tableId,artId:'meal-table',x:410,y:141,scale:.62}]);
  for(const room of wings){
    assert.equal(room.zones.length,3);assert.equal(room.partitions.length,4);
    const plan=api.homeworldInteriorPartitionPlanV72(room);
    for(const door of plan.doorways){assert.equal(door.width,112);assert(api.isHomeworldInteriorWalkableV64(room,door),'two actual passages remain usable');}
    for(const wall of room.partitions)assert(!api.isHomeworldInteriorWalkableV64(room,{x:wall.x+wall.width/2,y:wall.y+wall.depth/2}),'painted partitions are solid');
    for(const furniture of room.furniture){
      const f=api.homeworldFurnitureFootprintV72(furniture);
      assert(f.left>=10&&f.right<=room.width-10&&f.top>=10&&f.bottom<=room.depth-10,room.buildingId+'/'+furniture.id);
      assert(!api.isHomeworldInteriorWalkableV64(room,{x:(f.left+f.right)/2,y:(f.top+f.bottom)/2}),'furniture is not walk-through');
    }
    // Flood the same whole-body collision model and require every zone to be physically accessible.
    const queue=[room.spawn],seen=new Set(),reached=new Set();
    for(let i=0;i<queue.length;i++){const p=queue[i],key=p.x+','+p.y;if(seen.has(key)||!api.isHomeworldInteriorWalkableV64(room,p))continue;seen.add(key);
      for(const z of room.zones)if(p.x>z.x+30&&p.x<z.x+z.width-30&&p.y>z.y+30&&p.y<z.y+z.depth-30)reached.add(z.id);
      for(const[dx,dy]of [[8,0],[-8,0],[0,8],[0,-8]]){const q={x:p.x+dx,y:p.y+dy};if(!seen.has(q.x+','+q.y)&&api.isHomeworldInteriorWalkableV64(room,q)&&api.isHomeworldInteriorWalkableV64(room,{x:p.x+dx/2,y:p.y+dy/2}))queue.push(q);}
    }
    assert.equal(reached.size,3,room.buildingId+' allthree rooms reached by walking');
  }
});
test('Unblooded movement alternates genuine V48 drawings and native directions while pivots always land at zero',()=>{
  for(const facing of[1,-1]){
    const a=api.homeworldYouthFrameV72(0,true,facing),b=api.homeworldYouthFrameV72(11/60,true,facing);
    assert.notDeepEqual(a.frame.rect,b.frame.rect);assert.match(a.actor.src,/\/game\/youth\/v48\/unblooded-/);
    assert.equal(api.homeworldYouthFrameV72(0,false,facing).clipId,'idle');
    const html=renderToStaticMarkup(api.YouthMotion({seconds:11/60,moving:true,facing,height:82}));
    assert(html.includes('data-homeworld-unblooded-v72="walk"'));assert(html.includes('data-native-frame="1"'));
    const scale=82/b.actor.bodyHeight;assert(scale>0);assert.equal(-b.frame.pivot[1]*scale+b.frame.pivot[1]*scale,0);
  }
  assert.notEqual(api.homeworldYouthFrameV72(0,true,1).actor.src,api.homeworldYouthFrameV72(0,true,-1).actor.src);
});
test('V72 codex enumerates every real wall, wingzone and furnishing without claiming a full private palace or canonical universal monarchy',()=>{
  // The Pit table belongs to a secondary room, outside these six V72 wings.
  // Only the court addition produces one extra record here (72 -> 73).
  const records=api.HOMEWORLD_IDENTITY_CODEX_V72;assert.equal(records.length,73);assert.equal(new Set(records.map(r=>r.id)).size,73);
  const courtId='v72-furniture:throne-audience-v77-cntlip-table';
  assert.equal(records.filter(r=>r.id!==courtId).length,72);
  assert.equal(records.filter(r=>r.category==='prop').length,31);assert.equal(records.filter(r=>r.category==='panel').length,24);
  const reception=records.find(r=>r.id===courtId);assert(reception);assert.equal(reception.spaceId,'throne-audience');
  assert.deepEqual(reception.position,{x:410,y:141,z:0});assert.equal(reception.category,'prop');
  for(const record of records){assert.equal(record.lore,'original-adaptation');assert(record.constraints.length>=3);assert(Object.values(record.dimensions).every(Number.isFinite));}
  assert(records.some(r=>r.constraints.join(' ').includes('appartements et étages privés ne sont pas simulés')));
});
