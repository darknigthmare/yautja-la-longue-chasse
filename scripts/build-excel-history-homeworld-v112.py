#!/usr/bin/env python3
"""Preserve the V111 generator, its 125 assertions and seven original V90 ecotone assertions."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'def899ad07fea582053c5c204e4e578d8e0d7f9b'
MANIFEST = 'tests/fixtures/excel-history-v111-homeworld-v112.json'
PRODUCTS = ['docs/v111-homeworld-followup.json', 'docs/YAUTJA_V111_SUIVI.xlsx', 'docs/v111-homeworld-followup-qa.json']
V90_TEST = 'tests/homeworld-ecotones-v90.test.mjs'
V90_SHA = '95b3f0da59550328dad9c4aab926de9462d2eb74b654f84791b7d7c617079c81'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    def safe(file):
        assert isinstance(file, str) and file and '\\' not in file and '\0' not in file
        assert not PurePosixPath(file).is_absolute() and all(p not in ('', '.', '..') for p in file.split('/'))
        return file

    def git_bytes(file):
        return subprocess.check_output(['git', 'show', COMMIT + ':' + safe(file)], cwd=ROOT)

    tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', COMMIT], cwd=ROOT, text=True).splitlines()
    v111_tests = sorted(file for file in tracked if file.startswith('tests/') and file.endswith('-v111.test.mjs'))
    assert len(v111_tests) == 16, 'All sixteen original V111 test files are required'
    assert sha(git_bytes(V90_TEST)) == V90_SHA, 'The seven original V90 assertions must be byte-exact'
    tests = sorted(v111_tests + [V90_TEST])
    snapshot = json.loads(git_bytes(PRODUCTS[0]))
    freeze = json.loads(git_bytes('docs/v111-runtime-freeze.json'))
    production = json.loads(git_bytes('docs/v111-homeworld-validation.json'))
    assert snapshot['release'] == production['release'] == 'V111' and production['status'] == 'PASS_CIBLE'
    assert len(freeze['entries']) == 1433
    paths, expected = set(PRODUCTS), {}

    def add(row):
        file = safe(row.get('path', row.get('file')))
        paths.add(file)
        if row.get('sha256'):
            assert expected.setdefault(file, row['sha256']) == row['sha256'], 'Conflicting historical fingerprint: ' + file

    # The original V111 generator deliberately accepts absent historical image
    # bytes after binding their recorded blob OIDs to the real Git tree. Keep
    # that bounded identity fallback; do not turn 790 optional census images
    # into mandatory downloads for a sparse CI checkout.
    for row in snapshot['inputs'] + freeze['entries']:
        add(row)
    paths.add('docs/v111-homeworld-validation.json')
    add(production['sourceFreeze'])
    add(production['rawEvidence'])
    for row in production['captures']:
        add(row)
    assert production['sourceBefore'] == production['sourceAfter'] and production['sourceAfter']
    for row in production['sourceAfter']:
        add(row)
    fixtures = [file for file in tracked if file.startswith('tests/fixtures/')]
    paths.update(fixtures)
    # HuntCanvas's original V111 tests bundle several public JSON manifests
    # outside the Homeworld freeze. Preserve their original bytes as well;
    # otherwise the hunt tests would never reach their 34 original assertions.
    paths.update(file for file in tracked if file.startswith('public/') and file.endswith('.json'))
    paths.add('public/game/homeworld/v75/landscape-ground-materials-native.png')
    for file in fixtures:
        if not file.endswith('.json'):
            continue
        nested = json.loads(git_bytes(file))
        if isinstance(nested, dict) and isinstance(nested.get('shared'), list) and isinstance(nested.get('archive'), dict):
            add(nested['archive'])
            for row in nested['shared']:
                add(row)
    source_paths = sorted(set(file for file in tracked if file.startswith(('app/', 'scripts/', 'tests/helpers/', 'tests/browser/'))) |
                          set(tests) | set(file for file in paths if not file.startswith(('docs/', 'public/', 'art-source/', 'tests/fixtures/'))))
    paths.update(source_paths)
    shared_paths = sorted(paths - set(source_paths))
    tar = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT, '--', *source_paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        original = {item.name: archive.extractfile(item).read() for item in archive.getmembers() if item.isfile()}
    assert set(original) == set(source_paths)

    # V111 checks historical art through `git ls-tree HEAD`. Preserve the real
    # commit and every real tree object instead of redirecting it to V112 HEAD.
    # No blob data or original repository configuration is copied. Git reads
    # these immutable object bytes; no command writes to the user's repository.
    tree = subprocess.check_output(['git', 'show', '-s', '--format=%T', COMMIT], cwd=ROOT, text=True).strip()
    tree_rows = subprocess.check_output(['git', 'ls-tree', '-r', '-d', COMMIT], cwd=ROOT, text=True).splitlines()
    object_ids = [COMMIT] + sorted({tree} | {row.split()[2] for row in tree_rows})
    batch = subprocess.check_output(['git', 'cat-file', '--batch'], cwd=ROOT, input=('\n'.join(object_ids) + '\n').encode())
    at, git_objects = 0, []
    for oid in object_ids:
        end = batch.index(b'\n', at)
        header = batch[at:end].decode().split()
        assert header[0] == oid and header[1] in ('commit', 'tree')
        size = int(header[2]); data = batch[end + 1:end + 1 + size]
        at = end + 2 + size
        raw = header[1].encode() + b' ' + str(size).encode() + b'\0' + data
        assert hashlib.sha1(raw).hexdigest() == oid
        file = '.git/objects/' + oid[:2] + '/' + oid[2:]
        original[file] = zlib.compress(raw, 9)
        git_objects.append({'oid': oid, 'type': header[1], 'path': file})
    assert at == len(batch)
    original.update({'.git/HEAD': (COMMIT + '\n').encode(), '.git/refs/.keep': b'',
                     '.git/config': b'[core]\nrepositoryformatversion = 0\nbare = false\n'})
    sources, files, shared = [], [], []
    for file in sorted(original):
        data = original[file]
        row = {'path': file, 'sha256': sha(data), 'bytes': len(data)}
        assert file not in expected or expected[file] == row['sha256'], 'Source differs from original certificate: ' + file
        sources.append(row)
        files.append({**row, 'base64': base64.b64encode(data).decode()})
    for file in shared_paths:
        data = (ROOT / file).read_bytes()
        digest = expected.get(file) or sha(git_bytes(file))
        assert sha(data) == digest, 'Published historical bytes changed: ' + file
        shared.append({'path': file, 'sha256': digest, 'bytes': len(data)})
    inventory = json.loads(git_bytes('docs/v109-runtime-public-inputs.json'))
    materialized = sorted(row['path'] for row in shared if any(row['path'].startswith(directory + '/') for directory in inventory['sourceDocumentDirectories']))
    assert len(materialized) == 45 and all(file.endswith('.json') for file in materialized)
    payload = (json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': files}, separators=(',', ':'), ensure_ascii=False)).encode()
    assert len(payload) <= 96 * 1024 * 1024, 'Historical source budget exceeded'
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {'schemaVersion': 1, 'release': 'V111', 'sourceCommit': COMMIT,
                'scope': 'Original V111 application and generator; sixteen V111 test files retain all 125 assertions, and the original V90 ecotone file retains its seven assertions. The private real Git tree supports the historical art identity census. No current-runtime certification.',
                'archive': {'path': MANIFEST + '.gz', 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
                'sources': sources, 'shared': shared, 'materializedShared': materialized,
                'historicalTests': tests, 'expectedAssertions': 132, 'gitObjects': git_objects,
                'historicalGroups': [{'release': 'V111', 'files': v111_tests, 'assertions': 125},
                                     {'release': 'V90-ECOTONES', 'files': [V90_TEST], 'assertions': 7}],
                'gitTreeSha256': sha(subprocess.check_output(['git', 'ls-tree', '-r', '-z', COMMIT], cwd=ROOT)),
                'generator': {'path': 'scripts/build-homeworld-followup-v111.mjs', 'export': 'generateFollowupV111'},
                'products': {'V111': [row for file in PRODUCTS for row in shared if row['path'] == file]}}
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for file, content in [(MANIFEST + '.gz', archive), (MANIFEST, manifest)]:
        if args.check:
            assert (ROOT / file).read_bytes() == content, 'Historical V111 capsule differs from certified commit: ' + file
        else:
            (ROOT / file).write_bytes(content)
    value = json.loads(manifest)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'sources': len(value['sources']), 'shared': len(value['shared']), 'originalTestFiles': len(value['historicalTests']), 'originalAssertions': value['expectedAssertions'], 'privateGitObjects': len(value['gitObjects']), 'check': args.check}))
