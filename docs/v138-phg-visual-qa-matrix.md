# V138 — Matrice opérationnelle de QA visuelle PHG / Yautja

## Livrable

Le complément `docs/production/Yautja_PHG_QA_Visual_Morphologies_V138.xlsx` documente **1 134 scénarios** à exécuter sur un build : **63 actifs** (7 biomasks conceptuels V133, 48 decals originaux V133, 8 finitions de biomask V131/V132) × **6 morphologies** (classic, elder, super, feral, huntress, young) × **3 angles** (face, profil, dos). Le fichier contient les champs de capture, critères d'acceptation, statut et source, et garde zéro faux succès.

Données supplémentaires : **40 écarts documentaires** (34 dossiers historiques + 6 ajouts de V137), journal de régression, dashboard formules. Les cas du fichier sont marqués `À tester` tant qu'aucune capture visuelle ou preuve UV nominative n'est disponible.

**Drive :** https://drive.google.com/file/d/1XQZPtjNBj9Lkb_gtWqdyW2pB_whuHpIG/view?usp=drivesdk

**SHA-256 :** `d406a273dd96ef2ad2190d2ca63bd0d146c1db4c46559cc482832889f40b68ea` ; 76 119 octets.

## Intégrité de l'Excel V137

Le validateur `scripts/verify-phg-production-xlsx-v138.py` a d'abord exposé un faux positif dû à l'expression régulière `B136-*` seulement ; les **six IDs `B137-0384` à `B137-0389`** existent réellement dans `Backlog_Master`. La correction `B13[67]` vérifie explicitement les **383 tickets B136** + **six tickets B137**, quatre XLSX SHA-pinnés, ZIP identique et trois clôtures techniques. Elle a passé la CI sur `fcc861f`.

## Compilation

Le correctif TS2322 du commit `446d415` typait la sauvegarde candidate avec `SaveGame["appearance"]`. La compilation complète et ESLint étaient au vert sur ce commit. Les jobs de navigation navigateur et autres workflows doivent être contrôlés sur le dernier commit de la PR avant fusion.

## Limites

La matrice recense des tests à exécuter, elle ne certifie **aucune** UV/PBR officielle ni un rendu PHG 1:1. Les 156 sources V120 ne sont pas toutes installées en jeu et les 34 dossiers de fidélité restent ouverts.
