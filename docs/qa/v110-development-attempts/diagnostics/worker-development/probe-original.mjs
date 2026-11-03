import fs from 'node:fs';
import {createRequire} from 'node:module';
const root='/workspace/yautja-homeworld-v110';
const require=createRequire(root+'/package.json');
const {chromium}=require('playwright');
const raw=JSON.parse(fs.readFileSync(root+'/outputs/qa-v110-development-r3/result.json','utf8'));
const failed=raw.observations.find(row=>row.kind==='failure-visible-state');
const save=JSON.parse(failed.storage['yautja-long-hunt.save']);
const {homeworldSceneSsrV78}=await import(root+'/tests/helpers/homeworld-scene-ssr-v78.mjs');
const qa=homeworldSceneSsrV78(root),geo=qa.load('app/game/systems/homeworldNavigationV109.ts');
const request={save,origin:{actor:{x:7520,y:5350},levelId:'0',interiorId:null},destinationId:'objective-plaque-resume-v110',geometryKey:geo.homeworldCargoGeometryKeyV109(save.homeworld.cargoV108)};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext(),page=await context.newPage(),network=[],errors=[];
page.on('requestfailed',r=>network.push({url:r.url(),failure:r.failure()}));
page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
const results=[];
try{
 for(let index=0;index<2;index++){
  await page.goto('http://localhost:3110',{waitUntil:'networkidle'});
  results.push(await page.evaluate(async ({request,index})=>await new Promise(resolve=>{
   let worker;const done=result=>{clearTimeout(timer);worker?.terminate();resolve({index,...result});};
   const timer=setTimeout(()=>done({status:'timeout'}),15000);
   try{
    worker=new Worker(new URL('/_next/static/chunks/_app-pages-browser_app_game_homeworldRouteWorkerV110_ts.js',location.origin));
    worker.addEventListener('error',event=>done({status:'error-event',message:event.message,filename:event.filename,line:event.lineno,column:event.colno}));
    worker.addEventListener('message',event=>done({status:'message',planStatus:event.data?.plan?.status,error:event.data?.error,stages:event.data?.plan?.stages?.map(s=>({end:s.points.at(-1),radius:s.radius}))}));
    worker.postMessage(request);
   }catch(error){done({status:'constructor-or-post-throw',name:error.name,message:error.message});}
  }),{request,index}));
 }
}finally{await browser.close();}
const result={kind:'isolated-dev-worker-diagnostic',scope:'Captured failed R3 save passed directly to actual DEV worker; no application input, UI journey or production certification.',results,network,errors};
fs.writeFileSync('/tmp/v110-worker-probe-result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
