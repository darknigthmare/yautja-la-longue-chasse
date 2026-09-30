import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const url=process.env.V62_PUBLIC_URL??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V62_PUBLIC_ASSETS_REPORT??'docs/v62-public-assets-qa.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function files(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const assets=(await files('public/game/sprites/v62')).filter(f=>/\.(png|webp)$/.test(f));
const checks=[];
for(const file of assets){const local=await fs.readFile(file),src='/'+file.replaceAll('\\','/').replace(/^public\//,'');
 const response=await fetch(new URL(src,url),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,src);
 const remote=Buffer.from(await response.arrayBuffer());assert.equal(hash(remote),hash(local),src+' bytes must equal validated local asset');
 checks.push({src,status:response.status,bytes:remote.length,sha256:hash(remote),contentType:response.headers.get('content-type')});
}
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);const html=await response.text();assert(html.includes('V62'),'HTML must identify current content version');
const report={status:'PASS',url,checkedAt:new Date().toISOString(),htmlVersion:'V62',nativePngs:checks.filter(c=>c.src.endsWith('.png')).length,derivedWebps:checks.filter(c=>c.src.endsWith('.webp')).length,checks};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',files:checks.length,report:output}));
