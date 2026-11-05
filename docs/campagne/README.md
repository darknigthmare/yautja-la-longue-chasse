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

## Statut de production

Les éléments marqués « proposé » sont des propositions de conception à valider.
Les règles de recrutement et de Warp demandées sont documentées ; les quêtes,
comportements, modules et assets nouveaux restent à produire ou à intégrer selon
leur état propre. Les références de lore du catalogue nécessitent leur dossier
d'œuvre/continuité avant production des héros Héritage.

Aucun code, asset binaire ou fichier de sauvegarde n'est modifié par ces ajouts documentaires.
Aucun build, parcours en jeu, test comportemental ou validation artistique n'est
revendiqué par leur seule présence dans cette PR. Le contrôle des archives Warp
est une vérification de fichiers sources, distincte d'une QA du jeu.
