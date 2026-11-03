import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from 'playwright-core';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

// Diagnostic bundle only: render the actual component without editing Next or PNGs.
const bundle=await build({stdin:{contents:"export * from './app/game/systems/homeworldCivilianMotionV74.ts';export * from './app/game/systems/homeworldIdentityV72.ts';export * from './app/game/systems/homeworldLifeV69.ts';export * from './app/game/systems/homeworldCity.ts';export {default as Civilian} from './app/game/HomeworldCivilianV72.tsx';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const url=(process.env.V74_CIVILIAN_QA_URL??'http://127.0.0.1:4192').replace(/\/$/,''),output=process.env.V74_CIVILIAN_QA_OUTPUT??'work-local/v74/qa/civilian-motion-local';
await fs.mkdir(output,{recursive:true});
const checks=[],captures=[],errors=[],failures=[],manifest=api.HOMEWORLD_CIVILIAN_MOTION_V74;
const limits='PARTIAL_ART / functional checks only. Four stylized poses per direction are wired, but near/far anatomical leg alternation is not artistically certified for every role. This is not fourteen commercially finalized walk cycles. The 112-pose board uses the actual component; live city checks cover visible culled citizens, not all 98 simultaneously. Campaign prerequisites are model-played only in isolated QA storage. No claim of persistent instantaneous hub coordinates.';
let browser,page;
const report=async(status,error)=>fs.writeFile(output+'/report.json',JSON.stringify({status,artStatus:'PARTIAL_ART',url,checks,captures,errors,failures,limits,...(error?{error:String(error)}:{})},null,2)+'\n');
const capture=async(target,name)=>{const file=output+'/'+name+'.jpg';await target.screenshot({path:file,type:'jpeg',quality:90,fullPage:name.startsWith('pose-board')});captures.push(file);};

try{
  assert.equal(Object.keys(manifest.sources).length,8);assert.equal(Object.keys(manifest.roles).length,14);
  const poseCards=[];
  for(const role of api.HOMEWORLD_CIVILIAN_ROLES_V72){let figures='';
    for(const facing of [1,-1])for(let index=0;index<4;index++){
      const seconds=index/6+.001,sample=api.homeworldCivilianMotionFrameV74(role,seconds,facing,100);
      assert.equal(sample.index,index);assert.equal(sample.clip,facing===1?'right':'left');
      const html=renderToStaticMarkup(api.Civilian({role,facing,moving:true,seconds,height:100}));
      assert(!html.includes('transform:'));assert(!html.includes('animation:'));
      figures+='<div class="cell"><div class="origin">'+html+'</div><b>'+(facing===1?'D':'G')+index+'</b></div>';
    }
    poseCards.push('<section><h2>'+role+'</h2><div class="figures">'+figures+'</div></section>');
  }
  checks.push({name:'actual-component-112-native-pose-windows',roles:14,poses:112,nativeDirections:2,artStatus:'PARTIAL_ART'});
  const residents=api.HOMEWORLD_RESIDENTS_V69;
  assert.equal(residents.length,98);
  const metadata=residents.map(resident=>{
    const role=api.homeworldResidentRoleV72(resident),poses=[0,5,30,120,240].map(seconds=>{
      const pose=api.homeworldResidentPoseV69(resident,seconds),frame=api.homeworldCivilianMotionFrameV74(role,seconds+resident.phaseSeconds,pose.facing,resident.morphId==='young'?82:100,resident.speed);
      assert(Number.isFinite(pose.x)&&Number.isFinite(pose.y));assert(frame.index>=0&&frame.index<4);
      assert.deepEqual(api.homeworldResidentPoseV69(resident,seconds),pose,'same city time freezes actual route');
      return {seconds,...pose,frame:frame.index,clip:frame.clip};
    });
    return {id:resident.id,districtId:resident.districtId,profession:resident.role,role,path:resident.path,speed:resident.speed,phaseSeconds:resident.phaseSeconds,dwellSeconds:resident.dwellSeconds,poses,nonBlocking:true};
  });
  assert(new Set(metadata.map(r=>r.poses[1].frame)).size>=3,'stable existing offsets prevent synchronized population');
  await fs.writeFile(output+'/resident-route-metadata.json',JSON.stringify(metadata,null,2)+'\n');
  checks.push({name:'98-existing-route-and-phase-metadata',residents:98,routeSamples:490,limit:'Model metadata, not 98 physically traversed browser routes.'});
  const html='<!doctype html><meta charset="utf-8"><title>V74 actual civilian pose board — PARTIAL_ART</title><style>*{box-sizing:border-box}body{margin:0;background:#192620;color:#ecd5a7;font:14px system-ui}h1{font-size:20px;padding:12px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px}section{border:1px solid #605c39;background:#25382d}h2{font-size:16px;margin:8px}.figures{display:grid;grid-template-columns:repeat(4,1fr)}.cell{height:145px;position:relative;overflow:hidden;border:1px solid #516144}.origin{position:absolute;left:50%;bottom:22px}.origin:before{content:"";position:absolute;left:-55px;width:110px;top:0;border-top:1px solid #dfc285}.cell b{position:absolute;bottom:3px;left:4px}</style><h1>Composant réel · 14 rôles × 8 poses · PARTIAL_ART</h1><main>'+poseCards.join('')+'</main>';
  await fs.writeFile(output+'/actual-component-pose-board.html',html.replaceAll("url(&#x27;/game/","url(&#x27;"+url+"/game/").replaceAll("url('/game/","url('"+url+"/game/"));
  if(process.env.V74_CIVILIAN_QA_MODEL_ONLY==='1'){
    await report('MODEL_PASS_BROWSER_NOT_RUN');console.log(JSON.stringify({status:'MODEL_PASS_BROWSER_NOT_RUN',checks:checks.length,output}));
  }else{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(90000);
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
    for(const source of Object.values(manifest.sources)){
      const response=await page.request.get(url+source.src);assert.equal(response.status(),200);
      const sha=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(sha,source.sha256);
      checks.push({name:'native-source-http-and-byte-sha256',src:source.src,sha256:sha});
    }
    const board=await context.newPage();
    await board.setContent(await fs.readFile(output+'/actual-component-pose-board.html','utf8'),{waitUntil:'networkidle'});
    assert.equal(await board.locator('[data-native-frame]').count(),112);
    // This separate board decodes its source images for an art screenshot. The
    // live city below must rely on the runtime loader before its FIRST step.
    await board.locator('[data-native-source]').evaluateAll((nodes,base)=>Promise.all([...new Set(nodes.map(n=>new URL(n.dataset.nativeSource,base).href))].map(async src=>{const image=new Image();image.src=src;await image.decode();})),url);
    await capture(board,'pose-board-112-native-windows');await board.close();
    const fixture=firstTracksCompleted();
    await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:fixture});
    await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
    await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
    assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V74');
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
    const nav=homeworldNavigatorV66(page,api);await nav.focus();
    const before=await nav.position();await page.keyboard.down('ArrowRight');await nav.tick(400);await page.keyboard.up('ArrowRight');await nav.tick(80);
    const after=await nav.position();assert(Math.hypot(after.x-before.x,after.y-before.y)>12,'first actual step works after built-in cold preload');
    checks.push({name:'live-cold-loader-before-first-keyboard-step',before,after,manualDecodeBeforeFirstStep:false});
    const sample=()=>page.locator('[data-homeworld-viewport]').evaluate(viewport=>({seconds:Number(viewport.dataset.citySeconds),actors:[...viewport.querySelectorAll('[data-homeworld-resident]')].map(node=>{const clip=node.querySelector('[data-homeworld-civilian-v72]');return{id:node.dataset.homeworldResident,x:Number(node.dataset.x),y:Number(node.dataset.y),moving:node.dataset.moving==='true',role:clip.dataset.homeworldCivilianV72,clip:clip.dataset.nativeClip,frame:Number(clip.dataset.nativeFrame),source:clip.dataset.nativeSource,transform:getComputedStyle(clip).transform};})}));
    const samples=[];
    for(let n=0;n<40;n++){await nav.tick(100);samples.push(await sample());}
    const byId=new Map(residents.map(r=>[r.id,r])),seenIds=new Set(),seenRoles=new Set();let nativeSamples=0;
    for(const snapshot of samples)for(const actor of snapshot.actors){
      const resident=byId.get(actor.id);assert(resident,'live resident belongs to unchanged registry');
      const role=api.homeworldResidentRoleV72(resident);assert.equal(actor.role,role);seenIds.add(actor.id);seenRoles.add(role);
      const pose=api.homeworldResidentPoseV69(resident,snapshot.seconds);assert(Math.hypot(actor.x-pose.x,actor.y-pose.y)<1,'visible route follows actual rounded city clock');
      if(actor.moving){
        nativeSamples++;assert(actor.clip.startsWith('walk-'));assert.equal(actor.transform,'none');
        const nearbyTimes=[-.025,0,.025].map(offset=>api.homeworldCivilianMotionFrameV74(role,snapshot.seconds+resident.phaseSeconds+offset,pose.facing,resident.morphId==='young'?82:100,resident.speed));
        assert(nearbyTimes.some(frame=>frame.index===actor.frame&&frame.source.src===actor.source),'native window follows stable phase and route speed');
      }else{assert.equal(actor.clip,'idle');assert.equal(actor.source,api.homeworldCivilianArtV72(role).src);}
    }
    assert(seenIds.size>0&&nativeSamples>10,'city visibly renders native moving citizens');
    assert(new Set(samples.flatMap(s=>s.actors.filter(a=>a.moving).map(a=>a.frame))).size>=3,'live PNG windows advance');
    await fs.writeFile(output+'/visible-city-samples.json',JSON.stringify(samples,null,2)+'\n');
    await capture(page,'city-civilian-native-walk');checks.push({name:'live-culled-population-native-frames',snapshots:samples.length,residentsSeen:[...seenIds],rolesSeen:[...seenRoles],nativeSamples,limit:'Only visible citizens at this viewport, not all 98 simultaneously.'});
    await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Pause',exact:true}).click();await nav.tick(100);
    const paused=await sample();await nav.tick(2000);assert.deepEqual(await sample(),paused,'real public pause freezes routes AND native windows');
    await capture(page,'city-pause-freezes-native-frames');
    await page.getByRole('button',{name:'Reprendre l’exploration',exact:true}).click();await nav.focus();await nav.tick(500);assert((await sample()).seconds>paused.seconds);
    checks.push({name:'public-pause-freezes-shared-clock-and-clips',durationMs:2000});
    await page.setViewportSize({width:393,height:852});await nav.tick(150);await nav.focus();
    const mobileBefore=await nav.position();await page.keyboard.down('ArrowLeft');await nav.tick(300);await page.keyboard.up('ArrowLeft');await nav.tick(80);
    assert(Math.hypot((await nav.position()).x-mobileBefore.x,(await nav.position()).y-mobileBefore.y)>8);
    const mobile=await sample();assert(mobile.actors.length>0,'portrait viewport keeps visible civilians');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'portrait screen has no horizontal page overflow');
    await capture(page,'city-native-civilian-portrait');checks.push({name:'portrait-native-population-and-real-keyboard-step',viewport:{width:393,height:852},visibleResidents:mobile.actors.length});
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    await report('PASS');console.log(JSON.stringify({status:'PASS',artStatus:'PARTIAL_ART',checks:checks.length,captures:captures.length,output}));
  }
}catch(error){if(page)await capture(page,'failure').catch(()=>{});await report('FAIL',error);throw error;}
finally{if(browser)await browser.close();}
