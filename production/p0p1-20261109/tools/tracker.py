"""Dated, bounded P0/P1 reconciliation; never rewrites a source workbook."""
from __future__ import annotations

from collections import Counter
from functools import lru_cache
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/p0p1-20261109"
FOLLOW = LOT / "suivi"
REGISTRY = ROOT / "production/excel-bible-20261108/suivi/excel-open-register.json"
BASE = "39b601ce1873a1f400d2f545f0fab97691b779e3"
HISTORY_SHA = "20dd082b7c0af095b14dbb7d4fc8771e30b051320a3e7801efd8ece6582fcc0e"
BASELINE = "production/crew-dialogue-20261109/suivi/Yautja_Dialogues_Equipage_20261109.xlsx"
BASELINE_SHA = "5d9a9b26952612437bba9d7e7397b2d5b918b0999765a650429213497b34e4fb"
DEPENDENCIES = {
    "scripts/lib/excel_followup_append.py": "321eada2b760f5a6ec6b9d273b2abc189a829f07a67c3805a690983408160e34",
    "scripts/build-excel-followup-v100.py": "91491b98d2576e8f3ce89067ba782629ac05675ae0541343256576749e1f8ab1",
}
ARTIFACT = FOLLOW / "Yautja_Priorites_P0_P1_20261109.xlsx"
REQUEST = FOLLOW / "build-request.json"
RELEASE = "V202611091"
SUMMARY = "Synthese" + RELEASE
SHEETS = [SUMMARY, "Priorites" + RELEASE, "Verifiees" + RELEASE,
          "Blocages" + RELEASE, "Criteres" + RELEASE, "Sources" + RELEASE]
PHASES = ["implementation", "domainTested", "browserTested", "physicalController", "humanArt"]
PHASE_STATES = {"Oui", "Partiel", "Non", "À vérifier", "Sans objet", "Antérieur"}
STATE_VALUES = {"OUVERT_A_RAPPROCHER", "OUVERT", "PARTIEL", "QUALIFIE_BORNE_ANTERIEUR", "QUALIFIE_BORNE"}
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


@lru_cache(maxsize=None)
def fingerprint(path):
    rel = Path(path)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError("Unsafe source path: " + str(path))
    filename = ROOT / rel
    if not filename.is_file() or filename.is_symlink():
        raise ValueError("Missing regular source: " + str(path))
    raw = filename.read_bytes()
    return {"path": str(rel), "sha256": digest(raw), "bytes": len(raw)}


def protected_sources():
    history_path = FOLLOW / "historique-preserve.json"
    if digest(history_path.read_bytes()) != HISTORY_SHA:
        raise ValueError("The initial historical-source manifest changed")
    data = read(history_path)
    if data["baseCommit"] != BASE or data["workbooks"] != 112 or len(data["files"]) != 114:
        raise ValueError("Expected all112 initial XLSX and two historical registers")
    for item in data["files"]:
        actual = fingerprint(item["path"])
        if any(actual[k] != item[k] for k in ["sha256", "bytes"]):
            raise ValueError("Protected historical source changed: " + item["path"])
        raw = (ROOT / item["path"]).read_bytes()
        if hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() != item["gitBlob"]:
            raise ValueError("Protected Git blob differs: " + item["path"])
    return data


def original_reference(source, row=None, cells=None):
    result = dict(source)
    if row is not None:
        result["row"] = row
    if cells:
        result["cellRange"] = "A" + str(result["row"]) + ":" + max(cells, key=lambda c: (len(c), c)) + str(result["row"])
        result["cells"] = cells
    return result


def base_row(key, ident, priority, domain, title, criterion, sources, declaration, origin):
    return {"key": key, "id": ident, "priority": priority, "domain": domain,
            "title": title, "criterion": criterion, "sources": sources,
            "sourceDeclaration": declaration, "priorityOrigin": origin,
            "status": "OUVERT_A_RAPPROCHER", "implementation": "À vérifier",
            "domainTested": "À vérifier", "browserTested": "À vérifier",
            "physicalController": "À vérifier", "humanArt": "À vérifier",
            "evidence": [], "remaining": "Rapprocher le critère exact du code et des preuves actuels ; aucune clôture déduite du statut historique.",
            "qualificationScope": "Source documentaire ; réalisation actuelle non certifiée par l’inventaire."}


def extra_open(row):
    state = " | ".join(str(v) for v in row["states"].values()).lower()
    return row["authoritativeSources"][0]["sheet"] == "PrioritesV112" or any(
        word in state for word in ["implémenter", "manuelle", "mesurer", "attendue", "en revue", "comparer", "non activé"])


def register_rows():
    source = read(REGISTRY)
    originals = [r for r in source["items"] if r["priority"] in {"P0", "P1"}]
    if len(originals) != 2514 or len({r["key"] for r in originals}) != 2514:
        raise ValueError("The historical2514-priority source register changed")
    result = [base_row(r["key"], r["id"], r["priority"], r["domain"], r["title"], r["criterion"],
                       r["sources"], r["sourceStatus"], "Registre consolidé du8novembre, priorité explicite") for r in originals]
    for row, old in zip(result, originals):
        row["historicalReconciliation"] = old["reconciliation"]
        row["sourceKind"] = old["scope"]
        if old.get("remaining"):
            row["historicalRemaining"] = old["remaining"]
    phg_source = read(LOT / "inventory/phg-source-manipulations.json")
    if fingerprint(phg_source["path"])["sha256"] != phg_source["sha256"]:
        raise ValueError("The original PHG manipulation source changed")
    phg_rows = {r["cells"]["A"]: r for r in phg_source["rows"]}
    for row in result:
        if row["domain"] != "Personnalisation et arsenal" or row["id"] not in phg_rows:
            continue
        raw = phg_rows[row["id"]]
        row["historicalCriterion"] = row["criterion"]
        row["criterion"] = raw["cells"]["C"] + "\nRésultat attendu : " + raw["cells"]["D"]
        row["sources"] = [original_reference({"path": phg_source["path"], "sheet": phg_source["sheet"]}, raw["row"], raw["cells"])]
    extras = read(LOT / "inventory/supplement-observations.json")["rows"]
    selected = [r for r in extras if extra_open(r)]
    if len(selected) != 35:
        raise ValueError("Expected35 explicit additional priorities omitted by the historical extractor")
    for raw in selected:
        cells = raw["cells"]
        ref = raw["authoritativeSources"][0]
        ident = str(cells.get("A", ""))
        if ref["sheet"] == "PrioritesV112":
            title, domain, criterion = cells["B"], "The Pit" if cells["A"].startswith(("M_", "CIN_")) else "Guerre des clans", cells["E"] + "\n" + cells["G"]
        elif ref["sheet"] == "V5 Lots de réalisation":
            title, domain, criterion = cells["B"], "Bible V5/V6 — lots de réalisation", cells["D"] + "\nAcceptation : " + cells["E"]
        elif ref["sheet"] == "Opérations":
            title, domain, criterion = cells["C"], "Clan Ship", cells["D"]
        elif ref["sheet"] == "Tests_Parcours":
            title, domain, criterion = cells["B"], "Personnalisation et arsenal", cells["C"] + "\nRésultat attendu : " + cells["D"]
        else:
            ident = "PHG-PLAN-" + str(raw["row"])
            title, domain, criterion = cells["B"], "Personnalisation et arsenal", str(cells["B"]) + "\n" + str(cells.get("E", ""))
        sources = [original_reference(s, raw["row"], cells) for s in raw["authoritativeSources"]]
        row = base_row(domain + ":" + ident, ident, raw["priorities"][0], domain, title, criterion, sources,
                       " | ".join(str(v) for v in raw["states"].values()) or str(cells.get("F", "Reste historique explicite")),
                       "Complément du scan112XLSX ; l’ancien extracteur n’avait pas retenu cette priorité")
        if ref["sheet"] == "PrioritesV112":
            row["historicalRemaining"] = cells["F"]
        result.append(row)
    for raw in read(LOT / "inventory/warp-priority-requests.json"):
        ident = "WARP-" + str(raw["id"]).zfill(3)
        result.append(base_row("Warp Universe:" + ident, ident, raw["priority"], "Warp Universe", raw["request"],
                               raw["criterion"], [{"path": raw["source"], "line": raw["line"]}],
                               "Demande P0/P1 du document de reprise du5novembre ; vérifier les livraisons ultérieures.", "Priorité explicite dans la bible Markdown"))
    tribes = (ROOT / "docs/campagne/planetes-tribus/REPRISE.md").read_text().splitlines()
    for ident, line, priority in [("PT-RACCORD", 26, "P0"), ("PT-CITERNE", 27, "P1")]:
        cells = [cell.strip() for cell in tribes[line - 1].split("|")[1:-1]]
        if not cells[0].startswith(priority):
            raise ValueError("Planet/tribe priority source line moved")
        result.append(base_row("Planètes et tribus:" + ident, ident, priority, "Planètes et tribus", cells[0],
                               cells[1] + "\nAcceptation : " + cells[2], [{"path": "docs/campagne/planetes-tribus/REPRISE.md", "line": line}],
                               cells[0], "Priorité explicite dans la bible Markdown"))
    if len(result) != 2577 or len({r["key"] for r in result}) != 2577:
        raise ValueError("Expected2577 distinct documentary priority subjects; do not silently drop one")
    apply_prior_evidence(result)
    qualification = read(FOLLOW / "qualification-courante.json")
    by_key = {r["key"]: r for r in result}
    for key, update in qualification["updates"].items():
        if key not in by_key:
            raise ValueError("Qualification refers to an unknown priority: " + key)
        allowed = {"status", *PHASES, "evidence", "remaining", "qualificationScope", "generationState",
                   "diagnosticCode", "openCriteria", "entityKeys", "sourceReconciliation"}
        if set(update) - allowed:
            raise ValueError("Qualification cannot rewrite source identity, priority or criterion: " + key)
        for phase in PHASES:
            if phase in update and update[phase] not in PHASE_STATES:
                raise ValueError("Invalid phase: " + key + "/" + phase)
        if "status" in update and update["status"] not in STATE_VALUES:
            raise ValueError("Invalid current status: " + key)
        if any(update.get(p) == "Oui" for p in PHASES) and not update.get("evidence"):
            raise ValueError("Positive qualification has no actual evidence: " + key)
        if update.get("physicalController") == "Oui" or update.get("humanArt") == "Oui":
            raise ValueError("This automatic lot cannot attest physical hardware or human art approval")
        for item in update.get("evidence", []):
            actual = fingerprint(item["path"])
            if item.get("sha256") and actual["sha256"] != item["sha256"]:
                raise ValueError("Evidence changed after qualification: " + item["path"])
        by_key[key].update(update)
        restored = update.get("sourceReconciliation", {})
        if restored.get("criterion"):
            by_key[key].setdefault("historicalCriterion", by_key[key]["criterion"])
            by_key[key]["criterion"] = restored["criterion"]
    return sorted(result, key=lambda r: (r["priority"], r["domain"], r["id"]))


def prior_reference(path, scope):
    return {**fingerprint(path), "scope": scope, "kind": "Preuve antérieure, non réexécutée par l’inventaire"}


def apply_prior_evidence(rows):
    b05 = "production/crew-dialogue-20261109/verification.json"
    source_qualification = read(ROOT / "production/excel-bible-20261108/suivi/qualification-courante.json")
    bible = {r["id"]: r for r in read(LOT / "qa/observations/build5-source-reconciliation.json")["rows"]}
    pit = {r["id"]: r for r in read(LOT / "qa/observations/pit-source-reconciliation.json")["rows"]}
    for row in rows:
        if row["id"] == "OPS-B05" and row["domain"] == "Clan Ship":
            row.update(status="QUALIFIE_BORNE_ANTERIEUR", implementation="Antérieur", domainTested="Antérieur", browserTested="Antérieur",
                       physicalController="Sans objet", humanArt="À vérifier", qualificationScope="Commit39b601ce : six membres × cinq contextes,52contrôles navigateur et248tests dont51nouveaux ; portée indépendante des routines/animations P2.",
                       remaining="Critère dialogue attesté au commit39b601ce ; rejouer si ses sources changent. Aucune nouvelle animation, routine ni revue artistique humaine déduite.",
                       evidence=[prior_reference(b05, "Qualification bornée B05 antérieure à la présente passe")])
        elif row["key"] in source_qualification["sourceOverrides"]:
            old = source_qualification["sourceOverrides"][row["key"]]
            row.update(status="PARTIEL", implementation="Antérieur", domainTested="Antérieur",
                       qualificationScope=old["reconciliation"], remaining=old["remaining"],
                       evidence=[prior_reference("production/excel-bible-20261108/suivi/qualification-courante.json", "État daté, relire les preuves ultérieures")])
        elif row["id"] in bible:
            old = bible[row["id"]]
            row.update(status="PARTIEL" if old["currentAuditStatus"] == "Partiel" else "OUVERT", implementation="Partiel" if old["currentAuditStatus"] == "Partiel" else "À vérifier",
                       qualificationScope=old["currentAuditNote"], remaining=old["remaining"],
                       evidence=[prior_reference("production/p0p1-20261109/qa/observations/build5-source-reconciliation.json", "Lecture de code uniquement ; aucun nouveau parcours")])
        elif row["id"] in pit:
            old = pit[row["id"]]
            row.update(status="PARTIEL", implementation="Partiel", qualificationScope="BODY natif gauche/droite existant ; binding runtime observé : " + str(old["binding"]),
                       remaining="Conserver les BODY existants. " + ("Projection bornée au duo Feral/Scar sans costumes ; la source globale reste ouverte." if old["binding"] == "conditional-move" else "Victime, contacts, objets et scène complète restent à qualifier séparément du BODY."),
                       evidence=[prior_reference("production/p0p1-20261109/qa/observations/pit-source-reconciliation.json", "Observation des admissions/bindings seulement ; ni art humain nouveau ni gameplay joué")])


def source_text(row):
    return "\n".join(s["path"] + ("#" + s["sheet"] + "!" + s.get("cellRange", str(s.get("row", ""))) if "sheet" in s else ":" + str(s.get("line", ""))) for s in row["sources"])


def evidence_text(row):
    return "\n".join(item["path"] + " — " + item.get("scope", "Voir preuve") for item in row["evidence"])


def blockers(row):
    if row["status"] in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"}:
        return []
    text = (row["criterion"] + " " + row["title"] + " " + row["remaining"]).lower()
    tags = []
    if re.search(r"serveur|deux appareils|cloud / pvp|autoritaire", text):
        tags.append("Serveur / autorité réelle")
    if re.search(r"manette|matériel|lecteur d.écran|60min", text):
        tags.append("Appareil / essai dédié")
    if re.search(r"artist|1:1|silhouette|sprite|png|uv |face/profil/dos|morpholog|natif", text):
        tags.append("Art / fidélité à qualifier")
    if re.search(r"produire|développer|implément|intégrer|raccorder|manquant|absent", text):
        tags.append("Production / raccord restant")
    return tags or ["Preuve courante à rapprocher"]


def current_register():
    protected_sources()
    rows = register_rows()
    return {"schemaVersion": 1, "asOf": "2026-11-09", "baseCommit": BASE,
            "scope": "2577 sujets documentaires P0/P1 :2514 du registre8nov,35compléments explicites XLSX,26Warp et2planètes/tribus. Ce compte n'est ni un nombre de bugs ni un taux de complétion du jeu.",
            "counts": {"subjects": len(rows), "priorities": dict(Counter(r["priority"] for r in rows)),
                       "domains": dict(Counter(r["domain"] for r in rows)), "statuses": dict(Counter(r["status"] for r in rows)),
                       "originalRegistered": 2514, "extraXlsx": 35, "warp": 26, "planetsTribes": 2},
            "supplementObservations": 272, "rows": rows}


def markdown(data):
    def clean(value):
        return str(value).replace("|", "\\|").replace("\n", "<br>")
    lines = ["# Registre P0/P1 — 9 novembre 2026", "", data["scope"], "",
             "Chaque ligne conserve sa source et sa déclaration datée. Les preuves sont qualifiées par phase ; une ancienne mention ouverte n’est pas un diagnostic nouveau. Les272observations de contrôle restent séparées du compte des sujets.", "",
             "| ID | Priorité | Domaine | Critère exact | Source | État courant | Preuve / portée | Suite |", "|---|---|---|---|---|---|---|---|"]
    for row in data["rows"]:
        lines.append("| " + " | ".join(clean(v) for v in [row["id"], row["priority"], row["domain"], row["criterion"], source_text(row), row["status"], evidence_text(row) or row["qualificationScope"], row["remaining"]]) + " |")
    return "\n".join(lines) + "\n"


def followup_summary(data):
    rows = data["rows"]
    fields = ["key", "id", "priority", "domain", "qualificationScope", "remaining", "evidence"]
    return {
        "schemaVersion": 1, "asOf": data["asOf"], "baseCommit": BASE,
        "meaning": "Documentary priority subjects, with bounded current results. Unreconciled declarations do not establish missing code, and partial qualification does not close the full source criterion.",
        "counts": data["counts"],
        "newBoundedQualifications": [{key: r[key] for key in fields} for r in rows if r["status"] == "QUALIFIE_BORNE"],
        "retainedPriorQualifications": [{key: r[key] for key in fields} for r in rows if r["status"] == "QUALIFIE_BORNE_ANTERIEUR"],
        "explicitOpen": [{key: r[key] for key in fields} for r in rows if r["status"] == "OUVERT"],
        "partialByDomain": dict(Counter(r["domain"] for r in rows if r["status"] == "PARTIEL")),
        "documentedSourceDiagnoses": dict(Counter(r["diagnosticCode"] for r in rows if r.get("diagnosticCode"))),
        "unreconciledDeclarationsByDomain": dict(Counter(r["domain"] for r in rows if r["status"] == "OUVERT_A_RAPPROCHER")),
        "followupCategories": dict(Counter(tag for r in rows for tag in blockers(r))),
        "sourceOnlyCandidates": [{key: r[key] for key in ["key", "id", "generationState", "remaining"]}
                                 for r in rows if r.get("generationState") == "Candidat source livré, non raccordé aux missions"],
        "globalGameCompletionAttested": False,
        "physicalControllerAttestedByThisLot": False,
        "humanArtApprovalAttestedByThisLot": False,
    }


def helper():
    for path, expected in DEPENDENCIES.items():
        if fingerprint(path)["sha256"] != expected:
            raise ValueError("Append helper or frozen XML layout changed: " + path)
    spec = importlib.util.spec_from_file_location("p0p1_append", ROOT / "scripts/lib/excel_followup_append.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def columns(*items):
    return [{"key": k, "label": label, "width": width} for k, label, width in items]


def sheet(name, title, subtitle, cols, rows):
    return {"name": name, "title": title, "subtitle": subtitle, "columns": cols, "rows": rows}


def payload():
    qualification = read(FOLLOW / "qualification-courante.json")
    if qualification["readyForWorkbook"] is not True:
        raise ValueError("Final real receipts are pending; readyForWorkbook is false")
    data = current_register()
    for name, expected in [("registre-priorites.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n"),
                           ("registre-priorites.md", markdown(data)),
                           ("actions-restantes.json", json.dumps(followup_summary(data), ensure_ascii=False, indent=2) + "\n")]:
        if (FOLLOW / name).read_text() != expected:
            raise ValueError("Regenerate the current priority register before workbook export: " + name)
    rows = [{**r, "sourcesText": source_text(r), "evidenceText": evidence_text(r), "blockers": "\n".join(blockers(r))} for r in data["rows"]]
    verified = [r for r in rows if r["status"] in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"} or any(r[p] == "Oui" for p in PHASES)]
    open_rows = [r for r in rows if r["status"] not in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"}]
    proofs = {p: fingerprint(p) for p in [str((FOLLOW / "qualification-courante.json").relative_to(ROOT)), str((FOLLOW / "registre-priorites.json").relative_to(ROOT)), str((FOLLOW / "historique-preserve.json").relative_to(ROOT)), BASELINE, *DEPENDENCIES]}
    for row in rows:
        for item in row["evidence"]:
            proofs[item["path"]] = fingerprint(item["path"])
    for item in qualification.get("globalEvidence", []):
        actual = fingerprint(item["path"])
        if item.get("sha256") and item["sha256"] != actual["sha256"]:
            raise ValueError("Global evidence changed: " + item["path"])
        proofs[item["path"]] = {**actual, "scope": item.get("scope", "Voir rapport")}
    if "production/p0p1-20261109/verification.json" not in proofs:
        raise ValueError("The final root verification receipt must be included before workbook export")
    root_receipt = read(LOT / "verification.json")
    if root_receipt["allP0P1Closed"] is not False or root_receipt["documentarySubjects"] != len(rows):
        raise ValueError("The global receipt must preserve the real scope and open source criteria")
    if root_receipt["tests"]["failed"] != 0 or root_receipt["tests"]["passed"] != 689 or root_receipt["tests"]["files"] != 70:
        raise ValueError("The final real689-test/70-file receipt differs")
    for phase in ["build", "lint"]:
        if root_receipt[phase]["exitCode"] != 0:
            raise ValueError("The actual final " + phase + " did not pass")
    for path, expected in root_receipt["sourceSha256"].items():
        if fingerprint(path)["sha256"] != expected:
            raise ValueError("Qualified final source changed: " + path)
    inputs = root_receipt["runtimeInputs"]
    if fingerprint(inputs["path"])["sha256"] != inputs["sha256"]:
        raise ValueError("Current runtime inputs no longer match the global receipt")
    summary = [
        {"metric": "Sujets documentaires P0/P1 suivis", "value": {"formula": "COUNTA('" + SHEETS[1] + "'!A5:A" + str(len(rows) + 4) + ")", "cached": len(rows)}, "scope": data["scope"]},
        {"metric": "P0 / P1", "value": str(data["counts"]["priorities"]), "scope": "Priorités source conservées ; pas de promotion inventée des P2."},
        {"metric": "Clôtures bornées et antérieures", "value": sum(r["status"] in {"QUALIFIE_BORNE", "QUALIFIE_BORNE_ANTERIEUR"} for r in rows), "scope": "Chaque preuve garde sa version et ses limites ; aucun taux de complétion global."},
        {"metric": "Sujets à poursuivre / rapprocher", "value": len(open_rows), "scope": "Ne pas confondre absence de preuve et absence de code."},
        {"metric": "Anciens XLSX inchangés", "value": 112, "scope": "Empreintes et blobs contrôlés avant export et à chaque vérification."},
        {"metric": "Feuilles antérieures préservées", "value": 7, "scope": "Classeur B05 intact, sept feuilles conservées à l’octet."},
        {"metric": "Observations complémentaires", "value": 272, "scope": "Incluent références, risques, mesures et qualifications datées ; hors compte des sujets."},
        {"metric": "Tests finaux / fichiers", "value": "689 / 70", "scope": "Zéro échec ; les suites677/688antérieures et329indépendants ne sont pas additionnées."},
        {"metric": "Contrôles Next / fixture archive séparée", "value": "105 / 17", "scope": "Six recettes Next distinctes et17contrôles de composants ; les versions et leurs limites restent dans les reçus."},
        {"metric": "Vraies chasses de contrat", "value": root_receipt["nativeHunts"]["completed"], "scope": "Quatre nouveaux reçus ciblés ; préconditions historiques déclarées, sans campagne complète depuis zéro."},
        {"metric": "T15 : durée / matières / confirmations", "value": "3600,0029 s / 77 / 300", "scope": "Allocateurs GPU mesurés par memory-infra surSwANGLElogiciel ; aucun GPU matériel ni résultat universel déduit."},
        {"metric": "Moteur Excel natif / art humain / manette physique", "value": "Non attestés", "scope": "Le vérificateur contrôle XML, cellules, caches et reproductibilité ; il ne joue pas au jeu."},
    ]
    main_cols = columns(("id", "ID", 28), ("priority", "Priorité", 12), ("domain", "Domaine", 30), ("title", "Sujet", 38),
                        ("generationState", "Candidat source / usage", 55),
                        ("criterion", "Critère", 100), ("status", "Qualification courante", 32),
                        ("diagnosticCode", "Diagnostic source (voir preuve datée)", 55), ("sourcesText", "Sources / cellules", 110),
                        ("sourceDeclaration", "Déclaration historique", 38), ("evidenceText", "Preuves / portée", 110), ("remaining", "Suite ouverte", 110))
    specs = [sheet(SHEETS[0], "P0/P1 — qualification du9novembre2026", "Nouveaux résultats, sources antérieures conservées ; aucune clôture globale par compilation.", columns(("metric", "Mesure", 48), ("value", "Résultat", 35), ("scope", "Portée", 120)), summary),
             sheet(SHEETS[1], "Registre intégral des priorités explicites", data["scope"], main_cols, rows),
             sheet(SHEETS[2], "Vérifications bornées, dates et limites", "Une phase réussie ne clôture pas toutes les autres phases.", main_cols, verified),
             sheet(SHEETS[3], "Suites ouvertes et besoins de qualification", "Ces catégories servent au tri ; l’absence de preuve ne déclare pas le code absent.", columns(("id", "ID", 28), ("priority", "Priorité", 12), ("domain", "Domaine", 30), ("blockers", "Nature de la suite", 38), ("remaining", "Travail / preuve restant", 115), ("sourcesText", "Source", 105)), open_rows),
             sheet(SHEETS[4], "Critères : phases indépendantes", "Antérieur renvoie à une preuve datée ; seuls les nouveaux reçus qualifient leurs parcours exacts.", columns(("id", "ID", 28), ("criterion", "Critère", 100), ("implementation", "Intégration", 20), ("domainTested", "Logique", 20), ("browserTested", "Navigateur", 20), ("physicalController", "Manette physique", 23), ("humanArt", "Art humain", 20), ("qualificationScope", "Portée constatée", 110), ("evidenceText", "Preuves", 110)), rows),
             sheet(SHEETS[5], "Sources, preuves et outils inchangés", "Les112originaux et le dernier classeur B05 restent inchangés.", columns(("path", "Fichier", 120), ("sha256", "SHA-256", 70), ("bytes", "Octets", 15), ("scope", "Portée", 110)), list(proofs.values()) + [{**x, "scope": "Source antérieure protégée"} for x in protected_sources()["files"]])]
    return {"root": str(ROOT), "baseline": {"path": BASELINE, "sha256": BASELINE_SHA}, "release": RELEASE,
            "summary": SUMMARY, "historicalCount": 7, "zipDate": [2026, 11, 9, 0, 0, 0],
            "appendedSheets": SHEETS, "sheets": specs, "workbookPath": str(ARTIFACT)}


def portable(data):
    # The full register is already versioned. Retain exact fingerprints rather
    # than duplicating its thousands of source paragraphs in the build receipt.
    inputs = [
        "production/p0p1-20261109/suivi/registre-priorites.json",
        "production/p0p1-20261109/suivi/registre-priorites.md",
        "production/p0p1-20261109/suivi/actions-restantes.json",
        "production/p0p1-20261109/suivi/qualification-courante.json",
        "production/p0p1-20261109/suivi/historique-preserve.json",
        "production/p0p1-20261109/inventory/classeurs.json",
        "production/p0p1-20261109/inventory/supplement-observations.json",
        "production/p0p1-20261109/inventory/warp-priority-requests.json",
        "production/p0p1-20261109/inventory/phg-source-manipulations.json",
        *["production/p0p1-20261109/tools/" + name for name in [
            "tracker.py", "build-tracker.py", "verify-tracker.py", "audit-priorities.py", "import-admission.py"]],
        *DEPENDENCIES,
    ]
    return {"baseCommit": BASE, "baseline": data["baseline"], "release": RELEASE,
            "summary": SUMMARY, "historicalCount": 7, "appendedSheets": SHEETS,
            "workbookPath": str(ARTIFACT.relative_to(ROOT)),
            "inputs": [fingerprint(path) for path in inputs],
            "sheets": [{"name": spec["name"], "rows": len(spec["rows"]),
                        "columns": len(spec["columns"]),
                        "sha256": digest(json.dumps(spec, ensure_ascii=False, sort_keys=True,
                                                     separators=(",", ":")).encode())}
                       for spec in data["sheets"]]}


def verify(data):
    appender = helper()
    structural = appender.verify_workbook(data)
    compared = 0
    with ZipFile(ARTIFACT) as archive:
        for index, spec in enumerate(data["sheets"], 8):
            tree = ET.fromstring(archive.read(f"xl/worksheets/{RELEASE.lower()}-sheet-{index}.xml"))
            values = {}
            for cell in tree.iter(f"{{{NS}}}c"):
                if cell.get("t") == "e":
                    raise ValueError("Excel error cell")
                values[cell.get("r")] = "".join(cell.find(f"{{{NS}}}is").itertext()) if cell.get("t") == "inlineStr" else cell.findtext(f"{{{NS}}}v")
            for row_index, row in enumerate(spec["rows"], 5):
                for col_index, col in enumerate(spec["columns"], 1):
                    address = appender.layout.column_name(col_index) + str(row_index)
                    expected = row.get(col["key"], "")
                    if isinstance(expected, dict):
                        formula = tree.find(f"{{{NS}}}sheetData/{{{NS}}}row[@r='{row_index}']/{{{NS}}}c[@r='{address}']/{{{NS}}}f")
                        if formula is None or formula.text != expected["formula"]:
                            raise ValueError("Trusted summary formula differs")
                        expected = expected["cached"]
                    if values.get(address) != str(expected):
                        raise ValueError("Cell differs from qualified source: " + spec["name"] + "!" + address)
                    compared += 1
    if ARTIFACT.read_bytes() != appender.build_workbook(data):
        raise ValueError("Workbook is not byte-reproducible")
    return {"passed": True, "artifact": fingerprint(str(ARTIFACT.relative_to(ROOT))), "cellsCompared": compared,
            "sourceWorkbooksUnchanged": 112, "structure": structural, "appendDependenciesUnchanged": DEPENDENCIES,
            "scope": "Source cells, immutable baseline ZIP parts, XML, cached formula and deterministic reconstruction. No native Excel, gameplay, hardware or human art review executed by this verifier."}
