import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.V38_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V38_ANIMATION_QA_OUTPUT||'work/v38/animation-qa';
await fs.mkdir(output,{recursive:true});
const registryText=await fs.readFile('app/game/pitSpriteSheetRegistry.ts','utf8');
const registry=JSON.parse(registryText.slice(registryText.indexOf('= [')+2).trim().replace(/;$/,''));
const targets=registry.filter(entry=>['berserker-hitstun-v38','city-hunter-high-guard-left-v38','city-hunter-high-guard-right-v37'].includes(entry.atlas.id));
assert.equal(targets.length,3);
const mappings=targets.flatMap(entry=>entry.atlas.clips.flatMap(clip=>clip.frames.map(frame=>({atlas:entry.atlas.id,facing:clip.facing,rect:frame.rect}))));
const errors=[],failures=[],labChecks=[],combatChecks=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
try {
  page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
  await page.addInitScript(mappings=>{
    const original=CanvasRenderingContext2D.prototype.drawImage;
    window.__v38AnimationDraws=[];
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      if(this.canvas.width===960&&this.canvas.height===540&&args.length===9){
        const match=mappings.find(item=>item.rect.every((value,index)=>value===args[index+1]));
        if(match){window.__v38AnimationDraws.push({...match,destination:args.slice(5)});if(window.__v38AnimationDraws.length>1200)window.__v38AnimationDraws.shift();}
      }
      return original.apply(this,args);
    };
  },mappings);
  await page.goto(base+'/pit-lab',{waitUntil:'networkidle'});
  const lab=page.locator('[data-pit-production-lab]');
  for(const entry of targets){
    await page.getByLabel('Combattant',{exact:true}).selectOption(entry.fighterId);
    await page.getByLabel('Atlas validé',{exact:true}).selectOption(entry.atlas.id);
    for(const clip of entry.atlas.clips){
      await page.getByLabel('Orientation',{exact:true}).selectOption(clip.facing);
      await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');
      await page.getByRole('button',{name:'Début',exact:true}).click();
      assert.equal(await lab.getAttribute('data-clip'),clip.id);
      for(let i=0;i<clip.frames.length;i++){
        if(i)await page.getByRole('button',{name:'+1 dessin',exact:true}).click();
        await page.waitForFunction(index=>Number(document.querySelector('[data-pit-production-lab]')?.dataset.frameIndex)===index,i);
        await page.locator('canvas').screenshot({path:`${output}/${entry.atlas.id}-${clip.facing}-${i}.png`});
      }
      labChecks.push({atlas:entry.atlas.id,clip:clip.id,facing:clip.facing,drawings:clip.frames.length});
    }
  }
  async function start(player,opponent,behavior){
    await page.goto(base,{waitUntil:'networkidle'});
    await page.locator('[data-game-content-version="V38"]').waitFor();
    await page.getByRole('button',{name:'Jouer',exact:true}).click();
    await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
    await page.getByRole('radio',{name:/Entraînement/}).click();
    await page.getByRole('combobox',{name:'Combattant joueur',exact:true}).selectOption(player);
    await page.getByRole('combobox',{name:'Adversaire',exact:true}).selectOption(opponent);
    await page.getByRole('button',{name:/^ENTRER DANS L’ARÈNE/}).click();
    await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor({timeout:30000});
    await page.getByRole('button',{name:'Laboratoire',exact:true}).click();
    await page.getByRole('combobox',{name:'Comportement du mannequin',exact:true}).selectOption(behavior);
    await page.locator('canvas[data-pit-arena-id]').click();
    await page.evaluate(()=>{window.__v38AnimationDraws=[];});
  }
  // Opponent occupies the right side and really holds the independently drawn left guard.
  await start('wolf','city-hunter','guard-high');
  await page.waitForFunction(()=>new Set(window.__v38AnimationDraws.filter(d=>d.atlas==='city-hunter-high-guard-left-v38').map(d=>d.rect.join())).size===2,{}, {timeout:15000});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/city-left-guard-live.png'});
  combatChecks.push({fighter:'city-hunter',side:'left',action:'high-guard',drawings:2,actualTraining:true});
  await start('berserker','jungle-hunter','cpu');
  await page.waitForFunction(()=>window.__v38AnimationDraws.some(d=>d.atlas==='berserker-hitstun-v38'&&d.facing==='right'),{}, {timeout:20000});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/berserker-hit-right-live.png'});
  combatChecks.push({fighter:'berserker',side:'right',action:'hitstun',actualCpuHit:true});
  await start('jungle-hunter','berserker','idle');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1800);await page.keyboard.up('ArrowRight');
  for(let i=0;i<5;i++){await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');await page.keyboard.down('KeyJ');await page.waitForTimeout(100);await page.keyboard.up('KeyJ');await page.waitForTimeout(450);}
  await page.waitForFunction(()=>window.__v38AnimationDraws.some(d=>d.atlas==='berserker-hitstun-v38'&&d.facing==='left'),{}, {timeout:10000});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/berserker-hit-left-live.png'});
  const draws=await page.evaluate(()=>window.__v38AnimationDraws);
  assert(draws.every(draw=>draw.destination[2]>0&&draw.destination[3]>0));
  combatChecks.push({fighter:'berserker',side:'left',action:'hitstun',actualPlayerHit:true});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const report={passed:true,checkedAt:new Date().toISOString(),version:'V38',url:base,labChecks,combatChecks,mobileNoOverflow:true,errors,failures,limitations:['Software browser only; no physical controller test.','No complete moveset or extra animation inferred from these clips.']};
  await fs.writeFile(output+'/browser-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),errors,failures,body:(await page.locator('body').innerText()).slice(-7000)},null,2));}throw error;}finally{await browser.close();}
