import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {build} from 'esbuild';

// All provider requests are intercepted. This proves the browser integration,
// not live email delivery, Supabase auth, RLS or the production deployment.
const url=process.env.V71_CLOUD_QA_URL??'http://127.0.0.1:4191';
const output=process.env.V71_CLOUD_QA_OUTPUT??'work-local/v71/qa/cloud-local';
const reportPath=process.env.V71_CLOUD_QA_REPORT??path.join(output,'report.json');
const config=JSON.parse(await fs.readFile('app/game/data/cloudAccountConfigV71.json','utf8'));
const compiled=await build({stdin:{contents:'export * from "./app/game/systems/cloudArchiveV71";',loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const model=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(path.dirname(reportPath),{recursive:true});
const A='c4fcb61c-644f-448a-8d89-b47bd9d90e9c',B='0d235e68-f03d-478d-9c25-cf0e1f4bbb04',C='03e0d7a3-491f-4ba3-9fe0-6ed23f50b2c4';
const emails=new Map([['yautja-mobile-qa@example.invalid',A],['yautja-other-qa@example.invalid',B],['yautja-empty-first-qa@example.invalid',C]]);
const users=new Map([...emails].map(([email,id])=>[id,{id,email}]));
const rows=new Map(),tokens=new Map(),audit=[],captures=[],checks=[],pageErrors=[];
let tokenSerial=0,cloudOutage=false;
const browser=await chromium.launch({channel:'chrome',headless:true});
let mobileContext,desktopContext,mobile,desktop,preflightContext,preflight;
function sessionFor(id){const n=++tokenSerial,access='qa-intercepted-access-'+n,refresh='qa-intercepted-refresh-'+n;tokens.set(access,id);tokens.set(refresh,id);return {access_token:access,refresh_token:refresh,expires_at:Math.floor(Date.now()/1000)+3600,user:users.get(id)};}
function cloned(value){return structuredClone(value);}
function actor(id){return id===A?'account-A':id===B?'account-B':id===C?'account-C':'anonymous';}
async function intercept(context){
 await context.route(config.url+'/**',async route=>{
  const request=route.request(),u=new URL(request.url()),method=request.method(),pathname=u.pathname;
  const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'*','content-type':'application/json'};
  const respond=async(status,value)=>{audit.push({method,path:pathname,status,actor:actor(tokens.get((request.headers().authorization??'').replace(/^Bearer /,''))),expectedRevision:u.searchParams.get('revision')??null});await route.fulfill({status,headers,body:status===204?'':JSON.stringify(value)});};
  if(method==='OPTIONS'){await respond(204,null);return;}
  if(cloudOutage){audit.push({method,path:pathname,status:'simulated-offline'});await route.abort('internetdisconnected');return;}
  let body=null;try{body=request.postData()?JSON.parse(request.postData()):null;}catch{await respond(400,{message:'invalid QA JSON'});return;}
  if(pathname==='/auth/v1/token'&&method==='POST'){
   const id=u.searchParams.get('grant_type')==='refresh_token'?tokens.get(body?.refresh_token):emails.get(body?.email);
   if(!id||u.searchParams.get('grant_type')!=='refresh_token'&&body.password!=='FakeQA-password-only'){await respond(401,{message:'QA credentials refused'});return;}
   await respond(200,sessionFor(id));return;
  }
  const id=tokens.get((request.headers().authorization??'').replace(/^Bearer /,''));
  if(pathname==='/auth/v1/user'&&method==='GET'){await respond(id?200:401,id?users.get(id):{message:'QA invalid session'});return;}
  if(pathname==='/auth/v1/logout'&&method==='POST'){await respond(id?204:401,null);return;}
  if(pathname==='/rest/v1/'+config.table){
   if(!id){await respond(401,{message:'QA no bearer'});return;}
   const filter=u.searchParams.get('user_id');
   if(filter!==null&&filter!=='eq.'+id||body&&body.user_id!==id){await respond(403,{message:'QA ownership denied'});return;}
   if(method==='GET'){await respond(200,rows.has(id)?[cloned(rows.get(id))]:[]);return;}
   if(method==='POST'||method==='PATCH'){
    const parsed=model.parseCloudArchiveV71(JSON.stringify(body?.snapshot));
    if(!parsed.archive){await respond(400,{message:'QA incompatible game archive'});return;}
    const expected=method==='PATCH'?Number((u.searchParams.get('revision')??'').replace(/^eq\./,'')):null,current=rows.get(id);
    if(method==='POST'&&current){await respond(409,{message:'QA insert duplicate'});return;}
    if(method==='PATCH'&&(!current||current.revision!==expected)){await respond(200,[]);return;}
    if(body.revision!==(expected??0)+1){await respond(400,{message:'QA nonsequential revision'});return;}
    const row={user_id:id,revision:body.revision,snapshot:parsed.archive,updated_at:new Date().toISOString()};rows.set(id,row);
    await respond(200,[cloned(row)]);return;
   }
  }
  audit.push({method,path:pathname,status:'unexpected-provider-request'});await route.abort('blockedbyclient');
 });
}
function observe(page,label){page.on('pageerror',error=>pageErrors.push({page:label,message:error.message}));page.setDefaultTimeout(35000);}
async function screenshot(page,name){const filename=name+'.png';await page.screenshot({path:path.join(output,filename),fullPage:true});captures.push(filename);}
async function waitMenu(page){await page.locator('[data-campaign-menu]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='false');}
async function capture(page){
 const entries=(await page.evaluate(()=>Object.entries(localStorage))).filter(([key])=>model.isCloudArchiveStorageKeyV71(key)).map(([key,raw])=>({key,raw}));
 const archive={format:'yautja-account-archive',version:1,contentVersion:'V71 browser QA',capturedAt:new Date().toISOString(),entries};
 const parsed=model.parseCloudArchiveV71(JSON.stringify(archive));assert(parsed.archive,parsed.error);return parsed.archive;
}
async function pauseToMenu(page){await page.bringToFront();await page.getByRole('button',{name:'Pause et commandes',exact:true}).click();await page.getByRole('button',{name:'Enregistrer et revenir au menu',exact:true}).click();await waitMenu(page);}
async function createParty(page,index,name,screen='mobile'){
 await page.bringToFront();
 await page.getByRole('button',{name:/^Nouvelle partie/}).click();
 await page.locator(`[data-campaign-slot="${index}"]`).click();
 await page.getByLabel('Nom du chasseur',{exact:true}).fill(name);
 await page.getByRole('button',{name:new RegExp('^Créer la partie '+index+' et commencer')}).click();
 await page.locator('canvas[data-nursery-phase="prompt"][data-nursery-assets="true"]').waitFor({timeout:90000});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')).profile.hunterName),name);
 await screenshot(page,'created-party-'+index+'-'+screen+'-nursery');await pauseToMenu(page);
}
async function openAccount(page){await page.bringToFront();await page.getByRole('button',{name:/^Compte & sauvegardes/}).click();await page.locator('[data-cloud-account-v71]').waitFor();}
async function signIn(page,email){const panel=page.locator('[data-cloud-account-v71]');await panel.getByLabel('Adresse courriel').fill(email);await panel.getByLabel('Mot de passe',{exact:true}).fill('FakeQA-password-only');await panel.getByRole('button',{name:'Se connecter',exact:true}).click();await page.waitForFunction(expected=>{try{return JSON.parse(localStorage.getItem('yautja-long-hunt.cloud.session-v71'))?.user?.email===expected;}catch{return false;}},email);}
async function closeAccount(page){await page.getByRole('button',{name:'Fermer le compte',exact:true}).click();await page.locator('[data-cloud-account-v71]').waitFor({state:'hidden'});}
async function waitCloud(predicate,label){for(let i=0;i<300;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}assert.fail(label);}
function sameArchive(a,b){assert.equal(model.cloudArchiveIdentityV71(a),model.cloudArchiveIdentityV71(b));}
function mark(name,details={}){checks.push({name,status:'PASS',...details});console.log(JSON.stringify({check:checks.length,name,status:'PASS'}));}
async function diagnostic(page){return page?.evaluate(()=>({url:location.href,hidden:document.hidden,focused:document.hasFocus(),nursery:[...document.querySelectorAll('canvas[data-nursery-phase]')].map(node=>({...node.dataset})),campaignMenu:document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')??null,accountOpen:Boolean(document.querySelector('[data-cloud-account-v71]')),activeTag:document.activeElement?.tagName??null})).catch(error=>({diagnosticError:error.message}));}

try{
 // Separate clean preflight: sign in before any game exists, then let the
 // actual periodic sync upload a real UI-created game without a manual push.
 preflightContext=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 await intercept(preflightContext);preflight=await preflightContext.newPage();observe(preflight,'first-account');
 await preflight.goto(url,{waitUntil:'networkidle',timeout:120000});await waitMenu(preflight);assert.equal((await capture(preflight)).entries.length,0);
 await openAccount(preflight);await signIn(preflight,'yautja-empty-first-qa@example.invalid');
 await preflight.waitForFunction(id=>localStorage.getItem('yautja-long-hunt.cloud.workspace-owner-v71')===id,C);
 assert.equal(rows.has(C),false,'Connecting an empty account must not fabricate a cloud save');await screenshot(preflight,'empty-account-before-first-campaign');
 await closeAccount(preflight);await createParty(preflight,1,'Première après connexion QA','desktop-first-account');const firstAfterLogin=await capture(preflight);
 await waitCloud(()=>rows.get(C)&&model.cloudArchiveIdentityV71(rows.get(C).snapshot)===model.cloudArchiveIdentityV71(firstAfterLogin),'The real first party did not auto-sync after prior account login');
 sameArchive(firstAfterLogin,rows.get(C).snapshot);await screenshot(preflight,'first-campaign-after-prior-login-autosynced-menu');
 mark('empty-account-login-before-first-campaign-binds-and-autosyncs-real-UI-game-without-manual-refresh',{initialCloudRowCreated:false,manualRefresh:false,actualCampaignCreation:true,revision:rows.get(C).revision,rawByteEquality:true});
 await preflightContext.close();preflightContext=null;preflight=null;
 mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
 desktopContext=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 await intercept(mobileContext);await intercept(desktopContext);mobile=await mobileContext.newPage();desktop=await desktopContext.newPage();observe(mobile,'mobile');observe(desktop,'desktop');
 await mobile.goto(url,{waitUntil:'networkidle',timeout:120000});await waitMenu(mobile);
 await createParty(mobile,1,'Chasseur mobile QA V71');const firstLocal=await capture(mobile);
 mark('mobile-created-real-new-party-in-UI',{fixtureProgression:false,nurseryPrompt:true});
 await openAccount(mobile);await signIn(mobile,'yautja-mobile-qa@example.invalid');
 await mobile.getByRole('button',{name:'Confirmer : garder les parties de cet appareil sur le compte',exact:true}).click();
 await waitCloud(()=>rows.get(A)?.revision===1,'Mobile first upload did not confirm');sameArchive(firstLocal,rows.get(A).snapshot);
 await mobile.waitForFunction(()=>localStorage.getItem('yautja-long-hunt.cloud.outbox-v71.c4fcb61c-644f-448a-8d89-b47bd9d90e9c')===null);
 await screenshot(mobile,'mobile-first-account-upload');mark('mobile-explicit-association-uploads-complete-exact-confirmed-archive',{revision:1});
 const mobileDialog=await mobile.locator('[data-cloud-account-v71]').evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
 assert(mobileDialog.x>=0&&mobileDialog.y>=0&&mobileDialog.x+mobileDialog.width<=mobileDialog.viewportWidth+1&&mobileDialog.y+mobileDialog.height<=mobileDialog.viewportHeight+1,'Account dialog must fit the mobile viewport');assert.equal(mobileDialog.overflow,false);
 assert(await mobile.locator('[data-campaign-menu]').evaluate(node=>Boolean(node.closest('[inert]'))));
 await mobile.getByRole('button',{name:'Fermer le compte',exact:true}).focus();await mobile.keyboard.press('Shift+Tab');
 assert(await mobile.evaluate(()=>Boolean(document.activeElement?.closest('[data-cloud-account-v71]'))));mark('mobile-account-dialog-fits-viewport-and-traps-focus-with-inert-background',mobileDialog);
 await desktop.goto(url,{waitUntil:'networkidle',timeout:120000});await waitMenu(desktop);await openAccount(desktop);
 await signIn(desktop,'yautja-mobile-qa@example.invalid');await desktop.locator('[data-cloud-account-v71]').waitFor({state:'hidden',timeout:45000});await waitMenu(desktop);
 sameArchive(await capture(desktop),rows.get(A).snapshot);await screenshot(desktop,'desktop-autoimport-main-menu');
 assert.equal(await desktop.getByRole('button',{name:/^Continuer/}).isEnabled(),true);
 await desktop.getByRole('button',{name:/^Continuer/}).click();await desktop.locator('canvas[data-nursery-phase="prompt"][data-nursery-assets="true"]').waitFor({timeout:90000});await screenshot(desktop,'desktop-continues-mobile-nursery');await pauseToMenu(desktop);
 mark('empty-desktop-login-auto-restores-mobile-exact-bytes-reloads-and-continues',{sameAccount:true,actualGameResume:'nursery-prompt',rawByteEqualityBeforeContinue:true});
 await mobile.bringToFront();await closeAccount(mobile);await mobile.getByRole('button',{name:/^Continuer/}).click();await mobile.locator('canvas[data-nursery-phase="prompt"][data-nursery-assets="true"]').waitFor();await mobile.waitForLoadState('networkidle');
 cloudOutage=true;await mobileContext.setOffline(true);
 await mobile.locator('[data-nursery-prologue] canvas').focus();await mobile.keyboard.press('z',{delay:100});await mobile.locator('canvas[data-nursery-phase="ready"]').waitFor({timeout:30000});
 await screenshot(mobile,'mobile-offline-loaded-nursery-ready');await pauseToMenu(mobile);const offlineLocal=await capture(mobile);
 const offlineSave=JSON.parse(offlineLocal.entries.find(e=>e.key==='yautja-long-hunt.save').raw);assert.equal(offlineSave.prologue.checkpoint.phase,'ready');assert.equal(rows.get(A).revision,1);
 assert.notEqual(model.cloudArchiveIdentityV71(offlineLocal),model.cloudArchiveIdentityV71(firstLocal));
 await screenshot(mobile,'mobile-offline-ready-checkpoint-durable-menu');mark('offline-loaded-scene-advances-and-ready-checkpoint-is-durable-cloud-unchanged',{actualBrowserOffline:true,cloudRevision:1,progression:'prompt → arrival → ready; paused and saved through UI',assetScope:'Scene fully loaded online before disconnect. Offline first load of assets is not claimed.'});
 cloudOutage=false;await mobileContext.setOffline(false);await openAccount(mobile);await mobile.getByRole('button',{name:'Actualiser la synchronisation',exact:true}).click();
 await waitCloud(()=>rows.get(A)?.revision>=2,'Reconnect did not upload mobile progress');sameArchive(offlineLocal,rows.get(A).snapshot);await screenshot(mobile,'mobile-reconnected-offline-checkpoint-upload');
 const reconnectRevision=rows.get(A).revision;await closeAccount(mobile);await createParty(mobile,2,'Deuxième partie en ligne QA');const twoParties=await capture(mobile);await openAccount(mobile);await mobile.getByRole('button',{name:'Actualiser la synchronisation',exact:true}).click();
 await waitCloud(()=>rows.get(A)?.revision>reconnectRevision,'Second online campaign did not synchronize');sameArchive(twoParties,rows.get(A).snapshot);await screenshot(mobile,'mobile-online-second-party-complete-archive-upload');
 mark('reconnection-uploads-offline-progress-and-online-second-campaign-with-revision-CAS',{offlineCheckpointRevision:reconnectRevision,twoCampaignRevision:rows.get(A).revision});
 // Explicit fault fixture: stale queue is seeded, no game progression is invented.
 const desktopBefore=await capture(desktop),digest=await desktop.evaluate(async text=>{const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');},model.cloudArchiveIdentityV71(firstLocal));
 const queue={format:'yautja-cloud-outbox',version:1,accountId:A,operationId:'f5b6377b-81e4-44a0-93b1-8dcb7c0e601f',queuedAt:new Date().toISOString(),expectedRevision:1,baseDigest:digest,snapshot:desktopBefore};
 await desktop.evaluate(({key,value})=>localStorage.setItem(key,value),{key:'yautja-long-hunt.cloud.outbox-v71.'+A,value:JSON.stringify(queue)});
 const advanced=cloned(rows.get(A));advanced.revision+=1;advanced.updated_at=new Date().toISOString();rows.set(A,advanced);
 await openAccount(desktop);await desktop.getByRole('button',{name:'Actualiser la synchronisation',exact:true}).click();
 await desktop.getByText(new RegExp('Révision '+advanced.revision+' ·')).waitFor();
 await desktop.getByRole('button',{name:'Confirmer : reprendre les parties du compte sur cet appareil',exact:true}).waitFor();
 sameArchive(await capture(desktop),desktopBefore);assert(await desktop.evaluate(key=>localStorage.getItem(key)!==null,'yautja-long-hunt.cloud.outbox-v71.'+A));
 await screenshot(desktop,'desktop-stale-outbox-fresh-cloud-choice');mark('stale-outbox-conflict-refreshes-current-cloud-preview-without-overwrite',{seededFaultFixture:true,cloudRevision:advanced.revision});
 await desktop.getByRole('button',{name:'Confirmer : reprendre les parties du compte sur cet appareil',exact:true}).click();await desktop.locator('[data-cloud-account-v71]').waitFor({state:'hidden',timeout:45000});await waitMenu(desktop);
 sameArchive(await capture(desktop),advanced.snapshot);
 const rescues=await desktop.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith('yautja-long-hunt.cloud.local-rescue-v71.')).map(([key,raw])=>({key,value:JSON.parse(raw)})));
 assert(rescues.some(r=>model.cloudArchiveIdentityV71(r.value.snapshot)===model.cloudArchiveIdentityV71(desktopBefore)),'Previous desktop branch was not retained');
 assert.equal(await desktop.evaluate(key=>localStorage.getItem(key),'yautja-long-hunt.cloud.outbox-v71.'+A),null);
 await screenshot(desktop,'desktop-confirmed-cloud-restore-two-parties');mark('explicit-cloud-choice-restores-all-copies-keeps-local-rescue-clears-old-queue-and-reloads',{rescueCount:rescues.length});
 await openAccount(desktop);await desktop.getByRole('button',{name:'Se déconnecter',exact:true}).click();const beforeOther=await capture(desktop);
 await signIn(desktop,'yautja-other-qa@example.invalid');await desktop.getByRole('button',{name:'Confirmer : garder les parties de cet appareil sur le compte',exact:true}).waitFor();
 assert.match(await desktop.locator('[data-cloud-account-v71] [role=status]').innerText(),/autre compte|Choisissez/);sameArchive(await capture(desktop),beforeOther);assert.equal(rows.has(B),false);
 assert.equal(await desktop.evaluate(()=>localStorage.getItem('yautja-long-hunt.cloud.workspace-owner-v71')),A);
 await screenshot(desktop,'other-account-choice-does-not-upload-previous-account-parts');mark('logout-login-other-account-preserves-previous-workspace-and-requires-explicit-choice',{accountBUploaded:false});
 assert.deepEqual(pageErrors,[]);assert.equal(audit.some(e=>e.status==='unexpected-provider-request'),false);
 const result={status:'PASS',url,scope:'Real Chromium mobile/desktop UI and localStorage, plus an isolated clean desktop preflight for login before the first campaign. Supabase email/auth/REST transport wholly intercepted by QA-only fixtures; no real user, email or remote save created. Live provider SQL/RLS/CAS is a separate root verification.',checks,captures,providerRequests:audit,pageErrors,gameProgressionFixtures:'None for online campaign creations, first-account preflight or offline loaded-scene progression. The offline scene was loaded online first; offline first asset load is not supported/proven. Stale outbox/remote revision seeded solely as an explicit transport conflict fixture.',rawByteChecks:'All allowlisted raw storage strings compared, not just summary labels.'};
 await fs.writeFile(reportPath,JSON.stringify(result,null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,report:reportPath,transport:'intercepted-qa-only'}));
}catch(error){
 try{if(desktop)await screenshot(desktop,'failure-desktop');if(mobile)await screenshot(mobile,'failure-mobile');if(preflight)await screenshot(preflight,'failure-first-account');}catch{/* original error remains */}
 const diagnostics={mobile:await diagnostic(mobile),desktop:await diagnostic(desktop),firstAccount:await diagnostic(preflight)};
 await fs.writeFile(reportPath,JSON.stringify({status:'FAIL',url,scope:'QA-only intercepted provider; no live account/email.',error:error.message,checks,captures,providerRequests:audit,pageErrors,diagnostics},null,2));console.error(error.stack);process.exitCode=1;
}finally{await preflightContext?.close();await mobileContext?.close();await desktopContext?.close();await browser.close();}
