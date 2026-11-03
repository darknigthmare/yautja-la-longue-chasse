// Render-only native decor for the existing V1–V5 terrains. No collision, cover, hazard or save field changes.
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const ROOT = process.cwd(); // run from the repository root
const bundled = await build({entryPoints: [path.join(ROOT, 'app/game/systems/gameReserveV66.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const OUT = path.join(ROOT, 'app/game/systems/gameReserveLegacyDecorData.ts');
const G = 438, DECOR = '/game/assets/v19/biome-decor/';
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = (rnd, a, b) => Math.round(a + rnd() * (b - a)), pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const sizeOf = src => { const b = fs.readFileSync(path.join(ROOT, 'public', src)); const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]; if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + (v >> 14 & 0x3fff)]; }
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; throw new Error(src); };
const KITS = {
  jungle: {surfaces: ['srf/srf-crushed-fern-bed-02-trail', 'srf/srf-footprint-mud-02-trail', 'srf/srf-rain-puddle-02-trail', 'srf/srf-crushed-fern-bed-04-crater'],
    ornaments: ['orn/orn-lake-reeds-01-single', 'orn/orn-lake-reeds-02-pair', 'orn/orn-storm-flower-01-single', 'orn/orn-transponder-debris-01-single', 'orn/orn-storm-flower-04-fallen'],
    supports: ['clm/clm-buttress-trunk-01-straight', 'clm/clm-buttress-trunk-04-interrupted', 'clm/clm-hanging-vine-01-straight']},
  ice: {surfaces: ['srf/srf-snowdrift-track-02-trail', 'srf/srf-black-ice-02-trail', 'srf/srf-frost-shard-trail-02-trail'],
    ornaments: ['orn/orn-emergency-beacon-01-single', 'orn/orn-bone-cache-04-fallen', 'orn/orn-mineral-nodule-01-single', 'orn/orn-frozen-cordage-04-fallen'],
    supports: ['clm/clm-crystal-column-01-straight', 'clm/clm-ice-wall-04-interrupted', 'clm/clm-maintenance-rope-01-straight']},
  desert: {surfaces: [], ornaments: [], supports: ['clm/clm-canyon-rock-face-01-straight', 'clm/clm-mine-ladder-01-straight', 'clm/clm-anchor-rope-01-straight']},
};
const TERRAINS = [
  {key: 'v1', state: {version: 1}, biome: 'jungle', seed: 1}, {key: 'v2', state: {version: 2}, biome: 'jungle', seed: 2},
  {key: 'v3', state: {version: 3}, biome: 'jungle', seed: 3}, {key: 'v4', state: {version: 4}, biome: 'jungle', seed: 4},
  {key: 'khar-duun-canyon-expedition', state: {version: 5, reserveId: 'khar-duun-canyon-expedition'}, biome: 'desert', seed: 5},
  {key: 'iskhel-ice-expedition', state: {version: 5, reserveId: 'iskhel-ice-expedition'}, biome: 'ice', seed: 6},
];
const aspect = a => (a.size[1] - 48) / (a.size[0] - 48);
const out = {};
for (const terrain of TERRAINS) {
  const rnd = mulberry(4113 + terrain.seed), kit = KITS[terrain.biome];
  const art = [...kit.surfaces, ...kit.ornaments, ...kit.supports].map(name => ({src: DECOR + terrain.biome + '/' + name + '.webp', size: sizeOf(DECOR + terrain.biome + '/' + name + '.webp')}));
  const sIdx = kit.surfaces.map((_, i) => i), oIdx = kit.ornaments.map((_, i) => kit.surfaces.length + i), cIdx = kit.supports.map((_, i) => kit.surfaces.length + kit.ornaments.length + i);
  const world = api.gameReserveV66World(terrain.state), platforms = api.gameReserveV66Platforms(terrain.state), cover = api.gameReserveV66Cover(terrain.state);
  const ships = api.gameReserveV66Ships(terrain.state), supplies = api.gameReserveV66Supplies(terrain.state);
  let sites = []; try { sites = terrain.state.version >= 3 ? api.gameReserveV66Sites(terrain.state) : []; } catch {}
  const decor = [], sectors = world.width / 1600;
  const blocked = (x, w, pad) => cover.some(c => x < c.x + c.w + pad && x + w > c.x - pad) || ships.some(s => x < s.x + 230 && x + w > s.x - 230) ||
    supplies.some(v => x < v + 40 && x + w > v - 40) || sites.some(s => s.y === 438 && x < s.x + 60 && x + w > s.x - 60) || x < 300 || x + w > world.width - 40;
  for (let s = 0; s < sectors; s++) {
    for (let n = 0; n < (sIdx.length ? 2 : 0); n++) for (let a = 0; a < 40; a++) {
      const i = pick(rnd, sIdx), w = R(rnd, 170, 260), h = Math.round(w * aspect(art[i])), x = R(rnd, s * 1600 + 30, (s + 1) * 1600 - w - 30);
      if (blocked(x, w, 20) || decor.some(d => d.layer === 'ground' && x < d.x + d.w + 80 && x + w > d.x - 80)) continue;
      decor.push({x, y: G + 14 - h, w, h, art: i, layer: 'ground'}); break; }
    for (let n = 0; n < (oIdx.length ? 2 : 0); n++) for (let a = 0; a < 40; a++) {
      const i = pick(rnd, oIdx), as = aspect(art[i]), h = as > 1 ? R(rnd, 72, 98) : R(rnd, 42, 58), w = Math.round(h / as), x = R(rnd, s * 1600 + 30, (s + 1) * 1600 - w - 30);
      if (blocked(x, w, 40) || decor.some(d => d.layer === 'back' && x < d.x + d.w + 180 && x + w > d.x - 180)) continue;
      decor.push({x, y: G + 6 - h, w, h, art: i, layer: 'back'}); break; }
  }
  for (const p of platforms) {
    if (p.y > 320 || p.w < 200 || rnd() > .5) continue;
    const i = pick(rnd, cIdx), h = G + 8 - (p.y + 14), w = Math.round(h / aspect(art[i])), x = Math.round(p.x + p.w / 2 - w / 2);
    if (ships.some(s => x < s.x + 200 && x + w > s.x - 200)) continue;
    decor.push({x, y: p.y + 14, w, h, art: i, layer: 'support'});
  }
  decor.sort((a, b) => a.x - b.x);
  out[terrain.key] = {art, decor};
  console.log(terrain.key, decor.length);
}
fs.writeFileSync(OUT, '// Generated render-only decor for V1–V5 terrains: native v19 props, no collision or save data.\n' +
  'export const GAME_RESERVE_LEGACY_DECOR = ' + JSON.stringify(out) + ' as const;\n');
