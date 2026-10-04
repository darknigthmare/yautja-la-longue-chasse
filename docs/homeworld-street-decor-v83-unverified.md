# Homeworld V83 — façades et décors extérieurs, livraison non vérifiée

Cette note décrit les changements de source effectivement écrits. Sur demande explicite de l’utilisateur de publier sans vérification, aucun test, audit de contraintes, lint, compilation, navigateur ni contrôle de production n’a été exécuté pour ce lot. La lecture des PNG originaux a servi à l’authoring des pivots et contacts ; ce n’est pas une validation visuelle du jeu.

## Huit façades fermées

Les huit anciens IDs `urban-v78:<parcelle>:facade` sont conservés. Ils utilisent maintenant huit dessins natifs existants distincts, au lieu du petit ensemble de façades frontales de remplacement. Il ne s’agit ni de huit nouvelles sources générées, ni de huit nouveaux bâtiments visitables.

| Parcelle conservée | Source native réemployée | Fonction locale |
| --- | --- | --- |
| lower-shelter-west | clan-residence-left V81 | logement des galeries |
| lower-exchange-north | dock-control V76 | relais des registres d’échanges |
| lower-work-north | convoy-workshop V76 | atelier de réglage |
| lower-shelter-east | industrial-residence-right V81 | logement des artisans de relève |
| lower-halt-west | ancienne rite-sanctum V76 | halte rituelle fermée |
| lower-stock-east | convoy-store V76 | dépôt oriental |
| lower-work-south | rampart-watch V76 | vigie technique |
| lower-rest-south | trophy-mausoleum V76 | mémorial de la cour commune |

Le provider pur `homeworldUrbanFacadePlansV83.ts` définit les implantations, proportions de lot, sources et fonctions. La taille uniforme est calculée à partir du vrai segment de fondation et de l’ouverture native déprojectée pour une convention minimale adulte de 128 unités de haut et 80 de large. Une petite parcelle historique ne réduit donc pas automatiquement le personnage ou la porte peinte. Les réserves de parcelle suivent la coque native complète. Il n’y a aucune rotation ou symétrie CSS du dessin.

Le rendu, la collision et les fiches du codex consomment ces mêmes façades. Elles restent fermées, solides et non interactives. Les 43 IDs de bâtiments visitables, leurs portes actives, intérieurs, checkpoints, services et découvertes sauvegardées ne sont pas remplacés par ces décors. Ces nouveaux lots n’ont pas été vérifiés : l’appui complet, la respiration entre voisins, les perspectives et la circulation doivent encore être appréciés dans le jeu. Des variantes architecturales propres à chaque district restent nécessaires.

## Cinq nouveaux dessins, douze candidats extérieurs

Les cinq PNG natifs OpenAI proviennent du registre `homeworldStreetDecorSourcesV83.json`, détenu par le lot d’intégration des images. Leurs dimensions et SHA sont conservés dans ce registre et les prompts/receipts dans `docs/homeworld-native-prompts-v83.json`.

- Comptoir marchand oblique, avec face client vers le sud-ouest observée dans le dessin.
- Établi de forge, avec face de travail vers le sud-ouest observée ; le nom de fichier « right » ne prouve pas l’angle du comptoir.
- Rack logistique, face de manutention ouverte vers le sud-est.
- Jardinière basaltique, réservée à des poches abritées de repos et de mémoire.
- Borne clanique entière, version corrigée ; le premier dessin au sommet coupé reste conservé hors du runtime.

Un établi ou comptoir avec accessoires déjà fusionnés est un seul sprite source. Les consoles, contenants, braises ou feuilles contenus dans ce dessin ne sont pas comptés comme autant de nouveaux PNG indépendants. Les cinq sources sont préchargées dans le Hub. Les deux réemplois intérieurs au marché et à la forge relèvent du lot d’intérieurs V83.

`homeworldStreetDecorPlacementV83.json` contient douze candidats authored, répartis entre marché, forge, quais, convoi, clans, archives et quartiers bas. Ils n’utilisent ni une grille d’offsets identiques autour des portes, ni une recherche de position automatique. Leurs rôles sont différents : échanges, travail chaud, stock, halte et repère de quartier. Aucun nouveau service ou marchand interactif n’est inventé.

`homeworldStreetDecorV83.ts` partage l’art, le pivot, les contacts source, leur déprojection unique, les polygones physiques et les faces d’usage entre rendu, collision, intérieurs et codex. Ces contacts sont des mesures d’authoring conservatrices, pas une calibration de la caméra 3D. Les marges sociales déclarées restent descriptives ; elles ne constituent pas une certification de l’usage humain.

À l’initialisation du véritable World, une politique de placement refuse un candidat exact qui empiète sur une réserve de porte, voie, routine, raccord, coque, parcelle ou mobilier existant, ou dont les contacts/usages manquent d’appui. Ce mécanisme ne déplace ni ne réduit la source pour la faire entrer. La collision du candidat actif emploie son vrai polygone ; sa face d’usage reste libre, sans devenir un collider invisible.

**Le nombre accepté et visible n’est pas certifié.** Douze candidats écrits ne signifie pas douze objets montés. Aucun import d’exécution, calcul de bilan runtime ou contrôle visuel n’a été lancé pour établir ce nombre. Les candidats refusés restent documentés dans un espace `authoring:street-v83`, sans empreinte de monde ni marqueur de navigation. Le codex distingue explicitement les objets actifs et les candidats non montés.

## Autres branchements de ce lot

`HomeworldWorldSceneV77.tsx` reçoit l’état local de station de l’ascenseur via `liftStateV83` et le passe au helper de placement de la cabine. L’état non restauré vaut null pour éviter une apparition à un étage arbitraire. Les appels à vide et la sauvegarde de station sont gérés par le lot de l’ascenseur, pas par les décors extérieurs. Les PNG et le mouvement de transit existants restent conservés.

Le panneau `homeworldCivicArchitectureV80.ts` inclut les deux `nativeProps` des complexes publics V83 dans son inventaire d’intérieur ; il ne les transforme pas en nouveaux dessins sources ou services. `homeworldUrbanCodexV78.ts` remplace ses mentions devenues obsolètes de façades frontales temporaires par le vrai statut de réemploi oblique V83. `homeworldStreetDecorCodexV83.ts` doit être agrégé après le mapper des placements historiques, car ses coordonnées de monde et élévations sont déjà celles du modèle final.

## Limites conservées

Les architectures, institutions de quartier, végétaux et marques de clan présentés sont des adaptations originales compatibles avec la direction du projet, pas des reproductions canoniques 1:1. Une feuille dessinée ne prouve pas une espèce de Yautja Prime ; les marques de la borne ne prouvent pas l’emblème officiel d’un clan connu. Il n’y a aucun nouveau clip multiframe dans ces cinq sources.

L’audit V81 de 13 266 contraintes et ses 29 avertissements appartiennent au snapshot antérieur. Ils ne sont pas un résultat sur les implantations V83. Les 354 besoins du catalogue d’assets restent des besoins inventoriés : ce lot ne les déclare pas tous produits, animés ou fidèles 1:1. La densité de toute la ville, les variantes d’architectures, animations civiles, appuis et accès de ces nouvelles parcelles, esthétique en jeu, cohérence du lore et sauvegardes interappareils restent des chantiers ouverts ou non validés.
