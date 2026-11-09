#!/usr/bin/env python3
"""Read-only verification of the bounded final-runtime trophy reprise evidence."""
import hashlib
import json
from pathlib import Path


BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]


def load(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


receipt = load(BASE / "final-receipt.json")
for item in receipt["files"]:
    path = ROOT / item["path"]
    assert path.is_file(), item["path"]
    assert path.stat().st_size == item["bytes"], item["path"]
    assert sha(path) == item["sha256"], item["path"]

raw = load(BASE / "report.browser-run.json")
assert raw["passed"] and raw["checksPassed"] == 7 and raw["checksFailed"] == 0
assert len(raw["checks"]) == 7 and all(row["passed"] for row in raw["checks"])
assert raw["sourceBeforeAfterEqual"] and raw["sourceBefore"] == raw["sourceAfter"]
assert raw["buildBeforeAfterEqual"] and raw["buildBefore"] == raw["buildAfter"]
assert raw["buildBefore"]["buildId"] == "nItYejsE7HSH4L0ykJM5K"
assert raw["unchangedLessonFilesComparedToFullJourney"] == 3
assert raw["checkpointCallbackIdenticalToPrevious"]
assert raw["broaderGameClientChanged"]
assert not any(raw[key] for key in ["errors", "consoleErrors", "requestFailures", "httpErrors"])
assert len(raw["servedScripts"]) == 64
assert len({row["path"] for row in raw["servedScripts"]}) == 32
assert all(row["matched"] and row["sha256"] == row["compiledSha256"] for row in raw["servedScripts"])
assert len(raw["documents"]) == 2
assert all(row["found"] and row["buildId"] == receipt["buildId"] for row in raw["documents"])
assert not raw["currentNurseryOrYoungBloodRiteQualified"]
assert not raw["physicalControllerTested"] and not raw["humanArtApproved"]

origin_path = ROOT / raw["input"]["path"]
assert sha(origin_path) == raw["input"]["sha256"]
old_receipt = load(BASE.parent / "native-attempt-2/final-receipt.json")
assert any(row["path"] == raw["input"]["path"] and row["sha256"] == raw["input"]["sha256"] for row in old_receipt["files"])
origin = load(origin_path)["save"]
resumed = load(BASE / "01-resumed-face-save.json")
confirmed = load(BASE / "02-confirmed-view-gesture-save.json")
reloaded = load(BASE / "03-reloaded-confirmed-save.json")
first = resumed["trophyTutorialV6"]
last = confirmed["trophyTutorialV6"]
assert first == origin["trophyTutorialV6"]
assert (first["completedSteps"], first["revision"]) == (8, 9)
assert (last["completedSteps"], last["revision"]) == (9, 12)
assert last["events"][:9] == first["events"]
assert len(last["events"]) == 12
assert last["events"][9]["values"] == {"view": "profile"}
assert last["events"][10]["values"] == {"view": "reverse"}
assert last["events"][11]["values"] == {"views": ["face", "profile", "reverse"]}
for field in ["owner", "objectId", "actor", "walked", "objectLocation"]:
    assert last[field] == first[field], field
assert reloaded["trophyTutorialV6"] == last
for field in ["profile", "trophies", "missionProgress"]:
    assert origin[field] == resumed[field] == confirmed[field] == reloaded[field], field

inspection = load(BASE / "screenshot-inspection.json")
assert len(inspection["screenshots"]) == 4
assert all(row["opened"] for row in inspection["screenshots"])
assert sha(BASE / "run.mjs") == sha(BASE / "recipe-used.mjs")
assert load(BASE / "lint.json")["exitCode"] == 0
print(f"PASS {len(receipt['files'])} SHA-256 pins; 7 bounded current-runtime checks; exact earned checkpoint and reload")
