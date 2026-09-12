import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'public/game/assets/v34/vehicle-assembly-review');
const PUBLIC_ROOT = path.join(ROOT, 'public');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assetFrom(manifest, id) {
  const asset = manifest.assets.find(candidate => candidate.id === id);
  assert(asset, `Missing asset ${manifest.vehicleId}/${id}`);
  assert.equal(asset.status, 'authored-review', `${id} must remain review-only`);
  assert.equal(asset.gameplayImplemented, false, `${id} must not imply gameplay`);
  assert(asset.publicPath.startsWith('/game/') && !asset.publicPath.includes('..'), `Unsafe public path: ${id}`);
  const file = path.join(PUBLIC_ROOT, asset.publicPath.slice(1));
  assert(fs.existsSync(file), `Missing public bitmap: ${asset.publicPath}`);
  assert.equal(sha256(file), asset.sha256, `Changed public bitmap: ${asset.publicPath}`);
  assert(asset.transparency?.mode === 'color-key', `${id} needs an explicit color key`);
  return {
    id,
    label: asset.label,
    src: asset.publicPath,
    width: asset.width,
    height: asset.height,
    sha256: asset.sha256,
    status: asset.status,
    transparency: asset.transparency,
  };
}

function localCell(asset, index) {
  const cell = asset.cells.find(candidate => candidate.index === index);
  assert(cell, `Missing cell ${asset.id}/${index}`);
  assert.equal(cell.gridBorderPixels, 0, `Grid leak in ${asset.id}/${index}`);
  const [cellX, cellY, cellWidth, cellHeight] = cell.reviewGridRect;
  const [alphaX, alphaY, alphaWidth, alphaHeight] = cell.alpha16Bounds;
  assert(alphaX >= cellX && alphaY >= cellY, `Alpha bounds before cell: ${asset.id}/${index}`);
  assert(alphaX + alphaWidth <= cellX + cellWidth && alphaY + alphaHeight <= cellY + cellHeight,
    `Alpha bounds outside cell: ${asset.id}/${index}`);
  return {
    facing: cell.facing,
    phase: cell.phase,
    sourceRect: cell.reviewGridRect,
    visibleRect: [alphaX - cellX, alphaY - cellY, alphaWidth, alphaHeight],
  };
}

const seatManifest = readJson('art-source/v34/vehicles/sphere-dejection-atmospherique/provenance.json');
const bisonManifest = readJson('art-source/v34/vehicles/bone-bison-de-guerre/provenance.json');
const seatBaseRaw = seatManifest.assets.find(asset => asset.id === 'seat-base-detached-r1');
const armRaw = seatManifest.assets.find(asset => asset.id === 'controller-arch-states-r1');
const bisonBodyRaw = bisonManifest.assets.find(asset => asset.id === 'body-colour-concept-r1');
const saddleRaw = bisonManifest.assets.find(asset => asset.id === 'war-saddle-module-r1');
const guardRaw = bisonManifest.assets.find(asset => asset.id === 'war-flank-guard-module-r1');
assert(seatBaseRaw && armRaw && bisonBodyRaw && saddleRaw && guardRaw, 'Incomplete modular source set');

const resources = [
  assetFrom(seatManifest, 'seat-base-detached-r1'),
  assetFrom(seatManifest, 'controller-arch-states-r1'),
  assetFrom(bisonManifest, 'body-colour-concept-r1'),
  assetFrom(bisonManifest, 'war-saddle-module-r1'),
  assetFrom(bisonManifest, 'war-flank-guard-module-r1'),
];

const armCells = armRaw.cells.map((_, index) => localCell(armRaw, index));
assert.deepEqual(armCells.map(cell => cell.facing), ['right', 'right', 'right', 'right'],
  'Controller source unexpectedly gained another orientation');
assert.equal(new Set(armCells.map(cell => cell.phase)).size, 4, 'Controller phases must remain distinct');

const bisonFrames = Object.fromEntries(['right', 'left'].map((facing, index) => [facing, {
  body: localCell(bisonBodyRaw, index),
  saddle: localCell(saddleRaw, index),
  guard: localCell(guardRaw, index),
}]));

const manifest = {
  schemaVersion: 1,
  title: 'Revue de montage véhicules V34',
  state: 'review-only',
  playable: false,
  sourceBitmapsPreserved: true,
  transparencyPipeline: 'processHunterSpriteTransparency',
  canvas: { width: 1200, height: 800, safeMargin: 18 },
  resources,
  assemblies: [
    {
      id: 'ejection-seat-controller',
      name: 'Sphère d’éjection atmosphérique · siège et bras',
      status: 'authored-review',
      calibrationStatus: 'static-pivot-review',
      playable: false,
      facings: ['right'],
      defaultFacing: 'right',
      notes: [
        'Le bras source ne fournit que la vue droite : aucune vue gauche n’est simulée ou miroir.',
        'Le corps du siège reste fixe ; les quatre dessins du bras utilisent chacun un pivot manuel sur la douille arrière.',
        'Montage de revue uniquement : interpolation, collisions, coque, pilote et animation jouable restent absents.',
      ],
      anchor: [620, 710],
      base: {
        resourceId: 'seat-base-detached-r1',
        scale: 0.82,
        frameByFacing: { right: localCell(seatBaseRaw, 0) },
        sourcePivot: [461.5, 774],
      },
      sockets: {
        controller: { sourcePoint: [184, 344] },
      },
      modules: [
        {
          id: 'controller-arm',
          label: 'Bras de commande',
          resourceId: 'controller-arch-states-r1',
          defaultEnabled: true,
          socketId: 'controller',
          scale: 0.48,
          framesByFacing: {
            right: armCells.map((cell, index) => ({
              ...cell,
              sourcePivot: [[145, 580], [130, 580], [106, 580], [78, 580]][index],
            })),
          },
        },
      ],
      animation: { moduleId: 'controller-arm', label: 'Déploiement du bras', fps: 2.2 },
    },
    {
      id: 'bone-bison-war-fit',
      name: 'Bone Bison · diagnostic des modules',
      status: 'authored-review',
      calibrationStatus: 'common-origin-unregistered',
      playable: false,
      facings: ['right', 'left'],
      defaultFacing: 'right',
      notes: [
        'La superposition naïve à origine et échelle communes recouvre la silhouette ; elle ne valide pas le calage et n’évalue pas encore les transformations propres à chaque module.',
        'Selle et garde restent désactivées par défaut et ne sont activables que pour diagnostiquer l’absence d’enregistrement commun.',
        'Les deux orientations viennent de dessins distincts ; aucun côté n’est obtenu par miroir logiciel.',
      ],
      anchor: [600, 710],
      base: {
        resourceId: 'body-colour-concept-r1',
        scale: 0.91,
        frameByFacing: Object.fromEntries(Object.entries(bisonFrames).map(([facing, set]) => [facing, set.body])),
        sourcePivot: [516.5, 645],
      },
      modules: [
        {
          id: 'war-saddle', label: 'Selle de guerre', resourceId: 'war-saddle-module-r1', defaultEnabled: false,
          scale: 0.91, anchorMode: 'base-grid',
          framesByFacing: Object.fromEntries(Object.entries(bisonFrames).map(([facing, set]) => [facing, [set.saddle]])),
        },
        {
          id: 'flank-guard', label: 'Garde de flanc', resourceId: 'war-flank-guard-module-r1', defaultEnabled: false,
          scale: 0.91, anchorMode: 'base-grid',
          framesByFacing: Object.fromEntries(Object.entries(bisonFrames).map(([facing, set]) => [facing, [set.guard]])),
        },
      ],
    },
  ],
};

assert.equal(new Set(resources.map(resource => resource.id)).size, resources.length, 'Duplicate resource id');
for (const assembly of manifest.assemblies) {
  assert.equal(assembly.playable, false);
  assert.equal(assembly.status, 'authored-review');
  assert(assembly.facings.includes(assembly.defaultFacing));
  for (const facing of assembly.facings) assert(assembly.base.frameByFacing[facing], `Missing base facing ${assembly.id}/${facing}`);
  for (const part of assembly.modules) {
    assert(resources.some(resource => resource.id === part.resourceId), `Unknown module resource ${part.resourceId}`);
    for (const facing of assembly.facings) assert(part.framesByFacing[facing]?.length, `Missing module facing ${assembly.id}/${part.id}/${facing}`);
  }
}

fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.copyFileSync(path.join(ROOT, 'scripts/vehicle-assembly-review-v34.html'), path.join(OUTPUT, 'index.html'));
await build({
  entryPoints: [path.join(ROOT, 'scripts/vehicle-assembly-review-v34.client.ts')],
  outfile: path.join(OUTPUT, 'review.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  logLevel: 'silent',
});

console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'),
  assemblies: manifest.assemblies.length,
  resources: resources.length,
  controllerPoses: armCells.length,
  seatFacings: manifest.assemblies[0].facings,
  bisonFacings: manifest.assemblies[1].facings,
}));
