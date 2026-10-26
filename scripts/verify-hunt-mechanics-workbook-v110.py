#!/usr/bin/env python3
"""Verify the delivered V110 ZIP/XML workbook against its editable JSON source.

Uses only the Python standard library. This is structural/data validation;
it does not launch Excel or certify gameplay scenarios.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys
from urllib.parse import quote
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/hunt-mechanics-v110.json"
WORKBOOK = ROOT / "docs/YAUTJA_V110_MECANIQUES_CHASSE.xlsx"
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
    check(len(sys.argv) == 1, "Usage: python3 scripts/verify-hunt-mechanics-workbook-v110.py")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    check(source["schemaVersion"] == 1 and source["release"] == "V110", "Source schema")
    check(len(source["sheets"]) == 8, "Eight worksheets required")
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
                        target_ref = source["baseCommit"] if row.get("status") == "EXISTANT" else source["reviewRef"]
                        target = f"https://github.com/{source['repository']}/blob/{quote(target_ref, safe='')}/{quote(row['source'], safe='/')}"
                        check(rel.get("Target") == target and rel.get("TargetMode") == "External" and rel.get("Type", "").endswith("/hyperlink"), f"Source link target: {path}!{ref}")
                        checked_links += 1
                total_rows += 1
            check(len(links) == len(rels), f"Unused or missing hyperlink relation: {path}")
        qa = next(s for s in source["sheets"] if s["name"] == "Validation")
        check(all(r["status"] == "A_EXECUTER" for r in qa["rows"]), "Gameplay execution must not be inferred from workbook structure")
        check(len(ids) == total_rows, "Rule count")
    print(json.dumps({"result": "PASS_STRUCTURE_AND_SOURCE_DATA", "sheets": 8, "rows": total_rows, "cellsChecked": checked_cells, "sourceLinksChecked": checked_links, "scenarioResults": "A_EXECUTER", "nativeExcelExecuted": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
