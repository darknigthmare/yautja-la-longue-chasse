#!/usr/bin/env python3
"""Identify embedded metadata in the exact V6.13 PNGs without disclosing it."""

import hashlib
import json
import struct
import subprocess
import sys
import zlib
from collections import Counter
from pathlib import Path

MANIFEST = Path("docs/suivi-production/v613/data/production-manifest.json")
MANIFEST_BLOB = "6a5a6f1ce1dbc5b0d0f366b7a27f5468c4fee572"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PROVENANCE_CHUNKS = {b"tEXt", b"zTXt", b"iTXt", b"eXIf", b"tIME"}
IMAGE_CHUNKS = {
    b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"cHRM", b"gAMA", b"iCCP",
    b"cICP", b"mDCV", b"cLLI", b"sBIT", b"sRGB", b"bKGD", b"hIST", b"pHYs",
    b"sPLT", b"acTL", b"fcTL", b"fdAT", b"sTER",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def png_metadata(raw, path):
    if not raw.startswith(PNG_SIGNATURE):
        raise ValueError(f"{path}: signature PNG incorrecte.")

    offset = len(PNG_SIGNATURE)
    chunk_types = Counter()
    provenance_chunks = []
    other_chunks = []
    while offset + 12 <= len(raw):
        length, chunk_type = struct.unpack_from(">I4s", raw, offset)
        data_start = offset + 8
        crc_start = data_start + length
        next_offset = crc_start + 4
        if next_offset > len(raw):
            raise ValueError(f"{path}: bloc PNG tronqué.")
        expected_crc = struct.unpack_from(">I", raw, crc_start)[0]
        if zlib.crc32(raw[offset + 4:crc_start]) != expected_crc:
            raise ValueError(f"{path}: CRC PNG incorrect.")

        type_name = chunk_type.decode("ascii")
        chunk_types[type_name] += 1
        if chunk_type in PROVENANCE_CHUNKS or chunk_type not in IMAGE_CHUNKS:
            record = {
                "type": type_name,
                "bytes": length,
                "sha256": sha256(raw[data_start:crc_start]),
            }
            if chunk_type in PROVENANCE_CHUNKS:
                provenance_chunks.append(record)
            else:
                other_chunks.append(record)

        offset = next_offset
        if chunk_type == b"IEND":
            trailing = raw[offset:]
            return {
                "chunkTypes": dict(chunk_types),
                "provenanceChunks": provenance_chunks,
                "otherChunks": other_chunks,
                "trailingData": {"bytes": len(trailing), "sha256": sha256(trailing)}
                if trailing else None,
            }

    raise ValueError(f"{path}: fin IEND absente.")


def audit():
    manifest_bytes = MANIFEST.read_bytes()
    if git_blob_sha(manifest_bytes) != MANIFEST_BLOB:
        raise ValueError("Le manifeste V6.13 ne correspond pas au blob historique.")

    assets = json.loads(manifest_bytes)["assets"]
    rows = []
    for item in assets:
        path = Path(item["repoPngPath"])
        raw = path.read_bytes()
        digest = sha256(raw)
        if len(raw) != item["bytes"] or digest != item["sha256"]:
            raise ValueError(f"{path}: les octets ne correspondent pas au manifeste.")
        rows.append({
            "id": item["id"],
            "path": str(path),
            "bytes": len(raw),
            "sha256": digest,
            "acceptedReceiptInManifest": bool(item["acceptedOutputPromptExact"]),
            **png_metadata(raw, path),
        })

    missing = [row for row in rows if not row["acceptedReceiptInManifest"]]
    if len(rows) != 36 or len(missing) != 21:
        raise ValueError("Le manifeste ne décrit pas 36 PNG et 21 reçus manquants.")

    def counts(group):
        return {
            "files": len(group),
            "withProvenanceChunk": sum(bool(row["provenanceChunks"]) for row in group),
            "withUnclassifiedChunk": sum(bool(row["otherChunks"]) for row in group),
            "withTrailingBytes": sum(bool(row["trailingData"]) for row in group),
        }

    return {
        "schemaVersion": 1,
        "auditedCommit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True
        ).strip(),
        "manifestBlob": MANIFEST_BLOB,
        "scope": "Types, tailles et empreintes des blocs. Aucune valeur extraite.",
        "allFinalFiles": counts(rows),
        "filesWithoutAcceptedReceipt": counts(missing),
        "pngs": rows,
    }


if __name__ == "__main__":
    report = audit()
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "manifestBlob": report["manifestBlob"],
        "allFinalFiles": report["allFinalFiles"],
        "filesWithoutAcceptedReceipt": report["filesWithoutAcceptedReceipt"],
    }))
