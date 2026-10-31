# V140 — Consolidation des index et des anciens manifestes

Ce correctif est ajouté directement à la PR #39 sans fusionner de branches.

## Superficies V125 / V136 cohérentes
Dans l'ancien index physique, la propriété `percentageOfLand` divisait la somme **brute** des territoires d'une région par l'aire terrestre **nette** de toute la planète. Elle pouvait donc totaliser plus de 100 % en présence de lacs ou de chenaux. Cette propriété repose désormais sur les parts de terre nette estimées de V136, normalisées sur le même ensemble de régions. Le champ `projectedAreaKm2` conserve explicitement son sens historique : aire cartographique **brute** des polygones. Aucune surface ni ressource de partie n'est réécrite.

## Les 48 matières réellement traçables à l'export
Le manifeste ZIP V124 gardait les **32 matériaux V125** dans `supplementalMaterialCatalog`, mais ne mentionnait pas les **16 matériaux V130** supplémentaires, pourtant utilisés par l'éditeur. Pour préserver les consommateurs du schéma historique, on conserve les 32 entrées exactement dans l'ordre initial et on ajoute un tableau `supplementalMaterialAdditionsV130` de 16 nouvelles sources, avec leurs cinq canaux PBR et identifiants originaux. L'union des deux catalogues a exactement 48 identifiants distincts.

Tests du module et du navigateur étendus : intégrité V125/V136, absence de doublons et catalogues stables. Le filtre GitHub Actions couvre maintenant aussi les composants V137 et les bibliothèques de matières, y compris lors de futurs changements sans édition de la page principale.

Le statut 1:1 officiel reste non certifié pour les éléments procéduraux ; les sources ne sont pas des UV provenant des films ou des jeux.
