import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Read-only deployment gate: reviewed native files must arrive byte for byte.
const base = process.env.YAUTJA_ASSET_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.YAUTJA_ASSET_QA_OUTPUT || 'work-local/v56/qa/served-assets.json';
const sources = ['art-source/v55/pit-stages/source-records.json', 'art-source/v56/mausoleum/source-records.json', 'art-source/v56/hellhounds/source-records.json', 'docs/v56-original-fighter-cutout-provenance.json', 'docs/v56-companion-cutouts.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const records = [];
for (const source of sources) {
  const data = JSON.parse(await fs.readFile(source, 'utf8'));
  for (const item of (Array.isArray(data) ? data : data.records ?? data.fighters ?? data.assets)) records.push({...item, publicPath:item.publicPath ?? item.src ?? item.cutoutPublicPath, receipt:source});
}
assert.equal(records.length, 55, '35 stages, two mausoleum images, four Hellhound images, three fighters and eleven companion cutouts');
const checks = [];
// Keep remote verification bounded without opening dozens of simultaneous image requests.
let index = 0;
await Promise.all(Array.from({length:4}, async () => {
  while (index < records.length) {
    const item = records[index++], publicPath = item.publicPath;
    assert(publicPath?.startsWith('/game/'), 'Receipt needs a public game path');
    const local = await fs.readFile(path.join('public', publicPath));
    assert.equal(hash(local), item.sha256, 'Local bytes changed after visual acceptance: ' + publicPath);
    const url = new URL(publicPath, base).href;
    const response = await fetch(url, {signal:AbortSignal.timeout(60000)});
    assert.equal(response.status, 200, url);
    assert.match(response.headers.get('content-type') || '', /image\/png/, url);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.equals(local), 'Served bytes differ: ' + url);
    checks.push({publicPath, bytes:bytes.length, sha256:hash(bytes), byteEqual:true, status:response.status});
  }
}));
checks.sort((a,b) => a.publicPath.localeCompare(b.publicPath));
await fs.mkdir(path.dirname(output), {recursive:true});
await fs.writeFile(output, JSON.stringify({passed:true, checkedAt:new Date().toISOString(), base, count:checks.length, checks}, null, 2) + '\n');
console.log(JSON.stringify({passed:true, count:checks.length, output}));
