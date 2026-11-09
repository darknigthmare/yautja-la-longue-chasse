import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(process.env.ATLAS_QA_REPO||process.cwd());
const {chromium}=await import(pathToFileURL(path.join(root,'node_modules/playwright-core/index.mjs')).href);
const url=process.env.ATLAS_QA_URL||'http://127.0.0.1:3121';
const out=path.resolve(root,process.env.ATLAS_QA_OUTPUT||'production/p0p1-20261109/qa/homeworld/native-exports/attempt-1');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
const files=['app/game/ClanWarVariantAtlasV120.tsx','app/game/systems/clanWarVariantExportV126.ts','app/game/systems/clanWarWorldClimateV126.ts','app/game/systems/clanWarVariantAtlasV120.ts','app/game/ClanWarBibleV6Panel.tsx','app/game/GameClient.tsx'];
const source=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(path.join(root,f)))])));
const report={schemaVersion:1,url,scope:'Native production GameClient: physical Clan Ship route to council, real War Bible atlas export controls, disclosed initial B05 fixture. No callback, clock, actor or result patched.',
  fixture:'production/crew-dialogue-20261109/qa/native/attempt-1/initial-agreement.json',fixtureFullCampaign:false,checks:[],errors:[],consoleErrors:[],httpErrors:[],requestFailures:[],servedScripts:[],screenshots:[],downloads:[],physicalGamepad:false,humanArtReviewed:false};
report.sourceBefore=await source();report.buildIdBefore=(await fs.readFile(path.join(root,'.next/BUILD_ID'),'utf8')).trim();
const fixtureRaw=await fs.readFile(path.join(root,report.fixture),'utf8'),save=JSON.parse(fixtureRaw);
report.fixtureSha256=sha(fixtureRaw);
function readCsv(text){
 const rows=[];let row=[],value='',quoted=false;text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(char==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&char===';'){row.push(value);value='';}
  else if(!quoted&&char==='\r'&&text[i+1]==='\n'){row.push(value);rows.push(row);row=[];value='';i++;}
  else value+=char;
 }
 row.push(value);rows.push(row);assert.equal(quoted,false);
 const header=rows.shift();return rows.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]])));
}
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

 report.scope='Before command-shell redesign; actual production GameClient and council route, disclosed historical B05 prerequisites.';
 const war=page.locator('[data-clan-war-v85="free-profile"]');
 await war.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'front-before.png')});
 report.front=await war.evaluate(e=>({height:e.getBoundingClientRect().height,viewport:innerHeight,visibleButtons:[...e.querySelectorAll('button')].filter(x=>x.checkVisibility()).length,atlasTop:e.querySelector('[data-testid="clan-war-shared-atlas-v131"]')?.getBoundingClientRect().top}));
 await war.getByRole('button',{name:'Bible V6 · règles actuelles',exact:true}).click();await war.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'bible-before.png')});
 await war.getByRole('button',{name:'Opérations jouables · 4 modes',exact:true}).click();await page.locator('[data-testid="clan-operations-v115"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'operations-before.png')});
 report.passed=report.errors.length===0;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await Promise.all(scripts);await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();console.log(JSON.stringify({passed:report.passed,front:report.front,errors:report.errors,out}));}
