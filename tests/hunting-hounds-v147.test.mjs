import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

const entry = `
export * from "./app/game/systems/huntingHoundsV147.ts";
export * from "./app/game/systems/houndKennelV147.ts";
export { normalizeSave, applyMissionResult, defaultSave, parseSaveImport } from "./app/game/save.ts";
export { actCompanionResidence, bindCompanionResidenceMission, companionResidencePresence,
  settleCompanionResidenceMission } from "./app/game/systems/companionResidence.ts";
export { createClanShipDockingState, actClanShipDocking } from "./app/game/systems/clanShipDocking.ts";
export { SHIP_INTERIOR_25D_ROOMS } from "./app/game/systems/shipInterior25d.ts";
export { MISSION_BY_ID } from "./app/game/data.ts";
`;
const bundle = build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

const recruited = (m, bond = 0) => {
  const r = m.recruitHoundV147(m.emptyHuntingHoundsV147(), { id: "breche", name: "Brèche", catalogueId: "original-companion-01" });
  assert.equal(r.ok, true);
  return bond ? { ...r.state, hounds: r.state.hounds.map(h => ({ ...h, bond })) } : r.state;
};

test("V147 orders unlock at 0 / 25 / 50 / 75; the signature order stays locked « à définir »", async () => {
  const m = await bundle;
  assert.deepEqual(m.unlockedOrdersV147(0), ["recall"]);
  assert.deepEqual(m.unlockedOrdersV147(24), ["recall"]);
  assert.deepEqual(m.unlockedOrdersV147(25), ["recall", "track"]);
  assert.deepEqual(m.unlockedOrdersV147(50), ["recall", "track", "drive"]);
  assert.deepEqual(m.unlockedOrdersV147(75), ["recall", "track", "drive", "attack"]);
  assert.deepEqual(m.unlockedOrdersV147(100), ["recall", "track", "drive", "attack"]);
  const signature = m.HOUND_ORDERS_V147.find(o => o.id === "signature");
  assert.equal(signature.bond, 100);
  assert.equal(signature.defined, false);
  assert.match(signature.label, /à définir/);
  assert.deepEqual([...m.HOUND_BOND_THRESHOLDS_V147], [25, 50, 75, 100]);
  assert.equal(m.nextBondThresholdV147(30), 50);
  assert.equal(m.nextBondThresholdV147(100), null);
});

test("V147 bond gain is capped at 5 per session and at 100", async () => {
  const m = await bundle;
  let state = recruited(m);
  let r = m.gainBondV147(state, "breche", "s1", 3); state = r.state;
  r = m.gainBondV147(state, "breche", "s1", 9); state = r.state;
  assert.equal(state.hounds[0].bond, 5);
  r = m.gainBondV147(state, "breche", "s1", 1);
  assert.equal(r.state, state);                          // cap reached for s1
  state = m.gainBondV147(state, "breche", "s2", 50).state;
  assert.equal(state.hounds[0].bond, 10);
  state = m.gainBondV147({ ...state, hounds: [{ ...state.hounds[0], bond: 98 }] }, "breche", "s3", 5).state;
  assert.equal(state.hounds[0].bond, 100);
  assert.equal(m.gainBondV147(state, "nobody", "s4", 1).reason, "unknown-hound");
});

test("V147 a wounded hound is healed only at the Chenil des Pisteurs (CITY-28)", async () => {
  const m = await bundle;
  let state = m.woundHoundV147(recruited(m), "breche", "2026-11-06T10:00:00.000Z").state;
  assert.equal(state.hounds[0].condition, "wounded");
  assert.equal(m.canHoundJoinHuntV147(state, "breche"), "wounded");
  assert.equal(m.healHoundAtKennelV147(state, "breche", "CITY-01").reason, "not-at-kennel");
  state = m.healHoundAtKennelV147(state, "breche", "CITY-28").state;
  assert.equal(state.hounds[0].condition, "ready");
  assert.equal(m.canHoundJoinHuntV147(state, "breche"), null);
  assert.equal(m.healHoundAtKennelV147(state, "breche", "CITY-28").reason, "not-wounded");
});

test("V147 death is permanent: no heal, no bond, no recruitment of the same identity", async () => {
  const m = await bundle;
  let state = m.killHoundV147(m.woundHoundV147(recruited(m, 40), "breche", "2026-11-06T10:00:00.000Z").state,
    "breche", "2026-11-06T11:00:00.000Z").state;
  assert.equal(state.hounds[0].condition, "dead");
  assert.equal(state.hounds[0].diedAt, "2026-11-06T11:00:00.000Z");
  assert.equal(m.healHoundAtKennelV147(state, "breche", "CITY-28").reason, "dead");
  assert.equal(m.gainBondV147(state, "breche", "s9", 5).reason, "dead");
  assert.equal(m.canHoundJoinHuntV147(state, "breche"), "dead");
  assert.equal(m.recruitHoundV147(state, { id: "breche", name: "Brèche II" }).reason, "fallen-identity");
  // An edited save cannot revive a recorded death.
  const edited = m.normalizeHuntingHoundsV147({ version: 1, hounds: [{ ...state.hounds[0], condition: "ready" }] });
  assert.equal(edited.hounds[0].condition, "dead");
});

test("V147 hunt reports: proposed gain rule, idempotent per hunt, ignored for a hound that could not join", async () => {
  const m = await bundle;
  const at = "2026-11-06T12:00:00.000Z", session = m.huntSessionIdV147("m1", at);
  let state = recruited(m, 20);
  state = m.applyHoundHuntReportV147(state, { houndId: "breche", ordersCompleted: 8, wounded: true, died: false }, session, at);
  assert.equal(state.hounds[0].bond, 25);
  assert.equal(state.hounds[0].condition, "wounded");
  const replay = m.applyHoundHuntReportV147(state, { houndId: "breche", ordersCompleted: 8, wounded: false, died: true }, session, at);
  assert.equal(replay, state);
  const other = m.applyHoundHuntReportV147(state, { houndId: "breche", ordersCompleted: 3, wounded: false, died: false },
    m.huntSessionIdV147("m2", at), at);
  assert.equal(other, state);                             // wounded: it could not join
  let fresh = recruited(m, 10);
  fresh = m.applyHoundHuntReportV147(fresh, { houndId: "breche", ordersCompleted: 0, wounded: false, died: false }, session, at);
  assert.equal(fresh.hounds[0].sessionId, session);
  const dead = m.applyHoundHuntReportV147(recruited(m, 10), { houndId: "breche", ordersCompleted: 4, wounded: false, died: true }, session, at);
  assert.equal(dead.hounds[0].bond, 10);
  assert.equal(dead.hounds[0].condition, "dead");
});

test("V147 a hound's kill counts as the player's for the honour code (same event id)", async () => {
  const m = await bundle;
  const hound = m.killHonorV147({ enemyId: "e7", boss: false, targetName: "x", source: "hound" });
  const player = m.killHonorV147({ enemyId: "e7", boss: false, targetName: "x", source: "weapon" });
  assert.equal(hound.id, player.id);
  assert.equal(hound.creditedTo, "player");
  assert.equal(hound.value, 1);
  assert.equal(hound.kind, "honorable-kill");
  assert.equal(m.killHonorV147({ enemyId: "e7", boss: false, targetName: "x", source: "melee" }).value, 3);
  const boss = m.killHonorV147({ enemyId: "b", boss: true, targetName: "Reine", source: "hound" });
  assert.equal(boss.id, "boss-honorable-kill");
  assert.equal(boss.value, 10);
  assert.equal(m.killHonorV147({ enemyId: "b", boss: true, targetName: "Reine", source: "melee" }).kind, "duel");
  // Values stay aligned with the hunt's own kill events.
  const hunt = read("app/game/HuntCanvas.tsx");
  assert.match(hunt, /"boss-honorable-kill",\s*`Victoire sur \$\{mission\.targetName\}`,\s*source === "melee" \? 18 : 10/);
  assert.match(hunt, /source === "melee" \? "Mise à mort rapprochée" : "Proie neutralisée",\s*source === "melee" \? 3 : 1/);
});

test("V147 historical field orders work without a registered aptitude", async () => {
  const m = await bundle;
  const hound = { ...recruited(m).hounds[0], catalogueId: null };
  let field = m.createHoundFieldV147(hound, { x: 0, y: 0 });
  assert.equal(m.issueHoundOrderV147(field, "attack", 50, "p1").reason, "locked");
  assert.equal(m.issueHoundOrderV147(field, "signature", 100).reason, "undefined-order");
  assert.equal(m.issueHoundOrderV147(field, "attack", 80).reason, "no-target");
  const prey = [{ id: "near", x: 200, y: 0, alive: true, trailAge: 30 }, { id: "fresh", x: 600, y: 0, alive: true, trailAge: 2 }];
  const run = (f, n, player = { x: 0, y: 0 }, p = prey) => {
    const events = [];
    for (let i = 0; i < n; i++) { const r = m.stepHoundFieldV147(f, { dt: 0.1, player, prey: p }); f = r.field; events.push(...r.events); }
    return { field: f, events };
  };
  field = m.issueHoundOrderV147(field, "track", 25).field;
  let r = run(field, 20);
  assert.deepEqual(r.events.filter(e => e.type === "marked").map(e => e.preyId), ["fresh"]);
  assert.ok(r.field.x > m.HOUND_FIELD_V147.heelDistance, "the hunter recalls from a real distance");
  assert.equal(r.field.ordersCompleted, 1);
  field = m.issueHoundOrderV147(r.field, "recall", 0).field;
  r = run(field, 60);
  assert.equal(r.events.filter(e => e.type === "returned").length, 1);
  assert.equal(r.field.ordersCompleted, 2);
  field = m.issueHoundOrderV147(r.field, "drive", 50, "fresh").field;
  r = run(field, 60);
  const push = r.events.find(e => e.type === "push");
  assert.ok(push && push.dx < 0, "pushes the prey toward the player");
  field = m.issueHoundOrderV147(r.field, "attack", 75, "near").field;
  r = run(field, 30);
  const bites = r.events.filter(e => e.type === "bite");
  assert.ok(bites.length >= 1 && bites.every(e => e.preyId === "near" && e.damage === 12));
  r = run(r.field, 1, { x: 0, y: 0 }, [{ ...prey[0], alive: false }, prey[1]]);
  assert.deepEqual(r.events.map(e => e.type), ["attack-done"]);
  // Wounded: drops its order, only recall is obeyed; at 0 it dies for good.
  let hurt = m.damageHoundFieldV147(m.issueHoundOrderV147(field, "attack", 75, "near").field, 40);
  assert.equal(hurt.wounded, true);
  assert.equal(hurt.order, "recall");
  assert.equal(m.issueHoundOrderV147(hurt, "track", 80).reason, "wounded");
  hurt = m.damageHoundFieldV147(hurt, 100);
  assert.equal(hurt.dead, true);
  assert.deepEqual(m.houndHuntReportFromFieldV147(hurt), { houndId: "breche", ordersCompleted: hurt.ordersCompleted, wounded: true, died: true });
});

test("V147 save: field written only when present, future version refused, mission result applied once", async () => {
  const m = await bundle;
  const save = m.defaultSave("2026-11-06T00:00:00.000Z");
  const legacy = m.normalizeSave(save);
  assert.equal("houndsV147" in legacy, false);
  assert.equal(m.parseSaveImport(JSON.stringify({ ...save, houndsV147: { version: 2, hounds: [] } })).failure, "future-version");
  const withHound = m.normalizeSave({ ...save, houndsV147: recruited(m, 22) });
  assert.equal(withHound.houndsV147.hounds[0].bond, 22);
  const missionId = Object.keys(save.missionProgress)[0];
  const result = {
    missionId, difficultyId: save.settings.difficultyId, outcome: "failed", score: 0, elapsedSeconds: 10,
    completedObjectiveIds: [], honorEvents: [], trophyQuality: null, trophyClaims: [], kills: 0, scans: 0,
    secondWindUsed: false, houndV147: { houndId: "breche", ordersCompleted: 9, wounded: true, died: false },
    completedAt: "2026-11-06T00:10:00.000Z",
  };
  const after = m.applyMissionResult(withHound, result);
  assert.equal(after.houndsV147.hounds[0].bond, 27);
  assert.equal(after.houndsV147.hounds[0].condition, "wounded");
  const again = m.applyMissionResult(after, result);
  assert.equal(again.houndsV147.hounds[0].bond, 27);
  const reloaded = m.normalizeSave(JSON.parse(JSON.stringify(after)));
  assert.deepEqual(reloaded.houndsV147, after.houndsV147);
  // No hound recruited: a report changes nothing and adds no field.
  assert.equal("houndsV147" in m.applyMissionResult(legacy, result), false);
});

test("V147 panel is mounted in the companions register and never recruits", () => {
  const panel = read("app/game/HuntingHoundsPanelV147.tsx");
  const chronicle = read("app/game/ClanChroniclePanel.tsx");
  assert.match(chronicle, /<HuntingHoundsPanelV147 hounds=\{save\.houndsV147\} \/>/);
  assert.doesNotMatch(panel, /recruitHoundV147/);
  assert.match(panel, /Aucun chien recruté/);
});

test("CITY-28 adopts exactly one catalogue identity at the displayed price", async () => {
  const m = await bundle;
  const previous = m.defaultSave("2026-11-06T00:00:00.000Z");
  const price = m.HOUND_KENNEL_ADOPTION_PRICE_V147;
  const catalogueId = m.HOUND_CATALOGUE_V147[0].id;
  const action = { type: "recruit", catalogueId, name: "  Trace-de-Cendre " };
  const buy = save => m.applyKennelActionV147(save, action, m.HOUND_KENNEL_LOCATION_V147);
  assert.equal(buy(previous).reason, "insufficient-clan-marks");
  assert.equal(previous.profile.clanMarks, 0);
  assert.equal(previous.houndsV147, undefined);
  previous.profile.clanMarks = price;
  assert.equal(m.applyKennelActionV147(previous, action, "CITY-01").reason, "not-at-kennel");
  const adopted = buy(previous);
  assert.equal(adopted.ok, true);
  assert.equal(adopted.clanMarks, 0);
  assert.equal(adopted.houndsV147.activeHoundId, catalogueId);
  assert.equal(adopted.houndsV147.hounds[0].name, "Trace-de-Cendre");
  assert.equal(previous.houndsV147, undefined);
  assert.equal(previous.profile.clanMarks, price);
  const reloaded = m.parseSaveImport(JSON.stringify({
    ...previous, houndsV147: adopted.houndsV147, profile: { ...previous.profile, clanMarks: adopted.clanMarks },
  })).save;
  assert.deepEqual(reloaded.houndsV147, adopted.houndsV147);
  assert.equal(reloaded.profile.clanMarks, 0);
  assert.equal(buy(reloaded).reason, "already-recruited");
});

test("CITY-28 recognizes historical catalogue links, preserves a fallen hound and heals without payment", async () => {
  const m = await bundle;
  const save = m.defaultSave();
  const original = recruited(m, 25);
  const wounded = m.woundHoundV147(original, "breche", "2026-11-06T10:00:00.000Z").state;
  const care = m.applyKennelActionV147({ ...save, houndsV147: wounded }, { type: "heal", houndId: "breche" }, "CITY-28");
  assert.equal(care.ok, true);
  assert.equal(care.clanMarks, 0);
  assert.equal(care.houndsV147.hounds[0].condition, "ready");
  const choose = m.applyKennelActionV147({ ...save, houndsV147: care.houndsV147 }, { type: "choose", houndId: "breche" }, "CITY-28");
  assert.equal(choose.ok, true);
  assert.equal(m.activeHoundV147(choose.houndsV147).bond, 25);
  const fallen = m.killHoundV147(choose.houndsV147, "breche", "2026-11-06T11:00:00.000Z").state;
  assert.equal(m.activeHoundV147(fallen), null);
  const catalogueId = fallen.hounds[0].catalogueId;
  assert.equal(m.kennelCandidatesV147(fallen).find(candidate => candidate.id === catalogueId).status, "fallen");
  const retry = m.applyKennelActionV147({ ...save, houndsV147: fallen }, { type: "recruit", catalogueId, name: "" }, "CITY-28");
  assert.equal(retry.reason, "fallen-identity");
});

test("Idle and repeated idle recall earn nothing, and a checkpoint preserves the executed order", async () => {
  const m = await bundle;
  const hound = recruited(m, 75).hounds[0], at = { x: 0, y: 0 };
  const step = (field, prey = []) => m.stepHoundFieldV147(field, { dt: 0.1, player: at, prey });
  let { field } = step(m.createHoundFieldV147(hound, at));
  assert.equal(field.ordersCompleted, 0);
  ({ field } = step(m.issueHoundOrderV147(field, "recall", hound.bond).field));
  assert.equal(field.ordersCompleted, 1);
  ({ field } = step(m.issueHoundOrderV147(field, "recall", hound.bond).field));
  assert.equal(field.ordersCompleted, 1);
  const attack = m.issueHoundOrderV147(field, "attack", hound.bond, "prey").field;
  const restored = m.restoreHoundFieldV147(JSON.parse(JSON.stringify(m.snapshotHoundFieldV147(attack))));
  assert.deepEqual(restored, attack);
  let lost = step(restored);
  assert.deepEqual(lost.events, [{ type: "target-lost", preyId: "prey" }]);
  assert.equal(lost.field.ordersCompleted, 1);
  lost = step(lost.field, [{ id: "prey", alive: true, x: 0, y: 0 }]);
  assert.deepEqual(lost.events, []);
  const defeated = step(restored, [{ id: "prey", alive: false, x: 0, y: 0 }]);
  assert.deepEqual(defeated.events, [{ type: "attack-done", preyId: "prey" }]);
  assert.equal(defeated.field.ordersCompleted, 2);
});

test("the listed kennel roles use their own field stats and signature orders", async () => {
  const m = await bundle;
  const at = { x: 0, y: 0 };
  const forCatalogue = catalogueId => m.createHoundFieldV147({ ...recruited(m).hounds[0], catalogueId }, at);
  const step = (field, x) => m.stepHoundFieldV147(field, {
    dt: 0.1, player: at, prey: [{ id: "prey", alive: true, x, y: 0 }],
  });
  const aptitudes = new Set(m.HOUND_CATALOGUE_V147.map(entry => m.houndAptitudeV147(entry.id)));
  assert.deepEqual(aptitudes, new Set(["guard", "driver", "tracker"]));
  assert(m.HOUND_CATALOGUE_V147.every(entry => m.houndAptitudeV147(entry.id)));

  const tracker = forCatalogue("original-companion-05");
  assert.equal(m.issueHoundOrderV147(tracker, "signature", 99).reason, "locked");
  assert.equal(m.nextHoundOrderV147("attack", 100, false, tracker.aptitude), "recall");
  assert.equal(m.nextHoundOrderV147("drive", 100, false, tracker.aptitude), "signature");
  assert.deepEqual(step(m.issueHoundOrderV147(tracker, "track", 100).field, 233).events, []);
  const signature = m.issueHoundOrderV147(tracker, "signature", 100).field;
  const restored = m.restoreHoundFieldV147(m.snapshotHoundFieldV147(signature));
  assert.deepEqual(restored, signature);
  assert.deepEqual(step(restored, 233).events, [{ type: "marked", preyId: "prey", visibleSeconds: 12 }]);
  const legacySnapshot = m.snapshotHoundFieldV147({ ...tracker, order: "track" });
  delete legacySnapshot.aptitude;
  legacySnapshot.version = 1;
  assert.equal(m.restoreHoundFieldV147(legacySnapshot).order, "track");
  assert.equal(m.restoreHoundFieldV147({ ...legacySnapshot, order: "signature" }), null);

  const driver = { ...forCatalogue("original-companion-02"), x: 225 };
  const normalDrive = step(m.issueHoundOrderV147(driver, "drive", 100).field, 135);
  assert.deepEqual(normalDrive.events, [{ type: "driven", preyId: "prey" }]);
  const closeDrive = step(m.issueHoundOrderV147(driver, "signature", 100).field, 135);
  assert(closeDrive.events.some(event => event.type === "push" && event.dx < -9));
  assert.equal(closeDrive.field.orderDone, false);

  const guard = forCatalogue("original-companion-01");
  assert(guard.maxHealth > driver.maxHealth && driver.maxHealth > tracker.maxHealth);
  assert.equal(m.issueHoundOrderV147(guard, "signature", 100).reason, "no-target");
  const charge = step(m.issueHoundOrderV147(guard, "signature", 100, "prey").field, 0);
  assert.deepEqual(charge.events, [{ type: "bite", preyId: "prey", damage: 20 }]);
  assert.equal(charge.field.ordersCompleted, 1);
  assert.deepEqual(step(charge.field, 0).events, []);
});

test("Brèche follows the real rescue and refit before joining the kennel field roster", async () => {
  const m = await bundle;
  const owner = "2026-11-06T00:00:00.000Z", shipId = "classic-predator-spaceship", missionId = "jungle-vey";
  const host = { kind: "personal", shipId };
  const enroll = { type: "recruit", catalogueId: "breche", name: "" };
  let save = m.defaultSave(owner);
  save = { ...save, profile: { ...save.profile, clanMarks: 150 } };
  assert(!m.kennelCandidatesV147(save.houndsV147, m.brecheAdmittedV147(save, shipId)).some(entry => entry.id === "breche"));
  assert.equal(m.applyKennelActionV147(save, enroll, "CITY-28").reason, "breche-campaign-required");
  const mission = m.MISSION_BY_ID[missionId];
  const huntResult = completedAt => ({ missionId, difficultyId: "hunter", outcome: "success", score: 80, scans: 3,
    elapsedSeconds: 240, completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === "extract").map(item => item.id),
    honorEvents: [], trophyQuality: "elite", trophyClaims: [{ id: "breche-proof", definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: "pristine", quality: "elite" }],
    kills: 3, secondWindUsed: false, completedAt });
  const atStation = (command, roomId = "clan-archives") => {
    const result = m.actCompanionResidence({
      ...command, expectedRevision: save.companionResidence?.revision ?? 0, ownerCreatedAt: owner,
    }, {
      save, selectedShipId: shipId, ownedShipIds: [shipId], active: true, site: "personal",
      observation: { site: "personal", roomId, ...m.SHIP_INTERIOR_25D_ROOMS[roomId].station.approach },
    });
    assert.equal(result.accepted, true, result.message);
    save = { ...save, companionResidence: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
  };
  save = m.applyMissionResult(save, huntResult("2026-11-06T01:00:00.000Z"));
  atStation({ type: "discover" });
  atStation({ type: "accept-contact", id: "breche" });
  const encounterRun = save.missionProgress[missionId].attempts;
  const bound = m.bindCompanionResidenceMission(save, { ownerCreatedAt: owner, missionId, encounterRun, shipId,
    insertion: { version: 1, method: "ship", team: "solo" } });
  assert(bound.accepted, bound.message);
  save = { ...save, companionResidence: bound.state };
  const raw = huntResult("2026-11-06T02:00:00.000Z");
  const progressed = m.applyMissionResult(save, raw);
  const returned = m.settleCompanionResidenceMission(save, progressed, raw, { ownerSaveCreatedAt: owner, missionId, encounterRun });
  assert(returned.accepted, returned.message);
  save = { ...progressed, companionResidence: returned.state };
  atStation({ type: "prepare-contact", id: "breche", stepId: "care", choiceId: "quiet-care" }, "medical-bay");
  atStation({ type: "prepare-contact", id: "breche", stepId: "recall", choiceId: "recall-stop" }, "training-arena");
  atStation({ type: "recruit", id: "breche" });
  assert.equal(m.brecheAdmittedV147(save, shipId), false, "rescue alone leaves Brèche at the refuge");
  let docking = m.createClanShipDockingState(owner, shipId);
  for (const type of ["approach", "dock"]) {
    const result = m.actClanShipDocking(docking, { type }, { ownerCreatedAt: owner, personalShipId: shipId });
    assert(result.accepted, result.message);
    docking = result.state;
  }
  save = { ...save, clanShipDocking: docking };
  atStation({ type: "plan-refit", id: "breche", host });
  atStation({ type: "fund-refit", id: "breche" }, "launch-airlock");
  atStation({ type: "complete-refit", id: "breche" }, "launch-airlock");
  assert.equal(m.brecheAdmittedV147(save, "wolf-ship"), false);
  assert.equal(m.kennelCandidatesV147(save.houndsV147, m.brecheAdmittedV147(save, shipId)).at(-1).name, "Brèche");
  const registered = m.applyKennelActionV147(save, enroll, "CITY-28", m.brecheAdmittedV147(save, shipId));
  assert(registered.ok);
  assert.equal(registered.clanMarks, save.profile.clanMarks);
  save = m.normalizeSave({ ...save, houndsV147: registered.houndsV147 });
  const hound = m.activeKennelHoundV147(save, shipId);
  assert.equal(hound.name, "Brèche");
  assert.equal(hound.bond, 0);
  assert.equal(m.activeKennelHoundV147(save, "wolf-ship"), null);
  assert.equal(m.applyKennelActionV147(save, enroll, "CITY-28", m.brecheAdmittedV147(save, shipId)).reason, "already-recruited");
  save = { ...save, houndsV147: m.woundHoundV147(save.houndsV147, hound.id, "2026-11-06T03:00:00.000Z").state };
  assert.equal(m.activeKennelHoundV147(save, shipId), null);
  assert.equal(m.companionResidencePresence(save, host).find(entry => entry.id === "breche").availability, "recovering");
  const care = m.applyKennelActionV147(save, { type: "heal", houndId: hound.id }, "CITY-28", m.brecheAdmittedV147(save, shipId));
  assert(care.ok);
  save = { ...save, houndsV147: m.killHoundV147(care.houndsV147, hound.id, "2026-11-06T04:00:00.000Z").state };
  assert.equal(m.companionResidencePresence(save, host).find(entry => entry.id === "breche").avatarVisible, false);
  assert.equal(m.activeKennelHoundV147(save, shipId), null);
  assert.equal(m.kennelCandidatesV147(save.houndsV147).find(entry => entry.id === "breche").status, "fallen");
});

test("an active scent marker keeps its deadline and belongs only to the recorded hound and live prey", async () => {
  const m = await bundle;
  const hound = { ...recruited(m, 100).hounds[0], catalogueId: "original-companion-05" };
  const at = { x: 0, y: 0 }, prey = { id: "native-prey", alive: true, active: true, x: 233, y: 0 };
  const field = m.createHoundFieldV147(hound, at);
  const signature = m.issueHoundOrderV147(field, "signature", 100).field;
  const marked = m.stepHoundFieldV147(signature, { dt: 0.1, player: at, prey: [prey] });
  const signal = marked.events.find(event => event.type === "marked");
  assert.equal(signal.visibleSeconds, 12);
  const elapsed = 18.5, mark = { houndId: hound.id, preyId: signal.preyId, until: elapsed + signal.visibleSeconds };
  const checkpoint = JSON.parse(JSON.stringify({ field: m.snapshotHoundFieldV147(marked.field), elapsed: elapsed + 2, mark }));
  const restoredField = m.restoreHoundFieldV147(checkpoint.field);
  assert.deepEqual(m.restoreHoundMarkV147(checkpoint.mark, restoredField, checkpoint.elapsed, [prey]), mark);
  assert.equal(m.restoreHoundMarkV147(checkpoint.mark, restoredField, mark.until, [prey]), null);
  assert.equal(m.restoreHoundMarkV147({ ...mark, until: checkpoint.elapsed + 13 }, restoredField, checkpoint.elapsed, [prey]), null);
  assert.equal(m.restoreHoundMarkV147({ ...mark, houndId: "autre" }, restoredField, checkpoint.elapsed, [prey]), null);
  assert.equal(m.restoreHoundMarkV147(mark, { ...restoredField, markedIds: [] }, checkpoint.elapsed, [prey]), null);
  assert.equal(m.restoreHoundMarkV147(mark, restoredField, checkpoint.elapsed, [{ ...prey, alive: false }]), null);
  assert.equal(m.restoreHoundMarkV147(mark, restoredField, checkpoint.elapsed, [{ ...prey, active: false }]), null);
  assert.equal(m.restoreHoundMarkV147(undefined, restoredField, checkpoint.elapsed, [prey]), null);
});
