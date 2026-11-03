import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

assert(process.argv.includes('--ready'), 'Verify Vercel READY for this exact commit before running.');
const base='https://yautja-la-longue-chasse.vercel.app';
const expected=process.env.V42_RELEASE_SHA;
assert(/^[a-f0-9]{40}$/.test(expected??''));
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),expected);
const deployment=JSON.parse(await fs.readFile('work/v42/production-deployment.json','utf8'));
assert.equal(deployment.readyState,'READY');
assert.equal(deployment.meta.githubCommitSha,expected);
assert.equal(deployment.target,'production');
assert(deployment.alias.includes(new URL(base).host));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={passed:false,version:'V42',checkedAt:new Date().toISOString(),url:base,commit:expected,
  deploymentId:deployment.id,routes:[],assets:[],errors:[],persistentMediaDownloads:0};
async function request(path,limit){
  const response=await fetch(base+path,{signal:AbortSignal.timeout(60000),headers:{'Cache-Control':'no-cache'}});
  assert.equal(response.status,200,path);assert.equal(new URL(response.url).origin,base);
  const chunks=[];let length=0;
  for await(const chunk of response.body){length+=chunk.length;assert(length<=limit,path+' oversized');chunks.push(chunk);}
  return {body:Buffer.concat(chunks),status:response.status,type:response.headers.get('content-type'),requestId:response.headers.get('x-vercel-id')};
}
const source=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json','utf8'));
const stages=source.stages.filter(stage=>stage.number>=21);
assert.equal(stages.length,80);assert(stages.every(stage=>stage.runtimeEnabled));
const contracts=stages.map(stage=>stage.planes.find(plane=>plane.id==='P0').assets.find(asset=>asset.id==='p0-depth').frames[0]);
assert.equal(new Set(contracts.map(frame=>frame.generation.sha256)).size,80);
for(const path of ['/','/pit-lab','/game/assets/v34/production-review/index.html']){
  try{
    const response=await request(path,8000000);
    assert(response.type?.includes('text/html'));assert(/<!doctype html/i.test(response.body.toString()));
    assert(!/Authentication Required|Vercel Security Checkpoint/.test(response.body.toString()));
    report.routes.push({path,status:response.status,sha256:sha(response.body),requestId:response.requestId});
  }catch(error){report.errors.push({path,error:String(error)});}
}
try{
  const path='/game/assets/v34/production-review/manifest.json';
  const response=await request(path,12000000),local=await fs.readFile('public'+path);
  assert.equal(sha(response.body),sha(local));
  const manifest=JSON.parse(response.body.toString());
  assert.equal(manifest.coverage.arenas.playable,100);
  assert.equal(manifest.coverage.completeGameImplied,false);
  assert.equal(manifest.entries.length,632);
  assert.equal(manifest.coverage.arenas.selectedSourceImages,368);
  report.manifest={path,status:response.status,sha256:sha(response.body),matchesLocal:true,coverage:manifest.coverage,entries:manifest.entries.length};
}catch(error){report.errors.push({path:'review-manifest',error:String(error)});}
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<contracts.length){
    const frame=contracts[cursor++];
    try{
      const response=await request(frame.path,8000000);
      assert(response.type?.includes('image/png'));
      assert(response.body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
      assert.equal(sha(response.body),frame.generation.sha256);
      report.assets.push({path:frame.path,status:response.status,bytes:response.body.length,sha256:sha(response.body),requestId:response.requestId});
    }catch(error){report.errors.push({path:frame.path,error:String(error)});}
  }
}));
report.assets.sort((a,b)=>a.path.localeCompare(b.path));
report.passed=report.errors.length===0&&report.assets.length===80;
await fs.writeFile('work/v42/production-assets.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,assets:report.assets.length,errors:report.errors}));
assert(report.passed);
