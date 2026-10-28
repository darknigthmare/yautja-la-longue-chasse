# V112 — restauration locale après le nouvel aménagement

Le mobilier public V112 devient solide à six endroits auparavant libres. Une ancienne sauvegarde peut avoir conservé le personnage, le dernier point d’une étude interrompue, ou une pièce posée à ces endroits. Le chargeur hérité rejetait certains points et replaçait le personnage au port, tout en laissant l’étude impossible à reprendre. Le témoin K-17 reproduit ce blocage après 543 vrais pas de l’ancien moteur, avec 2 901,132 unités de marche déjà enregistrées.

## Comportement livré

`homeworldGeometryRecoveryV112.ts` inspecte le point de sauvegarde et les sept documents d’opérations : cartographie V104/V105, dossiers V106, comparaison V107, cargaisons V108, étude K-17 V109 et continuation V111. Les derniers points incomplets et les pièces au sol sont inspectés même lorsque le personnage a déjà marché ailleurs. Les reçus terminés, le constat B et le JSON de base d’une continuation restent inchangés.

L’entrée dans la cité reste en pause tant que ces anciens points sont obstrués. La consultation prépare une proposition sans toucher au personnage, aux brouillons ou à la sauvegarde. La confirmation restaure chaque point concerné dans un rayon maximal de 96 unités, par un segment qui était praticable dans l’ancienne géométrie. Les sols et les anciens obstacles restent obligatoires. La destination respecte la géométrie actuelle, le corps entier et, pour un lot de cargaison, son véritable support natif. Les corps de l’acteur, du point de sauvegarde et des derniers points conservés sont réservés pour éviter de les enfermer sous un lot déplacé. Le point permettant de reprendre une pièce au sol reste libre.

Pendant cette pause de restauration, les sept journaux d’opération et leurs commandes sont masqués pour laisser du terrain visible sur mobile. Leurs données et brouillons restent présents ; leur rendu reprend après acquittement de la restauration.

Le personnage se déplace seulement si son propre point de sauvegarde est obstrué. La réparation d’un dernier point distant ou d’une pièce garée conserve exactement sa position actuelle. Les coordonnées des pièces portées suivent leur dernier point. La restauration ne compte aucun pas et ne rejoue ni observation, provenance, accord, dépôt, acquisition ou récompense. Une opération active est interrompue une seule fois ; elle se reprend volontairement après restauration.

Avant l’écriture de la partie, une copie JSON exacte du point original et des sept champs présents est conservée et relue dans `yautja.homeworld-geometry-recovery.v112.<owner>.<hash>`. Elle conserve aussi la liste explicite des nouveaux points proposés. Une clé déjà occupée par des octets différents est refusée. Cette copie ne modifie pas le schéma Save12. La transaction recontrôle la partie, le personnage, les documents et la disponibilité avant toute écriture. Un quota, une exception ou un acquittement négatif laisse toutes les références physiques et tous les brouillons inchangés.

Si l’écriture a réussi mais que sa première relecture a échoué, GameClient peut ensuite acquitter les octets durables lors d’une autre opération. Le Hub conserve alors la proposition effectivement confirmée. Il finalise cette même restauration seulement si le propriétaire, le point de sauvegarde et les sept documents reçus sont exactement ceux de la proposition et si la copie originale peut être relue exactement. Un autre Save ne suffit pas. Aucun second enregistrement ni crédit de marche n’est créé.

## Reprise K-17 à portée réelle

La recette distante a également reproduit un défaut hérité : le bouton de reprise admettait le personnage à moins de quatre unités du dernier point, mais conservait l’ancien `last`. Save12 refusait ensuite l’état actif car son point de sauvegarde réel ne correspondait pas exactement à ce `last`.

`homeworldArchiveResumeV112.ts` laisse l’action héritée vérifier tous ses gardes, puis rattache uniquement une reprise réussie au point physique déjà atteint. Le court segment reste soumis aux collisions existantes. La pièce portée suit ce point. Aucun trajet supplémentaire n’est crédité, et les autres actions gardent leur comportement. Le même traitement couvre la continuation, en conservant le constat B et son JSON de base.

## Preuves

Les trois suites `homeworld-geometry-recovery*-v112.test.mjs` passent **27 tests**. Elles exécutent les modèles réels, le moteur natif et les callbacks AST réels du Hub. Elles couvrent les refus de stockage et de propriétaire, les propositions périmées, le quota et les exceptions, les références inchangées avant acquittement, la reprise réelle à proximité, l’acquittement différé et ses refus, ainsi que la validité Save12 avant/après.

Dix reçus anciens byte-exact sont versionnés dans `tests/fixtures/homeworld-upgrade-v112/`, avec leur manifeste SHA-256 et leur provenance. Ils couvrent les sept documents et des objets portés/au sol, dont les vrais trajets de 473 pas pour le lot garé, 740/1 251 pas pour la comparaison et 947 pas pour la continuation portée. Le helper `createGeometryUpgradeFixtureV112(owner, options)` rejoue aussi les témoins K-17 et Cargo dans la capsule privée V111 épinglée, compatible avec une CI peu profonde. Le propriétaire est fourni avant les véritables actions ; il n’est jamais réécrit sur un reçu existant.

Le test de capacité 512 construit explicitement une frontière de schéma en ajoutant des échantillons de distance nulle à un vrai préfixe. Il ne prétend pas que l’ancien parcours UI avait produit 512 points. La compression conserve les observations requises, les discontinuités et les compteurs, puis ajoute une rupture déclarée ; les bornes de révision et de compteurs refusent la proposition entière si nécessaire.

Les journaux et les reproductions initiales se trouvent dans `docs/qa/v112-homeworld-upgrade-recovery/`. TypeScript et le lint ciblé passent. La recette navigateur V112 complète la preuve sur le build de production gelé ; ses captures et son statut restent gérés par le rapport public-spaces, sans réécrire les anciens certificats ni déclarer les sources Excel héritées terminées.
