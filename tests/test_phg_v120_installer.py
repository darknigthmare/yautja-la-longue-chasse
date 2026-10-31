"""V120 offline safety checks; no private Drive access or binary fixture required."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/"scripts/install-phg-runtime-v120.py"
spec=importlib.util.spec_from_file_location("installer_v120",FILE)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class InstallerSafety(unittest.TestCase):
    def test_catalog_and_empty_registry_remain_safe(self):
        source=module.read_catalog()
        self.assertEqual(len(source["assets"]),156)
        self.assertEqual(source["bundleSha256"],"9a2e88383fda303a97780f0b68ae3f77639f13b16d5bea4ab645d0a383cdf6d9")
        state=module.verify_installed(source)
        self.assertGreaterEqual(state["pending"],0)
        self.assertEqual(state["installedSelectable"]+state["pending"],149)

    def test_missing_bundle_refuses_before_any_write(self):
        source=module.read_catalog()
        with tempfile.TemporaryDirectory() as work:
            with self.assertRaisesRegex(ValueError,"Missing runtime bundle"):
                module.verify_bundle(Path(work)/"none.zip",source)
            self.assertEqual(list(Path(work).iterdir()),[])

    def test_untrusted_catalog_path_is_refused(self):
        source=module.read_catalog()
        source["assets"][0]["runtimePath"]="/game/assets/v120/phg-drive/../../evil.webp"
        with tempfile.TemporaryDirectory() as work:
            p=Path(work)/"catalog.json"
            p.write_text(json.dumps(source))
            with self.assertRaisesRegex(ValueError,"Traversal"):
                module.read_catalog(p)

    def test_existing_unrelated_file_is_never_overwritten(self):
        source=module.read_catalog()
        with tempfile.TemporaryDirectory() as work:
            root=Path(work)
            path=root/"public/game/assets/v120/phg-drive/skin/preexisting.webp"
            path.parent.mkdir(parents=True)
            path.write_bytes(b"old")
            with self.assertRaisesRegex(ValueError,"refusing overwrite"):
                module.install_verified({"public/game/assets/v120/phg-drive/skin/preexisting.webp":b"new"},[],source,root)
            self.assertEqual(path.read_bytes(),b"old")

if __name__=="__main__":
    unittest.main()
