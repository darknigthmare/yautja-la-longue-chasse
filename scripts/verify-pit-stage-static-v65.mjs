import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
// Isolated actual renderer, real native PNGs, explicit fixture cameras; application QA is separate.
const root=process.cwd(),output=path.resolve(process.env.V65_STATIC_QA_OUTPUT??'work-local/v65/qa/stages/renderer');
const temporary=path.resolve(process.env.V65_STATIC_QA_TEMP??'work-local/v65/browser-temp');
await fs.mkdir(output,{recursive:true});await fs.mkdir(temporary,{recursive:true});process.env.TEMP=temporary;process.env.TMP=temporary;
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['app/game/pitStageCompositionV65.ts','app/game/data/pitStageCompositionV65.json','app/game/pitArenaProduction.ts','app/game/pitArenaRendering.ts','scripts/verify-pit-stage-static-v65.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,sha(await fs.readFile(f))])));
const before=await hashes(),data=JSON.parse(await fs.readFile(sourceFiles[1],'utf8'));
const requested=(process.argv[2]??'all').split(','),targets=data.stages.filter(s=>requested.includes('all')||requested.includes(s.stageId)||requested.includes(String(Number(s.stageId.split('-')[1]))));assert(targets.length);
const bundle=await build({stdin:{contents:`export * from './app/game/pitArenaRendering';export * from './app/game/pitCombatBitmapArt';export {createPitCombatState,serializePitCombat,PIT_ARENAS} from './app/game/systems/pitCombat';export {PIT_ARENA_PRODUCTION_MANIFEST} from './app/game/pitArenaProduction';`,resolveDir:root},bundle:true,write:false,platform:'browser',format:'iife',globalName:'api',logLevel:'silent'});
const html='<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V65 compositor</title><style>body{margin:0;background:#090d0e}canvas{display:block;max-width:100%;height:auto}</style><canvas width="960" height="540"></canvas><script src="/bundle.js"></script></html>';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));if(!url.pathname.startsWith('/game/')||!file.startsWith(path.resolve(root,'public')+path.sep)){res.writeHead(403);res.end();return;}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const reports=[];
const cameras=[['center',{}],['left',{centerX:280,zoom:1.45,positions:[110,220]}],['right',{centerX:680,zoom:1.45,positions:[740,850]}],['wide',{zoom:.8,positions:[100,860]}],['high-jump',{centerY:220,zoom:.8}],['low-camera',{centerY:340,zoom:.8}],['close',{centerY:275,zoom:1.55}],['actual-camera',{centerX:479.46,centerY:362,zoom:1.5887}],['reduced',{reducedMotion:true,zoom:.9}],['high-contrast',{highContrast:true}]];
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const entry of targets){
  const directory=path.join(output,entry.stageId);await fs.mkdir(directory,{recursive:true});const errors=[],failures=[],captures=[],checks=[];
  page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.on('requestfailed',r=>failures.push({url:r.url(),reason:r.failure()?.errorText}));
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  const loaded=await page.evaluate(async entry=>{
   const stage=api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.catalogueId===entry.stageId),id=stage.legacyRuntimeArenaId??stage.runtimeExtension.arenaId;
   const bank=await api.loadPitArenaArt(id),fighters=await api.loadPitCombatBitmapArt(['jungle-hunter','city-hunter']);
   window.render=({centerX=480,centerY=270,zoom=1,positions=[330,630],reducedMotion=false,highContrast=false}={})=>{
    const state=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:id});state.frame=240;state.fighters[0].x=positions[0];state.fighters[1].x=positions[1];
    const camera={arenaId:id,centerX,centerY,zoom,targetZoom:zoom,frame:240,mode:'follow'},before=api.serializePitCombat(state),cameraBefore=JSON.stringify(camera);
    const ctx=document.querySelector('canvas').getContext('2d'),calls=[],original=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image?.src){const t=this.getTransform();calls.push({src:new URL(image.src).pathname,args,alpha:this.globalAlpha,matrix:[t.a,t.b,t.c,t.d,t.e,t.f]});}return original.call(this,image,...args);};
    let back,front,drawnFighters,fighterEnd;try{back=api.drawPitArenaBackdrop(ctx,state,camera,bank,{reducedMotion,highContrast});ctx.save();ctx.translate(480-centerX*zoom,270-centerY*zoom);ctx.scale(zoom,zoom);drawnFighters=state.fighters.map(f=>api.drawPitCombatBitmapFighter(ctx,fighters,f,430,{simulationFrame:state.frame,combat:state,highContrast}));ctx.restore();fighterEnd=calls.length;front=api.drawPitArenaForeground(ctx,state,camera,bank,{reducedMotion,highContrast});}finally{ctx.drawImage=original;}
    const floor=api.getPitArenaLayerTransform(id,'P4',camera),groundY=430*floor.scale+floor.translateY;
    const floorPaths=bank.productionKit.planes.find(p=>p.id==='P4').assets.flatMap(a=>a.frames.map(f=>f.path));
    const tiles=calls.filter(c=>floorPaths.includes(c.src)).map(c=>({x:c.args[4],y:c.args[5],w:c.args[6],h:c.args[7]})).sort((a,b)=>a.x-b.x);
    const cuts=[...new Set([Math.max(0,groundY),540,...tiles.flatMap(t=>[t.y,t.y+t.h]).filter(y=>y>Math.max(0,groundY)&&y<540)])].sort((a,b)=>a-b);
    const floorCovered=groundY>=540||cuts.slice(0,-1).every((y,i)=>{let covered=0;const sample=(y+cuts[i+1])/2;for(const t of tiles)if(t.y<=sample+.001&&t.y+t.h>=sample-.001&&t.x<=covered+.001&&t.x+t.w>=covered)covered=Math.max(covered,t.x+t.w);return covered>=960;});
    const native=entry.planes.map(p=>{const a=p.assets[0],expected=a.sourceCrop??a.frames[0].generation.contentBounds;const matches=calls.map((c,i)=>({...c,index:i})).filter(c=>c.src===a.frames[0].path&&c.args.slice(0,4).every((n,i)=>n===[expected.x,expected.y,expected.width,expected.height][i]));return {plane:p.id,count:matches.length,expected:a.placements.length,uniform:matches.every(c=>Math.abs(c.args[6]/c.args[2]-c.args[7]/c.args[3])<1e-6&&c.matrix[0]===c.matrix[3]),frontAfterFighters:p.id!=='P5'||matches.every(c=>c.index>=fighterEnd),draws:matches};});
    return {planes:[...back.drawnPlanes,...front.drawnPlanes],missing:[...back.missingPaths,...front.missingPaths],drawnFighters,unchanged:before===api.serializePitCombat(state)&&cameraBefore===JSON.stringify(camera),groundY,floorCovered,native};
   };return {ready:api.isPitArenaArtBankReady(bank,id),loaded:bank.images.size,requested:bank.requestedPaths.size,failed:[...bank.failedPaths],fightersFailed:[...fighters.failedIds],paths:bank.productionKit?.paths};
  },entry);
  assert(loaded.ready);assert.equal(loaded.loaded,loaded.requested);assert.deepEqual(loaded.failed,[]);assert.deepEqual(loaded.fightersFailed,[]);
  const capture=async name=>{const file=path.join(directory,name+'.png');await page.locator('canvas').screenshot({path:file});captures.push({name,file,sha256:sha(await fs.readFile(file))});};
  for(const [name,options] of cameras){const check=await page.evaluate(options=>window.render(options),options);assert.deepEqual(check.planes,['P0','P1','P2','P3','P4','P5']);assert.deepEqual(check.missing,[]);assert.deepEqual(check.drawnFighters,[true,true]);assert(check.unchanged&&check.floorCovered,`${entry.stageId}/${name}: ground coverage`);assert(check.native.every(n=>n.count===n.expected&&n.uniform&&n.frontAfterFighters),`${entry.stageId}/${name}: native draw/foreground`);checks.push({name,...check});await capture(name);}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.render());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture('mobile-canvas');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);const report={status:'PASS',stageId:entry.stageId,loaded,checks,captures,errors,failures,applicationFlowVerified:false,manualVisualReview:'pending'};
  await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');reports.push({stageId:entry.stageId,status:'PASS',cameraChecks:checks.length,captures:captures.length,report:path.join(directory,'report.json')});console.log(JSON.stringify(reports.at(-1)));await page.close();page=null;
 }
 assert.deepEqual(await hashes(),before,'Source changed during renderer gate');
 const report={status:'PASS',checkedAt:new Date().toISOString(),sourceHashes:before,stages:reports.length,cameraChecks:reports.reduce((n,r)=>n+r.cameraChecks,0),captures:reports.reduce((n,r)=>n+r.captures,0),reports,applicationFlowVerified:false,manualVisualReview:'pending'};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',stages:report.stages,report:path.join(output,'report.json')}));
}catch(error){await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,completed:reports},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
