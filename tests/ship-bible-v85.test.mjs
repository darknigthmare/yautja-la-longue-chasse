import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function moduleFor(relative) {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL(relative, import.meta.url))], bundle: true,
    format: "esm", platform: "node", target: "es2022", write: false });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
}
const [sourceApi, shipApi, chronicleApi, resourceApi] = await Promise.all([
  moduleFor("../app/game/systems/bibleSourceV85.ts"), moduleFor("../app/game/systems/shipOperationsV85.ts"),
  moduleFor("../app/game/systems/clanChronicle.ts"), moduleFor("../app/game/systems/bibleResourceV85.ts"),
]);
const publicRoot = new URL("../public/game/dialogues/v85/", import.meta.url);
const privateRoot = new URL("../work-local/drive-import-20261007/bible-v6-private/", import.meta.url);
const [dialogueBytes, shipBytes] = await Promise.all([readFile(new URL("bible-dialogues.json", publicRoot)), readFile(new URL("bible-ships.json", publicRoot))]);
const dialogues = sourceApi.readBibleDocumentV85(JSON.parse(dialogueBytes.toString("utf8")));
const ships = sourceApi.readBibleDocumentV85(JSON.parse(shipBytes.toString("utf8")));
const rowsOf = (document, name) => document.sheets.find(sheet => sheet.name === name).rows.filter(row => row.number > 5);
const valueAt = (row, column) => row.cells.find(cell => cell.address === `${column}${row.number}`)?.value;
function tinyDocument() {
  return { schemaVersion: 1, source: { workbook: "Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx", sha256: sourceApi.BIBLE_SOURCE_SHA_V85, totalWorkbookSheets: 139 },
    sheets: [{ name: "Fixture", rows: [{ number: 6, cells: [{ address: "A6", value: "source-id" }] }] }] };
}

test("the authorized public corpora are complete, byte-identical copies of the private extractions", async () => {
  const [privateDialogue, privateShips, original] = await Promise.all([
    readFile(new URL("bible-dialogues.json", privateRoot)), readFile(new URL("bible-ships.json", privateRoot)),
    readFile(new URL("../work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx", import.meta.url)),
  ]);
  assert.deepEqual(dialogueBytes, privateDialogue);
  assert.deepEqual(shipBytes, privateShips);
  assert.equal(createHash("sha256").update(original).digest("hex"), sourceApi.BIBLE_SOURCE_SHA_V85);
  assert.equal(dialogues.sheets.length, 10); assert.equal(ships.sheets.length, 19);
  for (const [name, count] of [["Scènes de dialogue V6", 730], ["Répliques V6", 6059], ["Réactions et gestes V6", 400],
    ["Choix et actions V6", 1494], ["Variantes V6", 150], ["Voix V6", 210]]) assert.equal(rowsOf(dialogues, name).length, count, name);
});

test("load tickets invalidate stale file/network responses and old cleanup cannot cancel a newer load", () => {
  const gate = resourceApi.createBibleLoadGateV85();
  const first = gate.begin(), second = gate.begin();
  assert.equal(first.signal.aborted, true); assert.equal(first.isCurrent(), false); assert.equal(second.isCurrent(), true);
  first.cancel(); assert.equal(second.isCurrent(), true);
  const visible = []; if (first.isCurrent()) visible.push("obsolete"); if (second.isCurrent()) visible.push("latest");
  assert.deepEqual(visible, ["latest"]);
  gate.cancel(); assert.equal(second.signal.aborted, true); assert.equal(second.isCurrent(), false);
  const third = gate.begin(); assert.equal(third.isCurrent(), true); third.cancel(); assert.equal(third.isCurrent(), false);
});

test("public loaders reject URL and HTTP failures asynchronously and keep requests on the current origin", async () => {
  const gate = resourceApi.createBibleLoadGateV85(), ticket = gate.begin();
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(url.origin, "https://game.example"); assert.equal(options.credentials, "same-origin"); assert.equal(options.signal, ticket.signal);
    return { ok: true, json: async () => tinyDocument() };
  };
  assert.equal((await resourceApi.fetchBibleDocumentsV85(["/game/dialogues/v85/bible-dialogues.json"], "https://game.example/ship", ticket.signal, fetcher)).length, 1);
  const external = resourceApi.fetchBibleDocumentsV85(["https://other.example/data.json"], "https://game.example/ship", ticket.signal, fetcher);
  assert.ok(external instanceof Promise); await assert.rejects(external, /servi par ce site/); assert.equal(calls, 1);
  await assert.rejects(resourceApi.fetchBibleDocumentsV85(["http://[bad"], "https://game.example/ship", ticket.signal, fetcher));
  await assert.rejects(resourceApi.fetchBibleDocumentsV85(["/missing"], "https://game.example/ship", ticket.signal, async () => ({ ok: false })), /disponible/);
});

test("an ignored network abort still cannot publish a late parsed response", async () => {
  const gate = resourceApi.createBibleLoadGateV85(), ticket = gate.begin();
  let resolveBody;
  const body = new Promise(resolve => { resolveBody = resolve; });
  const loading = resourceApi.fetchBibleDocumentsV85(["/corpus.json"], "https://game.example/ship", ticket.signal,
    async () => ({ ok: true, json: () => body }));
  await Promise.resolve(); gate.cancel(); resolveBody(tinyDocument());
  await assert.rejects(loading, /annulé/); assert.equal(ticket.isCurrent(), false);
});

test("every dialogue, option and conditional variant keeps a real source scene identity", () => {
  const sceneIds = new Set(rowsOf(dialogues, "Scènes de dialogue V6").map(row => valueAt(row, "A")));
  for (const name of ["Répliques V6", "Choix et actions V6", "Variantes V6"]) {
    const identifiers = new Set();
    for (const row of rowsOf(dialogues, name)) {
      assert.ok(sceneIds.has(valueAt(row, "B")), `${name} ${valueAt(row, "A")} scene`);
      assert.ok(!identifiers.has(valueAt(row, "A")), `${name} duplicate identity`);
      identifiers.add(valueAt(row, "A"));
    }
  }
});

test("the reader refuses malformed addresses, duplicate identities and nonfinite or oversized cells", () => {
  const malformed = [
    document => { document.source.sha256 = "other-workbook"; },
    document => { document.source.totalWorkbookSheets = 138; },
    document => { document.sheets[0] = null; },
    document => { document.sheets[0].rows[0] = null; },
    document => { document.sheets[0].rows[0].cells[0] = null; },
    document => { document.sheets.push(structuredClone(document.sheets[0])); },
    document => { document.sheets[0].rows.push(structuredClone(document.sheets[0].rows[0])); },
    document => { document.sheets[0].rows[0].cells.push({ address: "A6", value: "duplicate" }); },
    document => { document.sheets[0].rows[0].cells[0].address = "A7"; },
    document => { document.sheets[0].rows[0].cells[0].address = "XFE6"; },
    document => { document.sheets[0].rows[0].cells[0].value = Infinity; },
    document => { document.sheets[0].rows[0].cells[0].value = NaN; },
    document => { document.sheets[0].rows[0].cells[0].value = "x".repeat(sourceApi.BIBLE_SOURCE_LIMITS_V85.textLength + 1); },
    document => { document.sheets[0].rows[0].cells[0].formula = {}; },
  ];
  for (const corrupt of malformed) { const fixture = tinyDocument(); corrupt(fixture); assert.throws(() => sourceApi.readBibleDocumentV85(fixture)); }
  for (const value of [null, [], 0, "json"]) assert.throws(() => sourceApi.readBibleDocumentV85(value));
});

test("source formulas remain inert strings and parsing does not mutate the supplied document", () => {
  const fixture = tinyDocument();
  fixture.sheets[0].rows[0].cells[0].formula = 'WEBSERVICE("https://invalid.example/private")';
  const before = JSON.stringify(fixture);
  const result = sourceApi.readBibleDocumentV85(fixture);
  assert.equal(result.sheets[0].rows[0].cells[0].formula, fixture.sheets[0].rows[0].cells[0].formula);
  assert.equal(JSON.stringify(fixture), before);
  assert.equal(sourceApi.bibleCellValueV85(result.sheets[0], "A6"), "source-id");
});

test("exercise capacity comes from the three exact simulator rows, never hull catalogue order", () => {
  const result = sourceApi.readBibleShipExerciseSettingsV85(ships);
  assert.deepEqual(result.tiers, [{ level: 1, persons: 7 }, { level: 2, persons: 13 }, { level: 3, persons: 19 }]);
  assert.equal(result.maxPlayers, 4); assert.equal(result.occupants.length, 7); assert.equal(result.occupants[0].player, true);
  const catalogue = rowsOf(ships, "Catalogue des vaisseaux");
  assert.equal(catalogue.length, 54); assert.ok(catalogue.every(row => /^SHIP-\d+$/.test(valueAt(row, "A"))));
  const corrupted = structuredClone(ships), settings = corrupted.sheets.find(sheet => sheet.name === "Réglages des simulateurs");
  settings.rows.find(row => row.number === 6).cells.find(cell => cell.address === "E6").value = -1;
  assert.throws(() => sourceApi.readBibleShipExerciseSettingsV85(corrupted));
  assert.throws(() => sourceApi.readBibleShipExerciseSettingsV85(dialogues));
});

function provenChronicle(warp = false) {
  let state = chronicleApi.createClanChronicle();
  const prove = ids => { for (const id of ids) { const definition = chronicleApi.CHRONICLE_EVIDENCE.find(entry => entry.id === id);
    const result = chronicleApi.recordChronicleEvidence(state, { id, sourceId: definition.sourceId }); assert.equal(result.accepted, true); state = result.state; } };
  prove(["intro-begun"]);
  for (const definition of chronicleApi.CHRONICLE_RITES) {
    if (!definition.grantsRankId) continue;
    prove(definition.requiredEvidenceIds); const result = chronicleApi.performChronicleRite(state, { id: definition.id, sourceId: definition.sourceId });
    assert.equal(result.accepted, true); state = result.state; if (definition.grantsRankId === "blooded") break;
  }
  if (warp) {
    const definition = chronicleApi.CHRONICLE_RITES.find(entry => entry.id === "adjutant-appointment");
    prove([...definition.requiredEvidenceIds, "warp-module-quest"]);
    const result = chronicleApi.performChronicleRite(state, { id: definition.id, sourceId: definition.sourceId });
    assert.equal(result.accepted, true); state = result.state;
  }
  return state;
}
function manifestFixture(warp = false) {
  const manifest = { id: "operation-one", ownerSaveCreatedAt: "2026-10-07T12:00:00Z", shipId: "classic-predator-spaceship", kind: warp ? "warp" : "spatial",
    originId: "SPACE-BASE-01", destinationId: "SPACE-BASE-02", originBranchId: "origin", destinationBranchId: warp ? "history" : "origin",
    travellers: [{ id: "hunter", name: "Hunter", role: "hunter", condition: "fit", branchId: "origin" }, { id: "guest", name: "Guest", role: "guest", condition: "wounded", branchId: "origin" }],
    cargo: [{ id: "kit", name: "Owned kit", units: 1, ownerId: "hunter", purpose: "personal-kit", branchId: "origin" },
      { id: "loan", name: "Borrowed kit", units: 1, ownerId: "lender", purpose: "loan", branchId: "origin" }], outwardFuel: 2, returnFuelReserve: 3 };
  const context = { ownerSaveCreatedAt: manifest.ownerSaveCreatedAt, chronicle: provenChronicle(warp), availableShipId: manifest.shipId,
    capacity: { persons: 2, medicalPlaces: 1, cargoUnits: 2 }, availablePersonIds: ["hunter", "guest"], availableCargoIds: ["kit", "loan"],
    availableFuel: 5, routeConfirmed: true, destinationApproved: true, warpModuleInstalled: warp, returnAnchorId: warp ? "return-anchor" : null };
  return { manifest, context };
}

test("real manifest gates reject unavailable people, foreign owners, capacity overflow and absent return fuel", () => {
  const valid = manifestFixture(); assert.equal(shipApi.evaluateShipDepartureV85(valid.manifest, valid.context).allowed, true);
  const failures = [
    ({ context }) => { context.ownerSaveCreatedAt = "another-save"; },
    ({ context }) => { context.availableShipId = null; },
    ({ context }) => { context.capacity.persons = 1; },
    ({ context }) => { context.capacity.medicalPlaces = 0; },
    ({ context }) => { context.capacity.cargoUnits = null; },
    ({ context }) => { context.availablePersonIds = ["hunter"]; },
    ({ context }) => { context.availableCargoIds = ["kit"]; },
    ({ manifest }) => { manifest.travellers[1].id = "hunter"; },
    ({ manifest }) => { manifest.travellers[1].condition = "dead"; },
    ({ manifest }) => { manifest.travellers[1].branchId = "foreign"; },
    ({ manifest }) => { manifest.cargo[1].ownerId = ""; },
    ({ manifest }) => { manifest.cargo[1].units = -1; },
    ({ manifest }) => { manifest.cargo[0].units = Number.MAX_SAFE_INTEGER; manifest.cargo[1].units = Number.MAX_SAFE_INTEGER; },
    ({ manifest }) => { manifest.returnFuelReserve = 0; },
    ({ context }) => { context.availableFuel = 4; },
    ({ context }) => { context.routeConfirmed = false; },
    ({ context }) => { context.destinationApproved = false; },
  ];
  for (const corrupt of failures) { const fixture = manifestFixture(); corrupt(fixture); assert.equal(shipApi.evaluateShipDepartureV85(fixture.manifest, fixture.context).allowed, false); assert.equal(shipApi.commitShipDepartureV85(fixture.manifest, fixture.context), null); }
});

test("departure snapshots isolate later edits and a Warp return does not depend on current departure gates", () => {
  const { manifest, context } = manifestFixture(true), before = JSON.stringify({ manifest, context });
  const departure = shipApi.commitShipDepartureV85(manifest, context); assert.ok(departure);
  assert.equal(JSON.stringify({ manifest, context }), before);
  manifest.travellers[0].name = "changed"; manifest.cargo[0].name = "changed"; context.warpModuleInstalled = false; context.returnAnchorId = null;
  assert.equal(departure.manifest.travellers[0].name, "Hunter"); assert.equal(departure.manifest.cargo[0].name, "Owned kit");
  assert.equal(departure.returnAnchorId, "return-anchor"); assert.equal(departure.returnFuelReserve, 3);
  assert.equal(shipApi.evaluateShipDepartureV85(manifest, context).allowed, false);
  const receipt = { operationId: departure.manifest.id, ownerSaveCreatedAt: departure.manifest.ownerSaveCreatedAt, branchId: "origin",
    people: [{ id: "hunter", condition: "wounded" }, { id: "guest", condition: "dead" }], cargo: [{ id: "kit", disposition: "retained" }, { id: "loan", disposition: "returned-to-owner" }], witness: "Recorded return" };
  const receiptBefore = JSON.stringify(receipt), rooms = shipApi.shipReturnRoomsV85(departure, receipt); assert.ok(rooms);
  assert.deepEqual(rooms.find(room => room.stationId === "wall-armory").cargoIds, ["kit", "loan"]);
  assert.deepEqual(rooms.find(room => room.stationId === "medical-bay").personIds, ["hunter"]);
  assert.deepEqual(rooms.find(room => room.stationId === "clan-archives").personIds, ["guest"]);
  assert.equal(JSON.stringify(receipt), receiptBefore);
  for (const corrupt of [result => { result.ownerSaveCreatedAt = "foreign"; }, result => { result.branchId = "history"; },
    result => { result.people.pop(); }, result => { result.cargo[1].id = "kit"; }, result => { result.people[0].condition = "resurrected"; }]) {
    const result = structuredClone(receipt); corrupt(result); assert.equal(shipApi.shipReturnRoomsV85(departure, result), null);
  }
});
