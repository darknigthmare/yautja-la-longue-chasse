/** Native decoder checks on an isolated loopback origin, not a review of game artwork. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==','base64');
const compiled=await build({entryPoints:['app/game/systems/nativeImagePreloadV94.ts'],bundle:true,write:false,format:'iife',globalName:'SceneImagesQA',platform:'browser'});
let active=0,peak=0;
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Scene image lifecycle QA</title><script src="/qa.js"></script>');return;}
 if(path==='/qa.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(compiled.outputFiles[0].text);return;}
 if(path==='/stalled.png'){res.writeHead(200,{'content-type':'image/png'});res.write(png.subarray(0,8));return;}
 if(path==='/missing.png'){res.writeHead(503);res.end();return;}
 if(path==='/corrupt.png'){res.writeHead(200,{'content-type':'image/png'});res.end('not a png');return;}
 if(path.startsWith('/batch/')){
  active++;peak=Math.max(peak,active);let closed=false;
  const release=()=>{if(!closed){closed=true;active--;}};res.on('close',release);
  const timer=setTimeout(()=>{if(!res.destroyed){res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});res.end(png);}release();},40);
  res.on('close',()=>clearTimeout(timer));return;
 }
 res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});res.end(png);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;const results=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{})});
 const page=await browser.newPage(),exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));await page.goto(origin);
 async function check(name,run){try{await run();results.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}}
 const load=options=>page.evaluate(async options=>{const progress=[];const h=SceneImagesQA.preloadSceneImagesV94({...options,onProgress:p=>progress.push(p)});await h.done;h.cancel();return progress;},options);
 await check('real PNG decodes once for duplicate source URLs',async()=>{const p=await load({urls:['/ok.png','/ok.png']});assert.deepEqual(p.at(-1),{ready:true,error:null,loaded:1,total:1});});
 await check('registry dimension validation rejects the decoded PNG',async()=>{const p=await page.evaluate(async()=>{let calls=0;const reports=[];const h=SceneImagesQA.preloadSceneImagesV94({urls:['/size.png'],validateDimensions:(_,w,h)=>{calls++;return w===2&&h===2;},onProgress:p=>reports.push(p)});await h.done;return {calls,...reports.at(-1)};});assert.equal(p.calls,1);assert.equal(p.ready,false);assert.match(p.error,/Dimensions/);});
 await check('corrupt PNG yields a retryable error, never ready',async()=>{const p=(await load({urls:['/corrupt.png']})).at(-1);assert.equal(p.ready,false);assert.equal(p.loaded,0);assert.ok(p.error);});
 await check('stalled native decoder reaches its resource deadline',async()=>{const p=(await load({urls:['/stalled.png'],timeoutMs:100})).at(-1);assert.equal(p.ready,false);assert.match(p.error,/Délai/);});
 await check('cancellation settles a stalled decoder without late readiness',async()=>{const p=await page.evaluate(async()=>{const reports=[];const h=SceneImagesQA.preloadSceneImagesV94({urls:['/stalled.png?cancel'],onProgress:p=>reports.push(p)});h.cancel();await h.done;return reports;});assert.equal(p.length,1);assert.equal(p[0].ready,false);});
 await check('refresh body is covered by the same timeout',async()=>{const p=(await load({urls:['/stalled.png?refresh'],reload:true,timeoutMs:100})).at(-1);assert.equal(p.ready,false);assert.match(p.error,/Délai/);});
 await check('HTTP failure during explicit retry cannot be marked loaded',async()=>{const p=(await load({urls:['/missing.png'],reload:true})).at(-1);assert.equal(p.ready,false);assert.equal(p.loaded,0);});
 await check('fourteen real image requests remain bounded to six concurrent loads',async()=>{peak=0;const p=(await load({urls:Array.from({length:14},(_,i)=>`/batch/${i}.png`)})).at(-1);assert.equal(p.ready,true);assert.equal(p.loaded,14);assert(peak>0&&peak<=6,`peak=${peak}`);});
 await check('a fresh batch recovers and empty batches settle immediately',async()=>{assert.equal((await load({urls:['/recovered.png']})).at(-1).ready,true);assert.deepEqual(await load({urls:[]}),[{ready:true,error:null,loaded:0,total:0}]);});
 await check('no uncaught browser exception',async()=>assert.deepEqual(exceptions,[]));
 console.log(JSON.stringify({scope:'Native decoder, tiny generated PNGs and loopback network only; not full scene/art QA',browser:browser.version(),results},null,2));
 if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
