import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {restoreChangedFrozenSourceV112} from '../scripts/check-excel-history-v112.mjs';
const digest = value => createHash('sha256').update(value).digest('hex');
const row = (path, bytes) => ({path,bytes:bytes.length,sha256:digest(bytes)});
test('historical preparation restores a newly changed frozen source and leaves current source/immutable evidence alone',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'history-v112-'));
 try {
  const old=Buffer.from('published source'), changed=Buffer.from('current source');
  await fs.mkdir(path.join(root,'app'),{recursive:true});await fs.mkdir(path.join(root,'docs'));
  await fs.writeFile(path.join(root,'app/newly-edited.ts'),changed);
  await fs.writeFile(path.join(root,'docs/proof.json'),changed);
  let calls=0;
  const count=await restoreChangedFrozenSourceV112(root,{entries:[row('app/newly-edited.ts',old),row('docs/proof.json',old)]},async file=>{
   calls++;assert.equal(file,'app/newly-edited.ts');return old;
  });
  assert.equal(count,1);assert.equal(calls,1);
  assert.deepEqual(await fs.readFile(path.join(root,'app/newly-edited.ts')),old);
  assert.deepEqual(await fs.readFile(path.join(root,'docs/proof.json')),changed);
  assert.equal((await fs.stat(path.join(root,'app/newly-edited.ts'))).mode&0o222,0);
  assert.equal(await restoreChangedFrozenSourceV112(root,{entries:[row('app/newly-edited.ts',old)]},async()=>{throw Error('unchanged source must not reread');}),0);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('historical restoration refuses wrong pinned bytes before changing any source',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'history-v112-reject-'));
 try{
  const old=Buffer.from('correct bytes'),current=Buffer.from('current bytes');
  await fs.mkdir(path.join(root,'app'));await fs.writeFile(path.join(root,'app/source.ts'),current);
  await assert.rejects(restoreChangedFrozenSourceV112(root,{entries:[row('app/source.ts',old)]},async()=>Buffer.from('bad preimages')),/Pinned source/);
  assert.deepEqual(await fs.readFile(path.join(root,'app/source.ts')),current);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('historical restoration rejects escaping paths and symlink parents',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'history-v112-paths-'));
 try{
  const bytes=Buffer.from('source');
  await assert.rejects(restoreChangedFrozenSourceV112(root,{entries:[row('../outside.ts',bytes)]},async()=>bytes),/Unsafe frozen/);
  await fs.mkdir(path.join(root,'safe'));await fs.mkdir(path.join(root,'app'));
  await fs.symlink(path.join(root,'safe'),path.join(root,'app','link'));
  await assert.rejects(restoreChangedFrozenSourceV112(root,{entries:[row('app/link/source.ts',bytes)]},async()=>bytes),/parent is a symlink/);
  await assert.rejects(fs.stat(path.join(root,'safe/source.ts')),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
