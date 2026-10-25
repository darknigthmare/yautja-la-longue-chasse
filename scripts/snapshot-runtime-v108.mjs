/** V108 production identity. The inventory contains only bounded public inputs,
 * never generated proof/master documents. Earlier production freezes stay exact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(relative) {
  return (await Promise.all((await fs.readdir(path.join(ROOT, relative), {withFileTypes: true})).map(entry => entry.isDirectory() ? walk(relative + '/' + entry.name) : entry.isFile() ? [relative + '/' + entry.name] : []))).flat();
}
export async function snapshotRuntimeV108() {
  const previous = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/v107-runtime-freeze.json'), 'utf8'));
  const inventory = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/v108-runtime-public-inputs.json'), 'utf8'));
  assert.equal(inventory.schemaVersion, 1);
  assert.ok(inventory.assets.length > 0);
  assert.equal(new Set(inventory.assets.map(row => row.path)).size, inventory.assets.length);
  const publicRows = new Map(previous.entries.filter(row => row.path.startsWith('public/')).map(row => [row.path, row]));
  for (const row of inventory.assets) {
    assert.ok(typeof row.path === 'string' && row.path.startsWith('public/') && !row.path.includes('\\') && row.path.split('/').every(part => part && part !== '.' && part !== '..'));
    assert.match(row.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0);
    const previous = publicRows.get(row.path);
    if (previous) assert.equal(previous.sha256, row.sha256, 'Historical public input cannot be replaced: ' + row.path);
    publicRows.set(row.path, row);
  }
  for (const row of publicRows.values()) {
    const bytes = await fs.readFile(path.join(ROOT, row.path));
    assert.equal(bytes.length, row.bytes);
    assert.equal(sha(bytes), row.sha256, 'Public source changed: ' + row.path);
  }
  const files = [...new Set([...await walk('app'), ...publicRows.keys(),
    ...previous.entries.filter(row => !row.path.startsWith('app/') && !row.path.startsWith('public/')).map(row => row.path),
    'scripts/snapshot-runtime-v108.mjs', 'docs/v108-runtime-public-inputs.json', 'docs/v107-runtime-freeze.json'])].sort();
  const entries = await Promise.all(files.map(async file => {const bytes = await fs.readFile(path.join(ROOT, file)); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
  return {scope: 'All current app sources and production configuration, with immutable V107 public inputs and the explicit V108 public asset inventory. Historical proof files are excluded.', files: entries.length, bytes: entries.reduce((sum, row) => sum + row.bytes, 0), entries};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok((args.length === 1 || args.length === 2 && args[0] === '--check') && !args.at(-1).startsWith('--'), 'Usage: node scripts/snapshot-runtime-v108.mjs [--check] output.json');
  const target = path.resolve(args.at(-1)), bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV108(), null, 2) + '\n');
  if (args[0] === '--check') assert.deepEqual(await fs.readFile(target), bytes, 'Production runtime changed');
  else await fs.writeFile(target, bytes);
}
