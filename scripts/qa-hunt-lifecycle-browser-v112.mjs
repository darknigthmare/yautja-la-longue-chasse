#!/usr/bin/env node
/** Mounted HuntCanvas lifecycle and production callback/storage bridge.
 * The fixture supplies encounter admission and Apex prerequisites. It does not
 * represent a played campaign, the entire GameClient, artwork or real devices.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
import sharp from 'sharp';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'outputs/qa-hunt-lifecycle-v112');
await fs.mkdir(out,{recursive:true});
function extractCallback(source,name){
 const ast=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name){
  assert.ok(node.initializer&&ts.isCallExpression(node.initializer),name);expression=node.initializer.arguments[0];
 }ts.forEachChild(node,visit);};visit(ast);
 assert.ok(expression&&(ts.isArrowFunction(expression)||ts.isFunctionExpression(expression)),name);
 return expression.getText(ast);
}
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/hunt-lifecycle-v112.fixture.jsx'],
 bundle:true,write:false,jsx:'automatic',platform:'browser',outfile:'fixture.js',logLevel:'silent',
 plugins:[{name:'actual-mounted-hunt-and-callbacks',setup(builder){
  builder.onResolve({filter:/^hunt-lifecycle-(native|callbacks)-v112$/},args=>({path:args.path,namespace:'v112-lifecycle'}));
  builder.onLoad({filter:/.*/,namespace:'v112-lifecycle'},async args=>{
   const resolveDir=path.join(root,'app/game');
   if(args.path==='hunt-lifecycle-native-v112'){
    let source=await fs.readFile(path.join(resolveDir,'HuntCanvas.tsx'),'utf8');
    const marker='    const fixedStep = 1 / 60;';
    assert.equal(source.split(marker).length,2,'One production lifecycle instrumentation point');
    source=source.replace(marker,'    window.__onHuntLifecycleMountV112?.({get game(){return game;},input,get alive(){return alive;}});\n'+marker);
    return{loader:'tsx',resolveDir,contents:source+'\nexport const __qaApiV112={makeEnemy,damageEnemy,createDropShipArrival};\n'};
   }
   const source=await fs.readFile(path.join(resolveDir,'GameClient.tsx'),'utf8');
   const names=['persistSocialProgress','performConservationActionV112','completeMission'];
   const declarations=names.map(name=>'const '+name+'='+extractCallback(source,name)+';').join('\n');
   return{loader:'tsx',resolveDir,contents:
    'import {applyMissionResult,writeSaveWithStatus,reconcileSaveWrite} from "./save";\n'+
    'import {deliverHarvestV112,startConservationV112,workConservationV112,repairFieldToolV112,pauseConservationV112,resumeConservationV112,archiveMountedSpecimenV112} from "./systems/harvestInventoryV112";\n'+
    'export function makeGameClientCallbacksV112(h){\n'+
    'const {saveRef,sessionAliveRef,setSave,setScreen,setToast,setSaveFailure,setLastResult,clearHuntSession}=h;\n'+
    'const screen="trophies",settingsOpen=false,archiveTransferBusy=false,archiveRecoveryIssue=null,campaignSaveBusy=false;\n'+
    'const pendingTrophyCommitRef={current:null},pendingTerminalRunRef={current:null},activeHuntSessionRef={current:null},pendingSocialWriteRef={current:null},missionSettlementRef={current:false};\n'+
    '// Fixture admits one owned encounter; no whole-GameClient session claim.\n'+
    'const checkHuntSessionForSettlement=()=>true,isExplorationMission=()=>false,reconcileHuntWrite=()=>null,explorationWriteFailure=()=>null;\n'+
    'const setPendingHuntResult=value=>{window.__huntLifecycleV112.pendingResult=value;},setHuntResumePayload=()=>{},setHuntRuntimeSave=()=>{},setResumableHunt=()=>{},setLastRewardSummary=()=>{},setSelectedMission=()=>{},playSound=()=>{};\n'+
    declarations+'\nreturn {completeMission,performConservationActionV112,resetSettlement(){missionSettlementRef.current=false;}};\n}'};
  });
 }}]});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));assert.ok(js);
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chasse V112 : cycle monté</title><link rel="stylesheet" href="/fixture.css"><style>body{margin:0;background:#101916;color:#e3e9df;font:15px system-ui}main>header,main>#lifecycle-status{padding:12px}h1{font-size:20px}canvas{max-width:100%;height:auto}button:focus-visible{outline:3px solid #ffdd88}button{cursor:pointer}</style><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
let fallbackRequests=0;
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
  else if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(js.contents);}
  else if(req.url==='/fixture.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css?.contents??'');}
  else if(/^\/game\/ui\/v112\/[a-z0-9-]+\.svg$/.test(req.url??'')){res.writeHead(200,{'Content-Type':'image/svg+xml'});res.end(await fs.readFile(path.join(root,'public',req.url.slice(1))));}
  else{fallbackRequests++;res.writeHead(404);res.end();}
 }catch{res.writeHead(404);res.end();}
});
let browser;const results=[],errors=[],captures=[];
const scenario=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}catch(error){results.push({name,status:'FAIL',error:String(error.stack??error)});console.error('FAIL '+name+': '+error.message);}};
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();assert.ok(address&&typeof address==='object');
 browser=await chromium.launch(process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{});
 const page=await browser.newPage({viewport:{width:1120,height:900}});page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+address.port+'/');await page.bringToFront();
 const state=()=>page.evaluate(()=>window.__huntLifecycleV112.state());
 const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const capture=async name=>{
  const original=await page.screenshot({animations:'disabled'});
  const png=await sharp(original).resize({width:640,withoutEnlargement:true}).png({palette:true,colours:32,dither:0,compressionLevel:9}).toBuffer();
  assert.ok(png.length<=100000);await fs.writeFile(path.join(out,name+'.png'),png);
  captures.push({file:name+'.png',bytes:png.length});console.log('V112_LIFECYCLE_CAPTURE_BEGIN:'+name+':'+png.toString('base64')+':V112_LIFECYCLE_CAPTURE_END');
 };
 await page.waitForFunction(()=>window.__huntLifecycleV112?.runtime&&window.__huntLifecycleV112.state());
 await page.getByRole('button',{name:'Commencer la chasse',exact:true}).waitFor();
 await scenario('mounted briefing owns input and freezes the native simulation until consent',async()=>{
  const before=await state();await page.keyboard.down('ArrowRight');await frame();await page.keyboard.up('ArrowRight');
  const after=await state();assert.equal(after.elapsed,before.elapsed);assert.equal(after.player.x,before.player.x);
  await page.getByRole('button',{name:'Commencer la chasse',exact:true}).click();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().elapsed>0);
 });
 await scenario('actual window keyboard handlers and rAF move, then release the hunter',async()=>{
  await page.locator('canvas').first().focus();const before=await state();await page.keyboard.down('ArrowRight');
  await page.waitForFunction(x=>window.__huntLifecycleV112.state().player.x>x+12,before.player.x);
  await page.keyboard.up('ArrowRight');await frame();
  assert.deepEqual((await state()).inputs.keyboard,[]);
 });
 await scenario('actual pointer capture controls, release and pointer cancellation clear held touch',async()=>{
  const right=page.getByRole('button',{name:'Aller à droite',exact:true});await right.scrollIntoViewIfNeeded();
  const box=await right.boundingBox();assert.ok(box);const before=await state();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForFunction(x=>window.__huntLifecycleV112.state().player.x>x+10,before.player.x);
  await page.mouse.up();await frame();assert.deepEqual((await state()).inputs.touch,[]);
  await right.dispatchEvent('pointercancel',{pointerId:1});await frame();assert.deepEqual((await state()).inputs.touch,[]);
 });
 await scenario('mounted polling handles an emulated controller and native disconnection without stale held input',async()=>{
  await page.locator('canvas').first().focus();await frame();const before=await state();
  await page.evaluate(()=>window.__huntLifecycleV112.pad('right',true));
  await page.waitForFunction(x=>window.__huntLifecycleV112.state().player.x>x+10,before.player.x);
  await page.evaluate(()=>window.__huntLifecycleV112.disconnect());
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().paused);
  assert.deepEqual((await state()).inputs.gamepad,[]);
  await page.evaluate(()=>window.__huntLifecycleV112.reconnect());await page.getByRole('button',{name:'Reprendre',exact:true}).click();
  await page.waitForFunction(()=>!window.__huntLifecycleV112.state().paused);
 });
 await scenario('actual blur listener pauses, persists and clears keyboard state until explicit resume',async()=>{
  await page.locator('canvas').first().focus();await page.keyboard.down('ArrowRight');await frame();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('ArrowRight');
  const before=await state();assert.equal(before.paused,true);assert.deepEqual(before.inputs.keyboard,[]);
  await frame();const after=await state();assert.equal(after.elapsed,before.elapsed);
  assert.ok(await page.evaluate(()=>window.__huntLifecycleV112.persisted.length>0));
  await page.getByRole('button',{name:'Reprendre',exact:true}).click();
  await page.waitForFunction(()=>!window.__huntLifecycleV112.state().paused);
 });
 await scenario('actual unmount cancels the frame and removes old native listeners',async()=>{
  await page.evaluate(()=>window.__huntLifecycleV112.unmount());await frame();
  const before=await page.evaluate(()=>window.__huntLifecycleV112.oldState());assert.equal(before.alive,false);
  await page.keyboard.down('ArrowRight');await frame();await page.keyboard.up('ArrowRight');
  assert.deepEqual(await page.evaluate(()=>window.__huntLifecycleV112.oldState()),before);
  await page.evaluate(()=>window.__huntLifecycleV112.remount('rites'));
  await page.getByRole('button',{name:'Commencer la chasse',exact:true}).click();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().elapsed>0);
 });
 await scenario('mounted native menu analyzes, flays and harvests one finite physical source during rAF simulation',async()=>{
  await page.getByRole('button',{name:'Examiner la proie vaincue',exact:true}).click();
  await page.locator('[data-rite-action-v112="analyze"]').click();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().corpses[0]?.analyzed===true);
  await page.locator('[data-rite-action-v112="flay"]').click();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().corpses[0]?.flayed===true);
  const part=page.locator('[data-rite-action-v112^="harvest-"]:not(:disabled)').first();await part.click();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().harvested?.length===1);
  const done=await state();assert.equal(done.corpses.length,1);assert.equal(done.harvested.length,1);assert.equal(done.harvested[0].stage,'raw');
  assert.equal(done.events.filter(id=>id.startsWith('flay:')).length,1);assert.equal(done.events.filter(id=>id.startsWith('harvest-')).length,1);
  await capture('mounted-harvest');
 });
 await scenario('native extraction segment boards through actual input and settles the harvested identity through the unmodified GameClient callback',async()=>{
  const harvested=(await state()).harvested[0];
  await page.evaluate(()=>window.__huntLifecycleV112.prepareExtraction());await page.locator('canvas').first().focus();
  await page.waitForFunction(()=>window.__huntLifecycleV112.state().ship?.phase==='hover',null,{timeout:20000});
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__huntLifecycleV112.result()?.outcome==='success',null,{timeout:20000});
  const check=await page.evaluate(()=>({save:window.__huntLifecycleV112.save(),disk:window.__huntLifecycleV112.disk(),result:window.__huntLifecycleV112.result(),clears:window.__huntLifecycleV112.clears}));
  assert.equal(check.clears,1);assert.equal(check.result.specimensV112.length,1);assert.equal(check.result.specimensV112[0].id,harvested.id);
  assert.equal(check.save.inventory.harvestV112.specimens[0].id,harvested.id);assert.equal(check.disk.inventory.harvestV112.specimens[0].id,harvested.id);
  assert.equal(check.save.inventory.harvestV112.toolCondition,90);
 });
 await scenario('real storage refusal and readback recovery drive the actual station callbacks without double debit',async()=>{
  const before=await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks);
  await page.evaluate(()=>{window.__huntLifecycleV112.failReadback=true;});
  await page.getByRole('button',{name:/^Nettoyer ·/}).click();await frame();
  assert.equal(await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks),before);
  await page.getByRole('button',{name:/^Nettoyer ·/}).click();await frame();
  const after=await page.evaluate(()=>window.__huntLifecycleV112.save());assert.equal(after.profile.clanMarks,before-2);assert.equal(after.inventory.harvestV112.jobs.length,1);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/^Effectuer un geste ·/}).click();
  assert.equal(await page.evaluate(()=>window.__huntLifecycleV112.save().inventory.harvestV112.specimens[0].stage),'cleaned');
 });
 await scenario('native station completes remaining manual phases and survives a fresh document load from production save bytes',async()=>{
  await page.getByRole('button',{name:/^Traiter ·/}).click();
  await page.getByRole('button',{name:/^Effectuer un geste ·/}).click();
  const paid=await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks);
  await page.getByRole('button',{name:/^Suspendre sans perte ·/}).click();
  const paused=await page.evaluate(()=>window.__huntLifecycleV112.save().inventory.harvestV112.jobs.find(j=>j.status==='paused'));
  assert.equal(paused.unitsDone,1);assert.equal(paused.costPaid,4);
  await page.reload();await page.waitForFunction(()=>window.__huntLifecycleV112?.save);
  assert.deepEqual(await page.evaluate(()=>window.__huntLifecycleV112.save().inventory.harvestV112.jobs.find(j=>j.status==='paused')),paused);
  await page.getByRole('button',{name:/^Reprendre sans frais ·/}).click();
  assert.equal(await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks),paid);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/^Effectuer un geste ·/}).click();
  for(const [label,units]of [['Sécher',5],['Monter',3]]){
   await page.getByRole('button',{name:new RegExp('^'+label+' ·')}).click();
   for(let i=0;i<units;i++)await page.getByRole('button',{name:/^Effectuer un geste ·/}).click();
  }
  const before=await page.evaluate(()=>window.__huntLifecycleV112.save());assert.equal(before.inventory.harvestV112.specimens[0].stage,'mounted');
  await capture('mounted-conservation');
  await page.reload();await page.waitForFunction(()=>window.__huntLifecycleV112?.save);
  const after=await page.evaluate(()=>window.__huntLifecycleV112.save());
  assert.deepEqual(after.inventory.harvestV112,before.inventory.harvestV112);assert.equal(after.profile.clanMarks,before.profile.clanMarks);
 });
 await scenario('actual menu hook navigates and confirms with standard bindings, then uses saved workshop remaps',async()=>{
  await page.bringToFront();await frame();
  const repair=page.getByRole('button',{name:'Affûter gratuitement',exact:true});await repair.focus();
  const before=await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(0,true));
  await page.waitForFunction(()=>window.__huntLifecycleV112.save().inventory.harvestV112.toolCondition===100);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(0,false));await frame();
  await page.evaluate(()=>window.__huntLifecycleV112.pad('down',true));await frame();
  await page.evaluate(()=>window.__huntLifecycleV112.pad('down',false));await frame();
  assert.match(await page.evaluate(()=>document.activeElement?.textContent??''),/Ranger en réserve/);
  const standardBack=await page.evaluate(()=>window.__huntLifecycleV112.save().settings.huntAccessibility.gamepadButtons.interact);
  await page.evaluate(index=>window.__huntLifecycleV112.menuPad(index,true),standardBack);
  await page.waitForFunction(()=>window.__huntLifecycleV112.menuBacks===1);
  await page.evaluate(index=>window.__huntLifecycleV112.menuPad(index,false),standardBack);await frame();
  await page.evaluate(()=>{window.__huntLifecycleV112.remapWorkshop();window.__huntLifecycleV112.workshop();});await frame();
  await page.getByRole('button',{name:/^Ranger en réserve ·/}).focus();
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(0,true));await frame();
  assert.equal(await page.evaluate(()=>window.__huntLifecycleV112.save().inventory.harvestV112.archive.length),0);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(0,false));await frame();
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(2,true));
  await page.waitForFunction(()=>window.__huntLifecycleV112.save().inventory.harvestV112.archive.length===1);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(2,false));await frame();
  assert.equal(await page.evaluate(()=>window.__huntLifecycleV112.save().profile.clanMarks),before);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(3,true));
  await page.waitForFunction(()=>window.__huntLifecycleV112.menuBacks===2);
  await page.evaluate(()=>window.__huntLifecycleV112.menuPad(3,false));await frame();
 });
 const report={schemaVersion:1,release:'V112',runtimeCommit:process.env.GITHUB_SHA??'unrecorded-local',scope:'Mounted HuntCanvas and native rAF/window/pointer/pad lifecycle; real death, analysis, flay and anatomy; Apex/mission prerequisites seeded solely before actual shuttle segment; exact GameClient callbacks AST-extracted with fixture session admission, real browser save writer/load/reconciliation and mounted conservation panel with actual useMenuGamepad navigation with default and persisted workshop confirm/back remapping. Entire GameClient, complete campaign, real controller/phone and art remain unqualified.',results,errors,captures,fallbackRequests};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.equal(results.filter(row=>row.status!=='PASS').length,0);assert.equal(results.length,11);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
