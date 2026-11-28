import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { matchingAttempt } from "./audit-enforcer-historical-recovery.mjs";

const checkpointCommit = "2d1d006628e7e657cda66470ed06f5055f4919c5";
const finalCommit = "d71e995ae886df69c4165a1a153291449e8f22f6";
const checkpointPath = "docs/suivi-production/v613/recovery/native-checkpoint.json";
const manifestPath = "docs/suivi-production/v613/data/production-manifest.json";
const git = (...args) => execFileSync("git", args, { maxBuffer: 16 * 1024 * 1024 });

function blobAt(commit, path) {
  const blob = git("rev-parse", "--verify", commit + ":" + path).toString().trim();
  assert.match(blob, /^[0-9a-f]{40}$/);
  return blob;
}

function verifyPng(commit, row) {
  const blob = blobAt(commit, row.repoPngPath);
  const data = git("cat-file", "blob", blob);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", row.id);
  assert.equal(data.length, row.bytes, row.id);
  assert.equal(createHash("sha256").update(data).digest("hex"), row.sha256, row.id);
  return { blob, bytes: data.length, sha256: row.sha256 };
}

const checkpointBlob = blobAt(checkpointCommit, checkpointPath);
const finalManifestBlob = blobAt(finalCommit, manifestPath);
const checkpoint = JSON.parse(git("cat-file", "blob", checkpointBlob));
const manifest = JSON.parse(git("cat-file", "blob", finalManifestBlob));
assert.equal(checkpoint.schemaVersion, "yautja-v613-native-checkpoint-1");
assert.equal(manifest.schemaVersion, "yautja-enforcer-production-v613-1");
assert.equal(checkpoint.assets.length, 21);
assert.equal(manifest.assets.length, 36);

const finalById = new Map(manifest.assets.map(row => [row.id, row]));
const replacements = [];
for (const record of checkpoint.assets) {
  const final = finalById.get(record.id);
  assert.ok(final, record.id);
  assert.equal(record.repoPngPath, final.repoPngPath);
  if (record.sha256 === final.sha256) continue;

  const accepted = matchingAttempt(record, record);
  assert.ok(accepted, record.id);
  assert.equal(accepted.promptExact, record.promptExact, record.id);
  assert.equal(accepted.nativeSourceName, record.nativeSourceName, record.id);
  assert.equal(final.acceptedOutputPromptExact, null, record.id);
  const earlierPng = verifyPng(checkpointCommit, record);
  const finalPng = verifyPng(finalCommit, final);
  assert.notEqual(earlierPng.blob, finalPng.blob);
  replacements.push({
    id: record.id,
    path: record.repoPngPath,
    earlierPng,
    finalPng,
    earlierAcceptedAttempt: accepted.attemptIndex,
    earlierNativeSourceName: accepted.nativeSourceName,
    receiptCreatedAtUtc: record.receiptCreatedAtUtc,
  });
}
assert.equal(replacements.length, 6);
console.log(JSON.stringify({
  checkpoint: { commit: checkpointCommit, path: checkpointPath, blob: checkpointBlob, receipts: checkpoint.assets.length },
  release: { commit: finalCommit, path: manifestPath, blob: finalManifestBlob },
  verifiedEarlierReceipts: replacements.length,
  finalsWithoutReceipt: manifest.assets.filter(row => !row.acceptedOutputPromptExact).length,
  replacements,
}, null, 2));
