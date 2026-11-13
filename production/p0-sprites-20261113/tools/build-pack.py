#!/usr/bin/env python3
"""Build/check the candidate sprite catalogue without writing any raster pixels.

Only --write updates this lot's manifest/review HTML and pack QA JSON. Pillow
decodes originals and reads alpha rectangles in memory; it never saves an image.
The source XLSX files and every historical runtime manifest are read-only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/p0-sprites-20261113"
PUBLIC = ROOT / "public/game/p0-sprites-20261113"
INPUTS = LOT / "pack-inputs"
BASELINE = "6103b19ecbc47de30a554ba65bda66fe6b515425"
REPOSITORY = "https://github.com/darknigthmare/yautja-la-longue-chasse"
INPUT_SNAPSHOTS = {
    "p0-sprite-inventory.json": "/tmp/p0-sprites-20261113/inventory-agent/p0-sprite-inventory.json",
    "arsenal.json": "/tmp/p0-sprites-20261113/inventory-agent/arsenal.json",
    "clan-war-generation-source-designs.json": "/tmp/p0-sprites-20261113/inventory-agent/clan-war-generation-source-designs.json",
    "homeworld-alpha-replacement-candidates.json": "/tmp/p0-sprites-20261113/inventory-agent/homeworld-alpha-replacement-candidates.json",
    "phg-nine-contracts.json": "/tmp/p0-sprites-20261113/references-agent/phg-nine-contracts.json",
    "reference-contracts.json": "/tmp/p0-sprites-20261113/references-agent/reference-contracts.json",
}
GENERATION_REPORTS = ["root-seeds.json", "props.json", "units-u07-u30.json", "units-left.json", "structures.json", "homeworld.json", "masks.json", "warp.json"]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encoded(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def load(path: Path) -> dict:
    return json.loads(path.read_bytes())


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def repository_path(value: str) -> Path:
    """Accept repository paths, public URLs, and local repository references only."""
    if value.startswith("/game/"):
        path = ROOT / "public" / value.lstrip("/")
    else:
        path = Path(value)
        if not path.is_absolute():
            path = ROOT / path
    path = path.resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Path outside this repository: " + value)
    return path


def source_link(path: str) -> str | None:
    try:
        p = repository_path(path)
    except (ValueError, OSError):
        return None
    return REPOSITORY + "/blob/" + BASELINE + "/" + quote(relative(p), safe="/")


def snapshot_inputs() -> None:
    INPUTS.mkdir(parents=True, exist_ok=True)
    for name, source in INPUT_SNAPSHOTS.items():
        data = Path(source).read_bytes()
        target = INPUTS / name
        if target.exists() and target.read_bytes() != data:
            raise ValueError("Refusing to replace an already pinned source snapshot: " + name)
        if not target.exists():
            shutil.copyfile(source, target)


def alpha_metrics(image: Image.Image, rect: list[int], opaque_background: bool = False) -> dict:
    """Read native alpha; crop is an in-memory measurement, never a file edit."""
    x, y, width, height = rect
    if image.mode != "RGBA" and not (opaque_background and image.mode == "RGB"):
        raise ValueError("Native RGBA required, got " + image.mode)
    total = width * height
    if image.mode == "RGB":
        # Measure implicit full opacity mathematically, without synthesizing or
        # saving an alpha channel or modifying any native raster.
        histogram = [0] * 256
        histogram[255] = total
        bounds = (0, 0, width, height)
        edge = total if min(width, height) == 1 else 2 * width + 2 * (height - 2)
    else:
        alpha = image.getchannel("A").crop((x, y, x + width, y + height))
        histogram = alpha.histogram()
        core = alpha.point(lambda value: 255 if value >= 16 else 0)
        bounds = core.getbbox()
        edge = sum(core.crop((0, 0, width, 1)).histogram()[1:])
        if height > 1:
            edge += sum(core.crop((0, height - 1, width, height)).histogram()[1:])
        if height > 2:
            edge += sum(core.crop((0, 1, 1, height - 1)).histogram()[1:])
            if width > 1:
                edge += sum(core.crop((width - 1, 1, width, height - 1)).histogram()[1:])
    visible = sum(histogram[16:])
    opaque = sum(histogram[240:])
    margins = [bounds[0], bounds[1], width - bounds[2], height - bounds[3]] if bounds else [0, 0, 0, 0]
    fractions = [margins[0] / width, margins[1] / height, margins[2] / width, margins[3] / height]
    return {
        "threshold": 16, "noiseFloor": 2, "transparentPixels": histogram[0],
        "nativeAlphaChannel": image.mode == "RGBA", "opaqueBackground": opaque_background,
        "transparencyRequired": not opaque_background,
        "noisePixels1or2": histogram[1] + histogram[2], "visiblePixels16": visible,
        "opaquePixels240": opaque, "fullyOpaquePixels255": histogram[255], "occupancy16": round(visible / total, 8),
        "transparentFraction": round(histogram[0] / total, 8),
        "nearOpaqueFractionOfVisible16": round(opaque / visible, 8) if visible else 0,
        "bounds16": list(bounds) if bounds else None,
        "marginsPixels": margins, "marginsFraction": [round(v, 8) for v in fractions],
        "edgePixels16": edge, "coreDoesNotTouchFrameEdges": edge == 0,
        "meetsTwoPercentMargin": bool(bounds) and min(fractions) >= 0.02,
        "meetsFivePercentMargin": bool(bounds) and min(fractions) >= 0.05,
        "meetsEightPercentMargin": bool(bounds) and min(fractions) >= 0.08,
        "hiddenRgbIgnored": True,
    }


def public_reference(record: dict) -> dict:
    """Link evidence without publishing downloaded DDS/community raster files."""
    result = {key: record[key] for key in ("sha256", "role", "bytes", "label", "id", "view", "scope", "sourceType", "publisherCertified", "originalGamePixel1to1Verified", "gitBlobSha", "derivedFromSourceSha256", "moduleRegionPixels", "moduleExtraction") if key in record}
    path = str(record.get("path", ""))
    if path:
        try:
            p = repository_path(path)
        except (ValueError, OSError):
            result["privateReferenceName"] = Path(path).name
            result["privateReferenceNotPublished"] = True
        else:
            result["path"] = relative(p)
            result["url"] = ("/" + p.relative_to(ROOT / "public").as_posix()) if p.is_relative_to(PUBLIC) else source_link(relative(p))
            if record.get("sha256") and p.is_file() and sha(p.read_bytes()) != record["sha256"]:
                raise ValueError("Reference bytes differ from their recorded SHA: " + relative(p))
    for key in ("url", "sourceUrl"):
        if isinstance(record.get(key), str) and record[key].startswith("https://"):
            result["url"] = record[key]
    return result


def source_rows(source: dict | None) -> list[dict]:
    if not isinstance(source, dict):
        return []
    path = source.get("workbook", source.get("path"))
    if not path or not (source.get("sheet") or source.get("line")):
        return []
    row = {key: source[key] for key in ("sheet", "row", "line", "rowSha256", "workbookSha256", "cell", "scope", "priority") if key in source}
    row["path"] = path
    row["url"] = source_link(path)
    if row["url"] and source.get("line"):
        row["url"] += "#L" + str(source["line"])
    return [row]


class Pack:
    def __init__(self) -> None:
        self.inventory = load(INPUTS / "p0-sprite-inventory.json")
        self.briefs = load(INPUTS / "clan-war-generation-source-designs.json")
        self.arsenal = load(INPUTS / "arsenal.json")
        self.home_candidates = load(INPUTS / "homeworld-alpha-replacement-candidates.json")
        self.subjects = {row["key"]: row for row in self.inventory["subjects"]}
        self.designs = {row["id"]: row for category in ("unitRoles", "structures") for row in self.briefs[category]}
        self.field = {row["id"]: row for row in self.inventory["fieldProps"]}
        self.assets: list[dict] = []
        self.files: dict[str, dict] = {}
        self.images: dict[str, Image.Image] = {}
        self.input_pins: list[dict] = []
        self.errors: list[dict] = []
        self.warnings: list[dict] = []
        self.missing_reports: list[str] = []

    def pin(self, path: Path) -> dict:
        data = path.read_bytes()
        return {"path": relative(path), "sha256": sha(data), "bytes": len(data)}

    def register_file(self, record: dict, report: Path, index: int, category: str) -> dict:
        value = next((record.get(key) for key in ("assetPath", "repositoryPath", "path", "src") if record.get(key)), None)
        if not value:
            raise ValueError("No native file path in " + relative(report))
        path = repository_path(value)
        if not path.is_relative_to(PUBLIC) or path.suffix.lower() != ".png":
            raise ValueError("Only new native PNGs in this public namespace are accepted: " + str(value))
        key = relative(path)
        data = path.read_bytes()
        digest = sha(data)
        expected = record.get("sha256")
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise ValueError("Recorded source SHA256 required: " + key)
        if expected != digest:
            raise ValueError("Generated/public source SHA mismatch: " + key)
        if record.get("bytes") is not None and record["bytes"] != len(data):
            raise ValueError("Declared PNG byte count differs: " + key)
        native_path = next((record.get(k) for k in ("generatedNativePath", "nativeGenerationPath", "nativeSourcePath", "nativeSource") if record.get(k)), None)
        # Stable on a fresh checkout: transient /workspace/generated_images files
        # are checked when present, but their availability is not pack metadata.
        native_check = {"sourceDeclared": bool(native_path), "declaredSha256": expected,
                        "publicBytesMatchDeclaredSha256": bool(expected) and digest == expected}
        if native_path:
            native = Path(native_path)
            if native.is_file():
                if native.read_bytes() != data:
                    raise ValueError("Native ImageGen bytes have changed: " + key)
        if key in self.files:
            if self.files[key]["sha256"] != digest:
                raise ValueError("Conflicting page identity: " + key)
            return self.files[key]
        image = Image.open(path)
        image.load()
        declared_dimensions = record.get("nativeDimensions", record.get("nativeSize"))
        if declared_dimensions is None and record.get("width") and record.get("height"):
            declared_dimensions = [record["width"], record["height"]]
        if declared_dimensions is None or list(declared_dimensions) != [image.width, image.height]:
            raise ValueError("Native page dimensions must match the generation report: " + key)
        if category in ("units", "structures") and [image.width, image.height] != [1536, 1024]:
            raise ValueError("Six-cell unit/structure pages must remain native 1536x1024: " + key)
        if image.width * image.height > 16_777_216:
            raise ValueError("Native page too large: " + key)
        background = category == "warp" and record.get("sourceId", record.get("id")) == "WARP-199"
        if category == "warp" and not background:
            raise ValueError("The opaque exception is restricted to WARP-199")
        metrics = alpha_metrics(image, [0, 0, image.width, image.height], background)
        if (not background and not metrics["transparentPixels"]) or not metrics["visiblePixels16"] or not metrics["opaquePixels240"]:
            raise ValueError("Page lacks usable native transparency/visible solid content: " + key)
        if background and metrics["fullyOpaquePixels255"] != image.width * image.height:
            raise ValueError("WARP-199 background must be natively opaque: " + key)
        row = {"id": category + ":" + path.stem, "path": key,
               "src": "/" + path.relative_to(ROOT / "public").as_posix(),
               "sha256": digest, "bytes": len(data), "width": image.width, "height": image.height,
               "mode": image.mode, "alpha": metrics, "nativeGeneration": native_check,
               "pixelEditingPerformed": False,
               "generationRecord": {**self.pin(report), "index": index,
                                    "jsonPointer": ("/assets/" if report.name == "root-seeds.json" else "/entries/" if report.name in ("props.json", "homeworld.json", "masks.json", "warp.json") else "/pages/") + str(index)}}
        self.files[key] = row
        self.images[key] = image
        return row

    def add(self, source: dict, file_record: dict, report: Path, index: int,
            category: str, page: dict | None = None, parent: dict | None = None) -> None:
        page = page or {}
        parent = parent or {}
        source_id = str(source.get("sourceDesignId", source.get("sourceId", source.get("id", ""))))
        sid = str(source.get("moduleId", source.get("id", source_id)))
        design_id = str(source.get("sourceDesignId", source.get("moduleId", source_id)))
        if not sid:
            raise ValueError("Missing source/design id")
        design = self.designs.get(design_id)
        field = self.field.get(design_id)
        rect = source.get("rect", source.get("frameRect", [0, 0, file_record["width"], file_record["height"]]))
        if len(rect) != 4 or any(not isinstance(v, int) for v in rect):
            raise ValueError("Integer native source rectangle required: " + sid)
        x, y, width, height = rect
        if min(x, y) < 0 or min(width, height) <= 0 or x + width > file_record["width"] or y + height > file_record["height"]:
            raise ValueError("Frame outside its unchanged native page: " + sid)
        background = category == "warp" and source_id == "WARP-199"
        metrics = alpha_metrics(self.images[file_record["path"]], rect, background)
        if not metrics["visiblePixels16"] or not metrics["opaquePixels240"] or (not background and not metrics["transparentPixels"]):
            self.errors.append({"id": sid, "code": "frame-empty-opaque-or-no-solid-core"})
        if metrics["edgePixels16"] and not background:
            self.errors.append({"id": sid, "code": "visible-core-touches-frame-edge", "pixels": metrics["edgePixels16"]})
        bounds = metrics["bounds16"]
        suggested = [round((bounds[0] + bounds[2] - 1) / 2, 2), bounds[3] - 1] if bounds else [width / 2, height / 2]
        supplied = source.get("pivot", source.get("nativeAnchor", source.get("technical", {}).get("suggestedImagePivot")))
        if supplied is None and source.get("anchorNormalized"):
            supplied = [width * source["anchorNormalized"][0], height * source["anchorNormalized"][1]]
        pivot = supplied if supplied is not None else suggested
        if len(pivot) != 2 or any(not isinstance(v, (float, int)) for v in pivot) or not 0 <= pivot[0] <= width or not 0 <= pivot[1] <= height:
            raise ValueError("Frame-local image pivot invalid: " + sid)
        links = list(source.get("priorityLinks", source.get("relatedPriorityLinks", [])))
        rows = source_rows(source.get("source"))
        label = source.get("label", source.get("name", sid))
        if design:
            links += design["priorityLinks"]
            rows += source_rows(design.get("source"))
            label = design["name"]
        if field:
            links += field["sourcePriorityLinks"]
            label = field["label"]
        if background:
            links.append("Warp Universe:WARP-199")
        if category == "homeworld":
            links += parent.get("relatedPriorityLinks", [])
            gate = parent.get("sourceP0Gate", {})
            if gate:
                rows += source_rows({"path": parent.get("sourceWorkbook"), **gate, "priority": "P0"})
            if "Homeworld et habitats:QA-002" in self.subjects:
                links.append("Homeworld et habitats:QA-002")
        if category == "masks":
            name = sid.lower().removesuffix("-front")
            for key in (name + "-phg", name):
                candidate = "Personnalisation et arsenal:" + key
                if candidate in self.subjects:
                    links.append(candidate)
            if name in ("alpha", "samurai"):
                for group in self.arsenal["groups"]:
                    if group["id"] == "authentic-phg-base-mask-" + name:
                        links += group["sourceRowKeys"]
        links = sorted(set(links))
        unknown = [key for key in links if key not in self.subjects]
        if unknown:
            self.errors.append({"id": sid, "code": "unknown-p0-priority-links", "links": unknown})
        priority_rows = []
        for key in links:
            if key in self.subjects:
                for row in self.subjects[key]["sources"]:
                    priority_rows += [{"priorityKey": key, "priority": "P0", **entry} for entry in source_rows(row)]
        unique_rows = {json.dumps(row, sort_keys=True): row for row in rows + priority_rows}
        references = list(source.get("references", page.get("references", parent.get("referenceFiles", []))))
        if not references and page.get("generation"):
            references = page["generation"].get("references", [])
        ref_rows = [public_reference(r) for r in references if isinstance(r, dict)]
        if source.get("sourceReference"):
            ref = source["sourceReference"]
            ref_rows += [public_reference(r) for r in ref.get("files", [])]
        community = source.get("sourceCommunity")
        if community:
            ref_rows.append({"kind": "secondary-community-reference", "repository": community.get("repository"),
                             "commit": community.get("commit"), "url": community.get("readme"),
                             "attribution": community.get("attribution"), "publisherCertified": False})
        source_blueprint = source.get("sourceBlueprint")
        if source_blueprint:
            ref_rows.append(public_reference({"path": source_blueprint, "role": "original-project-source-blueprint"}))
        if category in ("homeworld", "warp") and isinstance(source.get("source"), dict):
            ref_rows.append(public_reference({**source["source"], "role": "original-project-image-design-anchor"}))
        camera = source.get("camera", page.get("camera", parent.get("camera", "camera-not-recorded")))
        facing = source.get("facing", "front" if category == "masks" else "not-independently-qualified")
        warnings = []
        if not background and not metrics["meetsFivePercentMargin"]:
            warnings.append("Marge mesurée inférieure à 5 % ; pixels natifs conservés. Le cadrage reste à examiner.")
        if not background and not metrics["meetsTwoPercentMargin"]:
            warnings.append("Au moins une marge mesurée est inférieure à 2 % ; examiner la silhouette à sa résolution native.")
        if not background and metrics["edgePixels16"]:
            warnings.append("Visible core touches a native frame edge; not qualified as unclipped.")
        limits = list(source.get("limitations", []))
        review_notes = source.get("artReview", {}).get("notes", [])
        if isinstance(review_notes, str):
            review_notes = [review_notes]
        limits += [note for note in review_notes if isinstance(note, str) and note]
        if category == "masks":
            limits += ["Secondary community front only; no publisher-certified PHG pixels, side/back views or original UV/material verification."]
            if source.get("sourceReference", {}).get("scope"):
                limits.append(source["sourceReference"]["scope"])
        if category in ("units", "structures"):
            limits += ["One static design frame; no animation, tactical ability, collision, recruitment or world-scale proof inferred."]
        if category == "homeworld":
            limits += ["Caméra de référence demandée ; projection à valider. Les mètres physiques, collisions, parcours et placement dans le Homeworld à 35° restent à qualifier."]
        if background:
            limits += ["Fond de baie intentionnellement opaque : transparence et marges de silhouette non applicables. La vacuité, la modularité et la projection restent à valider en jeu."]
        for warning in warnings:
            self.warnings.append({"id": sid, "message": warning})
        self.assets.append({
            "id": sid, "sourceId": source_id, "sourceDesignId": design_id, "category": category, "label": label,
            "assetKind": "background" if background else "sprite",
            "path": file_record["path"], "src": file_record["src"], "sha256": file_record["sha256"],
            "bytes": file_record["bytes"], "width": file_record["width"], "height": file_record["height"],
            "sourceRect": rect, "frameWidth": width, "frameHeight": height, "alpha": metrics,
            "pivot": pivot, "pivotStatus": "image-anchor-proposal; not physical or collision approval",
            "suggestedAlphaBottomPivot": suggested,
            "view": {"camera": camera, "facing": facing, "kind": "static",
                     "nativeRender": True, "wasMirror": False},
            "state": source.get("state", "single-static-pose"), "frames": 1, "animated": False,
            "sourceRows": list(unique_rows.values()), "priorityLinks": links,
            "sourceDesign": {"id": design_id, "fields": design.get("sourceFields", {}) if design else {},
                             "sourceRelationship": source.get("artReview", {}).get("sourceRelationship", "reference-based candidate")},
            "classification": "background" if background else "community-reference-study" if category == "masks" else "original-project-source-adaptation",
            "generationRecord": {**self.pin(report), "index": index, "jsonPointer": source.get("_jsonPointer")}, "references": ref_rows,
            "status": "generated-candidate", "humanArtValidated": False, "canonCertified": False,
            "runtimeIntegrated": False, "pixelEditingPerformed": False,
            "qualityCandidate": (background or not metrics["edgePixels16"]) and bool(metrics["visiblePixels16"]),
            "warnings": warnings, "limitations": list(dict.fromkeys(limits)),
        })

    def read_report(self, name: str) -> None:
        path = LOT / "generation" / name
        if not path.is_file():
            self.missing_reports.append(name)
            return
        data = load(path)
        self.input_pins.append(self.pin(path))
        if name == "root-seeds.json":
            for index, source in enumerate(data["assets"]):
                category = "units" if source.get("kind") == "unit-atlas" else "props"
                page = self.register_file(source, path, index, category)
                for frame_index, item in enumerate(source.get("frames", [source])):
                    self.add({**item, "camera": source.get("camera"), "references": source.get("references", []),
                              "_jsonPointer": "/assets/" + str(index) + ("/frames/" + str(frame_index) if "frames" in source else ""),
                              "sourceBlueprint": source.get("sourceBlueprint"),
                              **({"anchorNormalized": source["anchorNormalized"], "state": source.get("state")} if source.get("anchorNormalized") else {})},
                             page, path, index, category, source, data)
        elif name in ("props.json", "homeworld.json", "masks.json", "warp.json"):
            category = name.removesuffix(".json")
            for index, source in enumerate(data["entries"]):
                page = self.register_file(source, path, index, category)
                self.add({**source, "_jsonPointer": "/entries/" + str(index)}, page, path, index, category, parent=data)
        else:
            category = "units" if name.startswith("units-") else "structures"
            pages = {}
            for index, source in enumerate(data["pages"]):
                pages[source["id"]] = (self.register_file(source, path, index, category), source)
            for index, source in enumerate(data.get("entries", data.get("assets", []))):
                page, original = pages[source["pageId"]]
                pointer = ("/entries/" if "entries" in data else "/assets/") + str(index)
                self.add({**source, "_jsonPointer": pointer}, page, path, index, category, original, data)

    def build(self) -> dict:
        for name in INPUT_SNAPSHOTS:
            self.input_pins.append(self.pin(INPUTS / name))
        for name in GENERATION_REPORTS:
            self.read_report(name)
        self.assets.sort(key=lambda row: (row["category"], row["id"]))
        ids = [row["id"] for row in self.assets]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate normalized asset identity")
        grid_rects = {(x * 512, y * 512, 512, 512) for y in range(2) for x in range(3)}
        for path, native_file in self.files.items():
            frames = [asset for asset in self.assets if asset["path"] == path]
            if not frames:
                self.errors.append({"path": path, "code": "unreferenced-native-page"})
            elif frames[0]["category"] in ("units", "structures"):
                if len(frames) != 6 or {tuple(frame["sourceRect"]) for frame in frames} != grid_rects:
                    self.errors.append({"path": path, "code": "native-six-cell-grid-contract-not-met"})
            elif len(frames) != 1 or frames[0]["sourceRect"] != [0, 0, native_file["width"], native_file["height"]]:
                self.errors.append({"path": path, "code": "standalone-native-frame-contract-not-met"})
        for category in ("units", "structures"):
            category_assets = [row for row in self.assets if row["category"] == category]
            for i, a in enumerate(category_assets):
                for b in category_assets[i + 1:]:
                    if a["path"] != b["path"]:
                        continue
                    x, y, w, h = a["sourceRect"]
                    u, v, s, t = b["sourceRect"]
                    if max(x, u) < min(x + w, u + s) and max(y, v) < min(y + h, v + t):
                        self.errors.append({"id": a["id"], "code": "overlapping-native-frame-rectangles", "other": b["id"]})
        counts = dict(sorted(Counter(row["category"] for row in self.assets).items()))
        missing_designs = [sid for sid in sorted(self.designs) if sid not in ids]
        missing_left = [sid + "-left" for sid in sorted(self.designs) if sid.startswith("W3-U") and sid + "-left" not in ids]
        # Eleven selected Homeworld source images yield nine independent objects
        # plus four named modules from sources014/029: thirteen candidate designs.
        expected = {"props": 12, "units": 60, "structures": 18, "homeworld": 13, "masks": 6, "warp": 1}
        identities = {(row["category"], row["sourceDesignId"]) for row in self.assets}
        complete = not self.missing_reports and not missing_designs and not missing_left and all(counts.get(k, 0) == v for k, v in expected.items())
        return {"schemaVersion": 1, "id": "p0-sprites-20261113", "asOf": "2026-11-13",
                "sourceBaselineCommit": BASELINE, "status": "generated-candidates-review-required",
                "allP0Closed": False, "humanArtValidated": False, "canonCertified": False, "runtimeIntegrated": False,
                "rasterEditingByBuilder": False, "animationClips": 0,
                "counts": {"assets": len(self.assets), "nativeFiles": len(self.files), "byCategory": counts,
                           "spriteFrames": sum(asset["assetKind"] == "sprite" for asset in self.assets),
                           "opaqueBackgrounds": sum(asset["assetKind"] == "background" for asset in self.assets),
                           "designIdentities": len(identities),
                           "designIdentitiesByCategory": dict(sorted(Counter(c for c, _ in identities).items())),
                           "sourceP0Subjects": self.inventory["counts"]["p0Subjects"], "animationClips": 0,
                           "humanValidatedAssets": 0, "canonCertifiedAssets": 0},
                "plannedBatch": {"expectedMinimumByCategory": expected, "generationReportsPresent": len(GENERATION_REPORTS) - len(self.missing_reports),
                                 "generationReportsExpected": len(GENERATION_REPORTS), "missingReports": self.missing_reports,
                                 "missingUnitOrStructureDesigns": missing_designs, "requestedBatchGenerated": complete,
                                 "missingNativeLeftUnitViews": missing_left,
                                 "selectedHomeworldSourceImages": self.home_candidates["candidateCount"],
                                 "scope": "Current authored batch only; source775P0 subjects are not775 image requests and are not closed by this pack."},
                "technical": {"passed": not self.errors, "errors": self.errors, "warnings": self.warnings,
                              "alphaThreshold": 16, "marginPolicy": "Measure all margins; below5% or2% is explicitly flagged, never silently normalized or called human-approved."},
                "preservedExistingCorpus": {"homeworldNpcDrawings": 640, "feralAndScarBodyStudies": 52,
                                            "gauntletSvgParts": 108, "warpP0Images": 5,
                                            "scope": "Historical inputs excluded from new production counts."},
                "inputPins": sorted(self.input_pins, key=lambda row: row["path"]),
                "nativeFiles": sorted(self.files.values(), key=lambda row: row["path"]), "assets": self.assets,
                "limitations": ["Generation and pixel integrity do not establish human artistic validation or franchise1:1 certification.",
                                "No live game registry, save, collision, recruitment, animation or physical world scale is changed by this pack.",
                                "No CPU raster crop, resize, recolor, mirror, alpha cleanup or background removal is performed.",
                                "Native pages remain intact. Gallery source rectangles are rendered only in Canvas for review, with no image export.",
                                "Downloaded third-party community DDS/raster references are not published in the public pack."]}


def gallery(manifest: dict) -> bytes:
    template = (LOT / "tools/review-template.html").read_text()
    data = json.dumps(manifest, ensure_ascii=False).replace("<", "\\u003c")
    return template.replace("__PACK_DATA__", data).encode()


def main(arguments: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot-inputs", action="store_true", help="Copy current analysis JSON into this lot once; never replace differing pinned bytes")
    parser.add_argument("--write", action="store_true", help="Write manifest/review/QA JSON only, never raster files")
    parser.add_argument("--check", action="store_true", help="Reconstruct and compare the published pack, read-only")
    parser.add_argument("--require-complete", action="store_true", help="Also require all current batch reports/design counts")
    args = parser.parse_args(arguments)
    if args.snapshot_inputs:
        snapshot_inputs()
    if args.write == args.check:
        if args.snapshot_inputs and not args.write and not args.check:
            print(json.dumps({"passed": True, "snapshots": len(INPUT_SNAPSHOTS)}))
            return 0
        parser.error("Choose exactly --write or --check")
    pack = Pack()
    manifest = pack.build()
    body = gallery(manifest)
    if args.write:
        PUBLIC.mkdir(parents=True, exist_ok=True)
        (PUBLIC / "manifest.json").write_bytes(encoded(manifest))
        (PUBLIC / "review.html").write_bytes(body)
        qa = LOT / "qa/pack"
        qa.mkdir(parents=True, exist_ok=True)
        (qa / "verification.json").write_bytes(encoded({"passed": manifest["technical"]["passed"],
            "batchGenerated": manifest["plannedBatch"]["requestedBatchGenerated"], "allP0Closed": False,
            "counts": manifest["counts"], "manifest": {"path": relative(PUBLIC / "manifest.json"), "sha256": sha(encoded(manifest))},
            "gallery": {"path": relative(PUBLIC / "review.html"), "sha256": sha(body)},
            "errors": manifest["technical"]["errors"], "warnings": manifest["technical"]["warnings"],
            "scope": "Native pixels, declared byte identity, source mapping and deterministic pack integrity only. Browser and human art are separate."}))
    else:
        if (PUBLIC / "manifest.json").read_bytes() != encoded(manifest):
            raise ValueError("Sources, reports or pixels changed after pack export")
        if (PUBLIC / "review.html").read_bytes() != body:
            raise ValueError("Gallery differs from its deterministic reconstruction")
    passed = manifest["technical"]["passed"] and (not args.require_complete or manifest["plannedBatch"]["requestedBatchGenerated"])
    print(json.dumps({"passed": passed, "batchGenerated": manifest["plannedBatch"]["requestedBatchGenerated"],
                      "allP0Closed": False, "counts": manifest["counts"], "errors": manifest["technical"]["errors"],
                      "warningCount": len(manifest["technical"]["warnings"]), "missingReports": manifest["plannedBatch"]["missingReports"]}, ensure_ascii=False))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
