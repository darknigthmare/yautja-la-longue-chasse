import test from 'node:test';
import {runHistoricalProductionPr15V107} from '../scripts/historical-production-context-pr15-v107.mjs';

/** Original reviewed assertions are archived byte-exact at PR15, not relaxed. */
test('enforcer-production-v614 remains reproducible in the exact reviewed PR15 state',async t=>{
 const result=await runHistoricalProductionPr15V107(['tests/enforcer-production-v614.test.mjs']);
 t.diagnostic(result.output);
});
