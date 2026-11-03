# Publication légère des ressources natives

La première livraison de la version 1.1.0 a atteint la limite de construction de
Vercel pendant le clonage, avant la compilation. Le répertoire `public/game`
contient plus de 11 Go de ressources. Le mode facultatif décrit ici conserve les
images dans le dépôt source et évite leur copie intégrale dans le dépôt de livraison.

## Deux modes explicites

Sans `scripts/native-asset-origin-v1.json`, la configuration garde le mode V89
existant. Le dépôt principal conserve toutes les ressources natives et ne
contient pas ce manifeste de livraison généré.

La branche de livraison légère contient le manifeste, tous les fichiers du jeu
autres que les PNG, WebP et JPG, ainsi que le code de l'application. Les JSON
importés à la compilation, SVG, GeoJSON, HTML et JavaScript restent locaux.
Le répertoire audio et les autres fichiers publics sont également conservés.

Dans ce mode, une réécriture `afterFiles` de `/game/:path*` sert les fichiers
absents depuis le même dépôt GitHub, à un commit complet immuable. Les fichiers
locaux gardent la priorité. L'URL visible reste celle du jeu. Aucun redimensionnement,
changement de format ou remplacement artistique n'est effectué.

## Préparation d'une livraison

Générer le manifeste à partir du commit qui conserve les ressources souhaitées :

```sh
node scripts/native-asset-origin-v1.mjs --source FULL_SOURCE_SHA --output NEW_MANIFEST_PATH
```

La commande lit les métadonnées Git, sans télécharger les images. Elle refuse
d'écraser un fichier existant. Le manifeste contient la preuve reliant le commit
à son arbre racine, puis à `public` et `public/game`, ainsi que l'inventaire
complet des chemins, modes et identifiants de blobs. Son arbre des fichiers
conservés est reconstruit et vérifié indépendamment.

Créer ensuite un arbre de livraison à partir du code validé : conserver les
fichiers non bitmap de `public/game` avec leurs blobs exacts, ajouter le manifeste
au chemin prévu et les exclusions PNG/WebP/JPG à la seule copie de livraison de
`.vercelignore`. Les archives `docs` et `art-source`, déjà exclues du déploiement,
peuvent être omises de cet arbre. Tous les originaux restent dans le dépôt principal.

Le commit de livraison utilise une histoire courte et légère. Il ne doit pas
descendre du commit qui porte les images : le clonage pourrait sinon récupérer
ces anciens blobs malgré leur absence dans l'arbre final. Le parent léger retenu
est `d86e9e3cb0443d98c01d964f3f718c9b3963025e`. La preuve du manifeste établit le
lien avec le commit source sans cet héritage volumineux.

Conserver `vercel.json` et son entrée directe `scripts/build-production-v94.mjs`.
Le pipeline Vite `npm run build` est distinct ; sa phase `prebuild` peut recalculer
des inventaires à partir des images présentes et ne convient pas à cette livraison.

## Contrôles avant publication

La garde exige le dépôt canonique, un clone autonome, le SHA de livraison égal
à `HEAD`, un manifeste effectivement suivi par ce commit, le bon arbre des
fichiers conservés, leurs octets d'origine et la réécriture exacte. Elle refuse
les liens et les copies altérées. Le mode léger ne supprime aucun fichier.
Les protections du mode V89 restent actives lorsque le manifeste est absent.

Le répertoire `.next/output/static/game` est obligatoire. Chaque fichier conservé
doit aussi être présent et vérifié dans cette sortie : `verifiedOutputFiles` doit
égaler `retainedFiles`. L'adaptateur a déjà produit ces copies à ce stade ; le
compacteur qui suit ne complète pas une sortie manquante. Pour le lot source
ci-dessous, cela exige les **378 fichiers locaux et les 378 sorties**. Les
régressions retirent réellement un HTML, puis le répertoire de sortie entier,
et vérifient le refus sans modification des sources ou des autres sorties.
Cette intégration renforce le contrôle d'exhaustivité dans
`scripts/vercel-native-origin-v89.mjs` ; les deux régressions sont conservées dans
`tests/vercel-native-origin-v89.test.mjs`.

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 tests/vercel-native-origin-v89.test.mjs tests/vercel-static-compaction-v87.test.mjs tests/production-pipeline-v94.test.mjs
```

Le workflow conserve son gate des origines natives et ses trois preuves de
réussite des groupes `application`, `models` et `history`. Les images
`homeworld/v75/architecture/enforcer-bastion.png` et `undercity-refuge.png` sont
incluses explicitement dans le checkout CI et dans le déclenchement par chemins :
le test de dressing V113 mesure leurs pixels avec Sharp. Les assertions et les
preuves historiques restent inchangées.

## Production observée le 3 novembre 2026

| Élément | Identité ou résultat |
| --- | --- |
| Déploiement Vercel | `dpl_FSK2UqFLbRpGgMwTjvC12HbWUEjf` |
| État | `READY`, le 3 novembre 2026 à 20:34:25 UTC |
| Commit de livraison | `453abb856c867d0c27428119007ca6d43f6c1fda` |
| Commit du code source de cette livraison | `2b0c747652f145b5e0918438e591a034b1f75c2b` |
| Commit des ressources natives | `26ade5671f518f7befefb77b7d85d1a2a4915b3b` |
| Inventaire `public/game` | 7 730 entrées : 7 352 bitmaps externalisés et 378 fichiers conservés |
| Garde exécutée dans ce build | 378 sources vérifiées, 378 sorties vérifiées, 0 fichier supprimé |
| Vérification HTTP de l'URL canonique | HTTP 200 ; HTML serveur avec version `1.1.0` et build `453abb85` |

Cette observation porte sur le code `2b0c7476` publié dans `453abb85`. Le renforcement
d'exhaustivité de cette intégration est suivi séparément ; l'état `READY` de cette
livraison antérieure ne constitue pas sa publication. Le badge affiche le SHA réellement
compilé de la livraison. Le SHA distinct des ressources reste dans le manifeste
et ne remplace jamais l'identifiant du build affiché au joueur.

Après chaque déploiement, vérifier le menu et la version, les données locales,
les pages de présentation locales et des images PNG/WebP/JPG, dont un chemin
avec espace. Vérifier également le décodage d'un atlas utilisé par le rendu
Canvas ou WebGL depuis l'URL du jeu. Les essais de routage avec une origine locale
simulée et les tests navigateur du menu avec session de jeu simulée ne prouvent
pas ces interactions sur l'origine GitHub et le déploiement de production.
