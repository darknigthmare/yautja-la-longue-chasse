import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Run against an already running Next app or a deployed URL; no local fixture server.
const target=new URL(process.env.PIT_LAB_QA_URL??'http://127.0.0.1:4173/pit-lab');
if(target.pathname==='/')target.pathname='/pit-lab';
const url=target.href,out=path.resolve(process.env.PIT_LAB_QA_OUTPUT??'work/v35/pit-lab-qa');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PIT_LAB_QA_BROWSER??'chrome',headless:true});
const errors=[],failures=[],checks=[];let page,expectedImageFault=false;
try {
 page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>{if(expectedImageFault&&new URL(request.url()).pathname.startsWith('/game/sprites/v34/pit/greyback/'))return;failures.push({url:request.url(),error:request.failure()?.errorText});});
 const waitReady=()=>page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');
 await page.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(await page.getByLabel('Combattant',{exact:true}).locator('option').count(),14);const root=page.locator('[data-pit-production-lab]');
 for(const id of ['tracker','greyback','jungle-hunter']){
  await page.getByLabel('Combattant',{exact:true}).selectOption(id);await page.getByLabel('Orientation',{exact:true}).selectOption('right');await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');assert.equal(await root.getAttribute('data-frame-index'),'0');
  for(const clip of ['idle','crouch','pit.stand.hitstun','pit.stand.light.recovery']){
   await page.getByLabel('Clip / phase',{exact:true}).selectOption(clip);await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');let frames=0;while(frames<32&&await page.getByRole('button',{name:'+1 dessin',exact:true}).isEnabled()){await page.getByRole('button',{name:'+1 dessin',exact:true}).click();frames++;assert.equal(await root.getAttribute('data-frame-index'),String(frames));}checks.push({kind:'exact-frame-selection',id,clip,frames:frames+1});
  }
  await page.getByLabel('Orientation',{exact:true}).selectOption('left');await page.getByLabel('Clip / phase',{exact:true}).selectOption('crouch');await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');await page.getByRole('button',{name:'+1 dessin',exact:true}).click();await page.getByRole('button',{name:'+1 dessin',exact:true}).click();assert.equal(await root.getAttribute('data-frame-index'),'2');await page.locator('canvas').screenshot({path:path.join(out,id+'-left-crouch.png')});
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter l’atlas JSON',exact:true}).click();const download=await event;await download.saveAs(path.join(out,id+'-atlas.json'));const data=JSON.parse(await fs.readFile(path.join(out,id+'-atlas.json'),'utf8'));assert.equal(data.definition.fighterId,id);assert.equal(data.coverage.clips,id==='jungle-hunter'?13:28);checks.push({kind:'json-export',id,clips:data.coverage.clips});
 }
 await page.getByLabel('Clip / phase',{exact:true}).selectOption('walk');await page.getByLabel('Orientation',{exact:true}).selectOption('right');assert.equal(await root.getAttribute('data-render-status'),'missing-clip');assert(await page.getByRole('button',{name:'Lecture',exact:true}).isDisabled());checks.push({kind:'missing-facing',id:'jungle-hunter',clip:'walk',facing:'right',noMirror:true});
 await page.getByLabel('Orientation',{exact:true}).selectOption('left');await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='ready');await page.getByRole('button',{name:'Lecture',exact:true}).click();await page.waitForTimeout(350);await page.getByRole('button',{name:'Pause',exact:true}).click();const stopped=await root.getAttribute('data-frame-index');await page.waitForTimeout(400);assert.equal(await root.getAttribute('data-frame-index'),stopped);checks.push({kind:'play-pause',stopped});
 await page.getByLabel('Combattant',{exact:true}).selectOption('falconer');assert.equal(await root.getAttribute('data-render-status'),'missing-atlas');assert(await page.getByRole('button',{name:'Lecture',exact:true}).isDisabled());checks.push({kind:'missing-atlas',id:'falconer'});

 await page.getByLabel('Combattant',{exact:true}).selectOption('tracker');await page.getByLabel('Orientation',{exact:true}).selectOption('right');await page.getByLabel('Clip / phase',{exact:true}).selectOption('pit.stand.light.recovery');await waitReady();assert.equal(await root.getAttribute('data-frame-duration-ticks'),'6');await page.getByRole('button',{name:'+1 dessin',exact:true}).click();assert.equal(await root.getAttribute('data-frame-duration-ticks'),'5');checks.push({kind:'engine-phase-tempo',id:'tracker',phase:'light.recovery',frameTicks:[6,5],totalTicks:11});
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Combattant',{exact:true}).selectOption('jungle-hunter');await page.getByLabel('Clip / phase',{exact:true}).selectOption('crouch');await page.getByLabel('Orientation',{exact:true}).selectOption('left');await waitReady();await page.getByRole('button',{name:'+1 dessin',exact:true}).click();await page.getByRole('button',{name:'+1 dessin',exact:true}).click();assert.equal(await root.getAttribute('data-frame-index'),'2');
 const overflow=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,rootWidth:document.querySelector('[data-pit-production-lab]').scrollWidth,offenders:[...document.querySelectorAll('[data-pit-production-lab] *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,id:n.id,right:n.getBoundingClientRect().right})).slice(0,15)}));assert(overflow.documentWidth<=390&&overflow.bodyWidth<=390,JSON.stringify(overflow));await page.screenshot({path:path.join(out,'mobile-390x844.png'),fullPage:true});checks.push({kind:'mobile-no-overflow',width:390,height:844,...overflow});
 await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:path.join(out,'desktop-lab.png'),fullPage:true});assert.equal(await page.getByRole('link',{name:'Atelier OpenAI V34 · décors, chasseurs et véhicules',exact:true}).count(),1);
 expectedImageFault=true;
 await page.route('**/game/sprites/v34/pit/greyback/**',route=>route.abort());await page.getByLabel('Combattant',{exact:true}).selectOption('greyback');await page.waitForFunction(()=>document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus==='unavailable');assert(await page.getByRole('button',{name:'Lecture',exact:true}).isDisabled());checks.push({kind:'image-error',noFakeCoverage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const result={passed:true,checkedAt:new Date().toISOString(),url,checks,errors,failedRequests:failures};
 await fs.writeFile(path.join(out,'browser-qa.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} catch(error) {
 if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
 await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({passed:false,url,error:String(error),checks,errors,failures},null,2)+'\n');
 throw error;
} finally {await browser.close();}
