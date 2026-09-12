# THE PIT V32 — animations livrées et demandes encore ouvertes

Ce rapprochement porte sur les sources locales accessibles : les quatre partages conservés dans `tmp/chatgpt-audit-2026-09-08/`, le backlog croisé du 4 septembre, le contrat V26 et la livraison V31. Il ne constitue pas une nouvelle lecture de tout le dossier ChatGPT. Le texte brut de la conversation des cent arènes n'a pas été retrouvé pendant cette passe ; sa cible locale est portée par `pitArenaCatalogue.ts`.

## Livraison bitmap vérifiée

Jungle Hunter et City Hunter disposent chacun d'une attente et d'une attaque légère debout, avec deux orientations dessinées séparément. Les quatre planches comprennent **32 dessins distincts**, répartis en **16 clips de phase**. Cela correspond à **huit séquences avec orientation** : quatre attentes et quatre attaques légères, ces dernières découpées en anticipation, contact et récupération.

Les fichiers sont contrôlés sur leurs vrais pixels : dimensions, fond magenta explicitement déclaré, détourage en mémoire, bords transparents de chaque rectangle, contenu visible et dessins distincts. Les sources PNG restent inchangées. Les rectangles irréguliers et pivots sont déclarés individuellement ; aucune grille uniforme artificielle n'est imposée. Le rapport [pit-v32-animation-coverage.json](pit-v32-animation-coverage.json) conserve les empreintes des sources et cellules, les contrôles alpha et la résolution de chaque état dans le véritable adaptateur de combat. La vérification numérique complète la revue visuelle ; elle ne prouve pas seule l'anatomie ou la fidélité.

Le moteur à 60 ticks impose les durées de l'attaque. Une phase courte peut tenir un seul dessin seulement si les trois phases existent et si l'attaque complète contient au moins trois dessins distincts. L'attente exige au moins deux dessins distincts. Les boucles suivent les ticks simulés et restent immobiles en pause. Aucun miroir, interpolation ou déformation de cellule n'est utilisé ; la référence de hauteur corporelle est constante par planche.

Pour un mouvement encore sans animation, ces chasseurs conservent le premier dessin d'attente de la bonne orientation. Le statut est **`sprite-sheet-hold`**, donc une pose tenue, et non une animation de cette action. Si cette orientation n'existe pas, le jeu utilise la plaque statique antérieure. Le statut **`sprite-sheet-animation`** est réservé à l'état réellement couvert. Cette pose tenue n'ajoute aucun clip ou dessin au décompte.

Le cadrage inclut l'enveloppe des cellules et armes avant chargement. Les sources invalides, opaques, en damier, vides, coupées ou dupliquées sont rejetées ; un clip multipage n'est utilisable que si toutes ses pages sont prêtes. Annulation, délai dépassé et callbacks tardifs ne publient pas d'image abandonnée. Les règles, dégâts, hitboxes, sauvegardes et replays du combat restent indépendants de ce rendu.

## Demandes restant à produire

| Priorité | Demande attestée | État après ce lot |
| --- | --- | --- |
| 1 | Locomotion et contrôle complets pour chaque chasseur : marches avant/arrière, accroupissement, saut en phases, gardes et réactions. Contrat V26, lignes 17–24 ; audit partagé, section 11. | Attente livrée uniquement pour Jungle Hunter et City Hunter. La marche Jungle essayée reste un brouillon ; les mouvements absents utilisent une pose tenue ou une plaque. |
| 2 | Attaques par posture, techniques et transitions de camouflage, Rupture et Instinct. Même contrat ; backlog PIT-05. | Légère debout livrée pour les deux chasseurs. Moyenne, lourde, technique, attaques accroupies/aériennes et ressources restent ouvertes. |
| 3 | Projections réussies/ratées/déchoppées avec victime, coups reçus, chute, relevée et KO. Backlog PIT-06/PIT-08 ; contrat V26. | Mécanique de saisie et déchoppe existante ; bibliothèque de dessins synchronisés encore absente. |
| 4 | Supers, ultime, exécution honorable, fatalité, brutality, autodestruction interrompable et Dernière Chasse, avec variantes de victime et gore réduit. Backlog croisé, lignes 110–112 et 131. | Aucun de ces ensembles n'est déclaré terminé par ce lot. |
| 5 | Roster complet, movesets étendus et postures Contact/Arsenal de Scarface. Backlog croisé, lignes 109–112 et 126. | Les autres combattants PIT conservent leurs plaques fixes. Les budgets historiques ne sont pas des fichiers d'animation créés. |

Les **264 entrées historiques sont des lignes de production/recherche**, comprenant individus, versions, archétypes et ensembles à identifier. Elles ne représentent ni 264 clips, ni 264 individus canoniques distincts. Cette livraison n'achève la bibliothèque complète d'aucun personnage et ne clôture pas ces lignes globales.

Le Circuit du chasseur personnel, les choix de voie, l'enquête contre les Bad Blood de Cinder et l'exposition des récompenses cosmétiques au vaisseau restent également ouverts. Les lieux du Cercle de basalte/Cinder et de la Terrasse de verre/Serekh-9, le drone Falconer non offensif, l'entraînement avec déchoppe et le portable PC V31 ont déjà été corrigés ou livrés ; les anciens constats d'absence sont historiques.

Les arènes font l'objet d'un lot de parallaxe distinct. Le nombre de fiches au catalogue ne prouve pas que les 92 concepts supplémentaires sont devenus jouables, ni que secteurs, transitions et accessoires interactifs sont implémentés. L'intégration et la recette visuelle des arènes doivent être rapprochées de leurs propres preuves V32.

## Vérifications de ce lot

- `node --test tests/pit-sprite-sheet-animation.test.mjs tests/pit-combat-bitmap-art.test.mjs tests/pit-sprite-sheet-production.test.mjs` : **27 tests réussis**, dont la préparation des quatre PNG réels.
- TypeScript global et ESLint ciblé : réussis au cours de l'intégration ; la recette globale finale reste portée par la livraison V32.
- La recette de pixels est reproductible par `tests/helpers/pit-sprite-sheet-production.mjs`. Elle ne nécessite aucune API d'images ni aucun téléchargement.

Sources locales : [contrat d'animation V26](hunter-sprite-animation-contract-v26.md), [inventaire des entrées de production](known-yautja-sprite-roster-v26.md), [backlog des discussions](chatgpt-yautja-backlog-2026-09-04.md), [livraison V31](chatgpt-v31-delivery.md).
