import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const source = homeworldSceneSsrV78();
const O = source.load("app/game/systems/originsV151.ts");
const T = source.load("app/game/systems/originTrophyV157.ts");

const ctx = (ownedTrophyIds = ["claim-1"], atWorkshop = true) => ({ atWorkshop, ownedTrophyIds });
const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const play = (origin, choice, trophyId = "claim-1") => {
  let state = O.createOriginV151(origin);
  for (let i = 0; i < 3; i++) state = ok(T.trophyTransitionStepV157(state, trophyId, i, ctx()));
  const result = T.trophyTransitionChooseV157(state, trophyId, choice, ctx());
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  return result;
};

test("data: the six « Trophée » rows -02 are copied from the V6 workbook with their row numbers", () => {
  const rows = O.TROPHY_TRANSITIONS_SOURCE_V151;
  assert.deepEqual(rows.map(r => r.id), ["O1", "O2", "O3", "O4", "O5", "O6"].map(id => `STORY5-TR-${id}-02`));
  assert.deepEqual(rows.map(r => r.sourceRow), [7, 13, 19, 25, 31, 37]);
  for (const r of rows) {
    assert.equal(r.system, "Trophée");
    assert.match(r.entry, /^Atelier accessible ; objet réel, prêt autorisé ou relevé explicitement identifié ; propriété vérifiée\./);
    assert.match(r.exit, new RegExp(`^${r.id}\\.resolved et success distincts`));
  }
  assert.equal(T.trophyTransitionV157("O1").title, "La lame n’est pas ma victoire");
  assert.equal(T.trophyTransitionV157("O5").failure, "Un prêt arrivé à échéance retire physiquement l’objet de l’exposition et laisse la place au relevé autorisé.");
  for (const id of O.ORIGIN_IDS_V151) {
    const t = T.trophyTransitionV157(id);
    assert.equal(t.steps.length, 3);
    assert.equal(t.options.length, 2);
  }
});

test("acceptance: O3 and O6 play the same workshop milestone with different scenes and reactions", () => {
  const o3 = play("O3", 0), o6 = play("O6", 0);
  assert.notEqual(T.trophyTransitionV157("O3").scene, T.trophyTransitionV157("O6").scene);
  assert.notDeepEqual(T.trophyTransitionV157("O3").steps, T.trophyTransitionV157("O6").steps);
  assert.notEqual(o3.message, o6.message);
  assert.deepEqual(o3.state.transitions["STORY5-TR-O3-02"], { steps: 3, resolved: true, success: false, choice: 0, houseId: null, trophyId: "claim-1" },
    "resolved without success: the old fragment is not in the save, its relevé stands in");
  assert.match(o3.message, /reste en réserve/);
  assert.deepEqual(o6.state.transitions["STORY5-TR-O6-02"], { steps: 3, resolved: true, success: true, choice: 0, houseId: null, trophyId: "claim-1" });
  assert.deepEqual(o6.state.relations["O6:partenaires:trophee"], { name: "les partenaires de la chasse", presence: "absent", transitionId: "STORY5-TR-O6-02", choice: 0 });
  assert.equal(Object.keys(o3.state.relations).length, 0);
  // Nothing outside the origin record: no ending, rank or reward field exists on it.
  assert.deepEqual(Object.keys(o6.state).sort(), ["consumed", "originId", "relations", "source", "transitions", "version"]);
});

test("refused without the workshop or without a trophy really owned", () => {
  const s = O.createOriginV151("O2");
  assert.equal(T.trophyTransitionStepV157(s, "claim-1", 0, ctx([])).ok, false);
  assert.equal(T.trophyTransitionStepV157(s, "claim-9", 0, ctx(["claim-1"])).reason, "Ce trophée n’est pas en ta possession.");
  assert.equal(T.trophyTransitionStepV157(s, "claim-1", 0, ctx(["claim-1"], false)).ok, false);
  assert.equal(T.trophyTransitionOpenV157(ctx([])), false);
  // A trophy gone from the save cannot close the scene either.
  let state = s;
  for (let i = 0; i < 3; i++) state = ok(T.trophyTransitionStepV157(state, "claim-1", i, ctx()));
  assert.equal(T.trophyTransitionChooseV157(state, "claim-1", 0, ctx(["claim-2"])).ok, false);
  assert.equal(T.trophyTransitionStepV157(O.createOriginV151("O2"), "claim-2", 0, ctx(["claim-1", "claim-2"])).ok, true);
  assert.equal(T.trophyTransitionChooseV157(state, "claim-2", 0, ctx(["claim-1", "claim-2"])).reason,
    "Un autre trophée est déjà posé au banc pour cette scène.");
});

test("wrong order gives the row's « Échec et reprise » text and loses nothing", () => {
  let state = O.createOriginV151("O2");
  const early = T.trophyTransitionStepV157(state, "claim-1", 2, ctx());
  assert.equal(early.ok, false);
  assert.equal(early.reason, "Une face encore non observée maintient l’étape ouverte et laisse les autres observations validées.");
  state = ok(T.trophyTransitionStepV157(state, "claim-1", 0, ctx()));
  assert.equal(T.trophyTransitionStepV157(state, "claim-1", 2, ctx()).ok, false);
  assert.equal(state.transitions["STORY5-TR-O2-02"].steps, 1);
  assert.equal(T.trophyTransitionChooseV157(state, "claim-1", 1, ctx()).ok, false, "choice waits for the gestures");
});

test("the choice is applied once; the house transition stays separate", () => {
  const done = play("O5", 1).state;
  assert.equal(T.trophyTransitionChooseV157(done, "claim-1", 0, ctx()).ok, false);
  assert.equal(T.trophyTransitionStepV157(done, "claim-1", 0, ctx()).ok, false);
  assert.deepEqual(done.consumed, ["STORY5-TR-O5-02:resolved"]);
  assert.equal(done.transitions["STORY5-TR-O5-02"].choice, 1);
  assert.equal(done.transitions["STORY5-TR-O5-01"], undefined);
  assert.equal(done.relations["O5:mara"], undefined, "the -01 relation key is not reused");
  assert.equal(done.relations["O5:mara:trophee"].presence, "absent");
});

test("save round trip: additive extension, old shapes intact, future version refused", () => {
  const done = play("O1", 0).state;
  assert.deepEqual(O.normalizeOriginV151(JSON.parse(JSON.stringify(done))), done);
  // A V151 record (house transition only) keeps its exact shape.
  const v151 = { version: 1, originId: "O4", source: "creation", consumed: ["STORY5-TR-O4-01:resolved"], relations: {},
    transitions: { "STORY5-TR-O4-01": { steps: 3, resolved: true, success: true, choice: 1, houseId: "HOME-CM07" } } };
  assert.deepEqual(O.normalizeOriginV151(v151), v151);
  assert.equal(O.normalizeOriginV151({ ...v151, version: 2 }), null);
  // A trophy resolution without its bench trophy is not kept.
  const forged = O.normalizeOriginV151({ version: 1, originId: "O1", transitions: { "STORY5-TR-O1-02": { steps: 3, resolved: true, success: true, choice: 0 } } });
  assert.deepEqual(forged.transitions["STORY5-TR-O1-02"], { steps: 0, resolved: false, success: false, choice: null, houseId: null, trophyId: null });
});

test("SSR: the workshop panel follows the stored origin and the trophies owned", () => {
  const trophies = [{ id: "claim-1", label: "Rôdeur · 19/11/2026" }];
  const props = (origin, extra = {}) => ({ origin, trophies, atWorkshop: true, disabled: false, onAction: () => ({ ok: true, message: "" }), ...extra });
  const panel = "app/game/OriginTrophyTransitionPanelV157.tsx";
  const o1 = source.render(panel, props(O.createOriginV151("O1")));
  const o6 = source.render(panel, props(O.createOriginV151("O6")));
  assert.match(o1, /La lame n’est pas ma victoire/);
  assert.match(o1, /data-origin-trophy-absent/);
  assert.match(o1, /Rôdeur · 19\/11\/2026/);
  assert.match(o6, /Le premier trophée à quatre regards/);
  assert.doesNotMatch(o6, /data-origin-trophy-absent/);
  assert.match(source.render(panel, props(undefined)), /origine par défaut d’une ancienne partie/);
  assert.match(source.render(panel, props(O.createOriginV151("O1"), { trophies: [] })), /data-origin-trophy-locked="no-trophy"/);
  assert.equal(source.render(panel, props(O.createOriginV151("O1"), { atWorkshop: false })), "");
  assert.equal(source.render(panel, props({ version: 2, originId: "O1" })), "");
  const resolved = source.render(panel, props(play("O6", 1).state));
  assert.match(resolved, /data-origin-resolved="success"/);
  assert.match(resolved, /Présenter les gestes d’atelier/);
});

test("save round trip through the real save module (normalizeSave / import)", async () => {
  const { build } = await import("esbuild");
  const compiled = await build({ stdin: { contents: `export {defaultSave, normalizeSave, parseSaveImport} from "./app/game/save";`,
    resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
  const origin = play("O4", 1).state;
  const save = { ...p.defaultSave("2026-11-19T11:00:00.000Z"), originV151: origin };
  assert.deepEqual(p.normalizeSave(JSON.parse(JSON.stringify(save))).originV151, origin);
  const imported = p.parseSaveImport(JSON.stringify(save));
  assert.ok(imported.save, String(imported.failure));
  assert.deepEqual(imported.save.originV151, origin);
  assert.equal(p.parseSaveImport(JSON.stringify({ ...save, originV151: { ...origin, version: 2 } })).failure, "future-version");
});

test("an evicted workshop trophy can be replaced after repeating its gestures", () => {
  let state = O.createOriginV151("O2");
  for (let i = 0; i < 3; i++) state = ok(T.trophyTransitionStepV157(state, "claim-1", i, ctx()));
  const available = ctx(["claim-2"]);
  assert.equal(T.trophyTransitionChooseV157(state, "claim-2", 1, available).ok, false);
  assert.equal(T.trophyTransitionStepV157(state, "claim-2", 1, available).ok, false);
  for (let i = 0; i < 3; i++) state = ok(T.trophyTransitionStepV157(state, "claim-2", i, available));
  state = ok(T.trophyTransitionChooseV157(state, "claim-2", 1, available));
  assert.equal(state.transitions["STORY5-TR-O2-02"].trophyId, "claim-2");
  assert.equal(state.transitions["STORY5-TR-O2-02"].choice, 1);
  assert.equal(T.trophyTransitionStepV157(state, "claim-3", 0, ctx(["claim-3"])).ok, false);
});

test("O6 bench keeps the exact claim on its support and orders the factual cartel", () => {
  const item = { id: "claim-1", label: "Vey", usage: "displayed", record: {
    id: "claim-1", definitionId: "trophy-vey", targetName: "Vey", targetKind: "human", partId: "insignia",
    condition: "intact", quality: "blooded", missionId: "jungle-vey", difficultyId: "normal", score: 75,
    claimedAt: "2026-11-27T09:00:00.000Z", workshop: {
      completedActions: ["clean", "prepare"], bestScore: 80, lastCompletedAt: "2026-11-27T10:00:00.000Z",
    },
  } };
  const panel = "app/game/OriginTrophyTransitionPanelV157.tsx";
  const render = (origin, trophies = [item]) => source.render(panel, {
    origin, trophies, atWorkshop: true, disabled: false, onAction: () => ({ ok: true, message: "" }),
  });
  const idle = render(O.createOriginV151("O6"));
  assert.match(idle, /data-o6-trophy-bench="claim-1"/);
  assert.match(idle, /data-o6-trophy-turned="false"/);
  assert.match(idle, /Relevé de la pièce exposée/);
  assert.match(idle, /\/game\/assets\/v15\/trophies\/trophy-vey\.webp/);
  assert.doesNotMatch(idle, /data-o6-trophy-condition|data-o6-trophy-cartel/);

  const stored = play("O6", 1).state;
  const receipt = render(stored);
  assert.match(receipt, /data-o6-trophy-turned="true"/);
  assert.match(receipt, /data-o6-trophy-condition="true">Intact/);
  assert.match(receipt, /data-o6-trophy-cartel/);
  assert.ok(receipt.indexOf("nettoyage, préparation") < receipt.indexOf("Provenance"));
  const missing = render(stored, [{ ...item, id: "claim-2", record: { ...item.record, id: "claim-2" } }]);
  assert.match(missing, /La pièce de ce cartel a quitté la réserve/);
  assert.doesNotMatch(missing, /data-o6-trophy-bench="claim-2"/);
  assert.deepEqual(stored.consumed, ["STORY5-TR-O6-02:resolved"]);
  assert.equal(stored.ending, undefined);
});
