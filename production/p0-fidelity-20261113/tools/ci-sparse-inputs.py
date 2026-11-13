#!/usr/bin/env python3
"""Print exact sparse inputs or check them, without changing Git or any source.

The workflow initially checks out only both dated candidate namespaces, the
prior follow-up directory, this helper and the workflow. Additional files come
from the published source-protection snapshots and local manifest references.
Private ImageGen files and external URLs are neither fetched nor required.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re


ROOT = Path(__file__).resolve().parents[3]
PACK = "production/p0-sprites-20261113"
PUBLIC = "public/game/p0-sprites-20261113"
ADDENDUM = "production/p0-fidelity-20261113"
ADDENDUM_PUBLIC = "public/game/p0-fidelity-20261113"
BOOTSTRAP_DIRECTORIES = (
    PACK,
    PUBLIC,
    ADDENDUM,
    ADDENDUM_PUBLIC,
    "production/clan-war-command-20261109/suivi",
)
BOOTSTRAP_FILES = (
    ".github/workflows/p0-sprite-candidates.yml",
    "production/p0-fidelity-20261113/tools/ci-sparse-inputs.py",
)
SOURCE_ROOTS = {"app", "art-source", "docs", "production", "public"}
SOURCE_SUFFIXES = {".html", ".json", ".md", ".mjs", ".png", ".py", ".svg", ".webp", ".xlsx"}


def repository_file(value: object) -> str:
    """Keep each metadata entry a literal repository file, never a directory/glob."""
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("Repository-relative POSIX file path required")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("Control character in repository file path")
    path = PurePosixPath(value)
    if (path.is_absolute() or len(path.parts) < 2 or value != path.as_posix()
            or any(part in {".", "..", ".git"} for part in path.parts)
            or path.parts[0] not in SOURCE_ROOTS or path.suffix.lower() not in SOURCE_SUFFIXES):
        raise ValueError("Unsafe or unsupported repository file path: " + value)
    return value


def literal_pattern(value: str) -> str:
    """Escape gitignore metacharacters; the leading slash anchors the exact path."""
    return "/" + "".join("\\" + character if character in "\\!*?[]# " else character
                         for character in value)


def read(relative: str) -> dict:
    value = json.loads((ROOT / relative).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Expected JSON object: " + relative)
    return value


def collect() -> tuple[set[str], dict[str, dict]]:
    protection = read(PACK + "/suivi/source-protection.json")
    manifest = read(PUBLIC + "/manifest.json")
    receipt = read(PACK + "/suivi/verification.json")
    if manifest.get("id") != "p0-sprites-20261113" or manifest.get("schemaVersion") != 1:
        raise ValueError("Unknown dated sprite candidate manifest")
    paths: set[str] = set()
    pins: dict[str, dict] = {}

    def add(record: dict, require_pin: bool = False) -> None:
        if not isinstance(record, dict):
            raise ValueError("Expected input record")
        value = repository_file(record.get("path"))
        paths.add(value)
        digest = record.get("sha256")
        size = record.get("bytes")
        if require_pin or digest is not None:
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise ValueError("Missing SHA256 for " + value)
            if size is not None and (type(size) is not int or size <= 0):
                raise ValueError("Invalid pinned size for " + value)
            previous = pins.get(value)
            if previous and (previous["sha256"] != digest
                             or (previous.get("bytes") is not None and size is not None
                                 and previous["bytes"] != size)):
                raise ValueError("Conflicting input pins for " + value)
            pins[value] = {"sha256": digest, "bytes": size if size is not None else
                           previous.get("bytes") if previous else None}

    sources = protection.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("Protected source list must not be empty")
    for source in sources:
        add(source, require_pin=True)
    add(protection["priorInventory"], require_pin=True)
    for record in manifest["inputPins"] + manifest["nativeFiles"] + receipt["inputPins"]:
        add(record, require_pin=True)
    for asset in manifest["assets"]:
        add(asset["generationRecord"], require_pin=True)
        for reference in asset.get("references", []):
            if isinstance(reference, dict) and reference.get("path"):
                add(reference)
    # This dated addendum is mandatory too: a missing manifest must fail rather
    # than silently reducing the job to verification of the preceding pack.
    addendum = read(ADDENDUM_PUBLIC + "/manifest.json")
    if addendum.get("id") != "p0-fidelity-20261113" or addendum.get("schemaVersion") != 1:
        raise ValueError("Unknown fidelity addendum manifest")
    source_snapshot = addendum["protectedSources"]
    if source_snapshot.get("path") != ADDENDUM + "/suivi/source-protection.json":
        raise ValueError("Unknown fidelity source protection snapshot")
    add(source_snapshot, require_pin=True)
    for record in read(source_snapshot["path"])["files"]:
        add(record, require_pin=True)
    for record in addendum["inputPins"] + addendum["nativeFiles"]:
        add(record, require_pin=True)
    for asset in addendum["assets"]:
        add(asset["generationRecord"], require_pin=True)
        for reference in asset.get("sourceReferences", []):
            if isinstance(reference, dict) and reference.get("path"):
                add(reference)
    if len(paths) > 512:
        raise ValueError("Dated pack input selection exceeds 512 literal files")
    if sum(pin.get("bytes") or 0 for pin in pins.values()) > 512 * 1024 * 1024:
        raise ValueError("Dated pack pinned inputs exceed the 512 MiB checkout bound")
    return paths, pins


def patterns(paths: set[str]) -> list[str]:
    # Re-emitting the bootstrap paths preserves them when `set --stdin` replaces
    # the initial sparse specification. No wildcard admits a neighbouring tree.
    return ([literal_pattern(path) + "/" for path in BOOTSTRAP_DIRECTORIES]
            + [literal_pattern(path) for path in BOOTSTRAP_FILES]
            + [literal_pattern(path) for path in sorted(paths)])


def check(paths: set[str], pins: dict[str, dict]) -> dict:
    total = 0
    for relative in sorted(paths | set(BOOTSTRAP_FILES)):
        file = ROOT / relative
        if not file.resolve().is_relative_to(ROOT) or not file.is_file() or file.is_symlink():
            raise ValueError("Missing regular checked-out input: " + relative)
        if relative not in pins:
            continue
        data = file.read_bytes()
        pin = pins[relative]
        if hashlib.sha256(data).hexdigest() != pin["sha256"]:
            raise ValueError("Input SHA256 changed: " + relative)
        if pin["bytes"] is not None and len(data) != pin["bytes"]:
            raise ValueError("Input size changed: " + relative)
        total += len(data)
    return {"passed": True, "literalFiles": len(paths), "pinnedFiles": len(pins),
            "pinnedBytes": total,
            "scope": "Sparse file selection and byte pins only; no browser, gameplay, human art or canon certification"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--patterns", action="store_true", help="Print exact non-cone sparse patterns; do not run Git")
    mode.add_argument("--check", action="store_true", help="Read and verify selected files after sparse checkout")
    args = parser.parse_args()
    paths, pins = collect()
    if args.patterns:
        print("\n".join(patterns(paths)))
    else:
        print(json.dumps(check(paths, pins)))


if __name__ == "__main__":
    main()
