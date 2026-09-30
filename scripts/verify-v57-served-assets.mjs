import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.V57_ASSET_QA_URL || 'http://127.0.0.1:4177';
const output = process.env.V57_ASSET_QA_OUTPUT || 'work-local/v57/qa/served-assets.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const valkyrie = JSON.parse(await fs.readFile('app/game/data/pitValkyrieArtV57.json', 'utf8'));
const jungle = JSON.parse(await fs.readFile('app/game/data/pitJungleFinalArtV57.json', 'utf8'));
const records = [...valkyrie.records, ...jungle.pages];
assert.equal(records.length, 4);
const checks = [];
for (const record of records) {
  assert(record.src.startsWith('/game/sprites/v57/pit/'));
  const local = await fs.readFile(path.join('public', record.src));
  assert.equal(hash(local), record.sha256, 'Reviewed local bytes: ' + record.src);
  const url = new URL(record.src, base);
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, url.href);
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  const served = Buffer.from(await response.arrayBuffer());
  assert(served.equals(local), 'Delivered native bytes: ' + record.src);
  checks.push({ src: record.src, status: response.status, bytes: served.length, sha256: hash(served), byteEqual: true });
}
const response = await fetch(base, { signal: AbortSignal.timeout(60000) });
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /<html[\s>]/i, 'The route must return an HTML application shell');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, base, checkedAt: new Date().toISOString(), menuHttp: response.status, assetVersion: 'V57', versionUiVerified: false, checks }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, count: checks.length, output }));
