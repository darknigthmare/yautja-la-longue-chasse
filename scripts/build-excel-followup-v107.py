#!/usr/bin/env python3
"""Append V107 sheets without rebuilding any of the 60 historical sheets."""
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
    if payload.get("baseline") != {"path": "docs/YAUTJA_V106_SUIVI.xlsx", "sha256": "1994f345308b91555021b216146652108f25df93067f7398606af774472af04e"}:
        raise ValueError("The V107 profile requires the frozen V106 workbook and its exact SHA-256")
    payload = {**payload, "release": "V107", "summary": "SyntheseV107", "historicalCount": 60, "zipDate": [2026, 10, 23, 0, 0, 0],
               "appendedSheets": ["SyntheseV107", "ChantiersV107", "FamillesV107", "ActionsV107", "CampagnesV107", "VariantesV107", "HomeworldV107", "ClansV107", "PreserveV107", "ManquantsV107", "SourcesV107", "ValidationsV107", "JournalV107"]}
    if args == ["--verify"]:
        json.dump(append.verify_workbook(payload), sys.stdout, ensure_ascii=True)
    elif not args:
        sys.stdout.buffer.write(append.build_workbook(payload))
    else:
        raise SystemExit("Unsupported V107 writer arguments")
