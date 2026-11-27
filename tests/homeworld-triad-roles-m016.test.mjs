import test from "node:test";
import assert from "node:assert/strict";
import { formationCampaignRoute, formationEnvironment, formationModel, stamp } from "./helpers/solo-v90-played-route.mjs";

const p = formationModel;
const admitted = formationCampaignRoute({ stop: "assemble" }).save;

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
