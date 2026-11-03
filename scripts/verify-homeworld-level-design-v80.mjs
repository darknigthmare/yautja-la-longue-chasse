import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {homeworldNavigatorV77} from './homeworld-navigation-browser-v77.mjs';
import {qaContractV80,snapshotSourcesV80,requireVersionV80,hardErrorsV80} from './public-qa-contract-v80.mjs';

// Real compiled GameClient + public keys, in new QA contexts only. No framework
// dev server or component renderer is launched by this recipe. Local production
// integration and final candidate runs must use different output directories.
const base=process.env.V80_QA_BASE||'http://localhost:4204',url=new URL(base);
assert((url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))||base==='https://yautja-la-longue-chasse.vercel.app','Only local QA or the exact SHA/READY-gated production alias is allowed');
const output=path.resolve(process.env.V80_QA_OUTPUT||'work-local/v80/qa/homeworld-integration-4204');
const cdp=process.env.V80_CDP||'http://127.0.0.1:58677',cdpUrl=new URL(cdp);
assert(cdpUrl.protocol==='http:'&&cdpUrl.hostname==='127.0.0.1','Only an isolated local QA CDP endpoint is allowed');
const qaRoot=path.resolve('work-local/v80/qa'),relative=path.relative(qaRoot,output);
assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
assert(!fs.existsSync(output)||fs.readdirSync(output).length===0,'Do not overwrite an earlier run');fs.mkdirSync(output,{recursive:true});
const contract=qaContractV80(base,output);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=['app/game/HomeworldHub.tsx','app/game/HomeworldWorldSceneV77.tsx','app/game/HomeworldCity.module.css',
 'app/game/systems/homeworldCivicDecorV80.ts','app/game/systems/homeworldCivicWorldV80.ts',
 'app/game/systems/homeworldCivicNeighborhoodsV80.ts','app/game/systems/homeworldCivicArchitectureV80.ts',
 'app/game/systems/homeworldCourtArtV80.ts','app/game/systems/homeworldPortShouldersV80.ts',
 'app/game/systems/homeworldNaturalPlacementsV80.ts','app/game/systems/homeworldOutskirtsV71.ts',
 'app/game/systems/homeworldLandscapeV75.ts','app/game/data/homeworldOutskirtsV71.json','app/game/data/homeworldLandscapeV75.json',
 'app/game/systems/homeworldStreetModulesV78.ts','app/game/systems/homeworldUrbanPopulationV78.ts',
 'app/game/systems/homeworldUrbanCodexV78.ts','app/game/systems/homeworldContextCodexV71.ts',
 'app/game/systems/homeworldUrbanNavigationV78.ts','app/game/systems/homeworldNavigationV77.ts',
 'app/game/systems/homeworldLocationV77.ts',
 'app/game/systems/homeworldCityNativePlacementV78.ts','app/game/data/homeworldNativeDecorV80.json'];
const sources=()=>snapshotSourcesV80(files,contract),sourceBefore=sources();
const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const api=Object.assign({},load('homeworldCity'),load('homeworldWorldV77'),load('homeworldGeometryV64'),
 load('homeworldInteriorsV64'),load('homeworldCivicDecorV80'),load('homeworldCivicWorldV80'),load('homeworldNavigationV77'),
 load('homeworldCourtArtV80'),load('homeworldStreetModulesV78'),load('homeworldPortShouldersV80'));
const saveApi=qa.load('app/game/save.ts'),manifest=JSON.parse(fs.readFileSync('app/game/data/homeworldNativeDecorV80.json','utf8'));
const report={...contract,base,kind:process.env.V80_QA_KIND||'Next-production-local-integration',
 expectedVersion:'V80',sourceBefore,sourceAtRun:sourceBefore,captures:[],checks:[],walks:[],assets:[],errors:[],
 isolation:{...contract.isolation,cdpEndpoint:cdp,cdp,newContexts:true,userContextsTouched:false,userSavesTouched:false},
 fixtures:'One fresh isolated legacy defaultSave with deck prerequisites, real port arrival, no position injection during play. Separate observations below are explicitly initial checkpoints, not walks.',
 injection:{duringPlay:false,health:false,rewards:false,initialLegacyDefaultSave:true,initialObservationCheckpoints:[]},
 limits:['This local integration recipe is not publication or exact deployed SHA proof. Sources at run are recorded separately from compiled build identity.',
  'Real-time keyboard input drives the existing actor motor; no fake clock, React setter, scene teleport or navigation action injection.',
  'Observation checkpoints prove rendering only; whole-city/campaign completion and canon1:1 are not claimed.']};
const persist=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
const browser=await chromium.connectOverCDP(cdp);let context,page;
function observe(page){
 const pending=new Map();page.on('response',response=>{const u=new URL(response.url());if(u.origin!==url.origin||!Object.values(manifest.assets).some(a=>a.src===u.pathname))return;
  const read=response.body().then(bytes=>({url:response.url(),src:u.pathname,http:response.status(),bytes:bytes.length,sha256:sha(bytes),readAt:new Date().toISOString()})).catch(error=>({error:String(error),src:u.pathname}));
  pending.set(u.pathname,[...(pending.get(u.pathname)||[]),read]);
 });
 return async()=>{for(const a of Object.values(manifest.assets)){const reads=await Promise.all(pending.get(a.src)||[]),received=reads.filter(r=>!r.error).at(-1);
  assert(received,a.src+' not actually received by Chrome');assert.equal(received.http,200);assert.equal(received.sha256,a.sha256);report.assets.push(received);}
 };
}
async function start({checkpoint=null,viewport={width:1440,height:1000}}={}){
 context=await browser.newContext({viewport});page=await context.newPage();page.setDefaultTimeout(90000);
 const received=observe(page);page.on('pageerror',e=>report.errors.push({kind:'pageerror',text:e.message}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({kind:'console',text:m.text()});});
 page.on('requestfailed',r=>report.errors.push({kind:'requestfailed',url:r.url(),error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)report.errors.push({kind:'http',url:r.url(),status:r.status()});});
 const save=saveApi.defaultSave('2026-10-03T19:00:00.000Z');save.settings.screenShake=false;
 if(checkpoint){save.homeworld.locationV77={version:1,layoutRevision:1,ownerCreatedAt:save.createdAt,levelId:checkpoint.levelId,exterior:checkpoint.point,interiorId:null,local:null};
  assert(load('homeworldLocationV77').resolveHomeworldLocationV77(save.homeworld.locationV77,save.createdAt).restored);report.injection.initialObservationCheckpoints.push(checkpoint);}
 await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:saveApi.SAVE_STORAGE_KEY,save});
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('.physical-ship-deck[data-suspended="false"]').waitFor();
 await requireVersionV80(page,report,checkpoint?.label||'real-legacy-session');
 await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
 await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
 await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 return received;
}
async function capture(label,detail={}){
 // Entering a real room mounts new atlas images after the navigation callback.
 // Wait for those actual images, not only the previous exterior preload. A
 // failed decode still fails the recipe; no missing-image guard is relaxed.
 await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 const data=await page.locator('[data-homeworld-hub]').evaluate(hub=>({levelId:hub.dataset.homeworldLevelV77,interiorId:hub.dataset.homeworldInteriorId,
  version:document.querySelector('[data-game-content-version]')?.dataset.gameContentVersion,
  neighborhood:hub.querySelector('[data-homeworld-neighborhood-v80]')?.textContent,
  actor:(()=>{const a=hub.querySelector('[data-homeworld-actor]');return{x:Number(a.dataset.x),y:Number(a.dataset.y),depth:getComputedStyle(a).zIndex};})(),
  viewport:{width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth},
  groundLevels:[...hub.querySelectorAll('[data-homeworld-level-ground-v77]')].map(n=>n.dataset.homeworldLevelGroundV77),
  civicProps:[...hub.querySelectorAll('[data-homeworld-prop-id^="civic-v80:"]')].map(n=>({id:n.dataset.homeworldPropId,src:n.querySelector('img')?.getAttribute('src'),depth:getComputedStyle(n).zIndex})),
  courtProps:[...hub.querySelectorAll('[data-homeworld-prop-id^="urban-v78:port-court-"]')].map(n=>({id:n.dataset.homeworldPropId,src:n.querySelector('img')?.getAttribute('src'),depth:getComputedStyle(n).zIndex})),
  naturalProps:[...hub.querySelectorAll('[data-homeworld-prop-id^="port-shoulder-v80:"]')].map(n=>({id:n.dataset.homeworldPropId,src:n.querySelector('img')?.getAttribute('src'),rect:n.dataset.nativeSourceRect,depth:getComputedStyle(n).zIndex})),
  missing:[...hub.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));
 assert.equal(data.version,'V80');data.contentVersion=data.version;assert.deepEqual(data.missing,[]);
 if(!data.interiorId)assert.deepEqual(data.groundLevels,[data.levelId]);
 for(const shown of data.courtProps){const item=api.HOMEWORLD_URBAN_PROPS_V78.find(p=>p.id===shown.id);assert(item);assert.equal(shown.src,api.HOMEWORLD_COURT_ART_V80[item.artId].src,'Visible court must use the current shared provider, not an earlier integration build');}
 const file=path.join(output,String(report.captures.length+1).padStart(2,'0')+'-'+label+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:92,fullPage:true});
 report.captures.push({label,file,sha256:sha(fs.readFileSync(file)),capturedAt:new Date().toISOString(),data,detail});persist();console.log('CAPTURE '+label);
}
try{
 const received=await start(),nav=homeworldNavigatorV77(page,api,{controlledClock:false,driverTickMs:32});await nav.focus();
 assert(Math.hypot((await nav.position()).x-api.HOMEWORLD_SPACEPORT_V77.spawn.x,(await nav.position()).y-api.HOMEWORLD_SPACEPORT_V77.spawn.y)<3);
 await capture('port-real-arrival');
 // Walk the real long causeway, then the western civic threshold. The same
 // route planner includes the V80 measured solids; actual keys can still fail.
 for(const target of[
  {label:'east-causeway-cargo',levelId:'0',point:{x:7340,y:5075}},
  {label:'west-causeway-halt',levelId:'0',point:{x:3500,y:5400}},
  {label:'memory-real-frontage',levelId:'0',point:api.homeworldBuildingDoorwayV64(api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='memory-vault')).approach},
 ]){await nav.reach(target);await nav.release();await capture(target.label,{publicKeyboardWalk:true,target});}
 await nav.enter('memory-vault');await capture('memory-real-interior',{publicKeyboardDoor:true});await nav.exitRoom();await capture('memory-exit-same-threshold',{publicKeyboardExit:true});
 const c=api.HOMEWORLD_CONNECTORS_V77.find(c=>c.from.levelId==='0'&&c.to.levelId==='-1A')||api.HOMEWORLD_CONNECTORS_V77.find(c=>c.to.levelId==='0'&&c.from.levelId==='-1A');assert(c);
 const side=c.from.levelId==='0'?c.from:c.to;await nav.reach(side);await nav.connect(c.id,c.to.levelId==='0');await capture('lower-quarter-real-connector-arrival',{publicKeyboardConnector:true,connectorId:c.id});
 report.walks.push(...nav.routes);await received();await nav.release();await context.close();context=null;
 // A distinct fresh context for every native source: initial observation only.
 for(const [id,a] of Object.entries(manifest.assets)){
  const item=api.HOMEWORLD_CIVIC_PROPS_V80.find(p=>p.artId===id);assert(item);
  const poly=api.homeworldCivicPolygonV80(item),mean={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length};
  const spots=[{x:mean.x,y:Math.max(...poly.map(p=>p.y))+70},{x:Math.max(...poly.map(p=>p.x))+80,y:mean.y},
   ...[-120,0,120].flatMap(dx=>[-100,100].map(dy=>({x:mean.x+dx,y:mean.y+dy})))];
  const point=spots.find(p=>api.homeworldCivicWalkableV80(item.levelId,p));assert(point);
  const received=await start({checkpoint:{label:id,levelId:item.levelId,point}});
  const prop=page.locator('[data-homeworld-prop-id="'+item.id+'"]');await prop.waitFor();await prop.locator('img').evaluate(i=>i.decode());
  assert.equal(await prop.locator('img').getAttribute('src'),a.src);await capture('native-'+id,{initialObservationCheckpoint:true,item,paint:api.homeworldCivicPaintV80(item)});
  await received();await context.close();context=null;
 }
 // These mobile views are separate initial observation checkpoints. They do
 // not claim that the same actor walked from the desktop session to this spot.
 const memory=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='memory-vault');
 for(const checkpoint of[
  {label:'mobile-port-arrival',levelId:'0',point:api.HOMEWORLD_SPACEPORT_V77.spawn},
  {label:'mobile-east-causeway',levelId:'0',point:{x:7340,y:5075}},
  {label:'mobile-memory-frontage',levelId:'0',point:api.homeworldBuildingDoorwayV64(memory).approach},
 ]){
  assert(api.homeworldCivicWalkableV80(checkpoint.levelId,checkpoint.point));
  const received=await start({checkpoint,viewport:{width:390,height:844}});
  await capture(checkpoint.label,{initialObservationCheckpoint:true,mobile:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile document must not overflow horizontally');
  await received();await context.close();context=null;
 }
 report.sourceAfter=sources();assert.deepEqual(report.sourceAfter,report.sourceAtRun,'Owned geometry/renderer sources must remain unchanged during a run');
 report.hardErrors=hardErrorsV80(report.errors);assert.deepEqual(report.hardErrors,[]);
 report.status='PASS_BROWSER_PENDING_PIXEL_REVIEW';
}catch(error){report.status='FAIL';report.error=error.stack||String(error);console.error(error);if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.jpg'),type:'jpeg',quality:90}).catch(()=>{});}
finally{report.completedAt=new Date().toISOString();persist();if(context)await context.close();console.log(JSON.stringify({status:report.status,captures:report.captures.length,output}));process.exit(report.status==='FAIL'?1:0);}
