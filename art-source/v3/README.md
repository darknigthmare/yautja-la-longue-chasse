# Sources graphiques V3

Ces atlas sont des créations pixel-art originales générées avec l’outil
ImageGen d’OpenAI pour ce projet privé de fan. Aucun sprite, scan de figurine
ou fichier de production officiel n’a été copié dans le jeu.

## Jeu de générations

- `openai-body-archetypes.png` : six morphologies complètes dans une pose
  neutre latérale identique ;
- `openai-body-archetypes-bare.png` : édition du même atlas retirant filet,
  pagne, armure, armes, masque et dreadlocks ;
- `openai-net-loin-overlay.png` : édition enregistrée sur le corps, ne
  conservant que le filet et les éléments textiles ;
- `openai-equipment-atlas.png` : douze pièces technologiques isolées, dont les
  huit segments du plasmacaster, le gantelet ouvrant et les wristblades ;
- `openai-biomask-atlas.png` : douze coques de biomask originales inspirées
  des grandes familles visuelles de la franchise ;
- `openai-armor-atlas.png` : plastrons, épaulières, brassard, cuissarde,
  tibière et ceinture ;
- `openai-dread-atlas.png` : huit familles de mèches avec leurs anneaux.
- `openai-loadout-trophy-atlas.png` : combistick déployé et replié,
  smart-disc, arc, flèche, quatre outils de chasse, crâne, colonne et liens de
  trophée, tous isolés sur leur propre cellule.

Les prompts demandaient une vue side-scroller rigoureusement identique, un
pixel-art haute définition à contours nets, des cellules sans chevauchement,
un fond magenta uni et des designs originaux cohérents avec les références
cinéma, crossover, jeux, comics et romans documentées dans
`docs/AUDIT-MODULARITE-V3.md`.

## Pipeline

Le sous-dossier `alpha` contient les atlas après chroma key. Le script
`scripts/prepare-v3-assets.py` :

1. retire et dépollue le fond magenta ;
2. normalise toutes les morphologies sur un canevas `256×384` et un sol
   commun à `y=366` ;
3. sépare les quinze parties anatomiques et le filet ;
4. place chaque module sur les points d’ancrage du rig ;
5. exporte des WebP lossless transparents et leur manifeste géométrique.

Les fichiers de `public/game/assets/v3` sont donc reproductibles à partir de
ces sources et du script versionné.
