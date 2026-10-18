import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const folder = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const results = [];
const seek = (ideal, range, density) => {
  const candidates = [];
  for (let position = Math.max(2, Math.round(ideal - range)); position < Math.min(density.length - 2, Math.round(ideal + range)); position++) {
    if (!density[position] && !density[position - 1] && !density[position + 1]) candidates.push(position);
  }
  candidates.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
  if (!candidates.length) throw new Error('No native transparent seam near ' + ideal);
  return candidates[0];
};
for (const name of fs.readdirSync(folder).filter(name => name.endsWith('-original.png')).sort()) {
  const file = path.join(folder, name), bytes = fs.readFileSync(file), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info, alpha = (x, y) => data[(y * width + x) * 4 + 3];
  const number = Number(name.slice(0, 2)), columns = number >= 7 ? 2 : 4, rows = number < 3 ? 4 : number >= 7 ? 6 : 3;
  try {
    const xDensity = new Uint32Array(width);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (alpha(x, y) > 2) xDensity[x]++;
    const xCuts = [0];
    for (let column = 1; column < columns; column++) xCuts.push(seek(column * width / columns, width / columns * .32, xDensity));
    xCuts.push(width);
    const cells = [], yCutsByColumn = [];
    for (let column = 0; column < columns; column++) {
      const x0 = xCuts[column], x1 = xCuts[column + 1], density = new Uint32Array(height);
      for (let y = 0; y < height; y++) for (let x = x0; x < x1; x++) if (alpha(x, y) > 2) density[y]++;
      const yCuts = [0];
      for (let row = 1; row < rows; row++) yCuts.push(seek(row * height / rows, height / rows * .32, density));
      yCuts.push(height); yCutsByColumn.push(yCuts);
      for (let row = 0; row < rows; row++) {
        const y0 = yCuts[row], y1 = yCuts[row + 1];
        let minX = x1, minY = y1, maxX = -1, maxY = -1, borderAlpha = 0, foregroundPixels = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const value = alpha(x, y);
          if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) borderAlpha = Math.max(borderAlpha, value);
          if (value > 2) { foregroundPixels++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        }
        if (!foregroundPixels || borderAlpha > 2) throw new Error('Unsafe native rectangle column ' + column + ' row ' + row + ' exterior alpha ' + borderAlpha);
        let footMin = x1, footMax = -1;
        for (let y = Math.max(minY, maxY - 24); y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (alpha(x, y) >= 64) { footMin = Math.min(footMin, x); footMax = Math.max(footMax, x); }
        const visibleRect = [minX, minY, maxX - minX + 1, maxY - minY + 1], drawing = Buffer.alloc(visibleRect[2] * visibleRect[3] * 4);
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (alpha(x, y) > 2) drawing.set(data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4), ((y - minY) * visibleRect[2] + x - minX) * 4);
        cells.push({ row, column, facing: column < columns / 2 ? 'right' : 'left', rect: [x0, y0, x1 - x0, y1 - y0], visibleRect,
          pivot: [(footMin + footMax) / 2 - x0, maxY - y0], borderAlpha, foregroundPixels, drawingSha256: crypto.createHash('sha256').update(drawing).digest('hex') });
      }
    }
    const native = { source: file, sha256, width, height, columns, rows, xCuts, yCutsByColumn, cells,
      uniqueDrawings: new Set(cells.map(cell => cell.drawingSha256)).size, pixelTransformation: 'none-readonly-measurement' };
    fs.writeFileSync(path.join(folder, name.replace('-original.png', '-native.json')), JSON.stringify(native, null, 2) + '\n');
    results.push({ name, sha256, safeRectangles: true, drawings: cells.length, uniqueDrawings: native.uniqueDrawings });
  } catch (error) { results.push({ name, sha256, safeRectangles: false, error: error.message }); }
}
fs.writeFileSync(path.join(folder, 'native-window-report.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
