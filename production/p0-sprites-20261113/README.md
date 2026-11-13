# Sprites P0 — lot du 13 novembre 2026

Ce lot ajoute des candidats graphiques et une galerie de revue indépendante du
jeu. Il ne ferme aucune priorité P0 et ne modifie ni les registres historiques,
ni une sauvegarde, ni les animations ou collisions du jeu. La fidélité visuelle
reste à valider par un artiste ; aucune certification canonique 1:1 n’est déduite
de la génération ou de la réussite des contrôles techniques.

La base documentaire est le commit
`6103b19ecbc47de30a554ba65bda66fe6b515425`. Les analyses originales sont figées dans
`pack-inputs/`. Les rapports individuels dans `generation/` conservent les prompts,
les sources, leurs empreintes et les éventuels essais rejetés.

## Contenu et comptage

Le lot prévu comprend 12 états d’objets de terrain, 30 rôles d’unités avec une vue
native droite et une vue native gauche chacun, 18 structures, 13 objets/modules
Homeworld et 6 fronts de masques : 109 cadres statiques de sprites. Un fond opaque
modulaire de baie Warp `WARP-199` complète ce lot, soit 110 entrées, 80 modèles et
45 PNG natifs. Les nombres réellement disponibles se trouvent dans `manifest.json` ;
`plannedBatch.requestedBatchGenerated` reste faux tant qu’un rapport, un modèle ou
une vue gauche manque. Ce statut ne signifie pas que les 775 sujets P0 du registre
sont terminés.

Les unités et structures occupent des pages natives de 1536 × 1024 pixels,
chacune composée de six cellules de 512 × 512 pixels. Le pack fournit uniquement
des rectangles source ; il n’écrit aucune image découpée. Une vue gauche générée
séparément est un autre cadre du même modèle, et non un autre personnage ou une
animation. Les 11 sources Homeworld sélectionnées produisent 9 objets indépendants
et 4 modules nommés issus des références `HWA160-014` et `HWA160-029`.

Les 640 dessins de PNJ Homeworld, les 52 études BODY de Feral/Scar, les 108 éléments
SVG de gantelets et les 5 images Warp déjà présents restent des entrées
historiques, exclues des nombres de production de ce lot.

## Génération du catalogue et vérification

Depuis la racine du dépôt, avec Python 3 et Pillow disponibles :

```sh
python production/p0-sprites-20261113/tools/build-pack.py --write --require-complete
python production/p0-sprites-20261113/tools/verify-pack.py --require-complete
```

La première commande écrit uniquement :

- `public/game/p0-sprites-20261113/manifest.json` ;
- `public/game/p0-sprites-20261113/review.html` ;
- `production/p0-sprites-20261113/qa/pack/verification.json`.

La seconde commande reconstruit ces données en mémoire et vérifie les deux
fichiers publics sans écrire dans le dépôt. Elle contrôle les empreintes PNG,
les dimensions réellement décodées, l’alpha natif, les rectangles, les pivots
proposés, l’absence de chevauchement des cellules et l’existence des liens vers
les 775 clés P0 archivées. Quand les sorties privées ImageGen existent encore,
leurs octets sont comparés aux copies publiques ; leur présence n’est pas
nécessaire à une vérification reproductible après clonage. Les empreintes
enregistrées dans les rapports restent obligatoirement identiques aux PNG.

Pour une prévisualisation pendant une génération, omettre `--require-complete`.
Cela ne transforme pas un lot incomplet en lot terminé. L’option initiale
`--snapshot-inputs` sert uniquement à copier une première fois les analyses
locales dans `pack-inputs/` ; elle refuse de remplacer un instantané existant par
des octets différents et ne sert pas au clonage ou au contrôle final.

## Contrat du manifeste

`assets[]` contient un cadre statique par entrée. `nativeFiles[]` contient un PNG
unique par fichier, même quand six cadres s’y réfèrent. Les empreintes et
dimensions d’un cadre décrivent sa page native ; `sourceRect`, `frameWidth` et
`frameHeight` décrivent sa cellule. Les pivots sont en pixels locaux au cadre.

- `id` identifie le cadre, par exemple `W3-U01` ou `W3-U01-left`.
- `sourceId` identifie la source documentaire, par exemple `HWA160-014` pour ses
  deux modules.
- `sourceDesignId` identifie le modèle représenté ; les deux vues d’une unité
  partagent `W3-U01`, tandis que chaque module Homeworld conserve un modèle nommé.
- `sourceRows` conserve les classeurs, feuilles, lignes et liens P0 effectivement
  documentés ; ces liens indiquent une contribution, jamais une fermeture.
- `generationRecord` épingle le rapport et sa position JSON exacte.
- `references` publie les sources du projet ou les URL et empreintes des sources
  externes. Les fichiers DDS et images communautaires téléchargés ne sont pas
  republiés dans le dossier public.

Les pivots sont des propositions d’ancrage d’image, pas une preuve de dimensions
physiques, d’alignement d’équipement ou de collision. La caméra de référence est
demandée pour les candidats Homeworld ; leur projection dans la scène à 35° reste
à valider. Les six fronts de masques s’appuient sur des icônes secondaires du port
communautaire `Matthelzor/pd2-predator-pack`, commit
`967905f04f02f702e89e0ca976bac712c516a4e9`. Ils ne certifient ni la palette originale
PHG, ni des profils/dos, ni les UV, ni les proportions du porteur.

`WARP-199` est un fond, classé `assetKind: background`, dont les objets autrefois
incorporés doivent être séparés de la baie. Cette seule entrée autorise une image
native RGB ou RGBA entièrement opaque. Elle est liée à la priorité ouverte
`Warp Universe:WARP-199`, sans fermeture automatique. Aucun nouveau PNG n’est
déduit de la porte CSS de `WARP-202`.

## Alpha, marges et galerie

Pillow lit uniquement les images : le script n’appelle aucune sauvegarde de
raster. Il mesure le canal alpha dans les rectangles natifs en mémoire. Le seuil
visible est 16, le noyau presque opaque commence à 240 et les niveaux 1–2 sont
comptés comme bruit d’alpha. Le RGB caché sous alpha zéro n’est jamais interprété
comme un fond visible.

Un cadre de sprite vide, sans transparence ou sans noyau solide est une erreur technique.
Un pixel d’alpha au moins 16 au bord est signalé comme une silhouette non
qualifiée sans coupure. Les marges inférieures à 5 % ou 2 % sont mesurées et
signalées, sans retouche CPU et sans être transformées en validation artistique.
L’absence d’une marge uniforme de 8 % n’entraîne pas à elle seule un échec.
Le fond `WARP-199` est contrôlé séparément : opacité totale requise, marges de
silhouette et transparence non applicables. Les critères des sprites restent
inchangés.

Avec le serveur habituel du dépôt, ouvrir :

```text
/game/p0-sprites-20261113/review.html
```

La galerie permet le filtrage par famille et identité, les fonds damier/sombre/
sol, les bornes alpha et les pivots, puis les détails et leurs sources. Les
aperçus utilisent `Canvas.drawImage` et les rectangles source uniquement pour
l’affichage ; aucun fichier image n’est exporté. Les PNG entiers restent
consultables. Il n’y a ni sauvegarde de jeu, ni stockage navigateur. Le dialogue
est accessible au clavier et restitue le focus à sa fermeture. Une revue
navigateur et une revue humaine restent distinctes des contrôles Python.

Pour exécuter la revue navigateur automatisée, lancer ce serveur depuis la
racine du dépôt dans un terminal séparé :

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory public
```

Puis, avec Node 22, la dépendance du dépôt `playwright-core` et Chromium installés :

```sh
node production/p0-sprites-20261113/tools/qa-browser.mjs
```

Dans l’environnement cloud de cette session, le binaire Node 22 est aussi
accessible par `/workspace/.cloud-tools/node22/node_modules/node/bin/node`.
Le navigateur est recherché à `/usr/bin/chromium` ; la variable `CHROMIUM_PATH`
permet d’indiquer un autre exécutable. `P0_SPRITE_QA_ORIGIN` permet de remplacer
`http://127.0.0.1:8765`.

Le contrôle couvre le décodage de chaque rectangle et son alpha, les filtres,
les fonds et pivots, les vues opposées, le dialogue au clavier, un échantillon
à 128/256 pixels et les largeurs de 320/390 pixels. Il produit
`qa/browser/verification.json` et des captures de revue ; seuls ces artefacts de
preuve sont écrits, sans modification des PNG du pack. Son résultat final doit
être relu après le gel du manifeste. Il n’atteste aucune validation artistique.
