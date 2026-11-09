#!/usr/bin/env python3
"""Read-only verification of this dated CI annex and preserved historical bytes."""
from hashlib import sha256
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def load(path):
    return json.loads(path.read_text())


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def check(raw, item):
    assert len(raw) == item['bytes'] and sha256(raw).hexdigest() == item['sha256'], item


def main():
    manifest = load(HERE / 'manifest.json')
    status = load(HERE / 'status.json')
    assert status['newHeadCiStatus'] == manifest['newHeadCiStatus'] == 'EN_ATTENTE'
    assert status['spatialLatencyStatus'] == 'NON_PROUVEE'
    entries = manifest['files']
    assert len(entries) == manifest['fileCount'] == len({x['path'] for x in entries})
    actual = {str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file() and p.name != 'manifest.json' and '__pycache__' not in p.parts}
    assert actual == {x['path'] for x in entries}
    for item in entries:
        path = HERE / item['path']
        assert not path.is_symlink() and path.resolve().is_relative_to(HERE)
        check(path.read_bytes(), item)
    assert sum(x['bytes'] for x in entries) == manifest['bytes']
    baseline = load(HERE / 'preserved-baseline.json')
    assert len(baseline['files']) == len({x['path'] for x in baseline['files']}) == 404
    assert baseline['originalWorkbooks'] == 108 and baseline['frozenDeliveryFiles'] == 292 and baseline['frozenDeliveryDocuments'] == 4
    for item in baseline['files']:
        check(git('show', baseline['observedSourceCommit'] + ':' + item['path']), item)
        assert git('rev-parse', baseline['observedSourceCommit'] + ':' + item['path']).decode().strip() == item['gitBlob']
        path = ROOT / item['path']
        assert not path.is_symlink()
        if path.is_file():
            raw = path.read_bytes()
        else:
            assert git('ls-files', '-t', '--', item['path']).decode().strip() == 'S ' + item['path']
            raw = git('show', 'HEAD:' + item['path'])
        check(raw, item)
    zipped_members = 0
    for folder in ['pod-42592671598', 'spatial-42592671826']:
        base = HERE / folder
        declared = load(base / 'zip-integrity.json')
        raw = (base / 'artifact.zip').read_bytes()
        assert len(raw) == declared['zipBytes'] and sha256(raw).hexdigest() == declared['zipSha256']
        api = load(base / 'github-observation.json')['artifacts'][0]
        assert api['size_in_bytes'] == len(raw) and api['digest'] == 'sha256:' + declared['zipSha256']
        assert api['workflow_run']['head_sha'] == status['observedCiCommit']
        with ZipFile(base / 'artifact.zip') as archive:
            assert archive.testzip() is None
            assert len(archive.namelist()) == declared['memberCount'] == len(declared['members'])
            assert set(archive.namelist()) == {x['name'] for x in declared['members']}
            for item in declared['members']:
                check(archive.read(item['name']), item)
                if (base / item['name']).is_file():
                    assert (base / item['name']).read_bytes() == archive.read(item['name'])
        zipped_members += declared['memberCount']
    audio = load(HERE / 'audio-regression/receipt.json')
    for name, item in audio['archiveFiles'].items():
        check((HERE / 'audio-regression' / name).read_bytes(), item)
    durable = HERE / 'durable-field-3a03'
    receipt = load(durable / 'receipt.json')
    for item in receipt['objects']:
        check((durable / item['path']).read_bytes(), item)
    for line in (durable / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1)
        assert sha256((durable / name).read_bytes()).hexdigest() == digest
    assert receipt['workflow']['headSha'] == status['observedCiCommit']
    assert receipt['resultFromRawLog']['checks'] == 16 and receipt['resultFromRawLog']['captures'] == 17
    assert receipt['artifact']['zipIndependentlyDownloadedAndHashed'] is False
    assert receipt['retrieval']['ciPngsInspected'] is False and receipt['retrieval']['fullBrowserReportRetrieved'] is False
    local = load(HERE / 'final-local-dab4b776/receipt.json')
    assert local['sourceCommit'] == local['endedCommit'] == status['correctedCodeCommit']
    assert local['sourceBytesStable'] is True and local['sourcesBefore'] == local['sourcesAfter']
    assert local['trackedWorkingTreeStatus'] == ''
    for path, digest in local['sourcesAfter'].items():
        assert sha256(git('show', status['correctedCodeCommit'] + ':' + path)).hexdigest() == digest, path
    for item in local['checks']:
        assert item['exitCode'] == 0
        check((HERE / 'final-local-dab4b776' / item['log']).read_bytes(), item)
    spatial = load(HERE / 'spatial-cdp-local/execution-receipt.json')
    assert spatial['classification'] == 'LATENCE_NON_PROUVEE' and spatial['nativeFinalRepetitionsExecuted'] == 0
    for item in spatial['artifacts']:
        archive_path = 'driver.mjs.txt' if item['path'] == 'driver.mjs' else item['path']
        check((HERE / 'spatial-cdp-local' / archive_path).read_bytes(), item)
    historical = load(HERE / 'frozen-context-3a03/receipt.json')
    assert historical['sourceCommit'] == status['observedCiCommit'] and historical['exitCode'] == 0
    check((HERE / 'frozen-context-3a03' / historical['log']).read_bytes(), historical)
    refusal = load(HERE / 'frozen-context-3a03/newer-checkout-context.json')
    assert refusal['expectedRefusal'] is True and refusal['exitCode'] != 0
    assert len(refusal['inputByteChanges']) == 1
    assert refusal['inputByteChanges'][0]['path'] == 'tests/fixtures/skinning-canopy-browser-assets-20261109.json'
    check((HERE / 'frozen-context-3a03' / refusal['log']).read_bytes(), refusal)
    snapshot = load(HERE / 'final-ci-snapshot-3a03/commit-3a03ca99-final-workflows.json')
    assert snapshot['sourceCommit'] == status['observedCiCommit']
    assert len(snapshot['runs']) == snapshot['workflowCount'] == 19
    assert all(x['status'] == 'completed' for x in snapshot['runs'])
    assert sum(x['conclusion'] == 'success' for x in snapshot['runs']) == snapshot['success'] == 17
    assert sum(x['conclusion'] == 'failure' for x in snapshot['runs']) == snapshot['failure'] == 2
    print(json.dumps({'status': 'PASS_DATED_CI_ANNEX_INTEGRITY', 'files': len(entries), 'bytes': manifest['bytes'], 'preservedFiles': 404, 'originalWorkbooks': 108, 'zipMembers': zipped_members, 'observedCi': '3a03:17SUCCESS/2FAILURE', 'correctedCodeCommit': status['correctedCodeCommit'], 'newHeadCiStatus': 'EN_ATTENTE', 'spatialLatencyStatus': 'NON_PROUVEE', 'browserExecutedByVerifier': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
