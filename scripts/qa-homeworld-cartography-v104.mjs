/** Local game UI after one explicit normalized Homeworld fixture. Every
 * approach after entry is played with real keyboard input; no actor setter. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';

const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3101';
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname));
const output=path.resolve(process.env.YAUTJA_CARTOGRAPHY_QA_OUTPUT??'outputs/qa-v104/homeworld-cartography');
await fs.mkdir(output,{recursive:true});
const sources=['app/game/HomeworldHub.tsx','app/game/HomeworldWorldSceneV77.tsx','app/game/HomeworldCartographerV104.tsx','app/game/HomeworldCartographyV104.tsx','app/game/HomeworldCartographyV104.module.css','app/game/systems/homeworldCartographyDefinitionV104.ts','app/game/systems/homeworldCartographyLedgerV104.ts','app/game/systems/homeworldCartographyV104.ts','app/game/data/bibleCartographySceneV104.json','app/game/systems/homeworld.ts','app/game/save.ts'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const snapshot=async()=>Promise.all(sources.map(async file=>({file,sha256:sha(await fs.readFile(file))})));
const sourceBefore=await snapshot();
const bundle=await build({stdin:{contents:`import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as city from './app/game/systems/homeworldCity';import * as location from './app/game/systems/homeworldLocationV77';window.__cartographyQa={...saves,...slots,...city,...location};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),page=await context.newPage();
page.setDefaultTimeout(30000);await page.clock.install();
const checks=[],captures=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
let failure=null,fixture=null,clockPaused=false;
const check=(name,condition,detail)=>{checks.push({name,status:condition?'PASS':'FAIL',...(detail?{detail}:{})});console.log(condition?'PASS':'FAIL',name);assert(condition,name);};
const actor=()=>page.locator('[data-homeworld-actor]').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y),level:e.dataset.homeworldLevelV77}));
const disk=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')??'null'));
async function paint(){const frame=page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(clockPaused)await page.clock.runFor(50);await frame;}
async function capture(file,locator=page){await paint();await locator.screenshot({path:path.join(output,file)});captures.push({file,sha256:sha(await fs.readFile(path.join(output,file)))});}
async function menu(){await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-campaign-menu="main"]').waitFor();}
async function enter(){if(clockPaused){await page.clock.resume();clockPaused=false;}await menu();await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));clockPaused=true;await page.bringToFront();await page.locator('[data-homeworld-viewport]').focus();await page.clock.runFor(80);}
async function move(key,axis,target){
 const start=await actor(),sign=Math.sign(target-start[axis]);if(!sign)return;
 await page.locator('[data-homeworld-viewport]').focus();await page.keyboard.down(key);
 try{for(let i=0;i<180;i++){
  await page.clock.runFor(20);const p=await actor();if((p[axis]-target)*sign>=-3)return;
 }}finally{await page.keyboard.up(key);await page.clock.runFor(50);}
 throw Error(`Movement stalled ${key} ${axis}=${target}: ${JSON.stringify(await actor())}`);
}
const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
try{
 await menu();await page.addScriptTag({content:bundle.outputFiles[0].text});
 fixture=await page.evaluate(async origin=>{
  const api=window.__cartographyQa,save=api.normalizeSave(origin),position={...api.createHomeworldActor(),x:5920,y:5190};
  save.profile.hunterName='QA V104 · cartographe';save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port'];
  save.homeworld.locationV77=api.createHomeworldCheckpointV77(save.createdAt,'0',position,null,position);
  if(!api.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid cartography fixture');
  localStorage.setItem(api.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await api.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
  const checkpoint=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});if(!checkpoint.ok)throw Error(checkpoint.message);
  return{description:'Authored cage/first-tracks model route, explicit accepted city checkpoint at the existing port lectern. Not a campaign played in this browser.',owner:save.createdAt,location:save.homeworld.locationV77,profile:save.profile,inventory:save.inventory,trophies:save.trophies};
 },firstTracksCompleted());
 await enter();
 await page.locator('[data-homeworld-viewport]').focus();await page.clock.runFor(80);
 const start=await actor();check('Existing Homeworld checkpoint restores the actor on the supported port approach',start.x===5920&&start.y===5190&&start.level==='0');
 check('Dedicated source speaker and the existing native lectern are physically rendered',await page.locator('[data-homeworld-cartographer-v104="bible-v104:port-cartographer"]').count()===1&&await page.locator('[data-homeworld-prop-id="urban-v81:port-4:register"]').count()>0);
 await capture('cartographer-post-desktop.png');
 await page.keyboard.press('KeyE');await page.clock.runFor(80);
 const scene=page.locator('[data-cartography-scene-v104]'),dialog=page.getByRole('dialog',{name:'Cartographe du poste rencontré',exact:true});await scene.waitFor();
 check('Real interaction key opens the local cartographer dialog with focus',await dialog.evaluate(e=>e.contains(document.activeElement)));
 check('Only the known port courtyard appears in the functional survey map',await scene.getByRole('img').count()===1&&/Les zones non observées restent hors du relevé/.test(await scene.innerText()));
 await page.evaluate(()=>{window.__cartoSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='yautja-long-hunt.save')throw new DOMException('QA quota','QuotaExceededError');return window.__cartoSetItem.call(this,k,v);};});
 await scene.getByRole('button',{name:'Tracer une route entre les points connus',exact:true}).click();await page.clock.runFor(80);
 check('Refused durable write leaves the choice absent in the real campaign save',!(await disk()).homeworld.cartographyV104&&await scene.getAttribute('data-cartography-phase')==='offer');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__cartoSetItem;delete window.__cartoSetItem;});
 await scene.getByRole('button',{name:'Tracer une route entre les points connus',exact:true}).click();await page.clock.runFor(80);
 check('Retry records the exact source B choice once',await scene.getAttribute('data-cartography-phase')==='choice'&&await scene.locator('[data-cartography-source-line="D6-W-PNJ-ROLE-12-CHOIX-B-01"]').count()===1);
 await scene.getByRole('button',{name:'Écouter le cartographe',exact:true}).click();await page.clock.runFor(80);
 check('Present source speaker gives the B response without playing the unavailable high-point branch',await scene.locator('[data-cartography-source-line="D6-W-PNJ-ROLE-12-REPONSE-B-01"]').count()===1&&await scene.locator('[data-cartography-source-line*="CHOIX-A"]').count()===0);
 const stopped=await actor();await page.keyboard.down('ArrowRight');await page.clock.runFor(250);await page.keyboard.up('ArrowRight');check('World movement remains stopped behind the actual dialog',JSON.stringify(await actor())===JSON.stringify(stopped));
 await capture('cartographer-briefing-desktop.png',dialog);
 await scene.getByRole('button',{name:'Partir à pied vers le bac',exact:true}).click();await page.clock.runFor(80);
 await page.locator('[data-cartography-journal-v104]').waitFor();
 await move('ArrowRight','x',6020);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(80);
 check('Pausing midway preserves a real walked prefix and records interruption without a waypoint',(await disk()).homeworld.cartographyV104.receipt.phase==='interrupted'&&(await disk()).homeworld.cartographyV104.receipt.nextWaypoint===0&&(await disk()).homeworld.cartographyV104.receipt.walked>40);
 await page.getByRole('button',{name:'Reprendre',exact:true}).click();await page.clock.runFor(80);
 await page.getByRole('button',{name:'Reprendre au dernier point sûr',exact:true}).click();await page.clock.runFor(80);
 await move('ArrowRight','x',6120);await move('ArrowUp','y',5020);
 check('Real keyboard approach records the first existing courtyard marker',(await disk()).homeworld.cartographyV104.receipt.nextWaypoint===1);
 await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await page.clock.runFor(80);
 const first=await actor();await enter();
 check('Ordinary Continue restores the saved first-marker position and keeps its receipt',Math.hypot((await actor()).x-first.x,(await actor()).y-first.y)<3&&(await disk()).homeworld.cartographyV104.receipt.nextWaypoint===1);
 const resume=page.getByRole('button',{name:'Reprendre au dernier point sûr',exact:true});if(await resume.count()){await resume.click();await page.clock.runFor(80);}
 await move('ArrowDown','y',5260);await move('ArrowRight','x',6240);
 check('Second marker is earned by native walking and asks for a physical return',(await disk()).homeworld.cartographyV104.receipt.nextWaypoint===2&&(await disk()).homeworld.cartographyV104.receipt.phase==='return');
 check('Distant marker has no cartographer interaction prompt',await page.getByRole('button',{name:'Cartographe · liaison du port',exact:true}).count()===0);
 await capture('cartographer-return-notebook-desktop.png');
 await move('ArrowLeft','x',5920);await move('ArrowUp','y',5190);
 await page.keyboard.press('KeyE');await page.clock.runFor(80);await scene.waitFor();
 await scene.getByRole('button',{name:'Présenter la liaison parcourue',exact:true}).click();await page.clock.runFor(80);
 const completed=await disk();check('Only a walked return to the source speaker completes the survey',completed.homeworld.cartographyV104.receipt.phase==='completed'&&await scene.locator('[data-cartography-source-line="D6-W-PNJ-ROLE-12-SUCCES---01"]').count()===1);
 check('Survey completion grants no marks, trophies, inventory or previously unknown districts',JSON.stringify(completed.profile)===JSON.stringify(fixture.profile)&&JSON.stringify(completed.inventory)===JSON.stringify(fixture.inventory)&&JSON.stringify(completed.trophies)===JSON.stringify(fixture.trophies)&&completed.homeworld.visitedDistrictIds.join(',')==='port');
 await capture('cartographer-complete-desktop.png',dialog);
 await page.setViewportSize({width:390,height:844});await paint();
 check('Mobile source dialog and map fit 390px with usable controls',await noOverflow()&&await scene.getByRole('button',{name:'Revenir à la cour',exact:true}).evaluate(e=>e.getBoundingClientRect().height>=44));
 await capture('cartographer-complete-mobile.png');
 await scene.getByRole('button',{name:'Revenir à la cour',exact:true}).click();await page.clock.runFor(80);await enter();
 check('Completed survey survives ordinary reload without restarting or repeating its choice',(await disk()).homeworld.cartographyV104.receipt.phase==='completed'&&await page.locator('[data-cartography-scene-v104]').count()===0);
 check('Journey has no browser exceptions',errors.length===0,errors);
}catch(error){failure=error;checks.push({name:error.message,status:'FAIL'});await page.screenshot({path:path.join(output,'failure.png'),timeout:5000}).catch(()=>{});}
finally{
 const sourceAfter=await snapshot(),sourceUnchanged=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
 if(!sourceUnchanged){failure??=Error('Homeworld source changed during recipe');checks.push({name:'Runtime sources unchanged during recipe',status:'FAIL'});}
 const report={status:failure?'FAIL':'PASS',scope:'Real local game UI and keyboard after one explicit accepted Homeworld fixture. Controlled browser clock. Software Chromium; no full-campaign, physical-controller or canon-art certification.',baseUrl,checks,captures,fixture,errors,sourceBefore,sourceAfter,sourceUnchanged,completedAt:new Date().toISOString()};
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');await browser.close();
}
if(failure){console.error(failure);process.exitCode=1;}else console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
