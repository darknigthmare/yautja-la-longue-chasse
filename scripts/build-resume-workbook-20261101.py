#!/usr/bin/env python3
"""Deterministic coordination workbook; stdlib only, separate from game freezes."""
import argparse
from collections import Counter
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
import xml.etree.ElementTree as E
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = "docs/suivi-production/resume-20261101"
OUTPUT = "docs/YAUTJA_REPRISE_CHANTIERS_20261101.xlsx"
INVENTORY = DIRECTORY + "/EXCEL-INVENTORY.json"
SOURCES = [DIRECTORY + "/PR-STACKS.json", DIRECTORY + "/PR_INVENTORY.json",
           "docs/v112-open-workstreams-audit.json"]
LATER_EVENT = DIRECTORY + "/PR33-RETARGET-EVENT.json"
OPEN_DIAGNOSTIC = "docs/qa/homeworld-marsh-edge-diagnostic-20261101/README.md"
MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT = "http://schemas.openxmlformats.org/package/2006/content-types"
XML = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
E.register_namespace("", MAIN)
E.register_namespace("r", REL)


def tag(name):
    return "{" + MAIN + "}" + name


def xml(node):
    return XML + E.tostring(node, encoding="utf-8")


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def serial(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "OUI" if value else "NON"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value)


def fingerprint(file):
    data = (ROOT / file).read_bytes()
    return {"path": file, "bytes": len(data), "sha256": sha256(data).hexdigest()}


def local_workbooks():
    files = sorted({p.relative_to(ROOT).as_posix() for directory in ["docs", "art-source"]
                    for p in (ROOT / directory).rglob("*.xlsx")
                    if p.is_file() and p.relative_to(ROOT).as_posix() != OUTPUT})
    result = []
    for file in files:
        data = (ROOT / file).read_bytes()
        with ZipFile(BytesIO(data)) as archive:
            if archive.testzip() is not None:
                raise ValueError("Invalid source workbook CRC: " + file)
            book = E.fromstring(archive.read("xl/workbook.xml"))
            names = [s.attrib["name"] for s in book.find(tag("sheets"))]
        result.append({"id": "LOCAL-" + str(len(result) + 1).zfill(3),
                       "observation": "OCTETS_LOCAUX_LUS", "path": file,
                       "bytes": len(data), "sha256": sha256(data).hexdigest(),
                       "worksheets": len(names), "sheetNames": names})
    return result


def inventory_model(stacks):
    remote = []
    for index, row in enumerate(stacks["pinnedWorkbookZipObservations"]["workbooks"], 1):
        remote.append({"id": "PR-PIN-" + str(index).zfill(3),
                       "observation": "OBSERVATION_ZIP_EPINGLEE_DANS_AUDIT_PR",
                       **row})
    return {"schemaVersion": 1, "snapshotDate": "2026-11-01",
            "scope": "Local XLSX bytes read separately from the dated 33-PR snapshot. "
                     "Pinned remote observations are transcribed from PR-STACKS, not downloaded or rerun here.",
            "coordinationWorkbookExcludedFromOwnInputs": OUTPUT,
            "sourceFingerprints": [fingerprint(p) for p in SOURCES + [LATER_EVENT, OPEN_DIAGNOSTIC]],
            "remainingHomeworldDiagnostic": {
                "status": "OUVERT_NON_CORRIGE", "path": OPEN_DIAGNOSTIC,
                "scope": "R5/R6 visual edge composition diagnosis; no current application patch or closure claimed."},
            "localWorkbooks": local_workbooks(), "pinnedRemoteWorkbooks": remote}


def check_state(check):
    return check.get("conclusion") or check.get("status") or "NON_RENSEIGNE"


def collect():
    stacks, initial, audit = [json.loads((ROOT / p).read_text()) for p in SOURCES]
    pr33_event = json.loads((ROOT / LATER_EVENT).read_text())
    assert pr33_event["number"] == 33 and pr33_event["baseBranch"] == "main"
    assert pr33_event["headSha"] == next(r["headSha"] for r in stacks["pullRequests"] if r["number"] == 33)
    assert stacks["initialPullRequestCount"] == initial["openPullRequests"] == 33
    assert len(stacks["pullRequests"]) == len(initial["pullRequests"]) == 33
    by_number = {r["number"]: r for r in initial["pullRequests"]}
    assert len(by_number) == 33 and set(by_number) == {r["number"] for r in stacks["pullRequests"]}
    edges = {(r["parent"], r["child"]) for r in stacks["dependencyEdges"]}
    assert len(edges) == len(stacks["dependencyEdges"]) == 29
    assert len(audit["sourceItems"]) == 56
    assert sum(r["familyId"] == "pit-actions" for r in audit["sourceItems"]) == 9
    inventory = inventory_model(stacks)
    source = SOURCES[0]
    summary = [
        ["SCOPE", "Nature", "INSTANTANE_DATE", stacks["scope"], source],
        ["SNAPSHOT-TIME", "Observation initiale UTC", "HISTORIQUE", initial["observedAtUtc"], SOURCES[1]],
        ["AUDIT-TIME", "Rédaction audit UTC", "HISTORIQUE", stacks["writtenAtUtc"], source],
        ["MAIN-SNAPSHOT", "Main à la relecture de l'audit", "HISTORIQUE", stacks["mainAtFinalRootRecheck"]["sha"], source],
        ["PR-COUNT", "PR présentes dans l'instantané", "33_NON_REECRITES", "33 ; ne comprend pas les PR tardives", SOURCES[1]],
        ["EDGES", "Dépendances parent → enfant", "29_LIENS", serial(stacks["dependencyEdges"]), source],
        ["LAYERS", "Couches de revue", "PAS_UN_PLAN_DE_MERGE", serial(stacks["topologicalLayersForReviewNotAnAutomaticMergePlan"]), source],
        ["LOCAL-XLSX", "Classeurs locaux lus", "OBSERVATION_LOCALE", len(inventory["localWorkbooks"]), INVENTORY],
        ["REMOTE-XLSX", "Observations ZIP distantes épinglées", "AUDIT_SOURCE_UNIQUEMENT", len(inventory["pinnedRemoteWorkbooks"]), source],
        ["SOURCES", "Exigences source ouvertes", "OUVERT_SOURCE", "56, dont les neuf actions Feral / Scar", SOURCES[2]],
        ["ART", "Cibles artistiques distinctes", "PAS_DE_CLOTURE_DEDUITE", serial(audit["facts"]["historicalV111ArtPresence"]), SOURCES[2]],
    ]
    for index, event in enumerate(stacks.get("progressAfterSnapshot", []), 1):
        pr = event["pullRequest"]
        summary.append(["EVENT-" + str(index), "Après instantané · PR " + str(pr["number"]) + " · " + event["kind"],
                        pr["state"], serial(event), pr.get("url") or "https://github.com/darknigthmare/yautja-la-longue-chasse/pull/" + str(pr["number"])])
    summary.append(["EVENT-PR33-BASE", "Après instantané · nouvelle base de PR33",
                    "BASE_MAIN_TETE_INCHANGEE", serial(pr33_event), LATER_EVENT])
    summary.append(["HW-MARSH-EDGE", "Composition de rive du passage des marais",
                    "OUVERT_NON_CORRIGE", "Diagnostic R5/R6 conservé : petits interstices extérieurs entre contours pavés ; aucun correctif app qualifié et aucune clôture déduite des recettes compilées.", OPEN_DIAGNOSTIC])
    for pr in stacks.get("latePullRequestsNotAudited", []):
        summary.append(["LATE-" + str(pr["number"]), "PR tardive hors des 33",
                        "NON_AUDITEE", serial(pr), "https://github.com/darknigthmare/yautja-la-longue-chasse/pull/" + str(pr["number"])])
    for pr in stacks.get("snapshotHeadsChangedDuringAudit", []):
        summary.append(["HEAD-CHANGED-" + str(pr["number"]), "Tête modifiée après observation",
                        "RELIRE_AVANT_INTEGRATION", serial(pr), source])
    for index, observation in enumerate(stacks.get("overlappingChangedFiles", []), 1):
        summary.append(["OVERLAP-" + str(index), "Chemins communs à deux PR",
                        "CHEVAUCHEMENT_PAS_CONFLIT_PROUVE", serial(observation), source])
    for index, observation in enumerate(stacks["pinnedWorkbookZipObservations"].get("comparisons", []), 1):
        summary.append(["ZIP-COMPARE-" + str(index), "Comparaison épinglée de classeurs",
                        "OBSERVATION_DOCUMENTAIRE", serial(observation), source])
    for index, limit in enumerate(stacks["limits"] + audit["limits"], 1):
        summary.append(["LIMIT-" + str(index), "Limite", "A_CONSERVER", limit, source if index <= len(stacks["limits"]) else SOURCES[2]])
    for row in inventory["sourceFingerprints"]:
        summary.append(["INPUT-" + Path(row["path"]).name, "Empreinte d'entrée", "OCTETS_EPINGLES", serial(row), row["path"]])

    prs, checks = [], []
    layers = {n: index for index, layer in enumerate(stacks["topologicalLayersForReviewNotAnAutomaticMergePlan"], 1) for n in layer}
    for pr in sorted(stacks["pullRequests"], key=lambda r: r["number"]):
        other = by_number[pr["number"]]
        assert pr["headSha"] == other["headCommit"] and pr["baseBranch"] == other["baseBranch"]
        assert (pr["parentPr"], pr["number"]) in edges if pr["parentPr"] is not None else True
        observations = []
        if pr["draftAtSnapshot"]:
            observations.append("Brouillon dans l'instantané")
        if pr["parentPr"] is not None:
            observations.append("Dépend de la PR " + str(pr["parentPr"]))
        unfinished = [c["name"] + ": " + check_state(c) for c in pr["checksAtInitialSnapshot"] if check_state(c) not in ["SUCCESS", "SKIPPED"]]
        observations.extend(unfinished)
        if not pr["fileInventoryHeadStableAtRecheck"]:
            observations.append("Tête modifiée pendant l'inventaire ; relire les fichiers")
        if pr["latestCitedRunMatchesSnapshotHead"] is False:
            observations.append("Le run cité porte sur une autre tête")
        siblings = [r for r in stacks["overlappingChangedFiles"] if pr["number"] in [r["leftPr"], r["rightPr"]]]
        if siblings:
            observations.append("Chemins communs avec PR " + ", ".join(str(r["rightPr"] if r["leftPr"] == pr["number"] else r["leftPr"]) for r in siblings) + " ; conflits non testés")
        prs.append(["PR-" + str(pr["number"]), pr["number"], pr["title"], pr["url"],
                    pr["headBranch"], pr["headSha"], pr["baseBranch"], pr["listedBaseSha"],
                    pr["parentPr"], [child for parent, child in sorted(edges) if parent == pr["number"]],
                    layers[pr["number"]], pr["draftAtSnapshot"], pr["mergeableAgainstOwnBaseAtSnapshot"],
                    pr["mergeStateAtSnapshot"], dict(Counter(check_state(c) for c in pr["checksAtInitialSnapshot"])),
                    observations, "Relire tête/base/checks ; résoudre les dépendances et tester l'intégration avant décision.",
                    pr["workbookPaths"], pr["updatedAt"], source])
        assert len(pr["checksAtInitialSnapshot"]) == len(other["checks"])
        for index, (check, original) in enumerate(zip(pr["checksAtInitialSnapshot"], other["checks"]), 1):
            assert check["name"] == original["name"] and check["url"] == original["url"]
            checks.append(["PR-" + str(pr["number"]) + "-CHECK-" + str(index), pr["number"],
                           "INSTANTANE_INITIAL", check["name"], check.get("workflow"), check["status"],
                           check.get("conclusion"), original["status"], original.get("conclusion"),
                           check["url"], check.get("externalBuildRateLimit", False),
                           "API observée ; pas une exécution de test par ce classeur", source + " ; " + SOURCES[1]])
    for recheck in stacks.get("rootRechecks", {}).values():
        for index, check in enumerate(recheck.get("statusCheckRollup", []), 1):
            checks.append(["RECHECK-" + str(recheck["number"]) + "-" + str(index), recheck["number"],
                           "RELECTURE_SEPAREE", check.get("name") or check.get("context"), check.get("workflowName"),
                           check.get("status") or check.get("state"), check.get("conclusion"), None, None,
                           check.get("detailsUrl") or check.get("targetUrl"), False,
                           "Relecture séparée ; ne remplace pas l'instantané initial", source])

    books = []
    for book in inventory["localWorkbooks"]:
        books.append([book["id"], book["observation"], None, None, book["path"], book["bytes"],
                      book["sha256"], book["worksheets"], book["sheetNames"], book["path"],
                      "ZIP/CRC et XML lus localement ; aucune qualification gameplay ou Excel natif", INVENTORY])
    for book in inventory["pinnedRemoteWorkbooks"]:
        link = "https://github.com/darknigthmare/yautja-la-longue-chasse/blob/" + book["headSha"] + "/" + book["path"]
        books.append([book["id"], book["observation"], book["pr"], book["headSha"], book["path"],
                      book["bytes"], book["sha256"], book["worksheets"],
                      [s["name"] for s in book.get("sheetParts", [])], link,
                      "Observation épinglée de l'audit PR ; octets distants non relus par ce générateur", source])

    opened = []
    for family in sorted({r["familyId"] for r in audit["sourceItems"]}):
        rows = [r for r in audit["sourceItems"] if r["familyId"] == family]
        opened.append(["FAMILY-" + family, "FAMILLE_SOURCE", rows[0]["family"], "OUVERT_SOURCE",
                       rows[0]["priority"], len(rows), [r["id"] for r in rows],
                       rows[0]["acceptance"], "Les IDs individuels ci-dessous restent ouverts dans la portée complète.", SOURCES[2]])
    for row in audit["sourceItems"]:
        opened.append([row["id"], "EXIGENCE_SOURCE", row["family"], row["status"], row["priority"],
                       1, row["source"], row["acceptance"], row["latestRecordedRemaining"], SOURCES[2]])
    for row in audit["homeworldNeeds"]:
        opened.append([row["id"], "BESOIN_HOMEWORLD_DISTINCT", "Homeworld", "BESOIN_SUIVI_NON_CLOTURE_GLOBAL",
                       "P1", None, "Brief V81 §§" + row["section"], row["acceptance"], row["need"], SOURCES[2]])
    opened.append(["ART-354", "CATALOGUE_DISTINCT", "Homeworld art", "NON_CLOTURE_ART", "P2", 354,
                   "Brief V81 §§55–76", "Admettre chaque dessin/animation dans sa variante et son rôle exacts.",
                   serial(audit["facts"]["historicalV111ArtPresence"]), SOURCES[2]])
    opened.append(["HW-MARSH-EDGE", "DIAGNOSTIC_RENDU_DISTINCT", "Homeworld · composition de rive",
                   "OUVERT_NON_CORRIGE", "P2", None, OPEN_DIAGNOSTIC,
                   "Isoler la primitive naturelle concernée, proposer une composition de limite explicite puis vérifier la géométrie, les accès et les pixels du vrai jeu.",
                   "Petits interstices extérieurs conservés ; pas un trou physique prouvé dans le chemin du guetteur. Aucun patch app qualifié.", OPEN_DIAGNOSTIC])
    sheets = [
        ("Synthese", "Reprise du 1er novembre 2026 · observations datées, événements séparés",
         [("ID", 28), ("Sujet", 44), ("État / portée", 38), ("Valeur / détail exact", 110), ("Source / lien", 85)], summary),
        ("PR_Instantane", "33 PR à la date de l'observation ; PR31 fusionnée ensuite, PR64/65 hors instantané",
         [("ID", 15), ("PR", 8), ("Titre", 75), ("Lien PR", 55), ("Branche tête", 50), ("SHA tête observée", 45),
          ("Branche base", 50), ("SHA base listée", 45), ("Parent PR", 12), ("Enfants PR", 22), ("Couche de revue", 15),
          ("Brouillon observé", 18), ("Mergeable sur SA base", 24), ("État GitHub observé", 22), ("Comptage checks", 40),
          ("Points à résoudre / recontrôler", 100), ("Prochaine action", 85), ("Chemins XLSX de la PR", 90),
          ("Mise à jour observée UTC", 25), ("Source", 70)], prs),
        ("ControlesPR", "Checks exacts des deux sources ; une API observée n'est pas une exécution locale",
         [("ID", 26), ("PR", 8), ("Moment", 28), ("Check", 75), ("Workflow", 65), ("Statut stacks", 22),
          ("Conclusion stacks", 22), ("Statut inventaire", 22), ("Conclusion inventaire", 24), ("Lien", 85),
          ("Quota build externe", 22), ("Limite", 90), ("Source", 90)], checks),
        ("Classeurs", "Vrais classeurs locaux et observations ZIP épinglées des PR, distingués explicitement",
         [("ID", 22), ("Type d'observation", 42), ("PR", 8), ("SHA tête distante", 45), ("Chemin", 100),
          ("Octets", 15), ("SHA256 XLSX", 70), ("Feuilles", 12), ("Noms des feuilles", 110),
          ("Lien fichier", 100), ("Portée de vérification", 100), ("Source", 85)], books),
        ("OuvertsSource", "56 exigences, neuf actions incluses ; familles, besoins Homeworld et 354 cibles distincts",
         [("ID", 45), ("Périmètre", 35), ("Famille", 52), ("État source", 38), ("Priorité", 12),
          ("Quantité dans ce périmètre", 25), ("IDs / cellules exactes", 100), ("Prochain livrable / acceptation", 120),
          ("Reste et limites", 120), ("Source", 85)], opened),
    ]
    return inventory, sheets


def column(index):
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def sheet_values(spec):
    name, title, columns, rows = spec
    return [[title], ["Coordination documentaire ; aucun nouveau résultat gameplay, admission artistique ou fusion déduit."],
            ["Sources datées conservées ; voir Synthese. PR31 après instantané et PR64/65 non auditées séparément."],
            [label for label, _ in columns]] + [[serial(v) for v in row] for row in rows]


def worksheet(spec):
    _, _, columns, _ = spec
    root = E.Element(tag("worksheet"))
    values = sheet_values(spec)
    E.SubElement(root, tag("dimension"), {"ref": "A1:" + column(len(columns)) + str(len(values))})
    views = E.SubElement(root, tag("sheetViews"))
    view = E.SubElement(views, tag("sheetView"), {"workbookViewId": "0", "showGridLines": "0", "zoomScale": "80"})
    E.SubElement(view, tag("pane"), {"xSplit": "2", "ySplit": "4", "topLeftCell": "C5", "activePane": "bottomRight", "state": "frozen"})
    E.SubElement(view, tag("selection"), {"pane": "bottomRight", "activeCell": "C5", "sqref": "C5"})
    E.SubElement(root, tag("sheetFormatPr"), {"defaultRowHeight": "54"})
    cols = E.SubElement(root, tag("cols"))
    for index, (_, width) in enumerate(columns, 1):
        E.SubElement(cols, tag("col"), {"min": str(index), "max": str(index), "width": str(width), "customWidth": "1"})
    data = E.SubElement(root, tag("sheetData"))
    links = []
    for r, row in enumerate(values, 1):
        item = E.SubElement(data, tag("row"), {"r": str(r), "ht": "32" if r <= 4 else "66", "customHeight": "1"})
        for c, raw in enumerate(row, 1):
            value = serial(raw)
            if len(value) > 32767 or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", value):
                raise ValueError("Invalid or oversized cell: " + spec[0] + "!" + column(c) + str(r))
            ref = column(c) + str(r)
            style = "1" if r == 1 else "2" if r == 4 else "3" if r < 4 else "4" if r % 2 else "5"
            cell = E.SubElement(item, tag("c"), {"r": ref, "t": "inlineStr", "s": style})
            E.SubElement(E.SubElement(cell, tag("is")), tag("t"), {"{http://www.w3.org/XML/1998/namespace}space": "preserve"}).text = value
            local_file = bool(re.match(r"^(docs|scripts|art-source)/[^;\n]+\.[a-z0-9]+$", value)) and (ROOT / value).is_file()
            if r >= 5 and (re.match(r"^https://[^\s]+$", value) or local_file):
                links.append((ref, value if value.startswith("https://") else "../" + value))
    E.SubElement(root, tag("autoFilter"), {"ref": "A4:" + column(len(columns)) + str(len(values))})
    merged = E.SubElement(root, tag("mergeCells"), {"count": "3"})
    for r in range(1, 4):
        E.SubElement(merged, tag("mergeCell"), {"ref": "A" + str(r) + ":" + column(len(columns)) + str(r)})
    relations = E.Element("Relationships", {"xmlns": PKG})
    if links:
        hyperlinks = E.SubElement(root, tag("hyperlinks"))
        for index, (ref, target) in enumerate(links, 1):
            rid = "rIdLink" + str(index)
            E.SubElement(hyperlinks, tag("hyperlink"), {"ref": ref, "{" + REL + "}id": rid})
            E.SubElement(relations, "Relationship", {"Id": rid, "Type": REL + "/hyperlink", "Target": target, "TargetMode": "External"})
    E.SubElement(root, tag("pageMargins"), {"left": "0.25", "right": "0.25", "top": "0.4", "bottom": "0.4", "header": "0.2", "footer": "0.2"})
    return xml(root), xml(relations)


def build(sheets):
    parts = {}
    types = E.Element("Types", {"xmlns": CONTENT})
    for ext, mime in [("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml")]:
        E.SubElement(types, "Default", {"Extension": ext, "ContentType": mime})
    for part, suffix in [("/xl/workbook.xml", "sheet.main+xml"), ("/xl/styles.xml", "styles+xml")]:
        E.SubElement(types, "Override", {"PartName": part, "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml." + suffix})
    book = E.Element(tag("workbook"))
    E.SubElement(E.SubElement(book, tag("bookViews")), tag("workbookView"), {"activeTab": "0"})
    sheet_list = E.SubElement(book, tag("sheets"))
    relations = E.Element("Relationships", {"xmlns": PKG})
    for index, spec in enumerate(sheets, 1):
        E.SubElement(sheet_list, tag("sheet"), {"name": spec[0], "sheetId": str(index), "{" + REL + "}id": "rId" + str(index)})
        E.SubElement(relations, "Relationship", {"Id": "rId" + str(index), "Type": REL + "/worksheet", "Target": "worksheets/sheet" + str(index) + ".xml"})
        E.SubElement(types, "Override", {"PartName": "/xl/worksheets/sheet" + str(index) + ".xml", "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        parts["xl/worksheets/sheet" + str(index) + ".xml"], parts["xl/worksheets/_rels/sheet" + str(index) + ".xml.rels"] = worksheet(spec)
    E.SubElement(relations, "Relationship", {"Id": "rIdStyles", "Type": REL + "/styles", "Target": "styles.xml"})
    package_rels = E.Element("Relationships", {"xmlns": PKG})
    E.SubElement(package_rels, "Relationship", {"Id": "rIdWorkbook", "Type": REL + "/officeDocument", "Target": "xl/workbook.xml"})
    parts.update({"[Content_Types].xml": xml(types), "_rels/.rels": xml(package_rels), "xl/workbook.xml": xml(book), "xl/_rels/workbook.xml.rels": xml(relations)})
    parts["xl/styles.xml"] = XML + ('''<styleSheet xmlns="''' + MAIN + '''"><fonts count="3"><font><sz val="11"/><name val="Calibri"/><color rgb="FF1D2939"/></font><font><b/><sz val="18"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF164E43"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF244B68"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F5F4"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>''').encode()
    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(parts.items()):
            item = ZipInfo(name, date_time=(2026, 11, 1, 0, 0, 0))
            item.compress_type = ZIP_DEFLATED
            item.create_system = 0
            item.external_attr = 0o600 << 16
            archive.writestr(item, data, compresslevel=9)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify byte-exact regeneration without writes")
    args = parser.parse_args()
    inventory, sheets = collect()
    workbook = build(sheets)
    manifest = json_bytes(inventory)
    if args.check:
        assert (ROOT / INVENTORY).read_bytes() == manifest, "Local/source inventory changed; regenerate explicitly"
        assert (ROOT / OUTPUT).read_bytes() == workbook, "Coordination workbook differs from its exact sources"
    else:
        (ROOT / INVENTORY).write_bytes(manifest)
        (ROOT / OUTPUT).write_bytes(workbook)
    print(json.dumps({"status": "PASS_REPRODUCIBLE_BYTES" if args.check else "GENERATED", "workbook": OUTPUT,
                      "bytes": len(workbook), "sha256": sha256(workbook).hexdigest(), "sheets": len(sheets),
                      "snapshotPRs": 33, "dependencyEdges": 29, "localWorkbooks": len(inventory["localWorkbooks"]),
                      "pinnedRemoteWorkbooks": len(inventory["pinnedRemoteWorkbooks"]),
                      "rowsPerSheet": {s[0]: len(s[3]) for s in sheets}, "nativeExcelExecuted": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
