# Alien Base → La Longue Chasse : premier raccordement

**Source** : dépôt privé `darknigthmare/alien_base`, PR #4 `feat/alien-universe-registry-v1`, identités `bio.xenomorph.*` (ainsi que PR #3 complémentaire de recherche).

La V1 expose **six dossiers documentaires** de formes d'**Alien** et **Aliens** dans le bestiaire écologique. Les IDs sont alignés sur le registre commun ; les sources de film restent des URLs publiques. Rien n'est chargé depuis un dépôt privé par le navigateur.

Les six fiches sont explicitement `reference-only` avec `encounterId: null`. Elles ne débloquent ni ennemi, ni trophée, ni sprite, ni équipement, ni sauvegarde, et ne remplacent pas les 30 formes environnementales par planète. La distinction adulte 1979 / adulte 1986 est formulée comme **morphologie par film**, pas comme progression biologique imposée.

## Extension à prévoir

- Élargir aux ennemis AVP, aux hybrides, aux synthétiques, aux colonies et aux personnages après correspondance des médias et vérification primaire des sources.
- Ajouter une stratégie d'export versionné privé→public à partir des IDs du registre, puis établir l'aller-retour (proposition jeu→base) par PR de revue.
- Mettre en relation les éventuels adversaires de chasse uniquement après validation du niveau, du comportement, des sprites, des variantes et des sauvegardes. Le registre n'accorde pas de droits d'utilisation d'images licenciées.

## QA

`node --test tests/alien-base-archive-v1.test.mjs` est une vérification de contrat statique. Compléter avec `npm run typecheck` et un contrôle réel de l'écran avant de déclarer une intégration visuelle validée.
