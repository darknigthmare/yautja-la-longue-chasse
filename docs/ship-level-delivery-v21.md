# V21 — Niveau du vaisseau, état de livraison

Le grand pont unique est remplacé dans le code par huit salles sur deux ponts, reliées par six segments de coursive et deux puits. Douze portes ont une collision qui suit leur ouverture, avec maintien au seuil. Quatre échelles, une estrade d’observation, une mezzanine d’archives, un balcon de galerie et trois plateformes d’entraînement donnent des reliefs distincts. Les installations essentielles restent accessibles sans saut ni équipement à débloquer.

Le chasseur équipé se déplace dans une caméra locale responsive. Le plan affiche le réseau ; sélectionner une salle pose une balise sans téléporter. Les stations suspendent et reprennent le niveau en conservant la position. Les trophées possédés sont des images individuelles, les armes exposées proviennent du chargement réel. Les murs, meubles, structure, joueur et montants d’avant-plan sont des couches séparées.

## État des fichiers artistiques

Trois parois originales OpenAI sont intégrées en WebP : sanctuaire, mécanique et observatoire. Les sept prompts exacts et les images sources sont conservés dans `art-source/v21/ship-interior/`.

Les quatre objets — cadre de porte, panneau mobile, montant d’avant-plan et console — disposent désormais de vrais masters RGBA et de WebP transparents. Après l’échec de la retouche OpenAI, l’utilisateur a explicitement autorisé le détourage technique local. Le script `prepare-ship-interior-alpha-v21.mjs` retire seulement le fond clair neutre connecté aux bords. Aucun pixel RGB n’est modifié ; les sources `.generated.png` restent intactes. La méthode et les hashes sont consignés dans `alpha-preparation.json` et `manifest.json`.

Le renderer utilise les contours alpha mesurés pour poser les objets au sol. Le cadre s’aligne sur son ouverture ; le panneau couvre ce passage et son bord visible suit la collision jusqu’à disparaître entièrement. Les consoles et nervures conservent leurs proportions. Les sept modules runtime pèsent ensemble **1 173 124 octets**.

## Contrôles réalisés

- 388/388 tests du dépôt réussis, dont parcours continus des huit stations, seuils occupés à 30/60/144 Hz, échelles dans les deux sens, suspension, guidage dans les puits/mezzanines, couches du renderer et images de trophées exactes.
- ESLint et TypeScript réussis.
- Build Vinext réussi ; build Next.js utilisé pour Vercel réussi.
- Audit des dépendances de production : zéro vulnérabilité signalée.
- 31 contrôles HTTP locaux réussis sur les pages, les 14 scripts initiaux, les sept modules V21 et les assets V20/V15 témoins. Les images servies correspondent aux fichiers locaux par SHA-256 ; sources/fichiers privés en 404. Rapport : `outputs/qa-ship-v21/local-http-release.json`. Les 31 contrôles ont également réussi en production ; preuve dans `production-http-release.json`.
- Simulation du paquet Vercel vérifiée : aucun fichier d’environnement, master artistique, document de QA ou DLC privé dans les 1 869 fichiers ordinaires envoyables.

Les preuves détaillées sont dans `outputs/qa-ship-v21/` (ignoré par Git). Les exports statiques React→SVG→PNG ne sont pas des captures navigateur et incluent les sept modules finalisés et omettent uniquement le `foreignObject` du rig HTML. Les vues de navigation, d’ensemble et de galerie pleine ont été inspectées : les murs, accès et images de trophées sont visibles. Pour cet export seulement, les WebP sont réencodés en PNG à pixels décodés identiques, car le rasteriseur ne lisait pas les WebP embarqués. La vue de galerie pleine utilise une fixture QA de huit trophées existants ; elle ne modifie aucune sauvegarde.

Le navigateur de test n’a pas pu démarrer : échec du helper ACL Windows lors du premier passage, puis impossibilité d’écrire les fichiers du navigateur de test (chemin introuvable) après une nouvelle tentative et réinitialisation. Aucune session n’a été créée. Aucun contrôle interactif clavier/manette/tactile dans un navigateur n’est revendiqué. Les contrôles automatisés de physique et de rendu ne remplacent pas cet essai.

Le QA global V19 reste distinct : 452 paires disponibles sur 800 prévues, déjà documentées avant V21. Aucun achèvement des packs de biome restants n’est revendiqué ici.

## Reproduction et publication

Pour reproduire l’export depuis les sources conservées : `node scripts/prepare-ship-interior-alpha-v21.mjs`, `npm run ship-interior:export`, puis `npm run ship-interior:audit`. Le détourage local a été explicitement autorisé pour ces quatre images dans cette conversation. Les audits vérifient les 21 hashes, les dimensions et pivots, la conservation de tous les canaux RGB des masters, l’alpha master→WebP identique, les contours déclarés et le cœur transparent du passage. Les petits liserés de l’ouverture restent préservés.

La publication est autorisée sur le projet Vercel existant, après commit et push de cette révision. L’URL canonique est https://yautja-la-longue-chasse.vercel.app. La preuve de déploiement (identifiant, état Ready, commit Git et contrôle HTTP public) est conservée après publication dans `outputs/qa-ship-v21/`, sans embarquer les documents de QA ou sources artistiques dans le site.

La révision V21 `1636bccb5fd72acef6d9627de708de8c0f741337` a été publiée et vérifiée le 31 août 2026 : déploiement `dpl_GY9Wg9dhcqbRAe9XwawUzEipq55R`, état Ready, URL canonique ci-dessus. Le lot de mobilier et de structure suivant est décrit dans `ship-interior-delivery-v22.md`.
