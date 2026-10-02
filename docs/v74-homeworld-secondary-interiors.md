# Homeworld V74 — les 37 intérieurs secondaires

Les 13 lieux civiques secondaires et les 24 logements ont maintenant des plans fonctionnels propres. Ils complètent les six ailes publiques V73, qui restent identiques octet pour octet dans le modèle. L’ensemble conserve les 43 façades, leurs dimensions, leurs seuils et les 15 points d’interaction intérieurs existants. Aucun service, objet collectable, rang ou soin n’est créé par la visite.

## Conception et références

Le [guide officiel RPG Maker sur les intérieurs](https://rpgmakerweb.com/blog/tutorial-mapping-interior) relie la fonction des lieux, la disposition du mobilier et la cohérence intérieur/extérieur. Les plans V74 suivent cette règle : les réserves n’ont pas la disposition des lieux de repos, les bureaux n’utilisent pas un atelier arbitraire et les meubles restent devant les parois. Les dimensions utiles retirent toujours 32 unités aux enveloppes extérieures existantes ; aucun logement n’est agrandi artificiellement.

Le [guide officiel RPG Maker sur les villes](https://www.rpgmakerweb.com/blog/mapping-towns) conseille de relier la composition du lieu à son usage et à sa desserte. Ici les fonctions varient selon le quartier : inspection des convois aux quais, pièces et maintenance près des ateliers, halte et observation aux remparts, consultation dans le mausolée. Les portes extérieures restent celles déjà validées sur le réseau de rues.

Ces références concernent la conception des niveaux. **La ville, ses logements, son mobilier et ses usages sont des adaptations originales du projet.** Aucun plan domestique, modèle familial, rite universel ou institution canonique yautja n’est déduit de ces guides. Les descriptions et les fiches du codex le disent explicitement.

## Plans et mobilier réels

Les plans utilisent sept organisations : cloison latérale avec ouverture, cloison transversale avec ouverture, écran court ouvert en bout, deux travées latérales ouvertes, deux espaces avant/arrière ouverts, trois travées ouvertes et dépôt à trois réserves donnant sur une galerie. Ils ne reproduisent pas le même foyer à trois zones dans les 37 bâtiments.

Les lieux civiques comprennent un bureau et une inspection aux quais, la halle d’échanges, le refuge du témoin, la galerie du mausolée, les preuves et dépositions des veilleurs, l’admission et la préparation THE PIT, un sanctuaire, l’atelier des convois, leur dépôt, la halte sud et trois relais/postes des remparts. Les maisons distinguent alcôves de repos, petites salles communes, préparation, réserves, bancs, parures et postes de travail du foyer. Les variantes historiques repos/repas/stockage restent enregistrées, sans introduire de nouveaux services domestiques.

Le lot comporte **80 zones visitables, 47 parois basses solides, 29 passages et 153 meubles natifs indépendants**, plus la console d’observation V64 conservée. Le kit OpenAI V72 est réutilisé sans modifier ses pixels : `public/game/homeworld/v72/civic-furniture-kit.png`, SHA256 `dd9193612dff71ddbe1a65c74ef5c55cd10a4202cabf08746ec94195a825a844`. Chaque meuble garde sa cellule, son pivot avant au sol et une seule échelle uniforme. Les coordonnées des plans et collisions restent sur le sol non projeté ; le rendu applique la projection à 35° une seule fois.

Les 346 nouvelles fiches V74 décrivent exactement chaque plan, zone, paroi, passage et meuble. Les huit supports muraux historiques du mausolée restent distincts des trophées : seuls les trophées réellement acquis dans la sauvegarde sont affichés. Caisses, contenants et établi du foyer restent du décor.

## API et intégration

`HOMEWORLD_INTERIORS_V64` applique `homeworldSecondaryInteriorV74` après le transformateur des six ailes V72, avant la normalisation des anciens props. Aucun changement du déplacement dans `HomeworldHub` n’est requis. Les dimensions, spawns, sorties et IDs des services sont conservés. `room.secondaryLayoutV74` expose la version, l’identité du plan, sa fonction, le statut de lore original et les passages réels ; `room.zones`, `room.partitions` et `room.furniture` sont consommés par les renderers et collisions existants.

`HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74`, dans `homeworldSecondaryInteriorCodexV74.ts`, s’ajoute au collecteur du codex. Les fiches des six ailes précédentes sont filtrées par leurs six identités pour éviter d’attribuer à ces nouveaux plans les contraintes historiques de trois zones et deux ouvertures de 112 unités.

`node scripts/export-homeworld-secondary-interiors-v74.mjs` exporte sous `work-local/v74/interiors/plans.json` les 37 modèles, tous les pivots, cellules et emprises, leurs fiches et les statistiques mesurées. Le chemin se règle avec `V74_INTERIOR_EXPORT_DIR`.

## Vérifications et limites

Les 40 nouveaux tests contrôlent les 37 plans par recherche de chemins sur la vraie collision, avec l’empreinte du protagoniste augmentée de quatre unités sur chaque demi-axe. Chaque segment de quatre unités est échantillonné à une unité, sans passage diagonal au travers des coins. Toutes les zones doivent contenir le corps entier, les passages doivent être réellement libres, les meubles accessibles et intégralement dans les murs, sans chevaucher parois, preuves ou habitants. Les tests vérifient aussi le rendu SSR des cellules natives, les fiches dérivées, les huit supports du mausolée et l’absence de trophée non acquis.

La régression ciblée de six fichiers passe **114 tests** : ce lot, les 43 intérieurs, les six ailes V73, les murs natifs, la géométrie et les parcours extérieurs. Les modèles des six ailes V73 conservent le SHA256 `6d5505a37371b33034f46c8523e639ae6a7a7a41867747b24b3e773eae563ce0`. Quatre passages domestiques trop serrés détectés avec la marge supplémentaire ont été corrigés par déplacement de mobilier et ajustement d’une ouverture intérieure, sans exemption de collision.

La dernière passe sur la source figée réunit ces 114 tests et les huit tests du préchargement natif : **122/122**, log `work-local/v74/model-final-qa.tap`. ESLint ciblé passe également pour les composants, le hook, les recettes et leurs tests.

La recette `verify-homeworld-secondary-interiors-v74.mjs` a passé le build V74 final local : **42 contrôles, 40 captures**, les 37 seuils, 80 zones, 29 passages et les dialogues existants parcourus par de vraies touches, puis mobile, pause, codex et SHA du PNG servi. Le rapport complet est `work-local/v74/qa/secondary-interiors-local/report.json`. Aucune erreur JavaScript ni réponse HTTP en échec n’a été observée dans cette recette. Il ne s’agit pas encore d’une validation de la publication : l’URL testée est `http://127.0.0.1:4192`. Variables : `V74_INTERIOR_QA_URL`, `V74_INTERIOR_QA_OUTPUT`, `YAUTJA_QA_EXPECTED_VERSION`.

Les légendes des zones sont bornées à leur largeur utile, limitées à deux lignes et placées au nord de la bande de sortie. Cette correction de typographie s’applique aussi aux six ailes précédentes, sans changer leurs modèles. La recette vérifie les boîtes DOM réelles : chaque légende reste dans le sol projeté et ne recouvre pas « VERS LA CITÉ ». Sur mobile, la lisibilité porte sur les limites alpha peintes du sprite Unblooded natif ; son wrapper ne représente qu’un pivot au sol et n’est pas un gabarit de personnage.

Sur le portrait 393×852, le personnage peint mesure 78,71 pixels de haut et reste entièrement dans le viewport. La pause garde identiques la position, l’horloge de cité et les octets de la sauvegarde ; le codex consulté reste également sans modification durable. Les captures finales de l’atelier, du bastion des veilleurs, du mausolée et du logement mobile ont été relues visuellement. Un premier rapport candidat avait échoué sur une mesure du wrapper au sol ; ce problème de recette a été corrigé en mesurant le sprite et ses limites alpha, sans modifier la caméra ni le personnage.

`V74_INTERIOR_QA_IDS` permet un diagnostic limité à des identités explicites ; le rapport est alors marqué `PARTIAL_DIAGNOSTIC`, jamais comme la recette complète des 37 pièces. `V74_INTERIOR_QA_CAPTIONS=false` n’est destiné qu’à comparer un ancien build candidat sans le correctif typographique. La validation finale doit laisser ce contrôle actif.

Ce lot ne génère pas de nouveaux cycles de marche civils, de population domestique supplémentaire, d’étages privés, de quête ou de nouveau mobilier bitmap. Le kit natif et les anciennes sources restent conservés. Les chambres visibles composent le niveau accessible de chaque bâtiment, sans prétendre simuler tous les étages ou toute la vie privée de la cité.
