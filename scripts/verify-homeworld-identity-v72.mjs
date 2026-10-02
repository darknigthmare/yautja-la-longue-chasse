import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';
const url=process.env.V72_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V72_IDENTITY_QA_OUTPUT??'work-local/v72/qa/identity';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldInteriorsV64.ts','homeworldSpatialCodex.ts','homeworldIdentityV72.ts','homeworldIdentityCodexV72.ts','homeworldFurnitureV72.ts','homeworldFunctionalInteriorsV72.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
let nav;
const decode=async()=>{
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.locator('[data-homeworld-civilian-v72],[data-native-building-atlas-v72],[data-homeworld-unblooded-v72]').evaluateAll(nodes=>Promise.all(nodes.map(async node=>{const source=getComputedStyle(node).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];if(source){const image=new Image();image.src=source;await image.decode();}})));
};
const capture=async name=>{await decode();const path=output+'/'+name+'.png';await page.screenshot({path});captures.push(path);};
const saved=()=>page.evaluate(key=>localStorage.getItem(key),p.SAVE_STORAGE_KEY);
function zoneRoute(room,start,zone){
  // The keyboard driver stops within three units of a waypoint. Reserve four
  // real units in the path so this tolerance cannot cut a physical wall corner.
  const clear=point=>{const margin=Math.min(4,Math.hypot(point.x-start.x,point.y-start.y)/2);return api.isHomeworldInteriorWalkableV64(room,point,{halfWidth:24+margin,halfDepth:14+margin});};
  const queue=[start],seen=new Set(),previous=new Map(),positions=new Map();let last;
  for(let i=0;i<queue.length;i++){
    const point=queue[i],key=point.x+','+point.y;if(seen.has(key)||!(i===0?api.isHomeworldInteriorWalkableV64(room,point):clear(point)))continue;seen.add(key);positions.set(key,point);
    if(point.x>zone.x+38&&point.x<zone.x+zone.width-38&&point.y>zone.y+38&&point.y<zone.y+zone.depth-38){last=key;break;}
    for(const[dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){const next={x:point.x+dx,y:point.y+dy},id=next.x+','+next.y,midpoint={x:point.x+dx/2,y:point.y+dy/2};if(seen.has(id)||previous.has(id)||!clear(next)||!(i===0?api.isHomeworldInteriorWalkableV64(room,midpoint):clear(midpoint)))continue;previous.set(id,key);queue.push(next);}
  }
  assert(last,room.buildingId+' whole-body route to '+zone.id);const points=[];while(last){points.push(positions.get(last));last=previous.get(last);}return points.reverse();
}
async function exitRoomSafely(){
  const id=await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id');if(!id)return;
  const room=api.homeworldInteriorForBuildingV64(id);await nav.follow(zoneRoute(room,await nav.position(),room.zones[0]));await nav.exitRoom();
}
async function verifyMotion(){
  const samples=[];await nav.focus();await page.keyboard.down('ArrowRight');
  for(let i=0;i<14;i++){await nav.tick(34);samples.push(await page.locator('[data-homeworld-unblooded-v72]').evaluate(e=>({clip:e.dataset.homeworldUnbloodedV72,frame:e.dataset.nativeFrame,facing:e.dataset.nativeFacing,bg:e.style.backgroundImage,transform:getComputedStyle(e.parentElement).transform,seconds:document.querySelector('[data-homeworld-viewport]').dataset.citySeconds})));}
  await page.keyboard.up('ArrowRight');await nav.tick(40);
  checks.push({name:'native-unblooded-motion-samples',samples});
  const moving=samples.filter(s=>s.clip==='walk');assert(moving.length>2);assert.deepEqual(new Set(moving.map(s=>s.frame)),new Set(['0','1']));assert(moving.every(s=>s.bg.includes('/game/youth/v48/unblooded-right.png')&&s.transform==='none'));
  await page.keyboard.down('ArrowLeft');await nav.tick(150);assert.equal(await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-native-facing'),'-1');assert((await page.locator('[data-homeworld-unblooded-v72]').getAttribute('style')).includes('/game/youth/v48/unblooded-left.png'));
  await capture('unblooded-native-left-walk');await page.keyboard.up('ArrowLeft');await nav.tick(100);assert.equal(await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-homeworld-unblooded-v72'),'idle');
  checks.push({name:'real-native-two-drawing-walk-and-left-right-unblooded',samples,limit:'Two native V48 walk drawings per facing, not an eight-direction full animation set.'});
}
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  // Install before the game creates its simulation RAF; resetting the clock
  // after mount would mix two performance.now origins in the QA harness.
  await page.clock.install();
  await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub]').waitFor();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.V72_IDENTITY_EXPECTED_VERSION??'V73');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV66(page,api,{waypointTolerance:3,driverTickMs:16,pulseInputs:true});await nav.focus();await capture('arrival-diverse-clothed-population');await verifyMotion();
  for(const id of['market-armory','deep-forge','clan-lodge','training-hall','memory-vault','throne-audience']){
    await exitRoomSafely();const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id),door=api.homeworldBuildingDoorwayV64(building),from=await nav.position(),route=api.homeworldSpatialRoute(from,door.approach);
    assert.equal(route.status,'reachable',id+' city route');await nav.follow(route.points);assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,id);
    assert.equal(await page.locator('[data-native-building-atlas-v72="'+id+'"]').count(),1);await capture(id+'-distinct-physical-facade');
    if(id==='market-armory')await capture('street-multiple-civic-facades-and-clothed-citizens');
    await page.keyboard.press('KeyE');await nav.tick(120);
    assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),id);const room=api.homeworldInteriorForBuildingV64(id);
    assert.equal(await page.locator('[data-homeworld-interior-zone-v72]').count(),3);assert.equal(await page.locator('[data-interior-partition-v72]').count(),4);
    assert.equal(await page.locator('[data-homeworld-art-id^="furniture-v72:"]').count(),5);
    for(const zone of room.zones.slice(1)){await nav.follow(zoneRoute(room,await nav.position(),zone));assert(api.isHomeworldInteriorWalkableV64(room,await nav.position()));await capture(id+'-'+zone.id.split('-').at(-1)+'-wing');}
    for(const placement of room.points){const point=api.HOMEWORLD_POINTS.find(p=>p.id===placement.pointId);if(!point?.npcId)continue;const role=api.HOMEWORLD_NPC_ROLES_V72[point.npcId];assert.equal(await page.locator('[data-homeworld-civilian-v72="'+role+'"]').count(),1,point.npcId+' dedicated costume');}
    checks.push({name:'functional-three-zone-public-wing-reached-by-keyboard',id,width:room.width,depth:room.depth,routeDistance:route.distance,zoneIds:room.zones.map(z=>z.id),nativeFurniture:room.furniture.map(f=>f.artId),noTeleport:true});
  }
  const audienceRoom=api.homeworldInteriorForBuildingV64('throne-audience');await nav.follow(zoneRoute(audienceRoom,await nav.position(),audienceRoom.zones[1]));
  const king=page.locator('[data-homeworld-civilian-v72="chief"]');assert.equal(await king.count(),1);const kingBox=await king.boundingBox();assert(kingBox.height>80);
  const kingArt=api.homeworldCivilianArtV72('chief'),paintedKingTop=kingBox.y+kingArt.alphaBounds.y*kingBox.height/kingArt.sourceRect.height;
  const kingLabel=page.locator('[data-homeworld-native-npc-label-v72="chief"]');assert.equal(await kingLabel.count(),1);const kingLabelBox=await kingLabel.boundingBox();
  assert(kingLabelBox.y+kingLabelBox.height<paintedKingTop,'the active chief label remains above his actual painted head');
  checks.push({name:'active-chief-label-clears-native-painted-head',paintedKingTop,labelBottom:kingLabelBox.y+kingLabelBox.height});await capture('chief-dedicated-mantle-and-public-audience-wing');
  await page.setViewportSize({width:393,height:852});await nav.tick(150);await nav.focus();const room=api.homeworldInteriorForBuildingV64('throne-audience');await nav.follow(zoneRoute(room,await nav.position(),room.zones[0]));await capture('citadel-mobile-follow-camera-public-wing');
  const actor=await page.locator('[data-homeworld-actor]').boundingBox(),viewport=await page.locator('[data-homeworld-viewport]').boundingBox();assert(actor.x>=viewport.x&&actor.x<=viewport.x+viewport.width&&actor.y>=viewport.y&&actor.y<=viewport.y+viewport.height,'mobile camera retains hero while navigating large interior');
  checks.push({name:'portrait-camera-follows-without-miniature-floor',actor,viewport});
  // The atlas belongs to the city, not to an interior. Verify the interior pause
  // in place, then return to the real street before opening the read-only atlas.
  const pausedPosition=await nav.position(),pausedSave=await saved();await page.getByRole('button',{name:'Pause',exact:true}).click();
  const pausedSeconds=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),pausedFrame=await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-native-frame');
  await nav.tick(1200);assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),pausedSeconds);assert.equal(await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-native-frame'),pausedFrame);assert.deepEqual(await nav.position(),pausedPosition);assert.equal(await saved(),pausedSave);
  checks.push({name:'interior-pause-freezes-position-native-cycle-and-save'});await page.getByRole('button',{name:'Reprendre',exact:true}).click();await nav.tick(80);await exitRoomSafely();
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const before=await saved(),position=await nav.position(),seconds=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),frame=await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-native-frame');
  const record='v72-furniture:throne-audience-v72-role-west';await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(record);await page.locator('[data-homeworld-element-id="'+record+'"]').click();
  assert.equal(await page.locator('[data-homeworld-element-detail="'+record+'"]').count(),1);await capture('real-ceremonial-seat-codex-portrait');await nav.tick(1200);
  assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),seconds);assert.equal(await page.locator('[data-homeworld-unblooded-v72]').getAttribute('data-native-frame'),frame);assert.deepEqual(await nav.position(),position);assert.equal(await saved(),before);
  assert.equal(await page.getByRole('dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'codex fits portrait');
  checks.push({name:'real-codex-furniture-read-only-and-paused-native-motion',record,noSaveMutation:true});
  for(const source of Object.values(JSON.parse(await fs.readFile('app/game/data/homeworldIdentityArtV72.json','utf8')))){
    const response=await page.request.get(url+source.src);assert.equal(response.status(),200);const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,source.sha256);checks.push({name:'preserved-native-identity-http-sha',src:source.src,sha256:hash});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,limits:'Prior nursery, youth and First Tracks are model-played prerequisites in a new isolated browser context. Six physical facades and every public wing are visited through actual keyboard movement; other 37 interiors keep existing plans. Named residents have 12 unique native costumes, existing population uses14 roles but civilian walking sheets are not produced. Unblooded walk uses2 native drawings per facing. Private floors/apartments of the chief citadel are not simulated. Architecture and civilian clothing are original lore-compatible adaptations, not canonical one-to-one landmarks.'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2));throw error;}
finally{await browser.close();}
