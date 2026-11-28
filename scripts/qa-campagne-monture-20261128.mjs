
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const runtime=homeworldSceneSsrV78();
const {defaultSave,SAVE_STORAGE_KEY}=runtime.load('app/game/save.ts');
const {HOMEWORLD_BUILDINGS_V77}=runtime.load('app/game/systems/homeworldWorldV77.ts');
const {homeworldBuildingDoorwayV64}=runtime.load('app/game/systems/homeworldGeometryV64.ts');
const {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64,nearestHomeworldInteriorTargetV64}=runtime.load('app/game/systems/homeworldInteriorsV64.ts');
const {resolveHomeworldLocationV77}=runtime.load('app/game/systems/homeworldLocationV77.ts');
const {homeworldCivicWalkableV80}=runtime.load('app/game/systems/homeworldCivicWorldV80.ts');

const out=path.resolve('outputs/qa-monture-campagne');
fs.mkdirSync(out,{recursive:true});
const report={scope:'Desktop application GameClient, actual Forge counter, real campaign writer. Starting adult campaign at a valid forge interior position; rank and 10000 marks are declared fixtures.',checks:[],errors:[],sourceCommit:process.env.MOBILITY_QA_COMMIT};
const check=(name,value)=>{assert(value,name);report.checks.push(name);console.log('PASS',name);};
const seed=defaultSave('2026-11-28T11:00:00.000Z');
seed.profile={...seed.profile,hunterName:'QA adoption Kha’Rha',honor:300,rankId:'blooded',acquiredRankIdV166:'blooded',clanMarks:10000};
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
 await context.addInitScript(({value,key})=>{
  if(!sessionStorage.getItem('qa-monture-campagne')){
   sessionStorage.setItem('qa-monture-campagne','yes');
   localStorage.setItem(key,JSON.stringify(value));
  }
 },{value:seed,key:SAVE_STORAGE_KEY});
 page=await context.newPage();
 page.setDefaultTimeout(35000);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('http://127.0.0.1:4273/',{waitUntil:'domcontentloaded'});
 const stored=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SAVE_STORAGE_KEY);
 const shot=async(name)=>page.screenshot({path:path.join(out,name),fullPage:true});
 async function enter(){
  await page.locator('[data-campaign-menu]').waitFor({timeout:90000});
  const campaign=page.locator('[data-menu-section="campaign"]');
  if(await campaign.isVisible())await campaign.click();
  await page.locator('[data-menu-action="continue"]').click();
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
 const panel=page.locator('[data-mount-panel="kha_rha"]');
 const selectMount=async()=>{
  await page.locator('#mobility-filter').selectOption('mount');
  await page.locator('[data-mobility-model="kha_rha"]').click();
  await panel.waitFor();
 };
 const atYard=page.locator('[data-mount-ride-yard]');
 const adopt=panel.locator('[data-mount-adoption="kha_rha"]');
 const startRide=panel.locator('[data-mount-ride-start]');
 await selectMount();
 check('No mount or mount ledger in adult starting save',!(await stored()).mountsV153);
 check('Purchase stays unavailable before proved confidence',await adopt.count()===0);
 await find('Approcher un jeune adulte').click();
 await find('Avancer torche allumée pour bien voir l’animal').click();
 check('Wrong approach misses proof and no money moves',(await stored()).mountsV153.trial.passed.length===0&&(await stored()).profile.clanMarks===10000);
 await find('Éteindre la torche et approcher de côté, à son allure').click();
 await find('Lui laisser sentir la trace, puis le suivre quand il la prend').click();
 await find('S’arrêter au repère, le laisser souffler, puis revenir au pas').click();
 await adopt.waitFor();
 await shot('adoption-proposed.png');
 await adopt.click();
 const owned=await stored();
 check('Adoption commits exactly one physical mount, 180 marks, and zero bond',
  owned.profile.clanMarks===9820&&owned.mountsV153.spentMarks===180&&owned.mountsV153.mounts.length===1&&
  owned.mountsV153.mounts[0].proof.adoptionMarks===180&&owned.mountsV153.mounts[0].bond===0&&!owned.mobilityV1);
 check('Receipt is visible; no second acquisition and cannot mount at zero bond',
  await panel.locator('[data-mount-adoption-receipt="180"]').isVisible()&&await adopt.count()===0&&await startRide.isDisabled());
 for(let i=0;i<10;i++){
  await find('Ouvrir une séance de lien').click();
  const groundwork=panel.locator('[data-mount-exercise="groundwork"]');
  for(let j=0;j<3;j++) {
   const before=(await stored()).mountsV153.revision;
   await groundwork.click();
   assert.equal((await stored()).mountsV153.revision,before+1);
  }
  await find('Clore la séance').click();
  await page.getByRole('button',{ name:/^Soigner \/ reposer · 5 marques$/ }).click();
 }
 const trained=await stored();
 check('All fifty bond points were earned through ten native UI sessions',
  trained.mountsV153.mounts[0].bond===50&&trained.mountsV153.mounts[0].sessions===10&&
  trained.mountsV153.mounts[0].fatigue===0&&trained.profile.clanMarks===9770);
 await startRide.click();
 await atYard.waitFor();
 check('Ride starts seated but saved in pause',await atYard.getAttribute('data-paused')==='true'&&(await stored()).mountRidesV156.active.bond===50);
 const initial=(await stored()).mountRidesV156.active;
 const forward=owned.settings.controlBindings['hunt.moveUp'][0];
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
 const paused=await travel(initial);
 check('Keyboard changed distance, position and persisted fatigue while riding',
  paused.course.distance>0&&paused.course.x>initial.course.x&&paused.course.fatigue>0);
 await shot('mounted-and-paused.png');
 await page.reload({waitUntil:'networkidle'});
 await enter();
 await atYard.waitFor();
 assert.deepEqual((await stored()).mountRidesV156.active,paused);
 check('Reload shows the identical persisted position in pause',
  await atYard.getAttribute('data-paused')==='true'&&Number(await atYard.getAttribute('data-x'))===Number(paused.course.x.toFixed(4)));
 const second=await travel(paused);
 check('The resumed animal rode further under the same ride id',second.id===initial.id&&second.course.distance>paused.course.distance);
 await find('Descendre et ramener en main').click();
 await find('Confirmer').click();
 await selectMount();
 const finished=await stored();
 check('Returning in hand preserves animal, purchase receipt, fatigue and no extra bond',
  finished.mountRidesV156.active===null&&finished.mountRidesV156.lastReport.result==='recovered'&&
  finished.mountsV153.mounts[0].proof.adoptionMarks===180&&finished.mountsV153.mounts[0].bond===50&&
  finished.mountsV153.mounts[0].fatigue===Math.ceil(second.course.fatigue)&&finished.profile.clanMarks===9770);
 await shot('stable-after-return.png');
 assert.deepEqual(report.errors,[]);
 report.passed=true;
} catch(error) {
 report.errors.push(error.stack);
 report.visibleControls=await page?.getByRole('button').allTextContents().catch(()=>[])??[];
 console.error(error);
 if (page) await page.screenshot({path:path.join(out,'error.png'),fullPage:true}).catch(()=>{});
 process.exitCode=1;
} finally {
 fs.writeFileSync(path.join(out,'adoption-report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();
 await server.close();
}
