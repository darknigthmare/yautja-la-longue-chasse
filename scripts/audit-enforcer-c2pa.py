#!/usr/bin/env python3
"""Verify C2PA with an offline process and publish only validation codes."""

import hashlib
import json
import re
import struct
import subprocess
import sys
import tempfile
import zlib
from collections import Counter
from pathlib import Path

CODE = re.compile(r"[A-Za-z0-9_.-]{1,100}")
VALIDATION_STATES = {"Trusted", "Valid", "Invalid", "trusted", "valid", "invalid"}


def safe_codes(value):
    if isinstance(value, list):
        for item in value:
            yield from safe_codes(item)
    elif isinstance(value, dict):
        code = value.get("code")
        if isinstance(code, str) and CODE.fullmatch(code):
            yield code
        for child in value.values():
            if isinstance(child, (list, dict)):
                yield from safe_codes(child)


def verify(path, tool, trust):
    try:
        result = subprocess.run(
            [
                tool, "--settings", trust, str(path),
            ],
            capture_output=True, timeout=20, check=False,
        )
    except subprocess.TimeoutExpired:
        return {"state": "Unavailable", "codes": [], "reason": "timeout"}
    try:
        decoded = json.loads(result.stdout)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {
            "state": "Unavailable", "codes": [], "reason": "no-json-report",
            "exitCode": result.returncode,
            "errorDigest": hashlib.sha256(result.stderr).hexdigest(),
        }

    report = decoded.get("validation_results", decoded.get("validationResults", {}))
    active_results = report.get("activeManifest", report.get("active_manifest", {}))
    found = set(safe_codes(active_results))
    found.update(safe_codes(decoded.get("validation_status", [])))
    state = decoded.get("validation_state", decoded.get("validationState"))
    return {
        "state": state if state in VALIDATION_STATES else "Unavailable",
        "codes": sorted(found),
        "exitCode": result.returncode,
    }


def add_unsigned_control_chunk(source):
    data = source.read_bytes()
    if data[-8:-4] != b"IEND":
        raise ValueError("Le contrôle doit porter sur un PNG terminé par IEND.")
    payload = b"audit-control\0unsigned-change"
    chunk = b"tEXt" + payload
    return data[:-12] + struct.pack(">I", len(payload)) + chunk + struct.pack(
        ">I", zlib.crc32(chunk)
    ) + data[-12:]


def summarize(rows):
    return {
        "files": len(rows),
        "states": dict(Counter(row["state"] for row in rows)),
        "activeManifestStatusCodes": dict(Counter(
            code for row in rows for code in row["codes"]
        )),
    }


def main(input_report, tool, trust, output):
    inventory = json.loads(Path(input_report).read_bytes())
    rows = []
    for entry in inventory["pngs"]:
        path = Path(entry["path"])
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError(f"{path}: les octets diffèrent du contrôle PNG.")
        rows.append({
            "id": entry["id"], "sha256": entry["sha256"],
            "acceptedReceiptInManifest": entry["acceptedReceiptInManifest"],
            **verify(path, tool, trust),
        })

    missing = [row for row in rows if not row["acceptedReceiptInManifest"]]
    with tempfile.TemporaryDirectory() as temporary:
        changed = Path(temporary) / "negative-control.png"
        baseline = next(item for item in inventory["pngs"] if not item["acceptedReceiptInManifest"])
        changed.write_bytes(add_unsigned_control_chunk(Path(baseline["path"])))
        control = verify(changed, tool, trust)

    outcome = {
        "allFinalFiles": summarize(rows),
        "filesWithoutAcceptedReceipt": summarize(missing),
        "negativeControl": control,
    }
    report = {
        "schemaVersion": 1,
        "auditedCommit": inventory["auditedCommit"],
        "manifestBlob": inventory["manifestBlob"],
        "toolVersion": "c2patool v0.29.0",
        "trustList": "C2PA official signing and TSA conformance trust lists",
        "verificationMode": "offline; active-manifest validation state and status codes only",
        **outcome,
        "pngs": rows,
    }
    Path(output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(outcome))


if __name__ == "__main__":
    main(*sys.argv[1:])
