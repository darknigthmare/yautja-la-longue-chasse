import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {reportGithubActionsFailure} from './lib/github-actions-annotation.mjs';

// The actual current Worker, in native Chromium, starts with empty route caches.
// The checkpoint was produced by the carrying and guided journey in V113.
// This isolates the planner; it is not the Next page or a keyboard playthrough.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const outputRoot = path.resolve(process.env.YAUTJA_ROUTE_WORKER_QA_OUTPUT ?? 'outputs/qa-homeworld-route-worker-v113');
await fs.mkdir(outputRoot, {recursive:true});
const output = await fs.mkdtemp(path.join(outputRoot, 'run-'));
const fixtureFile = path.join(root, 'tests/fixtures/homeworld-return-route-v113.json');
const baselineDir = process.env.YAUTJA_ROUTE_WORKER_BASELINE_DIR;
const sampleCount = Number(process.env.YAUTJA_ROUTE_WORKER_SAMPLES ?? 1);
assert(Number.isInteger(sampleCount) && sampleCount >= 1 && sampleCount <= 5);
const sourceNames = ['homeworldNavigationV77.ts', 'homeworldNavigationV99.ts', 'homeworldNavigationV109.ts', 'homeworldWayfindingV111.ts', 'homeworldCourtArtV80.ts', 'homeworldCivicDecorV80.ts'];
const sha = value => createHash('sha256').update(value).digest('hex');
const checks = [], errors = [], consoleErrors = [], httpErrors = [], samples = [];
const report = {startedAt:new Date().toISOString(), variant:baselineDir?'baseline':'working-tree', checks, samples,
  errors, consoleErrors, httpErrors, scope:'Native current V111 module Worker with a checkpoint produced by actual V113 carrying and guided movement. Fresh workers and reused workers are measured separately; no Next build, art or FPS claim.'};
let server, browser, context, failure;

async function check(name, action) {
  try {const detail=await action(); checks.push({name,status:'PASS',...detail}); console.log('PASS '+name);}
  catch(error) {checks.push({name,status:'FAIL',error:String(error)}); throw error;}
}

try {
  const fixtureBytes = await fs.readFile(fixtureFile), fixture = JSON.parse(fixtureBytes);
  assert.equal(fixture.provenance.carryTicks, 1421);
  assert.equal(fixture.origin.levelId, '+2');
  assert.equal(fixture.origin.interiorId, 'throne-audience');
  assert.equal(fixture.destinationId, 'cargo-steward-v108');
  report.fixture = {path:path.relative(root,fixtureFile),sha256:sha(fixtureBytes),provenance:fixture.provenance};
  const originals = new Map();
  report.sources = [];
  for(const name of sourceNames) {
    const file = path.join(root,'app/game/systems',name);
    const bytes = await fs.readFile(baselineDir?path.join(baselineDir,name):file);
    report.sources.push({path:path.relative(root,file),sha256:sha(bytes)});
    if(baselineDir) originals.set(file,bytes.toString('utf8'));
  }
  const plugins = baselineDir?[{name:'explicit-baseline-sources',setup(builder){
    builder.onLoad({filter:/homeworld(?:NavigationV(?:77|99|109)|WayfindingV111|CourtArtV80|CivicDecorV80)\.ts$/},args=>{
      const contents=originals.get(args.path);
      if(contents===undefined) throw new Error('Unrecognized baseline source '+args.path);
      return {contents,loader:'ts'};
    });
  }}]:[];
  const options = {bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,
    define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins};
  const worker = await build({...options,entryPoints:[path.join(root,'app/game/homeworldRouteWorkerV111.ts')]});
  const host = await build({...options,stdin:{resolveDir:root,sourcefile:'route-worker-host.ts',loader:'ts',contents:
    `export {homeworldCargoGeometryKeyV109} from './app/game/systems/homeworldNavigationV109';
     export {homeworldRouteResponseCurrentV111,homeworldDestinationKeyV109,homeworldRouteGuidanceV111} from './app/game/systems/homeworldWayfindingV111';
     export {homeworldAtlasTargetV83} from './app/game/systems/homeworldAtlasLandmarksV83';
     export {homeworldAtlasLandmarksV111} from './app/game/systems/homeworldObjectivesV111';
     export {normalizeHomeworldCargoV108} from './app/game/systems/homeworldCargoLedgerV108';`}});
  report.bundles = {workerSha256:sha(worker.outputFiles[0].contents),hostSha256:sha(host.outputFiles[0].contents),minified:true,target:'es2022'};
  server = http.createServer((req,res)=>{
    if(req.url==='/worker.js'||req.url==='/host.js') {
      res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
      res.end(req.url==='/worker.js'?worker.outputFiles[0].contents:host.outputFiles[0].contents);
    } else if(req.url==='/') {
      res.writeHead(200,{'Content-Type':'text/html'});
      res.end('<!doctype html><meta charset="utf-8"><title>Homeworld route Worker QA</title><link rel="icon" href="data:,"><script type="module">import * as api from "/host.js"; window.routeWorkerQA=api;</script>');
    } else {res.writeHead(404);res.end('Not found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin = 'http://127.0.0.1:'+server.address().port;
  const executable = process.env.CHROMIUM_EXECUTABLE_PATH ?? process.env.AUDIT_CHROME_EXECUTABLE;
  browser = await chromium.launch({headless:true,...(executable?{executablePath:executable}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  report.runtime = {node:process.version,chromium:browser.version(),playwright:require('playwright-core/package.json').version,esbuild:require('esbuild/package.json').version};
  context = await browser.newContext({viewport:{width:960,height:720},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page = await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='error')consoleErrors.push(entry.text());});
  page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
  await page.goto(origin,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.routeWorkerQA);
  for(let index=0;index<sampleCount;index++) {
    console.log('START native Worker sample '+(index+1));
    const result = await page.evaluate(async fixture=>{
      const api=window.routeWorkerQA, before=JSON.stringify(fixture.save);
      if(!api.normalizeHomeworldCargoV108(fixture.save.homeworld.cargoV108)) throw Error('Invalid carried-and-parked checkpoint');
      const geometryKey=api.homeworldCargoGeometryKeyV109(fixture.save.homeworld.cargoV108);
      const destinationKey=api.homeworldDestinationKeyV109(api.homeworldAtlasTargetV83(api.homeworldAtlasLandmarksV111(fixture.save),fixture.destinationId));
      const request={ownerCreatedAt:fixture.save.createdAt,destinationId:fixture.destinationId,origin:fixture.origin,geometryKey,destinationKey};
      const payload={save:fixture.save,origin:fixture.origin,destinationId:fixture.destinationId,geometryKey};
      const worker=new Worker('/worker.js',{type:'module'});
      const ask=message=>new Promise((resolve,reject)=>{
        const start=performance.now();
        const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('message',receive);worker.removeEventListener('error',failed);worker.removeEventListener('messageerror',failed);};
        const receive=event=>{cleanup();resolve({data:event.data,elapsedMs:performance.now()-start});};
        const failed=event=>{cleanup();reject(Error(event.message??'Worker message could not be decoded'));};
        const timer=setTimeout(()=>{cleanup();reject(Error('Native Worker exceeded the 60-second safety deadline'));},60000);
        worker.addEventListener('message',receive);worker.addEventListener('error',failed);worker.addEventListener('messageerror',failed);
        worker.postMessage(message);
      });
      try {
        const cold=await ask(payload), warm=await ask(payload);
        const invalid=await ask({...payload,geometryKey:geometryKey+':outdated'});
        const recovered=await ask(payload);
        const plan=cold.data.plan;
        return {cold,warm,invalid,recovered,savePreserved:JSON.stringify(fixture.save)===before,
          hostAccepts:!!plan&&api.homeworldRouteResponseCurrentV111(request,plan,fixture.save,fixture.origin),
          initialGuidance:plan?api.homeworldRouteGuidanceV111(plan,fixture.origin,fixture.save)?.state:null};
      } finally {worker.terminate();}
    },fixture);
    const label='Worker '+(index+1);
    await check(label+' returns the cargo-aware route from the audience to the port',()=>{
      assert.equal(result.cold.data.error,undefined);assert.equal(result.cold.data.plan?.status,'reachable');
      assert.equal(result.cold.data.plan.destinationId,fixture.destinationId);
      assert.deepEqual(result.cold.data.plan.stages.filter(s=>s.kind==='connector').map(s=>s.connectorId),['acropolis-stair','clan-lift']);
      assert.equal(result.hostAccepts,true);assert.equal(result.initialGuidance,'walking');assert.equal(result.savePreserved,true);
    });
    await check(label+' repeats in the same Worker without changing the full plan',()=>assert.deepEqual(result.warm.data,result.cold.data));
    await check(label+' rejects an outdated ground snapshot and recovers on the next valid request',()=>{
      assert.equal(typeof result.invalid.data.error,'string');assert.equal(result.invalid.data.plan,undefined);
      assert.deepEqual(result.recovered.data,result.cold.data);
    });
    samples.push({coldMs:result.cold.elapsedMs,warmMs:result.warm.elapsedMs,recoveredMs:result.recovered.elapsedMs,
      invalidSnapshotMs:result.invalid.elapsedMs,planSha256:sha(JSON.stringify(result.cold.data.plan)),plan:result.cold.data.plan});
  }
  await check('No browser, console or HTTP errors',()=>{assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(httpErrors,[]);});
  const sorted=samples.map(s=>s.coldMs).sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  report.coldMedianMs=sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
} catch(error) {
  failure=error;report.failure=String(error);reportGithubActionsFailure('Homeworld route Worker V113 QA',error);console.error(error);
} finally {
  await context?.close();await browser?.close();
  if(server?.listening) await new Promise(resolve=>server.close(resolve));
  report.status=failure?'FAIL':'PASS';report.completedAt=new Date().toISOString();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Report: '+path.join(output,'report.json'));
}
if(failure) process.exitCode=1;
