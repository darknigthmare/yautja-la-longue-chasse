#!/usr/bin/env node
/** The Isles V1 · draws the archipelago plan (docs/campagne/assets/isles-archipel-plan-20261128.svg)
 * from app/game/data/islesArchipelagoV1.json, itself traced from the owner's « Plan 2 » (17 May 2023).
 * `--check` fails when the committed SVG differs from the data. */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(path.join(root, 'app/game/data/islesArchipelagoV1.json'), 'utf8'));
const out = path.join(root, 'docs/campagne/assets/isles-archipel-plan-20261128.svg');
const S = 100, pad = 30, [w, h] = data.sizeKm;
const colors = {quarantaine: '#8d8a84', 'désert': '#d9b877', 'forêt de pins': '#4d7a52', volcan: '#7a5548', 'métropole': '#b9bcc4', industriel: '#9a8f86',
  commercial: '#d7c3a0', lande: '#9bb07a', tropical: '#5fae7a', jungle: '#3f8a4d', 'méditerranéen': '#c9c08a', marais: '#6f8f6a', toundra: '#e6eef2', savane: '#cdbb6a'};
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pt = ([x, y]) => (pad + x * S).toFixed(0) + ',' + (pad + y * S).toFixed(0);
const centroid = points => [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
const label = (x, y, title, sub, size = 15) => `<text x="${(pad + x * S).toFixed(0)}" y="${(pad + y * S).toFixed(0)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#14201b" stroke="#ffffff" stroke-width="3" paint-order="stroke">${esc(title)}${
  sub ? `<tspan x="${(pad + x * S).toFixed(0)}" dy="${size + 1}" font-size="${size - 4}" font-weight="400">${esc(sub)}</tspan>` : ''}</text>`;

const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * S + 2 * pad} ${h * S + 2 * pad + 40}" font-family="system-ui, sans-serif" role="img" aria-labelledby="t d">`,
  `<title id="t">Archipel des Îles, d’après le Plan 2</title><desc id="d">Quatorze îles numérotées, la chaîne des Shallows, six îlots et trois plateformes pétrolières, sur environ 12 km.</desc>`,
  `<rect width="100%" height="100%" fill="#2f6f86"/>`];
for (const [a, b] of data.links) {
  const find = id => data.islands.find(i => i.id === id)?.outline ?? (data.chain.id === id ? data.chain.islets.map(i => i.center) : null) ??
    (data.islets.find(i => i.id === id) ? [data.islets.find(i => i.id === id).center] : id === 'sea' ? data.seaZone.rigs.map(r => r.center) : null);
  const [p, q] = [find(a), find(b)].map(centroid);
  parts.push(`<line x1="${(pad + p[0] * S).toFixed(0)}" y1="${(pad + p[1] * S).toFixed(0)}" x2="${(pad + q[0] * S).toFixed(0)}" y2="${(pad + q[1] * S).toFixed(0)}" stroke="#ffffff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="6 6"/>`);
}
for (const island of data.islands) parts.push(`<polygon points="${island.outline.map(pt).join(' ')}" fill="${colors[island.biome] ?? '#999'}" stroke="#14201b" stroke-width="2" stroke-linejoin="round"/>`);
for (const islet of data.chain.islets) parts.push(`<circle cx="${(pad + islet.center[0] * S).toFixed(0)}" cy="${(pad + islet.center[1] * S).toFixed(0)}" r="${(islet.radiusKm * S).toFixed(0)}" fill="#7fbf9a" stroke="#14201b" stroke-width="2"/>`);
for (const islet of data.islets) parts.push(`<circle cx="${(pad + islet.center[0] * S).toFixed(0)}" cy="${(pad + islet.center[1] * S).toFixed(0)}" r="${(islet.radiusKm * S).toFixed(0)}" fill="#a9a595" stroke="#14201b" stroke-width="2"/>`,
  label(islet.center[0], islet.center[1] - islet.radiusKm - 0.08, islet.name, '', 11));
for (const rig of data.seaZone.rigs) parts.push(`<rect x="${(pad + rig.center[0] * S - 9).toFixed(0)}" y="${(pad + rig.center[1] * S - 9).toFixed(0)}" width="18" height="18" fill="#22272b" stroke="#ffb547" stroke-width="2"/>`,
  label(rig.center[0] - 0.05, rig.center[1] + 0.3, rig.name.replace('Plateforme ', '').split(' «')[0], '', 11));
for (const island of data.islands) { const [x, y] = centroid(island.outline); parts.push(label(x, y, island.number + ' · ' + island.name, island.biome, island.outline.length > 6 && island.zones.length > 4 ? 16 : 12)); }
{ const [x, y] = centroid(data.chain.islets.map(i => i.center)); parts.push(label(x, y + 0.62, data.chain.number + ' · ' + data.chain.name, data.chain.biome, 13)); }
parts.push(`<line x1="${pad}" y1="${h * S + pad + 22}" x2="${pad + S}" y2="${h * S + pad + 22}" stroke="#fff" stroke-width="3"/><text x="${pad + S + 8}" y="${h * S + pad + 27}" font-size="13" fill="#fff">1 km · tracé d’après le Plan 2 du 17 mai 2023</text>`, '</svg>');
const svg = parts.join('\n') + '\n';
if (process.argv.includes('--check')) {
  if ((await readFile(out, 'utf8').catch(() => '')) !== svg) { process.stderr.write('Le plan SVG est à régénérer.\n'); process.exitCode = 1; }
} else {
  await mkdir(path.dirname(out), {recursive: true});
  await writeFile(out, svg);
  process.stdout.write(path.relative(root, out) + '\n');
}
