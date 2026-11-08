/** Real Chromium touch input and declared gamepad API simulation; no hardware claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const root=process.cwd(),out=path.join(root,'outputs/qa-mobility-native');
const report={scope:'Real component and writer with Chromium CDP touchscreen input; gamepad snapshots are a declared browser API fixture, not physical hardware.',sourceCommit:process.env.MOBILITY_QA_COMMIT??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:[],errors:[],passed:false};
const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,passed:true});console.log('PASS',name);};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname),base=pathname.startsWith('/game/')?path.join(root,'public'):out;
 const file=path.resolve(base,pathname==='/'?'index.html':'.'+pathname);
 if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(4189,'127.0.0.1',resolve));
let browser,page;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:1200},hasTouch:true});page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
 await page.addInitScript(()=>{window.__mobilityPadFixture=[];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__mobilityPadFixture});});
 await page.goto('http://127.0.0.1:4189/',{waitUntil:'networkidle'});await page.bringToFront();
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 const state=()=>page.locator('[data-mobility-yard]').evaluate(e=>Object.fromEntries(['x','y','speed','heading','tick','paused'].map(k=>[k,e.getAttribute('data-'+k)])));
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')));
 await click('Prendre le Grav-Sled de formation');await click('Reprendre la conduite');
 const client=await context.newCDPSession(page);
 const point=async(name,id)=>{const b=page.getByRole('button',{name,exact:true});await b.scrollIntoViewIfNeeded();const r=await b.boundingBox();assert(r);return {id,x:r.x+r.width/2,y:r.y+r.height/2};};
 const forward=await point('Avancer',1),left=await point('Gauche',2),reverse=await point('Reculer',3);
 const touch=(type,touchPoints)=>client.send('Input.dispatchTouchEvent',{type,touchPoints});
 // Two independent contacts, both processed by React pointer handlers.
 await touch('touchStart',[forward,left]);await page.waitForTimeout(350);const turning=await state();
 check('two physical touch contacts accelerate and turn',Number(turning.speed)>5&&Number(turning.heading)<-.05);
 await touch('touchEnd',[forward]);await page.waitForTimeout(350);const released=await state();
 check('lifting steering finger preserves forward contact',Number(released.speed)>Number(turning.speed)&&Math.abs(Number(released.heading)-Number(turning.heading))<.2);
 await touch('touchEnd',[]);await click('Pause et enregistrer');
 const stable=(await stored()).mobilityV1.active.course.tick;await page.waitForTimeout(150);
 check('pause commits and freezes the real course',(await stored()).mobilityV1.active.course.tick===stable);
 await click('Retour de sécurité');await click('Confirmer la récupération');await click('Prendre le Grav-Sled de formation');await click('Reprendre la conduite');
 const f2=await point('Avancer',1),r2=await point('Reculer',3);
 await touch('touchStart',[f2,r2]);await page.waitForTimeout(200);
 check('opposed simultaneous touches stay neutral from rest',Math.abs(Number((await state()).speed))<.001);
 await touch('touchEnd',[f2]);await page.waitForTimeout(300);
 check('lifting reverse restores the still-held forward contact',Number((await state()).speed)>5);
 // Pause while a contact remains physically down. Its eventual release must be harmless.
 await click('Pause et enregistrer');await touch('touchEnd',[]);await click('Reprendre la conduite');await page.waitForTimeout(1100);
 check('pause clears held contacts instead of latching acceleration',Math.abs(Number((await state()).speed))<1);
 await click('Pause et enregistrer');await click('Retour de sécurité');await click('Confirmer la récupération');await click('Prendre le Grav-Sled de formation');
 const setPad=async(axes,pressed=[],connected=true)=>page.evaluate(({axes,pressed,connected})=>{window.__mobilityPadFixture=connected?[{index:0,id:'DECLARED-QA-PAD',mapping:'standard',connected:true,axes,buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i)}))}]:[];},{axes,pressed,connected});
 await setPad([0,-1]);await click('Reprendre la conduite');await page.waitForTimeout(250);
 check('new pad held forward cannot launch the vehicle',Number((await state()).speed)===0);
 check('neutral requirement is visible to the player',await page.getByText('Relâche le stick et les boutons de la manette avant de reprendre son contrôle.',{exact:true}).isVisible());
 await setPad([0,0]);await page.waitForTimeout(100);await setPad([0,-1]);await page.waitForTimeout(350);
 check('neutral then deliberate pad input moves the vehicle',Number((await state()).speed)>5);
 await setPad([0,0],[],false);await page.waitForFunction(()=>document.querySelector('[data-mobility-yard]')?.getAttribute('data-paused')==='true');
 const disconnect=await stored();await page.waitForTimeout(180);
 check('pad disconnect pauses and persists one frozen course',disconnect.mobilityV1.active.course.tick===(await stored()).mobilityV1.active.course.tick);
 await setPad([0,-1]);await click('Reprendre la conduite');await page.waitForTimeout(1100);
 check('reconnected held pad cannot reapply throttle without neutral',Math.abs(Number((await state()).speed))<1);
 await click('Pause et enregistrer');await page.screenshot({path:path.join(out,'controls-touch-pad.png'),fullPage:true});
 check('no browser exception in input scenarios',report.errors.length===0);report.passed=true;report.browserVersion=browser.version();
}catch(error){report.failure=String(error);console.error(error);if(page)await page.screenshot({path:path.join(out,'controls-failure.png'),fullPage:true}).catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'controls-browser-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));process.exitCode=report.passed?0:1;
