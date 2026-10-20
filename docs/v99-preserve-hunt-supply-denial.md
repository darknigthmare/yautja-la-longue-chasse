# V99 — Preserve Hunt : dépôts et récupération des porteurs

La chasse de Vharuun dispose d’une seconde manière de contrarier la préparation des deux évasions : neutraliser les lots encore aux dépôts et surveiller les survivants qui récupèrent les composants des porteurs abattus. Les composants suivent un trajet physique ; un abattage ne suffit plus à immobiliser définitivement le lot transporté.

Les identifiants du suivi consolidé sont `PRESERVE-V99-DEPOTS` et `PRESERVE-V99-RECUPERATION`. Cette évolution prolonge la demande Preserve Hunt documentée dans [la livraison V66](v66-game-reserve-delivery.md), discussion « Répartition des joueurs Predator » `6aa9eb58-e760-83eb-8098-e735f1d01161`, et [l’interception V98](v98-preserve-hunt-interceptions.md). Les détails de cette boucle logistique sont une proposition originale d’implémentation ; ils ne sont pas attribués à une ligne des classeurs historiques ou au canon de la franchise.

## Actions jouables

Les huit dépôts existants commencent chacun avec deux lots. Au sol, à moins de 45 unités d’un dépôt approvisionné, maintenir **Interagir** pendant 120 ticks de simulation, soit 2 secondes, rend un lot inutilisable. Le chasseur doit rester exposé et immobile. Un mouvement, une blessure, un relâchement ou la perte de portée annule le canal. La pause n’avance pas le travail. Un deuxième canal complet peut neutraliser le second lot ; un dépôt vide ne propose plus cette action.

La neutralisation concerne uniquement le lot encore au dépôt au moment de l’achèvement. Si un survivant emporte le dernier lot pendant ce tick, le canal s’annule sans neutraliser sa cargaison. Les pièces présentes sur les porteurs et dans les appareils restent utilisables. Le départ et son interception V98 conservent leur ordre de résolution ; une prise à la rampe ne masque toujours pas l’interruption d’un décollage en cours.

Un survivant sans cargaison, dont l’appareil manque encore de composants, peut découvrir le lot d’un porteur abattu de son propre groupe. La découverte exige une distance maximale de 180 unités et une ligne de vue réelle. Les dépôts connus et les corps non découverts ne lui donnent pas de renseignements à distance. Un seul récupérateur réserve le même corps à la fois.

Le récupérateur rejoint le corps à pied, au plus à 0,95 unité par tick. À 12 unités au maximum, il travaille pendant 90 ticks, soit 1,5 seconde. Une menace observée ou une blessure annule ce travail, y compris un projectile qui touche pendant la dernière frame. Un allié peut ensuite le reprendre à zéro. La mort du récupérateur ne transfère rien. L’achèvement déplace le lot du corps vers le survivant ; celui-ci doit ensuite le porter jusqu’à son appareil.

L’identité, la mort, les blessures et le statut de prise sécurisée du porteur restent inchangés. Le prélèvement et le composant sont deux faits distincts : un corps déjà sécurisé peut encore conserver son lot tant qu’aucun survivant ne l’a récupéré. Un appareil qui possède déjà quatre lots ne fait plus disparaître la cargaison d’un retardataire ; celui-ci la conserve, y compris pendant l’embarquement et le départ.

## Interface

Le repère de terrain affiche « Neutraliser un lot du dépôt », la touche configurée et la progression réelle. Les repères fonctionnels existants montrent les lots restants, les neutralisations effectuées et, pour un récupérateur actuellement visible, son approche ou sa progression. Ces repères ne constituent pas de nouveaux assets natifs.

Le carnet ajoute une rubrique **Dépôts de composants**. Le nombre restant n’est visible qu’au sol, à portée du dépôt ; à distance il reste « réserve non inspectée ». Les lots neutralisés par le chasseur restent consignés. Les contacts visibles peuvent annoncer une récupération, avec un nom seulement si l’observation de leur rôle avait été achevée. Le carnet ne révèle ni un corps éloigné, ni l’identité d’une proie non identifiée, ni un suivi permanent du récupérateur.

Les attributs utilisés par la recette navigateur sont `data-reserve-interaction="cache"`, `data-reserve-next-action="cache"`, `data-reserve-cache`, `data-cache-inspected`, `data-reserve-contact` et `data-contact-recovering`.

## Sauvegardes et conservation

La version reste `1`, avec la même réserve `vharuun-first-expedition`. Les anciens documents restent lisibles exactement, sans ajouter de champs lors de la normalisation :

- `deniedSupplies?: number[8]` est créé lors de la première neutralisation. Chaque entier est compris entre 0 et 2 ; lots restants et neutralisés d’un même dépôt ne peuvent pas dépasser son stock initial de deux.
- `humans[].recovering?: { bodyId: string; ticks: number }` décrit une tâche locale en cours, avec progression de 0 à 89. Le récupérateur et le corps doivent avoir les identités canoniques de cette expédition, appartenir au même groupe et satisfaire les conditions de distance, visibilité et statut. Deux tâches ne peuvent réserver le même corps. Une progression positive exige d’être déjà à portée de travail.
- Le canal `cache` cible un dépôt de 0 à 7 et conserve de 0 à 119 ticks avant achèvement. Les reçus d’interception et de sortie de rampe V98 sont conservés.

Le total matériel est la somme des stocks des huit dépôts, des lots portés par les huit personnes quel que soit leur statut, des pièces des deux appareils et des lots neutralisés. Une nouvelle expédition possède seize lots. Le garde de progression exige le même total entre deux checkpoints, même s’ils couvrent plusieurs phases ou plusieurs centaines de ticks. Il refuse un gain de lot, une disparition nouvelle, un stock recréé, un fait de neutralisation effacé ou réécrit et les régressions historiques déjà interdites.

Les anciens checkpoints ont parfois un déficit issu de l’ancienne livraison à un appareil déjà plein. Le normaliseur ne leur impose pas rétrospectivement seize lots et n’en invente pas pour les réparer. Leur total hérité doit être conservé par toutes les nouvelles étapes. Les validations suivent le contrat de faits structurés du jeu ; elles ne sont pas une authentification cryptographique de documents modifiés manuellement.

Les imports de campagne, les slots manuels et les archives intégrales conservent à la fois les neutralisations et une récupération en cours. Le profil libre utilise son espace de stockage séparé existant. Aucune récompense de campagne, rang, honneur, arme ou entrée de collection n’est attribué.

## Validation et limites

Sous Node 22, les **40 tests ciblés ont réussi** : 26 régressions Preserve V66/V98, 9 scénarios complémentaires V99 et 5 scénarios de revue indépendante. Ils exercent les huit dépôts, les interruptions, la visibilité, les limites de distance, deux récupérateurs concurrents, un corps sécurisé, une mort sur la dernière frame, une blessure non létale sans révélation du chasseur caché, les appareils pleins, les anciens déficits, les checkpoints espacés, le rendu des huit cibles et les archives.

```sh
node --test \
  tests/game-reserve-v66.test.mjs \
  tests/game-reserve-campaign-slots-v66.test.mjs \
  tests/game-reserve-tactical-v98.test.mjs \
  tests/game-reserve-interception-review-v98.test.mjs \
  tests/game-reserve-supply-denial-v99.test.mjs \
  tests/game-reserve-logistics-review-v99.test.mjs
```

La recette navigateur V99 est suivie séparément par `scripts/qa-three-modes-v99.mjs`. Elle distingue le déplacement naturel depuis le menu et les scénarios aux limites initialisés par un checkpoint validé. Les captures et rapports, lorsqu’ils sont produits, se trouvent dans `outputs/qa-three-modes-v99/`. La réussite des tests de simulation ci-dessus ne déclare pas cette recette navigateur, la publication ou le déploiement terminés.

Le contenu reste une première sortie de **3 secteurs sur les 80 proposés**, avec **8 combattants sur les 100 fiches source**. Il n’y a pas de nouveau secteur, de portrait ou d’animation native. Les personnages et lieux sont originaux ; le chasseur conserve son dessin natif tenu et les humains leurs trois atlas existants. Les autres réserves, l’art absent, les rivaux, les contrats de clan et le multijoueur restent des chantiers distincts.
