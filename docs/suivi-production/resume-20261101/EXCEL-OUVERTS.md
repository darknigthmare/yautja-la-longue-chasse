# Reprise des classeurs — 1er novembre 2026

Cette lecture porte sur la branche `codex/homeworld-access-followup-20261101`,
après intégration du `main` `f1856f66`, au commit `439370c7`.
Les PR 23 et 24 ont déjà été fusionnées. Leur contenu n'est donc pas un chantier
de PR à rouvrir. La qualification de chasse en cours dans la PR 62 garde son
propre suivi ; ce document ne modifie ni son code ni ses attestations.

## Classeur de coordination de la reprise

Le [classeur de coordination](../../YAUTJA_REPRISE_CHANTIERS_20261101.xlsx)
est distinct des deux classeurs V112. Ses cinq feuilles rassemblent l'instantané
des **33 PR**, leurs **29 dépendances**, les checks observés, l'inventaire de
**27 classeurs locaux et 12 observations ZIP distantes épinglées**, ainsi que les
familles et exigences source ouvertes avec leur prochain livrable.

`PR_Instantane` conserve exactement les 33 PR du relevé. `Synthese` enregistre
séparément la fusion ultérieure de la PR 31 au commit
`81fc1916fc285ca85d3c434737bc35b1e5f2fb7f`, les PR 64 et 65 non auditées et la
modification de tête de la PR 63. Les checks d'origine et les relectures restent
distingués dans `ControlesPR`. Les couches topologiques sont un ordre de revue,
sans prescription de fusion automatique.

La source `PR-STACKS.json` stabilisée conserve désormais neuf événements datés
après le relevé : fusions des PR 31, 33 et 39, changements de tête de la PR 27,
mise à jour et nouvelle base de la PR 39, puis résultats de sa CI spécialisée.
Ils sont tous transcrits dans `Synthese`, avec leur contenu exact et sans
remplacer les checks et dépendances de l'instantané initial.

Un autre événement conservé séparément confirme la base `main` de la PR 33 au
1er novembre à 00:45:30 UTC, avec sa tête `63c345fc7eaf999225df8f35cab787b8152f0b2c`
inchangée. Les octets de ce relevé sont copiés dans
[PR33-RETARGET-EVENT.json](PR33-RETARGET-EVENT.json). La ligne initiale de PR33
conserve sa base et sa dépendance PR31 au moment du premier relevé.

Les valeurs sont du texte littéral, sans formule ni macro. Les cinq feuilles ont
des filtres et quatre lignes/deux colonnes figées. Les liens locaux pointent vers
des fichiers présents ; les observations distantes renvoient aux têtes GitHub
épinglées. [EXCEL-INVENTORY.json](EXCEL-INVENTORY.json) conserve les SHA256, tailles
et nombres de feuilles, en distinguant les octets locaux réellement lus des
observations distantes reprises de l'audit PR. Ce classeur s'exclut de ses propres
entrées et ne rejoint pas le gel du runtime.

```sh
python3 scripts/build-resume-workbook-20261101.py
python3 scripts/build-resume-workbook-20261101.py --check
python3 scripts/verify-resume-workbook-20261101.py
```

La deuxième commande vérifie les octets régénérés. La troisième relit le ZIP/XML
livré, compare les **4 437 cellules** aux données sources, vérifie **484 liens**,
les filtres, les volets figés, l'absence de formule/macro et les événements
séparés. Les journaux sont conservés dans
[coordination-checks](coordination-checks/README.md). Les nombres et empreintes
locaux sont un relevé reproductible ; si un classeur source change ensuite, une
nouvelle génération explicite est nécessaire. Aucun état GitHub vivant ni Excel
natif n'est déduit de ce relevé.

Le [diagnostic de rive du passage des marais](../../qa/homeworld-marsh-edge-diagnostic-20261101/README.md)
reste `OUVERT_NON_CORRIGE` dans `Synthese` et `OuvertsSource`. Les interstices
visuels extérieurs observés en R5/R6 ne sont pas présentés comme un trou physique
dans le parcours du guetteur ; aucun patch app ni correctif artistique qualifié
n'est déduit de ce diagnostic ou des recettes compilées.

## Quel classeur utiliser

| Classeur | Portée et taille vérifiées | Suite à donner |
| --- | --- | --- |
| [YAUTJA_V112_SUIVI.xlsx](../../YAUTJA_V112_SUIVI.xlsx) | 122 feuilles ; 113 feuilles historiques V111 conservées ; suivi transversal Homeworld, Pit, clans, Preserve et provenance. Les neuf feuilles V112 décrivent la publication R4. | Actualiser les preuves après le nouveau gel et les deux recettes compilées complètes, puis régénérer. Ne pas attribuer la validation R4 aux sources réconciliées. |
| [YAUTJA_V112_MECANIQUES_CHASSE.xlsx](../../YAUTJA_V112_MECANIQUES_CHASSE.xlsx) | 19 feuilles, 362 lignes ; douze extensions FUT, règles, paramètres, transitions, qualification et preuves. Source éditable : [hunt-mechanics-v112.json](../../hunt-mechanics-v112.json). | Conserver la distinction entre implémentation, qualification automatique et matériel/usage non qualifié. La PR 62 poursuit ce domaine séparément. |
| [YAUTJA_V111_MECANIQUES_CHASSE.xlsx](../../YAUTJA_V111_MECANIQUES_CHASSE.xlsx) | Huit feuilles ; état antérieur de la chaîne de chasse. | Historique immuable ; les extensions et leurs preuves se lisent dans le classeur de chasse V112. |
| [THE_PIT_V63_SUIVI.xlsx](../../THE_PIT_V63_SUIVI.xlsx) | Cinq feuilles ; combattants, stages et premiers lots. | Historique repris dans les classeurs cumulatifs. Pour les progrès courants Feral / Scar, lire les feuilles V112 et la production native associée. |
| [Suivi variantes V6.15](../v615/Yautja_Suivi_Variantes_V615_2026-10-23.xlsx) | Six feuilles ; production, variantes, sources et contrôles. | Les recettes artistiques et leurs traces gardent leur portée ; les reçus historiques manquants ne sont pas remplacés par une génération nouvelle. |
| [Bible cumulative V6](../classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx) | 139 feuilles ; besoins du jeu, résidence, cité, métiers, guerre, Preserve, scènes et dialogues. | Source de besoins et de cellules exactes ; une description, un simulateur ou une proposition ne constituent pas une implémentation jouable. |
| [Catalogue Yautja tous médias](../../../art-source/v6/catalogue/catalogue_yautja_tous_medias.xlsx) | Douze feuilles ; identités et références artistiques. | Conserver les identités/références avant de produire une incarnation ou de lui attribuer un dessin. |

Les classeurs cumulatifs V99 à V111 restent des états historiques. La conservation
de leurs cellules ne signifie pas que tous leurs comportements sont certifiés sur
le code courant. Les sources et preuves de chaque lot sont distinctes.

## Ouverts transversaux conservés

Le [registre des ouverts V112](../../v112-open-workstreams-audit.json) reprend
**56 exigences source**, dont les neuf actions Feral / Scar. Les **354 cibles
artistiques Homeworld** sont un autre périmètre : le recensement V111 indique
313 candidats à variantes/admission, 40 absences de candidat et une animation
manquante. Une présence dans le dépôt ne suffit pas à admettre une cible.

| Priorité | Famille | Lignes source ouvertes | Prochain résultat vérifiable |
| --- | --- | ---: | --- |
| P1 | Ouvrages de guerre | 6 | Acquisition et accord de campagne par l'autorité réelle, objets et stocks finis, transport/reprise effectifs. Les six ouvrages initiaux de l'exercice V108 restent une fixture déclarée. |
| P1 | Actions Feral / Scar | 9 | Étendre les partenaires/costumes manquants et raccorder objets, réactions, interruptions, collisions et replay de chaque action source. Les prises arrière du duo d'origine restent un progrès borné. |
| P2 | Campagnes Pit | 16 | Produire les scènes et les cinq acteurs absents de ces cellules, avec continuité d'équipement et résultat de la rencontre. |
| P2 | Variantes Feral / Scar | 14 | Produire les états masque, équipement, armure et camouflage autorisés, leurs transitions et les deux sens natifs. |
| P2 | Identités / kits Pit | 7 | Fixer les références nominatives, puis livrer l'apparence et le kit complet ; quatre identités visuelles restent indéterminées dans ce suivi. |
| P2 | Preserve | 2 | Le suivi V109 hérité indiquait 32 secteurs / 64 adultes, pour des cibles 80 / 100 ; les 48 secteurs et 36 adultes restants exigent leurs propres fiches et ressources. Ce n'est pas une nouvelle mesure de la branche courante. |
| P3 | Provenance Enforcers | 2 | Récupérer les 21 reçus V6.13 et 36 traces/PNG V6.10 historiques authentiques. |

Les nouvelles mécaniques de chasse V112 ne ferment pas, à elles seules, ces lignes
source anciennes. Les besoins Homeworld de rôles, dialogues, activités, intérieurs
et variantes restent également distincts des corrections locales de placement.

## Chasse V112 : contrôles effectués pendant cette reprise

Les commandes suivantes passent sur les octets présents, sans réécrire le classeur :

```sh
node scripts/build-hunt-mechanics-workbook-v112.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v112.py
```

Résultat : 19 feuilles, 362 lignes, **2 264 cellules et 327 liens contrôlés**.
Le classeur compte 43 recettes `VALIDE_AUTOMATISE` et une recette `A_EXECUTER`
(`QA112-41`), avec `PRF112-03` et `PRF112-04` conservées `A_EXECUTER` dans la
feuille Preuves. Ces lignes documentaires attendent la consignation par leur lot
de qualification ; la réussite locale ci-dessus ne réécrit pas leurs anciennes
attestations. `FUT-11`, `FUT-12` et la preuve de matériel physique restent
`NON_QUALIFIE` dans les périmètres indiqués.

Empreinte du classeur vérifié : **444 448 octets**,
SHA256 `1b13e05253640034458601f62032fb21e7be4cf1d30f2a2a4912e63dae229b29`.
Aucun Excel natif, recalcul natif, téléphone ou contrôleur physique n'a été exécuté
par ces deux contrôles ZIP/XML.

## Actualisation du suivi Homeworld

La collecte courante refuse correctement le registre avant actualisation :
l'audit spatial enregistré à 27 632 octets fait maintenant 94 335 octets après
protection des activités fixes. Le gel R4 diffère aussi sur 44 entrées de la base
réconciliée inspectée. Le nouveau registre ne peut donc pas réutiliser les anciens
certificats comme preuves courantes.

Les trois métadonnées historiques V111 et le classeur V111 restent identiques aux
empreintes attendues par le générateur. Les capsules historiques existantes
suffisent à leur périmètre ; aucun relâchement de vérification ni nouvelle capsule
n'est nécessaire pour accepter de vraies preuves compilées de la nouvelle base.

Ordre de finalisation :

1. Terminer et geler la correction du nouveau marqueur de registre, en protégeant
   les 64 coordonnées fixes et 30 parcours des activités existantes.
2. Construire la production, puis exécuter les recettes Homeworld et Pit complètes
   sur le même commit et le même Build ID, avec toutes les captures inspectées.
3. Actualiser les empreintes du registre, les portées et les preuves de validation.
4. Régénérer les neuf feuilles V112, contrôler les 122 feuilles et les 113 parties
   historiques, exécuter les 14 contrôles du suivi puis reproduire les octets.

Cette reprise ne ferme aucune exigence sans sa preuve propre et conserve les
échecs/tentatives antérieurs dans leur contexte historique.

## Capsules historiques vérifiées pendant la reprise

Les trois commandes CI demandées passent avec leurs assertions originales et
leurs copies privées : `check-homeworld-history-v112.mjs --check --tests`
(68 assertions, 1 433 entrées), `check-excel-history-homeworld-v112.mjs --check --tests`
(132 assertions V111/V90) et `check-excel-history-compat-v112.mjs --check --tests`
(56 assertions V110, 1 386 entrées). Les classeurs V111 et V110 sont reproduits
à l'identique ; les onze empreintes consignées des scripts, capsules, gels et
classeurs restent inchangées après les commandes.

Les 68 assertions recouvrent une partie de la suite de 132 et ne s'additionnent
pas comme des comportements distincts. Ces réussites historiques ne certifient
pas le code courant. Les journaux complets, commandes, résultats et SHA256 se
trouvent dans [history-checks](history-checks/README.md).

## Contrôles courants avant publication R7

Une exécution unique des 35 fichiers V112 courants passe **375 assertions**,
sans échec, annulation ni test ignoré, sur le runtime
`bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1` et le gel
`c35f8b454ec26d1b05852cabbe4f6ee111d71e7413aef80282582d3ca5ee6a3e`.
Les deux suites de suivi Excel/certificat sont exclues exactement, en attendant
les certificats compilés des deux domaines ; les historiques aux mêmes onze
empreintes ne sont pas rejoués. Ce résultat ne remplace pas les parcours
navigateurs ni une admission artistique. Commande complète, empreintes et journal :
[current-checks-r7](current-checks-r7/README.md).
