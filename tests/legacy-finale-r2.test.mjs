import assert from "node:assert/strict";
import test from "node:test";
import { finale, houseSite, legacyClanFixture, legacyFixture, legacyHaltFixture, legacyPlayer, moveLegacyClanFixture, saves } from "./helpers/legacy-finale-r2.mjs";

test("the new cohort requires Ancient, a realized ending receipt, and the actual fitted residence", () => {
  const command = { scene: "cohort", order: { kind: "greet", at: 2 } };
  const notPlayed = legacyFixture({ realized: false });
  assert.equal(finale.advanceLegacyFinaleR2(notPlayed, houseSite, command).next, undefined);
  notPlayed.originV151.ending.endingRealized = true;
  assert.equal(finale.advanceLegacyFinaleR2(notPlayed, houseSite, command).next, undefined);
  assert.equal(finale.advanceLegacyFinaleR2(legacyFixture({ ancient: false }), houseSite, command).next, undefined);
  const absent = legacyFixture();
  delete absent.originV151.trainingYardO6;
  assert.equal(finale.advanceLegacyFinaleR2(absent, houseSite, command).next, undefined);
  assert.equal(finale.advanceLegacyFinaleR2(legacyFixture(), { kind: "residence", id: "HOME-CM99" }, command).next, undefined);
});

function loadSupport(player) {
  player.move("cohort", "greet", 2);
  player.move("cohort", "lead", 8);
  player.move("cohort", "unload", 11);
  player.move("cohort", "wall-foot", 9);
  player.move("cohort", "test", 11);
  assert.deepEqual([finale.legacyCohortViewR2(player.save.legacyFinaleR2).loaded, finale.legacyCohortViewR2(player.save.legacyFinaleR2).steady], [true, false]);
  player.move("cohort", "unload", 11);
  player.move("cohort", "door-foot", 13);
  player.move("cohort", "test", 11);
}

test("the O6 cohort checks both feet, keeps wrong attempts and hears four young speakers", () => {
  const driver = legacyPlayer();
  loadSupport(driver);
  const old = driver.save.legacyFinaleR2;
  driver.move("cohort", "approach", 15, { choice: "stay" });
  assert.equal(finale.advanceLegacyFinaleR2(driver.save, houseSite, { scene: "cohort", order: { kind: "listen", speaker: "piece", at: 21 } }).next, undefined);
  for (const speaker of finale.LEGACY_COHORT_R2) driver.move("cohort", "listen", speaker.x, { speaker: speaker.id });
  driver.move("cohort", "unknown", 22);
  driver.move("cohort", "close", 22);
  const checked = finale.legacyCohortViewR2(driver.save.legacyFinaleR2);
  assert.equal(checked.complete, true);
  assert.equal(checked.heard.length, 4);
  assert.ok(finale.legacyFinaleMatchesSaveR2(driver.save));
  assert.equal(finale.legacyFinaleSuccessorR2(old, driver.save.legacyFinaleR2), false);
  driver.move("epilogue", "belongings", 6);
  driver.move("epilogue", "relations", 11);
  driver.move("epilogue", "choose", 16, { choice: "transmit" });
  driver.move("epilogue", "act", 21);
  assert.equal(finale.legacyEpilogueViewR2(driver.save.legacyFinaleR2, houseSite).complete, true);
  assert.equal(driver.save.originV151.ending.originEndingId, "O6-E1");
  assert.equal(finale.normalizeLegacyFinaleR2(driver.save.legacyFinaleR2, "2027-01-01T00:00:00.000Z"), null);
});

test("helping and leaving saves the supported return without listening receipts", () => {
  const driver = legacyPlayer();
  loadSupport(driver);
  driver.move("cohort", "approach", 15, { choice: "help" });
  assert.equal(finale.advanceLegacyFinaleR2(driver.save, houseSite, { scene: "cohort", order: { kind: "close", at: 22 } }).next, undefined);
  driver.move("cohort", "close", 2);
  const view = finale.legacyCohortViewR2(driver.save.legacyFinaleR2);
  assert.deepEqual([view.path, view.complete, view.heard, view.unknown], ["help", true, [], false]);
  assert.ok(!finale.legacyEpilogueChoicesR2(driver.save.legacyFinaleR2, houseSite).includes("transmit"));
});

test("epilogue receipt survives the actual save writer, import, and stale write refusal", () => {
  const driver = legacyPlayer(legacyFixture({ ancient: false }));
  const storage = new Map();
  const disk = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  assert.ok(saves.replaceSaveWithStatus(driver.save, disk).persisted);
  const act = (kind, at, fields = {}) => {
    driver.move("epilogue", kind, at, fields);
    const stored = saves.writeSaveWithStatus(driver.save, disk);
    assert.ok(stored.persisted, stored.failure);
  };
  act("belongings", 6);
  const earlier = driver.save;
  act("relations", 11);
  act("choose", 16, { choice: "welcome" });
  act("act", 14);
  const parsed = saves.parseSaveImport(saves.exportSave(driver.save));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(parsed.save.legacyFinaleR2, driver.save.legacyFinaleR2);
  assert.equal(saves.writeSaveWithStatus(earlier, disk).failure, "save-conflict");
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...driver.save, legacyFinaleR2: { ...driver.save.legacyFinaleR2, version: 2 } })).failure, "future-version");
});

test("M060 clan entry requires the native trophy station and the realized origin receipt", () => {
  const docked = legacyClanFixture({ realized: false, recruit: false });
  const site = finale.legacyClanShipSiteR2(docked);
  assert.ok(site && site.kind === "clan-ship");
  assert.equal(finale.legacyClanShipSiteR2(moveLegacyClanFixture(docked, { type: "move-room", roomId: "archives" })), null);
  assert.equal(finale.legacyClanShipSiteR2({ ...docked, clanShipDocking: { ...docked.clanShipDocking, ownerCreatedAt: "foreign" } }), null);
  assert.equal(finale.advanceLegacyFinaleR2(docked, site, { scene: "epilogue", order: { kind: "belongings", at: 6 } }).next, undefined);
});

test("M060 copies only played clan objects and crew, and the archive survives departing", () => {
  const docked = legacyClanFixture();
  const site = finale.legacyClanShipSiteR2(docked);
  assert.ok(site);
  const driver = legacyPlayer(docked);
  driver.move("epilogue", "belongings", 6, {}, site);
  const first = driver.save.legacyFinaleR2;
  assert.equal(first.epilogue.events[0].clanProof.berth.roomId, "trophees");
  assert.deepEqual(finale.legacyClanShipReadoutR2(first).relations, []);
  const firstReadout = finale.legacyClanShipReadoutR2(first);
  assert.equal(firstReadout.belongings.length, 1);
  assert.match(firstReadout.belongings[0], /Relevé d’amarrage/);
  // The didactic support never grants the contested trophy.
  assert.doesNotMatch(firstReadout.belongings[0], /C-37/);
  driver.move("epilogue", "relations", 11, {}, site);
  assert.deepEqual(finale.legacyClanShipReadoutR2(driver.save.legacyFinaleR2).relations, ["Griffe de Fer"]);
  assert.ok(finale.legacyEpilogueChoicesR2(driver.save.legacyFinaleR2, site).includes("welcome"));
  driver.move("epilogue", "choose", 16, { choice: "transmit" }, site);
  driver.move("epilogue", "act", 21, {}, site);
  assert.equal(finale.legacyEpilogueViewR2(driver.save.legacyFinaleR2, site).complete, true);
  const unberthed = moveLegacyClanFixture(driver.save, { type: "move-room", roomId: "hangar" }, { type: "return-to-personal" }, { type: "undock" });
  assert.equal(finale.legacyClanShipSiteR2(unberthed), null);
  assert.equal(finale.legacyFinaleMatchesSaveR2(unberthed), true);
  const parsed = saves.parseSaveImport(saves.exportSave(unberthed));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(parsed.save.legacyFinaleR2, driver.save.legacyFinaleR2);
  assert.equal(parsed.save.originV151.ending.originEndingId, "O6-E1");
  assert.equal(finale.normalizeLegacyFinaleR2(driver.save.legacyFinaleR2, "2027-01-01T00:00:00.000Z"), null);
  assert.equal(finale.advanceLegacyFinaleR2(driver.save, houseSite, { scene: "epilogue", order: { kind: "belongings", at: 6 } }).next, undefined);
});

test("a clan archive rejects duplicate crew and a trace without a real instance", () => {
  const docked = legacyClanFixture({ recruit: false });
  const site = finale.legacyClanShipSiteR2(docked);
  const empty = legacyPlayer(docked);
  empty.move("epilogue", "belongings", 6, {}, site);
  empty.move("epilogue", "relations", 11, {}, site);
  assert.deepEqual(finale.legacyEpilogueChoicesR2(empty.save.legacyFinaleR2, site), ["depart", "transmit"]);
  const forged = structuredClone(empty.save.legacyFinaleR2);
  forged.epilogue.events[1].clanProof = [{ id: "iron-claw", room: "armurerie" }];
  assert.equal(finale.legacyFinaleMatchesSaveR2({ ...docked, legacyFinaleR2: forged }), false);
  forged.epilogue.events[1].clanProof.push({ id: "iron-claw", room: "armurerie" });
  assert.equal(finale.normalizeLegacyFinaleR2(forged, docked.createdAt), null);
  forged.epilogue.events[1].clanProof = [];
  forged.epilogue.events[0].clanProof.berth.personalShipId = "borrowed-placeholder";
  assert.equal(finale.normalizeLegacyFinaleR2(forged, docked.createdAt), null);
});

test("M059 requires the threshold and the actual lead to the support, with exact save continuation", () => {
  const player = legacyPlayer();
  for (const [kind, at] of [["lead", 8], ["greet", 8], ["unload", 11]]) {
    assert.equal(finale.advanceLegacyFinaleR2(player.save, houseSite, { scene: "cohort", order: { kind, at } }).next, undefined);
  }
  player.move("cohort", "greet", 2);
  const resumed = saves.parseSaveImport(saves.exportSave(player.save));
  assert.ok(resumed.save, resumed.failure);
  const view = finale.legacyCohortViewR2(resumed.save.legacyFinaleR2);
  assert.deepEqual([view.at, view.arrival, view.heard], [2, "greeted", []]);
  assert.equal(finale.advanceLegacyFinaleR2(resumed.save, houseSite, { scene: "cohort", order: { kind: "lead", at: 2 } }).next, undefined);
  const after = legacyPlayer(resumed.save);
  after.move("cohort", "lead", 8);
  after.move("cohort", "unload", 11);
  assert.deepEqual([finale.legacyCohortViewR2(after.save.legacyFinaleR2).arrival, after.save.legacyFinaleR2.cohort.events.length], ["inside", 3]);
});

test("existing M059 journals that start at the support reopen without a second arrival", () => {
  const save = legacyFixture();
  save.legacyFinaleR2 = { version: 1, ownerCreatedAt: save.createdAt, endingId: "O6-E1",
    cohort: { site: houseSite, events: [{ kind: "unload", at: 11 }] } };
  const old = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(old.save, old.failure);
  assert.deepEqual(old.save.legacyFinaleR2, save.legacyFinaleR2);
  const view = finale.legacyCohortViewR2(old.save.legacyFinaleR2);
  assert.deepEqual([view.at, view.arrival, view.loaded], [11, "inside", false]);
  legacyPlayer(old.save).move("cohort", "wall-foot", 9);
});

test("M060 at the real halt requires an origin ending and that return's resolved table receipt", () => {
  const valid = legacyHaltFixture();
  const site = finale.legacyHaltSiteR2(valid);
  assert.ok(site && site.kind === "halt");
  const command = { scene: "epilogue", order: { kind: "belongings", at: 6 } };
  assert.equal(finale.advanceLegacyFinaleR2(legacyHaltFixture({ realized: false }), site, command).next, undefined);
  assert.equal(finale.advanceLegacyFinaleR2(legacyHaltFixture({ walkthrough: false }), site, command).next, undefined);
  const remote = { ...valid.homeworldRegionV68, actor: { ...valid.homeworldRegionV68.actor, x: 520, y: 2800 } };
  assert.equal(finale.legacyHaltSiteR2(valid, remote), null);
  assert.equal(finale.legacyHaltSiteR2(valid, { ...valid.homeworldRegionV68, runId: "different-return" }), null);
  assert.equal(finale.legacyHaltSiteR2({ ...valid, createdAt: "2027-01-01T00:00:00.000Z" }), null);
  assert.equal(finale.advanceLegacyFinaleR2(valid, site, { scene: "cohort", order: { kind: "greet", at: 2 } }).next, undefined);
});

test("M060 records the actual halt report and host and keeps the ending after leaving", () => {
  const original = legacyHaltFixture();
  const site = finale.legacyHaltSiteR2(original);
  const player = legacyPlayer(original);
  player.move("epilogue", "belongings", 6, {}, site);
  assert.deepEqual(finale.legacyHaltReadoutR2(player.save), {
    belongings: ["Relevé des Crêtes · 3 indices remis"], relations: ["Hôte de la halte des Crêtes"],
  });
  player.move("epilogue", "relations", 11, {}, site);
  player.move("epilogue", "choose", 16, { choice: "transmit" }, site);
  player.move("epilogue", "act", 21, {}, site);
  const left = { ...player.save, homeworldRegionV68: null };
  const archive = saves.parseSaveImport(saves.exportSave(left));
  assert.ok(archive.save, archive.failure);
  assert.equal(finale.legacyEpilogueViewR2(archive.save.legacyFinaleR2, site).complete, true);
  assert.deepEqual(archive.save.originV151, original.originV151);
  assert.deepEqual(archive.save.trophies, original.trophies);
  const invalid = structuredClone(left);
  invalid.legacyFinaleR2.epilogue.events[0].haltOperationId = "D6-W-CULT-25:another-receipt";
  assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, "invalid-save");
  const missing = structuredClone(left);
  delete missing.legacyFinaleR2.epilogue.events[0].haltOperationId;
  assert.equal(finale.normalizeLegacyFinaleR2(missing.legacyFinaleR2, missing.createdAt), null);
});
