#!/usr/bin/env python3
"""Inspect the original PNG bytes and rebuild normalized art metadata.

This script does not alter any PNG or original generation record. Dependencies:
Pillow and NumPy. Execute from any directory; --root may name another copy of
the complete staging tree. The art status remains separate from game evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


BATCH = "cinematic-assets-batch-01-20261105"
BASELINE = "a7f830c05fd4b5801fd379ca7e7313774af2659a"
REPOSITORY = "darknigthmare/yautja-la-longue-chasse"
DESTINATIONS = {
    "jungle": ("planet-oseris-iv", "Oseris-IV"),
    "ice": ("planet-nivalis-k", "Nivalis-K"),
    "volcano": ("planet-cinder-12", "Cinder-12"),
    "swamp": ("planet-naraka-delta", "Naraka-Delta"),
    "desert": ("planet-serekh-9", "Serekh-9"),
    "ocean": ("planet-pelagos-m", "Pelagos-M"),
    "fungal": ("planet-mycora-v", "Mycora-V"),
    "ruins": ("planet-acheron-sigma", "Acheron-Sigma"),
}
MATERIALS = {
    "jungle": "Terre humide, litière et débris végétaux sobres.",
    "ice": "Poudre de neige, glace et éclats translucides bleu-gris.",
    "volcano": "Cendre froide, basalte et grains poreux sans feu ajouté.",
    "swamp": "Tourbe humide, boue, gouttelettes et fibres de roseau.",
    "desert": "Sable ocre, grès et grains minéraux secs.",
    "ocean": "Eau gris-bleu, gouttes et fragments de mousse claire.",
    "fungal": "Litière fongique, fibres et poussières organiques non lumineuses.",
    "ruins": "Pierre usée, éclats de maçonnerie et poussière minérale claire.",
}
FAMILY_NOTES = {
    "impact-front": "Éventail initial de matière; conserver le contact bas et un centre lisible pour la capsule.",
    "impact-settle": "Retombée distincte de l'impact initial; détails fins et espacés à vérifier à l'échelle finale.",
    "ship-ground-wash": "Souffle bas et latéral, moins haut que l'impact; ne pas le rendre comme une explosion.",
    "foot-contact": "Petit effet matériel de pas; réduire fortement sa taille et éviter qu'il masque les pieds.",
    "fragment": "Objet individuel détouré; pivot au centre du canevas et support calculé sur la silhouette.",
    "pod-glow-reinforcement": "Renfort lumineux uniquement; le sprite de capsule et son éclairage peint restent intacts.",
}

# Independent review notes are completed after opening the rendered overview.
# A source-art review is not a canonical fidelity, runtime or human approval.
VISUAL_REVIEW_SHA256: dict[str, str] = {
    "arrival-pod-flight-glow-reinforcement": "47814836cc10b5343914d28dd5a4342b7100da4c27ed14d0fbd13627cc7f71b4",
    "arrival-pod-ground-glow-reinforcement": "345cb95a0bbf7f27457ac070595a062e4c3330358e539c5b0579d48f7adb86c0",
    "arrival-impact-front-jungle": "6d72877bd07e7c8791deb0245239a9ec4f3bae721e8c4916522975649909274a",
    "arrival-impact-front-ice": "3e2aa0202f46947a160de26f93824b96905a2d40d204809591dd5a0977778c78",
    "arrival-impact-front-volcano": "69fb0a1b232fc64068c7dd9f1837a2eaf11545506d1911d28429222d5f66e525",
    "arrival-impact-front-swamp": "f223b363006ca54c60313f1a39bcce01793ea6a62fe65eee27d06495ec5dd7e2",
    "arrival-impact-front-desert": "6b1e88357bc4031da539d2a8ab5b4f72b4fbdbdb0c400a515887d663b716b447",
    "arrival-impact-front-ocean": "b69c7a6b4d02fb0c7900f679e41f38aac3f1e41dbd454b1e7d25831b362d6dc9",
    "arrival-impact-front-fungal": "c4f86bf814485ecec5d44cc42bef015f8189e52653377752812b18e6165b265a",
    "arrival-impact-front-ruins": "d1c28f52682a1ba30b00bb315959a1fee533c84af65fef7972b8e3a1654bc43f",
    "arrival-impact-settle-jungle": "be7a34c6ccc8aa3d258cadf436a3d9fe9ac3ab94845d8b70866e93d2e059aeb2",
    "arrival-impact-settle-ice": "52c99256029e45ea6046b7c47fb09879ca89a88b53ed3dbfc8b0bbf4a5fd8545",
    "arrival-impact-settle-volcano": "87965a3312d315cb5722bad9ba21347c5e5eec7ca05406bb49291d0e3cbc5964",
    "arrival-impact-settle-swamp": "a81150e91632a3aea5b248327f76c7a7df458720c422fdfe5edf3b9949605697",
    "arrival-impact-settle-desert": "c02ba8ea8eb8d6d7bef22c49d8eecb79d8ba4c0b7e3433b4027d1f7b3821fb55",
    "arrival-impact-settle-ocean": "edf53ae4e417cda6fdc869b2db1fc4a3b162caa9c9613c8da003a54e21881336",
    "arrival-impact-settle-fungal": "ec2f88e7733b510a5308836feea8bacb84ce27194a8ab6a0f94fdbfb4d1280aa",
    "arrival-impact-settle-ruins": "0c96b94298242a34dbe628afd472d0dc949352546ca0faee70d58db00e8526b4",
    "arrival-ship-ground-wash-jungle": "745272b9ba2e33d7e01bab2fe32524b58de43649f36362851a739363e56e806b",
    "arrival-ship-ground-wash-ice": "3e2df6fe896b352c7a32fc9f54c2ba9fb9eec6ad0b1c19e9faa2292d22262149",
    "arrival-ship-ground-wash-volcano": "c3cf9cf5a5fab1309e433d14419f51197969b3c459ec20c6e99847f4f2d13338",
    "arrival-ship-ground-wash-swamp": "0b85e8cbb405f1a9b7cced41e842a1c5bc300fc9878c637d57769cbfd6b1f35c",
    "arrival-ship-ground-wash-desert": "5b642c1114e910ae42ca6b280efbdd58cecef52e97559761b478db89e1ea56d7",
    "arrival-ship-ground-wash-ocean": "f2fcf71f1836c5819e1bcfa444de07bcf001c4ff5b33c6e89769f3ee14dc3503",
    "arrival-ship-ground-wash-fungal": "303ca23d82924a541454c73be6c83767242d7df3ee85f3c6678a46b54b2ef708",
    "arrival-ship-ground-wash-ruins": "4cf92eafdbe6e032d6585e6970931021c7f6e6f141db953e3ba04c9656625f62",
    "arrival-foot-contact-jungle": "896f18b64b0f76fa018a58169b770328300f4a982a699c4516ba25073012814b",
    "arrival-foot-contact-ice": "1f6ad946977bdf7da79e986084c7281f2c683963b28e7260a9baf7709577bcee",
    "arrival-foot-contact-volcano": "6da3d0853b587b2c1a44598e257b74ff4d3e465ca4b4856a71947f654405c22b",
    "arrival-foot-contact-swamp": "3013ade89cda607865919c1d0476bdf708c084acab0c521f194c54b403aa5316",
    "arrival-foot-contact-desert": "b947f645037b4ba81c4750f7ae53f75fa326927fd4002bfe0cc401dbbd700bf4",
    "arrival-foot-contact-ocean": "a129f51491e2969adbb89429e1309b506f2294ccf7c3040e5e49650c35dee010",
    "arrival-foot-contact-fungal": "358b4bbb4fe635d82f1d245c8887dbfc4edb61d410a9ea904257f0e299a524e1",
    "arrival-foot-contact-ruins": "80bb79b096500b071927bd882db790c0c05e757fba3793d84fbff5788c9962d3",
    "arrival-fragment-jungle-a": "dd2cf20a16afb5ba2cb33029976f61eb372ec43ef4cae798d91fcc78744647e3",
    "arrival-fragment-jungle-b": "b5edfe4cbb12a5221736e5c9c59fa58e8196954f93d2fd490d060e1dae1f8a24",
    "arrival-fragment-ice-a": "d127b6684b422550bd93b374ec6379efc94861f33d38e3dc4399efa5e8aa3625",
    "arrival-fragment-ice-b": "73de3fe35b2e4127bcb1d2994f18b81268959838ad42f596f572ad566de1bc9c",
    "arrival-fragment-volcano-a": "57af3461c69fe78952c3092263fe5e6ba7412795c98b51ecc55566eead8c8d83",
    "arrival-fragment-volcano-b": "426b383697fc1d6fb9a66a2b0f4a0bd9e0aaab5ad98ecfd97b6283175f6f784a",
    "arrival-fragment-swamp-a": "c62cd3347e01ee0f711dc39eaaa839e8d326d7027c8be9d382809b8358bafbfc",
    "arrival-fragment-swamp-b": "b4134687e4f8da239a9dc4200142054a75ff51b5f4fc3a22ece7622ba8280512",
    "arrival-fragment-desert-a": "6e251c04c92091e09268a8fe7741380045abd491d8fcc7f75cb6b69780c8d305",
    "arrival-fragment-desert-b": "7f81fb4c7581cd70963b36f0164b48fcb03c9ccc45c1a838fc86bf1ad525d72e",
    "arrival-fragment-ocean-a": "511a48011ab2891e19ef0e2e216ba5decd19f5355b6013d986c85a10b06e9382",
    "arrival-fragment-ocean-b": "e1783e6d750cd7665af8a840fba6a3e4241b955cbd33f5038686ef8fd6fb5f68",
    "arrival-fragment-fungal-a": "731d2ab962adef2b498de04629b9ef0e9e15aa43e7e408374c7c852f36be5235",
    "arrival-fragment-fungal-b": "d19903c98b2df38e4f507b57bd3c14be9013b499b18d0070beed4a5a92819dcd",
    "arrival-fragment-ruins-a": "2f08e56aaaf4264de266a92c897b3f2e5a48d44c67fd85866217df8b36dc83ca",
    "arrival-fragment-ruins-b": "64a1056f1b23b590cb5bb62b8aee26f215cdaf64e3e0bcbc5979740683c702e1"
}
VISUAL_NOTES: dict[str, str] = {
    "arrival-pod-flight-glow-reinforcement": "Trois foyers ambre distincts et compacts, décentrés conformément au canevas source. Aucun rectangle visible sur les trois fonds examinés; le résidu alpha 1-4/255 reste documenté.",
    "arrival-pod-ground-glow-reinforcement": "Trois petits foyers ambre en triangle au sommet du canevas portrait. Espacement et absence de coque conservés; vérification de superposition réelle encore distincte.",
    "arrival-impact-front-jungle": "Deux bras terreux irréguliers et centre dégagé; contour doux et petites particules isolées, sans sol ajouté.",
    "arrival-impact-front-ice": "Éventail clair et froid, bordure en grains et jets asymétriques; pas de halo magique ni de plaque de terrain.",
    "arrival-impact-front-volcano": "Cendre gris sombre et grains minéraux; deux branches asymétriques sans lave ni flamme.",
    "arrival-impact-front-swamp": "Boue brune en rubans lourds et gouttes séparées; centre ouvert et silhouette distincte de la poussière sèche.",
    "arrival-impact-front-desert": "Sable ocre en filaments et grains fins; grand jet latéral asymétrique, centre lisible.",
    "arrival-impact-front-ocean": "Rubans d’eau et gouttes gris-bleu, centre ouvert; pas de disque de sol ni de fond océan peint.",
    "arrival-impact-front-fungal": "Matière organique brune et fibreuse en deux bras irréguliers; spores discrètes et non lumineuses.",
    "arrival-impact-front-ruins": "Poussière minérale beige avec petits éclats anguleux; silhouettes et valeurs distinctes de la boue.",
    "arrival-impact-settle-ocean": "Gouttes d’eau très espacées; silhouette volontairement légère. Vérifier sa lisibilité à la taille réelle et pendant le mouvement.",
    "arrival-impact-settle-fungal": "Fines particules fibreuses et petits débris bruns espacés; centre transparent, aucune émission lumineuse.",
    "arrival-impact-settle-ruins": "Petits éclats de pierre et traces de poussière descendante; une retombée distincte de l’éventail initial.",
    "arrival-fragment-jungle-a": "Un fragment brun irrégulier de matière terreuse/écorce, entièrement isolé; texture stratifiée lisible.",
    "arrival-fragment-jungle-b": "Une seule lamelle d’écorce incurvée; silhouette longue et distincte du fragment A.",
    "arrival-fragment-ice-a": "Une lame de glace effilée translucide et des facettes nettes; marges amples après régénération.",
    "arrival-fragment-ice-b": "Un agrégat neigeux compact aux faces granuleuses; variante distincte de la lame de glace.",
    "arrival-fragment-volcano-a": "Un éclat de basalte sombre, triangulaire et feuilleté; aucune lueur interne ajoutée.",
    "arrival-fragment-volcano-b": "Un morceau de scorie brun-roux poreux; géométrie trouée distincte du basalte A.",
    "arrival-fragment-swamp-a": "Une motte sombre et humide avec fibres; un seul fragment, sans terrain environnant.",
    "arrival-fragment-swamp-b": "Un fragment de roseau/fibre torsadé et déchiré; aucune coupe visible aux extrémités.",
    "arrival-fragment-desert-a": "Une pierre ocre stratifiée en triangle; matière sèche et silhouette complète.",
    "arrival-fragment-desert-b": "Une fine écaille sableuse beige; faible hauteur et bords irréguliers, différente du grès A.",
    "arrival-fragment-ocean-a": "Une goutte liquide étirée avec reflets internes et alpha transparent; pas de support ni d’ombre de sol.",
    "arrival-fragment-ocean-b": "Une membrane liquide triangulaire isolée; forme très différente de la goutte A, centre translucide.",
    "arrival-fragment-fungal-a": "Un fragment de substrat fibreux brun; matière organique et racines fines lisibles.",
    "arrival-fragment-fungal-b": "Un morceau de tissu fongique à lamelles, déchiré et isolé; aucune créature complète.",
    "arrival-fragment-ruins-a": "Un morceau de maçonnerie gris avec stries simples; pas de nouveau symbole ou glyphes inventés.",
    "arrival-fragment-ruins-b": "Une mince écharde minérale claire; forme effilée distincte de la dalle A."
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalized_path(value: str) -> str:
    """Keep meaningful relative provenance, never transient absolute sandboxes."""
    value = value.replace("\\", "/")
    for marker in ("/public/", "/work/", "/qa-recovery/", "/generated_images/"):
        if marker in value:
            return value.split(marker, 1)[1] if marker == "/generated_images/" else marker[1:] + value.split(marker, 1)[1]
    return Path(value).name if value.startswith("/") else value


def read_png(path: Path) -> tuple[dict, dict]:
    source_bytes = path.read_bytes()
    with Image.open(path) as im:
        if im.format != "PNG" or im.mode != "RGBA":
            raise ValueError(f"Expected RGBA PNG: {path.name} ({im.format}, {im.mode})")
        width, height = im.size
        rgba = np.asarray(im, dtype=np.uint8)
    a = rgba[:, :, 3]
    hist = np.bincount(a.ravel(), minlength=256)
    visible = a > 16
    ys, xs = np.nonzero(visible)
    if not len(xs):
        raise ValueError(f"No significant alpha content: {path.name}")
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    # Pixel-centre centroid, considering only significant alpha. Tiny stray alpha
    # values must not drag the pivot towards an otherwise empty canvas edge.
    weights = a[visible].astype(np.float64)
    cx = float(np.average(xs + 0.5, weights=weights))
    cy = float(np.average(ys + 0.5, weights=weights))
    border = np.concatenate((a[0], a[-1], a[1:-1, 0], a[1:-1, -1]))
    nonzero_bounds = [int(v) for v in (np.nonzero(a)[1].min(), np.nonzero(a)[0].min(), np.nonzero(a)[1].max() + 1, np.nonzero(a)[0].max() + 1)]
    px_count = width * height
    metadata = {
        "format": "PNG", "mode": "RGBA", "width": width, "height": height,
        "bytes": len(source_bytes), "sha256": sha256_bytes(source_bytes),
        "decodedRgbaSha256": sha256_bytes(rgba.tobytes()),
        "fullyTransparentFraction": round(float(hist[0] / px_count), 8),
        "partialAlphaFraction": round(float(hist[1:255].sum() / px_count), 8),
        "residualAlpha1To4Fraction": round(float(hist[1:5].sum() / px_count), 8),
        "visibleAlphaGt16Pixels": int(visible.sum()),
        "visibleBoundsAlphaGt16Px": bounds,
        "visibleBoundsAlphaGt16Normalized": [round(bounds[0] / width, 8), round(bounds[1] / height, 8), round(bounds[2] / width, 8), round(bounds[3] / height, 8)],
        "nonzeroAlphaBoundsPx": nonzero_bounds,
        "borderAlphaMax": int(border.max()),
        "borderAlphaNonzeroPixels": int((border > 0).sum()),
        "borderAlphaGt16Pixels": int((border > 16).sum()),
        "visiblePaddingPx": [bounds[0], bounds[1], width - bounds[2], height - bounds[3]],
        "alphaWeightedCentroidGt16Px": [round(cx, 6), round(cy, 6)],
        "alphaWeightedCentroidGt16Normalized": [round(cx / width, 8), round(cy / height, 8)],
        "significantAlphaThreshold": 16,
        "boundsConvention": "left/top inclusive; right/bottom exclusive",
    }
    checks = {
        "rgbaPng": True,
        "hasTransparentBackground": bool(hist[0] > px_count * 0.05),
        "hasVisibleContent": bool(visible.sum() > 500),
        "noSignificantBorderClipping": bool((border > 16).sum() == 0),
        "significantContentInsideCanvas": bool(bounds[0] > 0 and bounds[1] > 0 and bounds[2] < width and bounds[3] < height),
    }
    checks["passed"] = all(checks.values())
    return metadata, checks


def make_asset(root: Path, planned: dict) -> tuple[dict, dict]:
    asset_id = planned["id"]
    record_path = root / "work/records" / f"{asset_id}.json"
    record = json.loads(record_path.read_text())
    relative_png = record["file"]
    path = root / relative_png
    pixels, checks = read_png(path)
    runtime_path = path.with_suffix(".webp")
    runtime_bytes = runtime_path.read_bytes()
    with Image.open(path) as im:
        source_rgba = np.asarray(im, dtype=np.uint8)
    with Image.open(runtime_path) as im:
        runtime_dimensions = list(im.size)
        runtime_rgba = np.asarray(im.convert("RGBA"), dtype=np.uint8)
    same_dimensions = runtime_dimensions == [pixels["width"], pixels["height"]]
    alpha_preserved = same_dimensions and np.array_equal(source_rgba[:, :, 3], runtime_rgba[:, :, 3])
    rgba_preserved = same_dimensions and np.array_equal(source_rgba, runtime_rgba)
    visible_rgba_preserved = same_dimensions and np.array_equal(source_rgba[source_rgba[:, :, 3] > 0], runtime_rgba[source_rgba[:, :, 3] > 0])
    chunks, cursor = [], 12
    while cursor + 8 <= len(runtime_bytes):
        chunks.append(runtime_bytes[cursor:cursor + 4].decode("ascii", errors="replace"))
        size = int.from_bytes(runtime_bytes[cursor + 4:cursor + 8], "little")
        cursor += 8 + size + (size % 2)
    checks.update({"webpDimensionsPreserved": same_dimensions, "webpAlphaPreservedExactly": bool(alpha_preserved), "webpVisibleRgbaPreservedExactly": bool(visible_rgba_preserved), "webpLosslessBitstream": "VP8L" in chunks})
    checks["passed"] = all(v for k, v in checks.items() if k != "passed")
    reviewed = VISUAL_REVIEW_SHA256.get(asset_id) == pixels["sha256"]
    family = "pod-glow-reinforcement" if planned["family"] == "glow-reinforcement" else planned["family"]
    biome = planned.get("biome")
    anchor = record.get("intendedAnchor", {})
    origin = anchor.get("normalized", [0.5, 0.5] if family == "fragment" else [0.5, 0.78])
    width, height = pixels["width"], pixels["height"]
    bounds = pixels["visibleBoundsAlphaGt16Px"]
    q = record.get("technicalQA", {})
    warning_codes = []
    if pixels["borderAlphaMax"] > 0:
        warning_codes.append("LOW_ALPHA_BORDER_RESIDUE")
    if asset_id == "arrival-pod-flight-glow-reinforcement":
        warning_codes.append("FLIGHT_GLOW_BROAD_ALPHA_1_TO_4_RESIDUE")
    if family == "impact-settle":
        warning_codes.append("FINE_FALLOUT_REQUIRES_NATIVE_SCALE_REVIEW")
    visual = {
        "status": "reviewed-source-art" if reviewed else "pending-independent-visual-review",
        "reviewer": "independent-assistant",
        "notes": VISUAL_NOTES.get(asset_id, FAMILY_NOTES[family]),
        "humanApproved": False,
        "runtimeApproved": False,
        "method": "Original PNGs placed unchanged on dark, white and checker backgrounds in a QA document; all 50 inspected after Poppler rendering. Browser launch was unavailable in this sandbox.",
        "reviewedSha256": VISUAL_REVIEW_SHA256.get(asset_id),
    }
    alignment = {
        "intendedAnchorName": anchor.get("name", "fragment-center" if family == "fragment" else "ground-contact"),
        "intendedOriginNormalized": origin,
        "intendedOriginPx": [round(origin[0] * width, 4), round(origin[1] * height, 4)],
        "basis": anchor.get("basis", "Requested composition; runtime calibration pending."),
        "fullCanvasMustBePreserved": True,
        "visibleBoundsAlphaGt16Px": bounds,
        "measuredVisualCentroidNormalized": pixels["alphaWeightedCentroidGt16Normalized"],
    }
    if family == "fragment":
        alignment.update({
            "recommendedRotationPivotNormalized": [0.5, 0.5],
            "recommendedRotationPivotPx": [width / 2, height / 2],
            "unrotatedSupportBottomPx": bounds[3] - 0.5,
            "unrotatedSupportBottomNormalized": round((bounds[3] - 0.5) / height, 8),
            "supportNote": "Use the alpha>16 convex hull for rotated floor contact. The bbox bottom is valid only at zero rotation; do not use the transparent canvas edge as support.",
        })
    if family == "pod-glow-reinforcement":
        alignment.update({
            "sourceCanvasOverlayTopLeftPx": [0, 0],
            "sourceEmissionCentersPx": anchor.get("emissionCentersPx", []),
            "measuredEmissionRegistration": q.get("emissionRegistrationMeasurements", []),
            "emissionMeasurementMethod": q.get("emissionRegistrationMethod"),
            "reinforcementOnly": True,
        })
    refs = []
    for value in record.get("referenceImages", []):
        relative = normalized_path(value)
        refs.append({"path": relative, "includedInStaging": (root / relative).is_file(), "role": "generation reference; see exact prompt"})
    destination = {"id": DESTINATIONS[biome][0], "name": DESTINATIONS[biome][1]} if biome else None
    asset = {
        "id": asset_id, "family": family, "biome": biome,
        "destination": destination, "variant": planned.get("variant"),
        "file": relative_png, "runtimeUrl": "/" + relative_png.removeprefix("public/"),
        "material": MATERIALS.get(biome, "Émission ambre de la capsule existante."),
        "raster": pixels,
        "runtime": {"file": str(runtime_path.relative_to(root)), "url": "/" + str(runtime_path.relative_to(root)).removeprefix("public/"), "format": "WEBP", "encoding": "lossless-VP8L", "width": runtime_dimensions[0], "height": runtime_dimensions[1], "bytes": len(runtime_bytes), "sha256": sha256_bytes(runtime_bytes), "decodedRgbaSha256": sha256_bytes(runtime_rgba.tobytes()), "dimensionsPreserved": same_dimensions, "alphaPreservedExactly": bool(alpha_preserved), "allRgbaPreservedExactly": bool(rgba_preserved), "visibleRgbaPreservedExactly": bool(visible_rgba_preserved)},
        "alignment": alignment,
        "status": {"generated": True, "technicalSourceQA": checks["passed"], "visualSourceReviewed": reviewed, "integrated": False, "testedInEngine": False, "artisticHumanApproval": False},
        "visualReview": visual,
        "warnings": warning_codes,
        "provenance": {
            "generationMode": record.get("generationMode", "builtin-imagegen-reference"),
            "generatedSourceBasename": Path(record["generatedSource"]).name,
            "record": str(record_path.relative_to(root)),
            "exactSelectedPrompt": record["prompt"],
            "referenceImages": refs,
            "sourceRepositoryReference": record.get("sourceReference"),
            "baselineCommit": BASELINE,
        },
    }
    if asset["provenance"]["sourceRepositoryReference"]:
        # Source records may contain relative in-repo paths but no authentication.
        asset["provenance"]["sourceRepositoryReference"] = json.loads(json.dumps(asset["provenance"]["sourceRepositoryReference"]))
    return asset, {"id": asset_id, "checks": checks, "visualReview": visual, "warnings": warning_codes}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    root = args.root.resolve()
    plan = json.loads((root / "work/plan.json").read_text())
    if plan.get("baselineCommit") != BASELINE:
        raise ValueError("Unexpected baseline commit; explicitly review the new plan.")
    if len(plan["assets"]) != 50 or len({a["id"] for a in plan["assets"]}) != 50:
        raise ValueError("Expected exactly 50 distinct planned asset IDs.")
    assets, qa_assets = [], []
    for planned in plan["assets"]:
        asset, qa = make_asset(root, planned)
        assets.append(asset); qa_assets.append(qa)
    sha_unique = len({a["raster"]["sha256"] for a in assets}) == 50
    rgba_unique = len({a["raster"]["decodedRgbaSha256"] for a in assets}) == 50
    failures = [q["id"] for q in qa_assets if not q["checks"]["passed"]]
    now = datetime.now(timezone.utc).isoformat()
    warnings = {
        "LOW_ALPHA_BORDER_RESIDUE": "Les bords peuvent contenir un résidu alpha de 1 à 4/255. Aucun pixel significatif (alpha>16) ne touche un bord. Les PNG originaux sont conservés sans nettoyage automatique.",
        "FLIGHT_GLOW_BROAD_ALPHA_1_TO_4_RESIDUE": "Le renfort de vol contient un résidu alpha très faible sur une grande partie du canevas; vérifier l'absence de voile visible avec le mode de fusion réel et un gain lumineux mesuré.",
        "FINE_FALLOUT_REQUIRES_NATIVE_SCALE_REVIEW": "La retombée est volontairement bien plus fine que l'impact initial; sa présence et sa lisibilité à l'échelle du jeu doivent être vérifiées en mouvement.",
    }
    manifest = {
        "schemaVersion": 1, "batchId": BATCH, "batchNumber": 1,
        "generatedAt": now, "repository": REPOSITORY, "baselineCommit": BASELINE,
        "expectedCount": 50, "count": len(assets),
        "familyCounts": dict(Counter(a["family"] for a in assets)),
        "status": "source-art-complete; runtime verification tracked separately",
        "scope": "50 PNG individuels : 6 éléments par biome (8 biomes), plus 2 renforts lumineux. Aucune coque ni aucun personnage remplacé.",
        "pathBase": "paths relative to the root of this package; runtimeUrl relative to the game origin",
        "destinationMappingSource": {"repository": REPOSITORY, "path": "app/game/data.ts", "commit": BASELINE},
        "warningDefinitions": warnings,
        "assets": assets,
    }
    qa = {
        "schemaVersion": 1, "batchId": BATCH, "checkedAt": now,
        "method": "Original files decoded with Pillow; alpha metrics, encoded/decoded SHA256 and source-art review. No PNG modification.",
        "thresholds": {"significantAlpha": "alpha > 16/255", "minimumTransparentFraction": 0.05, "minimumVisiblePixels": 500},
        "results": {"expected": 50, "present": len(assets), "technicalPassed": len(assets) - len(failures), "technicalFailed": failures, "uniqueEncodedSHA256": sha_unique, "uniqueDecodedRGBA": rgba_unique, "visualSourceReviewed": sum(a["status"]["visualSourceReviewed"] for a in assets), "integratedClaimed": 0, "engineTestsClaimed": 0, "humanApprovalsClaimed": 0, "totalPngBytes": sum(a["raster"]["bytes"] for a in assets), "totalWebpBytes": sum(a["runtime"]["bytes"] for a in assets), "webpAlphaExactlyPreservedCount": sum(a["runtime"]["alphaPreservedExactly"] for a in assets), "webpVisibleRgbaExactlyPreservedCount": sum(a["runtime"]["visibleRgbaPreservedExactly"] for a in assets), "maximumBorderAlpha": max(a["raster"]["borderAlphaMax"] for a in assets)},
        "limitations": ["Source-level QA does not establish in-engine attachment, animation, performance or canonical 1:1 artistic fidelity.", "Transient low-alpha edge residues are measured and retained; no claim of alpha=0 at every edge.", "Visual review is performed by an assistant, not a human artistic sign-off."],
        "warningDefinitions": warnings,
        "assets": qa_assets,
    }
    target = root / "production" / BATCH
    target.mkdir(parents=True, exist_ok=True)
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (target / "qa-assets.json").write_text(json.dumps(qa, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(qa["results"], ensure_ascii=False))
    return 0 if not failures and sha_unique and rgba_unique else 1


if __name__ == "__main__":
    raise SystemExit(main())
