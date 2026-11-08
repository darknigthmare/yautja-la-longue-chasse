# Recette Clan Ship — recrutement, réserve et quartiers

## Échec observé

Le [run 42498745813, job 128786736336](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42498745813/job/128786736336)
exécutait la tête `44aff718e48a69f6158df7515489c371eed4f94b` de la PR #128.
Après huit contrôles réussis, la recette d’opérations a attendu pendant 25 secondes
un ancien acteur `[data-clan-crew="iron-claw"][data-clan-crew-recruited="true"] img`.
Le rapport indique 35 marques, le joueur immobile à l’armurerie et aucun asset
manquant. La capture montre « 2 recrutés · 0 quartier ici ».

Les fichiers d’échec `failure.png`, `failure-page.txt`, `report.json` et les
fixtures originales sont conservés dans l’artefact de ce run. Son archive a pour
SHA-256 `58c5d73927df3ca73cc9e342d531cbe66300c72ed2d0c5ae316f3bd15fa94559`.
La recette corrigée produit de nouvelles preuves ; elle ne remplace pas ce constat.

## Cause et correction

`GameClient.commitClanShipOperations` enregistre un nouvel accord via
`registerCompanionResidenceRecruitment`, dans la même transaction que le
recrutement. La recrue entre en réserve : aucune affectation, aucune installation,
`legacyClanPost: false`. Elle ne fournit aucun rôle tactique et ne conserve pas
l’ancien acteur de poste. Le comportement correspond au contrat existant de
`companionResidence.ts` ; la recette attendait encore l’ancienne présence
immédiate.

La correction concerne la recette et sa régression. Après chaque accord, elle
vérifie l’état de réserve et son affichage natif, puis marche au hangar et utilise
« Programmer le quartier », « Réserver les fournitures » et « Confirmer les
travaux ». Chaque clic doit être confirmé par la révision durable du registre.
Le scénario vérifie ensuite l’acteur résident unique, le quartier visible, le
décodage effectif de leurs images, l’accord dans le dossier et l’absence d’un
second acteur historique. Les transitions entre panneaux ferment les détails
avant de rendre la main au déplacement réel.

Les coûts restent ceux du jeu. Les quatre circuits rapportent 75 marques, alors
que quatre quartiers en coûtent 80. Le gardien reste donc explicitement en
réserve jusqu’à la récompense d’escorte.

| Étape native | Solde après l’étape | Compagnons installés |
| --- | ---: | ---: |
| Campagne adulte initiale, aucun contrat effectué | 0 | 0 |
| Confinement terminé, accord du gardien en réserve | 15 | 0 |
| Circuit d’armurerie, accord et quartier de Griffe de Fer | 15 | 1 |
| Circuit de soins, accord et quartier de Suture Noire | 15 | 2 |
| Circuit d’entraînement, accord et quartier de Balafre de Cendre | 15 | 3 |
| Escorte remportée avec artilleur, soigneur et vétéran | 60 | 3 |
| Quartier du gardien financé et terminé | 40 | 4 |
| Interception remportée après retrait puis expiration sans gain | 105 | 4 |
| Récupération et extraction de la capsule | 160 | 4 |

L’escorte utilise réellement les trois rôles installés. Ses cinq ordres
`scan → manoeuvre → brace → brace → extract` aboutissent à une victoire avec une
formation à 88 et un objectif protégé à 86. Le gardien n’apparaît dans les rôles
qu’au départ suivant, après ses travaux. Les sauvegardes, rechargements, refus
d’écriture, récompenses uniques, commandes tactiques et contrôles mobiles de la
recette restent exécutés. Aucun ajout de marques n’est effectué par le navigateur.

La deuxième campagne conserve sa fixture historique explicitement déclarée :
six anciens postes de clan, deux preuves de terrain synthétiques, aucun registre
de résidence. Elle continue de vérifier le rendu et les effets des six rôles
historiques. Ses chasses ne sont pas présentées comme jouées par cette recette.

## Vérifications locales et recette CI

- **79 tests de domaine, sauvegarde et présentation existante réussis**, dont la
  nouvelle régression intégrée dans `tests/clan-ship-operations.test.mjs`.
  Elle part de zéro marque, appelle les vrais reducers de recrutement, résidence
  et opérations, vérifie les trois puis quatre rôles, et passe l’export/import à
  chaque phase de travaux. Elle est comprise dans la commande CI existante.
- **ESLint strict et vérification syntaxique réussis** sur les deux fichiers
  JavaScript modifiés.
- **Deux fixtures validées par la vraie frontière d’import** avec
  `node scripts/qa-clan-ship-operations.mjs --fixtures-only`. La campagne adulte
  est identique octet pour octet à la fixture du run d’échec. La fixture historique
  conserve toutes ses données de campagne ; seul `updatedAt`, généré par le vrai
  `applyMissionResult`, diffère entre les créations. Sa déclaration précise
  désormais le régime de résidence historique.
- **Recette navigateur corrigée à rejouer en CI.** Ces vérifications locales ne
  constituent pas une exécution navigateur. La restriction locale Chromium sur
  la création des sockets Unix reste documentée dans le lot de QA courant.

Commande ciblée utilisée :

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/clan-ship-operations.test.mjs \
  tests/clan-ship-space-encounter.test.mjs \
  tests/clan-ship-operations-save.test.mjs \
  tests/companion-residence.test.mjs
```

La CI lance ensuite `scripts/qa-clan-ship-operations.mjs` sur le vrai `GameClient`
avec Chromium et Xvfb. Le rapport inclut les douze transactions natives de
résidence et, en cas d’échec, le registre de résidence sauvegardé. Les sprites
utilisés et `hunter-alcove.png` figurent déjà dans le manifeste d’assets du
parcours ; aucun ajout d’asset n’est nécessaire.
