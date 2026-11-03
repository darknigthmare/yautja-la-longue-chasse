# Homeworld V64 — provenance et contrôle du kit natif

Le kit livré comprend **10 PNG natifs OpenAI et 20 dessins statiques** : cinq façades réutilisables, neuf objets indépendants dans un atlas, trois panneaux intérieurs dans un atlas, un pavement, une navette et une aire d'atterrissage. Les 16 générations ont produit dix images acceptées et six étapes intermédiaires conservées. Aucun nouveau dessin d'animation n'est compté.

Les PNG utilisés par le jeu sont identiques aux sorties natives, SHA-256 à l'appui. Les découpes d'atlas se font à l'affichage ; aucun montage, redessin, effacement d'alpha ou rééchantillonnage hors moteur n'a modifié les fichiers. Les anciennes images et les variantes rejetées sont préservées. Les dix reçus dans `v64-homeworld-art-generation/` consignent les prompts, dimensions, sources et SHA. Le registre intégré est `app/game/systems/homeworldArtV64.ts`.

## Références et limite de fidélité

- [Alex Nice, artiste de production : concepts Homestead de Predator: Badlands](https://www.linkedin.com/posts/alexniceartist_predatorbadlands-yautja-predator-activity-7405352080015622144-QEtm). Deux images du billet ont été inspectées ; captures conservées dans `work-local/v64/references/alex-nice-linkedin-1.png` et `alex-nice-linkedin-2.png`.
- [Entretien direct avec les réalisateurs d'Aliens vs. Predator: Requiem](https://gizmodo.com/aliens-vs-predator-2-requiem-directors-tell-io9-about-335290).
- [Fiche officielle du film chez 20th Century Studios](https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem), pour identifier la référence, pas pour prouver un plan d'architecture.

Les maisons, l'organisation urbaine, le mobilier domestique et la navette sont des **adaptations originales du projet**. Ces sources éclairent les matériaux et formes ; elles ne prouvent pas des logements ou des services canoniques 1:1. Une page ArtStation de l'artiste a affiché une vérification de sécurité : son écran d'attente n'est pas traité comme une référence visuelle et aucun contournement n'a été tenté.

## Contrat géométrique

Vue orthographique, façades vers le sud, caméra à 35° au-dessus du sol, axe horizontal conservé. Le sol reçoit une projection verticale `sin(35°)` ; les volumes déjà dessinés dans cette vue ne reçoivent pas une seconde compression. Un adulte correspond à 100 unités. Les bâtiments sont mis à l'échelle uniformément par leur fondation, puis placés par le seuil peint mesuré, sans utiliser le bord alpha comme seuil.

Les cinq rectangles de passage ont fait l'objet d'une relecture indépendante et dépassent 80 × 128 unités utiles. Le rectangle de la maison C a été resserré à `{x:384,y:884,width:252,height:450}` pour exclure le linteau et les huisseries, sans modifier son PNG. La maison B présente un retrait réel du seuil ; le modèle le déduit des pixels et de la projection.

La navette est un appareil local original, pas une reproduction du vaisseau sélectionné par le joueur. Le disque d'atterrissage est un matériau vu du dessus projeté une seule fois. Son empreinte visible de 1000 × 719,697 unités est centrée dans la réservation de 1000 × 760 sans étirement arbitraire.

Les neuf objets ont un rectangle source, un pivot et des limites alpha propres. Les trois panneaux intérieurs sont indépendants : mur nord et retours est/ouest coupés plus bas. Les différentes pièces assemblent ces panneaux et du mobilier ; elles ne constituent pas 43 illustrations uniques et n'étirent pas une image complète de pièce.

## Preuves distinctes

- `v64-homeworld-native-art-qa.json` : **17 contrôles réussis**, portant sur dix copies natives, deux couvertures d'atlas et cinq ouvertures.
- `v64-homeworld-art-visual-review.json` : trois compositions natives inspectées, hors partie jouable.
- `v64-homeworld-art-application-review.json` : revue des captures du vrai jeu, avec défauts de raccord et suivi de leur correction. Ne pas confondre la qualité des PNG avec une validation automatique de toutes les routes ou de tous les services.

Le pavement présente un motif de dallage répété ; sa répétition a été inspectée mais une continuité mathématique parfaite des pixels aux bords n'est pas revendiquée. Les cinq façades restent des familles réemployées. La recette globale, les 43 visites, les collisions, les services et la publication sont des validations séparées du kit d'art.
