import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { animationFrameFixture } from './helpers/animation-frame-fixture.mjs';

const qa = homeworldSceneSsrV78();
const arrival = qa.load('app/game/systems/planetArrival.ts');
const source = readFileSync(new URL('../app/game/PlanetArrivalCinematic.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('PlanetArrivalCinematic.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PlanetArrivalCinematic');
assert.ok(component?.body);
const callbacks = component.body.statements.filter(ts.isVariableStatement).flatMap(statement =>
  statement.declarationList.declarations.filter(node => ts.isIdentifier(node.name) &&
    ['publish', 'checkpoint', 'pause'].includes(node.name.text)).map(node => `const ${node.getText(tree)};`));
assert.equal(callbacks.length, 3);
const effects = component.body.statements.filter(ts.isExpressionStatement).map(node => node.expression).filter(node =>
  ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect');
const effectFor = dependencies => {
  const matches = effects.filter(node => node.arguments[1]?.getText(tree).replace(/\s/g, '') === dependencies);
  assert.equal(matches.length, 1, `One production effect for ${dependencies}`);
  return matches[0].arguments[0].getText(tree);
};
const preloadSource = effectFor('[sourceKey,checkpoint]');
const startSource = effectFor('[loading,suspended,checkpointBlocked,checkpoint]');
const frameSource = effectFor('[suspended,checkpointBlocked,loading,pause,checkpoint,handoff,publish]');
const execute = (code, bindings) => new Function(...Object.keys(bindings), ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(...Object.values(bindings));

/** Execute the production callbacks and effects, with a controlled boundary
 * between asset completion and the next committed loading value. This is an
 * effect-interleaving regression, not a React DOM or browser timing claim. */
function startupFixture({ status = 'prepared', acceptCheckpoint = true } = {}) {
  const frames = animationFrameFixture();
  const timelineRef = { current: { ...arrival.createPlanetArrival({
    ownerCreatedAt: '2026-11-08T00:00:00.000Z', runId: 'startup-regression', missionId: 'jungle-vey',
    encounterRun: 1, personalShipId: 'classic-predator-spaceship', hunterPresetId: 'jungle-hunter',
  }), status } };
  const images = [], checkpoints = [], errors = [], reasons = [], loadingUpdates = [], timers = new Map();
  const mountedRef = { current: true }, lastFrameRef = { current: null };
  const document = { hidden: false };
  let timerId = 0;
  class ImageFixture {
    complete = false;
    naturalWidth = 0;
    src = '';
    constructor() { images.push(this); }
    getAttribute(name) { return name === 'src' ? this.src : null; }
  }
  const callbackRef = { current: {
    suspended: false, checkpointBlocked: false,
    onCheckpoint(next) { checkpoints.push(next); return acceptCheckpoint; },
  } };
  const shared = {
    ...arrival, timelineRef, mountedRef, lastFrameRef, callbackRef, document,
    busyRef: { current: false }, keyboardArmedRef: { current: false },
    audioDirectorRef: { current: null }, shipViewAvailabilityLockedRef: { current: false },
    CARRIER_REVEAL_MS: arrival.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'carrier').startMs,
    setTimeline() {}, setError: value => errors.push(value), setPauseReason: value => reasons.push(value),
    useCallback: callback => callback,
  };
  Object.assign(shared, execute(`${callbacks.join('\n')}\nreturn { publish, checkpoint, pause };`, shared));
  const bindings = {
    ...shared, Image: ImageFixture, sourceKey: '/required-arrival.png',
    setFailedAssets: failures => assert.deepEqual(failures, []),
    setLoading: value => loadingUpdates.push(value),
    window: { setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; } },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: frames.requestAnimationFrame,
    cancelAnimationFrame: frames.cancelAnimationFrame,
    handoff() { assert.fail('Startup must not hand off to a hunt.'); },
  };
  const cleanups = [];
  return {
    frames, timelineRef, document, checkpoints, errors, reasons, loadingUpdates,
    effects(loading, { suspended = false, checkpointBlocked = false } = {}) {
      Object.assign(callbackRef.current, { suspended, checkpointBlocked });
      return execute(`return { preload: ${preloadSource}, start: ${startSource}, frame: ${frameSource} };`,
        { ...bindings, loading, suspended, checkpointBlocked });
    },
    mount(effect) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); return cleanup; },
    async finishImages() {
      for (const image of images) { image.complete = true; image.naturalWidth = 1024; image.onload?.(); }
      await new Promise(resolve => setImmediate(resolve));
    },
    close() { mountedRef.current = false; for (const cleanup of cleanups.reverse()) cleanup(); },
  };
}

test('an asset completion between renders cannot let the old loading frame pause a fresh arrival', async t => {
  const fixture = startupFixture();
  t.after(() => fixture.close());
  const loading = fixture.effects(true);
  fixture.mount(loading.preload);
  loading.start();
  const stopLoadingFrames = fixture.mount(loading.frame);
  fixture.frames.tick();
  await fixture.finishImages();
  assert.deepEqual(fixture.loadingUpdates, [false]);

  // A state setter queues a render; the previous effect can still receive a
  // frame before its cleanup. Do not flush the new effects before this frame.
  fixture.frames.tick();
  assert.equal(fixture.timelineRef.current.status, 'prepared');
  assert.equal(fixture.timelineRef.current.elapsedMs, 0);
  assert.deepEqual(fixture.checkpoints, []);
  assert.deepEqual(fixture.reasons, []);

  stopLoadingFrames();
  const ready = fixture.effects(false);
  ready.start();
  fixture.mount(ready.frame);
  fixture.frames.tick(2);
  assert.equal(fixture.timelineRef.current.status, 'playing');
  assert.ok(fixture.timelineRef.current.elapsedMs > 0);
  assert.deepEqual(fixture.checkpoints.map(next => next.status), ['playing']);
  assert.deepEqual(fixture.reasons, []);
});

test('the committed startup gate respects pause, suspension, visibility and an active storage write', async t => {
  for (const guard of ['paused', 'suspended', 'hidden', 'checkpointBlocked']) {
    await t.test(guard, async t => {
      const fixture = startupFixture({ status: guard === 'paused' ? 'paused' : 'prepared' });
      t.after(() => fixture.close());
      fixture.document.hidden = guard === 'hidden';
      const props = { suspended: guard === 'suspended', checkpointBlocked: guard === 'checkpointBlocked' };
      fixture.mount(fixture.effects(true, props).preload);
      await fixture.finishImages();
      fixture.effects(false, props).start();
      assert.equal(fixture.timelineRef.current.status, guard === 'paused' ? 'paused' : 'prepared');
      assert.deepEqual(fixture.checkpoints, []);
      fixture.document.hidden = false;
      fixture.effects(false).start();
      assert.equal(fixture.timelineRef.current.status, guard === 'paused' ? 'paused' : 'playing');
      assert.equal(fixture.checkpoints.length, guard === 'paused' ? 0 : 1);
    });
  }
});

test('a refused initial checkpoint remains paused with its real error and is not retried automatically', async t => {
  const fixture = startupFixture({ acceptCheckpoint: false });
  t.after(() => fixture.close());
  fixture.mount(fixture.effects(true).preload);
  await fixture.finishImages();
  const ready = fixture.effects(false);
  ready.start();
  fixture.mount(ready.frame);
  fixture.frames.tick(2);
  fixture.effects(false).start();
  assert.equal(fixture.timelineRef.current.status, 'paused');
  assert.equal(fixture.timelineRef.current.elapsedMs, 0);
  assert.equal(fixture.checkpoints.length, 1);
  assert.match(fixture.errors.at(-1), /n’a pas pu être enregistrée/);
});

test('actual visibility loss still pauses the committed running sequence', async t => {
  const fixture = startupFixture();
  t.after(() => fixture.close());
  fixture.mount(fixture.effects(true).preload);
  await fixture.finishImages();
  const ready = fixture.effects(false);
  ready.start();
  fixture.mount(ready.frame);
  fixture.frames.tick(2);
  const elapsedMs = fixture.timelineRef.current.elapsedMs;
  fixture.document.hidden = true;
  fixture.frames.tick(2);
  assert.equal(fixture.timelineRef.current.status, 'paused');
  assert.equal(fixture.timelineRef.current.elapsedMs, elapsedMs);
  assert.deepEqual(fixture.checkpoints.map(next => next.status), ['playing', 'paused']);
  assert.equal(fixture.reasons.at(-1), 'La fenêtre est inactive.');
});
