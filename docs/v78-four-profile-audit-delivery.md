# V78 — quatre profils QA et corrections du lot

État initial du 3 octobre 2026 conservé ci-dessous : corrections enregistrées dans le checkout, **acceptation visuelle et publication non terminées**. Base publiée précédente : `2094e1541ad305b38163ab8595d93da8852a7c2b`. Les quatre profils ci-dessous sont des agents avec des angles d'examen différents, pas quatre personnes recrutées ni des essais sur quatre appareils physiques.

**Mise à jour de la reprise V79 :** espaceC: libéré (environ12,7GiB), treize originaux copiés byte-identiques par l'installateur autorisé. Sept nouveaux modules sont réellement montés avec pivots, supports, collisions, préchargement et codex ; six restent exclus du rendu (anatomie civile, volumes/intérieurs ou paliers à valider). Le contrôle source élargi passe49/49. La recette du nouveau GameClient est en cours ; ces faits remplacent l'état historique `NOT_COPIED` et le blocage disque décrits plus bas, sans transformer les anciennes capturesV77 en preuvesV79.

| Profil | Examen réellement effectué | Corrections enregistrées / limite |
| --- | --- | --- |
| QA1 — narration et usage mobile | Cinq captures de parcours V77 ouvertes, vrais callbacks d'ouverture, raccourcis et objectifs relus. | Briefing visible avant une nouvelle mission ; IA et horloge attendent le départ. Reprises sans répétition. Commandes essentielles compactes, outils secondaires dépliables, raccourcis reconfigurés, cartes local/régional expliquées, narration protégée du retour d'arme. Aucune nouvelle cinématique dessinée ou voix livrée. |
| QA2 — lisibilité, accessibilité et reprise | Concept fourni, port réel, Conseil et coffre des mémoires V77 ouverts. Source du rendu et de la reprise relue. Nouveau composant React exécuté réellement en SSR, sans remplacer ses fonctions. | Pas de façades étrangères derrière la façade active atténuée ; deux paliers seulement lors d'un transit. Profondeur du joueur et des objets cohérente avec leur pied projeté, sans saut de25000 au palier. Carte des cours ajoutées, façades fermées identifiées, lecture des sols et collisions identique au garde de position. SSR ne prouve pas les pixels, le focus navigateur ni la disposition mobile. |
| QA3 — urbanisme et circulation | Deux concepts et six captures réelles de ville V77 ouverts ; modèle de rues/volumes et chemins relu. | Trois rues basses, huit façades décoratives solides, sept cours du port, 52 placements de props, 14 figurants, 19 sols. Portes peintes≥128×80 ; quatre placements réellement refusés restent consignés. Accès aux43 bâtiments, sept raccords, dix retours régionaux et98 routines conservés. Les façades restent des variantes frontales existantes, sans fausses pièces visitables. |
| QA4 — art, perspective et univers | Concepts, extérieurs/intérieurs réels, puis13 nouveaux PNG sélectionnés et2 originaux remplacés ouverts. Mesures alpha, dimensions et SHA sur les originaux. Deuxième contrôle des corrections de portes, rôles et profondeur. | Codex spatial et provenance ; deux cadrages corrigés avec OpenAI, anciens originaux préservés. Plusieurs costumes civils existants dans les cours. La ville et ses institutions restent une adaptation originale, jamais une topographie canonique1:1 affirmée. Anatomie des deux nouveaux civils encore réservée. |

Les constats visuels ne reposent pas seulement sur un compte de fichiers ou des tests. Les captures réellement regardées sont nommées dans les trois rapports détaillés : [narration/mobile](v78-qa1-narrative-mobile-2026-10-03.md), [urbanisme](homeworld-urban-v78-audit.md), [art et codex](homeworld-city-codex-v78.md). Elles appartiennent néanmoins à V77 : aucune nouvelle capture complète V78 n'a été obtenue. Le [suivi narratif](v78-qa1-p2-followup-2026-10-03.md) sépare également la dernière passe ciblée de la régression élargie bloquée.

## Ce qui est réellement monté dans le code

`HomeworldWorldSceneV77.tsx` dessine les nouveaux sols, façades, accessoires et figurants avec les **images natives existantes**. `HomeworldHub.tsx` fait lire ces volumes au moteur extérieur ; `homeworldLocationV77.ts` utilise la même garde physique. Une façade collidable n'est pas laissée invisible. Les figurants suivent l'horloge existante, portent le costume de leur persona et ne créent ni dialogue, ni service, ni visite enregistrée. Les anciens rôles et IDs restent intacts.

Les101 fiches urbaines sont agrégées dans `HOMEWORLD_ALL_ELEMENT_CODEX_V71`. Leurs coordonnées sont déjà celles du monde V78 : la relocalisation historique du port ne leur est pas appliquée une deuxième fois. Les19 sols portent leur vrai polygone de support ; ce polygone est distinct d'un volume bloquant. Les huit réserves d'illustration oblique ne sont pas comptées comme huit constructions supplémentaires.

Le plan A* V78 est disponible et testé sur les nouveaux volumes. Il n'est pas présenté comme un pilotage automatique ou un nouveau chemin dessiné dans l'UI : l'atlas reste consultatif et les traversées se font à pied.

Les nouvelles positions légales sont reprises sans changer la version de sauvegarde. Une ancienne position devenue physiquement obstruée retourne au départ légal du port selon la garde existante ; cette chute de position ne supprime pas progression, équipement ou mission. Ce lot ne corrige pas le backend de synchronisation de compte ni ne prétend le tester.

## Treize sources générées, pas treize intégrations terminées

Le [manifeste des originaux](../app/game/data/homeworldCityGeneratedProvenanceV78.json) conserve chaque fichier, SHA, dimensions, alpha et réserves. Le [reçu visuel des sources](homeworld-city-generated-review-v78.md) détaille la relecture. Les [spécifications conservées](../app/game/data/homeworldCityGenerationSpecsV78.json) sont les demandes individuelles stockées ; le préfixe commun de style n'a pas été inventé après coup.

Le corpus comprend étal, maison marchande, poste de forge, rayonnage, soutènement, chariot de chargement, table commune, façade monumentale, escalier, rampe, deux poses civiles et citerne. Les anciennes maison et façade au cadrage insuffisant restent séparées. Les sujets sont transparents ; seule la métrologie alpha n'établit ni appui physique, ni ouverture utile, ni angle exact. Les deux civils sont des poses fixes à anatomie encore vérifier, sans nouveaux cycles de marche.

**Ces13 fichiers ne sont pas copiés dans le répertoire public, ni utilisés par le jeu.** Le mobilier ajouté au code réutilise quatre familles natives déjà mesurées ; il reste trop répétitif pour l'objectif de diversité architecturale et fonctionnelle de toute la ville.

`node scripts/install-homeworld-city-sources-v78.mjs --check` est en lecture seule et vérifie les13 originaux, leurs tailles et SHA. Le mode `--install`, non exécuté, doit suivre l'autorisation filesystem normale du checkout : copie byte-identique, aucune suppression, aucune recompression et refus d'écraser des octets différents. Même une copie réussie ne certifiera pas les pivots, collisions, consommateurs ou la publication.

## Vérifications séparées

Dernière passe ciblée : **44 tests passent, zéro échec**. Commande exécutée :

```powershell
node --test --test-concurrency=1 tests/homeworld-urban-v78.test.mjs tests/homeworld-scene-v78.test.mjs tests/homeworld-world-checkpoint-v77.test.mjs tests/homeworld-world-codex-v77.test.mjs tests/hunt-opening-v78.test.mjs tests/hunt-announcement-v78.test.mjs tests/responsive-accessibility.test.mjs tests/hunt-rites-v77.test.mjs
```

TypeScript non incrémental passe sans diagnostic. ESLint des16 fichiers TS/TSX concernés passe. Contrôle de provenance des13 originaux : `PASS_SOURCE_PROVENANCE_ONLY`, tous encore `NOT_COPIED`. Aucun nouveau build complet, parcours navigateur, commit, push ou déploiement V78 exécuté.

La première passe SSR avait24/25PASS : elle a trouvé les titres SVG construits en plusieurs enfants, refusés par React. Les titres ont été corrigés en chaîne unique, puis la passe est passée25/25. Les44 finaux ajoutent les derniers contrôles de file narrative, codex complet et modèles urbains. Ce reçu ne remplace pas le journal détaillé des premiers échecs conservé par chaque profil.

Le rendu SSR utilise les vraies fonctions React, géométrie, collections et collisions. Seuls les noms de classes CSS sont substitués, car aucune CSS n'est peinte. Il prouve que façades et accessoires montés correspondent aux solides, que le nouveau palier ne change pas soudain leur profondeur, que l'atlas décrit les nouveaux sols et que la reprise appartient à son bon propriétaire. Il ne prouve pas l'occlusion visuelle finale, le chargement bitmap ou les commandes tactiles.

## Historique du blocage et suite requise avant publication

C: est toujours mesuré à0octet libre malgré l'annonce de libération d'espace. Les petits patches ont réussi ; l'escalade pour copier les PNG et lancer la QA s'est arrêtée **avant exécution** : auto-review n'a pas pu initialiser sa session, `os error112` (espace disque insuffisant). L'accès normal au `public` situé sur un autre disque est refusé dans ce sandbox. Aucun refus contourné, aucune donnée de l'utilisateur supprimée et aucune nouvelle permission filesystem accordée.

Après résolution : copier les sources par le chemin autorisé ; mesurer appuis, seuils et orientations natives ; monter les éléments dans les vrais consommateurs ; lancer build et régression complète ; rejouer les parcours desktop/mobile du vrai GameClient avec le nouveau bouton de briefing ; ouvrir chaque nouvelle capture avant promotion. Capturer tous les raccords dans les deux sens, au milieu et aux paliers, pour contrôler terrasse/sol/objet/joueur. Le tri du pied écran reste une convention2.5D : il manque encore les masques d'intersection entre niveaux et les parois/soutènements qui rendent l'étagement lisible.

Restent pour terminer la cible complète : architecture oblique dédiée, palais et Conseil monumentaux avec volumes/intérieurs proportionnés, six raccords natifs encore partiels, paysages/skyline en plusieurs plans, intérieurs spécifiques plus riches et animations civiles de travail/sociales. Ce lot est un premier correctif de densité et de parcours, **pas une ville commerciale complète ou une fidélité canonique1:1 certifiée**. Les preuves V77 restent historiques et ne valident pas ces bytes V78.
