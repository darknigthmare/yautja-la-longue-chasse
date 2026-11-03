import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
const url=process.env.V64_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V64_INTERIOR_QA_OUTPUT??'work-local/v64/qa/interiors';
const youth=process.env.V64_INTERIOR_QA_PHASE==='youth';
await fs.mkdir(output,{recursive:true});
const api=process.env.V64_QA_MODEL_FILE?await import(pathToFileURL(process.env.V64_QA_MODEL_FILE))
  :homeworldQaModelV64();
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[],events=[];
let page;
const keys=new Set();
const actor=()=>page.locator('[data-homeworld-actor]');
const position=()=>actor().evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y)}));
async function release(){for(const key of keys)await page.keyboard.up(key);keys.clear();await page.evaluate(()=>{window.__v64Pad.axes=[0,0];window.__v64Pad.buttons.forEach(b=>b.pressed=false);});}
async function focusWorld(){
  const city=page.locator('[data-homeworld-viewport]');await page.bringToFront();await city.waitFor();
  await page.waitForFunction(()=>{const e=document.querySelector('[data-homeworld-viewport]');return e&&!e.closest('[inert]')&&!document.hidden;});
  await city.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await city.focus();await page.waitForTimeout(80);
  assert(await city.evaluate(e=>document.activeElement===e&&document.hasFocus()),'world owns keyboard focus');
  return city;
}
async function driveTo(target,{mode='keyboard',tolerance=7}={}){
  let stagnant=0,old=await position();
  for(let step=0;step<500;step++){
    const p=await position(),dx=target.x-p.x,dy=target.y-p.y;
    if(Math.abs(dx)<=tolerance&&Math.abs(dy)<=tolerance){
      await release();
      // A browser frame can still run between the position read and key release.
      // Verify the settled position instead of accepting that earlier sample.
      const stopped=await position();
      if(Math.abs(target.x-stopped.x)<=tolerance&&Math.abs(target.y-stopped.y)<=tolerance)return stopped;
      old=stopped;continue;
    }
    const x=Math.abs(dx)>tolerance?Math.sign(dx):0,y=Math.abs(dy)>tolerance?Math.sign(dy):0;
    if(mode==='gamepad')await page.evaluate(({x,y})=>{window.__v64Pad.axes=[x,y];},{x,y});
    else {
      const needed=new Set([...(x?[x<0?'ArrowLeft':'ArrowRight']:[]),...(y?[y<0?'ArrowUp':'ArrowDown']:[])]);
      for(const key of keys)if(!needed.has(key)){await page.keyboard.up(key);keys.delete(key);}
      for(const key of needed)if(!keys.has(key)){await page.keyboard.down(key);keys.add(key);}
    }
    await page.waitForTimeout(25);
    if(Math.hypot(p.x-old.x,p.y-old.y)<1)stagnant++;else stagnant=0;
    assert(stagnant<30,`stuck at ${JSON.stringify(p)} toward ${JSON.stringify(target)}`);old=p;
  }
  throw new Error('walking exceeded budget toward '+JSON.stringify(target));
}
async function follow(points,mode='keyboard'){
  for(let i=1;i<points.length;i++){
    const from=points[i-1],to=points[i],steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/32));
    for(let j=1;j<=steps;j++)await driveTo({x:from.x+(to.x-from.x)*j/steps,y:from.y+(to.y-from.y)*j/steps},{mode});
  }
}
async function interact(mode='keyboard'){
  await release();await page.waitForTimeout(80);
  if(mode==='gamepad'){await page.evaluate(()=>window.__v64Pad.buttons[0].pressed=true);await page.waitForTimeout(100);await page.evaluate(()=>window.__v64Pad.buttons[0].pressed=false);}
  else await page.keyboard.press('KeyE');
  await page.waitForTimeout(100);
}
function interiorRoute(room,from,targetKind){
  const queue=[from],seen=new Set(),previous=new Map(),positions=new Map();let last;
  for(let cursor=0;cursor<queue.length;cursor++){
    const p=queue[cursor],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);positions.set(key,p);
    const target=api.nearestHomeworldInteriorTargetV64(room,p);
    if(target&&(target.kind===targetKind||target.pointId===targetKind)
      &&Math.hypot(p.x-target.position.x,p.y-target.position.y)<(target.kind==='exit'?10:50)){last=key;break;}
    for(const [dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){
      const q={x:p.x+dx,y:p.y+dy},next=q.x+','+q.y;
      if(seen.has(next)||previous.has(next)||!api.isHomeworldInteriorWalkableV64(room,q))continue;
      previous.set(next,key);queue.push(q);
    }
  }
  assert(last,'reachable room target '+targetKind);const route=[];
  while(last){route.push(positions.get(last));last=previous.get(last);}return route.reverse();
}
try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({at:new Date().toISOString(),kind:'navigation',url:frame.url()});});
  page.on('console',message=>{if(/Fast Refresh|HMR|reload/i.test(message.text()))events.push({at:new Date().toISOString(),kind:'dev-server',message:message.text()});});
  await page.addInitScript(()=>{window.__v64Pad={id:'QA controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__v64Pad]});});
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')));
  if(youth){
    const archive=process.env.V64_YOUTH_PLAYED_ARCHIVE??'work/v47/nursery-scene-browser-qa/played-campaign-storage.json';
    const storage=JSON.parse(await fs.readFile(archive,'utf8')),original=JSON.parse(storage['yautja-long-hunt.save']);
    assert.equal(original.prologue.status,'completed');assert.equal(original.prologue.checkpoint.winner,'player');
    assert.equal(original.homeworld.greetedNpcIds.length,0);
    await page.goto(url,{waitUntil:'networkidle',timeout:120000});
    // Keep the full, actually played archive: its old appearance has no headStyleId.
    // This also checks compatibility of the optional V63 appearance field.
    await page.evaluate(entries=>{if(localStorage.length)throw Error('Isolated empty context required');for(const [key,value]of Object.entries(entries))localStorage.setItem(key,value);},storage);
    await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
    await page.locator('[data-unblooded-objective="chief"]').waitFor();
  }else{
    const fixture=structuredClone(await campaignFixture());fixture.save.appearance.presetId='custom';
    await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
    await enterCampaignDeck(page,{url});await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  }
  await focusWorld();
  const baselineYouth=youth?await saved():null;
  assert.equal(await page.locator('[data-building-id]').count(),43);
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:output+'/spaceport.jpg',type:'jpeg',quality:82});
  const ids=youth?['training-hall','market-armory','throne-audience','training-hall']:['residence-port-2','residence-port-1','residence-market-1','dock-control','market-armory','trophy-mausoleum'];
  for(const [index,id]of ids.entries()){
    const captureId=youth?`${index+1}-${id}`:id;
    const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id),door=api.homeworldBuildingDoorwayV64(building),room=api.homeworldInteriorForBuildingV64(id);
    const route=api.homeworldSpatialRoute(await position(),door.approach);assert.equal(route.status,'reachable',id+' exterior route');
    await focusWorld();await follow(route.points,index===1?'gamepad':'keyboard');
    const atDoor=await position();assert.equal(api.nearestHomeworldDoor(atDoor)?.id,id);
    await page.locator(`[data-homeworld-door-id="${id}"]`).waitFor();
    await page.screenshot({path:output+'/'+captureId+'-door.jpg',type:'jpeg',quality:82});
    await interact(index===1?'gamepad':'keyboard');
    await page.locator(`[data-homeworld-hub][data-homeworld-interior-id="${id}"]`).waitFor();
    await focusWorld();assert(Math.hypot((await position()).x-room.spawn.x,(await position()).y-room.spawn.y)<2);
    assert.equal(await page.getByRole('button',{name:/Atlas de la cité/}).count(),0,'interior coordinates are never fed to exterior atlas');
    await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.screenshot({path:output+'/'+captureId+'-interior.jpg',type:'jpeg',quality:85});
    if(index===0){
      await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Pause',exact:true}).click();
      const frozen=await position();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(150);assert.deepEqual(await position(),frozen);
      await page.getByRole('button',{name:'Reprendre l’exploration',exact:true}).click();await focusWorld();
      await page.setViewportSize({width:393,height:852});await page.waitForTimeout(150);await page.screenshot({path:output+'/domestic-mobile.jpg',type:'jpeg',quality:85});
      const controls=await page.locator('[data-homeworld-hub]').evaluate(hub=>[...hub.querySelectorAll('button')].filter(button=>!button.closest('[hidden]')&&button.getBoundingClientRect().width>0).map(button=>({text:button.textContent,top:button.getBoundingClientRect().top,bottom:button.getBoundingClientRect().bottom,left:button.getBoundingClientRect().left,right:button.getBoundingClientRect().right})));
      assert(controls.every(b=>b.top>=0&&b.bottom<=853&&b.left>=0&&b.right<=394),'every visible in-game control fits the mobile viewport');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1440,height:1000});await focusWorld();
    }
    let dialogue=null;
    if(room.points.length){
      const pointId=room.points[0].pointId;await follow(interiorRoute(room,await position(),pointId));
      await interact();const dialog=page.getByRole('dialog');await dialog.waitFor();dialogue=await dialog.innerText();
      if(youth){
        const state=await saved();
        if(index===0){assert(!state.homeworld.greetedNpcIds.includes('terrace-instructor'));assert.equal(await page.locator('[data-youth-enter-dojo]').count(),0);}
        if(id==='market-armory')assert(await dialog.getByRole('button',{name:'Formation préalable requise',exact:true}).isDisabled());
        if(id==='throne-audience')assert(state.homeworld.greetedNpcIds.includes('hunt-king'));
        if(index===3){assert(state.homeworld.greetedNpcIds.includes('terrace-instructor'));assert.equal(await page.locator('[data-youth-enter-dojo]').count(),1);}
        assert.equal(state.youthTraining??null,baselineYouth.youthTraining??null,'visits cannot grant training');
        assert.deepEqual(state.prologue.chronicle,baselineYouth.prologue.chronicle,'visits cannot mint chronicle proofs');
        assert.deepEqual(state.loadout,baselineYouth.loadout,'visits cannot grant equipment');
        await page.screenshot({path:output+'/'+captureId+'-dialog.jpg',type:'jpeg',quality:82});
      }
      const frozen=await position();await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);assert.deepEqual(await position(),frozen,'dialog pauses walking');
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await focusWorld();
    }
    await follow(interiorRoute(room,await position(),'exit'),index===1?'gamepad':'keyboard');
    await page.locator('[data-homeworld-interior-target="exit"]').waitFor();await interact(index===1?'gamepad':'keyboard');
    await page.locator('[data-homeworld-viewport][data-homeworld-space="city"]').waitFor();
    const outside=await position();assert(Math.hypot(outside.x-door.approach.x,outside.y-door.approach.y)<2,'exit returns to the same exterior approach');
    checks.push({id,kind:room.kind,variant:room.variant,atDoor,spawn:room.spawn,outside,routeDistance:route.distance,input:index===1?'gamepad':'keyboard',dialogue});
    await fs.writeFile(output+'/progress.json',JSON.stringify({checks,errors,events},null,2));
    console.log(JSON.stringify({visited:id,rooms:checks.length}));
  }
  if(youth){
    const beforeReload=await saved();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
    await page.locator('[data-unblooded-objective="training"]').waitFor();assert.deepEqual((await saved()).homeworld.greetedNpcIds,beforeReload.homeworld.greetedNpcIds);
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,phase:youth?'youth':'adult',checks,errors,events,scope:youth?'Actually played nursery QA archive; physical mentor before chief refusal, locked armory, chief then mentor, no fake training/equipment/proof; reload retains greetings. No real user saves.':'Six actual keyboard/gamepad door crossings and physical exits; three domestic plans, three civic rooms and existing dialogues, pause and one mobile domestic view. No teleportation or real user saves. Geometry coverage is separately43 rooms.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',rooms:checks.length,output}));
}catch(error){const current=page?await position().catch(()=>null):null;if(page)await page.screenshot({path:output+'/failure.jpg',type:'jpeg',quality:82}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),current,checks,errors,events},null,2)).catch(()=>{});throw error;}
finally{await browser.close();}
