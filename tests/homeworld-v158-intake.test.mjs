import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'production/homeworld-v158/manifest.json'),'utf8'));
const script=path.join(root,'scripts/verify-homeworld-v158.mjs');
test('V158 records ten original city candidate IDs without false admission',()=>{
  assert.equal(manifest.candidates.length,10);
  assert.deepEqual(manifest.candidates.map(x=>x.id),Array.from({length:10},(_,i)=>'HW'+(1031+i)));
  assert.equal(manifest.runtime.integrated,false);
  assert.equal(manifest.canon.claim1to1,false);
  assert.ok(manifest.candidates.every(x=>x.artState==='CANDIDATE_NOT_ADMITTED' && !x.sourceInGit));
});
test('V158 metadata-only validation succeeds against the actual native camera',()=>{
  const run=spawnSync(process.execPath,[script],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/metadata only/);
});
test('V158 strict mode refuses missing binaries rather than admitting them',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'homeworld-v158-'));
  try{
    const run=spawnSync(process.execPath,[script,'--assets-dir',folder],{encoding:'utf8'});
    assert.notEqual(run.status,0);
    assert.match(run.stderr,/missing PNG HW1031/);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
