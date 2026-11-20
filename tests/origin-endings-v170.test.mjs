import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const source = homeworldSceneSsrV78();
const O = source.load("app/game/systems/originsV151.ts");
const E = source.load("app/game/systems/originEndingsV170.ts");

const ctx = (rankId = "elite", atWorkshop = true) => ({ rankId, atWorkshop });
const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const choose = (originId, endingId, rankId = "elite") => {
  let state = O.createOriginV151(originId);
  state = ok(E.examineEndingV170(state, endingId, ctx(rankId)));
  return ok(E.confirmEndingV170(state, endingId, endingId, ctx(rankId)));
};

test("data: 18 endings, six M29/M30 rows, six -06 rows and STATE5-07/08, with their workbook rows", () => {
  assert.equal(E.ORIGIN_ENDINGS_V170.length, 18);
  assert.deepEqual(E.ORIGIN_ENDINGS_V170.map(e => e.sourceRow), Array.from({ length: 18 }, (_, i) => 6 + i));
  assert.equal(E.originEndingV170("O1-E1").title, "Mon seuil, mon nom");
  assert.equal(E.originEndingV170("O6-E3").title, "Transmettre puis explorer");
  for (const id of O.ORIGIN_IDS_V151) {
    assert.deepEqual(E.originEndingsV170(id).map(e => e.id), [1, 2, 3].map(n => `${id}-E${n}`));
    for (const e of E.originEndingsV170(id)) assert.match(e.condition, new RegExp(`^${id}-M29 : sélection exclusive après Elite commun`));
  }
  assert.deepEqual(E.ENDING_SELECTIONS_V170.map(r => [r.id, r.sourceRow]), [["O1-M29", 34], ["O2-M29", 70], ["O3-M29", 106], ["O4-M29", 142], ["O5-M29", 178], ["O6-M29", 214]]);
  assert.ok(E.ENDING_SELECTIONS_V170.every(r => r.minimumRank === "Elite"));
  assert.deepEqual(E.ENDING_REALIZATIONS_V170.map(r => r.sourceRow), [35, 71, 107, 143, 179, 215]);
  assert.deepEqual(E.TRANSMISSIONS_V170.map(r => [r.id, r.sourceRow]), [11, 17, 23, 29, 35, 41].map((row, i) => [`STORY5-TR-O${i + 1}-06`, row]));
  assert.ok(E.TRANSMISSIONS_V170.every(r => r.system === "Transmission" && r.entry.startsWith("Fin Oi verrouillée à Elite")));
  assert.deepEqual(E.ENDING_STATES_V170.map(r => [r.id, r.name, r.sourceRow]), [["STATE5-07", "eliteTrialOutcome", 12], ["STATE5-08", "originEndingId", 13]]);
  assert.equal(E.ENDING_STATES_V170[1].invariant, "Elder et Ancient prolongent cette fin sans la remplacer");
});

test("acceptance: two origins choose different endings", () => {
  const o1 = choose("O1", "O1-E2"), o6 = choose("O6", "O6-E1");
  assert.equal(E.originEndingIdV170(o1), "O1-E2");
  assert.equal(E.originEndingIdV170(o6), "O6-E1");
  assert.deepEqual(o1.ending, { version: 1, selectionVisited: true, originEndingId: "O1-E2", endingChoiceConfirmed: true, endingRealized: false });
  assert.deepEqual(o1.consumed, ["O1-M29:visited", "O1-M29:confirmed"]);
  // An ending of another voie is refused.
  assert.equal(E.examineEndingV170(O.createOriginV151("O1"), "O6-E1", ctx()).ok, false);
});

test("refused before Elite, outside the workshop, and for O5 (EXP10 absent)", () => {
  const s = O.createOriginV151("O2");
  for (const rank of ["young-blood", "blooded"]) {
    assert.match(E.examineEndingV170(s, "O2-E1", ctx(rank)).reason, /Rang minimal : Elite/);
    assert.match(E.confirmEndingV170(s, "O2-E1", "O2-E1", ctx(rank)).reason, /Rang minimal : Elite/);
  }
  assert.equal(E.examineEndingV170(s, "O2-E1", ctx("elder")).ok, true);
  assert.equal(E.examineEndingV170(s, "O2-E1", ctx("elite", false)).ok, false);
  assert.match(E.examineEndingV170(O.createOriginV151("O5"), "O5-E1", ctx()).reason, /EXP10/);
});

test("two-step confirmation: examining alone chooses nothing; exclusive and definitive", () => {
  let s = ok(E.examineEndingV170(O.createOriginV151("O3"), "O3-E1", ctx()));
  assert.equal(E.originEndingIdV170(s), null);
  assert.equal(s.ending.selectionVisited, true);
  // The visit is recorded once.
  const again = E.examineEndingV170(s, "O3-E2", ctx());
  assert.equal(again.changed, false);
  assert.equal(again.state, s);
  // Without examining first, or without the explicit confirmation, nothing is written.
  assert.match(E.confirmEndingV170(O.createOriginV151("O3"), "O3-E1", "O3-E1", ctx()).reason, /Examine d’abord/);
  assert.match(E.confirmEndingV170(s, "O3-E1", "", ctx()).reason, /Confirmation absente/);
  assert.match(E.confirmEndingV170(s, "O3-E1", "O3-E2", ctx()).reason, /Confirmation absente/);
  s = ok(E.confirmEndingV170(s, "O3-E3", "O3-E3", ctx()));
  assert.equal(E.originEndingIdV170(s), "O3-E3");
  // Never replaced.
  assert.equal(E.confirmEndingV170(s, "O3-E1", "O3-E1", ctx()).ok, false);
  assert.equal(E.examineEndingV170(s, "O3-E1", ctx()).ok, false);
  assert.equal(E.confirmEndingV170({ ...s, ending: undefined }, "O3-E1", "O3-E1", ctx()).ok, false, "consumed event guards too");
});

test("no rank changed: only the origin record is written; house/trophy writes keep the ending", () => {
  const before = O.createOriginV151("O4");
  const after = choose("O4", "O4-E2");
  assert.deepEqual(Object.keys(after).sort(), ["consumed", "ending", "originId", "relations", "source", "transitions", "version"]);
  assert.deepEqual({ ...after, ending: undefined, consumed: [] }, { ...before, ending: undefined });
  // Normalizing (as every later write does) keeps the confirmed ending.
  assert.deepEqual(O.normalizeOriginV151(JSON.parse(JSON.stringify(after))), after);
});

test("transmission -06: unlocked only with the ending locked and Elder; scene not playable", () => {
  const none = E.transmissionStatusV170(O.createOriginV151("O1"), "elder");
  assert.equal(none.unlocked, false);
  const locked = choose("O1", "O1-E3");
  assert.equal(E.transmissionStatusV170(locked, "elite").unlocked, false);
  const elder = E.transmissionStatusV170(locked, "elder");
  assert.equal(elder.transmission.id, "STORY5-TR-O1-06");
  assert.equal(elder.unlocked, true);
  assert.equal(elder.scenePlayable, false);
  assert.match(elder.note, /déverrouillée/);
});

test("normalization: invalid, provisional or foreign values stay unconfirmed; future ending refused", () => {
  const n = ending => O.normalizeOriginV151({ version: 1, originId: "O2", transitions: {}, relations: {}, consumed: [], ending });
  assert.deepEqual(n({ version: 1, selectionVisited: true, originEndingId: "O2-E1", endingChoiceConfirmed: false }).ending,
    { version: 1, selectionVisited: true, originEndingId: null, endingChoiceConfirmed: false, endingRealized: false });
  assert.equal(n({ version: 1, originEndingId: "O1-E1", endingChoiceConfirmed: true }).ending.originEndingId, null);
  assert.equal(n({ version: 1, originEndingId: "O2-E4", endingChoiceConfirmed: true }).ending.originEndingId, null);
  assert.equal(Object.hasOwn(n(undefined), "ending"), false, "older shape unchanged");
  assert.equal(O.isFutureOriginV151({ version: 1, originId: "O2", ending: { version: 2 } }), true);
  assert.equal(O.normalizeOriginV151({ version: 1, originId: "O2", ending: { version: 2 } }), null);
});

test("save round trip through the real save module; older save; future ending refused", async () => {
  const { build } = await import("esbuild");
  const compiled = await build({ stdin: { contents: `export {defaultSave, normalizeSave, parseSaveImport} from "./app/game/save";`,
    resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
  const origin = choose("O2", "O2-E3");
  const save = { ...p.defaultSave("2026-11-20T11:00:00.000Z"), originV151: origin };
  assert.deepEqual(p.normalizeSave(JSON.parse(JSON.stringify(save))).originV151, origin);
  const imported = p.parseSaveImport(JSON.stringify(save));
  assert.ok(imported.save, String(imported.failure));
  assert.deepEqual(imported.save.originV151, origin);
  assert.equal(imported.save.profile.rankId, save.profile.rankId);
  assert.equal(p.parseSaveImport(JSON.stringify({ ...save, originV151: { ...origin, ending: { ...origin.ending, version: 2 } } })).failure, "future-version");
  // A V151 origin without ending loads unchanged.
  const old = { ...save, originV151: O.createOriginV151("O2") };
  assert.deepEqual(p.parseSaveImport(JSON.stringify(old)).save.originV151, O.createOriginV151("O2"));
  const older = p.defaultSave("2026-11-20T08:00:00.000Z");
  assert.equal(Object.hasOwn(p.normalizeSave(JSON.parse(JSON.stringify(older))), "originV151"), false);
});

test("SSR: locked, open, confirmed and transmission states of the workshop panel", () => {
  const panel = "app/game/OriginEndingPanelV170.tsx";
  const props = (origin, extra = {}) => ({ origin, rankId: "elite", atWorkshop: true, disabled: false, onAction: () => ({ ok: true, message: "" }), ...extra });
  const open = source.render(panel, props(O.createOriginV151("O1")));
  assert.match(open, /data-origin-ending-v170="open"/);
  assert.match(open, /Choisir ce qui m’appartient/);
  assert.match(open, /data-origin-ending-examine="O1-E1"/);
  assert.match(open, /Une porte entrouverte, sous conditions/);
  assert.doesNotMatch(open, /data-origin-ending-confirm=/, "no confirm button before examining");
  const o4 = source.render(panel, props(O.createOriginV151("O4")));
  assert.match(o4, /Le nom que je porte/);
  assert.match(o4, /Réparer dans une fonction limitée/);
  assert.match(source.render(panel, props(O.createOriginV151("O1"), { rankId: "blooded" })), /data-origin-ending-locked[^>]*>Rang minimal : Elite/);
  assert.match(source.render(panel, props(O.createOriginV151("O5"))), /EXP10/);
  assert.match(source.render(panel, props(undefined)), /origine par défaut d’une ancienne partie/);
  assert.equal(source.render(panel, props(O.createOriginV151("O1"), { atWorkshop: false })), "");
  assert.equal(source.render(panel, props({ version: 1, originId: "O1", ending: { version: 2 } })), "");
  const done = choose("O6", "O6-E2");
  const confirmed = source.render(panel, props(done));
  assert.match(confirmed, /data-origin-ending-v170="O6-E2"/);
  assert.match(confirmed, /Le cercle de chasse choisi/);
  assert.match(confirmed, /data-origin-ending-realized="false"/);
  assert.match(confirmed, /data-origin-transmission="STORY5-TR-O6-06"[^>]*data-origin-transmission-unlocked="false"/);
  assert.match(source.render(panel, props(done, { rankId: "elder" })), /data-origin-transmission-unlocked="true"/);
});

test("GameClient wires the panel at the workshop and writes only originV151", async () => {
  const { readFile } = await import("node:fs/promises");
  const client = await readFile("app/game/GameClient.tsx", "utf8");
  assert.match(client, /import OriginEndingPanelV170, \{ type OriginEndingActionV170 \} from "\.\/OriginEndingPanelV170";/);
  const handler = client.slice(client.indexOf("const originEndingActionV170"), client.indexOf("// V158: voie mission that puts"));
  assert.match(handler, /persistSocialProgress\(\{ originV151: change\.state \}\)/);
  assert.doesNotMatch(handler, /profile:/);
  assert.match(client, /<OriginEndingPanelV170 origin=\{save\.originV151\} rankId=\{save\.profile\.rankId\}/);
});
