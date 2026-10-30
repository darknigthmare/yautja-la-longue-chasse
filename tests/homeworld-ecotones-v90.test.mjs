import test from 'node:test';
import assert from 'node:assert/strict';
import {runHistoricalEcotonesV90FromV112} from '../scripts/historical-excel-context-homeworld-v112.mjs';

// V112 replaces the active ecotone provider. The seven V90 assertions remain
// byte-exact in the private def899ad capsule, alongside their original app.
// Current placement/rendering criteria are exercised by the V112 test file.
test('the seven original V90 ecotone assertions pass against their exact historical renderer', async () => {
  const result = await runHistoricalEcotonesV90FromV112();
  assert.equal(result.currentRuntimeCovered, false);
  assert.match(result.output, /# tests 7\n/); assert.match(result.output, /# pass 7\n/);
  process.stdout.write(result.output);
});
