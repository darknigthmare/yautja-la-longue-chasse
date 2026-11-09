#!/usr/bin/env python3
"""Restore all 43 original files from the user's local ZIP. No network or Git write.
Existing non-identical files are rejected before any file is created.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import zipfile
from pathlib import Path, PurePosixPath

SHA256 = '65fba89f2148ee36cea58bafde3f93066f5a1883dea02f10dfef95350194b320'
NAME = 'ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0'

def restore(archive: Path, target: Path) -> dict:
    raw = archive.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SHA256:
        raise ValueError('Unexpected source archive: SHA256 mismatch')
    target = target.resolve()
    prepared = {}
    with zipfile.ZipFile(archive) as z:
        if len(z.infolist()) != 43 or z.testzip() is not None:
            raise ValueError('Invalid original archive')
        if sum(i.file_size for i in z.infolist()) > 10_000_000:
            raise ValueError('Archive exceeds expected size')
        for item in z.infolist():
            path = PurePosixPath(item.filename)
            if item.is_dir() or path.is_absolute() or '..' in path.parts or '\\' in item.filename or path.parts[0] != NAME or (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Unsafe archive path')
            dest = target / 'v0.1.0' / Path(*path.parts[1:])
            if not dest.resolve().is_relative_to((target/'v0.1.0').resolve()) or dest in prepared:
                raise ValueError('Duplicate or escaped destination')
            prepared[dest] = z.read(item)
    prepared[target/'releases'/f'{NAME}.zip'] = raw
    for dest, data in prepared.items():
        if dest.exists() and dest.read_bytes() != data:
            raise ValueError(f'Refusing to overwrite changed file: {dest}')
    created = 0
    for dest, data in prepared.items():
        if dest.exists():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open('xb') as stream:
            stream.write(data)
        created += 1
    version = target/'v0.1.0'
    for line in (version/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        expected, relative = line.split('  ', 1)
        path = (version/relative).resolve()
        if not path.is_relative_to(version.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Original checksum mismatch: {relative}')
    return {'originalFiles':43,'originalImages':25,'svg':18,'png':7,'created':created,'sourceSha256':SHA256,'gitPushPerformed':False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--target', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args.archive, args.target), indent=2))
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        raise SystemExit(str(exc)) from exc

if __name__ == '__main__':
    main()
