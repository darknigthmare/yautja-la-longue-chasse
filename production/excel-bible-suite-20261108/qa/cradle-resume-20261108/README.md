# Recette navigateur — nouvel essai du 8 novembre 2026

Base locale au lancement : `04eb4caa217ad114faf1cf63b301b4df67736b2d`, branche `feat/excel-bible-completion-20261108`.

Commande réellement exécutée, depuis la racine du dépôt :

```sh
YAUTJA_CRADLE_QA_OUTPUT=production/excel-bible-suite-20261108/qa/cradle-resume-20261108 node scripts/qa-buried-cradle-browser-20261108.mjs
```

## Résultat

**Bloqué avant le chargement d'une page ; aucune recette visuelle réussie.**

Le serveur Next.js 16.3.5 démarre normalement sur `127.0.0.1:3108` et annonce `Ready in 273ms`. Le navigateur installé `/usr/bin/chromium`, lancé par `playwright-core` 1.63.0 sous Node 24.22.1, termine avec `SIGABRT` :

```text
FATAL:chrome/browser/process_singleton_posix.cc:297
Check failed: . socket() failed: Operation not permitted (1)
```

Une sonde indépendante de création d'un socket Unix avec `node:net` échoue également avec `listen EPERM: operation not permitted`. Cela confirme une restriction de l'exécuteur ; aucun échec de rendu, d'hydratation ou de gameplay ne peut être déduit de cette tentative. Aucun contournement, changement de permissions ou demande d'escalade n'a été effectué.

`browser-verification.json` conserve l'échec complet et les listes de contrôles vides. `server.log` conserve le démarrage du serveur, fermé par le script après l'échec. Aucune capture n'a été produite. Les points navigateur restent ouverts ; le script QA n'a pas été modifié puisque le défaut observé est antérieur à son parcours de test.

## Connectivité Git vérifiée séparément

```sh
GIT_TERMINAL_PROMPT=0 timeout 25s git ls-remote origin refs/heads/main refs/heads/feat/excel-bible-completion-20261108
```

La commande en lecture seule a réussi (code 0) et renvoyé :

```text
254b4b972af3c32cb078da3744241b2c0ea2f46c  refs/heads/main
```

La branche de travail n'était pas encore publiée au moment de cette lecture. Ce résultat établit uniquement l'accès distant en lecture ; il ne prouve aucun push, création de PR, fusion ou déploiement.
