#!/usr/bin/env python3
"""Regenerate only this lot's register and append-only P0/P1 workbook."""
import argparse
import json
import sys

sys.dont_write_bytecode = True
from tracker import ARTIFACT, FOLLOW, REQUEST, current_register, followup_summary, helper, markdown, payload, portable, read, verify

parser = argparse.ArgumentParser(description=__doc__)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--register", action="store_true")
mode.add_argument("--ready-check", action="store_true")
mode.add_argument("--build", action="store_true")
args = parser.parse_args()
if args.register:
    data = current_register()
    (FOLLOW / "registre-priorites.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    (FOLLOW / "registre-priorites.md").write_text(markdown(data))
    (FOLLOW / "actions-restantes.json").write_text(json.dumps(followup_summary(data), ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(data["counts"], ensure_ascii=False))
else:
    if args.ready_check and read(FOLLOW / "qualification-courante.json")["readyForWorkbook"] is not True:
        print(json.dumps({"ready": False, "artifactGenerated": False,
                          "status": "Les reçus finaux des chantiers restent à intégrer."}, ensure_ascii=False))
        raise SystemExit(0)
    data = payload()
    if args.ready_check:
        print(json.dumps({"ready": True, "sheets": data["appendedSheets"], "artifactGenerated": False}))
    else:
        ARTIFACT.write_bytes(helper().build_workbook(data))
        REQUEST.write_text(json.dumps(portable(data), ensure_ascii=False, indent=2) + "\n")
        print(json.dumps(verify(data), ensure_ascii=False))
