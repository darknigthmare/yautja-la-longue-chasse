#!/usr/bin/env python3
"""Merge source admission diagnostics while retaining later native recipes."""
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from tracker import FOLLOW, LOT, ROOT, fingerprint, read

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("domain", choices=["phg", "war", "homeworld"])
args = parser.parse_args()
target = FOLLOW / "qualification-courante.json"
qualification = read(target)
updates = qualification["updates"]


def proof(path, scope):
    return {**fingerprint(path), "scope": scope}


def native(existing):
    return existing.get("browserTested") == "Oui" or existing.get("status") in ["QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"]


def combine(evidence):
    unique = {}
    for item in evidence:
        unique[item["path"]] = item
    return list(unique.values())


if args.domain == "phg":
    base = "production/p0p1-20261109/qa/phg-admission/"
    package = read(ROOT / (base + "verification.json"))
    if package["status"] != "PASS" or not all(package["checks"].values()):
        raise ValueError("PHG admission diagnostics are not verified")
    rows = read(ROOT / (base + "registre-updates.json"))
    details = {row["key"]: row for row in read(ROOT / (base + "rows.json"))}
    if len(rows) != 1811 or len(details) != 1811:
        raise ValueError("Expected all1811 PHG subjects")
    receipt = proof(base + "verification.json", "1811 diagnostics source/entités/bytes vérifiés ; aucune nouvelle recette navigateur ni approbation UV1:1.")
    detail_proof = proof(base + "rows.json", "Correspondance par clé, cellules originales, canaux, entités, admission et écarts documentaires.")
    for row in rows:
        key = row["key"]
        previous = updates.get(key, {})
        diagnosis = row["diagnosis"]
        partial = row["status"] == "PARTIEL"
        current = {"status": "PARTIEL" if partial else "OUVERT", "implementation": "Partiel" if partial else "À vérifier",
                   "domainTested": "Partiel", "browserTested": "À vérifier", "physicalController": "Sans objet", "humanArt": "À vérifier",
                   "remaining": "\n".join(row["openCriteria"]), "qualificationScope": details[key].get("integrated", "Voir les entités et leur admission source.") + " " + details[key].get("tested", ""),
                   "evidence": [receipt, detail_proof], "diagnosticCode": diagnosis, "openCriteria": row["openCriteria"],
                   "entityKeys": row["entityKeys"], "sourceReconciliation": {"path": detail_proof["path"], "sha256": detail_proof["sha256"], "key": key}}
        if native(previous):
            # The source audit cannot undo a later browser assertion or turn a
            # technically qualified subset into global artistic approval.
            for field in ["status", "implementation", "domainTested", "browserTested", "physicalController", "humanArt", "qualificationScope", "remaining"]:
                if field in previous:
                    current[field] = previous[field]
        current["evidence"] = combine(current["evidence"] + previous.get("evidence", []))
        updates[key] = current
else:
    base = "production/p0p1-20261109/qa/war-admission/"
    updates_name = "inventory-updates.json" if args.domain == "war" else "homeworld-inventory-updates.json"
    reconciliation_name = "reconciliation.json" if args.domain == "war" else "homeworld-reconciliation.json"
    rows = read(ROOT / (base + updates_name))
    expected = 588 if args.domain == "war" else 107
    if len(rows) != expected or len({r["key"] for r in rows}) != expected:
        raise ValueError("Wrong source admission subject count")
    receipt = proof(base + reconciliation_name, "Exigences complètes et diagnostics par clé ; les critères composites conservent leurs admissions ouvertes.")
    for row in rows:
        key = row["key"]
        previous = updates.get(key, {})
        original_status = row["status"]
        status = "PARTIEL" if original_status == "PARTIEL" else "QUALIFIE_BORNE" if original_status.startswith("QUALIFIE_BORNE") else "OUVERT"
        implementation = row.get("implementation", "À vérifier")
        normalized_impl = "Non" if implementation.lower().startswith(("non impl", "absent", "non réalisé")) else "Partiel" if "partiel" in implementation.lower() else "Oui" if implementation.lower().startswith(("oui", "implément")) else "À vérifier"
        domain = row.get("domainTested", "")
        evidence = [receipt] + [{**item, "scope": item.get("scope", "Preuve bornée de domaine/source ; voir rapport.")} for item in row.get("evidence", [])]
        current = {"status": status, "implementation": normalized_impl,
                   "domainTested": "Oui" if domain.startswith("Oui") else "Partiel" if "partiel" in domain.lower() else "À vérifier",
                   "browserTested": "Non" if status == "QUALIFIE_BORNE" else "À vérifier",
                   "physicalController": "À vérifier" if "APPAREILS" in original_status else "Sans objet",
                   "humanArt": "À vérifier" if "ART" in original_status or "1:1" in row.get("remaining", "") else "Sans objet",
                   "evidence": evidence, "remaining": row["remaining"], "qualificationScope": row["qualificationScope"],
                   "diagnosticCode": row.get("diagnosticCode", original_status),
                   "sourceReconciliation": {**row.get("sourceReconciliation", {}), "path": receipt["path"], "sha256": receipt["sha256"], "key": key,
                                            "criterion": row.get("sourceRequirementRestored", "")}}
        if native(previous):
            for field in ["domainTested", "browserTested", "physicalController", "humanArt"]:
                if field in previous:
                    current[field] = previous[field]
            current["qualificationScope"] = previous.get("qualificationScope", "") + "\nDiagnostic source complémentaire : " + row["qualificationScope"]
        current["evidence"] = combine(current["evidence"] + previous.get("evidence", []))
        updates[key] = current

# This file is intentionally writable only in the new lot. All source XLSX and
# historical receipts remain protected by the fixed initial manifest.
qualification["globalEvidence"] = combine(qualification.get("globalEvidence", []) + [receipt])
qualification["readyForWorkbook"] = False
target.write_text(json.dumps(qualification, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"imported": args.domain, "subjects": len(rows), "sourceDiagnoses": dict(Counter(r.get("diagnosis", r["status"]) for r in rows)),
                  "readyForWorkbook": False}, ensure_ascii=False))
