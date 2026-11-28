# Oseris-IV, chasse du Bondisseur jusqu’à l’atelier

La recette Chromium ouvre « Sang dans la canopée » par le GameClient. Elle charge une sauvegarde d’admission déclarée à la tentative 0, avec l’armure Hunter, le Combistick, le Plasmacaster, le Flaying Tool affûté et la difficulté Jeune Sang. Elle passe la cinématique d’arrivée par la commande prévue. Les acteurs et objectifs proviennent du monde d’Oseris-IV.

Depuis l’insertion, le pilote lit les poses, les objectifs et les états de chasse. Il envoie les actions par les commandes du produit. La position du pointeur suit la cible observée. Le mode natif exclut les fonctions de création et de dommage utilisées dans les scénarios de canopée bornés. La reprise passe par le stockage du navigateur et la revendication native du nouvel écrivain.

## Combat, dépouille et livraison

La patrouille originale `jungle-patrol-2` est combattue à la mêlée. Le Bondisseur des brumes conserve ses 54,945 PV à l’insertion et tombe à 19,217 s. Le rite des Crocs à canal thermique et le dépeçage viennent du même corps. Le pelage brut `jungle-vey:0:jungle-patrol-2:hide` conserve sa qualité de 80, ses 2,4 kg et ses 3 volumes sur 24 au rechargement. La charge réduit le déplacement à 96 % et augmente l’effort de grimpe de 7,5 %.

Le pilote scanne les trois traces puis récupère le transpondeur. Vey entre en combat à 540 PV, est étudiée, combattue et vaincue avant la prise de son insigne. Le chasseur atteint la balise par le sol. L’embarquement est demandé à 93,25 s. Le règlement augmente le compteur de réussites d’une unité, livre les crocs, l’insigne et le même pelage, et débite les deux usages du Flaying Tool de 100 à 90. Le sidecar est libéré. La chasse ne déclenche pas de second souffle.

Les six vérifications précédentes passent sur `8dbd07227bdb59c871875717a5aac60f90adabb6`. Le navigateur entre dans l’armurerie mais l’assertion sur la casse du texte rendu arrête ce premier essai avant le premier geste de nettoyage. Le rapport observe 292 ressources chargées et zéro erreur de page. [Exécution Chromium](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/46126162864) · [Rapport et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/46126162864/artifacts/15256405168)

## Reproduction

```sh
CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/qa-oseris-trophy-return-20261128.mjs --native-oseris
```

La variante ajoute une sortie terrestre chargée sous Chromium aux preuves de canopée déjà présentes. REM112-06 et REM112-08 demeurent partiels pour la matrice des huit chasses et les charges pleines.
