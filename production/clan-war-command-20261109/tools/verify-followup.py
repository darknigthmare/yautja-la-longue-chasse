#!/usr/bin/env python3
"""Read-only verification of the final appended follow-up workbook."""
import json
import sys

sys.dont_write_bytecode = True
from followup import REQUEST, payload, portable, read, verify

if sys.argv[1:] != ["--check"]:
    raise SystemExit("Usage: python3 production/clan-war-command-20261109/tools/verify-followup.py --check")
data = payload()
if read(REQUEST) != portable(data):
    raise ValueError("Qualified inputs changed after export; do not relabel a prior receipt")
print(json.dumps(verify(data), ensure_ascii=False))
