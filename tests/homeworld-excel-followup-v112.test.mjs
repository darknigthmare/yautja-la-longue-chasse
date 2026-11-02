/** Historical publication adapter only. All other V112 models import the current app. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkR7PublicationV113,R7_PUBLICATION_COMMIT_V113,R7_RUNTIME_COMMIT_V113} from '../scripts/check-homeworld-publication-history-v112-r7.mjs';

test('historical R7 publication runs all nine unchanged assertions and three original CLIs in its private source',{timeout:480000},async()=>{
 const result=await checkR7PublicationV113();
 assert.equal(result.status,'PASS_HISTORICAL_R7_PUBLICATION');
 assert.equal(result.sourceCommit,R7_PUBLICATION_COMMIT_V113);
 assert.equal(result.runtimeCommit,R7_RUNTIME_COMMIT_V113);
 assert.equal(result.originalAssertions,9);assert.equal(result.originalTestsExecuted,true);
 assert.equal(result.originalCommandsExecuted,3);assert.equal(result.publicationInputs,1891);
 assert.equal(result.frozenInputs,1649);assert.equal(result.publicationRegularFiles,1894);
 assert.equal(result.originalTestFixtureFiles,1);assert.equal(result.privateRegularFiles,1895);
 assert.equal(result.commands[2].result.bytes,9433700);
 assert.equal(result.commands[2].result.sha256,'723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc');
 assert.equal(result.currentRuntimeCovered,false);
 assert.equal(result.runtimeBrowserEvidenceReexecuted,false);assert.equal(result.nativeExcelExecuted,false);
 process.stdout.write(result.originalTestOutput);
 for(const command of result.commands)process.stdout.write(command.stdout);
});
