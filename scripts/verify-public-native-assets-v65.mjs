import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=process.env.V65_PUBLIC_BASE??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V65_PUBLIC_ASSET_REPORT??'work-local/v65/qa/public-native-assets.json';
async function walk(directory) {
  const entries=await fs.readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]))).flat();
}
const files=(await Promise.all(['public/game/homeworld/v64','public/game/sprites/v65'].map(walk))).flat().filter(file=>file.endsWith('.png')).sort();
assert.equal(files.length,22,'10 Homeworld images and 12 stage images are required for this release');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
for(let index=0;index<files.length;index+=4) {
  checks.push(...await Promise.all(files.slice(index,index+4).map(async file=>{
    const asset='/'+path.relative('public',file).split(path.sep).join('/');
    const local=await fs.readFile(file);
    const response=await fetch(new URL(asset,base),{signal:AbortSignal.timeout(120000)});
    const remote=Buffer.from(await response.arrayBuffer());
    return {asset,status:response.status,contentType:response.headers.get('content-type'),bytes:remote.length,localSha256:sha(local),remoteSha256:sha(remote),match:response.ok&&sha(local)===sha(remote)};
  })));
}
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify({status:checks.every(check=>check.match)?'PASS':'FAIL',base,checkedAt:new Date().toISOString(),checks},null,2)+'\n');
assert(checks.every(check=>check.match),'every deployed native image must match the reviewed local file');
console.log(JSON.stringify({status:'PASS',assets:checks.length,output}));
