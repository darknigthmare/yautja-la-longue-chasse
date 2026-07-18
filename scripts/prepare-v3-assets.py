"""Build the registered V3 Yautja asset pack from OpenAI alpha atlases.

The runtime bind canvas is 256x384 with the feet resting on y=366. Bare body
archetypes and every anatomical body/net part remain on that complete canvas.
Wearable modules are exported twice:

* a tightly packed lossless WebP plus TexturePacker-style geometry metadata;
* a registered 256x384 WebP that can always be drawn at (0, 0).

This makes the DOM and Canvas renderers consume the same bind pose without
maintaining a second collection of hand-tuned insets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
RAW_SOURCE = ROOT / "art-source" / "v3"
SOURCE = ROOT / "art-source" / "v3" / "alpha"
OUTPUT = ROOT / "public" / "game" / "assets" / "v3"
HUNTER_OUTPUT = OUTPUT / "actors" / "yautja" / "hunter"
LOADOUT_ATLAS_NAME = "openai-loadout-trophy-atlas.png"

CANVAS_WIDTH = 256
CANVAS_HEIGHT = 384
BASELINE = 366
BODY_TARGET_HEIGHT = 350
BODY_MAX_WIDTH = 240
ALPHA_THRESHOLD = 8
TRIM_PADDING = 4

BODY_IDS = ("classic", "elder", "super", "feral", "huntress", "young")
MASK_IDS = (
    "jungle",
    "city",
    "elder",
    "scar",
    "celtic",
    "chopper",
    "wolf",
    "feral",
    "berserker",
    "fugitive",
    "dek",
    "enforcer",
)
EQUIPMENT_IDS = (
    "mount",
    "caster-upper",
    "caster-lower",
    "yoke",
    "cannon",
    "barrel",
    "muzzle",
    "laser",
    "gauntlet-base",
    "gauntlet-lid",
    "blade-housing",
    "blades",
)
ARMOR_IDS = (
    "chest-classic",
    "chest-city",
    "chest-avp",
    "chest-super",
    "shoulder-classic",
    "shoulder-avp",
    "shoulder-super",
    "shoulder-feral",
    "bracer",
    "thigh",
    "shin",
    "belt",
)
DREAD_IDS = (
    "classic",
    "ringed",
    "braided",
    "veteran",
    "elder",
    "temple",
    "feral",
    "huntress",
)
WEAPON_IDS = (
    "combistick",
    "combistick-folded",
    "smart-disc",
    "yautja-bow",
    "arrow",
)
GEAR_IDS = (
    "netgun",
    "motion-sensor",
    "audio-decoy",
    "snare",
)
TROPHY_IDS = (
    "trophy-skull",
    "trophy-spine",
    "trophy-bindings",
)
LOADOUT_IDS = WEAPON_IDS + GEAR_IDS + TROPHY_IDS
PART_IDS = (
    "head",
    "torso",
    "pelvis",
    "upper-arm-back",
    "lower-arm-back",
    "hand-back",
    "upper-arm-front",
    "lower-arm-front",
    "hand-front",
    "thigh-back",
    "shin-back",
    "foot-back",
    "thigh-front",
    "shin-front",
    "foot-front",
)

# Anatomical regions in normalized body-bounds space. Adjacent regions overlap
# around joints so rotating a child piece cannot reveal a transparent seam.
PART_POLYGONS: dict[str, tuple[tuple[float, float], ...]] = {
    "head": (
        (0.34, -0.02),
        (0.82, -0.02),
        (0.87, 0.19),
        (0.75, 0.24),
        (0.42, 0.24),
        (0.31, 0.14),
    ),
    "torso": (
        (0.25, 0.21),
        (0.62, 0.21),
        (0.70, 0.27),
        (0.68, 0.49),
        (0.60, 0.56),
        (0.38, 0.56),
        (0.28, 0.48),
        (0.22, 0.29),
    ),
    "pelvis": (
        (0.33, 0.49),
        (0.68, 0.49),
        (0.72, 0.64),
        (0.56, 0.68),
        (0.31, 0.63),
    ),
    "upper-arm-back": (
        (0.10, 0.19),
        (0.38, 0.20),
        (0.35, 0.34),
        (0.24, 0.45),
        (0.08, 0.42),
        (0.05, 0.28),
    ),
    "lower-arm-back": (
        (0.03, 0.35),
        (0.27, 0.34),
        (0.23, 0.56),
        (0.15, 0.64),
        (-0.01, 0.62),
        (-0.02, 0.45),
    ),
    "hand-back": (
        (-0.03, 0.55),
        (0.16, 0.54),
        (0.20, 0.72),
        (-0.03, 0.73),
    ),
    "upper-arm-front": (
        (0.62, 0.24),
        (0.78, 0.23),
        (0.88, 0.38),
        (0.77, 0.47),
        (0.66, 0.39),
    ),
    "lower-arm-front": (
        (0.75, 0.35),
        (0.91, 0.36),
        (1.01, 0.57),
        (0.91, 0.65),
        (0.82, 0.57),
    ),
    "hand-front": (
        (0.86, 0.54),
        (1.03, 0.53),
        (1.03, 0.72),
        (0.86, 0.73),
    ),
    "thigh-back": (
        (0.28, 0.54),
        (0.51, 0.54),
        (0.48, 0.78),
        (0.33, 0.82),
        (0.20, 0.69),
    ),
    "shin-back": (
        (0.19, 0.73),
        (0.43, 0.72),
        (0.38, 0.96),
        (0.22, 0.99),
        (0.12, 0.86),
    ),
    "foot-back": (
        (0.10, 0.91),
        (0.39, 0.91),
        (0.43, 1.02),
        (0.00, 1.02),
    ),
    "thigh-front": (
        (0.49, 0.54),
        (0.73, 0.53),
        (0.81, 0.68),
        (0.68, 0.82),
        (0.51, 0.78),
    ),
    "shin-front": (
        (0.59, 0.73),
        (0.82, 0.72),
        (0.91, 0.89),
        (0.79, 0.99),
        (0.60, 0.96),
    ),
    "foot-front": (
        (0.61, 0.91),
        (0.93, 0.89),
        (1.02, 1.02),
        (0.57, 1.02),
    ),
}

PART_FALLBACK_CENTERS: dict[str, tuple[float, float]] = {
    "head": (0.58, 0.10),
    "torso": (0.49, 0.36),
    "pelvis": (0.50, 0.58),
    "upper-arm-back": (0.24, 0.31),
    "lower-arm-back": (0.13, 0.49),
    "hand-back": (0.06, 0.65),
    "upper-arm-front": (0.73, 0.32),
    "lower-arm-front": (0.86, 0.49),
    "hand-front": (0.95, 0.65),
    "thigh-back": (0.36, 0.68),
    "shin-back": (0.25, 0.86),
    "foot-back": (0.13, 0.98),
    "thigh-front": (0.64, 0.68),
    "shin-front": (0.75, 0.86),
    "foot-front": (0.88, 0.98),
}

ANCHORS: dict[str, tuple[int, int]] = {
    "root": (128, BASELINE),
    "neck": (146, 85),
    "headCenter": (163, 58),
    "maskCenter": (172, 63),
    "dreadRoot": (143, 43),
    "chest": (130, 137),
    "pelvis": (128, 220),
    "shoulderBack": (105, 121),
    "elbowBack": (82, 176),
    "wristBack": (71, 230),
    "handBack": (64, 250),
    "shoulderFront": (156, 122),
    "elbowFront": (182, 176),
    "wristFront": (195, 228),
    "handFront": (206, 248),
    "handGrip": (204, 243),
    "hipBack": (111, 224),
    "kneeBack": (89, 290),
    "ankleBack": (75, 348),
    "footBack": (62, BASELINE),
    "hipFront": (144, 224),
    "kneeFront": (169, 290),
    "ankleFront": (184, 348),
    "footFront": (199, BASELINE),
    "casterMount": (103, 105),
    "casterUpperPivot": (116, 91),
    "casterLowerPivot": (121, 92),
    "casterYoke": (124, 92),
    "cannonPivot": (132, 82),
    "barrelHinge": (150, 82),
    "muzzle": (220, 82),
    "gauntletBase": (73, 219),
    "gauntletLidHinge": (73, 207),
    "bladeHousing": (190, 216),
    "bladeRoot": (197, 220),
    "belt": (128, 218),
    "thighFront": (158, 264),
    "shinFront": (178, 326),
}

PART_BINDING = {
    "head": ("neck", "torso", 40),
    "torso": ("pelvis", "root", 20),
    "pelvis": ("pelvis", "root", 21),
    "upper-arm-back": ("shoulderBack", "torso", 10),
    "lower-arm-back": ("elbowBack", "upper-arm-back", 11),
    "hand-back": ("wristBack", "lower-arm-back", 12),
    "upper-arm-front": ("shoulderFront", "torso", 30),
    "lower-arm-front": ("elbowFront", "upper-arm-front", 31),
    "hand-front": ("wristFront", "lower-arm-front", 32),
    "thigh-back": ("hipBack", "pelvis", 13),
    "shin-back": ("kneeBack", "thigh-back", 14),
    "foot-back": ("ankleBack", "shin-back", 15),
    "thigh-front": ("hipFront", "pelvis", 33),
    "shin-front": ("kneeFront", "thigh-front", 34),
    "foot-front": ("ankleFront", "shin-front", 35),
}


@dataclass(frozen=True)
class Placement:
    max_size: tuple[int, int]
    pivot_master: tuple[int, int]
    asset_pivot: tuple[float, float]
    attach_to: str
    z_index: int


MASK_PLACEMENT = Placement(
    max_size=(72, 84),
    pivot_master=ANCHORS["maskCenter"],
    asset_pivot=(0.50, 0.50),
    attach_to="headCenter",
    z_index=80,
)
DREAD_PLACEMENT = Placement(
    max_size=(104, 156),
    pivot_master=ANCHORS["dreadRoot"],
    asset_pivot=(0.88, 0.04),
    attach_to="headCenter",
    z_index=5,
)

ARMOR_PLACEMENTS: dict[str, Placement] = {
    **{
        asset_id: Placement(
            (132, 112), ANCHORS["chest"], (0.50, 0.50), "chest", 50
        )
        for asset_id in ARMOR_IDS[:4]
    },
    **{
        asset_id: Placement(
            (68, 64),
            ANCHORS["shoulderFront"],
            (0.50, 0.45),
            "shoulderFront",
            55,
        )
        for asset_id in ARMOR_IDS[4:8]
    },
    "bracer": Placement(
        (42, 70), (190, 204), (0.50, 0.50), "wristFront", 56
    ),
    "thigh": Placement(
        (58, 92), ANCHORS["thighFront"], (0.50, 0.45), "hipFront", 45
    ),
    "shin": Placement(
        (52, 92), ANCHORS["shinFront"], (0.50, 0.55), "kneeFront", 45
    ),
    "belt": Placement(
        (128, 58), ANCHORS["belt"], (0.50, 0.50), "pelvis", 60
    ),
}

EQUIPMENT_PLACEMENTS: dict[str, Placement] = {
    "mount": Placement(
        (58, 72), ANCHORS["casterMount"], (0.50, 0.50), "chest", 42
    ),
    "caster-upper": Placement(
        (50, 88),
        ANCHORS["casterUpperPivot"],
        (0.50, 0.85),
        "casterMount",
        43,
    ),
    "caster-lower": Placement(
        (46, 82),
        ANCHORS["casterLowerPivot"],
        (0.50, 0.85),
        "casterUpperPivot",
        44,
    ),
    "yoke": Placement(
        (48, 48), ANCHORS["casterYoke"], (0.50, 0.50), "casterMount", 45
    ),
    "cannon": Placement(
        (116, 60),
        ANCHORS["cannonPivot"],
        (0.08, 0.50),
        "casterUpperPivot",
        70,
    ),
    "barrel": Placement(
        (104, 34),
        ANCHORS["barrelHinge"],
        (0.05, 0.50),
        "cannonPivot",
        71,
    ),
    "muzzle": Placement(
        (34, 38), ANCHORS["muzzle"], (0.50, 0.50), "barrelHinge", 72
    ),
    "laser": Placement(
        (34, 24), ANCHORS["muzzle"], (0.50, 0.50), "muzzle", 73
    ),
    "gauntlet-base": Placement(
        (54, 42),
        ANCHORS["gauntletBase"],
        (0.50, 0.50),
        "wristBack",
        65,
    ),
    "gauntlet-lid": Placement(
        (34, 62),
        ANCHORS["gauntletLidHinge"],
        (0.50, 0.90),
        "gauntletBase",
        66,
    ),
    "blade-housing": Placement(
        (58, 38),
        ANCHORS["bladeHousing"],
        (0.50, 0.50),
        "wristFront",
        67,
    ),
    "blades": Placement(
        (92, 30),
        ANCHORS["bladeRoot"],
        (0.17, 0.50),
        "bladeHousing",
        68,
    ),
}

LOADOUT_PLACEMENTS: dict[str, Placement] = {
    "combistick": Placement(
        (236, 38), ANCHORS["handGrip"], (0.84, 0.50), "handGrip", 76
    ),
    "combistick-folded": Placement(
        (92, 38), ANCHORS["handGrip"], (0.56, 0.50), "handGrip", 76
    ),
    "smart-disc": Placement(
        (76, 76), ANCHORS["handFront"], (0.56, 0.50), "handFront", 77
    ),
    "yautja-bow": Placement(
        (72, 220), ANCHORS["handGrip"], (0.60, 0.50), "handGrip", 76
    ),
    "arrow": Placement(
        (230, 32), ANCHORS["handGrip"], (0.84, 0.50), "handGrip", 78
    ),
    "netgun": Placement(
        (78, 58), ANCHORS["belt"], (0.50, 0.58), "belt", 62
    ),
    "motion-sensor": Placement(
        (52, 48), ANCHORS["belt"], (0.50, 0.50), "pelvis", 62
    ),
    "audio-decoy": Placement(
        (46, 54), ANCHORS["belt"], (0.50, 0.50), "belt", 62
    ),
    "snare": Placement(
        (82, 66), ANCHORS["pelvis"], (0.50, 0.50), "pelvis", 61
    ),
    "trophy-skull": Placement(
        (76, 72), (82, 252), (0.50, 0.12), "pelvis", 63
    ),
    "trophy-spine": Placement(
        (42, 124), (82, 224), (0.50, 0.05), "pelvis", 62
    ),
    "trophy-bindings": Placement(
        (68, 104), (82, 218), (0.50, 0.06), "belt", 64
    ),
}

# The equipment atlas uses a visual 4x3 layout, but wide pieces cross equal
# column boundaries. These row-specific separation regions follow transparent
# gutters and avoid cutting the cannon or mixing it with the barrel.
EQUIPMENT_REGIONS = (
    (0, 0, 330, 443),
    (330, 0, 610, 443),
    (610, 0, 860, 443),
    (860, 0, 1182, 443),
    (0, 443, 455, 886),
    (455, 443, 785, 886),
    (785, 443, 970, 886),
    (970, 443, 1182, 886),
    (0, 886, 320, 1330),
    (320, 886, 530, 1330),
    (530, 886, 825, 1330),
    (825, 886, 1182, 1330),
)

# The loadout atlas is also a visual 4x3 sheet: the combistick and bow are
# wider/taller than arithmetic cells. These gutters isolate all twelve props
# without clipping their silhouettes or importing a neighbour.
LOADOUT_REGIONS = (
    (0, 0, 470, 440),
    (470, 0, 715, 440),
    (715, 0, 980, 440),
    (980, 0, 1254, 440),
    (0, 440, 465, 820),
    (465, 440, 740, 820),
    (740, 440, 970, 820),
    (970, 440, 1254, 820),
    (0, 820, 380, 1254),
    (380, 820, 750, 1254),
    (750, 820, 950, 1254),
    (950, 820, 1254, 1254),
)


def canvas_size() -> dict[str, int]:
    return {"width": CANVAS_WIDTH, "height": CANVAS_HEIGHT}


def rect_dict(rect: tuple[int, int, int, int]) -> dict[str, int]:
    left, top, right, bottom = rect
    return {
        "x": left,
        "y": top,
        "width": right - left,
        "height": bottom - top,
    }


def point_dict(point: tuple[int, int]) -> dict[str, int]:
    return {"x": point[0], "y": point[1]}


def is_magenta_key_candidate(red: int, green: int, blue: int) -> bool:
    """Return true for the noisy generated magenta matte, at any brightness."""
    return (
        red >= 70
        and blue >= 70
        and min(red, blue) - green >= 30
        and abs(red - blue) <= 96
    )


def is_magenta_edge_candidate(red: int, green: int, blue: int) -> bool:
    """Looser key used only on pixels directly connected to removed matte."""
    return (
        red >= 32
        and blue >= 32
        and min(red, blue) - green >= 14
        and abs(red - blue) <= 120
    )


def chroma_key_magenta(source: Image.Image) -> Image.Image:
    """Remove the generated magenta matte, including enclosed prop holes."""

    rgba = source.convert("RGBA")
    width, height = rgba.size
    pixel_count = width * height
    source_bytes = rgba.tobytes()
    candidates = bytearray(pixel_count)
    for index in range(pixel_count):
        offset = index * 4
        red, green, blue, alpha = source_bytes[offset : offset + 4]
        if alpha == 0 or is_magenta_key_candidate(red, green, blue):
            candidates[index] = 1

    background = candidates

    # Remove dark/mixed magenta fringe only when it touches confirmed matte.
    # Red lights remain intact because they do not contain the blue key channel.
    for _ in range(2):
        additions: list[int] = []
        for index in range(pixel_count):
            if background[index]:
                continue
            x = index % width
            touches_background = (
                (x and background[index - 1])
                or (x + 1 < width and background[index + 1])
                or (index >= width and background[index - width])
                or (
                    index + width < pixel_count
                    and background[index + width]
                )
            )
            if not touches_background:
                continue
            offset = index * 4
            red, green, blue = source_bytes[offset : offset + 3]
            if is_magenta_edge_candidate(red, green, blue):
                additions.append(index)
        if not additions:
            break
        for index in additions:
            background[index] = 1

    output = bytearray(source_bytes)
    for index, is_background in enumerate(background):
        if is_background:
            offset = index * 4
            output[offset : offset + 4] = b"\x00\x00\x00\x00"
    return Image.frombytes("RGBA", rgba.size, bytes(output))


def validate_loadout_alpha(image: Image.Image) -> None:
    rgba = image.convert("RGBA")
    if rgba.size != (1254, 1254):
        raise ValueError(
            f"{LOADOUT_ATLAS_NAME}: expected 1254x1254, got {rgba.size}"
        )
    alpha = rgba.getchannel("A")
    for point in (
        (0, 0),
        (rgba.width - 1, 0),
        (0, rgba.height - 1),
        (rgba.width - 1, rgba.height - 1),
    ):
        if alpha.getpixel(point):
            raise ValueError(f"{LOADOUT_ATLAS_NAME}: matte survives at {point}")
    for asset_id, region in zip(
        LOADOUT_IDS,
        LOADOUT_REGIONS,
        strict=True,
    ):
        if alpha.crop(region).getbbox() is None:
            raise ValueError(f"{LOADOUT_ATLAS_NAME}: empty cell {asset_id}")
    raw = rgba.tobytes()
    for offset in range(0, len(raw), 4):
        red, green, blue, alpha_value = raw[offset : offset + 4]
        if alpha_value and is_magenta_key_candidate(red, green, blue):
            raise ValueError(
                f"{LOADOUT_ATLAS_NAME}: visible magenta matte residue"
            )
        if raw[offset + 3] == 0 and raw[offset : offset + 3] != b"\x00\x00\x00":
            raise ValueError(
                f"{LOADOUT_ATLAS_NAME}: dirty RGB under transparent alpha"
            )


def prepare_loadout_alpha() -> Path:
    source_path = RAW_SOURCE / LOADOUT_ATLAS_NAME
    destination = SOURCE / LOADOUT_ATLAS_NAME
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    with Image.open(source_path) as source_file:
        generated = chroma_key_magenta(source_file)
    validate_loadout_alpha(generated)
    if destination.is_file():
        try:
            with Image.open(destination) as existing_file:
                existing = existing_file.convert("RGBA")
            if (
                existing.size == generated.size
                and ImageChops.difference(existing, generated).getbbox() is None
            ):
                return destination
        except (OSError, ValueError):
            pass
    destination.parent.mkdir(parents=True, exist_ok=True)
    generated.save(destination, "PNG", optimize=True)
    return destination


def sanitize_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    data = bytearray(rgba.tobytes())
    for offset in range(0, len(data), 4):
        if data[offset + 3] < ALPHA_THRESHOLD:
            data[offset : offset + 4] = b"\x00\x00\x00\x00"
    return Image.frombytes("RGBA", rgba.size, bytes(data))


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Asset has no visible alpha")
    return bounds


def grid_regions(
    size: tuple[int, int], columns: int, rows: int
) -> list[tuple[int, int, int, int]]:
    width, height = size
    x_edges = [round(index * width / columns) for index in range(columns + 1)]
    y_edges = [round(index * height / rows) for index in range(rows + 1)]
    return [
        (x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1])
        for row in range(rows)
        for column in range(columns)
    ]


def crop_region(
    atlas: Image.Image, region: tuple[int, int, int, int]
) -> Image.Image:
    return sanitize_alpha(atlas.crop(region))


def shift_canvas(image: Image.Image, offset_x: int, offset_y: int) -> Image.Image:
    shifted = Image.new("RGBA", image.size)
    shifted.alpha_composite(image, dest=(offset_x, offset_y))
    return shifted


def normalize_body_pair(
    bare_cell: Image.Image, net_cell: Image.Image
) -> tuple[Image.Image, Image.Image, dict[str, Any]]:
    bare_cell = sanitize_alpha(bare_cell)
    net_cell = sanitize_alpha(net_cell)
    source_bounds = alpha_bbox(bare_cell)
    left, top, right, bottom = source_bounds
    source_width = right - left
    source_height = bottom - top
    scale = min(
        BODY_TARGET_HEIGHT / source_height,
        BODY_MAX_WIDTH / source_width,
    )
    output_width = max(1, round(source_width * scale))
    output_height = max(1, round(source_height * scale))
    output_left = round((CANVAS_WIDTH - output_width) / 2)
    output_top = BASELINE - output_height

    # Map the complete source cell through the bare body's normalization
    # matrix. Applying this same affine transform to the net overlay preserves
    # the registration authored in the shared 3x2 atlas.
    scale_x = source_width / output_width
    scale_y = source_height / output_height
    affine = (
        scale_x,
        0.0,
        left - output_left * scale_x,
        0.0,
        scale_y,
        top - output_top * scale_y,
    )
    transform_kwargs = {
        "size": (CANVAS_WIDTH, CANVAS_HEIGHT),
        "method": Image.Transform.AFFINE,
        "data": affine,
        "resample": Image.Resampling.BICUBIC,
        "fillcolor": (0, 0, 0, 0),
    }
    bare = sanitize_alpha(bare_cell.transform(**transform_kwargs))
    net = sanitize_alpha(net_cell.transform(**transform_kwargs))

    # Correct the possible one-pixel interpolation rounding while applying the
    # exact same correction to both layers.
    normalized_bounds = alpha_bbox(bare)
    center_x = (normalized_bounds[0] + normalized_bounds[2]) / 2
    shift_x = round(CANVAS_WIDTH / 2 - center_x)
    shift_y = BASELINE - normalized_bounds[3]
    if shift_x or shift_y:
        bare = shift_canvas(bare, shift_x, shift_y)
        net = shift_canvas(net, shift_x, shift_y)
        normalized_bounds = alpha_bbox(bare)

    if normalized_bounds[3] != BASELINE:
        raise ValueError(
            f"Body baseline is {normalized_bounds[3]}, expected {BASELINE}"
        )
    if normalized_bounds[0] <= 0 or normalized_bounds[2] >= CANVAS_WIDTH:
        raise ValueError(f"Body touches a horizontal canvas edge: {normalized_bounds}")

    return bare, net, {
        "sourceBounds": rect_dict(source_bounds),
        "scale": {"x": round(1 / scale_x, 6), "y": round(1 / scale_y, 6)},
        "registeredBounds": rect_dict(normalized_bounds),
        "baseline": BASELINE,
    }


def part_label_masks(reference: Image.Image) -> dict[str, Image.Image]:
    left, top, right, bottom = alpha_bbox(reference)
    width = max(1, right - left)
    height = max(1, bottom - top)
    masks: dict[str, Image.Image] = {}
    for part_id in PART_IDS:
        mask = Image.new("L", (CANVAS_WIDTH, CANVAS_HEIGHT))
        draw = ImageDraw.Draw(mask)
        polygon = [
            (
                round(left + normalized_x * width),
                round(top + normalized_y * height),
            )
            for normalized_x, normalized_y in PART_POLYGONS[part_id]
        ]
        draw.polygon(polygon, fill=255)
        # A two-pixel overlap around anatomical cuts keeps articulated joints
        # covered after rotation and also absorbs antialiased net/loin pixels.
        masks[part_id] = mask.filter(ImageFilter.MaxFilter(5))

    # Generated overlays occasionally contain isolated antialiased pixels just
    # outside the body silhouette. Assign only otherwise-uncovered pixels to
    # the nearest anatomical center so every body/net pixel remains drawable.
    union = Image.new("L", (CANVAS_WIDTH, CANVAS_HEIGHT))
    for mask in masks.values():
        union = ImageChops.lighter(union, mask)
    union_pixels = union.load()
    mask_pixels = {part_id: mask.load() for part_id, mask in masks.items()}
    centers = {
        part_id: (
            left + normalized_x * width,
            top + normalized_y * height,
        )
        for part_id, (normalized_x, normalized_y) in PART_FALLBACK_CENTERS.items()
    }
    for y in range(CANVAS_HEIGHT):
        for x in range(CANVAS_WIDTH):
            if union_pixels[x, y]:
                continue
            nearest = min(
                PART_IDS,
                key=lambda part_id: (
                    (x - centers[part_id][0]) ** 2
                    + (y - centers[part_id][1]) ** 2
                ),
            )
            mask_pixels[nearest][x, y] = 255
    return masks


def split_registered_image(
    image: Image.Image, label_masks: dict[str, Image.Image]
) -> dict[str, Image.Image]:
    parts: dict[str, Image.Image] = {}
    source_alpha = image.getchannel("A")
    for part_id in PART_IDS:
        part = image.copy()
        part.putalpha(ImageChops.multiply(source_alpha, label_masks[part_id]))
        parts[part_id] = sanitize_alpha(part)
    return parts


def public_url(path: Path) -> str:
    return "/" + path.relative_to(ROOT / "public").as_posix()


def save_webp(image: Image.Image, destination: Path) -> None:
    prepared = sanitize_alpha(image)
    if destination.is_file():
        try:
            with Image.open(destination) as existing_file:
                existing = zero_transparent_rgb(existing_file)
            if (
                existing.size == prepared.size
                and ImageChops.difference(
                    existing,
                    zero_transparent_rgb(prepared),
                ).getbbox()
                is None
            ):
                return
        except (OSError, ValueError):
            pass
    destination.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(
        destination,
        "WEBP",
        lossless=True,
        quality=100,
        method=4,
        exact=True,
    )


def registered_descriptor(
    destination: Path,
    image: Image.Image,
    pivot_master: tuple[int, int],
    attach_to: str,
    z_index: int,
) -> dict[str, Any]:
    save_webp(image, destination)
    bounds = alpha_bbox(image)
    return {
        "path": public_url(destination),
        "registeredPath": public_url(destination),
        "sourceSize": canvas_size(),
        "sourceRect": {
            "x": 0,
            "y": 0,
            "width": CANVAS_WIDTH,
            "height": CANVAS_HEIGHT,
        },
        "pivot": point_dict(pivot_master),
        "pivotMaster": point_dict(pivot_master),
        "attachTo": attach_to,
        "zIndex": z_index,
        "alphaBounds": rect_dict(bounds),
    }


def trim_registered(
    registered: Image.Image, pivot_master: tuple[int, int]
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    left, top, right, bottom = alpha_bbox(registered)
    pivot_x, pivot_y = pivot_master
    left = max(0, min(left, pivot_x) - TRIM_PADDING)
    top = max(0, min(top, pivot_y) - TRIM_PADDING)
    right = min(CANVAS_WIDTH, max(right, pivot_x + 1) + TRIM_PADDING)
    bottom = min(CANVAS_HEIGHT, max(bottom, pivot_y + 1) + TRIM_PADDING)
    return registered.crop((left, top, right, bottom)), (left, top, right, bottom)


def normalize_module(
    source_item: Image.Image, placement: Placement
) -> Image.Image:
    source_item = sanitize_alpha(source_item)
    source_bounds = alpha_bbox(source_item)
    cutout = source_item.crop(source_bounds)
    width, height = cutout.size
    scale = min(
        placement.max_size[0] / width,
        placement.max_size[1] / height,
    )
    output_width = max(1, round(width * scale))
    output_height = max(1, round(height * scale))
    resized = sanitize_alpha(
        cutout.resize(
            (output_width, output_height),
            Image.Resampling.LANCZOS,
        )
    )
    pivot_offset_x = round(placement.asset_pivot[0] * (output_width - 1))
    pivot_offset_y = round(placement.asset_pivot[1] * (output_height - 1))
    destination_x = placement.pivot_master[0] - pivot_offset_x
    destination_y = placement.pivot_master[1] - pivot_offset_y
    if (
        destination_x < 0
        or destination_y < 0
        or destination_x + output_width > CANVAS_WIDTH
        or destination_y + output_height > CANVAS_HEIGHT
    ):
        raise ValueError(
            "Module placement escapes bind canvas: "
            f"{destination_x},{destination_y},{output_width},{output_height}"
        )
    registered = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT))
    registered.alpha_composite(resized, dest=(destination_x, destination_y))
    return sanitize_alpha(registered)


def export_module(
    category: str,
    asset_id: str,
    source_item: Image.Image,
    source_atlas: str,
    source_region: tuple[int, int, int, int],
    placement: Placement,
) -> dict[str, Any]:
    category_root = HUNTER_OUTPUT / category
    registered = normalize_module(source_item, placement)
    trimmed, source_rect = trim_registered(registered, placement.pivot_master)
    trimmed_path = category_root / f"{asset_id}.webp"
    registered_path = category_root / "registered" / f"{asset_id}.webp"
    save_webp(trimmed, trimmed_path)
    save_webp(registered, registered_path)
    left, top, right, bottom = source_rect
    descriptor = {
        "path": public_url(trimmed_path),
        "registeredPath": public_url(registered_path),
        "sourceSize": canvas_size(),
        "sourceRect": rect_dict(source_rect),
        "pivot": {
            "x": placement.pivot_master[0] - left,
            "y": placement.pivot_master[1] - top,
        },
        "pivotMaster": point_dict(placement.pivot_master),
        "attachTo": placement.attach_to,
        "zIndex": placement.z_index,
        "alphaBounds": rect_dict(alpha_bbox(registered)),
        "source": {
            "atlas": source_atlas,
            "region": rect_dict(source_region),
        },
    }
    if descriptor["sourceRect"]["width"] != trimmed.width:
        raise ValueError(f"{asset_id}: trimmed width metadata mismatch")
    if descriptor["sourceRect"]["height"] != trimmed.height:
        raise ValueError(f"{asset_id}: trimmed height metadata mismatch")
    return descriptor


def recompose(parts: Iterable[Image.Image]) -> Image.Image:
    result = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT))
    for part in parts:
        result.alpha_composite(part)
    return result


def validate_part_coverage(
    full: Image.Image, parts: Iterable[Image.Image], label: str
) -> None:
    union = Image.new("L", (CANVAS_WIDTH, CANVAS_HEIGHT))
    for part in parts:
        union = ImageChops.lighter(union, part.getchannel("A"))
    source_alpha = full.getchannel("A")
    missing = ImageChops.subtract(source_alpha, union)
    source_weight = sum(
        intensity * count for intensity, count in enumerate(source_alpha.histogram())
    )
    missing_weight = sum(
        intensity * count for intensity, count in enumerate(missing.histogram())
    )
    coverage = (
        1.0 if source_weight == 0 else 1.0 - missing_weight / source_weight
    )
    if coverage < 0.995:
        raise ValueError(f"{label}: anatomical coverage is only {coverage:.2%}")


def source_entry_path(path: Path, role: str) -> dict[str, Any]:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with Image.open(path) as image:
        dimensions = {"width": image.width, "height": image.height}
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": digest,
        "dimensions": dimensions,
        "role": role,
    }


def source_entry(filename: str, role: str) -> dict[str, Any]:
    return source_entry_path(SOURCE / filename, role)


def build_body_pack(
    bare_atlas: Image.Image, net_atlas: Image.Image
) -> dict[str, Any]:
    bodies: dict[str, Any] = {}
    regions = grid_regions(bare_atlas.size, 3, 2)
    for body_id, region in zip(BODY_IDS, regions, strict=True):
        bare_cell = crop_region(bare_atlas, region)
        net_cell = crop_region(net_atlas, region)
        full, net_full, normalization = normalize_body_pair(bare_cell, net_cell)
        labels = part_label_masks(full)
        parts = split_registered_image(full, labels)
        net_parts = split_registered_image(net_full, labels)

        body_root = HUNTER_OUTPUT / "body" / body_id
        full_descriptor = registered_descriptor(
            body_root / "full.webp",
            full,
            ANCHORS["root"],
            "root",
            20,
        )
        part_descriptors: dict[str, Any] = {}
        for part_id, part in parts.items():
            anchor_id, attach_to, z_index = PART_BINDING[part_id]
            part_descriptors[part_id] = registered_descriptor(
                body_root / "parts" / f"{part_id}.webp",
                part,
                ANCHORS[anchor_id],
                attach_to,
                z_index,
            )

        validate_part_coverage(full, parts.values(), f"{body_id} body")

        net_descriptor = registered_descriptor(
            body_root / "net" / "full.webp",
            net_full,
            ANCHORS["root"],
            "root",
            25,
        )
        net_part_descriptors: dict[str, Any] = {}
        nonempty_net_parts: list[Image.Image] = []
        for part_id, part in net_parts.items():
            if part.getchannel("A").getbbox() is None:
                continue
            anchor_id, attach_to, z_index = PART_BINDING[part_id]
            net_part_descriptors[part_id] = registered_descriptor(
                body_root / "net" / "parts" / f"{part_id}.webp",
                part,
                ANCHORS[anchor_id],
                attach_to,
                z_index + 6,
            )
            nonempty_net_parts.append(part)

        validate_part_coverage(
            net_full,
            nonempty_net_parts,
            f"{body_id} net",
        )

        bodies[body_id] = {
            "full": full_descriptor,
            "parts": part_descriptors,
            "net": {
                "full": net_descriptor,
                "parts": net_part_descriptors,
            },
            "normalization": {
                **normalization,
                "source": {
                    "bareAtlas": "openai-body-archetypes-bare.png",
                    "netAtlas": "openai-net-loin-overlay.png",
                    "region": rect_dict(region),
                },
            },
        }
    return bodies


def build_grid_modules(
    atlas: Image.Image,
    atlas_name: str,
    columns: int,
    rows: int,
    asset_ids: tuple[str, ...],
    category: str,
    placements: dict[str, Placement] | Placement,
) -> dict[str, Any]:
    regions = grid_regions(atlas.size, columns, rows)
    if len(regions) != len(asset_ids):
        raise ValueError(f"{atlas_name}: grid and ID counts differ")
    result: dict[str, Any] = {}
    for asset_id, region in zip(asset_ids, regions, strict=True):
        placement = (
            placements[asset_id] if isinstance(placements, dict) else placements
        )
        result[asset_id] = export_module(
            category,
            asset_id,
            crop_region(atlas, region),
            atlas_name,
            region,
            placement,
        )
    return result


def build_equipment_modules(atlas: Image.Image) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for asset_id, region in zip(EQUIPMENT_IDS, EQUIPMENT_REGIONS, strict=True):
        result[asset_id] = export_module(
            "equipment",
            asset_id,
            crop_region(atlas, region),
            "openai-equipment-atlas.png",
            region,
            EQUIPMENT_PLACEMENTS[asset_id],
        )
    return result


def build_loadout_modules(
    atlas: Image.Image,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    categories: dict[str, dict[str, Any]] = {
        "weapons": {},
        "gear": {},
        "trophies": {},
    }
    for asset_id, region in zip(LOADOUT_IDS, LOADOUT_REGIONS, strict=True):
        if asset_id in WEAPON_IDS:
            category = "weapons"
        elif asset_id in GEAR_IDS:
            category = "gear"
        else:
            category = "trophies"
        categories[category][asset_id] = export_module(
            category,
            asset_id,
            crop_region(atlas, region),
            LOADOUT_ATLAS_NAME,
            region,
            LOADOUT_PLACEMENTS[asset_id],
        )
    return (
        categories["weapons"],
        categories["gear"],
        categories["trophies"],
    )


def iter_asset_descriptors(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        if {
            "path",
            "registeredPath",
            "sourceSize",
            "sourceRect",
            "pivot",
            "pivotMaster",
            "attachTo",
        }.issubset(value):
            yield value
            return
        for child in value.values():
            yield from iter_asset_descriptors(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_asset_descriptors(child)


def referenced_asset_paths(manifest: dict[str, Any]) -> set[Path]:
    paths: set[Path] = set()
    for descriptor in iter_asset_descriptors(manifest):
        for key in ("path", "registeredPath"):
            paths.add(
                (
                    ROOT
                    / "public"
                    / descriptor[key].removeprefix("/")
                ).resolve()
            )
    return paths


def prune_unreferenced_assets(manifest: dict[str, Any]) -> None:
    output_root = OUTPUT.resolve()
    expected = referenced_asset_paths(manifest)
    for path in OUTPUT.rglob("*.webp"):
        resolved = path.resolve()
        if not resolved.is_relative_to(output_root):
            raise ValueError(f"Refusing to prune outside V3 output: {resolved}")
        if resolved not in expected:
            path.unlink()


def zero_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    data = bytearray(rgba.tobytes())
    for offset in range(0, len(data), 4):
        if data[offset + 3] == 0:
            data[offset : offset + 3] = b"\x00\x00\x00"
    return Image.frombytes("RGBA", rgba.size, bytes(data))


def validate_manifest_assets(manifest: dict[str, Any]) -> None:
    expected_categories = {
        "weapons": WEAPON_IDS,
        "gear": GEAR_IDS,
        "trophies": TROPHY_IDS,
    }
    for category, expected_ids in expected_categories.items():
        actual_ids = tuple(manifest["hunter"].get(category, {}))
        if actual_ids != expected_ids:
            raise ValueError(
                f"Invalid {category} IDs: {actual_ids} != {expected_ids}"
            )
        for asset_id, descriptor in manifest["hunter"][category].items():
            expected_prefix = (
                f"/game/assets/v3/actors/yautja/hunter/{category}/"
            )
            if not descriptor["path"].startswith(expected_prefix):
                raise ValueError(f"{asset_id}: invalid category path")

    if {
        descriptor["attachTo"]
        for descriptor in manifest["hunter"]["weapons"].values()
    } - {"handGrip", "handFront"}:
        raise ValueError("Weapons must attach to handGrip or handFront")
    if {
        descriptor["attachTo"]
        for descriptor in manifest["hunter"]["gear"].values()
    } - {"belt", "pelvis"}:
        raise ValueError("Gear must attach to belt or pelvis")
    if {
        descriptor["attachTo"]
        for descriptor in manifest["hunter"]["trophies"].values()
    } - {"belt", "pelvis"}:
        raise ValueError("Trophies must attach to belt or pelvis")

    for source in manifest["sources"].values():
        source_path = (ROOT / source["path"]).resolve()
        if not source_path.is_relative_to(ROOT.resolve()):
            raise ValueError(f"Source escapes project: {source_path}")
        if not source_path.is_file():
            raise ValueError(f"Missing V3 source: {source_path}")
        if hashlib.sha256(source_path.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"Source checksum mismatch: {source_path}")
        with Image.open(source_path) as source_image:
            dimensions = {
                "width": source_image.width,
                "height": source_image.height,
            }
        if dimensions != source["dimensions"]:
            raise ValueError(f"Source dimensions mismatch: {source_path}")

    loadout_alpha_path = SOURCE / LOADOUT_ATLAS_NAME
    if not loadout_alpha_path.is_file():
        raise ValueError(f"Missing keyed loadout atlas: {loadout_alpha_path}")
    with Image.open(loadout_alpha_path) as loadout_alpha:
        validate_loadout_alpha(loadout_alpha)

    descriptors = list(iter_asset_descriptors(manifest))
    if len(descriptors) < 220:
        raise ValueError(f"V3 pack is unexpectedly small: {len(descriptors)} modules")

    checked_paths: set[str] = set()
    for descriptor in descriptors:
        source_size = descriptor["sourceSize"]
        source_rect = descriptor["sourceRect"]
        if source_size != canvas_size():
            raise ValueError(f"Invalid sourceSize: {descriptor['path']}")
        if (
            source_rect["x"] < 0
            or source_rect["y"] < 0
            or source_rect["x"] + source_rect["width"] > CANVAS_WIDTH
            or source_rect["y"] + source_rect["height"] > CANVAS_HEIGHT
        ):
            raise ValueError(f"sourceRect escapes master: {descriptor['path']}")
        if descriptor["pivotMaster"] != {
            "x": source_rect["x"] + descriptor["pivot"]["x"],
            "y": source_rect["y"] + descriptor["pivot"]["y"],
        }:
            raise ValueError(f"Pivot spaces disagree: {descriptor['path']}")

        trimmed_path = ROOT / "public" / descriptor["path"].removeprefix("/")
        registered_path = (
            ROOT / "public" / descriptor["registeredPath"].removeprefix("/")
        )
        for path in (trimmed_path, registered_path):
            if not path.is_file():
                raise ValueError(f"Missing generated asset: {path}")
            checked_paths.add(path.as_posix())

        with Image.open(trimmed_path) as image:
            trimmed = zero_transparent_rgb(image)
        with Image.open(registered_path) as image:
            registered = zero_transparent_rgb(image)

        expected_trimmed_size = (
            source_rect["width"],
            source_rect["height"],
        )
        if trimmed.size != expected_trimmed_size:
            raise ValueError(
                f"{descriptor['path']}: {trimmed.size} != {expected_trimmed_size}"
            )
        if registered.size != (CANVAS_WIDTH, CANVAS_HEIGHT):
            raise ValueError(
                f"{descriptor['registeredPath']}: invalid registered dimensions"
            )
        if trimmed.getchannel("A").getbbox() is None:
            raise ValueError(f"Empty asset: {descriptor['path']}")

        trim_alpha = trimmed.getchannel("A")
        if (
            trim_alpha.crop((0, 0, trimmed.width, 1)).getbbox()
            or trim_alpha.crop((0, trimmed.height - 1, trimmed.width, trimmed.height)).getbbox()
            or trim_alpha.crop((0, 0, 1, trimmed.height)).getbbox()
            or trim_alpha.crop((trimmed.width - 1, 0, trimmed.width, trimmed.height)).getbbox()
        ):
            raise ValueError(f"Visible alpha touches an export edge: {descriptor['path']}")

        reconstructed = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT))
        reconstructed.alpha_composite(
            trimmed,
            dest=(source_rect["x"], source_rect["y"]),
        )
        reconstructed = zero_transparent_rgb(reconstructed)
        if ImageChops.difference(reconstructed, registered).getbbox() is not None:
            raise ValueError(
                f"Trim and registered exports disagree: {descriptor['path']}"
            )

    if len(checked_paths) < 250:
        raise ValueError("Too few unique V3 WebP files were validated")

    expected_paths = referenced_asset_paths(manifest)
    existing_paths = {path.resolve() for path in OUTPUT.rglob("*.webp")}
    unexpected_paths = existing_paths - expected_paths
    if unexpected_paths:
        unexpected = ", ".join(
            str(path.relative_to(OUTPUT.resolve()))
            for path in sorted(unexpected_paths)
        )
        raise ValueError(f"Unreferenced V3 WebP files: {unexpected}")

    for body_id in BODY_IDS:
        full_path = (
            ROOT
            / "public"
            / manifest["hunter"]["bodies"][body_id]["full"]["path"].removeprefix("/")
        )
        with Image.open(full_path) as image:
            bounds = sanitize_alpha(image).getchannel("A").getbbox()
        if bounds is None or bounds[3] != BASELINE:
            raise ValueError(f"{body_id}: baseline validation failed")


def build_manifest() -> dict[str, Any]:
    prepare_loadout_alpha()
    atlas_names = {
        "bodyBare": "openai-body-archetypes-bare.png",
        "bodyReference": "openai-body-archetypes.png",
        "netLoin": "openai-net-loin-overlay.png",
        "masks": "openai-biomask-atlas.png",
        "equipment": "openai-equipment-atlas.png",
        "armor": "openai-armor-atlas.png",
        "dreads": "openai-dread-atlas.png",
        "loadoutTrophy": LOADOUT_ATLAS_NAME,
    }
    for filename in atlas_names.values():
        if not (SOURCE / filename).is_file():
            raise FileNotFoundError(SOURCE / filename)

    bare_atlas = Image.open(SOURCE / atlas_names["bodyBare"]).convert("RGBA")
    net_atlas = Image.open(SOURCE / atlas_names["netLoin"]).convert("RGBA")
    mask_atlas = Image.open(SOURCE / atlas_names["masks"]).convert("RGBA")
    equipment_atlas = Image.open(SOURCE / atlas_names["equipment"]).convert("RGBA")
    armor_atlas = Image.open(SOURCE / atlas_names["armor"]).convert("RGBA")
    dread_atlas = Image.open(SOURCE / atlas_names["dreads"]).convert("RGBA")
    loadout_atlas = Image.open(
        SOURCE / atlas_names["loadoutTrophy"]
    ).convert("RGBA")

    bodies = build_body_pack(bare_atlas, net_atlas)
    masks = build_grid_modules(
        mask_atlas,
        atlas_names["masks"],
        4,
        3,
        MASK_IDS,
        "masks",
        MASK_PLACEMENT,
    )
    equipment = build_equipment_modules(equipment_atlas)
    armor = build_grid_modules(
        armor_atlas,
        atlas_names["armor"],
        4,
        3,
        ARMOR_IDS,
        "armor",
        ARMOR_PLACEMENTS,
    )
    dreads = build_grid_modules(
        dread_atlas,
        atlas_names["dreads"],
        4,
        2,
        DREAD_IDS,
        "dreads",
        DREAD_PLACEMENT,
    )
    weapons, gear, trophies = build_loadout_modules(loadout_atlas)

    manifest: dict[str, Any] = {
        "version": 3,
        "generator": "scripts/prepare-v3-assets.py",
        "format": {
            "mimeType": "image/webp",
            "lossless": True,
            "alphaThreshold": ALPHA_THRESHOLD,
        },
        "canvas": {
            "width": CANVAS_WIDTH,
            "height": CANVAS_HEIGHT,
            "baseline": BASELINE,
            "facing": "right",
            "coordinateSpace": "pixels",
        },
        "anchors": {
            anchor_id: point_dict(point) for anchor_id, point in ANCHORS.items()
        },
        "sources": {
            "bodyBare": source_entry(
                atlas_names["bodyBare"],
                "Runtime bare anatomy; authoritative body source.",
            ),
            "bodyReference": source_entry(
                atlas_names["bodyReference"],
                "Legacy net/loin reference only; never exported as V3 body.",
            ),
            "netLoin": source_entry(
                atlas_names["netLoin"],
                "Registered net and loincloth overlay.",
            ),
            "masks": source_entry(atlas_names["masks"], "4x3 biomask atlas."),
            "equipment": source_entry(
                atlas_names["equipment"], "Visual 4x3 atomic equipment atlas."
            ),
            "armor": source_entry(atlas_names["armor"], "4x3 armor atlas."),
            "dreads": source_entry(atlas_names["dreads"], "4x2 dread atlas."),
            "loadoutTrophyRaw": source_entry_path(
                RAW_SOURCE / atlas_names["loadoutTrophy"],
                "Original OpenAI 4x3 loadout/trophy atlas with magenta matte.",
            ),
            "loadoutTrophy": source_entry(
                atlas_names["loadoutTrophy"],
                "Chroma-keyed 4x3 weapon, gear and trophy atlas.",
            ),
        },
        "hunter": {
            "bodies": bodies,
            "masks": masks,
            "equipment": equipment,
            "armor": armor,
            "dreads": dreads,
            "weapons": weapons,
            "gear": gear,
            "trophies": trophies,
        },
        "counts": {
            "bodies": len(bodies),
            "bodyPartsPerArchetype": len(PART_IDS),
            "masks": len(masks),
            "equipment": len(equipment),
            "armor": len(armor),
            "dreads": len(dreads),
            "weapons": len(weapons),
            "gear": len(gear),
            "trophies": len(trophies),
        },
    }
    return manifest


def load_manifest() -> dict[str, Any]:
    manifest_path = OUTPUT / "manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(manifest_path)
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the existing generated pack without rewriting it.",
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    if arguments.check:
        manifest = load_manifest()
        validate_manifest_assets(manifest)
        print("V3 asset pack validation passed.")
        return

    manifest = build_manifest()
    prune_unreferenced_assets(manifest)
    validate_manifest_assets(manifest)
    manifest_path = OUTPUT / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        "Generated V3 asset pack: "
        f"{len(list(iter_asset_descriptors(manifest)))} descriptors."
    )


if __name__ == "__main__":
    main()
