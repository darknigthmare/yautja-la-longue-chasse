/** A single accepted initial city fixture, then only ordinary UI and real
 * keyboard movement. No actor mutation, quest completion or transit setter. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3000';
const componentFixture=process.env.YAUTJA_CARTOGRAPHY_COMPONENT_FIXTURE==='1';
const expectedBuildId=componentFixture?null:process.env.YAUTJA_QA_BUILD_ID??null,servedBuilds=[];
const contentVersion=(await fs.readFile('app/game/buildInfo.ts','utf8')).match(/GAME_CONTENT_VERSION\s*=\s*["']([^"']+)/)?.[1];
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname));
const output=path.resolve(process.env.YAUTJA_CARTOGRAPHY_QA_OUTPUT??'outputs/qa-v105/homeworld-cartography');
await fs.mkdir(output,{recursive:true});
const sources=['app/game/HomeworldHub.tsx','app/game/HomeworldWorldSceneV77.tsx','app/game/HomeworldCartographerV104.tsx','app/game/HomeworldCartographyV104.tsx','app/game/HomeworldCartographyV105.tsx','app/game/HomeworldCartographyV104.module.css','app/game/systems/homeworldCartographyDefinitionV104.ts','app/game/systems/homeworldCartographyDefinitionV105.ts','app/game/systems/homeworldCartographyLedgerV104.ts','app/game/systems/homeworldCartographyLedgerV105.ts','app/game/systems/homeworldCartographyV104.ts','app/game/systems/homeworldCartographyV105.ts','app/game/data/bibleCartographySceneV104.json','app/game/systems/homeworld.ts','app/game/save.ts','app/game/buildInfo.ts'];
const sha=b=>createHash('sha256').update(b).digest('hex'),snapshot=()=>Promise.all(sources.map(async file=>({file,sha256:sha(await fs.readFile(file))})));
const sourceBefore=await snapshot(),qa=homeworldSceneSsrV78();
// Mount the same V84/V92 solid registries as HomeworldHub before planning.
qa.load('app/game/systems/homeworldCartographyV105.ts');
const nav=qa.load('app/game/systems/homeworldNavigationV77.ts'),defs=qa.load('app/game/systems/homeworldCartographyDefinitionV105.ts'),b=defs.HOMEWORLD_CARTOGRAPHY_V105;
const bundle=await build({stdin:{contents:`import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as city from './app/game/systems/homeworldCity';import * as location from './app/game/systems/homeworldLocationV77';window.__cartographyQa={...saves,...slots,...city,...location};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const chromeExecutable=process.env.AUDIT_CHROME_EXECUTABLE??process.env.CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch({...chromeExecutable?{executablePath:chromeExecutable}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{executablePath:'/usr/bin/chromium'},headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),page=await context.newPage();
if(componentFixture){
 const compiled=await build({entryPoints:['tests/browser/homeworld-cartography-focus-v105.fixture.tsx'],bundle:true,write:false,outdir:'outputs/qa-v105/focus-fixture-build',format:'iife',platform:'browser',target:'es2022',jsx:'automatic',logLevel:'silent',plugins:[{name:'public-game-assets',setup(b){b.onResolve({filter:/^\/game\//},args=>({path:args.path,external:true}));}}]});
 const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).text,css=compiled.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
 await context.route('**/__homeworld-focus-v105',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><meta charset="utf-8"><style>body{margin:0;background:#070d0d;color:#eee;font-family:system-ui}button{min-height:44px}</style><link rel="stylesheet" href="/__homeworld-focus-v105.css"><body><div id="root"></div><script src="/__homeworld-focus-v105.js"></script></body></html>'}));
 await context.route('**/__homeworld-focus-v105.js',route=>route.fulfill({contentType:'text/javascript',body:js}));
 await context.route('**/__homeworld-focus-v105.css',route=>route.fulfill({contentType:'text/css',body:css}));
 // Exact existing public bytes, served directly only for this isolated host.
 // This neither replaces art nor bypasses native dimension/decode checks.
 await context.route('**/game/**',async route=>{const url=new URL(route.request().url()),file=path.resolve('public'+decodeURIComponent(url.pathname));if(!file.startsWith(path.resolve('public/game')+path.sep))return route.abort();try{await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':file.endsWith('.json')?'application/json':'application/octet-stream'});}catch{await route.continue();}});
}
page.setDefaultTimeout(30000);await page.clock.install();
const checks=[],captures=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
let failure=null,fixture=null,clockPaused=false,legacyBytes=null;
const check=(name,ok,detail)=>{checks.push({name,status:ok?'PASS':'FAIL',...(detail?{detail}:{})});console.log(ok?'PASS':'FAIL',name);assert(ok,name);};
const actor=()=>page.locator('[data-homeworld-actor]').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y),level:e.dataset.homeworldLevelV77}));
const disk=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')??'null'));
async function paint(){const p=page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(clockPaused)await page.clock.runFor(60);await p;}
async function capture(file,locator=page){await paint();await locator.screenshot({path:path.join(output,file)});captures.push({file,sha256:sha(await fs.readFile(path.join(output,file)))});}
async function menu(){const response=await page.goto(componentFixture?baseUrl+'/__homeworld-focus-v105':baseUrl,{waitUntil:'domcontentloaded',timeout:120000});if(expectedBuildId){assert(response,'A real HTML response must serve the campaign menu');const html=await response.text(),foundInHtml=html.includes(expectedBuildId);servedBuilds.push({url:response.url(),status:response.status(),expectedBuildId,foundInHtml});assert(foundInHtml,'Campaign menu must come from the expected frozen production build');}await page.locator('[data-campaign-menu="main"]').waitFor();assert.equal(await page.locator('[data-campaign-menu="main"]').getAttribute('data-game-content-version'),contentVersion,'Served content version matches frozen sources');}
async function enter(){if(clockPaused){await page.clock.resume();clockPaused=false;}await menu();await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));clockPaused=true;await page.bringToFront();await page.locator('[data-homeworld-viewport]').focus();await page.clock.runFor(80);}
async function go(target,tolerance=6){
 await page.locator('[data-homeworld-viewport]').focus();let keys=[],previous=null,stalled=0;
 try{for(let i=0;i<1500;i++){
  const p=await actor(),dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<=tolerance)return;
  stalled=previous&&Math.hypot(p.x-previous.x,p.y-previous.y)<.05?stalled+1:0;previous=p;if(stalled>25)break;
  const wanted=[...(Math.abs(dx)>tolerance*.65?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>tolerance*.65?[dy>0?'ArrowDown':'ArrowUp']:[])];
  for(const key of keys)if(!wanted.includes(key))await page.keyboard.up(key);
  for(const key of wanted)if(!keys.includes(key))await page.keyboard.down(key);keys=wanted;
  await page.clock.runFor(wanted.length===1&&Math.max(Math.abs(dx),Math.abs(dy))>60?80:20);
 }}finally{for(const key of keys)await page.keyboard.up(key);await page.clock.runFor(80);}
 throw Error('Native walk stalled near '+JSON.stringify({target,actor:await actor(),status:(await disk())?.homeworld?.cartographyV105?.receipt}));
}
async function routeTo(level,target){
 const start=await actor();assert.equal(start.level,level);const route=nav.homeworldWalkRouteV77(level,start,target);assert.equal(route.status,'reachable');
 // Collapse only collinear axis-aligned grid nodes. Diagonal nodes stay at
 // native grid spacing because keyboard X/Y speeds differ. No new shortcut.
 const points=route.points.filter((p,i,all)=>{if(i===0||i===all.length-1)return true;const a=all[i-1],c=all[i+1];return !(a.x===p.x&&p.x===c.x&&Math.sign(p.y-a.y)===Math.sign(c.y-p.y)||a.y===p.y&&p.y===c.y&&Math.sign(p.x-a.x)===Math.sign(c.x-p.x));});
 console.log('WALK',level,Math.round(route.distance),'units',points.length,'real route bends');
 for(const p of points.slice(1))await go(p);
}
async function resumeIfNeeded(){const resume=page.getByRole('button',{name:'Reprendre au dernier point confirmé',exact:true});if(await resume.count()){const before=(await disk()).homeworld.cartographyV105.receipt;await resume.click();check('Resume hands focus to the viewport before the next city frame',await page.locator('[data-homeworld-viewport]').evaluate(e=>e===document.activeElement));await page.clock.runFor(20);const after=(await disk()).homeworld.cartographyV105.receipt;check('The first resumed city frame keeps the active phase without a new interruption',after.phase===before.resumePhase&&after.interruptedCount===before.interruptedCount);await page.clock.runFor(60);}}
async function crossStairs(level){
 await page.locator('[data-homeworld-viewport]').focus();await page.keyboard.press('KeyE');await page.clock.runFor(80);
 const before=await actor();await page.clock.runFor(7800);check('Council stair has no premature floor completion from '+level,(await actor()).level===level);
 await page.clock.runFor(400);const after=await actor();check('Council stair physically reaches the other landing from '+level,after.level!==level&&Math.hypot(after.x-before.x,after.y-before.y)>100);
}
async function refuseWrites(){await page.evaluate(()=>{window.__cartoSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='yautja-long-hunt.save')throw new DOMException('QA quota','QuotaExceededError');return window.__cartoSetItem.call(this,k,v);};});}
async function restoreWrites(){await page.evaluate(()=>{Storage.prototype.setItem=window.__cartoSetItem;delete window.__cartoSetItem;});}
async function failedAction(scene,button,close,label){
 const bytes=JSON.stringify((await disk()).homeworld.cartographyV105??null);await refuseWrites();await scene.getByRole('button',{name:button,exact:true}).click();await page.clock.runFor(80);
 check('Refused '+label+' keeps durable observation and revision unchanged',JSON.stringify((await disk()).homeworld.cartographyV105??null)===bytes);
 await scene.getByRole('button',{name:close,exact:true}).click();await page.clock.runFor(80);
 const retry=page.getByRole('button',{name:'Réessayer l’enregistrement du point haut',exact:true});check('Refused '+label+' exposes its own retry after closing',await retry.count()===1);
 const stopped=await actor();await page.locator('[data-homeworld-viewport]').focus();await page.keyboard.down('ArrowRight');await page.clock.runFor(180);await page.keyboard.up('ArrowRight');await page.clock.runFor(80);
 check('Refused '+label+' stops physical movement',JSON.stringify(await actor())===JSON.stringify(stopped));
 await retry.click();await page.clock.runFor(80);check('Repeated refused '+label+' remains recoverable',await retry.count()===1&&JSON.stringify((await disk()).homeworld.cartographyV105??null)===bytes);
 await capture('write-paused-'+label+'.png');await restoreWrites();const beforeRetry=(await disk()).homeworld.cartographyV105?.receipt;await retry.click();check('Successful '+label+' retry hands focus back before its control disappears',await page.locator('[data-homeworld-viewport]').evaluate(e=>e===document.activeElement));await page.clock.runFor(20);const afterRetry=(await disk()).homeworld.cartographyV105?.receipt;check('The first frame after '+label+' retry retains phase and interruption count',(afterRetry?.phase??null)===(beforeRetry?.phase??null)&&(afterRetry?.interruptedCount??0)===(beforeRetry?.interruptedCount??0));await page.clock.runFor(60);
 check('Retry after '+label+' restores writes without replaying its action',await retry.count()===0&&((await disk()).homeworld.cartographyV105?.receipt?.phase??'offer')!=='completed');
}
try{
 await menu();await page.addScriptTag({content:bundle.outputFiles[0].text});
 fixture=await page.evaluate(async origin=>{
  const api=window.__cartographyQa,save=api.normalizeSave(origin),position={...api.createHomeworldActor(),x:5920,y:5190};save.profile.hunterName='QA V105 · cartographe';save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port'];save.homeworld.locationV77=api.createHomeworldCheckpointV77(save.createdAt,'0',position,null,position);
  if(!api.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid accepted initial fixture');localStorage.setItem(api.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await api.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);const checkpoint=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});if(!checkpoint.ok)throw Error(checkpoint.message);
  return{description:'Model first-tracks campaign plus explicit accepted initial city checkpoint at the existing port lectern. All subsequent positions and survey receipts are earned through UI and keyboard.',owner:save.createdAt,profile:save.profile,inventory:save.inventory,trophies:save.trophies};
 },firstTracksCompleted());
 await enter();check('Accepted initial checkpoint restores actual port actor',(await actor()).x===5920&&(await actor()).y===5190&&(await actor()).level==='0');
 await page.keyboard.press('KeyE');await page.clock.runFor(80);const oldScene=page.locator('[data-cartography-scene-v104]');await oldScene.waitFor();
 await oldScene.getByRole('button',{name:'Tracer une route entre les points connus',exact:true}).click();await page.clock.runFor(80);await oldScene.getByRole('button',{name:'Écouter le cartographe',exact:true}).click();await page.clock.runFor(80);await oldScene.getByRole('button',{name:'Partir à pied vers le bac',exact:true}).click();await page.clock.runFor(80);
 await go({x:6120,y:5020});await go({x:6120,y:5260});await go({x:6240,y:5260});await go({x:5920,y:5260});await go(b.post);await page.keyboard.press('KeyE');await page.clock.runFor(80);await oldScene.getByRole('button',{name:'Présenter la liaison parcourue',exact:true}).click();await page.clock.runFor(80);
 check('Existing option B is still completed by real native courtyard walking',(await disk()).homeworld.cartographyV104.receipt.phase==='completed');legacyBytes=JSON.stringify((await disk()).homeworld.cartographyV104);
 const scene=page.locator('[data-cartography-scene-v105]');await scene.waitFor();await failedAction(scene,'Ouvrir un nouveau relevé depuis le point haut','Revenir à la cour','choice');
 await page.keyboard.press('KeyE');await page.clock.runFor(80);await scene.getByRole('button',{name:'Ouvrir un nouveau relevé depuis le point haut',exact:true}).click();await page.clock.runFor(80);
 check('A choice uses the exact V6 source line at the same physical speaker',await scene.locator('[data-cartography-source-line="D6-W-PNJ-ROLE-12-CHOIX-A-01"]').count()===1);
 await scene.getByRole('button',{name:'Écouter le cartographe',exact:true}).click();await page.clock.runFor(80);check('A response is exact and the known B receipt remains intact',await scene.locator('[data-cartography-source-line="D6-W-PNJ-ROLE-12-REPONSE-A-01"]').count()===1&&JSON.stringify((await disk()).homeworld.cartographyV104)===legacyBytes);await capture('source-a-briefing.png',page.getByRole('dialog'));
 await scene.getByRole('button',{name:'Partir à pied vers l’escalier du Conseil',exact:true}).click();await page.clock.runFor(80);check('Starting A returns focus to the real viewport without interrupting the walk',await page.locator('[data-homeworld-viewport]').evaluate(e=>e===document.activeElement)&&(await disk()).homeworld.cartographyV105.receipt.phase==='walking');
 await go({x:5950,y:5190});await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(80);check('Actual early walk can interrupt without earning altitude or an observation',(await disk()).homeworld.cartographyV105.receipt.phase==='interrupted'&&(await disk()).homeworld.cartographyV105.receipt.crossings.length===0&&(await disk()).homeworld.cartographyV105.receipt.observedAt===null);await page.getByRole('button',{name:'Reprendre',exact:true}).click();await page.clock.runFor(80);await resumeIfNeeded();
 await routeTo('0',b.lower);await capture('council-stair-lower.png');await crossStairs('0');check('Real ascent is recorded before upper-world walking',(await disk()).homeworld.cartographyV105.receipt.crossings.length===1&&(await disk()).homeworld.cartographyV105.receipt.last.levelId==='+1');await routeTo('+1',b.highPoint);
 check('Physical viaduct approach earns the observation phase with zero compared objects',(await disk()).homeworld.cartographyV105.receipt.phase==='observing'&&(await disk()).homeworld.cartographyV105.receipt.compared===0);check('Upper viewpoint uses existing ground and a functional marker',await page.locator('[data-homeworld-high-point-v105]').count()===1);await capture('viaduct-high-point.png');
 await page.keyboard.press('KeyE');await page.clock.runFor(80);const observationScene=page.locator('[data-cartography-observation-v105]');await observationScene.waitFor();check('Observation shows exactly two known native object references',await observationScene.locator('[data-cartography-known-object]').count()===2);await observationScene.getByRole('button',{name:'Comparer le bac de basalte',exact:true}).click();await page.clock.runFor(80);check('First comparison retains modal focus while replacing its button',await page.getByRole('dialog').evaluate(e=>e.contains(document.activeElement))&&(await disk()).homeworld.cartographyV105.receipt.phase==='observing');await observationScene.getByRole('button',{name:'Revenir au viaduc',exact:true}).click();await page.clock.runFor(80);await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await page.clock.runFor(80);
 const beforeReload=await disk();await enter();await resumeIfNeeded();check('Ordinary Continue restores +1 position and first comparison without recording a date',(await actor()).level==='+1'&&(await disk()).homeworld.cartographyV105.receipt.compared===1&&(await disk()).homeworld.cartographyV105.receipt.observedAt===null&&Math.hypot((await actor()).x-beforeReload.homeworld.locationV77.exterior.x,(await actor()).y-beforeReload.homeworld.locationV77.exterior.y)<8);
 await page.keyboard.press('KeyE');await page.clock.runFor(80);await observationScene.getByRole('button',{name:'Comparer la lampe du registre',exact:true}).click();await page.clock.runFor(80);check('Second comparison retains modal focus and exposes dating',await page.getByRole('dialog').evaluate(e=>e.contains(document.activeElement))&&(await disk()).homeworld.cartographyV105.receipt.phase==='observing'&&await observationScene.getByRole('button',{name:'Dater l’observation et reprendre le chemin',exact:true}).count()===1);await capture('two-landmarks-compared.png',page.getByRole('dialog'));await failedAction(observationScene,'Dater l’observation et reprendre le chemin','Revenir au viaduc','date');
 check('Date refusal keeps two comparisons but no fictitious timestamp',(await disk()).homeworld.cartographyV105.receipt.compared===3&&(await disk()).homeworld.cartographyV105.receipt.observedAt===null);
 await page.keyboard.press('KeyE');await page.clock.runFor(80);await observationScene.getByRole('button',{name:'Dater l’observation et reprendre le chemin',exact:true}).click();await page.clock.runFor(80);const observedAt=(await disk()).homeworld.cartographyV105.receipt.observedAt;check('Only the explicit on-site date action preserves a valid observation time',typeof observedAt==='string'&&Number.isFinite(Date.parse(observedAt))&&(await disk()).homeworld.cartographyV105.receipt.phase==='return');check('Dating closes the observation with viewport focus and keeps the return active',await page.locator('[data-homeworld-viewport]').evaluate(e=>e===document.activeElement)&&(await disk()).homeworld.cartographyV105.receipt.phase==='return');
 await routeTo('+1',b.upper);await crossStairs('+1');await routeTo('0',b.post);await page.keyboard.press('KeyE');await page.clock.runFor(80);await failedAction(scene,'Présenter le relevé daté','Revenir à la cour','report');
 await page.keyboard.press('KeyE');await page.clock.runFor(80);await scene.getByRole('button',{name:'Présenter le relevé daté',exact:true}).click();await page.clock.runFor(80);const done=await disk();check('Reporting retains focus inside the surviving source dialog',await page.getByRole('dialog').evaluate(e=>e.contains(document.activeElement)));
 check('Only the physical descent and return let the source speaker validate A',done.homeworld.cartographyV105.receipt.phase==='completed'&&done.homeworld.cartographyV105.receipt.crossings.some(c=>c.reverse&&c.afterObservation)&&await scene.locator(':scope > [data-cartography-source-line="D6-W-PNJ-ROLE-12-SUCCES---01"]').count()===1);
 check('Observation timestamp and every V104 B byte survive the new complete route',done.homeworld.cartographyV105.receipt.observedAt===observedAt&&JSON.stringify(done.homeworld.cartographyV104)===legacyBytes);
 check('No profile, inventory or trophy reward is granted by cartographer words',JSON.stringify(done.profile)===JSON.stringify(fixture.profile)&&JSON.stringify(done.inventory)===JSON.stringify(fixture.inventory)&&JSON.stringify(done.trophies)===JSON.stringify(fixture.trophies));await capture('releve-completed-desktop.png',page.getByRole('dialog'));
 await page.setViewportSize({width:390,height:844});await paint();check('Source dialog fits a mobile viewport with usable controls',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await scene.getByRole('button',{name:'Revenir à la cour',exact:true}).evaluate(e=>e.getBoundingClientRect().height>=44));await capture('releve-completed-mobile.png');await scene.getByRole('button',{name:'Revenir à la cour',exact:true}).click();await page.clock.runFor(80);await enter();check('Completed A remains stored after ordinary mobile Continue',(await disk()).homeworld.cartographyV105.receipt.phase==='completed'&&(await disk()).homeworld.cartographyV105.receipt.observedAt===observedAt&&JSON.stringify((await disk()).homeworld.cartographyV104)===legacyBytes);
 check('The local journey raises no browser exception',errors.length===0,errors);
}catch(error){failure=error;checks.push({name:error.message,status:'FAIL'});await page.screenshot({path:path.join(output,'failure.png'),timeout:5000}).catch(()=>{});}
finally{
 const sourceAfter=await snapshot(),sourceUnchanged=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);if(!sourceUnchanged){failure??=Error('Runtime source changed during recipe');checks.push({name:'Runtime sources unchanged during recipe',status:'FAIL'});}
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({status:failure?'FAIL':'PASS',scope:'Real local UI, real keyboard and native physics after one accepted initial city fixture; B then A with a physical upper stair trip, known-object comparison, clock date and walked return. Controlled browser clock. No full-campaign or physical-controller certification.',baseUrl,mode:componentFixture?'isolated-current-HomeworldHub':'compiled-app',contentVersion,buildId:expectedBuildId,servedBuilds,checks,captures,fixture,errors,sourceBefore,sourceAfter,sourceUnchanged,completedAt:new Date().toISOString()},null,2)+'\n');await browser.close();
}
if(failure){console.error(failure);process.exitCode=1;}else console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
