/** Smoke the compiled Next server on loopback only. No user save, cloud or deployment is touched. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
assert.equal(pkg.scripts['start:production'],'next start','Next and vinext launchers must be explicit');
const buildId=(await readFile(resolve(root,'.next/BUILD_ID'),'utf8')).trim();
assert.ok(buildId,'Compile with next build --webpack before this smoke test');
const reservation=createServer();
await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
const address=reservation.address();
assert.ok(address&&typeof address==='object');
const port=address.port;
await new Promise((resolve,reject)=>reservation.close(error=>error?reject(error):resolve()));
const child=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{
  cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',YAUTJA_LOCAL_VISUAL_QA_V90:'0'},stdio:['ignore','pipe','pipe'],shell:false,
});
let exited=false,spawnError=null,output='';
const closed=new Promise(resolve=>child.once('close',()=>{exited=true;resolve();}));
child.on('error',error=>{spawnError=error;});
for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{output=(output+bytes.toString()).slice(-24_000);});
const origin=`http://127.0.0.1:${port}`;
try {
  let page=null;
  const deadline=Date.now()+30_000;
  while(Date.now()<deadline&&!page){
    if(spawnError)throw spawnError;
    if(exited)throw Error(`Next exited before readiness. ${output}`);
    try {page=await fetch(origin,{redirect:'manual',signal:AbortSignal.timeout(2_000)});} catch {await delay(100);}
  }
  assert.ok(page,`Next did not become ready. ${output}`);
  assert.equal(page.status,200,`Homepage status. ${output}`);
  assert.match(page.headers.get('content-type')??'',/text\/html/);
  const html=await page.text();
  assert.match(html,/Yautja/,'The compiled game shell must be served');
  const script=html.match(/<script[^>]+src="([^"#]+\.js(?:\?[^"#]*)?)"/);
  assert.ok(script,'A compiled client script must be present');
  const scriptUrl=new URL(script[1].replaceAll('&amp;','&'),origin);
  assert.equal(scriptUrl.origin,origin,'Smoke never follows external script origins');
  assert.ok(scriptUrl.pathname.startsWith('/_next/'));
  const asset=await fetch(scriptUrl,{redirect:'manual',signal:AbortSignal.timeout(5_000)});
  assert.equal(asset.status,200,'The server must serve its compiled JS, not just HTML');
  assert.match(asset.headers.get('content-type')??'',/javascript/);
  await asset.arrayBuffer();
  for(const route of ['/visual-qa-v90','/solo-qa-v92','/clan-war-qa-v92','/gauntlet-qa-v135','/gauntlet-qa-v136']){
    const response=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(5_000)});
    assert.equal(response.status,404,`${route} must remain unavailable without explicit local QA mode`);
    assert.match(response.headers.get('x-robots-tag')??'',/noindex/);
    await response.text();
  }
  console.log(JSON.stringify({scope:'Compiled Next server, homepage, client JS and five protected QA routes; no complete-game/asset qualification',buildId,checks:7,status:'PASS'}));
} finally {
  if(!exited)child.kill('SIGTERM');
  await Promise.race([closed,delay(3_000)]);
  if(!exited){child.kill('SIGKILL');await Promise.race([closed,delay(3_000)]);}
}
