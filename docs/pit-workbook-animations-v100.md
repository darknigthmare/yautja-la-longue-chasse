# Feral et Scar : animations du classeur V54

La source versionnée est `docs/v56-excel-priorities.json` (SHA-256 `fc8e1c6c81de62d8966e04746ed0751b0eeefc62f0458728c818896ad79972f4`). Le classeur privé original n’est pas disponible dans le dépôt. `app/game/data/pitWorkbookAnimationPlanV100.json` conserve le texte de chaque cellule : Feral ligne 10, Scar ligne 7 ; 18 actions D:U et 8 présentations C:J par personnage. Les durées Excel restent des propositions indépendantes des valeurs actuelles du duel.

Les 52 études BODY disposent de leurs 104 orientations natives consultables. Huit nouveaux gestes sont raccordés aux phases existantes du duel, deux réemplois historiques sont conservés et 42 restent des études seules. Les [preuves de production](v100-validation-summary.json) distinguent la lecture, les vrais contrôles de combat, les costumes statiques et les mécaniques encore ouvertes.

## Accès aux images

Dans THE PIT, choisir Feral ou Scar puis ouvrir **Voir les animations · apparence d’origine** sous le choix d’apparence. Le lecteur présente les mouvements historiques, les deux directions et une lecture lente avec pause et image suivante. Les gestes dont la mécanique manque sont désignés comme études de mouvement consultables. La fermeture démonte le lecteur et interrompt sa lecture ; seules les pages de la séquence choisie sont décodées. Le costume choisi pour le duel reste inchangé ; ses animations ne sont pas remplacées par le BODY historique consulté.

L’atelier public historique `/pit-lab` fournit en complément l’identité de cellule, le texte source exact, les durées proposées et l’état des deux orientations. Ce parcours technique n’est pas nécessaire pour consulter les animations depuis le jeu. Les trois routes QA locales protégées conservent leur contrôle distinct.

Le cadrage des deux lecteurs tient compte de toute la séquence et de ses deux directions avant la lecture, y compris des longues armes et des mannequins. La caméra reste ensuite fixe pendant le geste ; les références corporelles et les proportions entre poses restent inchangées.

## Contrat d’admission

`app/game/data/pitWorkbookAnimationsV100.json` est le registre des admissions manuelles. Chaque entrée désigne un personnage, une action source exacte, le BODY historique, un atlas et des clips explicites. Les métadonnées seules ne rendent aucune image disponible : le chargeur doit décoder les vrais pixels, valider l’alpha, les bords et la distinction des dessins. Aucune autre orientation ni aucun autre costume n’est emprunté.

Une nouvelle définition conserve une référence corporelle fixe mesurée sur chaque page ; `pageBodyHeightPx` décrit les pages dont la taille source diffère. Les calibrations debout sont exclues des clips. Les pivots au sol sont relus sur les vrais appuis du chasseur, y compris dans une projection avec mannequin. Les rectangles source peuvent être irréguliers. Le rendu natif ne retourne pas les images et n’invente pas d’interpolation. `resolvePitSpriteSheetInspectionV100` inspecte un dessin déjà décodé sans modifier l’état du combat ni ses curseurs d’observation.

Pour une pose en vol, le pivot conserve le repère du haut du bassin et la distance bassin→semelles de la calibration debout de la même page. Les pieds repliés ne deviennent pas un nouveau sol et le corps accroupi n’est pas agrandi. Une vraie réception possède au contraire son appui au sol relu séparément. Le saut du duel fournit lui-même l’altitude lorsqu’un geste aérien correspond effectivement à son attaque ; une étude avec réception dessinée ne force aucun changement de physique.

Les clips `workbook.*` restent hors du registre de combat. Seuls les identifiants de phases explicitement approuvés dans `combatClipIds` entrent dans `PIT_WORKBOOK_COMBAT_REGISTRY_V100`. Les frappes debout actuelles incompatibles avec la chorégraphie source restent distinctes : moyenne de Feral ; moyenne et lourde de Scar. Aucun nouveau super, projection synchronisée, arme, état de victime, coût, dégât ou effet de combat n’est créé par la lecture des images.

Le lanceur Feral P10 réutilise les originaux V59 et le vrai identifiant `feral-guided-bolts-v58`. La bouche physique, les délais et les replays restent inchangés. Il s’agit de 4 dessins distincts par direction, même si plusieurs références de phase réemploient certains dessins.

L’étude 5H de Scar utilise désormais deux nouvelles pages alpha natives, pour éviter les franges magenta de son ancien recours V34. La page V34 originale et ses clips de duel restent inchangés ; la preuve remplacée, les références corporelles et les appuis des nouvelles pages sont conservés dans `art-source/v100/pit/scar/heavy-alpha/intake/reference-and-foot-review.json`. Le nouveau geste reste une étude de F7, sans liaison au heavy du duel actuellement nommé « Ascension au plasma ».

## Mesure des sources

`scripts/measure-pit-workbook-native-v100.mjs` lit le PNG avec Sharp sans réécrire ni corriger aucun pixel. Il cherche de vraies gouttières alpha par rangée puis, si nécessaire, par colonne. Une même ligne entièrement transparente peut servir de bord à deux rectangles ; aucun pixel visible ne peut être partagé. Les cellules sûres d’une page partiellement refusée sont conservées dans le rapport mais ne sont admises qu’après revue explicite. Le seuil alpha reste 2 ; une bordure alpha 3 n’est pas effacée pour faire passer une feuille.

```sh
node scripts/measure-pit-workbook-native-v100.mjs --source original.png --columns 3 --rows 4 --output mesure.json
```

La mesure distingue les candidats de pivot/hauteur de la référence corporelle approuvée. Les RGB cachés sous un alpha nul n’ajoutent pas de nouveaux dessins. Les originaux, prompts et motifs de refus restent dans `art-source/v100/pit` ; les copies publiques admises sont identiques octet pour octet aux originaux.

## Vérifications

`tests/pit-workbook-animation-v100.test.mjs` vérifie la provenance des 52 entrées source et les pixels de tous les nouveaux cycles admis : décodage des originaux, SHA des copies, rectangles sans bord, dessins distincts dans chaque sens disponible, échelle fixe et maintien de chaque dessin dans les deux Canvas avec une caméra constante par action. Il vérifie aussi la lecture sans mutation du duel, les vraies entrées accroupies et le saut réel avec les trois phases du genou aérien Feral avant réception. Les banques fabriquées, mauvais costumes/personnages, côtés absents et chargements annulés sont refusés. Les réemplois historiques conservent leurs pages, transparence et provenance propres. `tests/pit-workbook-measure-v100.test.mjs` vérifie les gouttières adaptatives, les bords, les croisements et la non-mutation des fichiers. Ces tests ne remplacent pas la revue anatomique de chaque nouvelle feuille.
