# Bible de campagne

## Document principal et note de référence

- [BIBLE_DE_CAMPAGNE.md](BIBLE_DE_CAMPAGNE.md) : export du 5 novembre 2026 du document vivant
  https://claude.ai/artifact/XidnmiofkYMgRZKGLEWD52 (version de travail ; le
  document en ligne fait foi s'il évolue, sous réserve de réconcilier les décisions
  explicites des compléments ci-dessous plutôt que les écraser silencieusement).
- [note-rangs-2022-06-27.jpg](note-rangs-2022-06-27.jpg) : note d'origine sur l'échelle des rangs
  (Level 0 → 10), reprise et complétée dans la section « Échelle des rangs ».

Contenu : 68 missions (60 fiches « Campagne commune » du classeur V6 + 8 chasses),
référentiel lore 1:1 avec sources, campagne révisée (L-01 → L-10), échelle des
rangs, influence des six départs, honneur / Bad Blood / Enforcer, Warp d'après le
lore NECA, besoins props / VFX / SFX par mission et 48 prompts musicaux Flow Music,
et les décisions de conception du 5 novembre 2026.

## Complément demandé le 5 novembre 2026 : compagnons recrutables

Ces annexes font partie de la bible de campagne dans cette PR. Elles conservent
l'export principal et ses fiches au lieu de les remplacer par une nouvelle campagne.

| Document | Contenu |
| --- | --- |
| [COMPAGNONS_ET_ALLIES_PREMIUM.md](COMPAGNONS_ET_ALLIES_PREMIUM.md) | Recrutement non automatique ; affectation et présence ; modules conditionnels ; raccord aux rangs, triades, huit salles, Clan Ship, honneur, transports et sauvegardes ; 28 scénarios d'acceptation à produire/tester. |
| [CATALOGUE_COMPAGNONS.md](CATALOGUE_COMPAGNONS.md) | 24 références d'œuvres ou de concepts, 30 créations initiales et 16 fiches Premium originales. Serekh et Keth/Trois-Clics sont enrichis sans doublons : 44 identités originales au total, dont 16 Premium. |

### Concordance obligatoire

La section « Campagne révisée lore 1:1 » de la bible prime sur les anciennes fiches
quand elles divergent. Les annexes utilisent ses jalons nommés : vaisseau personnel
après Blooded, puis accès au navire de clan après la voie de commandement choisie.
Elles ne rétablissent pas les anciens repères numériques r4/r9 de la discussion.

Les huit salles fonctionnelles de M022 restent intactes. Les quartiers, habitats,
objets personnels et services d'un allié exigent son recrutement et son affectation
active au navire concerné. Un allié déployé reste affecté : sa cabine ne disparaît
pas et son avatar ne se duplique pas à bord. Les capacités 7 / 13 / 19 du Clan Ship
ne sont pas des occupants automatiquement recrutés.

Les décisions explicites du propriétaire du jeu sont enregistrées sous ALL-01 à
ALL-10 dans l'annexe système. Une évolution du document vivant doit être rapprochée
de ces décisions ; elle ne doit pas réintroduire silencieusement des compagnons ou
compartiments personnels par défaut. Les personnages déjà établis, dont Saar et Vek,
ne sont ni remplacés ni dupliqués par les propositions du catalogue.

## Complément demandé le 5 novembre 2026 : Warp Universe

Les documents Warp font partie de cette même bible et de cette même PR :

| Document | Contenu |
| --- | --- |
| [WARP_UNIVERSE.md](WARP_UNIVERSE.md) | Accès Adjutant après plusieurs planètes, raccord aux M029–M034 et à l'arc du prototype ; Expéditions, Chroniques cinéma et Réécritures ; 12 familles d'époques, 36 propositions de missions et 9 chroniques terrestres ; sauvegardes, justice, récompenses, portail, véhicules et besoins d'animation/audio. |
| [WARP_UNIVERSE_ASSETS.md](WARP_UNIVERSE_ASSETS.md) | Inventaire exact des 170 PNG des cinq archives récupérées : noms, dimensions, SHA-256 des archives, provenance et limites. 146 sprites transparents et 24 fonds opaques contrôlés techniquement ; aucune intégration runtime ou certification artistique prétendue. |
| [WARP_UNIVERSE_REPRISE.md](WARP_UNIVERSE_REPRISE.md) | 40 images non livrées, identifiants conservés, priorités proposées, travaux de gameplay/animation/audio distincts et 28 contrôles d'acceptation Warp encore ouverts. |

Les valeurs « 12 missions / 4 planètes » restent une proposition d'équilibrage,
pas un verrou ajouté aux huit chasses existantes. Le Warp reste facultatif et
n'exige pas de clan ship. Les 36 propositions n'augmentent pas le compte des
68 fiches historiques en missions déjà jouables. Les binaires PNG restent dans
les archives sources : cette PR en ajoute le catalogue et la traçabilité, pas
une importation sous `public/`.

### Articulation avec les compagnons

**Précision de portée pour l'annexe compagnons :** la restriction de L-10 concernant
les personnages des films s'applique aux expéditions originales, et non aux Chroniques
cinéma séparées définies dans Warp Universe. M058 demeure une chronique avancée, pas
un verrou global au rang Ancient pour toutes les Chroniques déjà ouvertes à Adjutant.
Le complément Warp fait foi sur ces modes ; le complément compagnons fait foi sur
le recrutement, l'affectation et les quartiers personnels.

Débloquer un avatar de Chronique ou conclure une Réécriture ne recrute personne
automatiquement. Un héros ne devient un allié de campagne qu'après une mission
spécifique, un accord et une issue de continuité compatibles, puis une affectation
explicite pour sa présence à bord. Les inventaires d'instance, droits de représentation
et récompenses sont distincts des individus vivants ; aucun clone de compagnon n'est
créé en terminant un film. Cette règle concorde avec la section 7 de Warp Universe.

## Complément demandé le 5 novembre 2026 : véhicules et destriers

| Document | Contenu |
| --- | --- |
| [Mobilité : contrat de raccord](mobilite/README.md) | Progression L-01 à L-10, huit chasses, garage/écuries, hangar du Clan Ship, BOND, combat, cargo, poursuites, insertion, justice et sauvegardes. |
| [Index des 50 fiches](mobilite/INDEX.md) | 24 machines/utilitaires/insertion, 10 engins Bad Blood/Enforcer, 16 montures ; toutes les caractéristiques originales conservées dans cinq blocs JSON. |
| [Prompt Codex](mobilite/PROMPT_CODEX.md) | Futur raccord à l'architecture réelle ; trois boucles pilotes avant généralisation ; aucune implémentation déclarée par la spécification. |
| [Production visuelle et sonore](mobilite/PRODUCTION_VISUELLE.md) | Briefs individuels, socles d'animations, vues séparées, cavalier entier, VFX/SFX et validation humaine. |
| [Vérification](mobilite/VERIFICATION.md) · [manifeste](mobilite/MANIFEST.json) | Conservation des données source, empreintes, contrôles documentaires et limites explicites. |

La mobilité complète les annexes précédentes sans les remplacer. Les rites du trio
et du solitaire ne sont pas contournables ; aucun véhicule ne donne un rang. Les
animaux respectent ALL-01 à ALL-10 : pas d'habitat ni de présence à bord avant
acquisition/recrutement, affectation et compatibilité réelle. Bastion, Tranchevent,
Nacre et les autres individus ne sont pas dupliqués par les définitions de montures.
Le catalogue de production ne dévoile pas les inconnus dans le codex joueur.

Réutiliser le hangar et la table holo du Clan Ship, le quartier des Forges et le
spatioport existants. Aucun nouveau monde, second registre de trophées ou transfert
Warp n'est accordé automatiquement. Les références Kenner/Badlands sont distinguées
des extrapolations et créations originales ; la fidélité 1:1 reste à valider sur
références primaires. Les 50 fiches ne signifient pas 50 engins jouables.

Les exports bible détaillée, JSON complet, 50 prompts et CSV sont reproductibles
sans dépendance réseau avec l'outil documentaire :

```sh
python3 docs/campagne/mobilite/export_catalogue.py --out /tmp/yautja-mobilite
```

## Complément demandé le 5 novembre 2026 : Xeno Prime — Le Berceau enfoui

Le secteur, les sprites individuels et les compositions du Berceau font partie de
cette même bible. Le complément rassemble la conception du niveau, son boss final,
les ressources effectivement produites et le travail restant.

| Document | Contenu |
| --- | --- |
| [Secteur et boss](xeno-prime/README.md) | Douze tableaux locaux, itinéraire principal, détours, raccourcis, trois balises physiques et Matriarche enracinée révélée au dernier tableau ; progression, extraction et raccords aux autres annexes. |
| [Catalogue des ressources](xeno-prime/ASSETS.md) · [données](xeno-prime/DONNEES_ASSETS.json) | 150 sprites transparents et six fonds opaques, dont les 23 ajouts V2.2 et les 42 raccords V2.3 ; dimensions, empreintes et archives téléchargeables. 25 exports de scènes, dont 23 images distinctes, sans les compter comme de nouveaux sprites. |
| [Compositions](xeno-prime/SCENES_ILLUSTREES.json) · [souffle du boss](xeno-prime/COMPOSITION_SOUFFLE.json) | Douze scènes et 312 placements d’origine conservés, états avant/après et démonstration du jet rattaché à la bouche ; données d’illustration, sans collisions ni comportements déjà intégrés. |
| [Reprise de production](xeno-prime/REPRISE.md) · [prompts et dépendances](xeno-prime/REPRISE_ASSETS.json) | 23 demandes initiales complétées, puis 42 raccords V2.3 : 150 sprites disponibles. 23 états de tête et quatre états du bulbe ; poses et parties séparées, sans validation d’animation en jeu. |
| [Contrat d’intégration et QA](xeno-prime/INTEGRATION_ET_QA.md) · [vérification](xeno-prime/VERIFICATION.md) | États de mission, preuve de crête, sauvegardes, compagnons, mobilité, caméra et 28 contrôles de jeu à exécuter ; vérifications documentaires et concordance avec le classeur V6. [Production du 6 novembre](xeno-prime/PRODUCTION_20261106.md). |

Les [42 raccords V2.3](xeno-prime/RACCORDS_V23.md) complètent les attaques, interactions et le prélèvement ; [23 suites de poses](xeno-prime/SEQUENCES_RACCORDS.json) en documentent l’ordre de revue.

### Concordance avec Xeno Prime et la progression

**Décision de raccord : le Berceau développe localement PLAN08 / XP-Z12, Arène de
la reine active, depuis XP-Z11.** Les identifiants `XENO-BE-T01` à `XENO-BE-T12`
désignent les douze tableaux de ce secteur, pas les douze zones globales de la
planète. **XP-Z09 reste la tête de reine morte, inerte et sans validation de
victoire** du classeur. T09 reste une pouponnière locale ; seule T12 révèle la
tête entière de la Matriarche active du Berceau. Les trois hauteurs, deux refuges
et l’extraction de secours prévus pour XP-Z12 restent des contraintes à réaliser.

Le raccord conserve R2-M025 (préparer), R2-M026 / L-07 (vaincre et prélever) et
R2-M027 (rapporter et débriefer). Xeno Prime est l’arc écrit après les huit
chasses ; ces tableaux ne deviennent pas douze missions supplémentaires dans
les 68 fiches historiques. L’accès Blooded n’exige pas déjà Élite. Le rang Élite
demande toujours le Quatza-Rij solitaire de L-05, les rites de L-06, la victoire
sur la reine et une crête réellement extraite et rapportée. Une image de trophée
ne valide aucune de ces étapes.

Les règles ALL-01 à ALL-10, les limites des montures et véhicules et la présence
réelle au vaisseau restent applicables. Le vaisseau personnel suffit ; ni Clan
Ship ni Warp ne sont nécessaires à cette expédition physique. Le boss local ne
remplace ni Cœur-Mère de Mycora-V, ni la reine de la pyramide, ni la Reine Mère ou
la planète vivante des arcs ultérieurs. Les influences visuelles demandées sont
identifiées comme inspirations d’une création originale du projet.

<!-- planetes-tribus-bible:start -->
## Complément demandé le 5 novembre 2026 : planètes et tribus — V2 à V5

Le contenu de la conversation sur les planètes, les cinq communautés du monde natal,
leurs membres, trônes, textures, décors et services rejoint cette même bible et cette
même PR. L'inventaire rapproche les archives effectivement livrées des registres du
dépôt, puis conserve séparément les sujets préparés et les usages restant à réaliser.

| Document | Contenu |
| --- | --- |
| [Contrat de raccord](planetes-tribus/README.md) | Douze décisions PT-01 à PT-12 ; rangs, identité, géographie, compagnons, mobilité, Warp et distinction des états de production. |
| [Quinze directions planétaires](planetes-tribus/PLANETES.md) | Cinq chasses existantes, six corps galactiques répertoriés sans mission, trois directions artistiques et Xeno Prime / PLAN08 ; usages des six images par monde. |
| [Cinq communautés](planetes-tribus/TRIBUS.md) · [scénarios civils](planetes-tribus/SCENARIOS_CIVILS.md) | Citernes, Hautes Branches, Cour des Forges Basses, Caldeira et Veilleurs ; architecture, trônes, membres, fonctions locales, vingt situations V4, cinq enchaînements V4 et cinq boucles V5. |
| [Images et archives](planetes-tribus/ASSETS.md) · [données complètes](planetes-tribus/DONNEES_ASSETS.json) | 246 PNG sources livrés : 204 historiques V2–V4 et 42 nouvelles sorties V5/corrections ; 170 avec alpha, 51 scènes opaques et 25 matières. Les 204 références V37 restent inchangées ; les 42 nouvelles sources ne sont pas importées. |
| [Raccord à l'existant](planetes-tribus/RACCORD_EXISTANT.md) · [concordance structurée](planetes-tribus/RACCORD_EXISTANT.json) | Correspondance exacte des 204 sources avec V37, dérivés présents, usages relevés dans le code, identités et divergences de régions/accessibilité. |
| [Reprise](planetes-tribus/REPRISE.md) · [40 consignes V5](planetes-tribus/REPRISE_V5.json) | 40 sujets V5 livrés et deux citernes corrigées ; [archives et catalogue](planetes-tribus/LIVRAISON_V5.md), travail de jeu et suivi des 24 contrôles d'acceptation. |
| [Références de franchise](planetes-tribus/SOURCES_LORE.md) · [textes source conservés](planetes-tribus/TEXTES_SOURCE.json) | Sept sources NECA attribuées avec leurs limites ; œuvres/produits sous licence séparés des créations originales et des anciens textes de production. |
| [Vérification et limites](planetes-tribus/VERIFICATION.md) | Audit des quatre archives, conservation des données, rapprochement au dépôt et revue visuelle ponctuelle ; aucune nouvelle validation artistique humaine ou jouabilité déduite. |

**Les 204 sources V2–V4 sont déjà enregistrées comme références statiques dans V37.**
Leurs 204 WebP principaux et 204 vignettes ne sont pas des images supplémentaires.
Quelques usages et variantes dérivées sont déjà référencés dans le code ; cela
ne signifie pas que les cinq communautés soient entièrement jouables. Ce complément
réutilise ces identifiants et ne réimporte pas une seconde copie des binaires.

**Livraison du 6 novembre 2026 : 40 sujets V5 + deux citernes corrigées, soit 42 PNG natifs.**
Les archives et le catalogue sont reliés dans [LIVRAISON_V5.md](planetes-tribus/LIVRAISON_V5.md).
Le total de sources livrées passe à 246, dont 204 déjà référencées dans V37.
Les 42 nouvelles sorties restent à importer dans le jeu ; les originaux sont conservés.
Le quota de septembre reste un événement historique, distinct de cette production.

Les **42 PNG produits et contrôlés sont remis dans la conversation**, dans six archives. **Nouvelles archives sauvegardées durablement : 0 sur 6.** La sauvegarde durable a échoué lors de `prepare_uploads`, avant transfert/finalisation. Pour les fichiers sans identifiant retourné, aucun lien durable n'est annoncé : **fichier remis dans la conversation ; lien durable en attente**. Les liens de session sont fournis dans la conversation et ne sont pas publiés comme adresses web dans ce dépôt.

### Concordance de géographie, d'identité et de lore

Les cinq communautés originales ne remplacent ni les six départs O1–O6 ni les
dix régions de la carte courante du monde natal. Les six familles du cahier
artistique initial gardent leur rôle de repères visuels ; la capitale, les
liaisons et les accès du 6 novembre sont définis par la bible principale.
Glacier et Marais restent conservés. La Cour des Forges Basses et l'Enclave des
Forges Basses gardent des identités distinctes ; le Refuge des Veilleurs exige un
raccord souterrain explicite, sans absorber les autres groupes nommés Veilleurs.
Les accès initiaux, les promenades Youngling et la progression régionale de la
bible courante restent à rapprocher du comportement du jeu, sans migration
silencieuse des sauvegardes.

Les huit chasses et les 68 fiches restent le socle. Mycora-Nox n'est pas Mycora-V ;
Nivalis-C n'est pas Nivalis-K ; aucun `PLANxx` n'est attribué par ressemblance de
biome. Xeno Prime conserve PLAN08, XP-Z11 → XP-Z12 et la tête morte de XP-Z09 ;
les six visuels généraux V2/V3 ne remplacent pas les ressources propres au Berceau.

La fidélité 1:1 est une exigence de comparaison avec une œuvre ou un produit précis,
pas une certification globale des créations du projet. Les professions et les
sièges communaux n'accordent aucun rang, recrutement, trophée ou titre royal.
Les règles ALL-01 à ALL-10, la mort définitive, les huit salles, la mobilité et
les modes Warp restent applicables. Les personnages déjà nommés, dont Saar et Vek,
ne sont ni remplacés par des portraits de métier ni dupliqués par leurs variantes.
<!-- planetes-tribus-bible:end -->

## Statut de production

Les éléments marqués « proposé » sont des propositions de conception à valider.
Les règles de recrutement et de Warp demandées sont documentées ; les quêtes,
comportements, modules et assets nouveaux restent à produire ou à intégrer selon
leur état propre. Les références de lore du catalogue nécessitent leur dossier
d'œuvre/continuité avant production des héros Héritage.

Aucun code de jeu, asset binaire ou fichier de sauvegarde n'est modifié par ces ajouts documentaires.
Aucun build, parcours en jeu, test comportemental ou validation artistique n'est
revendiqué par leur seule présence dans cette PR. Les contrôles des archives Warp
et du pack Xeno Prime vérifient les fichiers sources ; ils restent distincts d’une
QA du jeu. Les PNG Xeno restent dans leurs archives : cette PR les référence avec
leur statut réel, sans les importer dans `public/`.
