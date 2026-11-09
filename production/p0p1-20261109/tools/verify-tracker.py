#!/usr/bin/env python3
"""Read-only verification of current priority sources and exported XLSX."""
import json
import sys

sys.dont_write_bytecode = True
from tracker import REQUEST, payload, portable, read, verify

if sys.argv[1:] != ["--check"]:
    raise SystemExit("Usage: python3 production/p0p1-20261109/tools/verify-tracker.py --check")
data = payload()
if read(REQUEST) != portable(data):
    raise ValueError("Qualified inputs changed after export; regenerate this lot, never relabel an old receipt")
print(json.dumps(verify(data), ensure_ascii=False))
