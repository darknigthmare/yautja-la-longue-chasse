# Yautja : La Longue Chasse

Jeu d'action 2D en vue latérale, original et non commercial, inspiré de l'univers
*Predator*. Le joueur prépare son chasseur dans un vaisseau, choisit son contrat
et son arsenal, puis traque des proies sur plusieurs planètes.

## État actuel — 12 septembre 2026 · V31

- **Huit chasses scénarisées** : jungle, glace, volcan, marais, désert, océan,
  monde fongique et ruines. Chacune possède une cible Apex, des objectifs, une
  extraction et six secteurs continus couvrant 8 400 pixels de monde.
- **Vaisseau modulaire V21/V22** : huit salles sur deux ponts, coursives, puits,
  portes motorisées, échelles et reliefs internes. Les parois, installations,
  armes équipées, trophées possédés et éléments d'avant-plan restent séparés.
  Le plan du vaisseau pose une balise ; il ne téléporte pas le joueur.
- **Monde natal en perspective 2.5D** : cité au sol de 5 200 × 2 600 pixels, douze quartiers irréguliers reliés par neuf rues ou rampes, treize bâtiments indépendants, portes, accessoires répartis en profondeur et personnages rendus par plaques entières. Quinze presets connus possèdent une plaque Homeworld reliée à leur identifiant exact ; ce terme ne certifie pas une fidélité officielle ou 1:1.
- **THE PIT V31** : caméra de présentation dynamique bornée, aide et laboratoire repliables, huit arènes jouables et catalogue de production honnête de cent concepts. Les quatorze combattants sur quatorze possèdent une plaque bitmap statique ; City Hunter dispose de sa pose gauche dédiée pour le côté droit de la sélection. Les 92 autres fiches d’arène ne sont pas annoncées jouables.
- **Animation V31** : seize poses statiques, zéro animation et 264 entrées d’animation encore manquantes. Une pose fixe n’est pas comptée comme un clip.
- **Pilote Oseris vertical** : douze salles reliées sur quatre niveaux, canopée, ravin, grottes, raccourcis et passages conditionnés. La cible de 48 salles et huit sous-régions reste un objectif de production.
- **Décors de biome V19 : 464 paires master/runtime disponibles sur 800**,
  soit **336 ressources restant à produire**. Le registre ne charge que les
  paires présentes. L'audit des ressources disponibles contrôle les fichiers,
  leurs empreintes, le chroma, l'alpha, les marges et la correspondance exacte
  du registre ; il ne déclare pas le catalogue complet.
- **Carte de chasse dans la pause** : position du joueur, secteurs visités,
  passages connus et pourcentage d'exploration. Les noms des secteurs inconnus
  sont masqués. La découverte est conservée après une mort et dans la reprise
  de la chasse suspendue.
- **Progression jouable** : cinq armes, quatre équipements, trois armures,
  améliorations, quatre difficultés, honneur, rangs, trophées et atelier,
  configurations d'équipement, entraînements et codex. La fin de campagne
  ouvre Elder ; les huit chasses restent rejouables avec des sceaux de maîtrise.

Le pilote Oseris possède désormais une première topologie verticale de douze
salles avec connexions, niveaux de hauteur, verrous et raccourcis. Cette base
ne constitue pas encore le niveau final de 48 salles et huit sous-régions. Les
autres chasses conservent en grande partie leurs parcours horizontaux ; leurs
boucles, alternatives et retours par capacités demandent encore une production
et des essais complets avant de revendiquer un metroidvania commercial achevé.

L'[audit du jeu selon des critères de production commerciale](docs/audit-commercial-metroidvania-2026-08-31.md)
distingue les systèmes présents, les corrections apportées, les contrôles
exécutés et les travaux encore nécessaires. Il ne constitue ni une autorisation
de commercialisation, ni une certification de plateforme.

## Jouer et développer

Node.js **22.13 ou ultérieur** est requis.

```powershell
npm.cmd ci
npm.cmd run dev
```

Ouvrir ensuite `http://localhost:3000/`. Pour lancer le serveur de production
local après compilation :

```powershell
npm.cmd run build
npm.cmd start
```

Le runtime actuel utilise React et Canvas dans le navigateur. La prise en
charge de commandes manette ne constitue pas un portage natif PC ou console.

## Commandes

Les commandes sont remappables dans les réglages ; l'aide du jeu affiche les
raccourcis actifs. Principales commandes de chasse par défaut :

| Action | Commande |
| --- | --- |
| Se déplacer | `Q/D` ou flèches gauche/droite |
| Grimper | `Z/S` ou flèches haut/bas |
| Sauter / quitter une paroi | `Espace` |
| Lames de poignet | `J` ou clic |
| Cadrer la visée | `Maj`, clic droit ou gâchette gauche |
| Sélectionner une arme | `1` / `2` ; `R` pour passer à l'autre |
| Utiliser l'arme sélectionnée | `K` ou gâchette droite |
| Porter / retirer le biomask | `M` |
| Scanner / camouflage / medicomp | `V` / `C` / `H` |
| Utiliser les équipements | `3` / `4`, ou `L3` / `R3` |
| Interagir | `E` |
| Pause et carte de chasse | `Échap` |

La manette et les contrôles tactiles sont pris en charge. Dans les menus
compatibles, la croix ou le stick déplace le focus, `A` confirme et `B` revient
en arrière. Le vaisseau se parcourt physiquement ; ses installations ouvrent
leurs interfaces. Les indications affichées dans chaque contexte font foi.

La prise d'un trophée comprend une interaction auprès de la proie abattue et
un rite à suivre. Une victoire complète inclut ensuite le retour à la navette.

## Sauvegarde, suspension et transfert

La campagne est sauvegardée localement. Les réglages affichent les erreurs de
stockage et permettent l'export JSON, l'import avec aperçu et confirmation,
et la réinitialisation. Une sauvegarde d'une version future n'est pas écrasée
silencieusement.

**Deux formats de transfert sont proposés.** L'export léger porte sur la
campagne principale et reste utile en récupération. L'archive intégrale ajoute
la chasse suspendue, le checkpoint, les états du vaisseau, THE PIT et le dernier
replay pour le même propriétaire. Son import affiche un aperçu, vérifie les
formats et propriétaires, journalise le remplacement puis écrit la campagne en
dernier. Il ne s'agit ni d'un cloud ni d'une transaction serveur globale.

En chasse, la pause propose **Suspendre et sauvegarder**. La reprise restaure
les données de cette chasse, dont les secteurs découverts. Les relais de
réapparition restent distincts de cette suspension et dépendent de la
difficulté. Exporter la campagne ne transfère pas ce point de reprise sur un
autre appareil.

## Validation

```powershell
npm.cmd run qa:release
```

Cette commande exécute le lint, TypeScript, l'audit strict de toutes les paires
V19 **disponibles**, puis la compilation et l'ensemble des tests automatisés.
Elle ne remplace pas l'audit de complétude des 800 décors.

Dernière qualification locale V31 observée : `qa:release` réussi avec **1 103
tests sur 1 103**, **464 paires** V19 disponibles, audit npm à **0
vulnérabilité** et QA navigateur locale **PASS**. Le package Windows V31 et la
publication publique restent en cours tant que leurs résultats réels ne sont
pas enregistrés.

Commandes individuelles :

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run biome-decor:v19:audit-available
```

Après un commit propre, le portable Windows se construit et se qualifie avec :

```powershell
npm.cmd run package:windows
npm.cmd run qa:desktop
npm.cmd run qa:desktop:package
```

`npm.cmd test` compile le jeu puis exécute **tous les fichiers
`tests/*.test.mjs`**. Après ajout de nouveaux décors, régénérer d'abord la
projection de disponibilité avec `npm.cmd run biome-decor:v19:runtime-data`.

`npm.cmd run qa` conserve le contrôle global de production artistique, dont
`biome-decor:v19:manifests` et `biome-decor:v19:audit`. Ce contrôle exige les
**800 ressources prévues** et reste incomplet tant que les 336 manquantes ne
sont pas produites ; ses seuils n'ont pas été abaissés pour obtenir un succès.

Les tests de fonctions runtime et les rendus React statiques ne sont pas des
essais interactifs du jeu. La QA navigateur locale observée ne constitue ni un
test de manette ou de matériel cible, ni un portage natif, ni un statut de sortie
commerciale. Les limites de vérification figurent dans l'audit.

## Assets et documentation actuelle

Les sources de génération, prompts et masters sont conservés dans
`art-source/`. Les exports utilisés par le jeu sont servis depuis `public/game/`.
Les documents de production et les sources privées ne font pas partie du
paquet public. Les images du projet sont des créations originales, avec leurs
références et approximations documentées ; elles ne sont pas présentées comme
des fichiers officiels de la franchise.

- [Livraison de contenu V31](docs/chatgpt-v31-delivery.md)
- [Préparation de l'édition PC V31](docs/desktop-v31.md)
- [Niveau du vaisseau V21](docs/ship-level-delivery-v21.md)
- [Modules et installations V22](docs/ship-interior-delivery-v22.md)
- [Lot volcan V19 et sources](docs/biome-decor-volcano-lot-01.md)
- [Audit monde, progression et exploration](docs/audit-commercial-world-2026-08-31.md)
- [Audit général de production](docs/audit-commercial-metroidvania-2026-08-31.md)

Les rapports de livraison conservent les chiffres et résultats de leur propre
révision. Les décomptes actuels figurent en tête de ce README.

## Notes historiques V3 à V7

Ces documents décrivent des étapes antérieures, pas la liste actuelle des
missions, des salles ou des assets :

- **V3** : rig articulé du chasseur, pièces d'armure, équipements et origine
  commune du canon. [Audit de modularité](docs/AUDIT-MODULARITE-V3.md).
- **V4** : première livraison des systèmes de chasse, du hub, de trois missions
  et de leurs boss. Les descriptions de six salles et de trois mondes sont
  historiques. Les itinéraires déclarés dans ce catalogue ne prouvent pas
  l'existence de verrous ou de boucles de type metroidvania.
  [Rapport V4](docs/MISE-A-JOUR-V4.md).
- **V5/V6** : plaques cinéma, catalogue étendu, carte galactique, rite de trophée
  et menus. [Plaques V5](docs/MISE-A-JOUR-V5-PLAQUES-CINEMA.md).
- **V7** : lot de trente ennemis animés avec sources, prompts et strips séparés.
  Ses nombres de vagues et de sprites chargés décrivent cette livraison ; ils
  ne résument pas les huit chasses actuelles.
  [Archive des ennemis V7](art-source/v7/enemies/README.md).

*Predator* et *Yautja* appartiennent à leurs ayants droit. Ce projet de fan non
commercial n'est ni officiel, ni affilié à 20th Century Studios ou Disney.
