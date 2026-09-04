import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/systems/pitCircuit.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const pit = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

function winCurrentFight(run, resultId) {
  const fight = pit.getPitCircuitAvailableFights(run)[0];
  const selected = pit.selectPitCircuitFight(run, fight.id);
  return pit.applyPitCircuitFightResult(selected, {
    resultId,
    fightId: fight.id,
    outcome: "victory",
  }).run;
}

test("all twelve fighters receive the five published chapters and all eight arenas", () => {
  assert.equal(pit.PIT_FIRST_EDITION_FIGHTER_IDS.length, 12);
  assert.equal(Object.keys(pit.PIT_CLAN_CIRCUITS).length, 12);
  assert.deepEqual(pit.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.index), [1, 2, 3, 4, 5]);

  for (const fighterId of pit.PIT_FIRST_EDITION_FIGHTER_IDS) {
    const circuit = pit.PIT_CLAN_CIRCUITS[fighterId];
    assert.equal(circuit.version, pit.PIT_CIRCUIT_CONTENT_VERSION);
    assert.equal(circuit.fighterId, fighterId);
    assert.equal(circuit.chapters.length, 5);
    assert.deepEqual(
      circuit.chapters.map((plan) => plan.chapter),
      pit.PIT_CLAN_CIRCUIT_CHAPTERS,
      "chapter plans must use the exact published content contract",
    );
    assert.deepEqual(circuit.chapters.map((plan) => plan.fights.length), [1, 3, 2, 4, 2]);
    assert.equal(circuit.fights.length, pit.PIT_CIRCUIT_FIGHT_COUNT);
    assert.deepEqual(circuit.fights.map((fight) => fight.index), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(new Set(circuit.fights.map((fight) => fight.id)).size, 12);
    assert.deepEqual(
      new Set(circuit.fights.map((fight) => fight.arenaId)),
      new Set(pit.PIT_FIRST_EDITION_ARENA_IDS),
    );

    const playableParticipants = new Set([
      fighterId,
      ...circuit.fights.map((fight) => fight.opponentId).filter((id) => id !== "kok-warlord"),
    ]);
    assert.deepEqual(playableParticipants, new Set(pit.PIT_FIRST_EDITION_FIGHTER_IDS));
    assert.equal(circuit.fights[10].kind, "rival");
    assert.equal(circuit.fights[10].opponentId, pit.PIT_FIRST_EDITION_FIGHTERS[fighterId].rivalId);
    assert.equal(circuit.fights[11].kind, "boss");
    assert.equal(circuit.fights[11].opponentId, "kok-warlord");
    assert.equal(circuit.fights[11].arenaId, "ruins-tribunal");
  }
});

test("Circuit rewards are five explicit PIT-only cosmetics with the published finale", () => {
  assert.equal(pit.PIT_CIRCUIT_COSMETIC_REWARDS.length, 5);
  assert.deepEqual(
    pit.PIT_CIRCUIT_COSMETIC_REWARDS.map((reward) => reward.id),
    pit.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.cosmeticRewardId),
  );
  assert.ok(pit.PIT_CIRCUIT_COSMETIC_REWARDS.every((reward) => reward.scope === "pit-only"));
  assert.ok(pit.PIT_CIRCUIT_COSMETIC_REWARDS.every((reward) => reward.kind === "cosmetic"));
  assert.ok(pit.PIT_CIRCUIT_COSMETIC_REWARDS.every((reward) => !("campaignReward" in reward)));
  assert.equal(pit.PIT_CIRCUIT_COSMETIC_REWARDS.filter((reward) => reward.final).length, 1);
  assert.equal(pit.PIT_CIRCUIT_FINAL_COSMETIC.id, "pit-intro-elder-verdict");
  assert.equal(pit.PIT_CIRCUIT_FINAL_COSMETIC.chapterId, "judgment");
  assert.equal(pit.PIT_CIRCUIT_FINAL_COSMETIC.scope, "pit-only");
});

test("selection, defeat and draw are pure while only victory advances", () => {
  const initial = pit.createPitCircuitRun("wolf");
  const firstFight = pit.getPitCircuitAvailableFights(initial)[0];
  assert.equal(initial.fightIndex, 0);
  assert.equal(initial.currentChapterId, "call-of-the-circle");
  assert.equal(initial.selectedFightId, null);
  assert.throws(() => pit.selectPitCircuitFight(initial, pit.PIT_CLAN_CIRCUITS.wolf.fights[1].id));
  assert.throws(() => pit.applyPitCircuitFightResult(initial, {
    resultId: "unselected",
    fightId: firstFight.id,
    outcome: "victory",
  }));

  let selected = pit.selectPitCircuitFight(initial, firstFight.id);
  let application = pit.applyPitCircuitFightResult(selected, {
    resultId: "wolf-defeat-1",
    fightId: firstFight.id,
    outcome: "defeat",
  });
  assert.equal(application.applied, true);
  let run = application.run;
  assert.equal(run.fightIndex, 0);
  assert.equal(run.defeats, 1);
  assert.equal(run.selectedFightId, null);
  assert.equal(initial.defeats, 0, "reducers must not mutate their input");

  selected = pit.selectPitCircuitFight(run, firstFight.id);
  run = pit.applyPitCircuitFightResult(selected, {
    resultId: "wolf-draw-1",
    fightId: firstFight.id,
    outcome: "draw",
  }).run;
  assert.equal(run.fightIndex, 0);
  assert.equal(run.draws, 1);

  selected = pit.selectPitCircuitFight(run, firstFight.id);
  run = pit.applyPitCircuitFightResult(selected, {
    resultId: "wolf-victory-1",
    fightId: firstFight.id,
    outcome: "victory",
  }).run;
  assert.equal(run.fightIndex, 1);
  assert.equal(run.victories, 1);
  assert.deepEqual(run.completedChapterIds, ["call-of-the-circle"]);
  assert.deepEqual(run.unlockedPitCosmeticIds, ["pit-emblem-circle-call"]);
  assert.equal(run.currentChapterId, "three-paths");
});

test("result ids are idempotent and conflicting reuse is rejected", () => {
  const initial = pit.createPitCircuitRun("scar");
  const fight = pit.getPitCircuitAvailableFights(initial)[0];
  const selected = pit.selectPitCircuitFight(initial, fight.id);
  const result = { resultId: "stable-result", fightId: fight.id, outcome: "victory" };
  const first = pit.applyPitCircuitFightResult(selected, result);
  const duplicate = pit.applyPitCircuitFightResult(first.run, result);
  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.run, first.run);
  assert.throws(() => pit.applyPitCircuitFightResult(first.run, {
    ...result,
    outcome: "defeat",
  }), /Conflicting/);
});

test("the five chapters complete in order and unlock the final cosmetic after Warlord", () => {
  let run = pit.createPitCircuitRun("valkyrie");
  const chapterOrder = [];
  for (let index = 0; index < pit.PIT_CIRCUIT_FIGHT_COUNT; index += 1) {
    const before = run.currentChapterId;
    run = winCurrentFight(run, `valkyrie-win-${index + 1}`);
    if (run.currentChapterId !== before) chapterOrder.push(before);
  }
  assert.deepEqual(chapterOrder, pit.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.id));
  assert.equal(run.phase, "completed");
  assert.equal(run.fightIndex, 12);
  assert.equal(run.currentChapterId, null);
  assert.equal(run.selectedFightId, null);
  assert.equal(run.victories, 12);
  assert.deepEqual(run.completedChapterIds, pit.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.id));
  assert.deepEqual(
    run.unlockedPitCosmeticIds,
    pit.PIT_CIRCUIT_COSMETIC_REWARDS.map((reward) => reward.id),
  );
  assert.equal(run.unlockedPitCosmeticIds.at(-1), pit.PIT_CIRCUIT_FINAL_COSMETIC.id);
  assert.deepEqual(pit.getPitCircuitAvailableFights(run), []);
  assert.throws(() => pit.selectPitCircuitFight(run, pit.PIT_CLAN_CIRCUITS.valkyrie.fights[11].id));
  assert.deepEqual(JSON.parse(pit.serializePitCircuitRun(run)), run);
});

test("normalization rejects future, forged, skipped and reordered snapshots", () => {
  const initial = pit.createPitCircuitRun("enforcer");
  const firstFight = pit.getPitCircuitAvailableFights(initial)[0];
  const selected = pit.selectPitCircuitFight(initial, firstFight.id);
  const won = pit.applyPitCircuitFightResult(selected, {
    resultId: "enforcer-first",
    fightId: firstFight.id,
    outcome: "victory",
  }).run;
  assert.deepEqual(pit.normalizePitCircuitRun(won), won);
  assert.equal(pit.normalizePitCircuitRun({ ...won, version: 2 }), null);
  assert.equal(pit.normalizePitCircuitRun({ ...won, circuitId: "future-v99" }), null);
  assert.equal(pit.normalizePitCircuitRun({ ...won, fightIndex: 2 }), null);
  assert.equal(pit.normalizePitCircuitRun({ ...won, currentChapterId: "judgment" }), null);
  assert.equal(pit.normalizePitCircuitRun({ ...won, completedChapterIds: ["three-paths"] }), null);
  assert.equal(pit.normalizePitCircuitRun({
    ...won,
    unlockedPitCosmeticIds: [...won.unlockedPitCosmeticIds, "campaign-xp-999"],
  }), null);
  assert.equal(pit.normalizePitCircuitRun({
    ...initial,
    appliedResults: [{
      resultId: "skip-to-two",
      fightId: pit.PIT_CLAN_CIRCUITS.enforcer.fights[1].id,
      outcome: "victory",
    }],
    fightIndex: 1,
    victories: 1,
  }), null);
  assert.equal(pit.normalizePitCircuitRun({
    ...won,
    appliedResults: [...won.appliedResults, won.appliedResults[0]],
  }), null);
  assert.equal(pit.normalizePitCircuitRun({ ...won, selectedFightId: firstFight.id }), null);
  assert.throws(() => pit.serializePitCircuitRun({ ...won, phase: "completed" }));
});
