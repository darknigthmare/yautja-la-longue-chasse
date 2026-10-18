# V88 — inspection physique des huit postes

Le lot raccorde une préparation jouable au pont actuel : rejoindre les postes par les coursives, inspecter leurs données réelles, puis contrôler le sas. Chaque relevé appartient à une partie et une coque du registre historique. Il ne crée aucune acquisition, coque, ressource, capacité, personne, traitement, score ou voyage.

## Source et adaptation

L’original `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx` est lu sans exécution de formules ni modification, avec SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`, 139 feuilles. L’extraction conserve 12 lignes et leurs adresses : `Campagne commune!A27:K27`, les huit espaces initiaux de `Vaisseau personnel!A6:L20` (lignes paires), `Scènes de dialogue V6!A598:Q598`, `Choix et actions V6!A1218:I1219`.

R2-M022 demande huit gestes utiles après R2-M021. Cette adaptation joue l’**inspection** des huit postes déjà présents dans le jeu, sans inventer la technicienne du chantier, son dialogue, les travaux ou la remise des droits. La coque historique accessible reste distincte d’une acquisition R2-M021. `ready` décrit les huit relevés actuels ; il n’est ni `ship.personalOwned`, ni `ship.firstInteriorTour`, ni un succès de campagne R2-M022, ni l’autorisation d’un nouveau voyage R2-M023.

| Poste | Observation réelle | Condition conservée |
|---|---|---|
| Navigation | Chasse actuellement choisie | Mission existante, statut `available` ou `completed` |
| Armurerie | Armure, deux armes et deux équipements actuels | Objets connus et déjà débloqués |
| Archives | Identité, rang et nombre de chasses terminées | Aucun témoignage ni mission ajoutés |
| Apparence | Masque, armure et parures actuels | Aucun masque ou changement automatique |
| Galerie | Emplacements et IDs des originaux exposés | Un emplacement vide reste vide ; aucun original dupliqué |
| Infirmerie | État réel de l’installation | Un traitement en cours bloque le contrôle ; aucun soin automatique |
| Entraînement | Registre d’exercices existant | Aucun exercice réussi ni score accordé par inspection |
| Sas | Kit et destination, scellement des sept autres relevés | Les sept contrôles doivent correspondre aux faits actuels |

## Entrée physique et interruption

`PhysicalShipDeck` fournit `preflightV88` au panneau réel. Le bouton proche consulte `playerRef` au moment du clic puis utilise le même calcul de portée que les interactions du pont. Une observation distante, sur l’autre pont ou non finie est refusée. Le plan et les accès rapides ne déclenchent pas ce callback. Aucun nouveau raccourci global ni boucle de mouvement n’est ajouté ; clavier, tactile et manette du pont existant sont conservés.

Pause, scène inactive et absence de focus refusent le reducer. Les commandes du panneau sont aussi nativement désactivées pendant la pause. Le sas attend les sept autres postes. Les signatures bornées contrôlent la cohérence des faits ; elles ne constituent pas une authentification ni un reçu de propriété. Un changement de kit, destination, parure ou registre d’installation invalide les relevés concernés et le scellement du sas. Les relevés non concernés restent disponibles. Restaurer les mêmes faits réellement inspectés peut réutiliser leur relevé.

## Conservation et raccord racine

`ShipPreparationStateV88` contient `version:1`, `ownerSaveCreatedAt`, une révision et un tableau de coques indépendantes avec jusqu’à huit inspections chacune. Le normalizer refuse formats futurs, propriétaire étranger, postes inconnus, doublons, IDs de source incompatibles et révisions incohérentes. Il retourne `null` pour signaler le refus ; l’importeur doit conserver ou refuser la donnée d’origine, jamais la remplacer automatiquement par un registre vierge.

`readShipPreparationFleetV88(save, storage)` lit seulement la sidecar brute existante, validée par `validateCanonicalShipProgression`. Registre absent, lecture refusée, JSON invalide, futur ou étranger : aucune flotte par défaut et aucune adoption. Les inspections ne sont pas stockées dans cette sidecar. La racine les conserve dans `SaveGame.shipPreparationV88`, ses exports, archives et synchronisations, avec le même propriétaire.

`inspectShipPreparationV88` est pur : il retourne un candidat sans muter la sauvegarde ni la flotte. Le consommateur racine vérifie propriétaire/scène/focus/modales et confirme le candidat seulement après une écriture durable et sa relecture. Une panne de stockage doit conserver l’ancien checkpoint dans la sauvegarde **et** l’interface. Les observations identiques sont idempotentes.

## Vérifications et limites

- 13 tests V88 : source, lecture brute, refus de portée/pause/focus, huit postes, idempotence, invalidation du kit et du sas, destination inaccessible, vrai traitement en cours, formats futurs/étrangers, changement de coque, absence de flotte et rendu SSR du panneau.
- 16 tests V87 de manœuvre et 10 tests Bible restent dans le lot de régression ciblé : 39 tests navire au total.
- Lint ciblé et vérification TypeScript exécutés séparément ; la racine vérifie ses raccords de sauvegarde.
- SSR vérifie le balisage et les commandes ; il ne prouve ni hydratation, placement visuel ou parcours navigateur. Aucun navigateur ni build produit lancé par cet agent.

La remise de droits R2-M021, ses moyens/accords acquis, le prévol complet de sa nouvelle instance, les ressources de route, le départ physique FLIGHT5-04, un quai spatial chargé et le trajet R2-M023 restent des raccords distincts. Les 210 profils voix sont des directions textuelles, sans nouveaux clips enregistrés dans ce lot.
