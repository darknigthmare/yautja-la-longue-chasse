#!/usr/bin/env python3
"""Find explicit P3 cells in versioned OpenXML workbooks without modifying them."""

import hashlib
import json
import posixpath
import re
import subprocess
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
PRIORITY_HEADERS = {"priorite", "priorite source", "priority", "source priority"}
ID_HEADERS = {"id", "identifiant", "exigence", "exigence source", "code", "source id"}
STATUS_HEADERS = {"statut", "etat", "status", "statut source", "source status"}


def word(value):
    letters = unicodedata.normalize("NFKD", value.strip().casefold())
    return " ".join("".join(c if c.isalnum() else " " for c in letters).split())


def text_nodes(node):
    return "".join(item.text or "" for item in node.iter(NS + "t"))


def cell_value(cell, shared):
    kind = cell.get("t")
    if kind == "inlineStr":
        return text_nodes(cell)
    value = cell.findtext(NS + "v") or ""
    return shared[int(value)] if kind == "s" and value else value


def workbook_inventory(path, expected_blob):
    raw = Path(path).read_bytes()
    object_hash = hashlib.sha1(f"blob {len(raw)}\0".encode("ascii") + raw).hexdigest()
    if object_hash != expected_blob:
        raise ValueError(f"{path}: identité Git inattendue {object_hash}.")

    matches = []
    sheet_rows = {}
    with ZipFile(path) as package:
        root = ET.fromstring(package.read("xl/workbook.xml"))
        relationships = ET.fromstring(package.read("xl/_rels/workbook.xml.rels"))
        targets = {node.get("Id"): node.get("Target") for node in relationships}
        shared = []
        if "xl/sharedStrings.xml" in package.namelist():
            values = ET.fromstring(package.read("xl/sharedStrings.xml"))
            shared = [text_nodes(node) for node in values.iter(NS + "si")]

        for sheet in root.iter(NS + "sheet"):
            name = sheet.attrib["name"]
            target = targets[sheet.attrib[REL]]
            if not target:
                raise ValueError(f"{path}: feuille illisible {name}.")
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            document = ET.fromstring(package.read(member))
            headers = {}
            count = 0
            for row in document.iter(NS + "row"):
                count += 1
                cells = {
                    cell.attrib["r"]: cell_value(cell, shared)
                    for cell in row.findall(NS + "c") if "r" in cell.attrib
                }
                if any(word(value) in PRIORITY_HEADERS for value in cells.values()):
                    headers = {re.sub(r"\d+$", "", key): word(value) for key, value in cells.items()}
                location = row.attrib.get("r")
                for address, value in cells.items():
                    if value.strip().upper() != "P3":
                        continue
                    column = re.sub(r"\d+$", "", address)
                    record = {
                        "sheet": name, "cell": address,
                        "priorityHeader": headers.get(column) in PRIORITY_HEADERS,
                    }
                    for field, names in [("id", ID_HEADERS), ("status", STATUS_HEADERS)]:
                        candidates = [
                            cells.get(header_col + location, "")
                            for header_col, title in headers.items()
                            if title in names and location
                        ]
                        if any(candidates):
                            record[field] = next(x for x in candidates if x)[:160]
                    matches.append(record)
            sheet_rows[name] = count

    return {
        "path": path, "gitBlobSha": object_hash, "bytes": len(raw),
        "sheets": len(sheet_rows), "rows": sum(sheet_rows.values()),
        "p3Cells": matches,
    }


def main(output, source_commit, spec):
    sources = json.loads(spec)
    results = [workbook_inventory(item["path"], item["sha"]) for item in sources]
    report = {
        "schemaVersion": 1,
        "sourceCommit": source_commit,
        "auditCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "scope": "Valeurs exactes des cellules OpenXML, y compris chaînes partagées. Une référence P3 hors colonne de priorité reste à vérifier.",
        "workbooks": results,
    }
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main(*sys.argv[1:])
