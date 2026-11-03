# Pipeline des arènes V55

Ce pipeline ajoute un lot paramétré à partir de `docs/v55-stage-plan.json`. Il ne transforme pas le réemploi d’un décor en preuve canonique, et ne modifie aucune des 138 arènes historiques. La table de recommandations doit contenir les 195 identités sélectionnables, une seule décision par identité ; les variantes de masque ne gonflent pas ce nombre.

## Sources et recommandations

Chaque scène déclare `kind` (`film`, `game`, `comic` ou `original`), son œuvre, son lieu et une référence. Chaque association déclare indépendamment sa classification et son état documentaire :

| Classification | Sens | État source permis |
| --- | --- | --- |
| `character-setting` | Le lien personnage / lieu est documenté, sans attester la géométrie latérale. | `resolved`, `primary-limited` |
| `work-setting` | Lieu partagé de l’œuvre ; aucune biographie individuelle déduite du costume. | `resolved`, `primary-limited` |
| `original-exhibition` | Lieu choisi pour un duel d’exposition, non biographique. | `original-selected` |

Les deux premières classifications exigent au moins une référence HTTPS. Une source limitée reste signalée comme telle. Une scène de type `original` ne peut devenir un lieu attesté par un simple changement de sa recommandation. Les expositions restent dans la collection « Originaux », hors des filtres film/jeu/comics. Les liens de source ne certifient ni une reproduction exacte d’une case ni une copie 1:1 des plans de l’œuvre.

## PNG et modularité

`art-source/v55/pit-stages/source-records.json` contient les reçus OpenAI : `id`, `arenaId`, `generator: "openai-imagegen"`, chemin exact `toolSource`, `visualReviewed: true`, et notes de revue. Quand SHA, dimensions ou chemin public sont déclarés, ils doivent correspondre au fichier réel. Le pipeline lit l’original de génération, vérifie son PNG et copie ses octets sans transformation. Il refuse d’écraser silencieusement une autre image.

P0 appartient au répertoire précis du nouveau stage. P1 est une brume alpha déjà produite, sans fausse animation. P2, P3 et P5 utilisent des modules natifs dont le propriétaire original est inscrit dans la bibliothèque : pas d’alias récursif, pas de recadrage divergent. Les profils disponibles sont `jungle`, `forest`, `metal`, `urban-roof`, `stone`, `ice`, `dry-earth`, `ritual`, `archive`, `forge`, `dock`, `abyss`, `temple`, `observatory`, `roof`. Les profils rituels ou de toiture japonaise ne conviennent pas automatiquement à une forêt ou à une ville humaine. `urban-roof` n’utilise aucune caisse. `dry-earth` ne prétend pas fournir une texture de sable.

Un sol neuf est optionnel :

```json
{
  "floor": {
    "publicPath": "/game/sprites/v55/pit-arenas/arena-139-example/p4-floor.png",
    "sourceRecordId": "native-pavement",
    "material": "pavement",
    "placement": { "width": 960, "height": 110 }
  }
}
```

`material` accepte `pavement`, `sand`, `earth`, `ice`, `metal` ou `organic`. Un `sourceCrop` explicite est possible pour lire une bande du PNG sans modifier ses pixels. Chaque ligne du crop, y compris l’appui supérieur et le bas du sol, doit être opaque à alpha 250 sur au moins 98 % de sa largeur. Le renderer conserve le ratio natif : la profondeur affichée doit atteindre 180 pixels à la largeur choisie pour couvrir aussi le cadrage large. `placement.height` ne sert pas à étirer l’image. Le sol répété est verrouillé au monde à y=430 et au facteur de parallaxe 1. Une autre scène peut ajouter `ownerStageId` pour réutiliser ce sol, mais le propriétaire doit être un stage antérieur du même lot ; chemin, crop, matériau et reçu doivent rester identiques. Les huit cadrages mesurent aussi les rectangles réellement dessinés pour vérifier une couverture continue jusqu’au bas de l’écran.

Les appuis des modules au sol sont mesurés sur le vrai alpha (seuil 16). Le placement compense seulement la marge inférieure transparente du cadre natif et conserve la hauteur d’appui authored, par exemple une tablette de trophée. Les sources et crops historiques ne sont jamais réécrits pour cacher un mauvais appui.

## Qualification puis activation

1. Geler le plan et les reçus après revue des PNG.
2. `node scripts/assemble-pit-lore-stages-v55.mjs` : vérifier les 195 associations, produire les nouvelles compositions **désactivées**, vérifier les références et écrire la projection runtime.
3. `node scripts/verify-pit-arena-composition-v55.mjs all` : un navigateur de recette, toutes les scènes, huit cadrages chacune (centre, proche, limites gauche/droite, large, mouvements réduits, contraste élevé, tick suivant). `V55_ARENA_QA_OUTPUT` choisit le répertoire des captures.
4. Inspecter les captures de chaque scène, les textures de sol et les raccords. Enregistrer la décision réelle et le digest exact dans `docs/v55-stage-composition-visual-review.json`. Un résultat mécanique PASS ne constitue pas cette revue.
5. `node scripts/enable-pit-lore-stages-v55.mjs` : refuser toute preuve manquante, composition changée ou revue non acceptée. Activer seulement les compositions qualifiées, sans changer les 138 historiques.
6. Contrôler le catalogue de production complet, puis l’application réelle sur un échantillon explicite de familles / classifications, avec chargement et réessai. La couverture de toutes les scènes par le renderer n’est **pas** présentée comme 195 duels joués dans l’application.

Les contrôles de recette utilisent un proxy de géométrie uniquement dans le harnais isolé lorsque la scène est encore désactivée. Cette copie locale n’ajoute jamais un ID au jeu réel, ne touche ni sauvegarde ni récompense et ne contourne pas les gardes du catalogue publié. Les définitions seules ne débloquent jamais les arènes.

Les preuves doivent distinguer les tests unitaires, les PNG décodés, les captures du renderer, la navigation dans l’application et la publication. Aucun build global, packaging PC ou déploiement n’est implicite dans ces commandes.
