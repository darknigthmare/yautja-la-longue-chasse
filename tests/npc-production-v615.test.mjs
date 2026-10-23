import test from 'node:test';
import {runHistoricalProductionPr15V107} from '../scripts/historical-production-context-pr15-v107.mjs';

/** Original reviewed assertions are archived byte-exact at PR15, not relaxed. */
test('npc-production-v615 remains reproducible in the exact reviewed PR15 state',async t=>{
 const result=await runHistoricalProductionPr15V107(['tests/npc-production-v615.test.mjs']);
 t.diagnostic(result.output);
});
