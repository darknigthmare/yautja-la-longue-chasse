/** Canonical reducer setup for tests only. These are not browser-played wins. */
import { PIT_ARCADE_LADDERS, createPitDescentRun, createPitDescentPlan, selectPitDescentNode, applyPitDescentResolution } from "../../app/game/systems/pitArcade";
import { PIT_CLAN_CIRCUITS } from "../../app/game/systems/pitCircuit";
import { applyPitResult, createPitSave, persistPitDescentRun, type PitSaveV5, type PitSavedFighterId } from "../../app/game/systems/pitSave";

export const PIT_HONORS_QA_OWNER = "2026-11-27T09:00:00.000Z";
const AT = "2026-11-27T09:30:00.000Z";

export function clearGalleryArcade(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  const ladder = PIT_ARCADE_LADDERS[fighterId];
  for (let index = 0; index < count; index += 1) {
    const final = index === ladder.encounters.length - 1;
    const result = applyPitResult(save, {
      id: `gallery-${fighterId}-arcade-${index}`, mode: "arcade", outcome: "victory", fighterId,
      arenaId: ladder.encounters[index].arenaId, roundsWon: 2, roundsLost: 0,
      arcadeEncounterIndex: index, arcadeCompleted: final, cosmeticRewardIds: final ? [ladder.cosmeticRewardId] : [], completedAt: AT,
    });
    if (!result.applied) throw new Error("Arcade fixture result was rejected");
    save = result.save;
  }
  return save;
}

export function clearGalleryCircuit(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  const circuit = PIT_CLAN_CIRCUITS[fighterId];
  for (let index = 0; index < count; index += 1) {
    const fight = circuit.fights[index];
    const chapter = circuit.chapters.find(plan => plan.chapter.id === fight.chapterId)!;
    const reward = chapter.fights.at(-1)!.index === fight.index;
    const result = applyPitResult(save, {
      id: `gallery-${fighterId}-circuit-${index}`, mode: "circuit", outcome: "victory", fighterId,
      arenaId: fight.arenaId, roundsWon: 2, roundsLost: 0,
      circuitFightIndex: index, circuitCompleted: index === circuit.fights.length - 1,
      cosmeticRewardIds: reward ? [chapter.chapter.cosmeticRewardId] : [], completedAt: AT,
    });
    if (!result.applied) throw new Error("Circuit fixture result was rejected");
    save = result.save;
  }
  return save;
}

export function clearGalleryDescent(save: PitSaveV5, fighterId: PitSavedFighterId, count: number): PitSaveV5 {
  let run = createPitDescentRun(fighterId, 72);
  save = persistPitDescentRun(save, run, AT).save;
  for (let index = 0; index < count; index += 1) {
    const node = createPitDescentPlan(fighterId, run.seed).floors[index].options[0];
    run = selectPitDescentNode(run, node.id);
    save = persistPitDescentRun(save, run, AT).save;
    run = applyPitDescentResolution(run, {
      id: `gallery-${fighterId}-descent-${index}`, nodeId: node.id,
      ...(node.kind === "fight" || node.kind === "boss" ? { victory: true, remainingHealth: Math.max(100, run.health - 70), roundsWon: 1, roundsLost: 0 } : {}),
    }).run;
    save = persistPitDescentRun(save, run, AT).save;
  }
  return save;
}

export function createPitHonorGalleryFixtureV1(kind: "empty" | "earned" | "progress"): PitSaveV5 {
  let save = createPitSave(PIT_HONORS_QA_OWNER);
  if (kind === "earned") return clearGalleryArcade(save, "jungle-hunter", 8);
  if (kind === "progress") {
    save = clearGalleryCircuit(save, "wolf", 2);
    save = clearGalleryCircuit(save, "city-hunter", 3);
    save = clearGalleryDescent(save, "wolf", 2);
    save = clearGalleryDescent(save, "city-hunter", 3);
  }
  return save;
}
