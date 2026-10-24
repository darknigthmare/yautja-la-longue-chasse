/** Assemble already executed, inspected, portable four-domain production proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {snapshotRuntimeV108} from './snapshot-runtime-v108.mjs';
import {verifyProductionSummaryV108} from './build-excel-followup-v108.mjs';
const args=process.argv.slice(2),entries=[];let runtimeCommit,productionBuildId;
for(let i=0;i<args.length;i+=2){assert.ok(args[i+1]);if(args[i]==='--entry')entries.push(args[i+1]);else if(args[i]==='--runtime-commit')runtimeCommit=args[i+1];else if(args[i]==='--build-id')productionBuildId=args[i+1];else throw Error('Unknown option');}
assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/);assert.ok(productionBuildId);assert.equal(entries.length,4);
const bytes=await fs.readFile('docs/v108-runtime-freeze.json'),freeze=JSON.parse(bytes);
assert.deepEqual(await snapshotRuntimeV108(),freeze);
const production=await Promise.all(entries.map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
const master={schemaVersion:1,release:'V108',status:'PASS_CIBLE',recordedAt:new Date().toISOString(),runtimeCommit,productionBuildId,
 scope:'Targeted journeys on one compiled production build: Feral/Scar resource continuity and native equipment inspection; ROLE19 physical cargo sorting; linked six-workshop clan logistics; a second eight-sector Preserve reserve. Reused art is declared. Complete kits, original source campaigns, campaign acquisitions and the 80/100 target remain open.',
 sourceFreeze:{path:'docs/v108-runtime-freeze.json',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length},production};
await verifyProductionSummaryV108(master,freeze);
await fs.writeFile('docs/v108-validation-summary.json',JSON.stringify(master,null,2)+'\n');
console.log(JSON.stringify({status:master.status,domains:production.length,checks:production.reduce((n,r)=>n+r.browserChecksPassed,0),captures:production.reduce((n,r)=>n+r.capturesInspected,0),buildId:productionBuildId}));
