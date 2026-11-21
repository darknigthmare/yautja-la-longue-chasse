import assert from 'node:assert/strict';

function recorder(initial, step) {
  let frame = initial;
  const input = [];
  return {
    input,
    get frame() { return frame; },
    step(code = 0) {
      const next = step(frame, code);
      if (next !== frame) { frame = next; input.push(code); }
    },
  };
}

/** Let real charges incapacitate Saar while the player evades and both allies contribute. */
export function playQuatzaAbsence(engine) {
  const { QUATZA_INPUT: I, QUATZA_POSTS: P } = engine;
  const play = recorder(engine.createQuatzaFrame('triad'), (frame, code) => engine.stepQuatza('triad', frame, code));
  const walk = x => {
    for (let n = 0; n < 400 && Math.abs(play.frame.player.x - x) > 4; n++)
      play.step(play.frame.player.x < x ? I.right : I.left);
    assert(Math.abs(play.frame.player.x - x) <= 4, 'reach Quatza post');
  };
  const post = x => { walk(x); play.step(); play.step(I.interact); play.step(); };
  post(P.rack);
  post(P.map);
  post(P.departure);
  assert.equal(play.frame.phase, 'field');
  post(P.trail);
  walk(845);
  for (let n = 0; n < 3900 && play.frame.phase === 'field'; n++) {
    const { beast, player, companions, previous, approachCalled, blockCalled } = play.frame;
    const distance = Math.abs(beast.x - player.x);
    if (distance < 400 && !(previous & I.signal) &&
        (!approachCalled || companions[0].contribution && !blockCalled)) {
      play.step(I.signal);
    } else if ((beast.stage === 'warning' && beast.remaining < 10 && distance < 200 ||
        beast.stage === 'charge' && distance < 70) && player.vy === 0 && !(previous & I.jump)) {
      play.step(I.jump);
    } else {
      play.step(beast.stage !== 'charge' && distance > 25 ? beast.x > player.x ? I.right : I.left : 0);
    }
  }
  assert.equal(play.frame.phase, 'retreated');
  assert.equal(engine.quatzaMissingCompanion(play.frame)?.id, 'saar');
  assert.equal(play.frame.player.health, 5);
  assert.equal(play.frame.companions[1].health, 3);
  return { input: play.input, frame: play.frame };
}

export function playQuatzaRescue(engine, hunt) {
  const { QUATZA_INPUT: I, QUATZA_POSTS: P } = engine;
  const origin = engine.createQuatzaRescueFrame(hunt);
  assert(origin);
  const play = recorder(origin, engine.stepQuatzaRescue);
  const walk = (x, tolerance = 4) => {
    for (let n = 0; n < 900 && Math.abs(play.frame.x - x) > tolerance; n++)
      play.step(play.frame.x < x ? I.right : I.left);
    assert(Math.abs(play.frame.x - x) <= tolerance, 'reach rescue post ' + x);
  };
  const post = (x, code = I.interact) => { walk(x); play.step(); play.step(code); play.step(); };
  play.step(I.interact);
  assert.equal(play.frame.phase, 'report', 'cannot report absence at a distance');
  post(P.witness);
  assert.equal(play.frame.phase, 'departure');
  post(P.departure);
  assert.equal(play.frame.phase, 'track');
  post(origin.traceX, I.signal);
  assert.equal(play.frame.phase, 'treat');
  const admissionTick = play.frame.tick;
  for (let n = 0; n < 30; n++) play.step(I.interact);
  assert.equal(play.frame.careTicks, 0, 'cannot stabilize from the trace');
  walk(origin.lastSeenX);
  for (let n = 0; n < 8; n++) play.step(I.interact);
  play.step(I.left | I.interact);
  assert.equal(play.frame.careTicks, 0, 'moving interrupts stabilization');
  for (let n = 0; n < 24; n++) play.step(I.interact);
  assert.equal(play.frame.phase, 'carry');
  const carryTick = play.frame.tick;
  post(P.refuge);
  assert.equal(play.frame.phase, 'return');
  post(P.witness);
  assert.equal(play.frame.phase, 'reunited');
  return { input: play.input, frame: play.frame, admissionTick, carryTick };
}
