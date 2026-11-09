import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(process.env.COMMAND_NEXT_REPO||process.cwd());
const {chromium}=await import(pathToFileURL(path.join(root,'node_modules/playwright-core/index.mjs')).href);
const url=process.env.COMMAND_NEXT_URL||'http://127.0.0.1:3124';
const out=path.resolve(root,process.env.COMMAND_NEXT_OUTPUT||'production/clan-war-command-20261109/qa/next/attempt-1');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
const files=["app/game/ClanWarPanelV85.tsx", "app/game/ClanWarPanelV85.module.css", "app/game/ClanWarBibleV6Panel.tsx", "app/game/ClanWarCommandOverlay.tsx", "app/game/ClanWarCommandOverlay.module.css", "app/game/ClanWarAtlasV95.tsx", "app/game/ClanWarAtlasV95.module.css", "app/game/ClanWarGauntletV131.tsx", "app/game/ClanWarGauntletV131.module.css", "app/game/ClanWarOperationsV115.tsx", "app/game/ClanWarOperationsV115.module.css", "app/game/useMenuGamepad.ts", "app/game/GameClient.tsx", "app/game/ClanShipHub.tsx", "app/game/ClanShipOperationsPanel.tsx", "app/game/systems/clanWarOperationsArchive.ts", "app/game/systems/clanWarOperationsV115.ts", "app/game/systems/clanWarFenceV94.ts", "package.json", "package-lock.json"];
const source=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(path.join(root,f)))])));
const report={schemaVersion:1,url,scope:'Actual production Next GameClient, played route to council and new command layers. Historical B05 adult/aboard prerequisites declared; no game callback, clock, actor or outcome patched. Read-only UI plus one explicitly launched fresh V115 operation; not a full campaign or physical-pad/art certification.',
  fixture:'production/crew-dialogue-20261109/qa/native/attempt-1/initial-agreement.json',fixtureFullCampaign:false,checks:[],errors:[],consoleErrors:[],httpErrors:[],requestFailures:[],servedScripts:[],screenshots:[],downloads:[],physicalGamepad:false,humanArtReviewed:false};
report.recipe={path:'scripts/qa-clan-war-command-next-20261109.mjs',sha256:sha(await fs.readFile(fileURLToPath(import.meta.url)))};await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'recipe-used.mjs'));report.sourceBefore=await source();report.buildIdBefore=(await fs.readFile(path.join(root,'.next/BUILD_ID'),'utf8')).trim();
const fixtureRaw=await fs.readFile(path.join(root,report.fixture),'utf8'),save=JSON.parse(fixtureRaw);
report.fixtureSha256=sha(fixtureRaw);
let browser,page,context;const scripts=[];
const check=(name,detail={})=>report.checks.push({name,passed:true,...detail});
try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});report.browserVersion=browser.version();
 context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.addInitScript(({save})=>{if(['http:','https:'].includes(location.protocol)&&!localStorage.getItem('__atlasExportSeeded')){localStorage.setItem('yautja-long-hunt.save',JSON.stringify(save));localStorage.setItem('__atlasExportSeeded','1');}},{save});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()}));
 page.on('response',response=>{
  if(response.status()>=400)report.httpErrors.push({url:response.url(),status:response.status()});
  if(response.request().resourceType()==='script'&&response.url().includes('/_next/static/')&&response.status()<400)scripts.push((async()=>{
   const pathname=new URL(response.url()).pathname,raw=await response.body(),filename='.next/'+pathname.slice('/_next/'.length),built=await fs.readFile(path.join(root,filename));
   report.servedScripts.push({pathname,bytes:raw.length,sha256:sha(raw),builtSha256:sha(built),matches:sha(raw)===sha(built)});
  })().catch(e=>report.errors.push('script-proof: '+e.message)));
 });
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-campaign-menu]').waitFor();
 if(await page.locator('[data-menu-section="campaign"]').isVisible())await page.locator('[data-menu-section="campaign"]').click();
 await page.locator('[data-menu-action="continue"]').click();
 await page.locator('[data-clan-interior]').waitFor({timeout:90000});
 await page.locator('[data-clan-ship-room-target="conseil"]').click();
 await page.waitForFunction(()=>{const e=document.querySelector('[data-clan-interior]');return e?.getAttribute('data-interior-room')==='conseil'&&e.getAttribute('data-interior-moving')==='false'&&!e.getAttribute('data-interior-target-room');},null,{timeout:90000});
 const service=page.locator('[data-interior-service="conseil"]');
 if(await service.getAttribute('data-interior-ready')!=='true'){await service.click();await page.waitForFunction(()=>document.querySelector('[data-interior-service="conseil"]')?.getAttribute('data-interior-ready')==='true',null,{timeout:45000});}
 await service.click();
 await page.locator('[data-clan-operations]').waitFor();
 await page.locator('[data-clan-operations-tab="post"]').click();
 await page.locator('[data-clan-general-war]').click();
 await page.locator('[data-clan-war-v85="free-profile"]').waitFor({timeout:90000});

 const war=page.locator('[data-clan-war-v85="free-profile"]');
 const rawCampaignBefore=await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));
 await fs.writeFile(path.join(out,'campaign-before.json'),rawCampaignBefore);
 const rawWarBefore=await page.evaluate(()=>localStorage.getItem('yautja.clan-war.v115.operations.fenced.v2'));
 assert.equal(rawWarBefore,null);
 const screenshot=async filename=>{await page.screenshot({path:path.join(out,filename)});report.screenshots.push({filename,sha256:sha(await fs.readFile(path.join(out,filename))),opened:false});};
 const verifyHeader=async width=>{
  await war.evaluate(element=>Promise.all([element,element.closest('.screen')].filter(Boolean).flatMap(node=>node.getAnimations()).filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{}))));
  const topBar=await page.locator('.top-bar:visible').boundingBox();
  const title=await war.locator('#clan-war-v85-title').boundingBox();
  const quit=war.getByRole('button',{name:/Quitter le conseil/});const quitBounds=await quit.boundingBox();
  assert.ok(topBar&&title&&quitBounds,'Missing live game HUD, council title or exit action');
  const topBarBottom=topBar.y+topBar.height;
  assert.ok(title.y>=topBarBottom-1&&quitBounds.y>=topBarBottom-1,JSON.stringify({width,topBar,title,quitBounds}));
  assert.ok(title.x>=-1&&title.x+title.width<=width+1&&quitBounds.x>=-1&&quitBounds.x+quitBounds.width<=width+1,JSON.stringify({width,title,quitBounds}));
  assert.equal(await quit.isEnabled(),true);
  assert.equal(await quit.evaluate(element=>{const rect=element.getBoundingClientRect();const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);return hit===element||element.contains(hit);}),true);
  check(`native-${width}-council-title-and-exit-clear-the-actual-global-HUD`,{topBar,title,quitBounds});
 };
 await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
 const globe=war.locator('[data-testid="clan-war-atlas-v95"] svg[role="group"]');await globe.waitFor();await verifyHeader(1440);
 const desktop=await globe.boundingBox();assert.ok(desktop.y<650&&Math.min(desktop.y+desktop.height,1000)-Math.max(0,desktop.y)>=250,JSON.stringify(desktop));
 check('actual-council-route-opens-command-shell-with-real-globe-in-first-desktop-screen',{bounds:desktop});await screenshot('01-next-front-desktop.png');
 for(const [id,title] of [['archives','Archives du conseil'],['settings','Projection du commandement'],['help','Doctrine du conseil']]){
  const trigger=war.locator(`[data-command-open="${id}"]`);await trigger.click();const layer=page.getByRole('dialog',{name:title,exact:true});await layer.waitFor();
  assert.equal(await layer.evaluate(el=>el.contains(document.activeElement)),true);await page.keyboard.press('Tab');assert.equal(await layer.evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');await layer.waitFor({state:'hidden'});assert.equal(await war.isVisible(),true);assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  check(`native-${id}-drawer-closes-before-GameClient-Escape-and-restores-focus`);
 }
 await war.locator('[data-atlas-command="display"]').click();let layer=page.getByRole('dialog',{name:'Carte et affichage',exact:true});await layer.waitFor();await layer.getByRole('combobox',{name:'Couleurs de la carte',exact:true}).waitFor();await page.keyboard.press('Escape');await layer.waitFor({state:'hidden'});check('actual-map-controls-remain-accessible-in-native-display-drawer');
 await war.locator('[data-atlas-command="intel"]').click();layer=page.getByRole('dialog',{name:'Renseignement territorial',exact:true});await layer.waitFor();await layer.getByRole('button',{name:'Choisir une cible sur la carte →',exact:true}).click();await layer.waitFor({state:'hidden'});await war.getByRole('button',{name:'1 · Départ / inspection',exact:true}).click();check('native-intelligence-hands-back-to-the-actual-map');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await verifyHeader(width);
  const bounds=await globe.boundingBox();assert.ok(bounds.y<700&&Math.min(bounds.y+bounds.height,844)-Math.max(0,bounds.y)>=140,JSON.stringify(bounds));
  const overflow=await war.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(overflow.scroll<=overflow.client+1,JSON.stringify(overflow));await screenshot(`02-next-front-${width}.png`);
  await war.locator('[data-command-open="territory"]').click();layer=page.getByRole('dialog').filter({has:page.locator('[data-testid="war-order-panel-v98"]')});await layer.waitFor();
  await layer.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  const modalBounds=await layer.boundingBox();assert.ok(modalBounds.x>=-1&&modalBounds.x+modalBounds.width<=width+1,JSON.stringify(modalBounds));await screenshot(`03-next-orders-${width}.png`);await page.keyboard.press('Escape');await layer.waitFor({state:'hidden'});
  check(`native-${width}-layout-shows-real-globe-and-usable-territorial-drawer`,{bounds,modalBounds,overflow});
 }
 await page.setViewportSize({width:1440,height:1000});await war.locator('[data-command-section="bible"]').click();
 const groups={front:['missions','exercise','rtsSquads'],forces:['teams','routes','works','specialized','logistics'],cartography:['variants','geoai','w3maps','rts24'],archives:['dossiers','library']};
 for(const [group,tools] of Object.entries(groups)){await war.locator(`[data-war-tool-group="${group}"]`).click();for(const tool of tools){const button=war.locator(`[data-war-tool-id="${tool}"]`);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}}
 check('all-fourteen-tools-remain-accessible-through-four-native-council-submenus');
 await war.locator('[data-war-tool-group="front"]').click();const ops=war.locator('[data-testid="clan-operations-v115"]');await ops.waitFor();await ops.scrollIntoViewIfNeeded();await screenshot('04-next-mandates-desktop.png');
 await ops.locator('[data-war-command="briefing"]').click();layer=page.getByRole('dialog',{name:'Préparer un mandat',exact:true});await layer.waitFor();await layer.getByRole('button',{name:'Bataille totale · commandement RTS',exact:true}).click();await layer.locator('[data-war-briefing-step-button="target"]').click();await layer.locator('[data-war-briefing-step-button="teams"]').click();
 for(const checkbox of await layer.locator('input[type="checkbox"]').all())await checkbox.uncheck();await layer.locator('input[type="checkbox"]').first().check();
 const launch=layer.getByRole('button',{name:/^Lancer :/});assert.equal(await launch.isEnabled(),true);await page.keyboard.press('Escape');await layer.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('yautja.clan-war.v115.operations.fenced.v2')),null);check('actual-native-briefing-cancellation-has-no-RAV-debit-or-archive-initialization');
 await ops.locator('[data-war-command="briefing"]').click();layer=page.getByRole('dialog',{name:'Préparer un mandat',exact:true});await layer.waitFor();await layer.locator('[data-war-briefing-step-button="teams"]').click();await layer.getByRole('button',{name:/^Lancer :/}).click();await layer.waitFor({state:'hidden'});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('yautja.clan-war.v115.operations.fenced.v2')||'null')?.active?.mode==='rts');
 const started=await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja.clan-war.v115.operations.fenced.v2')));assert.equal(started.rav,119);assert.equal(started.active.teamIds.length,1);
 const rts=ops.getByRole('region',{name:'Mission jouable active',exact:true});await rts.waitFor();await rts.scrollIntoViewIfNeeded();await screenshot('05-next-rts-active.png');check('actual-Next-RTS-launched-from-briefing-with-one-source-team-and-single-RAV-debit',{missionId:started.active.id,rav:started.rav});
 const pause=ops.getByRole('button',{name:'Suspendre le temps réel',exact:true});if(await pause.isVisible())await pause.click();
 await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
 await war.getByRole('button',{name:/Quitter le conseil/}).click();await war.waitFor({state:'hidden'});await page.locator('[data-clan-interior]').waitFor({state:'visible'});
 const rawCampaignAfter=await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));assert.equal(rawCampaignAfter,rawCampaignBefore);await fs.writeFile(path.join(out,'campaign-after.json'),rawCampaignAfter);check('new-command-UI-and-independent-operation-preserve-raw-campaign-save',{sha256:sha(rawCampaignAfter),actualExitButtonReturnedToClanShip:true});
 await Promise.all(scripts);assert.ok(report.servedScripts.length>0);assert.ok(report.servedScripts.every(item=>item.matches));check('served-Next-javascript-bytes-match-the-declared-production-build',{responses:report.servedScripts.length,uniqueScripts:new Set(report.servedScripts.map(item=>item.pathname)).size});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.requestFailures,[]);check('no-uncaught-console-network-or-resource-errors');
 report.sourceAfter=await source();report.buildIdAfter=(await fs.readFile(path.join(root,'.next/BUILD_ID'),'utf8')).trim();assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.equal(report.buildIdAfter,report.buildIdBefore);check('target-source-and-actual-build-identities-stay-unchanged');report.passed=true;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await Promise.all(scripts);await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,screenshots:report.screenshots.length,out}));}
