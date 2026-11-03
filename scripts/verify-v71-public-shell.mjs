import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const url=process.env.V71_SHELL_QA_URL??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V71_SHELL_QA_OUTPUT??'work-local/v71/qa/public-shell';
const config=JSON.parse(await fs.readFile('app/game/data/cloudAccountConfigV71.json','utf8'));
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',error=>errors.push(error.message));
const check=(name,passed,details)=>{checks.push({name,passed,details});if(!passed)throw new Error(name);};
try{
 const response=await page.goto(url,{waitUntil:'networkidle'});
 check('public-game-http',response.status()===200,{status:response.status()});
 await page.getByRole('button',{name:/^Compte & sauvegardes/}).click();
 await page.locator('[data-cloud-account-v71]').waitFor();
 check('actual-account-dialog-and-inert-menu',await page.locator('[data-campaign-menu]').evaluate(el=>Boolean(el.closest('[inert]'))));
 check('login-does-not-reject-legacy-password-length',await page.getByLabel('Mot de passe',{exact:true}).getAttribute('minlength')==='1');
 await page.getByRole('button',{name:'Créer un compte',exact:true}).click();
 check('new-account-password-minimum',await page.getByLabel('Mot de passe',{exact:true}).getAttribute('minlength')==='8');
 // Read-only real provider calls from the deployed browser: no credentials, signup or email.
 const provider=await page.evaluate(async c=>{
  const settings=await fetch(c.url+'/auth/v1/settings',{headers:{apikey:c.publishableKey}});
  const settingsBody=await settings.json();
  const rows=await fetch(c.url+'/rest/v1/'+c.table+'?select=user_id&limit=1',{headers:{apikey:c.publishableKey}});
  return {authSettingsStatus:settings.status,emailEnabled:settingsBody.external?.email??false,signupDisabled:settingsBody.disable_signup??null,anonymousTableStatus:rows.status};
 },config);
 check('real-provider-cors-and-auth-settings',provider.authSettingsStatus===200&&provider.emailEnabled&&!provider.signupDisabled,provider);
 check('real-provider-anonymous-table-refused',[401,403].includes(provider.anonymousTableStatus),{status:provider.anonymousTableStatus});
 await page.screenshot({path:path.join(output,'account-desktop.png')});
 await page.getByRole('button',{name:'Fermer le compte',exact:true}).click();
 await page.getByRole('button',{name:/^Nouvelle partie/}).click();
 check('actual-new-game-menu',await page.locator('[data-campaign-menu="new"]').count()===1);
 await page.screenshot({path:path.join(output,'new-game-desktop.png')});
 const files=['game/homeworld/v70/temple-modules.png','game/homeworld/v71/outskirts-kit.png','game/homeworld/v71/cinder-ground.png'];
 for(const file of files){
  const remote=await page.request.get(new URL('/'+file,url).href);
  const remoteBytes=await remote.body();const local=await fs.readFile(path.join('public',file));
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  check('native-bitmap-http-and-identity:'+file,remote.status()===200&&sha(remoteBytes)===sha(local),{http:remote.status(),bytes:remoteBytes.length,sha256:sha(remoteBytes)});
 }
 check('no-javascript-errors',errors.length===0,errors);
}catch(error){checks.push({name:'exception',passed:false,details:error.message});await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{await browser.close();}
const report={status:checks.every(c=>c.passed)?'PASS':'FAIL',url,at:new Date().toISOString(),checks,errors,limits:'Read-only real provider CORS/settings and anonymous refusal; no user login, account creation, email or authenticated cloud transfer is certified here. Separate recipes verify gameplay and simulated transport.'};
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,output}));
if(report.status!=='PASS')process.exitCode=1;
