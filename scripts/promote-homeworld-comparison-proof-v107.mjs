/** Package an already completed compiled-app recipe. Never upgrades a preflight. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const input=path.resolve(process.env.YAUTJA_COMPARISON_QA_OUTPUT??'outputs/qa-v107/homeworld-comparison');
const runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/,'Supply the frozen runtime commit');
const result=JSON.parse(await fs.readFile(path.join(input,'result.json'),'utf8'));
assert.equal(result.status,'PASS');assert.equal(result.mode,'compiled-app');assert.equal(result.runtimeCommit,runtimeCommit);
assert(result.buildId&&result.servedBuilds.length&&result.servedBuilds.every(b=>b.status===200&&b.expectedBuildId===result.buildId&&b.foundInHtml===true));
assert.equal(result.errors.length,0);assert(result.sourceUnchanged);assert.deepEqual(result.sourceBefore,result.sourceAfter);
assert(result.checks.length>=35&&result.checks.every(c=>c.status==='PASS'));
assert.equal(result.captures.length,10);
const inspected=process.env.YAUTJA_COMPARISON_OPENED_CAPTURES?.split(',')??[];
assert.deepEqual([...inspected].sort(),result.captures.map(c=>c.file).sort(),'Supply the exact names of all screenshots after opening them');
const out='docs/qa/v107-homeworld-comparison';await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
async function copy(source,name){const bytes=await fs.readFile(source),file=out+'/'+name;await fs.writeFile(file,bytes);const item={file,sha256:sha(bytes),bytes:bytes.length};evidence.push(item);return item;}
for(const c of result.captures){const item=await copy(path.join(input,c.file),c.file);assert.equal(item.sha256,c.sha256);}
await copy(path.join(input,'result.json'),'result.json');
for(const name of ['test.log','lint.log'])await copy(path.join(input,name),name);
assert(evidence.reduce((sum,e)=>sum+e.bytes,0)<10_000_000);
const report={status:'PASS',scope:{runtimeCommit,description:result.scope},production:{buildId:result.buildId,mode:'compiled-app',runtimeCommit,checksPassed:result.checks.length,checksFailed:0,browserErrors:0,servedBuilds:result.servedBuilds},evidence,sourceBefore:result.sourceBefore,sourceAfter:result.sourceAfter,capturesOpened:inspected,completedAt:result.completedAt};
await fs.writeFile('docs/v107-homeworld-comparison-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',files:evidence.length,bytes:evidence.reduce((s,e)=>s+e.bytes,0)}));
