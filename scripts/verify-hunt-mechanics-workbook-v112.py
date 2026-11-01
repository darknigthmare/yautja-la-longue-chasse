#!/usr/bin/env python3
"""Verify the delivered V112 ZIP/XML workbook against its editable JSON source.

Uses only the Python standard library. This is structural/data validation;
it does not launch Excel or certify gameplay scenarios.
"""
from __future__ import annotations

import json
import re
import hashlib
from pathlib import Path
import sys
from urllib.parse import quote
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/hunt-mechanics-v112.json"
WORKBOOK = ROOT / "docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "p": "http://schemas.openxmlformats.org/package/2006/relationships"}


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def col(index: int) -> str:
    label = ""
    index += 1
    while index:
        index -= 1
        label = chr(65 + index % 26) + label
        index //= 26
    return label


def value(cell: ET.Element):
    if cell.get("t") == "inlineStr":
        return "".join(cell.itertext())
    raw = cell.findtext("s:v", namespaces=NS)
    return float(raw) if raw is not None else ""


def main() -> None:
    check(len(sys.argv) == 1, "Usage: python3 scripts/verify-hunt-mechanics-workbook-v112.py")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    check(source["schemaVersion"] in (1, 2) and source["release"] == "V112", "Source schema")
    expected_sheets = 21 if source["schemaVersion"] == 2 else 19
    check(len(source["sheets"]) == expected_sheets, "Worksheet count matches schema")
    total_rows = 0
    checked_cells = 0
    checked_links = 0
    ids = set()
    with ZipFile(WORKBOOK) as z:
        names = z.namelist()
        check(len(names) == len(set(names)), "Duplicate ZIP member")
        check(z.testzip() is None, "ZIP CRC mismatch")
        check(all(not n.startswith("/") and ".." not in Path(n).parts for n in names), "Unsafe ZIP member")
        check(all(n.endswith((".xml", ".rels")) for n in names), "Unexpected workbook member")
        documents = {name: ET.fromstring(z.read(name)) for name in names}
        check("[Content_Types].xml" in documents and "_rels/.rels" in documents, "Required package parts")
        workbook = documents["xl/workbook.xml"]
        book_sheets = workbook.findall("s:sheets/s:sheet", NS)
        check([s.get("name") for s in book_sheets] == [s["name"] for s in source["sheets"]], "Worksheet names/order")
        styles = documents["xl/styles.xml"]
        check(len(styles.find("s:cellXfs", NS)) == 9, "Workbook style count")
        for number, (expected, book_sheet) in enumerate(zip(source["sheets"], book_sheets), start=1):
            check(book_sheet.get("sheetId") == str(number), "Stable worksheet identity")
            path = f"xl/worksheets/sheet{number}.xml"
            sheet = documents[path]
            pane = sheet.find("s:sheetViews/s:sheetView/s:pane", NS)
            check(pane is not None and pane.get("state") == "frozen" and pane.get("topLeftCell") == "A5" and pane.get("ySplit") == "4", f"Frozen header: {path}")
            expected_filter = f"A4:{col(len(expected['columns'])-1)}{len(expected['rows'])+4}"
            check(sheet.find("s:autoFilter", NS).get("ref") == expected_filter, f"Filter range: {path}")
            cells = {c.get("r"): c for c in sheet.findall("s:sheetData/s:row/s:c", NS)}
            check(value(cells["A1"]) == expected["title"], f"Title: {path}")
            for index, column in enumerate(expected["columns"]):
                check(value(cells[f"{col(index)}4"]) == column["label"], f"Header: {path}")
            rel_path = f"xl/worksheets/_rels/sheet{number}.xml.rels"
            rels = {r.get("Id"): r for r in documents[rel_path]} if rel_path in documents else {}
            links = {link.get("ref"): link.get(f"{{{NS['r']}}}id") for link in sheet.findall("s:hyperlinks/s:hyperlink", NS)}
            for index, row in enumerate(expected["rows"], start=5):
                check(row["id"] not in ids, "Duplicate rule ID")
                ids.add(row["id"])
                for ci, column in enumerate(expected["columns"]):
                    ref = f"{col(ci)}{index}"
                    check(ref in cells, f"Missing cell {path}!{ref}")
                    check(value(cells[ref]) == row.get(column["key"], ""), f"Cell content: {path}!{ref}")
                    check(cells[ref].find("s:f", NS) is None, f"Unexpected formula: {path}!{ref}")
                    checked_cells += 1
                    if column["key"] == "source" and row.get("source"):
                        check(ref in links and links[ref] in rels, f"Source hyperlink missing: {path}!{ref}")
                        rel = rels[links[ref]]
                        target_ref = source["baseCommit"] if row.get("status") == "BASE_V111" else source["reviewRef"]
                        target = row["source"] if row["source"].startswith(f"https://github.com/{source['repository']}/actions/runs/") else f"https://github.com/{source['repository']}/blob/{quote(target_ref, safe='')}/{quote(row['source'], safe='/')}"
                        check(rel.get("Target") == target and rel.get("TargetMode") == "External" and rel.get("Type", "").endswith("/hyperlink"), f"Source link target: {path}!{ref}")
                        checked_links += 1
                total_rows += 1
            check(len(links) == len(rels), f"Unused or missing hyperlink relation: {path}")
        qa = next(s for s in source["sheets"] if s["name"] == "Qualification")
        check(all(r["status"] in ("A_EXECUTER", "VALIDE_AUTOMATISE") for r in qa["rows"]), "Qualification statuses must be explicit")
        for row in qa["rows"]:
            if row["status"] == "VALIDE_AUTOMATISE":
                check(re.search(r"\bcommit [a-f0-9]{40}\b", row["acceptance"]) is not None and re.search(r"\bcommande \S", row["acceptance"]) is not None, "Executed result needs command and commit")
        futures = next(s for s in source["sheets"] if s["name"] == "FermetureFUT")
        check({r["id"] for r in futures["rows"]} == {f"FUT-{i:02}" for i in range(1,13)}, "All twelve requirements retained")
        check(any(r["status"] == "NON_QUALIFIE" for s in source["sheets"] for r in s["rows"]), "Physical device limit retained")
        check(len(ids) == total_rows, "Rule count")
        if source["schemaVersion"] == 2:
            baseline = source["closureBaseline"]
            check(len(baseline["rows"]) == 362, "Original backlog count")
            original = {row["id"]: row["status"] for row in baseline["rows"]}
            check(len(original) == 362, "Original IDs unique")
            heritage = [s for s in source["sheets"] if s["name"] not in ("Cloture", "Restant")]
            check(len(heritage) == 19, "Original sheets remain")
            current = {row["id"]: row for sheet in heritage for row in sheet["rows"]}
            check(set(original).issubset(current), "No original requirement removed")
            mutable_acceptance = {"QA112-41", "PRF112-03", "PRF112-04"}
            for before in baseline["rows"]:
                row = current[before["id"]]
                invariant = {key: val for key, val in row.items()
                             if key != "status" and not (key == "acceptance" and row["id"] in mutable_acceptance)}
                canonical = json.dumps(invariant, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                check(hashlib.sha256(canonical.encode("utf-8")).hexdigest() == before["contentSha256"], "Original criterion fields unchanged")
            opened = {key: status for key, status in original.items()
                      if status in ("IMPLEMENTE_A_VALIDER", "A_EXECUTER", "NON_QUALIFIE")}
            records = next(s["rows"] for s in source["sheets"] if s["name"] == "Cloture")
            check(len(records) == len(opened), "Every originally open item reviewed")
            check({row["target"] for row in records} == set(opened), "Closure target identity")
            remaining = {row["id"]: row for s in source["sheets"] if s["name"] == "Restant" for row in s["rows"]}
            check(set(remaining) == {f"REM112-{i:02}" for i in range(1, 9)}, "All remaining qualification identities retained")
            proofs = {row["id"]: row for s in source["sheets"] if s["name"] in ("Qualification", "Preuves") for row in s["rows"]}
            baseline_by_id = {row["id"]: row for row in baseline["rows"]}
            for record in records:
                target = record["target"]
                check(hashlib.sha256(record["criterion"].encode("utf-8")).hexdigest() == baseline_by_id[target]["criterionSha256"], "Original criterion archive unchanged")
                check(record["previous"] == opened[target], "Original status preserved")
                check(record["status"] == current[target]["status"], "Closure/current status agrees")
                check(bool(record["scope"] and record["source"] and record["criterion"]), "Evidence scope visible")
                evidence = [key for key in record.get("proofs", "").split(",") if key]
                pending = [key for key in record.get("remaining", "").split(",") if key]
                check(all(key in proofs and proofs[key]["status"] == "VALIDE_AUTOMATISE" for key in evidence), "Executed evidence references")
                if record["status"] == "VALIDE_AUTOMATISE":
                    check(bool(evidence) and not pending and record["kind"] == "AUTOMATISE", "Automatic closure has executed evidence")
                if record["status"] == "DOCUMENTE":
                    check(record["kind"] == "REVUE_DOCUMENTAIRE", "Documentary scope is explicit")
                if record["status"] in ("NON_QUALIFIE", "PARTIELLEMENT_QUALIFIE", "IMPLEMENTE_A_VALIDER", "A_EXECUTER"):
                    check(bool(pending), "Open item needs next action")
                check(all(key in remaining and remaining[key]["status"] in ("NON_QUALIFIE", "A_EXECUTER", "IMPLEMENTE_A_VALIDER") for key in pending), "Outstanding action identity")
            check(all(row["status"] in ("NON_QUALIFIE", "A_EXECUTER", "IMPLEMENTE_A_VALIDER") and row["acceptance"] for row in remaining.values()), "Outstanding actions remain open")
    print(json.dumps({"result": "PASS_STRUCTURE_AND_SOURCE_DATA", "sheets": len(source["sheets"]), "rows": total_rows, "cellsChecked": checked_cells, "sourceLinksChecked": checked_links, "scenarioResults": {status: sum(r["status"] == status for r in qa["rows"]) for status in ("A_EXECUTER", "VALIDE_AUTOMATISE")}, "nativeExcelExecuted": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
