import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V66_QA_URL??'http://127.0.0.1:4184';
const output=process.env.V66_RESERVE_TOUR_OUTPUT??'work-local/v66/qa/game-reserve-tour';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:950}});
const checks=[],captures=[],errors=[],route=[];
const canvas=()=>page.locator('[data-game-reserve-v66] canvas');
const state=()=>canvas().evaluate(e=>({...e.dataset}));
const tick=ms=>page.clock.runFor(ms);
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:88});captures.push(file);};
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.clock.install();await enterCampaignDeck(page,{url});
 await page.getByRole('button',{name:'Dossier de campagne',exact:true}).click();await page.getByRole('button',{name:'Mondes et réserves',exact:true}).click();
 await page.locator('[data-game-reserve-start]').click();await page.waitForFunction(()=>document.querySelector('[data-game-reserve-v66] canvas')?.getAttribute('data-reserve-assets')==='true');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+200)));
 await page.getByRole('button',{name:'Commencer l’expédition',exact:true}).click({force:true});await tick(100);await canvas().focus();await tick(48);
 await page.keyboard.down('KeyC');await tick(48);await page.keyboard.up('KeyC');await tick(48);await page.keyboard.down('ArrowRight');
 const platforms=new Set([438,365,292,338,355,280,344,362,285,351]), captured=new Set();
 for(let n=0;n<170;n++){
   let data=await state();assert.equal(data.reserveStatus,'active','Hunter survives the physically played traversal');
   if(Number(data.reserveX)>4480)break;
   if(platforms.has(Number(data.reserveY))){await page.keyboard.down('Space');await tick(32);await page.keyboard.up('Space');}
   await tick(180);data=await state();route.push({tick:Number(data.reserveTick),x:Number(data.reserveX),y:Number(data.reserveY),health:Number(data.reserveHealth),sector:data.reserveSector});
   if(!captured.has(data.reserveSector)&&Number(data.reserveX)%1600>500){await capture(data.reserveSector);captured.add(data.reserveSector);}
 }
 await page.keyboard.up('ArrowRight');await tick(64);
 const arrival=await state();assert(Number(arrival.reserveX)>4480);assert.deepEqual([...new Set(route.map(p=>p.sector))],['parachutes','drill','camp']);
 const fixture=await campaignFixture();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);assert.deepEqual(saved.gameReserveV66.visited,[0,1,2]);
 checks.push('All three connected sectors reached through real keyboard movement/jumps/cloak; no teleport, state injection or invulnerability.');
 await page.setViewportSize({width:844,height:390});await tick(100);
 await page.getByRole('button',{name:'Tactile',exact:true}).click({force:true});await tick(96);
 const layout=await page.evaluate(()=>{
   const canvas=document.querySelector('[data-game-reserve-v66] canvas'),box=canvas.getBoundingClientRect();
   return {width:innerWidth,height:innerHeight,canvas:{x:box.x,y:box.y,width:box.width,height:box.height,logicalWidth:canvas.width,logicalHeight:canvas.height},buttons:[...document.querySelectorAll('[data-reserve-action]')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};})};
 });
 assert(layout.canvas.width>=layout.width*.95,'Landscape world uses at least 95% of the screen width');
 assert(layout.canvas.height>=layout.height*.6,'Landscape scene retains at least 60% of the screen height');
 assert(Math.abs(layout.canvas.logicalWidth/layout.canvas.logicalHeight-layout.canvas.width/layout.canvas.height)<.003,'Native actor proportions are preserved without stretching');
 assert(layout.buttons.every(b=>b.width>=44&&b.height>=44&&b.left>=0&&b.right<=layout.width&&b.top>=0&&b.bottom<=layout.height),'All touch controls have 44px targets and remain fully inside the viewport');
 const button=page.locator('[data-reserve-action="left"]'), bounds=await button.boundingBox();assert(bounds);
 const before=Number((await state()).reserveX);await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await tick(700);await page.mouse.up();await tick(96);
 assert(Number((await state()).reserveX)<before-60,'Real pointer hold moves the hunter through the touch-control path');
 await capture('landscape-touch');await page.getByRole('button',{name:'Pause',exact:true}).click({force:true});await tick(96);
 const pausedTick=Number((await state()).reserveTick);
 await page.getByRole('button',{name:'Reprendre la chasse',exact:true}).focus();await page.keyboard.press('Escape');await tick(180);
 assert.equal((await state()).reservePaused,'false');assert(Number((await state()).reserveTick)>pausedTick,'Escape resumes from a focused pause button');
 await page.getByRole('button',{name:'Pause',exact:true}).click({force:true});await tick(96);
 checks.push('Landscape fills at least 95% width and 60% height without stretching; every touch control remains at least44px; actual pointer hold moves the hunter; Escape resumes from a focused button.');
 assert.deepEqual(errors,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,route,layout,errors,visualReview:'pending',scope:'One isolated adult expedition traversed through keyboard and pointer inputs, no mocked runtime movement. No full hunt completion or character animation completeness claimed.'},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,route,errors},null,2)+'\n');throw error;}
finally{await browser.close();}
