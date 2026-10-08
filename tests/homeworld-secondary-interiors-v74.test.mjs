import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import {historicalHomeworldInteriorsV81} from './helpers/homeworld-interior-history-v89.mjs';
const require=createRequire(import.meta.url);
const bundle=await build({stdin:{contents:"export * from './app/game/systems/homeworldInteriorsV64.ts';export * from './app/game/systems/homeworldSecondaryInteriorsV74.ts';export * from './app/game/systems/homeworldSecondaryInteriorCodexV74.ts';export * from './app/game/systems/homeworldFurnitureV72.ts';export * from './app/game/systems/homeworldCity.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const rooms=api.HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74);
const body={halfWidth:24,halfDepth:14},safeBody={halfWidth:28,halfDepth:18};
const envelopes=JSON.parse(await fs.readFile('app/game/data/homeworldInteriorEnvelopesV64.json','utf8'));
const originalMainIds=['market-armory','deep-forge','training-hall','clan-lodge','memory-vault'];
const historicalV81=await historicalHomeworldInteriorsV81();
const wholeBodyInsideZone=(point,zone,footprint)=>point.x-footprint.halfWidth>=zone.x&&point.x+footprint.halfWidth<=zone.x+zone.width
  &&point.y-footprint.halfDepth>=zone.y&&point.y+footprint.halfDepth<=zone.y+zone.depth;

/** Flood the actual whole-body predicate. Every 4-unit edge is checked at 1-unit
 * intervals, not just its destination; walls/furniture cannot be cut diagonally. */
function flood(room,footprint){
  const start=room.spawn,queue=[start],seen=new Set([start.x+','+start.y]),reached=[];
  assert(api.isHomeworldInteriorWalkableV64(room,start,footprint),'clear spawn');
  for(let i=0;i<queue.length;i++){
    const p=queue[i];reached.push(p);
    for(const[dx,dy]of[[4,0],[-4,0],[0,4],[0,-4]]){
      const next={x:p.x+dx,y:p.y+dy},key=next.x+','+next.y;
      if(seen.has(key))continue;
      let clear=true;for(let step=1;step<=4;step++)if(!api.isHomeworldInteriorWalkableV64(room,{x:p.x+dx*step/4,y:p.y+dy*step/4},footprint)){clear=false;break;}
      if(clear){seen.add(key);queue.push(next);}
    }
  }
  return reached;
}
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const boundsOfPoint=p=>{
  const fixture=api.homeworldInteriorPointPropV64(p);
  return fixture?{left:p.x-fixture.halfWidth,right:p.x+fixture.halfWidth,top:p.y-fixture.halfDepth*2,bottom:p.y}:
    {left:p.x-16,right:p.x+16,top:p.y-10,bottom:p.y+10};
};

test('all 37 secondary plans remain distinct; six original principal plans are preserved beside two explicit V77 tables',()=>{
  assert.equal(rooms.length,36);assert.equal(rooms.filter(r=>r.kind==='civic').length,12);assert.equal(rooms.filter(r=>r.kind==='domestic').length,24);
  assert.equal(Object.keys(api.HOMEWORLD_SECONDARY_RECIPES_V74).length,37);
  assert.equal(new Set(rooms.map(r=>r.secondaryLayoutV74.archetype)).size,36);
  assert.equal(new Set(rooms.map(r=>JSON.stringify({width:r.width,depth:r.depth,
    walls:r.partitions.map(w=>[w.x,w.y,w.width,w.depth,w.orientation]),
    zones:r.zones.map(z=>[z.x,z.y,z.width,z.depth]),
    furniture:r.furniture.map(f=>[f.artId,f.x,f.y,f.scale])}))).size,36,'plans differ physically, not only by labels');
  assert.equal(new Set(Object.values(api.HOMEWORLD_SECONDARY_RECIPES_V74).map(r=>r.topology)).size,7);
  // Preserve the exact V81 authoring fingerprint before the explicit V82/V83/
  // V84 composition layers. Every active geometric check below uses live rooms.
  const additions=[
    {buildingId:'pit-gate',table:{id:'pit-gate-v77-cntlip-table',artId:'meal-table',x:185,y:225,scale:.40}},
    {buildingId:'throne-audience',table:{id:'throne-audience-v77-cntlip-table',artId:'meal-table',x:410,y:141,scale:.62}},
  ];
  const addedIds=new Set(additions.map(entry=>entry.table.id));
  for(const addition of additions){
    const room=api.HOMEWORLD_INTERIORS_V64.find(entry=>entry.buildingId===addition.buildingId);
    assert.deepEqual(room.furniture.filter(table=>table.id===addition.table.id),[addition.table]);
  }
  assert.equal(api.HOMEWORLD_INTERIORS_V64.flatMap(room=>room.furniture).filter(table=>table.id.includes('-v77-cntlip-')).length,2);
  const main=historicalV81.filter(r=>originalMainIds.includes(r.buildingId)).map(room=>{const original={...room,furniture:room.furniture.filter(table=>!addedIds.has(table.id))};delete original.orientedDecorV76;return original;});
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(main)).digest('hex'),'1d20d34589a448688f93318a009dde68faa89841df057848804ee5564e6e3be5');
  for(const room of api.HOMEWORLD_INTERIORS_V64){
    const envelope=room.monumentLayoutV81?.exteriorEnvelope??envelopes.find(e=>e.buildingId===room.buildingId);
    assert.equal(room.width,envelope.width-32);assert.equal(room.depth,envelope.depth-32);
    assert.deepEqual(room.spawn,{x:room.width/2,y:room.depth-72});assert.deepEqual(room.exit,{x:room.width/2,y:room.depth-24});
    assert.deepEqual(room.points.map(p=>p.pointId),api.HOMEWORLD_INTERIOR_BINDINGS_V64[room.buildingId]??[]);
    if(room.kind==='domestic')assert.equal(room.points.length,0);
  }
  assert.equal(api.HOMEWORLD_INTERIORS_V64.reduce((n,r)=>n+r.points.length,0),15);
});

for(const room of rooms)test(room.buildingId+': every functional zone and service is reachable with full body plus four-unit margin',()=>{
  const reached=flood(room,safeBody);
  assert.equal(api.nearestHomeworldInteriorTargetV64(room,room.spawn),null,'entry is neither a service nor immediate exit');
  assert(reached.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.kind==='exit'),'physical exit reachable');
  for(const zone of room.zones)assert(reached.some(p=>wholeBodyInsideZone(p,zone,safeBody)),'unreachable whole-body zone '+zone.id);
  for(const point of room.points)assert(reached.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.pointId===point.pointId),'existing service not reachable '+point.pointId);
  for(const passage of room.secondaryLayoutV74.passages){
    assert(passage.width>=86,'usable passage width');
    assert(api.isHomeworldInteriorWalkableV64(room,passage,safeBody),'passage centre is really clear');
    assert(reached.some(p=>Math.hypot(p.x-passage.x,p.y-passage.y)<6),'passage reachable');
  }
  for(const fixture of room.furniture){
    const f=api.homeworldFurnitureFootprintV72(fixture);
    assert(f.left>=10&&f.right<=room.width-10&&f.top>=10&&f.bottom<=room.depth-10,'full footprint inside the walls '+fixture.id);
    assert(!api.isHomeworldInteriorWalkableV64(room,{x:(f.left+f.right)/2,y:(f.top+f.bottom)/2},body),'real furniture collision '+fixture.id);
    // The object is scenery, not a new service. This checks that it is in a
    // usable space, rather than marooned behind an inaccessible display wall.
    assert(reached.some(p=>Math.hypot(Math.max(f.left-p.x,0,p.x-f.right),Math.max(f.top-p.y,0,p.y-f.bottom))<60),'fixture has a reachable approach '+fixture.id);
  }
  const furnitureBounds=room.furniture.map(f=>({id:f.id,...api.homeworldFurnitureFootprintV72(f)}));
  const walls=room.partitions.map(w=>({id:w.id,left:w.x,right:w.x+w.width,top:w.y,bottom:w.y+w.depth}));
  for(let i=0;i<furnitureBounds.length;i++){
    const f=furnitureBounds[i];
    for(const other of furnitureBounds.slice(i+1))assert(!overlap(f,other),'furniture overlaps '+f.id+' / '+other.id);
    for(const wall of walls)assert(!overlap(f,wall),'furniture crosses a partition '+f.id+' / '+wall.id);
    for(const prop of room.props)assert(!overlap(f,{left:prop.x-prop.halfWidth,right:prop.x+prop.halfWidth,top:prop.y-prop.halfDepth*2,bottom:prop.y}),'furniture intersects preserved console '+f.id);
    for(const point of room.points)assert(!overlap(f,boundsOfPoint(point)),'furniture occupies existing resident/evidence '+f.id+' / '+point.pointId);
  }
  for(const wall of walls){
    assert(wall.left>=10&&wall.right<=room.width-10&&wall.top>=10&&wall.bottom<=room.depth-10,'partition bounded');
    assert(!api.isHomeworldInteriorWalkableV64(room,{x:(wall.left+wall.right)/2,y:(wall.top+wall.bottom)/2},body),'native wall owns a solid collider');
  }
});

test('36 preserved secondary rooms render their native independent cells and walls; empty mausoleum grants no fake trophies',async()=>{
  const source=await build({stdin:{contents:"export {default as Surface} from './app/game/HomeworldInteriorSurface.tsx';",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom'],plugins:[{name:'css-module-test',setup(builder){builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
  const surfaceModule={exports:{}};new Function('require','module','exports',source.outputFiles[0].text)(require,surfaceModule,surfaceModule.exports);
  const surfaces=[];
  for(const room of rooms){
    const html=renderToStaticMarkup(surfaceModule.exports.Surface({room,actorPosition:room.spawn,activePointId:null,trophies:[]}));surfaces.push(html);
    assert(html.includes('data-homeworld-secondary-interior-v74="'+room.buildingId+'"'));
    for(const zone of room.zones)assert(html.includes('data-homeworld-interior-zone-v74="'+zone.id+'"'));
    for(const wall of room.partitions)assert(html.includes('data-interior-partition-v74="'+wall.id+'"'));
    for(const fixture of room.furniture){
      const art=api.HOMEWORLD_FURNITURE_ART_V72[fixture.artId];
      assert(html.includes('data-homeworld-prop-id="'+fixture.id+'"'));assert(html.includes(art.src));
      assert(html.includes('data-native-source-rect="'+[art.sourceRect.x,art.sourceRect.y,art.sourceRect.width,art.sourceRect.height].join(',')+'"'));
    }
    assert(!html.includes('<svg'),'no replacement vector art');
    if(room.buildingId==='trophy-mausoleum')assert(!html.includes('data-trophy-claim-id'),'no unowned display trophy');
  }
  assert.equal(surfaces.length,36);
  const mausoleum=rooms.find(r=>r.buildingId==='trophy-mausoleum');
  assert.equal(api.homeworldInteriorTrophySlotsV64(mausoleum).length,8,'original eight save-owned sockets preserved');
  const claims=Array.from({length:10},(_,i)=>({id:'owned-claim-'+i,definitionId:'trophy-vey',targetName:'Commandante Vey',partId:'insignia'}));
  const ownedHtml=renderToStaticMarkup(surfaceModule.exports.Surface({room:mausoleum,actorPosition:mausoleum.spawn,activePointId:null,trophies:claims}));
  assert.equal([...ownedHtml.matchAll(/data-trophy-claim-id="/g)].length,8,'at most the eight original wall sockets');
  assert(!ownedHtml.includes('data-trophy-claim-id="owned-claim-0"'));assert(!ownedHtml.includes('data-trophy-claim-id="owned-claim-1"'));
  for(const claim of claims.slice(-8))assert(ownedHtml.includes('data-trophy-claim-id="'+claim.id+'"'),'owned claim remains individually drawn');
  assert(ownedHtml.includes('/game/assets/v15/trophies/trophy-vey.webp'),'preserved real trophy definition, no replacement image');
});

test('secondary codex covers each exact live plan, zone, physical partition, passage and native furnishing',async()=>{
  const records=api.HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74;
  const expected=rooms.reduce((n,r)=>n+1+r.zones.length+r.partitions.length+r.furniture.length+r.secondaryLayoutV74.passages.length,0);
  assert.equal(records.length,expected);assert.equal(new Set(records.map(r=>r.id)).size,expected);
  const bytes=await fs.readFile('public/game/homeworld/v72/civic-furniture-kit.png');
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,'dd9193612dff71ddbe1a65c74ef5c55cd10a4202cabf08746ec94195a825a844','reviewed existing PNG source unchanged');
  for(const room of rooms){
    const own=records.filter(r=>r.spaceId===room.buildingId);assert(own.every(r=>r.id.startsWith('v74-')));
    assert(own.some(r=>r.id==='v74-layout:'+room.buildingId));
    for(const fixture of room.furniture){
      const record=own.find(r=>r.id==='v74-furniture:'+fixture.id),art=api.HOMEWORLD_FURNITURE_ART_V72[fixture.artId];
      assert.deepEqual(record.footprint,api.homeworldFurnitureFootprintV72(fixture));assert.equal(record.asset,art.src);assert(record.constraints.join(' ').includes(hash));
    }
  }
  for(const record of records){assert.equal(record.lore,'original-adaptation');assert(record.constraints.length>=3);assert(Object.values(record.dimensions).every(Number.isFinite));}
});
