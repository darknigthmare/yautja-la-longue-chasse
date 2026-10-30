import importlib.util, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("phg_v126",Path(__file__).parents[1]/"scripts/install-phg-recent-v126.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class V126Safety(unittest.TestCase):
 def test_pending_and_sources(self):
  c=mod.catalog();self.assertEqual(len(c["items"]),4)
  self.assertEqual(mod.installed(c),{"enabled":0,"remaining":4})
 def test_missing_bundle_no_write(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(ValueError,"ZIP missing"):
    mod.verify(Path(d)/"missing.zip",mod.catalog())
 def test_collision_refusal(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d); p=root/"public/game/assets/v126/phg-recent/atlas.webp"
   p.parent.mkdir(parents=True);p.write_bytes(b"original")
   with self.assertRaisesRegex(ValueError,"Refusing to overwrite"):
    mod.install(mod.catalog(),{"atlas.webp":b"changed"},root)
   self.assertEqual(p.read_bytes(),b"original")
if __name__=="__main__":unittest.main()
