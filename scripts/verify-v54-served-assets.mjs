import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.V54_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V54_ASSET_QA_OUTPUT || 'outputs/qa-commercial-audit/v54/local-assets.json';
const prompts = JSON.parse(await fs.readFile('docs/v54-openai-prompts.json', 'utf8'));
const files = prompts.entries.filter(entry => entry.accepted === true).map(entry => entry.target);
async function collect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.isFile() && entry.name === 'v54.wav') files.push(file.replaceAll('\\', '/'));
  }
}
await collect('public/audio');
assert.equal(files.filter(file => file.endsWith('.png')).length, 7);
assert.equal(files.filter(file => file.endsWith('.wav')).length, 22);
const checks = await Promise.all(files.sort().map(async file => {
  const url = new URL(file.replace(/^public\//, '/'), base).href;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, url);
  const received = Buffer.from(await response.arrayBuffer()), local = await fs.readFile(file);
  assert(received.equals(local), url + ' must match reviewed source bytes');
  if (file.endsWith('.png')) {
    assert.match(response.headers.get('content-type') || '', /image\/png/, url);
    assert.equal(received.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  } else {
    assert.equal(received.subarray(0, 4).toString(), 'RIFF');
    assert.equal(received.subarray(8, 12).toString(), 'WAVE');
  }
  return { file, url, status: 200, bytes: received.length, sha256: createHash('sha256').update(received).digest('hex'), byteEqual: true };
}));
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), base, count: checks.length, checks }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, count: checks.length, output }));
