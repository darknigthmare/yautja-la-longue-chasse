# Reprise — images, usages et validation

[Contrat de raccord](README.md) · [Images livrées](ASSETS.md) ·
[Quarante consignes V5](REPRISE_V5.json) · [Scénarios civils](SCENARIOS_CIVILS.md).

## État de production au 6 novembre 2026

**204 sources V2-V4 conservées + 40 sujets V5 livrés + 2 citernes corrigées = 246 PNG sources.**
Les 40 jobs ci-dessous possèdent leur PNG natif contrôlé. Les archives, dimensions,
consignes réelles, références et empreintes sont dans [la livraison V5](LIVRAISON_V5.md)
et [son manifeste](LIVRAISON_V5.json). Le catalogue runtime V37 référence toujours
les 204 anciennes sources ; les 42 nouvelles sorties restent à importer selon usage.

Les **42 PNG produits et contrôlés sont remis dans la conversation**, dans six archives. **Nouvelles archives sauvegardées durablement : 0 sur 6.** La sauvegarde durable a échoué lors de `prepare_uploads`, avant transfert/finalisation. Pour les fichiers sans identifiant retourné, aucun lien durable n'est annoncé : **fichier remis dans la conversation ; lien durable en attente**. Les liens de session sont fournis dans la conversation et ne sont pas publiés comme adresses web dans ce dépôt.

Le quota de septembre reste conservé dans les champs historiques. Il ne décrit
pas cette passe, qui a réellement produit les images. Les sources anciennes ne
sont pas écrasées : les deux citernes protégées ont leurs propres IDs et SHA.
Les quinze prompts V1 introuvables restent nuls ; les corrections ont des consignes
nouvelles identifiées, sans reconstruction prétendue des anciens prompts.

## Ordre de travail proposé

| Étape | Travail concret | Sortie attendue |
| --- | --- | --- |
| P0 — Raccorder | Réutiliser les identifiants V37 ; régler l'homonymie Cour/Enclave des Forges Basses, le lieu des Veilleurs et les divergences de verrous de région ; définir les identités des membres retenus | Correspondance enregistrée, sans recréer mondes, PNJ ou bibliothèques existants |
| P1 — Variantes de citerne livrées ; adaptation à suivre | Sélectionner les variantes protégées PT-ART-01-V1 et PT-ART-01-V2 pour leurs usages ; revoir les dérivés et les autres images dans la scène cible | Deux PNG natifs contrôlés, originaux conservés ; adaptation et remplacement des anciens dérivés encore à réaliser |
| P2 — 40 PNG V5 livrés | Consulter les PNG contrôlés, leurs références inspectées et leurs consignes réelles dans LIVRAISON_V5.json ; choisir les usages à adapter | 40 sorties individuelles livrées : 25 avec alpha, 10 scènes complètes et 5 matières opaques |
| P3 — Préparer les usages | Définir poses, pièces mobiles, portraits, pivots, échelle, surfaces praticables, interactions, sons et états nécessaires à une boucle civile | Ressources adaptées à une scène, distinctes des simples images de référence |
| P4 — Raccorder une boucle | Réutiliser les systèmes de région, navigation, personnages, dialogues et sauvegarde ; tester arrivée, service, sortie et reprise | Une boucle réellement parcourue et vérifiée avant extension aux autres |
| P5 — Étendre et valider | Étendre les usages retenus, revoir les variantes et les références de continuité, consigner les preuves et le reste à faire | Statuts d'intégration et de validation mis à jour seulement sur résultats observés |

Le plan initial conserve ses 40 sujets. Les deux corrections de citerne livrées
sous les IDs `PT-ART-01-V1` et `PT-ART-01-V2` s'ajoutent à ce plan dans l'archive
de production V5, qui contient donc 42 PNG. Les futurs états animés, variantes
d'âge et compléments Glacier/Marais éventuels restent des chantiers distincts,
à délimiter avant de leur attribuer un nombre de fichiers ou un statut livré.

## Les quarante sujets V5

Les identifiants, noms de fichier livrés, prompts sources complets, références R01–R07
et usages d'origine sont conservés dans [REPRISE_V5.json](REPRISE_V5.json).
Chaque groupe ci-dessous comprend deux membres, trois objets, deux lieux et
une matière. **Toutes les lignes disposent maintenant de leur PNG contrôlé.**

<!-- jobs-v5:start -->
### DESERT — Peuple des Citernes

| ID source | Sujet livré | Usage proposé | Format livré |
| --- | --- | --- | --- |
| `personnages_desert_praticien_v5` | Praticien des Retours | Spécialiste des soins au retour des expéditions ; rôle local original. | PNG avec alpha |
| `personnages_desert_tisseuse_v5` | Tisseuse des Voiles de sable | Artisane des voiles et protections contre la poussière. | PNG avec alpha |
| `objets_desert_mallette_v5` | Mallette de soins des pistes | Matériel de soins transportable pour les pistes du désert. | PNG avec alpha |
| `objets_desert_lit_v5` | Lit de repos pliant | Mobilier de récupération temporaire après une traversée. | PNG avec alpha |
| `objets_desert_sechoir_v5` | Coffre de séchage des voiles | Armoire de nettoyage à sec et de rangement des voiles. | PNG avec alpha |
| `lieux_desert_soins_v5` | Maison des Retours | Infirmerie du quartier des caravanes, distincte de la Maison des Pactes. | Scène opaque |
| `lieux_desert_chambree_v5` | Chambrée des Traversées | Lieu de repos des voyageurs entre deux expéditions. | Scène opaque |
| `matieres_desert_toile_v5` | Toile pare-sable des Citernes | Référence de couleur et de fibres pour les voiles et la literie. | Matière opaque |

### FOREST — Terrasses des Hautes Branches

| ID source | Sujet livré | Usage proposé | Format livré |
| --- | --- | --- | --- |
| `personnages_forest_soigneuse_v5` | Soigneuse des Terrasses | Praticienne chargée des soins dans les terrasses habitées. | PNG avec alpha |
| `personnages_forest_ajusteur_v5` | Ajusteur des Harnais | Artisan du réglage et de l’entretien des harnais de canopée. | PNG avec alpha |
| `objets_forest_siege_v5` | Siège de traitement des Terrasses | Siège utilitaire du pavillon de soins. | PNG avec alpha |
| `objets_forest_banc_v5` | Banc de contrôle des harnais | Poste de vérification des sangles et boucles avant les sorties. | PNG avec alpha |
| `objets_forest_casier_v5` | Casier des expéditions hautes | Rangement personnel des équipements de canopée. | PNG avec alpha |
| `lieux_forest_pavillon_v5` | Pavillon des Soins | Lieu de récupération et de soins relié aux terrasses de pierre. | Scène opaque |
| `lieux_forest_logis_v5` | Logis des Hauts Paliers | Habitation quotidienne des membres établis dans les hauts paliers. | Scène opaque |
| `matieres_forest_cuir_v5` | Cuir des harnais de canopée | Référence de matière pour les harnais et protections souples. | Matière opaque |

### SLUMS — Cour des Forges Basses

| ID source | Sujet livré | Usage proposé | Format livré |
| --- | --- | --- | --- |
| `personnages_slums_regulatrice_v5` | Régulatrice des Cellules | Spécialiste du contrôle des cellules d’alimentation du quartier. | PNG avec alpha |
| `personnages_slums_praticien_v5` | Praticien des Ateliers | Praticien chargé des soins des artisans et des voyageurs. | PNG avec alpha |
| `objets_slums_recharge_v5` | Station de recharge verrouillée | Équipement local de recharge et de rangement des cellules. | PNG avec alpha |
| `objets_slums_brancard_v5` | Brancard des Ateliers | Mobilier de transport vers l’infirmerie du quartier. | PNG avec alpha |
| `objets_slums_rations_v5` | Armoire des rations scellées | Conservation des provisions de la cuisine collective. | PNG avec alpha |
| `lieux_slums_infirmerie_v5` | Infirmerie des Ateliers | Service de soins distinct des ateliers de réparation. | Scène opaque |
| `lieux_slums_cuisine_v5` | Cuisine des Échanges | Préparation des vivres destinés aux ateliers et aux sorties. | Scène opaque |
| `matieres_slums_cuir_v5` | Cuir matelassé des Ateliers | Référence de matière pour les protections souples des artisans. | Matière opaque |

### LAVA — Forges de la Caldeira

| ID source | Sujet livré | Usage proposé | Format livré |
| --- | --- | --- | --- |
| `personnages_lava_controleuse_v5` | Contrôleuse des Écrans thermiques | Spécialiste de l’inspection des écrans et protections thermiques. | PNG avec alpha |
| `personnages_lava_ravitailleur_v5` | Ravitailleur des Hauts Fourneaux | Transport des provisions et consommables sur les routes protégées. | PNG avec alpha |
| `objets_lava_cabine_v5` | Cabine de dépoussiérage | Équipement fermé de retrait des cendres avant les quartiers habités. | PNG avec alpha |
| `objets_lava_portecharge_v5` | Porte-charge de ravitaillement | Transport des caisses sur les passerelles praticables. | PNG avec alpha |
| `objets_lava_inspection_v5` | Borne d’inspection thermique | Contrôle matériel des plaques isolantes après les sorties. | PNG avec alpha |
| `lieux_lava_depoussierage_v5` | Salle de Dépoussiérage | Transition entre les zones exposées aux cendres et les lieux de repos. | Scène opaque |
| `lieux_lava_chambree_v5` | Chambrée des Veilles | Repos des équipes qui se relaient sur les niveaux de la forteresse. | Scène opaque |
| `matieres_lava_ceramique_v5` | Céramique isolante de la Caldeira | Référence de matière pour les écrans et doublures isolantes. | Matière opaque |

### DARKJUNGLE — Refuge des Veilleurs

| ID source | Sujet livré | Usage proposé | Format livré |
| --- | --- | --- | --- |
| `personnages_darkjungle_regleur_v5` | Régleur des Optiques | Spécialiste de l’entretien des optiques et capteurs personnels. | PNG avec alpha |
| `personnages_darkjungle_preparatrice_v5` | Préparatrice des Remèdes | Préparation et conservation des soins matériels du refuge. | PNG avec alpha |
| `objets_darkjungle_optiques_v5` | Coffret d’alignement optique | Matériel d’entretien des instruments de vision. | PNG avec alpha |
| `objets_darkjungle_repos_v5` | Capsule de repos occultante | Mobilier de repos isolé de la lumière et du passage. | PNG avec alpha |
| `objets_darkjungle_preparations_v5` | Mallette des préparations | Conservation des préparations et pansements du refuge. | PNG avec alpha |
| `lieux_darkjungle_atelier_v5` | Atelier des Optiques | Atelier d’entretien des équipements de vision du refuge. | Scène opaque |
| `lieux_darkjungle_alcoves_v5` | Alcôves du Silence | Quartiers de repos protégés de la lumière et des circulations. | Scène opaque |
| `matieres_darkjungle_fibres_v5` | Fibres silencieuses des Veilleurs | Référence de matière pour les doublures et protections souples. | Matière opaque |

<!-- jobs-v5:end -->

## Dépendances et absences de doublon

| Communauté | S'appuyer sur les ressources déjà produites | Ne pas recréer par inadvertance |
| --- | --- | --- |
| Citernes | Hydrologue, intendante, sentinelle, pisteur, cour, réserves couvertes et palette ocre/bronze | Une seconde intendante ou une citerne supplémentaire présentée comme le coffre de séchage V5 |
| Hautes Branches | Bâtisseur, archiviste, traqueuse, garde, cité de pierre et aqueducs | Une nouvelle archive à la place du pavillon ; le tissu cérémoniel V2 à la place du cuir de harnais V5 |
| Forges Basses | Mécanicienne, négociant, armurier, doyen, atelier, place et armurerie | Un second établi/terminal de diagnostic à la place de la recharge ; un nouvel habitant copié d'une variante V84 sans identité |
| Caldeira | Fondeur, Soigneuse des Forges, gardien, refroidisseur, râtelier et réfectoire | Un second médecin : V5 ajoute contrôle thermique et ravitaillement ; pas une nouvelle forge identique à V2 |
| Veilleurs | Botaniste, guide, sentinelle, pépinière, balise et métier à filets | Un autre botaniste à la place de la préparatrice ; un autre guide à la place du régleur ; un refuge à ciel ouvert |

Les fonctions civiles et les dispositifs médicaux sont des inventions du projet.
Une fiche Jungle Hunter générique n'atteste pas un instrument de soin précis.
La préparatrice des Veilleurs ne reçoit ni recette réelle ni pouvoir curatif
surnaturel par déduction de la couleur d'une plante.

## Contrat de génération et d'adaptation

1. Reprendre le `source_record.prompt` du job, puis ajouter le raccord actuel
   PT-01 à PT-12 et la référence visuelle réellement inspectée. Si l'ancien
   prompt contredit une décision plus récente, conserver son texte historique
   et enregistrer la consigne corrigée sous une nouvelle version.
2. Produire une image par sujet. Les 10 membres sont des Yautja adultes entiers,
   avec silhouette, mandibules ou biomask, dreadlocks, mains, pieds et accessoires
   cohérents. Les 15 objets sont isolés ; utiliser un fond réellement transparent
   pour ces 25 sorties, sans faux damier, sol peint ou halo de décor.
3. Produire les 10 lieux comme des scènes habitées complètes, avec volume,
   accès et routes portantes lisibles. Les scènes ne contiennent pas par défaut
   un personnage assis sur le trône et n'ajoutent pas de recruté à bord.
4. Produire les cinq matières comme des illustrations de surface opaques,
   régulièrement éclairées et couvrant les bords. Ne pas les annoncer raccordables
   ou PBR avant test de répétition et production des canaux requis par le rendu.
5. Conserver les PNG à leur résolution native, enregistrer dimensions, mode,
   taille, empreinte, présence de pixels visibles, transparence et bords occupés.
   Un alpha maximal de 254 n'est pas une image vide ; vérifier le contenu et
   la séparation sujet/fond au lieu d'exiger arbitrairement 255 partout.
6. Garder l'identifiant du sujet et l'historique des variantes ; attribuer une
   version et un nouveau SHA à une correction. Ajouter une ligne d'import au
   catalogue existant seulement après contrôle, sans promouvoir `validated`
   par la seule réussite d'un script.
7. Relier la variante retenue à un usage précis, puis contrôler sa lisibilité
   à l'échelle et à la lumière de la scène. Une galerie chargée dans le code
   ne prouve pas une collision, un service, une animation ou une bonne identité.

Pour les 45 passages/objets naturels V3, les états mobiles restent particulièrement
à prévoir : treuil d'Oseris, monte-charge de Sequoia, volets d'Umbra, portes de
Pelagos et Vardos. Les deux dernières sont représentées fermées dans les sources.
Ne pas découper implicitement une scène complète en pièces indépendantes dont
les ombres et les attaches n'ont pas été revues.

## Travail de jeu distinct des 40 PNG

| Chantier | Existant à réutiliser | Ce qui manque pour une réalisation prouvée |
| --- | --- | --- |
| Régions et accès | `homeworldRegionsV68.ts`, `homeworldAccessV69.ts` ; carte courante de la bible du 6 novembre | Raccord aux dix régions et à la capitale ; vérifier accès initiaux, promenades Youngling et progression selon la bible courante, en tenant compte des contrôles historiques du code |
| Habitant et identité | Variantes V84, références de portraits V85, catalogue des compagnons | Identité persistante, âge, fonction, affectation et états de vie ; distinguer une référence de métier d'une personne unique |
| Architecture et interaction | Enveloppes d'usage, implantation V78, navigation V109 et guidage V111 | Approche, place pour utiliser l'objet, sorties, portage, caméra et collision ; portes et intérieurs réellement accessibles |
| Services civils | Scénarios et objets V4/V5, systèmes de dialogue et d'inventaire existants | Conditions, répliques, choix, coût, délai, résultat, échec et reprise ; conséquences sans gain automatique de rang |
| Animation et équipement | Images statiques et systèmes d'atlas/mouvement | Poses d'usage, locomotion, manipulations, accessoires séparés et transitions conservant l'identité |
| Sons et effets | Bibliothèque audio et besoins de campagne existants | Sons de manipulation, ambiance, signaux et effets associés à un événement réel, avec arrêt et reprise corrects |
| Planètes | Cinq chasses, six corps galactiques répertoriés, trois directions artistiques, arc Xeno | Affectation à une zone et état du monde, objectifs et extraction ; aucun nouveau `PLANxx` déduit du biome |
| Sauvegarde et continuité | Règles de sauvegarde du projet, ALL-01 à ALL-10 et CORE-R17 | Conservation du service, de l'objet, des personnes et des conséquences après rechargement et ellipse |

Les huit salles du vaisseau personnel, les capacités du Clan Ship, les modes Warp,
les animaux déjà nommés et les trophées conservent leurs contrats. La création
d'un lit, d'un casier ou d'un siège ne crée pas un emplacement supplémentaire
dans ces systèmes.

## Suivi des 24 contrôles d'acceptation

Ce sont **24 contrôles de production et d'intégration**. Les contrôles de livraison
ont reçu leurs preuves au 6 novembre ; les scénarios de jeu conservent leur état
ouvert. Les rapports antérieurs restent des audits datés, sans validation rétroactive.
Les contrôles techniques effectivement effectués sont dans
[VERIFICATION.md](VERIFICATION.md).

| ID | Scénario ou contrôle | Résultat attendu | État |
| --- | --- | --- | --- |
| PT-QA-01 | Produire un job V5 et enregistrer sa sortie | Un seul sujet, source, version et SHA ; aucun statut livré sans fichier | Réussi sur les 40 jobs et 2 variantes ; voir VERIFICATION_V5.json |
| PT-QA-02 | Examiner un membre masqué/démasqué et ses variantes | Même individu reconnaissable ; anatomie et équipement revus sur référence précise | Ouvert |
| PT-QA-03 | Afficher un membre/objet sur fonds clair et sombre | Alpha utilisable, corps entier, pas de halo, bords ou accessoire tronqués | Contrôlé sur fonds clair/sombre ; marges serrées consignées, usage en scène à revoir |
| PT-QA-04 | Corriger les deux citernes PT-ART-01 | Eau et distribution protégées, originaux conservés, dérivés révisés tracés | Deux PNG corrigés livrés ; anciens dérivés du jeu à remplacer après choix |
| PT-QA-05 | Parcourir un lieu des Hautes Branches | Cité de pierre, appuis et aqueducs cohérents, voie libre pour le personnage | Ouvert |
| PT-QA-06 | Utiliser un service des Forges Basses | Quartier entretenu, séparation atelier/soin/vivres et accès praticable | Ouvert |
| PT-QA-07 | Traverser un accès de la Caldeira | Route protégée, dangers thermiques appliqués ; aucune immunité implicite | Ouvert |
| PT-QA-08 | Afficher et parcourir le Refuge des Veilleurs | Habitat sous voûte, sources lumineuses distinctes, repos occulté, aucune vue de ciel | Ouvert |
| PT-QA-09 | Répéter une matière et changer l'éclairage | Raccord et canaux requis réellement contrôlés avant statut matériau prêt | Ouvert |
| PT-QA-10 | Ouvrir porte, sas, volets ou monte-charge | États et transition visibles, collisions synchronisées, sortie possible | Ouvert |
| PT-QA-11 | Arriver à un service avec une charge et repartir | Enveloppe d'usage libre, largeur adaptée et chemin viable dans les deux sens | Ouvert |
| PT-QA-12 | Interrompre puis reprendre une interaction | État cohérent, son/animation arrêtés correctement, aucun objet dupliqué | Ouvert |
| PT-QA-13 | Charger une ancienne sauvegarde après intégration | Progression récupérable et identifiants existants conservés | Ouvert |
| PT-QA-14 | Tester les six origines dans les mêmes régions | Variantes narratives conservées ; aucune origine remplacée par une tribu | Ouvert |
| PT-QA-15 | Tester les accès Youngling, Unblooded et Young Blood selon la carte courante | Départs, dix régions, capitale, traversées physiques et accès retour conformes aux décisions actuelles | Ouvert |
| PT-QA-16 | Charger Cour/Enclave des Forges Basses et la Réserve | Identifiants distincts, noms complets, aucun lieu substitué par simple correspondance partielle | Ouvert |
| PT-QA-17 | Consulter un monde `surveyed` puis une chasse active | Pas de mission jouable annoncée pour un corps sans mission ; contrat existant conservé | Ouvert |
| PT-QA-18 | Parcourir Mycora-Nox/Nivalis-C et les mondes proches par le nom | Aucun transfert de boss, de sauvegarde ou d'identité depuis Mycora-V/Nivalis-K/RTS Nivalis | Ouvert |
| PT-QA-19 | Examiner les scènes XP-Z09 et XP-Z12 | Reine morte inerte à Z09 ; victoire et preuve réelle uniquement selon l'arc actif du Berceau | Ouvert |
| PT-QA-20 | Utiliser un trône, une enclume ou un exercice local | Aucun rang, trophée de reine ou commandement accordé hors conditions établies | Ouvert |
| PT-QA-21 | Recruter, affecter, déployer puis rappeler un membre retenu | Présence et effets personnels conditionnels, pas de double à bord ou au village | Ouvert |
| PT-QA-22 | Faire mourir un compagnon puis recharger/passer une ellipse | Mort et mémoire persistantes ; aucune régénération depuis un portrait de métier | Ouvert |
| PT-QA-23 | Passer d'une visite locale à un vaisseau ou une Chronique | Huit salles, affectations et inventaires d'instance respectés ; aucun déblocage Warp automatique | Ouvert |
| PT-QA-24 | Revoir la scène finale et les preuves de lore | Validation artistique humaine consignée, œuvre/version ou création originale indiquée, sans certification globale inventée | Ouvert |

Le lot suivant doit mettre à jour le registre avec ses fichiers réellement
obtenus, les résultats des contrôles concernés et les écarts encore ouverts.
Les cinq boucles civiles et ces contrôles restent des unités de travail,
sans augmenter le compte des 68 fiches historiques.
