import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile("app/game/CloudAccountV71.tsx", "utf8");
const ast = ts.createSourceFile("CloudAccountV71.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
/** Execute the real callback body, injecting only its external effects. */
function callback(name, env) {
  let found;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer; ts.forEachChild(node, visit); };
  visit(ast); assert(found, name + " callback must exist");
  if (ts.isCallExpression(found) && found.expression.getText(ast) === "useCallback") found = found.arguments[0];
  const code = ts.transpileModule("const extracted=" + found.getText(ast) + "; export default extracted;", { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  return Function(...Object.keys(env), "exports", code + ";return exports.default;")(...Object.values(env), exports);
}
const account = "c4fcb61c-644f-448a-8d89-b47bd9d90e9c", other = "0d235e68-f03d-478d-9c25-cf0e1f4bbb04";
const local = { entries: [{ key: "local", raw: "progress" }] }, remote = { accountId: account, revision: 3, snapshot: { entries: [{ key: "cloud", raw: "progress" }] }, updatedAt: "2026-10-02T10:00:00Z" };
const session = { user: { id: account }, expiresAt: Date.now() / 1000 + 3600 };
function environment() {
  const writes = [], messages = [], env = {
    working: { current: false }, current: { current: session }, mounted: { current: true }, epoch: { current: 1 },
    observedRemote: { current: remote }, observedLocal: { current: "local" },
    window: { localStorage: { getItem: () => null, setItem: (key, raw) => writes.push([key, raw]), removeItem: key => writes.push([key, null]) }, location: { reload: () => writes.push(["reload"]) } },
    setBusy: () => {}, setRemote: row => writes.push(["remote", row]), setLocalSummary: () => {}, setChoice: value => writes.push(["choice", value]), setMessage: value => messages.push(value),
    archiveTransferPending: () => false, ownerCurrent: id => env.current.current?.user.id === id,
    api: { refresh: async value => value }, commitSession: value => writes.push(["session", value]),
    adapter: () => ({ pull: async () => remote }),
    readCloudOutboxV71: () => ({ outbox: null, raw: null }), readCloudWorkspaceOwnerV71: () => account,
    capture: async () => local, captureCloudArchiveV71: () => local,
    cloudArchiveIdentityV71: snapshot => snapshot === local ? "local" : "cloud",
    archiveSummary: () => "summary", cloudArchiveDigestV71: async snapshot => snapshot === local ? "digest-local" : "digest-cloud",
    readCloudSyncBaseV71: () => null, reconcileCloudArchiveV71: () => ({ action: "upload-local" }),
    cloudArchiveHasTraceV71: snapshot => snapshot.entries.length > 0,
    remember: async row => writes.push(["remember", row]),
    queueCloudArchiveV71: () => writes.push(["queue"]),
    flushCloudOutboxV71: async () => ({ status: "synced", row: remote }),
    restore: async row => writes.push(["restore", row]),
    withArchiveTransferLock: async operation => ({ acquired: true, value: operation() }),
    prepareCloudArchiveRestoreV71: () => (writes.push(["prepare"]), {}),
    applyCloudArchiveRestoreV71: () => (writes.push(["apply"]), { persisted: true }),
    cloudOutboxStorageKeyV71: () => "outbox", backupRemoteCloudV71: () => writes.push(["backup"]),
    CLOUD_WORKSPACE_OWNER_KEY_V71: "owner",
  };
  return { env, writes, messages };
}

test("real sync callback never queues local bytes after account replacement during archive capture", async () => {
  const { env, writes } = environment();
  env.capture = async () => { env.current.current = { ...session, user: { id: other } }; env.epoch.current++; return local; };
  await callback("sync", env)(true);
  assert.equal(writes.some(([key]) => key === "queue"), false); assert.equal(env.working.current, false);
});

test("real sync callback cancels ownership writes after account replacement during digest computation", async () => {
  const { env, writes } = environment();
  env.cloudArchiveDigestV71 = async () => { env.epoch.current++; return "digest"; };
  await callback("sync", env)(true);
  assert.equal(writes.some(([key]) => key === "queue" || key === "remember"), false);
});

test("real sync callback aborts a stale refresh response instead of reviving a replaced session", async () => {
  const { env, writes } = environment(); env.current.current = { ...session, expiresAt: 0 };
  env.api.refresh = async value => { env.epoch.current++; return value; };
  await callback("sync", env)(true);
  assert.equal(writes.some(([key]) => key === "session" || key === "queue"), false);
});

test("real restore callback refuses a changed local preview before preparing any import", async () => {
  const { env, writes } = environment(); env.observedLocal.current = "earlier-preview";
  await assert.rejects(callback("restore", env)(remote), /prévisualisation/);
  assert.equal(writes.some(([key]) => key === "prepare" || key === "apply" || key === "reload"), false);
});

test("real restore callback reloads after durable commit even when remembering its baseline fails", async () => {
  const { env, writes } = environment(); env.remember = async () => { throw new Error("metadata-quota"); };
  await assert.rejects(callback("restore", env)(remote), /metadata-quota/);
  assert.equal(writes.filter(([key]) => key === "apply").length, 1); assert.equal(writes.filter(([key]) => key === "reload").length, 1);
});

test("real manual keep-local callback refuses a remote revision changed since its displayed preview", async () => {
  const { env, writes, messages } = environment(); env.adapter = () => ({ pull: async () => ({ ...remote, revision: 4 }) });
  await callback("keepLocal", env)();
  assert.equal(writes.some(([key]) => key === "owner" || key === "queue" || key === "backup"), false); assert(messages.some(m => /copie du compte a changé/.test(m)));
});

test("real manual keep-local callback rechecks account after asynchronous remote digest", async () => {
  const { env, writes } = environment(); env.cloudArchiveDigestV71 = async () => { env.epoch.current++; return "digest"; };
  await callback("keepLocal", env)();
  assert.equal(writes.some(([key]) => key === "owner" || key === "queue" || key === "backup"), false);
});

test("real manual keep-local callback refuses a local preview changed before the shared browser lock", async () => {
  const { env, writes, messages } = environment(); env.observedLocal.current = "earlier-preview";
  await callback("keepLocal", env)();
  assert.equal(writes.some(([key]) => key === "owner" || key === "queue" || key === "backup"), false); assert(messages.some(m => /prévisualisation/.test(m)));
});

test("real manual use-remote callback refuses a cloud revision changed before restore", async () => {
  const { env, writes, messages } = environment(); env.adapter = () => ({ pull: async () => ({ ...remote, revision: 4 }) });
  await callback("keepRemote", env)();
  assert.equal(writes.some(([key]) => key === "restore"), false); assert(messages.some(m => /copie du compte a changé/.test(m)));
});

test("real controller preserves a newer pending outbox without claiming all saves are synchronized", async () => {
  const { env, messages } = environment(); env.readCloudOutboxV71 = () => ({ outbox: {}, raw: "pending" });
  env.flushCloudOutboxV71 = async () => ({ status: "changed-locally", row: remote });
  await callback("sync", env)(true);
  assert(messages.some(m => /en attente/.test(m))); assert.equal(messages.some(m => /synchronisées avec le compte/.test(m)), false);
});

test("real refresh still presents the current cloud branch when a pending outbox meets a remote conflict", async () => {
  const { env, writes, messages } = environment(); env.readCloudOutboxV71 = () => ({ outbox: {}, raw: "pending" });
  const conflict = Object.assign(new Error("remote conflict"), { name: "CloudSyncConflictV71" });
  env.CloudSyncConflictV71 = class extends Error {}; Object.setPrototypeOf(conflict, env.CloudSyncConflictV71.prototype);
  env.flushCloudOutboxV71 = async () => { throw conflict; };
  env.reconcileCloudArchiveV71 = () => ({ action: "confirmation", reason: "divergence" });
  await callback("sync", env)(true);
  assert(writes.some(([key, value]) => key === "remote" && value === remote), "Remote conflict must not prevent a fresh preview");
  assert(writes.some(([key, value]) => key === "choice" && value === true)); assert.equal(messages.some(m => /synchronisées/.test(m)), false);
});

function emptyWorkspace() {
  const result = environment(), empty = { entries: [] };
  let owner = null;
  result.env.capture = async () => empty; result.env.captureCloudArchiveV71 = () => empty;
  result.env.adapter = () => ({ pull: async () => null });
  result.env.reconcileCloudArchiveV71 = () => ({ action: "none", reason: "empty" });
  result.env.readCloudWorkspaceOwnerV71 = () => owner;
  result.env.window.localStorage.setItem = (key, raw) => { result.writes.push([key, raw]); if (key === "owner") owner = raw; };
  return { ...result, owner: () => owner, setOwner: value => { owner = value; } };
}

test("real empty-account sync binds a verified unowned empty workspace without creating a cloud save", async () => {
  const { env, writes, owner, messages } = emptyWorkspace();
  await callback("sync", env)(true);
  assert.equal(owner(), account); assert.deepEqual(writes.filter(([key]) => key === "owner"), [["owner", account]]);
  assert.equal(writes.some(([key]) => ["queue", "restore", "apply", "backup"].includes(key)), false);
  assert(messages.some(message => /première partie/.test(message)));
});

test("real empty-account sync refuses an association when local progress appears before its lock", async () => {
  const { env, writes, owner, messages } = emptyWorkspace();
  let appeared = false;
  env.captureCloudArchiveV71 = () => appeared ? local : { entries: [] };
  env.withArchiveTransferLock = async operation => { appeared = true; return { acquired: true, value: operation() }; };
  await callback("sync", env)(true);
  assert.equal(owner(), null); assert.equal(writes.some(([key]) => key === "owner" || key === "queue"), false);
  assert(messages.some(message => /archives ont changé/.test(message)));
});

test("real empty-account sync refuses an association when the authenticated account is replaced before its lock", async () => {
  const { env, writes, owner, messages } = emptyWorkspace();
  env.withArchiveTransferLock = async operation => { env.current.current = { ...session, user: { id: other } }; return { acquired: true, value: operation() }; };
  await callback("sync", env)(true);
  assert.equal(owner(), null); assert.equal(writes.some(([key]) => key === "owner" || key === "queue"), false);
  assert(messages.some(message => /Compte remplacé/.test(message)));
});

test("real empty-account sync preserves an existing different workspace owner instead of automatically rebinding it", async () => {
  const { env, writes, owner, setOwner } = emptyWorkspace(); setOwner(other);
  await callback("sync", env)(true);
  assert.equal(owner(), other); assert.equal(writes.some(([key]) => key === "owner" || key === "queue"), false);
});

test("real empty-account sync does not bind when a pending outbox appears before its lock", async () => {
  const { env, writes, owner, messages } = emptyWorkspace();
  let appeared = false;
  env.readCloudOutboxV71 = () => appeared ? { outbox: {}, raw: "new-pending" } : { outbox: null, raw: null };
  env.withArchiveTransferLock = async operation => { appeared = true; return { acquired: true, value: operation() }; };
  await callback("sync", env)(true);
  assert.equal(owner(), null); assert.equal(writes.some(([key]) => key === "owner" || key === "queue"), false);
  assert(messages.some(message => /archives ont changé/.test(message)));
});
