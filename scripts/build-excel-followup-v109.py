#!/usr/bin/env python3
"""Append V109 worksheets while preserving the 85 published V108 sheets."""
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
        raise SystemExit('Usage: build-excel-followup-v109.py [--verify] --request file.json')
    at = args.index('--request')
    payload = json.loads(Path(args[at + 1]).read_text(encoding='utf-8'))
    del args[at:at + 2]
    if payload.get('baseline') != {'path': 'docs/YAUTJA_V108_SUIVI.xlsx', 'sha256': '2a9490d4e37ff63405039f4f7e7b8c473373f15f83414ca5ff46e142ca5cdaba'}:
        raise ValueError('The V109 profile requires the exact published V108 workbook')
    payload = {**payload, 'release': 'V109', 'summary': 'SyntheseV109', 'historicalCount': 85, 'zipDate': [2026, 10, 25, 0, 0, 0],
               'appendedSheets': ['SyntheseV109', 'ChantiersV109', 'FamillesV109', 'ManquantsV109', 'PitV109', 'HomeworldV109', 'ClansV109', 'PreserveV109', 'ArtV109', 'SourcesV109', 'ValidationsV109', 'JournalV109']}
    if args == ['--verify']:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit('Unsupported V109 writer arguments')
