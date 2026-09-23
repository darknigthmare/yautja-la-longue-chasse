# V46 — QA 3 : petit écran, clavier, tactile et mouvements réduits

Profil de test simulé : joueuse qui utilise uniquement le clavier, puis un écran tactile étroit, avec fatigue visuelle et préférence de mouvements réduits. Il s'agit d'un profil QA technique, pas d'un témoignage utilisateur ni d'une certification d'accessibilité.

## Défauts reproduits et corrections

| Surface | Avant, mesuré dans Chrome | Correction vérifiée |
| --- | --- | --- |
| Chargement d'un checkpoint | Échap renvoyait le focus à « Retour au menu » au lieu du checkpoint choisi. | Focus restauré sur le bouton exact qui ouvrait le dialogue. Le piège Tab / Maj+Tab existant reste actif. |
| Dialogue sur écran paysage 640 × 280 | Dialogue de 397,7 px, bord inférieur à 417,7 px, `overflow-y: visible` : actions hors écran. | Hauteur bornée à 240 px, défilement interne. Le bouton Confirmer est visible et réellement atteignable après défilement. |
| Remplacement manuel | Le focus restait dans la grille. Échap ne fermait pas la confirmation. | Focus initial sur Annuler ; Échap annule et restaure le focus au même emplacement manuel. Révision de sauvegarde et confirmation explicite conservées. |
| Préférence de mouvement dans THE PIT | Option du jeu activée mais système sans préférence : transitions de grille à 0,12 s. | La préférence du jeu désactive aussi ces transitions, mesurées à 0 s. |
| Ergonomie tactile | Bouton J1 à 31 px, pagination à 40 px et recherche à 42 px de hauteur. | Cibles concernées portées à au moins 44 px, comme les commandes de variantes déjà existantes. |
| Lisibilité des champs tactiles | Recherche à 11,2 px et variante à 10,88 px. | Champs et sélecteurs à 16 px sous `pointer: coarse`. Aucun débordement à 320 px. |

Les seuils 44 px et 16 px sont ici des choix ergonomiques : une cible de moins de 44 px n'est pas, à elle seule, une preuve de non-conformité normative. Le comportement de zoom automatique sur un iPhone physique n'a pas été certifié.

## Vérifications exécutées

- `node scripts/verify-accessibility-v46.mjs` : **13 vérifications navigateur réussies**, aucune erreur JavaScript. Composants React réels, esbuild, Chrome sans interface ; sauvegardes et callbacks métier isolés pour ne toucher à aucune partie réelle.
- Couverture : retour de focus, piège du dialogue, scroll paysage et actions atteignables, remplacement manuel, préférence de mouvement du jeu, dimensions tactiles, saisie, accès clavier après recherche, absence de débordement du roster, menu avec texte à 200 % sur écran 320 × 568.
- `node --test tests/accessibility-v46.test.mjs tests/campaign-menu-ui.test.mjs` : test navigateur reproductible plus contrôles des révisions et transitions de sauvegarde.
- ESLint ciblé sur les composants et scripts modifiés.

Preuves locales conservées sous `work/v46/accessibility/` : rapports avant/après, captures dialogue paysage, roster tactile et menu avec texte agrandi. Le premier rapport exploratoire contient aussi un faux échec `filtered-roster-keyboard-entry` : le test avait oublié le bouton Effacer dans l'ordre de tabulation. Son parcours a été corrigé (deux Tab) ; aucune correction produit n'a été attribuée à ce faux positif.

## Limites

Ce lot ne certifie pas un lecteur d'écran réel, toutes les combinaisons OS / navigateurs, une manette physique, le contraste de tous les décors ou une session complète de campagne. Le harness remplace les callbacks de stockage et les portraits de duel par des fixtures ; il vérifie les vrais composants et leurs vrais styles, pas l'ensemble de GameClient. Les vérifications du jeu assemblé, de la caméra, du prologue et de la publication relèvent des autres profils et du contrôle final.

## Recette complémentaire du jeu assemblé

`node scripts/verify-mobile-accessibility-v46.mjs` cible par défaut le serveur compilé `http://127.0.0.1:4174` ; `V46_MOBILE_QA_URL` permet de viser une autre adresse. Le script crée une nouvelle partie dans un contexte navigateur vierge, teste le menu au clavier, l'affichage du guide à 390 × 844, son focus et la conservation du choix réduit après pause. Un deuxième contexte isolé teste THE PIT, le bouton caméra au clavier puis au tactile, le retour de focus et la préférence système de mouvement réduit. Cette recette n'utilise pas le harness de composants. Les résultats exécutés sont conservés dans `work/v46/mobile-accessibility-qa/` ; sa préparation seule ne vaut pas validation.

### Résultat sur jeu compilé

Le 23 septembre 2026, `verify-mobile-accessibility-v46.mjs` a été exécuté sur `http://127.0.0.1:4174` : **4 parcours réussis, zéro erreur JavaScript ou HTTP**. La nouvelle partie utilise les vraies sauvegardes dans un contexte vierge, sans toucher aux données utilisateur.

Mesures à 390 × 844 : guide de 376 px de large, bouton 44 × 44 px ; préférence « réduit » conservée pendant une pause simple ; focus rendu au Canvas. Bouton caméra de 198 × 44 px, utilisable au clavier et au tactile, focus rendu au combat ; préférence système de mouvement réduit respectée. Captures du guide et de THE PIT inspectées visuellement. Le bandeau THE PIT présente un défilement interne de 26 px après cette navigation ; aucun débordement horizontal ni bouton caché. Le titre peut être retrouvé en remontant le conteneur, qui reste défilable.

Rapport intégré : `work/v46/mobile-accessibility-qa/report.json`. Captures : `guide-mobile.png`, `pit-camera-mobile.png` dans ce même dossier. Les limites de certification sur appareils physiques et lecteur d'écran restent inchangées.
