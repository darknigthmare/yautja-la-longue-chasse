import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

// No implicit public target: the release owner supplies the READY deployment URL.
const url=process.env.V65_QA_URL;
if(!url)throw new Error('Set V65_QA_URL only after the target deployment is ready.');
const output=process.env.V65_LEGACY_MENU_QA_OUTPUT??'work-local/v65/qa/legacy-menu';
const archive=process.env.V65_LEGACY_MENU_ARCHIVE??'work/v47/nursery-scene-browser-qa/played-campaign-storage.json';
const raw=await fs.readFile(archive,'utf8'),entries=JSON.parse(raw);
const original=JSON.parse(entries['yautja-long-hunt.save']);
const oldShip=JSON.parse(entries['yautja-long-hunt.ship-progression']);
assert.equal(original.prologue.status,'completed');
assert.equal(original.prologue.checkpoint.winner,'player');
assert.equal(oldShip.loadoutPresets[0].appearance.headStyleId,undefined);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];let page;
try{
  // Fresh browser context only; never connect to a user profile or persistent save store.
  page=await browser.newPage({viewport:{width:1365,height:950}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.evaluate(data=>{
    if(localStorage.length)throw Error('An empty isolated QA context is required.');
    for(const [key,value]of Object.entries(data))localStorage.setItem(key,value);
  },entries);
  await page.reload({waitUntil:'networkidle'});
  const menu=page.locator('[data-campaign-menu]');await menu.waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='false');
  for(const label of ['Continuer','Nouvelle partie','Charger une partie'])assert(await menu.getByRole('button',{name:new RegExp('^'+label)}).isEnabled(),label+' stays usable with the old archive');
  const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await page.screenshot({path:output+'/legacy-menu.jpg',type:'jpeg',quality:85});
  checks.push('Continue, New game and Load remain enabled with the full old archive and absent optional headStyleId.');

  await menu.getByRole('button',{name:/^Charger une partie/}).click();
  await page.locator('[data-campaign-slot="1"][data-slot-state="ready"]').waitFor();
  const checkpoint=page.locator('[data-checkpoint-id="auto-1"]');assert(await checkpoint.isEnabled());
  await checkpoint.click();const confirmation=page.getByRole('dialog');await confirmation.waitFor();
  assert.match(await confirmation.innerText(),/Charger ce checkpoint/);
  await confirmation.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.getByRole('button',{name:'Retour au menu · B',exact:true}).click();
  await menu.getByRole('button',{name:/^Nouvelle partie/}).click();
  assert.equal(await page.locator('[data-campaign-slot]').count(),5);
  await page.getByRole('button',{name:'Retour au menu · B',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),before,'Consultation and cancelled load must not rewrite the old archive.');
  checks.push('The old auto-checkpoint is readable; cancelling load and leaving New game preserve every stored byte.');

  await menu.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-unblooded-objective="chief"]').waitFor({timeout:60000});
  const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')));
  assert.equal(resumed.createdAt,original.createdAt);
  assert.equal(resumed.prologue.status,'completed');
  assert.equal(resumed.appearance.headStyleId,'reference');
  assert.equal(resumed.homeworld.greetedNpcIds.length,0);
  await page.screenshot({path:output+'/legacy-resumed.jpg',type:'jpeg',quality:85});
  checks.push('Continue resumes the actually played nursery result, preserves ownership and greetings, and applies the default reference head.');
  assert.deepEqual(errors,[]);
  assert.equal(await fs.readFile(archive,'utf8'),raw,'Original QA archive file remains untouched.');
  const result={status:'PASS',url,checks,errors,archive,archiveSha256:createHash('sha256').update(raw).digest('hex'),scope:'Isolated QA storage only. Full old V47 campaign plus ship, checkpoint and backup; no real user saves and no publication action.'};
  await fs.writeFile(output+'/report.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,checks:checks.length,output}));
}catch(error){
  if(page)await page.screenshot({path:output+'/failure.jpg',type:'jpeg',quality:85}).catch(()=>{});
  await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors},null,2)+'\n');throw error;
}finally{await browser.close();}
