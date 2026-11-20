'use strict';
// Pure playback rules shared by the exporter, browser preview and checks.
(function (scope, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.HuntPlayback = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function orderFrames(frames, order) {
    assert(['forward', 'reverse', 'ping-pong'].includes(order), `Unsupported order: ${order}`);
    if (order === 'reverse') return [...frames].reverse();
    if (order === 'ping-pong') return frames.length < 2 ? [...frames] : [...frames, ...frames.slice(1, -1).reverse()];
    return [...frames];
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function timebase(fpsValues) {
    return fpsValues.reduce((result, fps) => {
      assert(Number.isSafeInteger(fps) && fps > 0 && fps <= 120, `Invalid review fps: ${fps}`);
      const next = result * fps / gcd(result, fps);
      assert(Number.isSafeInteger(next) && next <= 240, 'Review timebase must be <= 240 ticks per second.');
      return next;
    }, 1);
  }
  function checkActions(actions, clips) {
    assert(Array.isArray(actions) && actions.length > 0, 'Explicit actions are required.');
    const ids = new Set(), used = new Set();
    const clipMap = new Map(clips.map(clip => [clip.id, clip]));
    assert(clipMap.size === clips.length, 'Duplicate clip identifier.');
    for (const action of actions) {
      assert(/^[a-z0-9_]+$/.test(action.id) && !ids.has(action.id), `Invalid or duplicate action: ${action.id}`);
      ids.add(action.id);
      const expected = action.kind === 'sustained' ? ['enter', 'loop', 'exit'] : action.kind === 'one-shot' ? ['action'] : action.kind === 'loop' ? ['loop'] : null;
      assert(expected, `Invalid action kind: ${action.kind}`);
      assert(action.phases && Object.keys(action.phases).length === expected.length && expected.every(key => action.phases[key]), `${action.id}: phases must be ${expected.join(', ')}.`);
      for (const [phase, spec] of Object.entries(action.phases)) {
        assert(Array.isArray(spec.clips) && spec.clips.length > 0, `${action.id}/${phase}: source clips required.`);
        assert(['forward', 'reverse', 'ping-pong'].includes(spec.order || 'forward'), `${action.id}/${phase}: invalid order.`);
        if (phase !== 'loop') assert(spec.order !== 'ping-pong', `${action.id}/${phase}: ping-pong is reserved for explicit loops.`);
        for (const id of spec.clips) { assert(clipMap.has(id), `${action.id}/${phase}: unknown source ${id}.`); used.add(id); }
      }
    }
    for (const id of clipMap.keys()) assert(used.has(id), `Unreferenced source clip: ${id}`);
  }
  function build(actions, clips, options = {}) {
    checkActions(actions, clips);
    const ticksPerSecond = timebase(clips.map(clip => clip.fps));
    const clipMap = new Map(clips.map(clip => [clip.id, clip]));
    const built = actions.map(action => {
      const phases = {};
      for (const [key, spec] of Object.entries(action.phases)) {
        const forward = spec.clips.flatMap(id => {
          const clip = clipMap.get(id);
          return clip.frames.map(frame => ({clip: id, number: frame.number, durationTicks: ticksPerSecond / clip.fps, phase: key}));
        });
        const steps = orderFrames(forward, spec.order || 'forward');
        phases[key] = {id: `${action.id}_${key}`, loop: key === 'loop', order: spec.order || 'forward', sourceClips: [...spec.clips], durationTicks: steps.reduce((sum, step) => sum + step.durationTicks, 0), steps};
      }
      let sequence = [];
      if (action.kind === 'one-shot') sequence = [...phases.action.steps];
      else {
        if (phases.enter) sequence.push(...phases.enter.steps);
        const repeats = action.previewLoopRepeats ?? options.previewLoopRepeats ?? 2;
        assert(Number.isSafeInteger(repeats) && repeats > 0 && repeats <= 12, `${action.id}: invalid preview loop repeats.`);
        for (let index = 0; index < repeats; index++) sequence.push(...phases.loop.steps);
        if (phases.exit) sequence.push(...phases.exit.steps);
      }
      return {id: action.id, label: action.label || action.id, kind: action.kind, phases, sequence, durationTicks: sequence.reduce((sum, step) => sum + step.durationTicks, 0), reviewFps: [...new Set(Object.values(phases).flatMap(phase => phase.sourceClips.map(id => clipMap.get(id).fps)))], gameplayTiming: action.gameplayTiming || null};
    });
    return {schemaVersion: 1, ticksPerSecond, purpose: 'Art review timing only; gameplay timing is preserved separately and is not changed.', actions: built};
  }
  function resolve(steps, elapsedTicks, loop = false) {
    assert(steps.length > 0, 'Cannot resolve an empty animation.');
    const total = steps.reduce((sum, step) => sum + step.durationTicks, 0);
    const elapsed = Math.max(0, Number.isFinite(elapsedTicks) ? elapsedTicks : 0);
    const tick = loop ? elapsed % total : Math.min(elapsed, total);
    let end = 0;
    for (let index = 0; index < steps.length; index++) {
      end += steps[index].durationTicks;
      if (tick < end) return {step: steps[index], index, ended: false, totalTicks: total};
    }
    return {step: steps.at(-1), index: steps.length - 1, ended: !loop, totalTicks: total};
  }
  return {assert, orderFrames, timebase, checkActions, build, resolve};
});

