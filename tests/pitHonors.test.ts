import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { PitSaveV5, PitSavedFighterId } from "../app/game/systems/pitSave";

async function loadSystem(relativePath: string) {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
}
const [honors, saves, arcade, circuit] = await Promise.all([
  loadSystem("../app/game/systems/pitHonors.ts"), loadSystem("../app/game/systems/pitSave.ts"),
  loadSystem("../app/game/systems/pitArcade.ts"), loadSystem("../app/game/systems/pitCircuit.ts"),
]) as [typeof import("../app/game/systems/pitHonors"), typeof import("../app/game/systems/pitSave"),
  typeof import("../app/game/systems/pitArcade"), typeof import("../app/game/systems/pitCircuit")];
const OWNER = "2026-09-19T10:00:00.000Z";
const AT = "2026-09-19T11:00:00.000Z";

function clearArcade(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  const ladder = arcade.PIT_ARCADE_LADDERS[fighterId];
  for (let i = 0; i < count; i += 1) {
    save = saves.applyPitResult(save, {
      id: `${fighterId}-arcade-${i}`, mode: "arcade", outcome: "victory", fighterId,
      arenaId: ladder.encounters[i].arenaId, roundsWon: 2, roundsLost: 0,
      arcadeEncounterIndex: i, arcadeCompleted: i === ladder.encounters.length - 1,
      cosmeticRewardIds: i === ladder.encounters.length - 1 ? [ladder.cosmeticRewardId] : [], completedAt: AT,
    }).save;
  }
  return save;
}

function clearCircuit(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  const definition = circuit.PIT_CLAN_CIRCUITS[fighterId];
  for (let i = 0; i < count; i += 1) {
    const fight = definition.fights[i];
    const plan = definition.chapters.find(candidate => candidate.chapter.id === fight.chapterId)!;
    const finishesChapter = plan.fights[plan.fights.length - 1].index === fight.index;
    save = saves.applyPitResult(save, {
      id: `${fighterId}-circuit-${i}`, mode: "circuit", outcome: "victory", fighterId,
      arenaId: fight.arenaId, roundsWon: 2, roundsLost: 0,
      circuitFightIndex: i, circuitCompleted: i === definition.fights.length - 1,
      cosmeticRewardIds: finishesChapter ? [plan.chapter.cosmeticRewardId] : [], completedAt: AT,
    }).save;
  }
  return save;
}

function clearDescent(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  let run = arcade.createPitDescentRun(fighterId, 72);
  save = saves.persistPitDescentRun(save, run, AT).save;
  for (let i = 0; i < count; i += 1) {
    const node = arcade.createPitDescentPlan(fighterId, run.seed).floors[i].options[0];
    run = arcade.selectPitDescentNode(run, node.id);
    save = saves.persistPitDescentRun(save, run, AT).save;
    run = arcade.applyPitDescentResolution(run, {
      id: `${fighterId}-descent-${i}`, nodeId: node.id,
      ...(node.kind === "fight" || node.kind === "boss" ? {
        victory: true, remainingHealth: Math.max(100, run.health - 70), roundsWon: 1, roundsLost: 0,
      } : {}),
    }).run;
    save = saves.persistPitDescentRun(save, run, AT).save;
  }
  return save;
}

test("missing and empty PIT sidecars expose the exact 18-item locked catalogue, never rewards", () => {
  const missing = honors.buildPitHonors(null, OWNER);
  const empty = honors.buildPitHonors(saves.createPitSave(OWNER), OWNER);
  assert.equal(missing.status, "empty");
  assert.equal(empty.status, "ready");
  assert.equal(missing.totalCount, 18);
  assert.equal(missing.earnedCount, 0);
  assert.deepEqual(missing.entries, empty.entries);
  assert.deepEqual(missing.entries.map(entry => entry.id), saves.PIT_SAVE_ALLOWED_COSMETIC_IDS);
  assert.deepEqual(["arcade", "circuit", "descent"].map(source => missing.entries.filter(entry => entry.source === source).length), [12, 5, 1]);
  assert.ok(missing.entries.every(entry => !entry.earned && entry.progress.current === 0 && entry.condition.length > 0));
});

test("owner identity is exact and never exposes the other profile's earned catalogue", () => {
  const save = clearArcade(saves.createPitSave(OWNER), "wolf", 8);
  for (const owner of ["2026-09-19T10:00:01.000Z", "2026-09-19T12:00:00.000+02:00"]) {
    const model = honors.buildPitHonors(save, owner);
    assert.equal(model.status, "owner-conflict");
    assert.equal(model.earnedCount, 0);
    assert.deepEqual(model.entries, []);
  }
  assert.equal(honors.buildPitHonors(null, "").status, "invalid");
});

test("Arcade progress and palettes remain specific to each fighter and use published definitions", () => {
  let save = clearArcade(saves.createPitSave(OWNER), "wolf", 8);
  save = clearArcade(save, "city-hunter", 3);
  const model = honors.buildPitHonors(save, OWNER);
  assert.equal(model.status, "ready");
  assert.equal(model.earnedCount, 1);
  const wolf = model.entries.find(entry => entry.id === arcade.PIT_ARCADE_COSMETICS.wolf.id)!;
  const city = model.entries.find(entry => entry.id === arcade.PIT_ARCADE_COSMETICS["city-hunter"].id)!;
  assert.equal(wolf.label, arcade.PIT_ARCADE_COSMETICS.wolf.label);
  assert.deepEqual(wolf.palette, arcade.PIT_ARCADE_COSMETICS.wolf.palette);
  assert.equal(wolf.earned, true);
  assert.equal(wolf.progress.current, 8);
  assert.equal(city.progress.current, 3);
  assert.equal(city.earned, false);
  assert.match(city.condition, /City Hunter/);
});

test("Circuit chapter progress follows its real boundaries and never sums fighters", () => {
  let save = clearCircuit(saves.createPitSave(OWNER), "wolf", 2);
  save = clearCircuit(save, "city-hunter", 2);
  const model = honors.buildPitHonors(save, OWNER);
  const chapters = model.entries.filter(entry => entry.source === "circuit");
  assert.equal(model.status, "ready");
  assert.equal(model.earnedCount, 1);
  assert.deepEqual(chapters.map(entry => entry.progress.current), [1, 1, 0, 0, 0]);
  assert.deepEqual(chapters.map(entry => entry.progress.total), [1, 3, 2, 4, 2]);
  assert.deepEqual(chapters.map(entry => entry.earned), [true, false, false, false, false]);
  assert.deepEqual(chapters.map(entry => entry.label), circuit.PIT_CLAN_CIRCUIT_CHAPTERS.map(chapter => chapter.name));
  const complete = honors.buildPitHonors(clearCircuit(saves.createPitSave(OWNER), "valkyrie", 12), OWNER);
  assert.equal(complete.earnedCount, 5);
  assert.ok(complete.entries.filter(entry => entry.source === "circuit").every(entry => entry.earned && entry.progress.current === entry.progress.total));
});

test("Descente shows the deepest individual path and awards its single existing banner only at completion", () => {
  let save = clearDescent(saves.createPitSave(OWNER), "wolf", 3);
  save = clearDescent(save, "city-hunter", 3);
  const partial = honors.buildPitHonors(save, OWNER).entries.find(entry => entry.source === "descent")!;
  assert.equal(partial.progress.current, 3);
  assert.equal(partial.progress.total, 8);
  assert.equal(partial.earned, false);
  const complete = honors.buildPitHonors(clearDescent(saves.createPitSave(OWNER), "enforcer", 8), OWNER);
  assert.equal(complete.earnedCount, 1);
  assert.deepEqual(complete.entries.filter(entry => entry.earned).map(entry => entry.id), [saves.PIT_SAVE_DESCENT_COSMETIC_ID]);
  assert.equal(complete.entries.find(entry => entry.source === "descent")!.progress.current, 8);
});

test("unknown cosmetic ids are ignored without removing or awarding any known reward", () => {
  const save = clearArcade(saves.createPitSave(OWNER), "wolf", 8);
  const withUnknown = { ...save, unlockedCosmeticIds: [...save.unlockedCosmeticIds, "unknown-future-distinction"] };
  assert.deepEqual(honors.buildPitHonors(withUnknown, OWNER), honors.buildPitHonors(save, OWNER));
  assert.ok(withUnknown.unlockedCosmeticIds.includes("unknown-future-distinction"));
});

test("malformed, future and unsupported claimed rewards do not become a fresh or earned catalogue", () => {
  const save = saves.createPitSave(OWNER);
  const invalid = [
    { ...save, version: 6 },
    { ...save, circuitProgress: {} },
    { ...save, unlockedCosmeticIds: [arcade.PIT_ARCADE_COSMETICS.wolf.id] },
    { ...save, unlockedCosmeticIds: [12] },
    { ...save, extraCampaignHonor: 9_999 },
  ];
  for (const value of invalid) {
    const model = honors.buildPitHonors(value as unknown as PitSaveV5, OWNER);
    assert.equal(model.status, "invalid");
    assert.equal(model.earnedCount, 0);
    assert.deepEqual(model.entries, []);
  }
});

function deepFreeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
}

test("projection never mutates saves, revisions, receipts or shared palette definitions", () => {
  const save = clearArcade(saves.createPitSave(OWNER), "wolf", 8);
  const before = JSON.stringify(save);
  deepFreeze(save);
  const first = honors.buildPitHonors(save, OWNER);
  assert.equal(JSON.stringify(save), before);
  const wolf = first.entries.find(entry => entry.id === arcade.PIT_ARCADE_COSMETICS.wolf.id)!;
  assert.ok(wolf.palette);
  (wolf.palette as { primary: string }).primary = "#000000";
  const second = honors.buildPitHonors(save, OWNER);
  assert.deepEqual(second.entries.find(entry => entry.id === wolf.id)!.palette, arcade.PIT_ARCADE_COSMETICS.wolf.palette);
  assert.equal(JSON.stringify(save), before);
});
