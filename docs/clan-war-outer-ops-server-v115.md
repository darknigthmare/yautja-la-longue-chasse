# Mandats Outer Ops V115 sur un serveur d’exercice

Le service de `CW130-NET-006` reprend le départ, les incidents, le rappel et les rapports du moteur V115. Chaque clan reçoit son dossier V6 et une clé distincte. Le départ réserve les mêmes équipes et leurs RAV. Un incident public de passage peut être sécurisé ou contourné pendant la traversée. Un rappel engage un vrai délai de retour. L’équipe reste occupée jusqu’à la fin.

L’horloge monotone du processus fixe les échéances. Le client lit l’heure, l’état et le temps restant. Les ordres contiennent une identité d’opération, une séquence et une révision. Un champ horaire ajouté à la requête est refusé. Un en-tête HTTP `Date` ne participe pas à l’arbitrage.

Le service règle chaque mandat à son échéance et enregistre le rapport et le reçu HMAC dans la même transaction SQLite. Le même fichier conserve les mandats, les ressources et les reçus lors d’un redémarrage. Le secret de signature reste côté serveur.

## Jouer depuis deux terminaux

Installez les dépendances verrouillées du dépôt et utilisez Node 22. Le serveur écoute par défaut sur `127.0.0.1:8789`. Vous pouvez fournir de un à quatre clans distincts dans `YAUTJA_CLAN_OUTER_CLANS`.

```sh
export YAUTJA_CLAN_OUTER_DB=/chemin/privé/mandats.sqlite
export YAUTJA_CLAN_OUTER_CLANS=$(node -p 'JSON.stringify([{id:"clan-demo",token:require("node:crypto").randomBytes(32).toString("base64url")}])')
node scripts/serve-clan-war-outer-ops-v115.mjs serve
```

Chargez la clé du clan dans `YAUTJA_CLAN_OUTER_TOKEN` dans le terminal joueur. Pour une instance derrière un proxy HTTPS, définissez `YAUTJA_CLAN_OUTER_URL`.

```sh
node scripts/serve-clan-war-outer-ops-v115.mjs state
node scripts/serve-clan-war-outer-ops-v115.mjs start
node scripts/serve-clan-war-outer-ops-v115.mjs incident W115-OPS-0001 detour
node scripts/serve-clan-war-outer-ops-v115.mjs recall W115-OPS-0001
```

`start` utilise le départ suggéré par les règles V6. Vous pouvez donner un territoire, une liste d’équipes séparées par des virgules et un mandat `recon`, `intercept` ou `escort`. Le panneau JSON indique si un incident est accessible. Remplacez l’identifiant ci-dessus par celui de votre mandat. Relisez l’état si un règlement ou un autre ordre a changé la révision.

La recette `node --test tests/clan-war-outer-ops-server-v115.test.mjs` utilise TCP, les réducteurs V115 et une base SQLite réelle. Un client séparé avance sa propre horloge jusqu’en 2100. Le premier test pilote uniquement l’horloge de l’autorité pour vérifier les bornes exactes. Le second suit le délai de rappel de dix secondes sur l’horloge réelle.

Ce service héberge l’exercice V115 pour les clans configurés. Les comptes et stocks de campagne, le déploiement public, la preuve sur appareils distincts et l’intégration au panneau web restent distincts.
