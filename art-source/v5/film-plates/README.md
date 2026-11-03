# Plaques cinéma Yautja V5

Cette vague reprend le pipeline visuel utilisé dans **Multiverse Breach** :

1. une fiche stable par personnage ;
2. au moins deux pages de référence indépendantes quand elles existent ;
3. priorité aux pages studio et aux turnarounds officiellement licenciés ;
4. téléchargement local des références de travail, jamais livré au runtime ;
5. un prompt OpenAI séparé par Yautja ;
6. une plaque corps entier sur chroma uniforme ;
7. détourage puis normalisation avec une marge transparente homogène ;
8. mesure automatique de l’alpha et des marges, puis contrôle visuel du
   cadrage et de l’identité sur les planches film par film ;
9. vérification dans le sélecteur sur ordinateur et mobile.

## Couverture

La V5 contient 39 plaques distinctes regroupées film par film :

- *Predator* ;
- *Predator 2* et les membres identifiables de la Lost Tribe ;
- *Alien vs. Predator* ;
- *Aliens vs. Predator: Requiem* ;
- *Predators* ;
- *The Predator*, avec les deux Emissaries clairement signalés comme scènes
  supprimées ;
- *Prey* ;
- *Predator: Killer of Killers* ;
- *Predator: Badlands*.

Les changements d’état d’un même individu ne sont pas comptés comme de nouveaux
chasseurs. Le design récurrent Arena Guard est documenté par une seule plaque
d’archétype, sans prétendre représenter plusieurs individus nommés. Les entrées
jeux, comics et romans restent dans une section distincte du sélecteur.

## Fichiers

- `manifests/*.json` : références, ancrage visuel, prompt final et validation
  pour chaque lot ;
- `openai-film-plate-prompts.jsonl` : pack reproductible, une ligne et un prompt
  par Yautja ;
- `sources/*-chroma.png` : sorties OpenAI avant détourage ;
- `public/game/sprites/v5/film-plates/*.png` : plaques transparentes utilisées
  par le jeu ;
- `public/game/sprites/v5/film-plates/manifest.json` : couverture, dimensions et
  empreintes SHA-256.

Les références téléchargées restent sous
`tmp/yautja-film-references/<personnage>/` et ne sont pas distribuées.

## Prompt commun

Chaque prompt verrouille les points suivants :

```text
Use case: stylized-concept
Asset type: full-body character selection plate for a detailed 2D side game
Input images: licensed/studio visual references for this individual only
Primary request: recreate the selected film Yautja as original project pixel
art while preserving the reference silhouette, anatomy, biomask, armor,
dreadlocks, carried weapons and film-specific state
Composition: one complete character, strict three-quarter side view facing
right, head, equipment and both feet entirely visible, common scale and
baseline, generous safe padding
Background: perfectly flat solid #00FF00, no floor, shadow or reflection
Constraints: no crop, no second character, no text, UI, logo or watermark; do
not add equipment absent from the selected film state
```

Les champs propres à chaque personnage complètent ce socle avec sa morphologie,
ses matériaux, ses plaques, son masque, ses trophées et son arsenal attestés.

## Commandes

```powershell
npm.cmd run film-plates:references
npm.cmd run film-plates:normalize
npm.cmd run film-plates:build
npm.cmd run film-plates:audit
npm.cmd run film-plates:contact-sheets
npm.cmd run qa
```

La commande `film-plates:contact-sheets` compose dix planches de contrôle
temporaires, une par film, dans `tmp/film-plate-contact-sheets`. Elles permettent de vérifier
visuellement l’échelle, le cadrage, l’identité et les différences de silhouette
sans réutiliser les références officielles dans le runtime.

La normalisation ne peut pas recréer une extrémité déjà coupée par la
génération. Le rapport automatique ne vaut donc jamais validation visuelle à
lui seul.

Les illustrations produites sont des créations originales du projet guidées
par des références. Aucun photogramme, scan, texture ou pixel officiel n’est
livré dans le jeu.
