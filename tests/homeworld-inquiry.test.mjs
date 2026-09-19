import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createInquiryFixture } from "./fixtures/homeworld-inquiry.mjs";

const compile = async file => {
  const bundle = await build({ entryPoints: [file], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
};
const world = await compile("app/game/systems/homeworld.ts");
const saves = await compile("app/game/save.ts");
const context = { rankId: "elder", ownedTrophyCount: 500 };
const act = (progress, action) => world.applyHomeworldAction(progress, { type: "counter-inquiry", action }, context);
const choices = branch => [
  { kind: "convoy", argument: "real-trail" }, { kind: "archives", argument: "diversion" },
  { kind: "approach", value: branch },
  { kind: "followup", source: branch === "protect-source" ? "undercity-witness" : "dock-officer" }, { kind: "audience" },
];
const withoutInquiry = value => { const copy = structuredClone(value); delete copy.inquiry; return copy; };

test("only both validated expedition reports and the first audience unlock the inquiry, regardless of rank", () => {
  for (const missing of ["ash-marches", "glass-desert", "audience"]) {
    const progress = createInquiryFixture(world);
    if (missing === "audience") progress.audienceOutcome = null;
    else progress.expeditions[missing] = null;
    const normalized = world.normalizeHomeworldProgress(progress), before = structuredClone(progress);
    assert.equal(world.homeworldInquiryJournal(normalized).step, "locked");
    const result = act(progress, choices("protect-source")[0]);
    assert.equal(result.ok, false); assert.equal(result.changed, false); assert.deepEqual(progress, before);
  }
  assert.equal(world.homeworldInquiryJournal(createInquiryFixture(world)).step, "convoy");
});

test("legacy migration adds an empty inquiry while retaining reports, decisions, relations and identity", () => {
  const legacy = withoutInquiry(createInquiryFixture(world, { beacon: "preserve", witness: "restitution" }));
  const copy = structuredClone(legacy), normalized = world.normalizeHomeworldProgress(legacy);
  assert.deepEqual(withoutInquiry(normalized), legacy); assert.deepEqual(legacy, copy);
  assert.equal(world.homeworldInquiryJournal(normalized).completed, 0);
  assert.deepEqual(normalized.inquiry, world.defaultHomeworldProgress().inquiry);
  assert.equal(act(legacy, choices("protect-source")[0]).changed, true, "an ordinary legacy save may start the new arc");
});

test("future, malformed and contradictory inquiry imports cannot become a mutation write base", () => {
  const empty = world.defaultHomeworldProgress().inquiry;
  for (const inquiry of [null, [], { ...empty, version: 2 }, { ...empty, convoyReviewed: "yes" },
    { ...empty, audienceFiled: true }, { ...empty, archiveReviewed: true },
    { ...empty, approach: "invented" }, { ...empty, followupVerified: true }]) {
    const progress = { ...createInquiryFixture(world), inquiry }, source = structuredClone(progress);
    const result = act(progress, choices("protect-source")[0]);
    assert.equal(result.ok, false); assert.equal(result.changed, false); assert.deepEqual(progress, source);
    const clean = world.normalizeHomeworldProgress(progress);
    assert.equal(clean.inquiry.audienceFiled, false); assert.equal(clean.inquiry.followupVerified, false);
    assert.deepEqual(withoutInquiry(clean), withoutInquiry(source), "other campaign facts survive sanitization");
  }
  const future = { ...createInquiryFixture(world), version: 2 };
  assert.equal(act(future, choices("protect-source")[0]).changed, false);
});

test("wrong deductions and premature steps provide feedback without writing progress", () => {
  const start = createInquiryFixture(world), before = structuredClone(start);
  for (const action of [null, [], { kind: "convoy", argument: "named-culprit" }, { kind: "archives", argument: "diversion" },
    { kind: "approach", value: "trace-chain" }, { kind: "followup", source: "dock-officer" }, { kind: "audience" }]) {
    const result = act(start, action); assert.equal(result.ok, false); assert.equal(result.changed, false);
  }
  assert.deepEqual(start, before);
  const next = act(start, choices("trace-chain")[0]).progress;
  const error = act(next, { kind: "archives", argument: "ordinary-hunt" });
  assert.equal(error.changed, false); assert.match(error.message, /ne décrivent pas/);
});

for (const branch of ["protect-source", "trace-chain"]) test(`authored NPC sequence completes ${branch}, without rewards, identity changes or repeat consequences`, () => {
  let progress = createInquiryFixture(world, { witness: "investigate" });
  const initial = structuredClone(progress), points = [];
  for (const [index, action] of choices(branch).entries()) {
    const journal = world.homeworldInquiryJournal(progress);
    assert.equal(journal.completed, index); assert.equal(journal.total, 5);
    const point = world.HOMEWORLD_POINTS.find(point => point.id === journal.pointId);
    assert.ok(point?.npcId); points.push(point.id);
    assert.ok(world.homeworldInquiryDialogue(progress, point.npcId).options.some(option => JSON.stringify(option.action) === JSON.stringify(action)));
    assert.equal(world.homeworldInquiryDialogue(progress, "market-artisan"), null);
    const result = act(progress, action); assert.equal(result.ok, true); assert.equal(result.changed, true);
    progress = result.progress;
    assert.deepEqual(withoutInquiry(progress), withoutInquiry(initial));
    const repeat = act(progress, action); assert.equal(repeat.ok, true); assert.equal(repeat.changed, false);
    if (action.kind === "approach") {
      assert.equal(act(progress, { kind: "approach", value: branch === "protect-source" ? "trace-chain" : "protect-source" }).ok, false);
      assert.equal(act(progress, { kind: "followup", source: branch === "protect-source" ? "dock-officer" : "undercity-witness" }).ok, false);
    }
  }
  assert.deepEqual(points, ["dock-officer-point", "memory-register-point", "enforcer-point", branch === "protect-source" ? "witness-point" : "dock-officer-point", "audience-point"]);
  assert.equal(world.homeworldInquiryJournal(progress).step, "complete");
  assert.equal(world.homeworldInquiryJournal(progress).completed, 5);
  assert.equal(world.homeworldInquiryDialogue(progress, "hunt-king").options.length, 0);
});

test("complementary testimony keeps the original witness decision and beacon disposition in the narrative", () => {
  for (const witness of ["protect", "restitution", "investigate"]) for (const beacon of ["disable", "preserve"]) {
    let progress = createInquiryFixture(world, { witness, beacon });
    for (const action of choices("protect-source")) progress = act(progress, action).progress;
    const text = world.homeworldInquiryDialogue(progress, "hunt-king").text;
    assert.match(text, witness === "protect" ? /protection du témoin reste/ : witness === "restitution" ? /restitution ordonnée/ : /réserve de jugement/);
    assert.match(text, beacon === "disable" ? /sans prétendre recevoir un signal vivant/ : /conservé le canal/);
    assert.equal(progress.witnessChoice, witness); assert.equal(progress.expeditions["glass-desert"].beaconDisposition, beacon);
  }
});

const source = await readFile(new URL("../app/game/HomeworldHub.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldHub.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, environment) {
  let implementation;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(implementation, `executes live ${name} callback`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}
function liveFixture() {
  const values = new Map(), writes = [], notices = [];
  let reject = false, dialog, focus = 0, cleared = 0;
  const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key),
    setItem(key, value) { if (reject && key === "inquiry") throw new DOMException("QA refusal", "QuotaExceededError"); values.set(key, value); } };
  const base = saves.defaultSave("2026-09-20T12:00:00.000Z"); base.homeworld = createInquiryFixture(world);
  let durable = saves.writeSaveWithStatus(base, storage, "inquiry").save;
  const env = { ...world, progressRef: { current: durable.homeworld }, saveRef: { current: durable }, save: durable,
    suspendedRef: { current: false }, pausedRef: { current: false }, actorRef: { current: world.createHomeworldActor() }, dialogStateRef: { current: null },
    clearInputs() { cleared++; }, setAnnouncement() {}, onNotify(message) { notices.push(message); },
    setDialog(update) { dialog = update(dialog); }, dialogRef: { current: { focus() { focus++; } } }, requestAnimationFrame(fn) { fn(); return 1; },
    onProgress(progress) {
      const result = saves.writeSaveWithStatus({ ...durable, homeworld: progress }, storage, "inquiry");
      writes.push(result.persisted);
      if (result.persisted) { durable = result.save; env.saveRef.current = durable; env.save = durable; }
      return result.persisted;
    },
  };
  env.persistAction = callback("persistAction", env); env.submitInquiry = callback("submitInquiry", env);
  const select = pointId => {
    const point = world.HOMEWORLD_POINTS.find(point => point.id === pointId);
    // Unit-test actor fixture only; the browser recipe physically walks the route.
    env.actorRef.current = { ...env.actorRef.current, x: point.x, y: point.y + 45 };
    assert.equal(world.nearestHomeworldPoint(env.actorRef.current)?.id, pointId);
    env.dialogStateRef.current = dialog = { point };
  };
  select("dock-officer-point");
  return { env, storage, writes, notices, select, setRejected: value => { reject = value; },
    get durable() { return durable; }, get focus() { return focus; }, get cleared() { return cleared; }, get dialog() { return dialog; } };
}

test("live UI callback refuses without advancing, retries once after recovery and persists all five steps through reload", () => {
  const f = liveFixture(), initial = structuredClone(f.durable), serialized = f.storage.getItem("inquiry");
  f.setRejected(true); f.env.submitInquiry(choices("protect-source")[0]);
  assert.deepEqual(f.writes, [false]); assert.equal(f.storage.getItem("inquiry"), serialized);
  assert.deepEqual(f.env.progressRef.current, initial.homeworld);
  assert.match(f.dialog.message, /Sauvegarde impossible/); assert.equal(f.focus, 1);
  f.setRejected(false);
  for (const action of choices("protect-source")) {
    f.select(world.homeworldInquiryJournal(f.env.progressRef.current).pointId);
    f.env.submitInquiry(action);
  }
  assert.deepEqual(f.writes, [false, true, true, true, true, true]);
  assert.equal(f.env.progressRef.current.inquiry.audienceFiled, true);
  const loaded = saves.loadSave(f.storage, "inquiry");
  assert.deepEqual(loaded.homeworld, f.env.progressRef.current);
  for (const key of ["createdAt", "profile", "inventory", "trophies", "justice", "missionProgress"]) assert.deepEqual(loaded[key], initial[key]);
  assert.deepEqual(withoutInquiry(loaded.homeworld), withoutInquiry(initial.homeworld));
  f.env.submitInquiry({ kind: "audience" }); assert.equal(f.writes.length, 6, "removed completion option cannot be replayed");
  assert.equal(f.cleared, 6); assert.equal(f.focus, 6);
});

test("live submit cannot advance from another NPC, remote position, suspended city, owner replacement or forged option", () => {
  const action = choices("trace-chain")[0];
  const wrongNpc = liveFixture(); wrongNpc.select("enforcer-point"); wrongNpc.env.submitInquiry(action); assert.equal(wrongNpc.writes.length, 0);
  const remote = liveFixture(); remote.env.actorRef.current.x += 1000; remote.env.submitInquiry(action); assert.equal(remote.writes.length, 0);
  const suspended = liveFixture(); suspended.env.suspendedRef.current = true; suspended.env.submitInquiry(action); assert.equal(suspended.writes.length, 0);
  const paused = liveFixture(); paused.env.pausedRef.current = true; paused.env.submitInquiry(action); assert.equal(paused.writes.length, 0);
  const replaced = liveFixture(); replaced.env.save = { ...replaced.env.save, createdAt: "another-owner" }; replaced.env.submitInquiry(action); assert.equal(replaced.writes.length, 0);
  const forged = liveFixture(); forged.env.submitInquiry({ kind: "audience" }); assert.equal(forged.writes.length, 0);
  const wrong = liveFixture(); wrong.env.submitInquiry({ kind: "convoy", argument: "named-culprit" });
  assert.equal(wrong.writes.length, 0); assert.match(wrong.dialog.message, /pas l’identité/);
});


test("future Homeworld or inquiry subversions protect original primary and backup bytes through load, autosave and import", () => {
  for (const field of ["homeworld", "inquiry"]) {
    const future = saves.defaultSave("2026-09-20T12:00:00.000Z");
    future.homeworld = createInquiryFixture(world);
    const nested = field === "homeworld" ? future.homeworld : future.homeworld.inquiry;
    nested.version = 2; nested.futureEvidence = { signedRoute: ["retain", "verbatim"], proof: 42 };
    const serialized = JSON.stringify(future), backup = JSON.stringify(saves.defaultSave(future.createdAt));
    const values = new Map([["future-city", serialized], ["future-city.backup", backup]]), writes = [];
    const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key),
      setItem(key, value) { writes.push(key); values.set(key, value); } };
    const before = [...values], loaded = saves.loadSaveWithStatus(storage, "future-city");
    assert.equal(loaded.loaded, false); assert.equal(loaded.failure, "future-version");
    assert.equal(loaded.source, "fresh", "an older backup must not replace a newer primary");
    assert.deepEqual([...values], before, "hydration never writes");
    const attempted = saves.writeSaveWithStatus(loaded.save, storage, "future-city");
    assert.equal(attempted.persisted, false); assert.equal(attempted.failure, "protected-save");
    assert.equal(saves.parseSaveImport(serialized).failure, "future-version");
    assert.equal(saves.importSaveWithStatus(serialized, storage, "future-city").persisted, false);
    assert.equal(saves.writeSaveWithStatus(future, storage, "future-city").persisted, false);
    assert.deepEqual(writes, []); assert.deepEqual([...values], before);
    assert.deepEqual(JSON.parse(values.get("future-city")), future, "unknown future fields remain byte-for-byte in their original slot");
  }
});
