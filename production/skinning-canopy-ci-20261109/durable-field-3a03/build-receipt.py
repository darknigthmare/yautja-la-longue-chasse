from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess

out = Path(__file__).resolve().parent
repo = Path('/workspace/yautja-reprise-20261109')
index_path = 'tests/fixtures/skinning-canopy-browser-assets-20261109.json'
old_head = '3a03ca990e3c27761d411ee043eb8fdbbaffa6c3'
raw_index = (repo / index_path).read_bytes()
index = json.loads(raw_index)
old_raw = subprocess.check_output(['git', 'show', f'{old_head}:{index_path}'], cwd=repo)
old = json.loads(old_raw)
assert index['schemaVersion'] == 1
assert len(index['assets']) == len(old['assets']) == 289
assert [a['path'] for a in index['assets']] == [a['path'] for a in old['assets']]
assert len({a['path'] for a in index['assets']}) == 289
assert index['observedAt'] == old['observedAt']
assert index['reportSha256'] == old['reportSha256']
assert index['assetSetObservationSourceRef'] == old['sourceRef']
assert index['repinnedFromManifestSha256'] == hashlib.sha256(old_raw).hexdigest()
changed = [{'before': a, 'after': b} for a, b in zip(old['assets'], index['assets']) if a != b]
assert len(changed) == 1 and changed[0]['after']['path'] == 'public/audio/manifest.json'
assert changed == index['repinnedChanges']

tree_bytes = subprocess.check_output(['git', 'ls-tree', '-r', '-z', index['sourceRef'], '--'] + [a['path'] for a in index['assets']], cwd=repo)
tree = {}
for row in tree_bytes.split(b'\0'):
    if not row:
        continue
    meta, path = row.split(b'\t', 1)
    mode, kind, oid = meta.decode().split()
    tree[path.decode()] = (mode, kind, oid)
proc = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
total = 0
for asset in index['assets']:
    path = asset['path']
    assert path.startswith('public/') and '..' not in path and '\\' not in path
    assert re.fullmatch('[a-f0-9]{40}', asset['gitBlob'])
    assert re.fullmatch('[a-f0-9]{64}', asset['sha256'])
    mode, kind, oid = tree[path]
    assert mode in ('100644', '100755') and kind == 'blob' and oid == asset['gitBlob']
    proc.stdin.write((oid + '\n').encode()); proc.stdin.flush()
    header = proc.stdout.readline().decode().split()
    assert header[:2] == [oid, 'blob']
    git_bytes = proc.stdout.read(int(header[2])); assert proc.stdout.read(1) == b'\n'
    assert len(git_bytes) == asset['bytes']
    assert hashlib.sha256(git_bytes).hexdigest() == asset['sha256']
    local = repo / path
    assert local.is_file() and not local.is_symlink()
    assert local.read_bytes() == git_bytes
    total += len(git_bytes)
proc.stdin.close(); assert proc.wait() == 0
assert total == 91782471

def dump(name, value):
    (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

review = {
    'classification': 'PASS_READ_ONLY_INDEX_REPIN_REVIEW',
    'reviewedAt': datetime.now(timezone.utc).isoformat(),
    'sourceRef': index['sourceRef'], 'pathCount': len(index['assets']), 'bytes': total,
    'workspaceFilesVerified': len(index['assets']), 'gitBlobsVerified': len(index['assets']),
    'indexSha256': hashlib.sha256(raw_index).hexdigest(),
    'observationSourceAndTimestampPreserved': True,
    'oldIndexSha256Verified': True, 'declaredRepinMatchesActualDiff': True,
    'changedAssets': changed,
    'ciMaterializer': {
        'file': '.github/workflows/hunt-closure-v112.yml',
        'compatible': True,
        'basis': 'schemaVersion 1 and assets contract unchanged; safe unique paths, byte counts, SHA256 and Git blobs verified; additional provenance metadata is ignored by the existing materializer',
        'sparseCheckoutExecutedDuringReview': False
    },
    'scope': 'Read-only review of repinned bytes; no new browser execution on this audio-contract sourceRef'
}
dump('asset-index-repin-review.json', review)

raw_log = (out / 'job-129077780656.log').read_bytes()
lines = raw_log.decode('utf-8').splitlines()
pass_lines = [line for line in lines if 'Z PASS ' in line]
assert len(pass_lines) == 16
results = [json.loads(line.split('Z ', 1)[1]) for line in lines if '"classification":"BOUNDED_NATIVE_DURABLE_PASS"' in line]
assert len(results) == 1
result = results[0]
assert result['passed'] is True and result['checks'] == 16 and result['captures'] == 17 and result['failure'] is None
assert not re.search(r'https?://\S*[?&](?:sig|Signature|X-Amz-Signature|token)=\S*', raw_log.decode())
assert not re.search(r'\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b', raw_log.decode())
dump('summary-from-job-log.json', {
    'derivedFrom': 'job-129077780656.log',
    'fullBrowserReportRetrieved': False,
    'executionSummary': result,
    'passLines': pass_lines
})

run = json.loads((out / 'workflow-run-42592671946.json').read_bytes())
job = json.loads((out / 'workflow-job-129077780656.json').read_bytes())
artifact = json.loads((out / 'artifact-13661948968.json').read_bytes())
head = json.loads((out / 'commit-head-3a03.json').read_bytes())
merge = json.loads((out / 'commit-merge-51958.json').read_bytes())
assert run['conclusion'] == job['conclusion'] == 'success'
assert run['head_sha'] == head['sha'] == old_head
assert head['tree']['sha'] == merge['tree']['sha']
assert artifact['digest'] == 'sha256:ba60b1ff78e73be07bf2f294ba47c1962d76f0d02d53a1c0a72538487050f8c1'
dump('receipt.json', {
    'schemaVersion': 1,
    'createdAt': datetime.now(timezone.utc).isoformat(),
    'scope': 'Separate CI annex for the bounded native durable browser recipe, without changing frozen local or Excel proof packets',
    'repository': 'darknigthmare/yautja-la-longue-chasse',
    'pullRequest': 131,
    'workflow': {'id': run['id'], 'runAttempt': run['run_attempt'], 'name': run['name'], 'status': run['status'], 'conclusion': run['conclusion'], 'headSha': run['head_sha'], 'url': run['html_url']},
    'job': {'id': job['id'], 'name': job['name'], 'status': job['status'], 'conclusion': job['conclusion'], 'startedAt': job['started_at'], 'completedAt': job['completed_at'], 'url': job['html_url']},
    'checkout': {'sha': merge['sha'], 'kind': 'GitHub pull request synthetic merge', 'headSha': head['sha'], 'headAndMergeTreesEqual': True, 'treeSha': head['tree']['sha']},
    'resultFromRawLog': result,
    'artifact': {
        'id': artifact['id'], 'name': artifact['name'], 'sizeInBytes': artifact['size_in_bytes'],
        'createdAt': artifact['created_at'], 'expiresAt': artifact['expires_at'],
        'url': f"https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/{run['id']}/artifacts/{artifact['id']}",
        'apiUrl': f"https://api.github.com/repos/darknigthmare/yautja-la-longue-chasse/actions/artifacts/{artifact['id']}",
        'declaredZipDigest': artifact['digest'], 'digestVerifiedAgainstRawJobLog': True,
        'zipIndependentlyDownloadedAndHashed': False
    },
    'retrieval': {
        'rawJobLogSaved': True, 'rawGitHubApiMetadataSaved': True,
        'fullBrowserReportRetrieved': False, 'ciPngsInspected': False,
        'limitation': 'GitHub artifact ZIP redirects to productionresultssa14.blob.core.windows.net, which returned Forbidden through the environment network proxy. The native connector returns a FileService reference without an available local reader; download_file accepts Sediment IDs only. ZIP download stopped as instructed; no new dependency, network bypass or CI rerun.',
        'fileServiceFileId': 'file_00000000d2bc81f4a4b2d9d7284b12b1',
        'signedUrlsSaved': False
    },
    'interpretation': 'SUCCESS with 16 PASS lines and 17 captures is established by exact job log and GitHub job metadata. Full per-check JSON details and PNG pixels are not independently read from this CI ZIP. The read-only asset repin review is separate and is not a fresh browser result on sourceRef 1f9b009.',
    'indexReview': 'asset-index-repin-review.json',
    'objects': [dict(path=p.name, bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(out.iterdir()) if p.is_file() and p.name not in ('receipt.json', 'SHA256SUMS')],
    'hashPolicy': 'SHA256SUMS covers every saved object, including this receipt, except SHA256SUMS itself.'
})
paths = [p for p in sorted(out.iterdir()) if p.is_file() and p.name != 'SHA256SUMS']
(out / 'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in paths), encoding='utf-8')
print(json.dumps({'receipt': str(out/'receipt.json'), 'logSha256': hashlib.sha256(raw_log).hexdigest(), 'receiptSha256': hashlib.sha256((out/'receipt.json').read_bytes()).hexdigest(), 'sha256sumsSha256': hashlib.sha256((out/'SHA256SUMS').read_bytes()).hexdigest(), 'checks': 16, 'captures': 17, 'indexAssets': len(index['assets']), 'indexBytes': total, 'savedObjects': len(paths)}, indent=2))
