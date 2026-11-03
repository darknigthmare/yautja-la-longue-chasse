import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.V40_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V40_ART_QA_OUTPUT||'work/v40/art-qa';
await fs.mkdir(output,{recursive:true});
const text=await fs.readFile('app/game/pitSpriteSheetRegistry.ts','utf8');
const registry=JSON.parse(text.slice(text.indexOf('= [')+2).trim().replace(/;$/,''));
const targets=registry.filter(e=>e.atlas.id.endsWith('-v40'));
assert.equal(targets.length,2);
const mappings=targets.flatMap(entry=>entry.atlas.clips.flatMap(clip=>clip.frames.map((frame,index)=>({fighter:entry.fighterId,atlas:entry.atlas.id,clip:clip.id,facing:clip.facing,index,pivot:frame.pivot,bodyHeight:entry.pageBodyHeightPx?.[frame.pageId]??entry.bodyHeightPx,rect:frame.rect,src:entry.atlas.pages.find(p=>p.id===frame.pageId).src}))));
const errors=[],failures=[],labChecks=[],combatChecks=[];
const browser=await chromium.launch({channel:'chrome',headless:true});let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.addInitScript(mappings=>{
  const original=CanvasRenderingContext2D.prototype.drawImage;window.__v40Draws=[];
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
   if(args[0] instanceof HTMLImageElement)this.canvas.__v40Source=args[0].src;
   if(this.canvas.width===960&&this.canvas.height===540&&args.length===9){
    const source=args[0]?.__v40Source;
    for(const m of mappings.filter(m=>source?.endsWith(m.src)&&m.rect.every((n,i)=>n===args[i+1]))){
     const scale=args[7]/m.rect[2];
     window.__v40Draws.push({...m,destination:args.slice(5),x:args[5]+m.pivot[0]*scale,ground:args[6]+m.pivot[1]*scale,scale});
    }
    if(window.__v40Draws.length>6000)window.__v40Draws.splice(0,2000);
   }
   return original.apply(this,args);
  };
 },mappings);
 await page.goto(base+'/pit-lab',{waitUntil:'networkidle'});
 for(const entry of targets){
  await page.getByLabel('Combattant',{exact:true}).selectOption(entry.fighterId);
  await page.getByLabel('Atlas validé',{exact:true}).selectOption(entry.atlas.id);
  for(const clip of entry.atlas.clips){
   await page.getByLabel('Clip / phase',{exact:true}).selectOption(clip.id);
   await page.getByLabel('Orientation',{exact:true}).selectOption(clip.facing);
   await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');
   await page.getByRole('button',{name:'Début',exact:true}).click();
   for(let i=0;i<clip.frames.length;i++){
    if(i)await page.getByRole('button',{name:'+1 dessin',exact:true}).click();
    await page.waitForFunction(index=>Number(document.querySelector('[data-pit-production-lab]')?.dataset.frameIndex)===index,i);
    await page.locator('canvas').screenshot({path:`${output}/${entry.fighterId}-${clip.id}-${clip.facing}-${i}.png`});
   }
   labChecks.push({fighter:entry.fighterId,clip:clip.id,facing:clip.facing,drawings:clip.frames.length});
  }
 }
 async function start(player,opponent){
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('[data-game-content-version="V40"]').waitFor();
  await page.getByRole('button',{name:'Jouer',exact:true}).click();await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
  await page.getByRole('radio',{name:/Versus local/i}).click();
  await page.getByRole('combobox',{name:'Combattant joueur',exact:true}).selectOption(player);
  await page.getByRole('combobox',{name:'Adversaire',exact:true}).selectOption(opponent);
  await page.getByRole('button',{name:/^ENTRER DANS L’ARÈNE/}).click();
  await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-pit-bitmap-status]')].every(e=>e.dataset.pitBitmapStatus!=='loading'));
  await page.locator('canvas[data-pit-arena-id]').click();
 }
 async function hold(code,ms){await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);}
 for(const [facing,player,opponent,key] of [['right','machiko-noguchi','theta','KeyI'],['left','theta','machiko-noguchi','Numpad9']]){
  await start(player,opponent);
  await page.evaluate(()=>window.__v40Draws=[]);
  await page.keyboard.down(key);await page.waitForTimeout(2350);
  const samples=await page.evaluate(f=>window.__v40Draws.filter(d=>d.fighter==='machiko-noguchi'&&d.facing===f),facing);
  assert.equal(new Set(samples.map(d=>d.index)).size,2,facing+' guard drawings');
  assert(samples.every(d=>d.scale>0&&d.destination[2]>0&&d.destination[3]>0));
  assert(Math.max(...samples.map(d=>d.ground))-Math.min(...samples.map(d=>d.ground))<0.01);
  combatChecks.push({fighter:'machiko-noguchi',clip:'high-guard',facing,drawings:2,nativeOrientation:true,stableGround:true});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/machiko-guard-'+facing+'.png'});
  await page.keyboard.up(key);
 }
 for(const [facing,player,opponent,retreat,advance] of [['right','scar','theta','ArrowLeft','ArrowRight'],['left','theta','scar','Numpad6','Numpad4']]){
  await start(player,opponent);
  await hold(retreat,650);await page.waitForTimeout(150);await page.evaluate(()=>window.__v40Draws=[]);
  await page.keyboard.down(advance);await page.waitForTimeout(700);
  const samples=await page.evaluate(f=>window.__v40Draws.filter(d=>d.fighter==='scar'&&d.facing===f),facing);
  assert.equal(new Set(samples.map(d=>d.index)).size,4,facing+' walk drawings');
  const direction=facing==='right'?1:-1;
  assert((samples.at(-1).x-samples[0].x)*direction>20,'real advance '+facing);
  assert(samples.every(d=>d.scale>0&&d.destination[2]>0));
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/scar-advance-'+facing+'.png'});
  await page.keyboard.up(advance);await page.waitForTimeout(150);
  await page.evaluate(()=>window.__v40Draws=[]);await page.waitForTimeout(160);
  assert.equal(await page.evaluate(f=>window.__v40Draws.filter(d=>d.fighter==='scar'&&d.facing===f).length,facing),0,'stopped actor returns to idle');
  await hold(retreat,600);
  const backwards=await page.evaluate(f=>window.__v40Draws.filter(d=>d.fighter==='scar'&&d.facing===f),facing);
  assert(backwards.length>1&&(backwards.at(-1).x-backwards[0].x)*direction<-20,'existing retreat stays functional');
  combatChecks.push({fighter:'scar',clip:'walk',facing,drawings:4,realForwardMovement:true,advanceStopRetreat:true,sourceReuse:true});
 }
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passed:true,version:'V40',checkedAt:new Date().toISOString(),url:base,labChecks,combatChecks,mobileNoOverflow:true,errors,failures,limitations:['Browser input only, no complete moveset or physical hardware certification.','Scar reuses eight existing retreat drawings in reverse order; no new Scar image is claimed.','Machiko guards are held defensive poses, not blockstun or low guard.']};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,labChecks,combatChecks}));
}catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),errors,failures,body:(await page.locator('body').innerText()).slice(-6000)},null,2));}throw error;}finally{await browser.close();}
