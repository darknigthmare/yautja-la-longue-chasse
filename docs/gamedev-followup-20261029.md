# Suite de l’application des guides gamedev — 29 octobre 2026

## Résultat et base de travail

Cette suite de la [première application](gamedev-application-20261029.md) corrige
une course entre les imports de fiches et les actions du générateur de mondes.
Elle ajoute les trois nouvelles suites de régression à la CI et vérifie les
interactions dans Chromium, sur la vraie route Next du jeu.

Base de la modification : `5a8fc7e5372db1f65b53902bd29c61d19e3e2c7c`, dans la
[PR #25](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/25).
Les deux premiers correctifs, la validation des archives et les contrats de
dimensions des sprites, restent inclus dans cette PR. Les résultats ci-dessous
portent sur cette base et le correctif de `PlanetGeneratorV103.tsx` identifié
dans le [manifeste de preuves](qa/gamedev-followup-20261029/evidence.json).

## 1. Une lecture ancienne ne remplace plus une action récente

Les principes de `save-systems` et `procedural-gen`, référencés dans le
[guide du projet](GAMEDEV_AGENT_GUIDE.md), ont été appliqués au propriétaire de
l’aperçu et à la conservation des recettes existantes.

### Défaut reproduit

Dans `PlanetGeneratorV103.tsx`, le jeton qui rend une lecture de fichier obsolète
était incrémenté après la réussite de plusieurs actions. Lorsqu’une action plus
récente échouait à la validation, un ancien `File.text()` pouvait encore aboutir
et remplacer l’aperçu, le brouillon et le message d’erreur.

Scénario reproduit :

1. Afficher le monde de graine `201`, puis saisir la graine invalide `4294967296`.
2. Commencer l’import d’une fiche du monde `202`, en retenant sa lecture.
3. Cliquer sur **Générer l’aperçu** : l’erreur de graine s’affiche.
4. Terminer la lecture antérieure : avant correction, le monde `202` remplaçait
   l’aperçu et effaçait cette erreur.

Le même défaut concernait les bases, le mélange avec une graine verrouillée
invalide et un code de monde refusé. L’édition du champ de code pendant une
lecture ne la rendait pas non plus obsolète.

### Correction

Le jeton d’import est maintenant incrémenté **au début** de `generate`,
`randomize`, `preset` et `importWorld`, avant leur validation, ainsi que lors de
l’édition du champ de code. Une action refusée conserve son erreur et le dernier
aperçu valide. Les lectures devenues obsolètes ne publient plus leur résultat.

La modification du composant représente huit lignes ajoutées et trois retirées.
Les recettes, graines, géométries, identités V102/V103 et formats d’archives ne
changent pas. L’ouverture d’un front demeure une action explicite.

La nouvelle suite comporte **13 cas**. Sur le code de départ, elle produisait
**six échecs et sept réussites**. Après correction, les treize cas réussissent,
y compris les imports V102/V103, les ordres de complétion A/B et un import valide
après les annulations. Ce harnais exécute les callbacks JSX et le moteur réels,
avec des hooks contrôlés ; sa portée est distincte des tests navigateur.

## 2. Protection dans la CI

Le workflow `.github/workflows/audit-v94.yml` utilise des listes explicites :
les deux suites créées lors de la première application n’étaient pas encore
exécutées par ce workflow. Une étape dédiée lance désormais :

```bash
node --test --test-reporter=spec --test-concurrency=1 \
  tests/planet-archive-validation-v103.test.mjs \
  tests/homeworld-motion-source-contracts-v113.test.mjs \
  tests/planet-generator-import-race-v103.test.mjs
```

Le nouveau script `scripts/qa-planet-import-race-v103.mjs` est également appelé
après le démarrage du serveur Next de la QA des planètes. Le fond original
`public/game/backgrounds/ship.webp` est inclus dans le checkout partiel et dans
les chemins qui déclenchent ce workflow. Le garde HTTP du scénario reste actif.

La CI garde Node 22 et le verrouillage du projet, dont Playwright 1.63.0.
Les passages locaux utilisent Node 24.22.1 et Playwright 1.62.1 fourni par
l’environnement : la prochaine exécution distante constitue une vérification
distincte de ce couple de versions.

## 3. Vérifications exécutées

### Régressions et types

| Suite du passage final | Cas réussis |
| --- | ---: |
| Validation des archives V103 | 14/14 |
| Contrats des sources Homeworld V113 | 5/5 |
| Ordre des imports V103 | 13/13 |
| Brouillons du générateur V103 | 4/4 |
| Chargement natif V94 | 17/17 |
| Ressources de mouvement Homeworld V74 | 8/8 |
| **Passage combiné** | **61/61, aucun échec ni cas ignoré** |

La [trace complète](qa/gamedev-followup-20261029/regressions.log) conserve les
noms individuels. La vérification TypeScript stricte des trois modules corrigés
et de leurs imports a réussi, ainsi que `git diff --check`.

```bash
node --experimental-strip-types --test --test-isolation=none \
  --test-concurrency=1 --test-reporter=spec \
  tests/planet-archive-validation-v103.test.mjs \
  tests/homeworld-motion-source-contracts-v113.test.mjs \
  tests/planet-generator-import-race-v103.test.mjs \
  tests/planet-generator-draft-v103.test.mjs \
  tests/native-image-preload-v94.test.mjs \
  tests/homeworld-motion-assets-v74.test.mjs

node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target es2022 \
  --module esnext --moduleResolution bundler --resolveJsonModule --esModuleInterop \
  --jsx react-jsx --lib es2022,dom next-env.d.ts \
  app/game/PlanetGeneratorV103.tsx app/game/useHomeworldMotionAssetsV74.ts \
  app/game/systems/clanWarV85.ts
```

### Imports sur la vraie page Next : 7/7

Le [rapport navigateur](qa/gamedev-followup-20261029/import-browser.json) provient
de `/planet-generator-v103`, servi par Next 16.3.5 en mode développement, avec
Chromium 153.0.8010.0. Les mondes `201` et `202`, de trois régions et dix-huit
territoires, sont créés et exportés par les contrôles réels de l’interface.

Seule la livraison du résultat de `File.text()` est retardée : les octets sont
lus par la méthode native. Après l’action utilisateur, le résultat antérieur est
libéré, puis deux frames natives précèdent la comparaison de l’aperçu, de l’atlas,
des codes, de la graine, du message et de tous les réglages. Le prototype est
restauré dans `finally`. Le dernier cas vérifie qu’un nouvel import valide réussit.

Les sept scénarios ont réussi, avec huit textures WebP originales chargées et
aucune erreur JavaScript, console ou HTTP. Le contexte neuf reste sans archive.

```bash
YAUTJA_QA_BASE_URL=http://127.0.0.1:3101 \
YAUTJA_QA_SERVER_MODE=development \
AUDIT_CHROME_EXECUTABLE=/tmp/chromium \
node scripts/qa-planet-import-race-v103.mjs
```

Le chemin du navigateur dépend de l’environnement ; le script accepte également
`CHROMIUM_EXECUTABLE_PATH` et `AUDIT_CHROME_CHANNEL`. Chaque exécution écrit un
nouveau répertoire de preuves et conserve les rapports précédents.

### Front réellement joué et repris : 19/19

Un second contexte navigateur neuf a créé le monde de graine `20261029`, avec
trois régions et dix-huit territoires, puis l’a mémorisé et ouvert par l’interface.
Après le tour 2, le combattant mobile `P04` a reçu une reconnaissance de `CON-T02`
vers `CON-T01`. La résolution au tour 3 a produit une observation.

Après rechargement, saisie du même code et réouverture du front : **Tour 03** est
affiché, l’atlas garde la même identité et les **11 179 octets de l’archive sont
strictement identiques**. L’empreinte avant et après est :

```text
ae11e865ec22c80b067a7f398f082a1144bd91334dde1ea69b2ed829d8a12fe5
```

Les dix-neuf contrôles réussissent. Aucune erreur JavaScript, console ou ressource
HTTP n’est présente dans ce passage final. Aucun état de simulation, graphe,
catalogue ou sauvegarde n’a été injecté : le stockage est seulement lu pour
conserver les preuves.

Le [rapport](qa/gamedev-followup-20261029/front-browser.json), le
[script ponctuel tel qu’exécuté](qa/gamedev-followup-20261029/front-browser-run.mjs)
et les archives avant/après sont conservés. Ce script historique contient les
chemins de son environnement d’exécution ; le parcours durable plus large existe
déjà dans `scripts/qa-planet-generator-v103.mjs` et dans la CI.

### Décodeur PNG natif : 10/10

Le script existant `scripts/qa-scene-images-browser-v94.mjs` a réussi ses dix
contrôles avec le vrai décodeur Chromium : dimensions incompatibles, corruption,
délais, annulation, rechargement HTTP, récupération et concurrence limitée.
La [trace](qa/gamedev-followup-20261029/native-decoder.log) est conservée.
Ces scénarios utilisent de petites fixtures PNG ; ils ne constituent pas une
revue artistique des sprites Homeworld.

## Compilation et limites restantes

Le build local `npm run build:production` a été tenté mais s’est interrompu à
l’écriture du cache Webpack avec **ENOSPC**. Le
[journal](qa/gamedev-followup-20261029/local-production-build.log) conserve cette
limite. Le build incomplet a été supprimé, le manifeste audio généré a été
restauré et aucun manifeste de dépendances du projet n’a été modifié.

Sur le commit de départ `5a8fc7e`, la
[CI application](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/40877038365/job/123458397236)
a réussi TypeScript, la compilation Next, le smoke HTTP, le lint et les scénarios
navigateur existants de génération, de fronts et de matériaux planétaires.
Cette preuve porte sur ce commit ; elle ne qualifie pas automatiquement le
nouveau commit. Les nouveaux contrôles sont raccordés pour son exécution propre.

Les preuves navigateur locales portent sur la vraie application en mode
développement. Elles ne déclarent ni un paquet de production complet, ni la
traversée de Homeworld, ni une validation artistique ou un gain de performance.
La PR reste le support de revue et d’intégration de ces modifications.
