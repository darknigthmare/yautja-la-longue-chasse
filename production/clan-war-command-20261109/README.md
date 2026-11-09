# Conseil de guerre et intégration P0/P1 — 9 novembre 2026

Ce lot réunit les sources de cinq PR, poursuit plusieurs critères ouverts des
Excel et de la bible, et transforme le conseil de guerre en interface de jeu :
globe au premier plan, sous-menus, tiroirs et briefing modal. Les sources sont
intégrées localement au commit `6a412eeabc0c0be0dc9e09b635384f51b96dc377`.
Ce document atteste les preuves locales de cette préparation. L’état des fusions
distantes se lit séparément dans les PR GitHub liées ci-dessous. Ce lot ne clôt
pas tous les P0/P1 et ne constitue pas une certification artistique AAA.

## Les cinq PR réunies

Les cinq révisions suivantes sont ancêtres du commit local indiqué ci-dessus.
Leur présence dans ce graphe ne vaut pas fusion GitHub. Au point de
contrôle précédant la publication, `main` était à `19317af4`. Les liens GitHub
ci-dessous donnent l’état de fusion distant, indépendamment de cette preuve locale.

| PR | Révision intégrée | Apport et limites |
| --- | --- | --- |
| [119](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/119) | `4949352` | 39 PNG et sources Éclisse ; livraison de ressources distincte d'une validation artistique ou d'animations complètes. |
| [121](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/121) | `d632311` | Prototype Badlands autonome v0.2 ; 28 fichiers restent manquants. Ce DLC partiel ne devient pas une livraison intégrale par son intégration. |
| [127](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/127) | `79e13f1` | Mobilité V1.2, garage, Grav-Sled et catalogue de 50 entrées ; les ressources, animations et essais matériels ouverts restent suivis. |
| [131](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/131) | `169ee30` | Dépeçage, canopée et retours au Clan Ship, avec les corrections audio et de CI de cette révision. |
| [132](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/132) | `353a264` | Quêtes vivantes et 92 répliques prévues par cette livraison ; les recettes navigateur déclarent leurs prérequis préparés. |

## Interface et corrections jouables

- Le conseil présente le vrai globe et conserve ses outils existants dans
  quatre sous-menus : front, forces, cartographie et archives. Les quatorze
  outils restent accessibles.
- Les dossiers territoriaux, le renseignement et les réglages de carte utilisent
  des tiroirs. Le briefing sépare choix du mandat, cible et équipes ; annuler
  ne débite pas de RAV et ne crée pas d'opération.
- Les fenêtres reposent sur le dialogue modal natif : focus contenu, retour au
  déclencheur et fermeture par Échap avant le retour de GameClient. Le titre et
  le bouton Quitter restent dégagés du HUD global en 1440, 390 et 320 pixels.
- La rotation automatique des checkpoints respecte une sortie de conduite
  active ; les notices reflètent la pause et l'accusé durable de reprise. Les
  conversations conservent leur contexte pendant la suspension du propriétaire.
- Les maintenances B01/B02 donnent une réplique de confiance et un diagnostic
  d'interception à deux ordres après leurs conditions réelles. La lecture
  n'accorde ni récompense ni rôle ; le second ordre demeure à confirmer.
- L'atelier pédagogique du Homeworld conserve son modèle unique, ses dix-huit
  gestes et ses reprises. Il ne fabrique ni chasse, ni trophée de campagne,
  ni progression de rang.

## Preuves et périmètres

Le build Next de référence actuel est `mdrvYovYvfvhuJqeZXn1D`. Son identité
est établie par les fichiers et les octets servis décrits dans chaque reçu,
pas par le seul texte d'un badge ou le HEAD Git. Les reçus antérieurs gardent
leur build, leur date et leurs limites.

| Vérification | Résultat établi | Reçu exact |
| --- | --- | --- |
| Build de production Next et contrôle TypeScript du build | Code de sortie 0 ; 1 293 sources app inchangées pendant la compilation | [Build courant](qa/root/build-ux-final/receipt.json) |
| Lint global configuré | 2 803 fichiers, zéro erreur et zéro avertissement | [Reçu](qa/root/lint-final/receipt.json), [détail ESLint](qa/root/lint-final/eslint.json) |
| Régressions sources | **1 198 réussites sur 103 fichiers uniques**, zéro échec, ignoré ou todo ; dernier succès par fichier | [Bilan sources](qa/ci/final-source-report.json), [sélection exacte](qa/ci/test-selection.json) |
| Rejeu froid local final | **103 fichiers, 1 198 réussites**, zéro échec, ignoré ou todo ; checkout neuf du commit `1ca0ebbbbd5e3f3947b3cb44dfb1197ee63778a5`, terminé à 11:54:02 UTC | [Rapport final](qa/ci/cold-final/results/report.json), [préparation](qa/ci/cold-final/preparation.json) |
| Conseil dans le vrai Next/GameClient | 18 contrôles, 7 captures inspectées ; 14 outils, tiroirs, focus, HUD, lancement RTS avec une équipe puis retour au vaisseau ; sauvegarde de campagne de 10 767 octets inchangée | [Tentative 4](qa/next/attempt-4/final-receipt.json), [périmètre détaillé](qa/next/README.md) |
| Mobilité MOB-001 | 29 contrôles et 68,398 s de conduite sur le build antérieur `nItYejsE7HSH4L0ykJM5K` ; complément de 13 contrôles de notices sur le build actuel | [Parcours](qa/mobility/campaign-attempt-2/final-receipt.json), [complément](qa/mobility/notice-attempt-1/final-receipt.json) |
| Maintenance OPS-B01/B02 | 6 contrôles, 18 interventions et 18 retours Échap après acquittement ; 7 captures inspectées | [Tentative 5](qa/clan-ship-incidents/native-attempt-5/final-receipt.json) |
| Tutoriel TR-M01..03 | 20 contrôles sur le parcours physique Next/GameClient, avec écrivain de campagne et trois reprises | [Parcours daté](qa/trophy-tutorial/native-attempt-2/final-receipt.json) |
| Fixture de tutoriel maintenu | 18 contrôles rejoués et 9 captures inspectées ; observer publié depuis un effet, ancienne fixture préservée | [Version 2](qa/trophy-tutorial/native-fixture-v2/attempt-1/report.json), [inspection](qa/strict-lint/fixture-v2-visual-review.json) |
| Dialogues d'équipage et de chasse | 87 contrôles d'équipage et 169 contrôles de contexte de chasse dans le vrai GameClient via Vite ; ces recettes ne constituent pas des parcours Next | [Équipage](qa/pr-integration/final-attempt-4/dialogue/final-receipt.json), [chasse](qa/pr-integration/final-attempt-5/hunt-dialogue/final-receipt.json) |
| Capsules | 10 contrôles Next sur le build daté `kS-6-0gmSFRZVosfYvnq6`, arrivée naturelle de 62 s et relais unique ; aucune reprise de campagne sur disque revendiquée | [Reçu daté](qa/pr-integration/final-attempt-1/pod/final-receipt.json) |

Le rejeu froid final réussit après l'ajout au manifeste d'entrées de cinq
manifestes JSON importés par des sous-processus esbuild, que la première trace
des lectures Node n'avait pas recensés. Les assertions de test sont inchangées.
Le [manifeste corrigé](qa/ci/runtime-file-inputs.json) contient **145 fichiers,
201 281 912 octets**, vérifiés avant l'exécution. Le premier essai échoué reste
archivé dans [cold-attempt-1](qa/ci/cold-attempt-1/).

L'environnement froid local partage les dépendances verrouillées du workspace :
il ne prouve pas une installation `npm ci` fraîche ni une exécution GitHub Actions.
Les succès sources et froid portent sur les mêmes **1 198 cas uniques** ; leurs
répétitions, les probes et les contrôles navigateur ne s'ajoutent pas à ce total.

Le [suivi des priorités](suivi/README.md), son
[registre](suivi/registre-priorites.json) et sa
[qualification courante](suivi/qualification-courante.json) distinguent
déclaration source, critère, livraison, preuve et reste à faire. Les anciennes
clôtures, les Excel et les attestations historiques ne sont pas réécrits pour leur
attribuer les corrections de ce lot.

Le collecteur vérifie les empreintes et compteurs archivés sans rejouer les
parcours. Le second contrôle reconstruit le suivi et vérifie la conservation
des classeurs sources :

```bash
python3 production/clan-war-command-20261109/tools/verify-final-evidence.py --check
python3 production/clan-war-command-20261109/tools/verify-followup.py --check
```

## Reproduire depuis la racine du dépôt

Utiliser Node **22.13 ou plus récent** ; le lot a été exécuté avec Node 22.23.4.
Dans un nouveau checkout complet, installer le `package-lock.json` conservé :

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run lint -- --max-warnings=0
npm run build:production
```

`build:production` appelle Next avec webpack et ses contrôles de production.
`npm run build` utilise vinext ; `build:desktop` est encore une autre cible.
Ces sorties ne s'échangent pas comme preuves.

Exécuter la sélection exacte sans relancer de génération graphique :

```bash
P0P1_CI_MANIFEST=production/clan-war-command-20261109/qa/ci/runtime-file-inputs.json \
node scripts/include-p0p1-ci-inputs-20261109.mjs --check
P0P1_CI_SELECTION=production/clan-war-command-20261109/qa/ci/test-selection.json \
P0P1_CI_OUTPUT=outputs/clan-war-command-source-replay \
node scripts/check-p0p1-coherence-20261109.mjs
```

Le workflow [P0/P1](../../.github/workflows/p0-p1-coherence-20261109.yml)
reproduit cette sélection en checkout sparse : `--include` y inclut seulement
les fichiers réels épinglés par le manifeste, puis `npm ci` installe les
dépendances verrouillées. Son jeton a `contents: read`, aucun job n'élargit ces
droits et le checkout ne conserve pas les identifiants. Checkout et setup-node
sont épinglés par SHA ; upload-artifact reste référencé par le tag `v4`.
Cette portée ne concerne pas les anciens workflows de publication d'images,
dont cinq possèdent encore des droits d'écriture sur leurs branches dédiées.
La [revue indépendante CI/ESLint](qa/strict-lint/ci-eslint-independent-review.json)
documente ces distinctions.

Pour rejouer les interactions du conseil, démarrer le vrai serveur compilé
dans un terminal, puis exécuter le pilote dans un autre. Choisir un dossier
neuf pour chaque tentative et conserver les sorties antérieures :

```bash
npm run start:production -- --hostname 127.0.0.1 --port 3154
```

```bash
COMMAND_NEXT_URL=http://127.0.0.1:3154 \
COMMAND_NEXT_OUTPUT=outputs/clan-war-command-next-replay-1 \
node scripts/qa-clan-war-command-next-20261109.mjs
python3 production/clan-war-command-20261109/qa/next/verify.py
```

Le pilote exige Chromium à `/usr/bin/chromium` et ses prérequis historiques
déclarés. Le vérificateur Python relit les preuves archivées ; il ne lance pas
le jeu et ne valide pas automatiquement le nouveau dossier `outputs/`.
Les recettes des autres parcours et leurs limites figurent dans leurs reçus
et README respectifs.

## Ce qui reste ouvert

Une interception réussie, un lancement sur l'épreuve RTS existante 9 × 6 ou un
dialogue lu ne certifient pas une grande carte terminée, une campagne depuis la
nurserie ou tous les contrats du jeu. Les prérequis préparés sont déclarés par
recette ; une victoire de chasse, un recrutement ou un combat non joué n'en
sont pas déduits.

Les essais X11, la qualification de l'ensemble du mode Spatial, la manette et
la tablette physiques, l'équilibrage et la revue artistique humaine ne sont
pas établis par ces preuves. Les contrôles de largeur mobile et les API de
manette synthétiques conservent leur portée. Les images manquantes du DLC,
les animations, sons, VFX, silhouettes et autres P0/P1 restent ouverts selon
leur critère source. Ce lot ne transforme pas un prompt, un catalogue ou un
prototype en ressource finale livrée.
