#!/usr/bin/env python3
"""V119: audit PHG-derived Drive ZIPs before any manual asset promotion.

The inventories describe independently reconstructed 2D swatches, not original
Predator: Hunting Grounds UV or PBR maps. This script NEVER extracts, copies
into public/, or marks a cosmetic item as integrated or artistically 1:1.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
import re
import struct
import sys
import zipfile
import zlib

EXPECTED = {"Peau": 80, "Dreads": 15, "Anneaux": 6, "Armure": 55}
FOLDERS = {"Peau": "peau", "Dreads": "dreadlocks", "Anneaux": "anneaux", "Armure": "armure"}
ZIP_DISTRIBUTION = [12, 29, 30, 30, 18, 18, 19]
ID = re.compile(r"^[a-z0-9_]+$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
ZIP_NAME = re.compile(r"^YAUTJA_PHG_[A-Z0-9_]+\.zip$")
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def digest_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as source:
        for part in iter(lambda: source.read(1024 * 1024), b""):
            h.update(part)
    return h.hexdigest()


def metadata_check(inventory: dict, delivery: dict) -> tuple[list[str], dict[str, dict], dict[str, dict]]:
    errors: list[str] = []
    assets = inventory.get("assets")
    archives = delivery.get("archives")
    if not isinstance(assets, list) or not isinstance(archives, list):
        return ["Inventories must contain assets[] and archives[]"], {}, {}
    if len(assets) != 156 or inventory.get("total_png") != 156:
        errors.append(f"Expected 156 assets, got {len(assets)}")
    if len(archives) != 7 or delivery.get("archive_count") != 7:
        errors.append(f"Expected seven split ZIP archives, got {len(archives)}")
    seen_ids: set[str] = set()
    seen_paths: set[str] = set()
    counts: Counter[str] = Counter()
    by_id: dict[str, dict] = {}
    for asset in assets:
        if not isinstance(asset, dict):
            errors.append("Non-object asset entry")
            continue
        name = asset.get("id")
        category = asset.get("category")
        path = asset.get("file")
        if not isinstance(name, str) or not ID.fullmatch(name):
            errors.append(f"Unsafe asset id: {name!r}")
            continue
        if name in seen_ids:
            errors.append(f"Duplicate asset id: {name}")
        seen_ids.add(name)
        if category not in FOLDERS:
            errors.append(f"Unknown category: {name}, {category!r}")
            continue
        if not isinstance(path, str) or not re.fullmatch(
            r"textures/" + FOLDERS[category] + r"/[a-z0-9_]+\.png", path
        ):
            errors.append(f"Unsafe or wrongly classified path: {name} = {path!r}")
            continue
        if path in seen_paths:
            errors.append(f"Duplicate source path: {path}")
        seen_paths.add(path)
        if asset.get("width") != 1254 or asset.get("height") != 1254 or asset.get("mode") != "RGB":
            errors.append(f"Unverified PNG geometry/mode: {name}")
        if not isinstance(asset.get("size_bytes"), int) or not 64 <= asset["size_bytes"] <= 16 * 1024 * 1024:
            errors.append(f"Invalid PNG byte count: {name}")
        if not isinstance(asset.get("sha256"), str) or not SHA256.fullmatch(asset["sha256"]):
            errors.append(f"Missing or malformed PNG SHA-256: {name}")
        counts[category] += 1
        by_id[name] = asset
    if dict(counts) != EXPECTED:
        errors.append(f"Wrong category counts: {dict(counts)!r}")
    per_archive: dict[str, dict] = {}
    assigned: set[str] = set()
    for idx, archive in enumerate(archives):
        if not isinstance(archive, dict):
            errors.append("Non-object archive entry")
            continue
        filename = archive.get("filename")
        ids = archive.get("assets")
        if not isinstance(filename, str) or not ZIP_NAME.fullmatch(filename):
            errors.append(f"Unsafe archive name: {filename!r}")
            continue
        if filename in per_archive:
            errors.append(f"Duplicate archive name: {filename}")
        if not isinstance(ids, list):
            errors.append(f"Archive without asset list: {filename}")
            continue
        size_expected = ZIP_DISTRIBUTION[idx] if idx < len(ZIP_DISTRIBUTION) else -1
        if len(ids) != archive.get("png_count") or len(ids) != size_expected:
            errors.append(f"Archive entry-count mismatch: {filename}")
        if not isinstance(archive.get("sha256"), str) or not SHA256.fullmatch(archive["sha256"]):
            errors.append(f"Archive missing SHA-256: {filename}")
        for asset_id in ids:
            if not isinstance(asset_id, str) or asset_id not in by_id:
                errors.append(f"Unknown asset in {filename}: {asset_id!r}")
            if asset_id in assigned:
                errors.append(f"Asset assigned to multiple archives: {asset_id}")
            assigned.add(asset_id)
        per_archive[filename] = archive
    if seen_ids != assigned:
        errors.append(f"ZIP partition mismatch: missing={len(seen_ids - assigned)}, extra={len(assigned - seen_ids)}")
    return errors, by_id, per_archive


def inspect_png(data: bytes, asset: dict) -> str | None:
    if len(data) != asset["size_bytes"] or digest(data) != asset["sha256"]:
        return "byte length or SHA-256 mismatch"
    if not data.startswith(PNG_MAGIC) or len(data) < 33:
        return "invalid PNG magic/header"
    chunk_len = struct.unpack(">I", data[8:12])[0]
    if chunk_len != 13 or data[12:16] != b"IHDR":
        return "invalid IHDR"
    if (zlib.crc32(data[12:29]) & 0xffffffff) != struct.unpack(">I", data[29:33])[0]:
        return "invalid IHDR CRC"
    width, height, depth, color_type = struct.unpack(">IIBB", data[16:26])
    if width != asset["width"] or height != asset["height"] or depth != 8 or color_type != 2:
        return "PNG dimensions/colour type do not match RGB source manifest"
    return None


def inspect_archives(source: Path, by_id: dict[str, dict], archives: dict[str, dict]) -> tuple[list[str], int]:
    issues: list[str] = []
    verified = 0
    root = source.resolve()
    for filename, archive in archives.items():
        location = root / filename
        if not location.is_file() or not location.resolve().is_relative_to(root):
            issues.append(f"Missing or unsafe ZIP: {filename}")
            continue
        if digest_file(location) != archive["sha256"]:
            issues.append(f"Changed ZIP SHA-256: {filename}")
            continue
        try:
            with zipfile.ZipFile(location) as z:
                names = z.namelist()
                for asset_id in archive["assets"]:
                    asset = by_id.get(asset_id)
                    if not asset:
                        continue
                    target = asset["file"]
                    matches = [name for name in names if name == target or name.endswith("/" + target)]
                    if len(matches) != 1:
                        issues.append(f"Missing/ambiguous archived PNG: {filename}/{asset_id}")
                        continue
                    member = matches[0]
                    # Never extract a ZIP entry; reject traversal and oversized members.
                    segments = member.split("/")
                    if ".." in segments or member.startswith("/") or "\\" in member:
                        issues.append(f"Unsafe ZIP entry: {filename}/{member}")
                        continue
                    info = z.getinfo(member)
                    if info.file_size != asset["size_bytes"] or info.file_size > 16 * 1024 * 1024:
                        issues.append(f"Wrong uncompressed size: {filename}/{asset_id}")
                        continue
                    with z.open(info) as png_file:
                        data = png_file.read(info.file_size + 1)
                    error = inspect_png(data, asset)
                    if error:
                        issues.append(f"{filename}/{asset_id}: {error}")
                    else:
                        verified += 1
        except (OSError, zipfile.BadZipFile, RuntimeError, ValueError) as exc:
            issues.append(f"ZIP unreadable: {filename}: {type(exc).__name__}")
    return issues, verified


def run(inventory: dict, delivery: dict, zip_dir: Path | None = None) -> dict:
    issues, by_id, archives = metadata_check(inventory, delivery)
    verified = 0
    if zip_dir is not None and not issues:
        checked, verified = inspect_archives(zip_dir, by_id, archives)
        issues.extend(checked)
    return {
        "version": "V119",
        "result": "failed" if issues else (
            "archive_bytes_verified" if zip_dir is not None else "metadata_valid_assets_not_imported"
        ),
        "source_is_reconstruction": True,
        "official_uv_fidelity_verified": False,
        "assets_listed": len(by_id),
        "archive_count": len(archives),
        "bytes_verified": verified,
        "assets_registered_in_game_by_this_tool": 0,
        "errors": issues,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, required=True,
                        help="YAUTJA_PHG_RECONSTRUIT_156_INVENTAIRE.json")
    parser.add_argument("--delivery", type=Path, required=True,
                        help="YAUTJA_PHG_ARCHIVES_DRIVE_20261007.json")
    parser.add_argument("--zip-dir", type=Path, help="folder containing all seven ZIPs; optional")
    parser.add_argument("--report", type=Path, help="optional safe JSON QA report")
    args = parser.parse_args()
    try:
        inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
        delivery = json.loads(args.delivery.read_text(encoding="utf-8"))
        result = run(inventory, delivery, args.zip_dir)
    except (ValueError, OSError, TypeError) as exc:
        result = {"version": "V119", "result": "failed", "errors": [str(exc)]}
    serialized = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(serialized, encoding="utf-8")
    print(serialized, end="")
    return 1 if result["result"] == "failed" else 0


if __name__ == "__main__":
    sys.exit(main())
