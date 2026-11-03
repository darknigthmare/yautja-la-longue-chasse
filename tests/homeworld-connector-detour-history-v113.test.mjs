import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {prepareR7PublicationV113,verifyR7PublicationV113,R7_PUBLICATION_COMMIT_V113} from '../scripts/check-homeworld-publication-history-v112-r7.mjs';

const run=promisify(execFile);
const fixture=new URL('./fixtures/homeworld-connector-detour-03cf-v113.test.mjs.txt',import.meta.url);
const FIXTURE_SHA256='a94b30426247c0a44f321df89f00dd3307fa108fded61e1a17ed7308c7c4216e';

/** Preserve all original assertions, including exactly1421 carrying steps and
 * >7100 genuine world units, on the authentic03cf private app. Only the import
 * location is redirected; no motor, ledger, coordinate or assertion is changed.
 * The temporary runner stays OUTSIDE the strict1895-file R7 capsule. */
test('historical03cf connector assertions retain1421 real steps without certifying the current route',{timeout:240000},async t=>{
  const bytes=await fs.readFile(fixture);
  assert.equal(bytes.length,15933);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),FIXTURE_SHA256);
  const originalImport="import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';";
  assert.equal(bytes.toString().split(originalImport).length,2);
  let context,temporary;
  try{
    context=await prepareR7PublicationV113();
    assert.equal(context.sourceCommit,R7_PUBLICATION_COMMIT_V113);
    temporary=await fs.mkdtemp(path.join(os.tmpdir(),'connector-03cf-assertions-'));
    const helper=pathToFileURL(path.join(context.root,'tests/helpers/cargo-v108-route.mjs')).href;
    const source=bytes.toString().replace(originalImport,`import {cargoRouteV108} from ${JSON.stringify(helper)};`);
    const runner=path.join(temporary,'historical-connectors.test.mjs');await fs.writeFile(runner,source);
    const env={...process.env};delete env.NODE_TEST_CONTEXT;
    const {stdout,stderr}=await run(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',runner],{
      cwd:context.root,timeout:180000,maxBuffer:4*1024*1024,env,
    });
    assert.match(stdout,/# pass 6\b/);assert.match(stdout,/# fail 0\b/);assert.match(stdout,/# skipped 0\b/);
    assert.equal(stderr,'');
    const integrity=await verifyR7PublicationV113(context);
    assert.equal(integrity.privateRegularFiles,1895);assert.equal(integrity.currentRuntimeCovered,false);
    t.diagnostic('Exact03cf source fixture:6original assertions PASS,0skips;1421 and>7100 retained; currentRuntimeCovered=false.');
  }finally{
    if(temporary)await fs.rm(temporary,{recursive:true,force:true});
    await context?.dispose();
  }
});
