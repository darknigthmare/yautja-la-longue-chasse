import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, []);
  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
  );
}

const ritualPromise = importTypeScriptModule(
  "../app/game/systems/trophyRitual.ts",
);

test("a trophy rite builds a stable sequence without adjacent duplicates", async () => {
  const ritual = await ritualPromise;
  const first = ritual.createTrophyRitual("jungle-vey:vey-skull");
  const replay = ritual.createTrophyRitual("jungle-vey:vey-skull");
  assert.deepEqual(first, replay);
  assert.equal(first.sequence.length, 6);
  for (let index = 1; index < first.sequence.length; index += 1) {
    assert.notEqual(first.sequence[index], first.sequence[index - 1]);
  }
});

test("the rhythm only advances on the correct cue inside its timing window", async () => {
  const ritual = await ritualPromise;
  let state = ritual.createTrophyRitual("ice-cryostalker:apex-spine");
  state = ritual.stepTrophyRitual(
    state,
    ritual.TROPHY_RITUAL_TIMING.readyDurationSeconds,
    null,
  ).state;
  for (const expected of state.sequence) {
    const step = ritual.stepTrophyRitual(state, 0.5, expected);
    assert.equal(step.accepted, true);
    assert.equal(step.mistakeAdded, false);
    state = step.state;
  }
  assert.equal(state.status, "complete");
  assert.equal(ritual.trophyRitualProgress(state), 1);
});

test("the first hunt cue stays readable throughout the explicit ready phase", async () => {
  const ritual = await ritualPromise;
  let state = ritual.createTrophyRitual("jungle-vey:readable-cue");
  let step = ritual.stepTrophyRitual(
    state,
    ritual.TROPHY_RITUAL_TIMING.readyDurationSeconds - 0.01,
    null,
  );
  assert.equal(step.state.phase, "ready");
  assert.equal(step.state.cueElapsedSeconds, 0);
  assert.equal(step.state.mistakes, 0);
  assert.equal(step.mistakeAdded, false);
  state = step.state;

  step = ritual.stepTrophyRitual(state, 0.01, null);
  assert.equal(step.state.phase, "cue");
  assert.equal(step.state.cueElapsedSeconds, 0);
  assert.equal(step.state.mistakes, 0);
});

test("early, wrong and missed inputs fail after three explicit mistakes", async () => {
  const ritual = await ritualPromise;
  let state = ritual.createTrophyRitual("volcano-bad-blood:mask");
  state = ritual.stepTrophyRitual(
    state,
    ritual.TROPHY_RITUAL_TIMING.readyDurationSeconds,
    null,
  ).state;
  let step = ritual.stepTrophyRitual(state, 0.05, state.sequence[0]);
  assert.equal(step.state.feedback, "early");
  state = step.state;

  const wrong = ritual.TROPHY_RITUAL_ACTIONS.find(
    (action) => action !== state.sequence[state.cueIndex],
  );
  step = ritual.stepTrophyRitual(state, 0.5, wrong);
  assert.equal(step.state.feedback, "wrong");
  state = step.state;

  step = ritual.stepTrophyRitual(
    state,
    ritual.TROPHY_RITUAL_TIMING.cueTimeoutSeconds + 0.01,
    null,
  );
  assert.equal(step.state.feedback, "missed");
  assert.equal(step.state.mistakes, 3);
  assert.equal(step.state.status, "failed");
});

test("protection covers locked cinematics but not the run to the beacon", async () => {
  const ritual = await ritualPromise;
  for (const dropShipPhase of ["boarding", "departure"]) {
    assert.equal(
      ritual.isTrophyExtractionProtected({
        phase: "extraction",
        trophySecured: true,
        victoryPoseActive: false,
        dropShipPhase,
      }),
      true,
    );
  }
  for (const dropShipPhase of ["approach", "hover", "complete"]) {
    assert.equal(
      ritual.isTrophyExtractionProtected({
        phase: "extraction",
        trophySecured: true,
        victoryPoseActive: false,
        dropShipPhase,
      }),
      false,
    );
  }
  assert.equal(
    ritual.isTrophyExtractionProtected({
      phase: "extraction",
      trophySecured: true,
      victoryPoseActive: true,
      dropShipPhase: "approach",
    }),
    true,
  );
});

test("victory pose raises, holds and settles the claimed trophy", async () => {
  const ritual = await ritualPromise;
  let victory = ritual.createTrophyVictory(2.8);
  victory = ritual.stepTrophyVictory(victory, 0.95);
  assert.ok(ritual.trophyVictoryPose(victory) > 0.95);
  victory = ritual.stepTrophyVictory(victory, 1);
  assert.equal(ritual.trophyVictoryPose(victory), 1);
  victory = ritual.stepTrophyVictory(victory, 0.85);
  assert.equal(victory.complete, true);
  assert.ok(ritual.trophyVictoryPose(victory) < 0.4);
});

test("the drop ship must hover over the beacon before boarding and departure", async () => {
  const ritual = await ritualPromise;
  let ship = ritual.createDropShipArrival();
  let step = ritual.stepDropShip(ship, {
    deltaSeconds: 2,
    playerAtBeacon: true,
    requestBoarding: true,
  });
  assert.equal(step.boardingAccepted, false);
  assert.equal(step.state.phase, "approach");
  ship = step.state;

  step = ritual.stepDropShip(ship, {
    deltaSeconds: ritual.DROP_SHIP_TIMING.approachSeconds - 2,
    playerAtBeacon: false,
    requestBoarding: false,
  });
  assert.equal(step.state.phase, "hover");
  ship = step.state;
  const hoverVisual = ritual.dropShipVisual(ship, 4_900);
  assert.equal(hoverVisual.x, 4_900);
  assert.ok(hoverVisual.y < 100);
  assert.equal(hoverVisual.beamStrength, 1);

  step = ritual.stepDropShip(ship, {
    deltaSeconds: 0,
    playerAtBeacon: false,
    requestBoarding: true,
  });
  assert.equal(step.state.phase, "hover");
  step = ritual.stepDropShip(step.state, {
    deltaSeconds: 0,
    playerAtBeacon: true,
    requestBoarding: true,
  });
  assert.equal(step.boardingAccepted, true);
  assert.equal(step.state.phase, "boarding");

  step = ritual.stepDropShip(step.state, {
    deltaSeconds: ritual.DROP_SHIP_TIMING.boardingSeconds,
    playerAtBeacon: true,
    requestBoarding: false,
  });
  assert.equal(step.state.phase, "departure");
  assert.equal(ritual.dropShipVisual(step.state, 4_900).boardingProgress, 1);
  step = ritual.stepDropShip(step.state, {
    deltaSeconds: ritual.DROP_SHIP_TIMING.departureSeconds,
    playerAtBeacon: true,
    requestBoarding: false,
  });
  assert.equal(step.completed, true);
  assert.equal(step.state.phase, "complete");
});

test("HuntCanvas wires identified enemy tracks and all three input families", async () => {
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /emitEnemyFootprint\(state, enemy\)/);
  assert.match(source, /ownerSpecies: enemy\.kind/);
  assert.match(source, /stepTrophyRitual\(/);
  assert.match(source, /trophyExtractionProtected\(state\)/);
  assert.match(source, /!extractionProtected/);
  assert.match(source, /setDirection\("left", left\)/);
  assert.match(source, /pressAction\(action\)/);
  assert.match(source, /Faisceau verrouillé\. Hissage vers la soute/);
});

test("HuntCanvas carries and extracts the acquired trophy identity", async () => {
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /partId: mission\.trophy\.partId/);
  assert.match(
    source,
    /drawClaimedTrophyLayers\(context, assets, frame, state\.trophyClaim\)/,
  );
  assert.match(
    source,
    /drawExtractingTrophyLayers\([\s\S]*?definitionId: mission\.trophy\.id,[\s\S]*?partId: mission\.trophy\.partId/,
  );
  assert.match(source, /resolveV6TrophyVisualId\(trophy\)/);
  assert.match(
    source,
    /trophy\.partId !== "mask" && trophy\.partId !== "insignia"/,
  );
  assert.match(source, /trophyAtomicLayerIds\(trophy\.partId\)/);
  assert.match(source, /masksTrophiesAtlas/);
  assert.match(source, /ranksLasersAtlas/);
  assert.match(source, /\/game\/sprites\/v6\/masks-trophies-atlas\.png/);
  assert.match(source, /\/game\/sprites\/v6\/ranks-lasers-atlas\.png/);
});
