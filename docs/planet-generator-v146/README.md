# V146 — Dossier environnemental et carte réelle des biomes

La dernière série a rendu disponibles les tirages V144/V145. Il reste cependant un problème de compréhension physique du monde : la V115 encode un rayon en kilomètres et un biome par région, mais la gravité et la durée du jour restent des valeurs **descriptives**, sans carte de latitude climatique ni orbitalité définie. On ne peut pas calculer une température crédible, une pression atmosphérique ou l'habitabilité à partir de ces seuls paramètres.

## Fonctionnalités

- Analyse **strictement en lecture seule** du monde actif : longitude/latitude réelles de chaque région, biome enregistré, surface entre les continents et catégorie physique de ce milieu.
- **Inclinaison axiale supposée de 0 à 85 degrés** et quatre saisons idéalisées. Calcul d'une déclinaison solaire et des heures d'ensoleillement théoriques par région, exprimées sur la durée du jour déjà inscrite dans le monde.
- Pour les mondes V115, vitesse de rotation équatoriale et vitesse d'évasion déduites du rayon, de la gravité et du jour. Densité moyenne déduite en supposant une planète sphérique, uniquement à titre d'**hypothèse diagnostique**.
- Signalement non bloquant des situations à documenter : biome glacial à l'équateur, jungle aux latitudes polaires, terres chaudes contre une surface de glace, ou inversement. Les alertes demandent une explication de lore / altitude / chauffage, pas une correction automatique ni un changement de mission.
- **Planisphère PNG 512 × 256**, colorié uniquement selon les 13 biomes réellement attribués dans le générateur. Même masque régional V124 ; mers, bassins et chenaux demeurent transparents. Export du rapport JSON pour les auteurs.
- Présentation compacte et responsive dans « Étudier les climats, les journées et la physique » au sein de la fiche de planète. Rien ne s'applique automatiquement au jeu ni aux profils V134.

## Exactitude et limites

La V146 utilise une formule astronomique idéalisée pour la durée de jour, mais **aucune orbite, étoile, distance, relief quantifié ou atmosphère scientifique** n'est encodé dans les recettes V102/V103/V115. L'inclinaison et la saison sélectionnées ne sont donc que des hypothèses de recherche. Les indicateurs physiques déduits ne doivent pas être présentés comme des données canon de Predator/AVP.

Les tests de domaine vérifient les solstices, les pôles, les 10 milieux, les six rayons et l'immuabilité des planètes. Les tests sur pixels valident les 13 couleurs et l'absence de faux liquide. Chromium vérifie l'interface, les saisons, le changement d'inclinaison, l'export JSON et le vrai PNG, sur écran bureau et mobile.

Ces études prolongent le générateur et rendent ses incohérences visibles, mais ne constituent **pas** un modèle climatique complet ni une preuve de reproduction visuelle 1:1 des films.
