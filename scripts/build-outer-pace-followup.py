#!/usr/bin/env python3
"""Create a separate follow-up; never edit either historical source workbook."""
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment

output = Path("docs/clan-war-v146/Yautja_OuterOps_Reconciliation_V144_V146.xlsx")
wb = Workbook()
sheet = wb.active
sheet.title = "Suivi"
rows = [
    ["Source qualifiée", "Sujet", "Changement proposé", "Preuve", "Statut et limites"],
    ["PR57@f25cd7a CW144-OUT-001", "Marche forcée",
     "3 RAV ; retour 8 s plus tôt ; risque +2 ; trajet continu sans saut",
     "tests/clan-war-outer-pace-reconcile.test.mjs",
     "Implémenté et testé localement ; pas de certification 1:1"],
    ["PR57@f25cd7a QA-V144-OUT-01", "Ordre et résolution",
     "Même équipe et trajet ; aucun rapport avant échéance",
     "tests/clan-war-outer-pace-reconcile.test.mjs",
     "Test moteur ; QA multijoueur ouverte"],
    ["PR57@f25cd7a QA-V144-OUT-02", "Rappel et archives",
     "Deux sauvegardes de test issues du moteur PR57, rappel et échéance",
     "tests/fixtures/outer-pace-pr57/provenance.json",
     "Pas de sauvegarde historique d'utilisateur"],
    ["PR57@f25cd7a QA-V144-OUT-03", "Fin de fenêtre",
     "Ordre après premier quart refusé sans dépense",
     "tests/clan-war-outer-pace-reconcile.test.mjs", "Test moteur local"],
    ["PR57@f25cd7a QA-V144-OUT-08", "Réseau",
     "Deux clients et dépense autoritaire", "Non exécuté",
     "OUVERT : aucun serveur ni signature multi-appareils"],
    ["PR61@dfa21d9 Détour V144/V145", "Manœuvre existante",
     "Détour et pauses préservés ; exclusion mutuelle avec marche forcée",
     "tests/clan-war-four-modes-v145.test.mjs", "Régression ciblée ; fusion PR67 à revoir"],
    ["PR57@f25cd7a Interface", "Action joueur et reprise",
     "Sélection, dépense, recharge et rappel", "scripts/qa-outer-pace-browser.mjs",
     "Fixture Chromium/Vite ; pas serveur Next de production"],
]
for row in rows:
    sheet.append(row)
sheet.freeze_panes = "B2"
sheet.auto_filter.ref = sheet.dimensions
for cell in sheet[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="244158")
for col, width in zip("ABCDE", [34, 25, 70, 55, 60]):
    sheet.column_dimensions[col].width = width
for row in sheet:
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True)
for n in range(2, len(rows) + 1):
    sheet.row_dimensions[n].height = 42
wb.properties.creator = "Yautja production follow-up"
output.parent.mkdir(parents=True, exist_ok=True)
wb.save(output)
check = load_workbook(output, read_only=True)
assert check.sheetnames == ["Suivi"] and check.active.max_row == len(rows)
print(output, "rows", len(rows) - 1)
