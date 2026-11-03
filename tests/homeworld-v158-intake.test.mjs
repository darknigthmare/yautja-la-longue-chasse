import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, cpSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'production/homeworld-v158/manifest.json'),'utf8'));
const script=path.join(root,'scripts/verify-homeworld-v158.mjs');
const run=(args=[])=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
test('ten tracked IDs, bytes present, no artistic promotion',()=>{
 assert.deepEqual(manifest.candidates.map(a=>a.id),Array.from({length:10},(_,i)=>'HW'+(1031+i)));
 assert.ok(manifest.candidates.every(a=>a.sourceInGit && a.artState==='CANDIDATE_NOT_ADMITTED'));
 assert.equal(manifest.runtime.integrated,false);assert.equal(manifest.canon.claim1to1,false);
});
test('default verification reads the actual committed PNGs',()=>{
 const r=run();assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/original PNG files verified/);
});
test('strict mode refuses missing files',()=>{
 const d=mkdtempSync(path.join(tmpdir(),'hw158-missing-'));
 try{const r=run(['--assets-dir',d]);assert.notEqual(r.status,0);assert.match(r.stderr,/missing PNG HW1031/);}
 finally{rmSync(d,{recursive:true,force:true});}
});
test('corrupted PNG cannot pass the byte/hash gate',()=>{
 const d=mkdtempSync(path.join(tmpdir(),'hw158-corrupt-'));
 try{
  cpSync(path.join(root,'production/homeworld-v158/assets'),d,{recursive:true});
  appendFileSync(path.join(d,manifest.candidates[0].originalArchivePath),Buffer.from([0]));
  const r=run(['--assets-dir',d]);assert.notEqual(r.status,0);assert.match(r.stderr,/byte count changed HW1031/);
 }finally{rmSync(d,{recursive:true,force:true});}
});
