/** Publication-only adapter. All other files matched by tests/*-v112.test.mjs
 * continue to use the current runtime. The nine original assertions below are
 * restored byte-for-byte from their published Git commit into a private copy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {HOMEWORLD_PUBLICATION_COMMIT_V112,HOMEWORLD_PUBLICATION_TEST_V112,
 prepareHistoricalHomeworldPublicationV112,verifyHistoricalHomeworldPublicationV112,
 checkHistoricalHomeworldPublicationV112} from '../scripts/check-homeworld-publication-history-v112.mjs';

test('immutable Homeworld V112 publication executes all nine original assertions and reproduces its original workbook',async()=>{
 const result=await checkHistoricalHomeworldPublicationV112({tests:true});
 assert.equal(result.result,'PASS_HISTORICAL_HOMEWORLD_PUBLICATION_V112');
 assert.equal(result.sourceCommit,HOMEWORLD_PUBLICATION_COMMIT_V112);
 assert.equal(result.originalAssertions,HOMEWORLD_PUBLICATION_TEST_V112.assertions);
 assert.equal(result.originalAssertions,9);assert.equal(result.originalTestFiles,1);
 assert.equal(result.publicationInputs,1791);assert.equal(result.frozenInputs,1563);
 assert.equal(result.bytes,9383908);
 assert.equal(result.sha256,'b29aa412000717cdfd81be1a60e2c2f9d8489c0b8b2ed5d29404668d04dd1d02');
 assert.equal(result.originalTestsExecuted,true);assert.equal(result.currentRuntimeCovered,false);
 assert.equal(result.originalRuntimeFreezeCheckExecuted,true);assert.equal(result.originalWorkbookCheckExecuted,true);
 assert.equal(result.originalNativeInventoryCheckExecuted,true);
 assert.equal(result.runtimeBrowserEvidenceReexecuted,false);assert.equal(result.nativeExcelExecuted,false);
});
test('private V112 publication rejects altered source and Git identity while keeping current files untouched',async()=>{
 const context=await prepareHistoricalHomeworldPublicationV112();
 const relative='app/game/ClanWarAtlasV95.tsx',current=await fs.readFile(relative);
 try{
  assert.equal((await fs.lstat(path.join(context.root,'.git'))).isSymbolicLink(),false);
  for(const relativePath of [relative,'.git/HEAD']){
   const target=path.join(context.root,relativePath),original=await fs.readFile(target);
   try{
    await fs.chmod(target,0o644);await fs.appendFile(target,'\n');await fs.chmod(target,0o444);
    await assert.rejects(verifyHistoricalHomeworldPublicationV112(context),/Historical V112 (?:publication size|Git HEAD) changed/);
   }finally{await fs.chmod(target,0o644);await fs.writeFile(target,original);await fs.chmod(target,0o444);}
  }
  await verifyHistoricalHomeworldPublicationV112(context);
  assert.deepEqual(await fs.readFile(relative),current);
 }finally{await context.dispose();}
});
