import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
import {build} from 'esbuild';
import {observePitBackwardThrowLaunchV112, releasePitLaunchKeysV112} from '../scripts/lib/pit-observed-launch-v112.mjs';
const bundle = await build({stdin: {contents: "export * from './app/game/systems/pitCombat';", resolveDir: process.cwd()},
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function fixture({ignore = false, stall = false, delayedTicks = 0, wrongAction = false, wrongSlot = false,
  pressFailure = false, releaseFailure = false, fault, bounds = {}} = {}) {
  let state = api.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v112', mode: 'training'});
  let held = false, presses = 0, releases = 0, calls = 0;
  const observations = [];
  const read = async () => {
    const snapshot = {frame: state.frame, phase: 'fight', combatPhase: state.phase, blocked: 'false',
      throw: state.sourceThrowV112, forwardThrow: state.sourceThrowV109,
      life: state.fighters.map(f => f.health),
      actions: state.fighters.map(f => ({phase: f.phase, workbookMove: f.action?.workbookMove ?? null, actionFrame: f.action?.frame ?? null}))};
    if (fault && calls) fault(snapshot); return snapshot;
  };
  return {observations, presses: () => presses, releases: () => releases, calls: () => calls, held: () => held,
    execute: () => observePitBackwardThrowLaunchV112({slot: 0, input: 'real-model-held-keyboard', observations, read,
      press: async () => {presses++; held = true; if (pressFailure) throw Error('actual press failed partway');},
      release: async () => {releases++; held = false; if (releaseFailure) throw Error('actual release failed');},
      advance: async ms => {
        assert.equal(ms, 17); calls++;
        if (stall || calls <= delayedTicks) return;
        const requested = wrongAction ? {attack: 'light'} : {throw: true, left: true};
        const inputs = ignore || !held ? [{}, {}] : wrongSlot ? [{}, {throw: true, right: true}] : [requested, {}];
        state = api.stepPitCombat(state, inputs);
      }, ...bounds})};
}
test('one actual held edge reaches real TH_B startup after non-progressing clock calls, then releases once', async () => {
  const x = fixture({delayedTicks: 2}); const record = await x.execute();
  assert.equal(record.started.actions[0].phase, 'startup'); assert.equal(record.started.actions[0].workbookMove, 'TH_B');
  assert.equal(record.started.frame, 1); assert.equal(record.startFrame, 1); assert.equal(record.effectiveFrames, 1);
  assert.equal(x.presses(), 1); assert.equal(x.releases(), 1); assert.equal(x.held(), false); assert.equal(x.calls(), 3);
  assert.equal(record.released.frame, record.started.frame); assert.equal(record.status, 'PASS');
  assert(record.samples.some((s, i) => i && s.frame === record.samples[i - 1].frame));
});
test('ignored input is refused by the effective-frame bound without a second press, with release and raw observations retained', async () => {
  const x = fixture({ignore: true}); await assert.rejects(x.execute(), /effective-frame bound/);
  assert.equal(x.presses(), 1); assert.equal(x.releases(), 1); assert.equal(x.held(), false);
  assert.equal(x.calls(), 8); assert.equal(x.observations[0].started, null); assert.equal(x.observations[0].released.frame, 8);
});
test('a blocked simulation is refused by absence of progression and always releases the one input edge', async () => {
  const x = fixture({stall: true}); await assert.rejects(x.execute(), /made no progress/);
  assert.equal(x.calls(), 3); assert.equal(x.presses(), 1); assert.equal(x.releases(), 1); assert.equal(x.held(), false);
});
test('the independent poll bound refuses a permanently stalled clock even when the stall allowance is larger', async () => {
  const x = fixture({stall: true, bounds: {maximumStalledPolls: 50, maximumPolls: 4}});
  await assert.rejects(x.execute(), /strict poll bound/); assert.equal(x.calls(), 3); assert.equal(x.releases(), 1);
});
test('an actual normal attack cannot masquerade as the requested backward startup', async () => {
  const x = fixture({wrongAction: true}); await assert.rejects(x.execute(), /different action/);
  assert.equal(x.observations[0].samples.at(-1).actions[0].phase, 'startup'); assert.equal(x.releases(), 1);
});
test('a real TH_B startup on the other slot is refused immediately', async () => {
  const x = fixture({wrongSlot: true}); await assert.rejects(x.execute(), /wrong actor slot/); assert.equal(x.releases(), 1);
});
test('a positive simulation frame that actually moves backward is rejected with its raw sample retained', async () => {
  let samples = 0;
  const x = fixture({ignore: true, fault: s => {samples++; if (samples >= 2) s.frame = 0;}});
  await assert.rejects(x.execute(), /frame reversed/); assert.equal(x.releases(), 1);
  assert.equal(x.observations[0].samples.at(-1).frame, 0);
  assert(x.observations[0].samples.some(s => s.frame === 1));
});
test('reversed frames, skipped startup, unready state and changed health remain explicit failures', async () => {
  for (const [fault, message] of [
    [s => {s.frame = -1;}, /finite integer simulation frame/],
    [s => {s.actions[0].phase = 'recovery';}, /valid TH_B startup/],
    [s => {s.blocked = 'true';}, /ready live round/],
    [s => {s.life[1]--;}, /health changed/],
    [s => {s.throw = {attackerSlot: 0};}, /skipped the observed startup/],
  ]) {const x = fixture({fault}); await assert.rejects(x.execute(), message); assert.equal(x.releases(), 1); assert.equal(x.held(), false);}
});
test('partially failed press still releases, and a failed release cannot be published as successful input observation', async () => {
  const press = fixture({pressFailure: true}); await assert.rejects(press.execute(), /press failed partway/);
  assert.equal(press.presses(), 1); assert.equal(press.releases(), 1); assert.equal(press.held(), false);
  const release = fixture({releaseFailure: true}); await assert.rejects(release.execute(), /release failed/);
  assert.equal(release.observations[0].status, 'FAIL'); assert.equal(release.releases(), 1);
});
test('the actual release routine attempts every keyup even when one native release rejects', async () => {
  const attempted = [];
  await assert.rejects(releasePitLaunchKeysV112(['Numpad6', 'Numpad1', 'Numpad3'], {up: async key => {
    attempted.push(key); if (key === 'Numpad6') throw Error('first native keyup rejected');
  }}), /release every launch key/);
  assert.deepEqual(attempted, ['Numpad6', 'Numpad1', 'Numpad3']);
});

const browserSource = ts.createSourceFile('qa-pit-backward-throws-v112.mjs',
  await fs.readFile('scripts/qa-pit-backward-throws-v112.mjs', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const launchDeclaration = browserSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'launch');
assert(launchDeclaration, 'Test the actual browser launch adapter');
function actualBrowserLaunch({pressFailure = false, releaseFailure = false, delayedTicks = 0} = {}) {
  let state = api.createPitCombatState('scar', 'feral-hunter', {normalMoves: 'workbook-v112', mode: 'training'}), calls = 0;
  const keys = new Set(), downCalls = [], upCalls = [], observations = [];
  const read = async () => ({frame: state.frame, phase: 'fight', combatPhase: state.phase, blocked: 'false',
    throw: state.sourceThrowV112, forwardThrow: state.sourceThrowV109, facings: state.fighters.map(f => f.facing),
    life: state.fighters.map(f => f.health),
    actions: state.fighters.map(f => ({phase: f.phase, workbookMove: f.action?.workbookMove ?? null, actionFrame: f.action?.frame ?? null}))});
  const scope = {assert, read, observations, observePitBackwardThrowLaunchV112, releasePitLaunchKeysV112,
    page: {locator: () => ({focus: async () => {}}), keyboard: {
      down: async key => {downCalls.push(key); if (pressFailure && key === 'Numpad1') throw Error('actual adapter keydown failed'); keys.add(key);},
      up: async key => {upCalls.push(key); keys.delete(key); if (releaseFailure && key === 'Numpad6') throw Error('actual adapter keyup failed');},
    }, clock: {runFor: async ms => {
      assert.equal(ms, 17); calls++; if (calls <= delayedTicks) return;
      state = api.stepPitCombat(state, [{}, keys.has('Numpad1') && keys.has('Numpad3') ? {throw: true, right: keys.has('Numpad6')} : {}]);
    }}}};
  vm.runInNewContext(launchDeclaration.getText(browserSource) + ';globalThis.execute = launch;', scope);
  return {execute: () => scope.execute(1, 'keyboard'), observations, downCalls, upCalls, keys, calls: () => calls};
}
test('the actual browser adapter holds one J2 combo across clock calls with no tick, then releases all three keys after real startup', async () => {
  const x = actualBrowserLaunch({delayedTicks: 2}); const record = await x.execute();
  assert.equal(record.started.actions[1].workbookMove, 'TH_B'); assert.equal(record.started.frame, 1);
  assert.deepEqual(x.downCalls, ['Numpad6', 'Numpad1', 'Numpad3']); assert.deepEqual(x.upCalls, x.downCalls);
  assert.equal(x.calls(), 3); assert.equal(x.keys.size, 0); assert.equal(record.pressCalls, 1);
});
test('a partial native keydown failure in the actual adapter releases every owned key, including unreached ones', async () => {
  const x = actualBrowserLaunch({pressFailure: true}); await assert.rejects(x.execute(), /keydown failed/);
  assert.deepEqual(x.downCalls, ['Numpad6', 'Numpad1']); assert.deepEqual(x.upCalls, ['Numpad6', 'Numpad1', 'Numpad3']);
  assert.equal(x.keys.size, 0); assert.equal(x.observations[0].status, 'FAIL');
});
test('a native keyup failure in the actual adapter still releases the remaining keys and fails the observation', async () => {
  const x = actualBrowserLaunch({releaseFailure: true}); await assert.rejects(x.execute(), /release every launch key/);
  assert.deepEqual(x.upCalls, ['Numpad6', 'Numpad1', 'Numpad3']); assert.equal(x.keys.size, 0);
  assert.equal(x.observations[0].status, 'FAIL'); assert.match(x.observations[0].releaseFailure, /release every launch key/);
});
