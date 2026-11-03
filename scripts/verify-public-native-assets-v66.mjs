import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=process.env.V66_PUBLIC_BASE??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V66_PUBLIC_ASSET_REPORT??'work-local/v66/public-native-assets.json';
const manifest=JSON.parse(await fs.readFile('app/game/data/pitStageLifeV66.json','utf8'));
const sources=[...new Set(manifest.stages.flatMap(stage=>stage.events.map(event=>event.src)))];
assert.equal(sources.length,9,'This release must deliver nine independent native animation sheets.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
for(let index=0;index<sources.length;index+=3) {
  checks.push(...await Promise.all(sources.slice(index,index+3).map(async asset=>{
    assert(/^\/game\/sprites\/v66\/pit-life\/[a-z0-9-]+\/ambient-0[123]\.png$/.test(asset));
    const local=await fs.readFile(path.join('public',asset.slice(1)));
    const response=await fetch(new URL(asset,base),{signal:AbortSignal.timeout(60000)});
    const remote=Buffer.from(await response.arrayBuffer());
    const contentType=response.headers.get('content-type');
    return {asset,status:response.status,contentType,bytes:remote.length,localSha256:sha(local),remoteSha256:sha(remote),match:response.ok&&contentType?.includes('image/png')&&sha(local)===sha(remote)};
  })));
}
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify({status:checks.every(check=>check.match)?'PASS':'FAIL',base,checkedAt:new Date().toISOString(),checks},null,2)+'\n');
assert(checks.every(check=>check.match),'Every deployed native image must match the reviewed local file.');
console.log(JSON.stringify({status:'PASS',assets:checks.length,output}));
