"""Package V6.11–V6.13 from an explicit published Git commit, preserving every byte."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
BASE = "017f3bd8d37457ee56d0cfeb78da9835c6388b8f"
VERSIONS = ("v611", "v612", "v613")
CURRENT = "docs/suivi-production/v613"
PART_LIMIT = 95 * 1024 * 1024  # Every standard ZIP part must be strictly smaller.
PR_URL = "https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10"
TRACKING_WORKBOOKS = {
    "docs/suivi-production/v611/references/Yautja_Suivi_Variantes_2026-10-20.xlsx",
    "docs/suivi-production/v611/Yautja_Suivi_Variantes_2026-10-21.xlsx",
    "docs/suivi-production/v612/Yautja_Suivi_Variantes_V612_2026-10-21.xlsx",
    "docs/suivi-production/v613/Yautja_Suivi_Variantes_V613_2026-10-22.xlsx",
}
GENERATED_WRAPPERS = {"index.html", "LISEZ_MOI.txt", "publication.json", "SHA256_FICHIERS.json"}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def sha256_file(filename: Path) -> str:
    digest = hashlib.sha256()
    with filename.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def read_tree(commit: str) -> dict:
    tree = {}
    for record in git("ls-tree", "-r", "-z", "--full-tree", commit).split(b"\0"):
        if not record:
            continue
        metadata, raw_name = record.split(b"\t", 1)
        mode, kind, blob = metadata.decode("ascii").split()
        name = raw_name.decode("utf-8")
        if PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts or "\\" in name:
            raise ValueError(f"Unsafe repository path: {name!r}")
        tree[name] = {"mode": mode, "kind": kind, "blob": blob}
    return tree


def stage_committed_files(tree: dict, filenames: set[str], stage: Path) -> dict:
    """Stream immutable Git blobs; never substitute files from the working tree."""
    records = {}
    process = subprocess.Popen(["git", "cat-file", "--batch"], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for name in sorted(filenames):
            entry = tree.get(name)
            if not entry or entry["kind"] != "blob" or entry["mode"] not in {"100644", "100755"}:
                raise ValueError(f"Not a published regular file: {name}")
            process.stdin.write((entry["blob"] + "\n").encode("ascii"))
            process.stdin.flush()
            header = process.stdout.readline().decode("ascii").strip().split()
            if len(header) != 3 or header[:2] != [entry["blob"], "blob"]:
                raise ValueError(f"Could not read committed blob: {name}")
            size = int(header[2])
            content_hash = hashlib.sha256()
            git_hash = hashlib.sha1(f"blob {size}\0".encode("ascii"))
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            remaining = size
            with target.open("wb") as output:
                while remaining:
                    chunk = process.stdout.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        raise ValueError(f"Truncated committed blob: {name}")
                    output.write(chunk)
                    content_hash.update(chunk)
                    git_hash.update(chunk)
                    remaining -= len(chunk)
            if process.stdout.read(1) != b"\n" or git_hash.hexdigest() != entry["blob"]:
                raise ValueError(f"Git object checksum mismatch: {name}")
            records[name] = {"path": name, "bytes": size, "sha256": content_hash.hexdigest(), "source": "git-commit", "gitBlobSha1": entry["blob"]}
        process.stdin.close()
        if process.wait() != 0:
            raise ValueError("git cat-file failed")
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait()
        if process.stdout:
            process.stdout.close()
        if process.stdin and not process.stdin.closed:
            process.stdin.close()
    return records


def write_zip(target: Path, filenames: list[str], stage: Path, timestamp: tuple) -> None:
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=False) as archive:
        for name in filenames:
            info = zipfile.ZipInfo(name, date_time=timestamp)
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, (stage / name).read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)


def verify_zip(target: Path, expected: set[str], records: dict, limit: int | None = None) -> dict:
    if limit is not None and target.stat().st_size >= limit:
        raise ValueError(f"Part is not strictly below {limit} bytes: {target.name}")
    with zipfile.ZipFile(target) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != expected:
            raise ValueError(f"Unexpected or duplicate ZIP members: {target.name}")
        if archive.testzip() is not None:
            raise ValueError(f"ZIP CRC verification failed: {target.name}")
        for name in names:
            content = archive.read(name)
            record = records[name]
            if len(content) != record["bytes"] or hashlib.sha256(content).hexdigest() != record["sha256"]:
                raise ValueError(f"ZIP payload differs from the verified source: {name}")
            if record["source"] == "git-commit":
                blob_hash = hashlib.sha1(f"blob {len(content)}\0".encode("ascii") + content).hexdigest()
                if blob_hash != record["gitBlobSha1"]:
                    raise ValueError(f"ZIP payload differs from the Git object: {name}")
    return {"file": target.name, "bytes": target.stat().st_size, "sha256": sha256_file(target), "entries": len(expected), "everyPayloadHashVerified": True}


def verify_offline_links(stage: Path) -> int:
    class Links(HTMLParser):
        def __init__(self):
            super().__init__()
            self.links = set()

        def handle_starttag(self, _tag, attributes):
            self.links.update(value for key, value in attributes if key in {"href", "src"} and value)

    checked = 0
    for name in ("index.html", *(f"docs/suivi-production/{version}/index.html" for version in VERSIONS)):
        page = stage / name
        parser = Links()
        parser.feed(page.read_text(encoding="utf-8"))
        for href in parser.links:
            url = urlsplit(href)
            if url.scheme in {"http", "https", "data", "mailto"} or url.netloc or not url.path:
                continue
            if url.scheme or url.path.startswith("/"):
                raise ValueError(f"Offline link must be relative: {name}: {href}")
            target = (page.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(stage.resolve()) or not target.is_file():
                raise ValueError(f"Offline delivery link has no bundled file: {name}: {href}")
            checked += 1
    return checked


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("published_commit", help="Full SHA of the already-published V6.13 commit")
    parser.add_argument("output_directory", help="Directory for the complete ZIP, standard ZIP parts and checksum indexes")
    parser.add_argument("--pr-url", default=PR_URL, help="Actual V6.13 pull request URL")
    args = parser.parse_args()
    commit = args.published_commit
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or git("rev-parse", "--verify", commit + "^{commit}").decode().strip() != commit:
        raise ValueError("Use the full published commit SHA")
    if subprocess.run(["git", "merge-base", "--is-ancestor", BASE, commit], cwd=ROOT, check=False).returncode != 0:
        raise ValueError("The published commit must descend from the reconciled main commit")
    if args.pr_url != PR_URL:
        raise ValueError("V6.13 is delivered through PR #10")
    tree = read_tree(commit)

    def committed_json(name: str):
        if name not in tree or tree[name]["kind"] != "blob":
            raise ValueError(f"Missing committed metadata: {name}")
        return json.loads(git("cat-file", "blob", tree[name]["blob"]))

    reconciliation = committed_json(f"{CURRENT}/data/main-reconciliation.json")
    if reconciliation.get("currentMainCommit") != BASE:
        raise ValueError("Unexpected reconciled main commit")
    if reconciliation.get("successorPullRequestUrl") != PR_URL:
        raise ValueError("The committed reconciliation does not identify PR #10")
    manifests = [committed_json(f"docs/suivi-production/{version}/data/production-manifest.json") for version in VERSIONS]
    counts = committed_json(f"{CURRENT}/data/current-counts.json")
    originals = committed_json("docs/suivi-production/v611/data/other-workbooks.json")
    assets = [asset for manifest in manifests for asset in manifest["assets"]]
    if any(len(manifest["assets"]) != 36 for manifest in manifests) or len({asset["id"] for asset in assets}) != 108 or len({asset["sha256"] for asset in assets}) != 108:
        raise ValueError("The package requires 108 distinct native PNGs: 36 per version")
    for version, manifest, variants in zip(VERSIONS, manifests, ({4, 5}, {6, 7}, {8, 9})):
        if {int(asset["variant"]) for asset in manifest["assets"]} != variants or len({asset["groupId"] for asset in manifest["assets"]}) != 18:
            raise ValueError(f"Wrong roles or groups in {version}")
        if any(not asset["repoPngPath"].startswith(f"public/game/production/enforcers-{version}/") for asset in manifest["assets"]):
            raise ValueError(f"Native asset path leaves the expected version tree: {version}")
    if counts["total"] != 5120 or sum(counts["statusCounts"].values()) != 5120:
        raise ValueError("The cumulative status counts must preserve all 5,120 identities")
    original_paths = {entry["repoPath"] for entry in originals}
    if len(originals) != 9 or len(original_paths) != 9 or any(not name.endswith(".xlsx") for name in original_paths):
        raise ValueError("Expected nine distinct original workbooks")
    expected_workbooks = original_paths | TRACKING_WORKBOOKS
    if len(expected_workbooks) != 13:
        raise ValueError("Expected nine original and four tracking workbooks")
    native_paths = {asset["repoPngPath"] for asset in assets}
    files = set(expected_workbooks)
    for version in VERSIONS:
        for prefix in (f"docs/suivi-production/{version}/", f"public/game/production/enforcers-{version}/"):
            members = {name for name, item in tree.items() if name.startswith(prefix) and item["kind"] == "blob"}
            if not members:
                raise ValueError(f"Missing published delivery tree: {prefix}")
            files.update(members)
        files.update({
            f"app/game/data/enforcerProduction{version.upper()}.json",
            f"tests/enforcer-production-{version}.test.mjs",
            f"scripts/build-enforcer-production-{version}.mjs",
            f"scripts/build-enforcer-workbook-{version}.mjs",
            f"scripts/verify-enforcer-workbook-{version}.py",
            f"docs/suivi-production/{version}/index.html",
            f"docs/suivi-production/{version}/README.md",
        })
    files.update(name for name in tree if re.fullmatch(r"scripts/(?:build|verify|checkpoint|package)-enforcer-(?:production|workbook|gallery)-v61[123]\.(?:mjs|py)", name))
    files.update({
        "app/game/RecentSpriteLibraryV85.tsx", "app/game/systems/recentSpriteLibraryV85.ts",
        "tests/drive-new-deposits-v89.test.mjs", "scripts/lib/sanitize-enforcer-public-record.mjs",
        "scripts/build-enforcer-gallery-v613.mjs", "scripts/verify-enforcer-gallery-v613.mjs",
        "scripts/reconcile-enforcer-main-v613.mjs", "scripts/audit-enforcer-public-records-v613.py",
        "scripts/package-enforcer-production-v613.py", "package.json", "package-lock.json",
    })
    packaged_native = {name for name in files if re.match(r"public/game/production/enforcers-v61[123]/.+\.png$", name)}
    packaged_workbooks = {name for name in files if name.endswith(".xlsx")}
    if packaged_native != native_paths or len(packaged_native) != 108:
        raise ValueError("Published native PNG paths do not match the three manifests")
    if packaged_workbooks != expected_workbooks:
        raise ValueError(f"Unexpected XLSX membership: {sorted(packaged_workbooks ^ expected_workbooks)}")

    out = Path(args.output_directory).resolve()
    out.mkdir(parents=True, exist_ok=True)
    commit_time = int(git("show", "-s", "--format=%ct", commit).decode().strip())
    date = datetime.fromtimestamp(commit_time, timezone.utc)
    timestamp = (max(1980, min(2107, date.year)), date.month, date.day, date.hour, date.minute, date.second // 2 * 2)
    with tempfile.TemporaryDirectory(prefix="v613-package-", dir=out) as temp:
        stage = Path(temp)
        records = stage_committed_files(tree, files, stage)
        for asset in assets:
            record = records[asset["repoPngPath"]]
            if record["bytes"] != asset["bytes"] or record["sha256"] != asset["sha256"]:
                raise ValueError(f"Native image differs from its manifest: {asset['id']}")
            with (stage / asset["repoPngPath"]).open("rb") as image:
                header = image.read(26)
            if header[:8] != b"\x89PNG\r\n\x1a\n" or int.from_bytes(header[16:20], "big") != 1024 or int.from_bytes(header[20:24], "big") != 1536 or header[25] != 6:
                raise ValueError(f"Expected native 1024 × 1536 RGBA PNG: {asset['id']}")
        for workbook in originals:
            record = records[workbook["repoPath"]]
            if record["bytes"] != workbook["bytes"] or record["sha256"] != workbook["sha256"]:
                raise ValueError(f"Original workbook changed: {workbook['repoPath']}")

        recovered_prompts = sum(isinstance(asset.get("acceptedOutputPromptExact"), str) and bool(asset["acceptedOutputPromptExact"].strip()) for asset in manifests[2]["assets"])
        publication = {
            "version": "V6.13", "githubPullRequest": PR_URL, "publishedCommit": commit, "sourceMainCommit": BASE,
            "previousMergedPullRequests": [7, 9], "includedDeliveryVersions": ["V6.11", "V6.12", "V6.13"],
            "newNativePngFiles": 36, "cumulativeNativePngFiles": 108, "groups": 18, "newVariants": [8, 9], "priorVariants": [4, 5, 6, 7],
            "otherUnchangedProjectWorkbooks": 9, "trackingWorkbooks": 4, "xlsxFiles": 13, "statusCounts": counts["statusCounts"],
            "finalPromptsRecoveredV613": recovered_prompts, "finalPromptsUnrecoveredV613": 36 - recovered_prompts,
            "plannedPromptsAreSubmissionEvidence": False, "allMissingVariantsCompleted": False,
            "newAnimations": 0, "newMapPlacements": 0, "githubMergePerformed": False,
            "repositoryPayloadSource": "Immutable blobs read directly from the supplied published commit; working-tree files are not substituted.",
            "generatedDeliveryWrappers": sorted(GENERATED_WRAPPERS),
            "scopeFR": "Livraisons V6.11, V6.12 et V6.13 complètes, leurs registres et outils de production, et neuf classeurs originaux. Galerie autonome ; le dépôt complet reste nécessaire pour exécuter le jeu et ses tests.",
        }
        wrappers = {
            "publication.json": json_bytes(publication),
            "index.html": ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=docs/suivi-production/v613/index.html"><title>Yautja V6.13</title></head><body><p><a href="docs/suivi-production/v613/index.html">Ouvrir la galerie des 108 Enforcers</a></p></body></html>\n').encode("utf-8"),
            "LISEZ_MOI.txt": (
                "Yautja — Enforcers V6.13\n\n"
                "OUVRIR LA LIVRAISON\n"
                "Avec le ZIP complet : extraire toute l’archive dans un dossier, puis ouvrir index.html.\n"
                "Avec les parties : télécharger TOUTES les archives Partie_XX_sur_YY.zip, puis les extraire dans LE MÊME DOSSIER en conservant leur arborescence. Ouvrir ensuite index.html.\n"
                "Chaque partie est un ZIP standard indépendant, strictement inférieur à 95 Mio. Il ne faut pas concaténer leurs octets. L’ensemble des parties contient exactement les mêmes fichiers que le ZIP complet.\n\n"
                "CONTENU\n"
                "108 PNG natifs : 36 V6.11, 36 V6.12, 36 V6.13.\n"
                "13 classeurs XLSX : neuf originaux inchangés et quatre versions du suivi.\n"
                "Le suivi actualisé est dans docs/suivi-production/v613.\n"
                "Les documents, registres runtime, scripts et tests des trois livraisons sont conservés à leurs chemins GitHub.\n"
                "La galerie, ses filtres et les téléchargements locaux fonctionnent hors ligne. Les liens GitHub et Drive nécessitent une connexion.\n"
                "Le ZIP n’est pas un checkout complet du jeu ; utiliser le dépôt complet pour son exécution et ses tests.\n\n"
                "PROVENANCE ET LIMITES\n"
                "Les 36 PNG V6.13 ont été récupérés depuis les objets GitHub et vérifiés par SHA-256, sans modification des pixels.\n"
                f"Prompts des sorties finales V6.13 : {recovered_prompts} retrouvés ; {36 - recovered_prompts} non récupérés. Les prompts prévisionnels ne prouvent pas leur soumission.\n"
                "Les 36 traces V6.10 dont les PNG restent à retrouver sont conservées dans le suivi.\n"
                "Les nouveaux individus sont des poses fixes raccordées à la galerie et au codex. Les animations et placements en scène restent à produire.\n"
                "V6.11 et V6.12 sont dans main après fusion des PR nº 7 et nº 9 ; V6.13 est dans la PR nº 10.\n"
                "Les limites visuelles et anatomiques sont documentées dans les manifestes, sans certification officielle 1:1.\n\n"
                "VÉRIFIER LES FICHIERS\n"
                "SHA256_FICHIERS.json liste les tailles et empreintes des fichiers livrés, sauf sa propre empreinte pour éviter une référence circulaire.\n"
                "SHA256_ARCHIVES.json, livré à côté des ZIP, identifie le ZIP complet et toutes les parties.\n"
                "publication.json, index.html, LISEZ_MOI.txt et SHA256_FICHIERS.json sont les seuls fichiers d’emballage générés hors du commit.\n"
                f"Commit publié : {commit}\nPR V6.13 : {PR_URL}\nMain de référence : {BASE}\n"
            ).encode("utf-8"),
        }
        for name, content in wrappers.items():
            (stage / name).write_bytes(content)
            records[name] = {"path": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), "source": "delivery-wrapper", "derivedFromCommit": commit}
        checksum_index = {"publishedCommit": commit, "excludedSelfPath": "SHA256_FICHIERS.json", "files": [records[name] for name in sorted(records)]}
        content = json_bytes(checksum_index)
        (stage / "SHA256_FICHIERS.json").write_bytes(content)
        records["SHA256_FICHIERS.json"] = {"path": "SHA256_FICHIERS.json", "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), "source": "delivery-wrapper", "derivedFromCommit": commit}
        offline_links_checked = verify_offline_links(stage)
        names = sorted(records)
        complete = out / "Yautja_V613_108_Enforcers_Excel_et_Galerie.zip"
        write_zip(complete, names, stage, timestamp)
        complete_report = verify_zip(complete, set(names), records)

        # Use exact compressed sizes from the complete ZIP. Standard ZIP headers
        # cost 76 + 2*UTF8-name-bytes per entry, plus one 22-byte end record.
        with zipfile.ZipFile(complete) as archive:
            entry_cost = {info.filename: info.compress_size + 76 + 2 * len(info.filename.encode("utf-8")) for info in archive.infolist()}

        def priority(name: str):
            if name in GENERATED_WRAPPERS:
                return 0, name
            if name not in native_paths:
                return 1, name
            return {"v613": 2, "v612": 3, "v611": 4}[next(version for version in VERSIONS if f"enforcers-{version}/" in name)], name

        partitions, partition, size = [], [], 22
        for name in sorted(names, key=priority):
            cost = entry_cost[name]
            if cost + 22 >= PART_LIMIT:
                raise ValueError(f"A single member cannot fit in a standard part: {name}")
            if partition and size + cost >= PART_LIMIT:
                partitions.append(partition)
                partition, size = [], 22
            partition.append(name)
            size += cost
        if partition:
            partitions.append(partition)
        part_reports, union = [], set()
        for index, partition in enumerate(partitions, 1):
            expected = set(partition)
            if union & expected:
                raise ValueError("The parts must have disjoint payload membership")
            union.update(expected)
            target = out / f"Yautja_V613_Partie_{index:02d}_sur_{len(partitions):02d}.zip"
            write_zip(target, partition, stage, timestamp)
            report = verify_zip(target, expected, records, PART_LIMIT)
            report.update({"part": index, "parts": len(partitions), "strictlyBelow95MiB": True, "nativePngFiles": len(expected & native_paths), "xlsxFiles": len(expected & expected_workbooks)})
            part_reports.append(report)
        if union != set(names):
            raise ValueError("The union of the ZIP parts differs from the complete ZIP")
        archive_index = {
            "version": "V6.13", "publishedCommit": commit, "partLimitBytesExclusive": PART_LIMIT,
            "complete": complete_report, "parts": part_reports, "partsUnionEqualsComplete": True, "duplicateEntriesAcrossParts": 0,
            "extractionFR": "Extraire toutes les parties ZIP standard dans le même dossier, conserver l’arborescence, puis ouvrir index.html. Le ZIP complet contient la même livraison en une seule archive.",
        }
        report = {
            **archive_index, "passed": True, "sourceMainCommit": BASE, "githubPullRequest": PR_URL,
            "nativePngFiles": 108, "xlsxFiles": 13, "exactWorkbookPathsVerified": sorted(expected_workbooks),
            "exactNativePathsVerified": sorted(native_paths), "originalProjectWorkbookHashesPreserved": 9,
            "everyPayloadHashVerified": True, "repositoryPayloadsMatchPublishedCommit": True,
            "repositoryPayloadsReadDirectlyFromCommit": True, "repositoryPayloadCount": len(files),
            "offlineGalleryLinksVerified": offline_links_checked,
            "generatedWrapperPaths": sorted(GENERATED_WRAPPERS), "generatedWrappersHaveSeparateProvenance": True,
            "includedScriptPaths": sorted(name for name in files if name.startswith("scripts/")),
            "includedTestPaths": sorted(name for name in files if name.startswith("tests/")),
            "finalPromptsRecoveredV613": recovered_prompts, "finalPromptsUnrecoveredV613": 36 - recovered_prompts,
        }
        (out / "SHA256_ARCHIVES.json").write_bytes(json_bytes(archive_index))
        (out / "SHA256_FICHIERS.json").write_bytes(content)
        (out / "LISEZ_MOI.txt").write_bytes(wrappers["LISEZ_MOI.txt"])
        (out / "pack-verification.json").write_bytes(json_bytes(report))
        print(json.dumps({"passed": True, "publishedCommit": commit, "nativePngFiles": 108, "xlsxFiles": 13, "complete": complete_report, "parts": part_reports, "partsUnionEqualsComplete": True, "report": str(out / "pack-verification.json")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
