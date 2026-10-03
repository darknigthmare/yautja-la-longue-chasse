import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const url=process.env.V77_NATIVE_QA_URL;
assert(url,'V77_NATIVE_QA_URL is required');
const output=process.env.V77_NATIVE_QA_OUTPUT??'work-local/v77/qa/native-public.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const registries=await Promise.all([
 read('app/game/data/homeworldFaunaArtV77.json'),read('app/game/data/homeworldConceptRefsV77.json'),
 read('app/game/data/homeworldConnectorArtV77.json'),read('app/game/data/homeworldLavaArtV77.json'),read('app/game/data/homeworldFaunaHabitatV77.json'),
]);
const assets=registries.flatMap(v=>Array.isArray(v)?v:v.assets??[v]),results=[];
assert.equal(assets.length,19);
const checks=await Promise.allSettled(assets.map(async art=>{
 const width=art.sourceWidth??art.width,height=art.sourceHeight??art.height;
 const r=await fetch(new URL(art.src,url));assert.equal(r.status,200,art.src);assert.match(r.headers.get('content-type'),/image\/png/);
 const bytes=Buffer.from(await r.arrayBuffer());const sha256=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,art.sha256,art.src);
 assert.equal(bytes.readUInt32BE(16),width,art.src);assert.equal(bytes.readUInt32BE(20),height,art.src);
 return {src:art.src,status:r.status,sha256,width,height,bytes:bytes.length};
}));
const failures=checks.filter(r=>r.status==='rejected').map(r=>String(r.reason));
for(const r of checks)if(r.status==='fulfilled')results.push(r.value);
await fs.mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});
await fs.writeFile(output,JSON.stringify({status:failures.length?'FAIL':'PASS',url,checkedAt:new Date().toISOString(),results,failures},null,2)+'\n');
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',nativePNG:results.length,failures}));
if(failures.length)process.exitCode=1;
