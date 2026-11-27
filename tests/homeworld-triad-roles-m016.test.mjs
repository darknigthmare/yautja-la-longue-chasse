import test from "node:test";
import assert from "node:assert/strict";
import { formationCampaignRoute, formationEnvironment, formationModel, stamp } from "./helpers/solo-v90-played-route.mjs";

const p = formationModel;
const atEntrance = formationCampaignRoute({ stop: "assemble" }).save;
const admitted = formationCampaignRoute({ stop: "assemble", meetPartners: true }).save;

function rehearsal(save = structuredClone(admitted)) {
  let state = save.soloV90.checkpoint;
  return {
    get state() { return state; },
    get save() { return save; },
    act(input) {
      const previous = state;
      const played = p.stepSoloV90(state, input, formationEnvironment);
      state = played.state;
      assert(p.normalizeSoloV90State(state), "physical checkpoint");
      if (played.receipts.length || p.soloV90NeedsImmediateCheckpoint(previous, state)) {
        save = played.receipts.length ? p.withSoloV90Progress(save, played.receipts, state, stamp)
          : p.withSoloV90Checkpoint(save, state, stamp);
        assert(save);
        state = save.soloV90.checkpoint;
      }
      return played.receipts;
    },
    commit() {
      save = p.withSoloV90Checkpoint(save, state, stamp);
      assert(save);
      state = p.normalizeSoloV90State(JSON.parse(JSON.stringify(save.soloV90.checkpoint)));
      assert(state);
    }
  };
}

function findBoard(play) {
  for (let i = 0; i < 560 && play.state.player.x < 2587; i++) {
    play.act(play.state.inputArmed ? { move: 1 } : {});
  }
  play.act({});
  assert(p.soloV90RoleBoardReady(play.state));
}

test("M016 forms real posts for both choices and keeps the selected roles in V90", () => {
  for (const plan of ["preference", "complementary"]) {
    const play = rehearsal();
    play.act({});
    play.act({ rolePlan: plan });
    assert.equal(play.state.formationPlan, undefined, "The role board is away from this actor");
    findBoard(play);
    play.act({ rolePlan: plan });
    play.commit();
    assert.equal(play.state.formationPlan, plan);
    assert.equal(play.state.milestones["roles-positioned"], undefined);
    const expected = plan === "preference" ? [2360, 2800] : [2800, 2360];
    assert.deepEqual([0, 1].map(i => p.soloV90CompanionPost(play.state, i)), expected);
    play.act({ command: true });
    for (let i = 0; i < 12; i++) play.act({ interact: true });
    assert.equal(play.state.phase, "assemble");
    for (let i = 0; i < 230 && play.state.phase === "assemble"; i++) play.act({ interact: true });
    assert.equal(play.state.phase, "observe");
    assert(play.state.companions.every((item, i) => Math.abs(item.x - expected[i]) < 5));
    assert.equal(play.save.soloV90.receipts.at(-1).id, "roles-positioned");
    assert.deepEqual(play.save.prologue.chronicle, admitted.prologue.chronicle);
    play.act({}); play.act({ rolePlan: plan === "preference" ? "complementary" : "preference" });
    assert.equal(play.state.formationPlan, plan, "The posts are locked for the remainder of this rehearsal");
  }
});

test("M016 keeps older snapshots and validates the optional replayed role choice", () => {
  assert.equal(Object.hasOwn(p.normalizeSoloV90Campaign(admitted.soloV90).checkpoint, "formationPlan"), false);
  const play = rehearsal();
  findBoard(play);
  play.commit();
  const forged = { ...play.state, formationPlan: "complementary" };
  assert.equal(p.withSoloV90Checkpoint(play.save, forged, stamp), null);
  assert.equal(p.normalizeSoloV90State({ ...play.state, formationPlan: "fifth-post" }), null);
  assert.equal(p.normalizeSoloV90State({ ...play.state, replay: [193] }), null);
  for (const rolePlan of ["preference", "complementary"]) {
    assert.equal(p.unpackSoloV90Input(p.packSoloV90Input({ rolePlan })).rolePlan, rolePlan);
  }
  assert.equal(p.packSoloV90Input({ move: 1, jump: true, command: true, dodge: true }), 54);
});

function walkTo(play, target) {
  for (let i = 0; i < 950 && Math.abs(play.state.player.x - target) > 3.5; i++) {
    play.act(play.state.inputArmed ? { move: Math.sign(target - play.state.player.x) } : {});
  }
  play.act({});
  assert(Math.abs(play.state.player.x - target) <= 3.5);
}

test("M016 requires the two physical partner activities before the board, with checkpoint recovery", () => {
  const play = rehearsal(structuredClone(atEntrance));
  const [saar, vek] = p.SOLO_V90_PARTNER_ACTIVITIES;
  walkTo(play, 2590);
  play.act({ command: true, rolePlan: "complementary" });
  assert.equal(p.soloV90RoleBoardReady(play.state), false);
  assert.equal(play.state.roleMode, "follow");
  assert.equal(play.state.formationPlan, undefined);
  assert.deepEqual(play.state.partnerObservations, {});
  // Partners may be met right-to-left. The replay and canonical archive must agree.
  walkTo(play, vek.x);
  for (let i = 0; i < 22; i++) play.act({ interact: true });
  assert.equal(play.state.partnerObservations.vek, undefined);
  play.commit();
  assert.equal(play.state.scan, 22);
  walkTo(play, vek.x - 60);
  assert.equal(play.state.scan, 0);
  walkTo(play, vek.x);
  for (let i = 0; i < p.SOLO_V90_ACTIVITY_TICKS; i++) play.act({ interact: true });
  assert.equal(typeof play.save.soloV90.checkpoint.partnerObservations.vek, "number");
  assert.equal(play.state.partnerObservations.saar, undefined);
  walkTo(play, saar.x);
  for (let i = 0; i < p.SOLO_V90_ACTIVITY_TICKS; i++) play.act({ interact: true });
  assert.deepEqual(Object.keys(play.save.soloV90.checkpoint.partnerObservations), ["saar", "vek"]);
  walkTo(play, 2590);
  assert(p.soloV90RoleBoardReady(play.state));
  assert.equal(play.state.milestones["roles-positioned"], undefined);
  assert.deepEqual(play.save.prologue.chronicle, atEntrance.prologue.chronicle);
});

test("M016 keeps legacy checkpoints, and the live writer refuses an invented observation", () => {
  const play = rehearsal(structuredClone(atEntrance));
  const current = play.save.soloV90;
  const historical = structuredClone(current);
  delete historical.checkpoint.partnerObservations;
  assert(p.normalizeSoloV90Campaign(historical));
  const legacyPlay = rehearsal({ ...play.save, soloV90: historical });
  findBoard(legacyPlay);
  assert.equal(legacyPlay.state.partnerObservations, undefined);
  walkTo(play, 1180);
  play.commit();
  const forged = { ...play.state, partnerObservations: { saar: play.state.tick } };
  assert.equal(p.withSoloV90Checkpoint(play.save, forged, stamp), null);
});
