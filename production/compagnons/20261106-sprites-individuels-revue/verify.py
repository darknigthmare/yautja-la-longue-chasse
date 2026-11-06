from pathlib import Path
from PIL import Image
import hashlib
import json

root = Path(__file__).resolve().parent
m = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))
assets = m["assets"]
assert len(assets) == 39
assert len({a["id"] for a in assets}) == len(assets)
assert len({a["file"] for a in assets}) == len(assets)
assert {str(p.relative_to(root)) for p in (root / "sprites").rglob("*.png")} == {a["file"] for a in assets}
for a in assets:
    p = root / a["file"]
    assert hashlib.sha256(p.read_bytes()).hexdigest() == a["sha256"], p
    with Image.open(p) as im:
        im.load()
        assert im.mode == "RGBA" and im.size == (80, 96), p
        alpha = im.getchannel("A")
        low, high = alpha.getextrema()
        assert low == 0 and high > 0, p
        box = alpha.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < 80 and box[3] < 96, p
    assert a["frames"] == 1
    assert not a["humanValidated"] and not a["loreFidelityValidated"]
    assert not a["approvedForRuntime"] and not a["inGameTested"]
assert not m["publishedToGitHub"]
assert m["counts"]["publishedToPullRequest"] == 0
print("39 PNG individuels : contrôles techniques réussis. Fidélité 1:1, animation et intégration NON validées.")
