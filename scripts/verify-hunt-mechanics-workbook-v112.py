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


def source_url(source, row):
    path = row["source"]
    if re.fullmatch(r"https://github\.com/" + re.escape(source["repository"]) + r"/actions/runs/\d+", path):
        return path
    pinned = re.fullmatch(r"https://github\.com/" + re.escape(source["repository"]) +
                          r"/blob/[a-f0-9]{40}/((?:app|docs|scripts|tests|public)/[A-Za-z0-9_./-]+)", path)
    if pinned and all(part not in ("", ".", "..") for part in pinned.group(1).split("/")):
        return path
    check(re.match(r"[A-Za-z][A-Za-z0-9+.-]*:", path) is None, "Source URL must pin an allowed path in this repository")
    target_ref = source["baseCommit"] if row.get("status") == "BASE_V111" else source["reviewRef"]
    return f"https://github.com/{source['repository']}/blob/{quote(target_ref, safe='')}/{quote(path, safe='/')}"


def canonical_sha256(value):
    text = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def effective_statuses(source):
    """Validate schema 3's journal and resolve statuses without editing its archive."""
    historical_names = {"Cloture", "Restant", "Reprise"}
    heritage = [sheet for sheet in source["sheets"] if sheet["name"] not in historical_names]
    states = {row["id"]: row["status"] for sheet in heritage for row in sheet["rows"]}
    if source["schemaVersion"] != 3:
        return states
    cycle = source.get("cycleBaseline")
    check(isinstance(cycle, dict), "Cycle baseline required")
    expected = {
        "commit": "e4a6c64a1e77edad8865aa05ca7c2901d62bfa09",
        "sourceJsonSha256": "76b33d9f2acadf9bc6f07f395c545c0873c83a41d27f5168ac083bb5a4b9a8ff",
        "closureSheetSha256": "56358c148e54541cca896101215c2353d642b4ecea75dddfaea37593b9ca2456",
        "remainingSheetSha256": "f11671a1ac604c61463215d631ff12ad9d6efea95f067b240b3dd3bea940f89d",
        "closureBaselineSha256": "ccf1710981ca54e1c05d292a90d8d03475917c8da97c2c80febd6b011ce66a1d",
        "reviewRef": "e1e45fbf85d843c26ac1bf4f816baf46313795b0",
    }
    check(all(cycle.get(key) == value for key, value in expected.items()), "Pinned cycle baseline identity")
    sheets = {sheet["name"]: sheet for sheet in source["sheets"]}
    check(source["reviewRef"] == expected["reviewRef"], "Historical source reference unchanged")
    check(canonical_sha256(sheets["Cloture"]) == expected["closureSheetSha256"], "Historical closure sheet unchanged")
    check(canonical_sha256(source["closureBaseline"]) == expected["closureBaselineSha256"], "Original closure baseline unchanged")
    check(canonical_sha256(cycle.get("remainingSheet")) == expected["remainingSheetSha256"], "Historical remaining sheet unchanged")
    original_remaining = {row["id"]: row for row in cycle["remainingSheet"]["rows"]}
    check(sheets["Restant"]["title"] == cycle["remainingSheet"]["title"] and
          sheets["Restant"]["columns"] == cycle["remainingSheet"]["columns"],
          "Current remaining sheet retains its historical layout contract")
    remaining_rows = sheets["Restant"]["rows"]
    remaining = {row["id"]: row for row in remaining_rows}
    required_remaining = {f"REM112-{i:02}" for i in range(1, 9)}
    check(set(original_remaining) == set(remaining) == required_remaining and len(remaining_rows) == 8,
          "All current remaining identities retained")
    for identifier, before in original_remaining.items():
        row = remaining[identifier]
        check(all(row.get(key) == before.get(key) for key in ("id", "topic", "rule", "source")),
              "Original remaining criterion fields unchanged")
        check(isinstance(row.get("acceptance"), str) and row["acceptance"].startswith(before["acceptance"]),
              "Original remaining acceptance retained before current notes")
        states[identifier] = before["status"]
    closure = {row["target"]: row for row in sheets["Cloture"]["rows"]}
    check(all(states.get(identifier) == row["status"] for identifier, row in closure.items()),
          "Raw business statuses remain the historical closure snapshot")
    check(all(states.get(row["id"]) == row["status"] for row in source["closureBaseline"]["rows"]
              if row["id"] not in closure), "Unreviewed original statuses cannot change outside the journal")
    proofs_list = [row for sheet in source["sheets"] if sheet["name"] in ("Qualification", "Preuves") for row in sheet["rows"]]
    proofs = {row["id"]: row for row in proofs_list}
    check(len(proofs) == len(proofs_list), "Unique executed proof identities")
    for proof in proofs.values():
        if proof["status"] == "VALIDE_AUTOMATISE":
            check(re.search(r"\bcommit [a-f0-9]{40}\b", proof.get("acceptance", "")) is not None and
                  re.search(r"\bcommande \S", proof.get("acceptance", "")) is not None,
                  "Executed proof needs its command and commit")
    statuses = {"BASE_V111", "IMPLEMENTE_A_VALIDER", "VALIDE_AUTOMATISE", "A_EXECUTER", "NON_QUALIFIE", "DOCUMENTE", "PARTIELLEMENT_QUALIFIE"}
    open_statuses = {"NON_QUALIFIE", "PARTIELLEMENT_QUALIFIE", "A_EXECUTER", "IMPLEMENTE_A_VALIDER"}
    check(all(row.get("status") in statuses for sheet in source["sheets"] for row in sheet["rows"]),
          "Known qualification statuses")
    journal = sheets["Reprise"]["rows"]
    check(isinstance(journal, list) and bool(journal), "The current cycle journal is not empty")
    latest = {}
    check(sheets["Reprise"]["columns"] == sheets["Cloture"]["columns"], "Journal columns retain the review contract")
    pinned_pattern = re.escape(f"https://github.com/{source['repository']}/blob/") + r"([a-f0-9]{40})/((?:app|docs|scripts|tests|public)/[A-Za-z0-9_./-]+)"
    for index, record in enumerate(journal, start=1):
        target = record.get("target")
        check(record.get("id") == f"RPR112-{index:03}", "Stable ordered journal identity")
        check(target in closure or target in original_remaining, "Journal target is an archived criterion")
        check(record.get("status") in open_statuses | {"VALIDE_AUTOMATISE", "DOCUMENTE"}, "Journal status describes a current qualification")
        check(record.get("kind") in {"AUTOMATISE", "AUTOMATISE_PARTIEL", "REVUE_DOCUMENTAIRE", "NON_QUALIFIE"},
              "Journal kind describes its evidence scope")
        check(record.get("previous") == states[target], "Journal transition follows the preceding effective status")
        criterion = closure[target]["criterion"] if target in closure else original_remaining[target]["rule"] + " | " + original_remaining[target]["acceptance"]
        check(record.get("criterion") == criterion, "Journal preserves the exact archived criterion")
        check(bool(record.get("scope")), "Journal scope visible")
        pinned = re.fullmatch(pinned_pattern, record.get("source", ""))
        check(pinned is not None and all(part not in ("", ".", "..") for part in pinned.group(2).split("/")),
              "Journal source pins an allowed repository path")
        evidence = [key for key in record.get("proofs", "").split(",") if key]
        pending = [key for key in record.get("remaining", "").split(",") if key]
        check(all(key in proofs and proofs[key]["status"] == "VALIDE_AUTOMATISE" for key in evidence),
              "Journal uses executed proof identities")
        check(all("commit " + pinned.group(1) in proofs[key].get("acceptance", "") for key in evidence),
              "Journal proof commit matches its pinned source")
        if record["status"] == "VALIDE_AUTOMATISE":
            check(bool(evidence) and not pending and record.get("kind") == "AUTOMATISE", "Automatic journal closure has bounded executed evidence")
        if record["status"] == "DOCUMENTE":
            check(record.get("kind") == "REVUE_DOCUMENTAIRE", "Documentary journal scope is explicit")
        if record["status"] == "PARTIELLEMENT_QUALIFIE":
            check(bool(evidence) and record.get("kind") == "AUTOMATISE_PARTIEL", "Partial journal qualification has bounded executed evidence")
        if record["status"] in open_statuses:
            check(bool(pending), "Open journal criterion retains its next action")
        states[target] = record["status"]
        check(all(key in remaining and states[key] in open_statuses for key in pending),
              "Journal next actions were open at the time of the transition")
        latest[target] = record
    check(all(row["status"] == states[identifier] for identifier, row in remaining.items()), "Current remaining statuses follow the journal")
    for record in latest.values():
        pending = [key for key in record.get("remaining", "").split(",") if key]
        if record["status"] in open_statuses:
            check(any(key in remaining and states[key] in open_statuses for key in pending),
                  "Current open journal criterion retains a currently open next action")
    old_ids = {row["id"] for row in source["closureBaseline"]["rows"]}
    old_ids.update({"ATL112-12", "ATL112-13"})
    for prefix, count, width in (("QA112", 52, 2), ("PRF112", 12, 2), ("CLS112", 219, 3), ("REM112", 8, 2)):
        old_ids.update(f"{prefix}-{i:0{width}}" for i in range(1, count + 1))
    bindings = {row["id"]: source_url(source, row) for sheet in source["sheets"] for row in sheet["rows"]
                if row["id"] in old_ids and row.get("source")}
    check(len(bindings) == 569 and canonical_sha256(bindings) == "13b9547c6ddc97488018630b8762ce05354424b0ca70d5cfa82832a1feb13eff",
          "All 569 historical source destinations unchanged")
    return states


def main() -> None:
    check(len(sys.argv) == 1, "Usage: python3 scripts/verify-hunt-mechanics-workbook-v112.py")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    check(source["schemaVersion"] in (1, 2, 3) and source["release"] == "V112", "Source schema")
    expected_sheets = {1: 19, 2: 21, 3: 22}[source["schemaVersion"]]
    check(len(source["sheets"]) == expected_sheets, "Worksheet count matches schema")
    effective = effective_statuses(source)
    print_layout = source.get("printLayout", {"fitToPage": False})
    if source["schemaVersion"] >= 2:
        check(isinstance(print_layout, dict) and set(print_layout) == {"fitToPage"} and
              isinstance(print_layout["fitToPage"], bool), "Print layout option")
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
            if source["schemaVersion"] >= 2:
                page_properties = sheet.find("s:sheetPr/s:pageSetUpPr", NS)
                enabled = page_properties is not None and page_properties.get("fitToPage") == "1"
                check(enabled == print_layout["fitToPage"], f"Print scaling matches its explicit source option: {path}")
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
                    expected_value = row.get(column["key"], "")
                    if source["schemaVersion"] == 3 and column["key"] == "status" and expected["name"] not in ("Cloture", "Restant", "Reprise"):
                        expected_value = effective[row["id"]]
                    check(value(cells[ref]) == expected_value, f"Cell content: {path}!{ref}")
                    check(cells[ref].find("s:f", NS) is None, f"Unexpected formula: {path}!{ref}")
                    checked_cells += 1
                    if column["key"] == "source" and row.get("source"):
                        check(ref in links and links[ref] in rels, f"Source hyperlink missing: {path}!{ref}")
                        rel = rels[links[ref]]
                        target = source_url(source, row)
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
        if source["schemaVersion"] >= 2:
            baseline = source["closureBaseline"]
            check(len(baseline["rows"]) == 362, "Original backlog count")
            original = {row["id"]: row["status"] for row in baseline["rows"]}
            check(len(original) == 362, "Original IDs unique")
            heritage = [s for s in source["sheets"] if s["name"] not in ("Cloture", "Restant", "Reprise")]
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
            historical_remaining = source["cycleBaseline"]["remainingSheet"] if source["schemaVersion"] == 3 else next(s for s in source["sheets"] if s["name"] == "Restant")
            remaining = {row["id"]: row for row in historical_remaining["rows"]}
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
    result = {"result": "PASS_STRUCTURE_AND_SOURCE_DATA", "sheets": len(source["sheets"]), "rows": total_rows, "cellsChecked": checked_cells, "sourceLinksChecked": checked_links, "scenarioResults": {status: sum(r["status"] == status for r in qa["rows"]) for status in ("A_EXECUTER", "VALIDE_AUTOMATISE")}, "nativeExcelExecuted": False}
    if source["schemaVersion"] == 3:
        historical_results, effective_results = {}, {}
        for record in next(sheet for sheet in source["sheets"] if sheet["name"] == "Cloture")["rows"]:
            before, current = record["status"], effective[record["target"]]
            historical_results[before] = historical_results.get(before, 0) + 1
            effective_results[current] = effective_results.get(current, 0) + 1
        result["historicalClosureResults"] = historical_results
        result["effectiveClosureResults"] = effective_results
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
