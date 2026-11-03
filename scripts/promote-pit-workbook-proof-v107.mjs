/** Package an executed V107 compiled-app recipe after every capture was opened.
 * The full browser result is archived losslessly with its exact decoded byte
 * identity; no status, mode, field or observation is upgraded or removed. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const input=path.resolve(process.env.YAUTJA_PIT_WORKBOOK_QA_OUTPUT??'outputs/qa-v107/pit-workbook');
const rawBytes=await fs.readFile(path.join(input,'result.json'));
const result=JSON.parse(rawBytes);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(result.status,'PASS');assert.equal(result.mode,'compiled-app');
assert.equal(result.runtimeCommit,process.env.YAUTJA_QA_RUNTIME_COMMIT);
assert.equal(result.buildId,process.env.YAUTJA_QA_BUILD_ID);
assert.deepEqual([...result.domains].sort(),['campaign','capabilities','conclusions','devices']);
assert.equal(result.sourceUnchanged,true);assert.deepEqual(result.sourceBefore,result.sourceAfter);
assert.equal(result.errors.length,0);assert(result.checks.length>0&&result.checks.every(c=>c.status==='PASS'));
assert(result.servedBuilds.length&&result.servedBuilds.every(b=>b.status===200&&b.expectedBuildId===result.buildId&&b.foundInHtml===true));
const opened=JSON.parse(await fs.readFile(path.join(input,'opened-captures.json'),'utf8'));
const capturesOpened=opened.captures;
assert.deepEqual([...capturesOpened].sort(),result.captures.map(c=>c.file).sort(),'Every recorded PNG must first be opened and inspected');
assert.equal(new Set(capturesOpened).size,capturesOpened.length);
const freeze=JSON.parse(await fs.readFile('docs/v107-runtime-freeze.json','utf8'));
for(const item of result.sourceAfter){
 assert.equal(sha(await fs.readFile(item.file)),item.sha256,'QA input changed: '+item.file);
 if(item.file.startsWith('public/'))assert(freeze.entries.some(f=>f.path===item.file&&f.sha256===item.sha256),'Public input outside frozen inventory: '+item.file);
}
for(const facing of ['right','left']){
 const fatality=result.observations.find(o=>o.kind==='native-conclusion'&&o.key==='FATALITE_2'&&o.facing===facing);
 const mercy=result.observations.find(o=>o.kind==='native-conclusion'&&o.key==='CLEMENCE'&&o.facing===facing);
 assert.equal(fatality?.done.qualification.sourceActionComplete,true);
 assert.equal(mercy?.done.qualification.sourceActionComplete,false);
}
assert.equal(result.observations.filter(o=>o.kind==='physical-devices-v15').length,2);
assert(result.observations.some(o=>o.kind==='physical-mine-destruction'));
assert.deepEqual(result.observations.filter(o=>o.kind==='targeted-campaign-field').map(o=>o.fighterId).sort(),['feral-hunter','scar']);

const output='docs/qa/v107-pit-workbook',evidence=[];
await fs.mkdir(output,{recursive:true});
async function copy(name,target=name){const bytes=await fs.readFile(path.join(input,name)),file=output+'/'+target;await fs.writeFile(file,bytes);const pin={file,sha256:sha(bytes),bytes:bytes.length};evidence.push(pin);return pin;}
const compressed=gzipSync(rawBytes,{level:9}),rawFile=output+'/browser-result.json.gz';
assert(compressed.length<100*1024*1024,'Portable lossless archive must fit GitHub’s100MiB file limit');
assert(gunzipSync(compressed).equals(rawBytes),'Lossless archive must decode to the exact native result.json bytes');
await fs.writeFile(rawFile,compressed);
assert(gunzipSync(await fs.readFile(rawFile)).equals(rawBytes));
evidence.push({file:rawFile,sha256:sha(compressed),bytes:compressed.length,encoding:'gzip',decodedSha256:sha(rawBytes),decodedBytes:rawBytes.length});
await copy('served-production.html');
for(const capture of result.captures){
 assert.equal((await copy(capture.file)).sha256,capture.sha256);
}
const report={
 release:'V107',status:'PASS',scope:{...result.scope,runtimeBindings:43,sourceTargets:52,remainingUnbound:9,limits:[
  'CLEMENCE remains partial: the inert exercise device is not an offensive weapon disarm.',
  'Campaign browser coverage includes the first terrain and reload for each hero, one actual CPU duel and a real public counter; it does not claim all sixteen stages.',
  'The independent five-bladed star is a declared image-generation adaptation of the native reference, not a certified one-to-one extraction.',
  'Mine BODY masking preserves the reviewed opaque core above alpha64; alpha2 through64 shadows and toe fringes remain explicitly ambiguous.',
  'Partner-painted projections and remaining conclusions stay source studies. Costume, armor and equipment constraints remain open.'
 ]},
 production:{mode:result.mode,buildId:result.buildId,runtimeCommit:result.runtimeCommit,checksPassed:result.checks.length,checksFailed:0,browserErrors:0,servedBuilds:result.servedBuilds},
 invocation:result.invocation,domains:result.domains,sourceBefore:result.sourceBefore,sourceAfter:result.sourceAfter,
 captures:result.captures.map(({file,sha256})=>({file,sha256})),capturesOpened,inspectionMethod:opened.method,evidence,completedAt:result.completedAt
};
const reportPath='docs/v107-pit-workbook-validation.json',reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(reportPath,reportBytes);
const env=result.invocation.environment;
const command=['DISPLAY='+env.DISPLAY,'AUDIT_CHROME_HEADED='+env.AUDIT_CHROME_HEADED,'YAUTJA_QA_BASE_URL='+env.YAUTJA_QA_BASE_URL,'YAUTJA_QA_BUILD_ID='+env.YAUTJA_QA_BUILD_ID,'YAUTJA_QA_RUNTIME_COMMIT='+env.YAUTJA_QA_RUNTIME_COMMIT,'YAUTJA_PIT_WORKBOOK_QA_DOMAINS='+env.YAUTJA_PIT_WORKBOOK_QA_DOMAINS,'YAUTJA_PIT_WORKBOOK_QA_OUTPUT='+env.YAUTJA_PIT_WORKBOOK_QA_OUTPUT,'PATH=/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH',result.invocation.command].join(' ');
const entry={domain:'Pit',status:'PASS_CIBLE',buildId:result.buildId,runtimeCommit:result.runtimeCommit,browserChecksPassed:result.checks.length,capturesInspected:capturesOpened.length,command,report:{path:reportPath,sha256:sha(reportBytes),bytes:reportBytes.length},portableFiles:evidence};
await fs.writeFile('/tmp/v107-pit-summary-entry.json',JSON.stringify(entry,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks:result.checks.length,capturesInspected:capturesOpened.length,portableFiles:evidence.length,bytes:evidence.reduce((s,e)=>s+e.bytes,0),report:entry.report},null,2));
