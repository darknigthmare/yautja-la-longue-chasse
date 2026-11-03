import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const url=process.env.V61_ASSET_QA_URL??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V61_ASSET_QA_OUTPUT??'work-local/v61/qa/served-assets.json';
const manifests=await Promise.all(['app/game/data/pitStageLifeV61.json','app/game/data/pitStageStoryV61.json'].map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
const records=new Map(manifests.flatMap(manifest=>manifest.stages.flatMap(stage=>stage.events.map(event=>[event.src,event.sha256]))));
assert(records.size>0);
for(const [src,sha] of records){assert(/^\/game\/sprites\/v61\/(pit-life|pit-story)\//.test(src));assert(/^[a-f0-9]{64}$/.test(sha));}
const queue=[...records],checks=[],failures=[];
await Promise.all(Array.from({length:4},async()=>{
 while(queue.length){const [src,expected]=queue.shift();try{
  const response=await fetch(new URL(src,url),{signal:AbortSignal.timeout(90000)});
  assert.equal(response.status,200,src);const contentType=response.headers.get('content-type')??'';assert.match(contentType,/image\/png/);
  const bytes=Buffer.from(await response.arrayBuffer()),sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,expected,src+' native bytes changed');
  checks.push({src,status:response.status,contentType,bytes:bytes.length,sha256});
 }catch(error){failures.push({src,error:error.message});}}
}));
const report={status:failures.length?'FAIL':'PASS',url,checkedAt:new Date().toISOString(),expectedPaths:records.size,uniqueNativePngs:new Set(records.values()).size,checks:checks.sort((a,b)=>a.src.localeCompare(b.src)),failures};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,url,passed:checks.length,failed:failures.length,output}));
assert.equal(failures.length,0,'See served-assets report');
