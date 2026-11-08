#!/usr/bin/env python3
"""Verify the C-37 tracker from its saved ZIP/XML, without editing the XLSX.

Only verification-classeur.json receives the independent verification receipt.
Use --check to perform the same checks without updating that JSON receipt.
"""
from __future__ import annotations

import argparse
from decimal import Decimal
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "production/excel-bible-witnesses-20261108/suivi"
PREVIOUS = ROOT / "production/excel-bible-20261108/suivi"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
STATES = ["Oui", "Partiel", "Non", "À vérifier", "Bloqué", "Sans objet"]
PHASES = ["implementation", "domainTested", "ssrTested", "browserTested",
          "controllerTested", "humanArtReviewed"]
SUMMARY_CELLS = {"criteria": "B5", "domain": "D5", "ssr": "F5", "browser": "H5",
                 "closed": "J5", "historical": "B6", "tests": "D6", "failed": "F6"}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def qualify(phases):
    for marker, result in [("Bloqué", "Bloqué"), ("Non", "Ouvert"),
                           ("Partiel", "Partiel"), ("À vérifier", "À vérifier")]:
        if marker in phases:
            return result
    return "Attesté"


def qualification_formula(row):
    cells = f"C{row}:H{row}"
    return (f'IF(COUNTIFS({cells},"Bloqué")>0,"Bloqué",'
            f'IF(COUNTIFS({cells},"Non")>0,"Ouvert",'
            f'IF(COUNTIFS({cells},"Partiel")>0,"Partiel",'
            f'IF(COUNTIFS({cells},"À vérifier")>0,"À vérifier","Attesté"))))')


def check_fingerprint(item):
    path = ROOT / item["path"]
    assert path.stat().st_size == item["bytes"], f"Source size changed: {item['path']}"
    assert sha(path) == item["sha256"], f"Source hash changed: {item['path']}"


def xml_text(node):
    return "" if node is None else "".join(part.text or "" for part in node.findall(".//m:t", NS))


def member_target(owner, target):
    return target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(owner), target))


def relationships(archive, owner):
    filename = PurePosixPath(owner)
    member = str(filename.parent / "_rels" / (filename.name + ".rels"))
    return {node.attrib["Id"]: member_target(owner, node.attrib["Target"])
            for node in ET.fromstring(archive.read(member))}


def addresses(reference):
    """Expand bounded sqref ranges so exporter range partitioning is harmless."""
    result = set()
    for part in reference.split():
        match = re.fullmatch(r"([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?", part.replace("$", ""))
        assert match, reference
        first, start, last, end = match.groups()
        last, end = last or first, int(end or start)
        number = lambda name: sum((ord(char) - 64) * 26 ** index for index, char in enumerate(reversed(name)))
        for column in range(number(first), number(last) + 1):
            label, cursor = "", column
            while cursor:
                cursor, digit = divmod(cursor - 1, 26)
                label = chr(65 + digit) + label
            result.update(f"{label}{row}" for row in range(int(start), end + 1))
    return result


def verify():
    qualification = read_json(CURRENT / "qualification-audience.json")
    report = read_json(CURRENT / "verification-classeur.json")
    history = read_json(ROOT / report["protectedSourcesManifest"])
    inventory = read_json(PREVIOUS / "excel-inventory.json")["inventory"]
    register = read_json(PREVIOUS / "excel-open-register.json")["items"]
    artifact = ROOT / report["artifactPath"]
    artifact_hash = sha(artifact)
    assert qualification["readyForWorkbook"] is True
    assert report["qualificationSha256"] == sha(CURRENT / "qualification-audience.json")
    assert artifact_hash == report["artifactSha256"]
    assert report["runtimeReport"]["path"] == qualification["runtimeReport"]
    assert sha(ROOT / qualification["runtimeReport"]) == report["runtimeReport"]["sha256"]
    runtime = read_json(ROOT / qualification["runtimeReport"])
    assert runtime["tests"]["exitCode"] == runtime["tests"]["failed"] == 0
    assert runtime["tests"]["passed"] > 0
    assert runtime["build"]["exitCode"] == runtime["lint"]["exitCode"] == 0
    assert runtime["browser"]["validated"] is False
    assert runtime["controller"]["physicalDeviceValidated"] is False
    assert runtime["humanArtValidated"] is False
    assert report["browserValidated"] is report["physicalControllerValidated"] is report["humanArtValidated"] is False
    assert qualification["phases"] == report["phases"] == PHASES
    assert len(qualification["rows"]) == len(report["rows"]) == 12
    assert len({row["id"] for row in qualification["rows"]}) == 12
    assert (report["dataStart"], report["dataEnd"], report["sourceStart"]) == (13, 24, 6)
    assert report["sourceEnd"] == 5 + len(report["sourceRows"])
    assert len(inventory) == len(history["sourceWorkbooks"]) == report["sourceWorkbooksVerifiedUnchanged"] == 108
    original_fingerprints = [{key: item[key] for key in ("path", "sha256", "bytes")} for item in inventory]
    assert history["sourceWorkbooks"] == original_fingerprints
    assert history["baseCommit"] == qualification["baseCommit"] == report["baseCommit"]
    assert len(history["previousFiles"]) == report["previousFilesVerifiedUnchanged"] > 100
    for item in history["sourceWorkbooks"] + history["previousFiles"]:
        check_fingerprint(item)
        if "gitBlob" in item:
            data = (ROOT / item["path"]).read_bytes()
            assert hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() == item["gitBlob"], item["path"]

    source_rows = report["sourceRows"]
    references = qualification["sourceReferences"]
    assert len(source_rows) == len(references) + 108
    assert len({row["id"] for row in source_rows}) == len(source_rows)
    for actual, expected in zip(source_rows, references):
        assert all(actual[key] == value for key, value in expected.items()), expected["id"]
    for index, (actual, expected) in enumerate(zip(source_rows[len(references):], inventory), 1):
        assert actual["kind"] == "Classeur historique" and actual["id"] == f"H{index:03d}"
        assert all(actual[key] == expected[key] for key in ("path", "sha256", "bytes"))
    for source in source_rows:
        check_fingerprint(source)
    for source in report["sourceCriteria"]:
        assert source == next(item for item in register if item["key"] == source["key"])
    assert {source["key"] for source in report["sourceCriteria"]} == {"Clan Ship:OPS-B03", "Clan Ship:OPS-Q26"}

    checked_cells, table_receipts, pane_receipts = 0, [], {}
    with zipfile.ZipFile(artifact) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = [xml_text(node) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet_nodes = workbook.findall("m:sheets/m:sheet", NS)
        assert [node.attrib["name"] for node in sheet_nodes] == report["sheets"] == ["Audience", "Sources"]
        sheet_targets = relationships(archive, "xl/workbook.xml")
        sheets = {}
        for node in sheet_nodes:
            name = node.attrib["name"]
            member = sheet_targets[node.attrib[f"{{{NS['r']}}}id"]]
            tree = ET.fromstring(archive.read(member))
            data = {}
            for cell in tree.findall("m:sheetData/m:row/m:c", NS):
                address, kind = cell.attrib["r"], cell.attrib.get("t", "n")
                assert kind != "e", f"{name}!{address}: Excel error"
                value = cell.findtext("m:v", default="", namespaces=NS)
                if kind == "s":
                    value = strings[int(value)]
                elif kind == "inlineStr":
                    value = xml_text(cell.find("m:is", NS))
                data[address] = {"value": value, "formula": cell.findtext("m:f", default="", namespaces=NS),
                                 "style": int(cell.attrib.get("s", 0)), "type": kind}
            sheets[name] = (tree, data)
            pane = tree.find("m:sheetViews/m:sheetView/m:pane", NS)
            expected_y = 12 if name == "Audience" else 5
            assert pane is not None and pane.attrib.get("state") == "frozen", name
            assert Decimal(pane.attrib.get("xSplit", "0")) == 2 and Decimal(pane.attrib.get("ySplit", "0")) == expected_y, (name, pane.attrib)
            assert pane.attrib.get("topLeftCell") == f"C{expected_y + 1}", (name, pane.attrib)
            pane_receipts[name] = dict(pane.attrib)
            expected_range = "A12:K24" if name == "Audience" else f"A5:F{report['sourceEnd']}"
            parts = tree.findall("m:tableParts/m:tablePart", NS)
            assert len(parts) == 1, name
            targets = relationships(archive, member)
            table_member = targets[parts[0].attrib[f"{{{NS['r']}}}id"]]
            table = ET.fromstring(archive.read(table_member))
            assert table.attrib["ref"] == expected_range, name
            auto_filter = table.find("m:autoFilter", NS)
            assert auto_filter is not None and auto_filter.attrib["ref"] == expected_range, name
            assert all(child.attrib.get("hiddenButton", "0") != "1" and child.attrib.get("showButton", "1") != "0" for child in auto_filter), name
            table_receipts.append({"sheet": name, "name": table.attrib["name"], "range": expected_range, "filter": True})

        audience_tree, audience = sheets["Audience"]
        _, sources = sheets["Sources"]

        def check_cell(data, address, expected, formula=""):
            nonlocal checked_cells
            actual = data.get(address)
            assert actual is not None, address
            assert actual["formula"] == formula, (address, actual["formula"], formula)
            if isinstance(expected, int):
                assert actual["type"] in ("n", "") and Decimal(actual["value"]) == expected, (address, actual, expected)
            else:
                assert actual["value"] == expected, (address, actual, expected)
            checked_cells += 1

        expected_results = []
        for index, (row, receipt) in enumerate(zip(qualification["rows"], report["rows"]), 13):
            phases = [row[phase] for phase in PHASES]
            assert all(phase in STATES for phase in phases)
            assert row["sourceKey"] in {source["key"] for source in report["sourceCriteria"]}
            assert all(item in {source["id"] for source in references} for item in row["evidence"])
            result = qualify(phases)
            expected_results.append(result)
            expected_receipt = {"row": index, "id": row["id"], "sourceKey": row["sourceKey"], "criterion": row["criterion"],
                                "expectedPhases": phases, "evidence": " · ".join(row["evidence"]), "remaining": row["remaining"], "expectedQualification": result}
            assert receipt == expected_receipt, row["id"]
            values = [row["id"], row["criterion"], *phases, result, expected_receipt["evidence"], row["remaining"]]
            for column, expected in zip("ABCDEFGHIJK", values):
                check_cell(audience, f"{column}{index}", expected, qualification_formula(index) if column == "I" else "")

        expected_summary = {"criteria": 12,
                            "domain": sum(row["domainTested"] == "Oui" for row in qualification["rows"]),
                            "ssr": sum(row["ssrTested"] == "Oui" for row in qualification["rows"]),
                            "browser": sum(row["browserTested"] == "Oui" for row in qualification["rows"]),
                            "closed": expected_results.count("Attesté"), "historical": 108,
                            "tests": runtime["tests"]["passed"], "failed": runtime["tests"]["failed"]}
        assert report["summaryCells"] == SUMMARY_CELLS
        assert report["expectedSummary"] == report["actualSummary"] == expected_summary
        summary_formulas = {"B5": "COUNTA(A13:A24)", "D5": 'COUNTIFS(D13:D24,"Oui")',
                            "F5": 'COUNTIFS(E13:E24,"Oui")', "H5": 'COUNTIFS(F13:F24,"Oui")',
                            "J5": 'COUNTIFS(I13:I24,"Attesté")',
                            "B6": f'COUNTIFS(\'Sources\'!A6:A{report["sourceEnd"]},"Classeur historique")'}
        for key, cell in SUMMARY_CELLS.items():
            check_cell(audience, cell, expected_summary[key], summary_formulas.get(cell, ""))

        validation_cells = set()
        for validation in audience_tree.findall("m:dataValidations/m:dataValidation", NS):
            assert validation.attrib.get("type") == "list"
            assert validation.findtext("m:formula1", namespaces=NS) == '"' + ",".join(STATES) + '"'
            validation_cells.update(addresses(validation.attrib["sqref"]))
        expected_phase_cells = addresses("C13:H24")
        assert validation_cells == expected_phase_cells, "Editable phase validation range"
        styles = ET.fromstring(archive.read("xl/styles.xml"))
        fills, formats = styles.findall("m:fills/m:fill", NS), styles.findall("m:cellXfs/m:xf", NS)
        for address in expected_phase_cells:
            fill = fills[int(formats[audience[address]["style"]].attrib["fillId"])]
            pattern = fill.find("m:patternFill", NS)
            assert pattern is not None and pattern.attrib.get("patternType") == "solid", address
            color = pattern.find("m:fgColor", NS)
            assert color is not None and color.attrib.get("rgb", "").upper()[-6:] == "FFF0CC", address
        assert audience_tree.find("m:sheetProtection", NS) is None, "Editable phases must remain accessible"
        status_rules = set()
        for formatting in audience_tree.findall("m:conditionalFormatting", NS):
            if addresses(formatting.attrib["sqref"]) == addresses("I13:I24"):
                status_rules.update(rule.attrib.get("text") for rule in formatting.findall("m:cfRule", NS))
        assert status_rules == {"Bloqué", "Ouvert", "Partiel", "À vérifier", "Attesté"}, status_rules

        for index, row in enumerate(source_rows, 6):
            for column, key in zip("ABCDEF", ["kind", "id", "path", "sha256", "bytes", "detail"]):
                check_cell(sources, f"{column}{index}", row[key])

    phase_tests = report["phaseTests"]
    assert len(phase_tests) == 5
    assert {test["expected"] for test in phase_tests} == {"Attesté", "Partiel", "À vérifier", "Ouvert", "Bloqué"}
    for test in phase_tests:
        assert len(test["values"]) == 6 and all(value in STATES for value in test["values"])
        assert qualify(test["values"]) == test["actual"] == test["expected"]
    assert sha(artifact) == artifact_hash, "Workbook changed during read-only verification"
    return report, {
        "passed": True, "verifier": "scripts/verify-excel-bible-witnesses-20261108.py", "verifierSha256": sha(Path(__file__)),
        "artifactSha256": artifact_hash, "workbookBytesUnchanged": True, "sourcesUnchanged": 108,
        "previousFilesUnchanged": len(history["previousFiles"]), "sourceRowsCompared": len(source_rows),
        "evidenceFingerprintsVerified": len(references), "cellsCompared": checked_cells, "qualifiedRows": 12,
        "qualificationFormulaCaches": expected_results, "summaryCaches": expected_summary,
        "summaryFormulaCells": list(summary_formulas), "phaseInputsVerified": len(expected_phase_cells),
        "phaseRecalculationScenariosRecorded": 5, "errorCells": 0, "tables": table_receipts, "frozenPanes": pane_receipts,
        "scope": "XML, formules et caches exportés, phases modifiables et sources. Les scénarios de recalcul proviennent du builder Artifact Tool. Ce contrôle ne valide ni Excel natif ni le parcours navigateur du jeu.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without updating the JSON receipt")
    args = parser.parse_args()
    report, result = verify()
    if not args.check:
        receipt_path = CURRENT / "verification-classeur.json"
        # Preserve the separately owned visual-review fields if reviewed while
        # these read-only source and XML checks were running.
        latest = read_json(receipt_path)
        assert latest["artifactSha256"] == report["artifactSha256"]
        assert latest["qualificationSha256"] == report["qualificationSha256"]
        assert latest["runtimeReport"] == report["runtimeReport"]
        latest["independentXmlVerification"] = result
        receipt_path.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
