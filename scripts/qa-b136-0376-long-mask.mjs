#!/usr/bin/env node
/** Whole GameClient browser attempt. Only the observation function is injected
 * into HuntCanvas. Product buttons and real keyboard/mouse events own gameplay.
 * The initial fixture is the exact legacy defaultSave; no objective is seeded.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {promisify} from 'node:util';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {inspectNativeHunt20261109} from './lib/qa-native-hunt-inspection-20261109.mjs';

assert.notEqual(process.env.SITES_MANAGED_LINUX_CONTAINER,'1','Managed Sites requires its supported CUA preview; this runner is portable only.');
const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2),option=(key,fallback)=>argv.includes(key)?argv[argv.indexOf(key)+1]:fallback;
const out=path.resolve(root,option('--output','outputs/qa-hunt-campaign-browser-v112'));
const assetCache=path.resolve(root,option('--asset-cache','outputs/qa-hunt-campaign-browser-v112/source-cache'));
const inspectOnly=argv.includes('--inspect-only'),budget=Number(option('--wall-seconds','600'));
const maxRetries=Number(option('--max-retries','2'));
const harvestSpecies=option('--harvest-species',null),harvestAction=option('--harvest-action',null);
const skipHarvest=argv.includes('--skip-harvest'),requireHarvestWorkshop=argv.includes('--require-harvest-workshop');
assert.ok(!requireHarvestWorkshop||!skipHarvest,'a required workshop receipt needs field harvests');
assert.ok(harvestAction===null||['harvest-hide','harvest-tissue','harvest-bone'].includes(harvestAction),'use one real anatomical action');
const resumeHudSource=option('--resume-hud-source',null);
const requireComplete=argv.includes('--require-complete'),requireResume=argv.includes('--require-resume');
const requireIceUnderpass=argv.includes('--require-ice-underpass');
assert.ok(!(requireComplete||requireResume||requireIceUnderpass||requireHarvestWorkshop)||!inspectOnly&&!resumeHudSource,
  'campaign checks require the playable GameClient path');
assert.ok(budget>0&&budget<=7200);
assert.ok(Number.isSafeInteger(maxRetries)&&maxRetries>=0&&maxRetries<=10);
await mkdir(out,{recursive:true});
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const source=await readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8');
const gameClientSource=await readFile(path.join(root,'app/game/GameClient.tsx'),'utf8');
const git=promisify(execFile);
let revision=(await readFile(path.join(root,'.git/HEAD'),'utf8')).trim();
if(revision.startsWith('ref: ')){
  const ref=revision.slice(5);
  try{revision=(await readFile(path.join(root,'.git',ref),'utf8')).trim();}
  catch{revision=(await readFile(path.join(root,'.git/packed-refs'),'utf8')).split('\n').find(line=>line.endsWith(' '+ref))?.split(' ')[0];}
}
assert.match(revision,/^[a-f0-9]{40}$/,'source revision must be immutable');
const committedHunt=(await git('git',['show',revision+':app/game/HuntCanvas.tsx'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024})).stdout;
const committedClient=(await git('git',['show',revision+':app/game/GameClient.tsx'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024})).stdout;
const tree=(await git('git',['ls-tree','-r',revision,'--','app'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024})).stdout;
const baseBlobs=new Map(tree.trim().split('\n').map(line=>{const [meta,file]=line.split('\t');return[file,meta.split(' ')[2]];}));
const applicationSources=new Map();
function recordSource(file,contents){
  const name=path.relative(root,file),bytes=Buffer.from(contents),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  applicationSources.set(name,{file:name,sha256:hash(bytes),gitBlob:blob,matchesBaseCommit:baseBlobs.get(name)===blob});return contents;
}
const bootstrap=await build({stdin:{contents:'export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from "./app/game/save";export {GALAXY_NAVIGATION} from "./app/game/galaxyNavigation";export {MISSIONS} from "./app/game/data";',resolveDir:root,loader:'ts'},
  bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent'});
const mod={exports:{}};runInNewContext(bootstrap.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),TextEncoder});
const campaignSource=option('--campaign-source',null);
const campaignInputRaw=campaignSource?await readFile(path.resolve(root,campaignSource),'utf8'):null;
const campaignInput=campaignInputRaw?JSON.parse(campaignInputRaw):null;
const initial=mod.exports.defaultSave('2026-11-02T00:00:00.000Z');
assert.ok(campaignInput?.appearance?.chromaticsV113?.maskMaterialId==='phg-study-v131-alpha-ogre-biomask');
initial.appearance=campaignInput.appearance;
const storageKey=mod.exports.SAVE_STORAGE_KEY;
const normalized=mod.exports.parseSaveImport(JSON.stringify(initial)).save;
assert.ok(normalized,'The declared T04 start must pass the current campaign importer');
const admission=JSON.parse(JSON.stringify(normalized));
assert.equal(admission.appearance.chromaticsV113.maskMaterialId,campaignInput.appearance.chromaticsV113.maskMaterialId);
const totalCycles=Number(option('--cycles','10')), perCycle=Number(option('--seconds-per-cycle','3'));
const minimumWallMillisecondsPerCycle=18_000;
assert.ok(Number.isSafeInteger(totalCycles)&&totalCycles>=2&&totalCycles<=20);
assert.ok(Number.isSafeInteger(perCycle)&&perCycle>=3&&perCycle<=120);
const parsedAdmission=mod.exports.parseSaveImport(JSON.stringify(admission));
const routes=new Map(mod.exports.GALAXY_NAVIGATION.sectors.flatMap(sector=>sector.systems.flatMap(system=>system.bodies
  .flatMap(body=>body.missions.map(mission=>[mission.id,{sector,system,body,mission}])))));
const requested=option('--missions',mod.exports.MISSIONS.map(mission=>mission.id).join(',')).split(',');
assert.ok(requested.length&&requested.every(id=>routes.has(id)),'real requested campaign routes');
if(requireComplete||requireResume||requireHarvestWorkshop)assert.equal(new Set(requested).size,requested.length,'each required contract must be distinct');
if(requireIceUnderpass)assert.ok(requested.includes('ice-cryostalker'),'the ice underpass needs a real Cryostalker attempt');
const entry='import {createRoot} from "react-dom/client";import GameClient from "./app/game/GameClient";import "./app/globals.css";createRoot(document.getElementById("root")).render(<GameClient/>);';
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,metafile:true,
  format:'iife',platform:'browser',jsx:'automatic',outfile:'campaign.js',logLevel:'silent',external:['/game/*'],
  define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'verify-original-application-bytes',setup(builder){
    builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),
      contents:(await postcss([tailwind({base:root})]).process(recordSource(args.path,await readFile(args.path,'utf8')),{from:args.path})).css}));
    builder.onLoad({filter:/\/GameClient\.tsx$/},args=>({loader:'tsx',resolveDir:path.join(root,'app/game'),contents:recordSource(args.path,gameClientSource)}));
    builder.onLoad({filter:/\/app\/.*\.(tsx?|jsx?|json|css)$/},async args=>({
      loader:args.path.endsWith('.module.css')?'local-css':path.extname(args.path).slice(1),resolveDir:path.dirname(args.path),
      contents:recordSource(args.path,await readFile(args.path,'utf8'))}));
  }}]});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));
assert.ok(js&&css);
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja canonical campaign attempt</title><link rel="stylesheet" href="/campaign.css"><body><div id="root"></div><script src="/campaign.js"></script></body></html>';
const report={schema:1,generatedAt:new Date().toISOString(),sourceCommit:revision,
  sourceContext:{gitCommitIsBaseOnly:source!==committedHunt||gameClientSource!==committedClient,
    huntMatchesBaseCommit:source===committedHunt,gameClientMatchesBaseCommit:gameClientSource===committedClient,
    gameClientSourceSha256:hash(gameClientSource)},
  huntSourceSha256:hash(source),scope:'B136-0376. Native GameClient/HuntCanvas in portable Chromium, genuine key input and production pixels. The only fixture is the original adult start and the T04 Alpha/Ogre appearance. V8 CDP reads unmodified retained scope.',
  admission:{kind:campaignSource?'declared campaign continuation; inspect its parent evidence':'exact defaultSave in a fresh browser context',
    continuationSource:campaignSource,continuationSha256:campaignInputRaw?hash(campaignInputRaw):null,save:admission,sha256:hash(admission),
    parseSaveImport:{accepted:Boolean(parsedAdmission.save),failure:parsedAdmission.failure??null}},
  requestedMissionIds:requested,
  harvestSpeciesGoal:harvestSpecies,harvestActionGoal:harvestAction,skipHarvest,
  attempts:[],captures:[],errors:[],missingAssets:[],inputs:[],armoryTransactions:[],harvestAttempts:[],workshop:[],discoveryObservations:[],resumeObservations:[],routeObservations:[],qualification:'ATTEMPT_ONLY'};
report.sourceContext.applicationSources=[...applicationSources.values()].sort((a,b)=>a.file.localeCompare(b.file));
report.sourceContext.changedApplicationSources=report.sourceContext.applicationSources.filter(input=>!input.matchesBaseCommit).map(input=>input.file);
report.sourceContext.gitCommitIsBaseOnly=report.sourceContext.changedApplicationSources.length>0;
report.sourceContext.browserBundleSha256=hash(js.contents);report.sourceContext.stylesheetBundleSha256=hash(css.contents);
report.sourceContext.lockSha256=hash(await readFile(path.join(root,'package-lock.json')));
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const missing=new Set(),cached=new Map();
const pendingAssets=new Map();
async function sourceAsset(pathname){
  if(!pendingAssets.has(pathname))pendingAssets.set(pathname,(async()=>{
    const cachedPath=path.resolve(assetCache,'.'+pathname);
    let bytes;try{bytes=await readFile(cachedPath);}catch{
      // Sparse checkout materialization only: the immutable Git blob is served
      // byte-for-byte, with no substitution, image editing or generated asset.
      bytes=(await git('git',['show',revision+':public'+pathname],{cwd:root,encoding:'buffer',maxBuffer:32*1024*1024})).stdout;
      await mkdir(path.dirname(cachedPath),{recursive:true});await writeFile(cachedPath,bytes);
    }
    const expected=(await git('git',['rev-parse',revision+':public'+pathname],{cwd:root,encoding:'utf8'})).stdout.trim();
    const actual=createHash(expected.length===64?'sha256':'sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual,expected,'the cached asset must match its immutable source blob: '+pathname);
    cached.set(pathname,{url:pathname,sourceCommit:revision,gitBlob:actual,sha256:hash(bytes),bytes:bytes.length});return bytes;
  })());
  return pendingAssets.get(pathname);
}
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url??'/','http://localhost'),pathname=decodeURIComponent(url.pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  if(pathname==='/campaign.js'||pathname==='/campaign.css'){res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'text/javascript':'text/css'});res.end(pathname.endsWith('.js')?js.contents:css.contents);return;}
  const resolved=path.resolve(root,'public','.'+pathname);
  if(!resolved.startsWith(path.join(root,'public')+path.sep))throw new Error('outside public');
  let bytes;
  try{bytes=await readFile(resolved);}catch{
    bytes=await sourceAsset(pathname);
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]??'application/octet-stream'});res.end(bytes);
}catch{missing.add(req.url);res.writeHead(404);res.end();}});
let browser,page,context,inspection;
let stopRequested=false;process.on('SIGINT',()=>{stopRequested=true;});

async function enterCampaign(page){
  const menu=page.locator('[data-campaign-menu]'),session=page.locator('[data-campaign-session]');
  await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
  if(await menu.isVisible()){
    const campaign=page.locator('[data-menu-section="campaign"]');
    if(await campaign.isVisible())await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
  }
  await session.waitFor();
}

async function enterCampaignDeck(page){
  await enterCampaign(page);
  const play=page.getByRole('button',{name:'Jouer',exact:true});
  const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
  await play.or(shortcuts).first().waitFor();
  if(await play.isVisible())await play.click();
  await shortcuts.waitFor();
}

try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
  assert.ok(parsedAdmission.save,'Campaign admission rejected by parseSaveImport: '+parsedAdmission.failure);
  browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),args:['--no-sandbox']});
  report.browser=browser.version();
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,storageState:{
    cookies:[],origins:[{origin:'http://127.0.0.1:'+address.port,localStorage:[{name:storageKey,value:JSON.stringify(admission)}]}],
  }});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')report.errors.push('console.error: '+message.text());});
  report.abortedRequests=[];
  page.on('requestfailed',request=>{
    const name=request.failure()?.errorText;
    if(name==='net::ERR_ABORTED')report.abortedRequests.push(request.url());
    else report.errors.push('requestfailed: '+request.url()+' '+name);
  });
  await page.goto('http://127.0.0.1:'+address.port+'/',{waitUntil:'domcontentloaded'});
  await page.bringToFront();
  const capture=async name=>{const buffer=await page.screenshot({animations:'disabled'});await writeFile(path.join(out,name+'.png'),buffer);report.captures.push({file:name+'.png',sha256:hash(buffer),bytes:buffer.length});};
  await enterCampaignDeck(page);
  await capture('01-legacy-default-deck');
  await writeFile(path.join(out,'deck-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);

  const before=await saved();
  assert.deepEqual(before.appearance,admission.appearance);
  assert.equal(before.missionProgress['jungle-vey'].completions,0);
  const shortcut=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
  if(await shortcut.getAttribute('aria-expanded')!=='true')await shortcut.click();
  const direct=page.locator('[data-ship-shortcuts]');
  if(await direct.getAttribute('open')===null)await direct.locator('summary').click();
  await direct.locator('[data-ship-shortcut="galaxy-map"]').click();
  const galaxyRoot=page.locator('.galaxy-v10-breadcrumbs button').first();
  if(await galaxyRoot.isEnabled())await galaxyRoot.click();
  const route=routes.get('jungle-vey');
  assert.ok(route);
  for(const label of [route.sector.name,route.system.name,route.body.name]){
    await page.locator('.galaxy-v10-spatial-map button').filter({hasText:label}).first().click();
    await page.getByRole('button',{name:'Entrer',exact:true}).click();
  }
  await page.getByRole('button',{name:route.mission.title,exact:false}).first().click();
  await page.getByRole('button',{name:/^Préparer (la chasse|cette revisite)$/}).click();
  await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
  const skip=page.getByRole('button',{name:'Passer l’arrivée',exact:true});
  const startHunt=page.getByRole('button',{name:'Commencer la chasse',exact:true});
  await skip.or(startHunt).first().waitFor();
  if(await skip.isVisible())await skip.click();
  await startHunt.click();
  const canvas=page.locator('.hunt-screen canvas');
  await canvas.focus();
  inspection=await inspectNativeHunt20261109(page);
  report.nativeInspection=inspection.evidence;
  const sample=async()=>{
    const state=await inspection.read(), p=state.player;
    const fields={elapsed:state.elapsed,phase:state.phase,paused:state.paused,maskOn:p.maskOn,aiming:p.aiming,
      x:p.x,y:p.y,facing:p.facing,health:p.health,stamina:p.stamina,energy:p.energy,
      weaponAmmo:p.weaponAmmo,scanCooldown:p.scanCooldown,scans:state.scans,damageTaken:state.damageTaken,
      message:state.message?.text??state.message};
    assert.ok(['elapsed','health','x','y','energy','stamina'].every(key=>Number.isFinite(fields[key])));
    assert.ok(fields.health>0&&fields.phase!=='dead','native hunt must remain playable');
    return fields;
  };
  const waitFor=async predicate=>{
    const deadline=Date.now()+2500;
    while(Date.now()<deadline){
      const state=await sample();
      if(predicate(state))return state;
      await page.waitForTimeout(40);
    }
    assert.fail('Native state did not follow the input: '+JSON.stringify(await sample()));
  };
  const canvasCapture=async name=>{
    const png=await canvas.evaluate(node=>node.toDataURL('image/png'));
    const buffer=Buffer.from(png.split(',')[1],'base64');
    assert.ok(buffer.length>1024,'Real hunt canvas must return a rendered PNG');
    await writeFile(path.join(out,name+'.png'),buffer);
    report.captures.push({file:name+'.png',sha256:hash(buffer),bytes:buffer.length,scope:'actual Canvas.toDataURL'});
  };
  const pause=()=>page.getByRole('button',{name:'Mettre en pause, consulter la carte et le sac',exact:true}).click();
  const pauseDialog=()=>page.getByRole('dialog',{name:'Chasse en pause · Carte et sac',exact:true});

  const initialState=await sample();
  assert.equal(initialState.maskOn,true);
  assert.equal(initialState.paused,false);
  const anchor=initialState.x, atGround=initialState.y;
  const long=report.longMask={cycles:[],requestedCycles:totalCycles,requestedMaskedSeconds:totalCycles*perCycle,
    maskedSeconds:0,maskedWallMilliseconds:0,wallStartedAt:new Date().toISOString(),initialState,maskChecks:0,scanActivations:0,moveSamples:[]};
  await canvasCapture('02-mask-in-original-native-mission');

  for(let cycle=1;cycle<=totalCycles;cycle++){
    const on=await sample();
    assert.equal(on.maskOn,true);
    const shot=[1,Math.ceil(totalCycles/2),totalCycles].includes(cycle);
    await page.keyboard.press('Digit2');
    await page.keyboard.down('ShiftLeft');
    try{
      await waitFor(state=>state.aiming&&state.maskOn);
      await page.keyboard.press('KeyM');
      const off=await waitFor(state=>state.aiming&&!state.maskOn);
      if(shot)await canvasCapture('cycle-'+cycle+'-key-m-off-native');
      await page.keyboard.press('KeyM');
      const onAgain=await waitFor(state=>state.aiming&&state.maskOn);
      long.maskChecks+=2;
      if(shot)await canvasCapture('cycle-'+cycle+'-key-m-on-native');
      assert.ok(onAgain.elapsed>=off.elapsed);
      long.cycles.push({number:cycle,on,off,onAgain,samples:[],onAgainWallMilliseconds:Date.now()});
    }finally{
      await page.keyboard.up('ShiftLeft');
    }
    const active=long.cycles.at(-1);
    for(const key of ['ArrowRight','ArrowLeft']){
      const origin=await sample();
      await page.keyboard.down(key);
      try{await page.waitForTimeout(230);}finally{await page.keyboard.up(key);}
      const placed=await sample();
      long.moveSamples.push({cycle,key,before:origin,after:placed});
    }
    let last=await sample();
    for(let i=0;i<4&&Math.abs(last.x-anchor)>35;i++){
      const key=last.x>anchor?'ArrowLeft':'ArrowRight';
      await page.keyboard.down(key);
      try{await page.waitForTimeout(125);}finally{await page.keyboard.up(key);}
      last=await sample();
    }
    assert.ok(Math.abs(last.x-anchor)<180,'bounded native movement must remain near the landing route');
    const preScan=await sample();
    await page.keyboard.press('KeyV');
    const scan=await waitFor(state=>state.scanCooldown>0&&state.energy<preScan.energy);
    assert.equal(scan.maskOn,true);
    assert.ok(scan.energy<=preScan.energy-6,'Native active scan must spend suit energy');
    long.scanActivations++;
    active.scan={before:preScan,after:scan};
    const deadline=active.onAgainWallMilliseconds+90_000;
    const liveWall=()=>Date.now()-active.onAgainWallMilliseconds;
    while((last.elapsed-active.onAgain.elapsed<perCycle||liveWall()<minimumWallMillisecondsPerCycle)&&Date.now()<deadline){
      await page.waitForTimeout(1500);
      last=await sample();
      assert.equal(last.maskOn,true,'Biomask must stay on throughout the measured interval');
      assert.equal(last.paused,false);
      active.samples.push(last);
    }
    active.ranMaskedSeconds=last.elapsed-active.onAgain.elapsed;
    active.ranMaskedWallMilliseconds=liveWall();
    long.maskedSeconds+=active.ranMaskedSeconds;
    long.maskedWallMilliseconds+=active.ranMaskedWallMilliseconds;
    console.log(JSON.stringify({cycle,elapsed:last.elapsed,maskedSeconds:long.maskedSeconds,
      cycleMaskedSeconds:active.ranMaskedSeconds,cycleMaskedWallMilliseconds:active.ranMaskedWallMilliseconds,
      health:last.health,x:last.x,y:last.y,phase:last.phase}));
    assert.ok(active.ranMaskedSeconds>=perCycle&&active.ranMaskedWallMilliseconds>=minimumWallMillisecondsPerCycle,
      'Observed HuntCanvas elapsed cycle minimum was not met within the 90-second real budget');
    if(cycle===Math.ceil(totalCycles/2)){
      await pause();
      const frozen=await waitFor(state=>state.paused);
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(400);
      const later=await sample();
      assert.equal(later.paused,true);
      assert.equal(later.maskOn,true);
      assert.equal(later.elapsed,frozen.elapsed);
      long.pausedMidway={frozen,later};
      await pauseDialog().getByRole('button',{name:'Reprendre',exact:true}).click();
      await canvas.focus();
      await waitFor(state=>!state.paused&&state.maskOn&&state.elapsed>later.elapsed);
    }
  }

  assert.ok(long.maskedSeconds>=totalCycles*perCycle);
  assert.ok(long.maskedWallMilliseconds>=totalCycles*minimumWallMillisecondsPerCycle);
  assert.equal(long.maskChecks,totalCycles*2);
  assert.equal(long.scanActivations,totalCycles);
  assert.ok(long.moveSamples.some(data=>data.after.x-data.before.x>5));
  assert.ok(long.moveSamples.some(data=>data.before.x-data.after.x>5));
  const boundedStates=long.cycles.flatMap(cycle=>[cycle.on,cycle.off,cycle.onAgain,...cycle.samples]);
  long.resources={minHealth:Math.min(...boundedStates.map(row=>row.health)),
    maxDamageTaken:Math.max(...boundedStates.map(row=>row.damageTaken)),
    minEnergy:Math.min(...boundedStates.map(row=>row.energy)),maxEnergy:Math.max(...boundedStates.map(row=>row.energy)),
    minStamina:Math.min(...boundedStates.map(row=>row.stamina)),maxStamina:Math.max(...boundedStates.map(row=>row.stamina)),
    startY:atGround,minX:Math.min(...boundedStates.map(row=>row.x)),maxX:Math.max(...boundedStates.map(row=>row.x)),
    phases:[...new Set(boundedStates.map(row=>row.phase))],messages:[...new Set(boundedStates.map(row=>row.message).filter(Boolean))]};

  await pause();
  const frozen=await waitFor(state=>state.paused&&state.maskOn);
  await pauseDialog().getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).click();
  await canvas.waitFor({state:'detached'});
  const sidecarKey='yautja-long-hunt.active-hunt';
  const activeSidecar=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),sidecarKey);
  const sidecar=await activeSidecar();
  assert.equal(sidecar.missionId,'jungle-vey');
  assert.equal(sidecar.snapshot.checkpoint.player.maskOn,true);
  assert.equal(sidecar.snapshot.checkpoint.elapsed,frozen.elapsed);
  assert.deepEqual(sidecar.configuration.appearance,before.appearance);
  await writeFile(path.join(out,'native-suspended-sidecar.json'),JSON.stringify(sidecar,null,2)+'\n');
  await capture('03-native-suspended-return');
  await inspection.close(); inspection=null;
  await page.reload();
  await page.locator('[data-campaign-menu]').waitFor();
  assert.deepEqual(await activeSidecar(),sidecar);
  await enterCampaign(page);
  await canvas.waitFor();
  const unpause=pauseDialog().getByRole('button',{name:'Reprendre',exact:true});
  await unpause.waitFor();await unpause.click();await canvas.focus();
  inspection=await inspectNativeHunt20261109(page);
  const restored=await waitFor(state=>!state.paused&&state.maskOn);
  assert.ok(restored.elapsed>=frozen.elapsed&&restored.elapsed<frozen.elapsed+2,
    'Earliest frame after native checkpoint resume must keep elapsed time');
  assert.equal(restored.health,frozen.health);
  assert.ok(Math.abs(restored.x-frozen.x)<2);
  long.durableResume={missionId:sidecar.missionId,attempt:sidecar.encounterRun,before:frozen,after:restored,initialSidecarSha256:hash(sidecar)};
  await canvasCapture('04-native-canvas-after-reload-still-masked');
  await page.keyboard.press('KeyM');
  await waitFor(state=>!state.maskOn);
  await page.keyboard.press('KeyM');
  await waitFor(state=>state.maskOn);
  long.maskChecksAfterReload=2;
  const final=await saved();
  assert.deepEqual(final.appearance,before.appearance);
  assert.deepEqual(final.profile,before.profile);
  assert.deepEqual(final.trophies,before.trophies);
  assert.equal(final.missionProgress['jungle-vey'].completions,before.missionProgress['jungle-vey'].completions);
  assert.equal(report.sourceContext.gitCommitIsBaseOnly,false);
  assert.deepEqual(report.errors,[]);
  assert.deepEqual([...missing],[]);
  long.wallFinishedAt=new Date().toISOString();
  report.qualification='SUSTAINED_NATIVE_HUNT_MASK_CYCLES_AND_MASKED_DURABLE_RESUME';
  await context.storageState({path:path.join(out,'browser-storage-state.json'),indexedDB:true});
  report.browser=browser.version();report.finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),storageKey);
  await writeFile(path.join(out,'terminal-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
}catch(error){
  report.failure=String(error.stack??error);console.error(report.failure);
  if(page){try{await page.screenshot({path:path.join(out,'failure.png'),animations:'disabled'});await writeFile(path.join(out,'failure-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');}catch{ /* retain the original failure */ }}
}
finally{
  if(page)try{report.finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);report.activeHunt=await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.active-hunt')));}catch{ /* original failure retained */ }
  if(context)try{await context.storageState({path:path.join(out,'browser-storage-state.json'),indexedDB:true});}catch{ /* original failure retained */ }
  if(!inspectOnly&&!resumeHudSource){
    const attempted=new Map(report.attempts.map(attempt=>[attempt.missionId,attempt]));
    const durable=requested.filter(id=>attempted.get(id)?.settlement?.confirmed===true);
    const observedResumes=requested.filter(id=>report.resumeObservations.some(resume=>resume.missionId===id));
    const resumed=durable.filter(id=>attempted.get(id)?.suspendedAndReloaded===true);
    const harvestedAndArchived=durable.filter(id=>{
      const attempt=attempted.get(id);
      return report.workshop.some(entry=>entry.missionId===id&&entry.pausedAndReloaded&&
        attempt.delivered.some(item=>item.id===entry.specimen.id&&item.sourceId===entry.specimen.sourceId));
    });
    report.coverage={requested,durable,resumed,observedResumes,harvestedAndArchived,
      incomplete:requested.filter(id=>!durable.includes(id)),
      missingResume:requested.filter(id=>!resumed.includes(id))};
    if(durable.length===requested.length)report.qualification='BROWSER_HUNTS_AND_DURABLE_SETTLEMENT';
    if(requireComplete&&report.coverage.incomplete.length)report.requiredCoverageFailure='Contracts without durable success: '+report.coverage.incomplete.join(', ');
    if(requireResume&&report.coverage.missingResume.length){
      const problem='Contracts without durable success and observed sidecar resume: '+report.coverage.missingResume.join(', ');
      report.requiredCoverageFailure=[report.requiredCoverageFailure,problem].filter(Boolean).join('\n');
    }
    if(requireHarvestWorkshop&&harvestedAndArchived.length!==requested.length){
      const problem='Contracts without a delivered field specimen and resumed workshop archive: '+
        requested.filter(id=>!harvestedAndArchived.includes(id)).join(', ');
      report.requiredCoverageFailure=[report.requiredCoverageFailure,problem].filter(Boolean).join('\n');
    }
    if(requireHarvestWorkshop&&harvestedAndArchived.length===requested.length)
      report.qualification='BROWSER_HUNTS_HARVEST_AND_WORKSHOP';
    if(requireIceUnderpass&&!report.routeObservations.some(row=>row.missionId==='ice-cryostalker')){
      const problem='The closed thermal gate has no observed lower-route crossing';
      report.requiredCoverageFailure=[report.requiredCoverageFailure,problem].filter(Boolean).join('\n');
    }
  }
  report.missingAssets=[...missing];report.sourceCacheServed=[...cached.values()];await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await inspection?.close().catch(()=>undefined);
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log('Canonical browser attempt report: '+path.join(out,'report.json'));
if(report.requiredCoverageFailure)console.error(report.requiredCoverageFailure);
if(report.failure||report.requiredCoverageFailure)process.exitCode=1;
