#!/usr/bin/env python3
"""Select the mask pack's pinned files without fetching unrelated art or changing Git.

Only manifest input pins, native candidate files and its exact source-protection
snapshot extend the four literal bootstrap files. Raw inventory references,
community DDS/captures and private ImageGen paths do not select checkout files.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import traceback

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[3]
PACK = "production/biomasks-lots40-20261113"
PUBLIC = "public/game/biomasks-lots40-20261113"
MANIFEST = PUBLIC + "/manifest.json"
PROTECTION = PACK + "/suivi/source-protection.json"
PROTECTION_SHA = 'af284f8cd09d91e59e648e43039725288fdfed8ed231ccbae17f5f35ecdfce66'
BOOTSTRAP_FILES = (
    ".github/workflows/biomask-lots40-candidates.yml",
    PACK + "/tools/ci-mask-lots40-inputs.py",
    MANIFEST,
    PROTECTION,
    PACK + '/suivi/qa-evidence.json',
)
REVIEW_OUTPUTS = (
    PUBLIC + "/review.html",
    PACK + "/tools/verify-mask-lots40.py",
    PACK + "/suivi/Yautja_Masques_Lots40_20261113.xlsx",
    PACK + "/suivi/build-request.json",
    PACK + "/suivi/coverage.json",
    PACK + "/suivi/verification.json",
)
ROOT_FILES = {"package.json", "package-lock.json"}
SOURCE_ROOTS = {".github", "app", "art-source", "docs", "production", "public"}
SOURCE_SUFFIXES = {".css", ".csv", ".tsv", ".dds", ".texture", ".jpg", ".jpeg", ".html", ".headers", ".js", ".json", ".md", ".mjs", ".png", ".py", ".svg", ".ts", ".tsx", ".txt", ".webp", ".xlsx", ".yaml", ".yml"}
MAX_FILES = 3072
# Seven immutable predecessor packs pin643535913 bytes. Each of four domains may
# add up to40 qualified A/B/C studies and exact source references; the capacity is
# never counted as actual production. The final report records measured bytes.
# Select literal files only, with a bounded2GiB ceiling rather than broad art trees.
MAX_PINNED_BYTES = 2 * 1024 * 1024 * 1024


def repository_file(value: object) -> str:
    """Keep each entry a literal repository file, not a directory or URI."""
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("Repository-relative POSIX file path required")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError("Control character in repository path")
    if value in ROOT_FILES:
        return value
    path = PurePosixPath(value)
    if (path.is_absolute() or len(path.parts) < 2 or value != path.as_posix()
            or any(part in {".", "..", ".git"} for part in path.parts)
            or path.parts[0] not in SOURCE_ROOTS
            or path.suffix.lower() not in SOURCE_SUFFIXES):
        raise ValueError("Unsafe or unsupported repository file: " + value)
    return value


def literal_pattern(path: str) -> str:
    return "/" + "".join("\\" + char if char in "\\!*?[]# " else char for char in path)


def read(relative: str) -> dict:
    value = json.loads((ROOT / relative).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Expected JSON object: " + relative)
    return value


def collect() -> tuple[set[str], dict[str, dict]]:
    if hashlib.sha256((ROOT / PROTECTION).read_bytes()).hexdigest() != PROTECTION_SHA:
        raise ValueError('Frozen870 historical source-protection snapshot changed')
    manifest = read(MANIFEST)
    if manifest.get("id") != "biomasks-lots40-20261113" or manifest.get("schemaVersion") != 1:
        raise ValueError("Unknown source-qualified mask expansion manifest")
    paths: set[str] = set()
    pins: dict[str, dict] = {}

    def add(record: dict) -> None:
        if not isinstance(record, dict):
            raise ValueError("Expected pinned input record")
        relative = repository_file(record.get("path"))
        digest, size = record.get("sha256"), record.get("bytes")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError("Missing SHA256 for " + relative)
        if type(size) is not int or size <= 0:
            raise ValueError("Missing positive byte count for " + relative)
        pin = {"sha256": digest, "bytes": size}
        if relative in pins and pins[relative] != pin:
            raise ValueError("Conflicting input pins: " + relative)
        paths.add(relative)
        pins[relative] = pin

    source_snapshot = manifest.get("protectedSources")
    if not isinstance(source_snapshot, dict) or source_snapshot.get("path") != PROTECTION:
        raise ValueError("Unknown source-protection snapshot")
    add(source_snapshot)
    protected = read(PROTECTION).get("files")
    if not isinstance(protected, list) or not protected:
        raise ValueError("Source-protection files must be present")
    for record in protected:
        add(record)
    for field in ("inputPins", "nativeFiles", "derivedFiles", "sourceCopies"):
        records = manifest.get(field)
        if not isinstance(records, list) :
            raise ValueError("Manifest " + field + " must be present")
        for record in records:
            add(record)
    # QA proves a stable manifest; its own index stays outside manifest inputPins
    # to avoid a report -> manifest -> report hash cycle. Only literal pinned
    # QA evidence can extend the checkout, never arbitrary raw report strings.
    evidence_path = ROOT / PACK / 'suivi/qa-evidence.json'
    if evidence_path.is_file():
        evidence = read(PACK + '/suivi/qa-evidence.json')
        if evidence.get('manifestSha256') != hashlib.sha256((ROOT / MANIFEST).read_bytes()).hexdigest():
            raise ValueError('QA evidence belongs to another manifest')
        raw = evidence_path.read_bytes()
        add({'path': PACK + '/suivi/qa-evidence.json', 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
        for record in evidence.get('files', []):
            if not repository_file(record.get('path')).startswith(PACK + '/qa/'):
                raise ValueError('QA evidence outside new QA namespace')
            add(record)
    # Private publisher photos and ImageGen paths never expand checkout membership.
    # Only explicit pins, native files and historical source protection are inputs.
    if len(selected(paths)) > MAX_FILES:
        raise ValueError("Mask pack selection exceeds 3072 literal files")
    if sum(pin["bytes"] for pin in pins.values()) > MAX_PINNED_BYTES:
        raise ValueError("Mask pack selection exceeds 2 GiB of pinned data")
    return paths, pins


def patterns(paths: set[str]) -> list[str]:
    # Replacing the initial specification must not retain recursive namespaces.
    return [literal_pattern(path) for path in sorted(selected(paths))]


def selected(paths: set[str]) -> set[str]:
    return paths | set(BOOTSTRAP_FILES) | set(REVIEW_OUTPUTS)


def check(paths: set[str], pins: dict[str, dict]) -> dict:
    total, selected_bytes = 0, 0
    for relative in sorted(selected(paths)):
        file = ROOT / relative
        if file.is_symlink() or not file.resolve().is_relative_to(ROOT) or not file.is_file():
            raise ValueError("Missing regular checked-out input: " + relative)
        raw = file.read_bytes()
        selected_bytes += len(raw)
        if relative not in pins:
            continue
        pin = pins[relative]
        if len(raw) != pin["bytes"] or hashlib.sha256(raw).hexdigest() != pin["sha256"]:
            raise ValueError("Input bytes differ from their pin: " + relative)
        total += len(raw)
    if selected_bytes > MAX_PINNED_BYTES:
        raise ValueError("All selected files exceed 2 GiB")
    return {"passed": True, "literalFiles": len(selected(paths)), "pinnedFiles": len(pins),
            "pinnedBytes": total, "selectedBytes": selected_bytes,
            "scope": "Sparse file selection and byte pins; not browser, human art, runtime or canon approval"}


def compare_tree(raw: bytes, expected: set[str]) -> dict:
    """Validate tree names/modes without fetching blobs that sparse would hide."""
    actual: set[str] = set()
    for record in raw.split(b"\0"):
        if not record:
            continue
        header, path_bytes = record.split(b"\t", 1)
        mode, kind, _oid = header.decode("ascii").split(" ")
        path = path_bytes.decode("utf-8")
        if mode not in {"100644", "100755"} or kind != "blob":
            raise ValueError("Public candidate must be a regular Git file: " + path)
        if path in actual:
            raise ValueError("Duplicate public tree entry: " + path)
        actual.add(path)
    if actual != expected:
        raise ValueError("Public Git tree differs from the candidate manifest: extra="
                         + repr(sorted(actual - expected)) + "; missing="
                         + repr(sorted(expected - actual)))
    return {"passed": True, "publicTreeFiles": len(actual),
            "scope": "Committed public filenames/modes only; no blob downloads or art approval"}


def check_git_tree() -> dict:
    manifest = read(MANIFEST)
    if manifest.get("id") != "biomasks-lots40-20261113" or manifest.get("schemaVersion") != 1:
        raise ValueError("Unknown source-qualified mask expansion manifest")
    expected = {MANIFEST, PUBLIC + "/review.html"}
    for record in manifest.get("nativeFiles", []) + manifest.get("derivedFiles", []) + manifest.get("sourceCopies", []):
        path = repository_file(record.get("path"))
        if not path.startswith(PUBLIC + "/") or not path.endswith((".png", ".webp", ".jpg", ".jpeg")):
            raise ValueError("Native mask outside its public namespace: " + path)
        expected.add(path)
    if len(expected) < 3:
        raise ValueError("No native mask candidates declared")
    result = subprocess.run(["git", "ls-tree", "-r", "-z", "HEAD", "--", PUBLIC],
                            cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return compare_tree(result.stdout, expected)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--patterns", action="store_true", help="Print anchored non-cone sparse patterns only")
    mode.add_argument("--check", action="store_true", help="Check selected files and SHA pins")
    mode.add_argument("--check-git-tree", action="store_true", help="Check committed public membership before sparse expansion")
    args = parser.parse_args()
    if args.check_git_tree:
        print(json.dumps(check_git_tree()))
        return
    paths, pins = collect()
    if args.patterns:
        print("\n".join(patterns(paths)))
    else:
        print(json.dumps(check(paths, pins)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        message = (type(error).__name__ + ": " + str(error)).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::error::" + message, file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1)
