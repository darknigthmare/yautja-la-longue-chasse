import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {observePitBackwardThrowLaunchV112} from './observed-launch.mjs';
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
