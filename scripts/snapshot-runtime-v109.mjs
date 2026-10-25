/** Current V109 source identity. Writing a freeze is explicit; old freezes stay exact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {local, proofShape} from './lib/excel-followup-evidence.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const V109_RECIPES = Object.freeze({Pit: 'scripts/qa-pit-forward-throws-v109.mjs', Homeworld: 'scripts/qa-homeworld-plaque-v109.mjs', Clans: 'scripts/qa-clan-supply-route-v109.mjs', Preserve: 'scripts/qa-preserve-biomes-v109.mjs'});
async function walk(relative) {
  return (await Promise.all((await fs.readdir(path.join(ROOT, relative), {withFileTypes: true})).map(entry => entry.isDirectory() ? walk(relative + '/' + entry.name) : entry.isFile() ? [relative + '/' + entry.name] : []))).flat();
}
export async function snapshotRuntimeV109() {
  const previous = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/v108-runtime-freeze.json'), 'utf8'));
  const inventory = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/v109-runtime-public-inputs.json'), 'utf8'));
  assert.equal(inventory.schemaVersion, 1); assert.equal(inventory.release, 'V109');
  const rows = [...inventory.assets, ...inventory.provenance]; assert.ok(inventory.assets.length && inventory.provenance.length);
  assert.equal(new Set(rows.map(row => row.path)).size, rows.length);
  const publicRows = new Map(previous.entries.filter(row => row.path.startsWith('public/')).map(row => [row.path, row]));
  for (const row of inventory.assets) {
    proofShape(row); assert.ok(row.path.startsWith('public/'));
    if (publicRows.has(row.path)) assert.deepEqual(publicRows.get(row.path), row, 'Historical native input cannot be replaced');
    publicRows.set(row.path, row);
  }
  for (const row of inventory.provenance) {proofShape(row); assert.ok(row.path.startsWith('art-source/v109-pit-forward/') || row.path.startsWith('docs/suivi-production/v109-'));}
  for (const row of [...publicRows.values(), ...inventory.provenance]) {
    const bytes = await fs.readFile(path.join(ROOT, row.path)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'Pinned V109 input changed: ' + row.path);
  }
  const sourceDocuments = [...inventory.sourceDocuments];
  for (const directory of inventory.sourceDocumentDirectories) {
    assert.ok(['docs/suivi-production/v109-pit-forward', 'docs/suivi-production/v109-homeworld-plaque'].includes(directory));
    const documents = await walk(directory); assert.ok(documents.length && documents.every(file => file.endsWith('.json')), 'Native review packages contain JSON documents only'); sourceDocuments.push(...documents);
  }
  const files = [...new Set([...await walk('app'), ...publicRows.keys(), ...inventory.provenance.map(row => row.path), ...sourceDocuments,
    ...previous.entries.filter(row => !row.path.startsWith('app/') && !row.path.startsWith('public/')).map(row => row.path),
    ...Object.values(V109_RECIPES), 'scripts/snapshot-runtime-v109.mjs', 'docs/v109-runtime-public-inputs.json', 'docs/v108-runtime-freeze.json'])].sort();
  const entries = await Promise.all(files.map(async file => {assert.ok(local(file)); const bytes = await fs.readFile(path.join(ROOT, file)); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
  return {scope: 'All current app sources and production configuration; immutable V108 public inputs; explicit V109 public native pages, source-only references and tool receipts; exact four V109 browser drivers. Generated V109 freeze/master/report files are excluded.', files: entries.length, bytes: entries.reduce((sum, row) => sum + row.bytes, 0), entries};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(args.length === 2 && ['--write', '--check'].includes(args[0]), 'Usage: node scripts/snapshot-runtime-v109.mjs --write|--check output.json');
  const target = path.resolve(args[1]), bytes = Buffer.from(JSON.stringify(await snapshotRuntimeV109(), null, 2) + '\n');
  if (args[0] === '--check') assert.deepEqual(await fs.readFile(target), bytes, 'Production runtime changed'); else await fs.writeFile(target, bytes);
  console.log(JSON.stringify({status: args[0] === '--write' ? 'SNAPSHOT_WRITTEN' : 'PASS', path: args[1], sha256: sha(bytes), bytes: bytes.length}));
}
