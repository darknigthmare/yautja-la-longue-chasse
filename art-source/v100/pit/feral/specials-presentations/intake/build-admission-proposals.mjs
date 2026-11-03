import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Metadata only. Original generated PNG bytes are never transformed or copied
// by this builder. Engine review must precede any public-file admission.
const directory = path.dirname(fileURLToPath(import.meta.url));
const configs = JSON.parse(await fs.readFile(path.join(directory, 'reviewed-pages.json'), 'utf8'));
for (const config of configs) {
  const pages = [], bounds = [], sourceHashes = {}, bodyHeights = {}, byName = new Map();
  for (const page of config.pages) {
    const measurement = JSON.parse(await fs.readFile(path.join(directory, `${page.source}.measurement.json`), 'utf8'));
    assert.equal(measurement.noiseFloor, 2);
    assert.ok(page.bodyHeightPx > 0 && page.bodyReference);
    const frames = new Map(measurement.frames.map(frame => [frame.index, frame]));
    for (const [index, pivot] of Object.entries(page.pivots)) {
      const frame = frames.get(Number(index));
      assert.ok(frame && frame.borderPixels === 0, `Unsafe crop ${page.source}/${index}`);
      assert.ok(pivot[0] >= 0 && pivot[0] <= frame.rect[2] && pivot[1] >= 0 && pivot[1] <= frame.rect[3]);
      bounds.push({ pageId: page.id, rect: frame.rect, visibleRect: frame.visibleRect });
    }
    const src = `/game/sprites/v100/pit/feral/${page.publicName}`;
    pages.push({ id: page.id, src, width: measurement.width, height: measurement.height, status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } });
    sourceHashes[src] = measurement.sourceSha256;
    bodyHeights[page.id] = page.bodyHeightPx;
    byName.set(page.source, { ...page, frames, measurement });
  }
  const clips = ['right', 'left'].map(facing => ({
    id: `workbook.${config.actionId}`, facing, status: 'validated', loop: false, ticksPerSecond: 60,
    frames: config.clips[facing].map(([source, index, durationTicks]) => {
      const page = byName.get(source), frame = page?.frames.get(index), pivot = page?.pivots[index];
      assert.ok(frame && pivot && frame.borderPixels === 0 && durationTicks > 0);
      assert.ok(!page.calibrationFrames.includes(index), 'Calibration may not be played as action');
      return { pageId: page.id, rect: frame.rect, pivot, durationTicks };
    }),
  }));
  const first = config.pages[0], atlasId = `feral-workbook-${config.key}-v100`;
  const proposal = {
    fighterId: 'feral-hunter', actionId: config.actionId, appearanceId: 'runtime-default', atlasId,
    clipIds: [`workbook.${config.actionId}`],
    definition: { fighterId: 'feral-hunter', bodyHeightPx: first.bodyHeightPx, pageBodyHeightPx: bodyHeights, visibleFrameBounds: bounds,
      atlas: { schemaVersion: 1, id: atlasId, characterId: 'feral-hunter', variantId: 'body-default-v100', sourceKind: 'authored-frames', status: 'validated', pages, clips } },
    review: { status: 'validated', scope: config.scope, sourceSha256: sourceHashes[pages[0].src], sourceHashes,
      notes: config.notes + ' Calibrations are excluded; playback durations are for visual inspection, not source mechanics.' },
  };
  await fs.writeFile(path.join(directory, `admission-proposal-${config.key}.json`), JSON.stringify(proposal, null, 2) + '\n');
  console.log(`${config.actionId}: ${clips.map(clip => `${clip.facing} ${clip.frames.length} action drawings / ${clip.frames.reduce((total, frame) => total + frame.durationTicks, 0)} inspection ticks`).join('; ')}`);
}
