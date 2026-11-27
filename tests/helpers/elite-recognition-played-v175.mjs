import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./homeworld-scene-ssr-v78.mjs";
import { playShipAcquisitionV161 } from "./ship-receipt-v161.mjs";
import { createCradleReturnRoute } from "./buried-cradle-return-route.mjs";

import { bloodedTempleAdmissionV174 } from "./blooded-temple-fixture-v174.mjs";

export const qa = homeworldSceneSsrV78();
const mastery = qa.load("app/game/systems/eliteMasteryV170.ts");
const quatza = qa.load("app/game/systems/quatzaRij.ts");
const cradle = qa.load("app/game/systems/buriedCradle.ts");
const cradleCampaign = qa.load("app/game/systems/buriedCradleCampaign.ts");
const snapshots = qa.load("app/game/systems/buriedCradleSnapshot.ts");
const saves = qa.load("app/game/save.ts");
const { MISSIONS } = qa.load("app/game/data.ts");
const owner = "2026-11-27T08:45:00.000Z";
const ship = "classic-predator-spaceship";

function playedSolo(save) {
  const { QUATZA_INPUT: K, QUATZA_POSTS: P } = quatza;
  let frame = quatza.createQuatzaFrame("solo");
  const input = [];
  const tick = (key = 0) => {
    const next = quatza.stepQuatza("solo", frame, key);
    if (next !== frame) input.push(key);
    frame = next;
  };
  const press = key => { tick(); tick(key); tick(); };
  const walk = (x, tolerance = 4) => {
    for (let tries = 0; tries < 400 && Math.abs(x - frame.player.x) > tolerance; tries++) {
      tick(x > frame.player.x ? K.right : K.left);
    }
    assert(Math.abs(x - frame.player.x) <= tolerance, "Reach the field post by walking");
  };
  const post = x => { walk(x); press(K.interact); };
  for (const x of [P.rack, P.map, P.mobility, P.departure, P.trail]) post(x);
  walk(845);
  for (let step = 0; step < 3900 && frame.phase === "field" && frame.beast.stage !== "dead"; step++) {
    const { player, beast } = frame;
    const gap = Math.abs(beast.x - player.x);
    if (beast.stage === "recover" && player.y > 368 && gap <= 122 && player.cooldown === 0 && !(frame.previous & K.strike)) {
      tick(K.strike);
    } else if ((beast.stage === "warning" && beast.remaining < 16 && gap < 190 || beast.stage === "charge" && gap < 130) &&
        player.vy === 0 && !(frame.previous & K.jump)) {
      tick(K.jump);
    } else {
      tick(beast.stage !== "charge" && gap > 103 ? beast.x > player.x ? K.right : K.left : 0);
    }
  }
  assert.equal(frame.beast.stage, "dead");
  walk(frame.beast.x, 35);
  for (let n = 0; n < 100 && frame.player.y < 385; n++) tick();
  press(K.interact); press(K.interact);
  assert(frame.hide && frame.skull);
  walk(P.refuge);
  for (let n = 0; n < 100 && frame.player.y < 385; n++) tick();
  press(K.interact);
  post(P.witness);
  assert.equal(frame.phase, "delivered");
  let result = quatza.commitQuatzaRij(save, { type: "begin", mode: "solo", expectedAttempts: 0 });
  assert(result.ok, result.message);
  for (let offset = 0; offset < input.length; offset += 64) {
    save = { ...save, quatzaRij: result.state };
    result = quatza.commitQuatzaRij(save, {
      type: "advance", mode: "solo", expectedAttempts: 1, expectedTick: offset, input: input.slice(offset, offset + 64),
    });
    assert(result.ok, result.message);
  }
  return { ...save, quatzaRij: result.state };
}

function returnedCrown(save) {
  const context = { personalShipId: ship, ownedShipIds: [ship] };
  function apply(action) {
    const update = cradleCampaign.actBuriedCradleCampaign(save, action, context);
    assert(update.accepted, update.message);
    save = { ...save, buriedCradle: update.state, prologue: update.prologue };
  }
  apply({ type: "prepare" }); apply({ type: "depart" });
  // Admit the already won queen encounter, then exercise extraction and the exact ship debrief.
  const progress = { ...cradle.createBuriedCradleProgress(), visitedRoomIds: [...cradle.CRADLE_ROOM_IDS],
    rootRingCut: true, drainageOpened: true, shortcutIds: ["roots-fault"], bossDefeated: true, crownClaimed: true };
  let run = cradle.createBuriedCradleRun(progress, 1);
  run.roomId = "01"; run.player.x = 156; run.player.y = 508; run.player.health = 61;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert(run.extracted);
  apply({ type: "extract", progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
  return createCradleReturnRoute(qa).complete(save, context);
}

function mastered(save) {
  const select = (operation, position) => {
    const result = mastery.commitEliteMastery(save, {
      expectedRevision: save.eliteMasteryV170?.revision ?? 0, operation, position,
    });
    assert(result.ok, result.message);
    save = { ...save, eliteMasteryV170: result.state };
  };
  for (const id of ["trace", "quarry", "set-trap", "lure"]) {
    select({ type: "station", station: id }, mastery.MASTERY_STATIONS.find(post => post.id === id).point);
  }
  select({ type: "profile", profile: { primary: "track", secondary: "trap" } }, mastery.MASTERY_START);
  return save;
}

export function admitLegacyElitePreparation() {
  let save = saves.defaultSave(owner);
  save.profile = { ...save.profile, rankId: "elite", acquiredRankIdV166: "elite", honor: 5000 };
  for (const mission of MISSIONS) save.missionProgress[mission.id] = {
    ...save.missionProgress[mission.id], status: "completed", attempts: 1, completions: 1,
  };
  save = playShipAcquisitionV161(qa, save);
  return mastered(returnedCrown(playedSolo(save)));
}


export function admitEliteCampaign({ returnCrown = true } = {}) {
  const temple = qa.load("app/game/systems/bloodedTempleV174.ts");
  let save = bloodedTempleAdmissionV174();
  let time = Date.parse(save.createdAt) + 86400000;
  const play = action => {
    const result = temple.advanceBloodedTempleV174(save, {
      action, expectedRevision: save.bloodedTempleV174?.events.length ?? 0,
    }, time += 100);
    assert.ok(result.ok, result.notice);
    save = { ...save, ...result.update };
  };
  play("present");
  for (const [index, room] of temple.BLOODED_ROOMS.entries()) {
    if (room.lane) play("lane");
    play("right"); play("right"); play("interact");
    if (index === 0) { play("interact"); play("lane"); }
    play("right");
    if ("hunter" in room) { play("guard"); play("strike"); play("guard"); play("strike"); }
    if (index === 4) play("interact");
    play("right"); play("right"); play("next");
  }
  for (let repetition = 0; repetition < 2; repetition++) {
    for (const mark of [0, 1, 4, 7]) play({ mark });
    play("seal-mark");
  }
  play("return-tools");
  save.profile.honor = 7000;
  save.settings.masterVolume = 0;
  for (const mission of MISSIONS) Object.assign(save.missionProgress[mission.id], {
    status: "completed", attempts: 1, completions: 1,
  });
  save = playShipAcquisitionV161(qa, save);
  return returnCrown ? mastered(returnedCrown(playedSolo(save))) : save;
}
