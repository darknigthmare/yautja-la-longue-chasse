"""Append-only P0/P1 follow-up after the immutable 697bd87a qualification.

No historical generator is rerun, and a source declaration never becomes a
current qualification without a separately pinned receipt. All writes performed
by the command wrappers stay inside this new production lot.
"""
from __future__ import annotations

from collections import Counter
import copy
from functools import lru_cache
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/clan-war-command-20261109"
FOLLOW = LOT / "suivi"
PREVIOUS = "697bd87a7d29f42fc39e4d53603eda3020385301"
PREVIOUS_REGISTER = "production/p0p1-20261109/suivi/registre-priorites.json"
PREVIOUS_REGISTER_SHA = "43664b15dc0e915bf93049a2c0f1664a2f2c776600d84236926521532acaedff"
BASELINE = "production/p0p1-20261109/suivi/Yautja_Priorites_P0_P1_20261109.xlsx"
BASELINE_SHA = "78e3de92a382bbd9d309cc1b4459a0c8e3216c0a7617efac9935458a918e7feb"
DEPENDENCIES = {
    "scripts/lib/excel_followup_append.py": "321eada2b760f5a6ec6b9d273b2abc189a829f07a67c3805a690983408160e34",
    "scripts/build-excel-followup-v100.py": "91491b98d2576e8f3ce89067ba782629ac05675ae0541343256576749e1f8ab1",
    "scripts/audit-excel-bible-20261108.py": "6352d3e80fa4594485d36916c4baec540236cb47567579b17600678ff568962d",
}
ARTIFACT = FOLLOW / "Yautja_Commandement_P0_P1_20261109.xlsx"
INVENTORY = FOLLOW / "source-inventory.json"
REQUEST = FOLLOW / "build-request.json"
RELEASE = "V202611092"
SUMMARY = "Synthese" + RELEASE
SHEETS = [SUMMARY, "Priorites" + RELEASE, "Verifiees" + RELEASE,
          "Blocages" + RELEASE, "Criteres" + RELEASE, "Sources" + RELEASE]
PHASES = ["implementation", "domainTested", "browserTested", "physicalController", "humanArt"]
PHASE_STATES = {"Oui", "Partiel", "Non", "À vérifier", "Sans objet", "Antérieur"}
STATES = {"OUVERT", "PARTIEL", "QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"}
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
PRIORITY = re.compile(r"^P([01])(?:\b|\s|[-–—:/])", re.I)


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def packed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


@lru_cache(maxsize=None)
def _fingerprint(path):
    relative = Path(path)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Unsafe input path: " + str(path))
    file = ROOT / relative
    if not file.is_file() or file.is_symlink():
        raise ValueError("Missing regular input: " + str(path))
    raw = file.read_bytes()
    return {"path": str(relative), "sha256": digest(raw), "bytes": len(raw)}


def fingerprint(path):
    # Inputs are frozen for one invocation. Return copies so the inventory may
    # attach source metadata without altering a cached evidence fingerprint.
    return dict(_fingerprint(str(path)))


def pinned(path, expected):
    actual = fingerprint(path)
    if actual["sha256"] != expected:
        raise ValueError("Pinned historical input changed: " + path)
    return actual


def configuration():
    data = read(FOLLOW / "qualification-courante.json")
    if data["schemaVersion"] != 1:
        raise ValueError("Unknown qualification schema")
    return data


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def dependencies():
    for path, sha in DEPENDENCIES.items():
        pinned(path, sha)


def historical_inputs():
    pinned(BASELINE, BASELINE_SHA)
    pinned(PREVIOUS_REGISTER, PREVIOUS_REGISTER_SHA)
    manifest = "production/p0p1-20261109/suivi/historique-preserve.json"
    original = subprocess.check_output(["git", "show", PREVIOUS + ":" + manifest], cwd=ROOT)
    if (ROOT / manifest).read_bytes() != original:
        raise ValueError("The old historical manifest changed")
    data = json.loads(original)
    if data["workbooks"] != 112 or len(data["files"]) != 114:
        raise ValueError("The old protected source list differs")
    for item in data["files"]:
        pinned(item["path"], item["sha256"])
    return data


def freeze_inventory(source_commit):
    """Read actual integrated files; never fetch, checkout, or rewrite sources."""
    config = configuration()
    dependencies()
    historical = historical_inputs()
    commit = subprocess.check_output(["git", "rev-parse", source_commit + "^{commit}"], cwd=ROOT, text=True).strip()
    if config.get("sourceCommit") != commit:
        raise ValueError("Set the reviewed integrated sourceCommit before inventory")
    tree_raw = subprocess.check_output(["git", "ls-tree", "-r", "-z", commit], cwd=ROOT)
    tree = {}
    for record in tree_raw.decode().split("\0"):
        if record:
            meta, path = record.split("\t", 1)
            mode, kind, oid = meta.split()
            if kind == "blob":
                tree[path] = (mode, oid)
    paths = sorted(path for path in tree if path.endswith(".xlsx") and not path.startswith(str(LOT.relative_to(ROOT)) + "/"))
    old = {item["path"] for item in historical["files"] if item["path"].endswith(".xlsx")} | {BASELINE}
    if not old <= set(paths):
        raise ValueError("An earlier workbook is absent from the integrated source tree")
    decoder = load_module("command_followup_read_only_decoder", "scripts/audit-excel-bible-20261108.py")
    old_rows, workbook_rows, sources = set(), {}, []
    for path in paths:
        item = fingerprint(path)
        raw = (ROOT / path).read_bytes()
        if tree[path][0] != "100644" or hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() != tree[path][1]:
            raise ValueError("Workbook differs from reviewed integrated commit: " + path)
        decoded = decoder.read_workbook(io.BytesIO(raw))
        item.update(gitBlob=tree[path][1], historical=path in old,
                    sourceKind="CAPSULE_QA_DATEE" if "/qa/" in path else "CLASSEUR_DOCUMENTAIRE",
                    sheets=[{k: sheet[k] for k in ["name", "rowCount", "cellCount", "contentSha256"]} for sheet in decoded])
        sources.append(item)
        for sheet in decoded:
            for row in sheet["rows"]:
                priorities = sorted({"P" + match.group(1) for value in row["cells"].values()
                                     if (match := PRIORITY.match(str(value).strip()))})
                if not priorities:
                    continue
                row_hash = digest(packed(row["cells"]))
                if path in old:
                    old_rows.add(row_hash)
                else:
                    entry = workbook_rows.setdefault(row_hash, {"key": "XLSX:" + row_hash, "kind": "xlsx",
                        "priorities": priorities, "cells": row["cells"], "sourceRefs": []})
                    entry["sourceRefs"].append({"path": path, "sheet": sheet["name"], "row": row["row"], "rowSha256": row_hash})
    observations = [item for sha, item in workbook_rows.items() if sha not in old_rows]
    previous_bible_lines = set()
    for path in config.get("biblePaths", []):
        if path not in tree:
            raise ValueError("Bible input missing from integrated source tree: " + path)
        raw = (ROOT / path).read_bytes()
        item = fingerprint(path)
        if hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() != tree[path][1]:
            raise ValueError("Bible source differs from reviewed integrated commit: " + path)
        sources.append({**item, "gitBlob": tree[path][1], "kind": "bible"})
        previous = subprocess.run(["git", "show", PREVIOUS + ":" + path], cwd=ROOT, capture_output=True)
        if previous.returncode == 0:
            previous_bible_lines.update(line.strip() for line in previous.stdout.decode().splitlines())
        for number, line in enumerate(raw.decode().splitlines(), 1):
            priorities = sorted(set(re.findall(r"(?:^|[\s|*—–-])(P[01])(?:\b|[:—–])", line)))
            if not priorities or line.strip() in previous_bible_lines:
                continue
            observations.append({"key": "MD:" + digest(packed([path, line.strip()])), "kind": "markdown",
                                 "priorities": priorities, "text": line,
                                 "sourceRefs": [{"path": path, "line": number}]})
    observations.sort(key=lambda item: item["key"])
    return {"schemaVersion": 1, "sourceCommit": commit, "previousQualificationCommit": PREVIOUS,
            "scope": "Source observations only. Exact historical priority rows are not counted twice; novel prose still needs an explicit reconciliation before it becomes a subject.",
            "counts": {"workbooks": len(paths), "historicalWorkbooks": len(old), "additionalWorkbooks": len(set(paths) - old),
                       "additionalFollowupWorkbooks": sum(path not in old and "/qa/" not in path for path in paths),
                       "additionalQaCapsuleWorkbooks": sum(path not in old and "/qa/" in path for path in paths),
                       "novelXlsxPriorityObservations": sum(item["kind"] == "xlsx" for item in observations),
                       "novelBiblePriorityObservations": sum(item["kind"] == "markdown" for item in observations),
                       "novelPriorityObservations": len(observations), "historicalPriorityRowCopiesInNewWorkbooks": sum(sha in old_rows for sha in workbook_rows)},
            "sources": sources, "observations": observations}


def verified_inventory():
    inventory = read(INVENTORY)
    if inventory["sourceCommit"] != configuration()["sourceCommit"]:
        raise ValueError("Integrated sourceCommit differs from inventory")
    for item in inventory["sources"]:
        actual = fingerprint(item["path"])
        if any(actual[key] != item[key] for key in ["sha256", "bytes"]):
            raise ValueError("Source changed after inventory: " + item["path"])
    return inventory


def evidence(entries):
    result = []
    for entry in entries:
        if not entry.get("scope") or not re.fullmatch(r"[0-9a-f]{64}", entry.get("sha256", "")):
            raise ValueError("Evidence needs an explicit scope and pinned SHA256")
        actual = pinned(entry["path"], entry["sha256"])
        result.append({**entry, **actual})
    return result


def register(require_decisions=False):
    dependencies()
    historical_inputs()
    config, inventory = configuration(), verified_inventory()
    previous = read(ROOT / PREVIOUS_REGISTER)
    rows = copy.deepcopy(previous["rows"])
    for row in rows:
        row["previousQualification"] = {"commit": PREVIOUS, "status": row["status"],
                                        "scope": row["qualificationScope"],
                                        "sourceRegister": {"path": PREVIOUS_REGISTER, "sha256": PREVIOUS_REGISTER_SHA, "key": row["key"]},
                                        **{p: row[p] for p in PHASES}}
        if row["status"] in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"}:
            row["status"] = "QUALIFIE_BORNE_ANTERIEUR"
        for phase in PHASES:
            if row[phase] != "Sans objet":
                row[phase] = "Antérieur"
        row["qualificationScope"] = "Résultat daté conservé au commit 697bd87a ; aucune requalification automatique : " + row["qualificationScope"]
    by_key = {row["key"]: row for row in rows}
    observations = {item["key"]: item for item in inventory["observations"]}
    additions = {row["key"]: row for row in config.get("additions", [])}
    if len(additions) != len(config.get("additions", [])) or set(additions) & set(by_key):
        raise ValueError("Duplicate new subject identity")
    decisions = config.get("sourceDecisions", {})
    unknown = set(decisions) - set(observations)
    if unknown:
        raise ValueError("Unknown source observation decisions: " + str(sorted(unknown)))
    missing = set(observations) - set(decisions)
    if require_decisions and missing:
        raise ValueError("Novel source observations remain unreconciled: " + str(sorted(missing)))
    for observation_key, decision in decisions.items():
        if not decision.get("reason"):
            raise ValueError("Source reconciliation needs its reason: " + observation_key)
        disposition = decision["disposition"]
        key = decision.get("key")
        if disposition == "LINK_EXISTING" and key not in by_key:
            raise ValueError("Source reference links an unknown existing subject: " + observation_key)
        if disposition == "ADD" and key not in additions:
            raise ValueError("Source reference links an unknown addition: " + observation_key)
        if disposition not in {"ADD", "LINK_EXISTING", "DATED_DECLARATION", "REFERENCE_ONLY"}:
            raise ValueError("Unknown source disposition")
    for key, item in additions.items():
        links = [observations[obs] for obs, decision in decisions.items() if decision["disposition"] == "ADD" and decision.get("key") == key]
        if not links or item["priority"] not in {priority for link in links for priority in link["priorities"]}:
            raise ValueError("New priority must be explicit in its reconciled source: " + key)
        for name in ["id", "domain", "title", "criterion", "remaining"]:
            if not item.get(name):
                raise ValueError("Missing addition field: " + key + "/" + name)
        row = {**item, "status": "OUVERT", **{phase: "À vérifier" for phase in PHASES}, "evidence": [],
               "sources": [source for link in links for source in link["sourceRefs"]],
               "sourceDeclaration": item.get("sourceDeclaration", "Nouvelle déclaration documentaire ; réalisation à qualifier"),
               "qualificationScope": "Critère source nouveau rapproché ; aucune réalisation déduite de son inventaire."}
        by_key[key] = row
    for observation_key, decision in decisions.items():
        if decision["disposition"] == "LINK_EXISTING":
            by_key[decision["key"]].setdefault("additionalSourceRefs", []).extend(observations[observation_key]["sourceRefs"])
    source_paths = {item["path"] for item in inventory["sources"]}
    linked_sheets = {}
    for key, references in config.get("sourceLinks", {}).items():
        if key not in by_key:
            raise ValueError("Additional source links an unknown subject: " + key)
        for reference in references:
            path = reference["path"]
            if path not in source_paths or not path.endswith(".xlsx"):
                raise ValueError("Additional source is outside the reviewed workbook inventory: " + path)
            if path not in linked_sheets:
                decoder = load_module("command_followup_link_decoder", "scripts/audit-excel-bible-20261108.py")
                linked_sheets[path] = {sheet["name"]: {row["row"]: row["cells"] for row in sheet["rows"]}
                                       for sheet in decoder.read_workbook(ROOT / path)}
            cells = linked_sheets[path][reference["sheet"]][reference["row"]]
            if cells.get("A") != by_key[key]["id"] or digest(packed(cells)) != reference["rowSha256"]:
                raise ValueError("Additional source row identity or bytes differ: " + key)
            by_key[key].setdefault("additionalSourceRefs", []).append(reference)
    allowed = {"status", *PHASES, "remaining", "qualificationScope", "evidence", "generationState"}
    for key, update in config.get("updates", {}).items():
        if key not in by_key or set(update) - allowed:
            raise ValueError("Qualification cannot rewrite source identity/priority/criterion: " + key)
        if update.get("status", "OUVERT") not in STATES or any(update.get(phase, "À vérifier") not in PHASE_STATES for phase in PHASES):
            raise ValueError("Invalid qualification phase or status: " + key)
        if update.get("physicalController") == "Oui" or update.get("humanArt") == "Oui":
            raise ValueError("This automatic lot cannot attest physical hardware or human art: " + key)
        proof = evidence(update.get("evidence", []))
        if (update.get("status") == "QUALIFIE_BORNE" or any(update.get(phase) == "Oui" for phase in PHASES)) and not proof:
            raise ValueError("Positive qualification needs actual current receipts: " + key)
        if update.get("status") == "QUALIFIE_BORNE" and not update.get("qualificationScope"):
            raise ValueError("Bounded qualification needs its actual scope: " + key)
        by_key[key].update({**update, "evidence": proof})
    rows = sorted(by_key.values(), key=lambda row: (row["priority"], row["domain"], row["id"]))
    return {"schemaVersion": 1, "asOf": config["asOf"], "sourceCommit": inventory["sourceCommit"],
            "previousQualificationCommit": PREVIOUS,
            "scope": "Sujets documentaires P0/P1, résultats datés et nouvelles qualifications bornées séparés. Ni un compte de bugs ni un taux de complétion du jeu.",
            "counts": {"subjects": len(rows), "previousSubjects": len(previous["rows"]), "addedSubjects": len(additions),
                       "priorities": dict(Counter(row["priority"] for row in rows)), "statuses": dict(Counter(row["status"] for row in rows)),
                       "domains": dict(Counter(row["domain"] for row in rows)), "unreconciledSourceObservations": len(missing)},
            "rows": rows}


def source_text(row):
    return "\n".join(source["path"] + ("#" + source["sheet"] + "!" + str(source.get("row", ""))
                       if "sheet" in source else ":" + str(source.get("line", "")))
                       for source in row.get("sources", []) + row.get("additionalSourceRefs", []))


def proof_text(row):
    return "\n".join(item["path"] + " — " + item.get("scope", "Preuve datée") for item in row.get("evidence", []))


def changelog(data):
    config, inventory = configuration(), verified_inventory()
    counts = data["counts"]
    states = counts["statuses"]

    def clean(value):
        return str(value).replace("|", "\\|").replace("\n", "<br>")

    lines = ["# Suite des priorités et du commandement — 9 novembre 2026", "", config["scope"], "",
             "L’ensemble des P0/P1 n’est pas déclaré terminé. Les sujets représentent des exigences documentaires ; leur nombre n’est ni un nombre de bugs ni un taux de complétion du jeu.", "",
             f"Le registre comprend **{counts['subjects']} sujets** : {counts['priorities']['P0']} P0 et {counts['priorities']['P1']} P1. "
             f"Il conserve {states.get('QUALIFIE_BORNE_ANTERIEUR', 0)} qualifications antérieures, "
             f"{states.get('QUALIFIE_BORNE', 0)} nouvelles qualifications bornées, "
             f"{states.get('PARTIEL', 0)} partiels et {states.get('OUVERT', 0)} ouverts.", "",
             f"Les sources du commit `{inventory['sourceCommit']}` comprennent {inventory['counts']['workbooks']} XLSX : "
             f"{inventory['counts']['historicalWorkbooks']} historiques protégés, "
             f"{inventory['counts']['additionalFollowupWorkbooks']} nouveaux suivis et "
             f"{inventory['counts']['additionalQaCapsuleWorkbooks']} capsule QA datée. "
             f"Les {len(config.get('biblePaths', []))} Markdown de la bible et de ses avenants sont lus dans ce même arbre intégré.", "",
             f"Les {counts['addedSubjects']} nouvelles priorités explicites sont rapprochées. "
             f"Observations source restant sans rapprochement : {counts['unreconciledSourceObservations']}. "
             "Aucune priorité n’est inventée pour les autres critères non priorisés ni pour la demande d’interface.", "",
             "## Changements qualifiés dans cette passe", "",
             "Les reçus gardent leur build, leur méthode et leurs limites. Une fixture de composant ne vaut pas un parcours GameClient ; une API de manette synthétique ne vaut pas un périphérique physique.", "",
             "| Sujet | État | Portée actuelle | Suite conservée | Reçus |",
             "| --- | --- | --- | --- | --- |"]
    for key, update in sorted(config.get("updates", {}).items()):
        lines.append("| " + " | ".join(clean(value) for value in [key, update.get("status", "PARTIEL"),
                     update.get("qualificationScope", "Voir registre"), update.get("remaining", "Voir source"),
                     "\n".join(item["path"] for item in update.get("evidence", []))]) + " |")
    lines += ["", "## Nouvelles priorités source", "",
              "| ID | Priorité | Sujet | Critère source |", "| --- | --- | --- | --- |"]
    for row in config.get("additions", []):
        lines.append("| " + " | ".join(clean(row[key]) for key in ["id", "priority", "title", "criterion"]) + " |")
    release_state = ("Le classeur est exporté après vérification des reçus globaux du lot."
                     if config["readyForWorkbook"] is True else
                     "La qualification finale du lot et l’export attendent les vrais reçus globaux.")
    lines += ["", "## Conservation", "",
              "Les 113 anciens classeurs, les qualifications de la passe précédente et les outils XML d’append restent inchangés. Le prochain classeur ajoute six feuilles aux treize existantes ; la vérification compare leurs cellules et préserve les anciennes pièces ZIP.", "",
              release_state + " Aucun déploiement, art humain, appareil physique, nouvelle endurance de soixante minutes ou campagne complète n’est inféré de ce suivi.", ""]
    return "\n".join(lines)


def columns(*entries):
    return [{"key": key, "label": label, "width": width} for key, label, width in entries]


def sheet(name, title, subtitle, cols, rows):
    return {"name": name, "title": title, "subtitle": subtitle, "columns": cols, "rows": rows}


def payload():
    config = configuration()
    if config["readyForWorkbook"] is not True:
        raise ValueError("Integrated sources and final actual receipts are still pending")
    data = register(require_decisions=True)
    expected_register = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if (FOLLOW / "registre-priorites.json").read_text() != expected_register:
        raise ValueError("Regenerate the current register before export")
    if (FOLLOW / "CHANGELOG.md").read_text() != changelog(data):
        raise ValueError("Regenerate the current changelog before export")
    global_proofs = evidence(config.get("globalEvidence", []))
    final = [item for item in global_proofs if item.get("kind") == "finalVerification"]
    if len(final) != 1:
        raise ValueError("Exactly one pinned final current verification receipt is required")
    receipt = read(ROOT / final[0]["path"])
    if receipt.get("allP0P1Closed") is not False:
        raise ValueError("The final receipt must preserve the real unfinished global scope")
    passed = receipt.get("passed") is True or (receipt.get("tests", {}).get("failed") == 0 and
             all(receipt.get(phase, {}).get("exitCode") == 0 for phase in ["build", "lint"]))
    if not passed:
        raise ValueError("The final receipt does not establish its bounded verification passing")
    for path, expected in receipt.get("sourceSha256", {}).items():
        pinned(path, expected)
    rows = [{**row, "sourcesText": source_text(row), "evidenceText": proof_text(row)} for row in data["rows"]]
    qualified = [row for row in rows if row["status"] in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"} or any(row[p] == "Oui" for p in PHASES)]
    pending = [row for row in rows if row["status"] not in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"}]
    summary = [
        {"metric": "Sujets documentaires suivis", "value": {"formula": "COUNTA('" + SHEETS[1] + "'!A5:A" + str(len(rows) + 4) + ")", "cached": len(rows)}, "scope": data["scope"]},
        {"metric": "Priorités source P0 / P1", "value": str(data["counts"]["priorities"]), "scope": "Aucune promotion des P2 ou des demandes UI non priorisées."},
        {"metric": "États par critère", "value": str(data["counts"]["statuses"]), "scope": "Les résultats de697bd87a sont antérieurs ; seuls les reçus nouveaux qualifient le code courant."},
        {"metric": "Nouveaux sujets source", "value": data["counts"]["addedSubjects"], "scope": "Rapprochements explicites des observations nouvellement rencontrées après intégration des PR."},
        {"metric": "Feuilles historiques préservées", "value": 13, "scope": "Baseline SHA78e3de92… intact ; anciennes feuilles et tables conservées à l'octet."},
        {"metric": "Tous les P0/P1 terminés", "value": "Non attesté", "scope": "Voir les suites explicites ; un merge et une compilation ne terminent pas tous les chantiers."},
    ]
    for item in config.get("deliveries", []):
        summary.append({"metric": item["title"], "value": item["status"], "scope": item["scope"]})
    proofs = {item["path"]: item for item in global_proofs}
    inputs = [PREVIOUS_REGISTER, BASELINE, str(INVENTORY.relative_to(ROOT)),
              str((FOLLOW / "qualification-courante.json").relative_to(ROOT)), str((FOLLOW / "registre-priorites.json").relative_to(ROOT)), *DEPENDENCIES]
    for path in inputs:
        proofs[path] = fingerprint(path)
    for row in rows:
        for item in row.get("evidence", []):
            proofs[item["path"]] = fingerprint(item["path"])
    for item in verified_inventory()["sources"]:
        proofs[item["path"]] = {**fingerprint(item["path"]), "scope": "Source documentaire intégrée, état distinct d'une preuve de jeu"}
    main_cols = columns(("id", "ID", 28), ("priority", "Priorité", 12), ("domain", "Domaine", 30),
                        ("title", "Sujet", 42), ("criterion", "Critère source", 100), ("status", "Qualification", 32),
                        ("sourcesText", "Sources / cellules", 110), ("evidenceText", "Preuves datées / portée", 110), ("remaining", "Suite ouverte", 110))
    specs = [sheet(SHEETS[0], "Commandement et P0/P1 — suite du9novembre2026", config["scope"], columns(("metric", "Mesure", 50), ("value", "Résultat", 55), ("scope", "Portée", 125)), summary),
             sheet(SHEETS[1], "Registre courant des priorités documentaires", data["scope"], main_cols, rows),
             sheet(SHEETS[2], "Vérifications antérieures et nouvelles", "Le commit et la portée des preuves restent distincts ; aucune validation artistique automatique.", main_cols, qualified),
             sheet(SHEETS[3], "Critères encore ouverts ou partiels", "Un résultat antérieur à reprendre ne devient pas une nouvelle preuve.", columns(("id", "ID", 28), ("priority", "Priorité", 12), ("domain", "Domaine", 30), ("remaining", "Suite", 120), ("sourcesText", "Source", 110)), pending),
             sheet(SHEETS[4], "Phases de qualification indépendantes", "Antérieur signifie résultat daté, aucune nouvelle certification du runtime.", columns(("id", "ID", 28), ("criterion", "Critère", 100), *((phase, label, 22) for phase, label in zip(PHASES, ["Intégration", "Logique", "Navigateur", "Manette physique", "Art humain"])), ("qualificationScope", "Portée", 120), ("evidenceText", "Preuves", 110)), rows),
             sheet(SHEETS[5], "Sources et preuves épinglées", "Baseline et outils d'append inchangés ; aucune source historique réétiquetée.", columns(("path", "Fichier", 120), ("sha256", "SHA256", 70), ("bytes", "Octets", 15), ("scope", "Portée", 110)), sorted(proofs.values(), key=lambda item: item["path"]))]
    return {"root": str(ROOT), "baseline": {"path": BASELINE, "sha256": BASELINE_SHA}, "release": RELEASE,
            "summary": SUMMARY, "historicalCount": 13, "zipDate": [2026, 11, 9, 0, 0, 0],
            "appendedSheets": SHEETS, "sheets": specs, "workbookPath": str(ARTIFACT)}


def portable(data):
    names = ["qualification-courante.json", "source-inventory.json", "registre-priorites.json", "CHANGELOG.md"]
    inputs = [str((FOLLOW / name).relative_to(ROOT)) for name in names]
    inputs += [str((LOT / "tools" / name).relative_to(ROOT)) for name in ["followup.py", "build-followup.py", "verify-followup.py"]]
    return {"previousQualificationCommit": PREVIOUS, "sourceCommit": configuration()["sourceCommit"],
            "baseline": data["baseline"], "release": RELEASE, "historicalCount": 13,
            "appendedSheets": SHEETS, "workbookPath": str(ARTIFACT.relative_to(ROOT)),
            "inputs": [fingerprint(path) for path in inputs],
            "sheets": [{"name": spec["name"], "rows": len(spec["rows"]), "columns": len(spec["columns"]), "sha256": digest(packed(spec))} for spec in data["sheets"]]}


def verify(data):
    dependencies()
    appender = load_module("command_followup_append", "scripts/lib/excel_followup_append.py")
    structure = appender.verify_workbook(data)
    compared = 0
    with ZipFile(ARTIFACT) as archive:
        for index, spec in enumerate(data["sheets"], 14):
            tree = ET.fromstring(archive.read(f"xl/worksheets/{RELEASE.lower()}-sheet-{index}.xml"))
            cells = {cell.attrib["r"]: cell for cell in tree.iter(f"{{{NS}}}c")}
            for row_number, row in enumerate(spec["rows"], 5):
                for col_number, col in enumerate(spec["columns"], 1):
                    address = appender.layout.column_name(col_number) + str(row_number)
                    cell = cells[address]
                    if cell.get("t") == "e":
                        raise ValueError("Excel error cell: " + spec["name"] + "!" + address)
                    actual = "".join(cell.find(f"{{{NS}}}is").itertext()) if cell.get("t") == "inlineStr" else cell.findtext(f"{{{NS}}}v")
                    expected = row.get(col["key"], "")
                    if isinstance(expected, dict):
                        if cell.findtext(f"{{{NS}}}f") != expected["formula"]:
                            raise ValueError("Trusted formula differs")
                        expected = expected["cached"]
                    if actual != str(expected):
                        raise ValueError("Cell differs: " + spec["name"] + "!" + address)
                    compared += 1
    if ARTIFACT.read_bytes() != appender.build_workbook(data):
        raise ValueError("Workbook is not byte-reproducible")
    return {"passed": True, "artifact": fingerprint(str(ARTIFACT.relative_to(ROOT))), "cellsCompared": compared,
            "structure": structure, "historicalWorkbooksUnchanged": 113,
            "scope": "Source hashes, source decisions, cells, preserved original ZIP parts and deterministic reconstruction. No native Excel, new gameplay, physical controller or human art executed by this verifier."}
