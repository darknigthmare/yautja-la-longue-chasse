import unittest
from openpyxl import load_workbook


class TrackerTests(unittest.TestCase):
    def test_references_and_open_scope(self):
        w=load_workbook("docs/clan-war-stealth-perception/Suivi_Perception_Patrouilles.xlsx")
        self.assertEqual(w.sheetnames,["Suivi","Preuves","Sources"])
        self.assertIn("CW152-INF-004",w["Suivi"]["A3"].value)
        self.assertIn("CW152-INF-005",w["Suivi"]["A4"].value)
        self.assertIn("QA152-INF-05",w["Suivi"]["A5"].value)
        self.assertTrue(all("Partiel" in w["Suivi"][f"D{i}"].value for i in (3,4,5)))
        self.assertIn("29b5dd20",w["Sources"]["B2"].hyperlink.target)
        self.assertIn("37a9bfbb",w["Sources"]["C2"].value)


if __name__=="__main__":
    unittest.main()
