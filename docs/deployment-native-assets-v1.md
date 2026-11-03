# Publication légère des ressources natives

La livraison de la version 1.1.0 a atteint la limite de construction de Vercel
pendant le clonage, avant la compilation. Le répertoire `public/game` contient
plus de 11 Go de ressources. Le mode facultatif décrit ici conserve les images
dans le dépôt source et évite leur copie intégrale dans le dépôt de livraison.

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
descendre du commit qui porte les 11 Go d'images : le clonage pourrait sinon
récupérer ces anciens blobs malgré leur absence dans l'arbre final. La preuve
du manifeste établit le lien avec le commit source sans cet héritage volumineux.

Conserver `vercel.json` et son entrée directe `scripts/build-production-v94.mjs`.
Le pipeline Vite `npm run build` est distinct ; sa phase `prebuild` peut recalculer
des inventaires à partir des images présentes et ne convient pas à cette livraison.

## Contrôles avant publication

La garde exige le dépôt canonique, un clone autonome, le SHA de livraison égal
à `HEAD`, un manifeste effectivement suivi par ce commit, le bon arbre des
fichiers conservés, leurs octets d'origine et la réécriture exacte. Elle refuse
les liens et les copies altérées. Le mode léger ne supprime aucun fichier.
Les protections du mode V89 restent actives lorsque le manifeste est absent.

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 tests/vercel-native-origin-v89.test.mjs tests/production-pipeline-v94.test.mjs
```

Après le déploiement, vérifier le menu et la version, les données locales, les
pages de présentation locales et des images PNG/WebP/JPG, dont un chemin avec
espace. Vérifier également le décodage d'un atlas utilisé par le rendu Canvas
ou WebGL depuis l'URL du jeu. Les tests d'une origine locale simulée ne remplacent
pas cette vérification de la véritable origine GitHub et de Vercel.

Le badge de version affiche le SHA réellement compilé de la livraison. Le SHA
distinct des ressources est conservé dans le manifeste ; il ne remplace jamais
l'identifiant du build affiché au joueur.
