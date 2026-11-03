import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  V113_PRODUCTION_PUBLICATION_COMMIT, V113_PRODUCTION_RUNTIME_COMMIT, V113_PRODUCTION_BUILD_ID,
  prepareProductionHistoryV113, verifyProductionHistoryV113, verifyProductionCurrentInputsUnchangedV113,
  runProductionHistoryV113,
} from '../scripts/check-production-history-v113.mjs';

let context, currentFreeze;
test.before(async () => {
  currentFreeze = await fs.readFile('docs/v113-runtime-freeze.json');
  context = await prepareProductionHistoryV113();
});
test.after(async () => {await context?.dispose();});

test('the V113 publication retains the certified runtime, both domains and all original captures in private regular files', async () => {
  const result = await verifyProductionHistoryV113(context);
  assert.equal(result.sourceCommit, V113_PRODUCTION_PUBLICATION_COMMIT);
  assert.equal(result.runtimeCommit, V113_PRODUCTION_RUNTIME_COMMIT);
  assert.equal(result.buildId, V113_PRODUCTION_BUILD_ID);
  assert.equal(result.frozenInputs, 1964); assert.equal(result.privateRegularFiles, 2049);
  assert.equal(result.certificateFiles, 84); assert.equal(result.captures, 78);
  assert.equal(result.currentRuntimeCovered, false); assert.notEqual(context.root, process.cwd());
  for (const directory of ['app', 'docs', 'public', 'art-source', '.git']) assert.equal((await fs.lstat(path.join(context.root, directory))).isSymbolicLink(), false);
});

test('the unchanged V113 freeze check and complete original production assertion validate their published sources', {timeout: 600000}, async () => {
  let result;
  try {result = await runProductionHistoryV113(context);}
  catch (error) {if (error.stdout) process.stdout.write(error.stdout); if (error.stderr) process.stderr.write(error.stderr); throw error;}
  assert.equal(result.status, 'PASS_HISTORICAL_V113_PRODUCTION');
  assert.equal(result.originalTestExecuted, 'tests/homeworld-current-production-v113.test.mjs');
  assert.equal(result.originalAssertions, 1); assert.equal(result.originalCommandsExecuted, 2);
  assert.equal(result.currentRuntimeCovered, false); assert.equal(result.runtimeBrowserEvidenceReexecuted, false);
  assert.equal(result.currentInputsUnchanged, 2049);
  assert.deepEqual(await fs.readFile('docs/v113-runtime-freeze.json'), currentFreeze, 'The later current freeze must not be rewritten to fit the older certificates');
  for (const output of result.outputs) process.stdout.write(output);
});

test('private V113 sources, certificate metadata and Git identity cannot be altered to satisfy the original assertion', async () => {
  for (const relative of ['app/game/systems/campaignSlots.ts', 'docs/v113-homeworld-validation.json', '.git/HEAD']) {
    const file = path.join(context.root, relative), before = await fs.readFile(file);
    try {
      await fs.chmod(file, 0o644); await fs.appendFile(file, '\n'); await fs.chmod(file, 0o444);
      await assert.rejects(verifyProductionHistoryV113(context), /V113 historical (?:input|HEAD) changed/);
    } finally {await fs.chmod(file, 0o644); await fs.writeFile(file, before); await fs.chmod(file, 0o444);}
  }
  await verifyProductionHistoryV113(context); await verifyProductionCurrentInputsUnchangedV113(context);
});

test('substituted contexts, extra application files and symlinked evidence directories cannot change the historical source boundary', async () => {
  await assert.rejects(verifyProductionHistoryV113({...context}), /Unrecognized V113 historical context/);
  const root = context.root, runtime = context.runtimeCommit;
  try {context.root = process.cwd(); await assert.rejects(verifyProductionHistoryV113(context), /context root changed/);} finally {context.root = root;}
  try {context.runtimeCommit = V113_PRODUCTION_PUBLICATION_COMMIT; await assert.rejects(verifyProductionHistoryV113(context), /context runtime changed/);} finally {context.runtimeCommit = runtime;}
  const extra = path.join(root, 'app/unreviewed-v113.ts');
  try {await fs.writeFile(extra, 'export const unreviewed = true;'); await assert.rejects(verifyProductionHistoryV113(context), /Unexpected V113 historical input/);} finally {await fs.rm(extra);}
  const directory = path.join(root, 'docs'), moved = path.join(root, 'private-docs-moved');
  try {
    await fs.rename(directory, moved); await fs.symlink(path.resolve('docs'), directory, 'dir');
    await assert.rejects(verifyProductionHistoryV113(context), /historical directory contains a symlink/);
  } finally {await fs.unlink(directory); await fs.rename(moved, directory);}
  await verifyProductionHistoryV113(context); await verifyProductionCurrentInputsUnchangedV113(context);
});
