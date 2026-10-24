import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EXCEL_HISTORY_COMMIT_V107,getHistoricalExcelContextV107,loadHistoricalExcelV107,loadHistoricalRuntimeSnapshotV107,verifyHistoricalExcelContextV107} from '../scripts/historical-excel-context-v107.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('V106 history contains its complete all-app freeze without redirecting current imports', async () => {
  const context = await getHistoricalExcelContextV107();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V107);
  assert.equal(context.manifest.sources.length, 842);
  assert.equal(context.manifest.shared.length, 185);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 812);
  assert.equal(context.manifest.sources.some(row => /[Vv]107/.test(row.path)), false);
  assert.equal(context.manifest.products.V106[1].sha256, '1994f345308b91555021b216146652108f25df93067f7398606af774472af04e');
  const historical = await loadHistoricalExcelV107('V106');
  const current = await import('../scripts/build-excel-followup-v106.mjs');
  assert.equal(historical.ROOT, context.root);
  assert.equal(current.ROOT, process.cwd());
  assert.notEqual(historical.ROOT, current.ROOT);
  const {snapshotRuntimeV106} = await loadHistoricalRuntimeSnapshotV107();
  const snapshot = await snapshotRuntimeV106();
  const freeze = JSON.parse(await fs.readFile(path.join(context.root,'docs/v106-runtime-freeze.json'),'utf8'));
  assert.equal(snapshot.files, 963);
  assert.deepEqual(snapshot, freeze);
  await assert.rejects(loadHistoricalExcelV107('V104'), /Historical release/);
});

test('published V106 products and evidence are shared only with exact before and after hashes', async () => {
  const context = await getHistoricalExcelContextV107();
  const source = context.manifest.sources.find(row => row.path === 'app/game/systems/pitCombat.ts');
  const privateFile = path.join(context.root, source.path);
  assert.equal((await fs.lstat(privateFile)).isSymbolicLink(), false);
  assert.equal((await fs.stat(privateFile)).mode & 0o222, 0);
  assert.equal(sha(await fs.readFile(privateFile)), source.sha256);
  for (const row of [context.manifest.shared.find(row => row.path.endsWith('.png')), context.manifest.products.V106[1]]) {
    assert.equal((await fs.lstat(path.join(context.root,row.path))).isSymbolicLink(), true);
    assert.equal(await fs.readlink(path.join(context.root,row.path)), path.join(process.cwd(),row.path));
  }
  assert.deepEqual(await verifyHistoricalExcelContextV107(), {sourceCommit:EXCEL_HISTORY_COMMIT_V107,sourcesVerified:842,sharedVerified:185});
});

test('a changed private V106 source is rejected while the immutable source in the current repository stays intact', async () => {
  const context = await getHistoricalExcelContextV107();
  const relative = 'app/game/data/pitWorkbookAnimationPlanV100.json', temporary = path.join(context.root,relative);
  const original = await fs.readFile(temporary), current = await fs.readFile(relative);
  try {
    await fs.chmod(temporary,0o644);
    await fs.appendFile(temporary,'\n');
    await assert.rejects(verifyHistoricalExcelContextV107(), /Historical input size changed: app\/game\/data\/pitWorkbookAnimationPlanV100\.json/);
  } finally {
    await fs.writeFile(temporary,original);
    await fs.chmod(temporary,0o444);
  }
  assert.deepEqual(await fs.readFile(relative),current);
  await verifyHistoricalExcelContextV107();
});
