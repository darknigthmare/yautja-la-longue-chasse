import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const NOISE_FLOOR = 2;

function cutFromGutter(projection, target, size) {
  const low = Math.max(1, Math.ceil(target - size * .35));
  const high = Math.min(projection.length - 2, Math.floor(target + size * .35));
  const gaps = [];
  for (let index = low; index <= high; index++) {
    if (projection[index]) continue;
    const start = index;
    while (index < high && !projection[index + 1]) index++;
    gaps.push({ start, end: index, cut: Math.floor((start + index) / 2) });
  }
  return gaps.sort((a, b) => Math.abs(a.cut - target) - Math.abs(b.cut - target))[0] ?? null;
}

function rowPartitions(width, height, columns, rows, visible) {
  const yProjection = Array(height).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (visible(x, y)) yProjection[y]++;
  const rowCuts = Array(rows + 1).fill(null), separators = [], issues = [], rectangles = [];
  rowCuts[0] = 0; rowCuts[rows] = height;
  for (let row = 1; row < rows; row++) {
    const gap = cutFromGutter(yProjection, height * row / rows, height / rows);
    if (!gap || gap.cut <= (rowCuts[row - 1] ?? 0)) issues.push(`No safe horizontal alpha gutter before row ${row + 1}`);
    else { rowCuts[row] = gap.cut; separators.push({ axis: 'y', row, ...gap }); }
  }
  for (let row = 0; row < rows; row++) {
    if (rowCuts[row] === null || rowCuts[row + 1] === null) continue;
    // Adjacent rectangles may share the same entirely transparent gutter row.
    // This preserves one clear border on both drawings without erasing pixels.
    const top = rowCuts[row], bottom = rowCuts[row + 1] + Number(row < rows - 1), xProjection = Array(width).fill(0), columnCuts = Array(columns + 1).fill(null);
    columnCuts[0] = 0; columnCuts[columns] = width;
    for (let x = 0; x < width; x++) for (let y = top; y < bottom; y++) if (visible(x, y)) xProjection[x]++;
    for (let column = 1; column < columns; column++) {
      const gap = cutFromGutter(xProjection, width * column / columns, width / columns);
      if (!gap || gap.cut <= (columnCuts[column - 1] ?? 0)) issues.push(`No safe vertical alpha gutter in row ${row + 1}, before column ${column + 1}`);
      else { columnCuts[column] = gap.cut; separators.push({ axis: 'x', row, column, ...gap }); }
    }
    for (let column = 0; column < columns; column++) if (columnCuts[column] !== null && columnCuts[column + 1] !== null) rectangles.push({ row, column,
      rect: [columnCuts[column], top, columnCuts[column + 1] - columnCuts[column] + Number(column < columns - 1), bottom - top] });
  }
  return { separators, issues, rectangles };
}

/** Pixel measurement only: the source PNG is never rewritten or cropped. A
 * grid is a search hint. Every actual separator must be a clear alpha gutter. */
export async function measurePitWorkbookPageV100(file, { columns = 3, rows = 4, bodyHeightPx = null } = {}) {
  if (![columns, rows].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 16) ||
      bodyHeightPx !== null && (!Number.isFinite(bodyHeightPx) || bodyHeightPx <= 0)) throw new Error('Invalid measured-page parameters');
  const bytes = await fs.readFile(file);
  const source = sharp(bytes, { limitInputPixels: 16_777_216 });
  const metadata = await source.metadata();
  if (metadata.format !== 'png' || !metadata.hasAlpha) throw new Error('An original PNG with a real alpha channel is required');
  const { data, info } = await source.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width, height = info.height;
  const visible = (x, y) => data[(y * width + x) * info.channels + 3] > NOISE_FLOOR;
  let partition = rowPartitions(width, height, columns, rows, visible), strategy = 'row-first';
  if (partition.issues.length) {
    const transposed = rowPartitions(height, width, rows, columns, (x, y) => visible(y, x));
    if (!transposed.issues.length || transposed.rectangles.length > partition.rectangles.length) {
      strategy = 'column-first';
      const originalAxes = issue => issue.replace(/horizontal|vertical|row|column/g, token => ({ horizontal: 'vertical', vertical: 'horizontal', row: 'column', column: 'row' })[token]);
      partition = { issues: transposed.issues.map(issue => `Column-first: ${originalAxes(issue)}`), separators: transposed.separators.map(separator => ({ ...separator, axis: separator.axis === 'x' ? 'y' : 'x', primaryColumn: separator.row })),
        rectangles: transposed.rectangles.map(({ row, column, rect: [x, y, w, h] }) => ({ row: column, column: row, rect: [y, x, h, w] })) };
    } else partition.issues.push(...transposed.issues.map(issue => `Column-first: ${issue}`));
  }
  const { separators, issues } = partition;
  const frames = [];
  for (const { row, column, rect: [left, top, frameWidth, frameHeight] } of partition.rectangles) {
      const right = left + frameWidth, bottom = top + frameHeight;
      let minX = right, minY = bottom, maxX = left - 1, maxY = top - 1, pixels = 0, borderPixels = 0;
      const fingerprint = createHash('sha256');
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (visible(x, y)) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); pixels++;
        if (x === left || x === right - 1 || y === top || y === bottom - 1) borderPixels++;
      }
      if (!pixels) { issues.push(`Empty source cell ${row + 1}/${column + 1}`); continue; }
      const drawnPixels = Buffer.alloc((maxX - minX + 1) * (maxY - minY + 1) * 4);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (visible(x, y)) {
        data.copy(drawnPixels, ((y - minY) * (maxX - minX + 1) + x - minX) * 4, (y * width + x) * 4, (y * width + x + 1) * 4);
      }
      fingerprint.update(drawnPixels);
      if (borderPixels) issues.push(`Visible pixels touch the crop border in cell ${row + 1}/${column + 1}`);
      const footPixels = [];
      for (let x = minX; x <= maxX; x++) if ([maxY, maxY - 1, maxY - 2].some(y => y >= minY && visible(x, y))) footPixels.push(x);
      frames.push({ index: row * columns + column, row, column,
        rect: [left, top, right - left, bottom - top], visibleRect: [minX, minY, maxX - minX + 1, maxY - minY + 1],
        alphaPixels: pixels, borderPixels, visiblePixelSha256: fingerprint.digest('hex'),
        pivotCandidate: [(footPixels[0] + footPixels.at(-1)) / 2 - left, maxY + 1 - top],
        visibleHeightCandidate: maxY - minY + 1 });
  }
  frames.sort((a, b) => a.index - b.index);
  return { schemaVersion: 1, source: file, sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length, width, height, noiseFloor: NOISE_FLOOR, columns, rows, strategy,
    status: issues.length ? 'REJECT_CROP' : 'MEASURED_REQUIRES_VISUAL_REVIEW',
    bodyHeightPx, bodyReferenceStatus: bodyHeightPx === null ? 'REVIEWED_BODY_REFERENCE_REQUIRED' : 'EXPLICIT_REVIEWER_VALUE',
    warning: 'Foot pivots and silhouette heights are candidates. A weapon tip may be lower than a foot or higher than the head. Approve anatomy, actual feet and one fixed body reference before admission; these measurements do not approve art.',
    separators, frames, issues };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  let file, output;
  for (let index = 0; index < args.length; index++) {
    const name = args[index], value = args[++index];
    if (!value) throw new Error('Usage: --source PNG [--columns 3 --rows 4 --body-height N --output JSON]');
    if (name === '--source') file = value;
    else if (name === '--output') output = value;
    else if (name === '--columns' || name === '--rows') options[name.slice(2)] = Number(value);
    else if (name === '--body-height') options.bodyHeightPx = Number(value);
    else throw new Error('Unknown measurement argument');
  }
  if (!file) throw new Error('Missing --source PNG');
  const report = await measurePitWorkbookPageV100(file, options);
  if (output) { await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n'); }
  process.stdout.write(JSON.stringify(report) + '\n');
  if (report.status === 'REJECT_CROP') process.exitCode = 1;
}
