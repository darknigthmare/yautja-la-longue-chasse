/** V113 extends the runtime while V112/R7 documents remain immutable history. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';
import {snapshotRuntimeV112, fingerprintV112, V112_JOURNEYS} from './snapshot-runtime-v112.mjs';
import {local, proofShape} from './lib/excel-followup-evidence.mjs';

export const V113_RECIPES = Object.freeze({
  Homeworld: 'scripts/qa-homeworld-public-spaces-v113.mjs',
  Pit: 'scripts/qa-pit-backward-throws-v113.mjs',
});
export const V113_JOURNEYS = V112_JOURNEYS;
export const V113_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const V113_SOURCE_DECLARATION = 'scripts/runtime-v113-inputs.json';
export const V113_PUBLIC_DECLARATION = 'docs/v113-runtime-public-inputs.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function regular(root, file) {
  assert.ok(local(file), 'Unsafe runtime input: ' + file);
  const stat = await fs.lstat(path.join(root, file));
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Runtime inputs must be regular files: ' + file);
  assert.equal(await fs.realpath(path.join(root, file)), path.resolve(await fs.realpath(root), file),
    'Runtime input traverses a symlinked directory: ' + file);
  return fingerprintV112(root, file);
}

/** Trace the actual relative source imports of new recipes and fixture loaders. */
export async function collectRecipeInputsV113(root, entrypoints) {
  const seen = new Set();
  async function visit(file) {
    assert.ok(local(file), 'Unsafe recipe source: ' + file);
    if (seen.has(file)) return;
    seen.add(file);
    await regular(root, file);
    // The base snapshot already enumerates every current application file.
    if (file.startsWith('app/') || !/\.[cm]?[jt]sx?$/.test(file)) return;
    const source = ts.createSourceFile(file, await fs.readFile(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    const specifiers = [];
    function inspect(node) {
      const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
        : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : null;
      if (specifier && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))
        && specifier.text.startsWith('.')) specifiers.push(specifier.text);
      ts.forEachChild(node, inspect);
    }
    inspect(source);
    for (const specifier of specifiers) {
      const candidate = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      assert.ok(local(candidate), 'Unsafe real recipe dependency: ' + candidate);
      let resolved;
      for (const suffix of ['', '.mjs', '.js', '.ts', '.tsx', '.json']) {
        try {
          if ((await fs.lstat(path.join(root, candidate + suffix))).isFile()) { resolved = candidate + suffix; break; }
        } catch (error) {
          if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
        }
      }
      assert.ok(resolved, 'Missing real recipe dependency: ' + candidate);
      await visit(resolved);
    }
  }
  for (const file of entrypoints) await visit(file);
  return [...seen].sort();
}

export async function snapshotRuntimeV113({root = V113_ROOT} = {}) {
  const previous = await snapshotRuntimeV112({root});
  const declaration = JSON.parse(await fs.readFile(path.join(root, V113_SOURCE_DECLARATION), 'utf8'));
  const native = JSON.parse(await fs.readFile(path.join(root, V113_PUBLIC_DECLARATION), 'utf8'));
  for (const value of [declaration, native]) {
    assert.equal(value.schemaVersion, 1);
    assert.equal(value.release, 'V113');
  }
  assert.ok(Array.isArray(declaration.sourceInputs) && declaration.sourceInputs.length > 0);
  assert.equal(new Set(declaration.sourceInputs).size, declaration.sourceInputs.length);
  for (const file of declaration.sourceInputs) assert.ok(local(file));
  for (const key of ['assets', 'provenance', 'runtimeAssets', 'originalRuntimeInputs']) assert.ok(Array.isArray(native[key]), key);
  assert.equal(new Set(native.runtimeAssets).size, native.runtimeAssets.length);
  for (const file of native.runtimeAssets) assert.ok(local(file) && file.startsWith('public/'));
  const originals = new Map(native.originalRuntimeInputs.map(row => [row.path, row]));
  assert.equal(originals.size, native.originalRuntimeInputs.length, 'Duplicate original runtime source');
  assert.equal(originals.size, native.runtimeAssets.length, 'Every existing runtime asset needs its original byte pin');
  for (const file of native.runtimeAssets) {
    const row = originals.get(file);
    assert.ok(row, 'Missing original runtime source: ' + file);
    proofShape(row);
    assert.deepEqual(await regular(root, file), {path: row.path, bytes: row.bytes, sha256: row.sha256},
      'Original runtime asset changed: ' + file);
  }
  const old = new Set(previous.entries.map(row => row.path));
  const rows = [...native.assets, ...native.provenance];
  assert.equal(new Set(rows.map(row => row.path)).size, rows.length);
  assert.ok(!native.assets.length || native.provenance.length, 'New artwork requires original provenance');
  for (const row of native.assets) {
    proofShape(row);
    assert.ok(row.path.startsWith('public/') && !old.has(row.path), 'New art must not replace an original input');
  }
  for (const row of native.provenance) {
    proofShape(row);
    assert.ok(row.path.startsWith('art-source/v113/') || row.path.startsWith('docs/suivi-production/v113'));
  }
  for (const row of rows) assert.deepEqual(await regular(root, row.path), row, 'Native source bytes changed: ' + row.path);
  const files = [...new Set([
    ...previous.entries.map(row => row.path),
    V113_SOURCE_DECLARATION, V113_PUBLIC_DECLARATION,
    'scripts/snapshot-runtime-v113.mjs', 'scripts/publish-validation-v113.mjs',
    'tests/production-evidence-v113.test.mjs', 'docs/v113-production-proof-protocol.md',
    ...await collectRecipeInputsV113(root, [...Object.values(V113_RECIPES), ...declaration.sourceInputs]),
    ...rows.map(row => row.path), ...native.runtimeAssets,
  ])].sort();
  const entries = await Promise.all(files.map(file => regular(root, file)));
  return {
    scope: 'All current application sources and unchanged original native inputs; complete inherited Homeworld/Pit recipes plus declared V113 qualification sources and their real relative imports; explicit native assets and original provenance. Historical V112/R7 publications remain distinct. Generated V113 reports, captures, freeze and workbooks are excluded.',
    baseline: previous.baseline,
    files: entries.length,
    bytes: entries.reduce((sum, row) => sum + row.bytes, 0),
    entries,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, file, ...extra] = process.argv.slice(2);
  assert.ok(['--write', '--check'].includes(mode) && file && !extra.length);
  const bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV113(), null, 2) + '\n');
  if (mode === '--check') assert.deepEqual(await fs.readFile(file), bytes, 'Runtime changed since V113 freeze');
  else await fs.writeFile(file, bytes);
  console.log(JSON.stringify({status: mode === '--check' ? 'PASS' : 'SNAPSHOT_WRITTEN', path: file, bytes: bytes.length, sha256: sha(bytes)}));
}
