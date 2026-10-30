# V128 — Exiled Marbled/Bronze et finitions de plateformes

## Preuves (octobre 2026)

- **Exiled** : une capture de l'écran de personnalisation montre « EXILED / Marbled/Bronze », mais la coche d'équipement reste sur Elder. Elle confirme **le libellé de l'option prévisualisée**, pas le fait qu'elle soit la « nouvelle teinte » du patch 2.39. https://forum.predator.illfonic.com/t/predlocks-elder/27425
- **Patch 2.39** (19 avril 2022) : ajout d'une teinte de predlocks Exiled et correction d'un chevauchement des finitions Exiled Platinum / Steam dans la grille. https://forum.predator.illfonic.com/t/patch-notes-2-39/27316
- **Steam Exclusive** : un joueur décrit le passage du camouflage désert brun vers un métal clair proche Platinum. La couleur précise varie selon le patch. https://forum.predator.illfonic.com/t/what-happened-to-the-steam-exclusive-shader-and-why-not-for-the-masks/26467
- **Epic/PlayStation Exclusive** : présence et bugs de disponibilité relevés pour différentes classes/plateformes ; les couleurs métalliques de notre étude restent **inventées et approximatives**. https://forum.predator.illfonic.com/t/predator-customization-bugs-and-missing-stuff-as-of-patch-2-20/22242
- **Erreur corrigée** : le patch officiel **2.19** range **Ogre** dans les *Predator Mask Tints* de l'**Alpha Predator**. L'ancien ticket `armure_v2_ogre_pending` conserve son identifiant historique, mais son type canonique devient `biomask`. Il **n'est pas** ajouté aux armures. https://forum.predator.illfonic.com/t/patch-notes-2-19/20975

## Intégration

Les quatre matières V128 sont des **études originales de reconstruction**, intégrées aux calques **dreadlocks** (une) et **armure** (trois) de la PR #27. Elles sont représentées par un atlas WebP 1024 × 1024 (2 × 2), situé à `public/game/assets/v128/phg-platform/atlas.webp`, SHA-256 `7ea43242987fe99abaae5cbe884ce7f428be586543f48fd9221fcd197654933a`. Les mêmes réglages sont utilisés dans la prévisualisation et dans le Canvas de chasse, avec le masque d'origine 256 × 384 et la sauvegarde par identifiant autorisé.

Le pack Drive `PHG_V128_Platform_Materials_Studies.zip` contient des PNG et WebP indépendants, des aperçus ainsi que des normales/rugosités approximatives pour traitement futur. Ne pas les présenter comme des données **UV/PBR extraites** ou certifiées **1:1**. Les 34 dossiers antérieurs restent ouverts, et les utilisateurs peuvent choisir librement les études comme *interprétations*, indépendamment des niveaux/déblocages originaux de PHG.

Le masque Ogre nécessite un futur système de pigmentation de **biomask** séparé, avec masque et pièce d'équipement propres ; aucune décoration corporelle ou armure ne doit employer cette teinte par erreur.
