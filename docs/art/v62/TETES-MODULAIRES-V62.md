# Têtes modulaires V62

Quatre PNG transparents natifs OpenAI remplacent le dessin de tête employé par les six morphologies. Classic, Elder, Super et Feral ont chacun leur fichier ; Huntress et Young réemploient explicitement la famille Classic. Aucun ancien bitmap V3 n’est supprimé ou modifié.

Les têtes possèdent quatre mandibules et une forme crânienne adaptée à leur famille. Ce sont des morphologies modulaires interprétées à partir de références, pas des portraits individuels certifiés 1:1. Les détails des corps V3 demeurent des créations du projet. La nouvelle tête est un calque au repos articulé par le rig existant : elle ne constitue pas une nouvelle planche d’animation faciale.

## Références d’anatomie

- [Jungle Hunter — Prime 1 / Sideshow](https://www.sideshow.com/collectibles/predator-jungle-hunter-predator-prime-1-studio-911387), proportions crâniennes et quatre mandibules pour la famille Classic. Elder est une variation originale d’âge, pas Greyback.
- [Berserker — KNB / Sideshow](https://www.sideshow.com/collectibles/predator-the-berserker-predator-sideshow-collectibles-400049/), peau gris olive, reliefs rouges et mandibules de Super Predator.
- [Feral — NECA, Prey](https://necaonline.com/2023/05/prey-7-scale-action-figure-ultimate-feral-predator/), tête supplémentaire démasquée de la photographie officielle, visage étroit et crête centrale.

Les prompts exacts, essais rejetés et chemins sources figurent dans `docs/v62-generation/modular-head-classic.json` et `modular-head-families.json`. Les quatre PNG sont sous `public/game/sprites/v62/heads/`. Les empreintes et dimensions natives sont dans `docs/v62-head-native-measurements.json`.

## Intégration et contrôles

Le Canvas de mission, l’aperçu React, le Homeworld et le laboratoire de rig partagent les rectangles mesurés. Les images originales ne sont ni recadrées ni redimensionnées sur disque ; leur destination de dessin respecte le rapport de forme et le point du cou. Les transformations React portent sur une enveloppe de256×384 afin que les translations en pourcentage utilisent la même base que le Canvas.

Les anciens pixels de visage du filet sont exclus. Les dreadlocks rejoignent le cuir chevelu arrière plutôt que le centre du masque. Une correction de teinte au rendu rapproche les anciens corps Super/Feral des nouvelles têtes. Un îlot de50pixels de l’ancienne mandibule présent dans le bras Super est exclu au rendu, en conservant les1934pixels opaques du bras ; le fichier source reste intact.

Le compositeur réel React a été parcouru sur68cas : six morphologies, deux orientations sans masque, puis quatorze masques dans quatre poses. Le test de mission observe les appels réels du Canvas sur Classic et Feral, le déplacement au clavier et le retrait/remise avec M. Ces tests utilisent des profils isolés ; ils n’attestent pas une partie complète ni la fin du prologue. Les preuves sont `docs/v62-head-composition-qa.json` et `docs/v62-head-mission-qa.json`.
