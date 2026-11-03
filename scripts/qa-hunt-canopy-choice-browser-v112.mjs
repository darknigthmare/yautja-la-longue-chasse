#!/usr/bin/env node
/** ROU112-06 functional attempt. GameClient owns the canonical admission;
 * only a read-only observation function is injected into HuntCanvas.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

assert.notEqual(process.env.SITES_MANAGED_LINUX_CONTAINER,'1','Managed Sites requires its supported CUA preview; this runner is portable only.');
const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2),option=(key,fallback)=>argv.includes(key)?argv[argv.indexOf(key)+1]:fallback;
const out=path.resolve(root,option('--output','outputs/qa-hunt-canopy-choice-v112'));
const sharedCache=path.resolve(root,option('--shared-cache','outputs/qa-hunt-campaign-browser-v112/source-cache'));
const budget=Number(option('--wall-seconds','420'));
assert.ok(budget>0&&budget<=1800);
await mkdir(out,{recursive:true});
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const source=await readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8');
const bootstrap=await build({stdin:{contents:'export {defaultSave,SAVE_STORAGE_KEY} from "./app/game/save";export {GALAXY_NAVIGATION} from "./app/game/galaxyNavigation";',resolveDir:root,loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent'});
const mod={exports:{}};runInNewContext(bootstrap.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url)});
const admission=mod.exports.defaultSave('2026-11-02T00:00:00.000Z'),storageKey=mod.exports.SAVE_STORAGE_KEY;
const route=mod.exports.GALAXY_NAVIGATION.sectors.flatMap(sector=>sector.systems.flatMap(system=>system.bodies.flatMap(body=>body.missions.map(mission=>({sector,system,body,mission}))))).find(r=>r.mission.id==='jungle-vey');
assert.ok(route);
const marker='    const fixedStep = 1 / 60;';assert.equal(source.split(marker).length,2);
const observer='    window.__observeCanopyChoiceV112 = () => ({ alive, missionId: mission.id, encounterRun, state: JSON.parse(JSON.stringify(game, (_key,value) => value instanceof Set ? [...value] : value)) });\n';
const bundle=await build({stdin:{contents:'import {createRoot} from "react-dom/client";import GameClient from "./app/game/GameClient";import "./app/globals.css";createRoot(document.getElementById("root")).render(<GameClient/>);',resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',outfile:'canopy.js',logLevel:'silent',external:['/game/*'],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'read-only-canopy-observer',setup(builder){
  builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),contents:(await postcss([tailwind({base:root})]).process(await readFile(args.path,'utf8'),{from:args.path})).css}));
  builder.onLoad({filter:/\/HuntCanvas\.tsx$/},()=>({loader:'tsx',resolveDir:path.join(root,'app/game'),contents:source.replace(marker,observer+marker)}));
}}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')),css=bundle.outputFiles.find(f=>f.path.endsWith('.css'));assert.ok(js&&css);
const report={schemaVersion:1,generatedAt:new Date().toISOString(),sourceCommit:revision,huntSourceSha256:hash(source),observerSha256:hash(observer),
  qualification:'ATTEMPT_ONLY',requirement:'ROU112-06',scope:'Functional route/support/flexible-grip guidance and positive-stamina rest choice, from canonical jungle insertion through real GameClient DOM/keyboard input. No novice/human-comprehension, physical-input, performance or full-campaign qualification.',
  admission:{kind:'exact legacy defaultSave; native migration and launch controls',sha256:hash(admission),save:admission},
  inputTimestampSemantics:'elapsed records the most recent decision observation, not the exact browser event-dispatch clock; rendering and screenshots can advance native simulation before dispatch.',
  display:{viewport:{width:1280,height:900},deviceScaleFactor:1,captureMode:'fullPage; visible document content may extend beyond the viewport'},
  inputs:[],samples:[],captures:[],events:[],assetRequests:[],errors:[],criteria:{},limits:['No five-novice study','No human understanding claim','No physical controller or phone qualification','No performance claim']};
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const tracked=new Map(execFileSync('git',['ls-tree','-r',revision,'--','public'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim().split('\n').filter(Boolean).map(line=>{const [meta,name]=line.split('\t');return [name,meta.split(' ')[2]];}));
const requests=new Map(),pending=new Map();
async function asset(pathname){
  if(!pending.has(pathname))pending.set(pathname,(async()=>{
    const oid=tracked.get('public'+pathname);if(!oid)throw new Error('untracked asset '+pathname);
    let bytes,origin='public';
    try{bytes=await readFile(path.join(root,'public',pathname));}catch{
      origin='shared-cache';try{bytes=await readFile(path.join(sharedCache,pathname));}catch{
        origin='exact-git-blob';bytes=execFileSync('git',['cat-file','blob',oid],{cwd:root,maxBuffer:64*1024*1024});
      }
    }
    const actual=createHash(oid.length===64?'sha256':'sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.equal(actual,oid,'asset identity '+pathname);
    requests.set(pathname,{url:pathname,status:200,origin,gitBlob:oid,bytes:bytes.length,sha256:hash(bytes)});return bytes;
  })());
  return pending.get(pathname);
}
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja — canopy choice observation</title><link rel="stylesheet" href="/canopy.css"><body><div id="root"></div><script src="/canopy.js"></script></body></html>';
const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  if(pathname==='/canopy.js'||pathname==='/canopy.css'){res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'text/javascript':'text/css'}).end(pathname.endsWith('.js')?js.contents:css.contents);return;}
  if(pathname.includes('..'))throw new Error('invalid path');
  const bytes=await asset(pathname);res.writeHead(200,{'Content-Type':mime[path.extname(pathname)]??'application/octet-stream'}).end(bytes);
}catch(error){requests.set(req.url,{url:req.url,status:404,error:String(error)});res.writeHead(404).end();}});
let browser,context,page;
const held=new Set(),keys={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'Space',cloak:'KeyC',heal:'KeyH',scan:'KeyV',melee:'KeyJ'};
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),headless:true,args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  await context.addInitScript(({save,key})=>{if(localStorage.length===0)localStorage.setItem(key,JSON.stringify(save));},{save:admission,key:storageKey});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push(String(error)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.bringToFront();
  const capture=async name=>{const bytes=await page.screenshot({fullPage:true,animations:'disabled'});await writeFile(path.join(out,name+'.png'),bytes);report.captures.push({file:name+'.png',sha256:hash(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});};
  const observation=()=>page.evaluate(()=>window.__observeCanopyChoiceV112?.());
  const visibleGuide=()=>page.locator('[data-field-guide-v112]').innerText();
  const setHeld=async(actions,elapsed,reason)=>{const wanted=new Set(actions);for(const a of held)if(!wanted.has(a)){await page.keyboard.up(keys[a]);held.delete(a);report.inputs.push({elapsed,type:'keyup',action:a,reason});}for(const a of wanted)if(!held.has(a)){await page.keyboard.down(keys[a]);held.add(a);report.inputs.push({elapsed,type:'keydown',action:a,reason});}};
  const press=async(action,elapsed,reason)=>{await page.keyboard.press(keys[action]);report.inputs.push({elapsed,type:'press',action,reason});};
  await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
  const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});if(await shortcuts.getAttribute('aria-expanded')!=='true')await shortcuts.click();
  const direct=page.getByText('Accès direct aux interfaces · sans déplacement du chasseur',{exact:true});if(await direct.locator('..').getAttribute('open')===null)await direct.click();
  await page.getByRole('button',{name:/^NAVIGATION.*Ouvrir l’interface/}).first().click();
  const galaxy=page.locator('.galaxy-v10-breadcrumbs button').first();if(await galaxy.isEnabled())await galaxy.click();
  for(const label of [route.sector.name,route.system.name,route.body.name]){
    await page.locator('.galaxy-v10-spatial-map button').filter({hasText:label}).first().click();await page.getByRole('button',{name:'Entrer',exact:true}).click();
  }
  await page.getByRole('button',{name:route.mission.title,exact:false}).first().click();
  await page.getByRole('button',{name:/^Préparer (la chasse|cette revisite)$/}).click();await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
  await page.getByRole('button',{name:'Commencer la chasse',exact:true}).click();await page.locator('canvas').last().focus();
  await page.waitForFunction(()=>{const o=window.__observeCanopyChoiceV112?.();return o?.alive&&o.state.elapsed>0;});
  const initial=await observation();report.initial=initial;
  const rests=initial.state.world.platforms.filter(p=>p.id.startsWith('v112-canopy-jungle-vey-0-')).sort((a,b)=>a.x-b.x);
  assert.ok(rests.length>1,'authored canopy rests required');
  const rest=rests[0],support=initial.state.world.climbables.find(s=>s.id===rest.id.replace('-rest','-grip'));
  const flexible=initial.state.world.climbables.find(s=>s.id===rests[1].id.replace('-rest','-grip'));
  assert.ok(support&&flexible&&['vine','rope','chain'].includes(flexible.kind));
  report.authoredTarget={rest,support,flexible,route:initial.state.world.routes.find(r=>r.id==='canopy-transfer')};
  await page.locator('[data-field-guide-v112] summary').click();report.guideExpanded=await visibleGuide();await capture('01-canonical-insertion-guide');
  await page.locator('[data-field-guide-v112] summary').click();await page.locator('canvas').last().focus();
  await press('cloak',initial.state.elapsed,'native finite-energy camouflage during ground approach');
  let stage='approach',lastSample=-1,chosen=null,landed=null,lastHeal=-100,minimumStamina=Infinity,restStart=null;
  const started=Date.now();
  while(Date.now()-started<budget*1000){
    const observed=await observation();if(!observed?.alive)break;
    const g=observed.state,p=g.player;minimumStamina=Math.min(minimumStamina,p.stamina);
    if(Math.floor(g.elapsed*5)!==lastSample){lastSample=Math.floor(g.elapsed*5);report.samples.push({elapsed:g.elapsed,stage,phase:g.phase,paused:g.paused,player:p,activeEnemyIds:g.enemies.filter(e=>e.active&&e.alive).map(e=>e.id),guide:await page.locator('[data-guide-cue-v112]').innerText()});
      await writeFile(path.join(out,'progress.json'),JSON.stringify({stage,elapsed:g.elapsed,player:p,target:report.authoredTarget},null,2)+'\n');}
    if(g.phase==='dead'||g.phase==='finished')break;
    if(g.paused){await setHeld([],g.elapsed,'release after native pause');await press('scan',g.elapsed,'no progress while paused');break;}
    if(p.health<p.maxHealth*.5&&p.medicomps>0&&p.healCooldown<=0&&g.elapsed-lastHeal>1){await press('heal',g.elapsed,'native finite Medicomp');lastHeal=g.elapsed;}
    if(stage==='approach'){
      const dx=support.x+support.width/2-(p.x+p.width/2);
      if(Math.abs(dx)<9){await setHeld(['up'],g.elapsed,'grasp the actual entry tree');stage='climb';report.events.push({kind:'entry-tree-approach',elapsed:g.elapsed,player:p});}
      else await setHeld([dx>0?'right':'left'],g.elapsed,'walk canonical ground to authored entry');
    }else if(stage==='climb'){
      await setHeld(['up'],g.elapsed,'native ascent toward first authored rest');
      if(p.climbing&&p.climbZoneId===support.id&&p.y+p.height<=rest.y-20){
        await setHeld([],g.elapsed,'choose rest before exhaustion');chosen={elapsed:g.elapsed,player:p,guide:await visibleGuide()};report.events.push({kind:'rest-chosen-before-exhaustion',...chosen});await capture('02-rest-choice-positive-stamina');
        await setHeld(['right'],g.elapsed,'directional release from rigid entry tree');stage='release';
      }
    }else if(stage==='release'){
      if(!p.climbing){await setHeld([],g.elapsed,'stop horizontal input above the real branch');stage='land';}
    }else if(stage==='land'){
      if(p.grounded&&Math.abs(p.y+p.height-rest.y)<2&&p.x+p.width>rest.x&&p.x<rest.x+rest.width){
        landed={elapsed:g.elapsed,player:p,guide:await visibleGuide()};report.events.push({kind:'native-rest-contact',...landed});restStart={elapsed:g.elapsed,stamina:p.stamina};stage='recover';await capture('03-authored-branch-contact');
      }else if(p.grounded&&Math.abs(p.y+p.height-g.world.floorY)<2){report.events.push({kind:'landed-ground-instead-of-rest',elapsed:g.elapsed,player:p});break;}
    }else if(stage==='recover'){
      await setHeld([],g.elapsed,'voluntary recovery on the authored branch');
      if(g.elapsed-restStart.elapsed>=.5){
        report.restRecovery={before:restStart,after:{elapsed:g.elapsed,stamina:p.stamina,player:p},sameBranch:p.grounded&&Math.abs(p.y+p.height-rest.y)<2};
        await page.locator('[data-field-guide-v112] summary').click();report.finalGuideExpanded=await visibleGuide();await capture('04-rest-recovery-route-support-flexible-guide');stage='done';break;
      }
    }
    await page.waitForTimeout(35);
  }
  await setHeld([],report.samples.at(-1)?.elapsed??0,'end of attempt');
  report.final=await observation();report.minimumObservedStamina=minimumStamina;report.terminalStage=stage;
  const guide=report.finalGuideExpanded??report.guideExpanded??'';
  report.criteria={canonicalInsertion:Math.abs(initial.state.player.x-initial.state.world.spawn.x)<2&&initial.state.enemies.length>0,
    routeGuidanceVisible:/route au sol/i.test(guide),supportGuidanceVisible:/Prendre appui|plateformes de repos/i.test(guide),flexibleGuidanceVisible:/support souple|liane/i.test(guide),
    chosenWhilePositiveStamina:!!chosen&&chosen.player.stamina>0,authoredBranchContact:!!landed&&landed.player.stamina>0,
    nativeRestRecovery:!!report.restRecovery?.sameBranch&&report.restRecovery.after.stamina>report.restRecovery.before.stamina,
    neverObservedExhausted:minimumStamina>0};
  report.qualification=Object.values(report.criteria).every(Boolean)&&report.errors.length===0?'FUNCTIONAL_NATIVE_BROWSER_PASS':'ATTEMPT_ONLY';
  await capture('05-terminal-native-scene');report.browser=browser.version();report.wallSeconds=(Date.now()-started)/1000;
}catch(error){report.failure=String(error.stack??error);if(page)try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}catch{/* preserve cause */}}
finally{
  report.assetRequests=[...requests.values()];report.assetFailures=report.assetRequests.filter(r=>r.status!==200);
  if(report.assetFailures.length)report.qualification='ATTEMPT_ONLY';
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({qualification:report.qualification,criteria:report.criteria,failure:report.failure,report:path.join(out,'report.json')}));
if(report.failure)process.exitCode=1;
