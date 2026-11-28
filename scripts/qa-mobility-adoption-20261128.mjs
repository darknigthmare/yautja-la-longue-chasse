/** Real component, reducer, writer and localStorage; not a full Homeworld journey. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const root=process.cwd(), out=path.join(root,'outputs/qa-mobility-native');
fs.mkdirSync(out,{recursive:true});
const report={scope:'Actual MobilityGarage, MountRidingYardV156, V153/V156 reducers and campaign save functions. Declared test rank and funds. The harness supplies the React save owner; it does not traverse Homeworld or use GameClient.',checks:[],errors:[],screenshots:[],passed:false,sourceCommit:process.env.MOBILITY_QA_COMMIT??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push({name,passed:true});console.log('PASS',name);};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url??'/', 'http://localhost');
 const relative=decodeURIComponent(url.pathname),base=relative.startsWith('/game/')?path.join(root,'public'):out;
 const target=path.resolve(base,relative==='/'?'index.html':'.'+relative);
 if(!target.startsWith(base+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return;}
 const types={'.js':'application/javascript','.css':'text/css','.png':'image/png','.html':'text/html'};
 res.writeHead(200,{'content-type':types[path.extname(target)]??'application/octet-stream','cache-control':'no-store'});fs.createReadStream(target).pipe(res);
});
await new Promise(resolve=>server.listen(4188,'127.0.0.1',resolve));
let browser,page;
try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1040}});page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto('http://127.0.0.1:4188/',{waitUntil:'networkidle'});await page.bringToFront();
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')));
 const click=async(name,exact=true)=>page.getByRole('button',{name,exact}).click();
 const shot=async(name)=>{await page.screenshot({path:path.join(out,name),fullPage:true});report.screenshots.push(name);};
 await page.locator('[data-mobility-garage]').waitFor();

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
 if (page) await page.screenshot({path:path.join(out,'error.png'),fullPage:true}).catch(()=>{});
 process.exitCode=1;
} finally {
 fs.writeFileSync(path.join(out,'adoption-report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
