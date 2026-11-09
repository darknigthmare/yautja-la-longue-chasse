#!/usr/bin/env python3
"""Build only the new dated follow-up; historical sources are always read-only."""
import argparse
import json
import sys

sys.dont_write_bytecode = True
from followup import ARTIFACT, FOLLOW, INVENTORY, REQUEST, configuration, freeze_inventory, load_module, payload, portable, register, verify

parser = argparse.ArgumentParser(description=__doc__)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--inventory", action="store_true")
mode.add_argument("--register", action="store_true")
mode.add_argument("--ready-check", action="store_true")
mode.add_argument("--build", action="store_true")
parser.add_argument("--source-commit")
args = parser.parse_args()
if args.inventory:
    if not args.source_commit:
        parser.error("--inventory needs the reviewed --source-commit")
    data = freeze_inventory(args.source_commit)
    INVENTORY.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(data["counts"]))
elif args.register:
    data = register()
    (FOLLOW / "registre-priorites.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(data["counts"], ensure_ascii=False))
elif args.ready_check and configuration()["readyForWorkbook"] is not True:
    print(json.dumps({"ready": False, "artifactGenerated": False, "scope": "Integrated sources, reconciliations and final receipts are pending."}))
else:
    data = payload()
    if args.ready_check:
        print(json.dumps({"ready": True, "appendedSheets": data["appendedSheets"], "artifactGenerated": False}))
    else:
        helper = load_module("command_followup_builder", "scripts/lib/excel_followup_append.py")
        ARTIFACT.write_bytes(helper.build_workbook(data))
        REQUEST.write_text(json.dumps(portable(data), ensure_ascii=False, indent=2) + "\n")
        print(json.dumps(verify(data), ensure_ascii=False))
