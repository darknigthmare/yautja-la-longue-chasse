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

## Raccordement Yautja ajouté depuis les mises à jour d'Alien Base

Le registre canonique central a évolué à **580 fiches et 1 546 correspondances**, puis a été réconcilié avec le catalogue initial de la branche `main`. La PR dépendante #8 intègre désormais le roster réel de `HUNTER_PRESETS` : **53 fiches** documentaires, dont **6 identités** et **5 modèles d'équipement** vérifiés comme correspondants au niveau de leur nom et de leur oeuvre.

Le fichier `alienBaseYautjaBindingsV1.ts` expose les six liens documentaires et cinq objets de l'arsenal commun, sans créer d'alias pour les 47 autres chasseurs ni pour les quatre termes d'équipement ambigus. `CatalogueHunterBrowser` indique cette correspondance lorsque le preset effectivement associé existe. Les entrées de catalogue sans preset ne reçoivent **aucun lien deviné**.

**Aucun** changement d'ID de sauvegarde, de sélection de personnage, de profil de combat, d'atlas ou de condition d'accès. Les liens servent à retrouver des sources et à éviter de refaire les fiches de référence dans d'autres jeux, pas à certifier un modèle 1:1.
