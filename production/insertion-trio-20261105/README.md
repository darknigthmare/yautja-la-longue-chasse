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
| Vaisseau posé, approche camouflée | Solo | 1 | 18 s | 0,32 |
| Vaisseau posé, approche camouflée | Trio | 2 | 18 s | 0,40 |

La suspicion est un état de l'IA, pas une probabilité de détection. Les ennemis habituels restent présents dans les six cas. Le nombre supplémentaire est un plafond : un emplacement dangereux, occupé ou trop proche d'un autre patrouilleur est écarté. Les renforts utilisent les espèces du véritable secteur, des identifiants déterministes et des positions éloignées du point de sortie des chasseurs.

Les ennemis alertés connaissent le point d'insertion. Leur recherche initiale vise cette position fixe ; les perceptions effectives prennent ensuite le relais. La position actuelle du joueur n'est pas transmise par une alerte permanente. Quitter le secteur et rompre la ligne de vue ont donc un effet réel.

Le trio est recommandé pour les missions **fungal-hivemind**, **ruins-ancient-guardian** et **volcano-bad-blood**, tout en restant facultatif. Le choix solo reste accessible. Les épreuves solo des parcours narratifs conservent leurs propres contrats.

## Camouflage optique et réserve du vaisseau

À la demande suivante de l'utilisateur, le briefing permet d'activer le **camouflage optique du vaisseau avant la descente**. Le choix est optionnel et ne s'applique qu'à une insertion par vaisseau posé. Il atténue la signature visuelle ; les moteurs restent audibles et les patrouilles peuvent encore rechercher la zone d'arrivée. Le tableau ci-dessus donne les valeurs initiales d'équilibrage.

La campagne ne possédait pas de stock d'énergie de vaisseau exploitable pour cette action. Le nouveau budget est donc une **réserve auxiliaire par coque**, distincte de l'énergie personnelle du chasseur et des exercices historiques de carburant. Les paramètres sont centralisés dans `SHIP_INSERTION_ENERGY` :

| Règle de jeu | Valeur |
| --- | ---: |
| Capacité et dotation initiale du nouveau budget | 100 unités |
| Coût d'un cycle d'approche camouflée | 30 unités |
| Réserve minimale à conserver | 20 unités |
| Recharge à 100, payée au briefing | 20 marques du clan |

Deux cycles font passer une coque de 100 à 70 puis à 40. Le troisième est refusé tant qu'une recharge n'est pas confirmée ; une approche sans camouflage reste possible. Sélectionner une autre coque puis revenir ne recharge pas la première. La dotation initiale d'une coque sans registre est une règle de migration du nouveau budget, pas une preuve d'acquisition, une attribution de carburant ou une spécification canonique de son équipement.

Le débit et son reçu sont enregistrés dans **la même écriture de campagne que le départ et son plan figé**. Sélectionner la case ne consomme rien. Un départ refusé ou une écriture non confirmée n'accorde pas d'approche camouflée. Une fois l'approche engagée, passer, mettre en pause, recharger la partie ou reprendre la chasse ne débite pas une seconde fois. La réserve reste consommée après l'interruption de la chasse. La recharge débite ses marques seulement lorsque l'écriture est confirmée ; une demande répétée depuis un ancien solde est refusée.

`shipInsertionEnergy` est lié au propriétaire et conserve les réserves de chaque coque ainsi que les reçus récents de départ. `configuration.insertionEnergyRunId` conserve l'identifiant du départ payé, même si la reprise de chasse renouvelle son identifiant de session. Une arrivée camouflée sans reçu correspondant, un registre étranger ou une version future est refusé à l'import. Les anciennes sauvegardes sans ce champ gardent leur comportement et ne subissent aucun débit automatique.

Le rendu de la coque traduit le camouflage pendant l'approche, puis le coupe progressivement entre 52,3 et 53,3 secondes, avant le contact à 53,960 secondes. Le vaisseau garde ses dimensions, sa trajectoire et ses appuis. Ces réglages, coûts et effets sont des règles originales du projet ; ils n'ajoutent pas de nouveaux malus de bouclier, de propulsion ou de carburant non simulés.

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

L'approche camouflée ajoute une activation du champ à 100 ms et sa désactivation à 52,3 s, pendant une seconde. Le niveau sonore des moteurs reste identique à celui de l'approche visible. Les événements du champ ne sont pas multipliés par le nombre de chasseurs.

## Persistance et validation

Le plan est figé dans `planetArrival.insertion` et `planetArrivalRun.configuration.insertion`, avec la coque dans `configuration.insertionShipId`. Le contrôle de transition refuse un changement de plan entre briefing, checkpoint, fin de cinématique et reprise de chasse.

Les instantanés du runtime conservent les patrouilles déjà créées, l'alerte et les deux compagnons. La reprise ne rejoue pas l'insertion. Un renouvellement de l'identifiant de session par la sauvegarde active conserve le monde restauré et utilise le nouvel identifiant pour le bilan final.

Une archive ancienne sans plan reste une arrivée capsule/solo. L'absence de registre ne crée aucun compagnon. Les registres d'un autre propriétaire, versions futures ou données malformées sont refusés avant de remplacer la campagne. Un résultat répété ne soigne ni ne perd une seconde fois le même groupe.

Les suites dédiées sont `planet-insertion.test.mjs`, `ship-insertion-energy.test.mjs`, `hunt-insertion.test.mjs`, les suites spatiales/présentation/audio et les régressions de sauvegarde, d'archives et de voyage développeur. La recette navigateur couvre les quatre variantes initiales et ajoute le vaisseau camouflé en trio, le vrai panneau de briefing et le raccord à HuntCanvas. Les valeurs solo/trio du camouflage sont également exercées dans le moteur. Les comptes et les SHA réellement testés sont consignés dans `verification/` après exécution ; les captures antérieures au camouflage ne valident pas son rendu.

La revue indépendante a reproduit puis fait corriger quatre cas : coup à travers un couvert opaque, transfert d'une attaque annoncée vers le joueur après perte du compagnon visé, immobilisation dans la lave finale et faux embarquement injecté dans un checkpoint. Les 27 tests moteur comprennent ces régressions, le camouflage et les vrais round-trips d'embarquement/départ. Les essais de déplacement utilisent le monde réellement transformé par `applyExplorationWorld`, et pas seulement son blueprint brut.

La revue du nouveau budget a également reproduit un conflit de reprise après une écriture de départ incertaine. Le départ réconcilie désormais cette écriture avant de créer une nouvelle base. Les tests utilisent les vrais handlers et writers pour le refus avant écriture et pour une écriture effectuée dont la confirmation manque : la reprise aboutit avec 70 unités et un seul reçu. La recharge vérifie la coque affichée et le solde attendu pour refuser une demande devenue périmée.

L'escorte reste une navigation locale guidée : elle n'atteste pas une recherche autonome de chemin pour toutes les combinaisons d'étages. Un passage impraticable est annoncé et peut nécessiter une autre approche du joueur.

Des harness historiques ont également été remis en cohérence avec les fonctions de production : départ via cinématique au lieu d'un montage direct, dépendances réelles de sauvegarde/extraction, reprise du Guardian et quatre routes de monde au lieu de trois. Les preuves avant/après pour les deux derniers sont dans `verification/test-harness-repairs/`. La base locale `44ac0d0bb` partage l'arbre `5867e515f4dc3132c5ea3ef03c97834eee9f544b` avec le commit distant `c1266f07182c355dd670b321d767a3ea6d9140d5` ; aucune géométrie de monde n'a été changée pour adapter ces tests.

### Accès de recette

Dans `/dev`, les huit destinations `arrival-<mission>` restent les parcours historiques. Quatre destinations supplémentaires permettent de cibler l'extension :

- `arrival-ship-jungle-vey` : vaisseau, solo ;
- `arrival-triad-jungle-vey` : capsules, trio ;
- `arrival-ship-triad-jungle-vey` : vaisseau, trio.
- `arrival-ship-cloaked-triad-jungle-vey` : vaisseau camouflé, trio, avec un vrai reçu d'approche et une réserve de 70 dans la session temporaire.

La fidélité 1:1 à la discussion reste la règle de continuité. La validation technique mesure le rendu, les appuis, les mouvements, les événements et les conséquences jouables ; la comparaison artistique humaine avec chaque référence et l'écoute finale du mix restent des étapes de revue distinctes.

### Validation locale du lot camouflage

Le passage final réussit **397 tests dans 25 fichiers**, sans échec ni test ignoré. Il couvre l'arrivée, les effets sonores, les six plans d'insertion, le vrai moteur de chasse, l'énergie, les sauvegardes et archives, les reprises transactionnelles et les fixtures de voyage. Les contrôles historiques du gantelet et de persistance utilisent les fonctions réellement présentes. Le lint strict des 28 sources modifiées, `npm run typecheck` et `npm run build:production` réussissent.

Les commandes exactes, journaux, empreintes de sources et limites figurent dans [`verification/local-validation.json`](verification/local-validation.json). L'inventaire courant a été régénéré avec le générateur officiel puis vérifié de nouveau après la construction de production ; les preuves historiques restent distinctes. Ces contrôles locaux ne qualifiaient pas encore le nouveau shader ni les interactions navigateur ; les passages distants ci-dessous précisent les preuves obtenues. Le reçu [`browser-34f1387`](verification/browser-34f1387/receipt.json) conserve le passage antérieur : 56 contrôles spatiaux réussis sur 57, avec un sélecteur de commandes de triade corrigé dans le présent lot.

### Suivi des recettes sur `66f57a1`

Le premier passage distant du camouflage a validé les constructions, les modèles d'arrivée, le cycle de chasse V112 (12 contrôles), le guide de commandes (22 contrôles), l'inventaire courant et le parcours natif ClanWar. Les trois recettes d'arrivée se sont cependant arrêtées avant le camouflage : 7/8 contrôles spatiaux, 12/13 du parcours Wolf et 9/10 du voyage développeur.

Le [reçu de suivi](verification/qa-followup-66f57a1/receipt.json) conserve leurs sources, contrôles et digests d'artefacts. Il documente les corrections de recette : contexte de redimensionnement après départ du château, ciblage de la salle active, et séparation des mesures d'egress et de l'encodage PNG. Chaque photographie vérifie son état immédiatement avant et après la capture ; traverser un changement de plan, de phase optique, de contact ou la fin de la séquence invalide cette preuve. Les relectures partent des bornes natives des plans, avec l'horloge inchangée.

Le test historique V142 reçoit également les dépendances réelles du validateur et vérifie la capture du gantelet dans le run par son AST. Ses sept tests passent après correction, avec lint strict des quatre fichiers de recette modifiés. Ces corrections conservent toutes les sources applicatives de `66f57a1` et la portée des 397 tests du lot. Les premières images de `66f57a1` ne constituent pas une validation visuelle du nouveau champ optique ; les recettes corrigées doivent l'atteindre lors du passage suivant.

### Passage distant `4a0b8d5` et qualification restante

Le commit publié `4a0b8d58cdfadf642d6c897c32980b7a8586f4dd` conserve exactement les sources applicatives de `66f57a1`. Ses **17 workflows sont terminés : 15 réussis et 2 échecs de recette**. Le [reçu compact](verification/qa-followup-4a0b8d5/receipt.json) conserve les identifiants des exécutions, les tailles et digests des artefacts, les SHA des rapports et les [empreintes de sources recoupées avec Git](verification/qa-followup-4a0b8d5/source-hashes.json). Le checkout de fusion `a54ec1bec2b80e9d9ce229285ebb1ad92cf33864` possède le même arbre `9b64f036ca97247ef7a131566705df7e1c472325` ; il ne masque aucune différence de runtime.

| Recette | Contrôles réussis | Portée observée |
| --- | ---: | --- |
| [Wolf, château et arrivée](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42003800111) | **32/32** | Vrai recrutement, briefing camouflé, débit unique, reprise, handoff refusé puis confirmé, et chasse réelle. Une seconde campagne suit naturellement l'arrivée capsule/solo. |
| [Audit spatial](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42003800301) | **22/23** | Mesures desktop et sortie vaisseau/solo réussies. Photo finale des trois capsules refusée après franchissement de la fin native ; camouflage et mobile non atteints. |
| [Voyage développeur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42003800064) | **14/15** | Destinations, quatre plans explicites, identités payées, arrivée naturelle et chasse exécutées. L'entrée directe en salle des trophées rencontre un sélecteur visant aussi une copie masquée. |

Le [rapport Wolf intégral](verification/qa-followup-4a0b8d5/wolf-report.json) indique `4a0b8d5` comme source **et** checkout. La case de camouflage affiche 100 unités disponibles et prévoit 70 après approche ; le registre confirme ensuite **70 unités et un seul débit lié au run d'origine** à travers pause, menu, rechargement, refus du handoff, nouvelle tentative et reprise de chasse. Le checkpoint garde les deux compagnons, leurs 100/120 PV et une vraie patrouille `jungle-vey:0:insertion-patrol-0`, avec recherche initiale de 18 secondes. Les exceptions JavaScript et ressources manquantes sont absentes ; cette recette ne collecte pas séparément les erreurs console.

L'audit spatial a correctement refusé un cliché dont l'état était devenu `complete` après acquisition. Trois photographies desktop antérieures ont été inspectées sans overlay : marche vaisseau/solo, pose finale solo et marche capsules/trio. Le [reçu photographique](verification/qa-followup-4a0b8d5/spatial-captures.json) distingue leurs bornes de capture des mesures géométriques ultérieures. Il ne qualifie **ni la pose finale du trio ni les pixels du camouflage ni les variantes mobiles**. Les PNG restent dans l'artefact Actions ; aucune grande archive d'images n'est dupliquée ici.

Les [résultats associés](verification/qa-followup-4a0b8d5/related-ci.json) confirment les cinq jobs V94 réussis, dont l'inventaire courant à l'étape 67 et le vrai panneau ClanWar à l'étape 73. V131 et V136 sont verts, avec les sept tests V142 et quatre contrôles Chrome de reprise du gantelet dans une mission isolée. V112 réussit ses 12 contrôles de cycle de chasse et 22 contrôles de guide/commandes. La qualification V142 conserve explicitement sa portée isolée et son checkout graphique partiel.

Le correctif de recette suivant conserve le produit, les workflows et l'inventaire. Dev cible les régions réellement accessibles dans la session, le statut et la destination attendus ; deux copies actives restent un échec strict. Pour la fenêtre finale de 250 ms du trio, Spatial prépare un détail PNG à échelle native comprenant les trois rigs, leurs débordements, libellés et six repères de pieds/appuis, avec une marge de 20 pixels bornée au cadre et une photographie précédente donnant le contexte complet. Jusqu'à trois relectures natives peuvent acquérir ce détail : chaque cliché qui dépasse la fin est archivé comme rejeté, et toute autre erreur reste fatale. La formation et l'immobilité de la coque sont contrôlées sur chaque essai, accepté ou rejeté, avec le plan réellement demandé. Une photo acceptée exige toujours l'état `playing`, la même formation et le maintien de tous les rigs et appuis dans le cadrage avant et après acquisition, sans changement d'horloge ni de DOM.

La [validation locale de ces deux scripts](verification/qa-followup-4a0b8d5/local-validation.json) consigne syntaxe, lint strict, vérification du diff et empreintes. Le passage `1951e17` ci-dessous rapporte leur résultat navigateur ; aucun succès visuel du champ optique n'est déduit du seul passage Wolf.

### Passage distant `1951e17` : trois échecs conservés

Le commit `1951e17f01f1951d7c961b4ed3938741966e3007` termine ses **17 workflows : 14 réussis et 3 échecs**. Le [reçu compact](verification/qa-followup-1951e17/receipt.json) conserve les trois artefacts, leurs tailles, les digests ZIP vérifiés avant la coupure de l'environnement et les empreintes des rapports. Les [sources contrôlées](verification/qa-followup-1951e17/source-hashes.json) sont celles de ce passage exact. Le checkout de fusion `bdc195e77fa22a40b4918bd71dfb18f6fcdd2c6c` partage son arbre `4f6b3e4a785951286efbf0deafa29b843df40150`. Le produit reste identique à `4a0b8d5` et `66f57a1`.

| Recette | Contrôles réussis | Arrêt observé |
| --- | ---: | --- |
| [Spatial](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684795) | **22/23** | L'observation préalable au détail final du trio arrive déjà à `complete`, avant l'acquisition PNG. Aucun détail final n'est créé ; camouflage et mobile ne sont pas atteints. |
| [Voyage développeur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684967) | **11/12** | Le vrai briefing est visible, mais notre nouveau sélecteur le cherche dans HuntCanvas alors que son portail est monté sous `document.body`. |
| [Wolf](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684875) | **18/19** | La salle d'audience et la position de retour sont correctes ; aucun clic vers la station d'audience n'est enregistré avant l'expiration de l'attente. La cause de cette absence de clic reste indéterminée. |

Les [extraits d'échec et observations](verification/qa-followup-1951e17/failure-evidence.json) restent attachés à ces résultats rouges. Les trois photographies desktop inspectées — marche vaisseau/solo, pose finale solo et marche capsules/trio — sont sans overlay ni défaut manifeste d'appui ou de coupe. La troisième traverse la marche et la station debout : sa mesure ultérieure ne qualifie pas une photographie finale précise du trio. Aucun cliché final rejeté n'a été produit, car l'échec précède la capture. **Aucune validation visuelle du camouflage ni des variantes mobiles n'est ajoutée.** Les images complètes restent dans les artefacts Actions.

Les [sept workflows associés](verification/qa-followup-1951e17/related-ci.json) et leurs douze jobs sont tous réussis, dont les cinq jobs V94, l'inventaire courant à l'étape 67 et ClanWar à l'étape 73. Les métadonnées V112 sont conservées sans nouveau téléchargement des archives. Le résultat Wolf **32/32 sur `4a0b8d5`** reste une preuve séparée : le produit et cette recette Wolf sont identiques sur les deux passages, mais ce succès antérieur ne transforme pas l'échec présent en réussite.

Les correctifs suivants portent sur les recettes. Dev cible le dialogue accessible par son titre exact au niveau de la page, tout en gardant le périmètre Hunt/session et les contrôles d'instance unique. Ce défaut avait été introduit par notre précédent changement de sélecteur. Spatial arme l'observation native dans le navigateur sur le même run et le plan attendu pour retirer l'aller-retour avant le relevé final ; les bornes `playing`, les appuis, la formation et l'immobilité de la coque restent exigés. Wolf observe la livraison réelle du clic et autorise au plus une nouvelle action native si aucun clic n'a été reçu et si l'état concerné est inchangé ; une route effectivement reçue n'est pas rejouée. Un bouton temporairement désactivé reste une hypothèse, sans preuve dans ce passage.

**La correction du portail Dev seule a passé syntaxe Node, lint strict et vérification du diff avant la coupure.** Les versions finales des trois scripts ajoutent ensuite un transport des preuves, uniquement en CI et après fermeture du navigateur : champs existants du rapport en JSON compact découpé, puis, pour Spatial, une sélection des PNG originaux déjà enregistrés. Les octets PNG sont vérifiés contre leur SHA256 avant émission, sans recompression ni transformation. Les fichiers d'artefact restent les preuves de référence. Ces versions finales et leur contrôle combiné n'ont pas été exécutés localement ; elles ont seulement passé un parsing V8 non exécutant de copies adaptées à ce contrôle, sans changement des blobs conservés. Cela ne remplace aucun contrôle Node, ESLint ni navigateur. Le passage `8cee6ec4` ci-dessous rapporte les résultats CI de ces trois versions ; aucun build, inventaire ou test applicatif supplémentaire n'était annoncé lors de cette préparation.

### Passage distant `8cee6ec4` : images finales acquises et deux recettes à terminer

Le commit `8cee6ec4d7a1334ffd74af6eb9b29b161f561b15` termine ses **17 workflows : 15 réussis et 2 en échec**. Le [reçu du lot](verification/qa-followup-8cee6ec4/receipt.json) lie les résultats aux sources, aux artefacts et à leurs niveaux de vérification. Le checkout de fusion `bc0581d6717fca3e6fe6020db5b2200e0477301f` partage exactement l'arbre `4867642315ea924f4c6f1037aa8e253d6e86b776`. Les sources applicatives restent celles de `66f57a1`.

| Recette | Résultat | Portée obtenue |
| --- | ---: | --- |
| [Wolf](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349691) | **32/32** | Recrutement et vrai briefing camouflé, débit unique, reprises, handoff et chasse réelle ; seconde campagne avec arrivée capsule/solo naturelle. |
| [Spatial](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349423) | **62/63** | Parcours desktop/mobile, six finales du trio, phases du camouflage, mouvement réduit, pause, handoffs et ordres natifs réussis. L'agrégat final s'arrête sur l'absence d'un relevé du bref passage en l’air de Sa’keth en mode vaisseau desktop. |
| [Dev](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349452) | **17/18 exécutés** | Arrivées, pause/reset, passage volontaire, séquence naturelle, nouvelle salle, liens directs et mobile réussis. Échec à la première ouverture du contexte vide ; deux contrôles prévus restent non atteints. |

Spatial enregistre **208 captures et aucun cliché rejeté**, sans exception JavaScript, erreur console ni ressource manquante. Les six détails finaux ont tous été acquis dès la première tentative, avec les trois chasseurs debout et au sol, le portail dégagé et l'état natif `playing` immédiatement avant et après la photographie :

| Finale du trio | Desktop : intervalle du PNG | Mobile : intervalle du PNG |
| --- | --- | --- |
| Capsules | 61,783–61,916 s | 61,766–61,833 s |
| Vaisseau | 61,766–61,983 s | 61,766–61,800 s |
| Vaisseau camouflé | 61,783–61,983 s | 61,766–61,800 s |

Le [reçu photographique](verification/qa-followup-8cee6ec4/spatial-captures.json) conserve les hashes, les bornes, le cadrage natif et le contexte plein cadre antérieur. La mesure géométrique complète de la finale vaisseau desktop intervient ensuite à 62,000 s : elle ne remplace pas l'intervalle du PNG. Les six détails, leurs six contextes de marche et les six images du camouflage ont été ouverts en revue indépendante. Aucun défaut visuel bloquant, overlay terminal, personnage coupé ou rectangle de masque n'a été relevé dans ces images. La coque reste identifiable mais atténuée en atmosphère, revient pendant la coupure puis est opaque avant contact. Les vues vaisseau inspectées ne montrent pas les effets de capsule ou de crash.

Cette qualification porte sur des **images fixes**. Elle ne prouve ni la fluidité de la réfraction ni l'audio. Les finales sont des détails à échelle native, accompagnés d'un contexte antérieur. Le Canvas au handoff reste largement masqué par le message d'arrivée : il ne fournit pas une preuve visuelle complète des trois appuis à cet instant. Aucune qualification canonique 1:1 globale n'est déduite de cette revue.

Wolf confirme la vraie case de camouflage, **100 unités avant départ, 70 après approche et un seul débit lié au run d'origine**. Le handoff conserve Ka’rhek à 100 PV, Sa’keth à 120 PV et une patrouille physique avec 18 secondes de recherche. Les 48 pressions de navigation suivies ont toutes reçu leur clic à la première tentative, sans réémission. Dans le parcours natif Spatial, les commandes `hold` et `follow` passent pour les deux variantes en vaisseau ; les instantanés distinguent deux patrouilles et 35 secondes sans camouflage, contre une patrouille et 18 secondes avec camouflage.

Le [reçu Dev](verification/qa-followup-8cee6ec4/dev-receipt.json) et son [JSON reconstruit](verification/qa-followup-8cee6ec4/dev-review.json) conservent l'échec. Les quatre morceaux de logs ont été assemblés avec leurs indices et leurs 44 706 unités UTF-16 ; les 23 empreintes de sources concordent. Le contrôle échoue avant le reset du contexte vide : une lecture du propriétaire via `closest()` renvoie `undefined`. Son ancien diagnostic visait la page principale, pas l'onglet en échec ; la cause précise reste non établie. Le correctif lit le même propriétaire par locator, garde l'égalité stricte et dirige désormais le diagnostic vers la bonne page.

Les sept workflows associés et leurs douze jobs sont verts, dont les cinq jobs V94, l'inventaire courant et le panneau ClanWar natif. Le correctif Spatial prépare une lecture native supplémentaire seulement pour un membre dont l'observation aérienne manque, avec vérification exacte de la méthode, de l'équipe et du choix de camouflage ; les quatre relevés ordinaires et l'assertion finale sont conservés. Les deux correctifs QA ont passé `node --check` avec Node 24.22.1 et un parsing V8 non exécutant, mais **leurs contrôles ESLint et navigateur restent à exécuter en CI**. Aucun code produit, workflow, inventaire, durée de séquence ou horloge n'est modifié.
