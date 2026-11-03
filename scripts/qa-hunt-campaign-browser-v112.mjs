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

assert.notEqual(process.env.SITES_MANAGED_LINUX_CONTAINER,'1','Managed Sites requires its supported CUA preview; this runner is portable only.');
const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2),option=(key,fallback)=>argv.includes(key)?argv[argv.indexOf(key)+1]:fallback;
const out=path.resolve(root,option('--output','outputs/qa-hunt-campaign-browser-v112'));
const assetCache=path.resolve(root,option('--asset-cache','outputs/qa-hunt-campaign-browser-v112/source-cache'));
const inspectOnly=argv.includes('--inspect-only'),budget=Number(option('--wall-seconds','600'));
const maxRetries=Number(option('--max-retries','2'));
const harvestSpecies=option('--harvest-species',null),skipHarvest=argv.includes('--skip-harvest');
const resumeHudSource=option('--resume-hud-source',null);
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
const bootstrap=await build({stdin:{contents:'export {defaultSave,SAVE_STORAGE_KEY} from "./app/game/save";export {GALAXY_NAVIGATION} from "./app/game/galaxyNavigation";export {MISSIONS} from "./app/game/data";',resolveDir:root,loader:'ts'},
  bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent'});
const mod={exports:{}};runInNewContext(bootstrap.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url)});
const campaignSource=option('--campaign-source',null);
const campaignInputRaw=campaignSource?await readFile(path.resolve(root,campaignSource),'utf8'):null;
const campaignInput=campaignInputRaw?JSON.parse(campaignInputRaw):null;
const admission=campaignInput?.finalSave??campaignInput??mod.exports.defaultSave('2026-11-02T00:00:00.000Z'),storageKey=mod.exports.SAVE_STORAGE_KEY;
const routes=new Map(mod.exports.GALAXY_NAVIGATION.sectors.flatMap(sector=>sector.systems.flatMap(system=>system.bodies
  .flatMap(body=>body.missions.map(mission=>[mission.id,{sector,system,body,mission}])))));
const requested=option('--missions',mod.exports.MISSIONS.map(mission=>mission.id).join(',')).split(',');
assert.ok(requested.length&&requested.every(id=>routes.has(id)),'real requested campaign routes');
const entry='import {createRoot} from "react-dom/client";import GameClient from "./app/game/GameClient";import "./app/globals.css";createRoot(document.getElementById("root")).render(<GameClient/>);';
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,metafile:true,
  format:'iife',platform:'browser',jsx:'automatic',outfile:'campaign.js',logLevel:'silent',external:['/game/*'],
  define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'read-only-hunt-observation',setup(builder){
    builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),
      contents:(await postcss([tailwind({base:root})]).process(recordSource(args.path,await readFile(args.path,'utf8')),{from:args.path})).css}));
    builder.onLoad({filter:/\/HuntCanvas\.tsx$/},()=>{
      const marker='    const fixedStep = 1 / 60;';
      assert.equal(source.split(marker).length,2,'exactly one native observation point');
      const observer='    window.__observeCanonicalHuntV112 = () => ({ alive, missionId: mission.id, encounterRun, state: JSON.parse(JSON.stringify(game, (_key,value) => value instanceof Set ? [...value] : value)) });\n';
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
    continuationSource:campaignSource,continuationSha256:campaignInputRaw?hash(campaignInputRaw):null,save:admission,sha256:hash(admission)},
  requestedMissionIds:requested,
  harvestSpeciesGoal:harvestSpecies,skipHarvest,
  attempts:[],captures:[],errors:[],missingAssets:[],inputs:[],armoryTransactions:[],harvestAttempts:[],workshop:[],discoveryObservations:[],qualification:'ATTEMPT_ONLY'};
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
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
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
  await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
  await capture('01-legacy-default-deck');
  await writeFile(path.join(out,'deck-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  const openDirect=async label=>{
    const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
    if(await shortcuts.getAttribute('aria-expanded')!=='true')await shortcuts.click();
    const direct=page.getByText('Accès direct aux interfaces · sans déplacement du chasseur',{exact:true});
    if(await direct.locator('..').getAttribute('open')===null)await direct.click();
    await page.getByRole('button',{name:new RegExp('^'+label+'.*Ouvrir l’interface')}).first().click();
  };
  const backToDeck=()=>page.getByRole('button',{name:/^← Retour au pont/}).click();
  const acquireEarnedTool=async()=>{
    const before=await saved();
    if((before.inventory.fieldToolIds.includes('flaying-tool')||before.profile.clanMarks<120)&&
      ((before.inventory.armorUpgrades.hunter??0)>=2||before.profile.clanMarks<250))return;
    await openDirect('ARMURERIE');
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
  const conserveRealSpecimen=async()=>{
    const admissionSave=await saved();if(!admissionSave.inventory.harvestV112.specimens.length)return;
    await openDirect('TROPHÉES');
    let pausedAndReloaded=false;const actions=[];
    for(let step=0;step<40;step++){
      const state=await saved(),ledger=state.inventory.harvestV112,item=ledger.specimens[0];if(!item)break;
      const job=ledger.jobs.find(value=>value.specimenId===item.id&&value.status!=='completed');
      if(job&&!pausedAndReloaded&&job.unitsDone===1){
        await page.getByRole('button',{name:/^Suspendre sans perte ·/}).first().click();
        const beforeReload=await saved();await capture('workshop-paused');await page.reload();
        await page.getByRole('button',{name:/^Continuer/}).click();
        await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
        const afterReload=await saved();assert.deepEqual(afterReload.inventory.harvestV112,beforeReload.inventory.harvestV112);
        assert.equal(afterReload.profile.clanMarks,beforeReload.profile.clanMarks);
        await openDirect('TROPHÉES');pausedAndReloaded=true;actions.push('pause-reload-exact-resume');continue;
      }
      const label=job?(job.status==='paused'?/^Reprendre sans frais ·/:/^Effectuer un geste ·/):
        item.stage==='mounted'?/^Ranger en réserve ·/:/^(Nettoyer|Traiter|Sécher|Monter) ·/;
      const button=page.getByRole('button',{name:label}).first();const actionLabel=await button.textContent();await button.click();actions.push(actionLabel);
    }
    const after=await saved(),target=admissionSave.inventory.harvestV112.specimens[0];
    const previousCount=admissionSave.inventory.harvestV112.archive.find(item=>item.speciesId===target.speciesId&&item.partId===target.partId)?.count??0;
    const actualCount=after.inventory.harvestV112.archive.find(item=>item.speciesId===target.speciesId&&item.partId===target.partId)?.count??0;
    assert.ok(actualCount>previousCount&&!after.inventory.harvestV112.specimens.some(item=>item.id===target.id),'the actual selected specimen must be archived');
    await capture('workshop-mounted-archive');report.workshop.push({pausedAndReloaded,actions,before:admissionSave.inventory.harvestV112,
      after:after.inventory.harvestV112,marksBefore:admissionSave.profile.clanMarks,marksAfter:after.profile.clanMarks});
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
    await page.reload();await page.getByRole('button',{name:/^Continuer/}).click();
    await page.waitForFunction(()=>window.__observeCanonicalHuntV112?.().alive||[...document.querySelectorAll('button')].some(button=>button.textContent?.trim().startsWith('Reprendre la chasse')));
    const alreadyMounted=await page.evaluate(()=>window.__observeCanonicalHuntV112?.().alive===true);
    const resume=page.getByRole('button',{name:/^Reprendre la chasse/}).first();if(!alreadyMounted&&await resume.count()&&await resume.isVisible())await resume.click();
    await page.waitForFunction(()=>window.__observeCanonicalHuntV112?.().alive);
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
    if(currentSave.missionProgress[missionId].status==='completed'&&!argv.includes('--replay-completed'))continue;
    if(currentSave.missionProgress[missionId].status==='locked'){report.attempts.push({missionId,status:'NOT_ADMITTED_LOCKED'});break;}
    await acquireEarnedTool();
    const route=routes.get(missionId),captureCounts=new Map(),captureHunt=name=>{
      const count=(captureCounts.get(name)??0)+1;captureCounts.set(name,count);
      return capture(missionId+'-'+name+(count>1?'-repeat-'+count:''));
    };
    await openDirect('NAVIGATION');
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
    await page.getByRole('button',{name:'Commencer la chasse',exact:true}).click();
    await page.locator('canvas').last().focus();
    await captureHunt('03-true-hunt-start');
    const start=Date.now(),memory={previousX:0,stuckTicks:0,jumpUntil:-1},held=new Set();
    const keys={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'Space',aim:'ShiftLeft',
      melee:'KeyJ',weapon:'KeyK',weaponOne:'Digit1',weaponTwo:'Digit2',weaponNext:'KeyR',scan:'KeyV',heal:'KeyH',
      interact:'KeyE',pause:'Escape',cloak:'KeyC',gearOne:'Digit3',gearTwo:'Digit4'};
    const samples=[],examined=new Set(),harvestTries=new Map(),discoveryChannels=new Set(),retryEvents=[];let final=null,lastSecond=-1,lastPhase='',resumed=false,resumeReceipt=null,lastDecision=null;
    const releaseKeys=async()=>{for(const action of held)await page.keyboard.up(keys[action]);held.clear();};
    while(!stopRequested&&Date.now()-start<budget*1000){
      const observed=await page.evaluate(()=>window.__observeCanonicalHuntV112?.());
      if(!observed?.alive){final=observed;break;}
      const game=observed.state;final=observed;
      const activeElement=await page.evaluate(()=>{const element=document.activeElement;return{tag:element?.tagName,role:element?.getAttribute('role'),text:element?.textContent?.slice(0,120),isCanvas:element?.tagName==='CANVAS'};});
      if(Math.floor(game.elapsed)!==lastSecond){
        samples.push(observed);lastSecond=Math.floor(game.elapsed);
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
        const retry=page.getByRole('button',{name:/^(Reprendre au relais|Réessayer la chasse|Recommencer la chasse)$/}).first();
        if(retryEvents.length>=maxRetries||!await retry.count())break;
        await releaseKeys();const label=await retry.textContent();retryEvents.push({elapsed:game.elapsed,nativeDeath:observed,button:label});
        await retry.click();Object.assign(memory,{previousX:0,stuckTicks:0,jumpUntil:-1,nextJump:0,nextInteractTick:0});
        delete memory.dropDirection;delete memory.dropTargetX;examined.clear();
        report.inputs.push({missionId,elapsed:game.elapsed,type:'DOM retry',label});continue;
      }
      if(game.phase==='finished')break;
      if(game.paused){await page.keyboard.press('Escape');await page.waitForTimeout(50);continue;}
      if(skipHarvest&&!activeElement.isCanvas){
        await releaseKeys();await page.locator('canvas').last().focus();
        report.inputs.push({missionId,elapsed:game.elapsed,type:'focus reconciliation through DOM',previous:activeElement});
      }
      const bodyMenu=page.locator('[data-hunt-rites-v77]');
      const bodyId=await page.evaluate(()=>document.querySelector('[data-hunt-rites-v77]')?.getAttribute('data-corpse-id')??null);
      const quiet=game.enemies.every(enemy=>!enemy.active||!enemy.alive||Math.hypot(enemy.x-game.player.x,enemy.y-game.player.y)>650)&&
        (!game.boss.active||!game.boss.alive||Math.abs(game.boss.x-game.player.x)>900);
      const desiredCorpse=harvestSpecies?game.huntRites.corpses.find(corpse=>corpse.sourceEnemyId===harvestSpecies&&!corpse.erased&&!examined.has(corpse.id)):null;
      if(!skipHarvest&&game.flayingToolOwned&&!game.huntRites.specimensV112.length&&bodyId&&
        (!harvestSpecies||bodyId===desiredCorpse?.id)&&!examined.has(bodyId)&&quiet&&game.player.grounded&&
        (game.phase==='tracking'||game.phase==='target')){
        examined.add(bodyId);await releaseKeys();const attempt={missionId,bodyId,actions:[],elapsed:game.elapsed};
        harvestTries.set(bodyId,(harvestTries.get(bodyId)??0)+1);
        try{
          await page.waitForFunction(()=>{const p=window.__observeCanonicalHuntV112?.().state.player;return p&&Math.abs(p.velocityX)<5;},null,{timeout:3000});
          const examine=bodyMenu.getByRole('button',{name:'Examiner la proie vaincue',exact:true});
          if(await examine.count()){await examine.focus();await page.keyboard.press('Enter');}
          for(const action of ['analyze','flay','harvest']){
            if(action==='flay'&&await bodyMenu.locator('[data-rite-action-v112^="harvest-"]').count()===0)break;
            const button=action==='harvest'?bodyMenu.locator('[data-rite-action-v112^="harvest-"]:enabled').first():bodyMenu.locator('[data-rite-action-v112="'+action+'"]');
            if(!await button.count()||!await button.isEnabled())continue;
            const canonicalAction=await button.getAttribute('data-rite-action-v112');await button.focus();await page.keyboard.press('Enter');attempt.actions.push(canonicalAction);
            await page.waitForFunction(()=>{const g=window.__observeCanonicalHuntV112?.().state;return g&&(!g.huntRites.operation||g.phase==='dead');},null,{timeout:45000});
            await bodyMenu.locator('[data-rite-action-v112="leave"]').waitFor();
          }
          const state=await page.evaluate(()=>window.__observeCanonicalHuntV112().state);attempt.specimens=state.huntRites.specimensV112;
          await captureHunt(state.huntRites.specimensV112.length?'actual-anatomical-harvest':'rite-attempt-no-specimen');
        }catch(error){attempt.failure=String(error);}
        const close=page.getByRole('button',{name:'Fermer le menu rituel',exact:true});if(await close.count())try{await close.focus();await page.keyboard.press('Enter');}catch(error){attempt.closeFailure=String(error);}
        await page.locator('canvas').last().focus();report.harvestAttempts.push(attempt);
        if(!attempt.specimens?.length&&(harvestTries.get(bodyId)??0)<3)examined.delete(bodyId);
        continue;
      }
      const decision=decideHuntCampaignInputV112(game,Math.round(game.elapsed*60),memory,'mixed');
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
        for(const action of held)await page.keyboard.up(keys[action]);held.clear();
        await page.keyboard.press('Escape');
        const suspend=page.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).first();
        if(await suspend.count()){
          await suspend.click();
          const sidecar=await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.active-hunt')));
          assert.ok(sidecar&&sidecar.snapshot?.checkpoint?.elapsed>=20,'the active native sidecar must contain this actual hunt');
          await captureHunt('suspended-to-deck');await page.reload();
          await page.getByRole('button',{name:/^Continuer/}).click();
          const resume=page.getByRole('button',{name:/Reprendre la chasse/}).first();if(await resume.count())await resume.click();
          await page.locator('canvas').last().focus();
          const restored=await page.evaluate(()=>window.__observeCanonicalHuntV112?.());
          assert.ok(restored?.alive&&restored.missionId===missionId&&restored.state.elapsed>=sidecar.snapshot.checkpoint.elapsed&&
            restored.state.elapsed-sidecar.snapshot.checkpoint.elapsed<2,'the real mounted runtime must continue the persisted hunt');
          resumeReceipt={sidecar,restored};resumed=true;
        }else await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(35);
    }
    for(const action of held)await page.keyboard.up(keys[action]);
    await captureHunt('04-attempt-terminal');
    const settled=await saved(),beforeProgress=currentSave.missionProgress[missionId],afterProgress=settled.missionProgress[missionId];
    const settlementConfirmed=final?.state.phase==='finished'&&afterProgress.completions===beforeProgress.completions+1&&
      afterProgress.attempts===beforeProgress.attempts+1&&settled.statistics.missionsCompleted===currentSave.statistics.missionsCompleted+1;
    report.attempts.push({missionId,final,retryEvents,suspendedAndReloaded:resumed,resumeReceipt,settlement:{confirmed:settlementConfirmed,beforeProgress,afterProgress},wallSeconds:(Date.now()-start)/1000,
      status:settlementConfirmed?'BROWSER_HUNT_AND_SETTLEMENT_SUCCESS':final?.state.phase==='dead'?'CONTROLLER_DIED':'ATTEMPT_INCOMPLETE'});
    await writeFile(path.join(out,missionId+'-hunt-samples.json'),JSON.stringify(samples,null,2)+'\n');
    report.finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
    await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    if(!settlementConfirmed)break;
    await page.getByRole('button',{name:'Retour au vaisseau',exact:true}).last().click();
    await conserveRealSpecimen();
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
  report.missingAssets=[...missing];report.sourceCacheServed=[...cached.values()];await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log('Canonical browser attempt report: '+path.join(out,'report.json'));
if(report.failure)process.exitCode=1;
