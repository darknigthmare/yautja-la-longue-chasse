# The PIT — lot 3 du 27 novembre 2026

## État de livraison

La [PR #195](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/195) contient désormais la reprise applicative du lot précédent et le catalogue original **Les Masques Brisés**, accompagné de quinze PNG natifs.

Le transfert final des nouveaux raccordements de précision, de la consultation de l’extension et de leurs preuves a été interrompu par l’indisponibilité de l’environnement d’exécution. Ces fichiers avaient été écrits et vérifiés dans le workspace avant la panne ; ils ne sont pas assimilés au contenu publié de la branche. Aucun build global, déploiement, fusion, animation native complète ou certificat artistique 1:1 n’est annoncé.

### Publication vérifiée

| Lot | Commit distant | Arbre vérifié |
| --- | --- | --- |
| Reprise riposte, galerie, consultation Greyback et preuves, 54 fichiers | `bb0e24d3e1daa652a8ce8bfaa847a765bca2f96a` | `3e84588bc415c5faed31ce89f108f08793985a29` |
| Catalogue Les Masques Brisés, quinze PNG et provenance des quatre scènes, 44 entrées | `7e4dfad77ae74d1dcd4e7c06a452c59e6db6c4db` | `4a20673f7029ed832cfa4e45069da4d206a2ff45` |

Le second lot est un descendant du premier. Il n’inclut pas le raccordement de précision ni la nouvelle route de consultation. Les prompts des onze acteurs et de la tentative Vigie sont conservés dans le complément documentaire qui contient ce point de reprise.

La branche est `codex/the-pit-combat-bible-extensions-20261127`. Au dernier examen, GitHub affichait `mergeable: false` et `mergeable_state: dirty`, bien que sa liste de commits montre une chaîne directe depuis la base `2769b094862aea97f10fc0e5c4f1154489a8a8bc`. Aucune résolution de conflit n’a été inventée à partir de ce seul indicateur ; le statut devra être revérifié après publication finale.

## Extension originale publiée

La [bible de l’extension](LES_MASQUES_BRISES_V1.md) et son [document structuré](../../content/the-pit/les-masques-brises/extension.v1.json) contiennent :

- **10 combattants** : Silex, Cendre, Brisecroc, Vigie, Éclat, Rempart, Suture, Sillage, Balafre et Herse.
- **20 stages, 20 ennemis et 20 boss**.
- **5 actes de 4 étapes**, 20 accessoires et 10 projectiles.
- **30 spéciaux, 10 supers et 60 phases de boss**.
- Identité visuelle, silhouettes, motifs personnels, introductions, provocations, victoires, rivalités, conclusions, contre-jeu, récompenses et besoins de production.

Le contrôle des données a relevé **225 identifiants de définition uniques**, des références résolues et des relations réciproques cohérentes. Les deux fichiers publiés portent les blobs `70fd21041f9eb40b94a99606a4ec65f3eb1d9d6b` et `2de4d0a3415cb436eef44fe5c364274c62884a6d`.

L’intrigue suit des masques volés, des balises falsifiées et des chasseurs capturés. Elle traverse un dépôt pillé, une lune sèche, un estuaire, une lune gelée et un porteur renégat. Les individus, lieux et espèces sont des créations du projet, compatibles avec les références explicitées dans la bible. Ils ne sont pas déclarés officiels ou canoniques.

Les statuts restent `designed`, `runtimeIntegrated: false`, `playableVerified: false` et `officialReference: false`. Les 70 fiches principales ne représentent pas 70 contenus de combat déjà jouables. Les registres existants de 201 identités et 187 arènes ne sont pas augmentés par cette livraison.

## Production graphique réelle

| Catégorie | PNG reçus | Éléments |
| --- | ---: | --- |
| Combattants | 9 | Silex, Cendre, Brisecroc, Éclat, Rempart, Suture, Sillage, Balafre, Herse |
| Stages | 4 | Cour des masques, Quai des chasseurs, Ravin de cendre, Relais des pillards |
| Ennemis | 1 | Brouteur d’écaille |
| Boss | 1 | Treuil-Récolteur |
| **Total unique** | **15** | **35 578 265 octets** avant duplication de service |

Les originaux sont dans [art-source/the-pit/les-masques-brises-v1](../../art-source/the-pit/les-masques-brises-v1/) ; leurs copies de revue sont dans [public/game/review/the-pit/les-masques-brises-v1](../../public/game/review/the-pit/les-masques-brises-v1/). Les deux chemins d’un même PNG contiennent le même blob Git.

Les acteurs ont un canal alpha réel ; les scènes sont des composites RGB opaques. Les combattants sont des poses de base 1 024 × 1 536 ; l’ennemi et le boss ont un cadre 1 536 × 1 024. Les quatre scènes sont également en 1 536 × 1 024. Ces dimensions natives ne sont pas présentées comme du 4K.

La mesure locale en lecture seule a relevé de faibles halos alpha jusque sur certains bords ; au seuil alpha 32 aucune silhouette ne touche le cadre. Certaines marges sont étroites. Ces observations ne valent pas admission artistique : il reste les orientations, poses, transitions, armes détachables, VFX et raccords. Une scène composite ne fournit pas les couches de parallaxe, le sol de collision ou les dangers d’une arène jouable.

La génération de **Vigie** a été refusée sans sortie : requête `38bb7902-c590-42c0-af48-d7cd4ce55f31`. Son prompt et l’absence de fichier sont conservés dans le manifeste d’échec. Il reste donc au minimum une première illustration de combattant, seize scènes, dix-neuf ennemis et dix-neuf boss, puis la production des animations et des éléments séparés.

## Fidélité des personnages existants

Deux nouvelles tentatives ont utilisé des références exactes du projet :

- **Greyback démasqué** : requête `f12e19cd-ab0e-47cc-aed7-67ccdad1800d`, refusée sans PNG. Le [manifeste](../../art-source/the-pit/continuation-20261127-lot3/greyback-unmasked/manifest.json) est publié. Les cinq candidats du lot précédent demeurent disponibles.
- **City Hunter masqué**, variante `city-hunter-avec-casque-12136078fe` : requête `e5ee7f67-5541-4782-9d84-a5e5b1dedff1`, refusée sans PNG. Le manifeste, le prompt et la référence inspectée restent dans le lot local en attente de transfert.

Aucun nouveau PNG canonique ni clip 1:1 n’a été reçu dans ce lot. La référence City Hunter est une pièce de provenance existante, pas une création livrée. Les refus ont été consignés sans nouvelle tentative destinée à contourner le blocage.

## Gameplay développé et vérifié avant la panne

L’**épreuve de précision** est raccordée au vrai `PitCanvas` dans la copie locale. Son accès prévu est **THE PIT → Entraînement → sélection → Épreuve de précision**.

Elle utilise les projectiles existants de **Jungle Hunter et Scar, kits standard**, et demande quatre impacts réels. Elle alterne côtés et distances, distingue annonce, départ du tir, vol, impact et replacement, et compte les tirs prématurés, attaques incompatibles, mauvaises distances et tirs manqués. Le mode standard dure 45 secondes avec trois erreurs permises avant l’arrêt ; le timing accompagné dure 75 secondes avec une limite de cinq erreurs. Pause, perte de focus, reprise, nouvel essai et retour sont traités.

Les commandes sont la technique configurée (**U** par défaut), **RB** sur la manette standard et **TECH.** en tactile. Le record est local, distinct de la riposte, séparé par propriétaire et niveau d’aide, et conservé uniquement sur action explicite après réussite. Le duel final 1987 conserve son absence de canon ; les kits incompatibles affichent une raison d’indisponibilité.

Les nouveaux modules sont `pitPrecisionTrialV1.ts`, `pitPrecisionRecordsV1.ts` et `pitBonusSessionV2.ts`. Le raccordement touche `PitCanvas.tsx` et `PitBonusTrialPanelV1.tsx/.module.css`.

**Résultats observés avant l’interruption :**

| Contrôle | Résultat | Limite |
| --- | --- | --- |
| Reprise publiée du lot précédent | 78/78 tests ciblés | Périmètre de la reprise au commit bb0e24d |
| Précision et régression riposte | 22/22 tests | Onze précision et onze riposte |
| Précision dans Chromium | 10/10 contrôles | Vrai moteur et vraies entrées clavier/tactiles ; manette standard simulée |
| Lint ciblé précision | Code 0 | Modules, panneau, test et runner nommés |
| Consultation de l’extension, matrice initiale | 11/11 | Premier manifeste de treize images |
| Consultation, contrôle final | 6/6 | Quinze images et cadrage corrigé desktop/mobile |
| TypeScript strict et lint ciblés de la consultation | Code 0 | Sources finales du périmètre nommé |

Les preuves de précision sont dans `docs/the-pit/qa/precision-20261127/`. Celles de la consultation sont dans `docs/the-pit/qa/expansion-20261127/`. Les rapports et captures sont enregistrés localement ; leur transfert distant n’est pas annoncé comme terminé.

Une exécution cumulée de neuf suites, visant 89 tests uniques, avait été lancée avec sortie dans `docs/the-pit/qa/lot3-20261127/tests.txt`. L’environnement a disparu avant lecture de son résultat. **Cette exécution n’est pas validée** et son résultat ne doit pas être déduit des passages précédents.

## Consultation de l’extension développée localement

La nouvelle route `/pit-lab/expansion`, liée depuis `/pit-lab`, comprend six catégories, recherche sans distinction d’accents, filtre des illustrations, fiches détaillées, mouvements, phases, narration et références croisées, ainsi que les cinq actes de campagne. Les comptes sont issus du JSON ; les filtres illustrés donnent 9/4/1/1.

Le cadrage des portraits a été corrigé en CSS après l’inspection initiale puis revérifié sur ordinateur et mobile. Aucun pixel des PNG n’a été modifié. Les captures `*-final.png` montrent l’état final ; les captures `initial-*` documentent l’état antérieur.

Cette interface est un outil de consultation. Elle n’ajoute pas les créations aux combats et ne modifie aucune sauvegarde. Les tests utilisent les vrais composants React et Next Image/Link dans un serveur de composants esbuild ; ils ne constituent pas un build Next de production.

## Reprise exacte de la publication

Le workspace durable à reprendre est :

```text
/workspace/scratch/4a614cc94a38/yautja-the-pit
```

Son HEAD local est `c8c9ebc28a66166c20b5536c6ccdc3ce494fdca0`, dont l’arbre est identique au commit distant `bb0e24d3e1daa652a8ce8bfaa847a765bca2f96a`. La nouvelle branche distante contient ensuite les checkpoints artistiques. Ne pas réinitialiser la copie locale ni écraser ses modifications.

L’ancien workspace `/workspace/scratch/477f86aa7551/yautja-the-pit` conserve la reprise initiale. Ne pas le modifier. Des fichiers historiques inchangés sont liés matériellement ; les répertoires `docs/the-pit/` et `docs/qa/current-integration-20261103/` sont des copies privées. Les dépendances temporaires sous `/tmp` peuvent avoir disparu.

Les fichiers encore à transférer comprennent notamment :

- Les six nouveaux fichiers applicatifs : trois modules de précision et les trois fichiers de `app/pit-lab/expansion/`.
- Les quatre fichiers applicatifs modifiés : `PitCanvas.tsx`, le panneau de bonus TSX/CSS et `PitProductionAnimationLab.tsx`.
- Les deux runners `qa-pit-precision-trial-v1.mjs`, `qa-pit-expansion-v1.mjs`, le test de précision et le workflow CI adapté.
- La bible, la traçabilité, la fiche `BONUS_PRECISION_V1.md`, les manifestes d’art finaux, la revue artistique et les mesures.
- Les deux dossiers de preuves et la provenance City Hunter.

L’inventaire courant `docs/qa/current-integration-20261103/runtime-inputs.json` n’a pas encore été modifié pour ce lot. Il contient toujours 2 465 entrées et 1 117 122 731 octets d’inputs. Suivre le différentiel contrôlé documenté dans `RUNTIME_INVENTAIRE_20261127.json` : rehash des fichiers présents, conservation des empreintes absentes uniquement après identité Git mode/type/blob identique, comparaison exacte du périmètre app, et reçu séparé pour les nouveaux JSON/art.

Les générateurs V112/V113 s’arrêtent à `app/` pour la découverte des imports ; les données de l’extension sous `content/` ne sont pas automatiquement couvertes par ce périmètre historique. Les gels V111/V112/V113 doivent rester inchangés. Le contrôle CI strict n’a pas été affaibli.

Une fois l’environnement revenu : lire l’état Git et les preuves, terminer l’inventaire différentiel, contrôler les liens et l’espacement, créer un commit local immuable, comparer les blobs déjà publiés, transférer seulement le delta restant, vérifier l’égalité des arbres puis déplacer la branche avec une attente sur le SHA distant effectivement relu. Aucun résultat de test interrompu ne doit être promu en réussite.

## Travail de production encore ouvert

Le catalogue original est conçu et quinze premières images existent. Restent les autres illustrations, les animations natives, les orientations, les armes et projectiles séparés, les plans de décor, les collisions, le raccordement des kits et rencontres, leur équilibrage et leur validation jouée.

La reprise des manquants de la bible historique reste également ouverte : les refus de génération n’effacent pas la file de production ; tag, assistances, supers duo, finishers collectifs, clashes/QTE, autres bonus et autres parcours ne sont pas déclarés achevés par ce lot.

## Copies exactes de secours publiées

Quatre fichiers ont pu être récupérés depuis des patchs exacts conservés en mémoire, puis comparés aux SHA-256 observés pendant la QA de précision : les règles de précision, l’adaptateur des épreuves, le test de précision et le panneau de bonus. Ils sont conservés comme **copies inertes .txt** sous [recovery/precision-20261127](recovery/precision-20261127/).

Le [manifeste de récupération](recovery/precision-20261127/manifest.json) donne les chemins originaux, tailles, SHA-256 et blobs Git, ainsi que les sources finales encore manquantes. Ces copies n’ajoutent pas un raccordement partiel au runtime. Elles permettent de reprendre les octets vérifiés même si le workspace doit être restauré.
