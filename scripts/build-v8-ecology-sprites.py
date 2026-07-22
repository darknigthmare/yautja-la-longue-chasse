#!/usr/bin/env python3
"""Build and validate the V8 planetary-ecology sprite library.

The catalogue in ``app/game/ecologyV8.ts`` remains the source of truth.  This
script reads its stable sprite IDs, selects a compatible hand-painted OpenAI
seed, applies deterministic planet/individual morphology, and emits one RGBA
six-frame strip for every physical ID.  Shared interplanetary species are
rendered once under ``common`` and are not duplicated for each planet.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "app/game/ecologyV8.ts"
SOURCE_ROOT = ROOT / "art-source/v8/ecology"
MASTER_ROOT = SOURCE_ROOT / "masters"
OUTPUT_ROOT = ROOT / "public/game/sprites/v8/ecology"

FRAME_WIDTH = 256
FRAME_HEIGHT = 192
FRAME_COUNT = 6
SHEET_SIZE = (FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT)
FRAME_ORDER = ("idle", "move-a", "move-b", "attack", "hit", "death")

CATEGORIES = ("fauna", "flora", "humanoid", "bad-blood", "other")
PLANETS = (
    "oseris-iv",
    "nivalis-k",
    "cinder-12",
    "naraka-delta",
    "serekh-9",
    "pelagos-m",
    "mycora-v",
    "acheron-sigma",
)
NEW_BIOMES = (
    "naraka-delta",
    "serekh-9",
    "pelagos-m",
    "mycora-v",
    "acheron-sigma",
)

# High-confidence semantic blockers found by the independent visual audit.
# Every one must resolve through a dedicated supplemental row; the build fails
# instead of silently returning to a palette-only category fallback.
SEMANTIC_OVERRIDE_IDS = frozenset(
    """
v8/oseris-iv/vineback-grazer
v8/oseris-iv/mirror-chameleon
v8/oseris-iv/thunder-macaque
v8/oseris-iv/needle-frog
v8/oseris-iv/coil-serpent
v8/oseris-iv/walking-mangrove
v8/oseris-iv/jungle-smuggler-drone
v8/nivalis-k/ice-bore
v8/nivalis-k/frost-manta
v8/nivalis-k/glacier-ram
v8/nivalis-k/aurora-leech
v8/nivalis-k/snow-prowler
v8/nivalis-k/thermal-pod
v8/nivalis-k/xenobiologist-field
v8/nivalis-k/rime-automaton
v8/cinder-12/lava-skimmer
v8/cinder-12/basalt-ram
v8/cinder-12/smoke-wyvern
v8/cinder-12/bad-blood-initiate
v8/cinder-12/bad-blood-trapper
v8/naraka-delta/reed-cat
v8/naraka-delta/delta-surveyor
v8/naraka-delta/field-medic-naraka
v8/naraka-delta/swamp-xeno-spitter
v8/naraka-delta/drowned-synth
v8/serekh-9/dust-jackal
v8/serekh-9/burrow-snake
v8/serekh-9/dune-strider
v8/serekh-9/mirage-cat
v8/serekh-9/armored-scarab
v8/serekh-9/quill-lizard
v8/serekh-9/desert-temple-guardian
v8/serekh-9/excavation-drone
v8/pelagos-m/tide-octopus
v8/pelagos-m/skygull
v8/pelagos-m/foam-crawler
v8/pelagos-m/storm-eel
v8/pelagos-m/deep-lantern
v8/pelagos-m/swimmer-xeno
v8/pelagos-m/salvage-synth
v8/mycora-v/cap-mimic
v8/mycora-v/thread-leech
v8/mycora-v/neural-liana
v8/mycora-v/acid-puffball
v8/mycora-v/web-mold
v8/mycora-v/infected-colonist
v8/mycora-v/fungal-xeno
v8/mycora-v/assimilated-synth
v8/mycora-v/sterilization-mech
v8/acheron-sigma/ruin-bat
v8/acheron-sigma/glyph-serpent
v8/acheron-sigma/bronze-beetle
v8/acheron-sigma/relic-mimic
v8/acheron-sigma/cable-ivy
v8/acheron-sigma/stone-orchid
v8/acheron-sigma/archive-mold
v8/acheron-sigma/crystal-creeper
v8/acheron-sigma/temple-xeno
v8/acheron-sigma/nanite-swarm
""".split()
)

SEMANTIC_SUPPLEMENTAL_REUSE = {
    "v8/cinder-12/slag-beetle": "v8/serekh-9/armored-scarab",
    "v8/naraka-delta/lantern-toad": "v8/oseris-iv/needle-frog",
}

# Independent frame-by-frame visual audit: these exact poses contained a
# detached remnant from a neighbouring generated cell.  Cleanup happens after
# the deterministic morphology pass and keeps the primary component at its
# original coordinates (no recrop, resize or pose shift).  Intentional attack
# projectiles on acid-pitcher and dart-pod frame 3 are deliberately excluded.
PRIMARY_COMPONENT_ONLY_FRAMES: dict[str, frozenset[int]] = {
    "v8/nivalis-k/frost-manta": frozenset((5,)),
    "v8/pelagos-m/wavefin": frozenset((2, 3)),
    "v8/pelagos-m/hunter-manta": frozenset((2, 3)),
    "v8/pelagos-m/razor-shark": frozenset((1,)),
    "v8/oseris-iv/carnivore-vine": frozenset((4,)),
    "v8/oseris-iv/strangler-fig": frozenset((4,)),
    "v8/nivalis-k/antifreeze-kelp": frozenset((4,)),
    "v8/naraka-delta/reed-cat": frozenset((3,)),
    "v8/cinder-12/glass-thorn": frozenset((2, 4)),
    "v8/nivalis-k/crystal-reed": frozenset((2, 4)),
    "v8/cinder-12/razor-reed": frozenset((2, 4)),
    "v8/cinder-12/acid-pitcher": frozenset((4,)),
    "v8/oseris-iv/dart-pod": frozenset((4,)),
    "v8/cinder-12/grapple-root": frozenset((0, 1, 2, 4)),
    "v8/oseris-iv/resin-trap": frozenset((0, 1, 2, 4)),
    "v8/oseris-iv/coil-serpent": frozenset((2,)),
}

# These three variants share the same V7 vine source whose attack extends
# across the nominal frame-3/right boundary. Recover the connected head before
# per-species morphology; frame 4 is then cleaned independently above.
RECOVER_CONNECTED_OVERFLOW_FRAMES: dict[str, frozenset[int]] = {
    "v8/oseris-iv/carnivore-vine": frozenset((3,)),
    "v8/oseris-iv/strangler-fig": frozenset((3,)),
    "v8/nivalis-k/antifreeze-kelp": frozenset((3,)),
}


@dataclass(frozen=True)
class EnemyAsset:
    planet: str
    slug: str
    category: str
    distribution: str

    @property
    def sprite_id(self) -> str:
        return f"v8/{self.planet}/{self.slug}"

    @property
    def sheet_path(self) -> Path:
        return OUTPUT_ROOT / self.planet / f"{self.slug}-sheet.png"


V7_POOLS: dict[str, tuple[str, ...]] = {
    "fauna": (
        "hell-hound-stalker",
        "river-ghost-brute",
        "kalisk-juvenile",
        "cryostalker-alpha",
        "lv1201-winged-vermin",
        "razorback-grazer",
        "amber-mire-lurker",
        "bonecrest-ravager",
        "canopy-razorwing",
        "volcanic-ashmaw",
    ),
    "flora": (
        "carnivore-vine",
        "spore-bloom",
        "razor-reed",
        "grapple-root",
        "acid-pitcher",
        "sentinel-orchid",
    ),
    "humanoid": (
        "colonial-marine",
        "owlf-commando",
        "colonial-sniper",
        "frontier-raider",
        "corporate-heavy",
    ),
    "bad-blood": (
        "bad-blood-duelist",
        "bad-blood-plasma-gunner",
        "bad-blood-netmaster",
        "bad-blood-cloaked-stalker",
        "bad-blood-trophy-butcher",
    ),
    "other": (
        "xeno-drone",
        "xeno-praetorian",
        "weyland-synth",
        "ancient-guardian",
    ),
}

V7_GROUP = {
    **{slug: "fauna" for slug in V7_POOLS["fauna"]},
    **{slug: "flora-other" for slug in V7_POOLS["flora"]},
    **{slug: "humanoid-badblood" for slug in V7_POOLS["humanoid"]},
    **{slug: "humanoid-badblood" for slug in V7_POOLS["bad-blood"]},
    **{slug: "flora-other" for slug in V7_POOLS["other"]},
}

# Rows in the five OpenAI biome masters.  Flora and constructs deliberately
# use their own silhouettes; humanoids and Bad Blood retain articulated V7
# anatomy and receive the same biome treatment in the variant pass.
NATIVE_ROWS: dict[str, dict[str, tuple[int, ...]]] = {
    "naraka-delta": {"fauna": (0, 1, 3, 4), "flora": (2,), "other": (0, 1, 4)},
    "serekh-9": {"fauna": (0, 1, 2, 4), "flora": (3,), "other": (0, 1, 3)},
    "pelagos-m": {"fauna": (0, 1, 2, 4), "flora": (3,), "other": (0, 1, 4)},
    "mycora-v": {"fauna": (0, 1, 2, 4), "flora": (3,), "other": (0, 2, 3)},
    "acheron-sigma": {"fauna": (3,), "other": (0, 1, 2, 4)},
}

NATIVE_SLUG_ROWS: dict[str, tuple[tuple[tuple[str, ...], int], ...]] = {
    "naraka-delta": (
        (("hydra",), 0),
        (("leech", "eel", "lurker", "bog-stalker"), 1),
        (("mangrove", "vine", "orchid", "pitcher", "reed", "bloom", "lotus", "bladder", "jaw", "root", "blossom", "moss"), 2),
        (("stilt", "leaper", "mosquito", "heron", "hook-beak"), 3),
        (("croc", "shell", "crab", "tortoise"), 4),
    ),
    "serekh-9": (
        (("sandmaw", "burrow", "worm"), 0),
        (("scorpion", "glass", "beetle", "fossil", "parasite"), 1),
        (("kite", "raptor", "vulture", "wing"), 2),
        (("mimic", "cactus", "pillar", "flora", "thorn", "tumbleweed", "aloe", "bulb", "mine"), 3),
        (("ram", "grazer", "rhino", "boneback", "carrier"), 4),
    ),
    "pelagos-m": (
        (("leviathan", "reef-stalker"), 0),
        (("crab", "crusher", "shell", "reef"), 1),
        (("manta", "skimmer", "wavefin", "skygull"), 2),
        (("anemone", "kelp", "coral", "sponge", "vine", "reef", "walking"), 3),
        (("eel", "shark", "deep", "lantern"), 4),
    ),
    "mycora-v": (
        (("hound", "mycelial", "avatar"), 0),
        (("puff", "crawler", "brute", "grazer"), 1),
        (("stalker", "ape", "colonist", "cultist"), 2),
        (("tower", "fungus", "cap", "mold", "node", "liana", "hypha", "turret", "echo", "mushroom"), 3),
        (("moth", "wing"), 4),
    ),
    "acheron-sigma": (
        (("ancient-guardian", "warden", "guardian"), 0),
        (("crawler", "beetle", "reliquary", "nanite", "swarm"), 1),
        (("glyph", "sentinel", "orbital"), 2),
        (("mimic", "lion", "statue", "stone", "crawler", "vault", "rat"), 3),
        (("custodian", "construct", "automaton"), 4),
    ),
}

PALETTES: dict[str, tuple[tuple[str, str, str], ...]] = {
    "oseris-iv": (
        ("#09150f", "#567348", "#ddb65b"),
        ("#101811", "#315e4c", "#88d0a4"),
        ("#180f0b", "#6e4323", "#e4a94d"),
    ),
    "nivalis-k": (
        ("#07121b", "#477d91", "#d6f5f2"),
        ("#0c1020", "#4b5f9d", "#d9e4ff"),
        ("#10161a", "#77939b", "#edf7ec"),
    ),
    "cinder-12": (
        ("#120907", "#7d2b18", "#ff9c32"),
        ("#0a0a0b", "#514544", "#e85b28"),
        ("#160b07", "#8b4c20", "#ffd06b"),
    ),
    "naraka-delta": (
        ("#071310", "#355f43", "#43d1bd"),
        ("#151207", "#65702c", "#d3ba53"),
        ("#0b1514", "#2e5e5d", "#9bc5a2"),
    ),
    "serekh-9": (
        ("#160f09", "#8b5c2d", "#e8c783"),
        ("#100b12", "#554065", "#b88bd0"),
        ("#17110c", "#76644c", "#f1e0b7"),
    ),
    "pelagos-m": (
        ("#06101a", "#214f73", "#5ddbe0"),
        ("#07131b", "#356977", "#a7ebd9"),
        ("#101019", "#4d416e", "#8ac7e8"),
    ),
    "mycora-v": (
        ("#150c18", "#6d366f", "#e2b8d5"),
        ("#15100c", "#8a6044", "#f0d4a0"),
        ("#0f1610", "#46684a", "#b7d18c"),
    ),
    "acheron-sigma": (
        ("#0e0e0e", "#5c4c39", "#d9a441"),
        ("#101316", "#4e6670", "#86d6d3"),
        ("#17110d", "#76614d", "#e4d0a8"),
    ),
    "common": (
        ("#0c1012", "#4c6062", "#b6c5b4"),
        ("#111014", "#5e4d66", "#ceb6b3"),
        ("#100e0b", "#675a42", "#d2b66f"),
    ),
}


def stable_bytes(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


def parse_catalogue() -> list[EnemyAsset]:
    text = CATALOGUE.read_text(encoding="utf-8")
    endemic_blob = text.split("const ENDEMIC_SEEDS = {", 1)[1].split(
        "} as const satisfies Record", 1
    )[0]
    common_blob = text.split("const COMMON_SEEDS = [", 1)[1].split(
        "] as const satisfies readonly EnemySeed[]", 1
    )[0]
    seed_pattern = re.compile(
        r'seed\("([^"]+)",\s*"[^"]*",\s*"(fauna|flora|humanoid|bad-blood|other)"'
    )

    assets: list[EnemyAsset] = []
    planet_pattern = re.compile(r'^  "([^"]+)": \[$', re.MULTILINE)
    matches = list(planet_pattern.finditer(endemic_blob))
    for index, match in enumerate(matches):
        planet = match.group(1)
        end = matches[index + 1].start() if index + 1 < len(matches) else len(endemic_blob)
        block = endemic_blob[match.end() : end]
        for slug, category in seed_pattern.findall(block):
            assets.append(EnemyAsset(planet, slug, category, "endemic"))

    for slug, category in seed_pattern.findall(common_blob):
        assets.append(EnemyAsset("common", slug, category, "common"))

    counts = {planet: sum(asset.planet == planet for asset in assets) for planet in PLANETS}
    if counts != {planet: 24 for planet in PLANETS}:
        raise ValueError(f"Expected 24 endemic IDs per planet, got {counts}")
    if sum(asset.distribution == "common" for asset in assets) != 6:
        raise ValueError("Expected exactly six shared common IDs")
    if len(assets) != 198 or len({asset.sprite_id for asset in assets}) != 198:
        raise ValueError("Ecology catalogue must expose 198 unique physical sprite IDs")
    return assets


def v7_sheet(slug: str) -> Path:
    group = V7_GROUP[slug]
    path = ROOT / f"public/game/sprites/v7/enemies/{group}/{slug}-sheet.png"
    if not path.exists():
        raise FileNotFoundError(path)
    return path


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    return alpha.getbbox()


def alpha_component_sizes(image: Image.Image, threshold: int = 16) -> list[int]:
    """Return 8-connected alpha-component populations, largest first."""
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    sizes: list[int] = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or pixels[x, y] < threshold:
                continue
            seen[start] = 1
            queue: deque[int] = deque((start,))
            size = 0
            while queue:
                position = queue.popleft()
                px = position % width
                py = position // width
                size += 1
                for ny in range(max(0, py - 1), min(height, py + 2)):
                    for nx in range(max(0, px - 1), min(width, px + 2)):
                        neighbour = ny * width + nx
                        if not seen[neighbour] and pixels[nx, ny] >= threshold:
                            seen[neighbour] = 1
                            queue.append(neighbour)
            sizes.append(size)
    return sorted(sizes, reverse=True)


def isolate_primary_subject(
    cell: Image.Image,
    *,
    selection_box: tuple[int, int, int, int] | None = None,
    component_merge_gap: int = 8,
    keep_secondary_components: bool = True,
    secondary_ownership_min_fraction: float = 0.0,
) -> Image.Image:
    """Remove pose fragments leaking in from neighbouring generated cells."""
    alpha = cell.getchannel("A")
    width, height = cell.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    components: list[tuple[list[int], tuple[int, int, int, int]]] = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or pixels[x, y] < 8:
                continue
            seen[start] = 1
            queue: deque[int] = deque((start,))
            points: list[int] = []
            left = right = x
            top = bottom = y
            while queue:
                position = queue.popleft()
                px = position % width
                py = position // width
                points.append(position)
                left = min(left, px)
                right = max(right, px)
                top = min(top, py)
                bottom = max(bottom, py)
                for ny in range(max(0, py - 1), min(height, py + 2)):
                    for nx in range(max(0, px - 1), min(width, px + 2)):
                        neighbour = ny * width + nx
                        if not seen[neighbour] and pixels[nx, ny] >= 8:
                            seen[neighbour] = 1
                            queue.append(neighbour)
            components.append((points, (left, top, right + 1, bottom + 1)))

    if not components:
        raise ValueError("Generated master cell has no visible subject")
    if selection_box is None:
        components.sort(key=lambda item: len(item[0]), reverse=True)
    else:
        sl, st, sr, sb = selection_box

        def overlap_score(
            component: tuple[list[int], tuple[int, int, int, int]],
        ) -> tuple[int, int]:
            points, _ = component
            overlap = sum(
                1
                for position in points
                if sl <= position % width < sr and st <= position // width < sb
            )
            return overlap, len(points)

        components.sort(key=overlap_score, reverse=True)
        if overlap_score(components[0])[0] == 0:
            raise ValueError("Generated master cell has no subject in its nominal grid cell")
    primary_points, primary_bbox = components[0]
    pl, pt, pr, pb = primary_bbox
    selected = [primary_points]
    if keep_secondary_components:
        for points, (left, top, right, bottom) in components[1:]:
            if len(points) < 4:
                continue
            if selection_box is not None and secondary_ownership_min_fraction > 0:
                sl, st, sr, sb = selection_box
                owned = sum(
                    1
                    for position in points
                    if sl <= position % width < sr and st <= position // width < sb
                )
                if owned / len(points) < secondary_ownership_min_fraction:
                    continue
            gap_x = max(pl - right, left - pr, 0)
            gap_y = max(pt - bottom, top - pb, 0)
            center_x = (left + right) / 2
            center_y = (top + bottom) / 2
            enclosed = pl - 8 <= center_x <= pr + 8 and pt - 8 <= center_y <= pb + 8
            adjacent = gap_x <= component_merge_gap and gap_y <= component_merge_gap
            if enclosed or adjacent:
                selected.append(points)

    clean_alpha = Image.new("L", cell.size, 0)
    clean_pixels = clean_alpha.load()
    original_pixels = alpha.load()
    for points in selected:
        for position in points:
            x = position % width
            y = position // width
            clean_pixels[x, y] = original_pixels[x, y]
    clean = cell.copy()
    clean.putalpha(clean_alpha)
    return clean


def extract_master_row(
    image: Image.Image,
    master: Path,
    row: int,
    *,
    bottom_overscan: int = 0,
    horizontal_overscan: int = 0,
    component_merge_gap: int = 8,
    keep_secondary_components: bool = True,
    secondary_ownership_min_fraction: float = 0.0,
) -> Image.Image:
    """Extract one six-pose row, optionally recovering a pose below its grid line."""
    width, height = image.size
    if not 0 <= row < 5:
        raise ValueError(f"Invalid master row {row} for {master.name}")
    if not 0 <= bottom_overscan <= round(height / 5):
        raise ValueError(f"Invalid bottom overscan {bottom_overscan} for {master.name}")
    if not 0 <= horizontal_overscan <= round(width / FRAME_COUNT):
        raise ValueError(
            f"Invalid horizontal overscan {horizontal_overscan} for {master.name}"
        )

    crops: list[Image.Image] = []
    max_width = 1
    max_height = 1
    for column in range(FRAME_COUNT):
        nominal_x0 = round(column * width / FRAME_COUNT)
        nominal_x1 = round((column + 1) * width / FRAME_COUNT)
        y0 = round(row * height / 5)
        nominal_y1 = round((row + 1) * height / 5)
        x0 = max(0, nominal_x0 - horizontal_overscan)
        x1 = min(width, nominal_x1 + horizontal_overscan)
        y1 = min(height, nominal_y1 + bottom_overscan)
        selection_box = None
        if bottom_overscan or horizontal_overscan:
            selection_box = (
                nominal_x0 - x0,
                0,
                nominal_x1 - x0,
                nominal_y1 - y0,
            )
        # Generated death poses often sit wholly below the nominal row. Keep
        # horizontal ownership in the final column while extending vertical
        # ownership through the overscan, so a corpse is recovered without
        # accepting a fragment leaking from the hit pose on its left.
        if column == FRAME_COUNT - 1 and bottom_overscan:
            selection_box = (
                nominal_x0 - x0,
                0,
                nominal_x1 - x0,
                y1 - y0,
            )
        cell = isolate_primary_subject(
            image.crop((x0, y0, x1, y1)),
            selection_box=selection_box,
            component_merge_gap=component_merge_gap,
            keep_secondary_components=keep_secondary_components,
            secondary_ownership_min_fraction=secondary_ownership_min_fraction,
        )
        bbox = alpha_bbox(cell)
        if bbox is None:
            raise ValueError(f"Empty master cell {master.name} row {row} column {column}")
        crop = cell.crop(bbox)
        crops.append(crop)
        max_width = max(max_width, crop.width)
        max_height = max(max_height, crop.height)

    shared_scale = min(232 / max_width, 176 / max_height)
    strip = Image.new("RGBA", SHEET_SIZE, (0, 0, 0, 0))
    for column, crop in enumerate(crops):
        size = (
            max(1, round(crop.width * shared_scale)),
            max(1, round(crop.height * shared_scale)),
        )
        resized = crop.resize(size, Image.Resampling.LANCZOS)
        left = column * FRAME_WIDTH + (FRAME_WIDTH - resized.width) // 2
        top = FRAME_HEIGHT - 8 - resized.height
        strip.alpha_composite(resized, (left, top))
    return strip


def extract_master_rows(master: Path) -> tuple[Image.Image, ...]:
    image = Image.open(master).convert("RGBA")
    return tuple(extract_master_row(image, master, row) for row in range(5))


def recover_connected_overflow_frames(
    source: Image.Image,
    frame_indices: frozenset[int],
    *,
    horizontal_overscan: int = 64,
) -> Image.Image:
    """Recover a connected pose crossing a one-row strip's cell boundary."""
    if source.size != SHEET_SIZE:
        raise ValueError(f"Overflow recovery expects {SHEET_SIZE}, got {source.size}")
    recovered = source.copy()
    for column in sorted(frame_indices):
        if not 0 <= column < FRAME_COUNT:
            raise ValueError(f"Invalid overflow-recovery frame: {column}")
        nominal_x0 = column * FRAME_WIDTH
        nominal_x1 = (column + 1) * FRAME_WIDTH
        x0 = max(0, nominal_x0 - horizontal_overscan)
        x1 = min(source.width, nominal_x1 + horizontal_overscan)
        cell = isolate_primary_subject(
            source.crop((x0, 0, x1, FRAME_HEIGHT)),
            selection_box=(
                nominal_x0 - x0,
                0,
                nominal_x1 - x0,
                FRAME_HEIGHT,
            ),
            keep_secondary_components=False,
        )
        bbox = alpha_bbox(cell)
        if bbox is None:
            raise ValueError(f"Empty recovered overflow frame {column}")
        crop = cell.crop(bbox)
        scale = min(232 / crop.width, 176 / crop.height, 1.0)
        size = (
            max(1, round(crop.width * scale)),
            max(1, round(crop.height * scale)),
        )
        crop = crop.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
        canvas.alpha_composite(
            crop,
            ((FRAME_WIDTH - crop.width) // 2, FRAME_HEIGHT - 8 - crop.height),
        )
        recovered.paste(
            Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0)),
            (nominal_x0, 0),
        )
        recovered.alpha_composite(canvas, (nominal_x0, 0))
    return recovered


def native_sources() -> dict[str, tuple[Image.Image, ...]]:
    sources: dict[str, tuple[Image.Image, ...]] = {}
    for planet in NEW_BIOMES:
        master = MASTER_ROOT / f"openai-{planet}-alpha.png"
        if not master.exists():
            raise FileNotFoundError(master)
        sources[planet] = extract_master_rows(master)
    return sources


def supplemental_sources() -> dict[str, dict[str, object]]:
    """Load exact spriteId -> OpenAI row overrides from both production lots."""
    sources: dict[str, dict[str, object]] = {}
    master_cache: dict[Path, tuple[Image.Image, ...]] = {}
    recovered_row_cache: dict[
        tuple[Path, int, int, int, int, bool, float], Image.Image
    ] = {}
    for manifest_path in sorted(SOURCE_ROOT.glob("supplemental/*/manifest.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for entry in manifest.get("entries", []):
            sprite_id = str(entry["spriteId"])
            if sprite_id in sources:
                raise ValueError(f"Duplicate supplemental sprite override: {sprite_id}")
            master_path = (manifest_path.parent / str(entry["master"])).resolve()
            if not master_path.is_relative_to(SOURCE_ROOT.resolve()):
                raise ValueError(f"Supplemental master escapes source root: {master_path}")
            row = int(entry["row"])
            if not 0 <= row < 5:
                raise ValueError(f"Invalid supplemental row {row} for {sprite_id}")
            bottom_overscan = int(entry.get("bottomOverscan", 0))
            horizontal_overscan = int(entry.get("horizontalOverscan", 0))
            component_merge_gap = int(entry.get("componentMergeGap", 8))
            keep_secondary_components = bool(entry.get("keepSecondaryComponents", True))
            secondary_ownership_min_fraction = float(
                entry.get("secondaryOwnershipMinFraction", 0.0)
            )
            if not 0 <= secondary_ownership_min_fraction <= 1:
                raise ValueError(
                    f"Invalid secondary ownership fraction for {sprite_id}: "
                    f"{secondary_ownership_min_fraction}"
                )
            max_secondary_component_ratio = entry.get("maxSecondaryComponentRatio")
            if max_secondary_component_ratio is not None:
                max_secondary_component_ratio = float(max_secondary_component_ratio)
                if not 0 <= max_secondary_component_ratio <= 1:
                    raise ValueError(
                        f"Invalid max secondary component ratio for {sprite_id}: "
                        f"{max_secondary_component_ratio}"
                    )
            if (
                bottom_overscan
                or horizontal_overscan
                or component_merge_gap != 8
                or not keep_secondary_components
                or secondary_ownership_min_fraction > 0
            ):
                cache_key = (
                    master_path,
                    row,
                    bottom_overscan,
                    horizontal_overscan,
                    component_merge_gap,
                    keep_secondary_components,
                    secondary_ownership_min_fraction,
                )
                if cache_key not in recovered_row_cache:
                    master_image = Image.open(master_path).convert("RGBA")
                    recovered_row_cache[cache_key] = extract_master_row(
                        master_image,
                        master_path,
                        row,
                        bottom_overscan=bottom_overscan,
                        horizontal_overscan=horizontal_overscan,
                        component_merge_gap=component_merge_gap,
                        keep_secondary_components=keep_secondary_components,
                        secondary_ownership_min_fraction=secondary_ownership_min_fraction,
                    )
                row_image = recovered_row_cache[cache_key]
            else:
                if master_path not in master_cache:
                    master_cache[master_path] = extract_master_rows(master_path)
                row_image = master_cache[master_path][row]
            sources[sprite_id] = {
                "image": row_image,
                "source": f"{master_path.relative_to(ROOT).as_posix()}#row-{row + 1}",
                "anatomy": str(entry.get("anatomy", "Dedicated semantic override")),
                "maxSecondaryComponentRatio": max_secondary_component_ratio,
            }
    return sources


def exact_or_related_v7(asset: EnemyAsset, digest: bytes) -> tuple[str, str]:
    # Preserve recognizable V7 families only inside the declared category.
    # This is intentionally category-first: "xenobiologist" must never match
    # the xeno alias, for example.
    pool = V7_POOLS[asset.category]
    for candidate in pool:
        if candidate in asset.slug or asset.slug in candidate:
            return candidate, "exact-v7"
    aliases_by_category = {
        "fauna": {
            "scavenger": "bonecrest-ravager",
            "tick": "amber-mire-lurker",
            "wing": "canopy-razorwing",
            "stalker": "hell-hound-stalker",
            "pouncer": "hell-hound-stalker",
            "herdling": "razorback-grazer",
            "burrower": "volcanic-ashmaw",
            "claw": "cryostalker-alpha",
            "crawler": "amber-mire-lurker",
            "carrier": "razorback-grazer",
        },
        "flora": {
            "orchid": "sentinel-orchid",
            "bloom": "spore-bloom",
            "vine": "carnivore-vine",
            "root": "grapple-root",
            "reed": "razor-reed",
            "fig": "carnivore-vine",
            "pod": "acid-pitcher",
            "trap": "grapple-root",
            "lichen": "spore-bloom",
            "kelp": "carnivore-vine",
            "bulb": "spore-bloom",
            "thorn": "razor-reed",
            "turret": "acid-pitcher",
            "mushroom": "spore-bloom",
        },
        "humanoid": {
            "owlf": "owlf-commando",
            "counterhunter": "owlf-commando",
            "sniper": "colonial-sniper",
            "ranger": "colonial-sniper",
            "heavy": "corporate-heavy",
            "juggernaut": "corporate-heavy",
            "trooper": "colonial-marine",
            "guard": "colonial-marine",
            "security": "colonial-marine",
            "marine": "colonial-marine",
            "patrol": "colonial-marine",
            "biologist": "colonial-marine",
            "medic": "colonial-marine",
            "archaeologist": "colonial-marine",
            "surveyor": "colonial-marine",
            "prospector": "colonial-marine",
            "diver": "colonial-marine",
            "poacher": "frontier-raider",
            "raider": "frontier-raider",
            "smuggler": "frontier-raider",
            "cultist": "frontier-raider",
            "zealot": "frontier-raider",
        },
        "bad-blood": {
            "plasma": "bad-blood-plasma-gunner",
            "gunner": "bad-blood-plasma-gunner",
            "net": "bad-blood-netmaster",
            "trapper": "bad-blood-netmaster",
            "cloak": "bad-blood-cloaked-stalker",
            "scout": "bad-blood-cloaked-stalker",
            "trophy": "bad-blood-trophy-butcher",
            "butcher": "bad-blood-trophy-butcher",
            "relic": "bad-blood-duelist",
            "thief": "bad-blood-duelist",
            "deserter": "bad-blood-duelist",
        },
        "other": {},
    }
    aliases = aliases_by_category[asset.category]
    for token, candidate in aliases.items():
        if token in asset.slug and candidate in V7_GROUP:
            return candidate, "semantic-v7"
    return pool[digest[0] % len(pool)], "category-fallback-v7"


def anatomy_family(asset: EnemyAsset) -> str:
    if asset.category == "humanoid":
        return "humanoid"
    if asset.category == "bad-blood":
        return "bad-blood"
    if asset.category == "flora":
        return "flora"
    if asset.category == "fauna":
        return "fauna"

    tokens = set(asset.slug.split("-"))
    if "xeno" in tokens:
        return "xeno"
    if "synth" in tokens or "synthetic" in tokens:
        return "synth"
    if tokens.intersection(
        {"mech", "automaton", "guardian", "sentinel", "drone", "exosuit", "construct", "swarm"}
    ):
        return "mech"
    return "other-organic"


def select_source(
    asset: EnemyAsset,
    natives: dict[str, tuple[Image.Image, ...]],
    supplements: dict[str, dict[str, object]],
) -> tuple[Image.Image, str, str, str, str]:
    digest = stable_bytes(asset.sprite_id)
    family = anatomy_family(asset)

    supplemental = supplements.get(asset.sprite_id)
    if supplemental:
        return (
            supplemental["image"].copy(),
            str(supplemental["source"]),
            family,
            "explicit-supplemental",
            str(supplemental["anatomy"]),
        )
    if asset.sprite_id in SEMANTIC_OVERRIDE_IDS:
        raise ValueError(
            f"Missing required explicit supplemental anatomy for {asset.sprite_id}"
        )
    donor_id = SEMANTIC_SUPPLEMENTAL_REUSE.get(asset.sprite_id)
    if donor_id:
        donor = supplements.get(donor_id)
        if donor is None:
            raise ValueError(f"Missing semantic supplemental donor {donor_id}")
        return (
            donor["image"].copy(),
            str(donor["source"]),
            family,
            "semantic-supplemental-reuse",
            f"Semantic reuse of {donor_id}: {donor['anatomy']}",
        )

    # Identity-bearing articulated families always start from a compatible V7
    # anatomy. Planet transforms may recolour or proportion them but never turn
    # a human/synth/xeno/Bad Blood into fauna or flora.
    if family == "humanoid":
        slug, source_match = exact_or_related_v7(asset, digest)
        return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, source_match, "Category-compatible articulated human"
    if family == "bad-blood":
        slug, source_match = exact_or_related_v7(asset, digest)
        return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, source_match, "Category-compatible articulated Bad Blood"
    if family == "synth":
        slug = "weyland-synth"
        return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, "family-v7", "Humanoid synthetic chassis"
    if family == "xeno":
        slug = "xeno-praetorian" if "praetorian" in asset.slug else "xeno-drone"
        return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, "family-v7", "Xenomorph body plan"

    # Acheron's master contains actual attached mechanical constructs. Other
    # biome masters do not, so their mechs use the V7 ancient guardian instead
    # of an unrelated animal or plant silhouette.
    if family == "mech" and asset.planet != "acheron-sigma":
        slug = "corporate-heavy" if "exosuit" in asset.slug else "ancient-guardian"
        return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, "family-v7", "Mechanical articulated chassis"

    native_category = {
        "fauna": "fauna",
        "flora": "flora",
        "mech": "other",
        "other-organic": "other",
    }[family]
    if asset.planet in NEW_BIOMES:
        rows = NATIVE_ROWS[asset.planet].get(native_category)
        if rows:
            preferred_row = next(
                (
                    preferred_row
                    for tokens, preferred_row in NATIVE_SLUG_ROWS[asset.planet]
                    if preferred_row in rows and any(token in asset.slug for token in tokens)
                ),
                None,
            )
            row = preferred_row if preferred_row is not None else rows[digest[0] % len(rows)]
            return (
                natives[asset.planet][row].copy(),
                f"openai-{asset.planet}-alpha.png#row-{row + 1}",
                family,
                "native-keyword" if preferred_row is not None else "native-category-fallback",
                f"Biome-native {family} silhouette",
            )

    slug, source_match = exact_or_related_v7(asset, digest)
    return Image.open(v7_sheet(slug)).convert("RGBA"), f"v7/{slug}-sheet.png", family, source_match, f"Category-compatible {family} silhouette"


def fit_variant_geometry(frame: Image.Image, digest: bytes) -> Image.Image:
    bbox = alpha_bbox(frame)
    if bbox is None:
        raise ValueError("Cannot transform an empty frame")
    crop = frame.crop(bbox)
    scale_x = 0.88 + (digest[1] % 21) / 100
    scale_y = 0.90 + (digest[2] % 19) / 100
    width = max(1, round(crop.width * scale_x))
    height = max(1, round(crop.height * scale_y))
    fit = min(232 / width, 176 / height, 1.0)
    size = (max(1, round(width * fit)), max(1, round(height * fit)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    x_bias = (digest[3] % 9) - 4
    left = max(4, min(FRAME_WIDTH - 4 - crop.width, (FRAME_WIDTH - crop.width) // 2 + x_bias))
    top = FRAME_HEIGHT - 8 - crop.height
    canvas.alpha_composite(crop, (left, top))
    return canvas


def tint_frame(
    frame: Image.Image,
    planet: str,
    digest: bytes,
    frame_index: int,
) -> Image.Image:
    palette_set = PALETTES[planet]
    dark, mid, light = palette_set[digest[4] % len(palette_set)]
    alpha = frame.getchannel("A")
    rgb = frame.convert("RGB")
    gray = ImageOps.grayscale(rgb)
    graded = ImageOps.colorize(gray, dark, light, mid=mid)
    mix = 0.30 + (digest[5] % 21) / 100
    colored = Image.blend(rgb, graded, mix)
    colored = ImageEnhance.Contrast(colored).enhance(0.94 + (digest[6] % 17) / 100)
    result = colored.convert("RGBA")
    result.putalpha(alpha)

    # Six deterministic marking families make closely related endemic species
    # visibly distinct while retaining the hand-painted source anatomy.
    pattern = Image.new("L", frame.size, 0)
    draw = ImageDraw.Draw(pattern)
    family = digest[7] % 6
    rng = random.Random(int.from_bytes(digest[8:16], "big") + frame_index * 977)
    if family in (0, 1):
        spacing = 22 + digest[16] % 14
        slope = -1 if family == 0 else 1
        for start in range(-FRAME_HEIGHT, FRAME_WIDTH + FRAME_HEIGHT, spacing):
            if slope > 0:
                draw.line((start, 0, start - FRAME_HEIGHT, FRAME_HEIGHT), fill=38, width=2 + digest[17] % 2)
            else:
                draw.line((start, 0, start + FRAME_HEIGHT, FRAME_HEIGHT), fill=38, width=2 + digest[17] % 2)
    elif family in (2, 3):
        for _ in range(18 + digest[16] % 18):
            radius = 2 + rng.randrange(1, 5)
            x = rng.randrange(8, FRAME_WIDTH - 8)
            y = rng.randrange(8, FRAME_HEIGHT - 8)
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=42)
    elif family == 4:
        for y in range(18, FRAME_HEIGHT, 28 + digest[16] % 11):
            draw.line((4, y, FRAME_WIDTH - 4, y + 5), fill=36, width=2)
    else:
        for _ in range(10 + digest[16] % 10):
            x = rng.randrange(12, FRAME_WIDTH - 12)
            y = rng.randrange(12, FRAME_HEIGHT - 12)
            draw.polygon(((x, y - 5), (x + 4, y), (x, y + 5), (x - 4, y)), fill=40)

    pattern = ImageChops.multiply(pattern, alpha)
    marking = Image.new("RGBA", frame.size, light + "00")
    marking.putalpha(pattern)
    result = Image.alpha_composite(result, marking)

    # A one-pixel dark biome rim improves readability on bright gameplay layers.
    expanded = alpha.filter(ImageFilter.MaxFilter(3))
    rim = ImageChops.subtract(expanded, alpha)
    backing = Image.new("RGBA", frame.size, dark + "00")
    backing.putalpha(rim)
    return Image.alpha_composite(backing, result)


def render_asset(
    asset: EnemyAsset,
    natives: dict[str, tuple[Image.Image, ...]],
    supplements: dict[str, dict[str, object]],
) -> tuple[Image.Image, dict[str, object]]:
    source, source_label, family, source_match, anatomy = select_source(
        asset, natives, supplements
    )
    recovered_overflow_frames = RECOVER_CONNECTED_OVERFLOW_FRAMES.get(
        asset.sprite_id, frozenset()
    )
    if recovered_overflow_frames:
        source = recover_connected_overflow_frames(source, recovered_overflow_frames)
    if source.size != SHEET_SIZE:
        raise ValueError(f"Unexpected seed dimensions for {asset.sprite_id}: {source.size}")
    digest = stable_bytes(asset.sprite_id)
    primary_component_only_frames = PRIMARY_COMPONENT_ONLY_FRAMES.get(
        asset.sprite_id, frozenset()
    )
    strip = Image.new("RGBA", SHEET_SIZE, (0, 0, 0, 0))
    for index in range(FRAME_COUNT):
        frame = source.crop(
            (index * FRAME_WIDTH, 0, (index + 1) * FRAME_WIDTH, FRAME_HEIGHT)
        )
        frame = fit_variant_geometry(frame, digest)
        frame = tint_frame(frame, asset.planet, digest, index)
        if index in primary_component_only_frames:
            frame = isolate_primary_subject(
                frame,
                keep_secondary_components=False,
            )
        strip.alpha_composite(frame, (index * FRAME_WIDTH, 0))

    palette_index = digest[4] % len(PALETTES[asset.planet])
    transform = {
        "palette": PALETTES[asset.planet][palette_index],
        "markingFamily": int(digest[7] % 6),
        "morphologyScaleX": round(0.88 + (digest[1] % 21) / 100, 2),
        "morphologyScaleY": round(0.90 + (digest[2] % 19) / 100, 2),
    }
    return strip, {
        "anatomyFamily": family,
        "anatomy": anatomy,
        "source": source_label,
        "sourceMatch": source_match,
        "transform": transform,
    }


def validate_sheet(
    path: Path,
    *,
    max_secondary_component_ratio: float | None = None,
    primary_component_only_frames: frozenset[int] = frozenset(),
) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    if image.size != SHEET_SIZE or image.mode != "RGBA":
        raise ValueError(f"Invalid format for {path}: {image.size} {image.mode}")
    corners = (image.getpixel((0, 0))[3], image.getpixel((image.width - 1, 0))[3])
    if any(corners):
        raise ValueError(f"Opaque corner in {path}")
    populated: list[int] = []
    secondary_component_ratios: list[float] = []
    for index in range(FRAME_COUNT):
        frame = image.crop(
            (index * FRAME_WIDTH, 0, (index + 1) * FRAME_WIDTH, FRAME_HEIGHT)
        )
        count = sum(
            1
            for value in frame.getchannel("A").get_flattened_data()
            if value >= 16
        )
        if count < 250:
            raise ValueError(f"Under-populated frame {index} in {path}: {count}")
        populated.append(count)
        component_sizes = alpha_component_sizes(frame)
        secondary_ratio = (
            component_sizes[1] / component_sizes[0]
            if len(component_sizes) > 1
            else 0.0
        )
        secondary_component_ratios.append(secondary_ratio)
        if (
            max_secondary_component_ratio is not None
            and secondary_ratio > max_secondary_component_ratio
        ):
            raise ValueError(
                f"Detached component above {max_secondary_component_ratio:.3f} "
                f"of primary in frame {index} of {path}: {secondary_ratio:.3f}"
            )
        if index in primary_component_only_frames and secondary_ratio > 0.01:
            raise ValueError(
                f"Audited primary-only frame {index} retains a detached component "
                f"in {path}: {secondary_ratio:.3f}"
            )
    reference_population = sorted(populated[: FRAME_COUNT - 1])[2]
    death_ratio = populated[-1] / reference_population
    if death_ratio < 0.20:
        raise ValueError(
            f"Death frame below 20% of median live-pose population in {path}: "
            f"{populated[-1]}/{reference_population} ({death_ratio:.3f})"
        )
    opaque_magenta = sum(
        1
        for red, green, blue, alpha in image.get_flattened_data()
        if alpha >= 16 and red >= 235 and blue >= 235 and green <= 30
    )
    if opaque_magenta:
        raise ValueError(f"Residual chroma pixels in {path}: {opaque_magenta}")
    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "populatedPixels": populated,
        "deathPopulationRatio": round(death_ratio, 4),
        "secondaryComponentRatios": [
            round(ratio, 4) for ratio in secondary_component_ratios
        ],
        "maxSecondaryComponentRatio": round(max(secondary_component_ratios), 4),
        "bytes": path.stat().st_size,
    }


def main() -> None:
    assets = parse_catalogue()
    natives = native_sources()
    supplements = supplemental_sources()
    catalogue_ids = {asset.sprite_id for asset in assets}
    unknown_primary_only_ids = set(PRIMARY_COMPONENT_ONLY_FRAMES) - catalogue_ids
    if unknown_primary_only_ids:
        raise ValueError(
            f"Unknown primary-component cleanup IDs: {sorted(unknown_primary_only_ids)}"
        )
    unknown_recovery_ids = set(RECOVER_CONNECTED_OVERFLOW_FRAMES) - catalogue_ids
    if unknown_recovery_ids:
        raise ValueError(
            f"Unknown overflow-recovery IDs: {sorted(unknown_recovery_ids)}"
        )
    unknown_supplements = set(supplements) - catalogue_ids
    if unknown_supplements:
        raise ValueError(f"Unknown supplemental sprite IDs: {sorted(unknown_supplements)}")
    missing_semantic = SEMANTIC_OVERRIDE_IDS - set(supplements)
    if missing_semantic:
        raise ValueError(
            f"Missing {len(missing_semantic)} audited supplemental overrides: "
            f"{sorted(missing_semantic)}"
        )
    manifest_entries: list[dict[str, object]] = []
    for index, asset in enumerate(assets, start=1):
        strip, provenance = render_asset(asset, natives, supplements)
        asset.sheet_path.parent.mkdir(parents=True, exist_ok=True)
        strip.save(asset.sheet_path, "PNG", optimize=True, compress_level=9)
        manifest_entries.append(
            {
                "spriteId": asset.sprite_id,
                "category": asset.category,
                "distribution": asset.distribution,
                "sheet": f"/game/sprites/v8/ecology/{asset.planet}/{asset.slug}-sheet.png",
                **provenance,
            }
        )
        if index % 24 == 0 or index == len(assets):
            print(f"Rendered {index}/{len(assets)} ecology strips")

    runtime_prefix = "/game/sprites/v8/ecology/"
    reports: dict[str, dict[str, object]] = {}
    for entry in manifest_entries:
        sprite_id = str(entry["spriteId"])
        supplemental = supplements.get(sprite_id)
        max_secondary_component_ratio = (
            supplemental.get("maxSecondaryComponentRatio")
            if supplemental is not None
            else None
        )
        reports[sprite_id] = validate_sheet(
            OUTPUT_ROOT / str(entry["sheet"]).removeprefix(runtime_prefix),
            max_secondary_component_ratio=max_secondary_component_ratio,
            primary_component_only_frames=PRIMARY_COMPONENT_ONLY_FRAMES.get(
                sprite_id, frozenset()
            ),
        )
    hashes = [report["sha256"] for report in reports.values()]
    if len(set(hashes)) != len(hashes):
        raise ValueError("Every physical ecology sheet must have a unique SHA-256")

    generic_fallback_entries = [
        entry
        for entry in manifest_entries
        if entry["sourceMatch"]
        in ("category-fallback-v7", "native-category-fallback")
    ]
    manifest = {
        "version": 8,
        "assetOrigin": "Original OpenAI image_gen masters plus deterministic project-local morphology; no official bitmap redistributed.",
        "catalogue": "app/game/ecologyV8.ts",
        "runtimeRoot": "/game/sprites/v8/ecology",
        "sheet": {
            "width": SHEET_SIZE[0],
            "height": SHEET_SIZE[1],
            "frameWidth": FRAME_WIDTH,
            "frameHeight": FRAME_HEIGHT,
            "frameOrder": FRAME_ORDER,
            "format": "PNG RGBA",
        },
        "counts": {
            "planets": 8,
            "assignments": 240,
            "endemicDefinitions": 192,
            "sharedDefinitions": 6,
            "physicalSheets": len(manifest_entries),
            "explicitSupplementalSheets": sum(
                entry["sourceMatch"] == "explicit-supplemental"
                for entry in manifest_entries
            ),
            "genericFallbackSheets": len(generic_fallback_entries),
        },
        "genericFallbackSpriteIds": [
            entry["spriteId"] for entry in generic_fallback_entries
        ],
        "entries": manifest_entries,
    }
    (SOURCE_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    qa = {
        "valid": True,
        "physicalSheets": len(reports),
        "uniqueHashes": len(set(hashes)),
        "populatedFrames": len(reports) * FRAME_COUNT,
        "totalBytes": sum(int(report["bytes"]) for report in reports.values()),
        "reports": reports,
    }
    (SOURCE_ROOT / "qa-report.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Validated {len(reports)} unique RGBA strips / "
        f"{len(reports) * FRAME_COUNT} populated frames"
    )


if __name__ == "__main__":
    main()
