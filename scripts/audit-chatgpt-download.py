"""Read-only ZIP intake: canonical paths, limits, CRC and hashes; no extraction."""
import hashlib
import json
import pathlib
import re
import stat
import sys
import zipfile


def digest_file(source):
    digest = hashlib.sha256()
    while block := source.read(1024 * 1024):
        digest.update(block)
    return digest.hexdigest()


def member_path(filename):
    normalized = filename.replace("\\", "/")
    raw_parts = normalized.split("/")
    if not normalized or normalized.startswith("/") or ".." in raw_parts:
        raise ValueError("Unsafe archive member path.")
    parts = tuple(part for part in raw_parts if part not in ("", "."))
    if not parts or any(re.search(r'[<>:"|?*\x00-\x1f]', part) or
                        re.match(r"^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)", part, re.I) or
                        part.endswith((".", " ")) for part in parts):
        raise ValueError("Unsafe archive member path.")
    return "/".join(parts)


def audit(filename):
    source = pathlib.Path(filename).resolve(strict=True)
    if not source.is_file() or source.stat().st_size > 600 * 1024**2:
        raise ValueError("Expected a downloaded ZIP of at most 600 MiB.")
    with source.open("rb") as stream:
        source_hash = digest_file(stream)
    result = {"format": "yautja-private-download-audit-v2", "file": source.name,
              "bytes": source.stat().st_size, "sha256": source_hash,
              "extracted": False, "runtimeAssetsAccepted": 0, "entries": []}
    with zipfile.ZipFile(source) as archive:
        entries = archive.infolist()
        if len(entries) > 20000 or sum(entry.file_size for entry in entries) > 4 * 1024**3:
            raise ValueError("ZIP entry count or expanded-size limit exceeded.")
        paths = {}
        canonical_entries = []
        for entry in entries:
            canonical = member_path(entry.filename)
            key = canonical.casefold()
            if key in paths:
                raise ValueError("Duplicate or case-colliding archive destination.")
            paths[key] = entry.is_dir()
            canonical_entries.append((entry, canonical, key))
        # Order-independent: implicit directory a also conflicts with a file named a.
        for _entry, _canonical, key in canonical_entries:
            parts = key.split("/")
            for i in range(1, len(parts)):
                parent = "/".join(parts[:i])
                if parent in paths and not paths[parent]:
                    raise ValueError("File/directory archive destination collision.")
        for entry, canonical, _key in canonical_entries:
            if stat.S_ISLNK(entry.external_attr >> 16) or entry.flag_bits & 1:
                raise ValueError("Symlink or encrypted member refused.")
            if entry.file_size > 128 * 1024**2 or entry.file_size > max(1, entry.compress_size) * 250:
                raise ValueError("Per-member expanded-size or compression-ratio limit exceeded.")
            if entry.is_dir():
                continue
            with archive.open(entry) as stream:
                digest = digest_file(stream)  # Reading fully also checks CRC/truncation.
            result["entries"].append({"path": canonical, "sourcePath": entry.filename,
                                      "bytes": entry.file_size, "sha256": digest})
    hashes = [entry["sha256"] for entry in result["entries"]]
    result["uniqueFiles"] = len(set(hashes))
    result["duplicateByteCopies"] = len(hashes) - len(set(hashes))
    result["reviewRequired"] = "Artwork, lore, geometry, alpha and animation must be reviewed before runtime import."
    return result


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: py -3 scripts/audit-chatgpt-download.py <downloaded.zip>")
        print(json.dumps(audit(sys.argv[1]), ensure_ascii=False, indent=2))
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError, NotImplementedError) as error:
        print(json.dumps({"valid": False, "error": str(error)}), file=sys.stderr)
        sys.exit(1)
