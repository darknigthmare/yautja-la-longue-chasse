"""Versioned V111 snapshot adapter for the single-report V110 certificate.

The original generic historical helper remains byte-exact.
"""
import base64
import gzip
import hashlib
import io
import json
from pathlib import PurePosixPath
import subprocess
import tarfile


def build_snapshot(root, *, commit, release, manifest_path, products, expected_test_files, expected_assertions, contained_evidence_manifests=()):
    def sha(data):
        return hashlib.sha256(data).hexdigest()

    def safe(file):
        if not isinstance(file, str) or not file or '\\' in file or '\0' in file or PurePosixPath(file).is_absolute() or any(p in ('', '.', '..') for p in file.split('/')):
            raise ValueError('Unsafe historical path: ' + str(file))
        return file

    def git_bytes(file):
        return subprocess.check_output(['git', 'show', commit + ':' + safe(file)], cwd=root)

    tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', commit], cwd=root).decode().splitlines()
    tests = sorted(file for file in tracked if file.startswith('tests/') and file.endswith('-' + release.lower() + '.test.mjs'))
    if len(tests) != expected_test_files:
        raise ValueError('Original historical test inventory changed')
    snapshot = json.loads(git_bytes(products[0]))
    freeze = json.loads(git_bytes('docs/' + release.lower() + '-runtime-freeze.json'))
    production_path = 'docs/' + release.lower() + '-homeworld-validation.json'
    production = json.loads(git_bytes(production_path))
    if release != 'V110' or production.get('release') != release or production.get('status') != 'PASS_CIBLE':
        raise ValueError('This versioned adapter requires the certified V110 Homeworld report')
    paths, expected = set(products), {}

    def add(row):
        file = safe(row.get('path', row.get('file')))
        paths.add(file)
        if row.get('sha256') and expected.setdefault(file, row['sha256']) != row['sha256']:
            raise ValueError('Conflicting historical fingerprint: ' + file)

    for row in snapshot['inputs'] + freeze['entries']:
        add(row)
    add(production['sourceFreeze'])
    paths.add(production_path)
    add(production['rawEvidence'])
    for row in production['captures']:
        add(row)
    before, after = production.get('sourceBefore'), production.get('sourceAfter')
    if not before or before != after:
        raise ValueError('Unstable original V110 Homeworld production sources')
    for row in after:
        add(row)
    # Keep nested historical contexts and their immutable shared closure intact.
    # Their private source code remains in the source archive, never redirected
    # to the evolving application in the outer repository.
    fixtures = [file for file in tracked if file.startswith('tests/fixtures/')]
    paths.update(fixtures)
    for file in fixtures:
        if not file.endswith('.json'):
            continue
        nested = json.loads(git_bytes(file))
        if isinstance(nested, dict) and isinstance(nested.get('shared'), list) and isinstance(nested.get('archive'), dict):
            add(nested['archive'])
            for row in nested['shared']:
                add(row)
    source_paths = sorted(set(file for file in tracked if file.startswith(('app/', 'scripts/', 'tests/helpers/', 'tests/browser/'))) | set(tests) | set(file for file in paths if not file.startswith(('docs/', 'public/', 'art-source/', 'tests/fixtures/'))))
    paths.update(source_paths)
    shared_paths = sorted(paths - set(source_paths))
    tar = subprocess.check_output(['git', 'archive', '--format=tar', commit, '--', *source_paths], cwd=root)
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        original = {item.name: archive.extractfile(item).read() for item in archive.getmembers() if item.isfile()}
    if set(original) != set(source_paths):
        raise ValueError('Original source closure differs from Git')
    sources, files, shared = [], [], []
    for file in source_paths:
        data = original[file]
        row = {'path': file, 'sha256': sha(data), 'bytes': len(data)}
        if file in expected and expected[file] != row['sha256']:
            raise ValueError('Source does not match original freeze: ' + file)
        sources.append(row)
        files.append({**row, 'base64': base64.b64encode(data).decode('ascii')})
    for file in shared_paths:
        data = (root / file).read_bytes()
        digest = expected[file] if file in expected else sha(git_bytes(file))
        if sha(data) != digest:
            raise ValueError('Published historical file changed: ' + file)
        shared.append({'path': file, 'sha256': digest, 'bytes': len(data)})
    materialized = set()
    for file in contained_evidence_manifests:
        evidence = json.loads(git_bytes(file))
        for row in evidence['assets']:
            materialized.update([safe(row['receiptPath']), safe(row['pngPath'])])
    if not materialized.issubset(set(shared_paths)):
        raise ValueError('Contained evidence is missing from the verified shared closure')
    payload = json.dumps({'schemaVersion': 1, 'sourceCommit': commit, 'files': files}, separators=(',', ':'), ensure_ascii=False).encode()
    if len(payload) > 96 * 1024 * 1024:
        raise ValueError('Historical text source budget exceeded')
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {'schemaVersion': 1, 'release': release, 'sourceCommit': commit,
                'scope': 'Unmodified original application, scripts and tests from the reviewed release commit. Public assets, workbooks, evidence and nested historical capsules are shared only after exact fingerprint checks. Current game imports remain current.',
                'archive': {'path': manifest_path + '.gz', 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
                'sources': sources, 'shared': shared, 'materializedShared': sorted(materialized), 'historicalTests': tests, 'expectedAssertions': expected_assertions,
                'generator': {'path': 'scripts/build-excel-followup-' + release.lower() + '.mjs', 'export': 'generateFollowup' + release},
                'products': {release: [row for file in products for row in shared if row['path'] == file]}}
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
