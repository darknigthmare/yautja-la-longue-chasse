import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: `
export * from "./app/game/systems/nurseryPrologue";
export * from "./app/game/systems/nurseryContinuityV72";
export * from "./app/game/systems/nurseryCampaign";
export * from "./app/game/save";
export * from "./app/game/nurseryRendering";
export * from "./app/game/nurseryArtManifest";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const env = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
function play(narrative = true) {
  let state = p.createNurseryPrologue({ readyMode: "press" });
  if (narrative) state = p.enableNurseryContinuityV72(state);
  const pages = [], snapshots = [], receipts = [];
  for (let tick = 0; tick < 7000 && state.phase !== "complete"; tick++) {
    const card = p.nurseryStoryCardV72(state); if (card && !pages.includes(card.id)) pages.push(card.id);
    const distance = Math.abs(state.player.x - state.rival.x);
    const actions = !state.inputArmed ? {} : card || state.phase === "prompt" ? { confirm: tick % 32 === 0 } :
      state.phase === "ready" ? { ready: tick % 32 === 0 } : state.phase === "duel" ?
        { move: distance > 44 ? state.rival.x > state.player.x ? 1 : -1 : 0, light: tick % 30 === 0 } : {};
    const step = p.stepNurseryPrologue(state, actions, env); state = step.state;
    if (step.events.some(e => e.type === "phase" || e.type === "story")) snapshots.push(structuredClone(state));
    if (step.completion) receipts.push(step.completion);
    assert(p.normalizeNurseryCheckpoint(state), `Every actual intermediate checkpoint must normalize (${state.phase}).`);
  }
  assert.equal(state.phase, "complete"); return { state, pages, snapshots, receipts };
}
const ending = play();

test("fresh narrative requires the five establishing pages, real duel, debrief, walkout, ellipse and clan reception", () => {
  assert.deepEqual(ending.pages, ["born-in-clan", "nursery-place", "mentor-briefing", "rival-oath", "duel-consent", "master-stop", "rival-recovery", "training-ellipse", "city-journey", "arrival-terminal", "clan-code", "clan-mentor", "city-exit"]);
  assert.deepEqual([...new Set(ending.snapshots.map(s => s.phase))], ["prompt", "arrival", "ready", "duel", "ko", "village-reveal", "moon-title", "debrief", "walkout", "journey", "reception", "clan-entry", "clan-departure", "complete"]);
  assert.equal(ending.receipts.length, 1); assert.equal(ending.state.winner, "player");
  assert.equal(ending.snapshots.filter(s => s.phase === "complete").length, 1);
});
test("skipping optional context stops at explicit consent and cannot fabricate victory or completion", () => {
  let state = p.enableNurseryContinuityV72(p.createNurseryPrologue());
  state = p.stepNurseryPrologue(state, {}, env).state;
  const skipped = p.skipNurseryContextV72(state);
  assert.equal(skipped.phase, "prompt"); assert.equal(skipped.continuityV72.introPage, 4);
  assert.equal(p.nurseryStoryCardV72(skipped).id, "duel-consent"); assert.equal(skipped.winner, null);
  assert.equal(state.continuityV72.introPage, 0, "A prior confirmed snapshot is never mutated.");
  let held = skipped;
  for (let i = 0; i < 1000; i++) held = p.stepNurseryPrologue(held, { confirm: true }, env).state;
  assert.equal(held.phase, "prompt", "Held input does not consent until fully released.");
});
test("dialogue pages wait for explicit acknowledgement; paused, hidden and missing-art clocks do not advance", () => {
  const state = ending.snapshots.find(s => s.phase === "debrief");
  for (const blocked of [{ paused: true }, { pageVisible: false }, { assetsReady: false }]) {
    const step = p.stepNurseryPrologue(state, { confirm: true, light: true }, { ...env, ...blocked });
    assert.equal(step.state.tick, state.tick); assert.deepEqual(step.state.continuityV72, state.continuityV72); assert.equal(step.completion, null);
  }
  let waiting = state; for (let i = 0; i < 900; i++) waiting = p.stepNurseryPrologue(waiting, {}, env).state;
  assert.equal(waiting.phase, "debrief"); assert.equal(waiting.continuityV72.debriefPage, 0);
  assert.equal(waiting.rival.composure, 0); assert.equal(waiting.winner, "player");
});
test("legacy duel and won checkpoints receive a frozen recap without replaying combat or erasing native victory", () => {
  const legacy = play(false);
  for (const source of legacy.snapshots.filter(s => ["duel", "village-reveal", "moon-title"].includes(s.phase))) {
    const state = p.enableNurseryContinuityV72(p.normalizeNurseryCheckpoint(source));
    assert.equal(p.nurseryStoryCardV72(state).id, "legacy-resume-recap");
    let waiting = state; for (let i = 0; i < 300; i++) waiting = p.stepNurseryPrologue(waiting, {}, env).state;
    assert.equal(waiting.tick, source.tick); assert.equal(waiting.phaseTick, source.phaseTick);
    assert.deepEqual(waiting.player, source.player); assert.deepEqual(waiting.rival, source.rival);
    assert.equal(waiting.winner, source.winner); assert(p.normalizeNurseryCheckpoint(waiting));
    const continued = p.stepNurseryPrologue(waiting, { confirm: true }, env);
    assert.equal(continued.state.continuityV72.recap, false); assert.equal(continued.state.tick, source.tick); assert.equal(continued.completion, null);
  }
});
test("future or impossible narrative cursors remain protected instead of normalizing into a win", () => {
  const reception = ending.snapshots.find(s => s.phase === "reception");
  for (const mutation of [s => { s.continuityV72.version = 2; }, s => { delete s.continuityV72; }, s => { s.continuityV72.introPage = 1; }, s => { s.continuityV72.debriefPage = 0; }, s => { s.continuityV72.journeyPage = 9; }]) {
    const raw = structuredClone(reception); mutation(raw); assert.equal(p.normalizeNurseryCheckpoint(raw), null);
  }
  assert.equal(p.enableNurseryContinuityV72(play(false).state).continuityV72, undefined, "Completed legacy campaigns do not replay youth.");
});
test("final clan acknowledgement waits for next-chapter readiness and emits no earlier completion receipt", () => {
  let state = p.normalizeNurseryCheckpoint(ending.snapshots.find(s => s.phase === "reception" && s.continuityV72.receptionPage === 3));
  for (let i = 0; i < 120; i++) {
    const step = p.stepNurseryPrologue(state, { confirm: i % 32 === 0 }, { ...env, nextChapterReady: false });
    state = step.state; assert.equal(step.completion, null);
  }
  assert.equal(state.phase, "reception");
  assert(ending.snapshots.filter(s => s.phase !== "complete").every(s => !p.withNurseryCompletion({ ...p.defaultSave("2026-10-02T00:00:00.000Z"), prologue: p.createNurseryCampaign() }, ending.receipts[0], s)));
});
test("arrival uses the persisted hunter name and the adolescent stage, while the child-only nursery remains native Youngling", () => {
  const reception = ending.snapshots.find(s => s.phase === "reception");
  assert.match(p.nurseryStoryCardV72(reception, "Ka’Test").button, /Ka’Test/);
  assert.match(p.nurseryStoryCardV72(reception, "   ").button, /Jeune du clan/);
  assert.equal(p.getNurseryPresentation(reception).camera.shot, "clan-corridor");
  const audience = ending.snapshots.find(s => s.phase === "reception" && s.continuityV72.receptionPage === 1);
  assert.equal(p.getNurseryPresentation(audience).camera.shot, "clan-hall");
  assert.equal(p.getNurseryPresentation(ending.snapshots.find(s => s.phase === "ready")).actors[0].actorKind, "youngling");
});
test("announcing a name cannot skip the real corridor walk; leaving the hall cannot complete before its own active movement finishes", () => {
  for (const [phase, required] of [["clan-entry", p.NURSERY_CONTINUITY_V72.clanEntryTicks], ["clan-departure", p.NURSERY_CONTINUITY_V72.clanDepartureTicks]]) {
    const state = ending.snapshots.find(s => s.phase === phase);
    assert(state); let waiting = state;
    for (let i = 0; i < required - 1; i++) {
      const step = p.stepNurseryPrologue(waiting, { confirm: true, light: true, move: 1 }, env); waiting = step.state;
      assert.equal(step.completion, null); assert.equal(waiting.phase, phase);
    }
    const frozen = p.stepNurseryPrologue(waiting, {}, { ...env, paused: true });
    assert.equal(frozen.state.phaseTick, waiting.phaseTick); assert.equal(frozen.completion, null);
    const next = p.stepNurseryPrologue(waiting, {}, env);
    assert.equal(next.state.phase, phase === "clan-entry" ? "reception" : "complete");
  }
});
test("real ending remains save-parser compatible, with only nursery recognition and no gear, honor or adult mission rewards", () => {
  const initial = { ...p.defaultSave("2026-10-02T00:00:00.000Z"), prologue: p.createNurseryCampaign() };
  const before = ending.snapshots.find(s => s.phase === "reception");
  const checkpointed = p.withNurseryCheckpoint(initial, before); assert(checkpointed);
  const complete = p.withNurseryCompletion(checkpointed, ending.receipts[0], ending.state, "2026-10-02T00:10:00.000Z"); assert(complete);
  assert(p.parseSaveImport(JSON.stringify(complete)).save);
  assert.deepEqual(complete.inventory, initial.inventory); assert.deepEqual(complete.statistics, initial.statistics);
  assert.equal(complete.profile.honor, initial.profile.honor); assert.equal(complete.prologue.status, "completed");
  assert.deepEqual(complete.prologue.chronicle.rites.map(r => r.id), ["nursery-recognition"]);
});
test("new road is a real preserved native PNG; walkout draws distinct youngling walking cells on its measured support plane", () => {
  const bytes = fs.readFileSync("public/game/prologue/v72/nursery-exit.png");
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), "93505a26dd343b3b6cef3f049bf576ca45c0003e5923c5191c13b2fbb4be5c42");
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  const manifest = structuredClone(p.NURSERY_ART_MANIFEST), images = new Map(p.nurseryArtSources(manifest).map(src => [src, { src, width: 1672, height: 941 }]));
  const bank = { manifest, images, continuitySceneV72: { src: p.NURSERY_CONTINUITY_V72.roadSrc, width: 1672, height: 941 } };
  const draws = [], shadows = [];
  const ctx = { save() {}, restore() {}, clearRect() {}, fillRect() {}, drawImage(...args) { draws.push(args); }, beginPath() {}, ellipse(...args) { shadows.push(args); }, fill() {} };
  const state = ending.snapshots.find(s => s.phase === "walkout");
  p.drawNurseryScene(ctx, p.getNurseryPresentation({ ...state, phaseTick: 20 }), bank, false);
  const a = draws.splice(0); p.drawNurseryScene(ctx, p.getNurseryPresentation({ ...state, phaseTick: 37 }), bank, false);
  assert.equal(a.length, 3); assert.equal(a[0][0], bank.continuitySceneV72);
  assert(a[1][0].src.includes("youngling-player-right")); assert(a[2][0].src.includes("youngling-rival-right"));
  assert.notDeepEqual(a[1].slice(1, 5), draws[1].slice(1, 5), "The actual two-drawing walk loop changes its native source cell.");
  assert(draws[1][5] > a[1][5], "The native character advances across the physically continuous path.");
  assert(shadows.every(s => Math.abs(s[1] - 540 * .692) < 1.2), "Both contact shadows remain on the authored road surface (contact-shadow softness is +.6/+1px).");
  draws.length = 0; p.drawNurseryScene(ctx, p.getNurseryPresentation({ ...state, phaseTick: 20 }), bank, true); const reduced = structuredClone(draws.map(d => d.slice(1)));
  draws.length = 0; p.drawNurseryScene(ctx, p.getNurseryPresentation({ ...state, phaseTick: 250 }), bank, true);
  assert.deepEqual(draws.map(d => d.slice(1)), reduced, "Reduced motion freezes walk pose and traversal composition.");
});
