import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const world = JSON.parse(await readFile('app/game/data/islesLivingWorldV1.json', 'utf8'));
const archipelago = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));
const plain = text => text.replaceAll('’', "'").replace(/[  ]/g, ' ');
const doc = plain(await readFile('docs/campagne/ISLES_MONDE_VIVANT_20261128.md', 'utf8'));
const docLines = doc.split('\n');

const places = [...archipelago.islands, archipelago.chain];
const placeIds = places.map(place => place.id);
const zones = places.flatMap(place => place.zones.map(zone => ({...zone, island: place.id})));
const islandOfZone = new Map(zones.map(zone => [zone.id, zone.island]));
const rigIds = new Set(archipelago.seaZone.rigs.map(rig => rig.id));
const isletIds = new Set(archipelago.islets.map(islet => islet.id));
const isKnownStop = stop => {
  if (stop.startsWith('sea:')) return rigIds.has(stop.slice(4));
  if (stop.startsWith('islet:')) return isletIds.has(stop.slice(6));
  return islandOfZone.has(stop);
};
const having = (key, value) => placeIds.filter(id => world.islands[id][key].includes(value));
const metres = value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' m';

test('every island and the chain have a living-world entry and a relief entry', () => {
  assert.deepEqual(Object.keys(world.islands).sort(), [...placeIds].sort());
  assert.deepEqual(Object.keys(world.relief.islands).sort(), [...placeIds].sort());
  for (const id of placeIds) {
    const relief = world.relief.islands[id];
    assert.ok(relief.name && relief.forms, id);
    assert.ok(Number.isFinite(relief.peak) && relief.peak > 0, id + ' : sommet');
    assert.ok(relief.treeLine <= relief.peak, id + ' : limite des arbres sous le sommet');
    for (const key of ['roads', 'transports', 'buildings', 'props', 'fauna', 'flora']) assert.ok(world.islands[id][key].length > 0, id + ' : ' + key);
  }
  assert.ok(world.relief.built.calderTowerMax < world.relief.islands.calder.peak, 'les tours restent sous le mont Calder');
});

test('every road type, transport, species and plant named by an island exists', () => {
  const tables = {roads: world.roadTypes, transports: world.transports, fauna: world.species, flora: world.flora};
  for (const id of placeIds) {
    for (const [key, table] of Object.entries(tables)) {
      for (const name of world.islands[id][key]) assert.ok(table[name], id + ' cite ' + key + ' « ' + name + ' », absent des données');
    }
  }
});

test('every species, plant and transport is used by at least one island', () => {
  const used = key => new Set(placeIds.flatMap(id => world.islands[id][key]));
  for (const [key, table] of [['fauna', world.species], ['flora', world.flora], ['transports', world.transports]]) {
    const names = used(key);
    for (const name of Object.keys(table)) assert.ok(names.has(name), name + ' (' + key + ') n’est utilisé par aucune île');
  }
});

test('every line uses a known vehicle and stops at known zones, rigs or islets', () => {
  assert.equal(new Set(world.lines.map(line => line.id)).size, world.lines.length);
  for (const line of world.lines) {
    assert.ok(world.transports[line.kind], line.id + ' : véhicule ' + line.kind);
    assert.ok(line.name && line.everyMinutes > 0 && typeof line.loop === 'boolean', line.id);
    assert.ok(line.stops.length >= 2, line.id + ' : au moins deux arrêts');
    for (const stop of line.stops) assert.ok(isKnownStop(stop), line.id + ' : arrêt inconnu ' + stop);
  }
});

test('every island climate has a weather table that adds up to 100', () => {
  for (const place of places) {
    if (!place.climate) continue;
    const table = world.weatherRules.climates[place.climate];
    assert.ok(table, place.id + ' : pas de table météo pour le climat « ' + place.climate + ' »');
  }
  for (const [climate, table] of Object.entries(world.weatherRules.climates)) {
    for (const kind of Object.keys(table)) assert.ok(world.weatherTypes[kind], climate + ' : temps inconnu ' + kind);
    assert.equal(Object.values(table).reduce((sum, weight) => sum + weight, 0), 100, climate);
  }
  for (const [kind, weather] of Object.entries(world.weatherTypes)) {
    for (const name of weather.stopsTransports ?? []) assert.ok(world.transports[name], kind + ' arrête un transport inconnu : ' + name);
  }
  assert.equal(world.weatherRules.blockHours, 3);
});

test('the coherence rules hold in the data', () => {
  const metroIslands = new Set(['calder', 'eastbank']);
  for (const id of [...having('roads', 'metro'), ...having('transports', 'metro')]) assert.ok(metroIslands.has(id), 'métro sur ' + id);
  for (const line of world.lines.filter(item => item.kind === 'metro')) {
    for (const stop of line.stops) assert.ok(metroIslands.has(islandOfZone.get(stop)), line.id + ' : arrêt de métro hors de Calder et d’Eastbank, ' + stop);
  }
  for (const id of ['frost-isle', 'highland', 'tallgrass', 'verdant', 'halcyon-cay', 'shallows', 'saltmarsh', 'ember']) {
    assert.ok(!world.islands[id].roads.includes('rail'), 'voie ferrée sur ' + id);
    assert.ok(!world.islands[id].roads.includes('metro'), 'métro sur ' + id);
  }
  assert.deepEqual(having('roads', 'highway').sort(), ['calder', 'eastbank', 'steelwater']);
  assert.deepEqual(having('flora', 'cactus'), ['redmesa']);
  for (const id of ['frost-isle', 'hollowpine', 'highland', 'grayhaven']) assert.ok(!world.islands[id].flora.includes('palm'), 'palmier sur ' + id);
});

test('the bible sheet names every zone, line, species, transport, weather and summit', () => {
  assert.equal(new Set(zones.map(zone => zone.id)).size, zones.length);
  for (const zone of zones) assert.ok(doc.includes(plain(zone.id + ' ' + zone.name)), 'zone ' + zone.id + ' ' + zone.name + ' absente de la fiche');
  for (const line of world.lines) assert.ok(doc.includes(plain(line.name)), 'ligne ' + line.id + ' ' + line.name + ' absente de la fiche');
  for (const [key, table] of [['espèce', world.species], ['transport', world.transports], ['météo', world.weatherTypes]]) {
    for (const entry of Object.values(table)) assert.ok(doc.includes(plain(entry.label)), key + ' « ' + entry.label + ' » absent de la fiche');
  }
  for (const id of placeIds) {
    const relief = world.relief.islands[id];
    const name = plain(relief.name);
    const altitude = new RegExp('(^|[^0-9])' + metres(relief.peak));
    assert.ok(docLines.some(line => line.includes(name) && altitude.test(line)), 'sommet ' + name + ' (' + metres(relief.peak) + ') absent de la fiche');
  }
});

test('every table of the bible sheet keeps the same number of columns', () => {
  let columns = 0;
  let tables = 0;
  docLines.forEach((line, index) => {
    if (!line.startsWith('|')) { columns = 0; return; }
    const cells = line.split('|').length - 2;
    if (!columns) { columns = cells; tables += 1; }
    assert.equal(cells, columns, 'ligne ' + (index + 1) + ' : ' + line.slice(0, 60));
  });
  assert.ok(tables >= places.length, 'un tableau par île au moins');
});
