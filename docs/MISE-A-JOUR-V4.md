# Mise à jour V4 — systèmes de chasse et contenu livré

Ce document décrit uniquement les fonctions présentes dans le runtime au
19 juillet 2026. La V4 complète le rig modulaire V3 sans remplacer le format
principal de sauvegarde : le jeu reste en sauvegarde `v3` et la progression du
vaisseau utilise un sidecar séparé, versionné indépendamment.

## Parcours de jeu complet

1. Depuis le titre, le joueur rejoint le vaisseau et consulte le rang, les
   rites et le prestige de son clan.
2. Le pont ouvre la carte galactique et ses trois contrats.
3. L’armurerie permet de choisir une armure, une arme secondaire et deux
   équipements, puis d’acheter leurs améliorations avec les marques du clan.
4. Le quartier de personnalisation règle le corps, la peau, le biomask, les
   dreadlocks, les plaques et les parures sur le rig modulaire V3.
5. Le briefing expose les objectifs, règles d’honneur, dangers et récompenses
   avant le lancement de la chasse.
6. En mission, le joueur choisit sa route, observe le vent et les traces,
   utilise camouflage, scanner, armes et pièges, puis affronte un boss propre
   au monde.
7. Après la mise à mort, le trophée doit être extrait physiquement avant de
   rejoindre le point d’extraction.
8. Le débrief applique honneur, marques, rang, déverrouillages, statistiques et
   trophée à la sauvegarde locale.
9. De retour au vaisseau, la prise peut être nettoyée, montée et exposée dans
   la salle des trophées.

## Commandes V4

### Mission

| Action | Clavier / souris | Manette |
| --- | --- | --- |
| Déplacement | `A/D`, `Q/D` ou gauche/droite | stick gauche ou croix |
| Grimper / descendre | `W/S`, `Z/S` ou haut/bas | stick gauche ou croix |
| Saut / sortie de paroi | `Espace` | `A` |
| Lames de poignet | `J` ou clic gauche | `X` |
| Maintenir la visée | `Maj` ou clic droit | `LT` |
| Sélection arme 1 / 2 | `1` / `2`, ou `R` pour alterner | `View` pour alterner |
| Utiliser l’arme active | `K` | `RT` |
| Porter/retirer le biomask | `M` | bouton tactile dédié |
| Scanner | `V` | `LB` |
| Camouflage | `C` | `Y` |
| Équipement 1 | `3` ou pavé numérique `3` | `L3` |
| Équipement 2 | `4` ou pavé numérique `4` | `R3` |
| Medicomp | `H` | `RB` |
| Interaction / trophée / console | `E` | `B` |
| Pause | `Échap` | `Menu` |

Les commandes tactiles exposent les mêmes actions. Les deux boutons
d’équipement affichent le nombre de charges et le cooldown restant.

### Vaisseau

| Action | Clavier | Manette / tactile |
| --- | --- | --- |
| Changer de salle | `A/D` ou gauche/droite | croix gauche/droite ou bouton de salle |
| Choisir une action | haut/bas | croix haut/bas ou toucher |
| Confirmer | `Entrée` ou espace | `A` |
| Revenir au pont | `Échap` | `B` |

## Lot 1 — vaisseau-hub en six salles

Le composant `app/game/ShipHub.tsx` remplace le menu de hub statique. Il est
navigable au clavier, à la manette et au tactile.

| Salle | Fonctions livrées |
| --- | --- |
| Pont et carte galactique | accès aux contrats, rang, honneur, prestige et rites du clan |
| Armurerie | équipement actif, personnalisation et quatre presets associant loadout et apparence |
| Salle des trophées | registre avec espèce et champ de méthode, nettoyage, montage et exposition dans douze alcôves |
| Medbay | traitements temporisés des blessures, brûlures acides et interfaces neurales |
| Salle d’entraînement | records de ciblage, wristblades, camouflage, mobilité et duel d’honneur |
| Archives du clan | codex du biomask, rites accomplis et progression |

La progression propre au vaisseau est stockée sous
`yautja-long-hunt.ship-progression`. Elle se synchronise avec les trophées de la
sauvegarde principale sans ajouter de champ inconnu au format `SaveGame v3`.
Une réinitialisation depuis les réglages efface les deux sauvegardes.

## Lot 2 — arsenal, améliorations et deux équipements actifs

Deux slots d’équipement sont créés à partir du loadout. Le runtime conserve
leurs charges, cooldowns et effets actifs, y compris dans un checkpoint.

| Équipement | Effet en chasse |
| --- | --- |
| Capteur de mouvement | révèle les signatures et points de scan dans son rayon |
| Leurre audio | produit des impulsions sonores que l’IA peut entendre et suivre |
| Netgun | projette un filet et entrave temporairement une cible |
| Piège | déploie une entrave persistante sur le terrain |

Les armes, armures et équipements possèdent les niveaux `0`, `1` et `2`.
L’armurerie affiche le niveau courant, le coût du niveau suivant, le manque de
marques éventuel et l’état maximum. Un achat :

- exige que l’objet soit déverrouillé ;
- débite réellement les marques du clan ;
- est sauvegardé dans les tables d’amélioration de l’inventaire ;
- s’arrête au niveau `2`.

Les améliorations ne sont pas seulement visuelles :

- une arme gagne dégâts, portée, cadence ou économie d’endurance/énergie ;
- une armure améliore ses réserves, sa mobilité, sa régénération et ses dégâts
  de mêlée puis, au niveau maximal, le nombre de medicomps ;
- un équipement gagne charges, portée et durée tout en réduisant son cooldown.

## Lot 3 — chasse systémique

Les systèmes de `app/game/systems/huntSystems.ts` sont appelés à chaque mise à
jour de la mission :

- le vent varie selon le monde, le temps et la position ;
- les nœuds d’odeur vieillissent et dérivent avec ce vent ;
- tirs, déplacements, surfaces, dangers et leurres produisent du bruit ;
- les empreintes ont une intensité et une durée dépendantes du matériau ;
- la boue ralentit, marque davantage le sol et modifie odeur, scintillement du
  camouflage et visibilité thermique ;
- l’eau, la neige, la glace, la cendre, le métal, les racines et le basalte ont
  des profils différents ;
- netgun, piège et leurre audio créent de vrais objets de chasse temporisés ;
- certains dangers infligent des dégâts, ralentissent ou révèlent le
  camouflage.

Le biomask permet de lire ces informations, mais il ne supprime pas leurs
conséquences. Le choix d’une route silencieuse, d’une surface ou d’un piège
change donc réellement la traque.

## Lot 4 — IA coordonnée

Chaque ennemi régulier possède un cerveau persistant. Sa perception combine
contact visuel, signature thermique, bruits, odeur, traces, état de santé,
menace à distance, alliés et couvertures disponibles.

Les comportements effectivement utilisés comprennent :

- patrouille et suspicion ;
- recherche de la dernière position connue ;
- combat et poursuite ;
- prise de couverture et suppression ;
- alerte/coordination avec les alliés proches ;
- repli lorsqu’une proie est trop blessée ou dominée.

Les humains, bêtes et Yautja hostiles emploient des pondérations distinctes :
ils ne détectent pas de la même manière le bruit, l’odeur, les traces ou le
camouflage.

## Lot 5 — trois mondes, neuf routes et dangers propres

Chaque blueprint mesure `5600×720`, propose trois routes, au moins six éléments
grimpables et quatre emplacements de pièges.

| Monde | Routes | Principaux dangers |
| --- | --- | --- |
| Oseris-IV, jungle | Sous-bois et camp de Vey ; Canopée silencieuse ; Tranchée inondée | boue profonde, flore prédatrice, crue soudaine |
| Nivalis, cryomonde | Banquise exposée ; Galeries glaciaires ; Anciennes passerelles minières | glace fragile, whiteout, chutes de glace et effondrement de l’arène |
| Cinder, sanctuaire volcanique | Sol du sanctuaire ; Flanc des évents ; Aqueduc des anciens | lave, évents de vapeur, bourrasques de cendre |

Les routes hautes favorisent généralement furtivité et embuscade ; les routes
au sol facilitent le pistage ; les raccourcis exposés ou temporisés sont plus
rapides mais plus dangereux.

Les checkpoints sont appliqués par difficulté :

- `Young Blood` : deux relais ;
- `Hunter` : un relais ;
- `Elite` et `Elder` : aucun relais.

Un relais restaure un instantané cohérent du joueur, des ennemis, de l’IA, des
objectifs, du boss, des pièges et des charges d’équipement. Il ne transforme
pas une difficulté sans checkpoint en mode permissif.

## Lot 6 — trois boss avec mécaniques spécifiques

### Commandante Vey

- phases de chasse, renforts puis duel ;
- fusées qui annulent le camouflage ;
- tirs de suppression et appel de gardes ;
- usage de la boue et perte de visibilité thermique ;
- fenêtre de vulnérabilité après une attaque au couteau.

### Cryostalker Alpha

- trois plaques de carapace ;
- charges à provoquer contre les piliers destructibles pour briser ces
  plaques ;
- appel de Cryostalkers rapides ;
- enfouissement, avertissement au sol et chutes de glace ;
- visibilité thermique et vulnérabilité liées à l’armure restante.

### Bad Blood

- phase de traque camouflée avec disc et plasma ;
- impulsion du sanctuaire qui verrouille les armes énergétiques ;
- duel final au combistick, avec pénalité d’honneur si une arme à distance est
  utilisée ;
- autodéstruction de 45 secondes ;
- trois consoles à neutraliser avec `E`/`B` pour préserver le trophée.

## Lot 7 — audio, accessibilité, visuels V4 et tests

### Audio et accessibilité

Le moteur sonore possède des bus séparés pour le niveau général, la musique
procédurale et les effets. Des ambiances distinctes accompagnent le vaisseau,
la jungle, la glace et le volcan, tandis que les actions de mission remontent
leurs événements sonores au client.

Les réglages sauvegardés et appliqués comprennent :

- activation générale de l’audio ;
- volumes musique et effets ;
- secousses d’écran ;
- violence atténuée ;
- vision à contraste élevé appliquée au Canvas.

### Visuels originaux V4

Le pack V4 ajoute quatre fonds de production :

- `jungle-depth-v4.webp` ;
- `ice-depth-v4.webp` ;
- `volcanic-depth-v4.webp` ;
- `ship-hub-v4.webp`.

Il ajoute également sept personnages ennemis transparents :

- fantassin, éclaireur et artilleur lourd de Vey ;
- Cryostalker rapide et Cryostalker cuirassé ;
- disciple du Bad Blood ;
- commandante Vey, cible Apex complète dédiée au briefing et au combat.

La jungle utilise aussi six textures OpenAI séparées et détourées : tronc
grimpable, plateformes racine, ruine, canopée et expédition, plus une nappe de
fougères de premier plan. Elles remplacent les anciens rectangles opaques.

Ces images sont des créations originales générées avec l’outil ImageGen
d’OpenAI pour ce fan project. Elles ont été composées pour l’angle, l’échelle
et la direction artistique du jeu ; elles ne sont pas des copies de fichiers,
captures, costumes détourés ou sprites officiels.

Le journal de production est conservé prompt par prompt :

- [environnements et vaisseau](../art-source/v4/README.md) ;
- [sept personnages ennemis](../art-source/v4/enemies/README.md).

Les fichiers source restent dans `art-source/v4` et les exports consommés par
le jeu dans `public/game/backgrounds`, `public/game/sprites/v4` et
`public/game/props/v4`.

### Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run qa
```

Lors de la vérification finale du 19 juillet 2026 :

- le lint a terminé sans erreur ni avertissement ;
- le build de production Vinext a réussi ;
- les `45/45` tests ont réussi.

Les tests couvrent notamment les deux slots et leurs cooldowns, les achats
d’améliorations, les trois blueprints, vent/odeur/traces/boue/pièges, l’IA, les
trois boucles de boss, le câblage du Canvas, les assets V4, le rig V3, les
migrations de sauvegarde et la progression du vaisseau.

## Limites et statut du projet

- Le projet est un fan game privé et non commercial.
- Les références externes servent à l’étude de l’ambiance, des matériaux et de
  la logique de chasse ; elles ne sont pas redistribuées.
- Aucun asset officiel extrait d’un film, d’un jeu, d’un comic ou d’une
  figurine n’est inclus.
- Les personnages et configurations inspirés de la franchise sont recréés avec
  les systèmes et créations originales du projet ; les apparitions sans design
  visuel officiel restent signalées comme interprétations.
- *Predator* et *Yautja* appartiennent à leurs ayants droit. Le projet n’est ni
  officiel, ni affilié à 20th Century Studios ou Disney.
