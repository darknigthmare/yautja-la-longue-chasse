import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesFaunaV1";
export * from "./app/game/isles/islesArchipelagoGenV1";
export * from "./app/game/isles/islesMapV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const F = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const source = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));
const rules = JSON.parse(await readFile('app/game/data/islesLivingWorldV1.json', 'utf8'));
// The living-world data also carries the relief: the world is the one the game streams.
const world = F.createArchipelagoWorldV1(source, 900, rules);
const T = F.ISLES_FAUNA_TUNING_V1, CELL = T.cellMeters, TILE = world.map.tileMeters, SEED = source.seed;
const NOON = {hour: 12, day: 0}, MIDNIGHT = {hour: 0, day: 0}, CLEAR = rules.weatherTypes.clair;
const CLIMATES = ['frost-isle', 'hollowpine', 'redmesa', 'tallgrass', 'verdant', 'saltmarsh'];
const CELLS_PER_ISLAND = 300, STEP = 0.1;
/** Columns no walking animal may stand on (kinds the module does not know are never chosen either). */
const OBSTACLES = new Set(['tree', 'pine', 'palm', 'cactus', 'deadtree', 'wall', 'roof', 'pillar', 'building', 'crate', 'ruin', 'lava']);
const BUILT = new Set(['road', 'rail', 'building', 'roof', 'wall', 'pillar', 'crate']);
const TOLERATED = new Set(['nuisible', 'oiseau', 'dressé']);

const profileOf = id => F.islesFaunaProfileV1(id, rules.species[id]);
const kindAt = (x, z) => world.tileAt(Math.floor(x / TILE), Math.floor(z / TILE)).kind;
const groundAt = (x, z) => world.tileAt(Math.floor(x / TILE), Math.floor(z / TILE)).height;
const far = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const hunter = (x, z, more = {}) => ({x, y: Math.max(0, groundAt(x, z)), z, cloaked: false, moving: false, ...more});

/** Every cell (128 m) of the bounding box of an island, with whether its centre is on that island. */
function boxCells(id, margin = 0) {
  const island = source.islands.find(item => item.id === id), perKm = source.scale * 1000;
  const points = [island.outline, ...(island.parts ?? [])].flat();
  const xs = points.map(p => p[0] * perKm), zs = points.map(p => p[1] * perKm), cells = [];
  for (let cz = Math.floor(Math.min(...zs) / CELL) - margin; cz <= Math.floor(Math.max(...zs) / CELL) + margin; cz++) {
    for (let cx = Math.floor(Math.min(...xs) / CELL) - margin; cx <= Math.floor(Math.max(...xs) / CELL) + margin; cx++) {
      cells.push({cx, cz, own: world.placeAt((cx + 0.5) * CELL, (cz + 0.5) * CELL)?.islandId === id});
    }
  }
  return cells;
}
const memo = new Map();
/** Groups of the land cells of an island: all of them, or `count` spread evenly over it. Computed once. */
function census(id, count = Infinity, clock = NOON) {
  const key = id + ':' + count + ':' + clock.hour;
  if (!memo.has(key)) {
    const land = boxCells(id).filter(cell => cell.own), picked = land.length <= count ? land : Array.from({length: count}, (_, i) => land[Math.floor(i * land.length / count)]);
    memo.set(key, picked.map(cell => ({...cell, groups: F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, clock)})));
  }
  return memo.get(key);
}
const groupsOf = (id, species, least = 1) => census(id).flatMap(cell => cell.groups).filter(group => group.species === species && group.members.length >= least);

/** A starting place must suit the species: sharks in deep water, nobody else in it, walkers off the obstacles, wild animals off the built tiles. */
function assertStart(group, member) {
  const kind = kindAt(member.x, member.z), profile = profileOf(group.species), where = group.species + ' sur ' + kind + ' (' + group.key + ')';
  assert.ok(Number.isFinite(member.x) && Number.isFinite(member.y) && Number.isFinite(member.z), where);
  assert.ok(Math.floor(member.x / CELL) >= group.cellX - 1 && Math.floor(member.x / CELL) <= group.cellX + 1, 'près de sa cellule : ' + where);
  if (profile.waterOnly) return assert.equal(kind, 'water', where);
  assert.notEqual(kind, 'water', where);
  if (!profile.flies) assert.ok(!OBSTACLES.has(kind), where);
  if (!profile.tolerated) assert.ok(!BUILT.has(kind), where);
}
/** A living animal stays where its species can be: only swimmers in deep water, walkers off the obstacles. */
function assertLive(animal) {
  const where = animal.species + ' ' + animal.id + ' (' + animal.state + ')';
  assert.ok([animal.x, animal.y, animal.z, animal.yaw, animal.health].every(Number.isFinite), where);
  if (animal.airborne) return;
  const kind = kindAt(animal.x, animal.z), profile = profileOf(animal.species);
  if (profile.waterOnly) return assert.equal(kind, 'water', where);
  if (kind === 'water') assert.ok(profile.swims, where + ' dans l’eau profonde');
  if (!profile.flies) assert.ok(!OBSTACLES.has(kind), where + ' sur ' + kind);
}
/** Runs the fauna for `seconds`; `playerAt(time)` gives the hunter. Returns the last state and every event. */
function run(state, seconds, playerAt, clock = NOON, weather = CLEAR, each = () => {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    const out = F.stepIslesFaunaV1(state, rules, world, playerAt(i * STEP), clock, weather, STEP);
    state = out.state; events.push(...out.events); each(state, out.events, i * STEP);
  }
  return {state, events};
}
/** Centre of a group, its member furthest from the centre, and the unit vector toward it: standing beyond that member
 * along the vector, the hunter is at a known distance from the nearest animal of the group. */
function edgeOf(group) {
  const n = group.members.length, cx = group.members.reduce((s, m) => s + m.x, 0) / n, cz = group.members.reduce((s, m) => s + m.z, 0) / n;
  const edge = group.members.reduce((best, m) => Math.hypot(m.x - cx, m.z - cz) > Math.hypot(best.x - cx, best.z - cz) ? m : best), d = Math.hypot(edge.x - cx, edge.z - cz);
  return {edge, ux: d > 0.01 ? (edge.x - cx) / d : 1, uz: d > 0.01 ? (edge.z - cz) / d : 0};
}
const standOff = (group, metres, more) => { const {edge, ux, uz} = edgeOf(group); return hunter(edge.x + ux * metres, edge.z + uz * metres, more); };
const ofGroup = (state, group) => state.animals.filter(animal => animal.group === group.key);

test('a cell is a pure function of the cell, the seed and the world', () => {
  const again = F.createArchipelagoWorldV1(source, 900, rules), cells = census('tallgrass', 60);
  let groups = 0, other = 0;
  for (const cell of cells) {
    assert.deepEqual(F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, NOON), cell.groups);
    assert.deepEqual(F.islesFaunaCellV1(rules, again, cell.cx, cell.cz, SEED, NOON), cell.groups);
    // The hour changes who sleeps, never who lives there.
    const night = F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, MIDNIGHT);
    assert.deepEqual(night.map(group => ({...group, resting: null})), cell.groups.map(group => ({...group, resting: null})));
    groups += cell.groups.length;
    if (JSON.stringify(F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED + 1, NOON)) !== JSON.stringify(cell.groups)) other++;
  }
  assert.ok(groups > 0 && other > 0, 'une autre graine donne un autre peuplement : ' + other + ' cellules sur ' + cells.length);
});

test('each island receives only the species of its list, on tiles they can live on, at the asked density', () => {
  let cellsSeen = 0, groupsSeen = 0;
  for (const id of CLIMATES) {
    const cells = census(id, CELLS_PER_ISLAND), allowed = new Set(rules.islands[id].fauna), found = new Set();
    assert.ok(cells.length >= 100, id + ' : ' + cells.length + ' cellules échantillonnées');
    let groups = 0;
    for (const cell of cells) for (const group of cell.groups) {
      groups++; found.add(group.species);
      assert.ok(allowed.has(group.species), group.species + ' n’est pas de ' + id);
      assert.equal(group.islandId, id);
      const [least, most] = rules.species[group.species].group;
      assert.ok(group.members.length >= least && group.members.length <= most, group.species + ' par ' + group.members.length);
      for (const member of group.members) assertStart(group, member);
    }
    const density = groups / cells.length;
    assert.ok(density > 0.12 && density < 0.55, id + ' : ' + density.toFixed(2) + ' groupe par cellule');
    assert.ok(found.size >= 2, id + ' : plusieurs espèces (' + [...found].join(', ') + ')');
    cellsSeen += cells.length; groupsSeen += groups;
  }
  // One group for three cells on average.
  const mean = groupsSeen / cellsSeen;
  assert.ok(mean > 0.22 && mean < 0.45, 'densité moyenne ' + mean.toFixed(3));
});

test('the sea: sharks in deep water near a coast, nothing but aquatic species in a cell at sea, nothing in the open sea', () => {
  const cells = boxCells('halcyon-cay', 2);
  let sharks = 0, atSea = 0;
  for (const cell of cells) for (const group of F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, NOON)) {
    if (!world.placeAt((cell.cx + 0.5) * CELL, (cell.cz + 0.5) * CELL)) { atSea++; assert.equal(profileOf(group.species).swims, true, group.species + ' dans une cellule en mer'); }
    for (const member of group.members) assertStart(group, member);
    if (group.species === 'requin') sharks++;
  }
  assert.ok(sharks > 0 && atSea > 0, sharks + ' groupes de requins, dont ' + atSea + ' dans des cellules en mer');
  // The furthest corner of the map from any land.
  let empty = null;
  for (const [x, z] of [[0, 0], [world.map.width - 1, 0], [0, world.map.depth - 1], [world.map.width - 1, world.map.depth - 1]]) {
    const cx = Math.floor(x * TILE / CELL), cz = Math.floor(z * TILE / CELL);
    let land = false;
    for (let dz = -3; dz <= 3 && !land; dz++) for (let dx = -3; dx <= 3; dx++) if (world.tileAt(Math.floor((cx + dx + 0.5) * CELL / TILE), Math.floor((cz + dz + 0.5) * CELL / TILE)).kind !== 'water') { land = true; break; }
    if (!land) { empty = [cx, cz]; break; }
  }
  assert.ok(empty, 'un coin de la carte est en pleine mer');
  assert.deepEqual(F.islesFaunaCellV1(rules, world, empty[0], empty[1], SEED, NOON), []);
});

test('towns: no large predator at large in the centre of Calder, and the zoo cat only once an enclosure is open', () => {
  const downtown = world.sites.find(site => site.id === '4.1'), cx = Math.floor(downtown.x / CELL), cz = Math.floor(downtown.z / CELL);
  let groups = 0;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) for (const group of F.islesFaunaCellV1(rules, world, cx + dx, cz + dz, SEED, MIDNIGHT)) {
    groups++;
    const cls = rules.species[group.species].class;
    assert.ok(cls !== 'apex' && cls !== 'prédateur', group.species + ' en liberté dans le centre de Calder');
    assert.ok(TOLERATED.has(cls), group.species + ' (' + cls + ') dans une cellule de ville');
  }
  assert.ok(groups > 0, 'le centre a ses pigeons, ses rats ou ses chiens de garde');
  const eastbank = boxCells('eastbank').filter(cell => cell.own), open = {...rules, zooOpen: true};
  let escaped = 0;
  for (const cell of eastbank) {
    assert.ok(F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, MIDNIGHT).every(group => group.species !== 'fauve-du-zoo'), 'enclos fermés');
    for (const group of F.islesFaunaCellV1(open, world, cell.cx, cell.cz, SEED, MIDNIGHT)) {
      if (group.species === 'fauve-du-zoo') escaped++;
      assert.ok(rules.islands.eastbank.fauna.includes(group.species));
    }
  }
  assert.ok(escaped > 0, 'enclos ouvert : le fauve rôde sur Eastbank (' + escaped + ' cellules)');
  for (const id of ['calder', 'steelwater']) for (const cell of census(id, 120)) assert.ok(cell.groups.every(group => group.species !== 'fauve-du-zoo'));
});

test('activity follows the hour: a wolf rests at noon and is up at midnight', () => {
  assert.equal(F.islesFaunaActiveV1('nuit', 12), false);
  assert.equal(F.islesFaunaActiveV1('nuit', 0), true);
  assert.equal(F.islesFaunaActiveV1('nuit', 21), true);
  assert.equal(F.islesFaunaActiveV1('jour', 12), true);
  assert.equal(F.islesFaunaActiveV1('jour', 3), false);
  assert.deepEqual([4, 6, 12, 18, 21].map(hour => F.islesFaunaActiveV1('aube et crépuscule', hour)), [false, true, false, true, false]);
  assert.ok([0, 6, 12, 18].every(hour => F.islesFaunaActiveV1('jour et nuit', hour)));
  const pack = groupsOf('hollowpine', 'loup')[0];
  assert.ok(pack, 'une meute de loups sur Hollowpine');
  assert.equal(pack.resting, true);
  assert.equal(F.islesFaunaCellV1(rules, world, pack.cellX, pack.cellZ, SEED, MIDNIGHT).find(group => group.key === pack.key).resting, false);
  // Out of sight of the hunter: asleep and still at noon, on the move at midnight.
  const watcher = standOff(pack, 120), start = new Map(pack.members.map((member, i) => [pack.key + ':' + i, member]));
  const day = ofGroup(run(F.createIslesFaunaV1(SEED), 8, () => watcher, NOON).state, pack);
  assert.equal(day.length, pack.members.length);
  for (const wolf of day) { assert.equal(wolf.state, 'rest'); assert.ok(far(wolf, start.get(wolf.id)) < 0.001, 'un loup au repos ne bouge pas'); }
  const night = ofGroup(run(F.createIslesFaunaV1(SEED), 8, () => watcher, MIDNIGHT).state, pack);
  assert.ok(night.every(wolf => wolf.state !== 'rest'));
  assert.ok(night.some(wolf => far(wolf, start.get(wolf.id)) > 0.5), 'la meute se déplace la nuit');
});

test('perception: light, weather, rest and the cloak', () => {
  const grazer = {active: 'jour', temper: 'flee'}, prowler = {active: 'nuit', temper: 'hunter'}, dog = {active: 'nuit', temper: 'tracker'};
  const seen = {cloaked: false, moving: true}, still = {cloaked: true, moving: false}, sneaking = {cloaked: true, moving: true};
  const sight = (animal, clock, player, resting = false, weather = CLEAR) => F.islesFaunaSightV1(animal, clock, weather, player, resting);
  assert.equal(sight(grazer, NOON, seen), T.sightDay);
  assert.equal(sight(grazer, MIDNIGHT, seen), T.sightNight);
  assert.equal(sight(prowler, MIDNIGHT, seen), T.sightDay);
  assert.equal(sight(prowler, NOON, seen), T.sightNight);
  assert.equal(sight(grazer, NOON, still), T.sightDay / 2);
  assert.ok(Math.abs(sight(grazer, NOON, sneaking) - T.sightDay * 0.6) < 1e-9);
  assert.ok(sight(grazer, NOON, still) < sight(grazer, NOON, sneaking) && sight(grazer, NOON, sneaking) < sight(grazer, NOON, seen));
  assert.equal(sight(prowler, NOON, seen, true), T.sightNight / 2);
  assert.ok(Math.abs(sight(grazer, NOON, seen, false, rules.weatherTypes.brouillard) - T.sightDay * rules.weatherTypes.brouillard.humanSight) < 1e-9);
  // A tracker keeps the trail of a cloaked hunter within 14 m, where another animal has lost it.
  assert.equal(sight(dog, NOON, still), 14);
  assert.equal(sight(prowler, NOON, still), T.sightNight / 2);
});

test('120 s around a place of Tallgrass: at most 40 animals, all of them on tiles their species can be on', () => {
  const sites = world.sites.filter(site => world.placeAt(site.x, site.z)?.islandId === 'tallgrass');
  const nearby = site => census('tallgrass').filter(cell => Math.hypot((cell.cx + 0.5) * CELL - site.x, (cell.cz + 0.5) * CELL - site.z) < T.spawnRadius).reduce((sum, cell) => sum + cell.groups.length, 0);
  const site = sites.find(item => nearby(item) >= 3) ?? sites[0];
  assert.ok(site, 'un lieu de Tallgrass');
  // The hunter walks a wide loop, firing once on the way: animals spawn, flee, come back, despawn.
  const playerAt = time => hunter(site.x + Math.sin(time / 19) * 150, site.z + Math.sin(time / 31) * 150, {moving: true, noise: Math.abs(time - 60) < STEP / 2 ? 80 : 0});
  const seen = new Set();
  let most = 0;
  const first = run(F.createIslesFaunaV1(SEED), 120, playerAt, NOON, CLEAR, state => {
    most = Math.max(most, state.animals.length);
    assert.ok(state.animals.length <= T.maxActive, state.animals.length + ' animaux actifs');
    for (const animal of state.animals) { assertLive(animal); seen.add(animal.id); }
    assert.equal(new Set(state.animals.map(animal => animal.id)).size, state.animals.length, 'aucun animal en double');
  });
  assert.ok(most > 0 && seen.size > 0, 'des animaux autour de ' + site.label + ' : ' + most + ' à la fois, ' + seen.size + ' en tout');
  const view = F.islesFaunaViewV1(first.state);
  assert.equal(view.length, first.state.animals.length);
  for (const item of view) {
    assert.deepEqual(Object.keys(item).sort(), ['airborne', 'dead', 'health01', 'id', 'label', 'model', 'species', 'state', 'x', 'y', 'yaw', 'z']);
    assert.equal(item.model, item.species); assert.equal(item.label, rules.species[item.species].label); assert.equal(item.health01, 1);
  }
  // The same walk gives the same animals at the same places, and the state survives a save.
  const second = run(F.createIslesFaunaV1(SEED), 120, playerAt);
  assert.deepEqual(second.state.animals, first.state.animals);
  assert.deepEqual(second.events, first.events);
  assert.deepEqual(JSON.parse(JSON.stringify(first.state)), first.state);
});

test('an antelope that perceives the hunter runs away; a cloaked, still hunter is perceived from less far; a shot is heard further', () => {
  const herd = groupsOf('tallgrass', 'antilope', 4)[0];
  assert.ok(herd, 'un troupeau d’antilopes sur Tallgrass');
  // Seen at 18 m in daylight (26 m of sight): the herd bolts and ends further away.
  const player = standOff(herd, 18), start = new Map(herd.members.map((member, i) => [herd.key + ':' + i, far(member, player)]));
  const seenRun = run(F.createIslesFaunaV1(SEED), 12, () => player);
  assert.ok(seenRun.events.some(event => event.type === 'spooked' && event.species === 'antilope'), 'le troupeau est dérangé');
  const after = ofGroup(seenRun.state, herd), away = after.filter(animal => far(animal, player) > start.get(animal.id) + 5);
  assert.ok(after.length > 0 && away.length * 2 >= after.length, away.length + ' antilopes sur ' + after.length + ' se sont éloignées');
  assert.ok(seenRun.events.every(event => event.type !== 'attack' || rules.species[seenRun.state.animals.find(animal => animal.id === event.animalId).species].damage > 0));
  // Cloaked and still at the same place: 13 m of sight, nobody notices.
  const hidden = run(F.createIslesFaunaV1(SEED), 0.5, () => ({...player, cloaked: true, moving: false}));
  assert.ok(ofGroup(hidden.state, herd).length > 0 && ofGroup(hidden.state, herd).every(animal => animal.state !== 'flee'), 'camouflé et immobile : pas vu à 18 m');
  const visible = run(F.createIslesFaunaV1(SEED), 0.5, () => player);
  assert.ok(ofGroup(visible.state, herd).some(animal => animal.state === 'flee'), 'à découvert : vu à 18 m');
  // Out of sight at 38 m, a plasma shot (80 m) alerts the herd, unless the storm covers nine tenths of it.
  const distant = standOff(herd, 38), shot = time => ({...distant, noise: Math.abs(time - 0.5) < STEP / 2 ? 80 : 0});
  assert.ok(ofGroup(run(F.createIslesFaunaV1(SEED), 0.8, () => distant).state, herd).every(animal => animal.state !== 'flee'), 'à 38 m sans bruit : pas vu');
  assert.ok(ofGroup(run(F.createIslesFaunaV1(SEED), 0.8, shot).state, herd).some(animal => animal.state === 'flee'), 'le tir alerte le troupeau');
  assert.ok(ofGroup(run(F.createIslesFaunaV1(SEED), 0.8, shot, NOON, {...CLEAR, noiseCover: 0.9}).state, herd).every(animal => animal.state !== 'flee'), 'la tempête couvre le tir');
});

test('a pride that sees the hunter closes in and attacks, no more than once every 1.5 s per lion; under three, the pack flees', () => {
  // A pride of three or more with open ground on the side the hunter stands on.
  const tiles = (from, to) => Array.from({length: 13}, (_, i) => world.tileAt(Math.floor((from.x + (to.x - from.x) * i / 12) / TILE), Math.floor((from.z + (to.z - from.z) * i / 12) / TILE)));
  const open = (from, to) => { const line = tiles(from, to); return line.every((tile, i) => tile.kind !== 'water' && !OBSTACLES.has(tile.kind) && Math.abs(tile.height - line[Math.max(0, i - 1)].height) <= 1); };
  let pride = null, player = null;
  for (const group of groupsOf('tallgrass', 'lion', 3)) {
    const at = standOff(group, 16);
    if (group.members.every(member => open(member, at))) { pride = group; player = at; break; }
  }
  assert.ok(pride, 'une troupe d’au moins trois lions avec un terrain dégagé');
  const start = new Map(pride.members.map((member, i) => [pride.key + ':' + i, far(member, player)])), attacks = [];
  let closest = Infinity;
  const hunt = run(F.createIslesFaunaV1(SEED), 20, () => player, MIDNIGHT, CLEAR, (state, events, time) => {
    for (const lion of ofGroup(state, pride)) closest = Math.min(closest, far(lion, player));
    for (const event of events) if (event.type === 'attack') attacks.push({...event, time});
  });
  const lions = ofGroup(hunt.state, pride);
  assert.equal(lions.length, pride.members.length);
  assert.ok(lions.some(lion => far(lion, player) < start.get(lion.id) - 5), 'les lions se rapprochent');
  assert.ok(closest <= T.contactMeters, 'un lion arrive au contact : ' + closest.toFixed(1) + ' m');
  const mine = attacks.filter(event => event.animalId.startsWith(pride.key + ':'));
  assert.ok(mine.length > 0, 'un lion attaque');
  for (const event of mine) assert.equal(event.damage, rules.species.lion.damage);
  for (const lion of lions) {
    const times = mine.filter(event => event.animalId === lion.id).map(event => event.time);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= T.attackSeconds - 1e-6, 'cadence d’attaque de ' + lion.id);
  }
  // Cut down to two, what is left of the pride runs.
  let state = hunt.state;
  for (const lion of lions.slice(2)) state = F.damageIslesFaunaV1(state, lion.id, 9999).state;
  const rout = run(state, 4, () => player, MIDNIGHT);
  const left = ofGroup(rout.state, pride).filter(lion => !lion.dead);
  assert.equal(left.length, 2);
  assert.ok(left.every(lion => lion.state === 'flee' || far(lion, player) >= T.fleeMeters), 'les deux derniers fuient');
  assert.ok(rout.events.every(event => event.type !== 'attack' || !event.animalId.startsWith(pride.key + ':')), 'et n’attaquent plus');
});

test('a kill gives the honour of the species, and the animal stays dead for its cell during 20 game minutes', () => {
  const herd = groupsOf('tallgrass', 'antilope', 4)[0], home = standOff(herd, 100), away = hunter(home.x, home.z + 1200);
  const at = minutes => ({hour: 12 + minutes / 60, day: 0});
  let state = run(F.createIslesFaunaV1(SEED), 1, () => home, at(0)).state;
  const prey = ofGroup(state, herd)[0];
  assert.ok(prey, 'le troupeau est apparu à 100 m');
  const wound = F.damageIslesFaunaV1(state, prey.id, 10);
  assert.deepEqual([wound.killed, wound.honor, wound.species], [false, 0, 'antilope']);
  assert.equal(F.islesFaunaViewV1(wound.state).find(item => item.id === prey.id).health01, (rules.species.antilope.health - 10) / rules.species.antilope.health);
  assert.equal(state.animals.find(animal => animal.id === prey.id).health, rules.species.antilope.health, 'l’état d’origine n’est pas modifié');
  const kill = F.damageIslesFaunaV1(wound.state, prey.id, 9999);
  assert.deepEqual([kill.killed, kill.honor, kill.species], [true, rules.species.antilope.honor, 'antilope']);
  const body = F.islesFaunaViewV1(kill.state).find(item => item.id === prey.id);
  assert.deepEqual([body.dead, body.state, body.health01], [true, 'dead', 0]);
  assert.deepEqual(F.damageIslesFaunaV1(kill.state, prey.id, 50), {state: kill.state, killed: false, honor: 0, species: 'antilope'});
  assert.deepEqual(F.damageIslesFaunaV1(kill.state, 'nobody', 50), {state: kill.state, killed: false, honor: 0, species: null});
  // The hunter leaves (the body is forgotten) and returns ten minutes later: the antelope is not back.
  state = run(kill.state, 1, () => away, at(5)).state;
  assert.equal(state.animals.length === 0 || state.animals.every(animal => far(animal, away) <= T.despawnRadius), true);
  assert.ok(!state.animals.some(animal => animal.id === prey.id), 'loin : le cadavre est oublié');
  state = run(state, 1, () => home, at(10)).state;
  assert.ok(ofGroup(state, herd).length > 0 && !ofGroup(state, herd).some(animal => animal.id === prey.id), 'dix minutes après : toujours morte pour sa cellule');
  // After twenty minutes, away then back: the cell has its animal again.
  state = run(state, 1, () => away, at(24)).state;
  state = run(state, 1, () => home, at(26)).state;
  const back = state.animals.find(animal => animal.id === prey.id);
  assert.ok(back && !back.dead && back.health === rules.species.antilope.health, 'vingt minutes après : de retour');
  assert.deepEqual(state.killed, {});
});

test('a protected turtle gives no honour', () => {
  const turtles = [...boxCells('halcyon-cay').filter(cell => cell.own).flatMap(cell => F.islesFaunaCellV1(rules, world, cell.cx, cell.cz, SEED, MIDNIGHT))].find(group => group.species === 'tortue');
  assert.ok(turtles, 'des tortues sur Halcyon Cay');
  for (const member of turtles.members) assert.notEqual(kindAt(member.x, member.z), 'water');
  const state = run(F.createIslesFaunaV1(SEED), 0.5, () => standOff(turtles, 60, {cloaked: true}), MIDNIGHT).state, turtle = ofGroup(state, turtles)[0];
  assert.ok(turtle);
  assert.deepEqual((({killed, honor, species}) => [killed, honor, species])(F.damageIslesFaunaV1(state, turtle.id, 9999)), [true, 0, 'tortue']);
});

test('disturbed birds take off, send a "flushed" signal, and land further away', () => {
  const flock = groupsOf('tallgrass', 'vautour', 3)[0];
  assert.ok(flock, 'des vautours sur Tallgrass');
  const player = standOff(flock, 10);
  let highest = 0, flying = 0;
  const flight = run(F.createIslesFaunaV1(SEED), 2, () => player, NOON, CLEAR, state => {
    for (const bird of ofGroup(state, flock)) if (bird.airborne) {
      flying++;
      const above = bird.y - Math.max(0, groundAt(bird.x, bird.z));
      assert.ok(above >= T.flightMin - 1e-6 && above <= T.flightMax + 1e-6, 'en vol à ' + above.toFixed(1) + ' m du sol');
      highest = Math.max(highest, above);
    }
  });
  const flushed = flight.events.filter(event => event.type === 'flushed' && event.species === 'vautour');
  assert.ok(flushed.length > 0 && flying > 0 && highest >= T.flightMin, 'envol signalé');
  for (const event of flushed) assert.ok(Number.isFinite(event.x) && Number.isFinite(event.z) && Math.hypot(event.x - player.x, event.z - player.z) < 60, 'le signal donne le lieu de l’envol');
  assert.ok(F.islesFaunaViewV1(flight.state).some(item => item.airborne && item.state === 'fly'));
  // They come down again, out of sight of the hunter, on something a bird can stand on.
  const landed = ofGroup(run(flight.state, 40, () => player).state, flock);
  assert.ok(landed.length > 0);
  for (const bird of landed) {
    assert.equal(bird.airborne, false, bird.id + ' s’est posé');
    assert.ok(far(bird, player) > T.sightDay, 'posé plus loin : ' + far(bird, player).toFixed(0) + ' m');
    assert.notEqual(kindAt(bird.x, bird.z), 'water');
    assert.ok(Math.abs(bird.y - groundAt(bird.x, bird.z)) < 1e-6, 'au sol ou perché');
  }
});
