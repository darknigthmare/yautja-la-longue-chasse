import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { build } from 'esbuild';

// A receipt writer and pixel audit, never an image generator or an automatic art approval.
const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const value of [job.vehicleId, job.id]) assert(/^[a-z0-9-]+$/.test(value));
const originId = job.originId ?? path.basename(job.input);
assert(typeof originId === 'string' && /^[A-Za-z0-9._-]+$/.test(originId), 'Invalid originId');
const bytes = fs.readFileSync(job.input);
const metadata = await sharp(bytes).metadata();
const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let clear = 0, partial = 0, magenta = 0;
for (let offset = 0; offset < data.length; offset += 4) {
  if (data[offset + 3] === 0) clear++;
  else if (data[offset + 3] < 255) partial++;
  if (data[offset] > 220 && data[offset + 1] < 40 && data[offset + 2] > 220) magenta++;
}
const trueAlpha = Boolean(metadata.hasAlpha && clear > info.width * info.height * .01);
const keyable = !trueAlpha && job.colorKey === 'magenta' && magenta > info.width * info.height * .15;
const transparency = trueAlpha ? { mode: 'alpha' } : keyable ? { mode: 'color-key', rgb: [255, 0, 255], tolerance: 48, fringe: { mode: 'connected-magenta', radius: 2, minExcess: 16, strength: 1 } } : { mode: 'alpha' };
const detectedStatus = trueAlpha || keyable ? 'authored-review' : 'rejected';
const reviewStatus = job.reviewStatus ?? detectedStatus;
assert(['authored-review', 'rejected'].includes(reviewStatus), 'Invalid reviewStatus');
if (reviewStatus === 'authored-review') assert(trueAlpha || keyable, 'Cannot approve a source without alpha or removable color key');
if (reviewStatus === 'rejected') assert(typeof job.rejectionReason === 'string' && job.rejectionReason.trim(), 'A rejected source requires rejectionReason');
const tempRoot = 'work/v34/vehicle-processing';fs.mkdirSync(tempRoot, { recursive: true });
const temp = fs.mkdtempSync(path.join(tempRoot, job.vehicleId + '-' + job.id + '-'));
await build({ entryPoints: ['app/game/hunterSpriteAtlas.ts'], outfile: temp + '/transparency.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const processor = await import(pathToFileURL(path.resolve(temp, 'transparency.mjs')).href);
const processed = processor.processHunterSpriteTransparency(data, info.width, info.height, transparency).pixels;
const cells = [];
const columns = job.columns ?? 1, rows = job.rows ?? 1;
for (let index = 0; index < columns * rows; index++) {
  const col = index % columns, row = Math.floor(index / columns);
  const left = Math.floor(info.width * col / columns), right = Math.floor(info.width * (col + 1) / columns);
  const top = Math.floor(info.height * row / rows), bottom = Math.floor(info.height * (row + 1) / rows);
  let minX = right, minY = bottom, maxX = left - 1, maxY = top - 1, borderPixels = 0, visiblePixels = 0;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (processed[(y * info.width + x) * 4 + 3] > 16) {
    visiblePixels++;minX = Math.min(minX, x);minY = Math.min(minY, y);maxX = Math.max(maxX, x);maxY = Math.max(maxY, y);
    if (x === left || x === right - 1 || y === top || y === bottom - 1) borderPixels++;
  }
  cells.push({ index, facing: job.cellFacings?.[index] ?? job.facings?.[row] ?? 'right', phase: job.cellPhases?.[index] ?? job.phases?.[index % columns] ?? job.actionId,
    reviewGridRect: [left, top, right - left, bottom - top], alpha16Bounds: visiblePixels ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null,
    gridBorderPixels: borderPixels, visiblePixels, runtimeFrameAccepted: false });
}
const sourceDirectory = 'art-source/v34/vehicles/' + job.vehicleId;
const publicDirectory = 'public/game/vehicles/v34/' + job.vehicleId;
fs.mkdirSync(sourceDirectory, { recursive: true });fs.mkdirSync(publicDirectory, { recursive: true });
const sourcePath = sourceDirectory + '/' + job.id + '.png';
const publicPath = '/game/vehicles/v34/' + job.vehicleId + '/' + job.id + '.png';
for (const output of [sourcePath, 'public' + publicPath]) {
  if (fs.existsSync(output)) assert(fs.readFileSync(output).equals(bytes), 'Refuse overwriting an existing source: ' + output);
  else fs.writeFileSync(output, bytes);
}
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const asset = { id: job.id, actionId: job.actionId, label: job.label ?? job.id, status: reviewStatus,
  rejectionReason: reviewStatus === 'rejected' ? job.rejectionReason.trim() : undefined,
  sourcePath, publicPath, originId, width: info.width, height: info.height, sha256: digest(bytes), bytes: bytes.length,
  generator: 'openai-imagegen', sourceBytesPreserved: true, transparency, rawAlpha: { zero: clear, partial, opaque: info.width * info.height - clear - partial },
  prompt: job.prompt, references: (job.references ?? []).map(reference => typeof reference === 'string' ? { path: reference, sha256: digest(fs.readFileSync(reference)) } : reference),
  notes: [...(job.notes ?? []), ...(!trueAlpha && !keyable ? ['Rejected for extraction: no actual alpha or declared removable color key.'] : [])], cells, runtimeClips: [], reviewFrames: [], gameplayImplemented: false };
const manifestPath = sourceDirectory + '/provenance.json';
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { schemaVersion: 1, vehicleId: job.vehicleId, name: job.vehicleName, lore: job.lore, assets: [] };
const existing = manifest.assets.findIndex(entry => entry.id === asset.id);
if (existing >= 0) { assert.equal(manifest.assets[existing].sha256, asset.sha256);manifest.assets[existing] = asset; } else manifest.assets.push(asset);
manifest.generatedSources = manifest.assets.length;manifest.acceptedRuntimeClips = manifest.assets.reduce((sum, entry) => sum + entry.runtimeClips.length, 0);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ path: publicPath, status: asset.status, trueAlpha, keyable, cells: cells.map(cell => ({ index: cell.index, rect: cell.alpha16Bounds, border: cell.gridBorderPixels })) }));
