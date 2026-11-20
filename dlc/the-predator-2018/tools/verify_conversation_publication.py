#!/usr/bin/env python3
"""Verify preservation of conversation files without running any archived game code."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'publication/20261117-source-completion/available-inputs.json'


def verify(root: Path) -> dict:
    root = root.resolve()
    source = json.loads((root / MANIFEST).read_text(encoding='utf-8'))
    rows = source['inputs']
    if len(rows) != source['availableInputCount'] or len(rows) != 45:
        raise ValueError('Expected 45 independently inventoried conversation inputs')
    if len({row[0] for row in rows}) != len(rows):
        raise ValueError('Duplicate input names')
    direct: dict[tuple, list[str]] = {}
    members: dict[tuple, list[str]] = {}
    archive_count = member_count = 0
    art_pngs = []
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Symlink refused: {path}')
        if not path.is_file():
            continue
        if not path.resolve().is_relative_to(root):
            raise ValueError(f'Escaping path: {path}')
        raw = path.read_bytes()
        rel = path.relative_to(root).as_posix()
        direct.setdefault((len(raw), hashlib.sha256(raw).hexdigest()), []).append(rel)
        if rel.startswith('production/art/') and path.suffix.lower() == '.png':
            with Image.open(io.BytesIO(raw)) as image:
                image.verify()
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                art_pngs.append({'path': rel, 'width': image.width,
                                 'height': image.height, 'mode': image.mode})
        if path.suffix.lower() == '.zip':
            archive_count += 1
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                entries = [entry for entry in archive.infolist() if not entry.is_dir()]
                if len(entries) > 1024 or sum(i.file_size for i in entries) > 64_000_000:
                    raise ValueError(f'Archive exceeds verification limits: {rel}')
                if archive.testzip() is not None:
                    raise ValueError(f'ZIP CRC failed: {rel}')
                for entry in entries:
                    p = PurePosixPath(entry.filename)
                    if p.is_absolute() or '..' in p.parts or '\\' in entry.filename:
                        raise ValueError(f'Unsafe ZIP member: {rel}!/{entry.filename}')
                    content = archive.read(entry)
                    key = (len(content), hashlib.sha256(content).hexdigest())
                    members.setdefault(key, []).append(rel + '!/' + entry.filename)
                    member_count += 1
    coverage = []
    source_pngs = 0
    for name, size, digest in rows:
        key = (size, digest)
        matches = direct.get(key, []) or members.get(key, [])
        if not matches:
            raise ValueError(f'Missing or changed conversation input: {name}')
        if name.startswith('a_') and name.endswith('.png'):
            source_pngs += 1
            if not any(p.startswith('production/art/') for p in direct.get(key, [])):
                raise ValueError(f'Generated source PNG must be directly browsable: {name}')
        coverage.append({'source': name, 'bytes': size, 'sha256': digest,
                         'locations': matches})
    if source_pngs != source['generatedSourcePngCount'] or source_pngs != 13:
        raise ValueError('Expected 13 unique original generated PNGs')
    original = root / 'history/YAUTJA_DLC_THE_PREDATOR_2018_V0_5_CANDIDATE1.zip'
    with zipfile.ZipFile(original) as archive:
        original_files = [i for i in archive.infolist() if not i.is_dir()]
        if len(original_files) != 51:
            raise ValueError('Expected 51 v0.5 original files')
        for entry in original_files:
            p = PurePosixPath(entry.filename)
            if p.parts[0] != 'THE_PREDATOR_2018_DLC_V0_5':
                raise ValueError('Unexpected v0.5 archive prefix')
            local = root.joinpath(*p.parts[1:])
            if local.read_bytes() != archive.read(entry):
                raise ValueError(f'Original v0.5 file changed: {local}')
    data = json.loads((root / 'src/data/game-data.json').read_text(encoding='utf-8'))
    scenes = [s for c in data['campaigns'].values() for s in c['scenes']]
    zones = sum(len(s['route']) for s in scenes)
    if len(scenes) != 52 or zones != 183:
        raise ValueError('The original campaign structure changed')
    return {'schema': 1, 'ok': True, 'operation': 'preservation-only-no-generation',
            'sourceInputsCovered': len(coverage), 'sourceInputsExpected': 45,
            'originalGeneratedPngsCovered': source_pngs, 'artPngsDecoded': len(art_pngs),
            'archivesCRCVerified': archive_count, 'archiveMembersHashed': member_count,
            'originalV05FilesUnchanged': 51, 'scenes': len(scenes), 'microZones': zones,
            'visualFidelityCertified': False, 'runtimeActivationPerformed': False,
            'unavailableOriginalArchives': source['unavailableOriginalArchives'],
            'coverage': coverage, 'artPngs': art_pngs}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        result = verify(args.root)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({k: v for k, v in result.items() if k not in ('coverage', 'artPngs')}, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
