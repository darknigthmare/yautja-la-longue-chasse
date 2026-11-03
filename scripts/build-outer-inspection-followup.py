#!/usr/bin/env python3
"""Create an additive follow-up, leaving historical workbook bytes intact."""
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment

output = Path("docs/clan-war-v152/Yautja_OuterOps_Inspection_V153.xlsx")
book = Workbook()
sheet = book.active
sheet.title = "Suivi qualifié"
rows = [
    ["Provenance et ligne", "Exigence", "Travail", "Preuve", "Statut et limite"],
    ["PR55@fa032280 OUTER_OPS_V144!A5 / CW144-OUT-001", "Inspection V6",
     "1 RAV, passage public actuel, bonus +2 différé ; pas d'inspection pendant une pause",
     "tests/clan-war-outer-inspection-reconcile.test.mjs",
     "Réintégré et vérifié localement ; gameplay original, pas canon 1:1"],
    ["PR55@fa032280 QA_V144!A15 / QA144-OUT-01", "Inspection et rapport",
     "Même équipe, aucun rapport avant échéance, coût et résultat uniques",
     "tests/clan-war-outer-inspection-reconcile.test.mjs",
     "Test moteur local ; CI et production à qualifier séparément"],
    ["PR55@fa032280 QA_V144!A20 / QA144-OUT-06", "Manette et tactile",
     "Choix de route, inspection et retour", "Non exécuté",
     "OUVERT : manette physique et tactile non testés"],
    ["PR78@29b5dd20 01_QUATRE_MODES!A16 / CW152-OUT-002", "Rappel après bulletin",
     "Utiliser l'échéance aller, préserver le bulletin et la reprise",
     "tests/clan-war-outer-inspection-reconcile.test.mjs ; scripts/qa-outer-inspection-browser.mjs",
     "Moteur et Chromium ciblés ; pas de campagne complète"],
    ["PR78@29b5dd20 02_QUALITE_QA!A17 / QA152-OUT-05", "Pauses et marche forcée",
     "Pas de nouvelle inspection en pause ; coexistence marche forcée et sauvegarde",
     "tests/clan-war-outer-inspection-reconcile.test.mjs",
     "Prototype partiel ; véhicule, serveur et monde physique restent ouverts"],
    ["PR55@fa032280 archive", "Archives du moteur source",
     "Lecture inspection, rappel et ancienne inspection en halte",
     "tests/fixtures/outer-inspection-pr55/provenance.json",
     "Archives générées pour tests ; aucune archive historique de joueur"],
    ["PR78@29b5dd20 08_BACKLOG!A13 / BACK152-009", "Multi-appareils",
     "RAV, PC et troupes entre appareils", "Non exécuté",
     "OUVERT : pas de serveur autoritaire"],
]
for row in rows:
    sheet.append(row)
sheet.freeze_panes = "B2"
sheet.auto_filter.ref = sheet.dimensions
for cell in sheet[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="244158")
for col, width in zip("ABCDE", [49, 25, 65, 62, 62]):
    sheet.column_dimensions[col].width = width
for row in sheet:
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True)
for row in range(2, len(rows)+1):
    sheet.row_dimensions[row].height = 45
book.properties.creator = "Yautja production follow-up"
output.parent.mkdir(parents=True, exist_ok=True)
book.save(output)
loaded = load_workbook(output, read_only=True)
assert loaded.sheetnames == ["Suivi qualifié"] and loaded.active.max_row == len(rows)
print(output, "rows", len(rows)-1)
