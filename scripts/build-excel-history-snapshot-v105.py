#!/usr/bin/env python3
"""Build the bounded historical source fixture; Git is used only by this authoring tool."""
import argparse
import base64
import gzip
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = '8eaae97b8511ed6b93183729f201af7eb844f830'
MANIFEST = 'tests/fixtures/excel-history-v104-v105.json'
ARCHIVE = 'tests/fixtures/excel-history-v104-v105.json.gz'
PRODUCTS = {
    'V99': ['docs/v99-workstreams.json', 'docs/YAUTJA_V99_SUIVI.xlsx'],
    'V100': ['docs/v100-workstreams.json', 'docs/YAUTJA_V100_SUIVI.xlsx', 'docs/v100-excel-followup-qa.json'],
    'V104': ['docs/v104-workstreams.json', 'docs/YAUTJA_V104_SUIVI.xlsx', 'docs/v104-excel-followup-qa.json'],
}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def git_bytes(path):
    return subprocess.check_output(['git', 'show', COMMIT + ':' + path], cwd=ROOT)

def build():
    inputs = set()
    shared_hashes = {}
    product_rows = {}
    for release, products in PRODUCTS.items():
        snapshot = json.loads(git_bytes(products[0]))
        for item in snapshot['inputs']:
            inputs.add(item['path'])
            # Imported JSON must be a private copy: esbuild canonicalizes symlinks
            # and would otherwise record an external path in its input manifest.
            public_asset = item['path'].startswith('public/') and not item['path'].endswith('/manifest.json')
            if public_asset or item['path'].endswith(('.xlsx', '.gz')):
                previous = shared_hashes.setdefault(item['path'], item['sha256'])
                if previous != item['sha256']:
                    raise ValueError('Historical asset changed between releases: ' + item['path'])
        product_rows[release] = []
        for path in products:
            content = git_bytes(path)
            row = {'path': path, 'sha256': digest(content), 'bytes': len(content)}
            product_rows[release].append(row)
            shared_hashes[path] = row['sha256']
            inputs.add(path)
    inputs.update(['tests/excel-followup-v100.test.mjs', 'tests/excel-followup-v104.test.mjs'])
    sources, shared, archived = [], [], []
    for path in sorted(inputs):
        if path.startswith('/') or '..' in pathlib.PurePosixPath(path).parts:
            raise ValueError('Unsafe historical path: ' + path)
        if path in shared_hashes:
            content = (ROOT / path).read_bytes()
            if digest(content) != shared_hashes[path]:
                raise ValueError('Shared historical asset/product changed: ' + path)
            shared.append({'path': path, 'sha256': shared_hashes[path], 'bytes': len(content)})
        else:
            content = git_bytes(path)
            row = {'path': path, 'sha256': digest(content), 'bytes': len(content)}
            sources.append(row)
            archived.append({**row, 'base64': base64.b64encode(content).decode('ascii')})
    payload = json.dumps({'schemaVersion': 1, 'sourceCommit': COMMIT, 'files': archived}, separators=(',', ':'), ensure_ascii=False).encode()
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    manifest = {
        'schemaVersion': 1, 'sourceCommit': COMMIT,
        'scope': 'Original V99/V100/V104 collectors and their bounded input closure at merged V104. Shared assets and historical products must retain their hashes; no current runtime is substituted.',
        'archive': {'path': ARCHIVE, 'sha256': digest(compressed), 'bytes': len(compressed), 'uncompressedBytes': len(payload)},
        'sources': sources, 'shared': shared, 'products': product_rows,
    }
    return compressed, (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build()
    for path, content in [(ARCHIVE, archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / path).read_bytes() != content:
                raise ValueError('Historical fixture differs from pinned Git commit: ' + path)
        else:
            (ROOT / path).write_bytes(content)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'check': args.check}))
