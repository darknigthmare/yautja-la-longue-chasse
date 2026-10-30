# V120 — Atlas des 1 200 missions de guerre des clans

**30 octobre 2026.** Dépendance : PR #29, quatre gameplays de la Bible V6. Statut : **1 200 fiches de design uniques, pas 1 200 niveaux jouables**.

## Répartition

| Gameplay | Original | Situation lore extrapolée | Clin d'œil à un lieu connu | Total |
|---|---:|---:|---:|---:|
| Assaut latéral, sorties AP et bases | 100 | 100 | 100 | 300 |
| Outer Ops, mandats différés | 100 | 100 | 100 | 300 |
| Infiltration / sabotage | 100 | 100 | 100 | 300 |
| RTS top-down | 100 | 100 | 100 | 300 |
| **Total** | **400** | **400** | **400** | **1 200** |

Les identifiants CW120-A/ O/ S/ R puis OR/ LO/ HO et un numéro 001–100 identifient sans ambiguïté les douze familles de 100.

## Diversité, environnements et générateur de planètes

Le catalogue contient 100 toponymes extraterrestres inédits. Chacun est décliné sur un **secteur de gameplay différent**, non réutilisé comme une mission simplement renommée. Les 25 cadres Yautja/AVP, avec quatre sous-zones par cadre, donnent les 100 situations lore par gameplay. Les **400 références géographiques réelles sont distinctes**, réparties en quatre banques :

- Assaut : 100 citadelles, châteaux, forts, remparts et complexes défensifs mondiaux.
- Outer Ops : 100 routes, cols, canaux, détroits, ponts, voies ferrées, tunnels et ports de transit.
- Infiltration : 100 édifices, musées, bibliothèques, observatoires, palais et intérieurs célèbres.
- RTS : 100 paysages de relief, déserts, zones humides, volcans, deltas, fjords, glaciers et vallées.

Les autres variations associent 25 biomes de surfaces sols/liquides/ciels, 32 types de dispositions spatiales, 36 événements environnementaux, 29 météos, 25 couverts et 25 familles d'objectifs **propres à chaque gameplay**. Les codes de formes régions/îles indiquent des demandes de futures ressources modulaires ; ils ne certifient pas que les PNG correspondants ont déjà été générés.

## Structure d'une mission V120

Chaque fiche a :

- Identifiant, mode, catégorie, titre et emplacement précis, statut de conception.
- Référence / continuité quand il y en a une, et note explicite interdisant l'affirmation d'un épisode canonique non attesté.
- Biome, terrain, zone liquide, ciel, étage, plan d'accès, couverts, météo, danger, réaction aux événements et **fonctionnement sans électricité**.
- Mission principale, mission annexe, mécanique, événement de rupture, quatre étapes, échec, preuve de succès, plan de repli et extraction.
- Suggestions d'équipes W3-U réellement existantes dans la Bible V6 et statut de reçus et conquêtes.
- Liste détaillée des sprites, tiles, géométries, déclencheurs, comportements et tests encore nécessaires.

Le statut de toutes les fiches V120 est « design-only ». Ni leurs récompenses ni leurs conquêtes ne sont inscrites dans la campagne. Lancer le simulateur de base depuis le catalogue **ne lance pas la variante sélectionnée**.

## Respect du lore : distinguer œuvre et extrapolation

Les contextes lore ont été attribués à 25 cadres documentaires, incluant Predator (1987), Predator 2, Predators, Prey, Badlands, Killer of Killers, AVP, AVP Requiem, AVP Extinction, Hunting Grounds, Concrete Jungle, Bad Blood, Three World War, les comics associés et des lieux de l'univers Alien. Dans ces derniers cas, la présence de Yautja est toujours présentée comme **hypothétique** si l'œuvre ne la montre pas.

Les sources sont des inspirations de géographie, de technologie, de rites ou de conflit, **pas la preuve que notre bataille y a réellement eu lieu**. Aucun conflit propre à une continuité de comics ne devient une loi universelle des Yautja. Les lieux réels sont réimaginés comme architectures et biomes de science-fiction, non comme champs de bataille historiques.

## Exploitation du contenu

- **Dans le jeu :** Bible V6 → « 1 200 variantes · 4 gameplays », recherche, filtres par mode et catégorie, pagination et fiche complète.
- **CSV compatible Excel :** bouton « Exporter le tableau CSV », sur le périmètre filtré ou les 1 200 lignes ; encodage UTF-8 BOM, séparateur point-virgule, échappement des formules.
- **Export local reproductible :** lancer le script Node scripts/export-clan-war-variants-v120.mjs en précisant un chemin CSV.
- **CI :** workflow « V120 clan war 1200-variant atlas quality gate » avec tests d'égalité des 12 groupes de 100, identifiants, 400 lieux d'hommage uniques, diversité, fidélité de statut, TypeScript, ESLint et export en pièce jointe du run.
- **Banques modifiables :** app/game/data/clanWarOriginalPlacesV120.json, clanWarLoreFramesV120.json et clanWarHomageAssault/Outer/Stealth/RtsV120.json.
- **Générateur déterministe :** app/game/systems/clanWarVariantAtlasV120.ts.
- **Tests :** tests/clan-war-variants-v120.test.mjs.

## Exemples de développement concret avant de les marquer jouables

- Une mission latérale de Carcassonne s'inspire des volumes de remparts, mais utilise un bastion Yautja fictif aux deux entrées, un objectif de front et une restitution RAV contrôlée.
- Une Outer Ops inspirée du viaduc de Millau utilise un passage étroit, une limite de transport et une échéance réellement attendue ; un rapport seul ne crée pas de caisson.
- Une infiltration évoquant le Louvre utilise des galeries superposées fictives, des lignes de vue, des patrouilles et une extraction physique.
- Une bataille RTS évoquant les calanques de Marseille tire parti du dénivelé, des gués et du couvert plutôt que de reprendre un même décor plat.

**N'est pas encore fait :** réaliser 1 200 cartes en jeu, produire leurs sprites animés fidèles aux références, créer les objets et dialogues de tous les scénarios, relier chaque variante aux territoires V85/V6 et exécuter un QA manuel complet. Le catalogue n'est pas un raccourci pour déclarer ces éléments achevés.

## Références de mécanique et de continuité vérifiées

- [SNK — AP, base, unités et soutien dans Metal Slug Attack](https://www.snk-corp.co.jp/official/metalslug_attack/how_to_play/01.php)
- [Konami — sélection et préparation des missions de Peace Walker](https://metalgear.konami.net/manual/mc2/mgspw/xbox/fr/page17.html)
- [20th Century Studios — Prey](https://www.20thcenturystudios.com/movies/prey)
- [20th Century Studios — Predator: Badlands](https://www.20thcenturystudios.com/movies/predator-badlands)
- [20th Century Studios — Predator: Killer of Killers](https://www.20thcenturystudios.com/movies/predator-killer-of-killers)
- [Dark Horse — Essential Comics Volume 1](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1)

Les références ne sont pas des permissions pour réutiliser des assets non fournis.
