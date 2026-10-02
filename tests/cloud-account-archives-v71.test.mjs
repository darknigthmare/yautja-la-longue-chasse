import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/cloudArchiveV71";
export * from "./app/game/systems/cloudArchiveRestoreV71";
export * from "./app/game/systems/cloudSyncV71";
export * from "./app/game/systems/campaignSlots";
export * from "./app/game/systems/archiveTransferGuard";
export {SAVE_STORAGE_KEY, defaultSave} from "./app/game/save";
export {createPitSave,pitSaveStorageKey} from "./app/game/systems/pitSave";
export {createPitReplayArchive,pitReplayStorageKey} from "./app/game/systems/pitReplayStorage";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const A = "c4fcb61c-644f-448a-8d89-b47bd9d90e9c", B = "0d235e68-f03d-478d-9c25-cf0e1f4bbb04";
const TX = "f5b6377b-81e4-44a0-93b1-8dcb7c0e601f";
const NOW = "2026-10-02T10:00:00.000Z";
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_name, _options, cb) => cb({}) } } });
function store(entries = []) {
  const data = new Map(entries), writes = [];
  return { data, writes, get length() { return data.size; }, key(i) { return [...data.keys()][i] ?? null; },
    getItem(key) { return data.get(key) ?? null; }, setItem(key, raw) { writes.push(["set", key]); data.set(key, raw); }, removeItem(key) { writes.push(["remove", key]); data.delete(key); } };
}
async function fixture(name = "Appareil local") {
  const s = store(); const created = await p.createCampaignSlot(1, name, s); assert.equal(created.ok, true, created.message);
  const started = await p.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: p.loadCampaignSlots(s).slots[0].revision }, s); assert.equal(started.ok, true, started.message);
  const owner = started.save.createdAt;
  s.setItem(p.pitSaveStorageKey(owner), JSON.stringify(p.createPitSave(owner, owner)));
  s.setItem(p.pitReplayStorageKey(owner), JSON.stringify(p.createPitReplayArchive(owner, owner)));
  const result = await p.saveCampaignCheckpoint(1, { kind: "manual", index: 1, expectedRevision: p.loadCampaignSlots(s).slots[0].revision }, s);
  assert.equal(result.ok, true, result.message); s.writes.length = 0; return s;
}
const snap = s => p.captureCloudArchiveV71(s, NOW);
const row = (snapshot, revision = 1, accountId = A) => ({ accountId, revision, snapshot, updatedAt: NOW });
const originals = s => new Map(s.data);
const assertPreserved = (before, s) => { for (const [key, raw] of before) assert.equal(s.getItem(key), raw, key); };
async function digests(local, cloud) { return { localDigest: await p.cloudArchiveDigestV71(local), cloudDigest: cloud ? await p.cloudArchiveDigestV71(cloud.snapshot) : null }; }

test("account snapshot includes all five campaigns, all sixty checkpoints, working progress and owned PIT/replays", async () => {
  const s = await fixture();
  for (let id = 1; id <= 5; id++) {
    if (id > 1) { const created = await p.createCampaignSlot(id, "Chasseur " + id, s); assert.equal(created.ok, true, created.message);
      const activated = await p.activateCampaignCheckpoint(id, "auto-1", { expectedRevision: p.loadCampaignSlots(s).slots[id - 1].revision }, s); assert.equal(activated.ok, true, activated.message); }
    for (const kind of ["manual", "auto"]) for (let index = 1; index <= (kind === "manual" ? 10 : 2); index++) {
      const working = JSON.parse(s.getItem(p.SAVE_STORAGE_KEY)); working.profile.playTimeSeconds += 1; s.setItem(p.SAVE_STORAGE_KEY, JSON.stringify(working));
      const r = await p.saveCampaignCheckpoint(id, { kind, index, expectedRevision: p.loadCampaignSlots(s).slots[id - 1].revision }, s); assert.equal(r.ok, true, r.message);
    }
  }
  s.setItem("supabase.auth.token", "SECRET_AUTH_TOKEN"); s.setItem("some-other-game", "OTHER_GAME");
  const before = originals(s), captured = snap(s);
  assertPreserved(before, s); assert.equal(captured.entries.some(e => /auth|some-other-game/.test(e.key)), false);
  const slots = captured.entries.filter(e => /^yautja-long-hunt\.campaign-slot\.[1-5]$/.test(e.key));
  assert.equal(slots.length, 5); assert.equal(slots.reduce((n, e) => n + JSON.parse(e.raw).checkpoints.length, 0), 60);
  assert(captured.entries.some(e => e.key.startsWith("yautja-long-hunt.the-pit.replay.")));
  assert(captured.entries.some(e => e.key === p.SAVE_STORAGE_KEY));
  assert(p.parseCloudArchiveV71(JSON.stringify(captured)).archive);
  const destination = store([["other-game", "untouched"]]);
  const result = p.applyCloudArchiveRestoreV71(destination, p.prepareCloudArchiveRestoreV71(destination, A, captured), { transactionId: TX, now: 0 });
  assert.equal(result.persisted, true, result.recovery.message);
  for (const { key, raw } of captured.entries) assert.equal(destination.getItem(key), raw, key);
  assert.equal(p.loadCampaignSlots(destination).slots.reduce((n, slot) => n + slot.checkpoints.length, 0), 60);
  assert.equal(destination.getItem("other-game"), "untouched");
});

test("exact bytes survive capture, parse, cloud restore and a local rescue; unrelated app keys are never overwritten", async () => {
  const source = await fixture("Mobile"), target = await fixture("Navigateur"), desired = snap(source), before = originals(target);
  target.setItem("unrelated", "keep");
  const plan = p.prepareCloudArchiveRestoreV71(target, A, desired);
  const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 });
  assert.equal(result.persisted, true, result.recovery.message); assert.equal(result.recovery.status, "committed");
  assert.equal(p.cloudArchiveIdentityV71(snap(target)), p.cloudArchiveIdentityV71(desired));
  assert.equal(target.getItem("unrelated"), "keep"); assert.equal(target.getItem(p.CLOUD_WORKSPACE_OWNER_KEY_V71), A);
  const rescue = JSON.parse(target.getItem(result.rescueKey)); assert.equal(rescue.format, "yautja-cloud-local-rescue");
  for (const { key, raw } of rescue.snapshot.entries) assert.equal(raw, before.get(key), key);
  assert.equal(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), null);
});

test("future, corrupt or foreign checkpoint annexes refuse sync without changing any local bytes", async () => {
  for (const mode of ["future-save", "corrupt-save", "future-slot", "future-backup", "foreign-pit"]) {
    const s = await fixture();
    if (mode === "future-save") { const save = JSON.parse(s.getItem(p.SAVE_STORAGE_KEY)); save.version = 999; s.setItem(p.SAVE_STORAGE_KEY, JSON.stringify(save)); }
    if (mode === "corrupt-save") s.setItem(p.SAVE_STORAGE_KEY, "{broken");
    if (mode.startsWith("future-slot") || mode === "future-backup") { const key = p.campaignSlotStorageKey(1), doc = JSON.parse(s.getItem(key)); doc.version = 999; s.setItem(key + (mode === "future-backup" ? ".backup" : ""), JSON.stringify(doc)); }
    if (mode === "foreign-pit") { const key = [...s.data.keys()].find(k => /^yautja-long-hunt\.the-pit\.2/.test(k)); const pit = JSON.parse(s.getItem(key)); pit.ownerSaveCreatedAt = "2026-01-01T00:00:00.000Z"; s.setItem(key, JSON.stringify(pit)); }
    const before = originals(s); assert.throws(() => snap(s)); assertPreserved(before, s);
  }
});

test("incoming secrets, duplicates, future archive versions and invalid sidecars are rejected before any write", async () => {
  const s = await fixture(), clean = snap(s), before = originals(s);
  for (const mutate of [v => v.entries.push({ key: "supabase.token", raw: "secret" }), v => v.entries.push(v.entries[0]), v => { v.version = 99; }, v => v.entries.push({ key: "yautja-long-hunt.the-pit.not-owner", raw: "{}" })]) {
    const invalid = structuredClone(clean); mutate(invalid); assert.equal(p.parseCloudArchiveV71(JSON.stringify(invalid)).archive, null);
  }
  assertPreserved(before, s);
});

test("capture detects both overwritten raw bytes and keys added during its read without exporting a torn archive", async () => {
  for (const mode of ["bytes", "keys"]) {
    const s = await fixture(), original = s.getItem; let reads = 0;
    s.getItem = key => { const value = original(key); if (++reads === 2) {
      if (mode === "bytes") s.data.set(p.SAVE_STORAGE_KEY, "changed-concurrently");
      else s.data.set(p.pitSaveStorageKey("2026-01-01T00:00:00.000Z"), JSON.stringify(p.createPitSave("2026-01-01T00:00:00.000Z")));
    } return value; };
    assert.throws(() => snap(s));
  }
});

test("cloud restore preflight rejects a stale confirmation and protects future local documents", async () => {
  const target = await fixture(), incoming = snap(await fixture("Cloud")), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming);
  const save = JSON.parse(target.getItem(p.SAVE_STORAGE_KEY)); save.profile.hunterName = "Autre onglet"; target.setItem(p.SAVE_STORAGE_KEY, JSON.stringify(save));
  const before = originals(target), result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX });
  assert.equal(result.persisted, false); assertPreserved(before, target);
  save.version = 999; target.setItem(p.SAVE_STORAGE_KEY, JSON.stringify(save)); assert.throws(() => p.prepareCloudArchiveRestoreV71(target, A, incoming));
});

test("quota at journal, rescue, first slot or commit rolls back all five-campaign changes", async () => {
  for (const phase of ["journal", "rescue", "slot", "commit"]) {
    const target = await fixture("Local " + phase), incoming = snap(await fixture("Cloud " + phase)), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming), before = originals(target);
    const write = target.setItem; let failed = false;
    target.setItem = (key, raw) => {
      const match = phase === "journal" && key === p.ARCHIVE_TRANSFER_JOURNAL_KEY || phase === "rescue" && key.startsWith(p.CLOUD_LOCAL_RESCUE_PREFIX_V71) || phase === "slot" && key === p.campaignSlotStorageKey(1) || phase === "commit" && key === p.ARCHIVE_TRANSFER_JOURNAL_KEY && JSON.parse(raw).phase === "committed";
      if (match && !failed) { failed = true; throw Object.assign(new Error("full"), { name: "QuotaExceededError" }); }
      return write(key, raw);
    };
    const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 });
    assert.equal(result.persisted, false, phase); assertPreserved(before, target); assert.equal(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), null);
  }
});

test("commit marker persisted before an exception is reconciled as durable, never reported rolled back", async () => {
  const target = await fixture(), incoming = snap(await fixture("Remote")), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming), write = target.setItem; let thrown = false;
  target.setItem = (key, raw) => { write(key, raw); if (!thrown && key === p.ARCHIVE_TRANSFER_JOURNAL_KEY && JSON.parse(raw).phase === "committed") { thrown = true; throw new Error("after durable write"); } };
  const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 });
  assert.equal(result.persisted, true); assert.equal(p.cloudArchiveIdentityV71(snap(target)), p.cloudArchiveIdentityV71(incoming));
});

test("a third session divergent write is never overwritten by failed-transfer rollback", async () => {
  const target = await fixture(), incoming = snap(await fixture("Remote")), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming), write = target.setItem;
  const key = p.campaignSlotStorageKey(1); let injected = false;
  target.setItem = (k, raw) => { write(k, raw); if (k === key && !injected) { injected = true; target.data.set(k, "THIRD_SESSION_BYTES"); throw new Error("concurrent"); } };
  const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 });
  assert.equal(result.persisted, false); assert.equal(result.recovery.status, "blocked"); assert.equal(target.getItem(key), "THIRD_SESSION_BYTES");
  assert(p.isCloudArchiveJournalV71(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY)));
});

test("newer device clocks never select a divergent local or remote campaign automatically", async () => {
  const local = snap(await fixture("Mobile")), cloud = row(snap(await fixture("Desktop")), 3), d = await digests(local, cloud);
  const decision = p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: null, local, cloud, ...d, base: null });
  assert.equal(decision.action, "confirmation"); assert.equal(decision.reason, "divergence");
  assert.throws(() => p.reconcileCloudArchiveV71({ accountId: B, workspaceAccountId: null, local, cloud, ...d, base: null }), /autre compte/);
});

test("three-way baseline downloads a remote change, uploads a local-only change, and preserves simultaneous changes", async () => {
  const baseline = snap(await fixture("Baseline")), changed = snap(await fixture("Changed")), digest = await p.cloudArchiveDigestV71(baseline);
  let cloud = row(changed, 2), d = await digests(baseline, cloud);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: A, local: baseline, cloud, ...d, base: { revision: 1, digest } }).action, "download-cloud");
  cloud = row(baseline, 1); d = await digests(changed, cloud);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: A, local: changed, cloud, ...d, base: { revision: 1, digest } }).action, "upload-local");
  cloud = row(snap(await fixture("Another change")), 2); d = await digests(changed, cloud);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: A, local: changed, cloud, ...d, base: { revision: 1, digest } }).action, "confirmation");
});

test("switching accounts always asks before uploading another account workspace, even when target cloud is empty", async () => {
  const local = snap(await fixture()), d = await digests(local, null);
  const decision = p.reconcileCloudArchiveV71({ accountId: B, workspaceAccountId: A, local, cloud: null, ...d, base: null });
  assert.deepEqual(decision, { action: "confirmation", reason: "account-change" });
});

test("empty browser fetches mobile archive, while an empty account accepts local traces and exact snapshots are noop", async () => {
  const local = snap(await fixture()), empty = snap(store()), cloud = row(local), d = await digests(empty, cloud);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: null, local: empty, cloud, ...d, base: null }).action, "download-cloud");
  const only = await digests(local, null);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: null, local, cloud: null, ...only, base: null }).action, "upload-local");
  const same = await digests(local, cloud);
  assert.equal(p.reconcileCloudArchiveV71({ accountId: A, workspaceAccountId: null, local, cloud, ...same, base: null }).action, "none");
});

test("offline queue persists exact snapshot and account ownership without storing auth tokens", async () => {
  const s = await fixture(), snapshot = snap(s), queued = p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { operationId: TX, now: NOW });
  assert.equal(p.readCloudOutboxV71(s, A).outbox.accountId, A); assert.equal(p.readCloudOutboxV71(s, B).outbox, null);
  assert.equal(queued.snapshot.entries.length, snapshot.entries.length);
  assert.equal(/access_token|refresh_token|password/.test(s.getItem(p.cloudOutboxStorageKeyV71(A))), false);
});

test("network failures retain outbox and existing local saves; a later confirmed retry closes only that account queue", async () => {
  const s = await fixture(), snapshot = snap(s), before = originals(s); p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { operationId: TX });
  const raw = s.getItem(p.cloudOutboxStorageKeyV71(A));
  await assert.rejects(p.flushCloudOutboxV71(s, A, { pull: async () => { throw new Error("offline"); }, push: async () => assert.fail("no write") }, { isCurrentAccount: () => true }), /offline/);
  assert.equal(s.getItem(p.cloudOutboxStorageKeyV71(A)), raw); assertPreserved(before, s);
  let writes = 0;
  const result = await p.flushCloudOutboxV71(s, A, { pull: async () => null, push: async input => { writes++; assert.equal(input.expectedRevision, null); return row(input.snapshot); } }, { isCurrentAccount: () => true });
  assert.equal(result.status, "synced"); assert.equal(writes, 1); assert.equal(s.getItem(p.cloudOutboxStorageKeyV71(A)), null);
  assert.equal(p.readCloudSyncBaseV71(s, A).revision, 1); assertPreserved(before, s);
});

test("remote CAS divergence is retained for explicit user choice and never receives a blind update", async () => {
  const s = await fixture(), snapshot = snap(s), other = snap(await fixture("Other device"));
  p.queueCloudArchiveV71(s, A, snapshot, { revision: 1, digest: await p.cloudArchiveDigestV71(other) }, { operationId: TX }); const raw = s.getItem(p.cloudOutboxStorageKeyV71(A));
  await assert.rejects(p.flushCloudOutboxV71(s, A, { pull: async () => row(other, 2), push: async () => assert.fail("blind update") }, { isCurrentAccount: () => true }), p.CloudSyncConflictV71);
  assert.equal(s.getItem(p.cloudOutboxStorageKeyV71(A)), raw);
});

test("lost response after a cloud commit retries idempotently by exact snapshot instead of duplicating the revision", async () => {
  const s = await fixture(), snapshot = snap(s); p.queueCloudArchiveV71(s, A, snapshot, { revision: 1, digest: null }, { operationId: TX });
  const result = await p.flushCloudOutboxV71(s, A, { pull: async () => row(snapshot, 2), push: async () => assert.fail("duplicate remote write") }, { isCurrentAccount: () => true });
  assert.equal(result.status, "synced"); assert.equal(result.row.revision, 2); assert.equal(p.readCloudSyncBaseV71(s, A).revision, 2);
});

test("a newer local outbox queued during network I/O is never removed by an older acknowledgement", async () => {
  const s = await fixture(), snapshot = snap(s), newer = snap(await fixture("Newer local"));
  p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { operationId: TX });
  const result = await p.flushCloudOutboxV71(s, A, { pull: async () => null, push: async input => {
    p.queueCloudArchiveV71(s, A, newer, { revision: null, digest: null }, { operationId: "f907f643-c996-4344-b97c-f749e7c5b9a9" }); return row(input.snapshot);
  } }, { isCurrentAccount: () => true });
  assert.equal(result.status, "changed-locally"); assert.equal(p.cloudArchiveIdentityV71(p.readCloudOutboxV71(s, A).outbox.snapshot), p.cloudArchiveIdentityV71(newer));
});

test("logout or account switch during pull prevents upload and retains queue", async () => {
  const s = await fixture(), snapshot = snap(s); p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { operationId: TX }); let current = true;
  await assert.rejects(p.flushCloudOutboxV71(s, A, { pull: async () => { current = false; return null; }, push: async () => assert.fail("upload after logout") }, { isCurrentAccount: () => current }), /déconnecté/);
  assert(p.readCloudOutboxV71(s, A).outbox);
});

test("malformed or foreign remote acknowledgement never clears queue or advances the trusted base", async () => {
  const s = await fixture(), snapshot = snap(s); p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { operationId: TX });
  await assert.rejects(p.flushCloudOutboxV71(s, A, { pull: async () => null, push: async () => row(snapshot, 1, B) }, { isCurrentAccount: () => true }), /autre compte/);
  assert(p.readCloudOutboxV71(s, A).outbox); assert.equal(p.readCloudSyncBaseV71(s, A), null);
});

test("corrupt and future offline queues remain protected; stale queue previews do not replace pending data", async () => {
  const s = await fixture(), snapshot = snap(s), key = p.cloudOutboxStorageKeyV71(A);
  s.setItem(key, "{broken"); assert.throws(() => p.readCloudOutboxV71(s, A)); assert.equal(s.getItem(key), "{broken");
  assert.throws(() => p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null }, { expectedRaw: null }), /file/);
  s.setItem(key, JSON.stringify({ format: "yautja-cloud-outbox", version: 99, accountId: A })); assert.throws(() => p.readCloudOutboxV71(s, A));
  const future = s.getItem(key); assert.throws(() => p.queueCloudArchiveV71(s, A, snapshot, { revision: null, digest: null })); assert.equal(s.getItem(key), future);
});

test("an interrupted prepared import recovers the full previous workspace only after its lease, retaining the rescue", async () => {
  const target = await fixture("Before crash"), incoming = snap(await fixture("Remote crash")), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming), before = originals(target), write = target.setItem;
  let failed = false;
  target.setItem = (key, raw) => {
    if (key === p.ARCHIVE_TRANSFER_JOURNAL_KEY && JSON.parse(raw).phase === "committed") { failed = true; throw new Error("browser crash before commit marker"); }
    if (failed && key === p.SAVE_STORAGE_KEY) throw new Error("rollback temporarily blocked");
    return write(key, raw);
  };
  const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 }); assert.equal(result.persisted, false); assert.equal(result.recovery.status, "blocked");
  target.setItem = write;
  assert.equal(p.recoverCloudArchiveV71(target, { now: 1 }).status, "blocked");
  assert.equal(p.recoverCloudArchiveV71(target, { now: 15_001 }).status, "rolled-back");
  assertPreserved(before, target); assert.equal(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), null); assert(target.getItem(result.rescueKey));
});

test("a durable commit with failed journal cleanup recovers as committed without rolling the account back", async () => {
  const target = await fixture("Old"), incoming = snap(await fixture("New")), plan = p.prepareCloudArchiveRestoreV71(target, A, incoming), remove = target.removeItem;
  target.removeItem = key => { if (key === p.ARCHIVE_TRANSFER_JOURNAL_KEY) throw new Error("cleanup denied"); return remove(key); };
  const result = p.applyCloudArchiveRestoreV71(target, plan, { transactionId: TX, now: 0 }); assert.equal(result.persisted, false); assert.equal(result.recovery.status, "blocked");
  assert.equal(JSON.parse(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY)).phase, "committed");
  target.removeItem = remove;
  assert.equal(p.recoverCloudArchiveV71(target, { now: 20_000 }).status, "committed");
  assert.equal(p.cloudArchiveIdentityV71(snap(target)), p.cloudArchiveIdentityV71(incoming)); assert.equal(target.getItem(p.CLOUD_WORKSPACE_OWNER_KEY_V71), A);
});

test("future cloud transfer journals are frozen without interpreting them as legacy or touching game data", async () => {
  const target = await fixture(), before = originals(target);
  const future = JSON.stringify({ format: "yautja-cloud-archive-transaction", version: 999 }); target.setItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY, future);
  assert(p.isCloudArchiveJournalV71(future)); assert.equal(p.recoverCloudArchiveV71(target).status, "blocked");
  assertPreserved(before, target); assert.equal(target.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), future);
});

test("explicit keep-local stores a validated remote branch before overwrite and refuses existing rescue collisions", async () => {
  const s = await fixture(), remote = row(snap(await fixture("Other device")), 5), before = originals(s);
  const key = p.backupRemoteCloudV71(s, remote, { rescueId: TX, now: NOW }); const rescue = JSON.parse(s.getItem(key));
  assert.equal(rescue.format, "yautja-cloud-remote-rescue"); assert.equal(rescue.row.revision, 5); assert.equal(rescue.row.accountId, A);
  assert.equal(p.cloudArchiveIdentityV71(rescue.row.snapshot), p.cloudArchiveIdentityV71(remote.snapshot)); assertPreserved(before, s);
  const raw = s.getItem(key); assert.throws(() => p.backupRemoteCloudV71(s, remote, { rescueId: TX }), /existe déjà/); assert.equal(s.getItem(key), raw);
});

test("remote rescue quota failure never authorizes an overwrite or changes local game saves", async () => {
  const s = await fixture(), remote = row(snap(await fixture("Remote"))), before = originals(s), write = s.setItem;
  s.setItem = (key, raw) => { if (key.startsWith(p.CLOUD_REMOTE_RESCUE_PREFIX_V71)) throw new Error("QuotaExceededError"); return write(key, raw); };
  assert.throws(() => p.backupRemoteCloudV71(s, remote), /QuotaExceededError/); assertPreserved(before, s);
});
