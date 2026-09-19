import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.V39_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V39_HUMANS_QA_OUTPUT||'work/v39/human-duelists-qa';
await fs.mkdir(output,{recursive:true});
const text=await fs.readFile('app/game/pitSpriteSheetRegistry.ts','utf8');
const registry=JSON.parse(text.slice(text.indexOf('= [')+2).trim().replace(/;$/,''));
const targets=registry.filter(e=>['theta-duel-v39','machiko-noguchi-clan-combat-v39','jungle-hunter-walk-backward-left-v39'].includes(e.atlas.id));
assert.equal(targets.length,3);
const mappings=targets.flatMap(entry=>entry.atlas.clips.flatMap(clip=>clip.frames.map((frame,index)=>({fighter:entry.fighterId,atlas:entry.atlas.id,clip:clip.id,facing:clip.facing,index,rect:frame.rect,src:entry.atlas.pages.find(p=>p.id===frame.pageId).src}))));
const errors=[],failures=[],labChecks=[],combatChecks=[];
const browser=await chromium.launch({channel:'chrome',headless:true});let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.addInitScript(mappings=>{
  const original=CanvasRenderingContext2D.prototype.drawImage;window.__v39Draws=[];
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
   if(args[0] instanceof HTMLImageElement)this.canvas.__v39Source=args[0].src;
   if(this.canvas.width===960&&this.canvas.height===540&&args.length===9){
    const source=args[0]?.__v39Source;
    const matches=mappings.filter(m=>source?.endsWith(m.src)&&m.rect.every((n,i)=>n===args[i+1]));
    for(const match of matches){const t=this.getTransform();window.__v39Draws.push({...match,destination:args.slice(5),x:t.e,y:t.f});}
    if(window.__v39Draws.length>4000)window.__v39Draws.splice(0,1000);
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
   await page.getByLabel('Clip / phase',{exact:true}).selectOption(clip.id);
   await page.getByLabel('Orientation',{exact:true}).selectOption(clip.facing);
   await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');
   await page.getByRole('button',{name:'Début',exact:true}).click();
   assert.equal(await lab.getAttribute('data-clip'),clip.id);
   for(let i=0;i<clip.frames.length;i++){
    if(i)await page.getByRole('button',{name:'+1 dessin',exact:true}).click();
    await page.waitForFunction(index=>Number(document.querySelector('[data-pit-production-lab]')?.dataset.frameIndex)===index,i);
    await page.locator('canvas').screenshot({path:`${output}/${entry.fighterId}-${clip.id}-${clip.facing}-${i}.png`});
   }
   labChecks.push({fighter:entry.fighterId,clip:clip.id,facing:clip.facing,drawings:clip.frames.length});
  }
 }
 async function start(player,opponent,{local=false,behavior='idle'}={}){
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('[data-game-content-version="V39"]').waitFor();
  await page.getByRole('button',{name:'Jouer',exact:true}).click();await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
  await page.getByRole('radio',{name:local?/Versus local/i:/Entraînement/}).click();
  await page.getByRole('combobox',{name:'Combattant joueur',exact:true}).selectOption(player);
  await page.getByRole('combobox',{name:'Adversaire',exact:true}).selectOption(opponent);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-pit-extension-portrait]')].every(c=>c.dataset.pitExtensionPortrait==='authored-idle-pose'));
  if(player==='theta'&&opponent==='machiko-noguchi'){
   assert.equal(await page.getByText('Image à produire',{exact:true}).count(),0);
   await page.getByLabel('Profil de Theta · côté gauche',{exact:true}).screenshot({path:output+'/selection-theta-right.png'});
   await page.getByLabel('Profil de Machiko Noguchi · côté droite',{exact:true}).screenshot({path:output+'/selection-machiko-left.png'});
  }
  await page.getByRole('button',{name:/^ENTRER DANS L’ARÈNE/}).click();
  await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor();
  if(!local){await page.getByRole('button',{name:'Laboratoire',exact:true}).click();await page.getByRole('combobox',{name:'Comportement du mannequin',exact:true}).selectOption(behavior);}
  await page.locator('canvas[data-pit-arena-id]').click();
  await page.waitForFunction(ids=>ids.every(id=>!['theta','machiko-noguchi'].includes(id)||window.__v39Draws.some(d=>d.fighter===id)),[player,opponent]);
  await page.evaluate(()=>{window.__v39Draws=[];});
 }
 async function hold(code,ms){await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);}
 for(const [player,opponent] of [['theta','machiko-noguchi'],['machiko-noguchi','theta']]){
  await start(player,opponent);await hold('ArrowRight',1700);
  for(const [code,attack] of [['KeyJ','light'],['KeyK','medium'],['KeyL','heavy']]){
   await hold('ArrowRight',180);await hold(code,100);await page.waitForTimeout(550);
   await page.waitForFunction(({id,attack})=>window.__v39Draws.some(d=>d.fighter===id&&d.clip==='pit.stand.'+attack+'.active'),{id:player,attack});
  }
  await hold('ArrowDown',400);
  const draws=await page.evaluate(()=>window.__v39Draws);
  assert(draws.some(d=>d.fighter===opponent&&d.clip==='pit.stand.hitstun'&&d.facing==='left'));
  assert(draws.some(d=>d.fighter===player&&d.clip==='crouch'&&d.facing==='right'));
  assert(draws.every(d=>d.destination[2]>0&&d.destination[3]>0));
  combatChecks.push({player,opponent,attacks:['light','medium','heavy'],opponentReaction:true,crouch:true});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/'+player+'-live.png'});
 }
 await start('theta','jungle-hunter',{local:true});
 await hold('Numpad6',700);
 const retreat=await page.evaluate(()=>window.__v39Draws.filter(d=>d.atlas==='jungle-hunter-walk-backward-left-v39'));
 assert.equal(new Set(retreat.map(d=>d.index)).size,4);
 assert(retreat.at(-1).x>retreat[0].x,'Left-facing fighter must retreat to the right');
 combatChecks.push({fighter:'jungle-hunter',action:'walk-backward',facing:'left',distinctDrawings:4,movedRight:true});
 await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/jungle-retreat-live.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passed:true,version:'V39',checkedAt:new Date().toISOString(),url:base,labChecks,combatChecks,mobileNoOverflow:true,errors,failures,limitations:['Keyboard and browser only; no hardware controller or complete moveset certification.','Jungle retreat reuses four drawings in reversed playback, not new generated images.']};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,clips:labChecks.length,drawings:labChecks.reduce((n,c)=>n+c.drawings,0),combatChecks}));
}catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),errors,failures,body:(await page.locator('body').innerText()).slice(-8000)},null,2));}throw error;}finally{await browser.close();}
