#!/usr/bin/env python3
"""Append V99 sheets to a verified historical workbook using only stdlib.

All old worksheet/table/shared-string parts keep their original bytes. ZIP_STORED
avoids platform-specific compression bytes in the reproducible generated file.
No source text is interpreted as an Excel formula.
"""
import hashlib
import io
import json
import math
from pathlib import Path
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
            "LIVRE_PARTIEL": "FFDCECF4", "HISTORIQUE": "FFE8E5ED", "NON_RECERTIFIE_V99": "FFE8E5ED",
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
    for index, (text, style, height) in enumerate([(spec["title"], styles.title, 31), (spec["subtitle"], styles.subtitle, 43), ("Synthèse : SyntheseV99 · filtres ligne 4 · en-têtes figés", styles.subtitle, 22)], 1):
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
    if spec["name"] != "SyntheseV99":
        links = ET.SubElement(root, tag("hyperlinks"))
        ET.SubElement(links, tag("hyperlink"), {"ref": "A3", "location": "'SyntheseV99'!A1", "display": "Retour à la synthèse"})
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
        filename = f"xl/worksheets/v99-sheet-{index}.xml"
        if filename in parts:
            raise ValueError("New sheet collides with an original ZIP part")
        rid = f"rIdV99Sheet{index}"
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
    elif not args:
        sys.stdout.buffer.write(build_workbook(request))
    else:
        raise SystemExit("Usage: build-excel-followup-v99.py [--inventory] < request.json")
