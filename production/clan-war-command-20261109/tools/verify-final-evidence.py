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
LEGACY_BUILD = "mdrvYovYvfvhuJqeZXn1D"
FINAL_BUILD = "-FZ8BLkijX4wYooxQn-in"
HELPER = "app/game/systems/trophyTutorialV6.ts"
OLD_HELPER_SHA = "65e735198930e048fcafc16ba89c8debeb9303f5d636463b62394520454cb0be"
NEW_HELPER_SHA = "749b167facdf4b4eed079d84ea8c35ad2470d5b5ab6aeb8f2e4c20e3c9f8ffc9"
COMPATIBLE_HISTORICAL_SCOPES = {"dialogue-bookend", "hunt-dialogue-bookend", "tutorial-resume", "planets-bookend"}
INVENTORY_SHA = "862c6199c348efd4bb06ea9ce4e024fcb80465a575aeefd72c421f6d8923c9a0"
SELECTION_SHA = "6c4f96aaf8c590e72a328a2b328ca70b78e8756b51f8ef953d5ab4921eaa9f92"
# Receipt identity is explicit; failed/earlier attempts cannot silently replace it.
RECIPES = [
    ("ui", "next/attempt-5", 18, FINAL_BUILD, "b6bf2f4f6496e4d91fc466502becb0fccd46749c03e7646446c22af5768c670a"),
    ("maintenance", "clan-ship-incidents/native-attempt-5", 6, LEGACY_BUILD, "038e15353eb4c1a2b4ebac22d2c0a23ed22315de8cf15ea919c7b9ecf0358181"),
    ("mobility", "mobility/campaign-attempt-2", 29, "nItYejsE7HSH4L0ykJM5K", "5af29c4976c6685d3b0053386be61ee9d05b4ae0755bc4854361ea402425b7d3"),
    ("mobility-notice", "mobility/notice-attempt-1", 13, LEGACY_BUILD, "e4a32a83e0635c203b4a1038c0542543e2fd2cc13ec5fb267aee594ceeb26c16"),
    ("tutorial", "trophy-tutorial/compat-final", 20, FINAL_BUILD, "7132fb95336a50e64ef5a5200c8c68a516de2b624e108783ae4627743c33d9ed"),
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
        self.compatibility = None
        self.compatibility_bindings = {}

    def check(self, name, passed, detail=None, pending=False):
        self.checks.append({"name": name, "passed": bool(passed),
                            "status": "pending" if pending else ("passed" if passed else "failed"),
                            "detail": detail})

    def path(self, value, relative_to=ROOT):
        # The cold runner deliberately wrote logs into the primary checkout.
        # Preserve its raw report, but do not require future clones to retain
        # this machine's repository directory name.
        original = str(value)
        for folder in ("cold-final", "cold-compat-final"):
            prefix = f"../yautja-la-longue-chasse/production/clan-war-command-20261109/qa/ci/{folder}/results/"
            if original.startswith(prefix):
                value = f"production/clan-war-command-20261109/qa/ci/{folder}/results/" + original[len(prefix):]
                self.remaps[original] = str(value)
                relative_to = ROOT
                break
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
            elif (actual != expected and name in COMPATIBLE_HISTORICAL_SCOPES and file == HELPER
                  and expected == OLD_HELPER_SHA and actual == NEW_HELPER_SHA
                  and self.compatibility and self.compatibility["passed"]):
                self.compatibility_bindings[name] = {
                    "recipe": name, "path": file, "historicalSha256": expected, "currentSha256": actual,
                    "scope": "Dated proof remains on its original build. Only the exact absent-optional-ledger guard permutation is accepted; valid-owner and every present-ledger validation are unchanged. Current tutorial20+3 and31/213/280 regressions qualify the corrected helper separately."}
            else:
                self.check(f"{name}:current-source:{file}", actual == expected,
                           {"expected": expected, "actual": actual})
        return source

    def compatibility_delta(self, current_app):
        folder = LOT / "qa/ci/trophy-absence-compatibility"
        capsule = self.load(folder / "source-delta.json")
        for item in capsule["files"]:
            self.pin(item["path"], item["sha256"], item["bytes"])
        before = self.pin(folder / "before-source.txt", OLD_HELPER_SHA)
        after = self.pin(folder / "after-source.txt", NEW_HELPER_SHA)
        absent = b"  if (raw === undefined) return { status: 'absent', state: null, reason: '' };\n"
        owner = "  if (!ownerValid(owner)) return invalid('Propriétaire de campagne invalide.');\n".encode()
        exact = (before.count(owner + absent) == 1 and before.replace(owner + absent, absent + owner, 1) == after
                 and capsule["applicationPath"] == HELPER and capsule["beforeSha256"] == OLD_HELPER_SHA
                 and capsule["afterSha256"] == NEW_HELPER_SHA and capsule["exactApplicationEditVerified"] is True)
        old_snapshot = self.load(LOT / "qa/root/build-ux-final/source-before.json")
        old_app = self.source_map(old_snapshot["files"])
        changed = [p for p in sorted(set(old_app) | set(current_app)) if old_app.get(p) != current_app.get(p)]
        exact = exact and len(old_app) == len(current_app) == 1293 and changed == [HELPER]
        self.check("compatibility:exact-two-guard-permutation", exact, changed)
        self.pin(HELPER, NEW_HELPER_SHA)
        return {"passed": exact, "path": HELPER, "beforeSha256": OLD_HELPER_SHA,
                "afterSha256": NEW_HELPER_SHA, "unchangedAppFiles": 1292,
                "changedAppPaths": changed, "previousBuildId": LEGACY_BUILD,
                "currentBuildId": FINAL_BUILD,
                "scope": capsule["scope"], "oldReceiptsRelabeled": False}

    def served_scripts(self, name, rows, flag, current_build=False):
        self.check(f"{name}:served-scripts-nonempty", isinstance(rows, list) and bool(rows))
        self.check(f"{name}:served-script-matches", bool(rows) and all(
            row.get(flag) is True and re.fullmatch(r"[0-9a-f]{64}", row.get("sha256", ""))
            and all(row[other] == row["sha256"] for other in ("builtSha256", "buildSha256", "compiledSha256") if other in row)
            for row in rows))
        if current_build:
            for row in rows:
                pathname = row.get("pathname", row.get("path", ""))
                compiled = ".next/" + pathname[len("/_next/"):] if pathname.startswith("/_next/") else pathname
                self.check(f"{name}:compiled-path", compiled.startswith(".next/static/"), compiled)
                self.pin(compiled, row["sha256"], row.get("bytes"))

    def browser(self, name, directory, count, build, receipt_sha):
        folder = LOT / "qa" / directory
        receipt = self.load(folder / "final-receipt.json", receipt_sha)
        self.check(f"{name}:receipt-passed", receipt.get("passed") is True)
        for item in receipt.get("files", []):
            if name == "tutorial-resume" and item["path"] == HELPER:
                self.source_bindings(name, {HELPER: item["sha256"]})
                self.pin(item["path"], size=item.get("bytes"))
            else:
                self.pin(item["path"], item["sha256"], item.get("bytes"))
        vite = build is None
        report_name = "browser-verification.json" if vite else ("report.json" if name == "pod" else "report.browser-run.json")
        if name == "tutorial":
            report_name = "native-full-1/report.browser-run.json"
        raw = self.load(folder / report_name)
        checks = raw.get("checks", [])
        self.check(f"{name}:checks", len(checks) == count and all(c.get("passed") is True for c in checks),
                   {"expected": count, "actual": len(checks)})
        self.check(f"{name}:raw-passed", raw.get("passed") is True)
        for field in ("errors", "consoleErrors", "httpErrors", "requestFailures", "missingAssets", "failedRequests"):
            if field in raw:
                self.check(f"{name}:empty-{field}", not raw[field])
        if not vite and name != "pod":
            flag = "matches" if name in {"ui", "maintenance"} else ("matchesBuiltFile" if name.startswith("mobility") else "matched")
            self.served_scripts(name, raw.get("servedScripts", []), flag, current_build=build == FINAL_BUILD)
            if name.startswith("mobility"):
                self.served_scripts(name + "-css", raw.get("servedStyles", []), "matchesBuiltFile")
            if name == "tutorial":
                documents = raw.get("servedDocuments", [])
                self.check("tutorial:served-build-documents", bool(documents) and all(
                    row.get("foundBuildId") is True and row.get("status") == 200 and row.get("buildId") == FINAL_BUILD
                    for row in documents))
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
            replay = self.load(folder / "native-replay-completed-1/report.json")
            self.check("tutorial:earned-checkpoint-replay", replay.get("passed") is True
                       and len(replay["checks"]) == 3 and all(c["passed"] for c in replay["checks"])
                       and replay["buildId"] == replay["buildIdAfter"] == build)
            self.check("tutorial:replay-source-bookend", replay["sourceBeforeAfterEqual"] is True
                       and replay["sourceBefore"] == replay["sourceAfter"] and not replay["errors"])
            self.source_bindings("tutorial-replay", replay["sourceBefore"])
            self.served_scripts("tutorial-replay", replay.get("scripts", []), "matched", current_build=True)
        if name == "tutorial-resume":
            self.check("tutorial:resume-scope", receipt["newFull18GestureJourneyClaimed"] is False
                       and receipt["checkpointCallbackIdenticalToFullJourney"] is True
                       and receipt["lessonFilesIdenticalToFullJourney"] == 3)
        if name == "mobility-notice":
            self.check("mobility:notice-complement-scope", receipt["fullMOB001RunRepeatedOnThisBuild"] is False)
        receipt_path = str(folder.relative_to(ROOT) / "final-receipt.json")
        return {"name": name, "receipt": receipt_path,
                "sha256": self.artifacts[receipt_path]["sha256"], "checksPassed": count,
                "runtime": "GameClient via Vite; available Next build is informational" if vite else "Production Next/GameClient",
                "buildId": build, "scope": receipt.get("scope", receipt.get("fixtureDisclosure", "")),
                "additionalCheckpointReplayChecks": 3 if name == "tutorial" else 0}

    def test_run(self, path, selection, cold=False, current_sources=True):
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
            if current_sources:
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
                "node": data["node"], "report": str(self.path(path).relative_to(ROOT)),
                "currentSourceQualification": current_sources,
                "historicalTestSources": None if current_sources else {entry["file"]: entry["sourceSha256"] for entry in entries}}

    def spec_receipt(self, relative, count):
        p = LOT / relative
        receipt = self.load(p)
        wanted = {"tests": count, "pass": count, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}
        self.check(f"spec:{relative}:counts", receipt["passed"] is True and receipt["exitCode"] == 0
                   and receipt["counts"] == wanted and receipt["testSourcesBeforeAfterEqual"] is True)
        sources = receipt["sources"]
        declared = [arg for arg in receipt["command"] if arg.startswith("tests/") and arg.endswith(".test.mjs")]
        paths = [source["path"] for source in sources]
        self.check(f"spec:{relative}:complete-test-bindings", len(sources) == {31: 2, 213: 13, 280: 23}[count]
                   and len(set(paths)) == len(paths) and set(paths) == set(declared) and len(declared) == len(paths))
        for source in receipt["sources"]:
            self.pin(source["path"], source["sha256"])
        log = self.pin(receipt["log"], receipt["logSha256"], relative_to=p.parent).decode()
        log = re.sub(r"\x1b\[[0-9;]*m", "", log)
        parsed = {}
        for key in wanted:
            values = re.findall(rf"^ℹ\s+{key}\s+(\d+)\s*$", log, re.MULTILINE)
            parsed[key] = int(values[-1]) if values else None
        self.check(f"spec:{relative}:footer", parsed == wanted, parsed)
        self.check(f"spec:{relative}:helper", receipt["appFile"] == HELPER
                   and receipt["appSha256Before"] == receipt["appSha256After"] == NEW_HELPER_SHA)
        return {"receipt": str(p.relative_to(ROOT)), "counts": wanted,
                "cliOnly": True, "addedTo1198UniqueCount": False,
                "sha256": self.artifacts[str(p.relative_to(ROOT))]["sha256"]}

    def planet_receipt(self):
        folder = LOT / "qa/ci/planet"
        receipt = self.load(folder / "final-receipt.json", "a14e3613bd4f4af1cd4a5efbc25fc9ffaecf477c52f666790d27086ae7b71f8a")
        self.check("planets:receipt", receipt["passed"] is True and receipt["nativeChecksPassed"] == 89
                   and receipt["nativeChecksFailed"] == 0 and receipt["buildId"] == LEGACY_BUILD)
        for item in receipt["files"]:
            self.pin(item["path"], item["sha256"], item["bytes"])
        for recipe in receipt["recipes"]:
            raw = self.load(recipe["report"], recipe["reportSha256"])
            self.check(f"planets:{recipe['name']}:checks", len(raw["checks"]) == recipe["checks"]
                       and (raw.get("passed") is True or raw.get("ok") is True or raw.get("status") == "PASS"))
        before = self.load(folder / "source-before.json")
        after = self.load(folder / "source-after.json")
        self.check("planets:app-bookend", before["sourceFiles"] == after["sourceFiles"]
                   and before["buildId"] == after["buildId"] == LEGACY_BUILD)
        self.source_bindings("planets-bookend", after["sourceFiles"])
        self.source_bindings("planets", receipt["sourceSha256"])
        return {"receipt": str((folder / "final-receipt.json").relative_to(ROOT)),
                "checksPassed": 89, "buildId": LEGACY_BUILD, "scope": receipt["scope"],
                "sha256": self.artifacts[str((folder / "final-receipt.json").relative_to(ROOT))]["sha256"]}

    def collect(self):
        build = self.load(LOT / "qa/root/build-compat-final/receipt.json")
        snapshot = self.load(LOT / "qa/root/build-compat-final/source-before.json")
        buildlog = self.pin(LOT / "qa/root/build-compat-final/build.log").decode()
        self.check("build:exit", build["exitCode"] == 0 and build["appSourceUnchanged"] is True)
        self.check("build:log", "Compiled successfully" in buildlog and "Generating static pages" in buildlog)
        self.check("build:identity", self.pin(".next/BUILD_ID").decode().strip() == build["buildId"] == FINAL_BUILD)
        app = self.source_map(snapshot["files"])
        current_app = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in sorted((ROOT / "app").rglob("*")) if p.is_file()}
        self.check("build:all-app-bytes", len(app) == build["sourceFiles"] == 1293 and app == current_app)
        self.compatibility = self.compatibility_delta(current_app)
        lint = self.load(LOT / "qa/root/lint-ci-final/receipt.json")
        eslint = self.load(LOT / "qa/root/lint-ci-final/eslint.json")
        self.pin(LOT / "qa/root/lint-ci-final/eslint.log")
        self.pin("eslint.config.mjs", lint["configSha256"])
        self.check("lint:exit-and-counts", lint["exitCode"] == lint["errors"] == lint["warnings"] == 0
                   and len(eslint) == lint["files"] and len(eslint) > 0
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
        # This earlier report remains an immutable historical log binding. Its
        # source tests predate the current compatibility assertions; only the
        # new cold run qualifies the current103-file selection.
        source_tests = self.test_run(LOT / "qa/ci/final-source-report.json", selection, current_sources=False)
        cold = self.test_run(LOT / "qa/ci/cold-compat-final/results/report.json", selection, cold=True)
        preparation = self.load(LOT / "qa/ci/cold-compat-final/preparation.json")
        self.check("cold:preparation", preparation["includeExitCode"] == 0
                   and preparation["sourceCommit"] == "e18602ed22bd1e1e6b80b8b4703c88d4ef6faaa5")
        browsers = [self.browser(*recipe) for recipe in RECIPES]
        planets = self.planet_receipt()
        domains = [self.spec_receipt(path, count) for path, count in [
            ("qa/ci/models-persistence-repair/tutorial-green.json", 31),
            ("qa/ci/models-persistence-repair/green.json", 213),
            ("qa/ci/models-clan-war-repair/green.json", 280)]]
        self.check("historical:exact-disclosed-exceptions",
                   {(item["recipe"], item["path"]) for item in self.historical} == set(HISTORICAL))
        self.check("compatibility:only-reviewed-old-source-bindings",
                   set(self.compatibility_bindings) == COMPATIBLE_HISTORICAL_SCOPES)
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
        self.pin(runtime_snapshot, "9b4ada40cef0556f5ee4ff92dbb2982946e529070c7d05dd113e54502c3afbb8")
        source_paths.add(ROOT / runtime_snapshot)
        sources = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                   for p in sorted(source_paths)}
        failed = [x for x in self.checks if not x["passed"] and x["status"] != "pending"]
        pending = [x for x in self.checks if x["status"] == "pending"]
        passed = not failed and not pending and cold["completed"] and cold["passed"]
        return {"schemaVersion": 2, "generatedAt": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "passed": passed, "finalVerification": {"passed": passed, "pending": bool(pending)},
                "allP0P1Closed": False,
                "scope": "Read-only integrity and scope collector. Source tests and the cold replay exercise the same 103 files/1198 cases and are not added together. Browser checks are bounded replays, not newly unique tests or a whole-campaign/art/device qualification.",
                "build": build, "lint": lint,
                "tests": {"failed": cold["failed"] if passed or (cold["failed"] or 0) > 0 else None,
                          "passed": cold.get("totals", {}).get("pass") if passed else None,
                          "files": cold["files"], "cold": cold, "preColdSourceRun": source_tests,
                          "coldDependencies": preparation["dependencies"]},
                "browserReceipts": browsers, "boundedBrowserChecksIncludingReplay": 362,
                "supplementalPlanetReceipts": planets,
                "compatibilityDelta": self.compatibility,
                "compatibilitySourceBindings": list(self.compatibility_bindings.values()),
                "compatibilityDomainReplays": domains,
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
                      "sourceSha256", "artifactPins", "pathRemaps", "compatibilityDelta",
                      "compatibilitySourceBindings", "compatibilityDomainReplays", "supplementalPlanetReceipts")
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
