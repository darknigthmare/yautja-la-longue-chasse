#!/usr/bin/env python3
"""Build only the new dated B05 workbook after real final evidence is ready."""
import argparse
import json
import sys

sys.dont_write_bytecode = True
from tracker import ARTIFACT, REQUEST, append_helper, portable_request, prepare_payload, qualification, verify_generated

parser = argparse.ArgumentParser(description=__doc__)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--ready-check", action="store_true", help="Inspect readiness without generating or writing anything")
mode.add_argument("--build", action="store_true", help="Build the new workbook; never write an old source")
args = parser.parse_args()
if args.ready_check:
    data = qualification()
    if not data["readyForWorkbook"]:
        print(json.dumps({"ready": False, "status": data["status"], "artifactGenerated": False}))
        sys.exit(0)
payload = prepare_payload()
if args.ready_check:
    print(json.dumps({"ready": True, "artifactGenerated": False, "sheets": payload["appendedSheets"]}))
else:
    ARTIFACT.write_bytes(append_helper().build_workbook(payload))
    REQUEST.write_text(json.dumps(portable_request(payload), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(verify_generated(payload), ensure_ascii=False))
