# Incursions de la triade et insertion par vaisseau posé

## Objectif et continuité

Extension demandée pendant la reprise de la discussion « Reprise des cinématiques auditées », dans la PR [#114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114). La version applicative passe à **1.5.0**. Le premier lot audiovisuel capsule/solo reste documenté dans `production/planet-arrival-completion-20261105/`, avec son propre commit de validation `c1266f07182c355dd670b321d767a3ea6d9140d5`.

La triade de campagne est **le chasseur du joueur, Ka’rhek et Sa’keth**. Le recrutement et l'affectation sont des actions du joueur. L'accès utilise le rite Blooded effectivement enregistré dans la chronique pour les nouvelles campagnes ; les anciennes campagnes adultes conservent leur accès existant. L'honneur ou un rang affiché ne remplacent pas le rite. Les compagnons du tutoriel et les preuves narratives antérieures ne sont pas transformés en recrutement de cette triade.

## Choix de départ et contreparties

Le briefing comporte un panneau « Choisir l'approche », avec deux choix indépendants : moyen d'insertion et équipe. Les valeurs ci-dessous sont des règles d'équilibrage du jeu.

| Insertion | Équipe | Ennemis supplémentaires au maximum | Recherche initiale | Suspicion initiale interne |
| --- | --- | ---: | ---: | ---: |
| Capsule | Solo | 0 | 0 s | 0 |
| Capsule | Trio | 1 | 10 s | 0,18 |
| Vaisseau posé | Solo | 3 | 35 s | 0,64 |
| Vaisseau posé | Trio | 4 | 35 s | 0,72 |

La suspicion est un état de l'IA, pas une probabilité de détection. Les ennemis habituels restent présents dans les quatre cas. Le nombre supplémentaire est un plafond : un emplacement dangereux, occupé ou trop proche d'un autre patrouilleur est écarté. Les renforts utilisent les espèces du véritable secteur, des identifiants déterministes et des positions éloignées du point de sortie des chasseurs.

Les ennemis alertés connaissent le point d'insertion. Leur recherche initiale vise cette position fixe ; les perceptions effectives prennent ensuite le relais. La position actuelle du joueur n'est pas transmise par une alerte permanente. Quitter le secteur et rompre la ligne de vue ont donc un effet réel.

Le trio est recommandé pour les missions **fungal-hivemind**, **ruins-ancient-guardian** et **volcano-bad-blood**, tout en restant facultatif. Le choix solo reste accessible. Les épreuves solo des parcours narratifs conservent leurs propres contrats.

## Préparation, commandes et retour

Ka’rhek et Sa’keth doivent être recrutés, affectés à la coque sélectionnée et aptes au départ. Changer d'affectation ne soigne pas un compagnon et ne rapatrie pas un membre laissé sur place.

En mission, chacun possède un corps, une santé et un état propre. Le déplacement utilise le solveur de collision du terrain. Les ordres permettent de suivre le joueur ou de tenir la position. Le soutien contre les ennemis réguliers respecte la portée, la ligne de vue et un temps entre les frappes. Les projectiles et les dangers du monde peuvent blesser les compagnons.

La stabilisation exige la proximité, une ligne libre, un joueur au sol et **une véritable charge de médicomp**. Le stock permanent ne contient pas de médicomps achetables : les soins de campagne utilisent donc les marques existantes du clan.

L'extraction vérifie la présence physique des compagnons à la balise avant l'embarquement. Le bilan distingue les évacués, les blessés évacués et ceux laissés sur le terrain. L'abandon d'un compagnon à l'extraction est une action explicite. La sauvegarde de ces conséquences est intégrée à la même transaction que le résultat de mission, avec l'identifiant de la session réellement terminée.

| État après la chasse | Préparation du départ suivant |
| --- | --- |
| Évacué sans blessure | Disponible sur sa coque d'affectation. |
| Évacué blessé | Soins à bord : 20 marques. |
| Laissé sur le terrain | Rapatriement du clan : 60 marques ; puis soins à bord : 20 marques. |

Le rapatriement est un service de campagne payé, pas une mission de sauvetage jouée ni une nouvelle preuve de victoire. Les coûts sont centralisés dans `EXPEDITION_CARE_COST`. Aucune action ne débite le solde ou n'annonce son succès avant confirmation de la sauvegarde.

Le service exige l'état affiché au moment de la demande : un double clic de rapatriement ne paie pas automatiquement les soins suivants.

## Cinématique et raccord au gameplay

La durée reste **62 secondes**, sur le même plateau de référence 1280 × 720 et avec les huit destinations existantes.

- **Capsule solo** : conservation de la sortie auditée, de son seuil et de ses appuis.
- **Capsules en trio** : trois capsules, trois sorties décalées de 0/250/500 ms, puis jonction sur les points réels de départ. Les centres des compagnons sont décalés de +160 et +320 unités par rapport à celui du joueur.
- **Vaisseau posé** : la coque sélectionnée poursuit son approche, entre dans l'atmosphère, freine et se pose. Les chasseurs débarquent depuis le point de sortie enregistré. La même coque reste affichée au sol dans la chasse, avec la même géométrie.

Les rigs de Ka’rhek et Sa’keth sont des compositions modulaires propres au projet : apparence `custom`, teintes et pièces distinctes. Les helpers d'apparence, d'équipement, de taille et d'espacement sont communs à la cinématique et à la simulation. La hauteur des compagnons est de 112 unités, celle du joueur de 116.

Les vaisseaux-mères, porte-vaisseaux, flottes et capsules individuelles restent hors du choix d'atterrissage personnel. Le catalogue complet reste disponible pour ses usages existants.

### Appuis de coque

Les points sont mesurés dans la source exacte renvoyée par `shipProfileAssetPath`, alpha compris. La composante principale de la silhouette, avec alpha d'au moins 192/255 et un appui contigu d'au moins trois pixels, fixe le contact inférieur. Le point de sortie reprend le repère de composition déjà inspecté. Pour `predator-dropship`, ce repère a été borné d'un pixel source au contact, afin de ne pas sortir sous le sol.

Les [coordonnées](ship-ground-calibration.json), les [empreintes et mesures](ship-ground-calibration-evidence.json) et cinq planches sources sont conservées. Les deux variantes de capsule individuelle figurent encore parmi les sources inspectées, mais sont exclues du mode vaisseau posé.

Il s'agit d'appuis de silhouette et de repères de composition. Une dérive basse peut constituer l'appui visible ; ces mesures ne prétendent pas établir des trains d'atterrissage, portes, rampes ou dimensions canoniques absents des références.

### Audio

Le mode vaisseau dispose de sons de réacteur, d'une réduction de régime pendant le freinage, d'un contact léger au sol à 53,960 s, puis d'un signal de débarquement et des pas liés aux appuis. Les sons de largage, impact de capsule, vapeur et débris ne sont pas réutilisés sur cette branche.

Les événements du trio suivent les trois séquences décalées. Pause, rechargement, mouvement réduit, désactivation audio et passage de la séquence gardent les protections contre les sons périmés. Les sons sont des créations synthétiques du projet.

## Persistance et validation

Le plan est figé dans `planetArrival.insertion` et `planetArrivalRun.configuration.insertion`, avec la coque dans `configuration.insertionShipId`. Le contrôle de transition refuse un changement de plan entre briefing, checkpoint, fin de cinématique et reprise de chasse.

Les instantanés du runtime conservent les patrouilles déjà créées, l'alerte et les deux compagnons. La reprise ne rejoue pas l'insertion. Un renouvellement de l'identifiant de session par la sauvegarde active conserve le monde restauré et utilise le nouvel identifiant pour le bilan final.

Une archive ancienne sans plan reste une arrivée capsule/solo. L'absence de registre ne crée aucun compagnon. Les registres d'un autre propriétaire, versions futures ou données malformées sont refusés avant de remplacer la campagne. Un résultat répété ne soigne ni ne perd une seconde fois le même groupe.

Les suites dédiées sont `planet-insertion.test.mjs`, `hunt-insertion.test.mjs`, les suites spatiales/présentation/audio et les régressions de sauvegarde, d'archives et de voyage développeur. La recette navigateur exerce le vrai panneau de briefing, le passage de la cinématique, les quatre variantes et le raccord à HuntCanvas. Les comptes et les SHA réellement testés sont consignés dans `verification/` après exécution.

La revue indépendante a reproduit puis fait corriger quatre cas : coup à travers un couvert opaque, transfert d'une attaque annoncée vers le joueur après perte du compagnon visé, immobilisation dans la lave finale et faux embarquement injecté dans un checkpoint. Les 25 tests moteur comprennent ces régressions et les vrais round-trips d'embarquement/départ. Les essais de déplacement utilisent le monde réellement transformé par `applyExplorationWorld`, et pas seulement son blueprint brut.

L'escorte reste une navigation locale guidée : elle n'atteste pas une recherche autonome de chemin pour toutes les combinaisons d'étages. Un passage impraticable est annoncé et peut nécessiter une autre approche du joueur.

Des harness historiques ont également été remis en cohérence avec les fonctions de production : départ via cinématique au lieu d'un montage direct, dépendances réelles de sauvegarde/extraction, reprise du Guardian et quatre routes de monde au lieu de trois. Les preuves avant/après pour les deux derniers sont dans `verification/test-harness-repairs/`. La base locale `44ac0d0bb` partage l'arbre `5867e515f4dc3132c5ea3ef03c97834eee9f544b` avec le commit distant `c1266f07182c355dd670b321d767a3ea6d9140d5` ; aucune géométrie de monde n'a été changée pour adapter ces tests.

### Accès de recette

Dans `/dev`, les huit destinations `arrival-<mission>` restent les parcours historiques. Trois destinations supplémentaires permettent de cibler l'extension :

- `arrival-ship-jungle-vey` : vaisseau, solo ;
- `arrival-triad-jungle-vey` : capsules, trio ;
- `arrival-ship-triad-jungle-vey` : vaisseau, trio.

La fidélité 1:1 à la discussion reste la règle de continuité. La validation technique mesure le rendu, les appuis, les mouvements, les événements et les conséquences jouables ; la comparaison artistique humaine avec chaque référence et l'écoute finale du mix restent des étapes de revue distinctes.
