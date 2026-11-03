import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EXCEL_HISTORY_COMMIT_V106,getHistoricalExcelContextV106,loadHistoricalExcelV106,loadHistoricalRuntimeSnapshotV106,verifyHistoricalExcelContextV106} from '../scripts/historical-excel-context-v106.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('V105 history contains its complete all-app freeze without redirecting current imports', async () => {
  const context = await getHistoricalExcelContextV106();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V106);
  assert.equal(context.manifest.sources.length, 816);
  assert.equal(context.manifest.shared.length, 163);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 791);
  assert.equal(context.manifest.sources.some(row => /[Vv]106/.test(row.path)), false);
  assert.equal(context.manifest.products.V105[1].sha256, 'b0a317b339736d44bcf5b7dc11708749091740e2d9636e67beaa7751118f10bc');
  const historical = await loadHistoricalExcelV106('V105');
  const current = await import('../scripts/build-excel-followup-v105.mjs');
  assert.equal(historical.ROOT, context.root);
  assert.equal(current.ROOT, process.cwd());
  assert.notEqual(historical.ROOT, current.ROOT);
  const {snapshotRuntimeV105} = await loadHistoricalRuntimeSnapshotV106();
  const snapshot = await snapshotRuntimeV105();
  const freeze = JSON.parse(await fs.readFile(path.join(context.root,'docs/v105-runtime-freeze.json'),'utf8'));
  assert.equal(snapshot.files, 918);
  assert.deepEqual(snapshot, freeze);
  await assert.rejects(loadHistoricalExcelV106('V104'), /Historical release/);
});

test('published V105 products and evidence are shared only with exact before and after hashes', async () => {
  const context = await getHistoricalExcelContextV106();
  const source = context.manifest.sources.find(row => row.path === 'app/game/systems/pitCombat.ts');
  const privateFile = path.join(context.root, source.path);
  assert.equal((await fs.lstat(privateFile)).isSymbolicLink(), false);
  assert.equal((await fs.stat(privateFile)).mode & 0o222, 0);
  assert.equal(sha(await fs.readFile(privateFile)), source.sha256);
  for (const row of [context.manifest.shared.find(row => row.path.endsWith('.png')), context.manifest.products.V105[1]]) {
    assert.equal((await fs.lstat(path.join(context.root,row.path))).isSymbolicLink(), true);
    assert.equal(await fs.readlink(path.join(context.root,row.path)), path.join(process.cwd(),row.path));
  }
  assert.deepEqual(await verifyHistoricalExcelContextV106(), {sourceCommit:EXCEL_HISTORY_COMMIT_V106,sourcesVerified:816,sharedVerified:163});
});

test('a changed private V105 source is rejected while the immutable source in the current repository stays intact', async () => {
  const context = await getHistoricalExcelContextV106();
  const relative = 'app/game/data/pitWorkbookAnimationPlanV100.json', temporary = path.join(context.root,relative);
  const original = await fs.readFile(temporary), current = await fs.readFile(relative);
  try {
    await fs.chmod(temporary,0o644);
    await fs.appendFile(temporary,'\n');
    await assert.rejects(verifyHistoricalExcelContextV106(), /Historical input size changed: app\/game\/data\/pitWorkbookAnimationPlanV100\.json/);
  } finally {
    await fs.writeFile(temporary,original);
    await fs.chmod(temporary,0o444);
  }
  assert.deepEqual(await fs.readFile(relative),current);
  await verifyHistoricalExcelContextV106();
});
