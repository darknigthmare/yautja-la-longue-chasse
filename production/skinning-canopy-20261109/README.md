# Skinning et canopée — réalisation du 9 novembre 2026

Cette tranche prolonge la PR #131 depuis `8a25c5cf206647c3490ac362452c2eb22584f07e`, sur le main de départ `19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`. Elle améliore les gestes de terrain, la navigation dans les arbres et la reprise de chasse. Le [lot précédent](../reprise-chasse-bible-20261109/README.md) conserve ses octets, ses résultats et ses limites.

Le [contrat de réalisation](specification.md) et la [matrice éditable](qualification.json) définissent les critères dérivés de cette tranche. `EN_ATTENTE` signifie qu’aucune qualification n’est encore reçue ; une recette écrite ou une ressource produite ne constitue pas une recette exécutée. Chaque critère possède des colonnes distinctes pour le code, les ressources, la logique, le navigateur, les appareils et la revue artistique humaine.

Le [classeur](Yautja_Skinning_Canopee_20261109.xlsx) et son [compagnon HTML](Yautja_Skinning_Canopee_20261109.html) reprennent les mêmes données. Le générateur utilise le writer stdlib historique du dépôt comme bibliothèque de mise en page, sans exécuter son ancien inventaire ni modifier ses fichiers. Les exports suivent le gel des sources et des recettes navigateur.

Le produit et les recettes sont relus en `cfa730ba65c03d353eb97acfec56eabc383a499b`. Les derniers gates locaux passent **471 tests dans 31 fichiers**, le build Next webpack avec TypeScript et le lint strict de **20 fichiers**. Ils gardent leur vrai checkout `ce82e2b` avec superposition, puis la comparaison aux blobs `cfa730` ; ils ne deviennent pas une nouvelle exécution sur ce commit. La recette finale du vrai GameClient tourne ensuite réellement sur `cfa730` : **16 contrôles et 17 captures natives**, avec 24 sources et 289 ressources originales vérifiées.

Le suivi qualifie **22 critères logiciels bornés**. Les variantes couvertes en logique, les parcours réels, les composants à états construits et les mesures de contact restent séparés dans chaque fiche. Les colonnes navigateur partielles n’acquièrent pas une portée plus large par ce total. Le garde des sources et l’inventaire runtime courant passent aussi sur `cfa730` ; les anciens certificats restent datés.

Le classeur contient **9 onglets, 620 lignes, 5 113 cellules et 601 liens**. Les contrôles de reproduction et le lecteur indépendant passent ; aucune formule, macro ou session Microsoft Excel native n’est ajoutée.

Le parcours restaure les vrais sidecars de rite, de dépôt, de pendule et de vol libre ; il livre la même pièce et termine les quatre étapes de conservation pour 14 marques. La canopée atteint la liane suivante sans boost. Le contact arrière est mesuré sur 35 états dans deux directions, dont cinq points ciblés voisins des captures 11/13 ; maximum de 9,11e-13 px. Ces observations d’état ne constituent pas une assertion sur le pixel exact des PNG ni une validation artistique humaine. La recette est muette ; aucune erreur de page ou ressource défaillante n’est collectée, et les erreurs console ne sont pas enregistrées.

Le XLSX garde des colonnes larges pour le tri et la lecture, des filtres et des volets gelés sur quatre lignes et deux colonnes. Le compagnon présente les mêmes champs en fiches imprimables A4 avec un corps de 11 points ; une feuille Excel ramenée sur une seule page ne doit pas être présentée comme lisible par défaut.

```sh
python3 production/skinning-canopy-20261109/build-followup.py --check-data
python3 production/skinning-canopy-20261109/build-followup.py
python3 production/skinning-canopy-20261109/build-followup.py --check
python3 production/skinning-canopy-20261109/verify-followup.py
```

Le [baseline](baseline.json) conserve les identités des **108 classeurs originaux**, des **272 fichiers du lot précédent**, des **31 fichiers de son suivi CI** et des deux fichiers de publication chasse V112. Les entrées absentes du checkout sparse sont comparées à leur objet Git suivi ; cela ne revendique pas leur ouverture dans Excel. Les huit textes de `Restant` sont copiés exactement, sans nouvelle clôture déduite.

Les FUT-01 à FUT-10 ont déjà une qualification automatique bornée : cette reprise ne les présente pas comme dix fonctionnalités absentes. Les essais humains, Android/iOS/manette physiques, performances sur matériel cible et Microsoft Excel natif gardent leur périmètre distinct. Les campagnes complètes et les replis chargés de REM112-06/08 restent régis par leurs critères originaux ; un parcours préparé ne les remplace pas.
