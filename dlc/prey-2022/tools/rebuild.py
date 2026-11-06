#!/usr/bin/env python3
"""Rebuild the original PREY v0.6.0 package without downloads or host edits."""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CHECKSUM_SHA256 = "a1ba839962c5718d514f5ab751e256dc8a59af86b24af131d1df3c23427b2e73"
GENERATED = {"src/prey-content-v06.json", "JOUER_PREY_DLC_V0_6_PORTABLE.html"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_original(root: Path, name: str) -> bytes:
    """Reject links so an archive cannot read files outside its own directory."""
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError(f"Symlink refused: {name}")
    if not current.is_file():
        raise ValueError(f"Missing original: {name}")
    return current.read_bytes()


def assemble(root: Path) -> dict[str, bytes]:
    sums = read_original(root, "SHA256SUMS.txt")
    if digest(sums) != CHECKSUM_SHA256:
        raise ValueError("Original SHA256SUMS.txt has changed")
    expected: dict[str, str] = {}
    for line in sums.decode("utf-8").splitlines():
        match = re.fullmatch(r"([a-f0-9]{64})  ([A-Za-z0-9_./-]+)", line)
        if not match:
            raise ValueError("Invalid checksum entry")
        sha, name = match.groups()
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or name in expected:
            raise ValueError(f"Unsafe or duplicate path: {name}")
        expected[name] = sha
    if len(expected) != 56 or not GENERATED <= expected.keys():
        raise ValueError("Expected the original 56-entry manifest")
    files = {name: read_original(root, name) for name in expected if name not in GENERATED}
    for name, data in files.items():
        if digest(data) != expected[name]:
            raise ValueError(f"Source checksum mismatch: {name}")
    assignment = files["src/prey-content-v06.js"].decode("utf-8")
    prefix, suffix = "window.PREY_CONTENT=", ";\n"
    if not assignment.startswith(prefix) or not assignment.endswith(suffix):
        raise ValueError("Unexpected content assignment")
    content = json.loads(assignment[len(prefix):-len(suffix)])
    # Python preserves the original 0.0 values; JSON.stringify would emit 0.
    files["src/prey-content-v06.json"] = (json.dumps(content, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    icons = {Path(name).name: "data:image/svg+xml;base64," + base64.b64encode(data).decode("ascii")
             for name, data in sorted(files.items()) if name.startswith("assets/icons/") and name.endswith(".svg")}
    if len(icons) != 20:
        raise ValueError("Expected all 20 original SVG icons")
    html = files["JOUER_PREY_DLC_V0_6.html"].decode("utf-8")
    style_tag = '<link rel="stylesheet" href="src/prey-v06.css">'
    script_tags = '<script src="src/prey-content-v06.js"></script><script src="src/prey-game-v06.js"></script>'
    if html.count(style_tag) != 1 or html.count(script_tags) != 1:
        raise ValueError("Unexpected HTML entry points")
    css = files["src/prey-v06.css"].decode("utf-8")
    js = [files[name].decode("utf-8").replace("</script", "<\\/script")
          for name in ("src/prey-content-v06.js", "src/prey-game-v06.js")]
    html = html.replace(style_tag, "<style>" + css + "</style>")
    scripts = "<script>window.PREY_ICON_DATA=" + json.dumps(icons, separators=(",", ":")) + ";</script>"
    replacement = scripts + "".join("<script>" + part + "</script>" for part in js)
    # Preserve historical String.replace semantics, including its known $$ bug.
    html = html.replace(script_tags, replacement.replace("$$", "$"))
    files["JOUER_PREY_DLC_V0_6_PORTABLE.html"] = html.encode("utf-8")
    for name in GENERATED:
        if digest(files[name]) != expected[name]:
            raise ValueError(f"Reconstruction differs from original: {name}")
    files["SHA256SUMS.txt"] = sums
    return files


def write_new(output: Path, files: dict[str, bytes]) -> None:
    output = output.expanduser().absolute()
    if os.path.lexists(output):
        raise ValueError(f"Output already exists; nothing overwritten: {output}")
    for parent in output.parents:
        if parent.is_symlink():
            raise ValueError(f"Output parent is a symlink: {parent}")
    output.mkdir(parents=True, exist_ok=False)
    for name, data in sorted(files.items()):
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as handle:
            handle.write(data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify originals and rebuild duplicates in memory only")
    parser.add_argument("--output", type=Path, default=ROOT / ".generated" / "PREY_DLC_V0_6", help="New output directory; existing directories are refused")
    args = parser.parse_args()
    try:
        files = assemble(ROOT / "v0.6.0")
        if not args.check:
            write_new(args.output, files)
        print(json.dumps({"status": "PASS", "originalSources": 55, "rebuiltFiles": 2,
                          "completePackageFiles": len(files), "verifiedChecksumEntries": 56,
                          "output": None if args.check else str(args.output.absolute())}))
        return 0
    except (OSError, ValueError, UnicodeError) as error:
        print(f"PREY rebuild failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
