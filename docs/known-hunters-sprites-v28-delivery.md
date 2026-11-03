# Sprites de chasseurs connus — V28

Date : 5 septembre 2026.

## Périmètre livré

Cette vague ajoute six planches PNG originales produites avec l’outil OpenAI intégré, soit 36 poses dessinées. La revue V28 reprend aussi les cinq séquences V27 sans modifier leurs fichiers : 11 séquences et 66 poses au total. Il s’agit d’une revue artistique ; aucun personnage n’est complet, et aucun clip n’est validé pour le combat.

| Personnage | Variante | Séquence nouvelle | Poses |
|---|---|---|---:|
| Machiko Noguchi | Armure de clan issue des comics, référence NECA | Impact et reprise d’appui | 6 |
| Machiko Noguchi | Ryushi, référence Prime 1 inspirée d’AVP n°4 | Visée défensive au fusil | 6 |
| Theta Berwick | Couverture Marvel 2023 n°2, armure dorée, démasquée | Garde à la machette | 6 |
| Theta Berwick | Même variante | Coup au corps et récupération | 6 |
| Tracker | Predators (2010), masque à défenses | Garde et absorption | 6 |
| Fugitive | The Predator (2018), armure | Impact et récupération | 6 |

Machiko et Theta sont des humaines. La tenue Ryushi de Machiko n’est pas une armure de clan et ne compte pas comme couverture de cette armure. Theta est l’identification la plus probable de la description utilisateur « humaine en armure Yautja des comics récents » ; l’utilisateur ne l’a pas nommée explicitement. Il ne s’agit pas de Thia, l’androïde de Badlands.

L’ancienne exclusion des humains dans le catalogue DLC reste un état historique du périmètre de ce DLC. La demande explicite actuelle autorise leurs sprites de revue ; elle n’ajoute pas silencieusement Machiko/Theta au roster jouable ni Dutch à cette vague.

## Références inspectées

- [Machiko : corpus Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1), [tenue Ryushi Prime 1](https://www.prime1studio.com/avpc-machiko-and-broken-tusk-predator/UPMAVP-01.html), [armure de clan NECA Series 18](https://necaonline.com/2017/06/predator-7-scale-action-figures-series-18-assortment/).
- [Theta : Predator2023 n°2, Marvel](https://www.marvel.com/comics/issue/107411/predator_2023_2), couverture officielle correspondante inspectée en entier.
- Tracker : galerie Hot Toys/Sideshow sous licence, détaillée dans characters/tracker/references.json.
- [Fugitive : galerie officielle NECA](https://necaonline.com/2018/08/shipping-this-week-ultimate-fugitive-predator-and-tmnt-michelangelo-restock/).

Les sources officielles et produits sous licence servent de références, pas de textures copiées. Les captures de recherche restent dans tmp, hors lot distribué. Les interprétations sous licence ne prouvent pas chaque détail d’une case intérieure ou d’un photogramme. Aucune fidélité 1:1 certifiée n’est annoncée.

## Corrections et contrôle artistique

- Tracker : canon d’épaule doublé dans le premier essai ; nouvelle version OpenAI inspectée, un seul canon visible lorsque la pose ne l’occulte pas. Premier essai conservé et rejeté.
- Machiko en armure : lames de poignet inversées dans le premier essai ; correction OpenAI avec lames rétractées pendant le port du fusil. Essai fautif conservé et rejeté.
- Theta en garde : inversion de prise du couteau à la troisième pose ; retouche OpenAI de cette prise. Seule la version retenue est incluse dans les PNG du lot ; prompts initial et correctif conservés.
- Les deux variantes de Machiko et les deux Yautja ont reçu une seconde lecture visuelle indépendante. Les détails occultés des doigts et les petits reliefs d’armure ne sont pas certifiés.
- Les traces vertes dessinées sur Theta font partie de la source ; elles ne constituent pas encore des effets de combat modulaires.

Chaque source conserve ses octets générés : SHA256, dimensions, prompts exacts, provenance et rectangles/pivots sont enregistrés. Une correction OpenAI crée une nouvelle source et peut modifier des détails secondaires ; « source intacte » signifie absence de retouche ultérieure par code, pas identité pixel à pixel avec le premier essai.

## Lecteur et intégration

- public/game/assets/v28/sprite-review/index.html : revue publique, avec filtres espèce/famille, variante explicite, pas à pas, clavier, vitesse et lecture unique ou répétée.
- outputs/known-hunters-v28/preview.html : lecteur autonome embarquant les PNG, consultable hors connexion.
- /pit-lab : accès V28, compteurs issus du manifeste et archive V27 conservée.
- Les PNG sont RGB à fond magenta variable, pas des images à alpha natif. La clé couleur et le traitement du liseré sont appliqués dans le Canvas de revue uniquement. Les PNG originaux ne sont pas réécrits.
- Les cadres sont libres, mesurés autour des silhouettes, avec pivots d’appui. Une échelle constante s’applique à chaque séquence ; aucune normalisation individuelle de hauteur, aucun étirement séparé, aucun miroir automatique.
- Le rendu réel des combats reste inchangé. L’adaptateur temporel PIT existant n’est pas déclaré intégré à ces brouillons.

## Reproduction et limites

Commandes : npm run sprites:preview, npm run sprites:qa, npm run lint, npm run typecheck, npm run test.

sprites:preview:v26 et sprites:preview:v27 sont conservées. Le contrôle V28 vérifie les SHA des PNG ainsi que la fraîcheur du manifeste, des copies publiques, du HTML, du JavaScript et du processeur de transparence. Les tests isolés couvrent les espèces, les comptes variables, les variantes, l’alpha natif et le rejet des sources non conformes.

Les preuves navigateur et de livraison sont enregistrées après exécution dans art-source/v28/known-hunters et outputs/known-hunters-v28. Le fichier release.json de sortie indique le commit et le déploiement effectivement vérifiés.

Restent à produire/valider : locomotion, sauts, transitions, attaques, techniques, prises, dégâts complets, chutes, mort, orientations inverses dessinées et raccords de chaque personnage. City Hunter conserve ses réserves antérieures ; cette vague ne prétend pas les avoir résolues. Les autres personnages du catalogue ne sont pas déduits complets à partir de ces six planches.

## Résultats exécutés sur la version finale

Compilation du jeu, typage et lint réussis. Suite complète :889 tests réussis, zéro échec. Contrats de sprites :37 tests réussis et sorties générées à jour.

Chrome réel :850 contrôles réussis sur le manifeste SHA256 554282574e5868945c6444516c711ea414ca9c3d6d83b4f2da54b8eb3d068068. Les66 poses ont été parcourues dans chaque version, autonome et HTTP. Les11 séquences ont également été contrôlées à390px de largeur dans chaque version, sans débordement horizontal. Aucun bord de cadre ne coupe une silhouette mesurée.

Les diagnostics de transparence correspondent maintenant au mode affiché. Un échec de chargement PNG volontaire vérifie l’effacement de l’ancien SHA et des anciennes informations de pose, la désactivation de la lecture et la reprise après chargement réussi. Le lien du laboratoire est masqué dans l’export hors connexion.

La relecture a aussi corrigé l’export de noms contenant les caractères $& ou $' : ils restent littéraux dans les données embarquées. Cette robustesse est testée dans l’HTML public et autonome.

Les traces détaillées sont conservées dans validation.json et browser-qa.json. Ces contrôles techniques ne constituent pas une validation artistique des transitions ni une certification1:1.
