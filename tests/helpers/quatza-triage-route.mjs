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

export function playQuatzaHunt(engine, mode, kit = 'mobility') {
  const { QUATZA_INPUT: I, QUATZA_POSTS: P } = engine;
  let frame = engine.createQuatzaFrame(mode);
  const input = [];
  function step(code = 0) {
    const next = engine.stepQuatza(mode, frame, code);
    if (next !== frame) input.push(code);
    frame = next;
  }
  const key = bit => { step(); step(bit); step(); };
  function walk(target, tolerance = 4) {
    for (let n = 0; n < 400 && Math.abs(frame.player.x - target) > tolerance; n++) {
      step(frame.player.x < target ? I.right : I.left);
    }
    assert(Math.abs(frame.player.x - target) <= tolerance, 'ordinary movement arrived at ' + target);
  }
  function post(x) { walk(x); key(I.interact); }
  function prepare() {
    post(P.rack); post(P.map);
    if (mode === 'solo') post(kit === 'care' ? P.care : P.mobility);
    post(P.departure);
    assert.equal(frame.phase, 'field');
  }
  function fight() {
    post(P.trail);
    walk(845);
    const phases = new Set(), hits = [];
    for (let n = 0; n < 3900 && frame.phase === 'field' && frame.beast.stage !== 'dead'; n++) {
      const { beast, player, companions } = frame;
      phases.add(beast.stage);
      const distance = Math.abs(beast.x - player.x);
      const ready = bit => !(frame.previous & bit);
      if (mode === 'triad' && distance < 400 && ready(I.signal) &&
          (!frame.approachCalled || companions[0].contribution && !frame.blockCalled)) {
        step(I.signal);
      } else if (beast.stage === 'recover' && player.y > 368 && distance <= 122 &&
          player.cooldown === 0 && ready(I.strike) && companions.every(ally => ally.contribution)) {
        step(I.strike);
        hits.push(frame.beast.health);
      } else if ((beast.stage === 'warning' && beast.remaining < 16 && distance < 190 ||
          beast.stage === 'charge' && distance < 130) && player.vy === 0 && ready(I.jump)) {
        step(I.jump);
      } else {
        step(beast.stage !== 'charge' && distance > 103 ? beast.x > player.x ? I.right : I.left : 0);
      }
    }
    assert.equal(frame.beast.stage, 'dead');
    assert(phases.has('warning') && phases.has('charge') && phases.has('recover'));
    assert.equal(hits.at(-1), 0);
  }
  return { get frame() { return frame; }, input, step, key, walk, post, prepare, fight,
    gatherAndReturn() {
      walk(frame.beast.x, 35);
      for (let n = 0; n < 100 && frame.player.y < 385; n++) step();
      key(I.interact); assert.equal(frame.hide, true); assert.equal(frame.skull, false);
      key(I.interact); assert.equal(frame.skull, true);
      walk(P.refuge);
      for (let n = 0; n < 100 && frame.player.y < 385; n++) step();
      key(I.interact); assert.equal(frame.phase, 'return');
      post(P.witness);
      assert.equal(frame.phase, 'delivered');
    },
  };
}
