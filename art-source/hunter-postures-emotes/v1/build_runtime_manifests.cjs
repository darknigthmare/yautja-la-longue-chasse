#!/usr/bin/env node
'use strict';
// Schema adapters for review only. This file never grants artistic approval,
// registers a character in the roster, or edits any image pixels.
const fs = require('node:fs/promises');
const path = require('node:path');
const TIMEBASE = 80;
const PUBLIC_BASE = '/game/sprites/hunter-postures-emotes/v1';

async function main() {
  const folder = path.resolve(process.argv[2] || path.join(__dirname, '../../../public/game/sprites/hunter-postures-emotes/v1'));
  const output = path.resolve(process.argv[3] || path.join(folder, 'runtime_atlases'));
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'animations.json'), 'utf8'));
  const imports = JSON.parse(await fs.readFile(path.join(folder, 'import_atlases.json'), 'utf8'));
  const playback = JSON.parse(await fs.readFile(path.join(folder, 'playback.json'), 'utf8'));
  const sourceClips = new Map(manifest.clips.map(clip => [clip.id, clip]));
  const pagesById = new Map(imports.atlases.map(page => [page.id, page]));
  const index = {
    schemaVersion: 1,
    productionStatus: 'draft',
    schema: 'app/game/hunterSpriteAtlas.ts#HunterSpriteAtlas',
    characterId: 'reference-yautja',
    rosterBinding: null,
    facing: 'right',
    facingReview: 'Provisional schema routing value; source orientation must be confirmed by human art review before roster binding.',
    timing: {ticksPerSecond: TIMEBASE, transitionDurationTicks: 5, idleDurationTicks: 8},
    sourceDrawings: manifest.frameCount,
    drawingCountNote: 'Ping-pong frame references reuse the sixteen source drawings of each idle clip.',
    manifests: [],
  };
  if (pagesById.size !== sourceClips.size) throw new Error('Guarded and source clip counts differ.');
  await fs.mkdir(output, {recursive: true});
  let totalPages = 0, totalFrameReferences = 0;
  for (const action of manifest.actions) {
    if (!/^[a-z0-9_]+$/.test(action.id)) throw new Error('Invalid action identifier.');
    const atlas = {
      schemaVersion: 1,
      id: `reference-yautja-${action.id}-draft-v2`,
      characterId: 'reference-yautja',
      variantId: `${action.id}-reference-review`,
      sourceKind: 'authored-frames',
      status: 'draft',
      pages: [],
      clips: [],
    };
    for (const phase of ['enter', 'idle', 'exit']) {
      const id = `${action.id}_${phase}`;
      const source = sourceClips.get(id), imported = pagesById.get(id);
      if (!source || !imported || imported.guardPixels !== 2 || imported.frames.length !== 16) {
        throw new Error(`Missing or invalid guarded clip ${id}.`);
      }
      if (!imported.file.startsWith('import_atlases/') || imported.file.includes('..')) throw new Error('Invalid import path.');
      await fs.access(path.join(folder, imported.file));
      const page = {
        id, src: `${PUBLIC_BASE}/${imported.file}`,
        width: imported.atlasWidth, height: imported.atlasHeight,
        status: 'draft', grid: {columns: 4, rows: 4}, transparency: {mode: 'alpha'},
      };
      atlas.pages.push(page);
      const order = phase === 'idle'
        ? playback.idleOrderOneBased.map(number => number - 1)
        : imported.frames.map((_, position) => position);
      const frames = order.map(position => {
        const frame = imported.frames[position];
        if (!frame || !frame.pivot) throw new Error(`${id}: missing frame or pivot ${position}.`);
        const rect = frame.atlasRect;
        const durationTicks = frame.durationMs * TIMEBASE / 1000;
        if (!Number.isSafeInteger(durationTicks) || durationTicks <= 0) throw new Error(`${id}: invalid timing.`);
        return {
          pageId: id,
          rect: [rect.x, rect.y, rect.width, rect.height],
          pivot: [frame.pivot.x, frame.pivot.y],
          durationTicks,
        };
      });
      atlas.clips.push({id, facing: 'right', status: 'draft', loop: phase === 'idle', ticksPerSecond: TIMEBASE, frames});
    }
    const filename = `${action.id}.draft.json`;
    await fs.writeFile(path.join(output, filename), JSON.stringify(atlas, null, 2) + '\n');
    index.manifests.push({action: action.id, label: action.label, file: filename, atlasId: atlas.id, variantId: atlas.variantId});
    totalPages += atlas.pages.length;
    totalFrameReferences += atlas.clips.reduce((sum, clip) => sum + clip.frames.length, 0);
  }
  index.frameReferences = totalFrameReferences;
  await fs.writeFile(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(JSON.stringify({manifests: index.manifests.length, pages: totalPages, sourceDrawings: manifest.frameCount, frameReferences: totalFrameReferences, productionStatus: 'draft'}));
}
main().catch(error => {console.error(error.stack || String(error)); process.exitCode = 1;});
