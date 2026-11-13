#!/usr/bin/env python3
"""Build the new P0 sprite follow-up only. Source workbooks stay immutable."""
import argparse
import json
import sys

sys.dont_write_bytecode = True
from workbook_lib import (ARTIFACT, COVERAGE, FOLLOW, PROTECTION, README, RECEIPT, REQUEST,
                          build_workbook, freeze_sources, json_bytes, payload,
                          followup_readme, serializable, verify)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--snapshot-sources", action="store_true")
parser.add_argument("--build", action="store_true")
args = parser.parse_args()
if args.snapshot_sources == args.build:
    parser.error("Choose exactly one of --snapshot-sources or --build")
FOLLOW.mkdir(parents=True, exist_ok=True)
if args.snapshot_sources:
    data = freeze_sources()
    if PROTECTION.exists() and PROTECTION.read_bytes() != json_bytes(data):
        raise ValueError("Refusing to replace a changed historical source protection snapshot")
    PROTECTION.write_bytes(json_bytes(data))
    print(json.dumps({"protectedInputs": data["protectedInputs"],
                      "sourceWorkbooks": data["sourceWorkbooks"],
                      "totalProtectedWorkbooks": data["totalProtectedWorkbooks"]}))
else:
    data = payload()
    ARTIFACT.write_bytes(build_workbook(data))
    REQUEST.write_bytes(json_bytes(serializable(data)))
    coverage = {k: v for k, v in data.items() if k not in ("sheets",)}
    COVERAGE.write_bytes(json_bytes(coverage))
    receipt = verify(data)
    RECEIPT.write_bytes(json_bytes(receipt))
    README.write_bytes(followup_readme(data, receipt))
    print(json.dumps({k: receipt[k] for k in ("passed", "artifact", "cellsCompared", "counts")}, ensure_ascii=False))
