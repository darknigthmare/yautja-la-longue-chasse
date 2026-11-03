#!/usr/bin/env python3
"""Preserve the published V112 Homeworld/Pit application, generator and its 22 original test files.

V112 certified its runtime by fingerprinting 1 563 working-tree files
(docs/v112-runtime-freeze.json). Later merged work (V113 materials, planets
V124-V155, the PR #25 guidance repair) legitimately changed 41 of them, so the
V112 publication can no longer be verified against the current tree. This
builder captures the exact commit where every V112 proof holds (a5ed39df, zero
mismatch over all 1 813 pinned paths) as a private, read-only capsule, the same
way V112 preserved V111. Nothing here rewrites a published V112 proof.
"""
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
COMMIT = 'a5ed39dfbed118669b2e76402c490b200136a74d'
MANIFEST = 'tests/fixtures/excel-history-v112-homeworld-v113.json'
PRODUCTS = ['docs/v112-homeworld-followup.json', 'docs/YAUTJA_V112_SUIVI.xlsx', 'docs/v112-homeworld-followup-qa.json']
VALIDATIONS = ['docs/v112-homeworld-validation.json', 'docs/v112-pit-validation.json']
EXPECTED_V112_TESTS = 22
EXPECTED_FREEZE_ENTRIES = 1563


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
    tests = sorted(file for file in tracked if file.startswith('tests/') and file.endswith('-v112.test.mjs'))
    assert len(tests) == EXPECTED_V112_TESTS, 'All original V112 Homeworld/Pit test files are required'
    snapshot = json.loads(git_bytes(PRODUCTS[0]))
    freeze = json.loads(git_bytes('docs/v112-runtime-freeze.json'))
    assert snapshot['release'] == 'V112' and len(freeze['entries']) == EXPECTED_FREEZE_ENTRIES
    paths, expected = set(PRODUCTS) | set(VALIDATIONS), {}

    def add(row):
        file = safe(row.get('path', row.get('file')))
        paths.add(file)
        if row.get('sha256'):
            assert expected.setdefault(file, row['sha256']) == row['sha256'], 'Conflicting historical fingerprint: ' + file

    for row in snapshot['inputs'] + freeze['entries']:
        add(row)
    for validation in VALIDATIONS:
        production = json.loads(git_bytes(validation))
        assert production['release'] == 'V112' and production['status'] == 'PASS_CIBLE'
        add(production['sourceFreeze'])
        add(production['rawEvidence'])
        for row in production['captures']:
            add(row)
        assert production['sourceBefore'] == production['sourceAfter'] and production['sourceAfter']
        for row in production['sourceAfter']:
            add(row)
    fixtures = [file for file in tracked if file.startswith('tests/fixtures/')]
    paths.update(fixtures)
    # The original hunt and Homeworld tests bundle public JSON manifests outside
    # the freeze; keep their original bytes so they reach their real assertions.
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
                          set(tests) | set(file for file in paths if file in tracked and not file.startswith(('docs/', 'public/', 'art-source/', 'tests/fixtures/'))))
    paths.update(source_paths)
    shared_paths = sorted(file for file in paths - set(source_paths) if file in tracked)
    tar = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT, '--', *source_paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        original = {item.name: archive.extractfile(item).read() for item in archive.getmembers() if item.isfile()}
    assert set(original) == set(source_paths)

    # Keep the real commit and tree objects so `git ls-tree HEAD` inside the
    # capsule answers for V112, not for the current HEAD. No blob is copied.
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
    changed_shared = []
    for file in shared_paths:
        path = ROOT / file
        digest = expected.get(file) or sha(git_bytes(file))
        if not path.is_file() or sha(path.read_bytes()) != digest:
            changed_shared.append(file)
            continue
        shared.append({'path': file, 'sha256': digest, 'bytes': path.stat().st_size})
    assert not changed_shared, 'Published historical bytes changed: ' + ', '.join(changed_shared[:10])
    inventory = json.loads(git_bytes('docs/v109-runtime-public-inputs.json'))
    materialized = {row['path'] for row in shared if row['path'].endswith('.json')
                    and any(row['path'].startswith(directory + '/') for directory in inventory['sourceDocumentDirectories'])}
    # build-runtime-public-inputs-v112 and snapshot-runtime-v112 walk these
    # directories with Dirent.isFile(), which a symlink fails by design. Keep the
    # 52 inventoried V112 assets and receipts as verified private copies.
    v112_inventory = json.loads(git_bytes('docs/v112-runtime-public-inputs.json'))
    v112_files = {row['path'] for row in v112_inventory['assets'] + v112_inventory['provenance']}
    shared_files = {row['path'] for row in shared}
    assert v112_files <= shared_files, 'V112 inventory file missing from shared evidence: ' + ', '.join(sorted(v112_files - shared_files)[:5])
    materialized = sorted(materialized | v112_files)
    payload = (json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': files}, separators=(',', ':'), ensure_ascii=False)).encode()
    assert len(payload) <= 96 * 1024 * 1024, 'Historical source budget exceeded'
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {'schemaVersion': 1, 'release': 'V112', 'sourceCommit': COMMIT,
                'scope': 'Original published V112 Homeworld/Pit application and generator; the 22 original V112 test files run unchanged against the exact commit where all 1 813 V112 fingerprints hold. Later merged work is not attributed to V112, and this capsule certifies nothing about the current runtime.',
                'archive': {'path': MANIFEST + '.gz', 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
                'sources': sources, 'shared': shared, 'materializedShared': materialized,
                'historicalTests': tests, 'gitObjects': git_objects,
                'historicalGroups': [{'release': 'V112', 'files': tests}],
                'gitTreeSha256': sha(subprocess.check_output(['git', 'ls-tree', '-r', '-z', COMMIT], cwd=ROOT)),
                'generator': {'path': 'scripts/build-homeworld-followup-v112.mjs', 'export': 'generateFollowupV112'},
                'products': {'V112': [row for file in PRODUCTS for row in shared if row['path'] == file]}}
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for file, content in [(MANIFEST + '.gz', archive), (MANIFEST, manifest)]:
        if args.check:
            assert (ROOT / file).read_bytes() == content, 'Historical V112 capsule differs from its certified commit: ' + file
        else:
            (ROOT / file).write_bytes(content)
    value = json.loads(manifest)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest),
                      'sources': len(value['sources']), 'shared': len(value['shared']),
                      'originalTestFiles': len(value['historicalTests'])}))
