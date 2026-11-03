"""Offline checks for the V119 manifest/ZIP admission gate."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit-phg-drive-v119.py"
spec = importlib.util.spec_from_file_location("phg_gate_v119", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def make_fixture():
    items = []
    for category, count in gate.EXPECTED.items():
        for i in range(count):
            label = gate.FOLDERS[category]
            asset_id = f"{label}_{i:03d}"
            items.append({
                "id": asset_id, "category": category,
                "file": f"textures/{label}/{asset_id}.png",
                "width": 1254, "height": 1254, "mode": "RGB",
                "size_bytes": 4096, "sha256": "a" * 64,
            })
    archives, offset = [], 0
    for i, count in enumerate(gate.ZIP_DISTRIBUTION):
        group = items[offset:offset + count]
        offset += count
        archives.append({
            "filename": f"YAUTJA_PHG_TEST_{i}.zip",
            "png_count": count, "assets": [a["id"] for a in group],
            "sha256": "b" * 64,
        })
    return {"assets": items, "total_png": 156}, {"archives": archives, "archive_count": 7}


class SourceAdmissionTest(unittest.TestCase):
    def test_consistent_156_asset_partition_is_pending_not_integrated(self):
        inventory, delivery = make_fixture()
        result = gate.run(inventory, delivery)
        self.assertEqual(result["result"], "metadata_valid_assets_not_imported")
        self.assertEqual(result["assets_listed"], 156)
        self.assertEqual(result["bytes_verified"], 0)
        self.assertEqual(result["assets_registered_in_game_by_this_tool"], 0)
        self.assertFalse(result["official_uv_fidelity_verified"])

    def test_asset_id_and_path_collisions_rejected(self):
        inventory, delivery = make_fixture()
        inventory["assets"][1]["id"] = inventory["assets"][0]["id"]
        self.assertEqual(gate.run(inventory, delivery)["result"], "failed")

    def test_path_traversal_rejected(self):
        inventory, delivery = make_fixture()
        inventory["assets"][0]["file"] = "textures/peau/../../secret.png"
        self.assertTrue(any("Unsafe" in s for s in gate.run(inventory, delivery)["errors"]))

    def test_wrong_partition_or_missing_archive_rejected(self):
        inventory, delivery = make_fixture()
        delivery["archives"][0]["assets"].pop()
        self.assertEqual(gate.run(inventory, delivery)["result"], "failed")

    def test_real_zip_files_are_required_for_byte_verification(self):
        import tempfile
        inventory, delivery = make_fixture()
        with tempfile.TemporaryDirectory() as tmp:
            result = gate.run(inventory, delivery, Path(tmp))
        self.assertEqual(result["result"], "failed")
        self.assertTrue(any("Missing or unsafe ZIP" in s for s in result["errors"]))


if __name__ == "__main__":
    unittest.main()
