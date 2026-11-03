"""Versioned workbook append/verification using the frozen V100 XML layout.

The baseline ZIP is treated as an immutable collection of parts. Only workbook
assembly metadata and an append-only style suffix may change. This helper never
runs a historical generator or a native spreadsheet calculation engine.
"""
import hashlib
import importlib.util
import io
from pathlib import Path
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZIP_STORED, ZipFile, ZipInfo

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("frozen_excel_layout_v100", Path(__file__).resolve().parents[1] / "build-excel-followup-v100.py")
layout = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(layout)
tag, xml_bytes = layout.tag, layout.xml_bytes
ASSEMBLY_PARTS = {"[Content_Types].xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml"}


def baseline_bytes(payload):
    data = (Path(payload["root"]) / payload["baseline"]["path"]).read_bytes()
    if hashlib.sha256(data).hexdigest() != payload["baseline"]["sha256"]:
        raise ValueError("Pinned historical workbook SHA-256 mismatch")
    return data


def worksheet(spec, styles, summary):
    sheet = ET.fromstring(layout.worksheet(spec, styles))
    text = sheet.find(f"{tag('sheetData')}/{tag('row')}[@r='3']/{tag('c')}[@r='A3']/{tag('is')}/{tag('t')}")
    text.text = text.text.replace("SyntheseV100", summary)
    links = sheet.find(tag("hyperlinks"))
    if links is not None:
        if spec["name"] == summary:
            sheet.remove(links)
        else:
            for link in links:
                link.set("location", f"'{summary}'!A1")
    return xml_bytes(sheet)


def build_workbook(payload):
    release, summary, historical = payload["release"], payload["summary"], payload["historicalCount"]
    if not re.fullmatch(r"V\d+", release) or summary != "Synthese" + release:
        raise ValueError("Explicit versioned worksheet namespace required")
    with ZipFile(io.BytesIO(baseline_bytes(payload))) as archive:
        parts = {item.filename: archive.read(item) for item in archive.infolist()}
    book = ET.fromstring(parts["xl/workbook.xml"])
    sheets = book.find(tag("sheets"))
    if len(sheets) != historical or not payload["sheets"] or payload["sheets"][0]["name"] != summary:
        raise ValueError("Historical sheet count or active appended summary mismatch")
    relationships = ET.fromstring(parts["xl/_rels/workbook.xml.rels"])
    content_types = ET.fromstring(parts["[Content_Types].xml"])
    styles, names = layout.Styles(parts["xl/styles.xml"]), {s.attrib["name"] for s in sheets}
    next_id = max(int(s.attrib["sheetId"]) for s in sheets) + 1
    for index, spec in enumerate(payload["sheets"], next_id):
        name = spec["name"]
        if not name or name in names or len(name) > 31 or re.search(r"[\\/*?:\[\]]", name):
            raise ValueError(f"Invalid or duplicate worksheet name: {name}")
        names.add(name)
        filename, rid = f"xl/worksheets/{release.lower()}-sheet-{index}.xml", f"rId{release}Sheet{index}"
        if filename in parts or any(item.attrib.get("Id") == rid for item in relationships):
            raise ValueError("Appended part collides with historical workbook")
        ET.SubElement(sheets, tag("sheet"), {"name": name, "sheetId": str(index), f"{{{layout.REL}}}id": rid})
        ET.SubElement(relationships, f"{{{layout.PKG_REL}}}Relationship", {"Id": rid, "Type": f"{layout.REL}/worksheet", "Target": filename.removeprefix("xl/")})
        ET.SubElement(content_types, f"{{{layout.CONTENT}}}Override", {"PartName": "/" + filename, "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        parts[filename] = worksheet(spec, styles, summary)
    views = book.find(tag("bookViews"))
    if views is None:
        views = ET.Element(tag("bookViews")); book.insert(list(book).index(sheets), views)
    view = views.find(tag("workbookView"))
    if view is None:
        view = ET.SubElement(views, tag("workbookView"))
    view.set("activeTab", str(historical))
    calc = book.find(tag("calcPr"))
    if calc is None:
        calc = ET.SubElement(book, tag("calcPr"))
    calc.attrib.update({"calcMode": "auto", "fullCalcOnLoad": "1", "forceFullCalc": "1"})
    parts.update({"xl/workbook.xml": xml_bytes(book), "xl/_rels/workbook.xml.rels": xml_bytes(relationships), "[Content_Types].xml": xml_bytes(content_types), "xl/styles.xml": xml_bytes(styles.root)})
    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_STORED) as archive:
        for filename in sorted(parts):
            item = ZipInfo(filename, date_time=tuple(payload["zipDate"]))
            item.compress_type = ZIP_STORED; item.create_system = 0; item.external_attr = 0o600 << 16
            archive.writestr(item, parts[filename])
    return output.getvalue()


def verify_workbook(payload):
    def canonical(node):
        return node.tag, sorted(node.attrib.items()), node.text or "", [canonical(c) for c in node]

    def value(cell):
        return "".join(cell.find(tag("is")).itertext()) if cell.attrib.get("t") == "inlineStr" else cell.findtext(tag("v"))

    historical, summary = payload["historicalCount"], payload["summary"]
    with ZipFile(io.BytesIO(baseline_bytes(payload))) as baseline, ZipFile(payload["workbookPath"]) as archive:
        assert archive.testzip() is None and len(archive.namelist()) == len(set(archive.namelist()))
        assert set(baseline.namelist()) <= set(archive.namelist())
        changed = [name for name in baseline.namelist() if baseline.read(name) != archive.read(name)]
        assert set(changed) <= ASSEMBLY_PARTS, changed
        previous = ET.fromstring(baseline.read("xl/workbook.xml"))
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        previous_sheets, sheets = previous.find(tag("sheets")), book.find(tag("sheets"))
        assert len(previous_sheets) == historical
        assert [canonical(s) for s in previous_sheets] == [canonical(s) for s in list(sheets)[:historical]]
        assert len({s.attrib["name"] for s in sheets}) == len(sheets)
        if payload.get("appendedSheets"):
            assert [s.attrib["name"] for s in list(sheets)[historical:]] == payload["appendedSheets"]
        for metadata in ["xl/_rels/workbook.xml.rels", "[Content_Types].xml"]:
            original, extended = ET.fromstring(baseline.read(metadata)), ET.fromstring(archive.read(metadata))
            assert [canonical(c) for c in original] == [canonical(c) for c in list(extended)[:len(original)]], metadata
        styles = ET.fromstring(archive.read("xl/styles.xml"))
        for section in ET.fromstring(baseline.read("xl/styles.xml")):
            extended = styles.find(section.tag)
            assert extended is not None and [canonical(c) for c in section] == [canonical(c) for c in list(extended)[:len(section)]]
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
            target = rels[sheet.attrib[f"{{{layout.REL}}}id"]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            parsed_sheets[sheet.attrib["name"]] = ET.fromstring(archive.read(target))
        assert list(parsed_sheets)[historical] == summary
        assert book.find(tag("bookViews")).find(tag("workbookView")).attrib["activeTab"] == str(historical)
        assert book.find(tag("calcPr")).attrib["fullCalcOnLoad"] == "1"
        values = {name: {c.attrib["r"]: value(c) for c in sheet.iter(tag("c"))} for name, sheet in parsed_sheets.items()}
        formulas = []
        for cell in parsed_sheets[summary].iter(tag("c")):
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
        for name, sheet in list(parsed_sheets.items())[historical:]:
            assert sheet.find(tag("autoFilter")) is not None
            assert sheet.find(tag("sheetViews")).find(tag("sheetView")).find(tag("pane")).attrib["ySplit"] == "4"
            if name != summary:
                assert all(link.attrib["location"] == f"'{summary}'!A1" for link in sheet.find(tag("hyperlinks")))
                assert summary in values[name]["A3"]
        return {"sheetNames": list(parsed_sheets), "originalSheetValuesFormulasTablesPreserved": True, "originalStylePrefixPreserved": True,
                "originalZipPartsByteIdentical": len(baseline.namelist()) - len(changed), "xmlPartsParsed": parsed,
                "formulas": formulas, "activeSheet": summary, "originalSheetsPreserved": historical}
