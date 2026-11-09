# Références du Clan Ship — OPS-B15 et OPS-F44

Ce dossier rend la comparaison préparable objet par objet. Le
[relevé structuré](reference-dossier.json) conserve trente ressources : sept
fonds, huit objets dédiés, six dessins de membres, cinq objets partagés, deux
profils de vaisseaux et deux objets d'incident. Il réutilise les fichiers et
preuves historiques ; aucune image n'est retouchée ni régénérée.

La [planche consultable](reference-dossier.html) relie chaque fichier à son
origine et aux points à comparer. Quatre captures natives existantes ont été
ouvertes pour annoter la silhouette d'approche, la table et sa projection,
l'armurerie et le lit médical. Leurs rectangles d'annotation restent des repères
de lecture sur des captures datées, pas des collisions ou des mesures canoniques.

**OPS-F44 :** les provenances film AVP 2004, œuvres licenciées distinctes et
créations du projet sont séparées. Les six membres et leurs surnoms, les sept
salles, le mandat, les contrats et la table collective restent des adaptations.
Le catalogue V14 conserve sa qualification historique du profil de vaisseau ;
elle n'est pas étendue aux salles ni aux objets nouvellement annotés.

**OPS-B15 / OPS-Q23 restent partiels.** Aucun film ni comic complet n'a été
consulté pendant cette passe ; aucun timecode ou numéro de page n'est inventé.
Les deux liens d'images AVPGalaxy déjà référencés par V14 et l'entretien AWN
ont renvoyé une erreur HTTP 403 à la lecture. Leurs anciennes citations restent
attribuées et datées ; ce dossier ne prétend pas avoir rouvert ces références.
L'approbation artistique humaine 1:1 reste attendue.

Pour terminer la comparaison, il faut un exemplaire identifié du film ou des
planches concernées, relever les timecodes/pages effectivement vus, comparer
les mêmes angles et consigner les parties extrapolées. Les silences d'un résumé
ne prouvent pas qu'une pièce n'existe pas dans l'œuvre ; ils empêchent seulement
de certifier notre pièce à partir de ce résumé.

## Reproduction

```sh
python3 production/p0p1-20261109/lore/build-reference-dossier.py
python3 production/p0p1-20261109/lore/build-reference-dossier.py --check
```

Le contrôle vérifie les empreintes actuelles des trente fichiers contre les
manifestes existants, les rectangles d'annotation et les preuves citées, puis
compare les sorties reconstruites. Il ne lance pas le jeu, ne mesure pas les
performances et ne compte pas comme une nouvelle recette navigateur.
