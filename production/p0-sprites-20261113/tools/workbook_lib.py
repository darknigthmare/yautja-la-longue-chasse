"""Standalone, deterministic XLSX follow-up for the dated P0 sprite candidates.

Standard library only. This reader never rewrites source workbooks, images,
the pack manifest or older qualifications. Image generation, atlas frames,
technical checks and human art/canon approval remain separate facts.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
import hashlib
from io import BytesIO
import json
import math
from pathlib import Path
import re
import struct
import sys
from urllib.parse import quote, urlsplit
from xml.etree import ElementTree as ET
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/p0-sprites-20261113"
FOLLOW = LOT / "suivi"
MANIFEST = ROOT / "public/game/p0-sprites-20261113/manifest.json"
BASE_COMMIT = "6103b19ecbc47de30a554ba65bda66fe6b515425"
REGISTER = ROOT / "production/clan-war-command-20261109/suivi/registre-priorites.json"
OLD_INVENTORY = ROOT / "production/clan-war-command-20261109/suivi/source-inventory.json"
OLD_WORKBOOK = ROOT / "production/clan-war-command-20261109/suivi/Yautja_Commandement_P0_P1_20261109.xlsx"
OLD_WORKBOOK_SHA = "28bf2f777ae5723f50db1efe0d86100c3d4f192360bc9cdc5227ece003737066"
PROTECTION = FOLLOW / "source-protection.json"
ARTIFACT = FOLLOW / "Yautja_Sprites_P0_20261113.xlsx"
REQUEST = FOLLOW / "build-request.json"
COVERAGE = FOLLOW / "coverage.json"
RECEIPT = FOLLOW / "verification.json"
README = FOLLOW / "README.md"
INPUTS = LOT / "pack-inputs"
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
ET.register_namespace("", NS)
ET.register_namespace("r", REL)
SHEET_NAMES = ["Synthèse", "Assets", "Couverture P0", "Références",
               "Blocages fidélité", "Sources protégées", "Déjà existants"]


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def json_bytes(data) -> bytes:
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()


def canonical(data) -> bytes:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def safe_path(value: str) -> Path:
    if not isinstance(value, str) or not value or "\x00" in value:
        raise ValueError("Missing or unsafe repository path")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("Only repository-relative input paths are allowed: " + value)
    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        raise ValueError("Missing regular repository input: " + value)
    return target


def image_path(value: str) -> Path:
    if value.startswith("/game/"):
        value = "public" + value
    if not value.startswith("public/game/p0-sprites-20261113/"):
        raise ValueError("Candidate image outside the new dated pack: " + value)
    return safe_path(value)


def fingerprint(path: Path) -> dict:
    raw = path.read_bytes()
    return {"path": relative(path), "bytes": len(raw), "sha256": digest(raw)}


def assert_pin(pin: dict) -> None:
    actual = fingerprint(safe_path(pin["path"]))
    if any(actual[key] != pin[key] for key in ("bytes", "sha256")):
        raise ValueError("Protected input changed: " + pin["path"])


def freeze_sources() -> dict:
    """Pin the 119 prior source XLSX plus Markdown and prior follow-up separately."""
    original = read(OLD_INVENTORY)
    rows = []
    for source in original["sources"]:
        pin = {key: source[key] for key in ("path", "bytes", "sha256")}
        assert_pin(pin)
        pin.update({"kind": source.get("sourceKind", "DOCUMENT_MARKDOWN" if source["path"].endswith(".md") else "SOURCE_DOCUMENTAIRE"),
                    "scope": "Source immuable de l’inventaire précédent",
                    "historicalSource": source.get("historical", False)})
        rows.append(pin)
    if sum(row["path"].endswith(".xlsx") for row in rows) != 119:
        raise ValueError("The frozen source inventory must still contain 119 source workbooks")
    old = fingerprint(OLD_WORKBOOK)
    if old["sha256"] != OLD_WORKBOOK_SHA:
        raise ValueError("Prior published 19-sheet follow-up changed")
    old.update({"kind": "SUIVI_ANTERIEUR_19_FEUILLES",
                "scope": "Suivi publié précédemment, protégé en plus des 119 sources XLSX",
                "historicalSource": False})
    rows.append(old)
    if len({r["path"] for r in rows}) != len(rows):
        raise ValueError("Duplicate protected source")
    return {"schemaVersion": 1, "asOf": "2026-11-13", "baseCommit": BASE_COMMIT,
            "scope": "Protected bytes only; no source status or art approval changed.",
            "priorInventory": fingerprint(OLD_INVENTORY),
            "sourceWorkbooks": 119, "priorFollowupWorkbooks": 1,
            "totalProtectedWorkbooks": 120, "protectedInputs": len(rows),
            "sources": rows}


def check_protection() -> dict:
    data = read(PROTECTION)
    if data.get("schemaVersion") != 1 or data["sourceWorkbooks"] != 119:
        raise ValueError("Unknown source protection snapshot")
    assert_pin(data["priorInventory"])
    expected_paths = {source["path"] for source in read(OLD_INVENTORY)["sources"]} | {relative(OLD_WORKBOOK)}
    actual_paths = [source["path"] for source in data["sources"]]
    if data.get("protectedInputs") != 126 or len(actual_paths) != 126 or set(actual_paths) != expected_paths:
        raise ValueError("Protected inputs must retain all 125 original sources plus the prior follow-up")
    if data.get("priorFollowupWorkbooks") != 1 or data.get("totalProtectedWorkbooks") != 120:
        raise ValueError("The prior follow-up workbook must be protected separately")
    for row in data["sources"]:
        assert_pin(row)
    if sum(row["path"].endswith(".xlsx") for row in data["sources"]) != 120:
        raise ValueError("Source workbook protection count changed")
    return data


def png_header(path: Path) -> dict:
    with path.open("rb") as stream:
        raw = stream.read(33)
    if len(raw) != 33 or raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR":
        raise ValueError("Not a PNG image: " + relative(path))
    width, height, depth, colour, compression, filtering, interlace = struct.unpack(
        ">IIBBBBB", raw[16:29])
    if width <= 0 or height <= 0 or depth != 8 or colour not in (2, 6):
        raise ValueError("Unsupported PNG header: " + relative(path))
    return {"width": width, "height": height, "bitDepth": depth,
            "colourType": colour, "alphaChannel": colour == 6,
            "interlace": interlace, "compression": compression, "filtering": filtering}


def compact(value) -> str:
    if value is None:
        return "Non renseigné"
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value)


def source_text(sources) -> str:
    if isinstance(sources, dict):
        sources = [sources]
    output = []
    for item in sources or []:
        if isinstance(item, str):
            output.append(item)
            continue
        path = item.get("path", item.get("workbook", ""))
        where = item.get("cellRange", item.get("cell", ""))
        if item.get("row") is not None:
            where = where or "ligne " + str(item["row"])
        if item.get("line") is not None:
            where = "ligne " + str(item["line"])
        output.append(" / ".join(str(x) for x in [path, item.get("sheet"), where] if x))
    return "\n".join(output)


def urls(value) -> list[str]:
    found = []
    if isinstance(value, str):
        if value.startswith(("https://", "http://")):
            found.append(value)
    elif isinstance(value, list):
        for entry in value:
            found.extend(urls(entry))
    elif isinstance(value, dict):
        for entry in value.values():
            found.extend(urls(entry))
    return list(dict.fromkeys(found))


@dataclass(frozen=True)
class Formula:
    expression: str
    cached: int | float


@dataclass(frozen=True)
class Link:
    label: str
    target: str


def native_files_and_assets(manifest: dict):
    assets = manifest.get("assets")
    if not isinstance(assets, list) or not assets:
        raise ValueError("The final pack manifest must contain real generated candidates")
    native = {}
    ids = set()
    for asset in assets:
        if not isinstance(asset.get("id"), str) or asset["id"] in ids:
            raise ValueError("Missing or duplicate candidate id")
        ids.add(asset["id"])
        if asset.get("frames") != 1 or asset.get("animated") is not False:
            raise ValueError("This static generation lot must not claim animation clips")
        if asset.get("humanArtValidated") is not False or asset.get("canonCertified") is not False:
            raise ValueError("Generation cannot automatically qualify human art or canon")
        if asset.get("runtimeIntegrated") is not False:
            raise ValueError("This source-art lot must not silently claim runtime integration")
        file = image_path(asset["path"])
        path = relative(file)
        if path not in native:
            pin = fingerprint(file)
            header = png_header(file)
            native[path] = {**pin, **header}
        observed = native[path]
        for name in ("sha256", "bytes", "width", "height"):
            if asset.get(name) != observed[name]:
                raise ValueError("Candidate native file mismatch: " + asset["id"] + ":" + name)
        rect = asset.get("sourceRect")
        if not isinstance(rect, list) or len(rect) != 4 or any(
                not isinstance(n, int) or isinstance(n, bool) for n in rect):
            raise ValueError("Explicit integer source rectangle required")
        x, y, width, height = rect
        if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > observed["width"] or y + height > observed["height"]:
            raise ValueError("Candidate frame outside the actual PNG")
        if asset.get("frameWidth") != width or asset.get("frameHeight") != height:
            raise ValueError("Frame dimensions do not match source rectangle")
        pivot = asset.get("pivot")
        if not isinstance(pivot, list) or len(pivot) != 2 or any(
                not isinstance(n, (int, float)) or isinstance(n, bool) or not math.isfinite(n) for n in pivot):
            raise ValueError("Explicit finite local pivot required")
        if not isinstance(asset.get("alpha"), dict):
            raise ValueError("Pinned pack alpha measurements required")
        if not isinstance(asset.get("view"), dict):
            raise ValueError("An explicit static view is required")
        record = asset.get("generationRecord", {})
        if not isinstance(record, dict) or not record.get("path") or not record.get("sha256"):
            raise ValueError("A pinned generation record is required")
        if fingerprint(safe_path(record["path"]))["sha256"] != record["sha256"]:
            raise ValueError("Generation record changed: " + asset["id"])
        for reference in asset.get("references", []):
            if isinstance(reference, dict) and reference.get("path") and reference.get("sha256"):
                if fingerprint(safe_path(reference["path"]))["sha256"] != reference["sha256"]:
                    raise ValueError("Local visual reference changed: " + asset["id"])
    declared = manifest.get("nativeFiles")
    if not isinstance(declared, list) or len(declared) != len(native):
        raise ValueError("The native PNG denominator must be separate and exact")
    declared_paths = {relative(image_path(item["path"])) for item in declared}
    if declared_paths != set(native):
        raise ValueError("Declared native files do not match real candidate frames")
    return assets, list(native.values())


def load_reference_contracts():
    contracts = INPUTS / "reference-contracts.json"
    nine = INPUTS / "phg-nine-contracts.json"
    return read(contracts) if contracts.is_file() else {}, read(nine) if nine.is_file() else {}


def input_fallback_links(inventory: dict, briefs: dict) -> dict:
    mapping = {}
    for family in ("unitRoles", "structures", "maps"):
        for item in briefs.get(family, []):
            mapping[item["id"]] = item.get("priorityLinks", [])
    for item in inventory.get("fieldProps", []):
        mapping[item["id"]] = item.get("sourcePriorityLinks", [])
    for item in inventory.get("warp", []):
        mapping["WARP-" + str(item["id"])] = item.get("sourcePriorityLinks", [])
    return mapping


def payload():
    protection = check_protection()
    manifest = read(MANIFEST)
    if manifest.get("technical", {}).get("passed") is not True:
        raise ValueError("The separately verified pack must pass before workbook export")
    assets, native = native_files_and_assets(manifest)
    register = read(REGISTER)
    p0 = [item for item in register["rows"] if item["priority"] == "P0"]
    if len(p0) != 775 or len({r["key"] for r in p0}) != 775:
        raise ValueError("The subject denominator must remain the 775 source P0 records")
    inventory_path = INPUTS / "p0-sprite-inventory.json"
    briefs_path = INPUTS / "clan-war-generation-source-designs.json"
    arsenal_path = INPUTS / "arsenal.json"
    inventory, briefs, arsenal = read(inventory_path), read(briefs_path), read(arsenal_path)
    keys = {r["key"] for r in p0}
    if {r["key"] for r in inventory["subjects"]} != keys:
        raise ValueError("The source classification must cover exactly 775 P0 subjects")
    classification = {r["key"]: r for r in inventory["subjects"]}
    fallback = input_fallback_links(inventory, briefs)
    links = defaultdict(list)
    asset_links = {}
    for asset in assets:
        linked = asset.get("priorityLinks", [])
        if not linked:
            linked = fallback.get(asset.get("sourceId"), fallback.get(asset["id"], []))
        if not isinstance(linked, list) or any(k not in keys for k in linked):
            raise ValueError("Only exact existing P0 registry keys may be linked")
        linked = list(dict.fromkeys(linked))
        asset_links[asset["id"]] = linked
        for key in linked:
            links[key].append(asset["id"])
    contracts, nine = load_reference_contracts()
    source_statuses = dict(Counter(r["status"] for r in p0))
    design_key = lambda a: (a["category"], a.get("sourceDesignId", a.get("sourceId", a["id"])))
    design_identities = {design_key(a) for a in assets}
    unit_assets = [a for a in assets if re.fullmatch(r"W3-U\d{2}", str(design_key(a)[1]))]
    identities_by_category = {category: len({key for key in design_identities if key[0] == category})
                              for category in dict.fromkeys(a["category"] for a in assets)}
    counts = {"p0Subjects": 775, "sourceStatusesUnchanged": source_statuses,
              "generatedStaticViews": len(assets), "generatedSourceDesignIdentities": len(design_identities),
              "generatedSpriteFrames": sum(a.get("assetKind") != "background" for a in assets),
              "generatedOpaqueBackgrounds": sum(a.get("assetKind") == "background" for a in assets),
              "nativePngFiles": len(native),
              "nativePixels": sum(r["width"] * r["height"] for r in native),
              "nativeBytes": sum(r["bytes"] for r in native),
              "generatedAnimations": 0, "humanArtApprovals": 0, "canonicalOneToOneCertifications": 0,
              "totalRequiredImages": None, "totalRequiredAnimationFrames": None,
              "newlyClosedP0": 0, "subjectsWithCandidateArtLinks": len(links),
              "subjectsWithoutCandidateArtLinks": 775 - len(links),
              "candidateViewsWithoutExactP0Link": sum(not asset_links[a["id"]] for a in assets),
              "candidateSourceDesignsWithoutExactP0Link": len({design_key(a) for a in assets if not asset_links[a["id"]]}),
              "sourceWorkbooksProtected": 119, "priorFollowupWorkbooksProtected": 1,
              "allProtectedWorkbooks": 120,
              "staticViewsByCategory": dict(Counter(a["category"] for a in assets)),
              "sourceDesignIdentitiesByCategory": identities_by_category,
              "unitSourceDesignIdentities": len({design_key(a) for a in unit_assets}),
              "unitStaticViews": len(unit_assets),
              "sourceMapDesignIdentities": len(briefs.get("maps", [])),
              "sourceMapStaticViews": sum(bool(re.fullmatch(r"W3-MAP\d{2}", str(design_key(a)[1]))) for a in assets)}
    references = []
    for asset in assets:
        for index, ref in enumerate(asset.get("references", []), 1):
            item = ref if isinstance(ref, dict) else {"reference": ref}
            references.append([asset["id"], str(index), asset["classification"],
                               item.get("type", item.get("kind", item.get("classification", item.get("role", "Voir classe et contrat")))),
                               "\n".join(urls(item)) or compact(item.get("path", item.get("reference", "Référence locale"))),
                               item.get("sha256", "Sans empreinte déclarée"),
                               compact(item.get("sourceStatus", item.get("status", "Voir contrat de référence"))),
                               compact(item.get("note", item.get("description", item))), "Non"])
    for item in nine.get("rows", []):
        for url in item.get("documentaryReferenceUrls", []):
            source_type = ("Primaire documentaire (patch) — géométrie non établie"
                           if urlsplit(url).hostname == "forum.predator.illfonic.com"
                           else "Documentation secondaire — géométrie non établie")
            references.append([item["id"], "source P0", "documentary-reference",
                               source_type, url,
                               "Lien, pas une empreinte de vue", "Source visuelle exacte encore requise",
                               item.get("workbookGenericUrlWarning", ""), "Non"])
    blockers = []
    for item in nine.get("rows", []):
        generated = [a for a in assets if item.get("registryKey") in asset_links[a["id"]]]
        blockers.append([item["registryKey"], item["id"], "P0 fidélité / création P1 conservés",
                         ", ".join(a["id"] for a in generated) or "Aucune nouvelle vue liée",
                         "Une étude de face n’est ni trois angles, ni six morphologies, ni UV canonique",
                         "Référence primaire géométrique + face/profil/dos + revue humaine",
                         "\n".join(item.get("documentaryReferenceUrls", [])),
                         source_text([item.get("fidelityPriority", {})]), "Non", "Non"])
    for group in arsenal.get("groups", []):
        if group.get("category") == "missing-authentic-base-currently-proxy":
            blockers.append(["\n".join(group.get("sourceRowKeys", [])), group["id"],
                             "Base actuellement approchée par proxy", "Étude statique éventuelle, non admise",
                             "La correspondance Alpha/Samurai ne devient pas canonique par génération",
                             "Vues primaires et raccord six morphologies / 3 angles", "\n".join(urls(group)),
                             compact(group.get("sourceDefinition", "Voir arsenal.json")), "Non", "Non"])
    blockers.extend([
        ["Warp Universe:WARP-199", "Props Warp 001–005 archivés", "Dépendance source du P0 conservée",
         "Un fond vide candidat reste distinct du portail et de ses props",
         "Le catalogue dit ces PNG livrés dans le lot 01, mais leurs binaires ne sont pas présents dans ce checkout ; aucune perte définitive n’est déduite",
         "Récupérer l’archive originale file_00000000ad74820db135359b82290bd7 et son manifeste, vérifier chaque SHA puis réemployer les vrais props",
         "", "docs/campagne/WARP_UNIVERSE_ASSETS.md:11, 40, 54–58 ; module/01_portail_warp_actif.png, 02_portail_warp_inactif.png, 03_console_coordonnees.png, 04_coeur_warp.png, 05_balise_ancrage.png ; WARP_UNIVERSE_REPRISE.md:56",
         "Non", "Non"],
        ["Guerre des clans:CW130-RTS-003\nGuerre des clans:BACK145-002\nGuerre des clans:NEXT-INF-01",
         "12 cartes sources W3-MAP01…12", "P0 de décors conservés", "Voir le compteur de vues de carte, distinct du roster",
         "Les poses d’unités et structures ne produisent pas les tuiles régionales, couches ou scènes multi-niveaux",
         "Découpage par scène et par couche, dimensions de la Bible, connexions, alpha, pivots, collision et revue en jeu",
         "", "docs/suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx / Cartes des escarmouches / lignes 6–17 ; détails dans pack-inputs/clan-war-generation-source-designs.json",
         "Non", "Non"],
        ["Guerre des clans:BACK152-010\nGuerre des clans:CW130-SYS-007", "Terrain terrestre / extraterrestre exact",
         "P0 de terrain fidèle conservés", "Aucune exactitude GIS/film déduite d’une étude de décor",
         "Un contour Natural Earth 1:110m ou une géographie proposée ne prouve pas les rues, lieux, reliefs ou LOD exacts",
         "Source GIS/film, échelle et points terrain audités avant admission 1:1",
         "", "Registre source exact ; bible V6 et provenances terrain régionales", "Non", "Non"],
        ["Guerre des clans:CW144-ASS-009", "Animations de guerre", "P0 ouvert conservé",
         "30 archétypes éventuels ne sont pas 30 animations",
         "Poses, armes, costumes, transitions et deux sens natifs restent à produire/admettre",
         "Plan précis personnage/action/costume/arme/sens/frames", "",
         "Bible V6 / source animée film, jeu, comic identifiée", "Non", "Non"],
        ["Guerre des clans:CELL-ff393f979f27", "54 gauntlets existants", "P0 artistique conservé",
         "108 SVG antérieurs, pas nouveaux PNG de ce lot",
         "Les silhouettes dessinées ne sont pas 54 approbations source",
         "Au moins 162 vues primaires face/profil/dos puis revue des rigs", "",
         "app/game/data/clanWarGauntletCatalogV132.json", "Non", "Non"],
    ])
    if any(key not in keys for row in blockers for key in row[0].splitlines()):
        raise ValueError("Blocker sheet must cite exact existing P0 keys")
    existing = [
        ["NPC Homeworld", 640, "PNG statiques déjà présents", "32 rôles × 20 variantes",
         "0 dans les nouveaux designs", "Revue/animation distinctes", "app/game/systems/homeworldNpcVariantsV84.ts"],
        ["Feral/ScarV100", 52, "Études BODY déjà admises dans leur portée", "104 orientations natives",
         "0 dans les nouvelles animations", "Études BODY, mécaniques non déduites", "docs/pit-workbook-animations-v100.md"],
        ["Gauntlets", 54, "108 SVG base/couvercle déjà présents", "Rigs antérieurs, pas 54 manuels humains",
         "0 nouveaux gauntlets certifiés", "La fidélité source reste à revoir", "app/game/data/clanWarGauntletCatalogV132.json"],
        ["WarpP0", 5, "Images candidates déjà présentes", "États/animation non déduits de 1 image",
         "Ne pas ajouter 5 au lot généré", "Scène expérimentale, identité originale", "public/game/warp-universe/20261109/manifest.json"],
        ["Équipage Clan Ship", 6, "Six affectations dans la bibliothèque NPC existante", "Sous-ensemble des 640, pas 6 images nouvelles",
         "Ne pas compter deux fois", "Revue artistique attendue", "app/game/clanShipCrew.ts"],
        ["Field du 3 novembre", 12, "12 états, SVG/PNG/WebP existants", "36 fichiers physiques antérieurs",
         "Reprises candidates séparées", "Originaux non certifiés film", "public/game/assets/clan-field-20261103/manifest.json"],
        ["HomeworldV160/V161", 110, "Sources conservées, dont 11 archives opaques", "107 + 3, pas 110 sprites absents",
         "Reprises source par source", "Caméra/échelle/admission non déduites du PNG", "production/homeworld-v161/manifest.json"],
    ]
    asset_rows = []
    for asset in assets:
        alpha = asset["alpha"]
        source = asset.get("generationRecord", {})
        asset_rows.append([
            asset["id"], asset.get("sourceId", ""), str(design_key(asset)[1]), asset.get("label", asset["id"]),
            asset["category"], asset.get("assetKind", "sprite"), asset["classification"],
            Link(asset["path"], "../../../" + relative(image_path(asset["path"]))),
            asset["sha256"], asset["bytes"], f"{asset['width']}×{asset['height']}",
            compact(asset["sourceRect"]), f"{asset['frameWidth']}×{asset['frameHeight']}",
            compact(asset["pivot"]), compact(asset["view"]),
            alpha.get("transparentPixels", "Voir manifeste"),
            alpha.get("visiblePixels16", "Voir manifeste"),
            alpha.get("occupancy16", "Voir manifeste"), compact(alpha.get("bounds16")),
            compact({"candidate": asset.get("qualityCandidate"), "warnings": asset.get("warnings", []),
                     "limitations": asset.get("limitations", []), "humanReviewRequired": True}),
            1, "Non", "Non", "Non", "Non",
            source_text(asset.get("sourceRows", [])), "\n".join(asset_links[asset["id"]]),
            compact(source), compact(asset.get("references", [])),
        ])
    coverage_rows = []
    for row in p0:
        linked = links.get(row["key"], [])
        coverage_rows.append([
            row["key"], row["id"], "P0", row["domain"], row["title"], row["criterion"],
            row["status"], classification[row["key"]]["classification"],
            "Candidat généré lié" if linked else "Aucun nouveau candidat lié",
            "\n".join(linked), 0, "Non", "Non", "Non",
            source_text(row["sources"]), row.get("remaining", ""),
        ])
    source_rows = [[r["path"], r["kind"], r["bytes"], r["sha256"], r["scope"], "Oui"]
                   for r in protection["sources"]]
    summary_rows = [
        ["Indicateur", "Valeur", "Sens / limite"],
        ["Sujets P0 sources", Formula("COUNTA('Couverture P0'!A5:A779)", 775), "Des sujets documentaires, pas 775 images"],
        ["Identités source distinctes", len(design_identities), "Une unité vue des deux côtés reste une seule identité source"],
        ["Vues/cadres statiques candidats", Formula(f"COUNTA('Assets'!A5:A{len(assets)+4})", len(assets)), "Un cadre peut partager un PNG natif avec d’autres ; ce ne sont pas des animations"],
        ["Cadres de sprites transparents", counts["generatedSpriteFrames"], "Décompte distinct du fond opaque de baie Warp"],
        ["Fonds opaques", counts["generatedOpaqueBackgrounds"], "Fond WARP-199 intentionnellement opaque ; pas un sprite à détourer"],
        ["Types d’unités source", counts["unitSourceDesignIdentities"], "Deux directions natives ne créent pas deux types d’unité"],
        ["Vues statiques des unités", counts["unitStaticViews"], "Droite/gauche réellement dessinées et déclarées séparément"],
        ["PNG natifs uniques", len(native), "Pages physiques réellement générées et présentes"],
        ["Cartes sources W3 définies", counts["sourceMapDesignIdentities"], "Les tuiles et couches restent un chantier distinct des poses de roster"],
        ["Vues de cartes sources dans ce lot", counts["sourceMapStaticViews"], "Un fond aplati ne vaut pas une carte multi-niveaux jouable"],
        ["Animations produites", 0, "Une pose fixe ne devient pas un cycle de mouvement"],
        ["P0 fermés par génération", 0, "Aucun statut source modifié"],
        ["Approbations artistiques humaines", 0, "Aucune admission validated automatique"],
        ["Certifications canoniques 1:1", 0, "Référence locale ou communautaire ne vaut pas source primaire complète"],
        ["P0 avec candidat lié", Formula('COUNTIF(\'Couverture P0\'!I5:I779,"Candidat généré lié")', len(links)), "Lien de production, pas une clôture"],
        ["P0 sans nouveau candidat lié", 775-len(links), "Code, QA, références ou actifs déjà existants notamment"],
        ["Classeurs sources protégés", 119, "Inventaire source figé précédent"],
        ["Suivi antérieur protégé en plus", 1, "Classeur de 19 feuilles du 9 novembre"],
        ["Total XLSX antérieurs protégés", 120, "119 sources + 1 suivi, aucun réécrit"],
        ["Tests de gameplay nouveaux par ce suivi", 0, "Le vérificateur relit des fichiers et des cellules"],
        ["Source de départ", BASE_COMMIT, "main inspecté au début du lot"],
    ]
    sheets = [
        {"name": "Synthèse", "title": "Sprites P0 — candidats et références", "note": "13 novembre 2026 · aucune fermeture automatique · source originale et source de franchise distinctes", "rows": summary_rows, "widths": [39, 22, 98]},
        {"name": "Assets", "title": "Vues statiques réellement présentes", "note": "Un cadre/vue par ligne ; SourceID distingue l’identité des directions. PNG natifs et cadres restent identifiés. Alpha/pivots issus du packaging épinglé.", "rows": [["ID vue", "SourceID", "Identité design", "Nom", "Catégorie", "Type graphique", "Classe référence", "PNG natif", "SHA256", "Octets", "PagePx", "Rectangle source", "CadrePx", "Pivot local", "Vue", "Px transparents", "Px visiblesα16", "Occupationα16", "Boundsα16", "Qualité", "Poses", "Animation", "Humain validé", "Canon1:1", "Intégré runtime", "Cellules source", "Liens exacts P0", "Génération", "Références"]]+asset_rows, "widths": [30, 24, 30, 36, 26, 22, 38, 75, 68, 15, 19, 26, 19, 24, 55, 18, 19, 19, 25, 50, 12, 13, 17, 14, 20, 85, 75, 85, 95]},
        {"name": "Couverture P0", "title": "Les 775 sujets sources, sans changement de statut", "note": "Les liens d’art candidats n’établissent ni gameplay terminé ni revue humaine ; les critères et citations restent ceux du registre.", "rows": [["Clé source", "ID", "Priorité", "Domaine", "Titre", "Critère exact", "Statut source conservé", "Classe travail", "État candidat", "AssetIDs liés", "Fermé par ce lot", "Art humain", "Canon1:1", "Gameplay nouveau", "Sources exactes", "Reste source"]]+coverage_rows, "widths": [48, 26, 13, 30, 42, 105, 30, 60, 35, 65, 18, 16, 16, 22, 110, 110]},
        {"name": "Références", "title": "Provenance des images et des formes", "note": "Document primaire nominal, photographie communautaire et concept du projet ne prouvent pas la même chose. Les URLs sont les URLs réellement consignées.", "rows": [["Asset/source", "Rang", "Classe", "Type référence", "Chemin/URL", "Empreinte", "État source", "Limites", "Certifié canon"]]+references, "widths": [35, 18, 40, 46, 110, 68, 55, 115, 20]},
        {"name": "Blocages fidélité", "title": "Ce que ces PNG ne résolvent pas", "note": "Les P0 de fidélité restent P0, même si certaines lignes de création portent P1. Vue de face ≠ 3 angles × 6 morphologies.", "rows": [["Clé P0", "Identité", "Priorité/contrat", "Nouveau contenu lié", "Limite", "À obtenir", "URLs source", "Citation", "Humain validé", "Canon1:1"]]+blockers, "widths": [75, 40, 48, 75, 110, 110, 115, 110, 20, 18]},
        {"name": "Sources protégées", "title": "Octets des sources antérieures conservés", "note": "119 classeurs sources + 6 Markdown de l’inventaire précédent et 1 classeur de suivi de 19 feuilles supplémentaire ; vérification SHA à chaque commande.", "rows": [["Chemin", "Type", "Octets", "SHA256", "Portée", "Inchangé"]]+source_rows, "widths": [112, 38, 18, 68, 100, 18]},
        {"name": "Déjà existants", "title": "Actifs antérieurs exclus du compteur de génération", "note": "Ces familles se recouvrent ; ne pas additionner des modèles, fichiers, vues, frames et affectations de PNJ comme s’il s’agissait d’images nouvelles.", "rows": [["Famille", "Nombre source", "Objet compté", "Détail", "Compteur nouveau", "Reste", "Source"]]+existing, "widths": [35, 19, 70, 80, 65, 85, 110]},
    ]
    for sheet in sheets:
        sheet["headerRow"] = 4
    cells = sum(len(row) for sheet in sheets for row in sheet["rows"])
    if cells > 76000:
        raise ValueError("Follow-up exceeds the agreed 76000-cell bound")
    pins = [fingerprint(p) for p in [MANIFEST, PROTECTION, REGISTER, OLD_INVENTORY,
                                     inventory_path, briefs_path, arsenal_path,
                                     Path(__file__), LOT / "tools/build-workbook.py",
                                     LOT / "tools/verify-workbook.py"]]
    for path in (INPUTS/"reference-contracts.json", INPUTS/"phg-nine-contracts.json"):
        if path.is_file():
            pins.append(fingerprint(path))
    return {"schemaVersion": 1, "asOf": "2026-11-13", "baseCommit": BASE_COMMIT,
            "allP0Closed": False, "exhaustiveImageCoverageClaim": False, "counts": counts,
            "currentAuthoredBatchComplete": manifest.get("plannedBatch", {}).get("requestedBatchGenerated") is True,
            "scope": "Generated static candidates and source traceability only; no automatic canon, human art, runtime integration or gameplay qualification.",
            "inputPins": pins, "nativeImagePins": native,
            "sourceProtection": {key: protection[key] for key in ["sourceWorkbooks", "priorFollowupWorkbooks", "totalProtectedWorkbooks", "protectedInputs"]},
            "assets": [{"id": a["id"], "sourceId": a.get("sourceId"),
                        "sourceDesignId": design_key(a)[1], "category": a["category"],
                        "assetKind": a.get("assetKind", "sprite"),
                        "path": relative(image_path(a["path"])), "sha256": a["sha256"],
                        "sourceRect": a["sourceRect"], "frames": 1, "animated": False,
                        "priorityLinks": asset_links[a["id"]], "humanArtValidated": False,
                        "canonCertified": False, "runtimeIntegrated": False} for a in assets],
            "subjects": [{"key": r["key"], "sourceStatus": r["status"],
                          "classification": classification[r["key"]]["classification"],
                          "candidateAssetIds": links.get(r["key"], []),
                          "closedByGeneration": False, "sources": r["sources"]} for r in p0],
            "sheets": sheets, "cells": cells,
            "verificationScope": "SHA and PNG headers/rectangles plus deterministic OpenXML, cell/formula caches and source preservation. Alpha/pivot/quality values are the separately pinned pack measurements, not a new artistic or gameplay review."}


def serializable(value):
    if isinstance(value, Formula):
        return {"formula": value.expression, "cached": value.cached}
    if isinstance(value, Link):
        return {"label": value.label, "target": value.target}
    if isinstance(value, dict):
        return {k: serializable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serializable(v) for v in value]
    return value


def column(index: int) -> str:
    out = ""
    while index:
        index, digit = divmod(index-1, 26)
        out = chr(65+digit)+out
    return out


def xml(node: ET.Element) -> bytes:
    return ET.tostring(node, encoding="utf-8", xml_declaration=True)


def element(name: str, attrs=None, text=None):
    node = ET.Element("{"+NS+"}"+name, attrs or {})
    if text is not None:
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", str(text)):
            raise ValueError("Invalid XML control character in source text")
        node.text = str(text)
    return node


def write_cell(parent, address, value, style):
    node = ET.SubElement(parent, "{"+NS+"}c", {"r": address, "s": str(style)})
    if isinstance(value, Link):
        value = value.label
    if isinstance(value, Formula):
        if not math.isfinite(value.cached):
            raise ValueError("Nonfinite formula cache")
        ET.SubElement(node, "{"+NS+"}f").text = value.expression
        ET.SubElement(node, "{"+NS+"}v").text = str(value.cached)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(value):
            raise ValueError("Nonfinite cell")
        ET.SubElement(node, "{"+NS+"}v").text = str(value)
    else:
        node.set("t", "inlineStr")
        inline = ET.SubElement(node, "{"+NS+"}is")
        if len(compact(value)) > 32767:
            raise ValueError("Source text exceeds the Excel cell limit: " + address)
        text = element("t", {"{http://www.w3.org/XML/1998/namespace}space": "preserve"}, compact(value))
        inline.append(text)


def build_workbook(data) -> bytes:
    parts = {}
    types = ET.Element("Types", {"xmlns": "http://schemas.openxmlformats.org/package/2006/content-types"})
    for extension, mime in [("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml")]:
        ET.SubElement(types, "Default", {"Extension": extension, "ContentType": mime})
    for path, mime in [("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
                       ("/xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"),
                       ("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"),
                       ("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml")]:
        ET.SubElement(types, "Override", {"PartName": path, "ContentType": mime})
    rootrels = ET.Element("Relationships", {"xmlns": PKG_REL})
    for rid, typ, target in [("rId1", REL+"/officeDocument", "xl/workbook.xml"),
                             ("rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"),
                             ("rId3", REL+"/extended-properties", "docProps/app.xml")]:
        ET.SubElement(rootrels, "Relationship", {"Id": rid, "Type": typ, "Target": target})
    parts["_rels/.rels"] = xml(rootrels)
    wb = element("workbook")
    views = ET.SubElement(wb, "{"+NS+"}bookViews")
    ET.SubElement(views, "{"+NS+"}workbookView", {"activeTab": "0"})
    sheets_node = ET.SubElement(wb, "{"+NS+"}sheets")
    wb_rels = ET.Element("Relationships", {"xmlns": PKG_REL})
    for index, sheet in enumerate(data["sheets"], 1):
        ET.SubElement(sheets_node, "{"+NS+"}sheet", {"name": sheet["name"], "sheetId": str(index), "{"+REL+"}id": "rId"+str(index)})
        ET.SubElement(wb_rels, "Relationship", {"Id": "rId"+str(index), "Type": REL+"/worksheet", "Target": f"worksheets/sheet{index}.xml"})
        ET.SubElement(types, "Override", {"PartName": f"/xl/worksheets/sheet{index}.xml", "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        page = element("worksheet")
        ET.SubElement(page, "{"+NS+"}dimension", {"ref": f"A1:{column(max(map(len, sheet['rows'])))}{len(sheet['rows'])+3}"})
        sv = ET.SubElement(page, "{"+NS+"}sheetViews")
        view = ET.SubElement(sv, "{"+NS+"}sheetView", {"workbookViewId": "0", "showGridLines": "0"})
        ET.SubElement(view, "{"+NS+"}pane", {"ySplit": "4", "topLeftCell": "A5", "activePane": "bottomLeft", "state": "frozen"})
        ET.SubElement(page, "{"+NS+"}sheetFormatPr", {"defaultRowHeight": "17"})
        cols = ET.SubElement(page, "{"+NS+"}cols")
        for col, width in enumerate(sheet["widths"], 1):
            ET.SubElement(cols, "{"+NS+"}col", {"min": str(col), "max": str(col), "width": str(width), "customWidth": "1"})
        sd = ET.SubElement(page, "{"+NS+"}sheetData")
        title = ET.SubElement(sd, "{"+NS+"}row", {"r": "1", "ht": "34", "customHeight": "1"})
        write_cell(title, "A1", sheet["title"], 1)
        note = ET.SubElement(sd, "{"+NS+"}row", {"r": "2", "ht": "42", "customHeight": "1"})
        write_cell(note, "A2", sheet["note"], 2)
        hyperlinks, relationships = [], ET.Element("Relationships", {"xmlns": PKG_REL})
        for rownum, values in enumerate(sheet["rows"], 4):
            row = ET.SubElement(sd, "{"+NS+"}row", {"r": str(rownum), "ht": "29" if rownum == 4 else "72", "customHeight": "1"})
            for colnum, value in enumerate(values, 1):
                cell = column(colnum)+str(rownum)
                write_cell(row, cell, value, 3 if rownum == 4 else (5 if isinstance(value, Link) else 4))
                if isinstance(value, Link):
                    if not (value.target.startswith("../../../") or urlsplit(value.target).scheme in ("https", "http")):
                        raise ValueError("Unsafe external spreadsheet hyperlink")
                    rid = "rId"+str(len(hyperlinks)+1)
                    ET.SubElement(relationships, "Relationship", {"Id": rid, "Type": REL+"/hyperlink", "Target": quote(value.target, safe="/:#?=&%+@"), "TargetMode": "External"})
                    hyperlinks.append({"ref": cell, "{"+REL+"}id": rid})
        lastcol = column(max(map(len, sheet["rows"])))
        ET.SubElement(page, "{"+NS+"}autoFilter", {"ref": f"A4:{lastcol}{len(sheet['rows'])+3}"})
        merges = ET.SubElement(page, "{"+NS+"}mergeCells", {"count": "2"})
        for ref in (f"A1:{lastcol}1", f"A2:{lastcol}2"):
            ET.SubElement(merges, "{"+NS+"}mergeCell", {"ref": ref})
        if hyperlinks:
            hs = ET.SubElement(page, "{"+NS+"}hyperlinks")
            for attrs in hyperlinks:
                ET.SubElement(hs, "{"+NS+"}hyperlink", attrs)
            parts[f"xl/worksheets/_rels/sheet{index}.xml.rels"] = xml(relationships)
        ET.SubElement(page, "{"+NS+"}pageMargins", {"left": "0.25", "right": "0.25", "top": "0.5", "bottom": "0.5", "header": "0.2", "footer": "0.2"})
        parts[f"xl/worksheets/sheet{index}.xml"] = xml(page)
    ET.SubElement(wb_rels, "Relationship", {"Id": "rIdStyles", "Type": REL+"/styles", "Target": "styles.xml"})
    ET.SubElement(wb, "{"+NS+"}calcPr", {"calcId": "191029", "fullCalcOnLoad": "1"})
    parts["xl/workbook.xml"] = xml(wb)
    parts["xl/_rels/workbook.xml.rels"] = xml(wb_rels)
    parts["[Content_Types].xml"] = xml(types)
    parts["xl/styles.xml"] = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/><color rgb="FF1B3028"/></font><font><b/><sz val="19"/><name val="Calibri"/><color rgb="FFE4D6AA"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><sz val="11"/><name val="Calibri"/><u/><color rgb="FF185A86"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF18342A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF0EA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFCCD8CB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'''
    parts["docProps/core.xml"] = '''<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Yautja — sprites P0, 13 novembre 2026</dc:title><dc:creator>Yautja production follow-up</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-13T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-13T00:00:00Z</dcterms:modified></cp:coreProperties>'''.encode()
    parts["docProps/app.xml"] = b'''<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Deterministic standard-library OpenXML</Application></Properties>'''
    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(parts):
            info = ZipInfo(name, (2026, 11, 13, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, parts[name], compress_type=ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def verify(data):
    if read(REQUEST) != serializable(data):
        raise ValueError("Pack or source inputs changed after workbook export")
    expected_coverage = {key: value for key, value in data.items() if key != "sheets"}
    if read(COVERAGE) != serializable(expected_coverage):
        raise ValueError("Coverage JSON differs from the pinned workbook inputs")
    expected = build_workbook(data)
    actual = ARTIFACT.read_bytes()
    if actual != expected:
        raise ValueError("Workbook differs from deterministic reconstruction")
    formulas = []
    with ZipFile(BytesIO(actual)) as archive:
        if archive.testzip() is not None:
            raise ValueError("Corrupt workbook ZIP")
        for name in archive.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(name))
        wb = ET.fromstring(archive.read("xl/workbook.xml"))
        names = [x.attrib["name"] for x in wb.find("{"+NS+"}sheets")]
        if names != SHEET_NAMES:
            raise ValueError("Missing or reordered follow-up sheet")
        compared = 0
        for index, sheet in enumerate(data["sheets"], 1):
            root = ET.fromstring(archive.read(f"xl/worksheets/sheet{index}.xml"))
            cells = {c.attrib["r"]: c for c in root.findall("{"+NS+"}sheetData/{"+NS+"}row/{"+NS+"}c")}
            for rownum, values in enumerate(sheet["rows"], 4):
                for colnum, value in enumerate(values, 1):
                    address = column(colnum)+str(rownum)
                    c = cells[address]
                    if isinstance(value, Formula):
                        if c.findtext("{"+NS+"}f") != value.expression or float(c.findtext("{"+NS+"}v")) != value.cached:
                            raise ValueError("Invalid formula cache: " + address)
                        formulas.append({"sheet": sheet["name"], "cell": address,
                                         "formula": value.expression, "cached": value.cached})
                    elif isinstance(value, (int, float)) and not isinstance(value, bool):
                        if float(c.findtext("{"+NS+"}v")) != value:
                            raise ValueError("Numeric cell mismatch")
                    else:
                        target = value.label if isinstance(value, Link) else compact(value)
                        observed = "".join(t.text or "" for t in c.iter("{"+NS+"}t"))
                        if observed != target:
                            raise ValueError("Text cell mismatch: " + sheet["name"] + "!" + address)
                    compared += 1
    if compared != data["cells"] or compared > 76000:
        raise ValueError("Wrong verified cell count")
    return {"passed": True, "asOf": "2026-11-13", "artifact": fingerprint(ARTIFACT),
            "sheets": SHEET_NAMES, "cellsCompared": compared,
            "deterministicReconstructionIdentical": True, "formulaCaches": formulas,
            "counts": data["counts"], "allP0Closed": False,
            "sourceInputsProtected": data["sourceProtection"],
            "inputPins": data["inputPins"],
            "scope": data["verificationScope"]}


def followup_readme(data, receipt) -> bytes:
    counts = data["counts"]
    categories = counts["staticViewsByCategory"]
    category_labels = {"homeworld": "vues Homeworld", "masks": "études de masques de face",
                       "props": "états de props", "structures": "structures",
                       "units": "vues d’unités", "warp": "fond Warp"}
    category_text = ", ".join(str(number) + " " + category_labels.get(category, category)
                              for category, number in categories.items())
    text = f"""# Suivi des sprites P0 du 13 novembre 2026

[Ouvrir le classeur](Yautja_Sprites_P0_20261113.xlsx) · [Couverture JSON](coverage.json) · [Preuve technique](verification.json) · [Galerie du lot](../../../public/game/p0-sprites-20261113/review.html)

Le lot contient **{counts['generatedStaticViews']} entrées graphiques candidates : {counts['generatedSpriteFrames']} cadres de sprites et {counts['generatedOpaqueBackgrounds']} fond opaque**, correspondant à **{counts['generatedSourceDesignIdentities']} identités source**, dans **{counts['nativePngFiles']} PNG natifs**. Répartition : {category_text}. Les {counts['unitStaticViews']} vues d’unités représentent {counts['unitSourceDesignIdentities']} identités d’unités. Une page d’atlas peut contenir plusieurs cadres ; les deux sens d’une unité conservent la même identité source.

**Les 775 P0 sont des sujets documentaires, pas une quantité d’images à produire.** Les {counts['subjectsWithCandidateArtLinks']} sujets liés à de nouveaux candidats gardent leur statut antérieur, comme les {counts['subjectsWithoutCandidateArtLinks']} autres. Aucun P0 n’est fermé par ce lot. Le total d’images ou de frames nécessaire pour terminer tous les critères reste indéterminé (`null` dans le JSON), sans pourcentage d’exhaustivité artificiel.

Les PNG sont des poses ou des éléments statiques : **0 animation complète**, 0 nouvelle intégration runtime, 0 validation artistique humaine et 0 certification canonique 1:1. Les unités, structures et décors issus de la bible du projet restent des créations originales du projet. Les six masques sont des études de face appuyées sur des références communautaires, sans admission automatique de silhouette, de trois angles, de six morphologies ou d’UV. Les neuf P0 de fidélité PHG restent P0 même lorsque leur ligne de création est P1. Les sources et limites sont consignées dans « Références » et « Blocages fidélité ».

Le classeur contient sept feuilles : Synthèse, Assets, Couverture P0, Références, Blocages fidélité, Sources protégées et Déjà existants. Chaque vue relie son fichier PNG réel, son SHA256, son rectangle dans la page native, son pivot proposé, les mesures alpha du pack, ses avertissements et les lignes Excel d’origine. Les critères et statuts des 775 sujets sont recopiés sans réécrire leurs sources. Les collisions, dimensions physiques, caméra en jeu, mobilité et fidélité artistique restent à vérifier dans leur contexte.

Les 52 études BODY / 104 orientations Feral et Scar V100, les 640 PNJ statiques, les 54 gauntlets / 108 SVG et les cinq images Warp déjà présents sont exclus du compteur de nouvelles productions. Les six affectations d’équipage sont un sous-ensemble de la bibliothèque PNJ existante.

Les {counts['sourceMapDesignIdentities']} cartes W3-MAP de la Bible sont décrites avec leurs dimensions, chemins, passages et dangers. Ce lot comporte {counts['sourceMapStaticViews']} vue de carte source ; la production des tuiles régionales, couches et scènes multi-niveaux reste ouverte. Un dessin de fond aplati ne remplace ni leur géométrie ni leur interaction. Les demandes de terrain terrestre ou extraterrestre exact gardent leurs exigences de références et de revue.

Le fond de baie vide WARP-199 reste distinct des props Warp 001–005. Ces derniers sont déclarés livrés dans le catalogue historique du lot 01, dont les binaires sont à récupérer avec leur manifeste : ils ne sont pas présents dans ce checkout. Ce constat ne signifie pas qu’ils sont perdus ni qu’il faut les régénérer arbitrairement. La dépendance de récupération est citée dans « Blocages fidélité ».

`source-protection.json` protège **119 XLSX sources et 6 Markdown** provenant de l’inventaire du 9 novembre, plus **l’ancien suivi XLSX de 19 feuilles**, soit 126 entrées et 120 classeurs antérieurs. Chaque commande vérifie les octets et SHA256 ; aucun de ces fichiers n’est réécrit. La base commune est `{BASE_COMMIT}`.

## Reproduction et vérification

Depuis la racine du dépôt, avec Python standard uniquement :

```sh
python3 production/p0-sprites-20261113/tools/build-workbook.py --build
python3 production/p0-sprites-20261113/tools/verify-workbook.py --check --require-complete
```

Le générateur lit le manifeste gelé du pack, ses PNG, les références locales, les enregistrements de génération et les inventaires sources. Le vérificateur relit {receipt['cellsCompared']} cellules, les formules et leurs valeurs mises en cache, les liens et tous les XML du classeur, puis exige une reconstruction identique octet pour octet. L’option `--require-complete` concerne le lot d’images prévu et distingue explicitement sa complétude de la clôture des 775 sujets P0. Ces vérifications de fichiers ne constituent pas une recette de gameplay ou une revue artistique. Alpha, pivots et qualité sont les mesures épinglées du pack ; les identités source, les cadres et les PNG physiques restent trois dénominateurs distincts.

SHA256 du classeur : `{receipt['artifact']['sha256']}`.
"""
    return text.encode("utf-8")
