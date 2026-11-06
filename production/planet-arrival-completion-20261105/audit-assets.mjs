import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder, '../..');
const specs = [
  ['pod-hatch', 'Panneau extérieur, charnière haute', 887, 1774, { x: 444 / 887, y: 108 / 1774 }],
  ['pod-hatch-interior', 'Face intérieure distincte du même panneau', 887, 1774, { x: 444 / 887, y: 108 / 1774 }],
  ['vent-vapor', 'Vapeur dense, émission à chaque joint de porte', 1254, 1254, { x: 384 / 1254, y: 1117 / 1254 }],
  ['vent-vapor-thin', 'Phase dissipée sur le même émetteur', 1254, 1254, { x: 384 / 1254, y: 1117 / 1254 }],
  ['impact-fragment', 'Une pierre, neuf trajectoires indépendantes', 1254, 1254, { x: 584 / 1254, y: 834 / 1254 }],
  ['impact-ice-powder', 'Poudre de glace au contact sur Nivalis-K', 1774, 887, { x: .5, y: 835 / 887 }],
  ['impact-water-spray', 'Projection humide pour océan et marais', 1774, 887, { x: .5, y: 824 / 887 }],
];
const assets = [];
for (const [id, role, width, height, pivot] of specs) {
  const files = {};
  for (const extension of ['png', 'webp']) {
    const relative = 'public/game/planet-arrival/v2/' + id + '.' + extension;
    const bytes = await readFile(path.join(root, relative));
    const meta = await sharp(bytes).metadata();
    assert.deepEqual([meta.width, meta.height], [width, height], relative);
    assert.ok(meta.hasAlpha, relative);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0, transparent = 0, edge = 0;
    const bounds = [width, height, 0, 0];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * info.channels + info.channels - 1];
      if (alpha === 0) transparent++;
      if (alpha > 16) {
        visible++;
        bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edge++;
      }
    }
    assert.ok(visible > 500 && transparent > width * height * .05, relative);
    assert.equal(edge, 0, relative + ': opaque content touches the frame');
    files[extension] = { path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      width, height, visiblePixelsAbove16: visible, fullyTransparentPixels: transparent, boundsAbove16: bounds, edgePixelsAbove16: edge };
  }
  assets.push({ id, role, pivot, provenance: 'image_gen.imagegen, original project adaptation',
    artisticHumanApproval: false, files });
}
const source = 'public/game/planet-arrival/v2/pod-hatch-interior-source.png';
const sourceBytes = await readFile(path.join(root, source));
const result = { schema: 1, release: '1.4.1', generatedAt: new Date().toISOString(),
  scope: 'Seven individually authored parts and VFX, PNG masters and WebP runtime exports. No sprite sheet.',
  review: 'Technical alpha, bounds, size and registration checks. Not proof of frame-by-frame film fidelity.',
  panelRegistration: { source, sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    crop: { left: 117, top: 62, width: 720, height: 1538 }, registeredContentSize: [716, 1645],
    transparentPadding: { left: 83, right: 88, top: 69, bottom: 60 },
    note: 'The original generated reverse is retained. The production export registers its bounds to the existing rigid outer panel.' },
  assets };
await writeFile(path.join(folder, 'asset-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, assets: assets.length, exports: assets.length * 2, alphaAndBounds: 'passed' }));
