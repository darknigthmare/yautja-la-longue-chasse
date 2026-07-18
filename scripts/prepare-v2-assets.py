"""Prepare the OpenAI-generated modular hunter and jungle asset pack.

The generation sources live in tmp/imagegen and are deliberately not shipped.
Chroma removal is performed first with the installed imagegen skill helper;
this script only crops the fixed 3x3 atlases and encodes project WebP files.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "imagegen"
OUTPUT = ROOT / "public" / "game" / "assets" / "v2"


def atlas_cell(image: Image.Image, row: int, column: int) -> Image.Image:
    cell_width = image.width // 3
    cell_height = image.height // 3
    return image.crop(
        (
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        )
    )


def horizontal_cell(image: Image.Image, column: int, columns: int = 3) -> Image.Image:
    cell_width = image.width // columns
    return image.crop(
        (
            column * cell_width,
            0,
            (column + 1) * cell_width,
            image.height,
        )
    )


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Generated cell is fully transparent")

    left = max(0, bounds[0] - padding)
    top = max(0, bounds[1] - padding)
    right = min(rgba.width, bounds[2] + padding)
    bottom = min(rgba.height, bounds[3] + padding)
    return rgba.crop((left, top, right, bottom))


def clear_key_residue(image: Image.Image) -> Image.Image:
    """Remove tiny hot-magenta pixels left inside generated cutouts."""

    rgba = image.convert("RGBA")
    cleaned = bytearray(rgba.tobytes())
    for index in range(0, len(cleaned), 4):
        red, green, blue, alpha = cleaned[index : index + 4]
        if red > 232 and blue > 220 and green < 82 and abs(red - blue) < 48:
            cleaned[index + 3] = 0
        elif red > 190 and blue > 180 and green < 95 and abs(red - blue) < 44:
            cleaned[index + 3] = min(alpha, 48)
    return Image.frombytes("RGBA", rgba.size, bytes(cleaned))


def save_cutout(image: Image.Image, relative_path: str) -> None:
    destination = OUTPUT / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    trim_alpha(clear_key_residue(image)).save(
        destination, "WEBP", lossless=True, method=6
    )


def save_aligned_overlay(image: Image.Image, relative_path: str) -> None:
    """Keep the full atlas-cell canvas so wearable pieces stay aligned."""

    destination = OUTPUT / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    clear_key_residue(image).save(destination, "WEBP", lossless=True, method=6)


def main() -> None:
    modular = Image.open(SOURCE / "hunter-modular-atlas-alpha.png").convert("RGBA")
    customization = Image.open(
        SOURCE / "hunter-customization-atlas-alpha.png"
    ).convert("RGBA")
    props = Image.open(SOURCE / "jungle-props-atlas-alpha.png").convert("RGBA")
    masks = Image.open(SOURCE / "hunter-mask-atlas-alpha.png").convert("RGBA")
    armor = Image.open(SOURCE / "hunter-armor-atlas-alpha.png").convert("RGBA")

    modular_cells = {
        "actors/yautja/hunter/body/base.webp": (0, 0),
        "actors/yautja/hunter/dreads/reference.webp": (0, 1),
        "actors/yautja/hunter/masks/hunter.webp": (0, 2),
        "actors/yautja/hunter/equipment/plasma-caster.webp": (1, 0),
        "actors/yautja/hunter/equipment/gauntlet-closed.webp": (1, 1),
        "actors/yautja/hunter/equipment/gauntlet-open.webp": (1, 2),
        "actors/yautja/hunter/equipment/wristblades-retracted.webp": (2, 0),
        "actors/yautja/hunter/equipment/wristblades-extended.webp": (2, 1),
        "actors/yautja/hunter/trophies/skull-spine.webp": (2, 2),
    }
    for relative_path, (row, column) in modular_cells.items():
        save_cutout(atlas_cell(modular, row, column), relative_path)

    armor_overlays = {
        "actors/yautja/hunter/armor/scout.webp": 0,
        "actors/yautja/hunter/armor/hunter.webp": 1,
        "actors/yautja/hunter/armor/berserker.webp": 2,
    }
    for relative_path, column in armor_overlays.items():
        save_aligned_overlay(horizontal_cell(armor, column), relative_path)

    armor_previews = {
        "ui/customization/armor-scout.webp": (0, 0),
        "ui/customization/armor-hunter.webp": (0, 1),
        "ui/customization/armor-berserker.webp": (0, 2),
    }
    for relative_path, (row, column) in armor_previews.items():
        save_cutout(atlas_cell(customization, row, column), relative_path)

    mask_width = masks.width // 3
    for column, name in enumerate(("jungle", "scarred", "elder")):
        save_cutout(
            masks.crop(
                (
                    column * mask_width,
                    0,
                    (column + 1) * mask_width,
                    masks.height,
                )
            ),
            f"actors/yautja/hunter/masks/{name}.webp",
        )

    for column, name in enumerate(("classic", "braided", "elder")):
        save_cutout(
            atlas_cell(customization, 2, column),
            f"actors/yautja/hunter/dreads/{name}.webp",
        )

    prop_cells = {
        "environments/jungle/climbables/tree-trunk.webp": (0, 0),
        "environments/jungle/platforms/tree-crown.webp": (0, 1),
        "environments/jungle/platforms/root-branch.webp": (0, 2),
        "environments/jungle/climbables/vine-ladder.webp": (1, 0),
        "environments/jungle/platforms/stone-slab.webp": (1, 1),
        "environments/jungle/platforms/expedition-platform.webp": (1, 2),
        "environments/jungle/foreground/ferns.webp": (2, 0),
        "environments/jungle/foreground/lake-reeds.webp": (2, 1),
        "environments/jungle/foreground/hanging-vines.webp": (2, 2),
    }
    for relative_path, (row, column) in prop_cells.items():
        save_cutout(atlas_cell(props, row, column), relative_path)

    far_background = Image.open(SOURCE / "jungle-lake-far-source.png").convert("RGB")
    far_destination = OUTPUT / "environments" / "jungle" / "layers" / "far-lake.webp"
    far_destination.parent.mkdir(parents=True, exist_ok=True)
    far_background.save(far_destination, "WEBP", quality=88, method=6)


if __name__ == "__main__":
    main()
