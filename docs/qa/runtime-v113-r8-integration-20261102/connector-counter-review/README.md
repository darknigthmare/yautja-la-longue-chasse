# Compteur du détour Homeworld — frontière courante / historique

Le test courant doit compter **1394 vrais pas** et conserver **plus de 7000 unités parcourues**. L’ancienne assertion **1421 pas et plus de 7100 unités** reste inchangée dans une fixture exacte de `03cf51badd450338d748da55599a317a71debd28`, rejouée avec la capsule R7 authentique. Aucun fichier racine, compteur, point d’arrivée, collider ou moteur n’a été modifié pendant cette analyse.

| Contexte réellement exécuté | Appels moteur / samples durables | Distance parcourue |
| --- | ---: | ---: |
| Courant `a83d239`, 13 joints physiques | 1394 / 1394 | 7034,4925605987555 |
| Historique `03cf`, capsule exacte | 1421 / 1421 | 7140,3749410165365 |
| Courant, seul provider de joints désactivé dans une fixture isolée | 1421 / 1421 | 7140,3749410165365 |

Les joints modifient le **graphe global et le détour choisi par la recherche bornée**. Le chemin courant lui-même est aussi supporté par l’ancien sol : ce n’est pas la preuve d’un franchissement local d’un joint. Les deux trajets partagent leurs 13 premiers points jusqu’à `(4032,2976)`, puis choisissent des détours différents. Le trajet actuel économise 27 pas et 105,88238041778095 unités réellement parcourues. Désactiver seulement les joints restaure exactement le trajet historique et ses mesures.

Tous les invariants du premier cas ont été exécutés après les mesures : chaque pas mesure entre environ 1 et 5,5 unités ; 1394 appels moteur correspondent à 1394 samples valides ; le delta du registre égale la distance mesurée et le lot porté suit l’acteur à chaque pas. Aucune collision n’est traversée, aucun compteur n’est affecté directement. Les deux contextes arrivent à `(4500,2960)` et posent le lot à `(4500,2900)`. Normalisation, interruption/park, obstruction réelle du Conseil, arrivée supérieure libre et accès ascenseur/acropole passent.

Les trois fichiers proposés sont figés dans `proposed/` et épinglés par `proposal-manifest.json` ; `proposed-b2.patch` contient le changement courant et les deux ajouts. Le runner historique temporaire reste hors des 1895 fichiers privés de la capsule et ne change que la résolution de son import vers le vrai helper historique. Les six assertions d’origine passent, sans modification de leur corps et sans skip. Le vérificateur R7 et son compte de 1895 fichiers restent inchangés.

`historical-proposed.final.tap` passe : une enveloppe vérifie les six résultats historiques PASS, zéro échec et zéro skip. `current-proposed.final.tap` passe également. Le premier `historical-proposed.tap` échoue dans le harnais initial : le contexte de test hérité absorbait le rapport enfant et TAP n’était pas explicite. Ce diagnostic reste hors publication ; le harnais final reprend la frontière déjà employée par l’API R7 (`NODE_TEST_CONTEXT` supprimé dans l’enfant, rapport TAP explicite). Aucun échec produit n’est masqué.

`current-measurement.json`, `historical-measurement.json`, `joints-disabled-measurement.json` et `route-attribution.json` conservent les chemins, registres et mesures bruts. Ces preuves portent sur les sources et la simulation native ; elles ne constituent ni une recette navigateur R8, ni une validation artistique.
