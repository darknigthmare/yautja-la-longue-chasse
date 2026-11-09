#!/usr/bin/env node
/** Actual harvest menu, native callback, anatomies and gamepad polling.
 * Boundary ledgers are declared fixtures, not campaign completion evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.HARVEST_PREVIEW_QA_OUTPUT??'outputs/qa-hunt-harvest-preview-20261109');
const digest=raw=>createHash('sha256').update(raw).digest('hex');
await fs.mkdir(out,{recursive:true});
assert.equal(await fs.access(path.join(out,'browser-verification.json')).then(()=>true,()=>false),false,'Preserve an earlier proof: choose a new HARVEST_PREVIEW_QA_OUTPUT directory.');
const report={schemaVersion:1,startedAt:new Date().toISOString(),checkoutCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 workingTreeDirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0,
 scope:'Actual React HuntRitesMenu and native HuntCanvas callback, rite state, catalogue and emulated gamepad polling. The fixture omits the world renderer and uses disclosed native source-body and bag boundary initial states. No whole HuntCanvas lifecycle, campaign win, physical device, human comprehension or artistic qualification.',
 fixtures:{source:'One actual makeEnemy/damageEnemy hell-hound body; no foe or objective completion claimed.',mass:'Five catalogue iron-croc hides (22kg/15volumes) in a disclosed scout bag (24kg/18volumes).',volume:'Eight catalogue hound hides (19.2kg/24volumes) in a hunter bag (36kg/24volumes).',depot:'Native adapter with no free depot slot; no stock credited.'},
 browserExecuted:false,passed:false,checks:[],errors:[],consoleErrors:[],missingAssets:[],captures:[],contexts:[]};
const fingerprints=async files=>Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await fs.readFile(path.join(root,file)))])));
const sourceFiles=['app/game/HuntCanvas.tsx','app/game/HuntRitesMenuV77.tsx','app/game/HuntRitesMenuV77.module.css','app/game/systems/huntRitesRuntimeV77.ts','app/game/systems/ritesOfHuntV77.ts','app/game/systems/anatomyHarvestV112.ts','app/game/systems/harvestInventoryV112.ts','tests/browser/hunt-harvest-preview-20261109.fixture.jsx','scripts/qa-hunt-harvest-preview-browser-20261109.mjs'];
report.sourceSha256=await fingerprints(sourceFiles);
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/hunt-harvest-preview-20261109.fixture.jsx'],bundle:true,write:false,jsx:'automatic',platform:'browser',outfile:'fixture.js',logLevel:'silent',
 plugins:[{name:'actual-harvest-preview-runtime',setup(builder){
  builder.onResolve({filter:/^harvest-preview-native-runtime$/},()=>({path:'actual-harvest-native-runtime',namespace:'harvest-native'}));
  builder.onLoad({filter:/.*/,namespace:'harvest-native'},async()=>{
   const source=await fs.readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8'),ast=ts.createSourceFile('HuntCanvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   let arrow;const visit=node=>{if(!arrow&&ts.isBinaryExpression(node)&&node.left.getText(ast)==='riteMenuActionRef.current'&&ts.isArrowFunction(node.right)&&node.right.parameters.length===1)arrow=node.right;ts.forEachChild(node,visit);};visit(ast);
   assert.ok(arrow,'The production menu callback must remain the exercised callback.');
   report.productionCallbackSha256=digest(arrow.getText(ast));
   return{loader:'tsx',resolveDir:path.join(root,'app/game'),contents:source+'\nexport const __harvestPreviewRuntime={makeGameState,makeEnemy,damageEnemy,riteContextV77,huntRiteMenuSnapshotV77,riteRuntimeOptionsV112,updateHuntRitesV77,pollGamepad,stepGame,flushCorpseRiteGamepadV112};\nimport {MISSION_BY_ID as __missions} from "./data";Object.assign(__harvestPreviewRuntime,{MISSION_BY_ID:__missions});\nexport function __runHarvestPreviewRite(game,mission,action){const setUi=()=>{};const emitPersistence=()=>{};const persistHuntRef={current:null};const handler='+arrow.getText(ast)+';return handler(action);}\n'};
  });
 }}]});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));assert.ok(js);
report.bundleSha256=digest(js.contents);
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA prélèvement actuel</title><link rel="stylesheet" href="/fixture.css"><style>body{margin:0;background:#101914;color:#f2e4c7;font:16px system-ui}main{max-width:1100px;padding:16px;margin:auto;box-sizing:border-box}h1{font-size:20px}main>p{max-width:900px;line-height:1.45}button:focus-visible,canvas:focus-visible{outline:3px solid #f4d88b}</style><div id="root"></div><script src="/fixture.js"></script></html>';
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
  else if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(js.contents);}
  else if(req.url==='/fixture.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css?.contents??'');}
  else if(req.url==='/favicon.ico'){res.writeHead(204);res.end();}
  else if(req.url==='/game/ui/v112/field-harvest-symbols.svg'){res.writeHead(200,{'Content-Type':'image/svg+xml'});res.end(await fs.readFile(path.join(root,'public/game/ui/v112/field-harvest-symbols.svg')));}
  else{res.writeHead(404);res.end();}
 }catch{res.writeHead(404);res.end();}
});
let browser;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});report.browserVersion=browser.version();
 const address=server.address();assert.ok(address&&typeof address==='object');
 for(const viewport of [{width:1120,height:1000},{width:390,height:844},{width:320,height:740}]){
  const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),id=viewport.width+'x'+viewport.height;
  page.on('pageerror',error=>report.errors.push({context:id,message:error.message}));
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({context:id,message:message.text()});});
  page.on('response',response=>{if(response.status()>=400)report.missingAssets.push({context:id,status:response.status(),url:response.url()});});
  page.setDefaultTimeout(15000);await page.goto('http://127.0.0.1:'+address.port+'/');await page.bringToFront();await page.waitForFunction(()=>!!window.__harvestPreviewQa?.state);
  report.browserExecuted=true;report.contexts.push({viewport,input:viewport.width<600?'emulated touch plus emulated standard gamepad':'mouse plus emulated standard gamepad',physicalDevice:false});
  const paint=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const state=()=>page.evaluate(()=>window.__harvestPreviewQa.state());
  const invoke=async(method,...args)=>{await page.evaluate(({method,args})=>window.__harvestPreviewQa[method](...args),{method,args});await paint();};
  const click=control=>viewport.width<600?control.tap():control.click();
  const action=name=>page.locator('[data-rite-action-v112="'+name+'"]');
  const check=(name,detail={})=>report.checks.push({context:id,name,passed:true,...detail});
  const capture=async(name)=>{const file=id+'-'+name+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});const raw=await fs.readFile(path.join(out,file));report.captures.push({file,bytes:raw.length,sha256:digest(raw),nativeFullPage:true});};
  const open=async(scenario='empty')=>{await invoke('reset',scenario);await click(page.getByRole('button',{name:'Examiner la proie vaincue',exact:true}));await paint();};
  const flay=async()=>{await click(action('flay'));await invoke('tick',1200);assert.equal((await state()).rites.corpses[0].flayed,true);};
  await open();
  assert.equal((await state()).menu.canAnalyze,true);assert.equal(await action('analyze').isEnabled(),true);
  await page.locator('[data-harvest-capacity-v112]').waitFor({state:'visible'});
  const empty=(await state()).menu;assert.equal(empty.fieldLoad.massKg,0);assert.equal(empty.fieldLoad.volumeUnits,0);assert.equal(empty.fieldLoad.capacityMassKg,36);assert.equal(empty.fieldLoad.capacityVolumeUnits,24);
  await capture('capacity-before-action');
  await flay();
  const hide=(await state()).menu.parts.find(part=>part.action==='harvest-hide');assert.equal(hide.massKg,2.4);assert.equal(hide.volumeUnits,3);assert.equal(hide.projectedLoad.massKg,2.4);assert.equal(hide.projectedLoad.volumeUnits,3);
  const preview=action('harvest-hide').locator('..').locator('[data-harvest-preview-v112]');await preview.scrollIntoViewIfNeeded();assert.match(await preview.innerText(),/2[,.]4\s*kg/);assert.match(await preview.innerText(),/3\s*volume/i);assert.equal(await action('harvest-hide').isEnabled(),true);assert.ok((await action('harvest-hide').getAttribute('aria-describedby')).split(/\s+/).includes(await preview.getAttribute('id')));
  check('catalogue mass, volume and real bag projection are visible before harvesting',{preview:await preview.innerText()});await capture('available-preview');
  const quality=hide.quality;await click(action('harvest-hide'));await invoke('tick',1500);let after=await state();assert.equal(after.rites.specimensV112.length,1);assert.equal(after.rites.specimensV112[0].quality,quality);assert.equal(after.menu.canAnalyze,false);assert.match(after.menu.analysisLockedReason,/analys|prélèvement/i);assert.equal(await action('analyze').isDisabled(),true);
  const reason=page.locator('[data-rite-analysis-reason-v112]');await reason.scrollIntoViewIfNeeded();assert.ok((await reason.innerText()).length>15);const reasonId=await reason.getAttribute('id');assert.ok(reasonId);assert.ok((await action('analyze').getAttribute('aria-describedby')).split(/\s+/).includes(reasonId));
  check('first real harvest locks analysis with a visible accessible reason and preserves assigned quality',{quality,reason:await reason.innerText()});await capture('analysis-locked');
  await page.getByLabel('Entrée native du menu de prélèvement',{exact:true}).focus();await invoke('nativeTick',1);
  const focused=[];
  for(let i=0;i<12;i++){await invoke('pad','down',true);await invoke('nativeTick',1);await invoke('pad','down',false);await invoke('nativeTick',1);focused.push(await page.evaluate(()=>({action:document.activeElement?.getAttribute('data-rite-action-v112'),disabled:!!document.activeElement?.disabled})));}
  assert.ok(focused.some(item=>item.action));assert.ok(focused.every(item=>item.action!=='analyze'&&!item.disabled));assert.equal((await state()).rites.specimensV112[0].quality,quality);
  check('native gamepad polling skips unavailable analysis rather than focusing a disabled action',{focused});
  for(const scenario of ['mass','volume','depot']){
   await open(scenario);await flay();const snapshot=(await state()).menu,part=snapshot.parts.find(item=>item.action==='harvest-hide');assert.equal(part.available,false);assert.equal(await action('harvest-hide').isDisabled(),true);assert.ok(part.reason);
   if(scenario==='mass'){assert.equal(snapshot.fieldLoad.massKg,22);assert.equal(snapshot.fieldLoad.volumeUnits,15);assert.equal(part.projectedLoad.massKg,24.4);assert.equal(part.projectedLoad.volumeUnits,18);assert.match(part.reason,/masse|poids/i);}
   if(scenario==='volume'){assert.ok(Math.abs(snapshot.fieldLoad.massKg-19.2)<1e-8);assert.equal(snapshot.fieldLoad.volumeUnits,24);assert.match(part.reason,/volume/i);}
   if(scenario==='depot')assert.match(part.reason,/dépôt/i);
   const why=action('harvest-hide').locator('..').locator('[data-harvest-preview-v112]');await why.scrollIntoViewIfNeeded();assert.ok((await why.innerText()).includes(part.reason));
   const before=JSON.stringify((await state()).rites.specimensV112);await action('harvest-hide').evaluate(button=>button.click());await paint();assert.equal(JSON.stringify((await state()).rites.specimensV112),before);
   check(scenario+': exact capacity refusal is visible before click and disabled DOM action cannot change stock',{reason:part.reason,load:snapshot.fieldLoad,projection:part.projectedLoad});await capture(scenario+'-refusal');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.missingAssets,[]);assert.deepEqual(await fingerprints(sourceFiles),report.sourceSha256,'Evidence sources changed while this recipe was running.');report.passed=true;
}catch(error){report.failure=error.stack??String(error);process.exitCode=1;}
finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,'browser-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,browserExecuted:report.browserExecuted,checks:report.checks.length,captures:report.captures.length,failure:report.failure,output:out},null,2));}
