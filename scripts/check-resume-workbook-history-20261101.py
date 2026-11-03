#!/usr/bin/env python3
"""Replay the dated coordination workbook in a verified private historical context.

The 1 November inventory is an observation, not a freeze on today's workbooks.
The original writer, reader, 33 PRs and open-source statuses remain unchanged.
"""
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SOURCE_COMMIT = "1e5a8fbc8553e0d68991589f54aa1ef4dcab0a37"
DIRECTORY = "docs/suivi-production/resume-20261101"
INVENTORY = DIRECTORY + "/EXCEL-INVENTORY.json"
OUTPUT = "docs/YAUTJA_REPRISE_CHANTIERS_20261101.xlsx"
WRITER = "scripts/build-resume-workbook-20261101.py"
READER = "scripts/verify-resume-workbook-20261101.py"
PINNED = {
    WRITER: (25973, "e45d85361f2bd054f71600ab34f31344568f1167c1ec1990a53ac162c5474a49"),
    READER: (5859, "7c3945d293c875673f3a1ecd30c47aac7f762d8b45272734e4fb496a361f84e6"),
    INVENTORY: (120442, "9d11d9c4cefdf04ccd27d00d2f952cf580727cc383bd582c4a7c71e1f467108d"),
    OUTPUT: (62258, "999e11f136329c54b3f3c59ea015f4c839f59fa00db5baae838888ad9635bcde"),
}


def local(file):
    assert isinstance(file, str) and re.fullmatch(r"(?:scripts|docs|art-source)/[A-Za-z0-9._/-]+", file), "Unsafe historical path"
    assert all(part and part not in (".", "..") for part in file.split("/")), "Nonlocal historical path"
    return file


def git(repository, *args, timeout=45):
    return subprocess.run(["git", *args], cwd=repository, check=True, capture_output=True, timeout=timeout).stdout


def verify(data, row):
    assert len(data) == row["bytes"], "Historical size changed: " + row["path"]
    assert sha256(data).hexdigest() == row["sha256"], "Historical SHA256 changed: " + row["path"]
    return data


def pinned_row(file):
    size, digest = PINNED[file]
    return {"path": file, "bytes": size, "sha256": digest}


def ensure_source_commit(repository):
    try:
        git(repository, "cat-file", "-e", SOURCE_COMMIT + "^{commit}")
    except subprocess.CalledProcessError:
        remote = git(repository, "remote", "get-url", "origin").decode().strip()
        assert re.fullmatch(r"(?:https://github\.com/|git@github\.com:|ssh://git@github\.com/)darknigthmare/yautja-la-longue-chasse(?:\.git)?", remote), "Historical fetch requires the original public repository"
        git(repository, "-c", "protocol.file.allow=never", "fetch", "--filter=blob:none", "--no-tags", "--depth=1", "origin", SOURCE_COMMIT)
        git(repository, "cat-file", "-e", SOURCE_COMMIT + "^{commit}")


def published_bytes(repository, file):
    """Check local published bytes, or their tracked HEAD when omitted by sparse checkout."""
    target = repository / local(file)
    assert not target.is_symlink(), "Published snapshot must not be a symlink"
    if target.exists():
        assert target.is_file(), "Published snapshot must be a regular file"
        return verify(target.read_bytes(), pinned_row(file))
    flags = git(repository, "ls-files", "-t", "--", file).decode().strip()
    assert flags == "S " + file, "Published snapshot is missing outside sparse checkout: " + file
    return verify(git(repository, "show", "HEAD:" + file), pinned_row(file))


def historical_input(repository, row, read_preimage):
    """Reuse exact current inputs; restore a changed workbook only inside the private copy."""
    target = repository / local(row["path"])
    if target.is_file() and not target.is_symlink():
        current = target.read_bytes()
        if len(current) == row["bytes"] and sha256(current).hexdigest() == row["sha256"]:
            return current, False
    return verify(read_preimage(row["path"]), row), True


def stage(root, row, data):
    verify(data, row)
    target = root / local(row["path"])
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream:
        stream.write(data)
    target.chmod(0o444)


def main():
    assert len(sys.argv) == 1, "Usage: python3 scripts/check-resume-workbook-history-20261101.py"
    ensure_source_commit(ROOT)
    published = {file: published_bytes(ROOT, file) for file in (INVENTORY, OUTPUT)}
    inventory = json.loads(published[INVENTORY])
    assert inventory["schemaVersion"] == 1 and inventory["snapshotDate"] == "2026-11-01"
    assert inventory["coordinationWorkbookExcludedFromOwnInputs"] == OUTPUT
    rows = [pinned_row(file) for file in PINNED]
    rows += inventory["sourceFingerprints"] + inventory["localWorkbooks"]
    assert len(inventory["sourceFingerprints"]) == 5 and len(inventory["localWorkbooks"]) == 27
    assert len({local(row["path"]) for row in rows}) == len(rows), "Duplicate historical input"
    restored = []
    read_preimage = lambda file: git(ROOT, "show", SOURCE_COMMIT + ":" + local(file))
    with TemporaryDirectory(prefix="yautja-resume-history-20261101-") as temporary:
        root = Path(temporary)
        for row in rows:
            data, historical = historical_input(ROOT, row, read_preimage)
            stage(root, row, data)
            if historical:
                restored.append(row["path"])
        # Execute both original assertion sets, without patching their model or globals.
        for script, args in ((WRITER, ["--check"]), (READER, [])):
            result = subprocess.run([sys.executable, str(root / script), *args], cwd=root,
                                    check=True, capture_output=True, text=True, timeout=120)
            print(result.stdout, end="")
        for row in rows:
            verify((root / row["path"]).read_bytes(), row)
    for file, before in published.items():
        assert published_bytes(ROOT, file) == before, "Published dated snapshot was modified"
    print(json.dumps({"status": "PASS_DATED_COORDINATION_HISTORY", "sourceCommit": SOURCE_COMMIT,
                      "inventorySha256": PINNED[INVENTORY][1], "workbookSha256": PINNED[OUTPUT][1],
                      "historicalInputsVerified": len(rows), "historicalPreimagesRestored": restored,
                      "snapshotPRs": 33, "sourceRequirementsRequalified": 0,
                      "currentRuntimeCovered": False, "nativeExcelExecuted": False}))


if __name__ == "__main__":
    main()
