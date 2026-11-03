#!/usr/bin/env python3
"""Append V111 sheets to the exact certified V110 workbook; never regenerate it."""
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
        raise SystemExit('Usage: build-homeworld-followup-v111.py [--verify] --request file.json')
    at = args.index('--request')
    payload = json.loads(Path(args[at + 1]).read_text(encoding='utf-8'))
    del args[at:at + 2]
    if payload.get('baseline') != {'path': 'docs/YAUTJA_V110_SUIVI.xlsx', 'sha256': '0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c'}:
        raise ValueError('The V111 profile requires the exact certified V110 workbook')
    payload = {**payload, 'release': 'V111', 'summary': 'SyntheseV111', 'historicalCount': 105, 'zipDate': [2026, 10, 26, 0, 0, 0],
               'appendedSheets': ['SyntheseV111', 'ChantiersV111', 'HomeworldV111', 'ManquantsSourceV111', 'CatalogueArtV111', 'SourcesV111', 'ValidationsV111', 'JournalV111']}
    if args == ['--verify']:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit('Unsupported V111 writer arguments')
