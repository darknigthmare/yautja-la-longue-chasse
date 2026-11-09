#!/usr/bin/env python3
"""Read-only integrity verification of the dated production Next receipt."""
import argparse
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]


def read(path):
    return json.loads(path.read_text())


def verify(attempt=None):
    candidates = [p for p in BASE.glob("attempt-*") if (p / "final-receipt.json").exists()]
    folder = BASE / f"attempt-{attempt}" if attempt is not None else max(candidates, key=lambda p: int(p.name.rsplit("-", 1)[1]))
    receipt = read(folder / "final-receipt.json")
    for item in receipt["files"]:
        path = ROOT / item["path"]
        assert path.resolve().is_relative_to(ROOT)
        raw = path.read_bytes()
        if item["path"] == "scripts/qa-clan-war-command-next-20261109.mjs" and hashlib.sha256(raw).hexdigest() != item["sha256"]:
            # The maintained driver can evolve; its dated executed copy is the
            # immutable evidence. This does not qualify the changed driver.
            raw = (folder / "recipe-used.mjs").read_bytes()
        assert len(raw) == item["bytes"], item["path"]
        assert hashlib.sha256(raw).hexdigest() == item["sha256"], item["path"]
    report = read(folder / "report.browser-run.json")
    assert report["passed"] is True and len(report["checks"]) == receipt["nativeChecksPassed"] > 0
    assert all(item["passed"] for item in report["checks"])
    assert report["buildIdBefore"] == report["buildIdAfter"] == receipt["buildId"]
    assert report["sourceBefore"] == report["sourceAfter"]
    assert len(report["sourceBefore"]) == 20
    assert all(item["matches"] for item in report["servedScripts"])
    assert len(report["servedScripts"]) == receipt["servedScriptResponses"] > 0
    assert not any(report[name] for name in ["errors", "consoleErrors", "httpErrors", "requestFailures"])
    before = (folder / "campaign-before.json").read_bytes()
    after = (folder / "campaign-after.json").read_bytes()
    assert before == after and len(before) == receipt["campaignBytes"]
    assert hashlib.sha256(before).hexdigest() == receipt["campaignSha256"]
    validation = read(folder / "save-validation.json")
    assert validation["passed"] and validation["bytesIdentical"]
    assert validation["sourceBefore"] == validation["sourceAfter"]
    assert len(validation["checks"]) == 2
    assert all(row["passed"] and row["failure"] is None and row["sameOwnerAfterParse"] for row in validation["checks"])
    inspection = read(folder / "screenshot-inspection.json")
    assert inspection["allOriginalPngsOpened"] and inspection["screenshotsOpened"] == 7
    assert all(row["opened"] for row in inspection["screenshots"])
    header_checks = [row for row in report["checks"] if "council-title-and-exit-clear-the-actual-global-HUD" in row["name"]]
    if receipt.get("headerClearanceQualified"):
        assert len(header_checks) == 3 and inspection["headerClearanceQualified"] is True
        for row in header_checks:
            bottom = row["topBar"]["y"] + row["topBar"]["height"]
            assert row["title"]["y"] >= bottom - 1 and row["quitBounds"]["y"] >= bottom - 1
    return {"passed": True, "nativeNextChecks": receipt["nativeChecksPassed"], "originalScreenshotsOpened": 7,
            "attempt": folder.name, "headerClearanceQualified": receipt.get("headerClearanceQualified", False),
            "campaignBytesIdentical": len(before), "nativeBuildId": receipt["buildId"],
            "scope": "Receipt, actual stored artifact hashes and observed source identities only. No new browser, game, hardware or artistic qualification executed by this verifier."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempt", type=int)
    args = parser.parse_args()
    print(json.dumps(verify(args.attempt)))
