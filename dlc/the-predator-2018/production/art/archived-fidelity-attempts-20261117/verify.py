#!/usr/bin/env python3
"""Integrity check is distinct from film-fidelity approval."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    report = json.loads((root / 'REVIEW.json').read_text(encoding='utf-8'))
    for item in report['files']:
        path = (root / item['path']).resolve()
        if not path.is_relative_to(root) or path.is_symlink():
            raise ValueError('Unsafe asset path')
        raw = path.read_bytes()
        assert len(raw) == item['bytes'], item['path']
        assert hashlib.sha256(raw).hexdigest() == item['sha256'], item['path']
        with Image.open(path) as image:
            image.load()
            assert image.format == 'PNG'
            assert list(image.size) == [item['width'], item['height']]
            assert image.mode == item['mode']
            assert list(image.getchannel('A').getextrema()) == item['alphaRange']
            assert image.getchannel('A').histogram()[0] == item['fullyTransparentPixels']
        assert item['status'] == 'rejected-for-film-fidelity'
        assert not item['certifiedOneToOne'] and not item['runtimeEligible'] and not item['prPublished']
    print(f"Integrity: {len(report['files'])}/{len(report['files'])}; approved: {report['approvedSprites']}; new push: {report['pr']['newPushPerformed']}")
    if args.release:
        print('RELEASE REFUSED: no approved film-faithful asset in this pack.')
        return 2
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
