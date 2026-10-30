#!/usr/bin/env python3
"""Validate and install user-reconstructed PHG swatches from the V120 local bundle.

Never download arbitrary URLs, trust savegame paths, or certify original PHG UV art.
All bytes must match the pinned bundle, source catalog and inner runtime manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "app/game/data/phgDriveV120Catalog.json"
REGISTRY = ROOT / "app/game/data/phgDriveV120Installed.json"
MANIFEST_MEMBER = "docs/PHG_V120_RUNTIME_MANIFEST.json"
SUPPORTED = {"skin", "dreads", "outfit", "armor"}
MAX_WEBP_BYTES = 2 * 1024 * 1024


def sha256_file(file: Path) -> str:
    digest = hashlib.sha256()
    with file.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_catalog(path: Path = CATALOG) -> dict:
    source = json.loads(path.read_text(encoding="utf-8"))
    records = source.get("assets")
    if source.get("schema") != "phg-drive-v120" or not isinstance(records, list) or len(records) != 156:
        raise ValueError("Expected V120 catalog with 156 unique entries")
    ids = [r.get("id") for r in records]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate catalog asset ID")
    for item in records:
        aid = item["id"]
        if not isinstance(aid, str) or not aid or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789_" for c in aid):
            raise ValueError("Unsafe asset ID")
        if item["candidateChannel"] is not None and item["candidateChannel"] not in SUPPORTED:
            raise ValueError("Unexpected cosmetic channel")
        for kind in ("runtime", "preview"):
            suffix = "webp"
            rel = item[kind + "Path"]
            root = "/game/assets/v120/phg-drive/"
            if not rel.startswith(root) or not rel.endswith("." + suffix):
                raise ValueError("Unsafe runtime path")
            parts = Path(rel.lstrip("/")).parts
            if any(part in {".", ".."} for part in parts):
                raise ValueError("Traversal in runtime path")
    return source


def verify_bundle(bundle: Path, catalog: dict) -> tuple[dict[str, bytes], list[str]]:
    """All-or-nothing technical verification, no extraction or save changes."""
    if not bundle.is_file():
        raise ValueError("Missing runtime bundle")
    if sha256_file(bundle) != catalog["bundleSha256"]:
        raise ValueError("Bundle SHA-256 differs from the V120 signed-off source")
    staged: dict[str, bytes] = {}
    with zipfile.ZipFile(bundle, "r") as archive:
        embedded = json.loads(archive.read(MANIFEST_MEMBER))
        listed = embedded.get("assets")
        if embedded.get("schema") != "yautja-phg-v120-runtime-materials" or not isinstance(listed, list):
            raise ValueError("Missing V120 inner runtime manifest")
        native = {x.get("id"): x for x in listed}
        if len(native) != 156 or len(native) != len(listed):
            raise ValueError("Incorrect runtime manifest count")
        for item in catalog["assets"]:
            aid = item["id"]
            inner = native.get(aid)
            if not isinstance(inner, dict) or inner.get("originalSha256") != item["sourceSha256"]:
                raise ValueError("Unverifiable original PNG source: " + aid)
            for kind in ("runtime", "preview"):
                path = item[kind + "Path"]
                if inner.get(kind + "Path") != path:
                    raise ValueError("Incorrect runtime path for " + aid)
                zip_path = "public" + path
                info = archive.getinfo(zip_path)
                if info.file_size < 20 or info.file_size > MAX_WEBP_BYTES:
                    raise ValueError("Oversize or empty WebP: " + zip_path)
                data = archive.read(info)
                if len(data) != inner[kind + "Bytes"]:
                    raise ValueError("Incorrect WebP file size: " + zip_path)
                if hashlib.sha256(data).hexdigest() != inner[kind + "Sha256"]:
                    raise ValueError("Incorrect WebP hash: " + zip_path)
                if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                    raise ValueError("Invalid WebP header: " + zip_path)
                staged[zip_path] = data
    if len(staged) != 312:
        raise ValueError("Expected 312 runtime/preview WebPs")
    selected = [a["id"] for a in catalog["assets"] if a["candidateChannel"] in SUPPORTED]
    return staged, selected


def install_verified(staged: dict[str, bytes], selected: list[str], catalog: dict, root: Path = ROOT) -> int:
    # No file is written until every ZIP entry has already passed verification.
    public_root = (root / "public").resolve()
    for member, data in staged.items():
        target = (root / member).resolve()
        if not target.is_relative_to(public_root):
            raise ValueError("Unsafe target")
        if target.exists() and hashlib.sha256(target.read_bytes()).digest() != hashlib.sha256(data).digest():
            raise ValueError("Existing artwork differs; refusing overwrite: " + member)
    written = 0
    for member, data in staged.items():
        destination = root / member
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            continue
        with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=".phg-v120-", delete=False) as tmp:
            tmp.write(data)
            temp_name = tmp.name
        os.replace(temp_name, destination)
        written += 1
    target_registry = root / "app/game/data/phgDriveV120Installed.json"
    target_registry.parent.mkdir(parents=True, exist_ok=True)
    state = {"schema":"phg-drive-v120", "bundleSha256":catalog["bundleSha256"], "installed": sorted(selected)}
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target_registry.parent,
                                     prefix=".phg-v120-registry-", delete=False) as tmp:
        json.dump(state, tmp, indent=2, ensure_ascii=False)
        tmp.write("\n")
        temp_name = tmp.name
    os.replace(temp_name, target_registry)
    return written


def verify_installed(catalog: dict, root: Path = ROOT) -> dict:
    registry = json.loads((root / "app/game/data/phgDriveV120Installed.json").read_text(encoding="utf-8"))
    entries = registry.get("installed")
    if not isinstance(entries, list) or len(set(entries)) != len(entries):
        raise ValueError("Malformed installed ID set")
    if entries and registry.get("bundleSha256") != catalog["bundleSha256"]:
        raise ValueError("Installed registry pinned to wrong bundle")
    listed = {a["id"]:a for a in catalog["assets"]}
    for aid in entries:
        item = listed.get(aid)
        if not item or item["candidateChannel"] not in SUPPORTED:
            raise ValueError("Unknown or accessory-only installed asset")
        for kind in ("runtime","preview"):
            file = root / ("public" + item[kind + "Path"])
            if not file.is_file() or file.stat().st_size < 20 or file.read_bytes()[8:12] != b"WEBP":
                raise ValueError("Installed WebP missing or corrupt: " + aid)
    return {"installedSelectable":len(entries), "pending":sum(a["candidateChannel"] in SUPPORTED for a in catalog["assets"])-len(entries)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, help="Local V120 ZIP; never fetched over the network")
    parser.add_argument("--verify-only", action="store_true", help="Inspect the ZIP but do not write")
    parser.add_argument("--verify-installed", action="store_true", help="Check current deployment assets")
    args = parser.parse_args()
    try:
        catalog = read_catalog()
        if args.verify_installed:
            result = verify_installed(catalog)
        elif args.bundle:
            staged, selected = verify_bundle(args.bundle, catalog)
            if args.verify_only:
                result = {"verifiedWebP": len(staged), "selectableAfterInstall":len(selected), "installed":False}
            else:
                result = {"verifiedWebP":len(staged), "selectableAfterInstall":len(selected),
                          "filesWritten":install_verified(staged, selected, catalog), "installed":True}
        else:
            parser.error("Specify --bundle <local.zip> or --verify-installed")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, KeyError, OSError, zipfile.BadZipFile, TypeError) as exc:
        print("PHG V120 activation refused: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
