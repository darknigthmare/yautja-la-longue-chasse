import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';
import {V55_PLAN_PATH,verifyV55StageBytes,measureV55FloorCoverage} from './lib/pit-stage-plan-v55.mjs';

// Renderer qualification is deliberately separate from the real application recipe.
const root=process.cwd(),plan=JSON.parse(await fs.readFile(V55_PLAN_PATH));
const manifest=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json'));
const requested=(process.argv[2]??'all').split(',');
const targets=plan.stages.filter(s=>requested.includes('all')||requested.includes(s.id)||requested.includes(String(s.number)));
assert(targets.length&& (requested.includes('all')||targets.length===requested.length),'Unknown or duplicate target');
const output=path.resolve(process.env.V55_ARENA_QA_OUTPUT??'work/v55/arena-renderer-qa');await fs.mkdir(output,{recursive:true});
const compiled=await build({stdin:{contents:'export * from "./app/game/pitArenaProduction"; export * from "./app/game/pitArenaRendering"; export * from "./app/game/pitCombatBitmapArt"; export {createPitCombatState,serializePitCombat} from "./app/game/systems/pitCombat";',loader:'ts',resolveDir:root},write:false,bundle:true,format:'iife',globalName:'arenaApi',platform:'browser',logLevel:'silent'});
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette renderer THE PIT V55</title><style>body{margin:0;background:#07090c;color:#eee;font:14px system-ui}h1{font:16px system-ui;margin:6px}canvas{display:block;max-width:100%;height:auto}</style><h1>THE PIT · composition modulaire V55 · harnais de recette</h1><canvas width="960" height="540"></canvas><script src="/bundle.js"></script></html>';
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
 if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(compiled.outputFiles[0].contents);return;}
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));
 if(!url.pathname.startsWith('/game/')||!file.startsWith(path.resolve(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const reports=[];
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const spec of targets){
  const stage=manifest.stages.find(s=>s.catalogueId===spec.id&&s.number===spec.number);assert(stage&&stage.planes.every(p=>p.assets.length),'Assemble each complete composition first');
  const nativeImageProof=await verifyV55StageBytes(stage);
  const directory=path.join(output,spec.id);await fs.mkdir(directory,{recursive:true});
  const errors=[],failedRequests=[],scenarios=[],floorEvidence=[];page=await browser.newPage({viewport:{width:960,height:570}});
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failedRequests.push({status:response.status(),url:response.url()});});
  page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  const loaded=await page.evaluate(async({requestedId,contacts})=>{
   const manifest=structuredClone(arenaApi.PIT_ARENA_PRODUCTION_MANIFEST),target=manifest.stages.find(s=>s.catalogueId===requestedId);
   const conceptPreview=!target.runtimeEnabled,arenaId=conceptPreview?'the-pit':requestedId;
   if(conceptPreview){
    if(target.legacyRuntimeStatus!=='concept'||target.legacyRuntimeArenaId!==null||target.runtimeExtension)throw Error('Invalid concept boundary');
    // An isolated geometry proxy cannot unlock the catalogue or write a game save.
    manifest.stages=[{...target,legacyRuntimeArenaId:arenaId,legacyRuntimeStatus:'playable',runtimeEnabled:true},...manifest.stages];
   }
   window.arenaBank=await arenaApi.loadPitArenaArt(arenaId,{productionManifest:manifest});
   window.fighterBank=await arenaApi.loadPitCombatBitmapArt(['jungle-hunter','city-hunter']);
   window.renderScenario=({centerX=480,centerY=270,zoom=1,positions=[330,630],reducedMotion=false,highContrast=false,frame=0}={})=>{
    const state=arenaApi.createPitCombatState('jungle-hunter','city-hunter',{mode:'training',arenaId});state.frame=frame;
    state.fighters[0].x=positions[0];state.fighters[1].x=positions[1];
    const before=arenaApi.serializePitCombat(state),camera={arenaId,centerX,centerY,zoom,targetZoom:zoom,frame,mode:'follow'},cameraBefore=JSON.stringify(camera);
    const context=document.querySelector('canvas').getContext('2d'),drawCalls=[],draw=context.drawImage;
    context.drawImage=function(image,...args){const src=image?.src?new URL(image.src).pathname:'';if(src.includes('/pit-arenas/'))drawCalls.push({src,args});return draw.call(this,image,...args);};
    const options={reducedMotion,highContrast},back=arenaApi.drawPitArenaBackdrop(context,state,camera,window.arenaBank,options);
    context.save();context.translate(480-centerX*zoom,270-centerY*zoom);context.scale(zoom,zoom);
    const fighters=state.fighters.map(f=>arenaApi.drawPitCombatBitmapFighter(context,window.fighterBank,f,430,{simulationFrame:frame,combat:state,highContrast}));context.restore();
    const front=arenaApi.drawPitArenaForeground(context,state,camera,window.arenaBank,options);context.drawImage=draw;
    const ground=arenaApi.getPitArenaLayerTransform(arenaId,'P4',camera),groundScreenY=430*ground.scale+ground.translateY;
    const groundContacts=contacts.flatMap(measurement=>{
     const asset=target.planes.find(p=>p.id===measurement.plane).assets.find(a=>a.id===measurement.assetId);
     const transform=arenaApi.getPitArenaSubplanTransform(arenaId,asset.parallax,camera,reducedMotion);
     const calls=drawCalls.filter(c=>c.src===measurement.path);if(calls.length!==asset.placements.length)throw Error('Contact drawing count mismatch');
     return calls.map((call,index)=>{
      const visibleFoot=call.args[5]+(measurement.visibleBottomExclusive-call.args[1])*call.args[7]/call.args[3];
      const expected=groundScreenY+(measurement.authoredBottoms[index]-430)*transform.scale;
      return {plane:measurement.plane,asset:asset.id,placement:index,visibleFoot,expected,error:Math.abs(visibleFoot-expected)};
     });
    });
    const floorPaths=target.planes.find(p=>p.id==='P4').assets.filter(a=>a.mode==='repeat-x').flatMap(a=>a.frames.map(f=>f.path));
    const floorTiles=drawCalls.filter(c=>floorPaths.includes(c.src)).map(c=>({x:c.args[4],y:c.args[5],width:c.args[6],height:c.args[7]})).sort((a,b)=>a.x-b.x);
    let coveredX=0;
    for(const tile of floorTiles)if(tile.y<=groundScreenY+.001&&tile.y+tile.height>=540-.001&&tile.x<=coveredX+.001&&tile.x+tile.width>=coveredX)coveredX=tile.x+tile.width;
    const floorCoversScreen=groundScreenY>=540||coveredX>=960;
    const hangingPaths=target.planes.flatMap(p=>p.assets).filter(a=>a.mode==='module'&&a.verticalAlign==='top'&&!a.anchorToGround).flatMap(a=>a.frames.map(f=>f.path));
    const hangingProps=drawCalls.filter(c=>hangingPaths.includes(c.src)).map(c=>({path:c.src,top:c.args[5]}));
    const hangingPropsAnchored=hangingProps.every(p=>p.top<=0);
    return {groundScreenY,groundContacts,groundedPropsVerified:groundContacts.every(c=>c.error<.001),floorTiles,floorCoversScreen,hangingProps,hangingPropsAnchored,planes:[...back.drawnPlanes,...front.drawnPlanes],missing:[...back.missingPaths,...front.missingPaths],fighters,unchangedState:before===arenaApi.serializePitCombat(state),unchangedCamera:cameraBefore===JSON.stringify(camera)};
   };
   return {independentKit:Boolean(window.arenaBank.productionKit),images:window.arenaBank.images.size,expectedImages:window.arenaBank.requestedPaths.size,failed:[...window.arenaBank.failedPaths],fighterFailures:[...window.fighterBank.failedIds],decoded:[...window.arenaBank.images].map(([path,image])=>({path,width:image.naturalWidth,height:image.naturalHeight,complete:image.complete})),conceptPreview};
  },{requestedId:spec.id,contacts:stage.contactMeasurements});
  assert(loaded.independentKit&&loaded.images===loaded.expectedImages&&loaded.images===nativeImageProof.length);assert.deepEqual(loaded.failed,[]);assert.deepEqual(loaded.fighterFailures,[]);assert(loaded.decoded.every(i=>i.complete&&i.width>0&&i.height>0));
  for(const asset of stage.planes[4].assets.filter(a=>a.mode==='repeat-x')){
   const evidence=await measureV55FloorCoverage(asset);assert(evidence.minimumRowOpaqueRatio>=.98,'The complete floor must be opaque, not only its contact edge');floorEvidence.push(evidence);
  }assert(floorEvidence.length>0);
  for(const [name,options] of [['center',{}],['close',{zoom:1.55,centerY:275,positions:[410,550]}],['left-corner',{centerX:280,zoom:1.45,positions:[110,220]}],['right-corner',{centerX:680,zoom:1.45,positions:[740,850]}],['wide',{zoom:.8,positions:[100,860]}],['reduced-motion',{zoom:.9,reducedMotion:true,frame:20}],['high-contrast',{highContrast:true}],['next-simulation-frame',{frame:8}]]){
   const result=await page.evaluate(options=>window.renderScenario(options),options);assert.deepEqual(result.planes,['P0','P1','P2','P3','P4','P5']);assert.deepEqual(result.missing,[]);assert.deepEqual(result.fighters,[true,true]);assert(result.unchangedState&&result.unchangedCamera&&result.groundedPropsVerified);assert(result.floorCoversScreen,'Physical floor must cover the viewport below the contact edge in '+spec.id+'/'+name);assert(result.hangingPropsAnchored,'Hanging branches or cables must enter from above the viewport in '+spec.id+'/'+name);
   scenarios.push({name,...result});if(['center','left-corner','right-corner','wide'].includes(name))await page.locator('canvas').screenshot({path:path.join(directory,name+'.png')});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.renderScenario());const mobileNoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(mobileNoOverflow);await page.screenshot({path:path.join(directory,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  const screenshots=['center.png','left-corner.png','right-corner.png','wide.png','mobile.png'],captureHashes={};for(const file of screenshots)captureHashes[file]=createHash('sha256').update(await fs.readFile(path.join(directory,file))).digest('hex');
  const report={result:'PASS',arenaId:spec.id,compositionDigest:arenaCompositionDigest(stage),checkedAt:new Date().toISOString(),surface:'isolated-renderer-with-real-game-fighters-and-images',applicationFlowVerified:false,playablePromotion:false,nativeImageProof,loaded,scenarios,floorEvidence,mobileNoOverflow,errors,failedRequests,screenshots,captureHashes,limit:'Real decoded scenes and eight controlled camera views; not 195 real application duels, hardware or canon certification.'};
  await fs.writeFile(`docs/v55-${spec.id}-renderer-qa.json`,JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');reports.push({arenaId:spec.id,result:'PASS',images:loaded.images,compositionDigest:report.compositionDigest});
  console.log(JSON.stringify(reports.at(-1)));await page.close();page=null;
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),scenes:reports.length,views:reports.length*8,applicationFlowVerified:false,checks:reports},null,2)+'\n');
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),completed:reports},null,2));throw error;
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
