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
 await page.locator('[data-clan-war-v85="free-profile"]').waitFor({timeout:90000});
 await page.getByRole('button',{name:'Bible V6 · règles actuelles',exact:true}).click();
 await page.getByRole('button',{name:'1 200 variantes · 4 gameplays',exact:true}).click();
 const atlas=page.locator('[data-testid="clan-war-variants-v120"]');await atlas.waitFor();
 check('native-council-to-war-bible-atlas');
 const rawBefore=await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));
 await fs.writeFile(path.join(out,'campaign-before-exports.json'),rawBefore);
 const cases=[{name:'Erg Chebbi',file:'desert',weatherCheck:weather=>assert.doesNotMatch(weather,/neige|blizzard|glacier/iu)},
  {name:'Musée du Louvre',file:'indoor',weatherCheck:weather=>assert.equal(weather,"pas de météo extérieure à l'intérieur")},
  {name:'Pont de Normandie',file:'corridor',weatherCheck:weather=>assert.equal(weather,'météo variable selon secteurs parcourus')}];
 for(const item of cases){
  await atlas.getByRole('searchbox').fill(item.name);
  await atlas.getByText('1 mission(s) correspondant aux filtres.',{exact:false}).waitFor();
  const outputs={};
  for(const kind of ['JSON','CSV']){
   const wait=page.waitForEvent('download');
   await atlas.getByRole('button',{name:kind==='CSV'?'Exporter le tableau CSV (1)':'Exporter JSON complet (1)',exact:true}).click();
   const download=await wait;assert.equal(await download.failure(),null);
   const filename=item.file+'.'+kind.toLowerCase(),destination=path.join(out,filename);await download.saveAs(destination);
   const raw=await fs.readFile(destination);outputs[kind]=kind==='JSON'?JSON.parse(raw):readCsv(raw.toString('utf8'));
   report.downloads.push({filename,downloadName:download.suggestedFilename(),sha256:sha(raw),bytes:raw.length});
   assert(download.suggestedFilename().includes('_V126_'));
  }
  const json=outputs.JSON,csv=outputs.CSV;assert.equal(json.schema,126);assert.equal(json.sourceSchema,120);assert.equal(json.total,1);assert.equal(json.variants.length,1);assert.equal(csv.length,1);
  const v=json.variants[0];assert.equal(v.geography.worldId,'earth');assert.equal(v.geography.siteName,item.name);assert.equal(v.original.referenceName,item.name);assert.equal(v.original.status,'design-only');assert.equal(v.original.canonClaim,false);
  assert.equal(csv[0].ID,v.sourceId);assert.equal(csv[0].Monde,'earth');assert.equal(csv[0].Lieu,item.name);assert.equal(csv[0].Météo,v.environment.weather);assert.equal(csv[0]['Zone liquide'],v.environment.liquid);item.weatherCheck(v.environment.weather);
  assert.equal(csv[0]['Lieu source V120'],v.original.settingName);assert.equal(csv[0]['Météo source V120 remplacée'],v.original.environment.weather);
  check('native-download-'+item.file,{sourceId:v.sourceId,worldId:v.geography.worldId,weather:v.environment.weather,sourcePreserved:true});
  await atlas.scrollIntoViewIfNeeded();const image=item.file+'-desktop.png';await page.screenshot({path:path.join(out,image),fullPage:true});report.screenshots.push({filename:image,sha256:sha(await fs.readFile(path.join(out,image))),opened:false});
 }
 await page.setViewportSize({width:320,height:844});await atlas.getByRole('searchbox').fill('Musée du Louvre');
 await atlas.getByText('1 mission(s) correspondant aux filtres.',{exact:false}).waitFor();
 await atlas.getByRole('button',{name:'Exporter JSON complet (1)',exact:true}).scrollIntoViewIfNeeded();
 const mobileWait=page.waitForEvent('download');await atlas.getByRole('button',{name:'Exporter JSON complet (1)',exact:true}).click();const mobile=await mobileWait;assert.equal(await mobile.failure(),null);await mobile.saveAs(path.join(out,'indoor-mobile.json'));
 assert.equal(JSON.parse(await fs.readFile(path.join(out,'indoor-mobile.json'),'utf8')).variants[0].geography.siteName,'Musée du Louvre');
 check('mobile-320-native-download');
 await atlas.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'atlas-mobile-320.png'),fullPage:true});report.screenshots.push({filename:'atlas-mobile-320.png',sha256:sha(await fs.readFile(path.join(out,'atlas-mobile-320.png'))),opened:false});
 const rawAfter=await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));await fs.writeFile(path.join(out,'campaign-after-exports.json'),rawAfter);assert.equal(rawAfter,rawBefore);
 check('export-controls-preserve-raw-campaign-save',{sha256:sha(rawAfter)});
 await Promise.all(scripts);assert(report.servedScripts.length>0);assert(report.servedScripts.every(s=>s.matches));check('served-next-javascript-matches-production-build',{scripts:report.servedScripts.length});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.requestFailures,[]);check('no-browser-console-http-request-errors');
 report.sourceAfter=await source();report.buildIdAfter=(await fs.readFile(path.join(root,'.next/BUILD_ID'),'utf8')).trim();assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.equal(report.buildIdAfter,report.buildIdBefore);check('source-and-build-identity-unchanged');
 report.passed=true;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await Promise.all(scripts);await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,downloads:report.downloads.length,screenshots:report.screenshots.length,out}));}
