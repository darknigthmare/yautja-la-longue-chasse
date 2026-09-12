# V34 — production OpenAI, décors modulaires et ateliers PC

Cette version poursuit la production demandée. Elle ne termine pas les 100 arènes, tous les chasseurs ni les animations de véhicules.

## Contenu livré dans cet instantané

- **381 images dans l’atelier**, dont les archives conservées : 176 images d’arène, 106 planches de chasseurs et 99 images de véhicules/effets. Les images rejetées restent identifiées comme telles et ne sont pas lues comme animations.
- **12 kits d’arène revus** : huit arènes jouables, dont six nouveaux kits V34 à six plans et quatorze sous-plans, plus quatre concepts graphiques. Les concepts #9–12 ne deviennent pas sélectionnables par la seule présence d’images. La discussion dédiée aux 100 arènes reste non récupérée ; ces propositions suivent le catalogue local et ne sont pas certifiées conformes à une pièce jointe absente.
- **Sept combattants avec 143 clips validés au total**, incluant l’existant. Wolf, Feral, Scar et Celtic ajoutent leurs pages contrôlées. Les séquences manquantes conservent un repli explicitement affiché ; aucune bibliothèque complète n’est revendiquée.
- **Machiko et Theta** : 26 nouvelles sources, 16 pages retenues et 122 dessins de revue, contrôlés par 244 captures à taille native. Espèce humaine et variantes conservées. Aucun contrat de combat ni combattante jouable n’est ajouté implicitement.
- **50 entrées véhicule/monture avec au moins une source graphique**, 98 sources de véhicule et trois sources d’effets partagés au total. Les effets ne créent pas un 51e véhicule. Zéro clip véhicule accepté dans le moteur, zéro conduite jouable et zéro ensemble complet à ce stade.
- Les références Mat Hunkin, NECA et Bone Bison sont documentées dans `v34-referenced-vehicles-art-review.md`. Les bases, lames, selles et protections sont distinctes lorsque produites ; une texture indépendante ne suffit pas à valider un assemblage.

## Changements visibles et corrections

L’atelier permet de filtrer les sources, lire les dessins de revue, choisir les orientations disponibles et vérifier leur détourage sur plusieurs fonds. Les PNG et leur empreinte sont contrôlés au chargement. Les vues absentes ne sont pas créées par un miroir logiciel ; une erreur de chargement efface l’ancienne image au lieu de la présenter comme résultat courant.

La page d’assemblage compose les images existantes sans les réécrire. Le siège d’éjection reste fixe et son bras possède quatre poses raccordées à la douille. Le côté gauche du bras n’est pas disponible. Le Bone Bison présente des accessoires encore non calés : leurs transformations propres restent à valider, sans conclure que l’équipement est géométriquement impossible.

L’édition PC autorise désormais une liste explicite d’ateliers HTML embarqués en plus des laboratoires. Ces documents sont servis à leur véritable chemin, pas remplacés par la page du jeu. Les exports déclenchés par l’utilisateur restent limités aux sauvegardes et images raster du jeu. Le réseau, les chemins privés, le code exécutable et les fichiers externes restent refusés. Le numéro PC passe à 1.0.34.

## Vérification de l’instantané

La suite complète après les changements de protocole PC passe **1 150 tests**, sans échec. La compilation Next de production passe. Les contrôles détaillés par chasseur, par arène et par montage sont conservés dans les rapports V34 ; la recette finale web et celle de l’EXE produisent leurs preuves séparées. La publication n’est attestée que par le rapport de livraison créé après le résultat réel du déploiement.

Le contrôle complet Wolf/Celtic consigne bien `sprite-sheet-animation` pour Wolf au repos et `static-bitmap` pour Celtic, qui n’a pas d’idle livré. Il vérifie aussi les quatorze sous-plans du Tribunal et l’absence de débordement mobile. Les tests des compteurs refusent de transformer des modules optionnels, des brouillons ou des effets partagés en contenu terminé.

## Reste à produire

Les autres arènes, les familles restantes des chasseurs, leurs transitions, attaques spéciales, interactions victime et effets restent en production. Les dix familles initiales ne remplacent pas les 36 familles retrouvées dans le cahier du DLC. Le registre comporte 215 designs individuels de catalogue, 49 entrées supplémentaires à rapprocher ou rechercher et trois variantes humaines ; ce n’est pas une affirmation de 267 Yautja canoniques distincts. Les budgets de milliers de planches ne sont jamais comptés comme des images déjà créées.

La fidélité au concept ou aux présentations du projet reste distinguée de la fidélité officielle 1:1. Le jeu demeure un projet de fan non commercial ; qualité technique, validation matérielle, signature de l’EXE et autorisations de diffusion commerciale ne sont pas assimilées à la génération de ses images.
