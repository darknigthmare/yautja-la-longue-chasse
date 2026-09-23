import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root='art-source/v43/pit-arenas';
const entries=[];
for(const arena of await fs.readdir(root,{withFileTypes:true})){
 if(!arena.isDirectory()||!/^arena-\d{3}-/.test(arena.name))continue;
 for(const name of (await fs.readdir(path.join(root,arena.name))).filter(n=>/^receipt-.*\.json$/.test(n))){
  const receiptPath=path.join(root,arena.name,name).replaceAll('\\','/');
  const receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
  assert(receipt.accepted&&receipt.generator==='openai-imagegen',receiptPath);
  assert(receipt.publicPath.startsWith('/game/sprites/v43/pit-arenas/'+arena.name+'/'));
  const bytes=await fs.readFile('public'+receipt.publicPath),hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,receipt.sha256,receiptPath);
  const metadata=await sharp(bytes).metadata();
  assert.equal(metadata.width,receipt.width);assert.equal(metadata.height,receipt.height);
  const original=await fs.readFile(receipt.originalSource);
  assert.equal(createHash('sha256').update(original).digest('hex'),hash,'Original must remain byte-identical');
  entries.push({arenaId:arena.name,id:name.slice(8,-5),path:receipt.publicPath,sha256:hash,width:metadata.width,height:metadata.height,bytes:bytes.length,receipt:receiptPath,prompt:receipt.prompt,mode:receipt.mode??'built-in'});
 }
}
entries.sort((a,b)=>a.path.localeCompare(b.path));
const report={checkedAt:new Date().toISOString(),generator:'openai-imagegen',mode:'built-in',passed:true,
 sourceImages:entries.length,uniqueImages:new Set(entries.map(e=>e.sha256)).size,backgrounds:entries.filter(e=>e.id==='p0-depth').length,
 detachableModules:entries.filter(e=>e.id!=='p0-depth').length,totalBytes:entries.reduce((sum,e)=>sum+e.bytes,0),
 originalsPreserved:true,exactSourcePixels:true,canonFidelity:'Original 2D adaptations. No scene is certified pixel-for-pixel or shot-for-shot identical to the film/game.',entries};
assert.equal(report.sourceImages,67);assert.equal(report.uniqueImages,67);assert.equal(report.backgrounds,36);assert.equal(report.detachableModules,31);
await fs.writeFile('docs/v43-openai-art-delivery.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,entries:undefined}));
