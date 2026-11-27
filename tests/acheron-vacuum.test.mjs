import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACHERON_VACUUM_MISSION,
  acheronReceivedSignal,
} from "../app/game/systems/acheronVacuum.ts";
import { createBossMechanicState, stepBossMechanics } from "../app/game/systems/huntSystems.ts";

const body = (x, footY) => ({ x, y: footY - 100, width: 68, height: 100 });
const input = (overrides = {}) => ({
  receiver: body(650, 624),
  hunter: body(300, 624),
  grounded: true,
  speed: 0,
  recentImpact: 0,
  energyEmission: 0,
  energyObstructed: false,
  floorY: 624,
  platforms: [],
  ...overrides,
});

test("only a load on a shared solid support carries vibration in the vacuum", () => {
  assert.equal(acheronReceivedSignal(input()), null);
  assert.equal(acheronReceivedSignal(input({ speed: 42 })), null);
  assert.equal(acheronReceivedSignal(input({ speed: 276 })).kind, "vibration");
  assert.equal(acheronReceivedSignal(input({ speed: -276 })).kind, "vibration");
  assert.equal(acheronReceivedSignal(input({ recentImpact: 0.8 })).kind, "vibration");
  assert.equal(acheronReceivedSignal(input({ speed: 276, grounded: false })), null);
  assert.equal(acheronReceivedSignal(input({ speed: 276, receiver: body(1_050, 624) })), null);
});

test("air gaps and elevated routes do not conduct from one support to another", () => {
  const platforms = [{ x: 245, y: 472, width: 500 }];
  const hunter = body(300, 472);
  assert.equal(acheronReceivedSignal(input({ hunter, platforms, speed: 276 })), null);
  assert.equal(acheronReceivedSignal(input({ hunter, platforms, speed: 276, receiver: body(630, 472) })).kind, "vibration");
  assert.equal(acheronReceivedSignal(input({ hunter, speed: 276, receiver: body(630, 472),
    platforms: [{ x: 245, y: 472, width: 215 }, { x: 490, y: 472, width: 260 }] })), null);
});

test("a short energy emission can be detected airborne but obeys shielding and range", () => {
  const hunter = body(300, 390);
  const emission = input({ hunter, energyEmission: 0.9, grounded: false });
  assert.equal(acheronReceivedSignal(emission).kind, "energy");
  assert.equal(acheronReceivedSignal({ ...emission, energyObstructed: true }), null);
  assert.equal(acheronReceivedSignal({ ...emission, receiver: body(1_400, 624) }), null);
  assert.equal(acheronReceivedSignal({ ...emission, energyEmission: 0 }), null);
});

test("actual body contact or a confirmed blade hit remains local", () => {
  const hunter = body(600, 624);
  const local = input({ hunter, energyObstructed: true });
  assert.deepEqual(acheronReceivedSignal(local), { kind: "contact", strength: 1 });
  assert.equal(acheronReceivedSignal({ ...local, hunter: body(600, 450) }), null);
  assert.deepEqual(acheronReceivedSignal(input({ directContact: true })), { kind: "contact", strength: 1 });
});

test("the registered hunt uses the vacuum sensing rule, checkpoint sanitation and suit mix", async () => {
  assert.equal(ACHERON_VACUUM_MISSION, "ruins-ancient-guardian");
  const canvas = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
  const sound = await readFile(new URL("../app/game/sound.ts", import.meta.url), "utf8");
  assert.match(canvas, /if \(state\.world\.missionId === ACHERON_VACUUM_MISSION\) return;\s*const loadNoise/);
  assert.match(canvas, /if \(!inVacuum && state\.elapsed >= state\.nextScentAt\)/);
  assert.match(canvas, /mode === "resume" && state\.world\.missionId !== ACHERON_VACUUM_MISSION\s*\? checkpoint\.noiseEvents/);
  assert.match(canvas, /const guardianContactLost = inAcheronVacuum && !guardianSignal/);
  assert.match(canvas, /if \(guardianContactLost && boss\.pendingAttackId\)/);
  assert.match(canvas, /if \(guardianContactLost\) \{\s*boss\.velocityX = 0;/);
  assert.match(canvas, /data-acheron-signal=\{ui\.acheronSignal/);
  assert.match(sound, /private vacuumSuitCue[\s\S]*?filterType: "lowpass"/);
});

test("the Guardian preserves its attack cadence across signal loss and immediate reacquisition", () => {
  const state = createBossMechanicState(ACHERON_VACUUM_MISSION);
  const contact = {
    deltaSeconds: 2,
    elapsedSeconds: 2,
    healthRatio: 1,
    distanceToPlayer: 250,
    lineOfSight: false,
    guardianHasSignal: false,
    playerCloaked: true,
    playerOnHighGround: false,
    playerUsedRangedWeapon: false,
    playerUsedEnergyWeapon: false,
    bossHitPillar: false,
    disabledConsoleId: null,
    activeSupportCount: 0,
  };
  const lost = stepBossMechanics(state, contact);
  assert.equal(lost.decision.attackId, null);
  assert.equal(lost.state.attackCooldownSeconds, 0);
  assert.equal(lost.state.sequence, 0);
  assert.equal(lost.state.phaseElapsedSeconds, 2);
  const resumed = stepBossMechanics(lost.state, { ...contact, deltaSeconds: 1 / 60, guardianHasSignal: true });
  assert.ok(resumed.decision.attackId, "physical vibration is independent of optical line of sight and cloak");
  assert.equal(resumed.state.sequence, 1);
  assert.ok(resumed.state.attackCooldownSeconds > 0);
  const impatient = stepBossMechanics(resumed.state, { ...contact, deltaSeconds: 1 / 60, guardianHasSignal: true });
  assert.equal(impatient.decision.attackId, null);
  const otherApex = stepBossMechanics(createBossMechanicState("swamp-hydra"), contact);
  assert.ok(otherApex.decision.attackId);
});
