#!/usr/bin/env python3
"""Read-only inventory of XLSX source workbooks, with cell-level provenance.

This program never edits a source workbook. Spreadsheet authoring is performed
separately with Artifact Tool. Exact row/sheet copies are grouped by content;
an old status is retained as a source declaration, not as current game proof.
"""
from __future__ import annotations

import hashlib
import json
import posixpath
import re
import subprocess
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "production/excel-bible-20261108/suivi"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def normal(value):
    return " ".join(unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower().replace("_", " ").split())


def digest(value):
    return hashlib.sha256(value).hexdigest()


def cell_value(cell, strings):
    kind = cell.get("t", "")
    node = cell.find("x:v", NS)
    value = node.text or "" if node is not None else ""
    if kind == "s":
        return strings[int(value)] if value else ""
    if kind == "inlineStr":
        return "".join(t.text or "" for t in cell.findall(".//x:t", NS))
    if kind == "b":
        return value == "1"
    if kind in ("n", "") and value:
        try:
            result = float(value)
            return int(result) if result.is_integer() else result
        except ValueError:
            pass
    return value


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        strings = []
        if "xl/sharedStrings.xml" in names:
            strings = ["".join(t.text or "" for t in s.findall(".//x:t", NS))
                       for s in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        relationships = {node.get("Id"): node.get("Target") for node in
                         ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        result = []
        for sheet in workbook.findall("x:sheets/x:sheet", NS):
            target = relationships[sheet.get(RID)]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            tree = ET.fromstring(archive.read(member))
            rows = []
            formulas = []
            for row in tree.findall("x:sheetData/x:row", NS):
                values = {}
                for cell in row.findall("x:c", NS):
                    address = cell.get("r", "")
                    value = cell_value(cell, strings)
                    if value != "":
                        values[re.sub(r"\d", "", address)] = value
                    formula = cell.find("x:f", NS)
                    if formula is not None:
                        formulas.append({"cell": address, "formula": formula.text or "", "cached": value})
                if values:
                    rows.append({"row": int(row.get("r")), "cells": values})
            material = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()
            result.append({"name": sheet.get("name"), "rows": rows,
                           "rowCount": len(rows), "cellCount": sum(len(r["cells"]) for r in rows),
                           "formulaCount": len(formulas), "contentSha256": digest(material)})
        return result


def workbook_scope(path):
    p = str(path)
    name = path.name
    if "/qa/" in p or "/references/" in p:
        return "CAPSULE_HISTORIQUE", "Copie de preuve ou de référence conservée."
    if p.startswith("public/aide/"):
        return "COPIE_DIFFUSION", "Copie destinée à l’aide en jeu."
    if "V6_Bible_Cumulative" in name:
        return "SOURCE_BIBLE", "Besoins source ; campagne révisée prioritaire."
    if "V5_Bible" in name:
        return "HISTORIQUE", "Bible source antérieure à la V6."
    if "catalogue_yautja_tous_medias" in name:
        return "SOURCE_REFERENCES", "Identités et références artistiques."
    if name == "YAUTJA_V114_SUIVI.xlsx":
        return "SUIVI_CUMULATIF", "Dernier classeur cumulatif, avec feuilles historiques conservées."
    if re.match(r"YAUTJA_V\d+_SUIVI", name):
        return "HISTORIQUE", "État cumulatif antérieur à la V114."
    if "MECANIQUES_CHASSE" in name:
        return ("SUIVI_ACTIF", "Dernier suivi de chasse.") if "V112" in name else ("HISTORIQUE", "Suivi de chasse antérieur.")
    if name.startswith("THE_PIT"):
        return "HISTORIQUE", "Suivi Pit repris dans le cumulatif."
    if "GAUNTLETS" in name.upper():
        return ("SUIVI_ACTIF", "Dernier suivi arsenal/campagne.") if "V144" in name else ("HISTORIQUE", "Ancien suivi arsenal/clans.")
    if name.startswith("Yautja_ClanWar_"):
        return ("SUIVI_ACTIF", "Dernier suivi quatre modes/RTS.") if "V152" in name else ("HISTORIQUE", "Ancien suivi de persistance Clan War.")
    if "PHG_" in name:
        highest = "V141" if "QA_Visual" in name else "V137"
        return ("SUIVI_ACTIF", "Dernière version de cette famille PHG.") if highest in name else ("HISTORIQUE", "Version PHG antérieure de cette famille.")
    if "Suivi_Variantes" in name:
        return ("SUIVI_ACTIF", "Dernier suivi variantes.") if "/v615/" in p else ("HISTORIQUE", "Suivi variantes antérieur.")
    if "HOMEWORLD_PROPS" in name:
        return ("SUIVI_ACTIF", "Dernier suivi Homeworld de cette série.") if "V162" in name else ("HISTORIQUE", "Version Homeworld antérieure.")
    if p.startswith("production/") or "stealth" in p or "/clan-war-v152/" in p:
        return "SUIVI_ACTIF", "Suivi spécialisé à rapprocher du code courant."
    if "/clan-war-v" in p:
        return "SOURCE_SPECIALISEE", "Avenant ou preuve de guerre ; antériorité conservée, pas de fermeture automatique."
    return "COORDINATION_HISTORIQUE", "Coordination datée ; relire la source de chaque exigence."


def header_score(row):
    words = [normal(v) for v in row["cells"].values()]
    exact = {"id", "identifiant", "statut", "etat", "status", "priorite", "source", "preuve", "sources", "action", "domaine", "titre", "besoin", "element", "categorie", "famille", "nom", "objet", "regle", "realisation", "validation", "verification", "critere", "livraison", "integration", "generation", "nature"}
    return sum(4 if w in exact else 2 if len(w) < 60 and re.search(r"^(id |identifiant |statut |etat |critere |validation |preuve |source |nom |action |.* id$|.* attendu$|.* constate$)", w) else 0 for w in words)


def extract_sheet(sheet):
    rows = sheet["rows"]
    candidates = [r for r in rows if r["row"] <= 16]
    header = max(candidates, key=header_score, default={"row": 0, "cells": {}})
    if header_score(header) < 2:
        header = {"row": 0, "cells": {}}
    status_columns = [c for c, v in header["cells"].items()
                      if re.search(r"\b(statut|etat|status)\b|^(realisation|implementation|generation|integration|validation|revue humaine|resultat constate)", normal(v))
                      and not re.search(r"lore|initial|avant|entree|sortie|persistant|proprietaire|vie|source avant", normal(v))]
    id_columns = [c for c, v in header["cells"].items() if re.search(r"(^id\b|\bid$|identifiant|^code$)", normal(v))]
    result = []
    for row in rows:
        if row["row"] <= header["row"]:
            continue
        cells = row["cells"]
        states = {c: cells[c] for c in status_columns if c in cells}
        # Explicit source status only. Prose is retained separately as a candidate
        # for human reconciliation, not silently treated as an active task.
        explicit = " | ".join(str(v) for v in states.values())
        norm = normal(explicit)
        open_pattern = r"ouvert|\bopen\b|\ba (faire|produire|generer|executer|integrer|valider|reprendre|completer|raccorder|qualifier|confirmer|venir|verifier|revoir|tester|developper|implementer)|\bnon[ -](qualifie|valide|integre|livre|termine|execute|fait|installe|admis|apparie|jouable|certifie)|\bpas fait|manquant|absent|partiel|bloqu|placeholder|todo|pending|missing|planned|not[ ]|en attente|en cours|prevu|specifie|concept|prototype|conception"
        declared_open = bool(re.search(open_pattern, norm))
        text = " | ".join(str(v) for v in cells.values())
        mention_open = bool(re.search(open_pattern, normal(text)))
        if not (declared_open or mention_open):
            continue
        key = next((str(cells[c]) for c in id_columns if c in cells), "")
        packed = json.dumps(cells, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        result.append({"row": row["row"], "sourceId": key, "declaredStatuses": states,
                       "classification": "OUVERT_DECLARE" if declared_open else "MENTION_A_RAPPROCHER",
                       "rowSha256": digest(packed), "cells": cells})
    return {"headerRow": header["row"], "headers": header["cells"], "statusColumns": status_columns,
            "candidateRows": result}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    paths = sorted(Path(p) for p in tracked if p.endswith(".xlsx") and "excel-bible-20261108" not in p)
    inventory, sheets_by_hash, errors = [], {}, []
    total_rows = total_cells = 0
    for rel in paths:
        path = ROOT / rel
        try:
            data = path.read_bytes()
            sheets = read_workbook(path)
        except Exception as error:
            errors.append({"path": str(rel), "error": str(error)})
            continue
        scope, reason = workbook_scope(rel)
        record = {"path": str(rel), "sha256": digest(data), "bytes": len(data), "scope": scope,
                  "scopeReason": reason, "sheetCount": len(sheets), "sheets": []}
        for sheet in sheets:
            source = {"path": str(rel), "sheet": sheet["name"], "scope": scope}
            h = sheet["contentSha256"]
            record["sheets"].append({k: v for k, v in sheet.items() if k != "rows"})
            total_rows += sheet["rowCount"]
            total_cells += sheet["cellCount"]
            if h not in sheets_by_hash:
                sheets_by_hash[h] = {**sheet, **extract_sheet(sheet), "copies": []}
            sheets_by_hash[h]["copies"].append(source)
        inventory.append(record)
    source_priority = {"SUIVI_CUMULATIF": 0, "SUIVI_ACTIF": 1, "SOURCE_BIBLE": 2,
                       "SOURCE_REFERENCES": 3, "SOURCE_SPECIALISEE": 4, "HISTORIQUE": 6,
                       "COORDINATION_HISTORIQUE": 7, "CAPSULE_HISTORIQUE": 8, "COPIE_DIFFUSION": 9}
    unique_sheets = []
    for sheet in sheets_by_hash.values():
        sheet["copies"].sort(key=lambda s: (source_priority.get(s["scope"], 5),
                                           -max([int(v) for v in re.findall(r"[Vv](\d+)", s["path"])] or [0]),
                                           s["path"]))
        sheet["primarySource"] = sheet["copies"][0]
        unique_sheets.append(sheet)
    source_summary = Counter(r["scope"] for r in inventory)
    summary = {"schemaVersion": 1, "asOfDate": "2026-11-08", "baseCommit": "254b4b972af3c32cb078da3744241b2c0ea2f46c",
               "workbooks": len(inventory), "sheetsIncludingCopies": sum(r["sheetCount"] for r in inventory),
               "uniqueSheetContents": len(unique_sheets), "nonemptyRowsIncludingCopies": total_rows,
               "nonemptyCellsIncludingCopies": total_cells, "workbookScopes": dict(source_summary),
               "declaredOpenRowsInUniqueSheets": sum(r["classification"] == "OUVERT_DECLARE" for s in unique_sheets for r in s["candidateRows"]),
               "proseCandidatesInUniqueSheets": sum(r["classification"] == "MENTION_A_RAPPROCHER" for s in unique_sheets for r in s["candidateRows"]),
               "errors": errors,
               "meaning": "Counts describe source observations, not distinct active requirements or completed gameplay. Exact sheet copies are deduplicated by cell content. Old declarations await explicit reconciliation with current implementation."}
    (OUT / "excel-inventory.json").write_text(json.dumps({**summary, "inventory": inventory}, ensure_ascii=False, indent=2) + "\n")
    # Retain every nonempty source row for the local reconciliation work. The
    # compact candidate register below is the tracked handoff artifact.
    scratch = Path("/tmp/yautja-excel-20261108-unique-sheets.json")
    scratch.write_text(json.dumps(unique_sheets, ensure_ascii=False, separators=(",", ":")))
    candidate_sheets = [{k: v for k, v in s.items() if k != "rows"} for s in unique_sheets if s["candidateRows"]]
    Path("/tmp/yautja-excel-20261108-source-candidates.json").write_text(json.dumps({**summary, "sheets": candidate_sheets}, ensure_ascii=False, separators=(",", ":")))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
