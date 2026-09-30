import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=process.cwd(),output=path.resolve('work-local/v63/qa/rig');
await fs.mkdir(output,{recursive:true});
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import {HunterRigPreview} from './app/game/HunterRigPreview';
import HomeworldModularHunter from './app/game/HomeworldModularHunter';
const root=createRoot(document.querySelector('#root'));
window.show=({morph='classic',headStyleId='reference',dreadStyleId='classic',pose='idle',facing=1,phase=.3}={})=>{
const appearance={presetId:'custom',bodyMorphId:morph,headStyleId,skinId:'ochre-mottle',biomaskId:null,dreadStyleId,dreadTintId:'obsidian',armorStyleId:morph==='feral'?'feral':'classic',armorTintId:'gunmetal',trophyAdornmentId:'none',laserColorId:'crimson'};
root.render(<><h1>V63 · {morph} / {headStyleId} / {dreadStyleId} / {pose} / {facing}</h1><section><div><h2>Rig articulé</h2><HunterRigPreview appearance={appearance} armorId='hunter' weaponIds={[]} gearIds={[]} size={384} maskWorn={false} pose={pose} facing={facing} phase={phase} speed={pose==='run'?420:0}/></div><div><h2>Homeworld · même tête et attaches</h2><HomeworldModularHunter morphId={morph} dreadStyleId={dreadStyleId} className='home' appearance={appearance} speed={pose==='run'?420:0} motionPhase={phase}/></div></section></>);};window.show();`;
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
for(const morph of ['classic','elder','super','feral','huntress','young']) for(const headStyleId of ['reference','legacy-clan']) for(const facing of [1,-1]) scenarios.push({morph,headStyleId,facing,dreadStyleId:'classic',pose:'idle'});
const profiles=JSON.parse(await fs.readFile('app/game/data/hunterDreadProfilesV63.json','utf8'));
for(const [i,dreadStyleId] of Object.keys(profiles).entries())for(const pose of ['run','crouch','jump'])scenarios.push({morph:i%2?'super':'feral',headStyleId:i%2?'legacy-clan':'reference',dreadStyleId,pose,facing:i%2?-1:1});
for(const [index,scenario] of scenarios.entries()){
await page.evaluate(s=>window.show(s),scenario);
await page.waitForFunction(s=>{const d=document.querySelector('[data-hunter-rig]')?.dataset;return d?.bodyMorph===s.morph&&d?.pose===s.pose&&d?.headStyle===s.headStyleId;},scenario);
await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode()));await new Promise(requestAnimationFrame);});
const sample=await page.evaluate(()=>{const rig=document.querySelector('[data-hunter-rig]'),head=rig.querySelector('[data-rig-slot="body-head"]'),home=document.querySelector('[data-homeworld-body-part="head"]');
return {head:head.getAttribute('src'),home:home.getAttribute('src'),contacts:[...document.querySelectorAll('[data-dread-collisions]')].map(e=>Number(e.dataset.dreadCollisions)),legacyHeadNet:!!rig.querySelector('[data-rig-slot="net-head"]'),loaded:[...document.images].every(i=>i.complete&&i.naturalWidth>0)};});
assert(sample.loaded);assert.match(sample.head,scenario.headStyleId==='reference'?/\/v62\/heads\//:/\/body\/[^/]+\/parts\/head\.webp$/);assert.equal(sample.home,sample.head);assert.equal(sample.legacyHeadNet,false);assert.equal(sample.contacts.length,14);assert(sample.contacts.every(c=>c===0));
const capture=path.join(output,String(index).padStart(2,'0')+'-'+scenario.morph+'-'+scenario.headStyleId+'-'+scenario.dreadStyleId+'-'+scenario.pose+'-'+scenario.facing+'.png');await page.screenshot({path:capture});checks.push({...scenario,...sample,capture:path.relative(root,capture)});
}
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await fs.writeFile('docs/v63-rig-composition-qa.json',JSON.stringify({status:'PASS',scope:'48 isolated browser compositions; collision counts cover measured 2D skull/neck/torso volumes, not a 3D mesh simulation. No user save changed.',checks,errors,requests,visualInspection:'pending'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',scenarios:checks.length,output}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
