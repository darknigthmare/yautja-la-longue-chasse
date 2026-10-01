import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {menuFixturesV63} from './campaign-menu-v63-fixtures.mjs';
const url=process.env.V63_QA_URL??'https://yautja-la-longue-chasse.vercel.app';
const phase=process.env.V63_QA_PHASE??'before';
const out=`work-local/v63/qa/menu/${phase}`;await fs.mkdir(out,{recursive:true});
const fixtures=process.env.V63_QA_FIXTURE_FILE?JSON.parse(await fs.readFile(process.env.V63_QA_FIXTURE_FILE,'utf8')):await menuFixturesV63(),browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
async function verifyManualReplacement(page){
 await page.getByRole('button',{name:'Réglages',exact:true}).last().click();
 const panel=page.locator('[data-campaign-save-panel]');await panel.waitFor();
 const manual=panel.locator('[data-manual-save="1"]');await manual.click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.campaign-slot.1')).checkpoints.some(c=>c.id==='manual-1'));
 const before=await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.campaign-slot.1'));
 await manual.click();const confirmation=page.getByRole('group',{name:'Confirmation du remplacement manuel',exact:true});await confirmation.waitFor();
 assert.match(await confirmation.innerText(),/Remplacer la sauvegarde manuelle 1/);
 await confirmation.screenshot({path:`${out}/manual-checkpoint-confirmation.png`});
 await confirmation.getByRole('button',{name:'Annuler le remplacement',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.campaign-slot.1')),before);
 await manual.click();await page.getByRole('button',{name:'Confirmer le remplacement manuel 1',exact:true}).click();
 const old=JSON.parse(before);await page.waitForFunction(revision=>JSON.parse(localStorage.getItem('yautja-long-hunt.campaign-slot.1')).revision>revision,old.revision);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.campaign-slot.1')));
 assert.equal(after.revision,old.revision+1);assert.deepEqual(after.checkpoints.filter(c=>c.id!=='manual-1'),old.checkpoints.filter(c=>c.id!=='manual-1'));
 return {status:'PASS',case:'Manual checkpoint first save, cancel replacement without writes, then confirmed replacement; other checkpoints unchanged'};
}
try {
 for(const [scenario,entries] of Object.entries(fixtures)) {
  const context=await browser.newContext({viewport:{width:1365,height:950},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({entries,scenario})=>{
   for(const [key,value] of entries)localStorage.setItem(key,value);
   if(scenario==='readDenied')Object.defineProperty(window,'localStorage',{get(){throw new DOMException('QA storage denied','SecurityError');}});
   if(scenario==='writeDenied')Storage.prototype.setItem=function(){throw new DOMException('QA quota exceeded','QuotaExceededError');};
   if(scenario==='heldLock')navigator.locks.request=async(_name,_options,callback)=>callback(null);
   if(scenario==='hungLock')navigator.locks.request=()=>new Promise(()=>{});
  },{entries,scenario});
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.locator('[data-campaign-menu]').waitFor();
  if(scenario==='hungLock')await page.waitForTimeout(6500);
  else await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='false');
  const state=await page.locator('[data-campaign-menu]').evaluate(root=>({busy:root.getAttribute('aria-busy'),buttons:[...root.querySelectorAll('button')].map(button=>({text:button.innerText,disabled:button.disabled})),status:[...root.querySelectorAll('[role=status]')].map(node=>node.textContent)}));
  await page.screenshot({path:`${out}/${scenario}.png`});
  const values=scenario==='readDenied'?null:await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  const result={scenario,...state,errors,originalBytesPreserved:values===null?null:entries.every(([key,value])=>values[key]===value)};
  if(phase!=='before'){
   assert.equal(state.busy,'false',scenario+': stuck busy');assert.deepEqual(errors,[]);
   const button=(prefix)=>page.getByRole('button',{name:new RegExp('^'+prefix)});
   if(scenario==='empty'||scenario==='filled'||scenario==='writeDenied'){
    assert.equal(await button('Nouvelle partie').isEnabled(),true);await button('Nouvelle partie').click();
    await page.getByLabel('Nom du chasseur',{exact:true}).fill('Nouvelle QA V63');
    if(scenario==='filled'){
     assert.equal(await page.locator('[data-campaign-slot]').count(),5);
     await button('Remplacer la partie 1').click();
     const dialog=page.getByRole('dialog');assert.match(await dialog.innerText(),/Chasseur QA 1/);
     assert.match(await dialog.innerText(),/dix emplacements manuels/);
     await dialog.screenshot({path:`${out}/replacement-confirmation.png`});
     await page.setViewportSize({width:390,height:844});
     const mobile=await dialog.evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
     assert(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y>=0&&mobile.y+mobile.height<=844,'Replacement dialog must fit mobile');
     await dialog.getByRole('button',{name:/^Confirmer le remplacement/}).scrollIntoViewIfNeeded();
     await page.screenshot({path:`${out}/replacement-mobile.png`});await page.setViewportSize({width:1365,height:950});
     await dialog.getByRole('button',{name:'Annuler',exact:true}).click();
     assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),values,'Cancel must write nothing');
     await button('Remplacer la partie 1').click();await button('Confirmer le remplacement de la partie 1').click();
    }else await button('Créer la partie 1').click();
    if(scenario==='writeDenied'){
     await page.waitForFunction(()=>document.querySelector('[data-campaign-menu]')?.getAttribute('aria-busy')==='false');
     assert.equal(await page.locator('[data-campaign-session]').count(),0);
     const status=(await page.locator('[role=status]').allTextContents()).join(' ');assert.match(status,/Stockage plein|refus/i);
     assert.equal(await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.campaign-slot.1')),null);
     result.action={status:'PASS',case:'Creation refuses denied storage with visible message',message:status};
    }else{
     await page.locator('[data-campaign-session]').waitFor({timeout:90000});
     await page.locator('[data-nursery-confirm]').waitFor({timeout:90000});
     const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
     const current=JSON.parse(stored['yautja-long-hunt.save']);assert.equal(current.profile.hunterName,'Nouvelle QA V63');
     assert.equal(current.prologue.status,'active');
     if(scenario==='filled'){
      const rescue=Object.entries(stored).find(([key])=>key.includes('.replaced.'));assert(rescue);
      const preserved=JSON.parse(rescue[1]);assert.deepEqual(preserved.slot,JSON.parse(values['yautja-long-hunt.campaign-slot.1']));
      for(let id=2;id<=5;id++)assert.equal(stored[`yautja-long-hunt.campaign-slot.${id}`],values[`yautja-long-hunt.campaign-slot.${id}`]);
     }
     result.action={status:'PASS',case:scenario==='filled'?'Cancel then confirmed replacement starts nursery; old slot rescue and four other slots preserved':'New game starts nursery'};
     await page.screenshot({path:`${out}/${scenario}-nursery.png`});
    }
   }else if(scenario==='normal'){
    await button('Continuer').click();await page.getByRole('button',{name:'Accès rapide aux installations',exact:true}).waitFor({timeout:90000});
    result.action={status:'PASS',case:'Continue enters existing campaign'};
    result.manualCheckpoint=await verifyManualReplacement(page);
   }else if(scenario==='corruptNoSlots'){
    await button('Nouvelle partie').click();await page.getByLabel('Nom du chasseur',{exact:true}).fill('Nouvelle après récupération');
    await button('Conserver les données endommagées et repartir').click();
    const dialog=page.getByRole('dialog');assert.match(await dialog.innerText(),/conservées exactement/);await dialog.screenshot({path:`${out}/new-recovery-confirmation.png`});
    await dialog.getByRole('button',{name:'Annuler',exact:true}).click();assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),values);
    await button('Conserver les données endommagées et repartir').click();await button('Confirmer la nouvelle chronique protégée').click();
    await page.locator('[data-nursery-confirm]').waitFor({timeout:90000});
    const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),rescue=Object.entries(stored).find(([key])=>key.includes('.workspace-recovery.'));assert(rescue);
    const original=JSON.parse(rescue[1]).original;for(const [key,raw] of entries)assert.equal(original.find(entry=>entry.key===key).raw,raw);
    assert.equal(JSON.parse(stored['yautja-long-hunt.save']).profile.hunterName,'Nouvelle après récupération');
    result.action={status:'PASS',case:'No readable slot: cancel writes nothing; explicit raw-preserving new start reaches nursery in an empty slot'};
   }else if(scenario==='corrupt'||scenario==='future'){
    assert.equal(await button('Charger une partie').isEnabled(),true);await button('Charger une partie').click();
    assert.equal(await page.locator('[data-campaign-slot]').count(),5);await page.locator('[data-checkpoint-id="auto-1"]').click();
    if(scenario==='future'){
     assert.equal(await button('Confirmer le chargement').isDisabled(),true);
     assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),values);
     result.action={status:'PASS',case:'All readable slots visible; future workspace cannot be overwritten'};
    }else{
     await button('Confirmer la récupération').click();await page.locator('[data-campaign-session]').waitFor({timeout:90000});
     await page.locator('[data-nursery-confirm]').waitFor({timeout:90000});
     const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
     const rescue=Object.entries(stored).find(([key])=>key.includes('.workspace-recovery.'));assert(rescue);
     const original=JSON.parse(rescue[1]).original;assert.equal(original.find(v=>v.key==='yautja-long-hunt.save').raw,'{damaged QA archive');
     result.action={status:'PASS',case:'Explicit recovery from readable slot starts campaign and preserves corrupt raw bytes'};
    }
   }else if(scenario==='corruptSlot'||scenario==='futureSlot'){
    await button('Nouvelle partie').click();await page.locator('[data-campaign-slot="3"]').click();
    assert.equal(await button('Créer la partie 3').isDisabled(),true);
    await button('Retour au menu').click();await button('Charger une partie').click();await page.locator('[data-campaign-slot="3"]').click();
    if(scenario==='corruptSlot'){
     await button('Récupérer la copie de secours').click();
     await page.waitForFunction(()=>document.querySelector('[data-campaign-slot="3"]')?.getAttribute('data-slot-state')==='ready');
     assert.equal(await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.campaign-slot.3.damaged')),'{damaged QA slot');
    }else assert.equal(await button('Récupérer la copie de secours').count(),0);
    await button('Retour au menu').click();await button('Continuer').click();await page.locator('[data-nursery-confirm]').waitFor({timeout:90000});
    result.action={status:'PASS',case:scenario==='corruptSlot'?'Protected slot cannot be replaced; explicit backup recovery preserves damaged bytes':'Future slot stays protected and cannot be downgraded from backup'};
   }else{
    assert.equal(await button('Actualiser les archives').isEnabled(),true);
    assert.equal(await button('DLC / Chroniques de chasse').isEnabled(),true);
    result.action={status:'PASS',case:'Refused storage/lock does not freeze menu and keeps refresh and DLC accessible'};
   }
  }
  assert.deepEqual(errors,[],scenario+': browser errors');results.push(result);
  await context.close();
 }
 await fs.writeFile(`docs/v63-menu-${phase}-qa.json`,JSON.stringify({status:phase==='before'?'OBSERVED':'PASS',url,phase,scope:'Isolated QA browser contexts only. No real user saves inspected. Entry reaches the nursery prompt; this is not a complete prologue playthrough.',results},null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
