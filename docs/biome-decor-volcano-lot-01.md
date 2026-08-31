# Décors V19 — lot volcanique 01

État au 31 août 2026 : **12 nouveaux décors produits et audités**, intégrés au registre de disponibilité. Le lot comprend aussi un correctif du rendu des surfaces, dangers et couvertures.

Le lot ajoute trois variantes de pylônes d’obsidienne (`pierced`, `fallen`, `destructible`), trois sources de danger (`lava-seam-02-linear`, `steam-vent-04-cyclic`, `heat-burst-fissure-05-unstable`), trois surfaces (`ash-track-02-trail`, `cooled-lava-crust-05-transition`, `obsidian-shard-bed-03-ridge`) et trois ornements (`ember-brazier-01-single`, `fallen-hunter-marker-01-single`, `profaned-trophy-rack-04-fallen`). Les identifiants complets figurent dans le manifeste.

La disponibilité passe à **464/800 décors**, dont **54/100 pour le volcan**. Il reste **336 décors** à produire dans le catalogue, dont 46 volcaniques. L’audit global conserve ses exigences et échoue tant que le pack de 800 décors est incomplet ; la réussite de cet audit de lot ne vaut pas validation du pack entier.

## Sources et traitement

Le [manifeste du lot](../art-source/v19/biome-decor/batches/2026-08-31-volcano-01/manifest.json) contient les prompts et les empreintes SHA256 des sources, masters et exports. Le [fichier de génération](../art-source/v19/biome-decor/batches/2026-08-31-volcano-01/generation-prompts.json), les PNG originaux dans `sources/` et les reçus dans `processing/` sont conservés dans le même dossier.

Les images ont été générées avec l’outil intégré OpenAI `image_gen.imagegen`. Aucun identifiant de modèle n’a été fourni : le manifeste conserve `model: null`. Le pipeline V19 existant produit un master WebP sur fond chroma vert et un WebP avec transparence réelle pour le jeu, via le helper officiel de détourage. Les exports respectent **768 px maximum** et **24 px de marge minimum**. Les PNG sources restent inchangés.

## Rendu modulaire

Le rendu précédent déformait certains objets pour couvrir toute une géométrie : l’évent atteignait une anisotropie de **11,33×** et la piste de cendres **7,88×**. Le helper `environmentPropDrawing.ts`, appelé par `HuntCanvas.tsx`, conserve maintenant une échelle uniforme sur les deux axes.

- Les sols et dangers horizontaux se répètent en modules, avec un découpage aux limites de leur zone.
- Les émetteurs verticaux sont centrés dans des cellules espacées de 360 px au maximum, avec une hauteur maximale de 132 px.
- Les couvertures restent proportionnelles, centrées et ancrées par le bas.
- Seules les marges transparentes garanties de 24 px sont retirées pour ces trois rôles. Les plateformes et l’escalade conservent exactement leur cadrage antérieur.

Les collisions, les télégraphes, les dégâts et les dimensions des zones de danger ne changent pas. Le traitement des plateformes portrait déjà surdimensionnées reste un chantier distinct ; ce lot ne les agrandit pas.

## Vérifications acquises et limites

- Audit du lot : **12/12 réussis**, empreintes uniques et **979 274 octets** pour les douze exports du jeu.
- Sélection des dangers : la lave privilégie les fissures de lave et la vapeur les évents correspondants, avec variantes et replis contrôlés. Les **12 tests du registre** sont passés.
- Rendu : **8 tests ciblés réussis**, dont 600 combinaisons géométriques. Le contrôle statique utilise les vraies fonctions de dessin et les plans du jeu : **9 804 appels**, anisotropie maximale **1×**, **12/12 nouveaux assets atteignables** sur 100 tentatives et **120 contrôles lave/vapeur**. Les 30 placements plateforme/escalade comparés au relevé initial sont inchangés.
- Six compositions de secteurs et les comparaisons source/module ont été produites. La planche des exports, les évents et la plaine des cendres ont été inspectés. Ces vues omettent acteurs, fonds, effets, télégraphes animés, interface et simulation ; elles ne sont pas des captures du jeu complet.
- Le recadrage a aussi été vérifié sur les **464 exports** : leurs bordures de 24 px ne contiennent aucun pixel visible. Une passe sur 32 700 affectations des huit biomes n’a trouvé aucun plan de dessin nul ; maximum observé : 33 modules pour une limite de 256.
- Validation finale locale : **402/402 tests**, lint, types et compilations Vinext/Next réussis. **52 contrôles HTTP locaux** confirment les pages, scripts et images, avec empreintes des exports identiques et chemins privés en404. Le paquet Vercel contient **1890 fichiers**, dont les12exports, sans source ni prompt de production.
- Aucun test interactif navigateur n’a été réalisé : le lancement a échoué sur les restrictions d’accès du navigateur. Une éventuelle vérification par rendu statique ne le remplace pas.

## Reproduire les contrôles

Depuis la racine du dépôt, reconstruire d’abord la disponibilité à partir des paires master/export présentes, puis auditer le lot :

```powershell
npm run biome-decor:v19:runtime-data
node scripts/audit-biome-decor-v19-batch.mjs --manifest art-source/v19/biome-decor/batches/2026-08-31-volcano-01/manifest.json
node --test tests/environment-prop-registry-v19.test.mjs tests/environment-prop-drawing.test.mjs
```

L’audit de lot écrit un rapport JSON sur la sortie standard et retourne le code 1 en cas d’échec. Pour constater séparément l’état du pack complet sans écrire d’artefacts QA :

```powershell
node scripts/audit-biome-decor-v19.mjs --check-only
```

Les rapports détaillés locaux se trouvent dans `outputs/qa-biome-volcano-01/` (dossier exclu de Git et du déploiement) : audit des images, comparaison avant/après, tests, compilations, contrôles HTTP et état de publication. Les sources et prompts sont également exclus du paquet Vercel ; seuls les exports nécessaires au jeu y figurent.

Ces commandes locales ne publient rien et ne nécessitent aucun secret de génération.
