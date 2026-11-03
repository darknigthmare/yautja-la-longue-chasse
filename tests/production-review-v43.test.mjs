import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { appendArenaReviewEntries } from '../scripts/lib/production-review-arenas-v43.mjs';

const definition = { id: 'arena-128-avp-classic-2000-colonial-base', name: 'Base coloniale', kind: 'game',
  workId: 'avp-classic-2000', workTitle: 'Aliens versus Predator Classic 2000',
  referenceStatus: 'official-setting-type-confirmed-exact-level-unverified-2d-adaptation', fidelityClaim: 'not-certified-1to1' };
const stage = () => ({ catalogueId: definition.id, name: definition.name, runtimeEnabled: false,
  planes: [{ id: 'P0', assets: [{ id: 'p0-depth', role: 'Profondeur', frames: [{ status: 'planned' }] }] }] });
const receipt = () => ({ accepted: true, generator: 'openai-imagegen', arenaId: definition.id,
  publicPath: `/game/sprites/v43/pit-arenas/${definition.id}/p0-depth.png`, width: 1536, height: 1024, sha256: 'fixture' });

test('reviewed P0 is browsable before assembly without claiming a complete kit or runtime scene', () => {
  const original = stage(), before = structuredClone(original);
  const entries = appendArenaReviewEntries([], [original], [definition], [receipt()]);
  assert.equal(entries.length, 1); assert.equal(entries[0].status, 'reviewed');
  assert.deepEqual(entries[0].frames, []); assert.match(entries[0].notes.join(' '), /n’est pas encore activée/);
  assert.match(entries[0].notes.join(' '), /aucune mission précise/);
  assert.match(entries[0].notes.join(' '), /1:1 non certifiée/);
  assert.equal(entries[0].screenReference.workId, definition.workId);
  assert.deepEqual(original, before);
});

test('assembled source and imported receipt deduplicate by the exact PNG without changing its stable ID', () => {
  const original = stage(), source = receipt();
  original.planes[0].assets[0].frames = [{ status: 'integrated', path: source.publicPath, generation: source }];
  const entries = appendArenaReviewEntries([], [original], [definition], [source]);
  assert.equal(entries.length, 1); assert.equal(entries[0].status, 'integrated');
  assert.equal(entries[0].id, `v43-${definition.id}-p0-depth-0`);
  assert(!entries[0].notes.join(' ').includes('100 arènes reste à confirmer'));
  appendArenaReviewEntries(entries, [original], [definition], [source]); assert.equal(entries.length, 1);
});

test('unknown, excluded and foreign-path receipts cannot become gallery sources', () => {
  for (const override of [{ accepted: false }, { excludedFromCoverage: true }, { arenaId: 'unknown' }, { publicPath: '/game/foreign.png' }]) {
    assert.throws(() => appendArenaReviewEntries([], [stage()], [definition], [{ ...receipt(), ...override }]));
  }
});

test('the built gallery includes each of the nine imported game P0 once, with its verified hash', () => {
  const gallery = JSON.parse(fs.readFileSync('public/game/assets/v34/production-review/manifest.json', 'utf8'));
  const plan = JSON.parse(fs.readFileSync('docs/v43-game-arena-first-batch.json', 'utf8'));
  assert.equal(gallery.catalogueVersion, 'V43'); assert.equal(gallery.coverage.completeGameImplied, false);
  for (const arena of plan.arenas) {
    const entries = gallery.entries.filter(entry => entry.src === arena.generation.publicPath);
    assert.equal(entries.length, 1, arena.id); assert.equal(entries[0].sha256, arena.generation.sha256);
    assert.deepEqual(entries[0].frames, []); assert.equal(entries[0].screenReference.workId, arena.workId);
  }
});
