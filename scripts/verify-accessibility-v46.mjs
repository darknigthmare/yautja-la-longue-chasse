import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const baseline=process.argv.includes('--baseline');
const output=process.env.V46_ACCESSIBILITY_OUTPUT||'work/v46/accessibility';
await fs.mkdir(output,{recursive:true});
const code=`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Menu,{CampaignSavePanel} from './app/game/CampaignMainMenu';
import Selection from './app/game/PitSelectionFlow';
const checkpoint={id:'manual-1',kind:'manual',index:1,label:'La première chasse',savedAt:'2026-09-23T12:00:00Z',hasActiveHunt:false,playTimeSeconds:120,resumeLocation:'deck'};
const slot={id:1,status:'ready',revision:5,ownerCreatedAt:'2026-09-23T12:00:00Z',hunterName:'Chasseuse QA',checkpoints:[checkpoint],lastCheckpointId:'manual-1'};
const catalog={activeSlotId:1,slots:[slot,...[2,3,4,5].map(id=>({id,status:'empty',revision:0,ownerCreatedAt:null,hunterName:null,checkpoints:[],lastCheckpointId:null}))]};
const noop=()=>{};
function App(){
 const view=new URL(location.href).searchParams.get('view');
 const [player,onPlayerChange]=useState('jungle-hunter'),[rival,onOpponentChange]=useState('city-hunter'),[arena,onArenaChange]=useState('temple'),[playerVariant,onPlayerVariantChange]=useState(null),[opponentVariant,onOpponentVariantChange]=useState(null);
 if(view==='pit')return <Selection playerId={player} opponentId={rival} arenaId={arena} playerVariantId={playerVariant} opponentVariantId={opponentVariant} onPlayerVariantChange={onPlayerVariantChange} onOpponentVariantChange={onOpponentVariantChange} mode="cpu" locked={false} imposed={false} eventOnly={false} playerPreview={<article><h3>Joueur</h3></article>} opponentPreview={<article><h3>Rival</h3></article>} onPlayerChange={onPlayerChange} onOpponentChange={onOpponentChange} onArenaChange={onArenaChange} onLaunch={noop} onExit={noop} launchLabel="Combat" launchDisabled={false} reducedMotion={true} highContrast={false}/>;
 if(view==='save')return <CampaignSavePanel slot={slot} busy={false} message={null} onSave={noop} onMainMenu={noop}/>;
 return <Menu catalog={catalog} busy={false} message={null} onRefresh={noop} onCreate={noop} onContinue={noop} onLoad={noop} onRecover={noop}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const bundle=await build({stdin:{contents:code,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,outdir:'bundle',platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const files=new Map(bundle.outputFiles.map(file=>['/'+path.basename(file.path),file.contents]));
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/stdin.css"><style>*{box-sizing:border-box}body{margin:0;background:#050706;color:#d9ccb0;font-family:Arial,sans-serif}button,input,select{font:inherit}</style><div id="root"></div><script src="/stdin.js"></script></html>';
const server=http.createServer(async(req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
 if(files.has(route)){res.setHeader('Content-Type',route.endsWith('.css')?'text/css':'text/javascript');res.end(files.get(route));return;}
 const file=path.resolve('public','.'+route),root=path.resolve('public')+path.sep;
 if(!file.startsWith(root)){res.statusCode=403;res.end();return;}
 try{res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[];
const record=(name,passed,details)=>checks.push({name,passed,details});
let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);await page.getByRole('button',{name:/^Charger une partie/}).click();
 const checkpointButton=page.locator('[data-checkpoint-id="manual-1"]');
 await checkpointButton.click();await page.getByRole('button',{name:'Annuler',exact:true}).press('Escape');
 record('checkpoint-focus-return',await checkpointButton.evaluate(el=>el===document.activeElement),await page.locator(':focus').innerText());
 await checkpointButton.click();const cancel=page.getByRole('button',{name:'Annuler',exact:true});await cancel.focus();await page.keyboard.press('Shift+Tab');
 record('checkpoint-focus-trap',await page.getByRole('button',{name:'Confirmer le chargement',exact:true}).evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:640,height:280});await page.getByRole('dialog').waitFor();
 const modal=await page.getByRole('dialog').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,overflowY:s.overflowY,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight};});
 record('landscape-dialog-accessible',modal.top>=0&&modal.bottom<=modal.viewport&&(modal.scrollHeight<=modal.clientHeight||['auto','scroll'].includes(modal.overflowY)),modal);
 await page.getByRole('button',{name:'Confirmer le chargement',exact:true}).scrollIntoViewIfNeeded();
 record('landscape-dialog-actions-reachable',await page.getByRole('button',{name:'Confirmer le chargement',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 await page.screenshot({path:output+(baseline?'/baseline':'/fixed')+'-dialog-landscape.png'});
 await page.goto(url+'?view=save');await page.locator('[data-manual-save="1"]').click();
 record('save-confirmation-focus',await page.getByRole('button',{name:'Annuler le remplacement',exact:true}).evaluate(el=>el===document.activeElement));
 await page.getByRole('button',{name:'Annuler le remplacement',exact:true}).press('Escape');
 record('save-confirmation-escape',await page.getByRole('button',{name:'Annuler le remplacement',exact:true}).count()===0&&await page.locator('[data-manual-save="1"]').evaluate(el=>el===document.activeElement));
 await page.close();
 page=await browser.newPage({viewport:{width:320,height:568},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url+'?view=pit');await page.locator('[data-pit-roster-total]').waitFor();
 const transition=await page.locator('[data-choice-id="jungle-hunter"]').evaluate(el=>getComputedStyle(el).transitionDuration);
 record('in-game-reduced-motion',transition.split(',').every(s=>parseFloat(s)===0),transition);
 const controls=await page.locator('[data-selection-side] button,[data-pit-roster-page-next],[data-pit-roster-search],[data-pit-variant-select]').evaluateAll(elements=>elements.map(el=>({label:el.getAttribute('aria-label')||el.innerText,height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)})));
 record('touch-targets-at-least-44px',controls.every(control=>control.height>=44),controls);
 const entryFonts=await page.locator('[data-pit-roster-search],[data-pit-variant-select]').evaluateAll(elements=>elements.map(el=>parseFloat(getComputedStyle(el).fontSize)));
 record('touch-entry-legibility',entryFonts.every(size=>size>=16),entryFonts);
 record('roster-no-horizontal-overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[data-pit-roster-search]').fill('ahab');await page.locator('[data-pit-roster-search]').press('Tab');await page.keyboard.press('Tab');
 record('filtered-roster-keyboard-entry',await page.locator('[data-choice-id="user-ahab"]').evaluate(el=>el===document.activeElement));
 await page.screenshot({path:output+(baseline?'/baseline':'/fixed')+'-roster-mobile.png'});
 await page.goto(url);await page.getByRole('button',{name:/^Nouvelle partie/}).click();await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 // The full-screen archive now scrolls internally. Reach the field normally before measuring it.
 const campaignName=page.getByRole('textbox',{name:'Nom du chasseur'});
 await campaignName.scrollIntoViewIfNeeded();
 const campaignLayout=await page.evaluate(()=>{const menu=document.querySelector('[data-campaign-menu]');return{width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,menuWidth:menu.clientWidth,menuScrollWidth:menu.scrollWidth,menuScrollLeft:menu.scrollLeft};});
 record('campaign-text-200-percent-no-overflow',campaignLayout.documentWidth<=campaignLayout.width&&campaignLayout.menuScrollWidth<=campaignLayout.menuWidth,campaignLayout);
 const campaignNameBounds=await campaignName.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,hit:el===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)};});
 record('campaign-name-within-screen',campaignNameBounds.left>=0&&campaignNameBounds.right<=campaignNameBounds.width&&campaignNameBounds.top>=0&&campaignNameBounds.bottom<=campaignNameBounds.height&&campaignNameBounds.hit,campaignNameBounds);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:output+(baseline?'/baseline':'/fixed')+'-campaign-text-200.png',fullPage:true});
 const report={profile:'Small-screen, keyboard and reduced-motion player',baseline,checkedAt:new Date().toISOString(),surface:'Real React components bundled into isolated browser fixture; campaign storage callbacks mocked; no full-game or physical iOS certification.',checks,errors,passed:checks.every(check=>check.passed)&&errors.length===0};
 await fs.writeFile(output+(baseline?'/baseline-report.json':'/report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(!baseline){assert.deepEqual(errors,[]);assert.deepEqual(checks.filter(check=>!check.passed),[]);}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
