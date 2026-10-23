import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EXCEL_HISTORY_COMMIT_V105, getHistoricalExcelContextV105, loadHistoricalExcelV105, verifyHistoricalExcelContextV105} from '../scripts/historical-excel-context-v105.mjs';

test('historical Excel collectors use a bounded original closure and leave current runtime imports alone', async () => {
  const context = await getHistoricalExcelContextV105();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V105);
  assert.equal(context.manifest.sources.length, 239);
  assert.equal(context.manifest.shared.length, 235);
  assert.equal(context.manifest.products.V104[1].sha256, 'ce78bac96ae57cbee732bc868acecd46b0dc57e5ade49f669fb15c8b12ea03aa');
  const v100 = await loadHistoricalExcelV105('V100'), v104 = await loadHistoricalExcelV105('V104');
  assert.equal(v100.ROOT, context.root);
  assert.equal(v104.ROOT, context.root);
  assert.notEqual(context.root, process.cwd());
  assert.equal(path.basename(context.root).startsWith('yautja-excel-history-v104-'), true);
  assert.ok(context.manifest.sources.some(row => row.path === 'app/game/systems/pitCombat.ts'));
  assert.equal(context.manifest.sources.some(row => /V105\.(ts|tsx)$/.test(row.path)), false);
  const currentCollector = await import('../scripts/build-excel-followup-v104.mjs');
  assert.equal(currentCollector.ROOT, process.cwd());
  await assert.rejects(loadHistoricalExcelV105('V105'), /Historical release/);
});

test('sources are private copies while unchanged assets and original products are verified shared inputs', async () => {
  const context = await getHistoricalExcelContextV105();
  const source = context.manifest.sources.find(row => row.path === 'app/game/systems/pitCombat.ts');
  const sourcePath = path.join(context.root, source.path), stat = await fs.lstat(sourcePath);
  assert.equal(stat.isSymbolicLink(), false);
  assert.equal(stat.mode & 0o222, 0);
  assert.equal(createHash('sha256').update(await fs.readFile(sourcePath)).digest('hex'), source.sha256);
  for (const row of [context.manifest.shared.find(row => row.path.endsWith('.png')), context.manifest.products.V104[1]]) {
    assert.equal((await fs.lstat(path.join(context.root, row.path))).isSymbolicLink(), true);
    assert.equal(await fs.readlink(path.join(context.root, row.path)), path.join(process.cwd(), row.path));
  }
  const result = await verifyHistoricalExcelContextV105();
  assert.deepEqual(result, {sourceCommit: EXCEL_HISTORY_COMMIT_V105, sourcesVerified: 239, sharedVerified: 235});
});

test('tampering with a temporary historical source copy is rejected and never touches current source', async () => {
  const context = await getHistoricalExcelContextV105();
  const relative = 'app/game/systems/pitCombat.ts', temporary = path.join(context.root, relative);
  const bytes = await fs.readFile(temporary), current = await fs.readFile(relative);
  try {
    await fs.chmod(temporary, 0o644);
    await fs.appendFile(temporary, '\n// tampered temporary fixture\n');
    await assert.rejects(verifyHistoricalExcelContextV105(), /Historical input size changed: app\/game\/systems\/pitCombat\.ts/);
  } finally {
    await fs.writeFile(temporary, bytes);
    await fs.chmod(temporary, 0o444);
  }
  assert.deepEqual(await fs.readFile(relative), current);
  await verifyHistoricalExcelContextV105();
});
