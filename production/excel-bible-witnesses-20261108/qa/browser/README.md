# Audience C-37 — limite navigateur et recette préparée

## Résultat local

Le navigateur n'a pas chargé le jeu et aucune capture de gameplay n'est validée dans cette tranche.

- `launch-probe.json` : lancement normal de `/usr/bin/chromium` avec Playwright ; arrêt avant page sur `socket() failed: Operation not permitted (1)` dans `process_singleton_posix.cc`.
- `socket-probe.json` : la création d'un socket AF_UNIX est refusée avec EPERM ; la création AF_INET fonctionne.
- `shared-browser-probe.json` : le Chrome partagé ne joint pas le serveur de sonde sur la boucle locale de l'exécuteur (`ERR_CONNECTION_REFUSED`). Cette sonde ne chargeait pas le jeu.

Aucune modification des permissions, du sandbox ou de l'exposition réseau n'a été employée. Les tests de domaine et les huit rendus React SSR restent des preuves séparées ; ils ne certifient ni l'hydratation ni la présentation visuelle dans le navigateur.

## Sauvegarde initiale déclarée

`initial-C37-fixture.json` est préparée par le helper partagé `tests/helpers/clan-ship-trophy-hearing-fixture.mjs`. L'onboarding, le mandat, le circuit intérieur, les preuves de missions et les observations antérieures de C-37 utilisent leurs reducers de production. Les résultats de missions sont synthétiques : ces chasses ne sont pas présentées comme jouées au navigateur.

La fixture contient les préconditions de l'audience. Elle ne contient aucune invitation, observation télémétrique consignée, conclusion d'audience ni sa récompense de 35 marques. Son import/export natif passe. Son empreinte est enregistrée dans `fixture-disclosure.json`.

## Recette native exécutable

Depuis la racine du dépôt, avec les dépendances et les assets du manifeste CI présents :

```sh
node scripts/qa-clan-trophy-hearing-browser-20261108.mjs --fixtures-only
node scripts/qa-clan-trophy-hearing-browser-20261108.mjs
```

Seule la première commande a terminé ici. La seconde est préparée pour un environnement où Chromium peut démarrer. Elle utilise le vrai `GameClient` servi par la configuration Vite desktop et le stockage campagne natif. Elle prévoit les invitations physiques, les déplacements, les trois observations, le rechargement, une conclusion commune puis l'acquittement à récompense unique, aux formats 1440×1000, 390×844 et 320×740.

Le script choisit `CHROMIUM_EXECUTABLE` si fourni, puis `/usr/bin/chromium` s'il existe, sinon le navigateur en cache Playwright. `YAUTJA_TROPHY_HEARING_QA_OUTPUT` sélectionne le dossier de résultats et `YAUTJA_TROPHY_HEARING_QA_PORT` son port local. Les échecs de lancement, UI, assets ou empreintes source produisent un rapport d'échec et un code de sortie non nul.

Les contrôles desktop utilisent la souris ; les contrôles mobiles utilisent du tactile émulé. Le mouvement réduit est demandé. La recette ne vaut pas essai d'une manette physique. Les deux portraits de témoins réutilisés sont déjà inclus dans `tests/fixtures/clan-ship-browser-assets.json` : `instructor/01.png` et `guide/17.png`.

L'exécution CI préparée, ses captures et leur inspection doivent être consignées séparément avant de qualifier le parcours navigateur comme réussi.
