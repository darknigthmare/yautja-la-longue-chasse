import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const run=promisify(execFile);

test('real menus preserve keyboard focus and stay operable on narrow or short viewports', {timeout:120000}, async()=>{
 const tempRoot=path.resolve(os.tmpdir());
 const output=await fs.mkdtemp(path.join(tempRoot,'yautja-v46-accessibility-'));
 try{
  await run(process.execPath,['scripts/verify-accessibility-v46.mjs'],{cwd:process.cwd(),env:{...process.env,V46_ACCESSIBILITY_OUTPUT:output},maxBuffer:1024*1024});
  const report=JSON.parse(await fs.readFile(path.join(output,'report.json'),'utf8'));
  assert.equal(report.passed,true);
  assert.equal(report.checks.length,13);
  assert.deepEqual(report.errors,[]);
 }finally{
  // Only the dedicated temporary directory created above may be removed.
  assert.equal(path.dirname(path.resolve(output)),tempRoot);
  assert(path.basename(output).startsWith('yautja-v46-accessibility-'));
  await fs.rm(output,{recursive:true,force:true});
 }
});
