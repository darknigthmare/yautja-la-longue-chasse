# V58 — Feral : séparation des carreaux et des pièges

Audit et correction du 30 septembre 2026. Source de travail : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, lu par son extraction conservée dans `docs/v56-excel-priorities.json`. Le classeur n’a pas été modifié.

## Ce que les sources établissent

- [Notes de production officielles de Prey, page 4](https://lumiere-a.akamaihd.net/v1/documents/prey_final_production_notes_bios_59_82be4e25.pdf) : Dan Trachtenberg distingue les carreaux tirés avec visée laser du canon plasma et cite séparément le dispositif de filet explosif, le cut clamp et le bouclier. Cette source ne décrit pas les règles d’un duel à 60 Hz.
- [NECA — Ultimate Feral Predator](https://store.necaonline.com/products/prey-7-action-figure-ultimate-feral-predator) : le fabricant licencié documente le lance-projectiles, les configurations de lance et les boucliers ouvert/replié. Une liste d’accessoires de figurine ne constitue pas à elle seule une règle de gameplay.
- [NECA — Camo Reveal](https://store.necaonline.com/products/prey-ultimate-camo-reveal-feral-predator-scale-action-figure-2024-con-exclusive) : les petits dispositifs sont documentés séparément. Leur existence ne transforme pas un carreau en piège posé au sol.

Les proportions exactes, le nombre de vues d’un accessoire et sa géométrie doivent encore être vérifiés sur des vues exploitables avant certification visuelle. Aucun élément du classeur n’est traité automatiquement comme canon.

## Demande et anomalie corrigée

| Cellule du classeur | Portée |
| --- | --- |
| `02_PERSONNAGES!J10` et `S10` | Lance scindée, bouclier et lance-carreaux ; pas de canon classique, visée liée au masque. |
| `05_MOVES_PROPOSES!P10` | Trois carreaux vers un point acquis au départ ; sans poursuite illimitée. Les chiffres et la trajectoire de duel sont des propositions de design. |
| `05_MOVES_PROPOSES!Q10:R10` | Bouclier et lance scindée : restent ouverts, non livrés par ce correctif. |
| `05_MOVES_PROPOSES!S10` | Mine distincte et conditionnelle, pas une justification pour renommer un carreau immobile. |

Avant V58, `feral-bolt-trap` était une entité immobile au sol, armée pendant sept ticks, survivant 180 ticks et appliquant `pinned`. Son nom « Piège à carreaux » amalgamait le projectile et le dispositif posé. Le moteur V9 utilise maintenant `feral-guided-bolts-v58` :

- Trois entités indépendantes, chacune consommée après son premier impact ou sa sortie de l’arène.
- Un point acquis lors du départ et un vecteur conservé par chaque carreau. Un déplacement ultérieur de la cible ne recalcule pas la trajectoire.
- Les trois identifiants explicites de variantes sans masque connus du manifeste tirent droit. Aucune déduction depuis une étiquette traduite ou un mot dans un nom.
- Pas de plasma, de statut d’immobilisation, de blocage du saut ou de poursuite infinie ajouté au projectile.
- Coup de niveau milieu, gardable debout ou accroupi. Dégâts répartis entre les trois carreaux ; timings du bouton technique conservés pour ce lot.

Le point figé et le tir rectiligne démasqué sont ici l’adaptation demandée par le classeur. Ils ne reproduisent pas la scène finale complète avec masque posé ailleurs. Ni les commandes à quarts de cercle, ni les quatre spéciaux, ni leur coût proposé ne sont annoncés comme terminés.

## Conservation des parties et replays

`PIT_STATE_VERSION` passe de 8 à 9 ; le format d’entrées reste `input-rle-v3`. Les replays V8 utilisent leur propre stepper et l’ancienne recette exacte de Feral. Les chemins V2/V4/V5/V6/V7 restent disponibles.

Une fixture V8 a été capturée **avant** toute modification des règles : `tests/fixtures/pit-replay-v57-feral-v8.json`, 320 ticks, checksum `5733ca4f`, vies finales `[960, 782]`. Elle contient des impacts réels de pièges. Elle n’a pas été reconstruite avec le moteur modifié.

Un snapshot ancien conserve ses pièges et le statut d’immobilisation restant jusqu’à expiration ; une nouvelle commande dans la partie migrée crée les carreaux V9. Les objets de vol sont sérialisés avec leurs identifiants, acquisition et vitesses ; les valeurs malformées sont refusées. Les sauvegardes de campagne et récompenses ne sont pas écrites par ce lot.

## Vérifications et limites

- **12 nouveaux tests** : deux orientations, trois entités, acquisition fixe, trois variantes démasquées, dégâts uniques, gardes, esquive par saut, chute de la cible, tir aérien, restauration, rejet des données invalides, fin de manche, fixture V8 et replay V9.
- **173 tests ciblés réussis** dans `work-local/v58/feral-regression-verified.log`, incluant combat, replay, versions historiques, Falconer, Tracker, transferts de scène et projections.
- ESLint : **0 erreur**, `work-local/v58/feral-lint.log`.
- Les quatre anciens tests portant volontairement sur les pièges restent exécutés avec le stepper V8. Les nouveaux tests couvrent les règles actuelles.
- La première passe de régression a identifié une validation de snapshot qui refusait encore `pinned` venant de l’ancienne recette Feral ; elle a été corrigée et la totalité des tests relancée.

## Vérification du jeu assemblé

Recette reproductible : `scripts/verify-feral-bolts-v58.mjs`, variables `V58_FERAL_QA_URL` et `V58_FERAL_QA_OUTPUT`. Elle utilise un profil Chrome synthétique, la sélection visible des combattants et du stage, les véritables touches des deux joueurs et une horloge contrôlée. Les observations Canvas sont en lecture seule ; aucune vie, trajectoire, phase, position ni issue n’est injectée.

- **Vinext final : 8/8 duels réussis**, `work-local/v58/qa/feral-vinext-final/report.json`. Un costume masqué et chacune des trois variantes explicitement démasquées sont essayés à gauche puis à droite. Huit captures de lancement enregistrées et toutes inspectées.
- **Next final : 8/8 duels réussis**, `work-local/v58/qa/feral-next-final/report.json`. L’interface affiche explicitement V58 (`versionUiVerified: true`). Seize captures enregistrées ; les huit vues de mi-vol ont été inspectées, couvrant les quatre apparences et les deux côtés.
- Chaque duel vérifie trois entités et leurs indices, un identifiant de salve commun, le bon propriétaire, la visée avec masque ou le tir horizontal sans masque, puis l’acquisition et les vitesses inchangées quand l’adversaire se déplace réellement.
- La pause fige les positions, les entités et le compteur de combat. Une garde haute réelle bloque les projectiles, produit le feedback cyan et ne subit que les dégâts résiduels attendus. Aucune entité plasma ni état `IMMOBILISÉ` n’apparaît.
- Aucune erreur JavaScript, console ou HTTP dans les deux recettes ; l’intégralité du stockage local reste identique avant et après. Aucun de ces duels libres n’attribue de progression.

La recette narrative exécutée en parallèle a découvert que les gains de Traque masquaient les événements d’impact dans le Canvas. Ce défaut de feedback préexistant a été corrigé avant ces deux validations finales. Les parades ci-dessus vérifient donc aussi le véritable anneau d’impact visible, pas uniquement une baisse de vie.

L’aspect du carreau reste un indicateur métallique provisoire, sans certification de géométrie 1:1. Aucun nouveau cycle montrant Feral armer et tirer le lanceur n’est livré ici. Le clip V34 nommé « Charge au bouclier » montre encore une attaque de lames avec le bouclier levé : il reste à reprendre avec un clip dédié. Ces recettes qualifient les règles et la présentation testées dans le navigateur local ; elles ne certifient ni la fidélité anatomique des images existantes, ni le paquet PC, ni une publication distante.
