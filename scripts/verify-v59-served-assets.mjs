import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const url = process.env.V59_ASSET_QA_URL || 'https://yautja-la-longue-chasse.vercel.app';
const output = process.env.V59_ASSET_QA_OUTPUT || 'work-local/v59/qa/served-assets.json';
const metadata = JSON.parse(await fs.readFile('app/game/data/pitFeralArtV59.json', 'utf8'));
const checks = [];
for (const record of metadata.records) {
  const response = await fetch(new URL(record.src, url));
  assert.equal(response.status, 200, record.src);
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, record.sha256, record.src + ' differs from reviewed PNG');
  checks.push({ src: record.src, bytes: bytes.length, sha256 });
}
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ status: 'PASS', url, checkedAt: new Date().toISOString(), checks }, null, 2));
console.log(JSON.stringify({ status: 'PASS', url, nativeAssets: checks.length }));
