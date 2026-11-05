# Arrivées planétaires — compléments audiovisuels et sortie de capsule

## Reprise exacte

Ce lot poursuit la PR [#114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114), sur `fix/cinematic-spatial-audit-20261105`. Il reprend les modifications audiovisuelles restées locales à la fin de la discussion « Reprise des cinématiques auditées ». Le correctif spatial déjà publié à `cd586a976` reste conservé. Les dernières opérations du Clan Ship et leurs preuves ont été reprises depuis `main` à `23b48e127` sans réinitialiser le travail.

La version applicative de ce lot est **1.4.1**. Le contrat de sauvegarde, les huit destinations, les identités des vaisseaux et la durée de 62 secondes sont conservés. Les preuves historiques demeurent dans `production/planet-arrival-spatial-20261105/` ; elles ne sont pas réattribuées aux nouveaux éléments.

## Contenu intégré

| Élément | Intégration |
| --- | --- |
| Porte extérieure | Nouveau panneau indépendant adapté à l'ouverture existante, charnière supérieure fixe. |
| Face intérieure | Image distincte, face arrière du même panneau ; original généré conservé et export enregistré sur le cadre du panneau. |
| Vapeur dense et dissipée | Deux images indépendantes, fondu entre phases autour des deux joints d'émission ; aucune horloge CSS indépendante. |
| Fragment d'impact | Une pièce indépendante, neuf trajectoires balistiques déterministes et arrêt de la rotation au contact du sol. |
| Poudre de glace | Ressource produite lors de la discussion précédente, retrouvée puis intégrée pour la planète glacée. |
| Projection d'eau | Ressource antérieure retrouvée puis intégrée pour les décors humides d'océan et de marais. |
| Éclairage | Teintes des huit biomes, lumière de scène appliquée dans l'alpha des sprites, compensation de la rotation et du miroir des coques, chaleur au nez pendant la rentrée, lumière de cabine et contact local. |
| Sortie du chasseur | Départ sur le seuil surélevé mesuré dans le sprite, occultation par l'ouverture, franchissement et descente avant la marche jusqu'au point réel de départ. |
| Sons | Dépressurisation, contact de capsule, retombées des fragments, réception et pas du chasseur ; matière sèche, glace ou milieu humide ; événements liés à la même horloge que les mouvements. |

Les sept ressources consommées disposent chacune d'un PNG et d'un WebP. Le PNG brut de génération de la face intérieure est conservé en plus de son export enregistré. Il n'y a pas de planche de sprites à découper. Les prompts et références d'entrée sont dans [generation-prompts.json](generation-prompts.json), les empreintes, tailles, pivots et vérifications alpha dans [asset-audit.json](asset-audit.json).

Les sources des vaisseaux et de la capsule V1 ne sont pas remplacées. Les deux effets de terrain restent des matières visuelles de contact, pas de nouvelles affirmations sur l'équipement canonique Yautja.

## Contrats observables

- Le plateau 1280 × 720 est adapté uniformément ; les caméras, les pieds, les jets, les sillages, les évents et les ombres utilisent leurs coordonnées communes.
- La porte présente une seule face à la fois. Son axe ne se déplace pas lors de l'ouverture.
- Le chasseur quitte le seuil à 58,8 s et reçoit son premier appui au sol à 59,3 s. Il termine à 61,25 s, au point de départ déjà défini par la mission. Les changements d'appui sont distincts de la projection de la caméra.
- La pause arrête les mouvements, l'évolution des effets et la consommation sonore. Reprise, mode mouvement réduit, arrêt audio et saut de séquence préservent les règles de consommation sans rafale de sons périmés.
- Glace, eau et poussière sont sélectionnées par le biome réel ; la liste de préchargement comprend les deux faces de porte et toutes les pièces nécessaires.

## Vérification

Les contrôles techniques, les tests comportementaux, la construction et la recette navigateur sont consignés séparément dans le dossier `verification/` de ce lot. Un succès TypeScript ne remplace pas le parcours animé. Les rapports navigateur conservent le commit testé, les empreintes de source, les instants effectivement capturés et les ressources demandées.

Les deux problèmes de la recette précédente et leur correction sont expliqués dans [qa-recipe-notes.md](qa-recipe-notes.md) : attendre la sortie du vrai briefing avant de recommencer, puis matérialiser les seize ressources réelles nécessaires au secteur de chasse utilisé en CI. Aucune assertion de ressource manquante n'est supprimée.

Commandes ciblées :

```bash
node production/planet-arrival-completion-20261105/audit-assets.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/planet-arrival*.test.mjs tests/scene-audio.test.mjs
npm run typecheck
npm run build:production
ARRIVAL_SPATIAL_START_SERVER=1 node scripts/qa-planet-arrival-spatial.mjs
```

L'accès de recette passe par `/dev`, catégorie Arrivées, puis la destination choisie. La séquence doit rejoindre la chasse réelle, et les commandes pause, reprise, recommencer et passer restent exercées. Le démarrage de Chromium est interdit dans l'exécuteur local par sa politique de sockets ; les captures de ce lot sont donc produites par le workflow du dépôt, sans modification de cette politique.

## Fidélité et points de revue encore ouverts

La fidélité 1:1 reste l'objectif, pas une attestation déduite des tests. Les géométries de baie du catalogue, les surfaces et les mécanismes non montrés dans les références restent des adaptations identifiées du projet. La comparaison artistique humaine avec les plans du film et l'écoute du mixage final restent ouvertes. Les halos et émissions déjà inclus dans les textures V1 ne sont pas devenus de véritables couches d'émission séparées par l'ajout du masque d'éclairage.

Ce lot ne certifie donc ni une reproduction image par image de Predator (1987), ni une simulation physique de matériaux 3D. Les résultats vérifiables sont la continuité de mouvement, les attaches, les appuis, les ressources présentes, la synchronisation des événements et le rendu observé sur les configurations précisées par les preuves.
