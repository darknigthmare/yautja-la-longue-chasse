/** Current production menu in Chrome, plus its real FrontEnd storage boundary.
 * The component fixture records outgoing actions; it never impersonates gameplay. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url));
const releaseSource=await fs.readFile(path.join(root,'app/game/buildInfo.ts'),'utf8');
const releaseMatch=releaseSource.match(/^export const GAME_RELEASE_VERSION = "((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))";$/m);
assert.ok(releaseMatch,'The current application release must be declared as a numeric semantic version');
const releaseVersion=releaseMatch[1];
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const buildId=revision.slice(0,8);
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/campaign-menu-navigation.fixture.tsx'],outfile:'campaign-menu-fixture.js',bundle:true,write:false,external:['/game/*'],jsx:'automatic',platform:'browser',define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_YAUTJA_BUILD_ID':JSON.stringify(buildId)},logLevel:'silent'});
const javascript=bundle.outputFiles.find(file=>file.path.endsWith('.js'));
const css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));
assert(javascript&&css,'The actual menu, badge and CSS modules must compile together');
if(process.argv.includes('--check')){
 console.log(JSON.stringify({compiled:true,browserExecuted:false,revision,javascriptBytes:javascript.contents.length,cssBytes:css.contents.length}));
 process.exit(0);
}
const output=path.resolve(process.env.CAMPAIGN_MENU_QA_OUTPUT??'outputs/qa-current/campaign-menu');
await fs.mkdir(output,{recursive:true});
assert.equal((await fs.readdir(output)).length,0,'Use a fresh directory for the current browser results');
const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu courant · QA</title><link rel="stylesheet" href="/fixture.css"><style>*{box-sizing:border-box}html,body{margin:0}body{background:#100c09;color:#f4ead8}button,input,textarea{font:inherit}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const publicRoot=path.join(root,'public');
const server=createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(html);}
  else if(url.pathname==='/fixture.js'){response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});response.end(javascript.contents);}
  else if(url.pathname==='/fixture.css'){response.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});response.end(css.contents);}
  else{
   const filename=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
   if(!filename.startsWith(publicRoot+path.sep))throw Error('Invalid asset path');
   const bytes=await fs.readFile(filename),extension=path.extname(filename);
   response.writeHead(200,{'Content-Type':({'.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'})[extension]??'application/octet-stream'});response.end(bytes);
  }
 }catch{response.writeHead(404);response.end();}
});
const checks=[],errors=[],screenshots=[];
const check=(name,value)=>{assert(value,name);checks.push({name,status:'PASS'});};
const disk=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])));
const view=(page,name)=>page.locator(`[data-campaign-menu="${name}"]`).waitFor();
const focused=page=>page.evaluate(()=>({section:document.activeElement?.getAttribute('data-menu-section'),action:document.activeElement?.getAttribute('data-menu-action'),text:document.activeElement?.textContent}));
const badge=async page=>{const node=page.locator('[data-campaign-menu] [data-game-version]');assert.equal(await node.getAttribute('data-game-version'),releaseVersion);assert.equal(await node.getAttribute('data-game-build'),buildId);assert(await node.isVisible());};
const screenshot=async(page,name)=>{const file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});screenshots.push(name+'.png');};
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
async function pad(page,button){
 // A newly entered menu deliberately ignores held input until it has sampled
 // a neutral frame. Release before pressing so this is a new physical edge.
 await page.bringToFront();
 await page.waitForFunction(()=>document.hasFocus()&&!document.hidden);
 await page.evaluate(()=>{window.__campaignMenuQa.pad.axes.fill(0);for(const key of window.__campaignMenuQa.pad.buttons){key.pressed=false;key.value=0;key.touched=false;}});
 await frames(page);
 await page.evaluate(index=>{Object.assign(window.__campaignMenuQa.pad.buttons[index],{pressed:true,value:1,touched:true});},button);await frames(page);
 await page.evaluate(index=>{Object.assign(window.__campaignMenuQa.pad.buttons[index],{pressed:false,value:0,touched:false});},button);await frames(page);
}
let browser,page,failure=null;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const executablePath=process.env.AUDIT_CHROME_EXECUTABLE??process.env.CHROMIUM_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{channel:process.env.AUDIT_CHROME_CHANNEL??'chrome'})});
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);await page.bringToFront();await view(page,'main');await frames(page);
 check('Root exposes four sections and focuses Campaign',await page.locator('[data-menu-section]').count()===4&&(await focused(page)).section==='campaign');
 await badge(page);await page.locator('[data-campaign-scenery]').evaluate(image=>image.decode());
 await screenshot(page,'01-main-desktop');const untouched=await disk(page);
 await page.keyboard.press('Enter');await view(page,'campaign');
 check('Entering Campaign focuses Continue', (await focused(page)).action==='continue');await badge(page);await screenshot(page,'02-campaign-desktop');
 await page.locator('[data-menu-action="new"]').click();await view(page,'new');await page.getByLabel('Nom du chasseur').fill('Navigation seulement');
 await page.keyboard.press('Escape');await view(page,'campaign');
 check('Escape returns one level and restores New game focus',(await focused(page)).action==='new');
 await page.locator('[data-menu-action="load"]').click();await view(page,'load');
 await page.locator('[data-checkpoint-id="auto-1"]').click();await page.getByRole('dialog').waitFor();
 check('Load confirmation initially focuses Cancel',(await focused(page)).text==='Annuler');
 await page.keyboard.press('Shift+Tab');check('Modal focus stays trapped',(await focused(page)).text==='Confirmer le chargement');
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
 check('Cancelling a checkpoint restores its exact button',await page.locator('[data-checkpoint-id="auto-1"]').evaluate(node=>node===document.activeElement));
 await page.keyboard.press('Escape');await view(page,'campaign');check('Leaving load restores Load focus',(await focused(page)).action==='load');
 await page.locator('[data-menu-action="import"]').click();await view(page,'import');await page.keyboard.press('Escape');await view(page,'campaign');
 check('Leaving import restores Import focus',(await focused(page)).action==='import');
 await pad(page,1);await view(page,'main');check('Gamepad B restores Campaign on the root',(await focused(page)).section==='campaign');
 await page.locator('[data-menu-section="modes"]').click();await view(page,'modes');await badge(page);await screenshot(page,'03-modes-desktop');
 await page.locator('[data-menu-action="the-pit"]').click();await page.getByRole('alertdialog').waitFor();
 await screenshot(page,'04-spoiler-confirmation');await pad(page,1);await page.getByRole('alertdialog').waitFor({state:'detached'});
 check('Gamepad cancellation returns to the originating mode',(await focused(page)).action==='the-pit');
 await page.locator('[data-menu-action="game-reserve"]').click();await page.keyboard.press('Escape');
 check('Escape cancellation returns to Reserve',(await focused(page)).action==='game-reserve');
 await page.evaluate(()=>window.__campaignMenuQa.setBusy(true));
 await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='true');
 await page.keyboard.press('Escape');await pad(page,1);
 check('Busy transactions disable every menu command and block Back',await page.locator('[data-campaign-menu="modes"]').count()===1&&await page.locator('[data-campaign-menu] button:not(:disabled)').count()===0);
 await page.evaluate(()=>window.__campaignMenuQa.setBusy(false));await page.locator('[data-menu-action="the-pit"]').waitFor();
 check('Navigation and cancellation invoked no outgoing action',(await page.evaluate(()=>window.__campaignMenuQa.calls)).length===0);
 assert.deepEqual(await disk(page),untouched);checks.push({name:'Navigation, typed name, modal cancellation and busy Back write no localStorage',status:'PASS'});
 await page.locator('[data-menu-action="the-pit"]').click();await page.locator('[data-spoiler-confirm]').click();
 check('Explicit mode confirmation dispatches once',JSON.stringify(await page.evaluate(()=>window.__campaignMenuQa.calls))===JSON.stringify([{action:'mode',args:['the-pit',true]}]));
 await page.keyboard.press('Escape');await view(page,'main');await page.locator('[data-menu-section="archives"]').click();await view(page,'archives');
 await page.locator('[data-menu-action="sprites"]').click();await page.locator('[data-menu-action="mausoleum"]').click();
 check('Both archive actions retain their callbacks',JSON.stringify((await page.evaluate(()=>window.__campaignMenuQa.calls)).slice(1).map(call=>call.action))===JSON.stringify(['sprites','mausoleum']));
 await page.keyboard.press('Escape');await view(page,'main');await page.locator('[data-menu-section="system"]').click();await view(page,'system');
 check('System retains account and archive refresh',await page.locator('[data-menu-action="account"]').isVisible()&&await page.locator('[data-menu-action="refresh"]').isVisible());
 check('Fullscreen is offered exactly when supported',await page.locator('[data-menu-action="fullscreen"]').count()===Number(await page.evaluate(()=>Boolean(document.fullscreenEnabled&&document.documentElement.requestFullscreen))));
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await badge(page);
  check(`System and badge fit ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('[data-menu-action], [data-game-version]')].every(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})));
  await screenshot(page,`05-system-${width}px`);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Escape');await view(page,'main');
 check('Reduced motion disables the section animation',await page.locator('[data-menu-level]').evaluate(node=>getComputedStyle(node.parentElement).animationName==='none'));
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/?frontend');await view(page,'main');
 await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='false');
 const initial=await disk(page);await page.locator('[data-menu-section="campaign"]').click();await view(page,'campaign');
 await page.locator('[data-menu-action="new"]').click();await view(page,'new');await page.keyboard.press('Escape');await view(page,'campaign');await page.keyboard.press('Escape');await view(page,'main');
 await page.locator('[data-menu-section="modes"]').click();await page.locator('[data-menu-action="clan-war"]').click();await page.keyboard.press('Escape');await page.keyboard.press('Escape');await view(page,'main');
 assert.deepEqual(await disk(page),initial);checks.push({name:'Production FrontEnd navigation and spoiler cancellation create no campaign or storage key',status:'PASS'});
 await page.locator('[data-menu-section="campaign"]').click();await page.locator('[data-menu-action="new"]').click();await page.getByLabel('Nom du chasseur').fill('Création unique QA');
 await page.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
 await page.locator('[data-qa-campaign-session="1"]').waitFor();const firstOwner=await page.locator('[data-qa-campaign-session]').getAttribute('data-owner');
 const saved=await disk(page);
 check('Double native submit creates one campaign owner',Object.entries(saved).filter(([key,value])=>/^yautja-long-hunt\.campaign-slot\.[1-5]$/.test(key)&&value.includes(firstOwner)).length===1);
 await page.getByRole('button',{name:'Retour au menu principal',exact:true}).click();await view(page,'campaign');await badge(page);
 check('Session exit returns to Campaign and its originating New action',(await focused(page)).action==='new');
 await screenshot(page,'06-frontend-after-create');
 check('Browser emitted no uncaught errors',errors.length===0);
 console.log(JSON.stringify({revision,buildId,checks,screenshots,errors},null,2));
}catch(error){
 const state=await page?.evaluate(()=>({view:document.querySelector('[data-campaign-menu]')?.getAttribute('data-campaign-menu'),focused:document.hasFocus(),hidden:document.hidden,activeElement:document.activeElement?.outerHTML,dialogs:[...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(node=>node.textContent)})).catch(()=>null);
 failure={message:error instanceof Error?error.message:String(error),state};
 if(page)await screenshot(page,'failure').catch(()=>{});
 throw error;
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({scope:'Production CampaignMainMenu and FrontEnd; gameplay session and outgoing action callbacks are declared fixtures. Gamepad input is emulated, not hardware.',revision,buildId,checks,screenshots,errors,failure},null,2)+'\n');
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
