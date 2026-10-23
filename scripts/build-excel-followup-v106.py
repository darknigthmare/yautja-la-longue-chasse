#!/usr/bin/env python3
"""Append V106 sheets without rebuilding any of the 49 historical sheets."""
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
        raise SystemExit("Usage: build-excel-followup-v106.py [--verify] --request file.json")
    at = args.index("--request")
    payload = json.loads(Path(args[at + 1]).read_text(encoding="utf-8")); del args[at:at + 2]
    if payload.get("baseline") != {"path": "docs/YAUTJA_V105_SUIVI.xlsx", "sha256": "b0a317b339736d44bcf5b7dc11708749091740e2d9636e67beaa7751118f10bc"}:
        raise ValueError("The V106 profile requires the frozen V105 workbook and its exact SHA-256")
    payload = {**payload, "release": "V106", "summary": "SyntheseV106", "historicalCount": 49, "zipDate": [2026, 10, 23, 0, 0, 0],
               "appendedSheets": ["SyntheseV106", "ChantiersV106", "ActionsV106", "ClipsV106", "MotionsV106", "HomeworldV106", "ClansV106", "ManquantsV106", "SourcesV106", "ValidationsV106", "JournalV106"]}
    if args == ["--verify"]:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit("Unsupported V106 writer arguments")
