import assert from "node:assert/strict";
import test from "node:test";
import { finale, houseSite, legacyFixture, legacyPlayer, saves } from "./helpers/legacy-finale-r2.mjs";

test("the new cohort requires Ancient, a realized ending receipt, and the actual fitted residence", () => {
  const command = { scene: "cohort", order: { kind: "unload", at: 11 } };
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
