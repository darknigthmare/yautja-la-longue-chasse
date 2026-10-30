# V114 — Réconciliation des matières PHG et de la personnalisation V113

Base de travail : PR #27 (sur PR #24), inventaire original déjà présent sous `public/game/imports/v85/drive-latest/`. Le registre `hunterMaterialsV113.ts` est repris **octet pour octet** de la PR #25 pour éviter deux inventaires contradictoires.

- 44 ressources historiques : 13 peaux, 3 composants dreadlocks, 28 matières d'équipement et étoffes. Le fichier de contrôle vérifie l'empreinte Git de chaque PNG, la taille en octets, l'en-tête et le CRC IHDR.
- 39 matières de surface supplémentaires peuvent être sélectionnées ; les trois identifiants V113 déjà sélectionnables restent compatibles. Un masque spécifique, une ligature isolée et la version Shatter archivée ne deviennent pas de faux revêtements de corps.
- Les nouveaux choix utilisent les **chemins V85 existants**, pas des copies vers V114. Les 3 anciens PNG V113 restent pour la compatibilité des sauvegardes.
- Sauvegardes : stockage limité aux IDs enregistrés, toujours isolé par propriétaire de campagne ; pas d'URL issue d'une sauvegarde dans CSS ou Canvas.
- Lore : le comptoir chromatique relève de l'artisanat et d'une étude des chromatophores (interprétation originale), et **non d'un éditeur instantané de gènes confirmé par les films**.
- Fidélité : ce sont des **reconstitutions planes inspirées par PHG**, pas des textures UV officielles, ni des plaques exactes vérifiées 1:1. Aucun nouveau sprite anatomique ou mouvement n'est certifié par cet inventaire.

Les lieux physiques Homeworld et le rendu du chasseur V113 sont conservés. À vérifier après cette synchronisation : couleurs des six morphologies dans l'aperçu, rendu Homeworld et chasse Canvas, gradients/mélanges et cohérence avec les références film/PHG.

Commandes : `python3 scripts/validate-phg-materials-v113.py` ; `node --experimental-strip-types --test tests/hunter-chromatics-v113.test.mjs tests/hunter-chromatic-canvas-v113.test.mjs tests/hunter-chromatics-native-v114.test.mjs`.

Les PR #24 et #25 sont deux branches distinctes. Ne pas déduire de leur mergeabilité séparée l'absence de conflits lors de leur **intégration mutuelle**.

## Correctif du rendu et usage du teinturier

V114 restitue le grade de base des plaques cutanées et métalliques dans la chasse Canvas **avant** la mise en couleur. Le filtre d'origine est dans la clé du cache ; modifier la teinte ne détruit pas les détails morphologiques sous-jacents. La prévisualisation du poste est désormais locale et immédiate ; seule l'action « Valider » passe par la sauvegarde propriétaire avec lecture de contrôle. Les matières du registre sont présentées avec leur vignette et un avertissement explicite sur la fidélité.

Ce correctif ne certifie ni le rendu alpha/motif aux raccords des membres ni un équivalent officiel des shaders de PHG ; une inspection visuelle et des tests de jeu réels restent nécessaires.

## QA de la première compilation sur CI
Le premier job V114 (commit `ce6b5e25`) confirme l'intégrité exacte des 44 PNG. Deux contrôles JavaScript ont d'abord échoué : import de module sans extension `.ts` sous Node 22 et assertion historique restreinte au seul chemin V113. Le test est désormais adapté aux deux racines enregistrées tout en refusant les URL arbitraires. La compilation et la nouvelle exécution doivent être contrôlées sur la tête suivante ; ne pas réattribuer une CI verte à `ce6b5e25`.

## Même armure sur Homeworld
La version modulaire du chasseur sur Homeworld utilise désormais les 14 plaques V3 déjà enregistrées, en sélectionnant la famille d'armure et le niveau d'équipement de la sauvegarde, y compris l'absence de bracer quand les wristblades sont portées. Les textures et filtres de patine emploient le même canal que le rig d'aperçu. Les sprites de prévisualisation de morphologie restent volontairement sans armure. La scène de ville est un composé **au repos** ; ses animations corporelles ne sont pas prétendues équivalentes au système articulé de chasse.

## V115 — Nuanciers accessibles sans modifier les références

Chaque atelier chromatique propose désormais cinq nuances originales, avec un bouton nommé et un échantillon de couleur sélectionnable au clavier, tactile ou à la manette via la navigation d'interface existante. Le sélecteur libre, les matières PNG enregistrées et le retour à la couleur naturelle restent disponibles. Les vingt teintes prédéfinies suivent le schéma de sauvegarde V113 existant : aucune migration ou attribution d'objet n'est nécessaire. Elles ne sont **pas** des noms de peinture officiels de *Predator: Hunting Grounds*. Les tests vérifient leur validité, leur unicité par canal et l'absence de changement implicite des matières enregistrées.

Le workflow de référence V114 [41046162523](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41046162523) est vert sur le parent `3040fcaa`. Ce résultat ne certifie pas encore ce nouveau commit ni l'apparence artistique de chaque couleur dans les six morphologies.

## Correction lint React et cycle de vie du brouillon
Le composant de personnalisation est remonté avec une clé dérivée de l'état chromatique réellement sauvegardé ; il ne modifie plus son état interne depuis un effet synchrone. Les aperçus de travail restent éphémères, et la réouverture d'une campagne relit la source durable. Ceci supprime l'erreur `react-hooks/set-state-in-effect` sans désactiver la règle.

## V115 — Trois lieux spécialisés
L'Atelier des parures déjà localisé dans les Forges propose maintenant les matières de dreadlocks, vêtement et armure. La Maison des soins conserve son point physique `medbay-service`, mais possède un accès distinct à l'étude pigmentaire (peau uniquement). Le quartier du chasseur dans le vaisseau affiche les quatre canaux pour la préparation personnelle. Le bouton « matières de ce poste » remet à zéro **uniquement** les canaux autorisés sur le lieu actif. Tous réutilisent la même sauvegarde `chromaticsV113`, avec la validation propriétaire de la PR #27. Les positions des services et l'accessibilité des rangs ne sont pas modifiées.

## V115 — Migration des trois anciens champs PR #25
Les valeurs `skinMaterialId`, `dreadMaterialId` et `outfitMaterialId` précédemment stockées à la racine de `appearance` sont lues et converties une seule fois vers `chromaticsV113` à la normalisation, sans générer d'URL externes. Les 5 palettes de peau, 4 de dreadlocks et 4 de patine de #25 sont converties en hex RGBA standards, en conservant les options actuelles. Une valeur explicitement présente dans la structure moderne est prioritaire, même si elle vaut `null`. Un filet existant et les références Samurai/Shatter utilisent leurs identifiants V113 compatibles ; accessoires et valeurs inconnues restent neutres. Les anciens noms de champs ne sont jamais resauvegardés ; un preset film modifié est marqué `custom`.
