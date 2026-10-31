# V134 — profil visuel indépendant et restauration locale

Suite de la PR #39, sans modifier les codes et sauvegardes V102/V103/V115 ni créer une autre PR.

Le profil V134 contient exclusivement les **choix de matériaux régionaux V128**, le mode de rendu (albédo ou PBR) et la distance physique d'influence côtière (300, 900 ou 1 800 km). Identité du monde, ordre des régions, biomes, graines et IDs de textures sont validés strictement avant toute utilisation.

## Sécurité et persistance

- Enregistrement local seulement après un clic explicite. Le stockage navigateur est namespacé par **code exact de monde**.
- Relecture en mode édition au chargement du même monde, sans ouvrir de front, créditer de ressources ou activer automatiquement les matériaux sur le globe.
- Un stockage inaccessible, saturé ou malformé ne peut pas être annoncé comme réussi. Les contenus JSON étrangers, les champs inattendus et les matières incompatibles sont refusés. Un profil illisible n'efface pas la sauvegarde de guerre.
- L'effacement ne touche que la clé du monde actuel.
- Le JSON du profil V134 peut être exporté et importé entre machines ; le fichier « anciens choix V128 » reste compatible comme sous-ensemble (il ne transporte pas le mode de rendu ou la distance).

## Limites

La persistance est un **sidecar visuel local**, pas une migration des archives de partie ni un serveur de synchronisation. Les fichiers PBR utilisés restent les matériaux procéduraux originaux du projet et ne sont pas des UV officiels Predator/AVP 1:1.

Tests : `tests/planet-visual-profile-v134.test.mjs` et parcours navigateur de sauvegarde, restauration, rechargement, isolation entre mondes, application et reset natif.
