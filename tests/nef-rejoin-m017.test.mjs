import assert from "node:assert/strict";
import test from "node:test";
import { templeCampaignRoute, templeEnvironment, thresholdsTemple as temple, stamp } from "./helpers/solo-v70-played-route.mjs";

test("M017 opens the existing high footplate and resumes the physical regrouping below", () => {
  const { room, leverX, upperY, regroupX, holdTicks } = temple.SOLO_V70_NEF_RELAY_M017;
  const initial = templeCampaignRoute({ stop: "separation" }).save;
  let save = initial, state = save.soloV70.checkpoint;
  const act = (input = {}) => {
    const output = temple.stepSoloV70(state, input, templeEnvironment);
    state = output.state;
    const written = output.receipts.length
      ? temple.withSoloV70Progress(save, output.receipts, state, stamp)
      : temple.withSoloV70Checkpoint(save, state, stamp);
    assert(written, "Checkpoint refused " + JSON.stringify({ tick: state.tick, player: state.player, relay: state.nefRelayM017 }));
    save = written;
  };
  const walk = destination => {
    for (let frame = 0; frame < 250 && Math.abs(state.player.x - destination) > 5; frame++) {
      act({ move: Math.sign(destination - state.player.x) });
    }
    assert(Math.abs(state.player.x - destination) <= 5);
    act();
  };
  const frames = (number, input = {}) => { for (let frame = 0; frame < number; frame++) act(input); };

  assert.equal(state.room, room);
  act();
  act({ command: true });
  walk(leverX);
  frames(holdTicks + 12, { interact: true });
  assert.equal(state.nefRelayM017, undefined, "The ground under the footplate must not operate it");
  act();
  act({ jump: true });
  frames(55);
  assert.equal(state.player.y, upperY);
  assert.equal(temple.soloV70Support(state), upperY);
  frames(14, { interact: true });
  assert(state.scan > 0);
  act();
  assert.equal(state.scan, 0);
  assert.equal(state.nefRelayM017, undefined);
  frames(holdTicks, { interact: true });
  assert(state.nefRelayM017);
  assert.equal(state.companionMode, "follow");
  assert.equal(save.soloV70.receipts.at(-1).id, "second-configuration");

  const restored = temple.normalizeSoloV70Campaign(JSON.parse(JSON.stringify(save.soloV70)));
  assert(restored);
  assert.deepEqual(restored.checkpoint.nefRelayM017, state.nefRelayM017);
  const erased = structuredClone(restored.checkpoint);
  delete erased.nefRelayM017;
  assert.equal(temple.withSoloV70Checkpoint(save, erased, stamp), null);
  const forged = structuredClone(restored.checkpoint);
  forged.nefRelayM017.x = 895;
  assert.equal(temple.normalizeSoloV70State(forged), null);
  state = restored.checkpoint;

  act();
  walk(800);
  frames(50);
  assert.equal(state.player.y, 430);
  walk(regroupX);
  frames(130);
  assert(temple.soloV70TrioPresent(state));
  act({ interact: true });
  assert.equal(state.phase, "drone");
  assert.equal(save.soloV70.receipts.at(-1).id, "triad-rejoined");
  assert.deepEqual(save.prologue.chronicle, initial.prologue.chronicle);
  assert(temple.normalizeSoloV70Campaign(save.soloV70));
});

test("M017 preserves the ordinary lower regrouping and old Nef geometry", () => {
  const old = templeCampaignRoute({ stop: "separation" }).save.soloV70.checkpoint;
  delete old.reconnectionVariant;
  assert.deepEqual(temple.soloV70Platforms(temple.normalizeSoloV70State(old)), []);
  assert.equal(temple.soloV70Objective(old).targetX, temple.SOLO_V70_RECONNECTION.x);
  const route = templeCampaignRoute({ stop: "drone" });
  assert.equal(route.save.soloV70.receipts.at(-1).id, "triad-rejoined");
  assert.equal(route.state.nefRelayM017, undefined);
});
