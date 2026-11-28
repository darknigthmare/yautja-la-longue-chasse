
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import {build} from 'esbuild';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const runtime=homeworldSceneSsrV78();
const {defaultSave,SAVE_STORAGE_KEY}=runtime.load('app/game/save.ts');
const {HOMEWORLD_BUILDINGS_V77}=runtime.load('app/game/systems/homeworldWorldV77.ts');
const {homeworldBuildingDoorwayV64}=runtime.load('app/game/systems/homeworldGeometryV64.ts');
const {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64,nearestHomeworldInteriorTargetV64}=runtime.load('app/game/systems/homeworldInteriorsV64.ts');
const {resolveHomeworldLocationV77}=runtime.load('app/game/systems/homeworldLocationV77.ts');
const {homeworldCivicWalkableV80}=runtime.load('app/game/systems/homeworldCivicWorldV80.ts');

const out=path.resolve('outputs/qa-montures-forges');
fs.mkdirSync(out,{recursive:true});
const report={scope:'Desktop application GameClient, actual Forge counter, real campaign writer. Starting adult campaign at a valid forge interior position; rank and 10000 marks are declared fixtures.',checks:[],errors:[],sourceCommit:process.env.MOBILITY_QA_COMMIT};
const check=(name,value)=>{assert(value,name);report.checks.push(name);console.log('PASS',name);};
const field=runtime.load('app/game/systems/mobility/mountExpeditionsV153.ts');
const catalogue=runtime.load('app/game/systems/mobility/catalogue.ts');
const seed=defaultSave('2026-11-28T11:00:00.000Z');
seed.profile={...seed.profile,hunterName:'QA parcours des montures',honor:300,rankId:'blooded',acquiredRankIdV166:'blooded',clanMarks:10000};
seed.settings.masterVolume=0;
const building=HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='deep-forge');
const {approach,normal}=homeworldBuildingDoorwayV64(building);
const room=homeworldInteriorForBuildingV64(building.id);
const counter=room.points.find(p=>p.pointId==='forge-service');
const local=[...[40,48,56,60].flatMap(radius=>Array.from({length:32},(_,i)=>{
 const angle=2*Math.PI*i/32;
 return {x:counter.x+radius*Math.cos(angle),y:counter.y+radius*Math.sin(angle)};
}))].find(p=>isHomeworldInteriorWalkableV64(room,p,{halfWidth:32,halfDepth:22})&&nearestHomeworldInteriorTargetV64(room,p)?.pointId==='forge-service');
const exterior=[0,8,16,24,32].map(n=>({x:approach.x+(normal?.x??0)*n,y:approach.y+(normal?.y??1)*n})).find(p=>homeworldCivicWalkableV80(building.levelId,p));
assert(local && exterior);
seed.homeworld.locationV77={version:1,layoutRevision:1,ownerCreatedAt:seed.createdAt,levelId:building.levelId,exterior,interiorId:building.id,local};
assert.equal(resolveHomeworldLocationV77(seed.homeworld.locationV77,seed.createdAt).interiorId,building.id);
report.start=seed.homeworld.locationV77;

const server=await createServer({configFile:path.resolve('desktop/vite.config.ts'),server:{host:'127.0.0.1',port:4273,strictPort:true}});
let browser,page;
try {
 await server.listen();
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 page=await context.newPage();
 page.setDefaultTimeout(35000);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('http://127.0.0.1:4273/',{waitUntil:'networkidle',timeout:90000});
 const checkpointModule=await build({
  stdin:{contents:"export {migrateLegacyCampaignSlot,saveCampaignCheckpoint,loadCampaignSlots} from './app/game/systems/campaignSlots.ts';",resolveDir:process.cwd()},
  bundle:true,write:false,format:'iife',globalName:'__qaCampaignCheckpoint',platform:'browser',
 });
 await page.addScriptTag({content:checkpointModule.outputFiles[0].text});
 const checkpoint=await page.evaluate(async({save,key})=>{
  localStorage.setItem(key,JSON.stringify(save));
  const migration=await window.__qaCampaignCheckpoint.migrateLegacyCampaignSlot();
  if(!migration.ok)throw Error(migration.message);
  const catalog=window.__qaCampaignCheckpoint.loadCampaignSlots();
  const result=await window.__qaCampaignCheckpoint.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:catalog.slots[0].revision});
  if(!result.ok)throw Error(result.message);
  return result.checkpoint.resumeLocation;
 },{save:seed,key:SAVE_STORAGE_KEY});
 check('The actual campaign slot was checkpointed at Homeworld',checkpoint==='homeworld');
 await page.reload({waitUntil:'networkidle'});
 const stored=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SAVE_STORAGE_KEY);
 const shot=async(name)=>page.screenshot({path:path.join(out,name),fullPage:true});
 async function enter(){
  await page.locator('[data-campaign-menu]').waitFor({timeout:90000});
  const campaign=page.locator('[data-menu-section="campaign"]');
  if(await campaign.isVisible())await campaign.click();
  await page.locator('[data-menu-action="continue"]').click();
  await page.locator('[data-campaign-session]').waitFor({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('[data-homeworld-hub][data-homeworld-motion-ready="true"]')||document.body.innerText.includes('Sprites indisponibles'),null,{timeout:90000});
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-motion-ready'),'true');
  check('GameClient resumed at the real Forge interior',await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id')==='deep-forge');
  await page.locator('[data-homeworld-interior-target="point"]').click();
  await page.locator('[data-mobility-forge-entry]').waitFor();
  await page.getByRole('button',{name:'Ouvrir le comptoir et le garage',exact:true}).click();
  await page.locator('[data-mobility-garage]').waitFor();
  await page.bringToFront();
 }
 await enter();
 await shot('forge-counter.png');


 const find=name=>page.getByRole('button',{name,exact:true});
 const yard=page.locator('[data-mount-ride-yard]');
 const chosen=async id=>{
  await page.locator('#mobility-filter').selectOption('mount');
  await page.locator('[data-mobility-model="'+id+'"]').click();
  const panel=page.locator('[data-mount-panel="'+id+'"]');
  await panel.waitFor();
  return panel;
 };
 const stepTo=async (panel,position)=>{
  const route=panel.locator('[data-mount-expedition]');
  while(Number(await route.getAttribute('data-field-position'))<position){
   await route.locator('[data-mount-field-step="forward"]').click();
  }
  return route;
 };
 check('Campaign starts without generated mounts',!(await stored()).mountsV153);
 for(const [index,id] of field.MOUNT_EXPEDITION_IDS_V153.entries()){
  const panel=await chosen(id),spec=field.mountExpeditionV153(id),name=catalogue.mobilityDefinition(id).name;
  await panel.locator('[data-mount-begin]').click();
  await panel.locator('[data-mount-expedition]').waitFor();
  check(name+' can begin and opens without a claim',await panel.getByRole('button',{name:'Confirmer le recrutement de '+name,exact:true}).count()===0);
  await page.waitForFunction(path=>Array.from(document.images).some(img=>img.getAttribute('src')===path&&img.naturalWidth===1536),spec.portrait);
  let route=await stepTo(panel,spec.stages[0].position);
  await route.locator('[data-mount-field-choice="'+spec.stages[0].options[1].id+'"]').click();
  check(name+' rejects a forbidden action and retreats to the start',(await stored()).mountsV153.trial.fieldAt===0);
  for(const stage of spec.stages){
   route=await stepTo(panel,stage.position);
   await route.locator('[data-mount-field-choice="'+stage.options[0].id+'"]').click();
  }
  await shot(id+'-preuve.png');
  await panel.getByRole('button',{name:'Confirmer le recrutement de '+name,exact:true}).click();
  await panel.locator('[data-mount-recruited="'+id+'"]').waitFor();
  const owned=await stored();
  check(name+' is owned only after the three physical posts',owned.mountsV153.mounts.length===index+1&&
   owned.mountsV153.mounts[index].id===id&&owned.mountsV153.mounts[index].proof.eventIds.length===3&&owned.mountsV153.mounts[index].bond===0&&
   owned.profile.clanMarks===10000&&await panel.locator('[data-mount-ride-start]').isDisabled());
 }
 const forward=seed.settings.controlBindings['hunt.moveUp'][0];
 const travel=async(before)=>{
  await find('Reprendre la chevauchée').click();
  await page.keyboard.down(forward);
  try {
   await page.waitForFunction(({id,x})=>{
    const track=document.querySelector('[data-mount-ride-yard]');
    return track?.dataset.rideId===String(id)&&Number(track.dataset.x)>x+18;
   },{id:before.id,x:before.course.x});
  } finally { await page.keyboard.up(forward); }
  await find('Pause et enregistrer').click();
  await page.waitForFunction(()=>document.querySelector('[data-mount-ride-yard]')?.dataset.paused==='true');
  return (await stored()).mountRidesV156.active;
 };
 for(const id of field.MOUNT_EXPEDITION_IDS_V153){
  let panel=await chosen(id);
  const name=catalogue.mobilityDefinition(id).name;
  for(let i=0;i<10;i++){
   await panel.getByRole('button',{name:'Ouvrir une séance de lien',exact:true}).click();
   for(let j=0;j<3;j++) await panel.locator('[data-mount-exercise="groundwork"]').click();
   await panel.getByRole('button',{name:'Clore la séance',exact:true}).click();
   await panel.getByRole('button',{name:/^Soigner \/ reposer · 5 marques$/}).click();
  }
  await panel.locator('[data-mount-ride-start]').click();
  await yard.waitFor();
  const initial=(await stored()).mountRidesV156.active;
  check(name+' is mounted after ten actual bond sessions',initial.mountId===id&&initial.bond===50&&await yard.getAttribute('data-paused')==='true');
  const paused=await travel(initial);
  check(name+' moves under real keyboard controls',paused.course.x>initial.course.x&&paused.course.fatigue>0&&
   await yard.locator('[data-mount-model="'+id+'"] image[data-mount-portrait]').count()===1);
  await shot(id+'-montee.png');
  await page.reload({waitUntil:'networkidle'});
  await enter();
  await yard.waitFor();
  check(name+' resumes from the exact position with the same mount',await yard.getAttribute('data-paused')==='true');
  assert.deepEqual((await stored()).mountRidesV156.active,paused);
  const second=await travel(paused);
  await find('Descendre et ramener en main').click();
  await find('Confirmer').click();
  panel=await chosen(id);
  const finished=await stored(), mount=finished.mountsV153.mounts.find(item=>item.id===id);
  check(name+' returns to the same detached stable record',finished.mountRidesV156.active===null&&
   finished.mountRidesV156.lastReport.mountId===id&&finished.mountRidesV156.lastReport.result==='recovered'&&mount.bond===50&&
   mount.fatigue===Math.ceil(second.course.fatigue));
 }
 const finished=await stored();
 check('Three genuine recruits survive alongside their archived trials',finished.mountsV153.completedTrials.length===2&&finished.mountsV153.mounts.length===3&&finished.profile.clanMarks===9850);
 assert.deepEqual(report.errors,[]);
 report.passed=true;
} catch(error) {
 report.errors.push(error.stack);
 report.visibleControls=await page?.getByRole('button').allTextContents().catch(()=>[])??[];
 console.error(error);
 if(page)report.visibleText=(await page.locator('body').innerText().catch(()=>'' )).slice(0,4000);
 console.error(JSON.stringify(report));
 if (page) await page.screenshot({path:path.join(out,'error.png'),fullPage:true}).catch(()=>{});
 process.exitCode=1;
} finally {
 fs.writeFileSync(path.join(out,'parcours-montures.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();
 await server.close();
}
