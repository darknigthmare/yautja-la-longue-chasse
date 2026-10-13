import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const folder = 'art-source/v94/pit/greyback';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const variantId = 'elder-greyback-avec-casque-eda4af4a7d';
const reference = 'public/game/sprites/v44/user-hunters/eda4af4a7d6b975b26301ca7cd00a1b0e8c913de6f22d012e0434caed46d5763.png';
const native = JSON.parse(fs.readFileSync(path.join(folder, '05-victory-a-native.json'), 'utf8'));
const acceptedCells = native.cells.filter(cell => cell.facing === 'right').sort((a, b) => a.row - b.row || a.column - b.column);
const pageId = 'greyback-masked-victory-right-partial-v94', publicPath = 'public/game/sprites/v94/pit/greyback/05-greyback-masked-victory-right-partial-v94.png';
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.copyFileSync(path.join(folder, '05-victory-a-original.png'), publicPath);
const entry = { fighterId: 'greyback', variantId, bodyHeightPx: 478, pageBodyHeightPx: { [pageId]: 478 },
  atlas: { schemaVersion: 1, id: pageId, characterId: 'greyback', variantId, sourceKind: 'authored-frames', status: 'validated',
    pages: [{ id: pageId, src: publicPath.slice('public'.length), width: native.width, height: native.height, status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } }],
    clips: [{ id: 'pit.presentation.victory', facing: 'right', status: 'validated', loop: false, ticksPerSecond: 60,
      frames: acceptedCells.map(cell => ({ pageId, rect: cell.rect, pivot: cell.pivot, durationTicks: 20 })) }] },
  visibleFrameBounds: acceptedCells.map(cell => ({ pageId, rect: cell.rect, visibleRect: cell.visibleRect })) };
fs.writeFileSync('app/game/data/pitLifecycleGreybackV94.json', JSON.stringify([entry], null, 2) + '\n');
const sourceNames = [
  'exec-05a1d501-8377-4dde-be43-79fef8150a91.png', 'exec-a00eab85-9cb3-4371-aa8c-358cdd8e9d8e.png',
  'exec-b2931c05-a4e2-4f00-ad24-951c419b9bb2.png', 'exec-80c1612a-e70e-42e3-9bc1-317268948a64.png',
  'exec-b88bfd7b-30ee-4798-8e09-43c853ec87c3.png', 'exec-5f1da650-9c0d-45ff-a988-4cddab7e9bfe.png',
  'exec-6029963e-b5b6-4966-927c-f0e076d6a576.png', 'exec-7124ff56-ecab-4b29-9d41-0fc14f729dec.png',
  'exec-b7b87bca-7315-4f79-a4a5-04f10e2ad593.png', 'exec-ceed6547-3ef6-473b-9187-707c1539cfd1.png' ];
const originFolder = path.join(process.env.CODEX_HOME || path.join(process.env.USERPROFILE, '.codex'), 'generated_images', '01a134c5-ad0f-7a31-b525-f375d77cff6b');
const geometry = JSON.parse(fs.readFileSync(path.join(folder, 'native-window-report.json'), 'utf8'));
const visualNotes = {
  '03': 'Sword missing on four left-facing drawings', '04': 'Final right-half drawing faces right instead of left',
  '05': 'Right native cells accepted only; left top fourth drawing has no sword, left forearm costume inconsistent',
  '08': 'Sword absent on left-facing drawings' };
const archives = [];
for (const [index, name] of fs.readdirSync(folder).filter(name => name.endsWith('-original.png')).sort().entries()) {
  const bytes = fs.readFileSync(path.join(folder, name)), metadata = await sharp(bytes).metadata();
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer();
  let transparentPixels = 0; for (let offset = 3; offset < pixels.length; offset += 4) if (!pixels[offset]) transparentPixels++;
  if (!bytes.equals(fs.readFileSync(path.join(originFolder, sourceNames[index])))) throw new Error('Original byte mismatch: ' + name);
  const number = name.slice(0, 2), measurement = geometry.find(report => report.name === name);
  archives.push({ sourcePath: folder + '/' + name, generatorOriginalBasename: sourceNames[index], sha256: digest(bytes), bytes: bytes.length,
    width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, transparentPixels,
    apparentContactSheetDrawings: index < 2 ? 16 : 12, runtimeAcceptedDrawings: number === '05' ? 6 : 0,
    decision: number === '05' ? 'partial-right-native-six-cells-only' : 'refused',
    geometry: measurement, visualNote: visualNotes[number] ?? 'No gross equipment omission noted, but native alpha windows unsafe',
    pixelTransformation: 'none-byte-identical-copy' });
}
const intake = { schemaVersion: 1, fighterId: 'greyback', variantId, generator: 'built-in-imagegen',
  canonicalFidelityCertified: false, choreography: 'gameplay-adaptation-not-canonical-ritual',
  reference: { path: reference, sha256: digest(fs.readFileSync(reference)) },
  generationBudget: { permittedInitial: 10, actualInitial: 10, replacements: 0 },
  target: { families: 6, pages: 10, drawings: 128 },
  actual: { archivedPages: 10, publicPages: 1, acceptedDrawings: 6, acceptedClips: 1, completeFamilyCycles: 0 },
  archives,
  admission: { atlasId: pageId, publicPath, sourcePath: folder + '/05-victory-a-original.png', sha256: native.sha256,
    reviewDecision: 'accepted-partial-right-native-six-cells-only', sourcePageDrawings: 12, acceptedCells,
    excludedCells: native.cells.filter(cell => cell.facing !== 'right'), bodyHeightPx: 478,
    loop: false, ticksPerSecond: 60, durationTicks: 120, durationMs: 2000,
    fidelityLimits: ['No left clip admitted', 'Only opening six of target twelve poses', 'No 1:1 canonical appearance or choreography certification',
      'No public browser gameplay proof in this agent intake'], pixelTransformation: 'none-byte-identical-copy' } };
fs.writeFileSync(path.join(folder, 'intake.json'), JSON.stringify(intake, null, 2) + '\n');
console.log(JSON.stringify({ archived: archives.length, admitted: intake.actual, publicSha: digest(fs.readFileSync(publicPath)), bodyHeightPx: 478 }));
