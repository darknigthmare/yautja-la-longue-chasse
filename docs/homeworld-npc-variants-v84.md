# PNJ V84 — variantes du Homeworld et des tribus

## Base et objectif

Base auditée : V83, commit `9456292f1e60f506b0c982187ca782eefbab2a81`, daté du 4 octobre 2026.

La livraison vise 20 PNG individuels pour chacune des 32 familles :
14 métiers de la cité, 4 familles régionales et 10 métiers des cinq tribus
historiques de V37, plus 4 familles de la cour et des services animaliers,
soit 640 dessins. Le nombre effectivement importé reste
lisible dans `app/game/data/homeworldNpcVariantsV84.json`. L’export final refuse
de produire le paquet si une famille contient moins de 20 fichiers ou si une
revue faciale manque pour le SHA256 de l’un des PNG définitifs.

Les originaux ne sont pas des recolorations de l’atlas : chaque fichier est une
génération individuelle guidée par les sources du projet. Les vêtements,
silhouettes, visages, dreadlocks, outils et postures varient selon le métier.
Les notes de création sont conservées dans `art-source/v84/npc-variants`.

## Population conservée

Le recensement conserve 434 placements de PNJ :

| Population V83 | Nombre |
| --- | ---: |
| Habitants ambiants de la cité | 98 |
| Figurants urbains supplémentaires | 14 |
| PNJ nommés de service et de récit | 12 |
| Hôtes C’ntlip | 4 |
| Habitants du palais et du conseil | 5 |
| Passeur de lave | 1 |
| PNJ principaux des dix villages | 120 |
| Habitants ambiants des dix villages | 180 |
| **Total** | **434** |

Les identifiants, métiers, services, conversations et sauvegardes existants
restent les mêmes. Le Roi de la Chasse (`hunt-king`) et le
mentor du prologue (`terrace-instructor`) gardent leur représentation d’origine.
Les variantes de chefs sont des personnages alternatifs disponibles pour de
futurs habitants ou pour le catalogue ; elles ne créent pas vingt rois.

L’âge et le quartier ne déterminent plus le métier visuel des habitants inscrits
dans ce recensement. Le registre V84 associe explicitement chaque PNJ à sa famille.

## Cour, conseil, écuries et chenil

| Nouvelle famille | PNG | Présence ajoutée au jeu |
| --- | ---: | --- |
| Membres de la cour du Roi | 20 | Quatre personnages dans le palais public |
| Anciens du conseil | 20 | Deux Anciens dans la chambre des représentants |
| Personnel des écuries | 20 | Deux employés dans les travées du port |
| Maîtres du chenil | 20 | Deux employés au quai du retour des chasses |

Ces dix nouvelles identités portent le registre à 444. L’hôte de la table de la
cour et l’Ancien observateur existants utilisent aussi leur famille spécialisée.
Les nouveaux courtisans et Anciens occupent le sol réel, en préservant les accès
aux services et la circulation entre toutes les salles. Les employés du port
suivent des trajets acceptés par le filtre de déplacement du corps entier.
Les employés animaliers sont représentés lors du transit des équipes au port ;
les bâtiments dédiés et les fonctions de dressage ne sont pas ajoutés par ce lot
de personnages. Les 20 variantes par famille sont consultables dans la galerie.

## Fidélité anatomique des visages

La référence principale des visages est la tête du Predator original 1987,
photographiée pendant sa fabrication par Stan Winston Studio :
[article et archives de Stan Winston School](https://www.stanwinstonschool.com/blog/predator-behind-the-scenes-creating-the-mechanical-head-face-and-mouth-for-the-jungle-hunter).
Le [dessin original](https://www.stanwinstonschool.com/blog/predator-movie-making-the-predator)
complète cette référence. Les photographies de référence ne sont pas redistribuées
dans les fichiers du jeu.

La revue porte sur le crâne, le front, les quatre lobes mandibulaires externes,
les défenses et la bouche interne dentée, ainsi que les tendrils épais du crâne.
Les premières générations qui simplifiaient les mandibules en deux replis sont
révisées en conservant la tenue, les outils et l’identité du personnage. Un
biomasque ou respirateur réellement couvrant est identifié séparément.
Chaque fichier final approuvé est consigné dans `face-review.json` avec son
SHA256. L’export compare cette validation aux octets effectivement livrés.

## Attribution des apparences

`homeworldNpcVariantsV84.ts` compile le registre complet et attribue les fichiers
en fonction de l’identifiant permanent, du rôle et du groupe. La cité entière
forme un groupe ; chacun des dix villages forme un groupe distinct. Aucun groupe
de rôle du recensement ne dépasse 20 personnages. Avec toutes les variantes, aucun
PNJ du même rôle n’a donc le même fichier qu’un autre dans sa cité ou son village.
Un fichier peut être réutilisé dans un village différent.

Les PNJ principaux des villages portent des identifiants locaux répétés dans V83,
comme `healer`. La clé visuelle est préfixée par la région, par exemple
`glass-desert:healer`. Les identifiants ambiants déjà préfixés sont conservés.

Le temps, le mouvement et le sous-ensemble visible ne participent pas au choix.
Une source manquante ou en erreur utilise le rendu antérieur du PNJ. Un soigneur
ne reçoit jamais le dessin d’un garde pour combler une famille absente.

## Cadrage et animation

Les PNG originaux restent intacts, avec leurs dimensions et leur canal alpha.
L’import mesure les limites du personnage et l’ancrage de ses pieds. Le composant
applique une échelle uniforme et, selon la direction, le miroir horizontal
déjà utilisé par les anciens habitants. Le miroir n’est pas compté comme une
variante supplémentaire.

**Les 640 nouveaux dessins sont des poses fixes.** Ils ne fournissent pas de
cycles de marche natifs. Un PNJ en déplacement garde le même dessin fixe. Les
anciens cycles restent disponibles pour les représentations d’origine qui
servent de repli. Aucun faux cycle ou image partagée d’un autre individu n’est
annoncé comme une nouvelle animation.

Les scènes gardent leur filtrage des acteurs visibles. Le catalogue pagine les
résultats et charge les vignettes à la demande ; il ne précharge pas les 640 PNG.
Les originaux sont volumineux : leur présence dans les archives et dans le dépôt
ne signifie pas qu’ils sont tous chargés simultanément par la scène.

## Les cinq tribus et les dix villages

V83 contient dix villages jouables et, séparément, une bibliothèque d’illustrations
pour cinq tribus historiques. Ces cinq lieux dédiés ne sont pas livrés comme
destinations jouables dans V83. Cette modification ajoute leurs 200 personnages
à la galerie et au catalogue des rôles sans inventer de nouveaux hubs.

| Tribu historique | Métiers | Sprites visés |
| --- | --- | ---: |
| Peuple des Citernes | Hydrologues ; intendants des caravanes | 40 |
| Terrasses des Hautes Branches | Bâtisseurs ; archivistes | 40 |
| Cour des Forges Basses | Mécaniciens ; négociants | 40 |
| Forges de la Caldeira | Fondeurs ; médecins | 40 |
| Refuge des Veilleurs | Botanistes ; guides des racines profondes | 40 |

## Vérification

L’import vérifie le format PNG, le canal alpha, les dimensions, les pixels
transparents, les silhouettes qui croisent le bord, les SHA-256 des fichiers et
les SHA-256 des pixels décodés. Une copie renommée du même personnage ne peut pas
être comptée comme une nouvelle variante. Chaque résultat est aussi inspecté
visuellement pendant sa création.

Treize tests ciblés couvrent le choix des variantes, la préservation des rôles et
identités, les clés régionales, les réserves de récit, le rendu React réel,
l’ancrage au sol et le passage des identifiants dans les scènes de cité et de
village, ainsi que les dix nouvelles implantations. Les dix tests des intérieurs
monumentaux contrôlent également l’accès aux salles, les meubles et les services.
Le rendu statique React ne constitue pas une navigation dans un navigateur.

La compilation de production Next/Webpack et le contrôle des CSS compilées ont
réussi pendant l’intégration. Le rapport de livraison précise la validation
effectuée sur le paquet final.

Trois assertions de tests anciens échouaient déjà sur V83 inchangée : le nombre
d’ailes fonctionnelles (39 attendu, 47 obtenu), le nombre d’entrées du codex V72
(87 attendu, 101 obtenu) et le chevauchement de `residence-clans-1` avec la peinture
de l’escalier du conseil. Ces écarts ont été reproduits sur la base V83 et ne
sont pas présentés comme des régressions de la modification des PNJ.

## Commandes

Importer de nouveaux originaux, puis auditer le catalogue :

```sh
node scripts/import-homeworld-npc-variants-v84.mjs --source /chemin/vers/npc-generation --require-complete
npm run typecheck
node --test tests/homeworld-npc-variants-v84.test.mjs tests/homeworld-npc-rendering-v84.test.mjs
node scripts/build-audio-manifest.mjs && npx next build --webpack && node scripts/verify-pit-built-css-v61.mjs
```

Exporter le catalogue hors ligne, le code et les archives de sprites :

```sh
node scripts/export-homeworld-npc-variants-v84.mjs --output /chemin/vers/livraison-v84
```

Les archives partagent une arborescence commune et gardent chaque famille de 20
dans une seule partie. Le sous-dossier `projet` est le complément à fusionner
dans une copie de la base V83, pas une nouvelle copie autonome du jeu complet.
