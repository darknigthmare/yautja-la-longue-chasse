#!/usr/bin/env python3
"""Author a bounded V106 history capsule. Git is never needed by its CI reader."""
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
COMMIT = '92e7c824fd80d6b8152855b3d66560448f8c48c0'
MANIFEST = 'tests/fixtures/excel-history-v106-v107.json'
ARCHIVE = MANIFEST + '.gz'
PRODUCTS = ['docs/v106-workstreams.json', 'docs/YAUTJA_V106_SUIVI.xlsx', 'docs/v106-excel-followup-qa.json']

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git_bytes(path):
    return subprocess.check_output(['git', 'show', COMMIT + ':' + path], cwd=ROOT)

def safe(path):
    if not isinstance(path, str) or not path or '\\' in path or '\0' in path or PurePosixPath(path).is_absolute() or any(p in ('', '.', '..') for p in path.split('/')):
        raise ValueError('Unsafe history path: ' + str(path))
    return path

def build():
    snapshot = json.loads(git_bytes(PRODUCTS[0]))
    freeze = json.loads(git_bytes('docs/v106-runtime-freeze.json'))
    proof = json.loads(git_bytes('docs/v106-validation-summary.json'))
    expected = {}
    paths = set()
    def add(row):
        file = safe(row.get('path', row.get('file')))
        paths.add(file)
        if row.get('sha256'):
            previous = expected.setdefault(file, row['sha256'])
            if previous != row['sha256']:
                raise ValueError('Conflicting historic fingerprint: ' + file)
    for row in snapshot['inputs'] + freeze['entries']:
        add(row)
    add(proof['sourceFreeze'])
    for item in proof['production']:
        add(item['report'])
        for row in item['portableFiles']:
            add(row)
    for row in proof['integration']['evidence']:
        add(row)
    # Browser recipes observe bounded scripts and legacy public images beyond
    # the native BODY inventory. Preserve every actually observed source too.
    for item in proof['production']:
        report = json.loads(git_bytes(item['report']['path']))
        before = report.get('sourceBefore', report.get('production', {}).get('sourceBefore'))
        after = report.get('sourceAfter', report.get('production', {}).get('sourceAfter'))
        if not before or before != after:
            raise ValueError('Unstable original production sources: ' + item['domain'])
        for row in after:
            add(row)
    paths.update(PRODUCTS + [
        'docs/v106-validation-summary.json', 'scripts/snapshot-runtime-v106.mjs',
        'scripts/build-excel-followup-v99.mjs', 'scripts/collect-v106-runtime-inputs.mjs',
        'tests/excel-followup-v106.test.mjs', 'tests/production-proofs-v106.test.mjs',
    ])
    # JSON imported by esbuild must retain a private real path. Public binary
    # assets and published evidence/products remain shared only with SHA checks.
    source_paths = sorted(file for file in paths if not file.startswith('docs/') and (not file.startswith('public/') or file.endswith('.json')))
    shared_paths = sorted(paths - set(source_paths))
    tar = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT, '--', *source_paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        original = {item.name: archive.extractfile(item).read() for item in archive.getmembers() if item.isfile()}
    if set(original) != set(source_paths):
        raise ValueError('Git archive closure mismatch')
    sources, files, shared = [], [], []
    for file in source_paths:
        data = original[file]
        row = {'path': file, 'sha256': sha(data), 'bytes': len(data)}
        if file in expected and expected[file] != row['sha256']:
            raise ValueError('Source does not match V106 freeze: ' + file)
        sources.append(row)
        files.append({**row, 'base64': base64.b64encode(data).decode('ascii')})
    products = []
    for file in shared_paths:
        data = (ROOT / file).read_bytes()
        digest = expected.get(file)
        if digest is None:
            digest = sha(git_bytes(file))
        if sha(data) != digest:
            raise ValueError('Published V106 evidence/input changed: ' + file)
        row = {'path': file, 'sha256': digest, 'bytes': len(data)}
        shared.append(row)
        if file in PRODUCTS:
            products.append(row)
    products.sort(key=lambda row: PRODUCTS.index(row['path']))
    payload = json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': files}, separators=(',', ':'), ensure_ascii=False).encode()
    if len(payload) > 80 * 1024 * 1024:
        raise ValueError('V106 history payload exceeds its explicit source budget')
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {
        'schemaVersion': 1, 'sourceCommit': COMMIT,
        'scope': 'Original V106 collectors plus all application sources from its 963-entry production freeze. Published proofs, public binary assets and historic products are shared with before/after hashes. Current game imports remain on V107.',
        'archive': {'path': ARCHIVE, 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
        'sources': sources, 'shared': shared, 'products': {'V106': products},
    }
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for path, content in [(ARCHIVE, archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / path).read_bytes() != content:
                raise ValueError('History differs from original V106 commit: ' + path)
        else:
            (ROOT / path).write_bytes(content)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'check': args.check}))
