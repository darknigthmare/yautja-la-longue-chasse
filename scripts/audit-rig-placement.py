"""Audit the generated V3 hunter rig with measurable geometry checks.

This script does not inspect TypeScript implementation details and does not
attempt to judge lore or artistic resemblance.  It measures the bind-pose
contract exposed by ``public/game/assets/v3/manifest.json``:

* alpha bounds and declared pivots;
* anatomical part coverage, overdraw and joint registration;
* wearable/weapon fit against every body morphology;
* articulated equipment-chain gaps and excessive intersections;
* cross-morphology placement variance.

The default invocation writes a JSON report, a compact Markdown summary and
visual contact sheets under ``outputs/qa``.  Use ``--strict`` in a release gate:
it exits with status 1 while any error-level placement defect remains.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "public" / "game" / "assets" / "v3" / "manifest.json"
DEFAULT_OUTPUT = ROOT / "outputs" / "qa"
ALPHA_THRESHOLD = 8

PART_ORDER = (
    "head",
    "torso",
    "pelvis",
    "upper-arm-back",
    "lower-arm-back",
    "hand-back",
    "upper-arm-front",
    "lower-arm-front",
    "hand-front",
    "thigh-back",
    "shin-back",
    "foot-back",
    "thigh-front",
    "shin-front",
    "foot-front",
)

PART_PARENT = {
    "head": "torso",
    "torso": "pelvis",
    "pelvis": None,
    "upper-arm-back": "torso",
    "lower-arm-back": "upper-arm-back",
    "hand-back": "lower-arm-back",
    "upper-arm-front": "torso",
    "lower-arm-front": "upper-arm-front",
    "hand-front": "lower-arm-front",
    "thigh-back": "pelvis",
    "shin-back": "thigh-back",
    "foot-back": "shin-back",
    "thigh-front": "pelvis",
    "shin-front": "thigh-front",
    "foot-front": "shin-front",
}

PART_COLORS = {
    "head": (245, 213, 70, 230),
    "torso": (80, 180, 235, 230),
    "pelvis": (180, 100, 235, 230),
    "upper-arm-back": (75, 220, 145, 230),
    "lower-arm-back": (55, 170, 115, 230),
    "hand-back": (35, 125, 85, 230),
    "upper-arm-front": (250, 145, 65, 230),
    "lower-arm-front": (220, 95, 60, 230),
    "hand-front": (175, 65, 55, 230),
    "thigh-back": (90, 145, 245, 230),
    "shin-back": (65, 100, 210, 230),
    "foot-back": (45, 70, 165, 230),
    "thigh-front": (240, 100, 175, 230),
    "shin-front": (205, 70, 145, 230),
    "foot-front": (160, 50, 115, 230),
}

MODULE_TARGETS = {
    "masks": lambda _asset_id: "head",
    "dreads": lambda _asset_id: "head",
    "armor": lambda asset_id: (
        "torso"
        if asset_id.startswith("chest-")
        else "upper-arm-front"
        if asset_id.startswith("shoulder-")
        else "lower-arm-front"
        if asset_id == "bracer"
        else "thigh-front"
        if asset_id == "thigh"
        else "shin-front"
        if asset_id == "shin"
        else "pelvis"
    ),
    "equipment": lambda asset_id: (
        "torso"
        if asset_id == "mount"
        else "lower-arm-back"
        if asset_id in {"gauntlet-base", "gauntlet-lid"}
        else "lower-arm-front"
        if asset_id in {"blade-housing", "blades"}
        else None
    ),
    "weapons": lambda _asset_id: "hand-front",
    "gear": lambda _asset_id: "pelvis",
    "trophies": lambda _asset_id: "pelvis",
}

# A module can hang away from its anatomical target.  These category-specific
# thresholds are deliberately broad; crossing one indicates a geometric
# registration defect, not merely an artistic preference.
MODULE_THRESHOLDS = {
    "masks": {
        "pivot_warning": 5,
        "pivot_error": 10,
        "min_overlap": 0.28,
        "size_min": 0.12,
        "size_max": 1.65,
    },
    "dreads": {
        "pivot_warning": 6,
        "pivot_error": 12,
        "min_overlap": 0.025,
        "size_min": 0.25,
        "size_max": 4.5,
    },
    "armor": {
        "pivot_warning": 7,
        "pivot_error": 13,
        "min_overlap": 0.10,
        "size_min": 0.08,
        "size_max": 3.25,
    },
    "equipment": {
        "pivot_warning": 8,
        "pivot_error": 15,
        "min_overlap": 0.06,
        "size_min": 0.04,
        "size_max": 3.5,
    },
    "weapons": {
        "pivot_warning": 8,
        "pivot_error": 15,
        "min_overlap": 0.0,
        "size_min": 0.03,
        "size_max": 16.0,
    },
    "gear": {
        "pivot_warning": 9,
        "pivot_error": 17,
        "min_overlap": 0.015,
        "size_min": 0.04,
        "size_max": 4.5,
    },
    "trophies": {
        "pivot_warning": 10,
        "pivot_error": 18,
        "min_overlap": 0.0,
        "size_min": 0.04,
        "size_max": 7.0,
    },
}

EQUIPMENT_CHAIN = (
    ("mount", "caster-upper"),
    ("caster-upper", "caster-lower"),
    ("caster-lower", "yoke"),
    ("yoke", "cannon"),
    ("cannon", "barrel"),
    ("barrel", "muzzle"),
    ("muzzle", "laser"),
    ("gauntlet-base", "gauntlet-lid"),
    ("blade-housing", "blades"),
)


@dataclass
class LoadedAsset:
    category: str
    asset_id: str
    descriptor: dict[str, Any]
    image: Image.Image
    mask: Image.Image
    area: int
    bounds: tuple[int, int, int, int]


class Audit:
    def __init__(self, manifest: dict[str, Any]) -> None:
        self.manifest = manifest
        self.findings: list[dict[str, Any]] = []
        self.metrics: dict[str, Any] = {
            "bodies": {},
            "assets": {},
            "moduleFit": {},
            "moduleCollisions": {},
            "equipmentChain": {},
        }
        self._asset_cache: dict[tuple[str, str, str], LoadedAsset] = {}

    def finding(
        self,
        severity: str,
        code: str,
        subject: str,
        message: str,
        *,
        body_id: str | None = None,
        category: str | None = None,
        measurements: dict[str, Any] | None = None,
        threshold: dict[str, Any] | None = None,
    ) -> None:
        finding: dict[str, Any] = {
            "severity": severity,
            "code": code,
            "subject": subject,
            "message": message,
        }
        if body_id is not None:
            finding["bodyId"] = body_id
        if category is not None:
            finding["category"] = category
        if measurements:
            finding["measurements"] = measurements
        if threshold:
            finding["threshold"] = threshold
        self.findings.append(finding)

    def public_path(self, url: str) -> Path:
        path = (ROOT / "public" / url.removeprefix("/")).resolve()
        if not path.is_relative_to((ROOT / "public").resolve()):
            raise ValueError(f"Asset path escapes public/: {url}")
        return path

    def load_asset(
        self,
        category: str,
        asset_id: str,
        descriptor: dict[str, Any],
    ) -> LoadedAsset:
        cache_key = (category, asset_id, descriptor["registeredPath"])
        cached = self._asset_cache.get(cache_key)
        if cached is not None:
            return cached
        path = self.public_path(descriptor["registeredPath"])
        with Image.open(path) as source:
            image = source.convert("RGBA")
        mask = binary_alpha(image)
        bounds = mask.getbbox()
        if bounds is None:
            raise ValueError(f"Empty alpha: {path}")
        loaded = LoadedAsset(
            category=category,
            asset_id=asset_id,
            descriptor=descriptor,
            image=image,
            mask=mask,
            area=mask_area(mask),
            bounds=bounds,
        )
        self._asset_cache[cache_key] = loaded
        return loaded

    def body_asset(self, body_id: str) -> LoadedAsset:
        descriptor = self.manifest["hunter"]["bodies"][body_id]["full"]
        return self.load_asset("bodies", body_id, descriptor)

    def body_part(self, body_id: str, part_id: str) -> LoadedAsset:
        descriptor = self.manifest["hunter"]["bodies"][body_id]["parts"][part_id]
        return self.load_asset("body-parts", f"{body_id}:{part_id}", descriptor)

    def audit_descriptor(
        self,
        category: str,
        asset_id: str,
        descriptor: dict[str, Any],
    ) -> None:
        asset = self.load_asset(category, asset_id, descriptor)
        declared = rect_to_bounds(descriptor["alphaBounds"])
        if asset.bounds != declared:
            self.finding(
                "error",
                "ALPHA_BOUNDS_MISMATCH",
                f"{category}/{asset_id}",
                "Les limites alpha réelles diffèrent du manifeste.",
                category=category,
                measurements={
                    "declared": list(declared),
                    "actual": list(asset.bounds),
                },
                threshold={"exactMatch": True},
            )

        pivot = point_tuple(descriptor["pivotMaster"])
        canvas = self.manifest["canvas"]
        if not (0 <= pivot[0] < canvas["width"] and 0 <= pivot[1] < canvas["height"]):
            self.finding(
                "error",
                "PIVOT_OUTSIDE_CANVAS",
                f"{category}/{asset_id}",
                "Le pivot sort du canevas maître.",
                category=category,
                measurements={"pivot": list(pivot)},
                threshold={
                    "x": [0, canvas["width"] - 1],
                    "y": [0, canvas["height"] - 1],
                },
            )

        pivot_distance = point_to_mask_distance(asset.mask, pivot, 64)
        component_areas = connected_component_areas(asset.mask)
        major_floor = max(8, round(asset.area * 0.005))
        major_components = [
            component_area
            for component_area in component_areas
            if component_area >= major_floor
        ]
        largest_component_ratio = component_areas[0] / asset.area
        density = asset.area / (
            bounds_width(asset.bounds) * bounds_height(asset.bounds)
        )
        metric_key = f"{category}/{asset_id}"
        self.metrics["assets"][metric_key] = {
            "alphaBounds": list(asset.bounds),
            "alphaAreaPx": asset.area,
            "alphaDensityInBounds": round(density, 6),
            "pivot": list(pivot),
            "pivotToAlphaPx": pivot_distance,
            "connectedComponents": len(component_areas),
            "majorComponentFloorPx": major_floor,
            "majorComponents": len(major_components),
            "largestComponentRatio": round(largest_component_ratio, 6),
        }

        # A full-body root can intentionally sit between the feet, and a sparse
        # net overlay need not contain alpha at every anatomical joint.  Module
        # pivots, on the other hand, must remain close to the module they move.
        if category not in {"bodies", "body-parts", "net-full", "net-parts"}:
            # A hanging trophy is registered by its belt hook, intentionally
            # above the first visible skull/spine pixel.
            warning_distance = 35 if category == "trophies" else 12
            error_distance = 44 if category == "trophies" else 20
            if pivot_distance > warning_distance:
                severity = (
                    "error" if pivot_distance > error_distance else "warning"
                )
                self.finding(
                    severity,
                    "PIVOT_OUTSIDE_ASSET",
                    f"{category}/{asset_id}",
                    "Le pivot déclaré est éloigné de la silhouette de la pièce.",
                    category=category,
                    measurements={
                        "pivot": list(pivot),
                        "distancePx": pivot_distance,
                    },
                    threshold={
                        "warningAbovePx": warning_distance,
                        "errorAbovePx": error_distance,
                    },
                )
            if len(major_components) > 5 or largest_component_ratio < 0.58:
                severity = (
                    "error"
                    if len(major_components) > 9
                    or largest_component_ratio < 0.40
                    else "warning"
                )
                self.finding(
                    severity,
                    "MODULE_FRAGMENTED_ALPHA",
                    f"{category}/{asset_id}",
                    "La pièce contient plusieurs îlots alpha importants; son atomicité doit être vérifiée.",
                    category=category,
                    measurements={
                        "majorComponents": len(major_components),
                        "majorComponentFloorPx": major_floor,
                        "largestComponentRatio": round(
                            largest_component_ratio,
                            6,
                        ),
                        "alphaDensityInBounds": round(density, 6),
                    },
                    threshold={
                        "warningMajorComponentsAbove": 5,
                        "errorMajorComponentsAbove": 9,
                        "warningLargestComponentBelow": 0.58,
                        "errorLargestComponentBelow": 0.40,
                    },
                )

    def audit_body(self, body_id: str) -> None:
        body = self.body_asset(body_id)
        parts = {
            part_id: self.body_part(body_id, part_id)
            for part_id in PART_ORDER
        }
        union = Image.new("L", body.mask.size)
        summed_area = 0
        for part in parts.values():
            union = ImageChops.lighter(union, part.mask)
            summed_area += part.area
        union_area = mask_area(union)
        missing = ImageChops.subtract(body.mask, union)
        extra = ImageChops.subtract(union, body.mask)
        missing_area = mask_area(missing)
        extra_area = mask_area(extra)
        coverage = 1.0 if body.area == 0 else 1 - missing_area / body.area
        overdraw = 1.0 if union_area == 0 else summed_area / union_area
        body_width = body.bounds[2] - body.bounds[0]
        body_height = body.bounds[3] - body.bounds[1]
        center_x = (body.bounds[0] + body.bounds[2]) / 2

        body_metrics: dict[str, Any] = {
            "alphaBounds": list(body.bounds),
            "alphaAreaPx": body.area,
            "widthPx": body_width,
            "heightPx": body_height,
            "centerOffsetXPx": round(center_x - self.manifest["anchors"]["root"]["x"], 3),
            "partCoverage": round(coverage, 6),
            "missingPx": missing_area,
            "extraPx": extra_area,
            "partOverdrawRatio": round(overdraw, 6),
            "parts": {},
            "joints": {},
        }
        self.metrics["bodies"][body_id] = body_metrics

        if coverage < 0.995 or extra_area:
            self.finding(
                "error",
                "BODY_PART_COVERAGE",
                body_id,
                "L’union des pièces anatomiques ne reconstitue pas exactement le corps.",
                body_id=body_id,
                measurements={
                    "coverage": round(coverage, 6),
                    "missingPx": missing_area,
                    "extraPx": extra_area,
                },
                threshold={"minimumCoverage": 0.995, "maximumExtraPx": 0},
            )

        if overdraw > 1.35:
            severity = "error" if overdraw > 1.50 else "warning"
            self.finding(
                severity,
                "BODY_PART_EXCESSIVE_OVERDRAW",
                body_id,
                "Les pièces anatomiques se recouvrent trop fortement dans la pose de référence.",
                body_id=body_id,
                measurements={"overdrawRatio": round(overdraw, 6)},
                threshold={"warningAbove": 1.35, "errorAbove": 1.50},
            )

        if body_height < 345 or body_height > 352:
            self.finding(
                "error",
                "BODY_HEIGHT_OUT_OF_CONTRACT",
                body_id,
                "La hauteur normalisée du corps sort du contrat 350 px.",
                body_id=body_id,
                measurements={"heightPx": body_height},
                threshold={"minimumPx": 345, "maximumPx": 352},
            )
        if abs(center_x - self.manifest["anchors"]["root"]["x"]) > 12:
            self.finding(
                "warning",
                "BODY_ROOT_OFF_CENTER",
                body_id,
                "La silhouette est sensiblement décentrée par rapport au root.",
                body_id=body_id,
                measurements={
                    "bodyCenterX": round(center_x, 3),
                    "rootX": self.manifest["anchors"]["root"]["x"],
                    "offsetPx": round(center_x - self.manifest["anchors"]["root"]["x"], 3),
                },
                threshold={"absoluteOffsetWarningAbovePx": 12},
            )

        for part_id, part in parts.items():
            descriptor = part.descriptor
            pivot = point_tuple(descriptor["pivotMaster"])
            pivot_distance = point_to_mask_distance(part.mask, pivot, 48)
            area_ratio = part.area / body.area
            body_metrics["parts"][part_id] = {
                "alphaBounds": list(part.bounds),
                "alphaAreaPx": part.area,
                "bodyAreaRatio": round(area_ratio, 6),
                "pivot": list(pivot),
                "pivotToPartPx": pivot_distance,
            }
            if pivot_distance > 8:
                severity = "error" if pivot_distance > 14 else "warning"
                self.finding(
                    severity,
                    "BODY_PART_PIVOT_MISS",
                    f"{body_id}/{part_id}",
                    "Le pivot de la pièce anatomique ne tombe pas sur sa silhouette.",
                    body_id=body_id,
                    category="body-parts",
                    measurements={
                        "pivot": list(pivot),
                        "distancePx": pivot_distance,
                    },
                    threshold={"warningAbovePx": 8, "errorAbovePx": 14},
                )
            if area_ratio < 0.004 or area_ratio > 0.42:
                self.finding(
                    "warning",
                    "BODY_PART_AREA_EXTREME",
                    f"{body_id}/{part_id}",
                    "La surface de cette pièce est extrême par rapport au corps complet.",
                    body_id=body_id,
                    category="body-parts",
                    measurements={"bodyAreaRatio": round(area_ratio, 6)},
                    threshold={"minimum": 0.004, "maximum": 0.42},
                )

            parent_id = PART_PARENT[part_id]
            if parent_id is None:
                continue
            parent = parts[parent_id]
            parent_distance = point_to_mask_distance(parent.mask, pivot, 48)
            seam_gap = mask_distance(part.mask, parent.mask, maximum=24)
            intersection = intersection_area(part.mask, parent.mask)
            overlap_ratio = intersection / min(part.area, parent.area)
            joint_metrics = {
                "pivot": list(pivot),
                "pivotToChildPx": pivot_distance,
                "pivotToParentPx": parent_distance,
                "seamGapPx": seam_gap,
                "intersectionPx": intersection,
                "smallerPartOverlapRatio": round(overlap_ratio, 6),
            }
            body_metrics["joints"][f"{parent_id}->{part_id}"] = joint_metrics

            if parent_distance > 8:
                severity = "error" if parent_distance > 14 else "warning"
                self.finding(
                    severity,
                    "JOINT_PARENT_PIVOT_MISS",
                    f"{body_id}/{parent_id}->{part_id}",
                    "Le pivot enfant est éloigné de la silhouette de la pièce parente.",
                    body_id=body_id,
                    category="body-parts",
                    measurements={
                        "pivot": list(pivot),
                        "distanceToParentPx": parent_distance,
                    },
                    threshold={"warningAbovePx": 8, "errorAbovePx": 14},
                )
            if seam_gap > 2:
                severity = "error" if seam_gap > 5 else "warning"
                self.finding(
                    severity,
                    "JOINT_VISIBLE_GAP",
                    f"{body_id}/{parent_id}->{part_id}",
                    "Les silhouettes enfant et parente ne se touchent pas au bind pose.",
                    body_id=body_id,
                    category="body-parts",
                    measurements={"gapPx": seam_gap},
                    threshold={"warningAbovePx": 2, "errorAbovePx": 5},
                )
            if overlap_ratio > 0.36:
                severity = "error" if overlap_ratio > 0.52 else "warning"
                self.finding(
                    severity,
                    "JOINT_EXCESSIVE_INTERSECTION",
                    f"{body_id}/{parent_id}->{part_id}",
                    "La séparation modulaire du joint duplique une trop grande partie de la petite pièce.",
                    body_id=body_id,
                    category="body-parts",
                    measurements={
                        "intersectionPx": intersection,
                        "smallerPartOverlapRatio": round(overlap_ratio, 6),
                    },
                    threshold={"warningAbove": 0.36, "errorAbove": 0.52},
                )

    def audit_module_fit(self) -> None:
        bodies = tuple(self.manifest["hunter"]["bodies"])
        for category, target_resolver in MODULE_TARGETS.items():
            category_assets = self.manifest["hunter"].get(category, {})
            for asset_id, descriptor in category_assets.items():
                module = self.load_asset(category, asset_id, descriptor)
                target_id = target_resolver(asset_id)
                if target_id is None:
                    continue
                fit_key = f"{category}/{asset_id}"
                fit_rows: dict[str, Any] = {}
                self.metrics["moduleFit"][fit_key] = fit_rows
                thresholds = MODULE_THRESHOLDS[category]
                for body_id in bodies:
                    target = self.body_part(body_id, target_id)
                    body = self.body_asset(body_id)
                    pivot = point_tuple(descriptor["pivotMaster"])
                    pivot_target_distance = point_to_mask_distance(
                        target.mask,
                        pivot,
                        64,
                    )
                    overlap_target = intersection_area(module.mask, target.mask)
                    overlap_body = intersection_area(module.mask, body.mask)
                    module_overlap_ratio = overlap_target / module.area
                    body_overlap_ratio = overlap_body / module.area
                    size_ratio = module.area / target.area
                    bbox_width_ratio = bounds_width(module.bounds) / bounds_width(
                        target.bounds
                    )
                    bbox_height_ratio = bounds_height(module.bounds) / bounds_height(
                        target.bounds
                    )
                    fit_rows[body_id] = {
                        "targetPart": target_id,
                        "pivotToTargetPx": pivot_target_distance,
                        "targetIntersectionPx": overlap_target,
                        "moduleOverlapWithTargetRatio": round(
                            module_overlap_ratio,
                            6,
                        ),
                        "moduleOverlapWithBodyRatio": round(body_overlap_ratio, 6),
                        "moduleToTargetAreaRatio": round(size_ratio, 6),
                        "bboxWidthRatio": round(bbox_width_ratio, 6),
                        "bboxHeightRatio": round(bbox_height_ratio, 6),
                    }

                    if pivot_target_distance > thresholds["pivot_warning"]:
                        severity = (
                            "error"
                            if pivot_target_distance > thresholds["pivot_error"]
                            else "warning"
                        )
                        self.finding(
                            severity,
                            "MODULE_PIVOT_MISALIGNED",
                            fit_key,
                            "Le pivot du module est éloigné de sa pièce anatomique cible.",
                            body_id=body_id,
                            category=category,
                            measurements={
                                "targetPart": target_id,
                                "pivotToTargetPx": pivot_target_distance,
                            },
                            threshold={
                                "warningAbovePx": thresholds["pivot_warning"],
                                "errorAbovePx": thresholds["pivot_error"],
                            },
                        )

                    if module_overlap_ratio < thresholds["min_overlap"]:
                        severity = (
                            "error"
                            if module_overlap_ratio
                            < thresholds["min_overlap"] * 0.45
                            else "warning"
                        )
                        self.finding(
                            severity,
                            "MODULE_TARGET_CONTACT_TOO_LOW",
                            fit_key,
                            "Le module touche trop peu sa zone anatomique cible.",
                            body_id=body_id,
                            category=category,
                            measurements={
                                "targetPart": target_id,
                                "moduleOverlapWithTargetRatio": round(
                                    module_overlap_ratio,
                                    6,
                                ),
                                "intersectionPx": overlap_target,
                            },
                            threshold={
                                "minimumRatio": thresholds["min_overlap"],
                                "errorBelowRatio": round(
                                    thresholds["min_overlap"] * 0.45,
                                    6,
                                ),
                            },
                        )

                    if (
                        size_ratio < thresholds["size_min"]
                        or size_ratio > thresholds["size_max"]
                    ):
                        self.finding(
                            "warning",
                            "MODULE_SIZE_RATIO_EXTREME",
                            fit_key,
                            "La surface du module est disproportionnée par rapport à sa cible.",
                            body_id=body_id,
                            category=category,
                            measurements={
                                "targetPart": target_id,
                                "moduleToTargetAreaRatio": round(size_ratio, 6),
                                "bboxWidthRatio": round(bbox_width_ratio, 6),
                                "bboxHeightRatio": round(bbox_height_ratio, 6),
                            },
                            threshold={
                                "minimumAreaRatio": thresholds["size_min"],
                                "maximumAreaRatio": thresholds["size_max"],
                            },
                        )

                overlap_values = [
                    row["moduleOverlapWithTargetRatio"]
                    for row in fit_rows.values()
                ]
                pivot_values = [row["pivotToTargetPx"] for row in fit_rows.values()]
                overlap_spread = max(overlap_values) - min(overlap_values)
                pivot_spread = max(pivot_values) - min(pivot_values)
                if overlap_spread > 0.16:
                    severity = "error" if overlap_spread > 0.28 else "warning"
                    worst_body = min(
                        fit_rows,
                        key=lambda body_id: fit_rows[body_id][
                            "moduleOverlapWithTargetRatio"
                        ],
                    )
                    best_body = max(
                        fit_rows,
                        key=lambda body_id: fit_rows[body_id][
                            "moduleOverlapWithTargetRatio"
                        ],
                    )
                    self.finding(
                        severity,
                        "MODULE_CROSS_BODY_FIT_VARIANCE",
                        fit_key,
                        "Le même placement ne s’adapte pas de façon stable aux six morphologies.",
                        category=category,
                        measurements={
                            "minimumBody": worst_body,
                            "minimumOverlapRatio": fit_rows[worst_body][
                                "moduleOverlapWithTargetRatio"
                            ],
                            "maximumBody": best_body,
                            "maximumOverlapRatio": fit_rows[best_body][
                                "moduleOverlapWithTargetRatio"
                            ],
                            "spread": round(overlap_spread, 6),
                            "pivotDistanceSpreadPx": pivot_spread,
                        },
                        threshold={
                            "warningSpreadAbove": 0.16,
                            "errorSpreadAbove": 0.28,
                        },
                    )

    def audit_net(self, body_id: str) -> None:
        body_entry = self.manifest["hunter"]["bodies"][body_id]
        net_full = self.load_asset(
            "net-full",
            body_id,
            body_entry["net"]["full"],
        )
        net_parts = {
            part_id: self.load_asset(
                "net-parts",
                f"{body_id}:{part_id}",
                descriptor,
            )
            for part_id, descriptor in body_entry["net"]["parts"].items()
        }
        union = Image.new("L", net_full.mask.size)
        summed_area = 0
        for part in net_parts.values():
            union = ImageChops.lighter(union, part.mask)
            summed_area += part.area
        union_area = mask_area(union)
        missing_area = mask_area(ImageChops.subtract(net_full.mask, union))
        extra_area = mask_area(ImageChops.subtract(union, net_full.mask))
        coverage = (
            1.0
            if net_full.area == 0
            else 1 - missing_area / net_full.area
        )
        overdraw = 1.0 if union_area == 0 else summed_area / union_area
        body_metrics = self.metrics["bodies"][body_id]
        body_metrics["net"] = {
            "alphaBounds": list(net_full.bounds),
            "alphaAreaPx": net_full.area,
            "partCount": len(net_parts),
            "partCoverage": round(coverage, 6),
            "missingPx": missing_area,
            "extraPx": extra_area,
            "partOverdrawRatio": round(overdraw, 6),
        }
        if coverage < 0.995 or extra_area:
            self.finding(
                "error",
                "NET_PART_COVERAGE",
                body_id,
                "L’union des pièces de filet ne reconstitue pas le filet complet.",
                body_id=body_id,
                category="net-parts",
                measurements={
                    "coverage": round(coverage, 6),
                    "missingPx": missing_area,
                    "extraPx": extra_area,
                },
                threshold={"minimumCoverage": 0.995, "maximumExtraPx": 0},
            )
        if overdraw > 1.35:
            severity = "error" if overdraw > 1.50 else "warning"
            self.finding(
                severity,
                "NET_PART_EXCESSIVE_OVERDRAW",
                body_id,
                "Les pièces du filet se recouvrent excessivement au bind pose.",
                body_id=body_id,
                category="net-parts",
                measurements={"overdrawRatio": round(overdraw, 6)},
                threshold={"warningAbove": 1.35, "errorAbove": 1.50},
            )
        for part_id, net_part in net_parts.items():
            body_descriptor = body_entry["parts"][part_id]
            if net_part.descriptor["pivotMaster"] != body_descriptor["pivotMaster"]:
                self.finding(
                    "error",
                    "NET_BODY_PIVOT_DISAGREEMENT",
                    f"{body_id}/{part_id}",
                    "Le filet et la pièce corporelle associée n’utilisent pas le même pivot.",
                    body_id=body_id,
                    category="net-parts",
                    measurements={
                        "netPivot": net_part.descriptor["pivotMaster"],
                        "bodyPivot": body_descriptor["pivotMaster"],
                    },
                    threshold={"exactMatch": True},
                )

    def audit_equipment_chain(self) -> None:
        equipment = self.manifest["hunter"]["equipment"]
        loaded = {
            asset_id: self.load_asset("equipment", asset_id, descriptor)
            for asset_id, descriptor in equipment.items()
        }
        for parent_id, child_id in EQUIPMENT_CHAIN:
            parent = loaded[parent_id]
            child = loaded[child_id]
            pivot = point_tuple(child.descriptor["pivotMaster"])
            pivot_to_parent = point_to_mask_distance(parent.mask, pivot, 64)
            pivot_to_child = point_to_mask_distance(child.mask, pivot, 64)
            gap = mask_distance(parent.mask, child.mask, maximum=32)
            intersection = intersection_area(parent.mask, child.mask)
            overlap_ratio = intersection / min(parent.area, child.area)
            chain_id = f"{parent_id}->{child_id}"
            self.metrics["equipmentChain"][chain_id] = {
                "childPivot": list(pivot),
                "pivotToParentPx": pivot_to_parent,
                "pivotToChildPx": pivot_to_child,
                "alphaGapPx": gap,
                "intersectionPx": intersection,
                "smallerPieceOverlapRatio": round(overlap_ratio, 6),
            }

            if pivot_to_parent > 8 or pivot_to_child > 8:
                maximum_distance = max(pivot_to_parent, pivot_to_child)
                severity = "error" if maximum_distance > 14 else "warning"
                self.finding(
                    severity,
                    "EQUIPMENT_JOINT_PIVOT_MISS",
                    chain_id,
                    "Le pivot articulé ne tombe pas sur les deux pièces qu’il relie.",
                    category="equipment",
                    measurements={
                        "pivot": list(pivot),
                        "pivotToParentPx": pivot_to_parent,
                        "pivotToChildPx": pivot_to_child,
                    },
                    threshold={"warningAbovePx": 8, "errorAbovePx": 14},
                )
            if gap > 2:
                severity = "error" if gap > 5 else "warning"
                self.finding(
                    severity,
                    "EQUIPMENT_CHAIN_GAP",
                    chain_id,
                    "Un espace alpha est visible entre deux pièces articulées.",
                    category="equipment",
                    measurements={"gapPx": gap},
                    threshold={"warningAbovePx": 2, "errorAbovePx": 5},
                )
            # The laser diode is a nested, independently toggled insert inside
            # the muzzle cap; full contact is its correct assembled state.
            nested_insert = chain_id == "muzzle->laser"
            if overlap_ratio > 0.42 and not nested_insert:
                severity = "error" if overlap_ratio > 0.62 else "warning"
                self.finding(
                    severity,
                    "EQUIPMENT_CHAIN_EXCESSIVE_INTERSECTION",
                    chain_id,
                    "Deux pièces modulaires se recouvrent excessivement.",
                    category="equipment",
                    measurements={
                        "intersectionPx": intersection,
                        "smallerPieceOverlapRatio": round(overlap_ratio, 6),
                    },
                    threshold={"warningAbove": 0.42, "errorAbove": 0.62},
                )

    def audit_module_collisions(self) -> None:
        armor_slots = {
            asset_id: (
                "chest"
                if asset_id.startswith("chest-")
                else "shoulder"
                if asset_id.startswith("shoulder-")
                else asset_id
            )
            for asset_id in self.manifest["hunter"]["armor"]
        }
        collision_groups: tuple[
            tuple[str, dict[str, str], float, float],
            ...,
        ] = (
            ("armor", armor_slots, 0.34, 0.58),
            (
                "gear",
                {
                    asset_id: asset_id
                    for asset_id in self.manifest["hunter"]["gear"]
                },
                0.28,
                0.55,
            ),
        )
        for category, slots, warning_threshold, error_threshold in collision_groups:
            assets = {
                asset_id: self.load_asset(category, asset_id, descriptor)
                for asset_id, descriptor in self.manifest["hunter"][category].items()
            }
            ids = tuple(assets)
            for left_index, left_id in enumerate(ids):
                for right_id in ids[left_index + 1 :]:
                    if slots[left_id] == slots[right_id]:
                        continue
                    left = assets[left_id]
                    right = assets[right_id]
                    left_mask = left.mask
                    right_mask = right.mask
                    if category == "gear":
                        # Runtime belt slots are registered at the same master
                        # anchor, then hung on two distinct hooks.
                        left_mask = translated_mask(left.mask, -24, 5)
                        right_mask = translated_mask(right.mask, 24, 7)
                    intersection = intersection_area(left_mask, right_mask)
                    overlap_ratio = intersection / min(left.area, right.area)
                    pair_id = f"{category}/{left_id}+{right_id}"
                    self.metrics["moduleCollisions"][pair_id] = {
                        "leftSlot": slots[left_id],
                        "rightSlot": slots[right_id],
                        "intersectionPx": intersection,
                        "smallerModuleOverlapRatio": round(overlap_ratio, 6),
                    }
                    if overlap_ratio <= warning_threshold:
                        continue
                    severity = (
                        "error"
                        if overlap_ratio > error_threshold
                        else "warning"
                    )
                    self.finding(
                        severity,
                        "COEQUIPPED_MODULE_COLLISION",
                        pair_id,
                        "Deux modules de slots différents se recouvrent excessivement au bind pose.",
                        category=category,
                        measurements={
                            "leftSlot": slots[left_id],
                            "rightSlot": slots[right_id],
                            "intersectionPx": intersection,
                            "smallerModuleOverlapRatio": round(
                                overlap_ratio,
                                6,
                            ),
                        },
                        threshold={
                            "warningAbove": warning_threshold,
                            "errorAbove": error_threshold,
                        },
                    )

    def audit_cross_body_part_scale(self) -> None:
        for part_id in PART_ORDER:
            ratios = {
                body_id: self.metrics["bodies"][body_id]["parts"][part_id][
                    "bodyAreaRatio"
                ]
                for body_id in self.metrics["bodies"]
            }
            minimum_body = min(ratios, key=ratios.get)
            maximum_body = max(ratios, key=ratios.get)
            minimum = ratios[minimum_body]
            maximum = ratios[maximum_body]
            factor = math.inf if minimum == 0 else maximum / minimum
            if factor > 1.75:
                severity = "error" if factor > 2.35 else "warning"
                self.finding(
                    severity,
                    "BODY_PART_CROSS_MORPH_SCALE_VARIANCE",
                    part_id,
                    "La proportion de cette pièce varie fortement entre morphologies.",
                    category="body-parts",
                    measurements={
                        "minimumBody": minimum_body,
                        "minimumBodyAreaRatio": minimum,
                        "maximumBody": maximum_body,
                        "maximumBodyAreaRatio": maximum,
                        "factor": round(factor, 6),
                    },
                    threshold={"warningFactorAbove": 1.75, "errorFactorAbove": 2.35},
                )

    def run(self) -> None:
        for body_id, body in self.manifest["hunter"]["bodies"].items():
            self.audit_descriptor("bodies", body_id, body["full"])
            for part_id, descriptor in body["parts"].items():
                self.audit_descriptor(
                    "body-parts",
                    f"{body_id}:{part_id}",
                    descriptor,
                )
            for part_id, descriptor in body["net"]["parts"].items():
                self.audit_descriptor(
                    "net-parts",
                    f"{body_id}:{part_id}",
                    descriptor,
                )
            self.audit_body(body_id)
            self.audit_descriptor("net-full", body_id, body["net"]["full"])
            self.audit_net(body_id)

        for category in (
            "masks",
            "equipment",
            "armor",
            "dreads",
            "weapons",
            "gear",
            "trophies",
        ):
            for asset_id, descriptor in self.manifest["hunter"][category].items():
                self.audit_descriptor(category, asset_id, descriptor)

        self.audit_cross_body_part_scale()
        self.audit_module_fit()
        self.audit_module_collisions()
        self.audit_equipment_chain()

    def report(self) -> dict[str, Any]:
        severity_counts = Counter(
            finding["severity"] for finding in self.findings
        )
        code_counts = Counter(finding["code"] for finding in self.findings)
        errors = severity_counts["error"]
        warnings = severity_counts["warning"]
        return {
            "schemaVersion": 1,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "manifest": MANIFEST_PATH.relative_to(ROOT).as_posix(),
            "manifestVersion": self.manifest["version"],
            "status": "failed" if errors else "passed",
            "summary": {
                "errors": errors,
                "warnings": warnings,
                "findings": len(self.findings),
                "findingsByCode": dict(sorted(code_counts.items())),
                "auditedBodies": len(self.manifest["hunter"]["bodies"]),
                "auditedModules": sum(
                    len(self.manifest["hunter"][category])
                    for category in (
                        "masks",
                        "equipment",
                        "armor",
                        "dreads",
                        "weapons",
                        "gear",
                        "trophies",
                    )
                ),
            },
            "thresholds": {
                "alphaThreshold": ALPHA_THRESHOLD,
                "bodyPartCoverageMinimum": 0.995,
                "bodyPartOverdrawWarningAbove": 1.35,
                "bodyPartOverdrawErrorAbove": 1.50,
                "bodyPartPivotWarningAbovePx": 8,
                "bodyPartPivotErrorAbovePx": 14,
                "jointGapWarningAbovePx": 2,
                "jointGapErrorAbovePx": 5,
                "moduleFit": MODULE_THRESHOLDS,
                "crossBodyOverlapSpreadWarningAbove": 0.16,
                "crossBodyOverlapSpreadErrorAbove": 0.28,
                "coequippedModuleCollision": {
                    "armorWarningAbove": 0.34,
                    "armorErrorAbove": 0.58,
                    "gearWarningAbove": 0.28,
                    "gearErrorAbove": 0.55,
                },
            },
            "metrics": self.metrics,
            "findings": sorted(
                self.findings,
                key=lambda finding: (
                    0 if finding["severity"] == "error" else 1,
                    finding["code"],
                    finding.get("bodyId", ""),
                    finding["subject"],
                ),
            ),
        }


def binary_alpha(image: Image.Image) -> Image.Image:
    return image.getchannel("A").point(
        lambda alpha: 255 if alpha >= ALPHA_THRESHOLD else 0,
        mode="L",
    )


def translated_mask(mask: Image.Image, x: int, y: int) -> Image.Image:
    translated = Image.new("L", mask.size)
    translated.paste(mask, (x, y))
    return translated


def mask_area(mask: Image.Image) -> int:
    return mask.histogram()[255]


def intersection_area(left: Image.Image, right: Image.Image) -> int:
    return mask_area(ImageChops.multiply(left, right))


def point_tuple(point: dict[str, Any]) -> tuple[int, int]:
    return int(point["x"]), int(point["y"])


def rect_to_bounds(rect: dict[str, Any]) -> tuple[int, int, int, int]:
    return (
        int(rect["x"]),
        int(rect["y"]),
        int(rect["x"] + rect["width"]),
        int(rect["y"] + rect["height"]),
    )


def bounds_width(bounds: tuple[int, int, int, int]) -> int:
    return max(1, bounds[2] - bounds[0])


def bounds_height(bounds: tuple[int, int, int, int]) -> int:
    return max(1, bounds[3] - bounds[1])


def point_to_mask_distance(
    mask: Image.Image,
    point: tuple[int, int],
    maximum: int,
) -> int:
    x, y = point
    if 0 <= x < mask.width and 0 <= y < mask.height and mask.getpixel((x, y)):
        return 0
    for radius in range(1, maximum + 1):
        crop = mask.crop(
            (
                max(0, x - radius),
                max(0, y - radius),
                min(mask.width, x + radius + 1),
                min(mask.height, y + radius + 1),
            )
        )
        if crop.getbbox() is not None:
            return radius
    return maximum + 1


def mask_distance(left: Image.Image, right: Image.Image, maximum: int) -> int:
    if ImageChops.multiply(left, right).getbbox() is not None:
        return 0
    low = 1
    high = maximum
    if (
        ImageChops.multiply(
            left.filter(ImageFilter.MaxFilter(high * 2 + 1)),
            right,
        ).getbbox()
        is None
    ):
        return maximum + 1
    while low < high:
        middle = (low + high) // 2
        if (
            ImageChops.multiply(
                left.filter(ImageFilter.MaxFilter(middle * 2 + 1)),
                right,
            ).getbbox()
            is not None
        ):
            high = middle
        else:
            low = middle + 1
    return low


def connected_component_areas(mask: Image.Image) -> list[int]:
    width, height = mask.size
    pixels = bytearray(mask.tobytes())
    components: list[int] = []
    for start in range(width * height):
        if pixels[start] == 0:
            continue
        pixels[start] = 0
        stack = [start]
        area = 0
        while stack:
            index = stack.pop()
            area += 1
            x = index % width
            y = index // width
            for neighbour_y in range(max(0, y - 1), min(height, y + 2)):
                row_start = neighbour_y * width
                for neighbour_x in range(max(0, x - 1), min(width, x + 2)):
                    neighbour = row_start + neighbour_x
                    if pixels[neighbour]:
                        pixels[neighbour] = 0
                        stack.append(neighbour)
        components.append(area)
    return sorted(components, reverse=True)


def tint_from_mask(
    mask: Image.Image,
    color: tuple[int, int, int, int],
) -> Image.Image:
    tinted = Image.new("RGBA", mask.size, color)
    tinted.putalpha(ImageChops.multiply(mask, Image.new("L", mask.size, color[3])))
    return tinted


def draw_cross(
    draw: ImageDraw.ImageDraw,
    point: tuple[int, int],
    color: tuple[int, int, int, int],
    radius: int = 4,
) -> None:
    x, y = point
    draw.line((x - radius, y, x + radius, y), fill=color, width=1)
    draw.line((x, y - radius, x, y + radius), fill=color, width=1)
    draw.rectangle((x - 1, y - 1, x + 1, y + 1), outline=color)


def fit_thumbnail(
    source: Image.Image,
    size: tuple[int, int],
) -> Image.Image:
    thumbnail = source.copy()
    thumbnail.thumbnail(size, Image.Resampling.NEAREST)
    output = Image.new("RGBA", size, (12, 17, 18, 255))
    output.alpha_composite(
        thumbnail,
        dest=(
            (size[0] - thumbnail.width) // 2,
            (size[1] - thumbnail.height) // 2,
        ),
    )
    return output


def render_body_sheet(audit: Audit, output_path: Path) -> None:
    body_ids = tuple(audit.manifest["hunter"]["bodies"])
    panel_width = 256
    panel_height = 384
    label_height = 22
    columns = 3
    sheet = Image.new(
        "RGBA",
        (columns * panel_width, len(body_ids) * (panel_height + label_height)),
        (8, 12, 13, 255),
    )
    font = ImageFont.load_default()
    draw = ImageDraw.Draw(sheet)

    for row, body_id in enumerate(body_ids):
        top = row * (panel_height + label_height)
        body = audit.body_asset(body_id)
        sheet.alpha_composite(body.image, dest=(0, top + label_height))
        draw.text((6, top + 5), f"{body_id} / full", fill=(230, 235, 220), font=font)

        colored = Image.new("RGBA", (panel_width, panel_height))
        joints = Image.new("RGBA", (panel_width, panel_height))
        joints.alpha_composite(body.image.copy().convert("RGBA"))
        dim = Image.new("RGBA", joints.size, (5, 10, 10, 130))
        joints.alpha_composite(dim)
        for part_id in PART_ORDER:
            part = audit.body_part(body_id, part_id)
            colored.alpha_composite(tint_from_mask(part.mask, PART_COLORS[part_id]))
            joints.alpha_composite(
                tint_from_mask(part.mask, (*PART_COLORS[part_id][:3], 85))
            )
            draw_cross(
                ImageDraw.Draw(joints),
                point_tuple(part.descriptor["pivotMaster"]),
                (255, 70, 70, 255),
            )
        sheet.alpha_composite(colored, dest=(panel_width, top + label_height))
        sheet.alpha_composite(joints, dest=(panel_width * 2, top + label_height))
        draw.text(
            (panel_width + 6, top + 5),
            f"{body_id} / pieces",
            fill=(230, 235, 220),
            font=font,
        )
        draw.text(
            (panel_width * 2 + 6, top + 5),
            f"{body_id} / pivots",
            fill=(230, 235, 220),
            font=font,
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output_path, "PNG", optimize=True)


def render_module_sheet(audit: Audit, output_path: Path) -> None:
    module_refs: list[tuple[str, str, dict[str, Any]]] = []
    for category in (
        "masks",
        "dreads",
        "armor",
        "equipment",
        "weapons",
        "gear",
        "trophies",
    ):
        for asset_id, descriptor in audit.manifest["hunter"][category].items():
            module_refs.append((category, asset_id, descriptor))

    body_ids = tuple(audit.manifest["hunter"]["bodies"])
    cell_width = 96
    cell_height = 154
    label_height = 31
    sheet = Image.new(
        "RGBA",
        (
            len(module_refs) * cell_width,
            len(body_ids) * (cell_height + label_height),
        ),
        (8, 12, 13, 255),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for column, (category, asset_id, descriptor) in enumerate(module_refs):
        x = column * cell_width
        draw.text(
            (x + 3, 3),
            f"{category[:4]}\n{asset_id[:14]}",
            fill=(220, 225, 210),
            font=font,
            spacing=1,
        )
        module = audit.load_asset(category, asset_id, descriptor)
        for row, body_id in enumerate(body_ids):
            y = row * (cell_height + label_height) + label_height
            composite = audit.body_asset(body_id).image.copy()
            darkness = Image.new("RGBA", composite.size, (0, 0, 0, 115))
            composite.alpha_composite(darkness)
            highlighted = module.image.copy()
            composite.alpha_composite(highlighted)
            pivot_draw = ImageDraw.Draw(composite)
            draw_cross(
                pivot_draw,
                point_tuple(descriptor["pivotMaster"]),
                (255, 55, 55, 255),
                radius=5,
            )
            thumb = fit_thumbnail(composite, (cell_width, cell_height))
            sheet.alpha_composite(thumb, dest=(x, y))
            if column == 0:
                draw.text(
                    (x + 3, y + 3),
                    body_id,
                    fill=(255, 255, 255),
                    font=font,
                )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output_path, "PNG", optimize=True)


def render_module_category_sheet(
    audit: Audit,
    category: str,
    output_path: Path,
) -> None:
    descriptors = audit.manifest["hunter"][category]
    body_ids = tuple(audit.manifest["hunter"]["bodies"])
    cell_width = 128
    cell_height = 192
    header_height = 32
    sheet = Image.new(
        "RGBA",
        (
            len(descriptors) * cell_width,
            header_height + len(body_ids) * cell_height,
        ),
        (8, 12, 13, 255),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    target_resolver = MODULE_TARGETS[category]

    for column, (asset_id, descriptor) in enumerate(descriptors.items()):
        x = column * cell_width
        draw.text(
            (x + 3, 4),
            f"{category}/{asset_id}"[:21],
            fill=(225, 230, 215),
            font=font,
        )
        module = audit.load_asset(category, asset_id, descriptor)
        target_id = target_resolver(asset_id)
        for row, body_id in enumerate(body_ids):
            y = header_height + row * cell_height
            body = audit.body_asset(body_id)
            composite = body.image.copy()
            composite.alpha_composite(
                Image.new("RGBA", composite.size, (0, 0, 0, 115))
            )
            if target_id is not None:
                target = audit.body_part(body_id, target_id)
                composite.alpha_composite(
                    tint_from_mask(target.mask, (45, 150, 245, 95))
                )
            composite.alpha_composite(module.image)
            draw_cross(
                ImageDraw.Draw(composite),
                point_tuple(descriptor["pivotMaster"]),
                (255, 45, 45, 255),
                radius=5,
            )
            sheet.alpha_composite(
                fit_thumbnail(composite, (cell_width, cell_height)),
                dest=(x, y),
            )
            if column == 0:
                draw.text(
                    (x + 3, y + 3),
                    body_id,
                    fill=(255, 255, 255),
                    font=font,
                )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output_path, "PNG", optimize=True)


def markdown_summary(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Audit géométrique V3",
        "",
        f"- Statut strict : **{report['status'].upper()}**",
        f"- Erreurs : **{summary['errors']}**",
        f"- Avertissements : **{summary['warnings']}**",
        f"- Corps audités : {summary['auditedBodies']}",
        f"- Modules audités : {summary['auditedModules']}",
        "",
        "## Défauts prioritaires",
        "",
    ]
    priority = report["findings"][:60]
    if not priority:
        lines.append("Aucun défaut aux seuils configurés.")
    for finding in priority:
        body = f" [{finding['bodyId']}]" if finding.get("bodyId") else ""
        measurements = finding.get("measurements", {})
        compact = ", ".join(
            f"{key}={value}"
            for key, value in list(measurements.items())[:4]
        )
        suffix = f" — {compact}" if compact else ""
        lines.append(
            f"- **{finding['severity'].upper()}** `{finding['code']}`"
            f"{body} `{finding['subject']}` : {finding['message']}{suffix}"
        )
    lines.extend(
        [
            "",
            "Le JSON associé contient toutes les mesures, tous les seuils et "
            "la matrice complète par corps et par module.",
            "",
        ]
    )
    return "\n".join(lines)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Répertoire du rapport et des planches (défaut: outputs/qa).",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Ne pas générer les planches de contact.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Sortir avec le code 1 tant qu’une erreur géométrique subsiste.",
    )
    parser.add_argument(
        "--stdout-json",
        action="store_true",
        help="Imprimer le rapport JSON complet sur stdout.",
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    audit = Audit(manifest)
    audit.run()
    report = audit.report()

    output_dir = arguments.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "rig-placement-report.json"
    summary_path = output_dir / "rig-placement-summary.md"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    summary_path.write_text(markdown_summary(report), encoding="utf-8")

    if not arguments.no_images:
        render_body_sheet(audit, output_dir / "rig-body-parts-contact.png")
        render_module_sheet(audit, output_dir / "rig-module-fit-contact.png")
        for category in MODULE_TARGETS:
            render_module_category_sheet(
                audit,
                category,
                output_dir / f"rig-{category}-fit-contact.png",
            )

    if arguments.stdout_json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print(
            "V3 placement audit "
            f"{report['status'].upper()}: "
            f"{report['summary']['errors']} errors, "
            f"{report['summary']['warnings']} warnings. "
            f"Report: {report_path.relative_to(ROOT)}"
        )
    if arguments.strict and report["status"] == "failed":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
