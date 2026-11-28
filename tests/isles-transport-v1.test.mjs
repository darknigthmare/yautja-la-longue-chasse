import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesTransportV1";
export * from "./app/game/isles/islesArchipelagoGenV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const T = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const source = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));
const living = JSON.parse(await readFile('app/game/data/islesLivingWorldV1.json', 'utf8'));
const world = T.createArchipelagoWorldV1(source);
const ground = (x, z) => world.tileAt(Math.floor(x / source.tileMeters), Math.floor(z / source.tileMeters));
const network = T.createIslesTransportNetworkV1(living, source, ground);
const tuning = T.ISLES_TRANSPORT_TUNING_V1;

const STEP = 0.5, TWO_HOURS = 7200;
const lineOf = id => network.lines.find(line => line.id === id);
const stopOf = id => network.stops.find(stop => stop.id === id);
const specOf = line => living.transports[line.kind];
const vehicleAt = (id, time, net = network) => T.islesVehiclesAtV1(net, time).find(vehicle => vehicle.id === id);
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Stops a vehicle waits at during one round, after leaving the first one: the loop, or there and back. */
const roundStops = line => line.loop ? [...line.stops.slice(1), line.stops[0]] : [...line.stops.slice(1), ...line.stops.slice(0, -1).reverse()];
/** Position of a point in the frame of a vehicle (same convention as the module: yaw = atan2(dx, dz)). */
const local = (vehicle, point) => {
  const dx = point.x - vehicle.x, dz = point.z - vehicle.z, sin = Math.sin(vehicle.yaw), cos = Math.cos(vehicle.yaw);
  return {along: dx * sin + dz * cos, across: dx * cos - dz * sin};
};
const offset = (vehicle, along, across) => {
  const sin = Math.sin(vehicle.yaw), cos = Math.cos(vehicle.yaw);
  return {x: vehicle.x + along * sin + across * cos, z: vehicle.z + along * cos - across * sin};
};

// One pass over the game clock, every half second, long enough for two departures of the rarest line. It keeps,
// per vehicle, the worst jump of position and of speed and every wait at a stop, and per line the departures
// from the first stop.
const span = Math.max(TWO_HOURS, ...network.lines.map(line => 2 * line.headwaySeconds), ...network.lines.map(line => 1.5 * line.roundSeconds)) + 4;
const tracks = new Map(), departures = new Map(network.lines.map(line => [line.id, []]));
let samples = 0;
for (let i = 0; i * STEP <= span + 2; i++) {
  const time = i * STEP - 2;
  samples++;
  for (const vehicle of T.islesVehiclesAtV1(network, time)) {
    let track = tracks.get(vehicle.id);
    if (!track) tracks.set(vehicle.id, track = {last: null, worstMove: -Infinity, worstSpeedGap: -Infinity, worstAcceleration: 0, waits: [], wait: null, offSea: 0, seen: 0, bad: 0, topSpeed: 0});
    const max = living.transports[vehicle.kind].speed, last = track.last;
    track.seen++;
    track.topSpeed = Math.max(track.topSpeed, vehicle.speed);
    if (![vehicle.x, vehicle.y, vehicle.z, vehicle.yaw, vehicle.speed].every(Number.isFinite) || vehicle.stopped !== (vehicle.stopId !== null) || (vehicle.stopped && vehicle.speed !== 0)) track.bad++;
    if (vehicle.cls === 'mer' && vehicle.y !== 0) track.offSea++;
    if (last) {
      const moved = flat(vehicle, last);
      track.worstMove = Math.max(track.worstMove, moved - (max * STEP * 1.05 + 0.01));
      track.worstSpeedGap = Math.max(track.worstSpeedGap, moved - (Math.max(vehicle.speed, last.speed) * STEP + 0.01));
      track.worstAcceleration = Math.max(track.worstAcceleration, Math.abs(vehicle.speed - last.speed) / STEP);
      if (last.stopped && !vehicle.stopped && last.stopId === lineOf(vehicle.lineId).stopIds[0]) departures.get(vehicle.lineId).push(time);
    }
    if (vehicle.stopped) {
      if (!track.wait || track.wait.stopId !== vehicle.stopId) track.waits.push(track.wait = {stopId: vehicle.stopId, from: time, seconds: 0, complete: Boolean(last) && !last.stopped, drift: 0});
      track.wait.seconds += STEP;
      track.wait.drift = Math.max(track.wait.drift, flat(vehicle, stopOf(vehicle.stopId)));
    } else if (track.wait) { track.wait.left = true; track.wait = null; }
    track.last = vehicle;
  }
}

test('every line of the data has a path, a timetable and all its stops resolved', () => {
  assert.equal(network.lines.length, living.lines.length);
  const metres = source.scale * 1000;
  const zones = [...source.islands.flatMap(island => island.zones), ...source.chain.zones, ...source.islets.flatMap(islet => islet.zones ?? [])];
  for (const line of living.lines) {
    const built = lineOf(line.id), spec = specOf(line);
    assert.ok(built, line.id);
    assert.equal(built.kind, line.kind);
    assert.equal(built.name, line.name);
    assert.equal(built.cls, spec.class);
    assert.equal(built.loop, line.loop);
    assert.ok(built.length > 0, line.id + ' a un tracé');
    assert.ok(built.roundSeconds > 0 && Number.isFinite(built.roundSeconds), line.id);
    assert.ok(Number.isInteger(built.vehicles) && built.vehicles >= 1 && built.vehicles <= tuning.maxVehiclesPerLine, line.id + ' : ' + built.vehicles + ' véhicules');
    assert.deepEqual(built.stopIds, line.stops);
    assert.equal(built.path.length, line.stops.length + (line.loop ? 1 : 0));
    assert.equal(built.path.at(-1).s, built.length);
    line.stops.forEach((id, index) => {
      const stop = stopOf(id);
      assert.ok(stop, line.id + ' : arrêt ' + id);
      assert.ok(stop.lines.includes(line.id) && stop.label.length > 0);
      assert.ok(flat(stop, built.path[index]) === 0 && built.stopAt[index] === built.path[index].s, line.id + ' passe par ' + id);
      if (index > 0) assert.ok(built.stopAt[index] > built.stopAt[index - 1], line.id + ' : arrêts confondus');
    });
  }
  const zone = zones.find(item => item.id === '4.1'), rig = source.seaZone.rigs[0], islet = source.islets.find(item => item.id === 'ironhook');
  assert.deepEqual([stopOf('4.1').x, stopOf('4.1').z], [zone.at[0] * metres, zone.at[1] * metres]);
  assert.deepEqual([stopOf('sea:' + rig.id).x, stopOf('sea:' + rig.id).z], [rig.center[0] * metres, rig.center[1] * metres]);
  assert.deepEqual([stopOf('islet:ironhook').x, stopOf('islet:ironhook').z], [islet.center[0] * metres, islet.center[1] * metres]);
  assert.equal(network.stops.length, new Set(living.lines.flatMap(line => line.stops)).size);
});

test('bad data is refused by name', () => {
  const [first, ...others] = living.lines;
  assert.throws(() => T.createIslesTransportNetworkV1({...living, lines: [{...first, stops: [first.stops[0], 'nulle-part']}, ...others]}, source), /nulle-part/);
  assert.throws(() => T.createIslesTransportNetworkV1({...living, lines: [{...first, kind: 'dirigeable'}]}, source), /dirigeable/);
});

test('the number of vehicles follows the round and the headway', () => {
  for (const line of network.lines) {
    const every = line.everyMinutes * 60, moving = line.legs.reduce((sum, leg) => sum + leg.travel, 0) + line.legs.length * specOf(line).stopSeconds;
    assert.equal(line.vehicles, Math.min(tuning.maxVehiclesPerLine, Math.max(1, Math.ceil(moving / every))), line.id);
    assert.ok(line.roundSeconds >= moving - 1e-6 && Math.abs(line.headwaySeconds * line.vehicles - line.roundSeconds) < 1e-6, line.id);
    assert.equal(T.islesVehiclesAtV1(network, 0).filter(vehicle => vehicle.lineId === line.id).length, line.vehicles);
    assert.equal([...tracks.keys()].filter(id => id.startsWith(line.id + '#')).length, line.vehicles);
  }
  assert.ok(new Set(T.islesVehiclesAtV1(network, 0).map(vehicle => vehicle.id)).size === tracks.size, 'identifiants uniques et stables');
});

test('the same time gives the same vehicles, without any state', () => {
  const again = T.createIslesTransportNetworkV1(living, source, ground);
  assert.deepEqual(again.lines, network.lines);
  assert.deepEqual(again.stops, network.stops);
  for (const time of [0, 17.25, 3600, 86400 * 3 + 0.5, 5e6, -900]) {
    const now = T.islesVehiclesAtV1(network, time);
    // Asking for other instants in between changes nothing: nothing is remembered.
    T.islesVehiclesAtV1(network, time + 40);
    T.islesVehiclesAtV1(network, time - 40);
    assert.deepEqual(T.islesVehiclesAtV1(network, time), now);
    assert.deepEqual(T.islesVehiclesAtV1(again, time), now);
  }
});

test('no vehicle teleports or jolts over the sampled hours', () => {
  assert.ok(samples * STEP >= TWO_HOURS, 'au moins deux heures de jeu');
  // The four the brief asks for, one per class, then every other line as well.
  const asked = ['M1', 'B2', 'F1', 'A1', 'K1'];
  assert.deepEqual(asked.map(id => lineOf(id).cls), ['rail', 'route', 'mer', 'air', 'câble']);
  for (const [id, track] of tracks) {
    assert.equal(track.seen, samples, id + ' ne disparaît jamais');
    assert.equal(track.bad, 0, id + ' : état incohérent');
    assert.ok(track.worstMove <= 0, id + ' dépasse sa vitesse de ' + track.worstMove.toFixed(3) + ' m sur un pas');
    assert.ok(track.worstSpeedGap <= 0, id + ' avance plus que sa vitesse annoncée (' + track.worstSpeedGap.toFixed(3) + ' m)');
    assert.ok(track.worstAcceleration <= tuning.maxAcceleration + 1e-6, id + ' : ' + track.worstAcceleration.toFixed(2) + ' m/s²');
  }
  for (const line of network.lines) {
    const top = Math.max(...[...tracks].filter(([id]) => id.startsWith(line.id + '#')).map(([, track]) => track.topSpeed));
    assert.ok(Math.abs(top - specOf(line).speed) < 1e-9, line.id + ' atteint sa vitesse de croisière');
  }
});

test('each vehicle waits stopSeconds at every stop of its line, at the stop itself', () => {
  for (const line of living.lines) {
    const built = lineOf(line.id), expected = roundStops(line), wait = specOf(line).stopSeconds;
    for (let number = 1; number <= built.vehicles; number++) {
      const waits = tracks.get(line.id + '#' + number).waits.filter(item => item.complete && item.left);
      assert.ok(waits.length >= expected.length, line.id + '#' + number + ' : un tour complet observé');
      // The observation starts anywhere in the round: the stops seen are the round, turned by some number of stops.
      const seen = waits.slice(0, expected.length).map(item => item.stopId);
      const turned = expected.map((_, shift) => [...expected.slice(shift), ...expected.slice(0, shift)]).find(order => order.every((id, index) => id === seen[index]));
      assert.ok(turned, line.id + '#' + number + ' : ' + seen.join(' → ') + ' au lieu de ' + expected.join(' → '));
      for (const item of waits) {
        assert.ok(item.drift < 0.01, line.id + ' arrêté à ' + item.drift.toFixed(2) + ' m de ' + item.stopId);
        // The first stop also takes the slack that keeps the headway exact.
        if (item.stopId === line.stops[0]) assert.ok(Math.abs(item.seconds - (wait + built.roundSeconds - built.legs.reduce((sum, leg) => sum + leg.travel, 0) - built.legs.length * wait)) <= 1, line.id + ' : terminus ' + item.seconds + ' s');
        else assert.ok(Math.abs(item.seconds - wait) <= 1, line.id + ' : ' + item.seconds + ' s à ' + item.stopId + ' au lieu de ' + wait);
      }
    }
  }
});

test('a line that is not a loop goes there and comes back', () => {
  const line = living.lines.find(item => !item.loop && item.stops.length > 2);
  const waits = tracks.get(line.id + '#1').waits.map(item => item.stopId), last = line.stops.at(-1);
  const far = waits.indexOf(last), home = waits.indexOf(line.stops[0], far);
  assert.ok(far >= 0 && home > far, line.id + ' revient à ' + line.stops[0]);
  assert.deepEqual(waits.slice(far, home + 1), [...line.stops].reverse());
  // A train comes back without turning round; a bus or a ferry turns at the terminus.
  for (const [id, turns] of [['T3', false], ['B2', true], ['F1', true], ['K1', false]]) {
    const built = lineOf(id), out = built.legs[0], back = built.legs.at(-1);
    const going = vehicleAt(id + '#1', out.depart + out.travel / 2), coming = vehicleAt(id + '#1', back.depart + back.travel / 2);
    assert.equal(going.reverse, false);
    assert.equal(coming.reverse, !turns, id);
    assert.ok(Math.abs(Math.abs(going.yaw - coming.yaw) - (turns ? Math.PI : 0)) < 1e-6, id + ' : cap ' + going.yaw + ' puis ' + coming.yaw);
    const ahead = vehicleAt(id + '#1', back.depart + back.travel / 2 + 1), heading = coming.yaw + (coming.reverse ? Math.PI : 0);
    assert.ok((ahead.x - coming.x) * Math.sin(heading) + (ahead.z - coming.z) * Math.cos(heading) > 0, id + ' avance dans le sens annoncé');
  }
});

test('a vehicle leaves the first stop every everyMinutes', () => {
  for (const line of living.lines) {
    const times = departures.get(line.id), every = line.everyMinutes * 60;
    assert.ok(times.length >= 2, line.id + ' : ' + times.length + ' départs observés');
    for (let i = 1; i < times.length; i++) assert.ok(Math.abs(times[i] - times[i - 1] - every) <= every * 0.05, line.id + ' : ' + (times[i] - times[i - 1]) + ' s entre deux départs');
  }
});

test('a plane is on the ground at its stops and at cruise altitude in between', () => {
  for (const id of ['A1', 'A2', 'H1']) {
    const line = lineOf(id), cruise = specOf(line).cruiseAltitude;
    line.legs.forEach((leg, index) => {
      const arrived = leg.depart + leg.travel, stop = stopOf(line.stopIds[leg.to]);
      const landed = vehicleAt(id + '#1', arrived + specOf(line).stopSeconds / 2), middle = vehicleAt(id + '#1', leg.depart + leg.travel / 2);
      assert.equal(landed.stopId, stop.id);
      assert.ok(Math.abs(landed.y - stop.top) < 1e-6, id + ' posé à ' + landed.y + ' m à ' + stop.id);
      assert.ok(Math.abs(landed.y - Math.max(0, ground(stop.x, stop.z).height)) < 1e-6, id + ' touche le sol réel');
      assert.ok(Math.abs(middle.y - cruise) < 0.01, id + ' étape ' + index + ' : ' + middle.y + ' m');
      // Climbing takes 15 % of the leg: still low after 2 %, level after 20 %.
      const distance = Math.abs(leg.s1 - leg.s0), from = stopOf(line.stopIds[leg.from]);
      for (let time = leg.depart; time < arrived; time += leg.travel / 400) {
        const flying = vehicleAt(id + '#1', time), share = flat(flying, from) / distance;
        assert.ok(flying.y >= Math.min(from.top, stop.top) - 1e-6 && flying.y <= cruise + 1e-6);
        if (share > 0.2 && share < 0.8) assert.ok(Math.abs(flying.y - cruise) < 0.01, id + ' en croisière');
        if (share < 0.02) assert.ok(flying.y - from.top < cruise * 0.1, id + ' décolle à peine');
      }
    });
  }
});

test('a ferry stays at sea level and a cable car hangs 12 m over the line between its stations', () => {
  const sea = [...tracks].filter(([id]) => lineOf(id.split('#')[0]).cls === 'mer');
  assert.ok(sea.length >= living.lines.filter(line => living.transports[line.kind].class === 'mer').length);
  for (const [id, track] of sea) assert.equal(track.offSea, 0, id + ' quitte le niveau de la mer');
  for (const id of ['K1', 'K2']) {
    const line = lineOf(id), leg = line.legs[0], a = stopOf(line.stopIds[0]).y, b = stopOf(line.stopIds[1]).y;
    // Half of the time is half of the way: the two ramps mirror each other.
    for (const share of [0, 0.5, 1]) {
      const cabin = vehicleAt(id + '#1', leg.depart + leg.travel * share);
      assert.ok(Math.abs(cabin.y - (a + (b - a) * share + tuning.cableClearance)) < 1e-6, id + ' à ' + cabin.y + ' m');
    }
  }
});

test('without a ground sampler everything runs at height 0', () => {
  const bare = T.createIslesTransportNetworkV1(living, source);
  for (const time of [0, 1234.5, 6000]) for (const vehicle of T.islesVehiclesAtV1(bare, time)) {
    if (vehicle.cls === 'câble') assert.equal(vehicle.y, tuning.cableClearance);
    else if (vehicle.cls !== 'air') assert.equal(vehicle.y, 0);
  }
  assert.ok(bare.stops.every(stop => stop.y === 0 && stop.top === 0));
});

test('the deck is the oriented rectangle of the vehicle, at the height of its roof', () => {
  const leg = lineOf('B2').legs[0];
  const bus = vehicleAt('B2#1', leg.depart + leg.travel / 3);
  assert.ok(Math.abs(Math.sin(bus.yaw) * Math.cos(bus.yaw)) > 0.05, 'le bus roule en biais');
  assert.deepEqual(T.islesVehicleDeckV1(bus, bus.x, bus.z), {inside: true, deckY: bus.y + bus.height});
  for (const side of [-1, 1]) {
    const beside = offset(bus, 0, side * bus.width * 2), front = offset(bus, side * (bus.length / 2 - 0.1), 0), wide = offset(bus, 0, side * (bus.length / 2 - 0.1));
    assert.equal(T.islesVehicleDeckV1(bus, beside.x, beside.z).inside, false, 'à deux largeurs');
    assert.equal(T.islesVehicleDeckV1(bus, front.x, front.z).inside, true, 'au bout du toit');
    assert.equal(T.islesVehicleDeckV1(bus, wide.x, wide.z).inside, false, 'la longueur ne compte pas en travers');
    const corner = offset(bus, side * (bus.length / 2 - 0.05), side * (bus.width / 2 - 0.05)), past = offset(bus, side * (bus.length / 2 + 0.05), 0);
    assert.equal(T.islesVehicleDeckV1(bus, corner.x, corner.z).inside, true);
    assert.equal(T.islesVehicleDeckV1(bus, past.x, past.z).inside, false);
  }
});

test('a rider carried for 60 s stays where it stood on the roof, through braking, a turn at a stop and a climb', () => {
  for (const [id, legIndex, along, across] of [['M1', 0, 22, 1.1], ['B1', 1, -4, 0.9], ['S3', 0, 5, -1.5], ['K1', 0, 1.5, -1], ['T1', 4, -40, 1]]) {
    const leg = lineOf(id).legs[legIndex], start = leg.depart + leg.travel - 25, frames = 3600, dt = 60 / frames;
    let before = vehicleAt(id + '#1', start);
    let rider = {...offset(before, along, across), y: before.y + before.height};
    const first = before;
    let turned = 0;
    for (let frame = 1; frame <= frames; frame++) {
      const after = vehicleAt(id + '#1', start + frame * dt);
      rider = T.islesRideStepV1(before, after, rider);
      turned += Math.abs(Math.atan2(Math.sin(after.yaw - before.yaw), Math.cos(after.yaw - before.yaw)));
      before = after;
    }
    const place = local(before, rider), deck = T.islesVehicleDeckV1(before, rider.x, rider.z);
    assert.ok(Math.hypot(place.along - along, place.across - across) < 0.05, id + ' : passager déplacé de ' + Math.hypot(place.along - along, place.across - across).toFixed(3) + ' m');
    assert.equal(deck.inside, true, id);
    assert.ok(Math.abs(rider.y - deck.deckY) < 0.05, id + ' : passager à ' + (rider.y - deck.deckY).toFixed(3) + ' m du toit');
    assert.ok(flat(first, before) > 10, id + ' a bougé');
    if (id === 'M1' || id === 'B1' || id === 'S3') assert.ok(turned > 0.2, id + ' a tourné de ' + turned.toFixed(2) + ' rad');
  }
});

test('weather holds a transport type at the last stop reached, without removing it', () => {
  const stopped = kind => kind === 'ferry';
  let held = 0;
  for (let time = 0; time <= TWO_HOURS; time += 97) {
    const free = T.islesVehiclesAtV1(network, time), stormy = T.islesVehiclesAtV1(network, time, undefined, {stopped});
    assert.equal(stormy.length, free.length);
    stormy.forEach((vehicle, index) => {
      if (vehicle.kind !== 'ferry') return assert.deepEqual(vehicle, free[index]);
      const line = lineOf(vehicle.lineId), stop = stopOf(vehicle.stopId), normal = free[index];
      assert.ok(vehicle.stopped && vehicle.speed === 0 && stop, vehicle.id + ' est à quai');
      assert.ok(flat(vehicle, stop) < 0.01 && vehicle.y === 0, vehicle.id + ' est à ' + flat(vehicle, stop).toFixed(1) + ' m de ' + stop.id);
      if (normal.stopped) return assert.deepEqual(vehicle, normal);
      held++;
      // Held at the stop it left: the one before the stop it was sailing to.
      assert.equal(vehicle.nextStopId, normal.nextStopId);
      assert.ok(line.legs.some(leg => line.stopIds[leg.from] === vehicle.stopId && line.stopIds[leg.to] === normal.nextStopId));
      const later = T.islesVehiclesAtV1(network, time + 5, undefined, {stopped}).find(item => item.id === vehicle.id);
      if (!later.stopped || later.stopId === vehicle.stopId) assert.ok(flat(later, vehicle) < 0.01, vehicle.id + ' ne bouge pas');
    });
  }
  assert.ok(held > 20, 'des ferries étaient en mer : ' + held);
});

test('the around filter keeps exactly the vehicles within the radius', () => {
  const time = 1500, all = T.islesVehiclesAtV1(network, time), centre = stopOf('4.1');
  for (const radius of [0, 800, 4000, 20000, 1e6]) {
    const around = {x: centre.x, z: centre.z, radius};
    const near = T.islesVehiclesAtV1(network, time, around);
    assert.deepEqual(near, all.filter(vehicle => flat(vehicle, centre) <= radius));
    assert.ok(near.every(vehicle => flat(vehicle, centre) <= radius));
  }
  const some = T.islesVehiclesAtV1(network, time, {x: centre.x, z: centre.z, radius: 4000});
  assert.ok(some.length > 0 && some.length < all.length, some.length + ' sur ' + all.length);
  assert.equal(T.islesVehiclesAtV1(network, time, {x: centre.x, z: centre.z, radius: 1e6}).length, all.length);
});

test('the nearest stop lists its lines and when each one comes next', () => {
  const downtown = stopOf('4.1');
  for (const time of [0, 333, 4000.5, 90000]) {
    const found = T.islesNearestStopV1(network, downtown.x + 30, downtown.z - 20, time);
    assert.equal(found.stop.id, '4.1');
    assert.ok(Math.abs(found.distance - Math.hypot(30, 20)) < 1e-9);
    assert.deepEqual(found.stop.lines, living.lines.filter(line => line.stops.includes('4.1')).map(line => line.id));
    assert.deepEqual(found.departures, T.islesNextDeparturesV1(network, '4.1', time));
    assert.deepEqual(found.departures.map(item => item.lineId).sort(), [...found.stop.lines].sort());
    assert.deepEqual(found.departures.map(item => item.waitSeconds), found.departures.map(item => item.waitSeconds).sort((a, b) => a - b));
    for (const item of found.departures) {
      const line = lineOf(item.lineId), at = moment => T.islesVehiclesAtV1(network, moment).filter(vehicle => vehicle.lineId === item.lineId && vehicle.stopId === '4.1');
      assert.ok(item.waitSeconds >= 0 && item.waitSeconds <= line.roundSeconds && item.departsInSeconds > item.waitSeconds, item.lineId);
      assert.equal(at(time + item.waitSeconds + 0.01).length > 0, true, item.lineId + ' est à l’arrêt après l’attente annoncée');
      assert.ok(at(time + item.waitSeconds + 0.01).some(vehicle => vehicle.nextStopId === item.towards), item.lineId + ' va vers ' + item.towards);
      // Nothing of that line was at the stop just before, unless one is waiting there now.
      if (item.waitSeconds > 1) assert.equal(at(time + item.waitSeconds - 0.5).length, 0, item.lineId + ' : pas de passage plus tôt');
      assert.equal(at(time + item.departsInSeconds + 0.01).some(vehicle => vehicle.nextStopId === item.towards), false, item.lineId + ' est reparti');
    }
  }
  assert.deepEqual(T.islesNextDeparturesV1(network, 'nulle-part', 0), []);
  assert.equal(T.islesNearestStopV1({...network, stops: []}, 0, 0), null);
  const rig = stopOf('sea:sable-7');
  assert.equal(T.islesNearestStopV1(network, rig.x, rig.z).stop.id, rig.id);
});

test('the path of a line can be replaced, and its timetable follows', () => {
  const before = lineOf('B2'), stops = before.stopIds.map(stopOf);
  // A road that bends 300 m to the side between each pair of stops.
  const road = stops.flatMap((stop, index) => {
    const next = stops[index + 1];
    if (!next) return [{x: stop.x, z: stop.z}];
    const length = flat(stop, next), nx = (next.z - stop.z) / length, nz = -(next.x - stop.x) / length;
    return [{x: stop.x, z: stop.z}, {x: (stop.x + next.x) / 2 + nx * 300, z: (stop.z + next.z) / 2 + nz * 300}];
  });
  const changed = T.withIslesLinePathV1(network, 'B2', road), after = changed.lines.find(line => line.id === 'B2');
  assert.equal(lineOf('B2'), before, 'le réseau d’origine est intact');
  assert.equal(after.path.length, road.length);
  assert.ok(after.length > before.length + 50, after.length + ' m');
  assert.ok(after.legs.reduce((sum, leg) => sum + leg.travel, 0) > before.legs.reduce((sum, leg) => sum + leg.travel, 0));
  assert.equal(after.headwaySeconds * after.vehicles, after.roundSeconds);
  assert.equal(after.everyMinutes, before.everyMinutes);
  for (const line of changed.lines) if (line.id !== 'B2') assert.equal(line, lineOf(line.id));
  assert.deepEqual(changed.stops, network.stops);
  // The bus still calls at every stop, follows the bend, and never jumps at a corner of the road.
  after.legs.forEach(leg => {
    const waiting = vehicleAt('B2#1', leg.depart + leg.travel + 1, changed), stop = stopOf(after.stopIds[leg.to]);
    assert.equal(waiting.stopId, stop.id);
    assert.ok(flat(waiting, stop) < 0.01);
  });
  const leg = after.legs[0], middle = vehicleAt('B2#1', leg.depart + leg.travel / 2, changed);
  assert.ok(Math.abs(flat(middle, road[1])) < 1, 'le bus passe par le virage');
  let last = vehicleAt('B2#1', 0, changed);
  for (let time = STEP; time <= after.roundSeconds; time += STEP) {
    const now = vehicleAt('B2#1', time, changed);
    assert.ok(flat(now, last) <= specOf(after).speed * STEP * 1.05 + 0.01);
    assert.ok(Math.abs(Math.atan2(Math.sin(now.yaw - last.yaw), Math.cos(now.yaw - last.yaw))) < 0.6, 'pas de demi-tour instantané à ' + time + ' s');
    last = now;
  }
  assert.throws(() => T.withIslesLinePathV1(network, 'nulle-part', road), /nulle-part/);
  assert.throws(() => T.withIslesLinePathV1(network, 'B2', [road[0]]), /B2/);
});
