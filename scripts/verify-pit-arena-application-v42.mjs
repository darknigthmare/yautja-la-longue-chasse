import { returnPitSelection } from "./pit-selection-browser-helpers.mjs";
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {selectPitMatch} from './pit-selection-browser-helpers.mjs';
import {parseArenaNumbers,arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';
const ids=parseArenaNumbers(process.env.V42_ARENA_QA_IDS??'all');
const target=new URL(process.env.V42_QA_URL??'http://127.0.0.1:4174');
assert(['http:','https:'].includes(target.protocol)&&!target.username&&!target.password&&!target.search&&!target.hash);
const output=path.resolve(process.env.V42_ARENA_APP_QA_OUTPUT??'work/v42/arena-application-qa');
await fs.mkdir(output,{recursive:true});
const manifest=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json','utf8'));
const selectedNumbers=process.env.V42_ARENA_QA_INCLUDE_LEGACY==='1'?[...Array.from({length:20},(_,i)=>i+1),...ids]:ids;
const stages=selectedNumbers.map(number=>{const stage=manifest.stages.find(s=>s.number===number);assert(stage?.runtimeEnabled,'Renderer-approved composition must be enabled first: '+number);return stage;});
const allPaths=new Set(stages.flatMap(s=>s.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path)))));
const buildKind=process.env.V42_ARENA_QA_BUILD_KIND??'development';
assert(['development','compiled','production'].includes(buildKind));
const report={passed:false,buildKind,checkedAt:new Date().toISOString(),surface:'full-application-play-pit-training',verifiedContentVersion:'V42',url:target.href,checks:[],loadedImageFiles:[],mobileNoOverflow:false,errors:[],failedRequests:[],limits:['Fresh automated Chromium profile, no user save touched.','Neutral first-sector compositions, not interactive props, sector transitions or completed animation.','Keyboard and viewport checks do not certify physical controller or hardware frame-rate.']};
const loaded=new Set();
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:false});
 await context.addInitScript(()=>{
  if(location.protocol.startsWith('http')&&localStorage.getItem('yautja-long-hunt.save')===null)localStorage.setItem('yautja-long-hunt.save',JSON.stringify({version:7,createdAt:'2026-09-19T12:00:00.000Z',updatedAt:'2026-09-19T12:00:00.000Z',profile:{hunterName:'Arena QA V42 isolated',rankId:'elder',honor:1900,clanMarks:83,playTimeSeconds:4321},missionProgress:{},statistics:{missionsStarted:19,missionsCompleted:17,missionsFailed:2},settings:{difficultyId:'hunter',masterVolume:0,musicVolume:0,effectsVolume:0}}));
 });
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});const pathname=new URL(r.url()).pathname;if(r.status()===200&&allPaths.has(pathname))loaded.add(pathname);});
 page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))report.failedRequests.push({url:r.url(),error:r.failure()?.errorText});});
 await page.goto(target.href,{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-game-content-version="V42"]').waitFor();
 await page.getByRole('button',{name:'Jouer',exact:true}).click();
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
 const save=()=>page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));
 const before=await save();assert.match(before,/Arena QA V42 isolated/);
 await page.evaluate(()=>{window.__arenaSaveWrites=[];const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k==='yautja-long-hunt.save')window.__arenaSaveWrites.push(k);return original.call(this,k,v);};});
 for(const stage of stages){
  const runtimeId=stage.legacyRuntimeArenaId??stage.catalogueId;
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('radio',{name:/Entraînement/}).click();
  await selectPitMatch(page,{player:'jungle-hunter',opponent:'city-hunter',arena:runtimeId});
  const canvas=page.locator(`canvas[data-pit-arena-id="${runtimeId}"]`);
  await canvas.locator('xpath=self::*[@data-pit-arena-art-status="bitmap"][@data-pit-arena-planes="P0,P1,P2,P3,P4,P5"]').waitFor({timeout:60000});
  await page.locator('[data-pit-match-loading]').waitFor({state:'detached',timeout:60000});
  const expected=new Set(stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path))));
  const data=await canvas.evaluate(e=>({...e.dataset}));
  assert.equal(data.pitArenaMissingAssets,'0');assert.equal(Number(data.pitArenaLoadedImages),expected.size);
  const subplans=stage.planes.reduce((n,p)=>n+p.assets.length,0);assert.equal(Number(data.pitArenaSubplans),subplans);
  assert([...expected].every(p=>loaded.has(p)),'Missing actual network image: '+stage.catalogueId);
  const frame=page.locator('[data-pit-frame]').first();const beforeFrame=Number(await frame.getAttribute('data-pit-frame'));
  const region=page.getByRole('region',{name:'Combat THE PIT',exact:true});await region.focus();
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');
  const afterFrame=Number(await frame.getAttribute('data-pit-frame'));assert(afterFrame>beforeFrame,'Simulation must advance while keyboard actions are sent');
  const directory=path.join(output,stage.catalogueId);await fs.mkdir(directory,{recursive:true});
  await canvas.screenshot({path:path.join(directory,'arena-live.png')});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow '+stage.catalogueId);
  await canvas.screenshot({path:path.join(directory,'arena-mobile.png')});
  assert.equal(await save(),before,'Arena traversal modified save bytes');
  report.checks.push({arena:runtimeId,catalogueId:stage.catalogueId,number:stage.number,compositionDigest:arenaCompositionDigest(stage),loadedImages:expected.size,subplans,missing:0,planes:data.pitArenaPlanes,simulationFramesAdvanced:afterFrame-beforeFrame,mobileNoOverflow:true,saveBytesUnchanged:true});
  await returnPitSelection(page);
  console.log(JSON.stringify({number:stage.number,arena:runtimeId,passed:true}));
 }
 assert.equal(await save(),before);assert.deepEqual(await page.evaluate(()=>window.__arenaSaveWrites),[]);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
 report.loadedImageFiles=[...loaded].sort();report.mobileNoOverflow=true;report.saveBytesUnchanged=true;
 report.saveSha256=createHash('sha256').update(before).digest('hex');report.passed=true;
 await fs.writeFile(path.join(output,'browser-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:true,arenas:stages.length,output:path.join(output,'browser-qa.json')}));
}catch(error){
 report.failure=String(error);if(page){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});report.dom=(await page.locator('body').innerText().catch(()=>'' )).slice(-4000);}
 await fs.writeFile(path.join(output,'failure.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser.close();}
