import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [canvas, client] = await Promise.all([
  readFile(new URL("../app/game/PitCanvas.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8"),
]);

test("Clan Circuit is a selectable CPU mode with a complete five-chapter preview", () => {
  assert.match(canvas, /type PitMode = [^;]*"circuit"/);
  assert.match(canvas, /PIT_SELECTABLE_MODES[^\n]*"circuit"/);
  assert.match(
    canvas,
    /\["circuit", "Circuit du clan", "Cinq chapitres et douze combats jusqu’au Jugement\."\]/,
  );
  assert.match(canvas, /previewCircuit\.chapters\.map/);
  assert.match(canvas, /fights\.map\(\(fight\)/);
  assert.match(canvas, /RITE COMPLET · 5 CHAPITRES · 12 COMBATS/);
  assert.match(canvas, /combat 11[\s\S]*Warlord[\s\S]*combat 12/);
  assert.match(canvas, /fight\.kind === "rival"/);
  assert.match(canvas, /fight\.kind === "boss"/);
  assert.match(canvas, /mode === "cpu" \|\| mode === "arcade" \|\| mode === "circuit"/);

});

test("Circuit persists the selected current fight before starting its live match", () => {
  const start = canvas.indexOf("const startMatch");
  const branch = canvas.indexOf('if (mode === "circuit")', start);
  const branchEnd = canvas.indexOf('if (mode === "descent")', branch);
  const selection = canvas.slice(branch, branchEnd);
  assert.ok(start >= 0 && branch > start && branchEnd > branch);
  assert.match(selection, /createPitCircuitRun\(leftId\)/);
  assert.match(selection, /storedRun\.appliedResults\.length >= PIT_CIRCUIT_MAX_RESULTS/);
  assert.match(selection, /storedRun\?\.phase === "completed" \|\| historyExhausted[\s\S]*?"circuit-replace"/);
  assert.match(selection, /launchCircuitSnapshot\([\s\S]*?baseRun/);

  const helperStart = canvas.indexOf("const launchCircuitSnapshot");
  const helperEnd = canvas.indexOf("const resolveDescentNonCombat", helperStart);
  const helper = canvas.slice(helperStart, helperEnd);
  assert.match(helper, /selectPitCircuitFight\(launchRun, fight\.id\)/);
  assert.match(helper, /kind: launchMutationKind/);
  assert.match(helper, /onPersisted: launch/);
  assert.match(helper, /launchLiveMatch\([\s\S]*?"circuit"/);
});

test("Circuit replaces a saturated active history before any continuation can launch", () => {
  const helperStart = canvas.indexOf("const launchCircuitSnapshot");
  const helperEnd = canvas.indexOf("const resolveDescentNonCombat", helperStart);
  const helper = canvas.slice(helperStart, helperEnd);
  const continuation = canvas.slice(
    canvas.indexOf("const continueCircuit"),
    canvas.indexOf("const continueDescent"),
  );

  assert.match(
    helper,
    /baseRun\.appliedResults\.length >= PIT_CIRCUIT_MAX_RESULTS/,
  );
  assert.match(helper, /createPitCircuitRun\(baseRun\.fighterId\)/);
  assert.match(
    helper,
    /const launchMutationKind = historyExhausted[\s\S]*?"circuit-replace"[\s\S]*?: mutationKind/,
  );
  assert.match(
    helper,
    /PIT_CLAN_CIRCUITS\[launchRun\.fighterId\]\.fights\[launchRun\.fightIndex\]/,
  );
  assert.match(helper, /selectPitCircuitFight\(launchRun, fight\.id\)/);
  assert.match(
    helper,
    /nouveau Circuit créé, statistiques conservées/,
  );
  assert.match(
    continuation,
    /launchCircuitSnapshot\(run, "circuit-persist"\)/,
  );
});

test("Circuit result maps victory, defeat and draw and only forwards newly earned chapter cosmetics", () => {
  const effectStart = canvas.indexOf("let playedCircuitIndex");
  const effectEnd = canvas.indexOf("const shortcuts", effectStart);
  const effect = canvas.slice(effectStart, effectEnd);
  assert.match(effect, /playedCircuitIndex = currentRun\.fightIndex/);
  assert.match(effect, /combat\.matchWinnerId === null\s*\? "draw"/);
  assert.match(effect, /combat\.matchWinnerId === playerId\s*\? "victory"\s*:\s*"defeat"/);
  assert.match(effect, /applyPitCircuitFightResult\(currentRun/);
  assert.match(effect, /new Set\(currentRun\.unlockedPitCosmeticIds\)/);
  assert.match(
    effect,
    /unlockedPitCosmeticIds\.filter\([\s\S]*?!previouslyUnlocked\.has\(rewardId\)/,
  );
  assert.match(effect, /circuitFightIndex: playedCircuitIndex/);
  assert.match(effect, /circuitCompleted: mode === "circuit" \? completedCircuit : undefined/);
  assert.match(effect, /submitCircuitSettlement\(\{ result: matchResult, nextRun: nextCircuitRun \}\)/);
  assert.doesNotMatch(
    effect,
    /circuitRunRef\.current = application\.run|setCircuitRun\(application\.run\)/,
  );
});

test("Circuit advances and announces rewards only after a persisted acknowledgement", () => {
  const settlementStart = canvas.indexOf("const submitCircuitSettlement");
  const settlementEnd = canvas.indexOf("const retryCircuitSettlement", settlementStart);
  const settlement = canvas.slice(settlementStart, settlementEnd);
  const persistenceAwait = settlement.indexOf(
    "await onMatchComplete(settlement.result, settlement.nextRun)",
  );
  const publishRef = settlement.indexOf("circuitRunRef.current = settlement.nextRun");
  const publishState = settlement.indexOf("setCircuitRun(settlement.nextRun)");
  assert.ok(settlementStart >= 0 && settlementEnd > settlementStart);
  assert.ok(persistenceAwait >= 0 && publishRef > persistenceAwait && publishState > publishRef);
  assert.match(settlement, /if \(!acknowledgement\.persisted\)/);
  assert.match(settlement, /status: "failed"/);

  const retryStart = canvas.indexOf("const retryCircuitSettlement");
  const retryEnd = canvas.indexOf("useEffect", retryStart);
  assert.match(
    canvas.slice(retryStart, retryEnd),
    /pendingCircuitSettlementRef\.current[\s\S]*submitCircuitSettlement\(settlement\)/,
  );
  assert.match(canvas, /SAUVEGARDE CIRCUIT REQUISE/);
  assert.match(canvas, /aucune progression ni récompense n’est annoncée/);
  assert.match(canvas, /circuitPersistence\.status !== "confirmed"\) return/);
});

test("Circuit CTA supports keyboard, gamepad and touch activation", () => {
  assert.match(canvas, /LANCER LE CIRCUIT DU CLAN/);
  assert.match(canvas, /aria-keyshortcuts="Enter Space"/);
  assert.match(canvas, /data-gamepad-shortcut="A"/);
  assert.match(canvas, /Clavier : Entrée · Manette : A · Tactile : toucher/);
  assert.match(canvas, /current\[4\][\s\S]*startMatch\(\)/);
  assert.match(canvas, /mode === "circuit"[\s\S]*continueCircuit\(\)/);
  const start = canvas.slice(
    canvas.indexOf("const startMatch"),
    canvas.indexOf("const chooseDisplayedDescentBranch"),
  );
  assert.match(
    start,
    /runTransitionPersistence\.status === "failed"[\s\S]*mode === "circuit"[\s\S]*retryRunTransition\(\)/,
  );

  const continuation = canvas.slice(
    canvas.indexOf("const continueCircuit"),
    canvas.indexOf("const continueDescent"),
  );
  assert.match(continuation, /runTransitionPersistence\.status === "failed"/);
  assert.match(continuation, /retryRunTransition\(\)/);
  assert.match(continuation, /runTransitionPersistence\.status === "pending"\) return/);
  assert.match(canvas, /circuitRoutePersistenceFailed[\s\S]*?retryRunTransition/);
  assert.match(canvas, /RÉESSAYER LA SÉLECTION/);
});

test("GameClient forwards the zero-based Circuit cursor and completion flag to PitMatchResult", () => {
  assert.match(client, /circuitFightIndex:\s*result\.circuitFightIndex/);
  assert.match(client, /circuitCompleted:\s*result\.circuitCompleted/);
  assert.match(client, /cosmeticRewardIds:\s*result\.cosmeticRewardIds/);
  const indexField = canvas.indexOf("circuitFightIndex: playedCircuitIndex");
  const assignment = canvas.lastIndexOf("playedCircuitIndex = currentRun.fightIndex", indexField);
  assert.ok(assignment >= 0 && assignment < indexField);
});
