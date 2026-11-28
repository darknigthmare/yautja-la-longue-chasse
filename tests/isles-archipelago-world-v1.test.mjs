import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesArchipelagoGenV1";
export * from "./app/game/isles/islesMapV1";
export * from "./app/game/isles/islesPathV1";
export * from "./app/game/isles/islesMovementV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const A = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const source = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));
const tuning = JSON.parse(await readFile('app/game/data/islesTuningV1.json', 'utf8'));
const living = JSON.parse(await readFile('app/game/data/islesLivingWorldV1.json', 'utf8'));
const world = A.createArchipelagoWorldV1(source, 900, living);
const {map} = world;
const perKm = source.scale * 1000 / source.tileMeters;
const island = id => source.islands.find(item => item.id === id);
const centre = id => { const o = island(id).outline; return [o.reduce((s, p) => s + p[0], 0) / o.length * perKm, o.reduce((s, p) => s + p[1], 0) / o.length * perKm].map(Math.round); };
/** Share of each tile kind on a square of `half` tiles around a point, sampled every `step`. */
function census(cx, cz, half, step = 16) {
  const count = {}; let n = 0;
  for (let z = cz - half; z <= cz + half; z += step) for (let x = cx - half; x <= cx + half; x += step) { const k = world.tileAt(x, z).kind; count[k] = (count[k] ?? 0) + 1; n++; }
  return Object.fromEntries(Object.entries(count).map(([k, v]) => [k, v / n]));
}

test('the archipelago is at real scale and nothing of it is stored', () => {
  assert.equal(source.scale, 4);
  assert.ok(map.width * map.tileMeters >= 48000 && map.depth * map.tileMeters >= 48000, 'au moins 48 km de côté');
  assert.equal(map.width, 24000);
  assert.equal(map.kinds.length, 0);
  assert.equal(map.heights.length, 0);
  assert.equal(typeof map.sample, 'function');
});

test('the world is deterministic, and zones join without a seam', () => {
  const again = A.createArchipelagoWorldV1(source, 900, living);
  const [cx, cz] = centre('verdant');
  for (let i = 0; i < 400; i++) {
    const x = cx - 200 + i * 7 % 400, z = cz - 200 + i * 13 % 400;
    assert.deepEqual(world.tileAt(x, z), again.tileAt(x, z));
    const direct = world.tileAt(x, z), cached = map.sample(x, z);
    assert.equal(cached.kind, direct.kind);
    assert.equal(cached.height, direct.height);
  }
  // Across a zone border (x = 32 k) the cached tiles equal the direct ones on both sides.
  const bx = Math.floor(cx / 32) * 32;
  for (let z = cz; z < cz + 40; z++) for (const x of [bx - 1, bx]) assert.equal(A.kindAtV1(map, x, z), world.tileAt(x, z).kind);
});

test('the cache of computed zones stays bounded while travelling across the map', () => {
  const small = A.createArchipelagoWorldV1(source, 200, living);
  for (let i = 0; i < 1500; i++) small.map.sample(i * 16 % small.map.width, (i * 37 * 16) % small.map.depth);
  assert.ok(small.cachedZones() <= 200, small.cachedZones() + ' zones');
});

test('every island of the plan exists, with every zone anchored on land near a walkable spot', () => {
  assert.equal(world.sites.length, source.islands.reduce((s, i) => s + i.zones.length, 0) + source.chain.zones.length + source.islets.reduce((s, i) => s + (i.zones?.length ?? 0), 0));
  for (const site of world.sites) {
    const [tx, tz] = A.tileAtV1(map, site.x, site.z);
    const place = world.placeAt(site.x, site.z);
    assert.ok(place, site.id + ' ' + site.label + ' est sur terre');
    assert.equal(place.island, site.island);
    // Sites on relief (crater, cliffs, glacier) are reached by climbing; the others have flat ground within 80 m.
    assert.ok(world.tileAt(tx, tz).base >= 3 || A.nearestWalkableV1(map, tx, tz, 40), site.id + ' ' + site.label + ' a un sol praticable à moins de 80 m');
  }
});

test('islands stay apart: a strait separates neighbours whose outlines touch', () => {
  for (const [a, b] of [['grayhaven', 'redmesa'], ['hollowpine', 'grayhaven'], ['hollowpine', 'solana'], ['redmesa', 'tallgrass'], ['solana', 'calder']]) {
    const [ax, az] = centre(a), [bx, bz] = centre(b);
    let water = 0;
    for (let k = 0; k <= 2000; k++) if (world.tileAt(Math.round(ax + (bx - ax) * k / 2000), Math.round(az + (bz - az) * k / 2000)).kind === 'water') water++;
    assert.ok(water >= 8, a + ' – ' + b + ' : ' + water + ' points d’eau sur la ligne');
  }
});

test('shores are natural: neither the polygons of the plan nor circles', () => {
  // A round islet of the data: the distance from its centre to the shore varies with the bearing.
  const islet = source.chain.islets[2], cx = islet.center[0] * perKm, cz = islet.center[1] * perKm, radii = [];
  for (let a = 0; a < 64; a++) {
    const dx = Math.cos(a / 64 * Math.PI * 2), dz = Math.sin(a / 64 * Math.PI * 2);
    let r = islet.radiusKm * perKm * 2.2;
    while (r > 0 && world.tileAt(Math.round(cx + dx * r), Math.round(cz + dz * r)).kind === 'water') r -= 6;
    radii.push(r);
  }
  const mean = radii.reduce((s, r) => s + r, 0) / radii.length, spread = Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length) / mean;
  assert.ok(spread > 0.08, 'écart relatif du rayon ' + spread.toFixed(3));
  // Against the polygon of the plan: a real share of Verdant's tiles is land outside it or sea inside it.
  const o = island('verdant').outline.map(pt => [pt[0] * perKm, pt[1] * perKm]);
  const inside = (x, z) => { let c = false; for (let i = 0, j = o.length - 1; i < o.length; j = i++) if ((o[i][1] > z) !== (o[j][1] > z) && x < (o[j][0] - o[i][0]) * (z - o[i][1]) / (o[j][1] - o[i][1]) + o[i][0]) c = !c; return c; };
  const xs = o.map(pt => pt[0]), zs = o.map(pt => pt[1]);
  let differ = 0, total = 0;
  for (let z = Math.min(...zs) - 400; z <= Math.max(...zs) + 400; z += 24) for (let x = Math.min(...xs) - 400; x <= Math.max(...xs) + 400; x += 24) {
    const kind = world.tileAt(Math.round(x), Math.round(z)).kind, land = kind !== 'water' && kind !== 'ford';
    if (land || inside(x, z)) { total++; if (land !== inside(x, z)) differ++; }
  }
  assert.ok(differ / total > 0.08 && differ / total < 0.6, 'écart au polygone du plan : ' + (differ / total).toFixed(2));
});

test('climates are placed as on Earth: cold in the north, deserts mid-way, tropics in the south', () => {
  const south = id => centre(id)[1];
  assert.ok(south('frost-isle') < south('hollowpine') && south('highland') < south('solana'));
  assert.ok(south('hollowpine') < south('solana') && south('solana') < south('redmesa') && south('redmesa') < south('verdant'));
  assert.ok(south('ember') < south('verdant') && south('tallgrass') > south('grayhaven'));
  const frost = census(...centre('frost-isle'), 400), desert = census(...centre('redmesa'), 900), jungle = census(...centre('verdant'), 500), marsh = census(...centre('saltmarsh'), 500);
  assert.ok((frost.snow ?? 0) > 0.6, 'Frost Isle sous la neige : ' + JSON.stringify(frost));
  assert.ok((desert.sand ?? 0) + (desert.rock ?? 0) > 0.85, 'Redmesa de sable et de roche');
  assert.ok((jungle.jungle ?? 0) + (jungle.tree ?? 0) + (jungle.bush ?? 0) + (jungle.palm ?? 0) > 0.7, 'Verdant en jungle : ' + JSON.stringify(jungle));
  assert.ok((marsh.water ?? 0) + (marsh.ford ?? 0) > 0.15 && (marsh.mud ?? 0) > 0.2, 'Saltmarsh entre eau et vase');
});

test('landmarks: Ember rises to a lava crater, Calder to towers of more than 80 m on a street grid', () => {
  const [ex, ez] = centre('ember');
  let lava = 0, rim = 0;
  for (let z = ez - 60; z <= ez + 60; z += 4) for (let x = ex - 60; x <= ex + 60; x += 4) if (world.tileAt(x, z).kind === 'lava') lava++;
  assert.ok(lava > 100, 'lac de lave du cratère : ' + lava);
  for (let r = 100; r < 600; r += 20) rim = Math.max(rim, world.tileAt(ex + r, ez).base);
  assert.ok(rim >= living.relief.islands.ember.peak * 0.8 && rim <= living.relief.islands.ember.peak, 'cône de ' + rim + ' m');
  const downtown = world.sites.find(site => site.id === '4.1'), [dx, dz] = A.tileAtV1(map, downtown.x, downtown.z);
  let tallest = 0, roads = 0, n = 0;
  for (let z = dz - 150; z <= dz + 150; z += 3) for (let x = dx - 150; x <= dx + 150; x += 3) { const t = world.tileAt(x, z); n++; if (t.kind === 'building') tallest = Math.max(tallest, t.height); if (t.kind === 'road') roads++; }
  assert.ok(tallest >= 200 && tallest <= living.relief.built.calderTowerMax, 'tour de ' + tallest + ' m');
  assert.ok(roads / n > 0.15 && roads / n < 0.6, 'rues : ' + (roads / n).toFixed(2));
});

test('the hunter can walk and climb on the streamed world', () => {
  const site = world.sites.find(item => item.id === '9.1'), [tx, tz] = A.tileAtV1(map, site.x, site.z);
  const [sx, sz] = A.nearestWalkableV1(map, tx, tz, 40);
  let actor = A.createIslesActorV1(map, (sx + 0.5) * 2, (sz + 0.5) * 2, tuning.cloak);
  const start = {...actor};
  for (let i = 0; i < 600; i++) actor = A.stepIslesActorV1(actor, {moveX: 1, moveZ: 0.3, run: true, jump: false, cloak: false}, map, tuning.movement, tuning.cloak, 1 / 60).actor;
  assert.ok(Math.hypot(actor.x - start.x, actor.z - start.z) > 10, 'le chasseur avance ou grimpe : ' + JSON.stringify([actor.x - start.x, actor.y]));
  assert.ok(Number.isFinite(actor.y));
});

/** Tiles of a square of `half` tiles around a zone anchor, sampled every `step`. */
function around(id, half, step = 2) {
  const site = world.sites.find(item => item.id === id), [cx, cz] = A.tileAtV1(map, site.x, site.z), tiles = [];
  for (let z = cz - half; z <= cz + half; z += step) for (let x = cx - half; x <= cx + half; x += step) tiles.push(world.tileAt(x, z));
  return tiles;
}
const share = (tiles, test) => tiles.filter(test).length / tiles.length;

test('the three detailed plans: several lands per island, each zone on its own land', () => {
  for (const [id, parts] of [['calder', 2], ['steelwater', 3], ['eastbank', 0]]) {
    assert.equal(island(id).parts?.length ?? 0, parts, id);
    assert.equal(island(id).fidelity, true);
  }
  // The two Jumelles are lands of Calder, cut from it by water.
  const airport = world.sites.find(site => site.id === '4.16'), riverside = world.sites.find(site => site.id === '4.8');
  assert.equal(world.placeAt(airport.x, airport.z).islandId, 'calder');
  let sea = 0;
  for (let k = 0; k <= 400; k++) if (world.tileAt(Math.round((airport.x + (riverside.x - airport.x) * k / 400) / 2), Math.round((airport.z + (riverside.z - airport.z) * k / 400) / 2)).kind === 'water') sea++;
  assert.ok(sea >= 3, 'un bras de mer sépare la Jumelle ouest de Calder : ' + sea);
});

test('named places of the plans are built: runway, stadium, reservoir and dam, refinery, port, pier', () => {
  const runway = around('4.16', 60);
  assert.ok(share(runway, t => t.kind === 'road') > 0.15 && share(runway, t => t.kind === 'water') === 0, 'piste de l’aéroport de Calder');
  assert.ok(around('4.16', 200, 4).some(t => t.kind === 'pillar' && t.height === 36), 'tour de contrôle');
  const stadium = around('4.17', 130, 3);
  assert.ok(stadium.some(t => t.kind === 'building' && t.height >= 24) && share(stadium, t => t.kind === 'grass') > 0.05, 'gradins et pelouses');
  const lake = around('4.9', 130, 3);
  const dam = world.siteAltitude('4.9');
  assert.ok(dam >= 30, 'le lac de retenue est en altitude : ' + dam + ' m');
  assert.ok(share(lake, t => t.kind === 'ford' && t.base > dam - 1) > 0.2 && around('4.9', 260, 2).some(t => t.kind === 'wall' && t.height === dam + 18), 'lac de retenue et barrage');
  assert.ok(around('4.14', 60, 2).some(t => t.kind === 'building' && t.height >= 33), 'le Big Ball');
  const refinery = around('5.8', 150, 3);
  assert.ok(refinery.some(t => t.kind === 'pillar' && t.height >= 24) && share(refinery, t => t.kind === 'building') > 0.05, 'cuves et colonnes de la raffinerie');
  assert.ok(share(around('5.2', 100, 2), t => t.kind === 'crate') > 0.15, 'piles de conteneurs du port');
  assert.ok(around('5.9', 6, 1).some(t => t.kind === 'pillar' && t.height === 33), 'phare');
  assert.ok(share(around('6.1', 60, 3), t => t.kind === 'building') > 0.5, 'centre commercial');
  assert.ok(around('B.1', 100, 2).some(t => t.kind === 'wall' && t.height === 6), 'mur d’enceinte de Blackrock');
  // Gull Pier runs over the sea: road tiles above the water, far from the shore.
  const pier = world.sites.find(site => site.id === '6.4'), [px, pz] = A.tileAtV1(map, pier.x, pier.z);
  let deck = 0;
  for (let k = 60; k < 290; k += 5) { const t = world.tileAt(px - k, pz); if (t.kind === 'road' && t.height === 0.5) deck++; }
  assert.ok(deck >= 20, 'tablier de Gull Pier au-dessus de l’eau : ' + deck);
});

test('roads join the zones of an island, and bridges cross to the next one on foot', () => {
  // Calder → Eastbank by the east Jumelle, then Eastbank → Steelwater: walkable all the way.
  const from = world.sites.find(site => site.id === '4.8'), to = world.sites.find(site => site.id === '5.1');
  const start = A.nearestWalkableV1(map, ...A.tileAtV1(map, from.x, from.z), 40), goal = A.nearestWalkableV1(map, ...A.tileAtV1(map, to.x, to.z), 40);
  // Best-first walk toward the goal on walkable tiles, two tiles at a time (a bridge is 7 tiles wide).
  const far = (x, z) => Math.hypot(x - goal[0], z - goal[1]);
  const seen = new Set([start[0] + ',' + start[1]]), heap = [[far(...start), ...start]];
  const push = item => { heap.push(item); let i = heap.length - 1; while (i > 0) { const up = (i - 1) >> 1; if (heap[up][0] <= heap[i][0]) break; [heap[up], heap[i]] = [heap[i], heap[up]]; i = up; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; for (const c of [2 * i + 1, 2 * i + 2]) if (c < heap.length && heap[c][0] < heap[m][0]) m = c; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let reached = false, sea = 0;
  while (heap.length && seen.size < 600000) {
    const [left, x, z] = pop();
    if (left < 120) { reached = true; break; }
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const nx = x + dx, nz = z + dz, key = nx + ',' + nz;
      if (seen.has(key) || !A.isWalkableV1(map, nx, nz) || !A.isWalkableV1(map, x + dx / 2, z + dz / 2)) continue;
      seen.add(key); push([far(nx, nz), nx, nz]);
      if (world.tileAt(nx, nz).height === 0.5) sea++;
    }
  }
  assert.ok(reached, 'de Riverside aux entrepôts de Steelwater à pied, par les ponts (' + seen.size + ' cases vues)');
  assert.ok(sea > 100, 'le trajet passe sur des tabliers de pont : ' + sea);
  // A ford, not a bridge, between Redmesa and Tallgrass.
  const [a, b] = ['1S.2', '14.3'].map(id => world.sites.find(site => site.id === id)).map(site => A.tileAtV1(map, site.x, site.z));
  const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let ford = 0;
  for (let k = 0; k <= span; k += 4) for (let side = -100; side <= 100; side += 2) {
    if (world.tileAt(Math.round(a[0] + (b[0] - a[0]) * k / span + (b[1] - a[1]) / span * side), Math.round(a[1] + (b[1] - a[1]) * k / span - (b[0] - a[0]) / span * side)).kind === 'ford') ford++;
  }
  assert.ok(ford > 20, 'gué entre Redmesa et Tallgrass : ' + ford);
});

test('relief is at true scale: every island reaches the peak of the data, snow above the snow line', () => {
  for (const id of ['hollowpine', 'ember', 'calder', 'solana', 'frost-isle', 'redmesa', 'verdant']) {
    const o = island(id).outline.map(pt => [pt[0] * perKm, pt[1] * perKm]), xs = o.map(pt => pt[0]), zs = o.map(pt => pt[1]), peak = living.relief.islands[id].peak;
    let top = 0, snowBelow = 0, bareAbove = 0;
    for (let z = Math.min(...zs); z < Math.max(...zs); z += 24) for (let x = Math.min(...xs); x < Math.max(...xs); x += 24) {
      const t = world.tileAt(Math.round(x), Math.round(z)), place = world.placeAt(x * 2, z * 2);
      if (!place || place.islandId !== id || t.kind === 'building' || t.kind === 'pillar' || t.kind === 'wall') continue;
      top = Math.max(top, t.base);
      const line = living.relief.islands[id].snowLine;
      if (line !== null && line > 0) { if (t.ground === 'snow' && t.base < line) snowBelow++; if (t.base >= line + 3 && t.ground !== 'snow' && t.kind !== 'road' && t.kind !== 'mud') bareAbove++; }
    }
    assert.ok(top >= peak * 0.9 && top <= peak, id + ' culmine à ' + top + ' m pour ' + peak + ' m');
    assert.equal(snowBelow, 0, id + ' : pas de neige sous la limite');
    assert.equal(bareAbove, 0, id + ' : neige au-dessus de la limite');
  }
  assert.ok(living.relief.built.calderTowerMax < living.relief.islands.calder.peak);
});

test('roads have a type per island, rails stay where the bible allows them, zones stand on terraces', () => {
  const kindsNear = (id, half) => new Set(around(id, half, 3).map(t => t.kind));
  assert.ok(kindsNear('4.3', 200).has('rail'), 'voie ferrée et métro dans Midtown');
  assert.ok(kindsNear('5.2', 260).has('rail'), 'fret du port de Steelwater');
  for (const id of ['14.1', '9.4', '13.3', '7.1']) assert.ok(!kindsNear(id, 300).has('rail'), 'aucune voie ferrée près de ' + id);
  // A wild island has dirt tracks, not asphalt: the way out of the poachers' camp is mud.
  const camp = world.sites.find(site => site.id === '9.4'), [cx, cz] = A.tileAtV1(map, camp.x, camp.z);
  let mud = 0, asphalt = 0;
  for (let z = cz - 300; z <= cz + 300; z += 3) for (let x = cx - 300; x <= cx + 300; x += 3) { const t = world.tileAt(x, z); if (Math.hypot(x - cx, z - cz) > 80) { if (t.kind === 'mud') mud++; if (t.kind === 'road') asphalt++; } }
  assert.ok(mud > 50 && asphalt === 0, 'pistes de terre sur Verdant : ' + mud + ' / ' + asphalt);
  // Every built zone is level at the altitude of its anchor.
  for (const site of world.sites.filter(item => ['village', 'town', 'industrial', 'camp'].includes(item.stamp))) {
    const alt = world.siteAltitude(site.id), [sx, sz] = A.tileAtV1(map, site.x, site.z);
    for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) { const t = world.tileAt(sx + dx, sz + dz); if (t.kind !== 'water' && t.kind !== 'ford') assert.ok(t.base >= alt - 1 && t.base <= alt + 16, site.id + ' : ' + t.base + ' pour une terrasse à ' + alt); }
  }
  // Transport lines on the ground have a course that follows their road or their rails.
  for (const line of living.lines) {
    const cls = living.transports[line.kind].class;
    if (cls !== 'rail' && cls !== 'route') continue;
    const path = world.linePaths[line.id];
    assert.ok(path && path.length > 2, 'tracé de la ligne ' + line.id);
    let on = 0;
    for (const [x, z] of path) { const k = world.tileAt(Math.floor(x / 2), Math.floor(z / 2)).kind; if (k === (cls === 'rail' ? 'rail' : 'road') || k === 'mud' || k === 'rail' || k === 'road') on++; }
    assert.ok(on / path.length > 0.6, line.id + ' suit sa voie : ' + (on / path.length).toFixed(2));
  }
});

test('flora follows the climate: cactus only in the desert, burnt trees in the quarantine, reeds in the marsh, crops on the farm', () => {
  const count = (id, half) => { const c = {}; for (const t of around(id, half, 3)) c[t.kind] = (c[t.kind] ?? 0) + 1; return c; };
  assert.ok((count('1S.1', 300).cactus ?? 0) > 5, 'cactus à Redmesa');
  assert.ok((count('1N.3', 300).deadtree ?? 0) > 20, 'arbres brûlés autour du site de l’incident');
  assert.ok((count('12.1', 300).reed ?? 0) > 20, 'roseaux des bayous');
  assert.ok((count('2.7', 400).crop ?? 0) > 200, 'cultures de Harvest Flats');
  for (const id of ['13.3', '2.1', '9.8', '14.1']) assert.equal(count(id, 300).cactus ?? 0, 0, 'aucun cactus près de ' + id);
  for (const id of ['13.3', '2.1', '7.1']) assert.equal(count(id, 300).palm ?? 0, 0, 'aucun palmier près de ' + id);
  // Giants of the canopy stand above the jungle of Verdant.
  assert.ok(around('9.8', 300, 2).some(t => t.kind === 'tree' && t.height - t.base >= 30), 'géants de la canopée');
});
