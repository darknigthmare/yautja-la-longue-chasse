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
const bootstrap=await build({stdin:{contents:'export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from "./app/game/save";export {GALAXY_NAVIGATION} from "./app/game/galaxyNavigation";export {MISSIONS} from "./app/game/data";export {GAUNTLET_CATALOG_V132,gauntletUnlockedV132} from "./app/game/systems/clanWarGauntletCatalogV132";export {GAUNTLET_STUDIES_V134,evaluateGauntletStudyV134} from "./app/game/systems/gauntletCampaignV134";',resolveDir:root,loader:'ts'},
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
  huntSourceSha256:hash(source),scope:'Whole GameClient in portable Chromium; an earned browser campaign is admitted once through storageState. Native titles, armory, mission deployment, suspend and reload. Read-only Canvas source names and checkpoint observation.',
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
  const alreadyMounted=await page.evaluate(()=>window.__observeCanonicalHuntV112?.().alive===true);
  if(!alreadyMounted)await page.getByRole('button',{name:/^Reprendre la chasse/}).first().click();
  await page.waitForFunction(()=>window.__observeCanonicalHuntV112?.().alive);
}

try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
  assert.ok(parsedAdmission.save,'Campaign admission rejected by parseSaveImport: '+parsedAdmission.failure);
  browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),args:['--no-sandbox']});
  report.browser=browser.version();
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  assert.ok(campaignInput?.provenance?.digest && campaignInput.provenance?.nativeBrowserSnapshotMatched,
    'An original played browser archive verified byte-identically against the pilot artifact is required');
  await context.close();
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,storageState:{
    cookies:[],origins:[{origin:'http://127.0.0.1:'+address.port,localStorage:[{name:storageKey,value:JSON.stringify(admission)}]}],
  }});
  await context.addInitScript(()=>{
    window.__q11DrawnParts=new Set();
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      const source=args[0]?.currentSrc||args[0]?.src;
      if(typeof source==='string'&&source.includes('/rig-gauntlets/'))window.__q11DrawnParts.add(new URL(source).pathname);
      return Reflect.apply(draw,this,args);
    };
  });
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')report.errors.push('console.error: '+message.text());});
  page.on('requestfailed',request=>report.errors.push('requestfailed: '+request.url()+' '+request.failure()?.errorText));
  await page.goto('http://127.0.0.1:'+address.port+'/',{waitUntil:'domcontentloaded'});
  await page.bringToFront();
  const capture=async name=>{const buffer=await page.screenshot({animations:'disabled'});await writeFile(path.join(out,name+'.png'),buffer);report.captures.push({file:name+'.png',sha256:hash(buffer),bytes:buffer.length});};
  await page.locator('[data-campaign-menu]').waitFor();
  await capture('01-native-campaign-titles');
  await enterCampaignDeck(page);
  await capture('02-deck-from-titles');
  await writeFile(path.join(out,'deck-visible-buttons.json'),JSON.stringify(await page.getByRole('button').allTextContents(),null,2)+'\n');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  const openDirect=async stationId=>{
    const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
    if(await shortcuts.getAttribute('aria-expanded')!=='true')await shortcuts.click();
    const direct=page.locator('[data-ship-shortcuts]');
    await direct.waitFor();
    if(await direct.getAttribute('open')===null)await direct.locator('summary').click();
    await direct.locator('[data-ship-shortcut="'+stationId+'"]').click();
  };
  const backToDeck=()=>page.getByRole('button',{name:/^← Retour au pont/}).click();

  const data=mod.exports;
  const before=await saved();
  assert.equal(before.createdAt,admission.createdAt);
  assert.deepEqual(before.trophies,admission.trophies,
    'The live source must retain the genuine played trophies in the archival input');
  assert.ok(before.trophies.length>0,'The admitted campaign must carry at least one earned trophy');
  const claimed=before.gauntletV134?.claimedStudies??[];
  const studies=data.GAUNTLET_STUDIES_V134
    .filter(item=>item.missionId===campaignInput.provenance.missionId)
    .map(item=>data.evaluateGauntletStudyV134(before,item.id));
  const eligible=studies.find(item=>item.ok&&!claimed.includes(item.study.id));
  const fromRank=data.GAUNTLET_CATALOG_V132.find(item=>item.unlock.startsWith('rank:')&&
    item.id!==before.gauntletV134?.equippedId&&data.gauntletUnlockedV132(item.id,before.profile.rankId,claimed));
  const selected=eligible?.study.id??fromRank?.id;
  report.gauntlet={source:campaignInput.provenance,rank:before.profile.rankId,
    earnedTrophies:before.trophies.map(trophy=>({missionId:trophy.missionId,quality:trophy.quality})),
    studies:studies.map(item=>({id:item.study.id,ok:item.ok,missing:item.missing})),
    choice:selected??null,claimMode:eligible?'earned-trophy-study':fromRank?'earned-campaign-rank':null};
  await openDirect('wall-armory');
  const locker=page.getByTestId('hunter-gauntlet-slot-v133').getByTestId('gauntlet-locker-v132');
  await locker.locator('summary').click();
  const search=locker.getByRole('searchbox',{name:'Rechercher un modèle'});
  const dossier=id=>locker.locator('[data-gauntlet-model="'+id+'"]');
  const locked=studies.find(item=>!item.ok&&!claimed.includes(item.study.id));
  if(locked){
    await search.fill(locked.study.id);
    await dossier(locked.study.id).getByRole('button',{name:'Fiche',exact:true}).click();
    assert.ok(await locker.getByRole('button',{name:'Étude encore verrouillée',exact:true}).isDisabled());
    assert.deepEqual((await saved()).gauntletV134,before.gauntletV134);
    report.gauntlet.refusedStudy=locked.study.id;
    await capture('03-real-campaign-unmet-study');
  }
  assert.ok(selected,'No new armor cosmetic is authorized by the real played campaign');
  await search.fill(selected);
  await dossier(selected).getByRole('button',{name:'Fiche',exact:true}).click();
  if(eligible){
    await locker.getByRole('button',{name:"Valider l'étude et débloquer",exact:true}).click();
    await page.waitForFunction(({id,key})=>JSON.parse(localStorage.getItem(key)??'null')?.gauntletV134?.claimedStudies.includes(id),
      {id:selected,key:storageKey});
    assert.deepEqual((await saved()).gauntletV134.claimedStudies,[...claimed,selected]);
    assert.ok(await locker.getByRole('button',{name:'Dossier déjà validé',exact:true}).isDisabled());
  }
  await dossier(selected).getByRole('button',{name:/^Équiper /}).click();
  await page.waitForFunction(({id,key})=>JSON.parse(localStorage.getItem(key)??'null')?.gauntletV134?.equippedId===id,
    {id:selected,key:storageKey});
  await page.locator('.loadout-rig[data-gauntlet-equipped="'+selected+'"]').waitFor();
  report.gauntlet.resultingArchive=(await saved()).gauntletV134;
  assert.deepEqual((await saved()).trophies,before.trophies,'Armory may not create or change a trophy');
  await capture('04-native-armory-equipped');
  await backToDeck();

  const missionId=campaignInput.provenance.missionId;
  const route=routes.get(missionId);
  assert.ok(route && before.missionProgress[missionId]?.status==='completed');
  await openDirect('galaxy-map');
  const galaxyRoot=page.locator('.galaxy-v10-breadcrumbs button').first();
  if(await galaxyRoot.isEnabled())await galaxyRoot.click();
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
  const waitForDraw=()=>page.waitForFunction(({id,missionId})=>{
    const live=window.__observeCanonicalHuntV112?.();
    const files=window.__q11DrawnParts;
    return live?.alive&&live.missionId===missionId&&live.state.elapsed>=3&&
      files?.has('/game/assets/v139/rig-gauntlets/'+id+'/base.svg')&&
      files?.has('/game/assets/v139/rig-gauntlets/'+id+'/lid.svg');
  },{id:selected,missionId},{timeout:90000});
  await waitForDraw();
  const drawn=()=>page.evaluate(()=>[...window.__q11DrawnParts].sort());
  report.gauntlet.firstMissionDraw=await drawn();
  await capture('05-native-mission-equipped');
  await page.getByRole('button',{name:'Mettre en pause, consulter la carte et le sac',exact:true}).click();
  const pause=page.getByRole('dialog',{name:'Chasse en pause · Carte et sac',exact:true});
  await pause.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).click();
  const sidecarKey='yautja-long-hunt.active-hunt';
  await page.waitForFunction(({id,mission,key})=>{
    const sidecar=JSON.parse(localStorage.getItem(key)??'null');
    return window.__observeCanonicalHuntV112?.().alive!==true&&
      sidecar?.missionId===mission&&sidecar.configuration.gauntletVariantId===id&&sidecar.snapshot?.checkpoint?.elapsed>=3;
  },{id:selected,mission:missionId,key:sidecarKey});
  const sidecar=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),sidecarKey);
  report.gauntlet.suspended={missionId,encounterRun:sidecar.encounterRun,elapsed:sidecar.snapshot.checkpoint.elapsed,
    selected:sidecar.configuration.gauntletVariantId,sidecarSha256:hash(sidecar)};
  await capture('06-native-suspended');
  await page.reload();
  await page.locator('[data-campaign-menu]').waitFor();
  await capture('07-native-titles-after-reload');
  await resumeCampaignHunt(page);
  await waitForDraw();
  const resumed=await page.evaluate(()=>window.__observeCanonicalHuntV112?.());
  assert.equal(resumed.encounterRun,sidecar.encounterRun);
  assert.ok(resumed.state.elapsed>=sidecar.snapshot.checkpoint.elapsed);
  assert.deepEqual((await saved()).trophies,before.trophies);
  assert.deepEqual((await saved()).gauntletV134,report.gauntlet.resultingArchive);
  report.gauntlet.resumed={encounterRun:resumed.encounterRun,elapsed:resumed.state.elapsed,drawn:await drawn()};
  report.qualification='NATIVE_TITLES_ARMORY_HUNT_AND_RESUME_WITH_EARNED_CAMPAIGN';
  await capture('08-native-mission-resumed');
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
