import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prey-v06-host-'));
fs.mkdirSync(path.join(tmp,'app','game','systems'),{recursive:true});
fs.writeFileSync(path.join(tmp,'package.json'),JSON.stringify({name:'yautja-la-longue-chasse'}));
fs.writeFileSync(path.join(tmp,'.gitignore'),'/private-dlc/\n');fs.writeFileSync(path.join(tmp,'.vercelignore'),'/private-dlc/\n');
const fixture=`"use client";\nimport styles from './CampaignMainMenu.module.css';\nexport default function CampaignMainMenu({catalog}:{catalog:any}){return <main><section>\n{catalog?.slots.every(s=>s.status!=='empty')&&<p className={styles.notice}>Full</p>}\n</section></main>}\n`;
const menu=path.join(tmp,'app','game','CampaignMainMenu.tsx');fs.writeFileSync(menu,fixture);
const mausoleumFixture=`/** fixture */\nimport { referenceBiomaskPathV62 } from "../biomaskCatalogueV62";\nexport interface MausoleumDlcAdapter { chronicleId:string; installed:boolean; owned:boolean; campaignVersion:string; status:"ready"|"completed"|"mastered"; start(ticket:any):Promise<{started:boolean;reason?:string}> }\nexport const MAUSOLEUM_INSTALLED_CAMPAIGNS: readonly MausoleumDlcAdapter[] = [];\n`;
const mausoleum=path.join(tmp,'app','game','systems','mausoleum.ts');fs.writeFileSync(mausoleum,mausoleumFixture);
const installer=path.join(ROOT,'INSTALLER_PREY_V0_6.mjs');
let r=spawnSync(process.execPath,[installer,tmp,'install'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const installed=path.join(tmp,'private-dlc','campaigns','prey-2022');assert.ok(fs.existsSync(path.join(installed,'manifest.json')));
// Local bridge: status, CORS, descriptor and V0.6 page.
const port=4356;const bridge=spawn(process.execPath,[path.join(installed,'integration','prey-private-dev-server-v06.mjs'),String(port)],{stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('bridge timeout')),3000);bridge.stdout.on('data',d=>{if(String(d).includes('local bridge')){clearTimeout(t);resolve()}});bridge.on('exit',code=>reject(new Error('bridge exited '+code)));});
 const status=await fetch(`http://127.0.0.1:${port}/__prey/status`);assert.equal(status.status,200);assert.equal(status.headers.get('access-control-allow-origin'),'*');const statusJson=await status.json();assert.equal(statusJson.version,'0.6.0');assert.equal(statusJson.saveSchema,6);assert.equal(statusJson.huntMarks,6);assert.equal(statusJson.mausoleum,true);
 const desc=await fetch(`http://127.0.0.1:${port}/__prey/descriptor`).then(x=>x.json());assert.equal(desc.id,'yautja.prey.1719');assert.equal(desc.save.schemaVersion,6);assert.equal(desc.hostCompatibility.mausoleumContract,'MausoleumDlcAdapter');
 const game=await fetch(`http://127.0.0.1:${port}/JOUER_PREY_DLC_V0_6.html`);assert.equal(game.status,200);assert.match(await game.text(),/PREY 1719/);
} finally {bridge.kill('SIGTERM');}
// Optional development menu card install + exact restore.
const patcher=path.join(installed,'integration','APPLIQUER_CARTE_PREY_LOCALE_V0_6.mjs');
r=spawnSync(process.execPath,[patcher,tmp,'install'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(fs.readFileSync(menu,'utf8'),/PREY_PRIVATE_DLC_V06/);assert.ok(fs.existsSync(path.join(tmp,'app','game','PreyPrivateDlcCard.tsx')));
r=spawnSync(process.execPath,[patcher,tmp,'uninstall'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(menu,'utf8'),fixture);
// Menu safety refuses to overwrite later host edits.
r=spawnSync(process.execPath,[patcher,tmp,'install'],{encoding:'utf8'});assert.equal(r.status,0);fs.appendFileSync(menu,'\n// host edit after PREY install\n');r=spawnSync(process.execPath,[patcher,tmp,'uninstall'],{encoding:'utf8'});assert.equal(r.status,6);assert.match(fs.readFileSync(menu,'utf8'),/host edit after PREY install/);
fs.rmSync(path.join(tmp,'app','game','.CampaignMainMenu.prey-v06.backup'),{force:true});fs.rmSync(path.join(tmp,'app','game','.CampaignMainMenu.prey-v06.json'),{force:true});fs.rmSync(path.join(tmp,'app','game','PreyPrivateDlcCard.tsx'),{force:true});fs.rmSync(path.join(tmp,'app','game','preyPrivateDlcAdapterV06.ts'),{force:true});fs.writeFileSync(menu,fixture);
// Native Homeworld mausoleum adapter install + exact restore.
const mausPatcher=path.join(installed,'integration','APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs');
r=spawnSync(process.execPath,[mausPatcher,tmp,'install'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);let mausPatched=fs.readFileSync(mausoleum,'utf8');assert.match(mausPatched,/PREY_MAUSOLEUM_V06/);assert.match(mausPatched,/PREY_MAUSOLEUM_ADAPTER_V06/);assert.ok(fs.existsSync(path.join(tmp,'app','game','systems','preyMausoleumAdapterV06.ts')));
r=spawnSync(process.execPath,[mausPatcher,tmp,'uninstall'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(mausoleum,'utf8'),mausoleumFixture);
// Mausoleum safety also refuses later host edits.
r=spawnSync(process.execPath,[mausPatcher,tmp,'install'],{encoding:'utf8'});assert.equal(r.status,0);fs.appendFileSync(mausoleum,'\n// host mausoleum edit after PREY install\n');r=spawnSync(process.execPath,[mausPatcher,tmp,'uninstall'],{encoding:'utf8'});assert.equal(r.status,6);assert.match(fs.readFileSync(mausoleum,'utf8'),/host mausoleum edit after PREY install/);
fs.rmSync(path.join(tmp,'app','game','systems','.mausoleum.prey-v06.backup'),{force:true});fs.rmSync(path.join(tmp,'app','game','systems','.mausoleum.prey-v06.json'),{force:true});fs.rmSync(path.join(tmp,'app','game','systems','preyMausoleumAdapterV06.ts'),{force:true});fs.writeFileSync(mausoleum,mausoleumFixture);
// Default DLC uninstaller remains isolated from host source.
r=spawnSync(process.execPath,[installer,tmp,'uninstall'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.ok(!fs.existsSync(installed));assert.equal(fs.readFileSync(menu,'utf8'),fixture);assert.equal(fs.readFileSync(mausoleum,'utf8'),mausoleumFixture);
fs.rmSync(tmp,{recursive:true,force:true});
const result={version:'0.6.0',installerRoundTrip:true,bridgeStatus:true,cors:true,descriptor:true,hostCardRoundTrip:true,hostCardEditProtection:true,mausoleumRoundTrip:true,mausoleumEditProtection:true,publicSourceUntouchedByDefault:true,status:'PASS'};fs.writeFileSync(path.join(HERE,'QA_INTEGRATION_V0_6.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
