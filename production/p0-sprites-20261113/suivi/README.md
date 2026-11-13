# Suivi des sprites P0 du 13 novembre 2026

[Ouvrir le classeur](Yautja_Sprites_P0_20261113.xlsx) · [Couverture JSON](coverage.json) · [Preuve technique](verification.json) · [Galerie du lot](../../../public/game/p0-sprites-20261113/review.html)

Le lot contient **110 entrées graphiques candidates : 109 cadres de sprites et 1 fond opaque**, correspondant à **80 identités source**, dans **45 PNG natifs**. Répartition : 13 vues Homeworld, 6 études de masques de face, 12 états de props, 18 structures, 60 vues d’unités, 1 fond Warp. Les 60 vues d’unités représentent 30 identités d’unités. Une page d’atlas peut contenir plusieurs cadres ; les deux sens d’une unité conservent la même identité source.

**Les 775 P0 sont des sujets documentaires, pas une quantité d’images à produire.** Les 23 sujets liés à de nouveaux candidats gardent leur statut antérieur, comme les 752 autres. Aucun P0 n’est fermé par ce lot. Le total d’images ou de frames nécessaire pour terminer tous les critères reste indéterminé (`null` dans le JSON), sans pourcentage d’exhaustivité artificiel.

Les PNG sont des poses ou des éléments statiques : **0 animation complète**, 0 nouvelle intégration runtime, 0 validation artistique humaine et 0 certification canonique 1:1. Les unités, structures et décors issus de la bible du projet restent des créations originales du projet. Les six masques sont des études de face appuyées sur des références communautaires, sans admission automatique de silhouette, de trois angles, de six morphologies ou d’UV. Les neuf P0 de fidélité PHG restent P0 même lorsque leur ligne de création est P1. Les sources et limites sont consignées dans « Références » et « Blocages fidélité ».

Le classeur contient sept feuilles : Synthèse, Assets, Couverture P0, Références, Blocages fidélité, Sources protégées et Déjà existants. Chaque vue relie son fichier PNG réel, son SHA256, son rectangle dans la page native, son pivot proposé, les mesures alpha du pack, ses avertissements et les lignes Excel d’origine. Les critères et statuts des 775 sujets sont recopiés sans réécrire leurs sources. Les collisions, dimensions physiques, caméra en jeu, mobilité et fidélité artistique restent à vérifier dans leur contexte.

Les 52 études BODY / 104 orientations Feral et Scar V100, les 640 PNJ statiques, les 54 gauntlets / 108 SVG et les cinq images Warp déjà présents sont exclus du compteur de nouvelles productions. Les six affectations d’équipage sont un sous-ensemble de la bibliothèque PNJ existante.

Les 12 cartes W3-MAP de la Bible sont décrites avec leurs dimensions, chemins, passages et dangers. Ce lot comporte 0 vue de carte source ; la production des tuiles régionales, couches et scènes multi-niveaux reste ouverte. Un dessin de fond aplati ne remplace ni leur géométrie ni leur interaction. Les demandes de terrain terrestre ou extraterrestre exact gardent leurs exigences de références et de revue.

Le fond de baie vide WARP-199 reste distinct des props Warp 001–005. Ces derniers sont déclarés livrés dans le catalogue historique du lot 01, dont les binaires sont à récupérer avec leur manifeste : ils ne sont pas présents dans ce checkout. Ce constat ne signifie pas qu’ils sont perdus ni qu’il faut les régénérer arbitrairement. La dépendance de récupération est citée dans « Blocages fidélité ».

`source-protection.json` protège **119 XLSX sources et 6 Markdown** provenant de l’inventaire du 9 novembre, plus **l’ancien suivi XLSX de 19 feuilles**, soit 126 entrées et 120 classeurs antérieurs. Chaque commande vérifie les octets et SHA256 ; aucun de ces fichiers n’est réécrit. La base commune est `6103b19ecbc47de30a554ba65bda66fe6b515425`.

## Reproduction et vérification

Depuis la racine du dépôt, avec Python standard uniquement :

```sh
python3 production/p0-sprites-20261113/tools/build-workbook.py --build
python3 production/p0-sprites-20261113/tools/verify-workbook.py --check --require-complete
```

Le générateur lit le manifeste gelé du pack, ses PNG, les références locales, les enregistrements de génération et les inventaires sources. Le vérificateur relit 18759 cellules, les formules et leurs valeurs mises en cache, les liens et tous les XML du classeur, puis exige une reconstruction identique octet pour octet. L’option `--require-complete` concerne le lot d’images prévu et distingue explicitement sa complétude de la clôture des 775 sujets P0. Ces vérifications de fichiers ne constituent pas une recette de gameplay ou une revue artistique. Alpha, pivots et qualité sont les mesures épinglées du pack ; les identités source, les cadres et les PNG physiques restent trois dénominateurs distincts.

SHA256 du classeur : `b5d303bec0cd02866a47b8f05a126e05aab7c5755c5e951ace98a0e952d996d3`.
