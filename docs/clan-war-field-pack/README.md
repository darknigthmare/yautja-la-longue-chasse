# Props individuels et commandes — lot du 3 novembre 2026

Base de création : PR #78 / `29b5dd20d206d2ddc82aeef4cbfe546561d68d7a`. Le lot de la PR #100 est repris dans la consolidation des PR ouvertes ; les circuits, le second garde, les inspections Outer Ops et les verrous de sauvegarde des branches intégrées sont conservés.

## Livrable visuel exact
12 sprites DISTINCTS, chacun dans son propre SVG et PNG RGBA 512×512, avec dérivé WebP 256×256 : relais actif/coupé, balise active/éteinte, caisse fermée/ouverte, barricade intacte/endommagée, générateur actif/éteint, mallette médicale garnie/vide. Six objets originaux, deux états chacun. Pas douze personnages ni douze animations.

Ces assets sont dessinés de manière procédurale en vectoriel, avec palette/angle constants. Ils constituent des PROTOTYPES originaux de production, et NON des extractions de films, NON des sprites canoniques certifiés 1:1, NON des découpes d'une planche. La génération d'images illustratives initiale a produit des posters non conformes ; tous sont rejetés. Les chiffres et mentions de complétude contenus dans ces posters ne sont pas des résultats vérifiés. Aucun de ces posters n'est un asset du jeu.

## Intégration dans les interfaces
- Assaut : illustration du bastion suivant l'état réel de protection, sans nouvel obstacle.
- Outer Ops : illustration de la logistique, sans nouvelle cargaison ou ressource.
- Infiltration : vrai relais et vraie sortie seulement, pas de positions de gardes révélées.
- RTS W133 : observation, extraction, état d'électricité ; zoom de carte 75–300 % et positions des marqueurs proportionnelles.
- Médecine : illustration de traitement en cours/vide, aucun soin automatique.
- Clavier AZERTY/QWERTY/flèches pour infiltration et RTS W133 ; E interagir, Espace attendre. Une pression = un ordre ; répétitions, IME, raccourcis système, champs éditables et boutons sont ignorés. L'infiltration passe par le commit V115 sous verrou existant. Aucun raccourci de repli destructeur.

## Pipeline
Les douze sprites et leurs dérivés sont déjà committés. La consolidation les conserve sans les régénérer. La CI vérifie ces fichiers et les interfaces telles qu'elles sont versionnées : empreintes, alpha et marges, commandes, typage, lint, interactions clavier/zoom et sauvegardes à deux onglets sous Chromium. Son jeton est limité à `contents: read`, les identifiants Git ne sont pas conservés et aucun commit ou push n'est exécuté.

`node scripts/build-clan-field-pack.mjs` reste un outil manuel de reproduction des fichiers séparés et de leurs empreintes ; `--svg-only` ne construit que les sources vectorielles. `node scripts/apply-clan-field-ui.mjs` conserve le patch initial idempotent : il refuse les ancres absentes ou multiples et ne réécrit pas une interface déjà marquée. Aucun de ces deux outils ne s'exécute dans la CI de vérification.

Le zoom définit la largeur et la hauteur affichées du SVG ; la règle responsive générale ne peut plus les ramener à 100 % du conteneur. Le harnais `scripts/qa-clan-field-20261103.mjs` compare les dimensions rendues et l'état du jeu, puis vérifie les commandes dans les vrais composants. Ces assertions ne constituent une preuve navigateur qu'après leur exécution réussie avec Chromium. L'environnement local de consolidation ne dispose pas de ce navigateur ; la qualification navigateur reste donc à exécuter en CI.

## Vérification locale de consolidation

La reprise de `7479e5c1ce2707e74cc902d65b98158b7774f6aa` sur l'intégration clans a passé 456 tests Node dans 82 fichiers, sans échec ni test ignoré, dont les cinq tests du pack. Les 36 empreintes SVG/PNG/WebP correspondent au manifeste committé. Le typage ciblé et le lint passent ; `node scripts/qa-clan-field-20261103.mjs --bundle-only` compile les deux composants de production et leurs styles sans lancer de navigateur. Ce dernier résultat n'est pas une validation d'interaction ni une acceptation artistique.

## Limites maintenues
Pas de personnage ou équipement cinématographique 1:1 homologué. Pas de campagne persistante achevée, de serveur multijoueur ni de 1 200 niveaux complets. Pas de déploiement affirmé. Les contrôles manette physique, performance Next complet et acceptation artistique demeurent ouverts. Les images de release fictive ne valent ni preuve de test ni preuve de développement.
