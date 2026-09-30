import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {V60_PLAN,V60_LIFE,v60CompositionDigest,verifyV60StageBytes} from './lib/pit-stage-plan-v60.mjs';
import {measureV55FloorCoverage} from './lib/pit-stage-plan-v55.mjs';

const root=process.cwd(),plan=JSON.parse(await fs.readFile(V60_PLAN)),lifeManifest=JSON.parse(await fs.readFile(V60_LIFE));
const manifest=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json'));
const requested=(process.argv[2]??'ready').split(',');
const targets=plan.stages.filter(s=>(requested.includes('all')||requested.includes('ready')||requested.includes(s.id)||requested.includes(String(s.number)))&&manifest.stages.some(a=>a.catalogueId===s.id));
assert(targets.length,'No assembled stage ready for renderer qualification');
if(!requested.includes('ready'))assert(requested.includes('all')?targets.length===plan.stages.length:targets.length===requested.length,'Requested stage has not been assembled');
const output=path.resolve(process.env.V60_STAGE_QA_OUTPUT??'work-local/v60/qa/renderer');await fs.mkdir(output,{recursive:true});
const temp=path.resolve('work-local/v60/browser-temp');await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const compiled=await build({stdin:{contents:'export * from "./app/game/pitArenaProduction";export * from "./app/game/pitArenaRendering";export * from "./app/game/pitCombatBitmapArt";export * from "./app/game/pitStageLifeDirectorV60";export {createPitCombatState,serializePitCombat} from "./app/game/systems/pitCombat";',resolveDir:root},write:false,bundle:true,format:'iife',globalName:'arenaApi',platform:'browser',logLevel:'silent'});
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE PIT V60 — renderer</title><style>body{margin:0;background:#07090c;color:#eee;font:14px system-ui}h1{font:16px system-ui;margin:6px}canvas{display:block;max-width:100%;height:auto}</style><h1>Composition V60 — harnais de contrôle isolé</h1><canvas width="960" height="540"></canvas><script src="/bundle.js"></script></html>';
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
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
  browser=await chromium.launch({channel:process.env.V60_STAGE_QA_BROWSER_CHANNEL??'chrome',headless:true});
  for(const spec of targets){
    const stage=manifest.stages.find(s=>s.catalogueId===spec.id),life=lifeManifest.stages.find(s=>s.stageId===spec.id);assert(stage&&life);
    const proof=await verifyV60StageBytes(stage,life),directory=path.join(output,spec.id);await fs.mkdir(directory,{recursive:true});
    const errors=[],failedRequests=[],scenarios=[],captures=[],nativeEventFrames=[],floorEvidence=[];
    page=await browser.newPage({viewport:{width:960,height:570}});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
    page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
    await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
    const loaded=await page.evaluate(async({source,lifeSource,id,contacts})=>{
      const target=source.stages.find(s=>s.catalogueId===id),conceptPreview=!target.runtimeEnabled,arenaId=conceptPreview?'the-pit':id;
      if(conceptPreview){
        // Existing neutral geometry proxy only: this cannot activate an extension or alter a real game save.
        if(target.legacyRuntimeArenaId!==null||target.runtimeExtension)throw Error('Invalid concept state');
        source.stages=[{...target,legacyRuntimeArenaId:arenaId,legacyRuntimeStatus:'playable',runtimeEnabled:true},...source.stages];
      }
      const bank=await arenaApi.loadPitArenaArt(arenaId,{productionManifest:source,stageLifeManifestV60:lifeSource});
      const fighterBank=await arenaApi.loadPitCombatBitmapArt(['jungle-hunter','city-hunter']);
      window.renderScenario=({centerX=480,centerY=270,zoom=1,positions=[330,630],reducedMotion=false,highContrast=false,frame=0}={})=>{
        const state=arenaApi.createPitCombatState('jungle-hunter','city-hunter',{mode:'training',arenaId});state.frame=frame;
        state.fighters[0].x=positions[0];state.fighters[1].x=positions[1];
        const before=arenaApi.serializePitCombat(state),camera={arenaId,centerX,centerY,zoom,targetZoom:zoom,frame,mode:'follow'},cameraBefore=JSON.stringify(camera);
        const ctx=document.querySelector('canvas').getContext('2d'),calls=[],nativeDraw=ctx.drawImage;
        ctx.drawImage=function(image,...args){if(image?.src){const src=new URL(image.src).pathname;if(src.includes('/pit-arenas/')||src.includes('/v60/pit-life/'))calls.push({src,args});}return nativeDraw.call(this,image,...args);};
        let back,front,fighters;
        try{
          const options={reducedMotion,highContrast};back=arenaApi.drawPitArenaBackdrop(ctx,state,camera,bank,options);
          ctx.save();ctx.translate(480-centerX*zoom,270-centerY*zoom);ctx.scale(zoom,zoom);
          fighters=state.fighters.map(f=>arenaApi.drawPitCombatBitmapFighter(ctx,fighterBank,f,430,{simulationFrame:frame,combat:state,highContrast}));ctx.restore();
          front=arenaApi.drawPitArenaForeground(ctx,state,camera,bank,options);
        }finally{ctx.drawImage=nativeDraw;}
        const ground=arenaApi.getPitArenaLayerTransform(arenaId,'P4',camera),groundScreenY=430*ground.scale+ground.translateY;
        const groundContacts=contacts.flatMap(measurement=>{
          const asset=target.planes.find(p=>p.id===measurement.plane).assets.find(a=>a.id===measurement.assetId),transform=arenaApi.getPitArenaSubplanTransform(arenaId,asset.parallax,camera,reducedMotion);
          const draws=calls.filter(c=>c.src===measurement.path);if(draws.length!==asset.placements.length)throw Error('Grounded module instance count mismatch');
          return draws.map((draw,i)=>{const visible=draw.args[5]+(measurement.visibleBottomExclusive-draw.args[1])*draw.args[7]/draw.args[3],expected=groundScreenY+(measurement.authoredBottoms[i]-430)*transform.scale;return {asset:asset.id,visible,expected,error:Math.abs(visible-expected)};});
        });
        const floors=target.planes.find(p=>p.id==='P4').assets.filter(a=>a.mode==='repeat-x').flatMap(a=>a.frames.map(f=>f.path));
        const tiles=calls.filter(c=>floors.includes(c.src)).map(c=>({x:c.args[4],y:c.args[5],width:c.args[6],height:c.args[7]})).sort((a,b)=>a.x-b.x);let covered=0;
        for(const tile of tiles)if(tile.y<=groundScreenY+.001&&tile.y+tile.height>=540-.001&&tile.x<=covered+.001&&tile.x+tile.width>=covered)covered=tile.x+tile.width;
        const hangingPaths=target.planes.flatMap(p=>p.assets).filter(a=>a.mode==='module'&&a.verticalAlign==='top'&&!a.anchorToGround).flatMap(a=>a.frames.map(f=>f.path));
        const hangingProps=calls.filter(c=>hangingPaths.includes(c.src)).map(c=>({path:c.src,top:c.args[5]}));
        const life=back.stageLifeV60;
        const attachments=(life?.events??[]).map(event=>{
          const definition=bank.stageLifeV60.events.find(e=>e.id===event.eventId),native=definition.frames[event.nativeFrame],draws=calls.filter(c=>c.src===event.src);if(draws.length!==1)throw Error('Life sprite must draw exactly once');const draw=draws[0];
          const pivot=[draw.args[4]+native.pivot[0]*draw.args[6]/native.rect[2],draw.args[5]+native.pivot[1]*draw.args[7]/native.rect[3]];
          const exactCell=JSON.stringify(draw.args.slice(0,4))===JSON.stringify(native.rect);
          return {eventId:event.eventId,nativeFrame:event.nativeFrame,pass:event.pass,attachment:event.attachment,pivot,exactCell,error:Math.max(...pivot.map((n,i)=>Math.abs(n-event.attachment[i])))};
        });
        return {groundScreenY,groundContacts,groundedPropsVerified:groundContacts.every(c=>c.error<.001),floorCoversScreen:groundScreenY>=540||covered>=960,hangingProps,hangingPropsAnchored:hangingProps.every(p=>p.top<=0),
          planes:[...back.drawnPlanes,...front.drawnPlanes],missing:[...back.missingPaths,...front.missingPaths],fighters,unchangedState:before===arenaApi.serializePitCombat(state),unchangedCamera:cameraBefore===JSON.stringify(camera),
          lifeActors:life?.actorsDrawn??0,lifeEvents:life?.events??[],lifeAttachments:attachments,lifeAttachmentsStable:attachments.length===3&&attachments.every(a=>a.exactCell&&a.error<.001)};
      };
      return {independentKit:Boolean(bank.productionKit),images:bank.images.size,expectedImages:bank.requestedPaths.size,failed:[...bank.failedPaths],fighterFailures:[...fighterBank.failedIds],conceptPreview};
    },{source:structuredClone(manifest),lifeSource:lifeManifest,id:spec.id,contacts:stage.contactMeasurements});
    assert(loaded.independentKit&&loaded.images===loaded.expectedImages&&loaded.images===proof.length);assert.deepEqual(loaded.failed,[]);assert.deepEqual(loaded.fighterFailures,[]);
    for(const floor of stage.planes[4].assets.filter(a=>a.mode==='repeat-x')){const evidence=await measureV55FloorCoverage(floor);assert(evidence.minimumRowOpaqueRatio>=.98);floorEvidence.push(evidence);}
    for(const [name,options] of [['center',{}],['close',{zoom:1.55,centerY:275,positions:[410,550]}],['left-corner',{centerX:280,zoom:1.45,positions:[110,220]}],['right-corner',{centerX:680,zoom:1.45,positions:[740,850]}],['wide',{zoom:.8,positions:[100,860]}],['reduced-motion',{zoom:.9,reducedMotion:true,frame:1200}],['high-contrast',{highContrast:true}],['next-simulation-frame',{frame:8}]]){
      const result=await page.evaluate(options=>window.renderScenario(options),options);
      assert.deepEqual(result.planes,['P0','P1','P2','P3','P4','P5']);assert.deepEqual(result.missing,[]);assert.deepEqual(result.fighters,[true,true]);
      assert(result.unchangedState&&result.unchangedCamera&&result.groundedPropsVerified&&result.floorCoversScreen&&result.hangingPropsAnchored&&result.lifeActors===3&&result.lifeAttachmentsStable,`${spec.id}/${name} composition failed`);
      scenarios.push({name,...result});
      if(['center','wide','left-corner','right-corner'].includes(name)){const capture=path.join(directory,name+'.png');await page.locator('canvas').screenshot({path:capture});captures.push(capture);}
    }
    const timing=await page.evaluate(stageId=>arenaApi.getPitStageLifeScheduleV60(stageId,1,0),spec.id);
    for(let occurrence=0;occurrence<3;occurrence++)for(let nativeFrame=0;nativeFrame<6;nativeFrame++){
      const event=life.events[timing.bag[occurrence]],frame=timing.firstDelay+timing.starts[occurrence]+Math.ceil(nativeFrame*60/event.fps);
      const result=await page.evaluate(frame=>window.renderScenario({frame}),frame),actual=result.lifeEvents.find(e=>e.eventId===event.id);
      assert(actual.active&&actual.nativeFrame===nativeFrame&&result.lifeAttachmentsStable&&result.unchangedState);
      nativeEventFrames.push({eventId:event.id,nativeFrame,frame,attachment:actual.attachment});
      if(nativeFrame===3){const capture=path.join(directory,event.id+'-active.png');await page.locator('canvas').screenshot({path:capture});captures.push(capture);}
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.renderScenario());
    const mobileNoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(mobileNoOverflow);
    const mobile=path.join(directory,'mobile.png');await page.screenshot({path:mobile,fullPage:true});captures.push(mobile);
    assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
    const captureHashes={};for(const file of captures)captureHashes[path.basename(file)]=sha(await fs.readFile(file));
    const report={result:'PASS',arenaId:spec.id,compositionDigest:v60CompositionDigest(stage,life),checkedAt:new Date().toISOString(),surface:'isolated-renderer-with-real-native-images',applicationFlowVerified:false,playablePromotion:false,
      nativeImageProof:proof,loaded,scenarios,nativeEventFrames,floorEvidence,mobileNoOverflow,errors,failedRequests,captures,captureHashes,
      limit:'Eight camera views and eighteen actual native source cells; full application and manual visual review remain separate.'};
    await fs.writeFile(`docs/v60-${spec.id}-renderer-qa.json`,JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
    reports.push({arenaId:spec.id,result:'PASS',images:loaded.images,compositionDigest:report.compositionDigest});console.log(JSON.stringify(reports.at(-1)));await page.close();page=null;
  }
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),stages:reports.length,cameraViews:reports.length*8,nativeEventDrawings:reports.length*18,checks:reports},null,2)+'\n');
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,completed:reports},null,2));throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
