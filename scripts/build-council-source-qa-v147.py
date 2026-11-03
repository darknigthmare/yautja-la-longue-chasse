#!/usr/bin/env python3
"""Produce a non-destructive V146 Council evidence addendum; preserve prior workbooks."""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

OUT = Path('docs/clan-war-v146/Yautja_Conseil_V146_Controle_Source_Addendum.xlsx')
SOURCE = 'docs/clan-war-v146/Yautja_Guerres_Clans_Avenants_Production_V144_V146_2026-11-01.xlsx'
w = Workbook()
w.remove(w.active)
def table(title, rows, widths):
    s = w.create_sheet(title)
    s.freeze_panes = 'B2'
    for row in rows: s.append(row)
    s.auto_filter.ref = s.dimensions
    for cell in s[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='19354A')
    for row in s:
        for c in row: c.alignment = Alignment(vertical='top', wrap_text=True)
    for idx,width in enumerate(widths,1): s.column_dimensions[get_column_letter(idx)].width=width
    return s

table('SUIVI_CIBLE', [
 ['ID et provenance', 'Champ', 'Constat et preuve', 'État', 'Prochaine preuve'],
 ['PR61 / RTS_V146 / CW146-RTS-001', 'Cohérence locale du reçu', 'Le titre historique « authentifié » ne décrit pas une archive locale : mission complète et points de carte comparés au catalogue, tour et RAV bornés, groupes laissés comparés au reçu.', 'Partiel — non authentifié', 'Archive authentifiée par serveur et partie réelle ; aucune capture V85.'],
 ['PR61 / RTS_V146 / CW146-RTS-002', 'Identités', 'Unité inconnue rejetée ; cohérence de l’identité de l’escorte vérifiée. Une unité V6 peut toujours être substituée par une autre dans une archive non authentifiée.', 'Partiel — non authentifié', 'Identités établies à la source par serveur et revue métier.'],
 ['PR61 / QA_V146 / QA-CW146-RTS-03', 'Falsification', 'Tests de coordonnées, instructions, tour, RAV et groupes laissés ; 24 retraites, 24 défaites et 24 victoires en conditions de test isolées.', 'À valider en CI', 'Vraies parties sur navigateur, adversaires et aléas actifs.'],
 ['PR61 / RTS_V146 / CW146-RTS-006', 'Provenance 1:1', 'Les cartes restent des études W3 originales ; aucune source artistique nouvelle.', 'À développer', 'Références et revue visuelle œuvre par œuvre.'],
], [38,29,92,30,65])

table('PREUVES', [
 ['Preuve', 'Commande ou fichier', 'Portée', 'Limites'],
 ['Tests Conseil', 'node --test tests/clan-war-council-v146.test.mjs tests/clan-war-council-v146-victories.test.mjs', '72 issues sur 24 scénarios ; assertions de rejet des données incohérentes.', 'Positions et blessures placées en fixture, victoires sans ennemis ni aléas ; pas de gameplay certifié.'],
 ['Compilation ciblée', 'npx --no-install tsc --noEmit -p tsconfig.clan-war-v146.json', 'Types du périmètre V146', 'Ni QA navigateur ni performance.'],
 ['Lint ciblé', 'npx --no-install eslint app/game/systems/clanWarCouncilAuditV146.ts tests/clan-war-council-v146.test.mjs', 'Analyse statique des fichiers modifiés', 'Ni revue artistique ni sécurité serveur.'],
 ['Source du classeur', SOURCE, '24 feuilles conservées sans écrasement.', 'Les 73 feuilles historiques V143 restent dans la PR #53.'],
], [30,85,75,75])

table('PROVENANCE', [
 ['Source', 'Référence', 'Nature', 'Garantie'],
 ['Dossier Conseil V146', 'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/61', 'PR parente', 'Brouillon, aucune fusion.'],
 ['Gardes source V146', 'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/65', 'PR parente', 'Cohérence locale, non signature et non anti-triche.'],
 ['Missions W3', 'app/game/systems/clanWarRtsSourceMissionsV129.ts', 'Source V6 et mécaniques de jeu originales', 'Ni preuve artistique 1:1 ni scènes tirées des œuvres.'],
], [30,100,50,65])
OUT.parent.mkdir(parents=True,exist_ok=True)
w.save(OUT)
print(OUT)
