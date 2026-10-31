# V138 — Fermeture technique des surfaces QA et suivi des manquants

**Statut :** PR [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42) toujours en brouillon, base empilée sur #40. Cette note n'est pas une certification artistique 1:1.

## Pourquoi cette évolution

Les pages `/gauntlet-qa-v135` et `/gauntlet-qa-v136` étaient des routes d'atelier accessibles comme des pages publiques, alors que les laboratoires du jeu sont normalement limités à des tests locaux. Leur contenu utilise des accessoires de revue et, dans V136, des fichiers d'image fournis par le réviseur. Il ne doit pas être disponible en production à la simple connaissance de l'URL.

## Ce qui est implémenté

- Les deux pages `page.tsx` sont désormais des composants **serveur** avec `notFound()` si `YAUTJA_LOCAL_VISUAL_QA_V90 !== "1"` ou si `VERCEL === "1"`.
- Chaque `page.tsx` utilise `dynamic="force-dynamic"` et des métadonnées `robots: {index:false,follow:false}`.
- Un **deuxième contrôle** dans `proxy.ts` répond en 404 avec `Cache-Control: private, no-store` et `X-Robots-Tag: noindex, nofollow`, pour les deux routes, avant l'arbre de rendu.
- Les composants de revue interactifs demeurent dans `app/gauntlet-qa-v135/client.tsx` et `app/gauntlet-qa-v136/client.tsx`. Les vrais tests Chrome V137 importent le client V136 directement, **sans contourner une page publique** et sans toucher à la sauvegarde de campagne.
- Le script `scripts/qa-next-production-v94.mjs` vérifie désormais cinq routes QA en 404 quand l'option locale est désactivée : V90, solo V92, clan-war V92 et les deux gauntlet V135/V136.
- `tests/gauntlet-qa-privacy-v138.test.mjs` vérifie la présence des portes serveur/proxy, la non-indexation, l'absence d'activation par cookie/URL et la séparation du composant client ; les tests V135/V136 existants ont été adaptés.
- La CI ciblée V131 et celle du graphe TypeScript / frontend V136 incluent ces nouveaux contrôles.

## Vérification et preuve

Les contrôles de source, d'intégrité d'assets et de compilation ne remplacent pas le test HTTP du serveur déployé. Les premières CI sur le nouveau code avaient échoué car une dépendance de test n'était pas dans le checkout épars ; cette dépendance a été ajoutée. Les exécutions du commit `4817b80508333483804ac995a0149544115b2b09` ont réussi :

- [CI V131](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41200676799)
- [CI V136](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41200676803)

Le véritable retour serveur 404 dans le produit complet restera à confirmer sur un build et une URL représentatifs ; aucun test de route ne permet de valider l'accessoire 1:1.

## Excel V138

Voir [Yautja_Gauntlets_V138_Arsenal_Clans.xlsx](Yautja_Gauntlets_V138_Arsenal_Clans.xlsx) (36 onglets) :

- `33_V138_Acces_QA` : 12 points d'accès, règles de déploiement, fichiers et preuves.
- `34_V138_Priorites` : 15 chantiers concrets avec états, priorité et **prochaine preuve** ; les tâches de galerie privée sont codées, tandis que l'art 1:1, le rig, les tests multi-onglets et la revue des droits restent ouverts.
- `35_V138_Synthese` : indicateurs par formule, en complément du registre des 1 073 lignes historiques V137. Ce nombre cumule les doublons de périmètre historiques.

Le fichier `.xlsx` est intégré directement à la même PR et fait l'objet d'un contrôle ZIP et 36 feuilles en CI.

## Manquants maintenus ouverts

Les 54 gauntlets ont une représentation graphique individuelle, mais seuls cinq sont guidés par une référence d'accessoire à confronter. Les 49 autres sont **des créations originales non canoniques**, qui n'acquièrent aucune fidélité par l'automatisation. Les proportions du Jungle Hunter de 1987, le pivot des capots, les textures propres à chaque film, les poses du rig, les tests des vraies guerres V85/V115 et les droits de franchise exigent encore une revue explicite et des preuves ciblées. **Zéro modèle ne doit passer au statut « approuvé 1:1 » automatiquement.**
