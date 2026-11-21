import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sourceCommit = 'd71e995ae886df69c4165a1a153291449e8f22f6';
const sources = {
  traces: 'docs/suivi-production/v611/data/prior-production-v610.json',
  finals: 'docs/suivi-production/v613/data/production-manifest.json',
  checkpoint: 'docs/suivi-production/v613/recovery/native-checkpoint.json',
  verified: 'docs/suivi-production/v613/recovery/verified-native-files.json',
};

const root = fileURLToPath(new URL('../', import.meta.url));
function readSource(path) {
  return JSON.parse(execFileSync('git', ['show', sourceCommit + ':' + path], {
    cwd: root,
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_ALLOW_PROTOCOL: '' },
    maxBuffer: 4 * 1024 * 1024,
  }));
}

function indexById(rows) {
  const index = new Map(rows.map(row => [row.id, row]));
  assert.equal(index.size, rows.length, 'Identifiant de source dupliqué');
  return index;
}

function checkedFingerprint({ id, bytes, sha256 }) {
  assert.match(sha256, /^[a-f0-9]{64}$/, id);
  assert.ok(Number.isSafeInteger(bytes) && bytes > 0, id);
  return [bytes, sha256];
}

function recoveryWorklist(traces, finals, checkpoint, verified) {
  const finalIndex = indexById(finals.assets);
  const checkpointIndex = indexById(checkpoint.assets);
  const verifiedIndex = indexById(verified.assets);
  assert.equal(traces.records.length, traces.recordCount);
  assert.equal(traces.recoveredPngCount, 0);
  assert.equal(verifiedIndex.size, finalIndex.size);
  assert.equal(checkpointIndex.size, finals.summary.historicalCheckpointRecords);
  assert.ok(finals.summary.plannedPromptsAreNotSubmissionEvidence);
  indexById(traces.records);

  const columns = [
    'Critère', 'Identifiant', 'Pièce recherchée', 'État dans la source',
    'Feuille source V610', 'Ligne du classeur', 'Chemin PNG', 'Octets du PNG attendu',
    'SHA-256 du PNG attendu', 'Date inscrite dans la trace V610',
    'Commit Git du PNG final V613', 'Blob Git du PNG final V613',
    'Sortie ancienne distincte du PNG final V613',
    'Octets de cette sortie ancienne', 'SHA-256 de cette sortie ancienne',
    'Date portée par le reçu de cette sortie ancienne', 'Commit de la source du suivi',
  ];
  const rows = traces.records.map(trace => {
    assert.equal(trace.sourceSheet, traces.sourceSheet, trace.id);
    assert.equal(trace.nativePngRecovered, false, trace.id);
    assert.equal(trace.availabilityNow, 'not_recovered', trace.id);
    return ['ENFORCERS-V610-TRACES', trace.id, 'PNG original référencé dans le classeur',
      'PNG non récupéré', trace.sourceSheet, trace.sourceRow, trace.repoPath,
      ...checkedFingerprint(trace), trace.generatedAtUtc, '', '', '', '', '', '', sourceCommit];
  });

  let expectedReceipts = 0;
  for (const final of finalIndex.values()) {
    const proof = verifiedIndex.get(final.id);
    assert.ok(proof?.recoveredByteIdenticalToGitBlob, final.id);
    assert.equal(proof.repoPngPath, final.repoPngPath, final.id);
    assert.equal(proof.gitBlobSha, final.nativeGitBlobSha, final.id);
    assert.equal(verified.recoveryCommit, final.nativeRecoveryCommit, final.id);
    assert.deepEqual(checkedFingerprint(proof), checkedFingerprint(final), final.id);
    if (proof.receiptMatchesFinal) {
      assert.ok(final.acceptedOutputPromptExact?.trim(), final.id);
      continue;
    }

    assert.equal(proof.receiptMatchesFinal, false, final.id);
    assert.equal(final.acceptedOutputPromptExact, null, final.id);
    assert.equal(final.plannedPromptIsSubmissionEvidence, false, final.id);
    expectedReceipts++;
    const older = checkpointIndex.get(final.id);
    let rejectedOutput = ['', '', '', ''];
    if (older) {
      assert.equal(older.repoPngPath, final.repoPngPath, final.id);
      assert.notEqual(older.sha256, final.sha256, final.id);
      assert.ok(older.nativeSourceName, final.id);
      rejectedOutput = [older.nativeSourceName, ...checkedFingerprint(older), older.receiptCreatedAtUtc ?? ''];
    }

    rows.push(['ENFORCERS-V613-RECEIPTS', final.id, 'Reçu natif du PNG final',
      'PNG vérifié, reçu final absent', '', final.sourceWorkbookRow, final.repoPngPath,
      ...checkedFingerprint(final), '', final.nativeRecoveryCommit, final.nativeGitBlobSha,
      ...rejectedOutput, sourceCommit]);
  }
  assert.equal(expectedReceipts, finals.summary.finalReceiptsNotRecovered);
  assert.equal(expectedReceipts, verified.finalReceiptsNotRecovered);
  assert.equal(finalIndex.size - expectedReceipts, finals.summary.matchingFinalReceiptsRecovered);
  return [columns, ...rows].map(row => {
    assert.equal(row.length, columns.length);
    assert.ok(row.every(cell => ['string', 'number'].includes(typeof cell) && !/[\t\r\n]/.test(cell)));
    return row.join('\t');
  }).join('\n') + '\n';
}

process.stdout.write('\uFEFF' + recoveryWorklist(
  readSource(sources.traces), readSource(sources.finals),
  readSource(sources.checkpoint), readSource(sources.verified),
));
