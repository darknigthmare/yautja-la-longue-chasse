#!/usr/bin/env python3
"""Verify the committed candidate images, not gameplay or human art approval.

Requires Pillow, already used by the repository's raster verification tooling.
No image is changed and no generated file outside the repository is required.
"""
from pathlib import Path
import hashlib
import json

from PIL import Image


def main():
    root = Path(__file__).resolve().parents[4]
    checks = []
    for directory in ("20261109", "20261109-p1"):
        base = root / "public/game/warp-universe" / directory
        manifest = json.loads((base / "manifest.json").read_text())
        for asset in manifest["assets"]:
            path = root / asset["path"]
            assert path.is_relative_to(base), asset["id"]
            assert path.is_file(), path
            assert hashlib.sha256(path.read_bytes()).hexdigest() == asset["sha256"], path
            with Image.open(path) as image:
                image.load()
                assert image.size == (asset["width"], asset["height"]), path
                assert image.mode == asset["mode"], path
                if asset["alphaRange"] is not None:
                    alpha = image.getchannel("A")
                    assert list(alpha.getextrema()) == asset["alphaRange"], path
                    assert list(alpha.getbbox()) == asset["alphaBounds"], path
                    assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] > 0, path
                    if asset["id"] == 202:
                        assert alpha.getpixel((image.width // 2, image.height // 2)) == 0
            assert asset["artisticValidated"] is False, path
            assert asset["animationFrames"] == 1, path
            if asset.get("origin") == "existing-source-candidate":
                assert path.read_bytes() == (root / asset["source"]).read_bytes(), path
            if directory.endswith("-p1"):
                assert asset["runtimeReferenced"] is False, path
                assert asset["visualInspectedByAgent"] is True, path
            checks.append({"id": asset["id"], "path": asset["path"], "sha256": asset["sha256"]})
    ids = {row["id"] for row in checks}
    assert ids == {98, 178, 179, 180, 184, 185, 186, *range(189, 204)}
    report = json.loads((Path(__file__).parent / "verification.json").read_text())
    for source, expected in report["sourceSha256"].items():
        assert hashlib.sha256((root / source).read_bytes()).hexdigest() == expected, source
    print(json.dumps({"passed": True, "scope": "22 PNG candidates: exact hashes, decode, dimensions, original copies and real alpha; not gameplay or human art certification", "images": len(checks), "newImages": 19, "reusedOriginals": 3, "unfulfilledImageRequests": [97, 208, 209, 210], "checks": checks}, ensure_ascii=False))


if __name__ == "__main__":
    main()
