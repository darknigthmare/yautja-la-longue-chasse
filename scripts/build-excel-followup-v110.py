#!/usr/bin/env python3
"""Append V110 sheets to the exact certified V109 workbook; never regenerate it."""
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('versioned_excel_append', Path(__file__).with_name('lib') / 'excel_followup_append.py')
append = importlib.util.module_from_spec(spec)
spec.loader.exec_module(append)

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--request' not in args:
        raise SystemExit('Usage: build-excel-followup-v110.py [--verify] --request file.json')
    at = args.index('--request')
    payload = json.loads(Path(args[at + 1]).read_text(encoding='utf-8'))
    del args[at:at + 2]
    if payload.get('baseline') != {'path': 'docs/YAUTJA_V109_SUIVI.xlsx', 'sha256': 'e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f'}:
        raise ValueError('The V110 profile requires the exact certified V109 workbook')
    payload = {**payload, 'release': 'V110', 'summary': 'SyntheseV110', 'historicalCount': 97, 'zipDate': [2026, 10, 26, 0, 0, 0],
               'appendedSheets': ['SyntheseV110', 'ChantiersV110', 'HomeworldV110', 'ManquantsSourceV110', 'CatalogueArtV110', 'SourcesV110', 'ValidationsV110', 'JournalV110']}
    if args == ['--verify']:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit('Unsupported V110 writer arguments')
