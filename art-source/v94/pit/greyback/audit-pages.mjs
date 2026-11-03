import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const folder = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const reports = [];
for (const name of fs.readdirSync(folder).filter(name => name.endsWith('-original.png')).sort()) {
  const file = path.join(folder, name), bytes = fs.readFileSync(file);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width, height = info.height, seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let transparentPixels = 0, borderInk = 0;
  const components = [];
  for (let index = 0; index < seen.length; index++) {
    const alpha = data[index * 4 + 3], x = index % width, y = Math.floor(index / width);
    if (alpha === 0) transparentPixels++;
    if (alpha >= 2 && (x < 2 || y < 2 || x >= width - 2 || y >= height - 2)) borderInk++;
    if (alpha < 2 || seen[index]) continue;
    let read = 0, write = 1, minX = x, maxX = x, minY = y, maxY = y;
    queue[0] = index; seen[index] = 1;
    while (read < write) {
      const current = queue[read++], cx = current % width, cy = Math.floor(current / width);
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      for (const next of [cx > 0 ? current - 1 : -1, cx + 1 < width ? current + 1 : -1, cy > 0 ? current - width : -1, cy + 1 < height ? current + width : -1]) {
        if (next < 0 || seen[next] || data[next * 4 + 3] < 2) continue;
        seen[next] = 1; queue[write++] = next;
      }
    }
    if (write >= 2000) components.push({ inkPixels: write, visibleRect: [minX, minY, maxX - minX + 1, maxY - minY + 1] });
  }
  const number = Number(name.slice(0, 2)), columns = number >= 7 ? 2 : 4;
  const rows = number < 3 ? 4 : number >= 7 ? 6 : 3;
  components.sort((a, b) => a.visibleRect[1] - b.visibleRect[1]);
  const drawings = [];
  for (let row = 0; row < rows; row++) {
    const group = components.slice(row * columns, row * columns + columns).sort((a, b) => a.visibleRect[0] - b.visibleRect[0]);
    for (let column = 0; column < group.length; column++) {
      const component = group[column], [x, y, w, h] = component.visibleRect;
      const rect = [x - 2, y - 2, w + 4, h + 4];
      let borderPixels = 0, totalInkPixels = 0;
      for (let ry = rect[1]; ry < rect[1] + rect[3]; ry++) for (let rx = rect[0]; rx < rect[0] + rect[2]; rx++) {
        if (rx < 0 || ry < 0 || rx >= width || ry >= height) continue;
        if (data[(ry * width + rx) * 4 + 3] < 2) continue;
        totalInkPixels++;
        if (rx < rect[0] + 2 || ry < rect[1] + 2 || rx >= rect[0] + rect[2] - 2 || ry >= rect[1] + rect[3] - 2) borderPixels++;
      }
      drawings.push({ row, column, ...component, rect, borderPixels, totalInkPixels, pivot: [x + w / 2 - rect[0], y + h - 1 - rect[1]] });
    }
  }
  const overlappingRects = [];
  for (let a = 0; a < drawings.length; a++) for (let b = a + 1; b < drawings.length; b++) {
    const one = drawings[a].rect, two = drawings[b].rect;
    if (one[0] < two[0] + two[2] && one[0] + one[2] > two[0] && one[1] < two[1] + two[3] && one[1] + one[3] > two[1]) overlappingRects.push([a, b]);
  }
  reports.push({ name, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), width, height, channels: info.channels,
    transparentPixels, borderInk, expectedDrawings: rows * columns, componentCount: components.length, overlappingRects, drawings });
}
fs.writeFileSync(path.join(folder, 'pixel-review.json'), JSON.stringify(reports, null, 2) + '\n');
console.log(JSON.stringify(reports.map(({ name, componentCount, expectedDrawings, overlappingRects, drawings, ...rest }) => ({ name, ...rest,
  componentCount, expectedDrawings, overlappingRects, rectBorderInk: drawings.reduce((sum, drawing) => sum + drawing.borderPixels, 0) })), null, 2));
