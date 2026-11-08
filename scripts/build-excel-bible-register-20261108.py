#!/usr/bin/env python3
"""Build a traceable work register from workbook and campaign declarations.

No source spreadsheet is modified. Source claims remain separate from current
implementation evidence. This is a data builder, not a spreadsheet author.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "production/excel-bible-20261108/suivi"
BASE = "254b4b972af3c32cb078da3744241b2c0ea2f46c"
BIBLE_PATH = "docs/suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx"
CAMPAIGN_PATH = "docs/campagne/BIBLE_DE_CAMPAGNE.md"


def normal(value):
    return " ".join(unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower().replace("_", " ").split())


def compact(values):
    return " ; ".join(dict.fromkeys(str(v).strip() for v in values if str(v).strip()))


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def domain(path, sheet="", text=""):
    p, s, t = normal(path), normal(sheet), normal(text)
    if "phg" in p or "gauntlet" in p:
        return "Personnalisation et arsenal"
    if "suivi variantes" in p or "/v615/" in p:
        return "Variantes des personnages"
    if "clan-war" in p or "clanwar" in p or "guerre" in s or "korthas" in s or "militaire" in s or "rts" in s:
        return "Guerre des clans"
    if "mecaniques chasse" in p:
        return "Mécaniques de chasse"
    if "ship-interior" in p or "vaisseau personnel" in s:
        return "Vaisseau personnel"
    if "wolf-castle" in p:
        return "Château et cinématiques"
    if "clan-ship" in p or "navire" in s or "equipage" in s:
        return "Clan Ship"
    if "homeworld" in p or any(k in s for k in ("cite", "maison", "residence", "metiers", "culture", "communaute", "amenagement")):
        return "Homeworld et habitats"
    if "compagnon" in p:
        return "Compagnons"
    if "warp" in p or "warp" in s or "chroniques cinema" in s:
        return "Warp Universe"
    if "xeno-prime" in p or "xeno prime" in s:
        return "Berceau enfoui"
    if "mobilite" in p or "monture" in s or "vehicule" in s:
        return "Mobilité"
    if "planetes-tribus" in p or any(k in s for k in ("mondes", "biomes", "faune", "clans", "bases spatiales")):
        return "Mondes et tribus"
    if "trophee" in s or "atelier" in s or "objets" in s or "exposition" in s:
        return "Trophées et atelier"
    if "pit" in p or "pit" in s or "feral" in t or "scar" in t:
        return "The Pit"
    if "preserve" in s or "reserve" in s or "combattants humains" in s:
        return "Game Preserve"
    if "musical" in s or "audio" in s or "voix" in s:
        return "Audio"
    return "Campagne et systèmes communs"


def extract_markdown_criteria():
    configs = [
        ("docs/campagne/COMPAGNONS_ET_ALLIES_PREMIUM.md", r"(?:QA-C\d+|ALL-\d+)", "Compagnons"),
        ("docs/campagne/WARP_UNIVERSE_REPRISE.md", r"(?:WU-QA-\d+|WU-PROD-\d+)", "Warp Universe"),
        ("docs/campagne/xeno-prime/INTEGRATION_ET_QA.md", r"XBE-Q\d+", "Berceau enfoui"),
        ("docs/campagne/mobilite/README.md", r"MOB-QA-\d+", "Mobilité"),
    ]
    result = []
    for path, pattern, group in configs:
        for line_number, line in enumerate((ROOT / path).read_text().splitlines(), 1):
            if not line.startswith("|"):
                continue
            fields = [f.strip() for f in line.strip("|").split("|")]
            match = re.match(pattern, fields[0])
            if not match:
                continue
            ident = match.group(0)
            # Two-column annexes have no separate scenario title. Supply a
            # readable navigation label; the complete text remains criterion.
            title = fields[1] if len(fields) > 1 else ident
            if len(fields) == 2 and len(title) > 130:
                title = title[:130].rsplit(" ", 1)[0] + "…"
            result.append({"id": ident, "domain": group,
                           "kind": "Recette" if "Q" in ident else "Règle" if ident.startswith("ALL") else "Production",
                           "title": title,
                           "criterion": compact(fields[1:]), "source": path, "sourceLine": line_number,
                           "sourceDeclaration": "Critère documentaire ; qualification actuelle à consigner séparément.",
                           "currentStatus": "À rapprocher", "evidence": []})
    return result


def columns_matching(headers, expression):
    return [c for c, v in headers.items() if re.search(expression, normal(v))]


def choose_value(cells, columns, fallback=""):
    return next((str(cells[c]) for c in columns if c in cells and cells[c] != ""), fallback)


def extract_active_observations(sheets):
    observed = []
    for sheet in sheets:
        source = sheet["primarySource"]
        if source["scope"] not in {"SUIVI_ACTIF", "SOURCE_SPECIALISEE", "SUIVI_CUMULATIF"}:
            continue
        name, path = sheet["name"], source["path"]
        # Cumulative workbooks intentionally contain many old snapshots.
        if source["scope"] == "SUIVI_CUMULATIF" and name not in {"OuvertsSourceV113", "ArtCatalogueV113", "LotsProductionV113", "CandidatsHWV114", "VictimesPitV114"}:
            continue
        if re.search(r"(^sources?$|journal|synthese|synthèse|resume|résumé|guide|bilan|provenance|prs github|preuves$|pilotage|legende|glossaire|dictionnaire)", normal(name)):
            continue
        headers = sheet["headers"]
        title_cols = columns_matching(headers, r"^(titre|nom|fonction|element|cible|sujet|besoin|scenario|controle|modele|description|parcours)$|nom de la variante|action detaillee|ce qui manque|objet|^element ")
        need_cols = columns_matching(headers, r"critere|attendu|acceptation|definition.*done|action detaillee|regle|exigence|besoin source|correction attendue|manquant|livrable necessaire")
        next_cols = columns_matching(headers, r"reste|limite|prochaine|suivante|etape.*fermeture|travail ouvert|action$|action a realiser")
        priority_cols = columns_matching(headers, r"^priorite$")
        for row in sheet["candidateRows"]:
            if row["classification"] != "OUVERT_DECLARE":
                continue
            cells = row["cells"]
            if len(cells) < 2 or row["row"] <= sheet["headerRow"]:
                continue
            source_id = row["sourceId"]
            if not source_id:
                source_id = next((str(v) for c,v in cells.items() if c in {"A", "B", "C"}
                                  and re.match(r"[A-Za-z][A-Za-z0-9_.]*[-_][A-Za-z0-9_.:-]*\d[A-Za-z0-9_.:-]*$", str(v))), "")
            title = choose_value(cells, title_cols, choose_value(cells, ["B", "C", "A"]))
            if not title or re.fullmatch(r"[\d .,%/]+", title):
                continue
            need = compact(cells[c] for c in need_cols if c in cells)
            remaining = compact(cells[c] for c in next_cols if c in cells)
            if not need:
                need = title
            namespace = domain(path, name, need)
            if path == "production/YAUTJA_V114_SUIVI.xlsx" and "SourceV113" in name:
                namespace = domain(path, choose_value(cells, ["B"]), need)
                if "guerre" in normal(cells.get("B", "")): namespace = "Guerre des clans"
                if "preserve" in normal(cells.get("B", "")): namespace = "Game Preserve"
            if "ArtCatalogueV113" in name or re.match(r"target-v\d+", source_id):
                namespace = "Homeworld et habitats"
            status = compact(row["declaredStatuses"].values())
            if not source_id or len(source_id) > 110:
                source_id = "CELL-" + hashlib.sha256(f"{path}:{name}:{row['row']}".encode()).hexdigest()[:12]
            full_ref = {"path": path, "sheet": name, "row": row["row"], "rowSha256": row["rowSha256"],
                        "status": row["declaredStatuses"],
                        "scope": source["scope"]}
            observed.append({"id": source_id, "domain": namespace, "sheet": name, "title": title,
                             "criterion": need, "remaining": remaining, "priority": choose_value(cells, priority_cols, "À trier"),
                             "sourceStatus": status, "source": full_ref,
                             "kind": "Recette" if re.search(r"qa|test|controle|recette|validation", normal(name)) else "Production"})
    return observed


def consolidate_observations(observations):
    groups = defaultdict(list)
    for item in observations:
        # Identical IDs across overlapping source matrices are one subject; all
        # distinct criteria remain in observations. A QA case ID stays separate.
        groups[(item["domain"], item["id"])].append(item)
    result = []
    for (group, ident), items in groups.items():
        items.sort(key=lambda r: (0 if r["source"]["scope"] == "SUIVI_ACTIF" else 1,
                                  -max([int(v) for v in re.findall(r"[Vv](\d+)", r["source"]["path"])] or [0]),
                                  r["source"]["path"], r["source"]["row"]))
        first = items[0]
        result.append({"key": group + ":" + ident, "id": ident, "domain": group, "kind": first["kind"],
                       "scope": "Déclaration d’avenant historique" if first["source"]["scope"] == "SOURCE_SPECIALISEE" else "Déclaration d’un suivi de famille courant",
                       "title": first["title"], "criterion": compact(i["criterion"] for i in items),
                       "remaining": compact(i["remaining"] for i in items), "priority": first["priority"],
                       "sourceStatus": compact(i["sourceStatus"] for i in items),
                       "reconciliation": "Déclaration source à rapprocher du runtime courant",
                       "generated": "À rapprocher", "integrated": "À rapprocher", "tested": "À rapprocher",
                       "humanArtReview": "Non attestée" if re.search(r"art|personnalisation|variantes|habitats", normal(group)) else "Selon critère",
                       "currentEvidence": [], "sources": [i["source"] for i in items]})
    return sorted(result, key=lambda r: (r["domain"], r["id"]))


def extract_bible(sheets):
    skip = re.compile(r"^lire |^simuler |^index |^mode d|^donnees >>|^vue d|^couverture|^sources et provenance|^references|^reglages|^manifeste du navire|^campagne 12|^carte de korthas|^donnees campagne 12|^v5 simulations chiffrees")
    content_names = {"Répliques V6", "Choix et actions V6", "Réactions et gestes V6", "Variantes V6", "Voix V6"}
    result, contents = [], []
    for sheet in sheets:
        if not any(s["path"] == BIBLE_PATH for s in sheet["copies"]):
            continue
        name = sheet["name"]
        if skip.search(normal(name)):
            continue
        rows = [r for r in sheet["rows"] if r["row"] > sheet["headerRow"] and isinstance(r["cells"].get("A"), str)
                and re.match(r"[A-Z][A-Z0-9_-]*\d[A-Za-z0-9_.:-]*$", r["cells"]["A"])]
        if name in content_names:
            contents.append({"sheet": name, "rows": len(rows), "source": BIBLE_PATH,
                             "meaning": "Contenu de conception ; un import dans le lecteur ne constitue pas une scène jouable."})
            continue
        for row in rows:
            cells = row["cells"]
            header = sheet["headers"]
            result.append({"id": cells["A"], "domain": domain(BIBLE_PATH, name), "title": str(cells.get("B", cells["A"])),
                           "source": {"path": BIBLE_PATH, "sheet": name, "row": row["row"],
                                      "range": f"A{row['row']}:{list(cells)[-1]}{row['row']}"},
                           "criterion": compact(f"{header.get(c,c)} : {v}" for c,v in cells.items() if c not in {"A","B"} and normal(header.get(c,"")) != "provenance"),
                           "currentStatus": "Conception source à rapprocher", "runtimeCodeReferences": [], "runtimeDataReferences": []})
    return result, contents


def trace_ids(records):
    ids = {r["id"] for r in records}
    code, data = defaultdict(set), defaultdict(set)
    # Include this pass's new runtime files before the parent commits them.
    # Ignored build output remains excluded; occurrences still do not prove playability.
    files = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "app/game", "public/game/dialogues"], cwd=ROOT, text=True).splitlines()
    for path in files:
        if Path(path).suffix not in {".ts", ".tsx", ".json"}:
            continue
        file = ROOT / path
        if not file.exists():
            continue
        text = file.read_text(errors="replace")
        target = data if path.endswith(".json") else code
        for token in set(re.findall(r"[A-Za-z0-9][A-Za-z0-9_.:-]*", text)) & ids:
            target[token].add(path)
    for r in records:
        r["runtimeCodeReferences"] = sorted(code[r["id"]])
        r["runtimeDataReferences"] = sorted(data[r["id"]])
        if code[r["id"]]:
            r["currentStatus"] = "Référence de code repérée ; comportement à qualifier"
        elif data[r["id"]]:
            r["currentStatus"] = "Données importées ; comportement à qualifier"


def extract_campaign_document(bible, path=CAMPAIGN_PATH):
    """Keep the complete current campaign document as traceable source blocks.

    This includes the L-rules, R2 cards, transverse requests, equipment tables
    and music brief. Blocks are navigation units, never a missing-feature count.
    """
    source = ROOT / path
    lines = source.read_text().splitlines()
    headings, blocks, pending = {}, [], []
    bible_by_id = {item["id"]: item for item in bible}
    table_headers = []
    document_key = hashlib.sha256(path.encode()).hexdigest()[:6]
    identifier = r"(R2-M\d+(?:\.\d+)?|L-\d+|ORG-\d+|P-\d+|REF-\d+|ALL-\d+|QA-C\d+|WU-(?:QA|PROD)-\d+|XBE-Q\d+|MOB-(?:QA-)?\d+)\b"
    historical = re.search(r"VERIFICATION|LIVRAISON|PRODUCTION_\d|IMPORT_|DEPOT_|INDIVIDUELS_", source.name)
    document_scope = "Rapport ou lot daté" if historical else "Conception et critères de campagne"

    def add(parts, kind="Paragraphe", headers=None):
        if not parts:
            return
        section = " / ".join(headings[level] for level in sorted(headings) if level > 1)
        heading = headings[max(headings)] if headings else "Préambule"
        native = re.match(identifier, heading.strip("*` "))
        native_id = native.group(1) if native else ""
        body = "\n".join(text for _, text in parts)
        if headers:
            values = [value.strip() for value in parts[0][1].strip("|").split("|")]
            body = compact(f"{headers[i] if i < len(headers) else 'Colonne ' + str(i + 1)} : {v}" for i, v in enumerate(values))
            # The campaign summary starts with an ordinal, then its R2 ID.
            # Preserve that native identity so current evidence also reconciles
            # the dated summary row, not only the later detailed mission card.
            identity_cells = values[:2] if values and re.fullmatch(r"\d+", values[0]) else values[:1]
            table_ident = next((match for value in identity_cells
                                if (match := re.match(identifier, value.strip("*` ")))), None)
            if table_ident:
                native_id = table_ident.group(1)
        code = bible_by_id.get(native_id, {})
        normalized = normal(heading)
        group = domain(path, heading)
        if native_id.startswith("R2-M024"):
            group = "Mécaniques de chasse"
        elif native_id in {"R2-M025", "R2-M026", "R2-M027", "L-07"}:
            group = "Berceau enfoui"
        elif native_id in {f"R2-M{i:03}" for i in range(28, 35)} or native_id == "L-10":
            group = "Warp Universe"
        elif any(word in normalized for word in ("musical", "musique", "pistes", "themes", "ambiances sonores")):
            group = "Audio"
        elif any(word in normal(section) for word in ("variantes d'equipement", "personnalisation", "masques phg", "armures phg", "dreadlocks", "biomasques")):
            group = "Personnalisation et arsenal"
        open_words = re.search(r"manquant|a produire|a developper|texte seul|propos[eé]|non (?:implemente|simule)", normal(body))
        blocks.append({"id": f"DOC-{document_key}-L{parts[0][0]:04}", "nativeId": native_id,
            "domain": group, "section": section or "Préambule", "title": heading, "kind": kind,
            "content": body, "documentScope": document_scope,
            "sourceDeclaration": document_scope + " — " + ("mention de production / écart à rapprocher" if open_words else "constat ou contenu de la source"),
            "source": path, "sourceLine": parts[0][0], "sourceEndLine": parts[-1][0],
            "currentStatus": "Déclaration source datée à rapprocher du comportement attesté",
            "runtimeCodeReferences": code.get("runtimeCodeReferences", []),
            "runtimeDataReferences": code.get("runtimeDataReferences", [])})

    def flush():
        nonlocal pending
        if pending:
            # Bound the physical row height without dropping any source words.
            chunk = []
            for line in pending:
                if chunk and (sum(len(x[1]) + 1 for x in chunk) + len(line[1]) > 2200 or len(chunk) >= 20):
                    add(chunk)
                    chunk = []
                chunk.append(line)
            add(chunk)
            pending = []

    for line_number, line in enumerate(lines, 1):
        heading = re.match(r"^(#{1,6})\s+(.+)", line)
        if heading:
            flush()
            level = len(heading.group(1))
            headings = {key: value for key, value in headings.items() if key < level}
            headings[level] = heading.group(2)
            table_headers = []
            continue
        if not line.strip():
            flush()
            table_headers = []
            continue
        if line.startswith("|"):
            flush()
            fields = [cell.strip() for cell in line.strip("|").split("|")]
            if fields and all(re.fullmatch(r":?-+:?", cell) for cell in fields):
                continue
            if not table_headers:
                table_headers = fields
                add([(line_number, line)], "En-tête de tableau")
            else:
                add([(line_number, line)], "Entrée de tableau", table_headers)
        elif re.match(r"^[-*] ", line):
            flush()
            add([(line_number, line)], "Point de conception")
        else:
            pending.append((line_number, line))
    flush()
    source_lines = {line for block in blocks for line in range(block["sourceLine"], block["sourceEndLine"] + 1)}
    omitted = [index for index, line in enumerate(lines, 1) if line.strip() and not line.startswith("#") and
               not (line.startswith("|") and all(re.fullmatch(r":?-+:?", field.strip()) for field in line.strip("|").split("|"))) and index not in source_lines]
    if omitted:
        raise AssertionError(f"Campaign source lines omitted: {omitted}")
    return {"asOfDate": "2026-11-08", "source": path,
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "scope": "Complete current Markdown campaign source, preserved as paragraphs, bullets and table entries. L-01..10 overrides old rank order. These blocks overlap V6 cards and annexes and are not distinct missing features.",
        "sourceLines": len(lines), "retainedContentLines": len(source_lines), "blocks": len(blocks),
        "nativeIds": sorted({block["nativeId"] for block in blocks if block["nativeId"]}), "items": blocks}


def extract_revised_campaign(bible):
    paths = [file.relative_to(ROOT).as_posix() for file in (ROOT / "docs/campagne").rglob("*.md")
             if file.name != "AVENANT_EXCEL_BIBLE_20261108.md"]
    paths.sort(key=lambda path: (path != CAMPAIGN_PATH, path))
    documents = [extract_campaign_document(bible, path) for path in paths]
    blocks = [block for doc in documents for block in doc["items"]]
    inventory = []
    for file in sorted((ROOT / "docs/campagne").rglob("*")):
        if file.suffix not in {".md", ".json"} or file.name == "AVENANT_EXCEL_BIBLE_20261108.md":
            continue
        value = json.loads(file.read_text()) if file.suffix == ".json" else None
        inventory.append({"path": file.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            "bytes": file.stat().st_size, "format": file.suffix[1:],
            "topLevelKeys": list(value) if isinstance(value, dict) else [],
            "topLevelArrayEntries": len(value) if isinstance(value, list) else None,
            "scope": "Source documentaire / manifeste daté, jamais preuve automatique du runtime"})
    main = documents[0]
    write("bible-campagne-revisee.json", {"asOfDate": "2026-11-08", "source": CAMPAIGN_PATH,
        "sourceSha256": main["sourceSha256"], "scope": "Complete campaign Markdown documents and dated annexes, with JSON/manifests inventoried by hash. Blocks overlap V6 cards and QA criteria, not distinct unfinished features.",
        "mainSourceBlocks": main["blocks"], "mainSourceLines": main["sourceLines"],
        "markdownDocuments": len(documents), "documentsAndManifests": len(inventory), "blocks": len(blocks),
        "documents": [{key: value for key, value in document.items() if key != "items"} for document in documents],
        "inventory": inventory, "items": blocks})
    return blocks


def priority_packet(criteria, sheets):
    picks = []
    for s in sheets:
        if s["name"] == "Opérations" and "clan-ship-operations" in s["primarySource"]["path"]:
            for row in s["rows"]:
                c = row["cells"]
                if str(c.get("A", "")).startswith("OPS-B"):
                    picks.append({"id": c["A"], "domain": "Clan Ship", "title": c.get("C"), "criterion": c.get("D"),
                                  "source": s["primarySource"]["path"], "sheet": s["name"], "row": row["row"],
                                  "currentStatus": "Développement déclaré ouvert", "sourceCode": c.get("K"), "qa": c.get("L")})
    old = json.loads((ROOT / "docs/v112-open-workstreams-audit.json").read_text())
    for r in old["sourceItems"]:
        picks.append({"id": r["id"], "domain": r["domain"], "title": r["family"], "criterion": r["acceptance"],
                      "source": "docs/v112-open-workstreams-audit.json", "sourceCell": r["source"],
                      "originalNeed": r["originalNeed"], "currentStatus": "Exigence historique à rapprocher, jamais clôturée par cet inventaire"})
    write("actions-prioritaires.json", {"asOfDate": "2026-11-08", "baseCommit": BASE,
                                      "note": "Critères exacts pour réalisation et validation. Les anciennes observations ne sont pas des preuves du runtime actuel.",
                                      "criteria": criteria, "workstreams": picks})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cache = Path("/tmp/yautja-excel-20261108-unique-sheets.json")
    if not cache.exists():
        raise SystemExit("Run scripts/audit-excel-bible-20261108.py first.")
    sheets = json.loads(cache.read_text())
    inventory = json.loads((OUT / "excel-inventory.json").read_text())
    for source in inventory["inventory"]:
        if hashlib.sha256((ROOT / source["path"]).read_bytes()).hexdigest() != source["sha256"]:
            raise SystemExit("Source changed; rerun audit before using cache: " + source["path"])
    criteria = extract_markdown_criteria()
    priority_packet(criteria, sheets)
    observations = extract_active_observations(sheets)
    registry = consolidate_observations(observations)
    bible, content = extract_bible(sheets)
    trace_ids(bible)
    revised = extract_revised_campaign(bible)
    write("excel-open-register.json", {"asOfDate": "2026-11-08", "baseCommit": BASE,
           "scope": "Explicit open source declarations in current-family workbooks and specialized appendices. Historical sheets remain in the source inventory. Same subject IDs are grouped but original criteria and cells are all retained. No automatic implementation closure.",
           "observations": len(observations), "subjects": len(registry), "items": registry})
    write("bible-requirements.json", {"asOfDate": "2026-11-08", "source": BIBLE_PATH,
           "sourceSha256": next(s["sha256"] for s in inventory["inventory"] if s["path"] == BIBLE_PATH),
           "scope": "Unique design cards and dialogue scenes, excluding index/readers/calculated examples and dialogue-line duplication. Code/data text matches are navigation aids only; they do not prove behavior or art.",
           "items": bible, "dialogueContent": content, "annexCriteria": criteria})
    summary = {"workbooksRead": inventory["workbooks"], "sheetsReadIncludingCopies": inventory["sheetsIncludingCopies"],
               "uniqueSheetContents": inventory["uniqueSheetContents"], "sourceObservationRows": len(observations),
               "groupedSourceSubjects": len(registry), "sourceSubjectsByDomain": dict(Counter(r["domain"] for r in registry)),
               "sourceSubjectsByScope": dict(Counter(r["scope"] for r in registry)),
               "bibleDesignCards": len(bible), "bibleAnnexCriteria": len(criteria),
               "currentCampaignSourceBlocks": len(revised),
               "bibleCardsWithCodeReference": sum(bool(r["runtimeCodeReferences"]) for r in bible),
               "bibleCardsWithDataOnly": sum(not r["runtimeCodeReferences"] and bool(r["runtimeDataReferences"]) for r in bible),
               "clarification": "These are reconciled source subjects, design cards and QA cases, not additive totals of finished or missing gameplay features."}
    write("register-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
