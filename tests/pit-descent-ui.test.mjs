import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [canvas, client, styles] = await Promise.all([
  readFile(new URL("../app/game/PitCanvas.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/game/PitCanvas.module.css", import.meta.url), "utf8"),
]);

function section(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, "missing section start: " + startNeedle);
  assert.ok(end > start, "missing section end: " + endNeedle);
  return source.slice(start, end);
}

test("Descente is selectable and exposes all eight branched floors", () => {
  assert.match(canvas, /type PitMode = [^;]*"descent"/);
  assert.match(canvas, /cyclePitMode[^\n]*from "\.\/systems\/pitRosterExpansion"/);
  assert.match(
    canvas,
    /\["descent", "Descente", "Huit étages à branches, santé persistante, reliques, soins et boss\."\]/,
  );
  assert.match(canvas, /previewDescentPlan\.floors\.map/);
  assert.match(canvas, /PIT_DESCENT_FLOOR_COUNT/);
  assert.match(canvas, /node\.kind === "boss"/);
  assert.match(canvas, /node\.kind === "relic"/);
  assert.match(canvas, /Récupération \+/);
  assert.match(canvas, /Bannière du Survivant de la Descente/);
  assert.doesNotMatch(canvas, /className=\{styles\.futureModes\}/);
  assert.match(styles, /\.descentFloors/);
  assert.match(styles, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
});

test("initial Descente preview is hydration-stable and client route actions randomize its seed", () => {
  assert.match(canvas, /const \[descentDraftSeed, setDescentDraftSeed\] = useState\(0\)/);
  assert.match(canvas, /previewDescentRun\?\.seed \?\? descentDraftSeed/);
  assert.doesNotMatch(canvas, /useRef\(createPitDescentSeed\(\)\)|descentPreviewSeedRef/);

  const modeChange = section(canvas, "const changePitMode", "const resetLiveInputs");
  assert.match(modeChange, /nextMode === "descent"/);
  assert.match(modeChange, /setDescentDraftSeed\(createPitDescentSeed\(\)\)/);

  const start = section(canvas, "const startMatch", "const chooseDisplayedDescentBranch");
  assert.match(start, /const freshSeed = storedRun && storedRun\.phase !== "active"\s*\? createPitDescentSeed\(\)\s*:\s*descentDraftSeed/);
  assert.match(start, /createPitDescentRun\(leftId, freshSeed\)/);

  const restart = section(canvas, "const restartDescent", "const startReplay");
  assert.match(restart, /const nextSeed = createPitDescentSeed\(\)/);
  assert.match(restart, /createPitDescentRun\(current\.fighterId, nextSeed\)/);
  assert.match(restart, /"descent-replace"/);
});

test("Descente uses one decisive round and maps surviving health back to the run", () => {
  const launch = section(canvas, "const launchLiveMatch", "const submitRunTransition");
  assert.match(
    launch,
    /preparePitDescentCombat\(next, descentRunState, descentNode\)/,
  );
  assert.match(launch, /descentCombatContextRef\.current = prepared\.context/);
  assert.match(launch, /setDescentCombatPresentation\(prepared\.presentation\)/);
  assert.match(launch, /next\.fighters\[0\] = \{ \.\.\.next\.fighters\[0\], roundsWon: 1 \}/);
  assert.match(launch, /next\.fighters\[1\] = \{ \.\.\.next\.fighters\[1\], roundsWon: 1 \}/);
  assert.match(launch, /nextMode === "training" \|\| nextMode === "descent"\) recorderRef\.current = null/);

  const result = section(canvas, 'if (mode === "descent") {', "let playedArcadeIndex");
  assert.match(result, /combat\.fighters\[0\]\.health \/ fighterMaximum/);
  assert.match(result, /Math\.min\(\s*currentRun\.health/);
  assert.match(result, /roundsWon: Math\.max\(0, combat\.fighters\[0\]\.roundsWon - 1\)/);
  assert.match(result, /roundsLost: Math\.max\(0, combat\.fighters\[1\]\.roundsWon - 1\)/);
  assert.match(result, /roundsDrawn: Math\.max\(0, combat\.round - 1\)/);
  assert.match(result, /applyPitDescentResolution/);
  assert.match(canvas, /mode: Exclude<PitMode, "descent">/);
});

test("route state is published only after a durable acknowledgement and retry keeps the transition", () => {
  const submit = section(canvas, "const submitRunTransition", "const retryRunTransition");
  const awaited = submit.indexOf("await onRunTransition(settlement.transition)");
  const callback = submit.indexOf("settlement.onPersisted()");
  assert.ok(awaited >= 0 && callback > awaited);
  assert.match(submit, /if \(!acknowledgement\.persisted\)/);
  assert.match(submit, /status: "failed"/);

  const retry = section(canvas, "const retryRunTransition", "const launchCircuitSnapshot");
  assert.match(retry, /pendingRunTransitionRef\.current/);
  assert.match(retry, /submitRunTransition\(settlement\)/);
  assert.match(canvas, /La même transition sera réessayée sans créer de doublon/);
  assert.match(canvas, /la progression, la santé et la récompense restent non publiées/);
});

test("selection remains locked while a route transition is pending or failed", () => {
  const lock = section(
    canvas,
    "const runTransitionSelectionLocked",
    "const selectedArcadeCosmetic",
  );
  assert.match(lock, /runTransitionPersistence\.status === "pending"/);
  assert.match(lock, /runTransitionPersistence\.status === "failed"/);

  const modeChange = section(canvas, "const changePitMode", "const resetLiveInputs");
  assert.match(modeChange, /if \(runTransitionSelectionLocked\) return/);
  assert.match(canvas, /disabled=\{runTransitionSelectionLocked\}/);
  assert.match(canvas, /runTransitionSelectionLocked \|\|\s*mode === "arcade"/);
});

test("relic and recovery floors persist without forging a match result", () => {
  const nonCombat = section(canvas, "const resolveDescentNonCombat", "const enterPersistedDescentRun");
  assert.match(nonCombat, /applyPitDescentResolution\(selectedRun, \{\s*id: transitionId,\s*nodeId: node\.id,\s*\}\)/);
  assert.doesNotMatch(nonCombat, /victory:|roundsWon:|onMatchComplete/);
  assert.match(nonCombat, /kind: "descent-persist"/);
  const persisted = nonCombat.indexOf("onPersisted:");
  assert.ok(nonCombat.indexOf("setDescentRun(application.run)") > persisted);
  assert.match(canvas, /Les six modificateurs et quatre reliques altèrent réellement le duel/);
  assert.match(canvas, /stepPitDescentCombat/);
  assert.match(canvas, /descentBlackMist/);
  assert.match(styles, /\.descentResourcePulse/);
  assert.match(styles, /\.descentBlackMist/);
});

test("Descente branch and continuation CTAs support keyboard, gamepad and touch", () => {
  assert.match(canvas, /onClick=\{\(\) => chooseDisplayedDescentBranch\(optionIndex\)\}/);
  assert.match(canvas, /aria-keyshortcuts="Enter Space"/);
  assert.match(canvas, /data-gamepad-shortcut="A"/);
  assert.match(canvas, /Clavier : Entrée · Manette : A · Tactile : toucher/);
  assert.match(canvas, /const menuDescentRun =[\s\S]*isPitFirstEditionFighterId\(leftId\) \? savedDescentRuns\[leftId\] : null/);
  assert.match(canvas, /changePitMode\(cyclePitMode\(mode, -1, leftId\)\)/);
  assert.match(canvas, /changePitMode\(cyclePitMode\(mode, 1, leftId\)\)/);
  assert.match(canvas, /previewDescentRun\.selectedNodeId !== node\.id/);
  assert.match(canvas, /mode === "descent"[\s\S]*continueDescent\(\)/);
  assert.match(canvas, /descentPersistenceFailed[\s\S]*retryRunTransition/);
});

test("GameClient hydrates and atomically persists V5 Circuit and Descente snapshots", () => {
  assert.match(client, /getPitCircuitRun\(pitSave, fighterId\)/);
  assert.match(client, /getPitDescentRun\(pitSave, fighterId\)/);
  assert.match(client, /savedCircuitRuns=\{pitCircuitRuns\}/);
  assert.match(client, /savedDescentRuns=\{pitDescentRuns\}/);
  assert.match(client, /onRunTransition=\{recordPitRunTransition\}/);

  // Stop at this hook boundary; unrelated social saves may follow it.
  const transition = section(client, "const recordPitRunTransition", "  }, []);");
  assert.match(transition, /persistPitCircuitRun/);
  assert.match(transition, /replacePitCircuitRun/);
  assert.match(transition, /persistPitDescentRun/);
  assert.match(transition, /replacePitDescentRun/);
  assert.equal((transition.match(/writePitSave\(/g) ?? []).length, 1);
  assert.doesNotMatch(transition, /applyPitResult|writeSaveWithStatus|setSave\(/);
  assert.match(transition, /aucun gain de campagne/);

  const match = section(client, "const recordPitMatch", "const recordPitRunTransition");
  const apply = match.indexOf("applyPitResult(current, matchResult)");
  const snapshot = match.indexOf("persistPitCircuitRun(");
  const write = match.indexOf("writePitSave(nextPitSave");
  assert.ok(apply >= 0 && snapshot > apply && write > snapshot);
  assert.match(canvas, /await onMatchComplete\(settlement\.result, settlement\.nextRun\)/);
});
