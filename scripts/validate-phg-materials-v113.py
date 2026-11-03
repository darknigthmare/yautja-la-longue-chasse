#!/usr/bin/env python3
"""Audit the exact V85 native files actually selected by the V113 visual system.

The archive contains derived reconstructions, not copyrighted original PHG UV textures.
This checks technical integrity and provenance only, never implies 1:1 artistic fidelity.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "app/game/hunterMaterialsV113.ts"
MARKER = "export const PHG_MATERIALS_V113: readonly HunterMaterialV113[] = "
PREFIX = "public/game/imports/v85/drive-latest/"


def main() -> int:
    text = REGISTRY.read_text(encoding="utf-8")
    raw = text.split(MARKER, 1)[1].split(";\nexport function", 1)[0]
    items = json.loads(raw)
    categories = {"skin": 0, "dread": 0, "outfit": 0}
    filenames = set()
    invalid = []
    for item in items:
        filename = item["src"]
        if not filename.startswith("/game/imports/v85/drive-latest/"):
            invalid.append(f"Disallowed registry path: {filename}")
            continue
        location = ROOT / ("public" + filename)
        if not location.is_file() or not location.resolve().is_relative_to(ROOT / PREFIX):
            invalid.append(f"Missing or unsafe native file: {filename}")
            continue
        if filename in filenames:
            invalid.append(f"Duplicate entry: {filename}")
        filenames.add(filename)
        contents = location.read_bytes()
        if len(contents) != item["byteLength"]:
            invalid.append(f"Incorrect byte count: {filename}")
        actual_sha = hashlib.sha1(b"blob " + str(len(contents)).encode("ascii") + b"\0" + contents).hexdigest()
        if actual_sha != item["gitBlobSha"]:
            invalid.append(f"Modified historical PNG: {filename}")
        if not contents.startswith(b"\x89PNG\r\n\x1a\n"):
            invalid.append(f"Invalid PNG magic: {filename}")
            continue
        ihdr_size = struct.unpack(">I", contents[8:12])[0]
        chunk = contents[12:16]
        if ihdr_size != 13 or chunk != b"IHDR":
            invalid.append(f"Invalid PNG IHDR: {filename}")
            continue
        width, height = struct.unpack(">II", contents[16:24])
        crc_expected = struct.unpack(">I", contents[29:33])[0]
        crc_actual = zlib.crc32(contents[12:29]) & 0xFFFFFFFF
        if crc_actual != crc_expected or not (64 <= width <= 8192 and 64 <= height <= 8192):
            invalid.append(f"Bad IHDR geometry/CRC: {filename} ({width}x{height})")
        if item["category"] not in categories:
            invalid.append(f"Unknown category: {item['category']}")
        else:
            categories[item["category"]] += 1
        if item["archived"] and "provisoire" not in filename:
            invalid.append(f"Unexpected archived asset: {filename}")
    if categories != {"skin": 13, "dread": 3, "outfit": 28}:
        invalid.append(f"Unexpected categories: {categories!r}")
    if len(items) != 44:
        invalid.append(f"Unexpected item count: {len(items)}")
    for issue in invalid:
        print("ERROR", issue, file=sys.stderr)
    print(json.dumps({"checked": len(items), "groups": categories, "errors": len(invalid), "status": "failed" if invalid else "pass"}, ensure_ascii=False))
    return 1 if invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
