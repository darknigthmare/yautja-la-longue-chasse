#!/usr/bin/env python3
"""Append V112 to the exact 113-sheet V111 workbook; never rebuild its history."""
import importlib.util
import io
import json
from pathlib import Path
import sys
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('versioned_excel_append', Path(__file__).with_name('lib') / 'excel_followup_append.py')
append = importlib.util.module_from_spec(spec)
spec.loader.exec_module(append)
BASELINE = {'path': 'docs/YAUTJA_V111_SUIVI.xlsx', 'sha256': 'fa5ebf78a08c36b4a567246dfae41de535a8e36c7294ba33190e3e1e2ec9ad05'}
SHEETS = ['SyntheseV112', 'ChantiersV112', 'PrioritesV112', 'HomeworldV112', 'ManquantsSourceV112', 'CatalogueArtV112', 'SourcesV112', 'ValidationsV112', 'JournalV112']

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--request' not in args:
        raise SystemExit('Usage: build-homeworld-followup-v112.py [--verify] --request file.json')
    at = args.index('--request')
    payload = json.loads(Path(args[at + 1]).read_text(encoding='utf-8'))
    del args[at:at + 2]
    if payload.get('baseline') != BASELINE:
        raise ValueError('The V112 profile requires the exact certified V111 workbook')
    payload = {**payload, 'release': 'V112', 'summary': 'SyntheseV112', 'historicalCount': 113,
               'zipDate': [2026, 10, 28, 0, 0, 0], 'appendedSheets': SHEETS}
    if args == ['--verify']:
        # Report a precise content failure before the generic structure checks.
        # Tests can prove a cell-text-only mutation is caught without relying
        # on a malformed XML document or a broad subprocess-error assertion.
        with ZipFile(io.BytesIO(append.baseline_bytes(payload))) as original, ZipFile(payload['workbookPath']) as extended:
            for name in original.namelist():
                if name not in append.ASSEMBLY_PARTS and original.read(name) != extended.read(name):
                    raise ValueError('Historical workbook ZIP part changed: ' + name)
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit('Unsupported V112 writer arguments')
