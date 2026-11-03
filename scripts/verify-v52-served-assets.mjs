import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.V52_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V52_ASSET_QA_OUTPUT || 'outputs/qa-commercial-audit/v52/local-assets-final.json';
const sources = [];
for (const who of ['city-hunter', 'scar']) {
  const provenance = JSON.parse(await fs.readFile(`docs/art/v52/${who}-round-presentation-provenance.json`, 'utf8'));
  sources.push(...provenance.files.map(file => ({ file: file.path, sha256: file.sha256, dimensions: file.size })));
}
const grazer = JSON.parse(await fs.readFile('docs/art/v52/youth-grazer-provenance.json', 'utf8'));
sources.push({ file: grazer.asset, sha256: grazer.sha256, dimensions: grazer.dimensions });
assert.equal(sources.length, 7);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const checks = await Promise.all(sources.map(async source => {
  const url = new URL(source.file.replace(/^public\//, '/'), base).href;
  const response = await fetch(url);
  assert.equal(response.status, 200, url);
  assert.match(response.headers.get('content-type') || '', /image\/png/, url);
  const received = Buffer.from(await response.arrayBuffer());
  const local = await fs.readFile(source.file);
  assert.equal(received.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', url);
  const dimensions = [received.readUInt32BE(16), received.readUInt32BE(20)];
  assert.deepEqual(dimensions, source.dimensions, url);
  assert(received.equals(local), url + ' must preserve local source bytes');
  assert.equal(sha256(received), source.sha256, url);
  return { ...source, url, status: response.status, contentType: response.headers.get('content-type'), bytes: received.length, byteEqual: true };
}));
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), base, count: checks.length, checks }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, count: checks.length, output }));
