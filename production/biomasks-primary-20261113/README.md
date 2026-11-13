# Masques — nouvelles vues sur sources officielles

Cet addendum ajoute cinq vues candidates en couleur de **Samurai, Viking,
Valkyrie, Cleopatra et Exiled**,
à partir de rendus et de captures officiels de *Predator: Hunting Grounds*.
Les angles suivent les images effectivement disponibles. Les anciens frontaux
monochromes issus d'une référence communautaire restent conservés séparément.

Samurai, Viking et Exiled améliorent trois noms déjà présents. Valkyrie et
Cleopatra ajoutent deux noms avec une découpe candidate : les **50 cibles
nommées restantes** de l'audit passent à **48** avec ces cinq vues.
Aucune tâche de fidélité n'est déclarée terminée. Ce décompte n'est pas une estimation du nombre de PNG, variantes,
profils ou dos encore nécessaires. Les formes cachées ne sont pas inventées.

La fidélité 1:1 est une cible de revue. Aucun fichier ne reçoit automatiquement
de certification canonique, validation artistique humaine, animation ou admission
dans le jeu : tous les drapeaux correspondants restent faux. Les sources éditeur
ne constituent pas à elles seules une licence de redistribution ; les photos
complètes ne sont pas copiées dans le dépôt. Leurs URL, SHA256, dimensions et
observations de vue sont conservées dans `inputs/primary-mask-sources.json`.

## Reconstruction et contrôles

Depuis la racine du dépôt, avec Python3 et Pillow12.3.0 :

```sh
python3 production/biomasks-primary-20261113/tools/build-primary-mask-pack.py --write --require-complete
python3 production/biomasks-primary-20261113/tools/verify-primary-mask-pack.py --check --require-complete
python3 production/biomasks-primary-20261113/tools/ci-primary-mask-inputs.py --check
```

`--freeze-sources` sert uniquement à la création initiale du suivi. Cette option
refuse de remplacer un instantané existant. Les **123 XLSX antérieurs**, les trois
lots publiés, leurs **62 PNG candidats natifs**, les références et les preuves
historiques sont protégés par empreinte. Aucun ancien classeur n'est réécrit.
Le sérialiseur OpenXML existant est importé comme fonction pure, sans modifier
son fichier ni sa configuration globale.

La reconstruction et la vérification n'exigent aucune photo privée ni sortie
ImageGen dans `/tmp`. Lorsqu'une sortie native ImageGen est encore présente,
ses octets sont comparés à la copie candidate. Pillow lit les dimensions et
l'alpha : aucun recadrage, recoloriage, redimensionnement ou réencodage raster
n'est effectué. Les pivots restent des propositions pour la revue.

La galerie `/game/biomasks-primary-20261113/review.html` compare les candidats
et présente leurs limites. Les vues officielles en couleur et les anciens
frontaux secondaires ont des angles différents ; leur juxtaposition n'est
pas une preuve de correspondance pixel pour pixel. Les contrôles navigateur,
les contrôles techniques et la revue humaine restent des validations distinctes.

`suivi/Yautja_Masques_Sources_Primaires_20261113.xlsx` contient Synthèse, PNGs,
Références, Restants, Blocages et Sources. Les statuts source sont conservés.
