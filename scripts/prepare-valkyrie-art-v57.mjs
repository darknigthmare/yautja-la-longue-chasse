// Registers native PNG bytes and measured frame metadata. No pixel editing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = 'C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6';
const specs = [
  { facing: 'right', file: 'exec-211d077e-7b55-4707-bca3-f925088b4c71.png', bodyHeight: 535,
    rects: [[0, 0, 630, 645], [630, 0, 624, 645], [0, 645, 715, 609], [715, 645, 539, 609]] },
  { facing: 'left', file: 'exec-84361f58-7163-449f-a8c5-56aba73c6747.png', bodyHeight: 515,
    rects: [[0, 0, 650, 665], [650, 0, 604, 665], [0, 665, 700, 589], [700, 665, 554, 589]] },
];
const records = [];
await fs.mkdir('public/game/sprites/v57/pit/valkyrie', { recursive: true });
for (const spec of specs) {
  const bytes = await fs.readFile(path.join(root, spec.file));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frames = spec.rects.map(([sx, sy, w, h], index) => {
    let left = w, top = h, right = -1, bottom = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[((sy + y) * info.width + sx + x) * 4 + 3] > 16) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    const margins = [left, top, w - 1 - right, h - 1 - bottom];
    if (margins.some(value => value < 5)) throw Error(`${spec.facing}/${index} clipped: ${margins}`);
    let footLeft = w, footRight = -1;
    // Both feet occupy the bottom twelve percent of the body reference, never the overhead hammer.
    for (let y = Math.max(0, bottom - 64); y <= bottom; y++) for (let x = 0; x < w; x++) {
      if (data[((sy + y) * info.width + sx + x) * 4 + 3] >= 128) {
        footLeft = Math.min(footLeft, x); footRight = Math.max(footRight, x);
      }
    }
    return { rect: [sx, sy, w, h], pivot: [Math.round((footLeft + footRight) / 2), bottom],
      alphaBounds: [left, top, right - left + 1, bottom - top + 1], margins };
  });
  const src = `/game/sprites/v57/pit/valkyrie/hammer-${spec.facing}.png`;
  await fs.writeFile('public' + src, bytes);
  records.push({ facing: spec.facing, src, nativeFile: spec.file, width: info.width, height: info.height,
    bodyHeight: spec.bodyHeight, sha256: createHash('sha256').update(bytes).digest('hex'), frames });
}
await fs.writeFile('app/game/data/pitValkyrieArtV57.json', JSON.stringify({ schemaVersion: 1, records }, null, 2) + '\n');
// The historical registry is intentionally a literal JSON-compatible array.
const definition = {
  fighterId: 'valkyrie', bodyHeightPx: 535,
  pageBodyHeightPx: Object.fromEntries(records.map(r => ['valkyrie-hammer-' + r.facing, r.bodyHeight])),
  heldPoseClips: ['right', 'left'].map(facing => ({ id: 'idle', facing })),
  atlas: { schemaVersion: 1, id: 'valkyrie-hammer-v57', characterId: 'valkyrie',
    variantId: 'default-v31-hammer', sourceKind: 'authored-frames', status: 'validated',
    pages: records.map(r => ({ id: 'valkyrie-hammer-' + r.facing, src: r.src, width: r.width,
      height: r.height, status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } })),
    clips: records.flatMap(r => {
      const frame = (index, durationTicks) => ({ pageId: 'valkyrie-hammer-' + r.facing,
        rect: r.frames[index].rect, pivot: r.frames[index].pivot, durationTicks });
      const clip = (id, frames) => ({ id, facing: r.facing, status: 'validated', loop: false, ticksPerSecond: 60, frames });
      return [
        clip('pit.stand.technique.valkyrie-norse-hammer.startup', [frame(0, 12), frame(1, 16)]),
        clip('pit.stand.technique.valkyrie-norse-hammer.active', [frame(2, 7)]),
        clip('pit.stand.technique.valkyrie-norse-hammer.recovery', [frame(2, 16), frame(3, 20)]),
        clip('idle', [frame(3, 1)]),
      ];
    }),
  },
};
const registryPath = 'app/game/pitSpriteSheetRegistry.ts';
const registryText = await fs.readFile(registryPath, 'utf8');
const start = registryText.indexOf('= [') + 2;
const registry = JSON.parse(registryText.slice(start).trim().replace(/;$/, ''));
const next = registry.filter(entry => entry.atlas.id !== definition.atlas.id);
next.push(definition);
await fs.writeFile(registryPath, registryText.slice(0, start) + JSON.stringify(next, null, 2) + ';\n');
console.log(JSON.stringify(records, null, 2));
