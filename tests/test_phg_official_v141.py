"""V141 ledger proves source/category fidelity without pretending to see PHG UVs."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/"scripts/verify-phg-official-v141.py"
spec=importlib.util.spec_from_file_location("phg_official_v141",FILE)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class V141Gate(unittest.TestCase):
    def test_official_cosmetics_and_source_coverage(self):
        result=module.validate()
        self.assertEqual(result["status"],"PASS")
        self.assertEqual(result["source_rows"],23)
        self.assertEqual(result["class_combinations"],144)
        self.assertEqual(result["allowed"]+result["blocked"],144)
        self.assertEqual(result["historic_visual_qa"],1134)
        self.assertEqual(result["official_pixel_certifications"],0)
    def test_tampered_workbook_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"corrupted.xlsx"
            path.write_bytes(module.XLSX.read_bytes()+b"ALTERED")
            with self.assertRaisesRegex(module.PHGReferenceError,"SHA-256"):
                module.validate(path)
if __name__=="__main__":unittest.main()
