import assert from 'node:assert/strict';

/** Attempt every owned key release, including keys whose keydown failed.
 * An unavailable page may reject one keyup; the other releases still run. */
export async function releasePitLaunchKeysV112(keys, keyboard) {
  const results = await Promise.allSettled(keys.map(key => keyboard.up(key)));
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, 'Could not release every launch key');
}

/** Observe one real input edge. Holding that same edge is not a retry. This
 * helper never edits combat state and never accepts an unobserved startup. */
export async function observePitBackwardThrowLaunchV112({
  slot, input, read, press, release, advance, observations,
  startupFrames = 10, maximumEffectiveFrames = 8, maximumPolls = 24,
  maximumStalledPolls = 4, clockQuantumMs = 17,
}) {
  assert.ok(slot === 0 || slot === 1);
  for (const [label, value] of Object.entries({startupFrames, maximumEffectiveFrames, maximumPolls, maximumStalledPolls, clockQuantumMs}))
    assert.ok(Number.isSafeInteger(value) && value > 0, label);
  assert.ok(maximumEffectiveFrames < startupFrames, 'Observe startup before its active window');
  const record = {kind: 'one-held-input-observed-launch', slot, input, status: 'RUNNING',
    bounds: {startupFrames, maximumEffectiveFrames, maximumPolls, maximumStalledPolls, clockQuantumMs},
    before: null, samples: [], started: null, startFrame: null, effectiveFrames: null,
    pressCalls: 0, releaseCalls: 0, released: null, failure: null, releaseFailure: null};
  observations.push(record);
  let previousFrame, stalledPolls = 0, primaryFailure;
  const fail = message => {const error = Error(message); error.observation = record; throw error;};
  const ready = state => {
    if (!Number.isSafeInteger(state.frame) || state.frame < 0) fail('Launch requires a finite integer simulation frame');
    if (state.phase !== 'fight' || state.combatPhase !== 'round' || state.blocked !== 'false') fail('Launch lost the ready live round');
    if (!Array.isArray(state.actions) || state.actions.length !== 2) fail('Launch requires both actual fighter actions');
  };
  try {
    record.before = await read(); ready(record.before); previousFrame = record.before.frame;
    if (record.before.throw || record.before.forwardThrow || record.before.actions.some(action => action.workbookMove === 'TH_B'))
      fail('Launch cannot reuse an existing capture or backward action');
    if (record.before.actions[slot].phase !== 'idle' || record.before.actions[slot].workbookMove !== null)
      fail('Launch must begin from the actual idle actor');
    record.pressCalls++; await press();
    for (let poll = 0; poll < maximumPolls; poll++) {
      const state = await read(); record.samples.push(state); ready(state);
      if (state.frame < previousFrame) fail('Launch simulation frame reversed');
      if (state.frame - record.before.frame > maximumEffectiveFrames) fail('Launch exceeded its effective-frame bound');
      if (state.throw || state.forwardThrow) fail('Launch skipped the observed startup and reached a capture');
      if (JSON.stringify(state.life) !== JSON.stringify(record.before.life)) fail('Launch health changed before the observed startup');
      if (state.actions[1 - slot].workbookMove === 'TH_B') fail('Launch started on the wrong actor slot');
      const action = state.actions[slot];
      if (action.workbookMove === 'TH_B') {
        if (action.phase !== 'startup' || !Number.isSafeInteger(action.actionFrame) || action.actionFrame < 0 || action.actionFrame >= startupFrames)
          fail('Launch did not observe a valid TH_B startup');
        const startFrame = state.frame - action.actionFrame;
        if (startFrame <= record.before.frame || startFrame > state.frame) fail('Launch startup does not follow this input edge');
        record.started = state; record.startFrame = startFrame;
        record.effectiveFrames = state.frame - record.before.frame; record.status = 'PASS';
        return record;
      }
      if (action.workbookMove !== null || action.phase !== 'idle') fail('Launch produced a different action');
      if (state.frame - record.before.frame >= maximumEffectiveFrames) fail('Launch exhausted its effective-frame bound without TH_B startup');
      stalledPolls = state.frame === previousFrame ? stalledPolls + 1 : 0;
      if (stalledPolls >= maximumStalledPolls) fail('Launch simulation made no progress');
      previousFrame = state.frame;
      if (poll + 1 < maximumPolls) await advance(clockQuantumMs);
    }
    fail('Launch exhausted its strict poll bound without TH_B startup');
  } catch (error) {
    primaryFailure = error; record.status = 'FAIL'; record.failure = String(error); throw error;
  } finally {
    record.releaseCalls++;
    try {await release(); record.released = await read();}
    catch (error) {
      record.status = 'FAIL'; record.releaseFailure = String(error);
      if (primaryFailure) throw new AggregateError([primaryFailure, error], 'Launch failed and input release also failed');
      throw error;
    }
  }
}
