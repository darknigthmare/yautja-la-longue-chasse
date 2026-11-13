# Addendum de fidélité P0 — 13 novembre 2026

Ce lot poursuit la comparaison aux sources du projet : trois couches natives
séparées de deux assemblages Homeworld et une correction de contour du même
masque Vex, soit quatre PNG admis au lot de revue. Les cinq cibles initialement
visées sont conservées dans `plannedBatch.sourceTargetIds` : l'eau/les effets010
restent non livrés après rejet des essais. `reviewBatchComplete` et
`sourceTargetsComplete` décrivent donc deux faits distincts. Un lot de revue de
quatre entrées complet ne signifie pas que les cinq cibles source sont atteintes.

Le lot précédent reste intégralement figé au commit
`dd7c08cea4934de5dfb61c27447a8808d1b87765`. Les 90 fichiers de ses deux dossiers
et les 126 sources historiques qu'il protège sont vérifiés sans réécriture,
soit 216 fichiers dédupliqués. Cela comprend ses 45 PNG, sa galerie, ses rapports,
ses outils et son classeur de sept feuilles. Aucun statut des 775 P0 n'est changé.

## Ce qui est comparé

- `HWA160-052` : le pylône et son émission deviennent deux couches candidates.
  L'émission conserve un alpha doux ; elle n'est pas soumise à la règle d'un
  corps presque opaque, réservée aux objets physiques. Son falloff n'est pas
  qualifié par une simple présence de transparence.
- `HWA160-010` : seule l'architecture visible est conservée dans le lot de revue.
  Les essais d'eau/brume/lumière verte ont été rejetés pour écarts de forme et
  d'ancrage. La recomposition complète de cette source reste impossible ici.
  La source est déjà tronquée en haut et certaines surfaces sont occultées.
  L'architecture est donc partielle ; elle ne constitue pas un fond sec complet.
  Les marges mesurées du PNG ne prouvent pas une silhouette complète.
- `vex-front-v2` : correction ciblée du menton d'un candidat existant. L'icône
  communautaire de 256 pixels renseigne le contour visible, sans démontrer les
  couleurs, les UV, les autres angles ni les détails fins du masque PHG.

Les sources Homeworld du projet sont copiées telles quelles dans
`public/game/p0-fidelity-20261113/references/` pour la comparaison. Leur SHA est
identique à celui des originaux ; elles sont exclues du compteur de nouveaux
sprites. Les DDS et captures communautaires ne sont pas republiés. Pour Vex,
la vue de comparaison est explicitement le candidat précédent ; le véritable
support d'identité est cité par URL et empreinte dans les détails.

## Galerie et recomposition

Ouvrir `/game/p0-fidelity-20261113/review.html` depuis le serveur du dépôt, ou le
fichier HTML avec ses dossiers adjacents. La galerie juxtapose la source,
une recomposition proposée et les composants séparés. Visibilité, opacité,
position et échelle sont ajustables pour examiner les écarts. Les placements
initiaux ne sont pas une registration approuvée. Les contrôles ne sauvegardent
rien, n'exportent aucune image et ne modifient aucun pixel des PNG.

Une génération native, un alpha valide ou un contrôle de fichier ne certifient
pas la fidélité 1:1. Les images restent `generated-candidate`, sans animation,
validation artistique humaine, intégration runtime ou fermeture automatique P0.
Les surfaces cachées ne sont pas une source disponible à reconstruire librement.

## Reconstruction et vérification

Depuis la racine du dépôt, avec Python 3 et Pillow :

```sh
python3 production/p0-fidelity-20261113/tools/build-addendum.py --write --require-complete
python3 production/p0-fidelity-20261113/tools/verify-addendum.py --check --require-complete
```

`--write` écrit uniquement le nouveau manifeste, la galerie, les copies natives
des références du projet si elles manquent, et les fichiers de suivi de cet
addendum. Il ne produit ni découpe, redimensionnement, miroir, masquage ou autre
fichier raster transformé. Pillow ne sert qu'à décoder et mesurer les PNG.

Le vérificateur reconstruit les sorties en mémoire et exige des octets identiques.
Il vérifie les empreintes natives, les politiques alpha des objets/effets, les
rectangles, les pivots proposés, les liens P0, les sources protégées, les XML et
les cellules du classeur. Quand l'original ImageGen privé existe encore, il est
comparé à la copie publique ; ce fichier privé n'est pas nécessaire après clonage.
`--require-complete` exige exactement les quatre IDs sélectionnés pour le lot de
revue ; il n'affirme pas que les cinq cibles source sont achevées. La cible
`HWA160-010-water` et son rayon restent explicitement ouverts malgré un contrôle
technique passant. Tous les 775 P0, les animations et les cartes multicouches ne
sont pas terminés par cet addendum.

## Suivi Excel séparé

`suivi/Yautja_Fidelite_P0_Addendum_20261113.xlsx` comporte cinq feuilles :
Synthèse, Couches, Références, Limites et Sources protégées. Il lie les nouvelles
images, leurs mesures et leurs citations exactes aux critères toujours ouverts.
Le suivi antérieur des 775 sujets conserve ses octets et son SHA
`b5d303bec0cd02866a47b8f05a126e05aab7c5755c5e951ace98a0e952d996d3`.
Le sérialiseur OpenXML antérieur est réutilisé comme fonction pure, sans modifier
son module ou ses constantes. `suivi/verification.json` consigne les empreintes
du nouveau classeur, du manifeste et de la galerie ainsi que le nombre de
cellules réellement comparées. La recette navigateur est effectuée séparément.
