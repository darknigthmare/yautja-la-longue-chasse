# Preserve V6 — grandes traques, dangers actifs et décor natif

Cette livraison ajoute quatre **grandes traques** sélectionnables séparément (format de sauvegarde V6) et habille les terrains V1–V5 existants avec des décors natifs déjà présents dans le dépôt. Aucune ancienne sauvegarde n’est convertie : une partie V1–V5 reprend sur son propre terrain.

## Grandes traques (V6)

| Réserve | Identité | Objectifs secondaires | Dangers |
| --- | --- | --- | --- |
| Vharuun | `vharuun-grand-hunt` | 2 dépôts neutralisés, 1 départ interrompu | fondrières (lent), branches effondrées (blessant), pièges lumineux (alerte) |
| Avar’Kesh | `avar-kesh-grand-hunt` | 3 mécaniciens identifiés | fondrières, branches effondrées, pièges lumineux |
| Khar-Duun | `khar-duun-grand-hunt` | 4 dépôts neutralisés | lits d’éclats d’obsidienne (blessant) |
| Iskhel | `iskhel-grand-hunt` | 3 mécaniciens, 2 départs interrompus | glace mince (lent), évents cryogéniques (blessant) |

Chaque grande traque compte 12 secteurs contigus (19 200 unités), 24 adultes armés uniques, 6 groupes, 6 appareils, 24 dépôts (48 lots conservés) et 6 postes de relevé. Les noms des 8 combattants ajoutés par réserve sont des créations du jeu, sans fiche H001–H100 ni nouvel atlas : les trois atlas humains existants restent partagés.

### Tracés

- Les tracés sont des données fixes (`app/game/systems/gameReserveGrandHuntData.ts`), produites par `scripts/generate-preserve-grand-hunts.mjs`. Le jeu n’exécute pas le générateur ; relancer le script reproduit exactement le fichier.
- Autour de chaque appareil, un module de quatre plateformes monte jusqu’à un poste au-dessus de la coque, puis redescend au-delà. Aucune passerelle ne traverse une coque sous son toit.
- Entre les appareils, des routes hautes continues alternent montées, paliers et descentes, avec des embranchements hauts au-dessus de certaines corniches basses.
- Les plateformes utilisent 4 à 7 familles natives par biome (ponts de racines, dalles moussues, ponts de cristal, épaves gelées, arches érodées, dalles vitrifiées, versions brisées…), et les couverts 4 à 6 familles.

### Dangers actifs

Les dangers ne concernent que le sol ; toute plateforme est une route sûre.

- **Terrain lent** : vitesse du chasseur ×0,5, des humains ×0,6.
- **Terrain blessant** : 4 PV au chasseur toutes les 45 ticks. La blessure interrompt un canal (prélèvement, relevé, sabotage) comme un projectile. Un humain calme le traverse prudemment (×0,75) sans dommage ; un humain en combat le traverse vite et perd 3 PV par intervalle.
- **Piège d’alerte** : à l’entrée au sol, les humains à moins de 520 unités reçoivent la position du chasseur pendant 300 ticks. Un seul déclenchement par entrée ; il ne s’active pas depuis une plateforme.
- Aucun danger dans le premier secteur, sur une rampe d’embarquement ou sur un dépôt.
- Le carnet tactique signale le danger le plus proche (moins de 420 unités) et précise s’il est sous les pieds du chasseur.

### Rythme des évasions

Mesure sur la simulation : traverser 19 200 unités à pied prend environ 84 s. Avec les vitesses de réparation des réserves V5, les six appareils partaient tous entre 77 et 104 s : les groupes de l’est seraient partis avant l’arrivée du chasseur.

Les groupes les plus éloignés ont donc des appareils plus endommagés : la réparation du groupe *k* est multipliée par `1 / (1 + 5k)` (`GAME_RESERVE_GRAND_REPAIR_SCALE`). Sans intervention du chasseur, les départs mesurés s’étalent d’environ 84 s (groupe 1) à 460–493 s (groupe 6). Un test vérifie que chaque groupe part au moins une minute après le moment où un chasseur parti de l’extraction peut l’atteindre à pied, et que les groupes plus lointains partent plus tard. **La durée réelle d’une partie n’est pas certifiée** : elle dépend des interceptions, et la cible de 20–35 minutes reste ouverte.

## Décor des terrains V1–V5

`app/game/systems/gameReserveLegacyDecorData.ts`, produit par `scripts/generate-preserve-legacy-decor.mjs`, ajoute aux six terrains existants des surfaces, ornements et colonnes natifs v19. Ce décor est **purement visuel** : il ne crée ni collision, ni couvert, ni danger, ni champ de sauvegarde, et les traces V1–V4 épinglées restent identiques. Une image manquante ou de taille inattendue est simplement ignorée, sans bloquer une expédition existante.

Khar-Duun (désert) ne dispose dans le dépôt d’aucune planche d’ornements, de surfaces ni de dangers désertiques. Ses dangers utilisent le lit d’éclats d’obsidienne du kit volcanique, et son décor se limite aux colonnes, cordes et échelles désertiques.

## Vérifications

- `tests/game-reserve-grand-hunts.test.mjs` (16 tests) :
  - définitions et fichiers natifs avec leurs tailles exactes ;
  - absence de danger ou de couvert sur les rampes et les dépôts ;
  - sauvegarde stricte, refus des identités croisées et de V7 ;
  - les 6 postes de chaque réserve atteints par de vrais sauts de la simulation (planificateur sur états clonés), relevés par canal et rapportés à pied ;
  - effets des trois dangers ;
  - équipes vivantes, conservation des 48 lots et départs échelonnés ;
  - carnet tactique ;
  - décor V1–V5 sans effet de jeu.
- Suite `tests/game-reserve-*` : tout passe, sauf un test dans chacun des fichiers `expedition-persistence-v107` et `-v108`, qui échouent aussi sur `main` sans ces changements.
- Tests mis à jour :
  - la limite « version future » passe de 6 à 7 dans deux tests de persistance ;
  - le test de chargement V109 compte désormais les images de décor déclarées du biome.
- Rendu : captures hors navigateur (Playwright sur un rendu du moteur réel) inspectées pour les quatre grandes traques et les terrains V1–V5.
- Non fait ici : recette navigateur sur build Next, vérification de types complète du projet (types React indisponibles dans la session de travail ; à confirmer par la CI) et mesure de performance.
