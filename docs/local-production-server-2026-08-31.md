# Serveur de production local vinext — diagnostic du 31 août 2026

## Défaut confirmé

Sur Windows avec **vinext 0.0.50**, les pages SSR fonctionnent tandis que des fichiers publics existants dans `dist/client/` retournent 404 avec `vinext start`. Le problème est dans le **cache statique Node**, et non dans les images, leur copie au build, le manifeste public ou le Worker du projet.

Preuves recueillies sans démarrer de serveur :

| Contrôle | Résultat |
| --- | --- |
| `dist/server/index.js`, ensemble `__publicFiles` | Les chemins `/game/ship-interior/v20/corridor-wall.webp` et `/game/assets/v15/trophies/trophy-vey.webp` sont présents, avec des slashs normaux. |
| Appel direct de `handler.fetch(Request, undefined, ctx)` | Les deux routes retournent **200** et l'en-tête `x-vinext-static-file` contenant le chemin correct encodé. Une route inexistante retourne 404. |
| `StaticFileCache.create(dist/client).lookup('/game/...')` | Introuvable pour les deux images. |
| Même cache, lookup de `'/' + cheminSansSlashInitial.replaceAll('/', '\\')` | Trouvé : **577 450 octets** pour le mur du corridor, **114 604 octets** pour l'insigne de Vey, type `image/webp`. |

`node_modules/vinext/dist/server/static-file-cache.js`, fonction `walkFilesWithStats`, conserve `path.relative(base, file)` sans le convertir en chemin URL. Les clés de la map contiennent donc des antislashs sous Windows. À l'inverse, `scanPublicFileRoutes` normalise déjà correctement `path.sep` vers `/`.

`tryServeStatic` dans `vinext/server/prod-server` consulte ce cache avec le chemin URL. Si un cache est fourni et que la clé manque, il retourne immédiatement `false`; il ne poursuit pas par une lecture directe du disque. L'en-tête correct du Worker ne suffit donc pas à faire servir le fichier.

## Contournement dans le projet

Le lancement `npm start` utilise `scripts/start-production.mjs`. Sur Windows uniquement, `scripts/windows-static-cache.mjs` installe une compatibilité sur `StaticFileCache.prototype.lookup` avant de déléguer à la CLI vinext habituelle. La recherche normale reste prioritaire; la recherche de la clé native intervient seulement en secours. L'installation est idempotente et ne modifie aucun fichier de dépendance.

Les chemins racine, internes `.vite`, traversants ou non canoniques sont refusés **avant** toute conversion. Cette précaution est nécessaire : sans elle, convertir `/.vite/manifest.json` en `/.vite\\manifest.json` pourrait contourner le filtre de la dépendance.

Sur les autres plateformes, la CLI et le cache d'origine restent utilisés. `worker/index.ts`, `vite.config.ts`, le manifeste généré et les URLs des assets n'ont pas à être modifiés. Le déploiement Vercel actuel utilise `next build` selon `vercel.json` et ne dépend pas de ce cache Node vinext.

## Vérification

`tests/production-static-cache.test.mjs` construit un vrai cache vinext sur un dossier temporaire, reproduit la différence slash/antislash sous Windows, applique la compatibilité puis vérifie :

- accès au fichier public et refus des fichiers absents;
- absence d'effet de l'installation sur une plateforme non Windows et idempotence;
- refus de `.vite`, traversées et chemins non canoniques;
- `HEAD` avec `image/webp`, longueur et fin de réponse correctes;
- validation conditionnelle par ETag, réponse 304;
- maintien du refus des métadonnées privées via `tryServeStatic`.

Le test ne démarre aucun serveur, ne modifie pas les dépendances et supprime seulement son propre dossier temporaire après contrôle du chemin absolu. Les probes HTTP après démarrage ont été réalisées séparément par l’intégration principale : images et pages répondent 200, métadonnées 404. La vérification dans le navigateur interactif reste indisponible.

Résultat exécuté : `node --test tests/production-static-cache.test.mjs` — **1/1 réussi, aucun skip**. Lint du test et vérification du diff réussis.
