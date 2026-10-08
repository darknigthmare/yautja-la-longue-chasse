import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const modelBundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: root },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(modelBundle.outputFiles[0].text).toString("base64")}`);
const rules = api.DEFAULT_WAR_RULES_V6;
const requireLocalProofs = process.env.YAUTJA_REQUIRE_LOCAL_CLAN_PROOFS === "1";
const localWorkbook = new URL("../work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx", import.meta.url);
const playedFixtures = [["relay-played-checkpoint.json", 109976, 11], ["hoist-played-checkpoint.json", 106715, 9], ["hoist-delivered-checkpoint.json", 112453, 14]];
const playedPath = name => new URL("../work-local/v88/qa/" + name, import.meta.url);
const fresh = (unitId, budget = 120) => { const state = api.createWarWorksV6(budget, unitId, rules, "local"); assert(state); return state; };
const team = (state, unitId) => { const group = state.teams.find(group => group.team.unitId === unitId); assert(group); return group; };
function act(state, action, context = rules) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action, context);
  assert.deepEqual(state, before, "No input mutation"); assert(result.accepted, result.message);
  assert.equal(result.state.ravStock, result.state.lots.reduce((sum, lot) => sum + lot.rav, 0));
  assert.equal(result.state.ravStock, result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved - result.state.accounts.upkeepConsumed);
  assert(api.exportWarWorksV87(result.state, context), "Every accepted transition remains an exportable independent checkpoint");
  return result.state;
}
function denied(state, action) {
  const result = api.applyWarWorksV6(state, action);
  assert(!result.accepted, result.message); assert(!result.changed); assert.strictEqual(result.state, state);
}
function unchanged(state, action) {
  const result = api.applyWarWorksV6(state, action);
  assert(result.accepted, result.message); assert(!result.changed); assert.strictEqual(result.state, state);
}
function travel(state, teamId, destinationId) {
  state = act(state, { kind: "plan", teamId, destinationId });
  let n = 0;
  while (state.teams.find(group => group.team.id === teamId).route) {
    assert(n++ < 20); state = act(state, { kind: "advance", teamId });
  }
  assert.equal(state.teams.find(group => group.team.id === teamId).territoryId, destinationId);
  return state;
}
function install(state, teamId, structureId) {
  state = act(state, { kind: "observe", teamId });
  state = act(state, { kind: "reserve-kit", structureId, territoryId: "W3-K01" });
  const workId = state.works.at(-1).id;
  state = act(state, { kind: "load", teamId, workId }); state = act(state, { kind: "unload", teamId, workId });
  const def = api.warWorksDefinitionsV6().find(def => def.id === structureId);
  for (let n = 0; n < def.delayTurns; n++) state = act(state, { kind: "work", teamId, workId });
  return { state, workId };
}
function bridgeBase() {
  let state = fresh("W3-U19"), receiverId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId: receiverId });
  // The second shore is reached by ordinary L01/L32, never by the unbuilt L61.
  state = travel(state, receiverId, "W3-K02"); state = travel(state, receiverId, "W3-K08");
  state = act(state, { kind: "observe", teamId: receiverId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S03", territoryId: "W3-K08" });
  const cacheId = state.works[0].id;
  state = travel(state, receiverId, "W3-K02"); state = travel(state, receiverId, "W3-K01");
  state = act(state, { kind: "load", teamId: receiverId, workId: cacheId });
  state = travel(state, receiverId, "W3-K08");
  state = act(state, { kind: "unload", teamId: receiverId, workId: cacheId });
  for (let n = 0; n < 2; n++) state = act(state, { kind: "work", teamId: receiverId, workId: cacheId });
  state = act(state, { kind: "release", teamId: receiverId });
  state = travel(state, receiverId, "W3-K02"); state = travel(state, receiverId, "W3-K01");
  state = act(state, { kind: "load-rav", teamId: receiverId, rav: 20 });
  state = travel(state, receiverId, "W3-K08");
  state = act(state, { kind: "deposit-rav", teamId: receiverId, workId: cacheId });
  state = travel(state, receiverId, "W3-K02"); state = travel(state, receiverId, "W3-K01");
  state = act(state, { kind: "recruit", unitId: "W3-U12" });
  for (let n = 0; n < rules.units.find(unit => unit.id === "W3-U12").delayTurns; n++) state = act(state, { kind: "wait" });
  const artisanId = team(state, "W3-U12").team.id;
  state = act(state, { kind: "reserve-kit", structureId: "W3-S08", territoryId: "W3-K01", passageId: "W3-L61" });
  const workId = state.works.at(-1).id;
  state = act(state, { kind: "load", teamId: artisanId, workId }); state = act(state, { kind: "unload", teamId: artisanId, workId });
  denied(state, { kind: "load-rav", teamId: artisanId, rav: 1 });
  return { state, artisanId, workId, receiverId, cacheId };
}
function bridgeReady() {
  let { state, artisanId, workId, receiverId, cacheId } = bridgeBase();
  for (let slot = 1; slot <= 2; slot++) {
    state = act(state, { kind: "load-anchor", teamId: artisanId, workId });
    state = act(state, { kind: "place-anchor", teamId: artisanId, workId });
  }
  state = act(state, { kind: "load-anchor", teamId: artisanId, workId });
  state = travel(state, artisanId, "W3-K02"); state = travel(state, artisanId, "W3-K08");
  state = act(state, { kind: "place-anchor", teamId: artisanId, workId });
  assert.equal(state.works.find(work => work.id === workId).phase, "ready"); assert.equal(state.works.find(work => work.id === workId).operatorTeamId, null);
  state = travel(state, artisanId, "W3-K02"); state = travel(state, artisanId, "W3-K01");
  state = act(state, { kind: "assign", teamId: artisanId, workId });
  const receiver = state.teams.find(group => group.team.id === receiverId);
  return { state, artisanId, workId, receiverId, cacheId, memberIds: receiver.team.members.map(member => member.id) };
}
const checkpoint = state => { const text = api.exportWarWorksV87(state); assert(text); return text; };
const importState = text => { const result = api.importWarWorksV87(text); assert(result.state, result.message); return result.state; };
function corrupted(state, modify) {
  const file = JSON.parse(checkpoint(state)); modify(file.exercise);
  assert.equal(api.importWarWorksV87(JSON.stringify(file)).state, null);
}

test("S01/S06/S08 read the attested price, upkeep, delays and operators without modifying the original eight definitions", () => {
  const defs = api.warWorksDefinitionsV6(), ids = ["W3-S01", "W3-S06", "W3-S08"];
  assert.equal(defs.length, 11);
  assert.deepEqual(defs.filter(def => ids.includes(def.id)).map(def => [def.id, def.costRav, def.upkeepRav, def.delayTurns, def.operatorUnitId, def.sourceRow]),
    [["W3-S01", 6, 1, 2, "W3-U02", 6], ["W3-S06", 10, 1, 2, "W3-U13", 11], ["W3-S08", 14, 2, 3, "W3-U12", 13]]);
  assert.equal(api.WAR_BIBLE_SOURCE_SHA_V6, "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183");
  const state = fresh("W3-U02"); const key = JSON.parse(state.rulesKey);
  assert.deepEqual(key.definitions.map(def => def.id), ["W3-S02", "W3-S05", "W3-S07", "W3-S03", "W3-S04"]);
  assert.equal("terrain" in state, false);
  const draft = install(state, state.teams[0].team.id, "W3-S01").state;
  corrupted(state, copy => { copy.terrain = structuredClone(draft.terrain); copy.terrain.configurations = []; });
  const global = api.createWarWorksV6(120, "W3-U02", rules, "front"), observed = act(global, { kind: "observe", teamId: global.teams[0].team.id });
  denied(observed, { kind: "reserve-kit", structureId: "W3-S01", territoryId: "W3-K01" });
});

test("local attested workbook has the exact embedded source SHA256", { skip: !requireLocalProofs && !existsSync(localWorkbook) && "Local source workbook is absent from this checkout" }, () => {
  assert.equal(createHash("sha256").update(readFileSync(localWorkbook)).digest("hex"), api.WAR_BIBLE_SOURCE_SHA_V6);
});

test("an elevated occupied watch sees over a low screen, preserves a dated record and cannot see through opaque rock", () => {
  let { state, workId } = install(fresh("W3-U02"), "v6-works-team-1", "W3-S01");
  const teamId = state.teams[0].team.id, xp = structuredClone(state.teams[0].team.members.map(member => member.xp));
  const view = api.evaluateWarTerrainV89(state, workId, "far-approach");
  assert(view.visible); assert(view.groundBlocked); assert(!view.blocked);
  state = act(state, { kind: "scan-terrain", teamId, workId, targetId: "far-approach" });
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), xp);
  unchanged(state, { kind: "scan-terrain", teamId, workId, targetId: "far-approach" });
  const recorded = structuredClone(state.terrain.sightings[0]);
  state = act(state, { kind: "terrain-hypothesis", workId, profile: "opaque-rock" });
  assert(api.evaluateWarTerrainV89(state, workId, "far-approach").blocked);
  denied(state, { kind: "scan-terrain", teamId, workId, targetId: "far-approach" });
  denied(state, { kind: "scan-terrain", teamId, workId, targetId: "invented-enemy" });
  assert.deepEqual(state.terrain.sightings[0], recorded);
  state = act(state, { kind: "wait" }); assert(state.turn > recorded.turn);
  state = act(state, { kind: "release", teamId });
  const empty = api.evaluateWarTerrainV89(state, workId, "near-approach");
  assert(!empty.visible); assert(!empty.protectedFromProbe); assert(!empty.operational);
  denied(state, { kind: "scan-terrain", teamId, workId, targetId: "near-approach" });
  corrupted(state, copy => { copy.terrain.sightings[0].profile = "opaque-rock"; });
});

test("a commissioned watch loses its effect when real local upkeep stock is exhausted", () => {
  let { state, workId } = install(fresh("W3-U02", 20), "v6-works-team-1", "W3-S01");
  const teamId = state.teams[0].team.id;
  for (let n = 0; state.ravStock > 0; n++) { assert(n < 20); state = act(state, { kind: "wait" }); }
  const view = api.evaluateWarTerrainV89(state, workId, "near-approach");
  assert(view.occupied); assert(!view.supplied); assert(!view.visible);
  denied(state, { kind: "scan-terrain", teamId, workId, targetId: "near-approach" });
  assert.equal(state.accounts.upkeepConsumed + state.accounts.kitsReserved, state.startingRav);
});

test("platform orientation changes its actual arc and directional cover, while the below-platform blind spot stays", () => {
  let { state, workId } = install(fresh("W3-U13"), "v6-works-team-1", "W3-S06");
  const teamId = state.teams[0].team.id;
  assert(api.evaluateWarTerrainV89(state, workId, "near-approach").visible);
  assert(api.evaluateWarTerrainV89(state, workId, "near-approach").protectedFromProbe);
  assert(!api.evaluateWarTerrainV89(state, workId, "rear-approach").visible);
  const below = api.evaluateWarTerrainV89(state, workId, "under-platform"); assert(below.blindBelow); assert(!below.visible); assert(!below.protectedFromProbe);
  denied(state, { kind: "scan-terrain", teamId, workId, targetId: "under-platform" });
  const turn = state.turn, rav = state.ravStock, xp = state.teams[0].team.members.map(member => member.xp);
  state = act(state, { kind: "orient-platform", teamId, workId, facing: "west" });
  assert.equal(state.turn, turn + 1); assert.equal(state.ravStock, rav - 3);
  assert(!api.evaluateWarTerrainV89(state, workId, "near-approach").protectedFromProbe);
  assert(api.evaluateWarTerrainV89(state, workId, "rear-approach").visible);
  unchanged(state, { kind: "orient-platform", teamId, workId, facing: "west" });
  state = act(state, { kind: "scan-terrain", teamId, workId, targetId: "rear-approach" });
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), xp);
  assert.equal(api.estimateWarWorksTeamV6(state, teamId).defensePercent, 0);
  state = act(state, { kind: "terrain-hypothesis", workId, profile: "opaque-rock" });
  state = act(state, { kind: "orient-platform", teamId, workId, facing: "east" });
  const behindRock = api.evaluateWarTerrainV89(state, workId, "far-approach");
  assert(behindRock.blocked); assert(!behindRock.protectedFromProbe);
});

test("the bridge requires exactly three physically transported pieces and does not build through wait or the generic work action", () => {
  let { state, artisanId, workId } = bridgeBase();
  const kitId = state.works.find(work => work.id === workId).kitId, paid = state.accounts.kitsReserved;
  denied(state, { kind: "work", teamId: artisanId, workId });
  state = act(state, { kind: "wait" }); assert.equal(state.works.find(work => work.id === workId).workedTurns, 0);
  for (let slot = 1; slot <= 2; slot++) {
    state = act(state, { kind: "load-anchor", teamId: artisanId, workId });
    unchanged(state, { kind: "load-anchor", teamId: artisanId, workId });
    assert.equal(state.terrain.anchorCargo[0].slot, slot);
    state = act(state, { kind: "place-anchor", teamId: artisanId, workId });
  }
  state = act(state, { kind: "load-anchor", teamId: artisanId, workId });
  denied(state, { kind: "place-anchor", teamId: artisanId, workId });
  denied(state, { kind: "observe", teamId: artisanId });
  state = act(state, { kind: "plan", teamId: artisanId, destinationId: "W3-K08" });
  assert(!team(state, "W3-U12").route.passageIds.includes("W3-L61"), "The cargo takes a real permitted route around the unfinished bridge");
  while (team(state, "W3-U12").route) state = act(state, { kind: "advance", teamId: artisanId });
  state = act(state, { kind: "place-anchor", teamId: artisanId, workId });
  assert.deepEqual(state.terrain.anchors.map(anchor => [anchor.slot, anchor.territoryId]), [[1, "W3-K01"], [2, "W3-K01"], [3, "W3-K08"]]);
  assert.equal(state.works.find(work => work.id === workId).kitId, kitId); assert.equal(state.accounts.kitsReserved, paid);
  assert.equal(state.works.find(work => work.id === workId).phase, "ready"); assert.equal(state.works.find(work => work.id === workId).operatorTeamId, null);
  denied(state, { kind: "load-anchor", teamId: artisanId, workId });
  denied(state, { kind: "begin-bridge", teamId: artisanId, workId });
  corrupted(state, copy => { copy.terrain.anchors[2].territoryId = "W3-K01"; });
  corrupted(state, copy => { copy.terrain.anchors[1].slot = 1; });
  corrupted(state, copy => { copy.terrain.anchors[0].loadedTurn = copy.terrain.anchors[0].turn; });
  corrupted(state, copy => { copy.terrain.traversals[1].turn = copy.terrain.traversals[0].turn; });
});

test("an injured anchor crew cannot load a component, and a bridge cannot carry the team's RAV lot", () => {
  let base = bridgeBase(), state = base.state;
  state = act(state, { kind: "declare-patient", teamId: base.artisanId, memberId: team(state, "W3-U12").team.members[0].id });
  denied(state, { kind: "load-anchor", teamId: base.artisanId, workId: base.workId });
  let ready = bridgeReady(); state = ready.state;
  state = act(state, { kind: "load-rav", teamId: ready.receiverId, rav: 2 });
  denied(state, { kind: "begin-bridge", teamId: ready.receiverId, workId: ready.workId });
  assert.equal(api.warWorksCarriedRavV87(state, ready.receiverId), 2);
});

test("individual crossing preserves half-crossed positions, blocks other front orders and charges a single completed global passage", () => {
  let { state, workId, receiverId, memberIds, artisanId, cacheId } = bridgeReady();
  assert(memberIds.length > 1);
  const before = structuredClone(state), xp = team(state, "W3-U19").team.members.map(member => member.xp);
  state = act(state, { kind: "begin-bridge", teamId: receiverId, workId });
  const transitId = api.warBridgeActiveV89(state).id;
  state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  const half = state, transit = api.warBridgeActiveV89(state);
  assert.equal(api.warBridgeMemberSiteV89(transit, memberIds[0]), "W3-K08");
  assert.equal(api.warBridgeMemberSiteV89(transit, memberIds[1]), "W3-K01");
  assert.equal(team(state, "W3-U19").territoryId, "W3-K01", "The assembly location does not pretend all members have crossed");
  assert.equal(state.turn, before.turn); assert.equal(state.ravStock, before.ravStock);
  unchanged(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  denied(state, { kind: "wait" }); denied(state, { kind: "observe", teamId: receiverId }); denied(state, { kind: "release", teamId: artisanId });
  denied(state, { kind: "cancel-bridge", transitId, teamId: receiverId });
  state = act(state, { kind: "close-passages", ids: ["W3-L61"] });
  denied(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[1] });
  assert.equal(api.warBridgeMemberSiteV89(api.warBridgeActiveV89(state), memberIds[0]), "W3-K08");
  state = act(state, { kind: "close-passages", ids: [] });
  const resumed = importState(checkpoint(state)); assert.deepEqual(resumed, state); state = resumed;
  for (const memberId of memberIds.slice(1)) state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId });
  assert.equal(api.warBridgeActiveV89(state), undefined); assert.equal(state.turn, before.turn + 1);
  assert.equal(team(state, "W3-U19").territoryId, "W3-K08"); assert.equal(team(state, "W3-U12").territoryId, "W3-K01");
  assert.deepEqual(team(state, "W3-U19").team.members.map(member => member.xp), xp);
  const arrivalTransfers = state.transfers.slice(before.transfers.length);
  assert(arrivalTransfers.some(transfer => transfer.fromId === "rav:cache:" + cacheId), "Arrival uses the cache physically supplied by U19");
  assert.equal(api.warWorksDepotV87(before) - api.warWorksDepotV87(state), 4, "Only the two source operators and bridge draw from the source depot");
  assert.equal(state.terrain.transits[0].steps.length, memberIds.length);
  unchanged(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds.at(-1) });
  denied(state, { kind: "begin-bridge", teamId: receiverId, workId });
  corrupted(half, copy => { copy.terrain.transits[0].memberIds[1] = copy.terrain.transits[0].memberIds[0]; });
  corrupted(half, copy => { copy.terrain.transits[0].steps.push(...memberIds.slice(1).map(memberId => ({ memberId, direction: "forward" }))); });
});

test("the individual return keeps every member and cannot be replaced by a reset or a whole-party teleport", () => {
  let { state, workId, receiverId, memberIds } = bridgeReady();
  const before = state;
  state = act(state, { kind: "begin-bridge", teamId: receiverId, workId });
  let transitId = api.warBridgeActiveV89(state).id;
  state = act(state, { kind: "cancel-bridge", transitId, teamId: receiverId });
  assert.equal(state.turn, before.turn); assert.equal(state.ravStock, before.ravStock);
  state = act(state, { kind: "begin-bridge", teamId: receiverId, workId }); transitId = api.warBridgeActiveV89(state).id;
  state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[1] });
  state = act(state, { kind: "return-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  denied(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[2] });
  unchanged(state, { kind: "return-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  state = importState(checkpoint(state));
  state = act(state, { kind: "return-bridge", transitId, teamId: receiverId, memberId: memberIds[1] });
  assert.equal(state.turn, before.turn + 1);
  assert.equal(team(state, "W3-U19").territoryId, "W3-K01");
  assert.equal(state.terrain.transits.at(-1).completed, "returned");
  assert.equal(state.terrain.transits.at(-1).steps.length, 4);
  assert.equal(state.terrain.traversals.filter(step => step.teamId === receiverId && step.passageId === "W3-L61").length, 0);
  assert.deepEqual(team(state, "W3-U19").team.members.map(member => member.id), memberIds);
  unchanged(state, { kind: "return-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  corrupted(state, copy => { copy.terrain.transits.at(-1).startedTurn = copy.terrain.transits[0].startedTurn - 1; });
});

test("arrival at the depleted remote cache is rationed even while the bridge's source depot can pay", () => {
  let { state, workId, receiverId, memberIds, cacheId } = bridgeReady();
  for (let n = 0; api.warWorksCacheRavV87(state, cacheId) > 0; n++) { assert(n < 20); state = act(state, { kind: "wait" }); }
  assert(api.warWorksDepotV87(state) >= 10);
  const before = structuredClone(state);
  state = act(state, { kind: "begin-bridge", teamId: receiverId, workId });
  const transitId = api.warBridgeActiveV89(state).id;
  for (const memberId of memberIds) state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId });
  assert.equal(state.lastTeamSupply.find(supply => supply.teamId === receiverId).paid, 0);
  assert.equal(api.warWorksDepotV87(before) - api.warWorksDepotV87(state), 4);
  assert.equal(api.warWorksCacheRavV87(state, cacheId), 0);
  assert.deepEqual(team(state, "W3-U19").team.members, team(before, "W3-U19").team.members);
});

test("strict optional checkpoint schema rejects foreign ownership, copied components and unrecorded bridge jumps", () => {
  let { state, workId, receiverId, memberIds } = bridgeReady();
  state = act(state, { kind: "begin-bridge", teamId: receiverId, workId });
  const transitId = api.warBridgeActiveV89(state).id;
  state = act(state, { kind: "cross-bridge", transitId, teamId: receiverId, memberId: memberIds[0] });
  corrupted(state, copy => { copy.terrain.ownership = ["W3-K08"]; });
  corrupted(state, copy => { copy.ownership = ["W3-K08"]; });
  corrupted(state, copy => { copy.terrain.geometryKey = "guessed-next-geometry"; });
  corrupted(state, copy => { copy.terrain.transits[0].completed = "arrived"; copy.terrain.transits[0].resolvedTurn = copy.turn; });
  corrupted(state, copy => { copy.terrain.transits[0].steps.push(copy.terrain.transits[0].steps[0]); });
  corrupted(state, copy => { copy.terrain.transits[0].operatorMemberIds.pop(); });
  const older = structuredClone(rules); older.entries = older.entries.filter(entry => !["W3-S01", "W3-S06", "W3-S08"].includes(entry.id));
  assert.equal(api.importWarWorksV87(checkpoint(state), older).state, null);
  let legacy = fresh("W3-U17"); legacy = act(legacy, { kind: "observe", teamId: legacy.teams[0].team.id });
  const text = checkpoint(legacy), imported = api.importWarWorksV87(text, older);
  assert(imported.state, imported.message); assert.equal(api.exportWarWorksV87(imported.state, older), text);
  assert.equal("terrain" in imported.state, false); assert.equal("infrastructure" in imported.state, false); assert.equal("extraction" in imported.state, false);
});

test("three real played V88 checkpoint files keep their bytes, historical turns and absent V89 extension", { skip: !requireLocalProofs && !playedFixtures.some(([name]) => existsSync(playedPath(name))) && "Local played V88 files are absent from this checkout" }, () => {
  const older = structuredClone(rules); older.entries = older.entries.filter(entry => !["W3-S01", "W3-S06", "W3-S08"].includes(entry.id));
  for (const [name, bytes, turn] of playedFixtures) {
    const path = playedPath(name);
    assert(existsSync(path), "Required real played fixture missing: " + name);
    const buffer = readFileSync(path), text = buffer.toString("utf8");
    assert.equal(buffer.length, bytes);
    const resumed = importState(text);
    assert.equal(resumed.turn, turn); assert.equal("terrain" in resumed, false);
    assert.equal(checkpoint(resumed), text, "V88 file bytes are preserved exactly");
    const compatibility = api.importWarWorksV87(text, older); assert(compatibility.state, compatibility.message);
    assert.equal(api.exportWarWorksV87(compatibility.state, older), text);
  }
});

// Actual panel handlers in a transparent hook scheduler. This verifies wiring
// and rendered content, not browser layout, downloads or deployment.
const hooks = `let values=[],cursor=0;
export const reset=()=>{values=[];cursor=0}; export const begin=()=>{cursor=0};
export const exercise=()=>values.find(value=>value?.state?.context==='free-workshop')?.state;
export function useMemo(factory){const slot=cursor++;values[slot]=factory();return values[slot]}
export function useState(initial){const slot=cursor++;if(!(slot in values))values[slot]=typeof initial==='function'?initial():initial;return [values[slot],next=>{values[slot]=typeof next==='function'?next(values[slot]):next}]}
export function useReducer(reducer,arg,initialize){const slot=cursor++;if(!(slot in values))values[slot]=initialize?initialize(arg):arg;return [values[slot],event=>{values[slot]=reducer(values[slot],event)}]}`;
const uiBundle = await build({ stdin: { contents: "export {default as Panel} from './app/game/ClanWarWorksV6'; export {DEFAULT_WAR_RULES_V6 as rules} from './app/game/systems/clanWarBibleV6'; export * from 'terrain-ui-hooks';", resolveDir: root, loader: "tsx" },
  jsx: "automatic", bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "transparent-terrain-hooks", setup(builder) {
    builder.onResolve({ filter: /^(react|terrain-ui-hooks)$/ }, () => ({ path: "hooks", namespace: "test-hooks" }));
    builder.onLoad({ filter: /.*/, namespace: "test-hooks" }, () => ({ contents: hooks, loader: "js" }));
    builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "styles", namespace: "test-css" }));
    builder.onLoad({ filter: /.*/, namespace: "test-css" }, () => ({ contents: "export default new Proxy({}, {get:(_,key)=>String(key)});", loader: "js" }));
  } }] });
const uiApi = await import(`data:text/javascript;base64,${Buffer.from(uiBundle.outputFiles[0].text).toString("base64")}`);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value?.props ? [value, ...nodes(value.props.children)] : [];
const textOf = value => Array.isArray(value) ? value.map(textOf).join("") : value?.props ? textOf(value.props.children) : value == null || typeof value === "boolean" ? "" : String(value);
function mount(unit) {
  uiApi.reset(); let tree;
  const render = () => { uiApi.begin(); tree = uiApi.Panel({ rules: uiApi.rules }); }; render();
  const ui = {
    state: () => structuredClone(uiApi.exercise()), nodes: () => nodes(tree), text: () => textOf(tree),
    click(label, workId) { const scope = workId ? nodes(tree).find(node => node.props["data-work-id"] === workId) : tree; assert(scope); const button = nodes(scope).find(node => node.type === "button" && textOf(node) === label); assert(button, "Missing button: " + label); assert(!button.props.disabled); button.props.onClick(); render(); },
    fill(label, value) { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(label)); assert(owner, "Missing label: " + label); const field = nodes(owner).find(node => ["select", "input", "textarea"].includes(node.type)); assert(field && !field.props.readOnly); field.props.onChange({ target: { value } }); render(); },
    close(passageId, checked) { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(passageId + " · ")); const checkbox = nodes(owner).find(node => node.props.type === "checkbox"); assert(checkbox); checkbox.props.onChange({ target: { checked } }); render(); },
    travel(teamId, destinationId) { this.fill("Équipe à commander", teamId); this.fill("Destination de cette équipe", destinationId); this.click("Préparer le trajet" + (this.state().teams.find(group => group.team.id === teamId).payloadWorkId ? " du kit" : "")); let n = 0; while (this.state().teams.find(group => group.team.id === teamId).route) { assert(n++ < 20); this.click("Exécuter un passage"); } },
    observe() { this.click("Reconnaître ici · 4 XP une fois"); },
    reserve(id, passageId, site = "W3-K01") { this.fill("Ouvrage", id); this.fill("Site du chantier", site); if (passageId) this.fill("Passage précis de l’ouvrage", passageId); this.click("Réserver le kit au départ"); },
    export() { this.click("Afficher le JSON de reprise"); const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith("JSON de reprise copiable")); return nodes(owner).find(node => node.type === "textarea").props.value; },
    restore(text) { this.click("Coller un JSON de reprise"); this.fill("JSON de reprise à coller", text); this.click("Valider le JSON collé"); this.click("Préparer la reprise sélectionnée"); this.click("Confirmer la reprise de l’exercice"); },
  };
  ui.fill("Équipe équipée au départ", unit); ui.fill("Budget choisi · RAV", "120"); ui.click("Préparer un nouvel exercice"); ui.click("Confirmer le nouveau départ");
  return ui;
}

test("the actual panel displays native terrain props, blocked rays, dated sight records and unchanged XP", () => {
  const ui = mount("W3-U02"); ui.observe(); ui.reserve("W3-S01"); ui.click("Charger avec l’équipe choisie"); ui.click("Livrer avec le vrai porteur");
  ui.click("Accomplir un tour de travaux"); ui.click("Accomplir un tour de travaux");
  assert(ui.nodes().some(node => node.props["data-terrain-work"])); assert.match(ui.text(), /Terrain local de simulation/);
  const images = ui.nodes().filter(node => node.type === "image");
  assert(images.some(node => node.props.href === "/game/homeworld/v76/architecture/rampart-watch.png"));
  for (const image of images) assert(existsSync(new URL("../public" + image.props.href, import.meta.url)), "Native prop must exist");
  ui.fill("Repère du terrain", "far-approach"); const before = ui.state(); ui.click("Dater ce relevé de terrain");
  assert.equal(ui.state().turn, before.turn + 1); assert.deepEqual(ui.state().teams[0].team.members, before.teams[0].team.members);
  assert(ui.nodes().some(node => node.props["data-terrain-sighting"] === "far-approach"));
  const recorded = ui.state(); ui.click("Dater ce relevé de terrain"); assert.deepEqual(ui.state(), recorded);
  ui.fill("Obstacle de cette simulation", "opaque-rock"); const blocked = ui.state(); ui.click("Dater ce relevé de terrain"); assert.deepEqual(ui.state(), blocked);
  assert.match(ui.text(), /rayon rencontre l’obstacle opaque/);
  const exported = ui.export(); ui.click("Écouler un tour sans travaux"); ui.restore(exported); assert.deepEqual(ui.state(), blocked);
});

test("the actual panel builds three anchors on real shores and resumes a half-crossed member without moving the rest", () => {
  const ui = mount("W3-U19"), receiverId = ui.state().teams[0].team.id;
  ui.observe(); ui.travel(receiverId, "W3-K02"); ui.travel(receiverId, "W3-K08"); ui.observe();
  ui.reserve("W3-S03", undefined, "W3-K08"); ui.travel(receiverId, "W3-K02"); ui.travel(receiverId, "W3-K01"); ui.click("Charger avec l’équipe choisie");
  ui.travel(receiverId, "W3-K08"); ui.click("Livrer avec le vrai porteur"); ui.click("Accomplir un tour de travaux"); ui.click("Accomplir un tour de travaux");
  ui.click("Libérer les opérateurs ou la garde"); ui.travel(receiverId, "W3-K02"); ui.travel(receiverId, "W3-K01");
  ui.fill("Quantité pour l’équipe sélectionnée", "20"); ui.click("Charger les RAV au dépôt");
  ui.travel(receiverId, "W3-K08"); ui.click("Livrer le lot RAV dans cette cache"); ui.travel(receiverId, "W3-K02"); ui.travel(receiverId, "W3-K01");
  ui.fill("Profil d’opérateur", "W3-U12"); ui.click("Réserver une formation volontaire");
  for (let n = 0; n < rules.units.find(unit => unit.id === "W3-U12").delayTurns; n++) ui.click("Écouler un tour sans travaux");
  const artisan = ui.state().teams.find(group => group.team.unitId === "W3-U12").team.id;
  ui.fill("Équipe à commander", artisan); ui.reserve("W3-S08", "W3-L61"); ui.click("Charger avec l’équipe choisie"); ui.click("Livrer avec le vrai porteur");
  for (let n = 0; n < 2; n++) { ui.click("Charger un ancrage du kit"); ui.click("Poser l’ancrage porté ici"); }
  ui.click("Charger un ancrage du kit"); const before = ui.state(); ui.click("Poser l’ancrage porté ici"); assert.deepEqual(ui.state(), before);
  ui.travel(artisan, "W3-K02"); ui.travel(artisan, "W3-K08"); ui.click("Poser l’ancrage porté ici");
  assert.equal(ui.nodes().filter(node => node.props["data-anchor-state"] === "placed").length, 3);
  ui.travel(artisan, "W3-K02"); ui.travel(artisan, "W3-K01"); ui.click("Affecter l’équipe choisie", ui.state().works.find(work => work.structureId === "W3-S08").id);
  const receiver = ui.state().teams.find(group => group.team.id === receiverId), memberIds = receiver.team.members.map(member => member.id);
  ui.fill("Équipe à commander", receiver.team.id); ui.click("Préparer le passage individuel par W3-L61");
  ui.click("Franchir avec " + memberIds[0]); const half = ui.state();
  assert(ui.nodes().some(node => node.props["data-bridge-transit"])); assert.match(ui.text(), /Une personne à la fois/);
  ui.click("Écouler un tour sans travaux"); assert.deepEqual(ui.state(), half);
  const exported = ui.export(); ui.close("W3-L61", true); const closed = ui.state(); ui.click("Franchir avec " + memberIds[1]); assert.deepEqual(ui.state(), closed);
  ui.restore(exported); assert.deepEqual(ui.state(), half);
  for (const memberId of memberIds.slice(1)) ui.click("Franchir avec " + memberId);
  assert.equal(ui.state().teams.find(group => group.team.id === receiver.team.id).territoryId, "W3-K08");
  assert.equal(ui.state().turn, half.turn + 1);
  assert.equal("campaign" in ui.state(), false);
});
