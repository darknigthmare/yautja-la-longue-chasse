#!/usr/bin/env python3
"""Freeze the original V107 sources; readers require no Git or network access."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '887664d308279fbe168cee72a59155a818512107'
MANIFEST = 'tests/fixtures/excel-history-v107-v108.json'
ARCHIVE = MANIFEST + '.gz'
PRODUCTS = ['docs/v107-workstreams.json', 'docs/YAUTJA_V107_SUIVI.xlsx', 'docs/v107-excel-followup-qa.json']

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git_bytes(file):
    return subprocess.check_output(['git', 'show', COMMIT + ':' + file], cwd=ROOT)

def safe(file):
    if not isinstance(file, str) or not file or '\\' in file or '\0' in file or PurePosixPath(file).is_absolute() or any(p in ('', '.', '..') for p in file.split('/')):
        raise ValueError('Unsafe history path: ' + str(file))
    return file

def build():
    tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', COMMIT], cwd=ROOT).decode().splitlines()
    tests = sorted(file for file in tracked if file.startswith('tests/') and file.endswith('-v107.test.mjs'))
    if len(tests) != 17:
        raise ValueError('The original V107 suite must retain all 17 test files')
    snapshot = json.loads(git_bytes(PRODUCTS[0]))
    freeze = json.loads(git_bytes('docs/v107-runtime-freeze.json'))
    proof = json.loads(git_bytes('docs/v107-validation-summary.json'))
    paths, expected = set(PRODUCTS), {}
    def add(row):
        file = safe(row.get('path', row.get('file')))
        paths.add(file)
        if row.get('sha256') and expected.setdefault(file, row['sha256']) != row['sha256']:
            raise ValueError('Conflicting historical fingerprint: ' + file)
    for row in snapshot['inputs'] + freeze['entries']:
        add(row)
    add(proof['sourceFreeze'])
    paths.add('docs/v107-validation-summary.json')
    for item in proof['production']:
        add(item['report'])
        for row in item['portableFiles']:
            add(row)
        report = json.loads(git_bytes(item['report']['path']))
        before = report.get('sourceBefore', report.get('production', {}).get('sourceBefore'))
        after = report.get('sourceAfter', report.get('production', {}).get('sourceAfter'))
        if not before or before != after:
            raise ValueError('Unstable original production sources: ' + item['domain'])
        for row in after:
            add(row)
    # Original adapters recursively verify their own old products. Keep those
    # archives and shared files intact, rather than flattening or rewriting them.
    for file in ['tests/fixtures/excel-history-v106-v107.json', 'tests/fixtures/production-history-pr15-v107.json']:
        manifest = json.loads(git_bytes(file))
        paths.update([file, manifest['archive']['path']])
        for row in manifest['shared']:
            add(row)
    paths.add('docs/suivi-production/v107-enforcer-poses/recovery/native-checkpoint.json')
    for identity in ['augmentes-assassin', 'four-armed']:
        file = 'docs/suivi-production/v107-enforcer-poses/receipts/' + identity + '--enforcers-comics-10.json'
        paths.add(file)
        receipt = json.loads(git_bytes(file))
        for reference in receipt['submittedReferences']:
            add(reference)
    # All application text is needed by the original all-app freeze. Keeping all
    # original scripts makes dynamic collectors and nested adapters byte-exact;
    # no public image is copied into this compressed text-source capsule.
    source_paths = sorted(set(file for file in tracked if file.startswith(('app/', 'scripts/', 'tests/helpers/'))) | set(tests) | set(file for file in paths if not file.startswith(('docs/', 'public/', 'art-source/', 'tests/fixtures/'))))
    paths.update(source_paths)
    paths.update(file for file in tracked if file.startswith('tests/fixtures/'))
    shared_paths = sorted(paths - set(source_paths))
    tar = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT, '--', *source_paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        original = {item.name: archive.extractfile(item).read() for item in archive.getmembers() if item.isfile()}
    if set(original) != set(source_paths):
        raise ValueError('Original source closure differs from Git')
    sources, files, shared = [], [], []
    for file in source_paths:
        data = original[file]
        row = {'path': file, 'sha256': sha(data), 'bytes': len(data)}
        if file in expected and expected[file] != row['sha256']:
            raise ValueError('Source does not match original V107 freeze: ' + file)
        sources.append(row)
        files.append({**row, 'base64': base64.b64encode(data).decode('ascii')})
    for file in shared_paths:
        data = (ROOT / file).read_bytes()
        digest = expected[file] if file in expected else sha(git_bytes(file))
        if sha(data) != digest:
            raise ValueError('Published historical file changed: ' + file)
        shared.append({'path': file, 'sha256': digest, 'bytes': len(data)})
    payload = json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': files}, separators=(',', ':'), ensure_ascii=False).encode()
    if len(payload) > 80 * 1024 * 1024:
        raise ValueError('Original V107 text source budget exceeded')
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {'schemaVersion': 1, 'sourceCommit': COMMIT,
                'scope': 'Original V107 application, scripts and 17 unchanged test files. Public binary assets, published evidence, nested immutable history capsules and workbook products remain shared only after their original hashes pass. Current application imports remain on V108.',
                'archive': {'path': ARCHIVE, 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
                'sources': sources, 'shared': shared, 'historicalTests': tests,
                'products': {'V107': [row for file in PRODUCTS for row in shared if row['path'] == file]}}
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for file, content in [(ARCHIVE, archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / file).read_bytes() != content:
                raise ValueError('History differs from original V107 commit: ' + file)
        else:
            (ROOT / file).write_bytes(content)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'check': args.check}))
