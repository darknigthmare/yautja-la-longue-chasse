"""Import the supplied recoverable PNGs without painting, trimming or replacing art."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import struct
import sys
import unicodedata
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "C:/Users/chuck/Downloads/Yautja games/YAUTJA_MENAGERIE_VAISSEAUX_SPRITES_GENERES_2026-10-06.zip"
)
PREFIX = "YAUTJA_MENAGERIE_VAISSEAUX_SPRITES_GENERES_2026-10-06/"
MANIFEST_PATH = ROOT / "app/game/data/shipRecoveredAssetsV85.json"
previous_manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else None


def slug(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def related_ship_ids(group, filename):
    name = slug(filename)
    if group == "Collector":
        return ["collector-ship"]
    if group == "Blade_Fighter":
        return ["blade-fighter"]
    if group == "Judge_Dredd":
        return ["cursed-earth-ship"]
    if group == "Killer_of_Killers":
        if "cyborg" in name:
            return ["wwii-cyborg-pilot-ship"]
        if "grendel" in name or "roi" in name or "royal" in name:
            return ["grendel-king-ship"]
    if group == "Badlands":
        if "capsule" in name:
            return ["emergency-escape-pod"]
        if "kwei" in name:
            return ["kwei-ship"]
    # Generic filenames and successive corrections do not establish hull identity.
    return []


def view_label(filename):
    name = slug(filename)
    if "dessus" in name or "zenithale" in name:
        return "Vue de dessus"
    if "frontale" in name or "frontal" in name or "proue" in name:
        return "Vue frontale"
    if "lateral" in name or "laterale" in name or "profil" in name:
        return "Vue de profil"
    return "Étude de silhouette"


with zipfile.ZipFile(ARCHIVE) as archive:
    entries = []
    used_ids = set()
    for info in archive.infolist():
        if not info.filename.startswith(PREFIX + "Vaisseaux/") or not info.filename.lower().endswith(".png"):
            continue
        # The supplied ZIP contains UTF-8 names without the UTF-8 flag. Retain
        # proper French filenames instead of Python's default CP437 rendering.
        archive_name = info.filename
        if not info.flag_bits & 0x800:
            try:
                archive_name = archive_name.encode("cp437").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        relative = PurePosixPath(archive_name.removeprefix(PREFIX))
        if ".." in relative.parts or len(relative.parts) != 3 or info.file_size > 32 * 1024 * 1024:
            raise ValueError("Unexpected archive path or image size")
        group = relative.parts[1]
        filename = relative.name
        asset_id = slug(group) + "--" + slug(relative.stem)
        if asset_id in used_ids:
            raise ValueError("Duplicate normalized image identity")
        used_ids.add(asset_id)
        data = archive.read(info)
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError("Source entry is not a PNG")
        width, height = struct.unpack(">II", data[16:24])
        source = ROOT / "art-source/v85/ships-recovered" / Path(*relative.parts)
        runtime = ROOT / "public/game/ships/v85-recovered" / (asset_id + ".png")
        source.parent.mkdir(parents=True, exist_ok=True)
        runtime.parent.mkdir(parents=True, exist_ok=True)
        # Byte-identical copies preserve every original/correction and the alpha.
        source.write_bytes(data)
        runtime.write_bytes(data)
        entries.append({
            "id": asset_id,
            "sourceName": filename,
            "sourceArchiveEntry": archive_name,
            "group": group,
            "title": relative.stem.replace("_", " "),
            "viewLabel": view_label(filename),
            "relatedShipIds": related_ship_ids(group, filename),
            "src": "/game/ships/v85-recovered/" + runtime.name,
            "width": width,
            "height": height,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "fidelity": "recovered-project-art",
        })
    for filename in ["README.txt", "MANIFEST_PNG.txt"]:
        data = archive.read(PREFIX + filename)
        destination = ROOT / "art-source/v85/ships-recovered" / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)

manifest = {
    "schemaVersion": 1,
    "sourceArchive": ARCHIVE.name,
    "sourceArchiveSha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
    "sourceDate": "2026-10-06",
    "sourcePolicy": "original-png-byte-identical",
    "fidelityNote": "Passes et corrections récupérées du projet. Les vues reconstruites ne sont pas certifiées 1:1.",
    "entries": entries,
}
target = MANIFEST_PATH
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
provenance = ROOT / "art-source/v85/ships-recovered/manifest.json"
provenance.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
# Remove only this importer's earlier encoding-error copies, after checking the
# exact inventory and bytes. Never remove an archive or an unrelated source.
if previous_manifest and previous_manifest.get("sourceArchiveSha256") == manifest["sourceArchiveSha256"]:
    current_ids = {entry["id"] for entry in entries}
    for previous in previous_manifest.get("entries", []):
        if previous["id"] in current_ids:
            continue
        relative = PurePosixPath(previous["sourceArchiveEntry"].removeprefix(PREFIX))
        candidates = [
            (ROOT / "art-source/v85/ships-recovered", ROOT / "art-source/v85/ships-recovered" / Path(*relative.parts)),
            (ROOT / "public/game/ships/v85-recovered", ROOT / "public/game/ships/v85-recovered" / (previous["id"] + ".png")),
        ]
        for directory, obsolete in candidates:
            if directory.resolve() not in obsolete.resolve().parents:
                raise ValueError("Unexpected obsolete import path")
            if obsolete.exists() and hashlib.sha256(obsolete.read_bytes()).hexdigest() == previous["sha256"]:
                obsolete.unlink()
print(f"Imported {len(entries)} recovered ship PNGs; source and runtime bytes preserved.")
