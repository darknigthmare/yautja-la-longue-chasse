# PHG — biomask en chasse et dreadlocks

La recette finale `attempt-3` passe **11 contrôles natifs**, avec **15 PNG ouverts** et **15 observations du vrai HuntCanvas**. Elle complète la recette de personnalisation `../phg/attempt-3` sur les critères exacts du classeur `Yautja_PHG_Implementation_Status_V137.xlsx`, feuille `Tests_Parcours` : T04 ligne 8 « Activer/retirer mask en chasse » et T13 ligne 17 « Bouger/viser/coiffer », raccord dreadlocks/anneaux.

Le parcours utilise le vrai GameClient Next, BuildID `RYl37_8hN58IOB8jDpRj1`, Chromium `154.0.8037.57`, URL locale `http://127.0.0.1:3122`. Les 1 268 fichiers d’application et de bureau gardent le SHA-256 collectif `ad31a6e3290f30d04991a2df7e9104b244338a27932745d64d30fa2441e8b8ad` avant/après. Les 51 réponses JavaScript servies, correspondant à 30 chemins distincts, correspondent octet pour octet aux fichiers de `.next`. Les cinq listes d’erreurs sont vides.

La fixture initiale est déclarée dans `initial-alpha-ogre.json` : campagne adulte par défaut, apparence Alpha, matière Ogre, pigment et quatre decals de clan originaux. Elle ne constitue aucune preuve d’acquisition. Le loadout adulte par défaut possède déjà le plasmacaster. La coiffure **Annelées est choisie dans la vraie interface**, puis enregistrée avant le départ réel via carte galactique, préparation et arrivée planétaire. Le bouton natif « Passer l’arrivée » termine cette seule cinématique ; aucun résultat de chasse n’est injecté.

En chasse, M retire/restaure le biomask et son rendu ; les captures avec visée montrent les faisceaux seulement quand le masque est porté. Le réticule manuel reste utilisable sans masque. Après les déplacements, les traces vertes visibles avec le masque disparaissent lors du retrait. Le contrat de rendu conserve la possibilité d’un scan actif distinct ; la recette ne prétend pas supprimer toute vision ou désactiver entièrement le caster.

Le coiffage, les changements de direction et la visée lisent les sept ressorts du vrai joueur et la banque d’images du vrai moteur. Le bitmap `ringed.webp`, avec ses anneaux dessinés sur la même mèche, est effectivement chargé. Les captures natives montrent le raccord à l’échelle offerte. La pause fige exactement l’horloge, les angles et les vitesses, et ignore M. Une reprise puis une suspension natives produisent le checkpoint sans masque. Après recharge, **Continuer entre directement dans la chasse suspendue**, puis le vrai bouton Reprendre permet de jouer ; le joueur reste sans masque jusqu’au nouvel appui M. Progression de missions et profil restent identiques : aucun succès, dégât ou récompense n’est fabriqué.

L’inspection utilise uniquement CDP `Runtime.getProperties` sur les `[[Scopes]]` des fonctions de refs React conservées, et des copies JSON en lecture seule. Aucun callback du jeu n’est invoqué, aucun état n’est écrit après la fixture initiale, aucune horloge ni méthode Canvas n’est interceptée. Les PNG Canvas proviennent directement de `toDataURL`, sans modification de pixels.

Les preuves sont séparées : `attempt-3/report.json` est le rapport navigateur brut inchangé ; `attempt-3/screenshot-inspection.json` décrit les 15 PNG réellement ouverts ; `attempt-3/final-receipt.json` consigne les empreintes vérifiées ; `renderer-contracts.json` fournit les chemins, lignes et SHA des sources corroborant le rendu. Ces contrats de source ne sont pas comptés comme des contrôles navigateur supplémentaires.

L’ancienne `attempt-1` est conservée : dix contrôles natifs réussis, sans la seconde reprise après recharge ; sa première comparaison de compteur visait un champ absent, ce qui est corrigé par l’égalité du vrai `missionProgress` et du profil dans la recette finale. `attempt-2` conserve l’échec d’un sélecteur de recette qui cherchait à tort un bouton de landing après Continuer, alors que l’application avait déjà ouvert la vraie chasse en pause. Cet échec ne constitue pas un défaut d’application. Les probes préliminaires sont hors dépôt dans `/workspace/p0p1-20261109/`.

La couverture T13 reste limitée à Annelées et à la morphologie classic Alpha dans les gestes échantillonnés. Aucune approbation artistique humaine, comparaison exhaustive PHG/UV 1:1, vue non offerte ou totalité des animations n’est certifiée. **T13 n’exige pas de manette physique.** T15, la session de 60 minutes avec 77 matières, fait l’objet d’une recette séparée.

Reproduction depuis la racine du dépôt, sur une build Next stable déjà lancée :

```sh
PHG_HUNT_QA_URL=http://127.0.0.1:3122 \
PHG_HUNT_QA_OUTPUT=outputs/phg-hunt-new-attempt \
/workspace/.cloud-tools/node22/node_modules/node/bin/node scripts/qa-phg-hunt-p0p1-20261109.mjs
```

Le répertoire de sortie doit être nouveau. `recipe-used.mjs` archive exactement la recette exécutée et son hash ; le script principal réutilise le helper de lecture seule `scripts/lib/qa-native-hunt-inspection-20261109.mjs`.
