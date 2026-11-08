import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Original, already-versioned PNG bytes are preserved. This is an import, not
// new artwork, an animation admission or a change to the historical manifests.
const sourceRoot = 'art-source/xeno-prime/berceau-enfoui/v2.3';
const targetRoot = 'public/game/xeno-prime/berceau-v1';
const manifest = JSON.parse(await fs.readFile(`${sourceRoot}/MANIFEST_150_SPRITES.json`, 'utf8'));
const sourceScenes = JSON.parse(await fs.readFile('docs/campagne/xeno-prime/SCENES_ILLUSTREES.json', 'utf8'));
const checkOnly = process.argv.includes('--check');
const assets = {};
for (const item of manifest.items) {
  const source = `${sourceRoot}/${item.filename}`;
  const target = `${targetRoot}/${item.filename}`;
  const bytes = await fs.readFile(source);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== item.sha256) throw new Error(`Original artwork changed: ${source}`);
  if (checkOnly) {
    const actual = await fs.readFile(target);
    if (!bytes.equals(actual)) throw new Error(`Runtime copy changed: ${target}`);
  } else {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
  assets[item.id] = { id: item.id, name: item.name_fr, src: target.replace(/^public/, ''),
    width: item.width, height: item.height,
    bounds: item.content_bbox_px ?? [0, 0, item.width, item.height], sha256 };
}
// Decorative placements keep the authored source composition. Walkable surfaces,
// interactions, boss parts and the player's own rig are placed by the simulation.
const physicalIds = new Set(['013', '016', '020', '030', '034', '035', '036', '038', '039', '040', '041',
  '042', '043', '045', '047', '054', '055', '059', '060', '061', '062', '063', '065', '089', '090', '091', '094', '100', '103']);
const scenes = sourceScenes.scenes.map(scene => ({ id: String(scene.id).padStart(2, '0'),
  title: scene.title, description: scene.description, background: Object.values(assets).find(a => a.src.endsWith(scene.background))?.id,
  width: scene.width, height: scene.height,
  scenery: scene.placements.filter(p => !physicalIds.has(p.assetId)).map(p => ({ id: p.assetId,
    x: p.x, y: p.y, width: p.w, height: p.h, opacity: Math.min(p.opacity ?? 1, .85), flip: p.flipX ?? false,
    after: p.states?.apres === null ? null : p.states?.apres?.assetId ?? p.assetId })) }));
const result = JSON.stringify({ version: 1, source: `${sourceRoot}/MANIFEST_150_SPRITES.json`,
  artStatus: 'generated-unverified', assets, scenes }, null, 2) + '\n';
const output = 'app/game/data/buriedCradleArt.json';
if (checkOnly) {
  if (await fs.readFile(output, 'utf8') !== result) throw new Error('Runtime artwork registry differs');
} else await fs.writeFile(output, result);
console.log(JSON.stringify({ mode: checkOnly ? 'check' : 'import', pngs: Object.keys(assets).length,
  rooms: scenes.length, placements: scenes.reduce((n, scene) => n + scene.scenery.length, 0),
  humanArtValidation: false }));
