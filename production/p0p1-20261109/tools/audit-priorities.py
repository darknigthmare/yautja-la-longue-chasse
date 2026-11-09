#!/usr/bin/env python3
"""Reproduce the read-only112-XLSX scan; no old workbook is written."""
import importlib.util
import json
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
from tracker import LOT, ROOT, protected_sources, read

if sys.argv[1:] != ["--check"]:
    raise SystemExit("Usage: python3 production/p0p1-20261109/tools/audit-priorities.py --check")
history = protected_sources()
spec = importlib.util.spec_from_file_location("historical_read_only_xlsx_decoder", ROOT / "scripts/audit-excel-bible-20261108.py")
decoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(decoder)
seen = set()
priority_rows = 0
workbooks = [x for x in history["files"] if x["path"].endswith(".xlsx")]
for item in workbooks:
    for sheet in decoder.read_workbook(ROOT / item["path"]):
        if sheet["contentSha256"] in seen:
            continue
        seen.add(sheet["contentSha256"])
        priority_rows += sum(any(re.match(r"^P[01](?:\b|\s|[-–—:/])", str(v).strip(), re.I)
                                 for v in row["cells"].values()) for row in sheet["rows"])
actual = {"workbooks": len(workbooks), "uniqueSheetContents": len(seen), "priorityRowsBeforeRowDedup": priority_rows}
expected = read(LOT / "inventory/classeurs.json")["summary"]
if any(actual[k] != expected[k] for k in actual):
    raise ValueError("The exhaustive source scan differs: " + json.dumps(actual))
print(json.dumps({"passed": True, **actual,
                  "scope": "All112initial XLSX decoded, distinct sheet contents deduplicated and explicit P0/P1 rows counted, including historical/closed/source-only declarations. No gameplay or art validation."}, ensure_ascii=False))
