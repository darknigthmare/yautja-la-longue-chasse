# Masques neutres · lot du 13 novembre 2026

Ce lot ajoute une version C technique aux 66 représentations B conservées des lots dual et expansion. Trois nouvelles études d’éditions NECA (Scarface Concrete Jungle 2016, Stalker Kenner Series 16 et Ahab Ultimate 2017) ajoutent chacune A et B issus d’ImageGen, puis une C issue de B. Cible complète : **69 C neutres, 6 nouveaux PNG ImageGen A/B**. Les 145 PNG ImageGen et 126 classeurs historiques restent protégés, à octets identiques, dans six lots antérieurs.

L’utilisateur a choisi la désaturation technique. Pour chaque pixel RGBA8 décodé de B, y compris sous alpha nul, C reprend l’alpha et remplace R/G/B par `floor((2126R + 7152G + 722B + 5000) / 10000)`. La méthode `srgb8-rec709-luma-v1` utilise les octets sRGB encodés ; elle ne linéarise pas la lumière. Le cadre, les dimensions et chaque octet alpha restent identiques. Les 66 sources historiques contiennent de la chroma : leurs C sont des dérivées, pas des copies ou de nouvelles images ImageGen. Les A/B/R sources ne sont ni réencodées ni modifiées.

La galerie publique `review.html` compare B et C à une même hauteur visible, propose une vue 96 px, les sources A/R en tiroir accessible au clavier et un aperçu de teinte sur C. Cet aperçu modifie uniquement un canvas du navigateur ; il ne réécrit ni n’exporte de PNG. C reste une image 2D avec un éclairage déjà présent : pas un albédo, une matière PBR, un UV ou une intégration runtime.

Les réserves héritées sont conservées : **Vapor reste provisoire et refusé pour une version fidèle** (écart de largeur d’environ +11 %), Emissary et Nightstorm restent partiels, Ravin reste une étude hybride non certifiée portable. Wolf conserve sa lignée B réemployée pour préserver les glyphes ; C ne certifie aucune forme. Les trois nouvelles études qualifient une édition photographiée, sans certifier la géométrie canonique de la franchise. Ahab Ultimate 2017 ne remplace pas Ahab SDCC 2014. Les 46 exigences historiques restent ouvertes ; aucun P0, canon, contrôle humain ou runtime n’est clôturé automatiquement.

Le manifeste distingue `nativeFiles` (nouveaux A/B ImageGen), `derivedFiles` (C techniques) et `sourceCopies` (R exactes, ou réemploi C si une source future est déjà strictement monochrome). Les origines privées sont enregistrées, mais leur présence n’est pas nécessaire pour vérifier le lot depuis un checkout neuf. La sélection CI est une liste de fichiers littéraux limitée à 1024 fichiers et 768 Mio ; les six lots historiques représentent déjà environ 560 Mo avant C. Les vastes archives artistiques, les dépendances Node et les origines privées ne sont pas téléchargées par ce contrôle.

```sh
python3 production/biomasks-neutral-20261113/tools/build-neutral-mask-pack.py --prepare-inventory
MASK_TOOL_DEPENDENCIES_ROOT=/chemin/checkout-avec-dependances node production/biomasks-neutral-20261113/tools/create-neutral-batch.mjs --inventory production/biomasks-neutral-20261113/inputs/neutral-production-inventory.json
python3 production/biomasks-neutral-20261113/tools/build-neutral-mask-pack.py --write --require-complete
python3 production/biomasks-neutral-20261113/tools/verify-neutral-mask-pack.py --check --require-complete
python3 production/biomasks-neutral-20261113/tools/verify-neutral-pixels.py --manifest public/game/biomasks-neutral-20261113/manifest.json --inventory production/biomasks-neutral-20261113/inputs/neutral-production-inventory.json --accepted-new-masks production/biomasks-neutral-20261113/inputs/accepted-new-masks.json --output /tmp/neutral-independent-pixels.json
```

Le module de conversion exige Sharp 0.35.4 du verrouillage du projet et refuse d’écraser une destination existante. Le builder et les deux vérificateurs ne transforment aucun pixel. Le contrôle indépendant Python/Pillow vérifie la formule exacte sur chaque pixel, l’alpha brut, les sources et les qualifications héritées. Le classeur de suivi est un nouveau fichier ; les 126 anciens restent intacts.
