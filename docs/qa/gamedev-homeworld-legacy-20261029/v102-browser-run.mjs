import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

// Run from the repository root. This probe exercises the real V102 route and
// real native file bytes; only delivery of an earlier File.text result is held.
const require = createRequire(path.join(process.cwd(), 'package.json'));
const {chromium} = require('playwright-core');
const origin = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3101';
const reportPath = process.env.YAUTJA_LEGACY_IMPORT_REPORT ?? '/tmp/yautja-legacy-import-browser.json';
const executablePath = process.env.AUDIT_CHROME_EXECUTABLE ?? '/tmp/chromium';
const report = {startedAt:new Date().toISOString(), route:origin+'/planet-generator-v102', serverMode:'development',
  scope:'Real V102 Next route, React controls and generated/exported JSON. Native File.text delivery is delayed in a fresh context.',
  checks:[], errors:[], consoleErrors:[], httpErrors:[], fixtures:[], nativeFileTextRestored:false,
  limits:['This targeted browser probe does not qualify a production package, full Homeworld or artistic fidelity.']};
let browser, context, page, restore, failure;
const root = () => page.getByTestId('planet-generator-v102').filter({visible:true});
const seed = () => root().getByRole('textbox',{name:'Graine du monde',exact:true});
const code = () => root().getByRole('textbox',{name:'Importer un code de monde',exact:true});
const file = () => root().getByLabel('Ou importer une fiche',{exact:true});
const button = name => root().getByRole('button',{name,exact:true});
const frames = () => page.evaluate(() => new Promise((resolve,reject) => {
  const timer=setTimeout(()=>reject(Error('Native frame deadline exceeded')),5000);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));
}));
const snapshot = () => root().evaluate(element => ({
  preview:element.getAttribute('data-preview-planet-code'),
  atlas:element.querySelector('[data-testid="clan-war-atlas-v95"]').getAttribute('data-planet-id'),
  modified:element.getAttribute('data-draft-modified'),
  message:element.querySelector(':scope > [role="status"]').textContent,
  shared:element.querySelector('textarea[readonly]').value,
  inputs:[...element.querySelectorAll('input:not([type=file]),select')].map(input => ({
    label:input.closest('label').firstChild.textContent.trim(),value:input.value,
  })),
}));
async function exportWorld(value) {
  await seed().fill(String(value)); await button('Générer l’aperçu').click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-generator-v102"]')?.getAttribute('data-draft-modified')==='false');
  const [download]=await Promise.all([page.waitForEvent('download'),button('Télécharger la fiche').click()]);
  const stream=await download.createReadStream(); assert.ok(stream);
  const chunks=[]; for await(const chunk of stream)chunks.push(chunk);
  const bytes=Buffer.concat(chunks), dossier=JSON.parse(bytes.toString('utf8')); await download.delete();
  assert.equal(dossier.version,102); assert.equal(dossier.recipe.seed,value);
  assert.equal(dossier.code,await root().getAttribute('data-preview-planet-code'));
  assert.equal(dossier.regions.length,6); assert.ok(bytes.length<=65536);
  report.fixtures.push({seed:value,code:dossier.code,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  return {bytes,dossier};
}
async function run(name, action) {
  try { const detail=await action(); report.checks.push({name,pass:true,...detail}); console.log('PASS '+name); }
  catch(error) { report.checks.push({name,pass:false,error:error.message}); throw error; }
}
try {
  browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  report.runtime={chromium:browser.version(),node:process.version,next:require('next/package.json').version,playwright:require('playwright-core/package.json').version};
  context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true,reducedMotion:'reduce'});
  page=await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='error')report.consoleErrors.push(entry.text());});
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({url:response.url(),status:response.status()});});
  await page.goto(report.route,{waitUntil:'domcontentloaded',timeout:90000}); await page.bringToFront(); await root().waitFor();
  const material=root().locator('canvas[data-render-status]').first();
  await material.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid="planet-generator-v102"] canvas')].some(c=>c.getAttribute('data-render-status')==='ready'),undefined,{timeout:90000});
  const initial=await exportWorld(201), incoming=await exportWorld(202);
  await page.evaluate(()=>{
    const descriptor=Object.getOwnPropertyDescriptor(File.prototype,'text'), nativeText=File.prototype.text;
    let armed=null, pending=null;
    Object.defineProperty(File.prototype,'text',{configurable:true,writable:true,value:function(){
      if(this.name!==armed)return nativeText.call(this);
      armed=null; let release;
      const gate=new Promise(resolve=>{release=resolve;});
      const entry={nativeFinished:false,delivered:false,release}; pending=entry;
      entry.done=Promise.all([nativeText.call(this).then(text=>{entry.nativeFinished=true;entry.length=text.length;return text;}),gate])
        .then(([text])=>{entry.delivered=true;return text;});
      return entry.done;
    }});
    window.__legacyImportProbe={
      arm(name){if(pending&&!pending.delivered)throw Error('Previous read still held');armed=name;pending=null;},
      state(){return pending?{nativeFinished:pending.nativeFinished,delivered:pending.delivered,length:pending.length}:null;},
      async release(){assertPending();pending.release();await pending.done;return this.state();},
      restore(){pending?.release();if(descriptor)Object.defineProperty(File.prototype,'text',descriptor);else delete File.prototype.text;delete window.__legacyImportProbe;return File.prototype.text===nativeText;},
    };
    function assertPending(){if(!pending?.nativeFinished||pending.delivered)throw Error('Expected completed native read awaiting delivery');}
  });
  restore=()=>page.evaluate(()=>window.__legacyImportProbe.restore());
  async function baseline(){
    await code().fill(initial.dossier.code);await button('Retrouver le monde').click();await frames();
    assert.equal(await root().getAttribute('data-preview-planet-code'),initial.dossier.code);assert.equal(await seed().inputValue(),'201');
  }
  async function held(name,prepare,action,expectedMessage){
    await run(name,async()=>{
      await baseline();await prepare();
      const filename='held-'+report.checks.length+'.json';
      await page.evaluate(name=>window.__legacyImportProbe.arm(name),filename);
      await file().setInputFiles({name:filename,mimeType:'application/json',buffer:incoming.bytes});
      await page.waitForFunction(()=>window.__legacyImportProbe.state()?.nativeFinished===true);
      const before=await page.evaluate(()=>window.__legacyImportProbe.state());assert.equal(before.delivered,false);
      assert.equal(before.length,incoming.bytes.toString('utf8').length);
      await action();await frames();const latest=await snapshot();
      assert.equal(latest.preview,initial.dossier.code);assert.equal(latest.atlas,initial.dossier.code);
      if(expectedMessage)assert.equal(latest.message,expectedMessage);
      const delivered=await page.evaluate(()=>window.__legacyImportProbe.release());assert.equal(delivered.delivered,true);
      await frames();const after=await snapshot();assert.deepEqual(after,latest);
      return {nativeReadDelivered:true,preserved:after};
    });
  }
  await held('Editing the seed supersedes an older native file',async()=>{},async()=>{
    await seed().fill('205');assert.equal(await seed().inputValue(),'205');
  });
  await held('Editing atmosphere supersedes an older native file',async()=>{},async()=>{
    await root().getByRole('combobox',{name:'Atmosphère',exact:true}).selectOption('aurora');
    assert.equal(await root().getByRole('combobox',{name:'Atmosphère',exact:true}).inputValue(),'aurora');
  });
  await held('A rejected generation preserves its error after the older read',()=>seed().fill('4294967296'),()=>button('Générer l’aperçu').click(),'Une graine numérique doit être comprise entre 0 et 4 294 967 295.');
  await held('A rejected code import preserves its error after the older read',()=>code().fill('incomplete-world-code'),()=>button('Retrouver le monde').click(),'Ce code de monde n’est pas reconnu. Vérifiez qu’il est complet.');
  await held('A newer unfinished code edit remains intact after the older read',async()=>{},()=>code().fill('newer-unfinished-world-code'));
  await run('A fresh V102 native import still succeeds after the cancelled reads',async()=>{
    await file().setInputFiles({name:'current-world-202.json',mimeType:'application/json',buffer:incoming.bytes});
    await page.waitForFunction(code=>document.querySelector('[data-testid="planet-generator-v102"]')?.getAttribute('data-preview-planet-code')===code,incoming.dossier.code);
    await frames();const current=await snapshot();assert.equal(current.preview,incoming.dossier.code);assert.equal(current.atlas,incoming.dossier.code);
    assert.equal(await seed().inputValue(),'202');assert.equal(current.modified,'false');
    assert.equal(current.message,'Fiche importée. Sa géographie est reconstruite à partir du code de monde.');
    return {imported:current};
  });
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.httpErrors,[]);
}catch(error){failure=error.stack??String(error);}
finally{
  if(restore)report.nativeFileTextRestored=await restore().catch(()=>false);
  if(restore&&!report.nativeFileTextRestored&&!failure)failure='Native File.text descriptor was not restored';
  report.status=failure?'FAIL':'PASS';report.completedAt=new Date().toISOString();if(failure)report.failure=failure;
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();
}
if(failure)throw Error(failure);
console.log(JSON.stringify({status:'PASS',checks:report.checks.length,report:reportPath}));
