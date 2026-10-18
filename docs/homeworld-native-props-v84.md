# Sources natives Homeworld V84

Quatre images indépendantes ont été générées avec l'outil OpenAI intégré `image_gen__imagegen`, sans clé API ou script CLI, puis copiées dans le projet sans modification de leurs pixels. Chaque source possède une vraie transparence, un angle natif et une enveloppe alpha enregistrée. Les sources originales sont conservées dans le dossier de génération ; aucun asset historique n'est remplacé.

Les paramètres exacts figurent dans `docs/homeworld-native-prompts-v84.json`. Les dimensions originales, limites alpha128 et SHA256 figurent dans `app/game/data/homeworldStreetDecorSourcesV84.json`. Leur lecture est une étape d'enregistrement des sources, pas un test du jeu, un audit de perspective ou une preuve de conformité canonique.

| ID | Fichier du projet | Fonction prévue |
| --- | --- | --- |
| maintenance-console-right | public/game/homeworld/v84/maintenance-console-right.png | Poste fermé de diagnostic/préparation des ateliers et quais, angle droit natif. |
| care-cabinet-left | public/game/homeworld/v84/care-cabinet-left.png | Rangement fermé associé à l'accueil et aux soins, angle gauche natif. |
| training-rack-left | public/game/homeworld/v84/training-rack-left.png | Support de trois étuis de pratique fermés, angle gauche natif. Aucun contenu canonique inventé. |
| ritual-brazier-right | public/game/homeworld/v84/ritual-brazier-right.png | Foyer bas avec trois appuis et flamme contenue dans le dessin, angle droit natif. |

Les dimensions de chaque PNG sont 1254 × 1254 pixels. Elles ne sont pas des dimensions en unités du monde. Le fournisseur de placement définit les hauteurs de jeu, pivots et contours d'appui propres à chaque dessin, à échelle uniforme ; la boîte alpha complète n'est pas une collision corporelle. Aucune orientation n'est fabriquée par rotation, miroir ou étirement CSS.

Les détails fusionnés — écran, étuis, tiroirs, pieds, braises — appartiennent au dessin de leur objet. Ils ne comptent pas comme des sprites séparés, des éléments détachables, du butin ou de nouveaux services. Les casiers restent fermés. La flamme peinte ne constitue pas une animation à plusieurs frames ; ces quatre sources sont des images statiques.

Cette architecture de mobilier est une création originale compatible avec la direction artistique de la ville. Elle ne reproduit pas un accessoire officiellement identifié, une technologie canonique précisément nommée, une écriture Yautja officielle ou une mesure filmique 1:1. Aucun appareil, soin, déplacement, arme, fabrication ou rite n'est accordé par la présence d'un décor.

L'intégration des instances, leurs contacts et leurs codex sont décrits dans la note de placements V84. Un candidat refusé par la politique du jeu reste inventorié, sans devenir artificiellement un décor effectivement visible. Aucune recette visuelle ou corporelle n'a été menée après le lot, conformément à la demande de publication sans vérification.
