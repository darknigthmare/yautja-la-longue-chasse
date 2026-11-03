"""V139 visual review matrix: no false passes, no formula tampering."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/verify-phg-visual-v139.py"
spec=importlib.util.spec_from_file_location("phg_v139",SCRIPT)
validator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
XLSX=ROOT/"docs/production/Yautja_PHG_QA_Visual_Morphologies_V139.xlsx"
S=validator.S

def mutate(src,dst,target,change):
    with zipfile.ZipFile(src) as z,zipfile.ZipFile(dst,"w") as result:
        for info in z.infolist():
            data=z.read(info.filename)
            if info.filename==target:
                xml=ET.fromstring(data)
                change(xml)
                data=ET.tostring(xml,encoding="utf-8",xml_declaration=True)
            result.writestr(info,data)

class V139VisualGate(unittest.TestCase):
    def test_52_math_1134_real_qa_and_40_evidence_cases(self):
        report=validator.validate()
        self.assertEqual(report["math_pass"],52)
        self.assertEqual(report["historic_cases"],1134)
        self.assertEqual(report["source_gaps"],40)
        self.assertEqual(report["visual_certified"],0)
        self.assertFalse(report["phg_uv_1to1_certified"])
    def test_wrong_binary_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            other=Path(d)/"tampered.xlsx"
            other.write_bytes(XLSX.read_bytes()+b"garbage")
            with self.assertRaisesRegex(validator.VisualLedgerError,"SHA-256"):
                validator.validate(other)
    def test_forged_visual_approval_is_refused_without_hash_guard(self):
        with tempfile.TemporaryDirectory() as d:
            other=Path(d)/"forged.xlsx"
            def fake(xml):
                cell=xml.find(f".//{S}c[@r='H5']")
                cell.set("t","str");cell.find(S+"v").text="Conforme"
            mutate(XLSX,other,"xl/worksheets/sheet2.xml",fake)
            with self.assertRaisesRegex(validator.VisualLedgerError,"False-positive"):
                validator.validate(other,expected_sha=None)
    def test_removed_projection_formula_is_refused_without_hash_guard(self):
        with tempfile.TemporaryDirectory() as d:
            other=Path(d)/"formula.xlsx"
            def fake(xml):
                xml.find(f".//{S}c[@r='M5']").find(S+"f").text="E5"
            mutate(XLSX,other,"xl/worksheets/sheet6.xml",fake)
            with self.assertRaisesRegex(validator.VisualLedgerError,"Removed live formula"):
                validator.validate(other,expected_sha=None)

if __name__=="__main__":unittest.main()
