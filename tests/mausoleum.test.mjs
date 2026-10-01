import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
const load = async path => {
  const output = await build({ entryPoints: [path], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  return import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
};
const museum = await load("app/game/systems/mausoleum.ts"), hw = await load("app/game/systems/homeworld.ts");
const interiors = await load("app/game/systems/homeworldInteriorsV64.ts");
const access = (rank = "blooded", adjutant = false, preview = false) => ({ rank, adjutant, preview });
const ticket = { ownerCreatedAt: "2026-09-30T09:00:00.000Z", chronicleId: "predator", galleryId: "first", actorX: 450, source: "homeworld" };

test("nine requested DLC have distinct authored records, visible representations and zero fictional installed campaigns", () => {
  assert.equal(museum.MAUSOLEUM_CHRONICLES.length, 9);
  assert.equal(new Set(museum.MAUSOLEUM_CHRONICLES.map(item => item.id)).size, 9);
  assert.equal(museum.MAUSOLEUM_INSTALLED_CAMPAIGNS.length, 0);
  for (const item of museum.MAUSOLEUM_CHRONICLES) {
    assert.equal(item.production, "not-produced");
    assert.equal(museum.mausoleumDlcState(item.id), "unavailable");
    assert.match(item.unavailableReason, /non produite et non installée/);
    for (const mask of item.masks) if (mask.src) assert(existsSync("public" + mask.src), mask.src);
  }
  const records = Object.fromEntries(museum.MAUSOLEUM_CHRONICLES.map(item => [item.id, item]));
  assert.deepEqual(records.avp.masks.map(item => item.id), ["celtic", "scar", "chopper"]);
  assert.equal(records.predators.masks.find(item => item.id === "tracker").src, null);
  assert.equal(records["jim-hopper"].masks[0].src, null);
  for (const path of ["/game/homeworld/v56/mausoleum-hall.png", "/game/homeworld/v56/mask-pedestal.png"]) assert(existsSync("public" + path));
});

test("rank access distinguishes youngling, first galleries, Blooded, Elite and actual Adjutant function", () => {
  assert.equal(museum.canVisitMausoleumGallery(access("youngling"), "first"), false);
  assert.equal(museum.canVisitMausoleumGallery(access("unblooded"), "first"), true);
  assert.equal(museum.canConsultMausoleum(access("unblooded"), "predator"), false);
  assert.equal(museum.canConsultMausoleum(access("young-blood"), "predator"), true);
  assert.equal(museum.canConsultMausoleum(access("young-blood"), "avp"), false);
  assert.equal(museum.canConsultMausoleum(access("blooded"), "avp"), true);
  assert.equal(museum.canVisitMausoleumGallery(access("blooded"), "forbidden"), false);
  assert.equal(museum.canVisitMausoleumGallery(access("elite"), "forbidden"), true);
  assert.equal(museum.canVisitMausoleumGallery(access("ancient"), "temporal"), false);
  assert.equal(museum.canVisitMausoleumGallery(access("blooded", true), "temporal"), true);
});

test("menu preview is read-only and cannot bypass campaign rank or take a mask", () => {
  const preview = museum.mausoleumAccess(null), original = museum.defaultMausoleumProgress();
  assert.equal(preview.preview, true);
  for (const item of museum.MAUSOLEUM_CHRONICLES) {
    assert.equal(museum.canConsultMausoleum(preview, item.id), false);
    assert.deepEqual(museum.recordMausoleumVisit(original, item.id, "consulted", preview), original);
  }
});

test("visits sanitize IDs, preserve provenance and never manufacture completion or rank", () => {
  const original = museum.defaultMausoleumProgress();
  const visited = museum.recordMausoleumVisit(original, "predator", "consulted", access());
  assert.deepEqual(original, museum.defaultMausoleumProgress());
  assert.deepEqual(visited.examinedIds, ["predator"]);
  assert.deepEqual(visited.consultedIds, ["predator"]);
  assert.deepEqual(museum.recordMausoleumVisit(visited, "predator", "consulted", access()), visited);
  assert.deepEqual(museum.normalizeMausoleumProgress({ version: 1, examinedIds: ["alien", "predator", "predator", 123], consultedIds: ["prey"], completedIds: ["predator"], rank: "ancient" }), { version: 1, examinedIds: ["predator", "prey"], consultedIds: ["prey"] });
  assert.deepEqual(museum.normalizeMausoleumProgress({ version: 99, consultedIds: ["predator"] }), original);
});

test("old Homeworld progress migrates without a fabricated visit; new studies round-trip beside existing quest proof", () => {
  const original = hw.defaultHomeworldProgress();
  const before = structuredClone(original); delete before.mausoleum;
  assert.deepEqual(hw.normalizeHomeworldProgress(before), original);
  original.mausoleum = museum.recordMausoleumVisit(original.mausoleum, "prey", "consulted", access());
  assert.deepEqual(hw.normalizeHomeworldProgress(JSON.parse(JSON.stringify(original))), original);
  assert.deepEqual(original.evidenceIds, []);
  assert.deepEqual(original.visitedDistrictIds, []);
});

test("mausoleum is a separate real Homeworld point, leaving trophies and investigation unchanged", () => {
  const point = hw.HOMEWORLD_POINTS.find(item => item.id === "mausoleum-service");
  assert.equal(point.service, "mausoleum");
  assert.equal(point.districtId, "esplanade");
  const room = interiors.homeworldInteriorForPointV64(point.id);
  assert.equal(room?.buildingId, "trophy-mausoleum");
  const socket = room.points.find(item => item.pointId === point.id);
  const approach = { x: socket.x, y: socket.y + 45 };
  assert.equal(interiors.isHomeworldInteriorWalkableV64(room, approach), true);
  assert.equal(interiors.nearestHomeworldInteriorTargetV64(room, approach)?.pointId, point.id);
  assert.notEqual(hw.nearestHomeworldPoint(point)?.id, point.id, "the service must not also remain remotely usable outdoors");
  assert.equal(hw.HOMEWORLD_POINTS.find(item => item.id === "trophy-service").service, "trophies");
  assert.equal(hw.HOMEWORLD_POINTS.find(item => item.id === "memory-register-point").evidenceId, "memory-register");
  const trophySocket = room.points.find(item => item.pointId === "trophy-service");
  assert.ok(trophySocket);
  assert.notDeepEqual({ x: socket.x, y: socket.y }, { x: trophySocket.x, y: trophySocket.y }, "archives and trophy service keep distinct physical sockets");
});

test("unavailable DLC and invalid access cannot even save a launch ticket", async () => {
  let saves = 0;
  for (const attempt of [ticket, { ...ticket, chronicleId: "alien" }, { ...ticket, actorX: NaN }, { ...ticket, galleryId: "forbidden" }]) {
    const result = await museum.launchMausoleumChronicle(attempt, access(), () => { saves++; return true; });
    assert.equal(result.started, false);
  }
  assert.equal(saves, 0);
});

test("future executable adapter starts only after durable return coordinates; storage failure refuses launch", async () => {
  const calls = [], adapter = { chronicleId: "predator", installed: true, owned: true, campaignVersion: "test-fixture-only", status: "ready", start: async value => { calls.push(["start", value]); return { started: true }; } };
  let result = await museum.launchMausoleumChronicle(ticket, access(), () => false, [adapter]);
  assert.equal(result.started, false); assert.equal(calls.length, 0);
  result = await museum.launchMausoleumChronicle(ticket, access(), value => { calls.push(["save", value]); return true; }, [adapter]);
  assert.equal(result.started, true);
  assert.deepEqual(calls.map(item => item[0]), ["save", "start"]);
  assert.deepEqual(calls[0][1], ticket); assert.deepEqual(calls[1][1], ticket);
  assert.notEqual(calls[0][1], ticket);
});

test("unfinished, complete and honorary states come from the registered campaign, never archive consultation", () => {
  const fixture = { chronicleId: "predator", installed: true, owned: true, campaignVersion: "fixture", status: "completed", start: async () => ({ started: true }) };
  assert.equal(museum.mausoleumDlcState("predator", [fixture]), "completed");
  assert.equal(museum.mausoleumDlcState("predator", [{ ...fixture, status: "mastered" }]), "mastered");
  assert.equal(museum.mausoleumDlcState("predator", [{ ...fixture, owned: false }]), "unavailable");
  assert.equal(museum.mausoleumDlcState("predator", [{ ...fixture, installed: false }]), "unavailable");
  assert.equal(museum.mausoleumDlcState("predator", [{ ...fixture, campaignVersion: "" }]), "unavailable");
});

test("UI explicitly distinguishes mask visualization from missing full cinematics and no production script reads owner-only DLC", () => {
  const ui = readFileSync("app/game/Mausoleum.tsx", "utf8");
  assert.match(ui, /Visualisation animée du masque en 2D/);
  assert.match(ui, /Lancer la chronique · non installée/);
  assert.match(ui, /Retirer le masque et revenir/);
  assert.doesNotMatch(ui, /private-dlc\//);
});
