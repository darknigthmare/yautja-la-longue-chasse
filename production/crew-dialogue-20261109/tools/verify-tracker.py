#!/usr/bin/env python3
"""Verify the dated B05 workbook and its current evidence without writing files."""
import json
import sys

sys.dont_write_bytecode = True
from tracker import REQUEST, portable_request, prepare_payload, read, verify_generated

if sys.argv[1:] != ["--check"]:
    raise SystemExit("Usage: python3 production/crew-dialogue-20261109/tools/verify-tracker.py --check")
payload = prepare_payload()
if portable_request(payload) != read(REQUEST):
    raise ValueError("Qualified inputs changed after workbook export; do not relabel the old result")
print(json.dumps(verify_generated(payload), ensure_ascii=False))
