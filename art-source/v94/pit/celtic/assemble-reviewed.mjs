import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

// Explicit human visual decisions + read-only native seam measurements.
// Source originals are preserved; accepted public sheets are byte-identical.
const dir = 'art-source/v94/pit/celtic';
const publicDir = 'public/game/sprites/v94/pit/celtic';
const variantId = 'celtic-avec-casque-0764ed4b53';
const referencePath = 'public/game/sprites/v44/user-hunters/0764ed4b539cc40c2c3dc91cfca405f0e01ac7a528a3d3412da18552dbbccb4e.png';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const references = [{ path: referencePath, sha256: hash(await fs.readFile(referencePath)), role: 'exact-supplied-masked-appearance' }];
const bodyHeights = { 1: 353, 2: 358, 3: 429, 4: 411, 5: 432, 8: 449, 9: 401, 10: 393 };
const measurements = new Map(), intakes = new Map();
for (let ordinal = 1; ordinal <= 10; ordinal++) {
  const prefix = String(ordinal).padStart(3, '0');
  measurements.set(ordinal, JSON.parse(await fs.readFile(dir + '/' + prefix + '-partial-windows.json', 'utf8')));
  intakes.set(ordinal, JSON.parse(await fs.readFile(dir + '/' + prefix + '-intake.json', 'utf8')));
}
const families = [
  { name: 'idle', pages: [1], targetPerFacing: 8, loop: true, ticks: 120 },
  { name: 'dizzy', pages: [2], targetPerFacing: 8, loop: true, ticks: 120 },
  { name: 'intro', pages: [3, 4], targetPerFacing: 12, loop: false, ticks: 72 },
  { name: 'victory', pages: [5], targetPerFacing: 12, loop: false, ticks: 120 },
  { name: 'defeat', pages: [8], targetPerFacing: 12, loop: false, ticks: 120 },
  { name: 'taunt', pages: [9, 10], targetPerFacing: 12, loop: false, ticks: 90 },
];
function admittedCell(ordinal, cell) {
  if (ordinal === 5 && cell.row === 0 && cell.col === 3) return false;
  if (ordinal === 8 && cell.col === 3) return false;
  return bodyHeights[ordinal] !== undefined;
}
const pageId = ordinal => 'celtic-masked-' + intakes.get(ordinal).family + (intakes.get(ordinal).part ? '-' + intakes.get(ordinal).part : '') + '-v94';
const entries = [], admissions = [];
await fs.mkdir(publicDir, { recursive: true });
for (const family of families) {
  const atlasId = 'celtic-masked-' + family.name + '-v94';
  const selected = family.pages.flatMap(ordinal => measurements.get(ordinal).cells.filter(cell => admittedCell(ordinal, cell)).map(cell => ({ ...cell, ordinal, pageId: pageId(ordinal), facing: cell.intendedFacing })));
  const clips = ['right', 'left'].map(facing => {
    const cells = selected.filter(cell => cell.facing === facing);
    const whole = Math.floor(family.ticks / cells.length), extra = family.ticks % cells.length;
    if (cells.length < 3) throw Error('No coherent native sequence for ' + family.name + ' ' + facing);
    return { id: family.name === 'idle' ? 'idle' : 'pit.presentation.' + family.name, facing, status: 'validated', loop: family.loop, ticksPerSecond: 60,
      frames: cells.map((cell, index) => ({ pageId: cell.pageId, rect: cell.rect, pivot: cell.pivot, durationTicks: whole + (index < extra ? 1 : 0) })) };
  });
  const entry = { fighterId: 'celtic', variantId, bodyHeightPx: bodyHeights[family.pages[0]],
    ...(family.pages.length > 1 ? { pageBodyHeightPx: Object.fromEntries(family.pages.map(ordinal => [pageId(ordinal), bodyHeights[ordinal]])) } : {}),
    atlas: { schemaVersion: 1, id: atlasId, characterId: 'celtic', variantId, sourceKind: 'authored-frames', status: 'validated',
      pages: family.pages.map(ordinal => ({ id: pageId(ordinal), src: '/game/sprites/v94/pit/celtic/' + intakes.get(ordinal).fileName, width: 1024, height: 1536, status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } })), clips },
    visibleFrameBounds: selected.map(cell => ({ pageId: cell.pageId, rect: cell.rect, visibleRect: cell.visibleRect })) };
  entries.push(entry);
  admissions.push({ atlasId, family: family.name, fighterId: 'celtic', variantId, targetPerFacing: family.targetPerFacing,
    admittedPerFacing: Object.fromEntries(clips.map(clip => [clip.facing, clip.frames.length])), completeRequestedCount: clips.every(clip => clip.frames.length === family.targetPerFacing),
    clipTicks: family.ticks, canonicalFidelityCertified: false, gestureProvenance: 'original-sober-presentation-adaptation-no-new-canonical-rite',
    reviewDecision: 'accepted-cells-only-visual-native-alpha-no-pixel-transform', bodyHeightPx: entry.bodyHeightPx, pageBodyHeightPx: entry.pageBodyHeightPx,
    cells: selected, references });
}
const pages = [];
for (let ordinal = 1; ordinal <= 10; ordinal++) {
  const intake = intakes.get(ordinal), measure = measurements.get(ordinal), used = admissions.flatMap(entry => entry.cells).filter(cell => cell.ordinal === ordinal);
  const unused = measure.cells.filter(cell => !used.some(accepted => accepted.row === cell.row && accepted.col === cell.col)).map(cell => ({ row: cell.row, col: cell.col,
    reason: ordinal === 5 ? 'wrist-blades-absent-in-this-pose' : ordinal === 8 ? 'wrong-facing-right-in-left-column' : ordinal === 6 ? 'armor-continuity-change-with-victory-a' : 'page-a-to-b-returns-upright-and-column-four-gear-facing-defects' }));
  const decision = used.length ? 'accepted-selected-native-cells-only' : 'preserved-not-imported';
  if (hash(await fs.readFile(intake.sourcePath)) !== intake.sha256 || measure.sha256 !== intake.sha256) throw Error('Source SHA changed');
  let publicPath = null;
  if (used.length) {
    publicPath = path.posix.join(publicDir, intake.fileName);
    await fs.copyFile(intake.sourcePath, publicPath);
    if (!(await fs.readFile(publicPath)).equals(await fs.readFile(intake.sourcePath))) throw Error('Public bytes differ');
  }
  pages.push({ ordinal, sourcePath: intake.sourcePath, publicPath, sha256: intake.sha256, bytes: intake.bytes, pageId: pageId(ordinal), bodyHeightPx: bodyHeights[ordinal] ?? null,
    zeroAlphaFraction: intake.zeroAlphaFraction, reviewDecision: decision, acceptedCells: used.map(cell => ({ row: cell.row, col: cell.col })),
    excludedCells: [...unused, ...measure.rejected], pixelTransformation: 'none-byte-identical-copy', canonicalFidelityCertified: false });
  intake.status = decision; intake.review = pages.at(-1);
  await fs.writeFile(dir + '/' + String(ordinal).padStart(3, '0') + '-intake.json', JSON.stringify(intake, null, 2) + '\n');
}
const manifest = { schemaVersion: 1, fighterId: 'celtic', variantId, references, primaryContext: {
  url: 'https://store.necaonline.com/blogs/behind-the-scenes/172393927-closer-look-predators-series-14-action-figures-final',
  scope: 'Official 2004-AVP Celtic context and character-specific armor/weapons. It does not establish any animation or ritual.' },
  originalPages: 10, targetDrawings: 128, admittedPages: pages.filter(page => page.publicPath).length,
  admittedDrawings: admissions.reduce((sum, entry) => sum + entry.cells.length, 0), admittedClips: entries.reduce((sum, entry) => sum + entry.atlas.clips.length, 0),
  canonicalFidelityCertified: false, pixelTransformation: 'none-byte-identical-copy',
  scope: 'Complete native counts for idle, dizzy, intro; explicitly partial victory, nonlethal defeat and taunt. Public sheets can contain excluded cells which are never referenced by a clip.', pages, entries: admissions };
await fs.writeFile(dir + '/lifecycle-admission.json', JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile('app/game/data/pitLifecycleCelticV94.json', JSON.stringify(entries, null, 2) + '\n');
console.log(JSON.stringify({ pages: manifest.admittedPages, drawings: manifest.admittedDrawings, clips: manifest.admittedClips, families: admissions.map(({ family, admittedPerFacing, completeRequestedCount }) => ({ family, admittedPerFacing, completeRequestedCount })), dataSha256: hash(await fs.readFile('app/game/data/pitLifecycleCelticV94.json')) }, null, 2));
