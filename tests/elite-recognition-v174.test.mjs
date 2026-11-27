import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";
import { playShipAcquisitionV161 } from "./helpers/ship-receipt-v161.mjs";
import { createCradleReturnRoute } from "./helpers/buried-cradle-return-route.mjs";

const qa = homeworldSceneSsrV78();
const ceremony = qa.load("app/game/systems/eliteRecognitionV174.ts");
const mastery = qa.load("app/game/systems/eliteMasteryV170.ts");
const quatza = qa.load("app/game/systems/quatzaRij.ts");
const cradle = qa.load("app/game/systems/buriedCradle.ts");
const cradleCampaign = qa.load("app/game/systems/buriedCradleCampaign.ts");
const snapshots = qa.load("app/game/systems/buriedCradleSnapshot.ts");
const saves = qa.load("app/game/save.ts");
const { MISSIONS } = qa.load("app/game/data.ts");
const { ELITE_RECOGNITION_POSTS: POSTS } = ceremony;
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

function admit() {
  let save = saves.defaultSave(owner);
  save.profile = { ...save.profile, rankId: "elite", acquiredRankIdV166: "elite", honor: 5000 };
  for (const mission of MISSIONS) save.missionProgress[mission.id] = {
    ...save.missionProgress[mission.id], status: "completed", attempts: 1, completions: 1,
  };
  save = playShipAcquisitionV161(qa, save);
  return mastered(returnedCrown(playedSolo(save)));
}

const admission = admit();
function command(save, operation, position, expectedRevision = save.eliteRecognitionV174?.revision ?? 0) {
  return ceremony.commitEliteRecognition(save, { operation, position, expectedRevision });
}

test("the return requires the same owner's authentic Cradle, solo return and mastery, plus honor and no freeze", () => {
  assert(ceremony.canEnterEliteRecognition(admission));
  for (const field of ["buriedCradle", "quatzaRij", "eliteMasteryV170"]) {
    const missing = { ...admission, [field]: null };
    assert(!ceremony.canEnterEliteRecognition(missing), field);
    assert(!command(missing, { type: "audience", audience: "public" }, POSTS.entry).ok);
  }
  assert(!ceremony.canEnterEliteRecognition({ ...admission, createdAt: "2026-11-27T08:46:00.000Z" }));
  assert(!ceremony.canEnterEliteRecognition({ ...admission, profile: { ...admission.profile, honor: 4999 } }));
  assert(!ceremony.canEnterEliteRecognition({ ...admission, tribunalV147: { freeze: { rankId: "blooded" }, exile: null } }));
  assert(!ceremony.canWalkEliteRecognition({ row: 1, column: 4 }));
  assert(!ceremony.canWalkEliteRecognition({ row: -1, column: 1 }));
  assert(!command(admission, { type: "mark" }, POSTS.mark).ok);
  assert(!command(admission, { type: "audience", audience: "public" }, POSTS.crown).ok);
});

for (const audience of ["public", "restricted"]) test("physical proofs, witness and reload preserve a " + audience + " preparatory return", () => {
  let save = structuredClone(admission);
  function advance(operation, position) {
    const before = JSON.stringify(save);
    const result = command(save, operation, position);
    assert(result.ok, result.message);
    assert.equal(JSON.stringify(save), before);
    assert(ceremony.isEliteRecognitionSuccessor(save.eliteRecognitionV174, result.state));
    save = JSON.parse(JSON.stringify({ ...save, eliteRecognitionV174: result.state }));
    assert(ceremony.eliteRecognitionMatchesSave(save));
  }
  advance({ type: "audience", audience }, POSTS.entry);
  assert(!command(save, { type: "hear" }, POSTS[audience]).ok);
  assert(!command(save, { type: "present", proof: "crown" }, POSTS.mastery).ok);
  assert(!command(save, { type: "present", proof: "crown" }, POSTS.crown, 0).ok);
  for (const proof of ["mastery", "crown", "hunt"]) advance({ type: "present", proof }, POSTS[proof]);
  assert(!command(save, { type: "hear" }, POSTS[audience === "public" ? "restricted" : "public"]).ok);
  assert(!command(save, { type: "mark" }, POSTS.mark).ok);
  advance({ type: "hear" }, POSTS[audience]);
  advance({ type: "mark" }, POSTS.mark);
  assert.deepEqual(save.eliteRecognitionV174, {
    version: 1, ownerCreatedAt: owner, revision: 6,
    proofs: ["mastery", "crown", "hunt"], audience, witnessed: true, prepared: true,
  });
  assert.deepEqual(save.prologue, admission.prologue, "Preparing the receipt grants no narrative rite");
  assert.deepEqual(save.profile, admission.profile, "Career rank and honor remain unchanged");
  assert(!command(save, { type: "mark" }, POSTS.mark).ok);
  assert(ceremony.eliteRecognitionMatchesSave({ ...save, profile: { ...save.profile, honor: 400 } }));
  assert(!ceremony.eliteRecognitionMatchesSave({ ...save, quatzaRij: null }));
  assert.equal(ceremony.inspectEliteRecognition({ ...save.eliteRecognitionV174, version: 2 }, owner).status, "future-version");
  assert(!ceremony.isEliteRecognitionSuccessor(null, save.eliteRecognitionV174));
  assert(!ceremony.isEliteRecognitionSuccessor(save.eliteRecognitionV174, { ...save.eliteRecognitionV174, revision: 7 }));
});

test("the hall exposes preparation through actual board focus and advertises no rank grant", () => {
  const html = qa.render("app/game/EliteRecognition.tsx", { save: admission, onClose() {}, onCommand() { throw new Error("No SSR writes"); } });
  assert.match(html, /data-elite-recognition-board/);
  assert.match(html, /data-elite-audience="public"/);
  assert.match(html, /data-elite-audience="restricted"/);
  assert.doesNotMatch(html, /data-elite-mark|insigne Élite/);
});
