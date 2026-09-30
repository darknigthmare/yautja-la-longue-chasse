import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V63_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V63_HOMEWORLD_QA_OUTPUT??'work-local/v63/qa/homeworld-dreads';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
const errors=[],checks=[];
const angleDistance=(a,b)=>Math.hypot(...a.hair.map((strand,i)=>strand.angle-b.hair[i].angle));

// Visible lazy-screen DOM is not proof of keyboard ownership. Require the
// active ancestor and real focus over rendered frames before sending keys.
// Never retry movement or inject keys into the component to make it pass.
async function focusCity(city) {
  await page.bringToFront();
  await page.waitForFunction(()=>{
    const city=document.querySelector('[aria-label="Cité jouable en perspective 2.5D"]');
    return city&&!city.closest('[inert]')&&!document.hidden;
  });
  await city.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await city.focus();
  const focus=await city.evaluate(async e=>{
    const frames=[];
    for(let i=0;i<4;i++){
      await new Promise(resolve=>requestAnimationFrame(resolve));
      frames.push({owned:document.activeElement===e,windowFocused:document.hasFocus(),inert:!!e.closest('[inert]')});
    }
    return frames;
  });
  assert(focus.every(frame=>frame.owned&&frame.windowFocused&&!frame.inert),'city must own live keyboard focus before movement');
  return focus;
}

try{
  for(const headStyleId of ['reference','legacy-clan']){
    // Each page has an independent browser context: no user or sibling QA data.
    page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',e=>errors.push(e.message));
    const fixture=structuredClone(await campaignFixture());
    Object.assign(fixture.save.appearance,{presetId:'custom',headStyleId,dreadStyleId:'braided'});
    await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},fixture);
    await page.addInitScript(()=>{
      window.__v63Focus=[];
      for(const type of ['focusin','keydown','keyup'])document.addEventListener(type,e=>window.__v63Focus.push({type,key:e.key,time:performance.now(),target:e.target?.outerHTML?.slice(0,400)}),true);
    });
    await enterCampaignDeck(page,{url});
    await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
    const city=page.getByRole('group',{name:'Cité jouable en perspective 2.5D',exact:true});
    await city.waitFor();
    const hero=page.locator('[data-homeworld-actor]');
    await hero.locator('[data-modular-homeworld-character]').waitFor();
    await hero.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    const sample=()=>hero.evaluate(e=>({
      x:Number(e.dataset.x),moving:e.dataset.moving,facing:Number(e.dataset.facing),
      head:e.querySelector('[data-homeworld-body-part="head"]').getAttribute('src'),
      hair:[...e.querySelectorAll('[data-homeworld-layer="dread"]')].map(strand=>{
        const css=getComputedStyle(strand),matrix=new DOMMatrix(css.transform);
        const [ox,oy]=css.transformOrigin.split(' ').map(parseFloat);
        const width=parseFloat(css.width),height=parseFloat(css.height);
        // Actual browser matrix and transform origin, in the 256x384 canvas.
        const dx=143/256*width-ox,dy=43/384*height-oy;
        return {transform:strand.style.transform,angle:Number(strand.style.transform.match(/rotate\(([-.\de+]+)rad\)/)[1]),
          contacts:Number(strand.dataset.dreadCollisions),loaded:strand.complete&&strand.naturalWidth>0,
          root:{x:(matrix.a*dx+matrix.c*dy+matrix.e+ox)/width*256,y:(matrix.b*dx+matrix.d*dy+matrix.f+oy)/height*384}};
      })
    }));
    const initialFocus=await focusCity(city),rest=await sample();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    const moving=await sample();
    await page.screenshot({path:output+'/'+headStyleId+'-moving.png'});
    await page.keyboard.up('ArrowRight');
    assert(moving.x>rest.x+10,'the actual city actor must move to the right');
    assert.equal(moving.facing,1);
    assert(angleDistance(moving,rest)>.01,'strands must follow actual movement');

    await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Pause',exact:true}).click();
    await page.waitForTimeout(80);
    const paused=await sample();
    await page.waitForTimeout(400);
    assert.deepEqual(await sample(),paused,'pause must freeze the strands and actor exactly');
    await page.screenshot({path:output+'/'+headStyleId+'-paused.png'});
    await page.getByRole('button',{name:'Reprendre l’exploration',exact:true}).click();
    const resumedFocus=await focusCity(city);
    await page.waitForTimeout(160);
    const braking=await sample();
    await page.waitForTimeout(2500);
    const settled=await sample();
    await page.waitForTimeout(400);
    const restingAgain=await sample();
    assert.equal(settled.moving,'false');
    assert.equal(settled.x,restingAgain.x,'released movement must not drift');
    assert(angleDistance(braking,rest)>.001,'braking must retain secondary motion');
    assert(angleDistance(settled,rest)<angleDistance(braking,rest)*.1,'spring displacement must decay after braking');
    assert(angleDistance(restingAgain,rest)<.001,'strands must return near their rest angles');
    await page.screenshot({path:output+'/'+headStyleId+'-settled.png'});

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(400);
    const left=await sample();
    await page.keyboard.up('ArrowLeft');
    assert(left.x<settled.x-10);assert.equal(left.facing,-1);
    const states={rest,moving,paused,braking,settled,restingAgain,left};
    const rootOffsets=[[-6,5],[-4,1],[-2,-2],[0,-4],[2,-2],[3,3],[4,7]];
    const socket=headStyleId==='reference'?{x:108,y:42}:{x:110,y:43};
    let maxRootError=0;
    for(const state of Object.values(states)){
      assert.equal(state.hair.length,7);
      assert(state.hair.every(strand=>strand.loaded&&strand.contacts===0));
      assert.match(state.head,headStyleId==='reference'?/\/v62\/heads\//:/\/parts\/head\.webp$/);
      state.hair.forEach((strand,i)=>{
        const error=Math.hypot(strand.root.x-socket.x-rootOffsets[i][0],strand.root.y-socket.y-rootOffsets[i][1]);
        maxRootError=Math.max(maxRootError,error);
        assert(error<.01,'source collar must stay at the correct scalp socket through movement and pause');
      });
    }
    checks.push({headStyleId,initialFocus,resumedFocus,maxRootError,
      brakingDistance:angleDistance(braking,rest),settledDistance:angleDistance(settled,rest),states,
      focusHistory:await page.evaluate(()=>window.__v63Focus)});
    await page.close();
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,
    scope:'Real city keyboard input, CSS scalp attachments, damped braking, facing reversal and exact pause in two isolated fixtures. No user save changed.',
    limits:'Constrained 2D angular springs on seven bitmap strands with head/neck/torso envelopes; not a 3D rope or mesh model, no strand-to-strand collision.',
    focusDiagnosis:'The initial actor-not-moving failure did not reproduce before changes. The harness now requires a non-inert screen and stable actual keyboard focus; no runtime focus change was necessary.',checks,errors},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',headStyles:checks.length}));
}catch(error){
  await page?.screenshot({path:output+'/failure.png'}).catch(()=>{});
  await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),diagnostics:await page?.evaluate(()=>({focus:document.activeElement?.outerHTML,hasFocus:document.hasFocus(),history:window.__v63Focus,cityInert:!!document.querySelector('[aria-label="Cité jouable en perspective 2.5D"]')?.closest('[inert]')}))},null,2));
  throw error;
}finally{await browser.close();}

