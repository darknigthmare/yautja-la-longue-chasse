# Raccord aux registres, régions et personnages existants

Audit documentaire de la branche `claude/bible-de-campagne`, au commit
`04a14cce268a1572092269fb281304ac10294725`, le **5 novembre 2026**.
Les décisions PT-01 à PT-12 du [contrat de raccord](README.md) gouvernent la reprise.
Les [données de concordance](RACCORD_EXISTANT.json) relient chaque source aux
identifiants déjà présents ; elles ne créent aucune identité de jeu supplémentaire.

## 1. Les 204 images sont déjà référencées dans V37

Le catalogue [tribeArtV37.json](../../../app/game/tribeArtV37.json) contient bien
les **119 images V2, 45 images V3 et 40 images V4** de cette conversation.
Le rapprochement avec les trois manifestes récupérés est exact pour les
**204 SHA-256 de source**, noms de fichiers, dimensions et tailles d'origine.
Le [reçu d'import V37](../../tribe-art-import-v37.json) conserve également les
empreintes des WebP, des vignettes et des pixels décodés lors de cette conversion.

| Preuve examinée | Constat | Limite |
| --- | --- | --- |
| Catalogue et reçu V37 | 204 entrées, jointes aux sources V2–V4 par empreinte complète | Une entrée peut être une scène, une matière ou une variante ; ce n'est pas nécessairement un personnage distinct |
| Arbre Git au commit examiné | 204 chemins de WebP principaux et 204 chemins de vignettes présents | Les 408 fichiers WebP n'ont pas été retéléchargés ni comparés de nouveau pixel par pixel pendant ce raccord |
| [TribeArtGallery.tsx](../../../app/game/TribeArtGallery.tsx) et [ClanChroniclePanel.tsx](../../../app/game/ClanChroniclePanel.tsx) | Route de consultation en galerie définie dans le code pour les 204 entrées | Lecture du code ; aucun parcours navigateur réalisé ici |
| Dossier des cinq familles dans `ClanChroniclePanel.tsx` | Cinq vignettes `HOMEWORLD_*_V2.png` sélectionnées par nom de source | Ce composant se déclare dossier de conception en lecture seule ; les images ne livrent pas les cinq mini-hubs |
| [homeworldRegionsV68.ts](../../../app/game/systems/homeworldRegionsV68.ts) et [HomeworldRegionV68.tsx](../../../app/game/HomeworldRegionV68.tsx) | Trois décors V2 affectés à des panoramas régionaux et utilisés par le rendu | Ce réemploi ne prouve ni la conformité de l'implantation décrite dans le pack ni sa validation artistique |
| [homeworldNpcVariantsV84.json](../../../app/game/data/homeworldNpcVariantsV84.json) | Dix images de PNJ V2 servent de références à dix rôles ; vingt variantes sont enregistrées par rôle | Ces 200 variantes V84 sont un lot distinct, déjà existant ; elles ne s'ajoutent pas aux 204 fichiers sources de ce complément |
| Préparation V5 | Aucun PNG, aucune entrée V5 dans le catalogue V37 examiné | Les quarante sujets restent à produire |

Le champ `status: passed` du reçu V37 décrit son contrôle de conversion historique.
Il ne certifie ni le lore, ni les animations, ni les collisions, ni le comportement
d'un niveau. Le reçu délimite expressément une bibliothèque de références statiques.
Le présent complément réutilise ce registre au lieu d'en importer une seconde copie.
La galerie agrège aussi d'autres collections, notamment V84 : son total affiché
ne doit pas être confondu avec les 204 fichiers V2–V4 de cette conversation.

Les trois affectations de panorama effectivement trouvées sont :

| Source V2 | Région V68 | Lieu déjà nommé dans le code |
| --- | --- | --- |
| `HOMEWORLD_FOREST_V2.png` | `pillar-jungle` | Jungle des Piliers / Terrasses des Hautes Branches |
| `HOMEWORLD_LAVA_V2.png` | `thermal-caves` | Grottes Thermiques / Enclave des Forges Basses |
| `HOMEWORLD_DARKJUNGLE_V2.png` | `forbidden-reserve` | Réserve Interdite / Poste des Gardiens de Réserve |

Cette table constate l'emploi d'une image. Elle ne transforme pas l'Enclave des
Forges Basses en Cour des Forges Basses, ni le poste de confinement en Refuge des
Veilleurs. La fonction et l'identité des lieux restent distinctes.

## 2. Quinze directions, plusieurs états de production

Le [registre galactique](../../../app/game/galaxyRegistry.ts) distingue explicitement
un corps répertorié d'un contrat : `missionPlanetName: null` permet la consultation
de sa fiche sans annoncer une mission complète. Les noms de production ne doivent
donc pas être convertis en nouvelles chasses par leur seule présence en galerie.

| Direction du pack | Identifiant déjà établi | Raccord de campagne | État constaté |
| --- | --- | --- | --- |
| Mycora-Nox | `planet-mycora-nox` | Aucun contrat attaché | Corps `surveyed`, `missionPlanetName: null` ; distinct de Mycora-V et du Cœur-Mère |
| Serekh-9 | `planet-serekh-9` ; `desert-sandmaw` | R2-M024.5 | Chasse existante ; l'adaptation des visuels supplémentaires reste à faire |
| Ferrum-6 | `planet-ferrum-6` | Aucun contrat attaché | Corps `surveyed`, sans mission |
| Nivalis-C | `planet-nivalis-c` | Aucun contrat attaché | Corps `surveyed`, sans mission ; distinct de Nivalis-K |
| Nivalis-K | `planet-nivalis-k` ; `ice-cryostalker` | R2-M024.2 | Chasse existante |
| Kaail-Prime | `planet-kaail-prime` | Aucun contrat attaché | Corps `surveyed`, sans mission |
| Eryndor-V | Nom conservé dans V37 | Aucun raccord de mission établi | Direction artistique ; aucune entrée de ce nom dans le registre galactique examiné |
| Oseris-IV | `planet-oseris-iv` ; `jungle-vey` | R2-M024.1 | Chasse existante |
| Sequoia-IX | Nom conservé dans V37 | Aucun raccord de mission établi | Direction artistique ; aucune entrée de ce nom dans le registre galactique examiné |
| Umbra-Terminus | `planet-umbra-terminus` | Aucun contrat attaché | Corps `surveyed`, sans mission |
| Khar-Sul | Nom conservé dans V37 | Aucun raccord de mission établi | Direction artistique ; aucune entrée de ce nom dans le registre galactique examiné |
| Cinder-12 | `planet-cinder-12` ; `volcano-bad-blood` | R2-M024.3 | Chasse existante ; distincte de la Caldeira du Homeworld |
| Pelagos-M | `planet-pelagos-m` ; `ocean-leviathan` | R2-M024.6 | Chasse existante |
| Xeno Prime | `PLAN08` dans le classeur V6 | R2-M025–M027 / L-07 | Arc écrit ; raccord au [Berceau enfoui](../xeno-prime/README.md), sans corps galactique de ce nom dans le registre examiné |
| Vardos-III | `planet-vardos-iii` | Aucun contrat attaché | Corps `surveyed`, sans mission ; l'œcuménopole industrielle est une création du projet |

Ainsi, les quinze directions correspondent à **cinq chasses existantes, six corps
répertoriés sans mission, trois directions artistiques sans entrée galactique dans
le registre examiné, et l'arc écrit de Xeno Prime**. Cela ne réduit pas les huit
chasses historiques : Naraka-Delta, Mycora-V et Acheron-Sigma restent présentes
dans [data.ts](../../../app/game/data.ts) et la bible, même sans direction dédiée
dans ce lot. Les identifiants et le découpage des huit chasses restent inchangés.

Les environnements et populations déjà écrits dans `galaxyRegistry.ts` font partie
du raccord : par exemple, Nivalis-C est une toundra saline, Kaail-Prime une savane
à mégafaune sans colonie, et Vardos-III une œcuménopole à population humanoïde dense
et sécurité corporatiste. Le style cyberpunk demandé développe cette dernière
direction sans la transformer en Los Angeles, en planète canonique ou en cité
entièrement yautja.

### Les `PLANxx` ne sont pas des alias déduits du biome

Le [classeur V6](../../suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx)
a été lu depuis le blob Git `c0ce09f644f44fad77de9ee6af33fb9101cc49a2` :
2 101 543 octets, SHA-256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
L'onglet `Atlas des mondes`, lignes 6 à 29, contient les identités suivantes :

| ID V6 | Nom V6 | ID V6 | Nom V6 |
| --- | --- | --- | --- |
| PLAN01 | Homeworld | PLAN13 | Namarra |
| PLAN02 | Kharuun | PLAN14 | Qorr |
| PLAN03 | Vara-Kesh | PLAN15 | Asha-Ruun |
| PLAN04 | Nereth | PLAN16 | Vor-Kel |
| PLAN05 | Oshara | PLAN17 | Tala-Mor |
| PLAN06 | Rukh Tal | PLAN18 | Enshar |
| PLAN07 | Sileth | PLAN19 | Korthas |
| PLAN08 | Xeno Prime | PLAN20 | Vesh-Kar |
| PLAN09 | Dharos | PLAN21 | Oruun |
| PLAN10 | Morrak | PLAN22 | Sahr-Keth |
| PLAN11 | Eshra | PLAN23 | Ilyss |
| PLAN12 | Terek-Va | PLAN24 | Ura-Denn |

Seul **Xeno Prime** est un nom exact commun aux quinze directions et à cet atlas.
Kharuun n'est pas renommé Serekh-9, Vara-Kesh n'est pas renommé Oseris-IV et Dharos
n'est pas renommé Vardos-III. Le théâtre RTS Nivalis du
[registre de guerre](../../../app/game/systems/clanWarPlanetsV96.ts) ne devient
ni Nivalis-C ni Nivalis-K. Une future unification de catalogues demanderait une
décision d'identité explicite et la conservation des sauvegardes, routes et missions.

Xeno Prime garde le raccord déjà décidé : **XP-Z11 → XP-Z12**, développé par les
douze tableaux locaux du Berceau. **XP-Z09 reste la tête morte** ; aucun paysage,
accessoire ou trophée illustré de V2/V3 ne remplace la victoire, le prélèvement et
le retour de la crête. Les 23 sprites encore absents du Berceau restent dans son
propre suivi, indépendamment des 40 sujets V5.

## 3. Les cinq communautés complètent le Homeworld

Les cinq clés du pack désignent des familles artistiques et des communautés
originales. Les correspondances ci-dessous séparent identité établie, réemploi
graphique et implantation encore à réaliser.

| Clé du pack | Nom retenu | Correspondance déjà présente | Décision de raccord |
| --- | --- | --- | --- |
| `DESERT` | Peuple des Citernes | `glass-desert`, Village des Citernes, Peuple des Citernes ; références de rôles V84 | Prolonger cette communauté existante, conserver Vek’shan, Isha’ren et les résidents déjà écrits ; aucun doublon créé par un portrait |
| `FOREST` | Terrasses des Hautes Branches | `pillar-jungle`, Terrasses des Hautes Branches, communauté nommée Gardiens des Hautes Branches | Terrasses est le lieu, Gardiens est le nom de communauté dans V68 ; conserver cette articulation et la cité de pierre |
| `SLUMS` | Cour des Forges Basses | Nom de groupe V84 et famille du dossier V37 ; aucune région V68 nommée Slums | Raccord local à réaliser dans les rues et ateliers de la cité ; les quartiers `forges` et `undercity` sont des points d'entrée à examiner, pas une identité déjà validée |
| `LAVA` | Forges de la Caldeira | Groupe V84 ; panorama LAVA utilisé par `thermal-caves` | Rattacher les nouveaux lieux à la région Lave sans renommer l'Enclave des Forges Basses ni absorber la Cour des Forges Basses ; implantation précise à établir |
| `DARKJUNGLE` | Refuge des Veilleurs | Groupe V84 et famille du dossier V37 ; panorama DARKJUNGLE utilisé par `forbidden-reserve` | Refuge souterrain distinct ; raccord local et trajet à établir. Le réemploi du décor du poste de confinement ne prouve pas que le refuge est construit |

Les **Veilleurs des Eaux Calmes** (`luminous-marshes`) et les **Veilleurs des Crêtes**
(`storm-chain`) conservent leur identité. Ils ne sont pas fusionnés avec le Refuge
des Veilleurs parce qu'ils partagent un mot. Les **Artisans de la Roche Chaude**,
leur **Enclave des Forges Basses** et le guide Kha’ru restent identifiés séparément
de la **Cour des Forges Basses** des SLUMS.

Les régions V68 possèdent déjà des maisons communes, forges, cliniques, archives
et demeures. Les lieux V5 doivent d'abord être rapprochés de ces usages existants
avant de créer une nouvelle pièce. Un nouveau visuel de soins ne crée pas un
second médecin portant automatiquement le nom du résident en place.

### Six régions cibles, dix régions V68 et cinq familles visuelles

La décision du 5 novembre dans la bible fixe **six régions du monde natal**.
Le code V68 conserve **dix identifiants régionaux** ; le dossier V37 décrit
**cinq familles artistiques**. Ce sont trois niveaux de description différents.
Le présent ajout ne réduit ni ne renumérote les dix régions sauvegardées.

| Région cible de la bible | Accès cible | Raccord existant à préserver ou à préciser |
| --- | --- | --- |
| Désert | Unblooded | `glass-desert` et Citernes ; trajet depuis la cité |
| Slums | Unblooded | Quartiers habités et ateliers de la cité ; implantation spécifique encore à préciser |
| Jungle humide | Unblooded | `pillar-jungle` et Hautes Branches ; les autres enclaves ne sont pas ouvertes automatiquement |
| Lave | Young Blood | Forges, terrains volcaniques et `thermal-caves` ; correspondance géographique détaillée à établir |
| Glacier | Young Blood | `cold-crown` et lieux froids existants ; région conservée sans pack tribal dédié |
| Marais | Young Blood | `luminous-marshes` et lieux humides existants ; région conservée sans pack tribal dédié |

Les dix IDs V68 sont `ash-marches`, `glass-desert`, `pillar-jungle`,
`luminous-marshes`, `storm-chain`, `leviathan-coast`, `thermal-caves`,
`cold-crown`, `first-city-ruins` et `forbidden-reserve`. L'affectation de tous
leurs secteurs aux six régions cibles reste un travail de géographie et de
progression ; une proximité de climat ne suffit pas à l'effectuer silencieusement.

**Écart de progression identifié :**
[homeworldAccessV69.ts](../../../app/game/systems/homeworldAccessV69.ts) ouvre les
villages ordinaires aux jeunes Unblooded ou Young Blood après la formation et
les Premières Pistes enregistrées. Dans `canEnterHomeworldRegionV68`, le contrôle
supplémentaire visible concerne le rapport du Désert de Verre avant le poste de
confinement. Ces fonctions ne matérialisent pas encore les trois accès régionaux
distincts Young Blood du tableau cible. Les campagnes adultes anciennes conservent
par ailleurs leur politique d'accès existante.

Le dossier V37 affiche historiquement DARKJUNGLE à Young Blood. Cette intention
reste tracée pour le Refuge, mais ne le transforme pas en septième région globale
et ne remplace pas Glacier ou Marais. La reprise doit choisir son trajet local,
son prérequis effectif et la migration compatible des sauvegardes. **Cette PR
documentaire n'a modifié aucun de ces accès.**

## 4. Six origines et personnes déjà écrites

Les six départs **O1 Rejeté du clan, O2 Héritier du masque, O3 Porteur des derniers
noms, O4 Nom entaché, O5 Dette envers l'Étranger et O6 La Longue Chasse** sont des
origines narratives. Elles restent indépendantes des cinq clés artistiques et
des six régions. Le clan d'origine conserve son nom attribué à la nouvelle partie
et les propositions déjà écrites dans la bible ; choisir DESERT ou FOREST ne le
renomme pas automatiquement.

Saar, Vek, les partenaires Yena et Tov, Harek et les autres personnes déjà établies
conservent leurs identités, leur parcours et leurs conséquences. Vek’shan, guide
des Citernes, n'est pas fusionné avec Vek par ressemblance de nom. La planète
Serekh-9 n'est pas le compagnon Serekh.

Le [registre de portraits V85](../../../app/game/data/homeworldVillagePortraitReferencesV85.json)
porte le statut explicite `source-reference-not-person-identity` pour ses propres
références de guetteurs : les profils de production ne remplacent pas les
personnes nommées du Homeworld. La même séparation gouverne les membres V2/V4/V5 :
une fonction, une apparence, une variante et un individu recruté sont des données
différentes. Une concordance de rôle ne vaut pas décision d'identité.

Les dix rôles V84 déjà liés à ces familles sont les hydrologues et intendants des
Citernes, les bâtisseurs et archivistes des Hautes Branches, les mécaniciens et
négociants des Forges Basses, les fondeurs et médecins de la Caldeira, puis les
botanistes et guides des Veilleurs. Leurs 200 variantes sont déjà enregistrées
comme poses statiques dans un lot distinct. Les membres V4 et V5 doivent enrichir
des fonctions ou individus définis, sans recréer ces séries à partir de zéro.

Le [contrat compagnons](../COMPAGNONS_ET_ALLIES_PREMIUM.md) reste applicable :
recrutement et affectation explicites, âge et mort définitive conservés, aucune
présence simultanée à bord et sur le terrain. Les locaux de soins et de repos
proposés n'ajoutent pas de cabine par défaut ni de neuvième salle au vaisseau.

## 5. Ce que ce raccord ne valide pas encore

Les données permettent d'éviter les doubles imports et les identités contradictoires.
L'usage jouable de chaque ajout demande encore son emplacement, son échelle, ses
accès, ses interactions, ses variantes d'état, ses animations éventuelles et sa
persistance. Les matières nécessitent leur contrôle de raccord répétable et leurs
cartes de rendu ; les scènes aplaties ne fournissent pas des plans de parallaxe.

Aucun nouveau rang, contrat, compagnon, territoire de guerre ou voyage Warp n'est
accordé par ce complément. Les preuves artistiques et de lore restent propres à
chaque référence et à chaque continuité. Le résultat de cet audit est une
concordance vérifiable des sources et des registres, sans test de gameplay ni
nouvelle validation artistique humaine.
