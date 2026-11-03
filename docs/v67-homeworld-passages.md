# V67 — Deux passages extérieurs du Homeworld

La Chaussée des Cendres et la Voie du Verre raccordent les deux enquêtes existantes à la cité par un parcours continu de plus de 21 000 unités chacun. Ce sont des créations originales du jeu ; elles ne constituent pas une carte canonique de Yautja Prime. Les huit autres régions ne sont pas déclarées livrées.

## Déplacement et progression

Le déplacement reprend l’intégrateur et les vitesses du Homeworld : 330 unités/s en largeur, 260 en profondeur, vitesse diagonale normalisée et empreinte corporelle de 48 × 28 unités. Le chemin nécessite plus d’une minute de marche sans interruption dans chaque sens. Dix repères successifs jalonnent chaque direction ; le retour ne peut être validé sans avoir parcouru ses dix repères. Le départ peut être abandonné immédiatement au seuil proche.

Les sorties autonomes restent bloquées pendant la jeunesse. Le relevé du trophée suspect est requis avant les deux routes ; le rapport durable des Marches est également requis pour le Désert. Le trajet n’ajoute aucune preuve, récompense, promotion ni objet. L’arrivée au biome ne termine pas l’enquête qui s’y déroule.

La pause garde la position. Les écritures périodiques, le rechargement et les arrivées utilisent un état versionné, validé et protégé contre les régressions. Une erreur d’écriture garde la scène et permet une nouvelle tentative. Les callbacks d’arrivée doivent renvoyer `false` lorsque leur sauvegarde échoue. Le retour depuis un biome part du seuil lointain au moyen de `beginReturnHomeworldPassageV67` ; ce helper n’accepte qu’une arrivée physique `at-biome`.

## Géométrie et images

- Projection du sol à 35°, identique à celle de la cité ; les sprites verticaux ne sont pas écrasés.
- Adulte : 100 unités = 2,3 m, convention du projet. Deux panoramas natifs de 1536 × 1024, dessinés une seule fois avec une parallaxe bornée.
- Pont natif transparent de 1536 × 1024. Tablier intérieur mesuré visuellement : x 148–1388, y 252–365. Échelle isotrope : 1200/1240. Profondeur physique déduite de la peinture : environ 191 unités. Six modules par parcours ; aucune chaussée fictive de 300 unités ne déborde des ponts.
- Le sol hors pont conserve une largeur de 300 unités et le matériau natif de pavement V64. Les parois de 270 unités et les culées sous les coudes sont des géométries calculées utilisant ce matériau existant ; elles ne sont pas présentées comme de nouvelles images OpenAI.
- Les balises natives V64 reposent sur les accotements, hors des coudes et des tabliers étroits. Leurs empreintes sont solides. Aucun rocher n’est placé dans le vide.
- Le chasseur conserve son portrait natif correspondant ou la composition modulaire actuelle, avec les ancrages mesurés V64. Cette livraison ne revendique pas une nouvelle animation complète du corps.

Les fichiers sources sont conservés sans modification de pixels : `ash-causeway-vista.png`, `glass-processional-vista.png` et `processional-bridge.png`, sous `public/game/homeworld/v67`.

## Intégration

Modèle : `app/game/systems/homeworldPassageV67.ts`. Écran : `app/game/HomeworldPassageV67.tsx` et CSS associé. Le propriétaire de campagne conserve le contrôle des sauvegardes et des changements d’écran ; le composant ne touche pas directement au stockage.

Les rues de la cité ne sont pas remplacées : le départ se raccorde aux points région existants. Le retour vise leur seuil physique en conservant la position lorsque le Hub est encore monté, ou une ancre valide après rechargement. Les 54 routes déjà recensées restent distinctes des deux nouveaux parcours.

## Validation

Les six tests de `tests/homeworld-passage-v67.test.mjs` vérifient les deux allers-retours sans téléportation, le corps sur le sol à chaque pas, la reprise à intervalles réguliers, les gates, les bases des balises, la largeur réelle des ponts et les états malformés. Les tests de persistance du lot principal vérifient les vrais callbacks, les refus d’écriture et l’ancre de retour.

`scripts/verify-homeworld-passage-v67.mjs` prépare la recette navigateur sur deux sauvegardes de test d’entrée explicites ; le scénario Désert déclare son rapport antérieur des Marches comme une fixture. Il parcourt réellement les deux allers-retours au clavier, teste le tactile, le refus d’écriture et la reprise après rechargement au milieu d’un pont. Les enquêtes régionales ne sont pas déclarées terminées par cette recette : elles sont ouvertes puis abandonnées explicitement.

La première recette a détecté une réinitialisation indue des touches à chaque checkpoint, un portrait écrasé à zéro pixel par la contrainte CSS héritée et des corniches sans soubassement. Une seconde passe a constaté un focus qui sortait du codex et une découpe SVG du bord de chaussée. Ces défauts sont corrigés : les masques utilisent les dimensions explicites du monde, les panneaux rendent leur arrière-plan inactif, le focus reste dedans et leurs boutons défilent dans la vue en portrait. Échap ferme seulement le codex en gardant la pause ; la reprise rend le focus au terrain.

La recette locale finale compilée a passé les deux allers-retours complets : 36 segments physiques, 6 groupes de contrôles et 22 captures inspectées, sans erreur JavaScript ni réponse HTTP en erreur. Le même coude des Marches a été repris en image : la chaussée rejoint désormais sa façade sans ouverture. Le paysage 844 × 390 conserve une scène de 844 × 276,5 pixels et des commandes d’au moins 44 pixels. La sauvegarde refusée, la nouvelle tentative, les réglages et le rechargement au milieu du pont passent sur les deux routes. Les 11 tests ciblés du modèle et de la persistance passent également.

La preuve détaillée et les SHA-256 des 22 captures sont dans `docs/v67-homeworld-passages-local-qa.json`. Ce rapport prouve la version locale compilée ; la publication et la recette publique sont des étapes distinctes, consignées séparément. La manette physique n’a pas été testée dans cette recette automatisée.
