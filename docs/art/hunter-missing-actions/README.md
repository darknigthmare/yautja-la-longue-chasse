# Animations manquantes du chasseur personnel — audit du 10 novembre 2026

## Périmètre et décision

Le lot retenu comporte **14 actions, 304 nouveaux dessins proposés et 19 planches de 16 cellules** : huit gestes de combat (192 dessins) et six mouvements de déplacement (112). Ces nombres décrivent un objectif de production d’images ; ils ne désignent ni des clips artistiquement validés, ni des animations déjà jouables.

L’audit porte sur le chasseur personnel de `HuntCanvas`, au commit **603b41d33141c376f9d404a9bd91c6792f318cbf**, et sur le pack `reference-yautja` existant. Les 27 549 chemins suivis ont été inventoriés sans checkout complet. Les fichiers de moteur étudiés ont été comparés aux blobs de ce commit : tous les caches cités correspondent exactement à la source courante. Aucun fichier du dépôt n’a été modifié par cet audit.

Le constat principal est direct : `solvePlayerRigFrame` choisit `extract`, `climb`, `jump`, `fall`, `run` ou `idle`, puis résout un rig. `drawHunterLayered` compose ensuite les membres et équipements. Les huit gestes de mêlée retenus possèdent une mécanique réelle, mais cette sélection corporelle ne leur attribue aucune séquence native de corps entier. Les dessins sont donc utiles à produire ; leur branchement constitue un travail distinct. [Sélection actuelle des poses](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L1093-L1158) · [Rendu par calques](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L4037-L4343).

Le pack V2.1 existe déjà : **288 dessins source** pour les trois postures arboricoles, le rugissement et les deux victoires. Ses sorties réversibles et ses 468 références de lecture réemploient ces dessins. Il porte `draft`, `rosterBinding: null` et une orientation provisoire. Ces six actions sont des **sources existantes à réviser et intégrer**, pas de nouveaux manques à régénérer dans le présent lot. [Index du pack existant](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/public/game/sprites/hunter-postures-emotes/v1/runtime_atlases/index.json#L1-L100).

## Lot 1 — huit gestes de combat

Les identifiants de production de la première colonne sont de nouveaux noms d’assets. Les champs de la troisième colonne sont, eux, les vrais états déjà présents dans le moteur. **Aucun nouvel enum de gameplay n’est nécessaire pour nommer les images.** Les armes retenues sont les **wristblades** ; les versions au combistick demeurent un besoin distinct.

| Asset de production | Dessins proposés | État moteur existant | Anticipation / contact / récupération en secondes |
| --- | ---: | --- | --- |
| `light_1` | 16 | `actionKind: light`, `comboIndex: 0` | 0,100 / 0,080 / ≥ 0,080 |
| `light_2` | 16 | `actionKind: light`, `comboIndex: 1` | 0,085 / 0,090 / ≥ 0,095 |
| `combo_finisher` | 32 | `actionKind: light`, `comboIndex: 2` | 0,130 / 0,105 / ≥ 0,230 |
| `heavy_strike` | 32 | `actionKind: heavy` | 0,220 / 0,120 / 0,340 |
| `air_strike` | 32 | `actionKind: aerial` | 0,070 / 0,170 / 0,200 |
| `guard_break` | 32 | `actionKind: guard-break` | 0,180 / 0,100 / 0,300 |
| `parry` | 16 | `phase: idle`, `defensePhase: parry` | Activation immédiate ; fenêtre de 0,140 s dans une durée totale maximale de 0,240 s |
| `dodge` | 16 | `phase: idle`, `defensePhase: dodge` | Activation immédiate ; invulnérabilité de 0,180 s dans une durée totale de 0,300 s |

Sources : [énumérations et timing](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/huntMeleeCombat.ts#L3-L241), [horloges et consommation des défenses](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/huntMeleeCombat.ts#L760-L807), [acheminement des entrées réelles](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L8605-L8697).

### Fenêtres de contact exactes

À partir du début de l’action, les contacts sont respectivement **[0,100 ; 0,180[**, **[0,085 ; 0,175[**, **[0,130 ; 0,235[**, **[0,220 ; 0,340[**, **[0,070 ; 0,240[** et **[0,180 ; 0,280[** secondes. Les valeurs de récupération des trois légères sont des minimums :

`max(récupération de base, cooldown de l’arme × multiplicateur de cadence − anticipation − contact)`

Les multiplicateurs sont 1, 1,04 et 1,4. Le futur lecteur doit obtenir les durées réellement résolues avec **`currentHuntMeleeAttack(state)`**, puis lire `phase` et `phaseRemainingSeconds`. Le Hunt travaille avec des deltas en secondes ; lui attribuer les 60 ticks fixes de la Fosse serait incorrect. Une cadence d’aperçu choisie pour voir tous les dessins ne remplace pas cette horloge. [Calcul de récupération](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/huntMeleeCombat.ts#L247-L266) · [Fonction de spécification actuelle](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/huntMeleeCombat.ts#L833-L853).

La parade réussie consomme immédiatement sa phase défensive. Une image de suivi éventuelle doit donc utiliser un curseur visuel indépendant et interruptible. L’anticipation dessinée d’une parade ou d’une esquive ne doit jamais retarder leur activation mécanique. Les huit séquences sont à lecture unique ; une boucle d’attente artificielle au milieu d’un coup n’est pas appropriée.

### Arme et chorégraphie

`playerMeleeTechnique` utilise le combistick uniquement quand il est actif et possède encore une munition disponible ; il choisit sinon les wristblades. L’aérienne et le brise-garde suivent exactement cette règle. Le lot produit une version aux wristblades, sans ajouter de nouvelle arme, de victime ou de finisher. La chorégraphie reste une proposition artistique de jeu, pas une certification canonique du film. [Choix effectif de l’arme](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L7158-L7239).

## Lot 2 — six mouvements de déplacement

| Asset de production | Dessins proposés | Mécanique attestée | Besoin de présentation |
| --- | ---: | --- | --- |
| `run_forward` | 16 | Au sol, vitesse horizontale notable, `velocityX × facing > 0` | Boucle dessinée en place ; vitesse réelle fournie par la simulation |
| `run_backward` | 16 | Au sol, `velocityX × facing < 0` ; déplacement opposé au regard possible pendant la visée | Vraie course arrière, distincte de l’inversion de la course avant |
| `climb_up` | 16 | `climbing`, hors balancement, `velocityY < 0` | Échange des prises en ascension ; pas de tronc fusionné au personnage |
| `climb_down` | 16 | `climbing`, hors balancement, `velocityY > 0` | Descente dessinée séparément ; Y positif descend à l’écran |
| `jump` | 32 | `!grounded && !climbing` ; montée à vitesse Y négative, chute ensuite | Découpes artistiques montée/sommet/chute ; durée totale variable, sans boucle complète forcée |
| `landing` | 16 | Transition réelle `!wasGrounded && grounded` ; événement sonore audité pour impact > 180 | **Nouveau curseur de présentation nécessaire**, sans verrou d’entrée ni modification de physique |

Le moteur ne retourne pas automatiquement le regard vers le déplacement pendant la visée, ce qui justifie bien un cycle de recul. Il appelle actuellement les deux directions corporelles `run` ; `run_forward` et `run_backward` sont des noms de production. [Vitesse et direction](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L8502-L8536).

La montée et la descente existent déjà dans le modèle, mais le rig reçoit actuellement `climb` avec une progression qui dépend de la valeur absolue de la vitesse. Un futur adaptateur doit distinguer le sens ; dessiner deux cycles ne fait pas apparaître cette liaison automatiquement. [Escalade actuelle](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L8751-L8779).

Le saut dispose d’une véritable impulsion, d’un relâchement depuis une prise et d’un boost aérien. La réception existe comme événement de collision, mais aucun état de pose `landing` n’est conservé. Le sommet du saut est également une découpe artistique, pas un enum supplémentaire. Le contact au sol et le jump buffer gardent la priorité sur toute séquence visuelle. [Impulsions](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L8235-L8280) · [Collision et réception](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L8790-L8825).

## Ce qui manque encore après ces deux lots

Le tableau recense les familles pertinentes déjà soutenues par le code actuel. Il n’ajoute pas de mécaniques nouvelles et ne traite pas les budgets historiques de centaines de lignes comme des clips déjà disponibles.

| Priorité | Famille restante | État de la mécanique et de l’image |
| --- | --- | --- |
| 3 | Attente et visée | Rig actif ; cycles de corps entier et transitions d’entrée/sortie manquants pour ce pack |
| 3 | Prise, suspension, lâcher et balancement | `climbing`, prise et `canopySwing` existent ; V2.1 fournit des études de posture, pas un ensemble de traversée intégré |
| 3 | Boost aérien | Impulsion disponible ; dessin et raccord dédiés manquants |
| 3 | Projection et exécution | Actions mécaniques et cible verrouillée présentes ; séquences attaquant/victime synchronisées encore à produire |
| 3 | Variantes combistick | Profil d’arme existant ; le présent lot wristblades ne les couvre pas |
| 4 | Visée, charge, tir, recul, lancer, rappel/récupération, changement d’arme | Mécaniques et effets présents ; gestes spécifiques aux objets et horloge équipement indépendante à produire |
| 4 | Masque et gantelet | `maskOn` et ouverture procédurale existent ; transfert visage/main/rangement et manipulation dessinée manquants |
| 4 | Scan et camouflage | Événements et effets présents ; gestes natifs sans verrou artificiel à produire |
| 4 | Medicomp et Second Wind | Effets appliqués immédiatement ; traitement et rétablissement ne disposent pas de phases corporelles natives |
| 4 | Pose/lancer d’équipement | `activateGearSlot` existe ; chaque objet doit conserver son identité et sa possession pendant le geste |
| 5 | Blessure et mort | Dégâts/invulnérabilité présents ; la mort met le jeu en pause immédiatement, donc une séquence visuelle demande une horloge adaptée |
| 5 | Préparation et prélèvements | Les phases `approach/work/secure` existent ; elles pilotent actuellement une pose de rig et des articulations |
| 5 | Porter, suspendre, déposer et interagir | Opérations et objets présents ; transitions natives et occultations à produire |
| 5 | Extraction et rangement de trophée | Rituel réel ; les deux victoires V2.1 sont déjà des sources draft à réviser, pas à recompter comme dessins manquants |
| 5 | Embarquement | `boardingProgress` transporte l’acteur ; gestes corporels natifs d’embarquement encore absents |

Sources supplémentaires : [scan](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L7624-L7637), [soin](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L7693-L7718), [blessure et mort](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/HuntCanvas.tsx#L6600-L6654), [présentation des prélèvements](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/huntFieldPresentationV112.ts#L18-L114), [progression du trophée et embarquement](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/app/game/systems/trophyRitual.ts#L238-L342).

Les audits Fosse V32/V53 ne doivent pas être réutilisés comme inventaire actuel. Les lots V91/V92 ont ajouté des attentes, accroupissements et techniques pour certains costumes précis ; V100 possède 52 études Feral/Scar et des liaisons partielles. Cette couverture ne correspond pas au chasseur personnel et ne peut lui être empruntée silencieusement.

## Contraintes de production et d’intégration

**Personnalisation.** Le contrat Expédition exige une anatomie entière avec les équipements personnalisables séparés, dont masque, caster, gantelets, dreadlocks, armure, filet, objets, trophées et effets. Une feuille montrant le Yautja entièrement équipé est une source artistique utile, mais elle ne remplit pas à elle seule ce contrat modulaire. La déclaration d’un manifeste ne peut remplacer les couches réellement nécessaires. [Contrat Expédition](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/603b41d33141c376f9d404a9bd91c6792f318cbf/docs/expedition-animation-contract-v36.md).

**Côtés.** Un lot orienté à droite couvre uniquement ce côté. Les asymétries du casque, du caster et des gantelets demandent une autre source native pour la gauche. L’existence des images ne justifie aucun miroir automatique ni emprunt d’un autre costume.

**Échelle et pivots.** La caméra et la référence corporelle restent fixes pendant le geste. La source doit animer le corps en place ; la physique déplace déjà son point monde. Un pivot aérien reste rattaché à un bassin/référentiel debout, pas aux pieds qui se replient. Les déplacements intentionnels d’un appui ne doivent pas être effacés en recentrant chaque silhouette.

**Phases.** Le découpage anticipation/contact/récupération est à confirmer sur les dessins effectivement reçus. Il ne se déduit pas d’une division arbitraire du nombre de cellules. Une phase très courte peut ne pas présenter chaque dessin à une cadence d’affichage donnée ; elle ne doit pas être allongée pour augmenter le compte visible.

**Statut.** `draft` reste `draft` jusqu’à la revue artistique humaine exigée par le contrat du dépôt. Alpha, dimensions, SHA et originalité binaire sont des contrôles techniques ; ils n’attestent ni anatomie, ni fluidité, ni intégration. Un adaptateur futur doit lire les états actuels sans muter dégâts, hitboxes, sauvegardes, replays, inventaire ou délais de gameplay.

## Fichiers d’audit

- `gap_audit_2026-11-10.json` : périmètre, preuves GitHub, état de chaque famille, compte proposé et contraintes.
- `hunt_animation_state_map.json` : mapping des 14 noms de production vers les vrais champs/événements, durées et limites ; non importé par le gameplay.
- `first-two-art-qa.json` : mesures des deux premières feuilles reçues, aux seuils alpha 0/2/16/128, avec rectangles réels et marges par cellule.

Les noms `light_1`, `light_2` et `combo_finisher` correspondent respectivement à `actionKind: light` avec `comboIndex` 0, 1 et 2. Les assertions de couverture de cet audit restent bornées au commit cité et à cette identité de production.

## Résultat du lot priorisé

Les 14 actions sélectionnées disposent désormais de **19 planches sources et 304 dessins nouveaux**, tous reliés à leur SHA et examinés. `CONSOLIDATED_REVIEW.json` et `CONSOLIDATED_REVIEW.md` consignent la sélection finale ; `ART_REVIEW_LIMITATIONS.md` décrit les réserves artistiques et d’intégration. Aucune cellule source ne possède de pixel alpha ≥16 sur sa bordure. Huit planches gardent des pixels de faible alpha >2 jusqu’au bord dans 24 cellules, documentés séparément.

Les sources restent **draft** : ce lot ne branche pas de nouvel atlas au moteur et ne valide aucun clip de gameplay. Les deux seules calibrations adoptées sont des origines de page constantes pour le finisher B et la lourde B. Les raccords des courses et du saut, les variantes d’équipement et de côté, ainsi que la présentation persistante de réception restent à finaliser.

Les **16 autres familles** inventoriées plus haut restent ouvertes. Cette livraison traite les priorités de combat et de déplacement du chasseur personnel ; elle ne termine pas l’ensemble des animations du jeu.
