#!/usr/bin/env python3
"""Read-only ZIP/XML verification of the continuation workbook and its sources."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = ROOT / "production/excel-bible-20261108/suivi"
CURRENT = ROOT / "production/excel-bible-suite-20261108/suivi"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def read(name: str, base: Path = CURRENT):
    return json.loads((base / name).read_text())


def sha(filename: Path):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


qualification = read("qualification-suite.json")
inventory = read("excel-inventory.json", PREVIOUS)
register = read("excel-open-register.json", PREVIOUS)
campaign = read("bible-campagne-revisee.json", PREVIOUS)
history = read("historique-preserve.json")
report = read("verification-classeur.json")
artifact = CURRENT / "Yautja_Suite_Excel_Bible_20261108.xlsx"
assert qualification["readyForWorkbook"] and qualification["validation"]["status"] == "complete"
assert sha(artifact) == report["artifactSha256"]
assert sha(CURRENT / "qualification-suite.json") == report["qualificationSha256"]
assert qualification["validation"] == report["runtimeValidation"]
for evidence in report["evidenceFingerprints"]:
    assert sha(ROOT / evidence["path"]) == evidence["sha256"], evidence["path"]
    assert (ROOT / evidence["path"]).stat().st_size == evidence["bytes"], evidence["path"]
assert len(inventory["inventory"]) == 108
for item in inventory["inventory"] + history["files"]:
    source = ROOT / item["path"]
    assert source.stat().st_size == item["bytes"], item["path"]
    assert sha(source) == item["sha256"], item["path"]

with zipfile.ZipFile(artifact) as archive:
    strings = []
    if "xl/sharedStrings.xml" in archive.namelist():
        strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheet_names = [node.attrib["name"] for node in workbook.findall("m:sheets/m:sheet", NS)]
    assert sheet_names == ["Suite", "Sources"], sheet_names
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {node.attrib["Id"]: node.attrib["Target"] for node in relationships}
    sheets = {}
    for node in workbook.findall("m:sheets/m:sheet", NS):
        target = targets[node.attrib[f"{{{NS['r']}}}id"]]
        member = target.lstrip("/") if target.startswith("/") else "xl/" + target
        tree = ET.fromstring(archive.read(member))
        data = {}
        for cell in tree.findall("m:sheetData/m:row/m:c", NS):
            address = cell.attrib["r"]
            assert cell.attrib.get("t") != "e", f"{node.attrib['name']}!{address}: Excel error"
            value = cell.findtext("m:v", default="", namespaces=NS)
            if cell.attrib.get("t") == "s":
                value = strings[int(value)]
            elif cell.attrib.get("t") == "inlineStr":
                value = "".join(cell.find("m:is", NS).itertext())
            data[address] = (value, cell.findtext("m:f", default="", namespaces=NS))
        sheets[node.attrib["name"]] = (tree, data)

    suite_tree, suite = sheets["Suite"]
    assert suite["A8"][0] == qualification["validation"]["summary"]
    assert suite["A9"][0] == qualification["validation"]["browserSummary"]
    phases = ["generated", "integrated", "behaviorTested", "browserTested", "humanArtReview"]
    checked_cells = 0
    for index, row in enumerate(qualification["rows"], 13):
        if row["sourceKind"] == "excel":
            source = next(item for item in register["items"] if item["key"] == row["sourceKey"])
            criterion = source["criterion"]
            references = [f"{item['path']} | {item['sheet']}!{item['row']}" for item in source["sources"]]
        else:
            sources = [item for item in campaign["items"] if item["nativeId"] == row["sourceKey"] and item["kind"] == "Paragraphe"]
            criterion = "\n".join(item["content"] for item in sources)
            references = [f"{item['source']}:{item['sourceLine']}–{item['sourceEndLine']}" for item in sources]
        phase_values = [row[phase] for phase in phases]
        result = "Ouvert" if "Non" in phase_values else "Partiel" if "Partiel" in phase_values else "À vérifier" if "À vérifier" in phase_values else "Périmètre attesté"
        values = [row["id"], row["kind"], row["title"], criterion, row["implementation"],
                  *phase_values, result, row["remaining"], "\n".join(row["evidence"]), "\n".join(references)]
        for offset, expected in enumerate(values):
            address = f"{chr(65 + offset)}{index}"
            assert suite.get(address, ("", ""))[0] == expected, (address, suite.get(address), expected)
            checked_cells += 1
        assert suite[f"K{index}"][1].startswith("IF(COUNTIFS("), f"Missing qualification formula: K{index}"
    expected_summary = {
        "B5": len([row for row in qualification["rows"] if row["kind"] == "Raccord"]),
        "D5": len([row for row in qualification["rows"] if row["kind"] == "Raccord" and row["behaviorTested"] == "Oui"]),
        "B6": 108,
        "D6": len([row for row in qualification["rows"] if row["kind"] == "Raccord" and row["browserTested"] == "Oui"]),
    }
    for address, expected in expected_summary.items():
        assert float(suite[address][0]) == expected and suite[address][1], (address, suite[address], expected)
    validation_ranges = {node.attrib.get("sqref") for node in suite_tree.findall("m:dataValidations/m:dataValidation", NS)}
    assert f"F13:J{12 + len(qualification['rows'])}" in validation_ranges, validation_ranges
    _, sources_sheet = sheets["Sources"]
    sources_expected = [
        ("Classeur historique", item["path"], item["sha256"], item["bytes"]) for item in inventory["inventory"]
    ] + [("Suivi précédent", item["path"], item["sha256"], item["bytes"]) for item in history["files"]]
    for index, source in enumerate(sources_expected, 6):
        for offset, expected in enumerate(source):
            address = f"{chr(65 + offset)}{index}"
            actual = sources_sheet[address][0]
            assert float(actual) == expected if isinstance(expected, int) else actual == expected, (address, actual, expected)
            checked_cells += 1

report["independentXmlVerification"] = {
    "passed": True,
    "sourcesUnchanged": 108,
    "previousFilesUnchanged": len(history["files"]),
    "cellsCompared": checked_cells,
    "qualifiedRows": len(qualification["rows"]),
    "summaryCaches": expected_summary,
    "errorCells": 0,
    "evidenceFingerprintsVerified": len(report["evidenceFingerprints"]),
    "scope": "Classeur, phases et sources. Aucun comportement de jeu ou parcours navigateur ajouté par ce contrôle.",
}
(CURRENT / "verification-classeur.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report["independentXmlVerification"], ensure_ascii=False))
