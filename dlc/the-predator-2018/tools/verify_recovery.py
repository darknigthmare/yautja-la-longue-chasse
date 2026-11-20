#!/usr/bin/env python3
"""Read-only verification of the original 2018 DLC recovery; no game code runs."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def verify(root=ROOT):
    report = json.loads((root / 'RECOVERY_INVENTORY_SHA256.json').read_text(encoding='utf-8'))
    files = report['files']
    if len(files) != report['sourceFiles'] or len(files) != 63:
        raise ValueError('Expected exactly 63 recovered originals/checksums')
    for rel, expected in files.items():
        posix = PurePosixPath(rel)
        if posix.is_absolute() or '..' in posix.parts or '\\' in rel:
            raise ValueError(f'Unsafe inventory path: {rel}')
        path = root / rel
        if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink():
            raise ValueError(f'Escaping or symlinked path: {rel}')
        raw = path.read_bytes()
        actual = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                  'gitBlobSha1': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}
        for key, value in actual.items():
            if expected[key] != value:
                raise ValueError(f'{rel}: {key} mismatch')
        if path.suffix == '.json':
            json.loads(raw)
        if path.suffix == '.zip':
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                if archive.testzip() is not None:
                    raise ValueError(f'{rel}: invalid ZIP CRC')
    original = root / 'history/YAUTJA_DLC_THE_PREDATOR_2018_V0_5_CANDIDATE1.zip'
    with zipfile.ZipFile(original) as archive:
        entries = [item for item in archive.infolist() if not item.is_dir()]
        if len(entries) != 51:
            raise ValueError('Expected 51 v0.5 originals')
        for entry in entries:
            parts = PurePosixPath(entry.filename).parts
            if parts[0] != 'THE_PREDATOR_2018_DLC_V0_5':
                raise ValueError('Unexpected original archive prefix')
            rel = str(PurePosixPath(*parts[1:]))
            if rel not in files or archive.read(entry) != (root / rel).read_bytes():
                raise ValueError(f'Original changed after recovery: {rel}')
    data = json.loads((root / 'src/data/game-data.json').read_text(encoding='utf-8'))
    scenes = [scene for campaign in data['campaigns'].values() for scene in campaign['scenes']]
    if len(scenes) != 52 or sum(len(scene['route']) for scene in scenes) != 183:
        raise ValueError('The original 52 scenes / 183 zones were not preserved')
    print(json.dumps({'verifiedFiles': len(files), 'originalV05Files': 51,
                      'scenes': len(scenes), 'microZones': 183, 'ok': True}))

if __name__ == '__main__':
    try:
        verify()
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
