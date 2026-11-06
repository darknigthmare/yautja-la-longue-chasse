import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real recipe functions, without importing its browser/server entry
// point. The protocol double evaluates the exact source compiled for Chromium.
const source = readFileSync(new URL('../scripts/qa-planet-arrival-spatial.mjs', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('spatial.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['observeMoment', 'cdpObservationError', 'prepareCdpMomentReader', 'readMoment']);
const declarations = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text));
assert.equal(declarations.length, names.size);
const functions = vm.runInNewContext(declarations.map(node => node.getText(parsed)).join('\n') +
  '\n({ observeMoment, prepareCdpMomentReader, readMoment })');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const box = (x, y, width = 20, height = 30) => ({ x, y, right: x + width, bottom: y + height });
  const element = (attributes, bounds, children = []) => ({
    attributes: { ...attributes }, children, style: {}, isConnected: true,
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    getBoundingClientRect: () => bounds,
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  const scene = element({ 'data-arrival-ship': 'classic-predator-spaceship',
    'data-arrival-cloak-phase': 'off', 'data-arrival-contact': 'true' }, box(20, 140, 1400, 660));
  const stage = element({}, box(130, 140, 1170, 660));
  const members = ['player', 'karhek', 'saketh'].map((id, index) => {
    const layer = element({}, box(300 + index * 150, 600));
    const member = element({ 'data-arrival-member': id, 'data-arrival-hunter-stage': 'standing',
      'data-arrival-hunter-contact': 'ground', 'data-arrival-hunter-portal': 'clear' },
    box(300 + index * 150, 600), [layer]);
    member.querySelectorAll = selector => selector === 'img, svg, image' ? [layer] : [];
    return member;
  });
  const supports = members.flatMap((member, index) => ['hunter-feet', 'hunter-support'].map(suffix =>
    element({ 'data-arrival-anchor': (index ? member.attributes['data-arrival-member'] + '-' : '') + suffix },
      box(310 + index * 150, 630, 0, 0))));
  const markerIds = ['tl', 'tr', 'bl', 'br'];
  const markers = markerIds.map((id, index) => element({ 'data-spatial-x11-marker': id,
    'data-spatial-x11-nonce': 'calibration-nonce' }, box(index % 2 ? 1436 : 0, index > 1 ? 992 : 0, 4, 8),
  Array.from({ length: 32 }, () => ({ style: {} }))));
  const button = element({ 'aria-label': 'Pause' }, box(1100, 800));
  Object.assign(button, { tagName: 'BUTTON', id: '', textContent: 'Pause' });
  const root = element({ 'data-arrival-run': 'native-run', 'data-arrival-elapsed-exact': '61766.7',
    'data-arrival-shot': 'egress', 'data-arrival-status': 'playing', 'data-arrival-method': 'ship',
    'data-arrival-team': 'triad', 'data-arrival-ship-cloak': 'false' }, box(20, 20, 1400, 880));
  root.contains = target => target === button;
  root.querySelector = selector => ({ '[data-arrival-scene]': scene, '[data-arrival-stage]': stage })[selector] ?? null;
  root.querySelectorAll = selector => {
    if (selector === '[data-arrival-hunter]') return members;
    if (selector === '[data-arrival-anchor$="hunter-feet"], [data-arrival-anchor$="hunter-support"]') return supports;
    return [];
  };
  const document = {
    visibilityState: 'visible', activeElement: button,
    documentElement: { clientWidth: 1440, clientHeight: 1000 }, hasFocus: () => true,
    querySelectorAll: selector => selector === '[data-arrival-run]' ? [root]
      : selector === '[data-spatial-x11-marker]' ? markers : [],
    querySelector: selector => markers.find(marker => selector === `[data-spatial-x11-marker="${marker.attributes['data-spatial-x11-marker']}"]`) ?? null,
  };
  let observer;
  class MutationObserver {
    constructor(inspect) { this.inspect = inspect; }
    observe() { observer = this.inspect; }
    disconnect() { if (observer === this.inspect) observer = null; }
  }
  const window = {}; window.top = window;
  const context = vm.createContext({ document, window, MutationObserver, performance, setTimeout, clearTimeout,
    getComputedStyle: () => ({ opacity: '1', position: 'fixed' }),
    innerWidth: 1440, innerHeight: 1000, devicePixelRatio: 1, scrollX: 0, scrollY: 0,
    screen: { width: 1440, height: 1000, orientation: { angle: 0, type: 'landscape-primary' } },
    visualViewport: { offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0, width: 1440, height: 1000, scale: 1 },
  });
  const calls = [], handles = new Map();
  const session = { async send(method, params) {
    calls.push({ method, params });
    try {
      if (method === 'Runtime.evaluate') {
        const compiled = vm.runInContext(params.expression, context);
        const objectId = `function-${handles.size + 1}`; handles.set(objectId, compiled);
        return { result: { type: typeof compiled, objectId } };
      }
      assert.equal(method, 'Runtime.callFunctionOn');
      const invoke = vm.runInContext(`(${params.functionDeclaration})`, context);
      const result = await invoke.apply(handles.get(params.objectId), params.arguments.map(arg => clone(arg.value)));
      return { result: { type: typeof result, value: clone(result) } };
    } catch (error) {
      return { exceptionDetails: { text: 'Uncaught', exception: { className: error.name, description: error.stack } } };
    }
  } };
  const target = { evaluate: (fn, options) => vm.runInContext(`(${fn.toString()})`, context)(options) };
  return { root, members, markers, document, calls, session, target, mutate: () => observer?.() };
}

function comparable(moment) {
  const { observationTiming, ...fields } = moment;
  assert.equal(observationTiming.clock, 'browser performance.now()');
  assert.ok(observationTiming.finishedAtMs >= observationTiming.readStartedAtMs);
  assert.ok(observationTiming.readMs >= 0);
  return { ...clone(fields), boxReads: observationTiming.boxReads };
}

test('precompiled CDP uses the exact observer and preserves every normal scene, formation and optical field', async () => {
  for (const region of ['scene', 'formation-detail', 'optical-full-viewport']) {
    const direct = fixture(), playwright = fixture();
    const reader = await functions.prepareCdpMomentReader(direct.session);
    const first = await functions.readMoment(direct.target, region, undefined, undefined, reader);
    const reference = await functions.readMoment(playwright.target, region);
    assert.deepEqual(comparable(first), comparable(reference));
    await functions.readMoment(direct.target, region, undefined, undefined, reader);
    assert.deepEqual(direct.calls.map(call => call.method),
      ['Runtime.evaluate', 'Runtime.callFunctionOn', 'Runtime.callFunctionOn']);
    assert.equal(direct.calls[0].params.expression, `(${functions.observeMoment.toString()})`);
    for (const call of direct.calls.slice(1)) {
      assert.equal(call.params.objectId, 'function-1');
      assert.equal(call.params.awaitPromise, true);
      assert.equal(call.params.returnByValue, true);
    }
  }
});

test('the shared observer keeps four fresh paint markers and rejects reused paint through both transports', async () => {
  const paint = { nonce: 'fresh-unique-nonce', markers: ['tl', 'tr', 'bl', 'br'].map(id =>
    ({ id, rgb: Array.from({ length: 96 }, (_, index) => index % 256) })) };
  const observations = [];
  for (const direct of [false, true]) {
    const f = fixture(), reader = direct ? await functions.prepareCdpMomentReader(f.session) : undefined;
    const read = () => functions.readMoment(f.target, 'formation-detail', undefined, paint, reader);
    const observation = await read();
    assert.equal(observation.markerPaint.nonce, paint.nonce); assert.equal(observation.markerPaint.count, 4);
    const { markerPaint, ...stable } = comparable(observation);
    assert.ok(Number.isFinite(markerPaint.paintedAtMs)); observations.push(stable);
    for (const marker of f.markers) {
      assert.equal(marker.attributes['data-spatial-x11-nonce'], paint.nonce);
      assert.equal(marker.children.length, 32);
      assert.equal(marker.children[31].style.backgroundColor, 'rgb(93,94,95)');
    }
    await assert.rejects(read, { name: 'Error', message: 'The final paint marker is missing or its nonce was already used.' });
  }
  assert.deepEqual(observations[0], observations[1]);
});

test('both transports await the real third standing member and still expose a completed after-read', async () => {
  for (const direct of [false, true]) {
    const f = fixture(), reader = direct ? await functions.prepareCdpMomentReader(f.session) : undefined;
    f.root.attributes['data-arrival-elapsed-exact'] = '61700';
    f.members[2].attributes['data-arrival-hunter-stage'] = 'walking';
    let resolved = false;
    const pending = functions.readMoment(f.target, 'formation-detail', { atMs: 61750, shot: 'egress' }, undefined, reader)
      .then(value => { resolved = true; return value; });
    f.root.attributes['data-arrival-elapsed-exact'] = '61750'; f.mutate();
    await Promise.resolve(); assert.equal(resolved, false);
    f.members[2].attributes['data-arrival-hunter-stage'] = 'standing'; f.mutate();
    const before = await pending;
    assert.equal(before.elapsedMs, 61750);
    assert.ok(before.members.every(member => member.stage === 'standing'));
    f.root.attributes['data-arrival-elapsed-exact'] = '62000';
    f.root.attributes['data-arrival-status'] = 'complete';
    const after = await functions.readMoment(f.target, 'formation-detail', undefined, undefined, reader);
    assert.equal(after.status, 'complete'); assert.equal(after.elapsedMs, 62000);
  }
});

test('missing roots and rejected scheduled observations retain their exact error through both transports', async () => {
  for (const direct of [false, true]) {
    const f = fixture(), reader = direct ? await functions.prepareCdpMomentReader(f.session) : undefined;
    const select = f.document.querySelectorAll;
    f.document.querySelectorAll = () => [];
    await assert.rejects(() => functions.readMoment(f.target, 'formation-detail', undefined, undefined, reader),
      { name: 'Error', message: 'A native moment observation requires exactly one arrival root.' });
    f.document.querySelectorAll = select;
    f.root.attributes['data-arrival-elapsed-exact'] = '61700';
    const pending = functions.readMoment(f.target, 'formation-detail', { atMs: 61750, shot: 'egress' }, undefined, reader);
    f.root.isConnected = false; f.mutate();
    await assert.rejects(pending, { name: 'Error', message: 'Arrival unmounted while awaiting its native final formation.' });
  }
});

test('CDP compilation and connection failures cannot fall back to a second observation', async () => {
  const disconnected = new Error('Execution context was destroyed.');
  const session = { send: async () => { throw disconnected; } };
  await assert.rejects(() => functions.prepareCdpMomentReader(session), error => error === disconnected);
  await assert.rejects(() => functions.prepareCdpMomentReader({ send: async () => ({ result: { type: 'undefined' } }) }),
    { message: 'The native moment observer did not compile to a remote function.' });
  await assert.rejects(() => functions.prepareCdpMomentReader({ send: async () => ({ exceptionDetails:
    { exception: { className: 'SyntaxError', description: 'SyntaxError: compilation failed\n    at native' } } }) }),
  { name: 'SyntaxError', message: 'compilation failed' });
  const f = fixture(), reader = await functions.prepareCdpMomentReader(f.session);
  let reads = 0;
  f.session.send = async () => { reads += 1; throw disconnected; };
  await assert.rejects(() => reader.read({ region: 'formation-detail' }), error => error === disconnected);
  assert.equal(reads, 1);
});
