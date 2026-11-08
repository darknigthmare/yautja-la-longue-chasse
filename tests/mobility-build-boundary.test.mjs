/** Regressions for the full-build failures discovered beyond the mobility gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {mobilitySourceLoader} from './mobility/load-source.mjs';
const runtime='app/game/systems/mobility/catalogue-source';
for(const file of ['01-10.json','11-20.json','21-30.json','31-40.json','41-50.json'])test('runtime preserves canonical bible bytes: '+file,()=>{
 assert.deepEqual(fs.readFileSync(path.join(runtime,file)),fs.readFileSync(path.join('docs/campagne/mobilite/catalogue',file)));
});
test('canonical projection checker is read-only',()=>{
 const before=fs.readFileSync(path.join(runtime,'01-10.json'));
 const result=JSON.parse(execFileSync(process.execPath,['scripts/sync-mobility-catalogue.mjs','--check'],{encoding:'utf8'}));
 assert.equal(result.canonical_models,50);assert.equal(result.byte_identical_files,5);assert.deepEqual(fs.readFileSync(path.join(runtime,'01-10.json')),before);
});
test('runtime catalogue loads all fifty identities without docs in a sparse build',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mobility-code-only-'));
 try{
  fs.writeFileSync(path.join(temp,'package.json'),'{}');
  fs.cpSync('app/game/systems/mobility',path.join(temp,'app/game/systems/mobility'),{recursive:true});
  assert.equal(fs.existsSync(path.join(temp,'docs')),false);
  const {MOBILITY_CATALOGUE}=mobilitySourceLoader(temp)('app/game/systems/mobility/catalogue.ts');
  assert.equal(MOBILITY_CATALOGUE.length,50);assert.equal(MOBILITY_CATALOGUE.filter(d=>d.shopEnabled).length,1);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('dev mobility presents a campaign-only notice, no shop and no writes',()=>{
 const qa=homeworldSceneSsrV78();
 const {defaultSave}=qa.load('app/game/save.ts');
 const save=defaultSave('2026-11-08T16:00:00.000Z'),before=JSON.stringify(save);let writes=0;
 const failWrite=()=>{writes++;throw Error('No writes allowed in read-only mobility notice');};
 const html=qa.render('app/dev/services.tsx',{service:'mobility',save,progression:{},host:'Forges /dev',onSave:failWrite,onProgressionChange:failWrite,onNotify:()=>{},onClose:()=>{},onService:()=>{},onTravel:()=>{}});
 assert.match(html,/data-dev-mobility-readonly/);assert.match(html,/ne crée aucun véhicule/);
 assert.doesNotMatch(html,/data-mobility-garage|data-mobility-yard|Confirmer l’achat|Prendre le Grav-Sled/);
 assert.equal(writes,0);assert.equal(JSON.stringify(save),before);
});
