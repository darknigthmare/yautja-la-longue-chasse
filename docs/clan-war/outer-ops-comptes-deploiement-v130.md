# Outer Ops V130 par comptes — déploiement du service

Service Node permanent (Fly.io, Railway ou VPS) qui fait autorité sur les mandats
Outer Ops des comptes Supabase. Source : `scripts/serve-clan-war-outer-ops-accounts-v130.mjs`.
La migration `supabase/migrations/20261123103000_yautja_clan_war_outer_ops_v130.sql`
est déjà appliquée ; seul ce service écrit les tables `yautja_war_*`, via
`yautja_war_commit_v130` (exécutable par `service_role` uniquement).

## Prérequis d'exécution

- **Node ≥ 22.13.0** (`engines` de `package.json` ; pas de `.nvmrc`). La V130 n'utilise pas
  SQLite, mais elle importe statiquement `serve-clan-war-outer-ops-v115.mjs`, qui importe
  `node:sqlite` au chargement : le module doit donc exister dans la version de Node.
- **Dépôt complet + dépendances de développement.** Au démarrage,
  `loadWarOuterOpsRulesV115()` compile avec esbuild `app/game/systems/clanWarBibleV6`,
  `clanWarOperationsV115` et `clanWarOuterIncidentV143`. esbuild n'arrive que par des
  `devDependencies` (vite, wrangler, drizzle-kit…) : installer avec `npm ci`, pas
  `npm ci --omit=dev`.
- Aucune commande npm dédiée. Commande de démarrage :

```sh
node scripts/serve-clan-war-outer-ops-accounts-v130.mjs
```

## Variables d'environnement (bloc CLI du script)

| Variable | Rôle | Secret |
|---|---|---|
| `SUPABASE_URL` | URL racine HTTPS du projet (`https://<ref>.supabase.co`), sans chemin ni identifiants, sinon refus au démarrage | non |
| `SUPABASE_PUBLISHABLE_KEY` | `apikey` envoyée à `/auth/v1/user` pour résoudre le jeton du joueur | non (publique) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service role pour PostgREST et `rpc/yautja_war_commit_v130` | **oui** |
| `YAUTJA_CLAN_OUTER_SIGNING_SECRET` | clé HMAC-SHA256 des reçus, en hexadécimal, au moins 32 octets (64 caractères) | **oui** |
| `YAUTJA_CLAN_OUTER_PORT` | port d'écoute ; à défaut `PORT` (fourni par Fly.io ou Railway), sinon `8790` | non |
| `YAUTJA_CLAN_OUTER_HOST` | adresse d'écoute, défaut `127.0.0.1` ; `0.0.0.0` sur Fly.io ou Railway | non |
| `YAUTJA_CLAN_OUTER_ALLOWED_ORIGINS` | origines navigateur autorisées, séparées par des virgules, comparées exactement (`https://jeu.exemple`, sans `/` final) ; vide = aucune réponse CORS | non |

Générer le secret de signature (même primitive que la V115, `randomBytes(32)`) :

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`SUPABASE_SERVICE_ROLE_KEY` et `YAUTJA_CLAN_OUTER_SIGNING_SECRET` ne vont **jamais** dans
le client, dans `app/game/data/`, ni dans le dépôt : uniquement dans les secrets de la
plateforme (`fly secrets`, variables Railway) ou un fichier d'environnement du VPS hors dépôt.
La clé service role contourne la RLS.

## Écoute réseau

Le service écoute `YAUTJA_CLAN_OUTER_HOST` (défaut `127.0.0.1`) sur `YAUTJA_CLAN_OUTER_PORT`, ou `PORT` à défaut, ou `8790`.

- **VPS** : garder `127.0.0.1` derrière un proxy inverse (nginx, Caddy…) qui termine TLS et relaie vers `http://127.0.0.1:8790`.
- **Fly.io / Railway** : définir `YAUTJA_CLAN_OUTER_HOST=0.0.0.0`. Le port vient de `PORT`, que la plateforme fournit, ou de `YAUTJA_CLAN_OUTER_PORT`.

## HTTPS

Le client (`app/game/systems/outerOpsAccountClientV130.ts`, `authorityUrl`) n'accepte que
`https:`, ou `http:` sur `127.0.0.1`, `localhost`, `[::1]`. Une URL distante en `http:` est
rejetée et le panneau reste masqué. TLS est fourni par la plateforme ou le proxy inverse ;
le service lui-même parle HTTP.

## Brancher le jeu

`app/game/data/outerOpsAccountConfigV130.json` vaut `{"url": null}` : le panneau
`OuterOpsAccountPanelV130` renvoie `null`. Après déploiement :

```json
{ "url": "https://<hôte-du-service>" }
```

Le JSON est importé à la compilation : reconstruire et redéployer le jeu. L'origine du jeu
doit figurer dans `YAUTJA_CLAN_OUTER_ALLOWED_ORIGINS`. Le panneau n'apparaît qu'avec une
session cloud connectée (`outerOpsAccountAvailableV130`).

## Rotation du secret de signature

Chaque reçu est signé `HMAC-SHA256(secret, JSON du corps)` et stocké avec sa signature dans
`yautja_war_receipts`. Après changement de `YAUTJA_CLAN_OUTER_SIGNING_SECRET`, les nouveaux
reçus utilisent la nouvelle clé ; les signatures des reçus existants ne sont plus
vérifiables avec elle. Conserver l'ancienne clé hors ligne si ces reçus doivent rester
contrôlables. Ne pas faire tourner plusieurs instances avec des secrets différents.

## Vérification après déploiement

- [ ] Journal de démarrage : `Outer Ops V130 par comptes sur <hôte>:<port>`.
- [ ] `GET /state` avec le jeton d'accès d'un vrai compte → **200**, `clanId` égal à
      l'identifiant (UUID) de l'utilisateur Supabase :
      `curl -i https://<hôte>/state -H "Authorization: Bearer <access_token>"`
- [ ] Même requête avec un jeton forgé ou expiré → **401** `{"error":"unauthorized"}`.
- [ ] Préflight depuis l'origine autorisée → **204** avec `Access-Control-Allow-Origin` :
      `curl -i -X OPTIONS https://<hôte>/state -H "Origin: https://<origine-du-jeu>" -H "Access-Control-Request-Method: GET"`
      (une origine non listée obtient 404, sans en-tête CORS).
- [ ] Dans le jeu connecté, le panneau Outer Ops s'affiche et un ordre est accepté.
- [ ] Tests locaux :
      `node --experimental-strip-types --test tests/clan-war-outer-ops-accounts-v130.test.mjs tests/outer-ops-account-client-v130.test.mjs`
      (7 tests réussis le 2026-11-23, Node 22.23.5 ; ils n'appellent pas Supabase).

Une erreur 500 `{"error":"practice-unavailable"}` signale en général une panne Supabase
(délai de 5 s par appel) ou une campagne incompatible avec la source V6.

## Limites connues

- Le tick (`tickMs` = 1000 ms) tourne dans le processus : chaque seconde il liste toutes les
  campagnes (`yautja_war_campaigns`) puis charge chacune ; le coût croît avec le nombre de comptes.
- Plusieurs instances sont sûres : `yautja_war_commit_v130` compare la révision
  (`40001` en cas de conflit) et le serveur recharge puis réessaie jusqu'à 6 fois. Mais chaque
  instance exécute son propre tick, ce qui multiplie les lectures et les conflits.
- Pas de point de santé dédié : `/state` exige un jeton ; les autres routes répondent 404.
