# V49 — animation THE PIT

## Dessins intégrés

Trois PNG OpenAI bruts apportent **12 nouveaux dessins**, sans retouche, miroir ou déformation : idle/garde natifs gauche et attaque légère native droite/gauche. Ahab masqué possède désormais **16 dessins, 10 clips** (idle et garde des deux côtés, puis anticipation/contact/récupération de l’attaque légère).

Chaque attaque utilise quatre dessins : anticipation, contact, suivi du geste, retour. Le moteur conserve exactement ses fenêtres de 5/3/10 ticks. La récupération ne boucle jamais. L’échelle corporelle est constante par feuille et les deux appuis ont été mesurés, sans ajuster la taille de chaque pose.

Trois candidats ont été rejetés : deux feuilles de six poses dont les lances/capes empiétaient sur les voisins, et une première attaque gauche avec un halo alpha au bord supérieur. Le seuil d’acceptation n’a pas été affaibli. Mesures et décisions : `docs/v49-ahab-art-review.json`. Prompts et provenance : `docs/v49-openai-prompts.json`.

## Corrections du moteur de présentation

- Un impact réellement bloqué conserve le dernier dessin de la garde correspondante, côté natif et apparence exacte. Il ne revient plus soudain à la pose neutre pendant le blockstun.
- Cette pose tenue reste déclarée `sprite-sheet-hold` : aucun dessin d’impact ni couverture d’animation supplémentaire ne sont inventés.
- Les captures et récupérations de projection ne sont jamais confondues avec un blocage, même lorsque le moteur emploie la phase `blockstun`.
- Une garde basse ne réutilise jamais une garde haute. Les états non couverts conservent leur repli explicite.
- Le chargeur distingue les apparences d’une même identité : aucune sélection écrasée, aucun emprunt du costume opposé en cas d’échec, horloges des deux emplacements indépendantes.

## Vérifications

**68 tests ciblés finaux réussis** dans `outputs/qa-commercial-audit/v49/pit-animation-final-tests.tap` : variantes/garde, horloges, orientations, rigs et préparation des pixels réels de tout le registre. Cinq nouveaux cas vérifient les corrections de présentation. ESLint ciblé réussi. Sur build provisoire, un vrai coup clavier a produit la pose tenue pendant le blocage (preuve `work/v49/guard-runtime-provisional-qa/report.json`, aucune erreur JS/HTTP inattendue). La recette navigateur complète V49 réussit ses **21 contrôles** sur le build comprenant les trois nouvelles feuilles : les 16 dessins sont observés au laboratoire, les quatre dessins de chaque attaque sont réellement joués au clavier des deux côtés, les gardes tiennent leur dernier dessin et les vrais impacts bloqués ne changent plus de pose. La variante sans masque reste isolée. Aucune erreur JS/HTTP inattendue. Rapport : `outputs/qa-commercial-audit/v49/final-pit-animation-complete-qa/report.json`.

La préparation réelle de tout le registre valide **86 pages, 581 dessins distincts, 277 clips de phase**, dont quatre pages et dix clips pour Ahab. Ces nombres ne représentent pas des movesets complets.

## Enveloppes caméra sans modification du rendu

Les douze nouveaux dessins possèdent une enveloppe alpha dédiée au cadrage. Tous leurs pixels au-dessus du seuil alpha 2 restent inclus, avec une marge d’un pixel. Le test de production vérifie que chaque pixel omis par cette enveloppe est transparent après préparation. Les crops et pivots utilisés par `drawImage` sont inchangés.

Une expérience de recadrage direct a été rejetée : malgré des coordonnées géométriquement équivalentes, le rééchantillonnage Chrome produisait de petits écarts. La solution retenue ne modifie que les métadonnées caméra. **72 comparaisons Chrome passent avec zéro octet RGBA différent** entre l’ancien et l’actuel rendu (12 poses × 3 zooms × 2 positions), preuve : `outputs/qa-commercial-audit/v49/pit-camera-bounds-render-equivalence.json`. Deux nouveaux tests vérifient les coordonnées caméra, le maintien intégral des arguments de dessin et le rejet des enveloppes invalides. Le groupe final de 21 tests (moteur, pixels de production, couverture) passe dans `pit-camera-bounds-tests.tap`.

Le build final et ses régressions globales relèvent de la validation de publication ; les preuves navigateur ci-dessus concernent le build 2, dont le rendu des personnages est préservé à l’identique.

## Limites assumées

Les duels miroir restent interdits par le moteur ; la correction du chargeur ne les active pas. Ahab conserve le profil de duel partagé : la lance dessinée ne crée pas une portée/hitbox nouvelle ou une technique canonique propre au personnage. Les attaques moyenne/lourde, techniques, projections, sauts et postures accroupies ne reçoivent pas de nouveaux dessins dans ce lot. La version sans masque ne réutilise pas ces feuilles. Les images constituent une adaptation cohérente de l’apparence fournie, pas une certification canon 1:1 ni un moveset complet.
