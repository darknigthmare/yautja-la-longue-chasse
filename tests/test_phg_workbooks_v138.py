"""V138 release validator: real output and tamper rejection, no document edits."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

FILE=Path(__file__).resolve().parents[1]/"scripts/verify-phg-production-xlsx-v138.py"
spec=importlib.util.spec_from_file_location("phg_xlsx_v138",FILE)
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class V138WorkbookGate(unittest.TestCase):
    def test_v137_archive_and_ticket_registry_are_integral(self):
        result=gate.validate()
        self.assertEqual(result["status"],"PASS")
        self.assertEqual(result["four_workbooks"],4)
        self.assertEqual(result["backlog_total"],389)
        self.assertEqual(next(x for x in result["workbooks"] if x["file"].endswith("Backlog_Production_V137.xlsx"))["new_official_gaps"],6)
        self.assertEqual(len(result["technical_closed"]),3)
        self.assertGreaterEqual(sum(x["sheets"] for x in result["workbooks"]),42)

    def test_missing_release_manifest_fails_safely(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(gate.WorkbookIntegrityError,"Missing V137 release manifest"):
                gate.validate(Path(folder))


if __name__=="__main__":
    unittest.main()
