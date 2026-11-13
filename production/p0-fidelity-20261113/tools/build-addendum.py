#!/usr/bin/env python3
"""Package native candidate layers; read pixels, never write or transform rasters."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import importlib.util
from io import BytesIO
import json
import math
from pathlib import Path
import shutil
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/p0-fidelity-20261113"
PUBLIC = ROOT / "public/game/p0-fidelity-20261113"
OLD = ROOT / "production/p0-sprites-20261113"
OLD_PUBLIC = ROOT / "public/game/p0-sprites-20261113"
BASE = "dd7c08cea4934de5dfb61c27447a8808d1b87765"
BASE_MANIFEST_SHA = "f11cb10dae09c43d939ba4711ae08cc2ab6cde5d0f7e98dac40793e57e712a59"
BASE_GALLERY_SHA = "74456c421f68d166e2694cef73d64fb17a95b023e73fafa15e60a4ceb8da4c3a"
BASE_WORKBOOK_SHA = "b5d303bec0cd02866a47b8f05a126e05aab7c5755c5e951ace98a0e952d996d3"
PROTECTION = LOT / "suivi/source-protection.json"
ARTIFACT = LOT / "suivi/Yautja_Fidelite_P0_Addendum_20261113.xlsx"
SOURCE_TARGETS = {"HWA160-052-pylon", "HWA160-052-emission", "HWA160-010-architecture", "HWA160-010-water", "vex-front-v2"}
EXPECTED = SOURCE_TARGETS - {"HWA160-010-water"}
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def read(path):
    return json.loads(path.read_bytes())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def repo_path(value):
    if not isinstance(value, str) or not value or "\x00" in value:
        raise ValueError("Missing repository path")
    if value.startswith("/game/"):
        value = "public" + value
    path = Path(value)
    if ".." in path.parts:
        raise ValueError("Parent traversal is not a source path")
    path = (path if path.is_absolute() else ROOT / path).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError("Missing repository input: " + value)
    return path


def pin(path):
    raw = path.read_bytes()
    return {"path": relative(path), "sha256": sha(raw), "bytes": len(raw)}


def assert_pin(record):
    actual = pin(repo_path(record["path"]))
    if actual["sha256"] != record["sha256"] or ("bytes" in record and actual["bytes"] != record["bytes"]):
        raise ValueError("Protected input changed: " + record["path"])


def protected_sources(write):
    critical = [(OLD_PUBLIC / "manifest.json", BASE_MANIFEST_SHA), (OLD_PUBLIC / "review.html", BASE_GALLERY_SHA),
                (OLD / "suivi/Yautja_Sprites_P0_20261113.xlsx", BASE_WORKBOOK_SHA)]
    for path, expected in critical:
        if sha(path.read_bytes()) != expected:
            raise ValueError("Published baseline differs: " + relative(path))
    if not PROTECTION.exists():
        if not write:
            raise ValueError("Build the source protection snapshot before checking")
        old_protection = read(OLD / "suivi/source-protection.json")
        for record in old_protection["sources"]:
            assert_pin(record)
        base = read(OLD_PUBLIC / "manifest.json")
        for record in base["nativeFiles"]:
            assert_pin(record)
        paths = {repo_path(r["path"]) for r in old_protection["sources"]}
        published = {p for folder in [OLD, OLD_PUBLIC] for p in folder.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"}
        if len(published) != 90:
            raise ValueError("The published baseline is expected to contain exactly 90 files, excluding Python caches")
        paths.update(published)
        snapshot = {"schemaVersion": 1, "asOf": "2026-11-13", "baselineCommit": BASE,
                    "scope": "All files of the published previous lot and its126 historical source pins; no rewriting",
                    "sourceEntriesBeforePreviousLot": len(old_protection["sources"]),
                    "files": [pin(p) for p in sorted(paths)], "sourceStatusesChanged": False}
        PROTECTION.parent.mkdir(parents=True, exist_ok=True)
        PROTECTION.write_bytes(encoded(snapshot))
    snapshot = read(PROTECTION)
    for record in snapshot["files"]:
        assert_pin(record)
    required = {relative(p) for p, _ in critical}
    required.update(r["path"] for r in read(OLD / "suivi/source-protection.json")["sources"])
    required.update(r["path"] for r in read(OLD_PUBLIC / "manifest.json")["nativeFiles"])
    published = {relative(p) for folder in [OLD, OLD_PUBLIC] for p in folder.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"}
    required.update(published)
    if len(published) != 90 or len(snapshot["files"]) != 216 or not required.issubset({r["path"] for r in snapshot["files"]}):
        raise ValueError("The protection snapshot omits published inputs")
    return snapshot


def workbook_library():
    path = OLD / "tools/workbook_lib.py"
    spec = importlib.util.spec_from_file_location("p0_fidelity_previous_workbook", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def metrics(image, rect):
    if image.mode != "RGBA":
        raise ValueError("Native candidate RGBA required, got " + image.mode)
    x, y, w, h = rect
    a = image.getchannel("A").crop((x, y, x+w, y+h))
    histogram = a.histogram()
    core = a.point(lambda value: 255 if value >= 16 else 0)
    bounds = core.getbbox()
    edge = sum(core.crop((0, 0, w, 1)).histogram()[1:]) + sum(core.crop((0, h-1, w, h)).histogram()[1:])
    if h > 2:
        edge += sum(core.crop((0, 1, 1, h-1)).histogram()[1:]) + sum(core.crop((w-1, 1, w, h-1)).histogram()[1:])
    by_side = {"top": sum(core.crop((0, 0, w, 1)).histogram()[1:]), "bottom": sum(core.crop((0, h-1, w, h)).histogram()[1:]),
               "left": sum(core.crop((0, 0, 1, h)).histogram()[1:]), "right": sum(core.crop((w-1, 0, w, h)).histogram()[1:])}
    margins = [bounds[0], bounds[1], w-bounds[2], h-bounds[3]] if bounds else [0]*4
    return {"threshold": 16, "transparentPixels": histogram[0], "visiblePixels16": sum(histogram[16:]),
            "opaquePixels240": sum(histogram[240:]), "softPixels3To239": sum(histogram[3:240]),
            "noisePixels1Or2": sum(histogram[1:3]), "bounds16": list(bounds) if bounds else None,
            "marginsPixels": margins, "edgePixels16": edge, "edgePixels16BySide": by_side, "hiddenRgbIgnored": True}


def public_ref(record):
    result = {k: record[k] for k in ["sha256", "bytes", "url", "rawUrl", "role", "label", "sourceType", "publisherCertified", "originalGamePixel1to1Verified", "resolution", "scope"] if k in record}
    value = record.get("path")
    if value:
        try:
            result["path"] = relative(repo_path(value))
        except ValueError:
            result["privateReferenceName"] = Path(value).name
            result["privateReferenceNotPublished"] = True
    return result


def reference(source, source_id, write, mask):
    path = repo_path(source["path"])
    if pin(path)["sha256"] != source["sha256"]:
        raise ValueError("Original reference changed: " + relative(path))
    with Image.open(path) as image:
        image.load()
        w, h = image.size
    if mask:
        if not path.is_relative_to(OLD_PUBLIC):
            raise ValueError("Mask comparison must identify the prior published candidate")
        target = path
        kind, label = "previous-generated-candidate", "Candidat précédent — pas une référence canonique"
    else:
        if not path.is_relative_to(ROOT / "production/homeworld-v160/originals"):
            raise ValueError("Only original-project Homeworld sources can be copied for public comparison")
        target = PUBLIC / "references" / (source_id + "-original.png")
        if target.exists() and target.read_bytes() != path.read_bytes():
            raise ValueError("Existing reference copy differs: " + relative(target))
        if not target.exists():
            if not write:
                raise ValueError("Missing native reference copy: " + relative(target))
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
        kind, label = "original-project-source", "Source originale du projet — parties visibles à comparer"
    return {**pin(target), "originalPath": relative(path), "src": "/"+target.relative_to(ROOT / "public").as_posix(),
            "width": w, "height": h, "kind": kind, "label": label}


def build(write=False, complete=False):
    protected = protected_sources(write)
    baseline = read(OLD_PUBLIC / "manifest.json")
    old_assets = {a["id"]: a for a in baseline["assets"]}
    p0 = read(OLD / "pack-inputs/p0-sprite-inventory.json")["subjects"]
    valid_keys = {r["key"] for r in p0}
    assets, refs, reports, original_pins = [], {}, [], {}
    groups = {}
    for report_path in sorted((LOT / "generation").glob("*.json")):
        report = read(report_path)
        if not isinstance(report.get("entries"), list):
            continue
        reports.append(pin(report_path))
        for index, e in enumerate(report["entries"]):
            aid = e["id"]
            if aid not in EXPECTED or any(a["id"] == aid for a in assets):
                raise ValueError("Unexpected or duplicate generated asset: " + aid)
            path = repo_path(e["assetPath"])
            if not path.is_relative_to(PUBLIC) or path.is_relative_to(PUBLIC / "references") or path.suffix.lower() != ".png":
                raise ValueError("Candidate image outside the new namespace")
            native_pin = pin(path)
            if e.get("sha256") != native_pin["sha256"]:
                raise ValueError("Generation receipt differs from the native PNG: " + aid)
            private = next((e[k] for k in ["nativeSourcePath", "nativePath", "generatedNativePath"] if e.get(k)), None)
            if private and Path(private).is_file() and Path(private).read_bytes() != path.read_bytes():
                raise ValueError("Public candidate is not the original native ImageGen output: " + aid)
            with Image.open(path) as image:
                if image.format != "PNG":
                    raise ValueError("Candidate must be a native PNG: " + aid)
                image.load()
                w, h = image.size
                rect = e.get("sourceRect", [0, 0, w, h])
                if len(rect) != 4 or not all(isinstance(v, int) for v in rect) or rect[0] < 0 or rect[1] < 0 or min(rect[2:]) <= 0 or rect[0]+rect[2] > w or rect[1]+rect[3] > h:
                    raise ValueError("Invalid native source rectangle: " + aid)
                alpha = metrics(image, rect)
            mask = aid == "vex-front-v2"
            kind = "mask" if mask else e.get("assetKind", "effect" if aid.endswith(("-water", "-emission")) else "prop")
            if kind not in {"prop", "effect", "mask"}:
                raise ValueError("Unknown native alpha policy: " + kind)
            if not alpha["transparentPixels"] or not alpha["visiblePixels16"]:
                raise ValueError("Empty or opaque candidate: " + aid)
            if kind != "effect" and not alpha["opaquePixels240"]:
                raise ValueError("Physical candidate has no solid core: " + aid)
            if kind == "effect" and not alpha["softPixels3To239"]:
                raise ValueError("Effect has no soft native alpha: " + aid)
            source_id = e.get("sourceId", e.get("sourceDesignId", aid))
            source = e["sourceReference"]
            original = repo_path(source["path"])
            original_pins[relative(original)] = pin(original)
            r = reference(source, source_id, write, mask)
            if not mask:
                refs[r["path"]] = r
            group_id = e.get("compositionGroup", source_id)
            inherited = old_assets.get(source_id, {}) if mask else next(a for a in baseline["assets"] if "Homeworld et habitats:QA-007" in a["priorityLinks"])
            links = e.get("priorityLinks", inherited.get("priorityLinks", []))
            if not links or any(k not in valid_keys for k in links):
                raise ValueError("Missing or unrecognized P0 source link: " + aid)
            rows = e.get("sourceRows", inherited.get("sourceRows", []))
            limitations = list(e.get("limitations", []))
            notes = e.get("artReview", {}).get("notes", [])
            limitations += notes if isinstance(notes, list) else [notes]
            cropped = source_id == "HWA160-010" or bool(e.get("sourceIsCropped", False))
            if source_id == "HWA160-010":
                limitations += ["La source est déjà tronquée en haut. Seules les formes visibles sont séparées ; une marge alpha ne prouve pas une silhouette complète.", "L'architecture conserve les occultations : ce composant n'est pas un fond sec complet. L'effet peut comprendre eau, brume et lumière verte."]
            if source_id == "HWA160-052":
                limitations += ["La structure fine du centre optique n'est pas établie : le cœur lumineux masquait cette surface dans la source. Son exactitude après retrait de l'émission n'est pas certifiée."]
            limitations += ["Recomposition et points d'ancrage proposés ; alignement, échelle physique, caméra en jeu et fidélité détaillée restent à examiner."]
            warnings = []
            if alpha["edgePixels16"]:
                allowed_edges = {"top"} if source_id == "HWA160-010" else set()
                if any(count and side not in allowed_edges for side, count in alpha["edgePixels16BySide"].items()):
                    raise ValueError("Newly cut visible native content touches a frame edge: " + aid)
                warnings.append("La référence010 est déjà coupée en haut ; seuls les bords supérieurs attestés peuvent toucher le cadre. Cela ne valide pas la géométrie du candidat.")
            if min(alpha["marginsPixels"]) < min(rect[2:])*.02:
                warnings.append("Marge native inférieure à2% ; inspecter le cadrage réel.")
            b = alpha["bounds16"]
            pivot = e.get("pivot", [(b[0]+b[2]-1)/2, b[3]-1])
            if len(pivot) != 2 or not all(isinstance(v, (int, float)) for v in pivot) or not (0 <= pivot[0] <= rect[2] and 0 <= pivot[1] <= rect[3]):
                raise ValueError("Invalid proposed pivot: " + aid)
            references = [r]
            for extra in e.get("references", []) + e.get("identityReference", {}).get("files", []):
                value = public_ref(extra)
                if value not in references:
                    references.append(value)
            a = {"id": aid, "sourceId": source_id, "sourceDesignId": e.get("sourceDesignId", source_id),
                 "label": e.get("label", {"HWA160-052-pylon": "Pylône052 — corps séparé, optique interne non établie", "HWA160-052-emission": "Émission052 — alpha doux, falloff à examiner", "HWA160-010-architecture": "Cascade010 — architecture visible incomplète"}.get(aid, aid)), "assetKind": kind, "componentRole": e.get("componentRole", e.get("compositionRole", e.get("role", aid))),
                 **native_pin, "src": "/"+path.relative_to(ROOT / "public").as_posix(), "width": w, "height": h,
                 "sourceRect": rect, "pivot": pivot, "pivotStatus": e.get("pivotStatus", "image-anchor-proposal-not-physical-or-collision-approval"),
                 "camera": e.get("camera", "Reference camera requested; not independently qualified"),
                 "alpha": alpha, "alphaPolicy": "soft-effect-no-opaque-core-required" if kind == "effect" else "solid-core-with-transparent-surround",
                 "sourceIsCropped": cropped, "silhouetteCompleteness": "incomplete-in-source" if cropped else "requires-human-comparison",
                 "missingGeometryNotInvented": e.get("missingGeometryNotInvented"),
                 "missingGeometryClaimStatus": "producer-declaration-not-independently-verified" if e.get("missingGeometryNotInvented") is not None else "not-independently-established",
                 "hiddenSurfaceFidelityEstablished": False,
                 "sourceComponentCompleted": e.get("sourceComponentCompleted"),
                 "visibleOnly": e.get("visibleOnly"), "standaloneCompleteObject": e.get("standaloneCompleteObject"),
                 "compositionComplete": e.get("compositionComplete"), "requestedSourceToReviewAffine": e.get("requestedSourceToReviewAffine"), "affineVerified": e.get("affineVerified", False),
                 "priorityLinks": links, "sourceRows": rows, "sourceReferences": references,
                 "generationRecord": {**pin(report_path), "index": index, "jsonPointer": "/entries/"+str(index)},
                 "prompt": e.get("prompt", ""), "limitations": list(dict.fromkeys(filter(None, limitations))), "warnings": warnings,
                 "status": "generated-candidate", "canonCertified": False, "humanArtValidated": False, "runtimeIntegrated": False,
                 "pixelEditingPerformed": False, "animated": False, "frames": 1, "newDesignIdentity": False if mask else None}
            if not a["prompt"]:
                raise ValueError("Missing exact generation prompt: " + aid)
            assets.append(a)
            group = groups.setdefault(group_id, {"id": group_id, "label": "Vex — correction du candidat précédent" if mask else source_id+" — séparation des composants visibles", "source": r,
                                      "kind": "mask-correction" if mask else "component-separation", "assetIds": [], "placements": [], "limitations": []})
            group["assetIds"].append(aid)
            placement_status = "proposed-not-registered"
            placement = e.get("proposedPlacement", [0, 0, r["width"], r["height"]])
            affine = e.get("requestedSourceToReviewAffine")
            if "proposedPlacement" not in e and isinstance(affine, list) and len(affine) == 6 and affine[1] == affine[2] == 0 and affine[0] > 0 and affine[3] > 0:
                placement = [-affine[4]/affine[0], -affine[5]/affine[3], w/affine[0], h/affine[3]]
                placement_status = "inverse-of-requested-affine-not-verified"
            if not isinstance(placement, list) or len(placement) != 4 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in placement) or min(placement[2:]) <= 0:
                raise ValueError("Invalid proposed composition placement: " + aid)
            group["placements"].append({"assetId": aid, "rect": placement, "status": placement_status, "opacity": 1})
            group["limitations"] = list(dict.fromkeys(group["limitations"]+a["limitations"]))
            if source_id == "HWA160-010":
                group["label"] = "HWA160-010 — incomplet : eau/effets rejetés, architecture visible seulement"
                group["sourceTargetsComplete"] = False
                group["unresolvedSourceComponentIds"] = ["HWA160-010-water"]
                group["limitations"] += ["La couche eau/brume/rayon010 n'est pas livrée : les essais ont été rejetés pour écarts de forme et d'ancrage. Cette comparaison n'est pas une recomposition source complète."]
    assets.sort(key=lambda a: a["id"])
    missing = sorted(EXPECTED-{a["id"] for a in assets})
    unresolved = sorted(SOURCE_TARGETS-{a["id"] for a in assets})
    if complete and missing:
        raise ValueError("Missing authored candidates: " + ", ".join(missing))
    native = {a["path"]: {k: a[k] for k in ["path", "sha256", "bytes", "width", "height"]} for a in assets}
    if complete:
        actual = {relative(p) for p in PUBLIC.rglob("*.png") if not p.is_relative_to(PUBLIC / "references")}
        if actual != set(native):
            raise ValueError("Unreferenced or missing candidate PNGs in public namespace: "+str(sorted(actual.symmetric_difference(native))))
        actual_refs = {relative(p) for p in (PUBLIC / "references").rglob("*.png")}
        if actual_refs != set(refs):
            raise ValueError("Public reference copies differ from the declared unchanged source PNGs")
    manifest = {"schemaVersion": 1, "id": "p0-fidelity-20261113", "asOf": "2026-11-13", "sourceBaselineCommit": BASE,
                "status": "generated-candidates-review-required", "allP0Closed": False, "canonCertified": False, "humanArtValidated": False, "runtimeIntegrated": False,
                "counts": {"assets": len(assets), "nativeFiles": len(native), "byKind": dict(sorted(Counter(a["assetKind"] for a in assets).items())),
                           "componentLayers": sum(a["assetKind"] != "mask" for a in assets), "sourceAssemblies": len({a["sourceId"] for a in assets if a["assetKind"] != "mask"}),
                           "correctedMaskIdentities": sum(a["assetKind"] == "mask" for a in assets), "referenceCopiesExcluded": len(refs), "newCharacters": 0, "animationClips": 0,
                           "sourceP0Subjects": len(p0), "sourceP0SubjectsLinked": len({k for a in assets for k in a["priorityLinks"]}), "newlyClosedP0": 0},
                "plannedBatch": {"reviewExpectedIds": sorted(EXPECTED), "sourceTargetIds": sorted(SOURCE_TARGETS), "missingReviewIds": missing,
                                 "unresolvedSourceComponentIds": unresolved, "reviewBatchComplete": not missing, "sourceTargetsComplete": not unresolved},
                "baselinePack": {"path": relative(OLD_PUBLIC / "manifest.json"), "sha256": BASE_MANIFEST_SHA, "workbookSha256": BASE_WORKBOOK_SHA},
                "nativeFiles": list(native.values()), "referenceFiles": list(refs.values()), "assets": assets, "groups": list(groups.values()),
                "protectedSources": {"path": relative(PROTECTION), "sha256": pin(PROTECTION)["sha256"], "files": len(protected["files"])},
                "inputPins": reports+list(original_pins.values())+[pin(OLD / "tools/workbook_lib.py"), pin(Path(__file__)), pin(LOT / "tools/review-template.html")],
                "limitations": ["Intentional reference-based candidate work, no quantified1:1 score or canonical certification.", "No hidden geometry is established by generation; source clipping and occlusion remain explicit.", "References are excluded from new asset counts; two component layers are not two new source assemblies."]}
    return manifest, protected


def workbook_data(manifest, protected):
    lib = workbook_library()
    c = manifest["counts"]
    summary = [["Mesure", "Nombre/valeur", "Portée"], ["Nouvelles images candidates", c["assets"], "Couches statiques et correction ; aucun nouveau personnage"],
               ["Couches de composants", c["componentLayers"], "Composants des sources052et010 ; visible uniquement"], ["Assemblages source concernés", c["sourceAssemblies"], "Ne pas confondre composants et modèles complets"],
               ["Masques corrigés", c["correctedMaskIdentities"], "Même identité Vex ; candidat de face, source communautaire256px"], ["PNG natifs", c["nativeFiles"], "Copies inchangées ImageGen"],
               ["P0 sources", c["sourceP0Subjects"], "Le classeur antérieur reste la vue des775 sujets"], ["P0 liés à cet addendum", c["sourceP0SubjectsLinked"], "Contribution graphique sans fermeture"],
               ["Lot de revue sélectionné produit", manifest["plannedBatch"]["reviewBatchComplete"], "Quatre entrées admises au lot de revue, sans validation artistique"],
               ["Cibles source achevées", manifest["plannedBatch"]["sourceTargetsComplete"], "Non : la couche eau/brume/rayon010 a été rejetée"],
               ["Composants source non livrés", manifest["plannedBatch"]["unresolvedSourceComponentIds"], "Aucun PNG FX rejeté n'est admis dans le pack"],
               ["P0 fermés / validations humaines / canon1:1 / intégration", "0 /0 /0 /0", "Critères ouverts"], ["Suivi antérieur", lib.Link("Classeur précédent (inchangé)", "../../../production/p0-sprites-20261113/suivi/Yautja_Sprites_P0_20261113.xlsx"), BASE_WORKBOOK_SHA],
               ["Manifeste baseline", BASE_MANIFEST_SHA, "110 entrées précédentes conservées"], ["Fichiers historiques protégés", len(protected["files"]), "Octets et SHA vérifiés à chaque commande"]]
    layers = [["ID", "Source", "Type", "Nom", "PNG", "SHA256", "Pixels", "Rectangle", "Pivot proposé", "Alpha0", "Alpha≥16", "Noyau≥240", "Alpha doux3–239", "Source tronquée", "Complétude silhouette", "P0 liés", "Références Excel", "Génération", "Caméra", "Intégré", "Canon1:1", "Humain"]]
    sources = [["Asset", "Rôle/type", "Chemin/URL", "SHA256", "Dimensions", "Limites"]]
    limits = [["Asset/source", "État", "Limite précise", "À vérifier", "P0 fermé"]]
    for a in manifest["assets"]:
        layers.append([a["id"], a["sourceId"], a["assetKind"], a["label"], lib.Link(a["path"], "../../../"+a["path"]), a["sha256"], f'{a["width"]}×{a["height"]}', a["sourceRect"], a["pivot"], a["alpha"]["transparentPixels"], a["alpha"]["visiblePixels16"], a["alpha"]["opaquePixels240"], a["alpha"]["softPixels3To239"], a["sourceIsCropped"], a["silhouetteCompleteness"], a["priorityLinks"], a["sourceRows"], a["generationRecord"], a["camera"], False, False, False])
        for r in a["sourceReferences"]:
            target = r.get("url") or r.get("path") or r.get("privateReferenceName") or "Référence consignée"
            sources.append([a["id"], r.get("kind", r.get("role", "secondary-reference")), target, r.get("sha256", ""), str(r.get("width", ""))+"×"+str(r.get("height", "")), "Référence communautaire non republiée" if r.get("privateReferenceNotPublished") else r.get("label", "")])
        for note in a["limitations"]+a["warnings"]:
            limits.append([a["id"], "Ouvert — candidat", note, "Comparaison humaine et contexte de jeu ; aucune extrapolation des faces cachées", False])
    limits += [["PHG restant", "Ouvert", "City Rebreather, Haze, Rival, Saber et Tank : pas de référence de forme suffisamment établie ; coques Alpha/Samurai non qualifiées", "Sources officielles/vues complètes/couleurs/UV ; proposition réseau à publier dans les paramètres", False],
               ["Cartes/animations/archives", "Ouvert", "Cet addendum ne produit ni les12 cartes multicouches, ni les cycles d'animation, ni les archives Warp absentes du checkout", "Voir les blocages du suivi précédent, sans nouvelle fermeture", False]]
    protection_rows = [["Chemin", "Octets", "SHA256", "Inchangé"]]+[[r["path"], r["bytes"], r["sha256"], True] for r in protected["files"]]
    rows = [("Synthèse", summary, [45, 70, 110]), ("Couches", layers, [30, 25, 20, 50, 80, 68, 20, 25, 28, 20, 20, 20, 20, 24, 55, 85, 115, 80, 80, 20, 20, 20]),
            ("Références", sources, [32, 58, 120, 68, 24, 100]), ("Limites", limits+[["HWA160-010-water", "Non livré — essais rejetés", "Eau/brume/rayon : divergences de largeur, d'ancrage ou de silhouette dans les essais FX. Aucun complément de géométrie cachée établi.", "Nouvelle source ou génération plus fidèle avant admission ; recomposition complète toujours ouverte", False]], [35, 35, 120, 120, 20]), ("Sources protégées", protection_rows, [120, 20, 68, 20])]
    sheets = [{"name": name, "title": "Yautja — addendum fidélité P0 : "+name, "note": "13 novembre2026 · candidats statiques · aucune certification1:1, validation humaine ou fermetureP0", "headerRow": 4, "rows": values, "widths": widths} for name, values, widths in rows]
    return {"schemaVersion": 1, "asOf": "2026-11-13", "counts": c, "allP0Closed": False, "reviewBatchComplete": manifest["plannedBatch"]["reviewBatchComplete"], "sourceTargetsComplete": manifest["plannedBatch"]["sourceTargetsComplete"], "unresolvedSourceComponentIds": manifest["plannedBatch"]["unresolvedSourceComponentIds"], "sheets": sheets, "cells": sum(len(r) for s in sheets for r in s["rows"]), "manifestSha256": sha(encoded(manifest)), "protectedSources": manifest["protectedSources"]}, lib


def verify_workbook(raw, data, lib):
    compared = 0
    with ZipFile(BytesIO(raw)) as archive:
        if archive.testzip() is not None:
            raise ValueError("Corrupt XLSX ZIP")
        for name in archive.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(name))
        for index, sheet in enumerate(data["sheets"], 1):
            page = ET.fromstring(archive.read(f"xl/worksheets/sheet{index}.xml"))
            cells = {c.attrib["r"]: c for c in page.findall("{"+NS+"}sheetData/{"+NS+"}row/{"+NS+"}c")}
            for rownum, values in enumerate(sheet["rows"], 4):
                for colnum, value in enumerate(values, 1):
                    address = lib.column(colnum)+str(rownum)
                    cell = cells[address]
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        if float(cell.findtext("{"+NS+"}v")) != value:
                            raise ValueError("Numeric cell mismatch: "+address)
                    elif "".join(t.text or "" for t in cell.iter("{"+NS+"}t")) != (value.label if isinstance(value, lib.Link) else lib.compact(value)):
                        raise ValueError("Text cell mismatch: "+address)
                    compared += 1
    if compared != data["cells"]:
        raise ValueError("Cell count mismatch")
    return compared


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true")
    action.add_argument("--check", action="store_true")
    parser.add_argument("--require-complete", action="store_true", help="Require the four selected review entries, not completion of all five source targets or any P0 closure")
    args = parser.parse_args(arguments)
    manifest, protected = build(args.write, args.require_complete)
    template = (LOT / "tools/review-template.html").read_text()
    html = template.replace("__PACK_DATA__", json.dumps(manifest, ensure_ascii=False).replace("<", "\\u003c")).encode()
    data, lib = workbook_data(manifest, protected)
    wb = lib.build_workbook(data)
    compared = verify_workbook(wb, data, lib)
    outputs = {PUBLIC / "manifest.json": encoded(manifest), PUBLIC / "review.html": html,
               ARTIFACT: wb, LOT / "suivi/build-request.json": encoded(lib.serializable(data)),
               LOT / "suivi/coverage.json": encoded({k: v for k, v in data.items() if k != "sheets"})}
    if args.write:
        for path, raw in outputs.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    else:
        for path, raw in outputs.items():
            if not path.exists() or path.read_bytes() != raw:
                raise ValueError("Output differs from deterministic reconstruction: "+relative(path))
    result = {"passed": True, "counts": manifest["counts"], "reviewBatchComplete": manifest["plannedBatch"]["reviewBatchComplete"], "sourceTargetsComplete": manifest["plannedBatch"]["sourceTargetsComplete"], "unresolvedSourceComponentIds": manifest["plannedBatch"]["unresolvedSourceComponentIds"],
              "manifest": pin(PUBLIC / "manifest.json"), "gallery": pin(PUBLIC / "review.html"), "workbook": pin(ARTIFACT),
              "sheets": [s["name"] for s in data["sheets"]], "cellsCompared": compared, "protectedFiles": len(protected["files"]),
              "deterministicReconstructionIdentical": True, "allP0Closed": False, "scope": "Native bytes, alpha-policy distinction, exact source pins and OpenXML/cells only; browser/human/canon/runtime separate"}
    if args.write:
        (LOT / "suivi/verification.json").write_bytes(encoded(result))
    elif read(LOT / "suivi/verification.json") != result:
        raise ValueError("Verification receipt differs")
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
