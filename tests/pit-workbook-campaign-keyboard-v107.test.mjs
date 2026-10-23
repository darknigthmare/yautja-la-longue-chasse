import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

// Actual React component and native browser defaults. Only image loading and
// painting are stubbed: these tests exercise focus, bubbling, native click and
// the real field motor without starting a server or fabricating a match.
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {WorkbookExerciseField} from './app/game/PitWorkbookCampaignV107';
 import {createPitWorkbookCampaignRunV107,beginPitWorkbookCampaignStageV107} from './app/game/systems/pitWorkbookCampaignV107';
 const root=createRoot(document.getElementById('root'));let key=0;
 window.mountField=(fail=false)=>{window.artFails=fail;window.artLoads=0;window.exits=0;window.completed=0;
 const run=beginPitWorkbookCampaignStageV107(createPitWorkbookCampaignRunV107('scar','keyboard-owner','keyboard-run'));
 root.render(React.createElement(WorkbookExerciseField,{key:++key,run,highContrast:false,onComplete:()=>window.completed++,onExit:()=>window.exits++}));};
 `},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'field-native-keyboard-fixture',setup(build){
  build.onLoad({filter:/[/\\]PitWorkbookCampaignV107\.tsx$/},async args=>({contents:(await fs.readFile(args.path,'utf8'))+'\nexport {WorkbookExerciseField};',loader:'tsx'}));
  build.onResolve({filter:/^\.\/(PitCanvas|PitStagePreview|useMenuGamepad)$/},args=>({path:args.path,namespace:'unused-menu'}));
  build.onLoad({filter:/.*/,namespace:'unused-menu'},()=>({contents:'export default function Empty(){return null;} export function useMenuGamepad(){}',loader:'js'}));
  build.onResolve({filter:/\.module\.css$/},()=>({path:'styles',namespace:'field-styles'}));
  build.onLoad({filter:/.*/,namespace:'field-styles'},()=>({contents:'export default {};',loader:'js'}));
  build.onResolve({filter:/^\.\/pitCombatBitmapArt$/},()=>({path:'actors',namespace:'field-art'}));
  build.onResolve({filter:/^\.\/pitArenaRendering$/},()=>({path:'arena',namespace:'field-art'}));
  build.onLoad({filter:/.*/,namespace:'field-art'},args=>({loader:'js',contents:args.path==='actors'?`
   export async function loadPitCombatBitmapArt(){window.artLoads++;if(window.artFails)throw Error('Declared image failure');return {cancelled:false};}
   export function getPitCombatBitmapFighterArtStatus(){return 'ready';}export function drawPitCombatBitmapFighter(){}
  `:`export async function loadPitArenaArt(){return {};}export function isPitArenaArtBankReady(){return true;}export function drawPitArenaBackdrop(){}export function drawPitArenaForeground(){}`}));
 }}]});

test('native Enter/Space activate Pause, Resume, Briefing and Retry without becoming field input',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<main id="root"></main>');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(()=>window.mountField());
  const canvas=page.getByRole('img',{name:'Terrain interactif d’exercice et partenaires'}).or(page.locator('canvas[aria-label="Terrain interactif d’exercice et partenaires"]'));
  const frame=()=>canvas.evaluate(e=>Number(e.dataset.exerciseFrame));
  await page.getByRole('button',{name:'Pause',exact:true}).waitFor();await page.waitForFunction(()=>Number(document.querySelector('canvas')?.dataset.exerciseFrame)>1);
  await page.getByRole('button',{name:'Pause',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Reprendre',exact:true}).waitFor({timeout:2000});
  const paused=await frame();await page.waitForTimeout(100);assert.equal(await frame(),paused,'native Pause really stops the field clock');
  await page.getByRole('button',{name:'Reprendre',exact:true}).focus();await page.keyboard.press('Space');await page.getByRole('button',{name:'Pause',exact:true}).waitFor({timeout:2000});await page.waitForTimeout(100);assert((await frame())>paused,'native Resume restarts the field clock');
  await page.getByRole('button',{name:'Revenir au briefing',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.exits),1,'Briefing gets its native click');
  assert.equal(await canvas.getAttribute('data-exercise-hold-ticks'),'0','menu activation does not inject interaction');
  const x=Number(await canvas.getAttribute('data-exercise-x'));await page.getByRole('button',{name:'→',exact:true}).focus();await page.keyboard.down('Enter');await page.waitForTimeout(100);await page.keyboard.up('Enter');assert(Number(await canvas.getAttribute('data-exercise-x'))>x,'dedicated gameplay buttons retain their own keyboard hold');
  await page.evaluate(()=>window.mountField(true));await page.getByRole('button',{name:'Réessayer',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.artLoads),1);
  await page.evaluate(()=>{window.artFails=false;});await page.getByRole('button',{name:'Réessayer',exact:true}).focus();await page.keyboard.press('Space');await page.getByRole('button',{name:'Réessayer',exact:true}).waitFor({state:'detached',timeout:2000});await page.waitForFunction(()=>Number(document.querySelector('canvas')?.dataset.exerciseFrame)>0);assert.equal(await page.evaluate(()=>window.artLoads),2,'Retry runs the image loader again');
  assert.equal(await canvas.getAttribute('data-exercise-hold-ticks'),'0');assert.equal(await page.evaluate(()=>window.completed),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
