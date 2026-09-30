import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const manifest=JSON.parse(await fs.readFile('app/game/data/pitStageStoryV61.json','utf8'));
const requested=(process.env.V61_STORY_TARGETS??'all').split(',');
const stages=manifest.stages.filter(s=>requested.includes('all')||requested.includes(s.stageId)||requested.includes(s.stageId.slice(6,9)));
assert(stages.length,'No registered conditional art to review');
const output=path.resolve(process.env.V61_STORY_COMPOSITION_OUTPUT??'work-local/v61/qa/story-composition');await fs.mkdir(output,{recursive:true});
const temp=path.resolve('work-local/v61/browser-temp');await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const sourceFiles=['app/game/data/pitStageLifeV61.json','app/game/data/pitStageStoryV61.json','app/game/pitArenaRendering.ts','app/game/pitStageStoryDirectorV61.ts','app/game/pitStageStoryRenderingV61.ts'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,sha(await fs.readFile(p))])));
const compiled=await build({stdin:{contents:'export * from "./app/game/pitArenaRendering";export * from "./app/game/pitCombatBitmapArt";export {createPitCombatState,serializePitCombat,PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";export {createPitRoundPresentation} from "./app/game/systems/pitRoundPresentation";',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'api',platform:'browser',logLevel:'silent'});
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#07090c}canvas{display:block}</style><canvas width="960" height="540"></canvas><script src="/bundle.js"></script>');return;}
  if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(compiled.outputFiles[0].contents);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve('public','.'+decodeURIComponent(url.pathname));assert(url.pathname.startsWith('/game/')&&file.startsWith(path.resolve('public')+path.sep));
  res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const reports=[],errors=[];let browser,page;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const stage of stages) {
    const directory=path.join(output,stage.stageId);await fs.mkdir(directory,{recursive:true});
    page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
    const loaded=await page.evaluate(async id=>{
      const bank=await api.loadPitArenaArt(id),fighters=await api.loadPitCombatBitmapArt(['jungle-hunter','city-hunter']);
      window.render=({centerX=480,zoom=1,positions=[330,630],active=true,nativeFrame=3,reducedMotion=false}={})=>{
        const combat=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:id,mode:'match'}),event=bank.stageStoryV61.events[0];
        const tick=nativeFrame*60/event.fps;
        combat.fighters.forEach((fighter,i)=>fighter.x=positions[i]);
        combat.frame=active?tick:300;combat.roundFramesRemaining=api.PIT_ROUND_FRAMES-combat.frame;
        if(active&&event.trigger!=='round-start'){combat.phase=event.trigger==='match-end'?'match-over':'round-over';combat.lastRoundResult={round:1,reason:'ko',winnerId:'jungle-hunter',frame:0};}
        const presentation=api.createPitRoundPresentation(combat);if(combat.phase==='round'){presentation.phase=active?'fight':'countdown';presentation.blocksSimulation=!active;}
        if(combat.phase==='match-over')presentation.elapsedMs=tick*1000/60;
        const camera={arenaId:id,centerX,centerY:270,zoom,targetZoom:zoom,frame:combat.frame,mode:'follow'},before=api.serializePitCombat(combat);
        const ctx=document.querySelector('canvas').getContext('2d'),calls=[],draw=ctx.drawImage;
        ctx.clearRect(0,0,960,540);ctx.drawImage=function(image,...args){if(image?.src&&new URL(image.src).pathname.includes('/v61/pit-story/'))calls.push({src:new URL(image.src).pathname,args});return draw.call(this,image,...args);};
        let back,front;
        try {
          back=api.drawPitArenaBackdrop(ctx,combat,camera,bank,{roundPresentation:presentation,reducedMotion});
          ctx.save();ctx.translate(480-centerX*zoom,270-270*zoom);ctx.scale(zoom,zoom);
          for(const fighter of combat.fighters)api.drawPitCombatBitmapFighter(ctx,fighters,fighter,430,{simulationFrame:combat.frame,combat});ctx.restore();
          front=api.drawPitArenaForeground(ctx,combat,camera,bank,{reducedMotion});
        }finally{ctx.drawImage=draw;}
        const report=back.stageStoryV61;
        const attachments=report.events.filter(e=>e.drawn).map(e=>{const frame=bank.stageStoryV61.events.find(f=>f.id===e.eventId).frames[e.nativeFrame],call=calls.find(c=>c.src===e.src);return {eventId:e.eventId,exactRect:JSON.stringify(frame.rect)===JSON.stringify(call.args.slice(0,4)),error:Math.max(Math.abs(call.args[4]+frame.pivot[0]*call.args[6]/frame.rect[2]-e.attachment[0]),Math.abs(call.args[5]+frame.pivot[1]*call.args[7]/frame.rect[3]-e.attachment[1]))};});
        return {story:report,ambient:back.stageLifeV61??back.stageLifeV60,calls,attachments,missing:[...back.missingPaths,...front.missingPaths],unchanged:before===api.serializePitCombat(combat)};
      };
      return {images:bank.images.size,requested:bank.requestedPaths.size,failed:[...bank.failedPaths],fighterFailed:[...fighters.failedIds]};
    },stage.stageId);
    assert.equal(loaded.images,loaded.requested);assert.deepEqual(loaded.failed,[]);assert.deepEqual(loaded.fighterFailed,[]);
    const cases=[],captures=[];
    for(const [name,options] of [['rest',{active:false}],['center',{}],['left-corner',{centerX:280,zoom:1.45,positions:[110,220]}],['right-corner',{centerX:680,zoom:1.45,positions:[740,850]}],['reduced',{reducedMotion:true}]]) {
      const result=await page.evaluate(options=>window.render(options),options);assert(result.unchanged);assert.deepEqual(result.missing,[]);assert(result.attachments.every(a=>a.exactRect&&a.error<1e-6));
      const event=stage.events[0],active=options.active!==false;
      assert.equal(result.story.events[0].active,active);assert.equal(result.story.actorsDrawn,active||event.idleVisibility==='rest'?1:0);
      if(event.replacesAmbientEventId&&active)assert(result.ambient.events.every(e=>e.eventId!==event.replacesAmbientEventId),'Same body must not draw twice');
      const file=path.join(directory,name+'.png');await page.locator('canvas').screenshot({path:file});captures.push({file,sha256:sha(await fs.readFile(file)),visualReview:'pending-separate-inspection'});cases.push({name,...result});
    }
    const frames=[];
    for(let i=0;i<6;i++){const result=await page.evaluate(nativeFrame=>window.render({nativeFrame}),i);assert.equal(result.story.events[0].nativeFrame,i);assert(result.story.events[0].drawn&&result.unchanged);assert(result.attachments.every(a=>a.exactRect&&a.error<1e-6));frames.push(result.story.events[0]);}
    const report={result:'PASS',stageId:stage.stageId,checkedAt:new Date().toISOString(),surface:'isolated-production-renderer-real-native-png',applicationFlowVerified:false,loaded,cases,frames,captures,sourceHashes};
    await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');reports.push(report);await page.close();page=null;console.log(JSON.stringify({stageId:stage.stageId,result:'PASS',captures:captures.length,frames:frames.length}));
  }
  assert.deepEqual(errors,[]);
  for(const file of sourceFiles)assert.equal(sha(await fs.readFile(file)),sourceHashes[file],`Source changed during QA: ${file}`);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),stages:reports.length,applicationFlowVerified:false,sourceHashes,reports,errors},null,2)+'\n');
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
