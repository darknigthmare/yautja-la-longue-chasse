import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

const entry = `
export * from "./app/game/systems/honorTribunalV147.ts";
export { normalizeSave, defaultSave, parseSaveImport, applyTribunalActionToSaveV147, recordInfractionOnSaveV147, RANK_THRESHOLDS } from "./app/game/save.ts";
`;
const bundle = build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

const NOW = "2026-11-06T10:00:00.000Z";
const witnesses = [
  { id: "accuser", name: "Evar", role: "accuser", account: "confirms-accusation" },
  { id: "yena", name: "Yena", role: "companion", account: "confirms-player" },
  { id: "tov", name: "Tov", role: "pack", account: "confirms-accusation" },
];
const traces = (extra = []) => [
  { id: "mask-1", kind: "mask-recording", label: "Enregistrement du masque de l'accusateur", shows: "act" },
  ...extra,
];
const constraint = { id: "trace-c", kind: "trace", label: "Traces d'un piège ennemi", shows: "constraint" };
const contrary = { id: "trophy-c", kind: "trophy-provenance", label: "Provenance du trophée", shows: "contrary" };

function record(m, t, kind, extra = [], jurisdiction = "internal") {
  const r = m.recordInfractionV147(t, { kind, jurisdiction, witnesses, traces: traces(extra), recordedAt: NOW });
  assert.ok(r, "record accepted");
  return r;
}
function ctx(over = {}) {
  return { honor: 3000, rankId: "elder", currentRankThreshold: 1800, missionsCompleted: 4, declaration: "recognized", now: NOW, ...over };
}
/** Plays a whole trial and returns the last result. */
function playTrial(m, t, infractionId, { present = [], call = [] } = {}, context = ctx()) {
  let r = m.applyTribunalActionV147(t, { type: "open-trial", infractionId }, context); assert.ok(r.ok, r.message);
  r = m.applyTribunalActionV147(r.tribunal, { type: "hear-accusation" }, context); assert.ok(r.ok, r.message);
  for (const traceId of present) { r = m.applyTribunalActionV147(r.tribunal, { type: "present-evidence", traceId }, context); assert.ok(r.ok, r.message); }
  r = m.applyTribunalActionV147(r.tribunal, { type: "close-evidence" }, context); assert.ok(r.ok, r.message);
  for (const witnessId of call) { r = m.applyTribunalActionV147(r.tribunal, { type: "call-witness", witnessId }, context); assert.ok(r.ok, r.message); }
  r = m.applyTribunalActionV147(r.tribunal, { type: "close-witnesses" }, context); assert.ok(r.ok, r.message);
  return m.applyTribunalActionV147(r.tribunal, { type: "hear-verdict" }, context);
}

test("V147 the eight canon infractions carry the bible's gravity", async () => {
  const m = await bundle;
  assert.equal(m.INFRACTIONS_V147.length, 8);
  const g = Object.fromEntries(m.INFRACTIONS_V147.map(d => [d.id, d.gravity]));
  assert.equal(g["kill-pregnant-or-child"], "exile");
  assert.equal(g["kill-yautja-outside-duel"], "exile");
  assert.equal(g["forbidden-hybrid-or-tech"], "exile");
  assert.equal(g["unblooded-hunts-humans"], "judgment");
  assert.equal(g["leave-tech-or-fallen"], "blame");
  assert.equal(m.INFRACTIONS_V147.find(d => d.id === "leave-tech-or-fallen").repeatGravity, "judgment");
});

test("V147 an infraction needs real witnesses or traces; the judge depends on the jurisdiction", async () => {
  const m = await bundle;
  assert.equal(m.recordInfractionV147(null, { kind: "steal-merit-or-trophy", jurisdiction: "internal", witnesses: [], traces: [], recordedAt: NOW }), null);
  assert.equal(m.recordInfractionV147(null, { kind: "honor-low", jurisdiction: "internal", witnesses, traces: traces(), recordedAt: NOW }), null);
  const { tribunal, infractionId } = record(m, null, "steal-merit-or-trophy", [], "inter-clan");
  const r = m.applyTribunalActionV147(tribunal, { type: "open-trial", infractionId }, ctx());
  assert.equal(r.tribunal.trial.judge, "adjudicator");
  const internal = record(m, null, "steal-merit-or-trophy");
  assert.equal(m.applyTribunalActionV147(internal.tribunal, { type: "open-trial", infractionId: internal.infractionId }, ctx()).tribunal.trial.judge, "clan-elder");
});

test("V147 trial steps run in order and evidence is limited to the defence file", async () => {
  const m = await bundle;
  const { tribunal, infractionId } = record(m, null, "steal-merit-or-trophy", [constraint]);
  let r = m.applyTribunalActionV147(tribunal, { type: "hear-verdict" }, ctx());
  assert.equal(r.ok, false);
  r = m.applyTribunalActionV147(tribunal, { type: "open-trial", infractionId }, ctx());
  assert.equal(m.applyTribunalActionV147(r.tribunal, { type: "present-evidence", traceId: "trace-c" }, ctx()).ok, false, "accusation speaks first");
  r = m.applyTribunalActionV147(r.tribunal, { type: "hear-accusation" }, ctx());
  assert.equal(m.applyTribunalActionV147(r.tribunal, { type: "present-evidence", traceId: "mask-1" }, ctx()).ok, false, "accusation's piece");
  assert.equal(m.applyTribunalActionV147(r.tribunal, { type: "call-witness", witnessId: "yena" }, ctx()).ok, false, "witnesses come after evidence");
  r = m.applyTribunalActionV147(r.tribunal, { type: "close-evidence" }, ctx());
  assert.equal(m.applyTribunalActionV147(r.tribunal, { type: "call-witness", witnessId: "accuser" }, ctx()).ok, false, "accuser is not a defence witness");
});

test("V147 blame costs 100 honour and nothing else; repeated abandonment becomes a judgment", async () => {
  const m = await bundle;
  let { tribunal, infractionId } = record(m, null, "leave-tech-or-fallen");
  let v = playTrial(m, tribunal, infractionId);
  assert.equal(v.verdict.outcome, "blame");
  assert.equal(v.honor, 2900);
  assert.equal(v.tribunal.freeze, null);
  ({ tribunal, infractionId } = record(m, v.tribunal, "leave-tech-or-fallen"));
  v = playTrial(m, tribunal, infractionId, {}, ctx({ honor: v.honor }));
  assert.equal(v.verdict.baseGravity, "judgment");
  assert.equal(v.verdict.outcome, "judgment");
});

test("V147 judgment: 500 to 1500 honour, rank frozen until reparation, acquired rank kept", async () => {
  const m = await bundle;
  const { tribunal, infractionId } = record(m, null, "kill-defenseless-or-unworthy");
  const v = playTrial(m, tribunal, infractionId);
  assert.equal(v.verdict.outcome, "judgment");
  assert.ok(v.verdict.honorLost >= 500 && v.verdict.honorLost <= 1500);
  assert.equal(v.honor, 3000 - v.verdict.honorLost);
  assert.deepEqual(v.tribunal.freeze, { verdictId: v.verdict.id, rankId: "elder" });
  assert.equal(m.effectiveRankV147("elite", v.tribunal), "elder", "rank acquired stays");
  assert.equal(m.rankTrialsBlockedV147(v.tribunal), true);
  // Reparation needs a hunt completed after the verdict.
  assert.equal(m.applyTribunalActionV147(v.tribunal, { type: "complete-reparation" }, ctx({ missionsCompleted: 4 })).ok, false);
  const done = m.applyTribunalActionV147(v.tribunal, { type: "complete-reparation" }, ctx({ missionsCompleted: 5 }));
  assert.equal(done.ok, true);
  assert.equal(done.tribunal.freeze, null);
  assert.equal(m.rankTrialsBlockedV147(done.tribunal), false);
  assert.equal(m.effectiveRankV147("blooded", done.tribunal), "elder", "floor survives the freeze");
});

test("V147 a well-conducted trial lowers the penalty one notch; contrary proof acquits", async () => {
  const m = await bundle;
  let { tribunal, infractionId } = record(m, null, "kill-yautja-outside-duel", [constraint, contrary]);
  const only = playTrial(m, tribunal, infractionId, { present: ["trace-c"] });
  assert.equal(only.verdict.outcome, "exile", "constraint alone is not enough");
  const well = playTrial(m, tribunal, infractionId, { present: ["trace-c"], call: ["yena"] });
  assert.equal(well.verdict.outcome, "judgment");
  assert.equal(well.verdict.reduced, true);
  const freed = playTrial(m, tribunal, infractionId, { present: ["trophy-c"] });
  assert.equal(freed.verdict.outcome, "acquitted");
  assert.equal(freed.honor, 3000);
  ({ tribunal, infractionId } = record(m, null, "leave-tech-or-fallen", [constraint]));
  assert.equal(playTrial(m, tribunal, infractionId, { present: ["trace-c"], call: ["yena"] }).verdict.outcome, "blame", "blame is the floor");
});

test("V147 exile: honour of the current rank, Bad Blood, no city or clan ship, one second chance", async () => {
  const m = await bundle;
  let { tribunal, infractionId } = record(m, null, "kill-pregnant-or-child");
  const v = playTrial(m, tribunal, infractionId);
  assert.equal(v.verdict.outcome, "exile");
  assert.equal(v.honor, 1800);
  assert.equal(v.declaration, "bad-blood");
  assert.deepEqual(m.tribunalAccessV147(v.tribunal), { city: false, clanShip: false });
  let r = m.applyTribunalActionV147(v.tribunal, { type: "complete-reparation" }, ctx({ missionsCompleted: 9 }));
  assert.equal(r.ok, false, "no trial before surrender");
  r = m.applyTribunalActionV147(v.tribunal, { type: "surrender" }, ctx({ honor: 1800, declaration: "bad-blood" }));
  assert.equal(r.ok, true);
  r = m.applyTribunalActionV147(r.tribunal, { type: "complete-reparation" }, ctx({ honor: 1800, declaration: "bad-blood", missionsCompleted: 5 }));
  assert.equal(r.ok, true);
  assert.equal(r.declaration, "recognized");
  assert.equal(r.tribunal.secondChanceUsed, true);
  assert.deepEqual(m.tribunalAccessV147(r.tribunal), { city: true, clanShip: true });
  // A second fault makes the exile definitive.
  ({ tribunal, infractionId } = record(m, r.tribunal, "steal-merit-or-trophy"));
  const second = playTrial(m, tribunal, infractionId, {}, ctx({ honor: 1800 }));
  assert.equal(second.verdict.outcome, "exile");
  assert.equal(second.verdict.definitive, true);
  assert.equal(m.applyTribunalActionV147(second.tribunal, { type: "surrender" }, ctx()).ok, false);
  assert.equal(m.tribunalStatusV147(second.tribunal).definitiveExile, true);
});

test("V147 save: field only when present, rank frozen in the profile, future version refused", async () => {
  const m = await bundle;
  const base = m.defaultSave();
  const fresh = m.normalizeSave(base);
  assert.equal("tribunalV147" in fresh, false);
  const save = m.normalizeSave({ ...base, profile: { ...base.profile, honor: 3000 }, statistics: { ...base.statistics, missionsCompleted: 2 } });
  assert.equal(save.profile.rankId, "elder");
  const rec = m.recordInfractionOnSaveV147(save, { kind: "kill-defenseless-or-unworthy", jurisdiction: "internal", witnesses, traces: traces(), recordedAt: NOW });
  let current = m.normalizeSave({ ...save, tribunalV147: rec.tribunalV147 });
  for (const action of [{ type: "open-trial", infractionId: rec.infractionId }, { type: "hear-accusation" }, { type: "close-evidence" }, { type: "close-witnesses" }, { type: "hear-verdict" }]) {
    const { update, result } = m.applyTribunalActionToSaveV147(current, action, NOW);
    assert.ok(result.ok, result.message);
    current = m.normalizeSave({ ...current, ...update });
  }
  assert.ok(current.profile.honor < 3000 && current.profile.honor >= 1500);
  assert.equal(current.profile.rankId, "elder");
  // Gaining honour while frozen does not change the rank; losing it does not drop it.
  assert.equal(m.normalizeSave({ ...current, profile: { ...current.profile, honor: 0 } }).profile.rankId, "elder");
  const round = m.parseSaveImport(JSON.stringify(current));
  assert.equal(round.failure, null);
  assert.deepEqual(round.save.tribunalV147, current.tribunalV147);
  const future = m.parseSaveImport(JSON.stringify({ ...current, tribunalV147: { ...current.tribunalV147, version: 2 } }));
  assert.equal(future.failure, "future-version");
});

test("V147 normalisation drops inconsistent records instead of inventing state", async () => {
  const m = await bundle;
  assert.equal(m.normalizeHonorTribunalV147({ version: 9 }), null);
  const t = m.normalizeHonorTribunalV147({ version: 1, infractions: [], verdicts: [{ id: "ver-1", infractionId: "nope" }],
    freeze: { verdictId: "ver-1", rankId: "elder" }, exile: { verdictId: "ver-1" }, reparation: { verdictId: "ver-1", kind: "imposed", missionsCompletedAtSentence: 0 } });
  assert.equal(t.verdicts.length, 0);
  assert.equal(t.freeze, null);
  assert.equal(t.exile, null);
  assert.equal(t.reparation, null);
});

test("V147 the tribunal is wired into the justice screen and the exile closes the city", () => {
  const client = read("app/game/GameClient.tsx");
  assert.match(client, /HonorTribunalPanelV147/);
  assert.match(client, /tribunalAccessV147/);
  const panel = read("app/game/HonorTribunalPanelV147.tsx");
  for (const step of ["hear-accusation", "present-evidence", "call-witness", "hear-verdict", "complete-reparation", "surrender"])
    assert.ok(panel.includes(step), step);
});

test("V147 a judgment during an exile keeps the exile's freeze and imposed trial", async () => {
  const m = await bundle;
  let { tribunal, infractionId } = record(m, null, "kill-pregnant-or-child");
  const exile = playTrial(m, tribunal, infractionId);
  let r = m.applyTribunalActionV147(exile.tribunal, { type: "surrender" }, ctx({ honor: 1800, declaration: "bad-blood" }));
  ({ tribunal, infractionId } = record(m, r.tribunal, "steal-merit-or-trophy"));
  const v = playTrial(m, tribunal, infractionId, {}, ctx({ honor: 1800, declaration: "bad-blood" }));
  assert.equal(v.verdict.outcome, "judgment");
  assert.equal(v.honor, 1800 - v.verdict.honorLost);
  assert.equal(v.tribunal.freeze.verdictId, exile.verdict.id);
  assert.equal(v.tribunal.reparation.kind, "imposed");
  assert.equal(v.tribunal.exile.surrendered, true);
  assert.deepEqual(m.normalizeHonorTribunalV147(JSON.parse(JSON.stringify(v.tribunal))), v.tribunal);
});

test("V147 import refuses an unreadable tribunal record instead of clearing it", async () => {
  const m = await bundle;
  const base = m.normalizeSave(m.defaultSave());
  assert.equal(m.parseSaveImport(JSON.stringify({ ...base, tribunalV147: { version: 0 } })).failure, "invalid-save");
  assert.equal(m.parseSaveImport(JSON.stringify({ ...base, tribunalV147: "x" })).failure, "invalid-save");
  assert.equal(m.parseSaveImport(JSON.stringify({ ...base, tribunalV147: null })).failure, null);
});

test("V147 stays separate from the C-37 trophy hearing", async () => {
  const m = await bundle;
  const source = read("app/game/systems/honorTribunalV147.ts");
  assert.doesNotMatch(source, /from\s+["'][^"']*clanShipTrophy/);
  for (const file of ["app/game/systems/clanShipTrophyHearing.ts", "app/game/systems/clanShipTrophyCase.ts", "app/game/systems/clanShipIncidents.ts"])
    assert.doesNotMatch(read(file), /honorTribunalV147|tribunalV147/, file);
  // A tribunal update never carries or alters the hearing ledger.
  const base = m.normalizeSave(m.defaultSave());
  const rec = m.recordInfractionOnSaveV147(base, { kind: "leave-tech-or-fallen", jurisdiction: "internal", witnesses, traces: traces(), recordedAt: NOW });
  const { update } = m.applyTribunalActionToSaveV147({ ...base, tribunalV147: rec.tribunalV147 }, { type: "open-trial", infractionId: rec.infractionId }, NOW);
  assert.deepEqual(Object.keys(update).sort(), ["justice", "profile", "tribunalV147"]);
});
