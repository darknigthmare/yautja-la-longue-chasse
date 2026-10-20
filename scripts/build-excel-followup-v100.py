#!/usr/bin/env python3
"""Append V100 sheets to a verified historical workbook using only stdlib.

All old worksheet/table/shared-string parts keep their original bytes. ZIP_STORED
avoids platform-specific compression bytes in the reproducible generated file.
No source text is interpreted as an Excel formula.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZIP_STORED, ZipFile, ZipInfo

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT = "http://schemas.openxmlformats.org/package/2006/content-types"
XML = "http://www.w3.org/XML/1998/namespace"
ET.register_namespace("x", NS)
ET.register_namespace("r", REL)
ET.register_namespace("pr", PKG_REL)
ET.register_namespace("ct", CONTENT)


def tag(name):
    return f"{{{NS}}}{name}"


def xml_bytes(element):
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def inventory(payload):
    result = []
    root = Path(payload["root"])
    for relative in payload["paths"]:
        data = (root / relative).read_bytes()
        with ZipFile(io.BytesIO(data)) as archive:
            workbook = ET.fromstring(archive.read("xl/workbook.xml"))
            names = [sheet.attrib["name"] for sheet in workbook.find(tag("sheets"))]
        result.append({"path": relative, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "sheets": names})
    return result


def column_name(index):
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


class Styles:
    def __init__(self, data):
        self.root = ET.fromstring(data)
        self.fonts = self.root.find(tag("fonts"))
        self.fills = self.root.find(tag("fills"))
        self.xfs = self.root.find(tag("cellXfs"))
        self.cache = {}
        self.regular = self.font("FF172C35", False, 11)
        self.white = self.font("FFFFFFFF", True, 11)
        self.title_font = self.font("FFFFFFFF", True, 18)
        self.muted = self.font("FF526775", False, 10)
        self.body = self.style()
        self.header = self.style("FF1E414B", self.white)
        self.title = self.style("FF142E37", self.title_font)
        self.subtitle = self.style("FFE4EBEC", self.muted)
        self.number = self.style(number=True)

    def font(self, color, bold, size):
        index = len(self.fonts)
        font = ET.SubElement(self.fonts, tag("font"))
        if bold:
            ET.SubElement(font, tag("b"))
        ET.SubElement(font, tag("sz"), {"val": str(size)})
        ET.SubElement(font, tag("color"), {"rgb": color})
        ET.SubElement(font, tag("name"), {"val": "Calibri"})
        self.fonts.set("count", str(len(self.fonts)))
        return index

    def style(self, fill="", font=None, number=False):
        font = self.regular if font is None else font
        key = (fill, font, number)
        if key in self.cache:
            return self.cache[key]
        fill_id = 0
        if fill:
            fill_id = len(self.fills)
            node = ET.SubElement(self.fills, tag("fill"))
            pattern = ET.SubElement(node, tag("patternFill"), {"patternType": "solid"})
            ET.SubElement(pattern, tag("fgColor"), {"rgb": fill})
            ET.SubElement(pattern, tag("bgColor"), {"indexed": "64"})
            self.fills.set("count", str(len(self.fills)))
        index = len(self.xfs)
        node = ET.SubElement(self.xfs, tag("xf"), {"numFmtId": "0", "fontId": str(font), "fillId": str(fill_id), "borderId": "0", "xfId": "0", "applyFont": "1", "applyFill": "1", "applyAlignment": "1"})
        ET.SubElement(node, tag("alignment"), {"vertical": "top", "wrapText": "1", **({"horizontal": "right"} if number else {})})
        self.xfs.set("count", str(len(self.xfs)))
        self.cache[key] = index
        return index

    def for_value(self, value):
        if isinstance(value, (int, float, bool, dict)):
            return self.number
        colors = {
            "EN_COURS": "FFFFE7B5", "A_VALIDER": "FFFFE7B5", "OUVERT": "FFF8D6D6",
            "ORIGINAL_MANQUANT": "FFF8D6D6", "MANQUANT": "FFF8D6D6",
            "VALIDE_CIBLE": "FFD6EFDF", "INTEGRE_LIBRE": "FFD6EFDF", "PRESENT_CONSERVE": "FFD6EFDF",
            "LIVRE_PARTIEL": "FFDCECF4", "HISTORIQUE": "FFE8E5ED", "NON_RECERTIFIE_V100": "FFE8E5ED",
            "MANQUANT_ART": "FFF8D6D6", "INCOMPLET": "FFFFE7B5", "NON_RACCORDE": "FFF8D6D6",
            "ADMIS_ETUDE": "FFDCECF4", "ADMIS_DEUX_SENS": "FFDCECF4", "ETUDE_SEULE": "FFDCECF4",
            "RACCORDE_VISUEL": "FFD6EFDF", "HISTORIQUE_LIE": "FFE8E5ED", "PNG_ADMIS_VERIFIE": "FFD6EFDF",
        }
        if value in colors:
            return self.style(colors[value])
        if isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            return self.style("FF" + value[1:].upper(), self.white)
        return self.body


def cell(row, index, value, style):
    reference = f"{column_name(index)}{row.attrib['r']}"
    node = ET.SubElement(row, tag("c"), {"r": reference, "s": str(style)})
    if isinstance(value, dict):
        # Only the generator's explicit formula objects reach this branch.
        if set(value) != {"formula", "cached"} or not isinstance(value["cached"], (int, float)):
            raise ValueError(f"Invalid trusted formula object at {reference}")
        ET.SubElement(node, tag("f")).text = value["formula"]
        ET.SubElement(node, tag("v")).text = str(value["cached"])
    elif isinstance(value, bool):
        node.set("t", "b")
        ET.SubElement(node, tag("v")).text = "1" if value else "0"
    elif isinstance(value, (int, float)):
        if not math.isfinite(value):
            raise ValueError(f"Non-finite number at {reference}")
        ET.SubElement(node, tag("v")).text = str(value)
    else:
        text = "" if value is None else str(value)
        if len(text) > 32767 or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text):
            raise ValueError(f"Text outside Excel/XML limits at {reference}")
        node.set("t", "inlineStr")
        inline = ET.SubElement(node, tag("is"))
        ET.SubElement(inline, tag("t"), {f"{{{XML}}}space": "preserve"}).text = text


def worksheet(spec, styles):
    columns, rows = spec["columns"], spec["rows"]
    last_col, last_row = column_name(len(columns)), len(rows) + 4
    root = ET.Element(tag("worksheet"))
    ET.SubElement(root, tag("dimension"), {"ref": f"A1:{last_col}{last_row}"})
    views = ET.SubElement(root, tag("sheetViews"))
    view = ET.SubElement(views, tag("sheetView"), {"workbookViewId": "0", "showGridLines": "0"})
    ET.SubElement(view, tag("pane"), {"ySplit": "4", "topLeftCell": "A5", "activePane": "bottomLeft", "state": "frozen"})
    ET.SubElement(view, tag("selection"), {"pane": "bottomLeft", "activeCell": "A5", "sqref": "A5"})
    ET.SubElement(root, tag("sheetFormatPr"), {"defaultRowHeight": "32"})
    col_nodes = ET.SubElement(root, tag("cols"))
    for index, column in enumerate(columns, 1):
        ET.SubElement(col_nodes, tag("col"), {"min": str(index), "max": str(index), "width": str(column["width"]), "customWidth": "1"})
    data = ET.SubElement(root, tag("sheetData"))
    for index, (text, style, height) in enumerate([(spec["title"], styles.title, 31), (spec["subtitle"], styles.subtitle, 43), ("Synthèse : SyntheseV100 · filtres ligne 4 · en-têtes figés", styles.subtitle, 22)], 1):
        row = ET.SubElement(data, tag("row"), {"r": str(index), "ht": str(height), "customHeight": "1"})
        for col in range(1, len(columns) + 1):
            cell(row, col, text if col == 1 else "", style)
    header = ET.SubElement(data, tag("row"), {"r": "4", "ht": "34", "customHeight": "1"})
    for index, column in enumerate(columns, 1):
        cell(header, index, column["label"], styles.header)
    for index, item in enumerate(rows, 5):
        row = ET.SubElement(data, tag("row"), {"r": str(index), "ht": "64" if len(columns) > 8 else "50", "customHeight": "1"})
        for col, column in enumerate(columns, 1):
            value = item.get(column["key"], "")
            cell(row, col, value, styles.for_value(value))
    ET.SubElement(root, tag("autoFilter"), {"ref": f"A4:{last_col}{last_row}"})
    merges = ET.SubElement(root, tag("mergeCells"), {"count": "3"})
    for row in range(1, 4):
        ET.SubElement(merges, tag("mergeCell"), {"ref": f"A{row}:{last_col}{row}"})
    if spec["name"] != "SyntheseV100":
        links = ET.SubElement(root, tag("hyperlinks"))
        ET.SubElement(links, tag("hyperlink"), {"ref": "A3", "location": "'SyntheseV100'!A1", "display": "Retour à la synthèse"})
    ET.SubElement(root, tag("pageMargins"), {"left": "0.25", "right": "0.25", "top": "0.5", "bottom": "0.5", "header": "0.3", "footer": "0.3"})
    return xml_bytes(root)


def build_workbook(payload):
    baseline_path = Path(payload["root"]) / payload["baseline"]["path"]
    baseline = baseline_path.read_bytes()
    if hashlib.sha256(baseline).hexdigest() != payload["baseline"]["sha256"]:
        raise ValueError("Historical baseline SHA-256 mismatch")
    with ZipFile(io.BytesIO(baseline)) as archive:
        parts = {info.filename: archive.read(info) for info in archive.infolist()}
    workbook = ET.fromstring(parts["xl/workbook.xml"])
    sheets = workbook.find(tag("sheets"))
    old_count = len(sheets)
    names = {sheet.attrib["name"] for sheet in sheets}
    relationships = ET.fromstring(parts["xl/_rels/workbook.xml.rels"])
    content_types = ET.fromstring(parts["[Content_Types].xml"])
    styles = Styles(parts["xl/styles.xml"])
    next_id = max(int(sheet.attrib["sheetId"]) for sheet in sheets) + 1
    for index, spec in enumerate(payload["sheets"], next_id):
        name = spec["name"]
        if name in names or len(name) > 31 or re.search(r"[\\/*?:\[\]]", name):
            raise ValueError(f"Invalid or duplicate worksheet name: {name}")
        names.add(name)
        filename = f"xl/worksheets/v100-sheet-{index}.xml"
        if filename in parts:
            raise ValueError("New sheet collides with an original ZIP part")
        rid = f"rIdV100Sheet{index}"
        if any(item.attrib.get("Id") == rid for item in relationships):
            raise ValueError("New relationship collides with original")
        ET.SubElement(sheets, tag("sheet"), {"name": name, "sheetId": str(index), f"{{{REL}}}id": rid})
        ET.SubElement(relationships, f"{{{PKG_REL}}}Relationship", {"Id": rid, "Type": f"{REL}/worksheet", "Target": filename.removeprefix("xl/")})
        ET.SubElement(content_types, f"{{{CONTENT}}}Override", {"PartName": "/" + filename, "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        parts[filename] = worksheet(spec, styles)
    views = workbook.find(tag("bookViews"))
    if views is None:
        views = ET.Element(tag("bookViews"))
        workbook.insert(list(workbook).index(sheets), views)
    view = views.find(tag("workbookView"))
    if view is None:
        view = ET.SubElement(views, tag("workbookView"))
    view.set("activeTab", str(old_count))
    calc = workbook.find(tag("calcPr"))
    if calc is None:
        calc = ET.SubElement(workbook, tag("calcPr"))
    calc.attrib.update({"calcMode": "auto", "fullCalcOnLoad": "1", "forceFullCalc": "1"})
    parts["xl/workbook.xml"] = xml_bytes(workbook)
    parts["xl/_rels/workbook.xml.rels"] = xml_bytes(relationships)
    parts["[Content_Types].xml"] = xml_bytes(content_types)
    parts["xl/styles.xml"] = xml_bytes(styles.root)
    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_STORED) as archive:
        for filename in sorted(parts):
            info = ZipInfo(filename, date_time=(2026, 10, 20, 0, 0, 0))
            info.compress_type = ZIP_STORED
            info.create_system = 0
            info.external_attr = 0o600 << 16
            archive.writestr(info, parts[filename])
    return output.getvalue()


def verify_workbook(payload):
    """Read the actual output independently of the writer's sheet specs."""
    def canonical(node):
        return (node.tag, sorted(node.attrib.items()), node.text or "", [canonical(child) for child in node])

    def value(node):
        if node is None:
            return None
        if node.attrib.get("t") == "inlineStr":
            return "".join(node.find(tag("is")).itertext())
        return node.findtext(tag("v"))

    old_bytes = (Path(payload["root"]) / payload["baseline"]["path"]).read_bytes()
    if hashlib.sha256(old_bytes).hexdigest() != payload["baseline"]["sha256"]:
        raise ValueError("Historical baseline SHA-256 mismatch")
    with ZipFile(io.BytesIO(old_bytes)) as old, ZipFile(payload["workbookPath"]) as new:
        assert new.testzip() is None
        assert len(new.namelist()) == len(set(new.namelist()))
        allowed = {"[Content_Types].xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml"}
        changed = [name for name in old.namelist() if old.read(name) != new.read(name)]
        assert set(changed) <= allowed, changed
        original_book = ET.fromstring(old.read("xl/workbook.xml"))
        book = ET.fromstring(new.read("xl/workbook.xml"))
        original_sheets = original_book.find(tag("sheets"))
        sheets = book.find(tag("sheets"))
        assert len(original_sheets) == 15
        assert [canonical(node) for node in original_sheets] == [canonical(node) for node in list(sheets)[:15]]
        original_styles = ET.fromstring(old.read("xl/styles.xml"))
        styles = ET.fromstring(new.read("xl/styles.xml"))
        for section in original_styles:
            extended = styles.find(section.tag)
            assert extended is not None
            assert [canonical(node) for node in section] == [canonical(node) for node in list(extended)[:len(section)]]
        parsed = 0
        for name in new.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(new.read(name))
                parsed += 1
            if not name.endswith(".rels"):
                continue
            base = "" if name == "_rels/.rels" else posixpath.join(posixpath.dirname(posixpath.dirname(name)), posixpath.basename(name)[:-5])
            for link in ET.fromstring(new.read(name)):
                if link.attrib.get("TargetMode") == "External":
                    continue
                target = link.attrib["Target"]
                target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(base), target))
                assert target in new.namelist(), (name, target)
        relationships = {node.attrib["Id"]: node.attrib["Target"] for node in ET.fromstring(new.read("xl/_rels/workbook.xml.rels"))}
        def sheet_path(sheet):
            target = relationships[sheet.attrib[f"{{{REL}}}id"]]
            return target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
        parsed_sheets = {sheet.attrib["name"]: ET.fromstring(new.read(sheet_path(sheet))) for sheet in sheets}
        assert list(parsed_sheets)[15] == "SyntheseV100"
        assert book.find(tag("bookViews")).find(tag("workbookView")).attrib["activeTab"] == "15"
        assert book.find(tag("calcPr")).attrib["fullCalcOnLoad"] == "1"
        values = {name: {cell.attrib["r"]: value(cell) for cell in sheet.iter(tag("c"))} for name, sheet in parsed_sheets.items()}
        formulas = []
        for cell in parsed_sheets["SyntheseV100"].iter(tag("c")):
            formula = cell.findtext(tag("f"))
            if formula is None:
                continue
            match = re.fullmatch(r"(COUNTA|COUNTIF)\('([^']+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)(?:,\"([^\"]+)\")?\)", formula)
            assert match, formula
            operation, sheet, column, start, end_column, end, criterion = match.groups()
            assert column == end_column
            rows = [values[sheet].get(column + str(index)) for index in range(int(start), int(end) + 1)]
            actual = sum(item not in [None, ""] for item in rows) if operation == "COUNTA" else rows.count(criterion)
            assert int(cell.findtext(tag("v"))) == actual, (formula, actual)
            formulas.append({"cell": cell.attrib["r"], "formula": formula, "cached": actual})
        for name, sheet in list(parsed_sheets.items())[15:]:
            assert sheet.find(tag("autoFilter")) is not None, name
            assert sheet.find(tag("sheetViews")).find(tag("sheetView")).find(tag("pane")).attrib["ySplit"] == "4", name
            links = sheet.find(tag("hyperlinks"))
            if name != "SyntheseV100":
                assert links is not None
                assert all(link.attrib["location"] == "'SyntheseV100'!A1" for link in links)
                assert "SyntheseV100" in values[name]["A3"]
        return {"sheetNames": list(parsed_sheets), "originalSheetValuesFormulasTablesPreserved": True, "originalStylePrefixPreserved": True,
                "originalZipPartsByteIdentical": len(old.namelist()) - len(changed), "xmlPartsParsed": parsed, "formulas": formulas,
                "activeSheet": "SyntheseV100", "originalSheetsPreserved": 15}


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--request" in args:
        position = args.index("--request")
        request = json.loads(Path(args[position + 1]).read_text())
        del args[position:position + 2]
    else:
        request = json.load(sys.stdin)
    if args == ["--inventory"]:
        json.dump(inventory(request), sys.stdout, ensure_ascii=False)
    elif args == ["--verify"]:
        json.dump(verify_workbook(request), sys.stdout, ensure_ascii=False)
    elif not args:
        sys.stdout.buffer.write(build_workbook(request))
    else:
        raise SystemExit("Usage: build-excel-followup-v100.py [--inventory] < request.json")
