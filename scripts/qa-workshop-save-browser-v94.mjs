/** True workshop gestures + exact extracted GameClient completion/retry
 * handlers + native save writer. Small parent harness, not the entire game. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const source=await fs.readFile('app/game/GameClient.tsx','utf8'),tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name){let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=n.initializer;ts.forEachChild(n,visit);}visit(tree);assert.ok(found&&ts.isCallExpression(found),name);return found.arguments[0].getText(tree);}
const fixture=`import {StrictMode,useState,useRef} from 'react';import {createRoot} from 'react-dom/client';
import TrophyWorkshop from './app/game/TrophyWorkshop';
import {useTrophyRecoveryV94} from './app/game/useTrophyRecoveryV94';
import {createTrophyWorkshopCommitV94} from './app/game/systems/trophyWorkshopCommitV94';
import {defaultSave,writeSaveWithStatus,SAVE_STORAGE_KEY} from './app/game/save';
const seed=defaultSave('2026-10-16T00:00:00.000Z');seed.trophies=[{id:'claim-v94',definitionId:'trophy-vey',targetName:'Prise',targetKind:'human',partId:'insignia',condition:'pristine',quality:'elite',missionId:'jungle-vey',difficultyId:'elite',score:200,claimedAt:seed.createdAt}];
const initial=writeSaveWithStatus(seed).save;
const sounds=[],qa={mode:'none',writes:0,readDenied:false,SAVE_STORAGE_KEY};window.qa=qa;
const read=Storage.prototype.getItem,write=Storage.prototype.setItem;
Storage.prototype.getItem=function(k){if(k===SAVE_STORAGE_KEY&&qa.readDenied){qa.readDenied=false;throw new DOMException('readback denied','SecurityError');}return read.call(this,k);};
Storage.prototype.setItem=function(k,v){if(k===SAVE_STORAGE_KEY){qa.writes++;if(qa.mode==='drop')return;}write.call(this,k,v);if(k===SAVE_STORAGE_KEY&&qa.mode==='readback'){qa.mode='none';qa.readDenied=true;}};
function Fixture(){
 const [save,setSave]=useState(initial),saveRef=useRef(initial),sessionAliveRef=useRef(true);
 const [trophyWorkshop,setTrophyWorkshop]=useState({trophyId:'claim-v94',trophyName:'Prise',action:'clean'});
 const [pendingTrophyCommit,setPendingTrophyCommit]=useState(null),pendingTrophyCommitRef=useRef(null);
 const [failure,setSaveFailure]=useState(null),[toast,setToast]=useState('');
 const archiveTransferBusy=false,archiveRecoveryIssue=null,campaignOperationRef=useRef(null),nurseryWriteAttemptRef=useRef(null),pendingSocialWriteRef=useRef(null),pendingTerminalRunRef=useRef(null),activeHuntSessionRef=useRef(null);
 const playSound=name=>sounds.push(name);
 const trophyRecovery=useTrophyRecoveryV94({owner:initial.createdAt,enabled:true,saveRef,pendingRef:pendingTrophyCommitRef,setPending:setPendingTrophyCommit,setFailure:setSaveFailure,closeWorkshop:()=>setTrophyWorkshop(null)});
 const retryTrophyWorkshopSave=${callback('retryTrophyWorkshopSave')};
 const completeTrophyWorkshop=${callback('completeTrophyWorkshop')};
 Object.assign(qa,{save,pending:pendingTrophyCommit!==null,failure,toast,sounds,recoveryReady:trophyRecovery.isIdle(),recoveryRaw:trophyRecovery.raw});
 return <main><output id="result">{toast}</output>
 {trophyWorkshop&&<TrophyWorkshop action="clean" trophyId="claim-v94" trophyName="Prise" gamepadEnabled={false} onComplete={completeTrophyWorkshop} persistencePending={pendingTrophyCommit!==null} onRetryPersistence={retryTrophyWorkshopSave} onCancel={()=>setTrophyWorkshop(null)}/>}
 {!trophyWorkshop&&pendingTrophyCommit&&<button onClick={retryTrophyWorkshopSave}>Réessayer après fermeture</button>}
 </main>;
}createRoot(document.getElementById('root')).render(<StrictMode><Fixture/></StrictMode>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',logLevel:'silent'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?bundle.outputFiles[0].contents:'<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workshop saved result</title><div id="root"></div><script src="/fixture.js"></script></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,results=[],errors=[];let browser;
try{
 browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:{channel:process.env.AUDIT_CHROME_CHANNEL||'chrome'});
 for(const fault of ['none','drop','readback']){
  const ctx=await browser.newContext({viewport:fault==='drop'?{width:390,height:844}:{width:1280,height:900}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.qa?.save&&qa.recoveryReady);await page.bringToFront();await page.evaluate(mode=>qa.mode=mode,fault);
   await page.getByRole('button',{name:/Commencer la séquence/}).click();
   const count=await page.locator('[aria-label="Séquence de gestes"] > span').count();
   for(let index=0;index<count;index++){
    await page.waitForFunction(()=>{const n=Number(document.querySelector('[aria-label="Fenêtre de synchronisation"]')?.getAttribute('aria-valuenow'));return n>=45&&n<=65&&!!document.querySelector('.trophy-workshop-touch-controls button:not(:disabled)');},{},{timeout:6000});
    const glyph=(await page.locator('.trophy-workshop-work-area strong').first().textContent()).trim();const label={'←':'Gauche','↑':'Haut','↓':'Bas','→':'Droite','A':'Valider'}[glyph];assert.ok(label);await page.getByRole('button',{name:'Geste '+label,exact:true}).click();
    await page.waitForFunction(n=>Number(document.querySelector('[aria-label="Progression de l’atelier"]')?.getAttribute('aria-valuenow'))>=n,Math.round((index+1)/count*100));
   }
   if(fault!=='none'){
    await page.waitForFunction(()=>qa.pending&&qa.recoveryReady&&qa.recoveryRaw!==null);const backup=await page.evaluate(()=>JSON.parse(qa.recoveryRaw));assert.equal(backup.owner,await page.evaluate(()=>qa.save.createdAt));assert.equal(await page.evaluate(()=>qa.sounds.length),0);assert.equal(await page.evaluate(()=>qa.save.trophies[0].workshop),undefined);await page.getByRole('alert',{name:'Sauvegarde du rite'}).waitFor();
    await page.evaluate(()=>qa.mode='none');
    if(fault==='readback'){await page.getByRole('button',{name:'Quitter l’atelier',exact:true}).click();await page.getByRole('button',{name:'Réessayer après fermeture',exact:true}).click();}
    else await page.getByRole('button',{name:'Réessayer la sauvegarde du rite',exact:true}).click();
   }
   await page.waitForFunction(()=>qa.sounds.length===1&&!qa.pending&&qa.recoveryReady&&qa.recoveryRaw===null);assert.equal(await page.locator('.trophy-workshop-panel').count(),0);
   const state=await page.evaluate(()=>({disk:JSON.parse(localStorage.getItem(qa.SAVE_STORAGE_KEY)),live:qa.save,writes:qa.writes,sounds:qa.sounds}));assert.deepEqual(state.disk.trophies[0].workshop.completedActions,['clean']);assert.deepEqual(state.live.trophies[0].workshop,state.disk.trophies[0].workshop);assert.equal(state.writes,fault==='drop'?2:1);assert.deepEqual(state.sounds,['trophy']);
   results.push({name:fault==='none'?'played rite updates the native campaign once':fault==='drop'?'played rite survives a dropped write and narrow-screen explicit retry':'played rite survives closure and reconciles readback failure without another write',status:'PASS',gestures:count});
  }catch(e){results.push({name:fault,status:'FAIL',error:e.message});}finally{await ctx.close();}
 }
 results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});const report={scope:'Real workshop gestures, exact extracted parent callbacks, native writer and real recovery hook with IndexedDB backup/cleanup; synthetic trophy on localhost. Not whole GameClient, full campaign, art or hardware QA.',browser:browser.version(),results};await fs.mkdir('outputs/qa-audit-v94',{recursive:true});await fs.writeFile('outputs/qa-audit-v94/workshop-save-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.ok(results.every(r=>r.status==='PASS'));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
