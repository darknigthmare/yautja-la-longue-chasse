import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const base = process.env.V50_ASSET_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V50_ASSET_QA_OUTPUT || 'outputs/qa-commercial-audit/v50/movement-assets';
const provenance = JSON.parse(await fs.readFile('docs/art/v50/movement-batch/provenance.json', 'utf8'));
await fs.mkdir(output, { recursive: true });
const checks = [];
try {
  assert.equal(provenance.accepted.length, 6);
  for (const asset of provenance.accepted) {
    const response = await fetch(new URL(asset.src, base), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, asset.src);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, asset.sha256, 'Published PNG must match the accepted unmodified source');
    assert.equal(bytes.length, asset.byteLength);
    assert.equal(bytes.readUInt32BE(16), asset.width);
    assert.equal(bytes.readUInt32BE(20), asset.height);
    checks.push({ fighterId: asset.fighterId, variantId: asset.variantId, src: asset.src, status: response.status, sha256, byteLength: bytes.length });
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, base, checkedAt: new Date().toISOString(), checks, scope: 'HTTP, PNG signature, dimensions and exact accepted source hashes; gameplay verified separately.' }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, base, checks, error: String(error) }, null, 2) + '\n');
  console.error(String(error)); process.exitCode = 1;
}
