# PHG — recette native des priorités P0/P1

La recette courante est [attempt-3/report.json](attempt-3/report.json), sur le
vrai GameClient Next, build **`RYl37_8hN58IOB8jDpRj1`**, Chromium 154.0.8037.57.
Elle réussit **23 contrôles**, avec **19 captures originales ouvertes** et
**24 paires de sauvegardes avant/après**. Les empreintes des 48 documents
sérialisés ont été reconstruites ; honneur et marques de clan sont inchangés.

Les **1 268 fichiers** applicatifs, desktop et de dépendances retenus par le
protocole ont la même empreinte avant et après le parcours. Les **189 réponses
JavaScript**, représentant 27 chemins distincts, correspondent aux octets du
build Next local. Les erreurs de page, console, HTTP, requêtes et comparaison
de ressources sont absentes. La portée de cette recette couvre la
personnalisation et les régressions techniques décrites ci-dessous.

## Parcours réellement joué

Seule la sauvegarde initiale adulte et sa classe Alpha ou Samurai sont des
fixtures déclarées. Aucun pigment, decal, résultat ou récompense n'est prérempli.
Le parcours passe par le menu de campagne, la console du vaisseau, l'armurerie,
puis « Personnaliser le chasseur » : aucune fonction de jeu n'est appelée depuis
le test et aucun DOM n'est réécrit pour simuler une action.

- **T01–T02 :** lignée Alpha/Samurai conservée après personnalisation ; Ogre et
  les deux choix Samurai Requiem/Nova exercés dans leurs contrôles réels.
- **T03 :** passage Alpha → City, Ogre indisponible et absent du rendu ; une
  validation de pigment ordinaire nettoie la finition incompatible, puis la
  recharge conserve le bon masque.
- **T04 :** retrait d'inspection sans écriture, puis retrait durable du biomask
  et recharge ; pigment et decal de masque ne restent pas portés.
- **T05–T08 :** les quatre choix de decals sont indépendants et n'écrivent
  qu'après confirmation ; leurs vrais propriétaires alpha et transformations
  sont relevés dans le rig.
- **T14 :** six morphologies sélectionnées par les boutons natifs, dans
  l'orientation offerte par l'interface ; quatre calques observés et capturés.
- **T16 :** sélection native de Scar puis ajout d'un decal original sans
  remplacer les fichiers de corps ou de tête. Ce contrôle demeure partiel :
  aucun sélecteur indépendant d'effet Scar/Warpaint PHG n'est offert.

Une confirmation est effectuée au clavier pour chaque classe ; le viewport de
390 pixels conserve l'aperçu et n'introduit pas de débordement horizontal du
document. Cela ne constitue ni un essai de manette physique ni une session de
soixante minutes. Les angles face/profil/dos absents du produit ne sont pas
inventés. Les pixels et UV officiels, les autres poses et le zéro-débordement
artistique global restent à qualifier séparément.

## Défaut trouvé et corrigé pendant cette recette

L'inspection du premier parcours complet avait montré deux fragments gris sous
les jambes Samurai. Le [diagnostic natif progressif](diagnostic-isolation/report.json)
conserve sept étapes, leurs PNG, sauvegardes et relevés DOM : l'image native
est propre, puis **la seule teinte d'armure** introduit les fragments, avant
toute finition de masque et tout decal. Aucun pixel source ni style DOM n'a
été modifié pour ce diagnostic.

L'[analyse des propriétaires](armor-owner-clipping/analysis.json) relie les
fragments aux 44 pixels détachés du dessin de jambière, déjà éliminés par le
clip de l'image native. Les overlays normaux et enveloppés oubliaient ce clip.
Le correctif transmet le même `clipPath` aux deux chemins, sans changer le PNG,
le pivot ou la sauvegarde.

Le parcours final vérifie la parité de tous les clips natifs et pigmentaires.
La [comparaison PNG finale](attempt-3/fragment-pixel-regression.json) reprend
exactement les deux rectangles du diagnostic : les différences supérieures à
un niveau sur 255 passent de **124 / 125 pixels à 0 / 0**. Les différences
exactes restantes sont conservées : 44 / 5 pixels d'un seul niveau, compatibles
avec l'arrondi du compositeur, jamais présentés comme des octets identiques.
Les dix-neuf captures finales ont ensuite été ouvertes ; les deux fragments
diagnostiqués ne sont plus visibles. Cette comparaison locale ne certifie pas
les autres images ou les UV PHG.

## Conservation et reproduction

`attempt-1` garde l'échec d'une assertion de recette trop étroite : le decal de
biomask hérite de la transformation de son parent de tête. `attempt-2` garde
le parcours technique antérieur et ses 17 images, dont l'inspection a permis
de trouver le défaut des jambières. Leurs résultats ne sont pas attribués au
nouveau build. Les recettes exactes utilisées et les rapports navigateur bruts
restent conservés ; l'inspection des captures est ajoutée séparément.

La [qualification par critère](qualification-native.json) et le
[reçu final](attempt-3/final-receipt.json) conservent le périmètre et les limites.
Pour rejouer, démarrer le même build Next et choisir un nouveau répertoire
de sortie ; une preuve existante n'est pas écrasée :

```sh
PHG_QA_URL=http://127.0.0.1:3122 \
PHG_QA_OUTPUT=outputs/phg-p0p1-replay \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
/workspace/.cloud-tools/node22/node_modules/node/bin/node scripts/qa-phg-p0p1-20261109.mjs
```
