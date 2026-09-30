import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {verifyPitNativeV61} from './lib/pit-stage-native-v61.mjs';

// Isolated compositor QA: these explicitly authored fixture clocks are not UI or story progression evidence.
const root=process.cwd(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={production:'art-source/v33/pit-arenas/production-manifest.json',life:'app/game/data/pitStageLifeV62.json',story:'app/game/data/pitStageStoryV61.json',base:'app/game/data/pitStageLifeV60.json'};
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const [manifest,lifeManifest,storyManifest,baseManifest]=await Promise.all(Object.values(files).map(read));
const requested=(process.argv[2]??'126,130,187').split(',');
const allIds=[...new Set([...lifeManifest.stages,...storyManifest.stages].map(stage=>stage.stageId))];
const targets=allIds.filter(id=>requested.includes('all')||requested.includes(id)||requested.includes(String(Number(id.split('-')[1]))));
assert(targets.length,'No requested V62 stage registered');
if(!requested.includes('all'))assert.equal(targets.length,requested.length,'A requested V62 stage has not been assembled');
const output=path.resolve(process.env.V62_COMPOSITION_QA_OUTPUT??'work-local/v62/qa/stages/renderer');
const temp=path.resolve('work-local/v62/browser-temp');await fs.mkdir(temp,{recursive:true});await fs.mkdir(output,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const coreFiles=['app/game/pitArenaRendering.ts','app/game/pitArenaProduction.ts','app/game/pitStageStoryV61.ts','app/game/pitStageStoryDirectorV61.ts','app/game/pitStageStoryRenderingV61.ts','app/game/pitStageLifeV60.ts','app/game/pitStageLifeDirectorV60.ts','app/game/pitStageLifeRenderingV60.ts','app/game/pitStageLifeRenderingV61.ts','app/game/pitCombatBitmapArt.ts','app/game/pitStageLifeV62.ts','scripts/verify-pit-stage-composition-v62.mjs'];
coreFiles.push('docs/v61-game-camera-sample.json');
const actualGameCamera=(await read('docs/v61-game-camera-sample.json')).sample;
assert(Number.isFinite(actualGameCamera.centerY)&&Number.isFinite(actualGameCamera.zoom),'A real application camera sample is required');
const coreHashes=Object.fromEntries(await Promise.all(coreFiles.map(async file=>[file,sha(await fs.readFile(file))])));
const inputFileHashes=Object.fromEntries(await Promise.all(Object.values(files).map(async file=>[file,sha(await fs.readFile(file))])));
const stageInput=id=>({production:manifest.stages.find(s=>s.catalogueId===id),life:lifeManifest.stages.find(s=>s.stageId===id)??null,story:storyManifest.stages.find(s=>s.stageId===id)??null,base:baseManifest.stages.find(s=>s.stageId===id)??null});
const receipts=[];
for(const directory of ['docs/v62-generation','docs/v61-generation','docs/v60-generation'])for(const file of (await fs.readdir(directory)).filter(f=>f.endsWith('.json'))){
  const document=await read(path.join(directory,file));for(const asset of document.assets??[document])if(asset.sha256)receipts.push({...asset,receiptFile:path.join(directory,file)});
}
const bundle=await build({stdin:{contents:'export * from "./app/game/pitArenaRendering";export * from "./app/game/pitCombatBitmapArt";export * from "./app/game/pitStageLifeDirectorV60";export * from "./app/game/pitStageStoryDirectorV61";export {createPitRoundPresentation} from "./app/game/systems/pitRoundPresentation";export {createPitCombatState,serializePitCombat,PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";',resolveDir:root},bundle:true,write:false,format:'iife',globalName:'arenaApi',platform:'browser',logLevel:'silent'});
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE PIT V62 — composition</title><style>body{margin:0;background:#07090c;color:#eee;font:14px system-ui}h1{font:16px system-ui;margin:6px}canvas{display:block;max-width:100%;height:auto}</style><h1>V62 — harnais de composition isolé, état de contrôle</h1><canvas width="960" height="540"></canvas><script src="/bundle.js"></script></html>';
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
  if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));
  if(!url.pathname.startsWith('/game/')||!file.startsWith(path.resolve(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const reports=[];
const cameras=[['center',{}],['left-corner',{centerX:280,zoom:1.45,positions:[110,220]}],['right-corner',{centerX:680,zoom:1.45,positions:[740,850]}],['wide',{zoom:.8,positions:[100,860]}],['close',{zoom:1.55,centerY:275,positions:[410,550]}],['reduced-motion',{reducedMotion:true,zoom:.9}],['high-contrast',{highContrast:true}],['actual-game-camera',actualGameCamera]];
try{
  browser=await chromium.launch({channel:process.env.V62_COMPOSITION_QA_BROWSER_CHANNEL??'chrome',headless:true});
  for(const id of targets){
    const input=stageInput(id);assert(input.production,`${id}: production kit absent`);const compositionDigest=sha(JSON.stringify(input));
    const directory=path.join(output,id);await fs.mkdir(directory,{recursive:true});
    const nativeImageProof=[];
    for(const event of [...input.life?.events??[],...input.story?.events??[]]){
      const receipt=receipts.find(r=>r.sha256===event.sha256&&['accepted','visually-accepted'].includes(r.status));
      nativeImageProof.push({...await verifyPitNativeV61(event,receipt),receiptFile:receipt.receiptFile});
    }
    const errors=[],failedRequests=[],scenarios=[],nativeEventFrames=[],captures=[];
    page=await browser.newPage({viewport:{width:960,height:570}});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
    page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
    await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
    const loaded=await page.evaluate(async({id,production,life,story,base})=>{
      const bank=await arenaApi.loadPitArenaArt(id,{productionManifest:production,stageLifeManifestV62:life,stageStoryManifestV61:story,stageLifeManifestV60:base});
      const fighterBank=await arenaApi.loadPitCombatBitmapArt(['jungle-hunter','city-hunter']);
      const stage=production.stages.find(s=>s.catalogueId===id);
      window.renderScenario=({centerX=480,centerY=270,zoom=1,positions=[330,630],reducedMotion=false,highContrast=false,frame=240,storyEventId=null,storyNativeFrame=0}={})=>{
        const state=arenaApi.createPitCombatState('jungle-hunter','city-hunter',{arenaId:id});state.frame=frame;state.roundFramesRemaining=arenaApi.PIT_ROUND_FRAMES-frame;
        state.fighters[0].x=positions[0];state.fighters[1].x=positions[1];
        const presentation={...arenaApi.createPitRoundPresentation(state),phase:'fight',elapsedMs:650,blocksSimulation:false};
        let narrative;
        if(storyEventId){
          // Sample inside each frame rather than its floating-point millisecond boundary.
          const event=bank.stageStoryV61.events.find(e=>e.id===storyEventId),elapsed=Math.ceil(storyNativeFrame*60/event.fps)+1;
          if(event.trigger==='round-start'){state.frame=elapsed;state.roundFramesRemaining=arenaApi.PIT_ROUND_FRAMES-elapsed;}
          else if(event.trigger==='round-end'||event.trigger==='round-victory'||event.trigger==='match-end'){
            const terminal=event.trigger==='match-end';
            state.phase=terminal?'match-over':'round-over';state.frame=terminal?300:300+elapsed;state.lastRoundResult={round:state.round,reason:'ko',winnerId:'jungle-hunter',frame:300};
            if(terminal)state.matchWinnerId='jungle-hunter';
            presentation.phase=terminal?'match-result':'round-result';presentation.blocksSimulation=terminal;presentation.elapsedMs=elapsed*1000/60;
          }else narrative={stageId:id,encounterId:event.encounterId,cues:[{cue:event.cue,occurrenceId:'isolated-composition-fixture-only',elapsedFrames:elapsed}]};
        }
        const before=arenaApi.serializePitCombat(state),camera={arenaId:id,centerX,centerY,zoom,targetZoom:zoom,frame:state.frame,mode:'follow'},cameraBefore=JSON.stringify(camera);
        const ctx=document.querySelector('canvas').getContext('2d'),calls=[],clipStack=[];
        const original=Object.fromEntries(['drawImage','save','restore','beginPath','rect','clip'].map(name=>[name,ctx[name]]));
        let clipRect=null,pathRect=null;
        ctx.save=function(){clipStack.push(clipRect);return original.save.call(this);};
        ctx.restore=function(){clipRect=clipStack.pop()??null;return original.restore.call(this);};
        ctx.beginPath=function(){pathRect=null;return original.beginPath.call(this);};
        ctx.rect=function(...args){pathRect=args;return original.rect.call(this,...args);};
        ctx.clip=function(...args){clipRect=pathRect;return original.clip.call(this,...args);};
        ctx.drawImage=function(image,...args){if(image?.src)calls.push({src:new URL(image.src).pathname,args,clipRect,alpha:this.globalAlpha});return original.drawImage.call(this,image,...args);};
        let back,front,fighters;
        try{
          const options={reducedMotion,highContrast,roundPresentation:presentation,narrativeCuesV61:narrative};
          back=arenaApi.drawPitArenaBackdrop(ctx,state,camera,bank,options);
          ctx.save();ctx.translate(480-centerX*zoom,270-centerY*zoom);ctx.scale(zoom,zoom);
          fighters=state.fighters.map(f=>arenaApi.drawPitCombatBitmapFighter(ctx,fighterBank,f,430,{simulationFrame:state.frame,combat:state,highContrast}));ctx.restore();
          front=arenaApi.drawPitArenaForeground(ctx,state,camera,bank,options);
        }finally{Object.assign(ctx,original);}
        const groups=[['base',back.stageLifeV60,bank.stageLifeV60],['ambient',back.stageLifeV62,bank.stageLifeV62],['story',back.stageStoryV61,bank.stageStoryV61]];
        const attachments=groups.flatMap(([kind,report,definition])=>(report?.events??[]).map(event=>{
          const sourceEvent=definition.events.find(e=>e.id===event.eventId),native=sourceEvent.frames[event.nativeFrame],draws=calls.filter(c=>c.src===event.src),draw=draws[0];
          if(!event.drawn)return {kind,eventId:event.eventId,drawn:false,drawCount:draws.length,exactCell:true,error:0};
          const pivot=[draw.args[4]+native.pivot[0]*draw.args[6]/native.rect[2],draw.args[5]+native.pivot[1]*draw.args[7]/native.rect[3]];
          const alpha=native.alphaBounds,visibleBounds=[draw.args[4]+alpha[0]*draw.args[6]/native.rect[2],draw.args[5]+alpha[1]*draw.args[7]/native.rect[3],alpha[2]*draw.args[6]/native.rect[2],alpha[3]*draw.args[7]/native.rect[3]];
          let clipCorrect=true,expectedClip=null;
          if(sourceEvent.clipWorld){
            const t=arenaApi.getPitArenaSubplanTransform(id,sourceEvent.placement.parallax,camera,reducedMotion),c=sourceEvent.clipWorld;
            expectedClip=[c.x*t.scale+t.translateX,c.y*t.scale+t.translateY,c.width*t.scale,c.height*t.scale];
            clipCorrect=Boolean(draw.clipRect)&&expectedClip.every((v,index)=>Math.abs(v-draw.clipRect[index])<.001);
          }
          return {kind,eventId:event.eventId,drawn:true,nativeFrame:event.nativeFrame,drawCount:draws.length,pass:event.pass,attachment:event.attachment,pivot,visibleBounds,expectedClip,observedClip:draw.clipRect,clipCorrect,alpha:draw.alpha,
            exactCell:JSON.stringify(draw.args.slice(0,4))===JSON.stringify(native.rect),error:Math.max(...pivot.map((n,i)=>Math.abs(n-event.attachment[i])))};
        }));
        const ground=arenaApi.getPitArenaLayerTransform(id,'P4',camera),groundScreenY=430*ground.scale+ground.translateY;
        // V43 uses a separate contact strip and front fascia. Check their combined visible coverage,
        // not whether a single contact tile also spans the entire vertical fascia.
        const floorPaths=stage.planes.find(p=>p.id==='P4').assets.filter(a=>['repeat-x','strip-x'].includes(a.mode)).flatMap(a=>a.frames.map(f=>f.path));
        const tiles=calls.filter(c=>floorPaths.includes(c.src)).map(c=>({x:c.args[4],y:c.args[5],width:c.args[6],height:c.args[7]})).sort((a,b)=>a.x-b.x);
        const cuts=[...new Set([Math.max(0,groundScreenY),540,...tiles.flatMap(t=>[t.y,t.y+t.height]).filter(y=>y>Math.max(0,groundScreenY)&&y<540)])].sort((a,b)=>a-b);
        const floorCoversScreen=groundScreenY>=540||cuts.slice(0,-1).every((y,index)=>{
          const sample=(y+cuts[index+1])/2;let covered=0;
          for(const tile of tiles)if(tile.y<=sample+.001&&tile.y+tile.height>=sample-.001&&tile.x<=covered+.001&&tile.x+tile.width>=covered)covered=Math.max(covered,tile.x+tile.width);
          return covered>=960;
        });
        return {planes:[...back.drawnPlanes,...front.drawnPlanes],missing:[...back.missingPaths,...front.missingPaths],fighters,unchangedState:before===arenaApi.serializePitCombat(state),unchangedCamera:cameraBefore===JSON.stringify(camera),groundScreenY,floorCoversScreen,reducedMotion,
          lifeActors:(back.stageLifeV60?.actorsDrawn??0)+(back.stageLifeV62?.actorsDrawn??0),lifeEvents:[...back.stageLifeV60?.events??[],...back.stageLifeV62?.events??[]],storyEvents:back.stageStoryV61?.events??[],replacedAmbientIds:back.stageStoryV61?.replacedAmbientEventIds??[],attachments,
          stableAttachments:attachments.every(a=>a.exactCell&&a.error<.001&&a.drawCount===(a.drawn?1:0)&&a.clipCorrect!==false),syntheticNarrativeCue:Boolean(narrative)};
      };
      return {independentKit:Boolean(bank.productionKit),images:bank.images.size,expectedImages:bank.requestedPaths.size,failed:[...bank.failedPaths],fighterFailures:[...fighterBank.failedIds],hasV62Ambient:Boolean(bank.stageLifeV62),hasV61Story:Boolean(bank.stageStoryV61)};
    },{id,production:manifest,life:lifeManifest,story:storyManifest,base:baseManifest});
    assert(loaded.independentKit&&loaded.images===loaded.expectedImages,`${id}: ${JSON.stringify({loaded,failedRequests})}`);assert.deepEqual(loaded.failed,[]);assert.deepEqual(loaded.fighterFailures,[]);
    const capture=async name=>{const file=path.join(directory,name+'.png');await page.locator('canvas').screenshot({path:file});captures.push({name,path:file,sha256:sha(await fs.readFile(file))});};
    const verify=(name,result)=>{
      assert.deepEqual(result.planes,['P0','P1','P2','P3','P4','P5'],`${id}/${name}: planes`);assert.deepEqual(result.missing,[]);assert.deepEqual(result.fighters,[true,true]);
      assert(result.unchangedState&&result.unchangedCamera&&result.stableAttachments&&result.floorCoversScreen,`${id}/${name}: composition invariant ${JSON.stringify(result)}`);
      const expected=(input.life??input.base)?.events.filter(event=>!result.replacedAmbientIds.includes(event.id)
        &&!event.excludedFighterIds?.some(fighter=>['jungle-hunter','city-hunter'].includes(fighter)))??[];
      const visible=expected.filter(event=>event.idleVisibility!=='hidden'
        ||(!result.reducedMotion&&result.lifeEvents.find(pose=>pose.eventId===event.id)?.active));
      assert.equal(result.lifeActors,visible.length,`${id}/${name}: visible ambient count`);
      for(const event of expected){
        const pose=result.lifeEvents.find(pose=>pose.eventId===event.id);
        assert(pose,`${id}/${name}: expected ambient event report`);
        assert.equal(pose.drawn,visible.includes(event),`${id}/${name}: ambient visibility`);
        if(event.travelX&&pose.drawn){
          assert(Number.isFinite(pose.travelX)&&pose.travelX>=Math.min(...event.travelX)&&pose.travelX<=Math.max(...event.travelX),`${id}/${name}: bounded world travel`);
          assert.equal(pose.clipped,Boolean(event.clipWorld),`${id}/${name}: background opening clip`);
        }
      }
      for(const event of result.storyEvents)if(event.trigger==='narrative-cue'&&!result.syntheticNarrativeCue)assert.equal(event.drawn,false,`${id}: no narrative caller in ordinary fight`);
    };
    for(const [name,options] of cameras){const result=await page.evaluate(options=>window.renderScenario(options),options);verify(name,result);scenarios.push({name,...result});await capture(name);}
    const ambient=input.life??input.base;
    if(ambient){
      const timing=await page.evaluate(id=>arenaApi.getPitStageLifeScheduleV60(id,1,0),id);
      for(let occurrence=0;occurrence<3;occurrence++)for(let nativeFrame=0;nativeFrame<6;nativeFrame++){
        const event=ambient.events[timing.bag[occurrence]],frame=timing.firstDelay+timing.starts[occurrence]+Math.ceil(nativeFrame*60/event.fps);
        const result=await page.evaluate(frame=>window.renderScenario({frame}),frame);verify(`ambient-${event.id}-${nativeFrame}`,result);
        const actual=result.lifeEvents.find(e=>e.eventId===event.id);assert(actual.drawn&&actual.active&&actual.nativeFrame===nativeFrame,`${id}/${event.id} expected native frame ${nativeFrame} at tick ${frame}: ${JSON.stringify(actual)}`);
        nativeEventFrames.push({kind:input.life?'v62-ambient':'v60-retained',eventId:event.id,nativeFrame,frame,attachment:actual.attachment});
        await capture(`ambient-${event.id}-frame-${nativeFrame}`);
      }
      for(const event of ambient.events.filter(event=>event.travelX)){
        const occurrence=timing.bag.indexOf(ambient.events.indexOf(event)),start=timing.firstDelay+timing.starts[occurrence];
        const duration=event.frames.length*60/event.fps;
        for(const [name,elapsed,expected] of [['start',0,event.travelX[0]],['end',duration-1,event.travelX[1]]]){
          const result=await page.evaluate(frame=>window.renderScenario({frame}),start+elapsed);verify(`travel-${event.id}-${name}`,result);
          assert.equal(result.lifeEvents.find(pose=>pose.eventId===event.id).travelX,expected);
          scenarios.push({name:`travel-${event.id}-${name}`,...result});await capture(`travel-${event.id}-${name}`);
        }
        for(const [camera,options] of cameras){
          const result=await page.evaluate(options=>window.renderScenario(options),{...options,frame:start+Math.ceil(3*60/event.fps)});
          verify(`travel-${event.id}-${camera}`,result);scenarios.push({name:`travel-${event.id}-${camera}`,...result});await capture(`travel-${event.id}-${camera}`);
        }
      }
    }
    for(const event of input.story?.events??[]){
      for(let nativeFrame=0;nativeFrame<6;nativeFrame++){
        const result=await page.evaluate(options=>window.renderScenario(options),{storyEventId:event.id,storyNativeFrame:nativeFrame});verify(`story-${event.id}-${nativeFrame}`,result);
        const actual=result.storyEvents.find(e=>e.eventId===event.id);assert(actual.drawn&&actual.active&&actual.nativeFrame===nativeFrame,`${id}/${event.id}: expected story frame ${nativeFrame}: ${JSON.stringify(actual)}`);
        nativeEventFrames.push({kind:'story',trigger:event.trigger,eventId:event.id,nativeFrame,attachment:actual.attachment,syntheticNarrativeCue:result.syntheticNarrativeCue});
        await capture(`story-${event.id}-frame-${nativeFrame}`);
      }
      for(const [camera,options] of cameras){
        const result=await page.evaluate(options=>window.renderScenario(options),{...options,storyEventId:event.id,storyNativeFrame:3});verify(`story-${event.id}-${camera}`,result);
        const actual=result.storyEvents.find(e=>e.eventId===event.id);assert.equal(actual.nativeFrame,options.reducedMotion?event.reducedMotionFrame:3);
        scenarios.push({name:`story-${event.id}-${camera}`,...result});await capture(`story-${event.id}-${camera}`);
      }
    }
    await page.setViewportSize({width:390,height:844});const mobile=await page.evaluate(()=>window.renderScenario());verify('mobile',mobile);
    const mobileNoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(mobileNoOverflow);await capture('mobile-canvas');
    assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
    const report={result:'PASS',arenaId:id,checkedAt:new Date().toISOString(),compositionDigest,coreHashes,inputFileHashes,sourceInput:input,surface:'isolated-actual-renderer-with-native-PNGs',applicationFlowVerified:false,narrativeCallerVerified:false,visualCompositionAccepted:false,
      nativeImageProof,loaded,scenarios,nativeEventFrames,mobileNoOverflow,errors,failedRequests,captures,limit:'Fixture combat/result clocks and explicitly marked synthetic narrative cues test composition only. Manual visual review, real UI triggers, story callers and publication remain separate.'};
    await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
    await fs.writeFile(`docs/v62-${id}-renderer-qa.json`,JSON.stringify(report,null,2)+'\n');
    reports.push({arenaId:id,result:'PASS',compositionDigest,cameraChecks:scenarios.length,nativeFrameChecks:nativeEventFrames.length,captures:captures.length,report:path.join(directory,'report.json')});console.log(JSON.stringify(reports.at(-1)));
    await page.close();page=null;
  }
  for(const file of coreFiles)assert.equal(sha(await fs.readFile(file)),coreHashes[file],`Renderer source changed during run: ${file}`);
  const [endProduction,endLife,endStory,endBase]=await Promise.all(Object.values(files).map(read));
  for(const report of reports){const id=report.arenaId,end={production:endProduction.stages.find(s=>s.catalogueId===id),life:endLife.stages.find(s=>s.stageId===id)??null,story:endStory.stages.find(s=>s.stageId===id)??null,base:endBase.stages.find(s=>s.stageId===id)??null};assert.equal(sha(JSON.stringify(end)),report.compositionDigest,`Stage changed during run: ${id}`);}
  const aggregate={result:'PASS',checkedAt:new Date().toISOString(),stages:reports.length,cameraChecks:reports.reduce((n,r)=>n+r.cameraChecks,0),nativeFrameChecks:reports.reduce((n,r)=>n+r.nativeFrameChecks,0),captures:reports.reduce((n,r)=>n+r.captures,0),coreHashes,checks:reports,applicationFlowVerified:false,visualCompositionAccepted:false,narrativeCallerVerified:false};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(aggregate,null,2)+'\n');console.log(JSON.stringify({result:'PASS',stages:aggregate.stages,captures:aggregate.captures,report:path.join(output,'report.json')}));
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,completed:reports},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
