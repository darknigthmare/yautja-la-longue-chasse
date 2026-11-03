import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.V46_QA_URL||'http://127.0.0.1:4174';
const out=process.env.V46_OPENING_QA_OUTPUT||'work/v46/new-player-browser-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[],failures=[];
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
async function resumeIfPaused(){const dialog=page.getByRole('dialog',{name:'Chasse en pause',exact:true});if(await dialog.count())await dialog.getByRole('button',{name:'Reprendre',exact:true}).click();}
try {
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('button',{name:/^Nouvelle partie/}).click();
 await page.getByLabel('Nom du chasseur').fill('QA Découverte V46');
 await page.getByRole('button',{name:/^Créer la partie 1/}).click();
 await page.locator('[data-new-game-identity]').waitFor({timeout:60000});
 await page.getByRole('button',{name:'Confirmer le chasseur et ouvrir le premier briefing',exact:true}).click();
 await page.locator('[data-first-hunt-briefing]').waitFor();
 assert.equal(await page.locator('[data-full-hunt-briefing]').getAttribute('open'),null);
 await page.locator('.briefing-visual img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await page.screenshot({path:out+'/briefing.png'});
 checks.push({name:'first-briefing-actionable',fullBriefingPreserved:true,optionalDetailsCollapsed:true});
 await page.getByRole('button',{name:'Commencer la première chasse guidée',exact:true}).click();
 await page.locator('[data-first-hunt-guide]').waitFor({timeout:120000});await resumeIfPaused();
 await page.locator('canvas.hunt-canvas').focus();
 assert.equal(await page.locator('[data-first-hunt-guide]').getAttribute('data-first-hunt-guide'),'move');
 await page.keyboard.down('ArrowRight');try{await page.locator('[data-first-hunt-guide="jump"]').waitFor({timeout:10000});}finally{await page.keyboard.up('ArrowRight');}
 await page.keyboard.press('Space');await page.locator('[data-first-hunt-guide="scan"],[data-first-hunt-guide="track"]').waitFor();
 await page.screenshot({path:out+'/first-steps.png'});
 checks.push({name:'real-walk-and-jump',keyboard:true,noStateInjection:true});
 await page.keyboard.down('ArrowRight');try{await page.locator('[data-first-hunt-guide="scan"]').waitFor({timeout:10000});}finally{await page.keyboard.up('ArrowRight');}
 await page.keyboard.press('v');
 await page.locator('[data-first-hunt-guide] small').filter({hasText:'1/3 traces analysées'}).waitFor();
 await page.screenshot({path:out+'/first-trace.png'});
 checks.push({name:'real-first-trace',acceptedScan:true,traceCount:'1/3',noStateInjection:true});
 await page.getByRole('button',{name:'Réduire le guide',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Développer le guide',exact:true}).getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('canvas.hunt-canvas').evaluate(node=>node===document.activeElement),true);
 await page.getByRole('button',{name:'Développer le guide',exact:true}).click();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).waitFor();
 assert.equal(await page.locator('[data-first-hunt-guide]').count(),0);
 await page.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).click();
 await page.getByRole('button',{name:'Menu principal · parties et sauvegardes',exact:true}).click();
 await page.locator('[data-campaign-menu="main"]').waitFor();
 await page.getByRole('button',{name:/^Continuer/}).click();
 await page.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).waitFor({timeout:120000});
 await resumeIfPaused();await page.locator('[data-first-hunt-guide]').waitFor();
 assert.notEqual(await page.locator('[data-first-hunt-guide]').getAttribute('data-first-hunt-guide'),'move');
 assert.notEqual(await page.locator('[data-first-hunt-guide]').getAttribute('data-first-hunt-guide'),'jump');
 await page.screenshot({path:out+'/resume.png'});
 checks.push({name:'collapse-pause-resume',canvasFocusRestored:true,guideHiddenOnPause:true,noDrillResetAfterResume:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const guide=await page.locator('[data-first-hunt-guide]').boundingBox();assert(guide&&guide.x>=0&&guide.x+guide.width<=391);
 await page.screenshot({path:out+'/mobile.png'});checks.push({name:'mobile-390',noHorizontalOverflow:true,guideWithinViewport:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,base,at:new Date().toISOString(),checks,errors,failures},null,2));
 console.log(JSON.stringify({passed:true,checks}));
} catch(error) { await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/report.json',JSON.stringify({passed:false,base,checks,errors,failures,error:String(error)},null,2));throw error; }
finally {await browser.close();}
