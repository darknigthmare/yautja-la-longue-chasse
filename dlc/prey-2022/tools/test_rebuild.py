"""Archival integrity tests; these are not gameplay/browser tests."""
import shutil
import tempfile
import unittest
from pathlib import Path
import rebuild


class RebuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="prey-import-")
        self.work = Path(self.temp.name)
        self.source = self.work / "source"
        shutil.copytree(rebuild.ROOT / "v0.6.0", self.source)

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_original_package(self):
        files = rebuild.assemble(self.source)
        self.assertEqual(len(files), 57)
        self.assertEqual(len(files["src/prey-content-v06.json"]), 109399)
        self.assertEqual(len(files["JOUER_PREY_DLC_V0_6_PORTABLE.html"]), 178613)

    def test_changed_source_refused(self):
        (self.source / "README.md").write_text("changed", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Source checksum mismatch"):
            rebuild.assemble(self.source)

    def test_changed_manifest_refused(self):
        (self.source / "SHA256SUMS.txt").write_text("changed", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "SHA256SUMS.txt has changed"):
            rebuild.assemble(self.source)

    def test_symlink_refused(self):
        original = self.source / "README.md"
        moved = self.work / "original-readme.md"
        original.rename(moved)
        try:
            original.symlink_to(moved)
        except OSError:
            self.skipTest("Symlinks unavailable on this system")
        with self.assertRaisesRegex(ValueError, "Symlink refused"):
            rebuild.assemble(self.source)

    def test_existing_output_preserved(self):
        output = self.work / "existing"
        output.mkdir()
        (output / "keep.txt").write_bytes(b"keep")
        with self.assertRaisesRegex(ValueError, "nothing overwritten"):
            rebuild.write_new(output, {"keep.txt": b"replace"})
        self.assertEqual((output / "keep.txt").read_bytes(), b"keep")

    def test_write_all_bytes(self):
        files = rebuild.assemble(self.source)
        output = self.work / "rebuilt"
        rebuild.write_new(output, files)
        actual = {p.relative_to(output).as_posix(): p.read_bytes()
                  for p in output.rglob("*") if p.is_file()}
        self.assertEqual(actual, files)


if __name__ == "__main__":
    unittest.main()
