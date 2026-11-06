"""Verify published source bytes. This is not an artistic or gameplay approval."""
from pathlib import Path
import hashlib
import io
import json
from PIL import Image


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify(root):
    # MANIFEST.json is the preserved record of the earlier local-only delivery.
    # Its old publication flags are historical, not the status of this PR.
    manifest = json.loads((root / 'MANIFEST.json').read_text(encoding='utf-8'))
    receipt = json.loads((root / 'DEPOT_PNG.json').read_text(encoding='utf-8'))
    assets = manifest['assets']
    require(len(assets) == receipt['individualPng'] == 39, 'Expected 39 PNGs')
    require(len({a['id'] for a in assets}) == 39, 'Duplicate identity/view')
    require(len({a['file'] for a in assets}) == 39, 'Duplicate source path')
    require(len({a['characterId'] for a in assets}) == 10, 'Expected ten draft identities')
    require(not receipt['artisticFidelity1to1Validated'], 'No artistic approval was obtained')
    require(not receipt['runtimeIntegrated'], 'No runtime integration belongs to this delivery')
    require(receipt['allPngSourceBytesPreserved'], 'Native source bytes must be retained')
    require(receipt['deliveryBranch'] == 'art/compagnons-individuels-20261106', 'Wrong delivery branch')
    actual_paths = {p.relative_to(root).as_posix() for p in (root / 'sprites').rglob('*.png')}
    require(actual_paths == {a['file'] for a in assets}, 'Missing or unlisted PNG')
    records = {a['id']: a for a in receipt['assets']}
    require(len(records) == 39 and set(records) == {a['id'] for a in assets}, 'Receipt identity mismatch')
    index = (root / 'INDEX_SPRITES.md').read_text(encoding='utf-8')
    total_bytes = 0
    hashes = set()
    for asset in assets:
        relative = Path(asset['file'])
        require(not relative.is_absolute() and '..' not in relative.parts, 'Unsafe path')
        path = root / relative
        require(not path.is_symlink(), 'Symlink is not a PNG source')
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        record = records[asset['id']]
        require(digest == asset['sha256'] == record['sha256'], f'SHA-256 mismatch: {path}')
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()
        require(blob == record['gitBlobSha'], f'Git blob mismatch: {path}')
        require(len(data) == record['bytes'], f'Size mismatch: {path}')
        require(record['path'].endswith('/' + relative.as_posix()), 'Receipt path mismatch')
        require('](' + relative.as_posix() + ')' in index, f'Index link missing: {path}')
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            require(image.format == 'PNG', f'Not PNG: {path}')
            require(image.mode == 'RGBA' and image.size == (80, 96), f'Unexpected frame: {path}')
            low, high = image.getchannel('A').getextrema()
            require(low == 0 and high > 0, f'Empty image or missing transparency: {path}')
            box = image.getchannel('A').getbbox()
            require(box and box[0] > 0 and box[1] > 0 and box[2] < 80 and box[3] < 96, f'Clipped bounds: {path}')
        require(asset['frames'] == 1 and not asset['animationReady'], 'Static view is not a verified animation')
        for flag in ('humanValidated', 'loreFidelityValidated', 'approvedForRuntime', 'inGameTested'):
            require(asset[flag] is False, f'Unsupported approval: {asset["id"]}.{flag}')
        require(record['humanValidated'] is False and record['approvedForRuntime'] is False, 'Receipt approval mismatch')
        hashes.add(digest)
        total_bytes += len(data)
    require(len(hashes) == 39, 'Duplicate source bytes')
    return {'individualPng': 39, 'characters': 10, 'bytes': total_bytes, 'technicalIntegrity': True, 'artisticFidelity1to1Validated': False, 'runtimeIntegrated': False}


if __name__ == '__main__':
    print(json.dumps(verify(Path(__file__).resolve().parent), ensure_ascii=False, indent=2))
