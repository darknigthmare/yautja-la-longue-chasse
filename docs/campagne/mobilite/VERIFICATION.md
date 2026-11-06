# Vérification documentaire — mobilité / PR #116

Contrôles exécutés localement sur les fichiers destinés à la PR, le 5 novembre 2026.

- `python3 docs/campagne/mobilite/export_catalogue.py` : 50 fiches uniques, cinq blocs de dix, huit axes statistiques par fiche, propriétés requises et listes non vides.
- Comparaison Python avec le JSON original fourni : égalité de toutes les 50 fiches, sans retrait de champ ; égalité des deux socles d'animations.
- Empreinte sémantique des fiches : `5b4a52efeb5e4589fbf9eca72636bd410bca79c261327af2bceb925d0aff6e7c`.
- `--out` : export JSON relisible, 50 sections de prompts, 50 lignes CSV ; deux exécutions successives produisent les mêmes empreintes.
- Cas invalides volontairement testés dans des copies temporaires : bloc altéré, ID dupliqué, statistique 99, activation runtime, sortie sur les sources. Les cinq sont rejetés.
- La sphère sans arme conserve `offense=0` ; les 399 autres valeurs restent dans les bornes prévues. Les tiers ne sont pas convertis en rangs.
- Les empreintes Git des blocs transférés correspondent aux fichiers locaux ; leur détail figure dans MANIFEST.json.

Concordance relue : campagne L-01 à L-10, huit chasses, hangar existant, Homeworld, sauvegardes, annexes compagnons et Warp présentes à `22f5b174b3d37e1e51f831bb75447376650a5569`. Il s'agit d'une revue documentaire ciblée, pas d'un audit exhaustif de tous les systèmes du dépôt.

Non exécutés : build du jeu, navigateur/manette, comportement de conduite, migrations runtime, validation artistique, mesures FPS, tests audio. Aucun contrôle MOB-QA de gameplay n'est fermé par cette passe. Aucun sprite, son, PNJ ou véhicule jouable n'est ajouté. Aucune fusion ni publication demandée.
