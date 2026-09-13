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

function assetFrom(manifest, id, transparencyOverride) {
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
    transparency: transparencyOverride ?? asset.transparency,
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

function reviewFrames(asset) {
  assert.deepEqual(asset.runtimeClips, [], asset.id + ' must not expose a runtime clip');
  assert(Array.isArray(asset.reviewFrames) && asset.reviewFrames.length > 0, 'Missing free review frames: ' + asset.id);
  return asset.reviewFrames.map((frame, index) => {
    assert(Array.isArray(frame.rect) && frame.rect.length === 4, 'Invalid review rect: ' + asset.id + '/' + index);
    assert(Array.isArray(frame.pivot) && frame.pivot.length === 2, 'Invalid review pivot: ' + asset.id + '/' + index);
    const [x, y, width, height] = frame.rect;
    assert(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= asset.width && y + height <= asset.height,
      'Review rect outside source: ' + asset.id + '/' + index);
    assert(frame.pivot[0] >= 0 && frame.pivot[1] >= 0 && frame.pivot[0] <= width && frame.pivot[1] <= height,
      'Review pivot outside free rect: ' + asset.id + '/' + index);
    return {
      facing: frame.facing,
      phase: frame.phase,
      sourceRect: frame.rect,
      visibleRect: [0, 0, width, height],
      sourcePivot: frame.pivot,
    };
  });
}

const seatManifest = readJson('art-source/v34/vehicles/sphere-dejection-atmospherique/provenance.json');
const bisonManifest = readJson('art-source/v34/vehicles/bone-bison-de-guerre/provenance.json');
const razorManifest = readJson('art-source/v34/vehicles/razorwing/provenance.json');
const seatBaseRaw = seatManifest.assets.find(asset => asset.id === 'seat-base-detached-r1');
const armRaw = seatManifest.assets.find(asset => asset.id === 'controller-arch-states-r1');
const bisonBodyRaw = bisonManifest.assets.find(asset => asset.id === 'body-colour-concept-r1');
const saddleRaw = bisonManifest.assets.find(asset => asset.id === 'war-saddle-module-r1');
const guardRaw = bisonManifest.assets.find(asset => asset.id === 'war-flank-guard-module-r1');
const flightBodyRaw = razorManifest.assets.find(asset => asset.id === 'flight-body-layer-r1');
const nearWingRightRaw = razorManifest.assets.find(asset => asset.id === 'near-wing-right-beat-r1');
const nearWingLeftRaw = razorManifest.assets.find(asset => asset.id === 'near-wing-left-beat-r1');
const farWingRightRaw = razorManifest.assets.find(asset => asset.id === 'far-wing-right-beat-r1');
const farWingLeftRaw = razorManifest.assets.find(asset => asset.id === 'far-wing-left-beat-r1');
assert(seatBaseRaw && armRaw && bisonBodyRaw && saddleRaw && guardRaw, 'Incomplete modular source set');
assert(flightBodyRaw && nearWingRightRaw && nearWingLeftRaw && farWingRightRaw && farWingLeftRaw, 'Incomplete Razorwing layer set');

const resources = [
  assetFrom(seatManifest, 'seat-base-detached-r1'),
  assetFrom(seatManifest, 'controller-arch-states-r1'),
  assetFrom(bisonManifest, 'body-colour-concept-r1'),
  assetFrom(bisonManifest, 'war-saddle-module-r1'),
  assetFrom(bisonManifest, 'war-flank-guard-module-r1'),
  assetFrom(razorManifest, 'flight-body-layer-r1', {
    mode: 'color-key',
    rgb: [255, 0, 255],
    tolerance: 64,
    fringe: { mode: 'connected-magenta', radius: 3, minExcess: 16, strength: 1 },
  }),
  assetFrom(razorManifest, 'near-wing-right-beat-r1'),
  assetFrom(razorManifest, 'near-wing-left-beat-r1'),
  assetFrom(razorManifest, 'far-wing-right-beat-r1'),
  assetFrom(razorManifest, 'far-wing-left-beat-r1'),
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


const razorFrames = {
  body: reviewFrames(flightBodyRaw),
  nearRight: reviewFrames(nearWingRightRaw),
  nearLeft: reviewFrames(nearWingLeftRaw),
  farRight: reviewFrames(farWingRightRaw),
  farLeft: reviewFrames(farWingLeftRaw),
};
assert.deepEqual(razorFrames.body.map(frame => frame.facing), ['right', 'left']);
for (const id of ['nearRight', 'nearLeft', 'farRight', 'farLeft']) {
  assert.equal(razorFrames[id].length, 6, id + ' must keep six measured review poses');
  assert.equal(new Set(razorFrames[id].map(frame => frame.phase)).size, 6, id + ' phases must remain distinct');
}

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
      name: 'Bone Bison · montage de guerre statique',
      status: 'authored-review',
      calibrationStatus: 'static-module-fit-review',
      playable: false,
      facings: ['right', 'left'],
      defaultFacing: 'right',
      notes: [
        'La selle et la garde utilisent chacune une échelle et une translation propres, calibrées séparément pour les deux orientations.',
        'La selle repose sur le dos descendant derrière la bosse ; la garde couvre le flanc sans masquer les articulations ni les pieds.',
        'Les deux orientations viennent de dessins distincts ; aucun côté n’est obtenu par miroir logiciel.',
        'Montage statique de revue uniquement : les douze poses de marche r2 restent authored-review et ne portent encore aucun module animé.',
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
          id: 'flank-guard', label: 'Garde de flanc', resourceId: 'war-flank-guard-module-r1', defaultEnabled: true,
          scale: 0.25,
          transformByFacing: {
            right: { x: 300.75, y: 338.5, scale: 0.25 },
            left: { x: 640.75, y: 338.5, scale: 0.25 },
          },
          framesByFacing: Object.fromEntries(Object.entries(bisonFrames).map(([facing, set]) => [facing, [set.guard]])),
        },
        {
          id: 'war-saddle', label: 'Selle de guerre', resourceId: 'war-saddle-module-r1', defaultEnabled: true,
          scale: 0.36,
          transformByFacing: {
            right: { x: 224.7, y: 203.4, scale: 0.36 },
            left: { x: 602.9, y: 203.4, scale: 0.36 },
          },
          framesByFacing: Object.fromEntries(Object.entries(bisonFrames).map(([facing, set]) => [facing, [set.saddle]])),
        },
      ],
    },
    {
      id: 'razorwing-flight-rig-review',
      name: 'Razorwing \u00b7 montage de vol en revue',
      status: 'authored-review',
      calibrationStatus: 'estimated-flight-rig-review',
      playable: false,
      facings: ['right', 'left'],
      defaultFacing: 'right',
      notes: [
        'Les ailes arri\u00e8re passent derri\u00e8re le corps et les ailes proches devant ; chaque aile reste masquable s\u00e9par\u00e9ment.',
        'Les 26 dessins utiles sont d\u00e9coup\u00e9s par rectangles libres mesur\u00e9s : la grille approximative des planches ne sert jamais de crop.',
        'Les deux orientations utilisent des corps et des ailes source distincts ; aucun miroir logiciel.',
        'Le corps r1 reste utilis\u00e9 en revue : m\u00eame \u00e0 la tol\u00e9rance maximale 64, des pixels magenta restent visibles dans les cavit\u00e9s des griffes et derri\u00e8re la cr\u00eate.',
        'Quatre corrections OpenAI opaques ont \u00e9t\u00e9 rejet\u00e9es pour la m\u00eame frange ; la tentative alpha a \u00e9t\u00e9 rejet\u00e9e car son damier \u00e9tait peint sans canal alpha.',
        'Pivots, raccords et topologie restent estim\u00e9s pour inspection. Aucune animation de vol, collision ou pose moteur n\u2019est accept\u00e9e.',
      ],
      anchor: [850, 440],
      anchorByFacing: { right: [850, 440], left: [550, 440] },
      base: {
        resourceId: 'flight-body-layer-r1',
        scale: 0.85,
        frameByFacing: { right: razorFrames.body[0], left: razorFrames.body[1] },
        sourcePivot: [497, 146],
        sourcePivotByFacing: { right: [497, 146], left: [236, 146] },
      },
      sockets: {
        wingRoot: {
          sourcePoint: [497, 146],
          sourcePointByFacing: { right: [497, 146], left: [236, 146] },
        },
      },
      modules: [
        {
          id: 'far-wing',
          label: 'Aile arri\u00e8re',
          resourceId: 'far-wing-right-beat-r1',
          resourceIdByFacing: { right: 'far-wing-right-beat-r1', left: 'far-wing-left-beat-r1' },
          defaultEnabled: true,
          layer: 'behind',
          socketId: 'wingRoot',
          scale: 1,
          offsetByFacing: { right: [-8, -5], left: [8, -5] },
          framesByFacing: { right: razorFrames.farRight, left: razorFrames.farLeft },
        },
        {
          id: 'near-wing',
          label: 'Aile proche',
          resourceId: 'near-wing-right-beat-r1',
          resourceIdByFacing: { right: 'near-wing-right-beat-r1', left: 'near-wing-left-beat-r1' },
          defaultEnabled: true,
          layer: 'front',
          socketId: 'wingRoot',
          scale: 1.15,
          offsetByFacing: { right: [0, 0], left: [0, 0] },
          framesByFacing: { right: razorFrames.nearRight, left: razorFrames.nearLeft },
        },
      ],
      animation: {
        moduleId: 'near-wing',
        linkedModuleIds: ['near-wing', 'far-wing'],
        label: 'Battement des ailes \u00b7 revue',
        fps: 2.4,
      },
    },
  ],
};

assert.equal(new Set(resources.map(resource => resource.id)).size, resources.length, 'Duplicate resource id');
for (const assembly of manifest.assemblies) {
  assert.equal(assembly.playable, false);
  assert.equal(assembly.status, 'authored-review');
  assert(assembly.facings.includes(assembly.defaultFacing));
  assert(resources.some(resource => resource.id === assembly.base.resourceId), `Unknown base resource ${assembly.base.resourceId}`);
  for (const facing of assembly.facings) assert(assembly.base.frameByFacing[facing], `Missing base facing ${assembly.id}/${facing}`);
  for (const part of assembly.modules) {
    assert(resources.some(resource => resource.id === part.resourceId), `Unknown module resource ${part.resourceId}`);
    for (const id of Object.values(part.resourceIdByFacing ?? {})) assert(resources.some(resource => resource.id === id), `Unknown facing resource ${id}`);
    assert(part.layer === undefined || part.layer === 'behind' || part.layer === 'front', `Invalid layer ${assembly.id}/${part.id}`);
    for (const facing of assembly.facings) assert(part.framesByFacing[facing]?.length, `Missing module facing ${assembly.id}/${part.id}/${facing}`);
    if (part.transformByFacing) for (const facing of assembly.facings) {
      const transform = part.transformByFacing[facing];
      assert(transform && Number.isFinite(transform.x) && Number.isFinite(transform.y) && transform.scale > 0,
        `Invalid module transform ${assembly.id}/${part.id}/${facing}`);
    }
  }
  if (assembly.animation?.linkedModuleIds) for (const id of assembly.animation.linkedModuleIds) {
    assert(assembly.modules.some(part => part.id === id), `Unknown linked animation module ${assembly.id}/${id}`);
  }
}
assert.equal(resources.find(resource => resource.id === 'flight-body-layer-r1').transparency.tolerance, 64);
assert.equal(resources.find(resource => resource.id === 'flight-body-layer-r1').transparency.fringe.radius, 3);

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
  razorwingFacings: manifest.assemblies[2].facings,
  razorwingReviewPoses: razorFrames.nearRight.length,
}));
