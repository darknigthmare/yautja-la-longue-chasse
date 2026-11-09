#!/usr/bin/env python3
"""Read-only integrity check of the bounded council component receipts."""
import hashlib
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]


def read(path):
    return json.loads(path.read_text())


def verify():
    folder = BASE / "attempt-6"
    receipt = read(folder / "final-receipt.json")
    for item in receipt["files"]:
        path = ROOT / item["path"]
        assert path.resolve().is_relative_to(ROOT)
        raw = path.read_bytes()
        assert len(raw) == item["bytes"], item["path"]
        assert hashlib.sha256(raw).hexdigest() == item["sha256"], item["path"]
    raw = read(folder / "report.browser-run.json")
    report = read(folder / "report.json")
    inspection = read(folder / "screenshot-inspection.json")
    assert raw["passed"] is True and len(raw["checks"]) == 25
    assert all(row["passed"] for row in raw["checks"])
    assert raw["sourceBefore"] == raw["sourceAfter"]
    assert raw["errors"] == raw["httpErrors"] == []
    assert report["screenshotsOpened"] == 10
    assert inspection["allOriginalPngsOpened"] is True
    assert len(inspection["screenshots"]) == 10
    assert all(row["opened"] for row in inspection["screenshots"])
    assert inspection["humanArtCertified"] is False
    unit = read(BASE / "unit-1/report.json")
    assert unit["passed"] is True and unit["totals"]["pass"] == 56
    for row in unit["files"]:
        log = (BASE / "unit-1" / (Path(row["file"]).name + ".tap")).read_text()
        assert sum(map(int, re.findall(r"^# pass (\d+)$", log, re.M))) == row["pass"]
        assert sum(map(int, re.findall(r"^# fail (\d+)$", log, re.M))) == 0
        assert row["sourceUnchanged"] and row["exitCode"] == 0
    local = read(BASE / "v94-headless-1/receipt.json")
    assert local["passed"] is False and local["headedNativeFocusQualified"] is False
    assert sum(row["status"] == "PASS" for row in local["results"]) == 8
    failed = [row for row in local["results"] if row["status"] == "FAIL"]
    assert len(failed) == 1
    assert failed[0]["error"].startswith("Native focus scenario requires headed Chrome")
    return {"passed": True, "componentChecks": 25, "originalPngsOpened": 10,
            "existingDomainRegressions": 56, "existingHeadlessChecksPassed": 8,
            "headedFocusStillUnqualifiedLocally": True,
            "scope": "Receipt hashes, raw TAP counts, source-before/after claims and inspection records only. No new game/browser/hardware run; no requirement that a future checkout match a dated source."}


if __name__ == "__main__":
    print(json.dumps(verify()))
