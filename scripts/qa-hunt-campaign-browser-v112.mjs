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
import {decideHuntCampaignInputV112} from './lib/qa-hunt-campaign-input-v112.mjs';
import {decideGroundApexTrophyInputV112} from './lib/qa-hunt-ground-policy-v112.mjs';

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
// Byte views are hashed as bytes: a JSON spelling of the grown bundle exceeds V8's string limit.
const hash=value=>createHash('sha256').update(typeof value==='string'||ArrayBuffer.isView(value)?value:JSON.stringify(value)).digest('hex');
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
const admission=campaignInput?.finalSave??campaignInput??mod.exports.defaultSave('2026-11-02T00:00:00.000Z'),storageKey=mod.exports.SAVE_STORAGE_KEY;
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
  define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'read-only-hunt-observation',setup(builder){
    builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),
      contents:(await postcss([tailwind({base:root})]).process(recordSource(args.path,await readFile(args.path,'utf8')),{from:args.path})).css}));
    builder.onLoad({filter:/\/HuntCanvas\.tsx$/},()=>{
      const marker='    const fixedStep = 1 / 60;';
      assert.equal(source.split(marker).length,2,'exactly one native observation point');
      const observer=`
    window.__observeCanonicalHuntV112 = (slim = false) => {
      const target = game.phase === "trophy" && !game.trophyExtracting && !game.regularTrophyDropId
        ? activeTrophyHarvestTargetV111(game) : null;
      // A slim read leaves out heavy history the pilot never reads; evidence samples stay complete.
      const heavy = slim ? new Set(["lastCheckpoint", "tracks", "ecologyDeck", "goreParticles", "scentNodes", "honorEvents", "regularTrophyDrops"]) : null;
      return { alive, missionId: mission.id, encounterRun, slim,
        apexTrophy: target && { ...target, inReach: canContinueTrophyHarvestV111(game) },
        state: JSON.parse(JSON.stringify(game, function (key, value) {
          if (heavy && this === game && heavy.has(key)) return undefined;
          return value instanceof Set ? [...value] : value;
        })) };
    };
`;
      recordSource(path.join(root,'app/game/HuntCanvas.tsx'),source);
      return{loader:'tsx',resolveDir:path.join(root,'app/game'),contents:source.replace(marker,observer+marker)};
    });
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
  huntSourceSha256:hash(source),scope:'Whole GameClient in portable Chromium, exact legacy defaultSave admission; read-only hunt observation, real DOM/keyboard/mouse inputs. No nursery, phone, physical gamepad, artwork or performance qualification.',
  admission:{kind:campaignSource?'declared campaign continuation; inspect its parent evidence':'exact defaultSave in a fresh browser context',
    continuationSource:campaignSource,continuationSha256:campaignInputRaw?hash(campaignInputRaw):null,save:admission,sha256:hash(admission),
    parseSaveImport:{accepted:Boolean(parsedAdmission.save),failure:parsedAdmission.failure??null}},
  requestedMissionIds:requested,
  harvestSpeciesGoal:harvestSpecies,harvestActionGoal:harvestAction,skipHarvest,
  attempts:[],captures:[],errors:[],missingAssets:[],inputs:[],armoryTransactions:[],harvestAttempts:[],workshop:[],discoveryObservations:[],resumeObservations:[],routeObservations:[],apexTrophyObservations:[],qualification:'ATTEMPT_ONLY'};
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
let browser,page,context;
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

async function resumeCampaignHunt(page){
  await enterCampaign(page);
  await page.waitForFunction(()=>window.__observeCanonicalHuntV112?.().alive||
    [...document.querySelectorAll('button')].some(button=>button.textContent?.trim().startsWith('Reprendre la chasse')));
  // The deck button, never the in-hunt pause control that shares its accessible name.
  const deckResume=page.locator('button:not(.hunt-pause-button)').filter({hasText:/^\s*Reprendre la chasse/}).first();
  const mounted=()=>page.evaluate(()=>window.__observeCanonicalHuntV112?.().alive===true);
  if(!await mounted()&&await deckResume.isVisible()){
    try{await deckResume.click({timeout:5000});}
    catch(error){if(!await mounted())throw error;}
  }
  await page.waitForFunction(()=>window.__observeCanonicalHuntV112?.().alive);
}

try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
  assert.ok(parsedAdmission.save,'Campaign admission rejected by parseSaveImport: '+parsedAdmission.failure);
  browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),args:['--no-sandbox']});
  report.browser=browser.version();
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  await context.addInitScript(({save,key})=>{if(localStorage.length===0)localStorage.setItem(key,JSON.stringify(save));},{save:admission,key:storageKey});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')report.errors.push('console.error: '+message.text());});
  page.on('requestfailed',request=>report.errors.push('requestfailed: '+request.url()+' '+request.failure()?.errorText));
  await page.goto('http://127.0.0.1:'+address.port+'/',{waitUntil:'domcontentloaded'});
  await page.bringToFront();
  const capture=async name=>{const buffer=await page.screenshot({animations:'disabled'});await writeFile(path.join(out,name+'.png'),buffer);report.captures.push({file:name+'.png',sha256:hash(buffer),bytes:buffer.length});};
  await enterCampaignDeck(page);
  await capture('01-legacy-default-deck');
  await writeFile(path.join(out,'deck-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  const activateWithKeyboard=async button=>{
    await button.focus();
    await page.keyboard.press('Enter');
  };
  const openDirect=async stationId=>{
    const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
    if(await shortcuts.getAttribute('aria-expanded')!=='true')await shortcuts.click();
    const direct=page.locator('[data-ship-shortcuts]');
    await direct.waitFor();
    if(await direct.getAttribute('open')===null)await direct.locator('summary').click();
    await direct.locator('[data-ship-shortcut="'+stationId+'"]').click();
  };
  const backToDeck=()=>page.getByRole('button',{name:/^← Retour au pont/}).click();
  const acquireEarnedTool=async()=>{
    const before=await saved();
    if((before.inventory.fieldToolIds.includes('flaying-tool')||before.profile.clanMarks<120)&&
      ((before.inventory.armorUpgrades.hunter??0)>=2||before.profile.clanMarks<250))return;
    await openDirect('wall-armory');
    if(!before.inventory.fieldToolIds.includes('flaying-tool')&&before.profile.clanMarks>=120){
      await page.getByRole('article',{name:'Flaying Tool',exact:true}).getByRole('button',{name:'Acquérir · 120 marques',exact:true}).click();
      const after=await saved();assert.ok(after.inventory.fieldToolIds.includes('flaying-tool'));
      assert.equal(after.profile.clanMarks,before.profile.clanMarks-120);
      report.armoryTransactions.push({kind:'purchase-field-tool',cost:120,marksBefore:before.profile.clanMarks,marksAfter:after.profile.clanMarks});
    }
    const hunter=page.locator('article.equipment-card').filter({has:page.getByRole('heading',{name:'Armure Hunter',exact:true})});
    const upgrade=hunter.getByRole('button',{name:/^Améliorer au niveau/});
    if(await upgrade.count()&&await upgrade.isEnabled()){
      const prior=await saved();await upgrade.click();const after=await saved();
      assert.equal(after.inventory.armorUpgrades.hunter,prior.inventory.armorUpgrades.hunter+1);
      assert.ok(after.profile.clanMarks<prior.profile.clanMarks);
      report.armoryTransactions.push({kind:'purchase-hunter-upgrade',level:after.inventory.armorUpgrades.hunter,
        marksBefore:prior.profile.clanMarks,marksAfter:after.profile.clanMarks});
    }
    await capture('earned-flaying-tool');await backToDeck();
  };
  const conserveRealSpecimen=async({missionId,delivered,returnMarks})=>{
    const admissionSave=await saved();
    const target=delivered[0]??(!requireHarvestWorkshop?admissionSave.inventory.harvestV112.specimens[0]:null);
    if(!target)return;
    await openDirect('trophy-hall');
    const card=page.locator('[data-specimen-id-v112='+JSON.stringify(target.id)+']');
    let pausedAndReloaded=false;const actions=[];
    for(let step=0;step<40;step++){
      const state=await saved(),ledger=state.inventory.harvestV112,item=ledger.specimens.find(value=>value.id===target.id);
      if(!item)break;
      const job=ledger.jobs.find(value=>value.specimenId===item.id&&value.status!=='completed');
      if(job&&!pausedAndReloaded&&job.unitsDone===1){
        await activateWithKeyboard(card.getByRole('button',{name:/^Suspendre sans perte ·/}));
        const beforeReload=await saved();
        const paused=beforeReload.inventory.harvestV112.jobs.find(value=>value.id===job.id);
        assert.equal(paused?.status,'paused');assert.equal(paused.unitsDone,job.unitsDone);
        assert.equal(beforeReload.profile.clanMarks,state.profile.clanMarks,'pausing the paid work must not charge or refund marks');
        await capture('workshop-paused');await page.reload();
        await enterCampaignDeck(page);
        const afterReload=await saved();assert.deepEqual(afterReload.inventory.harvestV112,beforeReload.inventory.harvestV112);
        assert.equal(afterReload.profile.clanMarks,beforeReload.profile.clanMarks);
        await openDirect('trophy-hall');pausedAndReloaded=true;actions.push('pause-reload-exact-resume');continue;
      }
      const label=job?(job.status==='paused'?/^Reprendre sans frais ·/:/^Effectuer un geste ·/):
        item.stage==='mounted'?/^Ranger en réserve ·/:/^(Nettoyer|Traiter|Sécher|Monter) ·/;
      const button=card.getByRole('button',{name:label});
      const actionLabel=await button.textContent();await activateWithKeyboard(button);
      const next=await saved();
      const updated=next.inventory.harvestV112;
      assert.notDeepEqual(updated,ledger,'the selected workshop action must write its actual ledger');
      const nextJob=updated.jobs.find(value=>value.specimenId===item.id&&value.status!=='completed');
      if(!job&&item.stage!=='mounted'){
        assert.equal(nextJob?.status,'active');
        assert.equal(nextJob.unitsDone,0);
        assert.equal(next.profile.clanMarks,state.profile.clanMarks-nextJob.costPaid);
      }else{
        assert.equal(next.profile.clanMarks,state.profile.clanMarks,'working, resuming and archiving cannot charge marks again');
        if(job?.status==='paused'){
          assert.equal(nextJob?.id,job.id);
          assert.equal(nextJob.status,'active');
          assert.equal(nextJob.unitsDone,job.unitsDone);
        }else if(job){
          const progressed=updated.jobs.find(value=>value.id===job.id);
          assert.equal(progressed?.unitsDone,job.unitsDone+1,'one input records one gesture in the same job');
        }
      }
      actions.push(actionLabel);
    }
    const after=await saved();
    const samePart=item=>item.speciesId===target.speciesId&&item.partId===target.partId;
    const previousCount=admissionSave.inventory.harvestV112.archive.find(samePart)?.count??0;
    const actualCount=after.inventory.harvestV112.archive.find(samePart)?.count??0;
    assert.equal(actualCount,previousCount+1,'archive exactly one part from the declared hunt');
    assert.ok(!after.inventory.harvestV112.specimens.some(item=>item.id===target.id),'the workshop must archive this same physical specimen');
    await capture('workshop-mounted-archive');
    const receipt={missionId,specimen:target,pausedAndReloaded,actions,archiveBefore:previousCount,archiveAfter:actualCount,
      before:admissionSave.inventory.harvestV112,after:after.inventory.harvestV112,
      returnMarks,marksBefore:admissionSave.profile.clanMarks,marksAfter:after.profile.clanMarks};
    report.workshop.push(receipt);
    console.log(JSON.stringify({browserWorkshop:{missionId,specimen:target,pausedAndReloaded,actions,
      archiveBefore:previousCount,archiveAfter:actualCount}}));
    await backToDeck();
  };
  if(resumeHudSource){
    const raw=await readFile(path.resolve(root,resumeHudSource),'utf8'),parent=JSON.parse(raw);
    const played=parent.attempts.find(attempt=>attempt.resumeReceipt?.sidecar)?.resumeReceipt.sidecar;
    assert.ok(played,'the HUD continuation requires a complete genuinely played sidecar receipt');
    await acquireEarnedTool();const earned=await saved();
    assert.equal(earned.createdAt,played.ownerSaveCreatedAt);assert.equal(earned.missionProgress[played.missionId].attempts,played.encounterRun);
    assert.notEqual(earned.missionProgress[played.missionId].status,'locked');
    for(const key of ['inventory','loadout','appearance'])assert.deepEqual(earned[key],played.configuration[key],'earned '+key+' must exactly match the played sidecar');
    const serialized=JSON.stringify(played);
    await page.evaluate(raw=>localStorage.setItem('yautja-long-hunt.active-hunt',raw),serialized);
    assert.equal(await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.active-hunt')),serialized,'whole sidecar is admitted unchanged');
    await page.reload();await resumeCampaignHunt(page);
    await page.getByText('Synchronisation du biomask…',{exact:true}).waitFor({state:'hidden',timeout:60000});
    await page.locator('canvas').last().focus();let observed=await page.evaluate(()=>window.__observeCanonicalHuntV112());
    assert.equal(observed.missionId,played.missionId);assert.ok(observed.state.elapsed>=played.snapshot.checkpoint.elapsed&&observed.state.elapsed-played.snapshot.checkpoint.elapsed<2);
    if(observed.state.paused){await page.keyboard.press('Escape');await page.waitForTimeout(100);}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const buffer=await page.locator('canvas').last().screenshot();const file='played-sidecar-hud-resume-canvas.png';await writeFile(path.join(out,file),buffer);
    report.captures.push({file,sha256:hash(buffer),bytes:buffer.length});observed=await page.evaluate(()=>window.__observeCanonicalHuntV112());
    report.hudResume={source:resumeHudSource,sourceSha256:hash(raw),unchangedSidecarSha256:hash(serialized),sidecar:played,earnedConfigurationMatched:true,observed};
    report.qualification='PLAYED_SIDECAR_RESUME_AND_HUD_ONLY';
  }
  if(!inspectOnly&&!resumeHudSource)for(const missionId of requested){
    const currentSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
    if(currentSave.missionProgress[missionId].status==='completed'&&!argv.includes('--replay-completed')){
      report.attempts.push({missionId,status:'NOT_PLAYED_ALREADY_COMPLETED'});
      continue;
    }
    if(currentSave.missionProgress[missionId].status==='locked'){report.attempts.push({missionId,status:'NOT_ADMITTED_LOCKED'});break;}
    await acquireEarnedTool();
    const route=routes.get(missionId),captureCounts=new Map(),captureHunt=name=>{
      const count=(captureCounts.get(name)??0)+1;captureCounts.set(name,count);
      return capture(missionId+'-'+name+(count>1?'-repeat-'+count:''));
    };
    await openDirect('galaxy-map');
    await writeFile(path.join(out,'shortcuts-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
    await captureHunt('02-galaxy-map');
    const galaxyRoot=page.locator('.galaxy-v10-breadcrumbs button').first();if(await galaxyRoot.isEnabled())await galaxyRoot.click();
    await writeFile(path.join(out,'map-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
    // Each native autopilot leg must physically arrive before the Entrer button
    // appears. Read-only content data supplies labels, never navigation state.
    for(const label of [route.sector.name,route.system.name,route.body.name]){
      const choice=page.locator('.galaxy-v10-spatial-map button').filter({hasText:label}).first();
      await choice.click();
      await page.getByRole('button',{name:'Entrer',exact:true}).click();
    }
    await page.getByRole('button',{name:route.mission.title,exact:false}).first().click();
    const prepare=page.getByRole('button',{name:/^Préparer (la chasse|cette revisite)$/});
    await prepare.click();await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
    const skipArrival=page.getByRole('button',{name:'Passer l’arrivée',exact:true});
    const startHunt=page.getByRole('button',{name:'Commencer la chasse',exact:true});
    await skipArrival.or(startHunt).first().waitFor();
    if(await skipArrival.isVisible())await skipArrival.click();
    await startHunt.click();
    await page.locator('canvas').last().focus();
    await captureHunt('03-true-hunt-start');
    const start=Date.now(),memory={previousX:0,stuckTicks:0,jumpUntil:-1},held=new Set();
    const keys={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'Space',aim:'ShiftLeft',
      melee:'KeyJ',weapon:'KeyK',weaponOne:'Digit1',weaponTwo:'Digit2',weaponNext:'KeyR',scan:'KeyV',heal:'KeyH',
      interact:'KeyE',pause:'Escape',cloak:'KeyC',gearOne:'Digit3',gearTwo:'Digit4'};
    const samples=[],examined=new Set(),harvestTries=new Map(),discoveryChannels=new Set(),retryEvents=[];
    // Control cadence: one tick per observation round trip; simulated time summed across relay resumes.
    const controlLoop={iterations:0,simulatedSeconds:0,lastElapsed:null};
    let final=null,lastSecond=-1,lastPhase='',resumed=false,resumeReceipt=null,lastDecision=null;
    let startedWestOfIceGate=false,seenIceUnderpass=false;
    let trophyApproachMemory={},previousApexReason=null;
    const releaseKeys=async()=>{for(const action of held)await page.keyboard.up(keys[action]);held.clear();};
    while(!stopRequested&&Date.now()-start<budget*1000){
      const {observed,activeElement,bodyId}=await page.evaluate(()=>{
        const element=document.activeElement;
        return {observed:window.__observeCanonicalHuntV112?.(true),
          activeElement:{tag:element?.tagName,role:element?.getAttribute('role'),
            text:element?.textContent?.slice(0,120),isCanvas:element?.tagName==='CANVAS'},
          bodyId:document.querySelector('[data-hunt-rites-v77]')?.getAttribute('data-corpse-id')??null};
      });
      const observeFull=()=>page.evaluate(()=>window.__observeCanonicalHuntV112?.(false));
      if(!observed?.alive){final=await observeFull()??observed;break;}
      const game=observed.state;
      controlLoop.iterations++;if(controlLoop.lastElapsed!==null&&game.elapsed>=controlLoop.lastElapsed)controlLoop.simulatedSeconds+=game.elapsed-controlLoop.lastElapsed;controlLoop.lastElapsed=game.elapsed;
      if(missionId==='ice-cryostalker'&&!seenIceUnderpass){
        const gate=game.world.platforms.find(platform=>platform.id==='ice-region-thermal-return-gate'&&platform.collision==='solid');
        const player=game.player;
        if(gate&&player.x+player.width<=gate.x)startedWestOfIceGate=true;
        if(gate&&startedWestOfIceGate&&player.x>=gate.x+gate.width&&player.y>=gate.y+gate.height){
          seenIceUnderpass=true;
          const underpass={missionId,attempt:observed.encounterRun,elapsed:game.elapsed,
            player:{x:player.x,y:player.y},gate:{x:gate.x,y:gate.y,width:gate.width,height:gate.height}};
          report.routeObservations.push(underpass);
          console.log(JSON.stringify({browserIceUnderpass:underpass}));
        }
      }
      if(Math.floor(game.elapsed)!==lastSecond||game.phase==='dead'||game.phase==='finished'){
        final=await observeFull()??observed;
      }
      if(Math.floor(game.elapsed)!==lastSecond){
        samples.push(final);lastSecond=Math.floor(game.elapsed);
        await writeFile(path.join(out,'progress.json'),JSON.stringify({wallSeconds:(Date.now()-start)/1000,missionId:observed.missionId,
          elapsed:game.elapsed,phase:game.phase,paused:game.paused,player:game.player,scans:game.scans,kills:game.kills,
          scanNodes:game.scanNodes,activeElement,lastDecision,reason:'native browser observation'},null,2)+'\n');
        if(lastSecond%10===0)console.log(JSON.stringify({browserMission:observed.missionId,elapsed:game.elapsed,phase:game.phase,x:game.player.x,health:game.player.health}));
      }
      if(game.phase!==lastPhase){await captureHunt('phase-'+game.phase);lastPhase=game.phase;}
      const visibleDiscovery=game.ecosystem.reactions.find(reaction=>reaction.response==='investigate'&&reaction.until>game.elapsed&&
        !discoveryChannels.has(reaction.channel)&&game.enemies.some(enemy=>enemy.id===reaction.actorId&&enemy.alive&&enemy.active&&
          enemy.x+enemy.width>=game.cameraX&&enemy.x<=game.cameraX+1280&&enemy.y+enemy.height>=(game.cameraY??0)&&enemy.y<=(game.cameraY??0)+720));
      if(visibleDiscovery){
        discoveryChannels.add(visibleDiscovery.channel);
        const name=missionId+'-body-discovery-'+visibleDiscovery.channel+'-canvas.png';
        const buffer=await page.locator('canvas').last().screenshot();await writeFile(path.join(out,name),buffer);
        report.captures.push({file:name,sha256:hash(buffer),bytes:buffer.length});
        report.discoveryObservations.push({missionId,elapsed:game.elapsed,reaction:visibleDiscovery,
          receipts:game.ecosystem.receipts.filter(receipt=>receipt.actorId===visibleDiscovery.actorId&&receipt.corpseId===visibleDiscovery.corpseId),capture:name});
      }
      if(game.phase==='dead'){
        if(retryEvents.length>=maxRetries)break;
        await releaseKeys();
        const dialog=page.getByRole('dialog',{name:'Le rite n’est pas terminé',exact:true});
        const retry=dialog.getByRole('button',{name:/^(Reprendre au relais|Réessayer)$/});
        let label;
        try{
          label=await retry.textContent({timeout:4000});
          await retry.focus({timeout:4000});
          await page.keyboard.press('Enter');
          await page.waitForFunction(()=>{
            const current=window.__observeCanonicalHuntV112?.();
            return current?.alive&&current.state.phase!=='dead';
          },null,{timeout:8000});
        }catch(error){
          report.inputs.push({missionId,elapsed:game.elapsed,type:'DOM retry unavailable',reason:String(error)});
          break;
        }
        retryEvents.push({elapsed:game.elapsed,nativeDeath:final,button:label});
        Object.assign(memory,{previousX:0,stuckTicks:0,jumpUntil:-1,nextJump:0,nextInteractTick:0});
        trophyApproachMemory={};previousApexReason=null;
        delete memory.dropDirection;delete memory.dropTargetX;delete memory.harvestEdge;delete memory.harvestDirection;
        examined.clear();harvestTries.clear();
        // The new live attempt needs its own observed save roundtrip.
        resumed=false;resumeReceipt=null;
        report.inputs.push({missionId,elapsed:game.elapsed,type:'DOM retry',label});continue;
      }
      if(game.phase==='finished')break;
      if(game.paused){await page.keyboard.press('Escape');await page.waitForTimeout(50);continue;}
      if(!activeElement.isCanvas){
        await releaseKeys();await page.locator('canvas').last().focus();
        report.inputs.push({missionId,elapsed:game.elapsed,type:'focus reconciliation through DOM',previous:activeElement});
      }
      const quiet=game.enemies.every(enemy=>!enemy.active||!enemy.alive||Math.hypot(enemy.x-game.player.x,enemy.y-game.player.y)>650)&&
        (!game.boss.active||!game.boss.alive||Math.abs(game.boss.x-game.player.x)>900);
      const distanceToCorpse=corpse=>Math.hypot(corpse.x-game.player.x-game.player.width/2,corpse.y-game.player.y-game.player.height);
      const desiredCorpse=!skipHarvest&&harvestSpecies?game.huntRites.corpses
        .filter(corpse=>corpse.sourceEnemyId===harvestSpecies&&corpse.worthy&&!corpse.protectedPrey&&
          !corpse.erased&&corpse.id!==undefined&&!examined.has(corpse.id))
        .sort((a,b)=>distanceToCorpse(a)-distanceToCorpse(b))[0]??null:null;
      if(!skipHarvest&&game.flayingToolOwned&&!game.huntRites.specimensV112.length&&bodyId&&
        (!harvestSpecies||bodyId===desiredCorpse?.id)&&!examined.has(bodyId)&&quiet&&game.player.grounded&&
        (game.phase==='tracking'||game.phase==='target')){
        examined.add(bodyId);await releaseKeys();
        const attempt={missionId,bodyId,actions:[],elapsed:game.elapsed};
        const bodyMenu=page.locator('[data-hunt-rites-v77][data-corpse-id='+JSON.stringify(bodyId)+']');
        harvestTries.set(bodyId,(harvestTries.get(bodyId)??0)+1);
        try{
          await page.waitForFunction(()=>{const p=window.__observeCanonicalHuntV112?.().state.player;
            return p?.grounded&&!p.climbing&&Math.abs(p.velocityX)<5;},null,{timeout:3000});
          const examine=bodyMenu.getByRole('button',{name:'Examiner la proie vaincue',exact:true});
          if(await examine.isVisible())await activateWithKeyboard(examine);
          const open=page.locator('[data-rite-open-v112="true"][data-corpse-id='+JSON.stringify(bodyId)+']');
          await open.waitFor({timeout:4000});
          const parts=()=>open.locator(harvestAction?'[data-rite-action-v112="'+harvestAction+'"]':'[data-rite-action-v112^="harvest-"]');
          if(await parts().count()){
            const perform=async action=>{
              const command=open.locator('[data-rite-action-v112="'+action+'"]');
              const eventId=action+':'+bodyId;
              if(!await command.isVisible()||!await command.isEnabled())return false;
              await activateWithKeyboard(command);
              attempt.actions.push(action);
              const flags={bodyId,action,eventId};
              await page.waitForFunction(({bodyId,action,eventId})=>{
                const ledger=window.__observeCanonicalHuntV112?.().state.huntRites;
                return ledger?.completedEventIds.includes(eventId)||
                  (ledger?.operation?.corpseId===bodyId&&ledger.operation.action===action);
              },flags,{timeout:3000});
              await page.waitForFunction(({eventId})=>{
                const observed=window.__observeCanonicalHuntV112?.();
                return observed&&(observed.state.phase==='dead'||!observed.state.huntRites.operation||
                  observed.state.huntRites.completedEventIds.includes(eventId));
              },flags,{timeout:45000});
              const completed=await page.evaluate(eventId=>window.__observeCanonicalHuntV112?.().state.huntRites.completedEventIds.includes(eventId)===true,eventId);
              if(completed&&(action==='analyze'||action==='flay'))
                await open.locator('[data-rite-action-v112="leave"]').waitFor({timeout:4000});
              return completed;
            };
            if(await open.locator('[data-rite-action-v112="analyze"]:enabled').isVisible())await perform('analyze');
            const enabledPart=()=>open.locator((harvestAction?'[data-rite-action-v112="'+harvestAction+'"]':'[data-rite-action-v112^="harvest-"]')+':enabled').first();
            if(!await enabledPart().isVisible()&&await open.locator('[data-rite-action-v112="flay"]:enabled').isVisible()){
              await perform('flay');
              if(await enabledPart().count())await enabledPart().waitFor({state:'visible',timeout:3000});
            }
            const chosen=await enabledPart().getAttribute('data-rite-action-v112',{timeout:2000}).catch(()=>null);
            if(chosen)attempt.completed=await perform(chosen);
          }
        }catch(error){attempt.failure=String(error);}
        const observed=await page.evaluate(()=>window.__observeCanonicalHuntV112?.().state);
        attempt.specimens=observed?.huntRites.specimensV112??[];
        attempt.completedEventIds=observed?.huntRites.completedEventIds.filter(id=>id.endsWith(':'+bodyId))??[];
        attempt.message=observed?.message;
        await captureHunt(attempt.specimens.length?'actual-anatomical-harvest':'rite-attempt-no-specimen');
        const close=bodyMenu.getByRole('button',{name:'Fermer le menu rituel',exact:true});
        if(await close.isVisible())try{await activateWithKeyboard(close);}catch(error){attempt.closeFailure=String(error);}
        await page.locator('canvas').last().focus();report.harvestAttempts.push(attempt);
        console.log(JSON.stringify({browserHarvest:attempt}));
        if(!attempt.specimens?.length&&(harvestTries.get(bodyId)??0)<3)examined.delete(bodyId);
        continue;
      }
      const tick=Math.round(game.elapsed*60);
      const decision=decideHuntCampaignInputV112(game,tick,memory,'mixed');
      const trophy=observed.apexTrophy;
      const purgePending=game.bossMechanics.missionId==='volcano-bad-blood'&&
        game.bossMechanics.purgeSeconds!==null&&!game.bossMechanics.purgeResolved;
      if(trophy&&!purgePending&&['apex trophy','descend by support edge'].includes(decision.reason)){
        const approach=decideGroundApexTrophyInputV112(game,tick,trophyApproachMemory,trophy.point,trophy.inReach);
        decision.held=approach.held;
        decision.pressed=[...decision.pressed.filter(action=>action==='heal'||action==='scan'),...approach.pressed];
        decision.pointer=null;decision.reason=approach.reason;decision.target=trophy.point;
        if(previousApexReason!==approach.reason){
          previousApexReason=approach.reason;
          const {x,y,height,grounded}=game.player;
          const receipt={missionId,elapsed:game.elapsed,reason:approach.reason,player:{x,y,feet:y+height,grounded},
            target:trophy,exit:trophyApproachMemory.trophyExit??null};
          report.apexTrophyObservations.push(receipt);
          console.log(JSON.stringify({browserApexTrophy:receipt}));
        }
      }
      if(desiredCorpse&&!game.huntRites.specimensV112.length&&quiet&&!game.trophyExtracting&&(game.phase==='tracking'||game.phase==='target')){
        let destination=desiredCorpse.x;const pc=game.player.x+game.player.width/2,feet=game.player.y+game.player.height;
        if(game.player.grounded&&desiredCorpse.y-feet>40){
          const support=game.world.platforms.find(platform=>Math.abs(platform.y-feet)<3&&game.player.x+game.player.width>platform.x&&game.player.x<platform.x+platform.width);
          if(support&&(memory.harvestEdge===undefined||Math.abs(memory.harvestEdge-pc)<18)){
            const left=support.x-game.player.width-25,right=support.x+support.width+game.player.width+25;
            memory.harvestDirection??=Math.abs(pc-left)<Math.abs(pc-right)?-1:1;memory.harvestEdge=memory.harvestDirection<0?left:right;
          }
        }
        if(Math.abs(desiredCorpse.y-feet)<35){delete memory.harvestEdge;delete memory.harvestDirection;}
        destination=memory.harvestEdge??destination;
        decision.held=Math.abs(destination-pc)>8?[destination>pc?'right':'left']:[];
        decision.pressed=decision.pressed.filter(action=>action==='heal');decision.pointer=null;
        decision.reason='walk to the real defeated specimen source';decision.target={x:destination,y:desiredCorpse.y,corpseId:desiredCorpse.id};
      }
      lastDecision=decision;
      const wanted=new Set(decision.held);
      for(const action of held)if(!wanted.has(action)){await page.keyboard.up(keys[action]);report.inputs.push({missionId,elapsed:game.elapsed,type:'keyup',action});held.delete(action);}
      for(const action of wanted)if(!held.has(action)){await page.keyboard.down(keys[action]);report.inputs.push({missionId,elapsed:game.elapsed,type:'keydown',action});held.add(action);}
      if(decision.pointer){
        const canvas=page.locator('canvas').last();await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
        if(box){const x=box.x+decision.pointer.x*box.width/1280,y=box.y+decision.pointer.y*box.height/720;
          await page.mouse.move(x,y);report.inputs.push({missionId,elapsed:game.elapsed,type:'mousemove',x,y,nativeAim:decision.pointer});}
      }
      for(const action of decision.pressed){
        if(wanted.has(action)&&held.has(action)){
          // A fresh native edge requires a real release/press when held.
          await page.keyboard.up(keys[action]);await page.keyboard.down(keys[action]);
        }else await page.keyboard.press(keys[action]);
        report.inputs.push({missionId,elapsed:game.elapsed,type:'press',action});
      }
      if(!resumed&&game.elapsed>=20){
        await releaseKeys();
        await page.getByRole('button',{name:'Mettre en pause, consulter la carte et le sac',exact:true}).click();
        const pause=page.getByRole('dialog',{name:'Chasse en pause · Carte et sac',exact:true});
        await pause.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).click();
        const sidecarKey='yautja-long-hunt.active-hunt';
        await page.waitForFunction(({id,key})=>{
          const save=JSON.parse(localStorage.getItem(key)??'null');
          return window.__observeCanonicalHuntV112?.().alive!==true&&
            save?.missionId===id&&save.snapshot?.checkpoint?.elapsed>=20;
        },{id:missionId,key:sidecarKey});
        const sidecar=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),sidecarKey);
        await captureHunt('suspended-to-deck');await page.reload();
        await resumeCampaignHunt(page);
        await page.locator('canvas').last().focus();
        const restored=await page.evaluate(()=>window.__observeCanonicalHuntV112?.());
        assert.ok(restored?.alive&&restored.missionId===missionId&&restored.encounterRun===observed.encounterRun&&
          restored.state.elapsed>=sidecar.snapshot.checkpoint.elapsed&&restored.state.elapsed-sidecar.snapshot.checkpoint.elapsed<2,
          'the real mounted runtime must continue the persisted hunt at its observed encounter');
        resumeReceipt={sidecar,restored};resumed=true;
        const resume={missionId,encounterRun:restored.encounterRun,
          savedElapsed:sidecar.snapshot.checkpoint.elapsed,restoredElapsed:restored.state.elapsed,sidecarSha256:hash(sidecar)};
        report.resumeObservations.push(resume);
        console.log(JSON.stringify({browserResume:resume}));
      }
      await page.waitForTimeout(35);
    }
    for(const action of held)await page.keyboard.up(keys[action]);
    await captureHunt('04-attempt-terminal');
    const settled=await saved(),beforeProgress=currentSave.missionProgress[missionId],afterProgress=settled.missionProgress[missionId];
    const settlementConfirmed=final?.state.phase==='finished'&&afterProgress.completions===beforeProgress.completions+1&&
      afterProgress.attempts===beforeProgress.attempts+1&&settled.statistics.missionsCompleted===currentSave.statistics.missionsCompleted+1;
    const field=final?.state.huntRites.specimensV112??[];
    const priorIds=new Set(currentSave.inventory.harvestV112.specimens.map(item=>item.id));
    const wantedPart=harvestAction?.slice('harvest-'.length);
    const delivered=settlementConfirmed?settled.inventory.harvestV112.specimens.filter(item=>
      !priorIds.has(item.id)&&(!harvestSpecies||item.speciesId===harvestSpecies)&&(!wantedPart||item.partId===wantedPart)&&
      field.some(source=>source.id===item.id&&source.sourceId===item.sourceId&&source.speciesId===item.speciesId&&source.partId===item.partId)):[];
    controlLoop.simulatedSecondsPerTick=controlLoop.iterations>1?controlLoop.simulatedSeconds/(controlLoop.iterations-1):null;
    report.attempts.push({missionId,final,retryEvents,controlLoop,suspendedAndReloaded:resumed,resumeReceipt,delivered,
      settlement:{confirmed:settlementConfirmed,beforeProgress,afterProgress},wallSeconds:(Date.now()-start)/1000,
      status:settlementConfirmed?'BROWSER_HUNT_AND_SETTLEMENT_SUCCESS':final?.state.phase==='dead'?'CONTROLLER_DIED':'ATTEMPT_INCOMPLETE'});
    await writeFile(path.join(out,missionId+'-hunt-samples.json'),JSON.stringify(samples,null,2)+'\n');
    report.finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
    await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    if(!settlementConfirmed)break;
    await page.getByRole('button',{name:'Retour au vaisseau',exact:true}).last().click();
    await conserveRealSpecimen({missionId,delivered,returnMarks:settled.profile.clanMarks});
  }
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
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log('Canonical browser attempt report: '+path.join(out,'report.json'));
if(report.requiredCoverageFailure)console.error(report.requiredCoverageFailure);
if(report.failure||report.requiredCoverageFailure)process.exitCode=1;
