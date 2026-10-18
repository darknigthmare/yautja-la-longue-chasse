"""Read the provided V6 XLSX as XML, keeping the dialogue corpus unabridged."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import hashlib
import json
import posixpath
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
DRIVE_ID = "1kBa26-IY91k3uKughLaanIzUa57ZYAU3"
SHIP_SHEETS = {
    "Manifeste du navire", "Catalogue des vaisseaux", "Vaisseau personnel",
    "Les dix bases spatiales", "Soixante salles des bases", "Règles du navire de clan",
    "Ponts du navire de clan", "Équipage incarné", "Missions du navire",
    "V5 Arcs des bases spatiales", "V5 Manœuvres spatiales", "V5 Incidents de l’équipage",
    "Règles du Warp", "Époques du Warp", "Missions du Warp", "Direction musicale",
    "Réglages des simulateurs", "Gestion du clan", "Multijoueur futur",
}


def read_workbook(path=WORKBOOK):
    with ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("x:si", NS)]
        relationships = {
            element.attrib["Id"]: element.attrib["Target"]
            for element in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        }
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = []
        for element in workbook.findall("x:sheets/x:sheet", NS):
            name = element.attrib["name"]
            target = relationships[element.attrib["{" + REL + "}id"]]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            xml = ET.fromstring(archive.read(member))
            rows = []
            for row in xml.findall("x:sheetData/x:row", NS):
                cells = []
                for cell in row.findall("x:c", NS):
                    kind = cell.attrib.get("t", "n")
                    value_node = cell.find("x:v", NS)
                    value = value_node.text if value_node is not None else ""
                    if kind == "s" and value:
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(cell.find("x:is", NS).itertext())
                    elif kind == "b":
                        value = value == "1"
                    elif kind == "n" and value:
                        try:
                            numeric = float(value)
                            value = int(numeric) if numeric.is_integer() else numeric
                        except ValueError:
                            pass
                    formula = cell.find("x:f", NS)
                    if value not in ("", None) or formula is not None:
                        result = {"address": cell.attrib["r"], "value": value}
                        if formula is not None:
                            result["formula"] = formula.text or ""
                        cells.append(result)
                if cells:
                    rows.append({"number": int(row.attrib["r"]), "cells": cells})
            sheets.append({"name": name, "rows": rows})
    return sheets


if __name__ == "__main__":
    sheets = read_workbook()
    if "--describe" in sys.argv:
        for sheet in sheets:
            if "V6" in sheet["name"] or sheet["name"] in SHIP_SHEETS:
                print(json.dumps({"name": sheet["name"], "rowCount": len(sheet["rows"]), "firstRows": sheet["rows"][:8]}, ensure_ascii=True))
        sys.exit(0)
    source = {
        "workbook": WORKBOOK.name,
        "sha256": hashlib.sha256(WORKBOOK.read_bytes()).hexdigest(),
        "driveId": DRIVE_ID,
        "driveUrl": "https://drive.google.com/file/d/" + DRIVE_ID + "/view",
        "mode": "read-only-xml-no-formula-execution",
        "totalWorkbookSheets": len(sheets),
    }
    corpus = {"schemaVersion": 1, "source": source, "sheets": [sheet for sheet in sheets if "V6" in sheet["name"]]}
    ship = {"schemaVersion": 1, "source": source, "sheets": [sheet for sheet in sheets if sheet["name"] in SHIP_SHEETS]}
    # Public distribution of the complete Drive corpus requires explicit approval.
    # The default only prepares reviewable files inside this local workspace.
    publish = "--publish" in sys.argv
    source_directory = ROOT / "work-local/drive-import-20261007/bible-v6-private"
    source_directory.mkdir(parents=True, exist_ok=True)
    for filename, content in [("bible-dialogues.json", corpus), ("bible-ships.json", ship)]:
        data = (json.dumps(content, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        (source_directory / filename).write_bytes(data)
        if publish:
            public = ROOT / "public/game/dialogues/v85"
            public.mkdir(parents=True, exist_ok=True)
            (public / filename).write_bytes(data)
    receipt = {
        "source": source,
        "dialogueSheets": [{"name": sheet["name"], "rows": len(sheet["rows"]), "cells": sum(len(row["cells"]) for row in sheet["rows"])} for sheet in corpus["sheets"]],
        "shipSheets": [{"name": sheet["name"], "rows": len(sheet["rows"])} for sheet in ship["sheets"]],
        "audioRecordingsCreated": 0,
        "qaRun": False,
        "distribution": "public-approved" if publish else "private-review-only",
    }
    if publish:
        (public / "bible-dialogues-index.json").write_text(json.dumps(receipt, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (ROOT / "docs/bible-dialogues-v85-source.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=True))
