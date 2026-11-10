#!/usr/bin/env node
'use strict';
// Native HunterSpriteAtlas shape, still draft and unretimed for gameplay.
const fs = require('node:fs/promises');
const path = require('node:path');
const {assert} = require('./playback_core.js');
async function build(folder, output) {
  folder = path.resolve(folder); output = path.resolve(output || path.join(folder, 'runtime_atlases'));
  const read = async name => JSON.parse(await fs.readFile(path.join(folder, name), 'utf8'));
  const [manifest, imports, playback] = await Promise.all([read('animations.json'), read('import_atlases.json'), read('playback.json')]);
  assert(manifest.artisticStatus === 'draft', 'Only draft asset exports are accepted.');
  const pagesById = new Map(imports.atlases.map(page => [page.id, page]));
  const index = {schemaVersion: 1, deliveryRevision: manifest.version, productionStatus: 'draft', schema: 'app/game/hunterSpriteAtlas.ts#HunterSpriteAtlas', characterId: manifest.characterId, rosterBinding: null, facing: manifest.facing, facingReview: manifest.facingReview, timing: {ticksPerSecond: playback.ticksPerSecond, purpose: 'Art review only', gameplayTimingStatus: 'unretimed-review', gameplayTimingChanged: false}, sourceDrawings: manifest.frameCount, defaultPlayback: {}, manifests: [], frameReferences: 0};
  await fs.mkdir(output, {recursive: true});
  for (const action of playback.actions) {
    const source = manifest.actions.find(item => item.id === action.id);
    const ids = [...new Set(Object.values(action.phases).flatMap(phase => phase.sourceClips))];
    const atlas = {schemaVersion: 1, id: `${manifest.characterId}-${action.id}-support-draft-v1`, characterId: manifest.characterId, variantId: `${action.id}-support-reference-review`, sourceKind: 'authored-frames', status: 'draft', pages: [], clips: []};
    for (const id of ids) {
      const imported = pagesById.get(id);
      assert(imported && imported.guardPixels === 2 && imported.frames.length === 16, `Missing guarded source ${id}.`);
      assert(imported.file.startsWith('import_atlases/') && !imported.file.includes('..'), 'Unsafe import path.');
      await fs.access(path.join(folder, imported.file));
      atlas.pages.push({id, src: `${manifest.publicBase}/${imported.file}`, width: imported.atlasWidth, height: imported.atlasHeight, status: 'draft', grid: {columns: 4, rows: 4}, transparency: {mode: 'alpha'}});
    }
    index.defaultPlayback[action.id] = {};
    for (const [phaseKey, phase] of Object.entries(action.phases)) {
      const frames = phase.steps.map(step => {
        const imported = pagesById.get(step.clip), frame = imported.frames[step.number - 1];
        assert(frame && Number.isSafeInteger(step.durationTicks) && step.durationTicks > 0, `${action.id}: invalid source reference.`);
        const rect = frame.atlasRect;
        return {pageId: step.clip, rect: [rect.x, rect.y, rect.width, rect.height], pivot: [frame.pivot.x, frame.pivot.y], durationTicks: step.durationTicks};
      });
      atlas.clips.push({id: phase.id, facing: manifest.facing, status: 'draft', loop: phase.loop, ticksPerSecond: playback.ticksPerSecond, frames});
      index.defaultPlayback[action.id][phaseKey] = phase.id;
      index.frameReferences += frames.length;
    }
    const file = `${action.id}.draft.json`;
    await fs.writeFile(path.join(output, file), JSON.stringify(atlas, null, 2) + '\n');
    index.manifests.push({action: action.id, label: action.label, kind: action.kind, file, atlasId: atlas.id, variantId: atlas.variantId, gameplayTiming: source.gameplayTiming || null, gameCoverage: source.gameCoverage || null, artisticReviewNotes:manifest.clips.filter(clip=>ids.includes(clip.id) && clip.registration?.residualSeam).map(clip=>({clip:clip.id,note:clip.registration.residualSeam,evidence:clip.registration.evidence,review:clip.registration.review}))});
  }
  await fs.writeFile(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  return {manifests: index.manifests.length, sourceDrawings: index.sourceDrawings, frameReferences: index.frameReferences, reviewTicksPerSecond: playback.ticksPerSecond, status: 'draft', gameplayTiming: 'unretimed'};
}
if (require.main === module) build(process.argv[2] || __dirname, process.argv[3]).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.stack); process.exitCode = 1;});
module.exports = {build};

