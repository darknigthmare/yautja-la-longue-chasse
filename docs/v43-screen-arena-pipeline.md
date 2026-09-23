# Ajouts d'arènes films et jeux V43

Le catalogue historique de 100 arènes reste intact. Les nouvelles définitions se trouvent dans `app/game/systems/pitScreenArenasV43.generated.json` ; le module `pitScreenArenas.ts` expose leurs œuvres et leur niveau de référence sans les activer. Le plan comprend 27 scènes de films et un premier lot de 9 scènes de jeux, exclusivement Predator et Alien vs. Predator.

Les références, images et géométries sont des adaptations 2D. Un lieu-type cité par un éditeur n'est pas une mission identifiée. Une image générée n'est pas une capture officielle ni une preuve de fidélité exacte.

## Parcours de production

1. `node scripts/prepare-pit-screen-arenas-v43.mjs` ajoute seulement les définitions absentes, avec six plans explicitement non produits. L'empreinte des 100 anciennes entrées est vérifiée avant et après.
2. Les imports d'images conservent les PNG OpenAI et leurs reçus. `composition-plan.json`, dans `art-source/v43/pit-arenas`, décrit chaque placement, profondeur et propriétaire de module.
3. `node scripts/assemble-pit-screen-arenas-v43.mjs --ids 101,102,103` vérifie chemins physiques, empreintes, dimensions, alpha réel, limites de contenu, revue et contact du sol. Il refuse de remplacer une scène activée sans `--revise-reviewed-composition`. Cette option explicite révoque toutes ses anciennes preuves de rendu, de revue et de navigation, puis exige le parcours de validation complet. Tous les plans P1–P5 doivent avoir des modules explicitement choisis.
4. `node scripts/verify-pit-arena-composition-v43.mjs <arena-id>` dessine les vraies images avec le moteur et les combattants du jeu, dans un navigateur isolé. Les captures doivent ensuite être inspectées : le succès technique seul ne vaut pas revue artistique.
5. `node scripts/promote-pit-arena-compositions-v43.mjs --ids <numéros> --visual-review docs/v43-arena-composition-visual-review.json` exige les empreintes exactes de composition, huit scénarios de rendu, les six plans et une revue visuelle explicite avant activation.
6. `scripts/verify-pit-arena-application-v43.mjs` utilise `V43_QA_URL`, `V43_ARENA_QA_IDS`, `V43_ARENA_APP_QA_OUTPUT` et `V43_ARENA_QA_BUILD_KIND` (`development`, `compiled` ou `production`). Le navigateur utilise un profil isolé, le vrai menu Campagne, la sélection PIT, le clavier, le mobile et vérifie toutes les clés de sauvegarde `yautja`.
7. La promotion avec `--integrate --application-proof docs/v43-<rapport>.json` exige le chargement réel de chaque PNG et la même empreinte de composition. Les preuves de développement, compilation et production restent distinctes.

## Bibliothèque et fidélité

Un module partagé garde son fichier original : `sourceCatalogueId` et `sourceAssetId` désignent l'unique propriétaire. La bibliothèque enregistre son chemin, son SHA256 et ses dimensions. Aucun collage, recoloration ou copie supplémentaire n'est compté comme nouveau dessin. Un changement de source, de recadrage ou de placement invalide la preuve de composition.

Les modules de jungle tropicale, forêt tempérée, industrie humaine et vaisseau Yautja sont séparés. Le sol de contact reste au plan P4, à profondeur 1, avec une ligne réellement opaque. Les pixels originaux restent intacts : un `sourceCrop` adapte le cadrage sans prétendre produire un nouvel asset.

Les références privées, prompts et chemins de génération ne sont pas exportés dans le JSON destiné au navigateur. Seules les attestations nécessaires au rendu y sont conservées.

Les nouveaux décors ne déclarent aucun secteur interactif, aucun piège fonctionnel et aucune animation absente. Les trophées réemployés du Hall restent des dessins originaux du projet, pas des répliques exactes des crânes du film.
