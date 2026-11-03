# V13 — vues zénithales des vaisseaux

Ce dossier contient les 47 nouveaux masters zénithaux du registre de flotte.
Chaque image a été générée séparément avec le générateur d’images OpenAI, puis
détourée pour le runtime :

- master de travail : `{id}-top-chroma-master.png` ;
- asset transparent : `public/game/ships/v13/{id}-top.webp`.

Les profils et trois-quarts V12 restent inchangés dans `art-source/v12/ships`.
Les images officielles et les planches de référence ne sont jamais copiées dans
les dossiers runtime : seules leurs URL sont conservées dans le catalogue.

## Contrat visuel commun

- projection dorsale orthographique stricte à 90° ;
- coque entière centrée, nez vers la droite, moteurs vers la gauche ;
- aucun décor, astre, sol, texte, logo, ombre portée ou traînée ;
- fond chroma uniforme `#00ff00`, ensuite converti en transparence ;
- matériaux Yautja cohérents avec la source : métal sombre, bronze, ivoire,
  gravures et lueurs internes selon le modèle ;
- nouvelle interprétation bitmap appartenant au projet, jamais une extraction
  d’un film, d’un jeu, d’un comic ou d’un modèle tiers.

Famille de prompt :

> Nouveau master de vaisseau Yautja destiné au jeu, concept stylisé fidèle à la
> source indiquée, vue dorsale orthographique stricte à 90°, coque entière
> centrée, nez à droite et moteurs à gauche, fond chroma plat #00ff00, aucune
> scène, planète, ombre, traînée, inscription ou logo. Conserver la silhouette,
> les proportions et les matériaux distinctifs visibles dans les références ;
> reconstruire sobrement les surfaces jamais montrées.

Chaque appel ajoutait les traits propres au vaisseau et signalait explicitement
les parties reconstruites. `feral-clan-ships` contient exactement trois coques.
L’identifiant de génération de chaque entrée suit le format
`v13-top-{ship-id}` ; son brief propre est la description enregistrée dans
`app/game/shipCatalogue.ts`, tandis que le présent fichier porte le contrat
commun. Les 47 masters et les 47 exports ont été inspectés visuellement un par
un pour confirmer l’orientation, l’identité, l’absence de texte et l’intégrité
de la coque.

## Niveaux de fidélité

- `reference-locked` : des références visuelles exploitables permettent de
  verrouiller la silhouette et les matériaux ; toute surface non montrée reste
  une reconstruction du projet.
- `silhouette-inferred` : la silhouette publiée est respectée, mais le dessus
  complet est reconstruit parce qu’aucune orthographique officielle n’existe.
- `text-inspired` : l’extérieur complet n’existe pas dans la source ; il s’agit
  d’une création originale du projet fondée sur un texte, un intérieur ou un
  fragment.

Reconstruction textuelle explicitement assumée :

- `huntmaster-ship` et `yautja-gunship` : classes originales du projet ;
- `nedtesei` et `shell-ship` : vaisseaux littéraires sans extérieur canonique
  complet ;
- `lunar-mothership` et `cursed-earth-ship` : descriptions ou fragments de
  crossover insuffisants pour une orthographique.

`lost-tribe-spaceship` reste une extrapolation contrôlée : la production de
*Predator 2* n’a jamais conçu un extérieur complet du vaisseau, seulement
l’intérieur, l’ouverture et la forme lumineuse visible dans le film.

## Références de production prioritaires

- Alex Toader, concept du Game Preserve Ship :
  https://alex_toader.artstation.com/projects/EVB6n0
- Victor Martinez, concepts des vaisseaux de *The Predator* :
  https://www.victor-martinez.com/new-gallery-1
- Benjamin Last, concept du vaisseau de Kwei :
  https://www.benjaminlast.com/work/predator-badlands
- Alan Yang, vaisseau WWII de *Killer of Killers* :
  https://feralynx.artstation.com/projects/1NrzAK
- Galerie de concepts *Killer of Killers* :
  https://www.avpgalaxy.net/predator-movies/predator-killer-of-killers/gallery/concept-art/
- NECA, Blade Fighter :
  https://necaonline.com/2014/12/closer-look-predator-blade-fighter-vehicle-and-packaging/
- Prodos Games, règles et silhouettes *AvP Unleashed* :
  https://prodosgames.com/sites/prodosgames.com/files/files/avp_unleashed_1_1.pdf
- Historique de production du vaisseau Lost Tribe :
  https://www.avpgalaxy.net/predator-movies/predator-2/designing-the-unknown-the-story-behind-the-lost-predators-ship/

## Index visuel secondaire

Les entrées de film, jeu et univers étendu ont été recoupées avec les index
illustrés suivants. Ils servent de repères de silhouette, pas de fichiers
sources :

- https://www.avpgalaxy.net/predator/spacecrafts/
- https://www.avpcentral.com/predator-spaceships

Les URL propres à chaque coque sont enregistrées dans
`app/game/shipCatalogue.ts`, avec le média, l’œuvre d’origine, le niveau
canonique et le degré de reconstruction.
