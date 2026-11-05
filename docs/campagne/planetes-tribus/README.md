# Planètes et communautés — raccord des packs V2 à V5

Complément de la [bible de campagne](../README.md), demandé le 5 novembre 2026.
Il rassemble le contenu de cette conversation dans la PR #116 : quinze directions
planétaires, cinq communautés du monde natal, leurs membres, trônes, pièces,
équipements, faune, végétation et matières, puis les services préparés pour V5.
L'export principal reste conservé ; les décisions de raccord ci-dessous règlent
les ambiguïtés de ces packs sans réécrire les 68 fiches historiques.

## Ce qui existe et ce qui reste à faire

| Ensemble | Livré et vérifié dans les sources | État dans le projet | Suite |
| --- | --- | --- | --- |
| V2 | 119 PNG : 45 pour les quinze mondes et 74 pour les communautés, dont des variantes V1 conservées | Références statiques du catalogue V37 | Choix des variantes, revue artistique et adaptation aux usages concrets |
| V3 | 45 PNG : un élément naturel, un passage et un objet par monde | Références statiques du catalogue V37 | Placement, collisions, interactions et contrôle des accès |
| V4 | 40 PNG : quatre membres, deux objets et deux lieux par communauté | Références statiques du catalogue V37 | Identités, dialogues, comportements, poses et scènes utilisables |
| V5 | 40 sujets préparés ; **aucun PNG** | Préparation, sans promotion en ressource livrée | Dix membres, quinze objets, dix lieux et cinq matières à générer |

Les **204 fichiers PNG ont 204 empreintes différentes** : ce n'est pas un compte
de 204 personnages ou sujets narratifs distincts. Les 15 variantes V1 récupérées
dans V2 restent des variantes. Les 204 références V37 ne deviennent pas
204 éléments animés, interactifs ou validés artistiquement. Le registre existant
[tribeArtV37.json](../../../app/game/tribeArtV37.json) et son
[rapport d'import](../../tribe-art-import-v37.json) restent les points d'entrée ;
une seconde bibliothèque parallèle serait un doublon.

| Document | Rôle |
| --- | --- |
| [Planètes et concordance](PLANETES.md) | Quinze directions ; correspondances établies, homonymes et mondes encore sans mission ; raccord au monde natal, aux huit chasses et à Xeno Prime |
| [Cinq communautés](TRIBUS.md) | Identités, architecture, membres V2/V4, trônes, lieux et services V5 ; relations avec les régions existantes |
| [Scénarios civils](SCENARIOS_CIVILS.md) · [textes d'origine](TEXTES_SOURCE.json) | Vingt situations de membres V4, cinq enchaînements V4 et cinq boucles V5 ; guides et relations conservés, avec leur statut de propositions |
| [Catalogue des images](ASSETS.md) · [données complètes](DONNEES_ASSETS.json) | Les 204 fichiers, prompts d'origine, SHA-256, dimensions, transparence, archives et statuts ; 40 travaux préparés séparés |
| [Raccord au dépôt](RACCORD_EXISTANT.md) · [données de concordance](RACCORD_EXISTANT.json) | Identifiants V37, références du code, six départs, six régions, noms de mondes et limites de l'intégration déjà présente |
| [Reprise de production](REPRISE.md) · [consignes V5](REPRISE_V5.json) | Quarante sujets précis, dépendances, règles de génération, travail de jeu et contrôles d'acceptation encore ouverts |
| [Références de franchise](SOURCES_LORE.md) · [sources structurées](SOURCES_LORE.json) | Œuvres, figurines et créations originales ; portée réelle des sept références NECA et limites de consultation |
| [Vérification](VERIFICATION.md) · [audit des archives](VERIFICATION_ARCHIVES.json) | Contrôles effectivement réalisés, anomalies de continuité visuelle à traiter et limites de preuve |

## Décisions de concordance

Ces règles portent sur ce complément et sur sa reprise. Elles ne transforment
pas rétrospectivement une ancienne consigne de génération en preuve de lore.

| Décision | Contrat |
| --- | --- |
| PT-01 — Continuités | Une référence issue d'un film, d'un comic ou d'une figurine garde son œuvre et sa continuité. Les cinq communautés et leurs fonctions civiles restent des créations du projet. La fidélité 1:1 se contrôle sur les éléments adaptés d'une référence précise ; elle n'est pas une certification globale des inventions. |
| PT-02 — Identités | `DESERT`, `FOREST`, `SLUMS`, `LAVA`, `DARKJUNGLE` identifient les cinq familles du pack. Ni cinq nouveaux rangs, ni remplacement des six origines O1–O6, ni nom imposé au clan du joueur. Un vétéran V1 et sa version V2 ne sont pas deux recrues. |
| PT-03 — Monde natal | Conserver les six régions décidées dans la bible : Désert, Slums, Jungle humide, Lave, Glacier et Marais. Glacier et Marais restent présents même sans pack communautaire dédié. Le Refuge des Veilleurs exige un raccord local explicite ; un décor réutilisé ne suffit pas à prouver ce raccord. |
| PT-04 — Géographie | Une ressemblance de biome n'est pas une identité de planète. Préserver Mycora-Nox / Mycora-V, Nivalis-C / Nivalis-K, la Caldeira du Homeworld / Cinder-12 et le désert du Homeworld / Serekh-9. Ne pas attribuer de nouveaux `PLANxx` par déduction. |
| PT-05 — Progression | Les jalons L-01 à L-10 et leurs conditions nommées priment sur les anciens repères numériques. Aucun trône, équipement, village ou contrat de service ne valide un rite, un rang, une reine, une coque personnelle ou le commandement d'un clan. |
| PT-06 — Compagnons | Appliquer ALL-01 à ALL-10 : les membres locaux restent des habitants tant qu'une identité et un recrutement ne sont pas établis. Présence à bord et effets personnels exigent affectation active et compatibilité ; préserver Saar, Vek, les autres individus déjà écrits, leur vieillissement et la mort définitive. |
| PT-07 — Institutions | Doyenne, gardien, praticien, artisan et tisseur sont des fonctions locales. Ni caste canonique supplémentaire, ni attribution automatique d'Elder, Shaman, King ou Enforcer. Un siège de conseil ne crée pas de royauté. Les Slums ne rendent personne Bad Blood par origine. |
| PT-08 — Corps et habitat | Yautja biologiques reconnaissables ; anatomie et équipement à revoir sur références. Eau protégée aux Citernes ; cité de pierre aux Hautes Branches ; quartier entretenu aux Forges Basses ; Caldeira habitable avec routes refroidies ; Veilleurs entièrement souterrains sous une voûte rocheuse. |
| PT-09 — Xeno Prime | Réutiliser PLAN08 et le raccord XP-Z11 → XP-Z12 du [Berceau enfoui](../xeno-prime/README.md). XP-Z09 reste une reine morte inerte. Aucun des six visuels généraux V2/V3 ne remplace le boss actif, sa preuve de victoire ou les 23 sprites encore manquants du Berceau. |
| PT-10 — Production | Garder indépendants préparation, livraison, référencement, usage en scène, test comportemental et validation artistique. Les matières sont des illustrations de surface ; le raccord répétable, les cartes PBR, les animations et les collisions demandent leurs propres preuves. |
| PT-11 — Comptage | Conserver 68 fiches de campagne et huit chasses existantes. Quinze directions graphiques, cinq boucles civiles V5 et 40 prompts ne sont pas autant de nouvelles missions jouables. Les propositions ne dévoilent pas automatiquement des découvertes dans le codex du joueur. |
| PT-12 — Reprise | Le blocage de génération mentionné dans les sources V5 est un événement du 17 septembre 2026. Le présent état est « à produire, 0 PNG livré » ; aucune indisponibilité actuelle du service n'est déduite de ce message ancien. |

## Raccord aux autres annexes

Le [contrat compagnons](../COMPAGNONS_ET_ALLIES_PREMIUM.md) gouverne recrutement,
affectation, quartiers et permanence des individus. La [mobilité](../mobilite/README.md)
gouverne acquisition des animaux, BOND, charges, largeur de passage, garage et
écuries : la créature de bât V2 n'est pas déjà une monture jouable et ne duplique
pas Bastion, Tranchevent ou Nacre. Les huit salles fonctionnelles de M022 restent
les mêmes ; une infirmerie locale ou une chambrée V5 n'ajoute pas automatiquement
une salle au vaisseau.

Le [Warp](../WARP_UNIVERSE.md) conserve ses modes Expédition, Chronique et
Réécriture, son accès facultatif Adjutant et ses inventaires d'instance distincts.
Un décor planétaire n'ouvre pas une porte Warp ; un avatar connu utilisé comme
référence visuelle ne devient pas un compagnon recruté. La campagne conserve ses
ellipses : les implantations, les âges et la technologie d'une cité doivent être
raccordés à l'époque de la visite avant d'écrire sa mission.

Les fichiers de cette annexe sont documentaires. Ils réconcilient les ressources
déjà référencées dans le dépôt et les travaux restants ; ils ne modifient ni les
PNJ, ni les sauvegardes, ni les accès de régions, ni les fichiers binaires du jeu.
