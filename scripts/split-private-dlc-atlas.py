"""Split the owner-only OpenAI DLC atlas into isolated visual candidates.

The source atlas is never imported by the public application. Every export is
kept in ``private-dlc/``. Composite or contaminated source cells are explicitly
blocked instead of being mislabeled as atomic modules.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = (
    ROOT
    / "private-dlc"
    / "assets"
    / "processed"
    / "wave-01-iconic-modules-transparent.webp"
)
DEFAULT_OUTPUT = ROOT / "private-dlc" / "assets" / "wave-01"


@dataclass(frozen=True)
class Module:
    asset_id: str
    row: int
    column: int
    slot: str
    entry_ids: tuple[str, ...]
    x_fraction: tuple[float, float] = (0.0, 1.0)
    blocking_issues: tuple[str, ...] = ()


MODULES = (
    Module("jungle-biomask", 0, 0, "biomask", ("F-001",)),
    Module("city-biomask", 0, 1, "biomask", ("F-002",)),
    Module("celtic-biomask", 0, 2, "biomask", ("F-013",)),
    Module("feral-bone-mask", 0, 3, "biomask", ("F-029",)),
    Module(
        "jungle-chest-harness",
        1,
        0,
        "torso-armor",
        ("F-001",),
        blocking_issues=("composite-torso-netting-shoulders-belt",),
    ),
    Module(
        "city-chest-armor",
        1,
        1,
        "torso-armor",
        ("F-002",),
        blocking_issues=("composite-torso-netting-shoulders-belt",),
    ),
    Module(
        "celtic-chest-cuirass",
        1,
        2,
        "torso-armor",
        ("F-013",),
        blocking_issues=("composite-torso-netting-shoulders-belt",),
    ),
    Module(
        "feral-bone-harness",
        1,
        3,
        "torso-armor",
        ("F-029",),
        blocking_issues=("composite-torso-netting-shoulders-belt-trophies",),
    ),
    Module("plasma-caster-mount", 2, 0, "plasma-caster-mount", ("F-001",)),
    Module(
        "plasma-caster-upper-arm",
        2,
        1,
        "plasma-caster-upper-arm",
        ("F-001",),
    ),
    Module(
        "plasma-caster-lower-arm-yoke",
        2,
        2,
        "plasma-caster-lower-arm",
        ("F-001",),
        blocking_issues=("composite-lower-arm-and-yoke",),
    ),
    Module(
        "plasma-caster-receiver",
        2,
        3,
        "plasma-caster-receiver",
        ("F-001",),
        blocking_issues=("composite-receiver-barrel-muzzle",),
    ),
    Module(
        "gauntlet-closed",
        3,
        0,
        "gauntlet-left-base",
        ("F-001",),
        blocking_issues=("composite-gauntlet-base-and-closed-lid",),
    ),
    Module(
        "gauntlet-open",
        3,
        1,
        "gauntlet-left-lid",
        ("F-001",),
        blocking_issues=(
            "composite-gauntlet-base-and-open-lid",
            "neighbor-cell-fragment",
        ),
    ),
    Module(
        "wrist-blades-extended",
        3,
        2,
        "wrist-blades-left",
        ("F-001", "F-002"),
        blocking_issues=("composite-blade-housing-and-blades",),
    ),
    Module(
        "collapsed-combistick",
        3,
        3,
        "hand-weapon-primary",
        ("F-002",),
        (0.0, 0.5),
        ("neighbor-smart-disc-fragment",),
    ),
    Module(
        "smart-disc",
        3,
        3,
        "hand-weapon-secondary",
        ("F-002",),
        (0.42, 1.0),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--padding", type=int, default=8)
    return parser.parse_args()


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("module export is fully transparent")
    return bounds


def padded_crop(image: Image.Image, padding: int) -> Image.Image:
    left, top, right, bottom = alpha_bounds(image)
    cropped = image.crop((left, top, right, bottom))
    output = Image.new(
        "RGBA",
        (cropped.width + padding * 2, cropped.height + padding * 2),
    )
    output.alpha_composite(cropped, (padding, padding))
    return output


def main() -> None:
    args = parse_args()
    source_path = args.input.resolve()
    output_root = args.output.resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as source_image:
        source = source_image.convert("RGBA")

    width, height = source.size
    descriptors = []
    for module in MODULES:
        cell_left = module.column * width // 4
        cell_right = (module.column + 1) * width // 4
        cell_top = module.row * height // 4
        cell_bottom = (module.row + 1) * height // 4
        cell_width = cell_right - cell_left
        left = cell_left + round(cell_width * module.x_fraction[0])
        right = cell_left + round(cell_width * module.x_fraction[1])
        region = source.crop((left, cell_top, right, cell_bottom))
        exported = padded_crop(region, max(2, args.padding))
        destination = output_root / f"{module.asset_id}.png"
        exported.save(destination, format="PNG", optimize=True)
        module_hash = hashlib.sha256(destination.read_bytes()).hexdigest()
        production_status = (
            "blocked-requires-new-atomic-source"
            if module.blocking_issues
            else "pending-reference-overlay"
        )
        descriptors.append(
            {
                "id": module.asset_id,
                "path": destination.relative_to(ROOT).as_posix(),
                "slot": module.slot,
                "entryIds": list(module.entry_ids),
                "productionStatus": production_status,
                "blockingIssues": list(module.blocking_issues),
                "approval": {
                    "atomicityApproved": False,
                    "visualMatchApproved": False,
                    "pivotApproved": False,
                    "runtimeApproved": False,
                },
                "sourceCell": {
                    "row": module.row + 1,
                    "column": module.column + 1,
                    "xFraction": list(module.x_fraction),
                },
                "pixelSize": {
                    "width": exported.width,
                    "height": exported.height,
                },
                "sha256": module_hash,
            }
        )

    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    manifest = {
        "schemaVersion": 1,
        "waveId": "wave-01-iconic-modules",
        "visibility": "owner-only",
        "source": {
            "path": source_path.relative_to(ROOT).as_posix(),
            "sha256": source_hash,
            "generator": "OpenAI image generation",
            "containsOfficialPixels": False,
        },
        "fidelityPolicy": {
            "status": "reference-grounded-original-fan-art",
            "exactOfficialAssetClaimAllowed": False,
            "requiredBeforeApproval": [
                "entry-specific licensed reference turnaround",
                "alpha silhouette overlay",
                "rig pivot review",
                "runtime state review",
            ],
        },
        "modules": descriptors,
    }
    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    blocked_count = sum(bool(module.blocking_issues) for module in MODULES)
    print(
        f"Private DLC wave split: {len(descriptors)} visual candidates "
        f"({len(descriptors) - blocked_count} reviewable, {blocked_count} blocked) "
        f"-> {manifest_path.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
