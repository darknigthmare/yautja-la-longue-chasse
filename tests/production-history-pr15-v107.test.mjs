import test from 'node:test';
import assert from 'node:assert/strict';
import {getHistoricalProductionPr15V107,runHistoricalProductionPr15V107,verifyHistoricalProductionPr15V107,PRODUCTION_HISTORY_COMMIT_PR15_V107} from '../scripts/historical-production-context-pr15-v107.mjs';

test('the exact PR15 production proofs and strict V614/V615 runtime delta assertions pass in their original private context',async t=>{
 const context=await getHistoricalProductionPr15V107();assert.notEqual(context.root,process.cwd());assert.equal(context.manifest.sourceCommit,PRODUCTION_HISTORY_COMMIT_PR15_V107);
 const result=await runHistoricalProductionPr15V107(['tests/production-proofs-v106.test.mjs']);assert.equal(result.currentRuntimeCovered,false);assert.match(result.output,/# tests 4(?:\r?\n|$)/);t.diagnostic(result.output);
});
test('the historical overlay preserves17 original workbooks and does not expand V106 coverage to V107',async()=>{
 const result=await verifyHistoricalProductionPr15V107();assert.equal(result.originalWorkbooksPreserved,17);assert.equal(result.currentRuntimeCovered,false);assert.equal(result.sourceCommit,PRODUCTION_HISTORY_COMMIT_PR15_V107);
});
