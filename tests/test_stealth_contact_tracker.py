import unittest
from pathlib import Path
from openpyxl import load_workbook


class TrackerTests(unittest.TestCase):
    def test_tracks_distinct_source_rows_without_claiming_global_completion(self):
        path = Path("docs/clan-war-stealth-last-contact/Suivi_Contact_Patrouille.xlsx")
        book = load_workbook(path, data_only=False, read_only=False)
        self.assertEqual(book.sheetnames, ["Suivi", "Preuves", "Sources"])
        sheet = book["Suivi"]
        self.assertEqual(sheet["A5"].value, "PR55 · INFILTRATION_V144!A5 · CW144-INF-001")
        self.assertEqual(sheet["B5"].value, "Poursuite de la dernière case vue pendant deux décisions")
        self.assertEqual(sheet["A6"].value, "PR55 · INFILTRATION_V144!A12 · CW144-INF-008")
        self.assertEqual(sheet["D6"].value, "À développer")
        self.assertIn("PR56", sheet["A7"].value)
        self.assertNotEqual(sheet["B5"].value, sheet["B7"].value)
        self.assertNotIn("terminé", " ".join(str(sheet[f"D{i}"].value).lower() for i in range(5, 8)))
        self.assertIn("fa032280", book["Sources"]["B2"].hyperlink.target)
        self.assertIn("fe76b659", book["Sources"]["C2"].value)
        self.assertIn("pas d'archive historique", book["Preuves"]["D5"].value.lower())


if __name__ == "__main__":
    unittest.main()
