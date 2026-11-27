import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesMapV1";
export * from "./app/game/isles/islesMovementV1";
export * from "./app/game/isles/islesPathV1";
export * from "./app/game/isles/islesReverseHuntV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const R = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const tuning = JSON.parse(await readFile('app/game/data/islesTuningV1.json', 'utf8'));
const rules = JSON.parse(await readFile('app/game/data/islesReverseHuntV1.json', 'utf8'));
const map = R.parseIslesMapV1(JSON.parse(await readFile('app/game/data/islesMapVerdantV1.json', 'utf8')), 2);
const T = {movement: tuning.movement, cloak: tuning.cloak};
const DT = 0.05;
const idle = {...R.NO_MOVE_INPUT_V1, strike: false, plasma: false, trophyHeld: false, selfDestruct: false, acceptDuel: false};
const step = (state, input = idle, seconds = DT) => { for (let i = 0; i < Math.round(seconds / DT); i++) R.stepReverseHuntV1(state, input, map, rules, T, DT); return state; };
const create = (seed, size) => R.createReverseHuntV1(map, rules, T, seed, size);
/** Puts the hunter right in front of a human, facing him. */
function faceHuman(state, human, gap = 1.5) {
  const a = state.yautja.actor;
  Object.assign(a, {x: human.x, z: human.z - gap, y: 0, facing: 0, cloaked: false, vx: 0, vz: 0, grounded: true});
}
/** Moves a human to a walkable spot far from everyone so the AI leaves him alone. */
function isolate(state, human, tile) {
  const [x, z] = R.nearestWalkableV1(map, ...tile);
  Object.assign(human, R.tileCenterV1(map, x, z));
}

test('every human tile path of the plan exists: arrival to each piece spot, the mast and the extraction', () => {
  const arrival = R.tileAtV1(map, ...Object.values(R.markerV1(map, 'humanArrival')));
  for (const name of ['piece:radio', 'piece:battery', 'piece:flares', 'radioMast', 'extraction']) {
    for (const point of map.markers[name]) assert.ok(R.findPathV1(map, arrival, point), name + ' ' + point + ' est atteignable à pied');
  }
});

test('a match has 5 distinct roles out of 6, and each piece at one of its 3 spots, from the seed', () => {
  const a = create(11), b = create(11), c = create(12);
  assert.equal(a.humans.length, 5);
  assert.equal(new Set(a.humans.map(h => h.role)).size, 5);
  for (const h of a.humans) assert.ok(rules.roleOrder.includes(h.role));
  assert.deepEqual(a.pieces.map(p => p.positionIndex), b.pieces.map(p => p.positionIndex));
  for (const piece of a.pieces) assert.ok(piece.positionIndex >= 0 && piece.positionIndex < 3);
  const spots = new Set();
  for (let seed = 1; seed < 40; seed++) spots.add(create(seed).pieces.map(p => p.positionIndex).join());
  assert.ok(spots.size > 5, 'l’emplacement des pièces change d’une partie à l’autre');
  assert.equal(create(3, 6).humans.length, 6);
  assert.equal(create(3, 9).humans.length, 6, '6 humains au plus');
  assert.equal(create(3, 1).humans.length, 4, '4 humains au moins');
  void c;
});

test('left alone, the AI team finds the 3 pieces, calls from the mast, and escapes on the seaplane', () => {
  const state = create(5);
  // The hunter waits, cloaked, on top of the pyramid.
  Object.assign(state.yautja.actor, {x: 70 * 2 + 1, z: 18 * 2 + 1, y: 6.5});
  let called = -1, landed = -1;
  while (!state.outcome && state.time < rules.durationSeconds + 1) {
    step(state, idle, 1);
    if (called < 0 && state.extraction.phase === 'inbound') called = state.time;
    if (landed < 0 && state.extraction.phase === 'landed') landed = state.time;
  }
  assert.ok(state.pieces.every(p => p.found), 'les trois pièces trouvées');
  assert.ok(called > 0 && landed > called, 'appel puis arrivée de l’hydravion');
  assert.equal(state.outcome?.winner, 'humans', JSON.stringify(state.outcome) + state.log.map(l => l.text).join(' | '));
  assert.equal(state.outcome.kind, 'fuite');
  assert.ok(state.outcome.escaped >= 1 && state.outcome.humanScore >= rules.score.escaped);
});

test('the hunter downs an armed human, then takes his trophy in 6 to 12 s with the cloak off', () => {
  const state = create(21);
  const victim = state.humans[0];
  isolate(state, victim, [30, 70]);
  victim.surrenderDecided = true; // he fights to the end
  faceHuman(state, victim);
  const strike = {...idle, strike: true};
  for (let i = 0; i < 6 && victim.status === 'active'; i++) { faceHuman(state, victim); step(state, strike); step(state, idle, rules.yautja.strikeSeconds + 2 * DT); }
  assert.equal(victim.status, 'downed');
  const honorBefore = state.yautja.honor;
  step(state, {...idle, cloak: true});
  step(state, {...idle, trophyHeld: true}, 1);
  assert.ok(state.yautja.trophy && !state.yautja.actor.cloaked, 'le camouflage se coupe pendant le prélèvement');
  const needed = state.yautja.trophy.needed;
  assert.ok(needed >= rules.trophy.minSeconds && needed <= rules.trophy.maxSeconds);
  step(state, {...idle, trophyHeld: true}, needed);
  assert.equal(victim.status, 'trophy');
  assert.equal(state.yautja.honor - honorBefore, rules.honor.trophy + rules.honor.armedKill, 'honneur sur un humain armé');
});

test('a downed human bleeds out after 30 s unless an ally revives him, twice as fast for the medic', () => {
  const state = create(8, 6);
  const [victim, other] = state.humans.filter(h => h.role !== 'medic');
  const medic = state.humans.find(h => h.role === 'medic');
  for (const h of state.humans) isolate(state, h, [20, 64]);
  Object.assign(state.yautja.actor, {x: 140, z: 30});
  isolate(state, victim, [30, 70]);
  Object.assign(victim, {status: 'downed', health: 0, bleed: rules.downed.bleedSeconds});
  for (const h of state.humans) if (h !== victim) isolate(state, h, [80, 20]);
  step(state, idle, rules.downed.bleedSeconds + 0.5);
  assert.equal(victim.status, 'dead', 'mort après 30 s sans secours');

  const revive = (helper) => {
    const fresh = create(8, 6);
    const v = fresh.humans.find(h => h.id === victim.id), help = fresh.humans.find(h => h.id === helper.id);
    Object.assign(fresh.yautja.actor, {x: 140, z: 30});
    for (const h of fresh.humans) if (h !== v && h !== help) isolate(fresh, h, [80, 20]);
    isolate(fresh, v, [30, 70]);
    Object.assign(v, {status: 'downed', health: 0, bleed: rules.downed.bleedSeconds});
    Object.assign(help, {x: v.x + 0.5, z: v.z});
    let t = 0;
    while (v.status === 'downed' && t < 20) { step(fresh, idle, DT); t += DT; }
    assert.equal(v.status, 'active');
    return t;
  };
  const byMedic = revive(medic), byOther = revive(other);
  assert.ok(byMedic < byOther * 0.65, `médecin ${byMedic.toFixed(2)} s contre ${byOther.toFixed(2)} s`);
});

test('code: a surrendered human is never auto-targeted, and striking one loses the match at once', () => {
  const state = create(31);
  const [fighter, coward] = state.humans;
  for (const h of state.humans) isolate(state, h, [80, 20]);
  isolate(state, coward, [30, 70]);
  Object.assign(coward, {armed: false, surrendered: true, disarmedFor: rules.surrender.disarmSeconds});
  Object.assign(fighter, {x: coward.x + 0.5, z: coward.z - 0.3});
  faceHuman(state, coward);
  step(state, {...idle, strike: true});
  assert.ok(fighter.health < rules.humanHealth, 'le coup va au combattant');
  assert.equal(state.outcome, null);
  isolate(state, fighter, [80, 20]);
  step(state, idle, rules.yautja.strikeSeconds + 2 * DT);
  faceHuman(state, coward);
  step(state, {...idle, strike: true});
  assert.equal(state.outcome?.winner, 'humans');
  assert.equal(state.outcome.kind, 'faute');
  assert.equal(state.outcome.honor, 0);
});

test('a surrendered human carries no piece, cannot call, re-arms after 90 s and counts half at the extraction', () => {
  const state = create(41);
  const h = state.humans[0];
  isolate(state, h, [30, 70]);
  h.carrying = 'radio'; state.pieces[0].carrier = h.id; state.pieces[0].found = true;
  Object.assign(h, {health: 20});
  Object.assign(state.yautja.actor, {x: h.x, z: h.z - 6, cloaked: false});
  for (const other of state.humans.slice(1)) isolate(state, other, [80, 20]);
  state.known = {x: state.yautja.actor.x, z: state.yautja.actor.z, at: 0, marked: 999};
  // Force the coin: try seeds until this human surrenders.
  let surrendered = false;
  for (let seed = 0; seed < 50 && !surrendered; seed++) {
    state.rng = seed; h.surrenderDecided = false; h.armed = true; h.disarmedFor = 0;
    h.carrying = 'radio'; state.pieces[0].carrier = h.id;
    step(state, idle);
    surrendered = h.disarmedFor > 0;
  }
  assert.ok(surrendered && !h.armed && h.carrying === null && state.pieces[0].carrier === null, 'il lâche la pièce en se rendant');
  Object.assign(state.yautja.actor, {x: 140, z: 30});
  step(state, idle, rules.surrender.disarmSeconds + 0.5);
  assert.ok(h.armed && h.disarmedFor === 0, 'il reprend une arme après 90 s');
  assert.equal(rules.surrender.extractionWeight, 0.5);
});

test('self-destruct: 10 s to leave the radius, those inside are eliminated', () => {
  const state = create(51);
  const [ax, az] = R.nearestWalkableV1(map, 30, 70);
  const centre = R.tileCenterV1(map, ax, az);
  state.humans.forEach((h, i) => Object.assign(h, {x: centre.x + Math.cos(i) * 3, z: centre.z + Math.sin(i) * 3}));
  const far = state.humans[4];
  isolate(state, far, [80, 20]);
  Object.assign(state.yautja.actor, {x: centre.x, z: centre.z, y: 0, vy: 0});
  state.yautja.health = 1;
  state.humans.forEach(h => { h.fireTimer = 0; });
  // A trap under the hunter finishes him.
  state.traps.push({x: state.yautja.actor.x, z: state.yautja.actor.z, armed: true});
  step(state, idle);
  assert.equal(state.yautja.selfDestruct.phase, 'offered');
  step(state, {...idle, selfDestruct: true});
  assert.equal(state.yautja.selfDestruct.phase, 'counting');
  // Freeze the humans in the radius (they would otherwise run).
  const frozen = state.humans.slice(0, 4).map(h => ({h, x: h.x, z: h.z}));
  while (state.yautja.selfDestruct.phase === 'counting') { step(state, idle); for (const f of frozen) Object.assign(f.h, {x: f.x, z: f.z}); }
  for (const {h} of frozen) assert.equal(h.status, 'dead');
  assert.equal(far.status, 'active');
  assert.equal(state.outcome?.winner, 'humans');
  assert.equal(state.outcome.kind, 'autodestruction');
});

test('a Yautja that does not trigger the self-destruct is simply shot down', () => {
  const state = create(52);
  state.yautja.health = 1;
  state.traps.push({x: state.yautja.actor.x, z: state.yautja.actor.z, armed: true});
  step(state, idle, rules.selfDestruct.offerSeconds + 0.2);
  assert.equal(state.outcome?.kind, 'abattu');
});

test('at 15:00 with no escape, two humans alive hold the island; fewer gives the hunt to the Yautja', () => {
  const hold = create(61);
  Object.assign(hold.yautja.actor, {x: 140, z: 30});
  hold.time = rules.durationSeconds - 0.01;
  step(hold, idle);
  assert.equal(hold.outcome?.kind, 'tenir');
  assert.equal(hold.outcome.alive, 5);
  const hunt = create(62);
  hunt.humans.slice(1).forEach(h => { h.status = 'dead'; });
  hunt.time = rules.durationSeconds - 0.01;
  step(hunt, idle);
  assert.equal(hunt.outcome?.winner, 'yautja');
});

test('all humans killed with every trophy taken is a perfect hunt', () => {
  const state = create(71);
  state.humans.forEach(h => { h.status = 'trophy'; });
  step(state, idle);
  assert.equal(state.outcome?.kind, 'chasse-parfaite');
  assert.equal(state.outcome.honor, rules.honor.perfect);
});

test('detection: cloaked and still is seen from 6 m, uncloaked from 26 m, water reveals', () => {
  const state = create(81);
  state.night = false; state.rain = false;
  const a = state.yautja.actor;
  Object.assign(a, {cloaked: true, vx: 0, vz: 0, revealSeconds: 0, swimming: false, wading: false});
  assert.equal(R.detectionRangeV1(state, rules), rules.perception.cloakedStillRange);
  a.cloaked = false;
  assert.equal(R.detectionRangeV1(state, rules), rules.perception.range);
  a.wading = true;
  assert.equal(R.detectionRangeV1(state, rules), rules.perception.revealedRange);
  a.wading = false; a.cloaked = true; state.rain = true;
  assert.ok(R.detectionRangeV1(state, rules) > rules.perception.cloakedStillRange, 'la pluie trahit le camouflage');
});

test('the match is deterministic for a seed and the same inputs', () => {
  const run = () => {
    const s = create(99);
    for (let i = 0; i < 400; i++) R.stepReverseHuntV1(s, {...idle, moveX: Math.sin(i / 30), moveZ: 0.5, run: i % 50 < 25, strike: i % 40 === 0}, map, rules, T, DT);
    return JSON.stringify({h: s.humans.map(h => [h.x.toFixed(3), h.z.toFixed(3), h.status, h.goal]), y: [s.yautja.actor.x, s.yautja.actor.z], log: s.log});
  };
  assert.equal(run(), run());
});
