/** Actual React atlas + actual Worker regression. Parent coordinate controls
 * are explicit component fixtures, not played movement or campaign evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {createGeometryUpgradeFixtureV112} from '../tests/helpers/homeworld-geometry-upgrade-v112-route.mjs';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const root=process.cwd(),output=path.resolve(process.env.YAUTJA_LIVE_GUIDANCE_V112_OUTPUT??'/tmp/v112-live-guidance-react');
await fs.mkdir(output,{recursive:true});assert.equal((await fs.readdir(output)).length,0,'Preserve attempts in separate directories');
const api=homeworldQaModelV64(root,['homeworldPublicPlacesMountV112.ts','homeworldWayfindingV112.ts','homeworldGeometryRecoveryV112.ts']);
const save=firstTracksCompleted(),played=await createGeometryUpgradeFixtureV112(save.createdAt,{remote:true});
save.homeworld.visitedDistrictIds=['port','market','forges','memory','terraces','temple','enforcers','citadel','undercity'];
Object.assign(save.homeworld,played.ledgers);save.homeworld.locationV77=played.checkpoint;
const origin={actor:played.checkpoint.exterior,levelId:'0',interiorId:null};
const recovery=api.planHomeworldGeometryRecoveryV112({ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,checkpoint:played.checkpoint,ledgers:api.homeworldGeometryRecoveryLedgersV112(save.homeworld),...origin,active:true});
assert(recovery.ok&&recovery.plan&&!recovery.plan.movesActor);
Object.assign(save.homeworld,recovery.plan.ledgers);save.homeworld.locationV77=recovery.plan.checkpoint;
const nextOrigin={...origin,actor:{x:7480,y:5346}},targetId='objective-plaque-resume-v110';
const plan=api.homeworldRoutePlanV112(save,origin,targetId);assert.equal(plan.status,'reachable');
const expected=api.homeworldRouteGuidanceV112(plan,nextOrigin,save),initial=api.homeworldRouteGuidanceV112(plan,origin,save);
assert.equal(expected.state,'walking');assert.notDeepEqual(expected.waypoint,initial.waypoint);
const foreign=structuredClone(save);foreign.createdAt='2026-09-21T10:00:00.000Z';
const fixture={save,foreign,origin,nextOrigin,targetId};
const contents=`import {useState} from 'react';import {createRoot} from 'react-dom/client';
import './app/game/systems/homeworldPublicPlacesMountV112';import Map from './app/game/HomeworldWorldMapV77';
const f=window.__liveGuidanceFixtureV112;
function Harness(){const[s,setSave]=useState(f.save),[o,setOrigin]=useState(f.origin),[open,setOpen]=useState(true),[paused,setPaused]=useState(false);
return <main><button onClick={()=>setOrigin(f.nextOrigin)}>Publier le pas suivant · fixture</button><button onClick={()=>setPaused(true)}>Suspendre le parent · fixture</button><button onClick={()=>setSave(f.foreign)}>Changer de propriétaire · fixture</button><output data-fixture-body-v112={o.actor.x+':'+o.actor.y}/><section style={{position:'relative',height:'calc(100dvh - 90px)'}}><Map save={s} {...o} open={open} routeSuspended={paused} targetId={f.targetId} onOpenChange={setOpen}/></section></main>;}createRoot(document.getElementById('root')).render(<Harness/>);`;
const bundle=await build({stdin:{contents,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:'/tmp/v112-live-guidance-build',format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const worker=await build({entryPoints:[path.join(root,'app/game/homeworldRouteWorkerV112.ts')],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
const js=bundle.outputFiles.find(row=>row.path.endsWith('.js')).contents,css=bundle.outputFiles.find(row=>row.path.endsWith('.css'))?.contents??'';
const server=http.createServer((request,response)=>{
 if(request.url==='/fixture.js'){response.setHeader('Content-Type','text/javascript');response.end(js);}
 else if(request.url==='/fixture.css'){response.setHeader('Content-Type','text/css');response.end(css);}
 else if(request.url==='/homeworldRouteWorkerV112.ts'){response.setHeader('Content-Type','text/javascript');response.end(worker.outputFiles[0].contents);}
 else if(request.url==='/'){response.setHeader('Content-Type','text/html');response.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual React live guide V112</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script>window.__liveGuidanceFixtureV112='+JSON.stringify(fixture).replaceAll('<','\\u003c')+'</script><script type="module" src="/fixture.js"></script>');}
 else{response.writeHead(204);response.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const url='http://127.0.0.1:'+server.address().port,checks=[],captures=[],errors=[];let browser,failure=null;
async function check(name,ok,detail){checks.push({name,status:ok?'PASS':'FAIL',detail});assert(ok,name);console.log('PASS '+name);}
async function eventually(test,label){for(let n=0;n<100;n++){if(await test())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error(label);}
try{
 const browserLocation=process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}
  :process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{executablePath:'/usr/bin/chromium'};
 browser=await chromium.launch({headless:true,...browserLocation,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:width===390?844:1050}}),page=await context.newPage();let workers=0;
  page.on('pageerror',error=>errors.push(error.message));page.on('worker',()=>workers++);
  try{await page.goto(url);await page.locator(`[data-map-landmark-v83="${targetId}"]`).click();await page.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();const guide=page.locator('[data-homeworld-route-guide-v109]');await guide.waitFor();
   await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
   const before=await guide.evaluate(e=>({x:Number(e.dataset.homeworldRouteNextXV109),y:Number(e.dataset.homeworldRouteNextYV109)})),workerCount=workers,clockBefore=await page.evaluate(()=>Date.now());
   await page.getByRole('button',{name:'Publier le pas suivant · fixture',exact:true}).click();
   await eventually(async()=>await page.locator('[data-fixture-body-v112]').getAttribute('data-fixture-body-v112')==='7480:5346','actual React parent failed to publish its declared coordinate fixture');
   await eventually(async()=>Number(await guide.getAttribute('data-homeworld-route-next-x-v109'))===expected.waypoint.x,'guide retained a former actor after React published new coordinates');
   const after=await guide.evaluate(e=>({state:e.dataset.homeworldRouteGuideV109,current:e.dataset.homeworldRouteCurrentV109,x:Number(e.dataset.homeworldRouteNextXV109),y:Number(e.dataset.homeworldRouteNextYV109)}));
   await check(width+'px actual React heading immediately uses its newly published actor',after.state==='walking'&&after.current==='true'&&after.x===expected.waypoint.x&&after.y===expected.waypoint.y,{before,after,expected:expected.waypoint});
   await check(width+'px coordinate update requires no350ms timer or new Worker',await page.evaluate(()=>Date.now())===clockBefore&&workers===workerCount,{workers});
   const box=await guide.boundingBox();await check(width+'px actual guide stays visible inside its fixture viewport',box&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=(width===390?844:1050),box);
   const file=width+'px-live-guidance.png';await page.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));captures.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
   await page.getByRole('button',{name:'Suspendre le parent · fixture',exact:true}).click();await eventually(async()=>await guide.getAttribute('data-homeworld-route-paused-v98')==='true','pause did not reach the actual guide');await check(width+'px pause keeps the visible guide suspended',await guide.getAttribute('data-homeworld-route-paused-v98')==='true');
   await page.getByRole('button',{name:'Changer de propriétaire · fixture',exact:true}).click();await eventually(async()=>await guide.count()===0,'foreign owner retained a guide');await check(width+'px foreign owner cannot retain the old route',await guide.count()===0);
  }finally{await context.close();}
 }
 await check('No uncaught actual React/Worker browser exception',errors.length===0,errors);
}catch(error){failure={message:error.message,stack:error.stack};console.error(error);}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(output,'result.json'),JSON.stringify({status:failure?'FAIL':'PASS',scope:'Actual React atlas and actual module Worker with explicit parent coordinate/owner/pause fixtures. No gameplay movement, compiled app certification or art admission is claimed.',checks,captures,errors,failure,fixture:{origin,nextOrigin,targetId,historicalOwner:played.owner,sourceCommit:played.sourceCommit}},null,2)+'\n');}
if(failure)process.exitCode=1;
