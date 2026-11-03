import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Import native bytes only. Sharp is read-only here: no crop, mirror, recolor,
// background removal or generated in-between frames are written to the assets.
const generated = 'C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6';
const inputs = [
  { facing: 1, name: 'drone-flight-right.png', source: 'exec-c3818f6c-a113-43da-bb6e-070e5e809a6e.png', pivot: [900, 360] },
  { facing: -1, name: 'drone-flight-left.png', source: 'exec-3df2e970-f4a7-4833-bca1-aeb6bd70db26.png', pivot: [880, 360] },
];
const records = [];
for (const input of inputs) {
  const bytes = await fs.readFile(path.join(generated, input.source));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (Math.min(left, top, info.width - 1 - right, info.height - 1 - bottom) < 4) throw new Error('Native drawing touches its page edge: ' + input.source);
  const src = '/game/sprites/v58/pit/falconer/' + input.name;
  const destination = path.join('public', src);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(generated, input.source), destination);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (createHash('sha256').update(await fs.readFile(destination)).digest('hex') !== sha256) throw new Error('Native import changed source bytes');
  records.push({ facing: input.facing, src, width: info.width, height: info.height,
    referenceWidth: right - left + 1, sha256, generatedSource: input.source,
    frames: [{ pose: 'flight', rect: [0, 0, info.width, info.height], pivot: input.pivot,
      alphaBounds: [left, top, right - left + 1, bottom - top + 1] }] });
}
await fs.writeFile('app/game/data/pitFalconerDroneArtV58.json', JSON.stringify({ schemaVersion: 1, worldWidth: 72,
  presentation: 'One native held flight pose per side. Return reuses that side; no flapping animation or additional offensive weapon.',
  records }, null, 2) + '\n');
console.log(JSON.stringify({ imported: records.length, records }, null, 2));
