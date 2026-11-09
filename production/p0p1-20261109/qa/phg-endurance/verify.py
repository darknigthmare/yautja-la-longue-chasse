#!/usr/bin/env python3
"""Read-only integrity check of a completed T15 receipt; no gameplay rerun."""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def check(folder):
    receipt = json.loads((folder / "final-receipt.json").read_text())
    for item in receipt["files"]:
        path = ROOT / item["path"]
        assert path.resolve().is_relative_to(ROOT), "receipt path escapes the repository"
        raw = path.read_bytes()
        assert len(raw) == item["bytes"], item["path"]
        assert digest(raw) == item["sha256"], item["path"]
    raw = json.loads((folder / "report.browser-run.json").read_text())
    final = json.loads((folder / "report.json").read_text())
    analysis = json.loads((folder / "memory-analysis.json").read_text())
    compressed = (folder / "memory-trace.json.gz").read_bytes()
    trace = gzip.decompress(compressed)
    assert digest(trace) == raw["memoryTrace"]["sha256"]
    assert len(trace) == raw["memoryTrace"]["bytes"]
    assert analysis["inputTrace"]["decompressedSha256"] == digest(trace)
    assert raw["nativeRunPassed"] is True
    assert raw["requestedNativeDurationCompleted"] is True
    assert raw["probe"] is False
    assert raw["elapsedSeconds"] >= 3600
    assert raw["samples"][-1]["visibleMs"] >= 3_600_000
    assert len({item["materialId"] for item in raw["selections"]}) == 77
    assert raw["sourceBefore"]["sha256"] == raw["sourceAfter"]["sha256"]
    assert raw["buildBefore"]["sha256"] == raw["buildAfter"]["sha256"]
    assert raw["materialAssetsBefore"]["sha256"] == raw["materialAssetsAfter"]["sha256"]
    assert all(analysis["checks"].values()), "some declared T15 bounds are not established"
    assert final["gpuLeakCriterionQualified"] is True
    assert analysis["gpuLeakCriterionQualifiedWithinObservedBackend"] is True
    assert analysis["physicalGpuOrVramQualified"] is False
    inspection = json.loads((folder / "screenshot-inspection.json").read_text())
    assert inspection["allOriginalsOpened"] is True
    screenshots = {item["filename"]: item for item in raw["screenshots"]}
    assert set(screenshots) == {item["filename"] for item in inspection["screenshots"]}
    for name, item in screenshots.items():
        assert digest((folder / name).read_bytes()) == item["sha256"], name
    count = collections.Counter(item["materialId"] for item in raw["selections"])
    return {"passed": True, "scope": "Receipt, raw trace decompression, memory-bound evaluation, source identities and original screenshot integrity only. No new gameplay, hardware or sixty-minute run performed by this verifier.",
            "elapsedSeconds": raw["elapsedSeconds"], "materials": len(count), "selections": len(raw["selections"]),
            "minimumSelectionsPerMaterial": min(count.values()), "screenshotsOpened": len(screenshots),
            "gpuBackend": "software SwiftShader" if analysis["softwareBackend"] else "observed Chromium backend",
            "physicalGpuOrVramQualified": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=BASE / "attempt-1")
    args = parser.parse_args()
    print(json.dumps(check(args.input.resolve())))
