/** Assemble only already executed and inspected four-domain production proofs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {snapshotRuntimeV107} from './snapshot-runtime-v107.mjs';
import {verifyProductionSummaryV107} from './build-excel-followup-v107.mjs';
const args=process.argv.slice(2),entries=[];let runtimeCommit,productionBuildId;
for(let index=0;index<args.length;index+=2){
 const value=args[index+1];assert.ok(value,'Option value required');
 if(args[index]==='--entry')entries.push(value);
 else if(args[index]==='--runtime-commit')runtimeCommit=value;
 else if(args[index]==='--build-id')productionBuildId=value;
 else throw Error('Unknown option: '+args[index]);
}
assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/);assert.ok(productionBuildId);assert.equal(entries.length,4);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const freezePath='docs/v107-runtime-freeze.json',freezeBytes=await fs.readFile(freezePath),freeze=JSON.parse(freezeBytes);
assert.deepEqual(await snapshotRuntimeV107(),freeze,'Frozen runtime changed after the common production build');
const production=await Promise.all(entries.map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
for(const entry of production){
 const report=JSON.parse(await fs.readFile(entry.report.path??entry.report.file,'utf8'));
 assert.equal(entry.browserChecksPassed,report.production.checksPassed,entry.domain+': executed check count differs');
 assert.ok(Array.isArray(report.capturesOpened)&&report.capturesOpened.length>0,entry.domain+': actual screenshot inspection list required');
 assert.equal(entry.capturesInspected,report.capturesOpened.length,entry.domain+': screenshot inspection count differs');
}
const summary={schemaVersion:1,release:'V107',status:'PASS_CIBLE',recordedAt:new Date().toISOString(),runtimeCommit,productionBuildId,
 scope:'Four targeted journeys on one local compiled Next production build: native Feral/Scar devices and Scar conclusions, persistent alternative exercise, Homeworld comparison, six separate clan workshops and an eight-sector Preserve expedition. Historical/static art is reconciled separately. Complete kits, original source campaigns, campaign acquisitions,80sectors/100fighters and canonical fidelity are not certified.',
 sourceFreeze:{path:freezePath,sha256:sha(freezeBytes),bytes:freezeBytes.length},freezeCoverage:{files:freeze.files,bytes:freeze.bytes,scope:freeze.scope},production};
await verifyProductionSummaryV107(summary,freeze);
await fs.writeFile('docs/v107-validation-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:'PASS_CIBLE',domains:production.length,buildId:productionBuildId,checks:production.reduce((sum,row)=>sum+row.browserChecksPassed,0),capturesOpened:production.reduce((sum,row)=>sum+row.capturesInspected,0)}));
