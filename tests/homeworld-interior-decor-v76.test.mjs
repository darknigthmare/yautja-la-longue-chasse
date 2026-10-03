import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import crypto from 'node:crypto';
import sharp from 'sharp';import {build}from'esbuild';import{renderToStaticMarkup}from'react-dom/server';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),code=await build({stdin:{contents:"export * from './app/game/systems/homeworldInteriorsV64.ts';export * from './app/game/systems/homeworldInteriorDecorV76.ts';export * from './app/game/systems/homeworldFurnitureV72.ts';export * from './app/game/systems/homeworldGeometryV64.ts'",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const api=await import('data:text/javascript;base64,'+Buffer.from(code.outputFiles[0].text).toString('base64'));
const marginBody={halfWidth:28,halfDepth:18},overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
function flood(room){const queue=[room.spawn],seen=new Set(['0,0']);assert(api.isHomeworldInteriorWalkableV64(room,room.spawn,marginBody));for(let i=0;i<queue.length;i++){const p=queue[i],ix=Math.round((p.x-room.spawn.x)/4),iy=Math.round((p.y-room.spawn.y)/4);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const key=(ix+dx)+','+(iy+dy);if(seen.has(key))continue;const q={x:p.x+dx*4,y:p.y+dy*4};let clear=true;for(let step=1;step<=4;step++)if(!api.isHomeworldInteriorWalkableV64(room,{x:p.x+dx*step,y:p.y+dy*step},marginBody)){clear=false;break;}if(clear){seen.add(key);queue.push(q);}}}return queue;}
test('four native OpenAI PNGs retain SHA, alpha silhouette and actual support metadata',async()=>{
 assert.equal(Object.keys(api.HOMEWORLD_INTERIOR_DECOR_ART_V76).length,4);
 for(const[id,a]of Object.entries(api.HOMEWORLD_INTERIOR_DECOR_ART_V76)){
  const bytes=await fs.readFile('public'+a.src),hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,a.sha256);
  const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,a.sourceWidth);assert.equal(info.height,a.sourceHeight);
  let left=info.width,right=-1,top=info.height,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(!alpha)transparent++;if(alpha>=a.alphaThreshold){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  assert.deepEqual(a.alphaBounds,{x:left,y:top,width:right-left+1,height:bottom-top+1});assert(transparent>info.width*info.height*.35,'true transparency '+id);
  assert(Math.abs(a.heightWorld/a.alphaBounds.height-a.scaleWorldPerPixel)<1e-12);
  assert.deepEqual(a.camera,{yaw:0,pitch:35,projection:'orthographic',objectOrientation:'native-pixels'});assert.equal(a.provenance.tool,'OpenAI built-in image_gen');assert.equal(a.provenance.pixels,'copied-unmodified');
  assert.equal(a.groundBoundsWorld.bottom,0);assert(a.groundBoundsWorld.left<0&&a.groundBoundsWorld.right>0&&a.groundBoundsWorld.top<0);
  assert.equal(a.pivot.y,a.groundSupportPixels.bottom);assert.equal(a.lore,'original-local-adaptation');
 }
});
test('43 rooms receive independent function-labelled scenery without replacing V72/V74 fields or actions',()=>{
 const rooms=api.HOMEWORLD_INTERIORS_V64,items=rooms.flatMap(r=>r.orientedDecorV76);assert.equal(rooms.length,43);assert.equal(items.length,92);assert.equal(new Set(items.map(p=>p.id)).size,92);
 assert.equal(new Set(items.map(p=>p.artId)).size,4);assert.equal(rooms.reduce((n,r)=>n+r.points.length,0),15);
 // V77 appends two explicitly identified tables. Still compare all original
 // V72/V74 fields byte-for-byte; new geometry is independently tested in V77.
 const oldMain=rooms.filter(r=>['market-armory','deep-forge','training-hall','clan-lodge','memory-vault','throne-audience'].includes(r.buildingId)).map(room=>{const old={...room,furniture:room.furniture.filter(item=>!item.id.endsWith('-v77-cntlip-table'))};delete old.orientedDecorV76;return old;});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(oldMain)).digest('hex'),'6d5505a37371b33034f46c8523e639ae6a7a7a41867747b24b3e773eae563ce0','existing six rooms unchanged');
 for(const r of rooms){assert(r.orientedDecorV76.length>=1);if(r.kind==='domestic')assert(r.orientedDecorV76.length<=2);assert.deepEqual(r.points.map(p=>p.pointId),api.HOMEWORLD_INTERIOR_BINDINGS_V64[r.buildingId]??[]);for(const p of r.orientedDecorV76){assert(p.id.startsWith(r.buildingId+'-v76-'));assert(p.purpose.startsWith(r.title));assert(p.solid);if(p.artId==='worktable-right')assert(['dock-control','market-armory','deep-forge','convoy-workshop'].includes(r.buildingId),'no vice/worktools in audience or rites');}}
});
for(const room of api.HOMEWORLD_INTERIORS_V64)test(room.buildingId+': physical exits, services, every space and passage retain four-unit body clearance',()=>{
 const reachable=flood(room);assert(reachable.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.kind==='exit'));
 for(const point of room.points)assert(reachable.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.pointId===point.pointId),'blocked service '+point.pointId);
 for(const zone of room.zones)assert(reachable.some(p=>p.x-marginBody.halfWidth>=zone.x&&p.x+marginBody.halfWidth<=zone.x+zone.width&&p.y-marginBody.halfDepth>=zone.y&&p.y+marginBody.halfDepth<=zone.y+zone.depth),'blocked functional zone '+zone.id);
 for(const passage of room.secondaryLayoutV74?.passages??[]){assert(api.isHomeworldInteriorWalkableV64(room,passage,marginBody));assert(reachable.some(p=>Math.hypot(p.x-passage.x,p.y-passage.y)<7),'blocked passage '+passage.id);}
 for(const fixture of room.furniture){
  const b=api.homeworldFurnitureFootprintV72(fixture),distance=points=>Math.min(...points.map(p=>Math.hypot(Math.max(b.left-p.x,0,p.x-b.right),Math.max(b.top-p.y,0,p.y-b.bottom)))),actual=distance(reachable);
  if(fixture.id==='memory-vault-v72-role-east'){
   // This one V72 fixture is already 78u from the reachable whole-body floor
   // without V76. Preserve its actual baseline; do not claim a 60u approach or
   // weaken the strict access requirement for any other old furnishing.
   const baseline=distance(flood({...room,orientedDecorV76:[]}));assert.equal(baseline,78);
   assert(actual<=baseline+1e-8,'preserved archive furnishing must not worsen its existing approach');
  }else assert(actual<60,'preserved furniture has a reachable approach '+fixture.id);
 }
 for(const item of room.orientedDecorV76){const b=api.homeworldInteriorDecorBoundsV76(item);assert(b.left>=10&&b.right<=room.width-10&&b.top>=10&&b.bottom<=room.depth-10,'complete support inside room');
  assert(!api.isHomeworldInteriorWalkableV64(room,{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2}),'real solid volume');
  assert(reachable.some(p=>Math.hypot(Math.max(b.left-p.x,0,p.x-b.right),Math.max(b.top-p.y,0,p.y-b.bottom))<65),'reachable approach '+item.id);
  for(const other of room.orientedDecorV76)if(other.id!==item.id)assert(!overlap(b,api.homeworldInteriorDecorBoundsV76(other)),'new props overlap');
  for(const old of room.furniture)assert(!overlap(b,api.homeworldFurnitureFootprintV72(old)),'old furniture preserved without overlap');
  for(const wall of room.partitions)assert(!overlap(b,{left:wall.x,right:wall.x+wall.width,top:wall.y,bottom:wall.y+wall.depth}),'full supports clear of partitions');
  for(const prop of room.props)assert(!overlap(b,{left:prop.x-prop.halfWidth,right:prop.x+prop.halfWidth,top:prop.y-prop.halfDepth*2,bottom:prop.y}),'old independent prop preserved');
 }
});
test('renderer uses independent native pixels, source pivots, upright uniform scale and existing surface bindings',async()=>{
 const result=await build({stdin:{contents:"export {default as Decor} from './app/game/HomeworldInteriorDecorV76.tsx'",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',external:['react','react-dom','react/jsx-runtime'],jsx:'automatic'}),fixtureModule={exports:{}};
 new Function('require','module','exports',result.outputFiles[0].text)(require,fixtureModule,fixtureModule.exports);
 for(const room of api.HOMEWORLD_INTERIORS_V64)for(const item of room.orientedDecorV76){const a=api.HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId],html=renderToStaticMarkup(fixtureModule.exports.Decor({item,actor:room.spawn}));
  assert(html.includes('data-homeworld-interior-decor-v76="'+item.id+'"'));assert(html.includes('interior-v76:'+item.artId));assert(html.includes(a.src));assert(!/rotate|scaleX|skew|<svg/.test(html));
  const pivotProjected=api.homeworldProjectGroundV64(item),s=a.scaleWorldPerPixel*item.scale,style=Object.fromEntries(html.match(/style="([^"]+)"/)[1].split(';').filter(Boolean).map(v=>{const i=v.indexOf(':');return[v.slice(0,i),v.slice(i+1)]}));
  assert(Math.abs(parseFloat(style.left)-(pivotProjected.x-a.pivot.x*s))<1e-8,'front support x aligned');assert(Math.abs(parseFloat(style.top)-(pivotProjected.y-a.pivot.y*s))<1e-8,'front support y aligned');
  assert(Math.abs(parseFloat(style.width)-a.sourceRect.width*s)<1e-8);assert(Math.abs(parseFloat(style.height)-a.sourceRect.height*s)<1e-8,'uniform scale');
 }
 const surface=await fs.readFile('app/game/HomeworldInteriorSurface.tsx','utf8');assert(surface.includes('<HomeworldInteriorDecorV76'));assert(surface.includes('<HomeworldFurnitureV72'));assert(surface.includes('trophy.claimId'));assert(surface.includes('HomeworldPointVisualV64'));
});
test('codex records per-instance orientation, scale, supports, source and non-granting purpose',()=>{
 const records=api.HOMEWORLD_INTERIORS_V64.flatMap(api.homeworldInteriorDecorCodexV76);assert.equal(records.length,92);for(const r of records){assert(r.solid);assert(r.sha256.length===64);assert.equal(r.interaction,'Pure scenery: no reward, collection, healing, rank or service.');assert(r.clearance.includes('four units'));assert(r.orientation&&r.measurement&&r.src&&r.pivotPixels);}
});
