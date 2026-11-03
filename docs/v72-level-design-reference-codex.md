# Références et règles de composition V72

## Sources primaires consultées

- [Entretien Acquire / Square Enix sur Octopath Traveler](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true) : association de personnages 2D et d’un environnement en volume, travail conjoint de la lumière et des effets. Cette référence guide la lisibilité et la séparation des plans ; elle ne fournit pas le plan de notre cité.
- [Unity Manual : 2D Sorting](https://docs.unity3d.com/2021.1/Documentation/Manual/2DSorting.html) : tri selon un axe et possibilité de mesurer la profondeur au pivot du sprite. Dans ce jeu, le pivot est le contact au sol et l’ordre dépend du Y physique.
- [Unity Manual : Importing Sprites for an Isometric Tilemap](https://docs.unity3d.com/2019.4/Documentation/Manual/Tilemap-Isometric-SpritesImport.html) : import, échelle et pivot cohérents des éléments. Ces principes sont adaptés au moteur web existant, sans introduire Unity.
- [Predator: Badlands — page officielle](https://www.20thcenturystudios.com/movies/predator-badlands) : références visuelles des personnages et liens de clan. Cette source ne documente pas une ville complète, un plan de palais ni une tenue uniforme pour tous les métiers.

## Conventions propres au jeu

La Cité des Premiers Trophées, son chef, ses habitants, ses bâtiments publics et ses raccords régionaux sont une adaptation originale. Aucune carte complète canonique ni une hiérarchie royale universelle ne sont revendiquées. Le cérémonial de la nurserie est celui du clan de cette campagne ; sa victoire ne vaut pas rite Blooded.

La caméra orthographique regarde le sol à 35 degrés : `(x, y*sin(35°)-élévation)`. La hauteur verticale des personnages et des objets reste uniforme, sans aplatissement Y du sprite. Un adulte mesure 100 unités ; 2,3 m est une convention de production et non une taille universelle de la franchise. Les seuils et fondations sont mesurés dans les pixels natifs puis reliés au volume physique.

## Contrat de placement

| Élément | Support / pivot | Circulation et lecture |
| --- | --- | --- |
| Façade publique | Seuil peint aligné sur le seuil physique ; fondation mesurée | Fonction reconnaissable par silhouette, équipement visible et costume de l’interlocuteur ; accès depuis le sud |
| Aile intérieure | Enveloppe comprise dans le bâtiment ; même projection | Zones reliées, ouvertures franchissables et sortie identifiable ; aucun service obtenu à distance |
| PNJ | Pieds ancrés au sol ; taille adulte uniforme | Métier lisible par costume, accessoires et lieu ; le chef dispose d’une silhouette cérémonielle propre |
| Jeune chasseur | Pivot aux pieds et clip natif | Marche animée pendant le mouvement, arrêt et pause figés ; aucun mouvement factice d’un simple portrait |
| Raccord régional | Sol réel entre la rue et le seuil extérieur | Pont, rampe ou arche assorti au biome ; les permissions de progression restent inchangées |
| Props | Base et emprise mesurées, tri à leur pivot | Ni entrée ni chemin principal obstrué ; devantures équipées selon le métier ; mobilier intérieur accessible |
| Paysage hors cité | Modules indépendants et sol répété à l’origine mondiale | Aucun objet solide sur un nouveau raccord ; chargement limité à la vue caméra |

Les petites pièces peuvent être cadrées en entier. Sur écran étroit ou pour une grande aile, la caméra suit le personnage au lieu de réduire toute la scène à une miniature. Les détails décoratifs ne changent pas les conditions d’accès, ne créent pas de rang, de preuve, d’arme ou de vaisseau.

## Validation attendue

Les coordonnées ne sont pas déduites de la capture écran : tests de volumes et de seuils, parcours navigateur à pied, inspection des assets et contrôle de la sauvegarde sont des preuves séparées. L’export du codex doit décrire les registres utilisés par le jeu après intégration, et conserver les sources antérieures.
