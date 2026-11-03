/** Verify real current production artifacts; historical R7 never satisfies this test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {local,proofShape,normalizeServedBuilds,verifyCaptureCoverage} from '../scripts/lib/excel-followup-evidence.mjs';
import {verifyExecutedSourcesV112,verifyRuntimeCommitV112} from '../scripts/publish-validation-v112.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const FREEZE='docs/v113-runtime-freeze.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function readRegular(file){
 assert.ok(local(file),'Unsafe production evidence path');
 const absolute=path.resolve(ROOT,file),stat=await fs.lstat(absolute);
 assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Production evidence must be a regular file: '+file);
 assert.equal(await fs.realpath(absolute),absolute,'Production evidence traverses a symlink: '+file);
 return fs.readFile(absolute);
}
const fingerprint=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes)});
async function verifyPinned(row){
 proofShape(row);
 if(Object.hasOwn(row,'path')&&Object.hasOwn(row,'file'))assert.equal(row.path,row.file,'Conflicting evidence aliases');
 const file=row.path??row.file,bytes=await readRegular(file);
 assert.equal(bytes.length,row.bytes,'Published evidence size changed: '+file);
 assert.equal(sha(bytes),row.sha256,'Published evidence SHA256 changed: '+file);
 return bytes;
}
async function verifyDomain(domain,freezePin,freeze,validateExecutedResultV113,recipes){
 const base='docs/qa/v113-'+domain.toLowerCase(),reportPath='docs/v113-'+domain.toLowerCase()+'-validation.json';
 const reportBytes=await readRegular(reportPath),report=JSON.parse(reportBytes);
 assert.equal(report.schemaVersion,1);assert.equal(report.release,'V113','Historical V112/R7 cannot certify the current V113 runtime');
 assert.equal(report.status,'PASS_CIBLE');assert.equal(report.domain,domain);
 assert.deepEqual(report.sourceFreeze,freezePin,'Both current domains must use the actual V113 freeze');
 const production=report.production;
 assert.equal(production.mode,'compiled-app');assert.match(production.runtimeCommit,/^[a-f0-9]{40}$/);
 assert.ok(typeof production.buildId==='string'&&production.buildId.trim()===production.buildId&&production.buildId.length);
 assert.deepEqual(report.sourceBefore,report.sourceAfter,'Published sources changed during the real recipe');
 assert.equal(report.rawEvidence.path,base+'/browser-result.json.gz');
 assert.ok(Number.isSafeInteger(report.rawEvidence.decodedBytes)&&report.rawEvidence.decodedBytes>0&&report.rawEvidence.decodedBytes<=256*1024*1024);
 assert.match(report.rawEvidence.decodedSha256,/^[a-f0-9]{64}$/);
 const gzipBytes=await verifyPinned(report.rawEvidence);
 const decoded=gunzipSync(gzipBytes,{maxOutputLength:report.rawEvidence.decodedBytes});
 assert.equal(decoded.length,report.rawEvidence.decodedBytes);assert.equal(sha(decoded),report.rawEvidence.decodedSha256);
 const raw=JSON.parse(decoded),opened=raw.captures.map(row=>row.file);
 const {servedBuilds}=validateExecutedResultV113(raw,{domain,opened,runtimeCommit:production.runtimeCommit,buildId:production.buildId});
 assert.deepEqual(normalizeServedBuilds(production.servedBuilds,production.buildId),servedBuilds,'Served HTML records differ from the executed raw evidence');
 for(const key of ['errors','consoleErrors','workerErrors','requestsFailed']){
  assert.deepEqual(report[key],[],'Production error records must be explicitly empty: '+key);
  assert.deepEqual(raw[key],report[key]);
 }
 await verifyExecutedSourcesV112(raw,freeze,{root:ROOT});
 const captures=[],portableImages=[];
 for(const capture of raw.captures){
  const file=base+'/'+capture.file,bytes=await verifyPinned({...capture,file});
  assert.ok(bytes.length>=33&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a','A capture must preserve its actual PNG bytes');
  assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0);
  captures.push({file,sha256:sha(bytes),bytes:bytes.length});portableImages.push(fingerprint(file,bytes));
 }
 const rawEvidence={...fingerprint(base+'/browser-result.json.gz',gzipBytes),decodedSha256:sha(decoded),decodedBytes:decoded.length};
 const expected={schemaVersion:1,release:'V113',status:'PASS_CIBLE',scope:raw.scope,sourceFreeze:freezePin,domain,
  completedJourneys:raw.completedJourneys,
  production:{mode:'compiled-app',runtimeCommit:production.runtimeCommit,buildId:production.buildId,browserErrors:0,
   checksFailed:0,checksPassed:raw.checks.length,servedBuilds},
  invocation:raw.invocation,sourceBefore:raw.sourceBefore,sourceAfter:raw.sourceAfter,
  errors:raw.errors,consoleErrors:raw.consoleErrors,workerErrors:raw.workerErrors,requestsFailed:raw.requestsFailed,
  checks:raw.checks,captures,capturesOpened:captures.map(row=>row.file),rawEvidence};
 assert.deepEqual(report,expected,'The current certificate must exactly reproduce its complete raw evidence');
 const entry=JSON.parse(await readRegular(base+'/entry.json'));
 assert.deepEqual(entry,{domain,status:'PASS_CIBLE',buildId:production.buildId,runtimeCommit:production.runtimeCommit,
  driver:recipes[domain],command:raw.invocation.command,sourceFreeze:freezePin,report:fingerprint(reportPath,reportBytes),
  browserChecksPassed:raw.checks.length,capturesInspected:opened.length,portableFiles:[rawEvidence,...portableImages]},
 'The portable publication entry must preserve the full current report, raw record and every capture');
 verifyCaptureCoverage({opened:report.capturesOpened,portableFiles:entry.portableFiles,recordedCaptures:report.captures,rawCaptures:raw.captures});
 return{runtimeCommit:production.runtimeCommit,buildId:production.buildId};
}

test('current V113 Homeworld and Pit certificates preserve complete raw evidence, frozen Git sources, served HTML identities and every opened capture',{timeout:300000},async()=>{
 const required=[FREEZE,'docs/v113-homeworld-validation.json','docs/v113-pit-validation.json'];
 for(const file of required)await fs.access(path.join(ROOT,file)).catch(()=>assert.fail('Current V113 production is not published yet; missing '+file));
 const [{snapshotRuntimeV113,V113_RECIPES},{validateExecutedResultV113}]=await Promise.all([
  import('../scripts/snapshot-runtime-v113.mjs'),import('../scripts/publish-validation-v113.mjs'),
 ]);
 const freezeBytes=await readRegular(FREEZE),freeze=JSON.parse(freezeBytes),freezePin=fingerprint(FREEZE,freezeBytes);
 assert.deepEqual(await snapshotRuntimeV113({root:ROOT}),freeze,'Current runtime bytes differ from the V113 production freeze');
 const homeworld=await verifyDomain('Homeworld',freezePin,freeze,validateExecutedResultV113,V113_RECIPES);
 const pit=await verifyDomain('Pit',freezePin,freeze,validateExecutedResultV113,V113_RECIPES);
 assert.deepEqual(homeworld,pit,'Current Homeworld and Pit must use the same real runtime commit and compiled build');
 await verifyRuntimeCommitV112(freeze,homeworld.runtimeCommit,{root:ROOT});
 assert.deepEqual(await snapshotRuntimeV113({root:ROOT}),freeze,'Current source bytes changed while the two publications were verified');
});
