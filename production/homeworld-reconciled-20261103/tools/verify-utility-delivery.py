#!/usr/bin/env python3
"""Verify the original utility delivery bytes without altering art or admission."""
import hashlib
import json
from pathlib import Path

from PIL import Image

PACK = Path(__file__).resolve().parents[1]
REPO = PACK.parents[1]


def verify():
    delivery = json.loads((PACK / 'delivery.json').read_text())
    native = json.loads((PACK / 'native-manifest.json').read_text())
    receipt = json.loads((PACK / 'delivery-files.json').read_text())
    assert delivery['newLot']['binaryFilesCommitted'] is True
    assert delivery['newLot']['uniqueFunctionalProps'] == 10
    assert delivery['newLot']['runtimeIntegrated'] is False
    assert delivery['newLot']['humanValidated'] is False
    assert delivery['newLot']['canonicalOneToOne'] is False
    assert len(delivery['images']) == len(native['assets']) == 20
    ids = {row[0] for row in delivery['targetBindings']}
    assert len(ids) == 10
    expected = {row['filename']: row for row in native['assets']}
    assert len(expected) == 20
    for name, digest, count, width, height, margin in delivery['images']:
        path = PACK / 'native' / name
        assert path.resolve().parent == (PACK / 'native').resolve(), name
        raw = path.read_bytes()
        assert len(raw) == count and hashlib.sha256(raw).hexdigest() == digest, name
        asset = expected[name]
        assert asset['propId'] in ids and asset['sha256'] == digest, name
        assert asset['runtimeIntegrated'] is False and asset['humanValidated'] is False
        assert asset['canonicalCertification'] is False
        with Image.open(path) as image:
            image.load()
            assert image.mode == 'RGBA' and image.size == (width, height), name
            alpha = image.getchannel('A')
            assert alpha.getextrema() == (0, 255), name
            bounds = alpha.getbbox()
            assert bounds, name
            measured = min(bounds[0], bounds[1], width - bounds[2], height - bounds[3])
            assert measured == margin and measured >= 48, name
    assert {p.name for p in (PACK / 'native').glob('*.png')} == set(expected)
    models = [row for row in receipt['files'] if row['path'].endswith('.blend')]
    assert len(models) == 10
    for row in models:
        path = (REPO / row['path']).resolve()
        assert path.parent == (PACK / 'geometry').resolve(), row['path']
        raw = path.read_bytes()
        assert len(raw) == row['bytes'], row['path']
        assert hashlib.sha256(raw).hexdigest() == row['sha256'], row['path']
    assert {p.name for p in (PACK / 'geometry').glob('*.blend')} == {
        Path(row['path']).name for row in models
    }
    for prop in ids:
        views = [row for row in native['assets'] if row['propId'] == prop]
        assert {row['facing'] for row in views} == {'front', 'rear'}, prop
        assert {row['objectYawDegrees'] for row in views} == {25, 205}, prop
    print(json.dumps({'sourceIntegrity': 'PASS', 'functionalProps': 10,
                      'independentPNG': 20, 'editableBlendSources': 10,
                      'runtimeAdmission': False, 'canonicalCertification': False}))


if __name__ == '__main__':
    verify()
