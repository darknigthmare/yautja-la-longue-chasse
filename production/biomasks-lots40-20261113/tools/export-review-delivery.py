#!/usr/bin/env python3
"""Export the frozen new review namespace; reread every ZIP member byte-for-byte.

Run only after the final assets, manifest, workbook and representative QA captures
are frozen. No image is decoded, resized, re-encoded or otherwise transformed.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PACK = 'production/biomasks-lots40-20261113'
PUBLIC = 'public/game/biomasks-lots40-20261113'
TMP = Path('/tmp/mask-lots40-20261113')
MANIFEST = PUBLIC + '/manifest.json'
WORKBOOK = PACK + '/suivi/Yautja_Masques_Lots40_20261113.xlsx'
README = PACK + '/README.md'
DEFAULT_QA = tuple(PACK + '/qa/browser/' + name for name in (
    'desktop-abc.png', 'tint-preview.png', 'source-drawer.png', 'mobile-390-masks.png'))
BUFFER = 1024 * 1024


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(BUFFER):
            digest.update(chunk)
    return digest.hexdigest()


def repo_file(value: str) -> Path:
    if not isinstance(value, str) or not value or '\\' in value or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Normalized repository-relative filename required')
    relative = PurePosixPath(value)
    if relative.is_absolute() or '..' in relative.parts or value != relative.as_posix():
        raise ValueError('Unsafe repository-relative path: ' + value)
    path = ROOT / value
    cursor = ROOT
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise ValueError('Symlinked delivery sources are forbidden: ' + value)
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT):
        raise ValueError('Missing regular repository file: ' + value)
    return path


def pin(path: Path, name: str) -> dict:
    return {'path': name, 'sha256': digest_file(path), 'bytes': path.stat().st_size}


def output_path(value: str | None, manifest_sha: str) -> Path:
    result = Path(value).resolve() if value else TMP / ('Yautja_Masques_Lots40_20261113_' + manifest_sha[:12] + '.zip')
    if not result.is_relative_to(TMP) or result.is_relative_to(ROOT) or result.suffix.lower() != '.zip':
        raise ValueError('ZIP output must stay under /tmp/mask-lots40-20261113, outside the repository')
    if result.exists() or result.with_suffix('.zip.partial').exists() or result.with_suffix('.zip.report.json').exists():
        raise ValueError('Refusing to overwrite a prior delivery; use a fresh --output filename')
    return result


def collect(manifest: dict, qa_names: list[str]) -> tuple[dict[str, Path], list[dict]]:
    if manifest.get('id') != 'biomasks-lots40-20261113' or manifest.get('schemaVersion') != 1:
        raise ValueError('Unexpected frozen manifest')
    count = len(manifest.get('pairs', []))
    if not count or manifest['counts'].get('completeABC') != count or manifest['counts'].get('acceptedABPairs') != count:
        raise ValueError('Only a nonempty frozen complete A/B/C review can be exported')
    for pair in manifest['pairs']:
        if any(not isinstance(pair.get('version' + version), dict) for version in ('A', 'B', 'C')):
            raise ValueError('An accepted representation is missing A/B/C')
        if pair.get('status') in {'blocked', 'duplicate', 'alias'} or pair.get('duplicateOf') or pair.get('aliasOf'):
            raise ValueError('Blocked, duplicate or alias row cannot be exported as a produced triplet')
    declared = {}
    for field in ('nativeFiles', 'derivedFiles', 'sourceCopies'):
        for row in manifest[field]:
            name = row['path']
            if not name.startswith(PUBLIC + '/') or name in declared:
                raise ValueError('Repeated or external public resource: ' + name)
            declared[name] = row
    for pair in manifest['pairs']:
        for asset in [pair['version' + version] for version in ('A', 'B', 'C')] + pair.get('referenceImages', []):
            name = asset['path']
            if name not in declared or any(asset[key] != declared[name][key] for key in ('sha256', 'bytes')):
                raise ValueError('Gallery resource is absent from its declared new public namespace: ' + name)
            if asset.get('url') != '/' + name.removeprefix('public/'):
                raise ValueError('Gallery URL would not resolve under a simple public HTTP server: ' + name)
    expected = set(declared) | {MANIFEST, PUBLIC + '/review.html'}
    actual = {p.relative_to(ROOT).as_posix() for p in (ROOT / PUBLIC).rglob('*') if p.is_file() or p.is_symlink()}
    if actual != expected:
        raise ValueError('Public namespace differs from frozen manifest; unaccepted/rejected work files cannot be exported')
    sources = {name: repo_file(name) for name in sorted(actual)}
    for name, row in declared.items():
        actual_pin = pin(sources[name], name)
        if actual_pin['sha256'] != row['sha256'] or actual_pin['bytes'] != row['bytes']:
            raise ValueError('Frozen public resource changed: ' + name)
    for name in (WORKBOOK, README):
        sources[name] = repo_file(name)
    shots = qa_names or [name for name in DEFAULT_QA if (ROOT / name).is_file()]
    if len(set(shots)) != len(shots) or len(shots) < 2:
        raise ValueError('Select at least two distinct representative QA screenshots with --qa')
    qa_records = []
    evidence_path = ROOT / PACK / 'suivi/qa-evidence.json'
    evidence = json.loads(evidence_path.read_bytes()) if evidence_path.is_file() else None
    indexed = {r['path']: r for r in evidence['files']} if evidence else {}
    if evidence and evidence.get('manifestSha256') != digest_file(repo_file(MANIFEST)):
        raise ValueError('QA evidence index belongs to another manifest')
    for name in shots:
        if not name.startswith(PACK + '/qa/') or PurePosixPath(name).suffix.lower() not in {'.png', '.jpg', '.jpeg'}:
            raise ValueError('QA selection must name screenshots inside the new pack only')
        path = repo_file(name);record = pin(path, name)
        if evidence and (name not in indexed or any(record[key] != indexed[name][key] for key in ('sha256', 'bytes'))):
            raise ValueError('QA screenshot differs from its frozen evidence pin: ' + name)
        if record['sha256'] in {r['sha256'] for r in declared.values()}:
            raise ValueError('A native mask/source image cannot be mislabeled as a QA screenshot')
        sources[name] = path;qa_records.append(record)
    return sources, qa_records


def french_guide(manifest: dict) -> bytes:
    counts = manifest['counts']
    text = f'''YAUTJA — MASQUES SOURCÉS — LOT DU 13 NOVEMBRE 2026

Ce dossier contient {counts['completeABC']} représentations A/B/C terminées.
40 par domaine est une capacité maximale, pas un nombre déclaré produit.

Pour ouvrir la galerie après extraction, depuis la racine extraite :
    python3 -m http.server 8765 --directory public
Puis ouvrir :
    http://localhost:8765/game/biomasks-lots40-20261113/review.html

Les fichiers gardent leurs chemins relatifs :
    public/game/biomasks-lots40-20261113/originals/ : études A ImageGen
    public/game/biomasks-lots40-20261113/phg/       : rendus B de présentation PHG
    public/game/biomasks-lots40-20261113/neutral/   : bases C monochromes techniques
    public/game/biomasks-lots40-20261113/references/ : références R natives conservées
    {WORKBOOK}
    {README}

La galerie propose A/B/C, les références, les limites et un aperçu temporaire
de teinte sur C. Les dossiers bloqués, doublons et alias restent documentés.
Les peintures et éditions partageant une coque ne sont pas comptées comme
de nouvelles géométries canoniques.

C conserve le cadre et tous les octets alpha décodés de B, avec la recette
RGB entière srgb8-rec709-luma-v1. C reste une image 2D avec éclairage présent,
sans albédo 3D, PBR ou intégration dans le jeu. Aucune certification canonique,
validation artistique humaine ou clôture automatique de P0 n’est accordée.

Les PNG, photographies R et classeur sont conservés à octets identiques.
Les anciens lots et les tentatives ImageGen privées/rejetées ne sont pas inclus.
'''
    return text.encode('utf-8')


def info(name: str) -> ZipInfo:
    member = ZipInfo(name, (2026, 11, 13, 0, 0, 0))
    member.create_system = 3
    member.external_attr = 0o100644 << 16
    member.compress_type = ZIP_STORED if PurePosixPath(name).suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.xlsx'} else ZIP_DEFLATED
    return member


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frozen-manifest-sha', required=True, help='Explicit SHA256 approved after final freeze')
    parser.add_argument('--output', help='Fresh ZIP filename below /tmp/mask-lots40-20261113')
    parser.add_argument('--qa', action='append', default=[], help='Repository-relative representative screenshot; repeat as needed')
    args = parser.parse_args(arguments)
    if not re.fullmatch(r'[a-f0-9]{64}', args.frozen_manifest_sha):
        raise ValueError('Explicit frozen manifest SHA256 required')
    manifest_path = repo_file(MANIFEST)
    if digest_file(manifest_path) != args.frozen_manifest_sha:
        raise ValueError('Manifest differs from the explicitly frozen SHA')
    manifest = json.loads(manifest_path.read_bytes())
    output = output_path(args.output, args.frozen_manifest_sha)
    sources, qa_records = collect(manifest, args.qa)
    guide_dir = TMP / ('delivery-guide-' + args.frozen_manifest_sha[:12]);guide_dir.mkdir(parents=True, exist_ok=True)
    guide = guide_dir / 'LISEZ_MOI.txt';guide_bytes = french_guide(manifest)
    if guide.exists() and guide.read_bytes() != guide_bytes:
        raise ValueError('Refusing to overwrite a differing prior French guide')
    if not guide.exists():
        with guide.open('xb') as stream:stream.write(guide_bytes)
    sources['LISEZ_MOI.txt'] = guide
    records = [pin(source, name) for name, source in sorted(sources.items())]
    output.parent.mkdir(parents=True, exist_ok=True)
    partial = output.with_suffix('.zip.partial')
    with ZipFile(partial, 'x', allowZip64=True, compresslevel=9) as archive:
        for name, source in sorted(sources.items()):
            with source.open('rb') as stream, archive.open(info(name), 'w', force_zip64=True) as member:
                while chunk := stream.read(BUFFER):member.write(chunk)
    # Do not trust only ZIP CRCs or the write-time buffer: reread each archived
    # entry AND its source after assembly, then compare both SHA256 values.
    expected = {row['path']: row for row in records}
    with ZipFile(partial, 'r') as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != set(sources):
            raise ValueError('ZIP member set differs from selected source files')
        for name in names:
            digest = hashlib.sha256()
            with archive.open(name, 'r') as member:
                while chunk := member.read(BUFFER):digest.update(chunk)
            source_sha = digest_file(sources[name])
            if digest.hexdigest() != source_sha or source_sha != expected[name]['sha256'] or sources[name].stat().st_size != expected[name]['bytes']:
                raise ValueError('ZIP/source SHA256 mismatch or source changed during export: ' + name)
    partial.rename(output)
    report = {'schemaVersion': 1, 'asOfUtc': datetime.now(timezone.utc).isoformat(), 'passed': True,
              'archive': str(output), 'archiveSha256': digest_file(output), 'archiveBytes': output.stat().st_size,
              'manifestSha256': args.frozen_manifest_sha, 'entryCount': len(records),
              'sourceBytes': sum(row['bytes'] for row in records), 'allEntriesRereadAndSha256Compared': True,
              'repositoryRelativePathsPreserved': True, 'generatedRootGuide': 'LISEZ_MOI.txt',
              'completeABC': manifest['counts']['completeABC'], 'selectedQaScreenshots': qa_records,
              'privateOrRejectedOriginsIncluded': False, 'oldHistoricalPacksIncluded': False,
              'nativeRasterBytesChanged': False, 'canonCertified': False, 'humanArtValidated': False,
              'runtimeIntegrated': False, 'entries': records}
    report_path = output.with_suffix('.zip.report.json')
    with report_path.open('x', encoding='utf-8') as stream:json.dump(report, stream, ensure_ascii=False, indent=2);stream.write('\n')
    print(json.dumps({key: report[key] for key in ('passed', 'archive', 'archiveSha256', 'archiveBytes', 'entryCount', 'sourceBytes', 'completeABC')}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print('::error::' + (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), file=sys.stderr)
        raise
