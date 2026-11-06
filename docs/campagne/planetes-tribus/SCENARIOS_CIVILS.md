# Situations et boucles civiles — continuité des cinq communautés

[Contrat de raccord](README.md) · [Fiches des communautés](TRIBUS.md) · [Catalogue livré](ASSETS.md) · [Reprise V5](REPRISE.md) · [Textes source intégraux](TEXTES_SOURCE.json)

> **Propositions narratives conservées, sans nouvelle mission déclarée jouable.** Ce dossier reprend les vingt situations de membres et cinq enchaînements V4, puis les cinq boucles V5 avec leurs relations, lieux et objets. Il n’augmente pas le compte des 68 fiches historiques, qui comprend les huit chasses. V4 possède ses images sources ; les 40 sujets V5 sont désormais livrés, avec deux corrections de citernes décrites dans [la livraison](LIVRAISON_V5.md). Aucun dialogue, déclencheur, comportement ou test de jeu n’est attesté par la présence de ces textes.

Les paragraphes des cinq communautés proviennent de `LORE_ET_TRIBUS_YAUTJA_V4.md` et de `GUIDE_TRIBUS_V5.md`. Les corps narratifs sont conservés ; leurs liens sont remplacés par les entrées de cette annexe. Les IDs et noms de fichier restent visibles pour rattacher les rôles au même individu ou objet proposé. Le [registre des textes](TEXTES_SOURCE.json) conserve exactement les six guides/audit, leurs octets UTF-8 et leurs SHA-256, y compris les formulations historiques que le raccord actuel précise.

## Règles actuelles applicables à toutes les séquences

| Point | Règle de raccord |
| --- | --- |
| Autorité documentaire | Les décisions PT-01 à PT-12 du [README](README.md) et l’état de preuve des [sources de lore](SOURCES_LORE.md) priment sur les formulations historiques des guides. Leurs anciens bilans de consultation ne sont pas présentés comme une nouvelle vérification. |
| Identités | Réutiliser les mêmes IDs source et références V37. Une variante, une fonction citée à nouveau ou un contact dans une boucle ne crée pas un second PNJ. Les membres locaux restent distincts des individus déjà écrits, notamment Saar et Vek. |
| Recrutement et époque | Appliquer ALL-01 à ALL-10, l’affectation active, le vieillissement et la mort définitive. Un dialogue local ne recrute personne ; un rôle réutilisé après une ellipse exige de vérifier l’individu encore présent. Les habitants proposés n’occupent pas automatiquement le navire. |
| Rangs, titres et rites | Le Premier Cercle, les duels et épreuves locales sont des exercices ou responsabilités du projet. Aucun de ces scénarios ne remplace L-01 à L-10, les rites, la victoire et la preuve d’une reine, ni les conditions du vaisseau personnel ou du Clan Ship. |
| Trônes et royauté | Les sièges communaux ne décernent pas Elder, Clan Leader, Prince ou King. Cette règle conserve les titres royaux et les trônes de crêtes de reines définis ailleurs dans la bible, avec leurs conditions propres. |
| Citernes — corrections nécessaires | L’eau reste dans des récipients et circuits protégés. Les anciens `original_citerne_desert_v1` (`ORIGINAL_CITERNE_DESERT_V1.png`) et `prop_desert_origine_v2` (`PROP_DESERT_ORIGINE_V2.png`) restent livrés et référencés, mais demandent une correction de leurs surfaces/circuits d’eau exposés avant emploi selon ce contrat. La revue et les limites sont consignées dans [Vérification](VERIFICATION.md). |
| Autres habitats | Conserver la cité de pierre des Hautes Branches, les ateliers habités et entretenus des Forges Basses, les routes refroidies et les réserves de la Caldeira, et le refuge entièrement souterrain des Veilleurs sous une voûte rocheuse. Une ancienne illustration ne déroge pas à ces contraintes. |
| Corps et références | Les membres sont des Yautja biologiques. Aucun corps de lave, pouvoir lumineux, magie de soin, caste supplémentaire ou affiliation Bad Blood automatique ne découle de leur métier, de leur lieu de vie ou d’une figurine utilisée comme référence. |
| Accès et services | Ces séquences réutilisent les communautés et accès effectivement raccordés ; elles ne créent pas de nouveaux PLANxx, régions, origines ou salles fonctionnelles du vaisseau. Les choix encore ouverts restent indiqués dans [Raccord existant](RACCORD_EXISTANT.md) et [Reprise](REPRISE.md). |

Les formules « situation à jouer », « quête » et « boucle » dans les textes ci-dessous décrivent leur intention narrative. Avant une implémentation, il reste à fixer emplacement, état initial, conditions d’accès, présence des interlocuteurs, événements de progression, issues et reprise après sauvegarde, sans accorder de rang par une activité civile.

## Peuple des Citernes

### V4 — Relations, situations et enchaînement conservés

**Communauté originale du projet.** La vie collective s’organise autour d’établissements de grès, de réserves couvertes et de routes traversant le désert. Le bronze patiné, les cuirs couleur sable et quelques accents turquoise donnent une identité commune. Les protections contre la poussière relient visuellement les voyageurs aux lieux qu’ils entretiennent.

La Doyenne conserve les engagements pris devant la communauté, la Sentinelle contrôle matériellement les accès, le Pisteur connaît l’état des routes et l’Instructrice prépare les adultes aux sorties. Ces responsabilités se complètent : l’expérience du terrain peut faire modifier une décision collective. Le **Premier Cercle** est ici le nom local d’un groupe de formation adulte ; il ne remplace pas les rangs déjà établis dans le projet.

| Membre | Rôle et relation | Situation à jouer ou raconter |
|---|---|---|
| [Doyenne des Pactes](ASSETS.md) — `personnages_desert_doyenne_v4` (`MEMBRE_DESERT_DOYENNE_V4.png`) | Médiatrice âgée ; elle rappelle ce qui a été promis et demande au Pisteur ce qui est encore réalisable. Son bâton et ses marques d’usage signalent une histoire personnelle. | Deux départs concurrents réclament le même équipement. Elle charge le joueur de vérifier les besoins réels avant de faire déplacer les jetons de la table. |
| [Sentinelle des Réservoirs](ASSETS.md) — `personnages_desert_sentinelle_v4` (`MEMBRE_DESERT_SENTINELLE_V4.png`) | Garde des accès ; elle travaille avec l’Instructrice pour que les départs se fassent avec du matériel fermé et contrôlé. | Un verrou porte une trace récente. Le joueur doit déterminer si elle vient d’une réparation autorisée ou d’une entrée dissimulée, sans accuser un voisin sur cette seule marque. |
| [Pisteur des Vents de sable](ASSETS.md) — `personnages_desert_pisteur_v4` (`MEMBRE_DESERT_PISTEUR_V4.png`) | Éclaireur entre les établissements ; ses observations font parfois reporter une décision de la Doyenne. | Une piste pourtant familière a disparu sous une dune. Retrouver un ancien point de passage permet de rétablir une liaison et d’expliquer le retard d’une expédition. |
| [Instructrice du Premier Cercle](ASSETS.md) — `personnages_desert_instructrice_v4` (`MEMBRE_DESERT_INSTRUCTRICE_V4.png`) | Formatrice des adultes ; elle demande à la Sentinelle et au Pisteur de confronter les exercices aux difficultés réelles. | Son exercice impose de revenir avec tout le matériel et tous les participants. Le raccourci le plus rapide révèle une faiblesse que le joueur doit apprendre à reconnaître. |

La [Table des engagements](ASSETS.md) — `objets_desert_table_v4` (`OBJET_DESERT_TABLE_V4.png`) matérialise une discussion grâce à ses emplacements et à ses jetons. Une interface de dialogue peut expliquer leur signification sans prétendre traduire une écriture officielle. Le [Râtelier des lances de route](ASSETS.md) — `objets_desert_ratelier_v4` (`OBJET_DESERT_RATELIER_V4.png`) appartient à la préparation des départs ; son état peut signaler une expédition en cours, du matériel à réviser ou une restitution attendue.

La [Cour des départs](ASSETS.md) — `lieux_desert_cour_v4` (`LIEU_DESERT_COUR_V4.png`) accueille les vérifications, les échanges brefs et le retour des voyageurs. La [Maison des Pactes](ASSETS.md) — `lieux_desert_maison_v4` (`LIEU_DESERT_MAISON_V4.png`) donne de l’espace aux désaccords et à leur résolution. Les assises communes permettent de mettre en scène une médiation sans transformer chaque conversation en audience royale.

**Enchaînement proposé :** un retard de livraison apparaît dans la cour ; le Pisteur fournit les premiers indices ; la Sentinelle vérifie l’équipement ; la Maison des Pactes accueille la décision finale. La quête fait comprendre le fonctionnement de la communauté à travers un problème concret.

### V5 — Images livrées, services et boucle à réaliser

La pierre ocre, le bronze vieilli et les étoffes couleur sable prolongent la communauté désertique. L'eau reste protégée dans des conduites couvertes et des récipients fermés. Les nouvelles pièces privilégient l'ombre, des entrées abritées et des circulations sèches assez larges pour porter du matériel. Les tissus servent à préserver les personnes et les équipements de la poussière.

Le [Praticien des Retours](REPRISE.md) — `personnages_desert_praticien_v5` (`prompts/personnages_desert_praticien_v5.txt` ; PNG livré `MEMBRE_DESERT_PRATICIEN_V5.png`) reçoit les membres après une traversée et prépare le matériel destiné aux sorties suivantes. Sa carrure trapue, ses vêtements de travail et sa mallette fermée doivent exprimer une présence attentive. Il échange avec l'Hydrologue de V2 sur les besoins du lieu, et avec la Sentinelle des Réservoirs de V4 sur les retours attendus. Son activité est une fonction locale inventée ; aucune spécialité médicale canonique n'est revendiquée.

La [Tisseuse des Voiles de sable](REPRISE.md) — `personnages_desert_tisseuse_v5` (`prompts/personnages_desert_tisseuse_v5.txt` ; PNG livré `MEMBRE_DESERT_TISSEUSE_V5.png`) ajuste et entretient les protections textiles. Son rouleau de toile et sa navette la distinguent immédiatement de l'Intendante des caravanes. Elle peut reconnaître une usure de frottement, adapter un vêtement à un équipement ou expliquer pourquoi une protection a été retirée du service. Elle fournit ainsi des indices matériels aux récits du Pisteur des Vents de sable.

| Sujet préparé | Fonction et mise en scène |
|---|---|
| [Mallette de soins des pistes](REPRISE.md) — `objets_desert_mallette_v5` (`prompts/objets_desert_mallette_v5.txt` ; PNG livré `OBJET_DESERT_MALLETTE_V5.png`) | Ensemble transportable à compartiments ajustés : instruments protégés, contenants scellés et tissus propres. Son propriétaire et sa destination peuvent être nommés dans un dialogue. |
| [Lit de repos pliant](REPRISE.md) — `objets_desert_lit_v5` (`prompts/objets_desert_lit_v5.txt` ; PNG livré `OBJET_DESERT_LIT_V5.png`) | Couchage bas, large et robuste, utilisable lors d'un accueil temporaire ; ses quatre pieds et ses articulations devront rester lisibles. |
| [Coffre de séchage des voiles](REPRISE.md) — `objets_desert_sechoir_v5` (`prompts/objets_desert_sechoir_v5.txt` ; PNG livré `OBJET_DESERT_SECHOIR_V5.png`) | Armoire ventilée pour nettoyer à sec, sécher et ranger les protections, avec prise d'air protégée. |
| [Maison des Retours](REPRISE.md) — `lieux_desert_soins_v5` (`prompts/lieux_desert_soins_v5.txt` ; PNG livré `LIEU_DESERT_SOINS_V5.png`) | Infirmerie ombragée, alcôves de soins et réserves fermées ; les paravents préservent une certaine intimité. |
| [Chambrée des Traversées](REPRISE.md) — `lieux_desert_chambree_v5` (`prompts/lieux_desert_chambree_v5.txt` ; PNG livré `LIEU_DESERT_CHAMBREE_V5.png`) | Repos des voyageurs, couchages en retrait et casiers personnels ; une arrivée ne traverse pas les alcôves occupées. |
| [Toile pare-sable des Citernes](REPRISE.md) — `matieres_desert_toile_v5` (`prompts/matieres_desert_toile_v5.txt` ; PNG livré `MATIERE_DESERT_TOILE_V5.png`) | Référence de couleur ocre, tissage serré et renforcements cousus, commune aux voiles et à certains couchages. |

**Boucle proposée — Le voile qui revient.** Une expédition rapporte une protection détériorée. La Tisseuse identifie une abrasion inhabituelle, puis le joueur compare cette trace avec les passages décrits par le Pisteur. Retrouver une attache perdue révèle un détour devenu nécessaire. Le retour permet de préparer de nouveaux voiles et de rejoindre un voyageur dans la chambrée. La Maison des Pactes conserve son rôle de médiation ; les nouveaux lieux donnent leur place aux conséquences quotidiennes du trajet.

## Terrasses des Hautes Branches

### V4 — Relations, situations et enchaînement conservés

**Communauté originale du projet.** Il s’agit d’une cité habitée de pierre parmi des arbres gigantesques. Pyramides à degrés, terrasses, ponts soutenus et aqueducs constituent son ossature. La végétation traverse les vues et les ouvertures ; elle ne remplace pas les constructions. Les pierres gris vert, le bronze vieilli et les cuirs discrets unissent architecture et équipement.

Le Gardien conserve des récits familiaux et les circonstances des anciennes expéditions. Le Maître enseigne la maîtrise du mouvement ; la Traqueuse met cette formation à l’épreuve dans les étages supérieurs ; le Garde veille aux passages et aux accès des aqueducs. La connaissance d’une lignée donne ici du contexte et des obligations personnelles, sans définir une supériorité biologique ou un système universel de castes.

| Membre | Rôle et relation | Situation à jouer ou raconter |
|---|---|---|
| [Gardien des Mémoires](ASSETS.md) — `personnages_forest_gardien_v4` (`MEMBRE_FOREST_GARDIEN_V4.png`) | Ancien dépositaire des récits locaux ; il confronte la parole des vétérans aux marques conservées dans la galerie. | Une histoire souvent répétée omet le rôle d’un éclaireur. Une trace rapportée par le joueur oblige le Gardien à compléter le récit devant les personnes concernées. |
| [Traqueuse de Canopée](ASSETS.md) — `personnages_forest_traqueuse_v4` (`MEMBRE_FOREST_TRAQUEUSE_V4.png`) | Chasseuse des étages supérieurs ; elle échange ses itinéraires avec le Garde et corrige les exercices trop prévisibles du Maître. | Un passage végétal s’est déplacé après une tempête. Elle propose d’en trouver un autre en observant les appuis, les courants d’air et les signes laissés par la faune. |
| [Maître des Duels](ASSETS.md) — `personnages_forest_maitre_v4` (`MEMBRE_FOREST_MAITRE_V4.png`) | Instructeur responsable des exercices ; il fait de la précision et de la retenue des critères locaux d’évaluation. | Un adversaire d’entraînement pousse à prendre un risque inutile près d’une limite. Réussir consiste à conserver son contrôle et sa position, pas à produire le coup le plus spectaculaire. |
| [Garde des Aqueducs](ASSETS.md) — `personnages_forest_garde_v4` (`MEMBRE_FOREST_GARDE_V4.png`) | Patrouilleur des ponts et accès ; il garde les circulations libres et consulte la Traqueuse sur les voies hautes. | Des marques de passage se croisent près d’un ouvrage fermé. Le joueur doit suivre les traces jusqu’à une issue secondaire et comprendre qui l’utilise. |

La [Stèle des lignées](ASSETS.md) — `objets_forest_stele_v4` (`OBJET_FOREST_STELE_V4.png`) sert de support à la transmission orale : ses ramifications abstraites accompagnent des récits expliqués par le dialogue. Le [Support des masques de chasse](ASSETS.md) — `objets_forest_masques_v4` (`OBJET_FOREST_MASQUES_V4.png`) rassemble trois équipements vides. On peut associer à chacun un propriétaire ou une sortie précise, sans interpréter leurs formes comme trois castes officielles.

La [Cour des Épreuves](ASSETS.md) — `lieux_forest_epreuves_v4` (`LIEU_FOREST_EPREUVES_V4.png`) relie la formation au relief des terrasses, avec des appuis et des limites lisibles. La [Galerie des Lignées](ASSETS.md) — `lieux_forest_galerie_v4` (`LIEU_FOREST_GALERIE_V4.png`) est un lieu de parole et de mémoire où l’on retrouve les personnes après la sortie. Les épreuves qui y sont préparées demeurent des exercices locaux du projet ; ce nom n’en fait pas un rite attesté de la franchise.

**Enchaînement proposé :** un exercice dans la cour ouvre un itinéraire haut ; la Traqueuse accompagne sa reconnaissance ; le retour en galerie donne un autre sens à une histoire ancienne. L’architecture, le déplacement et le récit participent à la même séquence.

### V5 — Images livrées, services et boucle à réaliser

La communauté conserve sa cité monumentale de pierre : pyramides à degrés, ponts soutenus, terrasses et aqueducs parmi les arbres géants. Les nouvelles pièces prennent place dans cette maçonnerie. Leurs ouvertures laissent voir la végétation, tandis que les sols de circulation restent stables. Le bronze et les cuirs gris vert relient les équipements aux constructions existantes.

La [Soigneuse des Terrasses](REPRISE.md) — `personnages_forest_soigneuse_v5` (`prompts/personnages_forest_soigneuse_v5.txt` ; PNG livré `MEMBRE_FOREST_SOIGNEUSE_V5.png`) accueille les membres au Pavillon des Soins. Sa tenue pratique, ses gants et ses instruments fermés définissent son travail. La Traqueuse de Canopée lui décrit les conditions des sorties ; le Maître des Duels peut modifier un exercice à partir des retours reçus. Ces relations donnent une continuité humaine au quartier sans transformer la praticienne en soigneuse magique.

L'[Ajusteur des Harnais](REPRISE.md) — `personnages_forest_ajusteur_v5` (`prompts/personnages_forest_ajusteur_v5.txt` ; PNG livré `MEMBRE_FOREST_AJUSTEUR_V5.png`) entretient les sangles, boucles et points de fixation utilisés sur les trajets hauts. Son harnais replié et son outil de réglage créent une silhouette d'artisan distincte du Bâtisseur des canaux. Il travaille avec le Garde des Aqueducs lorsque l'accès à une corniche impose un portage particulier. Son expertise porte sur l'équipement ; la reconnaissance des itinéraires reste liée aux chasseurs et guides déjà établis.

| Sujet préparé | Fonction et mise en scène |
|---|---|
| [Siège de traitement des Terrasses](REPRISE.md) — `objets_forest_siege_v5` (`prompts/objets_forest_siege_v5.txt` ; PNG livré `OBJET_FOREST_SIEGE_V5.png`) | Assise utilitaire large, dossier bas réglable, appuis et petit plateau couvert ; sa forme doit correspondre aux soins. |
| [Banc de contrôle des harnais](REPRISE.md) — `objets_forest_banc_v5` (`prompts/objets_forest_banc_v5.txt` ; PNG livré `OBJET_FOREST_BANC_V5.png`) | Poste à cadre de tension et rangement des boucles, permettant de montrer une vérification avant départ. |
| [Casier des expéditions hautes](REPRISE.md) — `objets_forest_casier_v5` (`prompts/objets_forest_casier_v5.txt` ; PNG livré `OBJET_FOREST_CASIER_V5.png`) | Rangement personnel des ensembles de sortie ; chaque emplacement peut appartenir à un membre identifié. |
| [Pavillon des Soins](REPRISE.md) — `lieux_forest_pavillon_v5` (`prompts/lieux_forest_pavillon_v5.txt` ; PNG livré `LIEU_FOREST_PAVILLON_V5.png`) | Lieu de récupération relié aux terrasses par un accès praticable, avec zones de travail et de repos lisibles. |
| [Logis des Hauts Paliers](REPRISE.md) — `lieux_forest_logis_v5` (`prompts/lieux_forest_logis_v5.txt` ; PNG livré `LIEU_FOREST_LOGIS_V5.png`) | Habitation quotidienne où couchages, réserves et effets personnels donnent une échelle domestique à la cité. |
| [Cuir des harnais de canopée](REPRISE.md) — `matieres_forest_cuir_v5` (`prompts/matieres_forest_cuir_v5.txt` ; PNG livré `MATIERE_FOREST_CUIR_V5.png`) | Référence de cuir gris vert, grain usé et coutures fonctionnelles ; elle complète le tissu cérémoniel vert mousse de V2. |

**Boucle proposée — La boucle remplacée.** Deux harnais semblables ont été rangés ensemble, mais l'un possède une boucle adaptée à un portage précis. L'Ajusteur demande de retrouver son utilisateur dans les logis. La discussion conduit à reconnaître une ancienne voie de desserte avec le Garde. Une fois le trajet compris, le bon équipement rejoint son casier. Cette petite enquête relie habitation, préparation et déplacement ; les archives et la Galerie des Lignées conservent leur fonction de mémoire.

## Cour des Forges Basses

### V4 — Relations, situations et enchaînement conservés

**Communauté originale du projet.** Ce quartier habité associe maçonnerie, métal de vaisseau réparé, passerelles soutenues et ateliers partagés. Les reprises de cuivre doivent paraître ajustées et entretenues. L’acier graphite, les cuirs bruns et les lampes de travail ambrées expriment une culture matérielle commune, avec des espaces de vie distincts des postes de travail.

Le Doyen transmet les méthodes de réparation, l’Armurier répond du matériel qu’il prépare, la Gardienne conserve les accords entre ateliers et l’Éclaireur connaît les circulations du quartier. Le terme « contrat » est une convention du projet pour un engagement matérialisé ; il ne prétend pas décrire un droit commercial universel yautja. L’équipement réparé ou personnalisé n’implique aucune appartenance automatique aux Bad Bloods ou à la Rogue Space Tribe.

| Membre | Rôle et relation | Situation à jouer ou raconter |
|---|---|---|
| [Doyen des Assemblages](ASSETS.md) — `personnages_slums_doyen_v4` (`MEMBRE_SLUMS_DOYEN_V4.png`) | Artisan âgé ; il enseigne comment reconnaître les matériaux et transmet à l’Armurier ses réparations documentées. | Une pièce ancienne fonctionne encore, mais sa reprise cache un défaut. Le joueur doit choisir entre la conserver comme souvenir et la retirer d’un équipement utilisé en sortie. |
| [Gardienne des Contrats](ASSETS.md) — `personnages_slums_gardienne_v4` (`MEMBRE_SLUMS_GARDIENNE_V4.png`) | Médiatrice des échanges ; elle conserve les jetons d’accord et connaît les obligations des ateliers. | Deux artisans donnent des versions incompatibles d’un échange. Le coffre confirme les objets engagés, tandis qu’un témoin doit encore expliquer ce qui avait été promis oralement. |
| [Armurier des Gantelets](ASSETS.md) — `personnages_slums_armurier_v4` (`MEMBRE_SLUMS_ARMURIER_V4.png`) | Spécialiste des protections et mécanismes de poignet ; il s’appuie sur le Doyen pour les pièces rares et sur l’Éclaireur pour les retours de terrain. | Une série de gantelets se dérègle après un trajet précis. Une inspection sur place révèle si le problème vient de leur préparation, de l’environnement ou de leur usage. |
| [Éclaireur des Toits](ASSETS.md) — `personnages_slums_eclaireur_v4` (`MEMBRE_SLUMS_ECLAIREUR_V4.png`) | Reconnaisseur des accès supérieurs ; il transporte de petites pièces et rend compte de l’état des passerelles. | Une liaison habituelle est devenue impraticable. Il demande de tester un passage de service qui raccourcirait les échanges sans traverser les espaces de repos. |

Le [Coffre des contrats scellés](ASSETS.md) — `objets_slums_coffre_v4` (`OBJET_SLUMS_COFFRE_V4.png`) conserve les traces matérielles d’accords ; sa présence donne un point d’ancrage à une conversation de médiation. La [Table de troc](ASSETS.md) — `objets_slums_troc_v4` (`OBJET_SLUMS_TROC_V4.png`) permet d’exposer des pièces ou une offre précise. Les objets restent des meubles physiques ; leurs marques abstraites ne sont pas une traduction automatique d’un alphabet attesté.

La [Place du Troc](ASSETS.md) — `lieux_slums_place_v4` (`LIEU_SLUMS_PLACE_V4.png`) accueille les rencontres, les commandes et les départs des petits convois. La [Salle des Armements](ASSETS.md) — `lieux_slums_armements_v4` (`LIEU_SLUMS_ARMEMENTS_V4.png`) sert au rangement, au contrôle et à la préparation des équipements. Les deux lieux permettent de montrer le lien entre vie du quartier et sorties de chasse, en conservant des accès, des logements et de l’eau protégée.

**Enchaînement proposé :** un matériel revenu défectueux déclenche une discussion sur la place ; le joueur reconstitue son trajet avec l’Éclaireur ; l’Armurier effectue un diagnostic ; le Doyen et la Gardienne règlent la responsabilité. Le conflit porte sur un travail et ses conséquences, sans faire du quartier un repaire de renégats par principe.

### V5 — Images livrées, services et boucle à réaliser

Le quartier reste habité et entretenu. Le métal de vaisseau réparé, le cuivre sombre et les lumières ambrées doivent montrer des assemblages suivis dans le temps. Les espaces de soins et de nourriture disposent de rangement fermé et d'une séparation claire avec la poussière des ateliers. Leurs accès prolongent les passerelles existantes et facilitent les déplacements avec une charge.

La [Régulatrice des Cellules](REPRISE.md) — `personnages_slums_regulatrice_v5` (`prompts/personnages_slums_regulatrice_v5.txt` ; PNG livré `MEMBRE_SLUMS_REGULATRICE_V5.png`) contrôle des modules d'alimentation conçus pour ce quartier. Elle suit leur affectation et leur état, en relation avec l'Armurier des Gantelets et le Doyen des Assemblages de V4. Son rôle permet de raconter la préparation d'une sortie ou une pénurie locale. Le modèle de cellule et son fonctionnement demeurent des inventions du projet.

Le [Praticien des Ateliers](REPRISE.md) — `personnages_slums_praticien_v5` (`prompts/personnages_slums_praticien_v5.txt` ; PNG livré `MEMBRE_SLUMS_PRATICIEN_V5.png`) accueille artisans et voyageurs dans un service distinct des postes de réparation. Sa relation avec la Mécanicienne des passerelles peut faire apparaître les conséquences d'un accès mal adapté, tandis que la Gardienne des Contrats aide à organiser une livraison attendue. Le personnage ajoute un interlocuteur disponible après les missions, avec ses propres contraintes et responsabilités.

| Sujet préparé | Fonction et mise en scène |
|---|---|
| [Station de recharge verrouillée](REPRISE.md) — `objets_slums_recharge_v5` (`prompts/objets_slums_recharge_v5.txt` ; PNG livré `OBJET_SLUMS_RECHARGE_V5.png`) | Rangement et recharge de cellules dans des emplacements protégés ; l'affectation du matériel peut devenir un élément de dialogue. |
| [Brancard des Ateliers](REPRISE.md) — `objets_slums_brancard_v5` (`prompts/objets_slums_brancard_v5.txt` ; PNG livré `OBJET_SLUMS_BRANCARD_V5.png`) | Mobilier de transport robuste dont la largeur doit rester compatible avec les voies de service prévues. |
| [Armoire des rations scellées](REPRISE.md) — `objets_slums_rations_v5` (`prompts/objets_slums_rations_v5.txt` ; PNG livré `OBJET_SLUMS_RATIONS_V5.png`) | Conservation de provisions fermées, distincte des casiers de pièces et de la jardinière hydroponique V2. |
| [Infirmerie des Ateliers](REPRISE.md) — `lieux_slums_infirmerie_v5` (`prompts/lieux_slums_infirmerie_v5.txt` ; PNG livré `LIEU_SLUMS_INFIRMERIE_V5.png`) | Pièce entretenue, rangements couverts et accès dégagé ; les équipements salissants restent hors des espaces de soins. |
| [Cuisine des Échanges](REPRISE.md) — `lieux_slums_cuisine_v5` (`prompts/lieux_slums_cuisine_v5.txt` ; PNG livré `LIEU_SLUMS_CUISINE_V5.png`) | Préparation de vivres pour le quartier et les sorties ; les portions préparées rendent les départs perceptibles. |
| [Cuir matelassé des Ateliers](REPRISE.md) — `matieres_slums_cuir_v5` (`prompts/matieres_slums_cuir_v5.txt` ; PNG livré `MATIERE_SLUMS_CUIR_V5.png`) | Référence de protections souples réparées et rembourrées, complément de l'acier graphite soudé de V2. |

**Boucle proposée — Une tournée de trop.** Une même cellule a été réservée pour deux livraisons. La Régulatrice demande au joueur de reconstituer leurs besoins réels auprès de la cuisine et de l'infirmerie. Un détour par une passerelle de service permet de regrouper les trajets. La réussite vient de la connaissance du quartier et des échanges avec ses habitants. La Place du Troc peut ensuite accueillir la remise du matériel et un désaccord résolu avec la Gardienne des Contrats.

## Forges de la Caldeira

### V4 — Relations, situations et enchaînement conservés

**Communauté originale du projet.** La forteresse volcanique dispose de terrasses sèches et refroidies, de ponts protégés et de logements séparés des zones de forge. Basalte noir, bronze marqué par la chaleur, cuirs sombres et lumière ambrée servent la même logique. Les lueurs orangées du milieu ne sont pas des fissures lumineuses dans les corps.

L’Ancienne transmet l’histoire des usages de la forteresse, le Gardien surveille les passages exposés, la Traqueuse observe les pentes et le Maître organise les exercices des adultes. Leurs décisions concernent un lieu dangereux mais habitable. La prudence et l’entretien sont des compétences utiles aux chasseurs ; l’appartenance à cette communauté n’accorde pas une immunité à la chaleur.

| Membre | Rôle et relation | Situation à jouer ou raconter |
|---|---|---|
| [Ancienne des Scories](ASSETS.md) — `personnages_lava_ancienne_v4` (`MEMBRE_LAVA_ANCIENNE_V4.png`) | Dépositaire des récits de la forteresse ; elle distingue les objets conservés pour leur histoire de ceux encore aptes au service. | Une marque sur une ancienne protection renvoie à un épisode oublié. Elle demande de retrouver le lieu de cet événement avant d’autoriser une nouvelle sortie par le même passage. |
| [Gardien des Ponts Chauds](ASSETS.md) — `personnages_lava_gardien_v4` (`MEMBRE_LAVA_GARDIEN_V4.png`) | Garde des accès exposés ; il croise ses inspections avec les observations de la Traqueuse. | Une voie paraît sèche mais son exposition a changé. Le joueur doit reconnaître les accès praticables et rétablir les repères qui guideront les retours. |
| [Traqueuse des Cendres](ASSETS.md) — `personnages_lava_traqueuse_v4` (`MEMBRE_LAVA_TRAQUEUSE_V4.png`) | Chasseuse des pentes froides et champs de cendre ; elle rapporte au Gardien des observations que les postes fixes ne permettent pas de faire. | Des traces disparaissent puis réapparaissent plus haut. Les suivre permet de comprendre comment une proie contourne une zone devenue instable. |
| [Maître des Épreuves](ASSETS.md) — `personnages_lava_maitre_v4` (`MEMBRE_LAVA_MAITRE_V4.png`) | Formateur des adultes ; il travaille avec le Gardien pour adapter les exercices aux contraintes réelles des sorties. | Un exercice comporte un retour avec équipement encombrant. Le joueur doit conserver une marge de déplacement et savoir interrompre une tentative au bon moment. |

L’[Enclume des marques](ASSETS.md) — `objets_lava_enclume_v4` (`OBJET_LAVA_ENCLUME_V4.png`) est un poste de travail pour appliquer des signes locaux aux objets. Ces signes peuvent identifier un atelier ou une étape de maintenance dans le récit, sans remplacer les rites de rang du projet. Le [Râtelier refroidi des armures](ASSETS.md) — `objets_lava_ratelier_v4` (`OBJET_LAVA_RATELIER_V4.png`) accompagne les retours de sortie ; il peut porter des pièces en contrôle, mais l’image seule ne signifie pas qu’un système de refroidissement jouable est intégré.

La [Terrasse des Épreuves](ASSETS.md) — `lieux_lava_terrasse_v4` (`LIEU_LAVA_TERRASSE_V4.png`) garde ses aires de formation loin des coulées. Le [Réfectoire des Forges](ASSETS.md) — `lieux_lava_refectoire_v4` (`LIEU_LAVA_REFECTOIRE_V4.png`) montre un lieu de repas et de repos protégé, utile pour les échanges après une mission. Des habitants doivent pouvoir y exister autrement qu’en posture de combat permanente.

**Enchaînement proposé :** une inspection entraîne la fermeture d’une voie ; la Traqueuse fournit une piste de contournement ; le Maître prépare le déplacement ; le réfectoire accueille le récit du retour. Lava Planet reste une référence indirecte de figurine, pas le nom du fondateur de cette communauté.

### V5 — Images livrées, services et boucle à réaliser

La forteresse volcanique reste habitable grâce à ses terrasses sèches, ses protections, ses réserves et ses accès soutenus. Les coulées demeurent loin sous les routes occupées. La céramique claire introduite dans cette passe rend certaines doublures isolantes visibles parmi le basalte noir et le bronze marqué par la chaleur. Les habitants conservent des corps biologiques et doivent prendre soin de leur équipement.

La [Contrôleuse des Écrans thermiques](REPRISE.md) — `personnages_lava_controleuse_v5` (`prompts/personnages_lava_controleuse_v5.txt` ; PNG livré `MEMBRE_LAVA_CONTROLEUSE_V5.png`) inspecte les protections après les sorties et prépare leur remplacement. Elle transmet ses observations au Gardien des Ponts Chauds ; le Fondeur de V2 intervient lorsque le travail dépasse un simple changement de pièce. Cette répartition ajoute une étape concrète entre la fabrication et l'usage, sans refaire un autre personnage de forgeron.

Le [Ravitailleur des Hauts Fourneaux](REPRISE.md) — `personnages_lava_ravitailleur_v5` (`prompts/personnages_lava_ravitailleur_v5.txt` ; PNG livré `MEMBRE_LAVA_RAVITAILLEUR_V5.png`) transporte provisions et consommables sur les voies protégées. Il connaît les largeurs, les paliers où poser une charge et les moments où les équipes se relaient. Ses échanges avec le Réfectoire des Forges et la Soigneuse déjà présente en V2 ancrent son rôle dans la communauté existante. Aucun nouveau médecin n'est ajouté à cette tribu.

| Sujet préparé | Fonction et mise en scène |
|---|---|
| [Cabine de dépoussiérage](REPRISE.md) — `objets_lava_cabine_v5` (`prompts/objets_lava_cabine_v5.txt` ; PNG livré `OBJET_LAVA_CABINE_V5.png`) | Installation fermée pour retirer les cendres avant l'entrée dans les pièces habitées. |
| [Porte-charge de ravitaillement](REPRISE.md) — `objets_lava_portecharge_v5` (`prompts/objets_lava_portecharge_v5.txt` ; PNG livré `OBJET_LAVA_PORTECHARGE_V5.png`) | Support de transport pour les caisses, avec points de prise et appuis lisibles. |
| [Borne d'inspection thermique](REPRISE.md) — `objets_lava_inspection_v5` (`prompts/objets_lava_inspection_v5.txt` ; PNG livré `OBJET_LAVA_INSPECTION_V5.png`) | Poste consacré au contrôle matériel des plaques isolantes ; il complète le refroidisseur V2. |
| [Salle de Dépoussiérage](REPRISE.md) — `lieux_lava_depoussierage_v5` (`prompts/lieux_lava_depoussierage_v5.txt` ; PNG livré `LIEU_LAVA_DEPOUSSIERAGE_V5.png`) | Transition entre routes exposées et quartiers intérieurs, avec espace pour déposer les équipements. |
| [Chambrée des Veilles](REPRISE.md) — `lieux_lava_chambree_v5` (`prompts/lieux_lava_chambree_v5.txt` ; PNG livré `LIEU_LAVA_CHAMBREE_V5.png`) | Repos des équipes de relève, à l'abri des foyers, avec alcôves larges et rangements personnels. |
| [Céramique isolante de la Caldeira](REPRISE.md) — `matieres_lava_ceramique_v5` (`prompts/matieres_lava_ceramique_v5.txt` ; PNG livré `MATIERE_LAVA_CERAMIQUE_V5.png`) | Référence de surface gris clair, refroidie, non lumineuse, différente de l'alliage segmenté V2. |

**Boucle proposée — Le passage de relève.** Une inspection immobilise des protections juste avant une livraison. La Contrôleuse identifie les équipements encore utilisables, puis le Ravitailleur propose un itinéraire intérieur plus long. Le joueur transporte une charge en utilisant les paliers et rejoint la nouvelle salle de transition. La livraison aboutit à la chambrée, où une équipe attend sa relève. Le récit valorise l'entraide et la connaissance des lieux tout en conservant la dangerosité du milieu.

## Refuge des Veilleurs

### V4 — Relations, situations et enchaînement conservés

**Communauté originale du projet.** Le refuge se trouve entièrement sous terre, dans une vaste caverne contenant des arbres et des fleurs bioluminescents. La voûte rocheuse doit rester visible dans les lieux. Les terrasses de pierre sont sèches et surélevées ; les plantes éclairent en cyan et violet, tandis que de petits signaux utilitaires ambrés marquent les accès. La surface noire et la forêt souterraine sont deux espaces distincts.

La Gardienne conserve les récits d’expédition, la Sentinelle veille aux accès, le Tisseur entretient les filets et la Chasseuse reconnaît les passages bas. Leur savoir se construit par l’observation, les traces et le retour d’expérience. Les lumières végétales ne sont pas une conscience collective et les pigments des armures ne leur confèrent aucun pouvoir biologique.

| Membre | Rôle et relation | Situation à jouer ou raconter |
|---|---|---|
| [Gardienne des Récits](ASSETS.md) — `personnages_darkjungle_gardienne_v4` (`MEMBRE_DARKJUNGLE_GARDIENNE_V4.png`) | Ancienne chargée de la transmission orale ; elle conserve les différents témoignages plutôt que de les réduire à une version héroïque. | Deux survivants décrivent différemment une ancienne sortie. Le joueur retrouve une trace matérielle qui explique la divergence sans effacer leur expérience. |
| [Sentinelle des Voûtes](ASSETS.md) — `personnages_darkjungle_sentinelle_v4` (`MEMBRE_DARKJUNGLE_SENTINELLE_V4.png`) | Garde des accès et des terrasses ; elle utilise les observations de la Chasseuse pour savoir quels passages rouvrir. | Un signal utilitaire s’est éteint dans un embranchement. Il faut identifier la bonne voie grâce au relief et aux repères matériels, puis rétablir le balisage. |
| [Tisseur de Filets](ASSETS.md) — `personnages_darkjungle_tisseur_v4` (`MEMBRE_DARKJUNGLE_TISSEUR_V4.png`) | Artisan des liens et filets de chasse ; il travaille à partir des usages décrits par les chasseurs. | Un filet revient usé sur un seul côté. Comprendre comment il a servi permet d’en adapter la tension et d’éviter de reproduire le problème. |
| [Chasseuse de l’Ombre Basse](ASSETS.md) — `personnages_darkjungle_chasseuse_v4` (`MEMBRE_DARKJUNGLE_CHASSEUSE_V4.png`) | Chasseuse des passages entre les racines ; elle teste les équipements du Tisseur et rapporte ses itinéraires à la Sentinelle. | Une piste connue traverse désormais une poussée de racines. Elle cherche un chemin discret qui préserve ses appuis et permet un retour avec le matériel. |

La [Mémoire des chasses](ASSETS.md) — `objets_darkjungle_memoire_v4` (`OBJET_DARKJUNGLE_MEMOIRE_V4.png`) associe des jetons, des ornements et des marques à des récits précis. Elle est un objet de transmission, pas un réceptacle d’âmes. Le [Métier à filets](ASSETS.md) — `objets_darkjungle_metier_v4` (`OBJET_DARKJUNGLE_METIER_V4.png`) donne au Tisseur un poste reconnaissable. Les filets de cette passe sont des assemblages matériels du projet ; leur fonctionnement exact doit être défini séparément pour le jeu.

La [Cour des Retours](ASSETS.md) — `lieux_darkjungle_cour_v4` (`LIEU_DARKJUNGLE_COUR_V4.png`) accueille les expéditions sur une terrasse de pierre, avec du rangement et des assises. La [Salle des Récits](ASSETS.md) — `lieux_darkjungle_salle_v4` (`LIEU_DARKJUNGLE_SALLE_V4.png`) offre un lieu partagé où les chasseurs rendent compte de ce qu’ils ont vu. Les arches permettent de garder la forêt lumineuse présente tout en affirmant l’espace construit.

**Enchaînement proposé :** le retour d’un filet abîmé conduit à reconnaître un passage ; la Chasseuse et la Sentinelle confrontent leurs indications ; le joueur retrouve une ancienne marque ; la Salle des Récits permet d’inscrire cette découverte dans la mémoire locale. Les personnages et objets isolés restent sans décor : la voûte appartient aux deux images de lieux.

### V5 — Images livrées, services et boucle à réaliser

La surface reste noire et la communauté habite entièrement sous terre. Dans les futurs lieux, la voûte rocheuse doit être visible, avec une forêt de plantes lumineuses au-delà des ouvertures. Les terrasses sont sèches et surélevées. Les lampes utilitaires ambrées se distinguent des lueurs cyan et violettes de la végétation ; les zones de repos utilisent des écrans opaques.

Le [Régleur des Optiques](REPRISE.md) — `personnages_darkjungle_regleur_v5` (`prompts/personnages_darkjungle_regleur_v5.txt` ; PNG livré `MEMBRE_DARKJUNGLE_REGLEUR_V5.png`) entretient les instruments personnels de vision. Son biomask fermé et son coffret de précision le distinguent du Guide des racines profondes. La Sentinelle des Voûtes lui rapporte des observations, mais il doit comparer celles-ci avec le terrain avant d'attribuer toute anomalie à un appareil. Les capteurs précis et leurs procédures restent à définir pour le projet.

La [Préparatrice des Remèdes](REPRISE.md) — `personnages_darkjungle_preparatrice_v5` (`prompts/personnages_darkjungle_preparatrice_v5.txt` ; PNG livré `MEMBRE_DARKJUNGLE_PREPARATRICE_V5.png`) conserve les fournitures de soins dans des contenants protégés et prépare leur mise à disposition. Elle échange avec le Botaniste V2 sans supposer que chaque plante lumineuse possède une propriété curative. Ses préparations sont fictionnelles, sans recette ni effet surnaturel affirmé. Elle apporte également un point de contact après les sorties de la Chasseuse de l'Ombre Basse.

| Sujet préparé | Fonction et mise en scène |
|---|---|
| [Coffret d'alignement optique](REPRISE.md) — `objets_darkjungle_optiques_v5` (`prompts/objets_darkjungle_optiques_v5.txt` ; PNG livré `OBJET_DARKJUNGLE_OPTIQUES_V5.png`) | Ensemble de précision avec supports et logements de lentilles ; aucun rayon magique ou visage incorporé. |
| [Capsule de repos occultante](REPRISE.md) — `objets_darkjungle_repos_v5` (`prompts/objets_darkjungle_repos_v5.txt` ; PNG livré `OBJET_DARKJUNGLE_REPOS_V5.png`) | Couchage bas à capot opaque et doublure souple, destiné au repos ordinaire. |
| [Mallette des préparations](REPRISE.md) — `objets_darkjungle_preparations_v5` (`prompts/objets_darkjungle_preparations_v5.txt` ; PNG livré `OBJET_DARKJUNGLE_PREPARATIONS_V5.png`) | Contenants fermés, tissus propres et instruments protégés, transportables dans le refuge. |
| [Atelier des Optiques](REPRISE.md) — `lieux_darkjungle_atelier_v5` (`prompts/lieux_darkjungle_atelier_v5.txt` ; PNG livré `LIEU_DARKJUNGLE_ATELIER_V5.png`) | Espace sec de travail de précision, avec lampes protégées et vue latérale sur la forêt cavernicole. |
| [Alcôves du Silence](REPRISE.md) — `lieux_darkjungle_alcoves_v5` (`prompts/lieux_darkjungle_alcoves_v5.txt` ; PNG livré `LIEU_DARKJUNGLE_ALCOVES_V5.png`) | Galerie de repos à rideaux sombres, couchages en retrait et réserves personnelles. |
| [Fibres silencieuses des Veilleurs](REPRISE.md) — `matieres_darkjungle_fibres_v5` (`prompts/matieres_darkjungle_fibres_v5.txt` ; PNG livré `MATIERE_DARKJUNGLE_FIBRES_V5.png`) | Référence de fibres mates bleu noir et rares fils cyan non lumineux, pour doublures et protections souples. |

**Boucle proposée — Le signal décalé.** Un membre décrit un repère lumineux à une position différente de celle attendue. Le Régleur vérifie son équipement ; le joueur rejoint ensuite le Guide et constate une nouvelle pousse végétale près de l'ancien repère. Une fois le passage reconnu, la Sentinelle actualise ses indications. Le récit du retour peut rejoindre la salle V4, tandis que les Alcôves du Silence offrent une fin calme à l'expédition.

## Conservation et suite

Les vingt situations V4, les cinq enchaînements V4 et les cinq boucles V5 sont conservés ici sans ajout d’une nouvelle intrigue. Les membres, objets et lieux renvoient aux mêmes identifiants que les inventaires. Les guides V2 et V3, le guide d’utilisation V4 et l’audit de continuité V5 restent également disponibles dans [TEXTES_SOURCE.json](TEXTES_SOURCE.json).

La production suit [REPRISE.md](REPRISE.md), les [consignes V5](REPRISE_V5.json), les règles d’habitat de [TRIBUS.md](TRIBUS.md) et l’état de preuve révisé de [SOURCES_LORE.md](SOURCES_LORE.md). Les formulations historiques sur les sources, quotas ou livraisons ne remplacent pas ces états actuels.
