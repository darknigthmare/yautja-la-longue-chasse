# V113 — séparer les certificats publiés du code actuel

Les deux certificats V113 publiés décrivent le runtime
`719fe0d77e65be5349b76f507938309f56a67619`, le build
`OzWVxNAbS8mWbL_Pue9Zg` et le freeze de 1 964 entrées dont le SHA-256 est
`f39b5089fc130a726b87a6120470dacb3c3ef41098582a7203844620ce57f164`.
Leur publication complète est conservée au commit
`837684333b42ee1a5e3a0be9ce1967e2486a2fd3` (arbre
`f33b92e0127713179fadab73576e37062df0398f`).

La consolidation contient ensuite de nouvelles sources et un freeze ultérieur
de 1 968 entrées. Ce dernier ne peut pas être substitué au freeze identifié par
les certificats. Les documents existants sont conservés sans modification.

## Vérification de la publication historique

```sh
node --test --test-reporter=spec tests/v113-production-history.test.mjs
```

Cette commande reconstitue 2 049 fichiers privés depuis les objets Git exacts,
réutilise uniquement des fichiers courants dont les empreintes correspondent,
et exécute **sans modification** le contrôle original du freeze ainsi que
`tests/homeworld-current-production-v113.test.mjs` dans ce contexte daté.
Les deux rapports, leurs résultats bruts et les 78 captures sont vérifiés.
Leurs 84 fichiers de publication doivent aussi rester identiques dans le Git
actuel. Les contrôles négatifs refusent une source, un certificat, un `HEAD`,
un contexte ou une arborescence substitués. Le répertoire courant est contrôlé
avant et après l'exécution.

L'équivalent sans les contrôles négatifs supplémentaires est :

```sh
node scripts/check-production-history-v113.mjs --check
```

Il s'agit de la conservation des preuves d'une exécution passée. Les parcours
navigateur ne sont pas rejoués par cette commande ; `currentRuntimeCovered`
et `runtimeBrowserEvidenceReexecuted` sont explicitement `false`.

## Vérification des modèles actuels

Les fichiers `tests/*-v113.test.mjs` restent exécutés sur le checkout actuel,
avec quatre contrôles historiques routés séparément :

| Fichier | Contexte d'exécution |
| --- | --- |
| `homeworld-current-production-v113.test.mjs` | Original intact exécuté par la capsule ci-dessus. |
| `r7-publication-history-v113.test.mjs` | Contrôle R7 dédié existant. |
| `homeworld-v112-history-v113.test.mjs` | Contrôle de la capsule V112 dédié existant. |
| `homeworld-connector-detour-history-v113.test.mjs` | Régression historique dédiée, à conserver dans la lane historique. |

Cette séparation ne retire aucune assertion. Le build courant, les modèles
actuels et les véritables tests navigateur gardent leurs contrôles propres.
