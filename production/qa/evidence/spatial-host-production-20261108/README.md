# Hôte de capture spatiale compilé pour la production

Date : 8 novembre 2026. Base locale : `5d0c8d9202c15c1b15c2b613a779d0f2877c0406`.

## Problème observé et portée du correctif

La relance native intacte de la tête `13326b2e0a92007819a51af488ceda4e6fd03ead`
a de nouveau refusé les trois photographies finales du trio camouflé. Les lectures
avant étaient à 61 799,9 / 61 799,7 / 61 783,1 ms ; les lectures après avaient
atteint 62 000 ms. Le nonce était frais, mais sa présentation X11 prenait
172–187 ms ; la copie complète prenait 7,5–9,8 ms et la lecture après demandait
32–45 ms de transport navigateur. Les images restent rejetées.

Source : [run Spatial 42501311528, job 128794459004](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42501311528/job/128794459004),
artefact `planet-arrival-spatial-13326b2e0a92007819a51af488ceda4e6fd03ead`
(ID `13625634426`, 45 680 371 octets), SHA-256
`6ca4708c5708dcad326fcf1726649883b6ae0107987b56c9b5348edede6bd876`.

L'hôte photographique utilisait `createServer` de Vite avec React en développement.
Une observation HTTP du serveur original confirme `isProduction: false`, le client
HMR, le préambule Refresh et la transformation `jsxDEV` effectivement servis.
La route native `/dev`, elle, utilise déjà la construction de production Next.

Le correctif construit désormais **les mêmes sources et la même fixture** avec
Vite en mode production, puis sert cette construction avec `preview`, uniquement
sur `127.0.0.1`, avec le port strict existant. Il vérifie les modules React, JSX
et React DOM de production. Les bundles utilisent le répertoire réservé
`__spatial_build`. Un lien temporaire `dist/game` dessert directement `public/game` ;
aucune grande collection binaire n'est copiée ou modifiée. Ce montage est supprimé
avec l'hôte temporaire, y compris lorsque son démarrage échoue.

Cette modification retire une instrumentation de développement absente du rendu
livré. **L'amélioration du délai de capture demeure une hypothèse à mesurer en CI.**
Les observations disponibles n'établissent pas que React en développement soit
l'unique cause des rejets, ni que la prochaine photographie réussira.

## Invariants conservés

Les 39 fonctions préexistantes hors `startHarness` sont identiques par comparaison
AST à la base. Le helper Python X11 est identique octet pour octet. Le produit,
les dépendances verrouillées et les workflows n'ont aucun changement.

La fenêtre 61 750–62 000 ms, la première formation réellement debout, l'horloge
native, les trois essais maximaux et la conservation des rejets restent obligatoires.
La fraîcheur des quatre coins, l'unique copie X11 complète, les bornes avant/après,
la comparaison des pixels en préflight, la géométrie et le recadrage sans perte
restent intégralement contrôlés. L'enregistrement vidéo auxiliaire est inchangé.
Aucune pause, accélération, réduction de scène ou requalification de PNG n'est ajoutée.

## Vérification locale

Le nouveau test construit et sert réellement le composant avec les versions
verrouillées de Vite et React. Il vérifie les scripts HTTP et leurs empreintes,
l'absence de HMR/Refresh et du runtime React de développement, le service du PNG
et du SVG originaux à leurs URL existantes, le lien vers le dossier public, puis
le nettoyage idempotent sans changement des ressources sources. Ces deux images
figurent déjà dans les fixtures de la CI ; aucun élargissement du checkout CI
n'est nécessaire.

Commande exécutée depuis la racine du dépôt :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/planet-arrival-harness.test.mjs tests/planet-arrival-observation.test.mjs \
  tests/planet-arrival-x11.test.mjs tests/planet-arrival-spatial.test.mjs \
  tests/planet-arrival-presentation.test.mjs tests/planet-arrival.test.mjs \
  tests/planet-arrival-audio.test.mjs tests/planet-insertion.test.mjs \
  tests/ship-insertion-energy.test.mjs tests/hunt-insertion.test.mjs
```

Résultat : **152 tests réussis, 0 échec, 0 ignoré**. Le test Node du protocole X11
exécute aussi les trois cas Python existants ; ils ne sont pas additionnés une
seconde fois à ce total. Le lint strict et `git diff --check` passent :

```sh
node node_modules/eslint/bin/eslint.js scripts/qa-planet-arrival-spatial.mjs \
  tests/planet-arrival-harness.test.mjs --max-warnings=0
git diff --check
```

Environnement local : Node `24.22.1`, Python `3.12.14`. Le bundle émet l'avertissement
Vite de taille supérieure à 500 ko ; il est conservé, sans modifier le
seuil. Le test HTTP ne lance pas Chromium et ne constitue pas une preuve de pose,
de pixels X11 ou de performance native. Le lancement du navigateur local reste
indisponible en raison du refus de socket déjà établi dans cet environnement.

La recette Spatial complète devra repasser sur la nouvelle tête publiée : ses
contrôles de pixels, de temporalité et sa revue des photographies décideront de
la qualification. Les reçus historiques et le classeur daté sont conservés.

Les commandes, empreintes, journaux et observations locales sont enregistrés dans
[local-verification.json](local-verification.json), [regressions.log.gz](regressions.log.gz),
[lint.log](lint.log), [diff-check.log](diff-check.log),
[baseline-host.json](baseline-host.json) et [source-invariants.json](source-invariants.json).

Le journal de régressions est compressé sans modifier ses octets ; son empreinte
compressée et son empreinte originale figurent toutes deux dans le reçu.
