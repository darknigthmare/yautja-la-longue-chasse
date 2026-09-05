# THE PIT — atelier modulaire V24

Lot du 5 septembre 2026. Route `/pit-lab`, accessible depuis la sélection THE PIT.

## Livraison réelle

- Deux compositions de rigs V3 : quinze segments corporels par morphologie, mains, masque, mèches, armure, gantelet, canon d’épaule, boîtier et lames indépendants.
- Dix-sept séquences de contrôle : attente, marche avant/arrière, saut/chute, accroupissement, gardes, trois frappes, technique, tentative de projection, hitstun, blockstun, renversement et KO.
- Préparation, phase active et récupération suivent les durées des vrais états simulés. Les poses articulent les os ; aucune illustration entière ne glisse pour simuler un coup.
- Pause, avance d’une image, curseur temporel, orientation, vitesse et zoom ; départ immobile, commandes accessibles et mise en page mobile.
- Le déplacement est recentré dans la fenêtre d’inspection. Ce contrôle ne remplace pas le mode entraînement jouable ni les leçons de PIT-04.
- Chargement intégral par profil : si une pièce manque, aucun personnage amputé ne s’affiche.

Le moteur et les replays restent en V4. Aucun changement de dégâts, collision, sauvegarde ou règle. La projection reste un geste solo ; aucune prise attaquant-victime synchronisée n’est annoncée.

## Corrections de composition

Des exports V3 contiennent des fragments parasites, masqués à l’arrêt mais révélés par la rotation des membres. Les fenêtres de calque suivantes conservent les composants utiles sur le canevas 256 × 384, sans modifier les bitmaps sources.

| Élément | Rectangles conservés (x,y,largeur,hauteur) | Pixels alpha > 8 |
| --- | --- | ---: |
| Main classic avant | (195,210,30,22) ∪ (205,232,20,10) | 522 |
| Main classic arrière | (30,211,30,39) | 769 |
| Main super avant | (202,211,35,44) | 902 |
| Main super arrière | (19,210,46,44) | 1052 |
| Lame supérieure | (196,204,54,11) ∪ (236,215,9,1) | 352 |
| Jambière | (163,283,25,59) | 1076 |

La main classic avant exclut notamment un fragment de jambe de 583 pixels. La lame ne dépasse plus vers le coude pendant sa rétraction grâce à une fenêtre de sortie fixe. Le profil Berserker n’ajoute aucun filet ; sa lame est un seul composant de l’ancien module générique, pas encore une reproduction définitive.

## Limites artistiques et promotion

Le masque V3 Berserker n’a pas sa mâchoire-trophée caractéristique ; le masque Jungle et les armures restent des approximations. Les mains ouvertes, coutures et plaques devront recevoir des variantes adaptées aux actions. Le contact des bras au sol dans le KO nécessite encore une retouche de pose et de découpe ; l’atelier le signale explicitement, sans valider ce clip comme final. Les deux orientations de l’atelier sont un contrôle géométrique par miroir, pas une validation de l’asymétrie cinématographique.

Ces défauts bloquent la promotion comme graphismes finaux. Le rendu normal des matchs reste inchangé et les quatre illustrations V23 sont conservées. Aucun nouveau bitmap n’est déclaré généré par ce lot : réemploi des sources OpenAI V3 documentées dans `art-source/v3/README.md`.

Références de reprise : [Jungle Hunter, NECA](https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure) et [Berserker, reproduction KNB / Sideshow](https://www.sideshow.com/collectibles/predator-the-berserker-predator-sideshow-collectibles-400049). Les anciennes présentations servent de base de projet et ne remplacent pas les références.

Les prochains modules exigent un alpha réel. Les essais intégrés de génération transparente V23 avaient produit un damier opaque et ont été rejetés. Un changement de route vers l’API ou de modèle nécessite un accord explicite selon le skill imagegen.

## Travail restant

1. Corriger masques/armures, produire mains fermées et prises lisibles, puis inspecter chaque phase et orientation.
2. Ajouter les armes et effets des techniques à l’atelier. Le moteur V4 actuel attribue un disque revenant à Jungle Hunter et une onde de sol à Berserker ; l’adaptateur suit les données existantes sans certifier leur canon.
3. Toute correction ultérieure des règles doit traiter la compatibilité des replays séparément.
4. Produire prises synchronisées, finishers et variantes gore. Ce lot ne clôture ni PIT-04, ni PIT-06, ni PIT-08 et ne transforme pas des poses calculées en milliers de clips bitmap livrés.

## Vérifications de ce lot

- Construction Vinext réussie ; suite complète : 828 tests réussis, aucun échec.
- Vérifications ciblées PIT, sauvegardes et replays : 177 tests réussis.
- TypeScript et ESLint vérifiés ; le solveur conserve les valeurs par défaut des rigs existants.
- Navigateur : attente, garde basse, frappe lourde active, Berserker orienté à gauche, KO, lecture et pause contrôlés ; aucune erreur JavaScript relevée. Vue mobile 390 × 844 sans débordement horizontal. Les défauts d’identité signalés ci-dessus restent bloquants pour la promotion artistique.
- Le premier build complet a échoué faute d’espace sur C:. Les sorties ignorées `dist` et les preuves `tmp` ont été placées dans l’espace temporaire du projet sur D: ; les captures et journaux ont été vérifiés par SHA-256 avant déplacement. Les sources et images du jeu n’ont pas été déplacées.
