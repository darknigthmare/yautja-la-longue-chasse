import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesMapV1";
export * from "./app/game/isles/islesMovementV1";
export * from "./app/game/isles/islesPathV1";
export * from "./app/game/isles/islesWorldGenV1";
export * from "./app/game/isles/islesSaveV1";
export * from "./app/game/isles/islesFreeHuntV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const I = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const tuning = await json('app/game/data/islesTuningV1.json');
const rules = await json('app/game/data/islesFreeHuntV1.json');
const source = await json('app/game/data/islesVerdantWorldV1.json');
const world = I.generateIslesWorldV1(source, 2);
const {map} = world;
const T = {movement: tuning.movement, cloak: tuning.cloak};
const DT = 0.05;
const idle = {...I.NO_MOVE_INPUT_V1, strike: false, plasma: false, trophyHeld: false, interact: false};
const at = (name, index = 0) => { const [x, z] = map.markers[name][index]; return I.tileCenterV1(map, x, z); };
const step = (state, input = idle, seconds = DT) => { for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) I.stepFreeHuntV1(state, input, world, rules, T, DT); return state; };
const session = (profile = I.defaultIslesProfileV1(), seed = 7) => I.createFreeHuntV1(world, rules, T, profile, seed);
/** Teleports the hunter (test harness only). */
function place(state, p, y = 0) {
  state.player.actor = {...state.player.actor, x: p.x, z: p.z, y, vx: 0, vy: 0, vz: 0, grounded: true, climbing: false};
}
/** A poacher standing right in front of the hunter, who faces +z. */
function poacherAhead(state, extra = {}) {
  const a = state.player.actor;
  state.npcs = state.npcs.filter(npc => npc.unique === 'bounty' || npc.unique === 'escort' ? (npc.x = 10, npc.z = 10, true) : false);
  const npc = {id: 'test-' + state.nextId++, type: 'braconnier', role: 'human', armed: true, specialist: false, x: a.x, z: a.z + 1.5, facing: 0,
    health: 100, maxHealth: 100, state: 'patrol', homeX: a.x, homeZ: a.z + 1.5, goalX: a.x, goalZ: a.z + 1.5, path: [], pathKey: 'x', timer: 99, fireTimer: 99,
    seeing: 0, lastSawAt: -999, lastSeen: null, reported: -999, hurt: false, moving: false, running: false, cell: null, spawnKey: null,
    deadAt: -1, killedBy: null, honorValue: 0, trophyTaken: false, ...extra};
  state.npcs.push(npc);
  state.player.actor = {...a, facing: 0};
  return npc;
}
const killAhead = (state, npc) => {
  for (let i = 0; i < 6 && npc.state !== 'dead'; i++) {
    state.player.actor = {...state.player.actor, facing: Math.atan2(npc.x - state.player.actor.x, npc.z - state.player.actor.z)};
    step(state, {...idle, strike: true}); step(state, idle, rules.player.strikeSeconds + 2 * DT);
  }
};

test('Verdant is generated from data: 1000 × 1000 tiles, deterministic, and every site and point reachable on foot', () => {
  assert.equal(map.width, 1000);
  assert.equal(map.depth, 1000);
  const again = I.generateIslesWorldV1(source, 2).map;
  const digest = m => createHash('sha256').update(m.kinds.join('')).update(Buffer.from(m.heights.buffer)).digest('hex');
  assert.equal(digest(again), digest(map));
  // Flood fill from the altar over walkable tiles.
  const seen = new Uint8Array(map.width * map.depth), queue = [];
  const [sx, sz] = map.markers.spawn[0];
  seen[sz * map.width + sx] = 1; queue.push(sx, sz);
  for (let head = 0; head < queue.length; head += 2) {
    const x = queue[head], z = queue[head + 1];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, i = nz * map.width + nx;
      if (nx >= 0 && nz >= 0 && nx < map.width && nz < map.depth && !seen[i] && I.isWalkableV1(map, nx, nz)) { seen[i] = 1; queue.push(nx, nz); }
    }
  }
  for (const [name, points] of Object.entries(map.markers)) {
    if (name.startsWith('site:') || name === 'trialRings') continue;
    if (name === 'viewpoints') { for (const [x, z] of points) assert.equal(I.kindAtV1(map, x, z), 'rock', 'point de vue sur la falaise'); continue; }
    for (const [x, z] of points) assert.ok(seen[z * map.width + x], name + ' ' + x + ',' + z + ' est atteignable à pied depuis l’autel');
  }
});

test('the main places stand 120 to 250 tiles or more apart, as in the level design metrics', () => {
  const main = ['autel', 'fouilles', 'camp', 'piste', 'village'].map(id => world.sites.find(site => site.id === id));
  for (let i = 0; i < main.length; i++) for (let j = i + 1; j < main.length; j++) {
    const tiles = Math.hypot(main[i].x - main[j].x, main[i].z - main[j].z) / map.tileMeters;
    assert.ok(tiles >= 120, main[i].id + ' – ' + main[j].id + ' : ' + Math.round(tiles) + ' tuiles');
  }
});

test('the canopy trial runs over continuous trees, above the ground', () => {
  const rings = map.markers.trialRings;
  for (let i = 0; i + 1 < rings.length; i++) {
    const [ax, az] = rings[i], [bx, bz] = rings[i + 1];
    for (let k = 0; k <= 20; k++) {
      const x = Math.round(ax + (bx - ax) * k / 20), z = Math.round(az + (bz - az) * k / 20);
      assert.equal(I.kindAtV1(map, x, z), 'tree', 'canopée continue en ' + x + ',' + z);
    }
  }
});

test('the windowed path search crosses a ford and refuses windows that are too large', () => {
  const [fx, fz] = source.river.fords[0];
  const path = I.findPathWindowV1(map, I.nearestWalkableV1(map, fx - 12, fz - 12), I.nearestWalkableV1(map, fx + 14, fz + 10));
  assert.ok(path && path.length > 10);
  assert.equal(I.findPathWindowV1(map, [100, 100], [900, 900]), null);
});

test('islesV1 profile: own key, migration from nothing or damage, JSON round trip', () => {
  const store = new Map();
  const storage = {getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value)};
  assert.deepEqual(I.loadIslesProfileV1(storage).profile, I.defaultIslesProfileV1());
  store.set(I.ISLES_PROFILE_KEY_V1, '{broken');
  const damaged = I.loadIslesProfileV1(storage);
  assert.deepEqual(damaged.profile, I.defaultIslesProfileV1());
  assert.match(damaged.warning, /illisible/);
  const migrated = I.migrateIslesProfileV1({honor: '9000', trophies: [{id: 't', kind: 'jaguar', label: 'jaguar', honor: 20}, {bad: true}], fragments: ['F01', 'F01', 3], missions: {'I-MP-01': 'done', x: 'maybe'}});
  assert.equal(migrated.honor, 0, 'un honneur non numérique est refusé');
  assert.equal(migrated.trophies.length, 1);
  assert.deepEqual(migrated.fragments, ['F01']);
  assert.deepEqual(migrated.missions, {'I-MP-01': 'done'});
  const profile = {...I.defaultIslesProfileV1(), honor: 1600, fragments: ['F02'], trialBestSeconds: 38.5};
  assert.ok(I.saveIslesProfileV1(storage, profile));
  assert.deepEqual(I.loadIslesProfileV1(storage).profile, profile);
  assert.deepEqual([...store.keys()], [I.ISLES_PROFILE_KEY_V1], 'aucune autre clé, aucun emplacement de campagne');
  assert.equal(I.loadIslesProfileV1(null).profile.honor, 0);
});

test('reputation follows the honor thresholds, less the levels lost to grave faults', () => {
  const profile = I.defaultIslesProfileV1();
  assert.equal(I.islesReputationV1(profile, rules.reputation), 1);
  profile.honor = 1500; assert.equal(I.islesReputationV1(profile, rules.reputation), 3);
  profile.reputationPenalty = 1; assert.equal(I.islesReputationV1(profile, rules.reputation), 2);
  profile.honor = 0; assert.equal(I.islesReputationV1(profile, rules.reputation), 1, 'jamais sous 1');
});

test('the day lasts 24 minutes: 1 real minute is 1 hour; night falls at 20 h', () => {
  const state = session();
  assert.equal(Math.round(I.freeHuntClockV1(state, rules).hour), 6);
  state.time = 14 * 60;
  const evening = I.freeHuntClockV1(state, rules);
  assert.equal(Math.round(evening.hour), 20);
  assert.ok(evening.night);
  state.time = 18 * 60 + 1;
  assert.equal(I.freeHuntClockV1(state, rules).day, 1);
});

test('the population appears around the hunter: four poachers at the camp, deterministic', () => {
  const run = () => {
    const state = session();
    place(state, {x: world.sites.find(s => s.id === 'camp').x + 70, z: world.sites.find(s => s.id === 'camp').z});
    step(state, idle, 0.6);
    return state.npcs.filter(npc => npc.cell).map(npc => npc.type + '@' + npc.x.toFixed(2) + ',' + npc.z.toFixed(2));
  };
  const first = run();
  assert.ok(first.filter(item => item.startsWith('braconnier')).length >= 4, first.join(' '));
  assert.deepEqual(run(), first);
});

test('contracts of the altar: read at the altar, filled by the matching kill', () => {
  const state = session();
  place(state, at('altarFront'));
  step(state, {...idle, interact: true});
  assert.equal(state.profile.contracts.accepted.length, rules.contracts.perDay);
  state.contractsToday = [rules.contracts.templates.find(t => t.id === 'braconnier-lame')];
  state.profile.contracts.accepted = ['braconnier-lame'];
  const honorBefore = state.profile.honor;
  place(state, at('fragments', 3));
  const poacher = poacherAhead(state);
  killAhead(state, poacher);
  assert.equal(poacher.state, 'dead');
  assert.ok(state.profile.contracts.done.includes('braconnier-lame'));
  assert.ok(state.profile.honor - honorBefore >= 120 + 15);
});

test('code: killing a non-combatant is a grave fault (honor − 100, reputation − 1) and raises the alert', () => {
  const profile = {...I.defaultIslesProfileV1(), honor: 600};
  const state = session(profile);
  place(state, at('fragments', 3));
  const victim = poacherAhead(state, {type: 'archeologue', armed: false, health: 40, maxHealth: 60});
  killAhead(state, victim);
  assert.equal(victim.state, 'dead');
  assert.equal(state.profile.honor, 500);
  assert.equal(state.profile.reputationPenalty, 1);
  assert.equal(state.profile.faults, 1);
  assert.ok(state.alert.level >= 1);
  assert.equal(victim.honorValue, 0);
});

test('an armed kill unseen at the blade, its trophy taken in 4 s, then delivered at the lair for + 20 %', () => {
  const state = session();
  place(state, at('fragments', 3));
  const poacher = poacherAhead(state);
  killAhead(state, poacher);
  assert.equal(poacher.honorValue, Math.round(15 * rules.honor.bladeFactor * rules.honor.unseenFactor));
  state.player.actor = {...state.player.actor, cloaked: true};
  step(state, {...idle, trophyHeld: true}, 1);
  assert.equal(state.player.actor.cloaked, false, 'le prélèvement coupe le camouflage');
  step(state, {...idle, trophyHeld: true}, rules.trophy.seconds);
  assert.equal(state.carried.length, 1);
  const honor = state.profile.honor;
  place(state, at('repaireEntry'));
  step(state);
  assert.equal(state.carried.length, 0);
  assert.equal(state.profile.trophies.length, 1);
  assert.equal(state.profile.honor - honor, Math.round(poacher.honorValue * rules.honor.deliveredBonus));
  assert.ok(state.profile.lairs.includes('verdant-chutes'));
});

test('death drops the carried trophies on the spot; the hunter rises at the lair and can take them back', () => {
  const state = session({...I.defaultIslesProfileV1(), lairs: ['verdant-chutes']});
  place(state, at('fragments', 3));
  state.carried.push({id: 'x', kind: 'jaguar', label: 'jaguar', honor: 20, takenAtSeconds: 0, place: 'Verdant'});
  const spot = {...state.player.actor};
  state.player.health = 1;
  poacherAhead(state, {state: 'combat', fireTimer: 0, health: 9999, maxHealth: 9999});
  for (let i = 0; i < 400 && !state.player.dead; i++) step(state);
  assert.ok(state.player.dead);
  assert.equal(state.carried.length, 0);
  assert.equal(state.drops.length, 1);
  step(state, idle, rules.player.respawnSeconds + 0.2);
  assert.ok(!state.player.dead);
  assert.ok(Math.hypot(state.player.actor.x - at('repaireEntry').x, state.player.actor.z - at('repaireEntry').z) < 1);
  state.npcs = [];
  place(state, spot);
  step(state);
  assert.equal(state.carried.length, 1, 'trophées repris sur place');
});

test('alert: an armed poacher reports a visible hunter after 3 s; outside the search zone the marks fall back to 0', () => {
  const state = session();
  place(state, at('altarFront'));
  const poacher = poacherAhead(state, {facing: Math.PI, z: state.player.actor.z + 8, fireTimer: 999});
  step(state, idle, rules.perception.reportSeconds + 0.3);
  assert.equal(state.alert.level, 1);
  assert.ok(state.npcs.some(npc => npc.unique === 'responder'), 'des renforts arrivent');
  state.npcs = state.npcs.filter(npc => npc !== poacher && npc.unique !== 'responder');
  place(state, {x: state.alert.x + rules.alert.searchRadius[1] + 40, z: state.alert.z});
  state.npcs = [];
  step(state, idle, rules.alert.decaySeconds + 1);
  assert.equal(state.alert.level, 0);
});

test('rentrer vivant au repaire efface toutes les marques', () => {
  const state = session();
  state.alert = {level: 3, x: 0, z: 0, quiet: 0, lastReport: 0};
  place(state, at('repaireEntry'));
  step(state);
  assert.equal(state.alert.level, 0);
});

test('mission I-MP-01 « L’appât »: altar, camp, three traces, the radio, the chief at the blade, the contract of H.', () => {
  const state = session();
  place(state, at('altarFront'));
  step(state, {...idle, interact: true});
  assert.equal(state.mission.stage, 'camp');
  for (let i = 0; i < state.mission.carcasses.length; i++) { place(state, at('carcassCircle', i)); step(state, {...idle, interact: true}); }
  place(state, world.sites.find(s => s.id === 'camp'));
  state.npcs = [];
  step(state);
  assert.equal(state.mission.stage, 'traces');
  for (let i = 0; i < 3; i++) { state.npcs = []; place(state, at('traces', i)); step(state, {...idle, interact: true}); }
  assert.equal(state.mission.stage, 'radio');
  state.npcs = []; place(state, at('radio'));
  for (let i = 0; i < 200 && state.mission.stage === 'radio'; i++) { state.npcs = state.npcs.filter(npc => npc.unique === 'chief'); step(state); }
  assert.equal(state.mission.stage, 'chief');
  const chief = state.npcs.find(npc => npc.unique === 'chief');
  assert.ok(chief);
  state.npcs = [chief];
  place(state, {x: chief.x, z: chief.z - 1.5});
  Object.assign(chief, {fireTimer: 999, state: 'patrol', pathKey: 'x', timer: 99});
  killAhead(state, chief);
  assert.equal(state.mission.stage, 'contract');
  assert.ok(state.mission.chiefBlade);
  const before = I.islesReputationV1(state.profile, rules.reputation);
  place(state, chief);
  step(state, {...idle, interact: true});
  assert.equal(state.profile.missions['I-MP-01'], 'done');
  assert.ok(state.profile.codex.some(entry => entry.startsWith('Le contrat de H.')));
  assert.equal(I.islesReputationV1(state.profile, rules.reputation), before + 1);
});

test('fragments of the altar are collected once each', () => {
  const state = session();
  place(state, at('fragments', 0));
  step(state, {...idle, interact: true});
  step(state, {...idle, interact: true});
  assert.deepEqual(state.profile.fragments, ['F01']);
  assert.ok(state.profile.codex[0].includes(rules.fragments[0].text));
});

test('the canopy trial: nine rings in order above 6 m, timed, with a medal once', () => {
  const state = session();
  place(state, at('site:epreuve'));
  step(state, {...idle, interact: true});
  assert.ok(state.trial);
  const rings = map.markers.trialRings;
  for (let i = 0; i < rings.length; i++) { place(state, I.tileCenterV1(map, rings[i][0], rings[i][1]), 7); step(state, idle, 3); }
  assert.equal(state.trial, null);
  assert.ok(state.profile.trialBestSeconds > 0);
  assert.equal(state.profile.trialMedals.length, 1);
});

test('the trial fails when the hunter touches the ground', () => {
  const state = session();
  place(state, at('site:epreuve'));
  step(state, {...idle, interact: true});
  const [x, z] = map.markers.trialRings[0];
  place(state, I.tileCenterV1(map, x, z), 7); step(state);
  place(state, at('site:epreuve'), 0); step(state);
  assert.equal(state.trial, null);
});

test('bounty: Le Prédicateur patrols with two escorts; killing him claims the bounty once', () => {
  const state = session();
  const preacher = state.npcs.find(npc => npc.unique === 'bounty');
  assert.ok(preacher && state.npcs.filter(npc => npc.unique === 'escort').length === 2);
  state.npcs = [preacher];
  place(state, {x: preacher.x, z: preacher.z - 1.5});
  Object.assign(preacher, {fireTimer: 999, timer: 99, pathKey: 'x'});
  const honor = state.profile.honor;
  killAhead(state, preacher);
  assert.ok(state.profile.bountiesClaimed.includes(rules.bounty.id));
  assert.ok(state.profile.honor - honor >= rules.bounty.reward);
  assert.equal(session(state.profile).npcs.filter(npc => npc.unique === 'bounty').length, 0);
});

test('legendary: the Roi-de-Verdant appears only on a moonless night, alert 0, near its territory', () => {
  const state = session();
  place(state, at('legendary'));
  step(state, idle, 0.6);
  assert.ok(!state.npcs.some(npc => npc.unique === 'legendary'), 'pas de jour');
  state.time = (24 * (rules.clock.moonlessEvery - 1) + 22 - rules.clock.startHour) * rules.clock.realSecondsPerHour;
  assert.ok(I.freeHuntClockV1(state, rules).moonless);
  step(state, idle, 0.6);
  const king = state.npcs.find(npc => npc.unique === 'legendary');
  assert.ok(king);
  assert.equal(king.scale, rules.legendary.scale);
});

test('a session is deterministic for a seed and the same inputs', () => {
  const run = () => {
    const state = session(I.defaultIslesProfileV1(), 99);
    for (let i = 0; i < 600; i++) I.stepFreeHuntV1(state, {...idle, moveX: Math.sin(i / 40), moveZ: Math.cos(i / 55), run: i % 80 < 40, strike: i % 50 === 0}, world, rules, T, DT);
    return JSON.stringify({a: [state.player.actor.x, state.player.actor.z], npcs: state.npcs.map(n => [n.type, n.x.toFixed(3), n.z.toFixed(3), n.state]), log: state.log});
  };
  assert.equal(run(), run());
});

test('review: a resumed profile keeps the contracts accepted today, whatever the seed of the new session', () => {
  const first = session(I.defaultIslesProfileV1(), 7);
  place(first, at('altarFront'));
  step(first, {...idle, interact: true});
  const accepted = [...first.profile.contracts.accepted];
  assert.equal(accepted.length, rules.contracts.perDay);
  // Another seed alone would draw other contracts; the saved ones win.
  const fresh = session(I.defaultIslesProfileV1(), 8);
  assert.notDeepEqual(fresh.contractsToday.map(c => c.id).sort(), [...accepted].sort());
  const resumed = session(I.migrateIslesProfileV1(JSON.parse(JSON.stringify(first.profile))), 8);
  assert.deepEqual(resumed.contractsToday.map(c => c.id).sort(), [...accepted].sort());
});

test('review: the bounty leaves its first waypoint and walks its round', () => {
  const state = session();
  const bounty = () => state.npcs.find(npc => npc.unique === 'bounty');
  const start = {x: bounty().x, z: bounty().z};
  // The hunter stays 70 m away, out of sight: nothing but the patrol moves the bounty.
  for (let i = 0; i < 40; i++) { place(state, {x: start.x + 70, z: start.z}); step(state, idle, 1); }
  assert.ok(Math.hypot(bounty().x - start.x, bounty().z - start.z) > 20, 'la cible de prime a quitté son point de départ');
  assert.ok((bounty().waypoint ?? 0) >= 1);
});

test('review: an animal on the ground cannot bite a hunter standing 7 m above it', () => {
  const state = session();
  const ring = at('trialRings', 0);
  const jaguar = {id: 'test-jaguar', type: 'jaguar', role: 'animal', armed: false, specialist: false, x: ring.x + 1, z: ring.z, facing: 0, health: 110, maxHealth: 110,
    state: 'combat', homeX: ring.x, homeZ: ring.z, goalX: ring.x, goalZ: ring.z, path: [], pathKey: 'x', timer: 0, fireTimer: 0, seeing: 9, lastSawAt: 0, lastSeen: null,
    reported: -999, hurt: true, moving: false, running: false, cell: null, spawnKey: null, deadAt: -1, killedBy: null, honorValue: 20, trophyTaken: false};
  state.npcs = [jaguar];
  const ground = I.heightAtV1(map, ...I.tileAtV1(map, jaguar.x, jaguar.z));
  place(state, ring, ground + 7);
  const before = state.player.health;
  I.stepFreeHuntV1(state, idle, world, rules, T, DT);
  assert.equal(state.player.health, before, 'aucune morsure à travers la canopée');
  // On the same level the bite lands.
  place(state, {x: jaguar.x - 1, z: jaguar.z}, ground);
  jaguar.fireTimer = 0;
  for (let i = 0; i < 40 && state.player.health === before; i++) { jaguar.x = state.player.actor.x + 1; jaguar.z = state.player.actor.z; jaguar.hurt = true; I.stepFreeHuntV1(state, idle, world, rules, T, DT); }
  assert.ok(state.player.health < before, 'au même niveau, le jaguar mord');
});
