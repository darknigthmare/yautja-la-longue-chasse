import assert from 'node:assert/strict';

/** QA-only navigation: plans from the real model, then reaches every position via public keyboard input. */
export function homeworldNavigatorV66(page,api,{controlledClock=true}={}){
 const held=new Set(),routes=[];
 const tick=ms=>controlledClock?page.clock.runFor(ms):page.waitForTimeout(ms);
 const position=()=>page.locator('[data-homeworld-actor]').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y)}));
 const currentRoom=async()=>api.homeworldInteriorForBuildingV64(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'));
 const release=async()=>{for(const key of held)await page.keyboard.up(key);held.clear();await tick(32);};
 const focus=async()=>{await page.bringToFront();const viewport=page.locator('[data-homeworld-viewport]');await viewport.focus();await tick(64);assert(await viewport.evaluate(e=>document.activeElement===e&&document.hasFocus()),'Actual world keyboard focus');};
 async function driveTo(target,tolerance=7){
  let stagnant=0,previous=await position();
  for(let attempt=0;attempt<300;attempt++){
   const point=await position(),dx=target.x-point.x,dy=target.y-point.y;
   if(Math.abs(dx)<=tolerance&&Math.abs(dy)<=tolerance){await release();const final=await position();if(Math.abs(target.x-final.x)<=tolerance&&Math.abs(target.y-final.y)<=tolerance)return final;}
   const keys=new Set([...(Math.abs(dx)>tolerance?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>tolerance?[dy>0?'ArrowDown':'ArrowUp']:[])]);
   for(const key of held)if(!keys.has(key)){await page.keyboard.up(key);held.delete(key);}
   for(const key of keys)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
   await tick(32);if(Math.hypot(point.x-previous.x,point.y-previous.y)<1)stagnant++;else stagnant=0;
   assert(stagnant<25,`Blocked keyboard route: ${JSON.stringify(point)} -> ${JSON.stringify(target)}`);previous=point;
  }
  throw Error('Route budget exceeded '+JSON.stringify(target));
 }
 async function follow(points){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));for(let j=1;j<=steps;j++)await driveTo({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps});}}
 function interiorRoute(room,start,targetId){
  const queue=[start],seen=new Set(),previous=new Map(),positions=new Map();let last;
  for(let i=0;i<queue.length;i++){
   const point=queue[i],key=point.x+','+point.y;if(seen.has(key))continue;seen.add(key);positions.set(key,point);
   const target=api.nearestHomeworldInteriorTargetV64(room,point);
   if(target&&(target.kind===targetId||target.pointId===targetId)&&Math.hypot(point.x-target.position.x,point.y-target.position.y)<(target.kind==='exit'?9:48)){last=key;break;}
   for(const [dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){const next={x:point.x+dx,y:point.y+dy},id=next.x+','+next.y;if(seen.has(id)||previous.has(id)||!api.isHomeworldInteriorWalkableV64(room,next))continue;previous.set(id,key);queue.push(next);}
  }
  assert(last,room.buildingId+' has accessible target '+targetId);const points=[];while(last){points.push(positions.get(last));last=previous.get(last);}return points.reverse();
 }
 const interact=async()=>{await release();await page.keyboard.press('KeyE');await tick(96);};
 const closeDialog=async()=>{const dialog=page.locator('[data-homeworld-hub]').getByRole('dialog');if(await dialog.count()){await page.keyboard.press('Escape');await tick(64);await dialog.waitFor({state:'hidden'});}await focus();};
 async function exitRoom(){const room=await currentRoom();if(!room)return;await closeDialog();const from=await position();await follow(interiorRoute(room,from,'exit'));assert.equal(api.nearestHomeworldInteriorTargetV64(room,await position())?.kind,'exit');await interact();assert.equal(await currentRoom(),null);routes.push({kind:'exit',buildingId:room.buildingId,from,to:await position()});await focus();}
 async function openPoint(pointId){
  const room=api.homeworldInteriorForPointV64(pointId);assert(room,'Known interior point');const present=await currentRoom();
  if(present?.buildingId!==room.buildingId){
   await exitRoom();await focus();const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===room.buildingId),door=api.homeworldBuildingDoorwayV64(building),from=await position();
   const route=api.homeworldSpatialRoute(from,door.approach);assert.equal(route.status,'reachable');await follow(route.points);
   assert.equal(api.nearestHomeworldDoor(await position())?.id,room.buildingId);await interact();assert.equal((await currentRoom())?.buildingId,room.buildingId);
   routes.push({kind:'city-and-door',pointId,buildingId:room.buildingId,from,approach:door.approach,distance:route.distance});
  }else await closeDialog();
  await focus();const from=await position();await follow(interiorRoute(room,from,pointId));assert.equal(api.nearestHomeworldInteriorTargetV64(room,await position())?.pointId,pointId);
  await interact();await page.locator('[data-homeworld-hub]').getByRole('dialog').waitFor();routes.push({kind:'interior-and-dialog',pointId,buildingId:room.buildingId,from,to:await position()});
 }
 return {position,focus,release,tick,follow,openPoint,closeDialog,exitRoom,routes};
}
