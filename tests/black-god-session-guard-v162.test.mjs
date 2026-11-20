import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const start = source.indexOf("  const sacrificeBlackGodSession = useCallback");
const end = source.indexOf("\n\n", start);
assert.ok(start >= 0 && end > start, "the GameClient sacrifice callback must be exercised");
const { outputText } = ts.transpileModule(source.slice(start, end), {});
const ownerCreatedAt = "2026-11-20T12:00:00.000Z";

function mountSacrifice(overrides = {}, sidecar = { save: null, failure: null }) {
  const calls = { reads: 0, reductions: 0, writes: 0 };
  const state = { sacrificed: true };
  const scope = {
    useCallback: action => action,
    saveRef: { current: { createdAt: ownerCreatedAt } },
    sessionAliveRef: { current: true },
    entry: { ownerCreatedAt },
    screen: "mausoleum",
    settingsOpen: false,
    campaignOperationRef: { current: false },
    archiveTransferBusy: false,
    archiveRecoveryIssue: null,
    activeHuntSessionRef: { current: null },
    resumableHunt: null,
    pendingHuntResult: null,
    pendingTerminalRunRef: { current: null },
    loadActiveHuntSave: () => { calls.reads++; return sidecar; },
    sacrificeBlackGodV162: () => {
      calls.reductions++;
      return { ok: true, state, message: "Sacrifice confirmé." };
    },
    persistSocialProgress: update => { assert.deepEqual(update, { blackGodV162: state }); calls.writes++; return true; },
    ...overrides,
  };
  const sacrifice = new Function(...Object.keys(scope), outputText + "\nreturn sacrificeBlackGodSession;")(...Object.values(scope));
  return { calls, sacrifice };
}

test("Black God leaves the campaign unchanged while travel, a hunt, or its result is outstanding", () => {
  for (const overrides of [
    { sessionAliveRef: { current: false } },
    { screen: "deck" },
    { settingsOpen: true },
    { campaignOperationRef: { current: true } },
    { archiveTransferBusy: true },
    { archiveRecoveryIssue: "archive à vérifier" },
    { activeHuntSessionRef: { current: { runId: "active" } } },
    { resumableHunt: { runId: "suspended" } },
    { saveRef: { current: { createdAt: ownerCreatedAt, planetArrival: {} } } },
    { saveRef: { current: { createdAt: ownerCreatedAt, planetArrivalRun: {} } } },
    { pendingHuntResult: {} },
    { pendingTerminalRunRef: { current: "pending" } },
  ]) {
    const { calls, sacrifice } = mountSacrifice(overrides);
    assert.equal(sacrifice({}).ok, false, Object.keys(overrides).join(", "));
    assert.deepEqual(calls, { reads: 0, reductions: 0, writes: 0 });
  }
});

test("Black God verifies a fresh sidecar read before attempting a durable sacrifice", () => {
  for (const sidecar of [
    { save: null, failure: "read-failed" },
    { save: { ownerSaveCreatedAt: ownerCreatedAt }, failure: null },
  ]) {
    const { calls, sacrifice } = mountSacrifice({}, sidecar);
    assert.equal(sacrifice({}).ok, false);
    assert.deepEqual(calls, { reads: 1, reductions: 0, writes: 0 });
  }

  const { calls, sacrifice } = mountSacrifice();
  assert.deepEqual(sacrifice({}), { ok: true, message: "Sacrifice confirmé." });
  assert.deepEqual(calls, { reads: 1, reductions: 1, writes: 1 });

  const otherCampaign = mountSacrifice({}, { save: { ownerSaveCreatedAt: "ancienne partie" }, failure: null });
  assert.equal(otherCampaign.sacrifice({}).ok, true);
  assert.equal(otherCampaign.calls.writes, 1);
});

test("a closed Black God chronicle refuses mission start and recovery", () => {
  assert.match(source, /const launchMission = useCallback\(\(\) => \{\s*if \(blackGodStatusV162\(saveRef.current\) === "sacrificed"\) return;/);
  assert.match(source, /const resumeActiveHunt = useCallback\(\(\) => \{\s*if \(!sessionAliveRef.current \|\| blackGodStatusV162\(saveRef.current\) === "sacrificed"\) return;/);
  assert.match(source, /const mountArrivalHunt = useCallback\([\s\S]*?\{\s*if \(blackGodStatusV162\(saveRef.current\) === "sacrificed"\) return false;/);
  assert.match(source, /if \(blackGodStatusV162\(save\) === "sacrificed"\) return \(/);
});
