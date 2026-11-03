#!/usr/bin/env python3
"""Create a new V152 companion without changing the original workbook."""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

out=Path(__file__).resolve().parent.parent/"docs/clan-war-stealth-perception/Suivi_Perception_Patrouilles.xlsx"
out.parent.mkdir(parents=True,exist_ok=True)
w=Workbook();s=w.active;s.title="Suivi"
s.append(["Suivi complémentaire V152 — perception des patrouilles"])
s.append(["Source", "Exigence initiale", "Correction vérifiée localement", "État actuel", "Limites et prochaines preuves"])
s.append(["#78 · 01_QUATRE_MODES!A28 · CW152-INF-004", "Mémoire de dernier contact et leurre", "La perte de contact utilise la même perception que la détection : ligne, portée, camouflage et couvert.", "Partiel — tests locaux", "La CI précédente ne couvrait pas ce cas diagonal ; pas de revendication d’IA ou de visuel 1:1."])
s.append(["#78 · 01_QUATRE_MODES!A29 · CW152-INF-005", "Règles d'alerte et renfort cohérents", "Régression testée avec et sans second garde ; pas de souvenir partagé artificiellement.", "Partiel — prototype", "Coordination multi-étages et mémoire autonome du second garde restent ouvertes."])
s.append(["#78 · 02_QUALITE_QA!A25 · QA152-INF-05", "Tester deux gardes, bruit, vision", "Cinq scénarios moteur : diagonale, renfort, camouflage, couvert et cible toujours visible.", "Partiel — tests locaux", "Navigateur de production, bruit spatial, serveur et source visuelle restent à vérifier."])
s.merge_cells("A1:E1");s.freeze_panes="C3";s.auto_filter.ref="A2:E5"
p=w.create_sheet("Preuves")
p.append(["Contrôle", "Résultat", "Portée"])
p.append(["Reproduction sur #78 29b5dd20", "Échec avant correction : diagonale seule et avec renfort ; camouflage déjà correct", "Test moteur, données source V6/W3"])
p.append(["Correction de perception", "Les cinq scénarios ciblés passent localement", "Le regard est recalculé avant et après déplacement ; le gameplay reste original"])
p.append(["Régression et archive", "Voir commandes et résultats de la branche associée", "Pas de sauvegarde historique d’un joueur, ni preuve de serveur ou de manette"])
src=w.create_sheet("Sources")
src.append(["Source", "Lien", "Identité"])
src.append(["Classeur V152 de #78", "Classeur source", "Git blob 37a9bfbb3c62a480457b240461c769e14b797d9b ; SHA-256 40ad861f04e789961b1619b3aa464e1c41c26424313ae7e8159b917b72adad37"])
src["B2"].hyperlink="https://github.com/darknigthmare/yautja-la-longue-chasse/blob/29b5dd20d206d2ddc82aeef4cbfe546561d68d7a/docs/clan-war-v152/Yautja_ClanWar_V152_Provenance_QA.xlsx";src["B2"].style="Hyperlink"
src.append(["Base #78", "PR de référence", "Les classeurs V151/V152 d’origine ne sont ni réécrits ni déclarés clos par ce complément."])
src["B3"].hyperlink="https://github.com/darknigthmare/yautja-la-longue-chasse/pull/78";src["B3"].style="Hyperlink"
for sheet in w:
 sheet.sheet_view.showGridLines=False;sheet.sheet_properties.pageSetUpPr.fitToPage=True
 sheet.page_setup.fitToWidth=1;sheet.page_setup.fitToHeight=0;sheet.page_setup.orientation="landscape"
 for row in sheet.iter_rows():
  for c in row:c.alignment=Alignment(vertical="top",wrap_text=True)
 for c in sheet[1]:c.fill=PatternFill("solid",fgColor="23394D");c.font=Font(color="FFFFFF",bold=True)
 for col in range(1,sheet.max_column+1):sheet.column_dimensions[get_column_letter(col)].width=38 if col!=2 else 48
 for i in range(2,sheet.max_row+1):sheet.row_dimensions[i].height=82
s.row_dimensions[1].height=28;s.row_dimensions[2].height=28
for c in s[2]:c.fill=PatternFill("solid",fgColor="38536B");c.font=Font(color="FFFFFF",bold=True)
w.save(out);print(out)
