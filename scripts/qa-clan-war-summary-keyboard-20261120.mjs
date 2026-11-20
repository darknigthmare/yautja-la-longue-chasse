/** Native keyboard activation in the actual multi-squad RTS component.
 * esbuild host; no input/reducer/state replacement, GameClient or physical pad claim. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.COMMAND_SUMMARY_OUTPUT||'outputs/qa-clan-war-summary-keyboard-20261120');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
const sourceNames=['app/game/systems/clanWarFieldControls.ts','app/game/ClanWarRtsSquadsV133.tsx',
 'app/game/ClanWarRtsSquadsV133.module.css','app/game/systems/clanWarRtsSquadsV133.ts',
 'app/game/systems/clanWarBibleV6.ts','app/game/clanWarBibleV6Source.json',
 'scripts/qa-clan-war-summary-keyboard-20261120.mjs'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const sources=()=>Promise.all(sourceNames.map(async name=>[name,sha(await fs.readFile(path.join(root,name)))]))
 .then(Object.fromEntries);
const report={schemaVersion:1,startedAt:new Date().toISOString(),scope:'Actual multi-squad RTS component, source W3 rules, native Chromium focus and keyboard events. No patched clock, reducer, save or input. Component host only; not GameClient, full mission, physical gamepad, touch device or screen-reader certification.',
 checks:[],errors:[],httpErrors:[],screenshots:[],sourceBefore:await sources()};
const pass=name=>report.checks.push({name,passed:true});
const compiled=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';
 import Rts from './app/game/ClanWarRtsSquadsV133';import {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';
 createRoot(document.getElementById('root')).render(<Rts rules={DEFAULT_WAR_RULES_V6}/>);`,
 resolveDir:root,loader:'tsx'},bundle:true,platform:'browser',format:'iife',jsx:'automatic',write:false,
 outfile:'summary.js',logLevel:'warning',define:{'process.env.NODE_ENV':'"production"'}});
const js=compiled.outputFiles.find(file=>file.path.endsWith('.js')).contents;
const css=compiled.outputFiles.find(file=>file.path.endsWith('.css')).contents;
report.bundle={jsSha256:sha(js),cssSha256:sha(css)};
const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RTS journal keyboard regression</title><link rel="stylesheet" href="/summary.css"><style>body{margin:0;background:#080f10;color:#e4eadf;font:14px system-ui}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/summary.js"></script></body></html>';
const server=createServer(async(request,response)=>{
 const name=new URL(request.url||'/','http://localhost').pathname;
 if(name==='/'){response.writeHead(200,{'content-type':'text/html;charset=utf-8'});response.end(html);return;}
 if(name==='/summary.js'){response.writeHead(200,{'content-type':'text/javascript'});response.end(js);return;}
 if(name==='/summary.css'){response.writeHead(200,{'content-type':'text/css'});response.end(css);return;}
 if(name==='/favicon.ico'){response.writeHead(204);response.end();return;}
 const file=path.resolve(root,'public','.'+decodeURIComponent(name));
 if(!file.startsWith(path.join(root,'public')+path.sep)){response.writeHead(403);response.end();return;}
 try{const bytes=await fs.readFile(file);response.writeHead(200,{'content-type':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});response.end(bytes);}
 catch{response.writeHead(404);response.end();}
});
let browser,context;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const executablePath=process.env.AUDIT_CHROME_EXECUTABLE||'/usr/bin/chromium';
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});report.browserVersion=browser.version();
 context=await browser.newContext({viewport:{width:1280,height:900},locale:'fr-FR'});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({url:response.url(),status:response.status()});});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await page.bringToFront();
 const rts=page.getByTestId('war-rts-squads-v133');
 await rts.getByRole('button',{name:/^Déployer \d+ détachements$/}).click();
 const squads=rts.getByRole('button',{name:/^\d+\. W3-U/});
 assert.ok(await squads.count()>=2,'real multi-squad deployment');
 const turn=async()=>Number(await rts.getByText('Ordres/tours',{exact:true}).locator('..').locator('strong').textContent());
 assert.equal(await turn(),0);
 const summary=rts.locator('summary').filter({hasText:'Journal opérationnel (60 entrées maximum)'});
 const details=summary.locator('..');
 const snapshot=()=>rts.evaluate(element=>({
  metrics:[...element.querySelectorAll('small')].filter(node=>node.parentElement?.tagName==='SPAN').map(node=>node.parentElement.textContent),
  map:element.querySelector('svg')?.innerHTML,
  squads:[...element.querySelectorAll('button')].filter(button=>/^\d+\. W3-U/.test(button.textContent?.trim()||'')).map(button=>button.textContent),
  journal:element.querySelector('details:last-of-type ol')?.textContent,
  feedback:[...element.querySelectorAll('[role="status"]')].map(node=>node.textContent),
 }));
 const before=await snapshot();await summary.focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>[...document.querySelectorAll('summary')].find(node=>node.textContent?.includes('Journal opérationnel (60 entrées maximum)'))?.parentElement?.open===true);
 assert.equal(await summary.evaluate(node=>node===document.activeElement),true);
 assert.deepEqual(await snapshot(),before);assert.equal(await turn(),0);
 pass('Space opens the focused native journal without advancing the actual RTS, changing units or spending RAV');
 await page.screenshot({path:path.join(out,'journal-space.png')});report.screenshots.push('journal-space.png');
 await page.keyboard.press('Space');assert.equal(await details.evaluate(node=>node.open),false);
 await page.keyboard.press('Enter');assert.equal(await details.evaluate(node=>node.open),true);
 assert.deepEqual(await snapshot(),before);pass('Space closes and Enter opens the native disclosure without a tactical order');
 await squads.nth(1).click();await rts.focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>[...document.querySelectorAll('small')].find(node=>node.textContent==='Ordres/tours')?.parentElement?.querySelector('strong')?.textContent==='1');
 assert.equal(await turn(),1);pass('Space on the actual field still issues one deliberate wait after selecting a second squad');
 const afterWait=await snapshot();await summary.focus();await page.keyboard.press('Space');
 assert.equal(await details.evaluate(node=>node.open),false);assert.equal(await turn(),1);assert.deepEqual(await snapshot(),afterWait);
 pass('Journal interaction remains safe after a real production turn with live enemy AI');
 report.sourceAfter=await sources();assert.deepEqual(report.sourceAfter,report.sourceBefore);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);throw error;}
finally{
 report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,report:path.join(out,'report.json')}));
