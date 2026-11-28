#!/usr/bin/env node
/** The Isles V1 · draws the archipelago plan (docs/campagne/assets/isles-archipel-plan-20261128.png)
 * from the real generator: one tile in twenty of the streamed world, shaded by height, with the
 * island names of app/game/data/islesArchipelagoV1.json. Run it again after changing the data. */
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(path.join(root, 'app/game/data/islesArchipelagoV1.json'), 'utf8'));
const out = path.join(root, 'docs/campagne/assets/isles-archipel-plan-20261128.png');
const bundle = await build({stdin: {contents: 'export * from "./app/game/isles/islesArchipelagoGenV1";', resolveDir: root, loader: 'ts'},
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const {createArchipelagoWorldV1} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const living = JSON.parse(await readFile(path.join(root, 'app/game/data/islesLivingWorldV1.json'), 'utf8'));
const world = createArchipelagoWorldV1(data, 900, living);
const step = 20, W = Math.floor(world.map.width / step), H = Math.floor(world.map.depth / step);
const colors = {water: [38, 88, 118], ford: [92, 150, 140], sand: [222, 204, 150], grass: [111, 154, 74], jungle: [50, 110, 52], mud: [122, 99, 69], road: [124, 122, 116],
  bush: [76, 122, 55], crate: [138, 106, 58], rock: [140, 138, 128], tree: [30, 80, 34], wall: [90, 90, 90], roof: [170, 84, 56], pillar: [200, 180, 60], ruin: [200, 190, 150],
  snow: [240, 246, 250], lava: [230, 80, 30], savanna: [196, 180, 100], pine: [26, 66, 50], palm: [80, 150, 70], building: [70, 74, 86],
  rail: [48, 40, 36], cactus: [70, 120, 70], deadtree: [60, 52, 46], reed: [150, 160, 90], crop: [196, 180, 84]};
/** Colours a window of the world, one tile in `every`, from tile (x0, z0). */
function draw(x0, z0, width, height, every) {
  const image = Buffer.alloc(width * height * 3);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const t = world.tileAt(x0 + i * every, z0 + j * every);
    let c = colors[t.kind];
    if (t.kind === 'building') { const k = Math.min(1, t.height / 120); c = [70 + 150 * k, 74 + 120 * k, 86 + 90 * k]; }
    else if (t.base >= 3) { const k = 1 + Math.min(0.5, t.base / 1800); c = c.map(v => Math.min(255, v * k + Math.min(60, t.base * 0.05))); }
    image.set(c, (j * width + i) * 3);
  }
  return image;
}
const pixels = draw(0, 0, W, H, step);
const perKm = data.scale * 1000 / data.tileMeters / step;
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const label = (x, y, title, sub, size) => `<text x="${(x * perKm).toFixed(0)}" y="${(y * perKm).toFixed(0)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#10201a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${esc(title)}${
  sub ? `<tspan x="${(x * perKm).toFixed(0)}" dy="${size + 2}" font-size="${size - 5}" font-weight="400">${esc(sub)}</tspan>` : ''}</text>`;
const centre = points => [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="DejaVu Sans, Arial, sans-serif">`];
for (const island of data.islands) { const [x, y] = centre(island.outline); parts.push(label(x, y, island.number + ' · ' + island.name, island.biome, island.zones.length > 4 ? 22 : 17)); }
{ const [x, y] = centre(data.chain.islets.map(i => i.center)); parts.push(label(x, y + 0.78, data.chain.number + ' · ' + data.chain.name, data.chain.biome, 17)); }
for (const islet of data.islets) parts.push(label(islet.center[0], islet.center[1] - islet.radiusKm - 0.12, islet.name, '', 13));
for (const rig of data.seaZone.rigs) parts.push(label(rig.center[0] - 0.1, rig.center[1] + 0.3, rig.name.replace('Plateforme ', '').split(' «')[0], '', 13));
const km = 10 * 1000 / data.tileMeters / step;
parts.push(`<rect x="24" y="28" width="${km}" height="6" fill="#fff"/><text x="24" y="58" font-size="16" fill="#fff">10 km · carte de ${(world.map.width * data.tileMeters / 1000).toFixed(0)} × ${(world.map.depth * data.tileMeters / 1000).toFixed(0)} km, une tuile sur vingt</text>`, '</svg>');
await mkdir(path.dirname(out), {recursive: true});
const info = await sharp(pixels, {raw: {width: W, height: H, channels: 3}}).composite([{input: Buffer.from(parts.join('\n'))}]).png({compressionLevel: 9}).toFile(out);
process.stdout.write(path.relative(root, out) + ' · ' + info.width + ' × ' + info.height + ' · ' + Math.round(info.size / 1024) + ' Ko\n');
// Close view of the three islands drawn from the detailed plans (Calder, Eastbank, Steelwater): one tile in ten.
const close = path.join(root, 'docs/campagne/assets/isles-trois-iles-plan-20261128.png');
const perKmTiles = data.scale * 1000 / data.tileMeters, zoom = 10, cw = Math.floor(5 * perKmTiles / zoom), chh = Math.floor(8.6 * perKmTiles / zoom);
const closeInfo = await sharp(draw(Math.round(6.6 * perKmTiles), Math.round(3.5 * perKmTiles), cw, chh, zoom), {raw: {width: cw, height: chh, channels: 3}}).png({compressionLevel: 9}).toFile(close);
process.stdout.write(path.relative(root, close) + ' · ' + closeInfo.width + ' × ' + closeInfo.height + ' · ' + Math.round(closeInfo.size / 1024) + ' Ko\n');
