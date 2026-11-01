# Réconciliation V112 — chasse + Homeworld

Le 30 octobre 2026, intégration de `main` (3943522296dff8cdb2d183dd7f9b7132b2a912c6) au-dessus du travail Homeworld (a5ed39dfbed118669b2e76402c490b200136a74d).

- 80 fichiers récents de `main` repris ; les contenus non conflictuels utilisent les blobs d’origine sans réécriture.
- Seuls `.github/workflows/audit-v94.yml` et `app/game/buildInfo.ts` nécessitent une résolution conjointe.
- La CI combine les chemins/fixtures, suites V112 chasse et V112 Homeworld, vérifications V111 historiques et exercices navigateur. Un budget de 75 minutes remplace les 60 précédentes.
- L’étiquette V112 couvre les nouveautés des deux côtés.
- Les 477 chemins du PR Homeworld sont conservés hors ces résolutions ; aucune validation visuelle 1:1 n’est inférée du merge.
