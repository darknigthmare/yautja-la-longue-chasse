import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

// Run only after the release operator confirms the deployment is READY.
// This wrapper reads public assets and runs the existing client-only browser QA;
// it does not mutate game sources, a deployed server or user browser storage.
const url=new URL(process.argv[2]??process.env.V62_PUBLIC_QA_URL??'');
assert.equal(url.protocol,'https:','Use the confirmed HTTPS publication URL');
assert(!['localhost','127.0.0.1','::1'].includes(url.hostname),'Public evidence must not target a local server');
assert(!url.username&&!url.password&&!url.search&&!url.hash,'Use a clean public alias without credentials or query parameters');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=async file=>sha(await fs.readFile(file));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.resolve(`work-local/v62/qa/stages/public/${runId}`);
await fs.mkdir(output,{recursive:true});
const localEvidence=['docs/v62-stage-application-qa.json','work-local/v62/qa/stages/application-final/report.json'];
const localHashes=Object.fromEntries(await Promise.all(localEvidence.map(async file=>[file,await hash(file)])));
const assetProof=[];
let exitCode=1;
try {
 const manifest=await read('app/game/data/pitStageLifeV62.json');
 const p0=await read('docs/v62-generation/arena-187-golgotha-uscm-airlock-p0-depth.json');
 const assets=[...manifest.stages.flatMap(stage=>stage.events.map(event=>({stageId:stage.stageId,path:event.src,sha256:event.sha256}))),
  {stageId:p0.stageId,path:`/game/sprites/v62/pit-arenas/${p0.stageId}/p0-depth.png`,sha256:p0.sha256}];
 assert.equal(assets.length,10);
 // Native public PNGs must match the reviewed local bytes before any flow is counted.
 for(const asset of assets){
  const response=await fetch(new URL(asset.path,url),{signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,asset.path+' must be publicly accessible');
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes),asset.sha256,asset.path+' differs from the reviewed native PNG');
  assetProof.push({...asset,httpStatus:response.status,bytes:bytes.length,contentType:response.headers.get('content-type')});
 }
 await fs.writeFile(path.join(output,'public-native-assets.json'),JSON.stringify({status:'PASS',url:url.href,assets:assetProof},null,2)+'\n');
 const env={...process.env,V62_STAGE_LIFE_QA_URL:url.href,V62_STAGE_LIFE_QA_OUTPUT:output,
  V62_STAGE_LIFE_QA_VERSION:'V62',V62_STAGE_LIFE_QA_TARGETS:'all',V62_STAGE_LIFE_QA_CASES:'desktop,reduced,mobile,retry'};
 exitCode=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/verify-pit-stage-life-v62.mjs'],{env,stdio:'inherit',windowsHide:true});
  child.on('error',reject);child.on('exit',code=>resolve(code??1));
 });
 assert.equal(exitCode,0,'The public browser recipe failed; inspect its separate failure.json');
 const report=await read(path.join(output,'report.json'));
 assert.equal(report.status,'PASS');assert.equal(report.completeCurrentManifestGate,true);
 assert.equal(report.targets.length,3);assert.equal(report.checks.length,16);
 for(const [file,digest] of Object.entries(localHashes))assert.equal(await hash(file),digest,'Local evidence was changed');
 const summary={schemaVersion:1,release:'V62',status:'PASS',surface:'public-production-alias',checkedAt:new Date().toISOString(),
  url:url.href,rawReport:path.relative(process.cwd(),path.join(output,'report.json')).replaceAll('\\','/'),
  rawReportSha256:await hash(path.join(output,'report.json')),scriptSha256:await hash('scripts/verify-pit-stage-public-v62.mjs'),
  localEvidencePreserved:localHashes,publicNativeAssets:assetProof,targets:report.targets,cases:report.cases,checks:report.checks,
  captures:report.captures.map(c=>({...c,file:path.relative(process.cwd(),path.join(output,c.file)).replaceAll('\\','/')})),
  errors:report.errors,httpFailures:report.httpFailures,failedRequests:report.failedRequests,
  limitations:[...report.limitations,'This public run preserves all earlier local QA reports.','Public screenshot review is separate; native public asset bytes are checked independently.']};
 await fs.writeFile(path.join(output,'public-summary.json'),JSON.stringify(summary,null,2)+'\n');
 await fs.writeFile('docs/v62-stage-public-qa.json',JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',file:'docs/v62-stage-public-qa.json',url:url.href,checks:16,publicPngs:10,output}));
} catch(error){
 await fs.writeFile(path.join(output,'public-wrapper-failure.json'),JSON.stringify({status:'FAIL',url:url.href,error:String(error),exitCode,
  publicNativeAssets:assetProof,localEvidenceBefore:localHashes},null,2)+'\n');
 console.error(error);process.exitCode=1;
}
