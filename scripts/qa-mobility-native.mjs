/** Real component, reducer, writer and localStorage; not a full Homeworld journey. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const root=process.cwd(), out=path.join(root,'outputs/qa-mobility-native');
fs.mkdirSync(out,{recursive:true});
const report={scope:'Native component with actual reducer, campaign writer and localStorage. Test funding and adult rank are declared fixture inputs; not a complete GameClient/Homeworld journey.',checks:[],errors:[],screenshots:[],passed:false,sourceCommit:process.env.MOBILITY_QA_COMMIT??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
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
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1040}});page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto('http://127.0.0.1:4188/',{waitUntil:'networkidle'});await page.bringToFront();
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')));
 const click=async(name,exact=true)=>page.getByRole('button',{name,exact}).click();
 const shot=async(name)=>{await page.screenshot({path:path.join(out,name),fullPage:true});report.screenshots.push(name);};
 await page.locator('[data-mobility-garage]').waitFor();
 check('fifty catalogue models',await page.locator('[role=listitem]').count()===50);
 check('purchase gated before permit',await page.getByRole('button',{name:'Confirmer l’achat · 420 marques',exact:true}).isDisabled());
 check('legacy save grants no vehicle',!(await stored()).mobilityV1);await shot('garage-desktop.png');
 await page.setViewportSize({width:390,height:844});await shot('garage-mobile.png');
 check('mobile has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.setViewportSize({width:1440,height:1040});
 await click('Prendre le Grav-Sled de formation');let yard=page.locator('[data-mobility-yard]');await yard.waitFor();
 check('loan recorded and initially paused',(await stored()).mobilityV1.active.loaned&&await yard.getAttribute('data-paused')==='true');
 const bindings=(await stored()).settings.controlBindings;
 const [up,left,right,brake,interact]=['hunt.moveUp','hunt.moveLeft','hunt.moveRight','hunt.jump','hunt.interact'].map(k=>bindings[k][0]);
 await click('Reprendre la conduite');
 const points=[[820,490],[820,130],[820,24],[140,24],[140,130],[140,490]];
 let stage=0,held=new Set(),samples=0;const started=Date.now();
 while(Date.now()-started<150000){
  const s=await yard.evaluate(e=>Object.fromEntries(['x','y','heading','speed','tick','checkpoint','cargo','paused'].map(k=>[k,e.getAttribute('data-'+k)])));
  const [x,y,h,speed]=['x','y','heading','speed'].map(k=>Number(s[k]));
  const [tx,ty]=points[stage],distance=Math.hypot(tx-x,ty-y),error=Math.atan2(Math.sin(Math.atan2(ty-y,tx-x)-h),Math.cos(Math.atan2(ty-y,tx-x)-h));const want=new Set();
  if(distance<(stage===2||stage===3?13:32)){
   want.add(brake);
   if(Math.abs(speed)<5){
    if(stage===1||stage===5)want.add(interact);
    if(stage===1){if(Number(s.cargo)===25)stage++;}
    else if(stage===5){if((await stored()).mobilityV1.active.course.cargoDelivered)break;}
    else stage++;
   }
  }else{
   if(Math.abs(error)>.04)want.add(error>0?right:left);
   if(Math.abs(error)<.4)want.add(up);else if(Math.abs(speed)>12)want.add(brake);
  }
  for(const key of held)if(!want.has(key))await page.keyboard.up(key);
  for(const key of want)if(!held.has(key))await page.keyboard.down(key);
  held=want;if(++samples%180===0)console.log('ROUTE',stage,s);
  await page.waitForTimeout(55);
 }
 for(const key of held)await page.keyboard.up(key);
 await click('Pause et enregistrer');const completed=(await stored()).mobilityV1.active.course;report.course=completed;
 check('three ordered gates and real cargo return',completed.checkpoint===3&&completed.cargoDelivered);await shot('yard-completed.png');await click('Remiser au garage');
 let save=await stored();check('permit awards no property rank or currency',save.mobilityV1.circulationPermit&&save.mobilityV1.owned.length===0&&save.profile.clanMarks===10000&&save.profile.rankId==='blooded');
 await click('Confirmer l’achat · 420 marques');save=await stored();check('purchase debited exactly once',save.profile.clanMarks===9580&&save.mobilityV1.owned.length===1);
 await click('Installer · 80 marques');save=await stored();check('drive upgrade persisted',save.profile.clanMarks===9500&&save.mobilityV1.owned[0].upgrades.drive===1);
 const before=JSON.stringify(save.mobilityV1);await page.reload({waitUntil:'networkidle'});await page.locator('[data-mobility-garage]').waitFor();check('reload preserves exact ledger',JSON.stringify((await stored()).mobilityV1)===before);
 await click('Sortir sur l’aire');await click('Reprendre la conduite');await page.keyboard.down(up);await page.waitForTimeout(1300);await page.keyboard.up(up);await click('Pause et enregistrer');
 save=await stored();check('owned driving consumes reserve and wears hull',save.mobilityV1.owned[0].energy<100&&save.mobilityV1.owned[0].condition<100);
 const tick=save.mobilityV1.active.course.tick;await page.waitForTimeout(700);check('pause freezes persisted tick',(await stored()).mobilityV1.active.course.tick===tick);
 await page.reload({waitUntil:'networkidle'});yard=page.locator('[data-mobility-yard]');await yard.waitFor();check('active sortie reloads paused at saved tick',await yard.getAttribute('data-paused')==='true'&&(await stored()).mobilityV1.active.course.tick===tick);
 await click('Retour de sécurité');await click('Confirmer la récupération');save=await stored();
 check('recovery preserves wear and records debt',save.mobilityV1.active===null&&save.mobilityV1.owned[0].energy<100&&save.mobilityV1.recoveryDebt>=20);
 check('debt prevents further personal sortie',await page.getByRole('button',{name:'Sortir sur l’aire',exact:true}).isDisabled());
 const cost=save.mobilityV1.recoveryDebt,marks=save.profile.clanMarks;await click(`Régler le remorquage · ${cost} marques`);save=await stored();check('recovery settlement debits exact debt',save.mobilityV1.recoveryDebt===0&&save.profile.clanMarks===marks-cost);
 await click('Recharger ·',false);save=await stored();check('recharge does not repair hull',save.mobilityV1.owned[0].energy===100&&save.mobilityV1.owned[0].condition<100);
 await click('Réparer ·',false);check('repair restores hull',(await stored()).mobilityV1.owned[0].condition===100);await shot('garage-maintained.png');
 check('no browser exceptions',report.errors.length===0);report.passed=true;report.browserVersion=browser.version();
}catch(error){report.failure=String(error);console.error(error);if(page)try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}catch{}}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors}));process.exitCode=report.passed?0:1;
