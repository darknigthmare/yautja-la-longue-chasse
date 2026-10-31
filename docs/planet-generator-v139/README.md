# V139 — Maillage conseillé selon le rayon de la planète

La taille physique ne transforme pas silencieusement un monde V115 existant. Un **bouton explicite** permet néanmoins de proposer un maillage plus dense pour un nouveau brouillon avant « Générer l’aperçu » :

| Taille | Territoires | Régions |
| --- | ---: | ---: |
| Naine · 1 900 km | 18 | 3 |
| Petite · 3 900 km | 24 | 4 |
| Terrestre · 6 371 km | 48 | 8 |
| Grande · 9 700 km | 72 | 12 |
| Géante · 14 500 km | 96 | 12 |
| Colossale · 21 000 km | 96 | 12 |

Les verrous utilisateur « territoire » et « région » sont respectés, ainsi que la limite du moteur : 96 territoires, 12 régions, trois territoires minimum par région.

Les prévisions de masses terrestres sont dérivées du vrai générateur V103, pas d’un atlas de visuels : supercontinent unique, 3–5 continents, archipel variable en racine du nombre de territoires, fragmentation à environ 42 % et maximum 32 masses. Les profils d’îles/continents/régions V115 sont ensuite appliqués à la géographie réelle du nouveau brouillon.

Cette fonctionnalité n'ajoute ni une carte de film certifiée 1:1 ni un nouveau type de sauvegarde. Le choix reste réversible jusqu'à la génération de la nouvelle planète.

Tests : `tests/planet-topology-advisor-v139.test.mjs`, vérification de chaque suggestion et des comptes réels de masses ; QA navigateur du bouton puis restauration du brouillon sans ouverture de front.
