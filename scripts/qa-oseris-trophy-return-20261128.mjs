#!/usr/bin/env node
/** Complete native GameClient, durable active-hunt sidecar and Canvas inputs.
 * Field prey and the separate terminal segment are disclosed fixtures. The
 * canopy starts at the canonical insertion. No whole-campaign/device claim.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
assert.ok(args.length===0||(args.length===1&&args[0]==='--naraka'),'Expected --naraka or the historical Oseris route');
const naraka=args.includes('--naraka');
const field=naraka
  ? {name:'Naraka-Delta',caseId:'loaded-naraka',missionId:'swamp-hydra',prey:'naraka-delta--iron-croc',trophy:'enemy-trophy-plaque-nucale-ferrique',trophyName:'Plaque nucale ferrique',hide:'Cuir à plaques ferriques',massKg:4.4}
  : {name:'Oseris-IV',caseId:'loaded-oseris',missionId:'jungle-vey',prey:'oseris-iv--vineback-grazer',trophy:'enemy-trophy-omoplate-vegetalisee',trophyName:'Omoplate végétalisée',hide:'Peau à fibres végétales',massKg:3.2};
const out=path.resolve(root,process.env.SKINNING_CANOPY_QA_OUTPUT??(naraka?'outputs/qa-naraka-loaded-return':'outputs/qa-oseris-trophy-return-20261128'));
await mkdir(out,{recursive:true});
const hash=value=>createHash('sha256').update(typeof value==='string'||ArrayBuffer.isView(value)?value:JSON.stringify(value)).digest('hex');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const source=await readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8');
const marker='    const fixedStep = 1 / 60;';
assert.equal(source.split(marker).length,2,'One native lifecycle hook boundary');
const observer='    window.__onSkinningCanopyMountV112?.({get game(){return game;},input,get alive(){return alive;},resumed:resumeSnapshot!=null,mission,encounterRun,native:{makeEnemy,damageEnemy,canopySupportReachableV112,solvePlayerRigFrame,huntFieldLoadV112,trophyHarvestPoint,trophyHarvestInReach,APEX_TROPHY_REACH}});\n';
const rootDrawMarker='      drawJunglePlatform(\n        context,\n        platform,\n        junglePlatformImages[junglePlatformIndex],\n        junglePlatformSurfaceRatios[junglePlatformIndex],\n      );';
assert.equal(source.split(rootDrawMarker).length,2,'One native jungle platform paint boundary');
const observeRootDraw='\n      if (canopyRoot) window.__onCanopyRootDrawV112?.(platform.id,junglePlatformImages[junglePlatformIndex]);';
const boardingMarker='      finish(resultFor(state, mission, difficulty, "success"));';
assert.equal(source.split(boardingMarker).length,2,'One native successful boarding boundary');
const observeBoarding='      const result = resultFor(state, mission, difficulty, "success");\n      window.__onOserisReturnV112?.(result);\n      finish(result);';
const trophyDrawMarker='      const trophySize = isActive ? 58 : 52;';
assert.equal(source.split(trophyDrawMarker).length,2,'One native secondary trophy image draw boundary');
const observeTrophyDraw='\n      window.__onOserisTrophyDrawV112?.(drop.claim.definitionId,image);';
const instrumentedSource=source.replace(marker,observer+marker)
  .replace(rootDrawMarker,rootDrawMarker+observeRootDraw).replace(boardingMarker,observeBoarding)
  .replace(trophyDrawMarker,trophyDrawMarker+observeTrophyDraw);
const bootstrap=await build({stdin:{contents:'export {defaultSave,normalizeSave,SAVE_STORAGE_KEY} from "./app/game/save";export {GALAXY_NAVIGATION} from "./app/game/galaxyNavigation";export {purchaseFieldToolV111} from "./app/game/systems/fieldToolsV111";',resolveDir:root,loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent'});
const mod={exports:{}};
runInNewContext(bootstrap.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),structuredClone,TextEncoder});
const replaySource='docs/qa/v112-ground-campaign/campaign-origin-save.json';
const replayBytes=naraka?await readFile(path.join(root,replaySource)):null;
let admission=naraka?mod.exports.normalizeSave(JSON.parse(replayBytes)):mod.exports.defaultSave('2026-11-09T00:00:00.000Z');
if(naraka){
  assert.equal(admission.missionProgress[field.missionId].status,'completed');
  const purchase=mod.exports.purchaseFieldToolV111(admission,'flaying-tool');
  assert.equal(purchase.ok,true);
  admission=purchase.save;
}else{
  admission.profile.clanMarks=100;
  admission.inventory.fieldToolIds=['flaying-tool'];
  admission.inventory.harvestV112.toolCondition=25;
}
const initialToolCondition=admission.inventory.harvestV112.toolCondition;
admission.settings.masterVolume=0;
admission.settings.reducedGore=true;
admission.settings.screenShake=false;
const storageKey=mod.exports.SAVE_STORAGE_KEY;
const route=mod.exports.GALAXY_NAVIGATION.sectors.flatMap(sector=>sector.systems.flatMap(system=>system.bodies.flatMap(body=>body.missions.map(mission=>({sector,system,body,mission}))))).find(item=>item.mission.id===field.missionId);
assert.ok(route);
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/oseris-trophy-return-20261128.fixture.jsx'],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',outfile:'fixture.js',metafile:true,logLevel:'silent',external:['/game/*'],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'native-gameclient-with-declared-observers',setup(builder){
  builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),contents:(await postcss([tailwind({base:root})]).process(await readFile(args.path,'utf8'),{from:args.path})).css}));
  builder.onLoad({filter:/\/HuntCanvas\.tsx$/},()=>({loader:'tsx',resolveDir:path.join(root,'app/game'),contents:instrumentedSource}));
}}]});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));
assert.ok(js&&css);
const sourceHashes={};
for(const file of Object.keys(bundle.metafile.inputs).filter(name=>name.startsWith('app/game/')&&/HuntCanvas|GameClient|HuntCanopy|HuntRites|HuntFieldGuide|HuntAccessibility|activeHuntSave|canopy|ritesOfHunt|huntRites|harvestInventory|fieldStash|huntField|hunterRig|save\.ts|sound\.ts/.test(name)).sort()){
  sourceHashes[file]=hash(await readFile(path.join(root,file)));
}
const report={
  schemaVersion:1,startedAt:new Date().toISOString(),sourceCommit:revision,workingTreeDirty:dirty.length>0,workingTreeOverlay:dirty,
  classification:'IN_PROGRESS',browserExecuted:false,passed:false,checks:[],captures:[],errors:[],cases:{},admissionArrivals:[],
  sourceHashes,hookSha256:hash(observer),renderObserverSha256:hash(observeRootDraw),boardingObserverSha256:hash(observeBoarding),trophyObserverSha256:hash(observeTrophyDraw),bundleSha256:hash(js.contents),cssBundleSha256:hash(css.contents),
  inputTimestampSemantics:'Input logs use the nearest decision observation, not the exact browser event-dispatch clock. Native simulation continues while screenshots, DOM inspection and protocol messages are processed.',
  instrumentation:['A declared Canvas mount hook observes native state, stages one dead local prey, and provides a single optional authored-arena Apex defeat setup without moving the player or claiming a trophy','Read-only observers record the native canvas image painted for each collision root and available secondary trophy','A passthrough Storage.prototype.setItem observer records the successful native platform call without changing bytes or acknowledgements','No production GameClient callback, ownership check, sidecar encoder, writer or claim is substituted'],
  admission:{kind:naraka?'Archived legitimate campaign replay and native field-tool purchase':'Declared initial campaign with field tool, 100 marks and condition 25',sha256:hash(admission),save:admission,...(replayBytes?{source:replaySource,sourceSha256:hash(replayBytes)}:{})},
  scope:naraka?'Actual Naraka-Delta revisite, native skinning and trophy rite, ground and rest sidecars, recovery and definitive extraction. One local Iron Crocodile body and a separate Apex defeat are explicitly prepared through native damage without moving the hunter.':'Actual campaign navigation and GameClient admission, native harvest, charged canopy traversal, westward return through two real branches with sidecar persistence and recovery. The fixture creates one local Vineback Grazer corpse through the native damage function at the canonical spawn. Before the last ground leg a separate disclosed fixture resolves Apex combat and its prerequisites at its authored position. All movement, harvest, trophies, stashes, stamina, collisions, approach to boarding, and settlement use native controls.',
  limits:['Automated desktop Chromium','The initial prey kill and later Apex defeat are fixture setups. The trophies themselves are claimed through the real rites.','Proof applies to the '+field.name+' route on desktop'],
};
const tracked=new Map(execFileSync('git',['ls-tree','-r',revision,'--','public'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim().split('\n').filter(Boolean).map(line=>{const [meta,name]=line.split('\t');return[name,meta.split(' ')[2]];}));
const requests=new Map(),pending=new Map();
async function asset(pathname){
  if(!pending.has(pathname))pending.set(pathname,(async()=>{
    const oid=tracked.get('public'+pathname);
    let bytes,origin='workspace';
    try{bytes=await readFile(path.join(root,'public',pathname));}catch{
      if(!oid)throw Error('Missing public asset '+pathname);
      origin='exact-git-blob';bytes=execFileSync('git',['cat-file','blob',oid],{cwd:root,maxBuffer:64*1024*1024});
    }
    const actual=createHash(oid?.length===64?'sha256':'sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    requests.set(pathname,{url:pathname,status:200,origin:oid&&actual===oid?origin:'declared-workspace-overlay',gitBlob:oid??null,matchesHead:oid?actual===oid:null,bytes:bytes.length,sha256:hash(bytes)});
    return bytes;
  })());
  return pending.get(pathname);
}
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja — native durable field work</title><link rel="stylesheet" href="/fixture.css"><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  if(pathname==='/fixture.js'||pathname==='/fixture.css'){res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'text/javascript':'text/css'}).end(pathname.endsWith('.js')?js.contents:css.contents);return;}
  if(pathname.includes('..'))throw Error('Invalid public path');
  const bytes=await asset(pathname);
  res.writeHead(200,{'Content-Type':mime[path.extname(pathname)]??'application/octet-stream'}).end(bytes);
}catch(error){requests.set(req.url,{url:req.url,status:404,error:String(error)});res.writeHead(404).end();}});
let browser,context,page;
const check=async(name,run)=>{
  const startedAt=new Date().toISOString();
  try{const details=await run();report.checks.push({name,status:'PASS',startedAt,details:details??null});console.log('PASS '+name);}
  catch(error){report.checks.push({name,status:'FAIL',startedAt,error:String(error.stack??error)});throw error;}
};
const observation=()=>page.evaluate(()=>window.__skinningCanopyQaV112.state());
const disk=()=>page.evaluate(()=>window.__skinningCanopyQaV112.disk());
const campaign=()=>page.evaluate(()=>window.__skinningCanopyQaV112.campaign());
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const capture=async name=>{
  const bytes=await page.screenshot({fullPage:true,animations:'disabled'});
  await writeFile(path.join(out,name+'.png'),bytes);
  report.captures.push({file:name+'.png',bytes:bytes.length,sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
};
async function openCampaign(){
  await page.locator('[data-campaign-menu]').waitFor();
  const section=page.locator('[data-menu-section="campaign"]');
  if(await section.count())await section.click();
  await page.locator('[data-menu-action="continue"]').click();
  await page.waitForFunction(()=>window.__skinningCanopyQaV112?.runtime?.alive||document.querySelector('[data-campaign-session]'));
}
async function launch(){
  await openCampaign();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
  const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
  if(await shortcuts.getAttribute('aria-expanded')!=='true')await shortcuts.click();
  const direct=page.getByText(/^Accès direct aux interfaces(?: · sans déplacement du chasseur)?$/);
  if(await direct.locator('..').getAttribute('open')===null)await direct.click();
  await page.getByRole('button',{name:/^NAVIGATION.*Ouvrir l’interface/}).first().click();
  const galaxy=page.locator('.galaxy-v10-breadcrumbs button').first();
  if(await galaxy.isEnabled())await galaxy.click();
  for(const label of[route.sector.name,route.system.name,route.body.name]){
    await page.locator('.galaxy-v10-spatial-map button').filter({hasText:label}).first().click();
    await page.getByRole('button',{name:'Entrer',exact:true}).click();
  }
  await page.getByRole('button',{name:route.mission.title,exact:false}).first().click();
  await page.getByRole('button',{name:/^Préparer (la chasse|cette revisite)$/}).click();
  await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
  await page.getByRole('button',{name:/^Passer l’arrivée/}).click();
  report.admissionArrivals.push({case:new URL(page.url()).searchParams.get('case'),control:'Native Passer l’arrivée',claim:'skipped cinematic; real campaign handoff and canonical hunt insertion'});
  await page.getByRole('button',{name:'Commencer la chasse',exact:true}).click();
  await page.waitForFunction(()=>window.__skinningCanopyQaV112.runtime?.alive&&window.__skinningCanopyQaV112.state().elapsed>0);
}
async function pause(){
  const state=await observation();
  if(!state.paused)await page.getByRole('button',{name:'Mettre en pause, consulter la carte et le sac',exact:true}).click();
  await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().paused);
  await frame();
}
async function resume(){
  await page.getByRole('button',{name:'Reprendre',exact:true}).click();
  await page.waitForFunction(()=>!window.__skinningCanopyQaV112.state().paused);
  await page.locator('canvas').last().focus();
}
async function reloadHunt(label){
  const before={documentId:await page.evaluate(()=>window.__skinningCanopyQaV112.documentId),state:await observation(),sidecar:await disk(),writes:await page.evaluate(()=>window.__skinningCanopyQaV112.writes)};
  assert.ok(before.sidecar?.snapshot,'Native sidecar must exist before a fresh document');
  await page.reload();
  await openCampaign();
  await page.waitForFunction(()=>window.__skinningCanopyQaV112?.runtime?.alive||[...document.querySelectorAll('button')].some(button=>/^Reprendre la chasse :/.test(button.getAttribute('aria-label')??'')));
  const titleResume=page.getByRole('button',{name:/^Reprendre la chasse :/});
  if(await titleResume.count())await titleResume.click();
  await page.waitForFunction(()=>window.__skinningCanopyQaV112?.runtime?.alive&&window.__skinningCanopyQaV112.state().resumed&&window.__skinningCanopyQaV112.state().paused);
  const after={documentId:await page.evaluate(()=>window.__skinningCanopyQaV112.documentId),state:await observation(),sidecar:await disk(),mounts:await page.evaluate(()=>window.__skinningCanopyQaV112.mounts)};
  assert.notEqual(after.documentId,before.documentId,'A new document, not an in-memory remount');
  assert.notEqual(after.sidecar.runId,before.sidecar.runId,'Native GameClient claims a new writer identity');
  assert.equal(after.sidecar.startedAt,before.sidecar.startedAt);
  assert.equal(after.sidecar.ownerSaveCreatedAt,before.sidecar.ownerSaveCreatedAt);
  assert.ok(after.sidecar.sequence>=before.sidecar.sequence);
  assert.ok(after.mounts.every(item=>item.resumed),'The resumed document must not seed another prey');
  assert.deepEqual(after.state.rites,before.sidecar.snapshot.checkpoint.huntRites,'Physical body, finite parts, quality, stashes and operation restore from disk');
  assert.equal(after.state.elapsed,before.sidecar.snapshot.checkpoint.elapsed,'No offline simulation progress');
  await writeFile(path.join(out,label+'-reload.json'),JSON.stringify({before,after},null,2)+'\n');
  return{before,after};
}
async function newCase(kind){
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  await context.addInitScript(({save,key})=>{
    if(localStorage.length===0)localStorage.setItem(key,JSON.stringify(save));
  },{save:admission,key:storageKey});
  page=await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror',error=>report.errors.push({case:kind,error:String(error)}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?case='+kind);
  await page.bringToFront();
  await launch();
  report.cases[kind]={initial:await observation()};
}
async function performTrophyRite(){
  const keys={left:'ArrowLeft',right:'ArrowRight',melee:'KeyJ',interact:'KeyE'};
  const opening=await page.evaluate(()=>window.__skinningCanopyQaV112.runtime.game.trophyRitual);
  assert.ok(opening?.sequence.length);
  const inputs=[];
  for(let index=0;index<opening.sequence.length;index++){
    await page.waitForFunction(({seed,index})=>{
      const rite=window.__skinningCanopyQaV112.runtime.game.trophyRitual;
      return rite?.seed===seed&&rite.cueIndex===index&&rite.phase==='cue'&&rite.cueElapsedSeconds>=.34;
    },{seed:opening.seed,index});
    const gesture=opening.sequence[index];
    assert.ok(keys[gesture]);
    await page.keyboard.press(keys[gesture]);
    inputs.push({index,gesture});
    await page.waitForFunction(({seed,index})=>{
      const rite=window.__skinningCanopyQaV112.runtime.game.trophyRitual;
      return !rite||rite.seed!==seed||rite.cueIndex>index;
    },{seed:opening.seed,index});
  }
  return inputs;
}
async function canopy(){
  await newCase(field.caseId);
  const data=report.cases[field.caseId],initial=await observation();
  assert.equal(initial.missionId,field.missionId);
  assert.equal((await campaign()).missionProgress[field.missionId].completions,admission.missionProgress[field.missionId].completions);
  const rests=initial.world.platforms.filter(platform=>platform.id.startsWith('v112-canopy-'+field.missionId+'-0-')).sort((a,b)=>a.x-b.x);
  const entry=initial.world.climbables.find(support=>support.id===rests[0]?.id.replace('-rest','-grip'));
  const flexible=initial.world.climbables.find(support=>support.id===rests[1]?.id.replace('-rest','-grip'));
  const next=initial.world.climbables.find(support=>support.id===rests[2]?.id.replace('-rest','-grip'));
  assert.ok(entry&&flexible&&next);
  const held=new Set(),key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'Space'};
  const hold=async(actions,reason,decision=null)=>{
    const wanted=new Set(actions);
    for(const action of held)if(!wanted.has(action)){await page.keyboard.up(key[action]);held.delete(action);}
    for(const action of wanted)if(!held.has(action)){await page.keyboard.down(key[action]);held.add(action);}
    data.inputs.push({elapsed:decision?.elapsed??(await observation()).elapsed,actions:[...wanted],reason});
  };
  const until=async(name,limit,choose)=>{
    const started=Date.now(),initialElapsed=(await observation()).elapsed;
    const budget={name,simulationLimitSeconds:limit/1000,wallGuardMs:Math.max(limit*6,30000),initialElapsed};
    data.stageBudgets.push(budget);
    let lastSample=-1,lastState;
    while(Date.now()-started<budget.wallGuardMs){
      const state=await observation();
      lastState=state;
      assert.equal(state.paused,false,name+': native pause prevents progress');
      assert.notEqual(state.phase,'dead',name+': hunter must remain alive');
      if(state.elapsed-initialElapsed>budget.simulationLimitSeconds)break;
      if(Math.floor(state.elapsed*5)!==lastSample){
        lastSample=Math.floor(state.elapsed*5);data.samples.push({stage:name,elapsed:state.elapsed,phase:state.phase,player:state.player,canopyGripContact:state.canopyGripContact});
        await writeFile(path.join(out,'canopy-progress.json'),JSON.stringify({stage:name,elapsed:state.elapsed,wallMs:Date.now()-started,player:state.player,held:[...held]},null,2)+'\n');
      }
      if(state.player.grounded&&state.player.health<state.player.maxHealth*.5&&state.player.medicomps>0&&state.player.healCooldown<=0){
        await page.keyboard.press('KeyH');
        data.heals.push({elapsed:state.elapsed,healthBefore:state.player.health,medicompsBefore:state.player.medicomps,kind:'NATIVE_FINITE_MEDICOMP'});
      }
      if(await choose(state)){
        Object.assign(budget,{nativeElapsed:state.elapsed-initialElapsed,wallElapsedMs:Date.now()-started,completed:true});
        return state;
      }
      await page.waitForTimeout(20);
    }
    Object.assign(budget,{nativeElapsed:(lastState?.elapsed??initialElapsed)-initialElapsed,wallElapsedMs:Date.now()-started,completed:false});
    throw Error('Timed out native canopy stage '+name+' after '+budget.nativeElapsed.toFixed(3)+' simulated seconds / '+budget.wallElapsedMs+' wall ms');
  };
  data.inputs=[];data.samples=[];data.heals=[];data.stageBudgets=[];data.contactMeasurements=[];data.authored={rests,entry,flexible,next};
  const contact=(state,stage)=>{
    assert.ok(state.canopyGripContact,'A real held pendulum must expose its rear-hand contact');
    assert.ok(state.canopyGripContact.distancePx<=1,'Rear palm follows the real held physical point within1 world pixel');
    data.contactMeasurements.push({stage,...state.canopyGripContact});
    return state.canopyGripContact;
  };
  await page.locator('canvas').last().focus();
  let cargo,secondary;
  await check(field.name+' begins with a real harvest and original geometry at the canonical insertion',async()=>{
    assert.ok(Math.abs(initial.player.x-initial.world.spawn.x)<2);
    assert.equal(initial.fieldLoad.movementMultiplier,1);
    assert.equal(initial.fieldLoad.climbStaminaMultiplier,1);
    const setups=await page.evaluate(()=>window.__skinningCanopyQaV112.setups);
    assert.equal(setups.length,1);
    assert.equal(setups[0].sourceEnemyId,field.prey);
    assert.ok(setups[0].originalEnemyIds.every(id=>initial.enemies.some(enemy=>enemy.id===id)));
    assert.ok(initial.world.hazards.some(hazard=>hazard.damagePerSecond>0));
    assert.equal(entry.kind,'tree');assert.equal(flexible.kind,'vine');assert.equal(next.kind,'vine');
    assert.ok(rests.every(rest=>rest.material==='root'&&rest.collision==='one-way'));
    const art=await page.waitForFunction(id=>window.__skinningCanopyQaV112.trophyDraws.get(id),field.trophy);
    const paintedTrophy=await art.jsonValue();
    await art.dispose();
    assert.ok(paintedTrophy.src.endsWith('/'+field.trophy+'.webp'));
    assert.equal(paintedTrophy.width,256);
    assert.equal(paintedTrophy.height,256);
    const campaignTrophies=(await campaign()).trophies;
    await capture('00a-native-secondary-trophy-art');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(()=>Boolean(window.__skinningCanopyQaV112.runtime.game.regularTrophyDropId));
    const riteKeys=await performTrophyRite();
    const claimed=await observation();
    const drop=claimed.secondaryDrops.find(item=>item.sourceEnemyId===field.prey);
    assert.equal(drop?.collected,true);
    assert.equal(drop.name,field.trophyName);
    secondary=drop.claim;
    assert.equal(claimed.phase,'tracking');
    assert.deepEqual((await campaign()).trophies,campaignTrophies);
    await capture('00-native-secondary-trophy');
    await page.getByRole('button',{name:'Examiner la proie vaincue',exact:true}).click();
    const flay=page.locator('[data-rite-action-v112="flay"]');
    for(let attempt=0;attempt<16&&await flay.isDisabled();attempt++){
      const state=await observation();
      const positive=state.rites.corpses[0].x>state.player.x+state.player.width/2;
      await page.locator('canvas').last().focus();
      await page.keyboard.press(positive?'ArrowRight':'ArrowLeft',{delay:45});
      await page.waitForTimeout(100);
    }
    await page.locator('[data-rite-action-v112="analyze"]').click();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().rites.corpses[0]?.analyzed);
    await flay.click();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().rites.corpses[0]?.flayed);
    const menu=page.getByRole('button',{name:'Examiner la proie vaincue',exact:true});
    if(await menu.count())await menu.click();
    await page.locator('[data-rite-action-v112="harvest-hide"]').click();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().rites.specimensV112.length===1);
    const loaded=await observation();
    [cargo]=loaded.rites.specimensV112;
    assert.equal(cargo.label,field.hide);
    assert.equal(cargo.massKg,field.massKg);
    assert.equal(cargo.volumeUnits,3);
    assert.ok(loaded.fieldLoad.movementMultiplier<1);
    assert.ok(loaded.fieldLoad.climbStaminaMultiplier>1);
    await capture('01-native-hide');
    return {cargo,secondary,paintedTrophy,riteKeys,empty:initial.fieldLoad,loaded:loaded.fieldLoad};
  });
  const assertCargo=state=>{
    assert.deepEqual(state.rites.specimensV112,[cargo]);
    assert.deepEqual(state.secondaryDrops.filter(item=>item.collected).map(item=>item.claim),[secondary]);
    assert.equal(state.rites.carryingCorpseId,null);
    assert.ok(state.fieldLoad.movementMultiplier<1&&state.fieldLoad.climbStaminaMultiplier>1);
  };

  if(naraka)await check('the loaded ground checkpoint reopens in a new campaign document',async()=>{
    await pause();
    const transition=await reloadHunt('02-charged-ground');
    assertCargo(transition.after.state);
    assert.equal(transition.after.state.player.grounded,true);
    assert.equal(transition.after.state.player.climbing,false);
    assert.equal(transition.after.state.player.x,transition.before.sidecar.snapshot.checkpoint.player.x);
    await capture('02-charged-ground-restored');
    await resume();
    return {player:transition.after.state.player,load:transition.after.state.fieldLoad};
  });
  const stashAndResume=async(landed,rested)=>{
    assertCargo(rested);
    await pause();
    const before=await campaign();
    await page.getByRole('button',{name:'Déposer · '+field.hide,exact:false}).click();
    const deposited=await observation();
    const [stash]=deposited.rites.stashedSpecimensV112;
    assert.equal(stash.specimenId,cargo.id);
    assert.equal(stash.y,landed.y);
    assert.ok(stash.x>=landed.x&&stash.x<=landed.x+landed.width);
    assert.equal(deposited.fieldLoad.massKg,0);
    assert.deepEqual(deposited.secondaryDrops.filter(item=>item.collected).map(item=>item.claim),[secondary]);
    await capture('14a-native-deposit-on-root');
    const transition=await reloadHunt('14-charged-rest');
    assert.deepEqual(transition.after.state.rites.stashedSpecimensV112,[stash]);
    assert.equal(transition.after.state.fieldLoad.massKg,0);
    assert.deepEqual(await campaign(),before);
    await page.getByRole('button',{name:'Reprendre · '+field.hide,exact:false}).click();
    const recovered=await observation();
    assertCargo(recovered);
    assert.deepEqual(recovered.rites.stashedSpecimensV112,[]);
    assert.deepEqual(recovered.rites.completedEventIds,deposited.rites.completedEventIds);
    assert.deepEqual(await campaign(),before);
    assert.equal(transition.after.state.player.grounded,true);
    assert.equal(transition.after.state.player.climbing,false);
    assert.equal(transition.after.state.player.y,transition.before.sidecar.snapshot.checkpoint.player.y);
    await resume();
    const recoveredRest=await until('stamina recovery on the real rest',2500,async state=>state.player.grounded&&
      (state.player.stamina>transition.after.state.player.stamina||state.player.stamina===state.player.maxStamina));
    await capture('14-native-loaded-rest');
    return {rest:landed.id,stash,before:rested.player,after:recoveredRest.player};
  };
  await page.locator('canvas').last().focus();
  await page.keyboard.press('KeyC');
  let lastX=initial.player.x,lastMotion=0,hopUntil=0;
  await until('approach entry tree',25000,async state=>{
    const {player,elapsed}=state;
    const dx=entry.x+entry.width/2-player.x-player.width/2;
    if(Math.abs(dx)<10){await hold(['up'],'grasp the authored entry tree',state);return true;}
    const direction=dx>0?'right':'left';
    if(naraka){
      if(Math.abs(player.x-lastX)>.8)lastMotion=elapsed;
      lastX=player.x;
      if(player.grounded&&Math.abs(dx)>55&&elapsed>=hopUntil&&elapsed-lastMotion>.6)hopUntil=elapsed+.25;
      if(elapsed<hopUntil){await hold([direction,'jump'],'jump around a real shore obstacle',state);return false;}
    }
    await hold([direction],'walk from canonical insertion',state);return false;
  });
  await until('climb above first branch',18000,async state=>{
    await hold(['up'],'native ascent',state);
    return state.player.climbing&&state.player.climbZoneId===entry.id&&state.player.y+state.player.height<=rests[0].y-18;
  });
  await hold([],'release ascent while inspecting the real navigation HUD');
  await check('near the real entry tree the compact HUD exposes its mapped controls and authored landmarks',async()=>{
    await page.locator('[data-canopy-hud-v112]').waitFor();
    await page.getByText('Commandes et repères de traversée',{exact:true}).click();
    await page.locator('[data-canopy-next-v112]').waitFor({state:'visible'});
    await page.locator('[data-canopy-rest-v112]').waitFor({state:'visible'});
    const text=await page.locator('[data-canopy-hud-v112]').innerText();
    assert.match(text,/Direction \+ Saut/);
    assert.match(text,/Prise suivante/);
    assert.match(text,/Repos repéré|Appui atteint/);
    await page.getByText('Commandes et repères de traversée',{exact:true}).click();
    await capture('08b-native-entry-canopy-hud');
    await page.locator('canvas').last().focus();
    return{text,player:(await observation()).player};
  });
  await hold(['right'],'directional release from rigid trunk');
  await until('leave the rigid trunk',3000,async state=>!state.player.climbing);
  await hold([],'settle onto the real branch');
  await check('native entry-tree release lands on the first authored rest before exhaustion',async()=>{
    const landed=await until('first rest contact',4000,async state=>state.player.grounded);
    assert.ok(Math.abs(landed.player.y+landed.player.height-rests[0].y)<2);
    assert.ok(landed.player.stamina>0);
    assertCargo(landed);
    await capture('09-first-native-rest');
    return{player:landed.player,hud:await page.locator('[data-canopy-hud-v112]').innerText()};
  });
  if(naraka){
    await check('a Naraka root secures a deposited hide across a new document',async()=>{
      const rested=await observation(),root=rests[0];
      assert.equal(rested.player.grounded,true);
      assert.equal(rested.player.climbing,false);
      assert.ok(Math.abs(rested.player.y+rested.player.height-root.y)<2);
      return stashAndResume(root,rested);
    });
  }else{
    await hold(['right','jump'],'jump from first branch toward the flexible support rest');
    await until('second rest approach',4000,async state=>{
      const center=state.player.x+state.player.width/2;
      if(center>=rests[1].x+rests[1].width/2-20)await hold(['jump'],'release horizontal steering above the rest',state);
      return state.player.grounded&&Math.abs(state.player.y+state.player.height-rests[1].y)<2;
    });
    await hold([],'acknowledge jump release at second rest');await frame();
    await hold(['up'],'grasp and shorten the real flexible support');
    await until('climb flexible support',15000,async state=>state.player.climbing&&state.player.climbZoneId===flexible.id&&state.player.y+state.player.height*.28-flexible.y<=120);
    await hold(['right'],'activate the real pendulum');
    await until('attach pendulum',3000,async state=>Boolean(state.player.canopySwing));
    await hold([],'neutral pendulum before its durable checkpoint');
    await check('actual pendulum snapshot survives sidecar claim and a new document without an extra impulse',async()=>{
      await pause();
      const transition=await reloadHunt('10-pendulum');
      assert.deepEqual(transition.after.state.player.canopySwing,transition.before.sidecar.snapshot.checkpoint.player.canopySwing);
      assert.equal(transition.after.state.player.velocityX,transition.before.sidecar.snapshot.checkpoint.player.velocityX);
      assert.equal(transition.after.state.player.velocityY,transition.before.sidecar.snapshot.checkpoint.player.velocityY);
      assert.equal(transition.after.state.player.climbZoneId,flexible.id);
      assertCargo(transition.after.state);
      contact(transition.after.state,'restored-pendulum-paused');
      await capture('10-pendulum-restored-paused');
      return{player:transition.after.state.player,runIdChanged:true};
    });
    await resume();await frame();
    await check('alternating native direction pumps the restored pendulum with bounded energy and readable controls',async()=>{
      const ready=await until('native pendulum pump',18000,async state=>{
        const swing=state.player.canopySwing;assert.ok(swing,'The real support must remain held while pumping');
        if(swing.angle>.5&&swing.angularVelocity>1.2)return true;
        await hold([swing.angularVelocity>=0?'right':'left'],'pump in the actual angular direction',state);return false;
      });
      assert.ok(ready.player.stamina>0&&ready.player.stamina<ready.player.maxStamina);
      contact(ready,'pumped-pendulum-before-capture');
      assertCargo(ready);
      const pace=await page.locator('[data-canopy-loaded-pace-v112]').innerText();
      assert.ok(pace.includes('réglage de la longueur'));
      assert.ok(pace.includes(Math.round(ready.fieldLoad.movementMultiplier*100)+' %'));
      data.beforeRelease=ready;
      await capture('11-native-pumped-pendulum');
      contact(await observation(),'pumped-pendulum-after-capture');
      return{player:ready.player,cue:await page.locator('[data-canopy-cue-v112]').innerText()};
    });
    // Captures deliberately keep the simulation running. Choose a NEW physical
    // release window afterwards, then send the trusted keydown immediately.
    await until('choose a fresh positive release phase after capture',18000,async state=>{
      const swing=state.player.canopySwing;
      assert.ok(swing,'The original real support must remain held before release');
      const tangentX=Math.cos(swing.angle)*swing.length*swing.angularVelocity;
      const oldReachable=state.reachableSupportIds.includes(flexible.id);
      if(swing.angle>=.15&&swing.angle<=.8&&swing.angularVelocity>0&&tangentX>=300&&held.has('right')){
        data.actualReleaseDecision={elapsed:state.elapsed,player:state.player,tangentX,oldReachable};
        {
          const released = page.waitForFunction(() => {
            const player = window.__skinningCanopyQaV112.runtime?.game.player;
            return !player?.climbing && player?.climbReattachSeconds > 0.12 ? player.climbReattachSeconds : false;
          }, null, {polling:'raf',timeout:2000});
          await page.keyboard.down('Space');held.add('jump');
          const ready = await released;
          data.bufferedPress = {releaseSeconds:await ready.jsonValue(), pressedForMs:16};
          await ready.dispose();
          await page.keyboard.press('ArrowUp',{delay:16});
        }
        return true;
      }
      await hold([swing.angularVelocity>=0?'right':'left'],'pump to a fresh rightward release window after capture',state);
      return false;
    });
    await check('a native Up tap catches the next Oseris-IV liana with the same cargo',async()=>{
      assert.ok(data.bufferedPress.releaseSeconds>0.12);
      const caught=await until('loaded next-vine catch',5000,
        async state=>state.player.climbing&&state.player.climbZoneId===next.id);
      assert.equal(caught.inputs.keyboard.includes('up'),false);
      assert.equal(caught.player.aerialBoostUsed,false);
      assert.equal(caught.canopyTransfer,null);
      assertCargo(caught);
      await hold([],'stop steering after the catch');
      await capture('13-native-loaded-next-vine');
      return {from:flexible.id,to:next.id,player:caught.player,load:caught.fieldLoad};
    });
    await check('the loaded hunter can disengage onto a real rest and recover there after reloading',async()=>{
      await hold(['up'],'raise the hunter above the next root rest');
      await until('raise over the third rest',5000,async state=>state.player.climbing&&state.player.climbZoneId===next.id&&state.player.y+state.player.height<rests[2].y-22);
      await hold(['left'],'start a shallow swing for a voluntary dismount');
      await until('shallow dismount swing',2000,async state=>Boolean(state.player.canopySwing));
      await hold(['jump'],'release with the real tangent and no steering');
      await until('release acknowledgement',2000,async state=>!state.player.climbing);
      await hold([],'coast down to the root rest');
      const rested=await until('native safe root rest',5000,async state=>state.player.grounded);
      const feet=rested.player.y+rested.player.height;
      const landed=rests.find(rest=>Math.abs(rest.y-feet)<2&&rested.player.x+rested.player.width>rest.x&&rested.player.x<rest.x+rest.width);
      assert.equal(landed?.id,rests[2].id,'Native landing must be on the return junction');
      return stashAndResume(landed,rested);
    });
    await check('Oseris-IV offers a westward return by branch jumps with the same specimen',async()=>{
      const returnLegs=[];
      for(const target of [rests[1],rests[0]]){
        const before=await observation();
        const center=target.x+target.width/2;
        await hold(['left','jump'],'choose the western return by a physical jump, with Up released');
        const landed=await until('westward branch jump to '+target.id,5000,async state=>{
          const middle=state.player.x+state.player.width/2;
          if(middle<=center+21)await hold(['jump'],'coast onto the western branch',state);
          return state.player.grounded&&Math.abs(state.player.y+state.player.height-target.y)<2&&
            state.player.x+state.player.width>target.x&&state.player.x<target.x+target.width;
        });
        await hold([],'release jump before choosing the following branch');
        await frame();
        assert.equal(landed.player.climbing,false);
        assert.equal(landed.player.aerialBoostUsed,false);
        assert.ok(landed.player.x<before.player.x);
        assertCargo(landed);
        returnLegs.push({rest:target.id,player:landed.player});
      }
      await pause();
      const transition=await reloadHunt('15-oseris-return-west');
      assertCargo(transition.after.state);
      assert.equal(transition.after.state.player.grounded,true);
      assert.equal(transition.after.state.player.climbing,false);
      assert.ok(Math.abs(transition.after.state.player.y+transition.after.state.player.height-rests[0].y)<2);
      await resume();
      await capture('15-native-return-west');
      return {returnLegs,checkpointRest:rests[0].id,player:(await observation()).player};
    });
  }
  await check('the entry tree allows retreat below canopy with the harvest intact',async()=>{
    const first=rests[0];
    const center=entry.x+entry.width/2;
    await until('approach the native entry trunk for descent',3000,async state=>{
      const dx=center-state.player.x-state.player.width/2;
      if(Math.abs(dx)<15)return true;
      await hold([dx>0?'right':'left'],'approach the entry trunk on the real root',state);
      return false;
    });
    await hold(['down'],'grip the trunk and descend below its one-way root');
    const below=await until('descend using the real entry trunk',4500,async state=>
      state.player.climbing&&state.player.climbZoneId===entry.id&&state.player.y+state.player.height>=first.y+65);
    assertCargo(below);
    await hold(['right'],'release the rigid entry trunk toward the interior');
    await until('acknowledge voluntary trunk release',2000,async state=>!state.player.climbing);
    await hold([],'land below the root with no boost');
    const lower=await until('return to a lower surface below the canopy',5000,async state=>
      state.player.grounded&&(naraka?Math.abs(state.player.y+state.player.height-state.world.floorY)<2:state.player.y+state.player.height>=first.y+60));
    await hold([],'stop moving on the lower surface');
    assertCargo(lower);
    assert.ok(lower.player.health>0);
    assert.equal(lower.player.climbing,false);
    assert.equal(lower.player.aerialBoostUsed,false);
    const foot=lower.player.y+lower.player.height;
    const platform=lower.world.platforms.find(item=>Math.abs(item.y-foot)<2&&lower.player.x+lower.player.width>item.x&&lower.player.x<item.x+item.width);
    assert.ok(platform||Math.abs(foot-lower.world.floorY)<2);
    await capture('16-native-western-recovery');
    return {player:lower.player,reception:platform?.id??'floor',releaseFrom:entry.id,phase:lower.phase};
  });
  await check('native canvas uses the exact root texture at the chosen collision platforms',async()=>{
    const draws=await page.evaluate(()=>[...window.__skinningCanopyQaV112.rootDraws.entries()]);
    const byId=new Map(draws);
    for(const rest of rests){
      const draw=byId.get(rest.id);
      assert.ok(draw?.width>0&&draw?.height>0,rest.id);
      assert.equal(new URL(draw.src).pathname,'/game/props/v4/root-platform.png');
    }
    return {draws:rests.map(rest=>[rest.id,byId.get(rest.id)])};
  });
  await check('the uninterrupted ground leg brings the hide and local trophy to a real Apex rite and the loaded beacon',async()=>{
    const prepared=await page.evaluate(()=>window.__skinningCanopyQaV112.prepareApex());
    assert.deepEqual(prepared.before.player,prepared.after.player);
    assert.deepEqual(prepared.before.rites,prepared.after.rites);
    assert.equal(prepared.after.phase,'trophy');
    assert.equal(prepared.after.primaryClaim,null);
    const start=await observation();
    assertCargo(start);
    let prevX=start.player.x,lastClear=0,clearUntil=0;
    const walk=async (label,limit,target,arrived)=>{
      return until(label,limit,async state=>{
        if(arrived(state)){await hold([],'stop at the real '+label,state);return true;}
        const p=state.player,center=p.x+p.width/2,point=target(state);
        if(Math.abs(p.x-prevX)>.8)lastClear=state.elapsed;
        prevX=p.x;
        const direction=point>center?'right':'left';
        const walkAction=Math.abs(point-center)>12?[direction]:[];
        if(p.grounded&&state.elapsed>=clearUntil&&Math.abs(point-center)>30&&state.elapsed-lastClear>.6){
          clearUntil=state.elapsed+.35;
          await hold([...walkAction,'jump'],'native hop around a real obstacle',state);
        }else if(state.elapsed>=clearUntil){
          await hold(walkAction,'follow the visible mission marker by ground',state);
        }
        return false;
      });
    };
    await page.keyboard.press('KeyC');
    const apex=await walk('reach the defeated Apex at its authored source',38000,
      state=>state.apexPoint.x,state=>state.apexInReach);
    assert.ok(apex.player.x-start.player.x>900,'Apex was approached via the physical map');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.runtime.game.trophyExtracting);
    const apexKeys=await performTrophyRite();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.runtime.game.phase==='extraction');
    const secured=await observation();
    assert.ok(secured.primaryClaim);
    assert.equal(secured.trophyCarried,true);
    assertCargo(secured);
    await capture('17-native-apex-claimed');
    await walk('beacon footing',25000,state=>state.world.extraction.x,state=>
      Math.abs(state.player.x+state.player.width/2-state.world.extraction.x)<35&&state.player.grounded&&
      Math.abs(state.player.y+state.player.height-state.world.extraction.y)<2&&state.ship?.phase==='hover');
    const ready=await observation();
    assertCargo(ready);
    await pause();
    const transition=await reloadHunt('18-charged-at-beacon');
    assertCargo(transition.after.state);
    assert.deepEqual(transition.after.state.primaryClaim,secured.primaryClaim);
    assert.equal(transition.after.state.ship.phase,'hover');
    assert.equal(transition.after.state.player.grounded,true);
    await resume();
    return {prepared,apexKeys,apex:secured.primaryClaim,beacon:ready.world.extraction,travel:ready.player.x-start.player.x};
  });
  await check('the beacon refuses an airborne request, then one grounded extraction delivers the trophy and the same hide',async()=>{
    const before=await campaign();
    await page.keyboard.down('Space');
    await page.waitForFunction(()=>{
      const g=window.__skinningCanopyQaV112.runtime.game;
      return !g.player.grounded&&g.player.y+g.player.height<=g.world.extraction.y-40;
    },null,{polling:'raf'});
    await page.keyboard.press('KeyE');
    await page.keyboard.up('Space');
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.runtime.game.message.includes('au pied de la balise'));
    assert.equal((await observation()).ship.phase,'hover');
    await until('land at the foot of the beacon',5000,async state=>state.player.grounded&&
      Math.abs(state.player.y+state.player.height-state.world.extraction.y)<2);
    await page.keyboard.press('KeyE');
    await page.locator('.debrief-actions').getByRole('button',{name:'Retour au vaisseau',exact:true}).waitFor();
    const saved=await campaign(),results=await page.evaluate(()=>window.__skinningCanopyQaV112.results);
    assert.equal(results.length,1);
    const [result]=results;
    assert.equal(result.outcome,'success');
    assert.deepEqual(result.specimensV112,[cargo]);
    assert.equal(result.trophyClaims.length,2);
    assert.deepEqual(result.trophyClaims.find(claim=>claim.id===secondary.id),secondary);
    assert.deepEqual(saved.inventory.harvestV112.specimens,[cargo]);
    assert.equal(saved.inventory.harvestV112.toolUseIds.length,2);
    assert.equal(saved.inventory.harvestV112.toolCondition,initialToolCondition-10);
    assert.equal(saved.missionProgress[field.missionId].completions,before.missionProgress[field.missionId].completions+1);
    assert.equal(saved.trophies.filter(trophy=>trophy.definitionId===secondary.definitionId).length,1);
    assert.equal(await disk(),null);
    await capture('19-native-trophies-and-hide-delivered');
    return {delivered:result.specimensV112,claims:result.trophyClaims,toolCondition:saved.inventory.harvestV112.toolCondition};
  });
  data.finalCampaign=await campaign();data.finalSidecar=await disk();
  await context.close();context=null;
}
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  report.browserExecuted=true;report.browserVersion=browser.version();
  await canopy();
  await check('all requested assets match this exact Git commit and include the authored root, trunk and vine',async()=>{
    const assets=[...requests.values()];
    for (const suffix of ['/tree-trunk.png','/root-platform.png','/vine-ladder.webp','/ruin-platform.png','/'+field.trophy+'.webp']){
      assert.ok(assets.some(asset=>asset.url.endsWith(suffix)&&asset.status===200&&asset.matchesHead),suffix);
    }
    assert.ok(assets.every(asset=>asset.status===200&&asset.matchesHead));
    return {assets:assets.length};
  });
  report.passed=report.errors.length===0&&report.checks.every(item=>item.status==='PASS');
  report.classification=report.passed?'BOUNDED_NATIVE_DURABLE_PASS':'FAILED_ATTEMPT';
}catch(error){
  report.failure=String(error.stack??error);report.classification='FAILED_ATTEMPT';
  if(page&&!page.isClosed()){
    try{report.failureState=await observation();report.failureSidecar=await disk();report.failureText=await page.locator('body').innerText();await capture('failure');}catch{/* preserve the original failure */}
  }
}finally{
  report.assets=[...requests.values()];report.assetFailures=report.assets.filter(item=>item.status!==200);
  if(report.assetFailures.length){report.passed=false;report.classification='FAILED_ATTEMPT';}
  report.finishedAt=new Date().toISOString();
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({passed:report.passed,classification:report.classification,checks:report.checks.length,captures:report.captures.length,failure:report.failure??null,report:path.join(out,'report.json')}));
if(!report.passed)process.exitCode=1;
