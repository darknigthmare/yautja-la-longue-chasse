import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldGeometryV64.ts', 'homeworldNativeArchitectureV81.ts', 'homeworldNativeArchitectureCodexV81.ts', 'homeworldContextCodexV71.ts']);
const records = api.HOMEWORLD_NATIVE_ARCHITECTURE_CODEX_V81;

test('nine actual native facade instances use their real renderer source, dimensions, threshold and collision hull', () => {
  assert.equal(records.length, 9); assert.equal(new Set(records.map(record => record.id)).size, 9);
  for (const record of records) {
    const id = record.id.slice('v81-facade:'.length), building = api.HOMEWORLD_BUILDINGS.find(building => building.id === id);
    assert.equal(record.asset, building.art.src);
    assert.deepEqual(record.dimensions, { ...building.footprint, height: building.wallHeight });
    assert.deepEqual(record.footprint, api.homeworldBuildingFootprintV64(building));
    assert.deepEqual(record.door, api.homeworldBuildingDoorwayV64(building));
    assert.equal(record.lore, 'original-adaptation');
    const text = record.constraints.join(' ');
    assert(text.includes(building.art.sha256) || record.source.some(source => source.note.includes(building.art.sha256)));
    assert(text.includes(api.homeworldBuildingIdentityV81(id).role));
    assert(text.includes('aucun nouveau service'));
    const assembly = api.HOMEWORLD_CONTEXT_CODEX_V71.find(record => record.id === 'assembly-v71:' + id);
    assert(assembly.associatedElementIds.includes(record.id));
    assert(api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.some(candidate => candidate.id === record.id), 'actual aggregate lacks native facade');
  }
  const council = records.find(record => record.id === 'v81-facade:rite-sanctum');
  assert.equal(council.dimensions.width, 850); assert.equal(council.dimensions.depth, 500);
  assert.equal(council.footprint.polygon.length, api.homeworldBuildingIdentityV81('rite-sanctum').art.groundSupportPixelsV81.length);
  assert(council.footprint.polygon.every((point, index, polygon) => point.x !== polygon[(index + 1) % polygon.length].x && point.y !== polygon[(index + 1) % polygon.length].y), 'the measured native support keeps its oblique sides instead of an axis-aligned box');
  assert(!council.constraints.join(' ').includes('570'));
});

test('native codex provenance binds delivered PNG bytes and source dimensions, retaining every original source reference', async () => {
  const checked = new Set();
  for (const record of records) {
    if (checked.has(record.asset)) continue; checked.add(record.asset);
    const bytes = await fs.readFile('public' + record.asset), identity = api.homeworldBuildingIdentityV81(record.id.slice('v81-facade:'.length));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), identity.art.sha256);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes.readUInt32BE(16), identity.art.sourceWidth); assert.equal(bytes.readUInt32BE(20), identity.art.sourceHeight);
    assert(record.source[0].note.includes('original exec-'));
    assert(record.source[0].note.includes(`${identity.art.sourceWidth} × ${identity.art.sourceHeight}`));
  }
  assert.equal(checked.size, 4);
});

test('superseded Council V76 and monumental V75 facades stay archived without runtime doors or colliders', () => {
  const council = api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(record => record.id === 'v76-facade:rite-sanctum');
  assert(council.spaceId.startsWith('archive:')); assert(council.label.startsWith('Archive V76'));
  assert.equal(council.footprint, null); assert.equal(council.door, null);
  assert.equal(council.dimensions.width, 570); assert.equal(council.dimensions.depth, 340);
  assert(council.constraints.some(line => line.includes('aucun volume runtime')));
  for (const id of ['rite-sanctum']) {
    const old = api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(record => record.id === 'v75-facade:' + id);
    assert(old.spaceId.startsWith('archive:')); assert.equal(old.footprint, null); assert.equal(old.door, null);
    assert(old.associatedElementIds.includes('v81-facade:' + id));
  }
});
