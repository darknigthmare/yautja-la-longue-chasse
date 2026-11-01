# V151 — Échéances atomiques, quatre modes de guerre et QA 1:1

**Branche de travail : [PR #74](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/74)**, empilée sur #71. Les PR **#75** (Conseil/provenance), **#76** (consolidation des quatre modes) et **#42** (gauntlets et atlas) sont séparées et ne sont pas fusionnées automatiquement.

## Correction réelle dans le moteur V115

Le panneau V115 possède trois types d'échéances : mandats Outer Ops, recrutements et soins de terrain. L'ancienne boucle préparait trois mutations distinctes sur la même archive, alors que son Web Lock est asynchrone et interdit une deuxième écriture concomitante. Le second type d'échéance devait attendre un prochain tick, qui peut être retardé ou suspendu par le navigateur.

`settleWarDueEventsV151` construit désormais **un seul candidat** à partir de l'état V6 courant, applique **dans l'ordre** les trois résolutions existantes, puis autorise **un seul commit** sous le verrou V115. La fonction est pure, conserve la source du jeu et n'écrit ni dans V85 ni dans une sauvegarde de chasse.

- Un mandat arrivant à terme conserve son rapport, ses équipes et ses risques réels de l'exercice.
- Un recrutement conserve le RAV payé au départ, le délai et l'identité des renforts ; il n'ajoute aucune équipe gratuitement.
- Un soin exige toujours une équipe source W3-U18, un patient légèrement blessé et un ordre payé. Deux traitements peuvent être clôturés au même instant sans cloner un membre.
- Si une catégorie échoue aux contrôles de cohérence, l'état d'origine est retourné **sans enregistrer les autres catégories** ; le message indique la catégorie fautive.
- Une deuxième demande au même horodatage ne redonne pas de récompenses, de RAV, d'XP ou de reçus.

Le bouton manuel **Recevoir les rapports arrivés** conserve sa logique Outer Ops spécifique. La minuterie automatique utilise le nouveau regroupement.

## V151 — régressions et navigateur

**CI du code [41320210463](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41320210463), réussie :** tests Node V115/V150 et quatre nouveaux tests V151, TypeScript V146, ESLint ciblé, classeur V150 contrôlé. Le même workflow a exécuté Chromium : reprise du dernier contact furtif, marche forcée/rappel et **15 contrôles multionglets** portant sur le Web Lock, les resets et les minuteries assaut et RTS.

Le banc Chromium de la [PR #66](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/66) a été repris **octet pour octet** dans #74. Le contrôle nouveau vérifie que l'horloge RTS cesse d'avancer lorsqu'un second onglet détient le Web Lock et reprend quand il le libère. La sauvegarde de campagne témoin reste inchangée. **Ces essais sont limités à deux onglets coopérants d'un même navigateur.**

Le registre [QA_V151_Production_Sources.csv](QA_V151_Production_Sources.csv) réunit **36 critères**, avec leur mode, provenance et état honnête. Il est importable dans Excel. **Le classeur historique XLSX V150 à cinq feuilles est conservé sans modification**, tandis que l'avenant XLSX V151 de travail peut être distribué indépendamment : aucun fichier binaire V151 n'est revendiqué comme commité ici.

## Priorités ouvertes de fidélité

- **Fidélité cinématographique 1:1 :** zéro validation artistique revendiquée pour les 54 bracelets de #42 ; études originales et vrais accessoires de films ne doivent pas être confondus.
- **Terre / mondes extraterrestres :** valider climat, géographie WGS84, villes de films, taille de la planète et formes de territoires. Aucun décor planétaire n'est déclaré 1:1 à partir d'une simple CI.
- **Campagne :** aucun gain V85, aucun trophée, aucune mutation de territoire et aucun transfert d'identité W3-K vers CON-T n'est autorisé par ce correctif.
- **Réseau / UX :** tests sur deux appareils, serveur autoritaire, manette physique, Android/iOS, performance et parcours complet GameClient restent ouverts.
- **Fusion :** préserver les dépendances #42, #66, #74, #75 et #76 ; les CI indépendantes ne prouvent pas l'absence de conflits lors d'une fusion future.

**Positionnement du jeu :** chasse principale **Dynasty-Warriors-like**, les quatre modes de guerre des clans sont complémentaires et ne remplacent pas ce gameplay par une copie d'AVP Extinction.
