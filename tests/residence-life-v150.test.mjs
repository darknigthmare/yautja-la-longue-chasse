import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real module graph: village geometry, walkability, residence rules. Nothing mocked.
const source = homeworldSceneSsrV78();
const L = source.load("app/game/systems/residenceLifeV150.ts");
const R = source.load("app/game/systems/residenceV149.ts");
const G = source.load("app/game/systems/homeworldRegionsV68.ts");

const ctx = (atHouseId, rankId = "young-blood") => ({ rankId, atHouseId, regionAllowed: () => true });
const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const field = (state, runId, actions) => actions.reduce((s, action) =>
  R.recordResidenceFieldEventV149(s, { regionId: "luminous-marshes", runId, action }).state, state);
function livingAtCm07(extraRespectRuns = 0) {
  let s = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", ctx("HOME-CM07")));
  s = field(s, "r1", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM07", 0, ctx("HOME-CM07")));
  s = field(s, "r2", ["track", "ward", "recover"]);
  for (let i = 0; i < extraRespectRuns; i++) s = field(s, `extra-${i}`, ["track", "ward", "recover", "report"]);
  return ok(R.activateFirstResidenceV149(s, "HOME-CM07", ctx("HOME-CM07")));
}

test("every guest of every house has a real route: walkable for the player's size from home to the door", () => {
  let checked = 0;
  for (const house of R.RESIDENCE_HOUSES_V149) for (const guest of L.GUEST_IDS_V150) {
    const route = L.guestRouteV150(house.id, guest);
    assert.ok(route, `${house.id} ${guest}`);
    for (let i = 1; i < route.length; i++) assert.ok(L.segmentWalkableV150(house.regionId, route[i - 1], route[i]), `${house.id} ${guest} leg ${i}`);
    const door = L.houseDoorApproachV150(house.id);
    assert.deepEqual(route.at(-1), door);
    checked++;
  }
  assert.equal(checked, 80);
});

test("acceptance BUILD5-08: an invited guest arrives by that route, takes a free place, then leaves the same way", () => {
  const residence = livingAtCm07();
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "artisan", ctx("HOME-CM07")));
  assert.equal(L.inviteGuestV150(life, residence, "guide", ctx("HOME-CM07")).ok, false, "one visit at a time before « recevoir »");
  // The hunter is in another region: nothing moves.
  let settled = L.settleResidenceLifeV150(life, residence, { regionId: "ash-marches", runId: "x", tick: 10, zone: "village", buildingId: null });
  assert.equal(settled.state.visits[0].stage, "invited");
  // In the marsh village: the guest sets out.
  settled = L.settleResidenceLifeV150(settled.state, residence, { regionId: "luminous-marshes", runId: "run-9", tick: 1000, zone: "village", buildingId: null });
  life = settled.state;
  const visit = life.visits[0];
  assert.equal(visit.stage, "under-way");
  assert.equal(visit.place, "workshop", "the travel container occupies the threshold bench");
  const route = L.guestRouteV150("HOME-CM07", "artisan");
  const length = L.routeLengthV150(route), walkTicks = Math.ceil(length / L.GUEST_SPEED_V150 * 60);
  const resident = L.guestResidentV150("luminous-marshes", "artisan");
  assert.deepEqual(L.visitViewV150(visit, 1000).position, L.guestStartV150("luminous-marshes", resident));
  for (let tick = 1000; tick < 1000 + walkTicks; tick += 30) {
    const view = L.visitViewV150(visit, tick);
    assert.equal(view.stage, "arriving");
    assert.ok(G.isHomeworldRegionWalkableV68("luminous-marshes", "village", view.position, 0, null), `walkable at ${tick}`);
  }
  assert.equal(L.visitViewV150(visit, 1000 + walkTicks + 60).stage, "present");
  assert.equal(L.visitViewV150(visit, 1000 + walkTicks + 60).inside, true);
  const leaveTick = 1000 + walkTicks + L.GUEST_STAY_SECONDS_V150 * 60 + 30;
  assert.equal(L.visitViewV150(visit, leaveTick).stage, "leaving");
  const goneTick = 1000 + 2 * walkTicks + L.GUEST_STAY_SECONDS_V150 * 60 + 10;
  assert.equal(L.visitViewV150(visit, goneTick).stage, "gone");
  settled = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "run-9", tick: goneTick, zone: "village", buildingId: null });
  assert.equal(settled.state.visits.length, 0);
  assert.deepEqual(settled.state.history, [{ houseId: "HOME-CM07", guestId: "artisan", place: "workshop", runId: "run-9" }]);
  assert.equal(residence.objects.length, 2, "a guest is never added to the residence (R19)");
});

test("an unfinished walk restarts from home on the next run; a reload keeps the visit", () => {
  const residence = livingAtCm07();
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "healer", ctx("HOME-CM07")));
  life = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "a", tick: 50, zone: "village", buildingId: null }).state;
  const reloaded = L.normalizeResidenceLifeV150(JSON.parse(JSON.stringify(life)));
  assert.deepEqual(reloaded, life);
  const next = L.settleResidenceLifeV150(reloaded, residence, { regionId: "luminous-marshes", runId: "b", tick: 7, zone: "village", buildingId: null }).state;
  assert.equal(next.visits[0].runId, "b");
  assert.equal(next.visits[0].startTick, 7);
  assert.equal(L.normalizeResidenceLifeV150({ version: 2 }), null);
});

test("at the « recevoir » threshold two guests can come; they never take the same place", () => {
  const residence = livingAtCm07(3);
  assert.ok(R.respectForV149(residence, "CM07") >= 80);
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "guide", ctx("HOME-CM07")));
  life = ok(L.inviteGuestV150(life, residence, "keeper", ctx("HOME-CM07")));
  assert.equal(L.inviteGuestV150(life, residence, "healer", ctx("HOME-CM07")).ok, false);
  life = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "r", tick: 0, zone: "village", buildingId: null }).state;
  const places = life.visits.map(v => v.place);
  assert.equal(new Set(places).size, 2);
  assert.ok(!places.includes(null));
});

test("absence is counted in runs elsewhere (R17); the mark is read at the threshold", () => {
  const residence = livingAtCm07();
  let life = L.emptyResidenceLifeV150();
  for (const run of ["g1", "g2", "g3"]) life = L.settleResidenceLifeV150(life, residence, { regionId: "glass-desert", runId: run, tick: 0, zone: "village", buildingId: null }).state;
  assert.equal(life.absence["HOME-CM07"].runs.length, 3);
  const home = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "h", tick: 0, zone: "interior", buildingId: "house-n-0" });
  assert.equal(home.state.rooms["HOME-CM07"].threshold, "dusty");
  assert.deepEqual(home.events, ["Une marque attend au seuil."]);
  assert.equal(home.state.absence["HOME-CM07"].runs.length, 0);
  assert.equal(L.inspectThresholdMarkV150(home.state, residence, ctx(null)).ok, false);
  const read = ok(L.inspectThresholdMarkV150(home.state, residence, ctx("HOME-CM07")));
  assert.equal(read.rooms["HOME-CM07"].threshold, "ordered");
});

test("reminders follow the workbook triggers and are read once", () => {
  const residence = livingAtCm07();
  let life = L.emptyResidenceLifeV150();
  const reminders = L.remindersV150(life, residence, ctx("HOME-CM07"));
  assert.deepEqual(reminders.map(r => r.id), ["HOME-E01:HOME-CM07"]);
  life = L.readReminderV150(life, "HOME-E01:HOME-CM07");
  assert.deepEqual(L.remindersV150(life, residence, ctx("HOME-CM07")), []);
});

test("the scene shows a walking guest in the village and a seated one only inside its house", () => {
  const residence = livingAtCm07();
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "guide", ctx("HOME-CM07")));
  life = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "s", tick: 0, zone: "village", buildingId: null }).state;
  const walking = L.guestsInSceneV150(life, { regionId: "luminous-marshes", runId: "s", tick: 60, zone: "village", buildingId: null });
  assert.equal(walking.length, 1);
  assert.equal(walking[0].inside, false);
  assert.equal(L.guestsInSceneV150(life, { regionId: "luminous-marshes", runId: "other", tick: 60, zone: "village", buildingId: null }).length, 0);
  const walkTicks = Math.ceil(L.routeLengthV150(L.guestRouteV150("HOME-CM07", "guide")) / L.GUEST_SPEED_V150 * 60);
  const seated = { regionId: "luminous-marshes", runId: "s", tick: walkTicks + 120 };
  assert.equal(L.guestsInSceneV150(life, { ...seated, zone: "interior", buildingId: "house-n-0" })[0].inside, true);
  assert.equal(L.guestsInSceneV150(life, { ...seated, zone: "interior", buildingId: "house-n-1" }).length, 0);
  assert.equal(L.guestsInSceneV150(life, { ...seated, zone: "village", buildingId: null })[0].inside, true, "hidden from its post");
});

test("save round-trip keeps the visit; the life panel renders for the active house only", () => {
  const { defaultSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
  const residence = livingAtCm07();
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "keeper", ctx("HOME-CM07")));
  const save = { ...defaultSave("2026-11-19T10:00:00.000Z"), residenceV149: residence, residenceLifeV150: life };
  const parsed = parseSaveImport(exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(parsed.save.residenceLifeV150, life);
  assert.equal(parseSaveImport(JSON.stringify({ ...save, residenceLifeV150: { version: 9 } })).failure, "future-version");
  const props = { residence, life, rankId: "young-blood", disabled: false, regionAllowed: () => true, onAction: () => ({ ok: true, message: "" }) };
  const html = source.render("app/game/ResidenceLifePanelV150.tsx", { ...props, house: R.houseV149("HOME-CM07") });
  assert.match(html, /data-residence-invite="guide"/);
  assert.match(html, /attendu/);
  assert.equal(source.render("app/game/ResidenceLifePanelV150.tsx", { ...props, house: R.houseV149("HOME-CM08") }), "");
});
