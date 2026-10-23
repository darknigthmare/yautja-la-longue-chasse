/** Fingerprint the sources used by the production build and the historical
 * follow-up's public assets. This is a freeze check, not a visual art audit. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(relative) {
  const entries = await fs.readdir(path.join(root, relative), {withFileTypes: true});
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(relative + '/' + entry.name) : entry.isFile() ? [relative + '/' + entry.name] : []))).flat();
}
export async function snapshotRuntimeV107() {
  const history = JSON.parse(await fs.readFile(path.join(root, 'docs/v106-runtime-freeze.json'), 'utf8'));
  const inventory = JSON.parse(await fs.readFile(path.join(root, 'docs/v107-runtime-public-inputs.json'), 'utf8'));
  assert.equal(inventory.schemaVersion, 1);
  assert.ok(Array.isArray(inventory.assets) && inventory.assets.length > 0, 'V107 public inputs must be collected before freezing');
  for (const entry of inventory.assets) {
    assert.ok(typeof entry.path === 'string' && entry.path.startsWith('public/') && !entry.path.split(/[\\/]/).includes('..'), 'Bounded public input required');
    const bytes = await fs.readFile(path.join(root, entry.path));
    assert.equal(bytes.length, entry.bytes, entry.path + ': public input size changed');
    assert.equal(sha(bytes), entry.sha256, entry.path + ': public input changed');
  }
  const paths = [...new Set([
    ...await walk('app'),
    ...history.entries.filter(item => item.path.startsWith('public/')).map(item => item.path),
    ...inventory.assets.map(item => item.path),
    'docs/v106-runtime-freeze.json', 'docs/v107-runtime-public-inputs.json',
    'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'vercel.json',
    '.vercelignore', '.openai/hosting.json', 'scripts/build-production-v94.mjs',
    'scripts/build-audio-manifest.mjs', 'scripts/verify-pit-built-css-v61.mjs',
    'scripts/vercel-native-origin-v89.mjs', 'scripts/compact-vercel-static-v87.mjs',
    'scripts/snapshot-runtime-v107.mjs', 'scripts/collect-v107-runtime-inputs.mjs', 'scripts/collect-pit-variant-inputs-v107.mjs',
  ])].sort();
  const entries = await Promise.all(paths.map(async relative => {
    const bytes = await fs.readFile(path.join(root, relative));
    return {path: relative, bytes: bytes.length, sha256: sha(bytes)};
  }));
  return {scope: 'All app sources, production configuration/build scripts, the frozen V106 public input set and the collected V107 public assets. Other historical art and generated build files are outside this snapshot.',
    files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), entries};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok((args.length === 1 || args.length === 2 && args[0] === '--check') && !args.at(-1).startsWith('--'), 'Usage: node scripts/snapshot-runtime-v107.mjs [--check] output.json');
  const target = path.resolve(args.at(-1)), bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV107(), null, 2) + '\n');
  if (args[0] === '--check') assert.deepEqual(await fs.readFile(target), bytes, 'Runtime changed since the production freeze');
  else {await fs.mkdir(path.dirname(target), {recursive: true}); await fs.writeFile(target, bytes);}
}
