#!/usr/bin/env python3
"""Capture PR15's exact reviewed state as a bounded overlay; CI uses no Git."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'd99604e18d4b185b57cc59cfbde0420b95acd0fd'
BASE_COMMIT = '92e7c824fd80d6b8152855b3d66560448f8c48c0'
BASE_MANIFEST = 'tests/fixtures/excel-history-v106-v107.json'
BASE_SHA = '5461c2282b2efc3306d53a802f47dd0c245e1bc1b8062c4efa6fa72b90776d3a'
MANIFEST = 'tests/fixtures/production-history-pr15-v107.json'
ARCHIVE = MANIFEST + '.gz'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(path):
    return subprocess.check_output(['git', 'show', COMMIT + ':' + path], cwd=ROOT)

def build():
    base_bytes = (ROOT / BASE_MANIFEST).read_bytes()
    if sha(base_bytes) != BASE_SHA:
        raise ValueError('The V106 base history must remain byte-exact')
    base = json.loads(base_bytes)
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', COMMIT], cwd=ROOT).decode().splitlines()
    sources = set([
        'app/game/RecentSpriteLibraryV85.tsx', 'app/game/systems/recentSpriteLibraryV85.ts',
        'app/game/data/enforcerProductionV614.json', 'app/game/data/npcProductionV615.json',
        'scripts/historical-runtime-context-v614.mjs', 'scripts/historical-runtime-context-v615.mjs',
        'tests/fixtures/runtime-history-v106-v614.json', 'tests/fixtures/runtime-history-v106-v615.json',
        'tests/production-proofs-v106.test.mjs', 'tests/enforcer-production-v613.test.mjs',
        'tests/enforcer-production-v614.test.mjs', 'tests/npc-production-v615.test.mjs',
        'tests/helpers/homeworld-scene-ssr-v78.mjs',
    ])
    # Preserve generation/review tools as authored, including the exact UTF-8 fix.
    sources.update(file for file in names if file.startswith('scripts/') and ('v614.' in file or 'v615.' in file))
    shared = set(file for file in names if file.startswith(('docs/suivi-production/v614/', 'docs/suivi-production/v615/')))
    shared.update('docs/suivi-production/v613/' + file for file in [
        'data/production-manifest.json', 'data/current-master.json.gz', 'references/production-plan-v613.json',
        'data/main-reconciliation.json', 'recovery/native-checkpoint.json', 'recovery/verified-native-files.json',
        'data/default-selections-before.json',
    ])
    for version in ['v611', 'v612', 'v613', 'v614', 'v615']:
        manifest_path = 'docs/suivi-production/' + version + '/data/production-manifest.json'
        shared.add(manifest_path)
        shared.update(row['repoPngPath'] for row in json.loads(git(manifest_path))['assets'])
    shared.add('docs/suivi-production/v612/data/current-master.json.gz')
    book_index = json.loads(git('docs/suivi-production/v615/data/base-workbooks.json'))
    shared.update(row['repoPath'] for row in book_index['workbooks'])
    shared = shared - {row['path'] for row in base['shared']}
    paths = sorted(sources | shared)
    raw = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT, '--', *paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(raw)) as tar:
        files = {row.name: tar.extractfile(row).read() for row in tar.getmembers() if row.isfile()}
    if set(paths) != set(files):
        raise ValueError('PR15 capture path closure differs from Git')
    source_rows, archive_rows, shared_rows = [], [], []
    for file in paths:
        data = files[file]
        row = {'path': file, 'sha256': sha(data), 'bytes': len(data)}
        if file in sources:
            source_rows.append(row)
            archive_rows.append({**row, 'base64': base64.b64encode(data).decode('ascii')})
        else:
            shared_rows.append(row)
    # Verify that every inherited source outside the four reviewed app changes
    # really is identical at the external commit, not merely assumed compatible.
    inherited = {row['path']: row for row in base['sources'] if row['path'] not in sources}
    tree = subprocess.check_output(['git', 'ls-tree', '-r', COMMIT], cwd=ROOT).decode().splitlines()
    blobs = {line.split('\t', 1)[1]: line.split()[2] for line in tree if '\t' in line}
    base_payload = json.loads(gzip.decompress((ROOT / base['archive']['path']).read_bytes()))
    for row in base_payload['files']:
        if row['path'] in inherited:
            data = base64.b64decode(row['base64'])
            blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
            if blobs.get(row['path']) != blob:
                raise ValueError('Uncaptured change from V106 to PR15: ' + row['path'])
    payload = json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': archive_rows}, ensure_ascii=False, separators=(',', ':')).encode()
    if len(payload) > 12 * 1024 * 1024:
        raise ValueError('PR15 private overlay exceeds its explicit budget')
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {
        'schemaVersion': 1, 'sourceCommit': COMMIT, 'baseCommit': BASE_COMMIT,
        'scope': 'Exact historical PR15 state. Its original production/delta/static asset assertions remain unchanged, executed in a separate private source root. This grants no V107 runtime coverage.',
        'base': {'path': BASE_MANIFEST, 'sha256': BASE_SHA},
        'archive': {'path': ARCHIVE, 'sha256': sha(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
        'sources': source_rows, 'shared': shared_rows,
        'historicalTests': ['tests/production-proofs-v106.test.mjs', 'tests/enforcer-production-v613.test.mjs', 'tests/enforcer-production-v614.test.mjs', 'tests/npc-production-v615.test.mjs'],
        'originalWorkbooksPreserved': book_index['workbooks'],
    }
    return compressed, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for file, data in [(ARCHIVE, archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / file).read_bytes() != data:
                raise ValueError('PR15 capsule changed: ' + file)
        else:
            (ROOT / file).write_bytes(data)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'archiveSha256': sha(archive), 'manifestSha256': sha(manifest), 'check': args.check}))
