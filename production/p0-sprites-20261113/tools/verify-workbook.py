#!/usr/bin/env python3
"""Read-only proof of source preservation and the new static-art follow-up."""
import argparse
import json
import sys

sys.dont_write_bytecode = True
from workbook_lib import payload, verify

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", required=True)
parser.add_argument("--require-complete", action="store_true", help="Require the current authored image batch, not closure of the 775 P0 subjects")
args = parser.parse_args()
data = payload()
if args.require_complete and data["currentAuthoredBatchComplete"] is not True:
    raise ValueError("The current authored image batch is incomplete; this is separate from P0 closure")
report = verify(data)
print(json.dumps({k: report[k] for k in ("passed", "artifact", "cellsCompared", "counts")}, ensure_ascii=False))
