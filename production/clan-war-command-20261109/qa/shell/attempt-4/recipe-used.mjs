/** Real council UI and modal behavior. Original assets, reduced-motion desktop/mobile.
 * The esbuild fixture supplies only a profile and owner suspension controls;
 * this is separate from a full Next/GameClient campaign qualification. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.COMMAND_SHELL_OUTPUT||'production/clan-war-command-20261109/qa/shell/attempt-1');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'recipe-used.mjs'));
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const sourceFiles=['app/game/ClanWarPanelV85.tsx','app/game/ClanWarPanelV85.module.css','app/game/ClanWarBibleV6Panel.tsx','app/game/ClanWarCommandOverlay.tsx','app/game/ClanWarCommandOverlay.module.css','app/game/ClanWarOperationsV115.tsx','app/game/ClanWarOperationsV115.module.css','app/game/ClanWarAtlasV95.tsx','app/game/ClanWarAtlasV95.module.css','app/game/ClanWarGauntletV131.tsx','app/game/ClanWarGauntletV131.module.css','tests/browser/clan-war-v94.fixture.tsx','scripts/qa-clan-war-command-20261109.mjs'];
const source=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,sha(await fs.readFile(path.join(root,name)))])));
const report={schemaVersion:1,startedAt:new Date().toISOString(),scope:'Actual council, Bible navigation and original assets in the existing profile-only esbuild fixture. Real browser clicks, keys, localStorage, IDB and Web Locks. Parent suspension uses the declared fixture API; no gameplay callback or clock replaced. No Next, complete campaign, physical-controller or human artistic certification.',motion:'prefers-reduced-motion: reduce, declared before capture',checks:[],errors:[],httpErrors:[],screenshots:[],sourceBefore:await source()};
const pass=(name,detail={})=>report.checks.push({name,passed:true,...detail});
const compiled=await build({entryPoints:[path.join(root,'tests/browser/clan-war-v94.fixture.tsx')],bundle:true,write:false,outdir:path.join(root,'outputs/qa-clan-war-command-build'),format:'esm',platform:'browser',jsx:'automatic',logLevel:'warning',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'static-next-image-original-assets',setup(builder){
  builder.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'static-next-image'}));
  builder.onLoad({filter:/.*/,namespace:'static-next-image'},()=>({contents:"import React from 'react';export default function Image({unoptimized,priority,fill,...props}){return React.createElement('img',props);}",loader:'js',resolveDir:root}));
}}]});
const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=compiled.outputFiles.find(f=>f.path.endsWith('.css')).contents;
report.bundle={jsSha256:sha(js),cssSha256:sha(css)};
const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conseil de guerre</title><link rel="stylesheet" href="/fixture.css"><style>body{margin:0;background:#040b09;font:14px system-ui,sans-serif}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
const server=createServer(async(req,res)=>{
  const name=new URL(req.url??'/','http://localhost').pathname;
  if(name==='/'){res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end(html);return;}
  if(name==='/fixture.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(js);return;}
  if(name==='/fixture.css'){res.writeHead(200,{'content-type':'text/css'});res.end(css);return;}
  if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'public','.'+decodeURIComponent(name));
  if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
  try{const raw=await fs.readFile(file);res.writeHead(200,{'content-type':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'application/octet-stream'});res.end(raw);}catch{res.writeHead(404);res.end();}
});
let browser,context,page;
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});report.browserVersion=browser.version();
  context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR',reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
  const war=page.locator('[data-clan-war-v85="free-profile"]');await war.waitFor();
  const storage=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('yautja.clan-war')&&!key.includes('presentation')&&!key.includes('selected'))));
  const pristine=await storage();report.pristineArchive=pristine;
  const screenshot=async filename=>{await page.screenshot({path:path.join(out,filename)});report.screenshots.push({filename,sha256:sha(await fs.readFile(path.join(out,filename))),opened:false});};
  const frame=await war.evaluate(e=>({height:e.getBoundingClientRect().height,viewport:innerHeight,visibleButtons:[...e.querySelectorAll('button')].filter(x=>x.checkVisibility()).length,atlasTop:e.querySelector('[data-testid="clan-war-shared-atlas-v131"]').getBoundingClientRect().top,globeTop:e.querySelector('[data-testid="clan-war-atlas-v95"] svg[role="group"]').getBoundingClientRect().top,globeBottom:e.querySelector('[data-testid="clan-war-atlas-v95"] svg[role="group"]').getBoundingClientRect().bottom}));
  assert.ok(frame.atlasTop<550&&frame.globeTop<650&&Math.min(frame.globeBottom,frame.viewport)-frame.globeTop>=250,JSON.stringify(frame));assert.equal(await page.locator('dialog[open]').count(),0);
  pass('The central atlas appears within the first desktop screen, with ancillary systems behind command layers',{measurements:frame});
  await screenshot('01-front-desktop.png');
  for(const [key,title] of [['archives','Archives du conseil'],['settings','Projection du commandement'],['help','Doctrine du conseil'],['worlds','Théâtres planétaires'],['territory','Camp des Haltes'],['orders','Ordres et clôture du cycle'],['forces','Forces et garnisons'],['convoy','Convois et routes'],['journal','Journal et mémorial'],['sources','Conseil des sources']]){
    const trigger=war.locator(`[data-command-open="${key}"]`);await trigger.click();
    const dialog=key==='territory'?page.getByRole('dialog').filter({has:page.locator('[data-testid="war-order-panel-v98"]')}):page.getByRole('dialog',{name:title,exact:true});
    await dialog.waitFor();assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);assert.equal(await war.isVisible(),true);
    assert.deepEqual(await storage(),pristine);pass(`${key}: native focus confinement, Escape return and unchanged gameplay archive`);
  }
  for(const [key,title] of [['display','Carte et affichage'],['intel','Renseignement territorial']]){
    const trigger=war.locator(`[data-atlas-command="${key}"]`);await trigger.click();
    const layer=page.getByRole('dialog',{name:title,exact:true});await layer.waitFor();
    assert.equal(await layer.evaluate(el=>el.contains(document.activeElement)),true);
    if(key==='display'){await layer.getByRole('combobox',{name:'Couleurs de la carte',exact:true}).waitFor();assert.equal(await layer.locator('[aria-label="Contrôle des factions sur toute la planète"]').isVisible(),true);}
    await page.keyboard.press('Escape');await layer.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(await storage(),pristine);pass(`Atlas ${key}: former map options/readouts remain accessible in their actual focused layer`);
  }
  const sourceTerritory=war.locator('g[data-territory-id][data-source="true"]').first();
  await sourceTerritory.focus();await page.keyboard.press('Enter');
  const territoryLayer=page.getByRole('dialog').filter({has:page.locator('[data-testid="war-order-panel-v98"]')});await territoryLayer.waitFor();
  await page.keyboard.press('Escape');await territoryLayer.waitFor({state:'hidden'});assert.equal(await sourceTerritory.evaluate(el=>el===document.activeElement),true);
  assert.deepEqual(await storage(),pristine);pass('Keyboard Enter on the actual SVG territory opens contextual orders and Escape restores that territory');
  await war.locator('[data-atlas-command="intel"]').click();let intelLayer=page.getByRole('dialog',{name:'Renseignement territorial',exact:true});await intelLayer.waitFor();
  await intelLayer.getByRole('button',{name:'Choisir une cible sur la carte →',exact:true}).click();await intelLayer.waitFor({state:'hidden'});
  assert.equal(await war.getByRole('button',{name:'2 · Cible voisine',exact:true}).getAttribute('aria-pressed'),'true');
  await war.getByRole('button',{name:'1 · Départ / inspection',exact:true}).click();pass('Choosing a target from intelligence closes its modal so the real map is immediately usable');
  await war.getByRole('button',{name:'▱ Planisphère',exact:true}).click();assert.equal(await war.locator('div[data-projection="map"]').isVisible(),true);
  await war.getByRole('button',{name:'◎ Globe',exact:true}).click();assert.equal(await war.locator('div[data-projection="globe"]').isVisible(),true);
  assert.deepEqual(await storage(),pristine);pass('Both real projections stay available without serializing view state into a front');
  await war.locator('[data-command-open="settings"]').click();let dialog=page.getByRole('dialog',{name:'Projection du commandement',exact:true});await dialog.waitFor();
  await page.evaluate(()=>window.__warUiV94.suspend(true));await dialog.waitFor({state:'hidden'});assert.equal(await war.getAttribute('inert'),'');
  await page.evaluate(()=>window.__warUiV94.suspend(false));await dialog.waitFor();assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
  pass('An owner pause closes the native top layer under inert; resume restores its focus confinement',{ownerFixtureOnly:true});
  const atlasElement=await war.locator('[data-testid="clan-war-shared-atlas-v131"]').elementHandle();
  await dialog.getByRole('button',{name:'Vue stratégique classique',exact:true}).click();assert.equal(await war.getAttribute('data-war-presentation'),'classic');
  assert.equal(await war.locator('[data-testid="clan-war-shared-atlas-v131"]').evaluate((el,previous)=>el===previous,atlasElement),true);
  await dialog.getByRole('button',{name:'Gauntlet holographique',exact:true}).click();await page.keyboard.press('Escape');
  assert.deepEqual(await storage(),pristine);pass('Changing projection preserves the actual mounted atlas and all war archive bytes');
  await war.locator('[data-command-open="worlds"]').click();dialog=page.getByRole('dialog',{name:'Théâtres planétaires',exact:true});await dialog.waitFor();
  const worlds=dialog.locator('[data-testid="war-planet-selector-v96"] select').first();
  const ids=await worlds.locator('option').evaluateAll(items=>items.map(i=>i.value));assert.ok(ids.length>=30);
  await worlds.selectOption(ids.find(id=>id!=='korthas'));await dialog.waitFor({state:'hidden'});await war.waitFor();
  assert.equal(await war.locator('[data-command-open="worlds"]').evaluate(el=>el===document.activeElement),true);
  await war.locator('[data-command-open="worlds"]').click();dialog=page.getByRole('dialog',{name:'Théâtres planétaires',exact:true});await dialog.waitFor();await dialog.locator('[data-testid="war-planet-selector-v96"] select').first().selectOption('korthas');await dialog.waitFor({state:'hidden'});await war.waitFor();
  assert.deepEqual(await storage(),pristine);pass('The native world selector switches and returns fronts without gameplay resets, and restores visible keyboard focus',{worlds:ids.length});
  await war.locator('[data-command-section="bible"]').click();
  assert.equal(await war.locator('[data-war-tool-id="missions"]').getAttribute('aria-pressed'),'true');
  const groups={front:['missions','exercise','rtsSquads'],forces:['teams','routes','works','specialized','logistics'],cartography:['variants','geoai','w3maps','rts24'],archives:['dossiers','library']};
  for(const [group,tools] of Object.entries(groups)){
    await war.locator(`[data-war-tool-group="${group}"]`).click();
    for(const tool of tools){const button=war.locator(`[data-war-tool-id="${tool}"]`);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}
  }
  pass('All fourteen former Bible tools remain reachable through four actual submenus',{groups:4,tools:14});
  await war.locator('[data-war-tool-group="front"]').click();await screenshot('02-mandates-desktop.png');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await war.locator('[data-command-section="korthas"]').click();
    const size=await war.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(size.scroll<=size.client+1,JSON.stringify(size));
    await screenshot(`03-front-${width}.png`);
    await war.locator('[data-command-open="archives"]').click();dialog=page.getByRole('dialog',{name:'Archives du conseil',exact:true});await dialog.waitFor();
    const bounds=await dialog.boundingBox();assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1);assert.equal(await dialog.getByRole('button',{name:'Exercice V3 · canyon',exact:true}).isVisible(),true);
    await screenshot(`03-archives-${width}.png`);await page.keyboard.press('Escape');
    await war.locator('[data-command-open="territory"]').click();dialog=page.getByRole('dialog').filter({has:page.locator('[data-testid="war-order-panel-v98"]')});await dialog.waitFor();
    const content=await dialog.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(content.scroll<=content.client+1,JSON.stringify(content));await screenshot(`04-orders-${width}.png`);await page.keyboard.press('Escape');
    await war.locator('[data-command-section="bible"]').click();await war.locator('[data-war-tool-group="cartography"]').click();
    assert.equal(await war.locator('[data-war-tool-id="variants"]').isVisible(),true);await screenshot(`05-submenus-${width}.png`);
    pass(`${width}px: shell and contextual orders fit, old exercises remain visible and submenu choices stay accessible`,{viewport:width});
  }
  await page.setViewportSize({width:1440,height:1000});await war.locator('[data-command-open="archives"]').click();dialog=page.getByRole('dialog',{name:'Archives du conseil',exact:true});await dialog.waitFor();
  await dialog.getByRole('button',{name:'Exercice V3 · canyon',exact:true}).click();
  for(const name of ['Grimper à la corniche · observer les signaux','Rejoindre la maintenance par la rampe','Préserver le refuge · réserve propre et détour','Atteindre le poste et transmettre le renseignement','Sceller le manifeste et prendre le commandement'])await war.getByRole('button',{name,exact:true}).click();
  await war.getByRole('button',{name:'Avancer d’une seconde',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)||'null')?.seconds===1);
  pass('The archived canyon remains genuinely playable through the new archive layer; one native tactical second is persisted');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);pass('No uncaught browser or HTTP resource errors');
  report.sourceAfter=await source();assert.deepEqual(report.sourceAfter,report.sourceBefore);pass('Every selected source and the executed recipe remain byte identical throughout the run');report.passed=true;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,out}));}
