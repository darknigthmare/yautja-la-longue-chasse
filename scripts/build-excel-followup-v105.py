#!/usr/bin/env python3
"""Append the V105 follow-up to the explicitly pinned V104 workbook."""
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("versioned_excel_append", Path(__file__).with_name("lib") / "excel_followup_append.py")
append = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(append)

if __name__ == "__main__":
    args = sys.argv[1:]
    if "--request" not in args:
        raise SystemExit("Usage: build-excel-followup-v105.py [--verify] --request file.json")
    at = args.index("--request")
    payload = json.loads(Path(args[at + 1]).read_text(encoding="utf-8")); del args[at:at + 2]
    if payload.get("baseline") != {"path": "docs/YAUTJA_V104_SUIVI.xlsx", "sha256": "ce78bac96ae57cbee732bc868acecd46b0dc57e5ade49f669fb15c8b12ea03aa"}:
        raise ValueError("The V105 profile requires the frozen V104 workbook and its exact SHA-256")
    payload = {**payload, "release": "V105", "summary": "SyntheseV105", "historicalCount": 39, "zipDate": [2026, 10, 23, 0, 0, 0],
               "appendedSheets": ["SyntheseV105", "ChantiersV105", "ActionsV105", "ClipsV105", "HomeworldV105", "ClansV105", "ManquantsV105", "SourcesV105", "ValidationsV105", "JournalV105"]}
    if args == ["--verify"]:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit("Unsupported V105 writer arguments")
