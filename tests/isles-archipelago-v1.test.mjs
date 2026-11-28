import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const data = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));
const plain = text => text.replaceAll('’', "'");
const doc = plain(await readFile('docs/campagne/ISLES_ARCHIPEL_ZONES_20261128.md', 'utf8'));

test('the archipelago follows Plan 2: fourteen numbered islands, a chain, islets, three rigs and a bonus island', () => {
  const numbers = [...data.islands.map(island => island.number), data.chain.number];
  assert.deepEqual([...numbers].sort(), ['1N', '1S', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].sort());
  assert.equal(new Set(data.islands.map(island => island.id)).size, data.islands.length);
  assert.ok(data.chain.islets.length >= 5, 'un chapelet d’îlots');
  assert.equal(data.seaZone.rigs.length, 3);
  assert.ok(data.islets.length >= 6);
  assert.deepEqual(data.bonus.map(item => item.id), ['nihon']);
});

test('every outline stays inside the 12 km map and every link names a known place', () => {
  const [w, h] = data.sizeKm;
  for (const island of data.islands) {
    assert.ok(island.outline.length >= 5, island.id);
    for (const [x, y] of island.outline) assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, island.id + ' ' + x + ',' + y);
  }
  const known = new Set([...data.islands.map(i => i.id), data.chain.id, ...data.islets.map(i => i.id), data.seaZone.id]);
  for (const [a, b, means] of data.links) assert.ok(known.has(a) && known.has(b) && means, a + ' → ' + b);
  for (const island of data.islands) assert.ok(data.links.some(link => link.includes(island.id)), island.id + ' est reliée');
});

test('the bible sheet describes every zone of the data, with consistent tables', () => {
  const zones = [...data.islands.flatMap(island => island.zones), ...data.chain.zones];
  assert.equal(new Set(zones.map(zone => zone.id)).size, zones.length);
  for (const zone of zones) assert.ok(doc.includes(plain(zone.id + ' ' + zone.name)), 'zone ' + zone.id + ' ' + zone.name + ' absente de la fiche');
  for (const place of [...data.islands, data.chain, ...data.islets, ...data.seaZone.rigs]) assert.ok(doc.includes(plain(place.name.split(' «')[0].replace('Plateforme ', ''))), place.name);
  let columns = 0;
  doc.split('\n').forEach((line, index) => {
    if (!line.startsWith('|')) { columns = 0; return; }
    const cells = line.split('|').length - 2;
    if (!columns) columns = cells;
    assert.equal(cells, columns, 'ligne ' + (index + 1) + ' : ' + line.slice(0, 60));
  });
});

test('the plan is drawn from the generated world', async () => {
  const png = await readFile('docs/campagne/assets/isles-archipel-plan-20261128.png');
  assert.equal(png.readUInt32BE(16), 1200, 'une tuile sur vingt en largeur');
  assert.equal(png.readUInt32BE(20), 1230);
  assert.ok(doc.includes('assets/isles-archipel-plan-20261128.png'));
});
