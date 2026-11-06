import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const {
  ARRIVAL_CLASSIC_SHIP_VIEWS, ARRIVAL_SHIP_MOTION_HULL, ARRIVAL_SHIP_MOTION_FAMILIES,
  arrivalShipMotionFrame, arrivalShipMotionAssetPaths,
  arrivalShipViewRegistration, arrivalShipViewPoint, arrivalShipViewSlots,
} = qa.load('app/game/systems/planetArrivalShipMotion.ts');
const { SHIP_IDS, shipProfileAssetPath } = qa.load('app/game/shipCatalogue.ts');
const { carrierArtForShip } = qa.load('app/game/systems/planetArrivalArt.ts');
const { ARRIVAL_ADDITIONAL_SHIP_MOTION_CALIBRATIONS } = qa.load('app/game/systems/planetArrivalShipMotionCalibrations.ts');
const { arrivalCarrierPose, arrivalInsertionShipPose, attachmentToStage } = qa.load('app/game/systems/planetArrivalSpatial.ts');
const { arrivalFormationSlots } = qa.load('app/game/systems/planetArrivalPresentation.ts');

const classic = ARRIVAL_SHIP_MOTION_HULL;
const original = carrierArtForShip(classic);
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b} (±${tolerance})`);
const sample = (time, method = 'ship', reduced = false, unavailable = []) =>
  arrivalShipMotionFrame(classic, time, method, reduced, unavailable);
const weights = frame => {
  const values = { [frame.from.path]: 1 - frame.mix };
  if (frame.to) values[frame.to.path] = (values[frame.to.path] ?? 0) + frame.mix;
  return values;
};
function sameVisibleFrame(a, b, tolerance = 1e-8) {
  const left = weights(a), right = weights(b);
  for (const path of new Set([...Object.keys(left), ...Object.keys(right)])) near(left[path] ?? 0, right[path] ?? 0, tolerance);
  for (const key of ['nose', 'tail', 'release', 'groundContact', 'groundExit']) {
    near(a.art[key].x, b.art[key].x, tolerance); near(a.art[key].y, b.art[key].y, tolerance);
  }
  for (const key of ['yawDeg', 'rollDeg', 'pitchDeg']) near(a.attitude[key], b.attitude[key], tolerance);
  near(a.pivot.x, b.pivot.x, tolerance); near(a.pivot.y, b.pivot.y, tolerance);
  for (const socket of a.exhaust) {
    const other = b.exhaust.find(next => next.id === socket.id);
    assert.ok(other, `The ${socket.id} nozzle must remain trackable across the transition.`);
    near(socket.visibility, other.visibility, tolerance);
    if (socket.visibility > 1e-6 && other.visibility > 1e-6) {
      near(socket.point.x, other.point.x, tolerance); near(socket.point.y, other.point.y, tolerance);
      near((socket.angle - other.angle + 540) % 360 - 180, 0, tolerance);
    }
  }
}

test('retained view slots preserve the exact active from/to weights and ordering for every supported family', () => {
  for (const [shipId, family] of Object.entries(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    for (const method of family.methods) {
      for (const time of [13_000, 14_230, 17_180, 20_080, 20_500, 21_080, 23_500, 24_480, 26_480, 43_500]) {
        const frame = arrivalShipMotionFrame(shipId, time, method);
        const slots = arrivalShipViewSlots(frame);
        const expected = [{ view: frame.from, opacity: 1 - frame.mix },
          ...(frame.to ? [{ view: frame.to, opacity: frame.mix }] : [])].filter(entry => entry.opacity > 0);
        assert.deepEqual(slots.filter(entry => entry.opacity > 0), expected);
        assert.deepEqual(slots.slice(0, expected.length), expected, 'The first DOM participant must remain the actual from view.');
        assert.equal(slots.length, family.paths.length + 1);
        assert.equal(new Set(slots.map(entry => entry.view.id)).size, slots.length);
        assert.deepEqual(new Set(slots.map(entry => entry.view.path)), new Set([shipProfileAssetPath(shipId), ...family.paths]));
        assert.ok(slots.slice(expected.length).every(entry => entry.opacity === 0));
      }
    }
  }
});

test('the same keyed shallow slot remains available through its inactive dorsal interval and native return', () => {
  for (const shipId of Object.keys(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    const sequence = [20_080, 20_500, 21_080].map(time => arrivalShipViewSlots(arrivalShipMotionFrame(shipId, time, 'pod')));
    const shallow = sequence.map(slots => slots.find(entry => entry.view.id === 'bank-dorsal-shallow'));
    assert.ok(shallow[0].opacity > 0 && shallow[1].opacity === 0 && shallow[2].opacity > 0);
    assert.equal(shallow[0].view, shallow[1].view);
    assert.equal(shallow[2].view, shallow[1].view);
    assert.deepEqual(sequence[2].filter(entry => entry.opacity > 0).map(entry => entry.view.id),
      ['bank-dorsal', 'bank-dorsal-shallow']);
  }
});

test('an unavailable or unsupported family never acquires hidden optional image slots', () => {
  for (const [shipId, family] of Object.entries(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    const unavailable = [family.paths[0]];
    for (const time of [14_230, 20_500, 23_500]) {
      const frame = arrivalShipMotionFrame(shipId, time, 'pod', false, unavailable);
      const slots = arrivalShipViewSlots(frame, unavailable);
      assert.equal(slots.length, 1);
      assert.equal(slots[0].view.path, shipProfileAssetPath(shipId));
      assert.equal(slots[0].opacity, 1);
    }
  }
  const unsupported = SHIP_IDS.find(shipId => !ARRIVAL_SHIP_MOTION_FAMILIES[shipId]);
  assert.equal(arrivalShipViewSlots(arrivalShipMotionFrame(unsupported, 20_500, 'pod')).length, 1);
});

test('the actual ship paint subtree exposes only participants to geometry, light, engine and optical consumers', () => {
  // Execute the production's pure JSX builders with real motion/art inputs.
  // This verifies element structure only; CI measures real DOM-node identity.
  const source = readFileSync(new URL('../app/game/PlanetArrivalCinematic.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('PlanetArrivalCinematic.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const builders = new Map();
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      ['layer', 'litLayer', 'shipLayer'].includes(node.name.text)) builders.set(node.name.text, node.initializer.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(builders.size, 3);
  const code = ts.transpileModule([...builders].map(([name, value]) => 'const ' + name + ' = ' + value + ';').join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = createRequire(import.meta.url);
  const { Fragment } = require('react');
  const { ARRIVAL_SPRITES } = qa.load('app/game/systems/planetArrivalArt.ts');
  const { arrivalLightGradient, arrivalLighting } = qa.load('app/game/systems/planetArrivalPresentation.ts');
  const { ARRIVAL_SHIP_ENGINE_ART, arrivalShipEngineAperture, arrivalShipEngineFrame } = qa.load('app/game/systems/planetArrivalShipEffects.ts');
  const descendants = (node, predicate) => {
    const found = [];
    const walk = value => {
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (!value?.props) return;
      if (predicate(value)) found.push(value);
      walk(value.props.children);
    };
    walk(node); return found;
  };
  const marked = (node, name) => descendants(node, value => value.props[name] !== undefined);
  for (const scenario of [
    { shipId: classic, time: 21_080 }, { shipId: classic, time: 26_800 },
    { shipId: 'avp-predator-mothership', time: 21_080 },
    { shipId: 'wolf-ship', time: 24_480, method: 'ship', cloak: true },
    { shipId: 'wolf-ship', time: 21_080, unavailable: true },
    { shipId: 'wolf-ship', time: 54_300, role: 'ground-ship', method: 'ship', cloak: true },
    { shipId: 'wolf-ship', time: 21_080, reduced: true },
  ]) {
    const { shipId, time, role = 'carrier', method = 'pod', cloak = false, reduced = false } = scenario;
    const unavailable = scenario.unavailable ? [arrivalShipMotionAssetPaths(shipId)[0]] : [];
    const frame = arrivalShipMotionFrame(shipId, time, method, reduced, unavailable);
    const art = carrierArtForShip(shipId), facing = art.nose.x < art.tail.x ? -1 : 1;
    const environment = {
      Fragment, styles: new Proxy({}, { get: (_object, name) => String(name) }),
      sources: { carrier: shipProfileAssetPath(shipId) }, failedAssets: [], unavailableShipViews: unavailable,
      motionReduced: reduced, shipMotion: frame, baseCarrierArt: art, baseCarrierFacing: facing,
      shipGround: { width: 550, height: 550 * art.height / art.width }, CARRIER_WIDTH: 550,
      carrierHeight: 550 * frame.art.height / frame.art.width, carrierFacing: facing, doorOpen: 0,
      lighting: arrivalLighting('jungle', 'carrier', time, reduced), arrivalLightGradient, ARRIVAL_SPRITES,
      shipCloak: { requested: cloak, strength: cloak ? 1 : 0, hullOpacity: .2, refractionOpacity: .8, rimOpacity: .5 },
      shipEngine: arrivalShipEngineFrame(time, method, reduced, cloak ? 1 : 0),
      ARRIVAL_SHIP_ENGINE_ART, arrivalShipEngineAperture, arrivalShipViewRegistration, arrivalShipViewSlots,
      cloakFilterId: 'structure-only', assetFailed: () => { throw Error('No image events execute in this structural test.'); },
    };
    const render = new Function('require', 'exports', 'environment',
      'const {' + Object.keys(environment).join(',') + '} = environment;\n' + code + '\nreturn shipLayer;')(require, {}, environment);
    const element = render(role, 0);
    const active = marked(element, 'data-arrival-ship-view-layer');
    const inactive = marked(element, 'data-arrival-retained-view');
    const expectedIds = role === 'ground-ship' ? ['profile'] :
      [{ view: frame.from, opacity: 1 - frame.mix }, ...(frame.to ? [{ view: frame.to, opacity: frame.mix }] : [])]
        .filter(entry => entry.opacity > 0).map(entry => entry.view.id);
    assert.deepEqual(active.map(node => node.props['data-arrival-ship-view-layer']), expectedIds);
    for (const node of inactive) {
      assert.equal(node.props.style.opacity, 0);
      assert.equal(node.props['data-arrival-ship-view-layer'], undefined);
      assert.equal(marked(node, 'data-arrival-lit').length, 0);
      assert.equal(marked(node, 'data-arrival-light-source').length, 0);
      assert.equal(marked(node, 'data-arrival-engine').length, 0);
      const images = descendants(node, child => child.type === 'img');
      assert.equal(images.length, 1);
      assert.equal(images[0].props.src, node.props['data-arrival-ship-view-path']);
    }
    const activePaths = active.map(node => node.props['data-arrival-ship-view-path']);
    assert.deepEqual(marked(element, 'data-arrival-light-source').map(node => node.props['data-arrival-light-source']), activePaths);
    assert.ok(marked(element, 'data-arrival-engine').every(node => expectedIds.includes(node.props['data-arrival-engine-view'])));
    assert.deepEqual(marked(element, 'data-arrival-cloak-rim').map(node => node.props['data-arrival-cloak-rim']), cloak ? activePaths : []);
    assert.deepEqual(marked(element, 'data-arrival-cloak-refraction').map(node => node.props['data-arrival-cloak-refraction']), cloak ? activePaths : []);
    if (role === 'ground-ship' || reduced || scenario.unavailable) {
      assert.equal(inactive.length, 0);
      assert.ok(descendants(element, node => node.type === 'img').every(node => node.props.src === shipProfileAssetPath(shipId)));
    } else {
      assert.equal(active.length + inactive.length, arrivalShipMotionAssetPaths(shipId).length + 1);
      assert.equal(new Set([...active, ...inactive].map(node => node.key)).size, active.length + inactive.length);
    }
  }
});

test('each optional view belongs to this hull and has usable full-canvas geometry, without reusing the inconsistent top image', () => {
  const paths = arrivalShipMotionAssetPaths(classic);
  assert.equal(paths.length, 8);
  assert.equal(new Set(paths).size, 8);
  assert.ok(paths.every(path => path.startsWith('/game/planet-arrival/ship-motion-v1/classic-') && path.endsWith('.webp')));
  for (const view of Object.values(ARRIVAL_CLASSIC_SHIP_VIEWS)) {
    assert.equal(view.shipId, classic);
    assert.ok(paths.includes(view.path));
    assert.equal(view.art.width, 1536); assert.equal(view.art.height, 1024);
    assert.ok(view.art.nose.x < view.art.tail.x, 'Every source keeps the same nose-left convention.');
    assert.ok(view.projectedHullSpan > .2 && view.projectedHullSpan < 1);
    for (const point of [view.art.nose, view.art.tail, view.art.release, view.pivot, ...view.exhaust.map(socket => socket.point)]) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
    }
    assert.equal(view.attitudeBasis, 'authored-camera-target');
    if (view.calibration === 'pending-measurement') assert.equal(view.art.review, 'unreviewed');
    for (const socket of view.exhaust) if (socket.review === 'unreviewed') assert.equal(socket.visibility, 0);
  }
});

test('all three real pod launches keep the exact profile release socket and original world-space launch origin', () => {
  const facing = original.nose.x < original.tail.x ? -1 : 1;
  const heading = Math.atan2((original.nose.y - original.tail.y) * original.height,
    (original.nose.x - original.tail.x) * facing * original.width) * 180 / Math.PI;
  const releasePosition = (art, pose) => attachmentToStage({ ...pose, angle: pose.angle - heading },
    (art.release.x - .5) * 600 * facing, (art.release.y - .5) * 600 * art.height / art.width);
  for (const slot of arrivalFormationSlots('triad')) {
    const time = 23_000 + slot.delayMs;
    const frame = sample(time, 'pod');
    assert.equal(frame.from.path, shipProfileAssetPath(classic));
    assert.equal(frame.to, null);
    assert.deepEqual(frame.art, original);
    const pose = arrivalCarrierPose('release', slot.delayMs / 8_000);
    assert.deepEqual(releasePosition(frame.art, pose), releasePosition(original, pose));
  }
  for (let time = 22_400; time <= 24_200; time += 20) {
    for (const method of ['pod', 'ship']) {
      const frame = sample(time, method);
      assert.equal(frame.from.id, 'profile'); assert.equal(frame.to, null);
      assert.deepEqual(frame.art, original);
    }
  }
});

test('shot labels at23s and31s cannot reset the frame mix, camera attitude or attachment geometry', () => {
  for (const method of ['pod', 'ship']) {
    for (const boundary of [23_000, 31_000]) {
      sameVisibleFrame(sample(boundary - .001, method), sample(boundary + .001, method));
    }
  }
  assert.equal(sample(30_999, 'ship').from.id, 'bank-ventral');
  assert.equal(sample(31_001, 'ship').from.id, 'bank-ventral');
  assert.equal(sample(30_999, 'pod').from.id, 'rear-quarter');
  assert.equal(sample(31_001, 'pod').from.id, 'rear-quarter');
});

test('the original profile is restored before the surface cut and remains unchanged through contact, egress and handoff', () => {
  for (const method of ['pod', 'ship']) {
    for (const time of [49_000, 50_000, 53_960, 57_000, 60_000, 61_999, 62_000, 1e12]) {
      const frame = sample(time, method);
      assert.equal(frame.from.path, shipProfileAssetPath(classic));
      assert.equal(frame.to, null); assert.equal(frame.mix, 0);
      assert.deepEqual(frame.art, original);
      assert.deepEqual(frame.pivot, { x: .5, y: .5 });
    }
  }
  sameVisibleFrame(sample(48_999, 'ship'), sample(49_001, 'ship'));
});

test('reduced motion holds the complete original view without a rotating bank or an opacity blend at every sampled time', () => {
  for (let time = 0; time <= 62_000; time += 125) {
    for (const method of ['pod', 'ship']) {
      const frame = sample(time, method, true);
      assert.equal(frame.from.id, 'profile'); assert.equal(frame.to, null); assert.equal(frame.mix, 0);
      assert.deepEqual(frame.art, original);
      assert.deepEqual(frame.attitude, { yawDeg: 0, rollDeg: 0, pitchDeg: 0 });
    }
  }
});

test('every unregistered catalogue identity uses only its own calibrated profile, including project-original V12 and canonical V14 hulls', () => {
  for (const shipId of SHIP_IDS.filter(id => !ARRIVAL_SHIP_MOTION_FAMILIES[id])) {
    assert.deepEqual(arrivalShipMotionAssetPaths(shipId), []);
    for (const time of [14_000, 20_080, 24_480, 27_000, 34_880, 44_080, 53_960, 62_000]) {
      const frame = arrivalShipMotionFrame(shipId, time, 'ship');
      assert.equal(frame.from.shipId, shipId);
      assert.equal(frame.from.path, shipProfileAssetPath(shipId));
      assert.deepEqual(frame.art, carrierArtForShip(shipId));
      assert.equal(frame.to, null); assert.equal(frame.fallback, true);
      assert.ok(!arrivalShipMotionAssetPaths(classic).includes(frame.from.path));
    }
  }
});

test('the approved fleet extension contains all six selected hulls and exactly forty-six views', () => {
  const expected = ['avp-predator-mothership', 'avpr-scout-ship', 'wolf-ship',
    'fugitive-spaceship', 'upgrade-spaceship', 'feral-spaceship'];
  const registered = Object.keys(ARRIVAL_SHIP_MOTION_FAMILIES).filter(id => id !== classic);
  assert.deepEqual(registered.sort(), expected.sort(), 'An omitted fleet family cannot silently reduce the delivery scope.');
  assert.equal(registered.reduce((count, id) => count + arrivalShipMotionAssetPaths(id).length, 0), 46);
});

test('inspected additional families expose exactly their consumed views and never borrow another hull or engine', () => {
  const allowed = new Map([
    ['avp-predator-mothership', ['pod']], ['avpr-scout-ship', ['pod', 'ship']],
    ['wolf-ship', ['pod', 'ship']], ['fugitive-spaceship', ['pod', 'ship']],
    ['upgrade-spaceship', ['pod', 'ship']], ['feral-spaceship', ['pod', 'ship']],
  ]);
  const registered = Object.keys(ARRIVAL_SHIP_MOTION_FAMILIES).filter(id => id !== classic);
  assert.deepEqual(registered, Object.keys(ARRIVAL_ADDITIONAL_SHIP_MOTION_CALIBRATIONS),
    'An approved table must be complete and compatible; silently rejected registrations cannot pass.');
  const paths = new Set(arrivalShipMotionAssetPaths(classic));
  for (const shipId of registered) {
    assert.ok(allowed.has(shipId));
    const family = ARRIVAL_SHIP_MOTION_FAMILIES[shipId];
    assert.deepEqual(family.methods, allowed.get(shipId));
    const expected = ['forward-quarter', 'forward-quarter-shallow', 'bank-dorsal', 'bank-dorsal-shallow',
      'rear-quarter-shallow', 'rear-quarter', ...(family.methods.includes('ship') ? ['bank-ventral', 'bank-ventral-shallow'] : [])];
    assert.deepEqual(Object.keys(family.views).sort(), expected.sort());
    assert.equal(arrivalShipMotionAssetPaths(shipId).length, expected.length);
    assert.ok(family.sourceReview);
    const profile = carrierArtForShip(shipId);
    for (const view of Object.values(family.views)) {
      assert.equal(view.shipId, shipId);
      assert.ok(view.path.startsWith(`/game/planet-arrival/ship-motion-fleet-v1/${shipId}/`));
      assert.ok(!paths.has(view.path), 'Different hulls must not share a perspective sprite.');
      paths.add(view.path);
      assert.equal(view.calibration, 'inspected-source-art');
      assert.equal(view.art.review, 'inspected-source-art');
      assert.ok(view.art.width > 0 && view.art.height > 0);
      assert.equal(Math.sign(view.art.nose.x - view.art.tail.x), Math.sign(profile.nose.x - profile.tail.x));
      for (const point of [view.art.nose, view.art.tail, view.art.release, view.pivot]) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
      }
      assert.ok(view.exhaust.every(socket => socket.visibility === 0 && socket.review === 'unreviewed'));
    }
  }
});

test('additional-family calibration dimensions match the actual unresized transparent runtime canvases', async () => {
  for (const [shipId, family] of Object.entries(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    if (shipId === classic) continue;
    for (const view of Object.values(family.views)) {
      const metadata = await sharp(`public${view.path}`).metadata();
      assert.equal(metadata.format, 'webp'); assert.equal(metadata.hasAlpha, true);
      assert.deepEqual([metadata.width, metadata.height], [view.art.width, view.art.height],
        `${shipId}/${view.id}: the aspect correction must use the real decoded source dimensions.`);
    }
  }
});

test('additional families preserve launch, landing, unsupported methods and complete-family fallback', () => {
  for (const [shipId, family] of Object.entries(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    if (shipId === classic) continue;
    const profile = carrierArtForShip(shipId);
    const isProfile = frame => {
      assert.equal(frame.from.path, shipProfileAssetPath(shipId));
      assert.equal(frame.to, null); assert.equal(frame.mix, 0);
      assert.deepEqual(frame.art, profile); assert.deepEqual(frame.pivot, { x: .5, y: .5 });
    };
    for (const method of ['pod', 'ship']) {
      for (const time of [0, 12_999, 22_400, 23_000, 23_860, 24_200, 49_000, 53_960, 57_000, 62_000]) {
        isProfile(arrivalShipMotionFrame(shipId, time, method));
      }
      for (const time of [14_000, 15_280, 20_080, 24_480, 26_480, 34_880, 44_080]) {
        const frame = arrivalShipMotionFrame(shipId, time, method);
        assert.equal(frame.from.shipId, shipId);
        assert.ok(frame.exhaust.every(socket => socket.visibility === 0));
        isProfile(arrivalShipMotionFrame(shipId, time, method, true));
        if (!family.methods.includes(method)) { isProfile(frame); assert.equal(frame.fallback, true); }
        for (const path of family.paths) isProfile(arrivalShipMotionFrame(shipId, time, method, false, [path]));
        assert.deepEqual(arrivalShipMotionFrame(shipId, time, method, false, ['/unrelated.webp']), frame);
      }
      for (const boundary of [23_000, 31_000, ...(method === 'ship' ? [49_000] : [])]) {
        sameVisibleFrame(arrivalShipMotionFrame(shipId, boundary - .001, method),
          arrivalShipMotionFrame(shipId, boundary + .001, method));
      }
    }
  }
});

test('a failed or still-loading optional frame returns the whole selected hull, without a half-opacity silhouette', () => {
  const allOptional = arrivalShipMotionAssetPaths(classic);
  for (const method of ['pod', 'ship']) {
    for (const time of [14_000, 15_280, 18_880, 20_080, 21_080, 24_480, 26_480, 34_880, 44_080]) {
      const intended = sample(time, method);
      const paths = [intended.from.path, intended.to?.path].filter(path => allOptional.includes(path));
      for (const path of paths) {
        const frame = sample(time, method, false, [path]);
        assert.equal(frame.from.path, shipProfileAssetPath(classic));
        assert.equal(frame.to, null); assert.equal(frame.mix, 0); assert.equal(frame.fallback, true);
        assert.deepEqual(frame.art, original);
      }
      assert.deepEqual(sample(time, method, false, ['/unrelated-failed-image.webp']), intended);
    }
  }
  const atRelease = sample(23_000, 'pod', false, allOptional);
  assert.equal(atRelease.from.id, 'profile'); assert.equal(atRelease.fallback, false);
});

test('one missing intermediate view keeps the entire sequence on its original profile instead of popping to later available angles', () => {
  for (const missing of arrivalShipMotionAssetPaths(classic)) {
    for (const method of ['pod', 'ship']) {
      for (let time = 0; time <= 62_000; time += 100) {
        const frame = sample(time, method, false, [missing]);
        assert.equal(frame.from.id, 'profile', `${missing} must disable the family at ${time}ms.`);
        assert.equal(frame.to, null); assert.equal(frame.mix, 0);
        assert.deepEqual(frame.art, original);
        assert.deepEqual(frame.pivot, { x: .5, y: .5 });
      }
    }
  }
});

test('view changes only blend neighboring camera angles with finite continuous sockets and unchanged aspect ratio', () => {
  let transitions = 0;
  for (const method of ['pod', 'ship']) {
    for (let time = 13_000; time < 49_000; time += 20) {
      const frame = sample(time, method);
      assert.ok(frame.mix >= 0 && frame.mix <= 1);
      near(Object.values(weights(frame)).reduce((sum, weight) => sum + weight, 0), 1);
      assert.equal(frame.art.width, 1536); assert.equal(frame.art.height, 1024);
      assert.ok(frame.art.nose.x < frame.art.tail.x, 'The view sequence must not reverse travel direction.');
      for (const socket of [frame.art.nose, frame.art.tail, frame.art.release, frame.pivot]) {
        assert.ok(Number.isFinite(socket.x) && Number.isFinite(socket.y));
      }
      if (!frame.to) continue;
      transitions++;
      assert.ok(Math.abs(frame.from.attitude.yawDeg - frame.to.attitude.yawDeg) <= 14);
      assert.ok(Math.abs(frame.from.attitude.rollDeg - frame.to.attitude.rollDeg) <= 12);
      assert.ok(!(frame.from.attitude.yawDeg && frame.to.attitude.rollDeg) &&
        !(frame.from.attitude.rollDeg && frame.to.attitude.yawDeg), 'Direction families must meet through the profile.');
      // A14° smoothstep over160ms moves at most0.000263° in this0.002ms interval.
      sameVisibleFrame(sample(time - .001, method), sample(time + .001, method), .0003);
    }
  }
  assert.ok(transitions > 50, 'The check must actually visit the short transitions.');
});

test('registration matches a known quarter-turn and uniform resize on a rectangular canvas with an off-center pivot', () => {
  const view = { ...ARRIVAL_CLASSIC_SHIP_VIEWS['forward-quarter'], pivot: { x: .3, y: .6 },
    art: { ...original, width: 200, height: 100, nose: { x: .25, y: .5 }, tail: { x: .75, y: .5 } } };
  const frame = { art: { ...view.art, nose: { x: .5, y: .25 }, tail: { x: .5, y: .75 } } };
  const transform = arrivalShipViewRegistration(frame, view);
  near(transform.rotationDeg, 90); near(transform.scale, .5);
  for (const [point, expected] of [
    [{ x: .25, y: .5 }, { x: .5, y: .25 }],
    [{ x: .75, y: .5 }, { x: .5, y: .75 }],
    [{ x: .5, y: .5 }, { x: .5, y: .5 }],
    [{ x: .5, y: .8 }, { x: .425, y: .5 }],
  ]) {
    const actual = arrivalShipViewPoint(frame, view, point);
    near(actual.x, expected.x); near(actual.y, expected.y);
  }
});

test('different native canvases preserve every pixel direction and length ratio after the CSS canvas stretch is cancelled', () => {
  const view = { ...ARRIVAL_CLASSIC_SHIP_VIEWS['forward-quarter'], pivot: { x: .3, y: .6 },
    art: { ...original, width: 1200, height: 600, nose: { x: .25, y: .5 }, tail: { x: .75, y: .5 } } };
  const frame = { art: { ...view.art, width: 1500, height: 1500,
    nose: { x: .5, y: .25 }, tail: { x: .5, y: .75 } } };
  const transform = arrivalShipViewRegistration(frame, view);
  assert.deepEqual(transform.sourceScale, { x: .8, y: .4 });
  near(transform.rotationDeg, 90); near(transform.scale, 1.25);
  const transformed = point => {
    const p = arrivalShipViewPoint(frame, view, point);
    return { x: p.x * frame.art.width, y: p.y * frame.art.height };
  };
  const center = transformed({ x: .5, y: .5 });
  const nativeX = transformed({ x: .5 + 1 / view.art.width, y: .5 });
  const nativeY = transformed({ x: .5, y: .5 + 1 / view.art.height });
  const x = { x: nativeX.x - center.x, y: nativeX.y - center.y };
  const y = { x: nativeY.x - center.x, y: nativeY.y - center.y };
  near(Math.hypot(x.x, x.y), 1.25); near(Math.hypot(y.x, y.y), 1.25);
  near(x.x * y.x + x.y * y.y, 0);
  near(x.x * y.y - x.y * y.x, 1.25 ** 2);
  for (const point of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: .5, y: .8 }]) {
    // Independent affine prediction from two orthogonal one-source-pixel
    // vectors covers corners and an interior point, not just nose/tail anchors.
    const expected = { x: center.x + x.x * (point.x - .5) * view.art.width + y.x * (point.y - .5) * view.art.height,
      y: center.y + x.y * (point.x - .5) * view.art.width + y.y * (point.y - .5) * view.art.height };
    const actual = transformed(point);
    near(actual.x, expected.x); near(actual.y, expected.y);
  }
  const below = arrivalShipViewPoint(frame, view, { x: .5, y: .8 });
  near(below.x, .35); near(below.y, .5);
  assert.deepEqual(arrivalShipViewRegistration({ art: view.art }, view),
    { translateX: 0, translateY: 0, rotationDeg: 0, scale: 1 });
});

test('additional-family dissolves align the painted axes and stay isotropic through profile-to-native-canvas changes', () => {
  for (const [shipId, family] of Object.entries(ARRIVAL_SHIP_MOTION_FAMILIES)) {
    if (shipId === classic) continue;
    for (const method of family.methods) {
      let transitions = 0;
      for (let time = 13_000; time < 49_000; time += 40) {
        const frame = arrivalShipMotionFrame(shipId, time, method);
        for (const view of [frame.from, frame.to].filter(Boolean)) {
          const registration = arrivalShipViewRegistration(frame, view);
          for (const key of ['translateX', 'translateY', 'rotationDeg', 'scale']) assert.ok(Number.isFinite(registration[key]));
          assert.ok(registration.scale > 0);
          for (const name of ['nose', 'tail']) {
            const point = arrivalShipViewPoint(frame, view, view.art[name]);
            near(point.x, frame.art[name].x); near(point.y, frame.art[name].y);
          }
          const measured = point => {
            const p = arrivalShipViewPoint(frame, view, point);
            return [p.x * frame.art.width, p.y * frame.art.height];
          };
          const origin = measured(view.pivot);
          const px = measured({ x: view.pivot.x + 1 / view.art.width, y: view.pivot.y });
          const py = measured({ x: view.pivot.x, y: view.pivot.y + 1 / view.art.height });
          const x = px.map((value, index) => value - origin[index]);
          const y = py.map((value, index) => value - origin[index]);
          near(Math.hypot(...x), Math.hypot(...y)); near(x[0] * y[0] + x[1] * y[1], 0);
        }
        if (!frame.to) continue;
        transitions++;
        sameVisibleFrame(arrivalShipMotionFrame(shipId, time - .001, method),
          arrivalShipMotionFrame(shipId, time + .001, method), .0003);
      }
      assert.ok(transitions > 0, `${shipId}/${method} must exercise its real registered dissolves.`);
    }
  }
});

test('every painted view shares the same registered nose and tail throughout a transition, with attachments following the paint', () => {
  let compared = 0;
  for (const method of ['pod', 'ship']) {
    for (let time = 13_000; time <= 49_000; time += 20) {
      const frame = sample(time, method);
      for (const view of [frame.from, frame.to].filter(Boolean)) {
        const registration = arrivalShipViewRegistration(frame, view);
        for (const value of Object.values(registration)) assert.ok(Number.isFinite(value));
        assert.ok(registration.scale > .9 && registration.scale < 1.1, 'Adjacent views must not need a large compensating resize.');
        for (const key of ['nose', 'tail']) {
          const point = arrivalShipViewPoint(frame, view, view.art[key]);
          near(point.x, frame.art[key].x); near(point.y, frame.art[key].y);
        }
      }
      if (!frame.to) {
        assert.deepEqual(arrivalShipViewRegistration(frame, frame.from), { translateX: 0, translateY: 0, rotationDeg: 0, scale: 1 });
        continue;
      }
      compared++;
      for (const key of ['release', 'groundContact', 'groundExit']) {
        const source = arrivalShipViewPoint(frame, frame.from, frame.from.art[key]);
        const target = arrivalShipViewPoint(frame, frame.to, frame.to.art[key]);
        near(frame.art[key].x, source.x * (1 - frame.mix) + target.x * frame.mix);
        near(frame.art[key].y, source.y * (1 - frame.mix) + target.y * frame.mix);
      }
    }
  }
  assert.ok(compared > 50);
});

test('the engine becomes visible only with an inspected rear chamber and stays on that registered chamber as it fades in', () => {
  const visibleViews = Object.values(ARRIVAL_CLASSIC_SHIP_VIEWS)
    .filter(view => view.exhaust.some(socket => socket.visibility > 0)).map(view => view.id);
  assert.deepEqual(visibleViews, ['rear-quarter-shallow', 'rear-quarter']);
  for (let time = 13_000; time <= 62_000; time += 100) {
    assert.ok(sample(time, 'ship').exhaust.every(socket => socket.visibility === 0));
  }
  assert.equal(sample(24_399, 'pod').exhaust[0].visibility, 0);
  for (const time of [24_410, 24_440, 24_480, 24_520, 24_550]) {
    const frame = sample(time, 'pod');
    const socket = frame.exhaust[0], target = frame.to.exhaust[0];
    const point = arrivalShipViewPoint(frame, frame.to, target.point);
    near(socket.visibility, frame.mix);
    near(socket.point.x, point.x); near(socket.point.y, point.y);
    near(socket.angle, target.angle + arrivalShipViewRegistration(frame, frame.to).rotationDeg);
    assert.notDeepEqual(target.point, frame.to.art.tail, 'The chamber center must not be replaced by the outer hull edge.');
  }
  for (const boundary of [24_400, 24_560, 26_400, 26_560]) {
    sameVisibleFrame(sample(boundary - .001, 'pod'), sample(boundary + .001, 'pod'), .0003);
  }
});

test('screen-space travel still follows the existing paths while per-view anchors preserve forward orientation', () => {
  for (const method of ['pod', 'ship']) {
    for (const [shot, start, duration] of [['carrier', 13_000, 10_000], ['release', 23_000, 8_000], ['descent', 31_000, 10_000], ['atmosphere', 41_000, 8_000]]) {
      if (method === 'pod' && !['carrier', 'release'].includes(shot)) continue;
      for (const p of [.01, .22, .5, .76, .99]) {
        const frame = sample(start + duration * p, method);
        const pose = method === 'ship' ? arrivalInsertionShipPose(shot, p) : arrivalCarrierPose(shot, p);
        const art = frame.art, facing = art.nose.x < art.tail.x ? -1 : 1;
        const heading = Math.atan2((art.nose.y - art.tail.y) * art.height,
          (art.nose.x - art.tail.x) * art.width * facing) * 180 / Math.PI;
        const transform = { ...pose, angle: pose.angle - heading };
        const projected = point => attachmentToStage(transform,
          (point.x - frame.pivot.x) * 600 * facing, (point.y - frame.pivot.y) * 600 * art.height / art.width);
        const nose = projected(art.nose), tail = projected(art.tail);
        const radians = pose.angle * Math.PI / 180;
        assert.ok((nose.x - tail.x) * Math.cos(radians) + (nose.y - tail.y) * Math.sin(radians) > 0);
      }
    }
  }
});

test('pause, replay, rewind and malformed elapsed values cannot introduce a second or accumulating clock', () => {
  for (const method of ['pod', 'ship']) {
    const pausedTime = 26_280;
    const paused = sample(pausedTime, method);
    for (const otherTime of [62_000, 14_000, 44_080, 0, 24_480, 26_280]) {
      sample(otherTime, method);
      assert.deepEqual(sample(pausedTime, method), paused);
    }
    for (const badTime of [NaN, Infinity, -Infinity, -100]) {
      assert.deepEqual(sample(badTime, method), sample(0, method));
    }
  }
});
