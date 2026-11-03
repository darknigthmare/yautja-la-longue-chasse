# Contrat d'import des animations Expédition — V36

Ce lot ajoute un validateur pur de métadonnées. Il ne remplace pas le dessin par membres actuellement utilisé par `HuntCanvas`, ne génère aucune image et n'ajoute aucun clip jouable. La couverture conforme au nouveau contrat reste **0**.

La source est la conversation [Lister les animations sprites](https://chatgpt.com/c/6aa8031b-aad4-83eb-86ae-7173d8dd3e92), correction du tour `119d3724-c7f3-4ed4-8e85-abdc724bdbfa`, récupérée le 19 septembre 2026. L'utilisateur demande explicitement la séparation du masque, caster, gantelets et dreadlocks pour leur personnalisation. La réponse corrige l'ancienne recommandation de fusionner l'équipement au corps. Le détail intégral du catalogue de production n'a pas été obtenu : la première réponse est tronquée après le lot 45 et les deux documents corrigés restent des références de fichier non résolues.

## API et portée

`validateExpeditionAnimationImport(value: unknown)` dans `app/game/systems/expeditionAnimationContract.ts` retourne :

```ts
{
  valid: boolean;
  issues: readonly { path: string; code: string }[];
  declaredClipCount: number;
  conformingRuntimeClipCount: 0;
}
```

La fonction ne charge pas les fichiers, ne dessine rien, ne modifie pas l'entrée et n'exécute aucun événement. `valid` signifie seulement « conforme aux déclarations du contrat ». Il ne certifie ni l'anatomie réelle des pixels, ni la présence des PNG, ni leur SHA réel, ni la fluidité ou l'absence de défaut visuel. Les sources doivent encore être décodées, comparées à leurs empreintes, inspectées image par image puis testées dans un renderer adapté.

`EXPEDITION_ANIMATION_SOURCE_BUDGET` conserve séparément les **50 lots / 517 entrées annoncés** (516 séquences et une pose finale). `completeIdCatalogueRecovered:false` interdit de présenter cela comme un catalogue de 517 IDs réellement récupéré. Ce budget n'est ni une contrainte minimale d'import, ni une preuve de couverture, ni la cadence de simulation. Les clips de The PIT ne sont pas comptabilisés.

## Corps, sources et orientations

Chaque source a un ID, un chemin local public `/game/...png` ou `.webp`, une empreinte SHA-256, des dimensions et une orientation native explicite. Les rectangles ne peuvent sortir de leur source ; les références de type corps, équipement et masque d'occultation sont distinctes. Aucun miroir implicite n'est autorisé.

Le corps est déclaré `whole-anatomy` avec tête, mandibules, torse, deux bras, deux mains, deux jambes et deux pieds. `fusedEquipment` doit être vide. Un rig par membres, une anatomie incomplète ou un masque/coiffure/armure fusionné est rejeté. Cette déclaration doit ensuite faire l'objet d'une inspection visuelle : une métadonnée correcte ne peut garantir une main correctement dessinée.

Les dix familles personnalisables sont : biomask, plasma caster, gantelet de commande, gantelet armé, dreadlocks, armures, harnais/filet, objets manipulés, trophées et effets. Un import partiel peut n'utiliser qu'une famille ; il n'est pas présenté comme un personnage complet.

Une coiffure utilise un dessin de style entier, ou une paire complémentaire de passes avant/arrière du même style. Une mèche clonée, deux copies de la même passe ou une demi-coiffure seule sont rejetées. Les autres ressources sont des pièces séparées. Les pièces physiques distinctes d'un mécanisme — support et canon, boîtier/couvercle/affichage, gantelet/lames — reçoivent des IDs de pièce distincts et stables ; le même disque ne doit jamais obtenir un nouvel ID simplement parce qu'il est rangé ou lancé.

## Attaches et occultation par pose

Chaque frame corporelle fournit les points visage, racines des dreadlocks, épaules, poignets, mains, ceinture, dos et torse, avec coordonnées et rotation finies. Les coordonnées sont locales à la pose. Les repères inutilisés restent explicitement présents pour éviter d'emprunter silencieusement une attache d'une autre image.

Chaque équipement placé possède un état d'occultation explicite : `none`, ou une source `occlusion-mask` avec rectangle valide. Le futur renderer doit composer cette occultation sans découper l'anatomie en membres animés indépendants. `none` est une déclaration à vérifier visuellement, pas une garantie que la main passe bien devant l'objet.

La position `world` appartient à l'objet réellement déployé dans le monde ; sa transformation doit venir de l'état de gameplay. Les autres positions se rapportent aux attaches de la frame courante. Le validateur ne simule aucune trajectoire.

## Possession et synchronisation

La table `ownership` impose une seule localisation par ID d'objet physique pour chaque pose : visage, main, rangement, monde ou absent. Tous les dessins de cet objet doivent correspondre à cette localisation et à sa famille, conservée sur le clip. Un objet déclaré absent ne peut être dessiné. Un objet présent ne peut être omis ni dessiné deux fois ; seule la paire entière avant/arrière d'une coiffure fait exception.

Cela rejette un disque simultanément dans la main, en vol et à la ceinture. La même règle sert au masque déplacé du visage vers la main puis le rangement. Elle exige des identifiants physiques stables ; le validateur de métadonnées ne peut reconnaître deux IDs frauduleusement affectés au même objet réel. Le futur branchement devra également vérifier ces IDs contre l'inventaire autoritaire.

`bodyClock:"gameplay"` et `equipmentClock:"independent"` sont obligatoires. Le tir du caster ne doit pas redémarrer la course. Les cues référencent des événements de gameplay ; leur liste `effects` est toujours vide. Ils n'émettent pas de projectile, de guérison, de consommation de munition ou de verrouillage du personnage. La validation ne prouve pas encore que chaque événement référencé existe : cette liaison sera vérifiée lors de l'intégration au moteur.

## Vérification et suite requise

Les tests couvrent données malformées, corps incomplet, équipement fusionné, orientations, bornes, attaches, occultation, duplication main/vol/rangement, absence d'objet, coiffure avant/arrière, effet de gameplay interdit et stabilité des familles d'objets. Les fixtures sont exclusivement synthétiques et ne sont pas des assets livrés.

Reste à réaliser : récupérer les catalogues corrigés et leurs IDs, générer/importer les vrais dessins, vérifier leurs pixels/empreintes/alpha, créer le laboratoire Expédition et raccorder le renderer, l'inventaire et les événements sans modifier les atlas The PIT validés. Aucun de ces travaux n'est déclaré terminé par ce contrat.

## Auditeur de fichiers en ligne de commande

Depuis la racine du dépôt :

```sh
node --experimental-strip-types scripts/audit-expedition-animation-import.mjs chemin/manifest.json
```

Le script commence par la validation des métadonnées. Si elles sont recevables, il résout chaque source sous `public`, vérifie que sa destination réelle reste dans le workspace, lit ses octets et compare SHA-256, largeur et hauteur. Les corps et équipements doivent posséder un canal alpha avec des pixels visibles et d'autres non opaques ; une image entièrement opaque ou entièrement transparente est rejetée. Les masques d'occultation ont leurs fichiers, empreintes et dimensions contrôlés ; leur sémantique visuelle reste à examiner.

La sortie JSON contient `checkedAssets`, les problèmes par source, `visualReviewRequired:true` et toujours `conformingRuntimeClipCount:0`. Code de sortie : **0** pour un audit de fichiers réussi, **1** en cas de rejet ou erreur de lecture, **2** pour un usage incorrect. Aucun registre, fichier image, sauvegarde ou manifeste n'est modifié. Un succès ne certifie pas l'anatomie, le bon détourage, les contacts au sol, la qualité de l'occultation ni l'intégration au renderer.

Les garde-fous limitent le manifeste à 8 MiB, chaque fichier source à 64 MiB et le décodage à 64 millions de pixels. Un rejet de métadonnées empêche les lectures d'images. Les sources attendues ne sont pas téléchargées automatiquement.

Les tests CLI utilisent les octets exacts du script et du contrat dans une racine synthétique temporaire sous `work`, avec quelques PNG de 16 × 16 pixels. Aucun de ces fichiers de test n'entre dans `public/game` du vrai projet ni dans une livraison artistique. Le nettoyage vérifie le chemin réel, sa parenté et son préfixe avant toute suppression récursive. Ces tests couvrent fichier absent, empreinte erronée, dimensions incorrectes, RGB opaque, RGBA opaque ou vide, métadonnées invalides, JSON malformé et succès sans modification ni attribution de clip runtime.
