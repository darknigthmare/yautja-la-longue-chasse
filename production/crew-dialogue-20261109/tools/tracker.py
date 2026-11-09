"""B05 dated tracker; standard-library authoring with the unchanged append helper."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
CURRENT = ROOT / "production/crew-dialogue-20261109"
FOLLOWUP = CURRENT / "suivi"
QUALIFICATION = FOLLOWUP / "qualification-dialogue.json"
HISTORY = FOLLOWUP / "historique-preserve.json"
HISTORY_SHA256 = "ebd77f9c4a11f0bba0144ffefc747064f83318db8032c92fbb17a4108d78ea34"
ARTIFACT = FOLLOWUP / "Yautja_Dialogues_Equipage_20261109.xlsx"
REQUEST = FOLLOWUP / "build-request.json"
BASE = "19317af4f6cf05532a8ba56dbfe8f56fc4b225d9"
BASELINE = {
    "path": "production/excel-bible-witnesses-20261108/suivi/Yautja_Audience_C37_20261108.xlsx",
    "sha256": "3915848e84da6cbf8832b11e68d1344d8e521ec50b40e7f3fec5625bc61e1cb4",
    "bytes": 22771,
    "sheetNames": ["Audience", "Sources"],
}
DEPENDENCIES = {
    "scripts/lib/excel_followup_append.py": "321eada2b760f5a6ec6b9d273b2abc189a829f07a67c3805a690983408160e34",
    "scripts/build-excel-followup-v100.py": "91491b98d2576e8f3ce89067ba782629ac05675ae0541343256576749e1f8ab1",
}
NAMES = ["SyntheseV20261109", "B05V20261109", "CriteresV20261109", "PreuvesV20261109", "SourcesV20261109"]
PHASES = ["implementation", "domainTested", "ssrTested", "browserTested", "controllerTested", "humanArtReviewed"]
STATES = {"Oui", "Partiel", "Non", "À vérifier", "Bloqué", "Sans objet"}
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(relative):
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("Unsafe evidence path: " + relative)
    filename = ROOT / path
    if not filename.is_file() or filename.is_symlink():
        raise ValueError("Expected regular evidence file: " + relative)
    raw = filename.read_bytes()
    return {"path": relative, "sha256": digest(raw), "bytes": len(raw)}


def append_helper():
    for path, expected in DEPENDENCIES.items():
        if fingerprint(path)["sha256"] != expected:
            raise ValueError("The unchanged append dependency differs: " + path)
    spec = importlib.util.spec_from_file_location("crew_dialogue_append", ROOT / "scripts/lib/excel_followup_append.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_protected_sources():
    if digest(HISTORY.read_bytes()) != HISTORY_SHA256:
        raise ValueError("The baseline108/198source manifest changed after its initial audit")
    history = read(HISTORY)
    if history["baseCommit"] != BASE or len(history["sourceWorkbooks"]) != 108 or len(history["previousFiles"]) != 198:
        raise ValueError("Expected the 108 originals and 198 files of all three previous lots at baseline 19317")
    for item in history["sourceWorkbooks"] + history["previousFiles"]:
        actual = fingerprint(item["path"])
        if any(actual[key] != item[key] for key in ["sha256", "bytes"]):
            raise ValueError("Protected source changed: " + item["path"])
        if "gitBlob" in item:
            raw = (ROOT / item["path"]).read_bytes()
            git_blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
            if git_blob != item["gitBlob"]:
                raise ValueError("Protected baseline blob differs: " + item["path"])
    return history


def qualification():
    data = read(QUALIFICATION)
    if data["baseCommit"] != BASE or data["baselineWorkbook"] != BASELINE or data["phases"] != PHASES:
        raise ValueError("Wrong baseline, last authoritative workbook, or phase schema")
    if len(data["dialogueMembers"]) != 6 or len(data["dialogueContexts"]) != 5:
        raise ValueError("The bounded B05 scope requires six members and five contexts")
    if data["sourceCriterion"] != "Accueils, refus, preuve récente, recrutement et retour d’opération ont des répliques propres.":
        raise ValueError("The original workbook criterion must retain its exact text")
    if len({source["id"] for source in data["sourceReferences"]}) != len(data["sourceReferences"]):
        raise ValueError("Duplicate evidence reference")
    if len({row["id"] for row in data["rows"]}) != len(data["rows"]):
        raise ValueError("Duplicate criterion")
    for row in data["rows"]:
        for phase in PHASES:
            if row[phase] not in STATES:
                raise ValueError("Unknown phase state: " + row["id"] + "/" + phase)
    by_id = {row["id"]: row for row in data["rows"]}
    if by_id["OPS-Q27"]["implementation"] != "Partiel" or by_id["OPS-B04"]["implementation"] != "Non":
        raise ValueError("Global Q27 must remain partial and B04 must remain open")
    return data


def runtime_report(data):
    if data["readyForWorkbook"] is not True:
        raise ValueError("Workbook export is pending final real verification; readyForWorkbook is false")
    report = read(ROOT / data["runtimeReport"])
    tests = report["tests"]
    if tests["exitCode"] != 0 or tests["failed"] != 0 or not isinstance(tests["passed"], int) or tests["passed"] <= 0:
        raise ValueError("A passing real domain/SSR test report is required")
    for phase in ["lint", "typecheck", "build"]:
        if report[phase]["exitCode"] != 0:
            raise ValueError("A passing " + phase + " receipt is required")
    if report.get("controller", {}).get("physicalDeviceValidated") is not False or report.get("humanArtValidated") is not False:
        raise ValueError("No physical controller or human artistic review is produced by this tranche")
    if any(row[phase] == "Oui" for row in data["rows"] for phase in ["controllerTested", "humanArtReviewed"]):
        raise ValueError("No criterion may claim physical-controller or human-artistic validation")
    inputs = report["runtimeInputs"]
    if inputs["writeExitCode"] != 0 or inputs["checkExitCode"] != 0:
        raise ValueError("The final current-runtime snapshot write/check must pass")
    if inputs["manifestPath"] != "docs/qa/current-integration-20261103/runtime-inputs.json":
        raise ValueError("Only the current runtime inventory may be refreshed")
    if fingerprint(inputs["manifestPath"])["sha256"] != inputs["sha256"]:
        raise ValueError("The runtime report no longer matches current inputs")
    for path, expected in report["sourceSha256"].items():
        if fingerprint(path)["sha256"] != expected:
            raise ValueError("Qualified source changed after its verification: " + path)
    browser = report["browser"]
    if not isinstance(browser["executed"], bool) or not isinstance(browser["validated"], bool):
        raise ValueError("Browser execution and qualification need explicit booleans")
    if browser["validated"] and not browser["executed"]:
        raise ValueError("A browser that did not run cannot be qualified")
    if browser["executed"]:
        browser_result = read(ROOT / browser["reportPath"])
        if fingerprint(browser["reportPath"])["sha256"] != browser["sha256"]:
            raise ValueError("Browser receipt changed after its qualification")
        if browser_result.get("browserExecuted") is not True:
            raise ValueError("The actual browser report did not execute a browser")
        if browser["validated"]:
            if browser_result.get("passed") is not True:
                raise ValueError("The actual browser run did not pass")
            for key in ["errors", "requestFailures", "httpErrors", "missingAssets"]:
                if browser_result.get(key) != []:
                    raise ValueError("The qualified browser report contains an error or lacks its check: " + key)
            before, after = browser_result["identityBefore"], browser_result["identityAfter"]
            for key in ["sourceSha256", "productionBuildSha256"]:
                if before[key] != after[key]:
                    raise ValueError("Browser sources/build changed during the recipe: " + key)
    if any(row["browserTested"] == "Oui" for row in data["rows"]) and not browser["validated"]:
        raise ValueError("A positive browser phase requires the actual qualified browser report")
    return report


def columns(*entries):
    return [{"key": key, "label": label, "width": width} for key, label, width in entries]


def sheet(name, title, subtitle, cols, rows):
    return {"name": name, "title": title, "subtitle": subtitle, "columns": cols, "rows": rows}


def prepare_payload():
    data = qualification()
    report = runtime_report(data)
    history = verify_protected_sources()
    refs = data["sourceReferences"]
    evidence_ids = {source["id"] for source in refs}
    for row in data["rows"]:
        if not set(row["evidence"]) <= evidence_ids:
            raise ValueError("Unresolved criterion evidence: " + row["id"])
    proof_rows = [{**source, **fingerprint(source["path"])} for source in refs]
    proof_rows += [{"id": "RUNTIME", "kind": "Rapport courant", "detail": "Résultats réels du lot; les phases et leur portée restent indépendantes.", **fingerprint(data["runtimeReport"])}]
    proof_rows += [{"id": "INPUTS", "kind": "Relevé courant", "detail": "Inventaire officiel courant après les derniers edits; les gels datés restent inchangés.", **fingerprint(report["runtimeInputs"]["manifestPath"])}]
    for index, relative in enumerate(DEPENDENCIES, 1):
        proof_rows.append({"id": f"APPEND{index}", "kind": "Outil inchangé", "detail": "Helper append et layout gelé V100 réemployés sans modification.", **fingerprint(relative)})
    for name in ["tracker.py", "build-tracker.py", "verify-tracker.py"]:
        proof_rows.append({"id": name, "kind": "Outil du lot", "detail": "Builder/vérificateur reproductible B05, sans navigateur ni moteur Excel natif.", **fingerprint("production/crew-dialogue-20261109/tools/" + name)})
    criteria = [{**row, "phases": "\n".join(f"{phase}: {row[phase]}" for phase in PHASES), "evidenceText": " · ".join(row["evidence"])} for row in data["rows"]]
    b05 = [row for row in data["rows"] if row["id"].startswith("B05-")]
    contexts = [{"member": member["name"], "memberId": member["id"], "context": context["label"], "contextId": context["id"],
                 "scope": "Couverture de la matrice par les tests de domaine; aucune animation ou nouvelle scène déduite.",
                 "evidence": " · ".join(data.get("contextEvidence", []))}
                for member in data["dialogueMembers"] for context in data["dialogueContexts"]]
    source_rows = [{"kind": "Critère source", "path": "production/clan-ship-20261104/clan-ship-operations-20261105.xlsx", "detail": "Opérations!A62:L62: OPS-B05; Recette!A36:I36: Q27 reste partielle.", **fingerprint("production/clan-ship-20261104/clan-ship-operations-20261105.xlsx")},
                   {"kind": "Qualification courante", "detail": "Base et phases de cette extension B05.", **fingerprint(str(QUALIFICATION.relative_to(ROOT)))},
                   {"kind": "Sources protégées", "detail": "108 XLSX et 198 fichiers antérieurs; comparaison par hash/blob avant chaque build et vérification.", **fingerprint(str(HISTORY.relative_to(ROOT)))}]
    source_rows += [{"kind": "Classeur historique", "detail": "Original inchangé, inventorié le 8 novembre.", **item} for item in history["sourceWorkbooks"]]
    source_rows += [{"kind": "Fichier de lot antérieur", "detail": "Blob baseline 19317 conservé: " + item["gitBlob"], **item} for item in history["previousFiles"]]
    summary = [
        {"metric": "Critères B05 de ce lot", "value": len(b05), "scope": "Périmètre borné du dialogue, pas de taux global du jeu."},
        {"metric": "Combinaisons membre / contexte", "value": {"formula": "COUNTA('B05V20261109'!A5:A34)", "cached": len(contexts)}, "scope": "Six membres, cinq contextes. Les assertions figurent dans les preuves."},
        {"metric": "Critères B05 avec logique testée", "value": sum(row["domainTested"] == "Oui" for row in b05), "scope": "Les tests de domaine ne valident ni clic ni pixels."},
        {"metric": "Critères B05 parcourus en navigateur", "value": sum(row["browserTested"] == "Oui" for row in b05), "scope": report["browser"].get("summary", "Voir le rapport navigateur et ses limites.")},
        {"metric": "Tests réussis / échecs", "value": f"{report['tests']['passed']} / {report['tests']['failed']}", "scope": "Compteurs de la suite effectivement exécutée; pas de double addition."},
        {"metric": "Q27 vie et gestes des PNJ", "value": "LIVRE_PARTIEL", "scope": "B06 routines et B07 animations restent ouverts."},
        {"metric": "B04 escorte collective", "value": "OUVERT", "scope": "Aucune escorte de groupe ajoutée par les dialogues."},
        {"metric": "Manette physique / art humain", "value": "À vérifier / À vérifier", "scope": "Les événements de contrôleur synthétique et captures ne produisent pas ces validations."},
        {"metric": "Originaux XLSX / anciens fichiers protégés", "value": "108 / 198", "scope": "Empreintes contrôlées; aucun fichier antérieur réécrit."},
        {"metric": "Feuilles antérieures conservées", "value": 2, "scope": "Audience et Sources du dernier classeur témoins; leurs parts restent byte-identiques."},
        {"metric": "Application Excel native exécutée", "value": "Non", "scope": "ZIP/XML, cache de la formule de synthèse et reproductibilité contrôlés seulement."},
    ]
    specs = [
        sheet(NAMES[0], "Yautja — dialogues du cercle, 9 novembre 2026", "Suite du dernier classeur témoins Nov8; nouvelles preuves B05, historiques conservés.", columns(("metric", "Mesure", 44), ("value", "Résultat", 27), ("scope", "Portée / limite", 110)), summary),
        sheet(NAMES[1], "OPS-B05 — six membres, cinq contextes", "Matrice de portée attendue, rattachée aux tests; elle ne compte aucun geste animé produit.", columns(("member", "Membre", 27), ("memberId", "Identité", 25), ("context", "Contexte", 28), ("contextId", "Clé", 24), ("scope", "Portée", 85), ("evidence", "Preuves", 42)), contexts),
        sheet(NAMES[2], "Critères et phases indépendantes", data["sourceCriterion"], columns(
            ("id", "Critère", 18), ("criterion", "Résultat attendu", 95),
            ("implementation", "Intégré", 17), ("domainTested", "Logique", 17),
            ("ssrTested", "Rendu SSR", 17), ("browserTested", "Navigateur", 18),
            ("controllerTested", "Manette physique", 20), ("humanArtReviewed", "Art humain", 18),
            ("evidenceText", "Preuves", 37), ("remaining", "Portée / suite ouverte", 110)), criteria),
        sheet(NAMES[3], "Preuves et outils de la qualification courante", "Les preuves C37 antérieures gardent leur révision exacte. Aucun résultat n’est attribué rétroactivement.", columns(("id", "Référence", 22), ("kind", "Type", 28), ("path", "Fichier", 100), ("sha256", "SHA-256", 70), ("bytes", "Octets", 14), ("detail", "Portée", 110)), proof_rows),
        sheet(NAMES[4], "Sources inchangées et qualification B05", "108 classeurs originaux et 198 fichiers des trois lots du 8 novembre protégés; rien n’est déclaré terminé par inventaire.", columns(("kind", "Type", 29), ("path", "Fichier", 115), ("sha256", "SHA-256", 70), ("bytes", "Octets", 15), ("detail", "Provenance", 105)), source_rows),
    ]
    return {"root": str(ROOT), "baseline": {key: BASELINE[key] for key in ["path", "sha256"]},
            "release": "V20261109", "summary": NAMES[0], "historicalCount": 2,
            "zipDate": [2026, 11, 9, 0, 0, 0], "appendedSheets": NAMES, "sheets": specs,
            "workbookPath": str(ARTIFACT), "qualificationSha256": digest(QUALIFICATION.read_bytes()),
            "runtimeReport": fingerprint(data["runtimeReport"]), "proofRows": proof_rows,
            "protectedSources": {"workbooks": 108, "previousFiles": 198, "baseCommit": BASE}}


def portable_request(payload):
    """Keep checkout-specific absolute paths out of the reproducible receipt."""
    return {**payload, "root": "<repo-root>", "workbookPath": str(ARTIFACT.relative_to(ROOT))}


def workbook_cells(raw):
    tree = ET.fromstring(raw)
    values = {}
    for cell in tree.iter(f"{{{NS}}}c"):
        values[cell.attrib["r"]] = "".join(cell.find(f"{{{NS}}}is").itertext()) if cell.attrib.get("t") == "inlineStr" else cell.findtext(f"{{{NS}}}v")
        if cell.attrib.get("t") == "e":
            raise ValueError("Excel error cell: " + cell.attrib["r"])
    return tree, values


def verify_generated(payload):
    append = append_helper()
    structural = append.verify_workbook(payload)
    checked = 0
    with ZipFile(ARTIFACT) as archive:
        for index, spec in enumerate(payload["sheets"], 3):
            tree, cells = workbook_cells(archive.read(f"xl/worksheets/v20261109-sheet-{index}.xml"))
            for row_index, row in enumerate(spec["rows"], 5):
                for column_index, column in enumerate(spec["columns"], 1):
                    address = append.layout.column_name(column_index) + str(row_index)
                    expected = row.get(column["key"], "")
                    if isinstance(expected, dict):
                        cell = tree.find(f"{{{NS}}}sheetData/{{{NS}}}row[@r='{row_index}']/{{{NS}}}c[@r='{address}']")
                        if cell.findtext(f"{{{NS}}}f") != expected["formula"]:
                            raise ValueError("Wrong trusted formula: " + address)
                        expected = expected["cached"]
                    if cells.get(address) != str(expected):
                        raise ValueError("Workbook differs from qualified source: " + spec["name"] + "!" + address)
                    checked += 1
    if ARTIFACT.read_bytes() != append.build_workbook(payload):
        raise ValueError("Workbook is not reproducible from its qualified inputs")
    return {"passed": True, "scope": "Exact source cells, ZIP/XML, original parts/styles, cache and deterministic bytes; no native Excel or gameplay executed by this verifier.",
            "artifact": fingerprint(str(ARTIFACT.relative_to(ROOT))), "cellsCompared": checked,
            "sourceWorkbooksUnchanged": 108, "previousLotFilesUnchanged": 198,
            "appendDependenciesUnchanged": DEPENDENCIES, "structure": structural}
