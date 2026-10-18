# Relais S12 et treuil S17 — exercice local V88

Ce lot ajoute deux constructions et leurs gestes effectifs au panneau **Mandats → Bible V6 → Logistique et ouvrages**. Huit des dix-huit structures peuvent désormais être acheminées et mises en service dans cet exercice ; dix restent hors de ce panneau. L’atelier S04 installé ne répare toujours pas automatiquement un lien : sa réparation nécessite un chantier et des pièces distincts.

L’exercice n’utilise aucun compte, armée ou sauvegarde de campagne. Le budget fini et la première équipe équipée sont choisis explicitement. Il ne valide ni bataille, ni conquête, ni livraison de mission. Les opérateurs gardent leurs vrais identifiants, affectations, blessures et XP.

## Cellules relues dans le fichier original

Source : `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, 139 feuilles, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Contrôle indépendant en lecture seule de **12 lignes et 136 cellules**, valeurs et coordonnées comparées au JSON consommé par le jeu, sans divergence.

| Ouvrage ou règle | Cellules | Ce qui est fourni |
| --- | --- | --- |
| S12, relais de signaux | Structures de guerre D17:J17 | Kit 12 RAV, entretien 2, deux tours, U28 ; liaison entre deux secteurs sans transport instantané des personnes ; relief et sabotage peuvent couper la portée ; livraison et appuis avant mise en service. |
| U28, messagers de coalition | Unités de guerre D33:H33 et N33 | Deux membres, 2 PC, recrutement 10 RAV, entretien 1, délai deux tours ; aucune transmission par une zone qu’ils n’ont pas réellement franchie. |
| S17, anneau de treuils | Structures de guerre D22:J22 | Kit 16 RAV, entretien 2, trois tours, U20 ; déplacement d’une charge entre deux plans ; deux opérateurs présents, voie dégagée. |
| U20, artisans d’ancrage | Unités de guerre D25:H25 et N25 | Deux membres, 3 PC, recrutement 13 RAV, entretien 2, délai trois tours ; pièces, temps et interruption des tirs pour une réparation. |
| R05, R09, R19 | Règles de guerre C10:D10, C14:D14, C24:D24 | Observation située, chaîne logistique compatible, livraison/supports/délai/opérateurs ; une structure vide n’a pas son effet. |
| L01 et L31 | Passages de Korthas C6:K6 et C36:K36 | Extrémités exactes, direction, capacité et droit RAV ; L31 est une liaison de relief K01–K07. |
| K01, K02, K07 | Territoires de Korthas A6:O7 et A12:O12 | Identité, position de graphe et conditions de reconnaissance ; aucun revenu ou contrôle n’est attribué par ce lot. |

## Relais : un relevé remis conserve son âge

La réservation de S12 ouvre explicitement le carnet. Seuls les franchissements exécutés ensuite y sont enregistrés : les trajets antérieurs d’une reprise ne sont pas reconstitués. S12 utilise un passage adjacent précis. Le messager U28 doit faire l’aller et le retour sur ce lien, puis occuper le relais installé. Le destinataire est une autre équipe réellement présente à l’autre extrémité, avec au moins un membre apte.

**Transmettre les relevés à …** remet seulement les observations personnellement acquises par ce messager. Chaque reçu conserve le site, le tour et l’observateur d’origine, ainsi que l’émetteur, le destinataire, le lien et le tour de remise. La vue indique l’âge actuel et que les changements cachés restent inconnus. Elle ne rafraîchit pas le brouillard global, ne découvre pas un ennemi et ne transporte aucune personne, ressource ou XP.

Une fermeture du lien, un opérateur libéré, un destinataire absent, un trajet non parcouru ou des stocks locaux insuffisants refuse le geste sans coût ni tour. Le même ensemble de relevés remis à la même équipe par le même relais n’est pas rejoué.

**Limites déclarées de simulation :** la portée est le seul lien topologique choisi, et une fermeture de l’hypothèse représente sa coupure. Aucun rayon radio, diffusion à travers la roche, relief en 3D ou sabotage ennemi autonome n’est inventé. La remise prend un tour global, sans délai radio canonique revendiqué. Le vrai entretien normal du site est consommé une fois durant ce tour.

## Treuil : un vrai kit change de position, pas de propriétaire

S17 demande une liaison de relief adjacente compatible RAV, avec ses deux extrémités reconnues. Réserver au départ ne construit rien : le kit doit être chargé, acheminé, livré, puis travaillé trois fois par les deux vrais artisans U20. L’attente seule n’effectue aucun travail.

**Lever kit:… vers …** prend un autre kit déjà réservé ou réellement déposé au pied du treuil. Le passage doit rester ouvert et le site doit pouvoir payer ses équipes et ouvrages depuis ses réserves existantes. Le kit garde son identité, son coût déjà débité et son site de construction prévu. Il est déposé à l’autre extrémité ; les artisans, personnes et lots RAV restent sur place. Le levage ne livre ni ne construit automatiquement le kit.

Une équipe libre doit ensuite atteindre le kit, utiliser **Charger avec l’équipe choisie**, puis **Livrer avec le vrai porteur** au site prévu. Le chargement relit l’emplacement réel : le kit levé à K07 ne peut plus être chargé depuis K01. Le nouveau bouton **Déposer ce kit au sol sans l’installer** permet aussi de laisser un kit transporté à un vrai site ; il reste là après le départ du porteur.

Chaque levage conserve le treuil, le kit, le lien, les extrémités, le tour, l’équipe et les deux identifiants d’artisan. Un kit au sol possède une preuve de dépôt ou de levage. Une copie du kit, une destination falsifiée, un opérateur absent, une voie fermée ou un manque de ravitaillement ne déplace rien.

**Limites déclarées de simulation :** un kit par levage et un tour par geste. Le classeur ne donne ni masse, ni tonnage, ni vitesse ; ces limites ne sont donc pas présentées comme des données lore. La liaison de relief est un parcours du graphe, pas une scène de treuil animée entre plateformes 2D déjà réalisée. Aucun animal, patient, équipe, caisse nouvelle, énergie fictive ou réparation gratuite n’est créé. L’événement W5-EV25 reste à implémenter séparément : installer S17 ne remplace pas une chaîne fissurée.

## Ravitaillement et reprises

Les deux effets demandent le mode stocks locaux. La réserve accessible au site doit couvrir ses équipes et ouvrages prêts, en tenant compte des rations déjà portées par les vraies équipes. Le tour normal paie chaque poste une fois. Un dépôt riche ailleurs ne permet pas de faire fonctionner un treuil isolé ; ni signal ni levage n’est une source de RAV.

La clé historique demeure exactement celle des cinq premiers ouvrages. La reprise V87 version 2 reçoit une extension facultative `infrastructure` version 1 uniquement à la première réservation de S12/S17. Cette extension lie les lignes sources supplémentaires, trajets, positions de kits, levages et relevés. Les anciennes reprises à cinq ou six ouvrages ne sont ni réécrites ni complétées avec un état supposé. Une source qui manque S12/S17 continue à accepter ces anciennes reprises ; elle refuse une extension qui en dépend.

La véritable reprise S16 précédemment jouée a été comparée intégralement : **117 161 octets**, SHA256 `1b9f56fa15434a43092acc9bff572a98f66a54f1cfa45f2801a3fff122a6529c`. Import et nouvel export conservent exactement son tour 11, ses 40 RAV, son patient arrivé blessé à K01 et le second resté à K02. Aucune extension infrastructure n’est ajoutée automatiquement.

## Parcours UI à jouer

### Relais S12

1. Budget du prochain exercice : **120 RAV**, **Messagers de coalition U28**, **stocks locaux**. Préparer puis confirmer le nouveau départ.
2. Reconnaître K01. Choisir S12, site K01, passage L01 ; réserver le kit. Le carnet commence maintenant.
3. U28 : préparer K02, exécuter L01, reconnaître K02 ; revenir à K01 par L01. Les deux relevés sont acquis aux tours 2 et 4.
4. Charger le kit S12, livrer à K01 ; accomplir deux tours de travaux. Les deux messagers restent affectés au relais.
5. Former U19, puis attendre deux tours. Choisir cette nouvelle équipe, rejoindre K02 ; sélectionner à nouveau U28.
6. Fermer L01 dans l’hypothèse et tenter **Transmettre les relevés à l’équipe U19** : aucun reçu, tour ou coût. Rouvrir le lien et transmettre.
7. Attendu : **tour 11, 82/120 RAV** ; recrutement 10, kit 12, entretien 16. U28 reste à K01 et U19 à K02. U28 conserve 8 XP par membre, U19 zéro. Le reçu affiche les tours d’observation 2/4, âge 9/7 ; répéter n’avance pas le tour.
8. Afficher/exporter le JSON, attendre un tour, coller l’export, valider, préparer puis confirmer la reprise : le reçu et ses dates doivent rester exacts. Seul l’exercice est remplacé.

### Treuil S17

1. Nouveau départ confirmé : **120 RAV**, **Artisans d’ancrage U20**, stocks locaux.
2. Reconnaître K01 ; rejoindre K07 par L31, reconnaître K07, revenir à K01. Les deux extrémités sont connues.
3. Réserver S17 à K01, passage L31 ; charger et livrer son kit ; accomplir trois tours de travaux.
4. Réserver un abri S02 prévu à K07. Le vrai kit d’abri est encore au départ ; les artisans occupent le treuil.
5. Fermer L31 et tenter **Lever le kit d’abri vers K07** : refus, aucun tour ou coût. Rouvrir et lever.
6. Attendu : **tour 9, 82/120 RAV** ; kits 24, entretien 14. Le même kit S02 est au sol à K07, toujours réservé, et les deux artisans restent à K01 avec leurs 8 XP de reconnaissance. Charger depuis K01 est refusé.
7. Pour réceptionner : former U17, attendre deux tours, l’envoyer à K07. Charger puis livrer le même kit S02. Il est livré mais demande encore ses deux tours de travaux. Le treuil ne les a pas effectués.
8. Exporter avant réception et reprendre ce JSON : position et preuve de levage doivent être conservées. Aucun crédit de campagne.

## Vérifications réalisées et limites de preuve

- Onze tests de modèle : cellules, construction/délais, vraie présence, conservation des fonds/identités/XP, âge du renseignement, trajet non parcouru, fermeture, réception, dépôt au sol, panne locale avec réserve distante, reprises historiques et refus des altérations.
- Deux tests d’intégration utilisent les vrais handlers du panneau avec un ordonnanceur de hooks transparent en mémoire. Ils réalisent construction, déplacements, fermeture/refus, transmission, levage, affichage de la vraie position et reprise par texte.
- Ces tests ne prouvent ni le téléchargement navigateur, ni la présentation visuelle, ni une publication Vercel. Le parcours CUA dans le jeu compilé reste une vérification distincte à effectuer par le pilote du lot.

Autres ouvrages écartés dans ce lot : S11 faute de consommables et doses ; S13 faute d’un stock d’énergie/exposition ; S09/S18 faute de transport réel ; S10 faute de montures identifiées ; S06/S14 faute de combat avec angles/signataires ; S15 faute d’enregistrements situés ; S01 faute de géométrie de vision ; S08 faute de parcours individuel et trois appuis physiques. Aucune de ces limites n’est remplacée par une simple fiche déclarée jouable.
