import importlib.util, tempfile, unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/"scripts/install-phg-biomask-v132.py"
spec=importlib.util.spec_from_file_location("v132",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestV132(unittest.TestCase):
 def test_not_enabled_without_bundle(self):
  c=m.catalog()
  self.assertEqual(len(c["items"]),7)
  self.assertEqual(m.verify_installed(c),{"active":0,"pending":7})
 def test_missing_archive_is_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   with self.assertRaisesRegex(ValueError,"Missing V132 ZIP"):
    m.verify_bundle(Path(t)/"bad.zip",m.catalog())
 def test_existing_file_not_overwritten(self):
  with tempfile.TemporaryDirectory() as t:
   base=Path(t);p=base/"public/game/assets/v132/phg-biomask/atlas.webp"
   p.parent.mkdir(parents=True);p.write_bytes(b"existing")
   with self.assertRaisesRegex(ValueError,"Refusing to replace"):
    m.install(m.catalog(),b"unrelated",base)
   self.assertEqual(p.read_bytes(),b"existing")
if __name__=="__main__":unittest.main()
