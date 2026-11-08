# Mobilité — annexe à la Bible de campagne

**PR #116 · documentation de conception, non implémentation.** Cette annexe intègre le pack « Véhicules & Destriers » sans remplacer les 68 fiches de la [Bible de campagne](../BIBLE_DE_CAMPAGNE.md), ses dialogues, ses rangs ou ses sauvegardes. Base effectivement inspectée : `d3a289f738c9f33305a3564adf4141060f76d9d0`, branche `claude/bible-de-campagne`.

## Lecture et priorité

1. Les validations de la campagne révisée L-01 → L-10 et les contrats des systèmes existants restent prioritaires.
2. Les arbitrages de cette annexe corrigent les propositions génériques du pack initial.
3. Les cinq fichiers du [catalogue](catalogue/) conservent, sans suppression de champ, les **50 fiches originales et leurs identifiants** : 24 machines/utilitaires/insertion, 10 engins Bad Blood/Enforcer, 16 montures. Ils ne sont pas un registre chargé par le jeu.

**Tous les ajouts restent « proposé / design-only », fidélité visuelle non certifiée, activation runtime désactivée.** Une mission déjà jouable n'implique pas que son extension montée le soit. Les dimensions, puissances, capacités, prix implicites, nombres de passagers et délais sont des propositions d'équilibrage, jamais des mesures canoniques.

Le [prompt d'implémentation](PROMPT_CODEX.md) donne les raccords à conserver. Les [consignes visuelles](PRODUCTION_VISUELLE.md) complètent les briefs individuels. Le [manifeste](MANIFEST.json) conserve les empreintes de provenance. `python3 docs/campagne/mobilite/export_catalogue.py --out /tmp/yautja-mobilite` vérifie les données puis restitue la bible détaillée, le JSON complet, les 50 prompts et le CSV à partir d'une seule source. Aucun asset n'est généré par cette commande.

## Concordance avec les annexes reçues pendant cette intégration

La tête `22f5b174b3d37e1e51f831bb75447376650a5569` a été relue après l’audit initial. Les [compagnons](../COMPAGNONS_ET_ALLIES_PREMIUM.md), leur [catalogue](../CATALOGUE_COMPAGNONS.md) et [Warp Universe](../WARP_UNIVERSE.md) sont conservés et prioritaires dans leur périmètre explicite.

Appliquer ALL-01 à ALL-10 aux animaux : rencontrer, recruter/acquérir, affecter et déployer sont distincts. Aucun habitat personnel, animal, affaires ou service d’un spécialiste dans un navire avant recrutement et affectation active compatibles. Une réservation technique générique est possible, pas une stalle nommée révélant un compagnon inconnu. Un déploiement ne supprime pas l’affectation ni l’habitat, mais ne duplique pas l’animal à bord. Les huit salles fonctionnelles de M022 restent intactes.

`bastion`, `tranchevent`, `nacre`, Brèche et Silex gardent leurs identités. Aucune fusion automatique avec Kha’Rha, Razorwing ou Swamp Strider ; Tranchevent ne porte pas un Yautja. Si un individu devient une monture d’une définition compatible, relier son identité unique au véhicule, sans second recrutement ni deuxième instance. Les 50 fiches sont un catalogue **de production**, pas cinquante silhouettes dévoilées dès le début dans le codex joueur ; respecter les états de découverte.

Warp Universe garde ses modes expédition, chronique cinéma et Réécriture, son accès Adjutant par progression effective et ses sauvegardes d’instance. Une monture ou un véhicule historique appartient au contrat de cette instance ; sa sortie n’importe que les récompenses explicitement permises. La présente annexe ne rétablit ni un verrou Ancient global pour les chroniques ni l’interdiction des personnages de films dans le mode cinéma.

## Références et limites du « 1:1 »

| Groupe | Décision éditoriale |
| --- | --- |
| Blade Fighter K-93 / Viper | Conserver les deux identifiants comme dossiers d'adaptation Kenner / réinterprétation demandée. Leur filiation exacte, les vues du produit et les couleurs restent à documenter par référence primaire avant validation artistique. |
| Moto de clan / sphère d'éjection | Références demandées à Badlands, non certification des dimensions, armements, couleurs ou fonctions inventées pour le jeu. |
| Moto de chasse et variantes | Extrapolations originales, pas d'autres véhicules déclarés présents dans le film. |
| Bone-Bison de guerre | L'identification visuelle de la créature reste à contrôler ; sa domestication et son équipement sont des créations du jeu. `Genna-like` reste une indication d'ambiance, pas un nouvel identifiant de planète. |
| Destriers et véhicules originaux | Concepts du projet ; aucune race ni tradition universelle Yautja n'est attribuée au canon sans œuvre précise. Aucun dessin particulier de fan n'est fourni ou copié dans cette passe. |

Le libellé historique « réinterprété sous licence » de `blade_fighter_k93.source_class` **ne signifie pas que ce fan-game possède une licence**. Il est conservé pour la traçabilité du pack, mais ne doit pas être repris comme statut juridique ou promesse de fidélité dans l'interface. Le terme `source_class` décrit une intention de provenance, non une preuve. La validation requiert ensuite œuvre/produit, scène ou référence précise, vues exploitables et comparaison artistique humaine.

## Progression raccordée à la campagne

| Étape existante | Ajout proposé | Limite obligatoire |
| --- | --- | --- |
| Youngling, M001–M006 | Observer atelier, écurie et transport de clan | Aucun véhicule armé possédé au départ. |
| Unblooded, L-01 / M007–M014 | Initiation surveillée au Grav-Sled, transport collectif comme passager | Le « tutoriel de mobilité » du pack n'accorde ni propriété libre ni rang. |
| L-02/L-03, Quatza-Rij à trois | Transport jusqu'au périmètre puis stationnement | Le trio réalise lui-même le rite ; ni monture, ni drone, ni véhicule ne tue la proie à sa place. |
| L-04, pyramide / Blooded | Insertion et extraction hors de l'épreuve | Aucun véhicule dans les salles du rite, aucun contournement des armes à récupérer ou des validations. |
| Blooded, M021–M023, vaisseau | Déverrouillage proposé d'une baie compatible, contrat de moto ou premier lien Kha'Rha | Le vaisseau et la capacité réelle d'embarquement doivent être acquis ; rien n'est accordé par la lecture du catalogue. |
| M024.1–M024.8, huit chasses | Itinéraires secondaires compatibles, garage et extraction | Les objectifs et parcours à pied existants restent valides. Pas de nouveau rang par course ou capture. |
| L-05, Quatza-Rij solitaire | Stationnement en dehors du territoire rituel | Pas de compagnon ni monture combattante : conserver la preuve de chasse solitaire. |
| L-06/L-07, rites et reine | Transport proposé de la crête après combat | Posséder un carrier ne valide pas Elite ; la crête doit réellement être rapportée selon la mission. |
| L-08/L-09, chef de clan et navire | Flotte, services de siège, convois, hangar collectif | Défi/succession/fondation et direction du clan restent requis pour ouvrir la guerre. Embarquer comme invité n'accorde pas le commandement. |
| Elder / Ancient | Montures de prestige et processions | Une monture n'octroie pas le titre de son cavalier. |
| L-10, Warp facultatif | Transport compatible avec la mission et sa continuité | Aucune moto ou capsule n'accorde le Warp ; aucun équipement anachronique injecté automatiquement. |

Les six départs de campagne gardent leurs conditions. Les tiers 1–5 du catalogue ne sont **ni** les rangs, **ni** les niveaux 0–10 de la bible. Les fonctions Enforcer, Arbitre ou pilote ne créent pas une nouvelle échelle. Les accroches de quêtes prennent des identifiants `MOB-*`, sans renuméroter les R2 ni annoncer de nouvelles missions déjà produites.

## Huit chasses : destinations existantes, extensions proposées

| Fiche / identifiant du jeu | Monde | Exemples de raccord à concevoir |
| --- | --- | --- |
| R2-M024.1 · `jungle-vey` | Oseris-IV | `hunter_hoverbike` sur clairières ; `forest_stalker_mount` et `canopy_glider` sur branches/courants autorisés. |
| R2-M024.2 · `ice-cryostalker` | Nivalis-K | `ice_skimmer`, `ice_fang` sur glacier balisé, avec retour à pied. |
| R2-M024.3 · `volcano-bad-blood` | Cinder-12 | `ash_horn` sur passages thermiques conçus pour lui ; `blood_runner` pour une poursuite optionnelle. |
| R2-M024.4 · `swamp-hydra` | Naraka-Delta | `swamp_skimmer`, `swamp_strider_mount`, `river_manta` selon profondeur et toxines, jamais immunité universelle. |
| R2-M024.5 · `desert-sandmaw` | Serekh-9 | `sand_skimmer`, `sand_mauler` sur pistes et dunes. |
| R2-M024.6 · `ocean-leviathan` | Pelagos-M | `river_manta` sur trajet côtier ; sa plongée courte n'en fait pas un sous-marin. |
| R2-M024.7 · `fungal-hivemind` | Mycora-V | `jungle_strider` sur routes compatibles ; flore et spores restent des dangers. |
| R2-M024.8 · `ruins-ancient-guardian` | Acheron-Sigma | `cliff_crawler`, `cliff_leaper` sur surfaces approuvées ; stationnement avant salles/puzzles. |

Kha'Rha n'est pas Quatza-Rij ; Sand Mauler n'est pas Sandmaw ; Ice Fang n'est pas Cryostalker. Aucun boss ni spécimen existant n'est converti en monture par simple ressemblance de nom. Les captures de larves/œufs et le Kalisk juvénile du pack restent des accroches à écrire, pas du contenu déjà présent.

## Hubs : réutiliser, ne pas doubler

**Vaisseau personnel.** Baie proposée comprenant emplacement machine, stalle, établi, râtelier, crochets, console de rappel et soins. La formule « une machine + une monture » est une cible de configuration, pas une capacité universelle. Vérifier volume, masse, portes et rampe pour chaque coque du `shipCatalogue`. Un animal de cinq mètres ne rentre pas automatiquement dans une petite coque. Les grands modèles restent au hangar de clan ou sont déployés comme services.

**Clan Ship existant.** `ClanShipHub.tsx` possède déjà `hangar`, `armurerie`, `entrainement`, `conseil`, `archives`, `trophees`, `soins`. Ajouter la préparation de mobilité dans le hangar, la maintenance avec les services appropriés et les contrats à la table holo du conseil. Préserver amarrage, retour au vaisseau personnel, `clanShipDocking`, `clanShipInterior`, `clanShipOperations` et propriété par `ownerCreatedAt`. Les six ou huit passagers d'un skiff ne créent pas de recrues ni de places supplémentaires dans l'équipage sauvegardé.

**Homeworld.** « Forge District Garage » devient un service proposé dans le quartier `forges`, lié au `forge-circle`, plutôt qu'un quartier anglais concurrent. « Beastmaster Quarter » désigne l'extension d'écuries proposée avec les `reserve-keepers` ; localisation et enveloppes d'usage restent à concevoir. Le service n'existe pas encore dans l'union `HomeworldService` inspectée. Ne pas rebaptiser silencieusement l'actuelle Maîtresse des parures en mécanicienne.

La navette `clan-local-shuttle`, le `landing-pad` et le spatioport de `HomeworldCityScene.tsx` restent en place. Leur présence visuelle n'atteste pas une conduite libre. Les accès peuvent réutiliser Marches de Cendre, Désert de Verre, Jungle des Piliers, Marais Luminescents, Chaîne des Orages et Couronne Froide, sans créer de doubles planètes ni transformer une parcelle `interactive: false` en bâtiment visitable.

## Boucles de jeu et arbitrages communs

### Déplacement et possession

Chaque exemplaire possédé aura un `instanceId` distinct de son `definitionId`. Un seul propriétaire et un seul conducteur actif, une position de monde/sous-zone et une destination de stockage. États à spécifier : stocké, demandé, en approche, disponible, montée, contrôlé, vol/bond, freinage/attaque, descente, abandonné, retour, récupération ; branches surchauffe/EMP/panne pour machines, peur/blessure/KO pour bêtes. Les machines de mission ont une sortie scénarisée, pas un transfert gratuit de propriété.

Appeler, suivre, abandonner et récupérer exigent un trajet crédible, un délai et une entrée de scène. Pas de téléportation à travers une porte scellée ; pas de descente dans le vide ; pas de duplication après chargement. Le retour doit rester possible après panne, manque d'énergie, KO, perte de cargaison ou changement de sous-zone. Mettre les capacités d'appel en échec propre plutôt que bloquer la campagne.

### Level design et combat

Conserver passages `FOOT`, sentiers `MOUNT_TRAIL`, pistes `VEHICLE_*`, routes lourdes et corridors spéciaux AERIAL/BURROW/WALL. Les tags du pack sont un vocabulaire de conception **non exhaustivement implémenté**, pas une permission automatique. Vol, plafond, forage, eau, lave et destruction ne franchissent que les surfaces explicitement autorisées. Le hook « trophée colossal » de Stoneback est ramené au transport **lourd** ; le colossal exige le Hauler et son itinéraire.

Prévoir parking, boucle à pied, raccourci de retour, collision coque/membres/cavalier/cargaison et sortie sûre d'exécution. Le pilote utilise les armes compatibles avec sa posture et ses accès acquis. Vitesse relative/angle/masse gouvernent les collisions ; les projectiles ne traversent pas leur propre porteur. Filets, EMP, mines, pièges et obstacles doivent avoir des contre-mesures lisibles.

La chasse conserve son Canvas 2D ; le Homeworld et les intérieurs conservent leur projection 2,5D et leur tri de profondeur. Aucun remplacement global du moteur. Anticipation de caméra et dézoom bornés, destination d'atterrissage visible, horizon fixe par défaut, rotation/shake réduisibles ; le « retournement gravitationnel de caméra » du Cliff Crawler n'est pas une obligation.

### Machines, bêtes et personnalisation

Boost, camouflage et armes partagent un budget d'énergie défini par modèle, avec chaleur séparée et panne locale moteur/arme/stabilisateur/cargo. Trois états visuels : intact, endommagé, critique ; réparation de terrain limitée, restauration en atelier. Une capacité « sprint sans fatigue » devient un avantage borné à équilibrer, pas une ressource infinie.

BOND proposé 0–100 : 25 rappel fiable, 50 esquive assistée, 75 protection, 100 compétence combinée. Endurance, peur, blessures et environnement modulent ces avantages. Observer, approcher, nourrir, soigner, entraîner et éventuellement immobiliser constituent des voies spécifiques à l'espèce, pas une domination violente obligatoire. À zéro PV : KO récupérable par défaut ; mort permanente seulement dans une règle hardcore explicite. Blood Beast peut être réhabilitée ; sa saisie ou son apparence ne rend pas automatiquement le joueur criminel.

Châssis, noyau, blindage, arme, selle, gravures, filets, os, trophées, marques de combat et nom personnalisé restent physiques et cohérents. Les trophées décoratifs doivent appartenir au joueur et respecter les emplacements. Skins complets pour les modèles héros ; sockets limités aux points techniques, sans membres flottants ni fausse anatomie Yautja.

### Trophées, justice et opérations collectives

Petit trophée porté ; moyen sur Carrier ; lourd sur Stoneback/Carrier adapté ; colossal par Hauler ; capture vivante en cage avec confinement, oxygène et risque d'évasion. La charge visible modifie la maniabilité puis rejoint l'exposition seulement après extraction validée. Réutiliser les contrats de trophées et `homeworldCargoLedgerV108` ; aucune seconde économie parallèle. Retrouver une prise volée ne la transforme pas en exploit personnel.

La recherche Enforcer découle de preuves, infraction, juridiction et mandat, pas d'un skin, d'une accusation ou d'une affiliation au `exile-network`. La séquence tracker → motos → barrages → Interceptor → prison → Arbitre est une proposition d'escalade locale. Les poursuivants perçoivent, perdent la piste, contournent, abandonnent ou appellent du renfort ; ils n'ont pas d'omniscience. Une réquisition ou une saisie légitime n'est pas un vol. Aucun Arbitre ni roi local n'est déclaré souverain universel des Yautja.

Skiffs, siège, soins et forge sont des services limités par la mission, l'équipage et les budgets existants. Un tag `co-op` ne prouve pas un multijoueur réseau. Les exercices V115/W3, les territoires V85 et la campagne restent distincts : aucun transfert automatique d'unité, XP, blessure, stock, trophée ou conquête ; pas d'appariement `W3-Kxx` / `CON-Txx` par suffixe. Les actions doivent passer par leur propriétaire de sauvegarde.

### Insertion et cinématiques

`drop_spear_capsule` et `escape_orb` sont des fiches de conception, non deux remplaçants automatiques des pods déjà utilisés. Faire d'abord la correspondance avec les catalogues d'insertion existants ; conserver ID, équipage et mission réels. Raccorder largage, entrée atmosphérique, volets, chauffe, impact, ouverture, sortie et extraction à la chronologie existante. Les VFX restent attachés aux sockets et orientés selon mouvement/caméra. Camouflage et énergie ne réinitialisent pas l'alerte ennemie déjà acquise. L'autodestruction à distance est une commande fictive de jeu explicitement confirmée, avec portée et sécurité des alliés ; aucun déclenchement automatique lors d'une descente ou d'une sauvegarde.

## Production et critères d'acceptation

Priorités : **MOB-SLICE-01 `hunter_hoverbike`**, **MOB-SLICE-02 `blade_fighter_k93`**, **MOB-SLICE-03 `kha_rha`**. Elles couvrent respectivement conduite/caméra/poursuite, poids/armes/capture et BOND/soins/écurie. Les autres familles réutilisent des composants validés, sans cinquante moteurs séparés. Les véhicules non possédables, drones, boss et capsules gardent leur statut. L'objectif historique « au moins 20 pilotables » reste une cible à développer, pas une livraison.

| Contrôle futur | Attendu vérifiable |
| --- | --- |
| MOB-QA-01 Rites | Aucune validation de trio/solo/Elite par assistance de mobilité ou lecture de catalogue. |
| MOB-QA-02 Appel / descente | Refus hors route, place libre, aucun spawn dans obstacle ou descente mortelle forcée. |
| MOB-QA-03 Conduite | Accélération, freinage, pente, réception, eau/toxines et obstacles testés clavier/manette. |
| MOB-QA-04 Ressources | Chaleur, énergie, BOND, peur, blessure, récupération et réparations sans blocage de campagne. |
| MOB-QA-05 Persistance | Anciennes sauvegardes, aller-retour, écriture échouée, onglets concurrents, pas de double possession. |
| MOB-QA-06 Cargo | Charger, abandonner, reprendre, extraire une seule fois ; aucune récompense duplicable. |
| MOB-QA-07 Hubs | Retour au vaisseau, passage du hangar, profondeur, gabarit et portes réellement praticables. |
| MOB-QA-08 Justice | Véhicule saisi légalement, piste perdue, fausse accusation, changement de juridiction. |
| MOB-QA-09 Inter-modes | Aucun changement involontaire des ressources/personnages/territoires V85 ou de campagne. |
| MOB-QA-10 Assets | Alpha réel, pivots, toutes orientations, pilote entier, éclairage, VFX attachés ; revue humaine avant `validated`. |
| MOB-QA-11 Robustesse | Audio absent, pause, blur, onglet caché, sortie de scène, temps simulé, nettoyage des entités. |
| MOB-QA-12 Performance | Mesure sur scène/matériel/résolution identifiés ; 60 FPS est une cible, jamais une preuve documentaire. |

La présente PR ne ferme **aucun** de ces contrôles de gameplay. La validation livrée concerne la structure documentaire, l'unicité des fiches, la conservation des données source et la génération reproductible des exports. Références artistiques primaires, contrôle navigateur/manette, équilibrage, animations, sons et intégration jouable restent à réaliser.


<!-- mobility-all-sources-20261106:start -->
## Sources graphiques conservées dans la PR

[Inventaire actuel des 87 PNG](DEPOT_COMPLET_SPRITES_20261106.md) : 20 sorties individuelles HD 01–20, 50 concepts V0.1, un essai non retenu et 16 planches archivées séparément. Les anciens reçus restent historiques. Aucun nouveau lot 21–30, aucune animation, intégration moteur ou validation artistique 1:1 ne découle de cet import.
<!-- mobility-all-sources-20261106:end -->


<!-- mobility-gameplay-v1-20261108 -->
## Garage et gameplay — reprise du 8 novembre 2026

[Comptoir des Forges, boucle de conduite, sauvegardes et limites](GAMEPLAY_GARAGE_V1.md) · [Excel complet (22 feuilles)](../../../production/mobility-20261108/Yautja_Mobilite_Gameplay_20261108.xlsx).

Deux engins dans l’aire fermée, une vente, douze paliers mécaniques et deux convois PNJ. Les cinquante fiches demeurent distinctes du contenu effectivement jouable ; aucune nouvelle image n’est générée par cette passe.
