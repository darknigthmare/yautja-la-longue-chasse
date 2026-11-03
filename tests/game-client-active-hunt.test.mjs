import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (await readFile(
  new URL("../app/game/GameClient.tsx", import.meta.url),
  "utf8",
)).replace(/\r\n/g, "\n");
const huntSource = (await readFile(
  new URL("../app/game/HuntCanvas.tsx", import.meta.url),
  "utf8",
)).replace(/\r\n/g, "\n");

test("GameClient validates and exposes a compatible interrupted hunt", () => {
  assert.match(source, /loadActiveHuntSave\(\)/);
  assert.match(source, /checkActiveHuntCompatibility\(candidate,[\s\S]*?ownerSaveCreatedAt: loadedSave\.createdAt/);
  assert.match(source, /missionAvailable: progress\.status !== "locked"/);
  assert.match(source, /encounterRun: progress\.attempts/);
  assert.match(source, /allowedDifficultyIds/);
  assert.match(source, /normalizeHuntConfiguration\(loadedSave, candidate\)/);
  assert.match(source, />\s*Reprendre la chasse\s*</);
  assert.match(source, /activeHuntElapsed\(resumableHunt\)/);
});

test("GameClient starts a fresh monotonic sidecar session", () => {
  const launchBlock = source.match(
    /const launchMission = useCallback[\s\S]*?\n  }, \[playSound, save, selectedMission\]\);/,
  )?.[0];
  assert.ok(launchBlock);
  assert.match(
    launchBlock,
    /const runtimeWrite = writeSaveWithStatus\(normalizeSave\(save\)\)/,
  );
  assert.match(launchBlock, /const runtimeSave = runtimeWrite\.save/);
  assert.match(launchBlock, /setSave\(runtimeSave\)/);
  assert.match(launchBlock, /setSaveFailure\(runtimeWrite\.failure\)/);
  assert.match(
    launchBlock,
    /activeHuntSessionRef\.current = runtimeWrite\.persisted\s*\?\s*\{/,
  );
  assert.match(launchBlock, /clearActiveHuntSave\(\)/);
  assert.match(launchBlock, /runId: createHuntRunId\(\)[\s\S]*?sequence: 0/);
  assert.match(source, /const sequence = session\.sequence \+ 1/);
  assert.match(source, /writeActiveHuntSave\(\{[\s\S]*?snapshot: payload\.snapshot,[\s\S]*?retryCheckpoint: payload\.retryCheckpoint/);
  assert.match(source, /elapsedSeconds: Math\.max/);
  assert.match(
    source,
    /if \(result\.persisted && result\.save\) \{\s*session\.sequence = sequence/,
  );
  assert.match(source, /result\.failure === "stale-sequence"[\s\S]*?"stale-run"[\s\S]*?"protected-save"\) return null/);
});

test("GameClient resumes exact normalized configuration without applying a result", () => {
  assert.match(source, /inventory: save\.inventory/);
  assert.match(source, /loadout: save\.loadout/);
  assert.match(source, /appearance: save\.appearance/);
  assert.match(source, /visualOptions:/);
  assert.match(source, /const resumeActiveHunt = useCallback[\s\S]*?setSelectedMission\(mission\)[\s\S]*?setHuntResumePayload/);
  assert.match(source, /resumeSnapshot=\{huntResumePayload\?\.snapshot \?\? null\}/);
  assert.match(source, /resumeRetryCheckpoint=/);
  assert.match(source, /onPersistHunt=\{persistActiveHunt\}/);
  assert.match(source, /onSuspendHunt=\{suspendActiveHunt\}/);
  assert.match(source, /onInvalidateHunt=\{invalidateActiveHuntPersistence\}/);
  assert.match(source, /onResumeFailure=\{rejectActiveHuntResume\}/);

  const suspendBlock = source.match(
    /const suspendActiveHunt = useCallback\([\s\S]*?\n  \);\n\n  const checkHuntSessionForSettlement/,
  )?.[0];
  assert.ok(suspendBlock);
  assert.doesNotMatch(suspendBlock, /applyMissionResult/);
  assert.match(
    suspendBlock,
    /if \(!sidecar\) \{[\s\S]*?la chasse reste ouverte en pause[\s\S]*?return;/,
  );
  assert.match(suspendBlock, /setScreen\("title"\)/);
});

test("terminal paths clear a durably settled hunt and reset uses explicit replacement", () => {
  assert.match(source, /const completeMission = useCallback[\s\S]*?clearHuntSession\(\)/);
  assert.match(source, /onAbort=\{\(result\) => completeMission\(result, true\)\}/);
  assert.match(source, /const resetProgress = useCallback[\s\S]*?replaceSaveWithStatus\(fresh\)[\s\S]*?if \(!written\.persisted\)[\s\S]*?clearHuntSession\(\)/);
});

test("HuntCanvas captures bounded snapshots at safe lifecycle boundaries", () => {
  assert.match(huntSource, /serializeActiveHuntCheckpoint\(/);
  assert.match(huntSource, /spawnedWaves: \[\.\.\.checkpoint\.spawnedWaves\]/);
  assert.match(huntSource, /isBoundedJsonValue\(detached\)/);
  assert.match(huntSource, /activeHuntSnapshotChecksum\(checkpointSerialized\)/);
  assert.match(
    huntSource,
    /if \(resumeSnapshot == null && !restoredHunt\) \{\s*emitPersistence\(persistHuntRef\.current\)/,
  );
  assert.match(huntSource, /game\.elapsed - lastPersistedElapsed >= 15/);
  assert.match(huntSource, /window\.addEventListener\("pagehide", onBlur\)/);
  assert.match(huntSource, /emitPersistence\(suspendHuntRef\.current\)/);
  assert.match(
    huntSource,
    /const invalidResume =\s*\(resumeSnapshot != null && !restoredHunt\) \|\|\s*\(resumeRetryCheckpoint != null && !restoredRetry\)/,
  );
  assert.match(huntSource, />\s*Suspendre et sauvegarder\s*</);
});

test("active resume stays paused and never grants retry healing", () => {
  assert.match(
    huntSource,
    /restoreCheckpoint\(game, restoredHunt\.checkpoint, "resume"\)/,
  );
  assert.match(huntSource, /paused: mode === "resume"/);
  assert.match(huntSource, /mode === "resume"\s*\? checkpoint\.projectiles\.map/);
  assert.match(huntSource, /worldScreenId: getWorldScreenAtX\(/);
  assert.match(huntSource, /if \(mode === "retry"\) \{[\s\S]*?player\.health = Math\.max/);
  assert.match(
    huntSource,
    /player\.invulnerability = mode === "retry" \? 2 : player\.invulnerability/,
  );
  assert.doesNotMatch(huntSource, /KEY_ACTIONS/);
});

test("retry immediately replaces the pre-death active sidecar", () => {
  const restartBlock = huntSource.match(
    /const restart = \(\) => \{[\s\S]*?\n    \};\n    restartRef\.current/,
  )?.[0];
  assert.ok(restartBlock);
  assert.match(restartBlock, /lastPersistedElapsed = game\.elapsed/);
  assert.match(restartBlock, /emitPersistence\(persistHuntRef\.current\)/);
});

test("death invalidates the living sidecar before a sanctioned retry", () => {
  assert.match(
    source,
    /const invalidateActiveHuntPersistence = useCallback\(\(\) => \{[\s\S]*?clearActiveHuntSave\(\{ expectedRunId: session\.runId, expectedSequence: session\.sequence \}\)[\s\S]*?session\.lastPersisted = null/,
  );
  assert.match(
    huntSource,
    /if \(game\.phase !== lastObservedPhase\) \{[\s\S]*?if \(game\.phase === "dead"\) \{\s*invalidateHuntRef\.current\?\.\(\)/,
  );
  assert.match(
    huntSource,
    /const restart = \(\) => \{[\s\S]*?lastObservedPhase = game\.phase[\s\S]*?emitPersistence\(persistHuntRef\.current\)/,
  );
});
