import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.V58_ASSET_QA_URL || 'http://127.0.0.1:4178';
const output = process.env.V58_ASSET_QA_OUTPUT || 'work-local/v58/qa/served-assets.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const { records } = JSON.parse(await fs.readFile('app/game/data/pitFalconerDroneArtV58.json', 'utf8'));
assert.equal(records.length, 2);
const checks = [];
for (const record of records) {
  assert(record.src.startsWith('/game/sprites/v58/pit/falconer/'));
  const local = await fs.readFile(path.join('public', record.src));
  assert.equal(hash(local), record.sha256);
  const response = await fetch(new URL(record.src, base), { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, record.src);
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.equals(local), 'The published native PNG must retain its exact reviewed bytes');
  checks.push({ src: record.src, status: response.status, bytes: bytes.length, sha256: hash(bytes) });
}
const response = await fetch(base, { signal: AbortSignal.timeout(60000) });
assert.equal(response.status, 200);
assert.match(await response.text(), /<html[\s>]/i);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, base, checkedAt: new Date().toISOString(),
  menuHttp: response.status, assetVersion: 'V58', versionUiVerified: false, checks }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, count: checks.length, output }));
