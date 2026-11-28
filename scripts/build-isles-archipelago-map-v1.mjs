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
const world = createArchipelagoWorldV1(data);
const step = 20, W = Math.floor(world.map.width / step), H = Math.floor(world.map.depth / step);
const colors = {water: [38, 88, 118], ford: [92, 150, 140], sand: [222, 204, 150], grass: [111, 154, 74], jungle: [50, 110, 52], mud: [122, 99, 69], road: [124, 122, 116],
  bush: [76, 122, 55], crate: [138, 106, 58], rock: [140, 138, 128], tree: [30, 80, 34], wall: [90, 90, 90], roof: [170, 84, 56], pillar: [200, 180, 60], ruin: [200, 190, 150],
  snow: [240, 246, 250], lava: [230, 80, 30], savanna: [196, 180, 100], pine: [26, 66, 50], palm: [80, 150, 70], building: [70, 74, 86]};
const pixels = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const t = world.tileAt(i * step, j * step);
  let c = colors[t.kind];
  if (t.kind === 'building') { const k = Math.min(1, t.height / 120); c = [70 + 150 * k, 74 + 120 * k, 86 + 90 * k]; }
  else if (t.base >= 3) { const k = Math.min(1.35, 1 + t.base / 90); c = c.map(v => Math.min(255, v * k + t.base * 0.9)); }
  pixels.set(c, (j * W + i) * 3);
}
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
