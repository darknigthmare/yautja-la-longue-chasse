// Native image registration only: no pixel edits, flips, resizes or in-betweening.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const generated = process.env.V59_GENERATED_DIR || 'C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6';
const specs = [
  { action: 'launcher', facing: 'right', file: 'exec-3a097640-f800-4af9-8122-661982a41c07.png',
    rects: [[0, 0, 768, 520], [768, 0, 768, 520], [0, 520, 880, 504], [880, 520, 656, 504]] },
  { action: 'launcher', facing: 'left', file: 'exec-31a33730-ff1a-4e1c-8eba-4ee65dc3aabc.png',
    rects: [[0, 0, 748, 512], [748, 0, 788, 512], [0, 512, 815, 512], [815, 512, 721, 512]] },
  { action: 'shield', facing: 'right', file: 'exec-0551896d-eb98-43fc-bf76-6b622ce7ac93.png',
    rects: [[0, 0, 768, 504], [768, 0, 768, 504], [0, 504, 850, 520], [850, 504, 686, 520]] },
  { action: 'shield', facing: 'left', file: 'exec-4338f53d-1de1-44e9-b140-b8ada4031cd9.png',
    rects: [[0, 0, 820, 490], [820, 0, 716, 490], [0, 490, 875, 534], [875, 490, 661, 534]] },
];
const prepared = [];
for (const spec of specs) {
  const bytes = await fs.readFile(path.join(generated, spec.file));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 1536 || info.height !== 1024) throw Error('Re-measure unexpected native dimensions: ' + spec.file);
  const frames = spec.rects.map(([sx, sy, width, height], index) => {
    let left = width, top = height, right = -1, bottom = -1, support = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const alpha = data[((sy + y) * info.width + sx + x) * 4 + 3];
      if (alpha > 2) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      if (alpha > 16) support = Math.max(support, y);
    }
    const margins = [left, top, width - 1 - right, height - 1 - bottom];
    if (margins.some(value => value < 4)) throw Error(`${spec.action}/${spec.facing}/${index} alpha gutter: ${margins}`);
    let footLeft = width, footRight = -1;
    for (let y = Math.max(0, support - 50); y <= support; y++) for (let x = 0; x < width; x++) {
      if (data[((sy + y) * info.width + sx + x) * 4 + 3] >= 128) { footLeft = Math.min(footLeft, x); footRight = Math.max(footRight, x); }
    }
    return { rect: [sx, sy, width, height], pivot: [Math.round((footLeft + footRight) / 2), support],
      alphaBounds: [left, top, right - left + 1, bottom - top + 1], margins };
  });
  prepared.push({ bytes, record: { action: spec.action, facing: spec.facing,
    src: `/game/sprites/v59/pit/feral/${spec.action}-${spec.facing}.png`, nativeFile: spec.file,
    width: info.width, height: info.height, bodyHeight: 470,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...(spec.action === 'launcher' ? { muzzle: { frameIndex: 2,
      point: spec.facing === 'right' ? [848, 174] : [33, 156], measurement: 'visual-center-of-native-rails' } } : {}), frames } });
}
const records = prepared.map(entry => entry.record);
if (process.argv.includes('--measure')) { console.log(JSON.stringify(records, null, 2)); process.exit(0); }
await fs.mkdir('public/game/sprites/v59/pit/feral', { recursive: true });
for (const { bytes, record } of prepared) await fs.writeFile('public' + record.src, bytes);
await fs.writeFile('app/game/data/pitFeralArtV59.json', JSON.stringify({ schemaVersion: 1, records }, null, 2) + '\n');
const pageId = record => `feral-${record.action}-v59-${record.facing}`;
const definition = {
  fighterId: 'feral-hunter', bodyHeightPx: 470,
  pageBodyHeightPx: Object.fromEntries(records.map(record => [pageId(record), record.bodyHeight])),
  visibleFrameBounds: records.flatMap(record => record.frames.map(frame => ({
    pageId: pageId(record), rect: frame.rect,
    visibleRect: [frame.rect[0] + frame.alphaBounds[0], frame.rect[1] + frame.alphaBounds[1], ...frame.alphaBounds.slice(2)],
  }))),
  atlas: { schemaVersion: 1, id: 'feral-actions-v59', characterId: 'feral-hunter',
    variantId: 'default-v34-feral-actions', sourceKind: 'authored-frames', status: 'validated',
    pages: records.map(record => ({ id: pageId(record), src: record.src, width: record.width, height: record.height,
      status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } })),
    clips: records.flatMap(record => {
      const frame = (index, durationTicks) => ({ pageId: pageId(record), rect: record.frames[index].rect,
        pivot: record.frames[index].pivot, durationTicks });
      const launcher = record.action === 'launcher';
      const prefix = launcher ? 'pit.stand.technique.feral-guided-bolts-v58' : 'pit.stand.heavy';
      const clip = (phase, frames) => ({ id: `${prefix}.${phase}`, facing: record.facing,
        status: 'validated', loop: false, ticksPerSecond: 60, frames });
      return [clip('startup', [frame(0, launcher ? 4 : 6), frame(1, launcher ? 5 : 7)]),
        clip('active', [frame(2, 5)]), clip('recovery', [frame(2, launcher ? 6 : 8), frame(3, launcher ? 12 : 14)])];
    }),
  },
};
// Keep this registry a literal JSON-compatible array for existing audits/exporters.
const registryPath = 'app/game/pitSpriteSheetRegistry.ts';
const registryText = await fs.readFile(registryPath, 'utf8');
const start = registryText.indexOf('= [') + 2;
const registry = JSON.parse(registryText.slice(start).trim().replace(/;$/, ''));
const next = registry.filter(entry => entry.atlas.id !== definition.atlas.id);
const historical = next.find(entry => entry.atlas.id === 'feral-hunter-pit-v34');
// Retire only the mismatched shield action from active use; retain source PNG/history.
historical.atlas.clips = historical.atlas.clips.filter(clip => !clip.id.startsWith('pit.stand.heavy.'));
historical.atlas.pages = historical.atlas.pages.filter(page => page.id !== 'feral-hunter-heavy');
delete historical.pageBodyHeightPx['feral-hunter-heavy'];
next.unshift(definition);
await fs.writeFile(registryPath, registryText.slice(0, start) + JSON.stringify(next, null, 2) + ';\n');
console.log(JSON.stringify(records, null, 2));
