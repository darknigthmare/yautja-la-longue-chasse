# Compagnons — 39 PNG individuels publiés

**Livraison dans la [PR #119](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/119), en complément de la bible #116 déjà fusionnée.** Date : 6 novembre 2026.

[Ouvrir l'index des 39 fichiers individuels](INDEX_SPRITES.md) · [Empreintes et chemins Git](DEPOT_PNG.json) · [Catalogue de conception](../../../docs/campagne/CATALOGUE_COMPAGNONS.md).

## Ce qui est effectivement dans le dépôt

Ce dossier contient **39 PNG distincts**, un seul corps entier et une seule vue par fichier, répartis entre dix identités : Ka'Reth, Sya'ra, Vor'Kesh, O'Mara, Dra'Kel, Mara Velez, Amara Okonkwo, Rook Mercer, NYX-17 et MORRIGAN-9. Chaque fichier fait 80 × 96 pixels et conserve les octets du lot livré précédemment. Les cadres, textes et portraits des planches ne sont pas inclus dans ces PNG.

Le transfert binaire est le commit `1a9ddbd18008438d03f722f4e532c03dffce5a4f`, effectué par [l'exécution Actions 42245305490](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42245305490). Les images ne sont plus seulement des liens vers un ZIP ou un patch local : elles figurent individuellement dans les fichiers modifiés de la PR.

## Qualité et manquants : état distinct de la publication

**Ces 39 fichiers restent des brouillons, et non des sprites certifiés fidèles 1:1.** Les signatures manquantes consignées dans le manifeste restent à corriger, notamment la lance réparée de Ka'Reth, les accessoires spécifiques et les silhouettes. Ce sont des extractions des premières générations, pas de nouveaux masters haute définition.

La vue de dos d'Amara reste exclue parce qu'elle représentait une autre espèce. Serekh est un Amengi et Keth/Trois-Clics n'est pas un Yautja ; les interprétations incorrectes ne sont pas ajoutées comme remplacements. Rhazor, Korr-Ma et les autres identités doivent encore recevoir leurs véritables dessins individuels conformes. Une grille de portraits, même détaillée, ne ferme pas ces besoins.

La nouvelle passe de génération n'a produit **aucun remplacement individuel conforme retenu**. Les sorties collectives sont rejetées, sans ajout de personnages inventés par le générateur au catalogue du jeu. La soumission au générateur externe a également été refusée avant création d'un travail. Aucun résultat absent n'est compté comme livré.

La bible comporte 44 identités originales, dont 16 Premium, et 24 références d'œuvres/concepts à traiter séparément. La présente PR ne déclare pas ces besoins tous couverts. Les vues de repos, cycles de marche, interactions, combats, blessures et embarquements restent des besoins distincts ; quatre vues statiques ne sont pas une animation.

## Provenance conservée

`MANIFEST.json` est le reçu **historique de la livraison locale initiale**. Ses anciens champs `publishedToGitHub: false`, `readOnlyConnector: true` et la destination #116 décrivent cette passe passée, pas l'état actuel. Le statut actuel se lit dans `DEPOT_PNG.json`, cet index et l'historique Git de #119. Aucun ancien résultat artistique n'est réécrit pour le faire passer à validé.

Source : `YAUTJA_COMPAGNONS_39_PNG_INDIVIDUELS_BROUILLONS.zip`, 609 025 octets, SHA-256 `df26541c9402e55b6f56040539330834106c9c3d5ffbda73a8259f71ee0dbd58`. Total des 39 PNG : **282 613 octets**.

## Contrôles réellement exécutés

Les 39 fichiers ont été téléchargés de nouveau depuis **GitHub**, au commit `0c8c256d3034ea737cead57d5c3aa6d5cf9118bd`, et contrôlés : 39/39 SHA-256 conformes, SHA des blobs Git, format PNG/RGBA, dimensions, transparence réelle, contenu non vide, marges, identité unique et liens de l'index.

Quatre essais négatifs ont été exécutés sur des copies temporaires : PNG absent, PNG corrompu, PNG supplémentaire non déclaré et fausse validation artistique. Les quatre sont correctement rejetés. Ces contrôles techniques ne prouvent ni une fidélité au lore ni une intégration au moteur.

Exécution : `python production/compagnons/20261106-sprites-individuels-revue/verify.py` avec Pillow. Le workflow restant est **en lecture seule**, sans téléchargement de paquet distant, auto-commit ni push.

## Aucun effet sur la partie

Les fichiers restent dans `production/compagnons/`, hors de `public/`. Aucun PNJ n'est activé, aucune affectation n'est accordée et aucune sauvegarde n'est modifiée. Les indicateurs de validation humaine, fidélité 1:1, animation et intégration en jeu restent faux. Les règles de recrutement et de quartiers conditionnels de la bible sont inchangées.
