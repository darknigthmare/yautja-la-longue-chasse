import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

// The modules import JSON and extensionless paths: bundle them for Node.
const entry = `
export * from "./app/game/systems/trophyUsagesV147.ts";
export { normalizeSave, defaultSave, parseSaveImport, exportSave, applyMissionResult } from "./app/game/save.ts";
`;
const bundle = build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

const NOW = "2026-11-06T10:00:00.000Z";

function fixture(m, trophies) {
  const base = m.defaultSave("2026-11-06T00:00:00.000Z");
  const missionId = Object.keys(base.missionProgress)[0];
  const difficultyId = base.settings.difficultyId;
  const records = trophies.map((t, index) => ({
    id: t.id, definitionId: t.definitionId ?? `def-${t.id}`, targetName: t.targetName ?? `Proie ${index}`,
    targetKind: t.targetKind ?? "beast", partId: t.partId ?? "skull", condition: "intact",
    quality: t.quality ?? "blooded", missionId, difficultyId, score: t.score ?? 60,
    claimedAt: `2026-11-0${1 + (index % 5)}T00:00:0${index % 10}.000Z`,
    ...(t.prepared === false ? {} : { workshop: { completedActions: ["clean", "prepare"], bestScore: 10, lastCompletedAt: NOW } }),
    ...(t.sourceEnemyId ? { sourceEnemyId: t.sourceEnemyId } : {}),
  }));
  return m.normalizeSave({ ...base, trophies: records });
}

test("V147 older saves keep their shape: no usage field until a first usage", async () => {
  const m = await bundle;
  const save = fixture(m, [{ id: "a" }]);
  assert.equal("trophyUsagesV147" in save, false);
  assert.equal(m.trophyUsageV147(save, "a"), "reserve");
  assert.equal(m.trophyUsageV147(save, "nope"), null);
  assert.equal(m.communityRespectV147(save).value, 0);
});

test("V147 one usage at a time: displayed or worn, moving replaces the single location", async () => {
  const m = await bundle;
  let save = fixture(m, [{ id: "a" }, { id: "raw", prepared: false }]);
  assert.equal(m.checkTrophyUsageV147(save, { kind: "display", trophyId: "raw", site: "home" }).ok, false);
  assert.equal(m.applyTrophyUsageV147(save, { kind: "wear", trophyId: "raw" }, NOW), null);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "a", site: "home" }, NOW);
  assert.equal(m.trophyUsageV147(save, "a"), "displayed");
  assert.equal(m.applyTrophyUsageV147(save, { kind: "display", trophyId: "a", site: "home" }, NOW), null);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "a", site: "ship" }, NOW);
  assert.deepEqual(save.trophyUsagesV147.assignments.a, { usage: "displayed", site: "ship", since: NOW });
  save = m.applyTrophyUsageV147(save, { kind: "wear", trophyId: "a" }, NOW);
  assert.deepEqual(save.trophyUsagesV147.assignments, { a: { usage: "worn", since: NOW } });
  assert.equal(m.communityRespectV147(save).value, 0);
  save = m.applyTrophyUsageV147(save, { kind: "store", trophyId: "a" }, NOW);
  assert.equal(m.trophyUsageV147(save, "a"), "reserve");
  assert.equal(m.applyTrophyUsageV147(save, { kind: "store", trophyId: "a" }, NOW), null);
  assert.equal(save.trophies.length, 2);
});

test("V147 worn trophies are capped and give the bible's prey reactions", async () => {
  const m = await bundle;
  let save = fixture(m, [
    { id: "queen", definitionId: "xeno-queen-skull", targetName: "Reine Xénomorphe", partId: "skull", quality: "flawless" },
    { id: "plate", targetKind: "human", partId: "insignia", quality: "worthy" },
    { id: "beast", quality: "elite" },
    { id: "extra" },
  ]);
  for (const id of ["queen", "plate", "beast"]) save = m.applyTrophyUsageV147(save, { kind: "wear", trophyId: id }, NOW);
  assert.equal(m.MAX_WORN_TROPHIES_V147, 3);
  assert.equal(m.checkTrophyUsageV147(save, { kind: "wear", trophyId: "extra" }).ok, false);
  const effects = m.wornTrophyEffectsV147(save);
  assert.deepEqual(effects.reactions.map(r => [r.id, r.trophyIds]), [
    ["xeno-isolated-flee", ["queen"]], ["soldiers-aggressive", ["plate"]],
  ]);
  assert.equal(effects.moralePressure, 4 + 1 + 3);
});

test("V147 prestige raises community respect, bounded 0-100", async () => {
  const m = await bundle;
  const ids = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, quality: "flawless" }));
  let save = fixture(m, ids);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "t0", site: "home" }, NOW);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "t1", site: "base" }, NOW);
  const respect = m.communityRespectV147(save);
  assert.equal(respect.value, 20);
  assert.deepEqual(respect.bySite, { home: 10, base: 10, ship: 0 });
  for (const { id } of ids) save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: id, site: "ship" }, NOW) ?? save;
  assert.equal(m.communityRespectV147(save).value, 100);
});

test("V147 revelation: study from the reserve; the registry names leads but links none yet", async () => {
  const m = await bundle;
  let save = fixture(m, [{ id: "a" }]);
  save = m.applyTrophyUsageV147(save, { kind: "wear", trophyId: "a" }, NOW);
  assert.equal(m.checkTrophyUsageV147(save, { kind: "study", trophyId: "a" }).ok, false);
  save = m.applyTrophyUsageV147(save, { kind: "store", trophyId: "a" }, NOW);
  save = m.applyTrophyUsageV147(save, { kind: "study", trophyId: "a" }, NOW);
  assert.deepEqual(save.trophyUsagesV147.studies.a, { studiedAt: NOW, leadIds: [] });
  assert.deepEqual(m.REVELATION_LEADS_V147.map(lead => lead.id), ["W-01", "W-02", "W-03", "W-04", "W-05", "W-XVIII"]);
  assert.ok(m.REVELATION_LEADS_V147.every(lead => lead.trophyDefinitionIds.length === 0));
  // The mechanism opens a lead as soon as a registry entry names the trophy.
  assert.deepEqual(m.revelationLeadsForTrophyV147({ definitionId: "x" },
    [{ id: "W-03", kind: "warp-epoch", label: "", source: "", trophyDefinitionIds: ["x"] }]), ["W-03"]);
  assert.deepEqual(m.openedRevelationLeadsV147(save), []);
});

test("V147 exchange: explicit, keeps full provenance, pays a favour or materials, then no study", async () => {
  const m = await bundle;
  let save = fixture(m, [{ id: "a", quality: "elite", score: 80 }, { id: "b" }, { id: "c" }]);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "a", site: "home" }, NOW);
  const original = structuredClone(save.trophies.find(t => t.id === "a"));
  assert.equal(m.applyTrophyUsageV147(save, { kind: "exchange", trophyId: "a", clanId: "CL7", receive: "materials" }, NOW), null);
  assert.equal(m.applyTrophyUsageV147(save, { kind: "exchange", trophyId: "b", clanId: "CL99", receive: "favor" }, NOW), null);
  save = m.applyTrophyUsageV147(save, { kind: "store", trophyId: "a" }, NOW);
  save = m.applyTrophyUsageV147(save, { kind: "exchange", trophyId: "a", clanId: "CL7", receive: "materials" }, NOW);
  assert.equal(save.trophies.some(t => t.id === "a"), false);
  assert.equal(m.trophyUsageV147(save, "a"), "traded");
  assert.deepEqual(save.trophyUsagesV147.exchanges[0].trophy, original);
  assert.deepEqual(save.trophyUsagesV147.exchanges[0].received, { kind: "materials", units: 3 });
  const stock = save.inventory.harvestV112.archive.find(e => e.speciesId === m.EXCHANGE_MATERIAL_SPECIES_V147);
  assert.deepEqual(stock, { speciesId: "echange-clan-v147", partId: "CL7", label: "Matériaux d'échange · Artisans de la Roche Chaude", count: 3, qualityTotal: 240 });
  const study = m.checkTrophyUsageV147(save, { kind: "study", trophyId: "a" });
  assert.equal(study.ok, false);
  assert.match(study.reason, /ne peut plus être étudié/);
  save = m.applyTrophyUsageV147(save, { kind: "exchange", trophyId: "b", clanId: "CL1", receive: "favor" }, NOW);
  assert.deepEqual(m.exchangeFavorsV147(save).map(e => [e.trophy.id, e.clanId]), [["b", "CL1"]]);
  assert.deepEqual(save.trophies.map(t => t.id), ["c"]);
});

test("V147 persistence: round trip, no trophy lost, foreign entries dropped, future version refused", async () => {
  const m = await bundle;
  let save = fixture(m, [{ id: "a" }, { id: "b" }, { id: "c" }]);
  save = m.applyTrophyUsageV147(save, { kind: "display", trophyId: "a", site: "base" }, NOW);
  save = m.applyTrophyUsageV147(save, { kind: "study", trophyId: "c" }, NOW);
  save = m.applyTrophyUsageV147(save, { kind: "exchange", trophyId: "b", clanId: "CL13", receive: "favor" }, NOW);
  const reloaded = m.normalizeSave(JSON.parse(m.exportSave(save)).save);
  assert.deepEqual(reloaded.trophyUsagesV147, save.trophyUsagesV147);
  assert.deepEqual(reloaded.trophies.map(t => t.id), ["a", "c"]);

  const tampered = m.normalizeSave({ ...save, trophyUsagesV147: {
    ...save.trophyUsagesV147,
    assignments: { ...save.trophyUsagesV147.assignments, ghost: { usage: "worn", since: NOW }, c: { usage: "displayed", site: "moon", since: NOW } },
    studies: { ...save.trophyUsagesV147.studies, ghost: { studiedAt: NOW, leadIds: ["W-01"] } },
  } });
  assert.deepEqual(Object.keys(tampered.trophyUsagesV147.assignments), ["a"]);
  assert.deepEqual(Object.keys(tampered.trophyUsagesV147.studies), ["c"]);
  assert.deepEqual(tampered.trophies.map(t => t.id), ["a", "c"]);

  // A garbage V147 payload never removes trophies from the collection.
  const garbage = m.normalizeSave({ ...save, trophyUsagesV147: { version: 1, assignments: "x", exchanges: [{ trophy: save.trophies[0] }] } });
  assert.deepEqual(garbage.trophies.map(t => t.id), ["a", "c"]);
  assert.deepEqual(garbage.trophyUsagesV147.exchanges, []);

  const future = m.parseSaveImport(JSON.stringify({ ...save, trophyUsagesV147: { ...save.trophyUsagesV147, version: 2 } }));
  assert.equal(future.save, null);
  assert.equal(future.failure, "future-version");
  assert.ok(m.parseSaveImport(m.exportSave(save)).save);
});

test("V147 exchange clans are the fifteen clans of the V6 workbook", () => {
  const source = JSON.parse(read("app/game/clanWarBibleV6Source.json"));
  const doctrines = source.entries.filter(entry => entry.sheet === "Doctrines des clans")
    .map(entry => ({ id: entry.fields.find(field => field.label === "Clan id").value, name: entry.title }));
  return bundle.then(m => assert.deepEqual(m.TROPHY_EXCHANGE_CLANS_V147.map(c => ({ ...c })), doctrines));
});

test("V147 trophy wall wires the usages through the durable campaign write", () => {
  const client = read("app/game/GameClient.tsx");
  assert.match(client, /<TrophyUsageSummaryV147 save=\{save\}/);
  assert.match(client, /<TrophyUsageControlsV147/);
  assert.match(client, /applyTrophyUsageV147\(current, action\)/);
  const types = read("app/game/types.ts");
  assert.match(types, /trophyUsagesV147\?: import\("\.\/systems\/trophyUsagesV147"\)\.TrophyUsagesV147 \| null;/);
  // The V146 worn-trophies piece stays purely cosmetic.
  assert.doesNotMatch(read("app/game/systems/trophyUsagesV147.ts"), /piecesV146|hunterPiecesV146/);
});

test("V147 a later hunt keeps usages and the collection", async () => {
  const m = await bundle;
  let save = fixture(m, [{ id: "a" }]);
  save = m.applyTrophyUsageV147(save, { kind: "wear", trophyId: "a" }, NOW);
  const after = m.applyMissionResult(save, {
    missionId: save.trophies[0].missionId, difficultyId: save.settings.difficultyId, outcome: "failed", score: 0,
    elapsedSeconds: 10, completedObjectiveIds: [], honorEvents: [], trophyQuality: null, trophyClaims: [], kills: 0,
    scans: 0, secondWindUsed: false, completedAt: "2026-11-06T11:00:00.000Z",
  });
  assert.deepEqual(after.trophyUsagesV147, save.trophyUsagesV147);
  assert.deepEqual(after.trophies.map(t => t.id), ["a"]);
});
