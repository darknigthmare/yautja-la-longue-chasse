/** Actual bestiary and catalogue React components; static placeholder art.
 * No save/gameplay or campaign completion is simulated by this fixture. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({entryPoints:[path.join(root,'tests/browser/alien-base-archive-v1.fixture.tsx')],bundle:true,write:false,outdir:path.join(root,'outputs/qa-alien-archive-build'),format:'esm',platform:'browser',jsx:'automatic',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'test-image',setup(b){
 b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'test-image'}));
 b.onLoad({filter:/.*/,namespace:'test-image'},()=>({contents:`import React from 'react'; export default function Image({unoptimized,priority,fill,...props}) {return React.createElement('img',props);}`,loader:'js',resolveDir:root}));
}}]});
const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=compiled.outputFiles.find(f=>f.path.endsWith('.css'))?.contents??'';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(js);}
 else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(css);}
 else if(req.url.startsWith('/game/')){res.setHeader('Content-Type','image/png');res.end(pixel);}
 else if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Alien Base QA</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');}
 else {res.writeHead(404);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`,errors=[],external=[];
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:{})});
 const ctx=await browser.newContext({viewport:{width:1200,height:900}});
 await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();external.push(r.request().url());return r.abort();});
 const page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);
 await page.getByRole('heading',{name:'Écosystèmes planétaires'}).waitFor();
 const archive=page.getByRole('complementary',{name:'Dossiers Xénomorphes'});
 await archive.waitFor();assert.equal(await archive.locator('li').count(),6);
 for(const name of ['Ovomorphe / œuf','Facehugger','Chestburster','Adulte de 1979 · Big Chap','Adulte nervuré · guerrier','Reine xénomorphe'])assert.equal(await archive.getByText(name,{exact:true}).count(),1,name);
 const hrefs=await archive.locator('a').evaluateAll(as=>as.map(a=>({href:a.href,rel:a.rel,target:a.target})));
 assert.equal(hrefs.length,6);assert.ok(hrefs.every(a=>a.href.startsWith('https://www.20thcenturystudios.com/movies/')&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')&&a.target==='_blank'));
 assert.equal(await page.locator('.enemy-bestiary-count').textContent(),'0 / 30 identifiées');
 assert.equal(await page.locator('.enemy-bestiary-grid article').count(),30);
 await page.getByRole('button',{name:'Communes · 6'}).click();assert.equal(await page.locator('.enemy-bestiary-grid article').count(),6);assert.equal(await archive.locator('li').count(),6);
 const identities=page.locator('[data-alien-base-hunter-link]');assert.ok(await identities.count()>0,'Jungle Hunter central ID visible');
 const ids=await identities.evaluateAll(ns=>ns.map(n=>n.getAttribute('data-alien-base-hunter-link')));assert.ok(ids.some(id=>id.includes('character.yautja.jungle_hunter')));
 assert.equal(await page.evaluate(()=>localStorage.length),0,'reference panels must not write local save');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'no third-party fetch');
 console.log('PASS six reference-only records, real bestiary/filter, read-only hunter identity, no save writes or external fetch; Chromium '+browser.version());
 await ctx.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
