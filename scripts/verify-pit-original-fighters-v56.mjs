import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter,choosePitStage,closePitSelectionOptions,openPitPause,resumePitFight} from './pit-selection-browser-helpers.mjs';

const url=process.env.V56_FIGHTERS_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V56_FIGHTERS_QA_OUTPUT||'work-local/v56/original-fighters-browser-qa';
const temp=path.resolve('work-local/v56/temp');await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
await fs.mkdir(output,{recursive:true});
const art=JSON.parse(await fs.readFile('app/game/data/pitOriginalFighterArtV56.json','utf8')).fighters;
const bundle=await build({stdin:{contents:'export {PIT_ARENAS,PIT_CLOAK_COST} from "./app/game/systems/pitCombat"; export {getPitCharacterStageAssociation} from "./app/game/systems/pitCharacterStages";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[],captures=[],bouts=[],errors=[],httpFailures=[],nonReadRequests=[];
let browser,context,page;
const record=(name,details={})=>{checks.push({name,...details});console.log(JSON.stringify({check:name,passed:true}));};
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
const read=()=>page.evaluate(()=>{const root=document.querySelector('[data-pit-immersive]'),c=root?.querySelector('canvas[data-pit-fighter-positions]');return {
  phase:root?.dataset.pitPresentationPhase,blocked:root?.dataset.pitPresentationBlocked,frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
  positions:JSON.parse(c?.dataset.pitFighterPositions||'[]'),scene:c?.dataset.pitSceneArenaId,art:c?.dataset.pitArenaArtStatus,missing:Number(c?.dataset.pitArenaMissingAssets),
  zoom:Number(c?.dataset.pitCameraZoom),centerX:Number(c?.dataset.pitCameraCenterX),centerY:Number(c?.dataset.pitCameraCenterY),
  meters:[...root?.querySelectorAll('[role="progressbar"]')||[]].map(n=>({label:n.getAttribute('aria-label'),value:Number(n.getAttribute('aria-valuenow'))})),
  statuses:[...document.querySelectorAll('[data-pit-bitmap-status]')].map(n=>({id:n.dataset.pitBitmapId,status:n.dataset.pitBitmapStatus,slot:Number(n.dataset.pitBitmapSlot)})),
};});
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file:path.basename(file),sha256:digest(await fs.readFile(file)),visualReview:'pending-actual-image-inspection'});}
async function fit(){const s=await page.evaluate(()=>{const c=document.querySelector('canvas[data-pit-fighter-positions]'),r=c?.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,rect:r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null};});assert(s.scrollWidth<=s.viewport[0]+1);assert(s.rect&&s.rect.width>100&&s.rect.height>60);assert(s.rect.x>=-1&&s.rect.right<=s.viewport[0]+1&&s.rect.y>=-1&&s.rect.bottom<=s.viewport[1]+1);return s;}

/** Passive image observation only. Original draw runs first; no game state or clock is patched. */
function observeNativeCutouts(){
  const original=CanvasRenderingContext2D.prototype.drawImage,cache=new WeakMap();window.__pitV56Cutouts={draws:[],phases:[]};
  function support(image){if(cache.has(image))return cache.get(image);const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});original.call(ctx,image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let ySupport=null;
    for(let y=c.height-1;y>=0;y--){let n=0;for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>=128)n++;if(n>=Math.max(2,Math.min(8,Math.ceil(c.width*.003)))){ySupport=y+1;break;}}
    cache.set(image,ySupport);c.width=c.height=0;return ySupport;
  }
  CanvasRenderingContext2D.prototype.drawImage=function(...args){const result=original.apply(this,args);if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]'))return result;
    const e=window.__pitV56Cutouts,root=document.querySelector('[data-pit-immersive]'),phase=root?.dataset.pitPresentationPhase,countdown=Number(root?.dataset.pitPresentationCountdown),slot=Number(root?.dataset.pitPresentationFighterSlot);
    if(!e.phases.length||e.phases.at(-1).phase!==phase||e.phases.at(-1).countdown!==countdown||e.phases.at(-1).slot!==slot)e.phases.push({phase,countdown,slot});
    const image=args[0];if(!(image instanceof HTMLImageElement)||args.length!==5||!/\/game\/user-pack\/v56\/cutouts\//.test(image.currentSrc||image.src)||e.draws.length>=9000)return result;
    const m=this.getTransform();e.draws.push({src:new URL(image.currentSrc||image.src,location.href).pathname,phase,rect:args.slice(1),sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,
      supportEdge:support(image),alpha:this.globalAlpha,transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f},canvasHeight:this.canvas.height,
      zoom:Number(this.canvas.dataset.pitCameraZoom),centerY:Number(this.canvas.dataset.pitCameraCenterY)});return result;
  };
}
async function newPage(mobile){
  context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,reducedMotion:'no-preference'});
  const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);await context.addInitScript(observeNativeCutouts);
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)httpFailures.push({status:response.status(),url:response.url()});});
  page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method())&&new URL(r.url()).origin===new URL(url).origin)nonReadRequests.push({method:r.method(),path:new URL(r.url()).pathname});});
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),'V56','Wait for the V56 build, not the old195 dist');
  assert((await page.locator('body').innerText()).trim().length>30);assert.equal(await page.locator('[data-nextjs-dialog],vite-error-overlay,#webpack-dev-server-client-overlay').count(),0);
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
  assert.equal(Number(await page.locator('[data-pit-roster-total]').getAttribute('data-pit-roster-total')),198);return storage();
}
async function selectPair(pair){
  const portraits=[];
  for(const [slot,entry] of pair.entries()){
    await choosePitFighter(page,entry.fighterId);
    const icon=page.locator(`[data-pit-roster-icon="${entry.fighterId}"]`);assert.equal(await icon.getAttribute('src'),entry.icon.src);
    await page.waitForFunction(id=>document.querySelector(`article[data-fighter-id="${id}"] img[data-native-facing]`)?.dataset.artReady==='true',entry.fighterId);
    const observed=await page.locator(`article[data-fighter-id="${entry.fighterId}"] img[data-native-facing]`).evaluate(img=>({src:new URL(img.currentSrc,location.href).pathname,native:img.dataset.nativeFacing,facing:img.dataset.facing,mirror:new DOMMatrix(getComputedStyle(img).transform).a,complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}));
    assert.equal(observed.src,entry.src);assert.equal(observed.native,'right');assert.equal(observed.facing,slot===0?'right':'left');assert.equal(observed.mirror<0,slot===1);assert(observed.complete);assert.equal(observed.width,entry.width);assert.equal(observed.height,entry.height);portraits.push(observed);
    await shot(entry.fighterId+'-selection-slot'+slot);await page.locator('[data-pit-selection-confirm]').click();
  }
  await page.locator('[data-pit-selection-step="stage"]').waitFor();return portraits;
}
function grounding(draws,pair,arena){return pair.map((entry,slot)=>{
  const observed=draws.filter(d=>d.src===entry.src&&d.phase==='fight');assert(observed.length>2,entry.fighterId+' actual native draws');
  const gaps=observed.map(d=>{assert(Number.isFinite(d.supportEdge));assert.equal(d.transform.a<0,slot===1);assert(d.transform.d>0&&d.transform.b===0&&d.transform.c===0);
    const actual=d.transform.f+d.transform.d*(d.rect[1]+d.supportEdge*d.rect[3]/d.sourceHeight);
    const floor=d.canvasHeight/2+(arena.groundY-d.centerY)*d.zoom;return Math.abs(actual-floor);});
  assert(Math.max(...gaps)<.6,entry.fighterId+' alpha feet must meet the camera-transformed floor');return {fighterId:entry.fighterId,slot,src:entry.src,observedDraws:observed.length,maxGap:Math.max(...gaps),nativeAnimationClips:0};
});}
// The game polls held input on animation ticks; a zero-duration synthetic tap can land between ticks.
async function press(key){await page.keyboard.press(key,{delay:120});await page.waitForTimeout(80);}
async function approach(){await page.keyboard.down('ArrowRight');try{await page.waitForFunction(()=>{const c=document.querySelector('canvas[data-pit-fighter-positions]');const p=JSON.parse(c?.dataset.pitFighterPositions||'[]');return p.length===2&&Math.abs(p[1].x-p[0].x)<=63;},{},{timeout:6000});}finally{await page.keyboard.up('ArrowRight');}}

try{
  browser=await chromium.launch({channel:process.env.V56_FIGHTERS_QA_BROWSER_CHANNEL||'chrome',headless:true});
  for(let index=0;index<3;index++){
    const pair=[art[index],art[(index+1)%3]],mobile=index===2,association=api.getPitCharacterStageAssociation(pair[0].fighterId),before=await newPage(mobile);
    const portraits=await selectPair(pair);const note=page.locator('[data-pit-character-stage]');assert.equal(await note.getAttribute('data-pit-stage-classification'),'original-exhibition');assert((await note.innerText()).includes(association.reason));
    await choosePitStage(page,association.stageId);await page.waitForFunction(id=>{const c=document.querySelector('[data-pit-stage-preview]');return c?.dataset.pitStagePreview===id&&c.dataset.previewStatus==='ready';},association.stageId);
    await page.locator('[data-pit-scene-assets]').waitFor({state:'detached'});assert(await page.locator('[data-pit-selection-confirm]').isEnabled());await shot(pair[0].fighterId+'-exhibition');
    await page.evaluate(()=>{window.__pitV56Cutouts.draws=[];window.__pitV56Cutouts.phases=[];});if(mobile)await page.locator('[data-pit-selection-confirm]').tap();else await page.locator('[data-pit-selection-confirm]').click();
    await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='intro-left');await shot(pair[0].fighterId+'-intro');
    await page.waitForFunction(()=>{const r=document.querySelector('[data-pit-immersive]');return r?.dataset.pitPresentationPhase==='fight'&&r.dataset.pitPresentationBlocked==='false'&&Number(r.querySelector('[data-pit-frame]')?.dataset.pitFrame)>12;});
    const initial=await read(),evidence=await page.evaluate(()=>window.__pitV56Cutouts);assert.equal(initial.scene,association.stageId);assert.equal(initial.art,'bitmap');assert.equal(initial.missing,0);assert.deepEqual(initial.statuses.map(s=>s.id),pair.map(a=>a.fighterId));assert(initial.statuses.every(s=>s.status==='static-bitmap'));
    for(const phase of ['intro-left','intro-right'])assert(evidence.phases.some(p=>p.phase===phase));for(const countdown of [3,2,1])assert(evidence.phases.some(p=>p.phase==='countdown'&&p.countdown===countdown));
    const feet=grounding(evidence.draws,pair,api.PIT_ARENAS[association.stageId]),layout=await fit();await shot(pair[0].fighterId+'-fight-grounded');
    await page.keyboard.down('ArrowLeft');await page.keyboard.down('Numpad6');await page.waitForTimeout(900);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Numpad6');await page.waitForTimeout(250);
    const apart=await read();assert(apart.positions[0].x<initial.positions[0].x&&apart.positions[1].x>initial.positions[1].x);assert(apart.zoom<initial.zoom-.01);await shot(pair[0].fighterId+'-camera-wide');
    await openPitPause(page);const paused=await read();await page.waitForTimeout(200);assert.equal((await read()).frame,paused.frame);await resumePitFight(page);
    await approach();const health=page.getByRole('progressbar',{name:`Vie de ${pair[1].name}`,exact:true});const beforeHealth=Number(await health.getAttribute('aria-valuenow'));
    await press('KeyL');await page.waitForTimeout(1150);assert(Number(await health.getAttribute('aria-valuenow'))<beforeHealth,'Real player attack must damage the real opponent');
    let resourceCheck=null;
    if(pair[0].fighterId==='guest-amengi-female'){
      const meter=page.getByRole('progressbar',{name:'Traque de Amengi female',exact:true});
      for(let attempts=0;attempts<12&&Number(await meter.getAttribute('aria-valuenow'))<api.PIT_CLOAK_COST;attempts++){await approach();await press('KeyL');await page.waitForTimeout(1150);}
      const earned=Number(await meter.getAttribute('aria-valuenow'));assert(earned>=api.PIT_CLOAK_COST&&earned<1000,'Earn sufficient resource through real contact, below rupture threshold');
      const beforeDraws=await page.evaluate(()=>window.__pitV56Cutouts.draws.length);await press('KeyH');await page.waitForTimeout(300);
      const afterMeter=Number(await meter.getAttribute('aria-valuenow'));assert(afterMeter>=earned);assert.doesNotMatch(await page.getByLabel('États de Amengi female',{exact:true}).innerText(),/CAMO/);
      const afterDraws=await page.evaluate(n=>window.__pitV56Cutouts.draws.slice(n),beforeDraws);assert(afterDraws.some(d=>d.src===art[2].src));assert(afterDraws.filter(d=>d.src===art[2].src&&d.phase==='fight').every(d=>d.alpha>.95));
      resourceCheck={earned,afterMeter,actualResourceKey:'KeyH',noCamouflage:true,noInventedResourceSpend:true};await shot('amengi-resource-no-camouflage');
    }
    bouts.push({pair:pair.map(a=>a.fighterId),stageId:association.stageId,mobile,portraits,initial,apart,feet,layout,resourceCheck,realDamage:true});
    record('original-duel-'+pair[0].fighterId,{stageId:association.stageId,mobile,actualCutouts:2,intros:2,countdown:[3,2,1],cameraWidened:true,grounding:feet,resourceCheck});
    assert.equal(await storage(),before,'Local duel must preserve every saved byte');await context.close();context=null;page=null;
  }
  assert.equal(bouts.length,3);assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(nonReadRequests,[]);
  const report={status:'PASS',version:'V56',url,checkedAt:new Date().toISOString(),checks,bouts,captures,errors,httpFailures,nonReadRequests,allLocalStorageBytesUnchanged:true,
    limitations:['Three real exhibition bouts with actual controls; not198 complete application matches.','Single native cutouts, no new authored animation clips.','Mobile means Chromium landscape/touch emulation, not a physical handset.','Visual inspection of the resulting captures is required separately.']};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',bouts:bouts.length,captures:captures.length,output}));
}catch(error){if(page)await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,checks,bouts,errors,httpFailures,nonReadRequests,captures,state:page?await read().catch(()=>null):null,body:page?await page.locator('body').innerText().catch(()=>null):null},null,2));console.error(error);process.exitCode=1;}
finally{if(page)for(const key of ['ArrowLeft','ArrowRight','Numpad6'])await page.keyboard.up(key).catch(()=>{});await context?.close().catch(()=>{});await browser?.close();}
