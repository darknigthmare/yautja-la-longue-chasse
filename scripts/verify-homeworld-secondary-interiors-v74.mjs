import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V74_INTERIOR_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V74_INTERIOR_QA_OUTPUT??'work-local/v74/qa/secondary-interiors';
const expectedVersion=process.env.YAUTJA_QA_EXPECTED_VERSION??'V74';
const requestedIds=(process.env.V74_INTERIOR_QA_IDS??'').split(',').filter(Boolean);
const requireCaptions=process.env.V74_INTERIOR_QA_CAPTIONS!=='false';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldSecondaryInteriorCodexV74.ts','homeworldFurnitureV72.ts','homeworldYouthMotionV74.ts']);
const rooms=api.HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74);
assert.equal(rooms.length,37);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
let nav;
const body={halfWidth:24,halfDepth:14},safeBody={halfWidth:28,halfDepth:18};
const inside=(position,zone,footprint=safeBody)=>position.x-footprint.halfWidth>=zone.x&&position.x+footprint.halfWidth<=zone.x+zone.width
  &&position.y-footprint.halfDepth>=zone.y&&position.y+footprint.halfDepth<=zone.y+zone.depth;

/** Plan only; execution remains actual keyboard input. The margin tolerates
 * three units of steering error and cannot bypass a physical collision. */
function interiorRoute(room,start,goal){
  const queue=[start],seen=new Set(),previous=new Map(),positions=new Map();let last;
  const clear=position=>{const margin=Math.min(4,Math.hypot(position.x-start.x,position.y-start.y)/2);return api.isHomeworldInteriorWalkableV64(room,position,{halfWidth:24+margin,halfDepth:14+margin});};
  for(let i=0;i<queue.length;i++){
    const position=queue[i],key=position.x+','+position.y;
    if(seen.has(key)||!clear(position))continue;seen.add(key);positions.set(key,position);
    if(goal(position)){last=key;break;}
    for(const[dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){
      const next={x:position.x+dx,y:position.y+dy},id=next.x+','+next.y;
      if(seen.has(id)||previous.has(id))continue;
      let valid=true;for(let step=1;step<=8;step++)if(!clear({x:position.x+dx*step/8,y:position.y+dy*step/8})){valid=false;break;}
      if(valid){previous.set(id,key);queue.push(next);}
    }
  }
  assert(last,room.buildingId+' keyboard path target');
  const points=[];while(last){points.push(positions.get(last));last=previous.get(last);}return points.reverse();
}
const saveBytes=()=>page.evaluate(key=>localStorage.getItem(key),p.SAVE_STORAGE_KEY);
const capture=async name=>{
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const file=output+'/'+name+'.png';await page.screenshot({path:file});captures.push(file);
};
async function followGoal(room,goal){await nav.focus();await nav.follow(interiorRoute(room,await nav.position(),goal));assert(api.isHomeworldInteriorWalkableV64(room,await nav.position(),body));}
async function exitRoom(){
  const id=await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id');if(!id)return;
  const room=api.homeworldInteriorForBuildingV64(id);await nav.closeDialog();
  await followGoal(room,position=>api.nearestHomeworldInteriorTargetV64(room,position)?.kind==='exit'&&Math.hypot(position.x-room.exit.x,position.y-room.exit.y)<12);
  assert.equal(api.nearestHomeworldInteriorTargetV64(room,await nav.position())?.kind,'exit');
  await page.keyboard.press('KeyE');await nav.tick(110);
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),null);await nav.focus();
}
async function visitRoom(room){
  await exitRoom();const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===room.buildingId),door=api.homeworldBuildingDoorwayV64(building);
  const route=api.homeworldSpatialRoute(await nav.position(),door.approach);assert.equal(route.status,'reachable',room.buildingId+' real exterior approach');
  await nav.follow(route.points);assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,room.buildingId);
  await page.keyboard.press('KeyE');await nav.tick(110);
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),room.buildingId);
  assert.equal(await page.locator('[data-homeworld-secondary-interior-v74="'+room.buildingId+'"]').count(),1);
  assert.equal(await page.locator('[data-homeworld-interior-zone-v74]').count(),room.zones.length);
  assert.equal(await page.locator('[data-interior-partition-v74]').count(),room.partitions.length);
  assert.equal(await page.locator('[data-homeworld-art-id^="furniture-v72:"]').count(),room.furniture.length);
  const visitedZones=[];
  for(const zone of room.zones){
    await followGoal(room,position=>inside(position,zone));assert(inside(await nav.position(),zone,body),'whole visible body enters '+zone.id);
    visitedZones.push(zone.id);
  }
  for(const passage of room.secondaryLayoutV74.passages){
    await followGoal(room,position=>Math.hypot(position.x-passage.x,position.y-passage.y)<9);
    assert(Math.hypot((await nav.position()).x-passage.x,(await nav.position()).y-passage.y)<13,'native passage crossed');
  }
  const services=[];
  for(const point of room.points){
    await followGoal(room,position=>api.nearestHomeworldInteriorTargetV64(room,position)?.pointId===point.pointId&&Math.hypot(position.x-point.x,position.y-point.y)<48);
    assert.equal(api.nearestHomeworldInteriorTargetV64(room,await nav.position())?.pointId,point.pointId);
    await page.keyboard.press('KeyE');await nav.tick(110);
    const dialog=page.locator('[data-homeworld-hub]').getByRole('dialog');await dialog.waitFor();
    services.push({pointId:point.pointId,dialogText:(await dialog.innerText()).slice(0,160)});await nav.closeDialog();
  }
  if(room.buildingId==='trophy-mausoleum')assert.equal(await page.locator('[data-trophy-claim-id]').count(),0,'fixture has no trophy claims; no fake prizes painted');
  if(requireCaptions){
    const floor=await page.locator('[data-interior-floor]').boundingBox(),exitCaption=await page.locator('[data-homeworld-physical-exit] span').boundingBox();
    const captions=page.locator('[data-homeworld-floor-caption-v74]');assert.equal(await captions.count(),room.zones.length);
    for(const caption of await captions.all()){
      const rect=await caption.boundingBox();assert(rect.x>=floor.x-.5&&rect.x+rect.width<=floor.x+floor.width+.5&&rect.y>=floor.y-.5&&rect.y+rect.height<=floor.y+floor.height+.5,'caption remains inside native floor');
      assert(rect.x>=exitCaption.x+exitCaption.width||rect.x+rect.width<=exitCaption.x||rect.y>=exitCaption.y+exitCaption.height||rect.y+rect.height<=exitCaption.y,'zone caption does not cover physical exit text');
    }
  }
  const repeat=checks.some(check=>check.id===room.buildingId);
  await capture(room.buildingId+(repeat?'-revisit':'')+'-complete-interior');
  checks.push({name:'secondary-room-actual-keyboard-door-zones-passages-and-services',id:room.buildingId,archetype:room.secondaryLayoutV74.archetype,width:room.width,depth:room.depth,
    zoneIds:visitedZones,passageIds:room.secondaryLayoutV74.passages.map(p=>p.id),nativeFurniture:room.furniture.map(f=>f.id),services,floorCaptionsChecked:requireCaptions,noTeleport:true,noRuntimeReplacement:true});
  console.log(JSON.stringify({room:room.buildingId,visited:new Set(checks.filter(c=>c.id).map(c=>c.id)).size,total:37,revisit:repeat}));
}
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  // Must precede the first game RAF. Replacing the clock after mounting changes
  // performance.now origins and creates false idle/animation failures.
  await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub]').waitFor();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),expectedVersion);
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV66(page,api,{waypointTolerance:3,driverTickMs:16,pulseInputs:true});await nav.focus();
  // Choose the nearest unvisited real doorway to avoid crossing the entire city
  // between every home; navigation still uses the authored streets and collisions.
  assert(requestedIds.every(id=>rooms.some(room=>room.buildingId===id)),'diagnostic ids must name genuine secondary rooms');
  const pending=requestedIds.length?rooms.filter(room=>requestedIds.includes(room.buildingId)):[...rooms];
  while(pending.length){
    await exitRoom();const here=await nav.position();pending.sort((a,b)=>{
      const ba=api.HOMEWORLD_BUILDINGS.find(building=>building.id===a.buildingId),bb=api.HOMEWORLD_BUILDINGS.find(building=>building.id===b.buildingId);
      return Math.hypot(ba.x-here.x,ba.y-here.y)-Math.hypot(bb.x-here.x,bb.y-here.y);
    });await visitRoom(pending.shift());
  }
  await exitRoom();
  const room=api.homeworldInteriorForBuildingV64('residence-port-1');await visitRoom(room);
  await page.setViewportSize({width:393,height:852});await nav.tick(120);await nav.focus();
  for(const zone of room.zones)await followGoal(room,position=>inside(position,zone));
  // The hero wrapper is only a ground anchor; its absolutely positioned child
  // owns the bitmap. Measure that native sprite, never the anchor's small box.
  const nativeActor=page.locator('[data-homeworld-actor] [data-homeworld-unblooded-v72]');
  const actor=await nativeActor.boundingBox(),viewport=await page.locator('[data-homeworld-viewport]').boundingBox();
  const direction=await nativeActor.getAttribute('data-native-direction'),pose=await nativeActor.getAttribute('data-native-pose');
  const actorFrames=api.HOMEWORLD_YOUTH_MOTION_ART_V74.actors[direction],frame=[actorFrames.idle,...actorFrames.walk].find(frame=>frame.id===pose);
  assert(frame,'displayed native pose has measured alpha metadata');
  const scale=actor.height/frame.rect[3],painted={x:actor.x+frame.alphaBounds.x*scale,y:actor.y+frame.alphaBounds.y*scale,width:frame.alphaBounds.width*scale,height:frame.alphaBounds.height*scale};
  assert(painted.height>50,'mobile painted actor is readable, excluding native transparent gutters');
  assert(painted.x>=viewport.x-.5&&painted.x+painted.width<=viewport.x+viewport.width+.5&&painted.y>=viewport.y-.5&&painted.y+painted.height<=viewport.y+viewport.height+.5,'portrait camera retains whole painted native actor');
  await capture('residence-port-1-mobile-native-interior');checks.push({name:'secondary-interior-portrait-camera-and-readable-native-actor',actor,painted,direction,pose,viewport});
  const position=await nav.position(),before=await saveBytes();await page.getByRole('button',{name:'Pause',exact:true}).click();
  const seconds=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');await nav.tick(1200);
  assert.deepEqual(await nav.position(),position);assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),seconds);assert.equal(await saveBytes(),before);
  checks.push({name:'secondary-interior-pause-freezes-world-and-save'});await page.getByRole('button',{name:'Reprendre',exact:true}).click();await nav.tick(80);await exitRoom();
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const record='v74-layout:residence-port-1';await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(record);await page.locator('[data-homeworld-element-id="'+record+'"]').click();
  assert.equal(await page.locator('[data-homeworld-element-detail="'+record+'"]').count(),1);await capture('secondary-layout-codex-mobile');
  const atlasSave=await saveBytes(),atlasPosition=await nav.position();await nav.tick(1200);assert.equal(await saveBytes(),atlasSave);assert.deepEqual(await nav.position(),atlasPosition);
  checks.push({name:'v74-original-layout-codex-read-only',record});
  const source='/game/homeworld/v72/civic-furniture-kit.png',response=await page.request.get(url+source);assert.equal(response.status(),200);
  const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,'dd9193612dff71ddbe1a65c74ef5c55cd10a4202cabf08746ec94195a825a844');
  checks.push({name:'preserved-native-kit-production-http-sha',src:source,sha256:hash});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const distinctRooms=new Set(checks.filter(c=>c.id).map(c=>c.id));assert.equal(distinctRooms.size,requestedIds.length?new Set([...requestedIds,'residence-port-1']).size:37);
  const distinctZones=new Set(checks.flatMap(check=>check.zoneIds??[])),distinctPassages=new Set(checks.flatMap(check=>check.passageIds??[]));
  if(!requestedIds.length){assert.equal(distinctZones.size,80);assert.equal(distinctPassages.size,29);}
  const status=requestedIds.length?'PARTIAL_DIAGNOSTIC':'PASS';
  const report={status,version:expectedVersion,url,checks,captures,errors,failures,distinctRooms:distinctRooms.size,distinctZones:distinctZones.size,distinctPassages:distinctPassages.size,requestedIds,captionChecks:requireCaptions,
    limits:'New isolated profile seeds already model-tested prerequisite campaign. '+(requestedIds.length?'Only the explicitly requested diagnostic rooms are visited; this is not a complete37-room gate.':'All37 secondary doors,80 functional zones and29 passages are traversed by actual keyboard; existing secondary service dialogs opened without choosing rewards.')+' Source furniture PNG is unchanged. Original adaptation of this city, not canonical Yautja home customs. Civilian full walking sheets, private upper floors and new quests are outside this layout lot.'};
  await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status,distinctRooms:distinctRooms.size,checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',version:expectedVersion,url,error:String(error),checks,captures,errors,failures},null,2));throw error;}
finally{await browser.close();}
