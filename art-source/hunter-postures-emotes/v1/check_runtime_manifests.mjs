#!/usr/bin/env node
// Run with Node >=22.13 and --experimental-strip-types. Checks the real generated
// manifests against the source/import metadata without approving or drawing art.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  validateHunterSpriteAtlas,
  resolveHunterSpriteAtlasFrame,
} from '../../../app/game/hunterSpriteAtlas.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.resolve(process.argv[2] || path.join(here, '../../../public/game/sprites/hunter-postures-emotes/v1'));
const nativeFolder = path.resolve(process.argv[3] || path.join(folder, 'runtime_atlases'));
const readJson = async filename => JSON.parse(await readFile(filename, 'utf8'));
const [source, imports, playback, index] = await Promise.all([
  readJson(path.join(folder, 'animations.json')),
  readJson(path.join(folder, 'import_atlases.json')),
  readJson(path.join(folder, 'playback.json')),
  readJson(path.join(nativeFolder, 'index.json')),
]);
const imported = new Map(imports.atlases.map(page => [page.id, page]));
const sourceDrawingCount = source.clips.reduce((total, clip) => total + clip.frames.length, 0);
assert.equal(source.actions.length, 6, 'The delivered pack must contain six actions.');
assert.equal(source.clips.length, 18, 'The delivered pack must contain eighteen source clips.');
assert.equal(sourceDrawingCount, 288, 'Playback aliases must not increase the source drawing count.');
assert.equal(index.sourceDrawings, sourceDrawingCount);
assert.equal(index.deliveryRevision, source.version);
assert.equal(index.productionStatus, 'draft');
assert.equal(index.rosterBinding, null);
assert.equal(index.manifests.length, source.actions.length);
assert.deepEqual(Object.keys(index.defaultPlayback || {}).sort(), source.actions.map(action => action.id).sort(),
  'Every action needs an explicit default playback mapping.');

let totalPages = 0, totalClips = 0, totalReferences = 0;
const distinctSourceCells = new Set();
for (const action of source.actions) {
  const item = index.manifests.find(entry => entry.action === action.id);
  assert.ok(item, `${action.id}: missing runtime index entry.`);
  assert.equal(path.basename(item.file), item.file, 'Manifest filenames must remain local to runtime_atlases.');
  const atlas = await readJson(path.join(nativeFolder, item.file));
  const checked = validateHunterSpriteAtlas(atlas);
  assert.equal(checked.valid, true, `${action.id}: ${JSON.stringify(checked.issues)}`);
  assert.equal(atlas.status, 'draft');
  assert.equal(atlas.id, item.atlasId);
  assert.equal(atlas.variantId, item.variantId);
  assert.equal(atlas.characterId, index.characterId);
  assert.equal(atlas.pages.length, 3, 'Reversible exits must reuse the entry page.');
  assert.ok(atlas.pages.every(page => page.status === 'draft'));
  const clips = new Map(atlas.clips.map(clip => [clip.id, clip]));
  const expectedIds = ['enter', 'idle', 'exit', 'exit_reversible'].map(phase => `${action.id}_${phase}`);
  assert.deepEqual([...clips.keys()].sort(), expectedIds.sort());
  const defaults = index.defaultPlayback[action.id];
  assert.deepEqual(defaults, {
    entry: `${action.id}_enter`, idle: `${action.id}_idle`,
    exit: `${action.id}_exit_reversible`, dedicatedExit: `${action.id}_exit`,
  });

  // Independently compare the original three sequences with the guarded import
  // records. This catches accidentally replacing the dedicated exit or pivots.
  for (const phase of ['enter', 'idle', 'exit']) {
    const id = `${action.id}_${phase}`, clip = clips.get(id), page = imported.get(id);
    assert.ok(page, `${id}: missing guarded import metadata.`);
    assert.equal(page.frames.length, 16);
    const order = phase === 'idle' ? playback.idleOrderOneBased : Array.from({length: 16}, (_, position) => position + 1);
    assert.equal(clip.frames.length, phase === 'idle' ? 30 : 16);
    assert.equal(clip.loop, phase === 'idle');
    assert.equal(clip.ticksPerSecond, 80);
    clip.frames.forEach((frame, position) => {
      const expected = page.frames[order[position] - 1], rect = expected.atlasRect;
      assert.equal(frame.pageId, id);
      assert.deepEqual(frame.rect, [rect.x, rect.y, rect.width, rect.height]);
      assert.deepEqual(frame.pivot, [expected.pivot.x, expected.pivot.y]);
      assert.equal(frame.durationTicks, expected.durationMs * 80 / 1000);
      assert.equal(frame.durationTicks, phase === 'idle' ? 8 : 5);
    });
  }
  const entry = clips.get(defaults.entry), reverse = clips.get(defaults.exit);
  assert.equal(reverse.loop, false, 'A reversible exit is a one-shot.');
  assert.equal(reverse.ticksPerSecond, entry.ticksPerSecond);
  assert.deepEqual(reverse.frames, [...entry.frames].reverse(),
    'The reversible exit must use exactly the entry rectangles, pivots and durations in reverse order.');
  assert.equal(reverse.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), 80);
  for (const clip of atlas.clips) {
    assert.equal(clip.status, 'draft');
    for (const tick of [0, 80, 240, 100000]) {
      assert.equal(resolveHunterSpriteAtlasFrame(atlas, clip.id, clip.facing, tick), null,
        'Generated draft manifests must remain blocked by the existing artistic-review gate.');
    }
    for (const frame of clip.frames) distinctSourceCells.add(`${frame.pageId}:${frame.rect.join(',')}`);
    totalReferences += clip.frames.length;
  }
  totalPages += atlas.pages.length;
  totalClips += atlas.clips.length;
}
assert.equal(totalPages, 18);
assert.equal(totalClips, 24);
assert.equal(totalReferences, 468);
assert.equal(index.frameReferences, totalReferences);
assert.equal(distinctSourceCells.size, sourceDrawingCount);
console.log(JSON.stringify({
  status: 'passed', actions: source.actions.length, pages: totalPages,
  clips: totalClips, playbackReferences: totalReferences,
  sourceDrawings: sourceDrawingCount, reversibleExits: source.actions.length,
  dedicatedExitsPreserved: source.actions.length, productionStatus: 'draft',
  draftResolutionBlocked: true, artisticApproval: false, inGameValidation: false,
}, null, 2));
