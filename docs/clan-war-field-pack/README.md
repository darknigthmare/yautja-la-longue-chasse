# Props individuels et commandes — lot du 3 novembre 2026

Base inspectée : PR #78 / `29b5dd20d206d2ddc82aeef4cbfe546561d68d7a`. Aucun merge de branche parallèle et aucun changement de la PR gauntlet.

## Livrable visuel exact
12 sprites DISTINCTS, chacun dans son propre SVG et PNG RGBA 512×512, avec dérivé WebP 256×256 : relais actif/coupé, balise active/éteinte, caisse fermée/ouverte, barricade intacte/endommagée, générateur actif/éteint, mallette médicale garnie/vide. Six objets originaux, deux états chacun. Pas douze personnages ni douze animations.

Ces assets sont dessinés de manière procédurale en vectoriel, avec palette/angle constants. Ils constituent des PROTOTYPES originaux de production, et NON des extractions de films, NON des sprites canoniques certifiés 1:1, NON des découpes d'une planche. La génération d'images illustratives initiale a produit des posters non conformes ; tous sont rejetés. Les chiffres et mentions de complétude contenus dans ces posters ne sont pas des résultats vérifiés. Aucun de ces posters n'est un asset du jeu.

## Intégration prévue par le patch exact et idempotent
- Assaut : illustration du bastion suivant l'état réel de protection, sans nouvel obstacle.
- Outer Ops : illustration de la logistique, sans nouvelle cargaison ou ressource.
- Infiltration : vrai relais et vraie sortie seulement, pas de positions de gardes révélées.
- RTS W133 : observation, extraction, état d'électricité ; zoom de carte 75–300 % et positions des marqueurs proportionnelles.
- Médecine : illustration de traitement en cours/vide, aucun soin automatique.
- Clavier AZERTY/QWERTY/flèches pour infiltration et RTS W133 ; E interagir, Espace attendre. Une pression = un ordre ; répétitions, IME, raccourcis système, champs éditables et boutons sont ignorés. L'infiltration passe par le commit V115 sous verrou existant. Aucun raccourci de repli destructeur.

## Pipeline
`node scripts/build-clan-field-pack.mjs` construit les fichiers séparés et leurs empreintes. `--svg-only` ne construit que les sources vectorielles. `node scripts/apply-clan-field-ui.mjs` refuse les ancres absentes ou multiples et ne réécrit pas une interface déjà marquée. La CI construit et teste avant de commiter UNIQUEMENT les assets de ce pack et les deux interfaces explicitement ciblées dans cette branche. Elle ne force jamais le push et ne fusionne aucune PR.

## Limites maintenues
Pas de personnage ou équipement cinématographique 1:1 homologué. Pas de campagne persistante achevée, de serveur multijoueur ni de 1 200 niveaux complets. Pas de déploiement affirmé. Les contrôles manette physique, performance Next complet et acceptation artistique demeurent ouverts. Les images de release fictive ne valent ni preuve de test ni preuve de développement.
