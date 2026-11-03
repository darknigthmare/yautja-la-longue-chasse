#!/usr/bin/env python3
"""Produce a small additive tracker; never modify the historic PR55 workbook."""
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

target = Path(__file__).resolve().parent.parent / "docs/clan-war-stealth-last-contact/Suivi_Contact_Patrouille.xlsx"
target.parent.mkdir(parents=True, exist_ok=True)
w = Workbook()
w.properties.title = "Patrouilles — suivi complémentaire"
w.properties.creator = "Yautja — suivi local"
w.properties.created = datetime(2026, 11, 1, tzinfo=timezone.utc).replace(tzinfo=None)
w.properties.modified = w.properties.created
s = w.active
s.title = "Suivi"
s.append(["Suivi complémentaire des patrouilles — sans modification des classeurs historiques"])
s.append(["Base de code : PR #67, tête 238bfa70 ; source originale : PR #55, tête fa032280."])
s.append(["Les lignes restent partielles : le comportement est une adaptation originale, sans certification 1:1."])
s.append(["Source qualifiée", "Exigence source exacte", "Portée de ce lot", "État", "Restant / limite", "Preuve"])
s.append(["PR55 · INFILTRATION_V144!A5 · CW144-INF-001", "Poursuite de la dernière case vue pendant deux décisions", "Garde principal uniquement : mémoire après contact visuel réel, 2 tours, leurre prioritaire et conservation à la reprise.", "Prototype partiel — tests locaux", "Les tests ne certifient pas une IA canonique ou la poursuite d'un groupe ; CI de cette branche à examiner.", "tests/clan-war-stealth-last-contact.test.mjs ; scripts/qa-stealth-last-contact-browser.mjs"])
s.append(["PR55 · INFILTRATION_V144!A12 · CW144-INF-008", "Patrouilles coordonnées aux étages et postes", "Le garde de renfort ne reçoit pas implicitement le souvenir privé du premier garde.", "À développer", "Coordination entre gardes, postes et étages non livrée ; pas de fermeture déduite du renfort 2D.", "tests/clan-war-stealth-last-contact.test.mjs"])
s.append(["PR56 · INFILTRATION_V144!A5 · CW144-INF-001", "Option difficulté : second garde après une alerte dans une vraie entrée W3", "Conservation du renfort de #67 ; cet identifiant désigne une autre exigence que PR55-CW144-INF-001.", "Prototype partiel — base héritée", "Vraie QA de production, archives de joueurs, manette et contrôle multi-onglets restent ouverts.", "tests/clan-war-stealth-reconciliation.test.mjs ; CI de #67"])
for row_number in (1, 2, 3):
    s.merge_cells(start_row=row_number, start_column=1, end_row=row_number, end_column=6)
s.auto_filter.ref = "A4:F7"
s.freeze_panes = "C5"
q = w.create_sheet("Preuves")
q.append(["Cas", "Vérification", "État au moment du lot", "Limite"])
q.append(["Mémoire observée", "Contact du garde principal, durée, deux positions cachées distinctes", "Test moteur exécuté localement", "Fixtures moteur, pas une animation validée"])
q.append(["Leurre prioritaire", "Même leurre et mémoires différentes donnent le même déplacement du premier garde", "Test moteur exécuté localement", "Ne vérifie pas tous les décors ou appareils"])
q.append(["Deux gardes", "Une alerte due au second ne crée pas de souvenir pour le premier", "Test moteur exécuté localement", "Aucune coordination ou mémoire propre au second"])
q.append(["Reprise PR55", "Archive de test produite par commandes du runtime PR55, choix manuel, camouflage, rechargement Chromium", "Test navigateur local exécuté", "Pas d'archive historique utilisateur ; fixture du composant, pas de build Next"])
q.append(["Campagne / réseau", "Aucune mutation intentionnelle du mode V85, aucune autorité serveur", "Non certifié par ce lot", "Manette, cloud et multi-onglets ouverts"])
q.freeze_panes = "A2"
src = w.create_sheet("Sources")
src.append(["Source", "Référence", "Identité / limites"])
src.append(["Classeur PR55", "https://github.com/darknigthmare/yautja-la-longue-chasse/blob/fa0322800d5c51e16a4dd56ef6d0fc80d8020394/docs/clan-war-v144/Yautja_Guerres_Clans_Suivi_Production_V144_2026-10-31.xlsx", "Git blob fe76b659c2955905bd05ae3cbaef1b83ef9afe45 ; SHA-256 406167c0aacde29858c47e918cc31d9aa5c27cf88e65f12a68a6d56377582916"])
src.append(["Source de mécanique PR55", "https://github.com/darknigthmare/yautja-la-longue-chasse/pull/55", "Dernier contact : adaptation de jeu, pas référence filmique 1:1."])
src.append(["Base réconciliation", "https://github.com/darknigthmare/yautja-la-longue-chasse/pull/67", "PR brouillon empilée sur #61 ; ne représente pas une fusion de #55 ou #57."])
src.append(["Attention aux IDs", "CW144-INF-001", "Identifiant réutilisé par des branches V144 différentes ; qualifier par numéro de PR."])
for cell in (src["B2"], src["B3"], src["B4"]):
    cell.hyperlink = cell.value
    cell.style = "Hyperlink"
for cell, label in ((src["B2"], "Classeur source PR55"), (src["B3"], "PR55 sur GitHub"), (src["B4"], "PR67 sur GitHub")):
    cell.value = label
for sheet in w:
    sheet.sheet_view.showGridLines = False
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.page_setup.orientation = "landscape"
    sheet.row_dimensions[1].height = 28
    for c in sheet[1]:
        c.fill = PatternFill("solid", fgColor="23394D")
        c.font = Font(color="FFFFFF", bold=True)
    for row in sheet.iter_rows():
        for c in row:
            c.alignment = Alignment(vertical="top", wrap_text=True)
    for col in range(1, sheet.max_column + 1):
        sheet.column_dimensions[get_column_letter(col)].width = 34 if col != 2 else 50
    for i in range(2, sheet.max_row + 1):
        sheet.row_dimensions[i].height = 78
for c in s[4]:
    c.fill = PatternFill("solid", fgColor="38536B")
    c.font = Font(color="FFFFFF", bold=True)
for i in (1, 2, 3, 4):
    s.row_dimensions[i].height = 28
w.save(target)
print(target)
