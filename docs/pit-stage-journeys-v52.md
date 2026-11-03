# THE PIT V52 — quatre parcours supplémentaires

Quatre liaisons d’exposition originales du projet réemploient huit kits bitmap déjà présents :

| Départ | Arrivée | Identifiant persistant |
| --- | --- | --- |
| 021 Marche du Convoi | 080 Dernier Quai | `convoy-quay-passage-v1` |
| 033 Chantier des Motherships | 048 Cale du Vaisseau Perdu | `shipyard-hold-passage-v1` |
| 034 Archive Interdite | 061 Chambre des Échos | `archive-echoes-passage-v1` |
| 037 Écluse des Marais | 031 Cœur de Mangrove | `marsh-mangrove-passage-v1` |

Le contrat V42 (`docs/pit-stage-journey-v42.md`) sert de base mécanique. Ces rapprochements thématiques ne proviennent pas de nouveaux messages privés récupérés et ne certifient pas une géographie canonique. Aucune nouvelle image n’est générée. Le catalogue de secteurs était un plan de production, pas un plan détaillé officiel de chaque niveau.

## Choix et transfert

Dans **Options & parcours**, un sélecteur propose les cinq liaisons (Réserves comprise) et le duel neutre. Choisir une liaison sélectionne son arène de départ et précharge ses deux kits ; la case de l’arène choisie reste disponible. Le choix est autorisé en Duel CPU, Versus local et Entraînement libre. Changer d’arène manuellement désactive le parcours. Arcade, Circuit et Descente conservent leurs règles imposées.

Les assets de tous les secteurs doivent être prêts avant le lancement. Une panne de la destination bloque le départ, avec information visible hors du panneau et bouton de nouvelle tentative. Une projection ayant réellement infligé ses dégâts en bord gauche ou droit transfère les deux joueurs ensemble. KO, timeout, déchoppe, attaque manquée, capture seule et Traque n’activent pas la liaison. Le transfert conserve santé, ressource, stun, knockdown et ordre des joueurs ; aucun bonus ni dégât de décor n’est ajouté.

La collision neutre 960×540, sol 430, murs 54/906 et positions 300/660 est conservée pour tous les kits. Les props ne deviennent pas des obstacles physiques par simple présence dans le dessin. Un seul transfert est possible par manche ; reset, revanche et manche suivante repartent dans le premier secteur tout en conservant l’identifiant choisi.

## Compatibilité et périmètre

Le moteur reste version 6, l’enveloppe replay version 3 et les clés d’état/événement demeurent inchangées. L’extension ajoute uniquement des identifiants de parcours. La validation exige l’identifiant exact et son arène de départ ; une destination ne peut pas être utilisée comme entrée forgée. Les fixtures V4/V5 sont conservées ; la référence V6 Réserves générée avec le code Git V51 avant extension garde ses 260 ticks et son checksum `47ceba24`.

Le total est maintenant **5 départs avec un parcours à deux secteurs**, dont 4 ajoutés dans ce lot. Les 75 autres départs du groupe 1–80 restent sans parcours ; les arènes 81–100 restent des duels purs. Les arènes films/jeux et les autres niveaux ne sont pas déclarés achevés. Aucun accessoire animé ou interactif propre aux huit décors n’est ajouté par ces liaisons.

## Vérification

- `tests/pit-stage-journeys-v52.test.mjs` : 8 tests mécaniques des 4 liaisons, validation des vrais kits, replays V4/V5/V6.
- Régressions du parcours Réserves et des archives replays conservées.
- `scripts/verify-pit-stage-journeys-v52.mjs` : **8/8 contrôles navigateur réussis** sur le second build V52 (4 pannes/reprises du décor destination, 4 transferts réellement joués au clavier avec bannière de destination vérifiée). Aucun état de combat injecté.
- Les suites du nouveau lot, du parcours Réserves et des replays passent **40/40 tests**. Le checksum historique V6 est inchangé.
- Preuves : `outputs/qa-commercial-audit/v52/stage-journeys/browser-build2/report.json` et `visual-review.json`. Les quatre captures de destination corrigées ont été inspectées ; le premier build et son défaut de libellé restent consignés séparément.
