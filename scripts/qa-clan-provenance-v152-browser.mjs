/** Real ClanWarPanel V85 in Chromium, two same-origin tabs and real localStorage.
 * Fixture profile and placeholder images; not GameClient or physical gamepad. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({entryPoints:[path.join(root,'tests/browser/clan-war-provenance-v152.fixture.tsx')],bundle:true,write:false,outdir:path.join(root,'outputs/qa-provenance-v152-build'),format:'esm',platform:'browser',jsx:'automatic',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'test-static-next-image',setup(b){
 b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'test-image'}));
 b.onLoad({filter:/.*/,namespace:'test-image'},()=>({contents:`import React from 'react'; export default function Image({unoptimized,priority,fill,...props}) {return React.createElement('img',props);}`,loader:'js',resolveDir:root}));
}}]});
const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=compiled.outputFiles.find(f=>f.path.endsWith('.css'))?.contents??'';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(js);}
 else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(css);}
 else if(req.url.startsWith('/game/')){res.setHeader('Content-Type','image/png');res.end(pixel);}
 else if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Provenance QA</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');}
 else {res.writeHead(404);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`,errors=[];
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:{})});
 const ctx=await browser.newContext({viewport:{width:1200,height:900}});
 const a=await ctx.newPage(),b=await ctx.newPage();
 for(const p of [a,b]){
  p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin);await p.waitForFunction(()=>window.__warApiV94&&window.__warUiV94);
 }
 const make=async mode=>b.evaluate(mode=>{
  const api=window.__warApiV94,rules=api.rules,initial=api.createWarOperationsV115(rules),team=initial.teams[0].id;
  const dest=rules.territories.find(t=>t.id!==initial.baseId&&!api.warMissionEligibleV115(initial,rules,t.id,[team]));
  const opened=api.beginWarOperationV115(initial,mode,dest.id,[team],rules,1000);
  if(!opened.accepted)throw Error(opened.message);
  const closed=mode==='outer'?api.settleWarOuterOpsV115(opened.state,opened.state.outer[0].dueAt,rules):api.leaveWarOperationV115(opened.state,rules);
  if(!closed.accepted)throw Error(closed.message);
  const raw=JSON.stringify(closed.state);localStorage.setItem(api.WAR_OPERATIONS_STORAGE_V115,raw);return raw;
 },mode);
 await b.evaluate(()=>localStorage.setItem('yautja-long-hunt.save','campaign-sentinel'));
 const original=await make('assault');
 const btn=a.getByRole('button',{name:'Examiner les sources V115 · lecture seule'});
 await btn.waitFor({state:'visible'});
 const before=await a.evaluate(()=>({campaign:localStorage.getItem('yautja-long-hunt.save'),world:localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85)}));
 await btn.click();await a.getByText('Contrôles de provenance V152 · 1 bilans').waitFor();
 assert.equal(await a.evaluate(()=>localStorage.getItem(window.__warApiV94.WAR_OPERATIONS_STORAGE_V115)),original);
 assert.deepEqual(await a.evaluate(()=>({campaign:localStorage.getItem('yautja-long-hunt.save'),world:localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85)})),before);
 await b.evaluate(()=>localStorage.setItem('unrelated','value'));
 await a.waitForTimeout(100);assert.equal(await a.getByText(/Le bilan V115 peut être périmé/).count(),0);
 await make('outer');
 await a.getByText(/Le bilan V115 peut être périmé/).waitFor();
 assert.equal(await a.getByText('Contrôles de provenance V152 · 1 bilans').count(),0,'old conclusion hidden');
 await btn.click();await a.getByText('Contrôles de provenance V152 · 1 bilans').waitFor();
 await a.getByText('Contrôles de provenance V152 · 1 bilans').click();
 await a.getByText(/Outer Ops 1/).waitFor();
 await a.getByRole('button',{name:'Bible V6 · règles actuelles'}).click();
 await a.getByRole('button',{name:'Planètes · conquête'}).click();
 await a.getByText(/Le bilan V115 peut être périmé/).waitFor();
 await btn.click();await a.getByText('Contrôles de provenance V152 · 1 bilans').waitFor();
 await b.evaluate(()=>localStorage.removeItem(window.__warApiV94.WAR_OPERATIONS_STORAGE_V115));
 await a.getByText(/Le bilan V115 peut être périmé/).waitFor();
 await btn.click();await a.getByText(/Aucune archive de missions V115/).waitFor();
 assert.equal(await a.getByText(/Le bilan V115 peut être périmé/).count(),0);
 assert.deepEqual(await a.evaluate(()=>({campaign:localStorage.getItem('yautja-long-hunt.save'),world:localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85)})),before);
 await make('assault');await btn.click();await a.getByText('Contrôles de provenance V152 · 1 bilans').waitFor();
 await b.evaluate(()=>localStorage.clear());
 await a.getByText(/Le bilan V115 peut être périmé/).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS explicit inspection, no write, unrelated event, cross-tab invalidation, refresh, deletion and no V85 mutation; Chromium '+browser.version());
 await ctx.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
