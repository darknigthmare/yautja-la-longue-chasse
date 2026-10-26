#!/usr/bin/env python3
"""Freeze the exact published V108 sources for explicit historical commands."""
import argparse
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).with_name('lib')))
from build_excel_history_snapshot import build_snapshot

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '2d88854b44c7cac14063f4445b8e0855646e7dec'
MANIFEST = 'tests/fixtures/excel-history-v108-v109.json'
PRODUCTS = ['docs/v108-workstreams.json', 'docs/YAUTJA_V108_SUIVI.xlsx', 'docs/v108-excel-followup-qa.json']

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive, manifest = build_snapshot(ROOT, commit=COMMIT, release='V108', manifest_path=MANIFEST, products=PRODUCTS, expected_test_files=10, expected_assertions=75,
                                       contained_evidence_manifests=['docs/qa/v108-production-evidence/v107-enforcer-poses-input.json', 'docs/qa/v108-production-evidence/v614-input.json'])
    for file, content in [(MANIFEST + '.gz', archive), (MANIFEST, manifest)]:
        if args.check:
            if (ROOT / file).read_bytes() != content:
                raise ValueError('History differs from the published V108 commit: ' + file)
        else:
            (ROOT / file).write_bytes(content)
    print(json.dumps({'sourceCommit': COMMIT, 'archiveBytes': len(archive), 'manifestBytes': len(manifest), 'check': args.check}))
