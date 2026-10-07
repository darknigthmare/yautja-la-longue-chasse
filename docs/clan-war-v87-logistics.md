# Guerre de clans — caches, ateliers et stocks locaux V87

Ce lot étend le panneau existant d’ouvrages V6. Il ne transforme ni les exercices
en missions gagnées, ni les fiches du classeur en canon de franchise.

## Sources effectivement comparées

`Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
Lecture seule du fichier original : 127 cellules comparées aux 15 fiches runtime,
aucune valeur ni mise en forme du classeur modifiée.

- **S03, Structures de guerre, D8:J8** : kit 10 RAV, entretien 1 RAV,
  deux tours travaillés, U19, capacité de vingt RAV identifiées.
- **U19, Unités de guerre, D24:H24 et N24** : trois membres, trois PC,
  formation 10 RAV, entretien 2, délai deux tours, portage borné.
- **S04, Structures de guerre, D9:J9** : kit 12 RAV, entretien 2 RAV,
  deux tours travaillés, U20, réparation seulement après livraison de pièces.
- **U20, Unités de guerre, D25:H25 et N25** : deux membres, trois PC,
  formation 13 RAV, entretien 2, délai trois tours, pièces et temps sur place.
- **R08, Règles de guerre, C13:D13** : réserves par lieu, transport identifié,
  plafond de front 120 sans effacement des cargaisons.
- **R09, C14:D14** : voies ouvertes, droit applicable, chargement RAV distinct
  des passages d’éclaireurs.
- **R10, C15:D15** : pénurie visible par équipe, facteur logistique 0,70,
  aucune mort automatique inventée.
- **OBJ05, Objectifs militaires, C10:E10** et **OBJ07, C12:E12** : lot,
  étapes, lieu final, pièces livrées et travail réellement accompli.
- Les anciennes fiches S02/S05/S07 et U17/U06/U07 restent comparées et utilisées.

## Comportements jouables

Le nouveau départ du panneau choisit U19 et le mode **stocks locaux**. Le mode
**comptabilité globale V86** reste sélectionnable pour conserver la cadence des
anciens exercices. L’API `createWarWorksV6` garde ce dernier mode par défaut.

Les cinq ouvrages passent toujours par reconnaissance, réservation au départ,
porteur de kit réel, franchissement des passages, livraison, tours travaillés et
affectation. S04 peut être installé ; sa mise en service n’ouvre aucun lien et
n’annonce aucune réparation déjà effectuée.

En mode local, les RAV se répartissent entre le dépôt de W3-K01, des lots portés
par U19 et les caches S03 mises en service. Un chargement retire les réserves du
dépôt. Une livraison les retire du vrai porteur et les met dans la cache de son
site. La cache reste bornée à 20 ; tout surplus reste sur le transport. Un retrait
met les RAV existants de la cache sur U19, puis leur restitution exige le retour
réel au dépôt. Chargement, livraison et retrait ne créent aucune ressource.

Les routes sont vérifiées pour les cargaisons RAV à la planification et à chaque
franchissement. Une fermeture après planification laisse l’équipe et le lot à
leur position actuelle. Les étapes et identités de transport sont conservées
dans les lots et dans le journal de transfert, y compris après rechargement.

Chaque tour prélève d’abord l’entretien des équipes, puis celui des ouvrages.
Le compte prend le lot propre du transport ou les réserves accessibles au même
site, jamais un dépôt distant par simple sélection de carte. Les nouveaux
arrivants et les ouvrages juste achevés commencent leur entretien au tour suivant.
Une cache isolée consomme les moyens présents sans produire de revenu. L’interface
identifie chaque équipe qui sera rationnée et son manque ; blessures, personnes
et XP ne sont ni copiées ni effacées.

## Reprise indépendante

Un fichier JSON explicite, format `yautja-clan-works-v87`, version 2, conserve
équipes, membres, XP, blessures, routes, avancement, kits, lots et écritures RAV.
La reprise remplace seulement cet exercice après confirmation. Elle n’utilise
ni `SaveGame`, ni compte de jeu, ni cloud, ni progression de campagne.

L’import vérifie la source, le contexte, les fiches numériques, les identités,
les phases, capacités et comptes. Le journal des chargements, livraisons,
restitutions et dépenses est rejoué pour contrôler les soldes de chaque lot.
Les versions futures, copies d’identité, transferts répétés et stocks altérés
sont refusés. La version 1 était uniquement en mémoire et ne disposait d’aucune
preuve de transfert ; sa reconstruction n’est pas inventée. Ce contrôle de
cohérence est un mécanisme de reprise d’exercice, pas une protection anti-triche
pour une campagne multijoueur.

## Limites conservées

- Une équipe équipée, le budget et les droits de passage sont des hypothèses
  d’exercice. Aucun débarquement ni contrôle militaire de campagne n’est acquis.
- Le portage de 20 RAV maximum par équipe, sans kit simultané, est un gabarit de
  prototype déclaré. Le classeur ne fournit pas le poids ou tonnage des rations.
- Les réserves initiales restent bornées à 120. Aucun fournisseur spatial,
  revenu territorial ou chargement externe supérieur au plafond n’est créé.
- L’atelier ne dispose pas encore d’un chantier de réparation distinct ni d’un
  tarif de pièces générique attesté. Les tirs, palans et bruits physiques restent
  à implémenter. W5-EV25 appartient à KR05 et exige plusieurs levages réellement
  accomplis ; son prix de six RAV ne devient pas un prix universel sur Korthas.
- Le [complément S16](clan-war-s16-extraction-v88.md) raccorde désormais le
  sixième ouvrage et une extraction déclarée de simulation : patient identifié,
  porteur/escorte présents, étapes et arrivée au dépôt. Douze structures,
  théâtre RTS 2D, extraction physique/campagne, soins, annexion, accord de passage,
  pont vers le navire et persistance de campagne restent ouverts.
- Les règles occupées S02/S05/S07 et le trajet abri de 80 RAV V86 sont conservés.

## Validation locale du lot V87 initial

44 tests ciblés couvraient les anciennes règles, la reconnaissance et les ouvrages,
dont 12 nouveaux scénarios de conservation des lots, livraison, retrait,
cache pleine, fermeture en trajet, rationnement par lieu et import incompatible.
Lint ciblé et vérification TypeScript passent. Ils ne remplacent ni l’inspection
visuelle du panneau, ni un parcours de campagne, ni une publication vérifiée.
La régression élargie avec S16 compte désormais 66 tests réussis, dont dix dédiés
à l’extraction et à la compatibilité de l’ancienne source à cinq ouvrages ;
les cellules, limites et parcours navigateur à contrôler sont détaillés dans
le complément S16. Aucun soin ou résultat de campagne n’est validé par ces tests.
