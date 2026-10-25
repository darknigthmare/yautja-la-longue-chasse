# Projections avant de Feral et Scar — V109

La recette « Projections avant · Feral ↔ Scar » ajoute les projections avant du classeur dans un duel entre les deux chasseurs, avec leurs apparences BODY d’origine. Elle hérite des normales, gestes étendus et dispositifs limités de la recette précédente. Les autres partenaires, costumes et projections arrière restent hors de cette livraison ; les deux actions source ne sont pas déclarées terminées globalement.

Le choix reste masqué tant que les huit rôles et orientations ne sont pas admis. Le lancement puis la simulation attendent aussi le décodage complet des dessins de l’attaquant et de sa victime. Une image manquante suspend le duel et propose de réessayer.

## Jouer

- Activez la recette dans les options d’un duel local, CPU ou d’entraînement entre Feral et Scar.
- Appuyez sur **L + M**, sur **Projection**, sur les deux boutons correspondants de la manette, ou sur le bouton **Projection avant** du joueur. L + M suit les affectations clavier et tactiles actuelles ; sur une manette standard, il utilise les boutons de frappe légère et moyenne.
- Approchez une cible au sol située devant votre chasseur. Le démarrage dure 8 ticks, le contact 3 et la récupération 30, à 60 Hz. La projection inflige 110 dégâts de base sans dépenser de Traque ; les protections de combat existantes continuent de s’appliquer.
- Une cible normalement éligible dispose de 8 ticks après la saisie pour déchopper : relâchez puis effectuez un nouvel appui sur Projection, L + M ou **Déchopper**. Un appui déjà maintenu ne suffit pas. La récupération d’une attaque punie par la saisie reste indéchoppable.
- Un échec à distance conserve la récupération complète. La préparation d’arme et la projection ne rechargent aucun dispositif consommé.

La cible conserve son identité, sa santé et son équipement. Ses propres dessins montrent la saisie, le vol, l’impact et le relèvement ; aucun mannequin peint dans l’image de l’attaquant ne remplace le combattant adverse. La trajectoire de duel parcourt jusqu’à 120 unités, avec une hauteur maximale de 64, et s’arrête aux limites de l’arène. Ces distances et la pause bornée de la paire sont des adaptations du jeu. Les dégâts arrivent à l’impact, puis le véritable compteur de mise au sol reprend. Un KO d’entraînement tient la pose d’impact jusqu’à la fin de son compteur.

Le CPU réagit à la capture visible après cinq ticks selon sa règle de réaction déterministe. Il ne lit pas la commande future du joueur et respecte l’éligibilité de la cible à la déchoppe.

## Revoir et vérifier

La recette est enregistrée séparément dans les replays V16. À l’issue du duel, **Revoir le duel** rejoue les véritables commandes et **Exporter le replay JSON** permet de conserver cette archive. Les recettes et archives V11 à V15 gardent leurs règles publiées ; un ancien replay ne devient pas une projection V109 en changeant son étiquette.

Les PNG proviennent de dessins natifs indépendants par personnage, rôle et orientation. Les sorties brutes et leurs reçus sont conservés dans [le dossier de provenance](suivi-production/v109-pit-forward/). Les rectangles UV sélectionnent les dessins d’origine ; les pivots et une échelle anatomique uniforme par page règlent leur placement. Aucune réflexion, rotation de sprite, interpolation, découpe de mannequin, retouche du PNG ou filtration des pixels décodés n’est autorisée pour fabriquer une pose manquante. La taille de référence d’un corps couché ne se déduit pas de la hauteur de son rectangle.

Le manifeste runtime se trouve dans `app/game/data/pitWorkbookThrowsV109.json`. `getPitForwardThrowWorkbookFactsV109()` exporte les IDs effectivement liés et le nombre de dessins BODY admis. Son champ `sourceCompletion` reste faux : le support est borné au duo sans costume. Le dossier [native-uv-border-review-final.json](suivi-production/v109-pit-forward/native-uv-border-review-final.json) vérifie les 48 rectangles à bord alpha 0 après les corrections natives. Les appuis au sol sont mesurés dans [native-ground-calibration.json](suivi-production/v109-pit-forward/native-ground-calibration.json), sans modifier les dessins ni leur taille anatomique.

Les contrôles de cette livraison sont :

- `tests/pit-forward-throws-v109.test.mjs` : physique, saisie, inputs frais, recovery punie, CPU, labo, inventaire, murs, interruption, snapshots et victoire complète avec replay.
- `tests/pit-engine-compatibility-v109.test.mjs` : comparaison du moteur courant avec la capsule V108, dont 7 200 états V11–V15 et leurs archives.
- `tests/pit-forward-throw-art-v109.test.mjs` : vrais PNG, empreintes, alpha, 48 dessins distincts, sélection des deux rôles, seek, poses d’échec/déchoppe/KO et panne d’une page victime.
- `scripts/qa-pit-forward-throws-v109.mjs` : parcours de l’application avec vraies commandes, les deux ordres du duo, contrôle des appels `drawImage`, captures, victoire jouée et replay public. Une exécution de développement reste exploratoire ; la preuve finale doit identifier le build de production figé commun aux autres chantiers V109.

Le contrôle des bordures se reproduit avec `python scripts/review-pit-native-borders-v109.py --corrections docs/suivi-production/v109-pit-forward/native-gutter-delivery.json --output docs/suivi-production/v109-pit-forward/native-uv-border-review-final.json --strict`. Il lit les PNG d’origine et refuse toute région qui ne peut pas garder une bordure alpha 0 sans inclure un autre corps visible.
