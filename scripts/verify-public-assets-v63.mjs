import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL(process.env.V63_ASSET_QA_URL??'https://yautja-la-longue-chasse.vercel.app');
const output=process.env.V63_ASSET_QA_REPORT??'work-local/v63/qa/public-assets.json';
assert(['http:','https:'].includes(base.protocol)&&!base.username&&!base.password);
const root='public/game/sprites/v63';
async function files(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const targets=(await files(root)).filter(f=>f.endsWith('.png')).sort();
assert.equal(targets.length,13,'the published V63 art lot must contain exactly the accepted thirteen PNGs');
const sha=b=>createHash('sha256').update(b).digest('hex'),checks=[];
for(const file of targets){
 const local=await fs.readFile(file),pathname='/'+path.relative('public',file).replaceAll('\\','/');
 const response=await fetch(new URL(pathname,base));const bytes=Buffer.from(await response.arrayBuffer());
 checks.push({path:pathname,status:response.status,bytes:bytes.length,sha256:sha(bytes),expected:sha(local)});
 assert.equal(response.status,200,pathname);assert.equal(sha(bytes),sha(local),pathname);
}
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({status:'PASS',url:base.href,checkedAt:new Date().toISOString(),checks,scope:'HTTP status and exact SHA256 of every accepted V63 bitmap; separate gameplay QA remains required.'},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',files:checks.length,output}));
