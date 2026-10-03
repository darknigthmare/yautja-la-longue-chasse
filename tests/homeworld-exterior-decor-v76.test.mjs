import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldLifeV69.ts',
  'homeworldExteriorDecorV76.ts','homeworldRegionConnectionsV72.ts','homeworldSpatialCodex.ts','homeworldFurnitureV72.ts']);
const scenery=api.HOMEWORLD_EXTERIOR_MODULES_V76,solid=api.HOMEWORLD_EXTERIOR_SOLIDS_V76;
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const expand=(b,x,y=x)=>({left:b.left-x,right:b.right+x,top:b.top-y,bottom:b.bottom+y});
const crosses=(rect,a,b)=>{
  let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const[p,q]of[[-dx,a.x-rect.left],[dx,rect.right-a.x],[-dy,a.y-rect.top],[dy,rect.bottom-a.y]]){
    if(!p){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
  }return true;
};

test('70 solid fixtures occupy fourteen functional neighbourhoods rather than one flattened city image',()=>{
  assert.equal(solid.length,70);assert.equal(new Set(scenery.map(item=>item.id)).size,scenery.length);
  assert.equal(new Set(solid.map(item=>item.districtId)).size,14);
  for(const district of api.HOMEWORLD_DISTRICTS)assert(solid.some(s=>s.districtId===district.id),district.id);
  assert.equal(scenery.length,74);assert.equal(scenery.filter(s=>!s.solid).length,4);
  const newTypes=['mineral-planter-left','terrace-bench-right','merchant-canopy-diagonal','logistics-container-rack'];
  for(const artId of newTypes)assert(solid.some(s=>s.artId===artId),artId+' actually placed');
  for(const item of solid){
    assert(item.scale>=.7&&item.scale<=1.1);assert(api.HOMEWORLD_EXTERIOR_ART_V76[item.artId]);
    assert.equal(item.solid,true);assert(api.homeworldExteriorPolygonV76(item).length>=4);
    const b=api.homeworldExteriorFootprintV76(item);
    for(const p of b.polygon)assert(api.isHomeworldTerrainWalkable(p,{halfWidth:10,halfDepth:8}),item.id+' supported by real public floor');
    assert(api.HOMEWORLD_BUILDINGS.some(b=>b.id===item.associatedBuildingId),'real related building');
  }
});

test('98 existing civil routines retain continuous body clearance along the complete outward/return path',()=>{
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  for(const resident of api.HOMEWORLD_RESIDENTS_V69){
    const first=resident.path[0],last=resident.path.at(-1);
    for(const item of solid){const box=expand(api.homeworldExteriorFootprintV76(item),32,22);
      assert(!crosses(box,first,last),resident.id+' would be blocked by '+item.id);
    }
    const steps=Math.max(1,Math.ceil(Math.hypot(last.x-first.x,last.y-first.y)/.5));
    for(let n=0;n<=steps;n++){
      const p={x:first.x+(last.x-first.x)*n/steps,y:first.y+(last.y-first.y)*n/steps};
      assert(api.isHomeworldWalkable(p),resident.id+' real City continuous body collision '+JSON.stringify(api.homeworldCollisionAt(p)));
    }
  }
});

test('all ground waymarks, former sign approaches and central regional road segments remain usable in the actual City',()=>{
  for(const p of api.HOMEWORLD_WAYMARKS){
    assert(api.isHomeworldWalkable(p,{halfWidth:36,halfDepth:26}),p.id+' public waymark body+12: '+JSON.stringify(api.homeworldCollisionAt(p)));
    assert.equal(api.homeworldSpatialRoute(api.createHomeworldActor(),p).status,'reachable',p.id+' reachable waymark');
  }
  for(const region of api.HOMEWORLD_REGION_CONNECTIONS_V72){
    const sign={x:region.legacySign.x,y:region.legacySign.y+70};
    assert(api.isHomeworldWalkable(sign),region.regionId+' former sign approach: '+JSON.stringify(api.homeworldCollisionAt(sign)));
    assert.equal(api.homeworldSpatialRoute(sign,region.arrival).status,'reachable',region.regionId+' real sign→departure route');
    for(let i=1;i<region.nodes.length;i++){
      const from=region.nodes[i-1],to=region.nodes[i],steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4));
      for(let n=0;n<=steps;n++){
        const p={x:from.x+(to.x-from.x)*n/steps,y:from.y+(to.y-from.y)*n/steps};
        assert(api.isHomeworldWalkable(p),region.regionId+' road centre: '+JSON.stringify(api.homeworldCollisionAt(p)));
      }
    }
  }
});

test('six oblique façades, all43 thresholds, the shuttle pad and pedestrian lane remain reserved',()=>{
  const angled=new Set(['convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum','rampart-watch','convoy-store']);
  const pad={left:160,right:1160,top:3800,bottom:4560},lane=api.HOMEWORLD_SPACEPORT_V64.pedestrian;
  assert.equal(api.HOMEWORLD_BUILDINGS.length,43);
  for(const item of solid){const b=api.homeworldExteriorFootprintV76(item);
    assert(!overlaps(b,expand(pad,40)));assert(!overlaps(b,expand(lane,30)));
    for(const building of api.HOMEWORLD_BUILDINGS){
      const reserved=angled.has(building.id)?{left:building.x-440,right:building.x+440,top:building.y-470,bottom:building.y+170}
        :api.homeworldBuildingFootprintV64(building);
      assert(!overlaps(b,expand(reserved,26)),item.id+' obstructs '+building.id);
      const door=api.homeworldBuildingDoorwayV64(building);
      assert(!crosses(expand(b,45),door.threshold,{x:door.approach.x,y:door.approach.y+120}),item.id+' occupies door approach');
    }
    for(const fixture of api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76)
      assert(!overlaps(b,expand(api.homeworldFurnitureFootprintV72(fixture),18)),item.id+' intersects turned frontage '+fixture.id);
  }
  assert.equal(api.HOMEWORLD_BUILDINGS.filter(b=>b.art.groundFrame).length,6,'six native oblique façades actually active');
  assert.equal(api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.length,12,'twelve existing fittings retain individual solid footprints');
});

test('all43 door routes and ten regional arrivals stay reachable with true decoration solids integrated',()=>{
  const targets=[...api.HOMEWORLD_BUILDINGS.map(b=>({id:b.id,p:api.homeworldBuildingDoorwayV64(b).approach})),
    ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>({id:r.regionId,p:r.arrival}))];
  for(const target of targets){
    const route=api.homeworldSpatialRoute(api.createHomeworldActor(),target.p);
    assert.equal(route.status,'reachable',target.id);
    for(let i=1;i<route.points.length;i++){
      const from=route.points[i-1],to=route.points[i],steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4);
      for(let n=0;n<=steps;n++){
        const p={x:from.x+(to.x-from.x)*n/(steps||1),y:from.y+(to.y-from.y)*n/(steps||1)};
        assert.equal(api.homeworldExteriorCollisionV76(p,{halfWidth:36,halfDepth:26}),null,target.id+' true route clearance');
      }
    }
  }
  for(const region of api.HOMEWORLD_REGION_CONNECTIONS_V72){
    assert(api.isHomeworldWalkable(region.threshold),region.regionId+' true threshold');
    assert(api.isHomeworldRouteSegmentWalkable(region.arrival,region.threshold),region.regionId+' final approach');
  }
});

test('measured convex native bases are solid while gutters and elevated wall ornaments are not',()=>{
  for(const item of solid){const polygon=api.homeworldExteriorPolygonV76(item),center={
    x:polygon.reduce((s,p)=>s+p.x,0)/polygon.length,y:polygon.reduce((s,p)=>s+p.y,0)/polygon.length};
    assert(api.homeworldExteriorTouchesV76(item,center,{halfWidth:1,halfDepth:1}));
    const box=api.homeworldExteriorFootprintV76(item);
    assert(!api.homeworldExteriorTouchesV76(item,{x:box.right+80,y:box.bottom+80}));
  }
  for(const item of scenery.filter(s=>!s.solid))assert(!api.homeworldExteriorTouchesV76(item,item));
  const angled=solid.find(item=>item.artId==='mineral-planter-left'),bounds=api.homeworldExteriorFootprintV76(angled);
  assert(!api.homeworldExteriorTouchesV76(angled,{x:bounds.left+5,y:bounds.bottom-5},{halfWidth:2,halfDepth:2}),
    'empty corner of an angled planter bbox must not create an invisible solid fence');
  assert.equal(api.homeworldExteriorFootprintV76(angled),bounds,'immutable instance reuses measured bounds cache');
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)
    assert(!overlaps(expand(api.homeworldExteriorFootprintV76(solid[i]),28),api.homeworldExteriorFootprintV76(solid[j])),solid[i].id+' crowds '+solid[j].id);
});

test('four separate original native PNGs retain exact bytes, true alpha contacts and a uniform scale',async()=>{
  const newArt=Object.values(api.HOMEWORLD_EXTERIOR_ART_V76).filter(art=>art.nativeGroundSupport);
  assert.equal(newArt.length,4);assert.equal(new Set(newArt.map(a=>a.src)).size,4);
  for(const art of newArt){const bytes=fs.readFileSync('public'+art.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
    assert.equal(bytes.readUInt32BE(16),art.sourceWidth);assert.equal(bytes.readUInt32BE(20),art.sourceHeight);
    assert.deepEqual(art.sourceRect,{x:0,y:0,width:art.sourceWidth,height:art.sourceHeight});
    assert(art.alphaBounds.x>0&&art.alphaBounds.y>0&&art.alphaBounds.x+art.alphaBounds.width<art.sourceWidth);
    assert(Math.abs(art.heightWorld/art.alphaBounds.height-art.scaleWorldPerPixel)<1e-10);
    for(const p of art.nativeGroundSupport)assert(p.x>0&&p.x<art.sourceWidth&&p.y<=art.pivot.y);
    const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(const[x,y]of[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]])
      assert.equal(data[(y*info.width+x)*4+3],0,'true transparent background');
    for(const p of art.nativeGroundSupport)
      assert(data[(Math.round(p.y)*info.width+Math.round(p.x))*4+3]>=128,art.src+' contact must land on a visible support pixel');
  }
});

test('paint culling, one projection and foreground fade preserve independent props and codex truth',()=>{
  for(const item of scenery){const b=api.homeworldExteriorVisibleBoundsV76(item),art=api.HOMEWORLD_EXTERIOR_ART_V76[item.artId],s=art.scaleWorldPerPixel*item.scale;
    assert.equal(b.top,item.y*api.HOMEWORLD_GEOMETRY_V64.depthScale-(item.elevation??0)+(art.alphaBounds.y-art.pivot.y)*s);
    assert(api.homeworldExteriorVisibleV76(item,{x:b.left,y:b.top,width:10,height:10}));
    assert(!api.homeworldExteriorVisibleV76(item,{x:50000,y:50000,width:400,height:800}));
    const record=api.HOMEWORLD_EXTERIOR_CODEX_V76.find(r=>r.id===item.id);assert(record);
    assert.equal(record.asset,art.src);assert.equal(record.lore,'original-adaptation');
    assert.equal(Boolean(record.footprint),item.solid);assert(record.constraints.some(text=>text.includes('aucun butin')));
  }
  assert.equal(api.HOMEWORLD_EXTERIOR_CODEX_V76.length,scenery.length);
  const source=fs.readFileSync('app/game/HomeworldExteriorDecorV76.tsx','utf8');
  assert(!/rotate\(|scaleX\(-1|Math\.random/.test(source));assert(source.includes('homeworldProjectGroundV64'));
});
