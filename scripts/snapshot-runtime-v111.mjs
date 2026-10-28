/** V111 extends the immutable V110 delivery without rewriting its freeze. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';
import {local, proofShape} from './lib/excel-followup-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const V111_RECIPE = 'scripts/qa-homeworld-continuation-v111.mjs';
export const V110_FREEZE_INPUT_V111 = Object.freeze({
  path: 'docs/v110-runtime-freeze.json', bytes: 256333,
  sha256: 'c54a5e97c199d16584a229f332692f5890874f5494b015657f66cf9659bfe3f1',
});
const proofScripts = [
  'scripts/snapshot-runtime-v111.mjs', 'scripts/publish-validation-homeworld-v111.mjs',
  'scripts/lib/excel-followup-evidence.mjs', 'tests/homeworld-evidence-v111.test.mjs',
];

async function walk(root, directory) {
  const entries = await fs.readdir(path.join(root, directory), {withFileTypes: true});
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(root, directory + '/' + entry.name)
    : entry.isFile() ? [directory + '/' + entry.name] : []))).flat();
}

/** Follow actual static relative imports of the recipe and fixture loaders.
 * Application imports need no separate traversal: the whole app is frozen.
 * Parsing avoids confusing embedded esbuild input strings with module imports. */
export async function collectV111RecipeInputs(root = ROOT) {
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
      assert.ok(local(candidate), 'Recipe import leaves the repository');
      let next;
      for (const suffix of ['', '.mjs', '.js', '.ts', '.tsx', '.json']) {
        try { if ((await fs.stat(path.join(root, candidate + suffix))).isFile()) { next = candidate + suffix; break; } }
        catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
      }
      assert.ok(next, 'Recipe dependency is missing: ' + candidate); await visit(next);
    }
  }
  await visit(V111_RECIPE); return [...seen].sort();
}

/** Validate explicit new native inputs separately from the immutable old bank.
 * Tests use temporary source bytes; production always pins the original files. */
export async function verifyV111NativeInputs(root, immutable, inventory) {
  assert.equal(inventory.schemaVersion, 1); assert.equal(inventory.release, 'V111');
  assert.ok(Array.isArray(inventory.assets) && Array.isArray(inventory.provenance) && Array.isArray(inventory.sourceDocuments));
  assert.ok(inventory.assets.length === 0 || inventory.provenance.length > 0, 'New native assets require source provenance');
  const newNativeRows = [...inventory.assets, ...inventory.provenance];
  assert.equal(new Set(newNativeRows.map(row => row.path)).size, newNativeRows.length);
  assert.equal(new Set(inventory.sourceDocuments).size, inventory.sourceDocuments.length);
  const historical = new Map(immutable.map(row => [row.path, row]));
  for (const row of inventory.assets) {proofShape(row); assert.ok(row.path.startsWith('public/')); assert.ok(!historical.has(row.path), 'A new V111 asset must not replace a historical native input');}
  let nativeBank = [];
  try {nativeBank = await walk(root, 'public/game/homeworld/v111');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  const declaredAssets = new Set(inventory.assets.map(row => row.path));
  for (const file of nativeBank) assert.ok(declaredAssets.has(file), 'A V111 native bank file is absent from the inventory: ' + file);
  for (const row of inventory.provenance) {proofShape(row); assert.ok(row.path.startsWith('art-source/v111/') || row.path.startsWith('docs/suivi-production/v111/'));}
  for (const row of newNativeRows) {const bytes = await fs.readFile(path.join(root, row.path)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'Pinned V111 native input changed: ' + row.path);}
  for (const file of inventory.sourceDocuments) assert.ok(local(file) && !file.startsWith('public/'));
  return newNativeRows;
}

export async function snapshotRuntimeV111({root = ROOT} = {}) {
  const baselineBytes = await fs.readFile(path.join(root, V110_FREEZE_INPUT_V111.path));
  assert.equal(baselineBytes.length, V110_FREEZE_INPUT_V111.bytes);
  assert.equal(sha(baselineBytes), V110_FREEZE_INPUT_V111.sha256, 'The historical V110 freeze must stay byte-exact');
  const previous = JSON.parse(baselineBytes);
  assert.ok(Array.isArray(previous.entries) && previous.entries.length === previous.files);
  assert.equal(new Set(previous.entries.map(row => row.path)).size, previous.entries.length);
  previous.entries.forEach(proofShape);
  const immutable = previous.entries.filter(row => row.path.startsWith('public/')
    || row.path.startsWith('art-source/') || row.path.startsWith('docs/suivi-production/'));
  assert.equal(immutable.filter(row => row.path.startsWith('public/')).length, 398);
  for (const row of immutable) {
    const bytes = await fs.readFile(path.join(root, row.path));
    assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'Historical native input changed: ' + row.path);
  }
  const inventoryPath = 'docs/v111-runtime-public-inputs.json';
  const inventory = JSON.parse(await fs.readFile(path.join(root, inventoryPath), 'utf8'));
  const newNativeRows = await verifyV111NativeInputs(root, immutable, inventory);
  const files = [...new Set([
    ...await walk(root, 'app'),
    ...previous.entries.filter(row => !row.path.startsWith('app/')).map(row => row.path),
    V110_FREEZE_INPUT_V111.path, ...await collectV111RecipeInputs(root), ...proofScripts,
    inventoryPath, ...newNativeRows.map(row => row.path), ...inventory.sourceDocuments,
  ])].sort();
  const entries = await Promise.all(files.map(async file => {
    assert.ok(local(file)); const bytes = await fs.readFile(path.join(root, file));
    return {path: file, sha256: sha(bytes), bytes: bytes.length};
  }));
  return {
    scope: 'All current app sources and prior production configuration; all 398 immutable V110 public inputs and original art provenance; the complete V111 native public bank, explicit new assets and provenance, if any; complete V111 browser recipe and transitive fixture loaders; V111 publication tools. Generated V111 freeze, reports, captures and workbooks are excluded.',
    baseline: V110_FREEZE_INPUT_V111, files: entries.length,
    bytes: entries.reduce((sum, row) => sum + row.bytes, 0), entries,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 2 && ['--write', '--check'].includes(args[0]), 'Usage: node scripts/snapshot-runtime-v111.mjs --write|--check output.json');
  const bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV111(), null, 2) + '\n');
  if (args[0] === '--check') assert.deepEqual(await fs.readFile(args[1]), bytes, 'Production runtime changed');
  else await fs.writeFile(args[1], bytes);
  console.log(JSON.stringify({status: args[0] === '--write' ? 'SNAPSHOT_WRITTEN' : 'PASS', path: args[1], sha256: sha(bytes), bytes: bytes.length}));
}
