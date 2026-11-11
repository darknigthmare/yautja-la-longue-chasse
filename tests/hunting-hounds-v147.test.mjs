import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

const entry = `
export * from "./app/game/systems/huntingHoundsV147.ts";
export { normalizeSave, applyMissionResult, defaultSave, parseSaveImport } from "./app/game/save.ts";
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

test("V147 field orders: refusals, recall, track marks the freshest trail, drive pushes, attack bites", async () => {
  const m = await bundle;
  const hound = recruited(m).hounds[0];
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
  let r = run(field, 40);
  assert.deepEqual(r.events.filter(e => e.type === "marked").map(e => e.preyId), ["fresh"]);
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
