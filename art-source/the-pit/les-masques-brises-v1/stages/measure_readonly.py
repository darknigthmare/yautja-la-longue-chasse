"""Measure scene PNGs without rewriting image data."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent

def inspect(path):
    raw = path.read_bytes()
    with Image.open(path) as image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        histogram = alpha.histogram() if alpha else None
        return {
            "file": path.name,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "gitBlobSha": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(),
            "size": list(image.size),
            "mode": image.mode,
            "format": image.format,
            "landscape": image.width > image.height,
            "alphaRange": list(alpha.getextrema()) if alpha else None,
            "alphaZeroPixels": histogram[0] if histogram else 0,
            "alphaBoundsAbove1": list(alpha.point(lambda v: 255 if v > 1 else 0).getbbox()) if alpha else [0,0,image.width,image.height],
            "alphaBoundsAbove32": list(alpha.point(lambda v: 255 if v > 32 else 0).getbbox()) if alpha else [0,0,image.width,image.height],
            "pixelEdits": "none; native output copied or data-URL decoded byte for byte",
            "interpretation": "One flattened scene concept; no native parallax layers or collision proof."
        }

if __name__ == "__main__":
    report = {"schemaVersion":1,"method":"Read-only Pillow decode and hashes. Does not establish artistic admission.","entries":[inspect(p) for p in sorted(ROOT.glob("*.png"))]}
    (ROOT / "measurements.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(report,ensure_ascii=False,indent=2))
