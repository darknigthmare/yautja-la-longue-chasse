/** V110 extends the immutable V109 delivery without rewriting its freeze. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';
import {local, proofShape} from './lib/excel-followup-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const V110_RECIPE = 'scripts/qa-homeworld-coherence-v110.mjs';
export const V109_FREEZE_INPUT_V110 = Object.freeze({
  path: 'docs/v109-runtime-freeze.json', bytes: 251728,
  sha256: 'b4f097daa655b119051675bd7acc2540a90cb4fd466c69955de6c0858519c4c0',
});
const proofScripts = [
  'scripts/snapshot-runtime-v110.mjs', 'scripts/publish-validation-homeworld-v110.mjs',
  'scripts/lib/excel-followup-evidence.mjs', 'tests/homeworld-evidence-v110.test.mjs',
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
export async function collectV110RecipeInputs(root = ROOT) {
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
  await visit(V110_RECIPE); return [...seen].sort();
}

export async function snapshotRuntimeV110({root = ROOT} = {}) {
  const baselineBytes = await fs.readFile(path.join(root, V109_FREEZE_INPUT_V110.path));
  assert.equal(baselineBytes.length, V109_FREEZE_INPUT_V110.bytes);
  assert.equal(sha(baselineBytes), V109_FREEZE_INPUT_V110.sha256, 'The historical V109 freeze must stay byte-exact');
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
  const files = [...new Set([
    ...await walk(root, 'app'),
    ...previous.entries.filter(row => !row.path.startsWith('app/')).map(row => row.path),
    V109_FREEZE_INPUT_V110.path, ...await collectV110RecipeInputs(root), ...proofScripts,
  ])].sort();
  const entries = await Promise.all(files.map(async file => {
    assert.ok(local(file)); const bytes = await fs.readFile(path.join(root, file));
    return {path: file, sha256: sha(bytes), bytes: bytes.length};
  }));
  return {
    scope: 'All current app sources and prior production configuration; all 398 immutable V109 public inputs and original art provenance; complete V110 browser recipe and transitive fixture loaders; V110 publication tools. Generated V110 freeze, reports, captures and workbooks are excluded.',
    baseline: V109_FREEZE_INPUT_V110, files: entries.length,
    bytes: entries.reduce((sum, row) => sum + row.bytes, 0), entries,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 2 && ['--write', '--check'].includes(args[0]), 'Usage: node scripts/snapshot-runtime-v110.mjs --write|--check output.json');
  const bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV110(), null, 2) + '\n');
  if (args[0] === '--check') assert.deepEqual(await fs.readFile(args[1]), bytes, 'Production runtime changed');
  else await fs.writeFile(args[1], bytes);
  console.log(JSON.stringify({status: args[0] === '--write' ? 'SNAPSHOT_WRITTEN' : 'PASS', path: args[1], sha256: sha(bytes), bytes: bytes.length}));
}
