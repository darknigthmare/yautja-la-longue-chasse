#!/usr/bin/env node
// Node >=22.13 with --experimental-strip-types. Uses the actual game contract.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.resolve(process.argv[2] || here);
const contract = path.resolve(process.argv[3] || path.join(here, '../../../app/game/hunterSpriteAtlas.ts'));
const {validateHunterSpriteAtlas, resolveHunterSpriteAtlasFrame} = await import(pathToFileURL(contract));
const read = async file => JSON.parse(await readFile(path.join(folder, file), 'utf8'));
const [manifest, imports, playback, index] = await Promise.all(['animations.json','import_atlases.json','playback.json','runtime_atlases/index.json'].map(read));
assert.equal(index.productionStatus, 'draft'); assert.equal(index.rosterBinding, null);
assert.equal(index.timing.gameplayTimingStatus, 'unretimed-review');
assert.equal(index.manifests.length, manifest.actions.length);
assert.equal(index.sourceDrawings, manifest.frameCount);
const pages = new Map(imports.atlases.map(item => [item.id, item]));
let nativeClips = 0, references = 0;
const sourceDrawings = new Set();
for (const action of playback.actions) {
  const item = index.manifests.find(entry => entry.action === action.id);
  assert.ok(item); assert.equal(path.basename(item.file), item.file);
  const atlas = await read(`runtime_atlases/${item.file}`);
  const checked = validateHunterSpriteAtlas(atlas);
  assert.equal(checked.valid, true, JSON.stringify(checked.issues));
  assert.equal(atlas.status, 'draft');
  assert.ok(atlas.pages.every(page => page.status === 'draft' && page.transparency.mode === 'alpha'));
  assert.equal(atlas.clips.length, Object.keys(action.phases).length);
  assert.deepEqual(atlas.pages.map(page => page.id).sort(), [...new Set(Object.values(action.phases).flatMap(phase => phase.sourceClips))].sort());
  assert.deepEqual(Object.keys(index.defaultPlayback[action.id]).sort(), Object.keys(action.phases).sort());
  for (const [phaseKey, phase] of Object.entries(action.phases)) {
    const clip = atlas.clips.find(entry => entry.id === phase.id);
    assert.ok(clip); assert.equal(clip.status, 'draft'); assert.equal(clip.facing, 'right');
    assert.equal(index.defaultPlayback[action.id][phaseKey], clip.id);
    assert.equal(clip.loop, phase.loop); assert.equal(clip.frames.length, phase.steps.length);
    assert.equal(clip.ticksPerSecond, playback.ticksPerSecond);
    clip.frames.forEach((frame, position) => {
      const step = phase.steps[position], imported = pages.get(step.clip).frames[step.number - 1], rect = imported.atlasRect;
      assert.equal(frame.pageId, step.clip);
      assert.deepEqual(frame.rect, [rect.x, rect.y, rect.width, rect.height]);
      assert.deepEqual(frame.pivot, [imported.pivot.x, imported.pivot.y]);
      assert.equal(frame.durationTicks, step.durationTicks);
      sourceDrawings.add(`${step.clip}:${step.number}`);
    });
    for (const tick of [0, phase.durationTicks, 100000]) assert.equal(resolveHunterSpriteAtlasFrame(atlas, clip.id, clip.facing, tick), null, 'Generated drafts must stay blocked by the existing art-review gate.');
    references += clip.frames.length; nativeClips++;
  }
}
assert.equal(sourceDrawings.size, manifest.frameCount);
assert.equal(references, index.frameReferences);
console.log(JSON.stringify({status:'passed',actions:manifest.actions.length,nativeClips,frameReferences:references,sourceDrawings:sourceDrawings.size,actualGameContract:true,draftResolutionBlocked:true,artisticApproval:false,inGameValidation:false}));
