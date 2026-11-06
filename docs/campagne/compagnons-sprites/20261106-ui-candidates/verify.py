"""Vérifie les six PNG du lot UI; aucun test de jeu ou de fidélité lore."""
from pathlib import Path
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
seen = set()
checks = []
for asset in manifest['assets']:
    path = root / asset['file']
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    assert digest == asset['sha256'], f"Empreinte différente: {path.name}"
    assert digest not in seen, f"Doublon exact: {path.name}"
    seen.add(digest)
    with Image.open(path) as source:
        source.verify()
    with Image.open(path) as source:
        image = source.convert('RGBA')
        assert image.size == (64, 64), f"Dimensions: {path.name}"
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255), f"Alpha inutilisable: {path.name}"
        bbox = alpha.getbbox()
        assert bbox and 0 < bbox[0] < bbox[2] < 64 and 0 < bbox[1] < bbox[3] < 64
        transparent = alpha.histogram()[0]
        assert 0 < transparent < 4096
    checks.append({'file': path.name, 'sha256': digest, 'dimensions': [64, 64],
                   'alpha_bbox': list(bbox), 'transparent_pixels': transparent,
                   'binary_check': 'pass'})
assert len(checks) == 6
print(json.dumps({'count': len(checks), 'binary_checks': 'pass', 'checks': checks,
                  'game_tests_executed': False, 'lore_1_to_1_certified': False,
                  'human_art_validation': False}, ensure_ascii=False, indent=2))
