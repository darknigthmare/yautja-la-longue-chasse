#!/usr/bin/env python3
"""Freeze the exact certified V110 sources for isolated historical execution."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).with_name('lib')))
from build_excel_homeworld_history_snapshot_v111 import build_snapshot

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '59bcc32929b1d3f6ee6e967da8cab8c561ca6f1d'
MANIFEST = 'tests/fixtures/excel-history-v110-homeworld-v111.json'
PRODUCTS = ['docs/v110-workstreams.json', 'docs/YAUTJA_V110_SUIVI.xlsx', 'docs/v110-excel-followup-qa.json']

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build_snapshot(ROOT, commit=COMMIT, release='V110', manifest_path=MANIFEST,
                                       products=PRODUCTS, expected_test_files=8, expected_assertions=56)
    # Original V109 review discovery retained by nested contexts discovers review documents with Dirent.isFile(). Keep these small
    # JSON files as private copies, so symlinks cannot silently empty that scan.
    # Native PNGs stay shared and fingerprinted; none are duplicated here.
    inventory = json.loads(subprocess.check_output(['git', 'show', COMMIT + ':docs/v109-runtime-public-inputs.json'], cwd=ROOT))
    value = json.loads(manifest)
    directories = inventory['sourceDocumentDirectories']
    value['materializedShared'] = sorted(row['path'] for row in value['shared']
                                         if any(row['path'].startswith(directory + '/') for directory in directories))
    if not value['materializedShared'] or any(not file.endswith('.json') for file in value['materializedShared']):
        raise ValueError('Original native review directories must contain only JSON documents')
    manifest = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    for file, content in [(MANIFEST + '.gz', archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / file).read_bytes() != content:
                raise ValueError('History differs from certified V110 commit: ' + file)
        else:
            (ROOT / file).write_bytes(content)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'check': args.check}))
