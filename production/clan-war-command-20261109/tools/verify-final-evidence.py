#!/usr/bin/env python3
"""Read evidence only; --write replaces this lot's verification.json, nothing else.

This is an integrity/consistency collector, not a build, test runner, browser
replay, artistic approval or claim that the remaining P0/P1 work is finished.
Run from any directory. A pending or failed gate exits 1, including with --write.
Derived qualification, registers and the final follow-up workbook are never
inputs: the dependency graph is source/evidence -> verification -> follow-up.
"""

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / "production/clan-war-command-20261109"
FINAL_BUILD = "mdrvYovYvfvhuJqeZXn1D"
INVENTORY_SHA = "862c6199c348efd4bb06ea9ce4e024fcb80465a575aeefd72c421f6d8923c9a0"
SELECTION_SHA = "6c4f96aaf8c590e72a328a2b328ca70b78e8756b51f8ef953d5ab4921eaa9f92"
# Receipt identity is explicit; failed/earlier attempts cannot silently replace it.
RECIPES = [
    ("ui", "next/attempt-4", 18, FINAL_BUILD, "7ac004596473caa54ffc3625fa70a405f2c7d985a7a1b9e8b6beb79507e04913"),
    ("maintenance", "clan-ship-incidents/native-attempt-5", 6, FINAL_BUILD, "038e15353eb4c1a2b4ebac22d2c0a23ed22315de8cf15ea919c7b9ecf0358181"),
    ("mobility", "mobility/campaign-attempt-2", 29, "nItYejsE7HSH4L0ykJM5K", "5af29c4976c6685d3b0053386be61ee9d05b4ae0755bc4854361ea402425b7d3"),
    ("mobility-notice", "mobility/notice-attempt-1", 13, FINAL_BUILD, "e4a32a83e0635c203b4a1038c0542543e2fd2cc13ec5fb267aee594ceeb26c16"),
    ("tutorial", "trophy-tutorial/native-attempt-2", 20, "kS-6-0gmSFRZVosfYvnq6", "999b920aa49e2baea5b4a98607781298f2c33fa36e908d72acf0d36f4ff49aca"),
    ("tutorial-resume", "trophy-tutorial/final-resume-1", 7, "nItYejsE7HSH4L0ykJM5K", "50e811beb3ff9d439e1f644419af6363b9d43d983e434da7b942aba904f40102"),
    ("dialogue", "pr-integration/final-attempt-4/dialogue", 87, None, "afc0d5282b9b9b30b4155dd74f77210e017ca18488ebc5ee1ff311b04838792c"),
    ("hunt-dialogue", "pr-integration/final-attempt-5/hunt-dialogue", 169, None, "87c8cf6bf4ae61b754eef486022b3d247947e3bdcf6fda882801310cce97bfd3"),
    ("pod", "pr-integration/final-attempt-1/pod", 10, "kS-6-0gmSFRZVosfYvnq6", "cbcbe932e2482b3534da8000d9ecb2cd195ee5c6761fc9b0e7bc69fc30aef1c8"),
]
# These exact historical differences are disclosed and bounded by later proof.
# Every other source mismatch remains a gate failure.
HISTORICAL = {
    ("mobility", "app/game/MobilityDrivingYard.tsx"): (
        "64c457b5515592140245a9ee550be4e362dc95250277c7a76c20fc0ff939398d",
        "17c5d57a3d09b1bc702fb550d56f9fa920db1f27d2b5d9d26aa1529cc75f2383",
        "The later 13-check notice complement binds the current yard; the full 29-check drive is not claimed repeated on the final build."),
    ("tutorial", "app/game/GameClient.tsx"): (
        "05d35cd1499f46ceafb061234a4eb3acd6cb62d5294f0a2d49cda77cdc0e7208",
        "a38ec53a9ded4d6a8f0044c92e8fff71c199acd4d53aa1f4ceabbf53f4152343",
        "The full 18-gesture journey is historical. The seven-check resume complement binds current GameClient, unchanged lesson files and checkpoint callback; it is not another full journey."),
    ("pod", ".github/workflows/pod-systems.yml"): (
        "4070ad9da8c1e483af2c95047cb73bacb67095e2e55686751d6388e8b925b7e5",
        "55e5aee7ded80600c28d488fa177708a5182814b5a037baf745d51026ffe7b10",
        "Subsequent audio/CI metadata changed the workflow. The 14 scoped application targets and Pod driver remain identical; unrelated changed app modules are not covered by Pod."),
}


class Collector:
    def __init__(self):
        self.checks = []
        self.artifacts = {}
        self.historical = []
        self.remaps = {}

    def check(self, name, passed, detail=None, pending=False):
        self.checks.append({"name": name, "passed": bool(passed),
                            "status": "pending" if pending else ("passed" if passed else "failed"),
                            "detail": detail})

    def path(self, value, relative_to=ROOT):
        # The cold runner deliberately wrote logs into the primary checkout.
        # Preserve its raw report, but do not require future clones to retain
        # this machine's repository directory name.
        original = str(value)
        prefix = "../yautja-la-longue-chasse/production/clan-war-command-20261109/qa/ci/cold-final/results/"
        if original.startswith(prefix):
            value = "production/clan-war-command-20261109/qa/ci/cold-final/results/" + original[len(prefix):]
            self.remaps[original] = str(value)
            relative_to = ROOT
        p = (relative_to / value).resolve()
        if not p.is_relative_to(ROOT):
            raise ValueError(f"Input outside repository: {value}")
        return p

    def pin(self, value, expected=None, size=None, relative_to=ROOT):
        p = self.path(value, relative_to)
        raw = p.read_bytes()
        h = hashlib.sha256(raw).hexdigest()
        rel = p.relative_to(ROOT).as_posix()
        self.artifacts[rel] = {"sha256": h, "bytes": len(raw)}
        if expected is not None:
            self.check(f"sha:{rel}", h == expected, {"expected": expected, "actual": h})
        if size is not None:
            self.check(f"bytes:{rel}", len(raw) == size, {"expected": size, "actual": len(raw)})
        return raw

    def load(self, value, expected=None, relative_to=ROOT):
        return json.loads(self.pin(value, expected, relative_to=relative_to))

    @staticmethod
    def source_map(value):
        if isinstance(value, list):
            return {x.get("path", x.get("file")): x["sha256"] for x in value}
        if "sources" in value:
            return Collector.source_map(value["sources"])
        return value

    def source_bindings(self, name, source):
        source = self.source_map(source)
        self.check(f"{name}:source-bindings-present", bool(source))
        for file, expected in source.items():
            actual = hashlib.sha256(self.path(file).read_bytes()).hexdigest()
            allowed = HISTORICAL.get((name, file))
            if actual != expected and allowed and (expected, actual) == allowed[:2]:
                self.historical.append({"recipe": name, "path": file,
                                        "historicalSha256": expected, "currentSha256": actual,
                                        "scope": allowed[2]})
            else:
                self.check(f"{name}:current-source:{file}", actual == expected,
                           {"expected": expected, "actual": actual})
        return source

    def browser(self, name, directory, count, build, receipt_sha):
        folder = LOT / "qa" / directory
        receipt = self.load(folder / "final-receipt.json", receipt_sha)
        self.check(f"{name}:receipt-passed", receipt.get("passed") is True)
        for item in receipt.get("files", []):
            self.pin(item["path"], item["sha256"], item.get("bytes"))
        vite = build is None
        report_name = "browser-verification.json" if vite else ("report.json" if name == "pod" else "report.browser-run.json")
        raw = self.load(folder / report_name)
        checks = raw.get("checks", [])
        self.check(f"{name}:checks", len(checks) == count and all(c.get("passed") is True for c in checks),
                   {"expected": count, "actual": len(checks)})
        self.check(f"{name}:raw-passed", raw.get("passed") is True)
        for field in ("errors", "consoleErrors", "httpErrors", "requestFailures", "missingAssets", "failedRequests"):
            if field in raw:
                self.check(f"{name}:empty-{field}", not raw[field])
        if vite:
            ex = receipt["execution"]
            self.check(f"{name}:vite-scope", ex["productionNextGameplayTested"] is False
                       and ex["availableNextBuildIdentityIsInformational"] is True)
            self.pin(ex["script"], ex["scriptSha256"])
            self.pin(folder / "recipe-used.mjs", ex["copiedRecipeSha256"])
            ev = receipt["evidence"]
            for field in ("browserReport", "inspection", "independentReview"):
                if field in ev:
                    self.pin(ev[field], ev[field + "Sha256"], relative_to=folder)
            for item in ev["screenshots"]:
                self.pin(item["file"], item["sha256"], relative_to=folder)
            if "fixtureDisclosureSha256" in ev:
                self.pin("fixture-disclosure.json", ev["fixtureDisclosureSha256"], relative_to=folder)
            sb = receipt["sourceBookend"]
            before = self.load(sb["before"], sb["beforeSha256"], folder)
            after = self.load(sb["after"], sb["afterSha256"], folder)
            before_map, after_map = self.source_map(before["sourceFiles"]), self.source_map(after["sourceFiles"])
            self.check(f"{name}:all-app-bookend", len(before_map) == 1293 and before_map == after_map)
            self.source_bindings(name + "-bookend", after_map)
            self.source_bindings(name, raw["sourceSha256"])
            self.check(f"{name}:contexts", all(c.get("completed") is True for c in raw["contexts"])
                       and sum(c["checks"] for c in raw["contexts"]) == count)
            for fixture in receipt.get("fixtures", [receipt.get("fixture")]):
                if fixture:
                    self.pin(fixture["file"], fixture["sha256"], relative_to=folder)
        elif name == "pod":
            self.check("pod:build-scope", receipt["buildId"] == build
                       and receipt["campaignDiskResumeQualified"] is False
                       and receipt["allAppSourcesBeforeAfterEqual"] is False)
            self.source_bindings(name, raw["sourceHashes"])
        else:
            self.check(f"{name}:historical-source-bookend", raw["sourceBefore"] == raw["sourceAfter"])
            before = raw.get("buildBefore", {}).get("buildId", raw.get("buildIdBefore"))
            after = raw.get("buildAfter", {}).get("buildId", raw.get("buildIdAfter"))
            if before is None:
                before, after = raw["sourceBefore"]["buildId"], raw["sourceAfter"]["buildId"]
            self.check(f"{name}:build-bookend", before == after == receipt["buildId"] == build)
            self.source_bindings(name, raw["sourceBefore"])
        if name == "tutorial":
            replay = self.load(LOT / "qa/trophy-tutorial/native-replay-completed/report.json")
            self.check("tutorial:earned-checkpoint-replay", replay.get("passed") is True
                       and len(replay["checks"]) == 3 and all(c["passed"] for c in replay["checks"])
                       and replay["buildId"] == replay["buildIdAfter"] == build)
        if name == "tutorial-resume":
            self.check("tutorial:resume-scope", receipt["newFull18GestureJourneyClaimed"] is False
                       and receipt["checkpointCallbackIdenticalToFullJourney"] is True
                       and receipt["lessonFilesIdenticalToFullJourney"] == 3)
        if name == "mobility-notice":
            self.check("mobility:notice-complement-scope", receipt["fullMOB001RunRepeatedOnThisBuild"] is False)
        return {"name": name, "receipt": str(folder.relative_to(ROOT) / "final-receipt.json"),
                "sha256": receipt_sha, "checksPassed": count,
                "runtime": "GameClient via Vite; available Next build is informational" if vite else "Production Next/GameClient",
                "buildId": build, "scope": receipt.get("scope", receipt.get("fixtureDisclosure", "")),
                "additionalCheckpointReplayChecks": 3 if name == "tutorial" else 0}

    def test_run(self, path, selection, cold=False):
        data = self.load(path)
        complete = bool(data.get("finishedAt"))
        name = "cold" if cold else "source-tests"
        if cold and not complete:
            self.check("cold:completed", False, {"completedFiles": len(data.get("files", [])), "expectedFiles": 103}, pending=True)
            return {"completed": False, "passed": False, "files": len(data.get("files", [])), "failed": None}
        self.check(f"{name}:completed", complete)
        self.check(f"{name}:selection", data["selectionSha256"] == SELECTION_SHA)
        entries = data.get("files", [])
        self.check(f"{name}:unique-selection", len(entries) == 103
                   and len({x["file"] for x in entries}) == 103
                   and set(x["file"] for x in entries) == set(selection))
        totals = {k: 0 for k in ("tests", "pass", "fail", "skipped", "cancelled", "todo")}
        for entry in entries:
            self.pin(entry["file"], entry["sourceSha256"])
            log = self.pin(entry["log"], entry["logSha256"]).decode()
            parsed = {}
            for key in totals:
                values = re.findall(rf"^# {key} (\d+)\s*$", log, re.MULTILINE)
                parsed[key] = int(values[-1]) if values else None
            self.check(f"{name}:tap:{entry['file']}", parsed == {k: entry[k] for k in totals}, parsed)
            self.check(f"{name}:exit:{entry['file']}", entry["exitCode"] == 0
                       and not entry.get("spawnError") and entry["sourceUnchanged"] is True)
            for key in totals:
                totals[key] += entry[key]
        wanted = {"tests": 1198, "pass": 1198, "fail": 0, "skipped": 0, "cancelled": 0, "todo": 0}
        self.check(f"{name}:totals", totals == data.get("totals") == wanted, totals)
        self.check(f"{name}:passed", data.get("passed") is True)
        return {"completed": complete, "passed": data.get("passed") is True,
                "files": len(entries), "failed": totals["fail"], "totals": totals,
                "node": data["node"], "report": str(self.path(path).relative_to(ROOT))}

    def collect(self):
        build = self.load(LOT / "qa/root/build-ux-final/receipt.json")
        snapshot = self.load(LOT / "qa/root/build-ux-final/source-before.json")
        buildlog = self.pin(LOT / "qa/root/build-ux-final/build.log").decode()
        self.check("build:exit", build["exitCode"] == 0 and build["appSourceUnchanged"] is True)
        self.check("build:log", "Compiled successfully" in buildlog and "Generating static pages" in buildlog)
        self.check("build:identity", self.pin(".next/BUILD_ID").decode().strip() == build["buildId"] == FINAL_BUILD)
        app = self.source_map(snapshot["files"])
        current_app = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in sorted((ROOT / "app").rglob("*")) if p.is_file()}
        self.check("build:all-app-bytes", len(app) == build["sourceFiles"] == 1293 and app == current_app)
        lint = self.load(LOT / "qa/root/lint-final/receipt.json")
        eslint = self.load(LOT / "qa/root/lint-final/eslint.json")
        self.pin(LOT / "qa/root/lint-final/eslint.log")
        self.pin("eslint.config.mjs", lint["configSha256"])
        self.check("lint:exit-and-counts", lint["exitCode"] == lint["errors"] == lint["warnings"] == 0
                   and len(eslint) == lint["files"] == 2803
                   and all(x["errorCount"] == x["fatalErrorCount"] == x["warningCount"] == 0 for x in eslint))
        inventory = self.load(LOT / "suivi/source-inventory.json", INVENTORY_SHA)
        self.check("inventory:counts", inventory["counts"]["workbooks"] == 119
                   and inventory["counts"]["historicalWorkbooks"] == 113 and len(inventory["sources"]) == 125)
        for source in inventory["sources"]:
            self.pin(source["path"], source["sha256"], source["bytes"])
        selection = self.load(LOT / "qa/ci/test-selection.json", SELECTION_SHA)
        runtime = self.load(LOT / "qa/ci/runtime-file-inputs.json")
        self.check("runtime-inputs:selection", runtime["selectionSha256"] == SELECTION_SHA)
        for source in runtime["files"]:
            self.pin(source["path"], source["sha256"], source["bytes"])
        source_tests = self.test_run(LOT / "qa/ci/final-source-report.json", selection)
        cold = self.test_run(LOT / "qa/ci/cold-final/results/report.json", selection, cold=True)
        preparation = self.load(LOT / "qa/ci/cold-final/preparation.json")
        self.check("cold:preparation", preparation["includeExitCode"] == 0)
        browsers = [self.browser(*recipe) for recipe in RECIPES]
        self.check("historical:exact-disclosed-exceptions", len(self.historical) == 3)
        source_paths = set()
        for directory in ("app", "scripts", "tests"):
            source_paths.update(p for p in (ROOT / directory).rglob("*")
                                if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc")
        for pattern in ("package*.json", "tsconfig*.json", "*.config.*", ".github/workflows/*",
                        "desktop/*config*", "desktop/package*.json", ".gitignore", ".nvmrc"):
            source_paths.update(p for p in ROOT.glob(pattern) if p.is_file())
        source_paths.add(Path(__file__).resolve())
        source_paths.update(LOT / "qa/ci" / f for f in ("test-selection.json", "runtime-file-inputs.json"))
        runtime_snapshot = "docs/qa/current-integration-20261103/runtime-inputs.json"
        self.pin(runtime_snapshot, "1a31e3857697c51c56742203a946986b536a99060cfebfbfbd61e45a009ac986")
        source_paths.add(ROOT / runtime_snapshot)
        sources = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                   for p in sorted(source_paths)}
        failed = [x for x in self.checks if not x["passed"] and x["status"] != "pending"]
        pending = [x for x in self.checks if x["status"] == "pending"]
        passed = not failed and not pending and cold["completed"] and cold["passed"]
        return {"schemaVersion": 1, "generatedAt": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "passed": passed, "finalVerification": {"passed": passed, "pending": bool(pending)},
                "allP0P1Closed": False,
                "scope": "Read-only integrity and scope collector. Source tests and the cold replay exercise the same 103 files/1198 cases and are not added together. Browser checks are bounded replays, not newly unique tests or a whole-campaign/art/device qualification.",
                "build": build, "lint": lint,
                "tests": {"failed": cold["failed"] if cold["completed"] else None,
                          "passed": cold.get("totals", {}).get("pass") if cold["completed"] else None,
                          "files": cold["files"], "cold": cold, "preColdSourceRun": source_tests,
                          "coldDependencies": preparation["dependencies"]},
                "browserReceipts": browsers, "boundedBrowserChecksIncludingReplay": 362,
                "historicalSourceDifferences": self.historical,
                "sourceInventory": {"path": "production/clan-war-command-20261109/suivi/source-inventory.json", "sha256": INVENTORY_SHA},
                "sourceSha256": sources, "artifactPins": self.artifacts,
                "pathRemaps": self.remaps,
                "checks": self.checks, "failedChecks": failed, "pendingChecks": pending,
                "excludedDerivedInputs": ["qualification", "final register", "final follow-up XLSX", "verification.json itself"],
                "limitations": ["Local cold checkout shares the locked node_modules and is not a new npm ci.",
                                "Remote X11 spatial CI, physical controller/mobile operation, human art approval and all outstanding P0/P1 closure are not implied.",
                                "Historical Next builds and Vite are preserved explicitly per receipt; no older run is relabeled as final-build gameplay."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Only write this lot's verification.json; never change an input")
    mode.add_argument("--check", action="store_true", help="Read-only: recompute and compare stable fields with the saved verification.json")
    args = parser.parse_args()
    collector = Collector()
    try:
        result = collector.collect()
        if args.check:
            saved = json.loads((LOT / "verification.json").read_bytes())
            # Git HEAD and collection time can advance through metadata-only
            # commits; source bytes and every evidence binding must stay equal.
            stable = ("passed", "finalVerification", "allP0P1Closed", "build", "lint", "tests",
                      "browserReceipts", "historicalSourceDifferences", "sourceInventory",
                      "sourceSha256", "artifactPins", "pathRemaps")
            different = [key for key in stable if saved.get(key) != result.get(key)]
            if different:
                result["passed"] = False
                result["finalVerification"]["passed"] = False
                result["error"] = "Saved verification differs in stable fields: " + ", ".join(different)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        result = {"schemaVersion": 1, "passed": False, "finalVerification": {"passed": False},
                  "allP0P1Closed": False, "tests": {"failed": None},
                  "error": f"Evidence collection incomplete: {type(exc).__name__}: {exc}",
                  "checks": collector.checks, "artifactPins": collector.artifacts}
    if args.write:
        (LOT / "verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: result.get(k) for k in ("passed", "finalVerification", "error", "failedChecks", "pendingChecks")}, ensure_ascii=False))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
