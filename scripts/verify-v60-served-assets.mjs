import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const url = process.env.V60_ASSET_QA_URL || 'https://yautja-la-longue-chasse.vercel.app';
const output = process.env.V60_ASSET_QA_OUTPUT || 'work-local/v60/qa/served-assets.json';
const life = JSON.parse(await fs.readFile('app/game/data/pitStageLifeV60.json', 'utf8'));
const production = JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json', 'utf8'));
const stages = production.stages.filter(stage => stage.number >= 162 && stage.number <= 186);
assert.equal(stages.length, 25);
assert(stages.every(stage => stage.runtimeEnabled), 'All new stages must be promoted before the release asset gate');
assert.equal(life.stages.length, 25);
const records = new Map();
function add(src, sha256) {
  assert(/^\/game\/sprites\/v60\//.test(src));
  assert(/^[a-f0-9]{64}$/.test(sha256));
  if (records.has(src)) assert.equal(records.get(src), sha256);
  records.set(src, sha256);
}
for (const stage of life.stages) for (const event of stage.events) add(event.src, event.sha256);
for (const stage of stages) for (const plane of stage.planes) for (const asset of plane.assets) for (const frame of asset.frames) {
  if (frame.path.startsWith('/game/sprites/v60/')) add(frame.path, frame.generation.sha256);
}
assert.equal(new Set(records.values()).size, 104, '25 backgrounds,75 native atlases,2 shared floors and2 maritime props');
const checks = [], failures = [], queue = [...records];
// Keep public requests bounded; this is a read-only comparison with reviewed native bytes.
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const [src, expected] = queue.shift();
    try {
      const response = await fetch(new URL(src, url), { signal: AbortSignal.timeout(90000) });
      assert.equal(response.status, 200, src);
      const contentType = response.headers.get('content-type') || '';
      assert.match(contentType, /image\/png/);
      const bytes = Buffer.from(await response.arrayBuffer());
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      assert.equal(sha256, expected, `${src}: served bytes differ from reviewed native image`);
      checks.push({ src, status: response.status, contentType, bytes: bytes.length, sha256 });
    } catch (error) { failures.push({ src, error: error.message }); }
  }
}));
await fs.mkdir(path.dirname(output), { recursive: true });
const report = { status: failures.length ? 'FAIL' : 'PASS', url, checkedAt: new Date().toISOString(), expectedPaths: records.size,
  uniqueNativePngs: new Set(records.values()).size, checks: checks.sort((a, b) => a.src.localeCompare(b.src)), failures };
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, url, passed: checks.length, failed: failures.length, uniqueNativePngs: report.uniqueNativePngs }));
assert.equal(failures.length, 0, 'See the saved served-assets report');
