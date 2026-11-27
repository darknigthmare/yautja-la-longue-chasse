/**
 * Component browser QA for Combat Games guide extensions.
 * Uses real repo components, real assets and canonical save fixture reducers.
 * Run from any checkout: PIT_QA_REPO=/checkout PIT_QA_CHROMIUM=/path/to/chromium node scripts/qa-pit-guide-extensions-v1.mjs
 * Optional PIT_QA_OUTPUT, PIT_QA_ASSETS, PIT_QA_CHROMIUM_ARGS_JSON.
 * Needs installed repo esbuild and playwright; installs nothing and changes no repo sources.
 * Fixtures are explicit setup, not played wins. A launch assertion covers the callback, not a full game.
 */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const repo=path.resolve(process.env.PIT_QA_REPO||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'pit-guide-extensions-qa-'));
const require=createRequire(repo+'/package.json');
const {chromium:playwright}=require('playwright');
const output=path.resolve(process.env.PIT_QA_OUTPUT||root+'/output');fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),scope:'Real PitSelectionFlow, FighterCard and PitHonorsPanel component harness; fixture rewards are not played victories; no complete game claim.',browser:'Chromium launched by Playwright; executable path is configurable',checks:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],httpFailures:[],phaseHistory:[]};
report.sourceHashes=Object.fromEntries(['app/game/PitSelectionFlow.tsx','app/game/PitSelectionFlow.module.css','app/game/PitHonorsPanel.tsx','app/game/PitHonorsPanel.module.css','app/game/PitCanvas.tsx','app/game/systems/pitSelectionPresentationV1.ts','app/game/systems/pitContentAccessV1.ts'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(repo+'/'+p)).digest('hex')]));
const harnessSource = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PitSelectionFlow from '__PIT_REPO__/app/game/PitSelectionFlow';
import PitHonorsPanel from '__PIT_REPO__/app/game/PitHonorsPanel';
import { FighterCard } from '__PIT_REPO__/app/game/PitCanvas';
import { applyPitResult, createPitSave, pitSaveStorageKey, serializePitSave } from '__PIT_REPO__/app/game/systems/pitSave';
import { PIT_ARCADE_LADDERS } from '__PIT_REPO__/app/game/systems/pitArcade';
import type { PitVersusFighterId } from '__PIT_REPO__/app/game/systems/pitRosterExpansion';
import type { PitArenaId } from '__PIT_REPO__/app/game/systems/pitCombat';
import styles from '__PIT_REPO__/app/game/PitCanvas.module.css';
const OWNER = '2026-11-27T06:30:00.000Z';
const AT = '2026-11-27T06:45:00.000Z';
const params = new URLSearchParams(location.search);
const fixture = params.get('fixture') || 'empty';
const key = pitSaveStorageKey(OWNER);
// Explicit test setup: canonical result reducer, not victories played in this browser.
if (params.get('view') === 'honors') {
  let save = createPitSave(OWNER);
  if (fixture === 'earned') {
    const ladder = PIT_ARCADE_LADDERS['jungle-hunter'];
    for(let i=0;i<ladder.encounters.length;i++) {
      const result=applyPitResult(save,{id:'qa-fixture-arcade-'+i,mode:'arcade',outcome:'victory',fighterId:'jungle-hunter',arenaId:ladder.encounters[i].arenaId,roundsWon:2,roundsLost:0,arcadeEncounterIndex:i,arcadeCompleted:i===ladder.encounters.length-1,cosmeticRewardIds:i===ladder.encounters.length-1?[ladder.cosmeticRewardId]:[],completedAt:AT});
      save=result.save;
    }
  }
  if(fixture==='corrupt')localStorage.setItem(key,'{invalid fixture');
  else if(fixture==='wrong-owner')localStorage.setItem(key,serializePitSave(createPitSave('2026-11-26T06:30:00.000Z')));
  else if(fixture==='missing')localStorage.removeItem(key);
  else localStorage.setItem(key,serializePitSave(save));
}
function App() {
  const [player,setPlayer]=useState<PitVersusFighterId>('jungle-hunter');
  const [opponent,setOpponent]=useState<PitVersusFighterId>('city-hunter');
  const [playerVariant,setPlayerVariant]=useState<string|null>(null);
  const [opponentVariant,setOpponentVariant]=useState<string|null>(null);
  const [arena,setArena]=useState<PitArenaId>('the-pit');
  const [mode,setMode]=useState<'cpu'|'local'|'training'>('local');
  const [launched,setLaunched]=useState(0);
  const [exits,setExits]=useState(0);
  const [reduced,setReduced]=useState(params.get('reduced')==='true');
  if(params.get('view')==='honors')return <main style={{maxWidth:1180,margin:'0 auto',padding:16}}>
    <p data-qa-scope>QA composant réel · fixture {fixture} · aucune partie simulée dans le navigateur</p>
    <PitHonorsPanel owner={OWNER} onOpenPit={()=>location.assign('/')} />
  </main>;
  return <section className={['screen',styles.root,styles.selectionRoot].join(' ')} data-pit-selection-screen="component-harness" style={{position:'relative'}}>
    <div className={styles.selectionBackdrop} aria-hidden="true"/>
    <header className={styles.selectionHeader}>
      <div><span className={styles.eyebrow}>QA COMPOSANTS · THE PIT</span><h2>THE PIT</h2></div>
      <p className={styles.selectionPopulation} data-qa-result>Lancements: {launched} · retours: {exits}</p>
      <div className={styles.selectionHeaderActions}>
        <button type="button" data-qa-reduced onClick={()=>setReduced(x=>!x)} aria-pressed={reduced}>Mouvement réduit</button>
        <button type="button" onClick={()=>location.assign('/?view=honors')}>Distinctions</button>
      </div>
    </header>
    <div className={styles.modeGrid} role="radiogroup" aria-label="Mode de combat">
      {([['cpu','Duel CPU'],['local','Versus local'],['training','Entraînement']] as const).map(([id,label])=><button key={id} type="button" role="radio" aria-checked={mode===id} className={[styles.modeCard,mode===id?styles.modeCardActive:''].join(' ')} onClick={()=>setMode(id)}><strong>{label}</strong></button>)}
    </div>
    <PitSelectionFlow key={mode} mode={mode} playerId={player} opponentId={opponent} arenaId={arena}
      playerVariantId={playerVariant} opponentVariantId={opponentVariant}
      onPlayerVariantChange={setPlayerVariant} onOpponentVariantChange={setOpponentVariant}
      locked={false} imposed={false} eventOnly={false}
      playerPreview={<FighterCard fighterId={player} variantId={playerVariant} side="GAUCHE"/>}
      opponentPreview={<FighterCard fighterId={opponent} variantId={opponentVariant} side="DROITE"/>}
      onPlayerChange={id=>{setPlayer(id);setPlayerVariant(null)}} onOpponentChange={id=>{setOpponent(id);setOpponentVariant(null)}}
      onArenaChange={setArena} onLaunch={()=>setLaunched(x=>x+1)} onExit={()=>setExits(x=>x+1)}
      launchLabel="COMMENCER" launchDisabled={false} reducedMotion={reduced} highContrast={false}
    />
  </section>;
}
createRoot(document.getElementById('root')!).render(<App/>);
`;
const entry=path.join(root,'App.tsx');fs.writeFileSync(entry,harnessSource.replaceAll('__PIT_REPO__',repo));
const esbuild=require('esbuild');
await esbuild.build({entryPoints:[entry],bundle:true,format:'iife',platform:'browser',target:'es2022',outfile:root+'/app.js',jsx:'automatic',external:['/game/*'],loader:{'.module.css':'local-css'},nodePaths:[repo+'/node_modules'],define:{'process.env.NODE_ENV':'"production"'},logLevel:'warning'});
fs.writeFileSync(root+'/index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA composant The PIT</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/app.css"><style>html,body,#root{margin:0;min-width:0;min-height:100%;background:#07100c;color:#e9e1ca;font-family:Arial,sans-serif}button,input,select{font:inherit}button{cursor:pointer}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
const assetsRoot=path.resolve(process.env.PIT_QA_ASSETS||repo+'/public');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}if(pathname.includes('..')){res.writeHead(400).end();return}const base=pathname.startsWith('/game/')?assetsRoot:root;const target=path.join(base,pathname==='/'?'index.html':pathname);try{const bytes=await fs.promises.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes)}catch{res.writeHead(404,{'content-type':'text/plain'}).end('QA asset unavailable: '+pathname)}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl='http://127.0.0.1:'+server.address().port;
const executablePath=process.env.PIT_QA_CHROMIUM||playwright.executablePath();
if(!fs.existsSync(executablePath))throw new Error('Chromium executable not found; install Playwright Chromium or set PIT_QA_CHROMIUM. No browser result can be claimed.');
const args=process.env.PIT_QA_CHROMIUM_ARGS_JSON?JSON.parse(process.env.PIT_QA_CHROMIUM_ARGS_JSON):['--no-sandbox','--disable-dev-shm-usage'];
const browser=await playwright.launch({executablePath,args,headless:true});
report.browserVersion=await browser.version();report.bundleSha256=crypto.createHash('sha256').update(fs.readFileSync(root+'/app.js')).digest('hex');
console.log('QA component harness '+baseUrl);

let fault='none';
async function pageFor(viewport={width:1440,height:900},url='/'){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(6000);
  page.on('pageerror',e=>report.pageErrors.push({url:page.url(),message:e.message,fault}));
  page.on('console',e=>{if(e.type()==='error')report.consoleErrors.push({url:page.url(),message:e.text(),fault})});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText,fault}));
  page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({url:r.url(),status:r.status(),fault})});
  await page.addInitScript(()=>{window.__pitPhases=[];new MutationObserver(records=>{for(const m of records){if(m.type==='attributes'){const e=m.target;window.__pitPhases.push({phase:e.getAttribute('data-pit-selection-presentation'),side:e.getAttribute('data-selection-side'),t:performance.now()});}else for(const e of document.querySelectorAll('[data-pit-selection-presentation]')){const v=e.getAttribute('data-pit-selection-presentation');const a=window.__pitPhases.at(-1);if(!a||a.phase!==v)window.__pitPhases.push({phase:v,side:e.getAttribute('data-selection-side'),t:performance.now()});}}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-pit-selection-presentation']});});
  if(url!==null)await page.goto(baseUrl+url,{waitUntil:'networkidle'});
  return page;
}
async function check(name,fn){try{const details=await fn();report.checks.push({name,status:'pass',details});console.log('PASS '+name)}catch(e){report.checks.push({name,status:'fail',error:e.message,stack:e.stack});console.log('FAIL '+name+': '+e.message)}finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2))}}
async function screenshot(page,name){await page.screenshot({path:output+'/'+name+'.png',fullPage:true});report.screenshots.push({name,path:output+'/'+name+'.png',viewport:page.viewportSize()});}
const side=(page,which='player')=>page.locator(`[data-selection-side="${which}"]`);
const phase=(page,which='player')=>side(page,which).getAttribute('data-pit-selection-presentation');
async function waitPhase(page,value,which='player'){await page.waitForFunction(({value,which})=>document.querySelector(`[data-selection-side="${which}"]`)?.getAttribute('data-pit-selection-presentation')===value,{value,which});}
async function readySelection(page){await page.locator('[data-pit-selection-immersive]').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('[data-pit-fighter-media] img')].every(i=>i.dataset.artReady==='true'));}
async function goStage(page){await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-stage-preview]').waitFor();}
async function saveValue(page){return page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage))));}

const desktop=await pageFor();
await check('desktop: native portraits and initial preview',async()=>{await readySelection(desktop);assert.equal(await phase(desktop),'preview');assert.equal(await side(desktop).getAttribute('data-pit-native-selection-animation'),'unavailable');assert.equal(await desktop.locator('[data-pit-roster-total]').getAttribute('data-pit-roster-total'),'201');assert.equal(await desktop.locator('[data-pit-extension-portrait="authored-idle-pose"]').count(),4);await screenshot(desktop,'desktop-selection');return{viewport:desktop.viewportSize(),portraits:'real native files',nativeSelectionAnimation:'unavailable'};});
await check('desktop: hover then settled preview',async()=>{await desktop.locator('[data-choice-id="jungle-hunter"]').hover();await waitPhase(desktop,'hover');await waitPhase(desktop,'preview');});
await check('desktop: costume selection uses exact variant and settles',async()=>{await desktop.locator('[data-pit-variant-select]').selectOption({index:1});await waitPhase(desktop,'costume');const chosen=await desktop.locator('[data-pit-variant-select]').inputValue();assert.equal(await desktop.locator('[data-selection-side="player"] [data-fighter-variant]').getAttribute('data-fighter-variant'),chosen);await waitPhase(desktop,'preview');await readySelection(desktop);return{chosen};});
await check('desktop: rapid variants and identity changes cancel stale cues',async()=>{await desktop.locator('[data-pit-variant-select]').selectOption({index:2});await desktop.locator('[data-choice-id="scar"]').click();await desktop.locator('[data-choice-id="jungle-hunter"]').click();await desktop.waitForTimeout(450);assert.equal(await phase(desktop),'preview');assert.equal(await desktop.locator('[data-selection-side="player"] [data-fighter-id]').getAttribute('data-fighter-id'),'jungle-hunter');assert.equal(await desktop.locator('[data-pit-variant-select]').inputValue(),'');});
await check('desktop: keyboard confirmation then waiting',async()=>{await desktop.locator('[data-choice-id="jungle-hunter"]').focus();await desktop.keyboard.press('Enter');await waitPhase(desktop,'confirm');assert.equal(await desktop.locator('[data-pit-selection-immersive]').getAttribute('data-pit-selection-slot'),'opponent');const animation=await side(desktop).evaluate(e=>getComputedStyle(e).animationName);assert.notEqual(animation,'none');await waitPhase(desktop,'waiting');return{animation};});
await check('desktop: back reopens choice with deselection',async()=>{await desktop.getByRole('button',{name:/Retour au joueur 1/}).click();await waitPhase(desktop,'deselect');await waitPhase(desktop,'preview');assert.equal(await side(desktop).getAttribute('data-confirmed'),'false');assert.equal(await desktop.locator('[data-pit-selection-immersive]').getAttribute('data-pit-selection-slot'),'player');});
await check('desktop: keyboard variants and directional focus',async()=>{await desktop.locator('[data-choice-id="jungle-hunter"]').focus();await desktop.keyboard.press('e');assert.notEqual(await desktop.locator('[data-pit-variant-select]').inputValue(),'');await desktop.keyboard.press('q');assert.equal(await desktop.locator('[data-pit-variant-select]').inputValue(),'');await desktop.keyboard.press('ArrowRight');assert.equal(await desktop.locator('[data-selection-side="player"] [data-fighter-id]').getAttribute('data-fighter-id'),'city-hunter');await desktop.keyboard.press('ArrowLeft');assert.equal(await desktop.locator('[data-selection-side="player"] [data-fighter-id]').getAttribute('data-fighter-id'),'jungle-hunter');});
await check('desktop: team and actual stage rendering',async()=>{await goStage(desktop);assert.equal(await desktop.locator('[data-pit-selection-presentation="team"]').count(),1);await desktop.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.getAttribute('data-preview-status')==='ready');const planes=await desktop.locator('[data-pit-stage-preview]').getAttribute('data-preview-planes');assert.ok(planes.includes('P0')&&planes.includes('P5'));assert.equal(await desktop.locator('[data-pit-selection-confirm]').isDisabled(),false);await screenshot(desktop,'desktop-stage-ready');return{planes};});
await check('desktop: return from stage retains J1 confirmed and reopens J2',async()=>{const start=await desktop.evaluate(()=>window.__pitPhases.length);await desktop.getByRole('button',{name:/Retour aux combattants/}).click();await desktop.waitForFunction(start=>window.__pitPhases.slice(start).some(e=>e.side==='opponent'&&e.phase==='deselect'),start);assert.equal(await side(desktop).getAttribute('data-confirmed'),'true');await waitPhase(desktop,'preview','opponent');});
await check('desktop: departure follows real stage readiness',async()=>{await desktop.locator('[data-pit-selection-confirm]').click();await desktop.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.getAttribute('data-preview-status')==='ready');await desktop.locator('[data-pit-selection-confirm]').click();assert.equal(await desktop.locator('[data-pit-selection-presentation="depart"]').count(),1);assert.match(await desktop.locator('[data-qa-result]').innerText(),/LANCEMENTS: 1/i);return{launchMeaning:'harness callback only; no combat played'};});
report.phaseHistory.push({scenario:'desktop',events:await desktop.evaluate(()=>window.__pitPhases)});
await desktop.context().close();

const reduced=await pageFor({width:1440,height:900},'/?reduced=true');
await check('reduced motion: confirmation settles and no animation',async()=>{await readySelection(reduced);await reduced.locator('[data-pit-selection-confirm]').click();await waitPhase(reduced,'waiting');assert.equal(await side(reduced).evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await reduced.locator('[data-pit-selection-immersive]').getAttribute('data-reduced-motion'),'true');await screenshot(reduced,'desktop-reduced-motion');});
await check('reduced motion: stage fixed camera and frame',async()=>{await reduced.locator('[data-pit-selection-confirm]').click();await reduced.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.getAttribute('data-preview-status')==='ready');const before=await reduced.locator('[data-pit-stage-preview]').getAttribute('data-preview-frame');await reduced.waitForTimeout(180);assert.equal(await reduced.locator('[data-pit-stage-preview]').getAttribute('data-preview-frame'),before);assert.equal(before,'0');});

await reduced.context().close();
const mobile=await pageFor({width:390,height:844});
await check('mobile: layout bounded and controls reachable',async()=>{await readySelection(mobile);const layout=await mobile.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(layout.doc<=layout.width+1,JSON.stringify(layout));assert.ok(await mobile.locator('[data-pit-selection-confirm]').isVisible());const box=await mobile.locator('[data-pit-selection-confirm]').boundingBox();assert.ok(box.height>=44);await screenshot(mobile,'mobile-selection');return layout;});
await check('mobile: click variant, confirm and return',async()=>{await mobile.locator('[data-pit-variant-next]').click();await waitPhase(mobile,'costume');await mobile.locator('[data-pit-selection-confirm]').click();await waitPhase(mobile,'waiting');await mobile.getByRole('button',{name:/Retour au joueur 1/}).click();await waitPhase(mobile,'preview');assert.equal(await mobile.locator('[data-pit-selection-immersive]').getAttribute('data-pit-selection-slot'),'player');});

await mobile.context().close();
const empty=await pageFor({width:1440,height:900},'/?view=honors&fixture=empty');
await check('honors: 18 sealed default slots with concealed palette',async()=>{assert.equal(await empty.locator('[data-pit-honor]').count(),18);assert.equal(await empty.locator('[data-pit-honor-seal="sealed"]').count(),18);assert.equal(await empty.locator('[data-earned="true"]').count(),0);assert.equal(await empty.getByRole('checkbox').isChecked(),false);const palettes=await empty.locator('[data-access-visual="silhouette"] [aria-label^="Palette scellée"] span').evaluateAll(els=>els.map(e=>({title:e.getAttribute('title'),style:e.getAttribute('style'),background:getComputedStyle(e).backgroundColor})));assert.ok(palettes.length>0);assert.ok(palettes.every(p=>p.title===null&&p.style===null&&p.background==='rgb(5, 11, 7)'));assert.equal(await empty.locator('[data-access-right="locked"]').count(),18);await screenshot(empty,'honors-empty-desktop');return{cards:18,paletteSwatches:palettes.length,background:'rgb(5, 11, 7)'};});
await check('honors: filter and conditions are read-only',async()=>{const before=await saveValue(empty);await empty.getByRole('checkbox').check();assert.equal(await empty.locator('[data-pit-honor]').count(),0);await empty.getByRole('button',{name:'Voir les conditions'}).click();assert.equal(await empty.locator('[data-pit-honor]').count(),18);assert.equal(await saveValue(empty),before);});
await empty.context().close();
const earned=await pageFor({width:390,height:844},'/?view=honors&fixture=earned');
await check('honors: canonical Arcade fixture reveals one earned reward only',async()=>{assert.equal(await earned.locator('[data-pit-honor]').count(),18);assert.equal(await earned.locator('[data-pit-honor-seal="open"]').count(),1);assert.equal(await earned.locator('[data-pit-honor-seal="sealed"]').count(),17);assert.equal(await earned.locator('[data-access-right="permanent"]').count(),1);const swatches=await earned.locator('[data-earned="true"] [aria-label="Couleurs de la distinction"] span').evaluateAll(els=>els.map(e=>({title:e.title,style:e.getAttribute('style')})));assert.equal(swatches.length,3);assert.ok(swatches.every(x=>x.title.startsWith('#')&&x.style));const before=await saveValue(earned);await earned.getByRole('checkbox').check();assert.equal(await earned.locator('[data-pit-honor]').count(),1);assert.equal(await saveValue(earned),before);const layout=await earned.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth}));assert.ok(layout.doc<=layout.width+1,JSON.stringify(layout));await screenshot(earned,'honors-earned-mobile');return{fixture:'createPitSave + 8 applyPitResult victories; explicit fixture, not gameplay',swatches,layout};});
await earned.context().close();
for(const [fixture,status,text] of [['corrupt','corrupt-save','endommagée'],['wrong-owner','owner-conflict','autre campagne']]){const page=await pageFor({width:1440,height:900},'/?view=honors&fixture='+fixture);await check('honors: '+fixture+' remains private and unchanged',async()=>{const before=await saveValue(page);assert.equal(await page.locator('[data-pit-honors]').getAttribute('data-honors-status'),status);assert.equal(await page.locator('[data-pit-honor]').count(),0);assert.match(await page.locator('[data-pit-honors]').innerText(),new RegExp(text));await page.getByRole('button',{name:'Réessayer la lecture'}).click();assert.equal(await saveValue(page),before);});await page.context().close();}

fault='injected-portrait-failure';
const broken=await pageFor({width:1440,height:900},null);
let blockedPortrait='';
await broken.route('**/game/**',route=>{const url=route.request().url();if(url.endsWith('/game/assets/v23/pit/fighters/jungle-hunter-key-art.webp')){blockedPortrait=url;return route.abort('failed')}return route.continue()});
await check('portrait: actual load failure is distinct from locked content, retry succeeds',async()=>{await broken.goto(baseUrl+'/',{waitUntil:'networkidle'});await broken.getByText('Portrait indisponible',{exact:true}).waitFor();assert.equal(await side(broken).getAttribute('data-pit-selection-presentation'),'preview');assert.equal(await side(broken).getAttribute('data-access-right'),null);assert.equal(await broken.locator('[data-pit-selection-confirm]').isEnabled(),true);await screenshot(broken,'portrait-failure');await broken.unroute('**/game/**');await broken.getByRole('button',{name:'Réessayer le portrait'}).click();await readySelection(broken);return{blockedPortrait};});
await broken.context().close();
fault='injected-stage-failure';
const failedStage=await pageFor({width:1440,height:900});
await failedStage.route('**/p0-a-vault-depth.png',r=>r.abort('failed'));
await check('stage: actual asset failure prevents launch, retry restores readiness',async()=>{await goStage(failedStage);await failedStage.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.getAttribute('data-preview-status')==='failed');assert.equal(await failedStage.locator('[data-pit-selection-confirm]').isDisabled(),true);assert.match(await failedStage.locator('[data-qa-result]').innerText(),/LANCEMENTS: 0/i);await screenshot(failedStage,'stage-failure');await failedStage.unroute('**/p0-a-vault-depth.png');await failedStage.getByRole('button',{name:'Réessayer l’aperçu'}).click();await failedStage.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.getAttribute('data-preview-status')==='ready');assert.equal(await failedStage.locator('[data-pit-selection-confirm]').isEnabled(),true);});
await failedStage.context().close();
fault='none';
await check('runtime: no uncaught JavaScript exceptions',async()=>{assert.deepEqual(report.pageErrors,[]);});
await check('runtime: all required requests served except intentional faults',async()=>{assert.deepEqual(report.httpFailures,[]);assert.ok(report.consoleErrors.every(x=>x.fault.startsWith('injected-')&&x.message.includes('net::ERR_FAILED')));assert.ok(report.failedRequests.every(x=>x.fault.startsWith('injected-')));return{intentionalFaultRequests:report.failedRequests.length};});
await check('presentation: all eight distinct phases observed',async()=>{assert.deepEqual([...new Set(report.phaseHistory.flatMap(g=>g.events.map(e=>e.phase)))].sort(),['confirm','costume','depart','deselect','hover','preview','team','waiting']);});
report.summary={passed:report.checks.filter(x=>x.status==='pass').length,failed:report.checks.filter(x=>x.status==='fail').length,pageErrors:report.pageErrors.length,consoleErrors:report.consoleErrors.length,httpFailures:report.httpFailures.length};
fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));
await browser.close();server.close();console.log(JSON.stringify({...report.summary,report:output+'/report.json'}));process.exit(report.summary.failed?1:0);
