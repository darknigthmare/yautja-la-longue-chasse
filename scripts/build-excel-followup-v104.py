#!/usr/bin/env python3
"""Append V104 to the pinned V100 archive without rewriting old sheet parts.

The V100 writer is imported only for its pure XML/style helpers. Its executable
entry point and historical generator are never run or changed.
"""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZIP_STORED, ZipFile, ZipInfo

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("historical_excel_v100", Path(__file__).with_name("build-excel-followup-v100.py"))
old = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(old)
tag, xml_bytes = old.tag, old.xml_bytes
SUMMARY = "SyntheseV104"
HISTORICAL_COUNT = 27
ALLOWED_METADATA = {"[Content_Types].xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml"}


def worksheet(spec, styles):
    # Reuse only the XML layout helper, and retarget the newly created sheet.
    sheet = ET.fromstring(old.worksheet(spec, styles))
    text = sheet.find(f"{tag('sheetData')}/{tag('row')}[@r='3']/{tag('c')}[@r='A3']/{tag('is')}/{tag('t')}")
    text.text = text.text.replace("SyntheseV100", SUMMARY)
    links = sheet.find(tag("hyperlinks"))
    if spec["name"] == SUMMARY:
        if links is not None:
            sheet.remove(links)
    elif links is not None:
        for link in links:
            link.set("location", f"'{SUMMARY}'!A1")
    return xml_bytes(sheet)


def baseline_bytes(payload):
    data = (Path(payload["root"]) / payload["baseline"]["path"]).read_bytes()
    if hashlib.sha256(data).hexdigest() != payload["baseline"]["sha256"]:
        raise ValueError("Pinned V100 baseline SHA-256 mismatch; freeze and explicitly update the V104 registry")
    return data


def build_workbook(payload):
    with ZipFile(io.BytesIO(baseline_bytes(payload))) as archive:
        parts = {info.filename: archive.read(info) for info in archive.infolist()}
    book = ET.fromstring(parts["xl/workbook.xml"])
    sheets = book.find(tag("sheets"))
    if len(sheets) != HISTORICAL_COUNT:
        raise ValueError("Expected the 27 historical V100 sheets")
    if not payload["sheets"] or payload["sheets"][0]["name"] != SUMMARY:
        raise ValueError("SyntheseV104 must be the first appended sheet")
    names = {s.attrib["name"] for s in sheets}
    relationships = ET.fromstring(parts["xl/_rels/workbook.xml.rels"])
    content_types = ET.fromstring(parts["[Content_Types].xml"])
    styles = old.Styles(parts["xl/styles.xml"])
    next_id = max(int(s.attrib["sheetId"]) for s in sheets) + 1
    for index, spec in enumerate(payload["sheets"], next_id):
        name = spec["name"]
        if not name or name in names or len(name) > 31 or re.search(r"[\\/*?:\[\]]", name):
            raise ValueError(f"Invalid or duplicate worksheet name: {name}")
        names.add(name)
        filename, rid = f"xl/worksheets/v104-sheet-{index}.xml", f"rIdV104Sheet{index}"
        if filename in parts or any(item.attrib.get("Id") == rid for item in relationships):
            raise ValueError("New V104 part collides with a historical part")
        ET.SubElement(sheets, tag("sheet"), {"name": name, "sheetId": str(index), f"{{{old.REL}}}id": rid})
        ET.SubElement(relationships, f"{{{old.PKG_REL}}}Relationship", {"Id": rid, "Type": f"{old.REL}/worksheet", "Target": filename.removeprefix("xl/")})
        ET.SubElement(content_types, f"{{{old.CONTENT}}}Override", {"PartName": "/" + filename, "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        parts[filename] = worksheet(spec, styles)
    views = book.find(tag("bookViews"))
    if views is None:
        views = ET.Element(tag("bookViews")); book.insert(list(book).index(sheets), views)
    view = views.find(tag("workbookView"))
    if view is None:
        view = ET.SubElement(views, tag("workbookView"))
    view.set("activeTab", str(HISTORICAL_COUNT))
    calc = book.find(tag("calcPr"))
    if calc is None:
        calc = ET.SubElement(book, tag("calcPr"))
    calc.attrib.update({"calcMode": "auto", "fullCalcOnLoad": "1", "forceFullCalc": "1"})
    parts.update({"xl/workbook.xml": xml_bytes(book), "xl/_rels/workbook.xml.rels": xml_bytes(relationships), "[Content_Types].xml": xml_bytes(content_types), "xl/styles.xml": xml_bytes(styles.root)})
    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_STORED) as archive:
        for filename in sorted(parts):
            info = ZipInfo(filename, date_time=(2026, 10, 22, 0, 0, 0))
            info.compress_type = ZIP_STORED; info.create_system = 0; info.external_attr = 0o600 << 16
            archive.writestr(info, parts[filename])
    return output.getvalue()


def verify_workbook(payload):
    """Independently inspect preserved bytes, relationships and formula caches."""
    def canonical(node):
        return node.tag, sorted(node.attrib.items()), node.text or "", [canonical(c) for c in node]

    def value(cell):
        return "".join(cell.find(tag("is")).itertext()) if cell.attrib.get("t") == "inlineStr" else cell.findtext(tag("v"))

    with ZipFile(io.BytesIO(baseline_bytes(payload))) as baseline, ZipFile(payload["workbookPath"]) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(set(archive.namelist()))
        assert set(baseline.namelist()) <= set(archive.namelist())
        changed = [name for name in baseline.namelist() if baseline.read(name) != archive.read(name)]
        assert set(changed) <= ALLOWED_METADATA, changed
        previous = ET.fromstring(baseline.read("xl/workbook.xml"))
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        previous_sheets, sheets = previous.find(tag("sheets")), book.find(tag("sheets"))
        assert len(previous_sheets) == HISTORICAL_COUNT
        assert [canonical(s) for s in previous_sheets] == [canonical(s) for s in list(sheets)[:HISTORICAL_COUNT]]
        assert len({s.attrib['name'] for s in sheets}) == len(sheets)
        styles = ET.fromstring(archive.read("xl/styles.xml"))
        for section in ET.fromstring(baseline.read("xl/styles.xml")):
            extended = styles.find(section.tag)
            assert extended is not None
            assert [canonical(c) for c in section] == [canonical(c) for c in list(extended)[:len(section)]]
        parsed = 0
        for name in archive.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(name)); parsed += 1
            if not name.endswith(".rels"):
                continue
            base = "" if name == "_rels/.rels" else posixpath.join(posixpath.dirname(posixpath.dirname(name)), posixpath.basename(name)[:-5])
            for link in ET.fromstring(archive.read(name)):
                if link.attrib.get("TargetMode") == "External":
                    continue
                target = link.attrib["Target"]
                target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(base), target))
                assert target in archive.namelist(), (name, target)
        rels = {r.attrib["Id"]: r.attrib["Target"] for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        parsed_sheets = {}
        for sheet in sheets:
            target = rels[sheet.attrib[f"{{{old.REL}}}id"]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            parsed_sheets[sheet.attrib["name"]] = ET.fromstring(archive.read(target))
        assert list(parsed_sheets)[HISTORICAL_COUNT] == SUMMARY
        assert book.find(tag("bookViews")).find(tag("workbookView")).attrib["activeTab"] == str(HISTORICAL_COUNT)
        assert book.find(tag("calcPr")).attrib["fullCalcOnLoad"] == "1"
        values = {name: {c.attrib["r"]: value(c) for c in sheet.iter(tag("c"))} for name, sheet in parsed_sheets.items()}
        formulas = []
        for cell in parsed_sheets[SUMMARY].iter(tag("c")):
            formula = cell.findtext(tag("f"))
            if formula is None:
                continue
            match = re.fullmatch(r"(COUNTA|COUNTIF)\('([^']+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)(?:,\"([^\"]+)\")?\)", formula)
            assert match, formula
            operation, name, column, start, end_column, end, criterion = match.groups()
            assert column == end_column
            rows = [values[name].get(column + str(i)) for i in range(int(start), int(end) + 1)]
            actual = sum(v not in [None, ""] for v in rows) if operation == "COUNTA" else rows.count(criterion)
            assert int(cell.findtext(tag("v"))) == actual, (formula, actual)
            formulas.append({"cell": cell.attrib["r"], "formula": formula, "cached": actual})
        for name, sheet in list(parsed_sheets.items())[HISTORICAL_COUNT:]:
            assert sheet.find(tag("autoFilter")) is not None
            assert sheet.find(tag("sheetViews")).find(tag("sheetView")).find(tag("pane")).attrib["ySplit"] == "4"
            if name != SUMMARY:
                links = sheet.find(tag("hyperlinks")); assert links is not None
                assert all(link.attrib["location"] == f"'{SUMMARY}'!A1" for link in links)
                assert SUMMARY in values[name]["A3"]
        return {"sheetNames": list(parsed_sheets), "originalSheetValuesFormulasTablesPreserved": True, "originalStylePrefixPreserved": True,
                "originalZipPartsByteIdentical": len(baseline.namelist()) - len(changed), "xmlPartsParsed": parsed,
                "formulas": formulas, "activeSheet": SUMMARY, "originalSheetsPreserved": HISTORICAL_COUNT}


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--request" not in args:
        raise SystemExit("Usage: build-excel-followup-v104.py [--inventory|--verify] --request file.json")
    at = args.index("--request"); payload = json.loads(Path(args[at + 1]).read_text(encoding="utf-8")); del args[at:at + 2]
    if args == ["--inventory"]:
        json.dump(old.inventory(payload), sys.stdout, ensure_ascii=False)
    elif args == ["--verify"]:
        json.dump(verify_workbook(payload), sys.stdout, ensure_ascii=False)
    elif not args:
        sys.stdout.buffer.write(build_workbook(payload))
    else:
        raise SystemExit("Unsupported V104 writer arguments")
