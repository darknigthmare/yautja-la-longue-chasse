#!/usr/bin/env python3
"""Read the delivered OOXML independently of its writer and check every cell."""
import importlib.util
import json
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as E
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("resume_source_model", Path(__file__).with_name("build-resume-workbook-20261101.py"))
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def main():
    assert len(sys.argv) == 1, "Usage: python3 scripts/verify-resume-workbook-20261101.py"
    inventory, expected_sheets = model.collect()
    assert json.loads((model.ROOT / model.INVENTORY).read_text()) == inventory
    checked, links = 0, 0
    with ZipFile(model.ROOT / model.OUTPUT) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) and archive.testzip() is None
        assert not any("vba" in n.lower() or n.endswith(".bin") for n in names)
        documents = {n: E.fromstring(archive.read(n)) for n in names}
        assert not any(node.tag == model.tag("f") for root in documents.values() for node in root.iter()), "No formulas admitted"
        workbook = documents["xl/workbook.xml"]
        sheets = list(workbook.find(model.tag("sheets")))
        assert [s.attrib["name"] for s in sheets] == [s[0] for s in expected_sheets]
        relationships = {r.attrib["Id"]: r.attrib["Target"] for r in documents["xl/_rels/workbook.xml.rels"]}
        for sheet, expected in zip(sheets, expected_sheets):
            filename = "xl/" + relationships[sheet.attrib["{" + model.REL + "}id"]]
            actual = documents[filename]
            expected_values = model.sheet_values(expected)
            rows = list(actual.find(model.tag("sheetData")))
            assert len(rows) == len(expected_values)
            for index, (row, expected_row) in enumerate(zip(rows, expected_values), 1):
                assert row.attrib["r"] == str(index)
                assert len(row) == len(expected_row)
                for c, (cell, wanted) in enumerate(zip(row, expected_row), 1):
                    assert cell.attrib["r"] == model.column(c) + str(index)
                    assert cell.attrib["t"] == "inlineStr", "Every value is literal text, including formula-like inputs"
                    text = "".join(cell.find(model.tag("is")).itertext())
                    assert text == model.serial(wanted), (sheet.attrib["name"], cell.attrib["r"])
                    checked += 1
            pane = actual.find(model.tag("sheetViews")).find(model.tag("sheetView")).find(model.tag("pane"))
            assert pane.attrib["xSplit"] == "2" and pane.attrib["ySplit"] == "4" and pane.attrib["state"] == "frozen"
            assert actual.find(model.tag("autoFilter")).attrib["ref"] == "A4:" + model.column(len(expected[2])) + str(len(expected_values))
            link_path = posixpath.dirname(filename) + "/_rels/" + posixpath.basename(filename) + ".rels"
            rels = {r.attrib["Id"]: r for r in documents[link_path]}
            for link in actual.findall(model.tag("hyperlinks") + "/" + model.tag("hyperlink")):
                target = rels[link.attrib["{" + model.REL + "}id"]]
                assert target.attrib["TargetMode"] == "External"
                url = target.attrib["Target"]
                assert url.startswith("https://") or url.startswith("../docs/") or url.startswith("../art-source/") or url.startswith("../scripts/")
                if url.startswith("../"):
                    assert (model.ROOT / "docs" / url).is_file(), url
                links += 1
        pr_rows = expected_sheets[1][3]
        assert len(pr_rows) == 33 and [r[1] for r in pr_rows].count(31) == 1
        assert not {64, 65} & {r[1] for r in pr_rows}
        summary = {r[0]: r for r in expected_sheets[0][3]}
        assert summary["LATE-64"][2] == summary["LATE-65"][2] == "NON_AUDITEE"
        event31 = [r for key, r in summary.items() if key.startswith("EVENT-") and '"number":31' in r[3]]
        assert len(event31) == 1 and event31[0][2] == "MERGED" and "81fc1916fc285ca85d3c434737bc35b1e5f2fb7f" in event31[0][3]
        event33 = json.loads(summary["EVENT-PR33-BASE"][3])
        initial33 = next(r for r in pr_rows if r[1] == 33)
        assert event33["baseBranch"] == "main" and event33["headSha"] == initial33[5]
        assert initial33[6] == "fix/v122-planet-v103-v115-types-20261030" and initial33[8] == 31
        source_events = json.loads((model.ROOT / model.SOURCES[0]).read_text())["progressAfterSnapshot"]
        recorded_events = [r for key, r in summary.items() if key.startswith("EVENT-") and key != "EVENT-PR33-BASE"]
        assert [json.loads(r[3]) for r in recorded_events] == source_events
        assert summary["HW-MARSH-EDGE"][2] == "OUVERT_NON_CORRIGE"
        opened = expected_sheets[4][3]
        requirements = [r for r in opened if r[1] == "EXIGENCE_SOURCE"]
        assert len(requirements) == 56 and all(r[3] == "OUVERT_SOURCE" for r in requirements)
        marsh = next(r for r in opened if r[0] == "HW-MARSH-EDGE")
        assert marsh[3] == "OUVERT_NON_CORRIGE" and marsh[-1] == model.OPEN_DIAGNOSTIC
    print(json.dumps({"status": "PASS_STRUCTURE_AND_SOURCE_DATA", "sheets": 5, "cellsChecked": checked,
                      "hyperlinksChecked": links, "snapshotPRs": 33, "dependencyEdges": 29,
                      "postSnapshotMergeKeptSeparate": 31, "lateUnauditedPRs": [64, 65],
                      "postSnapshotBaseChangeKeptSeparate": 33,
                      "datedProgressEvents": len(source_events), "marshEdgeDiagnostic": "OUVERT_NON_CORRIGE",
                      "sourceRequirementsOpen": 56, "formulas": 0, "macros": 0,
                      "nativeExcelExecuted": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
