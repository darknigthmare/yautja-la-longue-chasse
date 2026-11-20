"""Assemble the pinned PRs while preserving their Git ancestry.

Run only in the disposable integration checkout. The workflow publishes
the resulting commit to the integration branch after a successful assembly.
"""
from pathlib import Path
import difflib
import os
import re
import subprocess
import sys

MAIN = "ba328df3d74fd540254bf72162d09b6240245012"
HEADS = {135:"20b4bfdba53dc00037a029ad591b7350955e3a11",136:"2d94fcb1d7e3484d6e818e720e4bc1ea0d8316f4",137:"d961d3f9bc68a701257cc4ec39714630a86b4957",138:"35aa23d0dbb62ee6e59c7eead667fa9736b038f2",142:"8ca95606cc930525ad7034ecd4107f41546557ef",146:"6e2a5546bd75e95901235af8d503621d0bc2201d",147:"3d73d354a7d3ec56f4327cc75274fbfab5d9b633",148:"32c17816d13db80096f72cb653a65a6bc520ef41",149:"c0440c403af3fe9bda4b22b1f40a602a1cd440e4",150:"84e20827d1ef4e68a02c70c344d24d4a10ee6bd8",151:"d73ae9b6aa6efce8784ec4234dcb51cbd31decec",152:"75807fa1af614efac8c5a557d5fb8e3574c08df9",153:"5d500323652b4f6aa5554a80ecb1298b4f263e60",154:"5ff96ed9caab8c0ef38f74fadb645bbb8a251b80",155:"7bb3196b7eeee3f3926dd6352f135032c1f0ac24",156:"bcb89d95a8333be6498feaee7819055a71d42073",157:"8431923ca8a88f5b617595937f2b4ed4c19075fc",158:"6cdbfc88fe1e2538c090f3b2748df541f3321c96",159:"20e8cea09dcf3367095b5a21033c22e13cb835f8",160:"26411f253aa8703b1a76d7c7d655291d71ba65eb",161:"aa57db15b85e4332fadc376400cf6ca3f9c7dbe8",162:"5c6db4b3a57bc268db4a92cd84478c1dd9b40683",163:"de10d911472767484e770fc14eaa889ceb699ac7"}
ORDER = (146, 135, 136, 137, 138, 142, 147, 148, 149, 152, 153, 157,
         150, 155, 160, 151, 154, 156, 161, 158, 159, 162, 163)
INVENTORY = "docs/qa/current-integration-20261103/runtime-inputs.json"
CONFLICT = re.compile(r"^<<<<<<< [^\n]*\n(.*?)^\|{7} [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n", re.M | re.S)

def git(*args, check=True, visible=False):
    result = subprocess.run(["git", *args], text=True, check=False, capture_output=not visible)
    if check and result.returncode:
        if not visible:
            print(result.stdout, result.stderr, file=sys.stderr)
        result.check_returncode()
    return result if not check else (result.stdout or "").strip()

def exact_replace(text, old, new):
    assert text.count(old) == 1, repr(old)
    return text.replace(old, new)

def edit_file(path, transform):
    file = Path(path)
    text = file.read_text()
    new = transform(text)
    assert new != text, f"Expected an edit to {path}"
    file.write_text(new)

def edits(base, target):
    matcher = difflib.SequenceMatcher(None, base, target, autojunk=False)
    return [(i, j, target[x:y]) for tag, i, j, x, y in matcher.get_opcodes() if tag != "equal"]

def compose(base, ours, theirs, can_join):
    changes = edits(base, ours)
    for x, y, v in edits(base, theirs):
        for k, (lo, hi, w) in enumerate(changes):
            if (x, y, v) == (lo, hi, w):
                break
            if x == y == lo == hi:
                if not can_join(w, v):
                    return None
                changes[k] = (lo, hi, w + v)
                break
            if max(x, lo) < min(y, hi) or (lo < x < hi and x == y) or (x < lo < y and lo == hi):
                return None
        else:
            changes.append((x, y, v))
    result = base[:]
    for i, j, value in sorted(changes, key=lambda z: (z[0], z[1]), reverse=True):
        result[i:j] = value
    return "".join(result)

def merge_hunk(ours, base, theirs):
    if ours == base:
        return theirs
    if theirs == base or ours == theirs:
        return ours
    merged = compose(base.splitlines(True), ours.splitlines(True), theirs.splitlines(True), lambda a, b: True)
    if merged is not None:
        return merged
    if all(s.count("\n") == 1 for s in (ours, base, theirs)):
        tokenize = lambda s: re.findall(r"\w+|[^\w]", s)
        comma_or_union = lambda s: "".join(s).lstrip().startswith((",", "|"))
        return compose(tokenize(base), tokenize(ours), tokenize(theirs),
                       lambda a, b: comma_or_union(a) and comma_or_union(b))
    return None

def manual_hunk(path, transform, replacements=()):
    def patch(text):
        matches = list(CONFLICT.finditer(text))
        assert len(matches) == 1, (path, len(matches))
        text = CONFLICT.sub(lambda match: transform(*match.groups()), text)
        for old, new in replacements:
            text = exact_replace(text, old, new)
        return text
    edit_file(path, patch)
    git("add", "--", path)

def conflicts():
    return git("diff", "--name-only", "--diff-filter=U").splitlines()

def auto_resolve():
    for path in conflicts():
        file = Path(path)
        if not file.is_file():
            continue
        try:
            text = file.read_text()
        except UnicodeError:
            continue
        def resolve(match):
            merged = merge_hunk(*match.groups())
            return match[0] if merged is None else merged
        resolution = CONFLICT.sub(resolve, text)
        if resolution != text:
            file.write_text(resolution)
        if not re.search(r"^<{7} ", resolution, re.M):
            git("add", "--", path)

def resolve_merge(number):
    if number == 146:
        assert conflicts() == [INVENTORY]
        git("checkout", "--ours", "--", INVENTORY)
        git("add", "--", INVENTORY)
    if number == 135 and "app/game/GameClient.tsx" in conflicts():
        def palette_and_equipment(ours, base, theirs):
            assert "gauntletVariantId={hunterGauntlet.equippedId}" in ours
            assert "<ClanPaletteContextV146.Provider" in theirs and base in theirs
            return exact_replace(theirs, base, ours)
        manual_hunk("app/game/GameClient.tsx", palette_and_equipment)
    auto_resolve()
    if number == 150:
        manual_hunk("app/game/CampaignFrontEnd.tsx", lambda a,o,b:
            b.replace("(id,name,heritageFromSlotId)", "(id,name,originId,heritageFromSlotId)")
             .replace("createCampaignSlot(id,name)", "createCampaignSlot(id,name,undefined,originId)")
             .replace("createHeirCampaignSlot(id,name,heritageFromSlotId)", "createHeirCampaignSlot(id,name,heritageFromSlotId,undefined,originId)"))
        manual_hunk("app/game/CampaignMainMenu.tsx",
            lambda a,o,b: exact_replace(a, "onCreate:(slotId:number,name:string,originId?:string)",
                                         "onCreate:(slotId:number,name:string,originId?:string,heritageFromSlotId?:number)"),
            [("onCreate(slot.id,name.trim(),offer.slotId)", "onCreate(slot.id,name.trim(),originId,offer.slotId)")])
        manual_hunk("app/game/systems/campaignSlots.ts",
            lambda a,o,b: exact_replace(a,"originId: unknown = null)", "originId: unknown = null, prepare?: (save: SaveGame) => SaveGame)"),
            [("export async function createHeirCampaignSlot(id: CampaignSlotId, name: string, fromSlotId: CampaignSlotId, storage: ArchiveStorage | null = browserStorage())",
              "export async function createHeirCampaignSlot(id: CampaignSlotId, name: string, fromSlotId: CampaignSlotId, storage: ArchiveStorage | null = browserStorage(), originId: unknown = null)"),
             ("newCampaignDocument(id, name, catalog, save => {", "newCampaignDocument(id, name, catalog, originId, save => {")])
    if number == 155:
        manual_hunk("app/game/CampaignMainMenu.tsx",
            lambda a,o,b: exact_replace(a,"heritageFromSlotId?:number)=>void","heritageFromSlotId?:number,options?:{hardcore:true})=>void"),
            [("onCreate(slot.id,name.trim(),offer?.slotId,{hardcore:true})", "onCreate(slot.id,name.trim(),originId,offer?.slotId,{hardcore:true})")])
        edit_file("app/game/CampaignFrontEnd.tsx", lambda s:
            exact_replace(exact_replace(s,
                "createCampaignSlot(id,name,undefined,originId,undefined,options)", "createCampaignSlot(id,name,undefined,originId,options)"),
                "createHeirCampaignSlot(id,name,originId,heritageFromSlotId,undefined,options)",
                "createHeirCampaignSlot(id,name,heritageFromSlotId,undefined,originId,options)"))
        git("add", "--", "app/game/CampaignFrontEnd.tsx")
    if number == 158:
        def arcs_and_residence(ours, base, theirs):
            line = theirs.splitlines()[0]
            assert "const arcs = recordMinorArcsFieldEventV160" in line
            anchor = "    return persistSocialProgress({ homeworldRegionV68: acknowledgeHomeworldRegionEventV68(state), homeworld: {...current.homeworld, contractsV68:result.state},"
            merged = exact_replace(ours, anchor, line + "\n" + anchor)
            return exact_replace(merged, "residenceV149: residence.state, ...settleResidenceLifeForRegionV150(current, state) });",
                "residenceV149: residence.state, ...settleResidenceLifeForRegionV150(current, state),\n      ...(arcs.changed && arcs.state ? { minorArcsV160: arcs.state } : {}) });")
        manual_hunk("app/game/GameClient.tsx", arcs_and_residence)
    pending = conflicts()
    if pending:
        print(f"Unresolved conflicts in #{number}: {pending}", file=sys.stderr)
        for file in pending:
            print(git("diff", "--cc", "--", file)[:12000], file=sys.stderr)
        raise RuntimeError("Unresolved merge")
    git("commit", "--no-edit")

def merge_tip(ref, title, number=None):
    if git("merge-base", "--is-ancestor", ref, "HEAD", check=False).returncode == 0:
        return
    if number is not None:
        preview = git("merge-tree", "--write-tree", "HEAD", ref, check=False)
        if preview.returncode not in (0, 1):
            raise RuntimeError(preview.stderr or preview.stdout)
    result = git("merge", "--no-ff", "-m", title, ref, check=False)
    if result.returncode:
        if number is None or not conflicts():
            raise RuntimeError(result.stderr or result.stdout)
        resolve_merge(number)
    print(f"Merged {ref} at {git('rev-parse','--short','HEAD')}", flush=True)

def standalone_corrections():
    path = "app/game/systems/campaignSlots.ts"
    def creation_and_claims(s):
        signature = "originId: unknown = null, options: CampaignCreationOptionsV155 = {}): Promise<CampaignSlotResult> {"
        assert s.count(signature) == 2
        s = s.replace(signature, "originOrOptions: unknown = null, creationOptions: CampaignCreationOptionsV155 = {}): Promise<CampaignSlotResult> {\n  const { originId, options } = normalizeCampaignCreationV155(originOrOptions, creationOptions);")
        anchor = "/** V152: create a new campaign in an empty slot that inherits the sealed legacy of another slot."
        helper = '''/** Accept the original Hardcore options argument and the later origin selection. */
function normalizeCampaignCreationV155(originOrOptions: unknown, options: CampaignCreationOptionsV155) {
  if (typeof originOrOptions === "object" && originOrOptions !== null && !Array.isArray(originOrOptions)) {
    const legacy = originOrOptions as Record<string, unknown>;
    if (Object.keys(legacy).every(key => key === "hardcore") &&
        (legacy.hardcore === undefined || legacy.hardcore === true)) {
      return { originId: null, options: { ...options, ...(legacy.hardcore === true ? { hardcore: true as const } : {}) } };
    }
  }
  return { originId: originOrOptions, options };
}
'''
        s = exact_replace(s, anchor, helper + anchor)
        s = exact_replace(s,'    if (includeBackups) {\n      const backup = storage.getItem(campaignSlotStorageKey(id) + ".backup");',
          '    if (includeBackups) {\n      if (!read.document && storage.getItem(campaignSlotStorageKey(id)) !== null) {\n        fail("protected-save", "Une partie illisible peut contenir une réclamation de legs.");\n      }\n      const backup = storage.getItem(campaignSlotStorageKey(id) + ".backup");')
        return exact_replace(s, "  const campaigns = slotCampaignsV152(storage, catalog, working, false, reads), claims = heritageClaimsV152(campaigns, working);",
                               "  let campaigns: ReturnType<typeof slotCampaignsV152>;\n  try { campaigns = slotCampaignsV152(storage, catalog, working, true, reads); }\n  catch { return []; }\n  const claims = heritageClaimsV152(campaigns, working);")
    edit_file(path, creation_and_claims)
    pit = "app/game/PitCanvas.tsx"
    edit_file(pit, lambda s: exact_replace(s,
      "  personalNameRefV147.current = personalChosenV147 && !playbackReplay ? personalFighterV147?.name ?? null : null;",
      "  const personalNameV147 = personalChosenV147 && !playbackReplay ? personalFighterV147?.name ?? null : null;\n  useEffect(() => {\n    personalNameRefV147.current = personalNameV147;\n  }, [personalNameV147]);"))
    harness = "scripts/qa-hunt-lifecycle-browser-v112.mjs"
    import_line = """    'import {settleClanShipMission} from "./systems/clanShipOperations";\\n'+"""
    edit_file(harness, lambda s: exact_replace(s, import_line, import_line + "\n" +
        """    'import {settleQueenHuntMissionV163} from "./systems/queenHuntV163";\\n'+"""))
    git("add", "--", path, pit, harness)
    git("commit", "-m", "Preserve legacy campaign creation and bind the combined hunt checks")



def prefetch_source_blobs(refs):
    from concurrent.futures import ThreadPoolExecutor
    from hashlib import sha1
    from urllib.parse import quote
    from urllib.request import urlopen

    sources = {}
    for ref in refs:
        commit = git("rev-parse", ref)
        records = git("ls-tree", "-r", "-z", commit, "--", "app", "scripts", "tests", INVENTORY).split("\0")
        for record in filter(None, records):
            meta, path = record.split("\t", 1)
            mode, kind, sha = meta.split()
            if kind == "blob" and mode in ("100644", "100755"):
                sources.setdefault(sha, (commit, path))
    def find_missing():
        inventory = "\n".join(sorted(sources)) + "\n"
        status = subprocess.run(["git", "cat-file", "--batch-check"], input=inventory, text=True,
            capture_output=True, check=True, env={**os.environ, "GIT_NO_LAZY_FETCH": "1"})
        return [line.split()[0] for line in status.stdout.splitlines() if line.endswith(" missing")]
    missing = find_missing()
    print(f"Loading {len(missing)} precise source blobs, with Git hash verification", flush=True)
    def restore(sha):
        commit, path = sources[sha]
        url = "https://raw.githubusercontent.com/darknigthmare/yautja-la-longue-chasse/" + commit + "/" + quote(path)
        with urlopen(url, timeout=25) as response:
            raw = response.read(8 * 1024 * 1024 + 1)
        assert len(raw) <= 8 * 1024 * 1024, path
        actual = sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
        assert actual == sha, (path, commit, actual, sha)
        wrote = subprocess.check_output(["git", "hash-object", "-w", "--stdin"], input=raw).decode().strip()
        assert wrote == sha, path
    with ThreadPoolExecutor(max_workers=12) as pool:
        for _ in pool.map(restore, missing):
            pass
    assert not find_missing()


def main():
    assert git("rev-parse", "HEAD") == os.environ["INTEGRATION_SEED"]
    git("config", "user.name", "Codex")
    git("config", "user.email", "codex@users.noreply.github.com")
    git("config", "core.hooksPath", "/dev/null")
    git("config", "merge.conflictStyle", "diff3")
    git("config", "merge.renames", "false")
    git("sparse-checkout", "set", "--no-cone", "/*", "!/*/", "/app/", "/scripts/", "/tests/", "/.github/",
        "/" + INVENTORY, "/.openai/hosting.json", "/build/")
    git("reset", "--hard", "HEAD")
    refspecs = [f"+refs/pull/{pr}/head:refs/wave/pr/{pr}" for pr in ORDER]
    git("fetch", "--filter=blob:none", "--no-tags", "origin", "+refs/heads/main:refs/wave/main", *refspecs, visible=True)
    assert git("rev-parse", "refs/wave/main") == MAIN, "main advanced; review changes before assembly"
    for pr in ORDER:
        assert git("rev-parse", f"refs/wave/pr/{pr}") == HEADS[pr], f"PR #{pr} moved"
    refs = [os.environ["INTEGRATION_SEED"], "refs/wave/main", *(f"refs/wave/pr/{pr}" for pr in ORDER)]
    bases = set()
    for index, left in enumerate(refs):
        for right in refs[index+1:]:
            bases.update(git("merge-base", "--all", left, right).splitlines())
    prefetch_source_blobs(refs + sorted(bases))
    merge_tip("refs/wave/main", "Bring in the verified main branch")
    for pr in ORDER:
        merge_tip(f"refs/wave/pr/{pr}", f"Merge PR #{pr} into November integration", pr)
    for pr in ORDER:
        git("merge-base", "--is-ancestor", HEADS[pr], "HEAD")
    standalone_corrections()
    git("diff", "--check", MAIN, "HEAD", "--", "app", "scripts", "tests", ".github", visible=True)
    assert not git("status", "--porcelain")
    print("INTEGRATION_CHECKPOINT", git("rev-parse", "HEAD"), git("rev-parse", "HEAD^{tree}"), flush=True)

if __name__ == "__main__":
    main()
