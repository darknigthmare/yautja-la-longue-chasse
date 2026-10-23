/** Public menu/order/atlas journey. Only the declared initial exercise fixture
 * is injected; every reconnaissance, review, reservation and turn uses the UI. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3000';
const buildId=process.env.YAUTJA_QA_BUILD_ID??null;
const runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
const mode=process.env.YAUTJA_ASSAULT_V106_QA_MODE??'development';
const output=path.resolve(process.env.YAUTJA_ASSAULT_V106_QA_OUTPUT??'outputs/qa-v106/clan-assault-dev');
assert.ok(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname));
if(mode==='compiled-app')assert.ok(buildId&&runtimeCommit,'Production evidence requires a frozen build and runtime commit');
await fs.mkdir(output,{recursive:true});
const sourceFiles=['app/game/ClanWarPanelV85.tsx','app/game/ClanWarAtlasV95.tsx','app/game/ClanWarAtlasV95.module.css','app/game/ClanWarAssaultV106.tsx','app/game/ClanWarAssaultV106.module.css','app/game/systems/clanWarV85.ts','app/game/systems/clanWarAssaultV106.ts','app/game/systems/clanWarBattleModelV106.ts','app/game/systems/clanWarAtlasV95.ts','app/game/systems/clanWarCommandV98.ts','scripts/qa-clan-assault-v106.mjs'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const snapshot=()=>Promise.all(sourceFiles.map(async file=>({file,sha256:hash(await fs.readFile(file))})));
const sourceBefore=await snapshot();
const contentVersion=(await fs.readFile('app/game/buildInfo.ts','utf8')).match(/GAME_CONTENT_VERSION\s*=\s*["']([^"']+)/)?.[1];
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'assault-browser-v106-'));
const compiled=await build({stdin:{contents:`export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarAssaultV106';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const coreFile=path.join(directory,'core.mjs');await fs.writeFile(coreFile,compiled.outputFiles[0].text);
const api=await import(pathToFileURL(coreFile));
const initial=api.createWarSimulationV85(10637);
for(const person of initial.combatants)if(person.factionId!=='CON-F01')person.garrison=true;
const fixture={description:'Native Korthas exercise seed 10637 and its existing stocks/roster; foreign people keep their existing garrison positions to isolate the reviewed local assault. No new people, reports, resources or territories.',initial};
const key='yautja.clan-war.v85.free.v1',checks=[],captures=[],errors=[],servedBuilds=[],contexts=[];
const disk=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),key);
const raw=page=>page.evaluate(key=>localStorage.getItem(key),key);
const command=page=>page.getByTestId('war-order-panel-v98');
const assault=page=>page.getByTestId('war-assault-v106');
const atlas=page=>page.getByTestId('clan-war-atlas-v95');
const marker=(page,id)=>atlas(page).locator(`[data-intel-territory="${id}"]`);
const check=(name,condition,detail)=>{checks.push({name,status:condition?'PASS':'FAIL',...(detail?{detail}:{} )});console.log(`${condition?'PASS':'FAIL'}: ${name}`);assert.ok(condition,name);};
async function waitDisk(page,property,value){await page.waitForFunction(({key,property,value})=>JSON.parse(localStorage.getItem(key)??'null')?.[property]===value,{key,property,value});}
async function menu(page){
 const response=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});
 assert.ok(response?.ok(),'Real application menu response succeeds');
 const html=await response.text();
 servedBuilds.push({url:response.url(),status:response.status(),expectedBuildId:buildId,foundInHtml:buildId?html.includes(buildId):null});
 if(buildId)check('Served application HTML carries the frozen build ID',html.includes(buildId));
 await page.locator('[data-campaign-menu="main"]').waitFor();
 assert.equal(await page.locator('[data-campaign-menu="main"]').getAttribute('data-game-content-version'),contentVersion);
}
async function enter(page){await page.getByRole('button',{name:/^Guerres des clans/}).click();await page.getByRole('button',{name:'Accéder malgré les spoilers',exact:true}).click();await atlas(page).waitFor();}
async function reload(page){await menu(page);await enter(page);}
async function newPage(browser,width=1440){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1050},reducedMotion:'reduce'});contexts.push(context);
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>errors.push({type:'pageerror',message:error.message,url:page.url()}));
 page.on('console',message=>{if(message.type()==='error')errors.push({type:'console.error',message:message.text(),url:page.url()});});
 await menu(page);
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:initial});
 await enter(page);return page;
}
async function map(page){await atlas(page).getByRole('button',{name:'▱ Planisphère',exact:true}).click();await atlas(page).getByLabel('Renseignement daté',{exact:true}).check();}
async function selectAttack(page){
 await command(page).getByRole('combobox',{name:/^Ordre/}).selectOption('attack');
 await command(page).getByRole('combobox',{name:/^Route voisine/}).selectOption('CON-T08');
 await command(page).getByRole('button',{name:'Sélectionner les mobiles',exact:true}).click();
}
async function capture(page,file,locator){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await locator.screenshot({path:path.join(output,file)});captures.push(file);
}
async function resolve(page){
 const before=await disk(page),expected=api.advanceWarTurnV85(before);assert.ok(expected.accepted,expected.message);
 await page.getByRole('button',{name:'Fin de préparation · relire avant résolution',exact:true}).click();
 await page.getByRole('button',{name:'Confirmer et résoudre le tour',exact:true}).click();
 await waitDisk(page,'turn',before.turn+1);
 check(`Turn ${before.turn} uses the ordinary resolver for every stock and identified person`,JSON.stringify((await disk(page)).stocks)===JSON.stringify(expected.state.stocks)&&JSON.stringify((await disk(page)).combatants)===JSON.stringify(expected.state.combatants));
 return disk(page);
}
let browser,failure=null;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const page=await newPage(browser);await map(page);await selectAttack(page);
 check('Unobserved foreign territory remains unknown on the actual coloured atlas',await marker(page,'CON-T08').getAttribute('data-kind')==='unknown'&&(await marker(page,'CON-T08').textContent()).trim()==='?'&&await atlas(page).locator('svg g[data-territory-id="CON-T08"] path').first().getAttribute('fill')==='#f1816b');
 check('Unknown strength has no conditional estimate and exposes the whole own column risk',await assault(page).getByTestId('war-assault-losses-v106').count()===0&&/jusqu’à 8 de vos personnes/.test(await assault(page).innerText()));
 const untouched=await raw(page);
 await assault(page).getByRole('button',{name:'Étudier l’assaut',exact:true}).click();
 check('Initial review freezes eight real people without queuing or writing any state',await assault(page).getAttribute('data-prepared')==='true'&&await raw(page)===untouched);
 check('Review opens with keyboard focus on its stable section',await assault(page).evaluate(element=>element===document.activeElement));
 await assault(page).getByRole('button',{name:'Annuler la préparation',exact:true}).click();
 check('Cancelling the review preserves the exact archive bytes, stocks and roster',await raw(page)===untouched&&await assault(page).getAttribute('data-prepared')==='false');
 check('Cancellation retains keyboard focus before removing the confirmation controls',await assault(page).evaluate(element=>element===document.activeElement));
 await assault(page).getByRole('button',{name:'Préparer une reconnaissance',exact:true}).click();
 await command(page).getByRole('checkbox',{name:/^P08 ·/}).check();
 await command(page).getByRole('button',{name:'Réserver l’ordre',exact:true}).click();await waitDisk(page,'revision',initial.revision+1);
 check('Reconnaissance is a real order by P08 with no immediate report or capture',(await disk(page)).orders[0]?.kind==='recon'&&(await disk(page)).observations.length===0&&(await disk(page)).territories['CON-T08'].controller==='CON-F02');
 const reported=await resolve(page);const report=reported.observations.find(item=>item.territoryId==='CON-T08');
 check('Played reconnaissance records the source person, observation turn and finite interval',report?.turn===1&&report.sourceId==='P08'&&report.lower===3&&report.upper===5,report);
 await selectAttack(page);
 check('Map and conditional model use the played dated interval, never a live enemy count',(await marker(page,'CON-T08').textContent()).trim()==='3–5 · T1'&&/Si 3–5 adversaires.*1–1 personne/s.test(await assault(page).getByTestId('war-assault-losses-v106').innerText())&&/jusqu’à 8 de vos personnes/.test(await assault(page).innerText()));
 await assault(page).getByRole('button',{name:'Étudier l’assaut',exact:true}).click();
 await capture(page,'desktop-dated-assault-review.png',command(page));
 await capture(page,'desktop-intelligence-atlas.png',atlas(page));
 const beforeDraftChange=await raw(page);
 await command(page).getByRole('checkbox',{name:/^P14 ·/}).uncheck();
 check('Changing the selected column invalidates the frozen review without a write',await assault(page).getAttribute('data-stale')==='true'&&await assault(page).getByRole('button',{name:'Confirmer l’assaut',exact:true}).isDisabled()&&await raw(page)===beforeDraftChange);
 await capture(page,'desktop-stale-review.png',assault(page));
 await assault(page).getByRole('button',{name:'Actualiser l’aperçu',exact:true}).click();
 check('An explicit refreshed review uses the changed seven-person column',await assault(page).getAttribute('data-stale')==='false'&&/7 personnes affectées/.test(await assault(page).innerText()));
 const revisionBefore=(await disk(page)).revision;
 const garrison=command(page).getByTestId('war-garrison-v99');await garrison.locator('summary').click();
 await garrison.getByRole('button',{name:'Affecter P15 à la garde',exact:true}).click();await waitDisk(page,'revision',revisionBefore+1);
 check('A real intervening garrison command also invalidates the review before confirmation',await assault(page).getAttribute('data-stale')==='true'&&await assault(page).getByRole('button',{name:'Confirmer l’assaut',exact:true}).isDisabled()&&(await disk(page)).orders.length===0);
 const beforeReload=await raw(page);await reload(page);
 check('Reload preserves the garrison/front but discards all ephemeral review data',await raw(page)===beforeReload&&!/assaultV106|currentLossExposure|preparedFronts/.test(beforeReload));
 await selectAttack(page);
 check('Reload requires another explicit review before any assault can be confirmed',await assault(page).getAttribute('data-prepared')==='false'&&await assault(page).getByRole('button',{name:'Confirmer l’assaut',exact:true}).count()===0);
 const beforeReservation=await disk(page);await assault(page).getByRole('button',{name:'Étudier l’assaut',exact:true}).click();
 await assault(page).getByRole('button',{name:'Confirmer l’assaut',exact:true}).click();await waitDisk(page,'revision',beforeReservation.revision+1);
 const reserved=await disk(page),order=reserved.orders[0];
 const ordinary=api.queueWarOrderV85(beforeReservation,{kind:'attack',fromId:'CON-T02',targetId:'CON-T08',combatantIds:order.combatantIds,cargo:{s:0,m:0,i:0}});
 check('Only confirmation reserves a real native attack with the exact ordinary archive bytes',order.kind==='attack'&&order.combatantIds.length===8&&ordinary.accepted&&JSON.stringify(reserved)===JSON.stringify(ordinary.state)&&reserved.version===1);
 check('Reservation alone neither debits stock nor grants a conquest',JSON.stringify(reserved.stocks)===JSON.stringify(beforeReservation.stocks)&&reserved.territories['CON-T08'].controller==='CON-F02');
 await reload(page);check('Reload preserves the actual pending order, unlike the review',JSON.stringify(await disk(page))===JSON.stringify(reserved));
 const conquered=await resolve(page);await map(page);
 check('Actual resolution changes the territory colour and retains a living occupation guard',conquered.territories['CON-T08'].controller==='CON-F01'&&conquered.combatants.some(person=>person.territoryId==='CON-T08'&&person.factionId==='CON-F01'&&person.status==='fit'&&person.garrison)&&await atlas(page).locator('svg g[data-territory-id="CON-T08"] path').first().getAttribute('fill')==='#63dcc5');
 await atlas(page).getByRole('button',{name:'1 · Départ / inspection',exact:true}).click();
 await atlas(page).locator('svg g[data-territory-id="CON-T08"]').press('Enter');
 const supply=atlas(page).getByTestId('war-supply-path-v106');
 check('Captured territory inspector exposes the actual headquarters-to-site path without cargo rights',await supply.getByRole('button').count()===api.warSupplyPathV106(conquered,'CON-T08').length&&/dépôt|cargaison|stock/.test(await supply.innerText()));
 await capture(page,'desktop-conquest-supply-route.png',atlas(page));
 const conqueredRaw=await raw(page);await reload(page);
 check('Native conquest, costs and surviving identities survive an ordinary reload',await raw(page)===conqueredRaw);
 const mobile=await newPage(browser,390);await selectAttack(mobile);
 await assault(mobile).getByRole('button',{name:'Étudier l’assaut',exact:true}).click();
 check('Mobile review fits the page and every review action has a 44px target',await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await assault(mobile).getByRole('button').evaluateAll(buttons=>buttons.every(button=>{const rect=button.getBoundingClientRect();return rect.height>=44&&rect.width>=44;})));
 await capture(mobile,'mobile-assault-review.png',assault(mobile));
 await assault(mobile).getByRole('button',{name:'Annuler la préparation',exact:true}).click();await map(mobile);
 check('Mobile dated-intelligence atlas keeps accessible regions and no horizontal overflow',await atlas(mobile).locator('svg').getByRole('button').count()===36&&await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await capture(mobile,'mobile-intelligence-atlas.png',atlas(mobile));
 check('No browser runtime or console errors',errors.length===0,errors);
 check('Runtime and recipe sources remain unchanged throughout the complete journey',JSON.stringify(await snapshot())===JSON.stringify(sourceBefore));
}catch(error){failure=error;checks.push({name:'Complete real browser journey',status:'FAIL',detail:String(error)});for(const context of contexts){const page=context.pages()[0];if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});}}
finally{
 const sourceAfter=await snapshot(),evidence=[];
 for(const file of captures){const bytes=await fs.readFile(path.join(output,file));evidence.push({file,sha256:hash(bytes),bytes:bytes.length});}
 const result={version:106,status:failure?'FAIL':'PASS',mode,contentVersion,buildId,runtimeCommit,baseUrl,scope:'Real free-front reconnaissance, conditional review, stale/cancel guards, native assault reservation/resolution, dated coloured atlas and actual supply route. Declared existing-garrison fixture; no full RTS/physical structures/campaign admission.',servedBuilds,sourceBefore,sourceAfter,sourceUnchanged:JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter),checks,captures,evidence,fixture,errors,failure:failure?{message:failure.message,stack:failure.stack}:null,at:new Date().toISOString()};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(result,null,2)+'\n');
 for(const context of contexts)await context.close();await browser?.close();await fs.rm(directory,{recursive:true,force:true});
}
if(failure)throw failure;
console.log(`V106 assault: ${checks.length} checks passed; ${output}`);
