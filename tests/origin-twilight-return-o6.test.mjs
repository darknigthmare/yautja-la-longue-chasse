import assert from "node:assert/strict";
import test from "node:test";
import { applyTwilightOrderO6, town, trail, twilight, twilightAdmissionO6, twilightCheckpointO6 } from "./helpers/origin-twilight-return-o6.mjs";
import { littleTrailAdmissionO6 } from "./helpers/origin-little-trail-o6.mjs";

const order = action => ({ action });
const materials = ["lift-marker", "stow-marker", "lift-rope", "stow-rope"];
const listened = ["tov", "harek", "yena", "saar"];
const play = (save, actions) => actions.map(order).reduce(applyTwilightOrderO6, save);
const receipt = save => save.originV151.twilightReturnO6;

test("The return depends on the actual M05 receipt and both exterior sites on its real route", () => {
  const pre = littleTrailAdmissionO6();
  const full = twilightAdmissionO6();
  const partial = twilightAdmissionO6(true);
  assert.deepEqual(twilight.twilightActionsO6(pre), []);
  assert.deepEqual(twilight.twilightActionsO6(full), ["lift-marker"]);
  assert.deepEqual(twilight.twilightActionsO6(partial), ["lift-marker"]);
  const stack = twilight.twilightSiteO6("lift-marker");
  const rack = twilight.twilightSiteO6("stow-marker");
  assert.notDeepEqual(stack.point, rack.point);
  const route = town.homeworldWorldRouteV77(rack, twilight.twilightSiteO6("saar"));
  assert.equal(route.status, "reachable");
  assert.ok(route.segments.some(segment => segment.connectorId && segment.reverse === false));
  assert.equal(twilight.recordTwilightReturnO6(full, order("lift-marker"), twilightCheckpointO6(full, "stow-marker")), null);
  assert.equal(twilight.recordTwilightReturnO6(full, order("saar"), twilightCheckpointO6(full, "saar")), null);
  assert.equal(twilight.recordTwilightReturnO6(full, { action: "declare", choice: "defer" }, twilightCheckpointO6(full, "declare")), null);
  assert.equal(twilight.recordTwilightReturnO6(full, order("lift-marker"), { ...twilightCheckpointO6(partial, "lift-marker"),
    ownerCreatedAt: full.createdAt + "-foreign" }), null);
});

test("Each physical step survives a load, re-listening is non-mutating and the four encounters admit two intentions", () => {
  for (const partial of [false, true]) {
    const full = twilightAdmissionO6(partial);
    const raised = play(full, materials.slice(0, 1));
    const reloaded = town.parseSaveImport(JSON.stringify(raised)).save;
    assert.ok(reloaded);
    assert.equal(receipt(reloaded).journal.at(-1).action, "lift-marker");
    assert.deepEqual(receipt(reloaded).transfers, []);
    assert.deepEqual(twilight.twilightActionsO6(reloaded), ["stow-marker"]);
    let save = play(reloaded, materials.slice(1));
    assert.deepEqual(receipt(save).transfers, ["marker", "rope"]);
    save = play(save, listened.slice(0, 1));
    const contact = twilight.twilightSiteO6("tov");
    assert.equal(twilight.twilightInteractionO6(save, contact.levelId, contact.point, null), "tov");
    assert.equal(twilight.recordTwilightReturnO6(save, order("tov"), twilightCheckpointO6(save, "tov")), null);
    save = play(save, listened.slice(1));
    assert.deepEqual(receipt(save).observations, listened);
    assert.equal(receipt(save).resolved, false);
    const choice = partial ? "defer" : "exploration";
    const complete = applyTwilightOrderO6(save, { action: "declare", choice });
    assert.equal(receipt(complete).success, true);
    assert.equal(receipt(complete).resolved, true);
    assert.equal(receipt(complete).choice, choice);
    assert.deepEqual(receipt(complete).trail, { success: !partial, choice: partial ? "behavior" : "map" });
    for (const field of ["profile", "prologue", "youthTraining", "trophies", "loadout"]) assert.deepEqual(complete[field], full[field]);
    assert.deepEqual(complete.originV151.littleTrailO6, full.originV151.littleTrailO6);
    assert.deepEqual(twilight.twilightActionsO6(complete), []);
    assert.equal(twilight.twilightReplayOpenO6(complete), true);
    for (const id of listened) {
      const site = twilight.twilightSiteO6(id);
      assert.equal(twilight.twilightInteractionO6(complete, site.levelId, site.point, null), id);
      assert.equal(twilight.recordTwilightReturnO6(complete, order(id), twilightCheckpointO6(complete, id)), null);
    }
    assert.match(twilight.twilightReplyO6(complete, order(partial ? "harek" : "yena")), partial ? /prochaine course/ : /cartes/);
  }
});

test("A wrong site, altered evidence, or stale write cannot advance the receipt; a later E1 still imports unchanged", () => {
  const seed = twilightAdmissionO6();
  const active = play(seed, materials);
  const full = applyTwilightOrderO6(play(active, listened), { action: "declare", choice: "power" });
  assert.equal(twilight.keepsTwilightReturnO6(full, active), false);
  const replace = fields => ({ ...full, originV151: { ...full.originV151, twilightReturnO6: { ...receipt(full), ...fields } } });
  const lateEvent = receipt(full).journal.at(-1);
  const falsePosts = [...receipt(full).journal.slice(0, -1), { ...lateEvent, at: twilightCheckpointO6(seed, "lift-marker") }];
  for (const value of [
    replace({ journal: falsePosts }), replace({ observations: ["saar"] }),
    replace({ trail: { success: false, choice: "behavior" } }), replace({ transfers: ["marker"] }),
  ]) assert.equal(town.parseSaveImport(JSON.stringify(value)).failure, "invalid-save");
  assert.equal(twilight.keepsTwilightReturnO6(active, full), false);
  const profile = { ...full.profile, rankId: "elite", acquiredRankIdV166: "elite" };
  const workshop = { rankId: profile.rankId, atWorkshop: true };
  const seen = trail.examineEndingV170(full.originV151, "O6-E1", workshop);
  assert.ok(seen.ok);
  const chosen = trail.confirmEndingV170(seen.state, "O6-E1", "O6-E1", workshop);
  assert.ok(chosen.ok);
  const late = { ...full, profile, originV151: chosen.state };
  assert.equal(twilight.keepsTwilightReturnO6(full, late), true);
  assert.equal(twilight.twilightReplayOpenO6(late), false);
  const parsed = town.parseSaveImport(JSON.stringify(late));
  assert.equal(parsed.failure, null);
  assert.equal(parsed.save.originV151.ending.originEndingId, "O6-E1");
  assert.deepEqual(receipt(parsed.save), receipt(full));
});
