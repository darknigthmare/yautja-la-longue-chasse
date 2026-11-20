#!/usr/bin/env python3
"""Import only the 10 missing The PIT PNGs from the conversation archive.

Run from repository root on PR #146 branch:
  python3 scripts/import_the_pit_conversation_20261117.py /path/to/THE_PIT_CONVERSATION_18_SPRITES_COMPLETE_20261117.zip
  git status --short
  git add public/game/sprites/v44/user-hunters/conversation-20261117/
  git commit -m "assets(the-pit): recover ten missing conversation fighters"
  git push origin codex/project-archive-recovery-20261117
"""
import hashlib
import pathlib
import subprocess
import sys
import zipfile

EXPECTED = {
 "01": "ad0fc29ccaddfac20df8dd7ef0160aebc0ad0cfa",
 "02": "320a5da5b2e86611ea898ed4062662c416e2f84d",
 "03": "01535925829bdb5c63e0a0d18cf1052760219fb6",
 "04": "2ff42e313552c515ae76a9beb71cf3d5665467e0",
 "05": "70883f0e15338b630515d6d50a0561d62e3ef52b",
 "06": "74d6f0a2aea652e12356760edabd688b9dbd21e0",
 "07": "e5296707e885b6110f77f1d899df674eda3c1c38",
 "09": "845225d312fc2d509301a13daa3f20599ffdc98c",
 "10": "17e9638bc5307be12095a9944d5a2a26ad21c06e",
 "12": "471e28b031ef29da46a437b71ab19a1b147500e0",
}
DEST = pathlib.Path("public/game/sprites/v44/user-hunters/conversation-20261117")
def git_blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + bytes([0]) + data).hexdigest()

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/import_the_pit_conversation_20261117.py ARCHIVE.zip")
    root = pathlib.Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    dest = root / DEST
    with zipfile.ZipFile(sys.argv[1]) as z:
        for number, expected in EXPECTED.items():
            matches = [n for n in z.namelist() if n.startswith("THE_PIT/sprites/final/" + number + "_") and n.endswith(".png")]
            if len(matches) != 1:
                raise RuntimeError(f"Expected one PNG for {number}, got {matches}")
            name = matches[0]
            data = z.read(name)
            actual = git_blob_sha(data)
            if actual != expected:
                raise RuntimeError(f"Source hash mismatch for {name}: {actual} != {expected}")
            if not data.startswith(bytes([137,80,78,71,13,10,26,10])):
                raise RuntimeError(f"Not a PNG: {name}")
            target = dest / pathlib.PurePosixPath(name).name
            if target.exists():
                if target.read_bytes() != data:
                    raise RuntimeError(f"Existing file differs: {target}")
                print("SKIP identical", target)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            print("CREATED", target, actual)
    print("Done: inspect diff and commit/push to PR branch.")

if __name__ == "__main__":
    main()
