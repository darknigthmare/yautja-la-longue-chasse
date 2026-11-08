#!/usr/bin/env python3
"""Read-only XLSX export QA; never edits a workbook or its source files."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "production/excel-bible-20261108/suivi"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def load(name):
    return json.loads((DIR / name).read_text())


def main():
    filename = DIR / "Yautja_Suivi_Excel_Bible_20261108.xlsx"
    excel = load("excel-open-register.json")
    bible = load("bible-requirements.json")
    campaign = load("bible-campagne-revisee.json")
    inventory = load("excel-inventory.json")
    qualification = load("qualification-courante.json")
    checked = 0
    with zipfile.ZipFile(filename) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(t.text or "" for t in item.findall(".//m:t", NS))
                       for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet_names = [item.attrib["name"] for item in workbook.find("m:sheets", NS)]
        assert sheet_names == ["Avancement", "Livraison", "Ouverts Excel", "Bible V6",
                               "Bible campagne", "Recettes bible", "Sources", "Méthode"], sheet_names
        sheets = {}
        errors, formulas = [], []
        for index, name in enumerate(sheet_names, 1):
            xml = ET.fromstring(archive.read(f"xl/worksheets/sheet{index}.xml"))
            cells = {}
            for cell in xml.findall(".//m:sheetData/m:row/m:c", NS):
                address = cell.attrib["r"]
                value = cell.find("m:v", NS)
                text = value.text if value is not None and value.text is not None else ""
                if cell.attrib.get("t") == "s":
                    text = strings[int(text)]
                elif cell.attrib.get("t") == "inlineStr":
                    text = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                elif cell.attrib.get("t") == "e":
                    errors.append({"sheet": name, "cell": address, "error": text})
                formula = cell.find("m:f", NS)
                if formula is not None:
                    formulas.append({"sheet": name, "cell": address, "formula": formula.text,
                                     "cachedValue": text})
                    assert text, (name, address, "missing formula cache")
                cells[address] = text
            sheets[name] = cells
        assert not errors, errors

        def expect(sheet, address, value):
            nonlocal checked
            actual = sheets[sheet].get(address, "")
            assert actual == str(value), (sheet, address, actual[:180], str(value)[:180])
            checked += 1

        for row, item in enumerate(excel["items"], 6):
            current = {**item, **qualification["sourceOverrides"].get(item["key"],
                        qualification["sourceOverrides"].get(item["id"], {}))}
            for column, value in {"A": item["id"], "B": item["domain"], "C": item["scope"],
                                  "F": item["criterion"], "H": item["sourceStatus"],
                                  "E": current["reconciliation"], "G": current["remaining"]}.items():
                expect("Ouverts Excel", f"{column}{row}", value)
        for row, item in enumerate(bible["items"], 6):
            for column, value in {"A": item["id"], "E": item["criterion"],
                                  "I": item["source"]["path"]}.items():
                expect("Bible V6", f"{column}{row}", value)
        for row, item in enumerate(campaign["items"], 6):
            override = qualification.get("campaignOverrides", {}).get(item["nativeId"],
                        qualification["criteriaOverrides"].get(item["nativeId"], {}))
            current = {**item, **override}
            for column, value in {"A": item["id"], "B": item["nativeId"], "F": item["content"],
                                  "H": current["currentStatus"],
                                  "K": f'{item["source"]}:{item["sourceLine"]}–{item["sourceEndLine"]}'}.items():
                expect("Bible campagne", f"{column}{row}", value)
        for row, item in enumerate(bible["annexCriteria"], 6):
            current = {**item, **qualification["criteriaOverrides"].get(item["id"], {})}
            for column, value in {"A": item["id"], "F": item["criterion"],
                                  "E": current["currentStatus"]}.items():
                expect("Recettes bible", f"{column}{row}", value)
        for row, item in enumerate(inventory["inventory"], 6):
            expect("Sources", f"A{row}", item["path"])
            expect("Sources", f"H{row}", item["sha256"])
            assert hashlib.sha256((ROOT / item["path"]).read_bytes()).hexdigest() == item["sha256"]
        for item in campaign["inventory"]:
            assert hashlib.sha256((ROOT / item["path"]).read_bytes()).hexdigest() == item["sha256"]
        for row, item in enumerate(qualification["deliveries"], 6):
            expect("Livraison", f"A{row}", item["id"])
            phases = [item[k] for k in ("generated", "integrated", "behaviorTested", "browserTested", "humanArtReview")]
            for column, value in zip("GHIJK", phases):
                expect("Livraison", f"{column}{row}", value)
            state = "Ouvert" if "Non" in phases else "Partiel" if "Partiel" in phases else "À vérifier" if "À vérifier" in phases else "Périmètre attesté"
            expect("Livraison", f"L{row}", state)
        counts = [108, 2896, 824, len(excel["items"]), len(bible["items"]),
                  len(bible["annexCriteria"]), len(campaign["items"])]
        for row, value in enumerate(counts, 6):
            expect("Avancement", f"B{row}", value)

    report = load("verification-classeur.json")
    report["independentExportCheck"] = {
        "method": "Read-only ZIP/XML standard library; full IDs and source texts compared against JSON inputs",
        "checkedCells": checked,
        "formulaCellsWithCachedValues": len(formulas),
        "errorCells": errors,
        "allSourceSubjectCriteriaCompared": len(excel["items"]),
        "allBibleCardCriteriaCompared": len(bible["items"]),
        "allCampaignBlocksCompared": len(campaign["items"]),
        "allAnnexCriteriaCompared": len(bible["annexCriteria"]),
        "originalWorkbookHashesUnchanged": len(inventory["inventory"]),
        "campaignDocumentAndManifestHashesUnchanged": len(campaign["inventory"]),
        "summaryCountsAndDeliveryFormulaCachesVerified": True,
    }
    report["artifactSha256"] = hashlib.sha256(filename.read_bytes()).hexdigest()
    (DIR / "verification-classeur.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report["independentExportCheck"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
