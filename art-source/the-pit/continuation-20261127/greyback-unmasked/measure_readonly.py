"""Inspect unmodified PNGs. Writes JSON measurements only, never image pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent


def inspect(path):
    with Image.open(path) as image:
        alpha = image.getchannel("A")
        histogram = alpha.histogram()
        count = image.width * image.height
        solid = alpha.point(lambda value: 255 if value > 127 else 0)
        left = solid.crop((0, 1380, 512, 1536)).getbbox()
        right = solid.crop((512, 1380, 1024, 1536)).getbbox()
        left = [left[0], left[1] + 1380, left[2], left[3] + 1380]
        right = [right[0] + 512, right[1] + 1380, right[2] + 512, right[3] + 1380]
        borders = [alpha.crop((0, 0, image.width, 1)), alpha.crop((0, image.height - 1, image.width, image.height)), alpha.crop((0, 0, 1, image.height)), alpha.crop((image.width - 1, 0, image.width, image.height))]
        return {
            "file": path.name,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "bytes": path.stat().st_size,
            "mode": image.mode,
            "size": list(image.size),
            "alphaRange": list(alpha.getextrema()),
            "alphaZeroPixels": histogram[0],
            "alphaZeroPercent": 100 * histogram[0] / count,
            "alphaBelow3Percent": 100 * sum(histogram[:3]) / count,
            "alphaAbove250Percent": 100 * sum(histogram[251:]) / count,
            "alphaBoundsAbove2": list(alpha.point(lambda value: 255 if value > 2 else 0).getbbox()),
            "alphaBoundsAbove127": list(solid.getbbox()),
            "maxEdgeAlpha": max(border.getextrema()[1] for border in borders),
            "footBandMeasurement": {"alphaThreshold": 127, "band": [0, 1380, 1024, 1536], "leftBounds": left, "rightBounds": right, "lowestOpaqueY": max(left[3], right[3]) - 1, "footSpanPixels": right[2] - left[0], "spanCenterX": (left[0] + right[2]) / 2},
            "pixelEdits": "none; byte copy only; Pillow used for read-only measurement",
        }


entries = [inspect(path) for path in sorted(ROOT.glob("*.png"))]
anchor = next(entry for entry in entries if entry["file"] == "preview-calm-01-right.png")["footBandMeasurement"]
for entry in entries:
    if entry["file"] != "reference-original.png":
        feet = entry["footBandMeasurement"]
        entry["footDeltaVsFirstCandidate"] = {
            "left": [x - y for x, y in zip(feet["leftBounds"], anchor["leftBounds"])],
            "right": [x - y for x, y in zip(feet["rightBounds"], anchor["rightBounds"])],
            "lowestOpaqueY": feet["lowestOpaqueY"] - anchor["lowestOpaqueY"],
            "spanCenterX": feet["spanCenterX"] - anchor["spanCenterX"],
        }
    (ROOT / (Path(entry["file"]).stem + ".measurements.json")).write_text(json.dumps(entry, indent=2) + "\n")
report = {"schemaVersion": 1, "method": "Read-only Pillow decode. Bounds are half-open. Foot bands measure occupied opaque pixels near the soles, not anatomical joints or certified sprite pivots.", "entries": entries}
(ROOT / "measurements.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps([{"file": entry["file"], "sha256": entry["sha256"], "alphaZeroPercent": entry["alphaZeroPercent"], "maxEdgeAlpha": entry["maxEdgeAlpha"], "foot": entry["footBandMeasurement"], "drift": entry.get("footDeltaVsFirstCandidate")} for entry in entries], indent=2))
