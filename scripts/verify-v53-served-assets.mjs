import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.V53_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V53_ASSET_QA_OUTPUT || 'outputs/qa-commercial-audit/v53/local-assets.json';
const files = [];
async function collect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.isFile() && entry.name.endsWith('.png')) files.push(file.replaceAll('\\', '/'));
  }
}
await collect('public/game/youth/v53');
await collect('public/game/sprites/v53/pit');
assert.equal(files.length, 8, 'Six youth assets and two accepted combat shuffle atlases');
const digest = data => createHash('sha256').update(data).digest('hex');
const checks = await Promise.all(files.sort().map(async file => {
  const url = new URL(file.replace(/^public\//, '/'), base).href;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, url);
  assert.match(response.headers.get('content-type') || '', /image\/png/, url);
  const received = Buffer.from(await response.arrayBuffer());
  const local = await fs.readFile(file);
  assert.equal(received.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', url);
  assert(received.equals(local), url + ' must preserve the reviewed local PNG bytes');
  return { file, url, status: 200, bytes: received.length, dimensions: [received.readUInt32BE(16), received.readUInt32BE(20)], sha256: digest(received), byteEqual: true };
}));
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), base, count: checks.length, checks }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, count: checks.length, output }));
