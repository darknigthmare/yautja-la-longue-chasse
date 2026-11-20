import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real module graph (origins, trophy transitions, residence, scenes, voie objects, panels); nothing is mocked.
const source = homeworldSceneSsrV78();
const O = source.load("app/game/systems/originsV151.ts");
const T = source.load("app/game/systems/originTrophyV157.ts");
const P = source.load("app/game/systems/pathObjectsV158.ts");
const R = source.load("app/game/systems/residenceV149.ts");
const S = source.load("app/game/systems/residenceScenesV154.ts");

const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const workshop = (originId, rankId = "young-blood") => ({ originId, rankId, atWorkshop: true, region: null });
const route = (originId, regionId, zone, eventReceipts = [], rankId = "young-blood") =>
  ({ originId, rankId, atWorkshop: false, region: { regionId, runId: "run-1", zone, eventReceipts } });
const bench = (held = []) => ({ atWorkshop: true, ownedTrophyIds: ["claim-1"], heldOriginalIds: held });

/** Plays a voie mission to its choice; returns the objects state. */
function mission(objects, missionId, choice, context) {
  for (let i = 0; i < 3; i++) objects = ok(P.pathMissionStepV158(objects, missionId, i, context));
  return ok(P.pathMissionChooseV158(objects, missionId, choice, context));
}
/** Plays the -02 trophy transition with what the objects state really holds. */
function trophy(originId, objects, choice) {
  let origin = O.createOriginV151(originId);
  const held = P.heldPathOriginalIdsV158(objects);
  for (let i = 0; i < 3; i++) origin = ok(T.trophyTransitionStepV157(origin, "claim-1", i, bench(held)));
  const result = P.trophyChooseWithOriginalsV158(origin, objects, "claim-1", choice, bench());
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  return result;
}

test("data: provenance missions copied from « Missions des six voies », one original per voie O1–O5", () => {
  assert.deepEqual(P.PATH_MISSIONS_SOURCE_V158.map(m => [m.id, m.sourceRow]),
    [["O1-M16", 21], ["O2-M16", 57], ["O3-M12", 89], ["O4-M07", 120], ["O5-M19", 168]]);
  assert.equal(P.pathMissionV158("O1-M16").scene.startsWith("Une lame de Varek est restée prise dans la roche"), true);
  assert.equal(P.pathMissionV158("O1-M16").choices, "Conserver l’arme pour la confrontation ou la remettre à une garde neutre change sa garde matérielle.");
  for (const id of ["O1", "O2", "O3", "O4", "O5"]) {
    const original = P.pathOriginalForOriginV158(id);
    assert.equal(T.trophyTransitionV157(id).originalId, original.id, "the -02 scene names the registry original");
    assert.equal(P.pathMissionV158(original.missionId).originId, id);
  }
  assert.equal(P.pathOriginalForOriginV158("O6"), null);
  assert.equal(T.trophyTransitionV157("O6").originalId, null);
  assert.equal(P.pathMissionV158("O5-M19").playable, false);
  assert.match(P.pathMissionV158("O5-M19").unplayable, /Namarra/);
});

test("nothing is given by default: a new origin and an empty registry hold no original", () => {
  const empty = P.emptyPathObjectsV158();
  assert.deepEqual(empty, { version: 1, missions: {}, originals: {}, materials: {}, receipts: [] });
  assert.deepEqual(P.heldPathOriginalIdsV158(empty), []);
  const { defaultSave } = source.load("app/game/save.ts");
  assert.equal(Object.hasOwn(defaultSave("2026-11-20T08:00:00.000Z"), "pathObjectsV158"), false);
});

test("O1: O1-M16 on the Marches de Cendre route → the blade under custody → STORY5-TR-O1-02 can succeed", () => {
  const here = route("O1", "ash-marches", "passage");
  assert.equal(P.pathMissionStepV158(P.emptyPathObjectsV158(), "O1-M16", 0, route("O1", "glass-desert", "passage")).ok, false);
  assert.equal(P.pathMissionStepV158(P.emptyPathObjectsV158(), "O1-M16", 0, route("O1", "ash-marches", "village")).ok, false);
  assert.equal(P.pathMissionStepV158(P.emptyPathObjectsV158(), "O1-M16", 0, route("O2", "ash-marches", "passage")).reason, "Cette mission appartient à une autre voie.");
  const early = P.pathMissionStepV158(P.emptyPathObjectsV158(), "O1-M16", 2, here);
  assert.equal(early.reason, P.pathMissionV158("O1-M16").failure, "wrong order: the row's « Échec et reprise » text");
  const objects = mission(P.emptyPathObjectsV158(), "O1-M16", 0, here);
  assert.deepEqual(objects.originals["voie:O1:lame-de-varek"], { owner: "Varek", location: { kind: "hunter" }, missionId: "O1-M16", choice: 0 });
  assert.deepEqual(objects.receipts, ["O1-M16:resolved"]);
  const result = trophy("O1", objects, 0);
  assert.deepEqual(result.origin.transitions["STORY5-TR-O1-02"], { steps: 3, resolved: true, success: true, choice: 0, houseId: null, trophyId: "claim-1" });
  assert.doesNotMatch(result.message, /n’est pas sous ta garde/);
  // Exposure is not a transfer: owner and location unchanged.
  assert.deepEqual(result.objects, objects);
});

test("without the original the -02 scene keeps its relevé variant (blade handed to the neutral guard, or no mission)", () => {
  const given = mission(P.emptyPathObjectsV158(), "O1-M16", 1, route("O1", "ash-marches", "passage"));
  assert.deepEqual(given.originals["voie:O1:lame-de-varek"].location, { kind: "held", holder: "garde neutre" });
  assert.deepEqual(P.heldPathOriginalIdsV158(given), []);
  const relevé = trophy("O1", given, 0);
  assert.equal(relevé.origin.transitions["STORY5-TR-O1-02"].success, false);
  assert.match(relevé.message, /La lame de Varek n’est pas sous ta garde/);
  const none = trophy("O3", P.emptyPathObjectsV158(), 1);
  assert.equal(none.origin.transitions["STORY5-TR-O3-02"].success, false);
  assert.match(none.message, /reste en réserve/);
  // O5: the cable stays Mara's; the mission cannot be played here.
  const closed = P.pathMissionStepV158(P.emptyPathObjectsV158(), "O5-M19", 0, workshop("O5", "blooded"));
  assert.equal(closed.ok, false);
  assert.match(closed.reason, /Non jouable/);
  assert.equal(trophy("O5", P.emptyPathObjectsV158(), 0).origin.transitions["STORY5-TR-O5-02"].success, false);
  // Another voie's original never stands in for this one.
  const blade = mission(P.emptyPathObjectsV158(), "O1-M16", 0, route("O1", "ash-marches", "passage"));
  assert.equal(trophy("O4", blade, 1).origin.transitions["STORY5-TR-O4-02"].success, false);
});

test("O2, O3 and O4: workshop or region provenance, custody fixed by the mission's choice", () => {
  const o2 = mission(P.emptyPathObjectsV158(), "O2-M16", 1, workshop("O2"));
  assert.deepEqual(o2.originals["voie:O2:crane-partage"], { owner: "famille du joueur", location: { kind: "hunter" }, missionId: "O2-M16", choice: 1 });
  assert.equal(trophy("O2", o2, 0).origin.transitions["STORY5-TR-O2-02"].success, true);
  assert.equal(P.pathMissionStepV158(P.emptyPathObjectsV158(), "O2-M16", 0, { ...workshop("O2"), atWorkshop: false }).ok, false);

  // O3-M12 needs a run where the coffret was really recovered.
  assert.equal(P.pathMissionStepV158(P.emptyPathObjectsV158(), "O3-M12", 0, route("O3", "first-city-ruins", "passage", ["survey"])).ok, false);
  const refuge = mission(P.emptyPathObjectsV158(), "O3-M12", 0, route("O3", "first-city-ruins", "village", ["recover"]));
  assert.deepEqual(refuge.originals["voie:O3:fragment-ancien"].location, { kind: "held", holder: "refuge" });
  assert.equal(trophy("O3", refuge, 0).origin.transitions["STORY5-TR-O3-02"].success, false);
  const atelier = mission(P.emptyPathObjectsV158(), "O3-M12", 1, route("O3", "thermal-caves", "passage", ["recover"]));
  assert.equal(atelier.originals["voie:O3:fragment-ancien"].owner, "inconnu (aucune attribution certaine)");
  assert.equal(trophy("O3", atelier, 1).origin.transitions["STORY5-TR-O3-02"].success, true);

  const exam = mission(P.emptyPathObjectsV158(), "O4-M07", 1, workshop("O4"));
  assert.equal(trophy("O4", exam, 1).origin.transitions["STORY5-TR-O4-02"].success, false);
  const deposit = mission(P.emptyPathObjectsV158(), "O4-M07", 0, workshop("O4"));
  // « Déposer l'arme aux archives » moves the original in the same validation.
  const archived = trophy("O4", deposit, 0);
  assert.equal(archived.origin.transitions["STORY5-TR-O4-02"].success, true);
  assert.deepEqual(archived.objects.originals["voie:O4:arme-de-l-ancetre"].location, { kind: "held", holder: "archives" });
  assert.ok(archived.objects.receipts.includes("STORY5-TR-O4-02:archives"));
  assert.equal(deposit.originals["voie:O4:arme-de-l-ancetre"].location.kind, "hunter", "input state untouched");
  const shown = trophy("O4", deposit, 1);
  assert.deepEqual(shown.objects.originals["voie:O4:arme-de-l-ancetre"].location, { kind: "hunter" });
});

test("an original is never duplicated: one mission resolution, one registry entry, no forged entries", () => {
  const here = route("O1", "ash-marches", "passage");
  const objects = mission(P.emptyPathObjectsV158(), "O1-M16", 0, here);
  assert.equal(P.pathMissionChooseV158(objects, "O1-M16", 1, here).reason, "Cette mission est déjà résolue.");
  assert.equal(P.pathMissionStepV158(objects, "O1-M16", 0, here).ok, false);
  assert.equal(Object.keys(objects.originals).length, 1);
  // A resolution receipt from an older attempt is not replayed either.
  const replay = { ...P.emptyPathObjectsV158(), receipts: ["O1-M16:resolved"], missions: { "O1-M16": { steps: 3, resolved: false, choice: null } } };
  assert.equal(P.pathMissionChooseV158(replay, "O1-M16", 0, here).ok, false);
  // An original without its resolved provenance mission is dropped; an unknown id too.
  const forged = P.normalizePathObjectsV158({ version: 1, originals: {
    "voie:O2:crane-partage": { owner: "moi", location: { kind: "hunter" } },
    "voie:O9:inconnu": { owner: "x", location: { kind: "hunter" } } } });
  assert.deepEqual(forged.originals, {});
  // The owner always comes from the definition, not from the stored text.
  const stored = JSON.parse(JSON.stringify(objects));
  stored.originals["voie:O1:lame-de-varek"].owner = "le joueur";
  assert.equal(P.normalizePathObjectsV158(stored).originals["voie:O1:lame-de-varek"].owner, "Varek");
  // Voie originals and residence objects never share an id.
  const residence = { ...R.emptyResidenceV149(), objects: [{ id: "voie:O1:lame-de-varek", label: "x", origin: "", location: { kind: "carried" } }] };
  assert.deepEqual(P.pathRegistryConflictsV158(objects, residence), ["voie:O1:lame-de-varek"]);
  assert.deepEqual(P.pathRegistryConflictsV158(objects, R.emptyResidenceV149()), []);
});

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const base = (atHouseId, extra = {}) => ({ rankId: "young-blood", atHouseId, regionAllowed: () => true, runId: null, guestsPresent: [], invitationPending: false, ...extra });
const field = (state, runId, actions) => actions.reduce((s, action) =>
  R.recordResidenceFieldEventV149(s, { regionId: "luminous-marshes", runId, action }).state, state);
function livingAtCm07() {
  const c = base("HOME-CM07");
  let s = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", c));
  s = field(s, "r1", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM07", 0, c));
  s = field(s, "r2", ["track", "ward", "recover"]);
  return ok(R.activateFirstResidenceV149(s, "HOME-CM07", c));
}
const gestures = (scenes, residence, id, context) => {
  const count = S.sceneGesturesV154(S.sceneV154(id)).length;
  for (let i = 0; i < count; i++) {
    const r = P.applySceneActionWithStockV158(scenes, P.emptyPathObjectsV158(), residence, { kind: "gesture", sceneId: id, index: i }, context);
    assert.equal(r.ok, true, r.ok ? "" : r.reason);
    scenes = r.scenes;
  }
  return scenes;
};

test("materials: bought at the producing quarter's workshop, with marks, respect and rank", () => {
  const residence = livingAtCm07();
  const bought = P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "entretoise", residence, base("HOME-CM07"));
  assert.equal(bought.ok, true, bought.ok ? "" : bought.reason);
  assert.equal(bought.clanMarks, 8);
  assert.deepEqual(bought.state.materials, { entretoise: 1 });
  assert.equal(P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "entretoise", residence, base(null)).ok, false);
  assert.match(P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "cale", residence, base("HOME-CM07")).reason, /Enclume Lointaine/);
  assert.match(P.buyMaterialV158(P.emptyPathObjectsV158(), 1, "entretoise", residence, base("HOME-CM07")).reason, /Marques de clan insuffisantes/);
  assert.match(P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "entretoise", R.emptyResidenceV149(), base("HOME-CM07")).reason, /Confiance de l’artisan/);
  assert.match(P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "cale", R.emptyResidenceV149(), base("HOME-CM14")).reason, /Rang minimal/);
  assert.equal(P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "or", residence, base("HOME-CM07")).reason, "Matériau inconnu.");
  // Every material a scene names has a workshop.
  for (const id of Object.keys(S.SCENE_CONSUMPTION_V154))
    for (const choice of [0, 1]) for (const need of P.sceneMaterialNeedsV158(id, choice)) assert.ok(P.isMaterialV158(need.item), need.item);
  assert.deepEqual(P.sceneMaterialNeedsV158("V5-HOME-CM04-S3", 1), [{ item: "matériau", quantity: 1 }], "quantity not given: one unit (proposé)");
});

test("materials: the confirmed option takes them once; refused when the reserve is short", () => {
  const residence = livingAtCm07();
  const here = base("HOME-CM07", { runId: "r9" });
  const scenes = gestures(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", here);
  const choose = (objects, choice, sc = scenes) => P.applySceneActionWithStockV158(sc, objects, residence, { kind: "choose", sceneId: "V5-HOME-CM07-S1", choice }, here);
  const short = choose(P.emptyPathObjectsV158(), 0);
  assert.equal(short.ok, false);
  assert.match(short.reason, /Matériaux insuffisants : 1 × entretoise requis, 0 en réserve \(atelier de Maison des Pilotis Calmes\)/);
  let objects = P.buyMaterialV158(P.emptyPathObjectsV158(), 10, "entretoise", residence, base("HOME-CM07")).state;
  objects = P.buyMaterialV158(objects, 8, "entretoise", residence, base("HOME-CM07")).state;
  const taken = choose(objects, 0);
  assert.equal(taken.ok, true, taken.ok ? "" : taken.reason);
  assert.deepEqual(taken.objects.materials, { entretoise: 1 });
  assert.ok(taken.objects.receipts.includes("V5-HOME-CM07-S1:materials"));
  assert.match(taken.message, /Prélevé : 1 × entretoise/);
  assert.equal(taken.scenes.scenes["V5-HOME-CM07-S1"].choice, 0);
  // Once: no second decision and no second withdrawal.
  assert.equal(choose(taken.objects, 0, taken.scenes).ok, false);
  assert.equal(choose(taken.objects, 1, taken.scenes).ok, false);
  // The option without materials leaves the reserve untouched.
  const free = choose(objects, 1);
  assert.equal(free.ok, true);
  assert.equal(free.objects, objects);
  // Gesture order still comes from V154 and writes nothing in the reserve.
  const early = P.applySceneActionWithStockV158(S.emptyResidenceScenesV154(), objects, residence, { kind: "choose", sceneId: "V5-HOME-CM07-S1", choice: 0 }, here);
  assert.equal(early.reason, "Termine d’abord les gestes de la scène.");
});

// ---------------------------------------------------------------------------
// Saves and panels
// ---------------------------------------------------------------------------

test("save round trip: additive key, old shapes intact, future version refused", async () => {
  const { build } = await import("esbuild");
  const compiled = await build({ stdin: { contents: `export {defaultSave, normalizeSave, parseSaveImport} from "./app/game/save";`,
    resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
  let objects = mission(P.emptyPathObjectsV158(), "O4-M07", 0, workshop("O4"));
  objects = { ...objects, materials: { cale: 2, entretoise: 1 } };
  const origin = trophy("O4", objects, 1).origin;
  const scenes = { version: 1, scenes: { "V5-HOME-CM02-S2": { gestures: 4, choice: 0, consumed: [{ item: "cale", quantity: 2 }], runId: "r1" } } };
  const save = { ...p.defaultSave("2026-11-20T08:00:00.000Z"), originV151: origin, pathObjectsV158: objects, residenceScenesV154: scenes };
  assert.deepEqual(P.normalizePathObjectsV158(JSON.parse(JSON.stringify(objects))), objects);
  const normalized = p.normalizeSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(normalized.pathObjectsV158, objects);
  assert.deepEqual(normalized.originV151, origin);
  assert.deepEqual(normalized.residenceScenesV154, scenes, "a V154 decision taken before the reserve keeps its shape");
  const imported = p.parseSaveImport(JSON.stringify(save));
  assert.ok(imported.save, String(imported.failure));
  assert.deepEqual(imported.save.pathObjectsV158, objects);
  assert.equal(p.parseSaveImport(JSON.stringify({ ...save, pathObjectsV158: { ...objects, version: 2 } })).failure, "future-version");
  assert.equal(P.normalizePathObjectsV158({ ...objects, version: 2 }), null);
  // A save written before V158 keeps its shape (no key added).
  const old = p.defaultSave("2026-11-20T08:00:00.000Z");
  assert.equal(Object.hasOwn(p.normalizeSave(JSON.parse(JSON.stringify(old))), "pathObjectsV158"), false);
  // Stocks are whole numbers within bounds.
  assert.deepEqual(P.normalizePathObjectsV158({ version: 1, materials: { cale: 500, plaquette: -1, entretoise: 1.5, or: 3 } }).materials, { cale: 99 });
});

test("SSR: mission panel at the workshop, trophy panel with the real original, materials panel", () => {
  const props = (origin, objects, extra = {}) => ({ origin, objects, rankId: "young-blood", disabled: false,
    place: { atWorkshop: true, region: null }, onAction: () => ({ ok: true, message: "" }), ...extra });
  const panel = "app/game/PathMissionPanelV158.tsx";
  const ready = source.render(panel, props(O.createOriginV151("O2"), undefined));
  assert.match(ready, /Le trophée sous un autre angle/);
  assert.match(ready, /data-path-mission-state="ready"/);
  assert.match(source.render(panel, props(O.createOriginV151("O1"), undefined)), /data-path-mission-closed/);
  assert.match(source.render(panel, props(O.createOriginV151("O5"), undefined)), /Non jouable/);
  assert.equal(source.render(panel, props(O.createOriginV151("O6"), undefined)), "");
  const done = mission(P.emptyPathObjectsV158(), "O2-M16", 0, workshop("O2"));
  const resolved = source.render(panel, props(O.createOriginV151("O2"), done));
  assert.match(resolved, /data-path-original="voie:O2:crane-partage"/);
  assert.match(resolved, /propriétaire : famille du joueur/);
  // On a region route the panel appears only where its mission is played.
  const region = (zone, regionId = "ash-marches") => ({ place: { atWorkshop: false, region: { regionId, runId: "r", zone, eventReceipts: [] } } });
  assert.match(source.render(panel, props(O.createOriginV151("O1"), undefined, region("passage"))), /La lame rendue/);
  assert.equal(source.render(panel, props(O.createOriginV151("O1"), undefined, region("village"))), "");
  assert.equal(source.render(panel, props(O.createOriginV151("O2"), undefined, region("passage"))), "");

  const trophies = [{ id: "claim-1", label: "Rôdeur" }];
  const trophyPanel = "app/game/OriginTrophyTransitionPanelV157.tsx";
  const tp = (held) => ({ origin: O.createOriginV151("O2"), trophies, atWorkshop: true, disabled: false, onAction: () => ({ ok: true, message: "" }), heldOriginalIds: held });
  assert.match(source.render(trophyPanel, tp(["voie:O2:crane-partage"])), /data-origin-trophy-original="voie:O2:crane-partage"/);
  assert.match(source.render(trophyPanel, tp([])), /data-origin-trophy-absent/);

  const house = R.houseV149("HOME-CM07");
  const materials = source.render("app/game/HouseMaterialsPanelV158.tsx", { house, objects: { version: 1, materials: { cale: 2 } }, clanMarks: 4, disabled: false, onBuy: () => ({ ok: true, message: "" }) });
  assert.match(materials, /Réserve : 2 × cale/);
  assert.match(materials, /data-material-buy="entretoise"/);
  assert.match(materials, /Les entretoises de pilotis offrent une matière de mobilier propre au quartier/);
});
