import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Read only: retain native RGBA and search each row's actual transparent seams.
// A missing separator rejects only its adjacent cells, never cleans up pixels.
const [file, rowsText = '3'] = process.argv.slice(2), rows = Number(rowsText);
const bytes = await fs.readFile(file);
const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) throw Error('Native four-channel alpha required');
const alpha = (x, y) => data[(y * info.width + x) * 4 + 3];
function seam(ideal, radius, density) {
  const candidates = [];
  for (let p = Math.max(1, Math.round(ideal - radius)); p <= Math.min(density.length - 2, Math.round(ideal + radius)); p++) {
    if (!density[p - 1] && !density[p] && !density[p + 1]) candidates.push(p);
  }
  candidates.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
  return candidates[0] ?? null;
}
const dy = new Uint32Array(info.height);
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (alpha(x, y) > 2) dy[y]++;
const yCuts = [0];
for (let row = 1; row < rows; row++) {
  const cut = seam(row * info.height / rows, info.height / rows * .32, dy);
  if (cut === null) throw Error('No horizontal separator for row ' + row);
  yCuts.push(cut);
}
yCuts.push(info.height);
const cells = [], rejected = [], separators = [];
for (let row = 0; row < rows; row++) {
  const y0 = yCuts[row], y1 = yCuts[row + 1], dx = new Uint32Array(info.width);
  for (let y = y0; y < y1; y++) for (let x = 0; x < info.width; x++) if (alpha(x, y) > 2) dx[x]++;
  const xCuts = [0];
  for (let col = 1; col < 4; col++) xCuts.push(seam(col * info.width / 4, info.width / 4 * .32, dx));
  xCuts.push(info.width); separators.push({ row, xCuts });
  for (let col = 0; col < 4; col++) {
    const x0 = xCuts[col], x1 = xCuts[col + 1];
    if (x0 === null || x1 === null) { rejected.push({ row, col, reason: 'missing-native-transparent-vertical-seam' }); continue; }
    const w = x1 - x0, h = y1 - y0, rect = [x0, y0, w, h];
    let minX = x1, minY = y1, maxX = -1, maxY = -1, borderAlpha = 0, count = 0;
    const pixels = Buffer.alloc(w * h * 4);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const a = alpha(x, y);
      if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) borderAlpha = Math.max(borderAlpha, a);
      if (a > 2) {
        count++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        const offset = (y * info.width + x) * 4, target = ((y - y0) * w + x - x0) * 4;
        pixels.set(data.subarray(offset, offset + 4), target);
      }
    }
    if (!count || borderAlpha > 2) { rejected.push({ row, col, reason: 'unsafe-native-cell-edge', borderAlpha }); continue; }
    let footMin = x1, footMax = -1;
    for (let y = Math.max(minY, maxY - 24); y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (alpha(x, y) >= 64) { footMin = Math.min(footMin, x); footMax = Math.max(footMax, x); }
    const foregroundWidth = maxX - minX + 1, foregroundHeight = maxY - minY + 1, shape = Buffer.alloc(foregroundWidth * foregroundHeight * 4);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (alpha(x, y) > 2) shape.set(data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4), ((y - minY) * foregroundWidth + x - minX) * 4);
    cells.push({ row, col, intendedFacing: col < 2 ? 'right' : 'left', rect,
      visibleRect: [minX, minY, foregroundWidth, foregroundHeight], pivot: [(footMin + footMax) / 2 - x0, maxY - y0], borderAlpha, foregroundPixels: count,
      canonicalCellSha256: crypto.createHash('sha256').update(pixels).digest('hex'), drawingSha256: crypto.createHash('sha256').update(shape).digest('hex') });
  }
}
console.log(JSON.stringify({ source: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), width: info.width, height: info.height, rows, yCuts, separators, cells, rejected,
  uniqueDrawings: new Set(cells.map(cell => cell.drawingSha256)).size, pixelTransformation: 'none-readonly-native-window-measurement' }, null, 2));
