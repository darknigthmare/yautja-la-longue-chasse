#!/usr/bin/env node
/** Native React controls + actual HuntCanvas functions in a bounded browser fixture.
 * No campaign victory, real device or artwork qualification is inferred.
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
import {runAccessibilityBrowserV112} from './lib/qa-hunt-accessibility-v112.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'outputs/qa-hunt-v112');
await fs.mkdir(out,{recursive:true});
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/hunt-mechanics-v112.fixture.jsx'],
 bundle:true,write:false,jsx:'automatic',platform:'browser',outfile:'fixture.js',logLevel:'silent',
 plugins:[{name:'actual-hunt-runtime-test-exports',setup(builder){
  builder.onResolve({filter:/^hunt-runtime-v112$/},()=>({path:'actual-native-runtime',namespace:'v112-native'}));
  builder.onLoad({filter:/.*/,namespace:'v112-native'},async()=>{
   const source=await fs.readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8');
   const ast=ts.createSourceFile('HuntCanvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   let arrow;const visit=node=>{
    if(!arrow&&ts.isBinaryExpression(node)&&node.left.getText(ast)==='riteMenuActionRef.current'&&ts.isArrowFunction(node.right)&&node.right.parameters.length===1)arrow=node.right;
    ts.forEachChild(node,visit);
   };visit(ast);assert.ok(arrow,'The actual production rite menu action must be exercised');
   return{loader:'tsx',resolveDir:path.join(root,'app/game'),contents:source+'\n'+
    'export const __huntRuntimeQaV112={makeGameState,makeEnemy,damageEnemy,updatePlayer,updateHuntRitesV77,riteContextV77,huntRiteMenuSnapshotV77,riteRuntimeOptionsV112,renderGame,pollGamepad,HUNT_CONTROL_ACTIONS,isHeldKeyboardAction,VIEW_WIDTH,VIEW_HEIGHT};\n'+
    'export {MISSION_BY_ID} from "./data"; export {ENEMY_TROPHY_GAMEPLAY_V18_ASSETS} from "./enemyTrophyGameplayV18";\n'+
    'export function __runRiteMenuQaV112(game,mission,action){const setUi=()=>{};const emitPersistence=()=>{};const persistHuntRef={current:null};const handler='+arrow.getText(ast)+';return handler(action);}\n'+
    'import {MISSION_BY_ID as __missionsQaV112} from "./data"; import {ENEMY_TROPHY_GAMEPLAY_V18_ASSETS as __trophiesQaV112} from "./enemyTrophyGameplayV18";Object.assign(__huntRuntimeQaV112,{MISSION_BY_ID:__missionsQaV112,ENEMY_TROPHY_GAMEPLAY_V18_ASSETS:__trophiesQaV112});'};
  });
 }}]});
const javascript=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));
assert.ok(javascript);
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qualification chasse V112</title><link rel="stylesheet" href="/fixture.css"><style>body{margin:0;background:#111a18;color:#e7eee6;font:16px system-ui}main{max-width:1120px;margin:auto;padding:16px;box-sizing:border-box}main>header p{font-size:13px;color:#b1c4ba}h1{font-size:20px}button,select,input{font:inherit}button{min-height:44px;cursor:pointer}nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}canvas{width:100%;height:auto;border:1px solid #789282;display:block;outline-offset:4px}section{box-sizing:border-box}button:focus-visible,select:focus-visible,canvas:focus-visible{outline:3px solid #f4d88b}</style><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
  else if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(javascript.contents);}
  else if(req.url==='/fixture.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css?.contents??'');}
  else if(/^\/game\/ui\/v112\/[a-z0-9-]+\.svg$/.test(req.url??'')){const bytes=await fs.readFile(path.join(root,'public',req.url.slice(1)));res.writeHead(200,{'Content-Type':'image/svg+xml'});res.end(bytes);}
  else{res.writeHead(404);res.end();}
 }catch{res.writeHead(404);res.end();}
});
let browser;const results=[],errors=[],captures=[];
const scenario=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:String(error.stack??error)});}};
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();assert.ok(address&&typeof address==='object');
 browser=await chromium.launch(process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{});
 const page=await browser.newPage({viewport:{width:1120,height:850}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+address.port+'/');await page.bringToFront();
 await page.waitForFunction(()=>!!window.__huntMechanicsQaV112?.settings());
 const paint=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const reset=async()=>{await page.evaluate(()=>window.__huntMechanicsQaV112.reset());await paint();};
 const show=async(name)=>{await page.evaluate(value=>window.__huntMechanicsQaV112.show(value),name);await paint();};
 const capture=async(name)=>{
  const png=await sharp(await page.screenshot({animations:'disabled'})).resize({width:Math.min(720,page.viewportSize().width),withoutEnlargement:true}).png({palette:true,colours:48}).toBuffer();
  assert.ok(png.length<=90000,'Bounded inline capture');
  await fs.writeFile(path.join(out,name+'.png'),png);captures.push({file:name+'.png',bytes:png.length,nativeExcelExecuted:false});
  console.log('V112_CAPTURE_BEGIN:'+name+':'+png.toString('base64')+':V112_CAPTURE_END');
 };
 await scenario('real accessibility controls, remapping, readable guide and narrow viewport',async()=>{
  const checks=await runAccessibilityBrowserV112(page);if(Array.isArray(checks))for(const check of checks)results.push(typeof check==='string'?{name:check,status:'PASS'}:check);
 });
 await reset();await page.setViewportSize({width:390,height:844});await show('accessibility');await capture('accessibility-phone');
 await page.setViewportSize({width:1120,height:850});await reset();await show('workshop');
 await scenario('denied write leaves the actual conservation panel and stock unconfirmed',async()=>{
  await page.evaluate(()=>window.__huntMechanicsQaV112.failWrites=true);
  await page.getByRole('button',{name:/^Nettoyer ·/}).click();await paint();
  const save=await page.evaluate(()=>window.__huntMechanicsQaV112.save());
  assert.equal(save.profile.clanMarks,50);assert.equal(save.inventory.harvestV112.jobs.length,0);
  assert.match(await page.getByRole('status').textContent(),/non confirmé/);
  await page.evaluate(()=>window.__huntMechanicsQaV112.failWrites=false);
 });
 await scenario('actual panel drives all four persistent manual stages exactly once',async()=>{
  for(const [label,units] of [['Nettoyer',3],['Traiter',4],['Sécher',5],['Monter',3]]){
   await page.getByRole('button',{name:new RegExp('^'+label+' ·')}).click();await paint();
   const before=await page.evaluate(()=>window.__huntMechanicsQaV112.save());
   assert.equal(before.inventory.harvestV112.jobs.filter(j=>j.status==='active').length,1);
   for(let unit=0;unit<units;unit++){await page.getByRole('button',{name:/^Effectuer un geste ·/}).click();await paint();}
   const after=await page.evaluate(()=>window.__huntMechanicsQaV112.save());
   assert.equal(after.inventory.harvestV112.jobs.filter(j=>j.status==='active').length,0);
   if(label==='Nettoyer')await capture('workshop-cleaned');
  }
  const final=await page.evaluate(()=>window.__huntMechanicsQaV112.save());
  assert.equal(final.profile.clanMarks,36);assert.equal(final.inventory.harvestV112.specimens[0].stage,'mounted');
  assert.equal(final.inventory.harvestV112.jobs.length,4);assert.equal(final.inventory.harvestV112.specimens[0].quality,86);
 });
 await scenario('free sharpening and explicit counted reserve preserve possession',async()=>{
  await page.getByRole('button',{name:'Affûter gratuitement',exact:true}).click();await paint();
  assert.ok(await page.getByRole('button',{name:'Affûter gratuitement',exact:true}).isDisabled());
  await page.getByRole('button',{name:/^Ranger en réserve ·/}).click();await paint();
  const save=await page.evaluate(()=>window.__huntMechanicsQaV112.save());
  assert.equal(save.inventory.harvestV112.toolCondition,100);assert.equal(save.profile.clanMarks,36);
  assert.equal(save.inventory.harvestV112.specimens.length,0);assert.equal(save.inventory.harvestV112.archive[0].count,1);
  assert.equal(save.inventory.harvestV112.archive[0].qualityTotal,86);
 });
 await reset();await page.evaluate(()=>window.__huntMechanicsQaV112.resetRites());await paint();
 await scenario('actual corpse menu starts, interrupts and completes the native flaying operation',async()=>{
  await page.getByRole('button',{name:'Examiner la proie vaincue',exact:true}).click();await paint();
  await capture('corpse-rites');
  await page.getByRole('button',{name:/^Dépecer ·/}).click();await paint();
  assert.equal((await page.evaluate(()=>window.__huntMechanicsQaV112.state())).operation.action,'flay');
  await page.evaluate(()=>window.__huntMechanicsQaV112.tick(40));await paint();
  await page.getByRole('button',{name:'Interrompre le geste',exact:true}).click();await paint();
  const interrupted=await page.evaluate(()=>window.__huntMechanicsQaV112.state());assert.equal(interrupted.operation,null);assert.equal(interrupted.corpses[0].flayed,false);
  await page.getByRole('button',{name:'Examiner la proie vaincue',exact:true}).click();await page.getByRole('button',{name:/^Dépecer ·/}).click();
  await page.evaluate(()=>window.__huntMechanicsQaV112.tick(900));await paint();
  const completed=await page.evaluate(()=>window.__huntMechanicsQaV112.state());assert.equal(completed.operation,null);assert.equal(completed.corpses[0].flayed,true);
 });
 for(const device of ['keyboard','touch','gamepad'])await scenario(device+': native input path pumps and releases the real canopy pendulum',async()=>{
  await page.evaluate(()=>window.__huntMechanicsQaV112.resetCanopy());await paint();
  await page.getByLabel('Simulation native de chasse',{exact:true}).focus();
  await page.evaluate(()=>window.__huntMechanicsQaV112.tick(1));
  if(device==='keyboard')await page.keyboard.down('ArrowRight');
  else if(device==='touch'){await page.getByRole('button',{name:'QA Droite',exact:true}).hover();await page.mouse.down();}
  else await page.evaluate(()=>window.__huntMechanicsQaV112.pad('right',true));
  await page.evaluate(()=>window.__huntMechanicsQaV112.tick(30));await paint();
  const attached=await page.evaluate(()=>window.__huntMechanicsQaV112.state());
  assert.ok(attached.player.canopySwing);assert.ok(attached.player.canopySwing.angle>0);assert.ok(attached.player.stamina<100);
  if(device==='keyboard'){await page.keyboard.down('Space');}
  else if(device==='touch'){await page.mouse.up();await page.getByRole('button',{name:'QA Saut',exact:true}).hover();await page.mouse.down();}
  else await page.evaluate(()=>window.__huntMechanicsQaV112.pad('jump',true));
  await page.evaluate(()=>window.__huntMechanicsQaV112.tick(1));await paint();
  const released=await page.evaluate(()=>window.__huntMechanicsQaV112.state());
  assert.equal(released.player.canopySwing,null);assert.equal(released.player.climbing,false);assert.ok(released.player.velocityX>0);
  if(device==='keyboard'){await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');}
  else if(device==='touch')await page.mouse.up();
  else {await page.evaluate(()=>{window.__huntMechanicsQaV112.pad('right',false);window.__huntMechanicsQaV112.pad('jump',false);});}
  if(device==='keyboard')await capture('canopy-native-release');
 });
 assert.deepEqual(errors,[]);
 const report={schemaVersion:1,release:'V112',runtimeCommit:process.env.GITHUB_SHA??'unrecorded-local',scope:'Actual components and source functions in a fixture; localStorage acknowledgement, emulated controller and fallback renderer; no full campaign or physical device qualification',results,errors,captures};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 assert.ok(results.length>=8);assert.equal(results.filter(row=>row.status!=='PASS').length,0);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
