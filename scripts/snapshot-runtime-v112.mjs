/** V112 owns its runtime identity; published V111 inputs remain historical. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';
import {local, proofShape} from './lib/excel-followup-evidence.mjs';

export const V112_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const V112_RECIPES = Object.freeze({
  Homeworld: 'scripts/qa-homeworld-public-spaces-v112.mjs',
  Pit: 'scripts/qa-pit-backward-throws-v112.mjs',
});
export const V112_JOURNEYS = Object.freeze({
  Homeworld: Object.freeze(['Foundations', 'PublicPlaces', 'PublicLife', 'InteriorArrival', 'Mobile', 'UpgradeRecovery']),
  Pit: Object.freeze(['FeralScar', 'ScarFeral']),
});
export const V111_FREEZE_INPUT_V112 = Object.freeze({
  path: 'docs/v111-runtime-freeze.json', bytes: 264999,
  sha256: '8eee8a5f5a043f2a67477bc6bcff97fffb1ee1666864bd7aed60c7a6c21ca138',
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function fingerprintV112(root, file) {
  assert.ok(local(file)); const bytes = await fs.readFile(path.join(root, file));
  return {path: file, bytes: bytes.length, sha256: sha(bytes)};
}
async function walk(root, directory) {
  const entries = await fs.readdir(path.join(root, directory), {withFileTypes: true});
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(root, directory + '/' + entry.name)
    : entry.isFile() ? [directory + '/' + entry.name] : []))).flat();
}

/** Include transitive real fixture loaders, rather than just the top recipe. */
export async function collectV112RecipeInputs(root = V112_ROOT) {
  const seen = new Set();
  async function visit(file) {
    assert.ok(local(file)); if (seen.has(file)) return; seen.add(file);
    if (file.startsWith('app/') || !/\.[cm]?[jt]sx?$/.test(file)) return;
    const source = ts.createSourceFile(file, await fs.readFile(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
      const candidate = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier.text));
      assert.ok(local(candidate)); let next;
      for (const suffix of ['', '.mjs', '.js', '.ts', '.tsx', '.json']) {
        try {if ((await fs.stat(path.join(root, candidate + suffix))).isFile()) {next = candidate + suffix; break;}}
        catch (error) {if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;}
      }
      assert.ok(next, 'Missing actual recipe dependency: ' + candidate); await visit(next);
    }
  }
  for (const recipe of Object.values(V112_RECIPES)) await visit(recipe);
  return [...seen].sort();
}

/** V112 PNGs and their unedited source receipts are explicit, pinned inputs. */
export async function verifyNativeInputsV112(root, historical, inventory) {
  assert.equal(inventory.release, 'V112'); assert.equal(inventory.schemaVersion, 1);
  assert.ok(Array.isArray(inventory.assets) && Array.isArray(inventory.provenance));
  assert.ok(Array.isArray(inventory.runtimeAssets) && inventory.runtimeAssets.every(file => local(file) && file.startsWith('public/')));
  assert.equal(new Set(inventory.runtimeAssets).size, inventory.runtimeAssets.length);
  const old = new Set(historical.map(row => row.path));
  const rows = [...inventory.assets, ...inventory.provenance];
  assert.equal(new Set(rows.map(row => row.path)).size, rows.length);
  assert.ok(!inventory.assets.length || inventory.provenance.length, 'New artwork needs original provenance');
  for (const row of inventory.assets) {
    proofShape(row); assert.ok(row.path.startsWith('public/'));
    assert.ok(!old.has(row.path), 'New art cannot replace a published native input');
  }
  for (const row of inventory.provenance) {
    proofShape(row);
    assert.ok(row.path.startsWith('art-source/v112/') || row.path.startsWith('art-source/v112-pit-backward/') || row.path.startsWith('docs/suivi-production/v112'));
  }
  for (const row of rows) assert.deepEqual(await fingerprintV112(root, row.path), row, 'Declared native bytes changed: ' + row.path);
  const bank = (await walk(root, 'public/game')).filter(file => /\/v112\//.test(file));
  const declared = new Set(inventory.assets.map(row => row.path));
  for (const file of bank) assert.ok(declared.has(file), 'V112 native input absent from inventory: ' + file);
  return rows;
}

export async function snapshotRuntimeV112({root = V112_ROOT} = {}) {
  const baseline = await fingerprintV112(root, V111_FREEZE_INPUT_V112.path);
  assert.deepEqual(baseline, V111_FREEZE_INPUT_V112, 'Published V111 freeze must remain byte-exact');
  const previous = JSON.parse(await fs.readFile(path.join(root, baseline.path), 'utf8'));
  assert.equal(previous.entries.length, previous.files); previous.entries.forEach(proofShape);
  const immutable = previous.entries.filter(row => /^(?:public|art-source|docs\/suivi-production)\//.test(row.path));
  for (const row of immutable) assert.deepEqual(await fingerprintV112(root, row.path), row, 'Published native input changed: ' + row.path);
  const inventoryPath = 'docs/v112-runtime-public-inputs.json';
  const inventory = JSON.parse(await fs.readFile(path.join(root, inventoryPath), 'utf8'));
  const native = await verifyNativeInputsV112(root, immutable, inventory);
  const files = [...new Set([
    ...await walk(root, 'app'), ...previous.entries.filter(row => !row.path.startsWith('app/')).map(row => row.path),
    baseline.path, inventoryPath, ...native.map(row => row.path),
    ...await collectV112RecipeInputs(root), 'scripts/snapshot-runtime-v112.mjs',
    'scripts/build-runtime-public-inputs-v112.mjs',
    'scripts/build-pit-backward-art-v112.mjs',
    'tests/pit-backward-art-provenance-v112.test.mjs',
    'tests/pit-backward-throw-art-v112.test.mjs',
    'tests/pit-browser-worker-observation-v112.test.mjs',
    'docs/v112-production-proof-protocol.md',
    'tests/fixtures/excel-history-v111-homeworld-v112.json',
    'tests/fixtures/excel-history-v111-homeworld-v112.json.gz',
    ...await walk(root, 'tests/fixtures/homeworld-upgrade-v112'),
    'scripts/publish-validation-v112.mjs', 'tests/production-evidence-v112.test.mjs',
    ...(inventory.runtimeAssets ?? []),
  ])].sort();
  const entries = await Promise.all(files.map(file => fingerprintV112(root, file)));
  return {scope: 'All current app sources; preserved V111 configuration and original native inputs; complete V112 native bank and original provenance; declared existing runtime sprites; both complete V112 browser recipes, their transitive fixture loaders and publication tools. Generated V112 reports, captures, freeze and workbooks are excluded.',
    baseline, files: entries.length, bytes: entries.reduce((n, row) => n + row.bytes, 0), entries};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, file, ...extra] = process.argv.slice(2);
  assert.ok(['--write', '--check'].includes(mode) && file && !extra.length);
  const bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV112(), null, 2) + '\n');
  if (mode === '--check') assert.deepEqual(await fs.readFile(file), bytes, 'Runtime changed since V112 freeze');
  else await fs.writeFile(file, bytes);
  console.log(JSON.stringify({status: mode === '--check' ? 'PASS' : 'SNAPSHOT_WRITTEN', path: file, bytes: bytes.length, sha256: sha(bytes)}));
}
