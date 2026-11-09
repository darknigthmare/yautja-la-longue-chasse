# Archive V115 — recette navigateur du 9 novembre 2026

La [troisième exécution](attempt-3/report.json) réussit **17 contrôles natifs**
dans Chromium 154.0.8037.57. Ses **douze captures originales ont été ouvertes**
et leur portée est consignée dans
[screenshot-inspection.json](attempt-3/screenshot-inspection.json).
Les 77 entrées de compilation restent identiques avant et après le parcours.
Aucune erreur JavaScript, console, HTTP, requête ou ressource manquante n’a été
observée.

Le vrai composant `ClanWarOperationsV115` et ses reducers tournent dans la fixture
esbuild V151 existante. Le stockage, IndexedDB et Web Locks sont ceux du navigateur.
**Cette recette ne couvre pas Next, le GameClient complet, une manette physique
ou du multijoueur distant.** Aucune validation artistique humaine n’est attribuée.

Deux onglets exercent le lancement RTS, le tick réel, le gel par un verrou natif,
la reprise, le refus d’une archive périmée puis son rechargement sans écriture.
Le même mandat reste à une seule dépense d’entretien : 120 → 119 RAV.

Un contexte navigateur neuf exerce ensuite une interruption documentée : le
wrapper appelle le vrai `IDBObjectStore.put` de confirmation puis interrompt
sa transaction native avec `abort()`. L’intention déjà validée reste dans le vrai
IndexedDB. Le miroir est exclusivement écrit par le code du jeu. La recharge
retrouve l’intention en lecture seule ; deux événements réels `button.click()`
dans une même tâche éprouvent le garde d’écriture occupée. La réparation confirme
exactement une fois le token initial, sans rejouer le lancement ni réécrire les
octets identiques. Une seconde recharge retrouve l’archive confirmée et son coût
unique.

Le [reçu final](attempt-3/final-receipt.json) distingue le rapport brut, la revue
des captures et la recette exacte exécutée. Les JSON d’étape conservent le miroir,
le registre IDB et les appels natifs observés.

## Ancien client et migration explicite

La clé actuelle est `yautja.clan-war.v115.operations.fenced.v2`. L’ancienne clé
`yautja.clan-war.v115.operations.free.v1` est conservée sans écriture ni suppression
par le nouveau client. Le schéma de l’état V115 reste inchangé : aucun mandat,
débit, rapport ou résultat n’est rejoué lors de la copie.

La fixture sert aussi un ancien client construit avec **deux sources exactes du
commit `39b601ce`** : le composant V115 et son modèle. Les autres dépendances sont
les fichiers courants déclarés ; ce n’est pas une reconstruction complète d’un
ancien checkout ou d’un ancien build Next. Les deux sources réellement compilées
sont [archivées séparément](attempt-3/legacy-sources/) avec leurs empreintes dans
le rapport. L’ancien JavaScript servi possède sa propre empreinte ; les hashes
des fichiers courants ne sont pas attribués aux anciennes sources injectées
dans la compilation.

L’ancien composant lance réellement un mandat et écrit son ancienne clé via son
gestionnaire natif. Le nouveau composant présente une version en lecture seule,
permet son export puis exige le clic **Adopter**. Après cette adoption, l’ancien
client écrit encore son ancienne clé pendant que le verrou canonique est tenu :
les octets et le registre canonique restent inchangés. Un ordre du nouveau client
fonctionne ensuite, conserve les 119 RAV et ne modifie pas la branche ancienne.
Un second téléchargement natif récupère cette branche depuis l’interface actuelle.
Les [observations et téléchargements](attempt-3/legacy-migration-native.json)
conservent cette séparation.

L’adoption copie **l’instantané présenté**, revalidé avant la réservation canonique.
Un ancien client peut évoluer pendant ou après cette réservation ; sa nouvelle
progression reste dans l’ancienne clé et demeure exportable. Il n’existe pas de CAS
atomique entre localStorage et un ancien client qui ignore le protocole actuel,
ni de fusion automatique de deux branches. Ce contrat n’est pas une protection
contre un client malveillant connaissant la nouvelle clé ou du multijoueur distant.

Les **25 tests de domaine** incluent l’apparition tardive d’une ancienne archive,
le refus d’une adoption périmée, les intentions et forks anciens bloqués avec leurs
sources exportables, ainsi que la course d’un ancien écrivain pendant la réservation.
Ces cas de domaine ne sont pas tous présentés comme des parcours navigateur.

## Exécutions antérieures conservées

La [première exécution](attempt-1/report.browser-run.json) conserve ses propres
12 contrôles réussis et huit PNG. Quatre captures ne cadraient pas l’état pertinent ;
sa [revue de cadrage](attempt-1/screenshot-inspection.json) le précise. La seconde
exécution conserve cette preuve antérieure et corrige seulement le cadrage du driver.
La [seconde exécution](attempt-2/report.json) a qualifié les douze critères initiaux
et neuf captures avant le changement de namespace. Elle reste datée ; elle ne
prouve pas la migration nouvelle. Ces exécutions ne sont pas additionnées aux
17 critères de la troisième.

Reproduction depuis la racine, avec les dépendances verrouillées et Chromium :

```sh
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
WAR_ARCHIVE_QA_OUTPUT=/tmp/yautja-archive-qa \
node scripts/qa-clan-war-operations-archive-20261109.mjs
```

Le dossier de sortie doit être neuf pour préserver les reçus précédents.
Les contrôles observent le scénario borné de reprise V115 ; ils ne qualifient pas
les autres modes, les conquêtes V85, la campagne principale ou toutes les pannes
possibles du stockage.
