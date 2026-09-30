import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=process.cwd(),output=path.resolve('work-local/v62/qa/heads');
await fs.mkdir(output,{recursive:true});
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import {HunterRigPreview} from './app/game/HunterRigPreview';
import HomeworldModularHunter from './app/game/HomeworldModularHunter';
import {hunterHeadArtV62} from './app/game/hunterHeadArtV62';
import {REFERENCE_BIOMASKS_V62} from './app/game/biomaskCatalogueV62';
const root=createRoot(document.querySelector('#root'));
window.show=({morph='classic',mask=null,pose='idle',facing=1,phase=.3}={})=>{
const appearance={presetId:'jungle-hunter',bodyMorphId:morph,skinId:'ochre-mottle',biomaskId:mask,dreadStyleId:'classic',dreadTintId:'obsidian',armorStyleId:morph==='feral'?'feral':'classic',armorTintId:'gunmetal',trophyAdornmentId:'none',laserColorId:'crimson'};
root.render(<><h1>V62 — {morph} / {mask??'sans masque'} / {pose} / {facing}</h1><section><div><h2>Rig articulé</h2><HunterRigPreview appearance={appearance} armorId='hunter' weaponIds={[]} gearIds={[]} size={384} maskWorn={Boolean(mask)} pose={pose} facing={facing} phase={phase}/></div><div><h2>Homeworld · composition au repos</h2><HomeworldModularHunter morphId={morph} dreadStyleId='classic' className='home' appearance={appearance}/></div></section></>);
window.current={morph,mask,pose,facing,path:hunterHeadArtV62(morph).path};};window.referenceMasks=REFERENCE_BIOMASKS_V62.map(m=>m.id);window.show();`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
if(url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><meta charset="utf-8"><style>body{background:#252c31;color:#eee;font:14px system-ui;margin:20px}h1{font-size:20px}h2{font-size:16px}section{display:flex;gap:80px}.home{display:block;position:relative;width:384px;height:576px}</style><div id="root"></div><script src="/bundle.js"></script></html>');return;}
if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));if(!url.pathname.startsWith('/game/')||!file.startsWith(path.resolve(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],requests=[],checks=[];
try{const page=await browser.newPage({viewport:{width:1040,height:740},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});
await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
const scenarios=[];
for(const morph of ['classic','elder','super','feral','huntress','young']) for(const facing of [1,-1]) scenarios.push({morph,facing,mask:null,pose:'idle'});
for(const mask of await page.evaluate(()=>window.referenceMasks))for(const pose of ['idle','run','crouch','jump'])scenarios.push({morph:mask==='feral'?'feral':mask==='berserker'||mask==='falconer'?'super':'classic',mask,pose,facing:1});
for(const [index,scenario] of scenarios.entries()){
await page.evaluate(s=>window.show(s),scenario);
await page.waitForFunction(s=>document.querySelector('[data-hunter-rig]')?.dataset.bodyMorph===s.morph&&document.querySelector('[data-hunter-rig]')?.dataset.pose===s.pose&&document.querySelector('[data-hunter-rig]')?.dataset.mask===(s.mask??'off'),scenario);
await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode()));await new Promise(requestAnimationFrame);});
const sample=await page.evaluate(()=>{const rig=document.querySelector('[data-hunter-rig]'),head=rig.querySelector('[data-rig-slot="body-head"]'),home=document.querySelector('[data-homeworld-body-part="head"]');
const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {head:head.getAttribute('src'),home:home.getAttribute('src'),headRect:rect(head),rigRect:rect(rig),parentRect:rect(head.parentElement),parentTransform:getComputedStyle(head.parentElement).transform,legacyHeadNet:!!rig.querySelector('[data-rig-slot="net-head"]'),loaded:[...document.images].every(i=>i.complete&&i.naturalWidth>0)};});
assert(sample.loaded);assert.match(sample.head,/\/v62\/heads\//);assert.equal(sample.home,sample.head);assert.equal(sample.legacyHeadNet,false);assert(sample.headRect.width<sample.rigRect.width*.7,'head must not fill the entire body canvas');assert(sample.headRect.height<sample.rigRect.height*.45);
const capture=path.join(output,String(index).padStart(2,'0')+'-'+scenario.morph+'-'+(scenario.mask??'bare')+'-'+scenario.pose+'-'+scenario.facing+'.png');await page.screenshot({path:capture});checks.push({...scenario,...sample,capture:path.relative(root,capture)});
}
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await fs.writeFile('docs/v62-head-composition-qa.json',JSON.stringify({status:'PASS',scope:'Real React components in isolated browser compositor; not a campaign completion test.',checks,errors,requests},null,2)+'\n');console.log(JSON.stringify({status:'PASS',scenarios:checks.length,output}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
