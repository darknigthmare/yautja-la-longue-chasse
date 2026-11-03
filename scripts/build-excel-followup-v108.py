#!/usr/bin/env python3
"""Append V108 worksheets while preserving the 73 published V107 sheets."""
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
        raise SystemExit('Usage: build-excel-followup-v108.py [--verify] --request file.json')
    at = args.index('--request')
    payload = json.loads(Path(args[at + 1]).read_text(encoding='utf-8'))
    del args[at:at + 2]
    if payload.get('baseline') != {'path': 'docs/YAUTJA_V107_SUIVI.xlsx', 'sha256': 'a9a2419702387868f6f54efd068008422609bc880b58e9a85c35a51e5fdfb66d'}:
        raise ValueError('The V108 profile requires the exact published V107 workbook')
    payload = {**payload, 'release': 'V108', 'summary': 'SyntheseV108', 'historicalCount': 73, 'zipDate': [2026, 10, 24, 0, 0, 0],
               'appendedSheets': ['SyntheseV108', 'ChantiersV108', 'FamillesV108', 'ManquantsV108', 'PitV108', 'HomeworldV108', 'ClansV108', 'PreserveV108', 'ArtV108', 'SourcesV108', 'ValidationsV108', 'JournalV108']}
    if args == ['--verify']:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit('Unsupported V108 writer arguments')
