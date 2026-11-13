#!/usr/bin/env python3
"""Independently verify neutral C PNGs; read images, write JSON reports only.

Requires Python 3 and Pillow. No Sharp/Node conversion code is imported. Every
decoded RGBA pixel is checked, including RGB values under completely clear alpha.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import PIL
from PIL import Image


METHOD_ID = "srgb8-rec709-luma-v1"
FORMULA = "Y=floor((2126*R+7152*G+722*B+5000)/10000); C=(Y,Y,Y,A_source)"
DEFAULT_SOURCES = (
    "public/game/biomasks-dual-20261113/manifest.json",
    "public/game/biomasks-expansion-20261113/manifest.json",
)
DEFAULT_INVENTORY = "production/biomasks-neutral-20261113/inputs/neutral-inventory.json"
BASE_INVENTORY_SHA256 = "4137f30a8a022ebd7022f2aa7d015de793f98ae8ea7bd61db4b87039c29c140b"
APPROVAL_FLAGS = {"canonCertified", "canonicalCertified", "humanArtValidated", "runtimeIntegrated"}
SPECIAL_STATUSES = {
    "predator_17": ("provisional-review-only", "hold-pending-design-review"),
    "mk-30-emissary": ("partial-face-shell-source-view", "partial-study-only"),
    "neca-nightstorm-series-10": ("partial-visible-rigid-mask", "partial-study-only"),
    "mask-feral-screen-original": ("hybrid-project-study", "not-a-portable-mask-asset"),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_read(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return data


def repository_path(root: Path, relative: str) -> Path:
    """Asset metadata must name actual repository-relative files."""
    if not isinstance(relative, str) or not relative:
        raise ValueError("Missing repository-relative path")
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Non-repository asset path: {relative}")
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"Asset path leaves repository: {relative}")
    return resolved


def input_path(root: Path, value: str) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else repository_path(root, value)


def pin(path: Path, display_path: str | None = None) -> dict[str, Any]:
    raw = path.read_bytes()
    return {"path": display_path or str(path), "sha256": digest(raw), "bytes": len(raw)}


def native_png_size(header: bytes) -> tuple[int, int]:
    """Require the actual PNG representation, independently of Pillow's mode."""
    if len(header) < 33 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[8:16] != b"\x00\x00\x00\rIHDR":
        raise ValueError("Expected a native PNG IHDR header")
    # Pillow's mode alone does not establish native bit depth: a16-bit PNG may
    # otherwise be reduced silently by its decoder before our comparison.
    if header[24] != 8 or header[25] != 6:
        raise ValueError("Expected native8-bit RGBA PNG (IHDR depth8/type6)")
    return (int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big"))


def rgba_read(path: Path) -> tuple[bytes, tuple[int, int]]:
    """Decode existing RGBA pixels. No conversion, image mutation or save call."""
    with path.open("rb") as stream:
        native_size = native_png_size(stream.read(33))
    with Image.open(path) as image:
        if image.format != "PNG" or image.mode != "RGBA":
            raise ValueError(f"Expected a native RGBA PNG, got {image.format}/{image.mode}: {path}")
        if getattr(image, "n_frames", 1) != 1 or getattr(image, "is_animated", False):
            raise ValueError(f"Expected a single static PNG frame: {path}")
        if image.size != native_size:
            raise ValueError(f"Decoded dimensions differ from native PNG IHDR: {path}")
        image.load()
        return image.tobytes(), image.size


def mismatch_count(left: bytes, right: bytes) -> int:
    return sum(a != b for a, b in zip(left, right))


def verify_rgba_pixels(source: bytes, output: bytes, size: tuple[int, int]) -> dict[str, Any]:
    """Pure byte-buffer analysis; independent integer arithmetic for every pixel."""
    width, height = size
    expected_length = width * height * 4
    if width <= 0 or height <= 0 or len(source) != expected_length or len(output) != expected_length:
        raise ValueError("RGBA byte lengths do not match the declared dimensions")

    sr, sg, sb, sa = (source[offset::4] for offset in range(4))
    cr, cg, cb, ca = (output[offset::4] for offset in range(4))
    expected = bytes((2126 * r + 7152 * g + 722 * b + 5000) // 10000 for r, g, b in zip(sr, sg, sb))
    alpha_equal = sa == ca
    strict_monochrome = cr == cg == cb
    matches = [cr == expected, cg == expected, cb == expected]
    formula_equal = all(matches)
    all_pixels_pass = alpha_equal and strict_monochrome and formula_equal

    # Fast byte equality is sufficient in the passing case. Count individual
    # mismatches only on failures so a full66-image audit remains inexpensive.
    errors_by_channel = {
        name: 0 if match else mismatch_count(channel, expected)
        for name, channel, match in zip(("R", "G", "B"), (cr, cg, cb), matches)
    }
    alpha_mismatches = 0 if alpha_equal else mismatch_count(sa, ca)
    bad_formula_pixels = 0
    bad_monochrome_pixels = 0
    coverage_lost = 0
    coverage_gained = 0
    first_mismatches = []
    max_rgb_error = 0
    if not all_pixels_pass:
        for index, (wanted, r, g, b, source_alpha, result_alpha) in enumerate(zip(expected, cr, cg, cb, sa, ca)):
            bad_formula = (r, g, b) != (wanted, wanted, wanted)
            bad_monochrome = r != g or g != b
            bad_alpha = source_alpha != result_alpha
            bad_formula_pixels += bad_formula
            bad_monochrome_pixels += bad_monochrome
            coverage_lost += source_alpha > 0 and result_alpha == 0
            coverage_gained += source_alpha == 0 and result_alpha > 0
            max_rgb_error = max(max_rgb_error, abs(r - wanted), abs(g - wanted), abs(b - wanted))
            if (bad_formula or bad_alpha) and len(first_mismatches) < 8:
                first_mismatches.append({
                    "x": index % width,
                    "y": index // width,
                    "sourceRGBA": [sr[index], sg[index], sb[index], source_alpha],
                    "expectedRGBA": [wanted, wanted, wanted, source_alpha],
                    "actualRGBA": [r, g, b, result_alpha],
                })

    source_nonzero = len(sa) - sa.count(0)
    output_nonzero = len(ca) - ca.count(0)
    return {
        "passed": all_pixels_pass,
        "pixelsCompared": width * height,
        "comparedTransparentRgb": True,
        "formulaMatchesEveryPixel": formula_equal,
        "formulaMismatchPixels": bad_formula_pixels,
        "formulaMismatchChannels": errors_by_channel,
        "maximumRgbAbsoluteError": max_rgb_error,
        "strictMonochromeEveryPixel": strict_monochrome,
        "nonMonochromePixels": bad_monochrome_pixels,
        "alphaByteIdentical": alpha_equal,
        "alphaMismatchPixels": alpha_mismatches,
        "sourceAlphaSha256": digest(sa),
        "outputAlphaSha256": digest(ca),
        "sourceNonzeroAlphaPixels": source_nonzero,
        "outputNonzeroAlphaPixels": output_nonzero,
        "geometryCoverageIdentical": alpha_equal,
        "geometryPixelsLost": coverage_lost,
        "geometryPixelsGained": coverage_gained,
        "sourceWasStrictlyAchromatic": sr == sg == sb,
        "outputGrayRange": [min(cr), max(cr)],
        "firstMismatches": first_mismatches,
    }


def unique_index(records: Any, label: str) -> dict[str, dict[str, Any]]:
    if not isinstance(records, list):
        raise ValueError(f"{label} must be an array")
    indexed = {}
    for item in records:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            raise ValueError(f"{label} contains a record without a string id")
        identity = item["id"]
        if identity in indexed:
            raise ValueError(f"Duplicate id in {label}: {identity}")
        indexed[identity] = item
    return indexed


def source_status_approval_errors(value: Any, prefix: str = "sourceStatus") -> list[str]:
    """Technical grayscale authorization never grants artistic/canonical approval."""
    errors = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}"
            if key in APPROVAL_FLAGS and child is not False:
                errors.append(f"{path} must remain false")
            errors.extend(source_status_approval_errors(child, path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            errors.extend(source_status_approval_errors(child, f"{prefix}[{index}]"))
    return errors


def verify_manifest(root: Path, manifest_path: Path, inventory_path: Path, source_manifests: list[str], accepted_new_path: Path | None = None, record_ids: set[str] | None = None) -> dict[str, Any]:
    manifest = json_read(manifest_path)
    inventory = json_read(inventory_path)
    records = unique_index(manifest.get("pairs"), "neutral manifest pairs")
    inventory_index = unique_index(inventory.get("entries"), "inventory entries")
    baseline = {}
    source_manifest_pins = []
    issues = []
    file_cache = {}

    def require(condition: bool, message: str, errors: list[str]) -> None:
        if not condition:
            errors.append(message)

    def asset_pin(metadata: dict[str, Any], errors: list[str], role: str) -> dict[str, Any]:
        relative = metadata.get("path")
        path = repository_path(root, relative)
        if relative not in file_cache:
            file_cache[relative] = pin(path, relative)
        actual = dict(file_cache[relative])
        require(actual["sha256"] == metadata.get("sha256"), f"{role} SHA256 does not match its recorded source pin", errors)
        if "bytes" in metadata:
            require(actual["bytes"] == metadata["bytes"], f"{role} byte length does not match metadata", errors)
        return actual

    inventory_manifest_pins = {p["path"]: p for p in inventory.get("sourceManifests", [])}
    historical_inventory_pin = pin(repository_path(root, DEFAULT_INVENTORY), DEFAULT_INVENTORY)
    require(historical_inventory_pin["sha256"] == BASE_INVENTORY_SHA256, "Historical66 inventory differs from the independently pinned immutable snapshot", issues)
    if accepted_new_path is None:
        require(pin(inventory_path)["sha256"] == BASE_INVENTORY_SHA256, "A66-only run must use the exact independently pinned historical inventory", issues)
    for relative in source_manifests:
        actual = pin(repository_path(root, relative), relative)
        source_manifest_pins.append(actual)
        require(relative in inventory_manifest_pins, f"Inventory omits source manifest pin: {relative}", issues)
        if relative in inventory_manifest_pins:
            require(actual["sha256"] == inventory_manifest_pins[relative].get("sha256"), f"Source manifest changed from inventory: {relative}", issues)
        data = json_read(repository_path(root, relative))
        source_pairs = unique_index(data.get("pairs"), relative)
        for identity, source_pair in source_pairs.items():
            if identity in baseline:
                raise ValueError(f"Representation id is ambiguous between source packs: {identity}")
            baseline[identity] = {"pair": source_pair, "manifestPath": relative}

    require(len(baseline) == 66, "This audited batch requires exactly66 distinct source representations", issues)
    historical_ids = set(baseline)
    accepted_new_pin = None
    approved_extra_ids: set[str] = set()
    if accepted_new_path is not None:
        accepted_new_pin = pin(accepted_new_path, str(accepted_new_path.relative_to(root)))
        accepted = json_read(accepted_new_path)
        new_b = unique_index(accepted.get("entries"), "accepted new B entries")
        new_a = unique_index(accepted.get("originalGenerations"), "accepted new A entries")
        require(set(new_a) == set(new_b), "New-mask acceptance must contain complete matching A/B pairs", issues)
        approved_extra_ids = set(new_a) & set(new_b)
        require(len(approved_extra_ids) <= 3, "Only the up-to-three explicitly root-accepted new pairs may extend the historical66", issues)
        require(not historical_ids & approved_extra_ids, "Accepted new masks must not overwrite historical representation ids", issues)
        base_inventory_path = repository_path(root, DEFAULT_INVENTORY)
        base_inventory = json_read(base_inventory_path)
        base_pin = pin(base_inventory_path, DEFAULT_INVENTORY)
        base_pointer = inventory.get("baseInventory") or {}
        require(base_pointer.get("path") == DEFAULT_INVENTORY and base_pointer.get("sha256") == base_pin["sha256"], "Combined inventory must pin the unchanged historical66 inventory", issues)
        base_index = unique_index(base_inventory.get("entries"), "base inventory entries")
        require(set(base_index) == historical_ids, "Base inventory must retain exactly the historical66", issues)
        for identity in historical_ids:
            require(inventory_index.get(identity) == base_index.get(identity), f"Historical inventory entry changed in combined inventory: {identity}", issues)
        accepted_pointer = inventory.get("acceptedNewMasks")
        if isinstance(accepted_pointer, dict) and "path" in accepted_pointer:
            require(accepted_pointer.get("path") == accepted_new_pin["path"] and accepted_pointer.get("sha256") == accepted_new_pin["sha256"], "Combined inventory acceptance-file pointer does not match explicit CLI acceptance pin", issues)
        for identity in approved_extra_ids:
            a, b = new_a[identity], new_b[identity]
            require(a.get("version") == "A" and b.get("version") == "B", f"Accepted new pair lacks explicit A/B version: {identity}", issues)
            require(b.get("sourceAPath") == a.get("assetPath") and b.get("sourceASha256") == a.get("sha256"), f"Accepted new B does not point to its accepted A: {identity}", issues)
            for version, record in (("A", a), ("B", b)):
                # Acceptance is explicit and pinned; the generation receipt must
                # agree too. This proves recorded provenance, not artistic canon.
                receipt = json_read(repository_path(root, record["generationReceipt"]))
                matches = [entry for entry in receipt.get("entries", []) if entry.get("id") == identity and entry.get("version") == version]
                require(len(matches) == 1 and matches[0].get("assetPath") == record.get("assetPath") and matches[0].get("sha256") == record.get("sha256"), f"Accepted {version} differs from generation receipt: {identity}", issues)
            baseline[identity] = {
                "manifestPath": accepted_new_pin["path"],
                "pair": {
                    "id": identity,
                    "versionA": {"path": a["assetPath"], "sha256": a["sha256"]},
                    "versionB": {"path": b["assetPath"], "sha256": b["sha256"]},
                    "referenceSources": a.get("referenceSources", []),
                    "referenceSourcePath": a.get("referenceSourcePath"),
                    "referenceSourceSha256": a.get("referenceSourceSha256"),
                    "partialReferenceView": bool(b.get("partialReferenceView")),
                    "hybridStudy": bool(b.get("hybridStudy")),
                    "provisionalReviewOnly": bool(b.get("provisionalReviewOnly")),
                },
            }
    require(set(records) == set(baseline), "Neutral ids must exactly cover historical representations plus explicitly accepted extras (no missing, merged or unapproved editions)", issues)
    require(set(inventory_index) == set(baseline), "Inventory ids do not match the approved source representation union", issues)
    for flag in ("canonCertified", "humanArtValidated", "runtimeIntegrated"):
        require(manifest.get(flag) is False, f"Neutral manifest must retain {flag}=false", issues)

    selected_ids = set(records) if record_ids is None else set(record_ids)
    if not selected_ids or not selected_ids.issubset(records):
        raise ValueError("An explicit record subset must be nonempty and contain only manifest ids")
    entries = []
    for identity, pair in records.items():
        if identity not in selected_ids:
            continue
        errors: list[str] = []
        item: dict[str, Any] = {"id": identity, "passed": False, "errors": errors}
        entries.append(item)
        try:
            if identity not in baseline or identity not in inventory_index:
                raise ValueError("No unambiguous source representation and inventory record for this id")
            original = baseline[identity]["pair"]
            inventoried = inventory_index[identity]
            source = pair["versionB"]
            output = pair["versionC"]
            if not isinstance(source, dict) or not isinstance(output, dict):
                raise ValueError("versionB and versionC must be metadata objects")
            expected_source = original["versionB"]
            require(source.get("path") == expected_source.get("path"), "B path differs from the original representation", errors)
            require(source.get("sha256") == expected_source.get("sha256"), "B pin differs from the original representation", errors)
            require(source.get("path") == inventoried["sourceB"]["path"] and source.get("sha256") == inventoried["sourceB"]["sha256"], "B lineage differs from the pinned neutral inventory", errors)
            source_actual = asset_pin(source, errors, "B")
            output_actual = asset_pin(output, errors, "C")
            require(source_actual["sha256"] == expected_source["sha256"], "Original B bytes changed", errors)
            require(source.get("path") != output.get("path"), "C must never replace B at its original path", errors)
            require(str(output.get("path", "")).startswith("public/game/biomasks-neutral-20261113/"), "C path is outside the new neutral pack", errors)
            require(output.get("sourceBPath") == source.get("path") and output.get("sourceBSha256") == source_actual["sha256"], "C sourceBPath/sourceBSha256 provenance is incorrect", errors)
            require(output.get("methodId") == METHOD_ID, "C methodId is not the agreed encodedRGB integer method", errors)
            for flag, wanted in (("alphaByteIdentical", True), ("strictMonochrome", True), ("newImageGeneration", False)):
                require(output.get(flag) is wanted, f"C must declare {flag}={str(wanted).lower()}", errors)
            for flag in ("canonCertified", "humanArtValidated", "runtimeIntegrated"):
                require(pair.get(flag) is False, f"Representation must retain {flag}=false", errors)
                require(output.get(flag) is False, f"C must retain {flag}=false", errors)

            require(pair.get("sourceStatus") == inventoried.get("sourceStatus"), "sourceStatus is not exactly preserved from the inventory", errors)
            source_status = pair.get("sourceStatus") or {}
            for flag in ("canonicalCertified", "humanArtValidated", "runtimeIntegrated"):
                require(source_status.get(flag) is False, f"sourceStatus must retain {flag}=false", errors)
            errors.extend(source_status_approval_errors(source_status))
            require(source_status.get("partialReferenceView") == bool(original.get("partialReferenceView")), "Partial-reference flag changed from original source", errors)
            require(source_status.get("hybridStudy") == bool(original.get("hybridStudy")), "Hybrid-study flag changed from original source", errors)
            require(source_status.get("provisionalReviewOnly") == bool(original.get("provisionalReviewOnly")), "Provisional-review flag changed from original source", errors)
            if identity in SPECIAL_STATUSES:
                review, portable = SPECIAL_STATUSES[identity]
                require(source_status.get("reviewStatus") == review and source_status.get("portableMaskUse") == portable, "Protected provisional/partial/hybrid source qualification changed", errors)
            if identity == "mk-06-wolf":
                require(original["versionA"]["sha256"] == expected_source["sha256"], "Wolf original A=B glyph-preserving reuse provenance changed", errors)
                require(source_status.get("newBGeneration") is False, "Wolf must retain its existing B reuse status", errors)

            # A/R remain references, not conversion inputs. Pin them independently
            # so neutralization cannot conceal changes to the prior source chain.
            require(pair.get("versionA", {}).get("path") == inventoried["sourceA"]["path"] and pair.get("versionA", {}).get("sha256") == inventoried["sourceA"]["sha256"], "A provenance changed from the source inventory", errors)
            require(pair.get("versionA", {}).get("path") == original["versionA"].get("path") and pair.get("versionA", {}).get("sha256") == original["versionA"].get("sha256"), "A provenance differs from the authoritative original manifest or explicit new acceptance", errors)
            asset_pin(inventoried["sourceA"], errors, "A reference")
            authoritative_r = {(r.get("path"), r.get("sha256")) for r in original.get("referenceSources", [])}
            inventory_r = {(r.get("path"), r.get("sha256")) for r in inventoried.get("referenceSources", [])}
            if authoritative_r or identity in approved_extra_ids:
                require(inventory_r == authoritative_r, "R reference lineage differs from the authoritative source manifest or accepted new A", errors)
            if identity in approved_extra_ids and original.get("referenceSourcePath"):
                require((original["referenceSourcePath"], original.get("referenceSourceSha256")) in inventory_r, "Accepted new A primary reference is missing from its inventory R chain", errors)
            for reference in inventoried.get("referenceSources", []):
                asset_pin(reference, errors, "R reference")
            for reference in inventoried.get("publicReferenceImages", []):
                asset_pin(reference, errors, "Public R reference")

            source_rgba, source_size = rgba_read(repository_path(root, source["path"]))
            output_rgba, output_size = rgba_read(repository_path(root, output["path"]))
            require(source_size == output_size, "C dimensions differ from B", errors)
            for name, metadata, dimensions in (("B", source, source_size), ("C", output, output_size)):
                require(metadata.get("width") == dimensions[0] and metadata.get("height") == dimensions[1], f"{name} dimension metadata does not match native decoded PNG", errors)
            if source_size != output_size:
                raise ValueError("Pixel verification requires identical native dimensions")
            checks = verify_rgba_pixels(source_rgba, output_rgba, source_size)
            reused = checks["sourceWasStrictlyAchromatic"]
            require(output.get("renderMode") == ("source-reuse" if reused else "deterministic-grayscale"), "C renderMode does not match whether original B is already strictly achromatic", errors)
            for flag in ("derivedNew", "pixelEditingPerformed"):
                require(output.get(flag) is (not reused), f"C {flag} must reflect the decoded source's actual need for neutralization", errors)
            if reused:
                require(output_actual["sha256"] == source_actual["sha256"], "Already achromatic B must be reused byte-exactly for C", errors)
            source_sha_after_read = digest(repository_path(root, source["path"]).read_bytes())
            require(source_sha_after_read == source_actual["sha256"], "B file changed during independent verification", errors)
            checks["sourceBFileUnchangedDuringRead"] = source_sha_after_read == source_actual["sha256"]
            require(checks["passed"], "C pixels fail independent formula/monochrome/alpha verification", errors)
            require(output.get("sourceAlphaSha256") == checks["sourceAlphaSha256"], "C sourceAlphaSha256 metadata is incorrect", errors)
            require(output.get("outputAlphaSha256") == checks["outputAlphaSha256"], "C outputAlphaSha256 metadata is incorrect", errors)
            item.update(sourceManifestPath=baseline[identity]["manifestPath"], sourceB=source_actual, neutralC=output_actual, dimensions=list(source_size), sourceStatus=source_status, pixelChecks=checks)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            errors.append(f"Cannot complete verification: {exc}")
        item["passed"] = not errors

    passed = not issues and all(e["passed"] for e in entries)
    source_hashes = [e["sourceB"]["sha256"] for e in entries if "sourceB" in e]
    output_hashes = [e["neutralC"]["sha256"] for e in entries if "neutralC" in e]
    return {
        "schemaVersion": 1,
        "asOfUtc": datetime.now(timezone.utc).isoformat(),
        "verification": "independent-python-pillow-every-pixel",
        "partialVerifiedOnly": record_ids is not None,
        "fullProductionVerification": record_ids is None,
        "allChecksPassed": passed,
        "verifier": {"python": platform.python_version(), "pillow": PIL.__version__, "methodId": METHOD_ID, "formula": FORMULA, "colorSpace": "encoded8-bit sRGB values, no gamma linearization", "importsConverterImplementation": False, "writesImages": False},
        "manifest": pin(manifest_path),
        "sourceInventory": pin(inventory_path),
        "sourceManifests": source_manifest_pins,
        "acceptedNewMasks": accepted_new_pin,
        "counts": {
            "historicalRepresentations": len(historical_ids),
            "explicitlyAcceptedNewPairs": len(approved_extra_ids),
            "expectedRepresentations": len(baseline),
            "manifestRepresentations": len(records),
            "verifiedRepresentations": len(entries),
            "unverifiedRepresentations": len(records) - len(entries),
            "passedRepresentations": sum(e["passed"] for e in entries),
            "failedRepresentations": sum(not e["passed"] for e in entries),
            "pixelsCompared": sum(e.get("pixelChecks", {}).get("pixelsCompared", 0) for e in entries),
            "uniqueBHashes": len(set(source_hashes)),
            "uniqueCHashes": len(set(output_hashes)),
            "protectedSourcePinsRead": len(file_cache) - len(records),
            "specialStatusRepresentations": sum(identity in records for identity in SPECIAL_STATUSES),
        },
        "issues": issues,
        "entries": entries,
        "scopeLimits": ["Pixel and metadata verification only; it does not certify canonical design, original-game albedo, human artistic approval, runtime integration, animation, UVs or wearable geometry.", "All RGB samples including invisible RGB beneath alpha0 are checked; all decoded alpha bytes must be identical. Prior source PNG file hashes must match their original manifests and inventory.", "Only this JSON report may be written; the verifier neither generates, converts nor exports an image."],
        "imagesWritten": 0,
        "pixelsModifiedByVerifier": False,
        "canonCertified": False,
        "humanArtValidated": False,
        "runtimeIntegrated": False,
    }


def self_test() -> dict[str, Any]:
    # Hand-authored primaries, black, white and a mixed color exercise rounding,
    # low/zero alpha and strict validation without creating any image files.
    source = bytes([255, 0, 0, 0, 0, 255, 0, 1, 0, 0, 255, 128, 0, 0, 0, 255, 255, 255, 255, 7, 7, 11, 19, 254])
    expected = bytes([54, 54, 54, 0, 182, 182, 182, 1, 18, 18, 18, 128, 0, 0, 0, 255, 255, 255, 255, 7, 11, 11, 11, 254])
    checks = {"handAuthoredPrimaryAndRoundingFixture": verify_rgba_pixels(source, expected, (3, 2))["passed"]}
    wrong_hidden = bytearray(expected)
    wrong_hidden[0:3] = bytes([0, 0, 0])
    checks["detectsWrongRgbUnderAlphaZero"] = not verify_rgba_pixels(source, bytes(wrong_hidden), (3, 2))["passed"]
    wrong_alpha = bytearray(expected)
    wrong_alpha[3] = 1
    result = verify_rgba_pixels(source, bytes(wrong_alpha), (3, 2))
    checks["detectsChangedAlphaAndGainedGeometry"] = not result["passed"] and result["geometryPixelsGained"] == 1
    wrong_gray = bytearray(expected)
    wrong_gray[8] = 19
    result = verify_rgba_pixels(source, bytes(wrong_gray), (3, 2))
    checks["detectsNonMonochromeRgb"] = not result["passed"] and result["nonMonochromePixels"] == 1
    try:
        verify_rgba_pixels(source, expected, (4, 2))
        checks["rejectsDimensionByteLengthMismatch"] = False
    except ValueError:
        checks["rejectsDimensionByteLengthMismatch"] = True
    gray = bytes([0, 0, 0, 0, 8, 8, 8, 1, 255, 255, 255, 254])
    result = verify_rgba_pixels(gray, gray, (3, 1))
    checks["recognizesAlreadyAchromaticSourceReuse"] = result["passed"] and result["sourceWasStrictlyAchromatic"]
    checks["rejectsNestedApprovalFlags"] = bool(source_status_approval_errors({"review": {"humanArtValidated": True}}))
    checks["allowsAuthorizedPixelEditingWithoutApproval"] = not source_status_approval_errors({"pixelEditingPerformed": True, "canonicalCertified": False, "humanArtValidated": False, "runtimeIntegrated": False})
    header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + (3).to_bytes(4, "big") + (2).to_bytes(4, "big") + bytes([8, 6, 0, 0, 0]) + bytes(4)
    checks["recognizesNative8BitRgbaHeader"] = native_png_size(header) == (3, 2)
    wrong_depth = bytearray(header)
    wrong_depth[24] = 16
    try:
        native_png_size(bytes(wrong_depth))
        checks["rejectsNative16BitBeforeDecode"] = False
    except ValueError:
        checks["rejectsNative16BitBeforeDecode"] = True
    return {"selfTest": True, "passed": all(checks.values()), "checks": checks, "imageFilesWritten": 0}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--manifest", help="Neutral business manifest with pairs/versionB/versionC")
    parser.add_argument("--inventory", default=DEFAULT_INVENTORY)
    parser.add_argument("--source-manifest", action="append", default=None)
    parser.add_argument("--accepted-new-masks", help="Explicit pinned root acceptance of complete new A/B pairs; required to extend the historical66")
    parser.add_argument("--output", help="Write a JSON report only; no image output is supported")
    parser.add_argument("--self-test", action="store_true", help="Check small in-memory fixtures, not production assets")
    args = parser.parse_args()
    if args.self_test:
        result = self_test()
        print(json.dumps(result, ensure_ascii=False))
        return 0 if result["passed"] else 1
    if not args.manifest:
        parser.error("--manifest is required unless --self-test is used")
    try:
        root = Path(args.repo_root).resolve()
        manifest_path = input_path(root, args.manifest)
        inventory_path = input_path(root, args.inventory)
        accepted_new_path = input_path(root, args.accepted_new_masks) if args.accepted_new_masks else None
        report = verify_manifest(root, manifest_path, inventory_path, args.source_manifest or list(DEFAULT_SOURCES), accepted_new_path)
        rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            output = input_path(root, args.output)
            if output.suffix.lower() != ".json":
                raise ValueError("Only a .json report path is accepted; images are never written")
            protected = {manifest_path, inventory_path, *(repository_path(root, p) for p in (args.source_manifest or DEFAULT_SOURCES))}
            if accepted_new_path is not None:
                protected.add(accepted_new_path)
            if output in protected:
                raise ValueError("Report must not replace a manifest or source inventory")
            if output.exists():
                raise ValueError("Report already exists; choose a fresh path to preserve verification history")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(rendered, encoding="utf-8")
            print(json.dumps({"report": str(output), "reportSha256": digest(rendered.encode("utf-8")), "allChecksPassed": report["allChecksPassed"], "counts": report["counts"], "issues": report["issues"]}, ensure_ascii=False))
        else:
            print(rendered, end="")
        return 0 if report["allChecksPassed"] else 1
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({"allChecksPassed": False, "error": str(exc), "imagesWritten": 0}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
