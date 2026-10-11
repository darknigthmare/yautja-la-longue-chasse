# W5-EV25 — chaîne fissurée, section de remplacement et rails

11 octobre 2026. Lot limité du simulateur d’ouvrages V6, dans le panneau réel
`ClanWarWorksV6`. Ce lot n’est ni une bataille 2D, ni une conquête de campagne,
ni l’implémentation des sept constructions encore manquantes.

## Source et hypothèses

L’original privé `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx` a été relu sans
modification. SHA256 :
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.

Les valeurs vérifiées sont celles de `V5 Événements territoriaux!C30:M30` :
KR05, plusieurs charges levées sans entretien, remplacement avec une pièce
identifiée pour six RAV, indisponibilité pendant le chantier, ou rails pour
deux RAV et treuil restant hors service. La réservation ne valide pas l’effet.
L’identifiant d’événement empêche un deuxième gain. S04 `D9:J9`, U20
`D25:H25/N25`, KR05 `C10:I10` et L49 `C54:K54` bornent le cas traité.

Le classeur ne chiffre pas l’usure ni la durée de ce chantier. Trois levages
depuis le dernier service mécanique et deux tours réellement travaillés sont
des hypothèses du jeu, affichées dans l’interface et dans la clé de contexte.
Les rations/entretien RAV d’un tour ne constituent pas un entretien mécanique.
L’événement se déclenche après le troisième levage achevé : ce reçu et la
position atteinte par sa charge sont conservés ; les levages suivants cessent.

Le périmètre jouable est le treuil S17 placé à **Cour des Pièces / K25** sur
**L49**, dans la Couronne des Forges Froides. Le détour concret **K25 → K26 →
K27**, par **L21 puis L22**, est un choix d’implémentation appuyé sur les vrais
passages compatibles RAV, non une route prescrite mot à mot par l’événement.
Son arrivée ne prétend pas remettre la charge à l’autre extrémité de L49.

## Ce qui est raccordé

- Ouverture explicite du suivi mécanique sur un treuil installé, uniquement
  après la présence des cellules requises. Les levages antérieurs restent
  archivés ; ils ne reçoivent aucune usure rétroactive.
- Trois vrais reçus de levage ouvrent un événement daté. Le panneau montre
  les reçus, l’état de la maille et le contrepoids dans un schéma de simulation.
  Le treuil ne produit plus de levage tant qu’il est endommagé ou consigné.
- Un atelier S04 installé, occupé par deux U20 et alimenté prépare la section.
  Six RAV sont débités d’un lot local réellement présent : dépôt local ou
  cache livrée, jamais réserve distante ou RAV simplement sur un porteur.
  Le débit est une réservation identifiée, séparée des rations et des kits.
- Une seule section identifiée reste au sol de l’atelier, puis suit son vrai
  porteur sur les passages autorisés aux charges. Aucun second kit, poste,
  patient ou lot simultané. La livraison exige le pied réel du treuil.
- Deux U20 complets sont consignés au pied. Leurs identités et leurs tours
  travaillés sont enregistrés. Ils ne peuvent ni repartir, ni être libérés,
  ni faire une reconnaissance durant le chantier. Attendre paie l’entretien
  mais ne travaille pas. Deux gestes avec stocks locaux consomment la section
  une seule fois ; réaffecter ensuite les opérateurs est nécessaire.
- Le choix des rails prélève deux RAV locaux et reprend un kit **existant** au
  pied. Les sites K26/K27 doivent avoir été reconnus. Chaque passage est
  exécuté par le moteur normal ; une fermeture conserve la charge et le
  porteur à leur position. L’arrivée seulement clôt le choix. Le treuil reste
  hors service et une fermeture indépendante de L49 n’est jamais annulée.
  L’abaissement d’une charge suspendue demandé par `I30` n’est pas simulé :
  cette adaptation exige un kit déjà au sol et représente uniquement son
  chargement au pied puis son transport. Le troisième levage achevé conserve
  sa charge à l’extrémité atteinte ; elle n’est pas abaissée rétroactivement.
- Import/export strict de la section en transport, du chantier interrompu,
  de ses personnes, réservations, reçus et d’un détour arrêté après L21.

## Départ régional et anciennes reprises

Le menu de nouvel exercice propose un départ régional **optionnel**, soumis
à la confirmation de remplacement déjà existante. Il initialise une équipe
novice et un dépôt fini à K25 avec le même plafond source de 120 RAV. C’est un
setup d’exercice annoncé comme tel, sans trajet K01 inventé, revenu, passage
acquis, clan possédé ou changement de rang/campagne. Le départ ancien reste
K01 lorsque cette option n’est pas choisie.

`deploymentV90` et `maintenance` sont des extensions optionnelles de la
version 2. Les clés V87 et les carnets V88 sont inchangés lorsqu’elles sont
absentes. Aucune extension n’est ajoutée automatiquement par l’import.
Les comptes historiques gardent leur forme ; les réservations de réparation
sont dans leur extension, et la somme des lots est réconciliée avec tous les
débits. Les sources divergentes, pièces/identités copiées, réservations sans
transaction, chronologies impossibles ou faux déplacements sont refusés.
Ce contrôle physique n’est pas une signature authentifiant un fichier
d’exercice modifiable par son propriétaire, ni une preuve de campagne.

## Validation et limites

Les tests du moteur jouent les actions publiques depuis le setup régional,
avec le vrai contexte V6 non modifié et 120 RAV. Le troisième levage arrive
au tour 13 avec 32 RAV encore présents ; la section en réserve laisse 26 RAV.
Le trajet de test K25 → K26 → K25 de cette section conserve son identité et
sa chronologie, puis permet les deux tours travaillés avec des moyens finis.
Les tests de handlers montent le véritable composant avec des hooks mémoire
transparents : ils ne certifient pas la disposition visuelle en navigateur.

Les quatre reprises de QA sont générées par
`scripts/build-clan-hoist-fixtures-v90.mjs` sous `work-local/v90/qa/`, ignoré
par Git. Elles portent `synthetic` dans leur nom et possèdent un README ;
elles ne sont pas présentées comme anciennes parties humaines.

Pas de réparation universelle de lien, tonnage, simulation de tirs, bruit
enregistré, animation originale de treuil, transport de personnes, adversaire,
récompense d’XP ou acquisition de campagne. Le panneau utilise un schéma SVG
de simulation pour l’état mécanique, pas un sprite présenté comme référence
canonique. Les autres treuils conservent leur comportement publié et ne sont
pas tous équipés de cet événement particulier.
